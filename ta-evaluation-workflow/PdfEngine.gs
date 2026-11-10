function C_() { return getConfig_(); }

var UW_PURPLE = '#4B2E83';
var UW_GOLD = '#B7A57A';
var UW_GRAY = '#58595B';
var UW_LIGHT_BG = '#F7F5FA';

/* ---------- Background PDF generation ---------- */

/* One-off trigger set by the final sign-off. It runs only for a real trigger event or the owner. */
function generatePendingPdfs(e) {
  assertTriggerOrOwner_(e, 'generatePendingPdfs');
  // Remove this one-off trigger (and any duplicates) so they do not pile up.
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'generatePendingPdfs') ScriptApp.deleteTrigger(t);
  });
  return generatePendingPdfs_();
}

/* Asks Apps Script to run generatePendingPdfs in about a minute. If the trigger cannot be
   created, the 10-minute dead-letter trigger picks the row up instead. */
function schedulePdfRun_() {
  try {
    const pending = ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === 'generatePendingPdfs'; });
    if (!pending) ScriptApp.newTrigger('generatePendingPdfs').timeBased().after(60 * 1000).create();
  } catch (err) {
    logWarn_('PdfEngine.schedulePdfRun', 'Could not schedule PDF trigger; the 10-minute trigger will build the PDF', { error: err.message });
  }
}

/* Builds the PDF for every row in PDF_GENERATING. Each row is claimed in the script cache first,
   so two runs (the one-off trigger and the 10-minute trigger) never build the same PDF twice. */
function generatePendingPdfs_() {
  const cache = CacheService.getScriptCache();
  const claimed = [];
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { processed: 0, busy: true };
  try {
    const data = getMasterSheet_().getDataRange().getValues();
    if (data.length <= 1) return { processed: 0 };
    const col = {};
    data[0].forEach(function(h, i) { col[h] = i; });
    MASTER_COLS_ = col;
    for (let r = 1; r < data.length; r++) {
      const v = data[r];
      if (v[col.Status] !== C_().STATUSES.PDF_GENERATING) continue;
      const key = 'pdf_claim_' + v[col.Evaluation_ID];
      if (cache.get(key)) continue;
      cache.put(key, '1', 900);
      claimed.push({
        rowNum: r + 1,
        evaluationId: v[col.Evaluation_ID],
        courseCode: v[col.Course_Code],
        term: v[col.Term],
        profName: v[col.Prof_Name],
        profEmail: v[col.Prof_Email],
        taName: v[col.TA_Name],
        taEmail: v[col.TA_Email],
        status: v[col.Status],
        dataPayload: parsePayload_(v[col.Data_Payload]),
        finalPdfLink: v[col.Final_PDF_Link],
        finalPdfFileId: v[col.Final_PDF_File_ID],
        secureToken: v[col.Secure_Token],
        tokenExpiry: v[col.Token_Expiry]
      });
    }
  } finally {
    lock.releaseLock();
  }
  let succeeded = 0;
  claimed.forEach(function(row) {
    try {
      const result = generateAndDistributePdf_(row);
      if (result && result.success) succeeded++;
    } catch (err) {
      logError_('PdfEngine.generatePendingPdfs', err.message, { evaluationId: row.evaluationId, stack: err.stack });
    } finally {
      cache.remove('pdf_claim_' + row.evaluationId);
    }
  });
  return { processed: claimed.length, succeeded: succeeded };
}

function generateAndDistributePdf_(row, opts) {
  opts = opts || {};
  var evaluationId = row.evaluationId;
  var current = findRowByEvaluationId_(evaluationId);
  if (!current) throw new Error('Evaluation not found: ' + evaluationId);
  row = current;
  if (!(row.dataPayload && row.dataPayload.profSignatureName)) {
    throw new Error('Evaluation ' + evaluationId + ' has no final sign-off; no PDF built.');
  }

  if (row.finalPdfLink && row.finalPdfFileId) {
    logEvent_({
      action: C_().ACTIONS.PDF_GENERATED,
      evaluationId: evaluationId,
      oldStatus: C_().STATUSES.PDF_GENERATING,
      newStatus: C_().STATUSES.COMPLETED,
      details: { idempotent: true, fileId: row.finalPdfFileId },
      actorEmail: 'SYSTEM'
    });
    return { success: true, idempotent: true, fileId: row.finalPdfFileId, fileUrl: row.finalPdfLink };
  }

  var maxRetries = C_().PDF.MAX_RETRIES;
  var baseDelay = C_().PDF.BASE_RETRY_DELAY_MS;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return attemptPdfGeneration_(row, attempt);
    } catch (err) {
      var isRetryable = isRetryableError_(err);
      var isLastAttempt = attempt === maxRetries;

      logWarn_('PdfEngine.generateAndDistributePdf', 'Attempt ' + (attempt + 1) + ' failed for ' + evaluationId, {
        evaluationId: evaluationId, attempt: attempt + 1, maxRetries: maxRetries,
        error: err.message, isRetryable: isRetryable, isLastAttempt: isLastAttempt
      });

      if (!isRetryable || isLastAttempt) {
        var failure = handlePdfFailure_(row, err, attempt + 1, isRetryable, opts);
        return { success: false, error: err.message, attempts: attempt + 1, status: failure.newStatus };
      }

      var delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      logInfo_('PdfEngine.generateAndDistributePdf', 'Retrying in ' + Math.round(delay) + 'ms', { evaluationId: evaluationId, delay: delay });
      Utilities.sleep(delay);
    }
  }
}

function handlePdfFailure_(row, err, attempts, isRetryable, opts) {
  var oldStatus = row.status || C_().STATUSES.PDF_GENERATING;
  var newStatus = C_().STATUSES.PROF_SIGN_PENDING;
  var evaluationId = row.evaluationId;

  updateRowStatus_(evaluationId, newStatus);

  logEvent_({
    action: C_().ACTIONS.PDF_FAILED, evaluationId: evaluationId,
    oldStatus: oldStatus, newStatus: newStatus,
    details: { error: err.message, stack: err.stack, attempts: attempts, retryable: isRetryable },
    actorEmail: 'SYSTEM'
  });

  logError_('PdfEngine.handlePdfFailure', 'PDF generation failed for ' + evaluationId, {
    evaluationId: evaluationId, error: err.message, stack: err.stack,
    attempts: attempts, retryable: isRetryable, revertedTo: newStatus
  });

  sendAdminAlert_({
    subject: 'PDF generation failed for evaluation ' + evaluationId,
    body: 'Evaluation ID: ' + evaluationId + '\nCourse: ' + (row.courseCode || 'N/A') + ' (' + (row.term || 'N/A') + ')\nError: ' + err.message + '\nStack: ' + (err.stack || '') + '\nAttempts: ' + attempts + '\nRetryable: ' + isRetryable + '\nStatus reverted to ' + newStatus + ' for manual retry.'
  });

  if (isRetryable && opts.enqueue !== false) {
    enqueueDeadLetter_(DLQ_ACTIONS.GENERATE_PDF, { evaluationId: evaluationId }, err);
  }

  return { newStatus: newStatus };
}

function attemptPdfGeneration_(row, attemptNumber) {
  var evaluationId = row.evaluationId;
  var archiveFolder = DriveApp.getFolderById(C_().ARCHIVE_FOLDER_ID);

  var tempDoc = DocumentApp.create('TEMP_EVAL_' + evaluationId);
  var tempFile = DriveApp.getFileById(tempDoc.getId());
  // The temporary Doc holds the whole evaluation, so it is deleted even when a step below fails.
  try {
    return finishPdf_(row, attemptNumber, archiveFolder, tempDoc, tempFile);
  } finally {
    try { tempFile.setTrashed(true); } catch (trashErr) {
      logWarn_('PdfEngine.attemptPdfGeneration', 'Could not delete the temporary Doc', { evaluationId: evaluationId, error: trashErr.message });
    }
  }
}

function finishPdf_(row, attemptNumber, archiveFolder, tempDoc, tempFile) {
  var evaluationId = row.evaluationId;
  tempFile.moveTo(archiveFolder);

  var body = tempDoc.getBody();
  body.setMarginTop(36);
  body.setMarginBottom(36);
  body.setMarginLeft(54);
  body.setMarginRight(54);

  buildStyledDocument_(body, row);
  addFooterId_(tempDoc, row.evaluationId);

  tempDoc.saveAndClose();

  var pdfBlob = tempFile.getBlob().getAs('application/pdf');
  pdfBlob.setName(buildFileName_(row));

  var fileSizeMB = pdfBlob.getBytes().length / (1024 * 1024);
  if (fileSizeMB > C_().PDF.MAX_FILE_SIZE_MB) {
    throw new Error('PDF file size ' + fileSizeMB.toFixed(2) + 'MB exceeds limit of ' + C_().PDF.MAX_FILE_SIZE_MB + 'MB');
  }

  var pdfFile = archiveFolder.createFile(pdfBlob);
  var fileId = pdfFile.getId();
  var fileUrl = pdfFile.getUrl();
  row.finalPdfFileId = fileId;
  row.finalPdfLink = fileUrl;

  updateRowPdfInfo_(row.evaluationId, fileUrl, fileId);

  sendCompletionEmail_(row.profEmail, row.taEmail, pdfBlob, row);

  updateRowStatusAndDate_(evaluationId, C_().STATUSES.COMPLETED, new Date().toISOString());
  const current = findRowByEvaluationId_(evaluationId);
  if (current) updateRow_(current.rowNum, { secureToken: '', tokenExpiry: '' });

  logEvent_({
    action: C_().ACTIONS.PDF_GENERATED, evaluationId: evaluationId,
    oldStatus: C_().STATUSES.PDF_GENERATING, newStatus: C_().STATUSES.COMPLETED,
    details: { fileId: fileId, fileUrl: fileUrl, emailSent: true, fileSizeMB: fileSizeMB.toFixed(2), attempts: attemptNumber + 1 },
    actorEmail: 'SYSTEM'
  });

  return { success: true, fileId: fileId, fileUrl: fileUrl, fileSizeMB: fileSizeMB, attempts: attemptNumber + 1 };
}

/* The evaluation ID in small grey text at the bottom right of every page.
   A document footer repeats on each page and is kept in the PDF export. */
function addFooterId_(doc, evaluationId) {
  var footer = doc.getFooter() || doc.addFooter();
  var paragraphs = footer.getParagraphs();
  var p = paragraphs.length ? paragraphs[0] : footer.appendParagraph('');
  p.setText(String(evaluationId || ''));
  p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  p.setFontFamily('Arial');
  p.setFontSize(7);
  p.setForegroundColor(UW_GRAY);
  p.setSpacingBefore(0);
  p.setSpacingAfter(0);
}

function buildStyledDocument_(body, row) {
  var payload = row.dataPayload || {};

  addHeader_(body, row);
  addDivider_(body);

  addSectionHeader_(body, 'Evaluation Details');
  addMetaField_(body, 'Course', row.courseCode);
  addMetaField_(body, 'Term', row.term);
  addMetaField_(body, 'Professor', row.profName + ' (' + row.profEmail + ')');
  addMetaField_(body, 'Teaching Assistant', row.taName + ' (' + row.taEmail + ')');
  addMetaField_(body, 'Date Generated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

  addDivider_(body);

  if (payload.evalBasis || payload.visitationDate || payload.visitationDescription) {
    addSectionHeader_(body, 'Basis of Evaluation');
    if (payload.evalBasis) {
      addMetaField_(body, 'Basis', payload.evalBasis === 'class_visitation' ? 'Class Visitation' : 'Other');
    }
    if (payload.visitationDate) {
      addMetaField_(body, 'Date of Visitation', payload.visitationDate);
    }
    if (payload.visitationDescription) {
      addMetaField_(body, 'Observation Description', payload.visitationDescription);
    }
    addDivider_(body);
  }

  addDutyMatrix_(body, payload);

  if (payload.otherDuties) {
    addSectionHeader_(body, 'Other Specific Duties');
    addBodyText_(body, payload.otherDuties);
    addDivider_(body);
  }

  if (payload.strengths) {
    addSectionHeader_(body, 'Strengths Demonstrated');
    addBodyText_(body, payload.strengths);
    addDivider_(body);
  }

  if (payload.concerns) {
    addSectionHeader_(body, 'Concerns / Challenges');
    addBodyText_(body, payload.concerns);
    addDivider_(body);
  }

  if (payload.feedback) {
    addSectionHeader_(body, 'Additional Feedback');
    addBodyText_(body, payload.feedback);
    addDivider_(body);
  }

  if (payload.responses && (payload.responses.context || payload.responses.self_eval || payload.responses.looking_ahead)) {
    addSectionHeader_(body, "TA's Self-Evaluation");
    if (payload.responses.context) {
      addSubHeader_(body, 'Context');
      addBodyText_(body, payload.responses.context);
    }
    if (payload.responses.self_eval) {
      addSubHeader_(body, 'Self-Evaluation');
      addBodyText_(body, payload.responses.self_eval);
    }
    if (payload.responses.looking_ahead) {
      addSubHeader_(body, 'Looking Ahead');
      addBodyText_(body, payload.responses.looking_ahead);
    }
    addDivider_(body);
  }

  addSectionHeader_(body, 'Signatures');
  if (payload.taSignatureName) {
    addMetaField_(body, 'TA', payload.taSignatureName);
    addMetaField_(body, 'TA Signed', payload.taSignatureTimestamp || '');
    if (payload.taSignatureEmail) addMetaField_(body, 'TA UW account', payload.taSignatureEmail);
  }
  if (payload.profSignatureName) {
    addMetaField_(body, 'Professor', payload.profSignatureName);
    addMetaField_(body, 'Professor Signed', payload.profSignatureTimestamp || '');
    if (payload.profSignatureEmail) addMetaField_(body, 'Professor UW account', payload.profSignatureEmail);
  }
}

function addHeader_(body, row) {
  var header = body.appendParagraph('UW Anthropology Department ASE Evaluation');
  header.setFontFamily('Arial');
  header.setFontSize(22);
  header.setBold(true);
  header.setForegroundColor(UW_PURPLE);
  header.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  header.setSpacingAfter(4);

  var subtitle = body.appendParagraph(row.courseCode + ' \u2014 ' + row.term);
  subtitle.setFontFamily('Arial');
  subtitle.setFontSize(13);
  subtitle.setForegroundColor(UW_GOLD);
  subtitle.setBold(true);
  subtitle.setSpacingAfter(2);

  var names = body.appendParagraph(row.profName + ' \u2022 ' + row.taName);
  names.setFontFamily('Arial');
  names.setFontSize(11);
  names.setForegroundColor(UW_GRAY);
  names.setSpacingAfter(6);
}

function addDivider_(body) {
  var divider = body.appendParagraph('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  divider.setFontFamily('Arial');
  divider.setFontSize(8);
  divider.setForegroundColor(UW_GOLD);
  divider.setSpacingBefore(10);
  divider.setSpacingAfter(10);
}

function addSectionHeader_(body, text) {
  var header = body.appendParagraph(text);
  header.setFontFamily('Arial');
  header.setFontSize(14);
  header.setBold(true);
  header.setForegroundColor(UW_PURPLE);
  header.setSpacingBefore(12);
  header.setSpacingAfter(6);
}

function addSubHeader_(body, text) {
  var header = body.appendParagraph(text);
  header.setFontFamily('Arial');
  header.setFontSize(11);
  header.setBold(true);
  header.setForegroundColor(UW_GRAY);
  header.setSpacingBefore(8);
  header.setSpacingAfter(4);
}

function addMetaField_(body, label, value) {
  var p = body.appendParagraph('');
  p.setFontFamily('Arial');
  p.setFontSize(10);
  p.setSpacingAfter(2);
  p.appendText(label + ': ').setBold(true).setForegroundColor(UW_GRAY);
  p.appendText(value || 'N/A').setForegroundColor(UW_GRAY);
}

function addBodyText_(body, text) {
  var p = body.appendParagraph(text);
  p.setFontFamily('Arial');
  p.setFontSize(10);
  p.setForegroundColor('#333333');
  p.setSpacingAfter(6);
}

function addDutyMatrix_(body, payload) {
  if (!payload.taskStatus) return;

  var allDuties = DUTY_LIST_;

  var cleanTaskStatus = {};
  var tsKeys = Object.keys(payload.taskStatus);
  for (var t = 0; t < tsKeys.length; t++) {
    var cleanKey = tsKeys[t]
      .replace(/&apos;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
    cleanTaskStatus[cleanKey] = payload.taskStatus[tsKeys[t]];
  }

  var headers = ['Duty', 'Satisfactory', 'Unsatisfactory', 'Not Applicable'];
  var colWidths = [280, 58, 58, 58];

  // Build all cells first, then create the table in one call instead of one call per row and cell.
  var cells = [headers];
  var markCol = [];
  for (var i = 0; i < allDuties.length; i++) {
    var duty = allDuties[i];
    var key = 'task_' + duty.replace(/ /g, '_').toLowerCase();
    var val = cleanTaskStatus[key] || '';
    cells.push([
      duty,
      val === 'satisfactory' ? '\u2713' : '',
      val === 'unsatisfactory' ? '\u2717' : '',
      val === 'na' ? '\u2014' : ''
    ]);
    markCol.push(val === 'satisfactory' ? 1 : val === 'unsatisfactory' ? 2 : val === 'na' ? 3 : 0);
  }

  var table = body.appendTable(cells);
  table.setBorderWidth(1);
  table.setBorderColor(UW_GOLD);

  // Text style for the whole table in one call; container attributes apply to the text inside.
  var base = {};
  base[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  base[DocumentApp.Attribute.FONT_SIZE] = 9;
  base[DocumentApp.Attribute.FOREGROUND_COLOR] = '#333333';
  table.setAttributes(base);

  var bold = {};
  bold[DocumentApp.Attribute.BOLD] = true;
  table.getRow(0).setAttributes(bold);

  // Only the one marked cell in each row needs its own style.
  var mark = {};
  mark[DocumentApp.Attribute.FONT_SIZE] = 11;
  mark[DocumentApp.Attribute.BOLD] = true;
  mark[DocumentApp.Attribute.VERTICAL_ALIGNMENT] = DocumentApp.VerticalAlignment.MIDDLE;
  for (var m = 0; m < markCol.length; m++) {
    if (markCol[m]) table.getRow(m + 1).getCell(markCol[m]).setAttributes(mark);
  }

  for (var c = 0; c < colWidths.length; c++) {
    table.setColumnWidth(c, colWidths[c]);
  }
}

function isRetryableError_(err) {
  var message = err.message || String(err);
  var retryablePatterns = ['rate limit', 'quota exceeded', 'timeout', 'temporarily unavailable', 'service unavailable', 'internal error', 'backend error', 'connection reset', 'socket', 'network'];
  for (var i = 0; i < retryablePatterns.length; i++) {
    if (message.toLowerCase().indexOf(retryablePatterns[i]) !== -1) return true;
  }
  return false;
}

function buildFileName_(row) {
  var safeCourse = row.courseCode.replace(/[^a-zA-Z0-9]/g, '_');
  var safeTA = row.taName.replace(/[^a-zA-Z0-9]/g, '_');
  return 'Evaluation_' + row.evaluationId + '_' + safeCourse + '_' + safeTA + '.pdf';
}

function updateRowPdfInfo_(evaluationId, fileUrl, fileId) {
  var sheet = getMasterSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  for (var r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evaluationId) {
      sheet.getRange(r + 1, col.Final_PDF_Link + 1).setValue(fileUrl);
      sheet.getRange(r + 1, col.Final_PDF_File_ID + 1).setValue(fileId);
      SpreadsheetApp.flush();
      break;
    }
  }
}

function updateRowStatusAndDate_(evaluationId, status, completedDate) {
  var sheet = getMasterSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  for (var r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evaluationId) {
      sheet.getRange(r + 1, col.Status + 1).setValue(status);
      sheet.getRange(r + 1, col.Completed_Date + 1).setValue(completedDate);
      SpreadsheetApp.flush();
      break;
    }
  }
}

function updateRowStatus_(evaluationId, status) {
  var sheet = getMasterSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  for (var r = 1; r < data.length; r++) {
    if (data[r][col.Evaluation_ID] === evaluationId) {
      sheet.getRange(r + 1, col.Status + 1).setValue(status);
      SpreadsheetApp.flush();
      break;
    }
  }
}
