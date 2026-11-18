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
    curriculaFilter: C_().CF_ALL_DEPARTMENTS ? null : C_().CF_CURRICULA_PHASE1,
    window: q ? courseFeedbackWindow_(q, C_().CF_RELEASE_OFFSET_DAYS) : null,
    missingEmails: readTable_(C_().SHEETS.INSTRUCTORS).filter(function(r) { return !r.Email; }).map(function(r) { return r.TS_Name; }),
    requests: readTable_(C_().SHEETS.REQUESTS).filter(function(r) { return r.Quarter === q; }).map(function(r) {
      return { requestId: r.Request_ID, offering: r.Offering, instructors: r.Instructor_Names, emails: r.Instructor_Emails, status: r.Status };
    }),
    myGradUrl: 'https://webappssecure.grad.uw.edu/mgp-dept.stu.detail/home/studentlist?orgid=14',
    timeScheduleUrl: q ? 'https://www.washington.edu/students/timeschd/' + q + '/' : ''
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
  Object.keys(tsData.appointments || {}).forEach(function(k) {
    const name = normalizeInstructorName_(k);
    if (instructors[name] && !instructors[name].appointment) instructors[name].appointment = tsData.appointments[k].appointment;
  });
  const res = joinRegistrations_(mygrad.registrations, tsData.sections, studentsMap_(), instructors,
    { curricula: C_().CF_ALL_DEPARTMENTS ? null : C_().CF_CURRICULA_PHASE1 });
  return {
    summary: joinSummary_(res.counts),
    counts: res.counts,
    missingInstructors: res.missingInstructors,
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
    const reqs = {};
    readTable_(S.REQUESTS).forEach(function(r) { if (r.Quarter === quarter && r.Status !== 'REISSUED') reqs[r.Request_Key] = r; });
    const created = [];
    res.requests.forEach(function(r) {
      const ex = reqs[r.requestKey];
      if (ex) {
        const emails = splitList_(ex.Instructor_Emails);
        r.instructorEmails.forEach(function(em) { if (emails.indexOf(em) === -1) emails.push(em); });
        updateRow_(S.REQUESTS, ex._row, { Offering: r.offering, Instructor_Emails: emails.join(', ') });
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
    return { summary: joinSummary_(res.counts), created: created.length, missingInstructors: res.missingInstructors, canLaunch: res.canLaunch };
  } finally {
    lock.releaseLock();
  }
}

/* Fills in an instructor's email (and optionally confirms the appointment) from the Roster page. */
function saveInstructor(tsName, email, appointment) {
  const actor = assertAdminOrGpc_();
  email = normEmail_(email);
  if (!/^[^@\s]+@uw\.edu$/.test(email)) throw new Error('Enter a @uw.edu address.');
  if (appointment && ['faculty', 'graduate student', 'other'].indexOf(appointment) === -1) throw new Error('Unknown appointment.');
  const row = readTable_(C_().SHEETS.INSTRUCTORS).filter(function(r) { return normalizeInstructorName_(r.TS_Name) === normalizeInstructorName_(tsName); })[0];
  const fields = { Email: email, Checked_By: actor, Checked_At: nowIso_() };
  if (appointment) { fields.Appointment = appointment; fields.Appointment_Source = 'administrator'; }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (row) updateRow_(C_().SHEETS.INSTRUCTORS, row._row, fields);
    else appendObjects_(C_().SHEETS.INSTRUCTORS, [Object.assign({ TS_Name: tsName }, fields)]);
    /* Pages not yet sent that name this instructor get the address now, so Launch does not need a second Import.
       A page already sent keeps its list: an instructor added to it later would never have had CF-1. */
    const name = normalizeInstructorName_(tsName);
    let pages = 0;
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
    SpreadsheetApp.flush();
    return { pages: pages };
  } finally {
    lock.releaseLock();
  }
}

/* Adds a co-instructor the Time Schedule does not show (course-feedback plan §4.2). */
function addCoInstructor(requestId, email) {
  assertAdminOrGpc_();
  email = normEmail_(email);
  if (!/^[^@\s]+@uw\.edu$/.test(email)) throw new Error('Enter a @uw.edu address.');
  const r = findOne_(C_().SHEETS.REQUESTS, 'Request_ID', requestId);
  if (!r) throw new Error('Page not found.');
  const emails = splitList_(r.Instructor_Emails);
  if (emails.indexOf(email) === -1) emails.push(email);
  updateRow_(C_().SHEETS.REQUESTS, r._row, { Instructor_Emails: emails.join(', ') });
  return emails;
}
