/* ============================================================
   SheetAdmin.gs: the spreadsheet menu (annual review plan §9.1; course-feedback plan §7).
   Only the Graduate Student Administrator runs these. The GPC works through the web app.
   ============================================================ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Graduate review')
    .addItem('Initialize', 'menuInitialize')
    .addSeparator()
    .addItem('Import Roster (opens the Roster page)', 'menuOpenRoster')
    .addItem('Launch Course Feedback…', 'menuLaunchCourseFeedback')
    .addItem('Review and Release (opens the page)', 'menuOpenRelease')
    .addItem('Build Feedback Records…', 'menuBuildRecords')
    .addSeparator()
    .addItem('Launch Annual Cycle…', 'menuLaunchCycle')
    .addItem('Launch MA Check-ins…', 'menuLaunchMa')
    .addItem('Program stage (opens the page)', 'menuOpenProgram')
    .addItem('Compute Metrics', 'menuComputeMetrics')
    .addSeparator()
    .addItem('Create Triggers', 'menuCreateTriggers')
    .addItem('Run Daily Tasks Now', 'menuRunDaily')
    .addItem('Process Dead Letter Queue Now', 'menuProcessDlq')
    .addToUi();
}

function menuInitialize() {
  assertAdminOrGpc_();
  ensureSchema_();
  ensureAuditLogSheet_();
  ensureLogsSheet_();
  ensureDeadLetterSheet_();
  SpreadsheetApp.getUi().alert('Sheets are ready. Next: fill in Config.gs, deploy the web app, and run "Create Triggers".');
}

function openLink_(title, url) {
  const html = HtmlService.createHtmlOutput('<p style="font-family:Arial,sans-serif"><a href="' + url + '" target="_blank">Open ' + title + '</a></p>').setWidth(320).setHeight(90);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

function menuOpenRoster() { assertAdminOrGpc_(); openLink_('the Roster page', appUrl_({ view: 'roster' })); }
function menuOpenRelease() { assertAdminOrGpc_(); openLink_('Review and Release', appUrl_({ view: 'release' })); }
function menuOpenProgram() { assertAdminOrGpc_(); openLink_('the program stage', appUrl_({ view: 'program' })); }

function promptValue_(title, prompt, re) {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(title, prompt, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  const v = r.getResponseText().trim().toUpperCase();
  if (re && !re.test(v)) { ui.alert('That does not look right: ' + v); return null; }
  return v;
}

function menuLaunchCourseFeedback() {
  const actor = assertAdminOrGpc_();
  const q = promptValue_('Launch Course Feedback', 'Quarter (for example WIN2027):', /^(AUT|WIN|SPR|SUM)\d{4}$/);
  if (!q) return;
  const n = launchCourseFeedback_(q, actor);
  SpreadsheetApp.getUi().alert(n + ' instructor page(s) sent for ' + quarterLabel_(q) + '.');
}

function menuBuildRecords() {
  const actor = assertAdminOrGpc_();
  const y = promptValue_('Build Feedback Records', 'Spring year of the record (for example 2027):', /^\d{4}$/);
  if (!y) return;
  const n = buildFeedbackRecords_(Number(y), actor);
  SpreadsheetApp.getUi().alert(n + ' draft record(s) assembled for ' + recordWindow_(Number(y)).label + '. The GPC adds any synthesis and releases them on the Review and Release page.');
}

function menuLaunchCycle() {
  const actor = assertAdminOrGpc_();
  const y = promptValue_('Launch Annual Cycle', 'Cycle year (for example 2027):', /^\d{4}$/);
  if (!y) return;
  const n = launchAnnualCycle_(Number(y), actor);
  SpreadsheetApp.getUi().alert(n + ' annual review(s) launched for ' + y + '.');
}

function menuLaunchMa() {
  const actor = assertAdminOrGpc_();
  const q = promptValue_('Launch MA Check-ins', 'Quarter (for example WIN2027). The daily task also does this on the Monday of finals week:', /^(AUT|WIN|SPR|SUM)\d{4}$/);
  if (!q) return;
  SpreadsheetApp.getUi().alert(launchMaCheckins_(q, actor) + ' MA check-in(s) launched for ' + quarterLabel_(q) + '.');
}

function menuComputeMetrics() { assertAdminOrGpc_(); SpreadsheetApp.getUi().alert(computeMetrics_() + ' metric rows written to the Metrics sheet.'); }
/* Triggers run as, and send email from, the account that creates them, so only the GPC (the owner) creates them. */
function menuCreateTriggers() {
  if (!isGpc_(activeEmail_())) throw new Error('Only the GPC, who owns the system, can create the triggers: they run as, and send email from, whoever creates them.');
  createTriggers_(); SpreadsheetApp.getUi().alert('Daily and hourly triggers created.');
}
function menuRunDaily() { assertAdminOrGpc_(); dailyRun({}); SpreadsheetApp.getUi().alert('Daily tasks run. See the Logs sheet.'); }
function menuProcessDlq() { assertAdminOrGpc_(); processDeadLetterQueue_(); SpreadsheetApp.getUi().alert('Dead letter queue processed.'); }
