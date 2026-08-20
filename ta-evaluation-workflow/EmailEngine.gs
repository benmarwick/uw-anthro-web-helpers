function C() { return getConfig(); }

function rawSendEmail(params) {
  const { to, subject, htmlBody, body, name, attachments, cc, bcc } = params;
  const options = {};
  if (htmlBody) options.htmlBody = htmlBody;
  if (name) options.name = name;
  if (attachments) options.attachments = attachments;
  if (cc) options.cc = cc;
  if (bcc) options.bcc = bcc;
  GmailApp.sendEmail(to, subject, body || '', options);
}

function sendEmailSafely(dlqPayload, params) {
  try {
    const { to, subject, htmlBody, body, name, attachments, cc, bcc } = params;
    const options = {};
    if (htmlBody) options.htmlBody = htmlBody;
    if (name) options.name = name;
    if (attachments) options.attachments = attachments;
    if (cc) options.cc = cc;
    if (bcc) options.bcc = bcc;
    GmailApp.sendEmail(to, subject, body || '', options);
    return { success: true };
  } catch (err) {
    enqueueDeadLetter(DLQ_ACTIONS.SEND_EMAIL, dlqPayload, err);
    return { success: false };
  }
}

function sendProfEvaluationInvite(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName, taEmail } = params;
  const link = C().APP_URL + '?action=prof_eval&token=' + token;

  const subject = 'TA Evaluation Request: ' + taName + ' - ' + courseCode + ' (' + term + ')';
  const htmlBody = `
    <p>Dear ${profName},</p>
    <p>You are invited to evaluate Teaching Assistant <strong>${taName}</strong> for <strong>${courseCode}</strong> (${term}).</p>
    <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2c3e50;color:#fff;text-decoration:none;border-radius:4px;">Start Evaluation</a></p>
    <p>This link expires in ${C().TOKEN_TTL_DAYS} days. Your UW Google account will be used for authentication.</p>
    <hr>
    <p style="font-size:12px;color:#666;">Evaluation ID: ${evaluationId}</p>
  `;

  const emailParams = { to: profEmail, subject, htmlBody, name: 'TA Evaluation System' };
  return sendEmailSafely({ evaluationId, emailParams }, emailParams);
}

function sendTAResponseInvite(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName, taEmail } = params;
  const link = C().APP_URL + '?action=ta_respond&token=' + token;

  const subject = 'Your TA Evaluation Response Required: ' + courseCode + ' (' + term + ')';
  const htmlBody = `
    <p>Dear ${taName},</p>
    <p>Professor <strong>${profName}</strong> has completed your evaluation for <strong>${courseCode}</strong> (${term}). Please review the feedback and provide your response.</p>
    <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2c3e50;color:#fff;text-decoration:none;border-radius:4px;">View & Respond</a></p>
    <p>This link expires in ${C().TOKEN_TTL_DAYS} days.</p>
    <hr>
    <p style="font-size:12px;color:#666;">Evaluation ID: ${evaluationId}</p>
  `;

  const emailParams = { to: taEmail, subject, htmlBody, name: 'TA Evaluation System' };
  return sendEmailSafely({ evaluationId, emailParams }, emailParams);
}

function sendProfSignInvite(params) {
  const { evaluationId, token, courseCode, term, profName, profEmail, taName, taEmail } = params;
  const link = C().APP_URL + '?action=prof_sign&token=' + token;

  const subject = 'Final Sign-off Required: TA Evaluation for ' + taName + ' - ' + courseCode;
  const htmlBody = `
    <p>Dear ${profName},</p>
    <p>TA <strong>${taName}</strong> has responded to your evaluation for <strong>${courseCode}</strong> (${term}). Please review the complete evaluation and provide your final sign-off.</p>
    <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2c3e50;color:#fff;text-decoration:none;border-radius:4px;">Review & Sign</a></p>
    <p>This link expires in ${C().TOKEN_TTL_DAYS} days.</p>
    <hr>
    <p style="font-size:12px;color:#666;">Evaluation ID: ${evaluationId}</p>
  `;

  const emailParams = { to: profEmail, subject, htmlBody, name: 'TA Evaluation System' };
  return sendEmailSafely({ evaluationId, emailParams }, emailParams);
}

function sendCompletionEmail(profEmail, taEmail, pdfBlob, row) {
  const subject = 'Completed TA Evaluation: ' + row.taName + ' - ' + row.courseCode + ' (' + row.term + ')';
  const htmlBody = `
    <p>The TA evaluation for <strong>${row.taName}</strong> in <strong>${row.courseCode}</strong> (${row.term}) has been finalized.</p>
    <p>The signed PDF is attached. Both the Professor (${row.profName}) and TA have provided digital signatures.</p>
    <hr>
    <p style="font-size:12px;color:#666;">Evaluation ID: ${row.evaluationId}</p>
  `;

  const emailParams = {
    to: [profEmail, taEmail].join(','),
    subject: subject,
    htmlBody: htmlBody,
    attachments: [pdfBlob],
    name: 'TA Evaluation System'
  };

  try {
    const options = { htmlBody, attachments: [pdfBlob], name: 'TA Evaluation System' };
    GmailApp.sendEmail([profEmail, taEmail].join(','), subject, '', options);
    return { success: true };
  } catch (err) {
    // Blob cannot be JSON-serialized into the DLQ; store the Drive file ID and re-fetch on retry.
    enqueueDeadLetter(DLQ_ACTIONS.SEND_COMPLETION, {
      evaluationId: row.evaluationId,
      profEmail,
      taEmail,
      subject,
      htmlBody,
      row,
      fileId: row.finalPdfFileId
    }, err);
    return { success: false };
  }
}

function sendReminderEmail(params) {
  const { email, name, action, link, evaluationId, courseCode, term, reminderCount } = params;
  const stageLabels = {
    PROF_EVAL_PENDING: 'Professor Evaluation',
    TA_RESPONSE_PENDING: 'TA Response',
    PROF_SIGN_PENDING: 'Professor Final Sign-off'
  };
  const stage = stageLabels[action] || action;

  const subject = 'Reminder #' + reminderCount + ': ' + stage + ' Due - ' + courseCode + ' (' + term + ')';
  const htmlBody = `
    <p>Dear ${name},</p>
    <p>This is reminder #${reminderCount} for the <strong>${stage}</strong> for <strong>${courseCode}</strong> (${term}).</p>
    <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2c3e50;color:#fff;text-decoration:none;border-radius:4px;">Complete Now</a></p>
    <p>If you have already completed this step, please disregard this reminder.</p>
    <hr>
    <p style="font-size:12px;color:#666;">Evaluation ID: ${evaluationId}</p>
  `;

  const emailParams = { to: email, subject, htmlBody, name: 'TA Evaluation System' };
  return sendEmailSafely({ evaluationId, emailParams }, emailParams);
}

function sendEscalationEmail(params) {
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
  return sendEmailSafely({ evaluationId, emailParams }, emailParams);
}

function sendAdminAlert(params) {
  const { subject, body } = params;
  const emailParams = {
    to: C().ADMIN_EMAIL,
    subject: '[ALERT] ' + subject,
    htmlBody: '<pre style="font-family:monospace;white-space:pre-wrap;">' + body + '</pre>',
    name: 'TA Evaluation System'
  };
  return sendEmailSafely({ emailParams }, emailParams);
}
