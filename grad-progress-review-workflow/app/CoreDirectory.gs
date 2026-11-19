/* ============================================================
   CoreDirectory.gs: suggests instructor emails from the department's public people page
   (C_().DEPARTMENT_DIRECTORY_URL). Pure functions, no Apps Script services, so they are tested in Node.
   The suggestions only fill the Roster page's email boxes: nothing is saved until the administrator
   clicks Save for each instructor.
   ============================================================ */

/* Lower case, accents removed, single spaces: "Ángela  Castillo" -> "angela castillo". */
function directoryNormalize_(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9,' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Removes HTML tags and decodes the few entities a name or title uses. */
function directoryText_(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* "Last, First Middle" -> { last: 'last', first: 'first' } (normalized). Null when there is no comma. */
function directorySplitName_(name) {
  const text = directoryNormalize_(name);
  const comma = text.indexOf(',');
  if (comma === -1) return null;
  const last = text.slice(0, comma).trim();
  const first = text.slice(comma + 1).trim().split(' ')[0] || '';
  if (!last || !first) return null;
  return { last: last, first: first };
}

/* The people on the department page: one table row each, with a "Last, First" name cell (class
   views-field-field-last-name), a job title cell and a mailto: link. Returns
   [{ name, title, email }] with email '' when the row shows none. */
function parseDepartmentDirectory_(html) {
  const people = [];
  const rows = String(html || '').split(/<tr[\s>]/i).slice(1);
  rows.forEach(function(row) {
    const nameCell = row.match(/views-field-field-last-name[^>]*>([\s\S]*?)<\/td>/i);
    if (!nameCell) return;
    const name = directoryText_(nameCell[1]);
    const titleCell = row.match(/views-field-field-job-title[^>]*>([\s\S]*?)<\/td>/i);
    const title = titleCell ? directoryText_(titleCell[1]) : '';
    const mail = row.match(/mailto:([^"'?\s>]+)/i);
    const email = mail ? String(mail[1]).trim().toLowerCase() : '';
    if (name) people.push({ name: name, title: title, email: email });
  });
  return people;
}

/* True when the two last names are the same person's: equal, or one is the first part of the other
   ("castillo" and "castillo ardila"). */
function directoryLastNamesMatch_(a, b) {
  if (a === b) return true;
  return a.indexOf(b + ' ') === 0 || b.indexOf(a + ' ') === 0;
}

/* True when the first names match: equal, or one starts the other ("pat" and "patricia"). */
function directoryFirstNamesMatch_(a, b) {
  if (a === b) return true;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  return shorter.length >= 3 && longer.indexOf(shorter) === 0;
}

/* The directory entry for a Time Schedule name such as "Grant,Jenna M".
   Returns { status: 'found', email, title, directoryName }, or { status: 'no-email', ... } when the
   person is listed without an address, 'ambiguous' when more than one entry fits, or 'not-found'. */
function matchDirectoryPerson_(tsName, people) {
  const wanted = directorySplitName_(tsName);
  if (!wanted) return { status: 'not-found' };
  const fits = (people || []).filter(function(p) {
    const listed = directorySplitName_(p.name);
    if (!listed) return false;
    return directoryLastNamesMatch_(wanted.last, listed.last) && directoryFirstNamesMatch_(wanted.first, listed.first);
  });
  if (!fits.length) return { status: 'not-found' };
  if (fits.length > 1) return { status: 'ambiguous', directoryName: fits.map(function(p) { return p.name; }).join('; ') };
  const person = fits[0];
  const uwEmail = /^[^@\s]+@uw\.edu$/.test(person.email);
  return {
    status: uwEmail ? 'found' : 'no-email',
    email: uwEmail ? person.email : '',
    title: person.title,
    directoryName: person.name
  };
}
