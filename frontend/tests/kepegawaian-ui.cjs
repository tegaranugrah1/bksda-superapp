/* eslint-disable @typescript-eslint/no-require-imports -- Runnable Node regression check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, document) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, document,
    require: name => {
      assert(name in imports, `Unexpected dependency ${name}`);
      return imports[name];
    },
  });
  return exports;
}

const { useKepegawaianTabs } = load('app/kepegawaian/_lib/useKepegawaianTabs.ts', {
  react: { useId: () => 'tabs' },
});
const tabs = useKepegawaianTabs('profile', 'Data pegawai');
let focused, selected, prevented = false;
const buttons = ['profile', 'leave', 'history'].map(value => ({
  focus: () => { focused = value; },
  click: () => { selected = value; },
  scrollIntoView() {},
}));
function press(key, current = 0) {
  prevented = false;
  tabs.tabListProps.onKeyDown({
    key, target: buttons[current],
    currentTarget: { querySelectorAll: () => buttons },
    preventDefault: () => { prevented = true; },
  });
}
press('ArrowRight');
assert.equal(focused, 'leave');
assert.equal(selected, 'leave');
assert(prevented);
press('ArrowLeft');
assert.equal(selected, 'history', 'Left wraps to the final enabled tab.');
press('Home', 2);
assert.equal(selected, 'profile');
press('End');
assert.equal(selected, 'history');
press('Tab');
assert.equal(prevented, false, 'Native Tab navigation remains available.');
assert.equal(tabs.tabProps('profile').tabIndex, 0);
assert.equal(tabs.tabProps('leave').tabIndex, -1);
assert.equal(tabs.tabProps('profile')['aria-controls'], tabs.panelProps.id);
assert.equal(tabs.panelProps['aria-labelledby'], tabs.tabProps('profile').id);

let focusTarget;
const menuTrigger = { focus: () => { focusTarget = 'menu-trigger'; } };
const directTrigger = { closest: () => null, focus: () => { focusTarget = 'direct-trigger'; } };
const doc = { activeElement: directTrigger, getElementById: () => menuTrigger };
const { useDialogFocusReturn } = load('components/ui/use-dialog-focus-return.ts', {
  react: { useRef: () => ({ current: null }) },
}, doc);
const focus = useDialogFocusReturn();
focus.onOpenAutoFocus();
focus.onCloseAutoFocus({ preventDefault() {} });
assert.equal(focusTarget, 'direct-trigger');
doc.activeElement = { closest: () => ({ getAttribute: () => 'row-menu-trigger' }) };
focus.onOpenAutoFocus();
doc.activeElement = null;
focus.onCloseAutoFocus({ preventDefault() {} });
assert.equal(focusTarget, 'menu-trigger', 'Return to the persistent trigger after the menu item unmounts.');

let reduced = false, present = true;
const element = (type, props) => ({ type, props });
const { KepegawaianTabContent } = load('app/kepegawaian/_components/KepegawaianTabContent.tsx', {
  'react/jsx-runtime': { jsx: element },
  'framer-motion': {
    motion: { div: 'motion-div' },
    useReducedMotion: () => reduced,
    useIsPresent: () => present,
  },
});
let content = KepegawaianTabContent({ children: 'draft' });
assert.equal(content.props.inert, false);
assert.equal(content.props.transition.duration, 0.16);
assert.equal(content.props.initial.y, 8);
assert.equal(content.props.exit.y, -8);
present = false;
content = KepegawaianTabContent({ children: 'draft' });
assert.equal(content.props.inert, true, 'Exiting controls cannot receive interaction.');
reduced = true;
content = KepegawaianTabContent({ children: 'draft' });
assert.equal(content.props.transition.duration, 0);
assert.equal(content.props.initial.y, 0);
assert.equal(content.props.exit.y, 0);
assert.equal(content.props.children, 'draft');

// Compare the rendered motion props with the actual Inbox Surat Tugas implementation.
const inboxSource = fs.readFileSync(path.join(__dirname, '../src/app/kepegawaian/surat-tugas/inbox/page.tsx'), 'utf8');
const inboxTree = ts.createSourceFile('inbox.tsx', inboxSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const inboxFunction = inboxTree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'InboxTabContent');
assert(inboxFunction, 'Keep the real Inbox Surat Tugas reference available.');
const referenceExports = {};
vm.runInNewContext(ts.transpileModule(inboxFunction.getText(inboxTree) + '; exports.InboxTabContent = InboxTabContent;', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, {
  exports: referenceExports,
  motion: { div: 'motion-div' }, useIsPresent: () => present,
  require: () => ({ jsx: element }),
});
for (const reduce of [false, true]) {
  for (const presence of [false, true]) {
    reduced = reduce; present = presence;
    const actual = KepegawaianTabContent({ children: 'fixture' }).props;
    const expected = referenceExports.InboxTabContent({ children: 'fixture', reducedMotion: reduce }).props;
    for (const prop of ['initial', 'animate', 'exit', 'transition', 'inert']) {
      assert.equal(JSON.stringify(actual[prop]), JSON.stringify(expected[prop]), `Inbox parity: ${prop}, reduce=${reduce}, present=${presence}`);
    }
  }
}
console.log('PASS: Kepegawaian content motion matches actual Inbox Surat Tugas in normal/reduced and entering/exiting states.');

const icons = new Proxy({}, { get: (_, name) => String(name) });
const dashboardImports = {
  'react/jsx-runtime': { jsx: element, jsxs: element },
  '@tanstack/react-query': { useQuery: () => ({ data: { total_employees: 0 } }) },
  'lucide-react': icons,
  '@/lib/api': { api: {} },
  'next/link': { default: 'a' },
  'framer-motion': { motion: { div: 'motion-div' }, useReducedMotion: () => false },
  '@/hooks/useRole': { useRole: () => ({ canWrite: false }) },
  './_components/KepegawaianDashboardComponents': { RecentActivitiesFeedCard: 'recent', SatkerDistributionCard: 'distribution' },
};
const { default: Dashboard } = load('app/kepegawaian/page.tsx', dashboardImports);
function links(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(links);
  return [
    ...(node.type === 'a' ? [node.props.href] : []),
    ...links(node.props?.children),
  ];
}
const dashboard = Dashboard();
const hrefs = links(dashboard);
function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.map(child => findElement(child, predicate)).find(Boolean);
  return predicate(node) ? node : findElement(node.props?.children, predicate);
}
assert(!dashboard.props.className.includes('kpg-page-enter'), 'The dashboard uses its existing route transition without a second entrance.');
for (const [kind, color] of [['PNS', 'bg-blue-600'], ['PPPK', 'bg-amber-500'], ['MMP', 'bg-emerald-500']]) {
  const bar = findElement(dashboard, node => node.props?.title?.startsWith(kind + ':'));
  assert(bar.props.className.includes(color), `${kind} keeps its original chart palette.`);
  assert.equal(bar.props.transition.duration, 0.6);
}
assert(!hrefs.includes('/kepegawaian/employees/create'), 'The read-only dashboard hides employee creation.');
for (const kind of ['PNS', 'PPPK', 'MMP']) {
  assert(hrefs.includes(`/kepegawaian/employees?jenis=${kind}&status=all`), 'Category filters include the same lifecycle scope as the dashboard counts.');
}
assert(hrefs.includes('/kepegawaian/employees?status=active'));
const statusHelpers = load('app/kepegawaian/surat-tugas/inbox/_lib/status-helpers.ts', {});
const { SatkerDistributionCard, RecentActivitiesFeedCard } = load('app/kepegawaian/_components/KepegawaianDashboardComponents.tsx', {
  react: { default: {} },
  '../surat-tugas/inbox/_lib/status-helpers': statusHelpers,
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'next/link': { default: 'a' }, 'lucide-react': icons,
  'framer-motion': { motion: { div: 'motion-div' }, useReducedMotion: () => false },
});
assert(links(SatkerDistributionCard({ satkerBreakdown: [{ code: 'SKW_1', name: 'Contoh', count: 0, percentage: 0 }] }))
  .includes('/kepegawaian/employees?wilayah=SKW_1&status=all'));

for (const [status, label] of [['PENDING', 'Menunggu Persetujuan'], ['approved', 'Diterbitkan'], ['completed', 'Selesai'], ['rejected', 'Ditolak'], ['draft', 'Draft'], ['unknown', 'unknown']]) {
  const activity = RecentActivitiesFeedCard({ activities: [{
    id: 'st-fixture', title: 'Contoh', status, tempat_tujuan: 'Contoh', tanggal_surat: '11/11/2026',
  }] });
  const badge = findElement(activity, node => node.props?.['data-status']);
  assert.equal(badge.props.children, label, 'Dashboard reuses Inbox status labels, including case normalization and fallback.');
  if (status === 'PENDING') assert.equal(badge.props['data-status'], 'warning');
  if (status === 'approved') assert.equal(badge.props['data-status'], 'success');
  const date = findElement(activity, node => node.type === 'span' && node.props?.children === '11/11/2026');
  assert(date.props.className.includes('text-[var(--ds-fg-muted)]'), 'Activity dates use the readable theme token.');
}
console.log('PASS: dashboard status labels reuse Inbox semantics and dates use the light/dark text token.');

assert.equal(statusHelpers.formatShortSumberDana('RKT Kerjasama PT Kideco Jaya Agung'), 'KJA');
assert.equal(statusHelpers.formatShortSumberDana('Biaya Kerjasama CAN (Conservation Action Network)'), 'CAN');
assert.equal(statusHelpers.formatShortSumberDana('kerjasama BARU'), 'MITRA');
assert.equal(statusHelpers.formatShortSumberDana('dl1'), 'DL 1');
assert.equal(statusHelpers.formatShortSumberDana('Perencanaan Daerah'), 'PERENC');
const { GmailRowItem } = load('app/kepegawaian/surat-tugas/inbox/_components/GmailRowItem.tsx', {
  react: { default: {} },
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'lucide-react': icons,
  '../_lib/status-helpers': statusHelpers,
});
const inboxRow = GmailRowItem({
  letter: {
    id: 'st-row-1',
    status: 'pending',
    sumber_dana: 'Biaya Kerjasama CAN (Conservation Action Network)',
    maksud_tujuan: 'Dalam rangka patroli',
    created_at: '2026-11-16',
  },
  isSelected: false, onToggleSelect() {}, onClick() {}, isTrashView: false, isActive: false,
});
const fundingBadge = findElement(inboxRow, node => node.type === 'span' && node.props?.children === 'CAN');
assert(fundingBadge && fundingBadge.props.title.includes('CAN') && fundingBadge.props.className.includes('truncate'));
const statusBadge = findElement(inboxRow, node => node.type === 'span' && node.props?.children === 'Menunggu');
assert(statusBadge && statusBadge.props.title === 'Menunggu Persetujuan' && statusBadge.props.className.includes('truncate'));
const fundingCol = findElement(inboxRow, node => typeof node.props?.className === 'string' && node.props.className.includes('w-20') && node.props.className.includes('overflow-hidden'));
const statusCol = findElement(inboxRow, node => typeof node.props?.className === 'string' && node.props.className.includes('st-row-status') && node.props.className.includes('overflow-hidden'));
assert(fundingCol && statusCol, 'Inbox row columns keep overflow-hidden guards.');

for (const role of ['user', 'admin']) {
  const { ModuleSwitcher } = load('components/module-switcher.tsx', {
    react: { useState: () => [true, () => {}], useEffect() {} },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'lucide-react': icons,
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => '/kepegawaian' },
    '@/hooks/useAuth': { useAuth: () => ({ user: { role, access_modules: ['kepegawaian', 'surat'] } }) },
  });
  const switcherLinks = links(ModuleSwitcher());
  assert(switcherLinks.includes('/surat'), `ModuleSwitcher renders Persuratan (/surat) for role=${role}.`);
}

const { EmployeeLifecycleModal } = load('app/kepegawaian/employees/_components/EmployeeLifecycleModal.tsx', {
  react: { useState: value => [value, () => {}], useEffect() {} },
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'framer-motion': { motion: { div: 'motion-div' }, AnimatePresence: 'presence', useReducedMotion: () => false },
  '../../_components/KepegawaianDialog': { KepegawaianDialog: 'frame' },
  '@/components/ui/button': { Button: 'button' },
  '@/lib/api': { api: {} },
  sonner: { toast: {} },
  '@tanstack/react-query': { useQueryClient: () => ({}) },
  'lucide-react': icons,
});
function findSubmit(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.map(findSubmit).find(Boolean);
  if (node.type === 'button' && node.props.type === 'submit') return node;
  return findSubmit(node.props?.children);
}
assert.equal(findSubmit(EmployeeLifecycleModal({
  employee: { is_active: true }, open: true, onOpenChange() {},
})).props.variant, 'destructive');
assert.equal(findSubmit(EmployeeLifecycleModal({
  employee: { is_active: false }, open: true, onOpenChange() {},
})).props.variant, 'default', 'Reactivation keeps the normal primary action.');

const { KepegawaianDialog } = load('app/kepegawaian/_components/KepegawaianDialog.tsx', {
  'react/jsx-runtime': { jsx: element, jsxs: element },
  '@/components/ui/dialog': { Dialog: 'dialog-root', DialogContent: 'content', DialogTitle: 'title' },
  '@/components/ui/use-dialog-focus-return': { useDialogFocusReturn: () => ({}) },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
});
let closes = 0;
KepegawaianDialog({ title: 'Contoh', busy: true, onClose: () => { closes++; } }).props.onOpenChange(false);
assert.equal(closes, 0);
KepegawaianDialog({ title: 'Contoh', busy: false, onClose: () => { closes++; } }).props.onOpenChange(false);
assert.equal(closes, 1);
console.log('PASS: tab keyboard/ARIA, dialog direct/menu focus return, exiting controls and reduced-motion fallback.');
console.log('PASS: dashboard category/region totals navigate to matching lifecycle filters.');
console.log('PASS: lifecycle action semantics and pending dialog close guard; no API writes.');

async function checkPhotoUpload() {
  const listFile = path.join(__dirname, '../src/app/kepegawaian/employees/page.tsx');
  const listSource = fs.readFileSync(listFile, 'utf8');
  const listTree = ts.createSourceFile(listFile, listSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let querySource;
  function findQuery(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(listTree) === 'queryFn') {
      querySource = node.initializer.getText(listTree);
    }
    ts.forEachChild(node, findQuery);
  }
  findQuery(listTree);
  const queryExports = {};
  let queryParams;
  vm.runInNewContext(ts.transpileModule(`exports.query = ${querySource};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports: queryExports, page: 1, perPage: '10', debouncedSearch: '',
    jenisFilter: 'PNS', wilayahFilter: '', statusFilter: 'all',
    api: { get: async (_, options) => { queryParams = options.params; return { data: {} }; } },
  });
  await queryExports.query();
  assert.equal(queryParams.status, 'all', 'Send all explicitly because the backend defaults to active when status is absent.');
  assert.equal(queryParams.jenis_pegawai, 'PNS');

  const file = path.join(__dirname, '../src/app/kepegawaian/employees/[id]/page.tsx');
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handlerSource;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'input') {
      const attributes = node.attributes.properties;
      if (attributes.some(attr => attr.name?.getText(tree) === 'aria-label' && attr.initializer?.text === 'Unggah foto profil pegawai')) {
        handlerSource = attributes.find(attr => attr.name?.getText(tree) === 'onChange').initializer.expression.getText(tree);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert(handlerSource, 'Exercise the actual photo upload handler.');
  const code = ts.transpileModule(`exports.handle = ${handlerSource};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const busy = [];
  let requestCount = 0, fail = false, invalidations = 0;
  const exports = {};
  vm.runInNewContext(code, {
    exports, id: 'fixture-employee',
    FormData: class { append() {} },
    setPhotoUploading: value => busy.push(value),
    api: { post: async () => { requestCount++; if (fail) throw new Error('Fixture upload failure'); } },
    toast: { error() {}, success() {} },
    queryClient: { invalidateQueries() { invalidations++; } },
  });
  await exports.handle({ target: { files: [] } });
  await exports.handle({ target: { files: [{ size: 11 * 1024 * 1024 }] } });
  assert.equal(requestCount, 0, 'Empty and oversized files do not request an upload.');
  await exports.handle({ target: { files: [{ size: 100 }] } });
  assert.deepEqual(busy, [true, false]);
  assert.equal(invalidations, 1);
  fail = true;
  await exports.handle({ target: { files: [{ size: 100 }] } });
  assert.deepEqual(busy, [true, false, true, false], 'The file control becomes available after failure.');
  assert.equal(invalidations, 1);
  console.log('PASS: photo empty/oversize validation, pending reset on success/failure and cache refresh; stub requests only.');

  const authSyncSource = fs.readFileSync(path.join(__dirname, '../src/components/AuthSync.tsx'), 'utf8');
  const authSyncOutput = ts.transpileModule(authSyncSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const [payload, expectedCount] of [
    [{ data: [] }, 0],
    [{ data: { id: 125, username: '199907072025061006', role: 'user', access_modules: ['kepegawaian', 'surat'] } }, 1],
  ]) {
    const syncEffects = [];
    const updatedUsers = [];
    const authSyncExports = {};
    vm.runInNewContext(authSyncOutput, {
      exports: authSyncExports,
      window: { addEventListener() {}, removeEventListener() {} },
      document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
      localStorage: { getItem: () => 'tok' },
      fetch: async () => ({ ok: true, json: async () => payload }),
      require: name => ({
        react: { useEffect: fn => syncEffects.push(fn), useRef: value => ({ current: value }) },
        'react/jsx-runtime': { jsx: element, jsxs: element },
        'next/navigation': { useRouter: () => ({ push() {} }), usePathname: () => '/kepegawaian' },
        '@/hooks/useAuth': { useAuth: () => ({ isAuthenticated: true, user: { username: '199907072025061006', role: 'user', access_modules: ['kepegawaian'] } }) },
        '@/lib/auth-store': { authStore: { updateUser: u => updatedUsers.push(u), logout() {} } },
        '@/lib/api': { default: { defaults: { baseURL: 'http://localhost:8000/api' } } },
        sonner: { toast: { info() {} } },
      }[name]),
    });
    authSyncExports.AuthSync();
    syncEffects[0]();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(updatedUsers.length, expectedCount);
    if (expectedCount === 1) assert(updatedUsers[0].access_modules.includes('surat'));
  }
  console.log('PASS: ModuleSwitcher renders Persuratan for user/admin and AuthSync syncs fresh /user access_modules.');

  // Guard against opaque outer DialogContent background box & double scrollbars behind .rounded-3xl modal cards.
  const suratTugasCss = fs.readFileSync(path.join(__dirname, '../src/app/surat-tugas/surat-tugas.css'), 'utf8');
  const kpgDialogSrc = fs.readFileSync(path.join(__dirname, '../src/app/kepegawaian/_components/KepegawaianDialog.tsx'), 'utf8');
  const digitalCutiSrc = fs.readFileSync(path.join(__dirname, '../src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx'), 'utf8');
  const cutiModalsSrc = fs.readFileSync(path.join(__dirname, '../src/app/kepegawaian/cuti/_components/CutiModals.tsx'), 'utf8');
  assert(
    /:is\(\.st-ui,\s*\.kpg-ui,\s*\.psr-ui\)\[data-slot="dialog-content"\]:not\(:has\(>\s*\.rounded-3xl\)\)/.test(suratTugasCss),
    'surat-tugas.css must not paint an opaque background behind self-card .rounded-3xl dialogs'
  );
  assert(
    kpgDialogSrc.includes('[&:has(>.rounded-3xl)]:bg-transparent') &&
      kpgDialogSrc.includes("[&:has(>.rounded-3xl[class*='overflow-'])]:overflow-hidden"),
    'KepegawaianDialog must clear outer background and scrollbars when child manages a .rounded-3xl scrollable card'
  );
  assert(
    digitalCutiSrc.includes('className="sm:max-w-4xl"') && !digitalCutiSrc.includes('max-h-[94vh]'),
    'DigitalSuratIzinModal must match sm:max-w-4xl and avoid max-h-[94vh] overflow against KepegawaianDialog'
  );
  assert(
    !cutiModalsSrc.includes('className="sm:max-w-3xl"') && !cutiModalsSrc.includes('className="sm:max-w-6xl"'),
    'CutiModals outer KepegawaianDialog widths must match their inner card widths'
  );
  assert(
    digitalCutiSrc.includes('`untuk ${years[0]}`'),
    'DigitalSuratIzinModal must include single current year text ("untuk tahun YYYY") when N-1/N-2 are zero'
  );
  const suratDocSrc = fs.readFileSync(path.join(__dirname, '../src/app/surat/_components/SuratDinasDocument.tsx'), 'utf8');
  const dinasPageSrc = fs.readFileSync(path.join(__dirname, '../src/app/surat/keluar/dinas/page.tsx'), 'utf8');
  assert(
    suratDocSrc.includes('isSingleDayLeave') && suratDocSrc.includes('hitungHari === "hari_kerja"'),
    'SuratDinasDocument must omit s.d on 1-day leave and honor LeaveType hitungHari'
  );
  assert(
    digitalCutiSrc.includes('hitungHari: payload?.hitungHari || item.hitung_hari') && dinasPageSrc.includes('Satuan Hitung Hari Cuti'),
    'DigitalSuratIzinModal and dinas/page.tsx must propagate and allow overriding hitungHari'
  );
  console.log('PASS: KepegawaianDialog and Cuti modals free of opaque outer box and double scrollbars.');
}
checkPhotoUpload().catch(error => { console.error(error); process.exitCode = 1; });
