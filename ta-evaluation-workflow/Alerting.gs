function C() { return getConfig(); }

function checkAlertThresholds() {
  const alerts = [];

  alerts.push(...checkPdfFailureRate());
  alerts.push(...checkEmailFailureRate());
  alerts.push(...checkTriggerHealth());
  alerts.push(...checkQuotaUsage());
  alerts.push(...checkDeadLetterBacklog());
  alerts.push(...checkStaleEvaluations());

  if (alerts.length > 0) {
    sendAlertSummary(alerts);
  }

  return alerts;
}

function checkPdfFailureRate() {
  const alerts = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const logs = queryLogs({
    level: 'ERROR',
    function: 'PdfEngine',
    startDate: oneHourAgo.toISOString()
  });

  const pdfFailures = logs.filter(l =>
    l.Message.includes('PDF') || l.Message.includes('generateAndDistributePdf')
  ).length;

  if (pdfFailures >= C().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR) {
    alerts.push({
      type: 'PDF_FAILURE_RATE',
      severity: 'HIGH',
      message: `PDF generation failures in last hour: ${pdfFailures} (threshold: ${C().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR})`,
      count: pdfFailures,
      threshold: C().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR,
      window: '1 hour'
    });
    logWarn('Alerting.checkPdfFailureRate', 'PDF failure rate threshold exceeded', { count: pdfFailures, threshold: C().ALERT_THRESHOLDS.PDF_FAILURES_PER_HOUR });
  }
  return alerts;
}

function checkEmailFailureRate() {
  const alerts = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const logs = queryLogs({
    level: 'ERROR',
    function: 'EmailEngine',
    startDate: oneHourAgo.toISOString()
  });

  const emailFailures = logs.length;

  if (emailFailures >= C().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR) {
    alerts.push({
      type: 'EMAIL_FAILURE_RATE',
      severity: 'HIGH',
      message: `Email failures in last hour: ${emailFailures} (threshold: ${C().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR})`,
      count: emailFailures,
      threshold: C().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR,
      window: '1 hour'
    });
    logWarn('Alerting.checkEmailFailureRate', 'Email failure rate threshold exceeded', { count: emailFailures, threshold: C().ALERT_THRESHOLDS.EMAIL_FAILURES_PER_HOUR });
  }
  return alerts;
}

function checkTriggerHealth() {
  const alerts = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = queryLogs({
    level: 'ERROR',
    startDate: oneDayAgo.toISOString()
  });

  const triggerFailures = logs.filter(l =>
    l.Function.includes('Automation') || l.Function.includes('checkRemindersAndEscalations') ||
    l.Function.includes('DeadLetterQueue') || l.Function.includes('processDeadLetterQueue')
  ).length;

  if (triggerFailures >= C().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY) {
    alerts.push({
      type: 'TRIGGER_FAILURE_RATE',
      severity: 'HIGH',
      message: `Trigger failures in last 24 hours: ${triggerFailures} (threshold: ${C().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY})`,
      count: triggerFailures,
      threshold: C().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY,
      window: '24 hours'
    });
    logWarn('Alerting.checkTriggerHealth', 'Trigger failure rate threshold exceeded', { count: triggerFailures, threshold: C().ALERT_THRESHOLDS.TRIGGER_FAILURES_PER_DAY });
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
    logError('Alerting.checkTriggerHealth', 'Missing expected triggers', { missing });
  }
  return alerts;
}

function checkQuotaUsage() {
  const alerts = [];
  const quota = getQuotaStatus();

  if (quota.maxUsagePct > C().ALERT_THRESHOLDS.QUOTA_USAGE_PCT) {
    alerts.push({
      type: 'QUOTA_HIGH',
      severity: 'WARNING',
      message: `Quota usage at ${quota.maxUsagePct}% (threshold: ${C().ALERT_THRESHOLDS.QUOTA_USAGE_PCT}%)`,
      usagePct: quota.maxUsagePct,
      threshold: C().ALERT_THRESHOLDS.QUOTA_USAGE_PCT,
      details: quota
    });
    logWarn('Alerting.checkQuotaUsage', 'Quota usage threshold exceeded', { usagePct: quota.maxUsagePct, threshold: C().ALERT_THRESHOLDS.QUOTA_USAGE_PCT });
  }
  return alerts;
}

function checkDeadLetterBacklog() {
  const alerts = [];
  const dlqStats = getDeadLetterStats();

  if (dlqStats.pending > 50) {
    alerts.push({
      type: 'DLQ_BACKLOG',
      severity: 'WARNING',
      message: `Dead letter queue backlog: ${dlqStats.pending} pending items`,
      pending: dlqStats.pending,
      maxRetriesExceeded: dlqStats.maxRetries
    });
    logWarn('Alerting.checkDeadLetterBacklog', 'DLQ backlog threshold exceeded', { pending: dlqStats.pending });
  }

  if (dlqStats.maxRetries > 10) {
    alerts.push({
      type: 'DLQ_MAX_RETRIES_HIGH',
      severity: 'HIGH',
      message: `Dead letter queue: ${dlqStats.maxRetries} items exceeded max retries`,
      maxRetriesExceeded: dlqStats.maxRetries
    });
    logError('Alerting.checkDeadLetterBacklog', 'DLQ max retries exceeded threshold', { maxRetriesExceeded: dlqStats.maxRetries });
  }
  return alerts;
}

function checkStaleEvaluations() {
  const alerts = [];
  const sheet = getMasterSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return alerts;

  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const pendingStatuses = [
    C().STATUSES.PROF_EVAL_PENDING,
    C().STATUSES.TA_RESPONSE_PENDING,
    C().STATUSES.PROF_SIGN_PENDING,
    C().STATUSES.PDF_GENERATING
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
    logWarn('Alerting.checkStaleEvaluations', 'Stale evaluations threshold exceeded', { count: staleCount });
  }
  return alerts;
}

function sendAlertSummary(alerts) {
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
    to: C().ADMIN_EMAIL,
    subject,
    htmlBody,
    name: 'TA Evaluation System Alerts'
  });

  logInfo('Alerting.sendAlertSummary', `Sent alert summary email`, { critical: critical.length, high: high.length, warning: warning.length });
}

function createAlertingTrigger() {
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

function runHealthCheck() {
  const health = JSON.parse(handleHealthCheck().getContent());
  logInfo('Alerting.runHealthCheck', 'Manual health check executed', health);
  return health;
}