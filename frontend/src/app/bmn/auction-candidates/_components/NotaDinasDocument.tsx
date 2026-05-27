"use client";

import { toast } from "sonner";
import { AssetLampiranLandscapeTable } from "./AssetLampiranLandscapeTable";
import type { AuctionAsset } from "../_lib/auction-helpers";
import {
  formatDateLong,
  formatPlainRupiah,
  numberToWords,
} from "../_lib/auction-helpers";
import type { SkBuilderItem, SkKepalaBalai } from "../_lib/sk-defaults";

interface NotaDinasDocumentProps {
  number: string;
  assets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
  perihal: string;
  lampiran: string;
  lokasi: string;
  tembusan: SkBuilderItem[];
  kesimpulan: string;
  nilaiTaksiran: number;
}

const LAMPIRAN_TITLE = "Persetujuan Pemindahtanganan BMN dengan Penjualan Pada Balai KSDA Kalimantan Timur";

function buildNomor(number: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `ND.${(number || "270").trim()}/K.18/TU/KAP.06.01/B/${month}/${today.getFullYear()}`;
}

export function handlePrintNotaDinas() {
  const printContent = document.getElementById("nota-dinas-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen Nota Dinas untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Nota Dinas Permohonan KSDAE</title>
        <style>
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
          .nd-ttd .nd-ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; font-size: 9pt; text-align: left; }
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
          .nd-lamp-ttd .nd-lamp-ttd-placeholder { box-sizing: border-box; height: 86px; padding-top: 28px; padding-left: 1.35cm; margin-top: 2rem; margin-bottom: 2rem; color: #94a3b8; font-size: 9pt; text-align: left; }
          .nd-lamp-ttd .nd-lamp-ttd-name { font-weight: normal; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function NotaDinasDocument({
  number,
  assets,
  kepalaBalai,
  perihal,
  lampiran,
  lokasi,
  tembusan,
  kesimpulan,
  nilaiTaksiran,
}: NotaDinasDocumentProps) {
  const today = new Date();
  const nomorText = buildNomor(number, today);
  const tanggalLong = formatDateLong(today);

  const totalPerolehan = assets.reduce(
    (sum, a) => sum + (a.nilai_perolehan || 0),
    0,
  );
  const totalPerolehanText = formatPlainRupiah(totalPerolehan);
  const totalPerolehanWords = totalPerolehan > 0 ? numberToWords(totalPerolehan) : "";
  const taksiranText = formatPlainRupiah(nilaiTaksiran);
  const taksiranWords = nilaiTaksiran > 0 ? numberToWords(nilaiTaksiran) : "";

  return (
    <div id="nota-dinas-print-root" className="nota-dinas-print-root">
      <style jsx global>{`
        .nota-dinas-print-root { font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.4; color: black; }
        .nota-dinas-print-root .nd-edit, .nota-dinas-print-root .nd-lamp-edit { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .nota-dinas-print-root .nd-edit:hover, .nota-dinas-print-root .nd-lamp-edit:hover { border-bottom-color: #94a3b8; }
        .nota-dinas-print-root .nd-edit:focus, .nota-dinas-print-root .nd-lamp-edit:focus { border-bottom-color: #64748b; }
        .nota-dinas-print-root .nd-page-landscape { width: 297mm !important; max-width: 297mm !important; padding: 10mm 16mm 20mm !important; }

        /* ── Preview structural styles (also injected for print via the cloned head) ── */
        .nota-dinas-print-root p { margin: 0; padding: 0; }
        .nota-dinas-print-root .nd-kop { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; margin-bottom: 6px; text-align: center; }
        .nota-dinas-print-root .nd-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
        .nota-dinas-print-root .nd-title { width: 166mm; margin: 12px auto 0; text-align: center; font-weight: bold; line-height: 1.3; font-size: 14pt; }
        .nota-dinas-print-root .nd-title-nomor { font-weight: normal; font-size: 11pt; margin-top: 4px; }
        .nota-dinas-print-root .nd-meta { width: 166mm; margin: 16px auto 0; }
        .nota-dinas-print-root .nd-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; line-height: 1.6; }
        .nota-dinas-print-root .nd-meta-colon { text-align: center; }
        .nota-dinas-print-root .nd-divider { display: none !important; }
        .nota-dinas-print-root .nd-body { width: 166mm; margin: 14px auto 0; text-align: justify; text-justify: inter-word; text-indent: 0; }
        .nota-dinas-print-root .nd-body p { margin-bottom: 0.85rem; text-indent: 2.5em; }
        .nota-dinas-print-root .nd-ttd { width: 80mm; margin: 1.5rem 0 0 auto; text-align: left; }
        .nota-dinas-print-root .nd-ttd p { margin: 0; line-height: 1.3; }
        .nota-dinas-print-root .nd-ttd .nd-ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; font-size: 9pt; text-align: left; }
        .nota-dinas-print-root .nd-ttd .nd-ttd-name { font-weight: normal; }
        .nota-dinas-print-root .nd-tembusan { width: 166mm; margin: 1.2rem auto 0; }
        .nota-dinas-print-root .nd-tembusan-title { font-weight: normal; }
        .nota-dinas-print-root .nd-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); }

        /* Lampiran landscape (preview) */
        .nota-dinas-print-root .nd-lamp-root { width: 258mm; margin: 0 auto; font-family: 'Bookman Old Style', Georgia, serif; }
        .nota-dinas-print-root .nd-lamp-page { page: nd-landscape; break-inside: avoid; page-break-inside: avoid; }
        .nota-dinas-print-root .nd-lamp-page-continuation { page-break-before: always; break-before: page; padding-top: 8mm; }
        .nota-dinas-print-root .nd-lamp-page-with-signature { break-inside: avoid; page-break-inside: avoid; }
        .nota-dinas-print-root .nd-lamp-meta { width: 128mm; margin-left: auto; text-align: left; font-size: 10pt; }
        .nota-dinas-print-root .nd-lamp-meta p { margin: 0 0 0.45rem 0; }
        .nota-dinas-print-root .nd-lamp-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; }
        .nota-dinas-print-root .nd-lamp-colon { text-align: center; }
        .nota-dinas-print-root .nd-lamp-title { text-align: center; font-weight: bold; font-size: 12pt; margin-top: 1rem; line-height: 1.3; }
        .nota-dinas-print-root .nd-lamp-title p { margin: 0; }
        .nota-dinas-print-root .nd-lamp-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; margin-top: 0.75rem; table-layout: fixed; }
        .nota-dinas-print-root .nd-lamp-table th, .nota-dinas-print-root .nd-lamp-table td { border: 1px solid #000; padding: 6px 4px; vertical-align: middle; overflow-wrap: anywhere; }
        .nota-dinas-print-root .nd-lamp-column-number-row th { font-weight: normal; }
        .nota-dinas-print-root .nd-lamp-jumlah-row td { background: #f3f4f6; }
        .nota-dinas-print-root .nd-lamp-ttd { width: 20rem; margin: 1rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
        .nota-dinas-print-root .nd-lamp-ttd p { margin: 0; padding: 0; line-height: 1.15; }
        .nota-dinas-print-root .nd-lamp-ttd .nd-lamp-ttd-placeholder { box-sizing: border-box; height: 86px; padding-top: 28px; padding-left: 1.35cm; margin-top: 2rem; margin-bottom: 2rem; color: #94a3b8; font-size: 9pt; text-align: left; }
        .nota-dinas-print-root .nd-lamp-ttd .nd-lamp-ttd-name { font-weight: normal; }

        @media print {
          @page nd-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
          @page nd-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
          body * { visibility: hidden; }
          .nota-dinas-print-root, .nota-dinas-print-root * { visibility: visible; }
          .nota-dinas-print-root { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
          .nd-page { box-shadow: none !important; padding: 5mm 20mm 0; page: nd-portrait; }
          .nd-page-landscape { box-shadow: none !important; padding: 10mm 16mm 20mm; page: nd-landscape; page-break-before: always; }
          .nd-edit, .nd-lamp-edit { border-bottom: none !important; }
        }
      `}</style>

      {/* ─── Halaman 1: Nota Dinas (Portrait) ─────────────────────── */}
      <article
        className="nd-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
      >
        <div className="nd-kop -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="nd-title">
          <p>NOTA DINAS</p>
          <p className="nd-title-nomor">Nomor : {nomorText}</p>
        </div>

        <div className="nd-meta">
          <div className="nd-meta-row">
            <span>Yth.</span>
            <span className="nd-meta-colon">:</span>
            <span contentEditable suppressContentEditableWarning className="nd-edit">
              Sekretaris Direktorat Jenderal KSDAE
            </span>
          </div>
          <div className="nd-meta-row">
            <span>Dari</span>
            <span className="nd-meta-colon">:</span>
            <span contentEditable suppressContentEditableWarning className="nd-edit">
              Kepala Balai KSDA Kalimantan Timur
            </span>
          </div>
          <div className="nd-meta-row">
            <span>Perihal</span>
            <span className="nd-meta-colon">:</span>
            <span contentEditable suppressContentEditableWarning className="nd-edit">
              {perihal}
            </span>
          </div>
          <div className="nd-meta-row">
            <span>Lampiran</span>
            <span className="nd-meta-colon">:</span>
            <span contentEditable suppressContentEditableWarning className="nd-edit">
              {lampiran}
            </span>
          </div>
          <div className="nd-meta-row">
            <span>Tanggal</span>
            <span className="nd-meta-colon">:</span>
            <span contentEditable suppressContentEditableWarning className="nd-edit">
              {tanggalLong}
            </span>
          </div>
        </div>

        <div className="nd-body">
          <p contentEditable suppressContentEditableWarning className="nd-edit">
            Dalam rangka proses penghapusan BMN yang tidak dapat dipergunakan dalam menunjang tugas dan fungsi Balai KSDA Kalimantan Timur, dengan hormat kami mengajukan permohonan persetujuan pemindahtanganan dengan penjualan BMN yang berada di <span contentEditable suppressContentEditableWarning className="nd-edit" style={{ display: "inline" }}>{lokasi}</span> yang akan dilakukan penghapusan berupa Alat Angkutan Darat Bermotor dengan total nilai perolehan sebesar Rp{totalPerolehanText},-{totalPerolehanWords ? ` (${totalPerolehanWords.toLowerCase()} rupiah)` : ""} dan nilai taksiran sebesar Rp{taksiranText},-{taksiranWords ? ` (${taksiranWords.toLowerCase()} rupiah)` : ""} sebagaimana berkas terlampir.
          </p>
          <p contentEditable suppressContentEditableWarning className="nd-edit">
            {kesimpulan}
          </p>
        </div>

        <div className="nd-ttd">
          <div className="nd-ttd-placeholder">${"{ttd_pengirim}"}</div>
          <p className="nd-ttd-name">{kepalaBalai.nama}</p>
          <p>NIP. {kepalaBalai.nip}</p>
        </div>

        {tembusan.length > 0 && (
          <div className="nd-tembusan">
            <p className="nd-tembusan-title">Tembusan :</p>
            {tembusan.map((t, i) => (
              <div className="nd-tembusan-item" key={t.id} style={tembusan.length === 1 ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
                {tembusan.length > 1 && <span>{i + 1}.</span>}
                <span contentEditable suppressContentEditableWarning className="nd-edit">{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* ─── Halaman 2: Lampiran Landscape ─────────────────────── */}
      <article
        className="nd-page-landscape mx-auto max-w-[297mm] bg-white px-12 py-6 text-black shadow-xl ring-1 ring-zinc-200"
      >
        <AssetLampiranLandscapeTable
          assets={assets}
          nomor={nomorText}
          tanggal={tanggalLong}
          perihalLampiran={LAMPIRAN_TITLE}
          kepalaBalai={kepalaBalai}
          prefix="nd-"
        />
      </article>
    </div>
  );
}
