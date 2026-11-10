const CONFIG = {
  TEMPLATE_DOC_ID: '1VHHpZR0YgQWLFgaOQJDFtjsdVdjDzt4DMxf5oIy4CFA',
  ARCHIVE_FOLDER_ID: '1bV7kjbGotyrnJlOau6PEW0uqEJeLLyHA',
  ADMIN_EMAIL: 'bmarwick@uw.edu',
  SPREADSHEET_ID: '1hCvDujkSyjmbtH9ZOyntV6Va1c8ye7Hxt0RbSOFIxDc',  // Create a Google Sheet and paste its ID here
  REMINDER_INTERVAL_DAYS: 5,   // reminders 5 days apart; a row escalates only once its step is past due
  DUE_DAYS: 14,                // fallback due date (days after a step starts) when the term is not in QUARTER_END_DATES_ or has ended
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


/* The job-description duties on the form and the PDF. The form, the server check and the PDF all use this list. */
const DUTY_LIST_ = [
  'Attend lectures', 'Conduct quiz section meetings', 'Facilitate discussions',
  'Prepare lectures for quiz sections', 'Prepare review materials for quiz sections',
  'Hold extra review sessions for exams', 'Obtain room for review sessions',
  'Request or acquire necessary equipment', 'Hold regular office hours', 'Tutor students',
  'Manage and respond to course-related e-mail', 'Prepare webpage for course materials',
  'Maintain (update) webpage for course materials',
  'Develop and maintain electronic bulletin boards, discussion sites, etc.',
  'Prepare test questions', 'Proctor exams', 'Score exams', 'Maintain grading records',
  'Maintain records on individual students\' assignment completion',
  'Calculate quarter grades', 'Request student assessments for course',
  'Coordinate with OEA for course evaluations', 'Prepare lecture materials',
  'Present lectures', 'Prepare overheads', 'Prepare handout materials', 'Review literature',
  'Place course materials on library reserve', 'Attend instructor/TA meetings',
  'Act as liaison/mediator between student and professor'
];

/* The form field name for a duty, e.g. 'task_attend_lectures'. */
function dutyKey_(d) {
  return 'task_' + String(d).replace(/ /g, '_').toLowerCase();
}

/* ---------- Quarter end dates ----------
   The last day of final examinations for each quarter (for summer, the last day of instruction of
   the full term, since summer has no separate finals week). Source: UW Office of the Registrar,
   Academic Calendar Summaries 2025-2033, https://www.washington.edu/students/reg/begendcal.html
   Add new years here when the registrar publishes them. */
const QUARTER_END_DATES_ = {
  'Autumn 2025': '2025-12-12', 'Winter 2026': '2026-03-20', 'Spring 2026': '2026-06-12', 'Summer 2026': '2026-08-21',
  'Autumn 2026': '2026-12-18', 'Winter 2027': '2027-03-19', 'Spring 2027': '2027-06-11', 'Summer 2027': '2027-08-20',
  'Autumn 2027': '2027-12-17', 'Winter 2028': '2028-03-17', 'Spring 2028': '2028-06-09', 'Summer 2028': '2028-08-18',
  'Autumn 2028': '2028-12-15', 'Winter 2029': '2029-03-16', 'Spring 2029': '2029-06-08', 'Summer 2029': '2029-08-17',
  'Autumn 2029': '2029-12-14', 'Winter 2030': '2030-03-22', 'Spring 2030': '2030-06-14', 'Summer 2030': '2030-08-23',
  'Autumn 2030': '2030-12-13', 'Winter 2031': '2031-03-21', 'Spring 2031': '2031-06-13', 'Summer 2031': '2031-08-22',
  'Autumn 2031': '2031-12-12', 'Winter 2032': '2032-03-19', 'Spring 2032': '2032-06-11', 'Summer 2032': '2032-08-20',
  'Autumn 2032': '2032-12-17', 'Winter 2033': '2033-03-18', 'Spring 2033': '2033-06-10', 'Summer 2033': '2033-08-19'
};

/* How many days before the quarter's end each step is due, so all three finish by the end date. */
const STEP_DAYS_BEFORE_END_ = { prof_eval: 14, ta_respond: 7, prof_sign: 0 };

/* A step that starts late still gets at least this many days. */
const MIN_STEP_DAYS_ = 3;

const DAY_MS_ = 24 * 60 * 60 * 1000;

/* "Autumn 2026", "AUT 2026", "AU26", "Fall 2026", "WI 2027", "Spr 2027" ... -> "Autumn 2026" etc., or null. */
function quarterKey_(term) {
  const m = String(term || '').trim().match(/^(autumn|aut|au|fall|fa|winter|win|wi|spring|spr|sp|summer|sum|su)\.?\s*'?\s*(\d{4}|\d{2})$/i);
  if (!m) return null;
  const q = m[1].toLowerCase();
  const name = /^(au|fa)/.test(q) ? 'Autumn' : /^wi/.test(q) ? 'Winter' : /^sp/.test(q) ? 'Spring' : 'Summer';
  return name + ' ' + (m[2].length === 2 ? '20' + m[2] : m[2]);
}

/* The quarter's end date (noon Pacific time on that day), or null when the term is not in the table. */
function quarterEndDate_(term) {
  const key = quarterKey_(term);
  const iso = key && QUARTER_END_DATES_[key];
  if (!iso) return null;
  const p = iso.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2], 20, 0, 0));
}

/* The due date for a step that started at `start`:
   STEP_DAYS_BEFORE_END_ days before the quarter's end, but never less than MIN_STEP_DAYS_ after the start.
   If the term is unknown or its quarter had already ended when the step started, DUE_DAYS after the start. */
function dueDateForStep_(term, step, start) {
  const begin = start ? new Date(start) : new Date();
  const fallback = new Date(begin.getTime() + C_().DUE_DAYS * DAY_MS_);
  const end = quarterEndDate_(term);
  if (!end || end.getTime() < begin.getTime()) return fallback;
  const target = end.getTime() - (STEP_DAYS_BEFORE_END_[step] || 0) * DAY_MS_;
  const earliest = begin.getTime() + MIN_STEP_DAYS_ * DAY_MS_;
  return new Date(Math.max(target, earliest));
}

/* When the current step started: its link is issued then and expires TOKEN_TTL_DAYS later. */
function stepStartFromExpiry_(expiry) {
  const exp = new Date(expiry);
  if (isNaN(exp.getTime())) return new Date();
  return new Date(exp.getTime() - C_().TOKEN_TTL_DAYS * DAY_MS_);
}

/* True once the due day has ended (Pacific time). */
function isPastDue_(due) {
  return Date.now() > due.getTime() + 12 * 60 * 60 * 1000;
}
