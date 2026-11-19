/**
 * Data Check: reads each planning sheet's tab for each year on the Dashboard and
 * lists every row that breaks the column rules, with a link to the cell. It writes
 * only to the "Data Check" tab of this spreadsheet and never changes a planning sheet.
 *
 * Run from the forecast spreadsheet: Admin Tools > Run Data Check.
 * "Fix" rows break a rule the scripts or formulas depend on. "Check" rows may be
 * correct (for example, an independent study with no instructor) and need a look.
 */

const QUARTER_KEYS = { AU: 1, WI: 2, SP: 3 };

function runDataCheck() {
  requireDirectRun_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = planningSources_(ss);
  const catalog = catalogCourses_(ss);
  const prefixes = planningPrefixes_();
  const all = [], notes = [];
  if (!src.sheets.length) notes.push('No planning sheets found: add them with Forecast setup > Set up or change settings.');
  if (!src.years.length) notes.push('No academic years found in Dashboard B4, B5 or B8.');
  src.sheets.forEach(function(s) {
    let file;
    try { file = SpreadsheetApp.openById(s.id); } catch (e) { notes.push(s.label + ': cannot open the planning sheet.'); return; }
    src.years.forEach(function(year) {
      const tab = file.getSheetByName(year);
      if (!tab) { notes.push(s.label + ': no tab named ' + year + '.'); return; }
      const last = tab.getLastRow();
      if (last < 2) return;
      if (last > 200) notes.push(s.label + ' ' + year + ': ' + (last - 1) + ' rows. All are checked here, but the forecast reads only rows 1 to 200, so later rows are not on the web page.');
      const rows = tab.getRange(2, 1, last - 1, 19).getValues().map(function(v, i) {
        return { values: v, rowNum: i + 2, sheet: s.label, tab: year, url: file.getUrl().replace(/\/edit.*$/, '') + '/edit#gid=' + tab.getSheetId() + '&range=A' + (i + 2) };
      });
      all.push({ y0: Number(year.slice(0, 4)), rows: rows });
    });
  });
  let problems = [];
  all.forEach(function(t) { problems = problems.concat(checkPlanningRows_(t.rows, { y0: t.y0, prefixes: prefixes, catalog: catalog })); });
  problems = problems.concat(checkPartners_(all, prefixes));
  writeDataCheck_(ss, problems, notes);
}

/* Course IDs ("ANTH 203") from Ref_GenEd, which the monthly update fills from the UW catalog; null if empty. */
function catalogCourses_(ss) {
  const sh = ss.getSheetByName('Ref_GenEd');
  if (!sh || sh.getLastRow() < 2) return null;
  const set = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function(r) { if (r[0]) set[String(r[0]).trim()] = true; });
  return set;
}

/* Month/day of a date, for showing an enrollment split that Sheets turned into a date. */
function monthDay_(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }

/* Minutes after midnight for a time cell, read the way the conflict report reads it; null if not a time. */
function cellMinutes_(v) {
  if (v && typeof v.getHours === 'function') return v.getHours() * 60 + v.getMinutes();
  return null;
}

function courseLabel_(v) {
  const num = String(v[4] === null || v[4] === undefined ? '' : v[4]).replace(/\.0$/, '');
  return [String(v[1] || '').trim(), String(v[3] || '').trim(), num, String(v[5] || '').trim()].filter(String).join(' ');
}

/**
 * Checks rows of one year tab. Each row is { values: [A..S], rowNum, sheet, tab, url }.
 * ctx: { y0 (first calendar year of the tab), prefixes (array or null), catalog (set or null) }.
 * Returns [{ level: 'Fix'|'Check', type, sheet, tab, rowNum, course, value, url }].
 */
function checkPlanningRows_(rows, ctx) {
  const out = [];
  const seen = {};
  rows.forEach(function(r) {
    const v = r.values;
    const txt = function(i) { return v[i] === null || v[i] === undefined ? '' : String(v[i]); };
    const blank = function(i) { return txt(i).trim() === ''; };
    if (blank(3) && blank(4) && blank(7)) return;          // no prefix, number or title: not a course row
    const add = function(level, type, value) {
      out.push({ level: level, type: type, sheet: r.sheet || '', tab: r.tab || '', rowNum: r.rowNum, course: courseLabel_(v), value: value === undefined ? '' : String(value), url: r.url || '' });
    };
    const q = txt(1).trim();
    if (!(q in QUARTER_KEYS)) add('Fix', 'Quarter is not AU, WI or SP', txt(1));
    else {
      const want = q === 'AU' ? ctx.y0 : ctx.y0 + 1;
      if (Number(txt(2)) !== want) add('Fix', 'Year does not match the quarter', txt(2) + ' (expected ' + want + ')');
    }
    const pre = txt(3);
    if (pre !== pre.trim() || /\s{2,}/.test(pre)) add('Fix', 'Prefix has extra spaces', JSON.stringify(pre));
    else if (ctx.prefixes && pre && ctx.prefixes.indexOf(pre) === -1) add('Fix', 'Prefix is not one of ' + ctx.prefixes.join(', '), pre);
    const num = txt(4).trim().replace(/\.0$/, '');
    if (num && !/^\d{3}$/.test(num)) add('Fix', 'Course number is not three digits', num);
    if (blank(7)) add('Check', 'No title', '');
    if (blank(8)) add('Check', 'No instructor (fine for an independent study; otherwise type TBA)', '');
    const cr = txt(6).trim();
    if (cr && !/^(\d+(\.\d)?(-\d+)?|CR\/NC)$/.test(cr)) add('Check', 'Credits are not a number, a range or CR/NC', cr);
    const jt = txt(9).trim();
    if (jt && !/[A-Za-z]{2,} ?[A-Za-z]? ?\d{3}/.test(jt)) add('Check', 'Joint/withered does not name a course with its prefix', jt);
    if (!blank(10) && !(typeof v[10] === 'number' && v[10] >= 0 && v[10] === Math.floor(v[10]))) add('Fix', '# TAs is not a whole number', txt(10));
    if (!blank(11) && !(typeof v[11] === 'number' && v[11] >= 0 && v[11] <= 2000 && v[11] === Math.floor(v[11]))) {
      if (v[11] && typeof v[11].getFullYear === 'function') add('Check', 'Enrollment became a date (format the cell as plain text and retype the split)', monthDay_(v[11]));
      else if (!/^\s*\d+\s*(\/\s*\d+\s*)?$/.test(txt(11))) add('Check', 'Enrollment is not a whole number or a split such as 30/15', txt(11));
    }
    const days = [12, 13, 14, 15, 16].map(txt);
    const badDay = days.filter(function(d) { return d !== '' && ['X', 'Q'].indexOf(d.trim().toUpperCase()) === -1; });
    if (badDay.length) add('Fix', 'Day cell is not X or Q', JSON.stringify(badDay[0]));
    const meets = days.some(function(d) { return d.trim().toUpperCase() === 'X'; });
    const anyDay = days.some(function(d) { return d.trim() !== ''; });
    const s = cellMinutes_(v[17]), e = cellMinutes_(v[18]);
    if (!blank(17) && s === null) add('Fix', 'Start time is text, not a time', txt(17));
    if (!blank(18) && e === null) add('Fix', 'End time is text, not a time', txt(18));
    const hhmm = function(m) { return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); };
    if (s !== null && (s < 7 * 60 || s > 22 * 60)) add('Fix', 'Start time is outside 7:00 to 22:00 (AM/PM?)', hhmm(s));
    if (e !== null && (e < 7 * 60 || e > 22 * 60)) add('Fix', 'End time is outside 7:00 to 22:00 (AM/PM?)', hhmm(e));
    if (s !== null && e !== null && e <= s) add('Fix', 'End time is not after the start time', hhmm(s) + ' to ' + hhmm(e));
    if ((s !== null || !blank(17) || !blank(18)) && !anyDay) add('Fix', 'Times but no days marked', '');
    if (meets && blank(17)) add('Fix', 'Days marked but no start time', '');
    if (num && q) {
      const key = q + '|' + pre.trim() + '|' + num + '|' + txt(5).trim();
      if (seen[key]) add('Fix', 'Same quarter, course and section as another row', 'row ' + seen[key]);
      else seen[key] = r.rowNum;
      if (ctx.catalog && pre.trim() && !ctx.catalog[pre.trim() + ' ' + num]) add('Check', 'Not in the UW catalog (new number or typo?)', pre.trim() + ' ' + num);
    }
  });
  return out;
}

/**
 * Joint and withered partners: when column J names a course with one of our
 * prefixes, that course should be planned in the same quarter of the same year,
 * at the same start time. Returns 'Check' rows.
 */
function checkPartners_(tabs, prefixes) {
  const out = [];
  if (!prefixes || !prefixes.length) return out;
  const pat = new RegExp('\\b(' + prefixes.map(function(p) { return p.replace(/ /g, '\\s*'); }).join('|') + ')\\s*(\\d{3})', 'gi');
  const compact = prefixMap_(prefixes);
  // One index per academic year, across every planning sheet, so a partner in another prefix's sheet is found.
  const byYear = {};
  tabs.forEach(function(t) {
    const index = byYear[t.y0] = byYear[t.y0] || {};
    t.rows.forEach(function(r) {
      const v = r.values, num = String(v[4] === null ? '' : v[4]).replace(/\.0$/, '').trim();
      const k = String(v[1]).trim() + '|' + String(v[3]).trim() + ' ' + num;
      if (num) (index[k] = index[k] || []).push(r);
    });
  });
  tabs.forEach(function(t) {
    const index = byYear[t.y0];
    t.rows.forEach(function(r) {
      const v = r.values, q = String(v[1] || '').trim(), self = String(v[3] || '').trim() + ' ' + String(v[4] === null ? '' : v[4]).replace(/\.0$/, '').trim();
      const jt = String(v[9] || ''); let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(jt)) !== null) {
        const partner = compact[m[1].replace(/\s+/g, '').toUpperCase()] + ' ' + m[2];
        if (partner === self) continue;
        const hits = index[q + '|' + partner];
        const base = { sheet: r.sheet || '', tab: r.tab || '', rowNum: r.rowNum, course: courseLabel_(v), url: r.url || '' };
        if (!hits) out.push(Object.assign({ level: 'Check', type: 'Linked course not planned in this quarter', value: partner }, base));
        else {
          const s = cellMinutes_(v[17]), ps = cellMinutes_(hits[0].values[17]);
          if (s !== null && ps !== null && s !== ps) out.push(Object.assign({ level: 'Check', type: 'Linked course starts at a different time', value: partner }, base));
        }
      }
    });
  });
  return out;
}

function writeDataCheck_(ss, problems, notes) {
  const sh = ss.getSheetByName('Data Check') || ss.insertSheet('Data Check');
  sh.clear();
  problems.sort(function(a, b) {
    return (a.level === b.level ? 0 : a.level === 'Fix' ? -1 : 1) || a.type.localeCompare(b.type) || a.sheet.localeCompare(b.sheet) || a.tab.localeCompare(b.tab) || a.rowNum - b.rowNum;
  });
  const counts = {};
  problems.forEach(function(p) { const k = p.level + ': ' + p.type; counts[k] = (counts[k] || 0) + 1; });
  const fix = problems.filter(function(p) { return p.level === 'Fix'; }).length;
  // Summary: counts in column A and text in column B, so the text runs over the empty cells to its right.
  const top = [['Data Check, ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), ''],
               [fix + ' to fix, ' + (problems.length - fix) + ' to check. Fix rows break a rule the forecast depends on; Check rows may be correct.', '']];
  Object.keys(counts).forEach(function(k) { top.push([counts[k], k]); });
  notes.forEach(function(n) { top.push(['', n]); });
  top.push(['', '']);
  sh.getRange(1, 1, top.length, 2).setValues(top);
  sh.getRange(1, 1).setFontWeight('bold');
  sh.getRange(1, 1, top.length, 2).setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW);
  sh.getRange(3, 1, Math.max(1, top.length - 2), 1).setHorizontalAlignment('right');
  const head = ['Level', 'Problem', 'Planning sheet', 'Tab', 'Row', 'Course', 'Value', 'Open'];
  const start = top.length + 1;
  const body = problems.map(function(p) {
    return [p.level, p.type, p.sheet, p.tab, p.rowNum, p.course, p.value, p.url ? '=HYPERLINK("' + p.url + '","Open")' : ''];
  });
  sh.getRange(start, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  if (body.length) sh.getRange(start + 1, 1, body.length, head.length).setValues(body);
  sh.autoResizeColumns(2, head.length - 1);
  sh.setColumnWidth(1, 60);
  ss.setActiveSheet(sh);
}
