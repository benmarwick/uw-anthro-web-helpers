/* ============================================================
   Metrics.gs: program metrics (annual review plan §9.5). Only counts are reported, and every count
   from 1 to 4 is shown as "<5" (suppressSmallCounts_ in CoreRecords.gs).
   ============================================================ */

function computeMetrics_() {
  const S = C_().SHEETS, year = C_().CYCLE_YEAR, out = [];
  const add = function(metric, table) {
    const t = suppressSmallCounts_(table, 5);
    Object.keys(t).forEach(function(g) { out.push({ Metric: metric, Group: g, Value: t[g], Computed_At: nowIso_() }); });
  };
  const students = {};
  readTable_(S.STUDENTS).forEach(function(s) { students[normEmail_(s.Email)] = s; });
  const reviews = readTable_(S.REVIEWS).filter(function(r) { return r.Type === 'ANNUAL' && Number(r.Cycle) === year; });

  const byStatus = {};
  reviews.forEach(function(r) { byStatus[r.Status] = (byStatus[r.Status] || 0) + 1; });
  add('Annual reviews by status, ' + year, byStatus);

  const ratingByYear = {}, ratingBySubfield = {};
  reviews.forEach(function(r) {
    const rating = parseJson_(r.Program_Payload).finalRating;
    if (!rating) return;
    const s = students[normEmail_(r.Student_Email)] || {};
    const y = 'Year ' + yearInProgram_(s.Entry_Quarter, 'SPR' + year) + ': ' + rating;
    ratingByYear[y] = (ratingByYear[y] || 0) + 1;
    const sf = (s.Subfield || 'Unassigned') + ': ' + rating;
    ratingBySubfield[sf] = (ratingBySubfield[sf] || 0) + 1;
  });
  add('Final rating by year in program, ' + year, ratingByYear);
  add('Final rating by subfield, ' + year, ratingBySubfield);

  /* Students who left within a year of a concern rating (decision adopted 17 Nov 2026; Lindo et al. 2010). */
  const left = {};
  readTable_(S.REVIEWS).forEach(function(r) {
    if (r.Type !== 'ANNUAL' || Number(r.Cycle) !== year - 1) return;
    const rating = parseJson_(r.Program_Payload).finalRating;
    if (rating !== 'Satisfactory with concerns' && rating !== 'Unsatisfactory') return;
    const s = students[normEmail_(r.Student_Email)] || {};
    const k = s.Status === 'LEFT' ? 'Left the program' : 'Still enrolled';
    left[k] = (left[k] || 0) + 1;
  });
  add('After a concern rating in ' + (year - 1), left);

  /* Course feedback. */
  const reqs = readTable_(S.REQUESTS), comments = readTable_(S.COMMENTS);
  const resp = {}, contact = {}, minutes = {}, returned = {}, flags = {};
  reqs.forEach(function(r) {
    if (['SENT', 'DRAFT', 'SUBMITTED', 'CLOSED'].indexOf(r.Status) === -1) return;
    const k = quarterLabel_(r.Quarter);
    resp[k + ': pages sent'] = (resp[k + ': pages sent'] || 0) + 1;
    if (r.Submitted_At) resp[k + ': pages submitted'] = (resp[k + ': pages submitted'] || 0) + 1;
    if (r.Minutes_Bucket) { const m = k + ': ' + r.Minutes_Bucket + ' minutes'; minutes[m] = (minutes[m] || 0) + 1; }
  });
  comments.forEach(function(c) {
    if (c.Status === 'DRAFT') return;
    const k = quarterLabel_(c.Quarter);
    const cc = k + ': ' + (c.Contact === 'enough' ? 'commented' : 'not enough contact or covered elsewhere');
    contact[cc] = (contact[cc] || 0) + 1;
    if (c.Returned_Reason) returned[k] = (returned[k] || 0) + 1;
    if (c.Followup_Flag === true || c.Followup_Flag === 'TRUE') flags[k] = (flags[k] || 0) + 1;
  });
  add('Course feedback response', resp);
  add('Course feedback contact', contact);
  add('Course feedback minutes per page', minutes);
  add('Course feedback comments returned for revision', returned);
  add('Course feedback follow-up flags', flags);

  const sheet = getSheetCached_(S.METRICS);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  invalidateTable_(S.METRICS);
  appendObjects_(S.METRICS, out);
  return out.length;
}
