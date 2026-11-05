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

const {
  getDefaultDataForTemplate,
  parseYthList,
  formatYthList,
  detectPointLevel,
  getPointLevelClassName,
  parseRawDocumentText,
  splitPointMarkerAndText,
  getNextMarkerForSection,
  reindexParagraphMarkers,
} = docMod.exports;
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

console.log('[TEST] Checking Yth button and list helpers (parseYthList & formatYthList)...');
const sampleYthMulti = '1. Kepala Seksi Wilayah I\n2. Kepala Seksi Wilayah II\n3. Kepala Seksi Wilayah III';
const parsedMulti = parseYthList(sampleYthMulti);
assert.equal(parsedMulti.length, 3);
assert.equal(parsedMulti[0], 'Kepala Seksi Wilayah I');
assert.equal(parsedMulti[1], 'Kepala Seksi Wilayah II');
assert.equal(parsedMulti[2], 'Kepala Seksi Wilayah III');
assert.equal(formatYthList(parsedMulti), sampleYthMulti);

const sampleYthSingle = 'Kepala Balai KSDA Kalimantan Timur';
const parsedSingle = parseYthList(sampleYthSingle);
assert.equal(parsedSingle.length, 1);
assert.equal(parsedSingle[0], sampleYthSingle);
assert.equal(formatYthList(parsedSingle), sampleYthSingle, 'Single Yth should have NO prefix number');
console.log('✅ Yth list helpers verified.');

console.log('[TEST] Checking Point hierarchy detection (detectPointLevel & CSS classes)...');
assert.equal(detectPointLevel('Menindaklanjuti Nota Dinas...'), 0);
assert.equal(detectPointLevel('1. Sesuai Keputusan Kepala BKN...'), 1);
assert.equal(detectPointLevel('a. Kinerja (sumbu Y), antara lain:'), 2);
assert.equal(detectPointLevel('i. Kinerja utama, dengan data...'), 3);
assert.equal(detectPointLevel('ii. Kinerja penguat...'), 3);
assert.equal(detectPointLevel('1) Riwayat penilaian SKP...'), 3);
assert.equal(detectPointLevel('a) Butir huruf kurung...'), 4);
assert.equal(detectPointLevel('Demikian kami sampaikan...'), 0);

assert.equal(getPointLevelClassName(1), 'poin-item poin-level-1');
assert.equal(getPointLevelClassName(2), 'poin-item poin-level-2');
assert.equal(getPointLevelClassName(3), 'poin-item poin-level-3');
assert.equal(getPointLevelClassName(4), 'poin-item poin-level-4');
console.log('✅ Point hierarchy detection verified.');

console.log('[TEST] Checking Smart Raw Text Parser on 31-item Simata BKN text...');
const rawSimata = `Menindaklanjuti Nota Dinas Sekretaris Direktorat Jenderal KSDAE Nomor: ND.1148/SKSDAE/
KSDMOTL/PEG.05.02/B/06/2026 tanggal 18 Juni 2026 Hal seperti pokok surat di atas, disampaikan
hal-hal sebagai berikut :
1. Sesuai Keputusan Kepala BKN Nomor 411 Tahun 2025, Kementerian Kehutanan berkomitmen
untuk menggunakan Simata BKN (Sistem Informasi Manajemen Talenta BKN) pada tahun
2026, untuk itu perlu dilakukan percepatan kesediaan data yang diperlukan dalam proses talent
pool SIMATA. Adapun parameter dan bobot penilaian manajemen talenta sesuai Keputusan
Kepala BKN Nomor 411 Tahun 2025 terdiri dari:
a. Kinerja (sumbu Y), antara lain:
i. Kinerja utama, dengan data pendukung berupa penilaian kinerja (hasil evaluasi SKP dan
perilaku kerja);
ii. Kinerja penguat, dengan data pendukung berupa sertifikat penghargaan, keputusan
penugasan pegawai dalam tim kerja, dan hasil umpan balik kinerja 360 derajat.
b. Potensial (sumbu X), antara lain:
i. Kompetensi, dengan data pendukung berupa hasil penilaian kompetensi, riwayat
pengembangan kompetensi, dan riwayat pengalaman jabatan;
ii. Potensi, dengan data pendukung berupa hasil penilaian potensi;
iii. Kualifikasi, dengan data pendukung berupa tingkat pendidikan formal terakhir dan
kesesuaian bidang ilmu;
iv. Integritas dan moralitas, dengan data pendukung berupa riwayat hukuman disiplin.
2. Pemenuhan parameter penilaian kompetensi dan potensi sebagaimana sumbu Y dilakukan
melalui kegiatan CACT atau ProASN dan Pemenuhan data umpan balik kinerja 360 derajat
telah dilakukan melalui Simpeg Kementerian Kehutanan
3. Data pendukung sebagaimana poin 1 berupa:
a. Penilaian Kinerja diunggah melalui SIMPEG;
b. Penghargaan diunggah melalui MyASN ataupun SIASN BKN;
c. Keputusan/surat tugas terkait penugasan tim kerja diunggah melalui SIMPEG Kementerian
Kehutanan untuk selanjutnya dilakukan validasi dan dipadankan pada Simata BKN;
d. Penilaian umpan balik 360 derajat yang telah dilakukan akan dilakukan pemadanan pada
Simata BKN secara bertahap;
e. Riwayat pengembangan kompetensi berupa sertifikat pelatihan/sertifikasi/ diklat fungsional
diunggah melalui MyASN ataupun SIASN BKN;
f. Riwayat pengalaman jabatan berupa surat tugas sebagai pelaksana harian/pelaksana
tugas diunggah melalui Simpeg Kementerian Kehutanan dan dilakukan pemadanan data
melalui API dengan SIASN BKN;
g. Riwayat pendidikan formal diunggah melalui SIMPEG.
4. Sehubungan dengan hal tersebut, agar Saudara(i) menyampaikan kepada seluruh ASN
diwilayah kerja masing-masing untuk :
a. Mengunggah dan/atau memperbarui data-data sebagaimana Poin 3 di atas, berupa:
1) Riwayat penilaian SKP dan perilaku kerja;
2) Riwayat pemberian penghargaan ASN selama lima (5) tahun terakhir;
3) Riwayat penugasan dalam tim kerja selama kurun waktu dua (2) tahun terakhir;
4) Riwayat pelatihan dan pengembangan kompetensi dibuktikan dengan sertifikat
kepesertaan dan/atau sertifikat kompetensi selama tiga (3) tahun terakhir;
5) Riwayat Pelaksana Tugas (Plt.), Pelaksana Harian (Plh.), dan Penjabat (Pj.);
6) Riwayat pendidikan formal yang telah ditetapkan pencantuman gelarnya;
7) Riwayat keputusan pengenaan sanksi disiplin selama lima tahun terakhir.
b. ASN yang belum melakukan penilaian 360 derajat agar segera melakukan penilaian 360
derajat.
5. Batas waktu pengisian data di atas sampai dengan tanggal 31 Juli 2026 pukul 16.30 WIB.
Demikian kami sampaikan, atas perhatiannya diucapkan terima kasih`;

const parsedSimata = parseRawDocumentText(rawSimata);
assert.equal(parsedSimata.length, 31, 'Must extract exactly 31 paragraphs');
assert.equal(detectPointLevel(parsedSimata[0]), 0);
assert.equal(detectPointLevel(parsedSimata[1]), 1); // 1.
assert.equal(detectPointLevel(parsedSimata[2]), 2); // a.
assert.equal(detectPointLevel(parsedSimata[3]), 3); // i.
assert.equal(detectPointLevel(parsedSimata[4]), 3); // ii.
assert.equal(detectPointLevel(parsedSimata[5]), 2); // b.
assert.equal(detectPointLevel(parsedSimata[6]), 3); // i.
assert.equal(detectPointLevel(parsedSimata[10]), 1); // 2.
assert.equal(detectPointLevel(parsedSimata[11]), 1); // 3.
assert.equal(detectPointLevel(parsedSimata[12]), 2); // a.
assert.equal(detectPointLevel(parsedSimata[19]), 1); // 4.
assert.equal(detectPointLevel(parsedSimata[20]), 2); // a.
assert.equal(detectPointLevel(parsedSimata[21]), 3); // 1)
assert.equal(detectPointLevel(parsedSimata[27]), 3); // 7)
assert.equal(detectPointLevel(parsedSimata[28]), 2); // b.
assert.equal(detectPointLevel(parsedSimata[29]), 1); // 5.
assert.equal(detectPointLevel(parsedSimata[30]), 0); // Demikian...
console.log('✅ Smart Raw Text Parser verified on 31 nested items.');

console.log('[TEST] Checking BSrE BSSN footnote presence in SuratDinasDocument...');
assert(docSource.includes('Balai Besar Sertifikasi Elektronik (BSrE)'));
assert(docSource.includes('Badan Siber dan Sandi Negara (BSSN)'));
console.log('✅ BSrE BSSN footnote verified.');

console.log('[TEST] Checking Marker and Content split (splitPointMarkerAndText)...');
const split1 = splitPointMarkerAndText('1. Sesuai Keputusan Kepala BKN...');
assert.equal(split1.marker, '1.');
assert.equal(split1.content, 'Sesuai Keputusan Kepala BKN...');

const split2 = splitPointMarkerAndText('a. Kinerja (sumbu Y), antara lain:');
assert.equal(split2.marker, 'a.');
assert.equal(split2.content, 'Kinerja (sumbu Y), antara lain:');

const split3 = splitPointMarkerAndText('i. Kinerja utama, dengan data...');
assert.equal(split3.marker, 'i.');
assert.equal(split3.content, 'Kinerja utama, dengan data...');

const split4 = splitPointMarkerAndText('1) Riwayat penilaian SKP...');
assert.equal(split4.marker, '1)');
assert.equal(split4.content, 'Riwayat penilaian SKP...');
console.log('✅ splitPointMarkerAndText verified.');

console.log('[TEST] Checking Sequential numbering & restart rules (getNextMarkerForSection)...');
// Simulation of user building document:
const simList = [
  'Menindaklanjuti Nota Dinas...',
  '1. Sesuai Keputusan Kepala BKN...',
];

// Under Point 1: first sub-point letter should be 'a. '
const subA = getNextMarkerForSection(simList, simList.length, 'letter');
assert.equal(subA, 'a. ', 'First sub-point under Point 1 must be a.');
simList.push('a. Kinerja (sumbu Y)');

// Under sub a: first roman should be 'i. '
const romI = getNextMarkerForSection(simList, simList.length, 'roman');
assert.equal(romI, 'i. ', 'First roman under sub a must be i.');
simList.push('i. Kinerja utama');

// Under sub a: second roman should be 'ii. '
const romII = getNextMarkerForSection(simList, simList.length, 'roman');
assert.equal(romII, 'ii. ', 'Second roman under sub a must be ii.');
simList.push('ii. Kinerja penguat');

// Under Point 1: second sub-point letter should be 'b. ' (NOT j.)
const subB = getNextMarkerForSection(simList, simList.length, 'letter');
assert.equal(subB, 'b. ', 'Second sub-point under Point 1 must be b.');
simList.push('b. Potensial (sumbu X)');

// Under sub b: roman MUST RESTART from 'i. ' (NOT iii.)
const romIRestart = getNextMarkerForSection(simList, simList.length, 'roman');
assert.equal(romIRestart, 'i. ', 'Roman under sub b must restart from i.');
simList.push('i. Kompetensi');

// Add Point 2: next main point should be '2. '
const pt2 = getNextMarkerForSection(simList, simList.length, 'num');
assert.equal(pt2, '2. ', 'Next main point must be 2.');
simList.push('2. Pemenuhan parameter...');

// Add Point 3: next main point should be '3. '
const pt3 = getNextMarkerForSection(simList, simList.length, 'num');
assert.equal(pt3, '3. ', 'Next main point must be 3.');
simList.push('3. Data pendukung...');

// Under Point 3: sub-point letter MUST RESTART from 'a. ' (NOT k.)
const subARestart = getNextMarkerForSection(simList, simList.length, 'letter');
assert.equal(subARestart, 'a. ', 'Letter under Point 3 must restart from a.');
simList.push('a. Penilaian Kinerja');

const subB2 = getNextMarkerForSection(simList, simList.length, 'letter');
assert.equal(subB2, 'b. ', 'Next letter under Point 3 must be b.');
simList.push('b. Penghargaan');

// Under Point 4: brackets test
simList.push('4. Sehubungan dengan hal tersebut...');
simList.push('a. Mengunggah data-data:');

// Under sub a: first bracket should be '1) '
const brk1 = getNextMarkerForSection(simList, simList.length, 'bracket');
assert.equal(brk1, '1) ', 'First bracket under sub a must be 1)');
simList.push('1) Riwayat penilaian SKP');

// Second bracket should be '2) '
const brk2 = getNextMarkerForSection(simList, simList.length, 'bracket');
assert.equal(brk2, '2) ', 'Second bracket under sub a must be 2)');
simList.push('2) Riwayat pemberian penghargaan');

console.log('✅ getNextMarkerForSection verified with restarts for sub a, butir i, and 1).');

console.log('[TEST] Checking Print CSS multi-page margins (@page and @page :first)...');
assert(docSource.includes('@page { size: A4 portrait; margin: 0; }'), 'Base @page must have 0 margin as in surat-tugas builder');
assert(docSource.includes('@page :first { margin: 0; }'), '@page :first must have 0 margin for KOP');
console.log('✅ Multi-page @page print margins verified.');

console.log('[TEST] Checking Point hierarchy detection for empty markers (e.g. freshly inserted points)...');
assert.equal(detectPointLevel('5.'), 1);
assert.equal(detectPointLevel('5. '), 1);
assert.equal(detectPointLevel('a.'), 2);
assert.equal(detectPointLevel('a. '), 2);
assert.equal(detectPointLevel('i.'), 3);
assert.equal(detectPointLevel('1)'), 3);
assert.equal(detectPointLevel('a)'), 4);
console.log('✅ Empty marker detection verified.');

console.log('[TEST] Checking Sequential numbering incrementing past 5 (empty & with text)...');
const sampleList5 = [
  'Menindaklanjuti...',
  '1. Poin 1',
  '2. Poin 2',
  '3. Poin 3',
  '4. Poin 4',
  '5. Poin 5',
  'Demikian...',
];
// Insert at length - 1 (before Demikian)
const nextAfter5 = getNextMarkerForSection(sampleList5, sampleList5.length - 1, 'num');
assert.equal(nextAfter5, '6. ', 'Next number after 5 must be 6.');
sampleList5.splice(sampleList5.length - 1, 0, nextAfter5); // inserts '6. '

const nextAfter6 = getNextMarkerForSection(sampleList5, sampleList5.length - 1, 'num');
assert.equal(nextAfter6, '7. ', 'Next number after 6 (even without text) must be 7.');
sampleList5.splice(sampleList5.length - 1, 0, nextAfter6); // inserts '7. '

const nextAfter7 = getNextMarkerForSection(sampleList5, sampleList5.length - 1, 'num');
assert.equal(nextAfter7, '8. ', 'Next number after 7 must be 8.');
console.log('✅ Sequential numbering incrementing past 5 verified (6, 7, 8...).');

console.log('[TEST] Checking BSrE BSSN footnote hidden in print...');
assert(docSource.includes('print:hidden'), 'BSrE footer must have print:hidden so it is excluded from printed paper');
assert(docSource.includes('.pkpknl-footer-bsre {\n      display: none !important;\n    }'), 'BSrE footer must be display: none in print styles');
console.log('✅ BSrE BSSN footnote print hiding verified.');

console.log('[TEST] Checking reindexParagraphMarkers & elimination of duplicate 5s/8s...');
const duplicateList = [
  'Menindaklanjuti...',
  '1. Poin 1',
  '2. Poin 2',
  '3. Poin 3',
  '4. Poin 4',
  '5. Poin 5',
  '5. duplicate',
  'a. sub-poin',
  '5. duplicate again',
  'Demikian...'
];
const reindexed = reindexParagraphMarkers(duplicateList);
assert.equal(reindexed[5], '5. Poin 5');
assert.equal(reindexed[6], '6. duplicate');
assert.equal(reindexed[7], 'a. sub-poin');
assert.equal(reindexed[8], '7. duplicate again');
console.log('✅ reindexParagraphMarkers correctly normalizes 5., 6., a., 7.');

console.log('[TEST] Checking removal of redundant bottom action bar in dinas/page.tsx...');
const pageSource = fs.readFileSync(path.resolve(__dirname, '../src/app/surat/keluar/dinas/page.tsx'), 'utf8');
assert(!pageSource.includes('Tambah Butir ke Akhir:'), 'Bottom action bar "Tambah Butir ke Akhir:" should be deleted');
console.log('✅ Bottom action bar removed.');

console.log('[TEST] Checking Unduh dropdown with PDF & Word options in dinas/page.tsx...');
assert(pageSource.includes('Unduh PDF (.pdf)'), 'Must include Unduh PDF option');
assert(pageSource.includes('Unduh Word (.doc)'), 'Must include Unduh Word option');
assert(pageSource.includes('handleExportPdf'), 'Must have handleExportPdf handler');
assert(pageSource.includes('handleExportWord'), 'Must have handleExportWord handler');

const exportLibPath = path.resolve(__dirname, '../src/app/surat/_lib/export-surat-dinas.ts');
assert(fs.existsSync(exportLibPath), 'export-surat-dinas.ts must exist');
const exportLibSource = fs.readFileSync(exportLibPath, 'utf8');
assert(exportLibSource.includes('export async function exportSuratDinasWord'), 'Must export exportSuratDinasWord');
assert(exportLibSource.includes('export async function exportSuratDinasPdf'), 'Must export exportSuratDinasPdf');
console.log('✅ Unduh dropdown with Word and PDF export verified.');

console.log('[TEST] Checking ${nomor_naskah} switcher and indicator...');
assert(pageSource.includes('isAutoNomorNaskah'), 'Must have isAutoNomorNaskah flag');
assert(pageSource.includes('Pola Nomor Baku'), 'Must have Pola Nomor Baku option');
assert(pageSource.includes('Nomor Naskah (${nomor_naskah})'), 'Must have Nomor Naskah (${nomor_naskah}) option');

assert(docSource.includes('nota-dinas-nomor-wrapper'), 'Must include fixed-anchor wrapper nota-dinas-nomor-wrapper');

const keluarPageSource = fs.readFileSync(path.resolve(__dirname, '../src/app/surat/keluar/page.tsx'), 'utf8');
assert(keluarPageSource.includes('Perlu Nomor Definitif'), 'Surat Keluar list must display Perlu Nomor Definitif badge for ${nomor_naskah}');
console.log('✅ ${nomor_naskah} switcher, fixed NOMOR position, and Surat Keluar list badge verified.');

console.log('✅ ALL NOTA DINAS, NESTED POINTS, YTH BUTTONS & BSrE ASSERTIONS PASSED!');
