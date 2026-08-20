# TA Evaluation System (UW Anthropology — ASE Evaluations)

A secure, event-driven, multi-step Teaching Assistant / Academic Student Employee (ASE) evaluation, response, digital signature, and PDF archiving system for the **University of Washington Department of Anthropology**, built on **Google Apps Script**, **Google Sheets**, **Google Docs**, **Google Drive**, and **Gmail**.

The app digitizes the department's paper "[Academic Student Employee (ASE) Evaluation Form](examples/Academic%20Student%20Employee%20(ASE)%20Evaluation%20Form.pdf)": instructors rate an ASE's job duties, the ASE reviews the feedback and self-evaluates, the instructor gives a final sign-off, and the finished evaluation is rendered as a signed PDF that is emailed to both parties and archived in Google Drive.

## Links

- **Apps Script project:** https://script.google.com/home/projects/17tiixPCukHffnZMe8Ph48qL1Y8x7Lz3pmeX4IgHK_TV3Vd--Kjb5qrTU
- **Google Sheet (master spreadsheet):** https://docs.google.com/spreadsheets/d/1hCvDujkSyjmbtH9ZOyntV6Va1c8ye7Hxt0RbSOFIxDc/edit
- **Web app (deployment):** https://script.google.com/macros/s/AKfycbyseoid07zdu5E6YmHy3S9of35FlhQn1PqjPBYUqIcVKakjVLyk_Lp1vaDMIthssQXNMg/exec

---

## 1. Lifecycle

Each evaluation row in the master sheet moves through a strict state machine:

| Status | Meaning |
|---|---|
| `NOT_STARTED` | Row created, not yet launched |
| `PROF_EVAL_PENDING` | Waiting for the professor to complete the evaluation form |
| `TA_RESPONSE_PENDING` | Waiting for the TA to review feedback and self-evaluate |
| `PROF_SIGN_PENDING` | Waiting for the professor's final sign-off |
| `PDF_GENERATING` | PDF generation in progress |
| `COMPLETED` | PDF generated and emailed to both parties |
| `ESCALATED` | Inactive too long; escalated to the department administrator |

Flow:

1. **Launch** — the coordinator selects `NOT_STARTED` rows in the Sheets menu and runs *Launch Selected Evaluation(s)*. Each row gets a UUID access token (`Secure_Token`, 30-day expiry), status moves to `PROF_EVAL_PENDING`, and an invitation email goes to the professor.
2. **Stage 1 — Professor Evaluation** (`prof_eval`): the professor completes the evaluation form via a tokenized web link, signs it, and submits. Status → `TA_RESPONSE_PENDING`; the TA gets an email invite.
3. **Stage 2 — TA Review & Response** (`ta_respond`): the TA views the professor's evaluation read-only, writes a self-evaluation (context / self-evaluation / looking ahead), signs, and submits. Status → `PROF_SIGN_PENDING`; the professor gets an email invite.
4. **Stage 3 — Professor Final Sign-off** (`prof_sign`): the professor reviews the full evaluation + TA response read-only and signs. Status → `PDF_GENERATING`.
5. **PDF Generation** — a styled, UW-branded PDF is built, saved to the archive Drive folder, and emailed to both the professor and TA. Status → `COMPLETED`. On failure, status reverts to `PROF_SIGN_PENDING` for retry and an alert is sent to the admin.
6. **Automation** — a daily trigger checks pending evaluations. After 3 days of inactivity it sends up to 2 reminders; when reminders are exhausted the evaluation is marked `ESCALATED` and the department administrator is emailed.

Every transition is written to the `Audit_Log` sheet and the `Data_Payload` JSON column is updated.

---

## 2. Technical Stack

- **Platform:** Google Apps Script (V8 runtime), HTML Service web app (`HtmlService.createTemplateFromFile('Index')`).
- **Database:** Google Sheets (master roster + audit/log/queue sheets in a single spreadsheet).
- **Document generation:** PDFs are built programmatically in Google Docs (styled with UW colors) and exported as `application/pdf` — **not** from a tokenized template doc.
- **Storage:** Google Drive (archive folder for final PDFs).
- **Email:** Gmail via `GmailApp`.
- **OAuth scopes (`appsscript.json`):** spreadsheets, documents, drive, gmail.send, script.external_request.

---

## 3. File Structure

```
├── Config.gs             # Global constants (sheet names, IDs, thresholds, toggles)
├── SheetAdmin.gs         # Sheets custom menu, schema init, launch, sample data, admin dialogs
├── Security.gs           # Rate limiting, input sanitization, token rotation, sheet protection
├── AuditLog.gs           # Audit trail: logEvent(), query helpers
├── Logs.gs               # Structured logging: logInfo/Warn/Error/Fatal, query + prune
├── DeadLetterQueue.gs    # Failed task queue with exponential-backoff retries
├── Alerting.gs           # Threshold monitoring + hourly consolidated alert email
├── WebApp.gs             # doGet/doPost, routing, state transitions, health check
├── PdfEngine.gs          # Programmatic PDF builder + distribution + retry logic
├── EmailEngine.gs        # HTML email templates (invites, reminders, escalation, completion)
├── Automation.gs         # Daily reminder/escalation trigger
├── Index.html            # Single dynamic web app UI (UW palette, WCAG 2.1 AA)
├── ErrorView.html        # Error page template
├── CompletedView.html    # Completion page template
├── Template_Doc_Spec.md  # LEGACY: placeholder spec for the old tokenized template approach (no longer used)
├── appsscript.json       # Script manifest (scopes, runtime, timezone)
└── examples/             # Original paper ASE evaluation forms (reference)
```

The project is deployed with [clasp](https://developers.google.com/apps-script/guides/clasp) (see `.clasp.json`).

---

## 4. Data Model (Google Sheets)

### 4.1 Master Sheet: `TA_Evaluations`
18 columns:

1. `Evaluation_ID` — e.g. `EVAL-1001`
2. `Course_Code` — e.g. `CS 101`
3. `Term` — e.g. `Autumn 2025`
4. `Prof_Name`
5. `Prof_Email`
6. `TA_Name`
7. `TA_Email`
8. `Status` — one of the states in §1
9. `Created_Date` — ISO timestamp
10. `Completed_Date` — ISO timestamp (blank until `COMPLETED`)
11. `Last_Action_Date` — ISO timestamp (drives reminder logic)
12. `Reminder_Count` — 0–2
13. `Secure_Token` — UUID v4 used in email links
14. `Token_Expiry` — ISO timestamp (30 days from issue)
15. `Data_Payload` — JSON string with all ratings, duties, comments, responses, and signatures
16. `Final_PDF_Link` — Drive URL of the archived PDF
17. `Final_PDF_File_ID` — Drive file ID (idempotency checks)
18. `Payload_Version` — schema version, default `1`

#### `Data_Payload` structure
The JSON payload accumulates fields across stages via deep merge:

```jsonc
{
  "evalBasis": "class_visitation" | "other",
  "visitationDate": "YYYY-MM-DD",
  "visitationDescription": "…",
  "taskStatus": { "task_attend_lectures": "satisfactory" | "unsatisfactory" | "na", "…": "…" },
  "otherDuties": "…",
  "strengths": "…",
  "concerns": "…",
  "feedback": "…",
  "responses": { "context": "…", "self_eval": "…", "looking_ahead": "…" },
  "signatureName": "…",
  "signatureTimestamp": "ISO",
  "taSignatureName": "…", "taSignatureTimestamp": "…",
  "profSignatureName": "…", "profSignatureTimestamp": "…"
}
```

### 4.2 Audit Log: `Audit_Log`
`Timestamp`, `Actor_Email`, `Action`, `Evaluation_ID`, `Old_Status`, `New_Status`, `Details` (JSON), `Client_IP`.

Actions: `LAUNCH`, `PROF_EVAL_SUBMIT`, `TA_RESPONSE_SUBMIT`, `PROF_SIGN_SUBMIT`, `PDF_GENERATED`, `PDF_FAILED`, `REMINDER_SENT`, `ESCALATED`, `TOKEN_REGENERATED`, `MANUAL_OVERRIDE`.

### 4.3 Structured Logs: `Logs`
`Timestamp`, `Level` (`DEBUG`–`FATAL`), `Function`, `Message`, `Context_JSON`, `Actor_Email`, `Evaluation_ID`, `Duration_MS`.

### 4.4 Dead Letter Queue: `Dead_Letter_Queue`
`ID`, `Created_Timestamp`, `Action`, `Payload_JSON`, `Error_Message`, `Error_Stack`, `Retry_Count`, `Max_Retries`, `Next_Retry_Timestamp`, `Status`, `Last_Attempt_Timestamp`, `Last_Attempt_Error`.

Actions: `SEND_EMAIL`, `GENERATE_PDF`, `SEND_REMINDER`, `SEND_ESCALATION`, `SEND_COMPLETION`.

All sheets are created automatically (`Initialize Sheets` menu) and can be protected so only the admin email can edit them.

---

## 5. Web App

Single-page app served at `?action=<action>&token=<token>`. Each stage link is unique to the recipient (professor or TA) and embedded in an invitation email.

### `doGet` actions
- `health` — JSON health check (see §8).
- `ping` — returns `pong` (liveness).
- `regen?evalId=…` — rotates the token for an evaluation and returns the new link.
- `regen_pdf?evalId=…` — regenerates the final PDF for an evaluation.
- `prof_eval` / `ta_respond` / `prof_sign` — render the corresponding form (via `Index.html`).
- Invalid/missing token → friendly error page (`ErrorView`).
- `COMPLETED` evaluations → `CompletedView`.

State/sequence enforcement happens server-side on submit in `doPost` — attempting the wrong step for the current status is rejected.

### `doPost` actions
- `save_draft` / `load_draft` — auto-save/restore of the professor's in-progress draft (only during `PROF_EVAL_PENDING`).
- `prof_eval` → `TA_RESPONSE_PENDING` + TA invite email.
- `ta_respond` → `PROF_SIGN_PENDING` + professor sign-off invite email.
- `prof_sign` → `PDF_GENERATING` + PDF generation.

### Request pipeline
Every `doPost` runs through:

1. **Rate limiting** — sliding-window limit via `CacheService` (30 requests/hour per token/user); returns `429`-style JSON when exceeded.
2. **Script lock** — `LockService` keyed around the request to avoid race conditions on state transitions.
3. **Input sanitization** — strips scripts/event handlers/`javascript:` URLs, HTML-escapes, enforces field-specific max lengths, clamps values (e.g. duty ratings must be `satisfactory`/`unsatisfactory`/`na`).
4. **Token validation** — token must exist and not be expired.
5. **Authorization** — active user's UW email (`Session.getActiveUser()`, requires `@uw.edu`) must match `Prof_Email` or `TA_Email` for the action. Non-Google / non-UW users are treated as `ANONYMOUS` (pass-through — the token is the primary access control).
6. **State transition** — guarded by current `Status`; audits the change.
7. **Token rotation** — a new UUID is issued on every stage transition (configurable), and the new token is returned so the UI can continue.

### UI (`Index.html`)
Single dynamic page (not a separate template per stage) that renders the active step. Styled to the UW brand (purple `#4B2E83`, gold `#B7A57A`, Inter font) and built for WCAG 2.1 AA: skip link, semantic landmarks, ARIA progress bar, visible keyboard focus, `role="alert"` live regions, print stylesheet, mobile-responsive layout, character counters, and accessible custom radio buttons. The web forms meet current accessibility best practices: every input is labeled, required fields are announced and validated with clear error messages, radio groups use `<fieldset>`/`<legend>`, and all controls have touch targets of at least 44 px. The professor's form auto-saves to localStorage (1 s debounce) and syncs to the server.

### Professor Evaluation Form (`prof_eval`)
- **Basis of Evaluation** — class visitation vs. other, with visitation date and observation description.
- **Job Description Duties** — a 30-row duty matrix (Attend lectures, Hold regular office hours, Proctor exams, …) rated **Satisfactory / Unsatisfactory / Not Applicable**; every row requires a rating. Optional "Other specific duties" free text.
- **Comments** — required strengths, required concerns/challenges, and additional feedback (min 10 chars).
- **Digital Signature** — full name + acknowledgment checkbox ("this electronic signature has the same legal effect as a handwritten signature").

### TA Response Form (`ta_respond`)
- Professor's evaluation displayed read-only (duty matrix + strengths + concerns + feedback).
- **Self-evaluation** — three required free-text fields: *Context*, *Self-evaluation*, *Looking ahead*.
- Digital signature + acknowledgment.

### Professor Sign-off Form (`prof_sign`)
- Professor's original evaluation and the TA's self-evaluation displayed read-only.
- Final signature + acknowledgment.

---

## 6. PDF Generation (`PdfEngine.gs`)

The PDF is **built programmatically** — no template doc. A temporary Google Doc is created, populated by `buildStyledDocument()`, then exported as `application/pdf`.

- **Contents:** "ASE Evaluation" header (course/term, professor • TA), evaluation metadata, basis of evaluation, the duty-matrix table (with ✓ / ✗ / — marks), other duties, strengths, concerns, additional feedback, TA self-evaluation, and signature blocks.
- **Deterministic filename:** `Evaluation_<EvalID>_<Course>_<TAName>.pdf`.
- **Idempotent:** if `Final_PDF_Link`/`Final_PDF_File_ID` are already set, generation is skipped and `PDF_GENERATED` is logged with `idempotent: true`.
- **Retry:** up to `MAX_RETRIES` retries (default 3) with exponential backoff (base 5 s) for transient errors (rate limits, quota, timeouts, network). Non-retryable errors (e.g. file size > 10 MB) fail fast.
- **Distribution:** the file is saved to the archive Drive folder and the row's `Final_PDF_Link`/`Final_PDF_File_ID` are persisted *before* email dispatch, so a crash after upload won't duplicate the file.
- **Completion:** emails the PDF to both professor and TA, sets `Completed_Date`, moves status to `COMPLETED`, and audits `PDF_GENERATED`.
- **Failure:** reverts status to `PROF_SIGN_PENDING`, audits `PDF_FAILED`, emails the admin, and enqueues a `GENERATE_PDF` DLQ item for retry.

`Template_Doc_Spec.md` documents the superseded `{{TOKEN}}`-placeholder template approach; it is retained as a reference but is **not used** by the current engine. The `TEMPLATE_DOC_ID` in `Config.gs` is only checked for existence by the health check.

---

## 7. Automation, Alerts & Retries

### Reminders & escalations (`Automation.gs`)
Daily trigger at 09:00 runs `checkRemindersAndEscalations()`. For any evaluation in `PROF_EVAL_PENDING` / `TA_RESPONSE_PENDING` / `PROF_SIGN_PENDING`:
- ≥ 3 days (`REMINDER_INTERVAL_DAYS`) since last activity and `Reminder_Count < 2` → send reminder to the responsible party, increment `Reminder_Count`, reset `Last_Action_Date`.
- `Reminder_Count >= 2` → mark `ESCALATED`, send escalation email to `ADMIN_EMAIL`.

### Dead letter queue (`DeadLetterQueue.gs`)
Failed emails and PDF generation are enqueued with a 60 s base delay that doubles per retry (max 3 retries). A 10-minute trigger processes due items; items that exhaust retries are marked `MAX_RETRIES_EXCEEDED` and alert the admin.

### Alerting (`Alerting.gs`)
Hourly trigger runs `checkAlertThresholds()`, which checks:
- PDF failures / hour (> 5)
- Email failures / hour (> 10)
- Trigger failures / 24 h (> 3)
- Missing expected triggers (`checkRemindersAndEscalations`, `processDeadLetterQueue`)
- Quota usage (> 80%)
- DLQ backlog (> 50 pending, > 10 max-retries-exceeded)
- Stale evaluations (> 20 pending with no activity for 14 days)

Triggers with alerts found → consolidated email to `ADMIN_EMAIL` grouped by severity (Critical / High / Warning).

---

## 8. Health Check

`GET /?action=health` returns JSON:

```json
{
  "status": "healthy" | "degraded",
  "timestamp": "…",
  "version": 1,
  "uptimeMs": 0,
  "evaluations": { "total": 0, "byStatus": { } },
  "deadLetterQueue": { "pending": 0, "success": 0, "maxRetries": 0, "total": 0 },
  "triggers": { "total": 0, "expected": [], "missing": [], "healthy": true },
  "quota": { "email": {}, "urlFetch": {}, "properties": {}, "maxUsagePct": 0 },
  "checks": { "masterSheet": true, "auditLogSheet": true, "logsSheet": true,
              "deadLetterSheet": true, "templateDoc": true, "archiveFolder": true }
}
```

`status` becomes `degraded` if any dependency check fails, the DLQ backlog exceeds 50, or quota usage exceeds 80%. (Run in-sheet via the *Run Health Check* menu item, which renders the same data as a dialog.)

---

## 9. Security

- **Tokenized links:** unguessable UUID v4 tokens per evaluation/stage, rotated on every transition, expiring after 30 days (`TOKEN_TTL_DAYS`). The token is the primary access control.
- **Authorization:** stage actions must be submitted by the matching UW email (`@uw.edu`) in `Prof_Email` / `TA_Email`.
- **Input sanitization:** XSS-stripping, HTML-escaping, and length caps on every field; duty ratings restricted to `satisfactory`/`unsatisfactory`/`na`.
- **Rate limiting:** 30 requests/hour per token/user via `CacheService`.
- **Concurrency:** `LockService` script lock around state transitions.
- **Sheet protection:** admin sheets can be protected so only `ADMIN_EMAIL` can edit.
- **CSP:** an optional nonce attribute on the inline script; disabled by default (`SECURITY.CSP_NONCE_ENABLED`).

---

## 10. Sheets Menu (`SheetAdmin.gs`)

Opening the spreadsheet adds a **TA Evaluation System** menu:

- **Initialize Sheets** — creates/updates all four sheets and headers.
- **Launch Selected Evaluation(s)** — launches all `NOT_STARTED` rows (tokens, status, invites).
- **Send Reminders / Check Escalations Now** — runs the reminder/escalation check manually.
- **Generate Sample Data** — appends 3 sample `NOT_STARTED` rows.
- **View Audit Log (Last 50)** / **View Error Logs (Last 50)** / **View Dead Letter Queue** — modal viewers.
- **Process Dead Letter Queue Now** — runs DLQ retries manually.
- **Run Health Check** — renders the health check as a dialog.
- **Check Alert Thresholds** — runs alerting and shows any triggered alerts.
- **Protect Admin Sheets** — applies sheet-level edit protections.
- **Regenerate Token for Evaluation** — prompts for an `Evaluation_ID` and issues a fresh token.
- **Fix Corrupted Task Keys** — repairs `taskStatus` keys in `Data_Payload` that were mangled by HTML entity encoding (`&apos;`, `&#x2F;`, etc.).
- **Create/Refresh All Triggers** — installs the daily reminder, 10-minute DLQ, and hourly alerting triggers.

---

## 11. Configuration (`Config.gs`)

Key settings (all in the `CONFIG` object):

| Setting | Default / Value |
|---|---|
| `SPREADSHEET_ID` | Master spreadsheet ID |
| `TEMPLATE_DOC_ID` | Template doc (legacy; only health-checked) |
| `ARCHIVE_FOLDER_ID` | Drive folder where final PDFs are saved |
| `ADMIN_EMAIL` | Coordinator receiving escalations/alerts |
| `APP_URL` | Web App deployment URL (used to build email links) |
| `REMINDER_INTERVAL_DAYS` / `MAX_REMINDERS` | `3` / `2` |
| `TOKEN_TTL_DAYS` | `30` |
| `LOG_LEVEL` / `LOG_RETENTION_DAYS` | `INFO` / `90` |
| `DEAD_LETTER_MAX_RETRIES` / `DEAD_LETTER_BASE_DELAY_MS` | `3` / `60000` |
| `SECURITY.RATE_LIMIT_MAX_REQUESTS` | `30` per hour |
| `SECURITY.TOKEN_ROTATION_ON_STAGE_CHANGE` | `true` |
| `SECURITY.CSP_NONCE_ENABLED` | `false` |
| `SECURITY.SHEET_PROTECTION_ENABLED` | `true` |
| `PDF.MAX_RETRIES` / `PDF.BASE_RETRY_DELAY_MS` / `PDF.MAX_FILE_SIZE_MB` | `3` / `5000` / `10` |
| `ALERT_THRESHOLDS` | PDF > 5/hr, email > 10/hr, triggers > 3/day, quota > 80% |

---

## 12. Setup & Deployment

1. **Create a spreadsheet** for evaluations and paste its ID into `SPREADSHEET_ID` in `Config.gs`.
2. Create the archive Drive folder and set `ARCHIVE_FOLDER_ID`; set `ADMIN_EMAIL` and `APP_URL`.
3. Push the project to Apps Script with clasp (`clasp push`).
4. In the spreadsheet, run **Initialize Sheets**, then **Generate Sample Data**, then **Launch Selected Evaluation(s)** to smoke-test the flow.
5. Deploy as a **Web App** (execute as the accessing user, access restricted to the UW domain) and update `APP_URL` to the deployment URL.
6. Run **Create/Refresh All Triggers** to install the daily reminder, DLQ, and alerting triggers.
7. (Optional) Run **Protect Admin Sheets** to restrict editing to the admin.

---

## 13. Logging & Audit

- `AuditLog.gs` records every lifecycle event (`logEvent`) — launch, each submit, PDF success/failure, reminders, escalations, and token rotations — with actor, old/new status, and JSON details.
- `Logs.gs` writes leveled, structured logs (`logInfo`/`logWarn`/`logError`/`logFatal`) with function name, context JSON, actor, evaluation ID, and duration. Helpers `withLogging`/`withLoggingAsync` wrap function entry/exit. `pruneOldLogs()` removes entries older than the retention window.
- `Alerting.gs` surfaces failures to the admin by email and in the health check.
