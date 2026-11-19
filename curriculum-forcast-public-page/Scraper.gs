/**
 * SCRAPER V6.0 - BLOCK-BASED INDEXER
 * Captures Gen Ed (NSc, SSc, A&H, DIV) from Header.
 * W: the catalog has no writing-credit marker (a "; W." at the end of a description is the quarter
 *    offered, Winter). The W check below finds nothing and is kept only until a W source is chosen.
 */

/* The monthly update (trigger on the 1st), also run by Set up and by hand from the editor.
   A tab is left as it was when its pages could not all be read, or the new list is much shorter (see
   updateReferenceTab_). Problems end the run with an error, so the trigger's failure email tells the owner. */
function runFullUpdate(e) {
  requireDirectRun_(e);
  const problems = updateReferenceTabs_();
  if (problems.length) throw new Error('Catalog update incomplete: ' + problems.join(' | '));
}

/* Reads the catalog and option pages and rewrites Ref_GenEd and Ref_Options. Returns a list of problems ([] if none).
   allowShrink: true from Set up, where removing a prefix or option is expected to shorten the lists. */
function updateReferenceTabs_(allowShrink) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const problems = [];

  console.log("Starting master block-scrape...");
  const genEd = scrapeMasterGenEd_();
  console.log("Found " + genEd.rows.length + " course blocks.");
  const genEdSheet = getOrCreateSheet_(ss, "Ref_GenEd");
  const genEdProblem = updateReferenceTab_(genEdSheet, ["Course ID", "Gen Ed", "W", "Description"], genEd.rows, genEd.failures, allowShrink);
  if (genEdProblem) problems.push(genEdProblem);

  const options = scrapeMasterOptions_();
  const optionsSheet = getOrCreateSheet_(ss, "Ref_Options");
  const optionsProblem = updateReferenceTab_(optionsSheet, ["Course ID", "Option", "Core", "Reqd", "Aprvd"], options.rows, options.failures, allowShrink);
  if (optionsProblem) problems.push(optionsProblem);

  problems.forEach(function(p) { console.error(p); });
  console.log("Update Complete!");
  return problems;
}

/* Turns the HTML entities the catalog uses back into characters (the catalog writes A&H as A&amp;H). */
function decodeEntities_(text) {
  return String(text)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&');
}

/* One catalog page's HTML as rows: [Course ID, Gen Ed, W, Description]. */
function parseCatalogPage_(html, prefixes, genEdList) {
  const results = [];
  // Split by <b> tag to isolate course entries
  const blocks = html.split(/<b>/i);

  blocks.forEach(block => {
    // Skip blocks that don't look like course headers (must have a number)
    if (!block.match(/\d{3}/)) return;

    // 1. Extract Header (everything before </b>)
    let headerHtml = block.split(/<\/b>/i)[0];
    let headerText = decodeEntities_(headerHtml.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

    // Match Prefix and Number
    let headMatch = headerText.match(/([A-Z\s&]+)\s+(\d+)/);
    if (!headMatch) return;

    let prefix = canonicalPrefix_(headMatch[1].trim(), prefixes); // puts the space back, e.g. BIOA -> BIO A
    let courseNum = headMatch[2];
    let courseID = `${prefix} ${courseNum}`;

    // 2. Extract Gen Ed from Header
    let genEdCodes = [];
    genEdList.forEach(code => {
      if (headerText.includes(code)) genEdCodes.push(code);
    });

    // 3. Extract Description (everything after </b> until next course or end)
    let bodyHtml = block.split(/<\/b>/i)[1] || "";
    let bodyText = bodyHtml.split(/View course details/i)[0] // Stop at MyPlan link
                           .replace(/<br>/gi, '\n')
                           .replace(/<[^>]*>/g, '') // Remove remaining tags
                           .replace(/\s+/g, ' ').trim();

    // 4. W-Credit Check (Look at the tail end of the body text)
    // Checks for "; W" or ". W" or standalone "W"
    let isW = bodyText.match(/[;.]\s*W\s*$/i) ? "TRUE" : "FALSE";

    // Clean "W" out of the description text if found at end
    let cleanDesc = bodyText.replace(/[;.]\s*W\s*$/i, '.').trim();

    results.push([courseID, genEdCodes.join(", "), isW, cleanDesc]);
  });
  return results;
}

/* { rows, failures }: rows from every catalog page; failures names each page that could not be read or had no courses. */
function scrapeMasterGenEd_() {
  // One catalog page per prefix, from the Settings tab.
  const prefixes = settings_().prefixes;
  const catalogs = prefixes.filter(function(p) { return p.catalogUrl; }).map(function(p) { return { prefix: p.prefix, url: p.catalogUrl }; });
  const genEdList = settings_().genEd;

  let results = [];
  const failures = [];

  catalogs.forEach(cat => {
    try {
      const html = UrlFetchApp.fetch(cat.url).getContentText();
      const rows = parseCatalogPage_(html, prefixes, genEdList);
      if (!rows.length) { failures.push(cat.prefix + ' catalog page has no courses (' + cat.url + ')'); return; }
      results = results.concat(rows);
    } catch (e) {
      failures.push(cat.prefix + ' catalog page could not be read (' + e + ')');
    }
  });
  return { rows: results, failures: failures };
}

/* { rows, failures }, as scrapeMasterGenEd_. */
function scrapeMasterOptions_() {
  // Major options, prefixes and heading phrases, from the Settings tab.
  const s = settings_();
  const optionsMap = s.options.map(function(o) { return { name: o.code, url: o.url }; });
  let finalResults = [];
  const failures = [];
  const courseRegex = prefixCoursePattern_(s.prefixes);
  const coreKeywords = phrasePattern_(s.phrases.core);
  const reqdKeywords = phrasePattern_(s.phrases.reqd);
  const aprvdKeywords = phrasePattern_(s.phrases.aprvd);

  optionsMap.forEach(opt => {
    if (!opt.url) { console.warn('Option ' + opt.name + ' has no page address on the Settings tab; skipped.'); return; }
    try {
      const html = UrlFetchApp.fetch(opt.url).getContentText();
      let courseStatusMap = {}; 
      const coreStart = html.search(coreKeywords);
      const reqdStart = html.search(reqdKeywords);
      const aprvdStart = html.search(aprvdKeywords);
      
      let match;
      while ((match = courseRegex.exec(html)) !== null) {
        let prefix = canonicalPrefix_(match[1].toUpperCase().replace(/\s+/g, ' ').trim(), s.prefixes);
        let courseID = `${prefix} ${match[2]}`;
        let pos = match.index;
        if (coreStart !== -1 && pos < coreStart - 200) continue; 
       let type = "Aprvd";
if (coreStart !== -1 && pos >= coreStart) {
  if (aprvdStart !== -1 && pos >= aprvdStart) {
    type = "Aprvd";
  } else if (reqdStart !== -1 && pos >= reqdStart) {
    type = "Reqd";
  } else {
    type = "Core";
  }
}
        if (!courseStatusMap[courseID]) courseStatusMap[courseID] = { Core: false, Reqd: false, Aprvd: false };
        courseStatusMap[courseID][type] = true;
      }
      // Set up only warns about an option page with none of our courses, so this is a note, not a reason to keep the old tab.
      if (!Object.keys(courseStatusMap).length) { console.warn('Option ' + opt.name + ': no courses with our prefixes on ' + opt.url); return; }
      for (let id in courseStatusMap) {
        let s = courseStatusMap[id];
        finalResults.push([id, opt.name, s.Core, s.Reqd, s.Aprvd]);
      }
    } catch (e) {
      failures.push('Option ' + opt.name + ' page could not be read (' + e + ')');
    }
  });
  return { rows: finalResults, failures: failures };
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); SpreadsheetApp.flush(); }
  return sheet;
}

/* Rewrites a reference tab, unless that would lose data: when any page failed, when nothing was found, or when the new
   list is under half the old one. Returns '' when written, or the reason it was left as it was. To accept a real large
   drop, clear the tab and run the update again. */
function updateReferenceTab_(sheet, headers, data, failures, allowShrink) {
  const name = sheet.getName();
  const oldRows = Math.max(0, sheet.getLastRow() - 1);
  if (failures.length) return name + ' left as it was: ' + failures.join('; ');
  if (!data.length) return name + ' left as it was: no courses found.';
  if (!allowShrink && data.length < oldRows / 2) return name + ' left as it was: ' + data.length + ' rows found, under half the ' + oldRows + ' already there.';

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  data.sort((a, b) => a[0].localeCompare(b[0]));
  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  SpreadsheetApp.flush();
  return '';
}
