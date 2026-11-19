/**
 * Setup: rebuilds everything in the forecast spreadsheet that depends on the list of
 * prefixes, from the Settings tab (setup-form-plan.md, Phase 2).
 *
 * The formula builders are pure functions (text in, text out), tested in tests/run.js
 * against the live forecast's formulas. applySettings() writes their output.
 */

// forAdmin row 1, columns B to T: the planning sheet's columns A to S. The scripts find columns by these names.
const ADMIN_HEADINGS_ = ['Sort', 'Quarter', 'Year', 'Prefix', 'Course #', 'Section', 'Credits', 'Title', 'Instructor',
  'Joint/Withered', '# TAs', 'Enrollment', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Time start', 'Time end'];

/* A sheet name as a formula reference: quoted only when it contains anything other than letters, digits and _. */
function sheetRef_(name) { return /^[A-Za-z0-9_]+$/.test(name) ? name : "'" + name.replace(/'/g, "''") + "'"; }

/* Student tab A6 and K6, TA needs A2: one QUERY(IMPORTRANGE(...)) line per prefix, stacked. */
function combineFormula_(prefixes, rangeName, quartersName, extraWhere) {
  const lines = prefixes.map(function(p) {
    return '      QUERY(IMPORTRANGE("' + p.sheetId + '", ' + rangeName + '), "select * offset 1", 0)';
  });
  return '=SORT(\n  QUERY(\n    {\n' + lines.join(';\n') + '\n    },\n' +
    '    "SELECT * WHERE (" & ' + quartersName + ' & ")' + (extraWhere || '') + '",\n    0\n  ),\n  1,\n  TRUE\n)';
}

/* forAdmin B2: one prefix's planning tab for the Admin year (Dashboard B25 range, B26 quarters). */
function forAdminFormula_(prefix) {
  return '=SORT(ArrayFormula(QUERY(IMPORTRANGE("' + prefix.sheetId + '", ""&Dashboard!B25&""), "SELECT * WHERE ("&Dashboard!B26&")")), 1, TRUE)';
}

/* Column letters for a 1-based column number. */
function colLetter_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/**
 * Summaries: one seven-column block per prefix, starting in column B and every seven columns after.
 * Returns { a1: value or formula } for rows 2 to 10 of the block for prefix number i (0-based).
 */
function summariesBlock_(prefix, i) {
  const c0 = 2 + 7 * i, L = function(k) { return colLetter_(c0 + k); };   // L(0) label column, L(1..4) levels, L(5) total
  const tab = sheetRef_(adminTabName_(prefix.prefix));
  const out = {};
  out[L(0) + '2'] = '=LEFT(""&Dashboard!$B$25&"", 7)';
  out[L(0) + '3'] = prefix.prefix;
  [100, 200, 300, 400].forEach(function(lv, k) { out[L(k + 1) + '4'] = lv; });
  out[L(5) + '4'] = 'Total';
  ['AU', 'WI', 'SP'].forEach(function(q, r) {
    const row = 5 + r;
    out[L(0) + row] = q;
    [1, 2, 3, 4].forEach(function(d, k) {
      out[L(k + 1) + row] = '=COUNTUNIQUE(IFERROR(QUERY(' + tab + '!$C2:$F, "SELECT F WHERE C = \'' + q + '\' AND F LIKE \'' + d + '%\'"), ))';
    });
    out[L(5) + row] = '=SUM(' + L(1) + row + ':' + L(4) + row + ')';
  });
  out[L(0) + '9'] = 'total';
  [1, 2, 3, 4].forEach(function(k) { out[L(k) + '9'] = '=SUM(' + L(k) + '5:' + L(k) + '7)'; });
  out[L(5) + '9'] = '=SUM(' + L(1) + '9:' + L(4) + '9)';
  out[L(0) + '10'] = '%';
  [1, 2, 3, 4].forEach(function(k) { out[L(k) + '10'] = '=round(' + L(k) + '9/sum($' + L(1) + '$9:$' + L(4) + '$9)*100,0)'; });
  return out;
}

/**
 * Rebuilds the forAdmin tabs, the combining formulas and Summaries from the Settings tab.
 * Every prefix needs a planning sheet ID. forAdmin tabs for prefixes no longer listed are
 * reported, and deleted only when removeOld is true. Run from the editor, or from the setup form.
 */
function applySettings(removeOld) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  settingsCache_ = null;
  const s = settings_();
  const missing = s.prefixes.filter(function(p) { return !/^[A-Za-z0-9_-]{30,}$/.test(String(p.sheetId || '')); });
  if (!s.prefixes.length) throw new Error('The Settings tab lists no prefixes.');
  if (missing.length) throw new Error('No planning sheet ID on the Settings tab for: ' + missing.map(function(p) { return p.prefix; }).join(', '));
  const log = [];

  // forAdmin tabs: create from an existing one (keeps its formatting), set row 1 and B2.
  const existing = ss.getSheets().filter(function(sh) { return /^forAdmin/.test(sh.getName()); });
  const model = existing[0] || null;
  s.prefixes.forEach(function(p) {
    const name = adminTabName_(p.prefix);
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = model ? model.copyTo(ss).setName(name) : ss.insertSheet(name);
      sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), sh.getMaxColumns()).clearContent();
      log.push('Created ' + name + '.');
    }
    sh.getRange(1, 2, 1, ADMIN_HEADINGS_.length).setValues([ADMIN_HEADINGS_]);
    sh.getRange('B2').setFormula(forAdminFormula_(p));
  });
  const wanted = s.prefixes.map(function(p) { return adminTabName_(p.prefix); });
  existing.filter(function(sh) { return wanted.indexOf(sh.getName()) === -1; }).forEach(function(sh) {
    if (removeOld === true) { log.push('Deleted ' + sh.getName() + ' (prefix no longer listed).'); ss.deleteSheet(sh); }
    else log.push(sh.getName() + ' is not for a listed prefix; left in place.');
  });

  // Combining formulas.
  const st = ss.getSheetByName('Current and Next Academic Year'), ta = ss.getSheetByName('TA needs');
  st.getRange('A6').setFormula(combineFormula_(s.prefixes, 'AY1_sheetrange', 'AY1_quarters'));
  st.getRange('K6').setFormula(combineFormula_(s.prefixes, 'AY2_sheetrange', 'AY2_quarters'));
  ta.getRange('A2').setFormula(combineFormula_(s.prefixes, 'AY1_sheetrange_more', 'AY1_quarters', ' AND Col11 is not null'));

  // Summaries: clear the blocks, copy the first block's formatting to each new block position, write each block.
  const su = ss.getSheetByName('Summaries');
  const width = 7 * s.prefixes.length + 1;
  if (su.getMaxColumns() < width) su.insertColumnsAfter(su.getMaxColumns(), width - su.getMaxColumns());
  su.getRange(2, 2, 9, su.getMaxColumns() - 1).clearContent();
  if (su.getMaxColumns() > width) su.getRange(2, width + 1, 9, su.getMaxColumns() - width).clearFormat();   // blocks of removed prefixes
  s.prefixes.forEach(function(p, i) {
    if (i > 0) su.getRange('B2:H10').copyFormatToRange(su, 2 + 7 * i, 8 + 7 * i, 2, 10);
    const block = summariesBlock_(p, i);
    Object.keys(block).forEach(function(a1) {
      const v = block[a1];
      if (typeof v === 'string' && v.charAt(0) === '=') su.getRange(a1).setFormula(v); else su.getRange(a1).setValue(v);
    });
  });
  SpreadsheetApp.flush();
  log.push('Rebuilt the student tab (A6, K6), TA needs (A2) and Summaries for ' + s.prefixes.map(function(p) { return p.prefix; }).join(', ') + '.');
  Logger.log(log.join('\n'));
  return log;
}
