function C() { return getConfig(); }
function checkRemindersAndEscalations() {
  const sheet = getMasterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const now = new Date();
  const pendingStatuses = [
    C().STATUSES.PROF_EVAL_PENDING,
    C().STATUSES.TA_RESPONSE_PENDING,
    C().STATUSES.PROF_SIGN_PENDING
  ];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const status = row[col.Status];

    if (!pendingStatuses.includes(status)) continue;

    const lastActionStr = row[col.Last_Action_Date];
    if (!lastActionStr) continue;

    const lastAction = new Date(lastActionStr);
    const daysElapsed = Math.floor((now - lastAction) / (1000 * 60 * 60 * 24));

    if (daysElapsed < C().REMINDER_INTERVAL_DAYS) continue;

    const reminderCount = row[col.Reminder_Count] || 0;

    if (reminderCount < C().MAX_REMINDERS) {
      sendReminderForRow(row, col, reminderCount + 1);
      sheet.getRange(r + 1, col.Reminder_Count + 1).setValue(reminderCount + 1);
      sheet.getRange(r + 1, col.Last_Action_Date + 1).setValue(now.toISOString());

      logEvent({
        action: C().ACTIONS.REMINDER_SENT,
        evaluationId: row[col.Evaluation_ID],
        oldStatus: status,
        newStatus: status,
        details: {
          reminderCount: reminderCount + 1,
          stage: status,
          recipient: status === C().STATUSES.PROF_EVAL_PENDING || status === C().STATUSES.PROF_SIGN_PENDING
            ? row[col.Prof_Email]
            : row[col.TA_Email]
        },
        actorEmail: 'SYSTEM'
      });
    } else if (reminderCount >= C().MAX_REMINDERS) {
      sheet.getRange(r + 1, col.Status + 1).setValue(C().STATUSES.ESCALATED);

      logEvent({
        action: C().ACTIONS.ESCALATED,
        evaluationId: row[col.Evaluation_ID],
        oldStatus: status,
        newStatus: C().STATUSES.ESCALATED,
        details: {
          stage: status,
          adminNotified: true
        },
        actorEmail: 'SYSTEM'
      });

      sendEscalationEmail({
        adminEmail: C().ADMIN_EMAIL,
        evaluationId: row[col.Evaluation_ID],
        courseCode: row[col.Course_Code],
        term: row[col.Term],
        profName: row[col.Prof_Name],
        taName: row[col.TA_Name],
        pendingStage: status,
        daysOverdue: daysElapsed
      });
    }
  }

  SpreadsheetApp.flush();
}

function sendReminderForRow(row, col, reminderCount) {
  const isProfTurn = row[col.Status] === C().STATUSES.PROF_EVAL_PENDING || row[col.Status] === C().STATUSES.PROF_SIGN_PENDING;
  const email = isProfTurn ? row[col.Prof_Email] : row[col.TA_Email];
  const name = isProfTurn ? row[col.Prof_Name] : row[col.TA_Name];

  const actionMap = {
    [C().STATUSES.PROF_EVAL_PENDING]: 'prof_eval',
    [C().STATUSES.TA_RESPONSE_PENDING]: 'ta_respond',
    [C().STATUSES.PROF_SIGN_PENDING]: 'prof_sign'
  };

  const action = actionMap[row[col.Status]];
  const link = C().APP_URL + '?action=' + action + '&token=' + row[col.Secure_Token];

  sendReminderEmail({
    email,
    name,
    action: row[col.Status],
    link,
    evaluationId: row[col.Evaluation_ID],
    courseCode: row[col.Course_Code],
    term: row[col.Term],
    reminderCount
  });
}

function createDailyTrigger() {
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

function deleteAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}