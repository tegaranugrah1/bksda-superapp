/**
 * Shared print handler untuk Surat Tugas (builder + create).
 * Membuka window baru, inject HTML + CSS print, lalu trigger print dialog.
 */

import { cloneHtmlWithResolvedImages, openPrintWindow } from "@/lib/print-window";

const PRINT_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  @page :first { margin: 0; }
  @page st-lampiran-beda-hari { size: A4 portrait; margin: 0; }
  
  * { box-sizing: border-box; }
  
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }

  body {
    font-family: 'Bookman Old Style', 'Georgia', serif;
    font-size: 11pt;
    line-height: 1.25;
    color: #000;
    text-align: justify;
  }
  
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 2px 0; font-size: 11pt; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  
  .kop-surat {
    width: 210mm !important;
    /* Kompensasi spacer 15mm agar halaman pertama tetap rapat, sementara spacer berulang memberi margin halaman lanjutan. */
    margin: -1.2cm auto 4mm auto !important;
    text-align: center !important;
  }
  
  .kop-surat img {
    width: 188mm !important;
    max-width: 188mm !important;
    height: auto !important;
    display: block !important;
    margin: 0 auto !important;
  }
  
  .surat-content {
    width: 210mm !important;
    margin: 0 auto !important;
    padding: 0 1.55cm 0 2.0cm !important;
    box-sizing: border-box !important;
  }
  
  .field-section, .kepada-section, .kepada-list, .untuk-section, .untuk-list { break-inside: auto !important; page-break-inside: auto !important; }
  tbody > tr:not(.employee-entry):not(.untuk-entry) { break-inside: auto; page-break-inside: auto; }
  .employee-entry, 
  .employee-entry td, 
  .employee-entry div, 
  .employee-entry table, 
  .employee-entry tbody, 
  .employee-entry tr, 
  .untuk-entry, 
  .penutup-ttd-group { 
    break-inside: avoid !important; 
    page-break-inside: avoid !important; 
  }
  
  tfoot {
    display: table-footer-group !important;
    height: 25mm !important;
  }
  tfoot td {
    height: 25mm !important;
    padding: 0 !important;
    border: none !important;
  }
  
  .bsre-placeholder,
  .page-break-indicator,
  .halaman-divider,
  .print\\:hidden {
    display: none !important;
  }
  
  .st-lampiran-page-wrapper {
    page: st-lampiran-beda-hari;
    padding-top: 0 !important;
    break-before: page !important;
    page-break-before: always !important;
  }
  
  .st-lampiran-page {
    width: 210mm !important;
    margin: 0 auto !important;
    padding: 1.5cm 1.55cm 2.0cm 2.0cm !important;
    box-sizing: border-box !important;
    line-height: 1.25 !important;
  }
  
  .lampiran-meta { margin-left: 7.3cm !important; margin-bottom: 0.8rem !important; }
  .lampiran-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
  .lampiran-table th, .lampiran-table td { border: 1px solid #000 !important; padding: 4px 6px !important; font-size: 10.5pt !important; line-height: 1.2 !important; vertical-align: middle !important; }
  .lampiran-ttd { margin-left: 9.2cm !important; margin-top: 1.6rem !important; text-align: left !important; }
  thead.page-spacer td { height: 0; padding: 0; line-height: 0; font-size: 0; }
`;

/**
 * Cetak Surat Tugas dari elemen preview `#surat-preview-doc`.
 * @param stNumber nomor ST (untuk judul tab/file)
 * @param namaKegiatan nama kegiatan (untuk judul tab/file, di-sanitize)
 */
export function printSuratTugas(stNumber: string, namaKegiatan: string) {
  const printContent = document.getElementById("surat-preview-doc");
  if (!printContent) return;

  const safeKegiatan = (namaKegiatan || "ST").replace(/[/\\?%*:|"<>]/g, "-");
  openPrintWindow({
    title: `ST.${stNumber.replace(/[<>&"']/g, "")}-${safeKegiatan}`,
    bodyHtml: cloneHtmlWithResolvedImages(printContent),
    styles: PRINT_STYLE,
    delayMs: 300,
    waitForImages: true,
  });
}
