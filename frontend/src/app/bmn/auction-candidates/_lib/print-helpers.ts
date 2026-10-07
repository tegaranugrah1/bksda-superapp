"use client";

import { toast } from "sonner";

export interface PrintDocumentWindowOptions {
  rootId: string;
  title: string;
  emptyMessage?: string;
  styles?: string;
  removeSelectors?: string[];
  beforePrint?: (clone: HTMLElement) => void;
  onWindowReady?: (printWindow: Window) => void;
  delayMs?: number;
}

export const BASE_AUCTION_PRINT_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: white; color: black;
    font-family: 'Bookman Old Style', Georgia, serif;
    font-size: 11pt; line-height: 1.4;
  }
  p { margin: 0; padding: 0; }
  article { margin: 0; }
  .sk-measurement, .sk-measurement * { display: none !important; visibility: hidden !important; }
  .sk-no-print, .no-print, .print-hidden { display: none !important; }
`;

export const SK_PAGINATED_PRINT_CSS = `
  @page { size: A4; margin: 0; }
  @page sk-main { size: A4; margin: 0; }
  @page sk-main:first { size: A4; margin: 0; }
  @page sk-attachment { size: A4 landscape; margin: 14mm 0 20mm 0; }
  .sk-measurement, .sk-measurement * { display: none !important; visibility: hidden !important; }
  .sk-no-print { display: none !important; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: white; color: black;
    font-family: 'Bookman Old Style', Georgia, serif;
    font-size: 11pt; line-height: 1.4;
  }
  p { margin: 0; padding: 0; }
  .sk-page {
    width: 210mm;
    margin: 0 auto; padding: 5mm 20mm 0;
  }
  .sk-main-document { page: sk-main; position: relative; }
  .sk-print-root .sk-page.sk-main-document.sk-main-paginated {
    height: 297mm !important;
    min-height: 297mm !important;
    padding: 5mm 20mm 28mm !important;
    overflow: hidden !important;
    position: relative !important;
    box-shadow: none !important;
  }
  .sk-print-root .sk-page.sk-main-document.sk-main-paginated.sk-main-continuation-page {
    padding-top: 18mm !important;
  }
  .sk-print-root .sk-main-document.sk-main-page-break {
    page-break-after: always;
    break-after: page;
  }
  .sk-main-flow { width: 100%; }
  .sk-main-paginated .sk-paginated-field-section + .sk-paginated-field-section { margin-top: 0 !important; }
  .sk-main-paginated .sk-paginated-field-section.sk-section-start { margin-top: 0.75rem !important; }
  .sk-attachment-document {
    page: sk-attachment;
    page-break-before: always;
    break-before: page;
    width: 297mm !important;
    max-width: 297mm !important;
    padding: 10mm 16mm 20mm !important;
  }
  .sk-attachment-page {
    width: 258mm;
    margin: 0 auto;
    page: sk-attachment;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sk-attachment-page-continuation {
    page-break-before: always;
    break-before: page;
    padding-top: 12mm !important;
  }
  .sk-continuation-spacer {
    height: 8mm !important;
    display: block;
  }
  .sk-attachment-document .sk-body {
    width: 258mm !important;
    margin-left: auto;
    margin-right: auto;
  }
  .sk-page-ttd { padding-bottom: 0; }
  article { margin: 0; }
  .sk-page-break { page-break-after: always; break-after: always; }
  /* KOP */
  .sk-kop {
    margin-top: -5mm; margin-left: -16mm; margin-right: -16mm;
    margin-bottom: 6px; text-align: center;
  }
  .sk-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  /* Judul SK — halaman 1 */
  .sk-title {
    width: 166mm; margin-left: auto; margin-right: auto;
    margin-top: 10px; text-align: center; font-weight: bold; line-height: 1.3;
  }
  .sk-title-nomor { font-weight: normal; }
  .sk-title-tentang { margin-top: 10px; }
  /* Sub-judul (DENGAN RAHMAT, KEPALA BALAI) */
  .sk-subtitle {
    width: 166mm; margin-left: auto; margin-right: auto;
    margin-top: 16px;
  }
  .sk-subtitle > p { text-align: center; font-weight: bold; }
  .sk-subtitle > p + p { margin-top: 6px; }
  /* Tabel Menimbang/Mengingat/Memutuskan */
  .sk-body { width: 166mm; margin-left: auto; margin-right: auto; }
  table { border-collapse: collapse; width: 100%; }
  td { vertical-align: top; padding: 0; }

  /* Menimbang/Mengingat: parent boleh paginate, item anak tetap utuh */
  .sk-field-section {
    display: grid;
    grid-template-columns: 28mm 8mm minmax(0, 1fr);
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
  .sk-field-section + .sk-field-section { margin-top: 0.75rem; }
  .sk-field-label, .sk-field-colon { padding: 0; }
  .sk-field-colon { text-align: center; }
  .sk-builder-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); }
  .sk-builder-item + .sk-builder-item { margin-top: 0.5rem; }
  .sk-builder-item-letter { padding-right: 2mm; }
  .sk-builder-item-text { text-align: justify; text-justify: inter-word; line-height: 1.4; }
  .sk-mengingat-list {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
  .sk-mengingat-item {
    display: grid;
    grid-template-columns: 9mm minmax(0, 1fr);
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    padding-top: 0.35rem;
  }
  .sk-mengingat-item:first-child { padding-top: 0; }
  .sk-mengingat-text { text-align: justify; }
  /* Halaman 2 */
  .sk-page2-body { width: 166mm; margin-left: auto; margin-right: auto; padding-top: 16mm; }
  .sk-memutuskan { text-align: center; font-weight: bold; margin-bottom: 12px; }
  .sk-memutuskan-title { text-align: center; font-weight: bold; margin-top: 14px; margin-bottom: 8px; }
  .sk-dictum { display: grid; grid-template-columns: 28mm 8mm minmax(0, 1fr); }
  .sk-dictum + .sk-dictum { margin-top: 0.5rem; }
  .sk-dictum-label { font-weight: bold; }
  .sk-dictum-colon { text-align: center; font-weight: bold; }
  .sk-dictum-content { text-align: justify; text-justify: inter-word; line-height: 1.4; }

  /* TTD block */
  .sk-ttd { width: 20rem; margin-left: auto; margin-top: 3rem; }
  .sk-ttd, .sk-ttd p { font-weight: normal !important; text-align: left !important; }
  .sk-ttd p { margin: 0; padding: 0; line-height: 1.3; }
  .sk-ttd-meta { display: grid !important; grid-template-columns: max-content auto 1fr; column-gap: 0.4rem; line-height: 1.3; }
  .sk-ttd-meta span { font-weight: normal !important; text-align: left !important; }
  .sk-ketiga-group { break-inside: avoid !important; page-break-inside: avoid !important; }
  .sk-signature-name { font-weight: normal !important; }
  .ttd-placeholder { height: 84px; color: #94a3b8; font-weight: normal !important; text-align: left !important; display: flex !important; align-items: center !important; padding-top: 0px !important; padding-left: 1.1cm !important; margin-top: 0.5rem; margin-bottom: 0.5rem; }
  .sk-continuation-word { position: absolute; right: 23mm; bottom: 31mm; width: 163mm; height: 0; line-height: 11pt; overflow: visible; white-space: nowrap; text-align: right !important; margin: 0; padding: 0; font-weight: normal !important; font-size: 11pt; z-index: 20; }
  /* Tembusan */
  .sk-tembusan { margin-top: 2rem; width: 166mm; margin-left: auto; margin-right: auto; font-size: 10pt; line-height: 1.3; }
  .sk-tembusan, .sk-tembusan p { font-weight: normal !important; text-align: left !important; }
  .sk-tembusan p { margin: 0; }
  .sk-tembusan ol { margin: 0.25rem 0 0; padding-left: 1.2rem; }
  /* Editable */
  .sk-edit { outline: none; border-bottom: none !important; }
  /* Halaman 3 lampiran */
  .sk-attachment-meta { width: 128mm; margin-left: auto; text-align: left; font-size: 10.5pt; line-height: 1.35; }
  .sk-attachment-meta .meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); }
  .sk-attachment-meta .meta-row .colon { text-align: center; }
  .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
  .meta-label { white-space: nowrap; }
  .meta-colon { text-align: center; }
  .sk-lampiran-title { text-align: center; font-weight: bold; line-height: 1.3; margin-top: 1.5rem; margin-bottom: 0.75rem; font-size: 12pt; }
  .sk-lampiran-title p { margin: 0; }
  table.sk-attachment-table, .sk-asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; margin-top: 0.75rem; table-layout: fixed; }
  table.sk-attachment-table th, table.sk-attachment-table td, .sk-asset-table th, .sk-asset-table td { border: 1px solid #000; padding: 4px 3px; vertical-align: middle; overflow-wrap: anywhere; word-break: normal; }
  table.sk-attachment-table thead, .sk-asset-table thead { display: table-header-group; }
  table.sk-attachment-table tr, .sk-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
  .sk-attachment-column-number-row th, .sk-column-number-row th { font-weight: normal; }
  .sk-attachment-ttd, .sk-lampiran-ttd { width: 20rem; margin: 1rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
  .sk-attachment-ttd p, .sk-lampiran-ttd p { margin: 0; padding: 0; line-height: 1.15; }
  .sk-attachment-ttd .sk-ttd-placeholder, .sk-lampiran-ttd .ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
  .sk-attachment-ttd .sk-ttd-name { font-weight: normal; }
  .sk-asset-table td.text-left { text-align: left; }
  .sk-asset-table td.text-right { text-align: right; }
`;

export const SK_PANITIA_PRINT_CSS = `
  @page { size: A4; margin: 0; }
  @page skp-main { size: A4; margin: 0; }
  @page skp-main:first { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: white; color: black;
    font-family: 'Bookman Old Style', Georgia, serif;
    font-size: 11pt; line-height: 1.25;
  }
  p { margin: 0; padding: 0; }
  .skp-page {
    width: 210mm;
    margin: 0 auto; padding: 5mm 20mm 0;
  }
  .skp-main-document { page: skp-main; position: relative; }
  .skp-print-root .skp-page.skp-main-document.skp-main-paginated {
    height: 297mm !important;
    min-height: 297mm !important;
    padding: 5mm 20mm 28mm !important;
    overflow: hidden !important;
    position: relative !important;
    box-shadow: none !important;
  }
  .skp-print-root .skp-page.skp-main-document.skp-main-paginated.skp-main-continuation-page {
    padding-top: 18mm !important;
  }
  .skp-print-root .skp-main-document.skp-main-page-break {
    page-break-after: always;
    break-after: page;
  }
  .skp-main-flow { width: 100%; }
  .skp-main-paginated .skp-paginated-field-section + .skp-paginated-field-section { margin-top: 0 !important; }
  .skp-main-paginated .skp-paginated-field-section.skp-section-start { margin-top: 0.5rem !important; }
  .skp-page-ttd { padding-bottom: 0; }
  article { margin: 0; }
  .skp-page-break { page-break-after: always; break-after: always; }
  /* KOP */
  .skp-kop {
    margin-top: -5mm; margin-left: -16mm; margin-right: -16mm;
    margin-bottom: 6px; text-align: center;
  }
  .skp-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  /* Judul SK */
  .skp-title {
    width: 166mm; margin-left: auto; margin-right: auto;
    margin-top: 10px; text-align: center; font-weight: bold; line-height: 1.3;
  }
  .skp-title-nomor { font-weight: normal; }
  .skp-title-tentang { margin-top: 10px; }
  /* Sub-judul */
  .skp-subtitle {
    width: 166mm; margin-left: auto; margin-right: auto;
    margin-top: 16px;
  }
  .skp-subtitle > p { text-align: center; font-weight: bold; }
  .skp-subtitle > p + p { margin-top: 6px; }
  /* Body */
  .skp-body { width: 166mm; margin-left: auto; margin-right: auto; }
  table { border-collapse: collapse; width: 100%; }
  td { vertical-align: top; padding: 0; }
  /* Menimbang/Mengingat */
  .skp-field-section {
    display: grid;
    grid-template-columns: 28mm 8mm minmax(0, 1fr);
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
  .skp-field-section + .skp-field-section { margin-top: 0.5rem; }
  .skp-field-label, .skp-field-colon { padding: 0; }
  .skp-field-colon { text-align: center; }
  .skp-builder-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); }
  .skp-builder-item + .skp-builder-item { margin-top: 0.5rem; }
  .skp-builder-item-letter { padding-right: 2mm; }
  .skp-builder-item-text { text-align: justify; text-justify: inter-word; line-height: 1.25; }
  /* Memutuskan */
  .skp-memutuskan { text-align: center; font-weight: bold; margin-bottom: 8px; }
  .skp-memutuskan-title { text-align: center; font-weight: bold; margin-top: 12px; margin-bottom: 6px; }
  .skp-dictum { display: grid; grid-template-columns: 28mm 8mm minmax(0, 1fr); }
  .skp-dictum + .skp-dictum { margin-top: 0.5rem; }
  .skp-dictum-label { font-weight: bold; }
  .skp-dictum-colon { text-align: center; font-weight: bold; }
  .skp-dictum-content { text-align: justify; text-justify: inter-word; line-height: 1.25; }
  .skp-kedua-text { display: grid; row-gap: 0; white-space: normal; }
  .skp-kedua-line { text-align: justify; }
  .skp-kedua-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); column-gap: 0; text-align: left; margin-top: 0.25rem; }
  .skp-kedua-subitem { margin-left: 8mm; }
  .skp-kedua-marker { text-align: left; }
  .skp-kedua-item-text { text-align: justify; text-justify: inter-word; }
  /* TTD */
  .skp-ttd { width: 20rem; margin-left: auto; margin-top: 1.25rem; }
  .skp-ttd, .skp-ttd p { font-weight: normal !important; text-align: left !important; }
  .skp-ttd p { margin: 0; padding: 0; line-height: 1.25; }
  .skp-ttd-meta { display: grid !important; grid-template-columns: max-content auto 1fr; column-gap: 0.4rem; line-height: 1.3; }
  .skp-ttd-meta span { font-weight: normal !important; text-align: left !important; }
  .skp-ketiga-group { break-inside: avoid !important; page-break-inside: avoid !important; }
  .skp-signature-name { font-weight: normal !important; }
  .skp-ttd-placeholder { height: 84px; color: #94a3b8; font-weight: normal !important; text-align: left !important; display: flex !important; align-items: center !important; padding-top: 0px !important; padding-left: 1.1cm !important; margin-top: 0.5rem; margin-bottom: 0.5rem; }
  .skp-continuation-word { position: absolute; right: 23mm; bottom: 31mm; width: 163mm; height: 0; line-height: 11pt; overflow: visible; white-space: nowrap; text-align: right !important; margin: 0; padding: 0; font-weight: normal !important; font-size: 11pt; z-index: 20; }
  /* Tembusan */
  .skp-tembusan { width: 166mm; margin: 1rem auto 0; font-size: 10pt; line-height: 1.25; }
  .skp-tembusan, .skp-tembusan p { font-weight: normal !important; text-align: left !important; }
  .skp-tembusan p { margin: 0; line-height: 1.3; }
  .skp-tembusan ol { margin: 0.25rem 0 0; padding-left: 1.2rem; }
  /* Editable */
  .skp-edit { outline: none; border-bottom: none !important; }
  /* Lampiran */
  .skp-lampiran {
    width: 210mm;
    margin: 0 auto;
    padding: 12mm 20mm 28mm;
    page-break-before: always;
    break-before: page;
  }
  .skp-lampiran-meta, .skp-attachment-meta { width: 109mm; margin-left: auto; text-align: left; font-size: 9.5pt; line-height: 1.25; }
  .skp-lampiran-meta .meta-row, .skp-attachment-meta .meta-row { display: grid; grid-template-columns: 18mm 4mm minmax(0, 1fr); }
  .skp-lampiran-meta .meta-row .colon, .skp-attachment-meta .meta-row .colon { text-align: center; }
  .skp-lampiran-title { text-align: center; font-weight: bold; font-size: 11pt; margin-top: 0.75rem; line-height: 1.3; }
  .skp-lampiran-title p { margin: 0; }
  table.skp-panitia-table, .skp-panitia-table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin-top: 0.75rem; }
  table.skp-panitia-table th, table.skp-panitia-table td, .skp-panitia-table th, .skp-panitia-table td { border: 1px solid #000; padding: 4px 6px; }
  table.skp-panitia-table th, .skp-panitia-table th { text-align: center; font-weight: bold; }
  table.skp-panitia-table td, .skp-panitia-table td { vertical-align: top; }
  .skp-panitia-ttd { width: 80mm; margin: 1.5rem 0 0 auto; text-align: left; }
  .skp-panitia-ttd p { margin: 0; line-height: 1.3; }
  .skp-panitia-ttd .skp-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
  .skp-panitia-ttd .skp-ttd-name { font-weight: normal; }
`;

export const SK_TIM_PENILAI_PRINT_CSS = SK_PANITIA_PRINT_CSS
  .replaceAll("skp-panitia-table", "sktp-tabel")
  .replaceAll("skp-ketiga-group", "sktp-keempat-group")
  .replaceAll("skp-", "sktp-")
  .replaceAll("skp", "sktp");

export const BA_KOREKSI_PRINT_CSS = `
  @page { size: A4; margin: 0 0 28mm 0; }
  body {
    margin: 0;
    padding: 0;
    background: white;
    color: black;
    font-family: 'Bookman Old Style', Georgia, serif;
    font-size: 11pt;
    line-height: 1.25;
  }
  p { margin: 0; padding: 0; }
  article { margin: 0; }
  .ba-page {
    width: 210mm;
    box-sizing: border-box;
    margin: 0 auto;
    padding: 5mm 20mm 0;
    page-break-after: always;
  }
  .ba-page:last-child { page-break-after: auto; }
  .ba-lampiran {
    width: 210mm;
    box-sizing: border-box;
    margin: 0 auto;
    padding: 5mm 20mm 0;
    min-height: 269mm;
    page-break-before: always;
    page-break-after: always;
    break-before: page;
    break-after: page;
  }
  .ba-lampiran:last-child { page-break-after: auto; break-after: auto; }
  .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
  .doc-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  .doc-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
  .doc-body p { text-align: justify; text-justify: inter-word; }
  .doc-title { margin-top: 0.75rem; text-align: center; font-weight: 700; line-height: 1.3; }
  .doc-title p { margin: 0; }
  .doc-text-block { margin-top: 1rem; }
  .doc-text-block > * + * { margin-top: 0.85rem; }
  .pemeriksa-list { margin-top: 0.5rem; }
  .pemeriksa-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); column-gap: 0; }
  .pemeriksa-item + .pemeriksa-item { margin-top: 0.5rem; }
  .pemeriksa-row { display: grid; grid-template-columns: 28mm 5mm minmax(0, 1fr); column-gap: 0; }
  .pemeriksa-row .colon { text-align: center; }
  .doc-editable { outline: none; border-bottom: none !important; }
  .ba-lampiran-meta { width: 100%; font-size: 10.5pt; line-height: 1.35; margin-bottom: 0.75rem; }
  .ba-lampiran-meta .meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); }
  .ba-lampiran-meta .meta-row .colon { text-align: center; }
  .ba-lampiran-title { text-align: center; font-weight: 700; font-size: 11pt; line-height: 1.35; margin-bottom: 0.75rem; }
  table.ba-koreksi-table { border-collapse: collapse; width: 100%; font-size: 8.5pt; text-align: center; margin-top: 0.35rem; table-layout: fixed; }
  table.ba-koreksi-table th, table.ba-koreksi-table td { border: 1px solid #000; padding: 4px 3px; vertical-align: middle; overflow-wrap: anywhere; }
  table.ba-koreksi-table thead { display: table-header-group; }
  table.ba-koreksi-table tr { break-inside: avoid; page-break-inside: avoid; }
  .ba-column-number-row th { font-weight: normal; }
  .ba-ttd-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16mm; margin-top: 9mm; break-inside: avoid; page-break-inside: avoid; }
  .ba-ttd-grid p { margin: 0; padding: 0; line-height: 1.3; }
  .ba-pemeriksa-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 9mm; column-gap: 12mm; margin-top: 24mm; }
  .ba-pemeriksa-cell p { margin: 0; line-height: 1.25; }
  .ba-pemeriksa-cell .name { font-weight: bold; }
  .ba-ttd-kepala { text-align: left; }
  .ba-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
`;

export const BA_PEMERIKSAAN_PRINT_CSS = `
  @page ba-pem-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
  @page ba-pem-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: white; color: black;
    font-family: 'Bookman Old Style', Georgia, serif;
    font-size: 11pt; line-height: 1.5;
  }
  p { margin: 0; padding: 0; }
  article { margin: 0; }
  .doc-page { width: 210mm; box-sizing: border-box; margin: 0 auto; padding: 5mm 20mm 0; page: ba-pem-portrait; }
  .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
  .doc-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  .doc-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
  .doc-body p { text-align: justify; text-justify: inter-word; }
  .doc-title { margin-top: 0.75rem; text-align: center; font-weight: 700; line-height: 1.3; }
  .doc-title p { margin: 0; }
  .doc-text-block { margin-top: 1rem; }
  .doc-text-block > * + * { margin-top: 0.85rem; }
  .pemeriksa-list { margin-top: 0.5rem; }
  .pemeriksa-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); column-gap: 0; }
  .pemeriksa-item + .pemeriksa-item { margin-top: 0.5rem; }
  .pemeriksa-row { display: grid; grid-template-columns: 28mm 5mm minmax(0, 1fr); column-gap: 0; }
  .pemeriksa-row .colon { text-align: center; }
  .doc-editable { outline: none; border-bottom: none !important; }

  .ba-pem-page-landscape { width: 297mm; margin: 0 auto; padding: 10mm 16mm 20mm; page: ba-pem-landscape; page-break-before: always; break-before: page; }
  .ba-pem-lamp-root { width: 258mm; margin: 0 auto; font-family: 'Bookman Old Style', Georgia, serif; }
  .ba-pem-lamp-meta { width: 100%; font-size: 10.5pt; line-height: 1.35; }
  .ba-pem-lamp-meta .meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); }
  .ba-pem-lamp-meta .meta-row .colon { text-align: center; }
  .ba-pem-lamp-meta .lampiran-title { white-space: nowrap; }
  table.ba-pem-table { border-collapse: collapse; width: 100%; font-size: 8.5pt; text-align: center; margin-top: 0.75rem; table-layout: fixed; }
  table.ba-pem-table th, table.ba-pem-table td { border: 1px solid #000; padding: 4px 3px; vertical-align: middle; overflow-wrap: anywhere; word-break: normal; }
  table.ba-pem-table td.doc-editable { border: 1px solid #000 !important; }
  table.ba-pem-table tbody tr:last-child td { border-bottom: 1px solid #000 !important; }
  table.ba-pem-table thead { display: table-header-group; }
  table.ba-pem-table tr { break-inside: avoid; page-break-inside: avoid; }
  .ba-pem-column-number-row th { font-weight: normal; }
  .ba-pem-ttd-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16mm; margin-top: 9mm; break-inside: avoid; page-break-inside: avoid; }
  .ba-pem-ttd-grid p { margin: 0; padding: 0; line-height: 1.3; }
  .ba-pem-pemeriksa-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 9mm; column-gap: 12mm; margin-top: 24mm; }
  .ba-pem-pemeriksa-cell p { margin: 0; line-height: 1.25; }
  .ba-pem-pemeriksa-cell .name { font-weight: bold; }
  .ba-pem-ttd-kepala { text-align: left; }
  .ba-pem-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
`;

export const NOTA_DINAS_PRINT_CSS = `
  @page nd-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
  @page nd-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: white; color: black; font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.4; }
  p { margin: 0; padding: 0; }

  .nd-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; page: nd-portrait; }
  .nd-page-landscape { width: 297mm; margin: 0 auto; padding: 10mm 16mm 20mm; page: nd-landscape; page-break-before: always; break-before: page; }
  .nd-kop { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; margin-bottom: 6px; text-align: center; }
  .nd-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  .nd-title { width: 166mm; margin: 12px auto 0; text-align: center; font-weight: bold; line-height: 1.3; font-size: 14pt; }
  .nd-title-nomor { font-weight: normal; font-size: 11pt; margin-top: 4px; }
  .nd-meta { width: 166mm; margin: 16px auto 0; }
  .nd-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; line-height: 1.5; }
  .nd-meta-colon { text-align: center; }
  .nd-meta-row + .nd-meta-row { margin-top: 0; }
  .nd-body { width: 166mm; margin: 14px auto 0; text-align: justify; text-justify: inter-word; }
  .nd-body p { margin-bottom: 0.7rem; text-indent: 2.5em; }
  .nd-edit { outline: none; border-bottom: none !important; }
  .nd-ttd { width: 80mm; margin: 1.5rem 0 0 auto; text-align: left; }
  .nd-ttd p { margin: 0; line-height: 1.3; }
  .nd-ttd .nd-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
  .nd-ttd .nd-ttd-name { font-weight: normal; margin-top: 0.4rem !important; }
  .nd-tembusan { width: 166mm; margin: 1.2rem auto 0; }
  .nd-tembusan-title { font-weight: normal; }
  .nd-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); }

  /* Lampiran landscape */
  .nd-lamp-root { width: 258mm; margin: 0 auto; font-family: 'Bookman Old Style', Georgia, serif; }
  .nd-lamp-page { page: nd-landscape; break-inside: avoid; page-break-inside: avoid; }
  .nd-lamp-page-continuation { page-break-before: always; break-before: page; padding-top: 8mm; }
  .nd-lamp-page-with-signature { break-inside: avoid; page-break-inside: avoid; }
  .nd-lamp-meta { width: 128mm; margin-left: auto; text-align: left; font-size: 10pt; }
  .nd-lamp-meta p { margin: 0 0 0.45rem 0; }
  .nd-lamp-meta .nd-lamp-meta-lampiran { margin-bottom: 0.45rem; }
  .nd-lamp-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; }
  .nd-lamp-colon { text-align: center; }
  .nd-lamp-edit { outline: none; }
  .nd-lamp-title { text-align: center; font-weight: bold; font-size: 12pt; margin-top: 1rem; line-height: 1.3; }
  .nd-lamp-title p { margin: 0; }
  .nd-lamp-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; margin-top: 0.75rem; table-layout: fixed; }
  .nd-lamp-table th, .nd-lamp-table td { border: 1px solid #000; padding: 6px 4px; vertical-align: middle; overflow-wrap: anywhere; }
  .nd-lamp-table thead { display: table-header-group; }
  .nd-lamp-table tr { break-inside: avoid; page-break-inside: avoid; }
  .nd-lamp-column-number-row th { font-weight: normal; }
  .nd-lamp-jumlah-row td { background: #f3f4f6; }
  .nd-lamp-ttd { width: 20rem; margin: 1rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
  .nd-lamp-ttd p { margin: 0; padding: 0; line-height: 1.15; }
  .nd-lamp-ttd .nd-lamp-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
  .nd-lamp-ttd .nd-lamp-ttd-name { font-weight: normal; }
`;

export const PERMOHONAN_KPKNL_PRINT_CSS = `
  @page pkpknl-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
  @page pkpknl-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: white; color: black; font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.4; }
  p { margin: 0; padding: 0; }

  .pkpknl-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; page: pkpknl-portrait; }
  .pkpknl-page-landscape { width: 297mm; margin: 0 auto; padding: 10mm 16mm 20mm; page: pkpknl-landscape; page-break-before: always; break-before: page; }
  .pkpknl-kop { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; margin-bottom: 6px; text-align: center; }
  .pkpknl-meta-grid { width: 166mm; margin: 14px auto 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6mm; }
  .pkpknl-meta-left { line-height: 1.5; min-width: 0; }
  .pkpknl-meta-row { display: grid; grid-template-columns: 21mm 4mm minmax(0, 1fr); align-items: start; }
  .pkpknl-meta-nomor { white-space: pre !important; display: inline-block; }
  .pkpknl-meta-colon { text-align: center; }
  .pkpknl-meta-tanggal { text-align: right; line-height: 1.5; white-space: nowrap; flex-shrink: 0; }
  .pkpknl-yth { width: 166mm; margin: 18px auto 0; }
  .pkpknl-yth p { margin: 0; line-height: 1.4; }
  .pkpknl-edit { outline: none; border-bottom: none !important; }
  .pkpknl-body { width: 166mm; margin: 14px auto 0; text-align: justify; text-justify: inter-word; }
  .pkpknl-body p { margin-bottom: 0.7rem; text-indent: 2.5em; }
  .pkpknl-ttd { width: 20rem; margin: 1.5rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-ttd p { margin: 0; padding: 0; line-height: 1.15; }
  .pkpknl-ttd .pkpknl-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
  .pkpknl-ttd .pkpknl-ttd-name { font-weight: normal; }
  .pkpknl-tembusan { width: 166mm; margin: 1.2rem auto 0; }
  .pkpknl-tembusan-title { font-weight: normal; }
  .pkpknl-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); }

  /* Lampiran landscape */
  .pkpknl-lamp-root { width: 258mm; margin: 0 auto; font-family: 'Bookman Old Style', Georgia, serif; }
  .pkpknl-lamp-page { page: pkpknl-landscape; break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-lamp-page-continuation { page-break-before: always; break-before: page; padding-top: 8mm; }
  .pkpknl-lamp-page-with-signature { break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-lamp-meta { width: 128mm; margin-left: auto; text-align: left; font-size: 10pt; }
  .pkpknl-lamp-meta p { margin: 0 0 0.45rem 0; }
  .pkpknl-lamp-meta .pkpknl-lamp-meta-lampiran { margin-bottom: 0.45rem; }
  .pkpknl-lamp-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; }
  .pkpknl-lamp-colon { text-align: center; }
  .pkpknl-lamp-edit { outline: none; }
  .pkpknl-lamp-title { text-align: center; font-weight: bold; font-size: 12pt; margin-top: 1rem; line-height: 1.3; }
  .pkpknl-lamp-title p { margin: 0; }
  .pkpknl-lamp-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; margin-top: 0.75rem; table-layout: fixed; }
  .pkpknl-lamp-table th, .pkpknl-lamp-table td { border: 1px solid #000; padding: 6px 4px; vertical-align: middle; overflow-wrap: anywhere; }
  .pkpknl-lamp-table thead { display: table-header-group; }
  .pkpknl-lamp-table tr { break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-lamp-column-number-row th { font-weight: normal; }
  .pkpknl-lamp-jumlah-row td { background: #f3f4f6; }
  .pkpknl-lamp-ttd { width: 20rem; margin: 1rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-lamp-ttd p { margin: 0; padding: 0; line-height: 1.15; }
  .pkpknl-lamp-ttd .pkpknl-ttd-placeholder { box-sizing: border-box; height: 84px; display: flex; align-items: center; text-align: left; padding-top: 0px; padding-left: 1.1cm; margin-top: 0.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 9pt; }
  .pkpknl-lamp-ttd .pkpknl-ttd-name { font-weight: normal; }
`;

export const SK_KEBENARAN_PRINT_CSS = `
  @page { size: A4; margin: 20mm 0 28mm 0; }
  @page :first { margin-top: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: white; color: black;
    font-family: 'Bookman Old Style', Georgia, serif;
    font-size: 11pt; line-height: 1.4;
  }
  p { margin: 0; padding: 0; }
  article { margin: 0; }
  .doc-page { width: 210mm; box-sizing: border-box; margin: 0 auto; padding: 5mm 20mm 0; }
  .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
  .doc-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  .doc-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
  .doc-body p { text-align: justify; text-justify: inter-word; }
  .doc-title { margin-top: 0.75rem; text-align: center; font-weight: 700; line-height: 1.3; }
  .doc-title p { margin: 0; }
  .doc-text-block { margin-top: 1rem; }
  .doc-text-block > * + * { margin-top: 0.85rem; }
  .doc-identity { display: grid; grid-template-columns: 28mm 5mm minmax(0, 1fr); row-gap: 0.2rem; }
  .doc-identity .colon { text-align: center; }
  table.kebenaran-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; }
  table.kebenaran-table th, table.kebenaran-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
  table.kebenaran-table thead th { font-weight: bold; }
  .signature { width: 20rem; margin-left: auto; margin-top: 1.5rem; break-inside: avoid; page-break-inside: avoid; }
  .signature p { margin: 0; padding: 0; line-height: 1.3; }
  .ttd-placeholder { box-sizing: border-box; height: 84px; color: #94a3b8; font-weight: normal !important; text-align: left !important; display: flex !important; align-items: center !important; padding-top: 0px !important; padding-left: 1.1cm !important; margin-top: 0.5rem; margin-bottom: 0.5rem; }
  .doc-editable { outline: none; border-bottom: none !important; }
`;

export const KERTAS_KERJA_PRINT_CSS = `
  @page { size: A4 portrait; margin: 7mm 8mm 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 7.8pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #c8c8c8; padding: 1px 2px; vertical-align: top; }
  .kk-page { width: 194mm; margin: 0 auto; border: 1px solid #111; }
  .kk-header { display: grid; grid-template-columns: 32mm 1fr; border-bottom: 1px solid #111; min-height: 19mm; }
  .kk-logo { display: flex; align-items: center; justify-content: center; }
  .kk-logo img { width: 24mm; height: auto; }
  .kk-title { display: flex; flex-direction: column; justify-content: center; text-align: center; font-weight: 700; line-height: 1.25; }
  .kk-content { padding: 3mm 4mm 4mm; }
  .kk-meta { display: grid; grid-template-columns: 31mm 3mm 1fr; width: 60mm; margin-bottom: 1.5mm; }
  .kk-section-title { margin: 1mm 0 .5mm; font-weight: 700; }
  .kk-identitas { display: grid; grid-template-columns: 1fr 1fr; gap: .5mm 8mm; }
  .kk-row { display: grid; grid-template-columns: 39mm 3mm 1fr; min-height: 3.5mm; }
  .kk-row-wide { grid-column: 1 / -1; }
  .kk-row-full { display: grid; grid-template-columns: 39mm 3mm 1fr; grid-column: 1 / -1; min-height: 3.5mm; }
  .kk-right-identitas .kk-row { grid-template-columns: 27mm 3mm 1fr; }
  .kk-checks { display: flex; gap: 8mm; align-items: center; white-space: nowrap; }
  .kk-doc-row .kk-checks { flex-wrap: nowrap; gap: 10mm; }
  .kk-check { display: inline-flex; align-items: center; gap: 1.5mm; white-space: nowrap; }
  .kk-bar { background: #aaa; border: 1px solid #888; text-align: center; font-weight: 700; padding: .5mm; margin-top: 1.2mm; }
  .kk-table { table-layout: fixed; }
  .kk-table th { text-align: center; font-weight: 700; }
  .kk-table th, .kk-table td { font-size: 6.9pt; line-height: 1.05; }
  .kk-table td { height: 4.8mm; }
  .kk-table input { width: 100%; min-width: 0; border: 1px solid #c8c8c8; font: inherit; height: 4mm; padding: 0 1mm; }
  .kk-table textarea { width: 100%; min-width: 0; border: 1px solid #c8c8c8; font: inherit; min-height: 4mm; padding: 0 1mm; overflow: hidden; white-space: normal; overflow-wrap: anywhere; resize: none; }
  .kk-table input, .kk-table textarea { border-color: transparent; background: transparent; }
  .kk-calculated-cell { display: block; width: 100%; min-height: 4mm; border: 1px solid #c8c8c8; padding: 0 1mm; text-align: right; line-height: 4mm; }
  .kk-calculated-cell { border-color: transparent; }
  .kk-calculated-cell.center { text-align: center; }
  .kk-right { text-align: right; }
  .kk-center { text-align: center; }
  .kk-summary { margin-top: 1mm; font-size: 7pt; line-height: 1.12; font-weight: 700; }
  .kk-summary-row { display: grid; grid-template-columns: 46mm 1fr 8mm 13mm 34mm; min-height: 3.4mm; }
  .kk-summary-main { grid-column: 5; text-align: right; }
  .kk-summary-x { grid-column: 3; text-align: center; }
  .kk-summary-factor { grid-column: 4; text-align: center; }
  .kk-summary-result { grid-column: 5; text-align: right; }
  .kk-date-panitia-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 6mm; text-align: center; }
  .kk-date-panitia-row > :first-child { text-align: left; padding-left: 9mm; }
  .kk-date-panitia-row > :nth-child(3) { text-align: center; white-space: pre-wrap; }
  .kk-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 16mm; text-align: center; }
  .kk-box { display: inline-flex; width: 3mm; height: 3mm; align-items: center; justify-content: center; border: 1px solid #000; font-size: 7pt; line-height: 1; }
  .print-hidden { display: none !important; }
`;

/**
 * Universal print helper for auction documents.
 * Opens an isolated print window, clones the target DOM, injects print stylesheets,
 * and launches the native print dialog or calls custom onWindowReady handler.
 */
export function printDocumentWindow({
  rootId,
  title,
  emptyMessage = "Tidak ada dokumen untuk dicetak.",
  styles = "",
  removeSelectors = [".sk-measurement", ".sk-no-print", ".no-print", ".print-hidden"],
  beforePrint,
  onWindowReady,
  delayMs = 500,
}: PrintDocumentWindowOptions): void {
  const printContent = document.getElementById(rootId);
  if (!printContent) {
    toast.error(emptyMessage);
    return;
  }

  const clone = printContent.cloneNode(true) as HTMLElement;
  if (removeSelectors && removeSelectors.length > 0) {
    removeSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });
  }

  if (beforePrint) {
    beforePrint(clone);
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          ${BASE_AUCTION_PRINT_CSS}
          ${styles}
        </style>
      </head>
      <body>${clone.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  if (onWindowReady) {
    onWindowReady(printWindow);
  } else {
    setTimeout(() => printWindow.print(), delayMs);
  }
}
