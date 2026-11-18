/* ============================================================
   Time Schedule sections for the graduate review app
   (course-feedback plan §4.2, §4.5, task R2)

   Run on any UW Time Schedule page. When the graduate review app opened this tab, the bookmarklet
   tells the app it is ready, receives the quarter and the curricula it needs, fetches only those
   departments' Time Schedule pages, and sends back every section: SLN, section ID, credits or type
   (QZ marks a quiz section), instructors, the joint-listing flag and the meeting time. It also looks
   up each instructor's appointment type in the Course Evaluation Catalog (CEC) index, so graduate
   student instructors can be excluded (course-feedback plan §4.3). It answers only an Apps Script
   page (https://*-script.googleusercontent.com). Without an opener tab, the same data downloads as CSV.

   What the pages look like (checked on the Autumn 2026 ANTH, ARCHY and BIO A pages, 17 Nov 2026):
   each section row sits in an unclosed <pre> block, so the page is read as text with every tag
   removed; a row reads "[Restr] [IS >]SLN SECT CRED|TYPE  meeting  bldg room  Last,First  [Status] enrl/lim
   ... codes", and a J in the codes (J, JO, WJ) marks a joint listing. No row named more than one
   instructor; a name field is still split on "/", as the workload bookmarklet does.

   No AI is used. The pages contain no student data.
   ============================================================ */
(function () {
  'use strict';

  var TS_BASE = 'https://www.washington.edu/students/timeschd/';
  var CEC = 'https://www.washington.edu/cec/';
  var APP_ORIGIN_RE = /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/;
  var GRAD_RANKS = ['pre-doctoral associate', 'teaching assistant', 'pre-doctoral instructor', 'predoctoral instructor'];
  var FACULTY_RANKS = ['professor', 'associate professor', 'assistant professor', 'teaching professor', 'associate teaching professor',
                       'assistant teaching professor', 'principal lecturer', 'senior lecturer', 'lecturer'];
  var NAME_RE = /[A-Z][A-Za-z'\-]*(?: [A-Z][A-Za-z'\-]*)*,[A-Za-z][A-Za-z'\-]*(?: [A-Z][A-Za-z'\-.]*)*\.?/;

  function decode(s) {
    return String(s).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  function pageText(html) {
    var t = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/tr>/gi, '\n').replace(/<\/table>/gi, '\n').replace(/<[^>]*>/g, '');
    return decode(t);
  }

  /* The Time Schedule index: { 'ANTH': 'anthro.html', 'BIO A': 'bioanth.html', ... }. */
  function parseIndex(html) {
    var map = {}, re = /<a href="([a-z0-9_\-]+\.html)">([^<]*)<\/a>/gi, m;
    while ((m = re.exec(html))) {
      var text = decode(m[2]).replace(/\s+/g, ' ').trim();
      var c = text.match(/\(([A-Z][A-Z& ]*)\)\s*$/);
      if (c && !map[c[1].trim()]) map[c[1].trim()] = m[1];
    }
    return map;
  }

  function normName(n) {
    return String(n || '').toUpperCase().replace(/\s*,\s*/g, ',').replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
  }

  /* Every section row on one department page. */
  function parseSections(html, quarter) {
    var lines = pageText(html).split('\n'), out = [], course = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\s+$/, '');
      var h = line.match(/^([A-Z][A-Z&]*(?: [A-Z&]+)?)\s+(\d{3})\s+(\S.*)$/);
      if (h) { course = { curric: h[1].trim(), number: h[2], title: h[3].trim() }; continue; }
      var r = line.match(/^\s*((?:Restr|IS)\s+)*>?\s*(\d{5})\s+([A-Z][A-Z0-9]?)\s+(\S+)\s*(.*)$/);
      if (!r || !course) continue;
      var rest = r[5];
      var em = rest.match(/(\d+)\s*\/\s*(\d+)E?/);
      var before = em ? rest.slice(0, em.index) : rest;
      var after = em ? rest.slice(em.index + em[0].length) : '';
      before = before.replace(/\s+(Open|Closed)\s*$/, '').replace(/\s+$/, '');
      var nm = before.match(NAME_RE);
      var instructors = [], meeting = before.trim();
      if (nm) {
        instructors = before.slice(nm.index).trim().split(/\s*\/\s*/).filter(function (x) { return NAME_RE.test(x); });
        meeting = before.slice(0, nm.index).trim();
      }
      var codes = after.split(/\s+/).filter(function (t) { return /^[A-Z%]{1,4}$/.test(t); });
      var typeOrCred = r[4];
      out.push({
        quarter: quarter,
        curric: course.curric,
        number: course.number,
        title: course.title,
        section: r[3],
        sln: r[2],
        type: /^\d/.test(typeOrCred) ? 'credit' : typeOrCred,
        credits: /^\d/.test(typeOrCred) ? typeOrCred : '',
        instructors: instructors,
        joint: codes.some(function (c) { return c.indexOf('J') !== -1; }),
        independentStudy: /^\s*(?:Restr\s+)?IS\b/.test(line),
        meeting: meeting.replace(/\s+/g, ' '),
        enrolled: em ? Number(em[1]) : null,
        limit: em ? Number(em[2]) : null,
        codes: codes.join(' ')
      });
    }
    return out;
  }

  /* One CEC index link, as read on 18 Nov 2026:
     'Anthropology ANTH 101 A&nbsp;&nbsp;Firstname Lastname &nbsp;&nbsp;Assistant Professor&nbsp;&nbsp; SP26'.
     The department name comes first and the instructor is "First Last" (the Time Schedule writes "Last,First"). */
  function parseCecLine(text) {
    var parts = String(text).replace(/&amp;/g, '&').split(/(?:\s*&nbsp;)+\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length < 3) return null;
    var qm = parts[parts.length - 1].match(/^(AU|WI|SP|SU)(\d{2})$/);
    var cm = parts[0].match(/([A-Z][A-Z&]*(?: [A-Z&]+)?)\s+(\d{3})\s+([A-Z0-9]{1,2})$/);
    if (!qm || !cm) return null;
    var q = { AU: 'AUT', WI: 'WIN', SP: 'SPR', SU: 'SUM' }[qm[1]] + '20' + qm[2];
    return { curric: cm[1], number: cm[2], section: cm[3], name: parts[1], rank: parts.length > 3 ? parts.slice(2, -1).join(' ') : '', quarter: q };
  }

  /* 'Lastname,First M' (Time Schedule) matches 'First Lastname' or 'F Lastname' (CEC): same surname, and the
     same first given name or initial, as the workload bookmarklet matches them. */
  function sameInstructor(tsName, cecName) {
    var t = String(tsName || '').toUpperCase().split(',');
    if (t.length < 2) return false;
    var sur = t[0].replace(/\s+/g, ' ').trim(), given = (t[1].trim().split(/\s+/)[0] || '').replace(/\.$/, '');
    var c = String(cecName || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!sur || !given || c.slice(-sur.length - 1) !== ' ' + sur) return false;
    var cGiven = c.split(' ')[0].replace(/\.$/, '');
    return cGiven === given || (given.length === 1 && cGiven.charAt(0) === given) || (cGiven.length === 1 && given.charAt(0) === cGiven);
  }

  function qOrd(q) { return parseInt(q.slice(3), 10) * 10 + { WIN: 1, SPR: 2, SUM: 3, AUT: 4 }[q.slice(0, 3)]; }

  function appointmentFromRank(rank) {
    var r = String(rank || '').toLowerCase().trim();
    if (GRAD_RANKS.indexOf(r) !== -1) return 'graduate student';
    if (FACULTY_RANKS.indexOf(r) !== -1) return 'faculty';
    return r ? 'other' : '';
  }

  /* { normalizedName: { appointment, rank, quarter } }: the most recent CEC listing, in the requested curricula,
     whose instructor matches each Time Schedule name. */
  function appointmentsFromCec(entries, names, curricula) {
    var want = curricula ? curricula.map(function (c) { return c.toUpperCase(); }) : null, out = {};
    names.forEach(function (n) {
      var best = null;
      entries.forEach(function (e) {
        if (want && want.indexOf(String(e.curric).toUpperCase()) === -1) return;
        if (!sameInstructor(n, e.name)) return;
        if (!best || qOrd(e.quarter) > qOrd(best.quarter)) best = e;
      });
      if (best) out[normName(n)] = { appointment: appointmentFromRank(best.rank), rank: best.rank, quarter: best.quarter };
    });
    return out;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseIndex: parseIndex, parseSections: parseSections, parseCecLine: parseCecLine,
                       appointmentsFromCec: appointmentsFromCec, appointmentFromRank: appointmentFromRank, sameInstructor: sameInstructor };
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  /* ---------------- In the browser ---------------- */

  if (location.hostname !== 'www.washington.edu' || location.pathname.indexOf('/students/timeschd/') !== 0) {
    alert('Run this bookmarklet on a UW Time Schedule page.');
    return;
  }

  async function getText(url) {
    var res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
    return res.text();
  }

  async function collect(quarter, curricula, onProgress) {
    var index = parseIndex(await getText(TS_BASE + quarter + '/'));
    var sections = [], missing = [];
    for (var i = 0; i < curricula.length; i++) {
      var c = curricula[i].toUpperCase().replace(/\s+/g, ' ').trim();
      var page = index[c];
      if (!page) { missing.push(c); continue; }
      sections = sections.concat(parseSections(await getText(TS_BASE + quarter + '/' + page), quarter));
      onProgress('Time Schedule pages ' + (i + 1) + ' / ' + curricula.length);
    }
    var names = [];
    sections.forEach(function (s) { s.instructors.forEach(function (n) { if (names.indexOf(n) === -1) names.push(n); }); });
    var appointments = {}, cecError = '';
    try {
      onProgress('Reading appointment types from the Course Evaluation Catalog');
      var toc = await getText(CEC + 'toc.html');
      if (toc.indexOf('Course Evaluation Catalog') === -1) throw new Error('not signed in to the CEC');
      var letters = [];
      curricula.forEach(function (c) { var l = c.charAt(0).toLowerCase(); if (letters.indexOf(l) === -1 && new RegExp('href="' + l + '-toc\\.html"', 'i').test(toc)) letters.push(l); });
      var entries = [];
      for (var j = 0; j < letters.length; j++) {
        var html = await getText(CEC + letters[j] + '-toc.html'), re = /<a href="[a-z]\/[^"]+\.html">([^<]+)<\/a>/gi, m;
        while ((m = re.exec(html))) { var e = parseCecLine(m[1]); if (e) entries.push(e); }
      }
      appointments = appointmentsFromCec(entries, names, curricula);
    } catch (err) {
      cecError = String(err && err.message || err);
    }
    return { type: 'ts-sections', quarter: quarter, sections: sections, missingCurricula: missing, appointments: appointments, cecError: cecError };
  }

  function csvCell(v) { var t = String(v == null ? '' : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }

  function panel() {
    var box = document.getElementById('uw-ts-bridge');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'uw-ts-bridge';
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;top:12px;right:12px;z-index:99999;background:#4b2e83;color:#fff;padding:10px 14px;' +
      'font:14px Arial,sans-serif;border-radius:6px;max-width:360px;box-shadow:0 2px 6px rgba(0,0,0,.3)';
    document.body.appendChild(box);
    return box;
  }
  function status(text) { panel().textContent = text; }

  if (window.opener) {
    var busy = false;
    window.addEventListener('message', async function (e) {
      if (!APP_ORIGIN_RE.test(e.origin) || !e.data || e.data.type !== 'ts-config' || busy) return;
      var q = String(e.data.quarter || '').toUpperCase();
      var curricula = (e.data.curricula || []).map(String);
      if (!/^(AUT|WIN|SPR|SUM)\d{4}$/.test(q) || !curricula.length) return;
      busy = true;
      try {
        var res = await collect(q, curricula, status);
        e.source.postMessage(res, e.origin);
        status('Sent to the app: ' + res.sections.length + ' sections' + (res.missingCurricula.length ? '; not found: ' + res.missingCurricula.join(', ') : '') + '. You can close this tab.');
      } catch (err) {
        e.source.postMessage({ type: 'ts-error', error: String(err && err.message || err) }, e.origin);
        status('Something went wrong: ' + (err && err.message || err));
      }
      busy = false;
    });
    status('Waiting for the graduate review app…');
    window.opener.postMessage({ type: 'ts-ready', version: 1 }, '*');
  } else {
    var q = (prompt('Quarter (for example AUT2026):') || '').trim().toUpperCase();
    var cs = (prompt('Curricula, comma separated (for example ANTH, ARCHY, BIO A):') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!/^(AUT|WIN|SPR|SUM)\d{4}$/.test(q) || !cs.length) return;
    collect(q, cs, status).then(function (res) {
      var header = ['quarter', 'curric', 'number', 'section', 'sln', 'type', 'credits', 'instructors', 'joint', 'independentStudy', 'meeting', 'appointments'];
      var rows = res.sections.map(function (s) {
        var appts = s.instructors.map(function (n) { var a = res.appointments[normName(n)]; return a ? a.appointment : ''; }).join('/');
        return [s.quarter, s.curric, s.number, s.section, s.sln, s.type, s.credits, s.instructors.join('/'), s.joint, s.independentStudy, s.meeting, appts];
      });
      var csv = [header.join(',')].concat(rows.map(function (r) { return r.map(csvCell).join(','); })).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'time-schedule-sections-' + q + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      status(res.sections.length + ' sections exported' + (res.cecError ? ' (appointments not read: ' + res.cecError + ')' : '') + '.');
    }).catch(function (err) { status('Something went wrong: ' + (err && err.message || err)); });
  }
})();
