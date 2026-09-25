function doGet(e) {
  // 1. Check if the URL has "?page=schedule" at the end
  if (e.parameter.page === 'schedule') {
    return HtmlService.createHtmlOutputFromFile('ScheduleDashboard')
      .setTitle('Anthropology Curriculum Schedule')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 2. Otherwise, load our ORIGINAL dashboard named 'Index')
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Anthropology Curriculum Forecast')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// ORIGINAL DASHBOARD DATA FUNCTION
// ==========================================
function getCourseData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Current and Next Academic Year");
  if (!sheet) return[];
  
  const genEdMap = getGenEdMap(ss);
  const optionsMap = getOptionsMap(ss);
  
  const data = sheet.getDataRange().getDisplayValues(); 
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    // Look for Quarter and Course (or Course #) to find the header row
    if (data[i].indexOf("Quarter") > -1 && (data[i].indexOf("Course #") > -1 || data[i].indexOf("Course") > -1)) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return [];
  
  const headers = data[headerRowIdx].map(h => h.trim().toLowerCase());
  const courses =[];
  
  const idxQtr = headers.indexOf("quarter");
  const idxYr = headers.indexOf("year");
  const idxPre = headers.indexOf("prefix");
  // Check for "course #" or "course"
  const idxNum = headers.indexOf("course #") > -1 ? headers.indexOf("course #") : headers.indexOf("course"); 
  const idxTit = headers.indexOf("title");
  const idxInst = headers.indexOf("instructor");

  for (let j = headerRowIdx + 1; j < data.length; j++) {
    const row = data[j];
    if (!row[idxPre] && !row[idxNum]) continue; 
    
    let prefix = row[idxPre].trim();
    let num = row[idxNum].trim();
    let courseID = `${prefix} ${num}`;

    let ref = genEdMap[courseID] || { codes: "", w: "FALSE", desc: "Description not found in catalog index." };
    let optData = optionsMap[courseID] ||[];

    courses.push({
      quarter: idxQtr > -1 ? row[idxQtr] : "",
      year: idxYr > -1 ? row[idxYr] : "",
      prefix: prefix,
      courseNum: num,
      title: idxTit > -1 ? row[idxTit] : "",
      instructor: idxInst > -1 ? row[idxInst] : "",
      genEd: ref.codes,
      wCredit: ref.w === "TRUE",
      description: ref.desc,
      options: optData 
    });
  }
  return courses;
}

function getGenEdMap(ss) {
  const sheet = ss.getSheetByName("Ref_GenEd");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  let map = {};
  for (let i = 1; i < data.length; i++) {
    map[data[i][0]] = { codes: data[i][1], w: data[i][2], desc: data[i][3] };
  }
  return map;
}

function getOptionsMap(ss) {
  const sheet = ss.getSheetByName("Ref_Options");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  let map = {};
  for (let i = 1; i < data.length; i++) {
    let id = data[i][0];
    let optName = data[i][1];
    let isCore = data[i][2];
    let isReqd = data[i][3];
    let status = isCore ? "Core" : (isReqd ? "Reqd" : "Aprvd");
    if (!map[id]) map[id] = [];
    map[id].push({ name: optName, label: `${optName}-${status}`, isBold: (isCore || isReqd) });
  }
  return map;
}

// ==========================================
//  SCHEDULE DASHBOARD DATA FUNCTION
// (Renamed to getScheduleData to prevent conflicts)
// ==========================================

function getScheduleData() {
  console.log("--- Starting getScheduleData() ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // The specific sheets to pull schedule data from
  const sheetNames = ["forAdminANTH", "forAdminARCHY", "forAdminBIOA"];
  let cleanData =[];

  sheetNames.forEach(sheetName => {
    console.log(`Processing sheet: ${sheetName}`);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      console.error(`WARNING: Sheet '${sheetName}' not found. Check spelling.`);
      return; // Skip to the next sheet
    }
    
    const data = sheet.getDataRange().getDisplayValues(); 
    console.log(`Read ${data.length} rows from ${sheetName}`);
    
    // Find the header row
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      let rowStr = data[i].map(c => String(c).trim().toLowerCase());
      if (rowStr.includes("quarter") && (rowStr.includes("course") || rowStr.includes("course #") || rowStr.includes("prefix"))) {
        headerRowIdx = i;
        break;
      }
    }
    
    if (headerRowIdx === -1) {
      console.error(`WARNING: Could not find header row (missing 'Quarter' or 'Course') in ${sheetName}.`);
      return;
    }

    console.log(`Found headers at row ${headerRowIdx + 1} in ${sheetName}`);
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const rows = data.slice(headerRowIdx + 1);
    
    const col = {
      quarter: headers.indexOf('quarter'),
      year: headers.indexOf('year'),
      prefix: headers.indexOf('prefix'),
      course: headers.indexOf('course') > -1 ? headers.indexOf('course') : headers.indexOf('course #'),
      title: headers.indexOf('title'),
      instructor: headers.indexOf('instructor'),
      mon: headers.indexOf('mon'),
      tue: headers.indexOf('tue'),
      wed: headers.indexOf('wed'),
      thu: headers.indexOf('thu'),
      fri: headers.indexOf('fri'),
      start: headers.indexOf('time start'),
      end: headers.indexOf('time end')
    };

    console.log(`Column mappings for ${sheetName}:`, col);

    let addedCount = 0;
    rows.forEach((row, rowIndex) => {
      // Skip if essential timing columns are totally missing
      if (col.start === -1 || col.end === -1) return; 

      let startVal = row[col.start] ? row[col.start].trim() : '';
      let endVal = row[col.end] ? row[col.end].trim() : '';
      let courseVal = col.course > -1 && row[col.course] ? row[col.course].trim() : '';
      
      // Fallback: If 'Prefix' column is missing/blank, guess it from the sheet name!
      let prefixVal = col.prefix > -1 && row[col.prefix] ? row[col.prefix].trim() : sheetName.replace('forAdmin', '');
      if (prefixVal === 'BIOA') prefixVal = 'BIO A'; // Add space back for BIO A

      // Skip empty rows or classes without times
      if (!startVal || !endVal || !courseVal) return; 

      // Extract course level safely (e.g. "208A" -> 200)
      let courseNum = parseInt(courseVal.replace(/\D/g, ''), 10) || 0;
      let level = Math.floor(courseNum / 100) * 100;

      let courseObj = {
        quarter: col.quarter > -1 ? row[col.quarter].trim() : '',
        year: col.year > -1 ? row[col.year].trim() : '',
        prefix: prefixVal,
        course: courseVal,
        fullCode: `${prefixVal} ${courseVal}`,
        title: col.title > -1 ? row[col.title].trim() : '',
        instructor: col.instructor > -1 ? row[col.instructor].trim() : '',
        level: level.toString(),
        days:[],
        start: startVal,
        end: endVal
      };

      // Safely check days
      if (col.mon > -1 && row[col.mon].trim() !== '') courseObj.days.push('Mon');
      if (col.tue > -1 && row[col.tue].trim() !== '') courseObj.days.push('Tue');
      if (col.wed > -1 && row[col.wed].trim() !== '') courseObj.days.push('Wed');
      if (col.thu > -1 && row[col.thu].trim() !== '') courseObj.days.push('Thu');
      if (col.fri > -1 && row[col.fri].trim() !== '') courseObj.days.push('Fri');

      // Only add to dataset if it meets on at least one day
      if (courseObj.days.length > 0) {
        cleanData.push(courseObj);
        addedCount++;
      }
    });
    console.log(`Successfully extracted ${addedCount} courses from ${sheetName}`);
  });

  console.log(`--- Finished! Total courses sent to dashboard: ${cleanData.length} ---`);
  return cleanData;
}