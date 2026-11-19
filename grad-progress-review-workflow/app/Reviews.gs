/* ============================================================
   Reviews.gs: the annual review, interim check-ins and MA quarterly check-ins
   (grad-annual-review-plan.md §4–§7; build-spec.md §1.1).
   ============================================================ */

function studentByEmail_(email) { return findOne_(C_().SHEETS.STUDENTS, 'Email', normEmail_(email)); }

function reviewById_(id) { return findOne_(C_().SHEETS.REVIEWS, 'Review_ID', id); }

function createReviewRow_(f) {
  const now = nowIso_();
  const row = Object.assign({ Review_ID: newId_(f.Type === 'ANNUAL' ? 'AR' : 'IN'), Reminder_Count: 0, Created_At: now, Updated_At: now,
                              Stage_Started: todayIso_(), Payload_Version: C_().PAYLOAD_VERSION }, f);
  appendObjects_(C_().SHEETS.REVIEWS, [row]);
  return row;
}

/* Last year's goals and action items, and the MyGrad data, for the student's form (§5.1). */
function prefillStudent_(student) {
  const last = readTable_(C_().SHEETS.REVIEWS).filter(function(r) {
    return normEmail_(r.Student_Email) === normEmail_(student.Email) && r.Type === 'ANNUAL' && r.Status === 'COMPLETED';
  }).sort(function(a, b) { return Number(b.Cycle) - Number(a.Cycle); })[0];
  const lastStudent = last ? parseJson_(last.Student_Payload) : {};
  const lastAdvisor = last ? parseJson_(last.Advisor_Payload) : {};
  return {
    lastGoals: (lastStudent.nextPlan || []).map(function(g) { return { goal: g.goal || g, category: g.category || '', status: '', comment: '' }; }),
    actionItemsProgress: (lastAdvisor.actionItems || []).map(function(a) { return { action: a.action, owner: a.owner, due: a.due, status: '', note: '' }; }),
    coursework: parseJson_(student.Courses_JSON, []),
    mygrad: { candidacyDate: student.Candidacy_Date || '', anth800Credits: student.ANTH800_Credits || 0, hasDocComm: student.Has_Doc_Comm,
              hasMastersComm: student.Has_Masters_Comm, hasReadingComm: student.Has_Reading_Comm, uwDegrees: student.UW_Degrees, gpa: student.GPA }
  };
}

/* ---------- Launches ---------- */

/* One ANNUAL row per active PhD student for the cycle; students on leave get an ON_LEAVE row. */
function launchAnnualCycle_(year, actor) {
  const S = C_().SHEETS, dates = annualCycleDates_(year);
  const have = {};
  readTable_(S.REVIEWS).forEach(function(r) { if (r.Type === 'ANNUAL' && Number(r.Cycle) === year) have[normEmail_(r.Student_Email)] = true; });
  let launched = 0;
  readTable_(S.STUDENTS).forEach(function(s) {
    const email = normEmail_(s.Email);
    if (have[email] || s.Program === 'MA' || s.Status === 'LEFT') return;
    if (s.Status === 'ON_LEAVE') {
      createReviewRow_({ Cycle: year, Type: 'ANNUAL', Program: 'PHD', Student_Email: email, Advisor_Emails: s.Advisor_Emails, Chair_Email: s.Chair_Email, Status: 'ON_LEAVE' });
      return;
    }
    if (!splitList_(s.Advisor_Emails).length) { logWarn_('Reviews.launchAnnualCycle', 'No advisor or substitute reviewer; not launched', { student: email }); return; }
    const t = newToken_();
    const row = createReviewRow_({ Cycle: year, Type: 'ANNUAL', Program: 'PHD', Student_Email: email, Advisor_Emails: s.Advisor_Emails,
      Chair_Email: s.Chair_Email, Status: 'STUDENT_PENDING', Due_Date: dates.studentDue, Secure_Token: t.token, Token_Expiry: t.expiry,
      Student_Payload: jsonCell_({ prefill: prefillStudent_(s) }) });
    sendTemplate_('AR-1', email, s.Preferred_First || firstNameFor_(email), { year: year, url: appUrl_({ t: t.token }), dueLong: dateLong_(dates.studentDue) }, row.Review_ID);
    launched++;
  });
  logEvent_({ action: C_().ACTIONS.LAUNCH, evaluationId: 'ANNUAL ' + year, details: { launched: launched }, actorEmail: actor || 'SYSTEM' });
  return launched;
}

/* MA students: a short check-in at the end of every enrolled quarter, including spring (decision 4).
   It opens on the Monday of finals week and is due with that quarter's course feedback. */
function launchMaCheckins_(quarter, actor) {
  const S = C_().SHEETS, w = courseFeedbackWindow_(quarter, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES);
  const have = {};
  readTable_(S.REVIEWS).forEach(function(r) { if (r.Type === 'INTERIM' && r.Program === 'MA' && r.Cycle === quarter) have[normEmail_(r.Student_Email)] = true; });
  let n = 0;
  readTable_(S.STUDENTS).forEach(function(s) {
    const email = normEmail_(s.Email);
    if (s.Program !== 'MA' || s.Status !== 'ACTIVE' || have[email] || !splitList_(s.Advisor_Emails).length) return;
    const t = newToken_();
    const row = createReviewRow_({ Cycle: quarter, Type: 'INTERIM', Program: 'MA', Student_Email: email, Advisor_Emails: s.Advisor_Emails,
      Chair_Email: s.Chair_Email, Status: 'STUDENT_PENDING', Due_Date: w.due, Secure_Token: t.token, Token_Expiry: t.expiry,
      Student_Payload: jsonCell_({ prefill: prefillStudent_(s) }) });
    sendTemplate_('AR-10', email, s.Preferred_First || firstNameFor_(email), { quarter: quarterLabel_(quarter), url: appUrl_({ t: t.token }), dueLong: dateLong_(w.due), isInterim: false }, row.Review_ID);
    n++;
  });
  logEvent_({ action: C_().ACTIONS.LAUNCH, evaluationId: 'MA ' + quarter, details: { launched: n }, actorEmail: actor || 'SYSTEM' });
  return n;
}

/* An interim check-in (§4.2; build-spec §1.1). A PhD interim has an advisor stage only, unless the
   advisor escalates. An MA interim follows the MA check-in flow and starts with the student; the
   advisor gets AR-13 when the student submits. */
function createInterimReview_(student, parentId, advisorMonths, missingOrLowGpa, actor) {
  const due = interimDueDate_(todayIso_(), advisorMonths, missingOrLowGpa);
  const t = newToken_();
  const email = normEmail_(student.Email);
  const isMa = student.Program === 'MA';
  const firstStage = isMa ? 'STUDENT_PENDING' : 'ADVISOR_PENDING';
  const row = createReviewRow_({ Cycle: quarterForDate_(due) || '', Type: 'INTERIM', Program: isMa ? 'MA' : 'PHD', Student_Email: email,
    Advisor_Emails: student.Advisor_Emails, Chair_Email: student.Chair_Email, Status: firstStage, Due_Date: due, Interim_Due: due,
    Secure_Token: t.token, Token_Expiry: new Date(isoToUtc_(due) + C_().TOKEN_TTL_DAYS * 86400000).toISOString(), Parent_Review_ID: parentId || '' });
  const quarterText = quarterLabel_(quarterForDate_(due) || '');
  const url = appUrl_({ t: t.token });
  if (isMa) {
    sendTemplate_('AR-10', email, student.Preferred_First || 'there', { quarter: quarterText, url: url, dueLong: dateLong_(due), isInterim: true }, row.Review_ID);
  } else {
    splitList_(student.Advisor_Emails).forEach(function(a) {
      sendTemplate_('AR-13', a, firstNameFor_(a), { studentName: student.Name, quarter: quarterText, url: url, dueLong: dateLong_(due), isInterim: true }, row.Review_ID);
    });
  }
  logEvent_({ action: C_().ACTIONS.INTERIM_CREATED, evaluationId: row.Review_ID, details: { parent: parentId, due: due }, actorEmail: actor || 'SYSTEM' });
  return row.Review_ID;
}

/* ---------- Loading and saving a stage ---------- */

/* The advisor may also edit while a narrative return is open (§5.3). */
function reviewAccess_(review) {
  if (review.Status === 'PROGRAM_PENDING' && review.Advisor_Return_Until && daysBetween_(todayIso_(), review.Advisor_Return_Until) >= 0) {
    const email = activeEmail_();
    if (email && splitList_(review.Advisor_Emails).indexOf(email) !== -1) return { ok: true, email: email, stage: 'advisor', returned: true };
  }
  return checkReviewAccess_(review);
}

function reviewByToken_(token) {
  if (!isTokenShape_(token)) return { error: 'This link is not valid.' };
  const r = findOne_(C_().SHEETS.REVIEWS, 'Secure_Token', token);
  if (!r) return { error: 'This link is not valid or has been replaced by a newer one.' };
  if (isExpired_(r.Token_Expiry)) return { error: 'This link has expired. Reply to the email and we will send a new one.' };
  const access = reviewAccess_(r);
  if (!access.ok) return { error: access.error };
  return { review: r, access: access };
}

/* Everything Index.html shows for the current stage. */
function loadReview(token) {
  const x = reviewByToken_(token);
  if (x.error) return { error: x.error };
  const r = x.review, stage = x.access.stage;
  const student = studentByEmail_(r.Student_Email) || {};
  const out = {
    reviewId: r.Review_ID, type: r.Type, program: r.Program, cycle: r.Cycle, stage: stage, status: r.Status, due: r.Due_Date ? dateLong_(r.Due_Date) : '',
    studentName: student.Name || r.Student_Email, coAdvised: splitList_(r.Advisor_Emails).length > 1, returned: !!x.access.returned,
    levels: CF_LEVELS_, ratings: REVIEW_RATINGS_,
    /* Flags are for the advisor and the GPC (annual review plan §6), never the student. */
    flags: stage === 'advisor' ? computeFlags_(student, r) : []
  };
  const sp = parseJson_(r.Student_Payload), ap = parseJson_(r.Advisor_Payload), pp = parseJson_(r.Program_Payload), dp = parseJson_(r.Development_Payload);
  if (stage === 'student') {
    out.draft = stageDraft_(r, stage, sp, dp); out.prefill = sp.prefill || {}; out.development = dp;
    /* What the first box of the report asks the student to check (annual review plan §5.1). */
    out.onFile = { program: student.Program === 'MA' ? 'MA (Archaeological Heritage)' : 'PhD', subfield: student.Subfield || '',
                   advisors: splitList_(student.Advisor_Emails), chair: student.Chair_Email || '', gsr: student.GSR_Email || '',
                   entryQuarter: quarterLabel_(student.Entry_Quarter || ''), leaveEnds: student.Leave_Ends ? quarterLabel_(student.Leave_Ends) : '' };
  }
  if (stage === 'advisor') {
    out.studentReport = sp; out.development = dp; out.draft = stageDraft_(r, stage, ap, dp);
    out.returnNote = x.access.returned ? (pp.returnReason || '') : '';
    out.cvUrl = cvUrlFor_(r);
  }
  if (stage === 'ack') {
    out.studentReport = sp; out.advisor = ap; out.advisingChallenges = advisingChallengesFor_(r.Review_ID);
    out.finalRating = pp.finalRating || ''; out.letterText = pp.letterText || ''; out.draft = parseJson_(r.Response_Payload);
  }
  if (r.Type === 'ANNUAL' && (stage === 'student' || stage === 'advisor' || stage === 'ack')) {
    out.courseFeedback = courseFeedbackForReview_(r, stage === 'advisor' ? 'advisor' : 'student');
  }
  return out;
}

/* What this role saved: its own payload, plus its fields kept in Development_Payload and in the
   Confidential spreadsheet. Only fields this stage may write are added, so an advisor never gets
   the student's GPC-only note. */
function stageDraft_(review, stage, mainPayload, developmentPayload) {
  const draft = Object.assign({}, mainPayload);
  const ownFields = STAGE_FIELDS_[stage] || [];
  ownFields.forEach(function(k) {
    if (DEVELOPMENT_FIELDS_.indexOf(k) !== -1 && developmentPayload[k] !== undefined) draft[k] = developmentPayload[k];
  });
  const ownConfidential = ownFields.filter(function(k) { return CONFIDENTIAL_STAGE_FIELDS_.indexOf(k) !== -1; });
  Object.assign(draft, confidentialFieldsFor_(review.Review_ID, ownConfidential));
  return draft;
}

/* A link to the student's uploaded CV, shared with the advisors at upload (WebApp.gs). */
function cvUrlFor_(review) {
  if (!review.CV_File_ID) return '';
  try {
    return DriveApp.getFileById(review.CV_File_ID).getUrl();
  } catch (err) {
    logWarn_('Reviews.cvUrlFor', 'CV file not found', { reviewId: review.Review_ID });
    return '';
  }
}

/* The released Course Feedback Record for this cycle, if any. */
function courseFeedbackForReview_(review, viewer) {
  const label = recordWindow_(Number(review.Cycle)).label;
  const rec = readTable_(C_().SHEETS.RECORDS).filter(function(x) { return normEmail_(x.Student_Email) === normEmail_(review.Student_Email) && x.Feedback_Year === label && x.Released_At; })[0];
  if (!rec) return null;
  const built = recordFor_(normEmail_(review.Student_Email), recordWindow_(Number(review.Cycle)).quarters, viewer).built;
  built.synthesis = rec.GPC_Synthesis || '';
  return built;
}

/* Required content for each stage. Returns '' or a message. */
function validateReviewStage_(stage, type, program, f) {
  const filled = function(v) { return v !== undefined && v !== null && String(v).trim() !== ''; };
  const missing = [];
  if (stage === 'student') {
    if (type === 'ANNUAL') {
      if (!filled(f.research)) missing.push('research progress');
      if (!Array.isArray(f.nextPlan) || !f.nextPlan.length) missing.push("next year's plan");
    } else if (!filled(f.research)) missing.push('how the quarter went');
    if (!filled(f.signatureName)) missing.push('your typed name');
  } else if (stage === 'advisor') {
    if (type === 'ANNUAL') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.meetingDate || ''))) missing.push('the date you met the student');
      if (!filled(f.accomplishments)) missing.push('notable accomplishments');
      if (REVIEW_RATINGS_.indexOf(f.recommendedRating) === -1) missing.push('a recommended rating');
      if (f.recommendedRating && f.recommendedRating !== 'Satisfactory') {
        const c = f.concerns || {};
        ['benchmark', 'deadline', 'support', 'consequence'].forEach(function(k) { if (!filled(c[k])) missing.push('the ' + k + ' (required for a concern rating)'); });
        if ([3, 6, '3', '6'].indexOf(f.checkinMonths) === -1) missing.push('a check-in in 3 or 6 months');
      }
    } else if (['resolved', 'continuing', 'escalate'].indexOf(f.verdict) === -1) missing.push('your verdict');
    if (!filled(f.signatureName)) missing.push('your typed name');
  } else if (stage === 'ack') {
    if (f.acknowledged !== true) missing.push('confirmation that you have read the letter');
    if (!filled(f.signatureName)) missing.push('your typed name');
  }
  return missing.length ? 'Please complete: ' + missing.join('; ') + '.' : '';
}

/* Saves a draft (final=false) or submits the stage (final=true). */
function saveReviewStage(token, payload, final) {
  const x = reviewByToken_(token);
  if (x.error) throw new Error(x.error);
  /* Drafts and submits are counted separately, so autosaves can never use up Submit. */
  const bucket = final ? 'review_submit' : 'review_save';
  const rl = checkRateLimit_(x.access.email, bucket, 120);
  if (!rl.allowed) throw new Error('Too many saves in an hour. Please wait a few minutes.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const S = C_().SHEETS;
    /* Read again now that we hold the lock: another request may have saved or submitted meanwhile. */
    invalidateTable_(S.REVIEWS);
    const r = reviewById_(x.review.Review_ID);
    if (!r || r.Secure_Token !== token || r.Status !== x.review.Status) {
      throw new Error('This review has moved on since you opened it (it may have been submitted by someone else). Reload the page to see where it is.');
    }
    const stage = x.access.stage;
    const f = pickStageFields_(stage, payload);
    const target = { student: 'Student_Payload', advisor: 'Advisor_Payload', ack: 'Response_Payload' }[stage];
    const current = parseJson_(r[target]);
    const dev = parseJson_(r.Development_Payload);
    const main = {};
    Object.keys(f).forEach(function(k) {
      if (CONFIDENTIAL_STAGE_FIELDS_.indexOf(k) !== -1) writeConfidential_(r.Review_ID, stage, k, f[k]);
      else if (DEVELOPMENT_FIELDS_.indexOf(k) !== -1) dev[k] = f[k];
      else main[k] = f[k];
    });
    const merged = Object.assign({}, current, main);
    const updates = { Updated_At: nowIso_() };
    updates[target] = jsonCell_(merged);
    updates.Development_Payload = jsonCell_(dev);
    if (!final) { updateRow_(S.REVIEWS, r._row, updates); return { ok: true, final: false }; }

    const msg = validateReviewStage_(stage, r.Type, r.Program, merged);
    if (msg) throw new Error(msg);
    const student = studentByEmail_(r.Student_Email) || {};
    if (x.access.returned) {
      updates.Advisor_Return_Until = '';
      updateRow_(S.REVIEWS, r._row, updates);
      logEvent_({ action: C_().ACTIONS.STAGE_SUBMIT, evaluationId: r.Review_ID, details: { stage: 'advisor (revision)' }, actorEmail: x.access.email });
      return { ok: true, final: true, next: 'PROGRAM_PENDING' };
    }
    const onTail = r.Type === 'INTERIM' && REVIEW_FLOWS_.ESCALATED_TAIL.indexOf(r.Status) !== -1;
    const next = nextReviewStatus_(r.Type, r.Program, r.Status, { escalateToProgram: stage === 'advisor' && merged.verdict === 'escalate', onProgramTail: onTail });
    const t = newToken_();
    Object.assign(updates, { Status: next, Secure_Token: t.token, Token_Expiry: t.expiry, Reminder_Count: 0, Last_Reminder: '', Stage_Started: todayIso_() });
    if (next === 'ADVISOR_PENDING') {
      updates.Due_Date = r.Type === 'ANNUAL' ? annualCycleDates_(Number(r.Cycle)).advisorDue : r.Due_Date;
      notifyAdvisorStage_(r, student, t.token, updates.Due_Date);
    }
    if (next === 'PROGRAM_PENDING') updates.Due_Date = r.Type === 'ANNUAL' ? annualCycleDates_(Number(r.Cycle)).lettersRelease : addDays_(todayIso_(), 14);
    updateRow_(S.REVIEWS, r._row, updates);
    logEvent_({ action: C_().ACTIONS.STAGE_SUBMIT, evaluationId: r.Review_ID, oldStatus: r.Status, newStatus: next, details: { stage: stage }, actorEmail: x.access.email });
    if (next === 'PDF_GENERATING') finishReview_(r.Review_ID);
    return { ok: true, final: true, next: next };
  } finally {
    lock.releaseLock();
  }
}

/* The advisor stage opens: AR-3 (annual) or AR-13 (check-in) to every advisor, with the new link. */
function notifyAdvisorStage_(r, student, token, dueIso) {
  const advisors = splitList_(r.Advisor_Emails);
  advisors.forEach(function(a) {
    if (r.Type === 'ANNUAL') {
      sendTemplate_('AR-3', a, firstNameFor_(a), { studentName: student.Name, studentFirstName: student.Preferred_First || student.Name,
        url: appUrl_({ t: token }), dueLong: dateLong_(dueIso), coAdvised: advisors.length > 1 }, r.Review_ID);
    } else {
      sendTemplate_('AR-13', a, firstNameFor_(a), { studentName: student.Name, quarter: quarterLabel_(r.Cycle), url: appUrl_({ t: token }),
        dueLong: dateLong_(dueIso), isInterim: r.Program !== 'MA' }, r.Review_ID);
    }
  });
}

/* After acknowledgement: build and share the PDF, complete the review, send AR-8 and the survey (AR-12).
   It does nothing unless the review is still PDF_GENERATING, so a retry never builds a second PDF.
   opts.fromRetry: called by the dead-letter queue. opts.noEnqueue: a failure is only logged (the
   pending-PDF sweep in Health.gs tries again on its next run). */
function finishReview_(reviewId, opts) {
  opts = opts || {};
  invalidateTable_(C_().SHEETS.REVIEWS);
  const r = reviewById_(reviewId);
  if (!r || r.Status !== 'PDF_GENERATING') return;
  const student = studentByEmail_(r.Student_Email) || {};
  const enqueue = !opts.fromRetry && !opts.noEnqueue;
  try {
    const pdf = generateReviewPdf_(reviewId, { enqueue: enqueue });
    if (!pdf) return;
    updateRow_(C_().SHEETS.REVIEWS, r._row, { Status: 'COMPLETED', Final_PDF_ID: pdf.id, Updated_At: nowIso_() });
    const people = [normEmail_(r.Student_Email)].concat(splitList_(r.Advisor_Emails));
    if (r.Chair_Email && people.indexOf(normEmail_(r.Chair_Email)) === -1) people.push(normEmail_(r.Chair_Email));
    people.forEach(function(p) {
      const isStudent = p === normEmail_(r.Student_Email);
      sendTemplate_('AR-8', p, isStudent ? (student.Preferred_First || 'there') : firstNameFor_(p), { year: r.Cycle, isStudent: isStudent, studentName: student.Name, pdfUrl: pdf.url }, reviewId);
      if (C_().SURVEY_URL && (isStudent || splitList_(r.Advisor_Emails).indexOf(p) !== -1)) {
        sendTemplate_('AR-12', p, isStudent ? (student.Preferred_First || 'there') : firstNameFor_(p), { url: C_().SURVEY_URL }, reviewId);
      }
    });
  } catch (err) {
    logError_('Reviews.finishReview', 'PDF or completion failed', { reviewId: reviewId, error: err.message });
    if (opts.fromRetry) throw err;   // the dead-letter queue counts the failed attempt
  }
}

/* ---------- Flags (§6) ---------- */

function computeFlags_(student, review) {
  const flags = [];
  const year = yearInProgram_(student.Entry_Quarter, quarterForDate_(todayIso_()));
  const program = student.Program === 'MA' ? 'MA' : 'PHD';
  if (C_().EXPECTED_TTD_YEARS && year && year > C_().EXPECTED_TTD_YEARS && program === 'PHD') flags.push({ code: 'pastExpected', text: 'Past the expected time to degree: a plan to completion is required (§4.6).' });
  if (year && year >= C_().GS_LIMIT_FLAG_FROM_YEAR[program]) flags.push({ code: 'nearLimit', text: 'Year ' + year + ' of a ' + C_().GS_LIMIT_YEARS[program] + '-year Graduate School limit. Policy 1.1: students nearing or past the limit "should be placed on Academic Alert". Record a decision.', needsDecision: true });
  if (!student.Chair_Email && program === 'PHD' && year >= 2) flags.push({ code: 'noChair', text: 'No committee Chair on record (Policy 4.2.4).' });
  if (student.GPA !== '' && student.GPA !== undefined && Number(student.GPA) > 0 && Number(student.GPA) < 3.0) flags.push({ code: 'lowGpa', text: 'Cumulative GPA below 3.0 (MyGrad uses the Graduate School definition; checked 18 Nov 2026).' });
  const sp = parseJson_(review.Student_Payload);
  if (sp.actualMeetings !== undefined && sp.actualMeetings !== '' && Number(sp.actualMeetings) === 0) flags.push({ code: 'noMeeting', text: 'No meeting with the advisor this year.' });
  const prior = readTable_(C_().SHEETS.REVIEWS).filter(function(r) {
    return normEmail_(r.Student_Email) === normEmail_(student.Email) && r.Type === 'ANNUAL' && r.Status === 'COMPLETED';
  }).sort(function(a, b) { return Number(b.Cycle) - Number(a.Cycle); }).slice(0, 2);
  if (prior.length === 2 && prior.every(function(p) { return parseJson_(p.Program_Payload).finalRating === 'Satisfactory with concerns'; })) {
    flags.push({ code: 'thirdConcern', text: 'A third consecutive "with concerns" rating would follow two in a row.' });
  }
  return flags;
}

/* ---------- Program stage (GPC or alternate) ---------- */

function programViewData(subfield) {
  const email = activeEmail_();
  const year = C_().CYCLE_YEAR;
  const S = C_().SHEETS;
  const students = {};
  readTable_(S.STUDENTS).forEach(function(s) { students[normEmail_(s.Email)] = s; });
  const rows = readTable_(S.REVIEWS).filter(function(r) {
    const s = students[normEmail_(r.Student_Email)];
    return s && canReviewStudent_(email, s) && (!subfield || s.Subfield === subfield) &&
      ((r.Type === 'ANNUAL' && Number(r.Cycle) === year) || (r.Type === 'INTERIM' && ['PROGRAM_PENDING', 'ESCALATED', 'ADVISOR_PENDING', 'STUDENT_PENDING'].indexOf(r.Status) !== -1));
  });
  if (!rows.length && !isGpc_(email) && !isAlternate_(email)) throw new Error('This page is for the GPC.');
  return {
    year: year,
    subfields: Object.keys(C_().SUBFIELD_COORDINATORS || {}),
    reviews: rows.map(function(r) {
      const s = students[normEmail_(r.Student_Email)];
      const ap = parseJson_(r.Advisor_Payload), pp = parseJson_(r.Program_Payload);
      return {
        reviewId: r.Review_ID, type: r.Type, program: r.Program, student: s.Name || r.Student_Email, subfield: s.Subfield || '',
        year: yearInProgram_(s.Entry_Quarter, quarterForDate_(todayIso_())), status: r.Status, escalatedFrom: r.Escalated_From || '',
        due: r.Due_Date || '', recommendedRating: ap.recommendedRating || '', accomplishments: ap.accomplishments || '',
        developmentAreas: ap.developmentAreas || [], concerns: ap.concerns || {}, letterParagraph: ap.letterParagraph || '',
        finalRating: pp.finalRating || '', overrideReason: pp.overrideReason || '', letterText: pp.letterText || defaultLetter_(s, ap), statusAction: pp.statusAction || 'none',
        alertQuarter: pp.alertQuarter || defaultAlertQuarter_(year, C_().SUMMER_REGISTRATION_REQUIRED),
        flags: computeFlags_(s, r), timeLimitDecision: pp.timeLimitDecision || '', returnUntil: r.Advisor_Return_Until || '',
        gpcOnlyPresent: hasConfidential_(r.Review_ID),
        courseFeedback: r.Type === 'ANNUAL' ? recordFor_(normEmail_(r.Student_Email), recordWindow_(year).quarters, 'calibration').built : null
      };
    })
  };
}

/* A starting letter (§7), which the GPC edits. */
function defaultLetter_(s, ap) {
  const lines = ['Dear ' + (s.Preferred_First || s.Name || '') + ','];
  if (ap.accomplishments) lines.push('Recognition of your accomplishments this year: ' + ap.accomplishments);
  if (ap.letterParagraph) lines.push(ap.letterParagraph);
  if (ap.actionItems && ap.actionItems.length) lines.push('Action items: ' + ap.actionItems.map(function(a) { return a.action + ' (' + a.owner + ', by ' + a.due + ')'; }).join('; '));
  if (ap.recommendedRating && ap.recommendedRating !== 'Satisfactory' && ap.concerns) {
    lines.push('Benchmark: ' + (ap.concerns.benchmark || '') + '. Deadline: ' + (ap.concerns.deadline || '') + '. Support: ' + (ap.concerns.support || '') +
      '. Consequence if not met: ' + (ap.concerns.consequence || '') + '.');
  }
  lines.push('Rights and resources: you may respond in writing; informal resolution with the GPC or the Office of the Ombud, then the College of Arts & Sciences grievance procedure (Policy 3.8). Graduate Student Affairs, the Counseling Center, Disability Resources for Students and the Husky HelpLine are available to you.');
  return lines.join('\n\n');
}

function reviewForReviewer_(reviewId) {
  const email = activeEmail_();
  const r = reviewById_(reviewId);
  if (!r) throw new Error('Review not found.');
  const s = studentByEmail_(r.Student_Email) || {};
  if (!canReviewStudent_(email, s)) throw new Error('You cannot open this review (recusal).');
  return { r: r, s: s, email: email };
}

function saveProgramStage(reviewId, payload) {
  const x = reviewForReviewer_(reviewId);
  const f = pickStageFields_('program', payload);
  const pp = parseJson_(x.r.Program_Payload);
  const action = f.statusAction !== undefined ? f.statusAction : pp.statusAction;
  const alertQuarter = f.alertQuarter !== undefined ? f.alertQuarter : pp.alertQuarter;
  if ((action === 'Alert' || action === 'Final Alert') && alertQuarter && !isKnownQuarter_(alertQuarter)) {
    throw new Error('The Alert quarter "' + alertQuarter + '" is not a quarter with dates in CoreDates.gs. Use a code like AUT2027 or SUM2027 (later years need adding to the calendar).');
  }
  Object.keys(f).forEach(function(k) {
    if (k === 'calibrationNotes') writeConfidential_(reviewId, 'program', k, f[k]);
    else pp[k] = f[k];
  });
  updateRow_(C_().SHEETS.REVIEWS, x.r._row, { Program_Payload: jsonCell_(pp), Updated_At: nowIso_() });
  return true;
}

/* True for a quarter code with dates in CoreDates.gs, such as AUT2027. */
function isKnownQuarter_(code) {
  try {
    quarterDates_(String(code));
    return true;
  } catch (err) {
    return false;
  }
}

/* Sends an advisor passage back for revision; the advisor's fields reopen for 5 days (§5.3). */
function returnToAdvisor(reviewId, reason) {
  const x = reviewForReviewer_(reviewId);
  if (x.r.Status !== 'PROGRAM_PENDING') throw new Error('Only a review at the program stage can be returned.');
  if (!String(reason || '').trim()) throw new Error('Give the reason the advisor will see.');
  const until = addDays_(todayIso_(), C_().ADVISOR_RETURN_DAYS);
  const t = newToken_();
  const pp = parseJson_(x.r.Program_Payload);
  pp.returnReason = sanitizeText_(reason, 1000);
  updateRow_(C_().SHEETS.REVIEWS, x.r._row, { Advisor_Return_Until: until, Secure_Token: t.token, Token_Expiry: t.expiry, Program_Payload: jsonCell_(pp), Updated_At: nowIso_() });
  splitList_(x.r.Advisor_Emails).forEach(function(a) {
    sendTemplate_('AR-6', a, firstNameFor_(a), { studentName: x.s.Name, url: appUrl_({ t: t.token }), returnUntilLong: dateLong_(until) }, reviewId);
  });
  logEvent_({ action: C_().ACTIONS.ADVISOR_RETURNED, evaluationId: reviewId, details: { reason: reason, until: until }, actorEmail: x.email });
  return until;
}

/* Releases the letter: the GPC confirms the narrative check, the rating and the letter text;
   a nearing-time-limit flag needs a recorded decision (§6). */
function releaseLetter(reviewId, narrativeChecked) {
  /* A double click must not release twice (two AR-7s, two interim reviews). */
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    invalidateTable_(C_().SHEETS.REVIEWS);
    return releaseLetterLocked_(reviewId, narrativeChecked);
  } finally {
    lock.releaseLock();
  }
}

function releaseLetterLocked_(reviewId, narrativeChecked) {
  const x = reviewForReviewer_(reviewId);
  const r = x.r;
  if (r.Status !== 'PROGRAM_PENDING') throw new Error('This review is not at the program stage.');
  if (r.Advisor_Return_Until && daysBetween_(todayIso_(), r.Advisor_Return_Until) >= 0) throw new Error('A passage is back with the advisor until ' + dateLong_(r.Advisor_Return_Until) + '.');
  if (narrativeChecked !== true) throw new Error('Confirm the five-item check of the advisor\'s narrative and the letter first.');
  const pp = parseJson_(r.Program_Payload);
  if (REVIEW_RATINGS_.indexOf(pp.finalRating) === -1) throw new Error('Set the final rating.');
  if (!String(pp.letterText || '').trim()) throw new Error('Write or edit the letter.');
  const ap = parseJson_(r.Advisor_Payload);
  if (ap.recommendedRating && pp.finalRating !== ap.recommendedRating && !String(pp.overrideReason || '').trim()) {
    throw new Error('The final rating differs from the advisor\'s recommendation; add the reason in "Reason for a different rating".');
  }
  if (computeFlags_(x.s, r).some(function(fl) { return fl.needsDecision; }) && !String(pp.timeLimitDecision || '').trim()) {
    throw new Error('Record a decision for the time-limit flag (Alert, extension, or why neither applies).');
  }
  const t = newToken_();
  const ack = addDays_(todayIso_(), 14);
  updateRow_(C_().SHEETS.REVIEWS, r._row, { Status: 'STUDENT_ACK_PENDING', Secure_Token: t.token, Token_Expiry: t.expiry, Due_Date: ack, Reminder_Count: 0,
    Stage_Started: todayIso_(), Alert_Quarter: pp.statusAction === 'Alert' || pp.statusAction === 'Final Alert' ? (pp.alertQuarter || defaultAlertQuarter_(Number(r.Cycle) || C_().CYCLE_YEAR, false)) : '', Updated_At: nowIso_() });
  sendTemplate_('AR-7', normEmail_(r.Student_Email), x.s.Preferred_First || 'there', { url: appUrl_({ t: t.token }), ackDueLong: dateLong_(ack) }, reviewId);
  if (pp.finalRating !== 'Satisfactory' && r.Type === 'ANNUAL') {
    const missing = (ap.milestoneDeterminations || []).some(function(m) { return m.result === 'not satisfied' || m.result === 'not yet satisfied'; }) ||
      (Number(x.s.GPA) > 0 && Number(x.s.GPA) < 3.0);
    createInterimReview_(x.s, reviewId, ap.checkinMonths, missing, x.email);
  }
  if (pp.statusAction && pp.statusAction !== 'none') logEvent_({ action: C_().ACTIONS.STATUS_ACTION_RECORDED, evaluationId: reviewId, details: { action: pp.statusAction }, actorEmail: x.email });
  logEvent_({ action: C_().ACTIONS.STAGE_SUBMIT, evaluationId: reviewId, oldStatus: 'PROGRAM_PENDING', newStatus: 'STUDENT_ACK_PENDING', actorEmail: x.email });
  return true;
}

/* The GPC's three ways out of ESCALATED (build-spec §1.1). */
function resolveEscalationAction(reviewId, action, reason, newDueIso) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    invalidateTable_(C_().SHEETS.REVIEWS);
    return resolveEscalationLocked_(reviewId, action, reason, newDueIso);
  } finally {
    lock.releaseLock();
  }
}

/* The planned due date if it is still ahead, otherwise two weeks from today. */
function freshDue_(plannedIso) {
  const today = todayIso_();
  const planned = String(plannedIso || '').slice(0, 10);
  if (planned && daysBetween_(today, planned) > 0) return planned;
  return addDays_(today, 14);
}

function resolveEscalationLocked_(reviewId, action, reason, newDueIso) {
  const x = reviewForReviewer_(reviewId);
  const r = x.r;
  const upd = resolveEscalation_({ status: r.Status, escalatedFrom: r.Escalated_From, type: r.Type, program: r.Program,
    onProgramTail: r.Type === 'INTERIM' && REVIEW_FLOWS_.ESCALATED_TAIL.indexOf(r.Escalated_From) !== -1 }, action, { reason: reason, newDueIso: newDueIso });
  const fields = { Status: upd.status, Escalated_From: '', Last_Reminder: '', Updated_At: nowIso_() };
  if (upd.dueDate) fields.Due_Date = upd.dueDate;
  if (upd.reminderCount !== undefined) fields.Reminder_Count = upd.reminderCount;
  if (upd.skippedStage) fields.Skipped_Stage = upd.skippedStage;
  /* Skip: the next stage gets the due date a normal submit would give it, moved forward if already past. */
  if (action === 'skip' && upd.status === 'ADVISOR_PENDING') {
    fields.Due_Date = freshDue_(r.Type === 'ANNUAL' ? annualCycleDates_(Number(r.Cycle)).advisorDue : r.Due_Date);
  }
  if (action === 'skip' && upd.status === 'PROGRAM_PENDING') {
    fields.Due_Date = r.Type === 'ANNUAL' ? annualCycleDates_(Number(r.Cycle)).lettersRelease : addDays_(todayIso_(), 14);
  }
  if (action === 'skip' && upd.status === 'STUDENT_ACK_PENDING') fields.Due_Date = addDays_(todayIso_(), 14);
  const t = newToken_();
  if (upd.status !== 'EXEMPT') { fields.Secure_Token = t.token; fields.Token_Expiry = t.expiry; fields.Stage_Started = todayIso_(); }
  updateRow_(C_().SHEETS.REVIEWS, r._row, fields);
  logEvent_({ action: C_().ACTIONS.ESCALATION_RESOLVED, evaluationId: reviewId, oldStatus: 'ESCALATED', newStatus: upd.status, details: { action: action, reason: reason }, actorEmail: x.email });
  notifyAfterEscalation_(r, x.s, action, upd.status, t.token, fields.Due_Date || r.Due_Date);
  if (upd.status === 'PDF_GENERATING') finishReview_(reviewId);
  return upd.status;
}

/* The old link stops working, so whoever acts next gets the new one: the reminder emails
   (as Automation.gs sends them), for both Extend and Skip. */
function notifyAfterEscalation_(r, student, action, status, token, dueIso) {
  const url = appUrl_({ t: token });
  const due = String(dueIso || '').slice(0, 10);
  const studentEmail = normEmail_(r.Student_Email);
  const studentFirst = student.Preferred_First || 'there';
  if (status === 'STUDENT_PENDING') {
    if (r.Type === 'ANNUAL') sendTemplate_('AR-2', studentEmail, studentFirst, { url: url, dueLong: dateLong_(due), dueShort: dateShort_(due) }, r.Review_ID);
    else sendTemplate_('AR-10', studentEmail, studentFirst, { quarter: quarterLabel_(r.Cycle), url: url, dueLong: dateLong_(due), isInterim: false }, r.Review_ID);
  }
  /* Skip and Extend both send AR-4 (annual) or AR-13 (check-in): AR-3 would say the student has finished, which is not true after a skip. */
  if (status === 'ADVISOR_PENDING') {
    splitList_(r.Advisor_Emails).forEach(function(a) {
      if (r.Type === 'ANNUAL') sendTemplate_('AR-4', a, firstNameFor_(a), { studentName: student.Name, url: url, dueLong: dateLong_(due), dueShort: dateShort_(due) }, r.Review_ID);
      else sendTemplate_('AR-13', a, firstNameFor_(a), { studentName: student.Name, quarter: quarterLabel_(r.Cycle), url: url, dueLong: dateLong_(due), isInterim: r.Program !== 'MA' }, r.Review_ID);
    });
  }
  if (status === 'STUDENT_ACK_PENDING') sendTemplate_('AR-7', studentEmail, studentFirst, { url: url, ackDueLong: dateLong_(due) }, r.Review_ID);
}

/* GPC-only notes for the reviewer (logged). */
function gpcOnlyNotes(reviewId) {
  const x = reviewForReviewer_(reviewId);
  return readConfidentialForReviewer_(x.r, x.s, x.email);
}

/* The Alert tracker: recommendations and their deadlines (§4.4, Policy 3.7.3). */
function alertTracker() {
  const email = activeEmail_();
  return readTable_(C_().SHEETS.REVIEWS).filter(function(r) {
    const s = studentByEmail_(r.Student_Email) || {};
    return r.Alert_Quarter && canReviewStudent_(email, s);
  }).map(function(r) {
    const out = { reviewId: r.Review_ID, student: (studentByEmail_(r.Student_Email) || {}).Name, quarter: quarterLabel_(r.Alert_Quarter),
                  due: '', petitionUntil: '', sent: r.Alert_Sent_Date || '' };
    try {
      const d = alertDeadline_(r.Alert_Quarter);
      out.due = dateLong_(d.due);
      out.petitionUntil = dateLong_(d.petitionUntil);
    } catch (err) {
      out.due = 'Not a known quarter: check the Alert quarter';
    }
    return out;
  });
}

function recordAlertSent(reviewId, dateIso) {
  const x = reviewForReviewer_(reviewId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateIso))) throw new Error('Enter the date sent.');
  updateRow_(C_().SHEETS.REVIEWS, x.r._row, { Alert_Sent_Date: dateIso });
  return true;
}
