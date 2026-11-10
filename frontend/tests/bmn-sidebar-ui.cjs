/* eslint-disable @typescript-eslint/no-require-imports -- Isolated source fixture, no live data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let state = [], cursor = 0, writable = true, reduced = false;
let permissions = null;
let pathname = "/bmn/loans/create";
let response = {}, requested, writes = 0;
let consoleErrors = 0;
const toastErrors = [];
let mutationOptions, mutationPayload, mutationPending = false;
let returnedFocus = 0;
const documentStub = { activeElement: { focus() { returnedFocus++; } }, getElementById: () => ({ focus() { returnedFocus++; }, scrollIntoView() {} }) };
let downloaded = null;
const revokedUrls = [];
const fixtureUrl = { createObjectURL: () => 'blob:fixture', revokeObjectURL: url => revokedUrls.push(url) };
documentStub.body = { appendChild() {} };
documentStub.createElement = () => ({ setAttribute(key, value) { if (key === 'download') downloaded = value; }, click() {}, parentNode: { removeChild() {} } });
const queries = new Map();
const queryResponses = new Map();
const effects = [];
const jsx = (type, props, key) => ({ type, props: props || {}, key });
const react = {
  useCallback: fn => fn,
  use: value => value,
  useRef: initial => {
    const index = cursor++;
    if (!(index in state)) state[index] = { current: initial };
    return state[index];
  },
  useId: () => 'fixture', useMemo: fn => fn(),
  useState: initial => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  },
  useEffect: (fn, deps) => {
    const index = cursor++;
    if (!state[index] || deps.some((v, i) => !Object.is(v, state[index][i]))) {
      state[index] = deps;
      effects.push(fn);
    }
  },
};
react.default = react;
const imports = {
  react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  'lucide-react': new Proxy({}, { get: (_, key) => `icon:${String(key)}` }),
  '@tanstack/react-query': { useMutation: options => { mutationOptions = options; return { isPending: mutationPending, mutate: payload => { mutationPayload = payload; } }; }, useQuery: options => { queries.set(options.queryKey[0], options); return queryResponses.get(options.queryKey[0]) || response; }, useQueryClient: () => ({ invalidateQueries() {} }) },
  '@/lib/utils': { cn: (...parts) => parts.filter(Boolean).join(' ') },
  '@/lib/api': { api: { get: async (...args) => { requested = args; return { data: response.data }; }, post() { writes++; throw Error('No writes'); }, put() { writes++; throw Error('No writes'); }, delete() { writes++; throw Error('No writes'); } } },
  'next/navigation': { usePathname: () => pathname, useRouter: () => ({ push() {}, back() {}, refresh() {} }) },
  'sonner': { toast: { error: message => toastErrors.push(message), success() {}, info() {} } },
  'framer-motion': { motion: { span: 'motion.span', div: 'motion.div' }, AnimatePresence: 'presence', useReducedMotion: () => reduced },
  '@/hooks/useRole': { useRole: () => ({ canWrite: writable, isAdmin: false, hasPermission: name => permissions ? permissions.has(name) : writable }) },
  'next/link': { default: 'a' },
  '@/components/ui/button': { Button: 'button' },
  '@/components/ui/label': { Label: 'label' },
  '@/components/ui/badge': { Badge: 'badge' },
  '@/components/ui/input': { Input: 'input' },
  '@/components/ui/checkbox': { Checkbox: 'checkbox' },
  '@/hooks/use-debounce': { useDebounce: value => value },
  '@/components/ui/textarea': { Textarea: 'textarea' },
  '@/components/ui/employee-select': { EmployeeSelect: 'employee-select' },
  '@/components/ui/dialog': { Dialog: props => props.open ? jsx('dialog', props) : null, DialogContent: 'dialog-content', DialogHeader: 'header', DialogDescription: 'description', DialogFooter: 'footer', DialogTitle: 'h2' },
  '@/components/ui/select': Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(k => [k, k])),
  '@/app/bmn/_lib/asset-utils': { formatRupiah: n => `Rp ${n}`, getAssetUser: a => a.pengguna },
  '@/app/bmn/_lib/asset-photos': { getPrimaryPhoto: () => null },
  'use-debounce': { useDebounce: value => [value] },
  '@/components/ui/popover': { Popover: 'popover', PopoverTrigger: 'popover-trigger', PopoverContent: 'popover-content' },
  '@/components/ui/confirm-dialog': { useConfirm: () => async options => { assert.equal(options.contentModule, 'bmn'); return false; } },
  '@/lib/letter-utils': { formatNipLabel: () => 'NIP' },
};
imports['@/lib/api'].default = imports['@/lib/api'].api;
function load(name) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/bmn', name), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: mod, exports: mod.exports, AbortController, Blob, URL: fixtureUrl, window: { URL: fixtureUrl }, document: documentStub, console: { error() { consoleErrors++; } }, require: key => { assert(key in imports, key); return imports[key]; } });
  return mod.exports;
}
function flat(node) {
  if (Array.isArray(node)) return node.flatMap(flat);
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return flat(node.type(node.props));
  return [node, ...flat(node.props.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  return node && typeof node === 'object' ? text(node.props.children) : typeof node === 'boolean' ? '' : node ?? '';
}
function render(fn, props = {}) { cursor = 0; return flat(fn(props)); }
function reset() { state = []; cursor = 0; effects.length = 0; }
const button = (nodes, label) => nodes.find(n => n.type === 'button' && (n.props['aria-label'] || text(n).trim()) === label);
imports['../auction-batches/_lib/api'] = { getCandidates() {}, createBatch() {} };
imports['./_lib/auction-helpers'] = load('auction-candidates/_lib/auction-helpers.ts');
const candidates = load('auction-candidates/page.tsx').default;
const transition = load('_components/BmnTabContent.tsx');
imports['@/app/bmn/_components/BmnTabContent'] = transition;
const auctionApi = load('auction-batches/_lib/api.ts');
for (const key of ['./_lib/api', '../_lib/api', '../../_lib/api', '../auction-batches/_lib/api']) imports[key] = auctionApi;
imports['./_lib/status'] = load('auction-batches/_lib/status.ts'); imports['../_lib/status'] = imports['./_lib/status'];
for (const key of ['../auction-candidates/_lib/auction-helpers', '../../auction-candidates/_lib/auction-helpers', '../../../auction-candidates/_lib/auction-helpers']) imports[key] = imports['./_lib/auction-helpers'];
imports['../../../auction-candidates/_components/KertasKerjaAssetSection'] = { KertasKerjaAssetSection: 'worksheet' };
imports['./AuctionDocumentRenderer'] = { AuctionDocumentRenderer: 'paper-preview' };
for (const name of ['sk-defaults', 'sk-panitia-defaults', 'sk-tim-penilai-defaults']) {
  const entry = load(`auction-candidates/_lib/${name}.ts`);
  imports[`./${name}`] = entry;
  imports[`../../auction-candidates/_lib/${name}`] = entry;
  imports[`../../../auction-candidates/_lib/${name}`] = entry;
}
imports['../../_lib/document-content-defaults'] = load('auction-batches/_lib/document-content-defaults.ts');
const documentEditor = load('auction-batches/[id]/_components/DocumentContentEditorModal.tsx').DocumentContentEditorModal;
imports['./DocumentContentEditorModal'] = { DocumentContentEditorModal: documentEditor };
const committee = load('auction-batches/[id]/_components/CommitteePicker.tsx'); imports['./CommitteePicker'] = committee;
imports['../_lib/document-workflow'] = load('auction-batches/[id]/_lib/document-workflow.ts');
imports['../_lib/auction-print-dispatcher'] = { printAuctionDocument() { throw Error('No printing'); } };
imports['../../../auction-candidates/_lib/print-pernyataan'] = { PERNYATAAN_PRINT_CSS: '' };
const auctionForms = ['AssetsLot', 'Valuation', 'DocumentsCenter', 'Realization'].map(name => {
  const entry = load(`auction-batches/[id]/_components/${name}Tab.tsx`);
  imports[`./_components/${name}Tab`] = entry; return { ...entry, name };
});
const auctionAudit = load('auction-batches/[id]/_components/AuditTrailTab.tsx').AuditTrailTab;
imports['./_components/AuditTrailTab'] = { AuditTrailTab: 'auction-audit' };
imports['./_lib/workflow-tabs'] = load('auction-batches/[id]/_lib/workflow-tabs.ts');
imports['@/components/ui/tabs'] = { Tabs: 'tabs', TabsContent: 'tab-panel', TabsList: 'tablist', TabsTrigger: 'tab' };
const auctionList = load('auction-batches/page.tsx').default;
const auctionDetail = load('auction-batches/[id]/page.tsx').default;
for (const [module, component] of [['module-switcher', 'ModuleSwitcher'], ['logout-button', 'LogoutButton'], ['theme-toggle', 'ThemeToggle'], ['RouteGuard', 'RouteGuard']]) imports[`@/components/${module}`] = { [component]: component };
imports['@/hooks/useAuth'] = { useAuth: () => ({ user: { name: 'Fixture', role: 'pegawai' } }) };
imports['./assets/assets.css'] = {}; imports['./bmn-ui.css'] = {};
const shell = load('layout.tsx').default;

const catalog = load('loans/create/_components/AssetCatalogModal.tsx');
imports['./_components/AssetCatalogModal'] = catalog;
imports['./_components/ReturnLoanModal'] = load('loans/_components/ReturnLoanModal.tsx');
const loans = load('loans/page.tsx').default;
const form = load('loans/create/page.tsx').default;
const maintenance = load('maintenances/page.tsx').default;
const importList = load('import-review/page.tsx').default;
const importDetail = load('import-review/[batchId]/page.tsx').default;
const disposal = load('disposal/page.tsx').default;
imports['../../_lib/tag-utils'] = load('_lib/tag-utils.ts');
imports['../_lib/types'] = load('settings/_lib/types.ts');
imports['./_lib/types'] = imports['../_lib/types'];
imports['../_lib/tag-utils'] = imports['../../_lib/tag-utils'];
imports['../_components/TablePaginationFooter'] = load('settings/_components/TablePaginationFooter.tsx');
const tagTab = load('settings/_tabs/TagManagementTab.tsx').TagManagementTab;
const locationTab = load('settings/_tabs/LocationManagementTab.tsx').LocationManagementTab;
const typeTab = load('settings/_tabs/AssetTypeManagementTab.tsx').AssetTypeManagementTab;
imports['./_tabs/TagManagementTab'] = { TagManagementTab: 'tag-tab' };
imports['./_tabs/LocationManagementTab'] = { LocationManagementTab: 'location-tab' };
imports['./_tabs/AssetTypeManagementTab'] = { AssetTypeManagementTab: 'type-tab' };
const settings = load('settings/page.tsx').default;
imports['../_lib/report-utils'] = { formatDate: value => value, isDraftNumber: value => value.startsWith('DRAFT') };
imports['./_lib/report-utils'] = imports['../_lib/report-utils'];
imports['../_lib/types'] = { DEFAULT_FIRST_PARTY: {}, DEFAULT_POA_FIRST_PARTY: {} };
imports['../_lib/report-actions'] = load('reports/_lib/report-actions.ts');
for (const name of ['UsageAgreement', 'HandoverAgreement', 'PowerOfAttorney', 'CoveringLetter']) {
  imports[`../_components/${name}Document`] = { [`${name}Document`]: `${name}-document` };
}
const exportsTab = load('reports/_tabs/ExportReportsTab.tsx').ExportReportsTab;
const historyTab = load('reports/_tabs/DocumentHistoryTab.tsx').DocumentHistoryTab;
const recentDocuments = load('reports/_components/RecentDocumentTable.tsx').RecentDocumentTable;
for (const name of ['ExportReports', 'UsageAgreement', 'HandoverAgreement', 'PowerOfAttorney', 'CoveringLetter', 'DocumentHistory']) {
  imports[`./_tabs/${name}Tab`] = { [`${name}Tab`]: `${name}-tab`, [`use${name}FormState`]: () => ({}) };
}
const reportsPage = load('reports/page.tsx').default;
// Load the four actual form hooks/components for parent-owned draft/remount checks.
imports['../_lib/report-utils'] = load('reports/_lib/report-utils.ts');
imports['../_lib/types'] = load('reports/_lib/types.ts');
imports['../_components/RecentDocumentTable'] = { RecentDocumentTable: recentDocuments };
imports['../_components/AssetSelectionTable'] = load('reports/_components/AssetSelectionTable.tsx');
const reportForms = ['UsageAgreement', 'PowerOfAttorney', 'HandoverAgreement', 'CoveringLetter'].map(name => ({ name, ...load(`reports/_tabs/${name}Tab.tsx`) }));

(async () => {
  response = { data: { data: ['dipinjam', 'dikembalikan', 'terlambat', 'lainnya'].map((status, i) => ({ id: `loan-${i}`, status, asset: { nama_barang: 'Fixture' } })), meta: { last_page: 2, total: 4 } } };
  reset(); let nodes = render(loans);
  assert.deepEqual(nodes.filter(n => n.type === 'badge').map(n => n.props['data-status']), ['info', 'success', 'danger', 'neutral']);
  button(nodes, 'Selanjutnya').props.onClick(); nodes = render(loans);
  assert(button(nodes, 'Selanjutnya').props.disabled);
  button(nodes, 'Terlambat').props.onClick(); nodes = render(loans);
  assert.equal(queries.get('bmn-loans').queryKey[1], 1);
  assert.equal(queries.get('bmn-loans').queryKey[2], 'terlambat');
  button(nodes, 'Edit Peminjaman').props.onClick(); nodes = render(loans);
  assert(nodes.some(n => n.type === 'input' && n.props['aria-label'] === 'Tanggal Pinjam'));
  nodes.find(n => n.type === 'dialog').props.onOpenChange(false);
  writable = false; reset(); nodes = render(loans);
  assert(!button(nodes, 'Hapus Catatan'));
  response = { data: { data: [] }, isLoading: false }; nodes = render(loans);
  assert(text(nodes[0]).includes('Belum ada data peminjaman'));
  response = { isLoading: true }; assert(render(loans).some(n => n.props.colSpan === 7));
  response = { isError: true }; assert(button(render(loans), 'Coba lagi'));

  reset(); response = { data: { data: [], meta: { last_page: 1 } } };
  nodes = render(maintenance); assert(button(nodes, 'Selanjutnya').props.disabled);
  response = { data: { data: [], meta: { last_page: 2 } } }; nodes = render(maintenance);
  button(nodes, 'Selanjutnya').props.onClick(); nodes = render(maintenance);
  assert(button(nodes, 'Selanjutnya').props.disabled);
  response = { isError: true }; assert(render(maintenance).some(n => n.props.role === 'alert'));

  // Actual catalog fetch effect uses an isolated API stub; selection never writes to a server.
  const assets = [
    { id: 'ok', nama_barang: 'Layak', nup: '1', kondisi: 'Baik', status_bmn: 'Aktif' },
    { id: 'damaged', nama_barang: 'Rusak', nup: '2', kondisi: 'Rusak Berat', status_bmn: 'Aktif' },
    { id: 'loaned', nama_barang: 'Dipinjam', nup: '3', kondisi: 'Baik', status_bmn: 'Aktif', active_loan: { borrower_name: 'Fixture' } },
  ];
  response = { data: { data: assets, meta: { last_page: 1, total: 3 } } };
  let selected;
  const props = { open: true, selectedAssets: [], onOpenChange() {}, onAddAssets: value => { selected = value; } };
  reset(); render(catalog.AssetCatalogModal, props);
  effects.splice(0).forEach(effect => effect());
  await new Promise(setImmediate);
  nodes = render(catalog.AssetCatalogModal, props);
  const cards = nodes.filter(n => n.props.role === 'checkbox');
  assert.equal(cards.length, 3); assert.equal(cards[0].props.tabIndex, 0);
  assert(cards[1].props['aria-disabled']); assert.equal(cards[1].props.tabIndex, -1);
  cards[1].props.onKeyDown({ key: ' ', preventDefault() {} });
  cards[0].props.onKeyDown({ key: ' ', preventDefault() {} });
  nodes = render(catalog.AssetCatalogModal, props);
  nodes.find(n => n.type === 'button' && text(n).includes('Masukkan ke Form Pinjam')).props.onClick();
  assert.equal(selected.length, 1); assert.equal(selected[0].id, 'ok');

  // Wizard selection and draft stay in parent state across all three steps.
  // Feed selection through the actual catalog callback exposed by the page element tree.
  function findRaw(node, type) { if (Array.isArray(node)) return node.map(n => findRaw(n, type)).find(Boolean); if (!node || typeof node !== 'object') return null; return node.type === type ? node : findRaw(node.props.children, type); }
  reset(); cursor = 0;
  const raw = form();
  findRaw(raw, catalog.AssetCatalogModal).props.onAddAssets([assets[0]]);
  nodes = render(form); button(nodes, 'Lanjut').props.onClick(); nodes = render(form);
  nodes.find(n => n.type === 'employee-select').props.onChange(1, { id: 1, name: 'Fixture', nip: null });
  nodes.find(n => n.props['aria-label'] === 'Tanggal Mulai').props.onChange({ target: { value: '2026-11-10' } });
  nodes.find(n => n.props['aria-label'] === 'Tanggal Selesai').props.onChange({ target: { value: '2026-11-11' } });
  nodes.find(n => n.props['aria-label'] === 'Keperluan Peminjaman').props.onChange({ target: { value: 'Tujuan fixture aman' } });
  nodes = render(form); button(nodes, 'Lanjut').props.onClick(); nodes = render(form);
  assert(text(nodes[0]).includes('Konfirmasi Permohonan'));
  button(nodes, 'Kembali').props.onClick(); nodes = render(form);
  assert.equal(nodes.find(n => n.props['aria-label'] === 'Keperluan Peminjaman').props.value, 'Tujuan fixture aman');
  reduced = true; const content = render(transition.BmnTabContent, { value: 'x', children: null }).find(n => n.type === 'motion.div');
  assert.equal(content.props.transition.duration, 0); assert.equal(content.props.initial.y, 0);
  assert.equal(writes, 0); assert.equal(requested[0], '/bmn/assets');
  // Closing a shared employee popup aborts its GET; cancellation must not be rendered as an error.
  const employeeSelect = load('../../components/ui/employee-select.tsx').EmployeeSelect;
  reset(); nodes = render(employeeSelect, { onChange() {}, 'aria-label': 'Nama Peminjam', contentModule: 'bmn', contentClassName: 'bmn-popover' });
  assert.equal(nodes.find(n => n.type === 'button').props['aria-label'], 'Nama Peminjam');
  assert.equal(nodes.find(n => n.type === 'popover-content').props['data-module'], 'bmn');
  nodes.find(n => n.type === 'popover').props.onOpenChange(true);
  render(employeeSelect, { onChange() {} });
  const get = imports['@/lib/api'].api.get;
  imports['@/lib/api'].api.get = () => Promise.reject(new Error('canceled'));
  const cleanups = effects.splice(0).map(effect => effect());
  cleanups.filter(fn => typeof fn === 'function').forEach(cleanup => cleanup());
  await new Promise(setImmediate);
  assert.equal(consoleErrors, 0);
  imports['@/lib/api'].api.get = get;
  // Import states, accessible filters and safe mutation stubs; never contact the live API.
  writable = true; reset();
  response = { data: { data: ['pending', 'approved', 'rejected', 'expired'].map((status, i) => ({ id: i, filename: `fixture-${i}.xlsx`, status, total_rows: 2, created_at: '2026-11-10' })) } };
  nodes = render(importList);
  assert.deepEqual(nodes.filter(n => n.type === 'badge').map(n => n.props['data-status']), ['warning', 'success', 'danger', 'neutral']);
  assert(button(nodes, 'Upload & Analisis').props.disabled);
  writable = false; reset(); nodes = render(importList);
  assert(!nodes.some(n => n.type === 'input' && n.props.type === 'file'));
  response = { isError: true }; assert(render(importList).some(n => n.props.role === 'alert'));
  const detailProps = { params: { batchId: 'fixture-batch' } };
  const batchData = { batch: { id: 'fixture-batch', filename: 'fixture.xlsx', status: 'pending', total_rows: 2, new_rows: 1, updated_rows: 1 }, rows: { data: [
    { id: 'new', diff_status: 'new', selected: true, imported_data: { nama_barang: 'Baru', nup: '1' } },
    { id: 'update', diff_status: 'updated', selected: true, imported_data: { nama_barang: 'Ubah', nup: '2' }, changed_fields: { kondisi: { old: 'Baik', new: 'Rusak Ringan' } } },
  ], last_page: 2, current_page: 1, total: 2 }, selection_summary: { selected_total: 2, selected_new: 1, selected_updated: 1, filtered_new: 1, filtered_updated: 1 } };
  response = { data: batchData }; writable = true; reset(); nodes = render(importDetail, detailProps);
  assert.equal(queries.get('bmn-import-batch').placeholderData(batchData), batchData);
  assert(button(nodes, 'Setujui (2 dipilih)'));
  const calls = [], post = imports['@/lib/api'].api.post;
  imports['@/lib/api'].api.post = async (...args) => { calls.push(args); return { data: { message: 'Fixture' } }; };
  await nodes.find(n => n.type === 'checkbox' && n.props['aria-label'] === 'Setujui kolom Kondisi').props.onCheckedChange(false);
  assert.equal(calls[0][0], '/bmn/import-review/toggle-field-selection');
  assert.equal(calls[0][1].selected, false);
  button(nodes, 'Berikutnya').props.onClick(); nodes = render(importDetail, detailProps);
  assert(button(nodes, 'Berikutnya').props.disabled);
  nodes.find(n => n.type === 'input' && n.props['aria-label'] === 'NUP').props.onChange({ target: { value: '2' } });
  nodes = render(importDetail, detailProps);
  assert.equal(queries.get('bmn-import-batch').queryKey.at(-1), 1);
  assert.equal(queries.get('bmn-import-batch').queryKey[3].nup, '2');
  writable = false; reset(); nodes = render(importDetail, detailProps);
  assert(!button(nodes, 'Setujui (2 dipilih)')); assert(!nodes.some(n => n.type === 'checkbox'));
  response = { isError: true }; assert(render(importDetail, detailProps).some(n => n.props.role === 'alert'));
  // Disposal reads resource metadata; selected items never leak to a new search/page.
  response = { data: { data: [{ id: 'a', nama_barang: 'Fixture', nup: '1', nilai_buku: 0, nilai_perolehan: 100 }], meta: { last_page: 2, total: 11 } } };
  permissions = new Set(['bmn.asset.dispose']); reset(); nodes = render(disposal);
  nodes.find(n => n.type === 'checkbox' && n.props['aria-label'] === 'Pilih Fixture NUP 1').props.onCheckedChange(true);
  nodes = render(disposal); assert(button(nodes, 'Restore')); assert(!button(nodes, 'Hapus Permanen'));
  assert(text(nodes[0]).includes('11 item total'));
  assert(nodes.some(n => n.type === 'p' && text(n) === new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(0)));
  button(nodes, 'Selanjutnya').props.onClick(); nodes = render(disposal);
  assert(button(nodes, 'Selanjutnya').props.disabled); assert(!button(nodes, 'Restore'));
  permissions = new Set(['bmn.asset.force_delete']); reset(); nodes = render(disposal);
  nodes.find(n => n.type === 'checkbox').props.onCheckedChange(true); nodes = render(disposal);
  assert(!button(nodes, 'Restore')); button(nodes, 'Hapus Permanen').props.onClick(); nodes = render(disposal);
  assert.equal(button(nodes, 'Ya, Hapus').props.variant, 'destructive');
  nodes.find(n => n.type === 'input').props.onChange({ target: { value: 'baru' } }); nodes = render(disposal);
  assert(!button(nodes, 'Ya, Hapus')); assert(!button(nodes, 'Hapus Permanen'));
  permissions = new Set(); reset(); assert(!render(disposal).some(n => n.type === 'checkbox'));
  response = { isError: true }; assert(render(disposal).some(n => n.props.role === 'alert'));
  imports['@/lib/api'].api.post = post; permissions = null;
  assert.equal(writes, 0);
  // Simulate unmounting only the form child while its draft hook stays in the page owner.
  const sequenceKeys = ['baSequence', 'poaSequence', 'handoverSequence', 'coveringSequence'];
  for (let i = 0; i < reportForms.length; i++) {
    const entry = reportForms[i], hook = entry[`use${entry.name}FormState`], component = entry[`${entry.name}Tab`];
    response = { data: [] }; reset(); cursor = 0;
    let draft = hook(null); const ownerSlots = cursor;
    const props = { employees: [{ id: 1, nama_lengkap: 'Automatic fixture', nip: '' }], vehicleAssetOptions: [], editingDocument: null, canGenerate: false };
    flat(component({ ...props, formState: draft }));
    effects.splice(0).forEach(effect => effect());
    cursor = 0; draft = hook(null);
    const field = sequenceKeys[i], setter = `set${field[0].toUpperCase()}${field.slice(1)}`;
    draft[setter]('777');
    const party = i === 0 ? ['setFirstPartyEmployeeId', 'setFirstParty', 'firstParty'] : i === 1 ? ['setPoaFirstEmployeeId', 'setPoaFirstParty', 'poaFirstParty'] : i === 3 ? ['setCoveringSenderEmployeeId', 'setCoveringSender', 'coveringSender'] : null;
    if (party) { draft[party[0]]('1'); draft[party[1]]({ name: 'Manual retained' }); }
    state = state.slice(0, ownerSlots); // Child fiber is gone, page owner remains.
    cursor = 0; draft = hook(null);
    flat(component({ ...props, formState: draft }));
    effects.splice(0).forEach(effect => effect());
    cursor = 0; draft = hook(null);
    assert.equal(draft[field], '777', `${entry.name}: draft survives child remount`);
    if (party) assert.equal(draft[party[2]].name, 'Manual retained');
  }
  // Historical BA assets/selection survive the employee GET used to populate available assets.
  const usage = reportForms[0];
  const edit = { id: 'doc', type: 'usage', item: { number: 'BA.1/K.18/TU/KAP.03.02/B/11/2026', employee: { id: 1 }, asset_ids: ['historic'], assets_snapshot: [{ id: 'historic', nama_barang: 'Arsip', nup: '1' }] } };
  const originalGet = imports['@/lib/api'].api.get;
  let usageGets = 0;
  imports['@/lib/api'].api.get = async endpoint => { usageGets++; return { data: { data: endpoint === '/bmn/assets' ? [{ id: 'current', nama_barang: 'Kini', nup: '2' }] : [] } }; };
  reset(); cursor = 0; let draft = usage.useUsageAgreementFormState(edit); const ownerSlots = cursor;
  const usageProps = { editingDocument: edit, employees: [{ id: 1, nama_lengkap: 'Fixture', nip: '' }] };
  flat(usage.UsageAgreementTab({ ...usageProps, formState: draft }));
  effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate);
  cursor = 0; draft = usage.useUsageAgreementFormState(edit);
  assert.deepEqual(Array.from(draft.selectedAssetIds), ['historic']);
  assert(draft.assets.some(asset => asset.id === 'historic'));
  assert(draft.assets.some(asset => asset.id === 'current'));
  draft.setBaSequence('888'); state = state.slice(0, ownerSlots);
  cursor = 0; draft = usage.useUsageAgreementFormState(edit);
  flat(usage.UsageAgreementTab({ ...usageProps, formState: draft }));
  effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate);
  cursor = 0; draft = usage.useUsageAgreementFormState(edit);
  assert.equal(draft.baSequence, '888'); assert.equal(usageGets, 2);
  imports['@/lib/api'].api.get = originalGet;
  const poa = reportForms[1];
  reset(); cursor = 0; draft = poa.usePowerOfAttorneyFormState(null); let poaOwnerSlots = cursor;
  const poaProps = { editingDocument: null, employees: [{ id: 1, nama_lengkap: 'Fixture', nip: '' }], vehicleAssetOptions: [], canGenerate: true };
  flat(poa.PowerOfAttorneyTab({ ...poaProps, formState: draft })); effects.splice(0).forEach(effect => effect());
  cursor = 0; draft = poa.usePowerOfAttorneyFormState(null); draft.setSelectedEmployeeId('1');
  cursor = 0; draft = poa.usePowerOfAttorneyFormState(null);
  nodes = flat(poa.PowerOfAttorneyTab({ ...poaProps, formState: draft }));
  let upload = nodes.find(n => n.type === 'input' && n.props.type === 'file');
  upload.props.onChange({ target: { files: [{ type: 'text/plain', size: 10 }] } });
  cursor = 0; draft = poa.usePowerOfAttorneyFormState(null); assert.equal(draft.poaKtpFile, null);
  upload.props.onChange({ target: { files: [{ type: 'image/png', size: 5 * 1024 * 1024 + 1 }] } });
  cursor = 0; draft = poa.usePowerOfAttorneyFormState(null); assert.equal(draft.poaKtpFile, null);
  upload.props.onChange({ target: { files: [{ name: 'fixture.png', type: 'image/png', size: 10 }] } });
  cursor = 0; draft = poa.usePowerOfAttorneyFormState(null); poaOwnerSlots = cursor;
  const ownerCleanups = effects.splice(0).map(effect => effect()).filter(effect => typeof effect === 'function');
  assert.equal(draft.poaKtpPreviewUrl, 'blob:fixture');
  state = state.slice(0, poaOwnerSlots); cursor = 0; draft = poa.usePowerOfAttorneyFormState(null);
  nodes = flat(poa.PowerOfAttorneyTab({ ...poaProps, formState: draft })); effects.splice(0).forEach(effect => effect());
  assert.equal(draft.poaKtpFile.name, 'fixture.png'); assert.equal(revokedUrls.length, 0);
  ownerCleanups.forEach(cleanup => cleanup()); assert.deepEqual(revokedUrls, ['blob:fixture']);
  cursor = 0; draft = poa.usePowerOfAttorneyFormState(null);
  nodes = flat(poa.PowerOfAttorneyTab({ ...poaProps, canGenerate: false, formState: draft }));
  upload = nodes.find(n => n.type === 'input' && n.props.type === 'file'); assert(upload.props.disabled);
  const handover = reportForms[2];
  response = { isError: true }; reset(); cursor = 0; draft = handover.useHandoverAgreementFormState(null);
  nodes = flat(handover.HandoverAgreementTab({ editingDocument: null, employees: [], formState: draft }));
  assert(nodes.some(n => n.props.role === 'alert' && text(n).includes('Daftar barang BMN gagal dimuat')));
  response = { data: [{ id: 'vehicle', nama_barang: 'Kendaraan fixture', nup: '1' }] };
  draft.setHandoverVariant('vehicle'); cursor = 0; draft = handover.useHandoverAgreementFormState(null);
  nodes = flat(handover.HandoverAgreementTab({ editingDocument: null, employees: [], formState: draft }));
  nodes.find(n => n.type === 'input' && n.props['aria-label'] === 'Pilih kendaraan Kendaraan fixture NUP 1').props.onChange();
  cursor = 0; draft = handover.useHandoverAgreementFormState(null);
  assert.deepEqual(Array.from(draft.selectedVehicleAssetIds), ['vehicle']);
  nodes = flat(handover.HandoverAgreementTab({ editingDocument: null, employees: [], formState: draft }));
  assert(nodes.some(n => n.type === 'tr' && n.props['aria-selected'] === true));
  assert.equal(writes, 0);
  // Report export controls and independent generate/delete permissions.
  response = { data: [] }; permissions = new Set(['bmn.document.delete']); reset(); nodes = render(reportsPage);
  nodes.find(n => n.props.role === 'tab' && text(n).trim() === 'Riwayat Dokumen').props.onClick();
  nodes = render(reportsPage);
  assert.equal(nodes.find(n => n.type === 'DocumentHistory-tab').props.canDelete, true);
  assert.equal(nodes.find(n => n.type === 'DocumentHistory-tab').props.canWrite, false);
  response = { isError: true }; assert(render(reportsPage).some(n => n.props.role === 'alert'));
  permissions = null; reset(); response = { data: new Blob(['fixture']) }; nodes = render(exportsTab);
  const exporting = button(nodes, 'Unduh Excel Biaya Pemeliharaan').props.onClick();
  nodes = render(exportsTab); assert(button(nodes, 'Unduh Excel Biaya Pemeliharaan').props.disabled);
  await exporting; nodes = render(exportsTab);
  assert(!button(nodes, 'Unduh Excel Biaya Pemeliharaan').props.disabled);
  assert.equal(downloaded, 'Pemeliharaan_BMN.xlsx'); assert.equal(requested[0], '/bmn/maintenances/export');
  const historyItem = { id: 'doc', document_type: 'usage_agreement', number: 'BA.1', status: 'published', document_date: '2026-11-10', assets_snapshot: [] };
  response = { data: { data: [historyItem], meta: { current_page: 1, last_page: 1, total: 1 } } };
  const historyProps = { employees: [], onEdit() {}, onDuplicate() {}, canWrite: false, canDelete: true };
  reset(); nodes = render(historyTab, historyProps);
  assert(button(nodes, 'Hapus')); assert(!button(nodes, 'Edit')); assert(!button(nodes, 'Duplikasi'));
  button(nodes, 'Lihat').props.onClick(); nodes = render(historyTab, historyProps);
  assert(nodes.some(n => n.type === 'UsageAgreement-document'));
  reset(); nodes = render(historyTab, { ...historyProps, canWrite: true, canDelete: false });
  assert(!button(nodes, 'Hapus')); assert(button(nodes, 'Edit')); assert(button(nodes, 'Duplikasi'));
  reset(); nodes = render(recentDocuments, { items: [historyItem], canWrite: false, canDelete: true, onEdit() {}, onDelete() {}, onDuplicate() {} });
  assert(button(nodes, 'Hapus')); assert(!button(nodes, 'Edit')); assert(!button(nodes, 'Duplikasi'));
  assert.equal(writes, 0);
  // Master data: each real tab keeps its own form draft and guards invalid actions.
  writable = true; reduced = false;
  response = { data: [] }; reset(); nodes = render(settings);
  let tabs = nodes.filter(n => n.props.role === 'tab');
  assert.equal(tabs.length, 3); assert.equal(tabs[0].props['aria-selected'], true);
  tabs[0].props.onKeyDown({ key: 'ArrowRight', preventDefault() {} }); nodes = render(settings);
  assert(nodes.some(n => n.type === 'location-tab'));
  const panel = nodes.find(n => n.props.role === 'tabpanel');
  tabs = nodes.filter(n => n.props.role === 'tab');
  assert.equal(panel.props['aria-labelledby'], tabs[1].props.id);
  assert.equal(tabs[1].props['aria-controls'], panel.props.id);
  response = { isError: true }; assert(render(settings).some(n => n.props.role === 'alert'));
  const tags = [{ id: 'main', label: '#main', name: 'main', color: 'emerald', sub_tags_count: 1 }, { id: 'sub', parent_id: 'main', label: '#sub', name: 'sub', color: 'emerald' }];
  const tagProps = { tags, isLoading: false, canManage: true };
  reset(); nodes = render(tagTab, tagProps);
  assert(nodes.some(n => n.props.disabled && n.props.title?.includes('Hapus sub-tag')));
  button(nodes, 'Tambah Tag Baru').props.onClick(); nodes = render(tagTab, tagProps);
  nodes.find(n => n.type === 'input' && n.props['aria-label'] === 'Nama Tag').props.onChange({ target: { value: 'Coba Nama' } });
  nodes = render(tagTab, tagProps);
  button(nodes, 'Sub Tag (Turunan)Contoh: #kendaraan-kebakaran').props.onClick(); nodes = render(tagTab, tagProps);
  assert.equal(nodes.find(n => n.type === 'input' && n.props['aria-label'] === 'Nama Tag').props.value, 'coba-nama');
  assert.equal(nodes.find(n => n.type === 'select' && n.props['aria-label'] === 'Main Tag Induk').props.value, 'main');
  const focusBefore = returnedFocus;
  nodes.find(n => n.type === 'dialog-content').props.onCloseAutoFocus({ preventDefault() {} });
  assert.equal(returnedFocus, focusBefore + 1);
  reset(); assert(!button(render(tagTab, { ...tagProps, canManage: false }), 'Tambah Tag Baru'));
  const locProps = { locations: [{ id: 'loc', name: 'Fixture', unit_kerja: 'Unit', assets_count: 1 }], canManage: true, isLoading: false, isSuperAdmin: false };
  reset(); nodes = render(locationTab, locProps);
  assert(nodes.some(n => n.props.disabled && n.props.title?.includes('Tidak dapat dihapus')));
  button(nodes, 'Tambah Lokasi Baru').props.onClick(); nodes = render(locationTab, locProps);
  assert(button(nodes, 'Simpan Lokasi').props.disabled);
  assert(!nodes.some(n => n.type === 'option' && n.props.value === '__custom__'));
  const typeProps = { assetTypes: [{ id: 'type', name: 'Fixture', category_mode: 'bangunan', assets_count: 2 }], canManage: true, isLoading: false };
  reset(); nodes = render(typeTab, typeProps);
  assert(nodes.some(n => n.props['data-status'] === 'neutral'));
  assert(nodes.some(n => n.props.disabled && n.props.title?.includes('Tidak dapat dihapus')));
  button(nodes, 'Tambah Jenis BMN').props.onClick(); nodes = render(typeTab, typeProps);
  assert(button(nodes, 'Simpan Jenis BMN').props.disabled);
  reset(); writable = true; permissions = null;
  const candidate = (id, value, eligible = true, warning = false) => ({ id, nama_barang: `Aset ${id}`, nup: id, kode_barang: '123', nilai_perolehan: value, nilai_buku: 0, is_auction_eligible: eligible, requires_document_review: warning, document_readiness_warnings: warning ? ['BPKB belum lengkap'] : [] });
  response = { data: { data: [candidate('a', 100, true, true), candidate('b', 200, false)], meta: { total: 21, current_page: 1, last_page: 3 } } };
  nodes = render(candidates);
  assert(nodes.find(n => n.props['aria-label'] === 'Pilih Aset b NUP b').props.disabled);
  nodes.find(n => n.props['aria-label'] === 'Pilih Aset a NUP a').props.onCheckedChange();
  nodes = render(candidates); assert(button(nodes, 'Buat Paket Lelang (1)'));
  button(nodes, 'Selanjutnya').props.onClick();
  response.data.data = [candidate('c', 300)]; response.data.meta.current_page = 2;
  nodes = render(candidates); nodes.find(n => n.props['aria-label'] === 'Pilih Aset c NUP c').props.onCheckedChange();
  nodes = render(candidates); assert(nodes.some(n => text(n) === 'Rp 400'));
  button(nodes, 'Buat Paket Lelang (2)').props.onClick(); nodes = render(candidates);
  nodes.find(n => n.props.id === 'batchName').props.onChange({ target: { value: '' } });
  nodes = render(candidates); assert(button(nodes, 'Buat Paket').props.disabled);
  nodes.find(n => n.props.id === 'batchName').props.onChange({ target: { value: 'Fixture lokal' } });
  nodes = render(candidates); button(nodes, 'Buat Paket').props.onClick();
  assert.deepEqual(Array.from(mutationPayload.asset_ids), ['a', 'c']); assert.equal(mutationPayload.name, 'Fixture lokal'); assert(mutationOptions.onError);
  button(nodes, 'Sebelumnya').props.onClick(); response.data.data = [candidate('a', 100, true, true)]; response.data.meta.current_page = 1;
  nodes = render(candidates); assert.equal(nodes.find(n => n.props['aria-label'] === 'Pilih Aset a NUP a').props.checked, true);
  button(nodes, 'Lihat peringatan dokumen Aset a NUP a').props.onClick(); nodes = render(candidates);
  assert(nodes.some(n => n.props.id === 'candidate-warning-a' && n.props.colSpan === 5));
  assert(nodes.some(n => n.props['aria-selected'] === true));
  response.isFetching = true; nodes = render(candidates); assert(button(nodes, 'Buat Paket Lelang (2)').props.disabled); assert(button(nodes, 'Selanjutnya').props.disabled);
  reset(); writable = false; response.isFetching = false; nodes = render(candidates);
  assert(!nodes.some(n => n.type === 'checkbox')); assert(!nodes.some(n => text(n).startsWith('Buat Paket Lelang (')));
  button(nodes, 'Lihat peringatan dokumen Aset a NUP a').props.onClick(); nodes = render(candidates); assert(nodes.some(n => n.props.id === 'candidate-warning-a' && n.props.colSpan === 5));
  reset(); response = { isError: true }; nodes = render(candidates); assert(button(nodes, 'Coba lagi'));
  reset(); response = { isLoading: true }; assert(render(candidates).some(n => text(n) === 'Memuat kandidat aset...'));
  reset(); response = { data: { data: [] } }; assert(render(candidates).some(n => text(n) === 'Tidak ada aset kandidat lelang yang ditemukan.'));
  reset(); writable = true; permissions = null; response = { data: { data: [] } };
  nodes = render(auctionList); assert(nodes.some(n => n.type === 'a' && n.props.href === '/bmn/auction-candidates'));
  assert(!nodes.some(n => n.type === 'a' && flat(n.props.children).some(child => child.type === 'button')));
  response = { isError: true }; reset(); assert(button(render(auctionList), 'Coba lagi'));
  const batch = { id: 'fixture', batch_number: 'FIX-1', name: 'Fixture', status: 'DRAFT', assets_count: 1, nilai_taksiran_total: 50, metadata: {}, assets: [{ id: 'a', nama_barang: 'Fixture aset', jenis_bmn: 'Peralatan', nup: '1', kode_barang: '123', kondisi: 'Rusak Berat', nilai_perolehan: 100, nilai_buku: 0, requires_document_review: true, document_readiness_warnings: ['Fixture warning'], pivot: { nilai_taksiran: 50, lot_number: '1', first_auction_is_sold: null, reauction_is_sold: null } }] };
  response = { data: { data: [batch], meta: { total: 16, last_page: 2 } } }; reset(); nodes = render(auctionList);
  assert(button(nodes, 'Sebelumnya').props.disabled); assert(!button(nodes, 'Selanjutnya').props.disabled);
  button(nodes, 'Selanjutnya').props.onClick(); nodes = render(auctionList); assert(button(nodes, 'Selanjutnya').props.disabled);
  assert.equal(imports['./_lib/status'].getStatusLabel('DRAFT'), 'Draft'); assert.equal(imports['./_lib/status'].getNextActionLabel('DRAFT'), 'Kunci & Ajukan');
  assert(imports['./_lib/status'].getStatusColorClass('LELANG_ULANG').includes('warning'));
  permissions = new Set(['bmn.auction.view']); reset(); nodes = render(auctionList); assert(!button(nodes, 'Hapus')); assert(!nodes.some(n => n.type === 'a' && text(n).includes('Buat Paket Baru')));
  // Parent/detail permissions and the canonical transition boundary.
  queryResponses.set('bmn-auction-batch', { data: { data: batch } }); queryResponses.set('bmn-auction-batch-checklist', { data: {} });
  reset(); nodes = render(auctionDetail, { params: { id: batch.id } }); assert(!button(nodes, 'Hapus Paket'));
  assert(nodes.some(n => n.type === 'presence' && n.props.mode === 'wait'));
  queryResponses.clear(); response = {}; permissions = null;
  // Actual child unmount: keep only owner hook slots; populated draft is retained on re-entry.
  const fields = [['setQuickEditBpkb', 'quickEditBpkb'], ['setEditingValue', 'editingValue'], ['setKepalaSearch', 'kepalaSearch'], ['setFirstAuctionPrice', 'firstAuctionPrice']];
  for (let i = 0; i < auctionForms.length; i++) {
    const entry = auctionForms[i], owner = entry[`use${entry.name}FormState`], component = entry[`${entry.name}Tab`];
    reset(); cursor = 0; let draft = owner(batch); const size = cursor; effects.splice(0).forEach(fn => fn());
    cursor = 0; draft = owner(batch);
    const field = fields[i], value = i === 3 ? { a: '777' } : '777'; draft[field[0]](value);
    state = state.slice(0, size); cursor = 0; draft = owner(batch);
    assert.equal(i === 3 ? draft[field[1]].a : draft[field[1]], '777');
    queryResponses.set('employees-select-auction-documents', { data: [] }); queryResponses.set('bmn-auction-document-context', { data: { data: { assets: [], metadata: {}, metadata_schema_version: 2 } } });
    nodes = flat(component({ batch, readOnly: true, formState: draft, onRefetch() {} }));
    effects.splice(0).forEach(fn => fn()); state = state.slice(0, size); cursor = 0; draft = owner(batch);
    assert.equal(i === 3 ? draft[field[1]].a : draft[field[1]], '777', `${entry.name} child remount`);
  }
  queryResponses.clear();
  reset(); nodes = render(committee.CommitteePicker, { label: 'Panitia', description: '', employees: [{ id: '1', name: 'Satu' }, { id: '2', name: 'Dua' }], selectedIds: ['1', '2'], disabled: false, onChange: ids => { requested = ids; } });
  const reorder = nodes.find(n => n.props['aria-label']?.startsWith('Urutkan Satu')); assert(reorder);
  reorder.props.onKeyDown({ altKey: true, key: 'ArrowRight', preventDefault() {} }); assert.deepEqual(Array.from(requested), ['2', '1']);
  assert(nodes.some(n => n.props['aria-pressed'] === true));
  response = { error: new Error('fixture') }; reset(); nodes = render(auctionAudit, { batchId: 'fixture' }); assert(button(nodes, 'Coba lagi'));
  // Editor uses accessible Dialog and native read-only fieldset; save is separately guarded.
  reset(); let saved = 0;
  const editorProps = { open: true, readOnly: true, doc: { key: 'sk_penghentian', title: 'Fixture SK' }, batch, mappedAssets: [], kepalaBalai: { nama: 'Fixture' }, panitiaList: [], timPenilaiList: [], pemeriksaList: [], onClose() {}, onSaveContent: async () => { saved++; } };
  nodes = render(documentEditor, editorProps); assert(nodes.some(n => n.type === 'dialog-content' && n.props['data-module'] === 'bmn')); assert(nodes.some(n => n.type === 'fieldset' && n.props.disabled));
  assert(button(nodes, 'Simpan Perubahan').props.disabled); await button(nodes, 'Simpan Perubahan').props.onClick(); assert.equal(saved, 0);
  assert(nodes.some(n => n.props.role === 'tab' && n.props['aria-selected']));
  button(nodes, 'Tutup editor dokumen').props.onClick();
  queryResponses.clear(); permissions = null; writable = true;
  const realization = auctionForms[3]; reset(); cursor = 0;
  let results = realization.useRealizationFormState(batch); effects.splice(0).forEach(fn => fn()); cursor = 0; results = realization.useRealizationFormState(batch);
  results.setFirstAuctionSold({ a: true }); results.setFirstAuctionPrice({ a: '' }); cursor = 0; results = realization.useRealizationFormState(batch);
  nodes = flat(realization.RealizationTab({ batch, formState: results, readOnly: false, onRefetch() {} }));
  mutationPayload = null; const errorCount = toastErrors.length;
  assert.doesNotThrow(() => button(nodes, 'Simpan Draf Realisasi').props.onClick());
  assert.equal(mutationPayload, null); assert.equal(toastErrors.length, errorCount + 1); assert(toastErrors.at(-1).includes('Harga terbentuk wajib'));
  permissions = new Set(['bmn.auction.view']); cursor = 0; results = realization.useRealizationFormState(batch);
  nodes = flat(realization.RealizationTab({ batch, formState: results, readOnly: true, onRefetch() {} }));
  assert(!button(nodes, 'Simpan Draf Realisasi')); assert(!button(nodes, 'Batalkan Paket Lelang'));
  assert(nodes.filter(n => n.type === 'select').every(n => n.props.disabled));
  permissions = null; cursor = 0; results = realization.useRealizationFormState(batch);
  nodes = flat(realization.RealizationTab({ batch: { ...batch, status: 'REALISASI' }, formState: results, readOnly: true, onRefetch() {} }));
  assert(!button(nodes, 'Finalisasi & Selesaikan Paket Lelang'));
  queryResponses.clear(); permissions = null; writable = true;
  reset(); nodes = render(shell, { children: 'Fixture page' });
  assert.equal(nodes.filter(n => n.props['aria-current'] === 'page').length, 1);
  assert.equal(nodes.find(n => n.props['aria-current'] === 'page').props.href, '/bmn/loans');
  const toggle = button(nodes, 'Toggle Menu BMN'); assert.equal(toggle.props['aria-expanded'], false); toggle.props.onClick();
  nodes = render(shell, { children: 'Fixture page' }); assert.equal(button(nodes, 'Toggle Menu BMN').props['aria-expanded'], true);
  nodes.find(n => n.type === 'aside').props.onKeyDown({ key: 'Escape' }); nodes = render(shell, { children: 'Fixture page' }); assert.equal(button(nodes, 'Toggle Menu BMN').props['aria-expanded'], false);
  permissions = new Set(['bmn.view']); pathname = '/bmn/assets/fixture'; reset(); nodes = render(shell, { children: '' });
  assert(!nodes.some(n => n.type === 'a' && n.props.href === '/bmn/auction-batches')); assert.equal(nodes.find(n => n.props['aria-current'] === 'page').props.href, '/bmn/assets');
  permissions = null; pathname = '/bmn/loans/create'; reduced = true; reset();
  nodes = render(shell, { children: '' });
  assert(nodes.filter(n => n.props.transition).every(n => n.props.transition.duration === 0)); reduced = false;
  assert.equal(writes, 0);
  console.log('PASS: shell route highlighting/permission filtering, drawer state/Escape, reduced-motion props; realization missing-price validation and view-only controls.');
  console.log('PASS: auction list/error/pagination/status/permissions; detail boundary; four actual child remount drafts; committee keyboard reorder; audit retry; editor Dialog/read-only save guard.');
  console.log('PASS: candidates cross-page count/value/payload, eligibility/warnings, permissions, pending/error/loading/empty; mutation captured only.');
  console.log('PASS: loans status/filter/page/read-only/dialog/error, maintenance pagination/error, catalog keyboard/availability, wizard draft, reduced-motion props; no API writes.');
  console.log('PASS: import list/detail status, empty/error, filter/page, field selection stub/read-only; disposal metadata/selection/permission/confirmation/error; no live writes.');
  console.log('PASS: master tabs keyboard/ARIA/error, tag hierarchy/selection/draft/focus callback/read-only, location/type availability/validation; no live writes.');
  console.log('PASS: report export loading/filename/endpoint stub, permission separation/history preview, four form drafts across child remount and historical BA selection and KTP validation/lifetime/read-only; no live writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
