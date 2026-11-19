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
