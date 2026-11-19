/* eslint-disable @typescript-eslint/no-require-imports -- Run actual portable TypeScript sources. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(js, { module: compiledModule, exports: compiledModule.exports, require: name => name === './constants' ? { SUMBER_DANA_OPTIONS: [] } : load(path.resolve(path.dirname(file), `${name}.ts`)) }, { filename: file });
  return compiledModule.exports;
}
const web = load(path.join(root, 'frontend/src/app/kepegawaian/surat-tugas/_lib/activity-helpers.ts'));
const mobile = load(path.join(root, 'mobile/src/features/surat-tugas/assignmentPortalForm.ts'));
const common = { kotaAsal: 'samarinda', kotaTujuan: 'kabupaten berau', namaKegiatanText: 'inventarisasi bmn dan gps', tempatSpesifik: 'suaka margasatwa kelian' };
const cases = [
  { modeLokasi: 'luar_wilayah', jenisTugas: 'Perjalanan Dinas Luar Wilayah' },
  { modeLokasi: 'dalam_kawasan', jenisTugas: 'Perjalanan Dinas Dalam Kawasan / Wilayah' },
  { modeLokasi: 'tempat_saja', jenisTugas: 'Melaksanakan Kegiatan (1 Hari)' },
  { modeLokasi: 'tempat_saja', jenisTugas: 'Menugaskan Staf' },
  { modeLokasi: 'luar_wilayah', jenisTugas: 'Pengawasan / Pemeriksaan Pekerjaan', untukKegiatanText: 'pengawasan habitat', contohFormat: 'Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {kegiatan} dalam rangka {paket} di {tempat}' },
  { modeLokasi: 'luar_wilayah', jenisTugas: 'Perjalanan Dinas Luar Wilayah', namaKegiatanText: 'Melaksanakan Perjalanan Dinas dari Samarinda ke Berau dalam rangka Inventarisasi BMN di Hutan Lindung' },
  { modeLokasi: 'dalam_kawasan', jenisTugas: 'Perjalanan Dinas Dalam Kawasan / Wilayah', namaKegiatanText: 'monitoring *Nasalis larvatus* di Suaka Margasatwa Kelian' },
  { modeLokasi: 'tempat_saja', jenisTugas: 'Melaksanakan Kegiatan (1 Hari)', tempatSpesifik: '', kotaTujuan: '' },
];
for (const input of cases) assert.equal(mobile.buildKegiatanDiktumText({ ...common, ...input }), web.buildKegiatanDiktumText({ ...common, ...input }));
console.log(`PASS: ${cases.length} wording cases match the actual web helper, including custom templates, acronyms, pasted text and italic markers.`);
