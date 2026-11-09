'use strict';
// Executes the actual TS callback body with controlled HTTP/state dependencies.
// This is a focused callback test, not React rendering or an end-to-end browser test.
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
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'fetchSTDetail') {
    assert(ts.isCallExpression(node.initializer), 'Expected actual useCallback initializer.');
    callback = node.initializer.arguments[0];
  }
  ts.forEachChild(node, visit);
}
visit(file);
assert(callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)));
const refNames = new Set();
function refs(node) {
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'current' && ts.isIdentifier(node.expression)) refNames.add(node.expression.text);
  ts.forEachChild(node, refs);
}
refs(callback);
const program = ts.transpileModule(`globalThis.__handler = (${callback.getText(file)});`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
function setup() {
  const state = { detail: { id: 'old', maksud_tujuan: 'DUMMY OLD PRIVATE DOCUMENT' }, open: true, loading: false, errors: [], requests: [] };
  const change = key => value => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  const context = {
    api: { get: path => new Promise((resolve, reject) => state.requests.push({ path, resolve, reject })) },
    clearGetCache() {},
    setStDetail: change('detail'), setStPreviewOpen: change('open'), setStDetailLoading: change('loading'),
    toast: { error: text => state.errors.push(text) }, encodeURIComponent,
    ...Object.fromEntries([...refNames].map(name => [name, { current: 0 }])),
  };
  vm.createContext(context);vm.runInContext(program, context, { timeout: 1000 });
  return { state, handle: context.__handler };
}
async function main() {
  let { state, handle } = setup();
  const gone = handle('gone');
  assert.equal(state.detail, null, 'STN04: starting another fetch must remove old private document data.');
  assert.equal(state.open, false, 'STN04: starting another fetch must close the previous preview.');
  state.requests[0].reject({ response: { status: 404 } }); await gone;
  assert.equal(state.detail, null);assert.equal(state.open, false);assert.equal(state.loading, false);
  assert(state.errors.some(text => /tidak tersedia|tidak ditemukan|tidak dapat diakses/i.test(text)), 'PN06: unavailable reference needs a specific safe message.');
  console.log(JSON.stringify({ status: 'PASS', check: 'STN04/PN06 actual fetchSTDetail removes stale state on404' }));

  ({ state, handle } = setup());
  const first = handle('A');const second = handle('B');
  state.requests[1].resolve({ data: { data: { id: 'B', maksud_tujuan: 'DUMMY CURRENT' } } });await second;
  assert.equal(state.detail.id, 'B');assert.equal(state.open, true);
  state.requests[0].resolve({ data: { data: { id: 'A', maksud_tujuan: 'DUMMY STALE' } } });await first;
  assert.equal(state.detail.id, 'B', 'Late earlier success must not replace the latest selected letter.');
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06 actual fetchSTDetail ignores out-of-order earlier success' }));

  ({ state, handle } = setup());
  const missing = handle('A');const present = handle('B');
  state.requests[1].resolve({ data: { data: { id: 'B' } } });await present;
  state.requests[0].reject({ response: { status: 403 } });await missing;
  assert.equal(state.detail.id, 'B', 'Late earlier denial must not clear the newer authorized preview.');
  assert.equal(state.errors.length, 0, 'Late earlier failure must not toast a false error for the current document.');
  console.log(JSON.stringify({ status: 'PASS', check: 'PN06 actual fetchSTDetail ignores out-of-order earlier denial' }));
  console.log(JSON.stringify({ harness: 'actual TypeScript callback with controlled HTTP/state;no DOM/no network', cases: 3, failed: 0 }));
}
main().catch(error => { console.error(error.message);process.exitCode=1; });
