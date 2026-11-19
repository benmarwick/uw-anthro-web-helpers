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
