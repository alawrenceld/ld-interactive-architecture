const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Execute the standalone page's calculation functions without a browser or a
// duplicate model. DOM rendering starts after this section in the HTML.
const html = fs.readFileSync(path.join(__dirname, '../ld-resilience-marketecture.html'), 'utf8');
const source = html.slice(html.indexOf('  var MONTH_HOURS ='), html.indexOf('  // build the rows once;'));
function model(overrides = {}) {
  const context = vm.createContext({});
  vm.runInContext(source + '\nthis.billing = { reset: function (state) { opt = Object.assign({}, DEFAULTS, state); }, totals: totals, rows: rowsFor, value: rowVal };', context);
  context.billing.reset(overrides);
  return context.billing;
}
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`); }

test('baseline: four streaming SDKs count in both models', () => {
  const t = model().totals();
  near(t.calculated, 4); near(t.billed, 4); near(t.proposed, 4);
});
test('current polling calculation changes with interval; billed polling is zero', () => {
  const fast = model({ poll: true, interval: 15 }).totals();
  const slow = model({ poll: true, interval: 900 }).totals();
  near(fast.calculated, 8); near(slow.calculated, 4 / 30);
  near(fast.billed, 0); near(slow.billed, 0);
});
test('proposed identifiable SDK time is interval independent', () => {
  for (const interval of [15, 30, 60, 300, 900, 3600]) {
    near(model({ poll: true, interval }).totals().proposed, 4);
  }
});
test('PHP: 1M polls at 30s/poll are calculated, excluded from current billing', () => {
  const t = model({ php: true }).totals();
  near(t.calculated, 1e6 * 30 / (730 * 3600));
  near(t.billed, 0); near(t.proposed, t.calculated);
});
test('editable PHP requests scale the provisional fallback without using polling interval', () => {
  const a = model({ php: true, phpM: 1 }).totals();
  const b = model({ php: true, phpM: 2, interval: 900 }).totals();
  near(b.calculated, 2 * a.calculated); near(b.proposed, 2 * a.proposed);
});
test('PHP replaces production only; streaming staging and dev remain billed', () => {
  const t = model({ php: true, envs: true }).totals();
  near(t.billed, 2); near(t.calculated, 2 + 1e6 * 30 / (730 * 3600));
  near(t.proposed, t.calculated);
});
test('polling staging and dev follow connection mode and interval independently of PHP', () => {
  const t = model({ php: true, envs: true, poll: true, interval: 900 }).totals();
  near(t.billed, 0); near(t.calculated, 2 / 30 + 1e6 * 30 / (730 * 3600));
  near(t.proposed, 2 + 1e6 * 30 / (730 * 3600));
});
test('Kubernetes counts SDKs; the shared-ID worker example does not multiply them', () => {
  near(model({ k8s: true }).totals().billed, 12);
  near(model({ k8s: true, workers: true }).totals().billed, 12);
});
test('three-day autoscaling uses the same 730-hour denominator as PHP and Lambda', () => {
  near(model({ burst: true }).totals().billed, 4 + 10 * 3 * 24 / 730);
  near(model({ daily: true }).totals().billed, 9);
});
test('Relay does not change any of the three comparison totals', () => {
  const state = { php: true, envs: true, burst: true, poll: true, interval: 900 };
  const a = model(state).totals(), b = model({ ...state, relay: true }).totals();
  for (const key of ['calculated', 'billed', 'proposed']) near(a[key], b[key]);
});
test('Lambda runtime estimate is independent of the always-on SDK polling control', () => {
  const t = model({ fn: true, poll: true }).totals();
  near(t.billed, 60e6 * 0.22 / (730 * 3600));
  near(t.proposed, 4 + t.billed);
});
test('row totals use the selected model, including true zero billed polling', () => {
  for (const calculation of ['current', 'asi']) {
    const m = model({ calculation, poll: true, interval: 900 });
    const total = m.rows().reduce((sum, row) => sum + m.value(row), 0);
    near(total, calculation === 'current' ? 0 : 4);
  }
});

const historySource = html.slice(html.indexOf('  var undoStack ='), html.indexOf('  function renderScenario()'));
function history() {
  const context = vm.createContext({});
  vm.runInContext(source + '\n' + historySource + `
    var cleared = false;
    function setWatch() {}
    function renderSC() {}
    function drawWires() {}
    opt = Object.assign({}, DEFAULTS);
    this.history = {
      edit: flip,
      undo: function () { restore(undoStack, redoStack); },
      redo: function () { restore(redoStack, undoStack); },
      state: function () { return Object.assign({}, opt); },
      sizes: function () { return [undoStack.length, redoStack.length]; },
      change: function () { return changeText; }
    };`, context);
  return context.history;
}
test('Undo/Redo restores numeric, interval and model edits in order', () => {
  const h = history();
  h.edit('poll', true); h.edit('interval', 900); h.edit('calculation', 'asi');
  h.edit('php', true); h.edit('phpM', 2);
  h.undo(); near(h.state().phpM, 1);
  h.undo(); assert.equal(h.state().php, false);
  h.undo(); assert.equal(h.state().calculation, 'current');
  h.undo(); near(h.state().interval, 30);
  h.undo(); assert.equal(h.state().poll, false);
  for (let i = 0; i < 5; i++) h.redo();
  assert.equal(h.state().calculation, 'asi'); near(h.state().interval, 900);
  near(h.state().phpM, 2); assert.equal(h.state().php, true);
});
test('new edits clear Redo; repeating the selected value is not an action', () => {
  const h = history();
  h.edit('poll', true); h.undo(); h.edit('relay', true);
  h.redo(); assert.equal(h.state().poll, false); assert.equal(h.state().relay, true);
  h.edit('relay', true); assert.equal(h.sizes()[0], 1);
});
test('multiple keystrokes in one numeric edit are one undoable action and one delta', () => {
  const h = history();
  h.edit('phpM', 2); h.edit('phpM', 20, true); h.edit('phpM', 200, true);
  assert.equal(h.sizes()[0], 1); assert.match(h.change(), /PHP requests: 1 → 200/);
  h.undo(); near(h.state().phpM, 1);
  h.redo(); near(h.state().phpM, 200);
});
