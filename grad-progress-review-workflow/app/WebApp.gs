/* ============================================================
   WebApp.gs: page routing. Every server function the pages call checks the signed-in user itself,
   so routing never grants access on its own.
     ?t=TOKEN            annual review / check-in stage (Index.html)
     ?f=TOKEN[&nmc=1]    instructor's course feedback page (FeedbackForm.html)
     ?view=roster        Roster page (administrator, GPC)
     ?view=release[&q=]  Review and release (GPC, alternate)
     ?view=program       Program stage and calibration (GPC, alternate)
     ?view=student | advisor | coordinator   course feedback for the signed-in reader (Home.html)
   ============================================================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.f) return page_('FeedbackForm', 'Course feedback', { token: String(p.f), notMine: p.nmc === '1' });
    if (p.t) return page_('Index', 'Annual review', { token: String(p.t) });
    const view = String(p.view || 'student');
    if (view === 'roster') return page_('RosterPage', 'Roster', {});
    if (view === 'release') return page_('ReviewRelease', 'Review and release', { quarter: String(p.q || quarterForDate_(todayIso_()) || '') });
    if (view === 'program') return page_('Program', 'Program stage', {});
    if (['student', 'advisor', 'coordinator'].indexOf(view) !== -1) return page_('Home', 'Your course feedback', { view: view });
    return message_('Page not found.');
  } catch (err) {
    logError_('WebApp.doGet', err.message, {});
    return message_('Something went wrong opening this page. Please try again, or reply to the email you received.');
  }
}

function page_(file, title, data) {
  const t = HtmlService.createTemplateFromFile(file);
  t.dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
  return t.evaluate().setTitle(title + ' · UW Anthropology').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function message_(text) {
  const t = HtmlService.createTemplateFromFile('Message');
  t.text = text;
  return t.evaluate().setTitle('UW Anthropology').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* <?!= include_('Styles') ?> in the page templates. */
function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* CV upload (annual review plan §9.1): the page passes its <form>, so the file arrives as a Blob.
   PDF only, at most 10 MB. */
function uploadCv(token, form) {
  const x = reviewByToken_(token);
  if (x.error) throw new Error(x.error);
  if (x.access.stage !== 'student') throw new Error('Only the student can upload a CV.');
  const blob = form && form.cv;
  if (!blob || typeof blob.getBytes !== 'function') throw new Error('Choose a PDF file.');
  if (blob.getContentType() !== 'application/pdf') throw new Error('The CV must be a PDF.');
  if (blob.getBytes().length > C_().PDF.MAX_FILE_SIZE_MB * 1024 * 1024) throw new Error('The CV must be 10 MB or smaller.');
  const file = DriveApp.getFolderById(C_().ARCHIVE_FOLDER_ID).createFile(blob.setName('CV_' + x.review.Review_ID + '.pdf'));
  /* The folder is restricted, so share the CV with the advisors, who see a link to it (as PdfEngine.gs shares the PDF). */
  splitList_(x.review.Advisor_Emails).forEach(function(a) {
    try { file.addViewer(a); } catch (err) { logWarn_('WebApp.uploadCv', 'Could not share the CV with an advisor', { reviewId: x.review.Review_ID, error: err.message }); }
  });
  updateRow_(C_().SHEETS.REVIEWS, x.review._row, { CV_File_ID: file.getId(), Updated_At: nowIso_() });
  return true;
}
