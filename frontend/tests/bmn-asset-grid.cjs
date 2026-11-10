/* eslint-disable @typescript-eslint/no-require-imports -- Standalone fixture, no browser or API writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}, globals = {}) {
  const mod = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/bmn', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText, { module: mod, exports: mod.exports, URL, process: { env: {} }, ...globals, require: name => {
    assert(name in imports, `Unexpected import ${name}`); return imports[name];
  } }, { timeout: 1000 });
  return mod.exports;
}

const photos = load('_lib/asset-photos.ts');
const { getAssetUser } = load('_lib/asset-utils.ts');
assert.equal(getAssetUser({ pengguna: 'User', nama_pengguna: 'Name', penanggung_jawab: { nama_lengkap: 'PIC' } }), 'User');
assert.equal(getAssetUser({ nama_pengguna: 'Name', penanggung_jawab: { nama_lengkap: 'PIC' } }), 'Name');
assert.equal(getAssetUser({ penanggung_jawab: { nama_lengkap: 'PIC' } }), 'PIC');
assert.equal(getAssetUser({}), null);
const priority = ['foto_geotag_url', 'foto_depan_url', 'foto_belakang_url', 'foto_kiri_url', 'foto_kanan_url', 'foto_lokasi_url', 'foto_url'];
const source = Object.fromEntries(priority.map((name, index) => [name, `/storage/photo-${index}.jpg`]));
for (const name of priority) {
  assert.equal(photos.getPrimaryPhoto(source).url, source[name]);
  delete source[name];
}
assert.equal(photos.getPrimaryPhoto(source), null);
assert.equal(photos.getPrimaryPhoto({ foto_geotag_path: 'https://images.example.test/geotag.jpg' }).url, 'https://images.example.test/geotag.jpg');
assert.equal(photos.getPrimaryPhoto({ foto_bpkb_1_url: '/private/bpkb.jpg', foto_stnk_1_url: '/private/stnk.jpg' }), null);
assert.equal(photos.resolvePhotoUrl('https://drive.google.com/file/d/fixture_photo/view'), 'https://lh3.googleusercontent.com/d/fixture_photo');
assert.equal(photos.resolvePhotoUrl('/api/bmn/assets/fixture/photo/depan/view?v=7'), '/api/bmn/assets/fixture/photo/depan/view?v=7');
assert.equal(photos.resolvePhotoUrl('https://images.example.test/asset.jpg'), 'https://images.example.test/asset.jpg');
const absolutePhotos = load('_lib/asset-photos.ts', {}, { process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example.test/api' } } });
assert.equal(absolutePhotos.resolvePhotoUrl('/api/bmn/assets/fixture/photo/depan/view?v=7'), 'https://api.example.test/api/bmn/assets/fixture/photo/depan/view?v=7');

let width = 390, blocked = false, client = true, subscription;
const storage = new Map();
const listeners = new Map();
const mediaListeners = new Set();
const browser = {
  matchMedia: () => ({ get matches() { return width < 768; }, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }),
  localStorage: { getItem: key => { if (blocked) throw Error('Blocked'); return storage.get(key) ?? null; }, setItem: (key, value) => { if (blocked) throw Error('Blocked'); storage.set(key, value); } },
  addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name),
  dispatchEvent: event => { listeners.get(event.type)?.(); },
};
const viewImports = { react: { useSyncExternalStore: (subscribe, snapshot, server) => {
  subscription = subscribe; return client ? snapshot() : server();
} } };
const hook = load('assets/use-asset-view.ts', viewImports, { window: browser, Event });
for (const size of [359, 390, 767, 768, 1024, 1440]) {
  width = size; assert.equal(hook.useAssetView()[0], size < 768 ? 'grid' : 'table');
}
width = 390; hook.useAssetView()[1]('table');
width = 1024; assert.equal(hook.useAssetView()[0], 'table'); hook.useAssetView()[1]('grid');
width = 390; assert.equal(hook.useAssetView()[0], 'table');
const reloaded = load('assets/use-asset-view.ts', viewImports, { window: browser, Event });
assert.equal(reloaded.useAssetView()[0], 'table', 'Remember mobile preference after reload');
width = 1024; assert.equal(reloaded.useAssetView()[0], 'grid', 'Desktop preference is independent');
storage.clear(); storage.set('bmn-assets-view-desktop', 'invalid'); assert.equal(reloaded.useAssetView()[0], 'table');
blocked = true; width = 390;
assert.equal(reloaded.useAssetView()[0], 'grid'); reloaded.useAssetView()[1]('table'); assert.equal(reloaded.useAssetView()[0], 'table');
client = false; assert.equal(reloaded.useAssetView()[0], null, 'SSR must use a stable preparation state');
const cleanup = subscription(() => {}); assert.equal(mediaListeners.size, 1); cleanup(); assert.equal(mediaListeners.size, 0); assert.equal(listeners.size, 0);

let state = [], cursor = 0;
const element = (type, props) => ({ type, props: props || {} });
const preview = load('assets/_components/AssetPhotoPreview.tsx', {
  react: { useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; } },
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'lucide-react': new Proxy({}, { get: (_, key) => `icon:${String(key)}` }),
  '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogClose'].map(key => [key, key])),
});
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object') return [];
  return [node, ...flatten(node.props.children)];
}
const render = photo => { cursor = 0; return flatten(preview.AssetPhotoPreview({ photo, name: 'Fixture Photo', nup: '123' })); };
assert(render(null).some(node => node.props.children === 'Belum ada foto'));
const photo = { url: '/api/bmn/assets/fixture/photo/depan/view?v=1', label: 'Tampak Depan' };
let nodes = render(photo);
assert.equal(nodes.find(node => node.type === 'img' && node.props.loading).props.loading, 'lazy');
assert.equal(nodes.find(node => node.type === 'DialogContent').props['data-module'], 'bmn');
assert(!nodes.some(node => node.props.href), 'Photo preview must not navigate to detail');
nodes.find(node => node.type === 'img' && !node.props.loading).props.onError();
assert(render(photo).some(node => node.props.role === 'status' && node.props.children === 'Foto tidak dapat dimuat'));
nodes = render(photo); nodes.find(node => node.type === 'img' && node.props.loading).props.onError();
assert(!render(photo).some(node => node.type === 'DialogTrigger'), 'Failed thumbnail must not offer an unusable preview');
assert(render({ ...photo, url: `${photo.url}2` }).some(node => node.type === 'DialogTrigger'), 'A changed photo URL may load again');
console.log('PASS: photo priority/URLs and document exclusion, responsive defaults, independent saved preferences, blocked storage/SSR/cleanup, preview loading/error states.');
