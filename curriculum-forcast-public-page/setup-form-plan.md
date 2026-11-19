# Plan: One-Form Setup for the Curriculum Forecast

Status, 18 November 2026: the entry rules and the Data Check are built and in use (see [Already Built](#already-built-entry-rules-and-data-check-18-november-2026)). The Settings tab and the form are not built yet.

Goal: a department that copies the forecast template sets the whole system up by filling in one form inside the spreadsheet. Nobody edits a script or a formula. The form replaces Part 4 of the README ("Adapting the Scripts"), the "More or Fewer Than Three Prefixes" section, and most of Parts 1 and 3.

Each claim below is marked **observed** (seen in our files or in a test this session), **documented** (Google's documentation says so) or **untested** (to be checked in Phase 0).

## What a New Department Will Do After the Change

1.  Open the forecast template link and click **Make a copy**.
2.  In the copy, choose **Forecast setup \> Set up or change settings**. Approve Google's permission screen once.
3.  Fill in the form: department name, contact email, and one row per prefix (either "make a planning sheet for me" or the URL of an existing one). Optionally add major options, each with a short code and the page that lists its courses.
4.  Click **Check**, fix anything it flags, then click **Set up**.
5.  If the result screen says so, click **Allow access** on the tabs it names (see Phase 0, test 1).
6.  Follow the five deployment clicks the result screen lists, paste the `/exec` address back into the form, and the form tests it.
7.  Link that address from the department website.

Adding a prefix later means opening the same form, adding a row and clicking **Set up** again.

## What Changes, in Brief

- A new **Settings** tab contains every department-specific value. The scripts read it; nothing department-specific stays in code.
- A new script file, `Setup.gs`, and a new form, `SetupForm.html`, write the Settings tab and rebuild everything that depends on it.
- The existing script and page files lose their Anthropology values (the Part 4 table) and read Settings instead.
- The README shrinks to: make a copy, run the form, deploy, link.

## Facts This Plan Rests On

| Fact | Status | Source |
|------|--------|--------|
| The three scripts find columns by heading name (`getCourseData`, `getScheduleData`, `runScheduleChecks`); only the lists of forAdmin tab names are fixed in code (`Code.gs` 130, `Conflict Report Script.gs` 10). | observed | the code in this folder |
| The catalog-reading function matches course headings with `([A-Z\s&]+)\s+(\d+)` and then turns `BIOA` into `BIO A`; the option-page reader uses `/(ANTH\|ARCHY\|BIO\s?A)\s*(\d{3})/`. | observed | `Scraper.gs` 47 to 50, 90, 106 |
| The UW catalog index lists every prefix with its page, for example `anthro.html` "Anthropology (ANTH)" and `bioanth.html` "Biological Anthropology (BIO&nbsp;A)", with `&nbsp;` for the space. | observed | `https://www.washington.edu/students/crscat/`, fetched 18 Nov 2026 |
| Apps Script can fetch the catalog pages. | observed | the monthly update does it today |
| The combining formulas (student tab A6 and K6, TA needs A2) stack one `QUERY(IMPORTRANGE(<key>, <range>), "select * offset 1", 0)` line per prefix; forAdmin B2 imports one prefix. | observed | `forecast.xlsx` export, 18 Nov 2026 |
| Summaries is one seven-column block per prefix: rows 2 and 3 (year, prefix), row 4 (100, 200, 300, 400, Total), rows 5 to 7 (AU, WI, SP), row 9 (sum), row 10 (percent). Each count is `COUNTUNIQUE(IFERROR(QUERY(forAdmin<P>!$C2:$F1000, "SELECT F WHERE C = '<Q>' AND F LIKE '<L>%'")))`. | observed | same export |
| Summaries R7 in the live sheet reads `forAdminBIOA!$C3` instead of `$C2`, so it skips the first BIO A row. Generated formulas fix this. | observed | same export |
| Named ranges `ANTHkey`, `BIOAkey`, `ARCHYkey` point at Dashboard B14 to B16; `MAGH_sheetrange` and `MAGH_Y_N_col` are broken (`#REF!`). | observed | same export |
| A script can create a time-driven trigger (`ScriptApp.newTrigger`). | documented | Apps Script reference |
| Copying a planning template file from a script needs Drive access (`DriveApp.makeCopy`), a wider permission than Sheets alone. | documented (scope), untested (whether a narrower scope works) | Phase 0, test 3 |
| A script cannot publish a web app without the Apps Script API and a Cloud project; we will not attempt it. | documented | Apps Script API reference |
| Whether a copied spreadsheet owned by the same person still needs **Allow access** for `IMPORTRANGE`, and whether a script can grant it. | untested | Phase 0, test 1 |
| Running a function in a copied spreadsheet's project for the first time shows Google's "Authorization required" screen; each new copy asks again. | observed | template cleanup and scratch-copy runs, 18 Nov 2026 |
| Google's list rule (dropdown) is case-sensitive: a list of `X, Q` marks a typed `x` invalid. | observed | entry rules on the ANTH sheet, 18 Nov 2026 |
| In a rule or highlight formula, Sheets evaluates every argument of `AND` and `OR`, and one error (for example `INT("20/20")`) makes the whole formula fail even when another argument is true. Number tests must sit inside `IF(ISNUMBER(...))`. | observed | Enrollment rule on the ARCHY sheet, 18 Nov 2026 |
| `clasp push` reports "Script is already up to date" after a file is deleted locally, and leaves the file in the project. | observed | template project, 18 Nov 2026 |

## Design

### The Settings Tab

One tab, laid out as labelled blocks so a person can read it, with the form as the normal way to edit it.

| Block | Fields | Used by |
|-------|--------|---------|
| Department | Department name (page heading, browser tab titles), page subtitle, contact email (notice to students) | `Index.html`, `doGet`, notice |
| Prefixes (one row each) | Prefix exactly as the catalog writes it; planning sheet ID; catalog page URL (filled in by the form); order on the page | every script and generated formula |
| Major options (one row each, optional) | Short code; page URL | `Index.html`, the option-page reader |
| Gen Ed codes | Default `NSc, SSc, A&H, DIV` | catalog reader, `Index.html` filter |
| Option-page phrases (advanced, prefilled) | Core phrases; required phrases; approved phrases, one per line | option-page reader |
| Web app | `/exec` address, last tested date | result screen, README link check |
| Setup log | Last run, who ran it, what changed | troubleshooting |

### Ownership: What Setup Writes and Never Touches

| Setup rewrites on every run | Setup never touches |
|------------------------------|---------------------|
| Settings tab (from the form) | Dashboard years and `x` marks (B4, B5, B8, C to E) |
| forAdmin tabs: one per prefix, B2 formula and row 1 headings | The notice text, except the contact address placeholder on first run |
| Student tab A6 and K6, TA needs A2 | Planning tabs not named for a Dashboard year |
| Summaries blocks | Ref_GenEd and Ref_Options (the monthly update owns them) |
| Entry rules on each planning tab for each Dashboard year (only its own rules; other dropdowns stay) | Typed values in planning sheets, except lowercase `x` and `q` in the day columns, which become capitals |
| Data Check tab (rewritten by the Data Check run at the end) | |
| The monthly trigger (exactly one) | Conflict Report (the menu owns it) |
| Named ranges it created | Calculation settings, sharing |

Removing a prefix in the form deletes its forAdmin tab and its line in each combining formula. The form asks for confirmation first, because a deleted forAdmin tab loses its typed row 1. Its planning sheet is not deleted.

### Generated Formulas

- **Sheet IDs go into the formulas as text**, for example `IMPORTRANGE("1abc…", AY1_sheetrange)`, read from the Settings prefix rows. The per-prefix named ranges (`ANTHkey` and so on) and Dashboard rows 14 to 16 are retired. This removes the fixed three slots. Rows 18 to 26 (ranges and quarter filters) and their named ranges stay as they are.
- **Builders are pure functions** in `Setup.gs` that take the prefix list and return formula text: `combineFormula_(prefixes, rangeName)`, `forAdminFormula_(prefix)`, `summariesBlock_(prefix, column)`. Pure functions can be tested in Node with this folder's `tests/run.js`, which already loads every `.gs` file into one sandbox.
- **Tab names** are `forAdmin` plus the prefix with spaces removed (`forAdminBIOA`), as today.

### Prefixes With a Space

One rule replaces the three `BIOA` patches: build a map from each configured prefix with spaces removed (`BIOA`) to the prefix as written (`BIO A`). The catalog reader, the option-page reader and `getScheduleData` look up whatever they read in that map. The option-page pattern is built from the prefix list, allowing optional spaces inside each prefix (`BIO\s*A`).

### Script Changes, File by File

| File | Change |
|------|--------|
| `Code.gs` | New `settings_()` reads the Settings tab once per call; `doGet` takes titles from it; `getScheduleData` loops over the configured prefixes; `getCourseData` returns the page settings (heading, subtitle, catalog links, option links, Gen Ed codes) with the courses; the `BIOA` fallback uses the map. |
| `Scraper.gs` | The catalog list, option list, prefix pattern, Gen Ed codes and phrase lists come from `settings_()`. Function names stay the same, so the existing trigger keeps working. |
| `Conflict Report Script.gs` | The tab list comes from the configured prefixes. `onOpen` adds a second menu, **Forecast setup**. |
| `PlanningRules.gs` (built 18 Nov 2026) | `PLANNING_PREFIXES` and `planningSources_()` read the Settings prefix rows instead of the constant and the Dashboard key cells. |
| `DataCheck.gs` (built 18 Nov 2026) | Same change through `planningSources_()`; nothing else. |
| `Index.html` | Removes `catalogLinks`, `optionLinks`, the fixed heading and the fixed Gen Ed list; builds them from what `getCourseData` returns. |
| `ScheduleDashboard.html` | Builds the prefix dropdown from the settings that `getScheduleData` returns, with the first prefix selected. |
| `Setup.gs` (new) | `openSetupForm`, `checkSettings`, `applySettings`, the formula builders, planning sheet creation, trigger setup, first update and the option summary. |
| `SetupForm.html` (new) | The form, shown as a dialog from the menu. |

**Fallback while Settings is absent:** `settings_()` returns today's Anthropology values when the spreadsheet has no Settings tab. The live forecast therefore keeps working whatever order the code and the tab arrive in (see Phase 5). The fallback is removed after the live cutover.

### The Form

- **Fields:** the Settings blocks above. Prefix rows have an "add row" button and a choice: "make a planning sheet for me" or "use this sheet" (paste a URL; the form extracts the ID).
- **Check** (writes nothing) reports, per prefix:
  - found in the catalog index, and the catalog page it found;
  - planning sheet opens, has a tab named like `2027-28` for each Dashboard year, and row 1 matches columns A to S of the column rules;
  - for each option, the page loads and contains at least one configured course.
- **Set up** writes Settings, then builds or rebuilds the forAdmin tabs, combining formulas and Summaries, applies the entry rules (`applyPlanningRules_`) to each planning sheet's tab for each Dashboard year, creates the trigger if missing, runs the monthly update once, runs the Data Check, and shows the result screen with the Data Check's counts.
- **Result screen:** what changed; per option, counts such as "MAGH: 8 Core, 0 Reqd, 12 Aprvd" so wrong phrases are obvious; any tab that still shows `#REF!`; the deployment steps; a box for the `/exec` address with a **Test** button.

## Already Built: Entry Rules and Data Check (18 November 2026)

These were built ahead of the form, because they help whether or not the form exists:

- `PlanningRules.gs`: **Admin Tools \> Apply entry rules to planning sheets** sets dropdowns, checks and highlights on columns A to S and a self-filling sort key in column A. Safe to re-run; it replaces only its own rules.
- `DataCheck.gs`: **Admin Tools \> Run Data Check** lists every row that breaks a column rule, with a link to the cell, in a **Data Check** tab.
- `tests/run.js`: loads every `.gs` file together and tests the Data Check rules (24 cases). On an export of the real planning tabs, its counts matched an independent count made with a separate script.

Refinements made the same day, after looking at the live sheets: a dropdown of X and Q for the day columns (lowercase marks are changed to capitals first, because the list rule is case-sensitive); a note on each checked column's header saying what it accepts; Enrollment accepts a whole number stored as a number or as text, or a split such as `30/15`; and number tests sit inside `IF(ISNUMBER(...))`, after an error in one part of a rule made correct splits look invalid.

Applied on 18 November to the 2026-27 and 2027-28 tabs of the three live planning sheets and to the planning template, and pushed to both the template's project and the live forecast's project. A Data Check run that evening found 33 values to fix and 107 to check. The form only needs to call these (see The Form) and to take the prefix list from Settings.

## Where the Code Lives and How It Reaches Each Copy

| Copy | Location | How changes reach it |
|------|----------|----------------------|
| Source | this repository folder | edited here, committed when you ask |
| Template project | bound to the forecast template, script ID `12ykqEKiXTk1nImURrisDVhwfTGQwRdUOcNSEnw8MKUsO7aUaCTeHKCtJ` | `clasp push` from a clone; the template's file ID and README links do not change |
| Live project | bound to "Anthropology curriculum forecast", script ID `17bpseHvSyMrxPUXpaum4eUBS2DK6Z24e2bc7DIS-vPEK2Q3NqcdQTHvb` | `clasp push` after you approve it (the entry rules and Data Check went in this way on 18 November); the setup code goes in at Phase 5, then a new deployment version |

Two cautions, both observed this session:
- `clasp push` did not remove a file deleted locally ("Script is already up to date"). Any rename or removal needs the editor's **Delete**, or a stale copy of a function stays behind.
- Apps Script keeps one global namespace, so two files defining `onOpen` conflict. The setup menu goes into the existing `onOpen`.

## Phases

Each phase ends at a stop point where you review before the next begins.

### Phase 0: Short Tests (about half a day)

Each test has a fallback, so a failure changes the form, not the plan.

| # | Test | If it fails |
|---|------|-------------|
| 1 | In a scratch copy of the forecast template, point one prefix at a planning sheet you own and see whether `IMPORTRANGE` asks for **Allow access**. | The result screen names each tab to click, as the README does now. |
| 2 | First-time experience: in a fresh copy, choose the menu item and record what Google shows (consent screen, whether the click must be repeated). | The README and the form's first line describe the extra click. |
| 3 | Copy the planning template from a script with the narrowest permission that works. | The form offers "use this sheet" only, with a link to the planning template. |
| 4 | Confirm which triggers the live project has and under whose account (its script ID is in the table above). | Ask you to read them in the editor's **Triggers** page. |
| 5 | Look up ANTH, ARCHY, BIO A, GEOG and one more prefix with a space in the catalog index from Apps Script. | The form asks for the catalog URL by hand. |

Stop point: you see the results table and choose the fallbacks.

### Phase 1: Settings Tab and Script Refactor (about one day)

- Add `settings_()` with the fallback, and change the files as in the table above.
- Extend `tests/run.js`: prefix map, prefix pattern, settings parsing.
- Push to the template project only. In a scratch copy of the template with a Settings tab filled with our three prefixes, check that the page, schedule view, conflict report and monthly update give the same output as the live system on the same day.

Stop point: you open the scratch copy's page and compare.

### Phase 2: Formula Builders and an Apply Function (about one day)

- Write the builders and `applySettings` (no form yet; run from the editor).
- Node tests: for ANTH, BIO A and ARCHY in the live order, the builders reproduce A6, K6, TA needs A2, each forAdmin B2 and every Summaries formula in `forecast.xlsx`, except R7 (fixed on purpose) and the sheet IDs written as text instead of named ranges.
- Run `applySettings` in the scratch copy with four prefixes, then with one, and check that every tab fills in.

Stop point: you review the generated formulas against the live ones.

### Phase 3: The Form (about one day)

- `SetupForm.html` with **Check** and **Set up**, planning sheet creation (if test 3 passed), trigger creation, first update, result screen and `/exec` test.
- Menu item in `onOpen`.

Stop point: you click through the form in a scratch copy.

### Phase 4: Template Refresh and the Dry Run (about half a day, plus the tester's time)

- Check that **Set up** applies the entry rules to a planning sheet it created and to one it was given, and that the Data Check runs at the end.
- Push to the template project, set its Settings tab to placeholders, and repeat the leftover-data check used on 18 November (export, search for real IDs, addresses, names, comments).
- **Dry run as a new department**, ideally by a colleague who has not seen the system: one prefix with a space, more than three prefixes, and no options, all non-Anthropology. This is also the end-to-end test the guide has never had.

Stop point: you read the tester's notes; fixes loop back to Phase 3.

### Phase 5: Live Cutover (about two hours, with you present)

Order matters, because the monthly trigger runs the newest saved code and the menu items do too, while the web page stays on version 39 until redeployed.

1.  Name a version of the live spreadsheet in **File \> Version history**, export it, and record today's course count on the live page.
2.  Add the Settings tab to the live spreadsheet, filled with ANTH, ARCHY and BIO A and their current sheet IDs, before any new code arrives. (With the fallback in place this is a second safeguard.)
3.  Push the new code to the live project. If Google asks for permission again (new scopes for Drive or triggers), you approve it.
4.  Run **Check** in the live form; run **Set up** only after you agree, since it rewrites the combining formulas (and fixes R7).
5.  Deploy a new version of the existing deployment (Part 5 of the README), at the same address.
6.  Check the live page lists the same courses as in step 1, the schedule view loads, and **Run Schedule Validation** gives the same report.
7.  Confirm exactly one monthly trigger exists.

If step 6 fails: redeploy version 39 (the page returns at once), restore the named version, and push the previous code.

### Phase 6: README and Cleanup (about half a day)

- Rewrite the README around the new steps; remove Part 4 and the formula-editing sections.
- Remove the Anthropology fallback from `settings_()`, the retired named ranges and Dashboard rows 14 to 16.
- Commit when you ask.

## Steps Only You Can Do

- Approve Google's permission screens (Phase 0 tests, Phase 5 step 3).
- Choose the Phase 0 fallbacks and approve each stop point.
- Find the dry-run tester.
- Be present for the live cutover and approve **Set up** on the live spreadsheet.
- Deploy new web app versions on the live project, or watch me do it.

## Acceptance Checks

- Node tests pass, including formula equality with the 18 November export.
- In a scratch copy, the page, schedule view and conflict report match the live system on the same day.
- The dry run succeeds without the tester editing a script or a formula.
- After cutover, the live page lists the same courses as before it, at the same address.
- The template contains no Anthropology data, comments or addresses (same export search as 18 November).

## Risks

| Risk | Mitigation |
|------|------------|
| The live trigger or a menu item runs new code before the Settings tab exists. | Fallback in `settings_()`; Settings tab added before the push. |
| Wider permissions (Drive) worry users at the consent screen. | Phase 0 test 3; keep "make a planning sheet" optional. |
| A stale file survives in a project after a rename. | Delete in the editor and confirm with a fresh `clasp clone`, as on 18 November. |
| Option-page phrases do not fit another department's pages. | Result screen shows per-option counts; phrases are editable in the form. |
| Removing a prefix deletes a forAdmin tab someone customised. | Confirmation step; row 1 headings are regenerated, so nothing else is lost. |

## Open Questions for You

1.  Retire the Dashboard key cells and named ranges in favour of the Settings tab? (Recommended: yes; it removes the three-prefix limit.)
2.  Offer "make a planning sheet for me", which needs Drive permission? (Recommended: yes, if Phase 0 test 3 shows a clean consent screen.)
3.  Who can do the Phase 4 dry run?
4.  Should the form also share each new planning sheet with listed staff addresses, or leave sharing to the README?
