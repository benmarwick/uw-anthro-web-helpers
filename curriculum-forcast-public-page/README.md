# Curriculum Forecast System (UW Anthropology)

This folder contains the scripts behind the Anthropology Curriculum Forecast. This guide explains how another UW Seattle department can set up the same system, which has four parts:

1.  Faculty and staff plan each academic year's courses in one Google Sheet per course prefix (for us: ANTH, ARCHY and BIO A).
2.  Staff and the curriculum coordinator discuss each change in a comment thread on the cell concerned, so the reason for the change stays next to the data.
3.  A forecast spreadsheet combines the planning sheets with `IMPORTRANGE`, adds Gen Ed, W-credit and major-option information read from UW web pages, and checks the schedule for conflicts.
4.  A Google Apps Script web app shows the forecast spreadsheet to students as a filterable course list, and the department website links to it.

Ours:

- Department page: <https://anthropology.washington.edu/curriculum-forecast>
- Forecast web app (UW sign-in required): <https://script.google.com/a/macros/uw.edu/s/AKfycbzspfkHnvjuRCKQEc3F-Z7PUe4zXAx_cPdBMZFvOxdD5TiEDoDcT6N8SDPb4ON80ETQ/exec>

The web page reads the forecast spreadsheet each time someone opens it, so edits to the planning sheets reach students without anyone republishing the page. The imports can lag, so the notice on our student tab asks students to check back in an hour if cells look empty.

## Contents

- [How the Parts Fit Together](#how-the-parts-fit-together)
- [Files in This Folder](#files-in-this-folder)
- [Before You Start](#before-you-start)
- [Part 1: Planning Sheets](#part-1-planning-sheets)
- [Part 2: Tracking Changes with Comments](#part-2-tracking-changes-with-comments)
- [Part 3: The Forecast Spreadsheet](#part-3-the-forecast-spreadsheet)
- [Part 4: Adapting the Scripts](#part-4-adapting-the-scripts)
- [Part 5: Publishing the Web Page](#part-5-publishing-the-web-page)
- [Yearly and Quarterly Tasks](#yearly-and-quarterly-tasks)
- [How the Checks Work](#how-the-checks-work)
- [Troubleshooting](#troubleshooting)
- [Status for UW Anthropology](#status-for-uw-anthropology)

## How the Parts Fit Together

``` mermaid
flowchart LR
  P1["ANTH course planning<br/>(one tab per year)"] -->|IMPORTRANGE| F
  P2["ARCHY course planning"] -->|IMPORTRANGE| F
  P3["BIO A course planning"] -->|IMPORTRANGE| F
  C["UW course catalog pages<br/>and major option pages"] -->|Scraper.gs, monthly| F
  F["Forecast spreadsheet<br/>Dashboard, student tab,<br/>admin tabs, TA needs,<br/>Summaries, Conflict Report"] -->|Code.gs + Index.html| W["Forecast web page"]
  F -->|Code.gs + ScheduleDashboard.html| S["Schedule view (?page=schedule)"]
  W --> D["Link on the department website"]
```

People type only into the planning sheets and, in the forecast spreadsheet, into the Dashboard and the notice to students. Formulas and scripts fill in everything else.

## Files in This Folder

All seven files (five scripts and two HTML pages) belong in one Apps Script project, the one you open from the forecast spreadsheet with **Extensions \> Apps Script**.

| File | What it does |
|------------------------|------------------------------------------------|
| `Code.gs` | Serves the web page and sends it data from the forecast spreadsheet: `getCourseData` for the course list, `getScheduleData` for the schedule view. |
| `Index.html` | The student course list, with filters for prefix, quarter, year, Gen Ed, W credit, major option and instructor. |
| `ScheduleDashboard.html` | A weekly timetable chart of one quarter, with a "pathway checker" that plots any set of courses together. |
| `Scraper.gs` | `runFullUpdate` reads the UW course catalog pages and the department's major option pages, and rewrites the `Ref_GenEd` and `Ref_Options` tabs. |
| `Conflict Report Script.gs` | Adds the **Admin Tools** menu. Its **Run Schedule Validation** checks start times against the UW block schedule and lists overlapping classes in the `Conflict Report` tab. |
| `PlanningRules.gs` | **Admin Tools \> Apply entry rules to planning sheets**: adds dropdowns, checks and highlights to columns A to S of each planning sheet (see [Entry Rules](#entry-rules)). |
| `DataCheck.gs` | **Admin Tools \> Run Data Check**: lists every planning-sheet row that breaks a column rule, with a link to the cell, in the `Data Check` tab (see [Data Check](#data-check)). |

`tests/run.js` is not part of the project. Run it with Node (`node tests/run.js`) after changing a script: it loads all the `.gs` files together, so a syntax error or a name defined in two files shows up before it reaches the live menus, and it tests the Data Check rules. Given the path of a JSON export of planning tabs, it also prints the Data Check's counts for them.

## Before You Start

### People and Roles

| Role | In our department | What they do |
|------------------------|------------------------|------------------------|
| Owner | One faculty member | Owns the forecast spreadsheet and the Apps Script project. The web page and the monthly update run under this account. |
| Curriculum coordinator | A faculty member | Enters the plan for each year, answers questions in comments, decides changes. |
| Scheduling staff | Staff who build the UW Time Schedule | Build the Time Schedule from the planning sheets, ask questions in comments, record what they submitted, resolve threads. |
| Faculty | All instructors | Read the planning sheets; some comment. |

The web page and the monthly trigger both stop working if the owner loses access to the spreadsheets or leaves UW. If your department has an account that outlasts any one person, make it the owner.

### What You Need

- A UW Google account (`@uw.edu`) for everyone involved.
- The two templates. Each link opens Google's "Make a copy" page; sign in with your UW account first.
  - [Planning sheet template](https://docs.google.com/spreadsheets/d/1Fx3asQB6QjXnjsz0nxGQvF_23SsN_EM66icjySsCxDA/copy): one year tab with no courses and the entry rules in place, plus the overlap checker.
  - [Forecast spreadsheet template](https://docs.google.com/spreadsheets/d/1ErYekwI1efEKvXTfGqU2uESB4OeDgVLacdDFhwQ0pEU/copy): every tab and the seven script and page files, with placeholders where your planning sheet IDs and contact address go.
- The UW course catalog page for each prefix, for example `https://www.washington.edu/students/crscat/anthro.html`.
- For each major option you want shown, the department web page that lists its courses.

## Part 1: Planning Sheets

Make one planning spreadsheet for each course prefix.

1.  Open the [planning sheet template](https://docs.google.com/spreadsheets/d/1Fx3asQB6QjXnjsz0nxGQvF_23SsN_EM66icjySsCxDA/copy) and click **Make a copy**. Google says an Apps Script file will be copied too; it is an empty project, and the planning sheet does not use it. Name the copy after the prefix, for example "GEOG course planning".
2.  The year tab is named `2027-28`. Rename it to the academic year you are planning, in exactly that form. The forecast spreadsheet looks up tabs by that name, so `2027-2028` or `AY 27-28` will not be found.
3.  Share the spreadsheet. Give **Editor** access to the curriculum coordinator, the scheduling staff and the forecast owner, and **Commenter** or **Editor** access to other faculty. Without at least view access for the forecast owner, `IMPORTRANGE` cannot read the sheet.
4.  Copy the spreadsheet ID, the long string between `/d/` and `/edit` in the address. You will paste it into the forecast Dashboard in Part 3.

### Column Rules

Row 1 has the headings, and each later row is one course section. Columns A to S must appear in this order in every planning spreadsheet and every year tab, because the formulas and scripts pick columns by position.

| Column | Heading | What to type | Example |
|------------------|------------------|------------------|------------------|
| A | (blank) | Quarter sort key: 1 autumn, 2 winter, 3 spring. Fills itself from column B once the entry rules are applied; do not type in it. | `1` |
| B | Quarter | `AU`, `WI` or `SP`, exactly. Summer is not supported. | `AU` |
| C | Year | The calendar year of that quarter. In 2026-27, autumn is 2026; winter and spring are 2027. | `2026` |
| D | Prefix | As the UW catalog writes it, including spaces. | `BIO A` |
| E | Course \# | Leave blank until known. | `203` |
| F | Section | Section letter, if any. | `A` |
| G | Credits | | `5` |
| H | Title | Students see this. | `Intro Anth Linguistics` |
| I | Instructor | Last name. Students see this. | `Rivera` |
| J | Joint/Withered | The linked course (see below). | `LING 203` |
| K | \# TAs | A number. | `2` |
| L | Enrollment | Enrollment limit, or a split such as `30/15`. | `150` |
| M to Q | Mon to Fri | `X` on each meeting day, `Q` for a quiz-section day. | `X` |
| R | Time Start | A time value. | `10:30 AM` |
| S | Time End | A time value. | `12:20 PM` |
| T onward | Your choice | Anything your staff need, such as rooms, restrictions or fees. | |

Rules that prevent most errors:

- Type times as `10:30 AM` or `10:30`, and leave the cell blank if the time is not known yet (not `TBD`). Text in a time cell makes the conflict checker skip that course.
- Add new columns only after column S. A column inserted anywhere in A to S shifts every later column.
- Check column C when you copy rows from another quarter.
- Keep each year tab under 200 rows. The forecast reads rows 1 to 200.

The entry rules refuse most mistakes as you type them, and **Run Data Check** finds the rest, including values pasted in (Google's checks mark a pasted bad value but do not refuse it).

In column J, a **joint** course is a formal catalog listing of courses always offered together (ANTH 203 and LING 203). A **withered** course is an informal pairing that runs in the same room at the same time (for example, a 400-level and a 500-level version). Give each course of a pair its own row and name the other course in column J.

### Helpful Features in the Template

- **Notes on headings.** Hover over a heading with a small black triangle to read what the column means and, for each checked column, what it accepts. Use notes only for column definitions: unlike comments, they notify no one.
- **Entry rules** on columns A to S: dropdowns for the quarter, prefix and days, checks on the year, course number, number of TAs, enrollment and times, and highlights for missing or inconsistent values (see [Entry Rules](#entry-rules)). Selecting a checked cell also shows what it accepts.
- **Dropdown menus** for registration restrictions and room attributes. Edit the options under **Data \> Data validation**.
- **# Readers** and **Enrollment notes** columns at the far right, for values that do not belong in "# TAs" or "Enrollment" (for example "1 reader" or "150 (108 ANTH / 42 LING)").
- **Course time overlap checker tab.** Choose a year in B1 and a quarter in D1 to see each class meeting on a half-hour grid, colored by course level. Add each new year to the B1 dropdown's data validation list, starting with your renamed year tab. On a year tab with no courses it shows `#VALUE!`.

Our ARCHY sheet also has two tabs that count, per quarter, how many courses from each archaeology major option's lists are offered. Add similar tabs if your options need them; the web page does not use them.

## Part 2: Tracking Changes with Comments

After the curriculum coordinator enters a year's plan, the scheduling staff build the UW Time Schedule from it. Each later change (a new time, room, course number or enrollment cap, or a cancelled section) gets a comment thread on the cell it concerns, holding the question, the decision and what was submitted. In November 2026 our ANTH planning spreadsheet had 212 such threads.

Comments work better than email here: the thread sits on the cell, an `@` mention emails the person, and resolved threads stay in the spreadsheet and can be reopened. Google's help page is [Use comments, action items, & emoji reactions](https://support.google.com/docs/answer/65129).

### How to Write a Comment

1.  Click the cell the comment concerns: the time cell for a time question, the instructor cell for a staffing question.
2.  Choose **Insert \> Comment** (⌘+Option+M on a Mac).
3.  Type `@` and the person's UW email address. If they need to act, tick **Assign to** before you click **Assign**.
4.  Write one topic per thread, and say where the information came from.

Examples (invented):

> @coordinator Last year's version had an enrollment cap of 40. Keep it for this year?

> Per the instructor's email of 3 May, preferred times are T/Th 10:30-12:20, second choice M/W 2:30-4:20.

### How to Reply and Close a Thread

1.  When you act, reply with what you did and when, for example: "12 May: Submitted Time Schedule Office ticket to change the time to 2:30-4:20."
2.  Change the cell itself once the decision is made. The cell feeds the forecast; the comment records why.
3.  **Only scheduling staff resolve threads**, once the change appears in the UW Time Schedule. Everyone else replies instead, so staff keep a complete list of pending work.

If a decision happens in a meeting or by email, add a one-line reply saying so. To review open threads, click the speech-bubble icon at the top right; the **All sheets** filter limits the list to one year tab.

## Part 3: The Forecast Spreadsheet

### Make Your Copy

Signed in as the owner account, open the [forecast spreadsheet template](https://docs.google.com/spreadsheets/d/1ErYekwI1efEKvXTfGqU2uESB4OeDgVLacdDFhwQ0pEU/copy) and click **Make a copy**. In the copy, open **Extensions \> Apps Script** and check that the seven files are there; paste in any that are missing from this folder. The copy has no trigger and no web address, so set up your own in Parts 4 and 5.

The template's tabs show `#REF!` and its Ref_GenEd, Ref_Options and Conflict Report tabs are empty until you finish this part and Part 4. The notice to students says `<your contact address>` until you edit it.

### Tabs

| Tab | Filled by | What it shows |
|------------------------|------------------------|------------------------|
| Dashboard | You | Planning sheet IDs and the years and quarters to show. |
| Current and Next Academic Year | Formulas | The student view, which the web page reads: the current year in columns B to I, the next year in L to S, and the notice to students in rows 1 to 4. |
| forAdmin`<PREFIX>` (one per prefix) | Formulas | Every column of one prefix's planning tab for the "Admin" year. The conflict report, schedule view and Summaries read these. |
| TA needs | Formulas | Courses in the current year with TAs, with totals by quarter and prefix. |
| Summaries | Formulas | Distinct courses per level (100 to 400) for each prefix and quarter of the Admin year. |
| Ref_GenEd, Ref_Options | `Scraper.gs` | Gen Ed codes, W credit and descriptions; which courses count toward which major option. Replaced monthly; do not edit. |
| Conflict Report | `Conflict Report Script.gs` | The result of the last **Run Schedule Validation**. |
| Data Check | `DataCheck.gs` | The result of the last **Run Data Check**. Created the first time you run it. |

### Set Up the Dashboard

1.  **Planning sheet IDs.** Paste the IDs from Part 1 into B14, B15 and B16 in place of `<paste planning sheet ID>`, and change the labels in A14 to A16 to your prefixes. The cells are named `ANTHkey`, `BIOAkey` and `ARCHYkey`; you can keep those names. For a different number of prefixes, see [More or Fewer Than Three Prefixes](#more-or-fewer-than-three-prefixes).
2.  **Student years.** Type the current academic year in B4 and the next one in B5 (form `2026-27`). Put an `x` under Autumn, Winter and Spring (columns C to E) for each quarter students should see.
3.  **Admin year.** Type the year you are scheduling in B8, and put an `x` under each quarter you want.

Leave rows 18 to 26 alone: they build the ranges and filters the other tabs use.

### Allow the Imports

Google blocks each import until someone allows it. Open each forAdmin tab, click B2 if it shows `#REF!`, and click **Allow access**. Then check that **Current and Next Academic Year** and **TA needs** fill in. Access is granted per planning spreadsheet, so new year tabs need no new permission.

Also set **File \> Settings \> Calculation \> Recalculation** to **On change and every minute**, which keeps the imported data fresh.

### Edit the Text Students Read

Edit the notice in rows 1 to 4 of **Current and Next Academic Year**, including the contact email address, and the page heading in `Index.html` (Part 4).

### Rename the Admin Tabs

Rename each forAdmin tab to `forAdmin` plus your prefix without spaces (for example `forAdminGEOG`), and put the matching key name in the formula in B2:

```
=SORT(ArrayFormula(QUERY(IMPORTRANGE(""&ANTHkey&"", ""&Dashboard!B25&""), "SELECT * WHERE ("&Dashboard!B26&")")), 1, TRUE)
```

Row 1 of each forAdmin tab is typed, and the scripts find columns by these headings, so it must list the planning sheet headings in order from column B. Then change the tab names in `Code.gs` and `Conflict Report Script.gs` (Part 4), and check that **Summaries**, which names the forAdmin tabs in its formulas, still shows counts.

### More or Fewer Than Three Prefixes

The combining formulas stack one `QUERY(IMPORTRANGE(...))` line per prefix. Cell A6 of **Current and Next Academic Year**:

```
=SORT(
  QUERY(
    {
      QUERY(IMPORTRANGE(ANTHkey, AY1_sheetrange), "select * offset 1", 0);
      QUERY(IMPORTRANGE(BIOAkey, AY1_sheetrange), "select * offset 1", 0);
      QUERY(IMPORTRANGE(ARCHYkey, AY1_sheetrange), "select * offset 1", 0)
    },
    "SELECT * WHERE (" & AY1_quarters & ")",
    0
  ),
  1,
  TRUE
)
```

To remove a prefix, delete its line and the semicolon before the closing brace. To add one, type its ID in a new Dashboard cell, name the cell with **Data \> Named ranges** (for example `GEOGkey`), and add a line. Make the same change in K6 of the same tab (using `AY2_sheetrange`), in A2 of **TA needs** (using `AY1_sheetrange_more`), and add a forAdmin tab and its block in **Summaries**.

## Part 4: Adapting the Scripts

In **Extensions \> Apps Script**, change these Anthropology values, then save.

| File | Line(s) | What to change |
|------------------------|------------------------|------------------------|
| `Scraper.gs` | 24 to 26 | One `{ prefix, url }` per prefix, with its UW catalog page. |
| `Scraper.gs` | 50 and 106 | The lines that turn `BIOA` into `BIO A`. Add similar lines for your prefixes that contain a space, or delete them. |
| `Scraper.gs` | 56 | The Gen Ed codes (`NSc`, `SSc`, `A&H`, `DIV`). Change only if the catalog's codes change. |
| `Scraper.gs` | 83 to 87 | One `{ name, url }` per major option: a short code shown on the web page, and the page listing the option's courses. |
| `Scraper.gs` | 90 | `courseRegex`: the prefixes to look for on the option pages. |
| `Scraper.gs` | 91 to 93 | The heading phrases that mark the core, required and approved lists on your option pages (see below). |
| `Code.gs` | 5 and 11 | Browser tab titles of the schedule view and the forecast page. |
| `Code.gs` | 130 | The forAdmin tab names. |
| `Code.gs` | 192 to 193 | The fallback that guesses the prefix from the tab name, including `BIO A`. |
| `Index.html` | 62 to 63 | Page heading and subtitle. |
| `Index.html` | 90 to 101 | `catalogLinks` (one per prefix) and `optionLinks` (one per option code, matching `Scraper.gs`). |
| `Index.html` | 127 | The Gen Ed filter; keep it the same as `Scraper.gs` line 56. |
| `ScheduleDashboard.html` | 42 to 45 | The prefix dropdown. Move `selected` (line 44) to the prefix shown first. |
| `Conflict Report Script.gs` | 10 | The forAdmin tab names. |
| `PlanningRules.gs` | 15 | `PLANNING_PREFIXES`: the prefixes a planning sheet may use in column D. Then run **Admin Tools \> Apply entry rules to planning sheets**. |

Leave the UW colors (`#4b2e83`) and the links to the Time Schedule, MyPlan and Gen Ed advising pages; they apply to every UW department.

### What runFullUpdate Collects

1.  From each catalog page: the Gen Ed codes in each course heading, whether the description ends in `W` (writing credit), and the description. These go to **Ref_GenEd**, and the web page shows them when a student clicks a course title.
2.  From each option page: every course number, labelled by the heading above it. Courses after a "core" heading are Core, those after a phrase such as "Choose one" are Reqd, and those after an "approved electives" phrase are Aprvd. These go to **Ref_Options**, and the web page shows tags such as **MAGH-Core**.

Your option pages will word their headings differently. After the first run, compare **Ref_Options** with your pages and add your phrases to lines 91 to 93 until the labels are right.

### Run the Update Once and Schedule It

1.  In the editor, open `Scraper.gs`, choose `runFullUpdate` in the function menu, and click **Run**. Approve the permissions with the owner account.
2.  When the log says "Update Complete!", check that **Ref_GenEd** and **Ref_Options** list your courses.
3.  Click **Triggers** (the alarm-clock icon), then **Add Trigger**: function `runFullUpdate`, deployment `Head`, event source `Time-driven`, `Month timer`, day `1st`, `Midnight to 1am`, failure notification `Notify me daily`.

## Part 5: Publishing the Web Page

### First Deployment

1.  Click **Deploy \> New deployment**, click the gear next to **Select type**, and choose **Web app**.
2.  Set **Execute as** to **Me** and **Who has access** to **Anyone within University of Washington**.
3.  Click **Deploy**, approve the permissions, and copy the **Web app URL** (it ends in `/exec`).
4.  Open the URL; the course list appears after a few seconds. Add `?page=schedule` to see the schedule view.

"Execute as Me" lets the page read the spreadsheets with the owner's permissions, so students need no spreadsheet access. Visitors must sign in with a UW NetID.

### Updating the Page After Code Changes

Spreadsheet changes need no redeployment. After you edit a script file:

1.  Click **Deploy \> Manage deployments**, select the active deployment, and click the pencil icon.
2.  Under **Version**, choose **New version**, then **Deploy**.

This keeps the same address. **New deployment** would create a new address, and your website link would keep showing the old version.

### Linking From the Department Website

Copy the address from **Deploy \> Manage deployments** so that the link ends in `/exec`. Do not copy it from an email, because email security filters rewrite links into `urldefense.com` redirects. Our page also says: "If you continue to see a blank page, try opening the link in an incognito tab on your browser."

## Yearly and Quarterly Tasks

**When you start planning a new year.** In each planning spreadsheet, duplicate the most recent year tab and rename it (for example `2028-29`). Add the year to the B1 dropdown of the overlap checker tab. Put the new year on the forecast Dashboard (B5 or B8), then choose **Admin Tools \> Apply entry rules to planning sheets**: the year check depends on the tab's name, so a duplicated tab rejects the new years until the rules are re-applied. Then update column C and revise times and instructors.

**When the next year becomes the current year.** On the forecast Dashboard, change B4 and B5; the student tab and web page follow at once. Change B8 when staff start scheduling the new year; the admin tabs, Summaries, conflict report and schedule view follow it.

**Each quarter, before submitting the Time Schedule.**

1.  In the forecast spreadsheet, choose **Admin Tools \> Run Data Check** (the menu appears a few seconds after the spreadsheet opens) and fix the "Fix" rows. Times typed as text or with AM and PM swapped are invisible to the next step.
2.  Choose **Admin Tools \> Run Schedule Validation** and settle each line of the **Conflict Report** with the coordinator, in comments on the planning sheet.
3.  Check **TA needs** and **Summaries** against your TA budget and your balance of course levels.

**Automatic.** On the 1st of each month, `runFullUpdate` refreshes **Ref_GenEd** and **Ref_Options**.

## How the Checks Work

### Conflict Report

**Run Schedule Validation** reads every forAdmin tab and writes one line per problem.

**Block schedule.** For classes starting before 2:30 PM, it compares the start time with those allowed for the class length:

| Class length       | Allowed start times                   |
|--------------------|---------------------------------------|
| 45 to 55 minutes   | 8:30, 9:30, 10:30, 11:30, 12:30, 1:30 |
| 75 to 85 minutes   | 8:30, 10:00, 11:30, 1:00              |
| 105 to 115 minutes | 8:30, 10:30, 12:30                    |
| 165 to 175 minutes | 8:30, 11:30                           |

Other lengths are not checked. The times are in lines 85 to 100 of `Conflict Report Script.gs`; check them against the current UW classroom scheduling policy.

**Overlaps.** Within each quarter, it reports two classes that share a day and overlap in time when both are 200-level with different prefixes ("200-Level Conflict"), or both are 300- or 400-level of any prefix ("Upper-Level Overlap"). It counts a day only when the cell contains `X`, and skips courses whose start time is stored as text. The rules are in lines 135 to 142.

### Entry Rules

**Apply entry rules to planning sheets** reads the planning sheet IDs and the years (B4, B5 and B8) from the Dashboard and sets these rules on each planning sheet's tab for each year. Re-running it replaces its own rules and leaves other rules, such as the restriction and room dropdowns, alone.

| Column | Rule | If broken |
|--------|------|-----------|
| A | One formula in A1 fills the sort key from column B. Typing in the column brings up a warning. | |
| B | AU, WI or SP | refused |
| C | The tab's first year for AU, its second year for WI and SP | refused |
| D | One of `PLANNING_PREFIXES` (in the template: capitals, no stray spaces) | refused |
| E | Three digits, or blank | refused |
| G | A number, a range such as `1-9`, or `CR/NC` | warning |
| J | Names a course with its prefix, such as `LING 203` | warning |
| K | A whole number | refused |
| L | A whole number up to 2000, or a split such as `30/15` | warning |
| M to Q | `X`, `Q` or blank, from a dropdown. Applying the rules first changes any lowercase `x` or `q` to capitals. | refused |
| R, S | A time between 7:00 AM and 10:00 PM; the end after the start | refused |

Each checked column's header has a note saying what the column accepts, added below any existing note. If Sheets turns a split such as `10/10` into a date, format the cell as plain text (**Format \> Number \> Plain text**) and retype it; the cap of 2000 makes such a date show as invalid.

Highlights: red for a course number with no title, times with no days, days with no start time, an end not after the start, a time outside 7:00 AM to 10:00 PM, or text in "# TAs"; yellow for a course number with no instructor; orange for a duplicate section. A "refused" rule stops a typed entry; a pasted value that breaks it is kept and marked with a red corner.

### Data Check

**Run Data Check** reads the same planning tabs (it changes nothing in them) and writes one line per problem to the **Data Check** tab, with the counts by problem at the top and an **Open** link to each row.

- **Fix** rows break a rule the forecast depends on: quarter, year, prefix or course number not in the expected form; a time typed as text, outside 7:00 AM to 10:00 PM, or ending before it starts; times with no days or days with no start time; text in "# TAs"; a day cell other than `X` or `Q`; the same quarter, course and section twice.
- **Check** rows may be correct: no title, no instructor (expected for independent studies), credits not a number or range, enrollment not a number or a split such as `30/15` (or turned into a date), a joint or withered entry without a prefix, a course number not in the UW catalog (from **Ref_GenEd**), and a linked course (column J) that is not planned in the same quarter or starts at a different time.

### Schedule View

`?page=schedule` draws each class of the Admin year as a bar on a Monday-to-Friday, 8 AM to 5 PM timeline, colored by level. Choose a quarter and prefix, or type course numbers into **Degree Pathway Checker** to plot courses a student might take together. Unlike the conflict report, it treats any non-empty day cell as a meeting, so a `Q` day appears as a class.

## Troubleshooting

| What you see | Likely cause and fix |
|------------------------------------|------------------------------------|
| `#REF!` in a forecast tab | The import has not been allowed ([Allow the Imports](#allow-the-imports)), or the Dashboard year does not match a tab name in a planning sheet. If both are right, cut the formula, paste it back and press Enter. |
| A course is missing from the web page | Check that the row has a prefix and a course number or title, that column B is exactly `AU`, `WI` or `SP`, that its quarter has an `x` on the Dashboard, and that the row is within the first 200. |
| A course is in the wrong quarter or year | Column B or column C is wrong in the planning sheet (column A fills itself from column B). |
| "Description not found in catalog index." | The course is not in the UW catalog yet. It appears after the catalog lists it and the next monthly update, or run `runFullUpdate` by hand. |
| Option tags missing or wrong | Compare **Ref_Options** with your option pages and adjust `Scraper.gs` lines 91 to 93. |
| Every course of an option is Aprvd | None of the line 91 "core" phrases is on that option's page. Add the page's own heading for its core list. |
| A course is missing from the conflict report | Its times are stored as text, or its day cells contain something other than `X`. |
| A cell will not accept what I type | An entry rule refuses it. Hover over the cell to see what it accepts; for a time not known yet, leave it blank. |
| **Admin Tools** menu missing | Reload and wait a few seconds. If it is still missing, check that only one script file defines `onOpen`. |
| Blank web page | Try an incognito window. We suspect being signed in to several Google accounts at once, but have not confirmed it. |
| The website shows an old version | The link points at an old deployment. Copy the address from **Deploy \> Manage deployments**. |

## Status for UW Anthropology

As of 18 November 2026, the live page (deployment version 39) lists both the current and the next academic year. The spreadsheet fixes this guide assumes are done: the extra tabs and the Dashboard testing area are deleted, the forAdmin headings are corrected, the ANTH 2027-28 tab follows the column rules, and the old `flush.gs` file is deleted from the Apps Script project. The two templates were made on 18 November 2026: the planning template from the ARCHY sheet's 2027-28 tab with every course row cleared, and the forecast template from the live forecast with placeholders for the sheet IDs and contact address. Neither contains course data, comments, instructor names or email addresses. The planning template also has the entry rules and the **# Readers** and **Enrollment notes** columns.

On 18 November 2026 the entry rules were applied to the 2026-27 and 2027-28 tabs of the ANTH, ARCHY and BIO A planning sheets and to the planning template (backups of the three sheets, made just before, are in the owner's Drive). Applying them changed 146 lowercase `x` day marks in the ANTH sheet to `X`. The only change to the forecast was that nine ANTH courses with an empty sort key moved into their quarters. A Data Check run that evening found 33 values to fix and 107 to check; the values to fix include five classes with AM and PM swapped or an end before the start (ANTH 458 and BIO A 344 in autumn 2026, ANTH 466 in spring 2027, BIO A 320 in winter 2028, ANTH 213 in spring 2028). The same day, `PlanningRules.gs`, `DataCheck.gs` and the new `onOpen` were added to the live forecast's Apps Script project (the web page stays on deployment version 39). The ANTH planning sheet's old "Template" tab (47 rows of a 2024-25 plan in the old column layout) was deleted, and so was a stray "2027-2028" tab holding one row (ANTH 444), after its open comment was copied into a note on that course in the 2027-28 tab; the backup copy keeps both tabs.

Still to do:

- Fix the "Fix" rows in the Data Check (33 on 18 November), starting with the five times.
- On the department page, replace the `urldefense.com` link with the raw `/exec` address.
