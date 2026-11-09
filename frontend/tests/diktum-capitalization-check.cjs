'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const ts = frontendRequire('typescript');

const helpersSource = fs.readFileSync(
  path.join(frontendRoot, 'src/app/kepegawaian/surat-tugas/_lib/activity-helpers.ts'),
  'utf-8'
);

const transpiled = ts.transpileModule(helpersSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const mockExports = {};
const mockModule = { exports: mockExports };
const evalFn = new Function('exports', 'module', 'require', transpiled.outputText);
evalFn(mockExports, mockModule, (mod) => {
  if (mod.includes('constants')) {
    return { SUMBER_DANA_OPTIONS: [] };
  }
  return {};
});

const { capitalizeOfficialText, buildKegiatanDiktumText } = mockModule.exports;

console.log('[TEST] Checking capitalizeOfficialText...');

// 1. Title case with official acronyms and prepositions
const sample1 = 'Melaksanakan Perjalanan Dinas dari Samarinda ke kabupaten kutai barat dalam rangka inventarisasi bmn di suaka badak kelian;';
const expected1 = 'Melaksanakan Perjalanan Dinas dari Samarinda ke Kabupaten Kutai Barat dalam rangka Inventarisasi BMN di Suaka Badak Kelian;';
const res1 = capitalizeOfficialText(sample1);
assert.equal(res1, expected1, `Expected "${expected1}", got "${res1}"`);

// 2. Uppercase input normalization
const sample2 = 'MELAKSANAKAN PERJALANAN DINAS DARI SAMARINDA KE KABUPATEN KUTAI BARAT DALAM RANGKA INVENTARISASI BMN DI SUAKA BADAK KELIAN;';
const res2 = capitalizeOfficialText(sample2);
assert.equal(res2, expected1, `Expected "${expected1}", got "${res2}"`);

// 3. Italic text & forestry acronyms
const sample3 = 'inventarisasi satwa liar (*bekantan*) di kphp kendilo';
const expected3 = 'Inventarisasi Satwa Liar (*Bekantan*) di KPHP Kendilo';
const res3 = capitalizeOfficialText(sample3);
assert.equal(res3, expected3, `Expected "${expected3}", got "${res3}"`);

console.log('[TEST] Checking buildKegiatanDiktumText...');

// 4. Build from separated lowercase input fields
const resBuilt1 = buildKegiatanDiktumText({
  modeLokasi: 'luar_wilayah',
  jenisTugas: 'Perjalanan Dinas Luar Wilayah',
  kotaAsal: 'Samarinda',
  kotaTujuan: 'kabupaten kutai barat',
  namaKegiatanText: 'inventarisasi bmn',
  tempatSpesifik: 'suaka badak kelian',
});
assert.equal(
  resBuilt1,
  'Melaksanakan Perjalanan Dinas dari Samarinda ke Kabupaten Kutai Barat dalam rangka Inventarisasi BMN di Suaka Badak Kelian'
);

// 5. Build from full raw pasted sentence in namaKegiatanText
const resBuilt2 = buildKegiatanDiktumText({
  modeLokasi: 'luar_wilayah',
  jenisTugas: 'Perjalanan Dinas Luar Wilayah',
  kotaAsal: 'Samarinda',
  namaKegiatanText: 'Melaksanakan Perjalanan Dinas dari Samarinda ke kabupaten kutai barat dalam rangka inventarisasi bmn di suaka badak kelian;',
});
assert.equal(
  resBuilt2,
  'Melaksanakan Perjalanan Dinas dari Samarinda ke Kabupaten Kutai Barat dalam rangka Inventarisasi BMN di Suaka Badak Kelian'
);

console.log('✅ ALL CAPITALIZATION AND DIKTUM ASSERTIONS PASSED!');
