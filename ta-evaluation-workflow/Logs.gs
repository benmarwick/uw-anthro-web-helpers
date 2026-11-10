function C_() { return getConfig_(); }
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

function ensureLogsSheet_() {
  const sheet = getLogsSheet_();
  if (HEADERS_CHECKED_.logs) return sheet;
  HEADERS_CHECKED_.logs = true;
  const headers = [
    'Timestamp',
    'Level',
    'Function',
    'Message',
    'Context_JSON',
    'Actor_Email',
    'Evaluation_ID',
    'Duration_MS'
  ];
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = existing.some((h, i) => h !== headers[i]);
  if (needsHeaders || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 180);
  }
  return sheet;
}

function log_(level, functionName, message, context = {}, extras = {}) {
  if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) return;
  const sheet = ensureLogsSheet_();
  const timestamp = new Date().toISOString();
  const actorEmail = extras.actorEmail || getCurrentUserEmailSafe_();
  const evaluationId = extras.evaluationId || '';
  const durationMs = extras.durationMs || '';
  const row = [
    timestamp,
    level,
    functionName,
    message,
    JSON.stringify(context),
    actorEmail,
    evaluationId,
    durationMs
  ];
  sheet.appendRow(row);
  if (level === 'ERROR' || level === 'FATAL') {
    SpreadsheetApp.flush();
  }
}

function logDebug_(functionName, message, context, extras) {
  return log_('DEBUG', functionName, message, context, extras);
}

function logInfo_(functionName, message, context, extras) {
  return log_('INFO', functionName, message, context, extras);
}

function logWarn_(functionName, message, context, extras) {
  return log_('WARN', functionName, message, context, extras);
}

function logError_(functionName, message, context, extras) {
  return log_('ERROR', functionName, message, context, extras);
}

function logFatal_(functionName, message, context, extras) {
  return log_('FATAL', functionName, message, context, extras);
}

/* getCurrentUserEmailSafe_() is defined once, in Security.gs. */

function withLogging_(functionName, fn, context = {}) {
  const start = Date.now();
  try {
    const result = fn();
    logInfo_(functionName, 'Completed successfully', { ...context, success: true }, { durationMs: Date.now() - start });
    return result;
  } catch (err) {
    logError_(functionName, err.message, { ...context, error: err.message, stack: err.stack }, { durationMs: Date.now() - start });
    throw err;
  }
}

async function withLoggingAsync_(functionName, fn, context = {}) {
  const start = Date.now();
  try {
    const result = await fn();
    logInfo_(functionName, 'Completed successfully', { ...context, success: true }, { durationMs: Date.now() - start });
    return result;
  } catch (err) {
    logError_(functionName, err.message, { ...context, error: err.message, stack: err.stack }, { durationMs: Date.now() - start });
    throw err;
  }
}

function queryLogs_(filter = {}) {
  const sheet = ensureLogsSheet_();
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
      if (filter.level && entry.Level !== filter.level) return false;
      if (filter.function && !entry.Function.includes(filter.function)) return false;
      if (filter.evaluationId && entry.Evaluation_ID !== filter.evaluationId) return false;
      if (filter.actorEmail && entry.Actor_Email !== filter.actorEmail) return false;
      if (filter.startDate && new Date(entry.Timestamp) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(entry.Timestamp) > new Date(filter.endDate)) return false;
      if (filter.minDuration && Number(entry.Duration_MS) < filter.minDuration) return false;
      return true;
    })
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
}

function getRecentErrors_(limit = 50) {
  return queryLogs_({ level: 'ERROR' }).slice(0, limit);
}

function getRecentFatals_(limit = 50) {
  return queryLogs_({ level: 'FATAL' }).slice(0, limit);
}

function getLogsForEvaluation_(evaluationId, limit = 100) {
  return queryLogs_({ evaluationId }).slice(0, limit);
}

function getLogsByFunction_(functionName, limit = 100) {
  return queryLogs_({ function: functionName }).slice(0, limit);
}

function pruneOldLogs_(daysToKeep = 90) {
  const sheet = ensureLogsSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const headers = data[0];
  const rows = data.slice(1);
  const keepRows = rows.filter(row => new Date(row[0]) >= cutoff);
  const deleted = rows.length - keepRows.length;
  if (deleted > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).clearContent();
    if (keepRows.length > 0) {
      sheet.getRange(2, 1, keepRows.length, headers.length).setValues(keepRows);
    }
    SpreadsheetApp.flush();
  }
  logInfo_('Logs.pruneOldLogs', `Pruned ${deleted} log entries older than ${daysToKeep} days`, { deleted, kept: keepRows.length });
  return deleted;
}