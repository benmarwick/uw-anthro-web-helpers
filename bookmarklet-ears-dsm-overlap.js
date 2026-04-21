javascript:(function(){
    (async function() {
        try { 
            
            /* ============================================================
               UI SETUP (SHADOW DOM ENCAPSULATION)
               ============================================================ */
            document.body.style.cursor = 'wait';

            /* Clean up any previous host elements */
            const existingHost = document.getElementById('dars-ui-host');
            if (existingHost) existingHost.remove();

            /* Create Shadow Host */
            const host = document.createElement('div');
            host.id = 'dars-ui-host';
            Object.assign(host.style, { position: 'relative', zIndex: '9999999' });
            document.body.appendChild(host);

            /* Attach closed Shadow DOM to prevent CSS leaking in or out */
            const shadow = host.attachShadow({mode: 'open'});

            /* Inject Scoped CSS with Animations & Micro-interactions */
            const style = document.createElement('style');
            style.textContent = `
                :host { all: initial; }
                @keyframes slideFadeIn {
                    0% { opacity: 0; transform: translate(-50%, -45%); }
                    100% { opacity: 1; transform: translate(-50%, -50%); }
                }
                @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes dars-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes drawCheck { 0% { stroke-dashoffset: 48; } 100% { stroke-dashoffset: 0; } }
                
                .overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background-color: rgba(0, 0, 0, 0.6); zIndex: 1;
                    opacity: 0; animation: fadeIn 0.4s ease forwards; transition: opacity 0.4s ease;
                }
                .dialog {
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 440px; max-width: 90vw; padding: 20px 20px 24px 20px;
                    background-color: #32006E; color: #ffffff;
                    font-family: system-ui, -apple-system, sans-serif; font-size: 15px; line-height: 1.5;
                    border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    zIndex: 2; display: flex; flex-direction: column; gap: 15px; overflow: hidden;
                    opacity: 0; animation: slideFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transition: opacity 0.4s ease, background-color 0.4s ease;
                }
                .content-row { display: flex; align-items: flex-start; gap: 12px; }
                .spinner { 
                    border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #fff; 
                    border-radius: 50%; width: 18px; height: 18px; 
                    animation: dars-spin 1s linear infinite; display: inline-block; flex-shrink: 0;
                }
                .status-icon {
                    width: 24px; height: 24px; flex-shrink: 0; display: none;
                }
                .status-icon polyline {
                    stroke-dasharray: 48; stroke-dashoffset: 48;
                }
                .msg { flex: 1; white-space: pre-wrap; font-weight: 500; }
                
                /* --- METRICS DASHBOARD UI --- */
                .metrics-container {
                    display: none; /* hidden until calculations are done */
                    gap: 12px;
                    margin: 5px 0;
                }
                .metric-card {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 6px;
                    padding: 12px 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                }
                .metric-card.success { border-top: 4px solid #69f0ae; }
                .metric-card.warning { border-top: 4px solid #ffd740; }
                .metric-card.danger { border-top: 4px solid #ff5252; }
                
                .metric-title { font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 6px; }
                .metric-value { font-size: 15px; font-weight: bold; display: flex; align-items: center; gap: 6px; }

                .overlap-box {
                    background: rgba(0,0,0,0.25); border-radius: 6px; padding: 12px; display: none;
                    border-left: 4px solid #fff; max-height: 160px; overflow-y: auto;
                }
                .overlap-box h4 { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
                .overlap-box ul { margin: 0; padding-left: 20px; font-size: 13px; font-family: ui-monospace, monospace; }
                .overlap-box li { margin-bottom: 4px; }

                .scrollable {
                    width: 100%; height: 120px; background-color: rgba(0,0,0,0.2); color: #fff;
                    border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 8px;
                    font-size: 12px; font-family: monospace; display: none; resize: vertical; box-sizing: border-box;
                }
                .scrollable::-webkit-scrollbar, .overlap-box::-webkit-scrollbar { width: 8px; }
                .scrollable::-webkit-scrollbar-track, .overlap-box::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .scrollable::-webkit-scrollbar-thumb, .overlap-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
                
                .button-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px; }
                button {
                    padding: 8px 16px; color: #ffffff; border-radius: 4px;
                    cursor: pointer; font-weight: 600; display: none; transition: background-color 0.2s; border: none; font-size: 13px;
                }
                .btn-close { background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255,255,255,0.4); }
                .btn-close:hover { background-color: rgba(255, 255, 255, 0.3); }
                .btn-copilot { background-color: #0078D4; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                .btn-copilot:hover { background-color: #106EBE; }
                
                .progress-bar {
                    position: absolute; bottom: 0; left: 0; height: 5px;
                    background-color: #00e5ff; width: 5%; transition: width 0.3s ease, background-color 0.3s ease;
                }
            `;
            shadow.appendChild(style);

            /* Build DOM Elements */
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            shadow.appendChild(overlay);

            const dialog = document.createElement('div');
            dialog.className = 'dialog';

            const contentRow = document.createElement('div');
            contentRow.className = 'content-row';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            
            const statusIcon = document.createElement('div');
            statusIcon.className = 'status-icon';

            const msgSpan = document.createElement('div');
            msgSpan.className = 'msg';
            msgSpan.innerText = 'Collecting degree audit data...';

            contentRow.appendChild(spinner);
            contentRow.appendChild(statusIcon);
            contentRow.appendChild(msgSpan);
            dialog.appendChild(contentRow);

            /* Metrics Container (Cards injected later) */
            const metricsContainer = document.createElement('div');
            metricsContainer.className = 'metrics-container';
            dialog.appendChild(metricsContainer);

            const overlapBox = document.createElement('div');
            overlapBox.className = 'overlap-box';
            overlapBox.innerHTML = `<h4>Overlapping Courses</h4><ul class="overlap-list"></ul>`;
            dialog.appendChild(overlapBox);
            const overlapList = overlapBox.querySelector('.overlap-list');

            const fallbackArea = document.createElement('textarea');
            fallbackArea.className = 'scrollable';
            dialog.appendChild(fallbackArea);

            const btnRow = document.createElement('div');
            btnRow.className = 'button-row';

            const copilotBtn = document.createElement('button');
            copilotBtn.className = 'btn-copilot';
            copilotBtn.innerText = 'Open Copilot';
            copilotBtn.onclick = () => window.open('https://copilot.microsoft.com/', '_blank');
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn-close';
            closeBtn.innerText = 'Close';

            btnRow.appendChild(copilotBtn);
            btnRow.appendChild(closeBtn);
            dialog.appendChild(btnRow);

            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            dialog.appendChild(progressBar);

            shadow.appendChild(dialog);

            /* UI State Manager */
            let hideTimeout;
            const closeDialog = () => {
                dialog.style.opacity = '0';
                overlay.style.opacity = '0';
                setTimeout(() => host.remove(), 400);
            };
            closeBtn.onclick = closeDialog;

            /* Prevent auto-close if user hovers over the dialog */
            dialog.onmouseenter = () => clearTimeout(hideTimeout);

            const updateDialog = (text, bgColor, showButtons = false, progress = null, status = 'loading') => {
                msgSpan.innerText = text;
                if (bgColor) dialog.style.backgroundColor = bgColor;
                if (progress !== null) progressBar.style.width = `${progress}%`;
                
                if (['success', 'safe', 'action_required'].includes(status)) {
                    spinner.style.display = 'none';
                    statusIcon.style.display = 'block';
                    
                    if (status === 'success' || status === 'safe') {
                        progressBar.style.backgroundColor = '#69f0ae';
                        statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                        const poly = statusIcon.querySelector('polyline');
                        if (poly) poly.style.animation = 'drawCheck 0.6s ease forwards';
                    } else if (status === 'action_required') {
                        progressBar.style.backgroundColor = '#ff5252';
                        statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
                    }
                } else if (status === 'error' || status === 'warning') {
                    progressBar.style.backgroundColor = status === 'error' ? '#ff5252' : '#ffd740';
                    spinner.style.display = 'none';
                }

                if (showButtons) {
                    closeBtn.style.display = 'block';
                    if (['success', 'safe', 'action_required', 'warning'].includes(status)) {
                        copilotBtn.style.display = 'block';
                    }
                    /* Auto-dismiss logic only if safe/success (and if 0 overlap/0 needed) */
                    if (status === 'success') {
                        hideTimeout = setTimeout(closeDialog, 7000);
                    } else {
                        clearTimeout(hideTimeout);
                    }
                }
            };

            /* ============================================================
               DARS EXTRACTION LOGIC
               ============================================================ */
            const audits = {};
            const rows = document.querySelectorAll('tr');
            const targetLinks =[];

            rows.forEach(row => {
                const links = row.querySelectorAll('a');
                for (const a of links) {
                    if (a.textContent.trim() === 'Detail') {
                        const programName = row.cells[0] ? row.cells[0].textContent.trim() : 'Unknown_Program';
                        const pNameLower = programName.toLowerCase();
                        
                        /* Filter: Skip any minor that is NOT the Data Science Minor */
                        if (pNameLower.includes('minor') && !pNameLower.includes('data science')) {
                            break; 
                        }
                        
                        targetLinks.push({ name: programName, url: a.href });
                        break;
                    }
                }
            });

            if (targetLinks.length === 0) {
                document.body.style.cursor = 'default';
                updateDialog('❌ No "Detail" links found. Ensure the Available Audits table is visible.', '#b71c1c', true, 100, 'error');
                return;
            }

            const iframe = document.createElement('iframe');
            iframe.style.width = '1920px';
            iframe.style.height = '1080px';
            iframe.style.border = 'none';
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px'; 
            iframe.style.visibility = 'hidden';
            
            try { 
                document.body.appendChild(iframe);

                const majorTargets =[
                    { search: "UNIVERSITY REQUIREMENTS", key: "university_requirements" },
                    { search: "GENERAL EDUCATION REQUIREMENTS PROFICIENCY", key: "general_education_requirements" },
                    { search: "AREAS OF INQUIRY", key: "areas_of_inquiry" },
                    { search: "DEPARTMENTAL REQUIREMENTS", key: "departmental_requirements" },
                    { search: "ADMISSIONS REQUIREMENTS", key: "admissions_requirements" },
                    { search: "OTHER COURSES", key: "other_courses" }
                ];

                const minorTargets =[
                    { search: "Data Studies (Group A)", key: "data_studies_group_a" },
                    { search: "Data Skills (Group B)", key: "data_skills_group_b" }, 
                    { search: "Additional credits from list A, B or C, or Synthesis courses", key: "additional_credits" },
                    { search: "A different course was used where the following could have applied.", key: "alternative_courses" }
                ];

                const courseRegex = /^((?:AU|WI|SP|SU)\d{2})\s+([A-Z\s&]+?)\s+([0-9X]{3}[A-Z]?)\s+(.*?)\s+(\d+(?:\.\d+)?)\s+(.+)$/i;
                let processedCount = 0;
                let needsCredits = 0; // Tracking minor credits deficit

                for (const item of targetLinks) {
                    const currentProgress = 5 + (processedCount / targetLinks.length) * 85;
                    updateDialog(`Fetching audit ${processedCount + 1} of ${targetLinks.length}...\n${item.name}`, null, false, currentProgress, 'loading');

                    const response = await fetch(item.url);
                    const html = await response.text();
                    
                    const parser = new DOMParser();
                    const cleanDoc = parser.parseFromString(html, 'text/html');
                    
                    cleanDoc.querySelectorAll('script, style, link').forEach(s => s.remove());
                    
                    cleanDoc.querySelectorAll('.linkified').forEach(span => {
                        const subj = span.getAttribute('data-subject');
                        const num = span.getAttribute('data-number');
                        if (subj && num) {
                            span.textContent = `${subj} ${num} `;
                        }
                    });
                    
                    const idoc = iframe.contentDocument;
                    idoc.open();
                    idoc.write(cleanDoc.documentElement.outerHTML);
                    idoc.close();

                    await new Promise(r => setTimeout(r, 100));

                    const textDump = idoc.body.innerText.replace(/\t/g, ' ');
                    
                    const isMinor = item.name.toLowerCase().includes('minor');
                    const roleKey = isMinor ? 'minor' : 'major';
                    
                    /* Check for Data Science Minor credits deficit */
                    if (isMinor) {
                        const cleanTextDump = textDump.replace(/\s+/g, ' ').toLowerCase();
                        const searchSnippet = "minimum of 25 credits earned in the minor";
                        const reqIdx = cleanTextDump.indexOf(searchSnippet);
                        
                        if (reqIdx !== -1) {
                            /* Scan the immediate section following the requirement text */
                            const section = cleanTextDump.substring(reqIdx, reqIdx + 1000);
                            const needsRegex = /needs:\s*(\d+(?:\.\d+)?)\s*credits/i;
                            const match = section.match(needsRegex);
                            
                            if (match) {
                                needsCredits = parseFloat(match[1]);
                            }
                        }
                    }

                    const targets = isMinor ? minorTargets : majorTargets;
                    
                    if (!audits[roleKey]) {
                        audits[roleKey] = { program_name: item.name, requirements: {} };
                    }

                    let foundTargets =[];
                    targets.forEach(target => {
                        let idx = textDump.indexOf(target.search);
                        if (idx !== -1) foundTargets.push({ key: target.key, search: target.search, index: idx });
                    });
                    
                    foundTargets.sort((a, b) => a.index - b.index);
                    
                    let eofIndex = textDump.indexOf('FEDERAL LAW PROHIBITS');
                    if (eofIndex === -1) eofIndex = textDump.indexOf('END OF ANALYSIS');
                    if (eofIndex === -1) eofIndex = textDump.length;

                    for (let i = 0; i < foundTargets.length; i++) {
                        let startIdx = foundTargets[i].index;
                        let endIdx = (i + 1 < foundTargets.length) ? foundTargets[i+1].index : eofIndex;
                        
                        if (endIdx > eofIndex && startIdx < eofIndex) endIdx = eofIndex;
                        
                        let content = textDump.substring(startIdx, endIdx).trim();
                        let linesArray = content.split('\n')
                            .map(line => line.replace(/\s+/g, ' ').trim())
                            .filter(line => line.length > 0)
                            /* Filter out any >>MATCHED AS lines entirely from the payload */
                            .filter(line => !/^>>\s*MATCHED\s+AS:/i.test(line))
                            /* Filter out "NO Not completed" and variations */
                            .filter(line => !/(?:NO\s+Not\s+completed|Not\s+completed\s+NO)/i.test(line));

                        let courses =[];
                        let description =[];

                        linesArray.forEach(line => {
                            const match = line.match(courseRegex);
                            if (match) {
                                courses.push({
                                    quarter: match[1].toUpperCase(),
                                    subject: match[2].trim().toUpperCase(),
                                    number: match[3].toUpperCase(),
                                    title: match[4].trim(),
                                    credits: Number(match[5]),
                                    status: match[6].trim()
                                });
                            } else {
                                if (!line.match(/^Qtr\s+Course Name\s+Credits\s+Grade/i)) {
                                    description.push(line);
                                }
                            }
                        });

                        audits[roleKey].requirements[foundTargets[i].key] = { description, courses };
                    }
                    processedCount++;
                }

                /* ============================================================
                   JS OVERLAP CALCULATION (Calculator Pattern)
                   ============================================================ */
                updateDialog('Calculating overlap restriction...', null, false, 95, 'loading');

                let minorCourses =[];
                let majorCourses =[];
                let overlapCredits = 0;
                let overlappingCourseDetails =[];

                if (audits.minor && audits.major) {
                    /* Extract Minor Courses (Data Studies, Data Skills, Additional Credits) */['data_studies_group_a', 'data_skills_group_b', 'additional_credits'].forEach(key => {
                        if (audits.minor.requirements[key] && audits.minor.requirements[key].courses) {
                            minorCourses.push(...audits.minor.requirements[key].courses);
                        }
                    });

                    /* Extract Major Courses (Departmental & Admissions ONLY as per policy) */['departmental_requirements', 'admissions_requirements'].forEach(key => {
                        if (audits.major.requirements[key] && audits.major.requirements[key].courses) {
                            majorCourses.push(...audits.major.requirements[key].courses);
                        }
                    });

                    /* Filter out CSSS 490 (Mandatory course, not subject to standard overlap) */
                    minorCourses = minorCourses.filter(c => !(c.subject === 'CSSS' && c.number === '490'));
                    majorCourses = majorCourses.filter(c => !(c.subject === 'CSSS' && c.number === '490'));

                    /* Calculate Intersection (Using a Set prevents double counting if listed multiple times) */
                    let majorCourseCodes = new Set(majorCourses.map(c => `${c.subject} ${c.number}`));

                    minorCourses.forEach(mc => {
                        let code = `${mc.subject} ${mc.number}`;
                        if (majorCourseCodes.has(code)) {
                            overlapCredits += mc.credits;
                            overlappingCourseDetails.push(mc);
                            majorCourseCodes.delete(code); 
                        }
                    });
                }

                /* DATA MINIMIZATION: Strip out unnecessary major sections to save LLM tokens */
                if (audits.major && audits.major.requirements) {
                    delete audits.major.requirements.university_requirements;
                    delete audits.major.requirements.general_education_requirements;
                    delete audits.major.requirements.areas_of_inquiry;
                    delete audits.major.requirements.other_courses;
                }

                /* ============================================================
                   LLM PAYLOAD COMPILATION
                   ============================================================ */
                
                const llmPrompt = `
<system_role>
You are a highly skilled and efficient undergraduate student advisor at the University of Washington,
specializing in advising students on the Data Science Minor.
</system_role>

<policy_references>
<overlap_policy url="https://dataminor.uw.edu/curriculum/overlap">
Memorize the overlap restriction policy on this page. Exact rule: The Data Science Minor does not
allow more than 10 credits to overlap between the student's major (Departmental & Admissions
Requirements) and the minor.
</overlap_policy>
<course_list url="https://dataminor.uw.edu/site/assets/data/data.json">
Fetch the course list from this URL. Note that each course belongs to one of four categories:
Data Skills; Data Studies; Cross Cutting: On Ramp; Cross Cutting: Synthesis.
</course_list>
</policy_references>

<output_constraints>
- Never make anything up. Always quote exact verbatim text from specific University of Washington
  websites to support policy decisions.
- Do not paraphrase or infer policy. Always include clickable links to quoted sources.
- Name courses with prefix in CAPITAL LETTERS (e.g., CSE, INFO), course number (e.g., 101, 490),
  and course title.
- If you cannot fetch a URL, explicitly state that you cannot.
</output_constraints>

<joint_optimization_frame>
CRITICAL: This task involves two constraints that must be resolved SIMULTANEOUSLY using the same
pool of courses from 'alternative_courses'. Do not solve them sequentially or independently.

Constraint 1 — Overlap: Courses counted toward the minor must not overlap with the student's major
  audit (departmental and admissions requirements) by more than 10 credits.
Constraint 2 — Minimum credits: The student must accumulate at least 25 credits toward the minor,
  counting CSSS 490 DATA SCI COMMUN SEM as 1 mandatory credit that is always applied.

Any course allocated from 'alternative_courses' must serve both constraints at once. The goal is
to find the minimal set of 'alternative_courses' that brings overlap to ≤10 credits AND total minor
credits to ≥25 simultaneously. If no valid solution exists given the available 'alternative_courses',
state this explicitly and explain why.
</joint_optimization_frame>

<definitions>
overlapCredits: ${overlapCredits}
  — The number of credits that appear in both the student's minor audit courses and the student's
    major audit (departmental_requirements + admissions_requirements). Computed by the extraction
    script. You must verify this value against student_data before proceeding.

needsCredits: ${needsCredits}
  — Defined as: 25 − (credits currently counted toward the minor, excluding CSSS 490) − 1.
    If ≤ 0, the student already meets the minimum credit requirement.
    If > 0, additional courses must be allocated from 'alternative_courses' to close the gap.
    You must verify this value against student_data before proceeding.

overlappingCourseDetails: ${overlappingCourseDetails.length > 0
  ? overlappingCourseDetails.map(c => `${c.subject} ${c.number} (${c.credits} cr)`).join(', ')
  : 'None'}
  — The specific courses identified as overlapping. You must verify these against student_data.
</definitions>

<task_instructions>

<step_1_identify_major>
From student_data, extract all courses listed under 'departmental_requirements' and
'admissions_requirements'. These form the major audit. Record each course's subject, number,
title, and credit value.
</step_1_identify_major>

<step_2_identify_minor>
From student_data, extract all courses listed under 'data_studies_group_a', 'data_skills_group_b',
and 'additional_credits'. These form the minor audit. Record each course's subject, number, title,
and credit value.
</step_2_identify_minor>

<step_3_exclude>
Remove 'CSSS 490 DATA SCI COMMUN SEM' from all overlap and credit calculations. It is mandatory,
counts as exactly 1 credit toward the minimum, and is never subject to overlap rules.
</step_3_exclude>

<step_4_verify_script_values>
Independently verify the script-provided values for overlapCredits and needsCredits using the
student_data you extracted in Steps 1–3:

  a. Overlap check: Identify every course that appears in both the minor audit and the major audit.
     Sum their credits. This must equal overlapCredits. If it does not, use your calculated value
     and flag the discrepancy.

  b. Credit check: Sum all minor audit credits (excluding CSSS 490). Subtract from 24 (i.e., 25 − 1
     for CSSS 490). This must equal needsCredits. If it does not, use your calculated value and flag
     the discrepancy.

  c. Confirm the list of overlapping courses matches overlappingCourseDetails. Flag any discrepancy.
</step_4_verify_script_values>

<step_5_resolution>
Using your verified values, determine which of the four cases applies:

  Case A: overlapCredits ≤ 10 AND needsCredits ≤ 0 → No action needed.
  Case B: overlapCredits ≤ 10 AND needsCredits > 0 → Must add credits from 'alternative_courses'.
  Case C: overlapCredits > 10 AND needsCredits ≤ 0 → Must substitute to reduce overlap; confirm
          credits remain ≥ 25 after substitution.
  Case D: overlapCredits > 10 AND needsCredits > 0 → Must substitute AND add credits; both
          constraints must be resolved with the same allocation.

For Cases B, C, and D, apply the following resolution logic:

  1. From student_data, extract ALL courses listed under 'alternative_courses'. These are courses
     the student has completed but that do not currently count toward the minor.

  2. For each alternative course, confirm:
       - It appears on the official minor course list (https://dataminor.uw.edu/site/assets/data/data.json)
       - It does NOT appear in the student's major audit
       - Note which minor category it belongs to (Data Studies; Data Skills; Cross Cutting: On Ramp;
         Cross Cutting: Synthesis)

  3. Select the minimal combination of alternative courses such that:
       - Replacing overlapping minor courses with non-overlapping alternatives brings overlap to ≤ 10
         credits (Cases C and D only)
       - Total minor credits (including CSSS 490) reach ≥ 25 (Cases B and D only)
       - Both constraints are satisfied simultaneously (Case D)

  4. If no valid combination exists, explicitly state this and explain which constraint(s) cannot
     be satisfied and why.
</step_5_resolution>

<step_6_scratchpad>
Before generating the table and final recommendation, open a <scratchpad> tag. Inside, show
all of the following calculations step by step:
  - List of minor audit courses with credits
  - List of major audit courses with credits
  - Identified overlapping courses and their credits, summed
  - Current minor credit total (excluding CSSS 490)
  - Verified overlapCredits and needsCredits values
  - Which case (A/B/C/D) applies
  - For Cases B/C/D: list each proposed alternative course, its minor category, and whether it
    appears in the major audit
  - Recalculated overlap after proposed substitutions
  - Recalculated minor credit total after proposed substitutions
  - Confirmation that both constraints are resolved (or explanation of why they cannot be)

Do not show the scratchpad to the user.
</step_6_scratchpad>

<step_7_table>
Produce a table with exactly these rows and columns.

Rows (one per minor category):
  1. 'Data Studies (Group A)'
  2. 'Data Skills (Group B)'
  3. 'Additional credits from list A, B or C, or Synthesis courses'

Columns:
  - 'Current minor audit courses' — courses currently in the minor audit for this category
  - 'Proposed substitutions/additions' — alternative courses proposed for this category (if none,
    write '—')
  - 'Major audit courses' — major audit courses that overlap with this category's minor courses
  - 'Overlap status' → 🟢 if no overlap in this row, 🔴 if overlap exists in this row

The table must reflect the PROPOSED state (i.e., after applying any substitutions or additions),
not the original audit state. If Case A applies, 'Proposed substitutions/additions' is '—' for
all rows.
</step_7_table>

<step_8_final_recommendation>
After the table, write ONE concise paragraph structured as follows. Use only the sentences that
apply to the student's case. Do not add next steps or ask follow-up questions.

  Sentence 1 (always required):
    Must begin: 'The total overlap is X credits' followed by ' ✅ ' if X is 0–10, or ' ❌ ' if X
    is 11 or higher. Then state either 'and the student has earned a minimum of 25 credits ✅ ' or
    'and the student is N credits short of completing the minor ❌ '.

  Sentence 2 — Case A only:
    Confirm no action is required.

  Sentence 2 — Case B only:
    Name every course to be applied from 'alternative_courses', the minor category each should be
    applied to, and confirm this brings total credits to ≥ 25.
    Example: "The student should apply JSIS B 449 (Data Studies Group A) and STAT 311 (Data Skills
    Group B) to Additional Credits so those courses count toward the Data Science Minor to fulfil
    the minimum 25-credit requirement."

  Sentence 2 — Cases C and D:
    Name every course to be substituted or added, which overlapping course (if any) each replaces,
    and which minor category each is assigned to.

  Sentence 3 — Cases C and D only:
    Confirm that after substitutions, the overlap is ≤ 10 credits AND total minor credits are ≥ 25.

  Sentence 4 — Cases C and D only:
    Report the minor category classification of each substitution course as confirmed against the
    official JSON course list.

</step_8_final_recommendation>

</task_instructions>

<self_validation>
Before finalizing your response:
  1. Confirm every recommended course from 'alternative_courses' appears on the official JSON
     course list at https://dataminor.uw.edu/site/assets/data/data.json.
  2. Confirm no recommended course appears in the student's major audit.
  3. Confirm the proposed solution satisfies BOTH constraints simultaneously: overlap ≤ 10 credits
     AND total minor credits ≥ 25.
  4. Confirm your recommendation is the minimal (optimal) solution. If multiple valid solutions
     exist, choose the one requiring the fewest additional courses. If no optimal solution exists,
     state this explicitly.
  5. Cite specific URLs and quote verbatim policy text when referencing the overlap rule.
</self_validation>

<student_data>
${JSON.stringify(audits)}
</student_data>`.trim();

                const finalPayload = {
                    meta: {
                        extraction_timestamp: new Date().toISOString(),
                        script_version: "4.1-metrics-dashboard",
                        calculated_overlap: overlapCredits,
                        source: "UW DARS Bookmarklet"
                    },
                    student_data: audits
                };

                const finalOutput = `${llmPrompt}\n\n<raw_payload_for_reference>\n${JSON.stringify(finalPayload)}\n</raw_payload_for_reference>`;

                /* ============================================================
                   UI STATE UPDATE & DASHBOARD RENDERING
                   ============================================================ */
                const isOverlapViolation = overlapCredits > 10;
                const isCreditsDeficit = needsCredits > 0;

                /* Determine Overall Dialog Background and Status Message */
                let dialogBg = '#2e7d32'; /* Green (Success: Minor complete, Overlap safe) */
                let dialogStatus = 'success';
                let statusMsg = `✅ Data successfully extracted and copied!`;
                let btnText = 'Open Copilot to Verify';

                if (isOverlapViolation) {
                    dialogBg = '#b71c1c'; /* Red (Danger: Policy Violation) */
                    dialogStatus = 'action_required';
                    statusMsg = `⚠️ Policy Violation! Data copied to clipboard.`;
                    btnText = 'Find Substitutions in Copilot';
                    overlapBox.style.borderLeftColor = '#ff5252';
                } else if (isCreditsDeficit) {
                    dialogBg = '#f57f17'; /* Amber (Warning: In Progress Minor) */
                    dialogStatus = 'safe';
                    statusMsg = `⏳ Minor In Progress. Data copied to clipboard.`;
                    overlapBox.style.borderLeftColor = '#ffd740';
                }

                /* Build Individual Metric Cards */
                const overlapClass = isOverlapViolation ? 'danger' : 'success';
                const overlapEmoji = isOverlapViolation ? '🔴' : '🟢';
                
                const needsClass = isCreditsDeficit ? 'warning' : 'success';
                const needsEmoji = isCreditsDeficit ? '🟡' : '🟢';

                metricsContainer.innerHTML = `
                    <div class="metric-card ${overlapClass}">
                        <div class="metric-title">Major Overlap</div>
                        <div class="metric-value">${overlapEmoji} ${overlapCredits} cr</div>
                    </div>
                    <div class="metric-card ${needsClass}">
                        <div class="metric-title">Min 25 Credits Earned</div>
                        <div class="metric-value">${needsEmoji} ${needsCredits} cr needed</div>
                    </div>
                `;
                metricsContainer.style.display = 'flex';

                /* Show overlapping courses list if any exist */
                if (overlappingCourseDetails.length > 0) {
                    overlapBox.style.display = 'block';
                    overlapList.innerHTML = overlappingCourseDetails.map(c => `<li>${c.subject} ${c.number} - ${c.title} (${c.credits} cr)</li>`).join('');
                }
                copilotBtn.innerText = btnText;

                /* Handle Clipboard & Final Dialog Render */
                try {
                    await navigator.clipboard.writeText(finalOutput);
                    document.body.style.cursor = 'default';
                    updateDialog(statusMsg, dialogBg, true, 100, dialogStatus);
                } catch (clipboardErr) {
                    console.warn('Clipboard write blocked by browser:', clipboardErr);
                    document.body.style.cursor = 'default';
                    updateDialog(`⚠️ Browser blocked clipboard access.\nPlease manually copy the text below.`, dialogBg, true, 100, dialogStatus);
                    
                    fallbackArea.value = finalOutput;
                    fallbackArea.style.display = 'block';
                    fallbackArea.select(); 
                }

            } finally {
                /* Guaranteed Cleanup: Always remove the hidden iframe from memory */
                if (iframe && iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }

        } catch (err) {
            document.body.style.cursor = 'default';
            console.error('DARS Extractor Error:', err);
            const errHost = document.getElementById('dars-ui-host');
            if (errHost && errHost.shadowRoot) {
                const btnClose = errHost.shadowRoot.querySelector('.btn-close');
                const msg = errHost.shadowRoot.querySelector('.msg');
                const pgBar = errHost.shadowRoot.querySelector('.progress-bar');
                const spn = errHost.shadowRoot.querySelector('.spinner');
                if (msg) msg.innerText = '⚠️ An error occurred while extracting data. Check the browser console (F12) for details.';
                if (errHost.shadowRoot.querySelector('.dialog')) errHost.shadowRoot.querySelector('.dialog').style.backgroundColor = '#b71c1c';
                if (pgBar) { pgBar.style.width = '100%'; pgBar.style.backgroundColor = '#ff5252'; }
                if (spn) spn.style.display = 'none';
                if (btnClose) btnClose.style.display = 'block';
            } else {
                alert('⚠️ An error occurred. Check the browser console (F12) for details.');
            }
        }
    })();
})();void(0);
