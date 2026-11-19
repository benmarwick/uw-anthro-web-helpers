/* Tests for review items 1 (hourly alerting) and 2 (user text written to the sheet).
   Run with:  node --test grad-progress-review-workflow/app/tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..');

/* ---------------- A small fake of Google Sheets ----------------
   Without the plain-text format ('@') it coerces strings the way Sheets does: '3-4' and '1/2' become
   dates, text starting with = + - @ becomes a formula (#ERROR!). With '@' it keeps strings, except a
   leading '=' (not confirmed in Node, so the fake assumes the worst) and turns numbers and booleans
   into text. Rich text values are always stored literally. */
function coerce(v, fmt) {
  if (typeof v !== 'string') {
    if (fmt === '@' && (typeof v === 'number' || typeof v === 'boolean')) return String(v);
    return v;
  }
  if (v === '') return v;
  if (v.charAt(0) === '=') return '#ERROR!';
  if (fmt === '@') return v;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^[+\-@]/.test(v)) return '#ERROR!';
  if (/^\d+[-/]\d+$/.test(v)) return new Date(2026, 0, 1);
  return v;
}

function colToNum(letters) {
  return letters.split('').reduce(function(n, ch) { return n * 26 + ch.charCodeAt(0) - 64; }, 0);
}

function numToCol(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function makeSheet() {
  const cells = {};
  const events = [];
  const cell = function(r, c) {
    const k = r + ',' + c;
    if (!cells[k]) cells[k] = { v: '', fmt: '' };
    return cells[k];
  };
  const sheet = {
    cells: cells,
    events: events,
    lastRow: function() {
      let n = 0;
      Object.keys(cells).forEach(function(k) { if (cells[k].v !== '') n = Math.max(n, Number(k.split(',')[0])); });
      return n;
    },
    lastCol: function() {
      let n = 0;
      Object.keys(cells).forEach(function(k) { if (cells[k].v !== '') n = Math.max(n, Number(k.split(',')[1])); });
      return n;
    }
  };
  function range(r, c, nr, nc) {
    nr = nr || 1;
    nc = nc || 1;
    const each = function(fn) {
      for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) fn(cell(r + i, c + j), i, j);
    };
    const rg = {
      setValues: function(vals) {
        each(function(x, i, j) { x.v = coerce(vals[i][j], x.fmt); events.push('value ' + numToCol(c + j) + (r + i)); });
        return rg;
      },
      setValue: function(v) { return rg.setValues([[v]]); },
      getValues: function() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = [];
          for (let j = 0; j < nc; j++) row.push(cell(r + i, c + j).v);
          out.push(row);
        }
        return out;
      },
      setNumberFormat: function(f) {
        each(function(x, i, j) { x.fmt = f; events.push('format ' + numToCol(c + j) + (r + i)); });
        return rg;
      },
      getNumberFormat: function() { return cell(r, c).fmt; },
      setRichTextValue: function(rt) { cell(r, c).v = rt.text; return rg; },
      getA1Notation: function() { return numToCol(c) + r; },
      setFontWeight: function() { return rg; }
    };
    return rg;
  }
  sheet.getRange = range;
  sheet.getLastRow = function() { return sheet.lastRow(); };
  sheet.getLastColumn = function() { return sheet.lastCol(); };
  sheet.getDataRange = function() { return range(1, 1, Math.max(sheet.lastRow(), 1), Math.max(sheet.lastCol(), 1)); };
  sheet.getRangeList = function(a1s) {
    return {
      setNumberFormat: function(f) {
        a1s.forEach(function(a1) {
          const m = /^([A-Z]+)(\d+)$/.exec(a1);
          range(Number(m[2]), colToNum(m[1])).setNumberFormat(f);
        });
      }
    };
  };
  sheet.appendRow = function(row) { range(sheet.lastRow() + 1, 1, 1, row.length).setValues([row]); };
  sheet.setFrozenRows = function() {};
  sheet.setColumnWidths = function() {};
  return sheet;
}

function makeContext(extra) {
  const sheets = {};
  const ss = {
    getSheetByName: function(n) { return sheets[n] || null; },
    insertSheet: function(n) { sheets[n] = makeSheet(); return sheets[n]; },
    getSpreadsheetTimeZone: function() { return 'America/Los_Angeles'; }
  };
  const config = {
    SPREADSHEET_ID: 'ss', CONFIDENTIAL_SPREADSHEET_ID: 'conf',
    SHEETS: { CONFIDENTIAL: 'Confidential', REVIEWS: 'Reviews' },
    LOGS_SHEET_NAME: 'Logs', AUDIT_LOG_SHEET_NAME: 'Audit', DEAD_LETTER_SHEET_NAME: 'DLQ',
    ALERT_EMAIL: 'alerts@example.edu', GPC_EMAIL: 'gpc@example.edu',
    ALERT_THRESHOLDS: { PDF_FAILURES_PER_HOUR: 5, EMAIL_FAILURES_PER_HOUR: 10, TRIGGER_FAILURES_PER_DAY: 3, QUOTA_USAGE_PCT: 80 },
    ACTIONS: { PDF_GENERATED: 'PDF_GENERATED', PDF_FAILED: 'PDF_FAILED' }
  };
  const ctx = Object.assign({
    C_: function() { return config; },
    SpreadsheetApp: {
      openById: function() { return ss; },
      flush: function() {},
      newRichTextValue: function() {
        const b = { text: '' };
        b.setText = function(t) { b.text = t; return b; };
        b.build = function() { return { text: b.text }; };
        return b;
      }
    },
    Utilities: { formatDate: function(d) { return d.toISOString().slice(0, 10); } },
    getCurrentUserEmailSafe_: function() { return 'SYSTEM'; }
  }, extra || {});
  ctx.sheets = sheets;
  vm.createContext(ctx);
  return ctx;
}

function load(ctx, files) {
  files.forEach(function(f) {
    vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx, { filename: f });
  });
}

/* ---------------- Item 2: user text is stored as typed ---------------- */

const TRICKY = ['- needs more structure', '+ great energy', '=SUM(A1)', '@mention', '3-4', '1/2', '007'];

function sheetWithHeaders(ctx, name, headers) {
  const sheet = ctx.SpreadsheetApp.openById().insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

test('item 2: updateRow_ keeps user text exactly as typed', () => {
  const ctx = makeContext();
  load(ctx, ['Sheets.gs']);
  const sheet = sheetWithHeaders(ctx, 'Feedback', ['ID', 'Strength', 'Count']);
  sheet.getRange(2, 1, 1, 3).setValues([['F-1', 'old', 0]]);
  TRICKY.forEach(function(text) {
    ctx.updateRow_('Feedback', 2, { Strength: text });
    assert.equal(sheet.getRange(2, 2).getValues()[0][0], text);
  });
  assert.ok(sheet.events.indexOf('format B2') < sheet.events.lastIndexOf('value B2'), 'format is set before the value');
});

test('item 2: updateRow_ still writes numbers, booleans and timestamps as before', () => {
  const ctx = makeContext();
  load(ctx, ['Sheets.gs']);
  const sheet = sheetWithHeaders(ctx, 'Requests', ['ID', 'Reminder_Count', 'Flag', 'Updated_At']);
  sheet.getRange(2, 1, 1, 4).setValues([['R-1', '', '', '']]);
  ctx.updateRow_('Requests', 2, { Reminder_Count: 3, Flag: true, Updated_At: '2026-11-19T15:00:00.000Z' });
  const row = sheet.getRange(2, 1, 1, 4).getValues()[0];
  assert.equal(row[1], 3);
  assert.equal(row[2], true);
  assert.equal(row[3], '2026-11-19T15:00:00.000Z');
  /* The same cell first gets text, then a number: the number keeps its type. */
  ctx.updateRow_('Requests', 2, { Reminder_Count: '2-3' });
  assert.equal(sheet.getRange(2, 2).getValues()[0][0], '2-3');
  ctx.updateRow_('Requests', 2, { Reminder_Count: 4 });
  assert.equal(sheet.getRange(2, 2).getValues()[0][0], 4);
});

test('item 2: appendObjects_ keeps user text and leaves other values typed', () => {
  const ctx = makeContext();
  load(ctx, ['Sheets.gs']);
  const sheet = sheetWithHeaders(ctx, 'Feedback', ['ID', 'Strength', 'Next_Step', 'Count', 'Flag', 'Empty']);
  const objs = TRICKY.map(function(text, i) { return { ID: 'F-' + i, Strength: text, Next_Step: text, Count: i, Flag: false }; });
  const start = ctx.appendObjects_('Feedback', objs);
  assert.equal(start, 2);
  TRICKY.forEach(function(text, i) {
    const row = sheet.getRange(2 + i, 1, 1, 6).getValues()[0];
    assert.equal(row[0], 'F-' + i);
    assert.equal(row[1], text);
    assert.equal(row[2], text);
    assert.equal(row[3], i);
    assert.equal(row[4], false);
    assert.equal(row[5], '');
    assert.notEqual(sheet.getRange(2 + i, 4).getNumberFormat(), '@', 'numbers are not forced to text');
    assert.notEqual(sheet.getRange(2 + i, 6).getNumberFormat(), '@', 'empty cells are not forced to text');
  });
});

/* ---------------- Item 1: hourly alerting ---------------- */

function alertingContext(handlers) {
  const sent = [];
  const ctx = makeContext({
    ScriptApp: { getProjectTriggers: function() { return handlers.map(function(h) { return { getHandlerFunction: function() { return h; } }; }); } },
    GmailApp: {
      sendEmail: function(to, subject, body, options) {
        if (typeof to !== 'string') throw new Error('GmailApp.sendEmail has no single-object form');
        sent.push({ to: to, subject: subject, body: body, options: options });
      }
    },
    logEvent_: function() {},
    getQuotaStatus_: function() { return { maxUsagePct: 0 }; },
    getDeadLetterStats_: function() { return { pending: 0, maxRetries: 0 }; },
    reviewById_: function(id) { return { Review_ID: id, Cycle: 2027, Student_Email: 's@uw.edu', Type: 'ANNUAL' }; },
    studentByEmail_: function() { return { Name: 'Student' }; },
    buildReviewPdfModel_: function(x) { return x; },
    enqueueDeadLetter_: function() {},
    DLQ_ACTIONS: { GENERATE_PDF: 'GENERATE_PDF' },
    DocumentApp: { create: function() { throw new Error('Docs service unavailable'); } }
  });
  load(ctx, ['Sheets.gs', 'Logs.gs', 'Alerting.gs', 'PdfEngine.gs']);
  ctx.sheets.Reviews = makeSheet();
  ctx.sent = sent;
  return ctx;
}

/* The triggers this project creates: Automation.gs createTriggers_(). */
const PROJECT_TRIGGERS = ['dailyRun', 'processDeadLetterQueue', 'checkAlertThresholds'];

test('item 1: no missing-trigger alert when the project triggers exist', () => {
  const ctx = alertingContext(PROJECT_TRIGGERS);
  const alerts = ctx.checkTriggerHealth_();
  assert.equal(alerts.filter(function(a) { return a.type === 'MISSING_TRIGGERS'; }).length, 0);
});

test('item 1: a missing dailyRun trigger is reported', () => {
  const ctx = alertingContext(['processDeadLetterQueue', 'checkAlertThresholds']);
  const alerts = ctx.checkTriggerHealth_();
  const missing = alerts.filter(function(a) { return a.type === 'MISSING_TRIGGERS'; });
  assert.equal(missing.length, 1);
  assert.deepEqual(Array.from(missing[0].missing), ['dailyRun']);
});

test('item 1: the alert summary email is sent with the positional GmailApp form', () => {
  const ctx = alertingContext(PROJECT_TRIGGERS);
  ctx.sendAlertSummary_([{ type: 'X', severity: 'HIGH', message: 'test' }]);
  assert.equal(ctx.sent.length, 1);
  assert.equal(ctx.sent[0].to, 'alerts@example.edu');
  assert.match(ctx.sent[0].subject, /1 High/);
  assert.match(ctx.sent[0].options.htmlBody, /test/);
  assert.ok(ctx.sent[0].body.length > 0, 'a plain-text body is included');
});

test('item 1: repeated PDF failures raise the PDF failure alert', () => {
  const ctx = alertingContext(PROJECT_TRIGGERS);
  for (let i = 0; i < 5; i++) {
    assert.throws(function() { ctx.generateReviewPdf_('R-' + i); }, /Docs service unavailable/);
  }
  const alerts = ctx.checkPdfFailureRate_();
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'PDF_FAILURE_RATE');
  assert.equal(alerts[0].count, 5);
});
