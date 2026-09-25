/**
 * SCRAPER V6.0 - BLOCK-BASED INDEXER
 * Captures Gen Ed (NSc, SSc, A&H, DIV) from Header.
 * Captures W-Credit from the end of Description.
 */

function runFullUpdate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const genEdSheet = getOrCreateSheet(ss, "Ref_GenEd");
  const optionsSheet = getOrCreateSheet(ss, "Ref_Options");
  
  console.log("Starting master block-scrape...");
  const genEdData = scrapeMasterGenEd();
  console.log("Found " + genEdData.length + " course blocks.");
  safeUpdateSheet(genEdSheet, ["Course ID", "Gen Ed", "W", "Description"], genEdData);
  
  const optionsData = scrapeMasterOptions();
  safeUpdateSheet(optionsSheet, ["Course ID", "Option", "Core", "Reqd", "Aprvd"], optionsData);
  console.log("Update Complete!");
}

function scrapeMasterGenEd() {
  const catalogs = [
    { prefix: "ANTH", url: "https://www.washington.edu/students/crscat/anthro.html" },
    { prefix: "ARCHY", url: "https://www.washington.edu/students/crscat/archeo.html" },
    { prefix: "BIO A", url: "https://www.washington.edu/students/crscat/bioanth.html" }
  ];
  
  let results = [];

  catalogs.forEach(cat => {
    try {
      let html = UrlFetchApp.fetch(cat.url).getContentText();
      // Split by <b> tag to isolate course entries
      let blocks = html.split(/<b>/i);

      blocks.forEach(block => {
        // Skip blocks that don't look like course headers (must have a number)
        if (!block.match(/\d{3}/)) return;

        // 1. Extract Header (everything before </b>)
        let headerHtml = block.split(/<\/b>/i)[0];
        let headerText = headerHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Match Prefix and Number
        let headMatch = headerText.match(/([A-Z\s&]+)\s+(\d+)/);
        if (!headMatch) return;

        let prefix = headMatch[1].trim();
        if (prefix === "BIOA") prefix = "BIO A";
        let courseNum = headMatch[2];
        let courseID = `${prefix} ${courseNum}`;

        // 2. Extract Gen Ed from Header
        let genEdCodes = [];
        ["NSc", "SSc", "A&H", "DIV"].forEach(code => {
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
    } catch (e) { console.error("Error on " + cat.prefix + ": " + e); }
  });
  return results;
}

function scrapeMasterOptions() {
  const optionsMap = [
    { name: "MAGH", url: "https://anthropology.washington.edu/medical-anthropology-global-health-ba" },
    { name: "GLOB", url: "https://anthropology.washington.edu/anthropology-globalization-ba" },
    { name: "ASCI", url: "https://anthropology.washington.edu/archaeological-sciences-ba" },
    { name: "HEB",  url: "https://anthropology.washington.edu/human-evolutionary-biology-ba" },
    { name: "INDG", url: "https://anthropology.washington.edu/indigenous-archaeology-ba" }
  ];
  let finalResults = [];
  const courseRegex = /(ANTH|ARCHY|BIO\s?A)\s*(\d{3})/gi;
const coreKeywords = /Core Coursework|Core Requirements|Required Coursework|Required Core|ASc core list/i;
const reqdKeywords = /Specific Courses Required|Choose one|Select from|one of the following|Choose from|Students are required to take two of the courses/i;
const aprvdKeywords = /Approved Electives|Elective Courses|approved elective list|department-approved list|15 credits from the department approved elective list|15 credits from the following|credits from approved IA core list|credits from the department approved list/i;

  optionsMap.forEach(opt => {
    try {
      const html = UrlFetchApp.fetch(opt.url).getContentText();
      let courseStatusMap = {}; 
      const coreStart = html.search(coreKeywords);
      const reqdStart = html.search(reqdKeywords);
      const aprvdStart = html.search(aprvdKeywords);
      
      let match;
      while ((match = courseRegex.exec(html)) !== null) {
        let prefix = match[1].toUpperCase().replace(/\s+/g, ' ').trim();
        if (prefix === "BIOA") prefix = "BIO A";
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
      for (let id in courseStatusMap) {
        let s = courseStatusMap[id];
        finalResults.push([id, opt.name, s.Core, s.Reqd, s.Aprvd]);
      }
    } catch (e) { console.error(e); }
  });
  return finalResults;
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); SpreadsheetApp.flush(); }
  return sheet;
}

function safeUpdateSheet(sheet, headers, data) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  if (data.length > 0) {
    data.sort((a, b) => a[0].localeCompare(b[0]));
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
  SpreadsheetApp.flush();
}