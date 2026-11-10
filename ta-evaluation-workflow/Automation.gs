function C_() { return getConfig_(); }
/* Daily trigger. It runs only for a real trigger event or for the script owner. */
function checkRemindersAndEscalations(e) {
  assertTriggerOrOwner_(e, 'checkRemindersAndEscalations');
  checkRemindersAndEscalations_();
  pruneOldLogs_(C_().LOG_RETENTION_DAYS);
  pruneDeadLetters_(C_().LOG_RETENTION_DAYS);
}

function checkRemindersAndEscalations_() {
  const pendingStatuses = [
    C_().STATUSES.PROF_EVAL_PENDING,
    C_().STATUSES.TA_RESPONSE_PENDING,
    C_().STATUSES.PROF_SIGN_PENDING
  ];
  const dayMs = 24 * 60 * 60 * 1000;
  const isDue = function(r, now) {
    if (pendingStatuses.indexOf(r.status) === -1 || !r.lastActionDate) return false;
    return Math.floor((now - new Date(r.lastActionDate)) / dayMs) >= C_().REMINDER_INTERVAL_DAYS;
  };

  // A quick look without the lock to find the rows that are due.
  const snap = readMasterRows_();
  const candidates = [];
  const start = new Date();
  for (let r = 1; r < snap.data.length; r++) {
    const row = rowObject_(snap.data, snap.col, r);
    if (row.evaluationId && isDue(row, start)) candidates.push(row);
  }

  candidates.forEach(function(seen) {
    // Re-read the row inside the lock and act only if nothing changed since the quick look,
    // so a submission arriving now is never overwritten with ESCALATED or a stale reminder count.
    const lock = acquireLock_(20000);
    if (!lock) return;
    let act = null, row = null;
    const now = new Date();
    try {
      row = findRowByEvaluationId_(seen.evaluationId);
      if (!row || row.status !== seen.status || String(row.lastActionDate) !== String(seen.lastActionDate) || !isDue(row, now)) return;
      const count = Number(row.reminderCount) || 0;
      if (count < C_().MAX_REMINDERS) {
        updateRow_(row.rowNum, { reminderCount: count + 1, lastActionDate: now.toISOString() });
        act = { kind: 'reminder', count: count + 1 };
      } else {
        // Out of reminders: escalate only once the step is past its due date.
        const due = dueDateForStep_(row.term, stageActionForStatus_(row.status), stepStartFromExpiry_(row.tokenExpiry));
        if (!isPastDue_(due)) return;
        updateRow_(row.rowNum, { status: C_().STATUSES.ESCALATED });
        act = { kind: 'escalate', days: Math.floor((now - new Date(row.lastActionDate)) / dayMs) };
      }
    } finally {
      lock.releaseLock();
    }
    if (!act) return;

    const profTurn = row.status === C_().STATUSES.PROF_EVAL_PENDING || row.status === C_().STATUSES.PROF_SIGN_PENDING;
    if (act.kind === 'reminder') {
      sendReminderForRow_(row, act.count);
      logEvent_({
        action: C_().ACTIONS.REMINDER_SENT, evaluationId: row.evaluationId,
        oldStatus: row.status, newStatus: row.status,
        details: { reminderCount: act.count, stage: row.status, recipient: profTurn ? row.profEmail : row.taEmail },
        actorEmail: 'SYSTEM'
      });
    } else {
      logEvent_({
        action: C_().ACTIONS.ESCALATED, evaluationId: row.evaluationId,
        oldStatus: row.status, newStatus: C_().STATUSES.ESCALATED,
        details: { stage: row.status, adminNotified: true },
        actorEmail: 'SYSTEM'
      });
      sendEscalationEmail_({
        adminEmail: C_().ADMIN_EMAIL, evaluationId: row.evaluationId, courseCode: row.courseCode, term: row.term,
        profName: row.profName, taName: row.taName, pendingStage: row.status, daysOverdue: act.days
      });
    }
  });
}

/* Reminder for the person whose turn it is, with the row's current link. */
function sendReminderForRow_(row, reminderCount) {
  const profTurn = row.status === C_().STATUSES.PROF_EVAL_PENDING || row.status === C_().STATUSES.PROF_SIGN_PENDING;
  const action = stageActionForStatus_(row.status);
  sendReminderEmail_({
    email: profTurn ? row.profEmail : row.taEmail,
    name: profTurn ? row.profName : row.taName,
    action: row.status,
    link: C_().APP_URL + '?action=' + action + '&token=' + row.secureToken,
    evaluationId: row.evaluationId,
    courseCode: row.courseCode,
    term: row.term,
    reminderCount: reminderCount,
    taName: row.taName,
    profName: row.profName,
    tokenExpiry: row.tokenExpiry
  });
}

function createDailyTrigger_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkRemindersAndEscalations') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('checkRemindersAndEscalations')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
}

function deleteAllTriggers_() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}