// Shared print helpers for the BMN "Surat Pernyataan" documents
// (SPTJM, Tanggung Jawab Nilai Limit, Tidak Mengganggu Kelancaran Tugas).
//
// These three documents share an identical print layout. Keeping a single
// source of truth here avoids drift between their print stylesheets and the
// window-opening logic.

import { toast } from "sonner";

/**
 * Canonical print stylesheet for the "Surat Pernyataan" family. This is the
 * union of the rules previously duplicated across each document; the extra
 * `.doc-list*` rules are harmless for documents that don't render a list.
 */
export const PERNYATAAN_PRINT_CSS = `
  @page { size: A4; margin: 0 0 28mm 0; }
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
  .doc-identity { display: grid; grid-template-columns: 28mm 5mm minmax(0, 1fr); row-gap: 0.2rem; column-gap: 0; }
  .doc-identity .colon { text-align: center; }
  .doc-list { padding-left: 0; margin: 0; }
  .doc-list-item { display: grid; grid-template-columns: 8mm minmax(0, 1fr); column-gap: 0; }
  .doc-list-item + .doc-list-item { margin-top: 0.5rem; }
  .doc-list-item .text { text-align: justify; }
  .signature { width: 20rem; margin-left: auto; margin-top: 1.5rem; }
  .signature p { margin: 0; padding: 0; line-height: 1.3; }
  .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; margin-top: 2rem; margin-bottom: 2rem; }
  .doc-editable { outline: none; border-bottom: none !important; }
`;

/**
 * Build the surat-pernyataan "Nomor" string. Only the leading prefix differs
 * between document types (e.g. "SPTJM" vs "SM").
 */
export function buildPernyataanNomor(prefix: string, number: string, kap: string, today: Date): string {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${prefix}.${number.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

interface PrintPernyataanOptions {
  /** DOM id of the on-screen print root to clone into the print window. */
  rootId: string;
  /** Title shown in the print window's <head>. */
  title: string;
  /** Toast message shown when the print root cannot be found. */
  emptyMessage: string;
}

/** Open a print window for one of the surat-pernyataan documents. */
export function printPernyataan({ rootId, title, emptyMessage }: PrintPernyataanOptions): void {
  const printContent = document.getElementById(rootId);
  if (!printContent) {
    toast.error(emptyMessage);
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${PERNYATAAN_PRINT_CSS}</style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
