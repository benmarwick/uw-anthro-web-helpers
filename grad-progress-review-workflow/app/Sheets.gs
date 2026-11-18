/* ============================================================
   Sheets.gs: spreadsheet access. Apps Script starts every server call with fresh globals, so these
   caches last for one request.
   ============================================================ */
var SS_CACHE_ = null;
var CONF_SS_CACHE_ = null;
var SHEET_CACHE_ = {};
var TABLE_CACHE_ = {};
var HEADERS_CHECKED_ = {};   // used by AuditLog.gs, Logs.gs and DeadLetterQueue.gs

const CELL_LIMIT_ = 45000; // Google Sheets cells hold at most 50,000 characters

function getSpreadsheet_() {
  if (SS_CACHE_) return SS_CACHE_;
  if (!C_().SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is not set in Config.gs');
  SS_CACHE_ = SpreadsheetApp.openById(C_().SPREADSHEET_ID);
  return SS_CACHE_;
}

function getConfidentialSpreadsheet_() {
  if (CONF_SS_CACHE_) return CONF_SS_CACHE_;
  if (!C_().CONFIDENTIAL_SPREADSHEET_ID) throw new Error('CONFIDENTIAL_SPREADSHEET_ID is not set in Config.gs');
  CONF_SS_CACHE_ = SpreadsheetApp.openById(C_().CONFIDENTIAL_SPREADSHEET_ID);
  return CONF_SS_CACHE_;
}

function getSheetCached_(name) {
  if (SHEET_CACHE_[name]) return SHEET_CACHE_[name];
  const ss = name === C_().SHEETS.CONFIDENTIAL ? getConfidentialSpreadsheet_() : getSpreadsheet_();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  SHEET_CACHE_[name] = sheet;
  return sheet;
}

function getAuditLogSheet_() { return getSheetCached_(C_().AUDIT_LOG_SHEET_NAME); }
function getLogsSheet_() { return getSheetCached_(C_().LOGS_SHEET_NAME); }
function getDeadLetterSheet_() { return getSheetCached_(C_().DEAD_LETTER_SHEET_NAME); }

/* Creates every sheet in SCHEMA_ and appends any missing header columns (never reorders or deletes). */
function ensureSchema_() {
  getSpreadsheet_().setSpreadsheetTimeZone('America/Los_Angeles');
  Object.keys(SCHEMA_).forEach(function(name) {
    const sheet = getSheetCached_(name);
    const want = SCHEMA_[name];
    const lastCol = sheet.getLastColumn();
    const have = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
    const missing = want.filter(function(h) { return have.indexOf(h) === -1; });
    if (missing.length) {
      sheet.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
      sheet.setFrozenRows(1);
    }
  });
}

function headersOf_(name) {
  const sheet = getSheetCached_(name);
  const lastCol = sheet.getLastColumn();
  return lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
}

/* All rows as objects keyed by header, each with _row (1-based sheet row). */
function readTable_(name) {
  if (TABLE_CACHE_[name]) return TABLE_CACHE_[name];
  const sheet = getSheetCached_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return (TABLE_CACHE_[name] = []);
  const headers = values[0].map(String);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const o = { _row: r + 1 };
    headers.forEach(function(h, i) {
      const v = values[r][i];
      o[h] = v instanceof Date ? formatDateCell_(v) : v;
    });
    rows.push(o);
  }
  return (TABLE_CACHE_[name] = rows);
}

function invalidateTable_(name) { delete TABLE_CACHE_[name]; }

/* Sheets turns a written 'YYYY-MM-DD' string into a date cell at midnight in the spreadsheet's time zone.
   Read it back the same way: a midnight value becomes 'YYYY-MM-DD', anything else a local date-time. */
var SS_TZ_ = null;
function formatDateCell_(d) {
  if (!SS_TZ_) SS_TZ_ = getSpreadsheet_().getSpreadsheetTimeZone() || 'America/Los_Angeles';
  return Utilities.formatDate(d, SS_TZ_, 'HH:mm:ss') === '00:00:00'
    ? Utilities.formatDate(d, SS_TZ_, 'yyyy-MM-dd')
    : Utilities.formatDate(d, SS_TZ_, "yyyy-MM-dd'T'HH:mm:ss");
}

function findRows_(name, field, value) {
  return readTable_(name).filter(function(r) { return String(r[field]) === String(value); });
}

function findOne_(name, field, value) {
  return findRows_(name, field, value)[0] || null;
}

/* Appends objects as rows in header order. Returns the first new row number. */
function appendObjects_(name, objs) {
  if (!objs.length) return 0;
  const sheet = getSheetCached_(name);
  const headers = headersOf_(name);
  const rows = objs.map(function(o) { return headers.map(function(h) { return o[h] === undefined ? '' : o[h]; }); });
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, headers.length).setValues(rows);
  invalidateTable_(name);
  return start;
}

/* Writes the given fields of one row. Unknown field names throw, so a typo cannot fail silently. */
function updateRow_(name, rowNum, fields) {
  const sheet = getSheetCached_(name);
  const headers = headersOf_(name);
  Object.keys(fields).forEach(function(k) {
    const i = headers.indexOf(k);
    if (i === -1) throw new Error('Unknown column ' + k + ' in ' + name);
    sheet.getRange(rowNum, i + 1).setValue(fields[k]);
  });
  invalidateTable_(name);
}

function parseJson_(s, fallback) {
  if (s === null || s === undefined || s === '') return fallback === undefined ? {} : fallback;
  try { return JSON.parse(s); } catch (e) { return fallback === undefined ? {} : fallback; }
}

/* JSON for one cell; refuses anything that would not fit. */
function jsonCell_(obj) {
  const s = JSON.stringify(obj || {});
  if (s.length > CELL_LIMIT_) throw new Error('This section is too long to save (' + s.length + ' characters). Please shorten it.');
  return s;
}

function nowIso_() { return new Date().toISOString(); }

/* Today's date in Pacific time, as 'YYYY-MM-DD'. */
function todayIso_() { return Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd'); }

function newId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyyMMdd') + '-' + Utilities.getUuid().slice(0, 8);
}

function splitList_(s) {
  return String(s || '').split(/[,;\s]+/).map(function(x) { return x.trim().toLowerCase(); }).filter(Boolean);
}

function normEmail_(x) { return String(x || '').trim().toLowerCase(); }
