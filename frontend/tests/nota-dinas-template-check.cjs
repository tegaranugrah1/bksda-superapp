'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const ts = frontendRequire('typescript');

console.log('[TEST] Checking kop-bksda-alamat.png existence...');
const kopPath = path.join(frontendRoot, 'public', 'kop-bksda-alamat.png');
assert(fs.existsSync(kopPath), 'public/kop-bksda-alamat.png must exist');
const kopStat = fs.statSync(kopPath);
assert(kopStat.size > 1000, 'kop-bksda-alamat.png must not be empty');
console.log('✅ KOP image verified.');

console.log('[TEST] Checking TemplatePickerModal ALL_TEMPLATES favorites...');
const modalSource = fs.readFileSync(
  path.join(frontendRoot, 'src/app/surat/_components/TemplatePickerModal.tsx'),
  'utf-8'
);
const modalTranspiled = ts.transpileModule(modalSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  },
});
const modalExports = {};
const modalMod = { exports: modalExports };
const evalModal = new Function('exports', 'module', 'require', modalTranspiled.outputText);
evalModal(modalExports, modalMod, (mod) => {
  return { default: { memo: (c) => c, createElement: () => null }, createElement: () => null };
});

const { ALL_TEMPLATES } = modalMod.exports;
assert(Array.isArray(ALL_TEMPLATES), 'ALL_TEMPLATES must be an array');
const suratDinas = ALL_TEMPLATES.find((t) => t.id === 'surat_dinas');
const notaDinas = ALL_TEMPLATES.find((t) => t.id === 'nota_dinas');
const memorandum = ALL_TEMPLATES.find((t) => t.id === 'memorandum');

assert(suratDinas && suratDinas.isFavorite === true, 'Surat Dinas must be favorited');
assert(notaDinas && notaDinas.isFavorite === true, 'Nota Dinas must be favorited');
assert(memorandum && memorandum.isFavorite === true, 'Memorandum must be favorited');
const favorites = ALL_TEMPLATES.filter((t) => t.isFavorite);
assert.equal(favorites.length, 3, 'Must have exactly 3 favorite templates');
console.log('✅ Favorites verified (Surat Dinas, Nota Dinas, Memorandum).');

console.log('[TEST] Checking SuratDinasDocument getDefaultDataForTemplate("nota_dinas")...');
const docSource = fs.readFileSync(
  path.join(frontendRoot, 'src/app/surat/_components/SuratDinasDocument.tsx'),
  'utf-8'
);
const docTranspiled = ts.transpileModule(docSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  },
});
const docExports = {};
const docMod = { exports: docExports };
const evalDoc = new Function('exports', 'module', 'require', docTranspiled.outputText);
evalDoc(docExports, docMod, (mod) => {
  if (mod.includes('letter-utils')) return { formatNipLabel: () => '' };
  return { default: { memo: (c) => c, createElement: () => null }, memo: (c) => c, createElement: () => null };
});

const { getDefaultDataForTemplate } = docMod.exports;
const ndData = getDefaultDataForTemplate('nota_dinas');

assert.equal(ndData.templateType, 'nota_dinas');
assert.equal(ndData.nomor, 'ND.246/K.18/TU/PEG.09.01/B/05/2026');
assert.equal(ndData.perihal, 'Kartu Istri/Kartu Suami Aparatur Sipil Negara Virtual');
assert.equal(ndData.lampiran, '1 (satu) lembar');
assert(ndData.yth.includes('Kepala Seksi KSDA Wilayah I Berau'));
assert.equal(ndData.paragraf.length, 6, 'Must have 6 paragraphs: 1 pembuka, 4 poin, 1 penutup');
assert(ndData.paragraf[1].startsWith('1. '));
assert(ndData.paragraf[2].startsWith('2. '));
assert(ndData.paragraf[3].startsWith('3. '));
assert(ndData.paragraf[4].startsWith('4. '));
assert(ndData.paragraf[5].startsWith('Demikian kami sampaikan'));

console.log('✅ ALL NOTA DINAS & FAVORITES ASSERTIONS PASSED!');
