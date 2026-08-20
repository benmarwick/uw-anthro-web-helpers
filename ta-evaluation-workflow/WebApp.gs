function C() { return getConfig(); }
function doGet(e) {
  try {
    return handleRequest(e);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRequest(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;

  if (action === 'health') {
    return handleHealthCheck();
  }
  if (action === 'ping') {
    return ContentService.createTextOutput('pong').setMimeType(ContentService.MimeType.TEXT);
  }
  if (action === 'regen') {
    return handleRegenToken(e);
  }
  if (action === 'regen_pdf') {
    return handleRegenPdf(e);
  }

  if (!action || !token) {
    return renderError('Missing action or token parameter.');
  }

  const row = findRowByToken(token);
  if (!row) {
    return renderError('Invalid or expired evaluation link.');
  }

  if (row.status === C().STATUSES.COMPLETED) {
    return renderCompleted('This evaluation is finalized. Check your email for the PDF copy.');
  }

  const nonce = C().SECURITY.CSP_NONCE_ENABLED ? validateCspNonce() : null;

  const html = HtmlService.createTemplateFromFile('Index');
  html.action = action;
  html.token = token;
  html.row = row;
  html.config = CONFIG;
  html.nonce = nonce;
  return html.evaluate()
    .setTitle('TA Evaluation - ' + action.replace('_', ' ').toUpperCase())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    var clientId = getClientIdentifier(e);
    var rateLimit = checkRateLimit(clientId, 'doPost');
    if (!rateLimit.allowed) {
      logWarn('WebApp.doPost', 'Rate limit exceeded', { clientId: clientId, retryAfter: rateLimit.retryAfter });
      return jsonResponse({ success: false, error: 'Too many requests. Please wait ' + rateLimit.retryAfter + ' seconds.' }, 429);
    }

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (lockErr) {
      return jsonResponse({ success: false, error: 'System busy, please retry.' });
    }

    try {
    const params = JSON.parse(e.postData.contents);
    const { token, action, payload } = params;

    if (!token || !action) {
      return jsonResponse({ success: false, error: 'Missing token or action.' });
    }

    const sanitizedPayload = sanitizePayload(payload || {});

    const row = findRowByToken(token);
    if (!row) {
      return jsonResponse({ success: false, error: 'Invalid or expired token.' });
    }

    if (isTokenExpired(row.tokenExpiry)) {
      return jsonResponse({ success: false, error: 'Token has expired. Contact coordinator for a new link.' });
    }

    const currentUser = getCurrentUserEmailSafe();
    if (!isAuthorized(currentUser, row, action)) {
      logWarn('WebApp.doPost', 'Authorization failed', { user: currentUser, action, evaluationId: row.evaluationId });
      return jsonResponse({ success: false, error: 'Not authorized for this action.' });
    }

    const oldStatus = row.status;
    let newStatus;
    let details = {};

    switch (action) {
      case 'save_draft':
        if (oldStatus !== C().STATUSES.PROF_EVAL_PENDING) {
          return jsonResponse({ success: false, error: 'Draft saving only available during professor evaluation.' });
        }
        const draftPayload = mergePayload(row.dataPayload, sanitizedPayload);
        updateRow(row.rowNum, {
          dataPayload: draftPayload,
          lastActionDate: new Date().toISOString()
        });
        logInfo('WebApp.doPost', 'Draft saved for ' + row.evaluationId, { evaluationId: row.evaluationId });
        return jsonResponse({ success: true, message: 'Draft saved' });

      case 'load_draft':
        if (oldStatus !== C().STATUSES.PROF_EVAL_PENDING) {
          return jsonResponse({ success: false, error: 'Draft loading only available during professor evaluation.' });
        }
        return jsonResponse({ success: true, payload: row.dataPayload });

      case 'prof_eval':
        if (oldStatus !== C().STATUSES.PROF_EVAL_PENDING) {
          return jsonResponse({ success: false, error: 'Invalid state for professor evaluation.' });
        }
        newStatus = C().STATUSES.TA_RESPONSE_PENDING;
        details = { ratingsKeys: Object.keys(sanitizedPayload.ratings || {}), feedbackLength: (sanitizedPayload.feedback || '').length };
        break;

      case 'ta_respond':
        if (oldStatus !== C().STATUSES.TA_RESPONSE_PENDING) {
          return jsonResponse({ success: false, error: 'Invalid state for TA response.' });
        }
        newStatus = C().STATUSES.PROF_SIGN_PENDING;
        details = { responseKeys: Object.keys(sanitizedPayload.responses || {}), signature: !!sanitizedPayload.signature };
        break;

      case 'prof_sign':
        if (oldStatus !== C().STATUSES.PROF_SIGN_PENDING) {
          return jsonResponse({ success: false, error: 'Invalid state for professor sign-off.' });
        }
        newStatus = C().STATUSES.PDF_GENERATING;
        details = { signature: !!sanitizedPayload.signature };
        break;

      default:
        return jsonResponse({ success: false, error: 'Unknown action.' });
    }

    const updatedPayload = mergePayload(row.dataPayload, sanitizedPayload);

    if (C().SECURITY.TOKEN_ROTATION_ON_STAGE_CHANGE) {
      const rotated = rotateToken(row.evaluationId);
      if (rotated) {
        row.secureToken = rotated.token;
        row.tokenExpiry = rotated.expiry;
      }
    }

    updateRow(row.rowNum, {
      status: newStatus,
      dataPayload: updatedPayload,
      lastActionDate: new Date().toISOString(),
      secureToken: row.secureToken,
      tokenExpiry: row.tokenExpiry
    });

    logEvent({
      action: getAuditAction(action),
      evaluationId: row.evaluationId,
      oldStatus,
      newStatus,
      details,
      actorEmail: currentUser
    });

    if (action === 'prof_eval') {
      sendTAResponseInvite({
        evaluationId: row.evaluationId,
        token: row.secureToken,
        courseCode: row.courseCode,
        term: row.term,
        profName: row.profName,
        profEmail: row.profEmail,
        taName: row.taName,
        taEmail: row.taEmail
      });
    } else if (action === 'ta_respond') {
      sendProfSignInvite({
        evaluationId: row.evaluationId,
        token: row.secureToken,
        courseCode: row.courseCode,
        term: row.term,
        profName: row.profName,
        profEmail: row.profEmail,
        taName: row.taName,
        taEmail: row.taEmail
      });
    } else if (action === 'prof_sign') {
      const pdfResult = generateAndDistributePdf({
        ...row,
        status: newStatus,
        dataPayload: updatedPayload
      });
      if (pdfResult && pdfResult.success === false) {
        newStatus = pdfResult.status || C().STATUSES.PROF_SIGN_PENDING;
      }
    }

    return jsonResponse({
      success: true,
      newStatus,
      token: row.secureToken,
      message: newStatus === C().STATUSES.PROF_SIGN_PENDING
        ? 'PDF generation is being retried. You will be notified when it is finalized.'
        : 'Submitted successfully.'
    });
  } catch (err) {
    logError('WebApp.doPost', err.message, { stack: err.stack, action: e.parameter?.action });
    return jsonResponse({ success: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
  } catch (outerErr) {
    return jsonResponse({ success: false, error: 'Server error: ' + outerErr.message });
  }
}

function submitForm(token, action, payload) {
  var row = findRowByToken(token);
  if (!row) return { success: false, error: 'Invalid or expired token.' };

  if (isTokenExpired(row.tokenExpiry)) {
    return { success: false, error: 'Token has expired. Contact coordinator for a new link.' };
  }

  var sanitizedPayload = sanitizePayload(payload || {});
  var oldStatus = row.status;
  var newStatus;
  var details = {};

  switch (action) {
    case 'prof_eval':
      if (oldStatus !== C().STATUSES.PROF_EVAL_PENDING) {
        return { success: false, error: 'Invalid state for professor evaluation.' };
      }
      newStatus = C().STATUSES.TA_RESPONSE_PENDING;
      details = { ratingsKeys: Object.keys(sanitizedPayload.ratings || {}), feedbackLength: (sanitizedPayload.feedback || '').length };
      break;
    case 'ta_respond':
      if (oldStatus !== C().STATUSES.TA_RESPONSE_PENDING) {
        return { success: false, error: 'Invalid state for TA response.' };
      }
      newStatus = C().STATUSES.PROF_SIGN_PENDING;
      details = { responseKeys: Object.keys(sanitizedPayload.responses || {}) };
      break;
    case 'prof_sign':
      if (oldStatus !== C().STATUSES.PROF_SIGN_PENDING) {
        return { success: false, error: 'Invalid state for professor sign-off.' };
      }
      newStatus = C().STATUSES.PDF_GENERATING;
      break;
    default:
      return { success: false, error: 'Unknown action.' };
  }

  var updatedPayload = mergePayload(row.dataPayload, sanitizedPayload);

  if (C().SECURITY.TOKEN_ROTATION_ON_STAGE_CHANGE) {
    var rotated = rotateToken(row.evaluationId);
    if (rotated) {
      row.secureToken = rotated.token;
      row.tokenExpiry = rotated.expiry;
    }
  }

  updateRow(row.rowNum, {
    status: newStatus,
    dataPayload: updatedPayload,
    lastActionDate: new Date().toISOString(),
    secureToken: row.secureToken,
    tokenExpiry: row.tokenExpiry
  });

  logEvent({
    action: getAuditAction(action),
    evaluationId: row.evaluationId,
    oldStatus: oldStatus,
    newStatus: newStatus,
    details: details
  });

  if (action === 'prof_eval') {
    sendTAResponseInvite({
      evaluationId: row.evaluationId,
      token: row.secureToken,
      courseCode: row.courseCode,
      term: row.term,
      profName: row.profName,
      profEmail: row.profEmail,
      taName: row.taName,
      taEmail: row.taEmail
    });
  } else if (action === 'ta_respond') {
    sendProfSignInvite({
      evaluationId: row.evaluationId,
      token: row.secureToken,
      courseCode: row.courseCode,
      term: row.term,
      profName: row.profName,
      profEmail: row.profEmail,
      taName: row.taName,
      taEmail: row.taEmail
    });
  } else if (action === 'prof_sign') {
    var pdfResult = generateAndDistributePdf({
      rowNum: row.rowNum,
      evaluationId: row.evaluationId,
      courseCode: row.courseCode,
      term: row.term,
      profName: row.profName,
      profEmail: row.profEmail,
      taName: row.taName,
      taEmail: row.taEmail,
      status: newStatus,
      dataPayload: updatedPayload,
      secureToken: row.secureToken,
      tokenExpiry: row.tokenExpiry
    });
    if (pdfResult && pdfResult.success === false) {
      newStatus = pdfResult.status || C().STATUSES.PROF_SIGN_PENDING;
    }
  }

  return {
    success: true,
    newStatus: newStatus,
    token: row.secureToken,
    message: newStatus === C().STATUSES.PROF_SIGN_PENDING
      ? 'PDF generation is being retried. You will be notified when it is finalized.'
      : 'Submitted successfully.'
  };
}

function saveDraftData(token, payload) {
  var row = findRowByToken(token);
  if (!row) return { success: false, error: 'Invalid token.' };
  if (row.status !== C().STATUSES.PROF_EVAL_PENDING) {
    return { success: false, error: 'Draft saving only available during professor evaluation.' };
  }
  var sanitizedPayload = sanitizePayload(payload || {});
  var draftPayload = mergePayload(row.dataPayload, sanitizedPayload);
  updateRow(row.rowNum, {
    dataPayload: draftPayload,
    lastActionDate: new Date().toISOString()
  });
  return { success: true, message: 'Draft saved' };
}

function loadDraftData(token) {
  var row = findRowByToken(token);
  if (!row) return { success: false, payload: {} };
  if (row.status !== C().STATUSES.PROF_EVAL_PENDING) {
    return { success: false, payload: {} };
  }
  return { success: true, payload: row.dataPayload };
}

function findRowByToken(token) {
  const sheet = getMasterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (row[col.Secure_Token] === token) {
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
        dataPayload: parsePayload(row[col.Data_Payload]),
        finalPdfLink: row[col.Final_PDF_Link],
        finalPdfFileId: row[col.Final_PDF_File_ID],
        payloadVersion: row[col.Payload_Version]
      };
    }
  }
  return null;
}

function parsePayload(str) {
  try {
    return str ? JSON.parse(str) : {};
  } catch (e) {
    return {};
  }
}

function mergePayload(existing, incoming) {
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

function updateRow(rowNum, updates) {
  const sheet = getMasterSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  Object.entries(updates).forEach(([key, value]) => {
    const headerMap = {
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
    const header = headerMap[key] || key;
    if (col[header] !== undefined) {
      sheet.getRange(rowNum, col[header] + 1).setValue(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  });
  SpreadsheetApp.flush();
}

function isAuthorized(userEmail, row, action) {
  if (userEmail === 'SYSTEM' || userEmail === 'ANONYMOUS' || !userEmail) return true;
  if (action === 'prof_eval' || action === 'prof_sign') {
    return userEmail === row.profEmail;
  }
  if (action === 'ta_respond') {
    return userEmail === row.taEmail;
  }
  return false;
}

function getAuditAction(action) {
  const map = {
    'prof_eval': C().ACTIONS.PROF_EVAL_SUBMIT,
    'ta_respond': C().ACTIONS.TA_RESPONSE_SUBMIT,
    'prof_sign': C().ACTIONS.PROF_SIGN_SUBMIT
  };
  return map[action] || action.toUpperCase();
}

function jsonResponse(obj, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  // Note: Apps Script ContentService doesn't support setting HTTP status codes directly
  // Status codes are handled by the platform; we include status in the response body
  return output;
}

function renderError(message) {
  const html = HtmlService.createTemplateFromFile('ErrorView');
  html.message = message;
  return html.evaluate().setTitle('Error').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function renderCompleted(message) {
  const html = HtmlService.createTemplateFromFile('CompletedView');
  html.message = message;
  return html.evaluate().setTitle('Completed').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function handleRegenToken(e) {
  var evalId = e.parameter.evalId;
  if (!evalId) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Missing evalId parameter'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getMasterSheet();
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
      var rotated = rotateToken(evalId);
      if (rotated) {
        var status = data[r][col.Status];
        var action = 'prof_eval';
        if (status === 'TA_RESPONSE_PENDING') action = 'ta_respond';
        else if (status === 'PROF_SIGN_PENDING') action = 'prof_sign';
        var link = C().APP_URL + '?action=' + action + '&token=' + rotated.token;
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

function handleRegenPdf(e) {
  var evalId = e.parameter.evalId;
  if (!evalId) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Missing evalId parameter'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getMasterSheet();
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
        dataPayload: parsePayload(data[r][col.Data_Payload]),
        finalPdfLink: data[r][col.Final_PDF_Link],
        finalPdfFileId: data[r][col.Final_PDF_File_ID],
        secureToken: data[r][col.Secure_Token],
        tokenExpiry: data[r][col.Token_Expiry]
      };

      var result = generateAndDistributePdf(row, { enqueue: false });
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

function handleHealthCheck() {
  const start = Date.now();
  const sheet = getMasterSheet();
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

  const dlqStats = getDeadLetterStats();
  const triggerStatus = getTriggerStatus();
  const quotaStatus = getQuotaStatus();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: C().PAYLOAD_VERSION,
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
      auditLogSheet: !!getAuditLogSheet(),
      logsSheet: !!getLogsSheet(),
      deadLetterSheet: !!getDeadLetterSheet(),
      templateDoc: checkTemplateDoc(),
      archiveFolder: checkArchiveFolder()
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

  if (quotaStatus.usagePct > C().ALERT_THRESHOLDS.QUOTA_USAGE_PCT) {
    health.status = 'degraded';
    health.warnings = health.warnings || [];
    health.warnings.push('Quota usage high: ' + quotaStatus.usagePct + '%');
  }

  return ContentService.createTextOutput(JSON.stringify(health, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTriggerStatus() {
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

function getQuotaStatus() {
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

function checkTemplateDoc() {
  try {
    if (!C().TEMPLATE_DOC_ID || C().TEMPLATE_DOC_ID.includes('YOUR_')) return false;
    DriveApp.getFileById(C().TEMPLATE_DOC_ID);
    return true;
  } catch (e) {
    return false;
  }
}

function checkArchiveFolder() {
  try {
    if (!C().ARCHIVE_FOLDER_ID || C().ARCHIVE_FOLDER_ID.includes('YOUR_')) return false;
    DriveApp.getFolderById(C().ARCHIVE_FOLDER_ID);
    return true;
  } catch (e) {
    return false;
  }
}