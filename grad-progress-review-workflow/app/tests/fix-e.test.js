/* Fix E: the MyGrad bookmarklet's app bridge sends student data only to the app page that opened
   the tab, from an exact origin the administrator approved (review item 25).
   Run with:  node --test "grad-progress-review-workflow/app/tests/*.js" */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const BOOKMARKLET = path.join(__dirname, '..', '..', '..', 'bookmarklet-mygrad-table-audit.js');

/* The bookmarklet exports its pure bridge rule when loaded under Node, as the Time Schedule one does. */
function loadBridge() {
  delete require.cache[require.resolve(BOOKMARKLET)];
  return require(BOOKMARKLET);
}

const APP = 'https://n-abc123def456-0lu-script.googleusercontent.com';
const OTHER_APPS_SCRIPT = 'https://n-evil999-0lu-script.googleusercontent.com';

/* Stand-ins for window objects; only their identity matters. */
const appWindow = {};
const otherWindow = {};

test('item 25: the bookmarklet loads under Node and exports its bridge rule', () => {
  const bridge = loadBridge();
  assert.equal(typeof bridge.bridgeDecision, 'function');
});

test('item 25: another Apps Script page is not trusted just for being on googleusercontent.com', () => {
  const { bridgeDecision } = loadBridge();
  const decision = bridgeDecision(OTHER_APPS_SCRIPT, appWindow, appWindow, APP);
  assert.notEqual(decision, 'allow');
  assert.equal(decision, 'ask');
});

test('item 25: the approved origin, sent by the window that opened the tab, is allowed', () => {
  const { bridgeDecision } = loadBridge();
  assert.equal(bridgeDecision(APP, appWindow, appWindow, APP), 'allow');
});

test('item 25: with nothing approved yet, an Apps Script opener is asked about, not allowed', () => {
  const { bridgeDecision } = loadBridge();
  assert.equal(bridgeDecision(APP, appWindow, appWindow, ''), 'ask');
});

test('item 25: a message from any window other than the opener is rejected, even from the approved origin', () => {
  const { bridgeDecision } = loadBridge();
  assert.equal(bridgeDecision(APP, otherWindow, appWindow, APP), 'reject');
  assert.equal(bridgeDecision(APP, appWindow, null, APP), 'reject');
  assert.equal(bridgeDecision(APP, null, null, APP), 'reject');
});

test('item 25: origins that are not Apps Script pages are rejected outright', () => {
  const { bridgeDecision } = loadBridge();
  const bad = [
    'https://evil.example.com',
    'http://n-abc123def456-0lu-script.googleusercontent.com',
    'https://n-abc-0lu-script.googleusercontent.com.evil.example',
    'https://script.googleusercontent.com',
    'https://webappssecure.grad.uw.edu',
    'null',
    ''
  ];
  bad.forEach(origin => {
    assert.equal(bridgeDecision(origin, appWindow, appWindow, origin), 'reject', origin);
  });
});

/* ---------- The real listener, run in a fake MyGrad tab ---------- */

const fs = require('fs');
const vm = require('vm');

/* Runs the whole bookmarklet in a vm whose global is a minimal browser window with no student
   rows, and returns what its message listener does. */
function fakeTab(opts) {
  const store = Object.assign({}, opts.stored || {});
  const asked = [];
  const listeners = [];
  const byId = {};
  const element = () => ({ style: {}, classList: { toggle() {} }, querySelectorAll: () => [], appendChild() {}, after() {} });
  const add = el => { if (el.id) byId[el.id] = el; };
  const emptyGrid = {
    dataSource: { data: () => [] }, columns: [], bind() {}, unbind() {}, hideColumn() {},
    tbody: { find: () => ({ each() {} }) }
  };
  const win = {
    location: { search: '', pathname: '/mgp-dept.stu.detail/home/studentlist' },
    opener: opts.opener,
    document: {
      /* The panel's own controls are looked up by id; anything not added returns a spare element. */
      getElementById: id => byId[id] || (id === 'uw-controls' || id === 'uw-audit-style' ? null : element()),
      createElement: element, querySelector: () => null, querySelectorAll: () => [],
      head: { appendChild: add }, body: { appendChild: add }
    },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    sessionStorage: { getItem: () => null, setItem() {} },
    confirm: text => { asked.push(text); return opts.answer; },
    alert() {},
    addEventListener: (type, fn) => { if (type === 'message') listeners.push(fn); },
    $: () => ({ length: 1, data: () => emptyGrid }),
    URLSearchParams, DOMParser: function () {}, setTimeout, Promise
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BOOKMARKLET, 'utf8'), win, { filename: 'bookmarklet-mygrad-table-audit.js' });
  return {
    store, asked,
    async send(origin, source) {
      const sent = [];
      const src = source || {};
      src.postMessage = (data, target) => sent.push({ data: JSON.parse(JSON.stringify(data)), target });
      await listeners[0]({ origin, source: src, data: { type: 'mygrad-config', mode: 'registrations', quarter: 'AUT2026' } });
      return sent;
    }
  };
}

test('item 25 (listener): the approved app gets the data without a prompt, sent to its exact origin', async () => {
  const opener = { postMessage() {} };
  const tab = fakeTab({ opener, stored: { 'uw-review-app-origin': APP }, answer: false });
  const sent = await tab.send(APP, opener);
  assert.equal(tab.asked.length, 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].target, APP);
  assert.equal(sent[0].data.type, 'mygrad-data');
});

test('item 25 (listener): another Apps Script opener is asked about, and Cancel sends nothing', async () => {
  const opener = { postMessage() {} };
  const tab = fakeTab({ opener, stored: { 'uw-review-app-origin': APP }, answer: false });
  const sent = await tab.send(OTHER_APPS_SCRIPT, opener);
  assert.equal(tab.asked.length, 1);
  assert.match(tab.asked[0], /different Apps Script page/);
  assert.equal(sent.length, 0);
  assert.equal(tab.store['uw-review-app-origin'], APP);
  /* After a refusal the tab ignores further requests instead of asking again. */
  const again = await tab.send(OTHER_APPS_SCRIPT, opener);
  assert.equal(tab.asked.length, 1);
  assert.equal(again.length, 0);
});

test('item 25 (listener): first use asks once, OK sends and remembers the exact origin', async () => {
  const opener = { postMessage() {} };
  const tab = fakeTab({ opener, answer: true });
  const sent = await tab.send(APP, opener);
  assert.equal(tab.asked.length, 1);
  assert.ok(tab.asked[0].indexOf(APP) !== -1, 'the prompt shows the exact origin');
  assert.equal(sent.length, 1);
  assert.equal(tab.store['uw-review-app-origin'], APP);
});

test('item 25 (listener): a window that is not the opener gets nothing and causes no prompt', async () => {
  const opener = { postMessage() {} };
  const tab = fakeTab({ opener, stored: { 'uw-review-app-origin': APP }, answer: true });
  const sent = await tab.send(APP, { });
  assert.equal(tab.asked.length, 0);
  assert.equal(sent.length, 0);
});
