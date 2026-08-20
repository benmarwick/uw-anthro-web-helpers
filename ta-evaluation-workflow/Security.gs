function C() { return getConfig(); }
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(identifier, action) {
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

function getClientIdentifier(e) {
  const token = e.parameter?.token || (e.postData?.contents ? JSON.parse(e.postData.contents).token : null);
  const userEmail = getCurrentUserEmailSafe();
  return token ? `token_${token}` : `user_${userEmail}`;
}

function sanitizeInput(input, options = {}) {
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

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const sanitized = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'ratings' && typeof value === 'object') {
      sanitized[key] = {};
      for (const [rKey, rVal] of Object.entries(value)) {
        const num = Number(rVal);
        sanitized[key][sanitizeInput(rKey, { maxLength: 50, allowHtml: false })] = isNaN(num) ? 0 : Math.max(1, Math.min(5, num));
      }
    } else if (key === 'responses' && typeof value === 'object') {
      sanitized[key] = {};
      for (const [rKey, rVal] of Object.entries(value)) {
        sanitized[key][sanitizeInput(rKey, { maxLength: 50, allowHtml: false })] = sanitizeInput(rVal, { maxLength: 5000, allowHtml: false, allowNewlines: true });
      }
    } else if (key === 'taskStatus' && typeof value === 'object') {
      sanitized[key] = {};
      for (const [tKey, tVal] of Object.entries(value)) {
        var safeVal = String(tVal).replace(/[<>"'&]/g, '').substring(0, 20);
        if (['satisfactory', 'unsatisfactory', 'na'].includes(safeVal)) {
          sanitized[key][tKey] = safeVal;
        }
      }
    } else if (key === 'feedback') {
      sanitized[key] = sanitizeInput(value, { maxLength: 10000, allowHtml: false, allowNewlines: true });
    } else if (key === 'signatureName' || key === 'taSignatureName' || key === 'profSignatureName') {
      sanitized[key] = sanitizeInput(value, { maxLength: 200, allowHtml: false, allowNewlines: false });
    } else if (key === 'signatureTimestamp' || key === 'taSignatureTimestamp' || key === 'profSignatureTimestamp') {
      sanitized[key] = sanitizeInput(value, { maxLength: 50, allowHtml: false });
    } else {
      sanitized[key] = sanitizeInput(value, { maxLength: 5000, allowHtml: false, allowNewlines: true });
    }
  }

  return sanitized;
}

function rotateToken(evaluationId) {
  const sheet = getMasterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  for (let r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evaluationId) {
      const newToken = Utilities.getUuid();
      const newExpiry = new Date(Date.now() + C().TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

      sheet.getRange(r + 1, col.Secure_Token + 1).setValue(newToken);
      sheet.getRange(r + 1, col.Token_Expiry + 1).setValue(newExpiry.toISOString());

      logEvent({
        action: C().ACTIONS.TOKEN_REGENERATED,
        evaluationId,
        oldStatus: data[r][col.Status],
        newStatus: data[r][col.Status],
        details: { reason: 'rotation' },
        actorEmail: 'SYSTEM'
      });

      logInfo('Security.rotateToken', `Token rotated for ${evaluationId}`, { evaluationId });
      SpreadsheetApp.flush();

      return { token: newToken, expiry: newExpiry.toISOString() };
    }
  }
  return null;
}

function protectAdminSheets() {
  const ss = getSpreadsheet();
  const adminEmails = [C().ADMIN_EMAIL];

  const sheetsToProtect = [
    C().AUDIT_LOG_SHEET_NAME,
    C().LOGS_SHEET_NAME,
    C().DEAD_LETTER_SHEET_NAME,
    C().MASTER_SHEET_NAME
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

    if (sheetName === C().MASTER_SHEET_NAME) {
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

  logInfo('Security.protectAdminSheets', 'Sheet protections applied', { sheets: sheetsToProtect });
}

function validateCspNonce() {
  const nonce = Utilities.base64Encode(Utilities.computeHmacSha256Signature('secret', Utilities.getUuid()));
  return nonce;
}

function generateCspHeader(nonce) {
  return `default-src 'self'; script-src 'self' 'unsafe-inline' https://script.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://script.google.com; base-uri 'self'; form-action 'self'`;
}

function isTokenExpired(expiryStr) {
  if (!expiryStr) return false;
  return new Date(expiryStr) < new Date();
}

function getCurrentUserEmailSafe() {
  try {
    const email = Session.getActiveUser().getEmail();
    return (email && email.includes('@uw.edu')) ? email : 'ANONYMOUS';
  } catch (e) {
    return 'ANONYMOUS';
  }
}