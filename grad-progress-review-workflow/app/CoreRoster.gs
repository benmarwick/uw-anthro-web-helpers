/* ============================================================
   CoreRoster.gs: joining MyGrad registrations to Time Schedule sections. Pure functions, tested in tests/run.js.

   Inputs
     mygradRows: [{ quarter:'AUT2026', studentEmail, curric:'ANTH', number:'512', section:'A', grade:'X' }]
     sections:   [{ quarter, curric, number, section, sln, type:'5'|'QZ'|..., instructors:['Last,First'],
                   joint:true|false, independentStudy:true|false, meeting:'MW 1030-1220 MGH 389' }]
     students:   { email: { status:'ACTIVE'|'ON_LEAVE'|'LEFT', program:'PHD'|'MA', advisorEmails:[...] } }
     instructors:{ normalizedName: { email, appointment:'faculty'|'graduate student'|'other' } }
     options:    { curricula: ['ANTH','ARCHY','BIO A'] or null for every department }
   ============================================================ */

var EXCLUSION_ = {
  DROPPED: 'Dropped the course (W grade)',
  NO_MATCH: 'No Time Schedule match',
  INDIVIDUAL: 'Individual or research credits',
  NO_INSTRUCTOR: 'No instructor listed',
  OUTSIDE_PHASE: 'Outside the departments in this phase',
  GRAD_INSTRUCTOR: 'Instructor is a graduate student',
  STUDENT_INACTIVE: 'Student on leave or no longer enrolled',
  STUDENT_NOT_LISTED: 'Student not in the Students sheet (click Get MyGrad data first)'
};

/* 'BIO A 201 B' (with any spacing or non-breaking spaces) -> { curric:'BIO A', number:'201', section:'B' }. */
function parseCourseCell_(cell) {
  var tokens = String(cell || '').replace(/ /g, ' ').trim().split(/\s+/);
  if (tokens.length < 3) return null;
  var section = tokens[tokens.length - 1], number = tokens[tokens.length - 2];
  if (!/^[A-Z]{1,2}\d?$/.test(section) || !/^\d{3}$/.test(number)) return null;
  return { curric: tokens.slice(0, -2).join(' ').toUpperCase(), number: number, section: section };
}

/* Withdrawals stay on the transcript as W plus the week, e.g. W3. */
function isWithdrawnGrade_(grade) {
  return /^W\d*$/.test(String(grade || '').trim());
}

/* A quiz or lab registration (AB) belongs to its lecture (A). */
function lectureSection_(section) {
  return String(section || '').length === 2 ? String(section).charAt(0) : String(section || '');
}

/* 'Marwick,Ben M.' and 'MARWICK, BEN M' -> 'MARWICK,BEN M'. */
function normalizeInstructorName_(name) {
  return String(name || '').toUpperCase().replace(/ /g, ' ').replace(/\s*,\s*/g, ',')
    .replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
}

function isPlaceholderInstructor_(name) {
  var n = normalizeInstructorName_(name);
  return !n || n === 'STAFF' || n === 'TBA' || n === 'TO BE ARRANGED';
}

function sectionKey_(quarter, curric, number, section) {
  return [quarter, String(curric).toUpperCase(), number, section].join('|');
}

function joinRegistrations_(mygradRows, sections, students, instructors, options) {
  options = options || {};
  var curricula = options.curricula ? options.curricula.map(function(c) { return c.toUpperCase(); }) : null;
  var byKey = {};
  (sections || []).forEach(function(s) {
    byKey[sectionKey_(s.quarter, s.curric, s.number, s.section)] = s;
  });

  /* Joint listings: rows flagged J with the same instructors and meeting time are one offering. */
  var jointGroups = {};
  (sections || []).forEach(function(s) {
    if (!s.joint) return;
    var g = s.quarter + '|' + s.instructors.map(normalizeInstructorName_).sort().join('/') + '|' + String(s.meeting || '').replace(/\s+/g, ' ').trim();
    (jointGroups[g] = jointGroups[g] || []).push(s.curric + ' ' + s.number + ' ' + s.section);
  });
  function jointGroupFor(s) {
    if (!s.joint) return '';
    var g = s.quarter + '|' + s.instructors.map(normalizeInstructorName_).sort().join('/') + '|' + String(s.meeting || '').replace(/\s+/g, ' ').trim();
    return (jointGroups[g] || []).length > 1 ? jointGroups[g].slice().sort().join(' / ') : '';
  }

  var enrollments = [], requests = {}, missing = {}, counts = { registrations: 0, matched: 0, excluded: {}, unmatched: 0 };

  (mygradRows || []).forEach(function(r) {
    counts.registrations++;
    var e = {
      quarter: r.quarter, studentEmail: String(r.studentEmail || '').toLowerCase(), curric: String(r.curric).toUpperCase(),
      number: r.number, section: r.section, sln: '', sectionType: '', jointGroup: '', instructorNames: [],
      instructorEmails: [], exclusionReason: '', requestKey: '', isAdviseeOf: []
    };
    var exclude = function(reason) {
      e.exclusionReason = reason;
      counts.excluded[reason] = (counts.excluded[reason] || 0) + 1;
    };
    var student = students[e.studentEmail];
    // The MyGrad bridge sends withdrawn:true instead of the grade; a CSV may carry the grade itself.
    if (r.withdrawn === true || String(r.withdrawn).toLowerCase() === 'true' || isWithdrawnGrade_(r.grade)) {
      exclude(EXCLUSION_.DROPPED); enrollments.push(e); return;
    }
    if (!student) { exclude(EXCLUSION_.STUDENT_NOT_LISTED); enrollments.push(e); return; }
    if (student.status !== 'ACTIVE') { exclude(EXCLUSION_.STUDENT_INACTIVE); enrollments.push(e); return; }
    if (curricula && curricula.indexOf(e.curric) === -1) { exclude(EXCLUSION_.OUTSIDE_PHASE); enrollments.push(e); return; }
    var s = byKey[sectionKey_(e.quarter, e.curric, e.number, lectureSection_(e.section))];
    if (!s) { counts.unmatched++; exclude(EXCLUSION_.NO_MATCH); enrollments.push(e); return; }
    e.sln = s.sln; e.sectionType = s.type; e.section = s.section; e.jointGroup = jointGroupFor(s);
    var num = Number(e.number);
    if (s.independentStudy || num === 600 || num === 601 || num === 700 || num === 800 || num === 801) {
      exclude(EXCLUSION_.INDIVIDUAL); enrollments.push(e); return;
    }
    var names = (s.instructors || []).filter(function(n) { return !isPlaceholderInstructor_(n); });
    if (!names.length) { exclude(EXCLUSION_.NO_INSTRUCTOR); enrollments.push(e); return; }
    e.instructorNames = names;
    /* A graduate-student instructor is never asked , so their email is never needed. The appointment
       is checked first; only the other instructors need an email. */
    var emails = [], gradCount = 0;
    names.forEach(function(n) {
      var rec = instructors[normalizeInstructorName_(n)];
      var isGrad = rec && String(rec.appointment).toLowerCase() === 'graduate student';
      if (isGrad) { gradCount++; return; }
      if (!rec || !rec.email) { missing[normalizeInstructorName_(n)] = n; return; }
      emails.push(String(rec.email).toLowerCase());
    });
    /* Excluded only when every instructor is a graduate student; a mixed page waits for the others' emails. */
    if (gradCount === names.length) { exclude(EXCLUSION_.GRAD_INSTRUCTOR); enrollments.push(e); return; }
    e.instructorEmails = emails.sort();
    e.isAdviseeOf = emails.filter(function(em) { return (student.advisorEmails || []).map(function(a) { return a.toLowerCase(); }).indexOf(em) !== -1; });
    counts.matched++;
    var offering = e.jointGroup || (e.curric + ' ' + e.number);
    e.requestKey = e.quarter + '|' + names.map(normalizeInstructorName_).sort().join('/') + '|' + offering;
    var req = requests[e.requestKey] || (requests[e.requestKey] = {
      requestKey: e.requestKey, quarter: e.quarter, offering: offering, instructorNames: names.slice(),
      instructorEmails: [], studentEmails: []
    });
    e.instructorEmails.forEach(function(em) { if (req.instructorEmails.indexOf(em) === -1) req.instructorEmails.push(em); });
    if (req.studentEmails.indexOf(e.studentEmail) === -1) req.studentEmails.push(e.studentEmail);
    enrollments.push(e);
  });

  var missingNames = Object.keys(missing).map(function(k) { return missing[k]; }).sort();
  return {
    enrollments: enrollments,
    requests: Object.keys(requests).sort().map(function(k) { return requests[k]; }),
    missingInstructors: missingNames,
    counts: counts,
    canLaunch: missingNames.length === 0
  };
}

/* One-line summary for the Roster page, e.g.
   "52 registrations: 41 matched, 8 excluded (individual study 6; dropped 2), 3 unmatched". */
function joinSummary_(counts) {
  var ex = 0, parts = [];
  Object.keys(counts.excluded).forEach(function(k) { if (k !== EXCLUSION_.NO_MATCH) { ex += counts.excluded[k]; parts.push(k + ' ' + counts.excluded[k]); } });
  return counts.registrations + ' registrations: ' + counts.matched + ' matched, ' + ex + ' excluded' +
    (parts.length ? ' (' + parts.join('; ') + ')' : '') + ', ' + counts.unmatched + ' unmatched';
}
