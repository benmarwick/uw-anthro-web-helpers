/**
 * TA Application Allocation Workflow & Evaluation Parser
 * Implements ASE Appointment Document Guidelines for the Anthropology Department
 *
 * Ranking logic follows Part I, Sections C and D:
 *
 *   PRE-SORT — Credential Strength (C.1 quality distinction):
 *     "satisfies requirements of" > "relevant to requirements of"
 *     Applied before all C.2–C.5 criteria in the open pool sort.
 *
 *   SECTION C (Automatic - applied in strict order after credential strength):
 *     C.2 - Guaranteed funding students rank above non-guaranteed students
 *     C.3 - Within each C.2 tier: students with ≤5 TA/RA quarters have
 *            priority over those with ≥6
 *     C.4 - Within the ≤5 group: seniority applied
 *     C.5 - Within the ≥6 group: seniority applied
 *
 *   SECTION D (Additional - applied only to break ties within the same C-rank):
 *     D.1 - Evidence of readiness (Teaching@UW attendance)
 *     D.2 - Teaching excellence (mean ACM score from OEA evaluations)
 *     D.3 - Academic merit from CV (flagged for manual review)
 *     D.4 - Unofficial transcripts (flagged for manual review)
 *
 *   Final tiebreaker: application timestamp (earlier = higher priority)
 *
 *   PASS 1B — Displacement of open-pool applicants (ASE Part I, Sections I.A & I.B):
 *     After standard Pass 1, any funded student still unplaced is given a
 *     second attempt. For each such student, the script scans courses in their
 *     quarter where they are eligible and at least one slot is held by an
 *     open-pool applicant whom the funded student outranks under the full
 *     C→D sort. The lowest-ranked open-pool applicant in the best available
 *     course is displaced, and the funded student takes their slot.
 *     Displaced applicants are flagged in the output as "Displaced (Funded Student Accommodation)".
 */

// --- CONFIGURATION ---
const CONFIG = {
  FORM_SHEET_NAME: "Form Responses 1",
  FORECAST_SPREADSHEET_ID: "1KTLT-PZzRjaZYCOdWGMEfAcZwEjby1mhXWoJMnUF8E0",
  FORECAST_SHEET_NAME: "TA needs",
  OUTPUT_SHEET_NAME: "Ranked_Applicants",
  QUARTER_FUNDING_MAP: {
    "AU": "Do you have guaranteed funding for AUT26?",
    "WI": "Do you have guaranteed funding for WIN27?",
    "SP": "Do you have guaranteed funding for SPR27?"
  },
  FIELD_MATCH_MAP: {
    "ARCHY": "Archaeology PhD",
    "ANTH":  "Sociocultural PhD",
    "BIOA":  "Biological Anthropology PhD"
  },
  SUBDISCIPLINE_ORDER: {
    "Archaeology PhD":             1,
    "Biological Anthropology PhD": 2,
    "Sociocultural PhD":           3
  },
  CREDENTIAL_STRENGTH: {
    SATISFIES: 2,
    RELEVANT:  1,
    NONE:      0
  }
};

// --- CUSTOM MENU ---
function onOpen() {
  SpreadsheetApp.getUi().createMenu('TA Allocation').addItem('1. Extract Evaluation Scores', 'processEvaluationsColumn').addItem('2. Run Ranking Workflow', 'mainWorkflow').addToUi();
}

// ==========================================
// FEATURE 1: EVALUATION PROCESSING (COLUMN AA)
// ==========================================

function processEvaluationsColumn() {
  const ui    = SpreadsheetApp.getUi();
  const db    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = db.getSheetByName(CONFIG.FORM_SHEET_NAME);

  if (!sheet) {
    ui.alert("Error", "Could not find the Form Responses sheet. Check CONFIG.", ui.ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const headers      = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const evalColIndex = headers.findIndex(
    h => h.toString().includes("Upload your OEA/Faculty Evaluations")
  ) + 1;

  if (evalColIndex === 0) {
    ui.alert("Error", "Could not find the evaluations column header.", ui.ButtonSet.OK);
    return;
  }

  const urlData      = sheet.getRange(2, evalColIndex, lastRow - 1, 1).getValues();
  const outputValues =[];

  for (let i = 0; i < urlData.length; i++) {
    const url = urlData[i][0];
    let outputText = "";

    if (url && typeof url === 'string' && url.trim() !== "") {
      const fileId = extractDriveIdFromUrl(url);
      if (fileId) {
        try {
          const parsedEvals = parseEvaluationsPDF(fileId);
          if (parsedEvals.length > 0) {
            let sum = 0, validCount = 0;
            parsedEvals.forEach(e => {
              if (e.adjustedMedian !== null && !isNaN(e.adjustedMedian)) {
                sum += e.adjustedMedian;
                validCount++;
              }
            });
            if (validCount > 0) {
              const mean = parseFloat((sum / validCount).toFixed(2)).toString();
              outputText = `Mean ACM ${mean} from ${validCount} evaluations`;
            } else {
              outputText = "No ACM scores found in document";
            }
          } else {
            outputText = "No evaluations parsed (explanatory document?)";
          }
        } catch (error) {
          outputText = "Error parsing file: " + error.message;
        }
      } else {
        outputText = "Invalid Google Drive URL";
      }
    } else {
      outputText = "No URL provided";
    }
    outputValues.push([outputText]);
  }

  const targetColIndex = 27;
  sheet.getRange(1, targetColIndex).setValue("Evaluation Summary (Auto)");
  sheet.getRange(2, targetColIndex, outputValues.length, 1).setValues(outputValues);
  ui.alert("Success", "Evaluation extraction complete. Check Column AA.", ui.ButtonSet.OK);
}

function parseEvaluationsPDF(pdfFileId) {
  const pdfBlob     = DriveApp.getFileById(pdfFileId).getBlob();
  const resource    = { title: "Temp_OCR_Document", mimeType: MimeType.GOOGLE_DOCS };
  const tempDocFile = Drive.Files.create(resource, pdfBlob);
  const tempDoc     = DocumentApp.openById(tempDocFile.id);
  const fullText    = tempDoc.getBody().getText();
  DriveApp.getFileById(tempDocFile.id).setTrashed(true);
  return extractDataFromText(fullText);
}

function extractDataFromText(text) {
  const results =[];
  const chunks  = text.split(/Term:/i);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.includes("Overall Summative Rating")) continue;
    let evalData      = { adjustedMedian: null };
    const medianMatch = chunk.match(/(\d\.\d)[\s\n]+(\d\.\d)[\s\n]*\(0=lowest;\s*5=highest\)/i);
    if (medianMatch) evalData.adjustedMedian = parseFloat(medianMatch[2]);
    results.push(evalData);
  }
  return results;
}

function extractDriveIdFromUrl(url) {
  const idMatch = url.match(/id=([-\w]{25,})/);
  if (idMatch) return idMatch[1];
  const dMatch = url.match(/\/d\/([-\w]{25,})/);
  if (dMatch) return dMatch[1];
  return null;
}


// ==========================================
// FEATURE 2: RANKING WORKFLOW
// ==========================================

function mainWorkflow() {
  const ui = SpreadsheetApp.getUi();
  try {
    const db = SpreadsheetApp.getActiveSpreadsheet();
    const applicantsSheet = db.getSheetByName(CONFIG.FORM_SHEET_NAME);
    if (!applicantsSheet) throw new Error("Could not find the Form Responses sheet.");

    const forecastDb    = SpreadsheetApp.openById(CONFIG.FORECAST_SPREADSHEET_ID);
    const forecastSheet = forecastDb.getSheetByName(CONFIG.FORECAST_SHEET_NAME);
    if (!forecastSheet) throw new Error("Could not find the 'TA needs' tab in the forecast workbook.");

    const rawApplicants = fetchSheetData(applicantsSheet);
    const rawForecast   = fetchSheetData(forecastSheet);

    const forecast = parseForecast(rawForecast);
    
    // Identify unlisted courses dynamically by checking what courses actually appeared in the Form
    const listedCoursesSet = extractAllListedCourses(rawApplicants);
    const unlistedCourses = forecast
      .filter(c => !listedCoursesSet.has(c.normalizedCode))
      .map(c => c.normalizedCode);

    const applicants = parseApplicants(rawApplicants, applicantsSheet, unlistedCourses);

    const { rankedResults, warnings, displacements } = allocateApplicants(applicants, forecast);

    writeResultsToSheet(db, rankedResults);
    writeSummarySheet(db, rankedResults, warnings, displacements);

    ui.alert(
      'Success',
      'Applicant ranking complete. Check the "Ranked_Applicants" and "Allocation_Summary" sheets.',
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('Error', error.message, ui.ButtonSet.OK);
  }
}

function fetchSheetData(sheet) {
  if (!sheet) throw new Error("A required sheet was not found. Please check sheet names.");
  const data    = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => { obj[header.toString().trim()] = row[i]; });
    return obj;
  });
}

function normalizeCourseCode(prefix, number) {
  if (!prefix || !number) return "";
  return (prefix.toString() + number.toString()).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function extractPrefix(normalizedCode) {
  const match = normalizedCode.match(/^(ARCHY|BIOA|ANTH)/i);
  return match ? match[1].toUpperCase() : null;
}

function readEvalSummaries(sheet) {
  const headers       = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const emailColIndex = headers.findIndex(h => h.toString().toLowerCase().includes("email"));
  const evalColIndex  = headers.findIndex(h => h.toString().includes("Evaluation Summary (Auto)"));
  if (emailColIndex === -1 || evalColIndex === -1) return {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const emailData = sheet.getRange(2, emailColIndex + 1, lastRow - 1, 1).getValues();
  const evalData  = sheet.getRange(2, evalColIndex  + 1, lastRow - 1, 1).getValues();
  const map = {};
  for (let i = 0; i < emailData.length; i++) {
    const email   = (emailData[i][0] || "").toString().trim().toLowerCase();
    const evalStr = (evalData[i][0]  || "").toString().trim();
    if (!email) continue;
    const match = evalStr.match(/Mean ACM\s+([\d.]+)/i);
    map[email] = match ? parseFloat(match[1]) : null;
  }
  return map;
}

function readManualReviewFlags(sheet) {
  const headers            = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const emailColIndex      = headers.findIndex(h => h.toString().toLowerCase().includes("email"));
  const cvColIndex         = headers.findIndex(h => /cv|curriculum vitae|resume/i.test(h.toString()));
  const transcriptColIndex = headers.findIndex(h => /transcript/i.test(h.toString()));
  if (emailColIndex === -1) return {};
  const lastRow        = sheet.getLastRow();
  if (lastRow < 2) return {};
  const numRows        = lastRow - 1;
  const emailData      = sheet.getRange(2, emailColIndex + 1, numRows, 1).getValues();
  const cvData         = cvColIndex         !== -1 ? sheet.getRange(2, cvColIndex         + 1, numRows, 1).getValues() : null;
  const transcriptData = transcriptColIndex !== -1 ? sheet.getRange(2, transcriptColIndex + 1, numRows, 1).getValues() : null;
  const map = {};
  for (let i = 0; i < emailData.length; i++) {
    const email = (emailData[i][0] || "").toString().trim().toLowerCase();
    if (!email) continue;
    map[email] = {
      cvSubmitted:         cvData         ? !!(cvData[i][0]         || "").toString().trim() : null,
      transcriptSubmitted: transcriptData ? !!(transcriptData[i][0] || "").toString().trim() : null
    };
  }
  return map;
}

function extractAllListedCourses(rawApplicants) {
  const listed = new Set();
  const satisfiesRegex = /(.*?)\(satisfies requirements of ([^)]+)\)/g;
  const relevantRegex  = /(.*?)\(relevant to requirements of ([^)]+)\)/g;

  rawApplicants.forEach(row => {
    const criteriaStr = (row["Choose *ALL* criteria that you meet to make you eligible to TA for as many courses as possible, then add any additional details in the next question"] || "").toString();
    
    let m;
    satisfiesRegex.lastIndex = 0;
    relevantRegex.lastIndex = 0;

    while ((m = satisfiesRegex.exec(criteriaStr)) !== null) {
      m[2].split(/,| and /).forEach(c => {
        const cMatch = c.match(/(ANTH|ARCHY|BIO ?A)\s*(\d{3}(?:\/\d{3})?[A-Z]?)/i);
        if (cMatch) cMatch[2].split('/').forEach(p => listed.add(normalizeCourseCode(cMatch[1], p)));
      });
    }
    while ((m = relevantRegex.exec(criteriaStr)) !== null) {
      m[2].split(/,| and /).forEach(c => {
        const cMatch = c.match(/(ANTH|ARCHY|BIO ?A)\s*(\d{3}(?:\/\d{3})?[A-Z]?)/i);
        if (cMatch) cMatch[2].split('/').forEach(p => listed.add(normalizeCourseCode(cMatch[1], p)));
      });
    }
  });
  return listed;
}

// ==========================================
// CREDENTIAL STRENGTH PARSING
// ==========================================

function parseEligibilityMap(criteriaStr, taCols) {
  const map = {};

  function upsert(normCode, strength, strengthLabel, reason) {
    if (!normCode) return;
    if (!map[normCode]) {
      map[normCode] = { strength, strengthLabel, reasons:[] };
    } else if (strength > map[normCode].strength) {
      map[normCode].strength      = strength;
      map[normCode].strengthLabel = strengthLabel;
    }
    if (reason && !map[normCode].reasons.includes(reason)) {
      map[normCode].reasons.push(reason);
    }
  }

  taCols.forEach(taStr => {
    const str = (taStr || "").toString().trim().toUpperCase();
    if (!str || str === "N/A" || str === "NA") return;
    const match = str.match(/(ANTH|ARCHY|BIO ?A)\s*(\d{3})/);
    if (match) {
      upsert(
        normalizeCourseCode(match[1], match[2]),
        CONFIG.CREDENTIAL_STRENGTH.SATISFIES,
        "Prior TA History",
        `Prior TA History: ${str}`
      );
    }
  });

  const satisfiesRegex = /(.*?)\(satisfies requirements of ([^)]+)\)/g;
  let m;
  while ((m = satisfiesRegex.exec(criteriaStr)) !== null) {
    let reasonText      = m[1].replace(/^[\s,.]+|[\s,.]+$/g, '').replace(/^(or[\s,]+)+/i, '');
    const fullStatement = `${reasonText} (satisfies requirements of ${m[2]})`;
    m[2].split(/,| and /).forEach(c => {
      const cMatch = c.match(/(ANTH|ARCHY|BIO ?A)\s*(\d{3}(?:\/\d{3})?[A-Z]?)/i);
      if (!cMatch) return;
      cMatch[2].split('/').forEach(p => {
        upsert(
          normalizeCourseCode(cMatch[1], p),
          CONFIG.CREDENTIAL_STRENGTH.SATISFIES,
          "Satisfies",
          fullStatement
        );
      });
    });
  }

  const relevantRegex = /(.*?)\(relevant to requirements of ([^)]+)\)/g;
  while ((m = relevantRegex.exec(criteriaStr)) !== null) {
    let reasonText      = m[1].replace(/^[\s,.]+|[\s,.]+$/g, '').replace(/^(or[\s,]+)+/i, '');
    const fullStatement = `${reasonText} (relevant to requirements of ${m[2]})`;
    m[2].split(/,| and /).forEach(c => {
      const cMatch = c.match(/(ANTH|ARCHY|BIO ?A)\s*(\d{3}(?:\/\d{3})?[A-Z]?)/i);
      if (!cMatch) return;
      cMatch[2].split('/').forEach(p => {
        upsert(
          normalizeCourseCode(cMatch[1], p),
          CONFIG.CREDENTIAL_STRENGTH.RELEVANT,
          "Relevant To",
          fullStatement
        );
      });
    });
  }

  return map;
}

function getCredentialStrength(applicant, normalizedCode) {
  const entry = applicant.eligibilityMap[normalizedCode];
  return entry ? entry.strength : CONFIG.CREDENTIAL_STRENGTH.NONE;
}

function getCredentialStrengthLabel(applicant, normalizedCode) {
  const entry = applicant.eligibilityMap[normalizedCode];
  if (!entry) return "None";
  return entry.strengthLabel;
}


// ==========================================
// APPLICANT PARSING
// ==========================================

function parseApplicants(rawApplicants, sheet, unlistedCourses) {
  const evalSummaries     = readEvalSummaries(sheet);
  const manualReviewFlags = readManualReviewFlags(sheet);

  return rawApplicants.map(row => {
    const academicAlert = row["Have you been informed in writing by your advisor or the Graduate Program Coordinator that you are on 'Academic Notification', 'Academic Alert', or 'Final Academic Alert' status?"];
    const isEligible    = !(academicAlert || "").toString().toUpperCase().includes("YES");

    const seniorityStr = row["What is your seniority, as defined by your progress through the program? (cf. ASE Part 1-A-4)"] || "";
    let seniorityScore = 1;
    if (seniorityStr.includes("PhD Candidate"))       seniorityScore = 3;
    else if (seniorityStr.includes("Obtained UW MA")) seniorityScore = 2;

    const taCols =[
      row["List your most recent TA position in this exact form: AU25 ANTH 101"],
      row["List your second most recent TA position in this exact form: AU25 ANTH 101"],
      row["List your third most recent TA position in this exact form: AU25 ANTH 101"],
      row["List your fourth most recent TA position in this exact form: AU25 ANTH 101"],
      row["List your fifth most recent TA position in this exact form: AU25 ANTH 101"]
    ];
    const taCount   = taCols.filter(t => {
      const s = (t || "").toString().trim().toUpperCase();
      return s && s !== "N/A" && s !== "NA";
    }).length;
    const under5TAs = taCount < 5;

    const criteriaStr    = row["Choose *ALL* criteria that you meet to make you eligible to TA for as many courses as possible, then add any additional details in the next question"] || "";
    const eligibilityMap = parseEligibilityMap(criteriaStr, taCols);

    // Inject unlisted courses to ensure baseline eligibility for accommodation
    unlistedCourses.forEach(uc => {
      if (!eligibilityMap[uc]) {
        eligibilityMap[uc] = {
          strength: CONFIG.CREDENTIAL_STRENGTH.NONE,
          strengthLabel: "None (Unlisted)",
          reasons:["Unlisted course: administrative baseline eligibility"]
        };
      }
    });

    const readiness = (row["Teaching@UW: Strategies for TAs:"] || "").toString().toUpperCase();
    const isReady   = readiness.includes("YES") || readiness.includes("INTEND TO COMPLETE");

    const email       = (row["Email Address"] || "").toString().trim().toLowerCase();
    const acmScore    = evalSummaries[email] !== undefined ? evalSummaries[email] : null;
    const reviewFlags = manualReviewFlags[email] || { cvSubmitted: null, transcriptSubmitted: null };

    return {
      timestamp:           new Date(row["Timestamp"]),
      name:                `${row["First Name:"]} ${row["Last Name:"]}`,
      email:               row["Email Address"],
      program:             row["Which program are you in?"],
      isEligible,
      guaranteedFunding: {
        "AU": (row[CONFIG.QUARTER_FUNDING_MAP["AU"]] || "").toString().toUpperCase() === "YES",
        "WI": (row[CONFIG.QUARTER_FUNDING_MAP["WI"]] || "").toString().toUpperCase() === "YES",
        "SP": (row[CONFIG.QUARTER_FUNDING_MAP["SP"]] || "").toString().toUpperCase() === "YES"
      },
      seniorityScore,
      seniorityText:       seniorityStr,
      taCount,
      under5TAs,
      eligibleCourses:     Object.keys(eligibilityMap),
      eligibilityMap,
      isReady,
      acmScore,
      cvSubmitted:         reviewFlags.cvSubmitted,
      transcriptSubmitted: reviewFlags.transcriptSubmitted
    };
  });
}

function parseForecast(rawForecast) {
  return rawForecast.map(row => ({
    quarter:        row["Quarter"],
    year:           row["Year"],
    prefix:         row["Prefix"],
    courseNum:      row["Course #"],
    normalizedCode: normalizeCourseCode(row["Prefix"], row["Course #"]),
    title:          row["Title"],
    tasNeeded:      Number(row["# TAs"]) || 1
  })).filter(c => c.normalizedCode !== "");
}


// ==========================================
// SORT FUNCTIONS
// ==========================================

/**
 * RANKING - SECTION C: Automatic Ranking Criteria for Teaching Assistantships
 * Implements ASE Part I, Section C.2 → C.3 → C.4/C.5 hierarchy.
 *
 * Splits pool into four buckets based on funding and prior TA quarters,
 * sorts each internally by seniority (progress in program), then application timestamp,
 * and concatenates them in priority order.
 */
function sortBySectionC(pool, quarter) {
  
  // RANKING - ASE Part I, Section C.4 & C.5: Apply seniority (progress in program)
  const senioritySortFn = (a, b) => {
    if (a.seniorityScore !== b.seniorityScore) return b.seniorityScore - a.seniorityScore;
    
    // Fallback sorting strictly by timestamp for those with identical rankings
    return a.timestamp.getTime() - b.timestamp.getTime();
  };

  // RANKING - ASE Part I, Section C.2: Split by Guaranteed Funding 
  // RANKING - ASE Part I, Section C.3: Split by Prior TA Quarters (<5 quarters vs >=6 quarters)
  const guaranteedA    = pool.filter(a =>  a.guaranteedFunding[quarter] &&  a.under5TAs);
  const guaranteedB    = pool.filter(a =>  a.guaranteedFunding[quarter] && !a.under5TAs);
  const nonGuaranteedA = pool.filter(a => !a.guaranteedFunding[quarter] &&  a.under5TAs);
  const nonGuaranteedB = pool.filter(a => !a.guaranteedFunding[quarter] && !a.under5TAs);

  [guaranteedA, guaranteedB, nonGuaranteedA, nonGuaranteedB].forEach(g => g.sort(senioritySortFn));

  guaranteedA.forEach(a    => { a._cRankGroup = "A (≤5 quarters)"; });
  guaranteedB.forEach(a    => { a._cRankGroup = "B (≥6 quarters)"; });
  nonGuaranteedA.forEach(a => { a._cRankGroup = "A (≤5 quarters)"; });
  nonGuaranteedB.forEach(a => { a._cRankGroup = "B (≥6 quarters)"; });

  return[...guaranteedA,...guaranteedB,...nonGuaranteedA,...nonGuaranteedB];
}

/**
 * TIE-BREAKING - SECTION D: Additional Ranking Criteria
 * Implements ASE Part I, Section D.
 * 
 * This is applied as a tiebreaker only. It preserves all C-tier ordering,
 * and only re-orders applicants who are fully tied at the Section C level.
 */
function applySectionDTiebreakers(cSortedPool, quarter) {
  const compareBoolFlag = (a, b) => {
    if (a === b) return 0;
    if (a === true)  return -1;
    if (b === true)  return  1;
    if (a === false) return -1;
    return 1;
  };
  const compareAcm = (a, b) => {
    if (a === b) return 0;
    if (a === null) return  1;
    if (b === null) return -1;
    return b - a;
  };

  return cSortedPool.slice().sort((a, b) => {
    // Preserve Section C.2 Sorting (Funding)
    const aFund = a.guaranteedFunding[quarter] ? 1 : 0;
    const bFund = b.guaranteedFunding[quarter] ? 1 : 0;
    if (aFund !== bFund) return bFund - aFund;

    // Preserve Section C.3 Sorting (TA Quarters)
    const cGroupDiff = a._cRankGroup === b._cRankGroup ? 0
      : (a._cRankGroup < b._cRankGroup ? -1 : 1);
    if (cGroupDiff !== 0) return cGroupDiff;

    // Preserve Section C.4/C.5 Sorting (Seniority)
    const cSeniorityDiff = b.seniorityScore - a.seniorityScore;
    if (cSeniorityDiff !== 0) return cSeniorityDiff;

    // TIE-BREAKING - ASE Part I, Section D.1: Evidence of readiness (e.g. Teaching@UW)
    const dReadyDiff = (b.isReady ? 1 : 0) - (a.isReady ? 1 : 0);
    if (dReadyDiff !== 0) return dReadyDiff;

    // TIE-BREAKING - ASE Part I, Section D.2: Teaching excellence (mean ACM Score)
    const dAcmDiff = compareAcm(a.acmScore, b.acmScore);
    if (dAcmDiff !== 0) return dAcmDiff;

    // TIE-BREAKING - ASE Part I, Section D.3: Academic merit (CV submitted)
    const dCvDiff = compareBoolFlag(a.cvSubmitted, b.cvSubmitted);
    if (dCvDiff !== 0) return dCvDiff;

    // TIE-BREAKING - ASE Part I, Section D.4: Unofficial transcripts submitted
    const dTranscriptDiff = compareBoolFlag(a.transcriptSubmitted, b.transcriptSubmitted);
    if (dTranscriptDiff !== 0) return dTranscriptDiff;

    // Final fallback
    return a.timestamp.getTime() - b.timestamp.getTime();
  });
}

/**
 * RANKING - Full Candidate Sort
 * Applies the entire sorting hierarchy for a candidate pool against a specific course.
 * Order: Credential strength (C.1) → Hierarchy (C.2-C.5) → Tiebreakers (D.1-D.4).
 */
function sortPoolForCourse(pool, courseCode, quarter) {
  // Pass applicants through C and D criteria
  const cSorted  = sortBySectionC(pool, quarter);
  const cdSorted = applySectionDTiebreakers(cSorted, quarter);
  
  return cdSorted.sort((a, b) => {
    // RANKING - ASE Part I, Section C.1: The student must meet the specific course eligibility requirement
    // In our system, this translates to "Satisfies" > "Relevant" > "None"
    const strengthA = getCredentialStrength(a, courseCode);
    const strengthB = getCredentialStrength(b, courseCode);
    return strengthB - strengthA;
  });
}

/**
 * TIE-BREAKING (Pass 1B Displacement): 
 * Compares two applicants for a specific course and quarter using the full 
 * sort order (Credential strength → C → D). 
 * 
 * Returns negative if A ranks higher than B, positive if B ranks higher than A.
 * Scales the return magnitude so higher-level guidelines easily outrank 
 * lower-level ties during Pass 1B displacement scoring.
 */
function compareApplicantsForCourse(a, b, courseCode, quarter) {
  // ASE Part I, Section C.1: Course Credential Eligibility Match
  const strengthA = getCredentialStrength(a, courseCode);
  const strengthB = getCredentialStrength(b, courseCode);
  if (strengthA !== strengthB) return (strengthB - strengthA) * 1000;

  // ASE Part I, Section C.2: Guaranteed Funding
  const aFund = a.guaranteedFunding[quarter] ? 1 : 0;
  const bFund = b.guaranteedFunding[quarter] ? 1 : 0;
  if (aFund !== bFund) return (bFund - aFund) * 900;

  // ASE Part I, Section C.3: Under 5 TA Quarters
  const aGroup = a.under5TAs ? 0 : 1;
  const bGroup = b.under5TAs ? 0 : 1;
  if (aGroup !== bGroup) return (aGroup - bGroup) * 800;

  // ASE Part I, Section C.4 & C.5: Seniority
  if (a.seniorityScore !== b.seniorityScore) return Math.sign(b.seniorityScore - a.seniorityScore) * 700;

  // ASE Part I, Section D.1: Readiness (Teaching@UW)
  const dReadyDiff = (b.isReady ? 1 : 0) - (a.isReady ? 1 : 0);
  if (dReadyDiff !== 0) return Math.sign(dReadyDiff) * 600;

  // ASE Part I, Section D.2: Teaching Excellence
  const compareAcm = (x, y) => {
    if (x === y) return 0;
    if (x === null) return  1;
    if (y === null) return -1;
    return Math.sign(y - x);
  };
  const dAcmDiff = compareAcm(a.acmScore, b.acmScore);
  if (dAcmDiff !== 0) return dAcmDiff * 500;

  // ASE Part I, Section D.3: CV submission
  const compareBool = (x, y) => {
    if (x === y) return 0;
    if (x === true)  return -1;
    if (y === true)  return  1;
    if (x === false) return -1;
    return 1;
  };
  const dCvDiff = compareBool(a.cvSubmitted, b.cvSubmitted);
  if (dCvDiff !== 0) return dCvDiff * 400;

  // ASE Part I, Section D.4: Transcript submission
  const dTransDiff = compareBool(a.transcriptSubmitted, b.transcriptSubmitted);
  if (dTransDiff !== 0) return dTransDiff * 300;

  // Application Timestamp
  return Math.sign(a.timestamp.getTime() - b.timestamp.getTime());
}


// ==========================================
// ALLOCATION ENGINE (TWO-PASS + DISPLACEMENT)
// ==========================================

function allocateApplicants(applicants, forecast) {
  // FILTERING - ASE Part I, Section B.1 & B.2: Minimum Eligibility Check
  // Only applicants who are making satisfactory progress (i.e. not on Academic Notification) are included.
  const eligibleApplicants = applicants.filter(a => a.isEligible);
  const results      =[];
  const warnings     =[];
  const displacements =[]; 

  const assignedFunded    = { "AU": {}, "WI": {}, "SP": {} };
  const fundedSlotsFilled = {};
  forecast.forEach(c => { fundedSlotsFilled[c.normalizedCode] = 0; });

  const displacedApplicantKeys = new Set();

  const quarters =["AU", "WI", "SP"];

  // ── PASS 1: STANDARD GUARANTEED FUNDING ASSIGNMENT (ASE Part I, Section C.2) ────────────────────────
  quarters.forEach(quarter => {
    // FILTERING: Identify students with guaranteed funding who listed courses this quarter.
    const fundedStudents = eligibleApplicants.filter(a =>
      a.guaranteedFunding[quarter] &&
      a.eligibleCourses.some(code =>
        forecast.find(c => c.normalizedCode === code && c.quarter === quarter)
      )
    );

    // Scarcity-first course ordering. 
    // Unlisted courses will have a massive eligibleCount (everyone is eligible) 
    // and will therefore be processed LAST, allowing listed courses to fill first.
    const quarterCourses = forecast.filter(c => c.quarter === quarter).map(c => ({...c,
        eligibleCount: eligibleApplicants.filter(a =>
          a.eligibleCourses.includes(c.normalizedCode)
        ).length
      })).sort((a, b) => a.eligibleCount - b.eligibleCount);

    quarterCourses.forEach(course => {
      const slotsAvailable = course.tasNeeded - fundedSlotsFilled[course.normalizedCode];
      if (slotsAvailable <= 0) return;

      const preferredProgram = CONFIG.FIELD_MATCH_MAP[extractPrefix(course.normalizedCode)];

      // FILTERING: Only consider funded applicants who are eligible for this specific course.
      const candidatePool = fundedStudents.filter(a =>
        a.eligibleCourses.includes(course.normalizedCode) &&
        !assignedFunded[quarter][a.email]
      );

      const sorted = sortPoolForCourse(candidatePool, course.normalizedCode, quarter);
      sorted.sort((a, b) => {
        const aMatch = (a.program || "").includes(preferredProgram) ? 1 : 0;
        const bMatch = (b.program || "").includes(preferredProgram) ? 1 : 0;
        return bMatch - aMatch;
      });

      sorted.slice(0, slotsAvailable).forEach(student => {
        assignedFunded[quarter][student.email] = course.normalizedCode;
        fundedSlotsFilled[course.normalizedCode]++;
      });
    });
  });

  // ── PASS 1B: DISPLACEMENT OF OPEN-POOL APPLICANTS (ASE Part I, Sections I.A & I.B) ──────────────────
  quarters.forEach(quarter => {
    // Identify funded students still unplaced after Pass 1.
    const stillUnplaced = eligibleApplicants.filter(a =>
      a.guaranteedFunding[quarter] &&
      !assignedFunded[quarter][a.email]
    );

    if (stillUnplaced.length === 0) return;

    const openPoolHolders = {};
    forecast.filter(c => c.quarter === quarter).forEach(course => {
        const nonGuaranteedEligible = eligibleApplicants.filter(a =>
          a.eligibleCourses.includes(course.normalizedCode) &&
          !a.guaranteedFunding[quarter]
        );
        const sorted      = sortPoolForCourse(nonGuaranteedEligible, course.normalizedCode, quarter);
        const filledSlots = fundedSlotsFilled[course.normalizedCode] || 0;
        const openSlots   = Math.max(0, course.tasNeeded - filledSlots);
        openPoolHolders[course.normalizedCode] = sorted.slice(0, openSlots);
      });

    stillUnplaced.forEach(fundedStudent => {
      if (assignedFunded[quarter][fundedStudent.email]) return; 

      const displacementCandidates =[];

      forecast.filter(c => c.quarter === quarter).forEach(course => {
          if (!fundedStudent.eligibleCourses.includes(course.normalizedCode)) return;

          const holders = openPoolHolders[course.normalizedCode] ||[];
          if (holders.length === 0) return; 

          const weakestHolder = holders[holders.length - 1];

          // Use full tiebreaking matrix to see if funded student outranks the weakest holder
          const comparison = compareApplicantsForCourse(
            fundedStudent, weakestHolder, course.normalizedCode, quarter
          );
          if (comparison >= 0) return;

          const coursePrefix      = extractPrefix(course.normalizedCode);
          const expectedProgram   = coursePrefix ? CONFIG.FIELD_MATCH_MAP[coursePrefix] : null;
          const isFieldMatch      = expectedProgram ? (fundedStudent.program || "").includes(expectedProgram) : false;
          const credStrength      = getCredentialStrength(fundedStudent, course.normalizedCode);

          displacementCandidates.push({
            course,
            weakestHolder,
            isFieldMatch,
            credStrength,
            rankMargin: comparison
          });
        });

      if (displacementCandidates.length === 0) {
        warnings.push({
          type:    "UNPLACED_FUNDED_STUDENT",
          quarter,
          student: fundedStudent.name,
          email:   fundedStudent.email,
          program: fundedStudent.program,
          message: `${fundedStudent.name} has guaranteed funding for ${quarter} but could not be assigned to any course even after attempting displacement of open-pool applicants. Manual review required (see ASE Part I, Section I.A).`
        });
        return;
      }

      displacementCandidates.sort((a, b) => {
        if (a.isFieldMatch !== b.isFieldMatch) return b.isFieldMatch - a.isFieldMatch;
        if (a.credStrength !== b.credStrength) return b.credStrength - a.credStrength;
        return a.rankMargin - b.rankMargin;
      });

      const best           = displacementCandidates[0];
      const targetCourse   = best.course;
      const displaced      = best.weakestHolder;

      assignedFunded[quarter][fundedStudent.email] = targetCourse.normalizedCode;
      
      const holders = openPoolHolders[targetCourse.normalizedCode];
      const idx     = holders.indexOf(displaced);
      if (idx !== -1) holders.splice(idx, 1);

      const displacedKey = `${(displaced.email || "").toString().trim().toLowerCase()}|${quarter}`;
      displacedApplicantKeys.add(displacedKey);

      displacements.push({
        quarter,
        course:            `${targetCourse.prefix} ${targetCourse.courseNum}`,
        fundedStudent:     fundedStudent.name,
        fundedEmail:       fundedStudent.email,
        fundedProgram:     fundedStudent.program,
        displacedStudent:  displaced.name,
        displacedEmail:    displaced.email,
        displacedProgram:  displaced.program,
        isFieldMatch:      best.isFieldMatch,
        credStrength:      getCredentialStrengthLabel(fundedStudent, targetCourse.normalizedCode),
        policyBasis:       "ASE Part I, Sections I.A & I.B"
      });
    });
  });

  // ── PASS 2: FULL RANKED OUTPUT PER COURSE ─────────────────────────────────
  forecast.forEach(course => {
    const quarter          = course.quarter;
    const preferredProgram = CONFIG.FIELD_MATCH_MAP[extractPrefix(course.normalizedCode)];

    // FILTERING: Generate final sorted arrays per course. Only include those who marked it as eligible.
    const pool = eligibleApplicants.filter(a =>
      a.eligibleCourses.includes(course.normalizedCode)
    );

    const fundedAssignedHere = pool.filter(a =>
      assignedFunded[quarter][a.email] === course.normalizedCode
    );
    const openPool = pool.filter(a =>
      !assignedFunded[quarter][a.email]
    );

    const fundedSorted = sortPoolForCourse(fundedAssignedHere, course.normalizedCode, quarter);
    fundedSorted.sort((a, b) => {
      const aMatch = (a.program || "").includes(preferredProgram) ? 1 : 0;
      const bMatch = (b.program || "").includes(preferredProgram) ? 1 : 0;
      return bMatch - aMatch;
    });

    const openSorted = sortPoolForCourse(openPool, course.normalizedCode, quarter);

    const orderedPool = [...fundedSorted,...openSorted];

    orderedPool.forEach((applicant, index) => {
      const rank         = index + 1;
      const isFundedHere = assignedFunded[quarter][applicant.email] === course.normalizedCode;
      const isFieldMatch = isFundedHere && (applicant.program || "").includes(preferredProgram);

      const displacedKey = `${(applicant.email || "").toString().trim().toLowerCase()}|${quarter}`;
      const wasDisplaced = displacedApplicantKeys.has(displacedKey);

      let assignmentType = "Open Pool";
      if (isFundedHere) {
        const isDisplacementAssignment = displacements.some(
          d => d.fundedEmail === applicant.email &&
               d.quarter     === quarter &&
               d.course      === `${course.prefix} ${course.courseNum}`
        );
        if (isDisplacementAssignment) {
          assignmentType = isFieldMatch
            ? "Guaranteed – Displacement (Field Match)"
            : "Guaranteed – Displacement (Fallback)";
        } else {
          assignmentType = isFieldMatch
            ? "Guaranteed (Field Match)"
            : "Guaranteed (Fallback)";
        }
      } else if (wasDisplaced) {
        assignmentType = "Displaced (Funded Student Accommodation)";
      }

      const credStrengthLabel = getCredentialStrengthLabel(applicant, course.normalizedCode);

      const d3Flag = applicant.cvSubmitted === null
        ? "CV column not found in form"
        : applicant.cvSubmitted ? "CV submitted" : "⚠️ No CV submitted";

      const d4Flag = applicant.transcriptSubmitted === null
        ? "Transcript column not found in form"
        : applicant.transcriptSubmitted ? "Transcript submitted" : "⚠️ No transcript submitted";

      const entry           = applicant.eligibilityMap[course.normalizedCode];
      const matchedCriteria = entry ? entry.reasons.join("\n\n") : "";

      results.push({
        Quarter:              `${course.quarter} ${course.year}`,
        Course:               `${course.prefix} ${course.courseNum}`,
        Title:                course.title,
        TAs_Needed:           course.tasNeeded,
        Rank:                 rank,
        Assignment_Type:      assignmentType,
        Credential_Strength:  credStrengthLabel,
        C_Rank_Group:         applicant._cRankGroup || "",
        Applicant_Name:       applicant.name,
        Email:                applicant.email,
        Program:              applicant.program,
        Guaranteed_Funding:   applicant.guaranteedFunding[quarter] ? "Yes" : "No",
        TA_Quarters_History:  applicant.taCount,
        Seniority:            applicant.seniorityText,
        Readiness_D1:         applicant.isReady ? "Yes" : "No",
        ACM_Score_D2:         applicant.acmScore !== null ? applicant.acmScore : "No evaluations on file",
        CV_Status_D3:         d3Flag,
        Transcript_Status_D4: d4Flag,
        Matched_Criteria:     matchedCriteria
      });
    });
  });

  return { rankedResults: results, warnings, displacements };
}


// ==========================================
// OUTPUT WRITERS
// ==========================================

function writeResultsToSheet(db, results) {
  let sheet = db.getSheetByName(CONFIG.OUTPUT_SHEET_NAME);
  if (!sheet) {
    sheet = db.insertSheet(CONFIG.OUTPUT_SHEET_NAME);
  } else {
    sheet.clear();
  }

  if (results.length === 0) {
    sheet.getRange("A1").setValue("No eligible applicants found for the forecast classes.");
    return;
  }

  const headers = Object.keys(results[0]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  const data = results.map(row => headers.map(h => row[h]));
  sheet.getRange(2, 1, data.length, headers.length).setValues(data);

  // Apply bolding to the top ranked applicants based on TAs Needed
  const rankIdx = headers.indexOf("Rank");
  const tasNeededIdx = headers.indexOf("TAs_Needed");

  if (rankIdx !== -1 && tasNeededIdx !== -1 && data.length > 0) {
    const fontWeights = data.map(row => {
      const rank = Number(row[rankIdx]);
      const tasNeeded = Number(row[tasNeededIdx]);
      // If the applicant's rank is within the number of needed TAs, bold the entire row
      const isTopRanked = (rank > 0 && rank <= tasNeeded);
      return new Array(headers.length).fill(isTopRanked ? "bold" : "normal");
    });
    // Set font weights in bulk
    sheet.getRange(2, 1, data.length, headers.length).setFontWeights(fontWeights);
  }

  const atIdx = headers.indexOf("Assignment_Type") + 1;
  if (atIdx > 0) {
    data.forEach((row, i) => {
      const cell = sheet.getRange(i + 2, atIdx);
      const val  = row[headers.indexOf("Assignment_Type")];
      if      (val === "Guaranteed (Field Match)")                    cell.setBackground("#c6efce"); 
      else if (val === "Guaranteed (Fallback)")                       cell.setBackground("#ffeb9c"); 
      else if (val === "Guaranteed – Displacement (Field Match)")     cell.setBackground("#a8d08d"); 
      else if (val === "Guaranteed – Displacement (Fallback)")        cell.setBackground("#f4b942"); 
      else if (val === "Displaced (Funded Student Accommodation)")    cell.setBackground("#d9d2e9"); 
      else                                                             cell.setBackground(null);
    });
  }

  const csIdx = headers.indexOf("Credential_Strength") + 1;
  if (csIdx > 0) {
    data.forEach((row, i) => {
      const cell = sheet.getRange(i + 2, csIdx);
      const val  = row[headers.indexOf("Credential_Strength")];
      if      (val === "Satisfies" || val === "Prior TA History") cell.setBackground("#c6efce");
      else if (val === "Relevant To")                             cell.setBackground("#fff2cc");
      else                                                         cell.setBackground(null);
    });
  }

  const crIdx = headers.indexOf("C_Rank_Group") + 1;
  if (crIdx > 0) {
    data.forEach((row, i) => {
      const cell = sheet.getRange(i + 2, crIdx);
      const val  = row[headers.indexOf("C_Rank_Group")];
      if      (val === "A (≤5 quarters)") cell.setBackground("#dae8fc");
      else if (val === "B (≥6 quarters)") cell.setBackground("#f8cecc");
    });
  }

  const d3Idx = headers.indexOf("CV_Status_D3") + 1;
  const d4Idx = headers.indexOf("Transcript_Status_D4") + 1;
  data.forEach((row, i) => {
    if (d3Idx > 0 && (row[headers.indexOf("CV_Status_D3")] || "").toString().startsWith("⚠️"))
      sheet.getRange(i + 2, d3Idx).setBackground("#ffe6cc");
    if (d4Idx > 0 && (row[headers.indexOf("Transcript_Status_D4")] || "").toString().startsWith("⚠️"))
      sheet.getRange(i + 2, d4Idx).setBackground("#ffe6cc");
  });

  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);
}

function writeSummarySheet(db, results, warnings, displacements) {
  const SUMMARY_SHEET_NAME = "Allocation_Summary";
  let sheet = db.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sheet) {
    sheet = db.insertSheet(SUMMARY_SHEET_NAME);
  } else {
    sheet.clear();
  }

  let currentRow = 1;

  sheet.getRange(currentRow, 1).setValue("GUARANTEED FUNDING PLACEMENT OVERVIEW").setFontWeight("bold").setFontSize(12);
  currentRow++;

  const quarterOrder = { "AU": 1, "WI": 2, "SP": 3, "SU": 4 };
  const quarterSet   = new Set();
  results.forEach(r => { if (r && r.Quarter) quarterSet.add(r.Quarter.toString().trim()); });
  const quarterCols = Array.from(quarterSet).filter(Boolean).sort((a, b) => {
    const [qA, yA] = a.split(/\s+/);
    const[qB, yB] = b.split(/\s+/);
    const yearDiff  = (parseInt(yA, 10) || 0) - (parseInt(yB, 10) || 0);
    if (yearDiff !== 0) return yearDiff;
    return (quarterOrder[qA] || 99) - (quarterOrder[qB] || 99);
  });

  const fundedStudentMap = new Map();
  results.forEach(r => {
    if ((r.Guaranteed_Funding || "").toString().toLowerCase() !== "yes") return;
    const emailLower = (r.Email || "").toString().trim().toLowerCase();
    if (!emailLower || fundedStudentMap.has(emailLower)) return;
    fundedStudentMap.set(emailLower, {
      name:         (r.Applicant_Name || "").toString(),
      program:      (r.Program        || "").toString(),
      emailDisplay: (r.Email          || "").toString()
    });
  });

  const placementMap = new Map();
  results.forEach(r => {
    const at = (r.Assignment_Type || "").toString();
    if (!at.startsWith("Guaranteed")) return;
    const rank      = Number(r.Rank)       || 0;
    const tasNeeded = Number(r.TAs_Needed) || 1;
    if (rank > tasNeeded) return;
    const emailLower = (r.Email   || "").toString().trim().toLowerCase();
    const qLabel     = (r.Quarter || "").toString().trim();
    if (!emailLower || !qLabel) return;
    const key = `${emailLower}|${qLabel}`;
    if (!placementMap.has(key)) placementMap.set(key,[]);
    placementMap.get(key).push({
      course:             (r.Course            || "").toString(),
      rank,
      tasNeeded,
      assignmentType:     at,
      credentialStrength: (r.Credential_Strength || "").toString(),
      isDisplacement:     at.includes("Displacement")
    });
  });

  const unplacedSet = new Set();
  (warnings ||[]).forEach(w => {
    if (!w || w.type !== "UNPLACED_FUNDED_STUDENT") return;
    const emailLower = (w.email   || "").toString().trim().toLowerCase();
    const qShort     = (w.quarter || "").toString().trim();
    if (!emailLower || !qShort) return;
    quarterCols.forEach(qLabel => {
      if (qLabel.startsWith(qShort + " ")) unplacedSet.add(`${emailLower}|${qLabel}`);
    });
  });

  const fundedStudents = Array.from(fundedStudentMap.entries()).map(([emailLower, info]) => ({ emailLower,...info })).sort((a, b) => {
      const subA = CONFIG.SUBDISCIPLINE_ORDER[a.program] || 99;
      const subB = CONFIG.SUBDISCIPLINE_ORDER[b.program] || 99;
      if (subA !== subB) return subA - subB;
      return (a.name || "").localeCompare(b.name || "");
    });

  const overviewHeaders =["Student Name", "Program"].concat(quarterCols);
  const numOverviewCols = overviewHeaders.length;

  sheet.getRange(currentRow, 1, 1, numOverviewCols).setValues([overviewHeaders]).setFontWeight("bold").setBackground("#d9ead3");
  currentRow++;

  const COLOR_FIELD_MATCH        = "#c6efce";
  const COLOR_FALLBACK           = "#ffeb9c";
  const COLOR_RELEVANT           = "#fff2cc";
  const COLOR_DISPLACEMENT_FIELD = "#a8d08d"; 
  const COLOR_DISPLACEMENT_OTHER = "#f4b942"; 
  const COLOR_UNPLACED           = "#f4cccc";
  const COLOR_NO_OBLIGATION      = "#f3f3f3";
  const COLOR_NONE               = null;

  if (fundedStudents.length === 0 || quarterCols.length === 0) {
    sheet.getRange(currentRow, 1).setValue("No students with guaranteed funding were detected in the results.").setFontStyle("italic");
    currentRow++;
  } else {
    const values   = [];
    const bgColors =[];
    const notes    =[];
    let lastSubdiscipline = null;

    fundedStudents.forEach(s => {
      if (s.program !== lastSubdiscipline) {
        if (lastSubdiscipline !== null) {
          values.push(new Array(numOverviewCols).fill(""));
          bgColors.push(new Array(numOverviewCols).fill("#e8e8e8"));
          notes.push(new Array(numOverviewCols).fill(""));
        }
        lastSubdiscipline = s.program;
      }

      const rowVals  =[s.name, s.program];
      const rowBg    =[COLOR_NONE, COLOR_NONE];
      const rowNotes =["", ""];

      quarterCols.forEach(qLabel => {
        const key        = `${s.emailLower}|${qLabel}`;
        const placements = placementMap.get(key) ||[];
        const isUnplaced = unplacedSet.has(key);

        const hasFundingThisQuarter = results.some(r =>
          (r.Email   || "").toString().trim().toLowerCase() === s.emailLower &&
          (r.Quarter || "").toString().trim()               === qLabel &&
          (r.Guaranteed_Funding || "").toString().toLowerCase() === "yes"
        );

        if (placements.length > 0) {
          const cellLines = placements.map(p => {
            const dispTag = p.isDisplacement ? "[D]" : "";
            return `${p.course}${dispTag} (Rank ${p.rank} of ${p.tasNeeded})`;
          });
          rowVals.push(cellLines.join("\n"));

          const anyDisplacement = placements.some(p => p.isDisplacement);
          const allFieldMatch   = placements.every(p =>
            p.assignmentType.includes("Field Match")
          );
          const anyRelevant     = placements.some(p => p.credentialStrength === "Relevant To");
          const allRelevant     = placements.every(p => p.credentialStrength === "Relevant To");

          if (anyDisplacement && allFieldMatch && !anyRelevant) {
            rowBg.push(COLOR_DISPLACEMENT_FIELD);
          } else if (anyDisplacement) {
            rowBg.push(COLOR_DISPLACEMENT_OTHER);
          } else if (allRelevant) {
            rowBg.push(COLOR_RELEVANT);
          } else if (allFieldMatch && !anyRelevant) {
            rowBg.push(COLOR_FIELD_MATCH);
          } else {
            rowBg.push(COLOR_FALLBACK);
          }

          const noteLines = placements.map(p => {
            const dispNote = p.isDisplacement ? "[Displacement — ASE I.A/I.B]" : "";
            return `${p.course}: Rank ${p.rank} of ${p.tasNeeded} — ${p.assignmentType}${dispNote} — Credential: ${p.credentialStrength}`;
          });
          rowNotes.push(noteLines.join("\n"));

        } else if (isUnplaced) {
          rowVals.push("UNPLACED ⚠️");
          rowBg.push(COLOR_UNPLACED);
          rowNotes.push(
            "Student has guaranteed funding for this quarter but could not be assigned " +
            "to any course even after attempting displacement. Manual review required " +
            "(ASE Part I, Section I.A)."
          );
        } else if (hasFundingThisQuarter) {
          rowVals.push("—");
          rowBg.push(COLOR_NO_OBLIGATION);
          rowNotes.push(
            "Student has guaranteed funding this quarter but is currently ranked " +
            "outside the TAs_Needed range for all courses. May resolve if other " +
            "applicants decline."
          );
        } else {
          rowVals.push("");
          rowBg.push(COLOR_NO_OBLIGATION);
          rowNotes.push("");
        }
      });

      values.push(rowVals);
      bgColors.push(rowBg);
      notes.push(rowNotes);
    });

    const dataRange = sheet.getRange(currentRow, 1, values.length, numOverviewCols);
    dataRange.setValues(values);
    dataRange.setBackgrounds(bgColors);
    if (notes.some(row => row.some(n => n && n.trim() !== ""))) {
      dataRange.setNotes(notes);
    }
    sheet.getRange(currentRow, 1, values.length, 1).setFontWeight("bold");
    dataRange.setWrap(true);
    currentRow += values.length;
  }

  currentRow++;
  sheet.getRange(currentRow, 1).setValue("Legend:").setFontWeight("bold");
  const legendItems = [[COLOR_FIELD_MATCH,        "Guaranteed (Field Match) — subdiscipline and credentials match"],[COLOR_FALLBACK,           "Guaranteed (Fallback) — placed outside preferred subdiscipline or mixed credentials"],[COLOR_RELEVANT,           "Guaranteed — credential is 'Relevant To' only"],[COLOR_DISPLACEMENT_FIELD, "Guaranteed – Displacement, Field Match[D] — placed via open-pool displacement; subdiscipline matches (ASE I.A/I.B)"],[COLOR_DISPLACEMENT_OTHER, "Guaranteed – Displacement, Fallback [D] — placed via open-pool displacement; subdiscipline does not match (ASE I.A/I.B)"],[COLOR_UNPLACED,           "UNPLACED ⚠️ — could not be placed even after displacement; manual review required"],["#e8e8e8",                "Subdiscipline group divider"],[COLOR_NO_OBLIGATION,      "No funding obligation for this quarter (or ranked outside TAs_Needed range)"]
  ];
  legendItems.forEach((item, i) => {
    const legendRow = currentRow + 1 + i;
    sheet.getRange(legendRow, 1).setBackground(item[0]).setValue("  ");
    sheet.getRange(legendRow, 2).setValue(item[1]);
  });
  currentRow += 1 + legendItems.length + 2;

  sheet.getRange(currentRow, 1).setValue("GUARANTEED FUNDING ASSIGNMENTS").setFontWeight("bold").setFontSize(12);
  currentRow++;

  const summaryHeaders =[
    "Quarter", "Student Name", "Email", "Program",
    "Assigned Course", "Rank", "TAs Needed", "Assignment Type", "Credential Strength"
  ];
  sheet.getRange(currentRow, 1, 1, summaryHeaders.length).setValues([summaryHeaders]).setFontWeight("bold").setBackground("#d9d9d9");
  currentRow++;

  const guaranteedRows = results.filter(r =>
    (r.Assignment_Type || "").toString().startsWith("Guaranteed") &&
    Number(r.Rank) <= Number(r.TAs_Needed)
  );

  const seenAssignments = new Set();
  const summaryData     =[];
  guaranteedRows.forEach(r => {
    const key = `${r.Quarter}|${r.Email}|${r.Course}`;
    if (!seenAssignments.has(key)) {
      seenAssignments.add(key);
      summaryData.push([
        r.Quarter, r.Applicant_Name, r.Email, r.Program,
        r.Course, r.Rank, r.TAs_Needed, r.Assignment_Type, r.Credential_Strength
      ]);
    }
  });

  if (summaryData.length > 0) {
    sheet.getRange(currentRow, 1, summaryData.length, summaryHeaders.length).setValues(summaryData);
    summaryData.forEach((row, i) => {
      const rowRange = sheet.getRange(currentRow + i, 1, 1, summaryHeaders.length);
      const at       = (row[7] || "").toString();
      const cred     = (row[8] || "").toString();
      if      (at.includes("Displacement") && at.includes("Field Match")) rowRange.setBackground(COLOR_DISPLACEMENT_FIELD);
      else if (at.includes("Displacement"))                                rowRange.setBackground(COLOR_DISPLACEMENT_OTHER);
      else if (cred === "Relevant To")                                     rowRange.setBackground(COLOR_RELEVANT);
      else if (at.includes("Field Match"))                                 rowRange.setBackground(COLOR_FIELD_MATCH);
      else                                                                  rowRange.setBackground(COLOR_FALLBACK);
    });
    currentRow += summaryData.length;
  } else {
    sheet.getRange(currentRow, 1).setValue("No guaranteed funding assignments made.").setFontStyle("italic");
    currentRow++;
  }

  currentRow += 2;

  sheet.getRange(currentRow, 1).setValue("DISPLACEMENT LOG").setFontWeight("bold").setFontSize(12).setFontColor("#741b47");
  currentRow++;

  sheet.getRange(currentRow, 1).setValue(
      "The following open-pool applicants were displaced from a TA slot to accommodate " +
      "a student with guaranteed funding, per ASE Part I, Sections I.A and I.B. " +
      "Displaced applicants should be notified and considered for any remaining open slots."
    ).setFontStyle("italic").setWrap(true);
  sheet.setRowHeight(currentRow, 50);
  currentRow++;

  const dispHeaders =[
    "Quarter", "Course",
    "Funded Student (Placed)", "Funded Student Email", "Funded Program",
    "Displaced Applicant", "Displaced Email", "Displaced Program",
    "Field Match?", "Credential Strength", "Policy Basis"
  ];
  sheet.getRange(currentRow, 1, 1, dispHeaders.length).setValues([dispHeaders]).setFontWeight("bold").setBackground("#ead1dc");
  currentRow++;

  if (displacements.length > 0) {
    const dispData = displacements.map(d =>[
      d.quarter, d.course,
      d.fundedStudent, d.fundedEmail, d.fundedProgram,
      d.displacedStudent, d.displacedEmail, d.displacedProgram,
      d.isFieldMatch ? "Yes" : "No",
      d.credStrength,
      d.policyBasis
    ]);
    sheet.getRange(currentRow, 1, dispData.length, dispHeaders.length).setValues(dispData);
    dispData.forEach((row, i) => {
      const bg = row[8] === "Yes" ? COLOR_DISPLACEMENT_FIELD : COLOR_DISPLACEMENT_OTHER;
      sheet.getRange(currentRow + i, 1, 1, dispHeaders.length).setBackground(bg);
    });
    currentRow += dispData.length;
  } else {
    sheet.getRange(currentRow, 1).setValue("No displacements were necessary. All funded students were placed in Pass 1.").setFontStyle("italic");
    currentRow++;
  }

  currentRow += 2;

  sheet.getRange(currentRow, 1).setValue("📋 MANUAL REVIEW REQUIRED — D.3 (CV) & D.4 (TRANSCRIPTS)").setFontWeight("bold").setFontSize(12).setFontColor("#7030a0");
  currentRow++;

  sheet.getRange(currentRow, 1).setValue(
      "The following applicants are missing a CV and/or transcript submission. " +
      "Per ASE Section D.3–D.4, these must be reviewed manually before finalizing " +
      "rankings among tied applicants."
    ).setFontStyle("italic").setWrap(true);
  sheet.setRowHeight(currentRow, 40);
  currentRow++;

  const d34Headers =[
    "Quarter", "Course", "Rank", "TAs Needed", "Student Name",
    "Email", "CV Status (D.3)", "Transcript Status (D.4)", "ACM Score (D.2)"
  ];
  sheet.getRange(currentRow, 1, 1, d34Headers.length).setValues([d34Headers]).setFontWeight("bold").setBackground("#e2d0f0");
  currentRow++;

  const d34Rows = results.filter(r =>
    ((r.CV_Status_D3         || "").toString().startsWith("⚠️")) ||
    ((r.Transcript_Status_D4 || "").toString().startsWith("⚠️"))
  );

  const d34Seen = new Set();
  const d34Data =[];
  d34Rows.forEach(r => {
    const key = `${r.Quarter}|${r.Email}|${r.Course}`;
    if (!d34Seen.has(key)) {
      d34Seen.add(key);
      d34Data.push([
        r.Quarter, r.Course, r.Rank, r.TAs_Needed, r.Applicant_Name,
        r.Email, r.CV_Status_D3, r.Transcript_Status_D4, r.ACM_Score_D2
      ]);
    }
  });

  if (d34Data.length > 0) {
    sheet.getRange(currentRow, 1, d34Data.length, d34Headers.length).setValues(d34Data);
    d34Data.forEach((row, i) => {
      if ((row[6] || "").toString().startsWith("⚠️"))
        sheet.getRange(currentRow + i, 7).setBackground("#ffe6cc");
      if ((row[7] || "").toString().startsWith("⚠️"))
        sheet.getRange(currentRow + i, 8).setBackground("#ffe6cc");
    });
    currentRow += d34Data.length;
  } else {
    sheet.getRange(currentRow, 1).setValue(
        "No missing CV or transcript submissions detected " +
        "(or these columns were not found in the form)."
      ).setFontStyle("italic");
    currentRow++;
  }

  const maxCols = Math.max(11, numOverviewCols, summaryHeaders.length, dispHeaders.length, d34Headers.length);
  sheet.autoResizeColumns(1, maxCols);
  sheet.setFrozenRows(2);
}
