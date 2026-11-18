/* ============================================================
   Config.gs: settings for the graduate review system (annual review and course feedback).
   Fill in the IDs and emails before running "Initialize". Plans: grad-annual-review-plan.md,
   course-feedback-plan.md; details: build-spec.md.
   ============================================================ */
const CONFIG = {
  /* ---- Set these when installing ---- */
  SPREADSHEET_ID: '1mdkZo7d2e2WElWzjzGFgbQUUC0dxB_1hGmGRW_QDi1Q',  // the main spreadsheet (build copy, created 18 Nov 2026) (Reviews, Students, course feedback tabs, logs)
  CONFIDENTIAL_SPREADSHEET_ID: '1cHgReD-TfNRXBQzQw8RySnBp-KxxZYCJhd8awqIsz6Y',  // build copy; a separate spreadsheet shared with no person (annual review plan §8)
  ARCHIVE_FOLDER_ID: '',            // Drive folder for PDFs and CV uploads, owned by the system account
  APP_URL: 'https://script.google.com/a/macros/uw.edu/s/AKfycbz5Ux91ZrBe-V8gH3aCg6DZBIHYES4_CyhcJFtTvBGOXHAFA5tM0Iy_9kzPW-Twjwxn/exec',  // build deployment
  ADMIN_EMAIL: 'bmarwick@uw.edu',   // Graduate Student Administrator: runs menus and the Roster page
  GPC_EMAIL: 'bmarwick@uw.edu',     // Graduate Program Coordinator
  GPC_NAME: 'Ben Marwick',          // signs every email
  ALTERNATE_EMAIL: '',              // alternate reviewer for the GPC's advisees (default: department chair; decision 16)
  SUBFIELD_COORDINATORS: {},        // { 'Archaeology': 'x@uw.edu', 'Sociocultural': ..., 'Biological': ..., 'MA': ... }
  PRIVACY_URL: 'https://github.com/benmarwick/uw-anthro-web-helpers/blob/main/grad-progress-review-workflow/README.md#privacy-notice',
  SURVEY_URL: '',                   // the anonymous post-cycle survey (annual review plan §9.5)

  /* ---- Annual review ---- */
  CYCLE_YEAR: 2027,
  MAX_REMINDERS: 2,
  REMINDER_INTERVAL_DAYS: 5,
  TOKEN_TTL_DAYS: 45,
  ADVISOR_RETURN_DAYS: 5,
  EXPECTED_TTD_YEARS: null,         // switched off until the faculty set it (decision 18)
  GS_LIMIT_YEARS: { PHD: 10, MA: 6 },
  GS_LIMIT_FLAG_FROM_YEAR: { PHD: 8, MA: 5 },
  SUMMER_REGISTRATION_REQUIRED: false,  // confirmed 17 Nov 2026 (annual review plan §4.4)

  /* ---- Course feedback ---- */
  CF_CURRICULA_PHASE1: ['ANTH', 'ARCHY', 'BIO A'],
  CF_ALL_DEPARTMENTS: false,        // phase 2 from autumn 2027 (decision 4)
  CF_RELEASE_OFFSET_DAYS: { SPR: 14 },   // otherwise 7 days after the page closes
  CF_RETURN_DAYS: 5,
  CF_LOCK_MINUTES: 30,
  CF_QUARTERS_ON: { AUT2026: false, WIN2027: true, SPR2027: true, SUM2027: false },  // decision 9; summer off by default

  /* ---- Sheets ---- */
  SHEETS: {
    STUDENTS: 'Students', REVIEWS: 'Reviews', INSTRUCTORS: 'Instructors', ENROLLMENTS: 'Enrollments',
    REQUESTS: 'Feedback_Requests', COMMENTS: 'Course_Feedback', FOLLOWUPS: 'Followups', RECORDS: 'Feedback_Records',
    METRICS: 'Metrics', CONFIDENTIAL: 'Confidential'
  },
  AUDIT_LOG_SHEET_NAME: 'Audit_Log',
  LOGS_SHEET_NAME: 'Logs',
  DEAD_LETTER_SHEET_NAME: 'Dead_Letter_Queue',

  ACTIONS: {
    LAUNCH: 'LAUNCH', STAGE_SUBMIT: 'STAGE_SUBMIT', DRAFT_SAVED: 'DRAFT_SAVED', REMINDER_SENT: 'REMINDER_SENT',
    ESCALATED: 'ESCALATED', ESCALATION_RESOLVED: 'ESCALATION_RESOLVED', ADVISOR_RETURNED: 'ADVISOR_RETURNED',
    STATUS_ACTION_RECORDED: 'STATUS_ACTION_RECORDED', INTERIM_CREATED: 'INTERIM_CREATED', PDF_GENERATED: 'PDF_GENERATED',
    PDF_FAILED: 'PDF_FAILED', TOKEN_REGENERATED: 'TOKEN_REGENERATED', ROSTER_IMPORTED: 'ROSTER_IMPORTED',
    CF_LAUNCHED: 'CF_LAUNCHED', CF_SUBMITTED: 'CF_SUBMITTED', CF_NOT_MY_COURSE: 'CF_NOT_MY_COURSE', CF_RETURNED: 'CF_RETURNED',
    CF_CHECKED: 'CF_CHECKED', CF_RELEASED: 'CF_RELEASED', FOLLOWUP_OPENED: 'FOLLOWUP_OPENED', FOLLOWUP_CLOSED: 'FOLLOWUP_CLOSED',
    RECORD_RELEASED: 'RECORD_RELEASED', CONFIDENTIAL_READ: 'CONFIDENTIAL_READ', MANUAL_OVERRIDE: 'MANUAL_OVERRIDE'
  },
  PAYLOAD_VERSION: 1,
  LOG_LEVEL: 'INFO',
  LOG_RETENTION_DAYS: 90,
  DEAD_LETTER_MAX_RETRIES: 3,
  DEAD_LETTER_BASE_DELAY_MS: 60000,
  ALERT_THRESHOLDS: { PDF_FAILURES_PER_HOUR: 5, EMAIL_FAILURES_PER_HOUR: 10, TRIGGER_FAILURES_PER_DAY: 3, QUOTA_USAGE_PCT: 80 },
  SECURITY: { RATE_LIMIT_WINDOW_MS: 3600000, RATE_LIMIT_MAX_REQUESTS: 60, SANITIZE_MAX_LENGTH: 10000 },
  PDF: { MAX_RETRIES: 3, BASE_RETRY_DELAY_MS: 5000, MAX_FILE_SIZE_MB: 10 }
};

/* Header row for every sheet this system writes. ensureSchema_() adds missing columns. */
const SCHEMA_ = {
  Students: ['Email', 'Name', 'Preferred_First', 'Program', 'Subfield', 'Entry_Quarter', 'Advisor_Emails', 'Chair_Email',
             'GSR_Email', 'Alternate_Reviewer', 'Status', 'GPA', 'Leave_Ends', 'Has_Advisor', 'Has_Doc_Comm', 'Has_Masters_Comm',
             'Has_Reading_Comm', 'UW_Degrees', 'Candidacy_Date', 'ANTH800_Credits', 'Courses_JSON', 'Updated_At'],
  Reviews: ['Review_ID', 'Cycle', 'Type', 'Program', 'Student_Email', 'Advisor_Emails', 'Chair_Email', 'Status', 'Escalated_From',
            'Skipped_Stage', 'Due_Date', 'Stage_Started', 'Reminder_Count', 'Last_Reminder', 'Secure_Token', 'Token_Expiry',
            'Student_Payload', 'Advisor_Payload', 'Program_Payload', 'Response_Payload', 'Development_Payload', 'CV_File_ID',
            'Final_PDF_ID', 'Parent_Review_ID', 'Advisor_Return_Until', 'Interim_Due', 'Alert_Quarter', 'Alert_Sent_Date',
            'Created_At', 'Updated_At', 'Payload_Version'],
  Instructors: ['TS_Name', 'Email', 'Appointment', 'Appointment_Source', 'Checked_By', 'Checked_At'],
  Enrollments: ['Quarter', 'Student_Email', 'Curric', 'Course_Number', 'Section', 'SLN', 'Section_Type', 'Joint_Group',
                'Instructor_Names', 'Instructor_Emails', 'Exclusion_Reason', 'Source', 'Request_Key', 'Advisee_Of', 'Imported_At'],
  Feedback_Requests: ['Request_ID', 'Request_Key', 'Quarter', 'Offering', 'Instructor_Names', 'Instructor_Emails', 'Status',
                      'Secure_Token', 'Token_Expiry', 'Due_Date', 'Reminder_Count', 'Lock_Owner', 'Lock_Until', 'Minutes_Bucket',
                      'Signature', 'Submitted_By', 'Submitted_At', 'Not_Mine_By', 'Not_Mine_Suggested', 'Created_At'],
  Course_Feedback: ['Feedback_ID', 'Request_ID', 'Quarter', 'Student_Email', 'Course', 'Instructor_Names', 'Contact',
                    'Rating_Written', 'Rating_Discussion', 'Rating_Literature', 'Strength', 'Next_Step', 'Followup_Flag',
                    'Followup_Note', 'Status', 'Submitted_By', 'Submitted_At', 'Returned_Reason', 'Return_Until', 'GPC_Note',
                    'Released_At'],
  Followups: ['Followup_ID', 'Feedback_ID', 'Student_Email', 'Quarter', 'Opened_At', 'Handled_By', 'Contact_Date', 'Outcome',
              'Interim_Review_ID', 'Status', 'Alert_Sent_At', 'Reminder_Sent_At'],
  Feedback_Records: ['Record_ID', 'Student_Email', 'Feedback_Year', 'Coverage', 'GPC_Synthesis', 'Released_At', 'Released_By',
                     'PDF_File_ID'],
  Metrics: ['Metric', 'Group', 'Value', 'Computed_At'],
  Confidential: ['Review_ID', 'Author_Role', 'Field', 'Text', 'Timestamp']
};

/* The rating scale for course feedback (decision 8) and the annual review rating (§6). */
const CF_LEVELS_ = ["Below what I'd expect at this stage", 'Approaching', 'Meeting', 'Beyond', 'Not observed'];
const REVIEW_RATINGS_ = ['Satisfactory', 'Satisfactory with concerns', 'Unsatisfactory'];

function getConfig_() { return CONFIG; }
function C_() { return CONFIG; }
