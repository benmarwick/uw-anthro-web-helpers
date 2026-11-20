/* ============================================================
   PdfEngine.gs: the completed review as a PDF, built only from buildReviewPdfModel_() (CoreRecords.gs),
   which leaves out GPC-only fields, the development modules and calibration notes by design. The PDF
   is shared with the UW accounts of the student, advisor(s), committee chair and reviewer, and emails
   link to it; it is never an attachment.
   ============================================================ */

const PDF_LABELS_ = {
  status: 'Status', milestones: 'Milestones', behindSchedule: 'Behind schedule: explanation and plan', coursework: 'Coursework',
  courseFeedbackResponse: 'Next steps from course feedback', research: 'Research progress', publications: 'Publications and other outputs',
  presentations: 'Presentations', grants: 'Grants and fellowships', appointments: 'Teaching and research appointments', service: 'Service and outreach',
  lastGoals: "Last year's goals", nextPlan: "Next year's plan", funding: 'Funding and TA requests', actionItemsProgress: 'Action items from last year',
  compactCheck: 'Compact check', challenges: 'Challenges', advising: 'Advising', asks: 'Asks for faculty', signatureName: 'Signed',
  meetingDate: 'Date of meeting', milestoneDeterminations: 'Milestone determinations', mentorChecklist: 'Mentor checklist', actionItems: 'Action items',
  planToCompletion: 'Plan to completion', agreement: 'Agreement with the self-assessment', accomplishments: 'Notable accomplishments',
  developmentAreas: 'Areas for development', timelineComments: 'Comments on the timeline', goalsAdded: 'Goals added or amended',
  recommendedRating: 'Recommended rating', concerns: 'Benchmark, deadline, support and consequence', letterParagraph: 'Paragraph for the letter',
  discussedCourseFeedback: 'Discussed course feedback', finalRating: 'Final rating', letterText: 'Letter', acknowledged: 'Acknowledged',
  responseText: 'Student response', meetGpc: 'Would like to meet with the GPC'
};

function pdfValue_(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (Array.isArray(v)) return v.map(function(x) { return typeof x === 'object' ? Object.keys(x).map(function(k) { return k + ': ' + x[k]; }).join('; ') : String(x); }).join('\n');
  if (v && typeof v === 'object') return Object.keys(v).map(function(k) { return k + ': ' + (typeof v[k] === 'object' ? JSON.stringify(v[k]) : v[k]); }).join('\n');
  return String(v);
}

function addPdfSection_(body, title, data) {
  const keys = Object.keys(data || {});
  if (!keys.length) return;
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  keys.forEach(function(k) {
    body.appendParagraph(PDF_LABELS_[k] || k).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(pdfValue_(data[k]));
  });
}

/* Builds, saves and shares the PDF. Returns { id, url } or null (queued for retry). */
function generateReviewPdf_(reviewId, opts) {
  opts = opts || {};
  const r = reviewById_(reviewId);
  if (!r) throw new Error('Review not found: ' + reviewId);
  const s = studentByEmail_(r.Student_Email) || {};
  const model = buildReviewPdfModel_({
    reviewId: r.Review_ID, cycle: r.Cycle, studentName: s.Name || r.Student_Email,
    studentPayload: parseJson_(r.Student_Payload), advisorPayload: parseJson_(r.Advisor_Payload),
    programPayload: parseJson_(r.Program_Payload), responsePayload: parseJson_(r.Response_Payload), skippedStage: r.Skipped_Stage
  });
  let doc = null;
  try {
    doc = DocumentApp.create('Annual review ' + r.Cycle + ' - ' + (s.Name || r.Student_Email));
    const body = doc.getBody();
    body.appendParagraph('UW Department of Anthropology: ' + (r.Type === 'ANNUAL' ? 'Annual Review ' : 'Check-in ') + r.Cycle).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph('Student: ' + model.studentName + '    Reference: ' + model.reviewId);
    if (model.skippedStage) body.appendParagraph('Stage completed without a response: ' + model.skippedStage);
    addPdfSection_(body, "Student's report", model.student);
    addPdfSection_(body, "Advisor's evaluation", model.advisor);
    addPdfSection_(body, 'Program decision and letter', model.program);
    addPdfSection_(body, 'Acknowledgement and response', model.response);
    doc.saveAndClose();
    const blob = DriveApp.getFileById(doc.getId()).getAs('application/pdf').setName('AnnualReview_' + r.Cycle + '_' + r.Review_ID + '.pdf');
    const folder = DriveApp.getFolderById(C_().ARCHIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    const readers = [normEmail_(r.Student_Email)].concat(splitList_(r.Advisor_Emails));
    if (r.Chair_Email) readers.push(normEmail_(r.Chair_Email));
    readers.push(reviewerFor_(s));
    readers.filter(function(e, i, a) { return e && a.indexOf(e) === i; }).forEach(function(e) {
      try { file.addViewer(e); } catch (err) { logWarn_('PdfEngine.share', 'Could not share with a reader', { reviewId: reviewId, error: err.message }); }
    });
    logEvent_({ action: C_().ACTIONS.PDF_GENERATED, evaluationId: reviewId, actorEmail: 'SYSTEM' });
    return { id: file.getId(), url: file.getUrl() };
  } catch (err) {
    if (doc) { try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} }
    logEvent_({ action: C_().ACTIONS.PDF_FAILED, evaluationId: reviewId, details: { error: err.message }, actorEmail: 'SYSTEM' });
    logError_('PdfEngine.generateReviewPdf', 'PDF generation failed', { reviewId: reviewId, error: err.message }, { evaluationId: reviewId });
    if (opts.enqueue) { enqueueDeadLetter_(DLQ_ACTIONS.GENERATE_PDF, { reviewId: reviewId }, err); return null; }
    throw err;
  }
}
