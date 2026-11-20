/* Roster: instructor emails suggested from the department directory, and a clearer reason when a
   registration's student is not in the Students sheet.
   Run with: node --test "grad-progress-review-workflow/app/tests/*.js" */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..');
const plain = x => JSON.parse(JSON.stringify(x));

/* A small page laid out like the department's people table (invented people). */
const row = (name, title, email) =>
  '<tr>\n<td headers="view-field-last-name-table-column" class="views-field views-field-field-last-name"><a href="/people/x">' + name + '</a>   </td>\n' +
  '<td headers="view-field-job-title-table-column" class="views-field views-field-field-job-title">' + title + '   </td>\n' +
  '<td headers="view-field-email-table-column" class="views-field views-field-field-email views-field-field-phone">' +
  (email ? '<a href="mailto:' + email + '">' + email + '</a>' : '206-555-0100') + '   </td>\n</tr>\n';
const PAGE = '<html><body><table><thead><tr><th>Name</th></tr></thead><tbody>' +
  row('Barker, Holly M.', 'Teaching Professor', 'hmbarker@uw.edu') +
  row('Castillo Ardila, &Aacute;ngela', 'Assistant Professor', '') +
  row('Castillo Ardila, Ángela', 'Assistant Professor', '') +
  row('Grant, Jenna', 'Associate Professor', 'JMGrant@uw.edu') +
  row('Lee, Sam', 'Lecturer', 'slee1@uw.edu') +
  row('Lee, Samantha', 'Professor', 'slee2@uw.edu') +
  row('Outside, Olive', 'Affiliate', 'olive@gmail.com') +
  '</tbody></table></body></html>';

function loadCore() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'CoreDirectory.gs'), 'utf8'), ctx, { filename: 'CoreDirectory.gs' });
  return ctx;
}

test('the directory page is read into name, title and email', () => {
  const ctx = loadCore();
  const people = plain(ctx.parseDepartmentDirectory_(PAGE));
  assert.equal(people.length, 7);
  assert.deepEqual(people[0], { name: 'Barker, Holly M.', title: 'Teaching Professor', email: 'hmbarker@uw.edu' });
  assert.equal(people[1].email, '', 'a row with only a phone number has no email');
  assert.equal(people[3].email, 'jmgrant@uw.edu', 'emails are lower-cased');
});

test('Time Schedule names match directory names', () => {
  const ctx = loadCore();
  const people = ctx.parseDepartmentDirectory_(PAGE.replace(row('Castillo Ardila, &Aacute;ngela', 'Assistant Professor', ''), ''));
  const m = n => plain(ctx.matchDirectoryPerson_(n, people));
  assert.deepEqual(m('Barker,Holly'), { status: 'found', email: 'hmbarker@uw.edu', title: 'Teaching Professor', directoryName: 'Barker, Holly M.' });
  assert.equal(m('Grant,Jenna M').email, 'jmgrant@uw.edu', 'a middle initial on one side only');
  assert.equal(m('Castillo,Angela').status, 'no-email', 'a longer surname and an accent still match; listed without an email');
  assert.equal(m('Lee,Sam').status, 'ambiguous', 'two people fit (Sam and Samantha): no guess');
  assert.equal(m('Kopperl,Bob').status, 'not-found');
  assert.equal(m('Outside,Olive').status, 'no-email', 'a non-UW address is never suggested');
  assert.equal(m('Grant,Jo').status, 'not-found', 'a different first name does not match');
  assert.equal(m('NoComma').status, 'not-found');
});

test('a registration whose student is not in the Students sheet says so', () => {
  const ctx = {};
  vm.createContext(ctx);
  ['CoreDates.gs', 'CoreStates.gs', 'CoreRoster.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx, { filename: f }));
  const reg = { quarter: 'AUT2026', studentEmail: 'new@uw.edu', curric: 'ANTH', number: '503', section: 'A' };
  const away = Object.assign({}, reg, { studentEmail: 'away@uw.edu' });
  const students = { 'away@uw.edu': { status: 'ON_LEAVE', program: 'PHD', advisorEmails: [] } };
  const res = ctx.joinRegistrations_([reg, away], [], students, {}, {});
  assert.deepEqual(plain(res.enrollments.map(e => e.exclusionReason)), [
    'Student not in the Students sheet (click Get MyGrad data first)',
    'Student on leave or no longer enrolled'
  ]);
});

function loadServer(fetchResult) {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'CoreDirectory.gs'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'RosterImport.gs'), 'utf8'), ctx, { filename: 'RosterImport.gs' });
  ctx.assertAdminOrGpc_ = () => 'admin@uw.edu';
  ctx.C_ = () => ({ DEPARTMENT_DIRECTORY_URL: 'https://example.edu/people' });
  ctx.fetched = [];
  ctx.UrlFetchApp = { fetch: (url, opts) => { ctx.fetched.push(url); if (fetchResult instanceof Error) throw fetchResult; return { getResponseCode: () => fetchResult.code, getContentText: () => fetchResult.body }; } };
  return ctx;
}

test('suggestInstructorEmails reads the configured page and returns a match per name', () => {
  const ctx = loadServer({ code: 200, body: PAGE });
  const res = plain(ctx.suggestInstructorEmails(['Barker,Holly', 'Kopperl,Bob']));
  assert.deepEqual(ctx.fetched, ['https://example.edu/people']);
  assert.equal(res.error, '');
  assert.equal(res.suggestions['Barker,Holly'].email, 'hmbarker@uw.edu');
  assert.equal(res.suggestions['Kopperl,Bob'].status, 'not-found');
});

test('suggestInstructorEmails reports a failed or changed page instead of throwing', () => {
  assert.match(loadServer(new Error('timeout')).suggestInstructorEmails(['A,B']).error, /could not be read \(timeout\)/);
  assert.match(loadServer({ code: 404, body: '' }).suggestInstructorEmails(['A,B']).error, /answered 404/);
  assert.match(loadServer({ code: 200, body: '<html>new layout</html>' }).suggestInstructorEmails(['A,B']).error, /layout may have changed/);
  const off = loadServer({ code: 200, body: PAGE });
  off.C_ = () => ({ DEPARTMENT_DIRECTORY_URL: '' });
  assert.match(off.suggestInstructorEmails(['A,B']).error, /No department directory is set/);
  assert.equal(off.fetched.length, 0);
});

test('the Roster page fills the boxes from the suggestions and keeps what was typed', () => {
  const html = fs.readFileSync(path.join(APP, 'RosterPage.html'), 'utf8');
  const grab = name => html.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n  \\}\\n'))[0];
  const els = {};
  const ctx = {
    esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    said: [],
    document: { getElementById: id => els[id] || (els[id] = { value: '', textContent: '' }) }
  };
  ctx.say = (t, c) => ctx.said.push([t, c]);
  vm.createContext(ctx);
  vm.runInContext('var MISSING = [];\n' + grab('missingForm') + grab('showSuggestions'), ctx);
  const form = ctx.missingForm(['Barker,Holly', 'Castillo,Angela', 'Kopperl,Bob']);
  assert.match(form, /data-suggest="1"/, 'the form has the suggest button');
  ctx.document.getElementById('em1').value = 'typed@uw.edu';
  ctx.showSuggestions({ error: '', suggestions: {
    'Barker,Holly': { status: 'found', email: 'hmbarker@uw.edu', title: 'Teaching Professor', directoryName: 'Barker, Holly M.' },
    'Castillo,Angela': { status: 'found', email: 'other@uw.edu', title: '', directoryName: 'Castillo Ardila, Ángela' },
    'Kopperl,Bob': { status: 'not-found' }
  } });
  assert.equal(els.em0.value, 'hmbarker@uw.edu');
  assert.match(els.sg0.textContent, /From the department directory: Barker, Holly M\. \(Teaching Professor\)/);
  assert.equal(els.em1.value, 'typed@uw.edu', 'a typed address is not replaced');
  assert.match(els.sg2.textContent, /Not in the department directory/);
  assert.match(ctx.said[0][0], /2 of 3 email\(s\) suggested/);
  ctx.showSuggestions({ error: 'The department directory answered 500.', suggestions: {} });
  assert.match(ctx.said[1][0], /answered 500.*UW Directory/);
});

test('a successful Save replaces an earlier error message', async () => {
  const html = fs.readFileSync(path.join(APP, 'RosterPage.html'), 'utf8');
  const start = html.indexOf("document.getElementById('previewOut').addEventListener('click'");
  const end = html.indexOf('\n  });', start) + 6;
  let handler = null;
  const said = [];
  const els = { em0: { value: 'ok@uw.edu' }, ap0: { value: '' }, previewOut: { addEventListener: (t, f) => { handler = f; } } };
  const ctx = {
    document: { getElementById: id => els[id] },
    say: (t, c) => said.push([t, c]),
    loadPages: () => {},
    MISSING: [],
    call: () => Promise.resolve({ gradStudent: false })
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(start, end), ctx);
  said.push(['Enter a @uw.edu address.', 'bad']);
  const button = { textContent: 'Save', disabled: false, getAttribute: a => ({ 'data-suggest': null, 'data-save': '0', 'data-name': 'Grant,Jenna M' })[a] };
  handler({ target: button });
  await new Promise(r => setImmediate(r));
  assert.equal(button.textContent, 'Saved');
  assert.deepEqual(said[said.length - 1], ['Saved Grant,Jenna M.', 'ok']);
});

test('the Roster page links to the spreadsheet and its Students and Instructors tabs', () => {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'RosterImport.gs'), 'utf8'), ctx);
  ctx.C_ = () => ({ SPREADSHEET_ID: 'SHEET123', SHEETS: { STUDENTS: 'Students', INSTRUCTORS: 'Instructors' } });
  ctx.getSheetCached_ = name => ({ getSheetId: () => (name === 'Students' ? 11 : 22) });
  assert.deepEqual(plain(ctx.rosterSheetLinks_()), {
    spreadsheet: 'https://docs.google.com/spreadsheets/d/SHEET123/edit',
    students: 'https://docs.google.com/spreadsheets/d/SHEET123/edit#gid=11',
    instructors: 'https://docs.google.com/spreadsheets/d/SHEET123/edit#gid=22'
  });
  const html = fs.readFileSync(path.join(APP, 'RosterPage.html'), 'utf8');
  assert.match(html, /<p id="sheetLinks"/);
  assert.match(html, /link\(c\.sheetLinks\.instructors, 'Instructors'\)/);
});

test('email sentences start with a word, not a numeral', () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'CoreEmail.gs'), 'utf8'), ctx);
  assert.equal(ctx.sentenceNumber_(1), 'One');
  assert.equal(ctx.sentenceNumber_(2), 'Two');
  assert.equal(ctx.sentenceNumber_('12'), 'Twelve');
  assert.equal(ctx.sentenceNumber_(20), 'Twenty');
  assert.equal(ctx.sentenceNumber_(47), 'Forty-seven');
  assert.equal(ctx.sentenceNumber_(120), 'A total of 120');
  const cf1 = ctx.EMAIL_TEMPLATES_['CF-1']({ course: 'ANTH 503', quarter: 'Autumn 2026', n: 2, url: 'u', dueLong: 'd', notMineUrl: 'm', gpcName: 'G' });
  assert.match(cf1.body[0], /this quarter\. Two Anthropology graduate students took it/);
  const one = ctx.EMAIL_TEMPLATES_['CF-1']({ course: 'ANTH 503', quarter: 'Autumn 2026', n: 1, url: 'u', dueLong: 'd', notMineUrl: 'm', gpcName: 'G' });
  assert.match(one.body[0], /One Anthropology graduate student took it/);
  const ar5 = ctx.EMAIL_TEMPLATES_['AR-5']({ nReady: 3, nTotal: 5, subfield: 'Archaeology', url: 'u', nWaiting: 1 });
  assert.match(ar5.body[0], /^Three of 5 reviews in Archaeology/);
  assert.match(ar5.body[0], /\. One is still waiting/);
});

test('the instructor page shows a PhD student\'s candidacy', () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'CourseFeedback.gs'), 'utf8'), ctx);
  const c = s => ctx.candidacyStatus_(s);
  assert.equal(c({ Program: 'PHD', Entry_Quarter: 'AUT2022', Candidacy_Date: '6/12/2024' }), 'PhD candidate since June 2024');
  assert.equal(c({ Program: 'PHD', Entry_Quarter: 'AUT2022', Candidacy_Date: '2025-03-04' }), 'PhD candidate since March 2025', 'a cell Sheets read as a date');
  assert.equal(c({ Program: 'PHD', Entry_Quarter: 'AUT2022', Candidacy_Date: 'yes' }), 'PhD candidate', 'granted, no date');
  assert.equal(c({ Program: 'PHD', Entry_Quarter: 'AUT2024', Candidacy_Date: '' }), 'pre-candidacy');
  assert.equal(c({ Program: 'PHD', Entry_Quarter: '', Candidacy_Date: '' }), '', 'MyGrad data not loaded: say nothing');
  assert.equal(c({ Program: 'MA', Entry_Quarter: 'AUT2025', Candidacy_Date: '' }), '', 'MA students have no candidacy');
  const html = fs.readFileSync(path.join(APP, 'FeedbackForm.html'), 'utf8');
  assert.match(html, /\(s\.candidacy \? ' · ' \+ esc\(s\.candidacy\) : ''\)/, 'the page shows it after the year');
});
