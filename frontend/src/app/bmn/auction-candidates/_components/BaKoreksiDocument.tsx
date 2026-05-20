"use client";

import { toast } from "sonner";
import type { AuctionAsset } from "../_lib/auction-helpers";
import {
  formatPlainRupiah,
  formatDateLong,
  getSpelledDate,
} from "../_lib/auction-helpers";

export function handlePrintBa(orderedSelectedAssets: AuctionAsset[]) {
  if (orderedSelectedAssets.length === 0) {
    toast.error("Tidak ada aset terpilih untuk dicetak.");
    return;
  }
  const printContent = document.getElementById("ba-koreksi-print-root");
  if (!printContent) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>BA Koreksi Kondisi BMN</title>
        <style>
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
            page-break-before: always;
            break-before: page;
          }
          .ba-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
          .ba-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; }
          .ba-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
          .ba-body p { text-align: justify; text-justify: inter-word; }
          .ba-lampiran-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .ba-title { margin-top: 0.75rem; text-align: center; font-weight: 700; }
          .ba-title p { margin: 0; line-height: 1.2; }
          .ba-text-block { margin-top: 1rem; }
          .ba-text-block > * + * { margin-top: 1.25rem; }
          table { border-collapse: collapse; }
          .identity-table td { padding: 0.125rem 0; }
          .identity-table .label-cell { width: 24mm; }
          .identity-table .colon-cell { width: 6mm; text-align: center; }
          .ba-asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; break-inside: auto; page-break-inside: auto; }
          .ba-asset-table thead { display: table-header-group; }
          .ba-asset-table th, .ba-asset-table td { border: 1px solid #000; padding: 0.25rem; }
          .ba-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
          .ba-asset-table td.text-left { text-align: left; }
          .ba-asset-table td.text-right { text-align: right; }
          .ba-section-title { font-size: 10pt; font-weight: 600; margin-bottom: 0.5rem; }
          .attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .attachment-meta .meta-label { white-space: nowrap; }
          .attachment-meta .meta-colon { text-align: center; }
          .attachment-meta .meta-value { min-width: 0; }
          .attachment-meta .lampiran-value { display: inline-block; max-width: 80mm; }
          .signature { width: 20rem; margin-left: auto; break-inside: auto; page-break-inside: auto; }
          .attachment-signature { margin-top: 3rem; }
          .signature p { margin: 0; padding: 0; line-height: 1.15; }
          .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; }
          .ba-editable { outline: none; border-bottom: none !important; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssetConditionTable({ assets, mode }: { assets: AuctionAsset[]; mode: "before" | "after" }) {
  return (
    <table className="ba-asset-table mt-4 w-full border-collapse text-center" style={{ fontSize: "8.5pt" }}>
      <thead>
        <tr>
          <th rowSpan={2} className="border border-black px-1 py-1">No.</th>
          <th rowSpan={2} className="border border-black px-1 py-1">Kode Barang</th>
          <th rowSpan={2} className="border border-black px-1 py-1">NUP</th>
          <th rowSpan={2} className="border border-black px-1 py-1">Nama Barang</th>
          <th rowSpan={2} className="border border-black px-1 py-1">Satuan</th>
          <th rowSpan={2} className="border border-black px-1 py-1">Nilai Perolehan (Rp)</th>
          <th colSpan={3} className="border border-black px-1 py-1">Kondisi</th>
        </tr>
        <tr>
          <th className="border border-black px-1 py-1">Baik</th>
          <th className="border border-black px-1 py-1">Rusak Ringan</th>
          <th className="border border-black px-1 py-1">Rusak Berat</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset, index) => (
          <tr key={`${mode}-${asset.id}`}>
            <td className="border border-black px-1 py-1">{index + 1}.</td>
            <td className="border border-black px-1 py-1">{asset.kode_barang}</td>
            <td className="border border-black px-1 py-1">{asset.nup}</td>
            <td className="border border-black px-1 py-1 text-left">{asset.nama_barang}</td>
            <td className="border border-black px-1 py-1">{asset.satuan || "Unit"}</td>
            <td className="border border-black px-1 py-1 text-right">{formatPlainRupiah(asset.nilai_perolehan)}</td>
            <td className="border border-black px-1 py-1">{mode === "before" ? 0 : 0}</td>
            <td className="border border-black px-1 py-1">{mode === "before" ? 1 : 0}</td>
            <td className="border border-black px-1 py-1">{mode === "after" ? 1 : 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CorrectionDocument({ assets, baNumber, baKap }: { assets: AuctionAsset[]; baNumber: string; baKap: string }) {
  const today = new Date();
  const { day, dateText, month, yearText } = getSpelledDate(today);
  const monthNum = String(today.getMonth() + 1).padStart(2, "0");
  const baNumberText = `BA.${baNumber.trim() || "____"}/K.18/TU/${baKap}/B/${monthNum}/${today.getFullYear()}`;
  const datePhrase = `${dateText} bulan ${month} tahun ${yearText}`;

  return (
    <div id="ba-koreksi-print-root" className="ba-print-root space-y-6">
      <style jsx global>{`
        .ba-editable {
          outline: none;
          border-bottom: 1px dashed transparent;
          transition: border-bottom-color 0.15s ease;
        }
        .ba-editable:hover {
          border-bottom-color: #94a3b8;
        }
        .ba-editable:focus {
          border-bottom-color: #64748b;
        }
        @media print {
          @page { size: A4; margin: 0 0 28mm 0; }
          body * { visibility: hidden; }
          .ba-print-root, .ba-print-root * { visibility: visible; }
          .ba-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt;
            line-height: 1.25;
            margin: 0;
            padding: 0;
          }
          .ba-page {
            width: 210mm;
            margin: 0 auto;
            padding: 5mm 20mm 0;
            box-shadow: none !important;
            page-break-after: always;
          }
          .ba-page:last-child { page-break-after: auto; }
          .ba-lampiran {
            width: 210mm;
            margin: 0 auto;
            padding: 5mm 20mm 0;
            box-shadow: none !important;
            page-break-before: always;
            break-before: page;
          }
          .ba-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .ba-header img { max-width: 196mm !important; }
          .ba-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
          .ba-body p { text-align: justify; text-justify: inter-word; }
          .ba-lampiran-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .attachment-meta .meta-label { white-space: nowrap; }
          .attachment-meta .meta-colon { text-align: center; }
          .attachment-meta .meta-value { min-width: 0; }
          .attachment-meta .lampiran-value { display: inline-block; max-width: 80mm; }
          .ba-no-print { display: none !important; }
          .ba-editable { border-bottom: none !important; }
          .ba-asset-table { break-inside: auto; page-break-inside: auto; }
          .ba-asset-table thead { display: table-header-group; }
          .ba-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* ── Article 1: KOP + Body + Signature (page 1) ── */}
      <article
        className="ba-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.25" }}
      >
        <DocumentHeader />
        <div className="ba-title mt-1 text-center font-bold leading-tight">
          <p className="m-0">BERITA ACARA</p>
          <p className="m-0">KOREKSI PERUBAHAN KONDISI BARANG MILIK NEGARA</p>
          <p className="m-0 font-normal">Nomor : {baNumberText}</p>
        </div>
        <div className="ba-body ba-text-block mx-auto mt-4 w-[166mm] space-y-5 text-justify">
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable"
          >
            Pada hari {day} tanggal {datePhrase}, bertempat di Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur, kami penanggungjawab Unit Penatausahaan Kuasa Pengguna Barang pada Balai Konservasi Sumber Daya Alam Kalimantan Timur :
          </p>
          <table className="identity-table">
            <tbody>
              <tr>
                <td className="label-cell w-24 py-0.5">Nama</td>
                <td className="colon-cell w-6">:</td>
                <td>
                  <span
                    contentEditable="true"
                    suppressContentEditableWarning
                    className="ba-editable"
                  >
                    M. ARI WIBAWANTO, S.Hut., M.Sc.
                  </span>
                </td>
              </tr>
              <tr>
                <td className="label-cell py-0.5">NIP</td>
                <td className="colon-cell">:</td>
                <td>
                  <span
                    contentEditable="true"
                    suppressContentEditableWarning
                    className="ba-editable"
                  >
                    19740514 199903 1 001
                  </span>
                </td>
              </tr>
              <tr>
                <td className="label-cell py-0.5">Jabatan</td>
                <td className="colon-cell">:</td>
                <td>
                  <span
                    contentEditable="true"
                    suppressContentEditableWarning
                    className="ba-editable"
                  >
                    Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable"
          >
            Menyatakan bahwa telah dilakukan koreksi perubahan kondisi dengan cara melakukan koreksi terhadap kondisi Barang Milik Negara
            pada Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur pada tanggal {datePhrase} berdasarkan Penilaian Barang Milik Negara
            dengan hasil (rincian terlampir).
          </p>
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable"
          >
            Demikian Berita Acara ini dibuat sebagai bahan koreksi perubahan kondisi Barang Milik Negara Semester Satu tahun {yearText},
            dan apabila dikemudian hari terdapat kekeliruan akan dilakukan perbaikan sebagaimana mestinya.
          </p>
        </div>
        <div className="signature mt-20 ml-auto w-80">
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable m-0"
          >
            Unit Penatausaha Kuasa Pengguna Barang
          </p>
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable m-0"
          >
            Kepala Balai,
          </p>
          <div className="ttd-placeholder mt-4 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable m-0"
          >
            M. ARI WIBAWANTO, S.Hut., M.Sc.
          </p>
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable m-0"
          >
            NIP. 19740514 199903 1 001
          </p>
        </div>
      </article>

      {/* ── Article 2: Lampiran (ONE article, browser paginates naturally) ── */}
      <article
        className="ba-lampiran mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.25" }}
      >
        <div className="ba-lampiran-body mx-auto w-[166mm]">
          {/* Meta header */}
          <div className="attachment-meta ml-auto w-[109mm]">
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Lampiran</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0">
                <span className="lampiran-value inline-block max-w-[80mm]">Berita Acara Koreksi Perubahan Kondisi BMN</span>
              </span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Nomor</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0 whitespace-nowrap">{baNumberText}</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Tanggal</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0">{formatDateLong(today)}</span>
            </div>
          </div>

          {/* I. Sebelum */}
          <p className="ba-section-title mt-6 mb-2 text-[12px] font-semibold">I. Sebelum</p>
          <AssetConditionTable assets={assets} mode="before" />

          {/* II. Sesudah */}
          <p className="ba-section-title mt-6 mb-2 text-[12px] font-semibold">II. Sesudah</p>
          <AssetConditionTable assets={assets} mode="after" />

          {/* Signature block */}
          <div className="signature attachment-signature mt-12 ml-auto w-80">
            <p className="m-0">Kepala Balai,</p>
            <div className="ttd-placeholder mt-4 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="m-0">M. ARI WIBAWANTO, S.Hut., M.Sc.</p>
            <p className="m-0">NIP. 19740514 199903 1 001</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function DocumentHeader() {
  return (
    <div className="ba-header -mx-18 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/header-terbaru.png" alt="Kop Surat" className="mx-auto h-auto w-full max-w-[196mm]" />
    </div>
  );
}
