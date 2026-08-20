function C() { return getConfig(); }
const DLQ_ACTIONS = {
  SEND_EMAIL: 'SEND_EMAIL',
  GENERATE_PDF: 'GENERATE_PDF',
  SEND_REMINDER: 'SEND_REMINDER',
  SEND_ESCALATION: 'SEND_ESCALATION',
  SEND_COMPLETION: 'SEND_COMPLETION'
};

function ensureDeadLetterSheet() {
  const sheet = getDeadLetterSheet();
  const headers = [
    'ID',
    'Created_Timestamp',
    'Action',
    'Payload_JSON',
    'Error_Message',
    'Error_Stack',
    'Retry_Count',
    'Max_Retries',
    'Next_Retry_Timestamp',
    'Status',
    'Last_Attempt_Timestamp',
    'Last_Attempt_Error'
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

function enqueueDeadLetter(action, payload, error, maxRetries = C().DEAD_LETTER_MAX_RETRIES) {
  const sheet = ensureDeadLetterSheet();
  const id = 'DLQ_' + Utilities.getUuid();
  const now = new Date();
  const delayMs = C().DEAD_LETTER_BASE_DELAY_MS;
  const nextRetry = new Date(now.getTime() + delayMs);

  const row = [
    id,
    now.toISOString(),
    action,
    JSON.stringify(payload),
    error.message || String(error),
    error.stack || '',
    0,
    maxRetries,
    nextRetry.toISOString(),
    'PENDING',
    '',
    ''
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();

  logWarn('DeadLetterQueue.enqueueDeadLetter', `Enqueued failed ${action}`, { id, action, error: error.message, maxRetries }, { evaluationId: payload.evaluationId });
  return id;
}

function processDeadLetterQueue() {
  const sheet = ensureDeadLetterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { processed: 0, succeeded: 0, failed: 0 };

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const now = new Date();
  let processed = 0, succeeded = 0, failed = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const status = row[col.Status];
    const retryCount = row[col.Retry_Count];
    const maxRetries = row[col.Max_Retries];
    const nextRetryStr = row[col.Next_Retry_Timestamp];

    if (status !== 'PENDING') continue;
    if (retryCount >= maxRetries) {
      updateDeadLetterStatus(r + 1, col, 'MAX_RETRIES_EXCEEDED', now, 'Max retries exceeded');
      failed++;
      continue;
    }

    const nextRetry = new Date(nextRetryStr);
    if (nextRetry > now) continue;

    processed++;
    const action = row[col.Action];
    const payload = JSON.parse(row[col.Payload_JSON] || '{}');

    try {
      let result;
      switch (action) {
        case DLQ_ACTIONS.SEND_EMAIL:
          result = executeEmailRetry(payload);
          break;
        case DLQ_ACTIONS.GENERATE_PDF:
          result = executePdfRetry(payload);
          break;
        case DLQ_ACTIONS.SEND_REMINDER:
          result = executeReminderRetry(payload);
          break;
        case DLQ_ACTIONS.SEND_ESCALATION:
          result = executeEscalationRetry(payload);
          break;
        case DLQ_ACTIONS.SEND_COMPLETION:
          result = executeCompletionRetry(payload);
          break;
        default:
          throw new Error('Unknown DLQ action: ' + action);
      }

      updateDeadLetterStatus(r + 1, col, 'SUCCESS', now, '');
      succeeded++;
      logInfo('DeadLetterQueue.processDeadLetterQueue', `Retry succeeded for ${action}`, { id: row[col.ID], action }, { evaluationId: payload.evaluationId });
    } catch (err) {
      const newRetryCount = retryCount + 1;
      const nextRetry = new Date(now.getTime() + C().DEAD_LETTER_BASE_DELAY_MS * Math.pow(2, newRetryCount));
      const newStatus = newRetryCount >= maxRetries ? 'MAX_RETRIES_EXCEEDED' : 'PENDING';

      sheet.getRange(r + 1, col.Retry_Count + 1).setValue(newRetryCount);
      sheet.getRange(r + 1, col.Next_Retry_Timestamp + 1).setValue(nextRetry.toISOString());
      sheet.getRange(r + 1, col.Last_Attempt_Timestamp + 1).setValue(now.toISOString());
      sheet.getRange(r + 1, col.Last_Attempt_Error + 1).setValue(err.message);
      sheet.getRange(r + 1, col.Status + 1).setValue(newStatus);

      failed++;
      logError('DeadLetterQueue.processDeadLetterQueue', `Retry failed for ${action}`, { id: row[col.ID], action, error: err.message, retryCount: newRetryCount, nextRetry: nextRetry.toISOString() }, { evaluationId: payload.evaluationId });

      if (newStatus === 'MAX_RETRIES_EXCEEDED') {
        sendAdminAlert({
          subject: 'Dead Letter Queue: Max Retries Exceeded',
          body: `Action: ${action}\nID: ${row[col.ID]}\nPayload: ${row[col.Payload_JSON]}\nError: ${err.message}\nStack: ${err.stack}\nRetries: ${newRetryCount}`
        });
      }
    }
  }

  SpreadsheetApp.flush();
  logInfo('DeadLetterQueue.processDeadLetterQueue', 'DLQ processing complete', { processed, succeeded, failed });
  return { processed, succeeded, failed };
}

function updateDeadLetterStatus(rowNum, col, status, timestamp, error) {
  const sheet = getDeadLetterSheet();
  sheet.getRange(rowNum, col.Status + 1).setValue(status);
  sheet.getRange(rowNum, col.Last_Attempt_Timestamp + 1).setValue(timestamp.toISOString());
  if (error) sheet.getRange(rowNum, col.Last_Attempt_Error + 1).setValue(error);
}

function executeEmailRetry(payload) {
  const params = payload.emailParams || payload;
  const { to, subject, htmlBody, body, attachments, name } = params;
  const options = {};
  if (htmlBody) options.htmlBody = htmlBody;
  if (name) options.name = name;
  if (attachments) options.attachments = attachments;
  GmailApp.sendEmail(to, subject, body || '', options);
}

function executePdfRetry(payload) {
  return generateAndDistributePdf(payload, { enqueue: false });
}

function executeReminderRetry(payload) {
  const params = payload.emailParams || payload;
  const { to, subject, htmlBody, body, name } = params;
  const options = {};
  if (htmlBody) options.htmlBody = htmlBody;
  if (name) options.name = name;
  GmailApp.sendEmail(to, subject, body || '', options);
}

function executeEscalationRetry(payload) {
  const params = payload.emailParams || payload;
  const { to, subject, htmlBody, body, name } = params;
  const options = {};
  if (htmlBody) options.htmlBody = htmlBody;
  if (name) options.name = name;
  GmailApp.sendEmail(to, subject, body || '', options);
}

function executeCompletionRetry(payload) {
  const { profEmail, taEmail, subject, htmlBody, row, fileId } = payload;
  let pdfBlob = null;
  if (fileId) {
    try {
      pdfBlob = DriveApp.getFileById(fileId).getBlob().getAs('application/pdf');
    } catch (e) {
      pdfBlob = null;
    }
  }
  if (pdfBlob) {
    GmailApp.sendEmail([profEmail, taEmail].join(','), subject, '', { htmlBody, attachments: [pdfBlob], name: 'TA Evaluation System' });
  } else {
    generateAndDistributePdf(row, { enqueue: false });
  }
}

function getDeadLetterStats() {
  const sheet = ensureDeadLetterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { pending: 0, success: 0, maxRetries: 0, total: 0 };

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  let pending = 0, success = 0, maxRetries = 0;
  for (let r = 1; r < data.length; r++) {
    const status = data[r][col.Status];
    if (status === 'PENDING') pending++;
    else if (status === 'SUCCESS') success++;
    else if (status === 'MAX_RETRIES_EXCEEDED') maxRetries++;
  }
  return { pending, success, maxRetries, total: data.length - 1 };
}

function requeueDeadLetter(id) {
  const sheet = ensureDeadLetterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  for (let r = 1; r < data.length; r++) {
    if (data[r][col.ID] === id) {
      const now = new Date();
      sheet.getRange(r + 1, col.Status + 1).setValue('PENDING');
      sheet.getRange(r + 1, col.Retry_Count + 1).setValue(0);
      sheet.getRange(r + 1, col.Next_Retry_Timestamp + 1).setValue(now.toISOString());
      sheet.getRange(r + 1, col.Last_Attempt_Timestamp + 1).setValue('');
      sheet.getRange(r + 1, col.Last_Attempt_Error + 1).setValue('');
      SpreadsheetApp.flush();
      logInfo('DeadLetterQueue.requeueDeadLetter', `Requeued DLQ item`, { id });
      return true;
    }
  }
  return false;
}

function createDeadLetterTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processDeadLetterQueue') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('processDeadLetterQueue')
    .timeBased()
    .everyMinutes(10)
    .create();
}