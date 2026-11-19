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

/* ======================================================================
   The setup form (Forecast setup > Set up or change settings): SetupForm.html
   calls getSetupState, checkSetup and runSetup through google.script.run.
   ====================================================================== */

const PLANNING_HEADING_WORDS_ = { 1: 'quarter', 2: 'year', 3: 'prefix', 4: 'course', 12: 'mon', 13: 'tue', 14: 'wed', 15: 'thu', 16: 'fri', 17: 'start', 18: 'end' };

function openSetupForm() {
  const html = HtmlService.createHtmlOutputFromFile('SetupForm').setWidth(980).setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, 'Forecast setup');
}

/* Planning sheet ID from a pasted URL or ID; '' if none found. */
function sheetIdFromUrl_(text) {
  const t = String(text || '').trim();
  const m = t.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{30,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{30,}$/.test(t) ? t : '';
}

/* { prefix: catalog page URL } from the UW catalog index's HTML. Takes the last bracketed group in each link,
   because some names have their own brackets ("International Studies (Area Studies) (JSIS A)"). */
function catalogIndex_(html) {
  const map = {};
  const re = /<a href="([a-z]+\.html)">[^<]*\(([^()]+)\)\s*<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    map[m[2].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()] = 'https://www.washington.edu/students/crscat/' + m[1];
  }
  return map;
}

/* Problems with a planning tab's row 1 (columns A to S), checked by key words so wording may vary. */
function planningHeadingProblems_(row) {
  const out = [];
  Object.keys(PLANNING_HEADING_WORDS_).forEach(function(i) {
    const h = String(row[i] || '').toLowerCase();
    if (h.indexOf(PLANNING_HEADING_WORDS_[i]) === -1) out.push(colLetter_(Number(i) + 1) + ' should be the ' + PLANNING_HEADING_WORDS_[i] + ' column (found "' + row[i] + '")');
  });
  return out;
}

function dashboardYears_(ss) {
  const dash = ss.getSheetByName('Dashboard');
  const years = [];
  ['B4', 'B5', 'B8'].forEach(function(a) { const y = String(dash.getRange(a).getDisplayValue()).trim(); if (/^\d{4}-\d{2}$/.test(y) && years.indexOf(y) === -1) years.push(y); });
  return years;
}

/* Who is running the form, and whether they own the spreadsheet (the monthly trigger belongs to whoever runs Set up). */
function ownerStatus_(ss) {
  const me = Session.getActiveUser().getEmail();
  const owner = ss.getOwner() ? ss.getOwner().getEmail() : '';
  return { me: me, owner: owner, isOwner: !!me && !!owner && me.toLowerCase() === owner.toLowerCase() };
}

/* What the form shows when it opens. */
function getSetupState() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  settingsCache_ = null;
  const s = settings_();
  const hasSettings = !!ss.getSheetByName(SETTINGS_TAB);
  // Before the first setup, offer the Dashboard's planning sheet IDs.
  if (!hasSettings) {
    const ids = {};
    ss.getSheetByName('Dashboard').getRange('A1:B40').getDisplayValues().forEach(function(r) {
      const m = String(r[0]).match(/^key for\s+(.+)$/i); if (m && sheetIdFromUrl_(r[1])) ids[m[1].trim().replace(/\s+/g, '')] = sheetIdFromUrl_(r[1]);
    });
    s.prefixes.forEach(function(p) { p.sheetId = ids[p.prefix.replace(/\s+/g, '')] || ''; });
  }
  return { settings: s, hasSettings: hasSettings, years: dashboardYears_(ss), owner: ownerStatus_(ss),
           adminTabs: ss.getSheets().map(function(x) { return x.getName(); }).filter(function(n) { return /^forAdmin/.test(n); }) };
}

/* The form's values as a settings object. form.prefixes rows: { prefix, mode: 'use'|'make', sheet, catalogUrl }. */
function settingsFromForm_(form) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS_));
  const lines = function(t) { return String(t || '').split(/\r?\n/).map(function(x) { return x.trim(); }).filter(String); };
  return {
    department: String(form.department || '').trim(),
    subtitle: String(form.subtitle || '').trim(),
    contactEmail: String(form.contactEmail || '').trim(),
    prefixes: (form.prefixes || []).filter(function(p) { return String(p.prefix || '').trim(); }).map(function(p) {
      return { prefix: String(p.prefix).trim().toUpperCase().replace(/\s+/g, ' '), sheetId: p.mode === 'make' ? '' : sheetIdFromUrl_(p.sheet), catalogUrl: String(p.catalogUrl || '').trim(), mode: p.mode === 'make' ? 'make' : 'use' };
    }),
    options: (form.options || []).filter(function(o) { return String(o.code || '').trim(); }).map(function(o) { return { code: String(o.code).trim(), url: String(o.url || '').trim() }; }),
    genEd: String(form.genEd || base.genEd.join(', ')).split(',').map(function(x) { return x.trim(); }).filter(String),
    phrases: { core: lines(form.core).length ? lines(form.core) : base.phrases.core,
               reqd: lines(form.reqd).length ? lines(form.reqd) : base.phrases.reqd,
               aprvd: lines(form.aprvd).length ? lines(form.aprvd) : base.phrases.aprvd },
    planningTemplateId: sheetIdFromUrl_(form.planningTemplateId) || base.planningTemplateId,
    webAppUrl: String(form.webAppUrl || '').trim()
  };
}

/* Check: writes nothing. Returns { items: [{ level: 'ok'|'warn'|'error', text }], catalog: { prefix: url } }. */
function checkSetup(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = settingsFromForm_(form);
  const years = dashboardYears_(ss);
  const items = [], add = function(level, text) { items.push({ level: level, text: text }); };
  const own = ownerStatus_(ss);
  if (!own.isOwner) add('error', 'Set up must be run by the spreadsheet\'s owner (' + (own.owner || 'unknown') + '); you are signed in as ' + (own.me || 'unknown') + '. The monthly update would otherwise belong to you.');
  if (!s.department) add('warn', 'No department name: the page heading will read just "Curriculum Forecast".');
  if (!s.prefixes.length) add('error', 'Add at least one prefix.');
  if (!years.length) add('error', 'No academic years on the Dashboard (B4, B5, B8).');
  if (s.contactEmail && !/^[^@\s]+@[^@\s]+$/.test(s.contactEmail)) add('warn', 'The contact email does not look like an address: ' + s.contactEmail);
  let index = {};
  try { index = catalogIndex_(UrlFetchApp.fetch('https://www.washington.edu/students/crscat/').getContentText()); }
  catch (e) { add('warn', 'Could not read the UW catalog index (' + e.message + '); type each catalog page by hand.'); }
  const catalog = {};
  const seen = {};
  s.prefixes.forEach(function(p) {
    if (seen[p.prefix]) add('error', p.prefix + ' is listed twice.'); seen[p.prefix] = true;
    const found = p.catalogUrl || index[p.prefix] || '';
    catalog[p.prefix] = found;
    add(found ? 'ok' : 'warn', p.prefix + ': ' + (found ? 'catalog page ' + found : 'not in the Seattle catalog index; type its catalog page, or Gen Ed codes will be missing.'));
    if (p.mode === 'make') {
      try { SpreadsheetApp.openById(s.planningTemplateId); add('ok', p.prefix + ': a planning sheet will be made from the template, with tabs ' + years.join(', ') + '.'); }
      catch (e) { add('error', p.prefix + ': cannot open the planning template (' + s.planningTemplateId + '); paste an existing planning sheet instead.'); }
      return;
    }
    if (!p.sheetId) { add('error', p.prefix + ': paste the planning sheet\'s address, or choose "make one for me".'); return; }
    let f;
    try { f = SpreadsheetApp.openById(p.sheetId); } catch (e) { add('error', p.prefix + ': cannot open the planning sheet; check the address and that you can edit it.'); return; }
    years.forEach(function(y) {
      const t = f.getSheetByName(y);
      if (!t) { add('error', p.prefix + ': "' + f.getName() + '" has no tab named ' + y + '.'); return; }
      const probs = planningHeadingProblems_(t.getRange(1, 1, 1, 19).getDisplayValues()[0]);
      add(probs.length ? 'error' : 'ok', p.prefix + ' ' + y + ': ' + (probs.length ? probs.join('; ') : 'columns A to S are in order.'));
    });
  });
  const pat = prefixCoursePattern_(s.prefixes.length ? s.prefixes : [{ prefix: 'XXXX' }]);
  s.options.forEach(function(o) {
    try {
      const html = UrlFetchApp.fetch(o.url, { muteHttpExceptions: true }).getContentText();
      const n = (html.match(pat) || []).length;
      add(n ? 'ok' : 'warn', 'Option ' + o.code + ': ' + (n ? n + ' course numbers with your prefixes on its page.' : 'no course numbers with your prefixes found on ' + o.url + '.'));
    } catch (e) { add('warn', 'Option ' + o.code + ': could not load ' + o.url + '.'); }
  });
  return { items: items, catalog: catalog };
}

/* Makes a planning sheet from the template with Sheets permission only: one copy of the template's year tab per year,
   plus its other tabs. Returns the new file's ID. */
function makePlanningSheet_(prefix, years, templateId) {
  const tpl = SpreadsheetApp.openById(templateId);
  const out = SpreadsheetApp.create(prefix + ' course planning');
  const blank = out.getSheets()[0];
  const yearTab = tpl.getSheets().filter(function(t) { return /^\d{4}-\d{2}$/.test(t.getName()); })[0];
  years.forEach(function(y) { yearTab.copyTo(out).setName(y); });
  tpl.getSheets().filter(function(t) { return t !== yearTab && !/^\d{4}-\d{2}$/.test(t.getName()); }).forEach(function(t) { t.copyTo(out).setName(t.getName()); });
  out.deleteSheet(blank);
  return out.getId();
}

/* Adds years to a planning sheet's overlap checker dropdown (B1); removes none. */
function addCheckerYears_(file, years) {
  const ck = file.getSheetByName('course time overlap checker');
  if (!ck) return false;
  const rule = ck.getRange('B1').getDataValidation();
  const have = rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST ? rule.getCriteriaValues()[0].map(String) : [];
  const all = have.concat(years.filter(function(y) { return have.indexOf(y) === -1; }));
  ck.getRange('B1').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(all, true).build());
  if (!ck.getRange('B1').getDisplayValue()) ck.getRange('B1').setValue(years[0]);
  return true;
}

/* Set up: writes everything. Returns { log: [...], options: [...], refTabs: [...], dataCheck: '...', created: [...] }. */
function runSetup(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const own = ownerStatus_(ss);
  if (!own.isOwner) throw new Error('Set up must be run by the spreadsheet\'s owner (' + (own.owner || 'unknown') + '). You are signed in as ' + (own.me || 'unknown') + '.');
  // Set up runs the same checks as Check, and refuses if any fails, so skipping Check cannot leave a half-built forecast.
  const errors = checkSetup(form).items.filter(function(i) { return i.level === 'error'; });
  if (errors.length) throw new Error('Set up stopped before changing anything. Fix these first (Check lists them too): ' + errors.map(function(i) { return i.text; }).join(' | '));
  const s = settingsFromForm_(form);
  const years = dashboardYears_(ss);
  const log = [], created = [];
  // Catalog pages the form did not fill in.
  if (s.prefixes.some(function(p) { return !p.catalogUrl; })) {
    try {
      const index = catalogIndex_(UrlFetchApp.fetch('https://www.washington.edu/students/crscat/').getContentText());
      s.prefixes.forEach(function(p) { if (!p.catalogUrl && index[p.prefix]) p.catalogUrl = index[p.prefix]; });
    } catch (e) { log.push('Could not read the UW catalog index; catalog pages left blank.'); }
  }
  // Planning sheets to make.
  s.prefixes.forEach(function(p) {
    if (p.mode !== 'make') return;
    p.sheetId = makePlanningSheet_(p.prefix, years, s.planningTemplateId);
    created.push({ prefix: p.prefix, url: 'https://docs.google.com/spreadsheets/d/' + p.sheetId + '/edit' });
    log.push('Made the planning sheet "' + p.prefix + ' course planning" in your Drive. Share it with your staff (README, Part 1).');
  });
  s.prefixes.forEach(function(p) { delete p.mode; });
  // Settings, then everything built from them.
  writeSettingsTab_(ss, s);
  log.push('Wrote the Settings tab.');
  applySettings(form.removeOld === true).forEach(function(x) { log.push(x); });
  // Entry rules and overlap checker years on each planning sheet.
  s.prefixes.forEach(function(p) {
    const f = SpreadsheetApp.openById(p.sheetId);
    years.forEach(function(y) {
      const t = f.getSheetByName(y);
      if (t) { applyPlanningRules_(t, s.prefixes.map(function(x) { return x.prefix; })); }
      else log.push(p.prefix + ': no tab named ' + y + ', so no entry rules there.');
    });
    if (addCheckerYears_(f, years)) log.push(p.prefix + ': entry rules applied; overlap checker years ' + years.join(', ') + '.');
  });
  // Contact address in the notice, replacing the template's placeholder only.
  const notice = ss.getSheetByName('Current and Next Academic Year').getRange('B1');
  if (s.contactEmail && String(notice.getValue()).indexOf('<your contact address>') !== -1) {
    notice.setValue(String(notice.getValue()).replace('<your contact address>', s.contactEmail));
    log.push('Put ' + s.contactEmail + ' in the notice to students.');
  }
  // The monthly catalog update: exactly one trigger.
  const triggers = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'runFullUpdate'; });
  if (!triggers.length) { ScriptApp.newTrigger('runFullUpdate').timeBased().onMonthDay(1).atHour(0).create(); log.push('Created the monthly catalog update (1st of each month, midnight to 1 am).'); }
  else log.push('The monthly catalog update already exists (' + triggers.length + ').');
  // First catalog update, then the per-option counts.
  runFullUpdate();
  const opt = {};
  const ro = ss.getSheetByName('Ref_Options');
  if (ro && ro.getLastRow() > 1) ro.getRange(2, 1, ro.getLastRow() - 1, 5).getValues().forEach(function(r) {
    const o = opt[r[1]] = opt[r[1]] || { Core: 0, Reqd: 0, Aprvd: 0 };
    if (r[2] === true) o.Core++; else if (r[3] === true) o.Reqd++; else o.Aprvd++;
  });
  const options = s.options.map(function(o) { const c = opt[o.code] || { Core: 0, Reqd: 0, Aprvd: 0 }; return o.code + ': ' + c.Core + ' Core, ' + c.Reqd + ' Reqd, ' + c.Aprvd + ' Aprvd'; });
  // Tabs whose imports still need Allow access.
  SpreadsheetApp.flush();
  Utilities.sleep(5000);
  const refTabs = s.prefixes.map(function(p) { return adminTabName_(p.prefix); }).filter(function(n) {
    const v = ss.getSheetByName(n).getRange('B2').getDisplayValue(); return /^#(REF|N\/A|ERROR)/.test(v);
  });
  runDataCheck();
  const dc = ss.getSheetByName('Data Check').getRange('A2').getDisplayValue();
  ss.setActiveSheet(ss.getSheetByName(SETTINGS_TAB));
  return { log: log, options: options, refTabs: refTabs, dataCheck: dc, created: created };
}

/* Saves the web app address on the Settings tab. */
function saveWebAppUrl(url) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const u = String(url || '').trim();
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) throw new Error('That does not look like a web app address; it should start with https://script.google.com/ and end in /exec.');
  settingsCache_ = null;
  const s = settings_();
  s.webAppUrl = u;
  writeSettingsTab_(ss, s);
  return u;
}
