function C_() { return getConfig_(); }

const GENERIC_ERROR_ = 'Something went wrong. Please try again; if it keeps happening, contact the coordinator.';

function doGet(e) {
  try {
    return handleRequest_(e);
  } catch (err) {
    logError_('WebApp.doGet', err.message, { stack: err.stack });
    return renderError_(GENERIC_ERROR_);
  }
}

function adminJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleRequest_(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;
  const token = params.token;

  if (action === 'ping') {
    return ContentService.createTextOutput('pong').setMimeType(ContentService.MimeType.TEXT);
  }
  if (action === 'health' || action === 'regen' || action === 'regen_pdf') {
    // Health data, working links and PDF rebuilds are for the administrator only.
    if (!isAdminUser_()) {
      logWarn_('WebApp.handleRequest', 'Admin endpoint refused', { action: action, user: activeEmail_() || 'ANONYMOUS' });
      return adminJson_({ success: false, error: 'Not authorized.' });
    }
    if (action === 'health') return handleHealthCheck_();
    return action === 'regen' ? handleRegenToken_(e) : handleRegenPdf_(e);
  }

  if (!token) {
    return renderError_('This link is incomplete. Open the link from your email again.');
  }
  if (!isTokenShape_(token)) {
    return renderError_('Invalid or expired evaluation link.');
  }

  const row = findRowByToken_(token);
  if (!row) {
    return renderError_('Invalid or expired evaluation link.');
  }
  if (row.status === C_().STATUSES.COMPLETED) {
    return renderCompleted_('This evaluation is finalized. Check your email for the PDF copy.');
  }
  if (row.status === C_().STATUSES.PDF_GENERATING) {
    return renderCompleted_('This evaluation is signed. The PDF will be emailed to the instructor and the TA within a few minutes.');
  }
  if (isTokenExpired_(row.tokenExpiry)) {
    return renderError_('This link has expired. Contact the coordinator for a new link.');
  }

  // The stage comes from the row's status, not from the link's action parameter.
  const stage = stageActionForStatus_(row.status);
  if (!stage) {
    return renderError_('This evaluation is not open for input right now. Contact the coordinator.');
  }
  const access = checkStageAccess_(row, stage);
  if (!access.ok) {
    logWarn_('WebApp.handleRequest', 'Access refused', { evaluationId: row.evaluationId, action: stage, user: activeEmail_() || 'ANONYMOUS' });
    return renderError_(access.error);
  }

  const nonce = C_().SECURITY.CSP_NONCE_ENABLED ? validateCspNonce_() : null;
  const html = HtmlService.createTemplateFromFile('Index');
  html.action = stage;
  html.token = token;
  html.row = row;
  html.nonce = nonce;
  html.duties = DUTY_LIST_;
  return html.evaluate()
    .setTitle('TA Evaluation - ' + stage.replace('_', ' ').toUpperCase())
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

const MAX_PAYLOAD_CHARS_ = 45000;      // a Sheets cell holds 50,000 characters
const DRAFT_RATE_LIMIT_ = 300;         // draft saves/loads per account per hour

/* Cheap checks that run before anything reads the sheet or takes the lock:
   the link must be a UUID and the caller must be a signed-in UW account under its rate limit.
   Returns { email } or { error }. */
function precheckCaller_(token, bucket, maxPerHour) {
  if (!isTokenShape_(token)) return { error: 'Invalid or expired evaluation link.' };
  const email = activeEmail_();
  if (!email) return { error: 'Sign in with your UW Google account to open this evaluation.' };
  const rate = checkRateLimit_(email, bucket, maxPerHour);
  if (!rate.allowed) return { error: 'Too many attempts. Please wait ' + rate.retryAfter + ' seconds and try again.' };
  return { email: email };
}

function acquireLock_(ms) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(ms); } catch (e) { return null; }
  return lock;
}

/* Called from the page with google.script.run. Every check runs on the server:
   link shape, signed-in account and rate limit; then token, expiry, stage and identity
   (once without the lock, and again inside it); then the stage's required fields. */
function submitForm(token, action, payload) {
  const pre = precheckCaller_(token, 'submitForm');
  if (pre.error) return { success: false, error: pre.error };
  try {
    const nextStatus = {
      prof_eval: C_().STATUSES.TA_RESPONSE_PENDING,
      ta_respond: C_().STATUSES.PROF_SIGN_PENDING,
      prof_sign: C_().STATUSES.PDF_GENERATING
    }[action];
    if (!nextStatus || !Object.prototype.hasOwnProperty.call(STAGE_FIELDS_, action)) {
      return { success: false, error: 'Unknown action.' };
    }

    // Identity and stage first, without the lock, so callers who may not act never wait on it.
    const first = loadAuthorizedRow_(token, action);
    if (first.error) return { success: false, error: first.error };

    const fields = pickStageFields_(action, sanitizePayload_(payload || {}));
    const signatureKey = { prof_eval: 'signatureName', ta_respond: 'taSignatureName', prof_sign: 'profSignatureName' }[action];
    if (!fields[signatureKey] || !String(fields[signatureKey]).trim()) {
      return { success: false, error: 'Type your full name and tick the acknowledgment to sign.' };
    }
    const incomplete = validateStageFields_(action, fields);
    if (incomplete) return { success: false, error: incomplete };

    // Lock only the check-and-update of the row, so two submissions cannot both pass the status check.
    const lock = acquireLock_(30000);
    if (!lock) return { success: false, error: 'The system is busy. Please try again in a minute.' };

    let row, email, oldStatus, updatedPayload;
    try {
      const ctx = loadAuthorizedRow_(token, action);
      if (ctx.error) return { success: false, error: ctx.error };
      row = ctx.row;
      email = ctx.email;
      oldStatus = row.status;

      // The server records who signed and when; client-supplied values are ignored.
      const now = new Date().toISOString();
      if (action === 'prof_eval') { fields.signatureTimestamp = now; fields.signatureEmail = email; }
      if (action === 'ta_respond') { fields.taSignatureTimestamp = now; fields.taSignatureEmail = email; }
      if (action === 'prof_sign') { fields.profSignatureTimestamp = now; fields.profSignatureEmail = email; }

      updatedPayload = mergePayload_(row.dataPayload, fields);
      if (JSON.stringify(updatedPayload).length > MAX_PAYLOAD_CHARS_) {
        return { success: false, error: 'Your text is too long to save. Please shorten your answers and try again.' };
      }
      // A new link for the next stage, written in the same row update below.
      if (C_().SECURITY.TOKEN_ROTATION_ON_STAGE_CHANGE) {
        row.secureToken = Utilities.getUuid();
        row.tokenExpiry = new Date(Date.now() + C_().TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      }
      updateRow_(row.rowNum, {
        status: nextStatus,
        dataPayload: updatedPayload,
        lastActionDate: now,
        // Each stage starts with its own reminders, so a slow earlier stage does not escalate the next one.
        reminderCount: 0,
        secureToken: row.secureToken,
        tokenExpiry: row.tokenExpiry
      });
    } finally {
      lock.releaseLock();
    }

    logEvent_({
      action: getAuditAction_(action),
      evaluationId: row.evaluationId,
      oldStatus: oldStatus,
      newStatus: nextStatus,
      details: { fields: Object.keys(fields), tokenRotated: !!C_().SECURITY.TOKEN_ROTATION_ON_STAGE_CHANGE },
      actorEmail: email
    });

    const invite = {
      evaluationId: row.evaluationId, token: row.secureToken, courseCode: row.courseCode, term: row.term,
      profName: row.profName, profEmail: row.profEmail, taName: row.taName, taEmail: row.taEmail
    };
    if (action === 'prof_eval') {
      sendTAResponseInvite_(invite);
    } else if (action === 'ta_respond') {
      sendProfSignInvite_(invite);
    } else if (action === 'prof_sign') {
      // The PDF is built and emailed by a trigger, so the instructor does not wait for it.
      schedulePdfRun_();
    }

    return {
      success: true,
      newStatus: nextStatus,
      message: action === 'prof_sign'
        ? 'Your sign-off is saved. The signed PDF will be emailed to you and the TA within a few minutes.'
        : 'Submitted successfully.'
    };
  } catch (err) {
    logError_('WebApp.submitForm', err.message, { stack: err.stack, action: String(action).slice(0, 40) });
    return { success: false, error: GENERIC_ERROR_ };
  }
}

/* Draft autosave for the instructor's evaluation form. It takes the same lock as submitForm and
   re-checks the stage inside it, so a save can never land after (and undo) a submission. */
function saveDraftData(token, payload) {
  const pre = precheckCaller_(token, 'draft', DRAFT_RATE_LIMIT_);
  if (pre.error) return { success: false, error: pre.error };
  try {
    const first = loadAuthorizedRow_(token, 'prof_eval');
    if (first.error) return { success: false, error: first.error };
    const fields = pickStageFields_('prof_eval', sanitizePayload_(payload || {}));
    const lock = acquireLock_(10000);
    if (!lock) return { success: false, error: 'busy' };
    try {
      const ctx = loadAuthorizedRow_(token, 'prof_eval');
      if (ctx.error) return { success: false, error: ctx.error };
      const merged = mergePayload_(ctx.row.dataPayload, fields);
      if (JSON.stringify(merged).length > MAX_PAYLOAD_CHARS_) return { success: false, error: 'too long' };
      updateRow_(ctx.row.rowNum, { dataPayload: merged, lastActionDate: new Date().toISOString() });
    } finally {
      lock.releaseLock();
    }
    return { success: true, message: 'Draft saved' };
  } catch (err) {
    logError_('WebApp.saveDraftData', err.message, { stack: err.stack });
    return { success: false, error: GENERIC_ERROR_ };
  }
}

function loadDraftData(token) {
  const pre = precheckCaller_(token, 'draft', DRAFT_RATE_LIMIT_);
  if (pre.error) return { success: false, payload: {} };
  try {
    const ctx = loadAuthorizedRow_(token, 'prof_eval');
    if (ctx.error) return { success: false, payload: {} };
    return { success: true, payload: pickStageFields_('prof_eval', ctx.row.dataPayload) };
  } catch (err) {
    logError_('WebApp.loadDraftData', err.message, { stack: err.stack });
    return { success: false, payload: {} };
  }
}

/* The master sheet's rows and column map, read once. */
function readMasterRows_() {
  const data = getMasterSheet_().getDataRange().getValues();
  const col = {};
  (data[0] || []).forEach(function(h, i) { col[h] = i; });
  MASTER_COLS_ = col;
  return { data: data, col: col };
}

function rowObject_(data, col, r) {
  const row = data[r];
  return {
    rowNum: r + 1,
    evaluationId: row[col.Evaluation_ID],
    courseCode: row[col.Course_Code],
    term: row[col.Term],
    profName: row[col.Prof_Name],
    profEmail: row[col.Prof_Email],
    taName: row[col.TA_Name],
    taEmail: row[col.TA_Email],
    status: row[col.Status],
    createdDate: row[col.Created_Date],
    completedDate: row[col.Completed_Date],
    lastActionDate: row[col.Last_Action_Date],
    reminderCount: row[col.Reminder_Count],
    secureToken: row[col.Secure_Token],
    tokenExpiry: row[col.Token_Expiry],
    dataPayload: parsePayload_(row[col.Data_Payload]),
    finalPdfLink: row[col.Final_PDF_Link],
    finalPdfFileId: row[col.Final_PDF_File_ID],
    payloadVersion: row[col.Payload_Version]
  };
}

function findRowByToken_(token) {
  // Only a full UUID can match, so a blank or cleared token matches nothing.
  if (!isTokenShape_(token)) return null;
  const m = readMasterRows_();
  for (let r = 1; r < m.data.length; r++) {
    if (m.data[r][m.col.Secure_Token] === token) return rowObject_(m.data, m.col, r);
  }
  return null;
}

/* The current row for an Evaluation ID (its row number can change if the sheet is sorted). */
function findRowByEvaluationId_(evaluationId) {
  if (!evaluationId) return null;
  const m = readMasterRows_();
  for (let r = 1; r < m.data.length; r++) {
    if (m.data[r][m.col.Evaluation_ID] === evaluationId) return rowObject_(m.data, m.col, r);
  }
  return null;
}

function parsePayload_(str) {
  try {
    return str ? JSON.parse(str) : {};
  } catch (e) {
    return {};
  }
}

function mergePayload_(existing, incoming) {
  const merged = { ...existing };
  Object.keys(incoming).forEach(key => {
    if (typeof incoming[key] === 'object' && incoming[key] !== null && !Array.isArray(incoming[key])) {
      merged[key] = { ...(merged[key] || {}), ...incoming[key] };
    } else {
      merged[key] = incoming[key];
    }
  });
  return merged;
}

const UPDATE_HEADERS_ = {
  status: 'Status',
  dataPayload: 'Data_Payload',
  lastActionDate: 'Last_Action_Date',
  completedDate: 'Completed_Date',
  finalPdfLink: 'Final_PDF_Link',
  finalPdfFileId: 'Final_PDF_File_ID',
  secureToken: 'Secure_Token',
  tokenExpiry: 'Token_Expiry',
  reminderCount: 'Reminder_Count',
  evaluationId: 'Evaluation_ID',
  courseCode: 'Course_Code',
  term: 'Term',
  profName: 'Prof_Name',
  profEmail: 'Prof_Email',
  taName: 'TA_Name',
  taEmail: 'TA_Email',
  payloadVersion: 'Payload_Version'
};

/* Writes the given fields of one row. Only those cells are written (adjacent ones together),
   and nothing is read first, so an update can never write back a value it read earlier. */
function updateRow_(rowNum, updates) {
  const sheet = getMasterSheet_();
  const col = masterColumns_();
  const cells = [];
  Object.keys(updates).forEach(function(key) {
    const header = UPDATE_HEADERS_[key] || key;
    if (col[header] === undefined) return;
    const v = updates[key];
    cells.push([col[header], (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v]);
  });
  if (!cells.length) return;
  cells.sort(function(a, b) { return a[0] - b[0]; });
  let start = 0;
  for (let i = 1; i <= cells.length; i++) {
    if (i === cells.length || cells[i][0] !== cells[i - 1][0] + 1) {
      const run = cells.slice(start, i);
      sheet.getRange(rowNum, run[0][0] + 1, 1, run.length).setValues([run.map(function(c) { return c[1]; })]);
      start = i;
    }
  }
  SpreadsheetApp.flush();
}

function normEmail_(x) {
  return String(x || '').trim().toLowerCase();
}

function isAdminUser_() {
  const user = activeEmail_();
  return !!user && user === normEmail_(C_().ADMIN_EMAIL);
}

function getAuditAction_(action) {
  const map = {
    'prof_eval': C_().ACTIONS.PROF_EVAL_SUBMIT,
    'ta_respond': C_().ACTIONS.TA_RESPONSE_SUBMIT,
    'prof_sign': C_().ACTIONS.PROF_SIGN_SUBMIT
  };
  return map[action] || action.toUpperCase();
}

function jsonResponse_(obj, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  // Note: Apps Script ContentService doesn't support setting HTTP status codes directly
  // Status codes are handled by the platform; we include status in the response body
  return output;
}

function renderError_(message) {
  const html = HtmlService.createTemplateFromFile('ErrorView');
  html.message = message;
  return html.evaluate().setTitle('Error').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function renderCompleted_(message) {
  const html = HtmlService.createTemplateFromFile('CompletedView');
  html.message = message;
  return html.evaluate().setTitle('Completed').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function handleRegenToken_(e) {
  var evalId = e.parameter.evalId;
  if (!evalId) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Missing evalId parameter'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getMasterSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'No data'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  for (var r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evalId) {
      var rotated = rotateToken_(evalId);
      if (rotated) {
        var status = data[r][col.Status];
        var action = 'prof_eval';
        if (status === 'TA_RESPONSE_PENDING') action = 'ta_respond';
        else if (status === 'PROF_SIGN_PENDING') action = 'prof_sign';
        var link = C_().APP_URL + '?action=' + action + '&token=' + rotated.token;
        return ContentService.createTextOutput(JSON.stringify({success: true, token: rotated.token, link: link, status: status}))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Token rotation failed'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Evaluation not found'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRegenPdf_(e) {
  var evalId = e.parameter.evalId;
  if (!evalId) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Missing evalId parameter'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getMasterSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'No data'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  for (var r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evalId) {
      var row = {
        rowNum: r + 1,
        evaluationId: data[r][col.Evaluation_ID],
        courseCode: data[r][col.Course_Code],
        term: data[r][col.Term],
        profName: data[r][col.Prof_Name],
        profEmail: data[r][col.Prof_Email],
        taName: data[r][col.TA_Name],
        taEmail: data[r][col.TA_Email],
        status: data[r][col.Status],
        dataPayload: parsePayload_(data[r][col.Data_Payload]),
        finalPdfLink: data[r][col.Final_PDF_Link],
        finalPdfFileId: data[r][col.Final_PDF_File_ID],
        secureToken: data[r][col.Secure_Token],
        tokenExpiry: data[r][col.Token_Expiry]
      };

      var result = generateAndDistributePdf_(row, { enqueue: false });
      if (result && result.success) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'PDF regenerated for ' + evalId,
          fileId: result.fileId,
          fileUrl: result.fileUrl
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: result && result.error ? result.error : 'PDF generation failed'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Evaluation not found'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleHealthCheck_() {
  const start = Date.now();
  const sheet = getMasterSheet_();
  const data = sheet.getDataRange().getValues();
  const totalEvals = data.length > 1 ? data.length - 1 : 0;

  const statusCounts = {};
  const headers = data[0] || [];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  if (col.Status !== undefined) {
    for (let r = 1; r < data.length; r++) {
      const status = data[r][col.Status];
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  }

  const dlqStats = getDeadLetterStats_();
  const triggerStatus = getTriggerStatus_();
  const quotaStatus = getQuotaStatus_();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: C_().PAYLOAD_VERSION,
    uptimeMs: Date.now() - start,
    evaluations: {
      total: totalEvals,
      byStatus: statusCounts
    },
    deadLetterQueue: dlqStats,
    triggers: triggerStatus,
    quota: quotaStatus,
    checks: {
      masterSheet: !!sheet,
      auditLogSheet: !!getAuditLogSheet_(),
      logsSheet: !!getLogsSheet_(),
      deadLetterSheet: !!getDeadLetterSheet_(),
      templateDoc: checkTemplateDoc_(),
      archiveFolder: checkArchiveFolder_()
    }
  };

  const unhealthyChecks = Object.entries(health.checks).filter(([k, v]) => !v).map(([k]) => k);
  if (unhealthyChecks.length > 0) {
    health.status = 'degraded';
    health.degradedChecks = unhealthyChecks;
  }

  if (dlqStats.pending > 50) {
    health.status = 'degraded';
    health.warnings = health.warnings || [];
    health.warnings.push('Dead letter queue backlog: ' + dlqStats.pending + ' items');
  }

  if (quotaStatus.maxUsagePct > C_().ALERT_THRESHOLDS.QUOTA_USAGE_PCT) {
    health.status = 'degraded';
    health.warnings = health.warnings || [];
    health.warnings.push('Quota usage high: ' + quotaStatus.maxUsagePct + '%');
  }

  return ContentService.createTextOutput(JSON.stringify(health, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTriggerStatus_() {
  const triggers = ScriptApp.getProjectTriggers();
  const expected = ['checkRemindersAndEscalations', 'processDeadLetterQueue'];
  const found = triggers.map(t => t.getHandlerFunction());
  const missing = expected.filter(f => !found.includes(f));
  return {
    total: triggers.length,
    expected,
    missing,
    healthy: missing.length === 0
  };
}

function getQuotaStatus_() {
  const quota = {
    email: { used: 0, limit: 0, remaining: 0, usagePct: 0 },
    urlFetch: { used: 0, limit: 0, remaining: 0, usagePct: 0 },
    properties: { used: 0, limit: 0, remaining: 0, usagePct: 0 }
  };
  try {
    const emailRemaining = MailApp.getRemainingDailyQuota();
    quota.email = {
      remaining: emailRemaining,
      note: 'Daily email sending limit (Google Workspace: 1000-1500/day)'
    };
  } catch (e) {
    quota.email.error = e.message;
  }
  try {
    const urlFetchQuota = UrlFetchApp.getRemainingDailyQuota();
    const urlFetchLimit = 20000;
    quota.urlFetch = {
      used: urlFetchLimit - urlFetchQuota,
      limit: urlFetchLimit,
      remaining: urlFetchQuota,
      usagePct: Math.round(((urlFetchLimit - urlFetchQuota) / urlFetchLimit) * 100)
    };
  } catch (e) {
    quota.urlFetch = { used: 0, limit: 0, remaining: 0, usagePct: 0, error: 'Not available in web app context' };
  }
  try {
    const props = PropertiesService.getScriptProperties();
    const remaining = (typeof props.getRemainingDailyQuota === 'function') ? props.getRemainingDailyQuota() : 0;
    const propLimit = 500000;
    quota.properties = {
      used: propLimit - remaining,
      limit: propLimit,
      remaining: remaining,
      usagePct: Math.round(((propLimit - remaining) / propLimit) * 100)
    };
  } catch (e) {
    quota.properties.error = e.message;
  }
  const maxUsage = Math.max(quota.email.usagePct || 0, quota.urlFetch.usagePct || 0, quota.properties.usagePct || 0);
  quota.maxUsagePct = maxUsage;
  return quota;
}

function checkTemplateDoc_() {
  try {
    if (!C_().TEMPLATE_DOC_ID || C_().TEMPLATE_DOC_ID.includes('YOUR_')) return false;
    DriveApp.getFileById(C_().TEMPLATE_DOC_ID);
    return true;
  } catch (e) {
    return false;
  }
}

function checkArchiveFolder_() {
  try {
    if (!C_().ARCHIVE_FOLDER_ID || C_().ARCHIVE_FOLDER_ID.includes('YOUR_')) return false;
    DriveApp.getFolderById(C_().ARCHIVE_FOLDER_ID);
    return true;
  } catch (e) {
    return false;
  }
}