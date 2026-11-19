# Build Specification: Annual Review and Course Feedback (UW Anthropology)

*Drafted 17 November 2026. This file turns [`grad-annual-review-plan.md`](grad-annual-review-plan.md) and [`course-feedback-plan.md`](course-feedback-plan.md) into the details a builder needs: states and transitions, pages, email texts and acceptance tests. Where this file and a plan disagree, the plan's decisions apply and this file should be corrected. The GPC owns and maintains both systems (annual review plan, principle 4).*

## 1. States and Transitions

### 1.1 Annual review rows (`Reviews` sheet)

| Type | Flow | Notes |
|---|---|---|
| `ANNUAL` (PhD) | `NOT_STARTED → STUDENT_PENDING → ADVISOR_PENDING → PROGRAM_PENDING → STUDENT_ACK_PENDING → PDF_GENERATING → COMPLETED` | As in plan §4.1 |
| `INTERIM` (PhD, after a concern rating or created by hand) | `NOT_STARTED → ADVISOR_PENDING → COMPLETED`, or `ADVISOR_PENDING → PROGRAM_PENDING` when the advisor chooses "escalate to the GPC" | Due 3 months after the parent review when the student is missing a milestone or has a GPA below 3.0, otherwise 3 or 6 months (plan §4.2). `Parent_Review_ID` links it to the review that created it |
| `INTERIM` (MA quarterly check-in) | `NOT_STARTED → STUDENT_PENDING → ADVISOR_PENDING → COMPLETED`, or `→ PROGRAM_PENDING` when the advisor raises a concern | Launched automatically at the end of every quarter the MA student is enrolled, including spring (plan §4.4, decision 4). The student part contains the career check-in; the advisor part contains milestone determinations, action items and the verdict (decision 23). A concern letter is written only from `PROGRAM_PENDING` |
| `FIRST_YEAR` | Phase 2, first cycle spring 2028 | Not built in Jan–Feb 2027 |
| `COMPACT` | Phase 2, autumn 2027 | Not built in Jan–Feb 2027 |

**Transitions that leave the main flow**

| From | Trigger | To | Logged |
|---|---|---|---|
| Any pending stage | Due date passed and 2 reminders sent | `ESCALATED` (the stage it left is stored in `Escalated_From`) | Yes |
| `ESCALATED` | GPC chooses **Extend** and a new due date | The stored stage; `Reminder_Count` resets to 0 | Reason required |
| `ESCALATED` | GPC chooses **Skip stage** | The next stage; the skipped stage is marked "no response" in the PDF | Reason required |
| `ESCALATED` | GPC chooses **Exempt** | `EXEMPT` | Reason required |
| `PROGRAM_PENDING` | GPC returns an advisor passage (plan §5.3) | Stays `PROGRAM_PENDING`; `Advisor_Return_Until` set to 5 days ahead and the advisor's fields reopen | Reason required |
| `PROGRAM_PENDING` | `Advisor_Return_Until` passes with no revision | Stays; the passage is kept out of the letter and the calibration view, and the GPC resolves it | Yes |
| Any state before `COMPLETED` | Administrator marks the student on leave | `ON_LEAVE`; open tokens expire | Yes |
| Any state before `COMPLETED` | Student withdraws or graduates | `EXEMPT` with reason "left the program" | Yes |

### 1.2 Course feedback

**Instructor pages (`Feedback_Requests.Status`)**: `NOT_STARTED → SENT → DRAFT → SUBMITTED → CLOSED`. `NOT_MY_COURSE` is reachable from `SENT` or `DRAFT` and ends that page; the administrator's correction creates a new page with the same due date and the same `Request_Key`, and marks the old row `REISSUED` so the record and the next import use the new one. A submitted page stays editable until it closes (decision 10).

**Co-taught lock**: opening a draft writes `Lock_Owner` and `Lock_Until` (30 minutes) to the page row. Others see it read-only, with the name of the person editing. Saving extends the lock; closing the page or letting it expire releases it.

**Each comment (`Course_Feedback.Status`, a new column)**

| Status | Meaning | Next |
|---|---|---|
| `NO_CONTACT` | "Not enough contact" or "Covered in my annual review" | Counted in the coverage line at release; no text to check |
| `SUBMITTED` | Waiting for the GPC's check | `CHECKED` or `RETURNED` |
| `RETURNED` | Sent back to the instructor with a logged reason; 5 days to revise | `REVISED`, or `STUDENT_ONLY` if release day arrives first |
| `REVISED` | The instructor has changed it | `CHECKED` or `RETURNED` again |
| `CHECKED` | Passed the four-item check | `RELEASED` at the quarterly release |
| `STUDENT_ONLY` | Released to the student only, with a GPC note; kept from the advisor, the calibration view and PDFs | `RELEASED` after a revision passes, or `RESOLVED` by the GPC |
| `RELEASED` | Visible to the student and advisor(s) | Included in the yearly record |

**Follow-up flags (`Followups`)**: `OPEN → CONTACTED → CLOSED`. Day 0 is the day the flag is submitted. Day 14: reminder to the handler. Day 21: the flag shows as overdue on the GPC's dashboard. `CONTACTED` requires `Contact_Date` and an `Outcome` ("Discussed", "Support arranged" or "Raised as an interim check-in"). Choosing an interim check-in creates an `INTERIM` row only after the GPC confirms it.

## 2. Pages

| Page | Who | What it shows | File |
|---|---|---|---|
| Annual review form | Student | Self-report with drafts; the **Course feedback** tab, with each quarter's released comments and the yearly record; the acknowledgement stage | `Index.html` |
| MA check-in | MA student, then advisor | The short quarterly form (§1.1) | `Index.html` (check-in mode) |
| Advisor stage | Advisor(s) | The student's report, the evaluation form, and the read-only Course Feedback Record | `Index.html` |
| My advisees' course feedback | Advisor(s) | Each advisee's released comments, newest first, read-only | `Index.html` (advisor view) |
| Instructor page | Instructor(s) | One page per offering: every student, the fields in course-feedback §5.2, the co-taught lock, "Not my course" | `FeedbackForm.html` |
| Roster | Administrator | MyGrad and Time Schedule buttons, previews, import counts, unmatched rows, missing instructor emails | `RosterPage.html` |
| Review and release | GPC (alternate for recused rows) | Quarterly check and release; yearly synthesis and release; Followups screen | `ReviewRelease.html` |
| Program stage and calibration | GPC (alternate for recused rows) | Calibration view with the frame-of-reference briefing; final ratings; the narrative check; letter editing; `ESCALATED` actions; Alert tracker | `Index.html` (program mode) |
| Calibration summary | Subfield coordinators | Their subfield's students: coverage line, ratings grid, flags, advisor's recommended rating. No free text unless the GPC opens it | `Index.html` (coordinator view) |
| Metrics | GPC | The `Metrics` sheet, with counts under 5 suppressed | Sheet |

Every page checks the signed-in UW account against the row, applies recusal before reading data, and stores nothing in the browser.

## 3. Email Texts

### 3.1 Rules for every email

- **Warm, short and plain.** Write as a colleague who wants the reader to succeed. Thank people for their time. Give one clear action and one link. Say how long it usually takes only where a plan states a figure.
- **No student content in course feedback emails.** They never name a student and never include a comment, rating or flag (course-feedback plan §5.1, §9).
- **No review content in annual review emails.** A student's name may appear in the body of an email to someone who already has access to that review, never in a subject line. No email carries a rating, a comment, a flag, or whether a letter raises a concern. Every email of a given kind reads the same whatever the review found, so nothing can be guessed from an inbox.
- **Letters and records live in the app.** Emails link to them; they are never in an email body (annual review plan §7). For the completed review PDF, this file uses a link to a copy shared only with the reader's UW account, matching the course feedback record (course-feedback §6.4) and the Registrar's advice to share student records through NetID-authenticated access. Decided 17 November 2026; plan §4.1 and §7 say the same.
- **Placeholders** are in `{braces}`. `{first_name}` is the recipient's preferred first name (MyGrad's `StudentPreferredName` for students). `{gpc_name}` signs every email.
- **Footer** (as in the TA system): *UW Department of Anthropology · Privacy notice · Reference: {id}. Replies to this email go to {gpc_name}.*

### 3.2 Course feedback

**CF-1. Instructor invitation** (Monday of finals week)

> **Subject:** A few minutes on your graduate students in {course} ({quarter})
>
> Dear {first_name},
>
> Thank you for teaching {course} this quarter. {n_as_word, e.g. Two} Anthropology graduate {student_or_students} took it, and we would be grateful for a short note on each.
>
> For each student, you'll first say whether you saw enough of their work to comment. "Not enough contact" is a perfectly good answer for someone you barely got to know. If you did see their work, you'll give three quick ratings, one thing they did well, and the one thing that would most strengthen their work next. It takes about 3 to 4 minutes for each student you comment on.
>
> Students read these notes with your name on them and use them to plan their next steps. They become part of the student's education record, so please describe the work rather than the person.
>
> [Open your page]. It's due {due_long}.
>
> If this isn't your course, [let us know] and we'll find the right person.
>
> With thanks,
> {gpc_name}
> Graduate Program Coordinator, Anthropology

**CF-2. First reminder** (the Wednesday after grades are due)

> **Subject:** Gentle reminder: your graduate students in {course}
>
> Dear {first_name},
>
> {Grades are due / Grades were due} {grades_due_long}. Thank you for all the work the end of the quarter takes. When you have a few minutes, your page for {course} is still open: [Open your page]. It's due {due_long}.
>
> Even a quick "Not enough contact" helps; it tells us the page has been seen.
>
> With thanks,
> {gpc_name}

**CF-3. Last reminder** (about three days before the due date)

> **Subject:** Last reminder: {course} feedback is due {due_short}
>
> Dear {first_name},
>
> A last note: your page for {course} closes on {due_long}. [Open your page].
>
> If you can't get to it this time, that's all right. The student's record will simply show that no feedback was received.
>
> With thanks,
> {gpc_name}

**CF-4. "Not my course" acknowledgement** (to the instructor)

> **Subject:** Thank you for letting us know about {course}
>
> Dear {first_name},
>
> Thank you for telling us, and sorry for the mix-up. We'll correct our records and send the page to the right person. There's nothing more you need to do.
>
> With thanks,
> {gpc_name}

**CF-5. "Not my course" alert** (to the administrator)

> **Subject:** Course feedback: instructor change needed for {course} {section} ({quarter})
>
> {instructor_name} says they did not teach {course} {section}. They suggested: {suggested_name_or_none}.
>
> [Open the Roster page] to correct the section or the `Instructors` sheet and send a new page. The due date stays {due_long}.

**CF-6. Return for revision** (to the instructor; names no student)

> **Subject:** A quick question about one of your comments in {course}
>
> Dear {first_name},
>
> Thank you for your feedback on {course}. Before it goes to the student, I'd like to ask you to look again at one comment. I've left a short note beside it explaining why.
>
> [Open the comment]. It would help to have your revision by {revise_by_long}. If it's easier to talk it through, just reply to this email.
>
> With thanks,
> {gpc_name}

**CF-7. Follow-up requested** (to the GPC and the advisor; names no student)

> **Subject:** An instructor has asked for a follow-up conversation ({quarter})
>
> Dear {first_name},
>
> An instructor has asked for a follow-up with {one_of_your_advisees_or_one_of_our_students} this quarter. {gpc_only: Their note is in the app: [Open the note].}
>
> The aim is to talk with the student by {deadline_long}, so they hear about it while there is still time to act on it. {advisor_only: I'll be in touch to share the note and agree which of us has that conversation.}
>
> Thank you,
> {gpc_name}

**CF-8. Follow-up reminder** (day 14, to whoever is handling it)

> **Subject:** A follow-up conversation is due by {deadline_short}
>
> Dear {first_name},
>
> Just a reminder that a follow-up conversation is due by {deadline_long}. If it has already happened, please record how it went: [Open the follow-up].
>
> If something is getting in the way, reply and we'll work it out together.
>
> Thank you,
> {gpc_name}

**CF-9. New feedback for the student** (at each quarterly release)

> **Subject:** Your instructors' notes from {quarter} are ready
>
> Dear {first_name},
>
> Your instructors from {quarter} have shared notes on your coursework, and you can read them now: [Read your feedback].
>
> Each note names one thing you did well and one suggestion for what to work on next. They're separate from your grades and meant to help you plan, so take what's useful.
>
> If anything is unclear, or you'd like to talk it over, your advisor and I are always glad to.
>
> Warmly,
> {gpc_name}

**CF-10. New feedback for the advisor** (at each quarterly release)

> **Subject:** Course feedback for your advisees ({quarter})
>
> Dear {first_name},
>
> Notes from {quarter}'s instructors are now available for {n} of your {advisee_or_advisees}: [Open them].
>
> They can be a good starting point for your next conversation.
>
> With thanks,
> {gpc_name}

**CF-11. Yearly record for the student** (spring week 2)

> **Subject:** Your Course Feedback Record for {feedback_year} is ready
>
> Dear {first_name},
>
> Your Course Feedback Record brings this year's notes from your instructors together in one place, with every suggested next step gathered into a single list: [Read your record].
>
> In your annual review this spring, you'll be asked which one or two of those next steps you'd most like to work on. There's no wrong answer; it's a chance to choose what matters most to you.
>
> Warmly,
> {gpc_name}

### 3.3 Annual review

**AR-1. Annual review opens** (to the student, spring week 1)

> **Subject:** Your annual review for {year} is open
>
> Dear {first_name},
>
> It's time for your annual review: a chance to look back on what you've done this year, take stock, and plan the year ahead with your advisor. It starts with you: [Open your report]. It's due {due_long}.
>
> Your form is already filled in with what we have from MyGrad and last year's goals, so most of the work is checking and adding to it. Your drafts save as you go.
>
> Your advisor reads your report before you meet. The form tells you who reads each section, and one section goes only to me, if there's anything you'd rather raise privately. If this year has been hard, you're welcome to say so there, or to talk with me or the Office of the Ombud.
>
> Warmly,
> {gpc_name}

**AR-2. Student reminder**

> **Subject:** A reminder: your annual review report is due {due_short}
>
> Dear {first_name},
>
> Just a reminder that your annual review report is due {due_long}: [Open your report]. Anything you've already written is saved.
>
> If you need a little more time, reply to this email and we'll sort it out.
>
> Warmly,
> {gpc_name}

**AR-3. Advisor's turn**

> **Subject:** An annual review report is ready for you
>
> Dear {first_name},
>
> {student_name} has finished their annual review report, and it's ready for you to read: [Open the review].
>
> Next, please meet with {student_first_name}, then complete your evaluation by {due_long}. The form asks for specifics: what went well, with an example; clear next steps; and, if something is off track, the benchmark, the support you'll offer and a date. {co_advisor_line: Your co-advisors can add to the same draft, and one of you signs.}
>
> Thank you for the time and care this takes.
>
> {gpc_name}

**AR-4. Advisor reminder**

> **Subject:** A reminder: an annual review evaluation is due {due_short}
>
> Dear {first_name},
>
> Your evaluation for {student_name}'s annual review is due {due_long}: [Open the review]. Your draft is saved.
>
> If the meeting hasn't happened yet or you need more time, just reply and let me know.
>
> With thanks,
> {gpc_name}

**AR-5. Ready for calibration** (to the GPC, one per subfield)

> **Subject:** Reviews ready for calibration: {subfield}
>
> {n_ready_as_word} of {n_total} reviews in {subfield} are ready for the calibration meeting. [Open the calibration view]. {n_waiting_as_word} {is_or_are} still waiting on a student or advisor.

**AR-6. Return for revision** (to the advisor, after the narrative check)

> **Subject:** A quick question about an evaluation you wrote
>
> Dear {first_name},
>
> Thank you for your evaluation of {student_name}. Before the letter goes out, I'd like to ask you to look again at one passage; I've left a note beside it explaining why.
>
> [Open the evaluation]. Your fields are open until {return_until_long}. If it's easier to talk it through, just reply.
>
> With thanks,
> {gpc_name}

**AR-7. Letter ready** (to the student; identical whatever the letter says)

> **Subject:** Your annual review letter is ready to read
>
> Dear {first_name},
>
> Your annual review is complete, and your letter and your advisor's evaluation are ready to read: [Read your letter].
>
> Please take your time with it. When you're ready, confirm that you've read it by {ack_due_long}. Confirming doesn't mean you agree, and you're welcome to add a written response, which will be attached to your review.
>
> If you'd like to talk about anything in it, tick "I would like to meet with the GPC" or simply reply. Graduate Student Affairs, the Counseling Center and the Office of the Ombud are also there for you, and the letter has their details.
>
> Warmly,
> {gpc_name}

**AR-8. Review complete** (to the student, advisor(s) and committee chair)

> **Subject:** Annual review complete ({year})
>
> Dear {first_name},
>
> {student_line: Your annual review for {year} is complete. Thank you for the thought you put into it.} {advisor_or_chair_line: The annual review for {student_name} is complete. Thank you for your part in it.}
>
> The final copy, including any response, is here: [Open the PDF]. It's shared only with your UW account.
>
> With thanks,
> {gpc_name}

**AR-9. Review needs attention** (to the GPC)

> **Subject:** An annual review needs your attention
>
> A review is overdue at the {stage} stage ({days_overdue} days past due, 2 reminders sent). [Open it] to extend, skip the stage or mark it exempt.

**AR-10. Check-in opens** (MA quarterly check-ins and PhD interim check-ins)

> **Subject:** Your {quarter} check-in is open
>
> Dear {first_name},
>
> It's time for a short check-in with your advisor: a quick look at how this quarter went and what comes next. [Open your check-in]. It's due {due_long}.
>
> {interim_line: It follows up on the plan you and your advisor agreed. If things have moved on, this is the place to say so.}
>
> Warmly,
> {gpc_name}

**AR-11. Alert deadline** (to the GPC, 5 business days before)

> **Subject:** Alert recommendation due {due_short}
>
> An Academic Alert recommendation for {n} {student_or_students} must reach the student and the Graduate School by {due_long}, the 10th business day of {quarter} (Policy 3.7.3). Petitions are considered up to the 15th. [Open the Alert checklist].

**AR-13. Check-in ready for the advisor** (PhD interim check-ins, and MA check-ins after the student's part; added during the build because §1.1 has no other way to tell the advisor)

> **Subject:** A check-in is ready for you
>
> Dear {first_name},
>
> {student_name}'s {quarter} check-in is ready for you: [Open the check-in]. It's due {due_long}.
>
> {interim_line: It follows up on the plan you agreed at their last review, and asks for progress on each benchmark and your verdict: resolved, continuing, or escalate to me.} {ma_line: It asks for your milestone determinations, any action items, and your verdict on how the quarter went.}
>
> Thank you for keeping in touch with them.
>
> With thanks,
> {gpc_name}

**AR-12. Post-cycle survey** (to students and advisors after acknowledgement)

> **Subject:** Help us make the annual review better
>
> Dear {first_name},
>
> Thank you for taking part in this year's annual review. Would you tell us how it went? This short survey is anonymous and isn't linked to your review: [Take the survey].
>
> Every answer helps us make next year's review clearer and more useful.
>
> With thanks,
> {gpc_name}

## 4. Acceptance Tests

Run each in a test copy, with one account playing every role, as the TA system was tested. A test passes only if every listed check passes.

**Roster and import**
1. A quiz-section registration (`AB`) matches its lecture (`A`); the instructor comes from the lecture row; the quiz TA is never asked.
2. A co-taught section yields one page with every instructor listed.
3. A joint-listed pair with the same instructor and meeting time merges into one page.
4. A cancelled section and a course with no Time Schedule match both appear as "No Time Schedule match."
5. An instructor name missing from `Instructors` blocks **Launch** until an email is added.
6. A student on leave gets no requests; a 600/700/800 course and a graduate-student instructor are excluded with their reasons shown.
7. MyGrad prefill writes GPA, leave end, committee flags, candidacy and ANTH 800 credits to `Students`; the export carries no grades into `Enrollments`.

**Course feedback**
8. Two co-instructors: the second sees the page read-only with the first's name until the lock expires.
9. "Not my course" sets `NOT_MY_COURSE`, sends CF-4 and CF-5, and the corrected page keeps the due date.
10. A returned comment revised in time is released normally; one not revised by release day reaches the student only and is absent from the advisor view, the calibration view and every PDF.
11. A follow-up flag sends CF-7 the next day, CF-8 on day 14, and shows overdue on day 21.
12. Quarterly release sends CF-9 and CF-10; the advisor sees only released comments.
13. No course feedback email contains a student name (automated check over every template's output).

**Annual review**
14. Co-advisors can both edit one draft, and one signs.
15. Recusal: the GPC cannot open an advisee's row by URL or batch view; the alternate can.
16. Each `ESCALATED` action (Extend, Skip, Exempt) reaches the right state and logs its reason.
17. A narrative return reopens the advisor's fields for 5 days without changing the status.
18. A student placed on leave mid-cycle moves to `ON_LEAVE` and their tokens stop working.
19. An MA student gets a check-in at the end of each enrolled quarter, including spring, and no annual review.
20. A concern rating with a missing milestone creates an `INTERIM` row due in 3 months.
21. The PDF contains no GPC-only field (automated check, plan §9.1).
22. AR-7 is byte-for-byte identical, apart from names and dates, for a *Satisfactory* and an *Unsatisfactory* review.
23. A 10 MB PDF uploads in the deployed web app (plan §9.1 spike).
24. Metrics suppress every count under 5.

## 5. Still Unverified Before or During the Build

- **Checked 18 Nov 2026:** the joint-listing merge on real Autumn 2026 pairs (ANTH 203 with LING 203; ANTH 432/532 with LING 432/532; ANTH 324 with 524), and MyGrad's `GPA` field against the Graduate School's definition (34 of 34 students matched within 0.01).
- The 10 MB upload (test 23), and every test that needs the live app: the owner must first open the deployed web app once and approve its permissions in Google's consent screen.
- The retention series, still to be confirmed with Records Management (annual review plan §10).
