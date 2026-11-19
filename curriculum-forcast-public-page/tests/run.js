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
  row(4, Object.assign({}, ok, { E: 410, J: 'ANTH 999', R: t(9, 30), S: t(10, 20) }))] }]));
assert.deepStrictEqual(partners.map(p => p.rowNum + ' ' + p.type), ['4 Linked course not planned in this quarter']);
console.log('Data Check rules:', cases.length + 4, 'cases pass');

if (process.argv[2]) {
  const tabs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const fix = v => (v && v.__t ? t(v.__t[0], v.__t[1]) : v);
  tabs.forEach(tb => tb.rows.forEach(r => { r.values = r.values.map(fix); }));
  let all = [];
  tabs.forEach(tb => { all = all.concat(run(tb.rows, { y0: tb.y0 })); });
  all = all.concat(plain(vm.runInContext('checkPartners_', ctx)(tabs)));
  const counts = {};
  all.forEach(p => { const k = p.level + ': ' + p.type; counts[k] = (counts[k] || 0) + 1; });
  console.log(JSON.stringify(counts, null, 1));
  const timeRows = all.filter(p => /outside 7:00|not after the start/.test(p.type)).map(p => `${p.sheet} ${p.tab} ${p.course}`);
  console.log('time-order rows:', [...new Set(timeRows)]);
}
