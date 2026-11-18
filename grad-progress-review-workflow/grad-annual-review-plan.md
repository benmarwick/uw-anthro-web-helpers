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

A companion plan, [`course-feedback-plan.md`](course-feedback-plan.md), adds quarterly instructor feedback on students in courses. The GPC releases each quarter's comments to the student and advisor, and compiles them into a yearly Course Feedback Record released at the end of spring week 2 (its decisions 1 and 2). It is built as a module of this system. The changes its §8 asks for are applied here: the calendar (§4.4), the self-report (§5.1), the advisor evaluation (§5.2), the technical plan (§9.1, §9.4, §9.5) and who sees what (§10).

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

*Every item below was re-read against its source on 17 November 2026, except the MyGrad item, which says what was not re-checked. Revision dates are the ones each policy page gives.*

- **[Policy 3.7, Academic Performance and Progress](https://grad.uw.edu/policies/3-7-academic-performance-and-progress/)** (revised October 2021, November 2024 and September 2025):
  - *3.7.1 (required):* "Each graduate program is required to document and distribute performance and progress requirements to each of its graduate faculty and graduate students upon student enrollment." The documentation "shall include":
    - general expectations, including coursework, research, "professional behavior relevant to the program," fieldwork, and the time allowed for each phase;
    - "key academic and professional milestones," "expected timelines," and "evaluation of progress and milestones by faculty";
    - the performance issues that lead to each status (§3.7.3);
    - the consequences of missing a milestone, "including process and timing for managing repeated attempts at a milestone";
    - "Procedures for appealing program decisions."
  - *3.7.2 (a "should," not a "must"):* "The graduate program faculty should review a student's performance and progress at least annually."
    - **Who reviews:** "Program faculty, the Graduate Program Coordinator (GPC), Graduate Program Advisor (GPA), or an advisory/supervisory committee designated by the graduate program." For doctoral candidates, "the doctoral supervisory committee reviews student progress and does so, in consultation with the GPC as needed." "Fellow students should not be involved in or present for these reviews."
    - **What may be used:** "a variety of professional behavior and academic metrics." "It is acceptable to compare a student's performance and progress relative to that of other students in the program or to individually negotiated schedules if consistently used." Students should maintain "a minimum cumulative and quarterly 3.0 grade point average."
    - **How often:** "at least quarterly" in programs "under two years long"; quarterly for "Students not meeting milestones, including those whose cumulative or quarterly grade point average (GPA) falls below a 3.0"; and at least annually in the research or fieldwork phase, "with greater frequency as determined by program length, expectations and student performance." "Unsatisfactory performance may require mid-quarter reviews and interventions."
    - Students not meeting milestones "should be provided with a written explanation of performance expectations, clear descriptions of performance benchmarks and outcomes that would demonstrate improvements, and a timetable."
  - *3.7.3:* "The goal of each step is to establish clear expectations and outline a path to return to satisfactory progress." Status changes "are recorded in the student record but do not appear on the student transcript, except when a student is dropped."
    - **Academic Notification** is "optional" and "managed internally by the program." It can be issued more than once and "at any time of the quarter," should give the student "a reasonable amount of time," and the Graduate School "is not notified." The Graduate School recommends that programs of two years or less "consider bypassing Notification, except in areas of minor concern," which covers the Archaeological Heritage MA.
    - **Academic Alert:** the recommendation goes to the student, copied to the Graduate School, "no later than the 10th business day of the academic alert quarter," with petitions considered up to the 15th. Letters must cite the reason, the steps to remove the Alert, the consequences, and the deadlines. When deadlines cannot be met in one quarter, an Alert can last "up to 3 quarters (excluding Summer, e.g., Winter through Autumn)." Each extra quarter needs an updated recommendation before the 10th business day of the end quarter, or the Graduate School "will consider the student's Alert status lifted." "Normally, at least one quarter of Academic Alert must be issued prior to Final Academic Alert."
    - **Final Academic Alert:** the same 10th-business-day deadline. The letter must also state "That the student can be immediately dropped from the program if steps are not taken," and the Dean of the Graduate School sends a confirming letter. One quarter of Final Alert must come before a drop, except under 3.7.5.
    - "Warning," "probation" and "low scholarship" do not appear in the current policy.
  - *3.7.4:* Drop recommendations go to the Graduate School "prior to the start of the quarter but no later than the fifth business day of the drop quarter."
  - *3.7.5:* A program may move a student straight to Final Alert, or rarely to Drop, for failing clearly defined milestones (qualifying or preliminary exams, the General or Final Exam, required courses in lockstep cohort programs, fieldwork or professional performance), but only for circumstances its "policy and handbook" describe. Other cases need the Office of Academic Affairs (gsacad@uw.edu).
  - *3.7.6:* Programs "may recommend (but not require)" leave in an Alert. An Alert can begin in a leave quarter only if it rests on quarters the student was enrolled. "A student's alert status cannot be further changed until the quarter (Autumn, Winter, Spring) following the quarter they return from leave."
  - *3.7.7:* Appeals go through Policy 3.8.
- **[Graduate School guidelines on Policy 3.7 and the Student Conduct Code](https://grad.uw.edu/wp-content/uploads/OAA_Memorandum-on-Policy-3.7.pdf)** (Office of Academic Affairs, revised October 2025; guidance, not policy):
  - Where conduct both fails a program's expectations and, "if true, would violate the student conduct code," "The conduct code process MUST be followed first AND a final order issued before there can be a Policy 3.7 process based on that conduct."
  - "Pending allegations or reports of misconduct under the student conduct code should not be considered in a Policy 3.7 proceeding," whether for a Notification, an Alert or a drop.
  - A program unsure whether behaviour is a conduct matter should consult Community Standards & Student Conduct (cssc@uw.edu) before putting it in a Notification or Alert.
  - Neither a program nor the Graduate School can dismiss a student from the University; their authority ends at a drop from the program.
- **[Policy 3.8, Academic Grievance](https://grad.uw.edu/policies/3-8-academic-grievance-procedure/)** (latest revisions November 2025, and §3.8.1 in January 2026):
  - The steps are informal conciliation (the [Office of the Ombud](https://www.washington.edu/ombud/) can help); then the College of Arts & Sciences Student Academic Grievance Committee, "composed of both faculty and students," whose hearing gives "advisory recommendations" to the dean; then an appeal to the Dean of the Graduate School within 15 business days, on procedural uniformity only.
  - "Information concerning the availability of grievance procedures shall be provided to students and shall be readily available as part of program student handbooks."
  - The Graduate School's [best-practices document](https://facstaff.grad.uw.edu/wp-content/uploads/2025_UWGS-Grievance-Policy-best-practices.pdf) says: "Document not only final decisions but also attempts at informal resolution," and "Communicate outcomes in writing to all relevant parties." It suggests starting informal conciliation "commonly within 3 months of the issue."
- **[Policy 1.1, Graduate Degree Requirements](https://grad.uw.edu/policies/1-1-graduate-degree-requirements/)** (revised February 2026):
  - Time limits "should be established at the program level." Only "in the absence of program-level limits" do the defaults apply: six years from first enrollment for a master's, and ten years for a doctorate, counted from enrollment in the PhD program or in a master's program in the same unit. "Periods spent on leave or out of status count toward this time."
  - "Students nearing or past the program's limit should be placed on Academic Alert." Extensions "can be made at the program level."
  - A doctorate needs "a minimum of 27 credits of dissertation (800…) over a period of at least three quarters, with at least one quarter occurring after the general examination," and no more than 10 dissertation credits a quarter without program approval.
  - Before the General Exam is scheduled: at least 18 credits at the 500 level or above, at least 18 graded credits at the 400 and 500 levels (excluding 499), at least 60 credits in all, and approval from every committee member. "A student must be registered for credit the quarter in which any required exam or presentation occurs."
- **[Grading for graduate students](https://policy.uw.edu/directory/sgp/sgp-110-grades-honors-and-scholarship/#b-grading-practices-for-graduate-students)** (Scholastic Regulations 110.1.B, which the Graduate School's grading guidance links to):
  - "A minimum of 2.7 will be required in each graded course which counts toward satisfying graduate degree requirements."
  - The GPA is "calculated entirely on the basis of numeric grades in 400- and 500-level courses." It excludes S, NS, CR, NC and N grades, and all courses numbered 600, 700, 800 and 801.
  - An Incomplete without a grade by the next quarter's deadline (excluding summer) "will remain as a permanent part of the student's record."
- **[Policy 3.5, On-Leave Status](https://grad.uw.edu/policies/3-5-on-leave-policy-to-maintain-graduate-student-status/)** (revised April 2026):
  - Students on leave "cannot be required to make any specific academic progress, including expectations described in Academic or Final Academic Alerts, except to meet time to degree limits." Leave counts toward the limits.
  - Being on Academic Alert or Final Academic Alert does not bar a student from leave.
  - **Summer:** "Students cannot be required to meet expectations described in Academic or Final Academic Alerts if not registered in summer, except to meet time to degree limits. Academic Alerts issued at the beginning of summer quarter by programs that do not require summer registration should extend through fall quarter." Programs may require summer registration or summer work only "if described in written program guidelines." Whether Anthropology requires summer registration was not checked.
- **[Policy 4.2, Supervisory Committees](https://grad.uw.edu/policies/4-2-supervisory-committee-for-graduate-students/)** (revised May 2026; §4.2.4 added May 2026):
  - §4.2.4.1: a student who does not yet have a Committee Chair, or loses one, "must be assigned an Interim Faculty Point of Contact." Students "must have a faculty point of contact at all times." The GPC either serves in the role or delegates it to another faculty member. The role helps with thesis and dissertation credit registration and gives good-faith guidance on forming a committee. It is not a Chair and is not responsible for finding one.
  - §4.2.4.2: GPCs "must" "ensure students receive timely communication (e.g., required annual review, quarterly letters as needed) of expectations and available options for progress towards the degree." The "must" attaches to timely communication; the annual review is the policy's example, and Policy 3.7.2 itself still says "should" (see the tension noted in §2.4). Programs must also monitor progress toward committee formation through periodic check-ins, document reported difficulties such as "patterns of miscommunication, unavailability of faculty with the appropriate scholarly expertise, or personality conflicts," and consult the department chair or the Graduate School's Associate Dean of Student Success. "The Civil Rights Compliance Office should be consulted in circumstances where harassment, bullying or other types of unprofessional behavior are claimed." "When progress falls behind expected timelines, the program should provide written guidance to the student and identify next steps in a Notification or Academic Alert."
  - §4.2.4.3: failure to establish or maintain a committee must be documented with clear expectations for composition and due dates, with "at least two quarters of documentation and communication with the student, consisting of an Academic Alert followed by a Final Academic Alert, before the Graduate School will consider an Academic Drop." After autumn 2026, the expedited procedures of Policy 3.7.5 cannot be used when the only documented issue is an incomplete committee.
  - §4.2.2.4.2, **the GSR:** the required duties are to attest to the validity of examinations, to "ensure that the student is treated in an unbiased manner," and to represent university-wide standards. A program may add that the GSR "serve as a neutral resource to support clarity and fairness as the student navigates the exam and dissertation process." Any such addition must be "clearly articulated and communicated in writing by the Graduate Program Coordinator (GPC) or designee to all parties" and "defined consistently across all committees in the graduate program."
  - §4.2.5: for human or animal subjects research, "the GPC or GPA must advise the student" of the Human Subjects Division and IACUC requirements, and "The program should maintain documentation that the committee chair and students have been so advised."
- **[Policy 4.3, the GPC and the GPA](https://grad.uw.edu/policies/4-3-the-graduate-program-coordinator-and-the-graduate-program-advisor/)** (revised November 2020; §4.3.2 April 2024):
  - The Dean of the Graduate School appoints the GPC from the Graduate Faculty, at the rank of Professor, Associate Professor, Teaching Professor or Associate Teaching Professor. "One or more alternate GPCs may serve as deputy."
  - The GPA "is normally appointed to staff" and "must participate in training provided by Graduate Enrollment Management Services."
  - The GPC's minimum duties include "To advise, counsel and assist graduate students, or to arrange and verify that this service is rendered by another member of the Graduate Faculty or program staff," and "To ensure that special attention is given to newly admitted students and others with particular needs."
- **Mentoring and IDPs:**
  - The Graduate School recommends an [Individual Development Plan](https://grad.uw.edu/current-students/student-success/planning-your-path/) and publishes a [worksheet](https://grad.uw.edu/wp-content/uploads/IDP.docx). It groups goals as academic, career and personal; asks of each goal why it matters, what help is needed and the timeline; and has lines for "Discussed with Advisor or Mentor (date)" and "Plan to revisit with Advisor." It recommends SMART goals.
  - The [faculty mentoring guidance](https://facstaff.grad.uw.edu/advising-resources/mentoring/) says: "Talk to your mentees at least once a quarter." "Provide students with forthright assessments of their work. Do not assume they know what you think about their work." "Use concrete language to convey feedback on students' work… Ambiguous feedback hinders students' performance." It also says "Departments can ask graduate students to assess their mentors."
  - **No annual review form appears on the Graduate School's public pages.** Its GPA/GPC Resource Guide and procedures pages require a UW sign-in and were not read, so they may contain templates.
- **FERPA:**
  - The Registrar's [guidance for faculty and staff](https://registrar.washington.edu/staff-faculty/ferpa/): "The student has a right to inspect and review any departmental or college records you maintain on them except for 'sole possession records.'" Notes others can inspect "are no longer sole possession and become education records."
  - The 45-day limit comes from [WAC 478-140-022](https://registrar.washington.edu/students/ferpa/), as the Registrar's student page states, and from [34 CFR 99.10(b)](https://www.law.cornell.edu/cfr/text/34/99.10): access must be given "not more than 45 days after" the request.
  - **So the design must assume the student can see everything stored in the system.**
- **[MyGrad](https://facstaff.grad.uw.edu/mygrad-for-faculty-and-staff)** records committees, exams, degree requests and leave; its Current Student List also shows GPA. Not re-checked in November 2026: whether MyGrad records annual reviews or Alert status. Policy 3.7.3 says status changes "are recorded in the student record," without naming the system. Either way, the department's system is its own record of reviews.
- **[UAW ASE contract](https://hr.uw.edu/labor/academic-and-student-unions/uaw-ase/ase-contract):**
  - Article 22, Section 1: "The personnel file should exclude all academic records and academic applications submitted to the University."
  - Article 6, Section 2: discipline under the contract "does not include any action based on academic performance. No decision made by the University concerning academic discipline or dismissal of a student is subject to this Agreement."
  - Article 18, Section 2: "The University has the sole and exclusive authority to make all decisions involving academic matters."
  - **So TA and RA job evaluations stay in the TA system, and academic reviews stay in this one.**

**What the re-reading adds for this design.** Applied on 17 November 2026: conduct matters (§5.3), the time-limit flag (§6), the GSR wording (§7), the alternate-GPC option (decision 16), the GPA definition (§6), the IDP categories (§5.1) and the summer-registration basis for autumn Alerts (§4.4).
- Pending conduct allegations cannot appear in an advisor's narrative, a concern letter or a status action; a possible conduct matter goes to Community Standards & Student Conduct first (OAA guidelines).
- Policy 1.1 says a student nearing or past the time limit "should be placed on Academic Alert," and the department may set its own limits. The "expected time to degree" (§4.6) and the limit are different things.
- The GSR's "neutral resource" role, which §7 names in the letter, is optional under Policy 4.2.2.4.2, and the program must define it in writing for every committee.
- Policy 4.3 provides for an alternate GPC, appointed by the Dean, which could serve as the recusal alternate (decision 16).
- The GPA flag should use the Graduate School's definition: 400- and 500-level numeric grades only, excluding 600, 700, 800 and 801 courses.
- The IDP worksheet groups goals as academic, career and personal, not the five categories §5.1 attributes to it.
- Policy 3.5.2.1 supports the autumn default for Alerts decided in spring (§4.4) for students not registered in summer.

### 2.3 Practices of other UW programs worth adopting

These come from 18 UW Seattle units whose pages or forms were read on 17 November 2026. Appendix A lists every source. Several forms are old: the iSchool page is dated 2016, the JSIS progress form 2018, and the MELC MA form October 2023. The Allen School's Review of Progress page now requires a CSE login, so it was read from the Internet Archive's copy of 6 September 2026. Psychology appeared in an earlier draft of this table; its manual was read only from a third-party copy of the 2018–19 edition, so it is no longer cited.

| Practice | Who does it | Adopted as |
|---|---|---|
| A student report, then an advisor meeting and assessment, then a faculty review, then a letter to every student | [Sociology](https://soc.washington.edu/sites/soc/files/documents/AY2025%20Graduate%20Program%20Manual.pdf) (p. 18), [Allen School (CSE)](http://web.archive.org/web/20260906181814/https://www.cs.washington.edu/academics/graduate/phd-program/handbook/guides/review-progress/), Philosophy ([student](https://phil.washington.edu/sites/phil/files/documents/grad%20self%20eval%20form.docx), [advisor](https://phil.washington.edu/sites/phil/files/documents/faculty%20adviser%20form.docx)), [iSchool](https://ischool.uw.edu/programs/phd/curriculum/degree-requirements/student-review-policy) (years 1–2 only). [Geography](https://geography.washington.edu/annual-graduate-student-review), [HCDE](https://www.hcde.washington.edu/phd/annual-review), [Political Science](https://www.polisci.washington.edu/graduate-student-guide-satisfactory-progress) (cohorts from 2025) and the [Interdisciplinary PhD](https://sites.uw.edu/iiphd/degree-requirements/annual-review) run a whole-faculty review without a separate advisor assessment | The core state machine (§4) |
| Ratings mapped onto the Policy 3.7 tiers. Microbiology: "Partial expectations met… constitutes a Notification"; "Expectations not met" recommends Academic Alert "in the quarter following this meeting." HCDE: Satisfactory, Academic Notification with an interim check-in "in three, six, or nine months," or Academic Alert. Allen School: "Requiring Improvement" or "Unsatisfactory" counts as "an internal notification from the department" | [Microbiology](https://microbiology.washington.edu/sites/default/files/2024-12/2024-12%20Annual%20Thesis%20Committee%20Meeting%20Report.pdf), HCDE, Allen School | The rating scale (§6) |
| Quarterly review while a concern is open. Microbiology requires thesis committee meetings "quarterly until Academic Alert is lifted"; the Allen School reviews students on departmental notification "at the end of each quarter." HCDE asks students rated below Satisfactory to submit an update in the second week of autumn | Microbiology, Allen School, HCDE | Quarterly interim check-ins for students missing milestones or below a 3.0 GPA (§4.2) |
| The advisor says whether they agree with the student's self-assessment and, if not, "how did you advise the student?" | Philosophy (advisor form) | The advisor form (§5.2) |
| The student and the advisor read the student's course comments before they meet. Philosophy's forms tell both to review "coursework comments" first; History weighs "the quarterly written evaluations provided by their faculty" | Philosophy, [History](https://history.washington.edu/phd-degree-evaluation-criteria) | The Course Feedback Record in the self-report and the advisor form (§5.1, §5.2; course-feedback plan) |
| A plan made in autumn, with the spring self-evaluation measured against it. GWSS: an Annual Plan by the second week of autumn, and a self-evaluation in April "reflecting on the goals outlined in your Annual Plan." The Allen School and FSNH both ask "how did your accomplishments measure up to your planned goals?" | GWSS ([plan](https://gwss.washington.edu/sites/gwss/files/documents/graduate/graduate_academic_professional_planning_form.pdf), [self-evaluation](https://gwss.washington.edu/sites/gwss/files/documents/Self-Evaluation%20Form%20(Fillable).docx)), Allen School, [FSNH](https://foodsystems.uw.edu/wp-content/uploads/2025/07/FSNH-PhD-Annual-Progress-Review.docx) | Last year's goals prefilled and rated met, partly met or not met (§5.1). An autumn IDP step comes in phase 2 |
| Milestones with an "expected by" date and an "unsatisfactory if not done by" date. Geography: the Preliminary Review "should be completed by the end of the Spring quarter of the first year. If it has not been completed by the end of Fall quarter of the second year, a student is not making satisfactory progress." Political Science and the Allen School publish deadlines counted in quarters or years | [Geography](https://geography.washington.edu/satisfactory-academic-progress), Political Science, Allen School, [Linguistics](https://linguistics.washington.edu/graduate-milestones) (a year-by-year checklist) | Milestone flags (§5.1) and the requirements the department publishes (§11) |
| A written explanation when a deadline is missed: "If your progress in any of these areas has not met the stipulated deadlines, attach a statement explaining how and when you expect to meet the requirements" | [MELC](https://melc.washington.edu/sites/melc/files/documents/graduate/MA%20Annual%20Progress%20Review%20Form%2C%20October%202023.pdf) (MA form) | The "behind schedule" field (§5.1) |
| A letter to every student naming "their accomplishments, their upcoming milestones, and advice from faculty." A concern letter states the concerns, how to improve and the next benchmark with a deadline. Geography: letters "must specify the reason… the steps that need to be taken, and potential consequences"; the iSchool: "(1) the concerns; (2) how the student's performance can be improved; and (3) what specific milestones and standards are expected." At the Allen School the advisor's message to the student goes into the letter "verbatim" | Sociology, Geography, iSchool, Allen School, [Atmospheric Sciences](https://atmos.uw.edu/wp-content/uploads/2026/03/2026-March-Satisfactory-Progress-Official-Version.pdf) | The letter template (§7) and the advisor's proposed letter paragraph (§5.2) |
| A section the advisor does not see. At the Allen School, three questions, including "Are you getting the advising or co-advising you need?", are "visible only to the grad advising staff, Associate Director of Graduate Programs and the Review of Progress Committee Chair" | Allen School | The GPC-only section (§8; decision 14) |
| Asking the advisor "What are you struggling with (if anything) when it comes to advising this student?" Neither source says whether the student sees the answer | FSNH, Allen School (the same wording) | The advising-challenges field, shown to the student (§5.2; decision 13) |
| An "asks for faculty" question, and a CV with the past year highlighted. The Allen School asks "Name one thing we (advisor or department) could do better to help you reach these goals" | HCDE, Allen School | Student fields (§5.1) |
| Counting unsuccessful applications. GWSS asks for "notes of what you might have learned from the process"; FSNH asks for the "history of external fellowship and grant applications, regardless of acceptance" | GWSS, FSNH | The grants and publications fields (§5.1) |
| Copying the committee chair on letters, and finding an alternative when the advisor is away. Geography: the committee chair "should be consulted throughout this process and copied on any communications"; JSIS copies all communications to the advisor or chair. Sociology: "If a faculty advisor is not available to meet, the student should contact the GPC about finding the most appropriate alternative." HCDE does the opposite: advisors give input "regardless of sabbatical or other leave status" | Geography, [JSIS](https://jsis.washington.edu/programs/graduate/phd/ph-d-student-handbook/ph-d-program-student-status-and-standing/) (2025–26 handbook), Sociology | Routing rules (§4.3) |
| Next year's funding and TA requests collected in the same form | Geography (funding source, TA preferences), JSIS (funding requests on the progress report), FSNH (quarters of funding sought), Allen School (anticipated funding) | A student field that feeds TA allocation (§5.1) |
| A check on the mentoring relationship. Philosophy and GWSS ask whether the student is "in the right mentoring relationship with the right faculty adviser"; the SEFS mentorship plan asks students to "conduct an annual review of your progress and the mentoring relationship" | Philosophy, GWSS, [SEFS](https://sefs.uw.edu/wp-content/uploads/sites/22/2022/10/SEFS-Graduate-Student-Mentorship-Plan-Oct.-2022.pdf) | The compact check (§4.5, §5.1) and the mentoring network map (§5.1) |
| Warning students before the Graduate School's time limit. History warns students "a year in advance," and in year 9 the student and chair complete a "Ten Year Progress Assessment Form" with a timeline to finish | History | The time-limit flags (§6) and the plan to completion (§4.6) |
| A stated appeal path: to the supervisory committee or GPC, then the department chair, then Policy 3.8 | Political Science, JSIS (appeal to the Director of the Jackson School) | Text in the letter and the student response step (§7) |
| Letters for benchmarks that fall between reviews. Geography's faculty "consider authorizing the Chair and the GPC to write a letter of concern" when a student misses a benchmark due before the next review | Geography | **Not yet in this plan.** The calibration meeting could record the same authorization, and an `INTERIM` row could record the benchmark and its deadline (§4.2) |
| Anonymous feedback on the advisor. Allen School students can leave feedback "passed along verbatim, but without your name attached, to a committee of senior faculty that will be responsible for the next review of your advisor" | Allen School | **Not adopted.** It would need a faculty-review process the department does not have; the GPC-only section and the anonymous department form (§8) cover concerns about advising |

**Practices to avoid**

| Practice | Who does it | Why not |
|---|---|---|
| Annual review letters kept from the student: History lists "annual review letters" among the "confidential materials" a student cannot see | History | FERPA gives students the right to inspect them (§2.2; principle 3) |
| The advisor's rating hidden from the student: "Students will not see this selection, it will only be used for internal tracking and follow-up" | Allen School | The student sees the rating (principle 3) |
| A rating that ranks the student against peers: "Exceptional: Student is performing at the top of their cohort" | Allen School | The three-level scale describes progress only (§6) |
| TA or RA job performance in the academic review: Political Science counts "work as a research and/or teaching assistant"; FSNH's program review uses "Assessment of TA or RA performance by supervising faculty"; GWSS asks students to attach TA evaluations | Political Science, FSNH, GWSS | Academic and employment records stay separate (principle 8; UAW contract Article 22.1) |
| Funding tied to standing: Political Science reviews, and may end, department funding for students on Alert; Sociology gives students in satisfactory progress "priority for departmental funding" | Political Science, Sociology | A flag only; any funding decision stays with the committee (decision 9) |
| Superseded status terms: Geography's annual review page, History and the JSIS handbook still use "warning," "probation" or "Memorandum 16" | Geography, History, JSIS | The plan uses Policy 3.7's current terms (§11, item 2) |

### 2.4 The Provost and Graduate School PhD Taskforce report (2026)

**Source:** [PhD Taskforce report](https://facstaff.grad.uw.edu/ph-d-taskforce/taskforce-report/), from the Taskforce on the Future of PhD Education, "charged by the Office of the Provost and the Graduate School in January 2025." Its co-chairs were Joy Williamson-Lott, Dean of the Graduate School, and Daniel Pollack, Divisional Dean of Natural Sciences in the College of Arts & Sciences. Five working groups covered academic progress and success, career and professional development, community and belonging, funding, and mentoring and advising. Their evidence included "a survey of PhD program faculty, staff and leaders," "eight town halls" and "two PhD student listening sessions." Patricia Kramer (Anthropology) co-led the Funding working group. The report page gives no publication date; its Toolkit D is dated May 2026. The report, the [Year 2 Action Plan](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/) and the [TTD analysis page](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/time-to-degree-analysis/) were read in full on 17 November 2026.

**Status:** The report is a set of recommendations ("If adopted…"), not policy. In the Year 2 Action Plan the Graduate School says it "is committed to taking action on the recommendations" during 2026–27, through 30 June 2027. Three of its six actions touch this plan: "elevate mentoring and advising resources for faculty and academic leaders," support "high-quality graduate student handbooks at the school and college level," and "facilitate local analyses of time-to-degree (TTD) data." One requirement is binding now: **"all Ph.D. programs are required to complete a program-level analysis of time-to-degree (TTD) during the 2026–27 academic year… Completed templates are due December 4, 2026."** Programs submit the template "to deans and/or vice-chancellors." Years 3–5 "will require PhD programs to engage with questions about their curriculum, co-curricular requirements, milestones and funding approaches."

**Time-to-degree figures.** The TTD page gives UW's median elapsed years to a research doctorate, grouped by the Survey of Earned Doctorates' fields, for 2014–15, 2019–20 and 2024–25: 5.5, 5.5 and 5.5 for all fields, and 5.8, 6.0 and 6.3 for the social sciences. It sends programs to the BI Portal dashboard "Graduate Time to Degree and Completion Rates" for their own figures. They are context for the expected time to degree the faculty will set (§4.6).

**How this plan labels the recommendations.** The report does not number its recommendations. This plan labels them by working group and by their order in the report: AP1–AP4 (academic progress and success), CP1–CP3 (career and professional development), CB1–CB4 (community and belonging), F1–F5 (funding) and MA1–MA5 (mentoring and advising). The report itself letters its innovative ideas A–D and its toolkits A–E.

**Findings that bear on this design** (quoted from the report):
- In the survey, "two practices emerged as widely used or recommended: posting an online doctoral student handbook and conducting annual student progress reviews." "Initial advisor–student expectations agreements and academic conflict-management resources" had strong support but were in place in "fewer than half of PhD programs."
- Annual progress reviews "can take a myriad formats."
- Expectations are often implicit: "reliance on implicit or 'hidden' expectations related to publications, teaching, professional development and scholarly productivity."
- Handbooks "offer little insight into the milestones… qualifying exams are mentioned but their purpose, learning goals, format and timing are not."
- Students "typically experience strong connections in the first year, followed by increasing isolation during latter stages, particularly post-candidacy and during independent research."
- Participants noted "limited mechanisms to directly influence faculty behavior beyond core obligations, underscoring the importance of incentives, templates and low-burden systems rather than heavy enforcement." Promising local examples included "more systematic tracking of pre-general exam activities (e.g., mentoring meetings and committee engagement) to reduce single points of failure."
- Toolkit D places meeting deadlines with the student: "It is not the mentor's responsibility to ensure that PhD students are meeting milestone deadlines; it lies with the student." The mentor's duties are to make sure the student knows the deadlines and has a feasible plan, to remove roadblocks, and to say clearly when progress is unsatisfactory.

**Recommendations that reach the department, and how this plan applies them.** "Owner" is the report's "Responsible unit." Recommendations owned by the Graduate School appear where the department will use what the Graduate School produces.

| Recommendation | Owner; priority | Wording in the report | Where it lands in this plan |
|---|---|---|---|
| AP1: a standardized framework for milestone expectations | Graduate School; High | The Graduate School "should create and require programs follow a standardized framework for articulating PhD milestone expectations," with milestone map templates (Toolkit A) | The milestone lists in `Config.gs` (§9.1) and the published requirements (§11) are one list, so they can be reshaped to the framework when it appears |
| AP2: adopt the framework and publish a visual milestone map | PhD programs; High | Programs "should adopt and widely publicize—after properly modifying—the Graduate School's standardized framework" and "develop and publish a clear, visual milestone map." Its notes add: "Advisors are required to provide students with written documentation regarding whether they have satisfied the requirements of each milestone." "Milestone conversations… should occur at all key transition points (e.g., onboarding, annual reviews, candidacy)." "Student-facing materials must provide clarity regarding the consequences." "Programs should establish a feedback loop (e.g. student surveys, annual reporting)." | Advisor's milestone determinations (§5.2); the milestone map is the same list as the system's configuration (§11); post-cycle survey and metrics (§9.5) |
| AP3: faculty agree on milestone expectations | PhD programs; High | "Faculty are encouraged to collaborate on the milestone expectations in their PhD program to create a shared understanding." Milestone expectations "should be reviewed regularly" | Policy work (§11) |
| AP4: a transferable-skills self-assessment (Toolkit C) | Graduate School; High | The Graduate School "should create a transferable skills self-assessment tool." The report says it would "create a common language for advising conversations." Toolkit C's example rubric is "reflective and developmental, not evaluative" | An optional self-assessment module that is never rated (§5.1), using Toolkit C until the Graduate School's tool exists |
| CP2: use school- and college-level career resources | Schools and colleges; Medium | Programs "should be encouraged to leverage and grow existing school- and college-level resources, increase student usage and regularly assess their offerings" | The career check-in links to these resources (§5.1) |
| CB2: build community into milestones | PhD programs; High | Programs "should create consistent recognition practices aligned with milestones" | Policy work (§11, item 10) |
| CB3: structured engagement after year one; Idea C, "a PhD belonging checkpoint model" | Programs; High | Isolation in the later years "may contribute to attrition or lengthened time to degree" | A belonging question in the anonymous post-cycle survey (§9.5); community activities as a policy item (§11) |
| MA1: a "Mentoring Essentials" guide | Graduate School; Medium | Its notes say "all units are required to post UW-wide resources and their local policy and practice in student handbooks" | Resources and escalation pathway in the form and the letter (§7); handbook work (§11) |
| MA2: an advisor–advisee compact (Toolkit E) | Graduate School; High | Guidance for a compact "to be completed early and revisited periodically," covering "meeting cadence, communication norms, feedback turnaround time, roles and responsibilities, boundaries, milestones and confidentiality expectations." The report recommends the compact "be revisited and revised annually by both parties, consistent with the practice of regularly updating the Individual Development Plan (IDP)" | A compact module (§4.5) and a compact check at each review (§5.1, §5.2) |
| MA3: decide whether to standardize the annual review | PhD programs; Medium | "PhD programs should determine whether standardizing their annual progress reviews for PhD students would be possible or helpful." A "structured expectations check-in template" would cover "timing of milestones, what is next in the student's academic journey and a check-in on career aspirations," and the review should revisit the compact and the milestone map. "Written documentation of decisions and action items stemming from the annual review is required" | The whole system; an action-items table (§5.2) carried into the next cycle (§5.1); a career check-in (§5.1) |
| MA4: early mentoring committees, *or* a documented plan for multiple mentors | PhD programs; Medium | Committees or a plan "paired with individual development plans and mentoring plan prompts" | A mentoring network map (§5.1). Mentoring committees were declined (decision 20, §13) |
| MA5: time-to-degree expectations and a plan to completion | PhD programs; Medium | Programs "could implement time-to-degree expectations and ask that advisors submit a plan-to-completion to the Graduate Program Coordinator when requesting an extension." If a student and advisor agree to extend, "advisors should be required to put in writing, to the student and the Graduate Program Coordinator, a document that summarizes progress since the last annual review, reasons for delay, a plan for completion with specific milestones and timelines and any changes made to support student completion." If they disagree, Policy 3.7 applies | A plan to completion (§4.6) |
| Toolkit D: mentoring practices | (Toolkit) | Mentors ensure the mentee "knows what the milestone deadlines are" and "has a feasible plan for meeting milestone deadlines," remove roadblocks, and "clearly communicate when a mentee is not making satisfactory progress." They should "direct the mentee to the program's reporting flowchart." The report encourages "the Graduate School Representative (GSR) to serve as an accessible and impartial point of contact" | Advisor checklist (§5.2); escalation flowchart and the GSR named in the letter (§7) |
| Idea D: a "5+ Year Completion Checkpoint" pilot with a "support menu" | (Innovative idea) | The menu "may include a committee reset meeting template to clarify roles and scope, a short writing sprint to advance chapters or papers, milestone mapping for the next 6–12 months and referral pathways for mediation or conflict support." The report suggests piloting it "in a small set of departments with varied advising models" | The support menu in the plan to completion (§4.6) |
| Idea D: MyGrad "optional milestone tracking" extensions | (Innovative idea) | "The Graduate School could introduce optional tracking features within MyGrad that programs can enable based on fit (e.g., early mentoring committee formation, mentoring meetings, pre-general exam milestones)," described as "nudges, not mandates" | If the Graduate School adds them, the MyGrad prefill (§9.3) should read them, so the department does not track the same milestones twice |

**A tension in the report.** The report calls annual reviews "mandated by Graduate School policy 3.7.2", but Policy 3.7.2 itself says faculty "should" review at least annually. This plan treats the annual review as expected practice either way.

**How binding the report's wording is.** Where the report says "required" or "must" (in the notes to AP2, MA1 and MA3), it is a recommendation describing what it wants, not current policy. MA3, MA4 and MA5 themselves are worded as options: "should determine whether," "could promote," "could implement," and all three are Medium priority. Only the time-to-degree analysis is an actual requirement today. This plan adopts these recommendations because they are good practice and the Graduate School has said it will act on them.

**PhD only.** The taskforce covers PhD programs only. For MA students this plan applies the parts that Policy 3.7 also supports: milestone determinations, action items and the letter. Compacts, the skills self-assessment and the plan to completion are PhD-only (decision 23).

**Outside this system's scope.** The funding recommendations (F1–F5) and the career recommendations to central units (CP1, CP3) are outside this system. One funding recommendation falls to the department rather than the Graduate School: F4, "PhD programs should use data to facilitate cohort size planning" (owner: PhD programs; High). The funding and career fields the system collects could feed it later.

### 2.5 Research evidence on progress reviews and doctoral persistence

Each row gives what the source reports, checked against its abstract or full text on 17 November 2026, and what it implies for this design. No study found here randomly assigns graduate students to an annual review or not. Most rows are therefore associations, or evidence from other settings applied by inference. The evidence on bias in narrative evaluations is in the course-feedback plan §2.3; it applies to the advisor's narrative and the letter here (§5.3).

**Program structure and completion**

| Finding | Source | Design consequence |
|---|---|---|
| The Andrew W. Mellon Foundation's Graduate Education Initiative (GEI) gave over $80 million to 51 humanities and social science departments at 10 universities from 1991. Against control departments, it had "modest impacts on student outcomes in the expected directions": lower attrition, shorter times to degree and higher completion. These "appear to have been driven in part by reductions in entering cohort size, improvements in financial support and increases in student quality" | [Groen et al. 2008](https://doi.org/10.1016/j.econedurev.2006.09.010) ([NBER version](https://www.nber.org/papers/w12064)) | A review alone will not move completion much. Funding and cohort size matter too, which is why the self-report collects funding (§5.1) |
| A survey of entrants to 44 GEI and 41 control departments over 15 years grouped more than 100 program features into factors. A **clarity** factor reduced attrition. It included being informed in writing about requirements, "definition of satisfactory progress," deadlines and expected time to degree, and progress evaluated by "a formal review" or "a formal faculty committee." An **advising** factor also reduced attrition and was "perhaps the most important factor" for graduation. The GEI improved outcomes "primarily through the routes of improving clarity of expectations and encouraging students to finish their dissertations as quickly as possible." Raising clarity from the 25th to the 75th percentile would cut attrition by year 7 by about 2 percentage points | [Ehrenberg et al. 2007](https://doi.org/10.3102/0162373707301707); factor definitions and magnitudes from the [NBER version](https://www.nber.org/papers/w12065) | The closest evidence for this system's core: published progress requirements (§11 item 1), a formal yearly review with a faculty calibration meeting (§4.4), and a letter that states where the student stands (§7). The effect is real but small |
| At one UK research-intensive university, progress monitoring "can be an effective and supportive intervention for dealing with project-related and time management issues." Its effectiveness "is contingent on how they are perceived within doctoral researchers' social networks and overcoming social norms that create barriers to transparent reporting" (case study, checked in two workshops with other UK universities) | [Dowle 2022](https://doi.org/10.1080/13603108.2022.2077855) | Present the review as support, and say plainly who reads what (principle 3). The GPC-only section and the anonymous form give a route for what a student will not write where the advisor reads it (§8) |
| Among 1,509 doctoral students at the two largest universities of French-speaking Belgium, dropout was highest in the first two years and "related to the absence of funding or scholarship." Marital status, master's grade, field and funding were associated with dropout | [Wollast et al. 2018](https://doi.org/10.5430/ijhe.v7n4p143) | The first two years deserve the closest review: Sociocultural's first-year evaluation (§4.4) and the funding question (§5.1) |
| Among 886 master's and doctoral students at one US university, dropout intentions were predicted by overall satisfaction, self-efficacy for professional success, and the gap between expected and experienced graduate school | [Hardré et al. 2019](https://doi.org/10.28945/4161) | Published requirements (§11) and the compact (§4.5) make expectations explicit early |

**Advising and the student's experience**

| Finding | Source | Design consequence |
|---|---|---|
| In a retrospective comparison of completers and noncompleters (N = 422) and a prospective study of enrolled PhD students (N = 1,060), "perceived competence appears to be the cornerstone of doctoral studies persistence." It was predicted mainly by motivation and advisor support, and support from the advisor and other faculty reduced dropout intentions indirectly, through motivation | [Litalien & Guay 2015](https://doi.org/10.1016/j.cedpsych.2015.03.004) ([accepted manuscript](https://acuresearchbank.acu.edu.au/items/531ae22e-e315-46bf-ae61-82211026374a)) | The letter opens with accomplishments and milestone determinations (§7), and every concern names the support offered |
| In a representative sample of 3,659 PhD students in Flanders, 32% were at risk of a common psychiatric disorder, more than in three comparison groups. The supervisor's leadership style was among the predictors: each unit increase on a laissez-faire (passive) scale raised the odds of psychological distress by 8%, an inspirational style was associated with lower risk, and an autocratic style showed no association | [Levecque et al. 2017](https://doi.org/10.1016/j.respol.2017.02.008) | Absent advising is a risk the review can detect: the advisor records the meeting date (§5.2), and the GPC-only section asks whether advising meets the student's needs (§5.1) |
| In a survey of 186 doctoral students in nine countries, supportive departmental and advisor relationships reduced emotional exhaustion and intentions to leave academia. Advisor experience and frequency of meetings reduced exhaustion but did not affect intentions to leave | [Devine & Hunter 2016](https://doi.org/10.28945/3396) | Ask how often the student actually met their advisor this year, beside the existing preferred-frequency question (§5.1) |
| In a US survey of doctoral students at 27 universities in 11 disciplines, the criteria used to choose an advisor and reported advisor behaviours predicted satisfaction with the advising relationship. Disciplinary differences were "more robust predictors of satisfaction than individual characteristics" | [Zhao, Golde & McCormick 2007](https://doi.org/10.1080/03098770701424983) | Wording and calibration are configured per subfield (principle 6) |
| A randomized trial at 16 academic health centers (283 mentor–mentee pairs) found that an eight-hour, case-based mentor training curriculum improved mentors' self-reported competencies; mentees of trained mentors "reported larger changes" and "more changes in their mentors' behavior" | [Pfund et al. 2014](https://doi.org/10.1097/ACM.0000000000000218) | Offer advisors a short mentor training alongside the compact (§4.5) |

**Self-assessment, participation and goals**

| Finding | Source | Design consequence |
|---|---|---|
| Of 20 comparisons between physicians' self-assessments and external measures, 13 "demonstrated little, no, or an inverse relationship." The worst accuracy was among "the least skilled and those who were the most confident" | [Davis et al. 2006](https://doi.org/10.1001/jama.296.9.1094) | The student's self-report starts the review, and the advisor's agree/disagree items supply the external view (§5.2) |
| Across 27 field studies, participation in performance appraisal was related to employees' reactions (corrected ρ = .61), most strongly to satisfaction. "Value-expressive participation (i.e., participation for the sake of having one's voice heard)" was more strongly related than participation to influence the result | [Cawley, Keeping & Levy 1998](https://doi.org/10.1037/0021-9010.83.4.615) | The student goes first (principle 1) and can respond to the letter (§5.4) |
| In 138 randomized studies (about 19,900 participants), interventions that increased monitoring of goal progress promoted goal attainment, d+ = .28 (95% CI .23 to .33) in the corrected version of April 2026 (the 2016 article reported .40). Effects were larger when progress was reported to someone and marginally larger when it was physically recorded | [Harkin et al. 2016](https://doi.org/10.1037/bul0000025); [corrected version](https://osf.io/bc54u) | Written action items with owners and dates, carried into next year's form and reviewed at interim check-ins (§5.1, §5.2, §4.2) |
| In a multi-institution online survey of doctoral students, recruited through social media and email, 53% were required to complete an Individual Development Plan and 33% found it helpful. It was "most effective when doctoral students complete the tool with faculty mentors with whom they have a positive relationship" | [Vanderford et al. 2018](https://doi.org/10.12688/f1000research.15154.2) | The IDP is discussed at the advisor meeting, not filed alone (§5.1) |

**Calibration and consequences**

| Finding | Source | Design consequence |
|---|---|---|
| In two field studies, calibration meetings were associated with increases in "perceived frame-of-reference, perceived accountability, and perceived total information," and "post-calibration ratings correlated more with other measures assessing the job performance domain than pre-calibration ratings" | [Speer, Tenbrink & Schwendeman 2019](https://doi.org/10.1080/08959285.2019.1609477) | Subfield calibration meetings (§4.4, §9.4) |
| An updated meta-analysis found frame-of-reference training, which teaches raters what each level of a scale means, "an effective method of improving rating accuracy" | [Roch et al. 2012](https://doi.org/10.1111/j.2044-8325.2011.02045.x) | Open each calibration meeting by going through the three rating levels (§6) with one or two anonymized examples |
| At three campuses of a large Canadian university, being placed on academic probation after the first year "discourages some students from returning to school while improving the GPAs of those who do." It "more than doubles the probability that men drop out but has no such discouragement effect for women," and lowered graduation rates, "particularly for students with the highest high school grades" (regression discontinuity, undergraduates) | [Lindo, Sanders & Oreopoulos 2010](https://doi.org/10.1257/app.2.2.95) | A concern letter can push a capable student out. Concern letters pair the benchmark with named support and a check-in date (§7), and the metrics track who leaves after a concern rating (§9.5) |

**Limits of this evidence.** No study found here tests an annual review against no review. The GEI studies are the nearest, and they evaluate a package of changes in humanities and social science departments in the 1990s, measured partly through student surveys. Several rows come from other settings: undergraduate probation, medical self-assessment, workplace appraisal and calibration, and goal monitoring in health behavior. The surveys of advising and well-being are cross-sectional, so they show association, not cause. The Speer study measured perceptions and correlations, not accuracy against a known standard. The Harkin figures are from the 2026 correction; the original article's figures are larger.

**Practices the evidence supports, and where they are in this plan**

Already in the plan:
- written progress requirements and a formal yearly review with a faculty meeting (GEI: §4.4, §11);
- the student's own report first, with the advisor's external view and a student response (Cawley et al.; Davis et al.: principle 1, §5.2, §5.4);
- written action items with owners and dates, reported and reviewed again (Harkin et al.: §5.1, §5.2, §4.2);
- concern letters that name the support offered and a check-in date (Lindo et al.; Litalien & Guay: §7);
- a review that is presented as support, with routes for what a student will not tell the advisor (Dowle: §8).

Recommended. On 17 November 2026 items 1, 2 and 5 were adopted (§9.4, §5.1 and §6, §9.5) and items 3 and 4 declined:
1. **A frame-of-reference briefing at the start of each calibration meeting:** the GPC goes through the three rating levels with one or two anonymized examples (Roch et al.; Speer et al.).
2. **An "actual meetings with your advisor this year" field** next to the preferred-frequency question in §5.1. The GPC sees "no meeting this year" as a flag, because passive advising is associated with distress (Levecque et al.; Devine & Hunter).
3. **Optional mentor training for advisors,** for example a short case-based curriculum offered with the compact in phase 2 (Pfund et al.). *Declined.*
4. **Closer review in years 1 and 2,** when dropout is highest, including the funding check (Wollast et al.; GEI). *Declined.*
5. **A metric for what happens after a concern rating:** how many students leave within a year, with the existing suppression of counts below 5 (§9.5), so the department can see whether concern letters push students out (Lindo et al.).

---

## 3. Design principles

1. **The student goes first, and the advisor responds to what the student wrote.** This is less work for the advisor, and the student's own account comes before any judgement. Taking part in one's own appraisal relates to satisfaction with it (Cawley et al. 1998). Self-assessments are often inaccurate, worst among the least skilled and most confident (Davis et al. 2006), so the advisor's agree/disagree items supply the outside view (§5.2; §2.5).
2. **A person decides; the system documents.** A rating never changes a student's status by itself. A Notification or Alert is a separate action the GPC takes, and the system drafts the letter for it. Where conduct might violate the Student Conduct Code, the conduct process comes first: "Pending allegations or reports of misconduct under the student conduct code should not be considered in a Policy 3.7 proceeding" (Graduate School guidelines; §2.2, §5.3).
3. **Nothing about the student is hidden from them.** The app shows the student the advisor's evaluation, the final rating and the letter. Two items are not shown in the app, and the student can get both on request under FERPA: the GPC's calibration notes, and the advisor's "advising challenges" note (kept; decision 13). The section the student keeps from their advisor holds the student's own words.
4. **Role names and ownership.** The GPC owns and maintains this system and the course feedback module: code fixes, the yearly `Config.gs` dates, and questions to Records Management. "GPC" in this plan means the **Graduate Program Coordinator**, the faculty member who runs the graduate program (Policy 3.7.2 names both a GPC and a GPA). The **Graduate Student Administrator** (the GPA, the staff role the Archaeology page names) runs the cycle: roster, launch, reminders and archiving. The GPC alone handles program-stage judgements: final ratings, letters, Notifications and Alerts. Rename these if the department's titles differ.
5. **Recusal.** If the GPC is the student's advisor, co-advisor or committee chair, the review is routed to an alternate (default: the department chair) for both the program stage and the GPC-only notes. The roster records an `Alternate_Reviewer` for each student, and the system refuses to give the GPC access to those rows. **How this is enforced:** the web app runs as the system account and checks the signed-in user, so the app can enforce recusal. Google Sheets cannot restrict a person who can open the spreadsheet to certain rows. So the GPC works **only through the web app** and is not given direct access to the spreadsheets, and the system account is a department account the GPC does not log into (decision 11). The Graduate Student Administrator needs direct access to run the menus, so for that role, staying out of review content is a written convention. Drive's activity log and the app's audit log make access visible after the fact. **Code access weakens this for the GPC.** As the owner (principle 4), the GPC edits the Apps Script code, and anyone who can edit the code can change it to read any row. For recused rows, the GPC staying out is therefore also a written convention, as it is for the administrator. Code changes are pushed with `clasp`, as in the TA project, and recorded in the repository's history, so a change that exposes recused rows would be visible there.
6. **One process for the department, configured per program.** Each subfield, and the MA, can have its own milestone list, question wording and calibration group. The code stays the same.
7. **Prefill where we can.** The form carries forward last year's goals and committee. Milestone, leave, GPA and coursework data come from MyGrad through the Roster page that the course feedback module uses (§9.3; course-feedback plan §4.5). The administrator clicks a button, then the MyGrad Table Audit bookmarklet in the tab that opens, and the bookmarklet sends the data to the app. The app never signs in to MyGrad or reads it on its own; every transfer starts with the administrator's click. 
8. **Keep academic and employment records separate.** Students may describe their teaching, but the advisor does not rate their TA or RA job performance here.
9. **No fellow students.** Student representatives are excluded from calibration and from all access to review records (Policy 3.7.2).
10. **Developmental material is kept apart from evaluation.** The transferable-skills self-assessment, the mentoring network map and the compact help the student develop and are not graded. They never feed the rating. The advisor may comment on them but does not score them (Taskforce Toolkit C: "reflective and developmental, not evaluative").
11. **Students are reviewed against published expectations, and each review ends in written action items.** The milestone settings and the published progress requirements are the same list (§11), which Policy 3.7.1 requires programs to "document and distribute." In the Mellon Graduate Education Initiative studies, a clarity factor reduced attrition; it included written requirements, a "definition of satisfactory progress," deadlines and formal review (Ehrenberg et al. 2007). The gap between expected and experienced graduate school predicted dropout intentions (Hardré et al. 2019). Each review records action items with owners and dates, carried into the next form and any interim check-in (§5.1, §5.2), because monitoring progress toward goals improves attainment (Harkin et al., corrected 2026; Taskforce MA3; §2.5).
12. **The review checks the advising.** The advisor records the meeting date, the student reports how many meetings took place, and "no meeting this year" is flagged (§5.1, §5.2, §6). The GPC-only section asks whether advising meets the student's needs (§8). Advising was "perhaps the most important factor" for graduation in the GEI studies (Ehrenberg et al. 2007), and passive supervision was associated with higher odds of psychological distress (Levecque et al. 2017; §2.5).
13. **Every concern comes with a benchmark, support and a date, and check-ins become more frequent while it is open.** Policy 3.7.2 asks for "a written explanation of performance expectations, clear descriptions of performance benchmarks" and "a timetable," and says students not meeting milestones "should be reviewed quarterly" (§4.2, §7; §2.2). Academic probation more than doubled men's dropout among undergraduates (Lindo et al. 2010), and advisor support affected persistence through the student's sense of competence (Litalien & Guay 2015), so a concern letter names the support offered, and the department tracks who leaves after one (§9.5; §2.5).
14. **Narratives are specific and checked; ratings are calibrated.** The Graduate School's mentoring guidance says "Use concrete language… Ambiguous feedback hinders students' performance" (§2.2). The GPC checks the advisor's narrative and the letter for person-focused, unclear or hedged wording before release, because these patterns differ by gender and race in narrative evaluations (course-feedback plan §2.3; §5.3). Each subfield calibration meeting starts by going through the rating levels with examples, because rater training and calibration improved rating accuracy (Roch et al. 2012; Speer et al. 2019; §9.4; §2.5).

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
| `PDF_GENERATING` | none | The PDF is built and shared with the UW accounts of the student, advisor(s), committee chair and GPC; each gets an email with a link to it, never an attachment |
| `COMPLETED` | none | The PDF is archived. If the rating calls for an interim check-in, a follow-up row is created |
| `ESCALATED` | GPC | No action after the reminders and past the due date |
| `ON_LEAVE` / `EXEMPT` | GPC | Skipped this cycle with a recorded reason, such as leave or graduating. Time to degree is still tracked |

The flow runs `NOT_STARTED → STUDENT_PENDING → ADVISOR_PENDING → PROGRAM_PENDING → STUDENT_ACK_PENDING → PDF_GENERATING → COMPLETED`.

**Leaving `ESCALATED`.** The GPC chooses one of three actions, each with a logged reason:
- **Extend:** set a new due date. The row returns to the stage it was in, and the reminder cycle restarts.
- **Skip the stage:** move to the next stage without it. For example, if the advisor stage is skipped, the GPC writes the program stage from the student's report and records that the advisor did not respond.
- **Exempt:** mark the row `EXEMPT` for this cycle.

**Why the advisor does not sign again after the student's response.** In the TA system the instructor signs again after the TA responds. Here the letter is the program's final word, and the student's response is attached to it. The advisor and committee chair get the PDF that includes the response. This saves a stage, and the student's response is still on the record.

### 4.2 Interim check-ins

When the rating is *Satisfactory with concerns* or *Unsatisfactory*, completing the review creates a new **`INTERIM`** row.
- **When it is due.** If the student is missing a milestone or has a cumulative or quarterly GPA below 3.0, the row is due in 3 months (one quarter), and each later check-in is also quarterly until the advisor records "resolved." Policy 3.7.2 says such students "should be reviewed quarterly." Otherwise the advisor chooses 3 or 6 months.
- The interim form is short: progress on each benchmark, then the advisor's verdict (resolved, continuing, or escalate to the GPC). It skips the program stage unless someone escalates.
- The GPC can also create an `INTERIM` row by hand, for example from a course-feedback follow-up flag (course-feedback plan §5.3).

### 4.3 Routing rules

- **Advisors.** The roster lists a primary advisor and optional co-advisors. Any of them can open the advisor stage, and the primary advisor, or whoever the GPC delegates, signs. The committee chair receives copies if they are not an advisor (Geography's practice).
- **No advisor, or the advisor is away on sabbatical or leave.** The GPC assigns a substitute reviewer: the Interim Faculty Point of Contact under Policy 4.2.4. The system refuses to launch a row that has no reviewer.
- **The program stage** is limited to the GPC account, plus optionally the subfield's graduate committee chair. The system has no faculty-wide login; calibration happens in a meeting using the batch view (§9.4).

### 4.4 Cycle calendar (configurable in `Config.gs`, replacing the end-of-finals due dates)

| Step | Default due date | Notes |
|---|---|---|
| Launch | First week of spring quarter | Archaeology's existing "early spring" timing |
| Course Feedback Record released | End of spring week 2 | Shown in the student's form and the advisor's view (course-feedback plan §6.2). The Winter quarter's comments are released the same day |
| Student report | End of spring week 4 | Moved from week 3 so the student can read the Course Feedback Record and respond (course-feedback plan §8). The advisor stage keeps its week-6 deadline, which gives the advisor one week less |
| Advisor meeting and evaluation | End of spring week 6 | |
| Subfield calibration meetings | Spring weeks 7–8 | Sociocultural already meets "at the end of the academic year." This brings the meeting forward so letters go out before summer |
| Letters released | Spring week 9 | |
| Alert recommendations | By the 10th business day of autumn quarter | Policy 3.7.3: programs send an Alert recommendation "no later than the 10th business day of the academic alert quarter," and the Graduate School "will consider petitions" up to the 15th. Multi-quarter Alerts are counted "excluding Summer," so by default an Alert decided at spring calibration takes effect in autumn. Policy 3.5 supports this for students not registered in summer: they "cannot be required to meet expectations described in Academic or Final Academic Alerts if not registered in summer," and Alerts issued at the start of summer by programs that do not require summer registration "should extend through fall quarter" (§2.2). Anthropology does not require summer registration (confirmed 17 Nov 2026). The system computes the date from the autumn calendar and reminds the GPC 5 business days before it. If the student is enrolled in summer and the faculty want the Alert to start then, the GPC changes the quarter, and the deadline moves to the 10th business day of summer |
| Student acknowledgement | 14 days after release | Falls in finals week or just after |
| Sociocultural first-year portfolio | Spring week 8 (existing rule) | A separate review type, `FIRST_YEAR`, with a portfolio upload and pass/fail by the whole faculty. **Phase 2:** it moves into the app in autumn 2027 (§12), so its first cycle in the app is spring 2028. In spring 2027 the existing portfolio process runs outside the app |
| MA (Archaeological Heritage) | A short check-in at the end of every quarter the student is enrolled, including spring (the `INTERIM` form, launched automatically), and no full annual review (decision 4). For MA students the form adds milestone determinations, action items and the career check-in (decision 23). MA students get no annual letter; a check-in that raises a concern goes to the GPC, who writes any concern letter (§4.2, §7) | Policy 3.7.2 says programs shorter than two years should review quarterly. The program is under two years: 36 credits, and the [program page](https://anthropology.washington.edu/ma-archaeological-heritage) says students from UW Archaeology undergraduate programs "can complete this rigorous high-quality MA degree in 3-4 additional quarters (9-12 months)". A spring-only review would land as many students finish, so the quarterly check-ins do the real work. The page gives no standard length for other students; ask the program director how long they usually take |

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
- **Co-advised students:** one joint compact, signed by the student and every co-advisor (decision 22).

### 4.6 Time-to-degree expectation and plan to completion (Taskforce MA5, Idea D)

- **The expectation:** the faculty set and publish an expected time to degree for each program (§11). Until they do, the "past expected time" flag and the plan to completion are **switched off**: `Config.gs` holds no figure, and the system enables both once a faculty-approved figure is entered (decision 18). The figure should come from the department's own data in the December 2026 time-to-degree analysis. The Graduate School's time-limit flag (§6) works regardless. For reference, the Graduate School's figures give a UW-wide median of 5.5 years. The plan to completion is PhD-only by default (decision 23).
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
| Milestones | A checklist by program, each with "done on" or "planned for": committee formed; MA or en-route MA; language or methods requirement; qualifying or first-year review; prospectus; General Exam; IRB submitted and approved; fieldwork start and end; candidacy; ANTH 800 credits; reading committee; Final Exam. Committee flags, the UW MA degree, candidacy and its exam date, and ANTH 800 credits are prefilled from MyGrad (§9.3); the student confirms or corrects them | Yes | Archaeology, Middle Eastern Languages & Cultures (MELC), Geography, Policy 1.1 |
| Behind schedule | Shown only when a milestone is past its "expected by" date: an explanation and a plan | Conditional | MELC, Policy 3.7.2 |
| Coursework | Courses taken this year (title and grade, prefilled from the MyGrad transcript, §9.3), courses planned, incompletes | Yes | Archaeology, Sociology |
| Response to course feedback | "Which one or two next steps from your course feedback will you act on this year, and how?" Shown beside the Course Feedback Record | Optional | Course-feedback plan §6.1; Winstone et al. 2017; Carless & Boud 2018 |
| Research progress | Narrative, up to about 500 words: fieldwork, lab or collections work, analysis, chapter status, working title | Yes | Archaeology, JSIS, Interdisciplinary PhD (IPhD) |
| Publications and other outputs | Repeatable rows: citation; stage (in preparation, submitted, in review, accepted, published); peer reviewed (yes or no); type (article, chapter, dataset, software, public scholarship) | Optional | Archaeology, GWSS |
| Presentations | Repeatable rows: title, venue, date, type | Optional | Archaeology, Linguistics |
| Grants and fellowships | Repeatable rows: funder, amount, applied or awarded or declined or pending. **Unsuccessful applications are counted** | Optional | Archaeology, Linguistics, GWSS, FSNH |
| Teaching and research appointments | Roles held, with course or project and quarter (description only, no ratings) | Optional | Archaeology; ASE separation |
| Service, outreach, community-engaged work | Free text | Optional | GWSS, Philosophy |
| Last year's goals | Prefilled from last year's plan; each rated met, partly met or not met, with a comment | Yes after year 1 | GWSS, Allen School |
| Next year's plan (IDP) | Goals in five categories: degree progress, research, skills, career, funding. A sixth, personal, is optional. Adapted from the Graduate School's IDP worksheet, which groups goals as academic, career and personal and asks of each goal why it matters, what help is needed and the timeline (§2.2) | Yes | Graduate School IDP, Philosophy, Allen School (CSE) |
| Funding and TA requests | Expected funding source; TA or RA interest by quarter | Yes | Geography, JSIS, FSNH |
| Action items from last year | Prefilled from last year's action items (§5.2). For each: done, in progress, or dropped, with a note | Yes after year 1 | Taskforce MA3 |
| Career check-in | Current career aspirations (academic, non-academic, both, undecided), what has changed, and what support is wanted. Links to Graduate Student Affairs and the career centres. *A development module: the student and advisors see it, it is not in the PDF (§10)* | Yes (short) | Taskforce MA3, CP1–2 |
| Mentoring network map | Who supports the student, by role: research, writing, career, emotional support, accountability, community. Gaps the student wants to fill. Replaces the old "other mentors" field. *A development module (§10)* | Optional | Taskforce Toolkit D, MA4; Archaeology's mentor network |
| Transferable-skills self-assessment | Toolkit C's nine skills (communication, leadership and collaboration, ethical research, AI literacy, data analysis, project management, entrepreneurship, pedagogy, public engagement), each rated 1–4 with evidence and next steps. Last year's ratings are shown alongside. **Developmental only, never graded.** *A development module (§10)* | Optional | Taskforce AP4, Toolkit C |
| Compact check | "Is your compact with your advisor still accurate?" (yes, or needs revising), with a comment | Yes once a compact exists | Taskforce MA2 |
| Challenges | Optional free text, with a note that the advisor will read it | Optional | Archaeology, HCDE, SEFS |
| Advising | Actual meetings with your advisor this year (a number); preferred meeting frequency; any committee changes needed. "No meeting this year" is flagged to the GPC (§6). **The advisor sees this section.** The question "Is advising meeting your needs?" is optional here, because students answer an advisor-visible version less candidly. It is also asked in the GPC-only section (decision 14) | Optional | Philosophy, FSNH, SEFS, Archaeology's mentor network |
| Asks for faculty | "What would help you most this year?" | Optional | HCDE |
| Uploads | CV with the past year highlighted (PDF, 10 MB maximum). An unofficial transcript is optional | CV recommended | HCDE, Sociology |
| **GPC-only section** | Optional concerns about advising, climate or the program. The advisor never sees it, and it is never printed in the PDF. Links to the anonymous department form and the Office of the Ombud are next to it | Optional | Allen School (CSE); see §8 |
| Signature | A typed name and an acknowledgement, the same as in the TA system | Yes | |

### 5.2 Advisor evaluation

| Field | Notes | Source |
|---|---|---|
| Date of the meeting with the student | Required. The form explains that the meeting is expected | Archaeology, Philosophy |
| Course feedback | The year's Course Feedback Record, read-only, with the student's response. An optional "Discussed course feedback" tick. Advisors also see each quarter's comments when they are released (course-feedback plan §6.4) | Course-feedback plan §8 |
| **Milestone determinations** | For each milestone attempted this year: satisfied, not yet satisfied, or not satisfied, with a one-line reason. Printed in the letter as the written record of the advisor's decision | Taskforce AP2 ("written documentation regarding whether they have satisfied the requirements of each milestone"); Policy 3.7.2 |
| Mentor checklist | Ticked after the meeting: the student knows the upcoming milestone deadlines; the student has a feasible plan to meet them; we discussed the standard for the next milestone (with an example shared, if possible); roadblocks I can remove (free text) | Taskforce Toolkit D |
| **Action items** | A table of action, owner (student, advisor, committee or program) and due date. Printed in the letter and prefilled into next year's form and any interim review | Taskforce MA3 ("written documentation of decisions and action items… is required") |
| Compact check | Still accurate, or needs revising | Taskforce MA2 |
| Career and skills | Optional comment on the student's career check-in and skills self-assessment. **No rating** | Taskforce MA3, AP4 |
| Plan to completion | Required only when the student is past the expected time to degree (§4.6) | Taskforce MA5 |
| Agree or disagree with the student's self-assessment, for milestones, research, coursework, professional activity and the IDP plan | A disagreement needs a comment ("how did you advise?") | Philosophy |
| Notable accomplishments | Required, and fed into the letter. The prompt asks for specific work, with an example | Sociology; course-feedback plan §2.3 (Jackson et al. 2015) |
| Areas for development | Each with its seriousness: minor, moderate, serious | GWSS |
| Comments on the timeline | Required if a milestone is overdue | FSNH |
| Goals added or amended for next year | Added to the IDP the student will see next year | Philosophy |
| **Recommended rating** | See §6 | Microbiology, HCDE |
| If concerns: **the benchmark, deadline, support offered, check-in date, and consequence** | Each is required when the rating is below Satisfactory. The check-in is in 3 months when the student is missing a milestone or has a GPA below 3.0, otherwise in 3 or 6 months (§4.2) | Policy 3.7.2 and 3.7.3 |
| Paragraph for the letter | Optional wording the advisor proposes | Sociology |
| Advising challenges (GPC only; decision 13) | "Is anything making it hard to advise this student well?" Default: shown to the student at the acknowledgement stage, so nothing an advisor writes is kept from the student. The alternative is to drop the field and handle such issues in a conversation with the GPC | FSNH |
| Signature | Primary advisor, or co-advisors | |

### 5.3 Program stage (GPC)

- **A check of the advisor's narrative before the letter goes out.** The GPC reads "Notable accomplishments," "Areas for development," the advisor's proposed letter paragraph and the generated letter, with the four-item check the course feedback module uses (course-feedback plan §6.2), plus a fifth item on conduct matters:
  - Is anything about the person rather than the work?
  - Is anything outside academic progress (TA or RA job performance, health, personal circumstances)?
  - Is anything unclear?
  - Is anything faint praise or hedged, so that the student could not tell what it means?
  - Does anything describe possible misconduct under the Student Conduct Code? The Graduate School's guidelines say "Pending allegations or reports of misconduct under the student conduct code should not be considered in a Policy 3.7 proceeding," and a program unsure whether behaviour is a conduct matter should consult Community Standards & Student Conduct (cssc@uw.edu) first (§2.2). Such a passage goes back to the advisor, and the GPC consults Community Standards & Student Conduct.

  Narrative evaluations describe women as "more communal and less agentic," letters for women contain more "doubt raisers," and Black applicants were described more often as "competent" and white applicants with "standout" words (Madera et al. 2009, 2019; Trix & Psenka 2003; Ross et al. 2017; course-feedback plan §2.3). The GPC never edits the advisor's words: a passage that needs changing goes back to the advisor with a logged reason, and the advisor's fields reopen for 5 days without changing the review's status. The GPC edits only the letter text the GPC writes.
- Calibration notes, the date of the calibration meeting, and which subfield group met.
- The final rating. A rating different from the advisor's needs a reason.
- The letter text, generated from a template and editable (§7).
- **Status action, separate from the rating:** none, Notification (internal), or a recommended Alert or Final Alert.
  - Choosing an Alert opens a checklist: the letter cites all four required elements; nothing in it rests on a pending conduct allegation, and any conduct matter has a final order from the conduct process first (§2.2); the Graduate School is copied by the 10th business day of the Alert quarter (autumn by default; §4.4); and the dates are recorded.
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
- Past the program's **expected** time to degree (§4.6), which makes the plan to completion required. Off until the faculty set the figure.
- Near the Graduate School's limits: year 8 or later for a doctorate, year 5 or later for the MA. Leave counts toward this. This flag differs from the others: Policy 1.1 says "Students nearing or past the program's limit should be placed on Academic Alert" (§2.2). When it appears, the program stage requires the GPC to record a decision: recommend an Alert, record an extension (which "can be made at the program level"), or record why neither applies. A person still decides (principle 2). The limit is separate from the expected time to degree (§4.6).
- No compact on file, or a compact last revised more than 12 months ago.
- A milestone past its "unsatisfactory if not done by" date.
- No committee Chair (Policy 4.2.4).
- A cumulative GPA below 3.0, prefilled from MyGrad (§9.3). The flag uses the Graduate School's definition: numeric grades in 400- and 500-level courses only, excluding 600, 700, 800 and 801 courses (§2.2). Whether MyGrad's `GPA` field follows that definition is unverified; check it against one student's transcript during the build.
- A 3rd consecutive *with concerns* rating.
- No meeting with the advisor this year, from the student's count of actual meetings (§5.1). Passive ("laissez-faire") supervision was associated with higher odds of psychological distress, and more frequent meetings with less exhaustion (Levecque et al. 2017; Devine & Hunter 2016; §2.5).

---

## 7. The letter

Every student in the annual review gets a letter, signed by the GPC (or the alternate reviewer) and copied to the advisor(s) and committee chair. MA students, who have quarterly check-ins instead (§4.4), get a letter only when a check-in raises a concern. **This changes Sociocultural's practice, in which the committee chair communicates the result. See decision 15.** The template contains:
1. Recognition of accomplishments, from the advisor's input.
2. Upcoming milestones and dates.
3. Advice and next year's agreed goals.
4. **Milestone determinations** (satisfied, not yet, or not satisfied) for each milestone attempted this year, and the **action items** table with owners and dates (Taskforce AP2 and MA3).
5. The plan to completion, if one was required (§4.6).
6. **If concerns:** the specific benchmark(s); the deadline; the support the department and advisor will give; the check-in date; and the consequence if the benchmark is not met. These are the elements Policy 3.7.2 lists.
7. **If an Alert is recommended:** a separate Alert letter template with the four elements Policy 3.7.3 requires. A Final Alert letter adds the "can be immediately dropped" wording. These are rare, and the GPC reviews each one manually.
8. Rights and resources: how to respond, the appeal route, the Office of the Ombud, Graduate Student Affairs, Counseling, Disability Resources for Students, and the Husky HelpLine.
9. **Who to talk to if the advising relationship is strained:** the department's escalation flowchart (advisor, then GPC, then department chair, then the Ombud, then the grievance procedure), and, once the student has a committee, the student's **Graduate School Representative (GSR)**, named, with the GSR's required duty under Policy 4.2: to "ensure that the student is treated in an unbiased manner" (§2.2; Taskforce Toolkit D, MA1). The department has decided not to define the optional "neutral resource" role for now (§11, item 11), so the letter does not use that phrase.

Before release, the GPC checks the advisor's narrative and the letter for person-focused, unclear or hedged wording, and for possible conduct matters (§5.3).

Delivery: the letter is shown inside the app at the acknowledgement stage. The final PDF is shared only with the UW accounts of the people who receive it, and emails link to it; the letter is never an email attachment or the body of an email. This follows the Registrar's FERPA guidance to share student records through NetID-authenticated access, and matches how the Course Feedback Record is shared (course-feedback plan §6.4).

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

States and transitions, the page list, every email text and the acceptance tests are in [`build-spec.md`](build-spec.md).

Build this as a **separate Apps Script project, spreadsheet and deployment**, starting from a copy of the TA project. Keeping them separate holds academic records apart from ASE personnel records, and lets each project use its own retention period and sharing. If later maintenance warrants it, the shared infrastructure can become an Apps Script library.

### 9.1 File-by-file

| File | Action | Changes |
|---|---|---|
| `AuditLog.gs`, `Logs.gs`, `DeadLetterQueue.gs`, `Alerting.gs` | **Reuse** with renames | New action names (`STUDENT_SUBMIT`, `ADVISOR_SUBMIT`, `PROGRAM_SUBMIT`, `STUDENT_ACK`, `INTERIM_CREATED`, `STATUS_ACTION_RECORDED`) |
| `Config.gs` | **Modify** | New statuses and sheet names. Cycle calendar (§4.4) in place of `QUARTER_END_DATES_`, which is still used to find spring week N. Milestone lists for each program; the rating scale; `TOKEN_TTL_DAYS` = 45; the GPC email as a separate value from `ADMIN_EMAIL` |
| `Security.gs` | **Modify** | Identity checks against a *list* of advisors, plus a GPC role for the program stage. `STAGE_FIELDS_` for the four stages. GPC-only fields are written to the separate sheet. Upload checks (PDF only, size, file count) |
| `WebApp.gs` | **Modify** | Four stage handlers. **Drafts for every stage**; the TA system only saves drafts at the instructor stage. File upload uses the route Google documents: pass the `<form>` element to `google.script.run`, so the file input arrives as a Blob and goes straight to `DriveApp.createFile(blob)` with no base64 step. Google's docs set no size limit on `google.script.run` arguments or on `createFile(blob)`; the only documented limit on this path is the 6-minute execution time. **Still a build spike:** with no documented limit to check against, upload a real 10 MB PDF in the deployed web app early in the build. The fallback is a smaller cap (about 5 MB) or a link to a file in the student's UW Google Drive. A batch view of the program stage for calibration. Prefill loaders |
| `Automation.gs` | **Modify** | Due dates set by the cycle. Interim rows. Summer quiet period. Reminders go to all listed advisors |
| `EmailEngine.gs` | **Rewrite templates** | Invitations, reminders, letter release, completion; the texts are in [`build-spec.md`](build-spec.md) §3. The Policy 3.7 and FERPA wording replaces the Executive Order 28 and UAW wording. The completion email links to the PDF shared with the reader's UW account; the TA system's PDF attachment is removed |
| `PdfEngine.gs` | **Rewrite layout** | Student report, advisor evaluation, letter, response, signatures. **Leaves out GPC-only fields by design**, with a unit check that no confidential key reaches the PDF builder |
| `SheetAdmin.gs` | **Modify** | Menu items: Initialize; **Import Roster** (opens the Roster page, §9.3); **Launch Cycle** (one row per active student who is not on leave); Mark On Leave or Exempt; **Generate Letters**; Release Letters; and the existing health and DLQ items |
| `Index.html` | **Major rewrite** | Repeatable rows for publications, presentations and grants; milestone checklist; goals carried forward; file upload; a stage progress bar. Keeps the WCAG 2.1 AA patterns, server-side drafts and no browser storage |
| **New** `Roster.gs` | New | The `Students` sheet: name, email, program, subfield, entry quarter, advisors, chair, **GSR**, `Alternate_Reviewer`, milestone dates, leave quarters, GPA (prefilled from MyGrad, §9.3). Time-to-degree calculation |
| **New** course feedback module | New | Specified in the course-feedback plan §7: `RosterImport.gs`, `RosterPage.html` (shared with this system's roster import, §9.3), `CourseFeedback.gs`, `FeedbackForm.html` and `ReviewRelease.html`, with the sheets `Instructors`, `Enrollments`, `Feedback_Requests`, `Course_Feedback`, `Followups` and `Feedback_Records`. Menu items **Launch Course Feedback**, **Review and Release** and **Build Feedback Records** |
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

### 9.3 Prefill from MyGrad (started by the administrator)

Each cycle the Graduate Student Administrator opens the Roster page, clicks **Get MyGrad data**, and clicks the **MyGrad Table Audit** bookmarklet in the tab that opens. The bookmarklet sends the data back to the app tab with `postMessage`, by the same route and with the same CSV upload fallback as the course feedback module (course-feedback plan §4.5). The app never signs in to MyGrad or reads it on its own.

What it sends, all of which MyGrad's Current Student List or the bookmarklet's existing per-student requests already provide (checked 17 Nov 2026):
- from the Current Student List: UW email, entry quarter (`GradAdmitYr`, `GradAdmitQtr`), cumulative GPA (`GPA`), leave end (`LeaveEndsYr`, `LeaveEndsQtr`), advisor and committee flags (`HasAdvisor`, `HasMastersComm`, `HasDocComm`, `HasReadingComm`) and UW degrees (`UWDegrees`);
- from each student's pages: candidacy and its exam date, ANTH 800 credits, and the year's courses with titles and grades from the transcript.

The student confirms or corrects every prefilled value in the self-report. Grades come into this system because the student's own coursework field already asks for them; the course feedback export drops grades (course-feedback plan principle 4). `Students` keeps only these fields, under the review's retention (§10).

Adding the send step changes the bookmarklet's documented boundary: its readme says "No data are collected from your computer," and its code says "Nothing leaves the browser." Update both statements when the send step is built (course-feedback plan task R1).

### 9.4 Calibration view

A page for the GPC alone, filtered by subfield. It shows each student's year, flags, the advisor's recommended rating, accomplishments and concerns, and is meant to be projected or shared during the faculty meeting. It shows nothing from the GPC-only sheet. Final ratings are entered here.

Each calibration meeting opens with a short frame-of-reference briefing: the GPC goes through the three rating levels (§6) with one or two anonymized examples from past cycles. Frame-of-reference training improved rating accuracy (Roch et al. 2012), and calibration meetings were associated with ratings that agreed better with other measures (Speer et al. 2019; §2.5). In the first cycle, with no past cases, the GPC writes the examples.

It also shows each student's course feedback in summary: the coverage line, the ratings grid and any follow-up flags with their outcomes. Free-text comments appear only if the GPC opens them for a specific student, and rating levels are never compared across instructors or students (course-feedback plan principle 6, decision 7). The subfield coordinators receive the same summary to prepare the meeting (course-feedback plan §6.4).

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
  - how many students have a compact;
  - how many students leave the program within a year of a *Satisfactory with concerns* or *Unsatisfactory* rating, so the department can see whether concern letters push students out. Academic probation more than doubled men's dropout among undergraduates (Lindo et al. 2010; §2.5);
  - course feedback: response rate by quarter, the share of "not enough contact," minutes per instructor page, comments returned for revision, and follow-up flags raised.

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

  **Course feedback** follows the course-feedback plan §6.4: each quarter's comments go to the student and advisor(s) at release; the yearly record goes to the student, advisor(s) and, as a PDF appendix, the committee chair; subfield coordinators and the calibration meeting see only the coverage line, ratings grid and flags; instructors see only what they wrote, until their page closes. It follows the same retention series as the review.

- **Retention:** the likely series is **[Student Folders](https://finance.uw.edu/recmgt/recordseries/student-folders)** in the UW General Schedule (Student and Curriculum records). It covers a student's academic history, including "evaluative/progress report documentation"; the department holds the official copy; it is kept **6 years after the degree is awarded or after last activity**, then shredded or deleted. The shorter [Advisor's Files](https://finance.uw.edu/recmgt/recordseries/advisors-files) series (1 year after the student is inactive or graduates) covers advisors' working notes, not evaluations, so it does not fit the review record. The ASE series the TA system uses does not apply. **Before launch, confirm with [UW Records Management](https://finance.uw.edu/recmgt/)** that Student Folders is right and that Anthropology's department schedule adds nothing. As in the TA system, nothing is deleted automatically. Logs are pruned after 90 days.
- **CV uploads** go in a restricted Drive folder owned by the system account, with the same retention period as the review.

---

## 11. Policy work the department should do alongside the system

1. **Publish written progress requirements** for each program, with milestones, "expected by" and "unsatisfactory if not done by" dates, consequences and the appeal path, and send them to students and faculty at enrollment. **Policy 3.7.1 requires this.** The system's milestone configuration and these published requirements should be the same list.
2. **Update the Archaeology page** to replace "warning, probation or final probation" with the current terms: Notification, Academic Alert and Final Academic Alert.
3. **Biological Anthropology** should decide whether to take part in the annual review. Policy 3.7.2 says faculty "should" review at least annually.
4. Name the **Interim Faculty Point of Contact** process for students without a Chair (Policy 4.2.4).
5. **Submit the required time-to-degree analysis for each PhD program by December 4, 2026** ([template and instructions](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/time-to-degree-analysis/)). Completed templates go "to deans and/or vice-chancellors" (TTD analysis page; §2.4). It is separate from the system and due before the system exists, but the delays it identifies should shape the milestone map and the expected time to degree below.
6. **Publish a visual milestone map for each program** (Taskforce AP2, AP3). For each milestone, give its purpose, learning goals, format, expected timing, "unsatisfactory if not by" date, and the consequence of missing it. Make it the same list as the system's milestone configuration, so the form, the letter and the handbook never disagree.
7. **Set and publish an expected time to degree** for each program (Taskforce MA5), which drives §4.6.
8. **Adopt a compact template** adapted from Taskforce Toolkit E, and an IDP template adapted from the [Graduate School's IDP](https://grad.uw.edu/wp-content/uploads/IDP.docx).
9. **Post UW-wide resources and local practice in the handbook.** Taskforce MA1 says units "are required" to do this. That is recommendation wording, not yet policy, but it is easy to do. Include an escalation flowchart for strained advising relationships.
10. **Structured community after year one** (Taskforce CB2 and CB3): for example, dissertation-stage colloquia or writing groups. The report also recommends "consistent recognition practices aligned with milestones". With the student's consent, milestone determinations of *satisfied* could feed an announcement of milestones each quarter. This is outside the system, but the survey's belonging question (§9.5) measures it.
11. **Whether GSRs serve as a "neutral resource"** (Policy 4.2.2.4.2). **Decided 17 November 2026: not for now.** If the department revisits it, the GPC must define the role in writing, communicate it to all parties and apply it consistently across all committees, as the policy requires (§2.2), before the letter uses the phrase (§7).

---

## 12. Rollout

| When | What |
|---|---|
| By 4 Dec 2026 | **Submit the time-to-degree analysis for each PhD program** (separate from this system; §11 item 5) |
| Dec 2026 – Jan 2027 | The decisions in §13 were settled on 17 November 2026; the graduate committee reviews them in December. Confirm the retention series. Draft the published progress requirements |
| Jan – Feb 2027 | Build: copy the TA project, then Roster, the four stages, the PDF and letters. Cycle-one modules: milestone determinations, action items, career check-in, mentoring network map, optional skills self-assessment, the plan to completion (once the faculty have set the expected time to degree), and the post-cycle survey. Run a test cycle in which one account plays every role, as the TA system was tested. Build the `INTERIM` form now: course-feedback follow-up flags can create interim rows from April 2027 (§4.2), before the automatic interim rows from spring ratings start in autumn. Build the course feedback module in the same project (course-feedback plan §10) |
| Late Feb 2027 | Pilot with 3–5 volunteer students and their advisors, ideally including one co-advised Archaeology student and one MA student. Revise the forms based on what they report |
| Spring 2027 | First full cycle on the calendar in §4.4. Paper or email fallback available for anyone who cannot use the app |
| Summer 2027 | Debrief: completion rates, time per stage, feedback from faculty and students. Adjust the fields |
| Autumn 2027 (phase 2) | **Compacts** for every PhD student and advisor, and for the incoming cohort (§4.5). Build `Compact.gs` over summer 2027. The metrics sheet (§9.5) produces its first report from the spring 2027 data. Optional autumn IDP and planning step (the GWSS model). Interim check-ins from the spring ratings go live. The first-year sociocultural portfolio moves into the app |

---

## 13. Decisions

Settled on 17 November 2026. Each stands at its recommended default except decision 4, which was changed, and decision 18, which was refined. The graduate committee can revisit any of them.

| # | Decision | Recommended default |
|---|---|---|
| 1 | One department-wide process, or one per subfield? | **One system**, with milestones, wording and calibration groups set per subfield |
| 2 | Who calibrates? | **The subfield faculty meeting** (Sociocultural's existing practice). The GPC records the outcome |
| 3 | Does Biological Anthropology take part? | **Yes**, with its associate-advisor meeting as the advisor stage |
| 4 | How often are MA students reviewed? | **A short check-in at the end of every enrolled quarter, including spring, and no full annual review** (§4.4). Policy 3.7.2 says programs under two years long should review "at least quarterly" |
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
| 16 | Who is the alternate reviewer when the GPC has a conflict? | **The department chair** (§3, principle 5). Option: an alternate GPC. Policy 4.3 says "One or more alternate GPCs may serve as deputy" (§2.2) |
| 17 | Adopt advisor–advisee compacts? | **Yes, from autumn 2027** (phase 2): every PhD student and advisor in that first round, then each incoming cohort. Revisit at each review from spring 2028 |
| 18 | Expected time to degree | **Faculty set it for each PhD program**, based on the December 2026 time-to-degree analysis. Until then the "past expected time" flag and the plan to completion are switched off (§4.6); there is no placeholder |
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
- **Build capacity.** This system and the course feedback module are both built in Jan–Feb 2027, with this system's pilot in late February, the course feedback test in early March, course feedback pages opening 15 March and this system's first cycle in spring week 1. On 17 November 2026 the department chose to keep both on schedule. If the build slips, the first thing to move is the course feedback pilot, to Spring 2027 courses (pages open 7 June).
- **Policy drift.** Policy 3.7 has changed three times since 2021. Keep the status names and letter wording in `Letters.gs` and `Config.gs` so they can be updated without code changes.

---

## Appendix A: Other UW programs surveyed

**PhD Taskforce:** [PhD Taskforce report](https://facstaff.grad.uw.edu/ph-d-taskforce/taskforce-report/) (read in full; quotations in §2.4 are verbatim). Also the [Year 2 Action Plan](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/) and the [time-to-degree analysis page](https://facstaff.grad.uw.edu/ph-d-taskforce/year-2-action-plan/time-to-degree-analysis/).


Geography ([review](https://geography.washington.edu/annual-graduate-student-review), [progress requirements](https://geography.washington.edu/satisfactory-academic-progress)); Sociology ([AY2025 manual](https://soc.washington.edu/sites/soc/files/documents/AY2025%20Graduate%20Program%20Manual.pdf)); [HCDE](https://www.hcde.washington.edu/phd/annual-review); [Allen School (CSE)](http://web.archive.org/web/20260906181814/https://www.cs.washington.edu/academics/graduate/phd-program/handbook/guides/review-progress/) (Internet Archive copy of 6 September 2026; the live page now requires a CSE login); [iSchool](https://ischool.uw.edu/programs/phd/curriculum/degree-requirements/student-review-policy); [Linguistics](https://linguistics.washington.edu/graduate-milestones); JSIS ([form](https://jsis.washington.edu/wordpress/wp-content/uploads/2018/04/APR_Form.pdf), 2018; [2025–26 handbook](https://jsis.washington.edu/programs/graduate/phd/ph-d-student-handbook/ph-d-program-student-status-and-standing/)); GWSS ([self-evaluation](https://gwss.washington.edu/sites/gwss/files/documents/graduate/graduate_student_self-evaluation_form_gwss.pdf), [advisor](https://gwss.washington.edu/sites/gwss/files/documents/graduate/faculty_annual_evaluation_of_grad_students.pdf), [plan](https://gwss.washington.edu/sites/gwss/files/documents/graduate/graduate_academic_professional_planning_form.pdf); 2014; and the current [fillable self-evaluation](https://gwss.washington.edu/sites/gwss/files/documents/Self-Evaluation%20Form%20(Fillable).docx)); Philosophy ([student](https://phil.washington.edu/sites/phil/files/documents/grad%20self%20eval%20form.docx), [advisor](https://phil.washington.edu/sites/phil/files/documents/faculty%20adviser%20form.docx)); [Food Systems, Nutrition & Health (FSNH) PhD](https://foodsystems.uw.edu/wp-content/uploads/2025/07/FSNH-PhD-Annual-Progress-Review.docx); [Interdisciplinary PhD](https://sites.uw.edu/iiphd/degree-requirements/annual-review); [History](https://history.washington.edu/phd-degree-evaluation-criteria); [Political Science](https://www.polisci.washington.edu/graduate-student-guide-satisfactory-progress); Psychology (2018–19 manual, read from a third-party mirror; no longer cited in §2.3); [Biology](https://biology.washington.edu/admin-gateway/graduate-students/committee-report-forms); [Microbiology](https://microbiology.washington.edu/sites/default/files/2024-12/2024-12%20Annual%20Thesis%20Committee%20Meeting%20Report.pdf); [SEFS mentorship plan](https://sefs.uw.edu/wp-content/uploads/sites/22/2022/10/SEFS-Graduate-Student-Mentorship-Plan-Oct.-2022.pdf); [MELC MA form](https://melc.washington.edu/sites/melc/files/documents/graduate/MA%20Annual%20Progress%20Review%20Form%2C%20October%202023.pdf); [Atmospheric Sciences](https://atmos.uw.edu/wp-content/uploads/2026/03/2026-March-Satisfactory-Progress-Official-Version.pdf).

