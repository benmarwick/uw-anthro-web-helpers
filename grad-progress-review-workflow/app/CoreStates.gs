/* ============================================================
   CoreStates.gs: states and transitions from build-spec.md §1. Pure functions, tested in
   tests/run.js. Each function returns a new state description; the caller writes it to the sheet
   and the audit log.
   ============================================================ */

var REVIEW_FLOWS_ = {
  ANNUAL: ['NOT_STARTED', 'STUDENT_PENDING', 'ADVISOR_PENDING', 'PROGRAM_PENDING', 'STUDENT_ACK_PENDING', 'PDF_GENERATING', 'COMPLETED'],
  INTERIM_PHD: ['NOT_STARTED', 'ADVISOR_PENDING', 'COMPLETED'],
  INTERIM_MA: ['NOT_STARTED', 'STUDENT_PENDING', 'ADVISOR_PENDING', 'COMPLETED'],
  // An interim or MA check-in escalated by the advisor continues through the program stage.
  ESCALATED_TAIL: ['PROGRAM_PENDING', 'STUDENT_ACK_PENDING', 'PDF_GENERATING', 'COMPLETED']
};

var PENDING_STAGES_ = ['STUDENT_PENDING', 'ADVISOR_PENDING', 'PROGRAM_PENDING', 'STUDENT_ACK_PENDING'];

/* Which flow a review row follows. type: 'ANNUAL' | 'INTERIM'; program: 'PHD' | 'MA'. */
function flowFor_(type, program) {
  if (type === 'ANNUAL') return REVIEW_FLOWS_.ANNUAL;
  if (type === 'INTERIM') return program === 'MA' ? REVIEW_FLOWS_.INTERIM_MA : REVIEW_FLOWS_.INTERIM_PHD;
  throw new Error('Unknown review type: ' + type + ' (FIRST_YEAR and COMPACT are phase 2)');
}

/* The status after a stage is submitted. opts.escalateToProgram: the advisor chose "escalate to
   the GPC" on an interim or MA check-in. opts.onProgramTail: the row has already been escalated. */
function nextReviewStatus_(type, program, status, opts) {
  opts = opts || {};
  if (opts.escalateToProgram && status === 'ADVISOR_PENDING' && type === 'INTERIM') return 'PROGRAM_PENDING';
  var flow = opts.onProgramTail ? REVIEW_FLOWS_.ESCALATED_TAIL : flowFor_(type, program);
  var i = flow.indexOf(status);
  if (i === -1) {
    var tail = REVIEW_FLOWS_.ESCALATED_TAIL.indexOf(status);
    if (type === 'INTERIM' && tail !== -1) return REVIEW_FLOWS_.ESCALATED_TAIL[tail + 1] || 'COMPLETED';
    throw new Error('Status ' + status + ' is not in the ' + type + ' flow');
  }
  if (i === flow.length - 1) throw new Error('Review is already ' + status);
  return flow[i + 1];
}

/* A pending stage whose due date has passed after the maximum reminders becomes ESCALATED. */
function shouldEscalate_(status, reminderCount, maxReminders, dueIso, todayIso) {
  return PENDING_STAGES_.indexOf(status) !== -1 && reminderCount >= maxReminders && daysBetween_(dueIso, todayIso) > 0;
}

/* A reminder is due when the stage is pending, fewer than the maximum have been sent, and at least
   intervalDays have passed since the stage started or the last reminder. */
function reminderDue_(status, reminderCount, maxReminders, lastIso, todayIso, intervalDays) {
  return PENDING_STAGES_.indexOf(status) !== -1 && reminderCount < maxReminders && daysBetween_(lastIso, todayIso) >= intervalDays;
}

/* The GPC's three ways out of ESCALATED (build-spec §1.1). Returns the update to apply.
   action: 'extend' (needs newDueIso) | 'skip' | 'exempt'. A reason is always required. */
function resolveEscalation_(row, action, opts) {
  opts = opts || {};
  if (row.status !== 'ESCALATED') throw new Error('Review is not escalated');
  if (!opts.reason || !String(opts.reason).trim()) throw new Error('A reason is required');
  var from = row.escalatedFrom;
  if (PENDING_STAGES_.indexOf(from) === -1) throw new Error('Unknown stage before escalation: ' + from);
  if (action === 'extend') {
    if (!opts.newDueIso) throw new Error('A new due date is required');
    return { status: from, dueDate: opts.newDueIso, reminderCount: 0, escalatedFrom: '', skippedStage: '' };
  }
  if (action === 'skip') {
    var next = nextReviewStatus_(row.type, row.program, from, { onProgramTail: row.onProgramTail });
    return { status: next, reminderCount: 0, escalatedFrom: '', skippedStage: from };
  }
  if (action === 'exempt') {
    return { status: 'EXEMPT', escalatedFrom: '', skippedStage: '' };
  }
  throw new Error('Unknown action: ' + action);
}

/* ---------- Course feedback comments (build-spec §1.2) ---------- */

var COMMENT_TRANSITIONS_ = {
  SUBMITTED: { check: 'CHECKED', 'return': 'RETURNED' },
  RETURNED: { revise: 'REVISED', releaseDay: 'STUDENT_ONLY' },
  REVISED: { check: 'CHECKED', 'return': 'RETURNED' },
  CHECKED: { release: 'RELEASED', revise: 'REVISED' },
  STUDENT_ONLY: { revisePassed: 'RELEASED', resolve: 'RESOLVED', revise: 'REVISED_AFTER_RELEASE' },
  REVISED_AFTER_RELEASE: { check: 'RELEASED', 'return': 'STUDENT_ONLY' },
  NO_CONTACT: { release: 'NO_CONTACT' }
};

function nextCommentStatus_(status, event) {
  var t = COMMENT_TRANSITIONS_[status];
  if (!t || !t[event]) throw new Error('Comment in ' + status + ' cannot take "' + event + '"');
  return t[event];
}

/* Who may see a comment in each state, once it has a Released_At date. A NO_CONTACT row has no
   text; it only counts in the coverage line, which everyone who sees the record may see. */
function commentVisibility_(status) {
  var shared = status === 'RELEASED' || status === 'NO_CONTACT';
  return {
    student: shared || ['STUDENT_ONLY', 'RESOLVED', 'REVISED_AFTER_RELEASE'].indexOf(status) !== -1,
    advisor: shared,
    calibration: shared,
    pdf: shared
  };
}

/* The status a comment starts in when the instructor submits. */
function initialCommentStatus_(contact) {
  return contact === 'enough' ? 'SUBMITTED' : 'NO_CONTACT';
}

/* ---------- Follow-up flags ---------- */

/* Day 0 is the submission day; reminder on day 14; overdue from day 21 (build-spec §1.2). */
function followupTiming_(openedIso, todayIso, status, reminderSentIso) {
  var day = daysBetween_(openedIso, todayIso);
  return {
    day: day,
    deadline: addDays_(openedIso, 21),
    reminderDue: status === 'OPEN' && day >= 14 && !reminderSentIso,
    overdue: status === 'OPEN' && day >= 21
  };
}

/* Closing a follow-up needs a contact date and one of the three outcomes. */
function validateFollowupOutcome_(outcome, contactIso) {
  var ok = ['Discussed', 'Support arranged', 'Raised as an interim check-in'];
  if (ok.indexOf(outcome) === -1) return 'Choose an outcome: ' + ok.join(', ') + '.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(contactIso || ''))) return 'Enter the date of the conversation.';
  return '';
}

/* ---------- Co-taught editing lock ---------- */

/* Returns { allowed, owner, until }. A lock lasts 30 minutes from the last open or save. */
function lockDecision_(lockOwner, lockUntilMs, requester, nowMs, minutes) {
  var span = (minutes || 30) * 60000;
  if (!lockOwner || !lockUntilMs || lockUntilMs <= nowMs || lockOwner === requester) {
    return { allowed: true, owner: requester, until: nowMs + span };
  }
  return { allowed: false, owner: lockOwner, until: lockUntilMs };
}
