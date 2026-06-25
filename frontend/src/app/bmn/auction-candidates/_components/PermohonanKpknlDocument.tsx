"use client";

import { toast } from "sonner";
import { AssetLampiranLandscapeTable } from "./AssetLampiranLandscapeTable";
import type { AuctionAsset } from "../_lib/auction-helpers";
import { formatDateLong } from "../_lib/auction-helpers";
import type { SkBuilderItem, SkKepalaBalai } from "../_lib/sk-defaults";

interface PermohonanKpknlDocumentProps {
  number: string;
  kap: string;
  assets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
  perihal: string;
  lampiran: string;
  lokasi: string;
  tembusan: SkBuilderItem[];
  kesimpulan: string;
}

const LAMPIRAN_TITLE = "Persetujuan Pemindahtanganan BMN dengan Penjualan Melalui Lelang Pada Balai KSDA Kalimantan Timur";

function buildNomor(number: string, kap: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `S.${(number || "").trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

export function handlePrintPermohonanKpknl() {
  const printContent = document.getElementById("permohonan-kpknl-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen Permohonan KPKNL untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Permohonan Persetujuan KPKNL</title>
        <style>
          @page pkpknl-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
          @page pkpknl-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; color: black; font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.4; }
          p { margin: 0; padding: 0; }

          .pkpknl-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; page: pkpknl-portrait; }
          .pkpknl-page-landscape { width: 297mm; margin: 0 auto; padding: 10mm 16mm 20mm; page: pkpknl-landscape; page-break-before: always; break-before: page; }
          .pkpknl-kop { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; margin-bottom: 6px; text-align: center; }
          .pkpknl-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
          .pkpknl-meta-grid { width: 166mm; margin: 14px auto 0; display: grid; grid-template-columns: 1fr auto; gap: 16mm; }
          .pkpknl-meta-left { line-height: 1.5; }
          .pkpknl-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; }
          .pkpknl-meta-colon { text-align: center; }
          .pkpknl-meta-tanggal { text-align: right; line-height: 1.5; }
          .pkpknl-yth { width: 166mm; margin: 18px auto 0; }
          .pkpknl-yth p { margin: 0; line-height: 1.4; }
          .pkpknl-edit { outline: none; border-bottom: none !important; }
          .pkpknl-body { width: 166mm; margin: 14px auto 0; text-align: justify; text-justify: inter-word; }
          .pkpknl-body p { margin-bottom: 0.7rem; text-indent: 2.5em; }
          .pkpknl-ttd { width: 20rem; margin: 1.5rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
          .pkpknl-ttd p { margin: 0; padding: 0; line-height: 1.15; }
          .pkpknl-ttd .pkpknl-ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; margin-top: 2rem; margin-bottom: 2rem; color: #94a3b8; font-size: 9pt; text-align: left; }
          .pkpknl-ttd .pkpknl-ttd-name { font-weight: normal; }
          .pkpknl-tembusan { width: 166mm; margin: 1.2rem auto 0; }
          .pkpknl-tembusan-title { font-weight: normal; }
          .pkpknl-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); }

          /* Lampiran landscape (shared prefix-aware styles) */
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
          .pkpknl-lamp-ttd .pkpknl-lamp-ttd-placeholder { box-sizing: border-box; height: 86px; padding-top: 28px; padding-left: 1.35cm; margin-top: 2rem; margin-bottom: 2rem; color: #94a3b8; font-size: 9pt; text-align: left; }
          .pkpknl-lamp-ttd .pkpknl-lamp-ttd-name { font-weight: normal; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function PermohonanKpknlDocument({
  number,
  kap,
  assets,
  kepalaBalai,
  perihal,
  lampiran,
  lokasi,
  tembusan,
  kesimpulan,
}: PermohonanKpknlDocumentProps) {
  const today = new Date();
  const nomorText = buildNomor(number, kap, today);
  const tanggalLong = formatDateLong(today);

  return (
    <div id="permohonan-kpknl-print-root" className="permohonan-kpknl-print-root">
      <style jsx global>{`
        .permohonan-kpknl-print-root { font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.4; color: black; }
        .permohonan-kpknl-print-root .pkpknl-edit, .permohonan-kpknl-print-root .pkpknl-lamp-edit { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .permohonan-kpknl-print-root .pkpknl-edit:hover, .permohonan-kpknl-print-root .pkpknl-lamp-edit:hover { border-bottom-color: #94a3b8; }
        .permohonan-kpknl-print-root .pkpknl-edit:focus, .permohonan-kpknl-print-root .pkpknl-lamp-edit:focus { border-bottom-color: #64748b; }
        .permohonan-kpknl-print-root .pkpknl-page-landscape { width: 297mm !important; max-width: 297mm !important; padding: 10mm 16mm 20mm !important; }

        /* ── Preview structural styles ── */
        .permohonan-kpknl-print-root p { margin: 0; padding: 0; }
        .permohonan-kpknl-print-root .pkpknl-kop { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; margin-bottom: 6px; text-align: center; }
        .permohonan-kpknl-print-root .pkpknl-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
        .permohonan-kpknl-print-root .pkpknl-meta-grid { width: 166mm; margin: 14px auto 0; display: grid; grid-template-columns: 1fr auto; gap: 16mm; }
        .permohonan-kpknl-print-root .pkpknl-meta-left { line-height: 1.6; }
        .permohonan-kpknl-print-root .pkpknl-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; }
        .permohonan-kpknl-print-root .pkpknl-meta-colon { text-align: center; }
        .permohonan-kpknl-print-root .pkpknl-meta-tanggal { text-align: right; line-height: 1.6; }
        .permohonan-kpknl-print-root .pkpknl-yth { width: 166mm; margin: 18px auto 0; }
        .permohonan-kpknl-print-root .pkpknl-yth p { margin: 0; line-height: 1.4; }
        .permohonan-kpknl-print-root .pkpknl-body { width: 166mm; margin: 14px auto 0; text-align: justify; text-justify: inter-word; }
        .permohonan-kpknl-print-root .pkpknl-body p { margin-bottom: 0.85rem; text-indent: 2.5em; }
        .permohonan-kpknl-print-root .pkpknl-ttd { width: 20rem; margin: 1.5rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
        .permohonan-kpknl-print-root .pkpknl-ttd p { margin: 0; padding: 0; line-height: 1.15; }
        .permohonan-kpknl-print-root .pkpknl-ttd .pkpknl-ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; margin-top: 2rem; margin-bottom: 2rem; color: #94a3b8; font-size: 9pt; text-align: left; }
        .permohonan-kpknl-print-root .pkpknl-ttd .pkpknl-ttd-name { font-weight: normal; }
        .permohonan-kpknl-print-root .pkpknl-tembusan { width: 166mm; margin: 1.2rem auto 0; }
        .permohonan-kpknl-print-root .pkpknl-tembusan-title { font-weight: normal; }
        .permohonan-kpknl-print-root .pkpknl-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); }

        /* Lampiran landscape (preview) */
        .permohonan-kpknl-print-root .pkpknl-lamp-root { width: 258mm; margin: 0 auto; font-family: 'Bookman Old Style', Georgia, serif; }
        .permohonan-kpknl-print-root .pkpknl-lamp-page { page: pkpknl-landscape; break-inside: avoid; page-break-inside: avoid; }
        .permohonan-kpknl-print-root .pkpknl-lamp-page-continuation { page-break-before: always; break-before: page; padding-top: 8mm; }
        .permohonan-kpknl-print-root .pkpknl-lamp-page-with-signature { break-inside: avoid; page-break-inside: avoid; }
        .permohonan-kpknl-print-root .pkpknl-lamp-meta { width: 128mm; margin-left: auto; text-align: left; font-size: 10pt; }
        .permohonan-kpknl-print-root .pkpknl-lamp-meta p { margin: 0 0 0.45rem 0; }
        .permohonan-kpknl-print-root .pkpknl-lamp-meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); align-items: start; }
        .permohonan-kpknl-print-root .pkpknl-lamp-colon { text-align: center; }
        .permohonan-kpknl-print-root .pkpknl-lamp-title { text-align: center; font-weight: bold; font-size: 12pt; margin-top: 1rem; line-height: 1.3; }
        .permohonan-kpknl-print-root .pkpknl-lamp-title p { margin: 0; }
        .permohonan-kpknl-print-root .pkpknl-lamp-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; margin-top: 0.75rem; table-layout: fixed; }
        .permohonan-kpknl-print-root .pkpknl-lamp-table th, .permohonan-kpknl-print-root .pkpknl-lamp-table td { border: 1px solid #000; padding: 6px 4px; vertical-align: middle; overflow-wrap: anywhere; }
        .permohonan-kpknl-print-root .pkpknl-lamp-column-number-row th { font-weight: normal; }
        .permohonan-kpknl-print-root .pkpknl-lamp-jumlah-row td { background: #f3f4f6; }
        .permohonan-kpknl-print-root .pkpknl-lamp-ttd { width: 20rem; margin: 1rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
        .permohonan-kpknl-print-root .pkpknl-lamp-ttd p { margin: 0; padding: 0; line-height: 1.15; }
        .permohonan-kpknl-print-root .pkpknl-lamp-ttd .pkpknl-lamp-ttd-placeholder { box-sizing: border-box; height: 86px; padding-top: 28px; padding-left: 1.35cm; margin-top: 2rem; margin-bottom: 2rem; color: #94a3b8; font-size: 9pt; text-align: left; }
        .permohonan-kpknl-print-root .pkpknl-lamp-ttd .pkpknl-lamp-ttd-name { font-weight: normal; }

        @media print {
          @page pkpknl-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
          @page pkpknl-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
          body * { visibility: hidden; }
          .permohonan-kpknl-print-root, .permohonan-kpknl-print-root * { visibility: visible; }
          .permohonan-kpknl-print-root { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
          .pkpknl-page { box-shadow: none !important; padding: 5mm 20mm 0; page: pkpknl-portrait; }
          .pkpknl-page-landscape { box-shadow: none !important; padding: 10mm 16mm 20mm; page: pkpknl-landscape; page-break-before: always; }
          .pkpknl-edit, .pkpknl-lamp-edit { border-bottom: none !important; }
        }
      `}</style>

      {/* ─── Halaman 1: Surat Permohonan (Portrait) ─────────────────────── */}
      <article
        className="pkpknl-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
      >
        <div className="pkpknl-kop -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-terbaru.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="pkpknl-meta-grid">
          <div className="pkpknl-meta-left">
            <div className="pkpknl-meta-row">
              <span>Nomor</span>
              <span className="pkpknl-meta-colon">:</span>
              <span contentEditable suppressContentEditableWarning className="pkpknl-edit">{nomorText}</span>
            </div>
            <div className="pkpknl-meta-row">
              <span>Sifat</span>
              <span className="pkpknl-meta-colon">:</span>
              <span contentEditable suppressContentEditableWarning className="pkpknl-edit">Penting</span>
            </div>
            <div className="pkpknl-meta-row">
              <span>Lampiran</span>
              <span className="pkpknl-meta-colon">:</span>
              <span contentEditable suppressContentEditableWarning className="pkpknl-edit">{lampiran}</span>
            </div>
            <div className="pkpknl-meta-row">
              <span>Perihal</span>
              <span className="pkpknl-meta-colon">:</span>
              <span contentEditable suppressContentEditableWarning className="pkpknl-edit">{perihal}</span>
            </div>
          </div>
          <div className="pkpknl-meta-tanggal">
            <span contentEditable suppressContentEditableWarning className="pkpknl-edit">{tanggalLong}</span>
          </div>
        </div>

        <div className="pkpknl-yth">
          <p>Kepada Yth,</p>
          <p contentEditable suppressContentEditableWarning className="pkpknl-edit">Kantor KPKNL Samarinda</p>
          <p>di</p>
          <p>Samarinda</p>
        </div>

        <div className="pkpknl-body">
          <p contentEditable suppressContentEditableWarning className="pkpknl-edit">
            Dalam rangka proses penghapusan BMN yang tidak dapat dipergunakan dalam menunjang tugas dan fungsi Balai KSDA Kalimantan Timur, bersama ini kami mengajukan permohonan persetujuan pemindahtanganan dengan penjualan BMN yang berada di <span contentEditable suppressContentEditableWarning className="pkpknl-edit" style={{ display: "inline" }}>{lokasi}</span> berupa Alat Angkutan Bermotor sebagaimana berkas terlampir.
          </p>
          <p contentEditable suppressContentEditableWarning className="pkpknl-edit">
            {kesimpulan}
          </p>
        </div>

        <div className="pkpknl-ttd">
          <p>Kepala Balai,</p>
          <div className="pkpknl-ttd-placeholder"></div>
          <p className="pkpknl-ttd-name">{kepalaBalai.nama}</p>
          <p>NIP. {kepalaBalai.nip}</p>
        </div>

        {tembusan.length > 0 && (
          <div className="pkpknl-tembusan">
            <p className="pkpknl-tembusan-title">Tembusan :</p>
            {tembusan.map((t, i) => (
              <div className="pkpknl-tembusan-item" key={t.id} style={tembusan.length === 1 ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
                {tembusan.length > 1 && <span>{i + 1}.</span>}
                <span contentEditable suppressContentEditableWarning className="pkpknl-edit">{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* ─── Halaman 2: Lampiran Landscape ─────────────────────── */}
      <article
        className="pkpknl-page-landscape mx-auto max-w-[297mm] bg-white px-12 py-6 text-black shadow-xl ring-1 ring-zinc-200"
      >
        <AssetLampiranLandscapeTable
          assets={assets}
          nomor={nomorText}
          tanggal={tanggalLong}
          perihalLampiran={LAMPIRAN_TITLE}
          kepalaBalai={kepalaBalai}
          prefix="pkpknl-"
        />
      </article>
    </div>
  );
}
