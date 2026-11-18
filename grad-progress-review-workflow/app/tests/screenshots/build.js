/* Builds static copies of the app's pages for README screenshots.
   Run with:  node grad-progress-review-workflow/app/tests/screenshots/build.js <outDir>

   Each page is assembled from the real .html files the way page_() in WebApp.gs does it (Styles and
   Common included, dataJson filled in). google.script.run is replaced by a stub that answers each
   server call with a sample payload. Where a Core function builds a payload in the real server
   (joinRegistrations_, joinSummary_, buildFeedbackRecord_, followupTiming_, alertDeadline_, dates),
   the payload here comes from running that same function. Every person in the data is invented;
   the instructor names come from tests/fixtures/timeschedule-sample.html.
   Nothing here talks to Google, MyGrad or the Time Schedule. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'out'));
fs.mkdirSync(OUT, { recursive: true });

/* ---------- The real logic, in a sandbox ---------- */
const ctx = {};
vm.createContext(ctx);
['Config.gs', 'CoreDates.gs', 'CoreStates.gs', 'CoreRoster.gs', 'CoreEmail.gs', 'CoreRecords.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx, { filename: f }));

/* Copies one top-level function out of an Apps Script file, so it runs unchanged. */
function extract(file, name) {
  const src = fs.readFileSync(path.join(APP, file), 'utf8');
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(name + ' not found in ' + file);
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}' && --depth === 0) break;
  }
  return src.slice(start, i + 1);
}
/* Small stand-ins for the Sheets layer that the copied functions call. */
vm.runInContext(`
  var TODAY_ = '2027-04-20';
  function todayIso_() { return TODAY_; }
  function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
  function parseJson_(s) { if (s && typeof s === 'object') return s; try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }
  var PRIOR_REVIEWS_ = [];
  function readTable_(name) { return name === C_().SHEETS.REVIEWS ? PRIOR_REVIEWS_ : []; }
`, ctx);
[['CourseFeedback.gs', 'yearInProgram_'], ['Reviews.gs', 'computeFlags_'], ['Reviews.gs', 'defaultLetter_']].forEach(([f, n]) =>
  vm.runInContext(extract(f, n), ctx, { filename: f + ':' + n }));
const J = x => JSON.parse(JSON.stringify(x));
const run = code => J(vm.runInContext(code, ctx));
const CF_LEVELS = run('CF_LEVELS_');
const ts = require(path.join(APP, '..', '..', 'bookmarklet-time-schedule-sections.js'));

/* ---------- Invented people ---------- */
const STUDENTS = {
  'robin.park.sample@uw.edu': { name: 'Robin Park', first: 'Robin', subfield: 'Sociocultural', entry: 'AUT2024', advisors: ['bea.rowan.sample@uw.edu'] },
  'toby.moss.sample@uw.edu': { name: 'Toby Moss', first: 'Toby', subfield: 'Archaeology', entry: 'AUT2025', advisors: [] },
  'jules.finch.sample@uw.edu': { name: 'Jules Finch', first: 'Jules', subfield: 'Biocultural', entry: 'AUT2023', advisors: [] }
};

/* ---------- Roster: the real parser and join on the fixture ---------- */
const Q = 'AUT2026';
const fixture = fs.readFileSync(path.join(APP, 'tests', 'fixtures', 'timeschedule-sample.html'), 'utf8');
const sections = ts.parseSections(fixture, Q);
const reg = (email, curric, number, section) => ({ quarter: Q, studentEmail: email, curric, number, section, withdrawn: false });
const registrations = [
  reg('robin.park.sample@uw.edu', 'ANTH', '512', 'A'), reg('toby.moss.sample@uw.edu', 'ANTH', '512', 'A'),
  reg('robin.park.sample@uw.edu', 'ANTH', '203', 'AA'), reg('jules.finch.sample@uw.edu', 'LING', '203', 'A'),
  reg('jules.finch.sample@uw.edu', 'BIO A', '201', 'A'), reg('toby.moss.sample@uw.edu', 'ANTH', '600', 'A')
];
const studentsMap = {}, instructors = {
  'QUILL,ADA M': { email: 'ada.quill.sample@uw.edu', appointment: 'faculty' },
  'ROWAN,BEA': { email: 'bea.rowan.sample@uw.edu', appointment: 'faculty' },
  'STONE,CAL': { email: 'cal.stone.sample@uw.edu', appointment: 'faculty' },
  'PIKE,DEV': { email: 'dev.pike.sample@uw.edu', appointment: 'graduate student' }
};
Object.keys(STUDENTS).forEach(e => { studentsMap[e] = { status: 'ACTIVE', program: 'PHD', advisorEmails: STUDENTS[e].advisors }; });
ctx.__in = { registrations, sections, studentsMap, instructors };
const join = run('joinRegistrations_(__in.registrations, __in.sections, __in.studentsMap, __in.instructors, { curricula: CONFIG.CF_ALL_DEPARTMENTS ? null : CONFIG.CF_CURRICULA_PHASE1 })');
ctx.__counts = join.counts;
const preview = {
  summary: run('joinSummary_(__counts)'), counts: join.counts, missingInstructors: join.missingInstructors, canLaunch: join.canLaunch,
  unmatched: join.enrollments.filter(e => e.exclusionReason === run('EXCLUSION_.NO_MATCH')).map(e => e.curric + ' ' + e.number + ' ' + e.section),
  pages: join.requests.map(r => ({ offering: r.offering, instructors: r.instructorNames.join(', '), students: r.studentEmails.length })),
  missingCurricula: [], cecError: ''
};
const rosterData = {
  quarter: Q, quarterLabel: run(`quarterLabel_('${Q}')`), curriculaFilter: run('CONFIG.CF_ALL_DEPARTMENTS ? null : CONFIG.CF_CURRICULA_PHASE1'),
  window: run(`courseFeedbackWindow_('${Q}', CONFIG.CF_RELEASE_OFFSET_DAYS, CONFIG.CF_WINDOW_OVERRIDES)`), missingEmails: [],
  requests: [
    { requestId: 'REQ-1', offering: 'ANTH 512', instructors: 'Rowan,Bea / Stone,Cal', emails: 'bea.rowan.sample@uw.edu, cal.stone.sample@uw.edu', status: 'SENT' },
    { requestId: 'REQ-2', offering: 'ANTH 203 A / LING 203 A', instructors: 'Quill,Ada M', emails: 'ada.quill.sample@uw.edu', status: 'SUBMITTED' },
    { requestId: 'REQ-3', offering: 'ANTH 466', instructors: 'Stone,Cal', emails: 'cal.stone.sample@uw.edu', status: 'NOT_MY_COURSE' }
  ],
  myGradUrl: 'https://webappssecure.grad.uw.edu/mgp-dept.stu.detail/home/studentlist?orgid=14', timeScheduleUrl: ''
};
const regMsg = { type: 'mygrad-data', mode: 'registrations', quarter: Q, students: Object.keys(STUDENTS), registrations, failures: [] };
const tsMsg = { type: 'ts-sections', quarter: Q, sections, missingCurricula: [], appointments: {}, cecError: '' };

/* ---------- Course feedback comments and the records built from them ---------- */
const win = run(`courseFeedbackWindow_('${Q}', CONFIG.CF_RELEASE_OFFSET_DAYS, CONFIG.CF_WINDOW_OVERRIDES)`);
const parkComments = [
  { course: 'ANTH 512', quarter: 'AUT2026', instructorNames: ['Rowan,Bea', 'Stone,Cal'], contact: 'enough', written: 'Meeting', discussion: 'Beyond', literature: 'Meeting',
    strength: 'Your seminar presentation on kinship and care work tied three of the readings to your own field notes and set up the best discussion of the quarter.',
    nextStep: 'Your final paper summarized the literature well. Next, state your own argument in the first page and use the literature to test it.', status: 'RELEASED', releasedAt: '2027-01-15', gpcNote: '' },
  { course: 'ANTH 203', quarter: 'AUT2026', instructorNames: ['Quill,Ada M'], contact: 'enough', written: 'Beyond', discussion: 'Meeting', literature: 'Beyond',
    strength: 'Your response papers used the week\'s methods readings to question the examples in lecture, with clear page references.',
    nextStep: 'Try speaking earlier in section; your written questions were sharper than most of what was said aloud.', status: 'RELEASED', releasedAt: '2027-01-15', gpcNote: '' },
  { course: 'ANTH 466', quarter: 'WIN2027', instructorNames: ['Stone,Cal'], contact: 'not_enough', status: 'NO_CONTACT', releasedAt: '2027-04-09' }
];
const parkOfferings = [
  { course: 'ANTH 512', quarter: 'AUT2026', submitted: true }, { course: 'ANTH 203', quarter: 'AUT2026', submitted: true },
  { course: 'ANTH 466', quarter: 'WIN2027', submitted: true }, { course: 'ANTH 570', quarter: 'WIN2027', submitted: false }
];
ctx.__rec = { o: parkOfferings, c: parkComments };
const recStudent = run(`buildFeedbackRecord_(__rec.o, __rec.c, [], 'student', '')`);
const recCalibration = run(`buildFeedbackRecord_(__rec.o, __rec.c, [], 'calibration', '')`);
const recAut = run(`buildFeedbackRecord_(__rec.o.slice(0, 2), __rec.c.slice(0, 2), [], 'student', '')`);

/* ---------- Program stage: flags and the starting letter from the real functions ---------- */
const finchStudent = { Email: 'jules.finch.sample@uw.edu', Name: 'Jules Finch', Preferred_First: 'Jules', Program: 'PHD', Entry_Quarter: 'AUT2018', GPA: '2.9', Chair_Email: 'ada.quill.sample@uw.edu' };
const finchAdvisor = {
  recommendedRating: 'Satisfactory with concerns',
  accomplishments: 'Jules completed the second season of survey and catalogued 1,200 lithic pieces, and presented a poster at the regional meeting.',
  developmentAreas: [{ area: 'Writing pace on the prospectus', seriousness: 'moderate' }],
  actionItems: [{ action: 'Send the full prospectus draft to the committee', owner: 'student', due: '2027-06-15' }],
  concerns: { benchmark: 'Prospectus approved by the committee', deadline: '15 June 2027', support: 'Two writing meetings a month with the advisor', consequence: 'An Academic Alert in autumn 2027' }
};
ctx.__fin = { s: finchStudent, ap: finchAdvisor, r: { Student_Payload: JSON.stringify({ actualMeetings: 6 }) } };
const finchFlags = run('computeFlags_(__fin.s, __fin.r)');
const finchLetter = run('defaultLetter_(__fin.s, __fin.ap)');
const alertQ = run('defaultAlertQuarter_(CONFIG.CYCLE_YEAR, CONFIG.SUMMER_REGISTRATION_REQUIRED)');
const alertD = run(`alertDeadline_('${alertQ}')`);
const programData = {
  year: run('CONFIG.CYCLE_YEAR'), subfields: ['Archaeology', 'Biocultural', 'Sociocultural'],
  reviews: [
    { reviewId: 'REV-1', type: 'ANNUAL', program: 'PHD', student: 'Jules Finch', subfield: 'Archaeology', year: run(`yearInProgram_('AUT2018', quarterForDate_(todayIso_()))`),
      status: 'PROGRAM_PENDING', escalatedFrom: '', due: '2027-05-07', recommendedRating: finchAdvisor.recommendedRating, accomplishments: finchAdvisor.accomplishments,
      developmentAreas: finchAdvisor.developmentAreas, concerns: finchAdvisor.concerns, letterParagraph: '', finalRating: '', letterText: finchLetter, statusAction: 'none',
      alertQuarter: alertQ, flags: finchFlags, timeLimitDecision: '', returnUntil: '', gpcOnlyPresent: false, courseFeedback: recCalibration },
    { reviewId: 'REV-2', type: 'ANNUAL', program: 'PHD', student: 'Toby Moss', subfield: 'Archaeology', year: 2, status: 'ESCALATED', escalatedFrom: 'ADVISOR_PENDING',
      due: '2027-04-30', recommendedRating: '', accomplishments: '', developmentAreas: [], concerns: {}, letterParagraph: '', finalRating: '', letterText: '', statusAction: 'none',
      alertQuarter: alertQ, flags: [], timeLimitDecision: '', returnUntil: '', gpcOnlyPresent: false, courseFeedback: null }
  ]
};
ctx.__ad = alertD;
const alerts = [{ reviewId: 'REV-9', student: 'Sample Student', quarter: run(`quarterLabel_('${alertQ}')`), due: run('dateLong_(__ad.due)'), petitionUntil: run('dateLong_(__ad.petitionUntil)'), sent: '' }];

/* ---------- Review and release ---------- */
const fu = run(`followupTiming_('2027-01-12', '2027-01-29', 'OPEN', '')`);
ctx.__fu = fu;
const releaseData = {
  quarter: Q, quarterLabel: run(`quarterLabel_('${Q}')`), releaseDate: run(`dateLong_('${win.release}')`),
  comments: [
    { id: 'FB-1', student: 'Robin Park', subfield: 'Sociocultural', course: 'ANTH 512', instructors: 'Rowan,Bea / Stone,Cal', ...pick(parkComments[0]), status: 'SUBMITTED', returnedReason: '', returnUntil: '', released: false },
    { id: 'FB-2', student: 'Robin Park', subfield: 'Sociocultural', course: 'ANTH 203', instructors: 'Quill,Ada M', ...pick(parkComments[1]), status: 'RELEASED', returnedReason: '', returnUntil: '', released: true }
  ],
  followups: [{ id: 'FU-1', student: 'Toby Moss', course: 'ANTH 512', note: 'Missed the last three reading responses after week 6; no reply to two emails.', day: fu.day, deadline: run('dateLong_(__fu.deadline)'), overdue: fu.overdue }],
  records: []
};
function pick(c) { return { contact: c.contact, written: c.written, discussion: c.discussion, literature: c.literature, strength: c.strength, nextStep: c.nextStep }; }

/* ---------- Instructor page ---------- */
const feedbackPage = {
  offering: 'ANTH 512', quarter: run(`quarterLabel_('${Q}')`), due: run(`dateLong_('${win.due}')`), closed: false, readOnlyLock: false, lockOwner: '',
  levels: CF_LEVELS, signature: '', minutes: '', status: 'DRAFT',
  students: [
    { email: 'robin.park.sample@uw.edu', name: 'Robin Park', program: 'PhD', subfield: 'Sociocultural', year: run(`yearInProgram_('AUT2024', '${Q}')`), course: 'ANTH 512', isAdvisee: true,
      contact: 'enough', ...pick(parkComments[0]), followup: false, followupNote: '', status: 'DRAFT', returnedReason: '', editable: true },
    { email: 'toby.moss.sample@uw.edu', name: 'Toby Moss', program: 'PhD', subfield: 'Archaeology', year: run(`yearInProgram_('AUT2025', '${Q}')`), course: 'ANTH 512', isAdvisee: false,
      contact: '', written: '', discussion: '', literature: '', strength: '', nextStep: '', followup: false, followupNote: '', status: '', returnedReason: '', editable: true }
  ]
};

/* ---------- Student's annual report ---------- */
const cyc = run('annualCycleDates_(CONFIG.CYCLE_YEAR)');
const reviewStudent = {
  reviewId: 'REV-3', type: 'ANNUAL', program: 'PHD', cycle: run('CONFIG.CYCLE_YEAR'), stage: 'student', status: 'STUDENT_PENDING', due: run(`dateLong_('${cyc.studentDue}')`),
  studentName: 'Robin Park', coAdvised: false, returned: false, levels: CF_LEVELS, ratings: run('REVIEW_RATINGS_'), flags: [],
  draft: {
    research: 'Finished the first round of interviews with home-care workers (18 of a planned 30) and coded half of them. Drafted the methods section of the prospectus.',
    nextPlan: [{ category: 'degree progress', goal: 'Defend the prospectus in autumn' }, { category: 'funding', goal: 'Apply for two dissertation fieldwork grants' }]
  },
  prefill: {
    mygrad: { candidacyDate: '', anth800Credits: 0, hasDocComm: 'Yes', uwDegrees: 'none' },
    coursework: [
      { quarter: 'AUT2026', course: 'ANTH 512', title: 'Kinship and Care', grade: '3.8' },
      { quarter: 'AUT2026', course: 'ANTH 203', title: 'Anthropology of Everyday Life', grade: '3.9' },
      { quarter: 'WIN2027', course: 'ANTH 466', title: 'Medical Anthropology', grade: '3.7' }
    ],
    lastGoals: [{ goal: 'Form the doctoral committee', status: '', comment: '' }],
    actionItemsProgress: [{ action: 'Take a qualitative methods course', status: '', note: '' }]
  },
  development: {}, courseFeedback: recStudent,
  onFile: { program: 'PhD', subfield: 'Sociocultural', advisors: ['bea.rowan.sample@uw.edu'], chair: 'bea.rowan.sample@uw.edu', gsr: '',
            entryQuarter: run("quarterLabel_('AUT2024')"), leaveEnds: '' }
};

/* ---------- Student's course feedback page ---------- */
const myFeedback = { email: 'robin.park.sample@uw.edu', records: [], quarters: [{ quarter: run(`quarterLabel_('${Q}')`), record: recAut }] };

/* ---------- Page assembly, as page_() in WebApp.gs ---------- */
const read = f => fs.readFileSync(path.join(APP, f + '.html'), 'utf8');
const STUB = `<script>
  /* Stand-in for google.script.run: answers from window.STUB after a short delay, like the real one. */
  (function () {
    function runner(ok, fail) {
      return new Proxy({}, { get: function (_, name) {
        if (name === 'withSuccessHandler') return function (h) { return runner(h, fail); };
        if (name === 'withFailureHandler') return function (h) { return runner(ok, h); };
        return function () {
          var args = arguments;
          setTimeout(function () {
            try {
              if (!(name in window.STUB)) throw new Error('No sample answer for ' + name);
              var v = window.STUB[name];
              v = typeof v === 'function' ? v.apply(null, args) : v;
              if (ok) ok(JSON.parse(JSON.stringify(v)));
            } catch (e) { if (fail) fail(e); }
          }, 20);
        };
      } });
    }
    window.google = { script: { run: runner(null, null) } };
  })();
</script>`;

function build(file, outName, title, data, stub, after) {
  let html = read(file)
    .replace(/<\?!= include_\('Styles'\) \?>/g, () => read('Styles'))
    .replace(/<\?!= include_\('Common'\) \?>/g, () => read('Common'))
    .replace(/<\?!= dataJson \?>/g, () => JSON.stringify(data).replace(/</g, '\\u003c'));
  if (/<\?/.test(html)) throw new Error(file + ': an unresolved scriptlet is left');
  const head = '<title>' + title + ' · UW Anthropology</title><meta name="viewport" content="width=device-width, initial-scale=1">' +
    STUB + '<script>window.STUB = ' + JSON.stringify(stub).replace(/</g, '\\u003c') + ';</script>';
  html = html.replace('<head>', '<head>' + head);
  if (after) html = html.replace(/<\/body>/, '<script>' + after + '</script></body>');
  fs.writeFileSync(path.join(OUT, outName + '.html'), html);
  return outName;
}

const pages = [
  /* The Roster page after both bridges have reported and the administrator clicked Preview. The two
     status lines use the same wording as the page's message handler, which only accepts real
     MyGrad and Time Schedule origins. */
  build('RosterPage', 'roster', 'Roster', {}, { rosterPageData: rosterData, previewCourseFeedback: preview }, `
    setTimeout(function () {
      REG = ${JSON.stringify(regMsg)}; TSD = ${JSON.stringify(tsMsg)};
      document.getElementById('regState').textContent = 'MyGrad: ' + REG.students.length + ' students, ' + REG.registrations.length + ' registrations for ' + REG.quarter + '.';
      document.getElementById('tsState').textContent = 'Time Schedule: ' + TSD.sections.length + ' sections for ' + TSD.quarter + '.';
      document.getElementById('preview').click();
    }, 200);`),
  build('FeedbackForm', 'feedback-form', 'Course feedback', { token: 'sample', notMine: false }, { loadFeedbackPage: feedbackPage }),
  build('Index', 'annual-report', 'Annual review', { token: 'sample' }, { loadReview: reviewStudent, saveReviewStage: true }),
  build('ReviewRelease', 'review-release', 'Review and release', { quarter: Q }, { releasePageData: releaseData }),
  build('Program', 'program', 'Program stage', {}, { programViewData: programData, alertTracker: alerts }),
  build('Home', 'student-feedback', 'Your course feedback', { view: 'student' }, { myCourseFeedback: myFeedback })
];
console.log(JSON.stringify({ out: OUT, pages, preview: { summary: preview.summary, pages: preview.pages.length, missing: preview.missingInstructors, unmatched: preview.unmatched },
  flags: finchFlags.map(f => f.code), alertQuarter: alertQ }, null, 1));
