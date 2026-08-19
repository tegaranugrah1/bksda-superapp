/**
 * Shared print handler untuk Surat Tugas (builder + create).
 * Membuka window baru, inject HTML + CSS print, lalu trigger print dialog.
 */

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
    padding: 0 1.55cm 1.5cm 2.0cm !important;
    box-sizing: border-box !important;
  }
  
  .field-section, .kepada-section, .kepada-list, .untuk-section, .untuk-list { break-inside: auto !important; page-break-inside: auto !important; }
  .employee-entry, .untuk-entry, .penutup-ttd-group { break-inside: avoid !important; page-break-inside: avoid !important; }
  div[style*="page-break-inside"] { page-break-inside: avoid; }
  
  .st-lampiran-page-wrapper {
    page: st-lampiran-beda-hari;
    padding-top: 0 !important;
    break-before: page !important;
    page-break-before: always !important;
  }
  
  .st-lampiran-page {
    width: 210mm !important;
    margin: 0 auto !important;
    padding: 0 1.55cm 0 2.0cm !important;
    box-sizing: border-box !important;
    line-height: 1.25 !important;
  }
  
  .lampiran-meta { margin-left: 7.3cm !important; margin-bottom: 0.8rem !important; }
  .lampiran-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
  .lampiran-table th, .lampiran-table td { border: 1px solid #000 !important; padding: 4px 6px !important; font-size: 10.5pt !important; line-height: 1.2 !important; vertical-align: middle !important; }
  .lampiran-ttd { margin-left: 9.2cm !important; margin-top: 1.6rem !important; text-align: left !important; }
  thead.page-spacer td { height: 0; padding: 0; line-height: 0; font-size: 0; }
`;

function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

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

  // Clone content and resolve relative image URLs to absolute URLs
  const container = document.createElement("div");
  container.innerHTML = printContent.innerHTML;
  const imgs = container.getElementsByTagName("img");
  for (let i = 0; i < imgs.length; i++) {
    const src = imgs[i].getAttribute("src");
    if (src) {
      imgs[i].setAttribute("src", resolveImageUrl(src));
    }
  }

  printWindow.document.write(`
    <html>
    <head>
      <title>ST.${stNumber}-${safeKegiatan}</title>
      <style>${PRINT_STYLE}</style>
    </head>
    <body>${container.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  const printImages = printWindow.document.getElementsByTagName("img");
  let loaded = 0;
  const total = printImages.length;
  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (total === 0) {
    setTimeout(triggerPrint, 300);
  } else {
    for (let i = 0; i < total; i++) {
      if (printImages[i].complete) {
        loaded++;
      } else {
        printImages[i].onload = printImages[i].onerror = () => {
          loaded++;
          if (loaded >= total) triggerPrint();
        };
      }
    }
    if (loaded >= total) {
      setTimeout(triggerPrint, 300);
    }
  }
}
