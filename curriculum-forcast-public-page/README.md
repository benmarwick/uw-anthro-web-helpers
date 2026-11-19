# Curriculum Forecast System (UW Anthropology)

This folder contains the scripts behind the Anthropology Curriculum Forecast. This guide explains how another UW Seattle department can set up the same system, which has four parts:

1.  Faculty and staff plan each academic year's courses in one Google Sheet per course prefix (for us: ANTH, ARCHY and BIO A).
2.  Staff and the curriculum coordinator discuss each change in a comment thread on the cell concerned, so the reason for the change stays next to the data.
3.  A forecast spreadsheet combines the planning sheets with `IMPORTRANGE`, adds Gen Ed and major-option information read from UW web pages, and checks the schedule for conflicts and data-entry mistakes.
4.  A Google Apps Script web app shows the forecast spreadsheet to students as a filterable course list, and the department website links to it.

Ours:

- Department page: <https://anthropology.washington.edu/curriculum-forecast>
- Forecast web app (UW sign-in required): <https://script.google.com/a/macros/uw.edu/s/AKfycbzspfkHnvjuRCKQEc3F-Z7PUe4zXAx_cPdBMZFvOxdD5TiEDoDcT6N8SDPb4ON80ETQ/exec>

The web page reads the forecast spreadsheet each time someone opens it, so edits to the planning sheets reach students without anyone republishing the page. The imports can lag, so the notice on our student tab asks students to check back in an hour if cells look empty.

## Contents

- [Setting Up, in Short](#setting-up-in-short)
- [How the Parts Fit Together](#how-the-parts-fit-together)
- [Files in This Folder](#files-in-this-folder)
- [Before You Start](#before-you-start)
- [Part 1: Planning Sheets](#part-1-planning-sheets)
- [Part 2: Tracking Changes with Comments](#part-2-tracking-changes-with-comments)
- [Part 3: Setting Up the Forecast](#part-3-setting-up-the-forecast)
- [Part 4: Publishing the Web Page](#part-4-publishing-the-web-page)
- [Yearly and Quarterly Tasks](#yearly-and-quarterly-tasks)
- [How the Checks Work](#how-the-checks-work)
- [Troubleshooting](#troubleshooting)
- [Notes for Maintainers](#notes-for-maintainers)
- [Status for UW Anthropology](#status-for-uw-anthropology)

## Setting Up, in Short

1.  Copy the [forecast spreadsheet template](https://docs.google.com/spreadsheets/d/1ErYekwI1efEKvXTfGqU2uESB4OeDgVLacdDFhwQ0pEU/copy) while signed in as the account that will own the system.
2.  In the copy, set the academic years on the Dashboard (B4, B5, B8), then choose **Forecast setup \> Set up or change settings**. Approve Google's permission screen, ticking **Select all**.
3.  Fill in the form (department, contact address, one row per prefix, any major options), click **Check**, then **Set up**. Setup can make your planning sheets for you.
4.  Click **Allow access** on the tabs the result screen lists, and share the planning sheets with your staff.
5.  Publish the web page (five clicks, listed at the end of setup), save its address in the form, and link it from your department website.

Nobody edits a script or a formula. To add or remove a prefix later, open the same form, change the rows and click **Set up** again.

## How the Parts Fit Together

``` mermaid
flowchart LR
  P1["ANTH course planning<br/>(one tab per year)"] -->|IMPORTRANGE| F
  P2["ARCHY course planning"] -->|IMPORTRANGE| F
  P3["BIO A course planning"] -->|IMPORTRANGE| F
  C["UW course catalog pages<br/>and major option pages"] -->|Scraper.gs, monthly| F
  F["Forecast spreadsheet<br/>Settings, Dashboard, student tab,<br/>admin tabs, TA needs,<br/>Summaries, Conflict Report, Data Check"] -->|Code.gs + Index.html| W["Forecast web page"]
  F -->|Code.gs + ScheduleDashboard.html| S["Schedule view (?page=schedule)"]
  W --> D["Link on the department website"]
```

People type into the planning sheets, the setup form (which writes the **Settings** tab), the Dashboard's year cells and the notice to students. Formulas and scripts fill in everything else.

## Files in This Folder

All ten files (seven scripts and three HTML pages) belong in one Apps Script project, the one you open from the forecast spreadsheet with **Extensions \> Apps Script**. The forecast template already contains them.

| File | What it does |
|------------------------|------------------------------------------------|
| `Settings.gs` | Reads the **Settings** tab, which contains every department-specific value: department name, page subtitle, contact address, prefixes with their planning sheets and catalog pages, major options, Gen Ed codes and option-page phrases. |
| `Setup.gs` | **Forecast setup \> Set up or change settings**: checks the values, makes planning sheets, and rebuilds the admin tabs, combining formulas and Summaries for any number of prefixes. |
| `SetupForm.html` | The setup form. |
| `Code.gs` | Serves the web page and sends it data: `getCourseData` for the course list, `getScheduleData` for the schedule view, `getPageSettings` for the department's names and links. |
| `Index.html` | The student course list, with filters for prefix, quarter, year, Gen Ed, major option and instructor. |
| `ScheduleDashboard.html` | A weekly timetable chart of one quarter, with a "pathway checker" that plots any set of courses together. |
| `Scraper.gs` | `runFullUpdate` reads the UW course catalog pages and the major option pages, and rewrites the `Ref_GenEd` and `Ref_Options` tabs. |
| `Conflict Report Script.gs` | Adds the **Admin Tools** and **Forecast setup** menus. **Run Schedule Validation** checks start times against the UW block schedule and lists overlapping classes in the `Conflict Report` tab. |
| `PlanningRules.gs` | **Admin Tools \> Apply entry rules to planning sheets**: dropdowns, checks and highlights on columns A to S of each planning sheet (see [Entry Rules](#entry-rules)). Setup applies them too. |
| `DataCheck.gs` | **Admin Tools \> Run Data Check**: lists every planning-sheet row that breaks a column rule, with a link to the cell, in the `Data Check` tab (see [Data Check](#data-check)). |

`tests/run.js` is not part of the project. Run it with Node (`node tests/run.js`) after changing a script: it loads all the `.gs` files together, so a syntax error or a name defined in two files shows up before it reaches the live menus. It tests the Data Check rules, the Settings tab layout, the formula builders (against our live formulas in `tests/fixtures/`) and the setup form's helpers.

The setup form was planned, built and tested in November 2026; the plan and its test results are in this folder's git history (`setup-form-plan.md`, removed after the work was done). The points that still matter are in [Notes for Maintainers](#notes-for-maintainers).

## Before You Start

### People and Roles

| Role | In our department | What they do |
|------------------------|------------------------|------------------------|
| Owner | One faculty member | Owns the forecast spreadsheet and the Apps Script project, and runs **Set up**. The web page and the monthly update run under this account. |
| Curriculum coordinator | A faculty member | Enters the plan for each year, answers questions in comments, decides changes. |
| Scheduling staff | Staff who build the UW Time Schedule | Build the Time Schedule from the planning sheets, ask questions in comments, record what they submitted, resolve threads. |
| Faculty | All instructors | Read the planning sheets; some comment. |

The web page and the monthly update both stop working if the owner loses access to the spreadsheets or leaves UW. If your department has an account that outlasts any one person, make it the owner. Only the owner can run **Set up**, because the monthly update belongs to whoever runs it.

### What You Need

- A UW Google account (`@uw.edu`) for everyone involved.
- The [forecast spreadsheet template](https://docs.google.com/spreadsheets/d/1ErYekwI1efEKvXTfGqU2uESB4OeDgVLacdDFhwQ0pEU/copy). The link opens Google's "Make a copy" page; sign in with your UW account first. Google says the attached Apps Script files will be copied too; they are the scripts in this folder.
- Your course prefixes, exactly as the UW catalog writes them. Setup finds each prefix's catalog page in the Seattle catalog index; for a Bothell or Tacoma prefix you type the page yourself.
- For each major option you want shown, the department web page that lists its courses.

## Part 1: Planning Sheets

There is one planning spreadsheet for each course prefix, with one tab per academic year named exactly like `2027-28`.

- **New planning sheets:** in the setup form, choose **Make one for me** for the prefix. Setup copies the [planning sheet template](https://docs.google.com/spreadsheets/d/1Fx3asQB6QjXnjsz0nxGQvF_23SsN_EM66icjySsCxDA/copy) with a tab for each Dashboard year, names it "<prefix> course planning" and puts it in the owner's Drive.
- **Existing planning sheets:** choose **Use this sheet** and paste its address. **Check** confirms it has a tab for each Dashboard year and that columns A to S are in order.

Then share each planning sheet: **Editor** access for the curriculum coordinator and the scheduling staff, and **Commenter** or **Editor** access for other faculty. Setup does not share anything.

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
- **Course time overlap checker tab.** Choose a year in B1 and a quarter in D1 to see each class meeting on a half-hour grid, colored by course level. **Set up** adds the Dashboard years to its B1 dropdown. On a year tab with no courses it shows `#VALUE!`.

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

## Part 3: Setting Up the Forecast

### Make Your Copy

Signed in as the owner account, open the [forecast spreadsheet template](https://docs.google.com/spreadsheets/d/1ErYekwI1efEKvXTfGqU2uESB4OeDgVLacdDFhwQ0pEU/copy) and click **Make a copy**. The copy opens on its **Settings** tab, which is empty until setup.

### Set the Years

On the **Dashboard**, type the current academic year in B4 and the next one in B5 (form `2026-27`), and put an `x` under Autumn, Winter and Spring (columns C to E) for each quarter students should see. In B8 type the year staff are scheduling, with an `x` under each quarter you want. Leave rows 18 to 26 alone: they build the ranges and filters the other tabs use.

Every planning sheet needs a tab named for each of these years. Setup makes them in new planning sheets and checks for them in existing ones.

### Run the Setup Form

1.  Choose **Forecast setup \> Set up or change settings** (the menu appears a few seconds after the spreadsheet opens).
2.  The first time, Google asks for permission. Click **OK**, choose your account, then tick **Select all** before **Continue**. Google lists four permissions, none ticked by default, and setup needs all four:
    - "See, edit, create, and delete all your Google Sheets spreadsheets": to read the planning sheets, make new ones and write the forecast.
    - "Connect to an external service": to read the UW catalog and the major option pages.
    - "Allow this application to run when you are not present": for the monthly catalog update.
    - "Display and run third-party web content in prompts and sidebars inside Google applications": to show the setup form.

    The screen names the project "Conflict Report Script", after one of its files. There is no unverified-app warning inside the UW domain.
3.  Fill in the form:
    - **Department:** the name (the page heading reads "<name> Curriculum Forecast"), the page subtitle and the contact address shown to students.
    - **Prefixes:** one row each, with **Make one for me** or **Use this sheet** and the sheet's address. Leave the catalog page blank; **Check** finds it.
    - **Major options (optional):** a short code (for example MAGH) and the page that lists the option's courses.
    - **Advanced:** the Gen Ed codes, and the phrases that mark core, required and approved course lists on option pages. The defaults match UW Anthropology's pages.
4.  Click **Check**. It changes nothing; it reads the catalog index, each planning sheet's year tabs and columns, and each option page, and lists anything to fix.
5.  Click **Set up** and confirm. It runs the same checks first and stops, before changing anything, if any fails. Then, in about one to three minutes, it:
    - makes the planning sheets you asked for;
    - writes the **Settings** tab;
    - builds one forAdmin tab per prefix and the combining formulas (student tab, TA needs) and **Summaries** for your prefixes;
    - applies the [entry rules](#entry-rules) to each planning sheet's year tabs and adds the years to each overlap checker;
    - puts your contact address in the notice to students (replacing the template's placeholder);
    - creates the monthly catalog update, if there is none;
    - runs the catalog update and the **Data Check**.
6.  Read the result screen:
    - **Allow access needed:** open each tab it lists, click cell B2, and click **Allow access**. Every planning sheet shared only within UW needs this once, even when you own it. Then check that **Current and Next Academic Year** and **TA needs** fill in.
    - **Major options found:** counts such as "MAGH: 3 Core, 0 Reqd, 70 Aprvd". If an option shows 0 Core, open **Advanced**, add the heading its page uses for its core list, and run **Set up** again.
    - **Data Check:** how many rows need fixing; see the **Data Check** tab.

On the first setup, the form offers to delete the template's example tabs (forAdminANTH and the others); leave that ticked. Later, if you remove a prefix, the form asks before deleting its forAdmin tab; its planning sheet is never touched.

Also set **File \> Settings \> Calculation \> Recalculation** to **On change and every minute**, which keeps the imported data fresh.

### Edit the Text Students Read

The page heading, subtitle and contact address come from the form. The rest of the notice to students is in rows 1 to 4 of **Current and Next Academic Year**; edit it there.

## Part 4: Publishing the Web Page

### First Deployment

1.  Close the setup form, then choose **Extensions \> Apps Script**.
2.  Click **Deploy \> New deployment**, click the gear next to **Select type**, and choose **Web app**.
3.  Set **Execute as** to **Me** and **Who has access** to **Anyone within University of Washington**.
4.  Click **Deploy**, approve the permissions, and copy the **Web app URL** (it ends in `/exec`).
5.  Back in the spreadsheet, open **Forecast setup \> Set up or change settings**, paste the address under **Web page address** and click **Save address**. **Open the page** then opens it; add `?page=schedule` to see the schedule view.

"Execute as Me" lets the page read the spreadsheets with the owner's permissions, so students need no spreadsheet access. Visitors must sign in with a UW NetID. Because the page runs as the owner, a visitor could call any script function from the browser console. Every function that changes something, or shows sheet IDs, therefore refuses unless it is run from the spreadsheet itself (a menu, the setup form or the script editor) or by the monthly trigger.

### Updating the Page After Code Changes

Changes to the spreadsheets and to the **Settings** tab need no redeployment. After you edit a script file:

1.  Click **Deploy \> Manage deployments**, select the active deployment, and click the pencil icon.
2.  Under **Version**, choose **New version**, then **Deploy**.

This keeps the same address. **New deployment** would create a new address, and your website link would keep showing the old version.

### Linking From the Department Website

Use the address saved in the form (or **Deploy \> Manage deployments**) so that the link ends in `/exec`. Do not copy it from an email, because email security filters rewrite links into `urldefense.com` redirects. Our page also says: "If you continue to see a blank page, try opening the link in an incognito tab on your browser."

## Yearly and Quarterly Tasks

**When you start planning a new year.** In each planning spreadsheet, duplicate the most recent year tab and rename it (for example `2028-29`). Put the new year on the forecast Dashboard (B5 or B8), then run **Forecast setup \> Set up or change settings** and click **Set up**: it applies the entry rules to the new tabs (the year check depends on each tab's name) and adds the year to each overlap checker. **Admin Tools \> Apply entry rules to planning sheets** does the entry rules alone. Then update column C and revise times and instructors.

**When the next year becomes the current year.** On the forecast Dashboard, change B4 and B5; the student tab and web page follow at once. Change B8 when staff start scheduling the new year; the admin tabs, Summaries, conflict report and schedule view follow it.

**Adding or removing a prefix.** Open the setup form, add or remove the row, and click **Set up**.

**Each quarter, before submitting the Time Schedule.**

1.  In the forecast spreadsheet, choose **Admin Tools \> Run Data Check** and fix the "Fix" rows. Times typed as text or with AM and PM swapped are invisible to the next step.
2.  Choose **Admin Tools \> Run Schedule Validation** and settle each line of the **Conflict Report** with the coordinator, in comments on the planning sheet.
3.  Check **TA needs** and **Summaries** against your TA budget and your balance of course levels.

**Automatic.** On the 1st of each month, `runFullUpdate` refreshes **Ref_GenEd** and **Ref_Options**. If a catalog or option page cannot be read, has no courses, or the new list is under half the old one, the tab is left as it was and the run ends with an error, so Google emails the trigger's owner. If the drop is real (say, an option was removed), clear the tab and run `runFullUpdate` from the script editor.

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

Other lengths are not checked. The times are in lines 83 to 101 of `Conflict Report Script.gs`; check them against the current UW classroom scheduling policy.

**Overlaps.** Within each quarter, it reports two classes that share a day and overlap in time when both are 200-level with different prefixes ("200-Level Conflict"), or both are 300- or 400-level of any prefix ("Upper-Level Overlap"). It counts a day only when the cell contains `X`, and skips courses whose start time is stored as text. The rules are in lines 133 to 141.

### Entry Rules

**Set up** and **Admin Tools \> Apply entry rules to planning sheets** read the planning sheets from the Settings tab and the years from Dashboard B4, B5 and B8, and set these rules on each planning sheet's tab for each year. Re-running it replaces its own rules and leaves other rules, such as the restriction and room dropdowns, alone.

| Column | Rule | If broken |
|--------|------|-----------|
| A | One formula in A1 fills the sort key from column B. Typing in the column brings up a warning. | |
| B | AU, WI or SP | refused |
| C | The tab's first year for AU, its second year for WI and SP | refused |
| D | One of the prefixes on the Settings tab (before setup: capitals, no stray spaces) | refused |
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
| `#REF!` in a forecast tab | The import has not been allowed: click the cell and **Allow access** (every UW-only planning sheet needs this once). Or a Dashboard year does not match a tab name in a planning sheet; **Check** in the setup form says which. |
| **Set up** stopped with a list of problems | It changed nothing. Fix each problem (for example a missing year tab, or a "Use this sheet" row with no address) and click **Set up** again. |
| **Set up** says only the owner can run it | Sign in as the spreadsheet's owner. The monthly update belongs to whoever runs Set up. |
| The form does not open, or the monthly update never runs | A box was left unticked on Google's permission screen. Go to your Google Account's third-party access page, remove "Conflict Report Script", and choose **Forecast setup** again, ticking **Select all**. |
| A course is missing from the web page | Check that the row has a prefix and a course number or title, that column B is exactly `AU`, `WI` or `SP`, that its quarter has an `x` on the Dashboard, and that the row is within the first 200. |
| A course is in the wrong quarter or year | Column B or column C is wrong in the planning sheet (column A fills itself from column B). |
| "Description not found in catalog index." | The course is not in the UW catalog yet. It appears after the catalog lists it and the next monthly update, or run `runFullUpdate` by hand. |
| Option tags missing or wrong | Compare **Ref_Options** with your option pages and adjust the phrases under **Advanced** in the setup form, then **Set up**. |
| Every course of an option is Aprvd | None of the "core" phrases is on that option's page. Add the page's own heading for its core list under **Advanced**. |
| A course is missing from the conflict report | Its times are stored as text, or its day cells contain something other than `X`. **Run Data Check** lists both. |
| A cell will not accept what I type | An entry rule refuses it. Hover over the column heading, or select the cell, to see what it accepts; for a time not known yet, leave it blank. |
| **Admin Tools** or **Forecast setup** menu missing | Reload and wait a few seconds. If it is still missing, check that only one script file defines `onOpen`. |
| Blank web page | Try an incognito window. We suspect being signed in to several Google accounts at once, but have not confirmed it. |
| The website shows an old version | The link points at an old deployment. Copy the address from **Deploy \> Manage deployments**. |

## Notes for Maintainers

**Where the code lives.** This folder is the source. Two Apps Script projects run it: the one bound to the forecast template (script ID `12ykqEKiXTk1nImURrisDVhwfTGQwRdUOcNSEnw8MKUsO7aUaCTeHKCtJ`) and the one bound to our live forecast (script ID `17bpseHvSyMrxPUXpaum4eUBS2DK6Z24e2bc7DIS-vPEK2Q3NqcdQTHvb`). To update either, `clasp clone` it, copy this folder's files over (the clone names scripts `.js`), and `clasp push --force`; for the live page, then make a new version of the existing deployment (Part 4). Menu items and the monthly update always run the newest pushed code; the web page runs only the deployed version.

**Checks before pushing.** Run `node tests/run.js`. After pushing, `clasp clone` again into an empty folder and compare: `clasp push` reports "Script is already up to date" after a file is deleted locally and leaves the file in the project, so a renamed or removed file must also be deleted in the editor.

**What Set up rewrites and what it leaves alone.**

| Set up rewrites on every run | Set up never touches |
|------------------------------|---------------------|
| The Settings tab (from the form) | The Dashboard's years and `x` marks |
| One forAdmin tab per prefix: row 1, columns B to T, and B2 | The notice text, apart from the template's contact placeholder |
| Student tab A6 and K6, TA needs A2 | Planning tabs not named for a Dashboard year |
| The Summaries blocks | Ref_GenEd and Ref_Options (the monthly update owns them) |
| The entry rules on each planning tab for each Dashboard year (only its own rules) | Values typed in planning sheets, except lowercase `x` and `q` in the day columns, which become capitals |
| The Data Check tab; the overlap checker's year list (adds years, removes none) | The Conflict Report, sharing and calculation settings |
| The monthly trigger, if there is none | Planning sheets of removed prefixes (only their forAdmin tab goes, after a tick in the form) |

The combining formulas write each planning sheet's ID as text, in the order of the Settings tab's prefix rows; the course list's order within a quarter follows that order. `tests/fixtures/live-formulas-2026-11-19.json` contains our live formulas from before the change, which the tests use to check the formula builders.

**Google Sheets behaviour the rules depend on** (seen while building them):
- A dropdown rule is case-sensitive: a list of `X, Q` marks a typed `x` invalid, which is why applying the rules capitalises existing day marks.
- In a rule or highlight formula, Sheets evaluates every argument of `AND` and `OR`, and one error (for example `INT("20/20")`) makes the whole formula fail even when another argument is true. Number tests therefore sit inside `IF(ISNUMBER(...))`.
- A pasted value that breaks a rule is kept and marked with a red corner; only typed values are refused. The Data Check finds the rest.
- A copy of the forecast needs **Allow access** for each planning sheet shared only within UW, even when the same person owns both files; a sheet shared with anyone who has the link needs none.
- A planning sheet made with `SpreadsheetApp.create` and `Sheet.copyTo` keeps every rule, highlight, note and formula of the template; only range protections are lost (the entry rules add theirs back). This is why setup needs no Google Drive permission.

## Status for UW Anthropology

As of 19 November 2026:

- **Live forecast:** runs this folder's scripts. Its **Settings** tab lists ANTH, BIO A and ARCHY (in the order of the earlier formulas, so the page order did not change) and was written by **Set up** on 19 November. The web page is deployment version 40 at the same address; before and after the change it listed the same 317 courses, and the Data Check gave the same counts. Version 39 is the fallback.
- **Templates:** the [forecast template](https://docs.google.com/spreadsheets/d/1ErYekwI1efEKvXTfGqU2uESB4OeDgVLacdDFhwQ0pEU/copy) contains this folder's files and a blank **Settings** tab; the [planning template](https://docs.google.com/spreadsheets/d/1Fx3asQB6QjXnjsz0nxGQvF_23SsN_EM66icjySsCxDA/copy) has the entry rules and the **# Readers** and **Enrollment notes** columns. Neither contains course data, comments, instructor names or email addresses. Both are shared with UW as viewer; keep them shared and do not delete them, because "make one for me" copies the planning template.
- **Planning sheets:** the entry rules are on the 2026-27 and 2027-28 tabs of all three. On 18 November the ANTH sheet's old "Template" tab and a stray "2027-2028" tab were deleted (the open comment on the latter was copied into a note on ANTH 444 in the 2027-28 tab); backups made that day are in the owner's Drive.
- **Retired:** the Dashboard's "key for" cells and the named ranges `ANTHkey`, `BIOAkey` and `ARCHYkey` (planning sheet IDs are on the Settings tab and inside the formulas), and two broken `MAGH_` named ranges.

Still to do:

- Fix the "Fix" rows in the Data Check (33 on 19 November), starting with five classes with AM and PM swapped or an end before the start: ANTH 458 and BIO A 344 in autumn 2026, ANTH 466 in spring 2027, BIO A 320 in winter 2028 and ANTH 213 in spring 2028.
- On the department page, replace the `urldefense.com` link with the raw `/exec` address.
- Have a colleague who has not seen the system set up a pretend department from this README alone. The setup form was tested end to end, but only by its author.
