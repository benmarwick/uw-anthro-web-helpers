javascript:!function(){const t=window.location.href.match(/\/timeschd\/([A-Z]{3}\d{4})/i);if(!t)return void alert("Please click this bookmarklet while on a UW Time Schedule page (e.g., /timeschd/SPR2026/).");const e=t[1].toUpperCase(),r=(e.substring(0,3),parseInt(e.substring(3),10),"https://www.washington.edu/students/timeschd/"+e+"/"),o=(window.location.pathname.match(/\/([^\/]+\.html?)$/i)||[])[1]||"",l=window.open("","_blank");if(!l)return void alert("Popup blocked! Please allow popups for washington.edu to generate the dashboard.");const a=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${e} UW Workload Dashboard</title><link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css"><script src="https://code.jquery.com/jquery-3.6.0.min.js"><\/script><script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"><\/script><style>body{margin:0;padding:0;background-color:#f4f6f8;font-family:'Open Sans',Arial,sans-serif}.dashboard-header{background:#4b2e83;color:white;padding:10px 25px;box-shadow:0 2px 5px rgba(0,0,0,0.2);display:flex;align-items:center;flex-wrap:wrap;gap:15px}.dashboard-header h1{margin:0;font-size:20px;font-weight:600;white-space:nowrap}.dashboard-header p{margin:0;font-size:13px;color:#e8e3d3;flex:1;min-width:300px}.dashboard-links{margin:0;font-size:13px;white-space:nowrap}.dashboard-links a{color:#fff;text-decoration:none;border-bottom:1px dotted rgba(255,255,255,0.6);margin-right:15px;transition:color 0.2s}.dashboard-links a:hover{color:#b7a57a;border-bottom-style:solid}.filter-bar{background:white;margin:15px 25px 0;padding:10px 20px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border-left:4px solid #85754d;display:flex;flex-wrap:wrap;gap:25px;align-items:center}.filter-group{display:flex;gap:12px;align-items:center}.filter-group strong{color:#4b2e83;font-size:13px;text-transform:uppercase;letter-spacing:0.5px}.filter-label{display:flex;align-items:center;gap:4px;font-size:13px;color:#333;cursor:pointer}.tf-row{display:flex;flex-wrap:wrap;gap:15px;padding:15px 25px 0;align-items:stretch}.inst-bar{display:block}.inst-header{display:flex;gap:14px;align-items:center;margin-bottom:8px}.inst-header strong{color:#4b2e83;font-size:13px;text-transform:uppercase;letter-spacing:0.5px}.inst-header a{font-size:12px;color:#4b2e83}#inst-count{font-size:12px;color:#777}#instructor-filters{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 16px;max-height:140px;overflow-y:auto}.tf-card{background:white;padding:12px 14px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.05);min-width:0;box-sizing:border-box}#tf-bars{flex:1.6 1 520px}#tf-lorenz{flex:0.8 1 290px}#tf-slope{flex:1.2 1 420px}.tf-card h4{margin:0 0 2px;font-size:13px;color:#4b2e83}.tf-card .tf-sub{font-size:11px;color:#52514e;margin:0 0 6px;line-height:1.4}.tf-key{display:flex;gap:12px;font-size:11px;color:#52514e;margin:0 0 4px}.tf-key i{display:inline-block;width:12px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}.tf-card svg{display:block;font-family:inherit;overflow:visible}.tf-card .wl-p{transition:opacity .12s}.tf-card .wl-dim{opacity:.15}.tf-card .wl-hi text,.tf-card tr.wl-hi td{font-weight:600}.tf-tab{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;margin-top:4px;font-variant-numeric:tabular-nums}.tf-tab th{font-weight:600;color:#52514e;text-align:left;border-bottom:1px solid #e1e0d9;padding:0 3px 2px;font-size:10.5px;vertical-align:bottom}.tf-tab td{padding:0 3px;height:13px;line-height:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0b0b0b}.tf-tab .r{text-align:right}.tf-tab .k{color:#898781;width:16px}.tf-tab .sch{width:38px}.tf-tab .psch{width:40px}.tf-tab .stu{width:50px}.tf-tab .cum{width:48px}.tf-tab td.cum{color:#52514e}.tf-tab td.cum b{color:#0b0b0b}.tf-card .wl-p{cursor:default}.tf-card svg text{font-variant-numeric:tabular-nums}.charts-column{display:flex;flex-direction:row;flex-wrap:wrap;gap:15px;padding:15px 25px}.chart-container{flex:1 1 400px;width:100%;background:white;padding:15px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.05);min-height:420px}.table-container{background:white;margin:0 25px 25px;padding:15px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}.ay-tag{font-weight:bold;letter-spacing:0.5px}.prefix-tag{display:inline-block;padding:1px 6px;border-radius:4px;color:white;font-size:11px;font-weight:600}#prefix-input{width:350px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:13px;transition:border-color 0.2s,box-shadow 0.2s}#prefix-input:focus{outline:none;border-color:#4b2e83;box-shadow:0 0 0 3px rgba(75,46,131,0.15)}#prefix-input.valid{border-color:#66c2a5}#prefix-input.invalid{border-color:#e41a1c}#prefix-hint{font-size:11px;color:#666;min-width:200px;display:inline-block}#prefix-hint.warning{color:#ff7f00}#active-prefix-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding:0 25px}.prefix-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 8px;border-radius:16px;font-size:12px;font-weight:500;color:white;box-shadow:0 1px 2px rgba(0,0,0,0.1)}.prefix-chip .chip-count{background:rgba(0,0,0,0.2);padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600}.prefix-chip .chip-remove{cursor:pointer;font-size:14px;line-height:1;padding:2px;border-radius:50%;transition:background 0.2s}.prefix-chip .chip-remove:hover{background:rgba(0,0,0,0.3)}#ay-select{padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-weight:600;color:#4b2e83;cursor:pointer}#ay-select:disabled,.qtr-filter:disabled{cursor:wait;opacity:0.6}.view-toggle{display:inline-flex;border:1px solid rgba(255,255,255,.6);border-radius:16px;overflow:hidden;flex:none}.vt-btn{background:transparent;color:#fff;border:0;padding:5px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.vt-btn.on{background:#fff;color:#4b2e83}.vt-btn:focus-visible{outline:2px solid #b7a57a;outline-offset:-2px}#ts-main{flex:2 1 560px}#ts-dept{flex:1 1 300px}#ts-cards,#ts-heat,#ts-table{flex:1 1 100%}.seg{display:inline-flex;border:1px solid #c3c2b7;border-radius:6px;overflow:hidden;flex:none}.seg button{background:#fff;border:0;border-left:1px solid #e1e0d9;padding:5px 10px;font:inherit;font-size:12px;color:#52514e;cursor:pointer}.seg button:first-child{border-left:0}.seg button.on{background:#4b2e83;color:#fff}.seg button:focus-visible{outline:2px solid #4b2e83;outline-offset:-2px}#ts-span{padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-weight:600;color:#4b2e83;cursor:pointer}#ts-range{font-size:12px;color:#52514e}.ts-btn{background:#fff;border:1px solid #4b2e83;color:#4b2e83;border-radius:14px;padding:5px 14px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}.ts-btn:hover{background:#f3eff9}#ts-progress{display:none;align-items:center;gap:8px;font-size:12px;color:#52514e}.ts-pbar{width:160px;height:5px;background:#e4ddf1;border-radius:3px;overflow:hidden}#ts-pfill{height:5px;background:#4b2e83;width:0;transition:width .2s}#ts-picker{position:relative;display:flex;flex-wrap:wrap;gap:6px;align-items:center;border:1px solid #c3c2b7;border-radius:6px;padding:5px 6px;background:#fff;cursor:text}#ts-picker:focus-within{border-color:#4b2e83;box-shadow:0 0 0 3px rgba(75,46,131,.15)}#ts-chips{display:contents}.ts-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 3px 3px 9px;border:1px solid #e1e0d9;border-radius:14px;font-size:12px;color:#0b0b0b;background:#faf9f7;cursor:default}.ts-chip i{width:14px;height:3px;border-radius:2px;display:inline-block}.ts-chip button{border:0;background:none;color:#898781;font-size:14px;line-height:1;cursor:pointer;padding:1px 5px;border-radius:50%}.ts-chip button:hover{color:#0b0b0b;background:#ecebe6}#ts-search{flex:1 1 200px;border:0;outline:0;font:inherit;font-size:13px;padding:4px;min-width:160px}#ts-suggest{position:absolute;left:0;top:100%;margin-top:4px;z-index:20;background:#fff;border:1px solid #e1e0d9;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.12);min-width:340px;max-height:300px;overflow:auto;display:none}.ts-opt{display:flex;justify-content:space-between;gap:14px;padding:5px 10px;font-size:12px;cursor:pointer}.ts-opt b{font-weight:500}.ts-opt span{color:#898781;font-variant-numeric:tabular-nums}.ts-opt.act,.ts-opt[data-k]:hover{background:#f3eff9}.ts-opt.none{color:#898781;cursor:default}#ts-sel-count.warn{color:#a3271f;font-weight:600}#ts-tip{position:fixed;z-index:2147483000;display:none;pointer-events:none;background:#fff;border:1px solid #e1e0d9;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.14);padding:8px 10px;font-size:12px;line-height:1.45;color:#0b0b0b;max-width:360px;font-variant-numeric:tabular-nums}.tt-h{font-weight:600;margin-bottom:3px}.tt-h span,.tt-m{color:#898781;font-weight:400}.tt-r{display:flex;align-items:baseline;gap:6px;white-space:nowrap}.tt-r i{display:inline-block;width:12px;height:3px;border-radius:2px;flex:none;transform:translateY(-3px)}.tt-r.hi{background:#f3eff9;margin:0 -4px;padding:0 4px;border-radius:3px}.tt-r.off{color:#898781}.tt-f{border-top:1px solid #ecebe6;margin-top:5px;padding-top:4px;color:#52514e}.ts-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;justify-content:space-between;margin-bottom:2px}.ts-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.ts-card{border:1px solid #ecebe6;border-radius:6px;padding:10px 12px;transition:box-shadow .12s}.ts-card:hover{box-shadow:0 2px 10px rgba(0,0,0,.08)}.ts-card h5{margin:0 0 4px;font-size:13px;color:#0b0b0b;display:flex;align-items:center;gap:7px}.ts-card h5 i{width:16px;height:4px;border-radius:2px;display:inline-block;flex:none}.ts-x{margin-left:auto;border:0;background:none;color:#898781;font-size:15px;cursor:pointer;border-radius:50%;padding:0 6px}.ts-x:hover{color:#0b0b0b;background:#ecebe6}.ts-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 10px;margin:6px 0 8px}.ts-stat b{display:block;font-size:17px;font-weight:600;color:#0b0b0b;font-variant-numeric:tabular-nums;line-height:1.2}.ts-stat span{font-size:10.5px;color:#52514e;line-height:1.3;display:block}.ts-stat em{font-style:normal;color:#898781}.ts-sec{font-size:10px;color:#52514e;text-transform:uppercase;letter-spacing:.05em;margin:8px 0 3px;font-weight:600}.ts-mix{display:flex;height:16px;border-radius:3px;overflow:hidden;gap:2px;font-size:9.5px;line-height:16px;white-space:nowrap}.ts-mix span{padding-left:4px;overflow:hidden;min-width:2px}.ts-courses{font-size:11.5px;margin:0;padding:0;list-style:none;font-variant-numeric:tabular-nums}.ts-courses li{display:flex;gap:8px;justify-content:space-between;padding:2px 0;border-bottom:1px solid #f4f3ef}.ts-courses em{font-style:normal;color:#898781}.ts-courses li.more{color:#898781}.ts-notes{margin:8px 0 0;padding-left:16px;font-size:11.5px;color:#52514e;line-height:1.45}.ts-heat-wrap{max-height:540px;overflow-y:auto}.ts-name{cursor:pointer}.ts-name:hover,.ts-name:focus{text-decoration:underline;outline:none}.ts-tbl-wrap{max-height:560px;overflow:auto;margin-top:6px}table.ts-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}.ts-tbl th{position:sticky;top:0;background:#fff;z-index:1;text-align:right;font-weight:600;color:#52514e;font-size:11px;padding:4px 6px;border-bottom:1px solid #e1e0d9;white-space:nowrap;user-select:none}.ts-tbl th.srt{cursor:pointer}.ts-tbl th.srt:hover,.ts-tbl th.on{color:#4b2e83}.ts-tbl th.l,.ts-tbl td.l{text-align:left}.ts-tbl td{padding:2px 6px;text-align:right;border-bottom:1px solid #f4f3ef;white-space:nowrap;color:#0b0b0b}.ts-tbl tr.ts-row{cursor:pointer}.ts-tbl tr.ts-row:hover td{background:#faf8fd}.ts-tbl tr.sel td{background:#f6f3fb}.ts-tbl td.pt{color:#898781}.ts-tbl .na{color:#c3c2b7}.ts-tbl .sw{display:inline-block;width:10px;height:4px;border-radius:2px;margin-right:6px;vertical-align:3px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}#ts-tsearch{padding:5px 9px;border:1px solid #ccc;border-radius:4px;font-size:12px;width:220px}.ts-ov{cursor:crosshair}.ts-ov:focus{outline:none}.ts-ov:focus-visible{stroke:#4b2e83;stroke-width:1}#tf-appt{flex:1 1 420px}#tf-cec{flex:1.4 1 520px}#cec-status{font-size:11.5px;color:#52514e;max-width:520px}#cec-status.warn{color:#a3271f}#cec-status a{color:#4b2e83}table.cec-tab{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;margin-top:4px}.cec-tab th{font-weight:600;color:#52514e;font-size:11px;text-align:left;border-bottom:1px solid #e1e0d9;padding:3px 6px;white-space:nowrap}.cec-tab td{padding:4px 6px;border-bottom:1px solid #f4f3ef;white-space:nowrap;color:#0b0b0b}.cec-tab .r{text-align:right}.cec-bar{display:inline-block;width:110px;height:8px;background:#f0efec;border-radius:2px;margin-right:6px;vertical-align:0;overflow:hidden}.cec-bar i{display:block;height:8px;background:#4b2e83;border-radius:2px}.cec-m{color:#898781;font-size:11px}.cec-sum{font-size:11.5px;margin:2px 0 4px;color:#52514e}.cec-sum b{color:#0b0b0b;font-size:13px}.cec-none{font-size:11.5px;color:#898781;margin:2px 0}#tf-cec svg{display:block;overflow:visible}</style></head><body><div id="loading" style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column"><h1 style="color:#4b2e83;">Loading ${e} Workload Dashboard...</h1><p style="color:#666;">Parsing catalogs and evaluating workloads.</p></div><div id="dashboard" style="display:none"><div class="dashboard-header"><h1>UW Instruction Workload Analytics</h1><p><span id="qtr-list">${e}</span> | Add prefixes to load departments | Excludes 600+ level, 99s, and Honors. Compiled for <span class="ay-tag font-bold">AY</span>.</p><div class="dashboard-links"><a href="${r}" id="all-depts-link" target="_blank">All Departments ↗</a><a href="https://admin.artsci.washington.edu/curriculum" target="_blank">CAS Curriculum ↗</a><a href="https://www.washington.edu/cec/toc.html" target="_blank" title="UW Course Evaluation Catalog (UW NetID required)">Course Evaluation Catalog ↗</a></div><div class="view-toggle" role="group" aria-label="View"><button type="button" class="vt-btn on" data-view="year" aria-pressed="true">Year</button><button type="button" class="vt-btn" data-view="ts" aria-pressed="false">Time series</button></div></div><div class="filter-bar"><div class="filter-group" title="Pick the academic year, then the quarters to count. Summer is left out by default. In the Time series view, the year picked is the last year shown."><strong>Year:</strong><select id="ay-select" aria-label="Academic year"></select><label class="filter-label"><input type="checkbox" class="qtr-filter" value="AUT" checked> <span class="qtr-name">AUT</span></label><label class="filter-label"><input type="checkbox" class="qtr-filter" value="WIN" checked> <span class="qtr-name">WIN</span></label><label class="filter-label"><input type="checkbox" class="qtr-filter" value="SPR" checked> <span class="qtr-name">SPR</span></label><label class="filter-label"><input type="checkbox" class="qtr-filter" value="SUM"> <span class="qtr-name">SUM</span></label></div><div class="filter-group"><strong>Prefixes:</strong><input type="text" id="prefix-input" placeholder="Enter prefixes, comma-separated (e.g. ANTH, ARCHY, BIO A)" spellcheck="false" autocomplete="off"><span id="prefix-hint">Enter prefixes to load data...</span></div><div class="filter-group"><strong>Gen Ed:</strong><label class="filter-label"><input type="checkbox" class="gened-filter" value="SSc" checked> SSc</label><label class="filter-label"><input type="checkbox" class="gened-filter" value="NSc" checked> NSc</label><label class="filter-label"><input type="checkbox" class="gened-filter" value="None" checked> Unspecified/Other</label></div><div class="filter-group" id="cec-group" style="margin-left:10px;border-left:1px solid #ddd;padding-left:15px;"><label class="filter-label" title="Show course evaluations from the UW Course Evaluation Catalog (UW NetID required). Information from the catalog is for members of the UW academic community; publication or redistribution to anyone without a current UW NetID is prohibited."><input type="checkbox" id="cec-on" checked> <strong>Course evals</strong></label><span id="cec-status"></span></div><div style="margin-left:auto;display:flex;align-items:center;gap:8px;"><strong style="color:#4b2e83;font-size:13px;text-transform:uppercase;"><span class="ay-tag">AY</span> SCH Target:</strong><input type="range" id="bench-slider" min="100" max="1000" step="25" value="500" style="accent-color:#4b2e83;cursor:pointer;"><span id="bench-val" style="font-size:13px;font-weight:bold;color:#4b2e83;width:60px;">500 SCH</span></div></div><div id="active-prefix-chips"></div><div id="current-quarter-view"><div class="filter-bar inst-bar" id="instructor-bar" style="display:none"><div class="inst-header"><strong>Instructors:</strong><a href="#" id="inst-all">Select all</a><a href="#" id="inst-none">Clear</a><span id="inst-count"></span></div><div id="instructor-filters"></div></div><div class="tf-row"><div class="tf-card" id="tf-bars"></div><div class="tf-card" id="tf-lorenz"></div><div class="tf-card" id="tf-slope"></div></div><div class="tf-row" id="cec-row" style="display:none"><div class="tf-card" id="tf-appt"></div><div class="tf-card" id="tf-cec"></div></div><div class="table-container" style="margin-top:25px;"><h3 style="color:#4b2e83;margin:0 0 10px 0;font-size:15px;border-bottom:2px solid #b7a57a;padding-bottom:5px;">Instructor Labor Distribution (<span class="ay-tag">AY</span> Annual Workload Summary)</h3><table id="instructor-table" class="display" style="width:100%"><thead><tr><th title="The cleaned and standardized name of the instructor (LastName, FirstName).">Instructor</th><th title="Total assigned credits taught by this instructor across the targeted quarters.">Total Credits</th><th title="The total count of primary, single-letter lecture/seminar courses taught by this instructor across the targeted quarters.">Courses</th><th title="Total Student Credit Hours (SCH) assigned to this instructor. Underneath each total, you will see a detailed chronological formula. If co-taught, the load is divided equally.">Total SCH & Breakdown</th><th title="Calculated using Pielou's Evenness Index. Shows if an instructor's SCH is generated evenly across all their sections (🟢), or artificially inflated by a single large lecture (🔴).">Enrollment Balance</th><th title="Workload Classification dynamically scales based on the slider target (T). Brackets are calculated as: 🔴 Very High Load (>= 150% of T), 🟡 High Workload (>= 110% of T), 🟢 Balanced (40% to 110% of T), and ⚪ Under-utilized (< 40% of T). Formula: (Instructor SCH / Target SCH) * 100.">SCH Target Classification</th><th title="From the UW Course Evaluation Catalog: the combined median of items 1 to 4 (course as a whole, course content, instructor's contribution, instructor's effectiveness), computed by this dashboard from the response shares and pooled over the instructor's evaluated sections, weighted by the number surveyed. 5 = Excellent, 0 = Very Poor. Shown with the sections evaluated and the number surveyed and enrolled. Not sortable: ratings should be read with class size and response.">Course Evaluations</th></tr></thead><tbody></tbody></table></div></div><div id="time-series-view" style="display:none"><div class="filter-bar"><div class="filter-group"><strong>Span:</strong><select id="ts-span" aria-label="Number of academic years"><option value="5">5 years</option><option value="10" selected>10 years</option><option value="15">15 years</option><option value="20">20 years</option></select><span id="ts-range"></span></div><div class="filter-group"><strong>Measure:</strong><div class="seg" id="ts-measure" role="group" aria-label="Measure"><button type="button" data-m="sch" class="on" aria-pressed="true">SCH</button><button type="button" data-m="share" aria-pressed="false">% of dept SCH</button><button type="button" data-m="stu" aria-pressed="false">Students</button><button type="button" data-m="sec" aria-pressed="false">Courses</button><button type="button" data-m="size" aria-pressed="false">Class size</button></div></div><div id="ts-progress" role="status"><div class="ts-pbar"><div id="ts-pfill"></div></div><span id="ts-pstat"></span></div><div style="margin-left:auto"><button type="button" class="ts-btn" id="ts-csv" title="One row per instructor and academic year, for the years, prefixes, quarters and Gen Ed filter shown">Download CSV</button></div></div><div class="filter-bar inst-bar"><div class="inst-header"><strong>Compare instructors:</strong><a href="#" id="ts-top" title="The four instructors with the most SCH in the latest complete year">Top 4 by SCH</a><a href="#" id="ts-clear">Clear</a><span id="ts-sel-count"></span></div><div id="ts-picker"><span id="ts-chips"></span><input type="text" id="ts-search" placeholder="Type a name to add an instructor" autocomplete="off" spellcheck="false" aria-label="Add an instructor to the comparison"><div id="ts-suggest" role="listbox"></div></div></div><div class="tf-row"><div class="tf-card" id="ts-main"></div><div class="tf-card" id="ts-dept"></div></div><div class="tf-row"><div class="tf-card" id="ts-cards"></div></div><div class="tf-row"><div class="tf-card" id="ts-heat"></div></div><div class="tf-row" style="padding-bottom:25px"><div class="tf-card" id="ts-table"></div></div></div><div id="ts-tip" role="tooltip"></div></div>`;l.document.write(a),l.document.write(`<script>var baseUrl="${r}";var currQuarterId="${e}";var startPage="${o}";<\/script>`),l.document.write(`<script>(${function(){var instNative={};function instGroups(recs){var counts={},parts={},bySur={},home={},keyOf={},groups={};recs.forEach(function(d){counts[d.instructor]=(counts[d.instructor]||0)+1});Object.keys(counts).forEach(function(nm){var u=nm.toUpperCase(),c=u.split(",");if(parts[u])return;parts[u]={u:u,sur:c.length>1?c[0].trim():null,giv:(c[1]||"").trim().split(/\s+/).filter(Boolean)};home[u]=u;if(parts[u].sur)(bySur[parts[u].sur]=bySur[parts[u].sur]||[]).push(parts[u])});function fits(a,b){var n=Math.min(a.giv.length,b.giv.length);if(0===n)return!1;for(var i=0;i<n;i++){var x=a.giv[i],y=b.giv[i];if(x!==y&&!(1===x.length&&y.charAt(0)===x)&&!(1===y.length&&x.charAt(0)===y))return!1}return!0}Object.keys(bySur).forEach(function(s){var list=bySur[s],full=list.filter(function(p){return!list.some(function(q){return q!==p&&fits(p,q)&&q.giv.join(" ").length>p.giv.join(" ").length})});list.forEach(function(p){var homes=full.filter(function(f){return f===p||fits(p,f)});1===homes.length&&(home[p.u]=homes[0].u)})});Object.keys(counts).forEach(function(nm){var k=home[nm.toUpperCase()];keyOf[nm]=k;(groups[k]=groups[k]||{key:k,names:[]}).names.push(nm)});Object.keys(groups).forEach(function(k){var g=groups[k];g.names.sort(function(a,b){return(instNative[b]?1:0)-(instNative[a]?1:0)||counts[b]-counts[a]||b.length-a.length||a.localeCompare(b)});g.label=g.names[0]});return{keyOf:keyOf,groups:groups}}!async function(){try{var t="AUT"===currQuarterId.substring(0,3)?parseInt(currQuarterId.substring(3),10)+1:parseInt(currQuarterId.substring(3),10),e=["AUT"+(t-1),"WIN"+t,"SPR"+t],r={"A A":"aa.html","A E":"ae.html","A S":"88aerosci.html",AAS:"asamst.html",ACADEM:"academ.html",ACCTG:"acctg.html",ADMIN:"admin.html",AES:"aes.html",AFRAM:"afamst.html",AIS:"ais.html",AMATH:"appmath.html",AMHAR:"amhar.html",ANEST:"anest.html",ANTH:"anthro.html",ARAB:"arabic.html",ARAMIC:"aramic.html",ARCH:"archit.html",ARCHY:"archeo.html",ARCTIC:"arctic.html",ART:"art.html","ART H":"arthis.html",ARTS:"arts.html",ARTSCI:"artsci.html",ASIAN:"asianll.html",ASL:"asl.html",ASTBIO:"astbio.html",ASTR:"astro.html",ATMOS:"atmoscs.html","B A":"ba.html","B CMU":"buscomm.html","B E":"be.html","B ECON":"busecon.html","B H":"bh.html","B POL":"bpol.html","B STR":"biostruct.html","BA RM":"barm.html","BATY E":"batye.html",BCMS:"bcms.html",BENG:"beng.html",BIBHEB:"bibheb.html",BIME:"bime.html","BIO A":"bioanth.html",BIOC:"bioch.html",BIOEN:"bioeng.html",BIOL:"biology.html",BIOST:"biostat.html",BPSD:"bpsd.html",BULGR:"bulgar.html","BUS AN":"busan.html","C ENV":"cenv.html","C LIT":"complit.html","C MED":"compmed.html",CEE:"cee.html",CEP:"commenv.html",CESG:"cesg.html",CESI:"cesi.html",CET:"cet.html",CEWA:"cewa.html",CFRM:"cfrm.html",CHEM:"chem.html","CHEM E":"cheng.html",CHGTAI:"chgtai.html",CHID:"chid.html",CHIN:"chinese.html",CHSTU:"chist.html","CL AR":"clarch.html","CL LI":"cling.html",CLAS:"clas.html",CM:"constmgmt.html",CMS:"cms.html",COM:"com.html",COMMLD:"commld.html",CONJ:"conj.html",COPTIC:"coptic.html","CS&SS":"cs&ss.html",CSDE:"csde.html",CSE:"cse.html","CSE D":"csed.html",CZECH:"czech.html","D HYG":"denthy.html",DANCE:"dance.html",DANISH:"danish.html",DATA:"data.html",DENT:"dent.html",DENTCL:"dentcl.html",DENTEL:"dentel.html",DENTFN:"dentfn.html",DENTGP:"dentgp.html",DENTPC:"dentpc.html",DENTSL:"dentsl.html",DERM:"derm.html",DESIGN:"design.html","DIS ST":"disst.html",DPHS:"dphs.html",DRAMA:"drama.html",DXARTS:"dxarts.html","E E":"ee.html",EBIZ:"ebiz.html",ECE:"ece.html",ECFS:"ecfs.html",ECON:"econ.html","EDC&I":"edci.html",EDLPS:"edlp.html",EDPSY:"edpsy.html",EDSPE:"sped.html",EDTEP:"teached.html",EDUC:"indsrf.html",EGYPT:"egypt.html",ENDO:"endo.html",ENGL:"engl.html",ENGR:"engr.html",ENTRE:"entre.html","ENV H":"envh.html",ENVIR:"envst.html",EPI:"epidem.html",ESMS:"esms.html",ESRM:"esrm.html",ESS:"ess.html",ESTO:"eston.html",ETHICS:"ethics.html",FAMED:"famed.html",FHL:"fhl.html",FIN:"finance.html",FINN:"finnish.html",FISH:"fish.html",FRENCH:"french.html","G H":"gh.html",GCNSL:"gcnsl.html",GEEZ:"geez.html","GEN ST":"genst.html",GENOME:"genome.html",GEOG:"geog.html",GEORG:"georg.html",GERMAN:"germ.html",GIS:"gis.html",GLITS:"glits.html",GRDSCH:"grad.html",GREEK:"greek.html",GWSS:"gwss.html",HCDE:"hcde.html",HCID:"hcid.html",HCSS:"hcss.html",HDD:"hdd.html",HEBR:"hebrew.html",HEOR:"heor.html",HIHIM:"95hihim.html",HINDI:"hindi.html",HMS:"hms.html",HONORS:"hnrs.html",HPS:"hps.html",HRMOB:"hrmob.html",HSERV:"hlthsvcs.html",HSMGMT:"hsmgmt.html",HSTAA:"histam.html",HSTAFM:"hstafm.html",HSTAM:"ancmedh.html",HSTAS:"histasia.html",HSTCMP:"hstcmp.html",HSTEU:"modeuro.html",HSTLAC:"hstlac.html",HSTRY:"hstry.html",HUBIO:"humbio.html",HUM:"centhum.html","I BUS":"intlbus.html","I S":"infosys.html",ICEL:"icel.html",IECMH:"iecmh.html",IMMUN:"immun.html",IMT:"imt.html","IND E":"inde.html",INDIV:"indiv.html",INDN:"indian.html",INDO:"indo.html",INFO:"info.html",INSC:"insc.html",INTSCI:"intsci.html",IPHD:"iphd.html",IPM:"ipm.html",ITAL:"italian.html",JAPAN:"japanese.html","JEW ST":"jewst.html",JSIS:"jsis.html","JSIS A":"jsisa.html","JSIS B":"jsisb.html","JSIS C":"jsisc.html","JSIS D":"jsisd.html","JSIS E":"jsise.html",KAZAKH:"kazakh.html",KHMER:"khmer.html",KOREAN:"korean.html",KYRGYZ:"kyrgyz.html","L ARCH":"landscape.html","LAB M":"labmed.html",LABOR:"labor.html",LADINO:"ladino.html",LATIN:"latin.html",LATV:"latvian.html",LAW:"law.html","LAW A":"lawa.html","LAW B":"lawb.html","LAW C":"lawc.html","LAW E":"lawe.html","LAW H":"lawh.html","LAW P":"lawp.html","LAW T":"lawt.html",LEAD:"lead.html",LING:"ling.html",LIS:"lis.html",LIT:"lit.html",LITH:"lith.html",LSJ:"lsj.html","M E":"meche.html","M SCI":"88milsci.html",MARBIO:"marbio.html",MATH:"math.html",MCB:"mcb.html",MED:"medicine.html","MED EM":"medem.html",MEDCH:"medchem.html",MEDECK:"medeck.html",MEDENG:"medeng.html",MEDLIC:"medlic.html",MEDRCK:"medrck.html",MEDSCI:"medsci.html",MEIE:"meie.html",MELC:"melc.html",MGMT:"mgmt.html",MICROM:"microbio.html",MKTG:"mktg.html",MODHEB:"modheb.html",MOLENG:"moleng.html",MOLMED:"molmed.html","MS E":"mse.html",MSIS:"msis.html",MSTP:"mstp.html",MSW:"socwk.html",MUHST:"mushist.html",MUSAP:"appmus.html",MUSED:"mused.html",MUSEN:"musensem.html",MUSEUM:"museum.html",MUSIC:"music.html",MUSICP:"musicp.html",MUSTEC:"mustec.html","N SCI":"88navsci.html","N&MES":"nearmide.html",NBIO:"nbio.html",NCLIN:"nursingcl.html",NEUBIO:"neubio.html","NEUR S":"neurosurg.html",NEURL:"neurl.html",NEURO:"neuro.html",NEUSCI:"neusci.html",NME:"nme.html",NMETH:"nursingmeth.html",NORW:"norweg.html",NSG:"nsg.html",NURS:"nursing.html",NUTR:"nutrit.html","O E":"orgenv.html","O S":"os.html","OB GYN":"obgyn.html",OCEAN:"ocean.html",OHS:"ohs.html",OPHTH:"ophthal.html",OPMGT:"opmgmt.html",ORALB:"oralbio.html",ORALM:"oralm.html",ORTHO:"orthod.html",ORTHP:"orthop.html",OTOHN:"otol.html","P BIO":"physiolbio.html",PABIO:"pathobio.html",PATH:"patho.html",PBSCI:"psychbehav.html",PCEUT:"pharmceu.html",PEDO:"pedodon.html",PEDS:"pediat.html",PERIO:"perio.html",PHARBE:"pharbe.html",PHARM:"pharmacy.html",PHARMP:"pharmp.html",PHCOL:"pharma.html",PHG:"phg.html",PHI:"phi.html",PHIL:"phil.html",PHRMCY:"phrmcy.html",PHRMPR:"phrmpr.html",PHRMRA:"phrmra.html",PHRMSC:"phrmsc.html",PHYS:"phys.html","POL S":"polisci.html",POLSH:"polish.html",PORT:"port.html",PPM:"ppm.html",PROS:"pros.html",PRSAN:"persian.html",PSYCAP:"95psycap.html",PSYCH:"psych.html",PSYCLN:"psycln.html",PUBPOL:"pubpol.html",PUBSCH:"pubsch.html","Q SCI":"quantsci.html",QERM:"quante.html",QMETH:"qmeth.html",QUAT:"qrc.html","R E":"re.html","R ONC":"radonc.html",RADGY:"radiol.html",REHAB:"rehab.html",RELIG:"religion.html","RES D":"restor.html","RHB PO":"rhbpo.html",ROMN:"romanian.html",RUSS:"russian.html","S ASIA":"sasian.html",SBSE:"sbse.html",SCAND:"scand.html",SCM:"scm.html",SEASIA:"seasia.html",SEFS:"sefs.html",SLAVIC:"slavic.html",SLVN:"slvn.html",SMEA:"smea.html",SNKRT:"sanskrit.html",SOC:"soc.html","SOC WF":"socwlbasw.html","SOC WL":"socwl.html",SOCSCI:"socsci.html",SPAN:"spanish.html",SPH:"sph.html",SPHSC:"sphsc.html",SPLING:"spanlin.html","ST MGT":"stratm.html",STAT:"stat.html",STSS:"stss.html",SURG:"surg.html",SWA:"swa.html",SWED:"swedish.html",TAGLG:"taglg.html",TECHIN:"techin.html",THAI:"thai.html",TKISH:"turkish.html",TURKIC:"turkc.html",TXTDS:"txtds.html",UCONJ:"uconjoint.html",UGARIT:"ugarit.html",UKR:"ukrain.html",URBAN:"urban.html",URBDP:"urbdes.html",URDU:"urdu.html",UROL:"uro.html",UYGUR:"uygur.html",UZBEK:"uzbek.html",VIET:"viet.html"},l="("+Object.keys(r).sort(function(t,e){return e.length-t.length}).map(function(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}).join("|")+")",a=new RegExp("^"+l+"\\s+(\\d{3}[A-Z]?)\\s{2,}(.*)"),i=["#66c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"],n={};function s(t){return n.hasOwnProperty(t)||(n[t]=i[Object.keys(n).length%i.length]),n[t]}var o=[],h=[],m={};/* Instructor names as in the Time Schedule Viz: names the Time Schedule prints in all capitals get each word capitalized (CLARK,HEATHER as Clark,Heather); names in mixed case keep its spelling (van Eijk,Marieke) and are preferred as labels. */function c(t){if(!t||"TBA"===t||"STAFF"===t)return t;if(t===t.toUpperCase())return t.toLowerCase().replace(/(?:^|[^a-zA-Z0-9\'])([a-zA-Z])/g,function(m){return m.toUpperCase()});instNative[t]=!0;return t}function d(t,e){for(var r=[],l=t.replace(/<br\s*\/?>/gi,"\n").replace(/<\/tr>/gi,"\n").replace(/<\/table>/gi,"\n").replace(/<\/div>/gi,"\n").replace(/<\/p>/gi,"\n").replace(/<[^>]*>/g,""),i=(l=l.replace(/&nbsp;/g," ").replace(/&amp;/g,"&")).split("\n"),n=null,s=0;s<i.length;s++){var o=i[s].trim();if(o){var h=o.match(a);if(!h||/\bSLN\b/.test(o)){if(n){var m=o.match(/^(?:[A-Za-z]+(?![A-Za-z])\s*)*>?\s*(\d{4,5})\s+([A-Z0-9]{1,3})\s+([0-9\-VAR]+)\b/);if(m){if(o.includes("QZ"))continue;var d=m[1],p=m[2],u=m[3];if(1!==p.length)continue;var g=0;if(u){var f=u.match(/^(\d+)/);f&&(g=parseInt(f[1],10))}if(0===g)continue;var b=o.match(/(\d+)\s*\/\s*(\d+)/);if(!b)continue;var x=parseInt(b[1],10);if(0===x)continue;var S=parseInt(b[2],10),E="TBA",C=o.substring(0,o.indexOf(b[0])),v=(C=C.replace(/to be arranged/gi,"")).match(/\b([A-Za-z\-']+(?:\s+[A-Za-z\-']+)*,\s*[A-Za-z\-'\s]+)/);if(v)E=v[1].trim();else if(/STAFF/i.test(C))E="STAFF";else{var y=C.trim().split(/\s{2,}/);y.length>1&&(E=y[y.length-1]),/\d/.test(E)&&(E="TBA")}(E=(E=E.replace(/(^|\s+)(Open|Closed|Restr|Full-term)$/gi,"").trim()).replace(/to be arranged/gi,"").trim())||(E="TBA");var A=[E];E.includes("/")&&(A=E.split("/").map(function(t){return t.trim()}).filter(function(t){return t.length>0&&t.includes(",")})),0===A.length&&(A=[E]),A.forEach(function(t){r.push({sln:d,prefix:n.prefix,number:n.number,section:p,name:n.name,genEd:n.genEd,genEdStr:n.genEdStr,instructor:c(t),enrl:x,lim:S,credits:g,splitCredits:g/A.length,sch:g*x/A.length,level:n.number.charAt(0)+"00",pct:S>0?x/S*100:0,quarter:e})})}}}else{var I=h[3].trim().replace(/\s{2,}/g," "),H=h[2];if(/^[6789]/.test(H)||H.endsWith("99")||/HONORS/i.test(I)){n=null;continue}var T=[];/\bSSc\b/i.test(I)&&T.push("SSc"),/\bNSc\b/i.test(I)&&T.push("NSc");var w=I.replace(/\([^()]*\b(SSc|NSc|A&H|RSN|DIV|C)\b[^()]*\)/gi,"").replace(/\(cancellation in effect\)/gi,"").replace(/Prerequisites/gi,"").replace(/\s*\([^)]*$/,"").replace(/\s{2,}/g," ").trim();n={prefix:h[1].trim(),number:H,name:w,genEd:T,genEdStr:T.join(", ")}}}}return r}async function p(t){for(var l=0;l<e.length;l++){var a=e[l],k=a+"_"+t;if(m[k])continue;m[k]=2;var i="https://www.washington.edu/students/timeschd/"+a+"/"+r[t];$("#prefix-hint").removeClass("warning").text("Loading "+t+" "+a+"...");try{var n=await fetch(i);if(n.ok){var s=d(await n.text(),a);o=o.concat(s);m[k]=1}}catch(err){console.error("Fetch error for "+i+":",err)}}}function inAY(row){return-1!==e.indexOf(row.quarter)}function statusHint(){var miss=[];h.forEach(function(pr){e.forEach(function(q){2===m[q+"_"+pr]&&miss.push(pr+" "+q)})});var msg=h.length+" active prefix"+(1===h.length?"":"es")+" in "+(e.join(", ")||"no quarters");miss.length?$("#prefix-hint").addClass("warning").text(msg+"; no Time Schedule page for "+miss.join(", ")):$("#prefix-hint").removeClass("warning").text(msg)}var QN=["AUT","WIN","SPR","SUM"],busy=!1;function setBusy(v){busy=v,$("#ay-select, .qtr-filter").prop("disabled",v)}function ayQuarters(){var sel=$(".qtr-filter:checked").map(function(){return this.value}).get();return QN.filter(function(q){return-1!==sel.indexOf(q)}).map(function(q){return q+("AUT"===q?t-1:t)})}function ayLabels(){$(".qtr-filter").each(function(){$(this).siblings(".qtr-name").text(this.value+" "+("AUT"===this.value?t-1:t))}),$("#ay-select").val(String(t)),$(".ay-tag").text(g),$("#qtr-list").text(e.join(", ")||"No quarters selected"),document.title=g+" UW Workload Dashboard",e.length&&$("#all-depts-link").attr("href","https://www.washington.edu/students/timeschd/"+e[0]+"/")}async function applyAY(){if(!busy){setBusy(!0),e=ayQuarters(),g="AY"+(t-1).toString().substring(2)+"-"+t.toString().substring(2),ayLabels();for(var i=0;i<h.length;i++)await p(h[i]);setBusy(!1),h.length&&statusHint(),b(),S()}}document.getElementById("loading").style.display="none",document.getElementById("dashboard").style.display="block";var u,g="AY"+(t-1).toString().substring(2)+"-"+t.toString().substring(2),f=500;function b(){var t=$("#active-prefix-chips");t.empty(),0!==h.length?(t.show(),h.forEach(function(e){var r=o.filter(function(t){return t.prefix===e&&inAY(t)}).length,l=s(e),a=$("<span class='prefix-chip'></span>").css("background",l);a.append($("<span></span>").text(e)),a.append($("<span class='chip-count'></span>").text(r)),a.append($("<span class='chip-remove' title='Remove prefix'>×</span>").on("click",function(){!function(t){h=h.filter(function(e){return e!==t}),b(),S()}(e)})),t.append(a)})):t.hide()}async function x(){var t=$("#prefix-input").val().split(",").map(function(t){return t.trim().toUpperCase()}).filter(Boolean);if(0!==t.length){var e=t.filter(function(t){return!r.hasOwnProperty(t)});if(e.length>0)return $("#prefix-input").removeClass("valid").addClass("invalid"),void $("#prefix-hint").addClass("warning").text("Unknown prefixes: "+e.join(", ")+" (choose from the lookup list)");if(busy)return;setBusy(!0);for(var l=t.filter(function(t){return-1===h.indexOf(t)}),a=0;a<l.length;a++)await p(l[a]);setBusy(!1),l.forEach(function(t){h.push(t)}),$("#prefix-input").removeClass("invalid").addClass("valid"),setTimeout(function(){$("#prefix-input").removeClass("valid")},1500),statusHint(),$("#prefix-input").val(""),b(),S()}else $("#prefix-input").removeClass("valid invalid")}
/* ---- Charts: SCH by course, concentration (Lorenz curve), change from last year (slopegraph) ----
   rows: instructors for the selected year (name, names, sch, courses), highest SCH first; total: all SCH; genEds: the Gen Ed
   filter. Every mark is a number: segments are courses (SCH = credits x students, split when co-taught), coloured by quarter.
   The Lorenz curve leaves TBA and STAFF out. The slopegraph loads the same quarters one year earlier in the background and
   matches names across the two years with the same rules as the table. */
var wlLast = null, wlResizeT = null, wlPrevBusy = false;
var WLQ = { AUT: ["#32006e", "Autumn"], WIN: ["#85754d", "Winter"], SPR: ["#c5b4e3", "Spring"], SUM: ["#ffc700", "Summer"] };
function wlEsc(v){ return String(v).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function wlFmt(n){ return Math.round(n).toLocaleString(); }
function wlInk(hex){ var c = [1, 3, 5].map(function(i){ var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.0539) ? "#ffffff" : "#0b0b0b"; }
function wlWidth(id){ var el = document.getElementById(id); var cs = getComputedStyle(el); return Math.max(240, Math.floor(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))); }
function wlMatchGenEd(row, genEds){
  return (row.genEd.length === 0 && genEds.indexOf("None") !== -1) || (row.genEd.indexOf("SSc") !== -1 && genEds.indexOf("SSc") !== -1) || (row.genEd.indexOf("NSc") !== -1 && genEds.indexOf("NSc") !== -1);
}
/* ---- Instructor checklist ----
   One checkbox per person (spellings merged as in the table), for the instructors in the selected year, prefixes and Gen Ed
   filter. Unchecked instructors are left out of the charts, the table and the totals, and out of both years of the
   slopegraph. Exclusions are kept as spellings, so they survive changes of year or prefix; a checkbox covers all of its
   person's spellings. */
var wlExcl = [];
function wlInstFilter(recs){
  var counts = {};
  recs.forEach(function(r){ counts[r.instructor] = (counts[r.instructor] || 0) + 1; });
  var G = instGroups(recs), list = Object.keys(G.groups).map(function(k){ return G.groups[k]; }).sort(function(a, b){ return a.label.localeCompare(b.label); });
  var box = $("#instructor-filters").empty();
  if(!list.length){ $("#instructor-bar").hide(); return recs; }
  $("#instructor-bar").show();
  list.forEach(function(g){
    var off = g.names.some(function(n){ return wlExcl.indexOf(n) !== -1; });
    if(off) g.names.forEach(function(n){ if(wlExcl.indexOf(n) === -1) wlExcl.push(n); });
    var cb = $("<input type='checkbox' class='inst-filter'>").val(g.key).data("names", g.names).prop("checked", !off);
    var lab = $("<label class='filter-label'></label>").append(cb).append($("<span></span>").text(g.label));
    if(g.names.length > 1) lab.attr("title", "Listed as: " + g.names.join("; "));
    box.append(lab);
  });
  $("#inst-count").text($(".inst-filter:checked").length + " of " + list.length + " selected");
  return recs.filter(function(r){ return wlExcl.indexOf(r.instructor) === -1; });
}
$(document).on("change", ".inst-filter", function(){
  var names = $(this).data("names") || [];
  wlExcl = wlExcl.filter(function(n){ return names.indexOf(n) === -1; });
  if(!this.checked) wlExcl = wlExcl.concat(names);
  S();
});
$(document).on("click", "#inst-all", function(ev){ ev.preventDefault(); wlExcl = []; S(); });
$(document).on("click", "#inst-none", function(ev){ ev.preventDefault(); wlExcl = $(".inst-filter").map(function(){ return $(this).data("names"); }).get(); S(); });
function wlCharts(rows, total, genEds){
  wlLast = [rows, total, genEds];
  wlBars(rows);
  wlLorenz(rows, total, genEds, null);
  wlSlope(genEds, 0);
  wlFitLorenz(rows, total, genEds);
  wlFitSlope(genEds);
}
function wlBarsHeight(){
  var bars = document.getElementById("tf-bars"), sv = bars.querySelector("svg");
  if(!sv) return 0;
  return sv.getBoundingClientRect().bottom - bars.getBoundingClientRect().top + parseFloat(getComputedStyle(bars).paddingBottom);
}
function wlSameRow(id){ return Math.abs(document.getElementById("tf-bars").getBoundingClientRect().top - document.getElementById(id).getBoundingClientRect().top) <= 2; }
/* When the Lorenz panel sits beside the bars, give its plot and table exactly the height left under its heading. */
function wlFitLorenz(rows, total, genEds){
  var el = document.getElementById("tf-lorenz"), sv = el.querySelector("svg");
  if(!sv || !wlSameRow("tf-lorenz")) return;
  var target = wlBarsHeight(), pad = parseFloat(getComputedStyle(el).paddingBottom);
  var avail = Math.floor(target - (sv.getBoundingClientRect().top - el.getBoundingClientRect().top) - pad - 2);
  if(avail <= 200) return;
  /* estimate, then measure: if the panel's content still runs past the bars, take the excess off and draw again */
  for(var pass = 0; pass < 3; pass++){
    wlLorenz(rows, total, genEds, avail);
    var used = el.lastElementChild.getBoundingClientRect().bottom - el.getBoundingClientRect().top + pad;
    if(used <= target + 0.5) break;
    avail -= Math.ceil(used - target);
  }
}
/* The panels stretch to the tallest one in their row; when the slopegraph sits beside the bars, it is redrawn taller to
   fill that height instead of leaving blank space. */
function wlFitSlope(genEds){
  var bars = document.getElementById("tf-bars"), slope = document.getElementById("tf-slope");
  if(!slope.querySelector("svg") || !wlSameRow("tf-slope")) return;
  var cr = slope.getBoundingClientRect(), sr = slope.querySelector("svg").getBoundingClientRect();
  var used = (sr.bottom - cr.top) + parseFloat(getComputedStyle(slope).paddingBottom);
  var extra = Math.floor(wlBarsHeight() - used - 2);
  if(extra > 8) wlSlope(genEds, extra);
}
function wlBars(rows){
  var el = $("#tf-bars"), W = wlWidth("tf-bars"), nameW = 150, rowH = 16, top = 20;
  if(!rows.length){ el.html("<h4>SCH by instructor and course</h4><p class='tf-sub'>Add a prefix to see instructors.</p>"); return; }
  var max = Math.max(f, rows[0].sch), barW = W - nameW - 46, H = top + rows.length * rowH + 4;
  var x = function(v){ return nameW + v / max * barW; };
  var qOrder = { AUT: 0, WIN: 1, SPR: 2, SUM: 3 }, seen = {};
  var s = "<svg width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='SCH by instructor, one segment per course'>";
  /* Median instructor (TBA and STAFF left out) as a solid line, the target as a dashed one; each label sits on the side
     of its line away from the other line, so the two never overlap. */
  var ppl = rows.filter(function(r){ return !/^(TBA|STAFF)$/.test(r.name); }).map(function(r){ return r.sch; }).sort(function(a, b){ return a - b; });
  var med = ppl.length ? (ppl.length % 2 ? ppl[(ppl.length - 1) / 2] : (ppl[ppl.length / 2 - 1] + ppl[ppl.length / 2]) / 2) : null;
  var medLeft = med !== null && med < f;
  s += "<line x1='" + x(f).toFixed(1) + "' x2='" + x(f).toFixed(1) + "' y1='" + (top - 4) + "' y2='" + H + "' stroke='#898781' stroke-dasharray='3 3'/>";
  s += "<text x='" + (medLeft || med === null ? x(f) + 4 : x(f) - 4).toFixed(1) + "' y='" + (top - 7) + "' font-size='10' fill='#52514e' text-anchor='" + (medLeft || med === null ? "start" : "end") + "'>target " + f + "</text>";
  if(med !== null){
    s += "<line x1='" + x(med).toFixed(1) + "' x2='" + x(med).toFixed(1) + "' y1='" + (top - 4) + "' y2='" + H + "' stroke='#52514e' stroke-width='1'/>";
    s += "<text x='" + (medLeft ? x(med) - 4 : x(med) + 4).toFixed(1) + "' y='" + (top - 7) + "' font-size='10' fill='#52514e' text-anchor='" + (medLeft ? "end" : "start") + "'>median " + wlFmt(med) + "</text>";
  }
  rows.forEach(function(r, i){
    var y = top + i * rowH, acc = 0, tba = /^(TBA|STAFF)$/.test(r.name);
    s += "<g class='wl-p' data-n='" + wlNames(r.names || [r.name]) + "'>";
    s += "<text x='" + (nameW - 6) + "' y='" + (y + 11.5) + "' font-size='11' text-anchor='end' fill='" + (tba ? "#898781" : "#0b0b0b") + "'>" + wlEsc(r.name) + "</text>";
    r.courses.slice().sort(function(a, b){ return (qOrder[a.quarter.slice(0, 3)] - qOrder[b.quarter.slice(0, 3)]) || (b.sch - a.sch); }).forEach(function(c){
      var q = c.quarter.slice(0, 3), col = (WLQ[q] || ["#c3c2b7"])[0], x0 = x(acc), w = c.sch / max * barW;
      seen[q] = true;
      s += "<rect x='" + x0.toFixed(1) + "' y='" + (y + 2) + "' width='" + Math.max(0.5, w - 1.5).toFixed(1) + "' height='" + (rowH - 4) + "' rx='2' fill='" + col + "'><title>" + wlEsc(c.quarter + " " + c.prefix + " " + c.number + " " + c.section + ": " + c.credits + " cr × " + c.enrl + " students" + (c.splitCredits !== c.credits ? ", co-taught" : "") + " = " + wlFmt(c.sch) + " SCH") + "</title></rect>";
      if(w >= 26) s += "<text x='" + (x0 + 3).toFixed(1) + "' y='" + (y + 11) + "' font-size='9.5' fill='" + wlInk(col) + "' pointer-events='none'>" + wlEsc(c.number) + "</text>";
      acc += c.sch;
    });
    s += "<text x='" + (x(r.sch) + 4).toFixed(1) + "' y='" + (y + 11.5) + "' font-size='10.5' fill='#52514e'>" + wlFmt(r.sch) + "</text></g>";
  });
  s += "</svg>";
  var key = ["AUT", "WIN", "SPR", "SUM"].filter(function(q){ return seen[q]; }).map(function(q){ return "<span><i style='background:" + WLQ[q][0] + "'></i>" + WLQ[q][1] + "</span>"; }).join("");
  el.html("<h4>SCH by instructor and course (" + g + ")</h4><p class='tf-sub'>Each segment is one course (credits × students); hover for details. The solid line is the department median (" + (med !== null ? wlFmt(med) + " SCH, " : "") + "TBA left out); the dashed line is the SCH target.</p><div class='tf-key'>" + key + "</div>" + s);
}
/* ---- Linked highlighting ----
   Every instructor's marks in the three panels carry their spellings (data-n); hovering any of them highlights the same
   person everywhere and fades everyone else. */
function wlNames(list){ return wlEsc(list.map(function(n){ return String(n).toUpperCase(); }).join("|")); }
$(document).on("mouseenter", ".tf-card .wl-p", function(){
  var mine = String(this.getAttribute("data-n")).split("|");
  $(".tf-card .wl-p").each(function(){
    var hit = String(this.getAttribute("data-n")).split("|").some(function(n){ return mine.indexOf(n) !== -1; });
    this.classList.toggle("wl-hi", hit); this.classList.toggle("wl-dim", !hit);
  });
}).on("mouseleave", ".tf-card .wl-p", function(){ $(".tf-card .wl-p").removeClass("wl-hi wl-dim"); });
function wlGini(v){
  var n = v.length, tot = v.reduce(function(a, b){ return a + b; }, 0), g = 0;
  if(n < 2 || !tot) return null;
  v.forEach(function(a){ v.forEach(function(b){ g += Math.abs(a - b); }); });
  return g / (2 * n * n * (tot / n));
}
/* ---- How concentrated is the teaching? ----
   Lorenz curve: each dot is one instructor, most SCH first; filled dots are at or above the SCH target. The list in the
   empty triangle below the diagonal names the first instructors (their rank is beside their dot), their SCH and the running
   share, with the rows where the running share passes 50% and 75% in bold. Last year's curve is the grey line behind. */
function wlLorenz(rows, total, genEds, avail){
  var el = $("#tf-lorenz"), ppl = rows.filter(function(r){ return !/^(TBA|STAFF)$/.test(r.name); }).slice().sort(function(a, b){ return b.sch - a.sch; });
  var n = ppl.length, tot = ppl.reduce(function(a, r){ return a + r.sch; }, 0);
  if(n < 3 || !tot){ el.html("<h4>How concentrated is the teaching?</h4><p class='tf-sub'>Needs at least three instructors.</p>"); return; }
  var cum = [0]; ppl.forEach(function(r, i){ cum.push(cum[i] + r.sch); });
  var gini = wlGini(ppl.map(function(r){ return r.sch; }));
  var Y = wlYears(genEds), prevV = Y ? Object.keys(Y.A).map(function(k){ return Y.A[k]; }).sort(function(a, b){ return b - a; }) : null;
  var prevGini = prevV && prevV.length >= 3 ? wlGini(prevV) : null;
  /* Plot and table share the panel: with a height to fill (avail), the table takes as many rows as fit while the plot
     stays at least 170px; otherwise the plot is as wide as the panel allows and the table shows up to 12 rows. */
  /* chrome: plot margins and axis labels (42), table heading and margin (22) */
  var W = wlWidth("tf-lorenz"), widthS = Math.min(300, W - 48), rowH = 13, chrome = 42 + 22, S, N;
  if(avail){
    N = Math.min(n, Math.max(3, Math.floor((avail - chrome - 160) / rowH)));
    S = Math.max(160, Math.min(widthS, avail - chrome - N * rowH));
  } else { N = Math.min(n, 12); S = widthS; }
  var L = 40, T = 8, H = T + S + 34;
  var px = function(q){ return L + q * S; }, py = function(q){ return T + S - q * S; };
  var s = "<svg width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='Lorenz curve of SCH by instructor'>";
  s += "<line x1='" + L + "' x2='" + (L + S) + "' y1='" + (T + S + 6) + "' y2='" + (T + S + 6) + "' stroke='#c3c2b7'/><line x1='" + (L - 6) + "' x2='" + (L - 6) + "' y1='" + T + "' y2='" + (T + S) + "' stroke='#c3c2b7'/>";
  [0, 0.5, 1].forEach(function(q){
    s += "<text x='" + px(q) + "' y='" + (T + S + 18) + "' font-size='9.5' fill='#898781' text-anchor='middle'>" + q * 100 + "%</text>";
    s += "<text x='" + (L - 9) + "' y='" + (py(q) + 3) + "' font-size='9.5' fill='#898781' text-anchor='end'>" + q * 100 + "%</text>";
  });
  s += "<text x='" + (L + S / 2) + "' y='" + (H - 2) + "' font-size='10' fill='#52514e' text-anchor='middle'>share of instructors, most SCH first</text>";
  s += "<line x1='" + px(0) + "' y1='" + py(0) + "' x2='" + px(1) + "' y2='" + py(1) + "' stroke='#c3c2b7' stroke-dasharray='4 3'/>";
  if(prevV && prevV.length >= 3){
    var ptot = prevV.reduce(function(a, b){ return a + b; }, 0), pc = 0, pd = "M" + px(0) + " " + py(0);
    prevV.forEach(function(v, i){ pc += v; pd += "L" + px((i + 1) / prevV.length).toFixed(1) + " " + py(pc / ptot).toFixed(1); });
    s += "<path d='" + pd + "' fill='none' stroke='#c3c2b7' stroke-width='1.75' stroke-linejoin='round'><title>" + wlEsc(Y.prevLabel + ": " + prevV.length + " instructors, Gini " + prevGini.toFixed(2)) + "</title></path>";
  }
  var d = ""; cum.forEach(function(c, i){ d += (i ? "L" : "M") + px(i / n).toFixed(1) + " " + py(c / tot).toFixed(1); });
  s += "<path d='" + d + "' fill='none' stroke='#32006e' stroke-width='2' stroke-linejoin='round'/>";
  var k50 = cum.findIndex(function(c){ return c / tot >= 0.5; }), k75 = cum.findIndex(function(c){ return c / tot >= 0.75; });
  var above = ppl.filter(function(r){ return r.sch >= f; }), aboveShare = above.reduce(function(a, r){ return a + r.sch; }, 0) / tot;
  var lastLab = null;
  ppl.forEach(function(r, i){
    var k = i + 1, cx = px(k / n), cy = py(cum[k] / tot), filled = r.sch >= f;
    /* rank beside the dot, for the rows in the table, when it clears the previous rank label */
    var lab = k <= N && (!lastLab || Math.abs(cx - lastLab[0]) > 9 || Math.abs(cy - lastLab[1]) > 9);
    if(lab) lastLab = [cx, cy];
    var tip = "<title>" + wlEsc(k + ". " + r.name + ": " + wlFmt(r.sch) + " SCH (" + (r.sch / tot * 100).toFixed(1) + "% of SCH)" + (filled ? ", at or above target" : "") + "; top " + k + " teach " + Math.round(cum[k] / tot * 100) + "%") + "</title>";
    s += "<g class='wl-p' data-n='" + wlNames(r.names || [r.name]) + "'>" + tip
      + "<circle cx='" + cx.toFixed(1) + "' cy='" + cy.toFixed(1) + "' r='3.2' fill='" + (filled ? "#32006e" : "#ffffff") + "' stroke='#32006e' stroke-width='1.25'/>"
      + (lab ? "<text x='" + (cx - 5).toFixed(1) + "' y='" + (cy - 4).toFixed(1) + "' font-size='9' fill='#52514e' text-anchor='end'>" + k + "</text>" : "")
      + "</g>";
  });
  /* Share of all student enrollments in the sample (TBA left out). A student in two courses counts twice; co-taught
     enrollment is split between instructors the same way as SCH. */
  var stuOf = function(r){ return r.courses.reduce(function(a, c){ return a + c.enrl * (c.credits ? c.splitCredits / c.credits : 1); }, 0); };
  var stuTot = ppl.reduce(function(a, r){ return a + stuOf(r); }, 0);
  var tab = "<table class='tf-tab'><thead><tr><th class='k'>#</th><th style='white-space:nowrap' title='The " + N + " instructors with the most SCH, of " + n + "'>Instructor" + (N < n ? " <span style='font-weight:400;color:#898781'>(" + N + " of " + n + ")</span>" : "") + "</th><th class='sch r'>SCH</th>"
    + "<th class='psch r' title='Share of all SCH in the sample taught by this instructor (TBA left out)'>% SCH</th>"
    + "<th class='stu r' title='Share of all student enrollments in these courses (TBA left out). A student in two courses counts twice; co-taught enrollment is split between the instructors.'>% students</th>"
    + "<th class='cum r' title='Share of all SCH taught by this instructor and everyone above them'>Cum. % SCH</th></tr></thead><tbody>";
  for(var i = 0; i < N; i++){
    var r = ppl[i], k = i + 1, pct = Math.round(cum[k] / tot * 100), bold = k === k50 || k === k75;
    tab += "<tr class='wl-p' data-n='" + wlNames(r.names || [r.name]) + "' title='" + wlEsc(r.name + ": " + wlFmt(r.sch) + " SCH (" + (r.sch / tot * 100).toFixed(1) + "% of SCH); top " + k + " teach " + pct + "%") + "'>"
      + "<td class='k'>" + k + "</td><td>" + wlEsc(String(r.name).split(",")[0]) + "</td><td class='r'>" + wlFmt(r.sch) + "</td><td class='r'>" + (r.sch / tot * 100).toFixed(1) + "%</td><td class='r'>" + (stuTot ? (stuOf(r) / stuTot * 100).toFixed(1) + "%" : "–") + "</td><td class='cum r'>" + (bold ? "<b>" + pct + "%</b>" : pct + "%") + "</td></tr>";
  }
  tab += "</tbody></table>";
  s += "</svg>";
  var sub = "Dots are instructors, most SCH first, numbered as in the table. Filled: at or above the " + f + " SCH target ("
    + above.length + " of " + n + ", " + Math.round(aboveShare * 100) + "% of SCH). Gini " + gini.toFixed(2)
    + (prevGini !== null ? "; grey: " + Y.prevLabel + " (" + prevGini.toFixed(2) + ")" : (Y ? "" : "; loading last year")) + ". TBA left out.";
  el.html("<h4>How concentrated is the teaching?</h4><p class='tf-sub'>" + sub + "</p>" + s + tab);
}
function wlPrevQuarters(){ return e.map(function(q){ return q.slice(0, 3) + (parseInt(q.slice(3), 10) - 1); }); }
async function wlLoadPrev(){
  if(wlPrevBusy) return;
  wlPrevBusy = true;
  var qs = wlPrevQuarters();
  for(var i = 0; i < h.length; i++) for(var j = 0; j < qs.length; j++){
    var k = qs[j] + "_" + h[i];
    if(m[k] || !r[h[i]]) continue;
    m[k] = 2;
    try {
      var res = await fetch("https://www.washington.edu/students/timeschd/" + qs[j] + "/" + r[h[i]]);
      if(res.ok){ o = o.concat(d(await res.text(), qs[j])); m[k] = 1; }
    } catch(err){}
  }
  wlPrevBusy = false;
  if(wlLast) wlCharts.apply(null, wlLast);
}
/* SCH per person in the previous (A) and selected (B) year, names matched across the two years, TBA and unchecked
   instructors left out. Returns null (and starts loading) until the previous year's pages are in. */
function wlYears(genEds){
  var qs = wlPrevQuarters();
  var waiting = h.some(function(p){ return qs.some(function(q){ return !m[q + "_" + p] && r[p]; }); });
  if(waiting || wlPrevBusy){ wlLoadPrev(); return null; }
  var inY = function(row, list){ return h.indexOf(row.prefix) !== -1 && list.indexOf(row.quarter) !== -1 && wlMatchGenEd(row, genEds); };
  var cur = o.filter(function(row){ return inY(row, e); }), prev = o.filter(function(row){ return inY(row, qs); });
  var G = instGroups(cur.concat(prev)), A = {}, B = {}, exK = {};
  wlExcl.forEach(function(n){ exK[G.keyOf[n] || n] = true; });
  var add = function(map, row){ if(/^(TBA|STAFF)$/.test(row.instructor)) return; var k = G.keyOf[row.instructor] || row.instructor; if(exK[k]) return; map[k] = (map[k] || 0) + row.sch; };
  prev.forEach(function(row){ add(A, row); });
  cur.forEach(function(row){ add(B, row); });
  return { G: G, A: A, B: B, prevLabel: "AY" + String(t - 2).slice(2) + "-" + String(t - 1).slice(2) };
}
function wlSlope(genEds, extraH){
  var el = $("#tf-slope"), prevLabel = "AY" + String(t - 2).slice(2) + "-" + String(t - 1).slice(2);
  var Y = wlYears(genEds);
  if(!Y){ el.html("<h4>Change from " + prevLabel + "</h4><p class='tf-sub'>Loading " + prevLabel + " from the Time Schedule…</p>"); return; }
  var G = Y.G, A = Y.A, B = Y.B;
  var keys = Object.keys(A).concat(Object.keys(B)).filter(function(k, i, all){ return all.indexOf(k) === i; });
  if(!keys.length){ el.html("<h4>Change from " + prevLabel + "</h4><p class='tf-sub'>No instructors in either year.</p>"); return; }
  keys.sort(function(p, q){ return Math.max(A[q] || 0, B[q] || 0) - Math.max(A[p] || 0, B[p] || 0); });
  var shown = keys.slice(0, 16), more = keys.length - shown.length;
  var label = function(k){ return G.groups[k] ? G.groups[k].label : k; };
  var dn = function(k){ return wlNames(G.groups[k] ? G.groups[k].names : [k]); };
  var max = Math.max.apply(null, shown.map(function(k){ return Math.max(A[k] || 0, B[k] || 0); }));
  var W = wlWidth("tf-slope"), extra = extraH || 0, colW = Math.min(170, Math.floor((W - 90) / 2)), X1 = colW + 6, X2 = W - colW - 6, T = 22, Hc = Math.max(200, shown.length * 15) + extra, H = T + Hc + 10;
  var y = function(v){ return T + Hc - v / max * Hc; }, big = 0.8 * f;
  var spread = function(items){ items.sort(function(p, q){ return p.y - q.y; }); for(var i = 1; i < items.length; i++) if(items[i].y - items[i - 1].y < 12) items[i].y = items[i - 1].y + 12; return items; };
  var left = spread(shown.filter(function(k){ return A[k] !== undefined; }).map(function(k){ return { k: k, v: A[k], y: y(A[k]) }; }));
  var right = spread(shown.filter(function(k){ return B[k] !== undefined; }).map(function(k){ return { k: k, v: B[k], y: y(B[k]) }; }));
  var short = function(k){ var nm = label(k), maxCh = Math.floor((colW - 40) / 6); return nm.length > maxCh ? nm.slice(0, maxCh - 1) + "…" : nm; };
  var s = "<svg width='" + W + "' height='" + (Math.max(H, (left.concat(right).reduce(function(m2, p){ return Math.max(m2, p.y); }, 0)) + 8)) + "' viewBox='0 0 " + W + " " + Math.max(H, (left.concat(right).reduce(function(m2, p){ return Math.max(m2, p.y); }, 0)) + 8) + "' role='img' aria-label='SCH by instructor, last year and this year'>";
  s += "<text x='" + X1 + "' y='11' font-size='11' font-weight='600' fill='#52514e' text-anchor='middle'>" + prevLabel + "</text><text x='" + X2 + "' y='11' font-size='11' font-weight='600' fill='#52514e' text-anchor='middle'>" + g + "</text>";
  shown.forEach(function(k){
    var a = A[k], b = B[k], hot = a !== undefined && b !== undefined && Math.abs(b - a) >= big;
    var tip = "<title>" + wlEsc(label(k) + ": " + (a !== undefined ? wlFmt(a) : "none") + " → " + (b !== undefined ? wlFmt(b) : "none") + " SCH") + "</title>";
    s += "<g class='wl-p' data-n='" + dn(k) + "'>";
    if(a !== undefined && b !== undefined) s += "<line x1='" + X1 + "' y1='" + y(a).toFixed(1) + "' x2='" + X2 + "' y2='" + y(b).toFixed(1) + "' stroke='" + (hot ? "#32006e" : "#c3c2b7") + "' stroke-width='" + (hot ? 2 : 1.25) + "'>" + tip + "</line>";
    if(a !== undefined) s += "<circle cx='" + X1 + "' cy='" + y(a).toFixed(1) + "' r='2.8' fill='" + (hot ? "#32006e" : "#898781") + "'>" + tip + "</circle>";
    if(b !== undefined) s += "<circle cx='" + X2 + "' cy='" + y(b).toFixed(1) + "' r='2.8' fill='" + (hot ? "#32006e" : "#898781") + "'>" + tip + "</circle>";
    s += "</g>";
  });
  left.forEach(function(p){ s += "<g class='wl-p' data-n='" + dn(p.k) + "'><text x='" + (X1 - 7) + "' y='" + (p.y + 3.5).toFixed(1) + "' font-size='10.5' text-anchor='end' fill='#0b0b0b'>" + wlEsc(short(p.k)) + " <tspan fill='#52514e'>" + wlFmt(p.v) + "</tspan></text></g>"; });
  right.forEach(function(p){ s += "<g class='wl-p' data-n='" + dn(p.k) + "'><text x='" + (X2 + 7) + "' y='" + (p.y + 3.5).toFixed(1) + "' font-size='10.5' fill='#0b0b0b'><tspan fill='#52514e'>" + wlFmt(p.v) + "</tspan> " + wlEsc(short(p.k)) + "</text></g>"; });
  s += "</svg>";
  el.html("<h4>Change from " + prevLabel + "</h4><p class='tf-sub'>Each line joins an instructor's SCH in the two years; purple lines changed by " + wlFmt(big) + "+ SCH (80% of the target). A dot on one side only: taught in that year only." + (more > 0 ? " " + more + " instructor" + (more === 1 ? "" : "s") + " with less SCH not shown." : "") + "</p>" + s);
}
/* ---- Time series view ----
   SCH and related measures per instructor for each academic year of a span (5 to 20 years) that ends at the year chosen in
   the Year menu, for the active prefixes, the checked quarters and the Gen Ed filter. Names are matched across all the years
   with the same rules as the table. Pages are fetched four at a time and kept, so the Year view and the slopegraph reuse
   them. TBA and STAFF count towards department totals but are not instructors. Instructors unchecked in the Year view are
   left out here too. A year is partial when one of its quarters has no Time Schedule page for any active prefix (usually a
   quarter not yet published); partial years are drawn hollow or pale and left out of averages, trends and target counts. */
var TSC = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
var TSR = ["#b29fd9", "#8a6cc4", "#6544a8", "#4b2e83", "#2a0a5e"];
var ts = { on: false, span: 10, measure: "sch", sel: [], col: {}, touched: false, gen: 0, loading: false, pending: false, heatAll: true, sort: ["mean", -1], q: "", D: null, ctx: null, hover: -1, resizeT: null };
var TSM = {
  sch: { label: "SCH", v: function(py){ return py.sch; }, fmt: function(v){ return wlFmt(v); },
    sub: "Student credit hours per academic year: credits × students for each course, split equally when co-taught." },
  share: { label: "% of department SCH", v: function(py, D0){ return D0.tot ? py.sch / D0.tot * 100 : 0; }, fmt: function(v){ return v.toFixed(1) + "%"; },
    sub: "Each instructor's share of all SCH in these prefixes that year (TBA and STAFF count in the total)." },
  stu: { label: "Students", v: function(py){ return py.stu; }, fmt: function(v){ return wlFmt(v); },
    sub: "Enrollments per academic year. A student in two courses counts twice; co-taught enrollment is split between the instructors." },
  sec: { label: "Courses", v: function(py){ return py.sec; }, fmt: function(v){ return String(Math.round(v * 10) / 10); },
    sub: "Lecture and seminar sections taught per academic year (quiz sections are not counted; a co-taught section counts for each instructor)." },
  size: { label: "Average class size", v: function(py){ return py.sec ? py.enrl / py.sec : 0; }, fmt: function(v){ return v.toFixed(0); },
    sub: "Average enrollment per section taught that year (full enrollment, also when co-taught)." }
};
function tsYears(){ var ys = []; for(var y = Math.max(2003, t - ts.span + 1); y <= t; y++) ys.push(y); return ys; }
function tsTypes(){ var sel = $(".qtr-filter:checked").map(function(){ return this.value; }).get(); return ["AUT", "WIN", "SPR", "SUM"].filter(function(q){ return sel.indexOf(q) !== -1; }); }
function tsQOf(y, q){ return q + (q === "AUT" ? y - 1 : y); }
function tsAY(qid){ var y = parseInt(qid.slice(3), 10); return qid.slice(0, 3) === "AUT" ? y + 1 : y; }
function tsAYLabel(y){ return "AY" + String(y - 1).slice(2) + "-" + String(y).slice(2); }
function tsQLabel(qid){ return { AUT: "Autumn", WIN: "Winter", SPR: "Spring", SUM: "Summer" }[qid.slice(0, 3)] + " " + qid.slice(3); }
function tsShort(label){ var c = String(label).split(","); return c.length > 1 && c[1].trim() ? c[0].trim() + ", " + c[1].trim().charAt(0) : String(label); }
function tsQ(sorted, p){ var ix = (sorted.length - 1) * p, lo = Math.floor(ix), hi = Math.ceil(ix); return sorted[lo] + (sorted[hi] - sorted[lo]) * (ix - lo); }
function tsTicks(max){
  if(!(max > 0)) max = 1;
  var raw = max / 4, p10 = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
  var step = [1, 2, 2.5, 5, 10].map(function(k){ return k * p10; }).filter(function(st){ return st >= raw - 1e-12; })[0];
  return { max: Math.ceil(max / step - 1e-9) * step, step: step };
}
function tsNum(v, step){ return step < 1 ? (Math.round(v * 100) / 100).toString() : Math.round(v).toLocaleString(); }
function tsSlope(pts){
  if(pts.length < 3) return null;
  var mx = 0, my = 0, sxy = 0, sxx = 0;
  pts.forEach(function(q){ mx += q[0]; my += q[1]; }); mx /= pts.length; my /= pts.length;
  pts.forEach(function(q){ sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) * (q[0] - mx); });
  return sxx ? sxy / sxx : null;
}
function tsRuns(idx){ var runs = []; idx.forEach(function(i){ var last = runs[runs.length - 1]; if(last && last[last.length - 1] === i - 1) last.push(i); else runs.push([i]); }); return runs; }
function tsCourseLine(row){
  return row.quarter.slice(0, 2) + row.quarter.slice(5) + " " + row.prefix + " " + row.number + " " + row.section + ": " + row.credits + " cr × " + row.enrl + "/" + row.lim + (row.splitCredits !== row.credits ? ", co-taught" : "") + " = " + wlFmt(row.sch) + " SCH";
}
/* ---- Loading ---- */
function tsProg(done, total){
  if(done >= total){ $("#ts-progress").hide(); return; }
  $("#ts-progress").css("display", "flex");
  $("#ts-pfill").css("width", (done / total * 100).toFixed(1) + "%");
  $("#ts-pstat").text("Loading Time Schedule pages: " + done + " of " + total);
}
async function tsLoad(qs){
  var tasks = [];
  h.forEach(function(pr){ qs.forEach(function(q){ if(!m[q + "_" + pr] && r[pr]) tasks.push({ q: q, pr: pr, k: q + "_" + pr }); }); });
  if(!tasks.length) return true;
  if(ts.loading){ ts.pending = true; return false; }
  ts.loading = true;
  var next = 0, done = 0;
  tsProg(0, tasks.length);
  var worker = async function(){
    while(next < tasks.length){
      var tk = tasks[next++];
      if(!m[tk.k]){
        m[tk.k] = 2;
        try {
          var res = await fetch("https://www.washington.edu/students/timeschd/" + tk.q + "/" + r[tk.pr]);
          if(res.ok){ o = o.concat(d(await res.text(), tk.q)); m[tk.k] = 1; }
        } catch(err){ console.error("Fetch error for " + tk.q + " " + tk.pr + ":", err); }
      }
      tsProg(++done, tasks.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  ts.loading = false;
  if(ts.pending){ ts.pending = false; setTimeout(tsRender, 0); }
  return true;
}
function tsEmpty(msg){
  ts.D = null; ts.ctx = null;
  $("#ts-main").html("<h4>Instructors over time</h4><p class='tf-sub'>" + msg + "</p>");
  $("#ts-dept, #ts-cards, #ts-heat, #ts-table").hide();
  $("#ts-chips").empty(); $("#ts-sel-count").text("");
}
function tsRender(){
  if(!ts.on) return;
  var gen = ++ts.gen, ys = tsYears(), types = tsTypes();
  $("#ts-range").text(tsAYLabel(ys[0]) + " to " + tsAYLabel(ys[ys.length - 1]) + (types.length ? " · " + types.join(", ") : ""));
  if(!h.length){ tsEmpty("Add a prefix above to see instructors over time."); return; }
  if(!types.length){ tsEmpty("Check at least one quarter next to the Year menu."); return; }
  var qs = []; ys.forEach(function(y){ types.forEach(function(q){ qs.push(tsQOf(y, q)); }); });
  if(!ts.D) $("#ts-main").html("<h4>Instructors over time</h4><p class='tf-sub'>Loading " + ys.length + " academic years of Time Schedule pages for " + wlEsc(h.join(", ")) + "…</p>");
  tsLoad(qs).then(function(ok){ if(ok && gen === ts.gen) tsDraw(); });
}
/* ---- Data ---- */
function tsBuild(){
  var ys = tsYears(), types = tsTypes(), genEds = $(".gened-filter:checked").map(function(){ return this.value; }).get();
  var qs = [], qYear = {}, dept = {};
  ys.forEach(function(y){ dept[y] = { y: y, tot: 0, tba: 0, qs: [], miss: [] }; types.forEach(function(q){ var id = tsQOf(y, q); qs.push(id); qYear[id] = y; dept[y].qs.push(id); if(!h.some(function(pr){ return m[id + "_" + pr] === 1; })) dept[y].miss.push(id); }); });
  var recs = o.filter(function(row){ return qYear[row.quarter] && h.indexOf(row.prefix) !== -1 && wlMatchGenEd(row, genEds); });
  var G = instGroups(recs), P = {}, excl = {}, nExcl = 0;
  wlExcl.forEach(function(nm){ var k = G.keyOf[nm]; if(k && !excl[k]){ excl[k] = true; nExcl++; } });
  recs.forEach(function(row){
    var y = qYear[row.quarter], D0 = dept[y], k = G.keyOf[row.instructor] || String(row.instructor).toUpperCase();
    if(excl[k]) return;
    D0.tot += row.sch;
    if(/^(TBA|STAFF)$/.test(row.instructor)){ D0.tba += row.sch; return; }
    var gp = G.groups[k];
    var pp = P[k] || (P[k] = { key: k, label: gp ? gp.label : row.instructor, names: gp ? gp.names : [row.instructor], Y: {}, Q: {}, C: {}, tot: 0 });
    var py = pp.Y[y] || (pp.Y[y] = { sch: 0, stu: 0, sec: 0, enrl: 0, lim: 0, limEnrl: 0, lvl: {}, recs: [] });
    var lv = parseInt(row.number.charAt(0), 10);
    py.sch += row.sch; py.stu += row.enrl * (row.credits ? row.splitCredits / row.credits : 1); py.sec += 1; py.enrl += row.enrl;
    if(row.lim > 0){ py.lim += row.lim; py.limEnrl += row.enrl; }
    py.lvl[lv] = (py.lvl[lv] || 0) + row.sch;
    py.recs.push(row);
    var pq = pp.Q[row.quarter] || (pp.Q[row.quarter] = { sch: 0, recs: [] }); pq.sch += row.sch; pq.recs.push(row);
    var cid = row.prefix + " " + row.number, cc = pp.C[cid] || (pp.C[cid] = { id: cid, name: row.name, sch: 0, n: 0, enrl: 0 });
    cc.sch += row.sch; cc.n += 1; cc.enrl += row.enrl;
    pp.tot += row.sch;
  });
  var last = ys[ys.length - 1];
  var people = Object.keys(P).map(function(k){
    var pp = P[k], enrl = 0, sec = 0, lim = 0, limEnrl = 0, lvl = {};
    pp.yrs = ys.filter(function(y){ return pp.Y[y]; });
    pp.fullYrs = pp.yrs.filter(function(y){ return !dept[y].miss.length; });
    pp.mean = pp.fullYrs.length ? pp.fullYrs.reduce(function(a, y){ return a + pp.Y[y].sch; }, 0) / pp.fullYrs.length : null;
    pp.slope = tsSlope(pp.fullYrs.map(function(y){ return [y, pp.Y[y].sch]; }));
    pp.tgt = pp.fullYrs.filter(function(y){ return pp.Y[y].sch >= f; }).length;
    pp.yrs.forEach(function(y){ var py = pp.Y[y]; enrl += py.enrl; sec += py.sec; lim += py.lim; limEnrl += py.limEnrl; Object.keys(py.lvl).forEach(function(lv){ lvl[lv] = (lvl[lv] || 0) + py.lvl[lv]; }); });
    pp.size = sec ? enrl / sec : null; pp.fill = lim ? limEnrl / lim : null; pp.lvl = lvl;
    pp.intro = pp.tot ? ((lvl[1] || 0) + (lvl[2] || 0)) / pp.tot : null;
    pp.last = pp.Y[last] ? pp.Y[last].sch : null;
    pp.delta = pp.Y[last] && pp.Y[last - 1] ? pp.Y[last].sch - pp.Y[last - 1].sch : null;
    pp.top = Object.keys(pp.C).map(function(c){ return pp.C[c]; }).sort(function(a, b){ return b.sch - a.sch; });
    return pp;
  }).sort(function(a, b){ return b.tot - a.tot; });
  ys.forEach(function(y){
    var vals = people.filter(function(pp){ return pp.Y[y]; }).map(function(pp){ return pp.Y[y].sch; }).sort(function(a, b){ return a - b; });
    var D0 = dept[y]; D0.n = vals.length; D0.nAt = vals.filter(function(v){ return v >= f; }).length;
    D0.med = vals.length ? tsQ(vals, 0.5) : null; D0.gini = vals.length >= 3 ? wlGini(vals) : null;
  });
  return { ys: ys, qs: qs, qYear: qYear, dept: dept, P: P, people: people, nExcl: nExcl, last: last };
}
/* ---- Selection ----
   Up to eight instructors, each keeping its colour while selected; colours go in the palette's fixed order. */
function tsAssign(k){
  var used = ts.sel.filter(function(s0){ return s0 !== k; }).map(function(s0){ return ts.col[s0]; });
  if(!ts.col[k] || used.indexOf(ts.col[k]) !== -1) ts.col[k] = TSC.filter(function(c){ return used.indexOf(c) === -1; })[0];
}
function tsRemap(Dt){
  var up = {};
  Dt.people.forEach(function(pp){ up[pp.key] = pp.key; pp.names.forEach(function(nm){ up[String(nm).toUpperCase()] = pp.key; }); });
  var sel = [], col = {};
  ts.sel.forEach(function(k){ var nk = up[k]; if(nk && sel.indexOf(nk) === -1){ sel.push(nk); col[nk] = ts.col[k]; } });
  Object.keys(ts.col).forEach(function(k){ if(!(k in col) && up[k] === k) col[k] = ts.col[k]; });
  ts.sel = sel; ts.col = col;
  sel.forEach(tsAssign);
}
function tsDefault(Dt){
  var full = Dt.ys.filter(function(y){ return !Dt.dept[y].miss.length && Dt.dept[y].n; }), yy = full[full.length - 1];
  var v = function(pp){ return yy ? (pp.Y[yy] ? pp.Y[yy].sch : 0) : pp.tot; };
  ts.sel = [];
  Dt.people.slice().sort(function(a, b){ return v(b) - v(a); }).slice(0, 4).forEach(function(pp){ ts.sel.push(pp.key); tsAssign(pp.key); });
}
function tsSelPeople(Dt){ return ts.sel.map(function(k){ return Dt.P[k]; }).filter(Boolean); }
function tsToggle(k){
  if(!ts.D) return;
  var i0 = ts.sel.indexOf(k);
  ts.touched = true;
  if(i0 !== -1) ts.sel.splice(i0, 1);
  else {
    if(ts.sel.length >= 8){ $("#ts-sel-count").addClass("warn").text("Up to 8 instructors at a time: remove one first."); tsTable(ts.D); return; }
    ts.sel.push(k); tsAssign(k);
  }
  tsDraw();
}
/* ---- Highlighting and tooltips ---- */
function tsHi(dn){
  var mine = dn ? String(dn).split("|") : null;
  $("#time-series-view .wl-p").each(function(){
    if(!mine){ this.classList.remove("wl-hi", "wl-dim"); return; }
    var hit = String(this.getAttribute("data-n")).split("|").some(function(nm){ return mine.indexOf(nm) !== -1; });
    this.classList.toggle("wl-hi", hit); this.classList.toggle("wl-dim", !hit);
  });
}
function tsTip(html, cx, cy){
  var tip = document.getElementById("ts-tip");
  if(html === null){ tip.style.display = "none"; return; }
  tip.innerHTML = html; tip.style.display = "block";
  var w = tip.offsetWidth, hh = tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, x0 = cx + 14, y0 = cy + 14;
  if(x0 + w > vw - 8) x0 = Math.max(8, cx - w - 14);
  if(y0 + hh > vh - 8) y0 = Math.max(8, cy - hh - 14);
  tip.style.left = x0 + "px"; tip.style.top = y0 + "px";
}
/* ---- Drawing ---- */
function tsDraw(){
  if(!ts.on) return;
  var Dt = tsBuild(); ts.D = Dt;
  if(!Dt.people.length){ tsEmpty("No instructors with sections in " + wlEsc(h.join(", ")) + " from " + tsAYLabel(Dt.ys[0]) + " to " + tsAYLabel(Dt.last) + "."); return; }
  tsRemap(Dt);
  if(!ts.sel.length && !ts.touched) tsDefault(Dt);
  $("#ts-dept, #ts-cards, #ts-heat, #ts-table").show();
  tsPicker(Dt); tsMain(Dt); tsDept(Dt); tsCards(Dt); tsHeat(Dt); tsTable(Dt);
}
function tsPicker(Dt){
  var box = $("#ts-chips").empty();
  ts.sel.forEach(function(k){
    var pp = Dt.P[k]; if(!pp) return;
    var chip = $("<span class='ts-chip'></span>").attr("data-n", pp.names.map(function(nm){ return String(nm).toUpperCase(); }).join("|"));
    chip.append($("<i></i>").css("background", ts.col[k])).append($("<span></span>").text(pp.label));
    chip.append($("<button type='button'>×</button>").attr({ "aria-label": "Remove " + pp.label, "data-k": k }));
    box.append(chip);
  });
  $("#ts-sel-count").removeClass("warn").text(ts.sel.length + " of 8 selected · " + Dt.people.length + " instructors taught in these years");
}
function tsSuggest(){
  var Dt = ts.D, qv = String($("#ts-search").val()).trim().toLowerCase(), box = $("#ts-suggest").empty();
  if(!Dt || !qv){ box.hide(); return; }
  var list = Dt.people.filter(function(pp){ return ts.sel.indexOf(pp.key) === -1 && pp.names.join(" ").toLowerCase().indexOf(qv) !== -1; }).slice(0, 10);
  if(!list.length){ box.append($("<div class='ts-opt none'></div>").text("No instructor matches “" + qv + "”")).show(); return; }
  list.forEach(function(pp, i){
    var opt = $("<div class='ts-opt' role='option'></div>").attr("data-k", pp.key).toggleClass("act", i === 0);
    opt.append($("<b></b>").text(pp.label)).append($("<span></span>").text((pp.mean !== null ? wlFmt(pp.mean) + " SCH/yr · " : "") + pp.yrs.length + " of " + Dt.ys.length + " yrs"));
    box.append(opt);
  });
  box.show();
}
function tsMain(Dt){
  var el = $("#ts-main"), M = TSM[ts.measure], ys = Dt.ys, n = ys.length, isSch = ts.measure === "sch", sel = tsSelPeople(Dt);
  var W = wlWidth("ts-main"), L = 50, Rm = Math.min(170, Math.max(120, W * 0.2)), T = 14, B = 42, H = 380, pw = Math.max(160, W - L - Rm), ph = H - T - B;
  var X = function(i){ return n > 1 ? L + i / (n - 1) * pw : L + pw / 2; }, half = n > 1 ? pw / (n - 1) / 2 : pw / 2;
  var band = ys.map(function(y){
    var D0 = Dt.dept[y], vals = Dt.people.filter(function(pp){ return pp.Y[y]; }).map(function(pp){ return M.v(pp.Y[y], D0); }).sort(function(a, b){ return a - b; });
    if(!vals.length) return null;
    var b0 = { n: vals.length, md: tsQ(vals, 0.5), vals: vals };
    if(vals.length >= 3){ b0.q1 = tsQ(vals, 0.25); b0.q3 = tsQ(vals, 0.75); }
    return b0;
  });
  var maxV = isSch ? f : 0;
  band.forEach(function(b0){ if(b0) maxV = Math.max(maxV, b0.q3 !== undefined ? b0.q3 : b0.md); });
  sel.forEach(function(pp){ ys.forEach(function(y){ if(pp.Y[y]) maxV = Math.max(maxV, M.v(pp.Y[y], Dt.dept[y])); }); });
  var tk = tsTicks(maxV * 1.04), Y = function(v){ return T + ph - v / tk.max * ph; };
  var s = "<svg width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='" + wlEsc(M.label + " by academic year for the selected instructors, with the department median and middle 50%") + "'>";
  s += "<defs><pattern id='ts-hatch-m' width='6' height='6' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><line x1='0' y1='0' x2='0' y2='6' stroke='#ecebe6' stroke-width='2.5'/></pattern></defs>";
  ys.forEach(function(y, i){
    if(!Dt.dept[y].miss.length) return;
    var x0 = Math.max(L - 4, X(i) - half), x1 = Math.min(L + pw + 4, X(i) + half);
    s += "<rect x='" + x0.toFixed(1) + "' y='" + T + "' width='" + (x1 - x0).toFixed(1) + "' height='" + ph + "' fill='url(#ts-hatch-m)'/>";
  });
  for(var gi = 0; gi * tk.step <= tk.max + 1e-9; gi++){
    var gv = gi * tk.step, gy = Y(gv).toFixed(1);
    s += "<line x1='" + L + "' x2='" + (L + pw) + "' y1='" + gy + "' y2='" + gy + "' stroke='" + (gi ? "#f0efec" : "#c3c2b7") + "'/>";
    s += "<text x='" + (L - 8) + "' y='" + (+gy + 3.5) + "' font-size='10' fill='#898781' text-anchor='end'>" + tsNum(gv, tk.step) + (ts.measure === "share" ? "%" : "") + "</text>";
  }
  var spacing = n > 1 ? pw / (n - 1) : pw, every = Math.max(1, Math.ceil((spacing >= 58 ? 58 : 40) / spacing));
  ys.forEach(function(y, i){
    if((n - 1 - i) % every) return;
    s += "<text x='" + X(i).toFixed(1) + "' y='" + (T + ph + 16) + "' font-size='10' fill='#52514e' text-anchor='middle'>" + (spacing * every >= 58 ? tsAYLabel(y) : String(y - 1).slice(2) + "-" + String(y).slice(2)) + "</text>";
    if(Dt.dept[y].miss.length) s += "<text x='" + X(i).toFixed(1) + "' y='" + (T + ph + 28) + "' font-size='9' fill='#898781' text-anchor='middle'>partial</text>";
  });
  s += "<text x='" + (L + pw / 2) + "' y='" + (H - 2) + "' font-size='10' fill='#52514e' text-anchor='middle'>academic year</text>";
  var bIdx = band.map(function(b0, i){ return b0 && b0.q1 !== undefined ? i : -1; }).filter(function(i){ return i >= 0; });
  tsRuns(bIdx).forEach(function(run){
    if(run.length < 2) return;
    var up = run.map(function(i){ return X(i).toFixed(1) + "," + Y(band[i].q3).toFixed(1); }), dn = run.slice().reverse().map(function(i){ return X(i).toFixed(1) + "," + Y(band[i].q1).toFixed(1); });
    s += "<polygon points='" + up.concat(dn).join(" ") + "' fill='#ece7f4'/>";
  });
  var mIdx = band.map(function(b0, i){ return b0 ? i : -1; }).filter(function(i){ return i >= 0; });
  tsRuns(mIdx).forEach(function(run){ if(run.length > 1) s += "<path d='" + run.map(function(i, j){ return (j ? "L" : "M") + X(i).toFixed(1) + " " + Y(band[i].md).toFixed(1); }).join("") + "' fill='none' stroke='#898781' stroke-width='1.5' stroke-linejoin='round'/>"; });
  if(isSch) s += "<line x1='" + L + "' x2='" + (L + pw) + "' y1='" + Y(f).toFixed(1) + "' y2='" + Y(f).toFixed(1) + "' stroke='#52514e' stroke-dasharray='4 3'/>";
  var ends = [], shortCount = {};
  sel.forEach(function(pp){ var sh = tsShort(pp.label); shortCount[sh] = (shortCount[sh] || 0) + 1; });
  sel.forEach(function(pp){
    var col = ts.col[pp.key], pts = [];
    ys.forEach(function(y, i){ if(pp.Y[y]) pts.push({ i: i, x: X(i), v: M.v(pp.Y[y], Dt.dept[y]), part: Dt.dept[y].miss.length > 0 }); });
    if(!pts.length) return;
    var solid = "", dash = "", gap = "";
    for(var j = 1; j < pts.length; j++){
      var a0 = pts[j - 1], b0 = pts[j], seg = "M" + a0.x.toFixed(1) + " " + Y(a0.v).toFixed(1) + "L" + b0.x.toFixed(1) + " " + Y(b0.v).toFixed(1);
      if(b0.i - a0.i > 1) gap += seg; else if(a0.part || b0.part) dash += seg; else solid += seg;
    }
    s += "<g class='wl-p' data-n='" + wlNames(pp.names) + "'>";
    if(gap) s += "<path d='" + gap + "' fill='none' stroke='" + col + "' stroke-width='2' stroke-dasharray='0.5 5' stroke-linecap='round'/>";
    if(dash) s += "<path d='" + dash + "' fill='none' stroke='" + col + "' stroke-width='2' stroke-dasharray='5 3'/>";
    if(solid) s += "<path d='" + solid + "' fill='none' stroke='" + col + "' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/>";
    pts.forEach(function(q){ s += "<circle cx='" + q.x.toFixed(1) + "' cy='" + Y(q.v).toFixed(1) + "' r='4' fill='" + (q.part ? "#ffffff" : col) + "' stroke='" + (q.part ? col : "#ffffff") + "' stroke-width='2'/>"; });
    s += "</g>";
    var lp = pts[pts.length - 1];
    ends.push({ y: Y(lp.v), x: lp.x, txt: shortCount[tsShort(pp.label)] > 1 ? pp.label : tsShort(pp.label), val: M.fmt(lp.v), col: col, dn: wlNames(pp.names), early: lp.i < n - 1 });
  });
  var lb = mIdx.length ? band[mIdx[mIdx.length - 1]] : null;
  if(lb) ends.push({ y: Y(lb.md), txt: "median", val: M.fmt(lb.md), muted: true });
  if(isSch) ends.push({ y: Y(f), txt: "target", val: wlFmt(f), muted: true });
  /* labels top to bottom, each at least 13px below the one above, then shifted up together if they run off the plot */
  ends.sort(function(a, b){ return a.y - b.y; });
  ends.forEach(function(p0, i){ p0.ly = i ? Math.max(p0.y, ends[i - 1].ly + 13) : p0.y; });
  var over = ends.length ? ends[ends.length - 1].ly - (T + ph + 4) : 0;
  if(over > 0) ends.forEach(function(p0){ p0.ly -= over; });
  var lx = L + pw + 10, maxCh = Math.max(6, Math.floor((Rm - 60) / 6.2));
  ends.forEach(function(p0){
    var nm = p0.txt.length > maxCh ? p0.txt.slice(0, maxCh - 1) + "…" : p0.txt;
    if(p0.muted){ s += "<text x='" + (lx + 16) + "' y='" + (p0.ly + 3.5).toFixed(1) + "' font-size='10' fill='#898781'>" + p0.txt + " " + p0.val + "</text>"; return; }
    s += "<g class='wl-p' data-n='" + p0.dn + "'>";
    if(p0.early) s += "<line x1='" + (p0.x + 6).toFixed(1) + "' y1='" + p0.y.toFixed(1) + "' x2='" + (lx - 2) + "' y2='" + p0.ly.toFixed(1) + "' stroke='#c3c2b7' stroke-dasharray='2 3'/>";
    s += "<line x1='" + lx + "' x2='" + (lx + 12) + "' y1='" + p0.ly.toFixed(1) + "' y2='" + p0.ly.toFixed(1) + "' stroke='" + p0.col + "' stroke-width='3' stroke-linecap='round'/>";
    s += "<text x='" + (lx + 16) + "' y='" + (p0.ly + 3.5).toFixed(1) + "' font-size='11' fill='#0b0b0b'>" + wlEsc(nm) + " <tspan fill='#52514e'>" + p0.val + "</tspan></text></g>";
  });
  s += "<line id='ts-xh' x1='0' x2='0' y1='" + T + "' y2='" + (T + ph) + "' stroke='#52514e' stroke-width='1' visibility='hidden' pointer-events='none'/>";
  s += "<rect class='ts-ov' x='" + (L - 8) + "' y='" + T + "' width='" + (pw + 16) + "' height='" + ph + "' fill='transparent' tabindex='0' aria-label='Year by year readout: use the left and right arrow keys'/>";
  s += "</svg>";
  ts.ctx = { X: X, Y: Y, ys: ys, n: n, L: L, pw: pw, T: T, sel: sel, band: band, M: M, Dt: Dt };
  ts.hover = -1;
  var key = "<div class='tf-key'><span><i style='background:#ece7f4'></i>middle 50% of instructors</span><span><i style='height:2px;background:#898781;vertical-align:3px'></i>median instructor</span>" + (isSch ? "<span><i style='height:0;border-top:1.5px dashed #52514e;vertical-align:3px;background:none'></i>SCH target</span>" : "") + (Dt.ys.some(function(y){ return Dt.dept[y].miss.length; }) ? "<span><i style='background:url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%276%27 height=%276%27%3E%3Cpath d=%27M0 6L6 0%27 stroke=%27%23c3c2b7%27 stroke-width=%271.5%27/%3E%3C/svg%3E\");border:1px solid #e1e0d9'></i>partial year</span>" : "") + "</div>";
  var sub = M.sub + " " + (sel.length ? "Coloured lines are the selected instructors; dotted stretches cross years with no sections in these prefixes (the Time Schedule does not say why: leave, buyout, or teaching elsewhere)." : "Choose instructors above to draw their lines.") + " Hover or use the arrow keys for each year's values and ranks.";
  el.html("<h4>" + M.label + " by academic year, " + tsAYLabel(ys[0]) + " to " + tsAYLabel(Dt.last) + "</h4><p class='tf-sub'>" + sub + "</p>" + key + s);
}
function tsMainAt(i, py, cx, cy){
  var c = ts.ctx; if(!c) return;
  var y = c.ys[i], D0 = c.Dt.dept[y], M = c.M, b0 = c.band[i];
  ts.hover = i;
  $("#ts-xh").attr({ x1: c.X(i), x2: c.X(i), visibility: "visible" });
  var rows = c.sel.map(function(pp){ var pyr = pp.Y[y]; return { pp: pp, py: pyr, v: pyr ? M.v(pyr, D0) : null }; });
  var near = null, best = 16;
  if(py >= 0) rows.forEach(function(r0){ if(r0.v === null) return; var dd = Math.abs(c.Y(r0.v) - py); if(dd < best){ best = dd; near = r0.pp; } });
  tsHi(near ? wlNames(near.names) : null);
  var all = b0 ? b0.vals : [];
  rows.sort(function(a, b){ return (b.v === null ? -1 : b.v) - (a.v === null ? -1 : a.v); });
  var html = "<div class='tt-h'>" + tsAYLabel(y) + (D0.miss.length ? " <span>partial: no page yet for " + wlEsc(D0.miss.map(tsQLabel).join(", ")) + "</span>" : "") + "</div>";
  rows.forEach(function(r0){
    var rank = r0.v === null ? 0 : all.filter(function(v){ return v > r0.v + 1e-9; }).length + 1;
    html += "<div class='tt-r" + (near === r0.pp ? " hi" : "") + (r0.v === null ? " off" : "") + "'><i style='background:" + ts.col[r0.pp.key] + "'></i>" + (r0.v === null ? "–" : "<b>" + M.fmt(r0.v) + "</b>") + " " + wlEsc(tsShort(r0.pp.label)) + " <span class='tt-m'>" + (r0.v === null ? "no sections" : "#" + rank + " of " + all.length + " · " + r0.py.sec + " course" + (r0.py.sec === 1 ? "" : "s")) + "</span></div>";
  });
  html += "<div class='tt-f'>" + (b0 ? "All " + b0.n + " instructors: median " + M.fmt(b0.md) + (b0.q1 !== undefined ? ", middle 50% " + M.fmt(b0.q1) + " to " + M.fmt(b0.q3) : "") : "No sections this year") + ". " + wlFmt(D0.tot) + " SCH in all" + (D0.tba ? " (" + wlFmt(D0.tba) + " TBA or STAFF)" : "") + ".</div>";
  if(near){
    var recs = near.Y[y].recs.slice().sort(function(a, b){ return a.quarter.localeCompare(b.quarter) || b.sch - a.sch; });
    html += "<div class='tt-f'><b>" + wlEsc(near.label) + "</b><br>" + recs.slice(0, 9).map(function(row){ return wlEsc(tsCourseLine(row)); }).join("<br>") + (recs.length > 9 ? "<br>and " + (recs.length - 9) + " more" : "") + "</div>";
  }
  tsTip(html, cx, cy);
}
function tsMainOff(){ ts.hover = -1; $("#ts-xh").attr("visibility", "hidden"); tsHi(null); tsTip(null); }
function tsDept(Dt){
  var el = $("#ts-dept"), ys = Dt.ys, n = ys.length, W = wlWidth("ts-dept"), L = 40, pw = W - L - 8, slot = pw / n, bw = Math.max(3, Math.min(22, slot * 0.64));
  var cx = function(i){ return L + slot * (i + 0.5); }, ph = 70, step = ph + 44, H = 3 * step + 6;
  var s = "<svg width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='Department SCH, instructors teaching, and concentration of SCH by academic year'>";
  var prevTot = function(i){ return i && Dt.dept[ys[i - 1]].tot ? Dt.dept[ys[i - 1]].tot : null; };
  var head = function(top, title, keys){
    s += "<text x='0' y='" + (top + 11) + "' font-size='11' font-weight='600' fill='#4b2e83'>" + title + "</text>";
    var kx = W - 2;
    keys.slice().reverse().forEach(function(kk){ var tw = kk[1].length * 5.4 + 16; kx -= tw; s += "<rect x='" + kx.toFixed(1) + "' y='" + (top + 4) + "' width='10' height='8' rx='2' fill='" + kk[0] + "'/><text x='" + (kx + 13).toFixed(1) + "' y='" + (top + 11) + "' font-size='9.5' fill='#52514e'>" + kk[1] + "</text>"; kx -= 4; });
  };
  var axis = function(y0, tk, Yp){
    [0, tk.max].forEach(function(v){ s += "<line x1='" + L + "' x2='" + (L + pw) + "' y1='" + Yp(v).toFixed(1) + "' y2='" + Yp(v).toFixed(1) + "' stroke='" + (v ? "#f0efec" : "#c3c2b7") + "'/><text x='" + (L - 6) + "' y='" + (Yp(v) + 3.5).toFixed(1) + "' font-size='9.5' fill='#898781' text-anchor='end'>" + tsNum(v, tk.step) + "</text>"; });
  };
  var bars = function(top, title, keys, stackOf, tipOf){
    var y0 = top + 20, base = y0 + ph, mx = 0, lastI = -1;
    ys.forEach(function(y, i){ var tot = stackOf(Dt.dept[y]).reduce(function(a, q){ return a + q[0]; }, 0); mx = Math.max(mx, tot); if(tot && !Dt.dept[y].miss.length) lastI = i; });
    var tk = tsTicks(mx), Yp = function(v){ return base - v / tk.max * ph; };
    head(top, title, keys); axis(y0, tk, Yp);
    ys.forEach(function(y, i){
      var D0 = Dt.dept[y], st = stackOf(D0), acc = 0, op = D0.miss.length ? 0.4 : 1;
      st.forEach(function(q){
        if(!q[0]) return;
        var yt = Yp(acc + q[0]), yb = Yp(acc) - (acc ? 2 : 0);
        if(yb - yt > 0.3) s += "<rect x='" + (cx(i) - bw / 2).toFixed(1) + "' y='" + yt.toFixed(1) + "' width='" + bw.toFixed(1) + "' height='" + (yb - yt).toFixed(1) + "' rx='2' fill='" + q[1] + "' fill-opacity='" + op + "'/>";
        acc += q[0];
      });
      if(i === lastI) s += "<text x='" + cx(i).toFixed(1) + "' y='" + (Yp(acc) - 4).toFixed(1) + "' font-size='9.5' fill='#0b0b0b' text-anchor='" + (i === n - 1 ? "end" : "middle") + "'>" + wlFmt(acc) + "</text>";
      s += "<rect x='" + (cx(i) - slot / 2).toFixed(1) + "' y='" + y0 + "' width='" + slot.toFixed(1) + "' height='" + ph + "' fill='transparent' data-tip='" + wlEsc(tipOf(y, D0, i)) + "'/>";
    });
  };
  var partNote = function(D0){ return D0.miss.length ? "<br><span class='tt-m'>Partial: no page yet for " + wlEsc(D0.miss.map(tsQLabel).join(", ")) + "</span>" : ""; };
  bars(0, "Department SCH", [["#4b2e83", "instructors"], ["#c3c2b7", "TBA/STAFF"]], function(D0){ return [[D0.tot - D0.tba, "#4b2e83"], [D0.tba, "#c3c2b7"]]; }, function(y, D0, i){
    var pv = prevTot(i), ch = pv ? (D0.tot - pv) / pv * 100 : null;
    return "<div class='tt-h'>" + tsAYLabel(y) + "</div><b>" + wlFmt(D0.tot) + "</b> SCH in all" + (ch !== null ? " <span class='tt-m'>(" + (ch >= 0 ? "+" : "−") + Math.abs(ch).toFixed(0) + "% from " + tsAYLabel(y - 1) + ")</span>" : "") + "<br>" + wlFmt(D0.tot - D0.tba) + " by named instructors<br>" + wlFmt(D0.tba) + " TBA or STAFF" + partNote(D0);
  });
  bars(step, "Instructors teaching", [["#4b2e83", "at/above target"], ["#b29fd9", "below"]], function(D0){ return [[D0.nAt, "#4b2e83"], [D0.n - D0.nAt, "#b29fd9"]]; }, function(y, D0){
    return "<div class='tt-h'>" + tsAYLabel(y) + "</div><b>" + D0.n + "</b> instructors with sections<br>" + D0.nAt + " at or above the " + f + " SCH target<br>" + (D0.n - D0.nAt) + " below it" + (D0.med !== null ? "<br>Median instructor: " + wlFmt(D0.med) + " SCH" : "") + partNote(D0);
  });
  var top = 2 * step, y0 = top + 20, base = y0 + ph, gmax = 0;
  ys.forEach(function(y){ if(Dt.dept[y].gini !== null) gmax = Math.max(gmax, Dt.dept[y].gini); });
  var tk = { max: Math.max(0.6, Math.ceil(gmax * 10) / 10), step: 0.1 }, Yg = function(v){ return base - v / tk.max * ph; };
  head(top, "Concentration of SCH (Gini)", []); axis(y0, tk, Yg);
  var gIdx = ys.map(function(y, i){ return Dt.dept[y].gini !== null ? i : -1; }).filter(function(i){ return i >= 0; });
  tsRuns(gIdx).forEach(function(run){ if(run.length > 1) s += "<path d='" + run.map(function(i, j){ return (j ? "L" : "M") + cx(i).toFixed(1) + " " + Yg(Dt.dept[ys[i]].gini).toFixed(1); }).join("") + "' fill='none' stroke='#4b2e83' stroke-width='2' stroke-linejoin='round'/>"; });
  gIdx.forEach(function(i){
    var D0 = Dt.dept[ys[i]], part = D0.miss.length > 0, gy = Yg(D0.gini);
    s += "<circle cx='" + cx(i).toFixed(1) + "' cy='" + gy.toFixed(1) + "' r='4' fill='" + (part ? "#ffffff" : "#4b2e83") + "' stroke='" + (part ? "#4b2e83" : "#ffffff") + "' stroke-width='2'/>";
    s += "<rect x='" + (cx(i) - slot / 2).toFixed(1) + "' y='" + y0 + "' width='" + slot.toFixed(1) + "' height='" + ph + "' fill='transparent' data-tip='" + wlEsc("<div class='tt-h'>" + tsAYLabel(ys[i]) + "</div>Gini <b>" + D0.gini.toFixed(2) + "</b> across " + D0.n + " instructors<br><span class='tt-m'>0: everyone teaches the same SCH; values near 1: a few instructors teach most of it.</span>" + partNote(D0)) + "'/>";
  });
  if(gIdx.length){ var li = gIdx[gIdx.length - 1]; s += "<text x='" + (cx(li) + (li === n - 1 ? -7 : 7)).toFixed(1) + "' y='" + (Yg(Dt.dept[ys[li]].gini) - 7).toFixed(1) + "' font-size='9.5' fill='#0b0b0b' text-anchor='" + (li === n - 1 ? "end" : "start") + "'>" + Dt.dept[ys[li]].gini.toFixed(2) + "</text>"; }
  var every = Math.max(1, Math.ceil(36 / slot));
  ys.forEach(function(y, i){ if((n - 1 - i) % every) return; s += "<text x='" + cx(i).toFixed(1) + "' y='" + (base + 14) + "' font-size='9.5' fill='#52514e' text-anchor='middle'>" + String(y - 1).slice(2) + "-" + String(y).slice(2) + "</text>"; });
  s += "</svg>";
  el.html("<h4>Department context</h4><p class='tf-sub'>All instructors in " + wlEsc(h.join(", ")) + ", each academic year. Pale bars and hollow dots are partial years. Hover a year for its numbers." + (Dt.nExcl ? " " + Dt.nExcl + " instructor" + (Dt.nExcl === 1 ? " unchecked in the Year view is" : "s unchecked in the Year view are") + " left out." : "") + "</p>" + s);
}
function tsCards(Dt){
  var el = $("#ts-cards"), sel = tsSelPeople(Dt), ys = Dt.ys;
  if(!sel.length){ el.html("<h4>Instructor profiles</h4><p class='tf-sub'>Choose instructors above, or click a name in the heatmap or the table below, to see their profiles here.</p>"); return; }
  var html = "<h4>Instructor profiles, " + tsAYLabel(ys[0]) + " to " + tsAYLabel(Dt.last) + "</h4><p class='tf-sub'>Mean, trend and years at target use the complete years in which the instructor taught. Bars: SCH per year, with the " + f + " SCH target dashed; pale bars are partial years. Course level: share of SCH by course number. Hover for details.</p><div class='ts-cards'>";
  sel.forEach(function(pp){ html += tsCard(pp, Dt); });
  el.html(html + "</div>");
}
function tsCard(pp, Dt){
  var col = ts.col[pp.key], ys = Dt.ys, n = ys.length, last = Dt.last, D1 = Dt.dept[last], part = D1.miss.length > 0, ly = pp.Y[last];
  var rank = ly ? Dt.people.filter(function(q){ return q.Y[last] && q.Y[last].sch > ly.sch + 1e-9; }).length + 1 : null;
  var stat = function(v, lab, sub, tip){ return "<div class='ts-stat'" + (tip ? " title='" + wlEsc(tip) + "'" : "") + "><b>" + v + "</b><span>" + lab + (sub ? "<br><em>" + sub + "</em>" : "") + "</span></div>"; };
  var arrow = function(v){ return v > 0 ? "▲ " + wlFmt(v) : v < 0 ? "▼ " + wlFmt(-v) : "no change"; };
  var h0 = "<div class='ts-card' data-n='" + wlNames(pp.names) + "'><h5><i style='background:" + col + "'></i><span" + (pp.names.length > 1 ? " title='" + wlEsc("Listed as: " + pp.names.join("; ")) + "'" : "") + ">" + wlEsc(pp.label) + "</span><button type='button' class='ts-x' data-k='" + wlEsc(pp.key) + "' aria-label='" + wlEsc("Remove " + pp.label) + "'>×</button></h5>";
  h0 += "<div class='ts-stats'>";
  h0 += stat(pp.mean !== null ? wlFmt(pp.mean) : "–", "mean SCH per year", pp.fullYrs.length + " complete year" + (pp.fullYrs.length === 1 ? "" : "s") + " taught", "Taught in " + pp.yrs.length + " of the " + n + " academic years shown");
  h0 += stat(ly ? wlFmt(ly.sch) : "–", tsAYLabel(last) + " SCH" + (part ? " (partial)" : ""), ly ? "#" + rank + " of " + D1.n + (pp.delta !== null ? " · " + arrow(pp.delta) : "") : "no sections", pp.delta !== null ? "Change from " + tsAYLabel(last - 1) + ": " + (pp.delta >= 0 ? "+" : "−") + wlFmt(Math.abs(pp.delta)) + " SCH" : "");
  h0 += stat(pp.slope !== null ? (pp.slope >= 0 ? "+" : "−") + wlFmt(Math.abs(pp.slope)) : "–", "trend, SCH per year", pp.slope !== null ? "least-squares, " + pp.fullYrs.length + " years" : "needs 3 complete years", "Slope of a straight line fitted to SCH against year, complete years taught only");
  h0 += stat(pp.fullYrs.length ? pp.tgt + " of " + pp.fullYrs.length : "–", "years at or above target", f + " SCH", "");
  h0 += stat(pp.size !== null ? pp.size.toFixed(0) : "–", "average class size", "students per section", "Mean enrollment across all sections taught in these years");
  h0 += stat(pp.fill !== null ? Math.round(pp.fill * 100) + "%" : "–", "seats filled", "enrolled ÷ limit", "Students enrolled divided by the enrollment limits of the same sections, all years");
  h0 += "</div>";
  /* SCH per year */
  var W = 300, Hh = 64, bl = 50, slot = W / n, bw = Math.max(3, Math.min(18, slot * 0.62)), mx = f;
  pp.yrs.forEach(function(y){ mx = Math.max(mx, pp.Y[y].sch); });
  var Yb = function(v){ return bl - v / mx * (bl - 6); };
  var s = "<svg width='100%' viewBox='0 0 " + W + " " + Hh + "' style='max-width:" + W + "px' role='img' aria-label='" + wlEsc("SCH per academic year for " + pp.label) + "'>";
  s += "<line x1='0' x2='" + W + "' y1='" + bl + "' y2='" + bl + "' stroke='#c3c2b7'/>";
  ys.forEach(function(y, i){
    var py = pp.Y[y], x0 = slot * (i + 0.5), part2 = Dt.dept[y].miss.length > 0;
    if(py) s += "<rect x='" + (x0 - bw / 2).toFixed(1) + "' y='" + Yb(py.sch).toFixed(1) + "' width='" + bw.toFixed(1) + "' height='" + Math.max(0.5, bl - Yb(py.sch)).toFixed(1) + "' rx='2' fill='" + col + "' fill-opacity='" + (part2 ? 0.35 : 1) + "'/>";
    var tip = "<div class='tt-h'>" + tsAYLabel(y) + (part2 ? " <span>partial</span>" : "") + "</div>" + (py ? "<b>" + wlFmt(py.sch) + "</b> SCH · " + py.sec + " course" + (py.sec === 1 ? "" : "s") + " · " + wlFmt(py.stu) + " students" + "<br>" + py.recs.slice().sort(function(a, b){ return a.quarter.localeCompare(b.quarter); }).slice(0, 9).map(function(row){ return wlEsc(tsCourseLine(row)); }).join("<br>") : "No sections in these prefixes");
    s += "<rect x='" + (x0 - slot / 2).toFixed(1) + "' y='0' width='" + slot.toFixed(1) + "' height='" + bl + "' fill='transparent' data-tip='" + wlEsc(tip) + "'/>";
  });
  s += "<line x1='0' x2='" + W + "' y1='" + Yb(f).toFixed(1) + "' y2='" + Yb(f).toFixed(1) + "' stroke='#52514e' stroke-dasharray='3 3' pointer-events='none'/>";
  s += "<text x='0' y='" + (Hh - 2) + "' font-size='9.5' fill='#898781'>" + tsAYLabel(ys[0]) + "</text><text x='" + W + "' y='" + (Hh - 2) + "' font-size='9.5' fill='#898781' text-anchor='end'>" + tsAYLabel(last) + "</text></svg>";
  h0 += s;
  /* course level mix */
  var lv = [1, 2, 3, 4, 5].filter(function(k){ return pp.lvl[k]; }), acc = 0, mix = "<div class='ts-sec'>Course level</div><div class='ts-mix'>";
  lv.forEach(function(k){
    var sh = pp.tot ? pp.lvl[k] / pp.tot : 0, txt = k + "00s " + Math.round(sh * 100) + "%";
    mix += "<span style='width:" + (sh * 100).toFixed(2) + "%;background:" + TSR[k - 1] + ";color:" + wlInk(TSR[k - 1]) + "' data-tip='" + wlEsc("<b>" + Math.round(sh * 100) + "%</b> of SCH from " + k + "00-level courses (" + wlFmt(pp.lvl[k]) + " SCH)") + "'>" + (sh >= 0.14 ? txt : "") + "</span>";
    acc += sh;
  });
  h0 += mix + "</div>";
  /* top courses */
  h0 += "<div class='ts-sec'>Courses with the most SCH</div><ul class='ts-courses'>";
  pp.top.slice(0, 4).forEach(function(c){
    h0 += "<li title='" + wlEsc(c.id + " " + c.name) + "'><span><b>" + wlEsc(c.id) + "</b> <em>×" + c.n + ", avg " + Math.round(c.enrl / c.n) + " students</em></span><span>" + wlFmt(c.sch) + " SCH · " + Math.round(c.sch / pp.tot * 100) + "%</span></li>";
  });
  if(pp.top.length > 4) h0 += "<li class='more'><span>" + (pp.top.length - 4) + " other course" + (pp.top.length === 5 ? "" : "s") + "</span><span>" + Math.round(pp.top.slice(4).reduce(function(a, c){ return a + c.sch; }, 0) / pp.tot * 100) + "%</span></li>";
  h0 += "</ul>";
  /* notes: plain statements drawn from the numbers above */
  var notes = [], first = pp.yrs[0], lastY = pp.yrs[pp.yrs.length - 1];
  if(pp.top[0] && pp.tot && pp.top[0].sch / pp.tot >= 0.4 && pp.top.length > 1) notes.push(Math.round(pp.top[0].sch / pp.tot * 100) + "% of SCH comes from one course, " + pp.top[0].id + ".");
  var gaps = ys.filter(function(y){ return y > first && y < lastY && !pp.Y[y]; });
  if(gaps.length) notes.push("No sections in " + gaps.map(tsAYLabel).join(", ") + ".");
  if(first > ys[0]) notes.push("First sections in this span: " + tsAYLabel(first) + ".");
  var fullAfter = ys.filter(function(y){ return y > lastY && !Dt.dept[y].miss.length; });
  if(fullAfter.length) notes.push("No sections since " + tsAYLabel(lastY) + ".");
  var recent = pp.fullYrs.slice(-3);
  if(recent.length === 3 && recent.every(function(y){ return pp.Y[y].sch < f; })) notes.push("Below the " + f + " SCH target in each of the last 3 complete years taught (" + recent.map(function(y){ return wlFmt(pp.Y[y].sch); }).join(", ") + ").");
  if(notes.length) h0 += "<ul class='ts-notes'>" + notes.map(function(x0){ return "<li>" + wlEsc(x0) + "</li>"; }).join("") + "</ul>";
  return h0 + "</div>";
}
function tsHeat(Dt){
  var el = $("#ts-heat"), selP = tsSelPeople(Dt), list = (ts.heatAll ? Dt.people : selP).slice().sort(function(a, b){ return b.tot - a.tot; });
  var prevScroll = el.find(".ts-heat-wrap").scrollTop() || 0;
  var types = tsTypes(), nT = types.filter(function(q){ return q !== "SUM"; }).length || 1, qT = f / nT;
  var edges = [0.5, 1, 1.5, 2].map(function(k){ return Math.max(5, Math.round(qT * k / 5) * 5); });
  var bin = function(v){ var k = 0; while(k < 4 && v >= edges[k]) k++; return k; };
  var ys = Dt.ys, nY = ys.length, qs = Dt.qs, nq = qs.length, W = wlWidth("ts-heat"), nameW = 170, Rr = 58, gapY = nY > 12 ? 2 : 4;
  var cw = Math.max(3, (W - nameW - Rr - gapY * (nY - 1)) / nq), rowH = 16;
  var qx = function(j){ return nameW + j * cw + ys.indexOf(Dt.qYear[qs[j]]) * gapY; }, gridR = qx(nq - 1) + cw;
  var hd = "<svg width='" + W + "' height='30' viewBox='0 0 " + W + " 30' aria-hidden='true'>";
  ys.forEach(function(y){
    var js = []; qs.forEach(function(q, j){ if(Dt.qYear[q] === y) js.push(j); });
    var x0 = qx(js[0]), x1 = qx(js[js.length - 1]) + cw, wd = x1 - x0;
    var lab = wd >= 50 ? tsAYLabel(y) : wd >= 28 ? String(y - 1).slice(2) + "-" + String(y).slice(2) : (ys.indexOf(y) % 2 ? "" : String(y).slice(2));
    if(lab) hd += "<text x='" + ((x0 + x1) / 2).toFixed(1) + "' y='11' font-size='10' fill='#52514e' text-anchor='middle'>" + lab + "</text>";
    if(cw >= 11) js.forEach(function(j){ hd += "<text x='" + (qx(j) + cw / 2).toFixed(1) + "' y='25' font-size='8.5' fill='#898781' text-anchor='middle'>" + qs[j].charAt(0) + "</text>"; });
  });
  hd += "<text x='" + (gridR + 6) + "' y='25' font-size='9.5' fill='#52514e'>total SCH</text></svg>";
  var Hb = list.length * rowH + 2, s = "<svg width='" + W + "' height='" + Hb + "' viewBox='0 0 " + W + " " + Hb + "' role='img' aria-label='SCH per quarter for each instructor'>";
  s += "<defs><pattern id='ts-hatch-h' width='5' height='5' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><line x1='0' y1='0' x2='0' y2='5' stroke='#e1e0d9' stroke-width='2'/></pattern></defs>";
  qs.forEach(function(q, j){ if(!h.some(function(pr){ return m[q + "_" + pr] === 1; })) s += "<rect x='" + qx(j).toFixed(1) + "' y='0' width='" + (cw - 1).toFixed(1) + "' height='" + Hb + "' fill='url(#ts-hatch-h)' data-tip='" + wlEsc("<b>" + tsQLabel(q) + "</b><br>No Time Schedule page for " + h.join(", ")) + "'/>"; });
  list.forEach(function(pp, ri){
    var y0 = ri * rowH + 1, isSel = ts.sel.indexOf(pp.key) !== -1, nm = pp.label.length > 26 ? pp.label.slice(0, 25) + "…" : pp.label;
    s += "<g class='wl-p' data-n='" + wlNames(pp.names) + "'>";
    if(isSel) s += "<rect x='0' y='" + (y0 + 2) + "' width='4' height='" + (rowH - 5) + "' rx='1' fill='" + ts.col[pp.key] + "'/>";
    s += "<text class='ts-name' data-k='" + wlEsc(pp.key) + "' tabindex='0' role='button' aria-pressed='" + isSel + "' x='" + (nameW - 8) + "' y='" + (y0 + 11) + "' font-size='11' text-anchor='end' fill='#0b0b0b'" + (isSel ? " font-weight='600'" : "") + "><title>" + wlEsc((isSel ? "Remove " : "Compare ") + pp.label) + "</title>" + wlEsc(nm) + "</text>";
    qs.forEach(function(q, j){
      var Q = pp.Q[q];
      if(!Q){ if(h.some(function(pr){ return m[q + "_" + pr] === 1; })) s += "<rect x='" + qx(j).toFixed(1) + "' y='" + (y0 + 1) + "' width='" + Math.max(1, cw - 1.5).toFixed(1) + "' height='" + (rowH - 3) + "' rx='1.5' fill='#f4f3ef'/>"; return; }
      var tip = "<div class='tt-h'>" + wlEsc(pp.label) + " <span>" + tsQLabel(q) + "</span></div><b>" + wlFmt(Q.sch) + "</b> SCH<br>" + Q.recs.map(function(row){ return wlEsc(tsCourseLine(row)); }).join("<br>");
      s += "<rect x='" + qx(j).toFixed(1) + "' y='" + (y0 + 1) + "' width='" + Math.max(1, cw - 1.5).toFixed(1) + "' height='" + (rowH - 3) + "' rx='1.5' fill='" + TSR[bin(Q.sch)] + "' data-tip='" + wlEsc(tip) + "'/>";
    });
    s += "<text x='" + (gridR + 6).toFixed(1) + "' y='" + (y0 + 11) + "' font-size='10.5' fill='#52514e'>" + wlFmt(pp.tot) + "</text></g>";
  });
  s += "</svg>";
  var lab = ["under " + edges[0], edges[0] + "–" + edges[1], edges[1] + "–" + edges[2], edges[2] + "–" + edges[3], edges[3] + "+"];
  var key = "<div class='tf-key'>" + TSR.map(function(c, i){ return "<span><i style='background:" + c + "'></i>" + lab[i] + "</span>"; }).join("") + "<span><i style='background:#f4f3ef'></i>no sections</span><span style='color:#898781'>SCH per quarter; " + Math.round(qT) + " is the yearly target spread over " + nT + " quarter" + (nT === 1 ? "" : "s") + "</span></div>";
  var tog = "<div class='seg' id='ts-heat-tog' role='group' aria-label='Rows shown'><button type='button' data-h='all' class='" + (ts.heatAll ? "on" : "") + "'>All instructors (" + Dt.people.length + ")</button><button type='button' data-h='sel' class='" + (ts.heatAll ? "" : "on") + "'>Selected (" + selP.length + ")</button></div>";
  el.html("<div class='ts-head'><h4>Teaching record by quarter</h4>" + tog + "</div><p class='tf-sub'>One row per instructor, most SCH first; one cell per quarter, darker with more SCH. Gaps show quarters without sections in these prefixes. Click a name to add or remove it from the comparison; hover a cell for its courses.</p>" + key + hd + "<div class='ts-heat-wrap'>" + (list.length ? s : "<p class='tf-sub'>No instructors selected.</p>") + "</div>");
  el.find(".ts-heat-wrap").scrollTop(prevScroll);
}
function tsTable(Dt){
  var el = $("#ts-table"), ys = Dt.ys, last = Dt.last, part = Dt.dept[last].miss.length > 0;
  if(!el.find("#ts-tsearch").length) el.html("<div class='ts-head'><h4 id='ts-thead'></h4><input type='search' id='ts-tsearch' placeholder='Filter by name' aria-label='Filter instructors by name'></div><p class='tf-sub' id='ts-tsub'></p><div class='ts-tbl-wrap' id='ts-twrap'></div>");
  var maxS = f;
  Dt.people.forEach(function(pp){ pp.yrs.forEach(function(y){ maxS = Math.max(maxS, pp.Y[y].sch); }); });
  $("#ts-thead").text("All instructors, " + tsAYLabel(ys[0]) + " to " + tsAYLabel(last));
  $("#ts-tsub").text("Click a row to add or remove it from the comparison (up to 8). The small charts share one scale, 0 to " + wlFmt(maxS) + " SCH, with the target dashed. Sort by any column. TBA and STAFF are left out." + (part ? " " + tsAYLabel(last) + " is partial (no page yet for " + Dt.dept[last].miss.map(tsQLabel).join(", ") + "), so its SCH and change are greyed." : ""));
  var C = [
    { k: "name", l: "Instructor", c: "l", t: "Instructor; spellings of one name are merged", g: function(pp){ return pp.label.toLowerCase(); }, d: 1 },
    { k: "spark", l: "SCH by year", c: "l", t: "SCH in each academic year, " + tsAYLabel(ys[0]) + " to " + tsAYLabel(last) },
    { k: "yrs", l: "Years", t: "Academic years with at least one section, of " + ys.length, g: function(pp){ return pp.yrs.length; }, f: function(v){ return v + "/" + ys.length; } },
    { k: "mean", l: "Mean SCH", t: "Mean SCH per complete year taught", g: function(pp){ return pp.mean; }, f: wlFmt },
    { k: "last", l: tsAYLabel(last), t: "SCH in " + tsAYLabel(last) + (part ? " (partial year)" : ""), g: function(pp){ return pp.last; }, f: wlFmt, pt: part },
    { k: "delta", l: "Change", t: "SCH change from " + tsAYLabel(last - 1) + " to " + tsAYLabel(last), g: function(pp){ return pp.delta; }, f: function(v){ return v > 0 ? "▲ " + wlFmt(v) : v < 0 ? "▼ " + wlFmt(-v) : "0"; }, pt: part },
    { k: "slope", l: "Trend/yr", t: "Least-squares slope of SCH on year over the complete years taught (needs 3)", g: function(pp){ return pp.slope; }, f: function(v){ return (v >= 0 ? "+" : "−") + wlFmt(Math.abs(v)); } },
    { k: "tgt", l: "≥ target", t: "Complete years taught at or above the " + f + " SCH target", g: function(pp){ return pp.fullYrs.length ? pp.tgt / pp.fullYrs.length : null; }, f: function(v, pp){ return pp.tgt + "/" + pp.fullYrs.length; } },
    { k: "size", l: "Avg class", t: "Average enrollment per section, all years shown", g: function(pp){ return pp.size; }, f: function(v){ return v.toFixed(0); } },
    { k: "fill", l: "Seats filled", t: "Students enrolled divided by enrollment limits, all years shown", g: function(pp){ return pp.fill; }, f: function(v){ return Math.round(v * 100) + "%"; } },
    { k: "intro", l: "100–200 level", t: "Share of SCH from 100- and 200-level courses", g: function(pp){ return pp.intro; }, f: function(v){ return Math.round(v * 100) + "%"; } }
  ];
  if(cecOn(Dt.qs)) C.push({ k: "cec", l: "Evaluations", t: "Course Evaluation Catalog: combined median of items 1 to 4 over the evaluated sections (computed here), with the number of sections; hover for surveyed and enrolled" });
  var sc = C.filter(function(c){ return c.k === ts.sort[0]; })[0] || C[3], dir = ts.sort[1];
  var qv = ts.q.toLowerCase();
  var rows = Dt.people.filter(function(pp){ return !qv || pp.names.join(" ").toLowerCase().indexOf(qv) !== -1; });
  rows.sort(function(a, b){
    var va = sc.g(a), vb = sc.g(b);
    if(va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1;
    if(vb === null || vb === undefined) return -1;
    return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * dir || b.tot - a.tot;
  });
  var spark = function(pp, col){
    var w = 120, hh = 24, n = ys.length, X = function(i){ return n > 1 ? 3 + i / (n - 1) * (w - 6) : w / 2; }, Yv = function(v){ return hh - 3 - v / maxS * (hh - 6); };
    var dp = "", prev = -2, dots = "", lastPt = null;
    ys.forEach(function(y, i){ var py = pp.Y[y]; if(!py) return; dp += (prev === i - 1 ? "L" : "M") + X(i).toFixed(1) + " " + Yv(py.sch).toFixed(1); dots += "<circle cx='" + X(i).toFixed(1) + "' cy='" + Yv(py.sch).toFixed(1) + "' r='1.3' fill='" + col + "'/>"; prev = i; lastPt = [X(i), Yv(py.sch)]; });
    return "<svg width='" + w + "' height='" + hh + "' viewBox='0 0 " + w + " " + hh + "' aria-hidden='true' style='display:block'><line x1='0' x2='" + w + "' y1='" + Yv(f).toFixed(1) + "' y2='" + Yv(f).toFixed(1) + "' stroke='#c3c2b7' stroke-dasharray='2 2'/><path d='" + dp + "' fill='none' stroke='" + col + "' stroke-width='1.5' stroke-linejoin='round'/>" + dots + (lastPt ? "<circle cx='" + lastPt[0].toFixed(1) + "' cy='" + lastPt[1].toFixed(1) + "' r='2.6' fill='" + col + "'/>" : "") + "</svg>";
  };
  var html = "<table class='ts-tbl'><thead><tr><th class='l' style='width:22px'><span class='sr'>Compare</span></th>" + C.map(function(c){ return "<th class='" + (c.c || "") + (c.g ? " srt" : "") + (c.k === sc.k ? " on" : "") + "'" + (c.g ? " data-s='" + c.k + "' tabindex='0' aria-sort='" + (c.k === sc.k ? (dir > 0 ? "ascending" : "descending") : "none") + "'" : "") + " title='" + wlEsc(c.t) + "'>" + c.l + (c.k === sc.k ? (dir > 0 ? " ↑" : " ↓") : "") + "</th>"; }).join("") + "</tr></thead><tbody>";
  rows.forEach(function(pp){
    var isSel = ts.sel.indexOf(pp.key) !== -1, col = isSel ? ts.col[pp.key] : "#4b2e83";
    html += "<tr class='ts-row" + (isSel ? " sel" : "") + "' data-k='" + wlEsc(pp.key) + "' data-n='" + wlNames(pp.names) + "'><td class='l'><input type='checkbox' class='ts-cb' aria-label='" + wlEsc("Compare " + pp.label) + "'" + (isSel ? " checked" : "") + " style='accent-color:" + col + "'></td>";
    C.forEach(function(c){
      if(c.k === "name"){ html += "<td class='l'" + (pp.names.length > 1 ? " title='" + wlEsc("Listed as: " + pp.names.join("; ")) + "'" : "") + ">" + (isSel ? "<i class='sw' style='background:" + col + "'></i>" : "") + wlEsc(pp.label) + "</td>"; return; }
      if(c.k === "cec"){ html += "<td>" + cecTsCell(pp, Dt) + "</td>"; return; }
      if(c.k === "spark"){ html += "<td class='l'>" + spark(pp, isSel ? col : "#6544a8") + "</td>"; return; }
      var v = c.g(pp);
      html += "<td class='" + (c.pt ? "pt" : "") + "'>" + (v === null || v === undefined ? "<span class='na'>–</span>" : c.f(v, pp)) + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  if(!rows.length) html += "<p class='tf-sub'>No instructor matches “" + wlEsc(ts.q) + "”.</p>";
  $("#ts-twrap").html(html);
}
/* ---- CSV: one row per instructor and academic year ---- */
function tsCSV(){
  var Dt = ts.D; if(!Dt) return;
  var out = [["instructor", "spellings", "academic_year", "partial_year", "sch", "students", "courses", "avg_class_size", "seats_filled_pct", "sch_100_200_level", "dept_sch", "share_of_dept_sch_pct", "rank_by_sch", "instructors_that_year"]];
  Dt.people.slice().sort(function(a, b){ return a.label.localeCompare(b.label); }).forEach(function(pp){
    Dt.ys.forEach(function(y){
      var py = pp.Y[y], D0 = Dt.dept[y]; if(!py) return;
      var rank = Dt.people.filter(function(q){ return q.Y[y] && q.Y[y].sch > py.sch + 1e-9; }).length + 1;
      out.push([pp.label, pp.names.join("; "), tsAYLabel(y), D0.miss.length ? "yes" : "no", py.sch.toFixed(1), py.stu.toFixed(1), py.sec, (py.enrl / py.sec).toFixed(1), py.lim ? (py.limEnrl / py.lim * 100).toFixed(1) : "", ((py.lvl[1] || 0) + (py.lvl[2] || 0)).toFixed(1), D0.tot.toFixed(1), D0.tot ? (py.sch / D0.tot * 100).toFixed(2) : "", rank, D0.n]);
    });
  });
  var csv = out.map(function(row){ return row.map(function(cell){ var c0 = String(cell); return /[",\n]/.test(c0) ? '"' + c0.replace(/"/g, '""') + '"' : c0; }).join(","); }).join("\n");
  var url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })), a0 = document.createElement("a");
  a0.href = url; a0.download = "instructor-sch-" + h.join("-").replace(/[^A-Za-z0-9-]+/g, "") + "-" + tsAYLabel(Dt.ys[0]) + "-to-" + tsAYLabel(Dt.last) + ".csv";
  document.body.appendChild(a0); a0.click(); a0.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
}
/* ---- Wiring ----
   S() redraws the Year view; while the time series is showing, it redraws that instead, and the Year view is redrawn
   when it is shown again. */
var tsS0 = S;
S = function(){ if(ts.on){ tsRender(); return; } tsS0(); };
function tsShow(on){
  ts.on = on;
  $(".vt-btn").each(function(){ var me = (this.getAttribute("data-view") === "ts") === on; $(this).toggleClass("on", me).attr("aria-pressed", String(me)); });
  $("#current-quarter-view").toggle(!on); $("#time-series-view").toggle(on);
  tsTip(null);
  if(on) tsRender(); else tsS0();
}
$(document).on("click", ".vt-btn", function(){ tsShow(this.getAttribute("data-view") === "ts"); });
$(document).on("change", "#ts-span", function(){ ts.span = parseInt(this.value, 10); tsRender(); });
$(document).on("click", "#ts-measure button", function(){ ts.measure = this.getAttribute("data-m"); $("#ts-measure button").each(function(){ $(this).toggleClass("on", this.getAttribute("data-m") === ts.measure).attr("aria-pressed", String(this.getAttribute("data-m") === ts.measure)); }); if(ts.D) tsMain(ts.D); });
$(document).on("click", "#ts-top", function(ev){ ev.preventDefault(); if(!ts.D) return; ts.touched = true; tsDefault(ts.D); tsDraw(); });
$(document).on("click", "#ts-clear", function(ev){ ev.preventDefault(); ts.touched = true; ts.sel = []; tsDraw(); });
$(document).on("click", "#ts-csv", tsCSV);
$(document).on("click", "#ts-chips button, .ts-card .ts-x", function(){ tsToggle(this.getAttribute("data-k")); });
$(document).on("mouseenter", ".ts-chip, .ts-card, #ts-table tr.ts-row", function(){ tsHi(this.getAttribute("data-n")); }).on("mouseleave", ".ts-chip, .ts-card, #ts-table tr.ts-row", function(){ tsHi(null); });
$(document).on("input", "#ts-search", tsSuggest);
$(document).on("keydown", "#ts-search", function(ev){
  var opts = $("#ts-suggest .ts-opt[data-k]"), act = opts.index(opts.filter(".act"));
  if(ev.key === "ArrowDown" || ev.key === "ArrowUp"){ ev.preventDefault(); if(!opts.length) return; act = (act + (ev.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length; opts.removeClass("act").eq(act).addClass("act"); return; }
  if(ev.key === "Enter"){ ev.preventDefault(); var k = opts.eq(Math.max(0, act)).attr("data-k"); if(k){ $(this).val(""); $("#ts-suggest").hide(); tsToggle(k); } return; }
  if(ev.key === "Escape"){ $(this).val(""); $("#ts-suggest").hide(); return; }
  if(ev.key === "Backspace" && !this.value && ts.sel.length) tsToggle(ts.sel[ts.sel.length - 1]);
});
$(document).on("mousedown", "#ts-suggest .ts-opt[data-k]", function(ev){ ev.preventDefault(); $("#ts-search").val(""); $("#ts-suggest").hide(); tsToggle(this.getAttribute("data-k")); });
$(document).on("blur", "#ts-search", function(){ setTimeout(function(){ $("#ts-suggest").hide(); }, 150); });
$(document).on("click", "#ts-picker", function(ev){ if(ev.target === this) $("#ts-search").focus(); });
$(document).on("click", "#ts-heat .ts-name", function(){ tsToggle(this.getAttribute("data-k")); });
$(document).on("keydown", "#ts-heat .ts-name", function(ev){ if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); tsToggle(this.getAttribute("data-k")); } });
$(document).on("click", "#ts-heat-tog button", function(){ ts.heatAll = this.getAttribute("data-h") === "all"; if(ts.D) tsHeat(ts.D); });
$(document).on("click", "#ts-table tr.ts-row", function(ev){ if($(ev.target).is("input")) return; tsToggle(this.getAttribute("data-k")); });
$(document).on("change", "#ts-table .ts-cb", function(){ tsToggle($(this).closest("tr").attr("data-k")); });
$(document).on("click keydown", "#ts-table th[data-s]", function(ev){
  if(ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;
  ev.preventDefault();
  var k = this.getAttribute("data-s");
  ts.sort = ts.sort[0] === k ? [k, -ts.sort[1]] : [k, k === "name" ? 1 : -1];
  if(ts.D){ tsTable(ts.D); $("#ts-table th[data-s='" + k + "']").focus(); }
});
$(document).on("input", "#ts-tsearch", function(){ ts.q = this.value; if(ts.D) tsTable(ts.D); });
$(document).on("pointermove", "#ts-main .ts-ov", function(ev){
  var c = ts.ctx; if(!c) return;
  var rc = this.ownerSVGElement.getBoundingClientRect(), px = ev.clientX - rc.left, py = ev.clientY - rc.top;
  var i = c.n > 1 ? Math.round((px - c.L) / c.pw * (c.n - 1)) : 0;
  tsMainAt(Math.max(0, Math.min(c.n - 1, i)), py, ev.clientX, ev.clientY);
});
$(document).on("pointerleave focusout", "#ts-main .ts-ov", tsMainOff);
$(document).on("keydown", "#ts-main .ts-ov", function(ev){
  var c = ts.ctx; if(!c || ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(ev.key) === -1) return;
  ev.preventDefault();
  var i = ev.key === "Home" ? 0 : ev.key === "End" ? c.n - 1 : ts.hover < 0 ? c.n - 1 : ts.hover + (ev.key === "ArrowLeft" ? -1 : 1);
  i = Math.max(0, Math.min(c.n - 1, i));
  var rc = this.ownerSVGElement.getBoundingClientRect();
  tsMainAt(i, -1, rc.left + c.X(i), rc.top + c.T + 20);
});
$(document).on("pointermove", "#time-series-view [data-tip]", function(ev){ tsTip(this.getAttribute("data-tip"), ev.clientX, ev.clientY); });
$(document).on("pointerleave", "#time-series-view [data-tip]", function(){ tsTip(null); });
window.addEventListener("resize", function(){ clearTimeout(ts.resizeT); ts.resizeT = setTimeout(function(){ if(ts.on && ts.D) tsDraw(); }, 150); });
function e0q(){ return e; }
/* ---- Course evaluations (CEC) ----
   The Course Evaluation Catalog (www.washington.edu/cec/, UW NetID required) lists one year of evaluations. Its letter
   pages, grouped by the first letter of the department name, are read once; then the evaluation page of every lecture or
   seminar section for the active prefixes. Quiz sections (two-letter sections, usually led by TAs) are left out. An
   evaluation is joined to the Time Schedule section with the same prefix, number, section and quarter; when a section
   lists several instructors, the one whose surname appears in the CEC name gets it. Nothing is stored beyond this tab.
   The combined median is computed here, not by the CEC: the response shares of the four standard items (course as a
   whole, course content, instructor's contribution, instructor's effectiveness) are averaged and the median interpolated
   the way the CEC computes each item's median (0 = Very Poor ... 5 = Excellent). Medians over several sections pool their
   shares weighted by the number surveyed. Every rating is shown with the number surveyed and enrolled. */
var CEC = "https://www.washington.edu/cec/";
var cec = { on: true, idx: null, idxBusy: false, err: null, byPre: {}, byKey: {}, qs: {}, busy: false, again: false, prog: "" };
var CECQ = { AU: "AUT", WI: "WIN", SP: "SPR", SU: "SUM" };
var CECCORE = [/course as a whole/i, /course content/i, /instructor.s contribution/i, /instructor.s effectiveness/i];
var CECNOTE = "Information from the Course Evaluation Catalog is for members of the UW academic community; publication or redistribution to anyone without a current UW NetID is prohibited.";
var cecPreRe = null;
/* Median of shares by score (dist[0] = Very Poor ... dist[5] = Excellent), interpolated within the median category; when
   exactly half the answers lie below a category boundary, the midpoint of the two neighbouring scores (as the CEC does). */
function cecMedian(dist){
  var tot = dist.reduce(function(a, b){ return a + b; }, 0), half = tot / 2, cum = 0;
  if(!tot) return null;
  for(var k = 0; k < 6; k++){
    if(dist[k] > 0 && cum + dist[k] >= half - 1e-9){
      if(Math.abs(cum + dist[k] - half) < 1e-9) for(var j = k + 1; j < 6; j++) if(dist[j] > 0) return (k + j) / 2;
      return Math.max(0, Math.min(5, k - 0.5 + (half - cum) / dist[k]));
    }
    cum += dist[k];
  }
  return 5;
}
function cecQOrd(q){ return parseInt(q.slice(3), 10) * 10 + { WIN: 1, SPR: 2, SUM: 3, AUT: 4 }[q.slice(0, 3)]; }
function cecQShort(q){ return { AUT: "AU", WIN: "WI", SPR: "SP", SUM: "SU" }[q.slice(0, 3)] + q.slice(5); }
function cecFmt(v){ return v === null || v === undefined ? "–" : v.toFixed(2); }
function cecNorm(x0){ return " " + String(x0).toLowerCase().replace(/[^a-z]+/g, " ").trim() + " "; }
function cecLine(href, text){
  if(!cecPreRe) cecPreRe = new RegExp("\\s(" + Object.keys(r).sort(function(a, b){ return b.length - a.length; }).map(function(k){ return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")\\s+(\\d{3})\\s+([A-Z0-9]{1,3})\\s*$");
  var parts = text.replace(/&amp;/g, "&").split(/(?:\s*&nbsp;)+\s*/).map(function(x0){ return x0.trim(); }).filter(Boolean);
  if(parts.length < 3) return null;
  var qm = parts[parts.length - 1].match(/^(AU|WI|SP|SU)(\d{2})$/), hm = (" " + parts[0]).match(cecPreRe);
  if(!qm || !hm) return null;
  return { href: href, pre: hm[1], num: hm[2], sec: hm[3], q: CECQ[qm[1]] + "20" + qm[2], name: parts[1], rank: parts.length > 3 ? parts.slice(2, -1).join(" ") : "", ev: undefined };
}
function cecPage(html){
  var cap = html.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
  if(!cap) return null;
  var ct = cap[1].replace(/&nbsp;/g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  var fm = ct.match(/Form\s+(\w+)\s*:\s*(.*?)\s*"(\d+)"\s*surveyed\s*"(\d+)"\s*enrolled/i);
  if(!fm) return null;
  var items = [], re = /<tr>\s*<td>([^<]*)<\/td>((?:\s*<td>[^<]*<\/td>){7})\s*<\/tr>/gi, mm;
  while((mm = re.exec(html))){
    var cells = mm[2].match(/<td>[^<]*<\/td>/gi).map(function(c0){ return c0.replace(/<\/?td>/gi, "").trim(); });
    var pct = cells.slice(0, 6).map(function(c0){ return parseFloat(c0) || 0; });
    items.push({ q: mm[1].replace(/:\s*$/, "").trim(), dist: [pct[5], pct[4], pct[3], pct[2], pct[1], pct[0]], med: parseFloat(cells[6]) });
  }
  var core = items.filter(function(it){ return it.dist.some(function(p0){ return p0 > 0; }) && CECCORE.some(function(rx){ return rx.test(it.q); }); });
  var dist = [0, 0, 0, 0, 0, 0];
  core.forEach(function(it){ it.dist.forEach(function(p0, k){ dist[k] += p0 / core.length; }); });
  return { form: fm[1], formName: fm[2], surv: parseInt(fm[3], 10), enr: parseInt(fm[4], 10), items: items, core: core.length ? dist : null, nCore: core.length, comb: core.length ? cecMedian(dist) : null };
}
async function cecGet(url){
  var res = await fetch(url, { credentials: "include" }), txt = await res.text();
  if(!res.ok) throw new Error("HTTP " + res.status);
  if(txt.indexOf("Course Evaluation Catalog") === -1) throw new Error("auth");
  return txt;
}
async function cecLoadIndex(){
  if(cec.idx || cec.idxBusy) return;
  cec.idxBusy = true; cec.err = null; cec.prog = "opening the catalog"; cecStatus();
  try {
    var toc = await cecGet(CEC + "toc.html"), letters = [], mm, re = /href="([a-z])-toc\.html"/gi;
    while((mm = re.exec(toc))) if(letters.indexOf(mm[1]) === -1) letters.push(mm[1]);
    var all = [], next = 0, done = 0;
    var worker = async function(){
      while(next < letters.length){
        var html = await cecGet(CEC + letters[next++] + "-toc.html"), re2 = /<a href="([a-z]\/[^"]+\.html)">([^<]+)<\/a>/gi, m2;
        while((m2 = re2.exec(html))){ var en = cecLine(m2[1], m2[2]); if(en) all.push(en); }
        cec.prog = "reading the catalog index, " + (++done) + " of " + letters.length + " pages"; cecStatus();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    var byPre = {}, byKey = {}, qs = {};
    all.forEach(function(en){
      (byPre[en.pre] = byPre[en.pre] || []).push(en);
      var k = en.pre + "|" + en.num + "|" + en.sec + "|" + en.q;
      (byKey[k] = byKey[k] || []).push(en);
      qs[en.q] = (qs[en.q] || 0) + 1;
    });
    cec.byPre = byPre; cec.byKey = byKey; cec.qs = qs; cec.idx = all;
  } catch(err){ cec.err = String(err && err.message || err); console.error("Course Evaluation Catalog:", err); }
  cec.idxBusy = false; cec.prog = "";
}
/* en.ev: undefined = not read yet, null = page without results, false = could not be read (Retry reads it again) */
async function cecLoadEvals(){
  if(cec.busy){ cec.again = true; return false; }
  cec.busy = true;
  var todo = [];
  h.forEach(function(pr){ (cec.byPre[pr] || []).forEach(function(en){ if(en.sec.length === 1 && en.ev === undefined) todo.push(en); }); });
  var next = 0, done = 0;
  var worker = async function(){
    while(next < todo.length){
      var en = todo[next++];
      en.ev = null;
      try { en.ev = cecPage(await cecGet(CEC + en.href)); } catch(err){ en.ev = false; if(err.message === "auth") cec.err = "auth"; }
      cec.prog = "reading evaluations, " + (++done) + " of " + todo.length; cecStatus();
    }
  };
  if(todo.length) await Promise.all([worker(), worker(), worker(), worker()]);
  cec.busy = false; cec.prog = "";
  if(cec.again){ cec.again = false; await cecLoadEvals(); }
  return todo.length > 0;
}
async function cecEnsure(){
  if(!cec.on || !h.length){ cecStatus(); return; }
  var changed = false;
  if(!cec.idx){
    if(cec.err || cec.idxBusy){ cecStatus(); return; }
    await cecLoadIndex();
    if(!cec.idx){ cecStatus(); return; }
    changed = true;
  }
  var need = h.some(function(pr){ return (cec.byPre[pr] || []).some(function(en){ return en.sec.length === 1 && en.ev === undefined; }); });
  if(need && await cecLoadEvals()) changed = true;
  cecStatus();
  if(changed) S();
}
function cecRange(){
  var qs = Object.keys(cec.qs).sort(function(a, b){ return cecQOrd(a) - cecQOrd(b); });
  return qs.length ? tsQLabel(qs[0]) + " to " + tsQLabel(qs[qs.length - 1]) : "";
}
function cecAY(){
  var n = {};
  Object.keys(cec.qs).forEach(function(q){ var y = tsAY(q); n[y] = (n[y] || 0) + cec.qs[q]; });
  return parseInt(Object.keys(n).sort(function(a, b){ return n[b] - n[a]; })[0], 10);
}
function cecStatus(){
  var el = $("#cec-status");
  if(!cec.on){ el.text(""); return; }
  var src = "<a href='" + CEC + "toc.html' target='_blank' title='" + wlEsc(CECNOTE) + "'>Course Evaluation Catalog ↗</a>";
  if(cec.err){ el.html("Could not read the " + src + (cec.err === "auth" ? " (sign in with your UW NetID there)" : " (" + wlEsc(cec.err) + ")") + "; <a href='#' id='cec-retry'>retry</a>").addClass("warn"); return; }
  el.removeClass("warn");
  if(cec.prog){ el.text("Course evaluations: " + cec.prog + "…"); return; }
  if(!cec.idx){ el.html(h.length ? "" : "Course evaluations load with the prefixes, from the " + src); return; }
  var n = 0, nd = 0;
  h.forEach(function(pr){ (cec.byPre[pr] || []).forEach(function(en){ if(en.sec.length !== 1) return; if(en.ev) n++; else nd++; }); });
  el.html(n + " evaluation" + (n === 1 ? "" : "s") + (nd ? " (+" + nd + " without results)" : "") + " for " + wlEsc(h.join(", ")) + ", " + cecRange() + ", from the " + src);
}
/* Joins CEC listings to Time Schedule rows (row.cecE). */
function cecAttach(){
  if(!cec.idx) return;
  var groups = {};
  o.forEach(function(row){ row.cecE = null; var k = row.prefix + "|" + row.number + "|" + row.section + "|" + row.quarter; if(cec.byKey[k]) (groups[k] = groups[k] || []).push(row); });
  Object.keys(groups).forEach(function(k){
    var rows = groups[k];
    cec.byKey[k].forEach(function(en){
      if(en.sec.length !== 1) return;
      var cn = cecNorm(en.name), hit = rows.filter(function(row){ var sn = cecNorm(String(row.instructor).split(",")[0]); return sn.trim() && cn.indexOf(sn) !== -1; });
      if(!hit.length && rows.length === 1) hit = rows;
      hit.forEach(function(row){ (row.cecE = row.cecE || []).push(en); });
    });
  });
}
function cecOn(qlist){ return !!(cec.on && cec.idx && qlist.some(function(q){ return cec.qs[q]; })); }
function cecEntries(rows){ var out = []; rows.forEach(function(row){ (row.cecE || []).forEach(function(en){ if(out.indexOf(en) === -1) out.push(en); }); }); return out; }
function cecPool(ens){
  var dist = [0, 0, 0, 0, 0, 0], w = 0, n = 0, enr = 0;
  ens.forEach(function(en){ var ev = en.ev; if(!ev || !ev.core || !ev.surv) return; ev.core.forEach(function(p0, k){ dist[k] += p0 * ev.surv; }); w += ev.surv; enr += ev.enr; n++; });
  return n ? { med: cecMedian(dist), n: n, surv: w, enr: enr } : null;
}
/* Appointment as listed in the CEC: the most frequent one among the person's sections, the latest quarter breaking ties. */
function cecRank(ens){
  var cnt = {}, last = {};
  ens.forEach(function(en){ if(!en.rank) return; cnt[en.rank] = (cnt[en.rank] || 0) + 1; last[en.rank] = Math.max(last[en.rank] || 0, cecQOrd(en.q)); });
  var ks = Object.keys(cnt).sort(function(a, b){ return cnt[b] - cnt[a] || last[b] - last[a]; });
  return ks[0] || null;
}
function cecRate(p0){ return p0.enr ? Math.round(p0.surv / p0.enr * 100) + "%" : "–"; }
function cecItemsTip(en){
  var ev = en.ev;
  return "<div class='tt-h'>" + wlEsc(en.pre + " " + en.num + " " + en.sec) + " <span>" + tsQLabel(en.q) + "</span></div>" + wlEsc(en.name) + (en.rank ? " <span class='tt-m'>" + wlEsc(en.rank) + "</span>" : "")
    + (ev ? "<br><b>" + cecFmt(ev.comb) + "</b> combined median of items 1–4 (computed here)<br>" + ev.surv + " of " + ev.enr + " surveyed (" + cecRate(ev) + ") · Form " + wlEsc(ev.form + ": " + ev.formName)
      + "<div class='tt-f'>" + ev.items.map(function(it){ return wlEsc(it.q) + " <b>" + cecFmt(it.med) + "</b>"; }).join("<br>") + "<br><span class='tt-m'>Medians as reported by the CEC; 5 = Excellent, 0 = Very Poor.</span></div>"
      : "<br>No results in the CEC for this section");
}
/* ---- Year view: table cells ---- */
function cecRankHtml(t0){
  if(!cecOn(e)) return "";
  var rk = cecRank(cecEntries(t0.courses));
  return rk ? "<div style='font-size:11px;color:#52514e;font-weight:400;margin-top:2px' title='Appointment as listed in the Course Evaluation Catalog'>" + wlEsc(rk) + "</div>" : "";
}
function cecCourseHtml(row){
  if(!cecOn(e) || !row.cecE) return "";
  return row.cecE.map(function(en){ var ev = en.ev; return " <span style='color:#4b2e83;white-space:nowrap' title='" + wlEsc("Combined median of items 1–4 (computed here) · surveyed/enrolled · " + en.name) + "'>· eval " + (ev && ev.comb !== null ? cecFmt(ev.comb) + " (" + ev.surv + "/" + ev.enr + ")" : "no results") + "</span>"; }).join("");
}
function cecCellHtml(t0){
  if(!cecOn(e)) return "<td>–</td>";
  var ens = cecEntries(t0.courses), p0 = cecPool(ens), n = t0.courses.length;
  if(!p0) return "<td><span style='font-size:11px;color:#898781'>" + (ens.length ? "Listed in the CEC without results" : "Not in the CEC for these sections") + "</span></td>";
  return "<td><strong style='font-size:13px;color:#222'>" + cecFmt(p0.med) + "</strong> <span style='font-size:11px;color:#52514e'>combined median</span><div style='font-size:10.5px;color:#52514e;line-height:1.4;margin-top:3px'>" + p0.n + " of " + n + " course" + (n === 1 ? "" : "s") + " evaluated<br>" + p0.surv + " of " + p0.enr + " surveyed (" + cecRate(p0) + ")</div></td>";
}
/* ---- Year view: appointment and evaluation charts ---- */
function cecCharts(rows){
  var row0 = $("#cec-row");
  if(!cec.on || !h.length){ row0.hide(); return; }
  row0.show();
  if(!cec.idx){
    $("#tf-cec").hide();
    $("#tf-appt").html("<h4>Course evaluations</h4><p class='tf-sub'>" + (cec.err ? "The Course Evaluation Catalog could not be read; see the note next to Course evals above." : "Loading the Course Evaluation Catalog…") + "</p>");
    return;
  }
  if(!cecOn(e)){
    var ay = cecAY();
    $("#tf-cec").hide();
    $("#tf-appt").html("<h4>Course evaluations</h4><p class='tf-sub'>The Course Evaluation Catalog covers " + cecRange() + " only, none of the quarters selected.</p><button type='button' class='ts-btn' id='cec-go' data-y='" + ay + "'>Show AY " + (ay - 1) + "-" + String(ay).slice(2) + "</button>");
    return;
  }
  $("#tf-cec").show();
  cecAppt(rows); cecScatter(rows);
}
function cecAppt(rows){
  var G = {}, tot = 0;
  rows.forEach(function(rw){
    var ens = cecEntries(rw.courses), rk = /^(TBA|STAFF)$/.test(rw.name) ? "TBA or STAFF" : (cecRank(ens) || "Not listed in the CEC");
    var g0 = G[rk] || (G[rk] = { rk: rk, sch: 0, n: 0, ens: [] });
    g0.sch += rw.sch; g0.n++; g0.ens = g0.ens.concat(ens); tot += rw.sch;
  });
  var list = Object.keys(G).map(function(k){ return G[k]; }).sort(function(a, b){ var la = /^(TBA|Not listed)/.test(a.rk), lb = /^(TBA|Not listed)/.test(b.rk); return (la - lb) || b.sch - a.sch; });
  var s = "<table class='cec-tab'><thead><tr><th>Appointment</th><th>Share of SCH</th><th class='r'>SCH</th><th class='r' title='Instructors with this appointment in the quarters selected'>People</th><th class='r' title='Combined median of items 1–4, pooled over the group’s evaluated sections (weighted by number surveyed), with sections and surveyed/enrolled'>Evaluations</th></tr></thead><tbody>";
  list.forEach(function(g0){
    var sh = tot ? g0.sch / tot : 0, p0 = cecPool(g0.ens);
    s += "<tr><td>" + wlEsc(g0.rk) + "</td><td><span class='cec-bar'><i style='width:" + (sh * 100).toFixed(1) + "%'></i></span>" + Math.round(sh * 100) + "%</td><td class='r'>" + wlFmt(g0.sch) + "</td><td class='r'>" + g0.n + "</td><td class='r'>"
      + (p0 ? "<b>" + cecFmt(p0.med) + "</b> <span class='cec-m'>" + p0.n + " sec · " + p0.surv + "/" + p0.enr + "</span>" : "<span class='cec-m'>–</span>") + "</td></tr>";
  });
  s += "</tbody></table>";
  $("#tf-appt").html("<h4>SCH by appointment type (" + g + ")</h4><p class='tf-sub'>Appointment as listed in the Course Evaluation Catalog for each instructor's sections in the quarters selected; instructors without a CEC listing are grouped. Evaluations: combined median of items 1–4 (computed here, 5 = Excellent), sections evaluated, and surveyed/enrolled.</p>" + s);
}
function cecScatter(rows){
  var el = $("#tf-cec"), pts = [];
  rows.forEach(function(rw){ rw.courses.forEach(function(row){ (row.cecE || []).forEach(function(en){ var ev = en.ev; if(ev && ev.comb !== null && ev.enr > 0) pts.push({ rw: rw, row: row, en: en, ev: ev }); }); }); });
  var head = "<h4>Course evaluations and class size (" + g + ")</h4>";
  if(!pts.length){ el.html(head + "<p class='tf-sub'>" + (cec.busy ? "Loading evaluations…" : "No evaluated lecture or seminar sections for the quarters, prefixes and filters selected.") + "</p>"); return; }
  var W = wlWidth("tf-cec"), L = 46, R = 70, T = 14, B = 38, H = 310, pw = Math.max(160, W - L - R), ph = H - T - B;
  var xs = pts.map(function(p0){ return p0.ev.enr; }), yv = pts.map(function(p0){ return p0.ev.comb; });
  var x0 = Math.max(1, Math.min(5, Math.min.apply(null, xs))), x1 = Math.max(100, Math.max.apply(null, xs)), lg = function(v){ return Math.log(Math.max(1, v)); };
  var X = function(v){ return L + (lg(v) - lg(x0)) / (lg(x1) - lg(x0)) * pw; };
  var y0 = Math.min(3, Math.floor(Math.min.apply(null, yv) * 2) / 2), Y = function(v){ return T + ph - (v - y0) / (5 - y0) * ph; };
  var maxS = Math.max.apply(null, pts.map(function(p0){ return p0.ev.surv; })) || 1, rad = function(sv){ return 2.5 + 6 * Math.sqrt(sv / maxS); };
  var s = "<svg width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='Combined median of course evaluations against class size, one dot per evaluated section'>";
  for(var yy = y0; yy <= 5 + 1e-9; yy += 0.5){
    s += "<line x1='" + L + "' x2='" + (L + pw) + "' y1='" + Y(yy).toFixed(1) + "' y2='" + Y(yy).toFixed(1) + "' stroke='" + (yy === y0 ? "#c3c2b7" : "#f0efec") + "'/><text x='" + (L - 7) + "' y='" + (Y(yy) + 3.5).toFixed(1) + "' font-size='10' fill='#898781' text-anchor='end'>" + yy.toFixed(1) + "</text>";
  }
  [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter(function(v){ return v >= x0 && v <= x1; }).forEach(function(v){
    s += "<line x1='" + X(v).toFixed(1) + "' x2='" + X(v).toFixed(1) + "' y1='" + T + "' y2='" + (T + ph) + "' stroke='#f4f3ef'/><text x='" + X(v).toFixed(1) + "' y='" + (T + ph + 15) + "' font-size='10' fill='#898781' text-anchor='middle'>" + v + "</text>";
  });
  s += "<text x='" + (L + pw / 2) + "' y='" + (H - 4) + "' font-size='10' fill='#52514e' text-anchor='middle'>students enrolled (log scale)</text>";
  s += "<text transform='translate(11 " + (T + ph / 2) + ") rotate(-90)' font-size='10' fill='#52514e' text-anchor='middle'>combined median</text>";
  var dp = cecPool(pts.map(function(p0){ return p0.en; }));
  if(dp && dp.med !== null && dp.med >= y0){
    s += "<line x1='" + L + "' x2='" + (L + pw) + "' y1='" + Y(dp.med).toFixed(1) + "' y2='" + Y(dp.med).toFixed(1) + "' stroke='#52514e' stroke-dasharray='4 3'/><text x='" + (L + pw + 6) + "' y='" + (Y(dp.med) - 2).toFixed(1) + "' font-size='10' fill='#52514e'>all sections</text><text x='" + (L + pw + 6) + "' y='" + (Y(dp.med) + 10).toFixed(1) + "' font-size='10' fill='#52514e'>" + cecFmt(dp.med) + "</text>";
  }
  var seen = {};
  pts.sort(function(a, b){ return b.ev.surv - a.ev.surv; }).forEach(function(p0){
    var qq = p0.row.quarter.slice(0, 3), col = (WLQ[qq] || ["#898781"])[0];
    seen[qq] = true;
    s += "<g class='wl-p' data-n='" + wlNames(p0.rw.names || [p0.rw.name]) + "'><circle cx='" + X(p0.ev.enr).toFixed(1) + "' cy='" + Y(p0.ev.comb).toFixed(1) + "' r='" + rad(p0.ev.surv).toFixed(1) + "' fill='" + col + "' fill-opacity='0.8' stroke='#ffffff' stroke-width='1.5' data-tip='" + wlEsc(cecItemsTip(p0.en)) + "'/></g>";
  });
  s += "</svg>";
  var key = ["AUT", "WIN", "SPR", "SUM"].filter(function(q){ return seen[q]; }).map(function(q){ return "<span><i style='background:" + WLQ[q][0] + "'></i>" + WLQ[q][1] + "</span>"; }).join("") + "<span><i style='height:0;border-top:1.5px dashed #52514e;background:none;vertical-align:3px'></i>all sections pooled</span>";
  el.html(head + "<p class='tf-sub'>One dot per evaluated lecture or seminar section (" + pts.length + "). Across: students enrolled; up: combined median of items 1–4, computed here (5 = Excellent); dot area: number surveyed (" + maxS + " at most). Hover a dot for the section and each item's median; hover an instructor in the other charts to find their sections. TA quiz sections are left out.</p><div class='tf-key'>" + key + "</div>" + s);
}
/* ---- Time series view: profile cards and table ---- */
function cecCardBlock(pp, Dt){
  if(!cecOn(Dt.qs)) return "";
  var recs = []; pp.yrs.forEach(function(y){ recs = recs.concat(pp.Y[y].recs); });
  var ens = cecEntries(recs).sort(function(a, b){ return cecQOrd(a.q) - cecQOrd(b.q) || (a.num + a.sec).localeCompare(b.num + b.sec); });
  var p0 = cecPool(ens), rk = cecRank(ens);
  var out = "<div class='ts-sec'>Course evaluations, " + cecRange() + (rk ? " · " + wlEsc(rk) : "") + "</div>";
  if(!ens.length) return out + "<p class='cec-none'>No sections in the Course Evaluation Catalog.</p>";
  out += p0 ? "<p class='cec-sum'><b>" + cecFmt(p0.med) + "</b> combined median over " + p0.n + " section" + (p0.n === 1 ? "" : "s") + " · " + p0.surv + " of " + p0.enr + " surveyed (" + cecRate(p0) + ")</p>" : "";
  out += "<ul class='ts-courses'>" + ens.map(function(en){
    var ev = en.ev;
    return "<li data-tip='" + wlEsc(cecItemsTip(en)) + "'><span><b>" + wlEsc(en.pre + " " + en.num + " " + en.sec) + "</b> <em>" + cecQShort(en.q) + (ev ? " · Form " + wlEsc(ev.form) : "") + "</em></span><span>" + (ev && ev.comb !== null ? cecFmt(ev.comb) + " <em>" + ev.surv + "/" + ev.enr + " (" + cecRate(ev) + ")</em>" : "<em>no results</em>") + "</span></li>";
  }).join("") + "</ul>";
  return out;
}
function cecTsCell(pp, Dt){
  var recs = []; pp.yrs.forEach(function(y){ recs = recs.concat(pp.Y[y].recs); });
  var p0 = cecPool(cecEntries(recs));
  return p0 ? "<span title='" + wlEsc("Combined median of items 1–4 over " + p0.n + " evaluated section" + (p0.n === 1 ? "" : "s") + "; " + p0.surv + " of " + p0.enr + " surveyed") + "'>" + cecFmt(p0.med) + " <span class='na'>(" + p0.n + ")</span></span>" : "<span class='na'>–</span>";
}
/* ---- Wiring ---- */
var cecS0 = S;
S = function(){ cecAttach(); cecS0(); cecEnsure(); };
var cecWl0 = wlCharts;
wlCharts = function(rows, total, genEds){ cecWl0(rows, total, genEds); cecCharts(rows); };
var cecTsDraw0 = tsDraw;
tsDraw = function(){ cecAttach(); cecTsDraw0(); };
var cecCard0 = tsCard;
tsCard = function(pp, Dt){ var html = cecCard0(pp, Dt); return html.slice(0, html.length - 6) + cecCardBlock(pp, Dt) + "</div>"; };
$(document).on("change", "#cec-on", function(){ cec.on = this.checked; cecStatus(); S(); });
$(document).on("click", "#cec-retry", function(ev){
  ev.preventDefault();
  cec.err = null;
  Object.keys(cec.byPre).forEach(function(pr){ cec.byPre[pr].forEach(function(en){ if(en.ev === false) en.ev = undefined; }); });
  cecEnsure();
});
$(document).on("click", "#cec-go", function(){ $("#ay-select").val(this.getAttribute("data-y")).trigger("change"); });
$(document).on("pointermove", "#cec-row [data-tip], #instructor-table [data-tip]", function(ev){ tsTip(this.getAttribute("data-tip"), ev.clientX, ev.clientY); });
$(document).on("pointerleave", "#cec-row [data-tip], #instructor-table [data-tip]", function(){ tsTip(null); });
function S(){var t=$(".gened-filter:checked").map(function(){return this.value}).get(),e=o.filter(function(e){var r=h.length>0&&-1!==h.indexOf(e.prefix)&&inAY(e),l=!1;return 0===e.genEd.length&&-1!==t.indexOf("None")&&(l=!0),-1!==e.genEd.indexOf("SSc")&&-1!==t.indexOf("SSc")&&(l=!0),-1!==e.genEd.indexOf("NSc")&&-1!==t.indexOf("NSc")&&(l=!0),r&&l}),e=wlInstFilter(e),r=e.reduce(function(t,e){return t+e.sch},0),l={},instG=instGroups(e);e.forEach(function(t){var e=instG.keyOf[t.instructor]||t.instructor,g=instG.groups[e];l[e]||(l[e]={name:g?g.label:t.instructor,names:g?g.names:[t.instructor],sch:0,credits:0,courseCount:0,courses:[]}),l[e].sch+=t.sch,l[e].credits+=t.splitCredits,l[e].courseCount+=1,l[e].courses.push(t)});for(var a=Object.values(l).sort(function(t,e){return e.sch-t.sch}),i=a.length>0?r/a.length:0,n=50,m=20,c=[],d=0;d<m;d++)c.push(d*n+"-"+(d*n+n));var p=h.map(function(t){var e=new Array(m).fill(0),r=new Array(m).fill(""),l=Array.from({length:m},function(){return[]});a.forEach(function(r){var a=r.courses.filter(function(e){return e.prefix===t}).reduce(function(t,e){return t+e.sch},0);if(a>0){var i=Math.min(19,Math.floor(a/n));e[i]+=1,l[i].push(r.name.split(",")[0]+" ("+Math.round(a)+" SCH)")}});for(var i=0;i<m;i++)l[i].length>0?r[i]="<b>"+t+" ("+c[i]+" SCH):</b><br>"+l[i].join("<br>"):r[i]="<b>"+t+" ("+c[i]+" SCH):</b><br>No Instructor";return{x:c,y:e,type:"bar",name:t,marker:{color:s(t),line:{color:"#ffffff",width:.5}},text:r,hoverinfo:"text"}}).filter(function(t){return t.y.some(function(t){return t>0})}),b=i/n-.5,x=f/n-.5;wlCharts(a,r,t);for(var S=a.slice().sort(function(t,e){return t.sch-e.sch}),E=S.length,C=Math.floor(E/4),v=E%4,y=[[],[],[],[]],A=0,I=0;I<4;I++)for(var H=C+(I<v?1:0),T=0;T<H;T++)A<E&&(y[I].push(S[A]),A++);var w=[0,0,0,0],M=[0,0,0,0],N=["","","",""],R=["Bottom 25% (Q1 - lowest load)","Lower-Mid 25% (Q2)","Upper-Mid 25% (Q3)","Top 25% (Q4 - highest load)"];y.forEach(function(t,e){var l=t.reduce(function(t,e){return t+e.sch},0);w[e]=l;var a=r>0?l/r*100:0;M[e]=a;var i=t.map(function(t){return t.name.split(",")[0]+" ("+Math.round(t.sch)+" SCH)"});N[e]="<b>"+R[e]+"</b><br>Share of Department SCH: <b>"+a.toFixed(1)+"%</b><br>Total Group SCH: "+Math.round(l).toLocaleString()+" SCH<br>Instructor Count: "+t.length+" members<br><br><b>Instructors:</b><br>"+i.join("<br>")});var O={x:R,y:M,type:"bar",marker:{color:"rgba(75, 46, 131, 0.8)",line:{color:"rgb(75, 46, 131)",width:1.5}},text:M.map(function(t){return t.toFixed(1)+"%"}),textposition:"auto",hovertext:N,hoverinfo:"text"};0;var P="";a.forEach(function(t){var e=Math.round(t.sch),r=t.name,l="<strong style='font-size: 13px; color: #222;'>"+e.toLocaleString()+" SCH</strong>",a=parseFloat(t.credits.toFixed(1)),i="<strong style='font-size: 13px; color: #222;'>"+a+"</strong>",n=l+"<div style='font-size: 10px; color: rgb(75, 85, 99); font-family: monospace; line-height: 1.4; margin-top: 5px; border-top: 1px solid rgb(229, 231, 235); padding-top: 4px;'>"+t.courses.map(function(t){var e="AU";t.quarter&&(t.quarter.includes("Winter")||t.quarter.includes("WIN")?e="WI":t.quarter.includes("Spring")||t.quarter.includes("SPR")?e="SP":(t.quarter.includes("Summer")||t.quarter.includes("SUM"))&&(e="SU"));var r=t.quarter?t.quarter.match(/\d{4}/):null,l=e+(r?r[0].substring(2):"");return"• "+l+" "+t.prefix+" "+t.number+" "+t.credits+" cr "+t.enrl+"/"+t.lim+" students"+cecCourseHtml(t)}).join("<br>")+"</div>",s="",o=0;if(1===t.courses.length)s="<div style='font-size: 12px; line-height: 1.4;'><span style='color: rgb(107, 114, 128);'>⚪ Single Course (N/A)</span><br><span style='color: #666; font-size: 10px;'>100% of SCH from 1 class</span></div>",o=-1;else{var h=null,m=-1,c=0;t.courses.forEach(function(t){t.sch>m&&(m=t.sch,h=t);var r=t.sch/e;r>0&&(c-=r*Math.log(r))});var d=Math.log(t.courses.length)>0?c/Math.log(t.courses.length)*100:0,p=m/e*100;o=Math.round(d),s="<div style='font-size: 12px; line-height: 1.4;'><strong style='"+(d>=75?"color: rgb(4, 120, 87);":d>=45?"color: rgb(180, 83, 9);":"color: rgb(185, 28, 28); font-weight: bold;")+"'>"+(d>=75?"🟢":d>=45?"🟡":"🔴")+" "+(d>=75?"Balanced":d>=45?"Moderately Skewed":"Highly Skewed")+" ("+Math.round(d)+"% Even)</strong><br><span style='color: #666; font-size: 10px;'>"+Math.round(p)+"% of SCH from "+(h?h.prefix+" "+h.number:"")+"</span></div>"}var u=Math.round(e/f*100),g="Balanced Load",b="background-color: rgb(209, 250, 229); color: rgb(4, 120, 87); border: 1px solid rgb(16, 185, 129);",x="🟢";e>1.5*f?(g="Very High Load",b="background-color: rgb(254, 226, 226); color: rgb(185, 28, 28); border: 1px solid rgb(239, 68, 68); font-weight: bold;",x="🔴"):e>1.1*f?(g="High Workload",b="background-color: rgb(254, 243, 199); color: rgb(180, 83, 9); border: 1px solid rgb(245, 158, 11);",x="🟡"):e<.4*f&&(g="Under-utilized",b="background-color: rgb(243, 244, 246); color: rgb(75, 85, 99); border: 1px solid rgb(209, 213, 219);",x="⚪");var S="<span style='padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: sans-serif; "+b+"' title='SCH is "+u+"% of the target ("+f+" SCH)'>"+x+" "+g+" ("+u+"%)</span>";P+="<tr><td"+(t.names&&t.names.length>1?" title='Listed as: "+t.names.join("; ").replace(/'/g,"&#39;")+"'":"")+"><strong style='color:rgb(75, 46, 131);'>"+r+"</strong>"+cecRankHtml(t)+"</td><td style='text-align: center;' data-order='"+a+"'>"+i+"</td><td style='text-align: center;' data-order='"+t.courseCount+"'>"+t.courseCount+"</td><td data-order='"+e+"'>"+n+"</td><td data-order='"+o+"'>"+s+"</td><td data-order='"+e+"'>"+S+"</td>"+cecCellHtml(t)+"</tr>"}),u&&u.destroy(),$("#instructor-table tbody").html(P),u=$("#instructor-table").DataTable({pageLength:15,order:[[3,"desc"]],language:{search:"Search Instructor:"},columnDefs:[{targets:6,visible:cecOn(e0q()),orderable:!1}]})}!function(){for(var y=Math.max(t,(new Date).getFullYear()+1);y>=2003;y--)$("#ay-select").append($("<option></option>").val(String(y)).text("AY "+(y-1)+"-"+String(y).substring(2)))}(),ayLabels(),$("#ay-select").on("change",function(){t=parseInt(this.value,10),applyAY()}),$(".qtr-filter").on("change",applyAY),$(".ay-tag").text(g),$("#prefix-hint").text("Enter prefixes to load data ("+Object.keys(r).length+" prefixes available)"),$("#prefix-input").on("input",function(){$("#prefix-input").removeClass("valid invalid"),$("#prefix-hint").removeClass("warning").text("Enter prefixes to load data ("+Object.keys(r).length+" prefixes available)")}),$("#prefix-input").on("change",x),$("#prefix-input").on("keydown",function(t){"Enter"!==t.key&&","!==t.key||(t.preventDefault(),x())}),S(),b(),$(".gened-filter").on("change",S),$("#bench-slider").on("input",function(){f=parseInt(this.value,10),$("#bench-val").text(f+" SCH"),S()}),function(){var p=Object.keys(r).filter(function(k){return r[k].toLowerCase()===String("undefined"!=typeof startPage?startPage:"").toLowerCase()})[0];p&&($("#prefix-input").val(p),x())}(),window.addEventListener("resize",function(){clearTimeout(wlResizeT),wlResizeT=setTimeout(function(){wlLast&&wlCharts.apply(null,wlLast)},150)})}catch(E){console.error("Critical Stage 2 Scraper Error: ",E)}}()}.toString()})();<\/script>`),l.document.write("</body></html>"),l.document.close()}();