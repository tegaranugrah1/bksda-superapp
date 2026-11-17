'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const ts = frontendRequire('typescript');

function loadSuratDinasModule() {
  const source = fs.readFileSync(
    path.join(frontendRoot, 'src/app/surat/_components/SuratDinasDocument.tsx'),
    'utf-8'
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
    },
  });
  const mod = { exports: {} };
  const fn = new Function('exports', 'module', 'require', transpiled.outputText);
  fn(mod.exports, mod, (id) => {
    if (id === 'react') {
      return {
        default: { memo: (c) => c, createElement: () => null },
        memo: (c) => c,
        createElement: () => null,
      };
    }
    return {};
  });
  return { exports: mod.exports, source };
}

const { exports: docMod, source: docSource } = loadSuratDinasModule();
const {
  isRincianBlock,
  createDefaultRincianBlock,
  migrateLegacyUndanganPayload,
  getDefaultDataForTemplate,
  parseRawDocumentText,
  detectPointLevel,
  getNextMarkerForSection,
  reindexParagraphMarkers,
  SURAT_DINAS_BASE_CSS,
} = docMod;

// 1. createDefaultRincianBlock & isRincianBlock
const defBlock = createDefaultRincianBlock();
assert(isRincianBlock(defBlock), 'createDefaultRincianBlock must produce a valid ParagrafRincianBlock');
assert.deepEqual(
  defBlock.items.map((r) => r.label),
  ['Hari/Tanggal', 'Tempat', 'Agenda'],
  'Default rincian block must contain Hari/Tanggal, Tempat, Agenda'
);
assert.equal(isRincianBlock('1. Poin biasa'), false);
assert.equal(detectPointLevel(defBlock), 0);

// 2. undangan default payload places Rincian inside paragraf (Card 3)
const undanganDef = getDefaultDataForTemplate('undangan');
assert(Array.isArray(undanganDef.paragraf) && undanganDef.paragraf.length >= 3);
const undanganRincian = undanganDef.paragraf.find((item) => isRincianBlock(item));
assert(undanganRincian, 'Default undangan template must include a rincian block in paragraf');
assert.equal(undanganDef.acaraHariTanggal, undefined, 'Default undangan should not populate legacy acaraHariTanggal');

// 3. migrateLegacyUndanganPayload converts old undangan records cleanly and idempotently
const legacyPayload = {
  templateType: 'undangan',
  acaraHariTanggal: 'Senin, 23 November 2026',
  acaraWaktu: '09.00 WITA - selesai',
  acaraTempat: 'Ruang Rapat COP\nJl. Gito Gati No.100, Sleman',
  acaraNama: 'Peningkatan Kapasitas SDM Media Sosial',
  paragraf: [
    'Sehubungan dengan kegiatan dimaksud, dimohon kehadirannya pada:',
    'Demikian disampaikan, atas perhatiannya diucapkan terima kasih.',
  ],
};
const migrated = migrateLegacyUndanganPayload(legacyPayload);
assert.equal(migrated.paragraf.length, 3, 'Migrated undangan should insert 1 rincian block between opening & closing');
assert(isRincianBlock(migrated.paragraf[1]), 'Migrated rincian block must sit after opening paragraph');
assert.deepEqual(
  migrated.paragraf[1].items.map((r) => r.label),
  ['Hari/Tanggal', 'Waktu', 'Tempat', 'Agenda']
);
assert.equal(migrated.acaraHariTanggal, undefined);
assert.equal(migrated.acaraTempat, undefined);

const migratedTwice = migrateLegacyUndanganPayload(migrated);
assert.deepEqual(migratedTwice, migrated, 'migrateLegacyUndanganPayload must be idempotent');

// 4. Smart paste parses user screenshot format (including multi-line Tempat) without eating Nomor: prose
const sampleSingleLineColon = [
  'Dengan hormat, kami mengundang pengelola media sosial untuk hadir dalam kegiatan yang akan dilaksanakan pada:',
  '',
  'Hari/Tanggal  : Senin, 23 November 2026',
  'Tempat        : Ruang Rapat Centre for Orangutan Protection (COP),',
  '                Jl. Gito Gati No.100, Tegal Weru, Sariharjo, Kec. Ngaglik,',
  '                Kabupaten Sleman, Daerah Istimewa Yogyakarta',
  'Agenda        : Peningkatan Kapasitas SDM Pengelolaan Media Sosial',
  '',
  'Panitia menyediakan fasilitas ruang rapat dan konsumsi selama kegiatan berlangsung.',
].join('\n');

const parsedInline = parseRawDocumentText(sampleSingleLineColon);
assert.equal(parsedInline.length, 3, `Expected [pembuka, rincian, penutup], got ${parsedInline.length}`);
assert(isRincianBlock(parsedInline[1]), 'Middle parsed item must be a rincian block');
assert.deepEqual(
  parsedInline[1].items.map((r) => r.label),
  ['Hari/Tanggal', 'Tempat', 'Agenda']
);
assert(
  parsedInline[1].items[1].value.includes('\n') &&
    parsedInline[1].items[1].value.includes('Kabupaten Sleman'),
  'Multi-line Tempat address lines must stay grouped in Tempat row'
);

// Also verify split colon on next line ("Tempat\n: ...")
const sampleSplitColon = [
  'Dengan hormat, kegiatan dilaksanakan pada:',
  '',
  'Hari/Tanggal : Senin, 23 November 2026',
  'Tempat',
  ': Ruang Rapat Centre for Orangutan Protection (COP),',
  'Jl. Gito Gati No.100, Kec. Ngaglik,',
  'Kabupaten Sleman, Daerah Istimewa Yogyakarta',
  'Agenda',
  ': Peningkatan Kapasitas SDM Pengelolaan Media Sosial',
  '',
  'Atas perhatian dan kehadirannya diucapkan terima kasih.',
].join('\n');

const parsedSplit = parseRawDocumentText(sampleSplitColon);
assert(
  parsedSplit.some((item) => isRincianBlock(item) && item.items.length === 3),
  `Expected split-colon copy-paste to produce a 3-row rincian block, got: ${JSON.stringify(parsedSplit)}`
);

// 5. Point numbering continues cleanly across an embedded rincian block
const mixedList = [
  'Pembuka surat.',
  '1. Ketentuan pertama:',
  defBlock,
  '1. Ketentuan kedua:',
  '1. Ketentuan ketiga.',
  'Penutup surat.',
];
const reindexed = reindexParagraphMarkers(mixedList);
assert.equal(reindexed[1], '1. Ketentuan pertama:');
assert(isRincianBlock(reindexed[2]));
assert.equal(reindexed[3], '2. Ketentuan kedua:');
assert.equal(reindexed[4], '3. Ketentuan ketiga.');
assert.equal(getNextMarkerForSection(reindexed, 5, 'num'), '4. ');

// 6. CSS & Word export guard checks
assert(SURAT_DINAS_BASE_CSS.includes('.pkpknl-rincian-table'));
assert(SURAT_DINAS_BASE_CSS.includes('.rincian-indent-1'));
const exportSrc = fs.readFileSync(
  path.join(frontendRoot, 'src/app/surat/_lib/export-surat-dinas.ts'),
  'utf-8'
);
assert(exportSrc.includes('.pkpknl-rincian-wrap'), 'Word export transform must handle .pkpknl-rincian-wrap');
assert(exportSrc.includes('escapeWordHtml'), 'Word export transform must escape HTML safely');

const pageSrc = fs.readFileSync(
  path.join(frontendRoot, 'src/app/surat/keluar/dinas/page.tsx'),
  'utf-8'
);
assert(pageSrc.includes('handleMoveParagraph'), 'Editor must support reordering paragraph items');
assert(pageSrc.includes('migrateLegacyUndanganPayload'), 'Loader must migrate legacy undangan payload');
assert(!/value=\{data\.acaraHariTanggal/.test(pageSrc), 'Card 2 must not render duplicate legacy acaraHariTanggal input');

console.log('✅ rincian-blok-check.cjs: ALL ASSERTIONS PASSED');
