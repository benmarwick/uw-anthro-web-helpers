/* Agent B fixes: review items 3 (graduate-student instructors) and 9 (CF-1 for addresses added late).
   Run with:  node --test grad-progress-review-workflow/app/tests/
   Loads the real CoreRoster.gs and RosterImport.gs into a vm context. The sheet helpers are an in-memory
   copy of Sheets.gs (same row numbering, same splitList_/normEmail_ rules). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..');
const plain = x => JSON.parse(JSON.stringify(x));

const SHEETS = { INSTRUCTORS: 'Instructors', REQUESTS: 'Feedback_Requests', ENROLLMENTS: 'Enrollments', STUDENTS: 'Students' };

/* A fresh app with the given tables. Returns the vm context, the tables and the emails sent. */
function makeApp(tables) {
  const sent = [];
  const today = '2026-12-16';
  const ctx = {
    tables: tables,
    C_: () => ({ SHEETS: SHEETS, CF_ALL_DEPARTMENTS: true, CF_CURRICULA_PHASE1: ['ANTH'], ACTIONS: { ROSTER_IMPORTED: 'ROSTER_IMPORTED' } }),
    readTable_: name => (tables[name] || []).map((r, i) => Object.assign({ _row: i + 2 }, r)),
    updateRow_: (name, rowNum, fields) => { Object.assign(tables[name][rowNum - 2], fields); },
    appendObjects_: (name, objs) => { objs.forEach(o => tables[name].push(Object.assign({}, o))); return 0; },
    getSheetCached_: name => ({ deleteRow: rowNum => tables[name].splice(rowNum - 2, 1) }),
    invalidateTable_: () => {},
    /* Copies of Sheets.gs. */
    splitList_: s => String(s || '').split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean),
    normEmail_: x => String(x || '').trim().toLowerCase(),
    findOne_: (name, field, value) => ctx.readTable_(name).filter(r => String(r[field]) === String(value))[0] || null,
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    SpreadsheetApp: { flush: () => {} },
    assertAdminOrGpc_: () => 'admin@uw.edu',
    logEvent_: () => {},
    nowIso_: () => today + 'T10:00:00Z',
    todayIso_: () => today,
    newId_: p => p + '-' + Math.random().toString(36).slice(2, 8),
    quarterLabel_: q => q,
    dateLong_: d => 'long ' + d,
    appUrl_: p => 'https://app/?f=' + p.f + (p.nmc ? '&nmc=1' : ''),
    firstNameFor_: () => 'colleague',
    daysBetween_: (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000),
    sendTemplate_: (id, to, firstName, params, reference) => { sent.push({ id: id, to: to, params: params, reference: reference }); return {}; }
  };
  vm.createContext(ctx);
  ['CoreRoster.gs', 'RosterImport.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx, { filename: f }));
  /* Copies of CourseFeedback.gs (not owned by this agent, and being edited by others). */
  vm.runInContext(`
    function activeStudentsForRequest_(req) {
      return readTable_(C_().SHEETS.ENROLLMENTS).filter(function(e) {
        return e.Request_Key === req.Request_Key && e.Quarter === req.Quarter && !e.Exclusion_Reason;
      });
    }
    function pageClosed_(r) { return r.Status === 'CLOSED' || r.Status === 'NOT_MY_COURSE' || (r.Due_Date && daysBetween_(r.Due_Date, todayIso_()) > 0); }
  `, ctx);
  return { ctx: ctx, tables: tables, sent: sent };
}

/* ---------------- Item 3: graduate-student instructors (CoreRoster.gs) ---------------- */

function roster() {
  const ctx = makeApp({}).ctx;
  return function(sectionInstructors, instructors) {
    const rows = [{ quarter: 'AUT2026', studentEmail: 's1@uw.edu', curric: 'ANTH', number: '512', section: 'A', grade: '' }];
    const sections = [{ quarter: 'AUT2026', curric: 'ANTH', number: '512', section: 'A', sln: '1', type: 'SM', instructors: sectionInstructors, joint: false, meeting: 'MW' }];
    const students = { 's1@uw.edu': { status: 'ACTIVE', program: 'PHD', advisorEmails: [] } };
    return plain(ctx.joinRegistrations_(rows, sections, students, instructors, {}));
  };
}

test('item 3: a graduate-student instructor with no email is excluded, not asked for an email', () => {
  const res = roster()(['Grad,Gail'], { 'GRAD,GAIL': { email: '', appointment: 'graduate student' } });
  assert.equal(res.enrollments[0].exclusionReason, 'Instructor is a graduate student');
  assert.deepEqual(res.missingInstructors, []);
  assert.equal(res.canLaunch, true);
  assert.equal(res.requests.length, 0);
});

test('item 3: faculty with no email plus a grad co-instructor is a page waiting for the faculty email', () => {
  const res = roster()(['Prof,Pat', 'Grad,Gail'], {
    'PROF,PAT': { email: '', appointment: 'faculty' },
    'GRAD,GAIL': { email: 'gail@uw.edu', appointment: 'graduate student' }
  });
  assert.equal(res.enrollments[0].exclusionReason, '');
  assert.deepEqual(res.missingInstructors, ['Prof,Pat']);
  assert.equal(res.canLaunch, false);
  assert.equal(res.requests.length, 1);
  assert.deepEqual(res.requests[0].instructorEmails, []);
});

test('item 3: faculty with an email plus a grad co-instructor with no email goes to the faculty only', () => {
  const res = roster()(['Prof,Pat', 'Grad,Gail'], {
    'PROF,PAT': { email: 'pat@uw.edu', appointment: 'faculty' },
    'GRAD,GAIL': { email: '', appointment: 'graduate student' }
  });
  assert.equal(res.enrollments[0].exclusionReason, '');
  assert.deepEqual(res.missingInstructors, []);
  assert.equal(res.canLaunch, true);
  assert.deepEqual(res.requests[0].instructorEmails, ['pat@uw.edu']);
});

test('item 3: preview uses the CEC appointment for a name not yet in Instructors', () => {
  const app = makeApp({ Instructors: [], Students: [{ Email: 's1@uw.edu', Status: 'ACTIVE', Program: 'PHD', Advisor_Emails: '' }] });
  const mygrad = { type: 'mygrad-data', mode: 'registrations', quarter: 'AUT2026',
    registrations: [{ quarter: 'AUT2026', studentEmail: 's1@uw.edu', curric: 'ANTH', number: '512', section: 'A', grade: '' }] };
  const tsData = { type: 'ts-sections', quarter: 'AUT2026', appointments: { 'GRAD,GAIL': { appointment: 'graduate student', quarter: 'AUT2025' } },
    sections: [{ quarter: 'AUT2026', curric: 'ANTH', number: '512', section: 'A', sln: '1', type: 'SM', instructors: ['Grad,Gail'], joint: false, meeting: 'MW' }] };
  const p = plain(app.ctx.previewCourseFeedback('AUT2026', mygrad, tsData));
  assert.deepEqual(p.missingInstructors, []);
  assert.equal(p.pages.length, 0);
});

test('item 3: saveInstructor never puts a graduate student\'s email on a page', () => {
  const app = makeApp({
    Instructors: [{ TS_Name: 'Grad,Gail', Email: '', Appointment: 'graduate student', Appointment_Source: 'CEC AUT2025' }],
    Feedback_Requests: [{ Request_ID: 'CF-1', Quarter: 'AUT2026', Instructor_Names: 'Grad,Gail', Instructor_Emails: '', Status: 'NOT_STARTED' }]
  });
  const out = plain(app.ctx.saveInstructor('Grad,Gail', 'gail@uw.edu', ''));
  assert.equal(out.pages, 0);
  assert.equal(app.tables.Feedback_Requests[0].Instructor_Emails, '');
  /* Marked as a graduate student on the form: also kept off the page. */
  const app2 = makeApp({
    Instructors: [{ TS_Name: 'Grad,Gail', Email: '', Appointment: '', Appointment_Source: '' }],
    Feedback_Requests: [{ Request_ID: 'CF-1', Quarter: 'AUT2026', Instructor_Names: 'Prof,Pat / Grad,Gail', Instructor_Emails: 'pat@uw.edu', Status: 'NOT_STARTED' }]
  });
  app2.ctx.saveInstructor('Grad,Gail', 'gail@uw.edu', 'graduate student');
  assert.equal(app2.tables.Feedback_Requests[0].Instructor_Emails, 'pat@uw.edu');
  assert.equal(app2.tables.Instructors[0].Appointment, 'graduate student');
});

test('item 3: saveInstructor accepts a graduate student with no email; faculty still need one', () => {
  const app = makeApp({ Instructors: [{ TS_Name: 'Grad,Gail', Email: '', Appointment: '' }], Feedback_Requests: [] });
  app.ctx.saveInstructor('Grad,Gail', '', 'graduate student');
  assert.equal(app.tables.Instructors[0].Appointment, 'graduate student');
  assert.throws(() => app.ctx.saveInstructor('Prof,Pat', '', 'faculty'), /uw\.edu/);
});

test('item 3: addCoInstructor refuses a graduate-student instructor\'s address', () => {
  const app = makeApp({
    Instructors: [{ TS_Name: 'Grad,Gail', Email: 'gail@uw.edu', Appointment: 'graduate student' }],
    Feedback_Requests: [{ Request_ID: 'CF-1', Quarter: 'AUT2026', Instructor_Names: 'Prof,Pat', Instructor_Emails: 'pat@uw.edu', Status: 'NOT_STARTED' }]
  });
  assert.throws(() => app.ctx.addCoInstructor('CF-1', 'Gail@uw.edu'), /graduate student/);
  assert.equal(app.tables.Feedback_Requests[0].Instructor_Emails, 'pat@uw.edu');
});

/* ---------------- Item 9: addresses added to a page already sent get CF-1 ---------------- */

function sentPage(status, extra) {
  return Object.assign({ Request_ID: 'CF-1', Request_Key: 'AUT2026|PROF,PAT|ANTH 512', Quarter: 'AUT2026', Offering: 'ANTH 512',
    Instructor_Names: 'Prof,Pat', Instructor_Emails: 'pat@uw.edu', Status: status, Secure_Token: 'tok123', Due_Date: '2027-01-08' }, extra || {});
}
const enrolled = [{ Quarter: 'AUT2026', Student_Email: 's1@uw.edu', Request_Key: 'AUT2026|PROF,PAT|ANTH 512', Exclusion_Reason: '' },
                  { Quarter: 'AUT2026', Student_Email: 's2@uw.edu', Request_Key: 'AUT2026|PROF,PAT|ANTH 512', Exclusion_Reason: '' }];

test('item 9: addCoInstructor on a SENT page sends CF-1 to the new address only, with the page link', () => {
  const app = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('SENT')] });
  app.ctx.addCoInstructor('CF-1', 'Co@uw.edu');
  assert.equal(app.tables.Feedback_Requests[0].Instructor_Emails, 'pat@uw.edu, co@uw.edu');
  assert.equal(app.sent.length, 1);
  assert.equal(app.sent[0].id, 'CF-1');
  assert.equal(app.sent[0].to, 'co@uw.edu');
  assert.equal(app.sent[0].params.url, 'https://app/?f=tok123');
  assert.equal(app.sent[0].params.n, 2);
  assert.equal(app.sent[0].params.dueLong, 'long 2027-01-08');
  /* Adding the same address again sends nothing. */
  app.ctx.addCoInstructor('CF-1', 'co@uw.edu');
  assert.equal(app.sent.length, 1);
});

test('item 9: addCoInstructor on a DRAFT page sends CF-1; on a NOT_STARTED page it waits for Launch', () => {
  const draft = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('DRAFT')] });
  draft.ctx.addCoInstructor('CF-1', 'co@uw.edu');
  assert.equal(draft.sent.length, 1);
  const waiting = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('NOT_STARTED', { Secure_Token: '', Due_Date: '' })] });
  waiting.ctx.addCoInstructor('CF-1', 'co@uw.edu');
  assert.equal(waiting.sent.length, 0);
  assert.equal(waiting.tables.Feedback_Requests[0].Instructor_Emails, 'pat@uw.edu, co@uw.edu');
});

test('item 9: a SUBMITTED page still open sends CF-1 (co-instructors may edit until it closes)', () => {
  const app = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('SUBMITTED')] });
  app.ctx.addCoInstructor('CF-1', 'co@uw.edu');
  assert.equal(app.sent.length, 1);
});

test('item 9: a page replaced after "Not my course" (REISSUED) refuses a co-instructor and sends nothing', () => {
  const app = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('REISSUED')] });
  assert.throws(() => app.ctx.addCoInstructor('CF-1', 'co@uw.edu'), /closed/);
  assert.equal(app.ctx.sendLateInvitations_(app.ctx.readTable_('Feedback_Requests')[0], ['co@uw.edu']), 0);
  assert.equal(app.sent.length, 0);
});

test('item 3: marking someone a graduate student takes their address off unsent pages', () => {
  const app = makeApp({
    Instructors: [{ TS_Name: 'Grad,Gail', Email: 'gail@uw.edu', Appointment: 'faculty' }],
    Feedback_Requests: [{ Request_ID: 'CF-1', Quarter: 'AUT2026', Instructor_Names: 'Prof,Pat / Grad,Gail', Instructor_Emails: 'pat@uw.edu, gail@uw.edu', Status: 'NOT_STARTED' },
                        sentPage('SENT', { Instructor_Emails: 'pat@uw.edu, gail@uw.edu' })]
  });
  app.ctx.saveInstructor('Grad,Gail', '', 'graduate student');
  assert.equal(app.tables.Feedback_Requests[0].Instructor_Emails, 'pat@uw.edu');
  assert.equal(app.tables.Feedback_Requests[1].Instructor_Emails, 'pat@uw.edu, gail@uw.edu');
  assert.equal(app.tables.Instructors[0].Email, 'gail@uw.edu');
});

test('item 9: addCoInstructor refuses a closed page instead of sending a dead link', () => {
  const closed = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('CLOSED')] });
  assert.throws(() => closed.ctx.addCoInstructor('CF-1', 'co@uw.edu'), /closed/);
  const pastDue = makeApp({ Instructors: [], Enrollments: enrolled.slice(), Feedback_Requests: [sentPage('SENT', { Due_Date: '2026-12-01' })] });
  assert.throws(() => pastDue.ctx.addCoInstructor('CF-1', 'co@uw.edu'), /closed/);
  assert.equal(closed.sent.length + pastDue.sent.length, 0);
});

function importData(instructorNames) {
  return {
    mygrad: { type: 'mygrad-data', mode: 'registrations', quarter: 'AUT2026', registrations: [
      { quarter: 'AUT2026', studentEmail: 's1@uw.edu', curric: 'ANTH', number: '512', section: 'A', grade: '' },
      { quarter: 'AUT2026', studentEmail: 's2@uw.edu', curric: 'ANTH', number: '512', section: 'A', grade: '' }] },
    tsData: { type: 'ts-sections', quarter: 'AUT2026', appointments: {},
      sections: [{ quarter: 'AUT2026', curric: 'ANTH', number: '512', section: 'A', sln: '1', type: 'SM', instructors: instructorNames, joint: false, meeting: 'MW' }] }
  };
}
const students2 = [{ Email: 's1@uw.edu', Status: 'ACTIVE', Program: 'PHD', Advisor_Emails: '' }, { Email: 's2@uw.edu', Status: 'ACTIVE', Program: 'PHD', Advisor_Emails: '' }];

test('item 9: re-import that adds an address to a SENT page sends that address CF-1, once', () => {
  /* Pat's page went out with only Pat's address; a second address for Pat (e.g. corrected in Instructors) arrives on re-import. */
  const app = makeApp({
    Instructors: [{ TS_Name: 'Prof,Pat', Email: 'Pat.New@uw.edu', Appointment: 'faculty' }],
    Students: students2.slice(), Enrollments: [], Feedback_Requests: [sentPage('SENT')]
  });
  const d = importData(['Prof,Pat']);
  app.ctx.importCourseFeedback('AUT2026', d.mygrad, d.tsData);
  assert.equal(app.tables.Feedback_Requests[0].Instructor_Emails, 'pat@uw.edu, pat.new@uw.edu');
  assert.equal(app.sent.length, 1);
  assert.equal(app.sent[0].to, 'pat.new@uw.edu');
  assert.equal(app.sent[0].params.n, 2);
  /* A repeat import changes nothing and sends nothing. */
  app.ctx.importCourseFeedback('AUT2026', d.mygrad, d.tsData);
  assert.equal(app.sent.length, 1);
});

test('item 9: re-import onto a NOT_STARTED page sends nothing', () => {
  const app = makeApp({
    Instructors: [{ TS_Name: 'Prof,Pat', Email: 'pat.new@uw.edu', Appointment: 'faculty' }],
    Students: students2.slice(), Enrollments: [], Feedback_Requests: [sentPage('NOT_STARTED', { Secure_Token: '' })]
  });
  const d = importData(['Prof,Pat']);
  app.ctx.importCourseFeedback('AUT2026', d.mygrad, d.tsData);
  assert.equal(app.sent.length, 0);
});

test('item 9: re-import does not put the original instructor back on a page re-sent after "Not my course"', () => {
  const app = makeApp({
    Instructors: [{ TS_Name: 'Prof,Pat', Email: 'pat@uw.edu', Appointment: 'faculty' }],
    Students: students2.slice(), Enrollments: [],
    Feedback_Requests: [sentPage('REISSUED'), sentPage('SENT', { Request_ID: 'CF-2', Instructor_Names: '', Instructor_Emails: 'right@uw.edu', Secure_Token: 'tok456' })]
  });
  const d = importData(['Prof,Pat']);
  app.ctx.importCourseFeedback('AUT2026', d.mygrad, d.tsData);
  assert.equal(app.tables.Feedback_Requests[1].Instructor_Emails, 'right@uw.edu');
  assert.equal(app.sent.length, 0);
});
