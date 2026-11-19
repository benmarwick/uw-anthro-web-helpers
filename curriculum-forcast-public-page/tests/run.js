/* Tests for the curriculum forecast scripts. Run: node curriculum-forcast-public-page/tests/run.js [planning-rows.json]
   1. Loads every .gs file into one sandbox, as Apps Script does, so a syntax error or a name
      defined twice in two files fails here instead of breaking the live menus and trigger.
   2. Checks the Data Check logic on small invented rows.
   3. With a JSON export of real planning tabs (optional argument), prints the problem counts. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const DIR = path.join(__dirname, '..');
const ctx = { console };
vm.createContext(ctx);
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.gs')).sort();
for (const f of files) vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
// A name declared in two files with const/let throws above; a function defined twice silently wins, so check that too.
const fnNames = {};
for (const f of files) for (const m of fs.readFileSync(path.join(DIR, f), 'utf8').matchAll(/^function\s+([A-Za-z0-9_$]+)/gm)) {
  assert(!fnNames[m[1]], `function ${m[1]} is defined in both ${fnNames[m[1]]} and ${f}`);
  fnNames[m[1]] = f;
}
console.log('loaded', files.length, 'files,', Object.keys(fnNames).length, 'functions, no duplicates');

const t = (h, m) => ({ getHours: () => h, getMinutes: () => m });
const row = (n, o) => { const v = Array(19).fill(''); Object.keys(o).forEach(k => { v['ABCDEFGHIJKLMNOPQRS'.indexOf(k)] = o[k]; }); return { values: v, rowNum: n }; };
const ok = { B: 'AU', C: 2026, D: 'ANTH', E: 203, F: 'A', G: 5, H: 'Intro', I: 'Rivera', K: 2, L: 150, M: 'X', O: 'X', R: t(10, 30), S: t(12, 20) };
// Results cross from the sandbox through JSON, because arrays from another context are not deepStrictEqual to local ones.
const plain = x => JSON.parse(JSON.stringify(x));
const run = (rows, extra) => plain(vm.runInContext('checkPlanningRows_', ctx)(rows, Object.assign({ y0: 2026, prefixes: ['ANTH', 'ARCHY', 'BIO A'], catalog: null }, extra)));
const types = probs => probs.map(p => p.type);

assert.deepStrictEqual(run([row(2, ok)]), [], 'a correct row has no problems');
assert.deepStrictEqual(run([row(2, { B: 'SP' })]), [], 'a row with only a quarter is a placeholder, not a course');
const cases = [
  [{ B: 'Fall' }, 'Quarter is not AU, WI or SP'],
  [{ C: 2027 }, 'Year does not match the quarter'],
  [{ D: 'ANTH ' }, 'Prefix has extra spaces'],
  [{ D: 'GEOG' }, 'Prefix is not one of ANTH, ARCHY, BIO A'],
  [{ E: '2xx' }, 'Course number is not three digits'],
  [{ I: '' }, 'No instructor (fine for an independent study; otherwise type TBA)'],
  [{ G: '1-9' }, null],
  [{ G: 'five' }, 'Credits are not a number, a range or CR/NC'],
  [{ J: '524' }, 'Joint/withered does not name a course with its prefix'],
  [{ K: '1 reader' }, '# TAs is not a whole number'],
  [{ L: '30/15' }, null],
  [{ L: '75 (54 + 21)' }, 'Enrollment is not a whole number or a split such as 30/15'],
  [{ L: new Date(2026, 9, 10) }, 'Enrollment became a date (format the cell as plain text and retype the split)'],
  [{ L: '25' }, null],
  [{ N: ' ' }, 'Day cell is not X or Q'],
  [{ R: 'TBD' }, 'Start time is text, not a time'],
  [{ S: t(1, 20) }, 'End time is outside 7:00 to 22:00 (AM/PM?)'],
  [{ R: t(11, 30), S: t(10, 50) }, 'End time is not after the start time'],
  [{ M: '', O: '' }, 'Times but no days marked'],
  [{ R: '', S: '' }, 'Days marked but no start time']
];
for (const [change, want] of cases) {
  const got = types(run([row(2, Object.assign({}, ok, change))]));
  if (want === null) assert.deepStrictEqual(got, [], JSON.stringify(change) + ' should pass');
  else assert(got.includes(want), JSON.stringify(change) + ' should give "' + want + '", got ' + JSON.stringify(got));
}
assert(types(run([row(2, ok), row(3, ok)])).some(x => x === 'Same quarter, course and section as another row'), 'duplicate section');
assert(types(run([row(2, ok)], { catalog: { 'ANTH 101': true } })).includes('Not in the UW catalog (new number or typo?)'), 'catalog check');
// Linked courses across sheets: ARCHY 459 names ARCHY 560 (planned, same time) and ANTH 999 (not planned).
const partners = plain(vm.runInContext('checkPartners_', ctx)([{ y0: 2026, rows: [
  row(2, Object.assign({}, ok, { D: 'ARCHY', E: 459, J: 'ARCHY 560 A' })),
  row(3, Object.assign({}, ok, { D: 'ARCHY', E: 560, J: 'ARCHY 459 A' })),
  row(4, Object.assign({}, ok, { E: 410, J: 'ANTH 999', R: t(9, 30), S: t(10, 20) }))] }], ['ANTH', 'ARCHY', 'BIO A']));
assert.deepStrictEqual(partners.map(p => p.rowNum + ' ' + p.type), ['4 Linked course not planned in this quarter']);
console.log('Data Check rules:', cases.length + 4, 'cases pass');

// Settings: defaults, round trip through the tab layout, prefix helpers, and the patterns that replaced fixed ones.
const S = name => vm.runInContext(name, ctx);
ctx.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: () => null }) };   // no Settings tab: defaults apply
const defaults = plain(S('DEFAULT_SETTINGS_'));
assert.deepStrictEqual(plain(S('settings_')()), defaults, 'without a Settings tab, settings_() returns the defaults');
assert.strictEqual(defaults.department, ''); assert.deepStrictEqual(defaults.prefixes, []); assert.deepStrictEqual(defaults.options, []);
// Anthropology's values, as they were in the scripts before the Settings tab (the live forecast's Settings tab has these).
const anthro = Object.assign(JSON.parse(JSON.stringify(defaults)), {
  department: 'Anthropology',
  prefixes: [{ prefix: 'ANTH', sheetId: '', catalogUrl: 'https://www.washington.edu/students/crscat/anthro.html' },
             { prefix: 'ARCHY', sheetId: '', catalogUrl: 'https://www.washington.edu/students/crscat/archeo.html' },
             { prefix: 'BIO A', sheetId: '', catalogUrl: 'https://www.washington.edu/students/crscat/bioanth.html' }],
  options: ['MAGH', 'GLOB', 'ASCI', 'HEB', 'INDG'].map(c => ({ code: c, url: 'https://anthropology.washington.edu/' + c })) });
const back = plain(S('parseSettingsRows_')(S('settingsRows_')(anthro)));
assert.deepStrictEqual(back, anthro, 'writing the Settings tab and reading it back gives the same settings');
assert.deepStrictEqual(plain(S('parseSettingsRows_')(S('settingsRows_')(defaults))), defaults, 'round trip of the neutral defaults');
const custom = JSON.parse(JSON.stringify(defaults));
custom.department = 'Geography'; custom.prefixes = [{ prefix: 'GEOG', sheetId: '1'.repeat(44), catalogUrl: 'https://www.washington.edu/students/crscat/geog.html' }, { prefix: 'JSIS A', sheetId: '', catalogUrl: '' }];
custom.options = []; custom.phrases.core = ['Core'];
assert.deepStrictEqual(plain(S('parseSettingsRows_')(S('settingsRows_')(custom))), custom, 'round trip with other values, a prefix with a space and no options');
assert.strictEqual(S('canonicalPrefix_')('BIOA', anthro.prefixes), 'BIO A');
assert.strictEqual(S('canonicalPrefix_')('ANTH', anthro.prefixes), 'ANTH');
assert.strictEqual(S('canonicalPrefix_')('LING', anthro.prefixes), 'LING', 'a prefix not on the list is left as read');
assert.strictEqual(S('adminTabName_')('BIO A'), 'forAdminBIOA');
// The generated patterns are the same as the fixed ones they replaced in Scraper.gs.
assert.strictEqual(S('prefixCoursePattern_')(anthro.prefixes).source, /(ANTH|ARCHY|BIO\s?A)\s*(\d{3})/gi.source);
assert.strictEqual(S('phrasePattern_')(defaults.phrases.core).source, /Core Coursework|Core Requirements|Required Coursework|Required Core|ASc core list/i.source);
assert.strictEqual(S('phrasePattern_')(defaults.phrases.reqd).source, /Specific Courses Required|Choose one|Select from|one of the following|Choose from|Students are required to take two of the courses/i.source);
assert.strictEqual(S('phrasePattern_')(defaults.phrases.aprvd).source, /Approved Electives|Elective Courses|approved elective list|department-approved list|15 credits from the department approved elective list|15 credits from the following|credits from approved IA core list|credits from the department approved list/i.source);
const tabRows = S('settingsRows_')(anthro);
ctx.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: n => n === 'Settings' ? { getDataRange: () => ({ getDisplayValues: () => tabRows }) } : null }) };
vm.runInContext('settingsCache_ = null', ctx);
const page = plain(S('getPageSettings')());
assert.deepStrictEqual(page.prefixes, ['ANTH', 'ARCHY', 'BIO A']);
assert.strictEqual(page.catalogLinks['BIO A'], 'https://www.washington.edu/students/crscat/bioanth.html');
assert.deepStrictEqual(Object.keys(page.optionLinks), ['MAGH', 'GLOB', 'ASCI', 'HEB', 'INDG']);
assert.strictEqual(page.department, 'Anthropology', 'page settings come from the Settings tab');
assert(!JSON.stringify(page).includes('sheetId'), 'page settings carry no sheet IDs');
console.log('Settings: 21 checks pass');

if (process.argv[2]) {
  const tabs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const fix = v => (v && v.__t ? t(v.__t[0], v.__t[1]) : v);
  tabs.forEach(tb => tb.rows.forEach(r => { r.values = r.values.map(fix); }));
  let all = [];
  tabs.forEach(tb => { all = all.concat(run(tb.rows, { y0: tb.y0 })); });
  all = all.concat(plain(vm.runInContext('checkPartners_', ctx)(tabs, ['ANTH', 'ARCHY', 'BIO A'])));
  const counts = {};
  all.forEach(p => { const k = p.level + ': ' + p.type; counts[k] = (counts[k] || 0) + 1; });
  console.log(JSON.stringify(counts, null, 1));
  const timeRows = all.filter(p => /outside 7:00|not after the start/.test(p.type)).map(p => `${p.sheet} ${p.tab} ${p.course}`);
  console.log('time-order rows:', [...new Set(timeRows)]);
}

// Formula builders (Setup.gs) against the live forecast's formulas, read 19 Nov 2026.
const live = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'live-formulas-2026-11-19.json'), 'utf8'));
const ID = { ANTH: 'ID_ANTH', 'BIO A': 'ID_BIOA', ARCHY: 'ID_ARCHY' };
const KEY = { ANTH: 'ANTHkey', 'BIO A': 'BIOAkey', ARCHY: 'ARCHYkey' };
// The live formulas use named ranges; the builders write each sheet ID as text. Swap one for the other before comparing.
// Function names are case-insensitive in Sheets, and forAdminBIOA spells importrange in lowercase.
const asText = f => Object.keys(KEY).reduce((x, p) => x.split('""&' + KEY[p] + '&""').join('"' + ID[p] + '"').split(KEY[p]).join('"' + ID[p] + '"'), f).replace(/\n$/, '').replace(/importrange\(/g, 'IMPORTRANGE(');
const liveOrder = ['ANTH', 'BIO A', 'ARCHY'].map(p => ({ prefix: p, sheetId: ID[p] }));
assert.strictEqual(S('combineFormula_')(liveOrder, 'AY1_sheetrange', 'AY1_quarters'), asText(live.student_A6), 'student tab A6');
assert.strictEqual(S('combineFormula_')(liveOrder, 'AY2_sheetrange', 'AY2_quarters'), asText(live.student_K6), 'student tab K6');
assert.strictEqual(S('combineFormula_')(liveOrder, 'AY1_sheetrange_more', 'AY1_quarters', ' AND Col11 is not null'), asText(live.ta_A2), 'TA needs A2');
for (const p of ['ANTH', 'ARCHY', 'BIO A']) {
  assert.strictEqual(S('forAdminFormula_')({ prefix: p, sheetId: ID[p] }), asText(live.forAdmin_B2[S('adminTabName_')(p)]), 'forAdmin B2 for ' + p);
}
const headings = plain(S('ADMIN_HEADINGS_'));
headings.forEach((h, i) => assert.strictEqual(h, live.forAdmin_row1[S('colLetter_')(2 + i) + '1'], 'forAdmin heading ' + (2 + i)));
// Summaries: the live sheet has two intended differences, R7 (reads $C3, skipping a row) and the BIO A label (BIOA).
const expected = Object.assign({}, live.summaries, { R7: live.summaries.R7.replace('$C3:$F', '$C2:$F'), P3: 'BIO A' });
const built = {};
['ANTH', 'ARCHY', 'BIO A'].forEach((p, i) => Object.assign(built, plain(S('summariesBlock_')({ prefix: p }, i))));
Object.keys(built).forEach(a1 => { built[a1] = String(built[a1]); });
assert.deepStrictEqual(built, expected, 'Summaries blocks');
// Shapes for other prefix counts: one prefix, and four with a space and a quote-needing tab name.
const one = S('combineFormula_')([{ prefix: 'GEOG', sheetId: 'G' }], 'AY1_sheetrange', 'AY1_quarters');
assert(!one.includes(';') && one.includes('IMPORTRANGE("G", AY1_sheetrange)'), 'one prefix: one line, no separator');
const four = S('combineFormula_')(['A', 'B', 'C', 'D'].map(x => ({ prefix: x, sheetId: x })), 'AY1_sheetrange', 'AY1_quarters');
assert.strictEqual((four.match(/;\n/g) || []).length, 3, 'four prefixes: three separators');
assert.strictEqual(plain(S('summariesBlock_')({ prefix: 'JSIS A' }, 3))['X5'], '=COUNTUNIQUE(IFERROR(QUERY(forAdminJSISA!$C2:$F, "SELECT F WHERE C = \'AU\' AND F LIKE \'1%\'"), ))', 'fourth block: labels in W, first count in X');
assert.strictEqual(S('sheetRef_')("forAdminB&A"), "'forAdminB&A'", 'tab names with other characters are quoted');
console.log('Formula builders: match the live formulas (' + Object.keys(built).length + ' Summaries cells), 4 shape checks pass');

// Setup form helpers (Setup.gs).
assert.strictEqual(S('sheetIdFromUrl_')('https://docs.google.com/spreadsheets/d/1qu6Dl1ua2dLnkeR-j3ek1OJWAEVATlIdSJzjpH8CoAQ/edit#gid=0'), '1qu6Dl1ua2dLnkeR-j3ek1OJWAEVATlIdSJzjpH8CoAQ');
assert.strictEqual(S('sheetIdFromUrl_')('1qu6Dl1ua2dLnkeR-j3ek1OJWAEVATlIdSJzjpH8CoAQ'), '1qu6Dl1ua2dLnkeR-j3ek1OJWAEVATlIdSJzjpH8CoAQ');
assert.strictEqual(S('sheetIdFromUrl_')('not a sheet'), '');
const idx = plain(S('catalogIndex_')('<li><a href="anthro.html">Anthropology (ANTH)</a></li><li><a href="bioanth.html">Biological Anthropology (BIO&nbsp;A)</a></li>' +
  '<li><a href="jsisa.html">International Studies (Area Studies) (JSIS A)</a></li><li>China Studies -- See <a href="#JSIS">Jackson School</a></li>'));
assert.deepStrictEqual(idx, { ANTH: 'https://www.washington.edu/students/crscat/anthro.html', 'BIO A': 'https://www.washington.edu/students/crscat/bioanth.html',
  'JSIS A': 'https://www.washington.edu/students/crscat/jsisa.html' }, 'catalog index: last bracketed group, &nbsp; as a space, cross-references ignored');
const goodRow = ['', 'Quarter', 'Year', 'Prefix', 'Course #', 'Section', 'Credits', 'Title', 'Instructor', 'Joint/Withered', '# TAs', 'Total Enrollment', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Time Start', 'Time End'];
assert.deepStrictEqual(plain(S('planningHeadingProblems_')(goodRow)), [], 'the ANTH headings (with "Total Enrollment" and "Time Start") pass');
const oldRow = goodRow.slice(0, 12).concat(['W Course?', 'Add Code Permission', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
assert(plain(S('planningHeadingProblems_')(oldRow)).length >= 5, 'the old layout (W Course? at M) is caught');
const fs1 = plain(S('settingsFromForm_')({ department: ' Geography ', prefixes: [{ prefix: 'geog', mode: 'make' }, { prefix: 'jsis  a', mode: 'use', sheet: 'https://docs.google.com/spreadsheets/d/' + 'x'.repeat(40) + '/edit' }, { prefix: '' }],
  options: [{ code: '', url: 'x' }], genEd: 'NSc, DIV', core: '', reqd: '', aprvd: '' }));
assert.deepStrictEqual(fs1.prefixes.map(p => [p.prefix, p.mode, p.sheetId.length]), [['GEOG', 'make', 0], ['JSIS A', 'use', 40]], 'form prefixes: upper case, single spaces, blanks dropped');
assert.strictEqual(fs1.department, 'Geography'); assert.deepStrictEqual(fs1.options, []); assert.deepStrictEqual(fs1.genEd, ['NSc', 'DIV']);
assert.deepStrictEqual(fs1.phrases, defaults.phrases, 'empty phrase boxes keep the defaults');
console.log('Setup form helpers: 11 checks pass');

// Scraper (Scraper.gs): Gen Ed codes from catalog headers, which write A&H as A&amp;H. Lines copied from the live ANTH page, 19 Nov 2026.
const catalogHtml = '<a name="anth203"><p><b>ANTH 203 Introduction to Anthropological Linguistics (5) SSc/A&amp;H</b><br/>Linguistic methods. Offered: jointly with LING 203.<br/><a href="x">View course details in MyPlan: ANTH 203</a></p></a>' +
  '<a name="anth358"><p><b>ANTH 358 Culture and Cognition (5) SSc/NSc</b><br/>Surveys theories.<br/><a href="x">View course details in MyPlan: ANTH 358</a></p></a>' +
  '<a name="anth394"><p><b>ANTH 394 Embodied Liberation Theory and Praxis (3/5) A&amp;H/SSc, DIV</b><br/>Explores praxis.<br/><a href="x">View course details in MyPlan: ANTH 394</a></p></a>';
const parsed = plain(S('parseCatalogPage_')(catalogHtml, anthro.prefixes, defaults.genEd));
assert.deepStrictEqual(parsed.map(r => r[0] + ': ' + r[1]), ['ANTH 203: SSc, A&H', 'ANTH 358: NSc, SSc', 'ANTH 394: SSc, A&H, DIV'], 'Gen Ed codes, including A&H written as A&amp;H');
assert.strictEqual(S('decodeEntities_')('A&amp;H&nbsp;&lt;b&gt;'), 'A&H <b>');

// Reference tabs are left alone when a page failed, nothing was found, or the list shrank by more than half.
const fakeSheet = oldRows => {
  const sh = { written: null, cleared: false, getName: () => 'Ref_GenEd', getLastRow: () => oldRows + 1, clear: () => { sh.cleared = true; } };
  sh.getRange = () => ({ setValues: v => { if (v.length > 1 || sh.cleared) sh.written = (sh.written || []).concat(v); return { setFontWeight: () => {} }; } });
  return sh;
};
ctx.SpreadsheetApp = { flush: () => {} };
const rowsOf = n => Array.from({ length: n }, (_, i) => ['ANTH ' + (100 + i), '', 'FALSE', 'd']);
const update = S('updateReferenceTab_');
let sh = fakeSheet(170);
assert(/could not be read/.test(update(sh, ['A'], rowsOf(100), ['ARCHY catalog page could not be read (timeout)'])) && !sh.cleared, 'a failed page leaves the tab as it was');
sh = fakeSheet(170);
assert(/no courses found/.test(update(sh, ['A'], [], [])) && !sh.cleared, 'nothing found leaves the tab as it was');
sh = fakeSheet(170);
assert(/under half/.test(update(sh, ['A'], rowsOf(80), [])) && !sh.cleared, 'a list under half the old one leaves the tab as it was');
sh = fakeSheet(170);
assert.strictEqual(update(sh, ['A'], rowsOf(160), []), '', 'a normal update is written');
assert(sh.cleared, 'a normal update rewrites the tab');
sh = fakeSheet(0);
assert.strictEqual(update(sh, ['A'], rowsOf(5), []), '', 'an empty tab is filled');
// A failed fetch is reported, not swallowed.
ctx.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: n => n === 'Settings' ? { getDataRange: () => ({ getDisplayValues: () => tabRows }) } : null }) };
vm.runInContext('settingsCache_ = null', ctx);
ctx.UrlFetchApp = { fetch: url => { if (/archeo/.test(url)) throw new Error('timeout'); return { getContentText: () => catalogHtml }; } };
const scraped = plain(S('scrapeMasterGenEd_')());
assert.deepStrictEqual(scraped.failures, ['ARCHY catalog page could not be read (Error: timeout)'], 'the failed page is named');
ctx.UrlFetchApp = { fetch: () => ({ getContentText: () => '<html>Site maintenance</html>' }) };
assert.strictEqual(plain(S('scrapeMasterGenEd_')()).failures.length, 3, 'a page with no courses counts as a failure');
console.log('Scraper: 11 checks pass');

// Access (Settings.gs): writing functions refuse calls from the web page.
const asUser = (active, runsAs, triggerIds) => {
  ctx.Session = { getActiveUser: () => ({ getEmail: () => active }), getEffectiveUser: () => ({ getEmail: () => runsAs }) };
  ctx.ScriptApp = { getProjectTriggers: () => (triggerIds || []).map(id => ({ getUniqueId: () => id })) };
};
const allowed = e => { try { S('requireDirectRun_')(e); return true; } catch (err) { return false; } };
asUser('owner@uw.edu', 'owner@uw.edu'); assert(allowed(), 'the owner running it from the spreadsheet');
asUser('Editor@uw.edu', 'editor@uw.edu'); assert(allowed(), 'an editor running it from the spreadsheet (the script runs as them)');
asUser('student@uw.edu', 'owner@uw.edu'); assert(!allowed(), 'a visitor to the web page');
asUser('', 'owner@uw.edu'); assert(!allowed(), 'a visitor whose address is hidden');
asUser('', 'owner@uw.edu', ['123']); assert(allowed({ triggerUid: '123' }), 'the monthly trigger');
asUser('student@uw.edu', 'owner@uw.edu', ['123']); assert(!allowed({ triggerUid: '999' }), 'a made-up trigger ID');
asUser('student@uw.edu', 'owner@uw.edu');
for (const f of ['applySettings', 'getSetupState', 'checkSetup', 'runSetup', 'saveWebAppUrl', 'runFullUpdate', 'runDataCheck', 'runScheduleChecks', 'applyPlanningRulesFromMenu']) {
  assert.throws(() => S(f)({}), /only be run from the forecast spreadsheet/, f + ' refuses a web page visitor');
}
// Every function a page can call (no trailing _) either is meant for the pages, needs objects a page cannot send, or checks access.
const pageSafe = ['doGet', 'getCourseData', 'getScheduleData', 'getPageSettings', 'getGenEdMap', 'getOptionsMap', 'getMinutesFromMidnight', 'daysOverlap', 'timesOverlap', 'onOpen', 'openSetupForm'];
for (const f of files) for (const m of fs.readFileSync(path.join(DIR, f), 'utf8').matchAll(/^function\s+([A-Za-z0-9_$]*[A-Za-z0-9$])\s*\(([^)]*)\)\s*\{\s*\n\s*(.*)/gm)) {
  if (m[1].endsWith('_') || pageSafe.includes(m[1])) continue;
  assert(/requireDirectRun_\(/.test(m[3]), m[1] + ' (' + f + ') can be called from the web page but does not call requireDirectRun_ first');
}
console.log('Access: 15 checks pass, every other callable function checks access');
ctx.SpreadsheetApp = { flush: () => {} };
sh = fakeSheet(170);
assert.strictEqual(update(sh, ['A'], rowsOf(30), [], true), '', 'Set up may shorten the list (a prefix or option removed)');
sh = fakeSheet(170);
assert(/could not be read/.test(update(sh, ['A'], rowsOf(30), ['x could not be read'], true)) && !sh.cleared, 'but not when a page failed');
// Option pages: one with none of our courses, or with no address, is a note; a page that cannot be read blocks the update.
ctx.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: n => n === 'Settings' ? { getDataRange: () => ({ getDisplayValues: () => tabRows }) } : null }) };
vm.runInContext('settingsCache_ = null', ctx);
const quiet = { log() {}, warn() {}, error() {} };
ctx.console = quiet;
ctx.UrlFetchApp = { fetch: url => { if (/HEB/.test(url)) throw new Error('404'); return { getContentText: () => /MAGH/.test(url) ? 'Core Coursework ANTH 203 Approved Electives ARCHY 205' : 'nothing here' }; } };
const opts = plain(S('scrapeMasterOptions_')());
ctx.console = console;
assert.deepStrictEqual(opts.failures, ['Option HEB page could not be read (Error: 404)'], 'only the unreadable option page blocks');
assert.deepStrictEqual(opts.rows.map(r => r[0] + ' ' + r[1]), ['ANTH 203 MAGH', 'ARCHY 205 MAGH']);
console.log('Scraper (Set up and option pages): 4 checks pass');

// ---------- Items 5 to 12 (review of Nov 2026) ----------
// 5. Set up on a Shared Drive: no owner, so whoever runs it from the spreadsheet may run Set up.
const ownerOf = (me, owner) => {
  ctx.Session = { getActiveUser: () => ({ getEmail: () => me }) };
  return plain(S('ownerStatus_')({ getOwner: () => owner ? { getEmail: () => owner } : null }));
};
assert(ownerOf('owner@uw.edu', 'owner@uw.edu').isOwner, 'the owner may run Set up');
assert(!ownerOf('editor@uw.edu', 'owner@uw.edu').isOwner, 'an editor may not, when the file has an owner');
const shared = ownerOf('editor@uw.edu', null);
assert(shared.isOwner && shared.sharedDrive, 'on a Shared Drive (no owner) the person running it may');
assert(!ownerOf('', null).isOwner, 'but not someone whose address is hidden');
console.log('Set up on a Shared Drive: 4 checks pass');

// 9. Data Check reads every row of a planning tab, not only the first 200.
assert(!/Math\.min\(last, 200\)/.test(fs.readFileSync(path.join(DIR, 'DataCheck.gs'), 'utf8')), 'Data Check has no 200-row cap');

// 10. Conflict report: sections of one course and joint/withered partners meet together on purpose.
const together = (a, b) => S('meetTogether_')(a, b);
assert(together({ fullName: 'ANTH 469', joint: '' }, { fullName: 'ANTH 469', joint: '' }), 'two sections of one course');
assert(together({ fullName: 'ANTH 469', joint: 'ARCHY 469' }, { fullName: 'ARCHY 469', joint: '' }), 'partner named on the first row');
assert(together({ fullName: 'ARCHY 469', joint: '' }, { fullName: 'ANTH 469', joint: 'archy  469' }), 'partner named on the second row, any case and spacing');
assert(!together({ fullName: 'ANTH 469', joint: '' }, { fullName: 'ANTH 470', joint: '' }), 'two different courses still count');
assert(!together({ fullName: 'ANTH 469', joint: 'LING 469' }, { fullName: 'ARCHY 469', joint: '' }), 'a partner elsewhere does not excuse an unrelated course');
console.log('Conflict report partners: 5 checks pass');

// 12. Option tagging ignores the site menu, header and footer.
const menuPage = '<header>Choose from many programs</header><nav><a>Core Coursework</a><a>Approved Electives</a></nav>' +
  '<main><h2>Core Coursework</h2> ANTH 203 <h2>Approved Electives</h2> ARCHY 205</main><footer>ANTH 999</footer>';
const body = S('mainContent_')(menuPage);
assert(!/Choose from many/.test(body) && !/ANTH 999/.test(body) && /ANTH 203/.test(body), 'only the main content is kept');
assert.strictEqual(S('mainContent_')('<p>no main here</p>'), '<p>no main here</p>', 'a page with no <main> is used whole');
ctx.console = quiet;
ctx.UrlFetchApp = { fetch: url => ({ getContentText: () => /MAGH/.test(url) ? menuPage : 'nothing here' }) };
const tagged = plain(S('scrapeMasterOptions_')());
ctx.console = console;
const magh = tagged.rows.filter(r => r[1] === 'MAGH');
assert.deepStrictEqual(magh.map(r => r[0]), ['ANTH 203', 'ARCHY 205'], 'the footer course is not tagged');
assert.deepStrictEqual(magh.map(r => [r[2], r[4]]), [[true, false], [false, true]], 'core and approved come from the page body, not the menu');
console.log('Option tagging: 4 checks pass');

// Pages: run the page scripts in a small fake browser.
const pageScript = file => [...fs.readFileSync(path.join(DIR, file), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

// 6, 7, 8. Student page: a failed request shows a retry; sheet text is escaped; no link to "undefined".
const els = {};
const el = id => els[id] || (els[id] = { id, innerHTML: '', style: {}, textContent: '' });
let failWith = null;
const runner = () => {
  const r = { ok: null, fail: null };
  const chain = new Proxy({}, { get: (t, k) => {
    if (k === 'withSuccessHandler') return f => { r.ok = f; return chain; };
    if (k === 'withFailureHandler') return f => { r.fail = f; return chain; };
    return () => {
      if (failWith && r.fail) return r.fail(new Error(failWith));
      if (k === 'getPageSettings') r.ok({ catalogLinks: { ANTH: 'https://cat/anth' }, optionLinks: {}, genEd: ['A&H'], department: 'Anth' });
      if (k === 'getCourseData') r.ok([
        { quarter: 'AU', year: '2026', prefix: 'ANTH', courseNum: '101', title: 'Sex & <b>Gender</b>', instructor: 'O\'Neil', genEd: 'A&H', description: 'Kinship &amp; family', options: [] },
        { quarter: 'AU', year: '2026', prefix: 'BIO A', courseNum: '201', title: 'Bones', instructor: 'Lee', genEd: '', description: '', options: [] }
      ]);
    };
  } });
  return chain;
};
const textarea = () => { const o = { _v: '' }; Object.defineProperty(o, 'innerHTML', { set(v) { o._v = v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); } }); Object.defineProperty(o, 'value', { get() { return o._v; } }); return o; };
const pageCtx = { console, location: { reload() {} }, document: { getElementById: el, querySelectorAll: () => [], createElement: textarea } };
pageCtx.window = pageCtx;
pageCtx.google = { script: { get run() { return runner(); } } };
vm.createContext(pageCtx);
vm.runInContext(pageScript('Index.html'), pageCtx);
pageCtx.window.onload();
const rowsHtml = els['course-body'].innerHTML;
assert(rowsHtml.includes('Sex &amp; &lt;b&gt;Gender&lt;/b&gt;') && !rowsHtml.includes('<b>Gender'), 'a title is shown as text');
assert(rowsHtml.includes('O&#39;Neil'), 'an instructor is escaped');
assert(rowsHtml.includes('Kinship &amp; family') && !rowsHtml.includes('&amp;amp;'), 'a catalog description is decoded once and escaped once');
const sidebar = els['sidebar-filters'].innerHTML;
assert(sidebar.includes('href="https://cat/anth"') && !sidebar.includes('undefined'), 'a prefix with no catalog page has no link');
failWith = 'boom';
els.loading.innerHTML = '';
pageCtx.window.onload();
assert(/could not be loaded/.test(els.loading.innerHTML) && /Try again/.test(els.loading.innerHTML), 'a failed request offers a retry');
console.log('Student page: 5 checks pass');

// 11. Schedule dashboard: time axis fits evening classes, pathway stays in the quarter, unreadable times are named.
let plotted = null;
const vals = { '#quarterFilter': 'AU', '#prefixFilter': 'ALL', '#courseSelect': [] };
const $ = sel => typeof sel === 'function' ? null : ({ ready() {}, val: () => vals[sel], text() {}, hide() {}, show() {}, append() {}, select2() {}, on() {} });
const dashCtx = { console, document: {}, $, Plotly: { newPlot: (id, data, layout) => { plotted = { data, layout }; } }, google: { script: { run: {} } } };
vm.createContext(dashCtx);
vm.runInContext(pageScript('ScheduleDashboard.html'), dashCtx);
const parse = s => { const r = dashCtx.parseTimeData(s); return r && r.plotStr; };
assert.strictEqual(parse('10:30 AM'), '1970-01-01 10:30:00');
assert.strictEqual(parse('12:20 PM'), '1970-01-01 12:20:00');
assert.strictEqual(parse('18:30:00'), '1970-01-01 18:30:00', 'a 24-hour clock time');
assert.strictEqual(parse('TBA'), null, 'text that is not a time');
const course = (code, q, start, end) => ({ fullCode: code, quarter: q, prefix: code.split(' ')[0], level: '300', title: 'T', instructor: 'I', days: ['Mon'], start, end });
dashCtx.rawData = [course('ANTH 301', 'AU', '6:30 PM', '9:20 PM'), course('ANTH 301', 'WI', '10:30 AM', '11:20 AM'), course('ANTH 302', 'AU', 'TBA', 'TBA')];
vm.runInContext('rawData = this.rawData', dashCtx);
dashCtx.drawChart();
assert.deepStrictEqual(plain(plotted.layout.xaxis.range), ['1970-01-01 08:00:00', '1970-01-01 22:00:00'], 'the axis stretches to a 9:20 PM end');
assert(/ANTH 302/.test(plotted.layout.title), 'a course with an unreadable time is named');
vals['#courseSelect'] = ['ANTH 301'];
dashCtx.drawChart();
assert.strictEqual(plotted.data[0].base.length, 1, 'the pathway check shows only the chosen quarter');
console.log('Schedule dashboard: 7 checks pass');
