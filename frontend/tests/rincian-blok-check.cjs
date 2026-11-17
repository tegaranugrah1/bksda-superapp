'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const ts = frontendRequire('typescript');

function createFakeReact() {
  return {
    default: {
      memo: (c) => c,
      createElement: (tag, props, ...children) => ({ tag, props: props || {}, children }),
    },
    memo: (c) => c,
    createElement: (tag, props, ...children) => ({ tag, props: props || {}, children }),
  };
}

function loadLetterUtilsModule() {
  const source = fs.readFileSync(
    path.join(frontendRoot, 'src/lib/letter-utils.ts'),
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
  const fakeReact = createFakeReact();
  const fn = new Function('exports', 'module', 'require', transpiled.outputText);
  fn(mod.exports, mod, (id) => (id === 'react' ? fakeReact : {}));
  return mod.exports;
}

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
  const fakeReact = createFakeReact();
  const fn = new Function('exports', 'module', 'require', transpiled.outputText);
  fn(mod.exports, mod, (id) => {
    if (id === 'react') return fakeReact;
    return {};
  });
  return { exports: mod.exports, source };
}

const letterUtilsMod = loadLetterUtilsModule();
const { exports: docMod, source: docSource } = loadSuratDinasModule();
const {
  isRincianBlock,
  createDefaultRincianBlock,
  isTableBlock,
  createDefaultTableBlock,
  isTableSectionRow,
  getTableRowCellsAndSpans,
  updateTableDataCell,
  mergeTableCellRight,
  splitTableCell,
  addTableColumnToRow,
  removeTableColumnFromRow,
  getDefaultTableColWidths,
  getNormalizedTableColWidths,
  resizeAdjacentTableCols,
  rebalanceColWidthsOnAdd,
  rebalanceColWidthsOnRemove,
  normalizePdfCellText,
  parseDelimitedTableText,
  getPrevTextPointLevel,
  isNoColumnHeader,
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

// 7. Table Block (No / Nama / Keterangan, 3 default rows, Excel TSV & Markdown paste, CSS/Word invariants)
const defTable = createDefaultTableBlock();
assert(isTableBlock(defTable), 'createDefaultTableBlock must produce a valid ParagrafTableBlock');
assert.deepEqual(defTable.headers, ['No', 'Nama', 'Keterangan']);
assert.equal(defTable.rows.length, 3, 'Default table must have 3 rows downward');
assert.deepEqual(defTable.rows, [
  ['1', '', ''],
  ['2', '', ''],
  ['3', '', ''],
]);
assert.equal(detectPointLevel(defTable), 0);
assert.equal(isNoColumnHeader('No'), true);
assert.equal(isNoColumnHeader('No.'), true);
assert.equal(isNoColumnHeader('Nama'), false);

// Tab-separated Excel/Word paste (with header & without header)
const tsvWithHeader = 'No\tNama\tJabatan\n1\tAndi\tPolhut\n2\tBudi\tPEH';
const parsedTsv = parseDelimitedTableText(tsvWithHeader, true);
assert(parsedTsv && isTableBlock(parsedTsv));
assert.deepEqual(parsedTsv.headers, ['No', 'Nama', 'Jabatan']);
assert.equal(parsedTsv.rows.length, 2);

const tsvNoHeader = '1\tAndi\tPolhut\n2\tBudi\tPEH';
const parsedNoHdr = parseDelimitedTableText(tsvNoHeader, false);
assert(parsedNoHdr && isTableBlock(parsedNoHdr));
assert.deepEqual(parsedNoHdr.headers, ['Kolom 1', 'Kolom 2', 'Kolom 3']);
assert.equal(parsedNoHdr.rows.length, 2);

// Smart Paste (Tempel Teks Utuh) auto-detects embedded TSV table inside prose & numbered points
const mixedWithTable = [
  'Dengan hormat, kami sampaikan daftar pegawai berikut:',
  '',
  '1. Daftar Peserta:',
  'No\tNama\tKeterangan',
  '1\tAni\tHadir',
  '2\tBima\tIzin',
  '3\tCitra\tHadir',
  '',
  'Demikian untuk menjadi perhatian.',
].join('\n');
const parsedDocWithTable = parseRawDocumentText(mixedWithTable);
assert.equal(parsedDocWithTable.length, 4, `Expected [pembuka, poin1, table, penutup], got ${parsedDocWithTable.length}`);
assert(isTableBlock(parsedDocWithTable[2]), 'TSV block inside prose must parse into ParagrafTableBlock');
assert.equal(parsedDocWithTable[2].rows.length, 3);
assert.equal(getPrevTextPointLevel(parsedDocWithTable, 2), 1, 'Table below poin 1 must inherit parent level 1');

// Numbering continues across embedded table block
const mixedTableNumbering = ['Pembuka.', '1. Poin satu:', defTable, '1. Poin dua.', 'Penutup.'];
const reindexedTable = reindexParagraphMarkers(mixedTableNumbering);
assert.equal(reindexedTable[1], '1. Poin satu:');
assert(isTableBlock(reindexedTable[2]));
assert.equal(reindexedTable[3], '2. Poin dua.');

// CSS & Word export invariants for dynamic table (must preserve content thead!)
assert(SURAT_DINAS_BASE_CSS.includes('.pkpknl-body-table'), 'CSS must define .pkpknl-body-table');
assert(SURAT_DINAS_BASE_CSS.includes('.pkpknl-table-col-no'), 'CSS must define compact No column class');
assert(SURAT_DINAS_BASE_CSS.includes('display: table-header-group !important'), 'CSS must repeat table thead across pages');
assert(exportSrc.includes('.pkpknl-table-wrap'), 'Word export transform must handle .pkpknl-table-wrap');
assert(
  exportSrc.includes('thead.print\\\\:table-header-group'),
  'sanitizeExportClone must scope thead removal to outer print wrapper so content table thead is preserved'
);
assert(pageSrc.includes('handleAddTableCol'), 'Editor must support adding table columns');
assert(pageSrc.includes('handleApplyTablePaste'), 'Editor must support pasting Excel/Word table data');
assert(pageSrc.includes('handleAddTableSectionRow'), 'Editor must support adding section divider rows');
assert(pageSrc.includes('handleMergeTableCellRight'), 'Editor must support merging table cells');

// 8. Table Section Divider Row & Horizontal Merge / Split Cell (Rundown Acara style)
const rundownBlock = createDefaultTableBlock(
  ['No', 'Waktu Pelaksanaan', 'Acara', 'Keterangan'],
  [
    { kind: 'section', text: 'Senin, 23 November 2026' },
    ['1', '07.30 - 12.00', 'Perjalanan peserta', 'Peserta dan Narahubung'],
    ['2', '15.00 - 16.00', 'Break', ''],
  ]
);
assert.equal(isTableSectionRow(rundownBlock.rows[0]), true);
assert.equal(isTableSectionRow(rundownBlock.rows[1]), false);

// Merge col 2 ('Break') right into col 3 ('Keterangan') -> span = [1, 1, 2, 0]
const mergedRundown = mergeTableCellRight(rundownBlock, 2, 2);
const row2Info = getTableRowCellsAndSpans(mergedRundown.rows[2], 4);
assert.deepEqual(row2Info.spans, [1, 1, 2, 0]);
assert.equal(row2Info.cells[2], 'Break');

// Update cell text cleanly preserves merge spans
const updatedMergedCell = updateTableDataCell(mergedRundown.rows[2], 4, 2, 'Ishoma');
assert.deepEqual(getTableRowCellsAndSpans(updatedMergedCell, 4).spans, [1, 1, 2, 0]);
assert.equal(getTableRowCellsAndSpans(updatedMergedCell, 4).cells[2], 'Ishoma');

// Add 5th column on table containing section + merged row
const expandedColRows = mergedRundown.rows.map((r) => addTableColumnToRow(r, 4));
assert.equal(isTableSectionRow(expandedColRows[0]), true, 'Section row stays intact when column added');
assert.deepEqual(getTableRowCellsAndSpans(expandedColRows[2], 5).spans, [1, 1, 2, 0, 1]);

// Remove column inside absorbed col (col 3) cleanly shrinks owner span back to 1 and collapses to array
const shrunkRows = mergedRundown.rows.map((r) => removeTableColumnFromRow(r, 3, 4));
assert.deepEqual(shrunkRows[2], ['2', '15.00 - 16.00', 'Break']);

// Split cell back to 1,1,1,1 collapses cleanly to string[]
const unmergedRundown = splitTableCell(mergedRundown, 2, 2);
assert.equal(Array.isArray(unmergedRundown.rows[2]), true);
assert.deepEqual(getTableRowCellsAndSpans(unmergedRundown.rows[2], 4).spans, [1, 1, 1, 1]);

assert(SURAT_DINAS_BASE_CSS.includes('.pkpknl-table-section-cell'), 'CSS must style section divider rows');
assert(SURAT_DINAS_BASE_CSS.includes('.pkpknl-table-col-num'), 'CSS must style optional column number strip');
assert(SURAT_DINAS_BASE_CSS.includes('.pkpknl-col-resizer'), 'CSS must style drag-to-resize column dividers');
assert(exportSrc.includes('pkpknl-table-col-numbers'), 'Word export must preserve optional 1|2|3|4 column number header row');
assert(exportSrc.includes('pkpknl-table-section-cell'), 'Word export must support section divider rows');
assert(exportSrc.includes('colspan="'), 'Word export must preserve colSpan on merged/section cells');
assert(exportSrc.includes('<colgroup>'), 'Word export must emit colgroup widths matching preview');
assert(pageSrc.includes('handleToggleTableColumnNumbers'), 'Editor must support toggling optional column numbers');
assert(pageSrc.includes('TabelBlockEditor'), 'Editor must use shared DRY TabelBlockEditor component');

// 9. Table Column Widths, Drag Resize Math & Rebalancing
const autoWidths3 = getDefaultTableColWidths(['No', 'Nama', 'Keterangan']);
assert.equal(autoWidths3.length, 3);
const sum3 = Math.round(autoWidths3.reduce((a, b) => a + b, 0) * 10) / 10;
assert.equal(sum3, 100, 'Default 3-col widths must sum to 100%');
assert(autoWidths3[0] < autoWidths3[1], 'No column default width must be narrower than Nama');

const autoWidths4 = getDefaultTableColWidths(['No', 'Waktu Pelaksanaan', 'Acara', 'Keterangan']);
const resized4 = resizeAdjacentTableCols(autoWidths4, 1, -12, ['No', 'Waktu Pelaksanaan', 'Acara', 'Keterangan']);
assert.equal(Math.round(resized4.reduce((a, b) => a + b, 0) * 10) / 10, 100, 'Resized widths must keep exact 100% sum');
assert(resized4[1] < autoWidths4[1], 'Dragging col 1 left must narrow col 1');
assert(resized4[2] > autoWidths4[2], 'Dragging col 1 left must widen col 2 by same delta');

// Clamping min column width so extreme negative drag never collapses column to 0
const extremeDrag = resizeAdjacentTableCols(autoWidths4, 1, -999, ['No', 'Waktu Pelaksanaan', 'Acara', 'Keterangan']);
assert(extremeDrag[1] >= 9, `Minimum data column width must clamp >= 9%, got ${extremeDrag[1]}`);

// Rebalance preserves custom proportions on add/remove column
const afterAdd = rebalanceColWidthsOnAdd(resized4, ['No', 'Waktu Pelaksanaan', 'Acara', 'Keterangan']);
assert(afterAdd && afterAdd.length === 5);
assert.equal(Math.round(afterAdd.reduce((a, b) => a + b, 0) * 10) / 10, 100);
const afterRemove = rebalanceColWidthsOnRemove(afterAdd, 4, ['No', 'Waktu', 'Acara', 'Ket', 'Col5']);
assert(afterRemove && afterRemove.length === 4);
assert.equal(Math.round(afterRemove.reduce((a, b) => a + b, 0) * 10) / 10, 100);

// Spreadsheet component craft checks
const editorCompSrc = fs.readFileSync(
  path.join(frontendRoot, 'src/app/surat/_components/TabelBlockEditor.tsx'),
  'utf-8'
);
assert(editorCompSrc.includes('resize-none'), 'Spreadsheet cells must suppress ugly browser textarea resize handles');
assert(editorCompSrc.includes('group-hover/cell:opacity-100'), 'Gabung button must stay hidden at rest and reveal on hover/focus');
assert(editorCompSrc.includes('handleNormalizedPaste'), 'Table cells must auto-normalize wrapped PDF paste text');
assert(!editorCompSrc.includes('Geser baris ${rIdx + 1} tabel butir ${blockIdx + 1} ke atas'), 'Row up arrow button should be omitted per user preference');

// 10. normalizePdfCellText (auto-flatten accidental hard line breaks copied from PDF)
const pdfWrapped = 'Perjalanan peserta dan\nNarasumber menuju\ntempat kegiatan\n(Yogyakarta)\n';
assert.equal(
  normalizePdfCellText(pdfWrapped),
  'Perjalanan peserta dan Narasumber menuju tempat kegiatan (Yogyakarta)',
  'Copied PDF hard wraps inside a cell must flatten into flowing single-spaced text'
);
const pdfWithList = 'Persiapan:\n1. Laptop dan\ncharger resmi\n2. Kamera\n\nCatatan tambahan\nlainnya.';
assert.equal(
  normalizePdfCellText(pdfWithList),
  'Persiapan:\n1. Laptop dan charger resmi\n2. Kamera\n\nCatatan tambahan lainnya.',
  'PDF normalization must keep list items and paragraph breaks intact'
);

// 11. Inline Bold & Italic Markdown Formatting + Tembusan 11pt Size Parity
const { renderFormattedText, toggleInlineFormat } = letterUtilsMod;
const nodes = renderFormattedText('**Penting**, *Break*, ***Resmi***, dan 2 * 3');
assert(Array.isArray(nodes), 'renderFormattedText must tokenize markdown spans');
assert(
  nodes.some((n) => n && typeof n === 'object' && n.tag === 'strong' && n.props?.style?.fontWeight === 'bold'),
  'Must convert **Penting** to <strong>'
);
assert(
  nodes.some((n) => n && typeof n === 'object' && n.tag === 'em' && n.props?.style?.fontStyle === 'italic'),
  'Must convert *Break* to <em>'
);
assert(
  nodes.some(
    (n) =>
      n &&
      typeof n === 'object' &&
      n.tag === 'strong' &&
      n.props?.style?.fontWeight === 'bold' &&
      n.props?.style?.fontStyle === 'italic'
  ),
  'Must convert ***Resmi*** to bold+italic <strong>'
);
assert(nodes.includes(', dan 2 * 3'), 'Must leave spaces around * (e.g. 2 * 3) as plain text');

let toggledVal = 'Perihal resmi daerah';
const makeMockField = (selStart, selEnd) => ({
  selectionStart: selStart,
  selectionEnd: selEnd,
  focus: () => {},
  setSelectionRange: () => {},
});
// Selecting with trailing space ("resmi ") keeps space outside **...**
toggleInlineFormat(makeMockField(8, 14), toggledVal, 'bold', (v) => {
  toggledVal = v;
});
assert.equal(toggledVal, 'Perihal **resmi** daerah', 'Bold wrap must keep trailing whitespace outside **');
// Applying italic on inner word ("resmi") inside **resmi** produces ***resmi***
toggleInlineFormat(makeMockField(10, 15), toggledVal, 'italic', (v) => {
  toggledVal = v;
});
assert.equal(toggledVal, 'Perihal ***resmi*** daerah', 'Italic wrap inside bold yields ***resmi***');
// Toggling bold off outer markers on "resmi" keeps *resmi*
toggleInlineFormat(makeMockField(11, 16), toggledVal, 'bold', (v) => {
  toggledVal = v;
});
assert.equal(toggledVal, 'Perihal *resmi* daerah', 'Unbolding ***resmi*** preserves *resmi*');

assert(
  SURAT_DINAS_BASE_CSS.includes('.pkpknl-tembusan { width: 100%; margin: 0.8rem 0 0; font-size: 11pt;'),
  'Preview/print CSS must set .pkpknl-tembusan font-size to 11pt matching letter body text'
);
assert(
  !exportSrc.includes('tembusan') || exportSrc.includes('font-size: 11pt; line-height: 1.4; text-align: left;">${tembusanHtml}'),
  'Word export Tembusan container must use 11pt font size matching body text'
);
assert(
  !exportSrc.includes('10pt; line-height: 1.4; color: #000;">${text}') &&
    !exportSrc.includes('10pt; line-height: 1.4; color: #000;">${num}'),
  'Word export Tembusan item paragraphs must not retain 10pt font size'
);
assert(
  pageSrc.includes('InlineFormatButtons') && pageSrc.includes('bindSectionFormat'),
  'dinas/page.tsx must provide InlineFormatButtons and keyboard formatting across Perihal -> Tembusan'
);
assert(
  editorCompSrc.includes('InlineFormatButtons') && editorCompSrc.includes('bindFormatField'),
  'TabelBlockEditor.tsx must expose bold/italic formatting controls inside spreadsheet toolbar'
);

console.log('✅ rincian-blok-check.cjs: ALL ASSERTIONS PASSED');
