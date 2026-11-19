/**
 * Settings: every department-specific value, read from the "Settings" tab.
 *
 * The tab is laid out in blocks. A cell in column A such as [Prefixes] starts a block;
 * the rows below it, up to the next block, belong to it. Table blocks ([Prefixes],
 * [Major options]) have a row of column headings first. See writeSettingsTab_ for the layout.
 *
 * Without a Settings tab, settings_() returns the Anthropology values below, so a
 * spreadsheet set up before the Settings tab existed keeps working unchanged. Those
 * values have no planning sheet IDs: without a Settings tab the planning sheets still
 * come from the Dashboard's "key for" cells (see planningSources_).
 */

const SETTINGS_TAB = 'Settings';

const DEFAULT_SETTINGS_ = {
  department: 'Anthropology',
  subtitle: 'Future listings are tentative and subject to change at any time.',
  contactEmail: '',
  prefixes: [
    { prefix: 'ANTH', sheetId: '', catalogUrl: 'https://www.washington.edu/students/crscat/anthro.html' },
    { prefix: 'ARCHY', sheetId: '', catalogUrl: 'https://www.washington.edu/students/crscat/archeo.html' },
    { prefix: 'BIO A', sheetId: '', catalogUrl: 'https://www.washington.edu/students/crscat/bioanth.html' }
  ],
  options: [
    { code: 'MAGH', url: 'https://anthropology.washington.edu/medical-anthropology-global-health-ba' },
    { code: 'GLOB', url: 'https://anthropology.washington.edu/anthropology-globalization-ba' },
    { code: 'ASCI', url: 'https://anthropology.washington.edu/archaeological-sciences-ba' },
    { code: 'HEB', url: 'https://anthropology.washington.edu/human-evolutionary-biology-ba' },
    { code: 'INDG', url: 'https://anthropology.washington.edu/indigenous-archaeology-ba' }
  ],
  genEd: ['NSc', 'SSc', 'A&H', 'DIV'],
  phrases: {
    core: ['Core Coursework', 'Core Requirements', 'Required Coursework', 'Required Core', 'ASc core list'],
    reqd: ['Specific Courses Required', 'Choose one', 'Select from', 'one of the following', 'Choose from',
           'Students are required to take two of the courses'],
    aprvd: ['Approved Electives', 'Elective Courses', 'approved elective list', 'department-approved list',
            '15 credits from the department approved elective list', '15 credits from the following',
            'credits from approved IA core list', 'credits from the department approved list']
  },
  planningTemplateId: '1Fx3asQB6QjXnjsz0nxGQvF_23SsN_EM66icjySsCxDA',
  webAppUrl: ''
};

let settingsCache_ = null;

/* The settings for this spreadsheet, read once per run. */
function settings_() {
  if (settingsCache_) return settingsCache_;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_TAB);
  settingsCache_ = sh ? parseSettingsRows_(sh.getDataRange().getDisplayValues()) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS_));
  return settingsCache_;
}

/* Reads the Settings tab's rows (display values) into a settings object. Missing values fall back to the defaults. */
function parseSettingsRows_(rows) {
  const d = JSON.parse(JSON.stringify(DEFAULT_SETTINGS_));
  const out = { department: '', subtitle: '', contactEmail: '', prefixes: [], options: [], genEd: d.genEd, phrases: d.phrases,
                planningTemplateId: d.planningTemplateId, webAppUrl: '' };
  let section = '', headingSkipped = false;
  const lines = function(t) { return String(t || '').split(/\r?\n/).map(function(x) { return x.trim(); }).filter(String); };
  rows.forEach(function(r) {
    const a = String(r[0] || '').trim(), b = String(r[1] || '').trim(), c = String(r[2] || '').trim();
    const m = a.match(/^\[(.+)\]$/);
    if (m) { section = m[1].trim().toLowerCase(); headingSkipped = false; return; }
    if (!a) return;
    if (section === 'prefixes' || section === 'major options') {
      if (!headingSkipped) { headingSkipped = true; return; }
      if (section === 'prefixes') out.prefixes.push({ prefix: a.replace(/\s+/g, ' '), sheetId: b, catalogUrl: c });
      else out.options.push({ code: a, url: b });
      return;
    }
    const key = a.toLowerCase();
    if (section === 'department') {
      if (key === 'department name') out.department = b;
      else if (key === 'page subtitle') out.subtitle = b;
      else if (key === 'contact email') out.contactEmail = b;
    } else if (section === 'gen ed codes' && key === 'codes') {
      out.genEd = b.split(',').map(function(x) { return x.trim(); }).filter(String);
    } else if (section === 'option-page phrases') {
      const list = lines(r[1]);
      if (key === 'core' && list.length) out.phrases.core = list;
      else if (key === 'required' && list.length) out.phrases.reqd = list;
      else if (key === 'approved' && list.length) out.phrases.aprvd = list;
    } else if (section === 'planning template' && key === 'file id' && b) {
      out.planningTemplateId = b;
    } else if (section === 'web app' && key === 'address') {
      out.webAppUrl = b;
    }
  });
  return out;
}

/* The rows of a Settings tab for a settings object (the inverse of parseSettingsRows_). */
function settingsRows_(s) {
  const rows = [
    ['Settings', 'Every department-specific value. The scripts read this tab; edit it here.', ''],
    ['', '', ''],
    ['[Department]', '', ''],
    ['Department name', s.department, ''],
    ['Page subtitle', s.subtitle, ''],
    ['Contact email', s.contactEmail, ''],
    ['', '', ''],
    ['[Prefixes]', '', ''],
    ['Prefix', 'Planning sheet ID', 'Catalog page']
  ];
  s.prefixes.forEach(function(p) { rows.push([p.prefix, p.sheetId || '', p.catalogUrl || '']); });
  rows.push(['', '', ''], ['[Major options]', '', ''], ['Code', 'Page', '']);
  s.options.forEach(function(o) { rows.push([o.code, o.url, '']); });
  rows.push(['', '', ''], ['[Gen Ed codes]', '', ''], ['Codes', s.genEd.join(', '), '']);
  rows.push(['', '', ''], ['[Option-page phrases]', '', ''],
            ['Core', s.phrases.core.join('\n'), ''], ['Required', s.phrases.reqd.join('\n'), ''], ['Approved', s.phrases.aprvd.join('\n'), '']);
  rows.push(['', '', ''], ['[Planning template]', '', ''], ['File ID', s.planningTemplateId, '']);
  rows.push(['', '', ''], ['[Web app]', '', ''], ['Address', s.webAppUrl, '']);
  return rows;
}

/* Creates or replaces the Settings tab with the given settings (used by setup and by the live cutover). */
function writeSettingsTab_(ss, s) {
  const sh = ss.getSheetByName(SETTINGS_TAB) || ss.insertSheet(SETTINGS_TAB, 0);
  sh.clear();
  const rows = settingsRows_(s);
  sh.getRange(1, 1, rows.length, 3).setNumberFormat('@').setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold');
  rows.forEach(function(r, i) { if (/^\[.+\]$/.test(r[0])) sh.getRange(i + 1, 1).setFontWeight('bold'); });
  sh.setColumnWidth(1, 170); sh.setColumnWidth(2, 420); sh.setColumnWidth(3, 380);
  sh.getRange(1, 1, rows.length, 3).setVerticalAlignment('top').setWrap(true);
  settingsCache_ = null;
  return sh;
}

/* Prefix helpers: the prefix as written, keyed by the prefix with spaces removed (BIOA -> BIO A). */
function prefixMap_(prefixes) {
  const m = {};
  prefixes.forEach(function(p) { m[String(p.prefix || p).replace(/\s+/g, '').toUpperCase()] = String(p.prefix || p); });
  return m;
}
function canonicalPrefix_(raw, prefixes) {
  const t = String(raw || '').trim();
  return prefixMap_(prefixes)[t.replace(/\s+/g, '').toUpperCase()] || t;
}
/* forAdmin tab name for a prefix: forAdmin plus the prefix without spaces. */
function adminTabName_(prefix) { return 'forAdmin' + String(prefix).replace(/\s+/g, ''); }
/* A pattern matching any configured prefix followed by a course number, allowing optional spaces inside a prefix. */
function prefixCoursePattern_(prefixes) {
  const alts = prefixes.map(function(p) {
    return String(p.prefix || p).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s?');
  });
  return new RegExp('(' + alts.join('|') + ')\\s*(\\d{3})', 'gi');
}
/* A case-insensitive pattern matching any of the phrases. */
function phrasePattern_(list) {
  return new RegExp(list.map(function(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'i');
}

/* For the web pages: the values they show. No sheet IDs. */
function getPageSettings() {
  const s = settings_();
  const catalogLinks = {}, optionLinks = {};
  s.prefixes.forEach(function(p) { if (p.catalogUrl) catalogLinks[p.prefix] = p.catalogUrl; });
  s.options.forEach(function(o) { optionLinks[o.code] = o.url; });
  return { department: s.department, subtitle: s.subtitle, prefixes: s.prefixes.map(function(p) { return p.prefix; }),
           catalogLinks: catalogLinks, optionLinks: optionLinks, genEd: s.genEd };
}
