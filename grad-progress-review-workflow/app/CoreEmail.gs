/* ============================================================
   CoreEmail.gs: every email text, and the renderer. Pure functions,
   tested in tests/run.js.

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

var EMAIL_TEMPLATES_ = {
  /* ---------- Course feedback ---------- */
  'CF-1': function(p) {
    return {
      subject: 'Requesting your feedback on our graduate students in ' + p.course + ' (' + p.quarter + ')',
      body: [
        'Thank you for teaching ' + p.course + ' this quarter. ' + sentenceNumber_(p.n) + ' Anthropology graduate ' + plural_(p.n, 'student', 'students') + ' took it, and we would be grateful for a short note on each.',
        "For each student, please first say whether you saw enough of their work to comment. \"Not enough contact\" is a perfectly good answer for someone you barely got to know, for example in a large class. If you did see their work, please give three quick ratings, one thing they did well, and the one thing that would most strengthen their work next. It takes about 3 to 4 minutes for each student you comment on.",
        "Students read these notes with your name on them and use them to plan their next steps. They become part of the student's education record, so please describe the work rather than the person.",
        "[Open your page](" + p.url + "). It's due " + p.dueLong + '.',
        "If this isn't your course, [let us know](" + p.notMineUrl + ") and we'll find the right person."
      ],
      signoff: ['With thanks,', p.gpcName, 'Graduate Program Coordinator, Anthropology']
    };
  },
  /* CF-2 can go out before grades are due (Autumn 2026: 14 Dec, grades due 22 Dec) or after, so it names the
     grade deadline in the right tense. p.gradesDueLong: the grade deadline; p.gradesDuePassed: true once it has passed. */
  'CF-2': function(p) {
    var grades = '';
    if (p.gradesDueLong) grades = (p.gradesDuePassed ? 'Grades were due ' : 'Grades are due ') + p.gradesDueLong + '. ';
    return {
      subject: 'Gentle reminder: our graduate students in your ' + p.course,
      body: [
        grades + 'Thank you for all the work the end of the quarter takes. When you have a few minutes, your page for ' + p.course + " is still open: [Open your page](" + p.url + "). It's due " + p.dueLong + '.',
        'Even a quick "Not enough contact" helps; it tells us the page has been seen.'
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-3': function(p) {
    return {
      subject: 'Last reminder: ' + p.course + ' feedback is due ' + p.dueShort,
      body: [
        'A last note: your page for ' + p.course + ' closes on ' + p.dueLong + '. [Open your page](' + p.url + ').',
        "If you can't get to it this time, that's all right. The student's record will simply show that no feedback was received."
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-4': function(p) {
    return {
      subject: 'Thank you for letting us know about ' + p.course,
      body: ["Thank you for telling us, and sorry for the mix-up. We'll correct our records and send the page to the right person. There's nothing more you need to do."],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-5': function(p) {
    return {
      subject: 'Course feedback: instructor change needed for ' + [p.course, p.section].filter(Boolean).join(' ') + ' (' + p.quarter + ')',
      greet: false,
      body: [
        p.instructorName + ' says they did not teach ' + [p.course, p.section].filter(Boolean).join(' ') + '. They suggested: ' + (p.suggested || 'no one') + '.',
        '[Open the Roster page](' + p.rosterUrl + ') to correct the section or the Instructors sheet and send a new page. The due date stays ' + p.dueLong + '.'
      ],
      signoff: []
    };
  },
  'CF-6': function(p) {
    return {
      subject: 'A quick question about one of your comments in ' + p.course,
      body: [
        'Thank you for your feedback on ' + p.course + ". Before it goes to the student, I'd like to ask you to look again at one comment. I've left a short note beside it explaining why.",
        '[Open the comment](' + p.url + '). It would help to have your revision by ' + p.reviseByLong + ". If it's easier to talk it through, just reply to this email."
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-7': function(p) {
    return {
      subject: 'An instructor has asked for a follow-up conversation (' + p.quarter + ')',
      body: [
        /* The advisor's view does not show follow-up notes, so the advisor's copy has no link and promises the note instead. */
        p.isAdvisor
          ? 'An instructor has asked for a follow-up with one of your advisees this quarter.'
          : 'An instructor has asked for a follow-up with one of our students this quarter. Their note is in the app: [Open the note](' + p.url + ').',
        'The aim is to talk with the student by ' + p.deadlineLong + ', so they hear about it while there is still time to act on it.' + (p.isAdvisor ? " I'll be in touch to share the note and agree which of us has that conversation." : '')
      ],
      signoff: ['Thank you,', p.gpcName]
    };
  },
  'CF-8': function(p) {
    return {
      subject: 'A follow-up conversation is due by ' + p.deadlineShort,
      body: [
        'Just a reminder that a follow-up conversation is due by ' + p.deadlineLong + '. If it has already happened, please record how it went: [Open the follow-up](' + p.url + ').',
        "If something is getting in the way, reply and we'll work it out together."
      ],
      signoff: ['Thank you,', p.gpcName]
    };
  },
  'CF-9': function(p) {
    return {
      subject: "Your instructors' notes from " + p.quarter + ' are ready',
      body: [
        'Your instructors from ' + p.quarter + ' have shared notes on your coursework, and you can read them now: [Read your feedback](' + p.url + ').',
        "Each note names one thing you did well and one suggestion for what to work on next. They're separate from your grades and meant to help you plan, so take what's useful.",
        "If anything is unclear, or you'd like to talk it over, your advisor and I are always glad to."
      ],
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'CF-10': function(p) {
    return {
      subject: 'Course feedback for your advisees (' + p.quarter + ')',
      body: [
        "Notes from " + p.quarter + "'s instructors are now available for " + p.n + ' of your ' + plural_(p.n, 'advisee', 'advisees') + ': [Open them](' + p.url + ').',
        'They can be a good starting point for your next conversation.'
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'CF-11': function(p) {
    return {
      subject: 'Your Course Feedback Record for ' + p.feedbackYear + ' is ready',
      body: [
        "Your Course Feedback Record brings this year's notes from your instructors together in one place, with every suggested next step gathered into a single list: [Read your record](" + p.url + ').',
        "In your annual review this spring, you'll be asked which one or two of those next steps you'd most like to work on. There's no wrong answer; it's a chance to choose what matters most to you."
      ],
      signoff: ['Warmly,', p.gpcName]
    };
  },

  /* ---------- Annual review ---------- */
  'AR-1': function(p) {
    return {
      subject: 'Your annual review for ' + p.year + ' is open',
      body: [
        "It's time for your annual review: a chance to look back on what you've done this year, take stock, and plan the year ahead with your advisor. It starts with you: [Open your report](" + p.url + "). It's due " + p.dueLong + '.',
        'Your form is already filled in with what we have from MyGrad and last year\'s goals, so most of the work is checking and adding to it. Your drafts save as you go.',
        "Your advisor reads your report before you meet. The form tells you who reads each section, and one section goes only to me, if there's anything you'd rather raise privately. If this year has been hard, you're welcome to say so there, or to talk with me or the Office of the Ombud."
      ],
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-2': function(p) {
    return {
      subject: 'A reminder: your annual review report is due ' + p.dueShort,
      body: [
        'Just a reminder that your annual review report is due ' + p.dueLong + ': [Open your report](' + p.url + "). Anything you've already written is saved.",
        "If you need a little more time, reply to this email and we'll sort it out."
      ],
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-3': function(p) {
    return {
      subject: 'An annual review report is ready for you',
      body: [
        p.studentName + " has finished their annual review report, and it's ready for you to read: [Open the review](" + p.url + ').',
        'Next, please meet with ' + p.studentFirstName + ', then complete your evaluation by ' + p.dueLong + ". The form asks for specifics: what went well, with an example; clear next steps; and, if something is off track, the benchmark, the support you'll offer and a date." + (p.coAdvised ? ' Your co-advisors can add to the same draft, and one of you signs.' : ''),
        'Thank you for the time and care this takes.'
      ],
      signoff: [p.gpcName]
    };
  },
  'AR-4': function(p) {
    return {
      subject: 'A reminder: an annual review evaluation is due ' + p.dueShort,
      body: [
        'Your evaluation for ' + p.studentName + "'s annual review is due " + p.dueLong + ': [Open the review](' + p.url + '). Your draft is saved.',
        "If the meeting hasn't happened yet or you need more time, just reply and let me know."
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-5': function(p) {
    return {
      subject: 'Reviews ready for calibration: ' + p.subfield,
      greet: false,
      body: [sentenceNumber_(p.nReady) + ' of ' + p.nTotal + ' reviews in ' + p.subfield + ' are ready for the calibration meeting. [Open the calibration view](' + p.url + '). ' + sentenceNumber_(p.nWaiting) + ' ' + plural_(p.nWaiting, 'is', 'are') + ' still waiting on a student or advisor.'],
      signoff: []
    };
  },
  'AR-6': function(p) {
    return {
      subject: 'A quick question about an evaluation you wrote',
      body: [
        'Thank you for your evaluation of ' + p.studentName + ". Before the letter goes out, I'd like to ask you to look again at one passage; I've left a note beside it explaining why.",
        '[Open the evaluation](' + p.url + '). Your fields are open until ' + p.returnUntilLong + ". If it's easier to talk it through, just reply."
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-7': function(p) {
    return {
      subject: 'Your annual review letter is ready to read',
      body: [
        "Your annual review is complete, and your letter and your advisor's evaluation are ready to read: [Read your letter](" + p.url + ').',
        "Please take your time with it. When you're ready, confirm that you've read it by " + p.ackDueLong + ". Confirming doesn't mean you agree, and you're welcome to add a written response, which will be attached to your review.",
        'If you\'d like to talk about anything in it, tick "I would like to meet with the GPC" or simply reply. Graduate Student Affairs, the Counseling Center and the Office of the Ombud are also there for you, and the letter has their details.'
      ],
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-8': function(p) {
    return {
      subject: 'Annual review complete (' + p.year + ')',
      body: [
        p.isStudent ? 'Your annual review for ' + p.year + ' is complete. Thank you for the thought you put into it.'
                    : 'The annual review for ' + p.studentName + ' is complete. Thank you for your part in it.',
        "The final copy, including any response, is here: [Open the PDF](" + p.pdfUrl + "). It's shared only with your UW account."
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-9': function(p) {
    return {
      subject: 'An annual review needs your attention',
      greet: false,
      body: ['A review is overdue at the ' + p.stage + ' stage (' + p.daysOverdue + ' days past due, 2 reminders sent). [Open it](' + p.url + ') to extend, skip the stage or mark it exempt.'],
      signoff: []
    };
  },
  'AR-10': function(p) {
    return {
      subject: 'Your ' + p.quarter + ' check-in is open',
      body: [
        "It's time for a short check-in with your advisor: a quick look at how this quarter went and what comes next. [Open your check-in](" + p.url + "). It's due " + p.dueLong + '.'
      ].concat(p.isInterim ? ['It follows up on the plan you and your advisor agreed. If things have moved on, this is the place to say so.'] : []),
      signoff: ['Warmly,', p.gpcName]
    };
  },
  'AR-11': function(p) {
    return {
      subject: 'Alert recommendation due ' + p.dueShort,
      greet: false,
      body: ['An Academic Alert recommendation for ' + p.n + ' ' + plural_(p.n, 'student', 'students') + ' must reach the student and the Graduate School by ' + p.dueLong + ', the 10th business day of ' + p.quarter + ' (Policy 3.7.3). Petitions are considered up to the 15th. [Open the Alert checklist](' + p.url + ').'],
      signoff: []
    };
  },
  'AR-13': function(p) {
    return {
      subject: 'A check-in is ready for you',
      body: [
        p.studentName + "'s " + p.quarter + ' check-in is ready for you: [Open the check-in](' + p.url + "). It's due " + p.dueLong + '.',
        p.isInterim
          ? 'It follows up on the plan you agreed at their last review, and asks for progress on each benchmark and your verdict: resolved, continuing, or escalate to me.'
          : 'It asks for your milestone determinations, any action items, and your verdict on how the quarter went.',
        'Thank you for keeping in touch with them.'
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  },
  'AR-12': function(p) {
    return {
      subject: 'Help us make the annual review better',
      body: [
        "Thank you for taking part in this year's annual review. Would you tell us how it went? This short survey is anonymous and isn't linked to your review: [Take the survey](" + p.url + ').',
        "Every answer helps us make next year's review clearer and more useful."
      ],
      signoff: ['With thanks,', p.gpcName]
    };
  }
};

function escapeHtmlCore_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* [label](url) -> HTML link / plain "label <url>". Everything else is escaped for HTML. */
function renderInline_(s, html) {
  var out = '', re = /\[([^\]]+)\]\(([^)\s]+)\)/g, last = 0, m;
  while ((m = re.exec(s))) {
    var before = s.slice(last, m.index);
    out += html ? escapeHtmlCore_(before) : before;
    out += html ? '<a href="' + escapeHtmlCore_(m[2]) + '" style="color:#4B2E83;">' + escapeHtmlCore_(m[1]) + '</a>' : m[1] + ' <' + m[2] + '>';
    last = re.lastIndex;
  }
  var rest = s.slice(last);
  return out + (html ? escapeHtmlCore_(rest) : rest);
}

/* Builds { subject, text, html } for a template. common: { firstName, gpcName, privacyUrl, reference }. */
function renderEmailTemplate_(id, params, common) {
  var make = EMAIL_TEMPLATES_[id];
  if (!make) throw new Error('Unknown email template ' + id);
  var p = {};
  Object.keys(params || {}).forEach(function(k) { p[k] = params[k]; });
  p.gpcName = common.gpcName;
  var t = make(p);
  var text = [], html = ['<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:640px;">'];
  if (t.greet !== false) {
    text.push('Dear ' + common.firstName + ',', '');
    html.push('<p>Dear ' + escapeHtmlCore_(common.firstName) + ',</p>');
  }
  t.body.forEach(function(para) {
    text.push(renderInline_(para, false), '');
    html.push('<p>' + renderInline_(para, true) + '</p>');
  });
  if (t.signoff.length) {
    text.push(t.signoff.join('\n'), '');
    html.push('<p>' + t.signoff.map(escapeHtmlCore_).join('<br>') + '</p>');
  }
  var footer = 'UW Department of Anthropology · Privacy notice <' + common.privacyUrl + '> · Reference: ' + common.reference + '. Replies to this email go to ' + common.gpcName + '.';
  text.push('--', footer);
  html.push('<hr style="border:none;border-top:1px solid #ddd;"><p style="font-size:12px;color:#666;">UW Department of Anthropology · <a href="' +
    escapeHtmlCore_(common.privacyUrl) + '" style="color:#4B2E83;">Privacy notice</a> · Reference: ' + escapeHtmlCore_(common.reference) +
    '. Replies to this email go to ' + escapeHtmlCore_(common.gpcName) + '.</p></div>');
  return { subject: t.subject, text: text.join('\n'), html: html.join('') };
}

/* True when any of the names appears in the subject or body (case-insensitive). Used to check
   that no course feedback email names a student . */
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
