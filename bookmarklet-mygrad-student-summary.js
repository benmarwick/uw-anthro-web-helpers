javascript:(function(){
    /* Singleton Pattern: Prevent duplicate widgets if clicked multiple times */
    const existingHost = document.getElementById('uw-extractor-host');
    if (existingHost) {
        existingHost.remove();
    }

    const studentId = new URLSearchParams(window.location.search).get('id');
    if (!studentId) {
        console.warn("[UW Extractor] No student ID found in URL.");
        alert("No student ID found in URL.");
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
**MA earned**: if the student has not earned their MA within two years of starting their degree, note that this is an **emerging issue**
**Committee formed**: refer to the specific rules for ANTH, BIO A or ARCHY to determine if the student is in good standing or not
**General exam passed**: if the student has not completed their general exam within four years of starting their degree, note that this is an **emerging issue**. refer to the specific rules the time limit between MA and general exam for ANTH, BIO A or ARCHY to further determine if the student is in good standing or not
**Dissertation credits recorded** if the student has recorded any dissertation credits, but not passed their general exam, note that they are **overdue**. If the student has passed their general exam, but not recorded any dissertation credits, note that they are **overdue**
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

    /* --- Shadow DOM UI Isolation --- */
    const host = document.createElement('div');
    host.id = 'uw-extractor-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
        <style>
            #widget {
                position: fixed; top: 20px; right: 20px; width: 340px;
                background: #ffffff; border-radius: 8px;
                box-shadow: 0 12px 28px rgba(0,0,0,0.25);
                font-family: system-ui, -apple-system, sans-serif;
                z-index: 2147483647; display: flex; flex-direction: column;
                border: 1px solid #d1d5db; overflow: hidden;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            #header {
                background: #4b2e83; color: white; padding: 12px 16px;
                cursor: grab; font-weight: 600; font-size: 15px;
                display: flex; justify-content: space-between; align-items: center;
                user-select: none;
            }
            #header:active { cursor: grabbing; }
            #close-btn {
                cursor: pointer; color: #b7a57a; font-size: 18px;
                background: none; border: none; padding: 0; line-height: 1;
                transition: color 0.2s;
            }
            #close-btn:hover { color: #fff; }
            #content { padding: 16px; font-size: 14px; color: #374151; }
            
            /* Rich Interactions */
            .btn {
                display: block; width: 100%; padding: 10px;
                background: #4b2e83; color: white; border: none; border-radius: 6px;
                font-weight: 600; cursor: pointer; margin-top: 12px;
                transition: background 0.2s, transform 0.1s;
            }
            .btn:hover:not(:disabled) { background: #3b2466; }
            .btn:active:not(:disabled) { transform: scale(0.98); }
            .btn:disabled { background: #9ca3af; cursor: not-allowed; }
            
            .btn-copilot {
                background: #10a37f; display: none;
                animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .btn-copilot:hover { background: #0d8c6d; }
            
            .progress-container {
                height: 8px; background: #e5e7eb; border-radius: 4px;
                overflow: hidden; margin-top: 12px; display: none;
            }
            .progress-fill {
                height: 100%; background: #b7a57a; width: 0%;
                transition: width 0.4s ease;
            }
            #status-text { margin-top: 12px; font-size: 13px; color: #6b7280; text-align: center; height: 18px; }
            
            @keyframes popIn {
                0% { transform: scale(0.9); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            .fade-out { opacity: 0; transform: translateY(-10px); pointer-events: none; }
        </style>
        <div id="widget">
            <div id="header">
                <span>UW Data Extractor</span>
                <button id="close-btn" title="Close">✖</button>
            </div>
            <div id="content">
                <div id="message">Ready to collect data for <b>${studentId}</b>.</div>
                <div class="progress-container" id="progress-container">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div id="status-text"></div>
                <button class="btn" id="start-btn">Extract & Format Data</button>
                <button class="btn btn-copilot" id="copilot-btn">Launch Microsoft Copilot</button>
            </div>
        </div>
    `;

    /* DOM Elements */
    const widget = shadow.getElementById('widget');
    const header = shadow.getElementById('header');
    const closeBtn = shadow.getElementById('close-btn');
    const startBtn = shadow.getElementById('start-btn');
    const copilotBtn = shadow.getElementById('copilot-btn');
    const progressContainer = shadow.getElementById('progress-container');
    const progressFill = shadow.getElementById('progress-fill');
    const statusText = shadow.getElementById('status-text');

    /* --- Draggable Widget Logic --- */
    let isDragging = false;
    let dragStartX, dragStartY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        if(e.target === closeBtn) return;
        isDragging = true;
        dragStartX = e.clientX; dragStartY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initialLeft = rect.left; initialTop = rect.top;
        widget.style.right = 'auto'; /* Release right alignment */
        widget.style.left = initialLeft + 'px';
        widget.style.top = initialTop + 'px';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        widget.style.left = (initialLeft + dx) + 'px';
        widget.style.top = (initialTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    /* --- Auto-Cleanup Logic --- */
    const destroyWidget = () => {
        widget.classList.add('fade-out');
        setTimeout(() => host.remove(), 300);
    };
    closeBtn.addEventListener('click', destroyWidget);

    /* Copilot Launch & Cleanup */
    copilotBtn.addEventListener('click', () => {
        window.open('https://copilot.microsoft.com/', '_blank');
        destroyWidget();
    });

    /* --- Data Parsing Utilities --- */
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
            const headers = headerCells.map((cell, i) => {
                const txt = cell.innerText.replace(/\s+/g, ' ').trim();
                return txt || `C${i + 1}`;
            });
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
            if (rows.length > 0) {
                out.push({ title: getTableTitle(table) || `Table_${tIndex + 1}`, rows: rows });
            }
        });
        return out;
    }

    function getCleanPageTextLines(doc) {
        /* Improved Boilerplate Stripping: Remove common structural garbage before text extraction */
        doc.querySelectorAll('nav, footer, header, aside, script, style, noscript, iframe, button, [role="navigation"], [role="banner"],[role="contentinfo"], .footer, .header, #global-nav, #uw-container').forEach(n => n.remove());
        
        doc.querySelectorAll('a, input, select, label').forEach(el => {
            const t = (el.innerText || el.value || '').trim().toLowerCase();
            if (!t || CONFIG.uwBoilerplatePatterns.some(p => p.test(t))) { el.remove(); return; }
        });

        let text = (doc.body.innerText || '').replace(/\u00A0/g, ' ');
        const seen = new Set();
        const lines =[];
        for (const raw of text.split('\n')) {
            let line = raw.replace(/\s+/g, ' ').trim();
            if (!line) continue;
            if (CONFIG.uwBoilerplatePatterns.some(p => p.test(line))) continue;
            if (seen.has(line) || globalSeenLines.has(line)) continue;
            seen.add(line);
            globalSeenLines.add(line);
            lines.push(line);
        }
        return lines;
    }

    /* --- Fetch() + DOMParser instead of iframes --- */
    async function fetchAndParsePage(url, key) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const tables = parseAllTables(doc);
            const textLines = getCleanPageTextLines(doc);
            
            return { key, success: true, textLines, tables };
        } catch (error) {
            console.error(`[UW Extractor] Failed to fetch ${key}:`, error);
            return { key, success: false, error: error.message };
        }
    }

    /* --- Main Extraction Logic --- */
    startBtn.addEventListener('click', async () => {
        globalSeenLines.clear();
        startBtn.disabled = true;
        startBtn.textContent = "Extracting...";
        progressContainer.style.display = 'block';
        statusText.textContent = "Connecting to UW systems...";

        try {
            const base = "https://webappssecure.grad.uw.edu/mgp-dept.stu.detail";
            const reqBase = "https://webappssecure.grad.uw.edu/mgp-dept/stu";
            
            const pages =[
                { key: "detail", url: `${base}/home/studentdetail?id=${studentId}` },
                { key: "committee", url: `${base}/committee/index?id=${studentId}` },
                { key: "transcript", url: `${base}/home/transcript?id=${studentId}` },
                { key: "requests", url: `${reqBase}/request/threshold.aspx?id=${studentId}&ORG=14&REDIRECT=../list_student_requests.aspx?id=${studentId}` }
            ];

            let completed = 0;
            
            /* Parallel Fetching (Optimized) */
            const results = await Promise.all(pages.map(async (p) => {
                const data = await fetchAndParsePage(p.url, p.key);
                completed++;
                progressFill.style.width = `${(completed / pages.length) * 100}%`;
                statusText.textContent = `Retrieved ${completed} of ${pages.length} pages...`;
                return data;
            }));

            /* Pre-calculate "Start Year" */
            statusText.textContent = "Analyzing transcript for start year...";
            let calculatedStartYear = "Unknown";
            const transcriptData = results.find(r => r.key === 'transcript');
            if (transcriptData && transcriptData.success) {
                const yearRegex = /\b(19[89]\d|20[0-4]\d)\b/g; 
                let years =[];
                const searchString = JSON.stringify(transcriptData.tables) + " " + JSON.stringify(transcriptData.textLines);
                let match;
                while ((match = yearRegex.exec(searchString)) !== null) {
                    years.push(parseInt(match[1], 10));
                }
                if (years.length > 0) {
                    calculatedStartYear = Math.min(...years).toString();
                }
            }

            /* Prompt Structuring with XML Tags */
            statusText.textContent = "Formatting prompt...";
            
            let finalOutput = `<system_instructions>\n${CONFIG.llmPrompt}\n</system_instructions>\n\n`;
            finalOutput += `<student_data id="${studentId}">\n`;
            finalOutput += `  <calculatedStartYear>${calculatedStartYear}</calculatedStartYear>\n`;
            
            results.forEach(r => {
                finalOutput += `  <page id="${r.key}" fetch_success="${r.success}">\n`;
                if (r.success) {
                    /* We keep the inner data as compact JSON stringified, but wrapped in clear XML */
                    const sectionData = CONFIG.removeEmptyFields ? pruneEmpty({ text: r.textLines, tables: r.tables }) : { text: r.textLines, tables: r.tables };
                    finalOutput += `    <![CDATA[\n${JSON.stringify(sectionData)}\n    ]]>\n`;
                } else {
                    /* Graceful Error Handling injected to LLM context */
                    finalOutput += `    <error>Failed to load data: ${r.error}</error>\n`;
                }
                finalOutput += `  </page>\n`;
            });
            finalOutput += `</student_data>`;

            await navigator.clipboard.writeText(finalOutput);

            /* Rich Visual Feedback / Success State */
            progressFill.style.background = '#10a37f';
            statusText.style.color = '#10a37f';
            statusText.textContent = "Copied to clipboard! Ready for LLM.";
            startBtn.style.display = 'none';
            copilotBtn.style.display = 'block';

        } catch (err) {
            console.error("[UW Extractor] Fatal error:", err);
            statusText.style.color = '#d9534f';
            statusText.textContent = "An error occurred. Check console.";
            progressFill.style.background = '#d9534f';
            startBtn.disabled = false;
            startBtn.textContent = "Retry Extraction";
        }
    });

})();