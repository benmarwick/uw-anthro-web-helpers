/* Agent D fixes: annual review loading and saving, escalation actions, interim check-ins,
   PDF finishing, the program page and the CV (review items 16-24, 26).
   Run with:  node --test grad-progress-review-workflow/app/tests/
   The .gs files run in a vm context against a small in-memory spreadsheet. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const APP = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');

/* ---------- A tiny fake spreadsheet ---------- */

function makeRange(data, row, col, nr, nc) {
  const api = {
    getValues() {
      const out = [];
      for (let i = 0; i < nr; i++) {
        const line = [];
        for (let j = 0; j < nc; j++) {
          const r = data[row - 1 + i] || [];
          line.push(r[col - 1 + j] === undefined ? '' : r[col - 1 + j]);
        }
        out.push(line);
      }
      return out;
    },
    getValue() { return api.getValues()[0][0]; },
    setValues(vals) {
      vals.forEach((line, i) => {
        if (!data[row - 1 + i]) data[row - 1 + i] = [];
        line.forEach((v, j) => { data[row - 1 + i][col - 1 + j] = v; });
      });
      return proxy;
    },
    setValue(v) { return api.setValues([[v]]); }
  };
  /* Any other range method (formats, fonts) is accepted and ignored. */
  const proxy = new Proxy(api, { get(t, p) { return p in t ? t[p] : () => proxy; } });
  return proxy;
}

function makeSheet(headers) {
  const data = [headers.slice()];
  const width = () => Math.max(...data.map(r => r.length));
  const api = {
    data: data,
    getDataRange() { return makeRange(data, 1, 1, data.length, width()); },
    getLastRow() { return data.length; },
    getLastColumn() { return width(); },
    getRange(r, c, nr, nc) { return makeRange(data, r, c, nr || 1, nc || 1); },
    appendRow(r) { data.push(r.slice()); }
  };
  const proxy = new Proxy(api, { get(t, p) { return p in t ? t[p] : () => proxy; } });
  return proxy;
}

/* ---------- The context ---------- */

function setup() {
  const env = { user: '', sent: [], events: [], enqueued: [], pdfCalls: [], lockHook: null, pdfFails: false, viewers: [], cache: {} };
  const ctx = {
    console: console,
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, fmt) => {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        if (fmt === 'yyyy-MM-dd') return parts;
        if (fmt === 'yyyyMMdd') return parts.replace(/-/g, '');
        return parts;
      },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s).digest()),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
      DigestAlgorithm: { SHA_256: 'SHA_256' }
    },
    CacheService: { getScriptCache: () => ({ get: k => env.cache[k] || null, put: (k, v) => { env.cache[k] = v; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => env.user }), getEffectiveUser: () => ({ getEmail: () => 'owner@uw.edu' }) },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => { if (env.lockHook) env.lockHook(); },
        tryLock: () => { if (env.lockHook) env.lockHook(); return true; },
        releaseLock: () => {},
        hasLock: () => true
      })
    },
    DriveApp: {
      getFolderById: () => ({ createFile: blob => ({ getId: () => 'cvfile1', addViewer: e => env.viewers.push(e) }) }),
      getFileById: id => ({ getUrl: () => 'https://drive.example/' + id, addViewer: e => env.viewers.push(e) })
    }
  };
  vm.createContext(ctx);
  ['Config.gs', 'Sheets.gs', 'CoreDates.gs', 'CoreStates.gs', 'CoreRecords.gs', 'CoreEmail.gs', 'Security.gs', 'Reviews.gs', 'Confidential.gs', 'Health.gs', 'WebApp.gs']
    .forEach(f => vm.runInContext(read(f), ctx, { filename: f }));

  /* Sheets with the real headers. */
  const schema = vm.runInContext('SCHEMA_', ctx);
  const sheets = {};
  Object.keys(schema).forEach(n => { sheets[n] = makeSheet(schema[n]); });
  ['Audit_Log', 'Logs', 'Dead_Letter_Queue'].forEach(n => { sheets[n] = makeSheet(['x']); });
  const ss = { getSheetByName: n => sheets[n], insertSheet: n => (sheets[n] = makeSheet(['x'])), getSpreadsheetTimeZone: () => 'America/Los_Angeles', setSpreadsheetTimeZone: () => {} };
  ctx.SpreadsheetApp = { openById: () => ss, flush: () => {} };

  /* Functions from files this test does not load. */
  ctx.logEvent_ = p => env.events.push(p);
  ctx.logError_ = () => {};
  ctx.logWarn_ = () => {};
  ctx.logInfo_ = () => {};
  ctx.sendTemplate_ = (id, to, first, params, ref) => { env.sent.push({ id, to, params, ref }); return {}; };
  ctx.firstNameFor_ = () => 'Friend';
  ctx.appUrl_ = p => 'https://app/?' + Object.keys(p).map(k => k + '=' + p[k]).join('&');
  ctx.enqueueDeadLetter_ = (action, payload) => { env.enqueued.push({ action, payload }); return 'DLQ_1'; };
  ctx.DLQ_ACTIONS = { GENERATE_PDF: 'GENERATE_PDF', SEND_EMAIL: 'SEND_EMAIL' };
  ctx.generateReviewPdf_ = (id, opts) => {
    env.pdfCalls.push({ id, opts });
    if (env.pdfFails) {
      if (opts && opts.enqueue) { ctx.enqueueDeadLetter_('GENERATE_PDF', { reviewId: id }, new Error('boom')); return null; }
      throw new Error('boom');
    }
    return { id: 'pdf-' + id, url: 'https://drive.example/pdf-' + id };
  };
  ctx.recordWindow_ = y => ({ label: 'L' + y, quarters: [] });
  ctx.recordFor_ = () => ({ built: {} });
  /* Copied from CourseFeedback.gs (not loaded here). */
  ctx.yearInProgram_ = (entry, quarter) => {
    const a = String(entry || '').match(/^(WIN|SPR|SUM|AUT)(\d{4})$/), b = String(quarter || '').match(/^(WIN|SPR|SUM|AUT)(\d{4})$/);
    if (!a || !b) return '';
    const acad = m => (m[1] === 'AUT' ? Number(m[2]) : Number(m[2]) - 1);
    return acad(b) - acad(a) + 1;
  };

  const run = code => vm.runInContext(code, ctx);
  /* Each server call in Apps Script starts with fresh globals. */
  const newRequest = user => { env.user = user || ''; run('TABLE_CACHE_ = {}; SHEET_CACHE_ = {}; SS_CACHE_ = null; CONF_SS_CACHE_ = null;'); };
  const plain = v => JSON.parse(JSON.stringify(v));
  const addRow = (name, obj) => { newRequest(env.user); ctx.appendObjects_(name, [obj]); };
  const rows = name => { run('TABLE_CACHE_ = {}'); return plain(ctx.readTable_(name)); };
  const setCell = (name, rowNum, field, value) => {
    const h = sheets[name].data[0];
    sheets[name].data[rowNum - 1][h.indexOf(field)] = value;
  };
  return { ctx, env, run, newRequest, plain, addRow, rows, setCell, sheets };
}

const STUDENT = 'stu@uw.edu', ADV1 = 'adv1@uw.edu', ADV2 = 'adv2@uw.edu', GPC = 'bmarwick@uw.edu';
const future = () => new Date(Date.now() + 30 * 86400000).toISOString();

function seed(t, review) {
  t.addRow('Students', { Email: STUDENT, Name: 'Sam Student', Preferred_First: 'Sam', Program: review.Program === 'MA' ? 'MA' : 'PHD', Subfield: 'Archaeology',
    Entry_Quarter: 'AUT2017', Advisor_Emails: ADV1 + ', ' + ADV2, Status: 'ACTIVE' });
  const token = crypto.randomUUID();
  t.addRow('Reviews', Object.assign({ Review_ID: 'AR-1', Cycle: 2027, Type: 'ANNUAL', Program: 'PHD', Student_Email: STUDENT, Advisor_Emails: ADV1 + ', ' + ADV2,
    Status: 'STUDENT_PENDING', Due_Date: '2027-04-23', Secure_Token: token, Token_Expiry: future(), Reminder_Count: 2 }, review));
  return token;
}

/* ---------- 16. Everything saved reloads, and a confidential note can be removed ---------- */

test('16. loadReview returns development and GPC-only fields the student saved', () => {
  const t = setup();
  const token = seed(t, { Student_Payload: JSON.stringify({ research: 'digging' }), Development_Payload: JSON.stringify({ careerCheckin: 'museum work', mentoringMap: [{ role: 'writing', who: 'Ana' }] }) });
  t.addRow('Confidential', { Review_ID: 'AR-1', Author_Role: 'student', Field: 'gpcOnly', Text: 'private note' });
  t.newRequest(STUDENT);
  const out = t.plain(t.ctx.loadReview(token));
  assert.equal(out.draft.research, 'digging');
  assert.equal(out.draft.careerCheckin, 'museum work');
  assert.equal(out.draft.mentoringMap[0].who, 'Ana');
  assert.equal(out.draft.gpcOnly, 'private note');
});

test('16. advisor draft reloads its own development and confidential fields, never the student\'s GPC-only note', () => {
  const t = setup();
  const token = seed(t, { Status: 'ADVISOR_PENDING', Advisor_Payload: JSON.stringify({ accomplishments: 'a paper' }),
    Development_Payload: JSON.stringify({ careerCheckin: 'museum work', careerSkillsComment: 'good plan' }) });
  t.addRow('Confidential', { Review_ID: 'AR-1', Author_Role: 'student', Field: 'gpcOnly', Text: 'SECRET-STUDENT-NOTE' });
  t.addRow('Confidential', { Review_ID: 'AR-1', Author_Role: 'advisor', Field: 'advisingChallenges', Text: 'on sabbatical' });
  t.newRequest(ADV1);
  const out = t.plain(t.ctx.loadReview(token));
  assert.equal(out.draft.accomplishments, 'a paper');
  assert.equal(out.draft.careerSkillsComment, 'good plan');
  assert.equal(out.draft.advisingChallenges, 'on sabbatical');
  assert.equal(out.draft.careerCheckin, undefined, 'the student\'s module is shown read-only, not as an advisor field');
  assert.ok(JSON.stringify(out).indexOf('SECRET-STUDENT-NOTE') === -1);
});

test('16. an empty GPC-only note clears the saved one; an empty note never creates a row', () => {
  const t = setup();
  const token = seed(t, {});
  t.newRequest(STUDENT);
  t.ctx.saveReviewStage(token, { gpcOnly: 'please call me' }, false);
  t.newRequest(STUDENT);
  assert.equal(t.ctx.hasConfidential_('AR-1'), true);
  t.ctx.saveReviewStage(token, { gpcOnly: '' }, false);
  t.newRequest(STUDENT);
  assert.equal(t.ctx.hasConfidential_('AR-1'), false);
  assert.equal(t.plain(t.ctx.loadReview(token)).draft.gpcOnly || '', '');
  t.newRequest(STUDENT);
  t.ctx.writeConfidential_('AR-1', 'advisor', 'advisingChallenges', '   ');
  assert.equal(t.rows('Confidential').filter(r => r.Field === 'advisingChallenges').length, 0);
});

/* ---------- 17. Drafts cannot use up Submit ---------- */

test('17. an hour of autosaves does not block Submit', () => {
  const t = setup();
  const token = seed(t, {});
  for (let i = 0; i < 120; i++) { t.newRequest(STUDENT); t.ctx.saveReviewStage(token, { research: 'r' + i }, false); }
  t.newRequest(STUDENT);
  const res = t.plain(t.ctx.saveReviewStage(token, { nextPlan: [{ category: 'research', goal: 'write' }], signatureName: 'Sam' }, true));
  assert.equal(res.next, 'ADVISOR_PENDING');
});

test('17/18. a save that waited for the lock sees the newer row and refuses a stale submit', () => {
  const t = setup();
  const token = seed(t, { Student_Payload: JSON.stringify({ research: 'x', nextPlan: [{ goal: 'g' }], signatureName: 'Sam' }) });
  t.newRequest(STUDENT);
  t.ctx.reviewById_('AR-1');   // fills the per-request cache before the lock
  /* Another request submits while this one waits for the lock. */
  t.env.lockHook = () => { t.setCell('Reviews', 2, 'Status', 'ADVISOR_PENDING'); t.setCell('Reviews', 2, 'Secure_Token', crypto.randomUUID()); t.env.lockHook = null; };
  assert.throws(() => t.ctx.saveReviewStage(token, {}, true), /moved on|replaced/);
  assert.equal(t.env.sent.filter(s => s.id === 'AR-3').length, 0);
});

/* The page's own logic: Index.html sends only changed fields and never drops a Submit. */
function pageLogic() {
  const html = read('Index.html');
  const start = html.indexOf('/* ---- Saving ---- */');
  const end = html.indexOf("call('loadReview'");
  assert.ok(start !== -1 && end > start, 'Index.html has the saving block');
  const env = { calls: [], resolvers: [], msgs: [], form: {} };
  const ctx = {
    R: { stage: 'advisor' }, DATA: { token: 'tok' }, AUTOSAVE: null,
    document: { getElementById: id => (id === 'form' ? {} : { innerHTML: '' }) },
    collectForm: () => JSON.parse(JSON.stringify(env.form)),
    say: (m, c) => env.msgs.push([m, c]),
    clearInterval: () => {},
    call: (fn, token, payload, final) => new Promise((resolve, reject) => { env.calls.push({ fn, payload, final }); env.resolvers.push({ resolve, reject }); })
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(start, end), ctx);
  return { ctx, env };
}
const tick = () => new Promise(r => setImmediate(r));

test('18. the page sends only fields changed since the last save, plus prefilled ones', async () => {
  const { ctx, env } = pageLogic();
  env.form = { accomplishments: 'A', agreement: [{ area: 'research', agree: '' }], letterParagraph: '' };
  ctx.setBaseline(['agreement']);           // agreement was filled in on the page, not saved yet
  ctx.send(false, true);
  assert.deepEqual(Object.keys(env.calls[0].payload), ['agreement']);
  env.resolvers[0].resolve({ ok: true }); await tick();
  ctx.send(false, true);                    // nothing changed: no autosave at all
  assert.equal(env.calls.length, 1);
  env.form.letterParagraph = 'para';
  ctx.send(false, true);
  assert.deepEqual(JSON.parse(JSON.stringify(env.calls[1].payload)), { letterParagraph: 'para' });
});

test('17. a Submit pressed during an autosave is queued, not dropped; an empty Submit still reaches the server', async () => {
  const { ctx, env } = pageLogic();
  env.form = { accomplishments: 'A' };
  ctx.setBaseline([]);
  env.form.accomplishments = 'B';
  ctx.send(false, true);                    // autosave in flight
  ctx.send(true);                           // Submit
  assert.equal(env.calls.length, 1);
  env.resolvers[0].resolve({ ok: true }); await tick(); await tick();
  assert.equal(env.calls.length, 2);
  assert.equal(env.calls[1].final, true);
  assert.deepEqual(JSON.parse(JSON.stringify(env.calls[1].payload)), {});
});

/* ---------- 19/20. Extend and Skip send the new link ---------- */

function escalated(t, from, extra) {
  const token = seed(t, Object.assign({ Status: 'ESCALATED', Escalated_From: from, Last_Reminder: '2027-04-20' }, extra || {}));
  t.newRequest(GPC);
  return token;
}

test('19. Extend from the student stage emails the student the new link and restarts reminders', () => {
  const t = setup();
  const old = escalated(t, 'STUDENT_PENDING');
  t.ctx.resolveEscalationAction('AR-1', 'extend', 'illness', '2099-05-01');
  const r = t.rows('Reviews')[0];
  assert.equal(r.Status, 'STUDENT_PENDING');
  assert.equal(r.Last_Reminder, '');
  assert.notEqual(r.Secure_Token, old);
  const mail = t.env.sent.filter(s => s.to === STUDENT);
  assert.equal(mail.length, 1);
  assert.ok(mail[0].params.url.indexOf(r.Secure_Token) !== -1);
});

test('19. Skip from the student stage sends AR-4 (not AR-3, which says the student finished) to every advisor with a due date in the future', () => {
  const t = setup();
  escalated(t, 'STUDENT_PENDING');
  t.ctx.resolveEscalationAction('AR-1', 'skip', 'no response');
  const r = t.rows('Reviews')[0];
  assert.equal(r.Status, 'ADVISOR_PENDING');
  assert.equal(r.Skipped_Stage, 'STUDENT_PENDING');
  assert.equal(t.env.sent.filter(s => s.id === 'AR-3').length, 0);
  const ar4 = t.env.sent.filter(s => s.id === 'AR-4');
  assert.deepEqual(ar4.map(s => s.to).sort(), [ADV1, ADV2]);
  assert.ok(ar4[0].params.url.indexOf(r.Secure_Token) !== -1);
  assert.ok(String(r.Due_Date) > t.ctx.todayIso_(), 'fresh due date');
});

test('19/20. Extend at the acknowledgement stage resends AR-7; Skip builds the PDF', () => {
  const t = setup();
  escalated(t, 'STUDENT_ACK_PENDING');
  t.ctx.resolveEscalationAction('AR-1', 'extend', 'travel', '2099-06-01');
  const r = t.rows('Reviews')[0];
  const ar7 = t.env.sent.filter(s => s.id === 'AR-7');
  assert.equal(ar7.length, 1);
  assert.ok(ar7[0].params.url.indexOf(r.Secure_Token) !== -1);

  const t2 = setup();
  escalated(t2, 'STUDENT_ACK_PENDING');
  t2.ctx.resolveEscalationAction('AR-1', 'skip', 'no response');
  assert.equal(t2.env.pdfCalls.length, 1);
  assert.equal(t2.rows('Reviews')[0].Status, 'COMPLETED');
});

/* ---------- 21. Interim check-ins follow the plan ---------- */

test('21. a PhD interim goes to the advisors only; no student link to the course feedback page', () => {
  const t = setup();
  seed(t, {});
  t.newRequest(GPC);
  const s = t.ctx.studentByEmail_(STUDENT);
  const id = t.ctx.createInterimReview_(s, 'AR-1', 6, false, GPC);
  const row = t.rows('Reviews').filter(r => r.Review_ID === id)[0];
  assert.equal(row.Status, 'ADVISOR_PENDING');
  assert.equal(t.env.sent.filter(m => m.id === 'AR-13').length, 2);
  assert.equal(t.env.sent.filter(m => /view=student/.test(m.params.url || '')).length, 0);
});

test('21. an MA interim starts with the student, who gets AR-10 with their own link', () => {
  const t = setup();
  seed(t, { Program: 'MA', Type: 'INTERIM', Status: 'COMPLETED' });
  t.newRequest(GPC);
  const s = t.ctx.studentByEmail_(STUDENT);
  const id = t.ctx.createInterimReview_(s, '', 3, false, GPC);
  const row = t.rows('Reviews').filter(r => r.Review_ID === id)[0];
  assert.equal(row.Status, 'STUDENT_PENDING');
  const ar10 = t.env.sent.filter(m => m.id === 'AR-10');
  assert.equal(ar10.length, 1);
  assert.equal(ar10[0].to, STUDENT);
  assert.ok(ar10[0].params.url.indexOf('t=' + row.Secure_Token) !== -1);
  assert.equal(t.env.sent.filter(m => m.id === 'AR-13').length, 0, 'the advisor hears when the student submits');
});

/* ---------- 22. One PDF, one completion ---------- */

test('22. finishReview_ does nothing unless the review is still PDF_GENERATING', () => {
  const t = setup();
  seed(t, { Status: 'COMPLETED' });
  t.newRequest('');
  t.ctx.finishReview_('AR-1');
  assert.equal(t.env.pdfCalls.length, 0);
  assert.equal(t.env.sent.length, 0);
});

test('22. the pending-PDF sweep never adds queue entries while the PDF keeps failing', () => {
  const t = setup();
  seed(t, { Status: 'PDF_GENERATING' });
  t.env.pdfFails = true;
  for (let i = 0; i < 3; i++) { t.newRequest(''); t.ctx.generatePendingPdfs_(); }
  assert.equal(t.env.pdfCalls.length, 3);
  assert.equal(t.env.enqueued.length, 0);
  t.env.pdfFails = false;
  t.newRequest(''); t.ctx.generatePendingPdfs_();
  t.newRequest(''); t.ctx.generatePendingPdfs_();
  assert.equal(t.env.pdfCalls.length, 4, 'a completed review is not built again');
  assert.equal(t.env.sent.filter(m => m.id === 'AR-8').length, 3);
});

/* ---------- 23. Program page ---------- */

test('23. the saved "reason for a different rating" comes back to the page', () => {
  const t = setup();
  seed(t, { Status: 'PROGRAM_PENDING', Program_Payload: JSON.stringify({ finalRating: 'Satisfactory', overrideReason: 'calibration agreed' }) });
  t.newRequest(GPC);
  const d = t.plain(t.ctx.programViewData(''));
  assert.equal(d.reviews[0].overrideReason, 'calibration agreed');
  assert.match(read('Program.html'), /id="or_' \+ id \+ '" value="' \+ esc\(r\.overrideReason\)/);
});

test('23. an Alert quarter that is not a real quarter is refused, and one bad row cannot break the tracker', () => {
  const t = setup();
  seed(t, { Status: 'PROGRAM_PENDING' });
  t.newRequest(GPC);
  assert.throws(() => t.ctx.saveProgramStage('AR-1', { statusAction: 'Alert', alertQuarter: 'FALL 27' }), /quarter/i);
  t.newRequest(GPC);
  t.ctx.saveProgramStage('AR-1', { statusAction: 'Alert', alertQuarter: 'AUT2027' });
  t.setCell('Reviews', 2, 'Alert_Quarter', 'next autumn');
  t.newRequest(GPC);
  const list = t.plain(t.ctx.alertTracker());
  assert.equal(list.length, 1);
  assert.match(list[0].due, /check/i);
  assert.ok(read('Program.html').indexOf("call('alertTracker')") !== -1);
  assert.ok(!/call\('alertTracker'\)[\s\S]{0,900}\.catch\(function \(\) \{\}\)/.test(read('Program.html')), 'tracker errors are shown');
});

/* ---------- 24. CV and the release lock ---------- */

test('24. releasing twice (double click) creates one interim review', () => {
  const t = setup();
  seed(t, { Status: 'PROGRAM_PENDING', Advisor_Payload: JSON.stringify({ recommendedRating: 'Satisfactory with concerns', checkinMonths: 6 }),
    Program_Payload: JSON.stringify({ finalRating: 'Satisfactory with concerns', letterText: 'Dear Sam', timeLimitDecision: 'extension recorded' }) });
  t.newRequest(GPC);
  t.ctx.releaseLetter('AR-1', true);
  /* The second click's request read the row before the first one finished. */
  t.newRequest(GPC);
  t.setCell('Reviews', 2, 'Status', 'PROGRAM_PENDING');
  t.ctx.reviewById_('AR-1');
  t.env.lockHook = () => { t.setCell('Reviews', 2, 'Status', 'STUDENT_ACK_PENDING'); t.env.lockHook = null; };
  assert.throws(() => t.ctx.releaseLetter('AR-1', true), /not at the program stage/);
  assert.equal(t.rows('Reviews').filter(r => r.Type === 'INTERIM').length, 1);
});

test('24. the uploaded CV is shared with the advisors and linked at the advisor stage', () => {
  const t = setup();
  const token = seed(t, {});
  t.newRequest(STUDENT);
  const blob = { getBytes: () => [1, 2, 3], getContentType: () => 'application/pdf', setName() { return this; } };
  t.ctx.uploadCv(token, { cv: blob });
  assert.deepEqual(t.env.viewers.sort(), [ADV1, ADV2]);
  t.setCell('Reviews', 2, 'Status', 'ADVISOR_PENDING');
  t.newRequest(ADV1);
  const out = t.plain(t.ctx.loadReview(token));
  assert.equal(out.cvUrl, 'https://drive.example/cvfile1');
  assert.ok(read('Index.html').indexOf('R.cvUrl') !== -1);
});

/* ---------- 26. Flags are for the advisor and GPC ---------- */

test('26. review flags are not sent to the student at the student or acknowledgement stage', () => {
  const t = setup();
  const token = seed(t, { Status: 'STUDENT_ACK_PENDING' });   // entered 2017: the near-time-limit flag applies
  t.newRequest(STUDENT);
  assert.equal((t.plain(t.ctx.loadReview(token)).flags || []).length, 0);
  t.setCell('Reviews', 2, 'Status', 'ADVISOR_PENDING');
  t.newRequest(ADV1);
  assert.ok(t.plain(t.ctx.loadReview(token)).flags.length > 0);
  assert.match(read('Index.html'), /R\.flags && R\.flags\.length && R\.stage === 'advisor'/);
});

/* ---------- The edited pages still parse ---------- */

test('Index.html, Common.html, and Program.html scripts parse', () => {
  ['Common.html', 'Index.html', 'Program.html'].forEach(f => {
    const html = read(f);
    const blocks = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
    assert.ok(blocks.length > 0, f + ' has a script');
    blocks.forEach(b => {
      const body = b.replace(/^<script>/, '').replace(/<\/script>$/, '').replace(/<\?!= dataJson \?>/g, '{}');
      assert.doesNotThrow(() => new vm.Script(body, { filename: f }), f);
    });
  });
});

test('read-only review views render human-readable headings, table headers, and sub-field labels', () => {
  const commonJs = read('Common.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const indexJs = read('Index.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const defsEnd = indexJs.indexOf('function section(');
  assert.ok(defsEnd > 0, 'Index.html field definitions found');
  const env = {};
  vm.createContext(env);
  vm.runInContext(commonJs, env);
  vm.runInContext(indexJs.slice(0, defsEnd).replace(/<\?!= dataJson \?>/g, '{}'), env);

  const annualStudent = env.renderReadOnlyFields(
    { nextPlan: [{ category: 'funding', goal: 'Apply for grants' }], research: 'Coded interviews.', prefill: {}, signatureName: 'Robin' },
    env.STUDENT_ANNUAL, ['prefill', 'signatureName'], env.EXTRA_LABELS
  );
  assert.match(annualStudent, /<h3>Research progress<\/h3>/);
  assert.match(annualStudent, /<h3>Next year&#39;s plan<\/h3>/);
  assert.match(annualStudent, /<th scope="col">Category<\/th><th scope="col">Goal<\/th>/);
  assert.ok(annualStudent.indexOf('Research progress') < annualStudent.indexOf('Next year&#39;s plan'), 'fields follow form order');
  assert.ok(!/<h3>research<\/h3>/i.test(annualStudent) && !/<h3>nextPlan<\/h3>/.test(annualStudent));

  const maStudent = env.renderReadOnlyFields(
    { research: 'Completed fieldwork methods course.' },
    env.STUDENT_MA, ['prefill', 'signatureName'], env.EXTRA_LABELS
  );
  assert.match(maStudent, /<h3>Quarterly reflection and next steps<\/h3>/);
  assert.ok(!/<h3>research<\/h3>/i.test(maStudent));

  const devHtml = env.renderReadOnlyFields(
    { careerCheckin: 'Museum curation', mentoringMap: [{ role: 'writing', who: 'Dr. Lee' }] },
    env.STUDENT_ANNUAL.concat(env.ADVISOR_ANNUAL), [], env.EXTRA_LABELS
  );
  assert.match(devHtml, /<h3>Career check-in<\/h3>/);
  assert.match(devHtml, /<h3>Mentoring network<\/h3>/);
  assert.match(devHtml, /<th scope="col">Role<\/th><th scope="col">Who<\/th>/);

  const advisorAck = env.renderReadOnlyFields(
    {
      meetingDate: '2027-05-01',
      mentorChecklist: { deadlinesKnown: 'Yes', feasiblePlan: 'Yes' },
      concerns: { benchmark: 'Prospectus approved', deadline: '2027-06-15' },
      discussedCourseFeedback: true,
      signatureName: 'Dr. Rowan'
    },
    env.ADVISOR_ANNUAL, ['signatureName'], env.EXTRA_LABELS
  );
  assert.match(advisorAck, /<h3>Date of advisor meeting<\/h3>/);
  assert.match(advisorAck, /<strong>The student knows the upcoming milestone deadlines:<\/strong> Yes/);
  assert.match(advisorAck, /<strong>The specific benchmark:<\/strong> Prospectus approved/);
  assert.match(advisorAck, /<h3>Course Feedback Record discussed<\/h3>Yes/);
  assert.ok(!/deadlinesKnown|meetingDate|discussedCourseFeedback/.test(advisorAck));

  const checkinAck = env.renderReadOnlyFields(
    { benchmarkProgress: 'On track', verdict: 'resolved' },
    env.ADVISOR_CHECKIN, ['signatureName'], env.EXTRA_LABELS
  );
  assert.match(checkinAck, /<h3>Progress on each benchmark<\/h3>/);
  assert.match(checkinAck, /<h3>Advisor verdict<\/h3>/);
});

test('Program.html GPC-only note labels and PdfEngine.gs labels avoid raw keys', () => {
  assert.match(read('Program.html'), /GPC_NOTE_LABELS\[k\] \|\| humanizeKey\(k\)/);
  const env = { DocumentApp: { ParagraphHeading: { HEADING2: 'H2', HEADING3: 'H3' } } };
  vm.createContext(env);
  vm.runInContext(read('PdfEngine.gs'), env, { filename: 'PdfEngine.gs' });
  const labels = vm.runInContext('PDF_LABELS_', env);
  assert.equal(labels.benchmarkProgress, 'Progress on each benchmark');
  assert.equal(labels.verdict, 'Advisor verdict');
  assert.equal(labels.actualMeetings, 'Advisor meetings this year');
  assert.equal(env.pdfValue_([{ category: 'funding', goal: 'Apply for grants' }]), 'Category: funding; Goal: Apply for grants');
  const formattedGroup = env.pdfValue_({ deadlinesKnown: 'Yes', feasiblePlan: 'No' });
  assert.match(formattedGroup, /Knows upcoming milestone deadlines: Yes/);
  assert.match(formattedGroup, /Has a feasible plan: No/);
  const lines = [];
  const fakeBody = { appendParagraph(text) { lines.push(text); return { setHeading() {} }; } };
  env.addPdfSection_(fakeBody, "Student's report", { research: 'Drafted proposal.' }, { research: 'Quarterly reflection and next steps' });
  assert.deepEqual(lines, ["Student's report", 'Quarterly reflection and next steps', 'Drafted proposal.']);
});
