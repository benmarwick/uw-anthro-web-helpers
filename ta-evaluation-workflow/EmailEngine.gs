function C_() { return getConfig_(); }

const EMAIL_SENDER_NAME_ = 'UW Anthropology TA Evaluations';

const POLICY_LINKS_ = {
  eo28: 'https://policy.uw.edu/directory/po/executive-orders/eo-28-graduate-student-service-appointments/',
  gs51: 'https://grad.uw.edu/policies/5-1-departmental-responsibilities-regarding-instruction-by-tas/',
  contract: 'https://hr.uw.edu/labor/academic-and-student-unions/uaw-ase/ase-contract'
};

/* Gmail options shared by every email: sender name, reply-to and a plain-text body. */
function mailOptions_(params) {
  const options = { name: params.name || EMAIL_SENDER_NAME_ };
  if (params.htmlBody) options.htmlBody = params.htmlBody;
  if (params.attachments) options.attachments = params.attachments;
  if (params.cc) options.cc = params.cc;
  if (params.bcc) options.bcc = params.bcc;
  options.replyTo = params.replyTo || C_().ADMIN_EMAIL;
  return options;
}

function rawSendEmail_(params) {
  GmailApp.sendEmail(params.to, params.subject, params.body || '', mailOptions_(params));
}

function sendEmailSafely_(dlqPayload, params) {
  try {
    GmailApp.sendEmail(params.to, params.subject, params.body || '', mailOptions_(params));
    return { success: true };
  } catch (err) {
    enqueueDeadLetter_(DLQ_ACTIONS.SEND_EMAIL, dlqPayload, err);
    return { success: false };
  }
}

/* ---------- Building blocks for the emails people receive ---------- */

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDueLong_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEEE, MMMM d');
}

function formatDueShort_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEE, MMM d');
}

/* A paragraph with an HTML version and a plain-text version. Use t_() for text and l_() for links. */
function t_(s) { return { html: escapeHtml_(s), text: String(s) }; }
function l_(label, url) { return { html: '<a href="' + url + '" style="color:#4B2E83;">' + escapeHtml_(label) + '</a>', text: label + ' <' + url + '>' }; }
function b_(s) { return { html: '<strong>' + escapeHtml_(s) + '</strong>', text: String(s) }; }
function para_() {
  const pieces = Array.prototype.slice.call(arguments);
  return { html: pieces.map(function(p) { return p.html; }).join(''), text: pieces.map(function(p) { return p.text; }).join('') };
}

/* Lays out an email: greeting, paragraphs, a button with a plain link under it,
   paragraphs after the button, the sign-in note, a reply line and the Evaluation ID. */
function renderEmail_(o) {
  const html = [];
  const text = [];
  html.push('<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A2E;max-width:600px;">');
  html.push('<p>Dear ' + escapeHtml_(o.greetName) + ',</p>');
  text.push('Dear ' + o.greetName + ',', '');
  (o.before || []).forEach(function(p) { html.push('<p>' + p.html + '</p>'); text.push(p.text, ''); });
  if (o.button) {
    html.push('<p style="margin:24px 0 8px;"><a href="' + o.button.link + '" style="display:inline-block;padding:12px 24px;background:#4B2E83;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">' + escapeHtml_(o.button.label) + '</a></p>');
    html.push('<p style="font-size:13px;color:#555;margin-top:0;">Or copy this link into your browser: <a href="' + o.button.link + '" style="color:#4B2E83;word-break:break-all;">' + escapeHtml_(o.button.link) + '</a></p>');
    text.push(o.button.label + ': ' + o.button.link, '');
  }
  (o.after || []).forEach(function(p) { html.push('<p>' + p.html + '</p>'); text.push(p.text, ''); });
  if (o.signInEmail) {
    const note = 'Open the link while signed in to Google as ' + o.signInEmail + '. If you see a sign-in message or "this link is for…", try a private browser window.';
    html.push('<p style="font-size:13px;color:#555;">' + escapeHtml_(note) + '</p>');
    text.push(note, '');
  }
  html.push('<p>Questions? Reply to this email.</p>');
  text.push('Questions? Reply to this email.', '');
  html.push('<hr style="border:none;border-top:1px solid #ddd;"><p style="font-size:12px;color:#666;">UW Department of Anthropology · Evaluation ID: ' + escapeHtml_(o.evaluationId) + '</p></div>');
  text.push('--', 'UW Department of Anthropology · Evaluation ID: ' + o.evaluationId);
  return { htmlBody: html.join('\n'), body: text.join('\n') };
}

/* Why the evaluation matters, with the sources that support each part. */
function whyInstructor_() {
  return para_(
    t_('Why this matters: your evaluation is important to the professional development of our students. UW '), l_('Executive Order 28', POLICY_LINKS_.eo28),
    t_(' asks departments to evaluate graduate appointees and give them feedback regularly, with a chance to respond. Graduate School '),
    l_('Policy 5.1', POLICY_LINKS_.gs51),
    t_(' requires a faculty observation in each of a TA\'s first two quarters, and Anthropology asks for an evaluation every quarter. It is the TA\'s written feedback for this quarter and becomes part of their personnel file ('),
    l_('UAW ASE contract, Article 22', POLICY_LINKS_.contract), t_(').')
  );
}

function whyTa_() {
  return para_(
    t_('Why this matters: this is your chance to add your own account of the quarter before the evaluation is signed. UW '),
    l_('Executive Order 28', POLICY_LINKS_.eo28),
    t_(' says departmental evaluations should allow for student response. The evaluation and your response become part of your personnel file, which you can review, ask to have corrected, and respond to ('),
    l_('UAW ASE contract, Article 22', POLICY_LINKS_.contract), t_(').')
  );
}

/* ---------- The emails ---------- */

function sendProfEvaluationInvite_(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName } = params;
  const link = C_().APP_URL + '?action=prof_eval&token=' + token;
  const due = dueDateForStep_(term, 'prof_eval');

  const subject = 'Action needed by ' + formatDueShort_(due) + ': evaluate your TA ' + taName + ' (' + courseCode + ', ' + term + ')';
  const mail = renderEmail_({
    greetName: profName,
    evaluationId: evaluationId,
    signInEmail: profEmail,
    before: [
      para_(t_('Please evaluate '), b_(taName), t_(', your TA for '), b_(courseCode), t_(' (' + term + '). It takes about ' + C_().EVAL_MINUTES + ' minutes, and your draft saves as you go, so you can stop and come back.')),
      whyInstructor_()
    ],
    button: { label: 'Start the evaluation', link: link },
    after: [
      para_(t_('Please finish by '), b_(formatDueLong_(due)), t_('. ' + taName + ' will then review your evaluation and respond, and you will be asked to sign off. You will both receive the signed PDF.')),
      t_('Please also discuss the evaluation with ' + taName + ', as the department\'s instructions ask.')
    ]
  });

  const emailParams = { to: profEmail, subject: subject, htmlBody: mail.htmlBody, body: mail.body };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendTAResponseInvite_(params) {
  const { evaluationId, token, courseCode, term, profName, taName, taEmail } = params;
  const link = C_().APP_URL + '?action=ta_respond&token=' + token;
  const due = dueDateForStep_(term, 'ta_respond');

  const subject = 'Action needed by ' + formatDueShort_(due) + ': review and respond to your evaluation (' + courseCode + ', ' + term + ')';
  const mail = renderEmail_({
    greetName: taName,
    evaluationId: evaluationId,
    signInEmail: taEmail,
    before: [
      para_(b_(profName), t_(' has completed your TA evaluation for '), b_(courseCode), t_(' (' + term + '). You will see their ratings and comments, and then write three short responses: Context, Self-evaluation and Looking ahead. It takes about ' + C_().EVAL_MINUTES + ' minutes.')),
      whyTa_()
    ],
    button: { label: 'Review and respond', link: link },
    after: [
      para_(t_('Please respond by '), b_(formatDueLong_(due)), t_('. ' + profName + ' will then sign off, and you will both receive the signed PDF.'))
    ]
  });

  const emailParams = { to: taEmail, subject: subject, htmlBody: mail.htmlBody, body: mail.body };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendProfSignInvite_(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName } = params;
  const link = C_().APP_URL + '?action=prof_sign&token=' + token;
  const due = dueDateForStep_(term, 'prof_sign');

  const subject = 'Action needed by ' + formatDueShort_(due) + ': sign off ' + taName + '\'s evaluation (' + courseCode + ', ' + term + ')';
  const mail = renderEmail_({
    greetName: profName,
    evaluationId: evaluationId,
    signInEmail: profEmail,
    before: [
      para_(b_(taName), t_(' has responded to your evaluation for '), b_(courseCode), t_(' (' + term + '). This is the last step: read their response and sign. Nothing in your evaluation needs to change.'))
    ],
    button: { label: 'Review and sign', link: link },
    after: [
      para_(t_('Please sign by '), b_(formatDueLong_(due)), t_('. Within a few minutes of your signature, you and ' + taName + ' will receive the signed PDF.'))
    ]
  });

  const emailParams = { to: profEmail, subject: subject, htmlBody: mail.htmlBody, body: mail.body };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendCompletionEmail_(profEmail, taEmail, pdfBlob, row) {
  const subject = 'Signed: TA evaluation for ' + row.taName + ' (' + row.courseCode + ', ' + row.term + ')';
  const mail = renderEmail_({
    greetName: row.profName + ' and ' + row.taName,
    evaluationId: row.evaluationId,
    before: [
      para_(t_('The TA evaluation for '), b_(row.taName), t_(' in '), b_(row.courseCode), t_(' (' + row.term + ') is complete. The signed PDF is attached, and the department has kept a copy. Nothing more is needed from either of you.')),
      para_(t_('The evaluation is part of the TA\'s personnel file. The TA can review the file, ask for corrections, and attach a short statement in response ('),
        l_('UAW ASE contract, Article 22', POLICY_LINKS_.contract), t_(').'))
    ]
  });
  const htmlBody = mail.htmlBody;
  const options = mailOptions_({ htmlBody: htmlBody, attachments: [pdfBlob] });

  try {
    GmailApp.sendEmail([profEmail, taEmail].join(','), subject, mail.body, options);
    return { success: true };
  } catch (err) {
    // Blob cannot be JSON-serialized into the DLQ; store the Drive file ID and re-fetch on retry.
    enqueueDeadLetter_(DLQ_ACTIONS.SEND_COMPLETION, {
      evaluationId: row.evaluationId,
      profEmail,
      taEmail,
      subject,
      htmlBody,
      body: mail.body,
      fileId: row.finalPdfFileId
    }, err);
    return { success: false };
  }
}

function sendReminderEmail_(params) {
  const { email, name, action, link, evaluationId, courseCode, term, reminderCount, taName, profName, tokenExpiry } = params;
  const started = stepStartFromExpiry_(tokenExpiry);
  const due = dueDateForStep_(term, stageActionForStatus_(action), started);
  const daysWaiting = Math.max(1, Math.floor((Date.now() - started.getTime()) / DAY_MS_));
  const last = reminderCount >= C_().MAX_REMINDERS;

  const steps = {
    PROF_EVAL_PENDING: {
      subject: 'Reminder: evaluate ' + taName + ' by ' + formatDueShort_(due) + ' (' + courseCode + ')',
      what: para_(t_('Your evaluation of '), b_(taName), t_(' for ' + courseCode + ' (' + term + ') has been waiting ' + daysWaiting + ' days. It is important to the professional development of our students, and ' + taName + ' cannot respond until you submit it. It takes about ' + C_().EVAL_MINUTES + ' minutes, and any draft you started is saved.')),
      label: 'Finish the evaluation'
    },
    TA_RESPONSE_PENDING: {
      subject: 'Reminder: respond to your evaluation by ' + formatDueShort_(due) + ' (' + courseCode + ')',
      what: para_(t_('Your response to ' + profName + '\'s evaluation for ' + courseCode + ' (' + term + ') has been waiting ' + daysWaiting + ' days. The evaluation cannot be finalized until you respond. It takes about ' + C_().EVAL_MINUTES + ' minutes.')),
      label: 'Review and respond'
    },
    PROF_SIGN_PENDING: {
      subject: 'Reminder: sign off ' + taName + '\'s evaluation by ' + formatDueShort_(due) + ' (' + courseCode + ')',
      what: para_(t_(taName + ' responded ' + daysWaiting + ' days ago, and the evaluation for ' + courseCode + ' (' + term + ') is waiting for your signature. It only needs your review and signature.')),
      label: 'Review and sign'
    }
  };
  const step = steps[action] || steps.PROF_EVAL_PENDING;

  const mail = renderEmail_({
    greetName: name,
    evaluationId: evaluationId,
    signInEmail: email,
    before: [step.what],
    button: { label: step.label, link: link },
    after: [
      para_(t_('Please finish by '), b_(formatDueLong_(due)), t_('. ' + (last
        ? 'This is the last automatic reminder; after this the coordinator will follow up with you.'
        : 'If you have already done this, you can ignore this email.')))
    ]
  });

  const emailParams = { to: email, subject: step.subject, htmlBody: mail.htmlBody, body: mail.body };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendEscalationEmail_(params) {
  const { adminEmail, evaluationId, courseCode, term, profName, taName, pendingStage, daysOverdue } = params;

  const subject = 'ESCALATION: TA Evaluation Overdue - ' + evaluationId;
  const htmlBody = `
    <p><strong>This evaluation has been escalated due to inactivity.</strong></p>
    <table style="border-collapse:collapse;width:100%;max-width:600px;">
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Evaluation ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${evaluationId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Course</strong></td><td style="padding:8px;border:1px solid #ddd;">${courseCode} (${term})</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Professor</strong></td><td style="padding:8px;border:1px solid #ddd;">${profName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>TA</strong></td><td style="padding:8px;border:1px solid #ddd;">${taName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Pending Stage</strong></td><td style="padding:8px;border:1px solid #ddd;">${pendingStage}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Days Overdue</strong></td><td style="padding:8px;border:1px solid #ddd;">${daysOverdue}</td></tr>
    </table>
    <p>Please follow up with the responsible party.</p>
  `;

  const emailParams = { to: adminEmail, subject, htmlBody, name: 'TA Evaluation System' };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendAdminAlert_(params) {
  const { subject, body } = params;
  const emailParams = {
    to: C_().ADMIN_EMAIL,
    subject: '[ALERT] ' + subject,
    htmlBody: '<pre style="font-family:monospace;white-space:pre-wrap;">' + body + '</pre>',
    name: 'TA Evaluation System'
  };
  return sendEmailSafely_({ emailParams }, emailParams);
}
