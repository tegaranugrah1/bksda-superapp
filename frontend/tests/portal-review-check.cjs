const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/app/portal/_components/KalkulatorDinasTab.tsx'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
});

// Exercise the actual component initializers without effects, browser traffic or persistence.
function hydrate(saved, browser = true) {
  const states = [];
  let reads = 0;
  const react = {
    createElement: () => null,
    useState: (initial) => {
      const value = typeof initial === 'function' ? initial() : initial;
      states.push(value);
      return [value, () => {}];
    },
    useMemo: (fn) => fn(), useEffect: () => {}, useRef: () => ({ current: null }),
  };
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', 'window', 'localStorage', outputText)(
    mod, mod.exports,
    (id) => id === 'react' ? { ...react, default: react } : new Proxy({}, { get: () => () => null }),
    browser ? {} : undefined,
    { getItem: () => { reads++; return saved; } },
  );
  mod.exports.KalkulatorDinasTab({ currentUserName: 'Dummy Employee' });
  return { reads, fields: states.slice(2, 9) };
}

const draft = {
  namaKegiatan: 'Dummy patrol', lokasiTujuan: 'Dummy destination', pemegangPanjar: 'Dummy Employee',
  tanggalMulai: '2026-11-02', tanggalSelesai: '2026-11-03', uangPanjar: 250000,
  pengeluaranList: [{ id: 'dummy-1', nominal: 10000, kategori: 'Lain-lain' }],
};
const restored = hydrate(JSON.stringify(draft));
assert.equal(restored.reads, 1, 'A render must read and parse one draft snapshot');
assert.deepEqual(restored.fields, Object.values(draft), 'All seven saved fields must survive hydration');
for (const saved of [null, '{malformed']) {
  const fallback = hydrate(saved);
  assert.equal(fallback.reads, 1);
  assert.equal(fallback.fields[0], 'Perjalanan Dinas');
  assert.equal(fallback.fields[5], 0);
  assert.deepEqual(fallback.fields[6], []);
}
assert.equal(hydrate(null, false).reads, 0, 'Server rendering must not read browser storage');
console.log('PASS: draft read once, all fields restored, missing/malformed storage and SSR supported.');
