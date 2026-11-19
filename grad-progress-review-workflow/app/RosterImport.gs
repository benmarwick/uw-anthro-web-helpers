/* ============================================================
   RosterImport.gs: the Roster page's server side (course-feedback plan §4.4–4.5; annual review
   plan §9.3). The page receives MyGrad and Time Schedule data from the bookmarklets by postMessage
   (or CSV) and sends it here.
   ============================================================ */

/* What the Roster page needs to start. */
/* quarter: the quarter typed on the Roster page; without one, the current calendar quarter. */
function rosterPageData(quarter) {
  assertAdminOrGpc_();
  const today = todayIso_();
  const q = /^(AUT|WIN|SPR|SUM)\d{4}$/.test(String(quarter || '')) ? String(quarter) : quarterForDate_(today);
  return {
    quarter: q,
    quarterLabel: quarterLabel_(q),
    studentCount: readTable_(C_().SHEETS.STUDENTS).length,
    sheetLinks: rosterSheetLinks_(),
    curriculaFilter: C_().CF_ALL_DEPARTMENTS ? null : C_().CF_CURRICULA_PHASE1,
    window: q ? courseFeedbackWindow_(q, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES) : null,
    missingEmails: readTable_(C_().SHEETS.INSTRUCTORS).filter(function(r) { return !r.Email && !isGradStudentAppointment_(r.Appointment); }).map(function(r) { return r.TS_Name; }),
    requests: (function() {
      const inst = instructorsMap_();
      return readTable_(C_().SHEETS.REQUESTS).filter(function(r) { return r.Quarter === q; }).map(function(r) {
        return { requestId: r.Request_ID, offering: r.Offering, instructors: r.Instructor_Names, emails: r.Instructor_Emails, status: r.Status,
                 missing: r.Status === 'NOT_STARTED' ? pageMissingInstructors_(r, inst) : [] };
      });
    })(),
    opensLong: q ? dateLong_(courseFeedbackWindow_(q, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES).opens) : '',
    launchOpen: q ? today >= courseFeedbackWindow_(q, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES).opens : false,
    myGradUrl: 'https://webappssecure.grad.uw.edu/mgp-dept.stu.detail/home/studentlist?orgid=14',
    timeScheduleUrl: q ? 'https://www.washington.edu/students/timeschd/' + q + '/' : ''
  };
}

/* Links to the app's spreadsheet and to the tabs the Roster page fills (Students, Instructors). */
function rosterSheetLinks_() {
  const base = 'https://docs.google.com/spreadsheets/d/' + C_().SPREADSHEET_ID + '/edit';
  const tab = function(name) { return base + '#gid=' + getSheetCached_(name).getSheetId(); };
  return { spreadsheet: base, students: tab(C_().SHEETS.STUDENTS), instructors: tab(C_().SHEETS.INSTRUCTORS) };
}

/* ---------- Check before launch ---------- */

/* Everything Launch would send for the quarter, without sending it: for each page not yet sent, the
   addresses that get CF-1 with the greeting each one would see, and the students on the page. Pages
   with no students left are listed as closing (Launch closes them and sends nothing). The email text
   is rendered from the first page, with a placeholder for the link that Launch creates. */
function launchReviewData(quarter) {
  assertAdminOrGpc_();
  if (!/^(AUT|WIN|SPR|SUM)\d{4}$/.test(String(quarter))) throw new Error('Choose a quarter.');
  const S = C_().SHEETS;
  const w = courseFeedbackWindow_(quarter, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES);
  const students = {}, instByEmail = {};
  readTable_(S.STUDENTS).forEach(function(r) { students[normEmail_(r.Email)] = r; });
  readTable_(S.INSTRUCTORS).forEach(function(r) { if (r.Email) instByEmail[normEmail_(r.Email)] = r; });
  /* The greeting firstNameFor_ would use, from tables read once. */
  const greet = function(em) {
    const s = students[em];
    if (s && s.Preferred_First) return String(s.Preferred_First);
    const i = instByEmail[em];
    if (i && String(i.TS_Name).indexOf(',') !== -1) {
      const given = String(i.TS_Name).split(',')[1].trim().split(/\s+/)[0];
      if (given) return given.charAt(0).toUpperCase() + given.slice(1).toLowerCase();
    }
    return 'colleague';
  };
  const byKey = {}, excluded = {};
  readTable_(S.ENROLLMENTS).forEach(function(e) {
    if (e.Quarter !== quarter) return;
    if (e.Exclusion_Reason) { excluded[e.Exclusion_Reason] = (excluded[e.Exclusion_Reason] || 0) + 1; return; }
    (byKey[e.Request_Key] = byKey[e.Request_Key] || []).push(e);
  });
  const inst = instructorsMap_();
  const pages = readTable_(S.REQUESTS).filter(function(r) { return r.Quarter === quarter && r.Status === 'NOT_STARTED'; }).map(function(r) {
    const rows = byKey[r.Request_Key] || [];
    return {
      requestId: r.Request_ID, offering: r.Offering, instructors: r.Instructor_Names,
      recipients: splitList_(r.Instructor_Emails).map(function(em) { em = normEmail_(em); return { email: em, greeting: greet(em) }; }),
      missing: pageMissingInstructors_(r, inst),
      students: rows.map(function(e) {
        const s = students[normEmail_(e.Student_Email)] || {};
        return { name: s.Name || e.Student_Email, program: s.Program || '', section: e.Section || '', advisee: !!e.Advisee_Of };
      }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); })
    };
  }).sort(function(a, b) { return String(a.offering).localeCompare(String(b.offering)); });
  const first = pages.filter(function(p) { return p.students.length && p.recipients.length; })[0];
  const sample = first ? renderEmailTemplate_('CF-1', {
    course: first.offering, quarter: quarterLabel_(quarter), n: first.students.length,
    url: '(link to the page, created at launch)', notMineUrl: '(link, created at launch)', dueLong: dateLong_(w.due)
  }, { firstName: first.recipients[0].greeting, gpcName: C_().GPC_NAME || 'The Graduate Program Coordinator', privacyUrl: C_().PRIVACY_URL, reference: first.requestId }) : null;
  return {
    quarterLabel: quarterLabel_(quarter), opensLong: dateLong_(w.opens), dueLong: dateLong_(w.due), launchOpen: todayIso_() >= w.opens,
    pages: pages, excluded: Object.keys(excluded).map(function(k) { return { reason: k, n: excluded[k] }; }),
    sample: sample ? { offering: first.offering, to: first.recipients[0].email, subject: sample.subject, text: sample.text } : null
  };
}

/* ---------- MyGrad prefill (annual review plan §9.3) ---------- */

/* Updates Students from the bridge's prefill data. Columns the administrator maintains (subfield,
   advisors, chair, GSR, alternate reviewer, status) are never overwritten. */
function importMyGradPrefill(data) {
  const actor = assertAdminOrGpc_();
  if (!data || data.type !== 'mygrad-data' || data.mode !== 'prefill' || !Array.isArray(data.students)) throw new Error('Not MyGrad prefill data.');
  const sheetName = C_().SHEETS.STUDENTS;
  const existing = {};
  readTable_(sheetName).forEach(function(r) { existing[normEmail_(r.Email)] = r; });
  const added = [], updated = [];
  const currentQ = quarterForDate_(todayIso_());
  data.students.forEach(function(s) {
    const email = normEmail_(s.email);
    if (!/^[^@\s]+@uw\.edu$/.test(email)) return;
    const fields = {
      Name: sanitizeText_(s.name, 200, false), Preferred_First: sanitizeText_(s.preferredFirst, 60, false),
      Program: s.program === 'MA' ? 'MA' : 'PHD', Entry_Quarter: sanitizeText_(s.entryQuarter, 10, false),
      GPA: sanitizeText_(s.gpa, 10, false), Leave_Ends: sanitizeText_(s.leaveEnds, 10, false),
      Has_Advisor: sanitizeText_(s.hasAdvisor, 10, false), Has_Doc_Comm: sanitizeText_(s.hasDocComm, 10, false),
      Has_Masters_Comm: sanitizeText_(s.hasMastersComm, 10, false), Has_Reading_Comm: sanitizeText_(s.hasReadingComm, 10, false),
      UW_Degrees: sanitizeText_(s.uwDegrees, 500, false), Candidacy_Date: sanitizeText_(s.candidacyDate, 40, false),
      ANTH800_Credits: Number(s.anth800Credits) || 0, Courses_JSON: jsonCell_(sanitizeDeep_(s.courses || [])), Updated_At: nowIso_()
    };
    const row = existing[email];
    if (row) { updateRow_(sheetName, row._row, fields); updated.push(email); }
    else {
      fields.Email = email;
      fields.Status = s.leaveEnds && currentQ && quarterOrder_(s.leaveEnds) >= quarterOrder_(currentQ) ? 'ON_LEAVE' : 'ACTIVE';
      appendObjects_(sheetName, [fields]);
      added.push(email);
    }
  });
  const inMyGrad = {};
  data.students.forEach(function(s) { inMyGrad[normEmail_(s.email)] = true; });
  const notInMyGrad = Object.keys(existing).filter(function(e) { return !inMyGrad[e] && existing[e].Status === 'ACTIVE'; });
  logEvent_({ action: C_().ACTIONS.ROSTER_IMPORTED, evaluationId: 'Students', details: { added: added.length, updated: updated.length }, actorEmail: actor });
  return { added: added.length, updated: updated.length, failures: (data.failures || []).length, notInMyGrad: notInMyGrad };
}

/* quarterOrder_ is in CoreDates.gs. */

/* ---------- Course feedback roster ---------- */

function studentsMap_() {
  const map = {};
  readTable_(C_().SHEETS.STUDENTS).forEach(function(r) {
    map[normEmail_(r.Email)] = { status: r.Status || 'ACTIVE', program: r.Program, advisorEmails: splitList_(r.Advisor_Emails) };
  });
  return map;
}

/* The instructors named on a page who should be asked but have no email yet. A graduate-student instructor is
   never asked (principle 8), so a page they co-teach needs emails only for the others (course-feedback plan §4.5). */
function pageMissingInstructors_(req, instructors) {
  return String(req.Instructor_Names || '').split(/\s*\/\s*/).filter(Boolean).filter(function(n) {
    if (isPlaceholderInstructor_(n)) return false;
    const rec = instructors[normalizeInstructorName_(n)];
    if (rec && String(rec.appointment).toLowerCase() === 'graduate student') return false;
    return !(rec && rec.email);
  });
}

function isGradStudentAppointment_(appointment) {
  return String(appointment || '').toLowerCase() === 'graduate student';
}

/* The addresses of instructors marked as graduate students in the Instructors sheet. */
function gradStudentEmails_() {
  const emails = {};
  readTable_(C_().SHEETS.INSTRUCTORS).forEach(function(r) {
    if (r.Email && isGradStudentAppointment_(r.Appointment)) emails[normEmail_(r.Email)] = true;
  });
  return emails;
}

/* Pages that have been sent and can still be edited (co-instructors may edit until the page closes, plan §4.3). */
var LATE_INVITE_STATUSES_ = ['SENT', 'DRAFT', 'SUBMITTED'];

/* A page already sent (it has a link and is still open) gives each address added later its own CF-1, with the
   same link and due date the others had. A page not yet sent waits for Launch. Returns how many were sent. */
function sendLateInvitations_(req, newEmails) {
  if (!newEmails.length) return 0;
  if (LATE_INVITE_STATUSES_.indexOf(req.Status) === -1) return 0;
  if (!req.Secure_Token || pageClosed_(req)) return 0;
  const n = activeStudentsForRequest_(req).length;
  newEmails.forEach(function(em) {
    sendTemplate_('CF-1', em, firstNameFor_(em), {
      course: req.Offering, quarter: quarterLabel_(req.Quarter), n: n, url: appUrl_({ f: req.Secure_Token }),
      notMineUrl: appUrl_({ f: req.Secure_Token, nmc: 1 }), dueLong: dateLong_(req.Due_Date)
    }, req.Request_ID);
  });
  return newEmails.length;
}

function instructorsMap_() {
  const map = {};
  readTable_(C_().SHEETS.INSTRUCTORS).forEach(function(r) {
    map[normalizeInstructorName_(r.TS_Name)] = { email: normEmail_(r.Email), appointment: r.Appointment };
  });
  return map;
}

function validateRosterInputs_(quarter, mygrad, tsData) {
  if (!/^(AUT|WIN|SPR|SUM)\d{4}$/.test(String(quarter))) throw new Error('Choose a quarter.');
  if (!mygrad || mygrad.type !== 'mygrad-data' || mygrad.mode !== 'registrations' || !Array.isArray(mygrad.registrations)) throw new Error('Get the MyGrad registrations first.');
  if (!tsData || tsData.type !== 'ts-sections' || !Array.isArray(tsData.sections)) throw new Error('Get the Time Schedule sections first.');
  if (mygrad.quarter !== quarter || tsData.quarter !== quarter) throw new Error('The MyGrad and Time Schedule data are for a different quarter.');
}

/* Runs the join without writing anything, for the preview. */
function previewCourseFeedback(quarter, mygrad, tsData) {
  assertAdminOrGpc_();
  validateRosterInputs_(quarter, mygrad, tsData);
  const instructors = instructorsMap_();
  /* The same appointments Import would write: new names take the CEC's, known names only when blank. */
  Object.keys(tsData.appointments || {}).forEach(function(k) {
    const name = normalizeInstructorName_(k);
    const appointment = tsData.appointments[k].appointment;
    if (!instructors[name]) instructors[name] = { email: '', appointment: appointment };
    else if (!instructors[name].appointment) instructors[name].appointment = appointment;
  });
  const res = joinRegistrations_(mygrad.registrations, tsData.sections, studentsMap_(), instructors,
    { curricula: C_().CF_ALL_DEPARTMENTS ? null : C_().CF_CURRICULA_PHASE1 });
  return {
    summary: joinSummary_(res.counts),
    counts: res.counts,
    missingInstructors: res.missingInstructors,
    studentCount: readTable_(C_().SHEETS.STUDENTS).length,
    canLaunch: res.canLaunch,
    unmatched: res.enrollments.filter(function(e) { return e.exclusionReason === EXCLUSION_.NO_MATCH; })
      .map(function(e) { return e.curric + ' ' + e.number + ' ' + e.section; }),
    pages: res.requests.map(function(r) { return { offering: r.offering, instructors: r.instructorNames.join(', '), students: r.studentEmails.length }; }),
    missingCurricula: tsData.missingCurricula || [],
    cecError: tsData.cecError || ''
  };
}

/* Writes Enrollments for the quarter, adds unknown instructors to Instructors, and creates or updates
   one Feedback_Requests row per instructor page. Rows that fail a rule keep their reason. */
function importCourseFeedback(quarter, mygrad, tsData) {
  const actor = assertAdminOrGpc_();
  validateRosterInputs_(quarter, mygrad, tsData);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const S = C_().SHEETS;
    /* Instructors: add new names, fill appointments from the CEC unless the administrator set one. */
    const instRows = readTable_(S.INSTRUCTORS);
    const known = {};
    instRows.forEach(function(r) { known[normalizeInstructorName_(r.TS_Name)] = r; });
    const names = {};
    tsData.sections.forEach(function(s) { (s.instructors || []).forEach(function(n) { if (!isPlaceholderInstructor_(n)) names[normalizeInstructorName_(n)] = n; }); });
    const newRows = [];
    Object.keys(names).forEach(function(k) {
      const appt = (tsData.appointments || {})[k];
      if (!known[k]) newRows.push({ TS_Name: names[k], Email: '', Appointment: appt ? appt.appointment : '', Appointment_Source: appt ? 'CEC ' + appt.quarter : '', Checked_By: '', Checked_At: '' });
      else if (appt && known[k].Appointment_Source !== 'administrator' && !known[k].Appointment) {
        updateRow_(S.INSTRUCTORS, known[k]._row, { Appointment: appt.appointment, Appointment_Source: 'CEC ' + appt.quarter });
      }
    });
    appendObjects_(S.INSTRUCTORS, newRows);

    const res = joinRegistrations_(mygrad.registrations, tsData.sections, studentsMap_(), instructorsMap_(),
      { curricula: C_().CF_ALL_DEPARTMENTS ? null : C_().CF_CURRICULA_PHASE1 });

    /* Enrollments: replace the quarter's rows. */
    const sheet = getSheetCached_(S.ENROLLMENTS);
    const old = readTable_(S.ENROLLMENTS).filter(function(r) { return r.Quarter === quarter; }).map(function(r) { return r._row; }).sort(function(a, b) { return b - a; });
    old.forEach(function(rowNum) { sheet.deleteRow(rowNum); });
    invalidateTable_(S.ENROLLMENTS);
    const now = nowIso_();
    appendObjects_(S.ENROLLMENTS, res.enrollments.map(function(e) {
      return { Quarter: e.quarter, Student_Email: e.studentEmail, Curric: e.curric, Course_Number: e.number, Section: e.section, SLN: e.sln,
               Section_Type: e.sectionType, Joint_Group: e.jointGroup, Instructor_Names: e.instructorNames.join(' / '),
               Instructor_Emails: e.instructorEmails.join(', '), Exclusion_Reason: e.exclusionReason, Source: 'MyGrad', Request_Key: e.requestKey,
               Advisee_Of: e.isAdviseeOf.join(', '), Imported_At: now };
    }));

    /* Feedback_Requests: one per page; keep tokens and status, and any co-instructor added by hand. */
    const reqs = {}, reissued = {};
    readTable_(S.REQUESTS).forEach(function(r) {
      if (r.Quarter !== quarter) return;
      if (r.Status === 'REISSUED') reissued[r.Request_Key] = true;
      else reqs[r.Request_Key] = r;
    });
    const created = [];
    let invited = 0;
    res.requests.forEach(function(r) {
      const ex = reqs[r.requestKey];
      if (ex) {
        /* A page re-sent after "Not my course" keeps the addresses the administrator chose. */
        const emails = splitList_(ex.Instructor_Emails);
        const added = [];
        if (!reissued[r.requestKey]) {
          r.instructorEmails.forEach(function(em) {
            const address = normEmail_(em);
            if (emails.indexOf(address) !== -1) return;
            emails.push(address);
            added.push(address);
          });
        }
        updateRow_(S.REQUESTS, ex._row, { Offering: r.offering, Instructor_Emails: emails.join(', ') });
        invited += sendLateInvitations_(Object.assign({}, ex, { Instructor_Emails: emails.join(', ') }), added);
        delete reqs[r.requestKey];
      } else {
        created.push({ Request_ID: newId_('CF'), Request_Key: r.requestKey, Quarter: quarter, Offering: r.offering,
                       Instructor_Names: r.instructorNames.join(' / '), Instructor_Emails: r.instructorEmails.join(', '), Status: 'NOT_STARTED',
                       Reminder_Count: 0, Created_At: now });
      }
    });
    appendObjects_(S.REQUESTS, created);
    /* A page whose students have all dropped closes. */
    Object.keys(reqs).forEach(function(k) {
      if (['NOT_STARTED', 'SENT', 'DRAFT'].indexOf(reqs[k].Status) !== -1) updateRow_(S.REQUESTS, reqs[k]._row, { Status: 'CLOSED' });
    });
    logEvent_({ action: C_().ACTIONS.ROSTER_IMPORTED, evaluationId: quarter, details: res.counts, actorEmail: actor });
    SpreadsheetApp.flush();   // commit every write before the lock is released and the page reloads its list
    return { summary: joinSummary_(res.counts), created: created.length, invited: invited, missingInstructors: res.missingInstructors, canLaunch: res.canLaunch };
  } finally {
    lock.releaseLock();
  }
}

/* Fills in an instructor's email (and optionally confirms the appointment) from the Roster page.
   A graduate student is never asked (principle 8): their email is optional and never goes on a page. */
/* Suggested emails for the named instructors, from the department's public people page
   (CoreDirectory.gs). Returns { suggestions: { name: match }, error }. Nothing is saved here. */
function suggestInstructorEmails(names) {
  assertAdminOrGpc_();
  const url = C_().DEPARTMENT_DIRECTORY_URL;
  if (!url) return { suggestions: {}, error: 'No department directory is set (DEPARTMENT_DIRECTORY_URL in Config.gs).' };
  let html;
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return { suggestions: {}, error: 'The department directory answered ' + res.getResponseCode() + '.' };
    html = res.getContentText();
  } catch (err) {
    return { suggestions: {}, error: 'The department directory could not be read (' + err.message + ').' };
  }
  const people = parseDepartmentDirectory_(html);
  if (!people.length) return { suggestions: {}, error: 'No people found on the department directory page; its layout may have changed.' };
  const suggestions = {};
  (names || []).slice(0, 200).forEach(function(name) {
    suggestions[name] = matchDirectoryPerson_(String(name), people);
  });
  return { suggestions: suggestions, error: '' };
}

function saveInstructor(tsName, email, appointment) {
  const actor = assertAdminOrGpc_();
  email = normEmail_(email);
  if (appointment && ['faculty', 'graduate student', 'other'].indexOf(appointment) === -1) throw new Error('Unknown appointment.');
  const row = readTable_(C_().SHEETS.INSTRUCTORS).filter(function(r) { return normalizeInstructorName_(r.TS_Name) === normalizeInstructorName_(tsName); })[0];
  const effectiveAppointment = appointment || (row ? row.Appointment : '');
  const gradStudent = isGradStudentAppointment_(effectiveAppointment);
  if (!gradStudent && !/^[^@\s]+@uw\.edu$/.test(email)) throw new Error('Enter a @uw.edu address.');
  if (email && !/^[^@\s]+@uw\.edu$/.test(email)) throw new Error('Enter a @uw.edu address, or leave it blank for a graduate student.');
  const fields = { Checked_By: actor, Checked_At: nowIso_() };
  if (email) fields.Email = email;
  if (appointment) { fields.Appointment = appointment; fields.Appointment_Source = 'administrator'; }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (row) updateRow_(C_().SHEETS.INSTRUCTORS, row._row, fields);
    else appendObjects_(C_().SHEETS.INSTRUCTORS, [Object.assign({ TS_Name: tsName, Email: '' }, fields)]);
    /* Pages not yet sent that name this instructor get the address now, so Launch does not need a second Import.
       A page already sent keeps its list: an instructor added to it later would never have had CF-1.
       A graduate student's address never goes on a page; Import again to update the exclusions. */
    const name = normalizeInstructorName_(tsName);
    let pages = 0;
    if (gradStudent) {
      /* An address put on an unsent page before this person was marked a graduate student comes off again. */
      const remove = [email, row ? normEmail_(row.Email) : ''].filter(Boolean);
      readTable_(C_().SHEETS.REQUESTS).forEach(function(r) {
        if (r.Status !== 'NOT_STARTED') return;
        const emails = splitList_(r.Instructor_Emails);
        const kept = emails.filter(function(em) { return remove.indexOf(em) === -1; });
        if (kept.length === emails.length) return;
        updateRow_(C_().SHEETS.REQUESTS, r._row, { Instructor_Emails: kept.join(', ') });
        pages++;
      });
    } else {
      readTable_(C_().SHEETS.REQUESTS).forEach(function(r) {
        if (r.Status !== 'NOT_STARTED') return;
        const names = String(r.Instructor_Names || '').split(/\s*\/\s*/).map(normalizeInstructorName_);
        if (names.indexOf(name) === -1) return;
        const emails = splitList_(r.Instructor_Emails);
        if (emails.indexOf(email) !== -1) return;
        emails.push(email);
        updateRow_(C_().SHEETS.REQUESTS, r._row, { Instructor_Emails: emails.join(', ') });
        pages++;
      });
    }
    SpreadsheetApp.flush();
    return { pages: pages, gradStudent: gradStudent };
  } finally {
    lock.releaseLock();
  }
}

/* Adds a co-instructor the Time Schedule does not show (course-feedback plan §4.2). On a page already sent,
   the new address gets CF-1 at once (sendLateInvitations_); a page not yet sent waits for Launch. */
function addCoInstructor(requestId, email) {
  assertAdminOrGpc_();
  email = normEmail_(email);
  if (!/^[^@\s]+@uw\.edu$/.test(email)) throw new Error('Enter a @uw.edu address.');
  if (gradStudentEmails_()[email]) throw new Error('That address belongs to an instructor marked as a graduate student, who is never asked.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const r = findOne_(C_().SHEETS.REQUESTS, 'Request_ID', requestId);
    if (!r) throw new Error('Page not found.');
    const open = r.Status === 'NOT_STARTED' || (LATE_INVITE_STATUSES_.indexOf(r.Status) !== -1 && !pageClosed_(r));
    if (!open) throw new Error('This page is closed, so a co-instructor cannot be added.');
    const emails = splitList_(r.Instructor_Emails);
    if (emails.indexOf(email) !== -1) return { emails: emails, invited: false };
    emails.push(email);
    updateRow_(C_().SHEETS.REQUESTS, r._row, { Instructor_Emails: emails.join(', ') });
    SpreadsheetApp.flush();
    const invited = sendLateInvitations_(Object.assign({}, r, { Instructor_Emails: emails.join(', ') }), [email]) > 0;
    return { emails: emails, invited: invited };
  } finally {
    lock.releaseLock();
  }
}
