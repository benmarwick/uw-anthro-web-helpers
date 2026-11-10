const CONFIG = {
  TEMPLATE_DOC_ID: '1VHHpZR0YgQWLFgaOQJDFtjsdVdjDzt4DMxf5oIy4CFA',
  ARCHIVE_FOLDER_ID: '1bV7kjbGotyrnJlOau6PEW0uqEJeLLyHA',
  ADMIN_EMAIL: 'bmarwick@uw.edu',
  SPREADSHEET_ID: '1hCvDujkSyjmbtH9ZOyntV6Va1c8ye7Hxt0RbSOFIxDc',  // Create a Google Sheet and paste its ID here
  REMINDER_INTERVAL_DAYS: 5,   // reminders on day 5 and day 10, escalation on day 15 (after DUE_DAYS)
  DUE_DAYS: 14,                // due date shown in the emails, counted from when each step starts
  EVAL_MINUTES: 10,            // time estimate shown in the emails
  MAX_REMINDERS: 2,
  APP_URL: 'https://script.google.com/a/macros/uw.edu/s/AKfycbxjtb3CKSgW2YnCkNa_Zk6EZVxs8Ddk38JWuTUu6puNs6BTcA6dnmD42dzKQYR4LXD2/exec',
  TOKEN_TTL_DAYS: 30,
  AUDIT_LOG_SHEET_NAME: 'Audit_Log',
  LOGS_SHEET_NAME: 'Logs',
  DEAD_LETTER_SHEET_NAME: 'Dead_Letter_Queue',
  MASTER_SHEET_NAME: 'TA_Evaluations',
  STATUSES: {
    NOT_STARTED: 'NOT_STARTED',
    PROF_EVAL_PENDING: 'PROF_EVAL_PENDING',
    TA_RESPONSE_PENDING: 'TA_RESPONSE_PENDING',
    PROF_SIGN_PENDING: 'PROF_SIGN_PENDING',
    PDF_GENERATING: 'PDF_GENERATING',
    COMPLETED: 'COMPLETED',
    ESCALATED: 'ESCALATED'
  },
  ACTIONS: {
    LAUNCH: 'LAUNCH',
    PROF_EVAL_SUBMIT: 'PROF_EVAL_SUBMIT',
    TA_RESPONSE_SUBMIT: 'TA_RESPONSE_SUBMIT',
    PROF_SIGN_SUBMIT: 'PROF_SIGN_SUBMIT',
    PDF_GENERATED: 'PDF_GENERATED',
    PDF_FAILED: 'PDF_FAILED',
    REMINDER_SENT: 'REMINDER_SENT',
    ESCALATED: 'ESCALATED',
    TOKEN_REGENERATED: 'TOKEN_REGENERATED',
    MANUAL_OVERRIDE: 'MANUAL_OVERRIDE'
  },
  PAYLOAD_VERSION: 1,
  LOG_LEVEL: 'INFO',
  LOG_RETENTION_DAYS: 90,
  DEAD_LETTER_MAX_RETRIES: 3,
  DEAD_LETTER_BASE_DELAY_MS: 60000,
  ALERT_THRESHOLDS: {
    PDF_FAILURES_PER_HOUR: 5,
    EMAIL_FAILURES_PER_HOUR: 10,
    TRIGGER_FAILURES_PER_DAY: 3,
    QUOTA_USAGE_PCT: 80
  },
  SECURITY: {
    RATE_LIMIT_WINDOW_MS: 3600000,
    RATE_LIMIT_MAX_REQUESTS: 30,
    SANITIZE_MAX_LENGTH: 10000,
    TOKEN_ROTATION_ON_STAGE_CHANGE: true,
    CSP_NONCE_ENABLED: false,
    SHEET_PROTECTION_ENABLED: true
  },
  PDF: {
    MAX_RETRIES: 3,
    BASE_RETRY_DELAY_MS: 5000,
    MAX_FILE_SIZE_MB: 10,
  }
};

function getConfig_() {
  return CONFIG;
}

/* Apps Script starts every server call (page request, google.script.run call, trigger run) with
   fresh globals, so these caches last for one request. They stop each helper from opening the
   spreadsheet and looking up its sheets again. */
var SS_CACHE_ = null;
var SHEET_CACHE_ = {};
var HEADERS_CHECKED_ = {};
var MASTER_COLS_ = null;

function getSpreadsheet_() {
  if (SS_CACHE_) return SS_CACHE_;
  const id = CONFIG.SPREADSHEET_ID;
  if (!id || id.includes('YOUR_')) {
    throw new Error('SPREADSHEET_ID not configured in Config.gs');
  }
  SS_CACHE_ = SpreadsheetApp.openById(id);
  return SS_CACHE_;
}

function getSheetCached_(name) {
  if (SHEET_CACHE_[name]) return SHEET_CACHE_[name];
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  SHEET_CACHE_[name] = sheet;
  return sheet;
}

function getMasterSheet_() { return getSheetCached_(CONFIG.MASTER_SHEET_NAME); }
function getAuditLogSheet_() { return getSheetCached_(CONFIG.AUDIT_LOG_SHEET_NAME); }
function getLogsSheet_() { return getSheetCached_(CONFIG.LOGS_SHEET_NAME); }
function getDeadLetterSheet_() { return getSheetCached_(CONFIG.DEAD_LETTER_SHEET_NAME); }

/* Header name -> 0-based column index for TA_Evaluations, read once per request. */
function masterColumns_() {
  if (MASTER_COLS_) return MASTER_COLS_;
  const sheet = getMasterSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  MASTER_COLS_ = {};
  headers.forEach(function(h, i) { MASTER_COLS_[h] = i; });
  return MASTER_COLS_;
}
