/* ============================================================
   EmailEngine.gs: sending. Every text comes from CoreEmail.gs (build-spec.md §3). A failed send is
   queued in the dead-letter queue and retried.
   ============================================================ */

function mailOptions_(p) {
  const o = { htmlBody: p.htmlBody, name: 'UW Anthropology Graduate Program' };
  if (C_().GPC_EMAIL) o.replyTo = C_().GPC_EMAIL;
  return o;
}

function rawSendEmail_(p) {
  GmailApp.sendEmail(p.to, p.subject, p.body || '', mailOptions_(p));
}

/* Renders and sends one template. to: an address; firstName: the greeting; reference: shown in the footer. */
function sendTemplate_(id, to, firstName, params, reference) {
  const out = renderEmailTemplate_(id, params, {
    firstName: firstName || 'colleague', gpcName: C_().GPC_NAME || 'The Graduate Program Coordinator',
    privacyUrl: C_().PRIVACY_URL, reference: reference || id
  });
  const emailParams = { to: to, subject: out.subject, body: out.text, htmlBody: out.html };
  try {
    rawSendEmail_(emailParams);
    logInfo_('EmailEngine.sendTemplate', 'Sent ' + id, { template: id, reference: reference });
  } catch (err) {
    logError_('EmailEngine.sendTemplate', 'Send failed for ' + id, { template: id, error: err.message });
    enqueueDeadLetter_(DLQ_ACTIONS.SEND_EMAIL, { emailParams: emailParams }, err);
  }
  return out;
}

/* First name for a greeting: the Students sheet's preferred name, else the part of the address before the @. */
function firstNameFor_(email) {
  const s = findOne_(C_().SHEETS.STUDENTS, 'Email', normEmail_(email));
  if (s && s.Preferred_First) return s.Preferred_First;
  const i = findOne_(C_().SHEETS.INSTRUCTORS, 'Email', normEmail_(email));
  if (i && i.TS_Name && String(i.TS_Name).indexOf(',') !== -1) {
    const given = String(i.TS_Name).split(',')[1].trim().split(/\s+/)[0];
    if (given) return given.charAt(0).toUpperCase() + given.slice(1).toLowerCase();
  }
  return 'colleague';
}

function appUrl_(params) {
  const base = C_().APP_URL;
  const q = Object.keys(params).map(function(k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  return base + (q ? '?' + q : '');
}
