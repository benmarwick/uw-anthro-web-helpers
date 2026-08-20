function C() { return getConfig(); }
function ensureAuditLogSheet() {
  const sheet = getAuditLogSheet();
  const headers = [
    'Timestamp',
    'Actor_Email',
    'Action',
    'Evaluation_ID',
    'Old_Status',
    'New_Status',
    'Details',
    'Client_IP'
  ];

  const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = existingHeaders.some((h, i) => h !== headers[i]);

  if (needsHeaders || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 150);
    sheet.getRange(1, 1, 1, headers.length).setHorizontalAlignment('center');
  }
  return sheet;
}

function logEvent(params) {
  const {
    action,
    evaluationId,
    oldStatus,
    newStatus,
    details = {},
    actorEmail,
    clientIp
  } = params;

  const sheet = ensureAuditLogSheet();
  const timestamp = new Date().toISOString();
  const email = actorEmail || getCurrentUserEmail();
  const ip = clientIp || getClientIpFromContext();

  const row = [
    timestamp,
    email,
    action,
    evaluationId,
    oldStatus || '',
    newStatus || '',
    JSON.stringify(details),
    ip
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
  return sheet.getLastRow();
}

function getCurrentUserEmail() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    if (email && email.includes('@uw.edu')) {
      return email;
    }
  } catch (e) {
    // Session.getActiveUser() may not be available in trigger context
  }
  return 'SYSTEM';
}

function getClientIpFromContext() {
  try {
    const htmlService = HtmlService.getUserAgent();
    // Note: In Apps Script web apps, IP is not directly available
    // This would need to be passed from client-side or via X-Forwarded-For header
    return '';
  } catch (e) {
    return '';
  }
}

function queryAuditLog(filter = {}) {
  const sheet = getAuditLogSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    })
    .filter(entry => {
      if (filter.evaluationId && entry.Evaluation_ID !== filter.evaluationId) return false;
      if (filter.actorEmail && entry.Actor_Email !== filter.actorEmail) return false;
      if (filter.action && entry.Action !== filter.action) return false;
      if (filter.startDate && new Date(entry.Timestamp) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(entry.Timestamp) > new Date(filter.endDate)) return false;
      if (filter.status && entry.New_Status !== filter.status) return false;
      return true;
    })
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
}

function getAuditLogForEvaluation(evaluationId) {
  return queryAuditLog({ evaluationId });
}

function getRecentAuditLog(limit = 100) {
  const sheet = getAuditLogSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1).slice(-limit).reverse();

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}