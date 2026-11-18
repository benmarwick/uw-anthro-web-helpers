/* ============================================================
   CoreRecords.gs: the Course Feedback Record (course-feedback plan §6.1), the annual review PDF
   content (annual review plan §9.1, §10) and metric suppression (§9.5). Pure functions, tested in
   tests/run.js.
   ============================================================ */

/* Builds the record a given reader may see.
   offerings: [{ requestId, course, quarter, instructorNames:[...], submitted:true|false }] for this student and year
   comments:  [{ requestId, course, quarter, instructorNames, contact, written, discussion, literature,
                strength, nextStep, status, releasedAt, gpcNote }]
   followups: [{ quarter, outcome, contactDate, status }]
   viewer:    'student' | 'advisor' | 'calibration' | 'pdf' */
function buildFeedbackRecord_(offerings, comments, followups, viewer, synthesis) {
  var visible = (comments || []).filter(function(c) {
    return c.releasedAt && commentVisibility_(c.status)[viewer];
  });
  var withText = visible.filter(function(c) { return c.contact === 'enough'; })
    .sort(function(a, b) { return quarterOrder_(a.quarter) - quarterOrder_(b.quarter); });   // date order, not alphabetical
  var noContact = visible.filter(function(c) { return c.contact !== 'enough'; }).length;
  var notReceived = (offerings || []).filter(function(o) { return !o.submitted; }).length;
  var instructors = {};
  withText.forEach(function(c) { (c.instructorNames || []).forEach(function(n) { instructors[n] = true; }); });
  var nInstructors = Object.keys(instructors).length;
  var coverage = (offerings || []).length + ' ' + plural_((offerings || []).length, 'course', 'courses') + '; feedback from ' +
    nInstructors + ' ' + plural_(nInstructors, 'instructor', 'instructors') + "; " + noContact + " 'not enough contact'; " + notReceived + ' not received.';
  var record = {
    coverage: coverage,
    thin: withText.length < 2,
    thinNote: withText.length < 2 ? 'This record has fewer than two comments, which is too few to show patterns across courses.' : '',
    grid: withText.map(function(c) {
      return { course: c.course, quarter: c.quarter, quarterLabel: quarterLabel_(c.quarter), written: c.written, discussion: c.discussion, literature: c.literature };
    }),
    flags: viewer === 'calibration' || viewer === 'student' || viewer === 'advisor' || viewer === 'pdf'
      ? (followups || []).map(function(f) { return { quarter: f.quarter, quarterLabel: quarterLabel_(f.quarter), outcome: f.outcome || 'Open', contactDate: f.contactDate || '' }; }) : [],
    synthesis: synthesis || ''
  };
  if (viewer === 'calibration') return record; // summary only: no free text (decision 7)
  record.comments = withText.map(function(c) {
    return { course: c.course, quarter: c.quarter, quarterLabel: quarterLabel_(c.quarter), instructors: (c.instructorNames || []).join(', '), strength: c.strength,
             nextStep: c.nextStep, gpcNote: viewer === 'student' && c.status !== 'RELEASED' ? (c.gpcNote || '') : '' };
  });
  record.nextSteps = record.comments.map(function(c) { return { course: c.course, nextStep: c.nextStep }; });
  return record;
}

/* ---------- Annual review PDF ---------- */

/* The only payload fields that can reach the PDF. Anything else, including every GPC-only field,
   the development modules and calibration notes, is left out by design (annual review plan §9.1, §10). */
var PDF_FIELDS_ = {
  student: ['status', 'milestones', 'behindSchedule', 'coursework', 'courseFeedbackResponse', 'research', 'publications',
            'presentations', 'grants', 'appointments', 'service', 'lastGoals', 'nextPlan', 'funding', 'actionItemsProgress',
            'compactCheck', 'challenges', 'advising', 'asks', 'signatureName'],
  advisor: ['meetingDate', 'milestoneDeterminations', 'mentorChecklist', 'actionItems', 'compactCheck', 'planToCompletion',
            'agreement', 'accomplishments', 'developmentAreas', 'timelineComments', 'goalsAdded', 'recommendedRating',
            'concerns', 'letterParagraph', 'discussedCourseFeedback', 'benchmarkProgress', 'verdict', 'signatureName'],
  program: ['finalRating', 'letterText'],
  response: ['acknowledged', 'responseText', 'meetGpc', 'signatureName']
};

/* Fields that must never appear in a PDF; the build test checks every one of them. */
var CONFIDENTIAL_FIELDS_ = ['gpcOnly', 'gpcOnlyAdvising', 'advisingChallenges', 'calibrationNotes', 'statusAction',
                            'careerCheckin', 'mentoringMap', 'skillsAssessment', 'careerSkillsComment', 'fundingPriority'];

function pickFields_(payload, fields) {
  var out = {};
  fields.forEach(function(f) { if (payload && payload[f] !== undefined && payload[f] !== '') out[f] = payload[f]; });
  return out;
}

/* { student, advisor, program, response, skippedStage } with only whitelisted fields. */
function buildReviewPdfModel_(review) {
  return {
    reviewId: review.reviewId,
    cycle: review.cycle,
    studentName: review.studentName,
    student: pickFields_(review.studentPayload, PDF_FIELDS_.student),
    advisor: pickFields_(review.advisorPayload, PDF_FIELDS_.advisor),
    program: pickFields_(review.programPayload, PDF_FIELDS_.program),
    response: pickFields_(review.responsePayload, PDF_FIELDS_.response),
    skippedStage: review.skippedStage || ''
  };
}

/* True if any confidential field name or value reached the model (used by the build test). */
function pdfModelLeaks_(model, confidentialValues) {
  var json = JSON.stringify(model);
  var keyLeak = CONFIDENTIAL_FIELDS_.some(function(k) { return json.indexOf('"' + k + '"') !== -1; });
  var valueLeak = (confidentialValues || []).some(function(v) { return v && json.indexOf(v) !== -1; });
  return keyLeak || valueLeak;
}

/* ---------- Metrics ---------- */

/* Replaces every count from 1 to min-1 with '<min' (annual review plan §9.5). Zero stays 0. */
function suppressSmallCounts_(table, min) {
  var limit = min || 5, out = {};
  Object.keys(table).forEach(function(k) {
    var v = table[k];
    out[k] = typeof v === 'number' && v > 0 && v < limit ? '<' + limit : v;
  });
  return out;
}
