/**
 * Shared print handler untuk Surat Tugas (builder + create).
 * Membuka window baru, inject HTML + CSS print, lalu trigger print dialog.
 */

const PRINT_STYLE = `
  @page { size: A4; margin: 3cm 1cm 1.9cm 1.55cm; }
  @page :first { margin: 0.7cm 1cm 1.9cm 1.55cm; }
  @page st-lampiran-beda-hari { size: A4; margin: 2cm 1cm 1.9cm 1.55cm; }
  body {
    font-family: 'Bookman Old Style', 'Georgia', serif;
    font-size: 11pt;
    line-height: 1.25;
    color: #000;
    margin: 0;
    padding: 0;
    text-align: justify;
  }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 2px 0; font-size: 11pt; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  img { max-width: none !important; }
  .ttd-placeholder { height: 80px; }
  .kop-surat { margin-left: 0 !important; margin-right: -0.95cm !important; margin-top: -0.25cm !important; margin-bottom: 2px !important; overflow: visible !important; }
  .kop-surat img { width: 18.8cm !important; height: auto !important; }
  .surat-content { margin-left: 1.25cm !important; width: calc(100% - 2.2cm) !important; margin-right: 0.95cm !important; }
  .field-section, .kepada-section, .kepada-list, .untuk-section, .untuk-list { break-inside: auto !important; page-break-inside: auto !important; }
  .employee-entry, .untuk-entry, .penutup-ttd-group { break-inside: avoid !important; page-break-inside: avoid !important; }
  div[style*="page-break-inside"] { page-break-inside: avoid; }
  .st-lampiran-page-wrapper { page: st-lampiran-beda-hari; padding-top: 0 !important; break-before: page !important; page-break-before: always !important; }
  .st-lampiran-page { margin-left: 1.25cm !important; width: calc(100% - 2.2cm) !important; box-sizing: border-box !important; line-height: 1.25 !important; }
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
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const safeKegiatan = (namaKegiatan || "ST").replace(/[/\\?%*:|"<>]/g, "-");

  printWindow.document.write(`
    <html>
    <head>
      <title>ST.${stNumber}-${safeKegiatan}</title>
      <style>${PRINT_STYLE}</style>
    </head>
    <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
