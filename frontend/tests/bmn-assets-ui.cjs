/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node check, matching frontend/tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual page with isolated query data; no browser, credentials or real API writes.
let params = new URLSearchParams();
let writable = true;
let view = 'table';
let state = [], cursor = 0;
let replacedUrl;
const queries = new Map();
const assets = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Tidak diketahui'].map((kondisi, i) => ({
  id: `asset-${i}`, kode_barang: '123', nup: `${i}`, nama_barang: `Fixture ${i}`,
  kondisi, nilai_perolehan: 1000, tags: [],
  pengguna: i === 0 ? 'Fixture User' : undefined,
  nup_lama: i === 0 ? 'OLD-123' : undefined,
}));
let result = { data: { data: assets, meta: { last_page: 2, total: 14 } }, isLoading: false, isFetching: false };
let lastRequest;
const element = (type, props) => ({ type, props: props || {} });
const imports = {
  react: { useId: () => 'fixture', useMemo: fn => fn(), useState: initial => {
    const i = cursor++;
    if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
    return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
  } },
  'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
  '@tanstack/react-query': { useQuery: options => {
    queries.set(options.queryKey[0], options);
    return options.queryKey[0] === 'bmn-assets' ? result : { data: [] };
  }, useQueryClient: () => ({ invalidateQueries() {} }) },
  'next/link': { default: 'a' },
  'next/navigation': { useSearchParams: () => params, useRouter: () => ({ replace: url => { replacedUrl = url; } }) },
  'lucide-react': new Proxy({}, { get: (_, key) => `icon:${String(key)}` }),
  'framer-motion': { motion: new Proxy({}, { get: (_, key) => `motion.${String(key)}` }) },
  '@/hooks/useRole': { useRole: () => ({ hasPermission: () => writable }) },
  '@/hooks/use-debounce': { useDebounce: value => value },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  '@/lib/api': { api: {
    get: async (...args) => { lastRequest = args; return { data: result.data }; },
    post() { throw new Error('Unexpected API write'); }, delete() { throw new Error('Unexpected API write'); },
  } },
  sonner: { toast: { success() {}, error() {} } },
  '@/components/ui/button': { Button: props => props.asChild
    ? element(props.children.type, { ...props, ...props.children.props, children: props.children.props.children })
    : element('button', props) },
  '@/components/ui/confirm-dialog': { useConfirm: () => async () => false },
  '@/components/ui/popover': { Popover: 'popover', PopoverTrigger: 'trigger', PopoverContent: 'popover-content' },
  '@/app/bmn/_components/AssetImportDialog': { AssetImportDialog: 'import-dialog' },
  '@/app/bmn/_components/TagAssignmentDialog': { TagAssignmentDialog: 'tag-dialog' },
  '@/app/bmn/_components/TagFilterCombobox': { TagFilterCombobox: 'tag-filter' },
  '@/app/bmn/_components/AssetTagsList': { AssetTagsList: 'tag-list' },
  '@/app/bmn/_lib/asset-utils': { formatRupiah: value => `Rp ${value}`, deduplicateMerkTipe: value => value, shortenLokasi: value => value, getAssetUser: asset => asset.pengguna || asset.nama_pengguna || asset.penanggung_jawab?.nama_lengkap || null },
  '@/app/bmn/_lib/tag-utils': { getTagColorClasses: () => ({}) },
  '@/app/bmn/_lib/location-options': { SIMAN_LOKASI_RUANG_OPTIONS: [] },
  './assets.css': {},
  './use-asset-view': { useAssetView: () => [view, value => { view = value; }] },
  './_components/AssetPhotoPreview': { AssetPhotoPreview: 'photo-preview' },
  '@/app/bmn/_lib/asset-photos': { getPrimaryPhoto: () => null },
};
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/bmn/assets/page.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText, { module: moduleObject, exports: moduleObject.exports, URLSearchParams, require: key => {
  assert(key in imports, `Unexpected import ${key}`); return imports[key];
} }, { timeout: 1000 });
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  return [node, ...flatten(node.props.children)];
}
function render() { cursor = 0; return flatten(moduleObject.exports.default()); }
function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  return typeof node === 'object' && node ? content(node.props.children) : (node ?? '');
}
function button(nodes, text) { return nodes.find(n => n.type === 'button' && content(n).trim() === text); }
function reset(search = '') { state = []; params = new URLSearchParams(search); return render(); }

// Check the real solid token pairs used by Data Aset, without rounding into a pass.
const css = fs.readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');
const themeBlocks = [...css.matchAll(/\[data-module="bmn"\]\s*\{([^}]+)\}/g)].map(match => Object.fromEntries(
  [...match[1].matchAll(/--ds-([\w-]+):\s*(#[a-f0-9]{6})/gi)].map(pair => [pair[1], pair[2]])
));
function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
assert.equal(themeBlocks.length, 2);
for (const tokens of themeBlocks) {
  for (const bg of ['canvas', 'surface', 'surface-raised', 'surface-muted']) {
    assert(contrast(tokens.fg, tokens[bg]) >= 4.5, `Foreground on ${bg}`);
    assert(contrast(tokens['fg-muted'], tokens[bg]) >= 4.5, `Muted foreground on ${bg}`);
  }
  for (const state of ['solid', 'hover', 'active']) {
    assert(contrast(tokens['accent-on-solid'], tokens[`accent-${state}`]) >= 4.5, `Accent ${state}`);
    assert(contrast(tokens['danger-on-solid'], tokens[`danger-${state}`]) >= 4.5, `Danger ${state}`);
  }
  for (const bg of ['surface', 'canvas', 'secondary-bg']) {
    assert(contrast(tokens['border-control'], tokens[bg]) >= 3, `Control border on ${bg}`);
  }
  for (const status of ['success', 'warning', 'danger', 'info', 'neutral']) {
    assert(contrast(tokens[`status-${status}-fg`], tokens[`status-${status}-bg`]) >= 4.5, `Status ${status}`);
  }
}

(async () => {
  let nodes = reset();
  assert.deepEqual(nodes.filter(n => n.props['data-status']).map(n => n.props['data-status']), ['success', 'warning', 'danger', 'neutral']);
  assert(!nodes.some(n => n.props.href === '/bmn/assets/create'), 'Manual asset creation is removed');
  assert(nodes.some(n => n.type === 'import-dialog'), 'Keep Excel import for authorized users');
  assert(button(nodes, 'Sebelumnya').props.disabled);
  assert(!button(nodes, 'Berikutnya').props.disabled);
  button(nodes, 'Berikutnya').props.onClick();
  nodes = render();
  assert(button(nodes, 'Berikutnya').props.disabled, 'Use meta.last_page at the final page');
  assert.equal(new URLSearchParams(replacedUrl.slice(1)).get('page'), '2');
  nodes.find(n => n.type === 'button' && flatten(n.props.children).some(c => c.props.children === 'Rusak Ringan')).props.onClick();
  nodes = render();
  assert.equal(queries.get('bmn-assets').queryKey[3], 1, 'Filter changes reset pagination');
  assert.equal(new URLSearchParams(replacedUrl.slice(1)).get('kondisi'), 'Rusak Ringan');
  nodes.find(n => n.props['aria-label'] === 'Pilih aset Fixture 0 NUP 0').props.onChange();
  nodes = render();
  assert.equal(nodes.filter(n => n.type === 'tr' && n.props['aria-selected']).length, 1);
  const queryBeforeSwitch = JSON.stringify(queries.get('bmn-assets').queryKey);
  button(nodes, 'Grid').props.onClick();
  nodes = render();
  assert.equal(nodes.filter(n => n.type === 'table').length, 0, 'Only render the active view');
  assert.equal(nodes.filter(n => n.type === 'article' && n.props['data-selected']).length, 1);
  assert.equal(nodes.filter(n => n.type === 'photo-preview').length, assets.length);
  assert(nodes.some(n => n.type === 'p' && content(n).includes('Pengguna: Fixture User')));
  assert.equal(nodes.filter(n => n.type === 'p' && content(n) === 'NUP Lama: OLD-123').length, 1);
  assert.equal(JSON.stringify(queries.get('bmn-assets').queryKey), queryBeforeSwitch, 'Switching view preserves query/filter/pagination');
  button(nodes, 'Tabel').props.onClick();
  nodes = render();
  assert.equal(nodes.filter(n => n.type === 'article').length, 0);
  assert.equal(nodes.filter(n => n.type === 'tr' && n.props['aria-selected']).length, 1);
  button(nodes, 'Batal').props.onClick();
  assert.equal(render().filter(n => n.type === 'tr' && n.props['aria-selected']).length, 0);
  reset('per_page=0');
  render().find(n => n.props['aria-label'] === 'Jumlah aset per halaman').props.onChange({ target: { value: '0' } });
  assert.equal(new URLSearchParams(replacedUrl.slice(1)).get('per_page'), '0', 'Keep large-page selection in the URL');
  await queries.get('bmn-assets').queryFn();
  assert.equal(lastRequest[1].params.per_page, 2000, 'Large page size must match the backend cap');
  writable = false;
  result = { data: undefined, isLoading: true, isFetching: true };
  nodes = reset();
  assert(!nodes.some(n => n.type === 'import-dialog'), 'Read-only users cannot import');
  assert(!nodes.some(n => n.props.type === 'checkbox' || n.props.href === '/bmn/assets/create'));
  assert(nodes.filter(n => n.type === 'td').every(n => n.props.colSpan === 7));
  assert(button(nodes, 'Berikutnya').props.disabled);
  view = 'grid';
  result = { data: { data: [], meta: { last_page: 1, total: 0 } }, isLoading: false, isFetching: false };
  nodes = render();
  assert(nodes.some(n => n.props.children === 'Tidak ada data ditemukan'));
  result = { data: { data: assets, meta: { last_page: 1, total: 4 } }, isLoading: false, isFetching: false };
  nodes = render();
  assert.equal(nodes.filter(n => n.type === 'article').length, 4);
  assert(!nodes.some(n => n.props.type === 'checkbox' || n.props['aria-label']?.startsWith('Dispose aset')));
  result = { data: undefined, isLoading: true, isFetching: true };
  assert(render().some(n => n.props['aria-label'] === 'Memuat grid aset'));
  view = null;
  assert(render().some(n => n.props['aria-label'] === 'Menyiapkan tampilan aset'));
  view = 'table';
  result = { data: { data: [], meta: { last_page: 1, total: 0 } }, isLoading: false, isFetching: false };
  nodes = render();
  assert(nodes.some(n => n.props.children === 'Tidak ada data ditemukan'));
  assert(button(nodes, 'Berikutnya').props.disabled);
  console.log('PASS: solid token contrast, table/grid selection and query continuity, user/legacy NUP, pagination/filter/page cap, read-only/loading/empty/preparation states.');
})().catch(error => { console.error(error); process.exitCode = 1; });
