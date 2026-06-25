"use client";

import { toast } from "sonner";
import type { AuctionAsset } from "../_lib/auction-helpers";
import { formatDateLong } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";

interface SkKebenaranDokumenDocumentProps {
  number: string;
  kap: string;
  assets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
}

function buildNomorText(number: string, kap: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `KT.${number.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

function getOwnershipDocumentNumber(asset: AuctionAsset) {
  return asset.no_bpkp || asset.no_dokumen || asset.no_sertifikat || asset.no_identitas || "";
}

export function handlePrintSkKebenaran() {
  const printContent = document.getElementById("sk-kebenaran-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen Surat Keterangan Kebenaran Fotokopi untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Keterangan Kebenaran Fotokopi Dokumen Kepemilikan</title>
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

export function SkKebenaranDokumenDocument({ number, kap, assets, kepalaBalai }: SkKebenaranDokumenDocumentProps) {
  const today = new Date();
  const nomorText = buildNomorText(number, kap, today);

  return (
    <div id="sk-kebenaran-print-root" className="sk-kebenaran-print-root">
      <style jsx global>{`
        .sk-kebenaran-print-root .doc-editable { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .sk-kebenaran-print-root .doc-editable:hover { border-bottom-color: #94a3b8; }
        .sk-kebenaran-print-root .doc-editable:focus { border-bottom-color: #64748b; }
        .sk-kebenaran-print-root table.kebenaran-table { border-collapse: collapse; width: 100%; font-size: 9pt; text-align: center; }
        .sk-kebenaran-print-root table.kebenaran-table th,
        .sk-kebenaran-print-root table.kebenaran-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
        @media print {
          @page { size: A4; margin: 0 0 28mm 0; }
          body * { visibility: hidden; }
          .sk-kebenaran-print-root, .sk-kebenaran-print-root * { visibility: visible; }
          .sk-kebenaran-print-root {
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
          table.kebenaran-table tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <article
        className="doc-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.4" }}
      >
        <div className="doc-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-terbaru.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="doc-title mt-2 text-center font-bold leading-snug">
          <p className="m-0">SURAT KETERANGAN</p>
          <p className="m-0">KEBENARAN FOTOKOPI DOKUMEN KEPEMILIKAN ATAU DOKUMEN LAIN</p>
          <p className="m-0">YANG SETARA DENGAN BUKTI KEPEMILIKAN BARANG MILIK NEGARA</p>
          <p className="m-0">SELAIN TANAH DAN/ATAU BANGUNAN</p>
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
            <span contentEditable suppressContentEditableWarning className="doc-editable">Pembina Muda Tk.I / IV b</span>
            <span>Jabatan</span>
            <span className="colon text-center">:</span>
            <span contentEditable suppressContentEditableWarning className="doc-editable">Kepala Balai KSDA Kalimantan Timur</span>
          </div>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Dengan ini menerangkan bahwa :
          </p>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Fotokopi dokumen kepemilikan Kendaraan Bermotor atau dokumen lain yang setara dengan bukti kepemilikan :
          </p>

          <table className="kebenaran-table mt-2">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>No.</th>
                <th style={{ width: "20%" }}>Nomor Dokumen Kepemilikan</th>
                <th style={{ width: "20%" }}>Merk/Tipe/Jenis</th>
                <th style={{ width: "16%" }}>Nomor Mesin</th>
                <th style={{ width: "20%" }}>Nomor Rangka</th>
                <th style={{ width: "16%" }}>Nomor Polisi</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>
                    Belum ada aset terpilih.
                  </td>
                </tr>
              ) : (
                assets.map((asset, index) => (
                  <tr key={asset.id}>
                    <td>{index + 1}.</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{getOwnershipDocumentNumber(asset)}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.merk_tipe || ""}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_mesin || ""}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_rangka || ""}</td>
                    <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_polisi || ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Adalah benar sesuai dengan aslinya.
          </p>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Demikian keterangan ini kami buat dengan sebenar-benarnya dalam rangka permohonan Persetujuan Pemindahtanganan BMN dengan Penjualan.
          </p>
        </div>

        <div className="signature mt-6 ml-auto w-80">
          <p className="m-0">Samarinda, {formatDateLong(today)}</p>
          <p className="m-0">Kepala Balai,</p>
          <div className="ttd-placeholder mt-8 box-border h-28 pt-10 pl-[1.35cm] text-zinc-400"></div>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0 mt-8">{kepalaBalai.nama}</p>
          <p contentEditable suppressContentEditableWarning className="doc-editable m-0">NIP. {kepalaBalai.nip}</p>
        </div>
      </article>
    </div>
  );
}
