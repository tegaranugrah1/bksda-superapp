/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS fixture, matching the existing frontend/tests checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Render the actual dashboard and exercise its event handlers with dummy query data.
// No browser, credentials, API requests, or persistent writes are involved.
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '../src/app/bmn/page.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sample = {
  total_asset: 1633,
  total_asset_value: 61937834427,
  active_loans_count: 2,
  asset_by_condition: { Baik: 1150, 'Rusak Ringan': 399, 'Rusak Berat': 84 },
  asset_by_jenis: [{ jenis_bmn: 'Dummy A', total: 100, total_nilai: 1000 }, { jenis_bmn: 'Dummy B', total: 25, total_nilai: 250 }],
  asset_by_lokasi: [{ lokasi_ruang: 'Dummy A', total: 100 }, { lokasi_ruang: 'Dummy B', total: 20 }],
  recent_transactions: [],
};
let query = { data: sample, isLoading: false };
let instanceId = 'dashboard-a';
const state = [];
let cursor = 0;
const element = (type, props) => ({ type, props: props || {} });
const moduleObject = { exports: {} };
const imports = {
  react: {
    useId: () => instanceId,
    useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
  },
  'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
  '@tanstack/react-query': { useQuery: () => query },
  'lucide-react': new Proxy({}, { get: (_, name) => `icon:${String(name)}` }),
  'framer-motion': { motion: new Proxy({}, { get: (_, name) => `motion.${String(name)}` }) },
  '@/lib/api': { api: { get: () => { throw new Error('Network access is forbidden in this fixture'); } } },
  'next/link': { default: 'a' },
  '@/lib/utils': { cn: (...parts) => parts.filter(Boolean).join(' ') },
  '@/app/bmn/_lib/asset-utils': { formatRupiah: value => `Rp ${value}` },
};
vm.runInNewContext(compiled, {
  module: moduleObject, exports: moduleObject.exports,
  require: name => { assert(name in imports, `Unexpected import: ${name}`); return imports[name]; },
}, { timeout: 1000 });

function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  return [node, ...flatten(node.props.children)];
}
function render() { cursor = 0; return flatten(moduleObject.exports.default()); }
function shortcuts(nodes) { return nodes.filter(node => node.type === 'a' && node.props.onFocus); }
function highlighted(nodes) { return shortcuts(nodes).filter(node => flatten(node.props.children).some(child => child.props.layoutId)); }
function group(nodes) { return nodes.find(node => node.props.onMouseLeave); }

let nodes = render();
assert.equal(shortcuts(nodes).length, 4);
assert.equal(highlighted(nodes).length, 0);
const metrics = nodes.filter(node => node.props.className?.includes('bmn-metric-card'));
assert.equal(metrics.length, 4);
assert(metrics.every(node => !node.props.onClick && !node.props.whileTap && node.props.role !== 'button'), 'Metric hover must not introduce a fake action');
for (const node of nodes.filter(node => node.type.startsWith('motion.') && !node.props.layoutId)) {
  assert.equal(node.props.initial, false, 'Charts must show their final values on first paint');
  assert(!('width' in (node.props.animate || {})), 'Do not animate width every frame');
}
const scales = nodes.filter(node => typeof node.props.animate?.scaleX === 'number').map(node => node.props.animate.scaleX);
assert.deepEqual(scales, [1, .25, 1, .2]);
const segments = nodes.filter(node => node.props.layout === 'size');
assert.equal(segments.length, 3);
assert(Math.abs(segments.reduce((total, node) => total + parseFloat(node.props.style.width), 0) - 100) < .0001);

shortcuts(nodes)[0].props.onMouseEnter();
nodes = render();
assert.equal(highlighted(nodes)[0].props.href, '/bmn/assets');
shortcuts(nodes)[1].props.onMouseEnter();
nodes = render();
assert.equal(highlighted(nodes)[0].props.href, '/bmn/loans');
shortcuts(nodes)[0].props.onFocus();
shortcuts(nodes)[3].props.onMouseEnter();
nodes = render();
assert.equal(highlighted(nodes)[0].props.href, '/bmn/assets', 'Keyboard focus takes priority over hover');
group(nodes).props.onMouseLeave();
nodes = render();
assert.equal(highlighted(nodes)[0].props.href, '/bmn/assets', 'Pointer leaving must not erase keyboard feedback');
group(nodes).props.onBlur({ currentTarget: { contains: () => true }, relatedTarget: {} });
assert.equal(highlighted(render()).length, 1, 'Moving focus within the grid retains feedback');
group(nodes).props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
assert.equal(highlighted(render()).length, 0, 'Leaving the grid clears feedback');

shortcuts(render())[0].props.onFocus();
const firstId = render().find(node => node.props.layoutId).props.layoutId;
instanceId = 'dashboard-b';
assert.notEqual(render().find(node => node.props.layoutId).props.layoutId, firstId, 'Highlight IDs must be instance-scoped');
query = { data: undefined, isLoading: true };
assert(render().find(node => node.props.role === 'status').props.className.includes('motion-reduce:animate-none'));
query = { data: { ...sample, total_asset: 0, asset_by_condition: {}, asset_by_jenis: [], asset_by_lokasi: [] }, isLoading: false };
nodes = render();
assert(!nodes.some(node => node.props.layout === 'size' || typeof node.props.animate?.scaleX === 'number'));
assert(nodes.some(node => node.props.children === '—'), 'Zero assets must not suggest a defined percentage');
console.log('PASS: dashboard fixtures, chart first paint, pointer/focus priority, blur cleanup, instance IDs, loading, and zero assets.');
