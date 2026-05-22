javascript:(function(){
    const currentUrl = window.location.href;
    const quarterMatch = currentUrl.match(/\/timeschd\/([A-Z]{3}\d{4})/i);
    if(!quarterMatch){
        alert("Please click this bookmarklet while on a UW Time Schedule page (e.g., /timeschd/SPR2026/).");
        return;
    }
    const quarter = quarterMatch[1].toUpperCase();
    const qtrType = quarter.substring(0, 3);
    const qtrYear = parseInt(quarter.substring(3), 10);
    const springYear = qtrType === 'AUT' ? (qtrYear + 1) : qtrYear;
    const baseUrl = 'https://www.washington.edu/students/timeschd/' + quarter + '/';
    
    console.clear();
    console.group("[Scraper Initiator Tab] Scrape Processing Timeline");
    console.log("Quarter Detected: " + quarter);
    console.log("Academic Year Spring Year: " + springYear);
    console.log("URL Base: " + baseUrl);

    const newWin = window.open('', '_blank');
    if(!newWin){
        alert("Popup blocked! Please allow popups for washington.edu to generate the dashboard.");
        console.groupEnd();
        return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${quarter} Anthro Dashboard</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Open Sans', Arial, sans-serif; }
        .dashboard-header { background: #4b2e83; color: white; padding: 10px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; flex-wrap: wrap; gap: 15px; }
        .dashboard-header h1 { margin: 0; font-size: 20px; font-weight: 600; white-space: nowrap; }
        .dashboard-header p { margin: 0; font-size: 13px; color: #e8e3d3; flex: 1; min-width: 300px; }
        .dashboard-links { margin: 0; font-size: 13px; white-space: nowrap; }
        .dashboard-links a { color: #fff; text-decoration: none; border-bottom: 1px dotted rgba(255,255,255,0.6); margin-right: 15px; transition: color 0.2s; }
        .dashboard-links a:hover { color: #b7a57a; border-bottom-style: solid; }
        .filter-bar { background: white; margin: 15px 25px 0; padding: 10px 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #85754d; display: flex; flex-wrap: wrap; gap: 25px; align-items: center; }
        .filter-group { display: flex; gap: 12px; align-items: center; }
        .filter-group strong { color: #4b2e83; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .filter-label { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #333; cursor: pointer; }
        .charts-column { display: flex; flex-direction: row; flex-wrap: wrap; gap: 15px; padding: 15px 25px; }
        .chart-container { flex: 1 1 400px; width: 100%; background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-height: 420px; }
        .table-container { background: white; margin: 0 25px 25px; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    </style>
</head>
<body>
<div id="loading" style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
    <h1 style="color: #4b2e83;">Loading ${quarter} Anthropology Dashboard...</h1>
    <p style="color: #666;">Parsing catalogs and evaluating workloads.</p>
</div>
<div id="dashboard" style="display:none;">
    <div class="dashboard-header">
        <h1>UW Anthropology Instruction Workload Analytics</h1>
        <p>${quarter} | Excludes 600+ level, 99s, and Honors. Compiled for <span class="ay-tag font-bold">AY</span>.</p>
        <div class="dashboard-links">
            <a href="${baseUrl}anthro.html" target="_blank">ANTH ↗</a>
            <a href="${baseUrl}bioanth.html" target="_blank">BIO A ↗</a>
            <a href="${baseUrl}archeo.html" target="_blank">ARCHY ↗</a>
        </div>
    </div>
    <div id="current-quarter-view">
        <div class="filter-bar">
            <div class="filter-group">
                <strong>Prefixes:</strong>
                <label class="filter-label"><input type="checkbox" class="prefix-filter" value="ANTH" checked> ANTH</label>
                <label class="filter-label"><input type="checkbox" class="prefix-filter" value="ARCHY" checked> ARCHY</label>
                <label class="filter-label"><input type="checkbox" class="prefix-filter" value="BIO A" checked> BIO A</label>
            </div>
            <div class="filter-group">
                <strong>Gen Ed:</strong>
                <label class="filter-label"><input type="checkbox" class="gened-filter" value="SSc" checked> SSc</label>
                <label class="filter-label"><input type="checkbox" class="gened-filter" value="NSc" checked> NSc</label>
                <label class="filter-label"><input type="checkbox" class="gened-filter" value="None" checked> Unspecified/Other</label>
            </div>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
                <strong style="color: #4b2e83; font-size: 13px; text-transform: uppercase;"><span class="ay-tag">AY</span> SCH Target:</strong>
                <input type="range" id="bench-slider" min="100" max="1000" step="25" value="500" style="accent-color: #4b2e83; cursor: pointer;">
                <span id="bench-val" style="font-size: 13px; font-weight: bold; color: #4b2e83; width: 60px;">500 SCH</span>
            </div>
        </div>
        <div class="charts-column">
            <div class="chart-container" id="chart-instructor-sch" style="flex: 1 1 100%; min-height: 400px;"></div>
            <div class="chart-container" id="chart-lorenz-quantile" style="flex: 1 1 100%; min-height: 400px; margin-top: 15px;"></div>
        </div>
        <div class="table-container" style="margin-top: 25px;">
            <h3 style="color: #4b2e83; margin: 0 0 10px 0; font-size: 15px; border-bottom: 2px solid #b7a57a; padding-bottom: 5px;">Instructor Labor Distribution (<span class="ay-tag">AY</span> Annual Workload Summary)</h3>
            <table id="instructor-table" class="display" style="width:100%">
                <thead><tr>
                    <th title="The cleaned and standardized name of the instructor (LastName, FirstName).">Instructor</th>
                    <th title="Total assigned credits taught by this instructor across the targeted quarters.">Total Credits</th>
                    <th title="The total count of primary, single-letter lecture/seminar courses taught by this instructor across the targeted quarters.">Courses</th>
                    <th title="Total Student Credit Hours (SCH) assigned to this instructor. Underneath each total, you will see a detailed chronological formula. If co-taught, the load is divided equally.">Total SCH & Breakdown</th>
                    <th title="Calculated using Pielou's Evenness Index. Shows if an instructor's SCH is generated evenly across all their sections (🟢), or artificially inflated by a single large lecture (🔴).">Enrollment Balance</th>
                    <th title="Workload Classification dynamically scales based on the slider target (T). Brackets are calculated as: 🔴 Very High Load (>= 150% of T), 🟡 High Workload (>= 110% of T), 🟢 Balanced (40% to 110% of T), and ⚪ Under-utilized (< 40% of T). Formula: (Instructor SCH / Target SCH) * 100.">SCH Target Classification</th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<script>
    console.group("Stage 1: Initializing Dashboard Constants");
    var baseUrl = "${baseUrl}";
    var currQuarterId = "${quarter}";
    console.log("   Handshake successful! Base URL context: " + baseUrl);
    console.log("   Handshake successful! Quarter code context: " + currQuarterId);
    console.groupEnd();
</script>

<script>
    console.group("Stage 2: Running Scraper Engine");
    (async function(){
        try {
            var yearsSpring = currQuarterId.substring(0,3) === "AUT" ? (parseInt(currQuarterId.substring(3), 10) + 1) : parseInt(currQuarterId.substring(3), 10);
            console.log("   AY spring boundaries locked onto year: " + yearsSpring);
            var quarters = ["AUT" + (yearsSpring - 1), "WIN" + yearsSpring, "SPR" + yearsSpring];
            var depts = ["archeo.html", "bioanth.html", "anthro.html"];
            var urls = [];
            quarters.forEach(function(q) {
                depts.forEach(function(d) {
                    urls.push("https://www.washington.edu/students/timeschd/" + q + "/" + d);
                });
            });
            console.log("   Dynamic target matrices created (9 pages total): ", urls);
            var rawData = [];
            function cleanNameCase(name) {
                if (!name || name === "TBA" || name === "STAFF") return name;
                var parts = name.split(",");
                var last = parts[0] ? parts[0].trim() : "";
                var first = parts[1] ? parts[1].trim() : "";
                function titleCaseWord(str) {
                    return str.toLowerCase().replace(/(?:^|[^a-zA-Z0-9\\'])([a-zA-Z])/g, function(m) {
                        return m.toUpperCase();
                    });
                }
                var cleanLast = titleCaseWord(last);
                var cleanFirst = titleCaseWord(first);
                return cleanFirst ? (cleanLast + ", " + cleanFirst) : cleanLast;
            }
            function parseUWTimeSchedule(html, urlQuarter){
                var results = [];
                var text = html.replace(/<br\\s*\\/?>/gi, "\\n").replace(/<\\/tr>/gi, "\\n").replace(/<\\/table>/gi, "\\n").replace(/<\\/div>/gi, "\\n").replace(/<\\/p>/gi, "\\n").replace(/<[^>]*>/g, "");
                text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
                var lines = text.split("\\n");
                var currentCourse = null;
                for(var i=0; i<lines.length; i++){
                    var line = lines[i].trim();
                    if(!line) continue;
                    var headerMatch = line.match(/^([A-Z]{3,5}(?:\\s+[A-Z])?)\\s+(\\d{3}[A-Z]?)\\s+(.*)/);
                    if(headerMatch && !line.includes("SLN")){
                        var rawName = headerMatch[3].split(",")[0].trim().replace(/\\s{2,}/g, " ");
                        var numStr = headerMatch[2];
                        if(/^[6789]/.test(numStr) || numStr.endsWith("99") || /HONORS/i.test(rawName)){
                            currentCourse = null;
                            continue;
                        }
                        var genEd = [];
                        if(/\\bSSc\\b/i.test(rawName)) genEd.push("SSc");
                        if(/\\bNSc\\b/i.test(rawName)) genEd.push("NSc");
                        var cleanName = rawName.replace(/\\(.*?(SSc|NSc|A&H).*?\\)/ig, "").replace(/Prerequisites/ig, "").trim();
                        currentCourse = { prefix: headerMatch[1].trim(), number: numStr, name: cleanName, genEd: genEd, genEdStr: genEd.join(", ") };
                        continue;
                    }
                    if(!currentCourse) continue;
                    var slnMatch = line.match(/^(?:[A-Za-z]+\\s*)*>?\\s*(\\d{4,5})\\s+([A-Z0-9]{1,3})\\s+([0-9\\-VAR]+)\\b/);
                    if(slnMatch){
                        if(line.includes("QZ")) continue;
                        var sln = slnMatch[1];
                        var section = slnMatch[2];
                        var creditsStr = slnMatch[3];
                        if(section.length !== 1) continue;
                        var credits = 0;
                        if(creditsStr) {
                            var credMatch = creditsStr.match(/^(\\d+)/);
                            if(credMatch) credits = parseInt(credMatch[1],10);
                        }
                        if(credits === 0) continue;
                        var enrlLimMatch = line.match(/(\\d+)\\s*\\/\\s*(\\d+)/);
                        if(!enrlLimMatch) continue;
                        var enrl = parseInt(enrlLimMatch[1],10);
                        if(enrl === 0) continue;
                        var lim = parseInt(enrlLimMatch[2],10);
                        var instructor = "TBA";
                        var preEnrl = line.substring(0, line.indexOf(enrlLimMatch[0]));
                        preEnrl = preEnrl.replace(/to be arranged/ig, "");
                        var instrMatch = preEnrl.match(/([A-Za-z\\-\\']+(?:\\s+[A-Za-z\\-\\']+)*,\\s*[A-Za-z\\-\\'\\s]+)/);
                        if(instrMatch) instructor = instrMatch[1].trim();
                        else if(/STAFF/i.test(preEnrl)) instructor = "STAFF";
                        else {
                            var tokens = preEnrl.trim().split(/\\s{2,}/);
                            if(tokens.length>1) instructor = tokens[tokens.length-1];
                        }
                        instructor = instructor.replace(/\\s+(Open|Closed|Restr|Full-term)$/ig, "").trim();
                        instructor = instructor.replace(/to be arranged/ig, "").trim();
                        if(!instructor) instructor = "TBA";
                        var instructors = [instructor];
                        if(instructor.includes("/")) {
                            instructors = instructor.split("/").map(function(n){ return n.trim(); }).filter(function(n){ return n.length>0 && n.includes(","); });
                        }
                        if(instructors.length === 0) instructors = [instructor];
                        instructors.forEach(function(inst) {
                            results.push({ sln: sln, prefix: currentCourse.prefix, number: currentCourse.number, section: section, name: currentCourse.name, genEd: currentCourse.genEd, genEdStr: currentCourse.genEdStr, instructor: cleanNameCase(inst), enrl: enrl, lim: lim, credits: credits, splitCredits: credits / instructors.length, sch: (credits * enrl) / instructors.length, level: currentCourse.number.charAt(0)+"00", pct: lim>0?(enrl/lim)*100:0, quarter: urlQuarter });
                        });
                    }
                }
                return results;
            }
            for(var uIdx=0; uIdx<urls.length; uIdx++){
                var url = urls[uIdx];
                try {
                    console.log("Fetching department catalog page: " + url);
                    var response = await fetch(url);
                    if(response.ok){
                        var html = await response.text();
                        var urlQuarter = url.match(/\\/timeschd\\/([A-Z]{3}\\d{4})/i)[1].toUpperCase();
                        var parsed = parseUWTimeSchedule(html, urlQuarter);
                        console.log("Parsed " + parsed.length + " course rows from " + urlQuarter + " (" + url.split('/').pop() + ")");
                        rawData = rawData.concat(parsed);
                    }
                } catch(e) { console.error("Fetch error:", e); }
            }
            document.getElementById("loading").style.display="none";
            if(rawData.length === 0){
                document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Failed to load data or no matching courses found.</h2>';
                console.groupEnd();
                return;
            }
            document.getElementById("dashboard").style.display="block";
            const prevYShort = (yearsSpring - 1).toString().substring(2);
            const currYShort = yearsSpring.toString().substring(2);
            const ayDisplay = "AY" + prevYShort + "-" + currYShort;
            var instTable;
            var schTarget = 500;
            const colorBrewerSet2 = { "ANTH": "#8da0cb", "ARCHY": "#fc8d62", "BIO A": "#66c2a5" };
            $(".ay-tag").text(ayDisplay);
            
            function renderDashboard(){
                console.group("Generating Dashboard Calculations");
                var activePrefixes = $(".prefix-filter:checked").map(function(){ return this.value; }).get();
                var activeGenEds = $(".gened-filter:checked").map(function(){ return this.value; }).get();
                var filteredData = rawData.filter(function(d) {
                    var matchPrefix = activePrefixes.includes(d.prefix);
                    var matchGenEd = false;
                    if(d.genEd.length === 0 && activeGenEds.includes("None")) matchGenEd = true;
                    if(d.genEd.includes("SSc") && activeGenEds.includes("SSc")) matchGenEd = true;
                    if(d.genEd.includes("NSc") && activeGenEds.includes("NSc")) matchGenEd = true;
                    return matchPrefix && matchGenEd;
                });
                var totalLim = filteredData.reduce(function(s,d){ return s + d.lim; }, 0);
                var totalEnrl = filteredData.reduce(function(s,d){ return s + d.enrl; }, 0);
                var totalSch = filteredData.reduce(function(s,d){ return s + d.sch; }, 0);
                var instructorMap = {};
                filteredData.forEach(function(d) {
                    var name = d.instructor;
                    if(!instructorMap[name]) {
                        instructorMap[name] = { name: name, sch: 0, credits: 0, courseCount: 0, courses: [] };
                    }
                    instructorMap[name].sch += d.sch;
                    instructorMap[name].credits += d.splitCredits;
                    instructorMap[name].courseCount += 1;
                    instructorMap[name].courses.push(d);
                });
                var instructorSchList = Object.values(instructorMap).sort(function(a,b){ return b.sch - a.sch; });
                var avgSchPerInstructor = instructorSchList.length > 0 ? (totalSch / instructorSchList.length) : 0;
                var binSize = 50;
                var maxSch = 1000;
                var binCount = maxSch / binSize;
                var xBins = [];
                for (var b = 0; b < binCount; b++) {
                    var start = b * binSize;
                    var end = start + binSize;
                    xBins.push(start + "-" + end);
                }
                var histogramTraces = activePrefixes.map(function(prefix) {
                    var yValues = new Array(binCount).fill(0);
                    var hoverTexts = new Array(binCount).fill("");
                    var binInstructorList = Array.from({ length: binCount }, function() { return []; });
                    instructorSchList.forEach(function(inst) {
                        var prefixSch = inst.courses.filter(function(c){ return c.prefix === prefix; }).reduce(function(sum, c){ return sum + c.sch; }, 0);
                        if (prefixSch > 0) {
                            var binIdx = Math.min(binCount - 1, Math.floor(prefixSch / binSize));
                            yValues[binIdx] += 1;
                            binInstructorList[binIdx].push(inst.name.split(",")[0] + " (" + Math.round(prefixSch) + " SCH)");
                        }
                    });
                    for (var b = 0; b < binCount; b++) {
                        if (binInstructorList[b].length > 0) {
                            hoverTexts[b] = "<b>" + prefix + " (" + xBins[b] + " SCH):</b><br>" + binInstructorList[b].join("<br>");
                        } else {
                            hoverTexts[b] = "<b>" + prefix + " (" + xBins[b] + " SCH):</b><br>No Instructor";
                        }
                    }
                    return {
                        x: xBins,
                        y: yValues,
                        type: "bar",
                        name: prefix,
                        marker: { color: colorBrewerSet2[prefix], line: { color: "#ffffff", width: 0.5 } },
                        text: hoverTexts,
                        hoverinfo: "text"
                    };
                }).filter(function(trace){ return trace.y.some(function(v){ return v > 0; }); });
                
                var avgPlotCoord = (avgSchPerInstructor / binSize) - 0.5;
                var targetPlotCoord = (schTarget / binSize) - 0.5;

                Plotly.react("chart-instructor-sch", histogramTraces, {
                    title: "Instructor SCH Workload Distribution Histogram (" + ayDisplay + ")",
                    barmode: "stack",
                    xaxis: { title: "Annual Instructor Workload Bracket (SCH)" },
                    yaxis: { title: "Number of Instructors (by Discipline)" },
                    margin: { t: 50, l: 50, r: 20, b: 50 },
                    showlegend: true,
                    shapes: [
                        { type: 'line', xref: 'x', yref: 'paper', x0: avgPlotCoord, y0: 0, x1: avgPlotCoord, y1: 1, line: { color: 'rgb(16, 185, 129)', width: 2.5, dash: 'dash' } },
                        { type: 'line', xref: 'x', yref: 'paper', x0: targetPlotCoord, y0: 0, x1: targetPlotCoord, y1: 1, line: { color: 'rgb(75, 46, 131)', width: 2.5, dash: 'dot' } }
                    ],
                    annotations: [
                        { x: avgPlotCoord, y: 0.95, yref: 'paper', text: 'Average: ' + Math.round(avgSchPerInstructor) + ' SCH', showarrow: false, xanchor: 'right', yanchor: 'top', font: { color: 'rgb(16, 185, 129)', size: 10, weight: 'bold' } },
                        { x: targetPlotCoord, y: 0.90, yref: 'paper', text: 'Target: ' + schTarget + ' SCH', showarrow: false, xanchor: 'left', yanchor: 'top', font: { color: 'rgb(75, 46, 131)', size: 10, weight: 'bold' } }
                    ]
                }, {responsive: true});

                var sortedAsc = instructorSchList.slice().sort(function(a, b) { return a.sch - b.sch; });
                var N = sortedAsc.length;
                var qSize = Math.floor(N / 4);
                var remainder = N % 4;
                var groups = [[], [], [], []];
                var currentIdx = 0;
                for (var g = 0; g < 4; g++) {
                    var size = qSize + (g < remainder ? 1 : 0);
                    for (var s = 0; s < size; s++) {
                        if (currentIdx < N) {
                            groups[g].push(sortedAsc[currentIdx]);
                            currentIdx++;
                        }
                    }
                }
                var quartileSchTotals = [0, 0, 0, 0];
                var quartilePcts = [0, 0, 0, 0];
                var quartileHoverTexts = ["", "", "", ""];
                var labels = ["Bottom 25% (Q1 - lowest load)", "Lower-Mid 25% (Q2)", "Upper-Mid 25% (Q3)", "Top 25% (Q4 - highest load)"];
                groups.forEach(function(group, gIdx) {
                    var schSum = group.reduce(function(sum, inst) { return sum + inst.sch; }, 0);
                    quartileSchTotals[gIdx] = schSum;
                    var pct = totalSch > 0 ? (schSum / totalSch) * 100 : 0;
                    quartilePcts[gIdx] = pct;
                    var instList = group.map(function(inst) { return inst.name.split(",")[0] + " (" + Math.round(inst.sch) + " SCH)"; });
                    quartileHoverTexts[gIdx] = "<b>" + labels[gIdx] + "</b><br>Share of Department SCH: <b>" + pct.toFixed(1) + "%</b><br>Total Group SCH: " + Math.round(schSum).toLocaleString() + " SCH<br>Instructor Count: " + group.length + " members<br><br><b>Instructors:</b><br>" + instList.join("<br>");
                });
                var lorenzTrace = {
                    x: labels, y: quartilePcts, type: "bar",
                    marker: { color: "rgba(75, 46, 131, 0.8)", line: { color: "rgb(75, 46, 131)", width: 1.5 } },
                    text: quartilePcts.map(function(p) { return p.toFixed(1) + "%"; }), textposition: "auto", hovertext: quartileHoverTexts, hoverinfo: "text"
                };
                Plotly.react("chart-lorenz-quantile", [lorenzTrace], { title: "Quantile-Based Labor Concentration (Lorenz Share)", xaxis: { title: "Instructor Workload Quartiles" }, yaxis: { title: "Percentage Share of Total Department SCH (%)", range: [0, 100] }, margin: { t: 50, l: 50, r: 20, b: 50 } }, {responsive: true});
                        
                var tbodyHtml = "";
                console.log("Processing " + instructorSchList.length + " instructor workload formulas for rendering...");
                instructorSchList.forEach(function(inst) {
                    var totalSch = Math.round(inst.sch);
                    var cleanName = inst.name;
                    var mainSch = "<strong style='font-size: 13px; color: #222;'>" + totalSch.toLocaleString() + " SCH</strong>";                        
                    var totalCredits = parseFloat(inst.credits.toFixed(1));
                    var creditCell = "<strong style='font-size: 13px; color: #222;'>" + totalCredits + "</strong>";

                    var detailLines = inst.courses.map(function(c) {
                        var qAbbr = "AU";
                        if (c.quarter) {
                            if (c.quarter.includes("Winter") || c.quarter.includes("WIN")) qAbbr = "WI";
                            else if (c.quarter.includes("Spring") || c.quarter.includes("SPR")) qAbbr = "SP";
                            else if (c.quarter.includes("Summer") || c.quarter.includes("SUM")) qAbbr = "SU";
                        }
                        var qYearMatch = c.quarter ? c.quarter.match(/\\d{4}/) : null;
                        var qYear = qYearMatch ? qYearMatch[0] : "";
                        var qYrShort = qYear ? qYear.substring(2) : "";
                        var qDisplay = qAbbr + qYrShort;
                        return "• " + qDisplay + " " + c.prefix + " " + c.number + " " + c.credits + " cr " + c.enrl + "/" + c.lim + " students";
                    }).join("<br>");
                    
                    var schCellContent = mainSch + "<div style='font-size: 10px; color: rgb(75, 85, 99); font-family: monospace; line-height: 1.4; margin-top: 5px; border-top: 1px solid rgb(229, 231, 235); padding-top: 4px;'>" + detailLines + "</div>";                        
                    
                    var balanceCell = "";
                    var balanceOrder = 0;
                    var nCourses = inst.courses.length;
                    if (nCourses === 1) {
                        balanceCell = "<div style='font-size: 12px; line-height: 1.4;'><span style='color: rgb(107, 114, 128);'>⚪ Single Course (N/A)</span><br><span style='color: #666; font-size: 10px;'>100% of SCH from 1 class</span></div>";
                        balanceOrder = -1;
                    } else {
                        var maxSchCourse = null;
                        var maxLocalSch = -1;
                        var entropy = 0;
                        inst.courses.forEach(function(c) {
                            if (c.sch > maxLocalSch) {
                                maxLocalSch = c.sch;
                                maxSchCourse = c;
                            }
                            var p = c.sch / totalSch;
                            if (p > 0) {
                                entropy -= p * Math.log(p);
                            }
                        });
                        var maxEntropy = Math.log(nCourses);
                        var evenness = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
                        var dependency = (maxLocalSch / totalSch) * 100;
                        var megaclassName = maxSchCourse ? maxSchCourse.prefix + " " + maxSchCourse.number : "";
                        
                        balanceOrder = Math.round(evenness);
                        var balProfile = "";
                        var balEmoji = "";
                        var balColor = "";
                        
                        if (evenness >= 75) {
                            balProfile = "Balanced";
                            balEmoji = "🟢";
                            balColor = "color: rgb(4, 120, 87);";
                        } else if (evenness >= 45) {
                            balProfile = "Moderately Skewed";
                            balEmoji = "🟡";
                            balColor = "color: rgb(180, 83, 9);";
                        } else {
                            balProfile = "Highly Skewed";
                            balEmoji = "🔴";
                            balColor = "color: rgb(185, 28, 28); font-weight: bold;";
                        }
                        
                        balanceCell = "<div style='font-size: 12px; line-height: 1.4;'><strong style='" + balColor + "'>" + balEmoji + " " + balProfile + " (" + Math.round(evenness) + "% Even)</strong><br><span style='color: #666; font-size: 10px;'>" + Math.round(dependency) + "% of SCH from " + megaclassName + "</span></div>";
                    }

                    var pct = Math.round((totalSch / schTarget) * 100);
                    var profile = "Balanced Load";
                    var badgeColor = "background-color: rgb(209, 250, 229); color: rgb(4, 120, 87); border: 1px solid rgb(16, 185, 129);";
                    var emoji = "🟢";
                    if (totalSch > schTarget * 1.5) {
                        profile = "Very High Load";
                        badgeColor = "background-color: rgb(254, 226, 226); color: rgb(185, 28, 28); border: 1px solid rgb(239, 68, 68); font-weight: bold;";
                        emoji = "🔴";
                    } else if (totalSch > schTarget * 1.1) {
                        profile = "High Workload";
                        badgeColor = "background-color: rgb(254, 243, 199); color: rgb(180, 83, 9); border: 1px solid rgb(245, 158, 11);";
                        emoji = "🟡";
                    } else if (totalSch < schTarget * 0.4) {
                        profile = "Under-utilized";
                        badgeColor = "background-color: rgb(243, 244, 246); color: rgb(75, 85, 99); border: 1px solid rgb(209, 213, 219);";
                        emoji = "⚪";
                    }
                    var statusBadge = "<span style='padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: sans-serif; " + badgeColor + "' title='SCH is " + pct + "% of the target (" + schTarget + " SCH)'>" + emoji + " " + profile + " (" + pct + "%)</span>";
                    
                    tbodyHtml += "<tr>" +
                        "<td><strong style='color:rgb(75, 46, 131);'>" + cleanName + "</strong></td>" +
                        "<td style='text-align: center;' data-order='" + totalCredits + "'>" + creditCell + "</td>" +
                        "<td style='text-align: center;' data-order='" + inst.courseCount + "'>" + inst.courseCount + "</td>" +
                        "<td data-order='" + totalSch + "'>" + schCellContent + "</td>" +
                        "<td data-order='" + balanceOrder + "'>" + balanceCell + "</td>" +
                        "<td data-order='" + totalSch + "'>" + statusBadge + "</td>" +
                    "</tr>";
                });
                
                try {
                    if (instTable) {
                        console.log("   🧹 Resetting existing DataTables...");
                        instTable.destroy();
                    }
                    console.log("   ✏️ Injecting rows into DOM.");
                    $("#instructor-table tbody").html(tbodyHtml);
                    
                    console.log("   ⚡ Initializing DataTables...");
                    instTable = $("#instructor-table").DataTable({
                        pageLength: 15,
                        order: [[3, "desc"]],
                        language: {search: "Search Instructor:"}
                    });
                    console.log("   ✅ Render Successful!");
                } catch(tableErr) {
                    console.error("   ❌ Exception during DataTable binding: ", tableErr);
                }
                console.groupEnd();
            }
            try {
                renderDashboard();
            } catch(err) {
                console.error("❌ Exception during render calculations workflow: ", err);
            }
            $(".prefix-filter, .gened-filter").on("change", renderDashboard);
            $("#bench-slider").on("input", function(){
                schTarget = parseInt(this.value, 10);
                $("#bench-val").text(schTarget + " SCH");
                renderDashboard();
            });
            window.addEventListener("resize", function(){
                Plotly.Plots.resize("chart-instructor-sch");
                Plotly.Plots.resize("chart-lorenz-quantile");
            });
            console.groupEnd();
        } catch (error) {
            console.error("Critical Stage 2 Scraper Error: ", error);
        }
    })();
</script>
</body>
</html>`;

    newWin.document.write(htmlContent);
    newWin.document.close();
    
    console.log("%c📊 Successfully built final standalone dashboard layout in the new tab!", "color: rgb(16, 185, 129); font-weight: bold;");
    console.groupEnd();
})();