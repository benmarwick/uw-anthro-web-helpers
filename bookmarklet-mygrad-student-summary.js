javascript:(function(){
    (async function() {
        /* ============================================================
           UI SETUP (SHADOW DOM ENCAPSULATION & UX PATTERNS)
           ============================================================ */
        document.body.style.cursor = 'wait';

        /* Clean up any previous host elements */
        const existingHost = document.getElementById('uw-extractor-host');
        if (existingHost) existingHost.remove();

        /* Create Shadow Host */
        const host = document.createElement('div');
        host.id = 'uw-extractor-host';
        Object.assign(host.style, { position: 'relative', zIndex: '2147483647' });
        document.body.appendChild(host);

        /* Attach closed Shadow DOM to prevent CSS leaking */
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
            @keyframes uw-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes drawCheck { 0% { stroke-dashoffset: 48; } 100% { stroke-dashoffset: 0; } }
            
            .overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background-color: rgba(0, 0, 0, 0.6); zIndex: 1;
                opacity: 0; animation: fadeIn 0.4s ease forwards; transition: opacity 0.4s ease;
            }
            .dialog {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 440px; max-width: 90vw; padding: 20px 20px 24px 20px;
                background-color: #4b2e83; /* Deep Purple for Loading */
                color: #ffffff;
                font-family: system-ui, -apple-system, sans-serif; font-size: 15px; line-height: 1.5;
                border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                zIndex: 2; display: flex; flex-direction: column; gap: 15px; overflow: hidden;
                opacity: 0; animation: slideFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                transition: opacity 0.4s ease, background-color 0.4s ease;
            }
            .content-row { display: flex; align-items: flex-start; gap: 12px; }
            .spinner { 
                border: 3px solid rgba(255,255,255,0.2); border-top: 3px solid #b7a57a; /* UW Gold accent */
                border-radius: 50%; width: 18px; height: 18px; 
                animation: uw-spin 1s linear infinite; display: inline-block; flex-shrink: 0;
            }
            .status-icon { width: 24px; height: 24px; flex-shrink: 0; display: none; }
            .status-icon polyline, .status-icon circle, .status-icon line {
                stroke-dasharray: 48; stroke-dashoffset: 48;
            }
            .msg { flex: 1; white-space: pre-wrap; font-weight: 500; }
            
            .scrollable {
                width: 100%; height: 140px; background-color: rgba(0,0,0,0.2); color: #fff;
                border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 8px;
                font-size: 12px; font-family: ui-monospace, monospace; display: none; resize: vertical; box-sizing: border-box;
            }
            .scrollable::-webkit-scrollbar { width: 8px; }
            .scrollable::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
            .scrollable::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
            
            .button-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px; }
            button {
                padding: 8px 16px; color: #ffffff; border-radius: 4px;
                cursor: pointer; font-weight: 600; display: none; transition: background-color 0.2s; border: none; font-size: 13px;
            }
            .btn-close { background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255,255,255,0.4); }
            .btn-close:hover { background-color: rgba(255, 255, 255, 0.3); }
            .btn-copilot { background-color: #10a37f; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            .btn-copilot:hover { background-color: #0d8c6d; }
            
            .progress-bar {
                position: absolute; bottom: 0; left: 0; height: 5px;
                background-color: #b7a57a; width: 0%; transition: width 0.3s ease, background-color 0.3s ease;
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
        msgSpan.innerText = 'Initializing extraction...';

        contentRow.appendChild(spinner);
        contentRow.appendChild(statusIcon);
        contentRow.appendChild(msgSpan);
        dialog.appendChild(contentRow);

        const fallbackArea = document.createElement('textarea');
        fallbackArea.className = 'scrollable';
        dialog.appendChild(fallbackArea);

        const btnRow = document.createElement('div');
        btnRow.className = 'button-row';

        const copilotBtn = document.createElement('button');
        copilotBtn.className = 'btn-copilot';
        copilotBtn.innerText = 'Launch Microsoft Copilot';
        copilotBtn.onclick = () => { window.open('https://copilot.microsoft.com/', '_blank'); closeDialog(); };
        
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
            document.body.style.cursor = 'default';
            setTimeout(() => host.remove(), 400);
        };
        closeBtn.onclick = closeDialog;

        /* Prevent auto-close if user hovers over the dialog */
        dialog.onmouseenter = () => clearTimeout(hideTimeout);

        const updateDialog = (text, bgColor, showButtons = false, progress = null, status = 'loading') => {
            msgSpan.innerText = text;
            if (bgColor) dialog.style.backgroundColor = bgColor;
            if (progress !== null) progressBar.style.width = `${progress}%`;
            
            if (['success', 'error'].includes(status)) {
                spinner.style.display = 'none';
                statusIcon.style.display = 'block';
                
                if (status === 'success') {
                    progressBar.style.backgroundColor = '#69f0ae'; /* Bright accent green */
                    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    const poly = statusIcon.querySelector('polyline');
                    if (poly) poly.style.animation = 'drawCheck 0.6s ease forwards';
                } else if (status === 'error') {
                    progressBar.style.backgroundColor = '#ff5252'; /* Bright accent red */
                    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
                    const els = statusIcon.querySelectorAll('circle, line');
                    els.forEach(el => el.style.animation = 'drawCheck 0.4s ease forwards');
                }
            }

            if (showButtons) {
                closeBtn.style.display = 'block';
                if (status === 'success') copilotBtn.style.display = 'block';
                
                /* Auto-dismiss logic only on success */
                if (status === 'success') {
                    hideTimeout = setTimeout(closeDialog, 7000);
                }
            }
        };

        /* ============================================================
           DATA EXTRACTION LOGIC
           ============================================================ */
        try {
            const studentId = new URLSearchParams(window.location.search).get('id');
            if (!studentId) {
                updateDialog("❌ No student ID found in URL.", '#b71c1c', true, 100, 'error');
                return;
            }

            /* Configuration */
            const CONFIG = {
                llmPrompt: `<system_role>
You are an experienced academic advisor who cares deeply about supporting students in their graduate studies. Use a warm, supportive, highly detail-oriented tone. Write all content in the third-person point of view (never first or second person). Produce a single, complete message only that fully executes these instructions.
</system_role>

<output_requirements>
1. **One-shot**: Return exactly one message. Do not ask clarifying questions. Do not produce partial answers or offer "What I can do next."  
2. **Structure**: The single message must contain these sections in this order:
   - **Audit Scratchpad** (short, 1–3 sentences)
   - **Milestone Progress** (Markdown table with exact columns shown below)
   - **Issues, Red Flags, & Concerns** (Markdown table with exact columns shown below)
   - **Next Steps** (one warm, supportive paragraph in third-person using the student's name frequently)
   - **Verification** (bullet list confirming each required deliverable was produced)
3. **Length**: Entire reply must be between 300 and 700 words.
4. **Finality token**: End the message with the single word: 'Complete'
</output_requirements>

<output_constraints>
- **No hallucinations**: Do not invent facts. If a required web page cannot be accessed, state exactly: 'I could not access the requirements page.' and still complete all sections using only verifiable transcript facts.
- **Verbatim quotes**: When citing program requirements or Grad School policy, include **exact verbatim quotes** from the specified UW pages and include the corresponding clickable URL. If the quote cannot be fetched, use the exact fallback sentence above.
- **Allowed sources only**: Restrict web access to these URLs only:
  - Sociocultural: \n\nhttps://anthropology.washington.edu/phd-anthropology-sociocultural-anthropology\n\n
  - Archaeology: \n\nhttps://anthropology.washington.edu/phd-anthropology-archaeology\n\n
  - Biological: \n\nhttps://anthropology.washington.edu/phd-anthropology-biological-anthropology\n\n
  - UW Grad School doctoral policies (10-year rule): \n\nhttps://grad.uw.edu/policy_audience/doctoral-students\n\n and its \n\nhttps://grad.uw.edu/policy_audience/doctoral-students/page/2\n\nhttps://grad.uw.edu/policy_audience/doctoral-students and \n\nhttps://grad.uw.edu/policy_audience/doctoral-students/page/3\n\nhttps://grad.uw.edu/policy_audience/doctoral-students\n\n variants.
- **Citations**: For each factual claim that could be verified online, include the verbatim quote followed by the clickable URL.
- **Do not browse other domains**. Do not reference other departments, universities, or internal notes.
- **Do not include** chain-of-thought or step-by-step private reasoning beyond the short Audit Scratchpad (no internal deliberation).
- **Do not ask** for missing variables (e.g., calculatedStartYear). If a variable is not present in the transcript, state that it is missing and proceed using only available data.
</output_constraints>

<data_dictionary>
DATA DICTIONARY (use these mappings when interpreting transcript codes)
- PRE‑DOCTOR (ANTH‑50‑3‑0) = Archaeology program
- ARCHY = Archaeology program
- BIO A = Biological Anthropology program
- ANTH = Sociocultural program
- "There are no current requests for this student" = student has not scheduled or taken the general exam
- "MA on transcript" = MA requirement satisfied
- "Previous Degrees MASTER OF ARTS" = MA requirement satisfied
- Advisor(s) Daniel J Hoffman (chair) = Advisor is recorded, name is Daniel J Hoffman 
- "Candidacy Granted" = General Exam requirement satisfied
</data_dictionary>

<task_instructions>
Your task is to execute these steps in this order: 

<task_step_1_identify_program>
**Identify program** from the transcript by looking for which prefix is most common: ARCHY, BIO A, or ANTH (but exclude ANTH 800). State the student's name and their program code, and the plain-language program name.
</task_step_1_identify_program>

<task_step_2_identify_year_started>
**Use calculatedStartYear** if present in the data. If absent, look at the student's transcript and find the first year they took 400 or 500 or 600 level classes at UW.
</task_step_2_identify_year_started>

<task_step_3_evaluate_progress_with_program_requirements>
**Fetch** the single matching program requirements page (only the one that matches the identified program) and the UW Grad School doctoral policy pages listed above.
**Map transcript items** to specific program requirements: coursework, MA, committee formation, general exam, dissertation credits.
**Required coursework completed**: if the student has not completed all required coursework within two years of starting their degree (ignore 600 courses), note that they are **overdue**
**MA earned**: if the student has not yet earned their MA within two years of starting their degree, note that this is an **emerging issue**
**Committee formed**: refer to the specific rules for ANTH, BIO A or ARCHY to determine if the student is in good standing or not
**General exam passed**: if the student has not yet completed their general exam within four years of starting their degree, note that this is an **emerging issue**. refer to the specific rules the time limit between MA and general exam for ANTH, BIO A or ARCHY to further determine if the student is in good standing or not
**Dissertation credits recorded** if the student has recorded any dissertation credits, but not yet passed their general exam, note that they are **overdue**. If the student has passed their general exam, but not yet recorded any dissertation credits, note that they are **overdue**
</task_step_3_evaluate_progress_with_program_requirements>

<task_step_4_evaluate_ten_year_rule>
**Evaluate 10-year rule** compliance using calculatedStartYear (or the first year of classes at UW) and quote the exact UW Grad School policy text used for the evaluation with the URL.
</task_step_4_evaluate_ten_year_rule>

<task_step_5_produce_output_format>
**Produce the required output sections** produce two tables with exactly the rows and columns specified here:

Table Title: Progress summary

Columns:
1. Milestone
2. Status (include emoji from key below)
3. Description & Policy Reference

Rows (must include all rows)
- Required coursework completed
- MA earned 
- Committee formed
- General exam passed
- Dissertation credits recorded
- Ten year limit

produce a second table with exactly these rows and columns:

Table Title: Progress summary

Columns:
1. Area of Concern
2. Severity (include emoji from key below)
3. Description & Policy Reference

Rows (only as required)
- Required coursework completed
- MA earned 
- Committee formed
- General exam passed
- Dissertation credits recorded
- Ten year limit

EMOJI KEY
- 🟢 = complete / good standing
- 🟠 = approaching deadline / emerging issue
- 🔴 = overdue / missing milestone
</task_step_5_produce_output_format>

</task_instructions>

<self_validation>
Before finalizing your response:
1. Verify your response begins with a one sentence summary stating the student's name, year they started their studies at UW, the student's advisor's name, and the requirements satsified so far
2. Ensure your response includes a Milestone Progress table produced with exactly six rows and three columns
3. Ensure your response includes a Issues table with exactly three columns
4. Ensure your response includes a Next Steps paragraph
3. Cite specific URLs and quote verbatim text when referencing policies.
</self_validation>
\n\n`,
                removeEmptyFields: true,
                uwBoilerplatePatterns:[/skip to main content/i,/university of washington/i,/\bmygrad\b/i,/\b(home|help|logout|edit|print)\b/i,/add committee|update degree|waive dissertation|reinstate dissertation|reset dissertation/i,/student detail|committee|transcript|degree progress|student requests/i,/©\s*\d{4}.*university/i,/accessibility|privacy|terms of use/i,/view applicants|view grad students|view faculty|view admin/i,/main page|end session|return to student details/i,/^\s*[\|•\-–—]\s*$/,/^\s*$/]
            };

            let globalSeenLines = new Set();

            /* Data Parsing Utilities */
            function pruneEmpty(obj) {
                if (obj === null || obj === undefined) return null;
                if (typeof obj === 'string') return obj.trim() === '' ? null : obj.trim();
                if (Array.isArray(obj)) {
                    const cleaned = obj.map(pruneEmpty).filter(v => v !== null && v !== undefined);
                    return cleaned.length > 0 ? cleaned : null;
                }
                if (typeof obj === 'object') {
                    const cleaned = {};
                    for (const [k, v] of Object.entries(obj)) {
                        const val = pruneEmpty(v);
                        if (val !== null && val !== undefined) cleaned[k] = val;
                    }
                    return Object.keys(cleaned).length > 0 ? cleaned : null;
                }
                return obj;
            }

            function getTableTitle(table) {
                const cap = table.querySelector('caption');
                if (cap?.innerText.trim()) return cap.innerText.trim();
                let el = table.previousElementSibling;
                while (el) {
                    if (el.matches?.('h1,h2,h3,h4,h5,strong,[role="heading"]')) {
                        const txt = el.innerText.trim();
                        if (txt && txt.length < 100) return txt;
                    }
                    el = el.previousElementSibling;
                }
                return null;
            }

            function parseAllTables(doc) {
                const out =[];
                const tables = Array.from(doc.querySelectorAll('table'));
                tables.forEach((table, tIndex) => {
                    const trs = Array.from(table.querySelectorAll('tr'));
                    if (trs.length < 2) return;
                    let headerIdx = 0;
                    while (headerIdx < trs.length && Array.from(trs[headerIdx].cells).every(c => !c.innerText.trim())) headerIdx++;
                    if (headerIdx >= trs.length) return;
                    const headerCells = Array.from(trs[headerIdx].querySelectorAll('th,td'));
                    const headers = headerCells.map((cell, i) => cell.innerText.replace(/\s+/g, ' ').trim() || `C${i + 1}`);
                    const rows =[];
                    for (let i = headerIdx + 1; i < trs.length; i++) {
                        const cells = Array.from(trs[i].querySelectorAll('td,th'));
                        if (!cells.length) continue;
                        const rowObj = {};
                        let hasData = false;
                        cells.forEach((cell, j) => {
                            const val = cell.innerText.replace(/\s+/g, ' ').trim();
                            if (!val || val === '|') return;
                            if (CONFIG.uwBoilerplatePatterns.some(p => p.test(val))) return;
                            hasData = true;
                            let key = headers[j] || `C${j + 1}`;
                            if (CONFIG.uwBoilerplatePatterns.some(p => p.test(key)) || key === '|') key = `C${j + 1}`;
                            rowObj[key] = val;
                        });
                        if (hasData) rows.push(rowObj);
                    }
                    if (rows.length > 0) out.push({ title: getTableTitle(table) || `Table_${tIndex + 1}`, rows: rows });
                });
                return out;
            }

            function getCleanPageTextLines(doc) {
                doc.querySelectorAll('nav, footer, header, aside, script, style, noscript, iframe, button, [role="navigation"], [role="banner"],[role="contentinfo"], .footer, .header, #global-nav, #uw-container').forEach(n => n.remove());
                doc.querySelectorAll('a, input, select, label').forEach(el => {
                    const t = (el.innerText || el.value || '').trim().toLowerCase();
                    if (!t || CONFIG.uwBoilerplatePatterns.some(p => p.test(t))) el.remove();
                });

                let text = (doc.body.innerText || '').replace(/\u00A0/g, ' ');
                const seen = new Set();
                const lines =[];
                for (const raw of text.split('\n')) {
                    let line = raw.replace(/\s+/g, ' ').trim();
                    if (!line || CONFIG.uwBoilerplatePatterns.some(p => p.test(line)) || seen.has(line) || globalSeenLines.has(line)) continue;
                    seen.add(line);
                    globalSeenLines.add(line);
                    lines.push(line);
                }
                return lines;
            }

            async function fetchAndParsePage(url, key) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const html = await response.text();
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    return { key, success: true, textLines: getCleanPageTextLines(doc), tables: parseAllTables(doc) };
                } catch (error) {
                    return { key, success: false, error: error.message };
                }
            }

            /* Execution Sequence */
            updateDialog(`Connecting to UW systems for ${studentId}...`, '#4b2e83', false, 10, 'loading');
            
            const base = "https://webappssecure.grad.uw.edu/mgp-dept.stu.detail";
            const reqBase = "https://webappssecure.grad.uw.edu/mgp-dept/stu";
            
            const pages =[
                { key: "detail", url: `${base}/home/studentdetail?id=${studentId}` },
                { key: "committee", url: `${base}/committee/index?id=${studentId}` },
                { key: "transcript", url: `${base}/home/transcript?id=${studentId}` },
                { key: "requests", url: `${reqBase}/request/threshold.aspx?id=${studentId}&ORG=14&REDIRECT=../list_student_requests.aspx?id=${studentId}` }
            ];

            let completed = 0;
            const results = await Promise.all(pages.map(async (p) => {
                const data = await fetchAndParsePage(p.url, p.key);
                completed++;
                updateDialog(`Retrieving page ${completed} of ${pages.length}...`, '#4b2e83', false, 10 + (completed / pages.length) * 60, 'loading');
                return data;
            }));

            updateDialog("Analyzing transcript for start year...", '#4b2e83', false, 80, 'loading');
            let calculatedStartYear = "Unknown";
            const transcriptData = results.find(r => r.key === 'transcript');
            if (transcriptData && transcriptData.success) {
                const yearRegex = /\b(19[89]\d|20[0-4]\d)\b/g; 
                let years =[];
                const searchString = JSON.stringify(transcriptData.tables) + " " + JSON.stringify(transcriptData.textLines);
                let match;
                while ((match = yearRegex.exec(searchString)) !== null) years.push(parseInt(match[1], 10));
                if (years.length > 0) calculatedStartYear = Math.min(...years).toString();
            }

            updateDialog("Formatting prompt payload...", '#4b2e83', false, 95, 'loading');
            let finalOutput = `<system_instructions>\n${CONFIG.llmPrompt}\n</system_instructions>\n\n<student_data id="${studentId}">\n  <calculatedStartYear>${calculatedStartYear}</calculatedStartYear>\n`;
            
            results.forEach(r => {
                finalOutput += `  <page id="${r.key}" fetch_success="${r.success}">\n`;
                if (r.success) {
                    const sectionData = CONFIG.removeEmptyFields ? pruneEmpty({ text: r.textLines, tables: r.tables }) : { text: r.textLines, tables: r.tables };
                    finalOutput += `    <![CDATA[\n${JSON.stringify(sectionData)}\n    ]]>\n`;
                } else {
                    finalOutput += `    <error>Failed to load data: ${r.error}</error>\n`;
                }
                finalOutput += `  </page>\n`;
            });
            finalOutput += `</student_data>`;

            /* Output / Success State */
            try {
                await navigator.clipboard.writeText(finalOutput);
                document.body.style.cursor = 'default';
                updateDialog(`Data extracted successfully!\n\n✅ Copied to clipboard. Click below to proceed.`, '#2e7d32', true, 100, 'success');
            } catch (clipboardErr) {
                document.body.style.cursor = 'default';
                updateDialog(`Data extracted successfully!\n\n⚠️ Browser blocked clipboard access. Please manually copy the text below.`, '#2e7d32', true, 100, 'success');
                fallbackArea.value = finalOutput;
                fallbackArea.style.display = 'block';
                fallbackArea.select();
            }

        } catch (err) {
            console.error("[UW Extractor] Fatal error:", err);
            document.body.style.cursor = 'default';
            updateDialog(`⚠️ An error occurred during extraction.\n\nCheck the browser console (F12) for details.`, '#b71c1c', true, 100, 'error');
        }
    })();
})();