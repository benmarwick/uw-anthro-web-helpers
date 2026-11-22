/* Tests for the pure modules (Core*.gs) and the Time Schedule parser.
   Run with:  node --test grad-progress-review-workflow/app/tests/run.js
   Numbers in some test names are the original acceptance-test numbers; the README (How it works) describes the rules. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
['CoreDates.gs', 'CoreStates.gs', 'CoreRoster.gs', 'CoreEmail.gs', 'CoreRecords.gs'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx, { filename: f });
});
const ts = require(path.join(APP, '..', '..', 'bookmarklet-time-schedule-sections.js'));
/* Values made inside the vm context have that context's Array prototype, so compare as plain JSON. */
const deq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'timeschedule-sample.html'), 'utf8');

/* ---------------- Calendar ---------------- */

test('course feedback windows match the plan table', () => {
  const offsets = { SPR: 14 };
  const w = ctx.courseFeedbackWindow_('WIN2027', offsets);
  deq([w.opens, w.gradesDue, w.reminders[0], w.reminders[1], w.due, w.release],
    ['2027-03-15', '2027-03-23', '2027-03-24', '2027-03-30', '2027-04-02', '2027-04-09']);
  const s = ctx.courseFeedbackWindow_('SPR2027', offsets);
  deq([s.opens, s.gradesDue, s.reminders[0], s.reminders[1], s.due, s.release],
    ['2027-06-07', '2027-06-15', '2027-06-16', '2027-06-22', '2027-06-25', '2027-07-09']);
  const a = ctx.courseFeedbackWindow_('AUT2026', offsets);
  deq([a.opens, a.gradesDue, a.reminders[0], a.reminders[1], a.due],
    ['2026-12-14', '2026-12-22', '2026-12-23', '2027-01-05', '2027-01-08']);
});

test('annual cycle 2027 dates', () => {
  const c = ctx.annualCycleDates_(2027);
  assert.equal(c.launch, '2027-03-29');
  assert.equal(c.recordRelease, '2027-04-09');
  assert.equal(c.studentDue, '2027-04-23');
  assert.equal(c.advisorDue, '2027-05-07');
  assert.equal(c.lettersRelease, '2027-05-28');
});

test('Alert deadline: 10th business day of autumn 2027, petition to the 15th', () => {
  const d = ctx.alertDeadline_('AUT2027');
  assert.equal(d.due, '2027-10-12');
  assert.equal(d.petitionUntil, '2027-10-19');
  assert.equal(d.remindOn, '2027-10-05');
  assert.equal(ctx.defaultAlertQuarter_(2027, false), 'AUT2027');
});

test('20. interim check-in is 3 months when a milestone is missing or GPA is low', () => {
  assert.equal(ctx.interimDueDate_('2027-05-28', 6, true), '2027-08-28');
  assert.equal(ctx.interimDueDate_('2027-05-28', 6, false), '2027-11-28');
  assert.equal(ctx.interimDueDate_('2027-11-30', 3, false), '2028-02-29');
});

/* ---------------- States ---------------- */

test('review flows, including MA quarterly check-ins (19)', () => {
  assert.equal(ctx.nextReviewStatus_('ANNUAL', 'PHD', 'STUDENT_PENDING'), 'ADVISOR_PENDING');
  assert.equal(ctx.nextReviewStatus_('INTERIM', 'MA', 'STUDENT_PENDING'), 'ADVISOR_PENDING');
  assert.equal(ctx.nextReviewStatus_('INTERIM', 'MA', 'ADVISOR_PENDING'), 'COMPLETED');
  assert.equal(ctx.nextReviewStatus_('INTERIM', 'PHD', 'ADVISOR_PENDING', { escalateToProgram: true }), 'PROGRAM_PENDING');
  assert.equal(ctx.nextReviewStatus_('INTERIM', 'PHD', 'PROGRAM_PENDING'), 'STUDENT_ACK_PENDING');
});

test('16. each ESCALATED action reaches the right state and needs a reason', () => {
  const row = { status: 'ESCALATED', escalatedFrom: 'ADVISOR_PENDING', type: 'ANNUAL', program: 'PHD' };
  assert.throws(() => ctx.resolveEscalation_(row, 'extend', { newDueIso: '2027-05-20' }), /reason/);
  assert.equal(ctx.resolveEscalation_(row, 'extend', { reason: 'sabbatical', newDueIso: '2027-05-20' }).status, 'ADVISOR_PENDING');
  const skip = ctx.resolveEscalation_(row, 'skip', { reason: 'no response' });
  assert.equal(skip.status, 'PROGRAM_PENDING');
  assert.equal(skip.skippedStage, 'ADVISOR_PENDING');
  assert.equal(ctx.resolveEscalation_(row, 'exempt', { reason: 'left program' }).status, 'EXEMPT');
});

test('escalation and reminder timing', () => {
  assert.equal(ctx.shouldEscalate_('ADVISOR_PENDING', 2, 2, '2027-05-07', '2027-05-08'), true);
  assert.equal(ctx.shouldEscalate_('ADVISOR_PENDING', 1, 2, '2027-05-07', '2027-05-08'), false);
  assert.equal(ctx.reminderDue_('STUDENT_PENDING', 0, 2, '2027-03-29', '2027-04-03', 5), true);
});

test('10. returned comments: revised in time are released; unrevised go to the student only', () => {
  assert.equal(ctx.nextCommentStatus_('SUBMITTED', 'return'), 'RETURNED');
  assert.equal(ctx.nextCommentStatus_('RETURNED', 'revise'), 'REVISED');
  assert.equal(ctx.nextCommentStatus_('REVISED', 'check'), 'CHECKED');
  assert.equal(ctx.nextCommentStatus_('CHECKED', 'release'), 'RELEASED');
  assert.equal(ctx.nextCommentStatus_('RETURNED', 'releaseDay'), 'STUDENT_ONLY');
  const v = ctx.commentVisibility_('STUDENT_ONLY');
  deq([v.student, v.advisor, v.calibration, v.pdf], [true, false, false, false]);
});

test('11. follow-up: reminder on day 14, overdue on day 21', () => {
  assert.equal(ctx.followupTiming_('2027-04-01', '2027-04-14', 'OPEN', '').reminderDue, false);
  assert.equal(ctx.followupTiming_('2027-04-01', '2027-04-15', 'OPEN', '').reminderDue, true);
  assert.equal(ctx.followupTiming_('2027-04-01', '2027-04-22', 'OPEN', '2027-04-15').overdue, true);
  assert.match(ctx.validateFollowupOutcome_('Talked', '2027-04-10'), /Choose an outcome/);
  assert.equal(ctx.validateFollowupOutcome_('Discussed', '2027-04-10'), '');
});

test('8. co-taught lock: the second instructor is read-only until the lock expires', () => {
  const now = 1000000;
  const a = ctx.lockDecision_('', 0, 'a@uw.edu', now);
  assert.equal(a.allowed, true);
  assert.equal(ctx.lockDecision_('a@uw.edu', a.until, 'b@uw.edu', now + 60000).allowed, false);
  assert.equal(ctx.lockDecision_('a@uw.edu', a.until, 'b@uw.edu', a.until + 1).allowed, true);
});

/* ---------------- Time Schedule parser and roster join ---------------- */

const sections = ts.parseSections(fixture, 'AUT2026');

test('parser reads lectures, quiz sections, joint flags and independent study', () => {
  const byId = Object.fromEntries(sections.map(s => [s.curric + ' ' + s.number + ' ' + s.section, s]));
  assert.equal(byId['ANTH 203 A'].instructors[0], 'Quill,Ada M');
  assert.equal(byId['ANTH 203 AA'].type, 'QZ');
  assert.equal(byId['ANTH 203 A'].joint, true);
  assert.equal(byId['LING 203 A'].joint, true);
  assert.equal(byId['ANTH 600 A'].independentStudy, true);
  deq(byId['ANTH 512 A'].instructors, ['Rowan,Bea', 'Stone,Cal']);
  assert.equal(byId['BIO A 201 A'].curric, 'BIO A');
  assert.equal(byId['ANTH 522 A'].instructors.length, 0);
});

const students = {
  'kim@uw.edu': { status: 'ACTIVE', program: 'PHD', advisorEmails: ['rowan@uw.edu'] },
  'lee@uw.edu': { status: 'ACTIVE', program: 'PHD', advisorEmails: [] },
  'away@uw.edu': { status: 'ON_LEAVE', program: 'PHD', advisorEmails: [] }
};
const instructors = {
  'QUILL,ADA M': { email: 'quill@uw.edu', appointment: 'faculty' },
  'ROWAN,BEA': { email: 'rowan@uw.edu', appointment: 'faculty' },
  'STONE,CAL': { email: 'stone@uw.edu', appointment: 'faculty' },
  'PIKE,DEV': { email: 'pike@uw.edu', appointment: 'graduate student' }
};
const reg = (email, curric, number, section, extra) => Object.assign({ quarter: 'AUT2026', studentEmail: email, curric, number, section }, extra || {});

test('1. a quiz-section registration matches its lecture; the quiz TA is never asked', () => {
  const r = ctx.joinRegistrations_([reg('kim@uw.edu', 'ANTH', '203', 'AB')], sections, students, instructors, {});
  assert.equal(r.enrollments[0].section, 'A');
  deq(r.enrollments[0].instructorEmails, ['quill@uw.edu']);
});

test('2. a co-taught section yields one page with every instructor; the advisor is flagged', () => {
  const r = ctx.joinRegistrations_([reg('kim@uw.edu', 'ANTH', '512', 'A'), reg('lee@uw.edu', 'ANTH', '512', 'A')], sections, students, instructors, {});
  assert.equal(r.requests.length, 1);
  deq(r.requests[0].instructorEmails, ['rowan@uw.edu', 'stone@uw.edu']);
  deq(r.requests[0].studentEmails, ['kim@uw.edu', 'lee@uw.edu']);
  deq(r.enrollments[0].isAdviseeOf, ['rowan@uw.edu']);
});

test('3. a joint-listed pair with the same instructor and meeting time merges into one page', () => {
  const r = ctx.joinRegistrations_([reg('kim@uw.edu', 'ANTH', '203', 'A'), reg('lee@uw.edu', 'LING', '203', 'A')], sections, students, instructors, {});
  assert.equal(r.requests.length, 1);
  assert.equal(r.requests[0].offering, 'ANTH 203 A / LING 203 A');
});

test('4. a course with no Time Schedule match is reported', () => {
  const r = ctx.joinRegistrations_([reg('kim@uw.edu', 'ANTH', '999', 'A')], sections, students, instructors, {});
  assert.equal(r.enrollments[0].exclusionReason, 'No Time Schedule match');
  assert.equal(r.counts.unmatched, 1);
});

test('5. an instructor missing from Instructors blocks launch', () => {
  const r = ctx.joinRegistrations_([reg('kim@uw.edu', 'BIO A', '201', 'A')], sections, students, instructors, {});
  deq(r.missingInstructors, ['Vale,Eli']);
  assert.equal(r.canLaunch, false);
});

test('6. leave, individual credits, graduate-student instructors, withdrawals and phase rules are excluded', () => {
  const rows = [
    reg('away@uw.edu', 'ANTH', '203', 'A'),
    reg('kim@uw.edu', 'ANTH', '600', 'A'),
    reg('kim@uw.edu', 'ANTH', '310', 'A'),
    reg('lee@uw.edu', 'ANTH', '203', 'A', { withdrawn: true }),
    reg('lee@uw.edu', 'LING', '203', 'A'),
    reg('lee@uw.edu', 'ANTH', '522', 'A')
  ];
  const r = ctx.joinRegistrations_(rows, sections, students, instructors, { curricula: ['ANTH', 'ARCHY', 'BIO A'] });
  deq([...r.enrollments.map(e => e.exclusionReason)], [
    'Student on leave or no longer enrolled', 'Individual or research credits', 'Instructor is a graduate student',
    'Dropped the course (W grade)', 'Outside the departments in this phase', 'No instructor listed']);
  assert.equal(r.requests.length, 0);
});

test('course cell parsing and withdrawal grades', () => {
  deq(JSON.parse(JSON.stringify(ctx.parseCourseCell_('BIO A 201 B'))), { curric: 'BIO A', number: '201', section: 'B' });
  assert.equal(ctx.isWithdrawnGrade_('W3'), true);
  assert.equal(ctx.isWithdrawnGrade_('X'), false);
});

test('CEC index lines (real format) and name matching give appointment types', () => {
  const e = ts.parseCecLine('Anthropology ANTH 203 AA&nbsp;&nbsp;Dev Pike &nbsp;&nbsp;Teaching Assistant&nbsp;&nbsp; AU26');
  assert.equal(e.curric, 'ANTH');
  assert.equal(e.name, 'Dev Pike');
  assert.equal(e.rank, 'Teaching Assistant');
  assert.equal(e.quarter, 'AUT2026');
  const b = ts.parseCecLine('Biological Anthropology BIO A 201 A&nbsp;&nbsp;Eli Vale &nbsp;&nbsp;Lecturer&nbsp;&nbsp; WI26');
  assert.equal(b.curric, 'BIO A');
  assert.equal(ts.sameInstructor('Quill,Ada M', 'Ada Quill'), true);
  assert.equal(ts.sameInstructor('Quill,A', 'Ada Quill'), true);
  assert.equal(ts.sameInstructor('Quill,Ada M', 'Bea Quill'), false);
  const a = ts.appointmentsFromCec([e, { curric: 'ANTH', name: 'Ada Quill', rank: 'Professor', quarter: 'WIN2026' },
    { curric: 'ANTH', name: 'Ada Quill', rank: 'Associate Professor', quarter: 'SPR2024' }], ['Pike,Dev', 'Quill,Ada M'], ['ANTH']);
  assert.equal(a['PIKE,DEV'].appointment, 'graduate student');
  assert.equal(a['QUILL,ADA M'].rank, 'Professor');
});

/* ---------------- Email ---------------- */

const common = { firstName: 'Ada', gpcName: 'Pat Example', privacyUrl: 'https://example.org/privacy', reference: 'R-1' };

test('13. no course feedback email names a student', () => {
  const studentNames = ['Kim Student', 'Lee Student'];
  const params = { course: 'ANTH 512', quarter: 'Winter 2027', n: 2, url: 'https://x/y', notMineUrl: 'https://x/n', dueLong: 'Friday 2 April 2027',
    dueShort: 'Fri 2 Apr', section: 'A', instructorName: 'Quill,Ada M', suggested: '', rosterUrl: 'https://x/r', reviseByLong: 'Wednesday 7 April 2027',
    isAdvisor: true, deadlineLong: 'Thursday 22 April 2027', deadlineShort: 'Thu 22 Apr', feedbackYear: '2026–27' };
  ['CF-1', 'CF-2', 'CF-3', 'CF-4', 'CF-5', 'CF-6', 'CF-7', 'CF-8', 'CF-9', 'CF-10', 'CF-11'].forEach(id => {
    const out = ctx.renderEmailTemplate_(id, params, common);
    assert.equal(ctx.emailMentionsAny_(out, studentNames), false, id);
    assert.ok(out.subject.length > 0 && out.text.indexOf('Reference: R-1') !== -1, id);
  });
});

test('22. the letter-ready email is identical whatever the letter says', () => {
  const p = { url: 'https://x/l', ackDueLong: 'Friday 11 June 2027' };
  const a = ctx.renderEmailTemplate_('AR-7', p, common);
  const b = ctx.renderEmailTemplate_('AR-7', Object.assign({ rating: 'Unsatisfactory' }, p), common);
  assert.equal(a.text, b.text);
  assert.equal(a.html, b.html);
});

test('annual review and check-in subjects never carry a student name and always use clear prefixes', () => {
  const base = { studentName: 'Kim Student', studentFirstName: 'Kim', url: 'https://x', dueLong: 'Friday 7 May 2027', dueShort: 'Fri 7 May',
    returnUntilLong: 'Monday 10 May 2027', year: 2027, isStudent: false, pdfUrl: 'https://x/p', stage: 'advisor', daysOverdue: 3,
    quarter: 'Autumn 2027', n: 1, nReady: 3, nTotal: 5, nWaiting: 2, subfield: 'Archaeology', ackDueLong: 'Friday 11 June 2027', coAdvised: true };
  ['AR-1', 'AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6', 'AR-7', 'AR-8', 'AR-9', 'AR-11', 'AR-12'].forEach(id => {
    const out = ctx.renderEmailTemplate_(id, base, common);
    assert.equal(out.subject.indexOf('Kim'), -1, id);
    assert.ok(out.subject.startsWith('[Grad Student Annual Review] '), id + ': ' + out.subject);
    assert.equal(out.senderName, 'UW Anthropology: Grad Student Annual Review', id);
    assert.ok(out.html.indexOf('#1B365D') !== -1, id);
  });
  ['AR-10', 'AR-13'].forEach(id => {
    const ma = ctx.renderEmailTemplate_(id, Object.assign({}, base, { isInterim: false }), common);
    assert.equal(ma.subject.indexOf('Kim'), -1, id + ' MA');
    assert.ok(ma.subject.startsWith('[Grad Student MA Check-In] '), id + ' MA: ' + ma.subject);
    assert.equal(ma.senderName, 'UW Anthropology: Grad Student Progress Check-In', id + ' MA');
    assert.ok(ma.html.indexOf('#14535B') !== -1, id + ' MA');
    const interim = ctx.renderEmailTemplate_(id, Object.assign({}, base, { isInterim: true }), common);
    assert.equal(interim.subject.indexOf('Kim'), -1, id + ' interim');
    assert.ok(interim.subject.startsWith('[Grad Student Interim Check-In] '), id + ' interim: ' + interim.subject);
    assert.equal(interim.senderName, 'UW Anthropology: Grad Student Progress Check-In', id + ' interim');
  });
});

test('course feedback subjects, sender names, banners and TA-evaluation disambiguation', () => {
  const params = { course: 'ANTH 512', quarter: 'Winter 2027', n: 2, url: 'https://x/y', notMineUrl: 'https://x/n', dueLong: 'Friday 2 April 2027',
    dueShort: 'Fri 2 Apr', section: 'A', instructorName: 'Quill,Ada M', suggested: '', rosterUrl: 'https://x/r', reviseByLong: 'Wednesday 7 April 2027',
    isAdvisor: true, deadlineLong: 'Thursday 22 April 2027', deadlineShort: 'Thu 22 Apr', feedbackYear: '2026–27' };
  ['CF-1', 'CF-2', 'CF-3', 'CF-4', 'CF-5', 'CF-6', 'CF-7', 'CF-8', 'CF-9', 'CF-10', 'CF-11'].forEach(id => {
    const out = ctx.renderEmailTemplate_(id, params, common);
    assert.ok(out.subject.startsWith('[Grad Student Course Feedback] '), id + ': ' + out.subject);
    assert.equal(out.senderName, 'UW Anthropology: Grad Student Course Feedback', id);
    assert.ok(out.html.indexOf('#1E5631') !== -1, id);
    assert.ok(out.text.indexOf('=== GRADUATE STUDENT COURSE FEEDBACK ===') !== -1, id);
  });
  ['CF-1', 'CF-2', 'CF-3', 'CF-6', 'CF-7', 'CF-10'].forEach(id => {
    const out = ctx.renderEmailTemplate_(id, params, common);
    assert.match(out.text, /TA\/ASE/i, id + ' text must distinguish from TA evaluations');
    assert.match(out.html, /TA\/ASE/i, id + ' html must distinguish from TA evaluations');
  });
  const arParams = { studentName: 'Kim Student', studentFirstName: 'Kim', url: 'https://x', dueLong: 'Friday 7 May 2027', dueShort: 'Fri 7 May',
    returnUntilLong: 'Monday 10 May 2027', year: 2027, quarter: 'Autumn 2027', coAdvised: false, isInterim: false };
  ['AR-3', 'AR-4', 'AR-6', 'AR-13'].forEach(id => {
    const out = ctx.renderEmailTemplate_(id, arParams, common);
    assert.match(out.text, /TA\/ASE/i, id + ' text must distinguish from TA evaluations');
    assert.match(out.html, /TA\/ASE/i, id + ' html must distinguish from TA evaluations');
  });
});

test('HTML emails escape text and render links', () => {
  const out = ctx.renderEmailTemplate_('CF-2', { course: 'ANTH <b>512</b>', quarter: 'Winter 2027', url: 'https://x', dueLong: 'Friday 2 April 2027', dueShort: 'Fri 2 Apr' }, common);
  assert.ok(out.html.indexOf('&lt;b&gt;') !== -1);
  const inv = ctx.renderEmailTemplate_('CF-9', { quarter: 'Winter 2027', url: 'https://x/f' }, common);
  assert.ok(inv.html.indexOf('<a href="https://x/f"') !== -1);
  assert.ok(inv.text.indexOf('Read Your Course Feedback <https://x/f>') !== -1);
});

/* ---------------- Records, PDF, metrics ---------------- */

test('Course Feedback Record: coverage, thin note, calibration view without free text', () => {
  const offerings = [{ submitted: true }, { submitted: true }, { submitted: false }];
  const comments = [
    { course: 'ANTH 512', quarter: 'WIN2027', instructorNames: ['Rowan,Bea'], contact: 'enough', written: 'Meeting', discussion: 'Beyond', literature: 'Meeting',
      strength: 'Clear argument in the final paper.', nextStep: 'Engage the counter-literature.', status: 'RELEASED', releasedAt: '2027-04-09' },
    { course: 'ANTH 310', quarter: 'WIN2027', instructorNames: ['Quill,Ada M'], contact: 'not_enough', status: 'NO_CONTACT', releasedAt: '2027-04-09' }
  ];
  const student = ctx.buildFeedbackRecord_(offerings, comments, [], 'student', '');
  assert.equal(student.coverage, "3 courses; feedback from 1 instructor; 1 'not enough contact'; 1 not received.");
  assert.equal(student.thin, true);
  assert.equal(student.nextSteps.length, 1);
  const cal = ctx.buildFeedbackRecord_(offerings, comments, [], 'calibration', '');
  assert.equal(cal.comments, undefined);
  assert.equal(cal.grid.length, 1);
});

test('21. the PDF model never contains a GPC-only or development field', () => {
  const model = ctx.buildReviewPdfModel_({
    reviewId: 'AR-2027-001', cycle: 2027, studentName: 'Kim Student',
    studentPayload: { research: 'Fieldwork done', gpcOnly: 'SECRET-GPC-NOTE', careerCheckin: 'SECRET-CAREER', signatureName: 'Kim' },
    advisorPayload: { accomplishments: 'Two papers', advisingChallenges: 'SECRET-CHALLENGE', careerSkillsComment: 'SECRET-SKILLS' },
    programPayload: { finalRating: 'Satisfactory', calibrationNotes: 'SECRET-CAL', statusAction: 'Notification', letterText: 'Dear Kim' },
    responsePayload: { acknowledged: true }
  });
  assert.equal(ctx.pdfModelLeaks_(model, ['SECRET-GPC-NOTE', 'SECRET-CAREER', 'SECRET-CHALLENGE', 'SECRET-SKILLS', 'SECRET-CAL']), false);
  assert.equal(model.student.research, 'Fieldwork done');
});

test('24. metrics suppress every count under 5', () => {
  deq(JSON.parse(JSON.stringify(ctx.suppressSmallCounts_({ a: 0, b: 1, c: 4, d: 5, e: 12 }))), { a: 0, b: '<5', c: '<5', d: 5, e: 12 });
});

test('records list courses in date order and label quarters for display', () => {
  const c = (course, quarter) => ({ course, quarter, instructorNames: ['Quill,Ada M'], contact: 'enough', written: 'Meeting', discussion: 'Meeting',
    literature: 'Meeting', strength: 's', nextStep: 'n', status: 'RELEASED', releasedAt: '2027-04-09' });
  const rec = ctx.buildFeedbackRecord_([], [c('ANTH 3', 'WIN2027'), c('ANTH 1', 'AUT2026'), c('ANTH 4', 'SPR2027')], [], 'student', '');
  deq(rec.grid.map(g => g.course), ['ANTH 1', 'ANTH 3', 'ANTH 4']);
  deq(rec.comments.map(g => g.quarterLabel), ['Autumn 2026', 'Winter 2027', 'Spring 2027']);
  assert.ok(ctx.quarterOrder_('WIN2027') < ctx.quarterOrder_('SPR2027') && ctx.quarterOrder_('SPR2027') < ctx.quarterOrder_('AUT2027'));
});

test('Autumn 2026 uses the dates set in Config.gs (last week of classes to the last day of finals)', () => {
  const c = {};
  vm.createContext(c);
  ['Config.gs', 'CoreDates.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), c, { filename: f }));
  const w = JSON.parse(JSON.stringify(vm.runInContext("courseFeedbackWindow_('AUT2026', CONFIG.CF_RELEASE_OFFSET_DAYS, CONFIG.CF_WINDOW_OVERRIDES)", c)));
  deq([w.opens, w.reminders[0], w.reminders[1], w.due, w.release], ['2026-12-07', '2026-12-14', '2026-12-16', '2026-12-18', '2027-01-08']);
  const q = JSON.parse(JSON.stringify(vm.runInContext("quarterDates_('AUT2026')", c)));
  assert.equal(w.due, q.finalsEnd);                       // the last day of finals
  assert.equal(vm.runInContext("weekday_('2026-12-07')", c), 1);   // a Monday, in the week classes end (11 Dec)
  const win = JSON.parse(JSON.stringify(vm.runInContext("courseFeedbackWindow_('WIN2027', CONFIG.CF_RELEASE_OFFSET_DAYS, CONFIG.CF_WINDOW_OVERRIDES)", c)));
  assert.equal(win.opens, '2027-03-15');                  // other quarters keep the usual rule
});
