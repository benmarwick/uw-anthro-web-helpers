javascript:(async function() {
    try {
        document.body.style.cursor = 'wait';
        const audits = {};
        const rows = document.querySelectorAll('tr');
        const targetLinks = [];

        /* 1. Find all "Detail" links in the Available Audits table */
        rows.forEach(row => {
            const links = row.querySelectorAll('a');
            for (const a of links) {
                if (a.textContent.trim() === 'Detail') {
                    const programName = row.cells[0] ? row.cells[0].textContent.trim() : 'Unknown_Program';
                    targetLinks.push({ name: programName, url: a.href });
                    break;
                }
            }
        });

        if (targetLinks.length === 0) {
            document.body.style.cursor = 'default';
            alert('No "Detail" links found. Ensure the Available Audits table is visible.');
            return;
        }

        /* 2. Hidden iframe: Set to Desktop size so responsive CSS doesn't hide table columns */
        const iframe = document.createElement('iframe');
        iframe.style.width = '1920px';
        iframe.style.height = '1080px';
        iframe.style.border = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px'; 
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        /* Define headers and map them to strict snake_case keys */
        const majorTargets = [
            { search: "UNIVERSITY REQUIREMENTS", key: "university_requirements" },
            { search: "GENERAL EDUCATION REQUIREMENTS PROFICIENCY", key: "general_education_requirements" },
            { search: "AREAS OF INQUIRY", key: "areas_of_inquiry" },
            { search: "DEPARTMENTAL REQUIREMENTS", key: "departmental_requirements" },
            { search: "ADMISSIONS REQUIREMENTS", key: "admissions_requirements" },
            { search: "OTHER COURSES", key: "other_courses" }
        ];

        const minorTargets = [
            { search: "Data Studies (Group A)", key: "data_studies_group_a" },
            { search: "Data Skills (Group B)", key: "data_skills_group_b" }, 
            { search: "Additional credits from list A, B or C, or Synthesis courses", key: "additional_credits" },
            { search: "A different course was used where the following could have applied.", key: "alternative_courses" }
        ];

        /* Regex to parse a course row */
        const courseRegex = /^((?:AU|WI|SP|SU)\d{2})\s+([A-Z\s&]+?)\s+([0-9X]{3}[A-Z]?)\s+(.*?)\s+(\d+(?:\.\d+)?)\s+(.+)$/i;

        for (const item of targetLinks) {
            const response = await fetch(item.url);
            const html = await response.text();
            
            const parser = new DOMParser();
            const cleanDoc = parser.parseFromString(html, 'text/html');
            
            /* SANITIZATION 1: Remove scripts and stylesheets */
            cleanDoc.querySelectorAll('script, style, link').forEach(s => s.remove());
            
            /* SANITIZATION 2: Forcefully extract the exact prefix and number from data attributes */
            cleanDoc.querySelectorAll('.linkified').forEach(span => {
                const subj = span.getAttribute('data-subject');
                const num = span.getAttribute('data-number');
                if (subj && num) {
                    span.textContent = `${subj} ${num} `;
                }
            });
            
            /* Write to iframe and render */
            const idoc = iframe.contentDocument;
            idoc.open();
            idoc.write(cleanDoc.documentElement.outerHTML);
            idoc.close();

            await new Promise(r => setTimeout(r, 100));

            const textDump = idoc.body.innerText.replace(/\t/g, ' ');
            
            const isMinor = item.name.toLowerCase().includes('minor');
            const roleKey = isMinor ? 'minor' : 'major';
            const targets = isMinor ? minorTargets : majorTargets;
            
            if (!audits[roleKey]) {
                audits[roleKey] = {
                    program_name: item.name,
                    requirements: {}
                };
            }

            let foundTargets = [];
            targets.forEach(target => {
                let idx = textDump.indexOf(target.search);
                if (idx !== -1) {
                    foundTargets.push({ key: target.key, search: target.search, index: idx });
                }
            });
            
            foundTargets.sort((a, b) => a.index - b.index);
            
            let eofIndex = textDump.indexOf('FEDERAL LAW PROHIBITS');
            if (eofIndex === -1) eofIndex = textDump.indexOf('END OF ANALYSIS');
            if (eofIndex === -1) eofIndex = textDump.length;

            for (let i = 0; i < foundTargets.length; i++) {
                let startIdx = foundTargets[i].index;
                let endIdx = (i + 1 < foundTargets.length) ? foundTargets[i+1].index : eofIndex;
                
                if (endIdx > eofIndex && startIdx < eofIndex) {
                    endIdx = eofIndex;
                }
                
                let content = textDump.substring(startIdx, endIdx).trim();
                
                let linesArray = content.split('\n')
                    .map(line => line.replace(/\s+/g, ' ').trim())
                    .filter(line => line.length > 0);

                let courses = [];
                let description = [];

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

                audits[roleKey].requirements[foundTargets[i].key] = {
                    description: description,
                    courses: courses
                };
            }
        }

        document.body.removeChild(iframe);

        /* ============================================================
           RESTRUCTURED LLM PROMPT WITH CLEAR XML-STYLE DELIMITERS
           Benefits:
           - Prevents instruction/data confusion (prompt injection resistance)
           - Enables reliable section referencing for the LLM
           - Supports step-by-step reasoning with explicit boundaries
           - Makes output parsing more deterministic
           ============================================================ */
        
        const llmPrompt = `
<system_role>
You are a highly skilled and efficient undergraduate student advisor at the University of Washington. You specialize in advising students in the Data Science Minor.
</system_role>

<policy_references>
<overlap_policy url="https://dataminor.uw.edu/curriculum/overlap">
Memorize the overlap restriction policy on this page. Quote exact verbatim text to support decisions.
</overlap_policy>
<course_list url="https://dataminor.uw.edu/site/assets/data/data.json">
Go to the course list url. Get the course list for the Minor. Note that each course belongs to one of four categories: Data Skills; Data Studies; Cross Cutting: On Ramp; Cross Cutting: Synthesis.
</course_list>
</policy_references>

<output_constraints>
- Never make anything up. Always quote exact verbatim text from specific University of Washington websites to support decisions.
- Do not paraphrase or infer. Always include clickable links to quoted sources.
- Name courses with prefix in CAPITAL LETTERS (e.g., CSE, INFO), course number (e.g., 101, 490), and course title.
- If you cannot fetch a URL, explicitly state that you cannot.
</output_constraints>

<task_instructions>
<step_1_identify_major>
Examine the student_data below to identify the student's major. For the major, only analyze courses between the headings 'DEPARTMENTAL REQUIREMENTS' or 'ADMISSIONS REQUIREMENTS' through to 'OTHER COURSES'. Exclude any courses in the 'OTHER COURSES' section.
</step_1_identify_major>

<step_2_identify_minor>
For the Data Science Minor, analyze all courses listed in: 'Data Studies (Group A)', 'Data Skills (Group B)', and 'Additional credits from list A, B or C, or Synthesis courses'.
</step_2_identify_minor>

<step_3_exclude>
Always omit 'CSSS 490 DATA SCI COMMUN SEM' from your review.
</step_3_exclude>

<step_4_overlap_analysis>
Determine if the student has more than ten credits of courses in their major that also count toward their Data Science Minor in the sections: 'Data Studies (Group A)', 'Data Skills (Group B)', and 'Additional credits from list A, B or C, or Synthesis courses'.

Compare classes that appear in BOTH:
- Major section: 'DEPARTMENTAL REQUIREMENTS' or 'ADMISSIONS REQUIREMENTS'
- Minor sections listed in step_2_identify_minor
</step_4_overlap_analysis>

<step_5_substitution_logic>
If overlap >= 10 credits:
- Look ONLY in the student's minor record under: 'A different course was used where the following could have applied'
- These courses do not currently count toward the minor but can substitute to resolve overlap
- Confirm substitution courses belong to equivalent minor categories: Data Studies (Group A), Data Skills (Group B), or Cross-cutting/Synthesis
- Verify substitution courses are NOT in the major's 'DEPARTMENTAL REQUIREMENTS' or 'ADMISSIONS REQUIREMENTS' sections
- Cross-reference with https://dataminor.uw.edu/site/assets/data/data.json to confirm category membership
</step_5_substitution_logic>

<step_6_output_format>
Produce a table with exactly these rows and columns:

Rows (one per minor category):
1. 'Data Studies (Group A)'
2. 'Data Skills (Group B)'
3. 'Additional credits from list A, B or C, or Synthesis courses'

Columns:
- 'Course(s) from the Minor audit'
- 'Courses from the Major audit'
- 'Overlap status' → 🟢 if no overlap, 🔴 if overlap exists

If overlap >= 10 credits: After the table, propose specific substitution courses from the 'alternative_courses' list, categorized by minor requirement type.

Conclude with ONE concise paragraph containing:
- The first sentence must start with: 'The total overlap is X credits', where X is the number of credits overlapping between the major and minor. If X <= 10 then end this sentence with ✅, if X >= 10 then end this sentence with ❌
- The second sentence must be a concrete recommendation about which courses to substitute for which minor requirements
- The third sentence must confirm that substitutions avoid the 10-credit overlap
- The fourth sentence must report the classification of each substitution by course category in the Data Science Minor 
- Do not suggest any next steps or ask follow-up questions
</step_6_output_format>
</task_instructions>

<student_data>
${JSON.stringify(audits)}
</student_data>

<self_validation>
Before finalizing your response:
1. Verify each recommended substitution appears on https://dataminor.uw.edu/site/assets/data/data.json
2. Confirm substitution courses are not in the major's restricted sections
3. Ensure overlap calculations use exact credit values from the student_data
4. Cite specific URLs and quote verbatim text when referencing policies
</self_validation>
`.trim();

        /* Prepare the final payload - student data is now cleanly delimited above */
        const finalPayload = {
            meta: {
                extraction_timestamp: new Date().toISOString(),
                script_version: "2.1-structured-prompt",
                source: "UW DARS Bookmarklet"
            },
            student_data: audits
        };

        const compactJson = JSON.stringify(finalPayload);
        
        /* Final output combines structured prompt with payload */
        const finalOutput = `${llmPrompt}\n\n<raw_payload_for_reference>\n${compactJson}\n</raw_payload_for_reference>`;

        /* Write securely to user clipboard */
        await navigator.clipboard.writeText(finalOutput);
        
        document.body.style.cursor = 'default';
        alert(`✅ Extracted student data and copied to clipboard!\n\nNext: Paste directly into your LLM, switch on 'thinking' mode, and hit enter`);

    } catch (err) {
        document.body.style.cursor = 'default';
        console.error('DARS Extractor Error:', err);
        alert('⚠️ An error occurred. Check the browser console (F12) for details.');
    }
})();