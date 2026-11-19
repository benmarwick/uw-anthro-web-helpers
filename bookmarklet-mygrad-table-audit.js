javascript:(function(){
'use strict';

/* Under Node (the app's tests), export the bridge's origin rule and
   stop before touching the page. */
if(typeof module !== 'undefined' && module.exports){
    module.exports = {bridgeDecision: bridgeDecision};
    return;
}

/* ============================================================
   MYGRAD DEPARTMENT VIEW - TABLE AUDIT
   ------------------------------------------------------------
   Five milestone columns are added to the Current Student List:

     Anthropology MA    an Anthropology MA on record
     Committee          the committee the programme requires: a
                        doctoral committee, or for a master's
                        student a master's committee
     Candidacy Granted  doctoral exam result, with the date
     ANTH 800 Credits   dissertation credits on the transcript,
                        shown against the 27-credit requirement
     Graduated          a completed degree on record

   Plus the pre-existing years-in-program colouring, the
   no-advisor warning, and a 🚩 for master's students with no
   committee of any kind.

   Every cell links to the MyGrad page it was derived from, and
   hovering shows the evidence. Cells are links, so the table can
   be consulted and the source opened side by side.

   WHERE EACH SIGNAL COMES FROM
     MA, Committee   the Kendo data model, already on the page,
                     so they are correct immediately
     Candidacy       the doctoral exam requests page
     ANTH 800        the transcript
     Graduated       the master's requests page, plus the data
                     model as a cross-check

   Only Candidacy and ANTH 800 Credits and Graduated need network
   requests, and they are filled in when you press "Fetch
   milestones", so loading the page causes no traffic. A full pass
   over 19 students is 57 requests and takes a little over a
   minute. Results are held in the tab's session storage, so
   paging and sorting never refetch.

   THREE STATES, NOT TWO
   ✓ yes   – no   ? the request was made and failed
   A ? never means "no". It means the answer is unknown and the
   cell needs a retry. An expired MyGrad session returns HTTP 200
   carrying the sign-in page, so without an explicit check a dead
   session would quietly fill the table with negatives.

   WHY THE COLUMNS ARE INJECTED CELLS
   This grid's Kendo build has no column API: insertColumn is
   undefined on the instance and on kendo.ui.Grid.prototype, and
   pushing onto options.columns then calling refresh() adds
   nothing. So one header cell and one cell per row are appended
   and rebuilt on every dataBound.

   WHY THE REQUESTS PAGE IS FETCHED ONE AT A TIME
   The classic ASP app keeps the student being viewed in server
   session state, and threshold.aspx sets it before redirecting.
   Overlapping requests overwrite each other and the browser is
   handed a different student's page under the right URL. Measured
   here, 9 of 19 pages named the wrong student at concurrency 4.
   The transcript and master's pages take the student straight
   from the query string and were stable at concurrency 4, so they
   are fetched in parallel. Every page is additionally checked
   against the student it was asked for, which turns a silently
   wrong answer into a visible failure.

   No AI is used. Nothing leaves the browser unless you press "Send
   to the app" (when the graduate review app opened this tab) or
   download a CSV. The app bridge below sends only to the app tab
   that opened this tab, from the exact Apps Script origin you
   approved, after it asked for the data. It sends no grades for
   course feedback.
   ============================================================ */

const url = new URLSearchParams(location.search);
const ORG = url.get('orgid') || '14';

const DET = 'https://webappssecure.grad.uw.edu/mgp-dept.stu.detail';
const REQ = 'https://webappssecure.grad.uw.edu/mgp-dept/stu';

const CACHE_KEY = 'uw-milestones-v2';   /* bump to invalidate */
const CONCURRENCY = 4;
const DISSERTATION_CREDITS = 27;        /* ANTH 800 requirement */

/* A cross is the complement of the check, so "no" reads as a
   definite answer rather than as absent information. "?" remains the
   unknown state, and "…" the not-yet-fetched one. */
const YES = '✓', NO = '✗', FAILED = '?', PENDING = '…';

const CLS = { [YES]:'uwy', [NO]:'uwn', [FAILED]:'uwf', [PENDING]:'uwp' };
const TIP = { [YES]:'yes', [NO]:'no', [FAILED]:'fetch failed', [PENDING]:'not fetched yet' };

/* ---------- source pages, used for the cell links ---------- */

const mastersUrl    = id => `${REQ}/stu-detail-masters-sum.asp?id=${id}`;
const requestsUrl   = id => `${REQ}/request/threshold.aspx?id=${id}&ORG=${ORG}` +
                                   `&REDIRECT=../list_student_requests.aspx?id=${id}`;
const transcriptUrl = id => `${DET}/home/transcript?id=${id}`;
const committeeUrl  = id => `${DET}/committee/index?id=${id}`;
const detailUrl     = id => `${DET}/home/studentdetail?id=${id}`;

/* ---------- helpers ---------- */

const $id = s => document.getElementById(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function grid(){
    return (window.$ && $('#grid').length) ? $('#grid').data('kendoGrid') : null;
}
function gridReady(){
    for(let i = 0; i < 40; i++){
        const g = grid();
        if(g && g.dataSource && g.dataSource.data().length) return g;
        if(i) sleep(250);
    }
    return grid();
}
function norm(s){
    return (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}
function esc(s){
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if(location.pathname.indexOf('/mgp-dept.stu.detail/home/studentlist') === -1){
    alert('This bookmarklet only works on the Current Student List page.');
    return;
}

/* ============================================================
   SIGNAL RULES
   ------------------------------------------------------------
   All matching runs over whitespace-collapsed text, never over
   raw HTML. On the transcript "ANTH 800" occupies two separate
   table cells, so the literal does not occur in the markup and
   only appears once the text is normalised.

   ma       grid field UWDegrees, matching
            "MASTER OF ARTS (ANTHROPOLOGY" and its track variants
            such as "(ANTHROPOLOGY: BIOLOGICAL)". Deliberately
            rejects "MASTER OF ARTS (MUSEOLOGY)". UWDegrees lists
            UW degrees only; an MA earned elsewhere sits in
            PrevInst and is not counted.
   comm     grid field HasDocComm, except for a student in a
            master's programme, where HasMastersComm is used
            instead, so the column reports the committee their
            programme actually requires. The committee page is not
            used: its member table is absent from the served HTML,
            and "Doctoral Supervisory Committee" also occurs in
            the Add Committee dialog, so matching that page
            produces false positives. Verified against a rendered
            page both ways.
   cand     the literal "Candidacy Granted" in the requests page
            result cell, with the exam date from the adjacent
            date cell. Not derivable from the grid:
            FinalExamRequests is null for 4 of the 6 students here
            who have Candidacy Granted.
   credits  sum of the Credits cell over every ANTH 800 row of the
            transcript. Grades seen are 4.0, 3.0, CR and X; all
            credits are counted, per "any ANTH 800 counts".
   grad     depends on the degree level, because MyGrad records
            the two differently. For a master's student, the
            literal "Degree Granted" in the status column of the
            master's requests page. For a doctoral or pre-doctoral
            student, the literal "Dept Conveyed Exam Passed" in
            the status column of the doctoral exam requests page,
            which is what the department records once the final
            defence has been passed and conveyed.
   ============================================================ */

const RE_MA_ANTH     = /MASTER OF ARTS \(ANTHROPOLOGY/i;
const RE_CANDIDACY   = /Candidacy\s+Granted/i;
const RE_ANTH800_CRS = /ANTH[\s ]*800/i;
const RE_DEG_GRANTED = /Degree Granted/i;

/* "Dept Conveyed Exam Passed" arrives as a single status cell, so
   both halves are required; a stray mention of either word
   elsewhere on the page cannot set the flag. */
function isFinalPassed(status){
    return /Dept\s+Conveyed/i.test(status) && /Exam\s+Passed/i.test(status);
}

/* ---------- page fetch with a student-identity check ---------- */

const RE_LOGIN = /UW NetID sign-in|Stale Request/i;

async function pageText(u){
    const res = await fetch(u, {credentials:'same-origin'});
    const html = await res.text();
    if(RE_LOGIN.test(html)) return {login:true, status:res.status, text:''};
    if(!res.ok) return {login:false, status:res.status, text:'', error:'HTTP ' + res.status};
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const clone = doc.body.cloneNode(true);
    clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
    return {login:false, status:res.status, text:norm(clone.textContent), error:null, doc};
}

function nameParts(gridName){
    const n = norm(gridName);
    const i = n.indexOf(',');
    if(i < 0) return {last:n, first:n};
    return {last:n.slice(0, i).trim(), first:n.slice(i + 1).trim().split(/\s+/)[0]};
}

function nameMatches(page, gridName){
    if(!page) return false;
    const p = page.toLowerCase();
    const n = nameParts(gridName);
    return p.indexOf(n.last.toLowerCase()) !== -1 &&
           p.indexOf(n.first.toLowerCase()) !== -1;
}

/* Verifies by matching the name in the page heading. Pages that
   legitimately show no student name are accepted only when they
   also carry their own explicit "nothing here" wording, so a
   blank heading can never pass as a match. */
async function fetchVerified(url, nameRe, gridName, opts){
    opts = opts || {};
    const allowBlankWith = opts.allowBlankWith;
    let last = null;
    for(let t = 0; t < (opts.tries || 3); t++){
        const r = await pageText(url);
        if(r.login) return {login:true};
        last = r;
        if(!r.error){
            const m = r.text.match(nameRe);
            const page = m ? m[1] : '';
            const blankOk = !norm(page) && allowBlankWith && allowBlankWith.test(r.text);
            if(nameMatches(page, gridName) || blankOk) return r;
        }
        if(t + 1 < (opts.tries || 3)) await sleep(400);
    }
    return {error: last && last.error
        ? last.error
        : 'page did not belong to the requested student'};
}

/* ============================================================
   SIGNALS FROM THE DATA MODEL (no network)
   ============================================================ */

function fromModel(d){
    const degLevel = norm(d.DegLevel);
    const uwDeg = d.UWDegrees || '';
    const isMasters = degLevel === "Master's";

    /* The committee column reports the committee type the student's
       programme actually calls for, not always the doctoral one. A
       master's student is shown their master's committee; everyone
       else, including pre-doctoral students, is shown their
       doctoral committee. A pre-doctoral student holding only a
       leftover master's committee correctly reads as having no
       committee yet. */
    const commField = isMasters ? 'HasMastersComm' : 'HasDocComm';
    const commLabel = isMasters ? "Master's committee" : 'Doctoral supervisory committee';
    const commRaw = d[commField];

    const anyComm = d.HasDocComm === 'Yes' || d.HasMastersComm === 'Yes';

    /* A master's student with no committee of any kind. */
    const mastersNoComm = isMasters && !anyComm;

    const hasAnthMA = RE_MA_ANTH.test(uwDeg);

    return {
        ma: hasAnthMA ? YES : NO,
        maTip: hasAnthMA
            ? 'Anthropology MA on record:\n' + norm(uwDeg.replace(/<BR\s*\/?>/gi, '\n'))
            : (norm(uwDeg)
                ? 'No Anthropology MA. Degrees on record:\n' + norm(uwDeg.replace(/<BR\s*\/?>/gi, '\n'))
                : 'No UW degrees on record'),
        comm: commRaw == null ? FAILED : (norm(commRaw) === 'Yes' ? YES : NO),
        commTip: commLabel + ' on record: ' +
                 (commRaw == null ? 'not reported' : norm(commRaw)),
        degLevel: degLevel,
        isMasters: isMasters,
        mastersNoComm: mastersNoComm
    };
}

/* ============================================================
   SIGNALS FROM PAGES
   ============================================================ */

const RE_MASTERS_NAME = /Master's Requests for\s*(.{0,50}?)\s*(?:Registration Waiver|There are no)/;
const RE_NO_MASTERS   = /no master's requests for this student/i;
const RE_REQ_NAME     = /Doctoral Exam Requests:\s*([^|]{1,60}?)\s*\|/;
const RE_NO_REQUESTS  = /no current requests/i;
const RE_TR_NAME      = /Transcripts for\s*(.+?)\s+Last Enrolled/i;

async function mastersSignal(d){
    const r = await fetchVerified(mastersUrl(d.SystemKey), RE_MASTERS_NAME, d.StudentName,
                                  {tries:3, allowBlankWith:RE_NO_MASTERS});
    if(r.login) return {login:true};
    if(r.error) return {grad:FAILED, error:r.error};

    const granted = RE_DEG_GRANTED.test(r.text);
    const date = (r.text.match(/Degree Granted\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i) || [])[1] || null;
    const none = RE_NO_MASTERS.test(r.text);
    return {
        grad: granted ? YES : NO,
        gradSource: 'masters',
        gradTip: granted
            ? 'Degree Granted on the master\'s request' + (date ? ' on ' + date : '')
            : (none ? 'No master\'s requests on record' : 'No degree granted on the master\'s request page'),
        gradDate: date
    };
}

async function requestsSignal(d){
    const r = await fetchVerified(requestsUrl(d.SystemKey), RE_REQ_NAME, d.StudentName, {tries:4});
    if(r.login) return {login:true};
    if(r.error) return {candidacy:FAILED, error:r.error};

    /* The declared headers do not line up with the body cells. The
       rows actually read:
         0 action ("View Info")   1 status   2 name
         3 exam date and time     4 degree   5 date submitted
         6 petition               7 enroll status

       Only the row's own direct td children are read. A descendant
       query also collects cells from any nested table, which shifts
       every index and can pull a stray column label into the status
       position, where it would be mistaken for a value. */
    let cand = NO, candDate = null, candTip;
    let finalPassed = NO, finalDate = null;
    const candRows = [];
    if(r.doc){
        Array.prototype.slice.call(r.doc.querySelectorAll('table')).forEach(t => {
            const head = Array.prototype.slice.call(t.children)
                .flatMap(sec => Array.prototype.slice.call(sec.querySelectorAll('th')))
                .map(x => norm(x.textContent)).join('|');
            if(head.indexOf('Exam Date') === -1) return;
            Array.prototype.slice.call(t.querySelectorAll('tr')).forEach(tr => {
                const cells = Array.prototype.slice.call(tr.children)
                    .filter(c => c.tagName === 'TD')
                    .map(td => norm(td.textContent));
                if(cells.length < 4) return;
                if(RE_CANDIDACY.test(cells[1])) candRows.push(cells);
                if(isFinalPassed(cells[1])) { finalPassed = YES; finalDate = cells[3]; }
            });
        });
        if(candRows.length){
            /* most recent grant wins */
            candRows.sort((a, b) => parseDate(b[3]) - parseDate(a[3]));
            cand = YES;
            candDate = candRows[0][3];
            candTip = 'Candidacy granted' + (candDate ? ' at the exam of ' + candDate : '') +
                      (candRows.length > 1 ? ' (' + candRows.length + ' granted exams on file)' : '');
        }
    }
    if(!candRows.length){
        candTip = RE_NO_REQUESTS.test(r.text)
            ? 'No current requests: general exam not yet taken'
            : 'Requests on file, but no Candidacy Granted result';
    }

    return {
        candidacy: cand,
        candDate: candDate,
        candTip: candTip,
        grad: finalPassed,
        gradSource: 'requests',
        gradDate: finalDate,
        gradTip: finalPassed
            ? 'Final defence passed and conveyed' + (finalDate ? ', exam of ' + finalDate : '')
            : 'No "Dept Conveyed / Exam Passed" on the doctoral exam requests page'
    };
}

function parseDate(s){
    const m = (s || '').match(/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/);
    return m ? new Date(+m[3], +m[1] - 1, +m[2]).getTime() : 0;
}

async function transcriptSignal(d){
    const r = await fetchVerified(transcriptUrl(d.SystemKey), RE_TR_NAME, d.StudentName, {tries:3});
    if(r.login) return {login:true};
    if(r.error) return {credits:null, error:r.error};

    const rows = [];
    Array.prototype.slice.call(r.doc.querySelectorAll('table')).forEach(t => {
        const head = Array.prototype.slice.call(t.querySelectorAll('thead th'))
            .map(x => norm(x.textContent)).join('|');
        if(head.indexOf('Course Title') === -1) return;
        Array.prototype.slice.call(t.querySelectorAll('tbody tr')).forEach(tr => {
            const c = Array.prototype.slice.call(tr.children)
                .filter(x => x.tagName === 'TD')
                .map(td => norm(td.textContent));
            if(c.length >= 4 && RE_ANTH800_CRS.test(c[0])) rows.push(c);
        });
    });

    const credits = rows.reduce((sum, c) => {
        const v = parseFloat(c[2]);
        return isNaN(v) ? sum : sum + v;
    }, 0);
    const grades = Array.from(new Set(rows.map(c => c[3])));

    return {
        credits: credits,
        nRows: rows.length,
        grades: grades,
        creditsTip: rows.length
            ? credits + ' credits across ' + rows.length + ' ANTH 800 entr' +
              (rows.length === 1 ? 'y' : 'ies') +
              ' (grades: ' + grades.join(', ') + '). Requirement is ' +
              DISSERTATION_CREDITS + ' credits.'
            : 'No ANTH 800 on the transcript'
    };
}

/* ============================================================
   STATE + CACHE
   ============================================================ */

let results = {};
let fetching = false;
let cancelled = false;

function loadCache(){
    try{
        const raw = sessionStorage.getItem(CACHE_KEY);
        if(raw) results = JSON.parse(raw) || {};
    }catch(e){ results = {}; }
}
function saveCache(){
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(results)); }catch(e){}
}

/* ============================================================
   FETCH LOOP
   ============================================================ */

async function pool(items, n, fn){
    const out = new Array(items.length);
    let i = 0;
    await Promise.all(Array.from({length:n}, async () => {
        while(i < items.length){
            if(cancelled) return;
            const k = i++;
            out[k] = await fn(items[k]);
        }
    }));
    return out;
}

async function fetchAll(g, force){
    if(fetching) return;
    const data = Array.prototype.slice.call(g.dataSource.data());
    const todo = data.filter(d => force || !results[d.SystemKey]);
    if(todo.length === 0){
        setProgress('All students already fetched');
        return;
    }

    fetching = true;
    cancelled = false;

    const record = (id, patch) => {
        results[id] = Object.assign({}, results[id], patch);
    };
    const step = label => done => {
        setProgress(label + ' ' + done + ' / ' + todo.length);
        /* A rendering fault must not abort the run. */
        try{ formatRows(); }catch(e){ console.warn('[uw-audit] render failed', e); }
        saveCache();
    };

    /* Phase 1: transcripts, in parallel. This app takes the student
       from the query string and was stable at concurrency 4. */
    let done = 0;
    await pool(todo, CONCURRENCY, async d => {
        const id = d.SystemKey;
        try{
            const tr = await transcriptSignal(d);
            if(tr.login){ cancelled = true; record(id, {credits:null, error:'session expired'}); }
            else record(id, tr.error ? {credits:null, error:tr.error} : tr);
        }catch(e){
            record(id, {credits:null, error:e.message});
        }
        done++;
        step('Transcripts')(done);
    });

    /* Phase 1b: master's requests, only for students actually in a
       master's programme. Everyone else's graduation comes from the
       doctoral exam requests page in phase 2. */
    const mastersTodo = cancelled ? [] : todo.filter(d => fromModel(d).isMasters);
    if(mastersTodo.length){
        done = 0;
        await pool(mastersTodo, CONCURRENCY, async d => {
            const id = d.SystemKey;
            try{
                const ms = await mastersSignal(d);
                if(ms.login){ cancelled = true; record(id, {grad:FAILED, error:'session expired'}); }
                else record(id, ms.error ? {grad:FAILED, error:ms.error} : ms);
            }catch(e){
                record(id, {grad:FAILED, error:e.message});
            }
            done++;
            step('Master\'s')(done);
        });
    }

    /* Phase 2: requests, one student at a time. See the header. */
    if(!cancelled){
        done = 0;
        for(const d of todo){
            const id = d.SystemKey;
            try{
                const r = await requestsSignal(d);
                if(r.login){ cancelled = true; record(id, {candidacy:FAILED, error:'session expired'}); }
                else record(id, r.error ? {candidacy:FAILED, error:r.error} : r);
            }catch(e){
                record(id, {candidacy:FAILED, error:e.message});
            }
            done++;
            step('Requests')(done);
            await sleep(60);
        }
    }

    fetching = false;
    formatRows();
    saveCache();

    if(cancelled){
        setProgress('Stopped: a page returned the NetID sign-in screen. Sign in again and re-run.');
    }else{
        const failed = data.filter(d => results[d.SystemKey] && results[d.SystemKey].error).length;
        setProgress(failed ? 'Done. ' + failed + ' student(s) failed — press Refresh to retry.' : 'Done.');
    }
}

/* ============================================================
   COLUMN DEFINITIONS
   ============================================================ */

/* Links take the whole data item, not just the id, because a
   column can be sourced from different pages for different degree
   levels. Graduated is read from the master's requests page for a
   master's student and from the doctoral exam requests page for
   everyone else, so its link has to follow the same split. Pointing
   every row at one page would send a PhD student to the master's
   page, which does not carry the value shown. */
const COLS = [
    {key:'ma',   label:'Anthropology MA',  width:104, link:d => mastersUrl(d.SystemKey)},
    {key:'comm', label:'Committee',        width:96,  link:d => committeeUrl(d.SystemKey)},
    {key:'cand', label:'Candidacy Granted',width:112, link:d => requestsUrl(d.SystemKey)},
    {key:'cred', label:'ANTH 800 Credits', width:112, link:d => transcriptUrl(d.SystemKey)},
    {key:'grad', label:'Graduated',        width:96,
     link:d => fromModel(d).isMasters ? mastersUrl(d.SystemKey) : requestsUrl(d.SystemKey)}
];

/* ============================================================
   INJECTED COLUMNS
   ============================================================ */

/* Base columns hidden to make room for the milestone columns. They
   are hidden with the grid's own hideColumn rather than deleted, so
   the page's own behaviour and column state are left intact. */
const HIDE_COLUMNS = ['StudentNbr', 'EmailUCS', 'CurrentCredits'];

function hideBaseColumns(g){
    HIDE_COLUMNS.forEach(f => {
        if(g.columns.some(c => c.field === f && !c.hidden)) g.hideColumn(f);
    });
}

/* The milestone columns sit immediately after Name, on the left, so
   they are in view without scrolling and the identifying columns
   stay first. Inserting shifts Kendo's internal cell indices, which
   is why the cells are added from inside the dataBound handler and
   rebuilt on every render. */
function addHeader(){
    const ths = document.querySelectorAll('#grid thead th');
    if(!ths.length) return;
    const first = ths[0];
    const parent = first.parentNode;
    if(!parent) return;
    for(const e of document.querySelectorAll('#grid .uw-milestone-th')) e.remove();

    let anchor = first;
    COLS.forEach(c => {
        const th = document.createElement('th');
        th.className = 'uw-milestone-th';
        th.style.width = c.width + 'px';
        th.style.minWidth = c.width + 'px';
        th.innerHTML = '<span class="uw-flag-label">' + esc(c.label) + '</span>';
        anchor.after(th);
        anchor = th;
    });
}

function glyphCell(d, m, model, k){
    /* MA and Committee are always known: they come from the data
       model, so they never wait on a fetch. */
    let v, tip;
    if(k === 'ma')        { v = model.ma;   tip = model.maTip; }
    else if(k === 'comm') { v = model.comm; tip = model.commTip; }
    else if(k === 'cand') { v = m ? m.candidacy : PENDING; tip = m && (m.candTip || m.error) || 'Not fetched yet'; }
    else {
        v = m ? m.grad : PENDING;
        tip = m && (m.gradTip || m.error) || 'Not fetched yet';
    }
    const link = COLS.find(c => c.key === k).link(d);
    return '<a class="uw-flag ' + (CLS[v] || 'uwp') + '" href="' + esc(link) +
           '" target="_blank" rel="noopener" title="' + esc(tip) + '">' + v + '</a>';
}

function creditsCell(d, m){
    const link = COLS[3].link(d);
    if(!m || m.credits == null){
        const g = m && m.error ? FAILED : PENDING;
        return '<a class="uw-flag ' + (CLS[g] || 'uwp') + '" href="' + esc(link) +
               '" target="_blank" rel="noopener" title="' +
               esc(m && m.error ? m.error : 'Not fetched yet') + '">' + g + '</a>';
    }
    const done = m.credits >= DISSERTATION_CREDITS;
    const some = m.credits > 0;
    const cls = done ? 'uwcd' : (some ? 'uwcs' : 'uwc0');
    return '<a class="uw-credits ' + cls + '" href="' + esc(link) +
           '" target="_blank" rel="noopener" title="' + esc(m.creditsTip) + '">' +
           m.credits + '<span class="uw-of"> / ' + DISSERTATION_CREDITS + '</span></a>';
}

/* One body cell per column, inserted after the name cell so the
   body cell count and order match the header. */
function addCells(row, d){
    row.find('td.uw-milestone-td').remove();
    const model = fromModel(d);
    const m = results[d.SystemKey];

    const first = row.find('td').get(0);
    if(!first) return;
    let anchor = first;
    COLS.forEach(c => {
        const td = document.createElement('td');
        td.className = 'uw-milestone-td';
        td.style.width = c.width + 'px';
        td.style.minWidth = c.width + 'px';
        td.innerHTML = c.key === 'cred'
            ? creditsCell(d, m)
            : glyphCell(d, m, model, c.key);
        anchor.after(td);
        anchor = td;
    });
}

/* ============================================================
   ROW FORMATTING
   ============================================================ */

const currentYear = new Date().getFullYear();

function yearsAgo(d){
    const y = d.GradAdmitYr ? parseInt(d.GradAdmitYr, 10) : NaN;
    return isNaN(y) ? null : currentYear - y;
}
function hasNoAdvisor(d){
    const a = d.AdvisorChair;
    return a == null || norm(String(a)).length === 0;
}

/* Stable reference, so grid.unbind can actually detach it. */
function formatRows(){
    const g = grid();
    if(!g) return;
    const filter = localStorage.getItem('uw-filter') || 'all';

    addHeader();

    g.tbody.find('tr').each(function(){
        const row = $(this);
        const d = g.dataItem(row);
        if(!d) return;

        row.removeClass('ten-year-red');
        row.show();
        row.find('.uw-extra, .no-advisor-warn, .ten-year-warn, .ma-no-comm-warn').remove();

        const yrs = yearsAgo(d);
        const noAdv = hasNoAdvisor(d);
        const model = fromModel(d);
        const m = results[d.SystemKey];
        const cand = m ? m.candidacy : PENDING;
        const cred = m ? m.credits : null;
        const grad = m ? m.grad : PENDING;

        if(filter === '6'  && (yrs === null || yrs < 6))  { row.hide(); return; }
        if(filter === '8'  && (yrs === null || yrs < 8))  { row.hide(); return; }
        if(filter === '10' && (yrs === null || yrs < 10)) { row.hide(); return; }
        if(filter === 'noadv'  && !noAdv)                  { row.hide(); return; }
        if(filter === 'noma'   && model.ma === YES)        { row.hide(); return; }
        if(filter === 'nocomm' && model.comm === YES)      { row.hide(); return; }
        if(filter === 'nocand' && cand === YES)            { row.hide(); return; }
        if(filter === 'nocred' && cred != null && cred >= DISSERTATION_CREDITS) { row.hide(); return; }
        if(filter === 'nograd' && grad === YES)            { row.hide(); return; }
        if(filter === 'macomm' && !model.mastersNoComm)    { row.hide(); return; }

        let bg = '';
        let isTen = false;
        if(yrs !== null){
            if(yrs <= 5)      bg = 'rgba(40,167,69,0.2)';
            else if(yrs <= 7) bg = 'rgba(255,193,7,0.2)';
            else if(yrs <= 9) bg = 'rgba(220,53,69,0.2)';
            else { bg = '#FF0000'; isTen = true; }
        }
        row.css('background-color', bg || '');
        if(isTen) row.addClass('ten-year-red');

        const nameCell = row.find('td').eq(0);
        if(yrs !== null){
            nameCell.append('<span class="uw-extra" title="Years in program: ' + yrs + '"> (' + yrs + 'y)</span>');
        }
        if(noAdv){
            nameCell.append('<span class="no-advisor-warn" title="No advisor assigned"> ⚠️</span>');
        }
        if(model.mastersNoComm){
            nameCell.append('<span class="ma-no-comm-warn" title="Master\'s student with no committee on record"> 🚩</span>');
        }
        if(yrs !== null && yrs >= 8 && noAdv){
            nameCell.append('<span class="ten-year-warn" title="≥8 years AND no advisor"> 🚨🚨</span>');
        }else if(yrs !== null && yrs >= 10){
            nameCell.append('<span class="ten-year-warn" title="≥10 years"> 🚨</span>');
        }

        addCells(row, d);
    });

    updateCounts(g);
}

/* ============================================================
   CONTROL PANEL
   ============================================================ */

const FILTERS = [
    {f:'all',    label:'All'},
    {f:'6',      label:'≥ 6 years'},
    {f:'8',      label:'≥ 8 years'},
    {f:'10',     label:'≥ 10 years'},
    {f:'noadv',  label:'No advisor'},
    {f:'noma',   label:'No Anthropology MA'},
    {f:'nocomm', label:'No committee'},
    {f:'nocand', label:'No candidacy yet'},
    {f:'nocred', label:'ANTH 800 under ' + DISSERTATION_CREDITS},
    {f:'nograd', label:'Not graduated'},
    {f:'macomm', label:"MA, no committee 🚩"}
];

function injectStyle(){
    if($id('uw-audit-style')) return;
    const style = document.createElement('style');
    style.id = 'uw-audit-style';
    style.textContent = `
      tr.ten-year-red, tr.ten-year-red * {
        color:#FFFFFF !important;
        -webkit-text-fill-color:#FFFFFF !important;
      }
      #uw-controls {
        position:fixed; top:45px; right:20px; z-index:9999;
        background:#4b2e83; color:#ffffff; border:2px solid #2c1b4f;
        border-radius:8px; padding:7px 9px; font-family:sans-serif;
        max-width:min(62vw, 860px); box-shadow:0 4px 10px rgba(0,0,0,0.4);
        display:flex; flex-wrap:wrap; gap:5px; align-items:center;
      }
      #uw-controls.collapsed { flex-wrap:nowrap; }
      #uw-controls.collapsed .uw-body { display:none; }
      #uw-controls .title {
        font-weight:bold; font-size:12px; white-space:nowrap;
        cursor:pointer; user-select:none; padding:0 2px;
      }
      #uw-controls .hint { font-size:10px; opacity:0.75; font-weight:normal; }
      #uw-controls .sep {
        border-left:1px solid rgba(255,255,255,0.35);
        margin:0 3px; align-self:stretch;
      }
      #uw-controls button {
        margin:0; padding:4px 7px; border:1px solid transparent;
        border-radius:4px; background:#ffffff; color:#4b2e83;
        font-weight:bold; cursor:pointer; font-size:11px;
        transition:all 0.15s ease; white-space:nowrap;
      }
      #uw-controls button:hover { background:#e6e0f5; }
      #uw-controls button.active {
        background:#2c1b4f; color:#ffffff; border:1px solid #b7a5df;
        box-shadow:inset 0 2px 4px rgba(0,0,0,0.3);
      }
      #uw-controls .progress {
        font-size:11px; white-space:nowrap; line-height:1.3;
        min-height:14px; margin:0; padding:0 2px;
        background:transparent; color:#ffffff;
      }

      /* The injected columns. Each cell is a link to the page it
         came from. Glyphs and the number carry the meaning, colour
         only reinforces it. */
      .uw-milestone-th, .uw-milestone-td {
        text-align:center; white-space:nowrap;
        background-color:rgba(75,46,131,0.06);
        border-left:1px solid rgba(75,46,131,0.35);
        /* The table uses auto layout, so without padding the long
           header labels run straight into one another. */
        padding-left:7px; padding-right:7px;
      }
      .uw-milestone-th { font-size:10px; color:#4b2e83; vertical-align:middle; }
      .uw-milestone-td { padding-top:2px; padding-bottom:2px; }
      .uw-flag {
        display:block; text-align:center;
        font-weight:bold; font-size:15px; line-height:1.4; cursor:help;
      }
      .uw-flag.uwy { color:#1a7f37; }
      .uw-flag.uwn { color:#6a737d; }
      .uw-flag.uwf { color:#b26a00; }
      .uw-flag.uwp { color:#959da5; }
      tr.ten-year-red .uw-flag.uwy { color:#b7f5c9; }
      tr.ten-year-red .uw-flag.uwn { color:#e6e6e6; }
      tr.ten-year-red .uw-flag.uwf { color:#ffd8a8; }
      tr.ten-year-red .uw-flag.uwp { color:#d0d7de; }
      .uw-credits { font-weight:bold; font-size:14px; cursor:help; }
      .uw-credits .uw-of { font-weight:normal; font-size:10px; opacity:0.75; }
      .uw-credits.uwcd { color:#1a7f37; }
      .uw-credits.uwcs { color:#b26a00; }
      .uw-credits.uwc0 { color:#959da5; }
      tr.ten-year-red .uw-credits.uwcd { color:#b7f5c9; }
      tr.ten-year-red .uw-credits.uwcs { color:#ffd8a8; }
      tr.ten-year-red .uw-credits.uwc0 { color:#d0d7de; }
      .ma-no-comm-warn { cursor:help; }
    `;
    document.head.appendChild(style);
}

function buildPanel(){
    if($id('uw-controls')) return;
    const panel = document.createElement('div');
    panel.id = 'uw-controls';
    panel.innerHTML =
        '<div class="title" id="uw-toggle">Audit <span class="hint">click to collapse</span></div>' +
        '<div class="uw-body">' +
          '<div class="title">Filter</div>' +
          FILTERS.map(x => '<button data-filter="' + x.f + '" data-label="' + esc(x.label) + '">' + esc(x.label) + '</button>').join('') +
          '<div class="sep"></div>' +
          '<div class="title">Milestones</div>' +
          '<button id="uw-fetch">Fetch milestones</button>' +
          '<div class="progress" id="uw-progress"></div>' +
        '</div>';

    document.body.appendChild(panel);

    panel.querySelectorAll('button[data-filter]').forEach(btn => {
        btn.onclick = () => {
            localStorage.setItem('uw-filter', btn.dataset.filter);
            formatRows();
        };
    });

    $id('uw-toggle').onclick = () => {
        const now = panel.classList.toggle('collapsed');
        $('#uw-toggle .hint').textContent = now ? 'click to expand' : 'click to collapse';
    };

    $id('uw-fetch').onclick = () => {
        const g = grid();
        if(g) fetchAll(g, true);
    };
}

function setProgress(text){
    const p = $id('uw-progress');
    if(p) p.textContent = text;
}

function updateCounts(g){
    const data = Array.prototype.slice.call(g.dataSource.data());
    const c = {all:data.length, 6:0, 8:0, 10:0, noadv:0, noma:0, nocomm:0, nocand:0, nocred:0, nograd:0, macomm:0};

    data.forEach(d => {
        const yrs = yearsAgo(d);
        if(yrs !== null){
            if(yrs >= 6)  c[6]++;
            if(yrs >= 8)  c[8]++;
            if(yrs >= 10) c[10]++;
        }
        if(hasNoAdvisor(d)) c.noadv++;

        const model = fromModel(d);
        if(model.ma !== YES)   c.noma++;
        if(model.comm !== YES) c.nocomm++;
        if(model.mastersNoComm) c.macomm++;

        const m = results[d.SystemKey];
        if(m){
            if(m.candidacy !== YES) c.nocand++;
            if(m.credits == null || m.credits < DISSERTATION_CREDITS) c.nocred++;
        }
        if(!m || m.grad !== YES) c.nograd++;
    });

    const active = localStorage.getItem('uw-filter') || 'all';
    $id('uw-controls').querySelectorAll('button[data-filter]').forEach(btn => {
        const f = btn.dataset.filter;
        btn.textContent = btn.dataset.label + ' (n = ' + (c[f] || 0) + ')';
        btn.classList.toggle('active', f === active);
    });
}


/* ============================================================
   APP BRIDGE (course-feedback plan §4.5, task R1;
   annual review plan §9.3)

   When the graduate review app opens this tab, the bookmarklet
   tells the app it is ready, waits for the app's request, reads
   every student's transcript with the identity check above, and
   sends the result back with postMessage.

   WHO IT ANSWERS (review item 25)
   Every Apps Script web app, anyone's, is served from some
   https://n-<hash>-0lu-script.googleusercontent.com origin, so that
   pattern alone does not identify this app. A request is answered
   only when all of these hold:
     - it comes from the window that opened this tab (window.opener)
     - its origin is an Apps Script origin
     - its origin is exactly the one approved before; the first time
       (or if the origin ever changes), you are asked to confirm the
       exact origin, and an approval is remembered in this browser's
       storage for the MyGrad site under APPROVED_ORIGIN_KEY
   The <hash> is not known before the app is deployed, so it is not
   written into this file. A secret in the URL would not help: this
   file is public, and a page that opens MyGrad can choose its own.
   To forget an approval, run in the MyGrad tab's console:
     localStorage.removeItem('uw-review-app-origin')

   Two requests:
     registrations: the target quarter's courses for every student.
       No grades are sent; a withdrawal (W, W3...) is sent as
       withdrawn:true so the import can drop it.
     prefill: Current Student List fields, candidacy and ANTH 800
       credits, and the year's courses with titles and grades for
       the annual review's coursework field.
   Without an opener tab, the same data can be downloaded as CSV.
   ============================================================ */

const APPROVED_ORIGIN_KEY = 'uw-review-app-origin';

/* Decides what to do with a request: 'allow', 'ask' (show the origin
   and let the user confirm) or 'reject'. A function declaration, so
   the Node export at the top of the file can reach it. */
function bridgeDecision(origin, source, opener, approved){
    const appsScriptOrigin = /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/;
    if(!opener || source !== opener) return 'reject';
    if(!appsScriptOrigin.test(origin)) return 'reject';
    if(approved && origin === approved) return 'allow';
    return 'ask';
}

function approvedOrigin(){
    try{ return localStorage.getItem(APPROVED_ORIGIN_KEY) || ''; }catch(e){ return ''; }
}
function rememberOrigin(origin){
    try{ localStorage.setItem(APPROVED_ORIGIN_KEY, origin); }catch(e){}
}

/* Shows the exact origin and asks before any student data is sent. */
function confirmOrigin(origin, approved){
    const changed = approved && approved !== origin;
    const intro = changed
        ? 'WARNING: this request comes from a different Apps Script page than the one approved before.\n\n' +
          'Approved before:\n' + approved + '\n\nThis request:\n' + origin + '\n\n' +
          'This is expected only if the graduate review app was moved to a new deployment.'
        : 'An Apps Script page is asking for student transcript data. It is served from:\n\n' + origin;
    return confirm(intro + '\n\n' +
        'Click OK only if you opened this tab with a button on the graduate review app\'s Roster page. ' +
        'OK remembers this address, so you will not be asked again. Cancel sends nothing.');
}

const QUARTER_WORDS = {AUT:'AUTUMN', WIN:'WINTER', SPR:'SPRING', SUM:'SUMMER'};
const RE_QTR_LABEL = /\b(AUTUMN|WINTER|SPRING|SUMMER)\s+(\d{4})\b/;

function quarterCodeFromWords(label){
    const m = norm(label).toUpperCase().match(RE_QTR_LABEL);
    if(!m) return '';
    const code = Object.keys(QUARTER_WORDS).find(k => QUARTER_WORDS[k] === m[1]);
    return code + m[2];
}

/* Every course row on a student's transcript: [{quarter, course, title, grade}]. */
async function transcriptCourses(d){
    const r = await fetchVerified(transcriptUrl(d.SystemKey), RE_TR_NAME, d.StudentName, {tries:3});
    if(r.login) return {login:true};
    if(r.error) return {error:r.error};
    const rows = [];
    Array.prototype.slice.call(r.doc.querySelectorAll('table')).forEach(t => {
        const head = Array.prototype.slice.call(t.querySelectorAll('thead th')).map(x => norm(x.textContent)).join('|');
        if(head.indexOf('Course Title') === -1) return;
        let prev = t.previousElementSibling, quarter = '';
        for(let k = 0; k < 4 && prev && !quarter; k++){
            quarter = quarterCodeFromWords(prev.textContent);
            prev = prev.previousElementSibling;
        }
        Array.prototype.slice.call(t.querySelectorAll('tbody tr')).forEach(tr => {
            const c = Array.prototype.slice.call(tr.children).filter(x => x.tagName === 'TD').map(td => norm(td.textContent));
            if(c.length >= 4) rows.push({quarter, course:c[0], title:c[1], credits:c[2], grade:c[3]});
        });
    });
    return {rows};
}

function splitCourse(cell){
    const t = norm(cell).split(' ');
    if(t.length < 3) return null;
    return {curric:t.slice(0, -2).join(' ').toUpperCase(), number:t[t.length - 2], section:t[t.length - 1]};
}

/* MyGrad's grid writes quarters as AUT, WTR, SPR, SUM, and a missing year as a single digit
   (checked 18 Nov 2026). 'WTR' + '2027' -> 'WIN2027'; anything incomplete -> ''. */
const MYGRAD_QTR = {AUT:'AUT', WTR:'WIN', WIN:'WIN', SPR:'SPR', SUM:'SUM'};
function quarterFromGrid(q, y){
    const code = MYGRAD_QTR[norm(q).toUpperCase()];
    const year = norm(y);
    return code && /^\d{4}$/.test(year) ? code + year : '';
}

function studentFields(d){
    return {
        email: norm(d.EmailUCS).toLowerCase(),
        name: norm(d.StudentName),
        preferredFirst: norm(d.StudentPreferredName).split(/\s+/)[0] || nameParts(d.StudentName).first,
        program: norm(d.DegLevel) === "Master's" ? 'MA' : 'PHD',
        entryQuarter: quarterFromGrid(d.GradAdmitQtr, d.GradAdmitYr),
        gpa: d.GPA == null ? '' : String(d.GPA),
        leaveEnds: quarterFromGrid(d.LeaveEndsQtr, d.LeaveEndsYr),
        hasAdvisor: norm(d.HasAdvisor), hasDocComm: norm(d.HasDocComm), hasMastersComm: norm(d.HasMastersComm),
        hasReadingComm: norm(d.HasReadingComm), uwDegrees: norm(String(d.UWDegrees || '').replace(/<BR\s*\/?>/gi, '; '))
    };
}

/* Builds the data the app asked for. */
async function collectForApp(config, onProgress){
    const g = grid();
    const data = Array.prototype.slice.call(g.dataSource.data());
    const out = {type:'mygrad-data', mode:config.mode, quarter:config.quarter || '', students:[], registrations:[], failures:[]};
    let done = 0, login = false;
    await pool(data, CONCURRENCY, async d => {
        if(login) return;
        const s = studentFields(d);
        const tr = await transcriptCourses(d);
        if(tr.login){ login = true; return; }
        if(tr.error){ out.failures.push({email:s.email, step:'transcript', error:tr.error}); }
        else if(config.mode === 'registrations'){
            tr.rows.filter(r => r.quarter === config.quarter).forEach(r => {
                const c = splitCourse(r.course);
                if(c) out.registrations.push({quarter:r.quarter, studentEmail:s.email, curric:c.curric, number:c.number,
                                              section:c.section, withdrawn:/^W\d*$/.test(r.grade)});
            });
        } else {
            const want = config.quarters || [];
            s.courses = tr.rows.filter(r => want.indexOf(r.quarter) !== -1)
                .map(r => ({quarter:r.quarter, course:r.course, title:r.title, grade:r.grade}));
            /* Same rule as the ANTH 800 Credits column: every ANTH 800 row's credits count. */
            s.anth800Credits = tr.rows.filter(r => RE_ANTH800_CRS.test(r.course))
                .reduce((sum, r) => sum + (parseFloat(r.credits) || 0), 0);
        }
        out.students.push(s);
        onProgress(++done, data.length);
    });
    if(login) return {login:true};
    if(config.mode === 'prefill'){
        /* The requests page keeps the student in server session state, so it is fetched one at a time. */
        for(const d of data){
            const s = out.students.find(x => x.email === norm(d.EmailUCS).toLowerCase());
            if(!s) continue;
            const rq = await requestsSignal(d);
            if(rq.login) return {login:true};
            if(rq.error){ out.failures.push({email:s.email, step:'requests', error:rq.error}); continue; }
            s.candidacyDate = rq.candidacy === YES ? (rq.candDate || 'yes') : '';
        }
    }
    return out;
}

function csvCell(v){
    const t = String(v == null ? '' : v);
    return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

function downloadCsv(name, header, rows){
    const lines = [header.join(',')].concat(rows.map(r => header.map(h => csvCell(r[h])).join(',')));
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
}

function bridgeStatus(text){
    const p = $id('uw-bridge-status');
    if(p) p.textContent = text;
}

function buildBridgePanel(){
    if($id('uw-bridge')) return;
    const body = document.querySelector('#uw-controls .uw-body');
    if(!body) return;
    const box = document.createElement('div');
    box.id = 'uw-bridge';
    box.innerHTML = '<div class="sep"></div><div class="title">Graduate review app</div>' +
        (window.opener
            ? '<div class="progress" id="uw-bridge-status">Waiting for the app\'s request…</div>'
            : '<button id="uw-csv-reg">Download registrations CSV</button><button id="uw-csv-pre">Download prefill CSV</button>' +
              '<div class="progress" id="uw-bridge-status"></div>');
    body.appendChild(box);
    if(!window.opener){
        $id('uw-csv-reg').onclick = async () => {
            const q = (prompt('Quarter to export (for example AUT2026):') || '').trim().toUpperCase();
            if(!/^(AUT|WIN|SPR|SUM)\d{4}$/.test(q)) return;
            const res = await collectForApp({mode:'registrations', quarter:q}, (n, t) => bridgeStatus('Transcripts ' + n + ' / ' + t));
            if(res.login){ bridgeStatus('Your MyGrad session has expired. Sign in again.'); return; }
            downloadCsv('mygrad-registrations-' + q + '.csv', ['quarter', 'studentEmail', 'curric', 'number', 'section', 'withdrawn'], res.registrations);
            bridgeStatus(res.registrations.length + ' registrations exported' + (res.failures.length ? '; ' + res.failures.length + ' failed' : ''));
        };
        $id('uw-csv-pre').onclick = async () => {
            const qs = (prompt('Quarters for coursework, comma separated (for example SUM2026,AUT2026,WIN2027,SPR2027):') || '')
                .toUpperCase().split(',').map(x => x.trim()).filter(x => /^(AUT|WIN|SPR|SUM)\d{4}$/.test(x));
            const res = await collectForApp({mode:'prefill', quarters:qs}, (n, t) => bridgeStatus('Transcripts ' + n + ' / ' + t));
            if(res.login){ bridgeStatus('Your MyGrad session has expired. Sign in again.'); return; }
            const rows = res.students.map(s => Object.assign({}, s, {courses:JSON.stringify(s.courses || [])}));
            downloadCsv('mygrad-prefill.csv', ['email', 'name', 'preferredFirst', 'program', 'entryQuarter', 'gpa', 'leaveEnds', 'hasAdvisor',
                         'hasDocComm', 'hasMastersComm', 'hasReadingComm', 'uwDegrees', 'candidacyDate', 'anth800Credits', 'courses'], rows);
            bridgeStatus(rows.length + ' students exported' + (res.failures.length ? '; ' + res.failures.length + ' failed' : ''));
        };
    }
}

function startAppBridge(){
    buildBridgePanel();
    if(!window.opener) return;
    let busy = false;
    let refused = false;
    window.addEventListener('message', async e => {
        if(!e.data || e.data.type !== 'mygrad-config' || busy || refused) return;
        const config = e.data;
        if(['registrations', 'prefill'].indexOf(config.mode) === -1) return;
        const approved = approvedOrigin();
        const decision = bridgeDecision(e.origin, e.source, window.opener, approved);
        if(decision === 'reject') return;
        if(decision === 'ask'){
            if(!confirmOrigin(e.origin, approved)){
                /* One refusal per tab, so a page cannot keep re-asking. */
                refused = true;
                bridgeStatus('Nothing sent: the request from ' + e.origin + ' was refused. ' +
                             'To try again, click the bookmark again in this tab.');
                return;
            }
            rememberOrigin(e.origin);
        }
        busy = true;
        bridgeStatus('Reading transcripts for the app…');
        const res = await collectForApp(config, (n, t) => bridgeStatus('Transcripts ' + n + ' / ' + t));
        busy = false;
        if(res.login){
            e.source.postMessage({type:'mygrad-error', error:'MyGrad session expired. Sign in to MyGrad and click the bookmark again.'}, e.origin);
            bridgeStatus('Your MyGrad session has expired. Sign in again.');
            return;
        }
        e.source.postMessage(res, e.origin);
        bridgeStatus('Sent to the app: ' + res.students.length + ' students' +
            (config.mode === 'registrations' ? ', ' + res.registrations.length + ' registrations' : '') +
            (res.failures.length ? '; ' + res.failures.length + ' failed (listed in the app)' : '') + '. You can close this tab.');
    });
    window.opener.postMessage({type:'mygrad-ready', version:1}, '*');
}

/* ============================================================
   INIT
   ============================================================ */

injectStyle();
buildPanel();
loadCache();
startAppBridge();

(function init(){
    const g = gridReady();
    if(!g){
        alert('Could not find the student table. Wait for the grid to load, then click the bookmark again.');
        return;
    }
    g.unbind('dataBound', formatRows);
    g.bind('dataBound', formatRows);
    hideBaseColumns(g);
    formatRows();

    const rows = Array.prototype.slice.call(g.dataSource.data());
    const pending = rows.filter(d => !results[d.SystemKey]).length;
    const failed = rows.filter(d => results[d.SystemKey] && results[d.SystemKey].error).length;

    if(failed)        setProgress(failed + ' student(s) failed earlier — press Refresh to retry');
    else if(pending)  setProgress(pending + ' student(s) not fetched yet');
    else               setProgress('Milestones loaded from cache');
})();

})();
