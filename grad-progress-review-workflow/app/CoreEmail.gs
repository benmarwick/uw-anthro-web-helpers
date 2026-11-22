/* ============================================================
   CoreEmail.gs: every email text, and the renderer. Pure functions,
   tested in tests/run.js and tests/fix-*.test.js.

   Rules: course feedback emails never name a student and never include a comment,
   rating or flag; annual review emails name a student only in the body, only to someone who can
   already see that review, and never reveal a rating or whether a letter raises a concern. Links
   are written [label](url) and rendered as a link in HTML and as "label <url>" in plain text.
   ============================================================ */

function plural_(n, one, many) { return Number(n) === 1 ? one : many; }

/* A number written as a capitalised word, for the start of a sentence: 2 -> 'Two', 21 -> 'Twenty-one'.
   A sentence should not begin with a numeral. From 100 up (never expected) it falls back to 'A total of 120'. */
function sentenceNumber_(n) {
  var num = Number(n);
  var ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
              'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var word;
  if (!isFinite(num) || num < 0 || num !== Math.floor(num) || num >= 100) return 'A total of ' + n;
  if (num < 20) word = ones[num];
  else word = tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
  return word.charAt(0).toUpperCase() + word.slice(1);
}

var EMAIL_SYSTEMS_ = {
  cf: {
    key: 'cf',
    name: 'Graduate Student Course Feedback',
    bannerTitle: 'GRADUATE STUDENT COURSE FEEDBACK',
    sender: 'UW Anthropology: Grad Student Course Feedback',
    color: '#1E5631',
    bg: '#EEF6F0'
  },
  annual: {
    key: 'annual',
    name: 'Graduate Student Annual Review (Policy 3.7)',
    bannerTitle: 'GRADUATE STUDENT ANNUAL REVIEW (POLICY 3.7)',
    sender: 'UW Anthropology: Grad Student Annual Review',
    color: '#1B365D',
    bg: '#EEF3F9'
  },
  checkin: {
    key: 'checkin',
    name: 'Graduate Student Progress Check-In (Policy 3.7)',
    bannerTitle: 'GRADUATE STUDENT PROGRESS CHECK-IN (POLICY 3.7)',
    sender: 'UW Anthropology: Grad Student Progress Check-In',
    color: '#14535B',
    bg: '#EDF6F7'
  }
};

function emailSystemForTemplate_(id) {
  if (String(id).indexOf('CF-') === 0) return EMAIL_SYSTEMS_.cf;
  if (id === 'AR-10' || id === 'AR-13') return EMAIL_SYSTEMS_.checkin;
  return EMAIL_SYSTEMS_.annual;
}

function senderNameForTemplate_(id) {
  return emailSystemForTemplate_(id).sender;
}

var EMAIL_TEMPLATES_ = {
  /* ---------- Course feedback ---------- */
  'CF-1': function(p) {
    var dueTag = p.dueShort ? ' by ' + p.dueShort : '';
    return {
      subject: '[Grad Student Course Feedback] Action needed' + dueTag + ': enrolled grad students in ' + p.course + ' (' + p.quarter + ')',
      role: 'Course Instructor',
      scope: p.course + ' (' + p.quarter + ') · Academic coursework feedback (not a TA evaluation)',
      body: [
        'Thank you for teaching ' + p.course + ' this quarter. ' + sentenceNumber_(p.n) + ' Anthropology graduate ' + plural_(p.n, 'student', 'students') + ' took it for academic credit, and we would be grateful for a short coursework note on each.',
        'What this request is: Graduate Student Course Feedback on enrolled students\' coursework in ' + p.course + '. It is separate from TA/ASE employment evaluations (which use the separate purple TA Evaluation System) and separate from faculty advisor annual reviews.',
        'For each student, please first say whether you saw enough of their work to comment. "Not enough contact" is a perfectly good answer for someone you barely got to know, for example in a large class. If you did see their work, please give three quick ratings, one thing they did well, and the one thing that would most strengthen their work next. It takes about 3 to 4 minutes for each student you comment on.',
        'Students read these notes with your name on them and use them to plan their next steps. They become part of the student\'s FERPA education record, so please describe the coursework rather than the person, and do not include grades or TA/RA duties.',
        'This form is due ' + p.dueLong + '. If you did not teach ' + p.course + ', [let us know](' + p.notMineUrl + ') and we will send the page to the right instructor.'
      ],
      cta: { label: 'Open Course Feedback for ' + p.course, url: p.url },
      signoff: ['With thanks,', p.gpcName, 'Graduate Program Coordinator, Anthropology']
    };
  },
  /* CF-2 can go out before grades are due (Autumn 2026: 14 Dec, grades due 22 Dec) or after, so it names the
     grade deadline in the right tense. p.gradesDueLong: the grade deadline; p.gradesDuePassed: true once it has passed. */
  'CF-2': function(p) {
    var grades = '';
    if (p.gradesDueLong) grades = (p.gradesDuePassed ? 'Grades were due ' : 'Grades are due ') + p.gradesDueLong + '. ';
    var qSuffix = p.quarter ? ' (' + p.quarter + ')' : '';
    var dueSuffix = p.dueShort ? ' due ' + p.dueShort : '';
    return {
      subject: '[Grad Student Course Feedback] Reminder: enrolled grad students in ' + p.course + qSuffix + dueSuffix,
      role: 'Course Instructor',
      scope: p.course + qSuffix + ' · Academic coursework feedback (not a TA evaluation)',
      body: [
        grades + 'Thank you for all the work the end of the quarter takes. When you have a few minutes, your Graduate Student Course Feedback page for ' + p.course + qSuffix + ' is still open and due ' + p.dueLong + '.',
        'This request covers graduate students enrolled in ' + p.course + ' for academic credit. It is separate from TA/ASE employment evaluations and separate from faculty advisor annual reviews.',
        'Even a quick "Not enough contact" helps; it tells us the page has been seen.'
      ],
      cta: { label: 'Open Course Feedback for ' + p.course, url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-3': function(p) {
    var qSuffix = p.quarter ? ' (' + p.quarter + ')' : '';
    return {
      subject: '[Grad Student Course Feedback] Final reminder: ' + p.course + qSuffix + ' closes ' + p.dueShort,
      role: 'Course Instructor',
      scope: p.course + qSuffix + ' · Academic coursework feedback (not a TA evaluation)',
      body: [
        'Final reminder: your Graduate Student Course Feedback page for enrolled graduate students in ' + p.course + qSuffix + ' closes on ' + p.dueLong + '.',
        'This is coursework feedback for students taking ' + p.course + ' for credit, separate from TA/ASE evaluations and annual reviews. If you cannot get to it this time, that is all right. The student\'s record will simply show that no course feedback was received.'
      ],
      cta: { label: 'Open Course Feedback for ' + p.course, url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-4': function(p) {
    var qSuffix = p.quarter ? ' (' + p.quarter + ')' : '';
    return {
      subject: '[Grad Student Course Feedback] Confirmed: you did not teach ' + p.course,
      role: 'Course Instructor',
      scope: p.course + qSuffix + ' · Course feedback page closed',
      body: ['Thank you for telling us, and sorry for the mix-up. We have closed your Graduate Student Course Feedback page for ' + p.course + ' and will send a new page to the right instructor. There is nothing more you need to do.'],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-5': function(p) {
    var offering = [p.course, p.section].filter(Boolean).join(' ');
    return {
      subject: '[Grad Student Course Feedback] Admin action: instructor change for ' + offering + ' (' + p.quarter + ')',
      role: 'Graduate Student Administrator',
      scope: offering + ' (' + p.quarter + ') · Roster correction needed',
      greet: false,
      body: [
        p.instructorName + ' reported that they did not teach ' + offering + ' for Graduate Student Course Feedback. They suggested: ' + (p.suggested || 'no one') + '.',
        'Use the Roster page to correct the section or the Instructors sheet and send a new course feedback page. The due date stays ' + p.dueLong + '.'
      ],
      cta: { label: 'Open Course Feedback Roster', url: p.rosterUrl },
      signoff: []
    };
  },
  'CF-6': function(p) {
    var qSuffix = p.quarter ? ' (' + p.quarter + ')' : '';
    return {
      subject: '[Grad Student Course Feedback] Revision requested on a coursework comment for ' + p.course,
      role: 'Course Instructor',
      scope: p.course + qSuffix + ' · Coursework comment revision (not a TA evaluation)',
      body: [
        'Thank you for submitting your Graduate Student Course Feedback for ' + p.course + qSuffix + '. Before it goes to the student, I would like to ask you to look again at one coursework comment. I have left a short note beside it explaining why.',
        'This revision is for Graduate Student Course Feedback on an enrolled student in ' + p.course + ' (separate from TA/ASE employment evaluations and separate from annual reviews).',
        'It would help to have your revision by ' + p.reviseByLong + '. If it is easier to talk it through, just reply to this email.'
      ],
      cta: { label: 'Revise Course Feedback for ' + p.course, url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-7': function(p) {
    /* The advisor's view does not show follow-up notes, so the advisor's copy has no link and promises the note instead. */
    return {
      subject: '[Grad Student Course Feedback] Action needed: instructor requested a student follow-up (' + p.quarter + ')',
      role: p.isAdvisor ? 'Faculty Advisor' : 'Graduate Program Coordinator',
      scope: p.quarter + ' · Course feedback follow-up flag (not a TA evaluation)',
      body: [
        p.isAdvisor
          ? 'In Graduate Student Course Feedback for ' + p.quarter + ', a course instructor flagged a follow-up conversation with one of your advisees.'
          : 'In Graduate Student Course Feedback for ' + p.quarter + ', a course instructor flagged a follow-up conversation with one of our students. Their note is in the Course Feedback app.',
        'This is a coursework follow-up flag from a class instructor, separate from TA/ASE evaluations and annual reviews. The aim is to talk with the student by ' + p.deadlineLong + ', so they hear about it while there is still time to act on it.' + (p.isAdvisor ? ' I will be in touch to share the note and agree which of us has that conversation.' : '')
      ],
      cta: p.isAdvisor ? null : { label: 'Open the note (Course Feedback Follow-Up)', url: p.url },
      signoff: ['Thank you,', p.gpcName]
    };
  },
  'CF-8': function(p) {
    var qSuffix = p.quarter ? p.quarter + ' · ' : '';
    return {
      subject: '[Grad Student Course Feedback] Reminder: course feedback follow-up due ' + p.deadlineShort,
      role: 'Follow-Up Handler',
      scope: qSuffix + 'Course feedback follow-up conversation',
      body: [
        'Just a reminder that a Graduate Student Course Feedback follow-up conversation is due by ' + p.deadlineLong + '. If the conversation has already happened, please record how it went in the app.',
        'If something is getting in the way, reply and we will work it out together.'
      ],
      cta: { label: 'Record Course Feedback Follow-Up', url: p.url },
      signoff: ['Thank you,', p.gpcName]
    };
  },
  'CF-9': function(p) {
    return {
      subject: '[Grad Student Course Feedback] Your instructors\' coursework notes for ' + p.quarter + ' are ready',
      role: 'Graduate Student',
      scope: p.quarter + ' · Released coursework notes',
      body: [
        'Your course instructors from ' + p.quarter + ' have shared Graduate Student Course Feedback notes on your coursework, and you can read them now.',
        'Each note names one thing you did well and one suggestion for what to work on next. These coursework notes are separate from your grades and separate from TA/ASE evaluations, and are meant to help you plan.',
        'If anything is unclear, or you would like to talk it over, your advisor and I are always glad to.'
      ],
      cta: { label: 'Read Your Course Feedback', url: p.url },
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'CF-10': function(p) {
    return {
      subject: '[Grad Student Course Feedback] Advisee coursework notes for ' + p.quarter + ' are ready',
      role: 'Faculty Advisor',
      scope: p.quarter + ' · Read-only advisee coursework notes (no form to fill out)',
      body: [
        'Graduate Student Course Feedback notes from ' + p.quarter + ' instructors are now available to read for ' + p.n + ' of your ' + plural_(p.n, 'advisee', 'advisees') + '.',
        'This is a read-only view of coursework feedback submitted by class instructors (separate from TA/ASE evaluations and separate from your spring annual review evaluation). No action is required; these notes can be a good starting point for your next advising conversation.'
      ],
      cta: { label: 'View Advisees\' Course Feedback', url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-11': function(p) {
    return {
      subject: '[Grad Student Course Feedback] Your yearly Course Feedback Record (' + p.feedbackYear + ') is ready',
      role: 'Graduate Student',
      scope: p.feedbackYear + ' · Yearly Course Feedback Record',
      body: [
        'Your yearly Course Feedback Record brings this year\'s coursework notes from your instructors together in one place, with every suggested next step gathered into a single list.',
        'In your spring Graduate Student Annual Review, you will be asked which one or two of those next steps you would most like to work on. There is no wrong answer; it is a chance to choose what matters most to you.'
      ],
      cta: { label: 'Read Your Course Feedback Record', url: p.url },
      signoff: ['Warmly,', p.gpcName]
    };
  },

  /* ---------- Annual review ---------- */
  'AR-1': function(p) {
    var dueTag = p.dueShort ? ' (due ' + p.dueShort + ')' : '';
    return {
      subject: '[Grad Student Annual Review] Your ' + p.year + ' PhD annual progress review is open' + dueTag,
      role: 'Graduate Student',
      scope: p.year + ' PhD Annual Progress Review (Policy 3.7)',
      body: [
        'It is time for your ' + p.year + ' PhD Annual Progress Review (UW Graduate School Policy 3.7): a chance to look back on what you have done this year, take stock, and plan the year ahead with your advisor. It starts with your self-report, due ' + p.dueLong + '.',
        'This annual academic progress review is separate from TA/ASE employment evaluations. Your form is already filled in with what we have from MyGrad and last year\'s goals, so most of the work is checking and adding to it. Your drafts save as you go.',
        'Your advisor reads your report before you meet. The form tells you who reads each section, and one section goes only to me, if there is anything you would rather raise privately. If this year has been hard, you are welcome to say so there, or to talk with me or the Office of the Ombud.'
      ],
      cta: { label: 'Open Your ' + p.year + ' Annual Review Report', url: p.url },
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-2': function(p) {
    var yr = p.year ? p.year + ' ' : '';
    return {
      subject: '[Grad Student Annual Review] Reminder: your ' + yr + 'annual review report is due ' + p.dueShort,
      role: 'Graduate Student',
      scope: (p.year ? p.year + ' ' : '') + 'PhD Annual Progress Review (Policy 3.7)',
      body: [
        'Just a reminder that your ' + yr + 'Graduate Student Annual Review report is due ' + p.dueLong + '. Anything you have already written is saved.',
        'If you need a little more time, reply to this email and we will sort it out.'
      ],
      cta: { label: 'Open Your ' + yr + 'Annual Review Report', url: p.url },
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-3': function(p) {
    var dueTag = p.dueShort ? ' by ' + p.dueShort : '';
    var yr = p.year ? p.year + ' ' : '';
    return {
      subject: '[Grad Student Annual Review] Advisor action needed' + dueTag + ': evaluate an advisee\'s ' + yr + 'annual review',
      role: 'Faculty Advisor',
      scope: (p.year ? p.year + ' ' : '') + 'PhD Annual Progress Review (Policy 3.7 · not a TA evaluation)',
      body: [
        'You are receiving this as ' + p.studentName + '\'s faculty advisor for their ' + yr + 'PhD Annual Progress Review (UW Graduate School Policy 3.7). ' + p.studentName + ' has finished their annual review report, and it is ready for you to read.',
        'What this request is: Your faculty advisor evaluation of ' + p.studentName + '\'s overall degree progress for the year. It is separate from TA/ASE employment evaluations (which use the separate purple TA Evaluation System) and separate from quarterly instructor course feedback for a single class.',
        'Next, please meet with ' + p.studentFirstName + ', then complete your advisor evaluation by ' + p.dueLong + '. The form asks for specifics: what went well, with an example; clear next steps; and, if something is off track, the benchmark, the support you will offer and a date.' + (p.coAdvised ? ' Your co-advisors can add to the same draft, and one of you signs.' : ''),
        'Thank you for the time and care this takes.'
      ],
      cta: { label: 'Open Annual Review Evaluation', url: p.url },
      signoff: [p.gpcName, 'Graduate Program Coordinator, Anthropology']
    };
  },
  'AR-4': function(p) {
    var yr = p.year ? p.year + ' ' : '';
    return {
      subject: '[Grad Student Annual Review] Advisor reminder: advisee ' + yr + 'annual review due ' + p.dueShort,
      role: 'Faculty Advisor',
      scope: (p.year ? p.year + ' ' : '') + 'PhD Annual Progress Review (Policy 3.7 · not a TA evaluation)',
      body: [
        'Reminder: your faculty advisor evaluation for ' + p.studentName + '\'s ' + yr + 'PhD Annual Progress Review is due ' + p.dueLong + '. Your draft is saved.',
        'This is the annual academic progress review for your advisee (Policy 3.7), separate from TA/ASE employment evaluations and separate from single-course instructor feedback.',
        'If the meeting has not happened yet or you need more time, just reply and let me know.'
      ],
      cta: { label: 'Open Annual Review Evaluation', url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-5': function(p) {
    return {
      subject: '[Grad Student Annual Review] Calibration ready: ' + p.subfield,
      role: 'Graduate Program Coordinator',
      scope: (p.year ? p.year + ' ' : '') + 'Calibration · ' + p.subfield,
      greet: false,
      body: [sentenceNumber_(p.nReady) + ' of ' + p.nTotal + ' reviews in ' + p.subfield + ' are ready for the calibration meeting. ' + sentenceNumber_(p.nWaiting) + ' ' + plural_(p.nWaiting, 'is', 'are') + ' still waiting on a student or advisor.'],
      cta: { label: 'Open Annual Review Calibration View', url: p.url },
      signoff: []
    };
  },
  'AR-6': function(p) {
    var yr = p.year ? p.year + ' ' : '';
    return {
      subject: '[Grad Student Annual Review] Advisor revision requested on an annual review evaluation',
      role: 'Faculty Advisor',
      scope: (p.year ? p.year + ' ' : '') + 'PhD Annual Progress Review · Revision requested (not a TA evaluation)',
      body: [
        'Thank you for your faculty advisor evaluation of ' + p.studentName + ' in the ' + yr + 'Graduate Student Annual Review (Policy 3.7). Before the annual review letter goes out, I would like to ask you to look again at one passage; I have left a note beside it explaining why.',
        'This revision is for your Annual Review advisor evaluation of ' + p.studentName + ', separate from TA/ASE employment evaluations and separate from course feedback.',
        'Your annual review fields are open until ' + p.returnUntilLong + '. If it is easier to talk it through, just reply to this email.'
      ],
      cta: { label: 'Revise Annual Review Evaluation', url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-7': function(p) {
    /* Must remain byte-for-byte identical regardless of rating or letter content (Acceptance Test 22). */
    return {
      subject: '[Grad Student Annual Review] Your annual review letter is ready to read',
      role: 'Graduate Student',
      scope: 'Annual Progress Review · Final letter and acknowledgement',
      body: [
        'Your Graduate Student Annual Review is complete, and your annual review letter and your advisor\'s evaluation are ready to read.',
        'Please take your time with it. When you are ready, confirm that you have read it by ' + p.ackDueLong + '. Confirming does not mean you agree, and you are welcome to add a written response, which will be attached to your review.',
        'If you would like to talk about anything in it, tick "I would like to meet with the GPC" or simply reply. Graduate Student Affairs, the Counseling Center and the Office of the Ombud are also there for you, and the letter has their details.'
      ],
      cta: { label: 'Read Your Annual Review Letter', url: p.url },
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-8': function(p) {
    return {
      subject: '[Grad Student Annual Review] Complete (' + p.year + '): final PDF available',
      role: p.isStudent ? 'Graduate Student' : 'Faculty Advisor / Committee Chair',
      scope: p.year + ' Annual Progress Review · Final record',
      body: [
        p.isStudent ? 'Your Graduate Student Annual Review for ' + p.year + ' is complete. Thank you for the thought you put into it.'
                    : 'The Graduate Student Annual Review for ' + p.studentName + ' (' + p.year + ') is complete. Thank you for your part in it.',
        'The final annual review PDF, including any student response, is shared only with your UW account.'
      ],
      cta: { label: 'Open Final Annual Review PDF', url: p.pdfUrl },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-9': function(p) {
    return {
      subject: '[Grad Student Annual Review] Overdue review needs GPC action',
      role: 'Graduate Program Coordinator',
      scope: 'Escalated review · ' + p.stage + ' stage',
      greet: false,
      body: ['A Graduate Student Annual Review or Check-In is overdue at the ' + p.stage + ' stage (' + p.daysOverdue + ' days past due, 2 reminders sent). Open the Program stage to extend, skip the stage or mark it exempt.'],
      cta: { label: 'Open Program Stage', url: p.url },
      signoff: []
    };
  },
  'AR-10': function(p) {
    var dueTag = p.dueShort ? ' (due ' + p.dueShort + ')' : '';
    var prefix = p.isInterim ? '[Grad Student Interim Check-In]' : '[Grad Student MA Check-In]';
    var kindTitle = p.isInterim ? 'GRADUATE STUDENT PHD INTERIM CHECK-IN (POLICY 3.7)' : 'GRADUATE STUDENT MA QUARTERLY CHECK-IN (POLICY 3.7)';
    return {
      subject: p.isInterim
        ? prefix + ' Your ' + p.quarter + ' interim progress check-in is open'
        : prefix + ' Your ' + p.quarter + ' quarterly check-in is open' + dueTag,
      bannerTitle: kindTitle,
      role: 'Graduate Student',
      scope: p.quarter + ' · ' + (p.isInterim ? 'PhD interim progress check-in' : 'MA quarterly advisor check-in'),
      body: [
        p.isInterim
          ? 'Your ' + p.quarter + ' PhD interim progress check-in with your advisor is open and due ' + p.dueLong + '. It follows up on the plan you and your advisor agreed in your last annual review.'
          : 'It is time for your ' + p.quarter + ' MA quarterly progress check-in with your advisor: a quick look at how this quarter went and what comes next. It is due ' + p.dueLong + '.',
        'This academic progress check-in is separate from TA/ASE employment evaluations and separate from course feedback.'
      ],
      cta: { label: p.isInterim ? 'Open Your Interim Check-In' : 'Open Your ' + p.quarter + ' MA Check-In', url: p.url },
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-11': function(p) {
    return {
      subject: '[Grad Student Annual Review] Academic Alert recommendation due ' + p.dueShort,
      role: 'Graduate Program Coordinator',
      scope: p.quarter + ' · Academic Alert deadline (Policy 3.7.3)',
      greet: false,
      body: ['An Academic Alert recommendation for ' + p.n + ' ' + plural_(p.n, 'student', 'students') + ' must reach the student and the Graduate School by ' + p.dueLong + ', the 10th business day of ' + p.quarter + ' (Policy 3.7.3). Petitions are considered up to the 15th.'],
      cta: { label: 'Open Alert Checklist', url: p.url },
      signoff: []
    };
  },
  'AR-13': function(p) {
    var dueTag = p.dueShort ? ' by ' + p.dueShort : '';
    var prefix = p.isInterim ? '[Grad Student Interim Check-In]' : '[Grad Student MA Check-In]';
    var kindTitle = p.isInterim ? 'GRADUATE STUDENT PHD INTERIM CHECK-IN (POLICY 3.7)' : 'GRADUATE STUDENT MA QUARTERLY CHECK-IN (POLICY 3.7)';
    var kindLabel = p.isInterim ? 'PhD interim progress check-in' : 'MA quarterly progress check-in';
    return {
      subject: p.isInterim
        ? prefix + ' Advisor action needed' + dueTag + ': ' + p.quarter + ' interim check-in for an advisee'
        : prefix + ' Advisor action needed' + dueTag + ': ' + p.quarter + ' check-in for an MA advisee',
      bannerTitle: kindTitle,
      role: 'Faculty Advisor',
      scope: p.quarter + ' · ' + kindLabel + ' (not a TA evaluation)',
      body: [
        'You are receiving this as ' + p.studentName + '\'s faculty advisor for their ' + p.quarter + ' ' + kindLabel + ' (UW Graduate School Policy 3.7). It is ready for you and due ' + p.dueLong + '.',
        'What this request is: A brief faculty advisor progress check-in with your advisee. It is separate from TA/ASE employment evaluations (which use the separate purple TA Evaluation System) and separate from single-course instructor feedback.',
        p.isInterim
          ? 'It follows up on the plan you agreed at their last review, and asks for progress on each benchmark and your verdict: resolved, continuing, or escalate to me.'
          : 'It asks for your milestone determinations, any action items, and your verdict on how the quarter went.',
        'Thank you for keeping in touch with them.'
      ],
      cta: { label: p.isInterim ? 'Open Advisor Interim Check-In' : 'Open Advisor MA Check-In', url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-12': function(p) {
    return {
      subject: '[Grad Student Annual Review] Anonymous feedback survey on this year\'s review',
      role: 'Annual Review Participant',
      scope: (p.year ? p.year + ' ' : '') + 'Post-cycle anonymous survey',
      body: [
        'Thank you for taking part in this year\'s Graduate Student Annual Review. Would you tell us how it went? This short survey is anonymous and is not linked to your review.',
        'Every answer helps us make next year\'s annual review clearer and more useful.'
      ],
      cta: { label: 'Take Annual Review Survey', url: p.url },
      signoff: ['With thanks,', p.gpcName]
    };
  }
};

function escapeHtmlCore_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* [label](url) -> HTML link / plain "label <url>". Everything else is escaped for HTML. */
function renderInline_(s, html, linkColor) {
  var color = linkColor || '#1B365D';
  var out = '', re = /\[([^\]]+)\]\(([^)\s]+)\)/g, last = 0, m;
  while ((m = re.exec(s))) {
    var before = s.slice(last, m.index);
    out += html ? escapeHtmlCore_(before) : before;
    out += html ? '<a href="' + escapeHtmlCore_(m[2]) + '" style="color:' + color + ';font-weight:bold;">' + escapeHtmlCore_(m[1]) + '</a>' : m[1] + ' <' + m[2] + '>';
    last = re.lastIndex;
  }
  var rest = s.slice(last);
  return out + (html ? escapeHtmlCore_(rest) : rest);
}

/* Builds { subject, text, html, senderName } for a template. common: { firstName, gpcName, privacyUrl, reference }. */
function renderEmailTemplate_(id, params, common) {
  var make = EMAIL_TEMPLATES_[id];
  if (!make) throw new Error('Unknown email template ' + id);
  var p = {};
  Object.keys(params || {}).forEach(function(k) { p[k] = params[k]; });
  p.gpcName = common.gpcName;
  var t = make(p);
  var sys = emailSystemForTemplate_(id);
  var bannerTitle = t.bannerTitle || sys.bannerTitle;
  var text = [];
  var html = ['<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:640px;">'];

  /* Top system identification banner in both plain text and HTML */
  var headerLines = ['=== ' + bannerTitle + ' ==='];
  if (t.role) headerLines.push('Your role: ' + t.role);
  if (t.scope) headerLines.push('Scope: ' + t.scope);
  text.push(headerLines.join('\n'), '');

  html.push(
    '<div style="background:' + sys.color + ';color:#ffffff;padding:12px 16px;border-radius:6px 6px 0 0;">' +
    '<div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#e8e3d3;">UW Department of Anthropology</div>' +
    '<div style="font-size:16px;font-weight:bold;margin-top:2px;">' + escapeHtmlCore_(bannerTitle) + '</div>' +
    '</div>' +
    '<div style="background:' + sys.bg + ';border:1px solid #d8d8d8;border-top:none;border-left:4px solid ' + sys.color + ';padding:10px 14px;margin-bottom:16px;font-size:13px;color:#222;">' +
    (t.role ? '<div><strong>Your role:</strong> ' + escapeHtmlCore_(t.role) + '</div>' : '') +
    (t.scope ? '<div><strong>Scope:</strong> ' + escapeHtmlCore_(t.scope) + '</div>' : '') +
    '</div>'
  );

  if (t.greet !== false) {
    text.push('Dear ' + common.firstName + ',', '');
    html.push('<p>Dear ' + escapeHtmlCore_(common.firstName) + ',</p>');
  }
  t.body.forEach(function(para) {
    text.push(renderInline_(para, false, sys.color), '');
    html.push('<p>' + renderInline_(para, true, sys.color) + '</p>');
  });
  if (t.cta && t.cta.url) {
    text.push(t.cta.label + ' <' + t.cta.url + '>', '');
    html.push(
      '<p style="margin:22px 0 8px;"><a href="' + escapeHtmlCore_(t.cta.url) +
      '" style="display:inline-block;padding:12px 22px;background:' + sys.color +
      ';color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">' + escapeHtmlCore_(t.cta.label) + '</a></p>' +
      '<p style="font-size:13px;color:#555;margin-top:0;">Or copy this link: <a href="' + escapeHtmlCore_(t.cta.url) +
      '" style="color:' + sys.color + ';word-break:break-all;">' + escapeHtmlCore_(t.cta.url) + '</a></p>'
    );
  }
  if (t.signoff.length) {
    text.push(t.signoff.join('\n'), '');
    html.push('<p>' + t.signoff.map(escapeHtmlCore_).join('<br>') + '</p>');
  }
  var footer = 'UW Department of Anthropology · ' + sys.name + ' · Privacy notice <' + common.privacyUrl + '> · Reference: ' + common.reference + '. Replies to this email go to ' + common.gpcName + '.';
  text.push('--', footer);
  html.push('<hr style="border:none;border-top:1px solid #ddd;"><p style="font-size:12px;color:#666;">UW Department of Anthropology · ' +
    escapeHtmlCore_(sys.name) + ' · <a href="' +
    escapeHtmlCore_(common.privacyUrl) + '" style="color:' + sys.color + ';">Privacy notice</a> · Reference: ' + escapeHtmlCore_(common.reference) +
    '. Replies to this email go to ' + escapeHtmlCore_(common.gpcName) + '.</p></div>');
  return { subject: t.subject, text: text.join('\n'), html: html.join(''), senderName: sys.sender };
}

/* True when any of the names appears in the subject or body (case-insensitive). Used to check
   that no course feedback email names a student. */
function emailMentionsAny_(rendered, names) {
  var hay = (rendered.subject + '\n' + rendered.text).toLowerCase();
  return (names || []).some(function(n) { return n && hay.indexOf(String(n).toLowerCase()) !== -1; });
}

/* 'Fri 2 Apr' and 'Friday 2 April 2027' from an ISO date. */
var DAY_SHORT_ = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var DAY_LONG_ = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MONTH_SHORT_ = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var MONTH_LONG_ = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dateShort_(iso) {
  var d = new Date(isoToUtc_(iso));
  return DAY_SHORT_[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTH_SHORT_[d.getUTCMonth()];
}
function dateLong_(iso) {
  var d = new Date(isoToUtc_(iso));
  return DAY_LONG_[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTH_LONG_[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
