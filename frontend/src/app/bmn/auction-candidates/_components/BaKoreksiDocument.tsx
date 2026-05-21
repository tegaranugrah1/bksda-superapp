"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AuctionAsset } from "../_lib/auction-helpers";
import {
  formatPlainRupiah,
  formatDateLong,
  getSpelledDate,
} from "../_lib/auction-helpers";

const BA_ATTACHMENT_PAGE_HEIGHT_MM = 269;
const BA_ATTACHMENT_FALLBACK_CHUNK_SIZE = 8;
const BA_ATTACHMENT_MIN_ROWS_PER_PAGE = 1;

type BaLampiranSection = {
  mode: "before" | "after";
  title: string;
  assets: AuctionAsset[];
  startIndex: number;
  isContinuation: boolean;
};

type BaLampiranPage = {
  sections: BaLampiranSection[];
  showMeta: boolean;
  showSignature: boolean;
};

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
            min-height: ${BA_ATTACHMENT_PAGE_HEIGHT_MM}mm;
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
          .ba-asset-table { width: 100%; table-layout: fixed; border-collapse: collapse; text-align: center; font-size: 8.5pt; break-inside: auto; page-break-inside: auto; }
          .ba-asset-table thead { display: table-header-group; }
          .ba-asset-table th, .ba-asset-table td { border: 1px solid #000; padding: 0.18rem 0.2rem; overflow-wrap: anywhere; word-break: normal; }
          .ba-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
          .ba-asset-table td.text-left { text-align: left; }
          .ba-asset-table td.text-right { text-align: right; }
          .ba-section-title { font-size: 10pt; font-weight: 600; margin-bottom: 0.5rem; }
          .ba-continuation-spacer { height: 8mm; }
          .attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .attachment-meta .meta-label { white-space: nowrap; }
          .attachment-meta .meta-colon { text-align: center; }
          .attachment-meta .meta-value { min-width: 0; }
          .attachment-meta .lampiran-value { display: inline-block; max-width: 80mm; }
          .signature { width: 20rem; margin-left: auto; break-inside: avoid; page-break-inside: avoid; }
          .attachment-signature { margin-top: 1.5rem; }
          .signature p { margin: 0; padding: 0; line-height: 1.15; }
          .signature p.ttd-spacer-top { margin-top: 2rem !important; }
          .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; margin-top: 2rem; margin-bottom: 2rem; }
          .attachment-signature .ttd-placeholder { height: 92px; padding-top: 30px; margin-top: 2rem; margin-bottom: 2rem; }
          .ba-editable { outline: none; border-bottom: none !important; }
          .ba-measurement { display: none !important; }
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

function AssetConditionTable({
  assets,
  mode,
  startIndex = 0,
  measureKey,
  showColumnNumbers = false,
}: {
  assets: AuctionAsset[];
  mode: "before" | "after";
  startIndex?: number;
  measureKey?: string;
  showColumnNumbers?: boolean;
}) {
  return (
    <table
      className="ba-asset-table mt-4 w-full table-fixed border-collapse text-center"
      data-ba-measure-table={measureKey}
      style={{ fontSize: "8.5pt" }}
    >
      <colgroup>
        <col style={{ width: "6%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "18%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "17%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "10%" }} />
      </colgroup>
      <thead>
        {showColumnNumbers ? (
          <tr className="ba-column-number-row">
            <th className="border border-black px-1 py-1">1</th>
            <th className="border border-black px-1 py-1">2</th>
            <th className="border border-black px-1 py-1">3</th>
            <th className="border border-black px-1 py-1">4</th>
            <th className="border border-black px-1 py-1">5</th>
            <th className="border border-black px-1 py-1">6</th>
            <th className="border border-black px-1 py-1">7</th>
            <th className="border border-black px-1 py-1">8</th>
            <th className="border border-black px-1 py-1">9</th>
          </tr>
        ) : null}
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
            <td className="border border-black px-1 py-1">{startIndex + index + 1}.</td>
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

function AttachmentMeta({ baNumberText, today }: { baNumberText: string; today: Date }) {
  return (
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
  );
}

function AttachmentSignature() {
  return (
    <div className="signature attachment-signature mt-6 ml-auto w-80">
      <p className="m-0">Kepala Balai,</p>
      <div className="ttd-placeholder mt-8 h-[92px] box-border pt-[30px] pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
      <p className="m-0 mt-8">M. ARI WIBAWANTO, S.Hut., M.Sc.</p>
      <p className="m-0">NIP. 19740514 199903 1 001</p>
    </div>
  );
}

function BaLampiranSectionBlock({
  section,
  measureKey,
}: {
  section: BaLampiranSection;
  measureKey?: string;
}) {
  return (
    <>
      {section.isContinuation ? null : <p className="ba-section-title mt-6 mb-2 text-[12px] font-semibold">{section.title}</p>}
      <AssetConditionTable
        assets={section.assets}
        mode={section.mode}
        startIndex={section.startIndex}
        measureKey={measureKey}
        showColumnNumbers={section.isContinuation}
      />
    </>
  );
}

function BaLampiranPageContent({
  page,
  baNumberText,
  today,
}: {
  page: BaLampiranPage;
  baNumberText: string;
  today: Date;
}) {
  return (
    <>
      {page.showMeta ? <AttachmentMeta baNumberText={baNumberText} today={today} /> : <div className="ba-continuation-spacer" />}

      {page.sections.map((section) => (
        <BaLampiranSectionBlock
          key={`${section.mode}-${section.startIndex}`}
          section={section}
        />
      ))}

      {page.showSignature ? <AttachmentSignature /> : null}
    </>
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

function fitAssetCount(rowHeights: number[], startIndex: number, availableHeight: number, allowSingleOverflow = false) {
  let usedHeight = 0;
  let count = 0;

  for (let index = startIndex; index < rowHeights.length; index += 1) {
    const nextHeight = rowHeights[index] || 0;
    if (usedHeight + nextHeight > availableHeight) {
      if (count === 0 && allowSingleOverflow) return BA_ATTACHMENT_MIN_ROWS_PER_PAGE;
      break;
    }
    usedHeight += nextHeight;
    count += 1;
  }

  return count;
}

function buildMeasuredLampiranPages({
  assets,
  beforeRowHeights,
  afterRowHeights,
  metaHeight,
  continuationSpacerHeight,
  sectionBaseHeight,
  signatureHeight,
  pageHeight,
}: {
  assets: AuctionAsset[];
  beforeRowHeights: number[];
  afterRowHeights: number[];
  metaHeight: number;
  continuationSpacerHeight: number;
  sectionBaseHeight: number;
  signatureHeight: number;
  pageHeight: number;
}) {
  if (assets.length === 0) return [];

  const pages: BaLampiranPage[] = [];
  let currentPage: BaLampiranPage | null = null;
  let currentHeight = 0;

  const startPage = () => {
    const showMeta = pages.length === 0;
    currentPage = { sections: [], showMeta, showSignature: false };
    currentHeight = showMeta ? metaHeight : continuationSpacerHeight;
    pages.push(currentPage);
  };

  const addSection = (mode: "before" | "after", title: string, rowHeights: number[]) => {
    let startIndex = 0;

    while (startIndex < assets.length) {
      if (!currentPage) startPage();

      const page = currentPage!;
      const isNewSectionOnPage = page.sections.length === 0 || page.sections[page.sections.length - 1]?.mode !== mode;
      const baseHeight = isNewSectionOnPage ? sectionBaseHeight : 0;
      const remainingCount = assets.length - startIndex;
      const isAfterSection = mode === "after";
      const finalAvailableHeight = pageHeight - currentHeight - baseHeight - signatureHeight;
      const finalFitCount = isAfterSection
        ? fitAssetCount(rowHeights, startIndex, finalAvailableHeight, page.sections.length === 0)
        : 0;

      if (isAfterSection && finalFitCount >= remainingCount) {
        page.sections.push({
          mode,
          title,
          assets: assets.slice(startIndex),
          startIndex,
          isContinuation: startIndex > 0,
        });
        page.showSignature = true;
        currentPage = null;
        currentHeight = 0;
        return;
      }

      if (isAfterSection && remainingCount <= BA_ATTACHMENT_MIN_ROWS_PER_PAGE && page.sections.length > 0) {
        currentPage = null;
        currentHeight = 0;
        continue;
      }

      const regularAvailableHeight = pageHeight - currentHeight - baseHeight;
      let regularFitCount = fitAssetCount(rowHeights, startIndex, regularAvailableHeight, page.sections.length === 0);

      if (regularFitCount === 0 && page.sections.length > 0) {
        currentPage = null;
        currentHeight = 0;
        continue;
      }

      if (isAfterSection) {
        regularFitCount = Math.min(remainingCount - BA_ATTACHMENT_MIN_ROWS_PER_PAGE, regularFitCount);
      } else {
        regularFitCount = Math.min(remainingCount, regularFitCount);
      }

      const safeCount = Math.max(BA_ATTACHMENT_MIN_ROWS_PER_PAGE, regularFitCount);
      page.sections.push({
        mode,
        title,
        assets: assets.slice(startIndex, startIndex + safeCount),
        startIndex,
        isContinuation: startIndex > 0,
      });
      currentHeight += baseHeight + rowHeights.slice(startIndex, startIndex + safeCount).reduce((total, height) => total + height, 0);
      startIndex += safeCount;

      if (startIndex < assets.length) {
        currentPage = null;
        currentHeight = 0;
      }
    }
  };

  addSection("before", "I. Sebelum", beforeRowHeights);
  addSection("after", "II. Sesudah", afterRowHeights);

  return pages;
}

function buildFallbackLampiranPages(assets: AuctionAsset[]) {
  if (assets.length === 0) return [];

  const pages: BaLampiranPage[] = [];
  for (let startIndex = 0; startIndex < assets.length; startIndex += BA_ATTACHMENT_FALLBACK_CHUNK_SIZE) {
    const pageAssets = assets.slice(startIndex, startIndex + BA_ATTACHMENT_FALLBACK_CHUNK_SIZE);
    pages.push({
      sections: [
        {
          mode: "before",
          title: "I. Sebelum",
          assets: pageAssets,
          startIndex,
          isContinuation: startIndex > 0,
        },
        {
          mode: "after",
          title: "II. Sesudah",
          assets: pageAssets,
          startIndex,
          isContinuation: startIndex > 0,
        },
      ],
      showMeta: startIndex === 0,
      showSignature: startIndex + pageAssets.length >= assets.length,
    });
  }

  return pages;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CorrectionDocument({ assets, baNumber, baKap }: { assets: AuctionAsset[]; baNumber: string; baKap: string }) {
  const measurementRef = useRef<HTMLDivElement>(null);
  const fallbackLampiranPages = useMemo(() => buildFallbackLampiranPages(assets), [assets]);
  const [lampiranPages, setLampiranPages] = useState<BaLampiranPage[]>(fallbackLampiranPages);
  const today = new Date();
  const { day, dateText, month, yearText } = getSpelledDate(today);
  const monthNum = String(today.getMonth() + 1).padStart(2, "0");
  const baNumberText = `BA.${baNumber.trim() || "____"}/K.18/TU/${baKap}/B/${monthNum}/${today.getFullYear()}`;
  const datePhrase = `${dateText} bulan ${month} tahun ${yearText}`;

  useLayoutEffect(() => {
    const root = measurementRef.current;
    if (!root || assets.length === 0) {
      setLampiranPages([]);
      return;
    }

    const pageHeight = root.querySelector("[data-ba-measure='page']")?.getBoundingClientRect().height || 0;
    const metaHeight = getOuterHeight(root.querySelector("[data-ba-measure='meta']"));
    const continuationSpacerHeight = getOuterHeight(root.querySelector("[data-ba-measure='continuation-spacer']"));
    const sectionBaseHeight = getOuterHeight(root.querySelector("[data-ba-measure='section-base']"));
    const signatureHeight = getOuterHeight(root.querySelector("[data-ba-measure='signature']"));
    const beforeRows = Array.from(root.querySelectorAll("[data-ba-measure-table='before'] tbody tr"));
    const afterRows = Array.from(root.querySelectorAll("[data-ba-measure-table='after'] tbody tr"));
    const beforeRowHeights = assets.map((_, index) => getOuterHeight(beforeRows[index]));
    const afterRowHeights = assets.map((_, index) => getOuterHeight(afterRows[index]));

    if (
      !pageHeight ||
      !metaHeight ||
      !continuationSpacerHeight ||
      !sectionBaseHeight ||
      !signatureHeight ||
      beforeRowHeights.some((height) => height <= 0) ||
      afterRowHeights.some((height) => height <= 0)
    ) {
      setLampiranPages(fallbackLampiranPages);
      return;
    }

    setLampiranPages(
      buildMeasuredLampiranPages({
        assets,
        beforeRowHeights,
        afterRowHeights,
        metaHeight,
        continuationSpacerHeight,
        sectionBaseHeight,
        signatureHeight,
        pageHeight,
      }),
    );
  }, [assets, baNumberText, fallbackLampiranPages]);

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
        .ba-lampiran {
          min-height: 297mm;
        }
        .ba-asset-table {
          table-layout: fixed;
        }
        .ba-asset-table th,
        .ba-asset-table td {
          overflow-wrap: anywhere;
          word-break: normal;
        }
        .ba-continuation-spacer {
          height: 8mm;
        }
        .attachment-signature {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .attachment-signature .ttd-placeholder {
          height: 92px;
          padding-top: 30px;
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .ba-measurement {
          position: absolute;
          left: -10000px;
          top: 0;
          z-index: -1;
          visibility: hidden;
          pointer-events: none;
          width: 210mm;
          background: white;
          color: black;
          font-family: 'Bookman Old Style', Georgia, serif;
          font-size: 11pt;
          line-height: 1.25;
        }
        .ba-measure-page {
          width: 210mm;
          box-sizing: border-box;
          height: ${BA_ATTACHMENT_PAGE_HEIGHT_MM}mm;
          padding: 5mm 20mm 0;
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
            min-height: ${BA_ATTACHMENT_PAGE_HEIGHT_MM}mm;
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
          .ba-asset-table { table-layout: fixed; break-inside: auto; page-break-inside: auto; }
          .ba-asset-table thead { display: table-header-group; }
          .ba-asset-table th, .ba-asset-table td { padding: 0.18rem 0.2rem; overflow-wrap: anywhere; word-break: normal; }
          .ba-asset-table tr { break-inside: avoid; page-break-inside: avoid; }
          .ba-continuation-spacer { height: 8mm; }
          .attachment-signature { margin-top: 1.5rem !important; break-inside: avoid; page-break-inside: avoid; }
          .attachment-signature .ttd-placeholder { height: 92px !important; padding-top: 30px !important; margin-top: 2rem !important; margin-bottom: 2rem !important; }
          .signature .ttd-placeholder { margin-top: 2rem !important; margin-bottom: 2rem !important; }
          .ba-measurement { display: none !important; }
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
          <div className="ttd-placeholder mt-8 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
          <p
            contentEditable="true"
            suppressContentEditableWarning
            className="ba-editable m-0 mt-8"
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

      {/* Lampiran BA: measured pages finish Sebelum first, then Sesudah, with final signature kept together */}
      <div ref={measurementRef} className="ba-measurement" aria-hidden="true">
        <div data-ba-measure="page" className="ba-measure-page" />
        <div data-ba-measure="meta">
          <AttachmentMeta baNumberText={baNumberText} today={today} />
        </div>
        <div data-ba-measure="continuation-spacer">
          <div className="ba-continuation-spacer" />
        </div>
        <div className="ba-lampiran-body mx-auto w-[166mm]" data-ba-measure="section-base">
          <BaLampiranSectionBlock
            section={{ mode: "before", title: "I. Sebelum", assets: [], startIndex: 0, isContinuation: false }}
          />
        </div>
        <div data-ba-measure="signature">
          <AttachmentSignature />
        </div>
        <div className="ba-lampiran-body mx-auto w-[166mm]">
          <BaLampiranSectionBlock
            section={{ mode: "before", title: "I. Sebelum", assets, startIndex: 0, isContinuation: false }}
            measureKey="before"
          />
          <BaLampiranSectionBlock
            section={{ mode: "after", title: "II. Sesudah", assets, startIndex: 0, isContinuation: false }}
            measureKey="after"
          />
        </div>
      </div>

      {lampiranPages.map((page, pageIndex) => (
        <article
          key={`ba-lampiran-${pageIndex}`}
          className="ba-lampiran mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
          style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.25" }}
        >
          <div className="ba-lampiran-body mx-auto w-[166mm]">
            <BaLampiranPageContent
              page={page}
              baNumberText={baNumberText}
              today={today}
            />
          </div>
        </article>
      ))}
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
