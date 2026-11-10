function C_() { return getConfig_(); }
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit_(identifier, action) {
  const cache = CacheService.getScriptCache();
  const key = `ratelimit_${action}_${identifier}`;
  const cached = cache.get(key);

  if (cached) {
    const data = JSON.parse(cached);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    data.requests = data.requests.filter(t => t > windowStart);

    if (data.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
      const oldest = Math.min(...data.requests);
      const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
      return { allowed: false, retryAfter, remaining: 0 };
    }

    data.requests.push(now);
    cache.put(key, JSON.stringify(data), Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    return { allowed: true, retryAfter: 0, remaining: RATE_LIMIT_MAX_REQUESTS - data.requests.length };
  } else {
    cache.put(key, JSON.stringify({ requests: [Date.now()] }), Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    return { allowed: true, retryAfter: 0, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
}

function sanitizeInput_(input, options = {}) {
  if (input === null || input === undefined) return '';

  const {
    maxLength = 10000,
    allowHtml = false,
    allowNewlines = true,
    stripScripts = true
  } = options;

  let output = String(input);

  if (output.length > maxLength) {
    output = output.substring(0, maxLength);
  }

  if (stripScripts) {
    output = output.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    output = output.replace(/on\w+\s*=/gi, '');
    output = output.replace(/javascript:/gi, '');
    output = output.replace(/data:/gi, '');
    output = output.replace(/vbscript:/gi, '');
  }

  if (!allowHtml) {
    output = output
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&apos;')
      .replace(/\//g, '&#x2F;');
  }

  if (!allowNewlines) {
    output = output.replace(/[\r\n]+/g, ' ');
  }

  return output;
}

function sanitizePayload_(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const sanitized = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'ratings' && typeof value === 'object') {
      sanitized[key] = {};
      for (const [rKey, rVal] of Object.entries(value)) {
        const num = Number(rVal);
        sanitized[key][sanitizeInput_(rKey, { maxLength: 50, allowHtml: false })] = isNaN(num) ? 0 : Math.max(1, Math.min(5, num));
      }
    } else if (key === 'responses' && typeof value === 'object') {
      sanitized[key] = {};
      for (const [rKey, rVal] of Object.entries(value)) {
        sanitized[key][sanitizeInput_(rKey, { maxLength: 50, allowHtml: false })] = sanitizeInput_(rVal, { maxLength: 5000, allowHtml: false, allowNewlines: true });
      }
    } else if (key === 'taskStatus' && typeof value === 'object') {
      sanitized[key] = {};
      for (const [tKey, tVal] of Object.entries(value)) {
        if (!/^task_[\w()\/,.'&;#-]{1,150}$/.test(tKey)) continue;
        var safeVal = String(tVal).replace(/[<>"'&]/g, '').substring(0, 20);
        if (['satisfactory', 'unsatisfactory', 'na'].includes(safeVal)) {
          sanitized[key][tKey] = safeVal;
        }
      }
    } else if (key === 'feedback') {
      sanitized[key] = sanitizeInput_(value, { maxLength: 10000, allowHtml: false, allowNewlines: true });
    } else if (key === 'signatureName' || key === 'taSignatureName' || key === 'profSignatureName') {
      sanitized[key] = sanitizeInput_(value, { maxLength: 200, allowHtml: false, allowNewlines: false });
    } else if (key === 'signatureTimestamp' || key === 'taSignatureTimestamp' || key === 'profSignatureTimestamp') {
      sanitized[key] = sanitizeInput_(value, { maxLength: 50, allowHtml: false });
    } else {
      sanitized[key] = sanitizeInput_(value, { maxLength: 5000, allowHtml: false, allowNewlines: true });
    }
  }

  return sanitized;
}

function rotateToken_(evaluationId) {
  const sheet = getMasterSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  for (let r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evaluationId) {
      const newToken = Utilities.getUuid();
      const newExpiry = new Date(Date.now() + C_().TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

      sheet.getRange(r + 1, col.Secure_Token + 1).setValue(newToken);
      sheet.getRange(r + 1, col.Token_Expiry + 1).setValue(newExpiry.toISOString());

      logEvent_({
        action: C_().ACTIONS.TOKEN_REGENERATED,
        evaluationId,
        oldStatus: data[r][col.Status],
        newStatus: data[r][col.Status],
        details: { reason: 'rotation' },
        actorEmail: 'SYSTEM'
      });

      logInfo_('Security.rotateToken', `Token rotated for ${evaluationId}`, { evaluationId });
      SpreadsheetApp.flush();

      return { token: newToken, expiry: newExpiry.toISOString() };
    }
  }
  return null;
}

function protectAdminSheets_() {
  const ss = getSpreadsheet_();
  const adminEmails = [C_().ADMIN_EMAIL];

  const sheetsToProtect = [
    C_().AUDIT_LOG_SHEET_NAME,
    C_().LOGS_SHEET_NAME,
    C_().DEAD_LETTER_SHEET_NAME,
    C_().MASTER_SHEET_NAME
  ];

  sheetsToProtect.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    protections.forEach(p => p.remove());

    const protection = sheet.protect();
    protection.setDescription('Protected by TA Evaluation System');
    protection.removeEditors(protection.getEditors());
    protection.addEditors(adminEmails);

    if (sheetName === C_().MASTER_SHEET_NAME) {
      const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      const headerProtection = headerRange.protect();
      headerProtection.setDescription('Header row protected');
      headerProtection.removeEditors(headerProtection.getEditors());
      headerProtection.addEditors(adminEmails);

      const dataRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getLastColumn());
      const dataProtection = dataRange.protect();
      dataProtection.setDescription('Data rows - coordinators only');
      dataProtection.removeEditors(dataProtection.getEditors());
      dataProtection.addEditors(adminEmails);
    }
  });

  logInfo_('Security.protectAdminSheets', 'Sheet protections applied', { sheets: sheetsToProtect });
}

function validateCspNonce_() {
  const nonce = Utilities.base64Encode(Utilities.computeHmacSha256Signature('secret', Utilities.getUuid()));
  return nonce;
}

function generateCspHeader_(nonce) {
  return `default-src 'self'; script-src 'self' 'unsafe-inline' https://script.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://script.google.com; base-uri 'self'; form-action 'self'`;
}

function isTokenExpired_(expiryStr) {
  // A launched row always has an expiry; a missing one is treated as expired.
  if (!expiryStr) return true;
  return new Date(expiryStr) < new Date();
}

function getCurrentUserEmailSafe_() {
  try {
    const email = Session.getActiveUser().getEmail();
    return (email && email.includes('@uw.edu')) ? email : 'ANONYMOUS';
  } catch (e) {
    return 'ANONYMOUS';
  }
}

/* ---------- Who is calling ---------- */

/* The signed-in visitor's email, lowercased, or '' when Google does not reveal it. */
function activeEmail_() {
  try { return normEmail_(Session.getActiveUser().getEmail()); } catch (e) { return ''; }
}

/* The account the script runs as: the owner for the web app ("Execute as: Me") and for triggers. */
function ownerEmail_() {
  try { return normEmail_(Session.getEffectiveUser().getEmail()); } catch (e) { return ''; }
}

/* Menu items: only the script owner may run them. A web app visitor is a different
   active user from the effective user (the owner), so calls through google.script.run fail here. */
function assertOwner_() {
  const active = activeEmail_();
  if (!active || active !== ownerEmail_()) {
    throw new Error('Only the owner of the TA Evaluation System can run this.');
  }
}

/* Trigger handlers: allow the owner, or a call with no visible user that carries a trigger
   event (installable trigger events include triggerUid). A signed-in web app visitor is refused. */
function assertTriggerOrOwner_(e) {
  const active = activeEmail_();
  if (active && active === ownerEmail_()) return;
  if (!active && e && e.triggerUid) return;
  throw new Error('Not authorized.');
}

/* ---------- Evaluation access ---------- */

const STAGE_ACTIONS_ = {
  PROF_EVAL_PENDING: 'prof_eval',
  TA_RESPONSE_PENDING: 'ta_respond',
  PROF_SIGN_PENDING: 'prof_sign'
};

/* Fields each stage may write into Data_Payload. Anything else in a submission is dropped,
   so a TA cannot overwrite the instructor's evaluation and the reverse. */
const STAGE_FIELDS_ = {
  prof_eval: ['evalBasis', 'visitationDate', 'visitationDescription', 'taskStatus', 'otherDuties',
              'strengths', 'concerns', 'feedback', 'ratings', 'signatureName'],
  ta_respond: ['responses', 'taSignatureName'],
  prof_sign: ['profSignatureName']
};

function stageActionForStatus_(status) {
  return STAGE_ACTIONS_[status] || null;
}

function pickStageFields_(action, payload) {
  const allowed = STAGE_FIELDS_[action] || [];
  const out = {};
  allowed.forEach(function(k) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, k)) out[k] = payload[k];
  });
  return out;
}

/* Checks that the signed-in user is the person this stage belongs to.
   Returns { ok: true, email } or { ok: false, error }. */
function checkStageAccess_(row, action) {
  const email = activeEmail_();
  if (!email) {
    return { ok: false, error: 'Sign in with your UW Google account to open this evaluation.' };
  }
  const isTaStage = action === 'ta_respond';
  const expected = normEmail_(isTaStage ? row.taEmail : row.profEmail);
  if (!expected || email !== expected) {
    return {
      ok: false,
      error: 'This evaluation link is for the ' + (isTaStage ? 'TA' : 'instructor') +
        '. You are signed in as ' + email + '. Sign in with the UW account the email was sent to, or contact the coordinator.'
    };
  }
  return { ok: true, email: email };
}

/* Loads the row for a token and checks expiry, stage and identity.
   requiredAction: the stage the caller wants to act on.
   Returns { row, email } or { error }. */
function loadAuthorizedRow_(token, requiredAction) {
  const row = findRowByToken_(token);
  if (!row) return { error: 'Invalid or expired evaluation link.' };
  if (isTokenExpired_(row.tokenExpiry)) return { error: 'This link has expired. Contact the coordinator for a new link.' };
  const stage = stageActionForStatus_(row.status);
  if (!stage || stage !== requiredAction) return { error: 'This step is not open for input.' };
  const access = checkStageAccess_(row, stage);
  if (!access.ok) {
    logWarn_('Security.loadAuthorizedRow', 'Access refused', { evaluationId: row.evaluationId, action: requiredAction, user: activeEmail_() || 'ANONYMOUS' });
    return { error: access.error };
  }
  return { row: row, email: access.email };
}
