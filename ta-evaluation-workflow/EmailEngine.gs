function C_() { return getConfig_(); }

const EMAIL_SENDER_NAME_ = 'UW Anthropology: TA Evaluations';

const POLICY_LINKS_ = {
  eo28: 'https://policy.uw.edu/directory/po/executive-orders/eo-28-graduate-student-service-appointments/',
  gs51: 'https://grad.uw.edu/policies/5-1-departmental-responsibilities-regarding-instruction-by-tas/',
  contract: 'https://hr.uw.edu/labor/academic-and-student-unions/uaw-ase/ase-contract',
  privacy: 'https://github.com/benmarwick/uw-anthro-web-helpers/blob/main/ta-evaluation-workflow/README.md#privacy-policy'
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

/* Lays out an email: identity banner, greeting, paragraphs, a button with a plain link under it,
   paragraphs after the button, the sign-in note, a reply line and the Evaluation ID. */
function renderEmail_(o) {
  const html = [];
  const text = [];
  const bannerTitle = o.bannerTitle || 'TA / ASE EMPLOYMENT EVALUATION (PERSONNEL FILE)';
  const headerLines = ['=== ' + bannerTitle + ' ==='];
  if (o.role) headerLines.push('Your role: ' + o.role);
  if (o.scope) headerLines.push('Scope: ' + o.scope);
  text.push(headerLines.join('\n'), '');

  html.push('<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A2E;max-width:600px;">');
  html.push(
    '<div style="background:#4B2E83;color:#ffffff;padding:12px 16px;border-radius:6px 6px 0 0;">' +
    '<div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#e8e3d3;">UW Department of Anthropology</div>' +
    '<div style="font-size:16px;font-weight:bold;margin-top:2px;">' + escapeHtml_(bannerTitle) + '</div>' +
    '</div>' +
    '<div style="background:#f3eefc;border:1px solid #d8d8d8;border-top:none;border-left:4px solid #4B2E83;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#1A1A2E;">' +
    (o.role ? '<div><strong>Your role:</strong> ' + escapeHtml_(o.role) + '</div>' : '') +
    (o.scope ? '<div><strong>Scope:</strong> ' + escapeHtml_(o.scope) + '</div>' : '') +
    '</div>'
  );
  html.push('<p>Dear ' + escapeHtml_(o.greetName) + ',</p>');
  text.push('Dear ' + o.greetName + ',', '');
  (o.before || []).forEach(function(p) { html.push('<p>' + p.html + '</p>'); text.push(p.text, ''); });
  if (o.button) {
    html.push('<p style="margin:24px 0 8px;"><a href="' + o.button.link + '" style="display:inline-block;padding:12px 24px;background:#4B2E83;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">' + escapeHtml_(o.button.label) + '</a></p>');
    html.push('<p style="font-size:13px;color:#555;margin-top:0;">Or copy this link into your browser: <a href="' + o.button.link + '" style="color:#4B2E83;word-break:break-all;">' + escapeHtml_(o.button.link) + '</a></p>');
    text.push(o.button.label + ' <' + o.button.link + '>', '');
  }
  (o.after || []).forEach(function(p) { html.push('<p>' + p.html + '</p>'); text.push(p.text, ''); });
  if (o.signInEmail) {
    const note = 'Open the link while signed in to Google as ' + o.signInEmail + '. If you see a sign-in message or "this link is for…", try a private browser window.';
    html.push('<p style="font-size:13px;color:#555;">' + escapeHtml_(note) + '</p>');
    text.push(note, '');
  }
  html.push('<p>Questions? Reply to this email.</p>');
  text.push('Questions? Reply to this email.', '');
  const privacyLink = l_('Privacy Policy', POLICY_LINKS_.privacy);
  html.push('<hr style="border:none;border-top:1px solid #ddd;"><p style="font-size:12px;color:#666;">UW Department of Anthropology · TA Evaluation System (ASE Personnel File) · ' + privacyLink.html + ' · Evaluation ID: ' + escapeHtml_(o.evaluationId) + '</p></div>');
  text.push('--', 'UW Department of Anthropology · TA Evaluation System (ASE Personnel File) · Evaluation ID: ' + o.evaluationId, privacyLink.text);
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

function taScopeSeparation_() {
  return para_(
    t_('What this request is: a '), b_('TA / ASE Employment Evaluation'),
    t_(' of paid teaching assistant job duties for the UAW ASE personnel file. It is separate from Graduate Student Course Feedback (forest-green emails and form for students enrolled in your class for credit) and separate from Graduate Student Annual Reviews (deep-navy emails and form for faculty advisors).')
  );
}

/* What the TA needs to have ready: their time sheet, or an explanation. */
function timesheetNote_() {
  return para_(
    t_('Please also have your '), b_('time sheet'),
    t_(' ready to upload. It only needs to show the hours you have worked up to the day you submit, not the total for the whole quarter. If you don\'t have a time sheet, upload a short document explaining why.')
  );
}

/* ---------- The emails ---------- */

function sendProfEvaluationInvite_(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName } = params;
  const link = C_().APP_URL + '?action=prof_eval&token=' + token;
  const due = dueDateForStep_(term, 'prof_eval');

  const subject = '[TA Evaluation] Action needed by ' + formatDueShort_(due) + ': evaluate your TA ' + taName + ' (' + courseCode + ', ' + term + ')';
  const mail = renderEmail_({
    greetName: profName,
    role: 'Course Instructor / TA Supervisor',
    scope: courseCode + ' (' + term + ') · Paid TA/ASE job evaluation for ' + taName + ' (personnel file)',
    evaluationId: evaluationId,
    signInEmail: profEmail,
    before: [
      para_(t_('Please evaluate '), b_(taName), t_(', your paid Teaching Assistant (TA) for '), b_(courseCode), t_(' (' + term + '). It takes about ' + C_().EVAL_MINUTES + ' minutes, and your draft saves as you go, so you can stop and come back.')),
      taScopeSeparation_(),
      whyInstructor_()
    ],
    button: { label: 'Start TA Evaluation', link: link },
    after: [
      para_(t_('Please finish by '), b_(formatDueLong_(due)), t_('. ' + taName + ' will then review your TA evaluation and respond, and you will be asked to sign off. You, ' + taName + ', and the Graduate Program Coordinator will receive the signed PDF.')),
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

  const subject = '[TA Evaluation] Action needed by ' + formatDueShort_(due) + ': respond to your TA evaluation (' + courseCode + ', ' + term + ')';
  const mail = renderEmail_({
    greetName: taName,
    role: 'Teaching Assistant (ASE)',
    scope: courseCode + ' (' + term + ') · TA/ASE self-evaluation and time sheet (personnel file)',
    evaluationId: evaluationId,
    signInEmail: taEmail,
    before: [
      para_(b_(profName), t_(' has completed your paid TA evaluation for '), b_(courseCode), t_(' (' + term + '). You will see their ratings and comments, and then write three short responses: Context, Self-evaluation and Looking ahead. It takes about ' + C_().EVAL_MINUTES + ' minutes.')),
      para_(t_('This is your '), b_('TA / ASE employment evaluation'), t_(' for the UAW ASE personnel file, separate from Graduate Student Course Feedback and Graduate Student Annual Reviews.')),
      timesheetNote_(),
      whyTa_()
    ],
    button: { label: 'Review and Respond to TA Evaluation', link: link },
    after: [
      para_(t_('Please respond by '), b_(formatDueLong_(due)), t_('. ' + profName + ' will then sign off, and you, ' + profName + ', and the Graduate Program Coordinator will receive the signed PDF.'))
    ]
  });

  const emailParams = { to: taEmail, subject: subject, htmlBody: mail.htmlBody, body: mail.body };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendProfSignInvite_(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName } = params;
  const link = C_().APP_URL + '?action=prof_sign&token=' + token;
  const due = dueDateForStep_(term, 'prof_sign');

  const subject = '[TA Evaluation] Action needed by ' + formatDueShort_(due) + ': sign off TA evaluation for ' + taName + ' (' + courseCode + ', ' + term + ')';
  const mail = renderEmail_({
    greetName: profName,
    role: 'Course Instructor / TA Supervisor',
    scope: courseCode + ' (' + term + ') · Final sign-off on TA/ASE evaluation for ' + taName,
    evaluationId: evaluationId,
    signInEmail: profEmail,
    before: [
      para_(b_(taName), t_(' has responded to your TA evaluation for '), b_(courseCode), t_(' (' + term + '). This is the last step: read their response, download their time sheet if you want to check it, and sign. Nothing in your evaluation needs to change.')),
      taScopeSeparation_()
    ],
    button: { label: 'Review and Sign TA Evaluation', link: link },
    after: [
      para_(t_('Please sign by '), b_(formatDueLong_(due)), t_('. Within a few minutes of your signature, you, ' + taName + ', and the Graduate Program Coordinator will receive the signed TA evaluation PDF.'))
    ]
  });

  const emailParams = { to: profEmail, subject: subject, htmlBody: mail.htmlBody, body: mail.body };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

/* Extra recipient(s) copied on the signed completion PDF, excluding anyone already in To. */
function completionCc_(profEmail, taEmail) {
  const raw = C_().COMPLETION_CC_EMAIL;
  if (!raw) return '';
  const seen = {};
  [profEmail, taEmail].forEach(function(addr) {
    const n = normEmail_(addr);
    if (n) seen[n] = true;
  });
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  const out = [];
  list.forEach(function(addr) {
    const trimmed = String(addr || '').trim();
    const n = normEmail_(trimmed);
    if (n && !seen[n]) {
      seen[n] = true;
      out.push(trimmed);
    }
  });
  return out.join(',');
}

function sendCompletionEmail_(profEmail, taEmail, pdfBlob, row) {
  const subject = '[TA Evaluation] Signed: ' + row.taName + ' (' + row.courseCode + ', ' + row.term + ')';
  const mail = renderEmail_({
    greetName: row.profName + ' and ' + row.taName,
    role: 'Course Instructor and Teaching Assistant (ASE)',
    scope: row.courseCode + ' (' + row.term + ') · Completed TA/ASE evaluation PDF',
    evaluationId: row.evaluationId,
    before: [
      para_(t_('The TA evaluation for '), b_(row.taName), t_(' in '), b_(row.courseCode), t_(' (' + row.term + ') is complete. The signed PDF is attached, and the department has kept a copy. Nothing more is needed from either of you.')),
      para_(t_('The evaluation is part of the TA\'s personnel file. The TA can review the file, ask for corrections, and attach a short statement in response ('),
        l_('UAW ASE contract, Article 22', POLICY_LINKS_.contract), t_(').'))
    ]
  });
  const htmlBody = mail.htmlBody;
  const cc = completionCc_(profEmail, taEmail);
  const options = mailOptions_({ htmlBody: htmlBody, attachments: [pdfBlob], cc: cc });

  try {
    GmailApp.sendEmail([profEmail, taEmail].join(','), subject, mail.body, options);
    return { success: true };
  } catch (err) {
    // Blob cannot be JSON-serialized into the DLQ; store the Drive file ID and re-fetch on retry.
    enqueueDeadLetter_(DLQ_ACTIONS.SEND_COMPLETION, {
      evaluationId: row.evaluationId,
      profEmail,
      taEmail,
      cc,
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
      subject: '[TA Evaluation] Reminder: evaluate your TA ' + taName + ' by ' + formatDueShort_(due) + ' (' + courseCode + ')',
      role: 'Course Instructor / TA Supervisor',
      scope: courseCode + ' (' + term + ') · Paid TA/ASE job evaluation for ' + taName,
      what: para_(t_('Your TA evaluation of '), b_(taName), t_(' for ' + courseCode + ' (' + term + ') has been waiting ' + daysWaiting + ' days. It is important to the professional development of our students, and ' + taName + ' cannot respond until you submit it. It takes about ' + C_().EVAL_MINUTES + ' minutes, and any draft you started is saved.')),
      label: 'Finish TA Evaluation',
      facultyScope: true
    },
    TA_RESPONSE_PENDING: {
      subject: '[TA Evaluation] Reminder: respond to your TA evaluation by ' + formatDueShort_(due) + ' (' + courseCode + ')',
      role: 'Teaching Assistant (ASE)',
      scope: courseCode + ' (' + term + ') · TA/ASE self-evaluation and time sheet',
      what: para_(t_('Your response to ' + profName + '\'s TA evaluation for ' + courseCode + ' (' + term + ') has been waiting ' + daysWaiting + ' days. The TA evaluation cannot be finalized until you respond. It takes about ' + C_().EVAL_MINUTES + ' minutes.')),
      label: 'Review and Respond to TA Evaluation',
      facultyScope: false
    },
    PROF_SIGN_PENDING: {
      subject: '[TA Evaluation] Reminder: sign off TA evaluation for ' + taName + ' by ' + formatDueShort_(due) + ' (' + courseCode + ')',
      role: 'Course Instructor / TA Supervisor',
      scope: courseCode + ' (' + term + ') · Final sign-off on TA/ASE evaluation for ' + taName,
      what: para_(t_(taName + ' responded ' + daysWaiting + ' days ago, and the TA evaluation for ' + courseCode + ' (' + term + ') is waiting for your final signature. It only needs your review and signature.')),
      label: 'Review and Sign TA Evaluation',
      facultyScope: true
    }
  };
  const step = steps[action] || steps.PROF_EVAL_PENDING;

  const before = [step.what];
  if (step.facultyScope) before.push(taScopeSeparation_());
  if (action === 'TA_RESPONSE_PENDING') before.push(timesheetNote_());

  const mail = renderEmail_({
    greetName: name,
    role: step.role,
    scope: step.scope,
    evaluationId: evaluationId,
    signInEmail: email,
    before: before,
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

  const subject = '[TA Evaluation] ESCALATION: TA Evaluation Overdue - ' + evaluationId;
  const htmlBody = `
    <p><strong>This TA/ASE evaluation has been escalated due to inactivity.</strong></p>
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

  const emailParams = { to: adminEmail, subject, htmlBody, name: EMAIL_SENDER_NAME_ };
  return sendEmailSafely_({ evaluationId, emailParams }, emailParams);
}

function sendAdminAlert_(params) {
  const { subject, body } = params;
  const emailParams = {
    to: C_().ADMIN_EMAIL,
    subject: '[TA Evaluation] [ALERT] ' + subject,
    htmlBody: '<pre style="font-family:monospace;white-space:pre-wrap;">' + body + '</pre>',
    name: EMAIL_SENDER_NAME_
  };
  return sendEmailSafely_({ emailParams }, emailParams);
}
