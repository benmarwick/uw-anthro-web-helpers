/**
 * Main function to run all schedule checks.
 * Triggered via the custom menu in Google Sheets.
 */
function runScheduleChecks() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Update these to match the EXACT names of the tabs at the bottom of your screen. 
  // (I am guessing the third one is "forAdminARCHY", change it if it's named differently!)
  const sheetNames =["forAdminANTH", "forAdminBIOA", "forAdminARCHY"]; 
  
  let allCourses =[];
  let report = [["Type of Issue", "Quarter & Year", "Courses Involved", "Details"]];
  
  // ==========================================
  // 1. EXTRACT AND STANDARDIZE DATA FROM TABS
  // ==========================================
  sheetNames.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    
    // If the tab doesn't exist, skip it and move to the next one to avoid errors
    if (!sheet) {
      Logger.log("Could not find tab: " + sheetName);
      return; 
    }
    
    let data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    
    let headers = data[0].map(h => String(h).toLowerCase().trim());
    
    // Dynamically find columns to handle inconsistencies across the 3 sheets
    let colIdx = {
      quarter: headers.findIndex(h => h.includes("qua")), // Matches "Quarter" or "Qua"
      year: headers.findIndex(h => h === "year"),
      prefix: headers.findIndex(h => h === "prefix"),
      course: headers.findIndex(h => h.includes("course")), // Matches "Course" or "Course #"
      mon: headers.findIndex(h => h === "mon"),
      tue: headers.findIndex(h => h === "tue"),
      wed: headers.findIndex(h => h === "wed"),
      thu: headers.findIndex(h => h === "thu"),
      fri: headers.findIndex(h => h === "fri"),
      start: headers.findIndex(h => h.includes("time start")),
      end: headers.findIndex(h => h.includes("time end"))
    };

    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      let courseNum = parseInt(row[colIdx.course], 10);
      
      // Skip empty rows or rows without a valid course number/start time
      if (!row[colIdx.prefix] || isNaN(courseNum) || !row[colIdx.start]) continue; 

      allCourses.push({
        department: row[colIdx.prefix],
        courseNum: courseNum,
        level: Math.floor(courseNum / 100) * 100, // e.g., 203 becomes 200
        quarterYear: row[colIdx.quarter] + " " + row[colIdx.year],
        days: [row[colIdx.mon], row[colIdx.tue], row[colIdx.wed], row[colIdx.thu], row[colIdx.fri]],
        startTime: getMinutesFromMidnight(row[colIdx.start]),
        endTime: getMinutesFromMidnight(row[colIdx.end]),
        fullName: `${row[colIdx.prefix]} ${courseNum}`
      });
    }
  });

  // ==========================================
  // 2. RUN UW BLOCK SCHEDULING CHECKS
  // ==========================================
  allCourses.forEach(c => {
    if (c.startTime !== null && c.endTime !== null) {
      let duration = c.endTime - c.startTime;
      
      // Policy applies to classes starting BEFORE 2:30 PM (870 minutes from midnight)
      if (c.startTime < 870) {
        let startHour = Math.floor(c.startTime / 60);
        let startMin = c.startTime % 60;
        let timeStr = startHour + ":" + (startMin === 0 ? "00" : startMin);

        let isValid = true;
        let expectedStarts =[];

        // 50-minute class rules
        if (duration >= 45 && duration <= 55) {
          expectedStarts =["8:30", "9:30", "10:30", "11:30", "12:30", "13:30"];
          if (!expectedStarts.includes(timeStr)) isValid = false;
        } 
        // 80-minute class rules (T/Th usually)
        else if (duration >= 75 && duration <= 85) {
          expectedStarts =["8:30", "10:0", "10:00", "11:30", "13:0", "13:00"];
          if (!expectedStarts.includes(timeStr)) isValid = false;
        }
        // 110-minute class rules
        else if (duration >= 105 && duration <= 115) {
          expectedStarts = ["8:30", "10:30", "12:30"];
          if (!expectedStarts.includes(timeStr)) isValid = false;
        }
        // 170-minute class rules
        else if (duration >= 165 && duration <= 175) {
          expectedStarts = ["8:30", "11:30"];
          if (!expectedStarts.includes(timeStr)) isValid = false;
        }

        if (!isValid) {
          report.push(["Block Policy Violation", c.quarterYear, c.fullName, `Duration: ${duration}m starts at ${timeStr}. Expected: ${expectedStarts.join(", ")}`]);
        }
      }
    }
  });

  // ==========================================
  // 3. RUN OVERLAP CHECKS (200-level & 300/400-level)
  // ==========================================
  
  // Group courses by Quarter/Year to avoid checking AU against SP
  let coursesByQuarter = {};
  allCourses.forEach(c => {
    if (!coursesByQuarter[c.quarterYear]) coursesByQuarter[c.quarterYear] = [];
    coursesByQuarter[c.quarterYear].push(c);
  });

  for (let quarter in coursesByQuarter) {
    let qCourses = coursesByQuarter[quarter];

    // Compare every course against every other course in the same quarter
    for (let i = 0; i < qCourses.length; i++) {
      for (let j = i + 1; j < qCourses.length; j++) {
        let c1 = qCourses[i];
        let c2 = qCourses[j];

        // Check if they overlap in days AND times
        if (daysOverlap(c1.days, c2.days) && timesOverlap(c1.startTime, c1.endTime, c2.startTime, c2.endTime)) {
          
          // Overlap Rule 1: 200-level across ANY department
          if (c1.level === 200 && c2.level === 200 && c1.department !== c2.department) {
             report.push(["200-Level Conflict", quarter, `${c1.fullName} & ${c2.fullName}`, "Scheduled at the same time/days"]);
          }

          // Overlap Rule 2: 300 & 400 level classes
          if ((c1.level === 300 || c1.level === 400) && (c2.level === 300 || c2.level === 400)) {
             report.push(["Upper-Level Overlap", quarter, `${c1.fullName} & ${c2.fullName}`, "Potential student schedule conflict"]);
          }
        }
      }
    }
  }

  // ==========================================
  // 4. PRINT REPORT TO SPREADSHEET
  // ==========================================
  let reportSheet = ss.getSheetByName("Conflict Report");
  
  // If the sheet doesn't exist, create it
  if (!reportSheet) {
    reportSheet = ss.insertSheet("Conflict Report");
  }

  reportSheet.clear(); // Clear old data
  
  if (report.length > 1) {
    reportSheet.getRange(1, 1, report.length, report[0].length).setValues(report);
    
    // Formatting to make it pretty
    reportSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#d9d9d9");
    reportSheet.autoResizeColumns(1, 4);
  } else {
    reportSheet.getRange("A1").setValue("Great news! No conflicts found.");
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Converts a Google Sheets time (Date object) into total minutes from midnight.
 * Makes it much easier to do greater-than/less-than math on times.
 */
function getMinutesFromMidnight(dateObj) {
  if (!dateObj) return null;
  // If it's a string, attempt basic parsing (fallback)
  if (typeof dateObj === 'string') return null; 
  if (typeof dateObj.getHours !== 'function') return null;
  
  return (dateObj.getHours() * 60) + dateObj.getMinutes();
}

/**
 * Checks if two courses share at least one day (looks for "X" or "x").
 */
function daysOverlap(days1, days2) {
  for (let i = 0; i < 5; i++) {
    let d1 = String(days1[i]).toUpperCase();
    let d2 = String(days2[i]).toUpperCase();
    if (d1 === "X" && d2 === "X") return true;
  }
  return false;
}

/**
 * Checks if two time windows overlap.
 */
function timesOverlap(start1, end1, start2, end2) {
  if (start1 === null || end1 === null || start2 === null || end2 === null) return false;
  return (start1 < end2) && (end1 > start2);
}

/**
 * Adds a custom menu to Google Sheets when you open the file.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Admin Tools')
    .addItem('Run Schedule Validation', 'runScheduleChecks')
    .addToUi();
}