# Plan: Graduate Student Annual Review System (UW Anthropology)

*Drafted 16 November 2026; revised the same day to add the PhD Taskforce report (§2.4). This is a plan only; nothing has been built yet.*

## 1. Summary

The plan is a web-based annual review of each graduate student's progress. It would be built as a sibling of the existing [`ta-evaluation-workflow`](https://github.com/benmarwick/uw-anthro-web-helpers/tree/main/ta-evaluation-workflow) and reuse its stack: Google Apps Script, Sheets, Docs to PDF, Gmail, tokenized links, an audit log, a dead-letter queue and reminders. Each year it runs these steps:

1. **The student reports.** The form is prefilled with last year's goals and the milestone data the Graduate Program Coordinator (GPC) holds.
2. **The student and advisor meet.** The advisor then evaluates the student, using agree/disagree items against the student's self-assessment and a 3-level rating tied to Graduate School Policy 3.7.
3. **Each subfield's faculty calibrate the ratings in one meeting.** The GPC records the final rating.
4. **Every student receives a letter.** Letters that raise a concern contain the benchmark, the deadline, the support offered and the consequence.
5. **The student acknowledges the letter and may respond.** The signed PDF is archived, and any interim check-in is scheduled automatically.

The process differs from the TA evaluation in four ways:
- **Order and parties.** The student goes first, there is a program-level stage, and there are co-advisors.
- **Legal basis.** It rests on Policy 3.7 and FERPA, not on Executive Order 28 and the UAW contract.
- **Calendar.** Due dates follow a spring cycle, not the end of each quarter's finals.
- **Consequences.** Ratings can feed a Notification or Alert under Policy 3.7, but **a person always makes that call**. The system never changes a student's standing itself.

The plan also adopts the recommendations of the Provost and Graduate School's **Taskforce on the Future of PhD Education** that fall to departments (§2.4):
- written milestone determinations;
- written action items from every review;
- an advisor–advisee compact, revisited each year;
- a mentoring network map;
- a career check-in and an optional transferable-skills self-assessment;
- a time-to-degree expectation, with a written plan to completion for anyone who goes past it;
- a feedback loop: a short survey after each cycle and program-level metrics.

A companion plan, [`course-feedback-plan.md`](course-feedback-plan.md), adds quarterly instructor feedback on students in courses. The GPC compiles it into a yearly Course Feedback Record. That plan proposes releasing it early in this review (its decision 1). Its §8 lists the changes it would need in this plan; none has been applied here yet.

---

## 2. What the research found

### 2.1 Anthropology's current practice (verified from the department's pages)

| Program | Current practice | Source |
|---|---|---|
| Archaeology PhD | All students meet their advisors early in spring quarter to complete the department's required Annual Review form. The co-advisors submit it to the Graduate Student Administrator. It covers a self-assessment and plan, coursework, teaching, conferences, grant and fellowship applications, publications, the mentor network, and challenges. Unsatisfactory progress leads to written notice and advice. **The page still uses the superseded terms "warning, probation or final probation."** | [phd-anthropology-archaeology](https://anthropology.washington.edu/phd-anthropology-archaeology) |
| Sociocultural PhD | A first-year portfolio is due in week 8 of spring, followed by a first-year evaluation that the student must pass to continue. After that, "the sociocultural faculty as a whole" evaluate each student at the end of every year, and the committee chair communicates the result in writing. | [phd-anthropology-sociocultural-anthropology](https://anthropology.washington.edu/phd-anthropology-sociocultural-anthropology) |
| Biological PhD | No formal annual review. The student "should meet at least once a year with their associate advisor." | [phd-anthropology-biological-anthropology](https://anthropology.washington.edu/phd-anthropology-biological-anthropology) |
| Department-wide | The procedural-steps page does not mention an annual review. No form is published online. The advising page, under "Anonymous Reporting Form", links to an [anonymous feedback form](https://forms.cloud.microsoft/r/33dZKZyZtW) for current students: "UW NetID sign-in required, but your name is not recorded; this form isn't monitored for emergencies." The page does not say who reads the responses (checked November 2026). | [procedural-steps-degree](https://anthropology.washington.edu/procedural-steps-degree), [advising](https://anthropology.washington.edu/advising) |

**What this means for the design.** The system replaces Archaeology's paper or emailed form and gives Sociocultural's whole-faculty evaluation a structured input and output. It also brings Biological Anthropology into a formal annual review, which is a decision for that faculty. The department should also publish written progress requirements and update its terminology, as the next section explains.

### 2.2 UW Graduate School requirements and guidance

- **[Policy 3.7, Academic Performance and Progress](https://grad.uw.edu/policies/3-7-academic-performance-and-progress/)** (revised September 2025):
  - *3.7.1 (required):* "Each graduate program is required to document and distribute performance and progress requirements… upon student enrollment." This covers milestones and their timelines, the consequences of missing them, and the appeal procedures.
  - *3.7.2 (a "should," not a "must"):* "The graduate program faculty should review a student's performance and progress at least annually."
    - Review should be **quarterly** in programs shorter than two years, and for students who are missing milestones or whose GPA is below 3.0.
    - Students not meeting milestones should get a written explanation of expectations, benchmarks and a timetable.
    - "Fellow students should not be involved in or present for these reviews."
  - *3.7.3:* The statuses run **Academic Notification** (optional and internal; the Graduate School is not told), then **Academic Alert**, then **Final Academic Alert**, then **Academic Drop**.
    - A program sends an Alert recommendation to the student and copies the Graduate School by the **10th business day** of the Alert quarter.
    - Every alert letter must cite the reason, the steps to remove the alert, the consequences and the deadlines.
    - "Warning," "probation" and "low scholarship" are no longer the policy's terms.
  - *3.7.6:* Alert status cannot change until the quarter after a student returns from leave.
  - *3.7.7:* Appeals go through Policy 3.8.
- **[Policy 3.8, Academic Grievance](https://grad.uw.edu/policies/3-8-academic-grievance-procedure/):**
  - The steps are informal conciliation (the [Office of the Ombud](https://www.washington.edu/ombud/) can help), then the College of Arts & Sciences grievance committee, then an appeal to the Graduate School Dean on procedural grounds.
  - The Graduate School's [best-practices document](https://facstaff.grad.uw.edu/wp-content/uploads/2025_UWGS-Grievance-Policy-best-practices.pdf) asks programs to record attempts at informal resolution and to put outcomes in writing.
- **[Policy 1.1](https://grad.uw.edu/policies/1-1-graduate-degree-requirements/)** sets time limits:
  - 6 years for a master's degree and 10 years for a doctorate.
  - Time on leave counts toward the limit.
  - A doctorate needs at least 27 dissertation credits (ANTH 800), spread over at least 3 quarters.
- **[Policy 3.5](https://grad.uw.edu/policies/3-5-on-leave-policy-to-maintain-graduate-student-status/):** A student on leave cannot be held to Alert expectations, except the time-to-degree limit.
- **[Policy 4.2](https://grad.uw.edu/policies/4-2-supervisory-committee-for-graduate-students/), §4.2.4 (added May 2026; checked against the policy page, November 2026):**
  - §4.2.4.1: a student who does not yet have a Committee Chair, or loses one, "must be assigned an Interim Faculty Point of Contact." Students "must have a faculty point of contact at all times." The GPC either serves in the role or delegates it to another faculty member. The role helps with thesis/dissertation credit registration and gives good-faith guidance on forming a committee. It is not a Chair and is not responsible for finding one.
  - §4.2.4.2: programs must monitor progress toward committee formation through periodic check-ins, and must document when students report difficulties such as miscommunication, unavailable faculty expertise or personality conflicts. "When progress falls behind expected timelines, the program should provide written guidance to the student" and identify next steps in a Notification or Academic Alert (Policy 3.7.3).
  - §4.2.4.3: failure to establish or maintain a committee must be documented with clear expectations for its composition and due dates. After autumn 2026, the expedited procedures of Policy 3.7.5 cannot be used when the only documented issue is an incomplete committee.
- **Mentoring and IDPs:**
  - The Graduate School recommends an [Individual Development Plan](https://grad.uw.edu/current-students/student-success/planning-your-path/) and publishes a [template](https://grad.uw.edu/wp-content/uploads/IDP.docx).
  - The [faculty mentoring guidance](https://facstaff.grad.uw.edu/advising-resources/mentoring/) asks for "forthright assessments" and contact at least once a quarter.
  - **The Graduate School does not require or provide an annual review form.**
- **[FERPA guidance for faculty and staff](https://registrar.washington.edu/staff-faculty/ferpa/):**
  - Any shared record about a student is an education record, and the student can inspect it within 45 days.
  - Only "sole possession" notes are exempt.
  - **So the design must assume the student can see everything stored in the system.**
- **[MyGrad](https://facstaff.grad.uw.edu/mygrad-for-faculty-and-staff)** holds committees, exams, degree requests and leave. It does **not** record annual reviews or Alert status. The department's system is therefore the record of reviews.
- **[UAW ASE contract](https://hr.uw.edu/labor/academic-and-student-unions/uaw-ase/ase-contract):**
  - Article 22.1 says the personnel file "should exclude all academic records."
  - Article 6.2 places academic decisions outside the contract.
  - **So TA and RA job evaluations stay in the TA system, and academic reviews stay in this one.**

### 2.3 Practices of other UW programs worth adopting

These come from 17 UW Seattle units. The full table is in Appendix A.

| Practice | Who does it | Adopted as |
|---|---|---|
| A student report, then an advisor meeting and assessment, then faculty calibration, then a letter to every student | Sociology, Geography, HCDE, Allen School (CSE), Political Science, Psychology | The core state machine (§4) |
| Ratings mapped directly onto the Policy 3.7 tiers, with an interim check-in for weaker ratings | [Microbiology](https://microbiology.washington.edu/sites/default/files/2024-12/2024-12%20Annual%20Thesis%20Committee%20Meeting%20Report.pdf), [HCDE](https://www.hcde.washington.edu/phd/annual-review) | The rating scale (§6) |
| The advisor says whether they agree with the student's self-assessment and comments when they do not | [Philosophy](https://phil.washington.edu/sites/phil/files/documents/faculty%20adviser%20form.docx) | The advisor form (§5.2) |
| A plan made in autumn, with the spring self-evaluation measured against it | [GWSS](https://gwss.washington.edu/sites/gwss/files/documents/graduate/graduate_academic_professional_planning_form.pdf), Psychology | Last year's goals prefilled and rated met, partly met or not met (§5.1). An autumn IDP step comes in phase 2 |
| A milestone table with an "expected by" date and an "unsatisfactory if not done by" date | [Geography](https://geography.washington.edu/satisfactory-academic-progress) | Milestone flags (§5.1) and the requirements the department publishes (§11) |
| Letters that name accomplishments, upcoming milestones and advice. A concern letter adds the benchmark, deadline and consequence | Sociology, HCDE, Geography | The letter template (§7) |
| A section that is confidential from the advisor | [Allen School (CSE)](https://www.cs.washington.edu/academics/graduate/phd-program/handbook/guides/review-progress/) | A section only the GPC sees (§8) |
| Asking the advisor "What are you struggling with in advising this student?" | [Food Systems, Nutrition & Health (FSNH)](https://foodsystems.uw.edu/wp-content/uploads/2025/07/FSNH-PhD-Annual-Progress-Review.docx) | An advisor field visible only to the GPC (§5.2) |
| An "asks for faculty" question, and a CV with the past year highlighted | [HCDE](https://www.hcde.washington.edu/phd/annual-review) | Student fields (§5.1) |
| Counting unsuccessful applications and what the student learned from them | GWSS, FSNH | The grants and publications fields (§5.1) |
| Copying the committee chair, and naming a substitute when the advisor is away | Geography, Sociology, HCDE | Routing rules (§4.3) |
| Funding and TA requests for next year collected in the same form | Geography, JSIS, FSNH | A student field that feeds TA allocation |
| A stated appeal path | [Political Science](https://www.polisci.washington.edu/graduate-student-guide-satisfactory-progress) | Text in the letter and the student response step (§7) |
| Practice to avoid: History lists annual review letters among the materials students *cannot* see | [History](https://history.washington.edu/phd-degree-evaluation-criteria) | Rejected, because FERPA gives students inspection rights |

### 2.4 The Provost and Graduate School PhD Taskforce report (2026)

**Source:** [PhD Taskforce report](https://facstaff.grad.uw.edu/ph-d-taskforce/taskforce-report/), from the Taskforce on the Future of PhD Education, "charged by the Office of the Provost and the Graduate School in January 2025." Co-chairs: the Dean of the Graduate School and a Divisional Dean of Arts & Sciences.

**Status:** The report is a set of recommendations ("If adopted…"), not policy. However, the Graduate School's [Year 2 Action Plan](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/) commits it to act on them. It also makes one requirement binding now: **"all Ph.D. programs are required to complete a program-level analysis of time-to-degree (TTD) during the 2026–27 academic year… Completed templates are due December 4, 2026"** ([TTD analysis page](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/time-to-degree-analysis/)). Years 3–5 "will require PhD programs to engage with questions about their curriculum, co-curricular requirements, milestones and funding approaches."

**Findings that bear on this design** (quoted from the report):
- Annual progress reviews and online handbooks are the two practices most widely used. "Initial advisor–student expectations agreements and academic conflict-management resources" had strong support but were in place in "fewer than half of PhD programs."
- Expectations are often implicit: "reliance on implicit or 'hidden' expectations related to publications, teaching, professional development and scholarly productivity."
- Handbooks "offer little insight into the milestones… qualifying exams are mentioned but their purpose, learning goals, format and timing are not."
- Students feel well connected in the first year, then report "increasing isolation during latter stages."
- Faculty favour "incentives, templates and low-burden systems rather than heavy enforcement." It praises tracking milestones systematically, because that helps "reduce single points of failure."

**Recommendations aimed at departments, and how this plan applies them:**

| Recommendation | Wording in the report | Where it lands in this plan |
|---|---|---|
| Academic Progress (AP) 2: adopt a milestone framework and publish a visual milestone map | "Advisors are required to provide students with written documentation regarding whether they have satisfied the requirements of each milestone." "Milestone conversations… should occur at all key transition points (e.g., onboarding, annual reviews, candidacy)." "Student-facing materials must provide clarity regarding the consequences." "Programs should establish a feedback loop (e.g. student surveys, annual reporting)." | Advisor's milestone determinations (§5.2); the milestone map is the same list as the system's configuration (§11); post-cycle survey and metrics (§9.5) |
| AP3: faculty agree on what each milestone is for | Purpose, learning goals, format and timing of each milestone, published and "reviewed regularly" | Policy work (§11) |
| AP4: transferable-skills self-assessment (Toolkit C) | "create a common language for advising conversations." The rubric is "reflective and developmental, not evaluative" | An optional self-assessment module that is never rated (§5.1) |
| Mentoring & Advising (MA) 1: post local policy and UW resources | "all units are required to post UW-wide resources and their local policy and practice in student handbooks" | Resources and escalation pathway in the form and the letter (§7); handbook work (§11) |
| MA2: advisor–advisee compact (Toolkit E) | "to be completed early and revisited periodically." The report recommends the compact "be revisited and revised annually by both parties, consistent with… the IDP" | A compact module (§4.5) and a compact check at each review (§5.1, §5.2) |
| MA3: standardise the annual review | A structured check-in covering "timing of milestones, what is next in the student's academic journey and a check-in on career aspirations"; it should revisit the compact and the milestone map. "Written documentation of decisions and action items stemming from the annual review is required" | The whole system; an action-items table (§5.2) carried into the next cycle (§5.1); a career check-in (§5.1) |
| MA4: early mentoring committees, *or* a documented plan for multiple mentors, with IDPs | Committees or a plan "paired with individual development plans and mentoring plan prompts" | A mentoring network map (§5.1). Mentoring committees are an open decision (§13) |
| MA5: time-to-degree expectations and a plan to completion | If a student will go past the expected time, "advisors should be required to put in writing, to the student and the Graduate Program Coordinator, a document that summarizes progress since the last annual review, reasons for delay, a plan for completion with specific milestones and timelines and any changes made to support student completion." If they disagree, Policy 3.7 applies | A plan to completion (§4.6) |
| Toolkit D: mentoring practices | Mentors must ensure that the mentee "knows what the milestone deadlines are," "has a feasible plan," and that roadblocks are removed. They must "clearly communicate when a mentee is not making satisfactory progress." They should also point students to "the program's reporting flowchart," and the report encourages "the Graduate School Representative (GSR) to serve as an accessible and impartial point of contact" | Advisor checklist (§5.2); escalation flowchart and the GSR named in the letter (§7) |
| Community & Belonging (CB) 3: structured engagement after year one; Idea C: "belonging checkpoints" | Isolation in the later years "may contribute to attrition or lengthened time to degree" | A belonging question in the anonymous post-cycle survey (§9.5); community activities as a policy item (§11) |
| Idea D: "5+ Year Completion Checkpoint" with a "support menu" | A committee reset meeting, a writing sprint, a 6–12 month milestone map, and referral to mediation | The support menu in the plan to completion (§4.6) |

**A tension in the report.** The report calls annual reviews "mandated by Graduate School policy 3.7.2", but Policy 3.7.2 itself says faculty "should" review at least annually. This plan treats the annual review as expected practice either way.

**How binding the report's wording is.** Where the report says "required" or "must" (in AP2, MA1 and MA3), it is a recommendation describing what it wants, not current policy. MA3, MA4 and MA5 themselves are worded as options: "should determine whether," "could promote," "could implement." Only the time-to-degree analysis is an actual requirement today. This plan adopts these recommendations because they are good practice and the Graduate School has said it will act on them.

**PhD only.** The taskforce covers PhD programs only. For MA students this plan applies the parts that Policy 3.7 also supports: milestone determinations, action items and the letter. Compacts, the skills self-assessment and the plan to completion are PhD-only by default (open decision 23).

The report's recommendations to the Graduate School on funding (dashboards, cohort-size planning, differential tuition) and on careers (central resources, tracking alumni) are outside this system's scope. The funding and career fields the system collects could feed them later.

---

## 3. Design principles

1. **The student goes first, and the advisor responds to what the student wrote.** This is less work for the advisor, and the student's own account comes before any judgement.
2. **A person decides; the system documents.** A rating never changes a student's status by itself. A Notification or Alert is a separate action the GPC takes, and the system drafts the letter for it.
3. **Nothing about the student is hidden from them.** The app shows the student the advisor's evaluation, the final rating and the letter. Two items are not shown in the app, and the student can get both on request under FERPA: the GPC's calibration notes, and the advisor's "advising challenges" note (if it is kept; see open decision 13). The section the student keeps from their advisor holds the student's own words.
4. **Role names.** "GPC" in this plan means the **Graduate Program Coordinator**, the faculty member who runs the graduate program (Policy 3.7.2 names both a GPC and a GPA). The **Graduate Student Administrator** (the GPA, the staff role the Archaeology page names) runs the cycle: roster, launch, reminders and archiving. The GPC alone handles program-stage judgements: final ratings, letters, Notifications and Alerts. Rename these if the department's titles differ.
5. **Recusal.** If the GPC is the student's advisor, co-advisor or committee chair, the review is routed to an alternate (default: the department chair) for both the program stage and the GPC-only notes. The roster records an `Alternate_Reviewer` for each student, and the system refuses to give the GPC access to those rows. **How this is enforced:** the web app runs as the system account and checks the signed-in user, so the app can enforce recusal. Google Sheets cannot restrict a person who can open the spreadsheet to certain rows. So the GPC works **only through the web app** and is not given direct access to the spreadsheets, and the system account is a department account the GPC does not log into (decision 11). The Graduate Student Administrator needs direct access to run the menus, so for that role, staying out of review content is a written convention. Drive's activity log and the app's audit log make access visible after the fact.
6. **One process for the department, configured per program.** Each subfield, and the MA, can have its own milestone list, question wording and calibration group. The code stays the same.
7. **Prefill where we can.** The form carries forward last year's goals and committee. The Graduate Student Administrator loads milestone and leave data from MyGrad by hand, using the existing MyGrad Table Audit bookmarklet. The system never scrapes MyGrad automatically.
8. **Keep academic and employment records separate.** Students may describe their teaching, but the advisor does not rate their TA or RA job performance here.
9. **No fellow students.** Student representatives are excluded from calibration and from all access to review records (Policy 3.7.2).
10. **Developmental material is kept apart from evaluation.** The transferable-skills self-assessment, the mentoring network map and the compact help the student develop and are not graded. They never feed the rating. The advisor may comment on them but does not score them (Taskforce Toolkit C: "reflective and developmental, not evaluative").

---

## 4. Workflow and state machine

### 4.1 States

| Status | Who acts | What happens |
|---|---|---|
| `NOT_STARTED` | GPC | A review row exists for this student in this cycle |
| `STUDENT_PENDING` | Student | Self-report form, with a server-side draft and autosave. Optional CV upload |
| `ADVISOR_PENDING` | Primary advisor | Read the student's report, meet the student, then evaluate and sign. Co-advisors can add to the same draft. One person signs for the group |
| `PROGRAM_PENDING` | GPC, after the subfield faculty meet | Review the reviews, record calibration notes, set the final rating (an override needs a reason), and edit the generated letter |
| `STUDENT_ACK_PENDING` | Student | Read the advisor's evaluation and the letter. Acknowledge them, with an optional written response, and sign |
| `PDF_GENERATING` | none | The PDF is built and emailed to the student, advisor(s), committee chair and GPC |
| `COMPLETED` | none | The PDF is archived. If the rating calls for an interim check-in, a follow-up row is created |
| `ESCALATED` | GPC | No action after the reminders and past the due date |
| `ON_LEAVE` / `EXEMPT` | GPC | Skipped this cycle with a recorded reason, such as leave or graduating. Time to degree is still tracked |

The flow runs `NOT_STARTED → STUDENT_PENDING → ADVISOR_PENDING → PROGRAM_PENDING → STUDENT_ACK_PENDING → PDF_GENERATING → COMPLETED`.

**Why the advisor does not sign again after the student's response.** In the TA system the instructor signs again after the TA responds. Here the letter is the program's final word, and the student's response is attached to it. The advisor and committee chair get the PDF that includes the response. This saves a stage, and the student's response is still on the record.

### 4.2 Interim check-ins

When the rating is *Satisfactory with concerns* or *Unsatisfactory*, completing the review creates a new **`INTERIM`** row due in 3 or 6 months, as the advisor chose.
- The interim form is short: progress on each benchmark, then the advisor's verdict (resolved, continuing, or escalate to the GPC). It skips the program stage unless someone escalates.
- This puts in place Policy 3.7.2's "quarterly for students not meeting milestones."

### 4.3 Routing rules

- **Advisors.** The roster lists a primary advisor and optional co-advisors. Any of them can open the advisor stage, and the primary advisor, or whoever the GPC delegates, signs. The committee chair receives copies if they are not an advisor (Geography's practice).
- **No advisor, or the advisor is away on sabbatical or leave.** The GPC assigns a substitute reviewer: the Interim Faculty Point of Contact under Policy 4.2.4. The system refuses to launch a row that has no reviewer.
- **The program stage** is limited to the GPC account, plus optionally the subfield's graduate committee chair. The system has no faculty-wide login; calibration happens in a meeting using the batch view (§9.4).

### 4.4 Cycle calendar (configurable in `Config.gs`, replacing the end-of-finals due dates)

| Step | Default due date | Notes |
|---|---|---|
| Launch | First week of spring quarter | Archaeology's existing "early spring" timing |
| Student report | End of spring week 3 | |
| Advisor meeting and evaluation | End of spring week 6 | |
| Subfield calibration meetings | Spring weeks 7–8 | Sociocultural already meets "at the end of the academic year." This brings the meeting forward so letters go out before summer |
| Letters released | Spring week 9 | |
| Student acknowledgement | 14 days after release | Falls in finals week or just after |
| Sociocultural first-year portfolio | Spring week 8 (existing rule) | A separate review type, `FIRST_YEAR`, with a portfolio upload and pass/fail by the whole faculty |
| MA (Archaeological Heritage) | A short check-in at the end of autumn and of winter (the `INTERIM` form, launched automatically), plus a full review in spring only for students continuing past spring | Policy 3.7.2 says programs shorter than two years should review quarterly. The program is under two years: 36 credits, and the [program page](https://anthropology.washington.edu/ma-archaeological-heritage) says students from UW Archaeology undergraduate programs "can complete this rigorous high-quality MA degree in 3-4 additional quarters (9-12 months)". A spring-only review would land as many students finish, so the autumn and winter check-ins do the real work. The page gives no standard length for other students; ask the program director how long they usually take |

The existing reminder logic (every 5 days, at most 2 reminders, then escalation) carries over.
- Reminders are suppressed between the end of spring finals and the start of autumn, except for interim rows.
- Token lifetime rises from 30 to 45 days, because the program stage can wait several weeks for calibration. Tokens still rotate at every stage.

### 4.5 Advisor–advisee compact (Taskforce MA2, Toolkit E)

- **Who writes one, and when (phase 2, from autumn 2027):** the incoming cohort and their advisors in their first autumn, plus all current PhD students in the same autumn 2027 round, and any student who changes advisor. The spring 2027 cycle has no compact fields. The compact check and the "no compact on file" flag start with the spring 2028 cycle.
- **Format:** Toolkit E's columns: *mentee's understanding*, *mentor's understanding* and *shared understanding*, for each of these prompts:
  - goals;
  - research responsibilities;
  - meetings (frequency, agendas, who writes the summary);
  - how feedback is shared;
  - the mentoring network;
  - the timeline to the milestones and how changes are handled;
  - contact methods and response times;
  - how conflicts will be handled;
  - funding expectations;
  - support needed.

  The department picks which prompts appear.
- **Workflow:** a short three-step cycle on the same engine:
  1. The student drafts the mentee column.
  2. The advisor adds the mentor column and a draft shared column.
  3. Both sign.

  It is stored as its own record type, `COMPACT`, with a new version each year.
- **At each annual review:** the student and advisor each answer "Is the compact still accurate?" (yes, or needs revising). "Needs revising" opens a new compact version after the review. The current compact appears read-only in both forms.
- **Ownership:** the compact belongs to the student and advisor. In the web app the GPC sees only that a compact exists and when it was last revised. Opening the text requires entering a reason (for example, "conflict raised by the student"), and the reason is written to the audit log. This is an enforced, logged step in the app. It is a convention only for people with direct spreadsheet access (principle 5). The compact is still an education record that the student can see.
- **Co-advised students:** one joint compact, signed by the student and every co-advisor (default; open decision 22).

### 4.6 Time-to-degree expectation and plan to completion (Taskforce MA5, Idea D)

- **The expectation:** the faculty set and publish an expected time to degree for each program (§11). Until they do, `Config.gs` holds a **placeholder of year 7 for the PhD**. That figure is not taken from any source. Replace it with a figure based on the department's own data in the December 2026 time-to-degree analysis. For reference, the Graduate School's figures give a UW-wide median of 5.5 years. The plan to completion is PhD-only by default (decision 23).
- **What happens past it:** once a student passes the expectation, the annual review (or an interim review) requires an extra advisor section, the **plan to completion**. It holds the four items MA5 lists:
  - progress since the last annual review;
  - the reasons for the delay;
  - a plan for completion with specific milestones and dates;
  - changes made to support timely completion.

  The student sees the plan, and both the student and the GPC receive it in the PDF. The student records whether they agree with the plan when they acknowledge the review.
- **Support menu:** optional items the advisor can tick (Idea D):
  - a meeting to reset the committee;
  - a writing sprint;
  - a milestone map for the next 6–12 months;
  - referral to the Ombud for mediation.
- **If they disagree:** the GPC is notified, and any further step follows Policy 3.7 and is taken by a person (§6).
- **Separate from the Graduate School limit:** the system still flags the Graduate School's own time limits (6 years for the MA, 10 for the PhD) separately.

---

## 5. Data collected

The "Source" column shows the program or policy behind each field. It is there so the faculty can trim the list without losing the reason for a field.

### 5.1 Student self-report

| Section | Fields | Required? | Source |
|---|---|---|---|
| Status | Program and subfield; year in program (computed); advisors and committee (prefilled; the student confirms or corrects them); quarters on leave (prefilled) | Yes | Policy 4.2.4, 1.1 |
| Milestones | A checklist by program, each with "done on" or "planned for": committee formed; MA or en-route MA; language or methods requirement; qualifying or first-year review; prospectus; General Exam; IRB submitted and approved; fieldwork start and end; candidacy; ANTH 800 credits (prefilled); reading committee; Final Exam | Yes | Archaeology, Middle Eastern Languages & Cultures (MELC), Geography, Policy 1.1 |
| Behind schedule | Shown only when a milestone is past its "expected by" date: an explanation and a plan | Conditional | MELC, Policy 3.7.2 |
| Coursework | Courses taken this year (title and grade), courses planned, incompletes | Yes | Archaeology, Sociology |
| Research progress | Narrative, up to about 500 words: fieldwork, lab or collections work, analysis, chapter status, working title | Yes | Archaeology, JSIS, Interdisciplinary PhD (IPhD) |
| Publications and other outputs | Repeatable rows: citation; stage (in preparation, submitted, in review, accepted, published); peer reviewed (yes or no); type (article, chapter, dataset, software, public scholarship) | Optional | Archaeology, GWSS |
| Presentations | Repeatable rows: title, venue, date, type | Optional | Archaeology, Linguistics |
| Grants and fellowships | Repeatable rows: funder, amount, applied or awarded or declined or pending. **Unsuccessful applications are counted** | Optional | Archaeology, Linguistics, GWSS, FSNH |
| Teaching and research appointments | Roles held, with course or project and quarter (description only, no ratings) | Optional | Archaeology; ASE separation |
| Service, outreach, community-engaged work | Free text | Optional | GWSS, Philosophy |
| Last year's goals | Prefilled from last year's plan; each rated met, partly met or not met, with a comment | Yes after year 1 | GWSS, Psychology |
| Next year's plan (IDP) | Goals in five categories: degree progress, research, skills, career, funding. A sixth, personal, is optional. Uses the Graduate School's IDP categories | Yes | Graduate School IDP, Philosophy, Allen School (CSE) |
| Funding and TA requests | Expected funding source; TA or RA interest by quarter | Yes | Geography, JSIS, FSNH |
| Action items from last year | Prefilled from last year's action items (§5.2). For each: done, in progress, or dropped, with a note | Yes after year 1 | Taskforce MA3 |
| Career check-in | Current career aspirations (academic, non-academic, both, undecided), what has changed, and what support is wanted. Links to Graduate Student Affairs and the career centres. *A development module: the student and advisors see it, it is not in the PDF (§10)* | Yes (short) | Taskforce MA3, CP1–2 |
| Mentoring network map | Who supports the student, by role: research, writing, career, emotional support, accountability, community. Gaps the student wants to fill. Replaces the old "other mentors" field. *A development module (§10)* | Optional | Taskforce Toolkit D, MA4; Archaeology's mentor network |
| Transferable-skills self-assessment | Toolkit C's nine skills (communication, leadership and collaboration, ethical research, AI literacy, data analysis, project management, entrepreneurship, pedagogy, public engagement), each rated 1–4 with evidence and next steps. Last year's ratings are shown alongside. **Developmental only, never graded.** *A development module (§10)* | Optional | Taskforce AP4, Toolkit C |
| Compact check | "Is your compact with your advisor still accurate?" (yes, or needs revising), with a comment | Yes once a compact exists | Taskforce MA2 |
| Challenges | Optional free text, with a note that the advisor will read it | Optional | Archaeology, HCDE, SEFS |
| Advising | Preferred meeting frequency; any committee changes needed. **The advisor sees this section.** The question "Is advising meeting your needs?" is optional here, because students answer an advisor-visible version less candidly. It is also asked in the GPC-only section (open decision 14) | Optional | Philosophy, FSNH, SEFS, Archaeology's mentor network |
| Asks for faculty | "What would help you most this year?" | Optional | HCDE |
| Uploads | CV with the past year highlighted (PDF, 10 MB maximum). An unofficial transcript is optional | CV recommended | HCDE, Sociology |
| **GPC-only section** | Optional concerns about advising, climate or the program. The advisor never sees it, and it is never printed in the PDF. Links to the anonymous department form and the Office of the Ombud are next to it | Optional | Allen School (CSE); see §8 |
| Signature | A typed name and an acknowledgement, the same as in the TA system | Yes | |

### 5.2 Advisor evaluation

| Field | Notes | Source |
|---|---|---|
| Date of the meeting with the student | Required. The form explains that the meeting is expected | Archaeology, Philosophy |
| **Milestone determinations** | For each milestone attempted this year: satisfied, not yet satisfied, or not satisfied, with a one-line reason. Printed in the letter as the written record of the advisor's decision | Taskforce AP2 ("written documentation regarding whether they have satisfied the requirements of each milestone"); Policy 3.7.2 |
| Mentor checklist | Ticked after the meeting: the student knows the upcoming milestone deadlines; the student has a feasible plan to meet them; we discussed the standard for the next milestone (with an example shared, if possible); roadblocks I can remove (free text) | Taskforce Toolkit D |
| **Action items** | A table of action, owner (student, advisor, committee or program) and due date. Printed in the letter and prefilled into next year's form and any interim review | Taskforce MA3 ("written documentation of decisions and action items… is required") |
| Compact check | Still accurate, or needs revising | Taskforce MA2 |
| Career and skills | Optional comment on the student's career check-in and skills self-assessment. **No rating** | Taskforce MA3, AP4 |
| Plan to completion | Required only when the student is past the expected time to degree (§4.6) | Taskforce MA5 |
| Agree or disagree with the student's self-assessment, for milestones, research, coursework, professional activity and the IDP plan | A disagreement needs a comment ("how did you advise?") | Philosophy |
| Notable accomplishments | Required, and fed into the letter | Sociology |
| Areas for development | Each with its seriousness: minor, moderate, serious | GWSS |
| Comments on the timeline | Required if a milestone is overdue | FSNH |
| Goals added or amended for next year | Added to the IDP the student will see next year | Philosophy |
| **Recommended rating** | See §6 | Microbiology, HCDE |
| If concerns: **the benchmark, deadline, support offered, check-in in 3 or 6 months, and consequence** | Each is required when the rating is below Satisfactory | Policy 3.7.2 and 3.7.3 |
| Paragraph for the letter | Optional wording the advisor proposes | Sociology |
| Advising challenges (GPC only; **open decision 13**) | "Is anything making it hard to advise this student well?" Default: shown to the student at the acknowledgement stage, so nothing an advisor writes is kept from the student. The alternative is to drop the field and handle such issues in a conversation with the GPC | FSNH |
| Signature | Primary advisor, or co-advisors | |

### 5.3 Program stage (GPC)

- Calibration notes, the date of the calibration meeting, and which subfield group met.
- The final rating. A rating different from the advisor's needs a reason.
- The letter text, generated from a template and editable (§7).
- **Status action, separate from the rating:** none, Notification (internal), or a recommended Alert or Final Alert.
  - Choosing an Alert opens a checklist: the letter cites all four required elements, the Graduate School is copied by the 10th business day, and the dates are recorded.
  - The system does not contact the Graduate School itself. The GPC sends the copy and records the date.
- A funding-priority flag for the department's information. It does not trigger anything automatically.

### 5.4 Student acknowledgement

- Acknowledges reading the evaluation and the letter. Acknowledging does not mean agreeing.
- An optional written response, attached to the PDF.
- "I would like to meet with the GPC" (checkbox).
- Appeal information is shown: informal resolution with the GPC or the Ombud, then the College of Arts & Sciences grievance procedure (Policy 3.8).

---

## 6. Rating scale and how it maps to Policy 3.7

| Rating | Meaning | Automatic consequence | Possible human action |
|---|---|---|---|
| **Satisfactory** | Meeting expectations | None | — |
| **Satisfactory with concerns** | On track overall, with specific issues | Benchmark fields required; interim check-in row created | The GPC may record an internal **Academic Notification** |
| **Unsatisfactory** | Not meeting performance or progress expectations | Benchmark fields required; interim check-in row created; GPC alerted | The GPC and the faculty decide whether to recommend an **Academic Alert** through the Policy 3.7 process |

A fourth outcome, *"Not reviewed – on leave or exempt"*, records the cycle without a rating. Under Policy 3.5, a student on leave is held only to the time-to-degree limit.

**Flags the system computes and shows to the advisor and GPC.** None of them changes a rating.
- Past the program's **expected** time to degree (§4.6), which makes the plan to completion required.
- Near the Graduate School's limits: year 8 or later for a doctorate, year 5 or later for the MA. Leave counts toward this.
- No compact on file, or a compact last revised more than 12 months ago.
- A milestone past its "unsatisfactory if not done by" date.
- No committee Chair (Policy 4.2.4).
- A GPA below 3.0, if the GPC enters it.
- A 3rd consecutive *with concerns* rating.

---

## 7. The letter

Every student gets a letter, signed by the GPC (or the alternate reviewer) and copied to the advisor(s) and committee chair. **This changes Sociocultural's practice, in which the committee chair communicates the result. See open decision 15.** The template contains:
1. Recognition of accomplishments, from the advisor's input.
2. Upcoming milestones and dates.
3. Advice and next year's agreed goals.
4. **Milestone determinations** (satisfied, not yet, or not satisfied) for each milestone attempted this year, and the **action items** table with owners and dates (Taskforce AP2 and MA3).
5. The plan to completion, if one was required (§4.6).
6. **If concerns:** the specific benchmark(s); the deadline; the support the department and advisor will give; the check-in date; and the consequence if the benchmark is not met. These are the elements Policy 3.7.2 lists.
7. **If an Alert is recommended:** a separate Alert letter template with the four elements Policy 3.7.3 requires. A Final Alert letter adds the "can be immediately dropped" wording. These are rare, and the GPC reviews each one manually.
8. Rights and resources: how to respond, the appeal route, the Office of the Ombud, Graduate Student Affairs, Counseling, Disability Resources for Students, and the Husky HelpLine.
9. **Who to talk to if the advising relationship is strained:** the department's escalation flowchart (advisor, then GPC, then department chair, then the Ombud, then the grievance procedure), and the student's **Graduate School Representative (GSR)**, named, as an "accessible and impartial point of contact" once the student has a committee (Taskforce Toolkit D, MA1).

Delivery: the letter is shown inside the app at the acknowledgement stage and goes out as a PDF attachment, never as the body of an email. This follows the Registrar's FERPA guidance.

---

## 8. The confidential channel

Three ways for a student to raise a concern, each with a different level of privacy:
1. **Anonymous:** a link to the department's existing anonymous MS Form. It is truly anonymous, and nothing reaches the review record.
2. **Named, kept from the advisor:** the GPC-only section of the self-report.
   - It is stored in a **separate spreadsheet** shared with no person, only owned by the system account. The GPC reads it through the web app, which applies recusal (§3, principle 5). The main review row holds only a yes/no flag ("GPC-only note present").
   - It is never included in the PDF or any email, and never shown on the advisor's or program stage screens.
   - The student is told: "Your advisor will not see this. It is part of your education record, which you can see."
3. **Third party:** the Office of the Ombud (confidential), linked next to both of the above.

If the advisor's "advising challenges" field is kept (decision 13), it is stored in its own sheet and shown to the student at acknowledgement. It is kept from the calibration view, not from the student.

**Recusal:** when the GPC advises the student, GPC-only notes go to the alternate reviewer instead (§3, principle 5).

---

## 9. Technical plan: what to reuse from `ta-evaluation-workflow`

Build this as a **separate Apps Script project, spreadsheet and deployment**, starting from a copy of the TA project. Keeping them separate holds academic records apart from ASE personnel records, and lets each project use its own retention period and sharing. If later maintenance warrants it, the shared infrastructure can become an Apps Script library.

### 9.1 File-by-file

| File | Action | Changes |
|---|---|---|
| `AuditLog.gs`, `Logs.gs`, `DeadLetterQueue.gs`, `Alerting.gs` | **Reuse** with renames | New action names (`STUDENT_SUBMIT`, `ADVISOR_SUBMIT`, `PROGRAM_SUBMIT`, `STUDENT_ACK`, `INTERIM_CREATED`, `STATUS_ACTION_RECORDED`) |
| `Config.gs` | **Modify** | New statuses and sheet names. Cycle calendar (§4.4) in place of `QUARTER_END_DATES_`, which is still used to find spring week N. Milestone lists for each program; the rating scale; `TOKEN_TTL_DAYS` = 45; the GPC email as a separate value from `ADMIN_EMAIL` |
| `Security.gs` | **Modify** | Identity checks against a *list* of advisors, plus a GPC role for the program stage. `STAGE_FIELDS_` for the four stages. GPC-only fields are written to the separate sheet. Upload checks (PDF only, size, file count) |
| `WebApp.gs` | **Modify** | Four stage handlers. **Drafts for every stage**; the TA system only saves drafts at the instructor stage. File upload uses the route Google documents: pass the `<form>` element to `google.script.run`, so the file input arrives as a Blob and goes straight to `DriveApp.createFile(blob)` with no base64 step. Google's docs set no size limit on `google.script.run` arguments or on `createFile(blob)`; the only documented limit on this path is the 6-minute execution time. **Still a build spike:** with no documented limit to check against, upload a real 10 MB PDF in the deployed web app early in the build. The fallback is a smaller cap (about 5 MB) or a link to a file in the student's UW Google Drive. A batch view of the program stage for calibration. Prefill loaders |
| `Automation.gs` | **Modify** | Due dates set by the cycle. Interim rows. Summer quiet period. Reminders go to all listed advisors |
| `EmailEngine.gs` | **Rewrite templates** | Invitations, reminders, letter release, completion. The Policy 3.7 and FERPA wording replaces the Executive Order 28 and UAW wording |
| `PdfEngine.gs` | **Rewrite layout** | Student report, advisor evaluation, letter, response, signatures. **Leaves out GPC-only fields by design**, with a unit check that no confidential key reaches the PDF builder |
| `SheetAdmin.gs` | **Modify** | Menu items: Initialize; **Import Roster**; **Launch Cycle** (one row per active student who is not on leave); Mark On Leave or Exempt; **Generate Letters**; Release Letters; and the existing health and DLQ items |
| `Index.html` | **Major rewrite** | Repeatable rows for publications, presentations and grants; milestone checklist; goals carried forward; file upload; a stage progress bar. Keeps the WCAG 2.1 AA patterns, server-side drafts and no browser storage |
| **New** `Roster.gs` | New | The `Students` sheet: name, email, program, subfield, entry quarter, advisors, chair, **GSR**, `Alternate_Reviewer`, milestone dates, leave quarters, GPA (optional). Time-to-degree calculation |
| **New** `Letters.gs` | New | Letter and Alert-letter templates as data. A check that a concern letter has all its required fields filled |
| **New** `Confidential.gs` | New | Reads and writes the separate GPC-only spreadsheet |
| **New** `Compact.gs` | New | The `COMPACT` record type (three-step cycle, versions), and the current compact shown read-only in review forms |
| **New** `Metrics.gs` | New | De-identified program metrics and the post-cycle survey link (§9.5) |

### 9.2 Data model

- **`Reviews`**: one row per student per cycle (or interim). Columns: `Review_ID`, `Cycle`, `Type` (`ANNUAL`, `INTERIM`, `FIRST_YEAR` or `COMPACT`), `Student_Email`, `Advisor_Emails`, `Chair_Email`, `Status`, dates, `Reminder_Count`, `Secure_Token`, `Token_Expiry`, **`Student_Payload`, `Advisor_Payload`, `Program_Payload`, `Response_Payload`** (each its own JSON cell), `CV_File_ID`, `Final_PDF_Link`, `Parent_Review_ID` (for interim rows), `Payload_Version`.
  - The TA system holds everything in one `Data_Payload` cell with a 45,000-character cap. Google Sheets cells hold at most 50,000 characters. Splitting the payload by stage gives each stage its own budget.
  - Repeatable rows (publications and so on) stay inside the student payload, with a cap of about 40 rows per table.
- **`Students`**: the roster (above).
- **`Development_Payload`** (another column in `Reviews`): the career check-in, the mentoring network map and the skills self-assessment. It is kept apart from the student report so that it can be left out of the PDF and the calibration view (§10). It also keeps the student payload under the cell limit.
- **`Goals`** is not stored separately. Last year's IDP goals come from the student's most recent `COMPLETED` annual review.
- **Separate spreadsheet `Confidential`**: `Review_ID`, `Author_Role`, `Text`, `Timestamp`.
- `Audit_Log`, `Logs` and `Dead_Letter_Queue`, unchanged in structure.

### 9.3 Prefill from MyGrad (manual)

Each cycle the Graduate Student Administrator runs the existing **MyGrad Table Audit** bookmarklet. They then copy committee, exam and leave dates into `Students`, or use a CSV import. The app never logs into or scrapes MyGrad. This keeps the existing FERPA boundary described in the repository readme.

### 9.4 Calibration view

A page for the GPC alone, filtered by subfield. It shows each student's year, flags, the advisor's recommended rating, accomplishments and concerns, and is meant to be projected or shared during the faculty meeting. It shows nothing from the GPC-only sheet. Final ratings are entered here.

### 9.5 Feedback loop and program metrics (Taskforce AP2, Year 2 TTD analysis)

- **Post-cycle survey.** After acknowledging, each student and advisor gets a link to a short anonymous survey. It is a separate MS Form or Google Form that is **not linked** to their review. It asks:
  - Were the milestone expectations clear?
  - Was the review useful?
  - How many minutes did it take?
  - Students only: "Do you feel connected to the department community?" This is the report's belonging checkpoint (Idea C).
- **Program metrics** (GPC menu item → a `Metrics` sheet). Only counts are reported, and any cell with fewer than 5 students is suppressed:
  - completion rate and median days per stage;
  - rating distribution by year in the program and by subfield;
  - median year in which each milestone is reached;
  - number of students past the expected time to degree, and how many have a plan to completion;
  - how many students have a compact.

  These support next year's required analyses. The Graduate School says Years 3–5 will ask programs about milestones and time to degree.
- **Not a source for the December 4, 2026 TTD analysis.** That analysis uses the Graduate School's own TTD data and is due before this system exists.

---

## 10. Privacy, records and retention

- **Legal basis and purpose:** Policy 3.7 (reviewing progress and documenting expectations). These are FERPA education records, classified *Confidential* by UW.
- **Privacy notice:** copy the structure of the TA system's privacy policy, which follows the UW Privacy Office's elements, and rewrite the content. Remove the UAW Article 22 and Executive Order 28 material. Add the student's FERPA rights to inspect and to request amendment (WAC 478-140), and explain the GPC-only section.
- **Who can see what:**

  | Who | What they see |
  |---|---|
  | Student | **Shown in the app:** their own report, the advisor's evaluation (including the advising-challenges note, if kept), the final rating, the letter and their response. **Available on request** (FERPA, within 45 days): the calibration notes, audit entries and anything else stored about them |
  | Advisors | The report, the evaluation, the letter and the response. The **development modules** (career check-in, mentoring map, skills self-assessment), which appear in the app only and not in the PDF. Not the student's GPC-only notes |
  | Committee chair (if not an advisor) | The final PDF only, which has no development modules or GPC-only notes |
  | GPC (through the web app only) | Everything needed for the program stage, the GPC-only notes and the metrics. The development modules only in aggregate or at the student's request. The compact only with a logged reason. Never the rows of the GPC's own advisees (recusal) |
  | Alternate reviewer (usually the department chair) | The same as the GPC, for the recused rows only |
  | Graduate Student Administrator | Direct spreadsheet access to run the cycle, so technically everything. Reading review content is limited by convention and logged by Drive |
  | System account | Everything (a department account; decision 11) |
  | Subfield faculty at calibration | The calibration view only (no development modules, no GPC-only notes) |
  | Fellow students | **Nothing** |

- **Retention:** the likely series is **[Student Folders](https://finance.uw.edu/recmgt/recordseries/student-folders)** in the UW General Schedule (Student and Curriculum records). It covers a student's academic history, including "evaluative/progress report documentation"; the department holds the official copy; it is kept **6 years after the degree is awarded or after last activity**, then shredded or deleted. The shorter [Advisor's Files](https://finance.uw.edu/recmgt/recordseries/advisors-files) series (1 year after the student is inactive or graduates) covers advisors' working notes, not evaluations, so it does not fit the review record. The ASE series the TA system uses does not apply. **Before launch, confirm with [UW Records Management](https://finance.uw.edu/recmgt/)** that Student Folders is right and that Anthropology's department schedule adds nothing. As in the TA system, nothing is deleted automatically. Logs are pruned after 90 days.
- **CV uploads** go in a restricted Drive folder owned by the system account, with the same retention period as the review.

---

## 11. Policy work the department should do alongside the system

1. **Publish written progress requirements** for each program, with milestones, "expected by" and "unsatisfactory if not done by" dates, consequences and the appeal path, and send them to students and faculty at enrollment. **Policy 3.7.1 requires this.** The system's milestone configuration and these published requirements should be the same list.
2. **Update the Archaeology page** to replace "warning, probation or final probation" with the current terms: Notification, Academic Alert and Final Academic Alert.
3. **Biological Anthropology** should decide whether to take part in the annual review. Policy 3.7.2 says faculty "should" review at least annually.
4. Name the **Interim Faculty Point of Contact** process for students without a Chair (Policy 4.2.4).
5. **Submit the required time-to-degree analysis for each PhD program by December 4, 2026** ([template and instructions](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/time-to-degree-analysis/)). The analysis goes to the dean of the College of Arts & Sciences. It is separate from the system and due before the system exists, but the delays it identifies should shape the milestone map and the expected time to degree below.
6. **Publish a visual milestone map for each program** (Taskforce AP2, AP3). For each milestone, give its purpose, learning goals, format, expected timing, "unsatisfactory if not by" date, and the consequence of missing it. Make it the same list as the system's milestone configuration, so the form, the letter and the handbook never disagree.
7. **Set and publish an expected time to degree** for each program (Taskforce MA5), which drives §4.6.
8. **Adopt a compact template** adapted from Taskforce Toolkit E, and an IDP template adapted from the [Graduate School's IDP](https://grad.uw.edu/wp-content/uploads/IDP.docx).
9. **Post UW-wide resources and local practice in the handbook.** Taskforce MA1 says units "are required" to do this. That is recommendation wording, not yet policy, but it is easy to do. Include an escalation flowchart for strained advising relationships.
10. **Structured community after year one** (Taskforce CB2 and CB3): for example, dissertation-stage colloquia or writing groups. The report also recommends "consistent recognition practices aligned with milestones". With the student's consent, milestone determinations of *satisfied* could feed an announcement of milestones each quarter. This is outside the system, but the survey's belonging question (§9.5) measures it.

---

## 12. Rollout

| When | What |
|---|---|
| By 4 Dec 2026 | **Submit the time-to-degree analysis for each PhD program** (separate from this system; §11 item 5) |
| Dec 2026 – Jan 2027 | The graduate committee settles the open decisions (§13). Confirm the retention series. Draft the published progress requirements |
| Jan – Feb 2027 | Build: copy the TA project, then Roster, the four stages, the PDF and letters. Cycle-one modules: milestone determinations, action items, career check-in, mentoring network map, optional skills self-assessment, the plan to completion (once the faculty have set the expected time to degree), and the post-cycle survey. Run a test cycle in which one account plays every role, as the TA system was tested |
| Late Feb 2027 | Pilot with 3–5 volunteer students and their advisors, ideally including one co-advised Archaeology student and one MA student. Revise the forms based on what they report |
| Spring 2027 | First full cycle on the calendar in §4.4. Paper or email fallback available for anyone who cannot use the app |
| Summer 2027 | Debrief: completion rates, time per stage, feedback from faculty and students. Adjust the fields |
| Autumn 2027 (phase 2) | **Compacts** for every PhD student and advisor, and for the incoming cohort (§4.5). Build `Compact.gs` over summer 2027. The metrics sheet (§9.5) produces its first report from the spring 2027 data. Optional autumn IDP and planning step (the GWSS model). Interim check-ins from the spring ratings go live. The first-year sociocultural portfolio moves into the app |

---

## 13. Open decisions (each with a recommended default)

| # | Decision | Recommended default |
|---|---|---|
| 1 | One department-wide process, or one per subfield? | **One system**, with milestones, wording and calibration groups set per subfield |
| 2 | Who calibrates? | **The subfield faculty meeting** (Sociocultural's existing practice). The GPC records the outcome |
| 3 | Does Biological Anthropology take part? | **Yes**, with its associate-advisor meeting as the advisor stage |
| 4 | How often are MA students reviewed? | **Full review in spring plus a light check-in in winter** |
| 5 | Does the advisor sign again after the student responds? | **No.** The advisor gets the final PDF |
| 6 | Is the GPC-only section included? | **Yes**, stored separately, alongside a link to the anonymous form |
| 7 | Is a CV upload required? | **Recommended, not required** |
| 8 | A 3-level or 4-level scale? | **3 levels** (§6). Alerts stay a separate decision by a person |
| 9 | Should ratings affect funding priority? | **Show a flag only.** Any funding decision stays with the committee |
| 10 | Does the committee chair, if not the advisor, get the letter? | **Yes** (Geography's practice) |
| 11 | Which account runs the system? | **A department account**, not a personal one, so sent mail and file ownership do not sit in one faculty member's account (the same lesson as the TA system's README §9) |
| 12 | When does the first cycle run? | **Spring 2027**, after the pilot |
| 13 | Keep the advisor's "advising challenges" note? | **Keep it and show it to the student at acknowledgement.** Do not keep a note from the student that the advisor wrote about them |
| 14 | Where does "Is advising meeting your needs?" go? | **In the GPC-only section**, plus an optional advisor-visible version |
| 15 | Who signs the letter? | **The GPC**, with the advisor's paragraph included. Sociocultural may keep its committee chair as the signatory if its faculty prefer |
| 16 | Who is the alternate reviewer when the GPC has a conflict? | **The department chair** (§3, principle 5) |
| 17 | Adopt advisor–advisee compacts? | **Yes, from autumn 2027** (phase 2): every PhD student and advisor in that first round, then each incoming cohort. Revisit at each review from spring 2028 |
| 18 | Expected time to degree | **Faculty set it for each PhD program**, based on the December 2026 time-to-degree analysis. The year-7 placeholder has no source |
| 19 | Include the transferable-skills self-assessment? | **Optional for students, never rated** |
| 20 | Early mentoring committees (Taskforce MA4)? | **No.** Use the mentoring network map instead, and let a subfield opt in if it wants committees |
| 21 | Run the post-cycle survey and metrics? | **Yes.** The survey is anonymous and separate from the review, and small counts are suppressed |
| 22 | Co-advised students: one compact or one per advisor? | **One joint compact**, signed by the student and all co-advisors |
| 23 | Which taskforce modules apply to MA students? | **Milestone determinations, action items and the career check-in only.** No compact, skills self-assessment or plan to completion |
| 24 | Who sees the development modules (career check-in, mentoring map, skills)? | **The student and advisors only**, in the app and not in the PDF. The GPC sees them in aggregate or at the student's request |

---

## 14. Risks

- **Workload.** Pilot targets: **20 minutes or less for the advisor stage** (excluding the meeting) and **45 minutes or less for the student report**. Agree/disagree items and prefilled fields are meant to keep it there. The taskforce additions (milestone determinations, action items, compact check) are short structured fields, and the plan to completion appears only for students past the expected time. Measure the time in the pilot. If it runs long, cut the optional modules first. The report itself warns against "heavy enforcement" and favours "low-burden systems."
- **Students' concerns about candor.** A student may not want to criticise an advisor on a form the advisor reads. That is why the GPC-only section, the anonymous form and the Ombud are offered side by side, and why the form says plainly who sees what.
- **Apps Script limits.** Gmail quotas and the 6-minute execution limit apply. About 80 students a cycle is well within the limits the TA system already handles. Large CV uploads go one at a time.
- **Policy drift.** Policy 3.7 has changed three times since 2021. Keep the status names and letter wording in `Letters.gs` and `Config.gs` so they can be updated without code changes.

---

## Appendix A: Other UW programs surveyed

**PhD Taskforce:** [PhD Taskforce report](https://facstaff.grad.uw.edu/ph-d-taskforce/taskforce-report/) (read in full; quotations in §2.4 are verbatim). Also the [Year 2 Action Plan](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/) and the [time-to-degree analysis page](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/time-to-degree-analysis/).


Geography ([review](https://geography.washington.edu/annual-graduate-student-review), [progress requirements](https://geography.washington.edu/satisfactory-academic-progress)); Sociology ([AY2025 manual](https://soc.washington.edu/sites/soc/files/documents/AY2025%20Graduate%20Program%20Manual.pdf)); [HCDE](https://www.hcde.washington.edu/phd/annual-review); [Allen School (CSE)](https://www.cs.washington.edu/academics/graduate/phd-program/handbook/guides/review-progress/) (seen only in search snippets); [iSchool](https://ischool.uw.edu/programs/phd/curriculum/degree-requirements/student-review-policy); [Linguistics](https://linguistics.washington.edu/graduate-milestones); [JSIS form](https://jsis.washington.edu/wordpress/wp-content/uploads/2018/04/APR_Form.pdf) (2018); GWSS ([self-evaluation](https://gwss.washington.edu/sites/gwss/files/documents/graduate/graduate_student_self-evaluation_form_gwss.pdf), [advisor](https://gwss.washington.edu/sites/gwss/files/documents/graduate/faculty_annual_evaluation_of_grad_students.pdf), [plan](https://gwss.washington.edu/sites/gwss/files/documents/graduate/graduate_academic_professional_planning_form.pdf); 2014); Philosophy ([student](https://phil.washington.edu/sites/phil/files/documents/grad%20self%20eval%20form.docx), [advisor](https://phil.washington.edu/sites/phil/files/documents/faculty%20adviser%20form.docx)); [Food Systems, Nutrition & Health (FSNH) PhD](https://foodsystems.uw.edu/wp-content/uploads/2025/07/FSNH-PhD-Annual-Progress-Review.docx); [Interdisciplinary PhD](https://sites.uw.edu/iiphd/degree-requirements/annual-review); [History](https://history.washington.edu/phd-degree-evaluation-criteria); [Political Science](https://www.polisci.washington.edu/graduate-student-guide-satisfactory-progress); Psychology (2018–19 manual, read from a third-party mirror); [Biology](https://biology.washington.edu/admin-gateway/graduate-students/committee-report-forms); [Microbiology](https://microbiology.washington.edu/sites/default/files/2024-12/2024-12%20Annual%20Thesis%20Committee%20Meeting%20Report.pdf); [SEFS mentorship plan](https://sefs.uw.edu/wp-content/uploads/sites/22/2022/10/SEFS-Graduate-Student-Mentorship-Plan-Oct.-2022.pdf); [MELC MA form](https://melc.washington.edu/sites/melc/files/documents/graduate/MA%20Annual%20Progress%20Review%20Form%2C%20October%202023.pdf); [Atmospheric Sciences](https://atmos.uw.edu/wp-content/uploads/2026/03/2026-March-Satisfactory-Progress-Official-Version.pdf).

**Could not verify:**
- The Graduate School's NetID-protected GPC and GPA resources, which may include Alert letter templates.
- The OAA memorandum on Policy 3.7 (the PDF could not be read).
- The fields on the Biology and iSchool forms.
- Current Allen School (CSE) details beyond search snippets.
- The fields on Anthropology's own Archaeology Annual Review form, which is not online. **Ask the Graduate Student Administrator for the current form before finalizing §5.**

**Checked in November 2026** (previously unverified): Policy 4.2.4 (§2); the department's anonymous feedback form (§2); the length of the Archaeological Heritage MA (§4.4); the retention series (§10, still to confirm with Records Management); Google's documented upload limits (§9, still needs a live 10 MB test).
