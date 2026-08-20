const CONFIG = {
  TEMPLATE_DOC_ID: '1VHHpZR0YgQWLFgaOQJDFtjsdVdjDzt4DMxf5oIy4CFA',
  ARCHIVE_FOLDER_ID: '1bV7kjbGotyrnJlOau6PEW0uqEJeLLyHA',
  ADMIN_EMAIL: 'bmarwick@uw.edu',
  SPREADSHEET_ID: '1hCvDujkSyjmbtH9ZOyntV6Va1c8ye7Hxt0RbSOFIxDc',  // Create a Google Sheet and paste its ID here
  REMINDER_INTERVAL_DAYS: 3,
  MAX_REMINDERS: 2,
  APP_URL: 'https://script.google.com/macros/s/AKfycbyseoid07zdu5E6YmHy3S9of35FlhQn1PqjPBYUqIcVKakjVLyk_Lp1vaDMIthssQXNMg/exec',
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

function getConfig() {
  return CONFIG;
}

function getSpreadsheet() {
  const id = CONFIG.SPREADSHEET_ID;
  if (!id || id.includes('YOUR_')) {
    throw new Error('SPREADSHEET_ID not configured in Config.gs');
  }
  return SpreadsheetApp.openById(id);
}

function getMasterSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.MASTER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.MASTER_SHEET_NAME);
  }
  return sheet;
}

function getAuditLogSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.AUDIT_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.AUDIT_LOG_SHEET_NAME);
  }
  return sheet;
}

function getLogsSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.LOGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LOGS_SHEET_NAME);
  }
  return sheet;
}

function getDeadLetterSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.DEAD_LETTER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DEAD_LETTER_SHEET_NAME);
  }
  return sheet;
}