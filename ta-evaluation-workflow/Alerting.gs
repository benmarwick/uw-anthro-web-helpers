function C_() { return getConfig_(); }

/* Hourly trigger. It runs only for a real trigger event or for the script owner. */
function checkAlertThresholds(e) {
  assertTriggerOrOwner_(e);
  return checkAlertThresholds_();
}

function checkAlertThresholds_() {
  const alerts = [];

  alerts.push(...checkPdfFailureRate());
  alerts.push(...checkEmailFailureRate());
  alerts.push(...checkTriggerHealth());
  alerts.push(...checkQuotaUsage());
  alerts.push(...checkDeadLetterBacklog());
  alerts.push(...checkStaleEvaluations());

  if (alerts.length > 0) {
    sendAlertSummary_(alerts);
  }

  return alerts;
}

function checkPdfFailureRate_() {
  const alerts = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const logs = queryLogs_({
    level: 'ERROR',
    function: 'PdfEngine',
    startDate: oneHourAgo.toISOString()
  });

  const pdfFailures = logs.filter(l =>
    l.Message.includes('PDF') || l.Message.includes('generateAndDistributePdf')
  ).length;

  if (pdfFailures >= C_().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR) {
    alerts.push({
      type: 'PDF_FAILURE_RATE',
      severity: 'HIGH',
      message: `PDF generation failures in last hour: ${pdfFailures} (threshold: ${C_().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR})`,
      count: pdfFailures,
      threshold: C_().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR,
      window: '1 hour'
    });
    logWarn_('Alerting.checkPdfFailureRate', 'PDF failure rate threshold exceeded', { count: pdfFailures, threshold: C_().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR });
  }
  return alerts;
}

function checkEmailFailureRate_() {
  const alerts = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const logs = queryLogs_({
    level: 'ERROR',
    function: 'EmailEngine',
    startDate: oneHourAgo.toISOString()
  });

  const emailFailures = logs.length;

  if (emailFailures >= C_().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR) {
    alerts.push({
      type: 'EMAIL_FAILURE_RATE',
      severity: 'HIGH',
      message: `Email failures in last hour: ${emailFailures} (threshold: ${C_().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR})`,
      count: emailFailures,
      threshold: C_().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR,
      window: '1 hour'
    });
    logWarn_('Alerting.checkEmailFailureRate', 'Email failure rate threshold exceeded', { count: emailFailures, threshold: C_().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR });
  }
  return alerts;
}

function checkTriggerHealth_() {
  const alerts = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = queryLogs_({
    level: 'ERROR',
    startDate: oneDayAgo.toISOString()
  });

  const triggerFailures = logs.filter(l =>
    l.Function.includes('Automation') || l.Function.includes('checkRemindersAndEscalations') ||
    l.Function.includes('DeadLetterQueue') || l.Function.includes('processDeadLetterQueue')
  ).length;

  if (triggerFailures >= C_().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY) {
    alerts.push({
      type: 'TRIGGER_FAILURE_RATE',
      severity: 'HIGH',
      message: `Trigger failures in last 24 hours: ${triggerFailures} (threshold: ${C_().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY})`,
      count: triggerFailures,
      threshold: C_().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY,
      window: '24 hours'
    });
    logWarn_('Alerting.checkTriggerHealth', 'Trigger failure rate threshold exceeded', { count: triggerFailures, threshold: C_().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY });
  }

  const triggers = ScriptApp.getProjectTriggers();
  const expected = ['checkRemindersAndEscalations', 'processDeadLetterQueue'];
  const found = triggers.map(t => t.getHandlerFunction());
  const missing = expected.filter(f => !found.includes(f));

  if (missing.length > 0) {
    alerts.push({
      type: 'MISSING_TRIGGERS',
      severity: 'CRITICAL',
      message: `Missing expected triggers: ${missing.join(', ')}`,
      missing
    });
    logError_('Alerting.checkTriggerHealth', 'Missing expected triggers', { missing });
  }
  return alerts;
}

function checkQuotaUsage_() {
  const alerts = [];
  const quota = getQuotaStatus_();

  if (quota.maxUsagePct > C_().ALERT_THRESHOLDS.QUOTA_USAGE_PCT) {
    alerts.push({
      type: 'QUOTA_HIGH',
      severity: 'WARNING',
      message: `Quota usage at ${quota.maxUsagePct}% (threshold: ${C_().ALERT_THRESHOLDS.QUOTA_USAGE_PCT}%)`,
      usagePct: quota.maxUsagePct,
      threshold: C_().ALERT_THRESHOLDS.QUOTA_USAGE_PCT,
      details: quota
    });
    logWarn_('Alerting.checkQuotaUsage', 'Quota usage threshold exceeded', { usagePct: quota.maxUsagePct, threshold: C_().ALERT_THRESHOLDS.QUOTA_USAGE_PCT });
  }
  return alerts;
}

function checkDeadLetterBacklog_() {
  const alerts = [];
  const dlqStats = getDeadLetterStats_();

  if (dlqStats.pending > 50) {
    alerts.push({
      type: 'DLQ_BACKLOG',
      severity: 'WARNING',
      message: `Dead letter queue backlog: ${dlqStats.pending} pending items`,
      pending: dlqStats.pending,
      maxRetriesExceeded: dlqStats.maxRetries
    });
    logWarn_('Alerting.checkDeadLetterBacklog', 'DLQ backlog threshold exceeded', { pending: dlqStats.pending });
  }

  if (dlqStats.maxRetries > 10) {
    alerts.push({
      type: 'DLQ_MAX_RETRIES_HIGH',
      severity: 'HIGH',
      message: `Dead letter queue: ${dlqStats.maxRetries} items exceeded max retries`,
      maxRetriesExceeded: dlqStats.maxRetries
    });
    logError_('Alerting.checkDeadLetterBacklog', 'DLQ max retries exceeded threshold', { maxRetriesExceeded: dlqStats.maxRetries });
  }
  return alerts;
}

function checkStaleEvaluations_() {
  const alerts = [];
  const sheet = getMasterSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return alerts;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const pendingStatuses = [
    C_().STATUSES.PROF_EVAL_PENDING,
    C_().STATUSES.TA_RESPONSE_PENDING,
    C_().STATUSES.PROF_SIGN_PENDING,
    C_().STATUSES.PDF_GENERATING
  ];

  let staleCount = 0;
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  for (let r = 1; r < data.length; r++) {
    const status = data[r][col.Status];
    const lastActionStr = data[r][col.Last_Action_Date];
    if (!pendingStatuses.includes(status)) continue;
    if (!lastActionStr) continue;

    const lastAction = new Date(lastActionStr);
    if (lastAction < fourteenDaysAgo) {
      staleCount++;
    }
  }

  if (staleCount > 20) {
    alerts.push({
      type: 'STALE_EVALUATIONS',
      severity: 'WARNING',
      message: `${staleCount} evaluations stale (>14 days no activity)`,
      count: staleCount
    });
    logWarn_('Alerting.checkStaleEvaluations', 'Stale evaluations threshold exceeded', { count: staleCount });
  }
  return alerts;
}

function sendAlertSummary_(alerts) {
  const critical = alerts.filter(a => a.severity === 'CRITICAL');
  const high = alerts.filter(a => a.severity === 'HIGH');
  const warning = alerts.filter(a => a.severity === 'WARNING');

  const subject = `[ALERT] TA Evaluation System: ${critical.length} Critical, ${high.length} High, ${warning.length} Warning`;
  const htmlBody = `
    <h2>TA Evaluation System - Alert Summary</h2>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>

    ${critical.length > 0 ? `
    <h3 style="color:#DC3545;">🔴 Critical (${critical.length})</h3>
    <ul>${critical.map(a => `<li><strong>${a.type}:</strong> ${a.message}</li>`).join('')}</ul>
    ` : ''}

    ${high.length > 0 ? `
    <h3 style="color:#FD7E14;">🟠 High (${high.length})</h3>
    <ul>${high.map(a => `<li><strong>${a.type}:</strong> ${a.message}</li>`).join('')}</ul>
    ` : ''}

    ${warning.length > 0 ? `
    <h3 style="color:#FFC107;">🟡 Warning (${warning.length})</h3>
    <ul>${warning.map(a => `<li><strong>${a.type}:</strong> ${a.message}</li>`).join('')}</ul>
    ` : ''}

    <hr>
    <p style="font-size:12px;color:#666;">Check the <strong>Logs</strong> sheet for detailed error context.</p>
  `;

  GmailApp.sendEmail({
    to: C_().ADMIN_EMAIL,
    subject,
    htmlBody,
    name: 'TA Evaluation System Alerts'
  });

  logInfo_('Alerting.sendAlertSummary', `Sent alert summary email`, { critical: critical.length, high: high.length, warning: warning.length });
}

function createAlertingTrigger_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkAlertThresholds') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('checkAlertThresholds')
    .timeBased()
    .everyHours(1)
    .create();
}

function runHealthCheck_() {
  const health = JSON.parse(handleHealthCheck_().getContent());
  logInfo_('Alerting.runHealthCheck', 'Manual health check executed', health);
  return health;
}