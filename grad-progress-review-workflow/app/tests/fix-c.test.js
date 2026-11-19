/* Tests for Agent C's fixes: course feedback saving, release, follow-ups, the daily run and the record.
   Run with:  node --test grad-progress-review-workflow/app/tests/
   Each test loads the real .gs files into a vm context and replaces the spreadsheet, email and lock
   services with small in-memory stubs. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..');
const FILES = ['Config.gs', 'CoreDates.gs', 'CoreStates.gs', 'CoreEmail.gs', 'CoreRecords.gs', 'CoreRoster.gs', 'Security.gs',
  'CourseFeedback.gs', 'Automation.gs'];

const ADMIN = 'agp-advisor@uw.edu';
const GPC = 'bmarwick@uw.edu';
const PROF_A = 'proa@uw.edu';
const PROF_B = 'prob@uw.edu';
const TOKEN = '11111111-2222-3333-4444-555555555555';

/* A fresh app with an in-memory spreadsheet. */
function makeApp() {
  const ctx = { console: console };
  vm.createContext(ctx);
  FILES.forEach(function(f) {
    vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx, { filename: f });
  });
  const schema = vm.runInContext('SCHEMA_', ctx);
  const db = {};
  Object.keys(schema).forEach(function(name) { db[name] = []; });
  const state = { db: db, user: PROF_A, today: '2026-12-10', sent: [], audit: [], locksTaken: 0, locksReleased: 0, maLaunches: [], errors: [], ids: 0 };

  const copyRows = function(name) {
    return (db[name] || []).map(function(r, i) { return Object.assign({ _row: i + 2 }, r); });
  };
  ctx.readTable_ = copyRows;
  ctx.findRows_ = function(name, field, value) { return copyRows(name).filter(function(r) { return String(r[field]) === String(value); }); };
  ctx.findOne_ = function(name, field, value) { return ctx.findRows_(name, field, value)[0] || null; };
  ctx.updateRow_ = function(name, rowNum, fields) {
    Object.keys(fields).forEach(function(k) {
      if (schema[name].indexOf(k) === -1) throw new Error('Unknown column ' + k + ' in ' + name);
    });
    Object.assign(db[name][rowNum - 2], fields);
  };
  ctx.appendObjects_ = function(name, objs) {
    objs.forEach(function(o) {
      Object.keys(o).forEach(function(k) {
        if (schema[name].indexOf(k) === -1) throw new Error('Unknown column ' + k + ' in ' + name);
      });
      db[name].push(Object.assign({}, o));
    });
    return 0;
  };
  ctx.splitList_ = function(s) { return String(s || '').split(/[,;\s]+/).map(function(x) { return x.trim().toLowerCase(); }).filter(Boolean); };
  ctx.normEmail_ = function(x) { return String(x || '').trim().toLowerCase(); };
  ctx.todayIso_ = function() { return state.today; };
  ctx.nowIso_ = function() { return state.today + 'T12:00:00.000Z'; };
  ctx.newId_ = function(prefix) { state.ids++; return prefix + '-' + state.ids; };
  ctx.newToken_ = function() { state.ids++; return { token: 'aaaaaaaa-0000-0000-0000-' + String(state.ids).padStart(12, '0'), expiry: '2099-01-01T00:00:00.000Z' }; };
  ctx.parseJson_ = function(s) { try { return JSON.parse(s); } catch (e) { return {}; } };
  ctx.activeEmail_ = function() { return state.user; };
  ctx.checkRateLimit_ = function() { return { allowed: true }; };
  ctx.LockService = { getScriptLock: function() {
    return { waitLock: function() { state.locksTaken++; }, tryLock: function() { state.locksTaken++; return true; }, releaseLock: function() { state.locksReleased++; } };
  } };
  ctx.sendTemplate_ = function(id, to, firstName, params, reference) {
    const out = ctx.renderEmailTemplate_(id, params, { firstName: firstName || 'colleague', gpcName: 'Pat Example', privacyUrl: 'https://p', reference: reference || id });
    state.sent.push({ id: id, to: to, params: params, text: out.text });
    return out;
  };
  ctx.logEvent_ = function(p) { state.audit.push({ Action: p.action, Record_ID: p.evaluationId, Details: JSON.stringify(p.details || {}) }); };
  ctx.queryAuditLog_ = function(filter) {
    return state.audit.filter(function(e) {
      if (filter.evaluationId && e.Record_ID !== filter.evaluationId) return false;
      if (filter.action && e.Action !== filter.action) return false;
      return true;
    });
  };
  ctx.logError_ = function(fn, msg, c) { state.errors.push(fn + ': ' + msg + ' ' + JSON.stringify(c || {})); };
  ctx.logInfo_ = function() {};
  ctx.logWarn_ = function() {};
  ctx.appUrl_ = function(params) { return 'https://app?' + Object.keys(params).map(function(k) { return k + '=' + params[k]; }).join('&'); };
  ctx.firstNameFor_ = function() { return 'Friend'; };
  ctx.studentByEmail_ = function(email) { return ctx.findOne_('Students', 'Email', ctx.normEmail_(email)); };
  ctx.instructorsMap_ = function() { return {}; };
  ctx.pageMissingInstructors_ = function() { return []; };
  ctx.launchMaCheckins_ = function(q, actor) {
    state.maLaunches.push(q);
    ctx.logEvent_({ action: 'LAUNCH', evaluationId: 'MA ' + q, details: {}, actorEmail: actor });
    return 0;
  };
  ctx.pruneOldLogs_ = function() {};
  ctx.assertTriggerOrAdmin_ = function() {};
  return { ctx: ctx, state: state, db: db };
}

/* Adds a page, its students and their enrolments. */
function addPage(app, opts) {
  opts = opts || {};
  const db = app.db;
  db.Feedback_Requests.push({ Request_ID: 'CF-1', Request_Key: 'K1', Quarter: 'AUT2026', Offering: 'ANTH 512 A', Instructor_Names: 'Proa,Ann',
    Instructor_Emails: opts.emails || PROF_A, Status: opts.status || 'SENT', Secure_Token: TOKEN, Token_Expiry: '2099-01-01T00:00:00.000Z',
    Due_Date: '2026-12-18', Reminder_Count: opts.reminderCount || 0, Lock_Owner: '', Lock_Until: '' });
  ['s1@uw.edu', 's2@uw.edu'].forEach(function(em, i) {
    db.Students.push({ Email: em, Name: 'Student ' + (i + 1), Preferred_First: 'S' + (i + 1), Program: 'PHD', Status: 'ACTIVE', Advisor_Emails: 'adv' + (i + 1) + '@uw.edu' });
    db.Enrollments.push({ Quarter: 'AUT2026', Student_Email: em, Curric: 'ANTH', Course_Number: '512', Request_Key: 'K1', Exclusion_Reason: '', Advisee_Of: '' });
  });
}

const goodEntry = { contact: 'enough', written: 'Meeting', discussion: 'Meeting', literature: 'Beyond', strength: 'Clear writing.', nextStep: 'Read more.' };
const plain = function(x) { return JSON.parse(JSON.stringify(x)); };

/* ---------- Item 4: a draft save never changes a comment that is already submitted ---------- */

test('item 4: a draft save leaves a submitted (NO_CONTACT or CHECKED) comment unchanged and saves new drafts', () => {
  const app = makeApp();
  addPage(app, { status: 'SUBMITTED' });
  app.db.Course_Feedback.push({ Feedback_ID: 'FB-a', Request_ID: 'CF-1', Quarter: 'AUT2026', Student_Email: 's1@uw.edu', Contact: 'not_enough', Status: 'NO_CONTACT', Strength: '' });
  app.db.Course_Feedback.push({ Feedback_ID: 'FB-b', Request_ID: 'CF-1', Quarter: 'AUT2026', Student_Email: 's2@uw.edu', Contact: 'enough', Status: 'CHECKED', Strength: 'Checked text', Next_Step: 'n' });
  const res = app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': goodEntry, 's2@uw.edu': Object.assign({}, goodEntry, { strength: 'Unchecked new text' }) } }, false);
  const rows = app.db.Course_Feedback;
  assert.equal(rows[0].Status, 'NO_CONTACT');
  assert.equal(rows[0].Strength, '');
  assert.equal(rows[1].Status, 'CHECKED');
  assert.equal(rows[1].Strength, 'Checked text');
  assert.equal(res.skipped, 2);
});

test('item 4: a draft save still writes a new or DRAFT comment as DRAFT', () => {
  const app = makeApp();
  addPage(app);
  app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': goodEntry } }, false);
  assert.equal(app.db.Course_Feedback.length, 1);
  assert.equal(app.db.Course_Feedback[0].Status, 'DRAFT');
  assert.equal(app.db.Course_Feedback[0].Strength, 'Clear writing.');
  assert.equal(app.db.Feedback_Requests[0].Status, 'DRAFT');
});

/* ---------- Item 5: a failed submit writes nothing ---------- */

test('item 5: a submit with a problem in one entry writes no comment, no follow-up and leaves the page as it was', () => {
  const app = makeApp();
  addPage(app);
  const flagged = Object.assign({}, goodEntry, { followup: true, followupNote: 'Missed two submissions in week 5.' });
  assert.throws(() => app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': flagged, 's2@uw.edu': { contact: 'enough' } }, signature: 'Ann Proa' }, true), /Please/);
  assert.equal(app.db.Course_Feedback.length, 0);
  assert.equal(app.db.Followups.length, 0);
  assert.equal(app.db.Feedback_Requests[0].Status, 'SENT');
});

test('item 5: a submit without a signature writes nothing', () => {
  const app = makeApp();
  addPage(app);
  const flagged = Object.assign({}, goodEntry, { followup: true, followupNote: 'Missed two submissions in week 5.' });
  assert.throws(() => app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': flagged, 's2@uw.edu': goodEntry }, signature: '' }, true), /sign/);
  assert.equal(app.db.Course_Feedback.length, 0);
  assert.equal(app.db.Followups.length, 0);
  assert.equal(app.db.Feedback_Requests[0].Status, 'SENT');
});

test('item 5: a valid submit writes the comments, opens the follow-up and submits the page', () => {
  const app = makeApp();
  addPage(app);
  const flagged = Object.assign({}, goodEntry, { followup: true, followupNote: 'Missed two submissions in week 5.' });
  app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': flagged, 's2@uw.edu': { contact: 'not_enough' } }, signature: 'Ann Proa' }, true);
  assert.deepEqual(app.db.Course_Feedback.map(function(c) { return c.Status; }), ['SUBMITTED', 'NO_CONTACT']);
  assert.equal(app.db.Followups.length, 1);
  assert.equal(app.db.Feedback_Requests[0].Status, 'SUBMITTED');
});

test('item 5: a submit on a closed page with nothing it may change is refused, not marked SUBMITTED', () => {
  const app = makeApp();
  addPage(app, { status: 'CLOSED' });
  assert.throws(() => app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': goodEntry }, signature: 'Ann Proa' }, true), /closed/);
  assert.equal(app.db.Feedback_Requests[0].Status, 'CLOSED');
});

/* ---------- Item 7: "Not my course" only from SENT or DRAFT ---------- */

test('item 7: "Not my course" is refused once the page is submitted or closed', () => {
  ['SUBMITTED', 'CLOSED', 'NOT_MY_COURSE', 'REISSUED'].forEach(function(status) {
    const app = makeApp();
    addPage(app, { status: status });
    assert.throws(() => app.ctx.notMyCourse(TOKEN, 'Someone'), /Not my course|can no longer/, status);
    assert.equal(app.db.Feedback_Requests[0].Status, status);
    assert.equal(app.state.sent.length, 0);
  });
});

test('item 7: "Not my course" works from SENT and DRAFT', () => {
  ['SENT', 'DRAFT'].forEach(function(status) {
    const app = makeApp();
    addPage(app, { status: status });
    app.ctx.notMyCourse(TOKEN, 'Someone');
    assert.equal(app.db.Feedback_Requests[0].Status, 'NOT_MY_COURSE');
  });
});

/* ---------- Item 10: the administrator views without the lock and cannot save ---------- */

test('item 10: the administrator opens a shared page read-only and takes no lock', () => {
  const app = makeApp();
  addPage(app, { emails: PROF_A + ', ' + PROF_B });
  app.state.user = ADMIN;
  const page = app.ctx.loadFeedbackPage(TOKEN);
  assert.equal(page.error, undefined);
  assert.equal(page.viewOnly, true);
  assert.equal(app.db.Feedback_Requests[0].Lock_Owner, '');
  assert.throws(() => app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': goodEntry } }, false), /instructors/);
  assert.throws(() => app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': goodEntry }, signature: 'x' }, true), /instructors/);
  assert.throws(() => app.ctx.notMyCourse(TOKEN, ''), /instructors/);
  assert.equal(app.db.Course_Feedback.length, 0);
  assert.equal(app.db.Feedback_Requests[0].Status, 'SENT');
});

test('item 10: an instructor still takes the lock, and Submit releases it', () => {
  const app = makeApp();
  addPage(app, { emails: PROF_A + ', ' + PROF_B });
  const page = app.ctx.loadFeedbackPage(TOKEN);
  assert.equal(page.viewOnly, false);
  assert.equal(app.db.Feedback_Requests[0].Lock_Owner, PROF_A);
  app.ctx.saveFeedbackPage(TOKEN, { students: { 's1@uw.edu': goodEntry, 's2@uw.edu': goodEntry }, signature: 'Ann Proa' }, true);
  assert.equal(app.db.Feedback_Requests[0].Lock_Owner, '');
  assert.equal(app.db.Feedback_Requests[0].Lock_Until, '');
  app.state.user = PROF_B;
  assert.equal(app.ctx.loadFeedbackPage(TOKEN).readOnlyLock, false);
});

/* ---------- Item 6: CF-2 says when grades are due ---------- */

test('item 6: CF-2 says grades are due, with the date, and never "Grades are in" before the deadline', () => {
  const app = makeApp();
  const common = { firstName: 'Ada', gpcName: 'Pat', privacyUrl: 'https://p', reference: 'R' };
  const before = app.ctx.renderEmailTemplate_('CF-2', { course: 'ANTH 512', url: 'https://x', dueLong: 'Friday 18 December 2026', gradesDueLong: 'Tuesday 22 December 2026', gradesDuePassed: false }, common);
  assert.ok(before.text.indexOf('Grades are due Tuesday 22 December 2026') !== -1, before.text);
  assert.equal(before.text.indexOf('Grades are in'), -1);
  const after = app.ctx.renderEmailTemplate_('CF-2', { course: 'ANTH 512', url: 'https://x', dueLong: 'Friday 2 April 2027', gradesDueLong: 'Tuesday 23 March 2027', gradesDuePassed: true }, common);
  assert.ok(after.text.indexOf('Grades were due Tuesday 23 March 2027') !== -1, after.text);
  const bare = app.ctx.renderEmailTemplate_('CF-2', { course: 'ANTH 512', url: 'https://x', dueLong: 'Friday 2 April 2027' }, common);
  assert.equal(bare.text.indexOf('Grades are in'), -1);
  assert.equal(bare.text.indexOf('undefined'), -1);
});

test('item 6: in Autumn 2026 CF-2 goes out on 14 Dec, before grades are due (22 Dec), and says so', () => {
  const app = makeApp();
  addPage(app);
  app.state.today = '2026-12-14';
  app.ctx.runCourseFeedbackSchedule_('2026-12-14');
  assert.equal(app.state.sent.length, 1);
  assert.equal(app.state.sent[0].id, 'CF-2');
  assert.ok(app.state.sent[0].text.indexOf('Grades are due Tuesday 22 December 2026') !== -1, app.state.sent[0].text);
});

/* ---------- Item 8: a re-sent page keeps instructor names ---------- */

test('item 8: reissueRequest fills Instructor_Names from the Instructors sheet', () => {
  const app = makeApp();
  addPage(app, { status: 'NOT_MY_COURSE' });
  app.db.Instructors.push({ TS_Name: 'Prob,Ben', Email: PROF_B, Appointment: 'Faculty' });
  app.state.user = ADMIN;
  app.ctx.reissueRequest('CF-1', PROF_B + ', newperson@uw.edu');
  const added = app.db.Feedback_Requests[1];
  assert.equal(added.Instructor_Names, 'Prob,Ben / newperson@uw.edu');
});

/* ---------- Items 11 and 24: release emails and the lock ---------- */

test('item 11: releaseQuarter emails only students with something to read, and advisors only for comments they can see', () => {
  const app = makeApp();
  app.state.user = GPC;
  const db = app.db;
  ['a', 'b', 'c'].forEach(function(x) {
    db.Students.push({ Email: x + '@uw.edu', Name: x, Preferred_First: x, Advisor_Emails: 'adv-' + x + '@uw.edu', Status: 'ACTIVE' });
  });
  db.Course_Feedback.push({ Feedback_ID: 'F1', Quarter: 'AUT2026', Student_Email: 'a@uw.edu', Contact: 'not_enough', Status: 'NO_CONTACT' });
  db.Course_Feedback.push({ Feedback_ID: 'F2', Quarter: 'AUT2026', Student_Email: 'b@uw.edu', Contact: 'enough', Status: 'CHECKED' });
  db.Course_Feedback.push({ Feedback_ID: 'F3', Quarter: 'AUT2026', Student_Email: 'b@uw.edu', Contact: 'not_enough', Status: 'NO_CONTACT' });
  db.Course_Feedback.push({ Feedback_ID: 'F4', Quarter: 'AUT2026', Student_Email: 'c@uw.edu', Contact: 'enough', Status: 'RETURNED' });
  const n = app.ctx.releaseQuarter('AUT2026');
  const cf9 = app.state.sent.filter(function(s) { return s.id === 'CF-9'; }).map(function(s) { return s.to; }).sort();
  const cf10 = app.state.sent.filter(function(s) { return s.id === 'CF-10'; }).map(function(s) { return s.to; });
  assert.deepEqual(cf9, ['b@uw.edu', 'c@uw.edu']);
  assert.deepEqual(cf10, ['adv-b@uw.edu']);
  assert.equal(n, 2);
  assert.ok(db.Course_Feedback[0].Released_At, 'NO_CONTACT rows are still released for the coverage line');
  assert.equal(db.Course_Feedback[3].Status, 'STUDENT_ONLY');
});

test('item 24: releaseQuarter holds the script lock while it releases', () => {
  const app = makeApp();
  app.state.user = GPC;
  app.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  app.db.Course_Feedback.push({ Feedback_ID: 'F2', Quarter: 'AUT2026', Student_Email: 'b@uw.edu', Contact: 'enough', Status: 'CHECKED' });
  app.ctx.releaseQuarter('AUT2026');
  assert.equal(app.state.locksTaken, 1);
  assert.equal(app.state.locksReleased, 1);
  app.ctx.releaseQuarter('AUT2026');
  assert.equal(app.state.sent.filter(function(s) { return s.id === 'CF-9'; }).length, 1, 'a second click sends nothing new');
});

/* ---------- Item 12: "covered in my annual review" is not "not enough contact" ---------- */

test('item 12: the coverage line counts "covered in the annual review" separately', () => {
  const app = makeApp();
  const offerings = [{ submitted: true }, { submitted: true }];
  const comments = [
    { course: 'ANTH 1', quarter: 'AUT2026', contact: 'covered', status: 'NO_CONTACT', releasedAt: '2027-01-08' },
    { course: 'ANTH 2', quarter: 'AUT2026', contact: 'not_enough', status: 'NO_CONTACT', releasedAt: '2027-01-08' }
  ];
  const rec = app.ctx.buildFeedbackRecord_(offerings, comments, [], 'student', '');
  assert.equal(rec.coverage, "2 courses; feedback from 0 instructors; 1 'not enough contact'; 1 covered in the advisor's annual review; 0 not received.");
});

/* ---------- Item 13: checking a revised comment after release, and resolving a student-only one ---------- */

/* Pulls the actionsFor(c) function out of ReviewRelease.html and runs it. */
function releaseActions() {
  const html = fs.readFileSync(path.join(APP, 'ReviewRelease.html'), 'utf8');
  const m = html.match(/function actionsFor\(c\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 'ReviewRelease.html defines actionsFor(c)');
  const c = { esc: function(s) { return String(s); } };
  vm.createContext(c);
  vm.runInContext(m[0], c);
  return c.actionsFor;
}

test('item 13: the release page offers Check/Return for REVISED_AFTER_RELEASE and Resolve for STUDENT_ONLY', () => {
  const actionsFor = releaseActions();
  const revised = actionsFor({ id: 'F1', status: 'REVISED_AFTER_RELEASE', released: true });
  assert.ok(revised.indexOf('data-check="F1"') !== -1);
  assert.ok(revised.indexOf('data-return="F1"') !== -1);
  const studentOnly = actionsFor({ id: 'F2', status: 'STUDENT_ONLY', released: true });
  assert.ok(studentOnly.indexOf('data-resolve="F2"') !== -1);
  const released = actionsFor({ id: 'F3', status: 'RELEASED', released: true });
  assert.equal(released.indexOf('data-check'), -1);
  assert.ok(released.indexOf('Released') !== -1);
});

test('item 13: resolveComment moves STUDENT_ONLY to RESOLVED and refuses other states', () => {
  const app = makeApp();
  app.state.user = GPC;
  app.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  app.db.Course_Feedback.push({ Feedback_ID: 'F1', Quarter: 'AUT2026', Student_Email: 'b@uw.edu', Contact: 'enough', Status: 'STUDENT_ONLY', Released_At: 'x' });
  app.db.Course_Feedback.push({ Feedback_ID: 'F2', Quarter: 'AUT2026', Student_Email: 'b@uw.edu', Contact: 'enough', Status: 'CHECKED' });
  app.ctx.resolveComment('F1');
  assert.equal(app.db.Course_Feedback[0].Status, 'RESOLVED');
  assert.throws(() => app.ctx.resolveComment('F2'), /cannot/);
});

/* ---------- Item 14: CF-7 to an advisor does not promise a note they cannot open ---------- */

test('item 14: CF-7 to an advisor does not say the note is in the app or link to the advisor view', () => {
  const app = makeApp();
  app.state.today = '2026-12-12';
  app.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  app.db.Followups.push({ Followup_ID: 'FU-1', Feedback_ID: 'F1', Student_Email: 'b@uw.edu', Quarter: 'AUT2026', Opened_At: '2026-12-10', Handled_By: GPC, Status: 'OPEN' });
  app.ctx.runFollowups_('2026-12-12');
  const toAdvisor = app.state.sent.filter(function(s) { return s.to === 'adv@uw.edu'; })[0];
  const toGpc = app.state.sent.filter(function(s) { return s.to === GPC; })[0];
  assert.ok(toAdvisor && toGpc);
  assert.equal(toAdvisor.text.indexOf('note is in the app'), -1, toAdvisor.text);
  assert.equal(toAdvisor.text.indexOf('view=advisor'), -1, toAdvisor.text);
  assert.ok(toGpc.text.indexOf('Open the note') !== -1);
});

/* ---------- Item 15: one-day tasks catch up after a missed daily run ---------- */

test('item 15: CF-2 catches up the day after a missed run, once', () => {
  const app = makeApp();
  addPage(app);
  app.ctx.runCourseFeedbackSchedule_('2026-12-15');
  app.ctx.runCourseFeedbackSchedule_('2026-12-15');
  assert.deepEqual(app.state.sent.map(function(s) { return s.id; }), ['CF-2']);
  assert.equal(app.db.Feedback_Requests[0].Reminder_Count, 1);
});

test('item 15: when both reminder days were missed, only CF-3 is sent', () => {
  const app = makeApp();
  addPage(app);
  app.ctx.runCourseFeedbackSchedule_('2026-12-17');
  app.ctx.runCourseFeedbackSchedule_('2026-12-18');
  assert.deepEqual(app.state.sent.map(function(s) { return s.id; }), ['CF-3']);
  assert.equal(app.db.Feedback_Requests[0].Reminder_Count, 2);
});

test('item 15: the normal schedule still sends CF-2 then CF-3, once each', () => {
  const app = makeApp();
  addPage(app);
  ['2026-12-13', '2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18'].forEach(function(d) { app.ctx.runCourseFeedbackSchedule_(d); });
  assert.deepEqual(app.state.sent.map(function(s) { return s.id; }), ['CF-2', 'CF-3']);
});

test('item 15: a page sent after a reminder date does not get that reminder at once', () => {
  const app = makeApp();
  addPage(app, { status: 'NOT_STARTED' });
  app.state.user = ADMIN;
  app.state.today = '2026-12-15';
  app.ctx.launchCourseFeedback_('AUT2026', ADMIN);
  assert.equal(app.db.Feedback_Requests[0].Reminder_Count, 1);
  app.state.sent = [];
  app.ctx.runCourseFeedbackSchedule_('2026-12-15');
  assert.equal(app.state.sent.length, 0);
  app.ctx.runCourseFeedbackSchedule_('2026-12-16');
  assert.deepEqual(app.state.sent.map(function(s) { return s.id; }), ['CF-3']);
});

test('item 15: MA check-ins launch on a later day if the opening day was missed, and only once', () => {
  const app = makeApp();
  app.ctx.runMaLaunch_('2026-12-09');
  app.ctx.runMaLaunch_('2026-12-10');
  assert.deepEqual(plain(app.state.maLaunches), ['AUT2026']);
  const early = makeApp();
  early.ctx.runMaLaunch_('2026-12-04');
  assert.equal(early.state.maLaunches.length, 0);
});

test('item 15: the Alert reminder (AR-11) catches up before the deadline, once per reviewer', () => {
  const app = makeApp();
  app.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  app.db.Reviews.push({ Review_ID: 'R1', Student_Email: 'b@uw.edu', Alert_Quarter: 'WIN2027', Alert_Sent_Date: '' });
  const d = plain(app.ctx.alertDeadline_('WIN2027'));
  const dayAfter = app.ctx.addDays_(d.remindOn, 1);
  app.ctx.runAlertReminders_(dayAfter);
  app.ctx.runAlertReminders_(app.ctx.addDays_(d.remindOn, 2));
  assert.deepEqual(app.state.sent.map(function(s) { return s.id; }), ['AR-11']);
  const late = makeApp();
  late.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  late.db.Reviews.push({ Review_ID: 'R1', Student_Email: 'b@uw.edu', Alert_Quarter: 'WIN2027', Alert_Sent_Date: '' });
  late.ctx.runAlertReminders_(late.ctx.addDays_(d.due, 1));
  assert.equal(late.state.sent.length, 0);
});

test('item 15: the calibration notice (AR-5) catches up during the calibration weeks, once', () => {
  const app = makeApp();
  app.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Subfield: 'Archaeology', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  app.db.Reviews.push({ Review_ID: 'R1', Type: 'ANNUAL', Cycle: 2027, Student_Email: 'b@uw.edu', Status: 'PROGRAM_PENDING' });
  const dates = plain(app.ctx.annualCycleDates_(2027));
  app.ctx.runCalibrationNotice_(app.ctx.addDays_(dates.calibrationFrom, 1));
  app.ctx.runCalibrationNotice_(app.ctx.addDays_(dates.calibrationFrom, 2));
  assert.deepEqual(app.state.sent.map(function(s) { return s.id; }), ['AR-5']);
  const late = makeApp();
  late.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Subfield: 'Archaeology', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  late.db.Reviews.push({ Review_ID: 'R1', Type: 'ANNUAL', Cycle: 2027, Student_Email: 'b@uw.edu', Status: 'PROGRAM_PENDING' });
  late.ctx.runCalibrationNotice_(late.ctx.addDays_(dates.calibrationTo, 1));
  assert.equal(late.state.sent.length, 0);
});

/* ---------- Item 20: the acknowledgement stage escalates ---------- */

test('item 20: an overdue acknowledgement stage escalates after two reminders, with AR-9 naming the stage', () => {
  const app = makeApp();
  app.db.Students.push({ Email: 'b@uw.edu', Name: 'b', Advisor_Emails: 'adv@uw.edu', Status: 'ACTIVE' });
  app.db.Reviews.push({ Review_ID: 'R1', Type: 'INTERIM', Program: 'PHD', Student_Email: 'b@uw.edu', Status: 'STUDENT_ACK_PENDING',
    Due_Date: '2027-01-15', Reminder_Count: 2, Last_Reminder: '2027-01-10' });
  app.ctx.runReviewReminders_('2027-01-20');
  assert.equal(app.db.Reviews[0].Status, 'ESCALATED');
  assert.equal(app.db.Reviews[0].Escalated_From, 'STUDENT_ACK_PENDING');
  const ar9 = app.state.sent.filter(function(s) { return s.id === 'AR-9'; })[0];
  assert.ok(ar9 && ar9.text.indexOf('acknowledgement stage') !== -1);
});

/* ---------- Item 26: open follow-up flags are not shown to the student ---------- */

test('item 26: a follow-up with no recorded outcome is hidden from the student and the PDF, shown to advisor and calibration', () => {
  const app = makeApp();
  const followups = [
    { quarter: 'AUT2026', outcome: '', contactDate: '', status: 'OPEN' },
    { quarter: 'AUT2026', outcome: 'Discussed', contactDate: '2026-12-20', status: 'CLOSED' }
  ];
  assert.equal(app.ctx.buildFeedbackRecord_([], [], followups, 'student', '').flags.length, 1);
  assert.equal(app.ctx.buildFeedbackRecord_([], [], followups, 'pdf', '').flags.length, 1);
  assert.equal(app.ctx.buildFeedbackRecord_([], [], followups, 'advisor', '').flags.length, 2);
  assert.equal(app.ctx.buildFeedbackRecord_([], [], followups, 'calibration', '').flags.length, 2);
});
