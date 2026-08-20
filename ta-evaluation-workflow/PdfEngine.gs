function C() { return getConfig(); }

var UW_PURPLE = '#4B2E83';
var UW_GOLD = '#B7A57A';
var UW_GRAY = '#58595B';
var UW_LIGHT_BG = '#F7F5FA';

function generateAndDistributePdf(row, opts) {
  opts = opts || {};
  var evaluationId = row.evaluationId;

  if (row.finalPdfLink && row.finalPdfFileId) {
    logEvent({
      action: C().ACTIONS.PDF_GENERATED,
      evaluationId: evaluationId,
      oldStatus: C().STATUSES.PDF_GENERATING,
      newStatus: C().STATUSES.COMPLETED,
      details: { idempotent: true, fileId: row.finalPdfFileId },
      actorEmail: 'SYSTEM'
    });
    return { success: true, idempotent: true, fileId: row.finalPdfFileId, fileUrl: row.finalPdfLink };
  }

  var maxRetries = C().PDF.MAX_RETRIES;
  var baseDelay = C().PDF.BASE_RETRY_DELAY_MS;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return attemptPdfGeneration(row, attempt);
    } catch (err) {
      var isRetryable = isRetryableError(err);
      var isLastAttempt = attempt === maxRetries;

      logWarn('PdfEngine.generateAndDistributePdf', 'Attempt ' + (attempt + 1) + ' failed for ' + evaluationId, {
        evaluationId: evaluationId, attempt: attempt + 1, maxRetries: maxRetries,
        error: err.message, isRetryable: isRetryable, isLastAttempt: isLastAttempt
      });

      if (!isRetryable || isLastAttempt) {
        var failure = handlePdfFailure(row, err, attempt + 1, isRetryable, opts);
        return { success: false, error: err.message, attempts: attempt + 1, status: failure.newStatus };
      }

      var delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      logInfo('PdfEngine.generateAndDistributePdf', 'Retrying in ' + Math.round(delay) + 'ms', { evaluationId: evaluationId, delay: delay });
      Utilities.sleep(delay);
    }
  }
}

function handlePdfFailure(row, err, attempts, isRetryable, opts) {
  var oldStatus = row.status || C().STATUSES.PDF_GENERATING;
  var newStatus = C().STATUSES.PROF_SIGN_PENDING;
  var evaluationId = row.evaluationId;

  updateRowStatus(evaluationId, newStatus);

  logEvent({
    action: C().ACTIONS.PDF_FAILED, evaluationId: evaluationId,
    oldStatus: oldStatus, newStatus: newStatus,
    details: { error: err.message, stack: err.stack, attempts: attempts, retryable: isRetryable },
    actorEmail: 'SYSTEM'
  });

  logError('PdfEngine.handlePdfFailure', 'PDF generation failed for ' + evaluationId, {
    evaluationId: evaluationId, error: err.message, stack: err.stack,
    attempts: attempts, retryable: isRetryable, revertedTo: newStatus
  });

  sendAdminAlert({
    subject: 'PDF generation failed for evaluation ' + evaluationId,
    body: 'Evaluation ID: ' + evaluationId + '\nCourse: ' + (row.courseCode || 'N/A') + ' (' + (row.term || 'N/A') + ')\nError: ' + err.message + '\nStack: ' + (err.stack || '') + '\nAttempts: ' + attempts + '\nRetryable: ' + isRetryable + '\nStatus reverted to ' + newStatus + ' for manual retry.'
  });

  if (isRetryable && opts.enqueue !== false) {
    enqueueDeadLetter(DLQ_ACTIONS.GENERATE_PDF, row, err);
  }

  return { newStatus: newStatus };
}

function attemptPdfGeneration(row, attemptNumber) {
  var evaluationId = row.evaluationId;
  var archiveFolder = DriveApp.getFolderById(C().ARCHIVE_FOLDER_ID);

  var tempDoc = DocumentApp.create('TEMP_EVAL_' + evaluationId);
  var tempFile = DriveApp.getFileById(tempDoc.getId());
  tempFile.moveTo(archiveFolder);

  var body = tempDoc.getBody();
  body.setMarginTop(36);
  body.setMarginBottom(36);
  body.setMarginLeft(54);
  body.setMarginRight(54);

  buildStyledDocument(body, row);

  tempDoc.saveAndClose();

  var pdfBlob = tempFile.getBlob().getAs('application/pdf');
  pdfBlob.setName(buildFileName(row));

  var fileSizeMB = pdfBlob.getBytes().length / (1024 * 1024);
  if (fileSizeMB > C().PDF.MAX_FILE_SIZE_MB) {
    tempFile.setTrashed(true);
    throw new Error('PDF file size ' + fileSizeMB.toFixed(2) + 'MB exceeds limit of ' + C().PDF.MAX_FILE_SIZE_MB + 'MB');
  }

  var pdfFile = archiveFolder.createFile(pdfBlob);
  var fileId = pdfFile.getId();
  var fileUrl = pdfFile.getUrl();
  row.finalPdfFileId = fileId;
  row.finalPdfLink = fileUrl;

  updateRowPdfInfo(row.evaluationId, fileUrl, fileId);

  tempFile.setTrashed(true);

  sendCompletionEmail(row.profEmail, row.taEmail, pdfBlob, row);

  updateRowStatusAndDate(evaluationId, C().STATUSES.COMPLETED, new Date().toISOString());

  logEvent({
    action: C().ACTIONS.PDF_GENERATED, evaluationId: evaluationId,
    oldStatus: C().STATUSES.PDF_GENERATING, newStatus: C().STATUSES.COMPLETED,
    details: { fileId: fileId, fileUrl: fileUrl, emailSent: true, fileSizeMB: fileSizeMB.toFixed(2), attempts: attemptNumber + 1 },
    actorEmail: 'SYSTEM'
  });

  return { success: true, fileId: fileId, fileUrl: fileUrl, fileSizeMB: fileSizeMB, attempts: attemptNumber + 1 };
}

function buildStyledDocument(body, row) {
  var payload = row.dataPayload || {};

  addHeader(body, row);
  addDivider(body);

  addSectionHeader(body, 'Evaluation Details');
  addMetaField(body, 'Evaluation ID', row.evaluationId);
  addMetaField(body, 'Course', row.courseCode);
  addMetaField(body, 'Term', row.term);
  addMetaField(body, 'Professor', row.profName + ' (' + row.profEmail + ')');
  addMetaField(body, 'Teaching Assistant', row.taName + ' (' + row.taEmail + ')');
  addMetaField(body, 'Date Generated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

  addDivider(body);

  if (payload.evalBasis || payload.visitationDate || payload.visitationDescription) {
    addSectionHeader(body, 'Basis of Evaluation');
    if (payload.evalBasis) {
      addMetaField(body, 'Basis', payload.evalBasis === 'class_visitation' ? 'Class Visitation' : 'Other');
    }
    if (payload.visitationDate) {
      addMetaField(body, 'Date of Visitation', payload.visitationDate);
    }
    if (payload.visitationDescription) {
      addMetaField(body, 'Observation Description', payload.visitationDescription);
    }
    addDivider(body);
  }

  addDutyMatrix(body, payload);

  if (payload.otherDuties) {
    addSectionHeader(body, 'Other Specific Duties');
    addBodyText(body, payload.otherDuties);
    addDivider(body);
  }

  if (payload.strengths) {
    addSectionHeader(body, 'Strengths Demonstrated');
    addBodyText(body, payload.strengths);
    addDivider(body);
  }

  if (payload.concerns) {
    addSectionHeader(body, 'Concerns / Challenges');
    addBodyText(body, payload.concerns);
    addDivider(body);
  }

  if (payload.feedback) {
    addSectionHeader(body, 'Additional Feedback');
    addBodyText(body, payload.feedback);
    addDivider(body);
  }

  if (payload.responses && (payload.responses.context || payload.responses.self_eval || payload.responses.looking_ahead)) {
    addSectionHeader(body, "TA's Self-Evaluation");
    if (payload.responses.context) {
      addSubHeader(body, 'Context');
      addBodyText(body, payload.responses.context);
    }
    if (payload.responses.self_eval) {
      addSubHeader(body, 'Self-Evaluation');
      addBodyText(body, payload.responses.self_eval);
    }
    if (payload.responses.looking_ahead) {
      addSubHeader(body, 'Looking Ahead');
      addBodyText(body, payload.responses.looking_ahead);
    }
    addDivider(body);
  }

  addSectionHeader(body, 'Signatures');
  if (payload.taSignatureName) {
    addMetaField(body, 'TA', payload.taSignatureName);
    addMetaField(body, 'TA Signed', payload.taSignatureTimestamp || '');
  }
  if (payload.profSignatureName) {
    addMetaField(body, 'Professor', payload.profSignatureName);
    addMetaField(body, 'Professor Signed', payload.profSignatureTimestamp || '');
  }
}

function addHeader(body, row) {
  var header = body.appendParagraph('ASE Evaluation');
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

function addDivider(body) {
  var divider = body.appendParagraph('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  divider.setFontFamily('Arial');
  divider.setFontSize(8);
  divider.setForegroundColor(UW_GOLD);
  divider.setSpacingBefore(10);
  divider.setSpacingAfter(10);
}

function addSectionHeader(body, text) {
  var header = body.appendParagraph(text);
  header.setFontFamily('Arial');
  header.setFontSize(14);
  header.setBold(true);
  header.setForegroundColor(UW_PURPLE);
  header.setSpacingBefore(12);
  header.setSpacingAfter(6);
}

function addSubHeader(body, text) {
  var header = body.appendParagraph(text);
  header.setFontFamily('Arial');
  header.setFontSize(11);
  header.setBold(true);
  header.setForegroundColor(UW_GRAY);
  header.setSpacingBefore(8);
  header.setSpacingAfter(4);
}

function addMetaField(body, label, value) {
  var p = body.appendParagraph('');
  p.setFontFamily('Arial');
  p.setFontSize(10);
  p.setSpacingAfter(2);
  p.appendText(label + ': ').setBold(true).setForegroundColor(UW_GRAY);
  p.appendText(value || 'N/A').setForegroundColor(UW_GRAY);
}

function addBodyText(body, text) {
  var p = body.appendParagraph(text);
  p.setFontFamily('Arial');
  p.setFontSize(10);
  p.setForegroundColor('#333333');
  p.setSpacingAfter(6);
}

function addDutyMatrix(body, payload) {
  if (!payload.taskStatus) return;

  var allDuties = [
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

  var table = body.appendTable();
  table.setBorderWidth(1);
  table.setBorderColor(UW_GOLD);

  var headerRow = table.appendTableRow();
  for (var h = 0; h < headers.length; h++) {
    var cell = headerRow.appendTableCell(headers[h]);
    cell.setFontFamily('Arial');
    cell.setFontSize(9);
    cell.setBold(true);
    cell.setForegroundColor('#333333');
    cell.setVerticalAlignment(DocumentApp.VerticalAlignment.MIDDLE);
  }

  for (var i = 0; i < allDuties.length; i++) {
    var duty = allDuties[i];
    var key = 'task_' + duty.replace(/ /g, '_').toLowerCase();
    var val = cleanTaskStatus[key] || '';

    var row = table.appendTableRow();

    var dutyCell = row.appendTableCell(duty);
    dutyCell.setFontFamily('Arial');
    dutyCell.setFontSize(9);
    dutyCell.setForegroundColor('#333333');

    var marks = [
      val === 'satisfactory' ? '\u2713' : '',
      val === 'unsatisfactory' ? '\u2717' : '',
      val === 'na' ? '\u2014' : ''
    ];

    for (var m = 0; m < marks.length; m++) {
      var markCell = row.appendTableCell(marks[m]);
      markCell.setFontFamily('Arial');
      markCell.setFontSize(11);
      markCell.setVerticalAlignment(DocumentApp.VerticalAlignment.MIDDLE);
      if (marks[m]) {
        markCell.setBold(true);
        markCell.setForegroundColor('#333333');
      }
    }
  }

  for (var c = 0; c < colWidths.length; c++) {
    table.setColumnWidth(c, colWidths[c]);
  }
}

function isRetryableError(err) {
  var message = err.message || String(err);
  var retryablePatterns = ['rate limit', 'quota exceeded', 'timeout', 'temporarily unavailable', 'service unavailable', 'internal error', 'backend error', 'connection reset', 'socket', 'network'];
  for (var i = 0; i < retryablePatterns.length; i++) {
    if (message.toLowerCase().indexOf(retryablePatterns[i]) !== -1) return true;
  }
  return false;
}

function buildFileName(row) {
  var safeCourse = row.courseCode.replace(/[^a-zA-Z0-9]/g, '_');
  var safeTA = row.taName.replace(/[^a-zA-Z0-9]/g, '_');
  return 'Evaluation_' + row.evaluationId + '_' + safeCourse + '_' + safeTA + '.pdf';
}

function updateRowPdfInfo(evaluationId, fileUrl, fileId) {
  var sheet = getMasterSheet();
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

function updateRowStatusAndDate(evaluationId, status, completedDate) {
  var sheet = getMasterSheet();
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

function updateRowStatus(evaluationId, status) {
  var sheet = getMasterSheet();
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
