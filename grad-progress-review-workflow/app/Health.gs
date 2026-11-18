/* ============================================================
   Health.gs: small helpers the reused infrastructure files (Logs.gs, Alerting.gs,
   DeadLetterQueue.gs) expect, adapted from the TA system.
   ============================================================ */

function getCurrentUserEmailSafe_() { return activeEmail_() || 'SYSTEM'; }

/* The TA files call this name; the rule is the same as assertTriggerOrAdmin_. */
function assertTriggerOrOwner_(e, handlerName) { return assertTriggerOrAdmin_(e, handlerName); }

function sendAdminAlert_(params) {
  if (!C_().ADMIN_EMAIL) return;
  const body = String(params.body || '');
  const emailParams = { to: C_().ADMIN_EMAIL, subject: '[ALERT] Graduate Review System: ' + params.subject, body: body,
                        htmlBody: '<pre style="font-family:monospace;white-space:pre-wrap;">' + escapeHtmlCore_(body) + '</pre>' };
  try { rawSendEmail_(emailParams); } catch (err) { logError_('Health.sendAdminAlert', 'Alert email failed', { error: err.message }); }
}

/* Reviews left in PDF_GENERATING (for example after a timeout) are finished on the hourly run. */
function generatePendingPdfs_() {
  readTable_(C_().SHEETS.REVIEWS).filter(function(r) { return r.Status === 'PDF_GENERATING'; }).slice(0, 5).forEach(function(r) {
    finishReview_(r.Review_ID);
  });
}

function getQuotaStatus_() {
  let remaining = null;
  try { remaining = MailApp.getRemainingDailyQuota(); } catch (e) {}
  const assumedLimit = 1500;
  const pct = remaining === null ? 0 : Math.round(((assumedLimit - remaining) / assumedLimit) * 100);
  return { email: { remaining: remaining, usagePct: pct }, maxUsagePct: pct };
}

function handleHealthCheck_() {
  const triggers = ScriptApp.getProjectTriggers().map(function(t) { return t.getHandlerFunction(); });
  const health = {
    time: nowIso_(),
    triggers: triggers,
    dailyTrigger: triggers.indexOf('dailyRun') !== -1,
    quota: getQuotaStatus_(),
    configured: !!(C_().SPREADSHEET_ID && C_().CONFIDENTIAL_SPREADSHEET_ID && C_().ARCHIVE_FOLDER_ID && C_().APP_URL && C_().GPC_EMAIL && C_().ADMIN_EMAIL)
  };
  return ContentService.createTextOutput(JSON.stringify(health)).setMimeType(ContentService.MimeType.JSON);
}
