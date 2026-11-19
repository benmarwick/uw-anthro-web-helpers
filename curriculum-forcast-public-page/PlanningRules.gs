/**
 * Entry rules for the planning sheets (columns A to S of each year tab):
 * dropdowns and checks that refuse or flag a bad entry, a sort key that fills
 * itself from the quarter, and highlights for missing or inconsistent values.
 *
 * Run from the forecast spreadsheet: Admin Tools > Apply entry rules to planning sheets.
 * It reads the planning sheet IDs and the years from the Dashboard, and applies
 * the rules to each planning sheet's tab for each of those years. It is safe to
 * re-run: it replaces its own rules and leaves every other rule alone. Re-run it
 * after adding a year tab, because the year check depends on the tab's name.
 */

// The prefixes a planning sheet may use in column D: the prefixes on the Settings tab,
// or null when none are listed yet (then column D accepts any prefix in capitals without stray spaces).
function planningPrefixes_() {
  const list = settings_().prefixes.map(function(p) { return p.prefix; });
  return list.length ? list : null;
}

// Marks the highlight rules this file creates, so a re-run can find and replace them.
const RULE_MARK = 'N("planning-rule")=0';
const SORT_KEY_NOTE = 'Sort key: fills itself from Quarter (column B)';

function applyPlanningRulesFromMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = planningSources_(ss);
  const out = [];
  src.sheets.forEach(function(s) {
    let file;
    try { file = SpreadsheetApp.openById(s.id); } catch (e) { out.push(s.label + ': cannot open the planning sheet (' + e.message + ')'); return; }
    src.years.forEach(function(year) {
      const tab = file.getSheetByName(year);
      if (!tab) { out.push(s.label + ' ' + year + ': no tab with that name, skipped'); return; }
      const r = applyPlanningRules_(tab, planningPrefixes_());
      out.push(s.label + ' ' + year + ': rules applied (' + r.invalidNow + ' cells currently break a rule; Admin Tools > Run Data Check lists them)');
    });
  });
  SpreadsheetApp.getUi().alert('Entry rules', out.join('\n') || 'No planning sheets found on the Dashboard.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * The planning sheets and the years to work on: the prefixes on the Settings tab that
 * have a planning sheet ID, or, if none has one, each "key for X" label on the Dashboard
 * with a sheet ID beside it; and the academic years typed in Dashboard B4, B5 and B8.
 */
function planningSources_(ss) {
  const dash = ss.getSheetByName('Dashboard');
  const sheets = [];
  const isId = function(x) { return /^[A-Za-z0-9_-]{30,}$/.test(String(x || '').trim()); };
  settings_().prefixes.forEach(function(p) { if (isId(p.sheetId)) sheets.push({ label: p.prefix, id: String(p.sheetId).trim() }); });
  if (!sheets.length) {
    dash.getRange('A1:B40').getDisplayValues().forEach(function(r) {
      const m = String(r[0]).match(/^key for\s+(.+)$/i);
      if (m && isId(r[1])) sheets.push({ label: m[1].trim(), id: String(r[1]).trim() });
    });
  }
  const years = [];
  ['B4', 'B5', 'B8'].forEach(function(a) {
    const y = String(dash.getRange(a).getDisplayValue()).trim();
    if (/^\d{4}-\d{2}$/.test(y) && years.indexOf(y) === -1) years.push(y);
  });
  return { sheets: sheets, years: years };
}

/**
 * Applies the rules to one year tab. prefixes: the allowed column D values, or
 * null to accept any prefix written in capitals without stray spaces (template use).
 * Returns { invalidNow, daysUppercased } so the caller can report what it found and changed.
 */
function applyPlanningRules_(sheet, prefixes) {
  const y0 = Number(String(sheet.getName()).slice(0, 4));
  if (!(y0 > 2000)) throw new Error('Tab "' + sheet.getName() + '" is not named like 2027-28.');
  const last = sheet.getMaxRows();
  const rng = function(col) { return sheet.getRange(col + '2:' + col + last); };
  const V = function() { return SpreadsheetApp.newDataValidation(); };

  // A: sort key. One formula in A1 fills the column, so inserting a row above the
  // first course does not break it. Column A must be empty below A1 for it to fill.
  sheet.getRange('A2:A' + last).clearContent();
  sheet.getRange('A1').setFormula('=ARRAYFORMULA(IF(ROW(B:B)=1,"",IF(TRIM(B:B)="",,IFERROR(MATCH(TRIM(B:B),{"AU","WI","SP"},0),))))');
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function(p) { if (p.getDescription() === SORT_KEY_NOTE) p.remove(); });
  sheet.getRange('A1:A' + last).protect().setDescription(SORT_KEY_NOTE).setWarningOnly(true);

  // B: quarter.
  rng('B').setDataValidation(V().requireValueInList(['AU', 'WI', 'SP'], true).setAllowInvalid(false)
    .setHelpText('Choose AU, WI or SP. Summer is not supported.').build());

  // C: year, which must match the quarter and the tab (AU is the first year, WI and SP the second).
  rng('C').setDataValidation(V().requireFormulaSatisfied(
      '=OR(C2="",IFERROR(AND(TRIM(B2)="AU",VALUE(C2)=' + y0 + '),FALSE),IFERROR(AND(OR(TRIM(B2)="WI",TRIM(B2)="SP"),VALUE(C2)=' + (y0 + 1) + '),FALSE))')
    .setAllowInvalid(false).setHelpText('Year of this quarter: ' + y0 + ' for AU, ' + (y0 + 1) + ' for WI and SP. Choose the quarter first.').build());

  // D: prefix.
  const prefixRule = prefixes
    ? V().requireValueInList(prefixes, true).setHelpText('Choose one of: ' + prefixes.join(', ') + '.')
    : V().requireFormulaSatisfied('=AND(D2=TRIM(D2),REGEXMATCH(D2,"^[A-Z]+( [A-Z]+)?$"))')
         .setHelpText('The prefix exactly as the UW catalog writes it, for example BIO A, with no extra spaces.');
  rng('D').setDataValidation(prefixRule.setAllowInvalid(false).build());

  // E: course number.
  rng('E').setDataValidation(V().requireFormulaSatisfied('=OR(E2="",REGEXMATCH(TO_TEXT(E2),"^\\d{3}$"))')
    .setAllowInvalid(false).setHelpText('Three digits, for example 203. Leave blank until the number is known; do not type 2xx.').build());

  // G: credits (warning only, because ranges and CR/NC are allowed).
  rng('G').setDataValidation(V().requireFormulaSatisfied('=OR(G2="",REGEXMATCH(TO_TEXT(G2),"^(\\d+(\\.\\d)?(-\\d+)?|CR/NC)$"))')
    .setAllowInvalid(true).setHelpText('A number such as 5, a range such as 1-9, or CR/NC.').build());

  // J: joint or withered course (warning only).
  rng('J').setDataValidation(V().requireFormulaSatisfied('=OR(J2="",REGEXMATCH(TO_TEXT(J2),"[A-Za-z]{2,} ?[A-Za-z]? ?\\d{3}"))')
    .setAllowInvalid(true).setHelpText('Name the linked course with its prefix, for example LING 203, not just 203.').build());

  // K: number of TAs.
  rng('K').setDataValidation(V().requireFormulaSatisfied('=OR(K2="",IF(ISNUMBER(K2),AND(K2>=0,K2=INT(K2)),FALSE))')
    .setAllowInvalid(false).setHelpText('A whole number, for example 2. Put readers in a separate column, not here.').build());

  // L: enrollment limit (warning only).
  // A whole number (stored as a number or as text, which looks the same) or a split such as 30/15.
  // The 2000 cap catches an N/N that Sheets turned into a date (10/10 becomes 10 October, stored as about 46000).
  rng('L').setDataValidation(V().requireFormulaSatisfied('=OR(L2="",IF(ISNUMBER(L2),AND(L2>=0,L2<=2000,L2=INT(L2)),REGEXMATCH(TRIM(TO_TEXT(L2)),"^\\d+$|^\\d+ ?/ ?\\d+$")))')
    .setAllowInvalid(true).setHelpText('A whole number such as 40, or a split such as 30/15. If Sheets turns 10/10 into a date, format the cell as plain text and retype it.').build());

  // M to Q: meeting days.
  // Google's list check is case-sensitive, so lowercase x and q are changed to X and Q first
  // (the scripts treat both cases the same), then the dropdown offers X and Q only.
  const days = sheet.getRange('M2:Q' + last);
  const dayVals = days.getValues(), dayForms = days.getFormulas();
  let changed = 0;
  const up = dayVals.map(function(row, i) {
    return row.map(function(v, j) {
      const t = String(v).trim();
      if (!dayForms[i][j] && (t === 'x' || t === 'q')) { changed++; return t.toUpperCase(); }
      return v;
    });
  });
  if (changed) {
    const anyFormula = dayForms.some(function(r) { return r.some(function(f) { return f; }); });
    if (!anyFormula) days.setValues(up);
    else up.forEach(function(row, i) { row.forEach(function(v, j) { if (v !== dayVals[i][j]) days.getCell(i + 1, j + 1).setValue(v); }); });
  }
  days.setDataValidation(V().requireValueInList(['X', 'Q'], true).setAllowInvalid(false)
    .setHelpText('X on each day the class meets; Q for a quiz-section day. Leave other days blank.').build());

  // R and S: start and end times.
  rng('R').setDataValidation(V().requireFormulaSatisfied('=OR(R2="",IF(ISNUMBER(R2),AND(MOD(R2,1)>=TIME(7,0,0),MOD(R2,1)<=TIME(22,0,0)),FALSE))')
    .setAllowInvalid(false).setHelpText('A time between 7:00 AM and 10:00 PM, for example 10:30 AM. Leave blank if not yet known (do not type TBD).').build());
  rng('S').setDataValidation(V().requireFormulaSatisfied('=OR(S2="",IF(ISNUMBER(S2),AND(MOD(S2,1)>=TIME(7,0,0),MOD(S2,1)<=TIME(22,0,0),IF(ISNUMBER(R2),MOD(S2,1)>MOD(R2,1),TRUE)),FALSE))')
    .setAllowInvalid(false).setHelpText('A time after the start time, for example 12:20 PM. Check AM and PM.').build());

  // Header notes: what each checked column accepts, so a red corner or an "Invalid" message is
  // easy to resolve. Added below any existing note; a re-run replaces only this part.
  const NOTE_MARK = 'What this column accepts:';
  const guide = {
    B: 'AU, WI or SP (choose from the dropdown). Summer is not supported.',
    C: 'The calendar year of the quarter: ' + y0 + ' for AU, ' + (y0 + 1) + ' for WI and SP. Choose the quarter first.',
    D: prefixes ? 'One of ' + prefixes.join(', ') + ' (choose from the dropdown).' : 'The prefix exactly as the UW catalog writes it, for example BIO A, with no extra spaces.',
    E: 'Three digits, for example 203. Leave blank until the number is known (not 2xx).',
    G: 'A number such as 5, a range such as 1-9, or CR/NC. Anything else is allowed but flagged.',
    J: 'The linked course with its prefix, for example LING 203 (not just 203). Anything else is allowed but flagged.',
    K: 'A whole number, for example 2. Readers go in a separate column, not here.',
    L: 'A whole number such as 40, or a split such as 30/15. If Sheets turns a split into a date (10/10 becomes 10 Oct), choose Format > Number > Plain text and retype it. Anything else is allowed but flagged.',
    R: 'A time between 7:00 AM and 10:00 PM, typed like 10:30 AM. Leave blank if not known yet (not TBD).',
    S: 'A time after the start time, typed like 12:20 PM. Check AM and PM.'
  };
  ['M', 'N', 'O', 'P', 'Q'].forEach(function(c) { guide[c] = 'X if the class meets this day, Q for a quiz-section day, otherwise blank (choose from the dropdown).'; });
  Object.keys(guide).forEach(function(col) {
    const cell = sheet.getRange(col + '1');
    const old = String(cell.getNote() || '');
    const cut = old.indexOf(NOTE_MARK);
    const keep = (cut === -1 ? old : old.slice(0, cut)).replace(/\s+$/, '');
    cell.setNote((keep ? keep + '\n\n' : '') + NOTE_MARK + ' ' + guide[col] + ' A cell with a red corner breaks this rule; Admin Tools > Run Data Check in the forecast lists them all.');
  });

  // Highlights: replace this file's rules, keep everyone else's. In these formulas and the checks above,
  // number tests sit inside IF(ISNUMBER(...)): Sheets evaluates every argument of AND and OR, and one
  // error (such as INT of "20/20") makes the whole rule fail even when another part is true.
  const red = '#f4c7c3', yellow = '#fce8b2', orange = '#f9cb9c';
  const cf = function(range, formula, color) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(' + formula + ',' + RULE_MARK + ')')
      .setBackground(color).setRanges([sheet.getRange(range)]).build();
  };
  const mine = [
    cf('H2:H' + last, '$E2<>"",$H2=""', red),
    cf('I2:I' + last, '$E2<>"",$I2=""', yellow),
    cf('M2:Q' + last, 'COUNTIF($M2:$Q2,"?*")=0,OR($R2<>"",$S2<>"")', red),
    cf('R2:R' + last, 'COUNTIF($M2:$Q2,"x")>0,$R2=""', red),
    cf('R2:S' + last, 'R2<>"",IF(ISNUMBER(R2),OR(MOD(R2,1)<TIME(7,0,0),MOD(R2,1)>TIME(22,0,0)),TRUE)', red),
    cf('S2:S' + last, 'IF(AND(ISNUMBER($R2),ISNUMBER($S2)),MOD($S2,1)<=MOD($R2,1),FALSE)', red),
    cf('K2:K' + last, 'K2<>"",NOT(ISNUMBER(K2))', red),
    cf('E2:F' + last, '$E2<>"",COUNTIFS($B$2:$B,$B2,$D$2:$D,$D2,$E$2:$E,$E2,$F$2:$F,$F2)>1', orange)
  ];
  const others = sheet.getConditionalFormatRules().filter(function(r) {
    const c = r.getBooleanCondition();
    const vals = c ? c.getCriteriaValues() : [];
    return !(vals.length && String(vals[0]).indexOf(RULE_MARK) !== -1);
  });
  sheet.setConditionalFormatRules(others.concat(mine));
  SpreadsheetApp.flush();

  return { invalidNow: countInvalid_(sheet, y0, prefixes), daysUppercased: changed };
}

/* Cells in B to S that break a rule above, counted so the menu can say how much existing data needs fixing. */
function countInvalid_(sheet, y0, prefixes) {
  const last = Math.max(2, sheet.getLastRow());
  const rows = sheet.getRange(2, 1, last - 1, 19).getValues();
  const probs = checkPlanningRows_(rows.map(function(v, i) { return { values: v, rowNum: i + 2 }; }),
    { y0: y0, prefixes: prefixes, catalog: null });
  return probs.filter(function(p) { return p.level === 'Fix'; }).length;
}
