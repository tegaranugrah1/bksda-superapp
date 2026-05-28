"use client";

import { toast } from "sonner";
import type { AuctionAsset } from "../_lib/auction-helpers";
import {
  formatPlainRupiah,
  formatDateLong,
  getSpelledDate,
} from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";
import type { PemeriksaAnggota } from "../_lib/pemeriksa-defaults";

interface BaPemeriksaanDocumentProps {
  number: string;
  kap: string;
  pemeriksaList: PemeriksaAnggota[];
  stNumber: string;
  stTanggal: string;
  assets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
}

interface BaLampiranPage {
  assets: AuctionAsset[];
  startIndex: number;
  includeMeta: boolean;
  includeSignature: boolean;
}

function buildNomorText(number: string, kap: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `BA.${number.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

function buildBaLampiranPages(assets: AuctionAsset[]): BaLampiranPage[] {
  const singlePageWithSignatureLimit = 6;
  const firstPageLimit = 12;
  const continuationPageLimit = 12;
  const lastPageLimit = 6;
  const lastPageUnitLimit = 9;
  const pages: BaLampiranPage[] = [];

  const pushPage = (
    pageAssets: AuctionAsset[],
    startIndex: number,
    includeMeta: boolean,
  ) => {
    pages.push({
      assets: pageAssets,
      startIndex,
      includeMeta,
      includeSignature: false,
    });
  };

  const estimateRowUnits = (asset: AuctionAsset) => {
    const maxLineCount = Math.max(
      Math.ceil((asset.nama_barang || "").length / 18),
      Math.ceil((asset.merk_tipe || "").length / 16),
      Math.ceil((asset.no_polisi || "").length / 10),
      Math.ceil((asset.kondisi || "").length / 14),
      1,
    );

    return Math.min(4, maxLineCount);
  };
  const getFinalPageUnits = (pageAssets: AuctionAsset[]) =>
    pageAssets.reduce((total, asset) => total + estimateRowUnits(asset), 0);

  if (
    assets.length <= singlePageWithSignatureLimit &&
    getFinalPageUnits(assets) <= lastPageUnitLimit
  ) {
    pushPage(assets, 0, true);
  } else {
    const lastPageOptions = Array.from(
      { length: Math.min(lastPageLimit, assets.length - 1) },
      (_, index) => index + 1,
    );
    const getNonSignatureStats = (count: number) => {
      if (count <= firstPageLimit) {
        return { pageCount: 1, lastChunkSize: count };
      }

      const remainingAfterFirst = count - firstPageLimit;
      return {
        pageCount: 1 + Math.ceil(remainingAfterFirst / continuationPageLimit),
        lastChunkSize: remainingAfterFirst % continuationPageLimit || continuationPageLimit,
      };
    };
    const [safeLastPageSize = Math.min(lastPageLimit, assets.length - 1)] =
      lastPageOptions.sort((a, b) => {
        const finalAssetsA = assets.slice(assets.length - a);
        const finalAssetsB = assets.slice(assets.length - b);
        const fitsA = getFinalPageUnits(finalAssetsA) <= lastPageUnitLimit;
        const fitsB = getFinalPageUnits(finalAssetsB) <= lastPageUnitLimit;
        const statsA = getNonSignatureStats(assets.length - a);
        const statsB = getNonSignatureStats(assets.length - b);
        const hasSingleNonSignatureA = statsA.lastChunkSize === 1;
        const hasSingleNonSignatureB = statsB.lastChunkSize === 1;

        if (fitsA !== fitsB) return fitsA ? -1 : 1;
        if (statsA.pageCount !== statsB.pageCount) return statsA.pageCount - statsB.pageCount;
        if (hasSingleNonSignatureA !== hasSingleNonSignatureB) {
          return hasSingleNonSignatureA ? 1 : -1;
        }
        return a - b;
      });
    const lastStartIndex = assets.length - safeLastPageSize;

    let cursor = 0;
    while (cursor < lastStartIndex) {
      const limit = cursor === 0 ? firstPageLimit : continuationPageLimit;
      const pageSize = Math.min(limit, lastStartIndex - cursor);
      pushPage(assets.slice(cursor, cursor + pageSize), cursor, cursor === 0);
      cursor += pageSize;
    }

    pushPage(assets.slice(lastStartIndex), lastStartIndex, false);
  }

  if (pages.length === 0) {
    pushPage([], 0, true);
  }

  pages[pages.length - 1].includeSignature = true;

  return pages;
}

export function handlePrintBaPemeriksaan() {
  const printContent = document.getElementById("ba-pemeriksaan-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen Berita Acara Pemeriksaan untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Berita Acara Pemeriksaan BMN</title>
        <style>
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
          .ba-pem-ttd-kepala .kepala-name-block { margin-top: 24mm; }
          .ba-pem-ttd-kepala .kepala-name-block p { line-height: 1.25; }
          .ba-pem-ttd-kepala .kepala-name-block .name { font-weight: bold; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function BaPemeriksaanDocument({
  number,
  kap,
  pemeriksaList,
  stNumber,
  stTanggal,
  assets,
  kepalaBalai,
}: BaPemeriksaanDocumentProps) {
  const today = new Date();
  const nomorText = buildNomorText(number, kap, today);
  const { day, dateText, month, yearText } = getSpelledDate(today);
  const tanggalLong = formatDateLong(today);
  const lampiranPages = buildBaLampiranPages(assets);

  const half = Math.ceil(pemeriksaList.length / 2);
  const colA = pemeriksaList.slice(0, half);
  const colB = pemeriksaList.slice(half);

  return (
    <div id="ba-pemeriksaan-print-root" className="ba-pemeriksaan-print-root">
      <style jsx global>{`
        .ba-pemeriksaan-print-root .doc-editable { outline: none; border-bottom: 1px dashed transparent; transition: border-bottom-color 0.15s ease; }
        .ba-pemeriksaan-print-root .doc-editable:hover { border-bottom-color: #94a3b8; }
        .ba-pemeriksaan-print-root .doc-editable:focus { border-bottom-color: #64748b; }
        .ba-pemeriksaan-print-root .doc-page { page: ba-pem-portrait; }
        .ba-pemeriksaan-print-root .ba-pem-page-landscape { width: 297mm !important; max-width: 297mm !important; padding: 10mm 16mm 20mm !important; page: ba-pem-landscape; page-break-before: always; break-before: page; }
        .ba-pemeriksaan-print-root .ba-pem-lamp-root { width: 258mm; margin: 0 auto; font-family: 'Bookman Old Style', Georgia, serif; }
        .ba-pemeriksaan-print-root .ba-pem-lamp-meta { width: 100%; font-size: 10.5pt; line-height: 1.35; }
        .ba-pemeriksaan-print-root .ba-pem-lamp-meta .meta-row { display: grid; grid-template-columns: 22mm 5mm minmax(0, 1fr); }
        .ba-pemeriksaan-print-root .ba-pem-lamp-meta .meta-row .colon { text-align: center; }
        .ba-pemeriksaan-print-root .ba-pem-lamp-meta .lampiran-title { white-space: nowrap; }
        .ba-pemeriksaan-print-root table.ba-pem-table { border-collapse: collapse; width: 100%; font-size: 8.5pt; text-align: center; margin-top: 0.75rem; table-layout: fixed; }
        .ba-pemeriksaan-print-root table.ba-pem-table th,
        .ba-pemeriksaan-print-root table.ba-pem-table td { border: 1px solid #000; padding: 4px 3px; vertical-align: middle; overflow-wrap: anywhere; }
        .ba-pemeriksaan-print-root table.ba-pem-table td.doc-editable { border: 1px solid #000 !important; }
        .ba-pemeriksaan-print-root table.ba-pem-table tbody tr:last-child td { border-bottom: 1px solid #000 !important; }
        .ba-pemeriksaan-print-root .ba-pem-column-number-row th { font-weight: normal; }
        .ba-pemeriksaan-print-root .ba-pem-ttd-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16mm; margin-top: 9mm; }
        .ba-pemeriksaan-print-root .ba-pem-pemeriksa-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 9mm; column-gap: 12mm; margin-top: 24mm; }
        .ba-pemeriksaan-print-root .ba-pem-ttd-kepala .kepala-name-block { margin-top: 24mm; }
        @media print {
          @page ba-pem-portrait { size: A4 portrait; margin: 0 0 28mm 0; }
          @page ba-pem-landscape { size: A4 landscape; margin: 0 0 20mm 0; }
          body * { visibility: hidden; }
          .ba-pemeriksaan-print-root, .ba-pemeriksaan-print-root * { visibility: visible; }
          .ba-pemeriksaan-print-root {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.5; margin: 0; padding: 0;
          }
          .doc-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 0; box-shadow: none !important; page: ba-pem-portrait; }
          .doc-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .doc-header img { max-width: 196mm !important; }
          .doc-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .doc-editable { border-bottom: none !important; }
          .pemeriksa-item { break-inside: avoid; page-break-inside: avoid; }
          .ba-pem-page-landscape { box-shadow: none !important; padding: 10mm 16mm 20mm !important; page: ba-pem-landscape; page-break-before: always; break-before: page; }
          table.ba-pem-table tr { break-inside: avoid; page-break-inside: avoid; }
          .ba-pem-ttd-grid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <article
        className="doc-page mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.5" }}
      >
        <div className="doc-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-terbaru.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="doc-title mt-2 text-center font-bold leading-snug">
          <p className="m-0">BERITA ACARA PEMERIKSAAN BARANG MILIK NEGARA</p>
          <p className="m-0">BERUPA ALAT ANGKUTAN BERMOTOR</p>
          <p className="m-0 font-normal">Nomor : {nomorText}</p>
        </div>

        <div className="doc-body doc-text-block mx-auto mt-4 w-[166mm] space-y-3 text-justify">
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Pada hari ini {day} tanggal {dateText} bulan {month} tahun {yearText}, kami yang bertanda tangan di bawah ini :
          </p>

          <div className="pemeriksa-list">
            {pemeriksaList.length === 0 ? (
              <p className="text-center" style={{ color: "#94a3b8" }}>
                Belum ada pemeriksa. Silakan tambah pemeriksa.
              </p>
            ) : (
              pemeriksaList.map((p, index) => (
                <div className="pemeriksa-item grid grid-cols-[8mm_minmax(0,1fr)]" key={p.id}>
                  <span>{index + 1}.</span>
                  <div>
                    <div className="pemeriksa-row grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
                      <span>Nama</span>
                      <span className="colon text-center">:</span>
                      <span>{p.nama}</span>
                    </div>
                    <div className="pemeriksa-row grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
                      <span>NIP</span>
                      <span className="colon text-center">:</span>
                      <span>{p.nip}</span>
                    </div>
                    <div className="pemeriksa-row grid grid-cols-[28mm_5mm_minmax(0,1fr)]">
                      <span>Jabatan</span>
                      <span className="colon text-center">:</span>
                      <span>{p.jabatan}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Telah melaksanakan tugas pemeriksaan secara administrasi, teknis tentang kondisi dan nilai taksiran Barang Milik Negara berupa Alat Angkutan Bermotor yang berada pada Balai Konservasi Sumber Daya Alam Kalimantan Timur sesuai dengan Surat Tugas Nomor : {stNumber || "____"}, tanggal {stTanggal || "____"} sebagaimana terlampir.
          </p>
          <p contentEditable suppressContentEditableWarning className="doc-editable">
            Demikian Berita Acara Pemeriksaan ini dibuat dengan sebenarnya, ditandatangani oleh masing-masing pemeriksa.
          </p>
        </div>
      </article>

      {lampiranPages.map((page, pageIndex) => (
        <article
          className="ba-pem-page-landscape mx-auto max-w-[297mm] bg-white text-black shadow-xl ring-1 ring-zinc-200"
          key={`ba-pem-lampiran-${pageIndex}`}
          style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.4" }}
        >
          <div className="ba-pem-lamp-root">
            {page.includeMeta && (
              <div className="ba-pem-lamp-meta">
                <div className="meta-row">
                  <span>Lampiran</span>
                  <span className="colon">:</span>
                  <span contentEditable suppressContentEditableWarning className="doc-editable lampiran-title">
                    PEMERIKSAAN BARANG MILIK NEGARA BERUPA ALAT ANGKUTAN BERMOTOR
                  </span>
                </div>
                <div className="meta-row">
                  <span>Nomor</span>
                  <span className="colon">:</span>
                  <span contentEditable suppressContentEditableWarning className="doc-editable">{nomorText}</span>
                </div>
                <div className="meta-row">
                  <span>Tanggal</span>
                  <span className="colon">:</span>
                  <span contentEditable suppressContentEditableWarning className="doc-editable">{tanggalLong}</span>
                </div>
              </div>
            )}

            <table className="ba-pem-table">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                {pageIndex > 0 && (
                  <tr className="ba-pem-column-number-row">
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                    <th>4</th>
                    <th>5</th>
                    <th>6</th>
                    <th>7</th>
                    <th>8</th>
                    <th>9</th>
                    <th>10</th>
                    <th>11</th>
                  </tr>
                )}
                <tr>
                  <th>No</th>
                  <th>Kode Barang</th>
                  <th>NUP</th>
                  <th>Nama Barang</th>
                  <th>Merk / Type</th>
                  <th>No Polisi</th>
                  <th>Tahun Perolehan</th>
                  <th>Nilai Perolehan (Rp)</th>
                  <th>Nilai Buku</th>
                  <th>Nilai Taksiran (Rp)</th>
                  <th>Kondisi</th>
                </tr>
              </thead>
              <tbody>
                {page.assets.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "12px", color: "#94a3b8" }}>
                      Belum ada aset terpilih.
                    </td>
                  </tr>
                ) : (
                  page.assets.map((asset, index) => (
                    <tr key={asset.id}>
                      <td>{page.startIndex + index + 1}.</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable" style={{ wordBreak: "break-all" }}>{asset.kode_barang}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.nup}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.nama_barang}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.merk_tipe || ""}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.no_polisi || ""}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.tahun_perolehan ?? ""}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable" style={{ textAlign: "right" }}>{asset.nilai_perolehan ? formatPlainRupiah(asset.nilai_perolehan) : ""}</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable" style={{ textAlign: "center" }}>-</td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable" style={{ textAlign: "right" }}></td>
                      <td contentEditable suppressContentEditableWarning className="doc-editable">{asset.kondisi}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {page.includeSignature && (
              <div className="ba-pem-ttd-grid">
                <div className="ba-pem-ttd-pelaksana">
                  <p>Samarinda, {tanggalLong}</p>
                  <p>Pelaksana Kegiatan,</p>

                  <div className="ba-pem-pemeriksa-grid">
                    {colA.map((p, index) => (
                      <div className="ba-pem-pemeriksa-cell" key={p.id}>
                        <p className="name">{index + 1}. {p.nama}</p>
                        <p style={{ paddingLeft: "5mm" }}>NIP. {p.nip}</p>
                      </div>
                    ))}
                    {colB.map((p, index) => (
                      <div className="ba-pem-pemeriksa-cell" key={p.id}>
                        <p className="name">{index + 1 + colA.length}. {p.nama}</p>
                        <p style={{ paddingLeft: "5mm" }}>NIP. {p.nip}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ba-pem-ttd-kepala">
                  <p>Mengetahui,</p>
                  <p>Kepala Balai,</p>

                  <div className="kepala-name-block">
                    <p className="name">{kepalaBalai.nama}</p>
                    <p>NIP. {kepalaBalai.nip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
