/* ============================================================
   CoreDates.gs: calendar rules. Pure functions (no Google services), tested in tests/run.js.
   Dates are ISO strings 'YYYY-MM-DD' and calendar arithmetic is done in UTC, so the result never
   depends on the server's time zone.
   ============================================================ */

/* First day of instruction, last day of instruction, last day of final examinations.
   Source: UW Office of the Registrar, Academic Calendar Summaries,
   https://www.washington.edu/students/reg/begendcal.html (read 17 Nov 2026). Summer has no
   separate finals week, so its third date is the last day of the full term. Add years as the
   Registrar publishes them. */
var QUARTER_CALENDAR_ = {
  WIN2026: ['2026-01-05', '2026-03-13', '2026-03-20'],
  SPR2026: ['2026-03-30', '2026-06-05', '2026-06-12'],
  SUM2026: ['2026-06-22', '2026-08-21', '2026-08-21'],
  AUT2026: ['2026-09-30', '2026-12-11', '2026-12-18'],
  WIN2027: ['2027-01-04', '2027-03-12', '2027-03-19'],
  SPR2027: ['2027-03-29', '2027-06-04', '2027-06-11'],
  SUM2027: ['2027-06-21', '2027-08-20', '2027-08-20'],
  AUT2027: ['2027-09-29', '2027-12-10', '2027-12-17'],
  WIN2028: ['2028-01-03', '2028-03-10', '2028-03-17'],
  SPR2028: ['2028-03-27', '2028-06-02', '2028-06-09'],
  SUM2028: ['2028-06-20', '2028-08-18', '2028-08-18'],
  AUT2028: ['2028-09-27', '2028-12-08', '2028-12-15'],
  WIN2029: ['2029-01-03', '2029-03-09', '2029-03-16'],
  SPR2029: ['2029-03-26', '2029-06-01', '2029-06-08']
};

/* University holidays on weekdays, derived from the usual observance rules (a Saturday holiday
   is observed on the Friday before, a Sunday one on the Monday after). These were computed, not
   copied from UW's published list: check them against it each year. */
var UW_HOLIDAYS_ = [
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07',
  '2026-11-11', '2026-11-26', '2026-11-27', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06',
  '2027-11-11', '2027-11-25', '2027-11-26', '2027-12-24', '2027-12-31',
  '2028-01-17', '2028-02-21', '2028-05-29', '2028-06-19', '2028-07-04', '2028-09-04',
  '2028-11-10', '2028-11-23', '2028-11-24', '2028-12-25'
];

var QUARTER_NAMES_ = { AUT: 'Autumn', WIN: 'Winter', SPR: 'Spring', SUM: 'Summer' };

/* 'AUTUMN 2026', 'Autumn 2026', 'AUT2026', 'aut 2026', 'Fall 2026' -> 'AUT2026'; anything else -> null. */
function quarterCode_(label) {
  var m = String(label || '').trim().match(/^(autumn|aut|fall|winter|win|spring|spr|summer|sum)\s*(\d{4})$/i);
  if (!m) return null;
  var q = m[1].toLowerCase();
  var code = /^(aut|fall)/.test(q) ? 'AUT' : /^win/.test(q) ? 'WIN' : /^spr/.test(q) ? 'SPR' : 'SUM';
  return code + m[2];
}

/* 'AUT2026' -> 'Autumn 2026'. */
function quarterLabel_(code) {
  var m = String(code || '').match(/^(AUT|WIN|SPR|SUM)(\d{4})$/);
  return m ? QUARTER_NAMES_[m[1]] + ' ' + m[2] : String(code || '');
}

function isoToUtc_(iso) {
  var p = String(iso).split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
}

function utcToIso_(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays_(iso, n) {
  return utcToIso_(isoToUtc_(iso) + n * 86400000);
}

/* 0 = Sunday ... 6 = Saturday. */
function weekday_(iso) {
  return new Date(isoToUtc_(iso)).getUTCDay();
}

function daysBetween_(fromIso, toIso) {
  return Math.round((isoToUtc_(toIso) - isoToUtc_(fromIso)) / 86400000);
}

function isBusinessDay_(iso) {
  var d = weekday_(iso);
  return d !== 0 && d !== 6 && UW_HOLIDAYS_.indexOf(iso) === -1;
}

/* The nth business day counting from startIso (startIso itself counts when it is a business day). */
function nthBusinessDay_(startIso, n) {
  var d = startIso, count = 0;
  for (var guard = 0; guard < 400; guard++) {
    if (isBusinessDay_(d)) { count++; if (count === n) return d; }
    d = addDays_(d, 1);
  }
  throw new Error('nthBusinessDay_: no result');
}

/* n business days before iso (iso itself not counted). */
function businessDaysBefore_(iso, n) {
  var d = iso, count = 0;
  for (var guard = 0; guard < 400; guard++) {
    d = addDays_(d, -1);
    if (isBusinessDay_(d)) { count++; if (count === n) return d; }
  }
  throw new Error('businessDaysBefore_: no result');
}

function quarterDates_(code) {
  var c = QUARTER_CALENDAR_[code];
  if (!c) throw new Error('No calendar for ' + code + '. Add it to QUARTER_CALENDAR_ in CoreDates.gs.');
  return { firstDay: c[0], lastInstruction: c[1], finalsEnd: c[2] };
}

/* Grades are due "at 5 p.m. on the Tuesday following the final day of the quarter" (Registrar). */
function gradeDeadline_(code) {
  var d = addDays_(quarterDates_(code).finalsEnd, 1);
  while (weekday_(d) !== 2) d = addDays_(d, 1);
  return d;
}

/* The course feedback page for a quarter (course-feedback plan §5.4):
   opens the Monday of finals week; closes on a Friday at least 10 days after the grade deadline
   (moved a week later if that Friday is a holiday); reminders the Wednesday after grades are due
   and three days before the due date; comments released 7 days after the page closes, or the
   number of days in releaseOffsets for that quarter type (spring: 14, course-feedback plan §5.4). */
function courseFeedbackWindow_(code, releaseOffsets) {
  var q = quarterDates_(code);
  var opens = addDays_(q.finalsEnd, -4);
  while (weekday_(opens) !== 1) opens = addDays_(opens, -1);
  var grades = gradeDeadline_(code);
  var due = addDays_(grades, 10);
  while (weekday_(due) !== 5) due = addDays_(due, 1);
  while (!isBusinessDay_(due)) due = addDays_(due, 7);
  var offsets = releaseOffsets || {};
  var type = code.slice(0, 3);
  var release = addDays_(due, offsets[type] !== undefined ? offsets[type] : 7);
  return {
    quarter: code,
    opens: opens,
    gradesDue: grades,
    reminders: [addDays_(grades, 1), addDays_(due, -3)],
    due: due,
    release: release
  };
}

/* Friday of spring week N (week 1 starts on the first day of spring instruction, a Monday). */
function springWeekFriday_(year, week) {
  var start = quarterDates_('SPR' + year).firstDay;
  var monday = start;
  while (weekday_(monday) !== 1) monday = addDays_(monday, -1);
  return addDays_(monday, (week - 1) * 7 + 4);
}

/* The annual review calendar for the spring of `year` (annual review plan §4.4). */
function annualCycleDates_(year) {
  var launch = quarterDates_('SPR' + year).firstDay;
  var letters = springWeekFriday_(year, 9);
  return {
    launch: launch,
    recordRelease: springWeekFriday_(year, 2),
    studentDue: springWeekFriday_(year, 4),
    advisorDue: springWeekFriday_(year, 6),
    calibrationFrom: addDays_(springWeekFriday_(year, 7), -4),
    calibrationTo: springWeekFriday_(year, 8),
    lettersRelease: letters,
    ackDue: addDays_(letters, 14)
  };
}

/* The Alert recommendation deadline for a quarter: the 10th business day of that quarter
   (Policy 3.7.3), the 15th by petition, and a reminder 5 business days before the 10th. */
function alertDeadline_(code) {
  var first = quarterDates_(code).firstDay;
  var tenth = nthBusinessDay_(first, 10);
  return { quarter: code, due: tenth, petitionUntil: nthBusinessDay_(first, 15), remindOn: businessDaysBefore_(tenth, 5) };
}

/* The quarter an Alert decided in spring `year` takes effect: autumn by default, because
   Anthropology does not require summer registration (annual review plan §4.4). */
function defaultAlertQuarter_(springYear, startInSummer) {
  return (startInSummer ? 'SUM' : 'AUT') + springYear;
}

/* Due date of an interim check-in created on fromIso (annual review plan §4.2). A student missing a
   milestone or with a GPA below 3.0 is checked in 3 months; otherwise the advisor's choice of 3 or 6. */
function interimDueDate_(fromIso, advisorMonths, missingMilestoneOrLowGpa) {
  var months = missingMilestoneOrLowGpa ? 3 : (Number(advisorMonths) === 6 ? 6 : 3);
  var p = fromIso.split('-').map(Number);
  var target = new Date(Date.UTC(p[0], p[1] - 1 + months, 1));
  var lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(p[2], lastDay));
  return utcToIso_(target.getTime());
}

/* The quarter whose dates contain iso, or the next one if iso falls between quarters. */
function quarterForDate_(iso) {
  var codes = Object.keys(QUARTER_CALENDAR_).sort(function(a, b) {
    return isoToUtc_(QUARTER_CALENDAR_[a][0]) - isoToUtc_(QUARTER_CALENDAR_[b][0]);
  });
  for (var i = 0; i < codes.length; i++) {
    var c = QUARTER_CALENDAR_[codes[i]];
    if (isoToUtc_(iso) <= isoToUtc_(c[2])) return codes[i];
  }
  return null;
}
