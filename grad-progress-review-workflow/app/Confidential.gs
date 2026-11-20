/* ============================================================
   Confidential.gs: the separate spreadsheet for GPC-only text. The main
   review row keeps only a yes/no flag. The reviewer (GPC or alternate) reads it through the web app,
   and every read is logged. The advisor's "advising challenges" note is stored here too and shown
   to the student at acknowledgement.
   ============================================================ */

/* Saves one note. Empty text clears a saved note, so the author can remove it; it never adds a row. */
function writeConfidential_(reviewId, role, field, text) {
  const sheet = C_().SHEETS.CONFIDENTIAL;
  const existing = readTable_(sheet).filter(function(r) { return r.Review_ID === reviewId && r.Field === field; })[0];
  const isEmpty = !String(text || '').trim();
  if (isEmpty && !existing) return false;
  const cleanText = isEmpty ? '' : sanitizeText_(text, 6000);
  const fields = { Review_ID: reviewId, Author_Role: role, Field: field, Text: cleanText, Timestamp: nowIso_() };
  if (existing) updateRow_(sheet, existing._row, fields);
  else appendObjects_(sheet, [fields]);
  return true;
}

/* The author's own saved notes, { field: text }, for reloading their form. Only the listed fields. */
function confidentialFieldsFor_(reviewId, fieldNames) {
  const out = {};
  readTable_(C_().SHEETS.CONFIDENTIAL).forEach(function(r) {
    if (r.Review_ID !== reviewId) return;
    if (fieldNames.indexOf(r.Field) === -1) return;
    out[r.Field] = String(r.Text || '');
  });
  return out;
}

/* { field: text } for one review. Only the reviewer for that student may call this. */
function readConfidentialForReviewer_(review, student, email) {
  if (!canReviewStudent_(email, student)) throw new Error('Not authorized (recusal).');
  const out = {};
  readTable_(C_().SHEETS.CONFIDENTIAL).forEach(function(r) { if (r.Review_ID === review.Review_ID && String(r.Text || '').trim()) out[r.Field] = r.Text; });
  logEvent_({ action: C_().ACTIONS.CONFIDENTIAL_READ, evaluationId: review.Review_ID, actorEmail: email });
  return out;
}

/* The advisor's advising-challenges note, for the student's acknowledgement stage. */
function advisingChallengesFor_(reviewId) {
  const r = readTable_(C_().SHEETS.CONFIDENTIAL).filter(function(x) { return x.Review_ID === reviewId && x.Field === 'advisingChallenges'; })[0];
  return r ? r.Text : '';
}

function hasConfidential_(reviewId) {
  return readTable_(C_().SHEETS.CONFIDENTIAL).some(function(r) { return r.Review_ID === reviewId && (r.Field === 'gpcOnly' || r.Field === 'gpcOnlyAdvising') && String(r.Text || '').trim() !== ''; });
}
