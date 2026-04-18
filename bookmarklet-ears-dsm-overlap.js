javascript:(async function() {
    try {
        document.body.style.cursor = 'wait';
        const audits = {};
        const rows = document.querySelectorAll('tr');
        const targetLinks =[];

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

            let foundTargets =[];
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

                audits[roleKey].requirements[foundTargets[i].key] = {
                    description: description,
                    courses: courses
                };
            }
        }

        document.body.removeChild(iframe);

        /* 3. Prepare the final LLM Payload */
        const llmPrompt = "You are a highly skilled and efficient undergraduate student advisor at the University of Washington. You specialize in advising students in the Data Science Minor, and you have memorized the overlap restriction policy on this page:\n\n https://dataminor.uw.edu/curriculum/overlap \n\nYou have also memorised the course list for the Minor here:\n\n https://dataminor.uw.edu/curriculum/upcoming-courses \n\nand you know that each class in the minor is in one of four categories: Data Skills; Data Studies; Cross Cutting: On Ramp; Cross Cutting: Synthesis. You never make anything up. You always quote exact verbatim text from a specific University of Washington websites to support your decisions. Do not paraphrase or infer. You always include clickable links to the websites that you quote from. Do not quote anything unless you fetch it directly from the URLs I have given you. If you cannot fetch it, say so. Your task is to exactly and thoroughly apply that overlap policy to guide this student. You always name courses with the course prefix in capital letters (e.g. CSE, INFO), course number (e.g. 101, 490), and course title. You examine the data below to identify the student's major. For the student's major, you only look at all the courses between the headings section 'DEPARTMENTAL REQUIREMENTS' or 'Admissions Requirements' through to the heading 'OTHER COURSES', do not include any courses in the section 'OTHER COURSES'. For the Data Science Minor, you look at all the courses listed in 'Data Studies (Group A)', Data Skills (Group B)', and 'Additional credits from list A, B or C, or Synthesis courses'. Always omit 'CSSS 490 DATA SCI COMMUN SEM' from your review. You determine if the student has more than ten credits of courses in their major that are also counting towards their Data Science Minor in these sections of their record: 'Data Studies (Group A)', Data Skills (Group B)', and 'Additional credits from list A, B or C, or Synthesis courses'. You examine the classes that appear both in the Major section 'DEPARTMENTAL REQUIREMENTS' or 'Admissions Requirements', and in the student's record for the Data Science Minor. If they do have more than ten credits overlap, you look only in the student's record for the Data Science Minor at the list of courses under the text 'A different course was used where the following could have applied'. These courses do not currently count toward the minor, but we can use them to substitute with other classes to resolve the overlap. Your output is a table. The table has one row each for these: 'Data Studies (Group A)', Data Skills (Group B)', and 'Additional credits from list A, B or C, or Synthesis courses'. The table has one column each for these: 'Course(s) from the Minor audit'; 'Courses from the Major audit'; 'Overlap status'. In the 'Overlap status' column you put a green circle emoji if there is no overlap, and a red circle emoji if there is overlap between the Major and Minor. If there are 10 credits or more of overlap, you propose one or more courses, only from the list 'A different course was used where the following could have applied' on the student's Data Science Minor audit, as substitutions to avoid the 10 credit overlap with the major. You take care to confirm that the data science minor course category is equivalent for the substitutions. You conclude with a brief, concise, single paragraph narrative that contains a specific, concrete recommendation about which courses to substitute for what requirements of the Data Science Minor to avoid the ten credit overlap, if there is one. You classify the substitutions according to the relevant category: 'Data Studies (Group A)', Data Skills (Group B)', and 'Additional credits from list A, B or C, or Synthesis courses'. Confirm that your recommended substitution courses are not in the section 'DEPARTMENTAL REQUIREMENTS' or 'Admissions Requirements', you cannot take courses from those sections. Open this page, \n\n https://dataminor.uw.edu/curriculum/upcoming-courses \n\n view the entire course list for the data science minor, and confirm that your course subsitution recommedations belong to the correct categories of Data Studies (Group A)', Data Skills (Group B)', and 'Cross-cutting, which is the same as 'Additional credits from list A, B or C, or Synthesis courses' \n\nDATA:\n";

        const finalPayload = {
            student_data: audits
        };

        const compactJson = JSON.stringify(finalPayload);
        const finalOutput = llmPrompt + compactJson;

        /* Write securely to user clipboard */
        await navigator.clipboard.writeText(finalOutput);
        
        document.body.style.cursor = 'default';
        alert(`Extracted Student Data + Catalog Table and copied everything to your clipboard!`);

    } catch (err) {
        document.body.style.cursor = 'default';
        console.error('DARS Extractor Error:', err);
        alert('An error occurred. Check the browser console (F12) for details.');
    }
})();