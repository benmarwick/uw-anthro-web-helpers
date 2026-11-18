/* ============================================================
   Security.gs: who is calling, what they may see, and input cleaning.
   The web app runs as the system account and checks the signed-in user on every call, so recusal is
   enforced in the app (annual review plan, principle 5).
   ============================================================ */

/* ---------- Rate limit and input cleaning (from the TA system) ---------- */

function checkRateLimit_(identifier, action, maxRequests) {
  const max = maxRequests || C_().SECURITY.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = C_().SECURITY.RATE_LIMIT_WINDOW_MS;
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(action) + '|' + String(identifier)));
  const now = Date.now();
  let hits = [];
  const cached = cache.get(key);
  if (cached) { try { hits = JSON.parse(cached).filter(function(t) { return t > now - windowMs; }); } catch (e) { hits = []; } }
  if (hits.length >= max) return { allowed: false };
  hits.push(now);
  cache.put(key, JSON.stringify(hits), Math.ceil(windowMs / 1000));
  return { allowed: true };
}

/* Text as typed: length-capped, control characters removed. Escaping happens on output. */
function sanitizeText_(input, maxLength, allowNewlines) {
  if (input === null || input === undefined) return '';
  let out = String(input).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (allowNewlines === false) out = out.replace(/[\n\t]+/g, ' ');
  const max = maxLength || C_().SECURITY.SANITIZE_MAX_LENGTH;
  return out.length > max ? out.substring(0, max) : out;
}

/* Cleans a nested payload: strings capped, arrays limited to 40 rows, at most 3 levels deep. */
function sanitizeDeep_(value, depth) {
  depth = depth || 0;
  if (depth > 3) return '';
  if (Array.isArray(value)) return value.slice(0, 40).map(function(v) { return sanitizeDeep_(v, depth + 1); });
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).slice(0, 80).forEach(function(k) {
      if (/^[A-Za-z0-9_]{1,60}$/.test(k)) out[k] = sanitizeDeep_(value[k], depth + 1);
    });
    return out;
  }
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  return sanitizeText_(value, 6000, true);
}

/* ---------- Identity ---------- */

function activeEmail_() {
  try { return normEmail_(Session.getActiveUser().getEmail()); } catch (e) { return ''; }
}

function isAdmin_(email) { return !!email && email === normEmail_(C_().ADMIN_EMAIL); }
function isGpc_(email) { return !!email && email === normEmail_(C_().GPC_EMAIL); }
function isAlternate_(email) { return !!email && email === normEmail_(C_().ALTERNATE_EMAIL); }

function coordinatorSubfields_(email) {
  const map = C_().SUBFIELD_COORDINATORS || {};
  return Object.keys(map).filter(function(k) { return normEmail_(map[k]) === email; });
}

/* The GPC is recused from a student they advise, co-advise or chair (principle 5). */
function gpcRecusedFor_(student) {
  const gpc = normEmail_(C_().GPC_EMAIL);
  return splitList_(student.Advisor_Emails).indexOf(gpc) !== -1 || normEmail_(student.Chair_Email) === gpc;
}

/* Who does the GPC's work for this student. */
function reviewerFor_(student) {
  if (!gpcRecusedFor_(student)) return normEmail_(C_().GPC_EMAIL);
  return normEmail_(student.Alternate_Reviewer) || normEmail_(C_().ALTERNATE_EMAIL);
}

function canReviewStudent_(email, student) {
  return !!email && email === reviewerFor_(student);
}

/* Menu items and the Roster page: the administrator, or the GPC. */
function assertAdminOrGpc_() {
  const e = activeEmail_();
  if (!isAdmin_(e) && !isGpc_(e)) throw new Error('Only the Graduate Student Administrator or the GPC can do this.');
  return e;
}

function assertAdmin_() {
  const e = activeEmail_();
  if (!isAdmin_(e)) throw new Error('Only the Graduate Student Administrator can do this.');
  return e;
}

/* Trigger handlers: the administrator, or one of this project's own triggers. */
function assertTriggerOrAdmin_(e, handlerName) {
  const active = activeEmail_();
  if (active && isAdmin_(active)) return;
  const uid = e && e.triggerUid ? String(e.triggerUid) : '';
  if (!active && uid && ScriptApp.getProjectTriggers().some(function(t) {
    return String(t.getUniqueId()) === uid && t.getHandlerFunction() === handlerName;
  })) return;
  throw new Error('Not authorized.');
}

/* ---------- Tokens ---------- */

const TOKEN_RE_ = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTokenShape_(token) { return typeof token === 'string' && TOKEN_RE_.test(token); }

function newToken_() {
  return { token: Utilities.getUuid(), expiry: new Date(Date.now() + C_().TOKEN_TTL_DAYS * 86400000).toISOString() };
}

function isExpired_(iso) { return !iso || new Date(iso).getTime() < Date.now(); }

/* ---------- Annual review stage access ---------- */

const STAGE_OF_STATUS_ = {
  STUDENT_PENDING: 'student', ADVISOR_PENDING: 'advisor', STUDENT_ACK_PENDING: 'ack', PROGRAM_PENDING: 'program'
};

/* Fields each stage may write. Anything else in a submission is dropped. */
const STAGE_FIELDS_ = {
  student: PDF_FIELDS_.student.concat(['careerCheckin', 'mentoringMap', 'skillsAssessment', 'gpcOnly', 'gpcOnlyAdvising', 'actualMeetings']),
  advisor: PDF_FIELDS_.advisor.concat(['careerSkillsComment', 'advisingChallenges', 'checkinMonths', 'verdict', 'benchmarkProgress']),
  program: ['finalRating', 'overrideReason', 'letterText', 'calibrationNotes', 'statusAction', 'fundingPriority', 'alertQuarter', 'timeLimitDecision'],
  ack: PDF_FIELDS_.response
};

/* Development modules go to Development_Payload; GPC-only text goes to the Confidential spreadsheet. */
const DEVELOPMENT_FIELDS_ = ['careerCheckin', 'mentoringMap', 'skillsAssessment', 'careerSkillsComment'];
const CONFIDENTIAL_STAGE_FIELDS_ = ['gpcOnly', 'gpcOnlyAdvising', 'advisingChallenges', 'calibrationNotes'];

function pickStageFields_(stage, payload) {
  const out = {};
  (STAGE_FIELDS_[stage] || []).forEach(function(k) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, k)) out[k] = payload[k];
  });
  return sanitizeDeep_(out);
}

/* Checks the signed-in user against the review's current stage. Returns { ok, email, stage } or { ok:false, error }. */
function checkReviewAccess_(review) {
  const email = activeEmail_();
  if (!email) return { ok: false, error: 'Sign in with your UW Google account to open this review.' };
  const stage = STAGE_OF_STATUS_[review.Status];
  if (!stage || stage === 'program') return { ok: false, error: 'This step is not open for input.' };
  if (stage === 'student' || stage === 'ack') {
    if (email !== normEmail_(review.Student_Email)) return { ok: false, error: 'This link is for the student. You are signed in as ' + email + '.' };
  } else if (splitList_(review.Advisor_Emails).indexOf(email) === -1) {
    return { ok: false, error: 'This link is for the advisor. You are signed in as ' + email + '.' };
  }
  return { ok: true, email: email, stage: stage };
}
