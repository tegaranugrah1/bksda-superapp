'use strict';
// Actual TS callback; controlled HTTP/state/print scheduler. No DOM, native printer or network claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.env.PORTAL_NOTIFICATION_SOURCE_ROOT || '/frontend/src';
assert(root.startsWith('/frontend/') || root.startsWith('/baseline-frontend/'));
const source = fs.readFileSync(`${root}/app/portal/page.tsx`, 'utf8');
const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'handlePrintLeave') {
    assert(ts.isCallExpression(node.initializer), 'Expected native useCallback initializer.');
    callback = node.initializer.arguments[0];
  }
  ts.forEachChild(node, visit);
}
visit(file);
assert(callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)), 'Actual handlePrintLeave callback required.');
const refs = new Set();
function collect(node) {
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'current' && ts.isIdentifier(node.expression)) refs.add(node.expression.text);
  ts.forEachChild(node, collect);
}
collect(callback);
const output = ts.transpileModule(`globalThis.__handler = (${callback.getText(file)});`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
function setup() {
  const state = { data: { id: 'old', alasan_cuti: 'DUMMY OLD PRIVATE LEAVE' }, errors: [], requests: [], printCalls: 0, timers: [] };
  const schedule = action => { state.timers.push(action);return state.timers.length; };
  const context = {
    api: { get: path => new Promise((resolve, reject) => state.requests.push({ path, resolve, reject })) },
    clearGetCache() {},
    setPrintLeaveData: value => { state.data = typeof value === 'function' ? value(state.data) : value; },
    setActiveLeaveId() {},
    toast: { error: text => state.errors.push(text) },
    window: { print: () => { state.printCalls++; }, setTimeout: schedule, clearTimeout() {} },
    setTimeout: schedule, clearTimeout() {}, encodeURIComponent,
    ...Object.fromEntries([...refs].map(name => [name, { current: 0 }])),
  };
  vm.createContext(context);vm.runInContext(output, context, { timeout: 1000 });
  return { state, handle: context.__handler, flush: () => { while (state.timers.length) state.timers.shift()(); } };
}
const fresh = id => ({ data: { data: { id, alasan_cuti: 'DUMMY FRESH AUTHORIZED LEAVE', status: 'DISETUJUI' } } });
async function main() {
  let { state, handle, flush } = setup();
  const missing = handle({ id: 'gone', alasan_cuti: 'DUMMY CACHED INPUT MUST NOT PRINT' });
  assert.equal(state.data, null, 'PN06/KN02: old print data must clear before checking a notification reference.');
  assert.equal(state.requests.length, 1, 'Native personal detail HTTP must revalidate the cached item.');
  assert.equal(state.requests[0].path, '/me/leave-requests/gone');
  state.requests[0].reject({ response: { status: 404 } });await missing;flush();
  assert.equal(state.data, null);assert.equal(state.printCalls, 0);
  assert(state.errors.some(x => /tidak tersedia|tidak ditemukan|tidak dapat diakses/i.test(x)));
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06/KN02 actual handlePrintLeave clears cached data and does not print deleted404 reference' }));

  ({ state, handle, flush } = setup());
  const valid = handle({ id: 17, alasan_cuti: 'DUMMY CACHED INPUT MUST NOT PRINT' });
  state.requests[0].resolve(fresh(17));await valid;flush();
  assert.equal(state.data.id, 17);assert.equal(state.data.alasan_cuti, 'DUMMY FRESH AUTHORIZED LEAVE');
  if (/window\.print/.test(callback.getText(file))) assert.equal(state.printCalls, 1);
  assert.equal(state.errors.length, 0);
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06/KN02 legitimate print uses fresh authorized native response instead of caller cached object' }));

  ({ state, handle, flush } = setup());
  const earlier = handle({ id: 'A' });const current = handle({ id: 'B' });
  state.requests[1].resolve(fresh('B'));await current;
  state.requests[0].resolve(fresh('A'));await earlier;flush();
  assert.equal(state.data.id, 'B');
  if (/window\.print/.test(callback.getText(file))) assert.equal(state.printCalls, 1);
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06/KN02 earlier success cannot replace or schedule an extra print of latest selected leave' }));

  ({ state, handle, flush } = setup());
  const denied = handle({ id: 'A' });const allowed = handle({ id: 'B' });
  state.requests[1].resolve(fresh('B'));await allowed;
  state.requests[0].reject({ response: { status: 403 } });await denied;flush();
  assert.equal(state.data.id, 'B');assert.equal(state.errors.length, 0);
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06/KN02 earlier denial cannot clear fresh current authorized print data or toast a false error' }));

  ({ state, handle, flush } = setup());
  const firstPrint = handle({ id: 'A' });state.requests[0].resolve(fresh('A'));await firstPrint;
  const newerPrint = handle({ id: 'B' });flush();
  if (/window\.print/.test(callback.getText(file))) assert.equal(state.printCalls, 0, 'A previously scheduled print must not fire while a newer selection is awaiting authorization.');
  state.requests[1].resolve(fresh('B'));await newerPrint;flush();
  assert.equal(state.data.id, 'B');
  if (/window\.print/.test(callback.getText(file))) assert.equal(state.printCalls, 1);
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06/KN02 delayed print from earlier selection is canceled by a newer detail request' }));
  console.log(JSON.stringify({ harness: 'actual TypeScript handlePrintLeave callback with controlled HTTP/state/print scheduler;no DOM/no network', cases: 5, failed: 0 }));
}
main().catch(error => { console.error(error.message);process.exitCode=1; });
