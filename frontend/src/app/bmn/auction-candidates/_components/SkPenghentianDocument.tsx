import { useMemo, useRef, useLayoutEffect, useState } from "react";
import { toast } from "sonner";
import type { AuctionAsset, AttachmentPage } from "../_lib/auction-helpers";
import {
  formatPlainRupiah,
  formatDateLong,
  parseDocDate,
} from "../_lib/auction-helpers";
import { AssetLampiranLandscapeTable, getAssetSuratStatus } from "./AssetLampiranLandscapeTable";
import { runSkPagination } from "../_lib/sk-print";
import type {
  SkBuilderItem,
  SkKepalaBalai,
  SkMemutuskan,
} from "../_lib/sk-defaults";

interface SkPenghentianDocumentProps {
  assets: AuctionAsset[];
  skNumber: string;
  skKap: string;
  date?: string;
  menimbang: SkBuilderItem[];
  mengingat: SkBuilderItem[];
  memutuskan: SkMemutuskan;
  kepalaBalai: SkKepalaBalai;
  tembusan: SkBuilderItem[];
}

export function handlePrintSk(orderedSelectedAssets: AuctionAsset[], _skNumber: string) {
  void _skNumber; // kept for API contract; skNumber is already rendered in the DOM
  if (orderedSelectedAssets.length === 0) {
    toast.error("Tidak ada aset terpilih untuk dicetak.");
    return;
  }
  const printContent = document.getElementById("sk-penghentian-print-root");
  if (!printContent) return;
  const clone = printContent.cloneNode(true) as HTMLElement;
  const measurementNode = clone.querySelector(".sk-measurement");
  if (measurementNode) {
    measurementNode.remove();
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>SK Penghentian Penggunaan BMN</title>
        <style>
          @page { size: A4; margin: 0; }
          @page sk-main { size: A4; margin: 0; }
          @page sk-main:first { size: A4; margin: 0; }
          @page sk-attachment { size: A4 landscape; margin: 14mm 0 20mm 0; }
          .sk-measurement, .sk-measurement * { display: none !important; visibility: hidden !important; }
          .sk-no-print { display: none !important; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.4;
          }
          p { margin: 0; padding: 0; }
          .sk-page {
            width: 210mm;
            margin: 0 auto; padding: 5mm 20mm 0;
          }
          .sk-main-document { page: sk-main; position: relative; }
          .sk-print-root .sk-page.sk-main-document.sk-main-paginated {
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 5mm 20mm 28mm !important;
            overflow: hidden !important;
            position: relative !important;
            box-shadow: none !important;
          }
          .sk-print-root .sk-page.sk-main-document.sk-main-paginated.sk-main-continuation-page {
            padding-top: 18mm !important;
          }
          .sk-print-root .sk-main-document.sk-main-page-break {
            page-break-after: always;
            break-after: page;
          }
          .sk-main-flow { width: 100%; }
          .sk-main-paginated .sk-paginated-field-section + .sk-paginated-field-section { margin-top: 0 !important; }
          .sk-main-paginated .sk-paginated-field-section.sk-section-start { margin-top: 0.75rem !important; }
          .sk-attachment-document {
            page: sk-attachment;
            page-break-before: always;
            break-before: page;
            width: 297mm !important;
            max-width: 297mm !important;
            padding: 10mm 16mm 20mm !important;
          }
          .sk-attachment-page {
            width: 258mm;
            margin: 0 auto;
            page: sk-attachment;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .sk-attachment-page-continuation {
            page-break-before: always;
            break-before: page;
            padding-top: 12mm !important;
          }
          .sk-continuation-spacer {
            height: 8mm !important;
            display: block;
          }
          .sk-attachment-document .sk-body {
            width: 258mm !important;
            margin-left: auto;
            margin-right: auto;
          }
          .sk-page-ttd { padding-bottom: 0; }
          article { margin: 0; }
          .sk-page-break { page-break-after: always; break-after: always; }
          /* KOP */
          .sk-kop {
            margin-top: -5mm; margin-left: -16mm; margin-right: -16mm;
            margin-bottom: 6px; text-align: center;
          }
          .sk-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
          /* Judul SK — halaman 1 */
          .sk-title {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 10px; text-align: center; font-weight: bold; line-height: 1.3;
          }
          .sk-title-nomor { font-weight: normal; }
          .sk-title-tentang { margin-top: 10px; }
          /* Sub-judul (DENGAN RAHMAT, KEPALA BALAI) */
          .sk-subtitle {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 16px;
          }
          .sk-subtitle > p { text-align: center; font-weight: bold; }
          .sk-subtitle > p + p { margin-top: 6px; }
          /* Tabel Menimbang/Mengingat/Memutuskan */
          .sk-body { width: 166mm; margin-left: auto; margin-right: auto; }
          table { border-collapse: collapse; width: 100%; }
          td { vertical-align: top; padding: 0; }

          /* Menimbang/Mengingat: parent boleh paginate, item anak tetap utuh */
          .sk-field-section {
            display: grid;
            grid-template-columns: 28mm 8mm minmax(0, 1fr);
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .sk-field-section + .sk-field-section { margin-top: 0.75rem; }
          .sk-field-label, .sk-field-colon { padding: 0; }
          .sk-field-colon { text-align: center; }
          .sk-mengingat-list {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .sk-mengingat-item {
            display: grid;
            grid-template-columns: 9mm minmax(0, 1fr);
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding-top: 0.35rem;
          }
          .sk-mengingat-item:first-child { padding-top: 0; }
          .sk-mengingat-text { text-align: justify; }
          /* Halaman 2 */
          .sk-page2-body { width: 166mm; margin-left: auto; margin-right: auto; padding-top: 16mm; }
          .sk-memutuskan { text-align: center; font-weight: bold; margin-bottom: 12px; }

          /* TTD block */
          .sk-ttd { width: 20rem; margin-left: auto; margin-top: 3rem; }
          .sk-ttd, .sk-ttd p { font-weight: normal !important; text-align: left !important; }
          .sk-ttd p { margin: 0; padding: 0; line-height: 1.3; }
          .sk-ttd-meta { display: grid !important; grid-template-columns: max-content auto 1fr; column-gap: 0.4rem; line-height: 1.3; }
          .sk-ttd-meta span { font-weight: normal !important; text-align: left !important; }
          .sk-ketiga-group { break-inside: avoid !important; page-break-inside: avoid !important; }
          .sk-signature-name { font-weight: normal !important; }
          .ttd-placeholder { height: 84px; color: #94a3b8; font-weight: normal !important; text-align: left !important; display: flex !important; align-items: center !important; padding-top: 0px !important; padding-left: 1.1cm !important; margin-top: 0.5rem; margin-bottom: 0.5rem; }
          .sk-continuation-word { position: absolute; right: 23mm; bottom: 31mm; width: 163mm; height: 0; line-height: 11pt; overflow: visible; white-space: nowrap; text-align: right !important; margin: 0; padding: 0; font-weight: normal !important; font-size: 11pt; z-index: 20; }
          /* Tembusan */
          .sk-tembusan { margin-top: 2rem; }
          .sk-tembusan, .sk-tembusan p { font-weight: normal !important; text-align: left !important; }
          .sk-tembusan p { margin: 0; padding: 0; line-height: 1.5; }
          /* Halaman 3 lampiran */
          .sk-attachment-meta { width: 128mm; margin-left: auto; text-align: left; }
          .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .meta-label { white-space: nowrap; }
          .meta-colon { text-align: center; }
          .sk-lampiran-title { text-align: center; font-weight: bold; line-height: 1.3; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .sk-asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; }
          .sk-asset-table th, .sk-asset-table td { border: 1px solid #000; padding: 0.25rem; }
          .sk-asset-table thead { display: table-header-group; }
          .sk-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
          .sk-column-number-row th { font-weight: normal; }
          .sk-asset-table td.text-left { text-align: left; }
          .sk-asset-table td.text-right { text-align: right; }
          .sk-lampiran-ttd { width: 20rem; margin-left: auto; margin-top: 1rem; break-inside: avoid; page-break-inside: avoid; }
          .sk-lampiran-ttd p { margin: 0; padding: 0; line-height: 1.15; }
          .sk-lampiran-ttd .ttd-placeholder { height: 84px !important; margin-top: 0.5rem !important; margin-bottom: 0.5rem !important; }
        </style>
      </head>
      <body>${clone.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  // Wait for full render, then inject continuation words at page breaks, then print
  setTimeout(
    () =>
      runSkPagination(printWindow, {
        prefix: "sk",
        sectionStartMarginTop: "0.75rem",
        decisionRowLabels: ["KESATU.....", "KEDUA....."],
        finalGroupClass: "sk-ketiga-group",
        finalGroupLabel: "KETIGA.....",
      }),
    600,
  );
}

function getOuterHeight(element: Element | null) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const marginTop = Number.parseFloat(styles.marginTop) || 0;
  const marginBottom = Number.parseFloat(styles.marginBottom) || 0;
  return rect.height + marginTop + marginBottom;
}

function buildFallbackLampiranPages(assets: AuctionAsset[]): AttachmentPage[] {
  const singlePageLimit = 10;
  const firstPageLimit = 14;
  const continuationLimit = 18;
  const lastPageMaxLimit = 10;
  const pages: AttachmentPage[] = [];

  const pushPage = (pageAssets: AuctionAsset[], startIndex: number, includeMeta: boolean) => {
    pages.push({
      assets: pageAssets,
      startIndex,
      showColumnNumbers: !includeMeta,
      includeMeta,
      includeTotal: false,
      includeSignature: false,
    });
  };

  if (assets.length <= singlePageLimit) {
    pushPage(assets, 0, true);
  } else if (assets.length <= firstPageLimit + lastPageMaxLimit) {
    const firstChunkSize = Math.min(firstPageLimit, assets.length - 1);
    pushPage(assets.slice(0, firstChunkSize), 0, true);
    pushPage(assets.slice(firstChunkSize), firstChunkSize, false);
  } else {
    const firstChunkSize = firstPageLimit;
    pushPage(assets.slice(0, firstChunkSize), 0, true);

    let cursor = firstChunkSize;
    while (cursor < assets.length) {
      const remaining = assets.length - cursor;

      if (remaining <= lastPageMaxLimit) {
        pushPage(assets.slice(cursor), cursor, false);
        cursor = assets.length;
      } else {
        const chunkSize = Math.min(continuationLimit, remaining - 1);
        pushPage(assets.slice(cursor, cursor + chunkSize), cursor, false);
        cursor += chunkSize;
      }
    }
  }

  if (pages.length === 0) {
    pushPage([], 0, true);
  }

  const lastPage = pages[pages.length - 1];
  lastPage.includeTotal = true;
  lastPage.includeSignature = true;

  return pages;
}

function buildMeasuredSkAttachmentPages({
  assets,
  rowHeights,
  metaHeight,
  headerHeight,
  totalHeight,
  signatureHeight,
  pageHeight,
}: {
  assets: AuctionAsset[];
  rowHeights: number[];
  metaHeight: number;
  headerHeight: number;
  totalHeight: number;
  signatureHeight: number;
  pageHeight: number;
}): AttachmentPage[] {
  if (assets.length === 0) return [];

  const pages: AttachmentPage[] = [];
  let startIndex = 0;

  const getRowHeight = (idx: number) => rowHeights[idx] || 32;

  // Real physical printable height for sk-body on A4 Landscape with 14mm/20mm margins
  const effectivePageHeight = 550;

  while (startIndex < assets.length) {
    const isFirstPage = pages.length === 0;
    const includeMeta = isFirstPage;
    const topMargin = isFirstPage ? metaHeight : 24;
    const availableHeight = effectivePageHeight - topMargin - headerHeight;

    let currentUsedHeight = 0;
    let count = 0;
    const remainingCount = assets.length - startIndex;

    let totalRemainingRowsHeight = 0;
    for (let i = startIndex; i < assets.length; i++) {
      totalRemainingRowsHeight += getRowHeight(i);
    }
    const fullPageNeeded = totalRemainingRowsHeight + totalHeight + signatureHeight;

    if (fullPageNeeded <= availableHeight) {
      pages.push({
        assets: assets.slice(startIndex),
        startIndex,
        showColumnNumbers: !includeMeta,
        includeMeta,
        includeTotal: true,
        includeSignature: true,
      });
      break;
    }

    const maxAllowedOnThisPage = Math.max(1, remainingCount - 1);

    for (let i = startIndex; i < assets.length && count < maxAllowedOnThisPage; i++) {
      const rH = getRowHeight(i);
      if (currentUsedHeight + rH > availableHeight) {
        break;
      }
      currentUsedHeight += rH;
      count++;
    }

    if (count === 0) {
      count = 1;
    }

    pages.push({
      assets: assets.slice(startIndex, startIndex + count),
      startIndex,
      showColumnNumbers: !includeMeta,
      includeMeta,
      includeTotal: false,
      includeSignature: false,
    });

    startIndex += count;
  }

  if (pages.length > 0) {
    const lastPage = pages[pages.length - 1];
    lastPage.includeTotal = true;
    lastPage.includeSignature = true;
  }

  return pages;
}

export function SkPenghentianDocument({
  assets,
  skNumber,
  skKap,
  date,
  menimbang,
  mengingat,
  memutuskan,
  kepalaBalai,
  tembusan,
}: SkPenghentianDocumentProps) {
  const docDate = parseDocDate(date);
  const month = String(docDate.getMonth() + 1).padStart(2, "0");
  const skNumberText = `SK.${skNumber.trim() || "____"}/K.18/TU/${skKap.trim() || "KAP.06.01"}/B/${month}/${docDate.getFullYear()}`;
  const totalNilai = assets.reduce((sum, a) => sum + (a.nilai_perolehan || 0), 0);

  const measurementRef = useRef<HTMLDivElement>(null);
  const fallbackPages = useMemo(() => buildFallbackLampiranPages(assets), [assets]);
  const [lampiranPages, setLampiranPages] = useState<AttachmentPage[]>(fallbackPages);

  useLayoutEffect(() => {
    const root = measurementRef.current;
    if (!root || assets.length === 0) {
      setLampiranPages(fallbackPages);
      return;
    }

    const pageElement = root.querySelector("[data-sk-measure='page']");
    const metaElement = root.querySelector("[data-sk-measure='attachment-meta-title']");
    const headerElement = root.querySelector("[data-sk-measure='header-simple']");
    const totalElement = root.querySelector("[data-sk-measure='total-row']");
    const signatureElement = root.querySelector("[data-sk-measure='signature']");
    const rows = Array.from(root.querySelectorAll("[data-sk-row-index]"));

    const pageHeight = pageElement?.getBoundingClientRect().height || 0;
    const metaHeight = getOuterHeight(metaElement);
    const headerHeight = getOuterHeight(headerElement);
    const totalHeight = getOuterHeight(totalElement);
    const signatureHeight = getOuterHeight(signatureElement);
    const rowHeights = assets.map((_, index) => getOuterHeight(rows[index]));

    if (
      !pageHeight ||
      !metaHeight ||
      !headerHeight ||
      !signatureHeight ||
      rowHeights.some((h) => h <= 0)
    ) {
      setLampiranPages(fallbackPages);
      return;
    }

    setLampiranPages(
      buildMeasuredSkAttachmentPages({
        assets,
        rowHeights,
        metaHeight,
        headerHeight,
        totalHeight,
        signatureHeight,
        pageHeight,
      })
    );
  }, [assets, fallbackPages]);

  const renderAttachmentTable = (chunk: AuctionAsset[], startIndex: number, showColumnNumbers: boolean, includeTotal: boolean) => (
    <table className="sk-asset-table mt-4 w-full border-collapse text-center" style={{ fontSize: "8.5pt" }}>
      <thead>
        {showColumnNumbers && (
          <tr className="sk-column-number-row" data-sk-measure="column-number-row">
            <th className="border border-black px-1 py-1">1</th>
            <th className="border border-black px-1 py-1">2</th>
            <th className="border border-black px-1 py-1">3</th>
            <th className="border border-black px-1 py-1">4</th>
            <th className="border border-black px-1 py-1">5</th>
            <th className="border border-black px-1 py-1">6</th>
            <th className="border border-black px-1 py-1">7</th>
            <th className="border border-black px-1 py-1">8</th>
            <th className="border border-black px-1 py-1">9</th>
            <th className="border border-black px-1 py-1">10</th>
          </tr>
        )}
        <tr data-sk-measure={showColumnNumbers ? "header-numbered" : "header-simple"}>
          <th className="border border-black px-1 py-1">No</th>
          <th className="border border-black px-1 py-1">Kode Barang</th>
          <th className="border border-black px-1 py-1">NUP</th>
          <th className="border border-black px-1 py-1">Nama Barang</th>
          <th className="border border-black px-1 py-1">Merk / Type</th>
          <th className="border border-black px-1 py-1">No Polisi</th>
          <th className="border border-black px-1 py-1">Tahun Perolehan</th>
          <th className="border border-black px-1 py-1">Nilai Perolehan (Rp)</th>
          <th className="border border-black px-1 py-1">Kondisi</th>
          <th className="border border-black px-1 py-1">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {chunk.map((asset, index) => (
          <tr key={asset.id} data-sk-row-index={startIndex + index}>
            <td className="border border-black px-1 py-1">{startIndex + index + 1}.</td>
            <td className="border border-black px-1 py-1">{asset.kode_barang}</td>
            <td className="border border-black px-1 py-1">{asset.nup}</td>
            <td className="border border-black px-1 py-1 text-left">{asset.nama_barang}</td>
            <td className="border border-black px-1 py-1">{asset.merk_tipe || "-"}</td>
            <td className="border border-black px-1 py-1">{asset.no_polisi || "-"}</td>
            <td className="border border-black px-1 py-1">{asset.tahun_perolehan || "-"}</td>
            <td className="border border-black px-1 py-1 text-right">{formatPlainRupiah(asset.nilai_perolehan)}</td>
            <td className="border border-black px-1 py-1">{asset.kondisi}</td>
            <td className="border border-black px-1 py-1">{getAssetSuratStatus(asset)}</td>
          </tr>
        ))}
        {includeTotal && (
          <tr data-sk-measure="total-row">
            <td colSpan={7} className="border border-black px-1 py-1 text-center font-bold">Jumlah</td>
            <td className="border border-black px-1 py-1 text-right font-bold">{formatPlainRupiah(totalNilai)}</td>
            <td colSpan={2} className="border border-black px-1 py-1"></td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const mengingatTexts = mengingat.map((m) => m.text);

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Bookman Old Style', Georgia, serif",
    fontSize: "11pt",
    lineHeight: "1.4",
  };

  const renderAttachmentMetaTitle = (measure = false) => (
    <div data-sk-measure={measure ? "attachment-meta-title" : undefined}>
      <div className="sk-attachment-meta ml-auto w-[128mm]">
        <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
          <span className="meta-label whitespace-nowrap">Lampiran</span>
          <span className="meta-colon text-center">:</span>
          <span className="meta-value min-w-0">Keputusan Kepala Balai KSDA KALTIM</span>
        </div>
        <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
          <span className="meta-label whitespace-nowrap">Nomor</span>
          <span className="meta-colon text-center">:</span>
          <span className="meta-value min-w-0 whitespace-nowrap">{skNumberText}</span>
        </div>
        <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
          <span className="meta-label whitespace-nowrap">Tanggal</span>
          <span className="meta-colon text-center">:</span>
          <span className="meta-value min-w-0">{formatDateLong(docDate)}</span>
        </div>
      </div>

      <p className="sk-lampiran-title mt-6 text-center font-bold leading-snug">
        DAFTAR PENGHENTIAN PENGGUNAAN BARANG MILIK NEGARA<br />
        PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
      </p>
    </div>
  );

  const renderAttachmentSignature = (measure = false) => (
    <div className="sk-lampiran-ttd signature mt-10 ml-auto w-80" data-sk-measure={measure ? "signature" : undefined}>
      <p className="m-0">Kepala Balai,</p>
      <div className="ttd-placeholder my-2 flex h-21 items-center pt-0 pl-[1.1cm] box-border text-zinc-400">${"{ttd_pengirim}"}</div>
      <p className="m-0 mt-2">{kepalaBalai.nama}</p>
      <p className="m-0">NIP. {kepalaBalai.nip}</p>
    </div>
  );

  return (
    <div id="sk-penghentian-print-root" className="sk-print-root">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0 0 28mm 0; }
          @page sk-main { size: A4; margin: 12mm 0 28mm 0; }
          @page sk-main:first { size: A4; margin: 0 0 28mm 0; }
          @page sk-attachment { size: A4 landscape; margin: 14mm 0 20mm 0; }
          .sk-no-print, .sk-measurement, .sk-measurement * { display: none !important; visibility: hidden !important; }
          body * { visibility: hidden; }
          .sk-print-root, .sk-print-root * { visibility: visible; }
          .sk-measurement, .sk-measurement * { display: none !important; visibility: hidden !important; }
          .sk-print-root {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.4; margin: 0; padding: 0;
          }
          .sk-page {
            width: 210mm; margin: 0 auto;
            padding: 5mm 20mm 0; box-shadow: none !important;
          }
          .sk-main-document { page: sk-main; }
          .sk-attachment-document {
            page: sk-attachment;
            page-break-before: always;
            break-before: page;
            width: 297mm !important;
            max-width: 297mm !important;
            padding: 10mm 16mm 20mm !important;
          }
          .sk-attachment-page {
            width: 258mm;
            margin: 0 auto;
            page: sk-attachment;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .sk-attachment-page-continuation {
            page-break-before: always;
            break-before: page;
            padding-top: 8mm;
          }
          .sk-page-break { page-break-after: always; break-after: always; }
          .sk-kop { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; margin-bottom: 4px; text-align: center; }
          .sk-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
          .sk-body { width: 166mm; margin-left: auto; margin-right: auto; }

          .sk-mengingat-table { break-inside: auto !important; page-break-inside: auto !important; }
          .sk-mengingat-row { break-inside: avoid !important; page-break-inside: avoid !important; }
          .sk-field-section { display: grid; grid-template-columns: 28mm 8mm minmax(0, 1fr); break-inside: auto !important; page-break-inside: auto !important; }
          .sk-field-section + .sk-field-section { margin-top: 0.75rem; }
          .sk-field-colon { text-align: center; }
          .sk-mengingat-list { break-inside: auto !important; page-break-inside: auto !important; }
          .sk-mengingat-item { display: grid; grid-template-columns: 9mm minmax(0, 1fr); break-inside: avoid !important; page-break-inside: avoid !important; padding-top: 0.35rem; }
          .sk-mengingat-item:first-child { padding-top: 0; }
          .sk-mengingat-text { text-align: justify; }
          .sk-no-print, .sk-measurement, .sk-measurement * { display: none !important; visibility: hidden !important; }
          .sk-asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; }
          .sk-asset-table th, .sk-asset-table td { border: 1px solid #000; padding: 0.25rem; }
          .sk-asset-table thead { display: table-header-group; }
          .sk-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
          .sk-column-number-row th { font-weight: normal; }
          .sk-asset-table td.text-left { text-align: left; }
          .sk-asset-table td.text-right { text-align: right; }
          .sk-lampiran-ttd { margin-top: 1rem !important; break-inside: avoid; page-break-inside: avoid; }
          .sk-lampiran-ttd p { line-height: 1.15 !important; }
          .sk-attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .sk-attachment-meta .meta-label { white-space: nowrap; }
          .sk-attachment-meta .meta-colon { text-align: center; }
          .sk-ttd, .sk-ttd p { font-weight: normal !important; text-align: left !important; }
        }
        .sk-print-root .sk-page {
          width: 210mm;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .sk-print-root .sk-main-document {
          padding: 5mm 20mm 0 !important;
        }
        .sk-print-root .sk-kop {
          margin-top: -5mm;
          margin-left: -16mm;
          margin-right: -16mm;
          margin-bottom: 4px;
          text-align: center;
        }
        .sk-print-root .sk-kop img {
          width: 196mm !important;
          max-width: 196mm !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
        }
        .sk-print-root .sk-title,
        .sk-print-root .sk-subtitle,
        .sk-print-root .sk-body {
          width: 166mm;
          margin-left: auto;
          margin-right: auto;
        }
        .sk-print-root .sk-title {
          margin-top: 10px;
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
        }
        .sk-print-root .sk-title-nomor {
          font-weight: normal;
        }
        .sk-print-root .sk-title-tentang {
          margin-top: 10px;
        }
        .sk-print-root .sk-subtitle {
          margin-top: 16px;
        }
        .sk-print-root .sk-subtitle > p {
          text-align: center;
          font-weight: bold;
        }
        .sk-print-root .sk-subtitle > p + p {
          margin-top: 6px;
        }
        .sk-print-root p {
          margin: 0;
          padding: 0;
        }
        .sk-print-root table {
          border-collapse: collapse;
          width: 100%;
        }
        .sk-print-root td {
          vertical-align: top;
          padding: 0;
        }
        .sk-print-root .sk-field-section {
          display: grid;
          grid-template-columns: 28mm 8mm minmax(0, 1fr);
          break-inside: auto;
          page-break-inside: auto;
        }
        .sk-print-root .sk-field-section + .sk-field-section {
          margin-top: 0.75rem;
        }
        .sk-print-root .sk-field-colon {
          text-align: center;
        }
        .sk-print-root .sk-mengingat-list {
          break-inside: auto;
          page-break-inside: auto;
        }
        .sk-print-root .sk-mengingat-item {
          display: grid;
          grid-template-columns: 9mm minmax(0, 1fr);
          break-inside: avoid;
          page-break-inside: avoid;
          padding-top: 0.35rem;
        }
        .sk-print-root .sk-mengingat-item:first-child {
          padding-top: 0;
        }
        .sk-print-root .sk-mengingat-text {
          text-align: justify;
        }
        .sk-print-root .sk-memutuskan {
          text-align: center;
          font-weight: bold;
          margin-bottom: 12px;
        }
        .sk-print-root .sk-continuation-word {
          text-align: right !important;
          margin-top: 0.5rem;
          font-weight: normal !important;
        }
        .sk-print-root .sk-ttd {
          width: 20rem;
          margin-left: auto;
          margin-top: 3rem;
        }
        .sk-print-root .sk-ttd,
        .sk-print-root .sk-ttd p,
        .sk-print-root .sk-tembusan,
        .sk-print-root .sk-tembusan p {
          font-weight: normal !important;
          text-align: left !important;
        }
        .sk-print-root .sk-ttd p,
        .sk-print-root .sk-tembusan p {
          margin: 0;
          padding: 0;
        }
        .sk-print-root .sk-signature-name {
          font-weight: normal !important;
        }
        .sk-print-root .sk-tembusan {
          margin-top: 2rem;
        }
        .sk-print-root .sk-tembusan p {
          line-height: 1.5;
        }
        .sk-print-root .sk-attachment-document {
          width: 297mm !important;
          max-width: 297mm !important;
          padding: 10mm 16mm 20mm !important;
          margin-left: auto;
          margin-right: auto;
        }
        .sk-print-root .sk-attachment-document .sk-body {
          width: 258mm !important;
          margin-left: auto;
          margin-right: auto;
        }
        .sk-print-root .sk-attachment-meta {
          width: 128mm;
          margin-left: auto;
          text-align: left;
        }
        .sk-print-root .meta-row {
          display: grid;
          grid-template-columns: 24mm 5mm minmax(0, 1fr);
          align-items: start;
        }
        .sk-print-root .meta-label {
          white-space: nowrap;
        }
        .sk-print-root .meta-colon {
          text-align: center;
        }
        .sk-print-root .sk-lampiran-title {
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .sk-print-root .sk-asset-table {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
          font-size: 8.5pt;
        }
        .sk-print-root .sk-asset-table th,
        .sk-print-root .sk-asset-table td {
          border: 1px solid #000;
          padding: 0.25rem;
        }
        .sk-print-root .sk-asset-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .sk-print-root .sk-column-number-row th {
          font-weight: normal;
        }
        .sk-print-root .sk-asset-table td.text-left {
          text-align: left;
        }
        .sk-print-root .sk-asset-table td.text-right {
          text-align: right;
        }
        .sk-print-root .sk-lampiran-ttd {
          width: 20rem;
          margin-left: auto;
          margin-top: 1rem !important;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .sk-print-root .sk-lampiran-ttd p {
          margin: 0;
          padding: 0;
          line-height: 1.15 !important;
        }
      `}</style>

      {/* ── HALAMAN 1+2: KOP + Judul + Menimbang + Mengingat + MEMUTUSKAN + TTD + Tembusan ── */}
      <article
        className="sk-page sk-page-ttd sk-main-document mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="sk-kop" style={{ marginTop: "-5mm", marginLeft: "-16mm", marginRight: "-16mm", marginBottom: "4px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="sk-title mx-auto mt-3 w-[166mm] text-center font-bold leading-snug">
          <p className="m-0">KEPUTUSAN KEPALA BALAI</p>
          <p className="m-0">KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
          <p className="sk-title-nomor m-0 font-normal">Nomor : {skNumberText}</p>
          <p className="sk-title-tentang m-0 mt-4">TENTANG</p>
          <p className="m-0">PENGHENTIAN PENGGUNAAN BARANG MILIK NEGARA</p>
          <p className="m-0">PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,</p>
        </div>

        <div className="sk-subtitle sk-body mx-auto mt-5 w-[166mm]">
          <p className="text-center font-bold">DENGAN RAHMAT TUHAN YANG MAHA ESA</p>
          <p className="mt-2 text-center font-bold">
            KEPALA BALAI<br />
            KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,
          </p>

          {/* Menimbang + Mengingat */}
          <div className="mt-4">
            <div className="sk-field-section">
              <div className="sk-field-label">Menimbang</div>
              <div className="sk-field-colon">:</div>
              <div className="sk-mengingat-list">
                {menimbang.map((item, i) => (
                  <div
                    className="sk-mengingat-item"
                    key={item.id}
                    style={i === 0 ? undefined : { paddingTop: "0.5rem" }}
                  >
                    <div>{String.fromCharCode(97 + i)}.</div>
                    <div className="sk-mengingat-text">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sk-field-section">
              <div className="sk-field-label">Mengingat</div>
              <div className="sk-field-colon">:</div>
              <div className="sk-mengingat-list">
                {mengingatTexts.map((item, i) => (
                  <div className="sk-mengingat-item" key={i}>
                    <div>{i + 1}.</div>
                    <div className="sk-mengingat-text">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MEMUTUSKAN */}
          <p className="sk-memutuskan text-center font-bold" style={{ marginTop: "1.5rem" }}>MEMUTUSKAN</p>

          <table className="sk-mengingat-table mt-4 w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr className="sk-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top" }}>Menetapkan</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top", textTransform: "uppercase", textAlign: "justify", fontWeight: "bold" }}>
                  {memutuskan.menetapkan}
                </td>
              </tr>
              <tr className="sk-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "1rem" }}>KESATU</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "1rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "1rem", textAlign: "justify" }}>
                  {memutuskan.kesatu}
                </td>
              </tr>
              <tr className="sk-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "1rem" }}>KEDUA</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "1rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "1rem", textAlign: "justify" }}>
                  {memutuskan.kedua}
                </td>
              </tr>
            </tbody>
          </table>

          {/* KETIGA + TTD + Tembusan grouped — kalau TTD turun, KETIGA ikut turun */}
          <div className="sk-ketiga-group">
            <table className="sk-mengingat-table mt-0 w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr className="sk-mengingat-row">
                  <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "1rem" }}>KETIGA</td>
                  <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "1rem" }}>:</td>
                  <td style={{ verticalAlign: "top", paddingTop: "1rem", textAlign: "justify" }}>
                    {memutuskan.ketiga}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TTD */}
            <div className="sk-ttd signature mt-12 ml-auto w-80">
              <div className="sk-ttd-meta" style={{ display: "grid", gridTemplateColumns: "max-content auto 1fr", columnGap: "0.4rem" }}>
                <span>Ditetapkan di</span>
                <span>:</span>
                <span>Samarinda</span>
                <span>Pada tanggal</span>
                <span>:</span>
                <span>{formatDateLong(docDate)}</span>
              </div>
              <p className="m-0 mt-3">Kepala Balai,</p>
              <div className="ttd-placeholder my-2 flex h-21 items-center pt-0 pl-[1.1cm] box-border text-zinc-400">${"{ttd_pengirim}"}</div>
              <p className="sk-signature-name m-0 mt-2">{kepalaBalai.nama}</p>
              <p className="m-0">NIP. {kepalaBalai.nip}</p>
            </div>

            {/* Tembusan */}
            {tembusan.length > 0 && (
              <div className="sk-tembusan mt-10">
                <p className="m-0">Tembusan :</p>
                {tembusan.length === 1 ? (
                  <p className="m-0">{tembusan[0].text}</p>
                ) : (
                  tembusan.map((item, i) => (
                    <p key={item.id} className="m-0">{i + 1}.&nbsp; {item.text}</p>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* ── HALAMAN 3 DST: Lampiran — Tabel Daftar Penghentian ── */}
      <article
        className="sk-page sk-attachment-document sk-page-landscape mx-auto max-w-[297mm] bg-white px-12 py-6 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="sk-body mx-auto w-[258mm]">
          {lampiranPages.map((pg, pageIndex) => (
            <div
              className={`sk-attachment-page${pageIndex > 0 ? " sk-attachment-page-continuation" : ""}`}
              key={`sk-attachment-page-${pageIndex}`}
            >
              {pg.includeMeta ? (
                renderAttachmentMetaTitle()
              ) : (
                <div className="sk-continuation-spacer h-4 w-full" />
              )}
              {renderAttachmentTable(pg.assets, pg.startIndex, pg.showColumnNumbers, pg.includeTotal)}
              {pg.includeSignature && renderAttachmentSignature()}
            </div>
          ))}
        </div>
      </article>

      {/* Hidden DOM measurement root for live height calculation */}
      <div
        ref={measurementRef}
        className="sk-measurement sk-no-print print:hidden pointer-events-none absolute m-0 p-0 opacity-0 border-none"
        style={{ left: -9999, top: -9999 }}
        aria-hidden="true"
      >
        <article
          className="sk-page sk-attachment-document sk-page-landscape max-w-[297mm] bg-white px-12 py-5"
          data-sk-measure="page"
          style={pageStyle}
        >
          <div className="sk-body mx-auto w-[258mm]">
            <div data-sk-measure="attachment-meta-title">{renderAttachmentMetaTitle(true)}</div>
            {renderAttachmentTable(assets, 0, false, true)}
            <div data-sk-measure="signature">{renderAttachmentSignature(true)}</div>
          </div>
        </article>
      </div>

    </div>
  );
}
