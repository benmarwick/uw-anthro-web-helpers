function C() { return getConfig(); }
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('TA Evaluation System')
    .addItem('Initialize Sheets', 'initializeSheets')
    .addSeparator()
    .addItem('Launch Selected Evaluation(s)', 'launchEvaluations')
    .addItem('Send Reminders / Check Escalations Now', 'runRemindersAndEscalations')
    .addSeparator()
    .addItem('Generate Sample Data', 'generateSampleData')
    .addSeparator()
    .addItem('View Audit Log (Last 50)', 'viewRecentAuditLog')
    .addItem('View Error Logs (Last 50)', 'viewRecentErrorLogs')
    .addSeparator()
    .addItem('View Dead Letter Queue', 'viewDeadLetterQueue')
    .addItem('Process Dead Letter Queue Now', 'processDeadLetterQueueNow')
    .addSeparator()
    .addItem('Run Health Check', 'runHealthCheckNow')
    .addItem('Check Alert Thresholds', 'checkAlertThresholdsNow')
    .addSeparator()
    .addItem('Protect Admin Sheets', 'protectAdminSheetsNow')
    .addItem('Regenerate Token for Evaluation', 'regenerateTokenPrompt')
    .addItem('Fix Corrupted Task Keys', 'fixCorruptedTaskKeys')
    .addSeparator()
    .addItem('Create/Refresh All Triggers', 'createAllTriggers')
    .addToUi();
}

function initializeSheets() {
  ensureSchema();
  ensureAuditLogSheet();
  ensureLogsSheet();
  ensureDeadLetterSheet();
  logInfo('SheetAdmin.initializeSheets', 'All sheets initialized successfully.');
}

function ensureSchema() {
  const sheet = getMasterSheet();
  const expectedHeaders = [
    'Evaluation_ID',
    'Course_Code',
    'Term',
    'Prof_Name',
    'Prof_Email',
    'TA_Name',
    'TA_Email',
    'Status',
    'Created_Date',
    'Completed_Date',
    'Last_Action_Date',
    'Reminder_Count',
    'Secure_Token',
    'Token_Expiry',
    'Data_Payload',
    'Final_PDF_Link',
    'Final_PDF_File_ID',
    'Payload_Version'
  ];

  const existingHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  const needsUpdate = expectedHeaders.some((h, i) => existingHeaders[i] !== h);

  if (needsUpdate || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, expectedHeaders.length, 150);
    Logger.log('Schema updated/created for TA_Evaluations');
  }
  return sheet;
}

function launchEvaluations() {
  const sheet = ensureSchema();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    try { SpreadsheetApp.getUi().alert('No data rows found.'); } catch (e) {}
    return;
  }

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const now = new Date();
  const tokenExpiry = new Date(now.getTime() + C().TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  let launched = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const status = row[col.Status];

    if (status === C().STATUSES.NOT_STARTED) {
      const evaluationId = row[col.Evaluation_ID];
      const token = Utilities.getUuid();

      sheet.getRange(r + 1, col.Secure_Token + 1).setValue(token);
      sheet.getRange(r + 1, col.Token_Expiry + 1).setValue(tokenExpiry.toISOString());
      sheet.getRange(r + 1, col.Status + 1).setValue(C().STATUSES.PROF_EVAL_PENDING);
      sheet.getRange(r + 1, col.Created_Date + 1).setValue(now.toISOString());
      sheet.getRange(r + 1, col.Last_Action_Date + 1).setValue(now.toISOString());
      sheet.getRange(r + 1, col.Reminder_Count + 1).setValue(0);
      sheet.getRange(r + 1, col.Payload_Version + 1).setValue(C().PAYLOAD_VERSION);

      logEvent({
        action: C().ACTIONS.LAUNCH,
        evaluationId,
        oldStatus: C().STATUSES.NOT_STARTED,
        newStatus: C().STATUSES.PROF_EVAL_PENDING,
        details: {}
      });

      sendProfEvaluationInvite({
        evaluationId,
        token,
        courseCode: row[col.Course_Code],
        term: row[col.Term],
        profName: row[col.Prof_Name],
        profEmail: row[col.Prof_Email],
        taName: row[col.TA_Name],
        taEmail: row[col.TA_Email]
      });

      launched++;
    }
  }

  SpreadsheetApp.flush();
  try { SpreadsheetApp.getUi().alert(`Launched ${launched} evaluation(s).`); } catch (e) {}
  return launched;
}

function generateSampleData() {
  const sheet = ensureSchema();
  const base = 'bmarwick+';
  const sampleRows = [
    ['EVAL-1001', 'CS 101', 'Autumn 2025', 'Dr. Smith', base + 'prof-1001@uw.edu', 'Alex Johnson', base + 'ta-1001@uw.edu', C().STATUSES.NOT_STARTED, '', '', '', 0, '', '', '{}', '', '', C().PAYLOAD_VERSION],
    ['EVAL-1002', 'CS 102', 'Autumn 2025', 'Dr. Lee', base + 'prof-1002@uw.edu', 'Sam Chen', base + 'ta-1002@uw.edu', C().STATUSES.NOT_STARTED, '', '', '', 0, '', '', '{}', '', '', C().PAYLOAD_VERSION],
    ['EVAL-1003', 'PHYS 121', 'Autumn 2025', 'Prof. Garcia', base + 'prof-1003@uw.edu', 'Jordan Kim', base + 'ta-1003@uw.edu', C().STATUSES.NOT_STARTED, '', '', '', 0, '', '', '{}', '', '', C().PAYLOAD_VERSION]
  ];

  sheet.getRange(sheet.getLastRow() + 1, 1, sampleRows.length, sampleRows[0].length).setValues(sampleRows);
  SpreadsheetApp.flush();
  try { SpreadsheetApp.getUi().alert('Sample data generated.'); } catch (e) {}
}

function viewRecentAuditLog() {
  const entries = getRecentAuditLog(50);
  if (entries.length === 0) {
    try { SpreadsheetApp.getUi().alert('Audit log is empty.'); } catch (e) {}
    return;
  }

  const html = entries.map(e => `<tr><td>${e.Timestamp}</td><td>${e.Actor_Email}</td><td>${e.Action}</td><td>${e.Evaluation_ID}</td><td>${e.Old_Status}</td><td>${e.New_Status}</td><td>${e.Details}</td><td>${e.Client_IP}</td></tr>`).join('');
  const output = HtmlService.createHtmlOutput(`
    <style>
      table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; }
    </style>
    <table>
      <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Eval ID</th><th>Old Status</th><th>New Status</th><th>Details</th><th>Client IP</th></tr>
      ${html}
    </table>
  `).setWidth(1000).setHeight(600);
  try { SpreadsheetApp.getUi().showModalDialog(output, 'Recent Audit Log (Last 50)'); } catch (e) {}
}

function runRemindersAndEscalations() {
  checkRemindersAndEscalations();
  try { SpreadsheetApp.getUi().alert('Reminders and escalations check completed.'); } catch (e) {}
}

function viewRecentErrorLogs() {
  const entries = getRecentErrors(50);
  if (entries.length === 0) {
    try { SpreadsheetApp.getUi().alert('No error logs found.'); } catch (e) {}
    return;
  }

  const html = entries.map(e => `<tr><td>${e.Timestamp}</td><td>${e.Level}</td><td>${e.Function}</td><td>${e.Message}</td><td>${e.Context_JSON}</td><td>${e.Actor_Email}</td><td>${e.Evaluation_ID}</td><td>${e.Duration_MS}</td></tr>`).join('');
  const output = HtmlService.createHtmlOutput(`
    <style>
      table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
      th { background: #f5f5f5; }
      td:nth-child(4) { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    </style>
    <table>
      <tr><th>Timestamp</th><th>Level</th><th>Function</th><th>Message</th><th>Context</th><th>Actor</th><th>Eval ID</th><th>Duration (ms)</th></tr>
      ${html}
    </table>
  `).setWidth(1200).setHeight(600);
  try { SpreadsheetApp.getUi().showModalDialog(output, 'Recent Error Logs (Last 50)'); } catch (e) {}
}

function viewDeadLetterQueue() {
  const stats = getDeadLetterStats();
  const sheet = getDeadLetterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    try { SpreadsheetApp.getUi().alert('Dead letter queue is empty.'); } catch (e) {}
    return;
  }

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const rows = data.slice(1).slice(-50).reverse();
  const html = rows.map(row => `<tr><td>${row[col.ID]}</td><td>${row[col.Created_Timestamp]}</td><td>${row[col.Action]}</td><td>${row[col.Status]}</td><td>${row[col.Retry_Count]}/${row[col.Max_Retries]}</td><td>${row[col.Next_Retry_Timestamp]}</td><td>${row[col.Error_Message]}</td><td>${row[col.Last_Attempt_Error]}</td></tr>`).join('');

  const output = HtmlService.createHtmlOutput(`
    <div style="padding:16px;font-family:sans-serif;">
      <h3>Dead Letter Queue Stats</h3>
      <p>Pending: ${stats.pending} | Success: ${stats.success} | Max Retries Exceeded: ${stats.maxRetries} | Total: ${stats.total}</p>
      <h3>Recent Items (Last 50)</h3>
      <table style="border-collapse:collapse;width:100%;font-size:11px;">
        <tr style="background:#f5f5f5;"><th style="border:1px solid #ddd;padding:6px;">ID</th><th style="border:1px solid #ddd;padding:6px;">Created</th><th style="border:1px solid #ddd;padding:6px;">Action</th><th style="border:1px solid #ddd;padding:6px;">Status</th><th style="border:1px solid #ddd;padding:6px;">Retries</th><th style="border:1px solid #ddd;padding:6px;">Next Retry</th><th style="border:1px solid #ddd;padding:6px;">Error</th><th style="border:1px solid #ddd;padding:6px;">Last Error</th></tr>
        ${html}
      </table>
    </div>
  `).setWidth(1200).setHeight(600);
  try { SpreadsheetApp.getUi().showModalDialog(output, 'Dead Letter Queue'); } catch (e) {}
}

function processDeadLetterQueueNow() {
  const result = processDeadLetterQueue();
  try { SpreadsheetApp.getUi().alert(`DLQ Processing Complete\nProcessed: ${result.processed}\nSucceeded: ${result.succeeded}\nFailed: ${result.failed}`); } catch (e) {}
  return result;
}

function runHealthCheckNow() {
  const health = runHealthCheck();
  const output = HtmlService.createHtmlOutput(`
    <div style="padding:16px;font-family:sans-serif;font-size:13px;">
      <h3>Health Check Result</h3>
      <p><strong>Status:</strong> <span style="color:${health.status === 'healthy' ? '#28A745' : '#FD7E14'};font-weight:bold;">${health.status.toUpperCase()}</span></p>
      <p><strong>Timestamp:</strong> ${health.timestamp}</p>
      <p><strong>Total Evaluations:</strong> ${health.evaluations.total}</p>
      <p><strong>By Status:</strong> ${JSON.stringify(health.evaluations.byStatus, null, 2)}</p>
      <p><strong>DLQ:</strong> ${JSON.stringify(health.deadLetterQueue)}</p>
      <p><strong>Triggers Healthy:</strong> ${health.triggers.healthy ? 'Yes' : 'No (Missing: ' + health.triggers.missing.join(', ') + ')'}</p>
      <p><strong>Quota Max Usage:</strong> ${health.quota.maxUsagePct}%</p>
      <p><strong>Checks:</strong> ${JSON.stringify(health.checks, null, 2)}</p>
      ${health.warnings ? `<p style="color:#FD7E14;"><strong>Warnings:</strong> ${health.warnings.join('; ')}</p>` : ''}
      ${health.degradedChecks ? `<p style="color:#FD7E14;"><strong>Degraded Checks:</strong> ${health.degradedChecks.join(', ')}</p>` : ''}
    </div>
  `).setWidth(700).setHeight(600);
  try { SpreadsheetApp.getUi().showModalDialog(output, 'Health Check'); } catch (e) {}
}

function checkAlertThresholdsNow() {
  const alerts = checkAlertThresholds();
  if (alerts.length === 0) {
    try { SpreadsheetApp.getUi().alert('No alerts triggered. All systems nominal.'); } catch (e) {}
    return;
  }

  const html = alerts.map(a => `<tr><td>${a.type}</td><td style="color:${a.severity === 'CRITICAL' ? '#DC3545' : (a.severity === 'HIGH' ? '#FD7E14' : '#FFC107')}">${a.severity}</td><td>${a.message}</td></tr>`).join('');
  const output = HtmlService.createHtmlOutput(`
    <div style="padding:16px;font-family:sans-serif;">
      <h3>Alerts Triggered (${alerts.length})</h3>
      <table style="border-collapse:collapse;width:100%;font-size:12px;">
        <tr style="background:#f5f5f5;"><th style="border:1px solid #ddd;padding:8px;">Type</th><th style="border:1px solid #ddd;padding:8px;">Severity</th><th style="border:1px solid #ddd;padding:8px;">Message</th></tr>
        ${html}
      </table>
    </div>
  `).setWidth(900).setHeight(400);
  try { SpreadsheetApp.getUi().showModalDialog(output, 'Alert Thresholds Check'); } catch (e) {}
}

function createAllTriggers() {
  createDailyTrigger();
  createDeadLetterTrigger();
  createAlertingTrigger();
  logInfo('SheetAdmin.createAllTriggers', 'All triggers created/refreshed');
}

function protectAdminSheetsNow() {
  protectAdminSheets();
  try { SpreadsheetApp.getUi().alert('Admin sheet protection applied.'); } catch (e) {}
}

function regenerateTokenPrompt() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('Regenerate Token', 'Enter Evaluation ID:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) return;

    const evaluationId = response.getResponseText().trim();
    if (!evaluationId) {
      ui.alert('Evaluation ID is required.');
      return;
    }

    const rotated = rotateToken(evaluationId);
    if (rotated) {
      ui.alert(`Token regenerated for ${evaluationId}\nNew Token: ${rotated.token}\nExpires: ${rotated.expiry}`);
    } else {
      ui.alert('Evaluation not found: ' + evaluationId);
    }
  } catch (e) {}
}

function testSendEmail() {
  try {
    GmailApp.sendEmail('bmarwick@uw.edu', 'TA Evaluation Test', 'This is a test email from the TA Evaluation System at ' + new Date().toISOString());
    logInfo('testSendEmail', 'Test email sent successfully');
    return 'OK: email sent';
  } catch (err) {
    logError('testSendEmail', err.message, { error: err.message, stack: err.stack });
    return 'FAIL: ' + err.message;
  }
}

function fixCorruptedTaskKeys() {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 'No data rows.';

  var headers = data[0];
  var col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  var fixed = 0;
  for (var r = 1; r < data.length; r++) {
    var raw = data[r][col.Data_Payload];
    if (!raw) continue;
    var payload;
    try { payload = JSON.parse(raw); } catch(e) { continue; }
    if (!payload || !payload.taskStatus) continue;

    var changed = false;
    var newTaskStatus = {};
    var keys = Object.keys(payload.taskStatus);
    for (var k = 0; k < keys.length; k++) {
      var oldKey = keys[k];
      var newKey = oldKey
        .replace(/&apos;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ');
      newTaskStatus[newKey] = payload.taskStatus[oldKey];
      if (newKey !== oldKey) changed = true;
    }

    if (changed) {
      payload.taskStatus = newTaskStatus;
      sheet.getRange(r + 1, col.Data_Payload + 1).setValue(JSON.stringify(payload));
      fixed++;
    }
  }

  SpreadsheetApp.flush();
  var msg = 'Fixed ' + fixed + ' row(s) with corrupted taskStatus keys.';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) {}
  return msg;
}