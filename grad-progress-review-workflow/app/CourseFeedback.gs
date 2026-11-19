/* ============================================================
   CourseFeedback.gs: launch, the instructor page, "Not my course", the GPC's quarterly check and
   release, follow-up flags and the yearly Course Feedback Record (course-feedback plan §5–§6;
   build-spec.md §1.2, §2).
   ============================================================ */

/* ---------- Launch ---------- */

/* Sends every NOT_STARTED page for the quarter. Refuses before the window opens and while any instructor has no email. */
function launchCourseFeedback_(quarter, actor) {
  const S = C_().SHEETS;
  if (C_().CF_QUARTERS_ON[quarter] === false) throw new Error(quarterLabel_(quarter) + ' is switched off in Config.gs (CF_QUARTERS_ON).');
  const w = courseFeedbackWindow_(quarter, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES);
  if (todayIso_() < w.opens) throw new Error('Course feedback for ' + quarterLabel_(quarter) + ' opens on ' + dateLong_(w.opens) + '. Launch is available from that day.');
  const pending = readTable_(S.REQUESTS).filter(function(r) { return r.Quarter === quarter && r.Status === 'NOT_STARTED'; });
  /* Every instructor who should be asked needs an email (course-feedback plan §4.5); see pageMissingInstructors_. */
  const inst = instructorsMap_();
  const noEmail = pending.filter(function(r) { return pageMissingInstructors_(r, inst).length > 0 || !splitList_(r.Instructor_Emails).length; });
  if (noEmail.length) throw new Error(noEmail.length + ' page(s) are missing an instructor email. Add the missing emails on the Roster page first.');
  let sent = 0;
  pending.forEach(function(r) {
    const t = newToken_();
    const students = activeStudentsForRequest_(r);
    if (!students.length) { updateRow_(S.REQUESTS, r._row, { Status: 'CLOSED' }); return; }
    updateRow_(S.REQUESTS, r._row, { Status: 'SENT', Secure_Token: t.token, Token_Expiry: new Date(isoToUtc_(w.release) + 30 * 86400000).toISOString(), Due_Date: w.due });
    splitList_(r.Instructor_Emails).forEach(function(em) {
      sendTemplate_('CF-1', em, firstNameFor_(em), {
        course: r.Offering, quarter: quarterLabel_(quarter), n: students.length, url: appUrl_({ f: t.token }),
        notMineUrl: appUrl_({ f: t.token, nmc: 1 }), dueLong: dateLong_(w.due)
      }, r.Request_ID);
    });
    sent++;
  });
  logEvent_({ action: C_().ACTIONS.CF_LAUNCHED, evaluationId: quarter, details: { pages: sent }, actorEmail: actor || 'SYSTEM' });
  return sent;
}

/* The Roster page's Launch button. */
function launchCourseFeedbackFromPage(quarter) {
  const actor = assertAdminOrGpc_();
  if (!/^(AUT|WIN|SPR|SUM)\d{4}$/.test(String(quarter))) throw new Error('Choose a quarter.');
  return launchCourseFeedback_(quarter, actor);
}

function activeStudentsForRequest_(req) {
  return readTable_(C_().SHEETS.ENROLLMENTS).filter(function(e) {
    return e.Request_Key === req.Request_Key && e.Quarter === req.Quarter && !e.Exclusion_Reason;
  });
}

/* Year in the program, counted from the entry quarter (autumn entry: year 1 until the next autumn). */
function yearInProgram_(entryQuarter, quarter) {
  const a = String(entryQuarter || '').match(/^(WIN|SPR|SUM|AUT)(\d{4})$/), b = String(quarter || '').match(/^(WIN|SPR|SUM|AUT)(\d{4})$/);
  if (!a || !b) return '';
  const acad = function(m) { return m[1] === 'AUT' ? Number(m[2]) : Number(m[2]) - 1; };
  return acad(b) - acad(a) + 1;
}

/* ---------- The instructor page ---------- */

function loadRequestForInstructor_(token) {
  if (!isTokenShape_(token)) return { error: 'This link is not valid.' };
  const r = findOne_(C_().SHEETS.REQUESTS, 'Secure_Token', token);
  if (!r) return { error: 'This link is not valid or has been replaced.' };
  if (isExpired_(r.Token_Expiry)) return { error: 'This link has expired. Reply to the invitation email and we will send a new one.' };
  const email = activeEmail_();
  if (!email) return { error: 'Sign in with your UW Google account to open this page.' };
  if (splitList_(r.Instructor_Emails).indexOf(email) === -1 && !isAdmin_(email)) {
    return { error: 'This page is for the instructors of ' + r.Offering + '. You are signed in as ' + email + '.' };
  }
  return { request: r, email: email };
}

function pageClosed_(r) { return r.Status === 'CLOSED' || r.Status === 'NOT_MY_COURSE' || (r.Due_Date && daysBetween_(r.Due_Date, todayIso_()) > 0); }

function commentsForRequest_(requestId) {
  return findRows_(C_().SHEETS.COMMENTS, 'Request_ID', requestId);
}

/* Everything FeedbackForm.html shows. */
function loadFeedbackPage(token) {
  const a = loadRequestForInstructor_(token);
  if (a.error) return { error: a.error };
  const r = a.request, S = C_().SHEETS;
  const closed = pageClosed_(r);
  const lock = lockDecision_(r.Lock_Owner, r.Lock_Until ? new Date(r.Lock_Until).getTime() : 0, a.email, Date.now(), C_().CF_LOCK_MINUTES);
  const shared = splitList_(r.Instructor_Emails).length > 1;
  if (shared && lock.allowed && !closed) updateRow_(S.REQUESTS, r._row, { Lock_Owner: a.email, Lock_Until: new Date(lock.until).toISOString() });
  const comments = {};
  commentsForRequest_(r.Request_ID).forEach(function(c) { comments[normEmail_(c.Student_Email)] = c; });
  const students = activeStudentsForRequest_(r).map(function(e) {
    const s = findOne_(S.STUDENTS, 'Email', normEmail_(e.Student_Email)) || {};
    const c = comments[normEmail_(e.Student_Email)] || {};
    const returned = c.Status === 'RETURNED' || c.Status === 'STUDENT_ONLY';
    return {
      email: normEmail_(e.Student_Email), name: s.Name || e.Student_Email, program: s.Program === 'MA' ? 'MA (Archaeological Heritage)' : 'PhD',
      subfield: s.Subfield || '', year: yearInProgram_(s.Entry_Quarter, r.Quarter), course: e.Curric + ' ' + e.Course_Number,
      isAdvisee: splitList_(e.Advisee_Of).indexOf(a.email) !== -1,
      contact: c.Contact || '', written: c.Rating_Written || '', discussion: c.Rating_Discussion || '', literature: c.Rating_Literature || '',
      strength: c.Strength || '', nextStep: c.Next_Step || '', followup: c.Followup_Flag === true || c.Followup_Flag === 'TRUE',
      followupNote: c.Followup_Note || '', status: c.Status || '', returnedReason: returned ? (c.Returned_Reason || '') : '',
      editable: !closed || (returned && c.Return_Until && daysBetween_(todayIso_(), c.Return_Until) >= 0)
    };
  });
  return {
    offering: r.Offering, quarter: quarterLabel_(r.Quarter), due: r.Due_Date ? dateLong_(r.Due_Date) : '', closed: closed,
    readOnlyLock: shared && !lock.allowed, lockOwner: lock.allowed ? '' : lock.owner, levels: CF_LEVELS_, students: students,
    signature: r.Signature || '', minutes: r.Minutes_Bucket || '', status: r.Status
  };
}

/* Checks one student's entry. Returns '' or a message. */
function validateFeedbackEntry_(f, final) {
  if (!final) return '';
  if (['enough', 'not_enough', 'covered'].indexOf(f.contact) === -1) return 'choose whether you had enough contact to comment';
  if (f.contact !== 'enough') return '';
  const lv = ['written', 'discussion', 'literature'].filter(function(k) { return CF_LEVELS_.indexOf(f[k]) === -1; });
  if (lv.length) return 'choose a level for each of the three ratings';
  if (!String(f.strength || '').trim()) return 'add one thing the student did well';
  if (!String(f.nextStep || '').trim()) return 'add the one next step';
  if (String(f.strength).length > 500 || String(f.nextStep).length > 500) return 'keep each comment to 500 characters';
  if (f.followup && !String(f.followupNote || '').trim()) return 'add what you observed, and when, for the follow-up';
  return '';
}

/* Saves a draft (final=false) or submits the page (final=true). */
function saveFeedbackPage(token, data, final) {
  const a = loadRequestForInstructor_(token);
  if (a.error) throw new Error(a.error);
  const rl = checkRateLimit_(a.email, 'cf_save', 120);
  if (!rl.allowed) throw new Error('Too many saves in an hour. Please wait a few minutes.');
  const lockSvc = LockService.getScriptLock();
  lockSvc.waitLock(20000);
  try {
    const S = C_().SHEETS;
    const r = findOne_(S.REQUESTS, 'Request_ID', a.request.Request_ID);
    const shared = splitList_(r.Instructor_Emails).length > 1;
    const lock = lockDecision_(r.Lock_Owner, r.Lock_Until ? new Date(r.Lock_Until).getTime() : 0, a.email, Date.now(), C_().CF_LOCK_MINUTES);
    if (shared && !lock.allowed) throw new Error('A co-instructor (' + lock.owner + ') is editing this page. It will open for you when they finish.');
    const closed = pageClosed_(r);
    const existing = {};
    commentsForRequest_(r.Request_ID).forEach(function(c) { existing[normEmail_(c.Student_Email)] = c; });
    const allowed = {};
    activeStudentsForRequest_(r).forEach(function(e) { allowed[normEmail_(e.Student_Email)] = e; });
    const entries = (data && data.students) || {};
    const problems = [];
    Object.keys(entries).forEach(function(em) {
      const email = normEmail_(em);
      const enr = allowed[email];
      if (!enr) return;
      const f = sanitizeDeep_(entries[em]);
      const c = existing[email];
      const returnedOpen = c && (c.Status === 'RETURNED' || c.Status === 'STUDENT_ONLY') && c.Return_Until && daysBetween_(todayIso_(), c.Return_Until) >= 0;
      if (closed && !returnedOpen) return;
      const msg = validateFeedbackEntry_(f, final);
      if (msg) { problems.push((findOne_(S.STUDENTS, 'Email', email) || {}).Name + ': ' + msg); return; }
      let status = 'DRAFT';
      if (final) {
        if (returnedOpen) status = c.Status === 'RETURNED' ? nextCommentStatus_('RETURNED', 'revise') : nextCommentStatus_('STUDENT_ONLY', 'revise');
        else status = initialCommentStatus_(f.contact);
      } else if (c && c.Status && c.Status !== 'DRAFT') status = c.Status;
      const fields = {
        Contact: f.contact || '', Rating_Written: f.contact === 'enough' ? f.written : '', Rating_Discussion: f.contact === 'enough' ? f.discussion : '',
        Rating_Literature: f.contact === 'enough' ? f.literature : '', Strength: f.contact === 'enough' ? sanitizeText_(f.strength, 500) : '',
        Next_Step: f.contact === 'enough' ? sanitizeText_(f.nextStep, 500) : '', Followup_Flag: !!f.followup,
        Followup_Note: f.followup ? sanitizeText_(f.followupNote, 1000) : '', Status: status
      };
      if (final) { fields.Submitted_By = a.email; fields.Submitted_At = nowIso_(); }
      if (c) updateRow_(S.COMMENTS, c._row, fields);
      else appendObjects_(S.COMMENTS, [Object.assign({ Feedback_ID: newId_('FB'), Request_ID: r.Request_ID, Quarter: r.Quarter, Student_Email: email,
        Course: enr.Curric + ' ' + enr.Course_Number, Instructor_Names: r.Instructor_Names }, fields)]);
      if (final && f.followup) openFollowup_(r, email);
    });
    if (problems.length) throw new Error('Please ' + problems.join('; ') + '.');
    const reqFields = { Lock_Owner: shared ? a.email : '', Lock_Until: shared ? new Date(Date.now() + C_().CF_LOCK_MINUTES * 60000).toISOString() : '' };
    if (final) {
      if (!String(data.signature || '').trim()) throw new Error('Please type your name to sign.');
      Object.assign(reqFields, { Status: 'SUBMITTED', Signature: sanitizeText_(data.signature, 200, false), Submitted_By: a.email, Submitted_At: nowIso_(),
        Minutes_Bucket: ['under 5', '5 to 15', 'over 15'].indexOf(data.minutes) !== -1 ? data.minutes : '' });
      logEvent_({ action: C_().ACTIONS.CF_SUBMITTED, evaluationId: r.Request_ID, actorEmail: a.email });
    } else if (r.Status === 'SENT') reqFields.Status = 'DRAFT';
    updateRow_(S.REQUESTS, r._row, reqFields);
    return { ok: true, final: !!final };
  } finally {
    lockSvc.releaseLock();
  }
}

/* "Not my course" (build-spec §1.2): the page ends, the instructor is thanked, the administrator is alerted. */
function notMyCourse(token, suggested) {
  const a = loadRequestForInstructor_(token);
  if (a.error) throw new Error(a.error);
  const r = a.request;
  updateRow_(C_().SHEETS.REQUESTS, r._row, { Status: 'NOT_MY_COURSE', Not_Mine_By: a.email, Not_Mine_Suggested: sanitizeText_(suggested, 200, false) });
  sendTemplate_('CF-4', a.email, firstNameFor_(a.email), { course: r.Offering }, r.Request_ID);
  if (C_().ADMIN_EMAIL) {
    sendTemplate_('CF-5', C_().ADMIN_EMAIL, '', { course: r.Offering, section: '', quarter: quarterLabel_(r.Quarter), instructorName: a.email,
      suggested: sanitizeText_(suggested, 200, false), rosterUrl: appUrl_({ view: 'roster' }), dueLong: r.Due_Date ? dateLong_(r.Due_Date) : '' }, r.Request_ID);
  }
  logEvent_({ action: C_().ACTIONS.CF_NOT_MY_COURSE, evaluationId: r.Request_ID, actorEmail: a.email });
  return true;
}

/* The administrator sends a corrected page to the right instructor(s), with the same due date. */
function reissueRequest(requestId, instructorEmails) {
  const actor = assertAdminOrGpc_();
  const S = C_().SHEETS;
  const r = findOne_(S.REQUESTS, 'Request_ID', requestId);
  if (!r || r.Status !== 'NOT_MY_COURSE') throw new Error('Only a page marked "Not my course" can be re-sent.');
  const emails = splitList_(instructorEmails).filter(function(e) { return /^[^@\s]+@uw\.edu$/.test(e); });
  if (!emails.length) throw new Error('Enter at least one @uw.edu address.');
  const t = newToken_();
  const id = newId_('CF');
  appendObjects_(S.REQUESTS, [{ Request_ID: id, Request_Key: r.Request_Key, Quarter: r.Quarter, Offering: r.Offering, Instructor_Names: '',
    Instructor_Emails: emails.join(', '), Status: 'SENT', Secure_Token: t.token, Token_Expiry: r.Token_Expiry || t.expiry, Due_Date: r.Due_Date,
    Reminder_Count: 0, Created_At: nowIso_() }]);
  updateRow_(S.REQUESTS, r._row, { Status: 'REISSUED' });   // the new row carries the same Request_Key
  const n = activeStudentsForRequest_(r).length;
  emails.forEach(function(em) {
    sendTemplate_('CF-1', em, firstNameFor_(em), { course: r.Offering, quarter: quarterLabel_(r.Quarter), n: n, url: appUrl_({ f: t.token }),
      notMineUrl: appUrl_({ f: t.token, nmc: 1 }), dueLong: dateLong_(r.Due_Date) }, id);
  });
  logEvent_({ action: C_().ACTIONS.MANUAL_OVERRIDE, evaluationId: id, details: { reissuedFrom: requestId }, actorEmail: actor });
  return id;
}

/* ---------- Follow-up flags (course-feedback plan §5.3) ---------- */

function openFollowup_(req, studentEmail) {
  const S = C_().SHEETS;
  const c = readTable_(S.COMMENTS).filter(function(x) { return x.Request_ID === req.Request_ID && normEmail_(x.Student_Email) === studentEmail; })[0];
  if (!c) return;
  if (findOne_(S.FOLLOWUPS, 'Feedback_ID', c.Feedback_ID)) return;
  const student = findOne_(S.STUDENTS, 'Email', studentEmail) || { Advisor_Emails: '' };
  appendObjects_(S.FOLLOWUPS, [{ Followup_ID: newId_('FU'), Feedback_ID: c.Feedback_ID, Student_Email: studentEmail, Quarter: req.Quarter,
    Opened_At: todayIso_(), Handled_By: reviewerFor_(student), Status: 'OPEN' }]);
  logEvent_({ action: C_().ACTIONS.FOLLOWUP_OPENED, evaluationId: c.Feedback_ID, actorEmail: 'SYSTEM' });
}

/* ---------- The GPC's quarterly check and release (§6.2) ---------- */

/* Comments the caller may check: the GPC sees every student except their own advisees; the alternate
   sees only those. */
function reviewableStudents_(email) {
  return readTable_(C_().SHEETS.STUDENTS).filter(function(s) { return canReviewStudent_(email, s); }).map(function(s) { return normEmail_(s.Email); });
}

function releasePageData(quarter) {
  const email = activeEmail_();
  const mine = reviewableStudents_(email);
  if (!mine.length && !isGpc_(email) && !isAlternate_(email)) throw new Error('This page is for the GPC.');
  const S = C_().SHEETS;
  const w = quarter ? courseFeedbackWindow_(quarter, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES) : null;
  const comments = readTable_(S.COMMENTS).filter(function(c) { return c.Quarter === quarter && mine.indexOf(normEmail_(c.Student_Email)) !== -1 && c.Status !== 'DRAFT'; });
  const students = {};
  readTable_(S.STUDENTS).forEach(function(s) { students[normEmail_(s.Email)] = s; });
  const followups = readTable_(S.FOLLOWUPS).filter(function(f) { return mine.indexOf(normEmail_(f.Student_Email)) !== -1 && f.Status === 'OPEN'; });
  const today = todayIso_();
  return {
    quarter: quarter, quarterLabel: quarterLabel_(quarter), releaseDate: w ? dateLong_(w.release) : '',
    comments: comments.map(function(c) {
      const s = students[normEmail_(c.Student_Email)] || {};
      return { id: c.Feedback_ID, student: s.Name || c.Student_Email, subfield: s.Subfield || '', course: c.Course, instructors: c.Instructor_Names,
        contact: c.Contact, written: c.Rating_Written, discussion: c.Rating_Discussion, literature: c.Rating_Literature, strength: c.Strength,
        nextStep: c.Next_Step, status: c.Status, returnedReason: c.Returned_Reason, returnUntil: c.Return_Until, released: !!c.Released_At };
    }),
    followups: followups.map(function(f) {
      const t = followupTiming_(String(f.Opened_At).slice(0, 10), today, f.Status, f.Reminder_Sent_At);
      const c = findOne_(S.COMMENTS, 'Feedback_ID', f.Feedback_ID) || {};
      return { id: f.Followup_ID, student: (students[normEmail_(f.Student_Email)] || {}).Name || f.Student_Email, course: c.Course || '',
        note: c.Followup_Note || '', day: t.day, deadline: dateLong_(t.deadline), overdue: t.overdue };
    }),
    records: recordsForReviewer_(email)
  };
}

function loadCommentForReviewer_(feedbackId) {
  const email = activeEmail_();
  const c = findOne_(C_().SHEETS.COMMENTS, 'Feedback_ID', feedbackId);
  if (!c) throw new Error('Comment not found.');
  const s = findOne_(C_().SHEETS.STUDENTS, 'Email', normEmail_(c.Student_Email)) || {};
  if (!canReviewStudent_(email, s)) throw new Error('You cannot review this comment (recusal).');
  return { c: c, email: email };
}

/* The GPC's four-item check passed. */
function checkComment(feedbackId) {
  const x = loadCommentForReviewer_(feedbackId);
  updateRow_(C_().SHEETS.COMMENTS, x.c._row, { Status: nextCommentStatus_(x.c.Status === 'REVISED_AFTER_RELEASE' ? 'REVISED_AFTER_RELEASE' : x.c.Status, 'check') });
  logEvent_({ action: C_().ACTIONS.CF_CHECKED, evaluationId: feedbackId, actorEmail: x.email });
  return true;
}

/* Returns a comment to the instructor with a logged reason; the GPC never edits the words. */
function returnComment(feedbackId, reason, gpcNote) {
  const x = loadCommentForReviewer_(feedbackId);
  if (!String(reason || '').trim()) throw new Error('Give the reason the instructor will see.');
  const S = C_().SHEETS;
  const next = x.c.Status === 'REVISED_AFTER_RELEASE' ? nextCommentStatus_('REVISED_AFTER_RELEASE', 'return') : nextCommentStatus_(x.c.Status, 'return');
  const until = addDays_(todayIso_(), C_().CF_RETURN_DAYS);
  updateRow_(S.COMMENTS, x.c._row, { Status: next, Returned_Reason: sanitizeText_(reason, 1000), Return_Until: until, GPC_Note: sanitizeText_(gpcNote || '', 1000) });
  const r = findOne_(S.REQUESTS, 'Request_ID', x.c.Request_ID);
  splitList_(r.Instructor_Emails).forEach(function(em) {
    sendTemplate_('CF-6', em, firstNameFor_(em), { course: r.Offering, url: appUrl_({ f: r.Secure_Token }), reviseByLong: dateLong_(until) }, x.c.Feedback_ID);
  });
  logEvent_({ action: C_().ACTIONS.CF_RETURNED, evaluationId: feedbackId, details: { reason: reason }, actorEmail: x.email });
  return until;
}

/* Releases the quarter's comments for the students the caller reviews (§6.2 step 3). */
function releaseQuarter(quarter) {
  const email = activeEmail_();
  const mine = reviewableStudents_(email);
  const S = C_().SHEETS;
  const comments = readTable_(S.COMMENTS).filter(function(c) { return c.Quarter === quarter && mine.indexOf(normEmail_(c.Student_Email)) !== -1 && !c.Released_At; });
  const unchecked = comments.filter(function(c) { return c.Status === 'SUBMITTED' || c.Status === 'REVISED'; });
  if (unchecked.length) throw new Error(unchecked.length + ' comment(s) still need your check before release.');
  const now = nowIso_(), notified = {}, advisorCounts = {};
  comments.forEach(function(c) {
    let status = c.Status;
    if (status === 'CHECKED') status = nextCommentStatus_('CHECKED', 'release');
    else if (status === 'RETURNED') status = nextCommentStatus_('RETURNED', 'releaseDay');
    else if (status !== 'NO_CONTACT') return;
    updateRow_(S.COMMENTS, c._row, { Status: status, Released_At: now });
    notified[normEmail_(c.Student_Email)] = true;
  });
  Object.keys(notified).forEach(function(st) {
    const s = findOne_(S.STUDENTS, 'Email', st) || {};
    sendTemplate_('CF-9', st, s.Preferred_First || firstNameFor_(st), { quarter: quarterLabel_(quarter), url: appUrl_({ view: 'student' }) }, quarter);
    splitList_(s.Advisor_Emails).forEach(function(a) { advisorCounts[a] = (advisorCounts[a] || 0) + 1; });
  });
  Object.keys(advisorCounts).forEach(function(a) {
    sendTemplate_('CF-10', a, firstNameFor_(a), { quarter: quarterLabel_(quarter), n: advisorCounts[a], url: appUrl_({ view: 'advisor' }) }, quarter);
  });
  logEvent_({ action: C_().ACTIONS.CF_RELEASED, evaluationId: quarter, details: { students: Object.keys(notified).length }, actorEmail: email });
  return Object.keys(notified).length;
}

/* Records a follow-up conversation. createInterim: the GPC confirms an interim check-in. */
function closeFollowup(followupId, outcome, contactDate, createInterim) {
  const email = activeEmail_();
  const S = C_().SHEETS;
  const f = findOne_(S.FOLLOWUPS, 'Followup_ID', followupId);
  if (!f) throw new Error('Follow-up not found.');
  const s = findOne_(S.STUDENTS, 'Email', normEmail_(f.Student_Email)) || {};
  if (!canReviewStudent_(email, s) && splitList_(s.Advisor_Emails).indexOf(email) === -1) throw new Error('You cannot close this follow-up.');
  const msg = validateFollowupOutcome_(outcome, contactDate);
  if (msg) throw new Error(msg);
  let interimId = '';
  if (outcome === 'Raised as an interim check-in' && createInterim && canReviewStudent_(email, s)) interimId = createInterimReview_(s, '', 3, false, email);
  updateRow_(S.FOLLOWUPS, f._row, { Status: 'CLOSED', Outcome: outcome, Contact_Date: contactDate, Interim_Review_ID: interimId });
  logEvent_({ action: C_().ACTIONS.FOLLOWUP_CLOSED, evaluationId: followupId, details: { outcome: outcome }, actorEmail: email });
  return interimId;
}

/* ---------- Yearly Course Feedback Record (§6) ---------- */

/* The window for the record released in spring `year`: the previous spring and summer, autumn and
   this winter (decision 1). */
function recordWindow_(year) {
  return { label: 'SPR' + (year - 1) + '–WIN' + year, quarters: ['SPR' + (year - 1), 'SUM' + (year - 1), 'AUT' + (year - 1), 'WIN' + year] };
}

function recordFor_(studentEmail, quarters, viewer) {
  const S = C_().SHEETS;
  const reqs = readTable_(S.REQUESTS);
  const offerings = readTable_(S.ENROLLMENTS).filter(function(e) {
    return normEmail_(e.Student_Email) === studentEmail && quarters.indexOf(e.Quarter) !== -1 && !e.Exclusion_Reason;
  }).map(function(e) {
    const req = reqs.filter(function(r) { return r.Request_Key === e.Request_Key && r.Quarter === e.Quarter && ['NOT_MY_COURSE', 'REISSUED'].indexOf(r.Status) === -1; })[0];
    const submitted = !!readTable_(S.COMMENTS).filter(function(c) { return req && c.Request_ID === req.Request_ID && normEmail_(c.Student_Email) === studentEmail && c.Status !== 'DRAFT'; })[0];
    return { course: e.Curric + ' ' + e.Course_Number, quarter: e.Quarter, submitted: submitted };
  });
  const comments = readTable_(S.COMMENTS).filter(function(c) { return normEmail_(c.Student_Email) === studentEmail && quarters.indexOf(c.Quarter) !== -1; })
    .map(function(c) {
      return { course: c.Course, quarter: c.Quarter, instructorNames: String(c.Instructor_Names || '').split(/\s*\/\s*/).filter(Boolean),
        contact: c.Contact, written: c.Rating_Written, discussion: c.Rating_Discussion, literature: c.Rating_Literature, strength: c.Strength,
        nextStep: c.Next_Step, status: c.Status, releasedAt: c.Released_At, gpcNote: c.GPC_Note };
    });
  const followups = readTable_(S.FOLLOWUPS).filter(function(f) { return normEmail_(f.Student_Email) === studentEmail && quarters.indexOf(f.Quarter) !== -1; })
    .map(function(f) { return { quarter: f.Quarter, outcome: f.Outcome, contactDate: f.Contact_Date, status: f.Status }; });
  return { offerings: offerings, comments: comments, followups: followups,
           built: buildFeedbackRecord_(offerings, comments, followups, viewer, '') };
}

/* Assembles a draft record for every student with feedback in the window. */
function buildFeedbackRecords_(year, actor) {
  const S = C_().SHEETS, w = recordWindow_(year);
  const existing = {};
  readTable_(S.RECORDS).forEach(function(r) { if (r.Feedback_Year === w.label) existing[normEmail_(r.Student_Email)] = r; });
  const students = {};
  readTable_(S.ENROLLMENTS).forEach(function(e) { if (w.quarters.indexOf(e.Quarter) !== -1 && !e.Exclusion_Reason) students[normEmail_(e.Student_Email)] = true; });
  const rows = [];
  Object.keys(students).forEach(function(em) {
    const rec = recordFor_(em, w.quarters, 'student').built;
    if (existing[em]) updateRow_(S.RECORDS, existing[em]._row, { Coverage: rec.coverage });
    else rows.push({ Record_ID: newId_('REC'), Student_Email: em, Feedback_Year: w.label, Coverage: rec.coverage });
  });
  appendObjects_(S.RECORDS, rows);
  logEvent_({ action: C_().ACTIONS.MANUAL_OVERRIDE, evaluationId: w.label, details: { records: Object.keys(students).length }, actorEmail: actor || 'SYSTEM' });
  return Object.keys(students).length;
}

function recordsForReviewer_(email) {
  const mine = reviewableStudents_(email);
  const S = C_().SHEETS;
  return readTable_(S.RECORDS).filter(function(r) { return mine.indexOf(normEmail_(r.Student_Email)) !== -1; }).map(function(r) {
    const s = findOne_(S.STUDENTS, 'Email', normEmail_(r.Student_Email)) || {};
    return { id: r.Record_ID, student: s.Name || r.Student_Email, subfield: s.Subfield || '', year: r.Feedback_Year, coverage: r.Coverage,
             synthesis: r.GPC_Synthesis || '', released: !!r.Released_At };
  });
}

/* The GPC's optional 2–4 sentence synthesis, written without AI drafting (§6.1). */
function saveSynthesis(recordId, text) {
  const email = activeEmail_();
  const r = findOne_(C_().SHEETS.RECORDS, 'Record_ID', recordId);
  if (!r) throw new Error('Record not found.');
  const s = findOne_(C_().SHEETS.STUDENTS, 'Email', normEmail_(r.Student_Email)) || {};
  if (!canReviewStudent_(email, s)) throw new Error('You cannot edit this record (recusal).');
  updateRow_(C_().SHEETS.RECORDS, r._row, { GPC_Synthesis: sanitizeText_(text, 1500) });
  return true;
}

/* Releases the year's records the caller reviews; each appears in the student's annual review form. */
function releaseRecords(feedbackYear) {
  const email = activeEmail_();
  const mine = reviewableStudents_(email);
  const S = C_().SHEETS, now = nowIso_();
  let n = 0;
  readTable_(S.RECORDS).forEach(function(r) {
    if (r.Feedback_Year !== feedbackYear || r.Released_At || mine.indexOf(normEmail_(r.Student_Email)) === -1) return;
    updateRow_(S.RECORDS, r._row, { Released_At: now, Released_By: email });
    const s = findOne_(S.STUDENTS, 'Email', normEmail_(r.Student_Email)) || {};
    sendTemplate_('CF-11', normEmail_(r.Student_Email), s.Preferred_First || 'there', { feedbackYear: feedbackYear.replace('–', ' to '), url: appUrl_({ view: 'student' }) }, r.Record_ID);
    n++;
  });
  logEvent_({ action: C_().ACTIONS.RECORD_RELEASED, evaluationId: feedbackYear, details: { records: n }, actorEmail: email });
  return n;
}

/* ---------- Student and advisor views ---------- */

function myCourseFeedback() {
  const email = activeEmail_();
  if (!email) throw new Error('Sign in with your UW Google account.');
  const S = C_().SHEETS;
  const quarters = {};
  readTable_(S.COMMENTS).forEach(function(c) { if (normEmail_(c.Student_Email) === email && c.Released_At) quarters[c.Quarter] = true; });
  const byQuarter = Object.keys(quarters).sort(function(a, b) { return quarterOrder_(b) - quarterOrder_(a); }).map(function(q) {
    return { quarter: quarterLabel_(q), record: recordFor_(email, [q], 'student').built };
  });
  const records = readTable_(S.RECORDS).filter(function(r) { return normEmail_(r.Student_Email) === email && r.Released_At; }).map(function(r) {
    const yr = Number(String(r.Feedback_Year).slice(-4));
    const rec = recordFor_(email, recordWindow_(yr).quarters, 'student').built;
    rec.synthesis = r.GPC_Synthesis || '';
    return { year: r.Feedback_Year, record: rec };
  });
  return { email: email, quarters: byQuarter, records: records };
}

function adviseesCourseFeedback() {
  const email = activeEmail_();
  if (!email) throw new Error('Sign in with your UW Google account.');
  const S = C_().SHEETS;
  const advisees = readTable_(S.STUDENTS).filter(function(s) { return splitList_(s.Advisor_Emails).indexOf(email) !== -1; });
  return advisees.map(function(s) {
    const em = normEmail_(s.Email);
    const qs = {};
    readTable_(S.COMMENTS).forEach(function(c) { if (normEmail_(c.Student_Email) === em && c.Released_At) qs[c.Quarter] = true; });
    return { name: s.Name || em, quarters: Object.keys(qs).sort(function(a, b) { return quarterOrder_(b) - quarterOrder_(a); }).map(function(q) {
      return { quarter: quarterLabel_(q), record: recordFor_(em, [q], 'advisor').built };
    }) };
  }).filter(function(a) { return a.quarters.length; });
}

function coordinatorSummary() {
  const email = activeEmail_();
  const subfields = coordinatorSubfields_(email);
  if (!subfields.length) throw new Error('This page is for subfield coordinators.');
  const year = C_().CYCLE_YEAR, w = recordWindow_(year);
  return readTable_(C_().SHEETS.STUDENTS).filter(function(s) { return subfields.indexOf(s.Subfield) !== -1 && s.Status === 'ACTIVE'; }).map(function(s) {
    const review = readTable_(C_().SHEETS.REVIEWS).filter(function(r) { return normEmail_(r.Student_Email) === normEmail_(s.Email) && Number(r.Cycle) === year && r.Type === 'ANNUAL'; })[0];
    const adv = review ? parseJson_(review.Advisor_Payload) : {};
    return { name: s.Name, subfield: s.Subfield, year: yearInProgram_(s.Entry_Quarter, quarterForDate_(todayIso_())),
             recommendedRating: adv.recommendedRating || '', record: recordFor_(normEmail_(s.Email), w.quarters, 'calibration').built };
  });
}
