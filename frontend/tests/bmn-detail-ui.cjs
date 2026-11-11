/* eslint-disable @typescript-eslint/no-require-imports -- Standalone source fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let state = [], cursor = 0, writable = true, reducedMotion = false, handle, focused;
let assetRouteId = 'fixture';
const el = (type, props, key) => ({ type, props: props || {}, key });
const react = {
  use: () => ({ id: assetRouteId }), useId: () => 'fixture', useEffect() {},
  useRef: value => { const i = cursor++; return state[i] ||= { current: value }; },
  useState: initial => {
    const i = cursor++;
    if (!(i in state)) state[i] = initial;
    return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
  },
  forwardRef: fn => fn, useImperativeHandle: (_, fn) => { handle = fn(); },
};
const element = { jsx: el, jsxs: el, Fragment: 'fragment' };
const doc = { activeElement: null, getElementById: id => ({ focus() { focused = id; } }) };
class Trigger { isConnected = true; focus() { focused = 'trigger'; } }
let asset = { nama_barang: 'Fixture', kode_barang: '123', nup: '1', kondisi: 'Baik', status_bmn: 'Aktif', updates: [] };
let query = { isLoading: false, isError: false };
const imports = {
  react, 'react/jsx-runtime': element,
  'lucide-react': new Proxy({}, { get: (_, key) => `icon:${String(key)}` }),
  '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
  '@/hooks/useRole': { useRole: () => ({ hasPermission: () => writable }) },
  '@/components/ui/confirm-dialog': { useConfirm: () => async () => false },
  '@/components/ui/button': { Button: 'button' },
  '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogClose'].map(k => [k, k])),
  sonner: { toast: { info() {}, success() {}, error() {} } },
  '@/lib/api': { api: new Proxy({}, { get: () => () => { throw Error('Fixture must not access API'); } }) },
  '@tanstack/react-query': { useQuery: opts => opts.queryKey[0] === 'bmn-asset' ? { data: asset, ...query } : { data: [] }, useQueryClient: () => ({}) },
  'next/navigation': { useRouter: () => ({}), redirect(url) { throw new Error(`Redirect ${url}`); } },
  'next/link': { default: 'a' },
  'framer-motion': { motion: { span: 'motion.span', div: 'motion.div' }, AnimatePresence: 'presence', useReducedMotion: () => reducedMotion },
  '@/app/bmn/_components/TagBadge': { TagBadge: 'tag' },
  '@/app/bmn/_components/TagAssignmentDialog': { TagAssignmentDialog: 'tag-dialog' },
  '@/app/bmn/_lib/location-options': { ALL_LOKASI_RUANG_OPTIONS: [] },
  '../assets.css': {}, './detail.css': {},
};
function load(file, extra = '') {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/bmn/assets/[id]', file), 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    module: mod, exports: mod.exports, document: doc, HTMLElement: Trigger,
    window: { document: doc }, process: { env: {} }, URL,
    require: key => { assert(key in imports, `Unexpected import ${key}`); return imports[key]; },
  });
  return mod.exports;
}
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  return [node, ...flatten(node.props.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  return node && typeof node === 'object' ? text(node.props.children) : node ?? '';
}
const render = (fn, props) => { cursor = 0; return flatten(fn(props)); };
const reset = () => { state = []; cursor = 0; };
const find = (nodes, type, name) => nodes.find(n => n.type === type && (n.props['aria-label'] || text(n).trim()) === name);
const detail = load('_components/DetailSection.tsx');
imports['./_components/DetailSection'] = detail;
// Form names are usable by assistive technology; values/change handlers remain intact.
for (const [component, type, extra] of [
  ['FormInputRow', 'input', {}], ['FormSelectRow', 'select', { options: ['Baik'] }],
  ['FormEmployeeRow', 'input', { employees: [] }], ['FormCurrencyRow', 'input', {}],
]) {
  let changed;
  const nodes = render(detail[component], { label: 'Fixture field', value: '123', isEditMode: true, onChange: v => { changed = v; }, ...extra });
  find(nodes, type, 'Fixture field').props.onChange({ target: { value: '456' } });
  assert.equal(changed, '456');
}
assert(text(render(detail.DetailRow, { label: 'Empty', value: null })[0]).includes('-'));
const gallery = load('_components/PhotoGallery.tsx', '\nexport { Lightbox, PhotoCardSlot, VehicleDocumentCard };');
imports['./_components/PhotoGallery'] = { ...gallery, PhotoGallery: 'gallery' };
const page = load('page.tsx');
assetRouteId = 'create';
assert.throws(() => render(page.default, {}), { message: 'Redirect /bmn/assets' });
assetRouteId = 'fixture';
reset();
let nodes = render(page.default, {});
for (const [condition, expected] of [['Baik', 'success'], ['Rusak Ringan', 'warning'], ['Rusak Berat', 'danger'], ['Lain', 'neutral'], [null, 'neutral']]) {
  asset = { ...asset, kondisi: condition, status_bmn: 'Tidak Aktif' };
  nodes = render(page.default, {});
  assert.equal(nodes.find(n => text(n).trim() === (condition || 'Kondisi belum diisi') && n.props['data-status']).props['data-status'], expected);
  assert.equal(nodes.find(n => n.props['data-status'] && text(n).trim() === 'Tidak Aktif').props['data-status'], 'neutral');
}
const tabs = nodes.filter(n => n.props.role === 'tab');
assert.equal(tabs.length, 6);
const firstPanel = nodes.find(n => n.props.role === 'tabpanel');
const firstContent = nodes.find(n => n.type === 'motion.div');
assert.equal(nodes.find(n => n.type === 'presence').props.mode, 'wait');
assert.equal(nodes.find(n => n.type === 'presence').props.initial, false);
assert.equal(firstContent.props.initial.y, 8);
assert.equal(firstContent.props.exit.y, -8);
assert.equal(firstContent.props.transition.duration, .16);
tabs[0].props.onKeyDown({ key: 'ArrowLeft', preventDefault() {} });
nodes = render(page.default, {});
assert.equal(nodes.find(n => n.props.role === 'tab' && n.props['aria-selected']).props.id, focused);
assert.equal(nodes.find(n => n.props.role === 'tabpanel').props['aria-labelledby'], focused);
assert.equal(nodes.filter(n => n.props.role === 'tabpanel').length, 1);
const nextPanel = nodes.find(n => n.props.role === 'tabpanel');
assert.equal(nextPanel.key, firstPanel.key); // Keep the accessible panel; change its animated content.
const nextContent = nodes.find(n => n.type === 'motion.div');
assert.notEqual(nextContent.key, firstContent.key);
assert.equal(render(page.default, {}).find(n => n.type === 'motion.div').key, nextContent.key);
reducedMotion = true;
const reducedNodes = render(page.default, {});
const reducedContent = reducedNodes.find(n => n.type === 'motion.div');
assert.equal(reducedContent.props.initial.opacity, 1);
assert.equal(reducedContent.props.initial.y, 0);
assert.equal(reducedContent.props.exit.y, 0);
assert.equal(reducedContent.props.transition.duration, 0);
assert.equal(reducedNodes.find(n => n.type === 'motion.span').props.transition.duration, 0);
reducedMotion = false;
nodes.find(n => n.props.role === 'tab' && n.props['aria-selected']).props.onKeyDown({ key: 'Home', preventDefault() {} });
nodes = render(page.default, {});
assert.equal(nodes.find(n => n.props.role === 'tab' && n.props['aria-selected']).props.id, tabs[0].props.id);
find(nodes, 'button', 'Edit Aset').props.onClick();
nodes = render(page.default, {});
assert(find(nodes, 'input', 'Status BMN'));
find(nodes, 'input', 'Merk').props.onChange({ target: { value: 'Draft fixture' } });
nodes.find(n => n.props.role === 'tab' && n.key === 'finansial').props.onClick();
nodes = render(page.default, {});
nodes.find(n => n.props.role === 'tab' && n.key === 'identitas').props.onClick();
nodes = render(page.default, {});
assert.equal(find(nodes, 'input', 'Merk').props.value, 'Draft fixture');
find(nodes, 'button', 'Batal').props.onClick();
writable = false; reset(); nodes = render(page.default, {});
assert(!find(nodes, 'button', 'Edit Aset'));
query = { isLoading: true }; assert(text(render(page.default, {})[0]).includes('Memuat data aset'));
query = { isError: true }; assert(text(render(page.default, {})[0]).includes('Aset tidak ditemukan'));
query = {};
reset(); asset = { ...asset, foto_depan_url: '/bad-hero.jpg' };
nodes = render(page.default, {});
nodes.find(n => n.type === 'img' && n.props.src === '/bad-hero.jpg').props.onError();
nodes = render(page.default, {});
assert(!nodes.some(n => n.type === 'img' && n.props.src === '/bad-hero.jpg'));
assert(text(nodes[0]).includes('Foto tidak dapat dimuat'));
// Actual gallery navigation and focus restoration, with isolated photos/documents only.
const galleryProps = {
  assetId: 'fixture', assetName: 'Fixture', nup: '1', fotoGeotagPath: '/photo.jpg',
  fotoDepanUrl: '/front.jpg', isVehicle: true,
  bpkbDocument: { preview_urls: ['/p1.jpg', '/p2.jpg'] },
};
reset(); doc.activeElement = new Trigger();
render(gallery.PhotoGallery, galleryProps); handle.openLightbox('geotag');
nodes = render(gallery.PhotoGallery, galleryProps);
let content = nodes.find(n => n.type === 'DialogContent');
assert(content);
content.props.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
nodes = render(gallery.PhotoGallery, galleryProps);
assert(nodes.some(n => n.type === 'img' && n.props.src === '/front.jpg' && n.props.className === 'bmn-photo-full'));
nodes.find(n => n.type === 'Dialog').props.onOpenChange(false);
content.props.onCloseAutoFocus({ preventDefault() {} });
assert.equal(focused, 'trigger');
nodes = render(gallery.PhotoGallery, galleryProps);
assert(!nodes.some(n => n.type === 'Dialog'));
assert(!nodes.some(n => n.type === 'button' && /Hapus|Unggah|Verifikasi/.test(n.props['aria-label'] || text(n)) && !n.props.disabled));
find(nodes, 'button', 'Lihat BPKB').props.onClick();
nodes = render(gallery.PhotoGallery, galleryProps);
nodes.find(n => n.type === 'DialogContent').props.onKeyDown({ key: 'ArrowLeft', preventDefault() {} });
nodes = render(gallery.PhotoGallery, galleryProps);
assert(nodes.some(n => n.type === 'img' && n.props.src === '/p2.jpg'));
// Failed image has a stable fallback; a different URL can still load.
reset();
const preview = { url: '/bad.jpg', label: 'Fixture photo', total: 1, index: 0, onClose() {}, onPrev() { throw Error('Single photo'); }, onNext() { throw Error('Single photo'); }, onReturnFocus() {} };
nodes = render(gallery.Lightbox, preview);
nodes.find(n => n.type === 'img').props.onError();
nodes = render(gallery.Lightbox, preview);
assert(!nodes.some(n => n.type === 'img'));
assert(nodes.some(n => n.props.role === 'status' && text(n) === 'Foto tidak dapat dimuat'));
nodes.find(n => n.type === 'DialogContent').props.onKeyDown({ key: 'ArrowRight' });
assert(render(gallery.Lightbox, { ...preview, url: '/good.jpg' }).some(n => n.type === 'img'));
console.log('BMN detail: forms, statuses, tabs, edit/cancel, read-only/loading/error, photo/document navigation, focus return and image fallback PASS');
