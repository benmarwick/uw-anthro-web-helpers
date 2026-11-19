/* ============================================================
   Automation.gs: the daily trigger. Reminders (at most two, five days apart, then escalation),
   course feedback reminders and closing, follow-up alerts, MA check-in launches, the Alert-deadline
   reminder and the calibration notice. Dates come from CoreDates.gs.
   ============================================================ */

function dailyRun(e) {
  assertTriggerOrAdmin_(e, 'dailyRun');
  const today = todayIso_();
  [runReviewReminders_, runCourseFeedbackSchedule_, runFollowups_, runMaLaunch_, runAlertReminders_, runCalibrationNotice_].forEach(function(fn) {
    try { fn(today); } catch (err) { logError_('Automation.dailyRun', fn.name + ' failed', { error: err.message }); }
  });
  try { pruneOldLogs_(C_().LOG_RETENTION_DAYS); } catch (err) { logWarn_('Automation.dailyRun', 'Log pruning failed', { error: err.message }); }
}

/* Between the end of spring finals and the start of autumn, only check-ins get reminders (§4.4). */
function inSummerQuiet_(today) {
  const year = Number(today.slice(0, 4));
  try {
    const springEnd = quarterDates_('SPR' + year).finalsEnd, autumnStart = quarterDates_('AUT' + year).firstDay;
    return daysBetween_(springEnd, today) > 0 && daysBetween_(today, autumnStart) > 0;
  } catch (err) { return false; }
}

function runReviewReminders_(today) {
  const S = C_().SHEETS, max = C_().MAX_REMINDERS, interval = C_().REMINDER_INTERVAL_DAYS;
  const quiet = inSummerQuiet_(today);
  readTable_(S.REVIEWS).forEach(function(r) {
    if (['STUDENT_PENDING', 'ADVISOR_PENDING', 'STUDENT_ACK_PENDING'].indexOf(r.Status) === -1 || !r.Due_Date) return;
    if (quiet && r.Type === 'ANNUAL') return;
    const count = Number(r.Reminder_Count) || 0;
    const student = studentByEmail_(r.Student_Email) || {};
    /* Every pending stage escalates, including the acknowledgement (build-spec §1.1). */
    if (shouldEscalate_(r.Status, count, max, String(r.Due_Date).slice(0, 10), today)) {
      updateRow_(S.REVIEWS, r._row, { Status: 'ESCALATED', Escalated_From: r.Status, Updated_At: nowIso_() });
      const reviewer = reviewerFor_(student);
      const stage = r.Status === 'STUDENT_PENDING' ? 'student' : r.Status === 'ADVISOR_PENDING' ? 'advisor' : 'acknowledgement';
      if (reviewer) sendTemplate_('AR-9', reviewer, '', { stage: stage,
        daysOverdue: daysBetween_(String(r.Due_Date).slice(0, 10), today), url: appUrl_({ view: 'program' }) }, r.Review_ID);
      logEvent_({ action: C_().ACTIONS.ESCALATED, evaluationId: r.Review_ID, oldStatus: r.Status, newStatus: 'ESCALATED', actorEmail: 'SYSTEM' });
      return;
    }
    const last = String(r.Last_Reminder || r.Stage_Started || today).slice(0, 10);
    const nearDue = daysBetween_(today, String(r.Due_Date).slice(0, 10)) <= 7;
    if (!reminderDue_(r.Status, count, max, last, today, interval) || (count === 0 && !nearDue)) return;
    const url = appUrl_({ t: r.Secure_Token });
    const due = String(r.Due_Date).slice(0, 10);
    if (r.Status === 'STUDENT_PENDING') {
      if (r.Type === 'ANNUAL') sendTemplate_('AR-2', normEmail_(r.Student_Email), student.Preferred_First || 'there', { url: url, dueLong: dateLong_(due), dueShort: dateShort_(due) }, r.Review_ID);
      else sendTemplate_('AR-10', normEmail_(r.Student_Email), student.Preferred_First || 'there', { quarter: quarterLabel_(r.Cycle), url: url, dueLong: dateLong_(due), isInterim: false }, r.Review_ID);
    } else if (r.Status === 'ADVISOR_PENDING') {
      splitList_(r.Advisor_Emails).forEach(function(a) {
        if (r.Type === 'ANNUAL') sendTemplate_('AR-4', a, firstNameFor_(a), { studentName: student.Name, url: url, dueLong: dateLong_(due), dueShort: dateShort_(due) }, r.Review_ID);
        else sendTemplate_('AR-13', a, firstNameFor_(a), { studentName: student.Name, quarter: quarterLabel_(r.Cycle), url: url, dueLong: dateLong_(due), isInterim: r.Program !== 'MA' }, r.Review_ID);
      });
    } else {
      sendTemplate_('AR-7', normEmail_(r.Student_Email), student.Preferred_First || 'there', { url: url, ackDueLong: dateLong_(due) }, r.Review_ID);
    }
    updateRow_(S.REVIEWS, r._row, { Reminder_Count: count + 1, Last_Reminder: today });
    logEvent_({ action: C_().ACTIONS.REMINDER_SENT, evaluationId: r.Review_ID, details: { count: count + 1 }, actorEmail: 'SYSTEM' });
  });
}

/* Course feedback: CF-2 the Wednesday after grades are due, CF-3 three days before the due date,
   and pages still open after the due date close ("no feedback received").
   Reminder_Count records which reminders a page has had (1 = CF-2, 2 = CF-3), so a reminder whose day was
   missed (for example, the daily run failed) goes out on the next run instead. If both days were missed,
   only CF-3 is sent. */
function runCourseFeedbackSchedule_(today) {
  const S = C_().SHEETS;
  const quarters = {};
  readTable_(S.REQUESTS).forEach(function(r) { quarters[r.Quarter] = true; });
  Object.keys(quarters).forEach(function(q) {
    let w;
    try { w = courseFeedbackWindow_(q, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES); } catch (err) { return; }
    readTable_(S.REQUESTS).forEach(function(r) {
      if (r.Quarter !== q || ['SENT', 'DRAFT'].indexOf(r.Status) === -1) return;
      if (daysBetween_(w.due, today) > 0) { updateRow_(S.REQUESTS, r._row, { Status: 'CLOSED' }); return; }
      const count = Number(r.Reminder_Count) || 0;
      let which = '';
      let newCount = count;
      if (today >= w.reminders[1] && count < 2) { which = 'CF-3'; newCount = 2; }
      else if (today >= w.reminders[0] && count < 1) { which = 'CF-2'; newCount = 1; }
      if (!which) return;
      const params = { course: r.Offering, url: appUrl_({ f: r.Secure_Token }), dueLong: dateLong_(w.due), dueShort: dateShort_(w.due),
        gradesDueLong: dateLong_(w.gradesDue), gradesDuePassed: today > w.gradesDue };
      splitList_(r.Instructor_Emails).forEach(function(em) {
        sendTemplate_(which, em, firstNameFor_(em), params, r.Request_ID);
      });
      updateRow_(S.REQUESTS, r._row, { Reminder_Count: newCount });
    });
  });
}

/* Follow-up flags: CF-7 to the reviewer and advisor(s) the day after the flag; CF-8 to the handler on day 14. */
function runFollowups_(today) {
  const S = C_().SHEETS;
  readTable_(S.FOLLOWUPS).forEach(function(f) {
    if (f.Status !== 'OPEN') return;
    const opened = String(f.Opened_At).slice(0, 10);
    const t = followupTiming_(opened, today, f.Status, f.Reminder_Sent_At);
    const s = studentByEmail_(f.Student_Email) || {};
    const url = appUrl_({ view: 'release', q: f.Quarter });
    if (!f.Alert_Sent_At && t.day >= 1) {
      const reviewer = normEmail_(f.Handled_By) || reviewerFor_(s);
      if (reviewer) sendTemplate_('CF-7', reviewer, firstNameFor_(reviewer), { quarter: quarterLabel_(f.Quarter), url: url, deadlineLong: dateLong_(t.deadline), isAdvisor: false }, f.Followup_ID);
      splitList_(s.Advisor_Emails).filter(function(a) { return a !== reviewer; }).forEach(function(a) {
        sendTemplate_('CF-7', a, firstNameFor_(a), { quarter: quarterLabel_(f.Quarter), url: '', deadlineLong: dateLong_(t.deadline), isAdvisor: true }, f.Followup_ID);
      });
      updateRow_(S.FOLLOWUPS, f._row, { Alert_Sent_At: nowIso_() });
    }
    if (t.reminderDue) {
      const handler = normEmail_(f.Handled_By) || reviewerFor_(s);
      if (handler) sendTemplate_('CF-8', handler, firstNameFor_(handler), { deadlineLong: dateLong_(t.deadline), deadlineShort: dateShort_(t.deadline), url: url }, f.Followup_ID);
      updateRow_(S.FOLLOWUPS, f._row, { Reminder_Sent_At: nowIso_() });
    }
  });
}

/* True once a one-day task has been recorded in the audit log under this ID. The daily run uses it so a
   task whose day was missed runs on the next day instead, and never twice. */
function taskDone_(recordId, action) {
  return queryAuditLog_({ evaluationId: recordId, action: action }).length > 0;
}

/* MA check-ins open on the Monday of finals week each quarter. If that day's run was missed, they open on
   the next run up to the quarter's due date, unless the launch is already logged ('MA <quarter>'). */
function runMaLaunch_(today) {
  const q = quarterForDate_(today);
  if (!q || q.indexOf('SUM') === 0) return;
  const w = courseFeedbackWindow_(q, C_().CF_RELEASE_OFFSET_DAYS, C_().CF_WINDOW_OVERRIDES);
  if (today < w.opens || today > w.due) return;
  if (taskDone_('MA ' + q, C_().ACTIONS.LAUNCH)) return;
  launchMaCheckins_(q, 'SYSTEM');
}

/* AR-11 five business days before the Alert deadline, grouped by reviewer. A missed day is caught up on
   the next run until the deadline; each reviewer's reminder is logged ('AR-11 <quarter> <reviewer>'). */
function runAlertReminders_(today) {
  const S = C_().SHEETS, groups = {};
  readTable_(S.REVIEWS).forEach(function(r) {
    if (!r.Alert_Quarter || r.Alert_Sent_Date) return;
    let d;
    try { d = alertDeadline_(r.Alert_Quarter); } catch (err) { return; }
    if (today < d.remindOn || today > d.due) return;
    const reviewer = reviewerFor_(studentByEmail_(r.Student_Email) || {});
    const k = reviewer + '|' + r.Alert_Quarter;
    (groups[k] = groups[k] || { reviewer: reviewer, d: d, n: 0 }).n++;
  });
  Object.keys(groups).forEach(function(k) {
    const g = groups[k];
    const marker = 'AR-11 ' + g.d.quarter + ' ' + g.reviewer;
    if (taskDone_(marker, C_().ACTIONS.REMINDER_SENT)) return;
    sendTemplate_('AR-11', g.reviewer, '', { n: g.n, dueLong: dateLong_(g.d.due), dueShort: dateShort_(g.d.due), quarter: quarterLabel_(g.d.quarter), url: appUrl_({ view: 'program' }) }, g.d.quarter);
    logEvent_({ action: C_().ACTIONS.REMINDER_SENT, evaluationId: marker, details: { n: g.n }, actorEmail: 'SYSTEM' });
  });
}

/* AR-5 on the first day of the calibration weeks, one per subfield and reviewer. A missed day is caught up
   on the next run until the calibration weeks end; each notice is logged ('AR-5 <year> <reviewer> <subfield>'). */
function runCalibrationNotice_(today) {
  const year = C_().CYCLE_YEAR;
  let dates;
  try { dates = annualCycleDates_(year); } catch (err) { return; }
  if (today < dates.calibrationFrom || today > dates.calibrationTo) return;
  const groups = {};
  readTable_(C_().SHEETS.REVIEWS).forEach(function(r) {
    if (r.Type !== 'ANNUAL' || Number(r.Cycle) !== year || ['ON_LEAVE', 'EXEMPT'].indexOf(r.Status) !== -1) return;
    const s = studentByEmail_(r.Student_Email) || {};
    const k = reviewerFor_(s) + '|' + (s.Subfield || 'Unassigned');
    const g = groups[k] = groups[k] || { reviewer: reviewerFor_(s), subfield: s.Subfield || 'Unassigned', ready: 0, total: 0 };
    g.total++;
    if (r.Status === 'PROGRAM_PENDING') g.ready++;
  });
  Object.keys(groups).forEach(function(k) {
    const g = groups[k];
    const marker = 'AR-5 ' + year + ' ' + g.reviewer + ' ' + g.subfield;
    if (taskDone_(marker, C_().ACTIONS.REMINDER_SENT)) return;
    sendTemplate_('AR-5', g.reviewer, '', { subfield: g.subfield, nReady: g.ready, nTotal: g.total, nWaiting: g.total - g.ready, url: appUrl_({ view: 'program' }) }, 'calibration ' + year);
    logEvent_({ action: C_().ACTIONS.REMINDER_SENT, evaluationId: marker, details: { ready: g.ready, total: g.total }, actorEmail: 'SYSTEM' });
  });
}

function createTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (['dailyRun', 'processDeadLetterQueue', 'checkAlertThresholds'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyRun').timeBased().everyDays(1).atHour(7).inTimezone('America/Los_Angeles').create();
  ScriptApp.newTrigger('processDeadLetterQueue').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('checkAlertThresholds').timeBased().everyHours(1).create();
}
