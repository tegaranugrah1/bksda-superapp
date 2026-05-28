"use client";

import { toast } from "sonner";
import { formatDateLong } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";

interface SptjLimitDocumentProps {
  number: string;
  kap: string;
  kepalaBalai: SkKepalaBalai;
}

function buildNomorText(number: string, kap: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `SM.${number.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

export function handlePrintSptjLimit() {
  const printContent = document.getElementById("sptj-limit-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen Surat Pernyataan Tanggung Jawab Nilai Limit untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Pernyataan Tanggung Jawab Nilai Limit</title>
        <style>
          @page { size: A4; margin: 0 0 28mm 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.4;
          }
          p { margin: 0; padding: 0; }
          article { margin: 0; }
          .doc-page {
            width: 210mm;
            box-sizing: border-box;
            margin: 0 auto;
            padding: 5mm 20mm 0;
          }
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
          .doc-list-item .marker { }
          .doc-list-item .text { text-align: justify; }
          .signature { width: 20rem; margin-left: auto; margin-top: 1.5rem; }
          .signature p { margin: 0; padding: 0; line-height: 1.3; }
          .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; margin-top: 2rem; margin-bottom: 2rem; }
          .doc-editable { outline: none; border-bottom: none !important; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function SptjLimitDocument({ number, kap, kepalaBalai }: SptjLimitDocumentProps) {
  const today = new Date();
  const nomorText = buildNomorText(number, kap, today);

  return (
    <div id="sptj-limit-print-root" className="sptj-limit-print-root">
      <style jsx global>{`
        .sptj-limit-print-root .doc-editable { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .sptj-limit-print-root .doc-editable:hover { border-bottom-color: #94a3b8; }
        .sptj-limit-print-root .doc-editable:focus { border-bottom-color: #64748b; }
        @media print {
          @page { size: A4; margin: 0 0 28mm 0; }
          body * { visibility: hidden; }
          .sptj-limit-print-root, .sptj-limit-print-root * { visibility: visible; }
          .sptj-limit-print-root {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.4; margin: 0; padding: 0;
          }
          .doc-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; box-shadow: none !important; }
          .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .doc-header img { max-width: 196mm !important; }
          .doc-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .doc-editable { border-bottom: none !important; }
        }
      `}</style>

      <article
        className="doc-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.4" }}
      >
        <div className="doc-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="doc-title mt-2 text-center font-bold leading-snug">
          <p className="m-0">SURAT PERNYATAAN TANGGUNG JAWAB NILAI LIMIT</p>
          <p className="m-0 font-normal">Nomor : {nomorText}</p>
        </div>

        <div className="doc-body doc-text-block mx-auto mt-4 w-[166mm] space-y-3 text-justify">
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Yang bertanda tangan di bawah ini :
          </p>
          <div className="doc-identity grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
            <span>Nama</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">{kepalaBalai.nama}</span>
            <span>NIP</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">{kepalaBalai.nip}</span>
            <span>Pangkat/Gol</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">Pembina Tk.I / IV b</span>
            <span>Jabatan</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">Kepala Balai KSDA Kalimantan Timur</span>
          </div>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Dengan ini menyatakan sebagai berikut :
          </p>
          <ol className="doc-list space-y-2">
            <li className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
              <span className="marker">1.</span>
              <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify">
                Bertanggungjawab secara penuh atas kebenaran nilai limit yang kami ajukan dalam rangka penjualan, yang bukan merupakan nilai wajar hasil inventarisasi dan penilaian.
              </span>
            </li>
            <li className="doc-list-item grid grid-cols-[8mm_minmax(0,1fr)]">
              <span className="marker">2.</span>
              <span contentEditable suppressContentEditableWarning className="doc-editable text text-justify">
                Perhitungan nilai limit sebagaimana dimaksud pada angka 1 (satu), prinsip efisien, efektif dan menghasilkan manfaat yang optimal bagi negara (antara lain penurunan nilai barang dimaksud apabila tidak dilakukan penghapusan/pemindahtanganan, potensi biaya pemeliharaan yang harus dikeluarkan, ketersediaan ruangan yang sudah tidak memadai dan sebagainya).
              </span>
            </li>
          </ol>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Demikian pernyataan ini kami buat dengan keadaan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
          </p>
        </div>

        <div className="signature mt-6 ml-auto w-80">
          <p className="m-0">Samarinda, {formatDateLong(today)}</p>
          <p className="m-0">Kepala Balai,</p>
          <div className="ttd-placeholder mt-8 box-border h-28 pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0 mt-8">{kepalaBalai.nama}</p>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0">NIP. {kepalaBalai.nip}</p>
        </div>
      </article>
    </div>
  );
}
