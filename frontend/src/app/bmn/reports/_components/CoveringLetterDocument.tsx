"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { toast } from "sonner";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface CoveringLetterItem {
  id?: string;
  title: string;
  quantity?: string | null;
  description?: string | null;
}

export interface CoveringLetterParty {
  name?: string | null;
  idType?: "NIP" | "NIK";
  nip?: string | null;
  role?: string | null;
}

export interface CoveringLetterDocumentProps {
  documentId?: string;
  number: string;
  hasNumber?: boolean;
  regarding: string;
  documentDate: string;
  recipientTitle: string;
  recipientLocation: string;
  items: CoveringLetterItem[];
  closingPhrase: string;
  receivedDate?: string | null;
  showSignatures?: boolean;
  showReceiverSignature?: boolean;
  receiverIsBlank?: boolean;
  receiverIncludePhone?: boolean;
  receiverPhone?: string | null;
  sender: CoveringLetterParty;
  receiver?: CoveringLetterParty | null;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function parseDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatIndonesianDate(value?: string | null): string {
  if (!value) return "";
  const date = parseDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function fallback(value?: string | number | null): string {
  const text = `${value ?? ""}`.trim();
  return text || "-";
}

function formatNip(nip?: string | null): string {
  if (!nip) return "";
  const trimmed = nip.trim();
  if (trimmed === "" || trimmed === "-") return "";
  if (trimmed.startsWith("MMP-")) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 18) {
    return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 18)}`;
  }
  return trimmed;
}

function displayName(value?: string | null): string {
  const text = fallback(value);
  if (text === "-") return text;
  if (/[a-z]/.test(text)) return text;
  return text
    .toLocaleLowerCase("id-ID")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("id-ID"))
    .replace(/\bS\.hut\./gi, "S.Hut.")
    .replace(/\bM\.sc\./gi, "M.Sc.")
    .replace(/\bM\.t\./gi, "M.T.")
    .replace(/\bM\.p\./gi, "M.P.");
}

function signatureName(value?: string | null): string {
  const name = displayName(value);
  if (name === "-") return "";
  const [mainName, ...suffix] = name.split(",");
  const upperMain = mainName.trim().toLocaleUpperCase("id-ID");
  return suffix.length > 0 ? `${upperMain},${suffix.join(",")}` : upperMain;
}

function renderRoleLines(roleText?: string | null) {
  if (!roleText) return null;
  const lines = roleText.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="covering-sig-role">
      {lines.map((line, i) => (
        <p key={i}>
          <strong>{line}</strong>
        </p>
      ))}
    </div>
  );
}

export function handlePrintCoveringLetter(documentId = "covering-letter-print-root") {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Tidak ada dokumen Surat Pengantar untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Pengantar BMN</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.35; }
          p { margin: 0; }
          .covering-page { width: 210mm; margin: 0 auto; padding: 3.5mm 12mm 10mm; }
          .covering-header { margin: 0 -6mm; text-align: center; }
          .covering-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          
          .covering-meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 5mm; }
          .covering-meta-left { max-width: 120mm; }
          .covering-meta-right { text-align: right; min-width: 45mm; font-size: 10pt; }
          .covering-meta-item { display: grid; grid-template-columns: 18mm 4mm 1fr; align-items: flex-start; margin-bottom: 1.5mm; }
          .covering-meta-label { font-weight: normal; }
          .covering-meta-colon { text-align: center; }
          .covering-meta-val { text-align: left; word-break: break-word; line-height: 1.3; }

          .covering-recipient-block { margin-top: 6mm; margin-bottom: 5mm; word-break: break-word; overflow-wrap: anywhere; }
          .covering-recipient-block p { margin-bottom: 0.5mm; word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; }

          .covering-table { width: 100%; border-collapse: collapse; margin-top: 4mm; margin-bottom: 4mm; font-size: 9.5pt; table-layout: fixed; }
          .covering-table thead { display: table-header-group; }
          .covering-table thead tr.table-number-row th { font-weight: normal; padding: 1px 0; font-size: 8.5pt; text-align: center; }
          .covering-table th, .covering-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
          .covering-table th { font-weight: bold; background: transparent; text-align: center; }
          .covering-table tr { break-inside: avoid; page-break-inside: avoid; }
          .page-continuation-spacer { height: 0; margin: 0; padding: 0; border: none; page-break-before: always; break-before: page; }

          .covering-closing-block,
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-top: 4mm;
          }
          .covering-received-date { margin-top: 4mm; font-size: 10pt; }

          .covering-signatures { display: flex; justify-content: space-between; align-items: flex-start; gap: 20mm; margin-top: 6mm; text-align: left; break-inside: avoid !important; page-break-inside: avoid !important; }
          .covering-signatures.sender-only { justify-content: flex-end; }
          .covering-sig-left, .covering-sig-right { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; break-inside: avoid !important; page-break-inside: avoid !important; }
          .covering-sig-left { max-width: 48%; }
          .covering-sig-right { max-width: 52%; }
          .covering-sig-role { min-height: 10mm; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; text-align: left; }
          .covering-sig-role p, .covering-sig-name, .covering-sig-id, .covering-sig-phone { white-space: nowrap; }
          .covering-sig-name { margin-top: 28mm; font-weight: bold; text-align: left; white-space: nowrap; min-height: 1.2em; }
          .covering-sig-id { white-space: nowrap; }
          .covering-sig-phone { white-space: nowrap; margin-top: 1mm; font-size: 9.5pt; }
          .covering-measure-container { display: none !important; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function estimateInitialCutoff(items: CoveringLetterItem[]): { isMultiPage: boolean; cutoff: number } {
  const USABLE_PAGE_1_PX = 1020;
  const HEADER_HEIGHT_PX = 270;
  const SIGNATURE_BLOCK_HEIGHT_PX = 290;

  let totalItemsHeight = 0;
  const itemHeights: number[] = [];

  for (const item of items) {
    const title = (item.title || "").trim();
    const explicitLines = title.split("\n");
    let lineCount = 0;
    for (const line of explicitLines) {
      lineCount += Math.max(1, Math.ceil(line.length / 40));
    }
    const h = 28 + (lineCount - 1) * 17;
    itemHeights.push(h);
    totalItemsHeight += h;
  }

  if (HEADER_HEIGHT_PX + totalItemsHeight + SIGNATURE_BLOCK_HEIGHT_PX <= USABLE_PAGE_1_PX) {
    return { isMultiPage: false, cutoff: items.length };
  }

  const availableForItems = USABLE_PAGE_1_PX - HEADER_HEIGHT_PX;
  let runningHeight = 0;
  let cutoff = items.length;

  for (let i = 0; i < itemHeights.length; i++) {
    if (runningHeight + itemHeights[i] > availableForItems) {
      cutoff = i;
      break;
    }
    runningHeight += itemHeights[i];
  }

  if (cutoff === items.length && items.length > 3) {
    cutoff = items.length - 3;
  }

  return { isMultiPage: true, cutoff: Math.max(1, cutoff) };
}

export function CoveringLetterDocument({
  documentId = "covering-letter-print-root",
  number,
  hasNumber = true,
  regarding,
  documentDate,
  recipientTitle,
  recipientLocation,
  items,
  closingPhrase,
  receivedDate,
  showSignatures = true,
  showReceiverSignature = true,
  receiverIsBlank = false,
  receiverIncludePhone = false,
  receiverPhone,
  sender,
  receiver,
}: CoveringLetterDocumentProps) {
  const displayDocNumber = hasNumber === false || number === "-" ? "-" : (number || "PL.02.06/S-52/PW17.1/2026");

  const measureContainerRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState<{ isMultiPage: boolean; cutoff: number }>(() => estimateInitialCutoff(items));

  useIsomorphicLayoutEffect(() => {
    if (!measureContainerRef.current) return;
    const pageEl = measureContainerRef.current.querySelector<HTMLElement>(".covering-page");
    if (!pageEl) return;

    const pageRect = pageEl.getBoundingClientRect();
    const PAGE_1_MAX_BOTTOM_PX = 1020;

    // 1. Check if everything fits on Page 1 (including closing block and signatures)
    const closingEl = measureContainerRef.current.querySelector<HTMLElement>(".measure-closing-block");
    if (closingEl) {
      const closingBottom = closingEl.getBoundingClientRect().bottom - pageRect.top;
      if (closingBottom <= PAGE_1_MAX_BOTTOM_PX) {
        setPagination({ isMultiPage: false, cutoff: items.length });
        return;
      }
    }

    // 2. Multi-page: find first row that exceeds Page 1 bottom
    const rows = measureContainerRef.current.querySelectorAll<HTMLTableRowElement>(".measure-row");
    let firstOverflowIndex = items.length;
    for (let i = 0; i < rows.length; i++) {
      const rowBottom = rows[i].getBoundingClientRect().bottom - pageRect.top;
      if (rowBottom > PAGE_1_MAX_BOTTOM_PX) {
        firstOverflowIndex = i;
        break;
      }
    }

    let finalCutoff = firstOverflowIndex;
    if (finalCutoff === items.length && items.length > 3) {
      finalCutoff = Math.max(1, items.length - 3);
    }

    setPagination({
      isMultiPage: true,
      cutoff: Math.max(1, finalCutoff),
    });
  }, [items, regarding, documentDate, recipientTitle, recipientLocation, showSignatures, showReceiverSignature, receiverIsBlank, receiverIncludePhone]);

  const isMultiPage = pagination.isMultiPage && pagination.cutoff < items.length;
  const page1Items = isMultiPage ? items.slice(0, pagination.cutoff) : items;
  const page2Items = isMultiPage ? items.slice(pagination.cutoff) : [];

  return (
    <div id={documentId} className="covering-document-wrapper">
      <style jsx>{`
        .covering-document-wrapper {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          line-height: 1.35;
          font-size: 10pt;
          width: 100%;
        }
        .covering-page {
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 3.5mm 12mm 15mm;
          background: #fff;
          box-sizing: border-box;
          position: relative;
        }
        .covering-header {
          margin: 0 -6mm;
          text-align: center;
        }
        .covering-header img {
          width: 100%;
          max-width: 188mm;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .covering-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 5mm;
          gap: 8px;
        }
        .covering-meta-left {
          flex: 1;
          min-width: 0;
        }
        .covering-meta-right {
          text-align: right;
          white-space: nowrap;
          font-size: 10pt;
        }
        .covering-meta-item {
          display: grid;
          grid-template-columns: 18mm 4mm 1fr;
          align-items: flex-start;
          margin-bottom: 1.5mm;
        }
        .covering-meta-label {
          font-weight: normal;
        }
        .covering-meta-colon {
          text-align: center;
        }
        .covering-meta-val {
          text-align: left;
          word-break: break-word;
          line-height: 1.3;
        }
        .covering-recipient-block {
          margin-top: 5mm;
          margin-bottom: 4mm;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .covering-recipient-block p {
          margin: 0 0 0.5mm 0;
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .covering-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4mm;
          margin-bottom: 4mm;
          font-size: 9.5pt;
          table-layout: fixed;
        }
        .covering-table th,
        .covering-table td {
          border: 1px solid #000;
          padding: 5px 6px;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .covering-table th {
          font-weight: bold;
          text-align: center;
        }
        .covering-table thead {
          display: table-header-group;
        }
        .covering-table thead tr.table-number-row th {
          font-weight: normal;
          padding: 1px 0;
          font-size: 8.5pt;
          text-align: center;
        }
        .covering-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .page-continuation-spacer {
          height: 10mm;
          margin: 6mm 0 4mm 0;
          border-top: 2px dashed #cbd5e1;
          position: relative;
          page-break-before: always;
          break-before: page;
        }
        .page-continuation-spacer::after {
          content: "Halaman 2";
          position: absolute;
          top: -9px;
          right: 0;
          font-size: 8pt;
          color: #94a3b8;
          background: #fff;
          padding: 0 6px;
        }
        .covering-closing-block,
        .avoid-break {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          margin-top: 4mm;
        }
        .covering-received-date {
          margin-top: 4mm;
          font-size: 10pt;
        }
        .covering-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20mm;
          margin-top: 6mm;
          text-align: left;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .covering-signatures.sender-only {
          justify-content: flex-end;
        }
        .covering-sig-left,
        .covering-sig-right {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          width: fit-content;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .covering-sig-left {
          max-width: 48%;
        }
        .covering-sig-right {
          max-width: 52%;
        }
        .covering-sig-role {
          min-height: 10mm;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          text-align: left;
        }
        .covering-sig-role p,
        .covering-sig-name,
        .covering-sig-id,
        .covering-sig-phone {
          white-space: nowrap;
        }
        .covering-sig-name {
          margin-top: 28mm;
          font-weight: bold;
          text-align: left;
          white-space: nowrap;
          min-height: 1.2em;
        }
        .covering-sig-id {
          white-space: nowrap;
        }
        .covering-sig-phone {
          white-space: nowrap;
          margin-top: 1mm;
          font-size: 9.5pt;
        }
        @media print {
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          .covering-document-wrapper {
            background: transparent;
          }
          .covering-page {
            box-shadow: none !important;
            margin: 0;
            padding: 0 12mm 10mm;
            width: 210mm !important;
            max-width: 210mm !important;
          }
          .covering-header {
            margin: 0 -6mm;
          }
          .covering-header img {
            width: 188mm;
            max-width: 188mm;
          }
          .covering-recipient-block {
            margin-top: 6mm;
            margin-bottom: 5mm;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .covering-recipient-block p {
            margin-bottom: 0.5mm;
            word-break: break-word;
            overflow-wrap: anywhere;
            white-space: pre-wrap;
          }
          .covering-table thead {
            display: table-header-group;
          }
          .covering-table thead tr.table-number-row th {
            font-weight: normal;
            padding: 1px 0;
            font-size: 8.5pt;
            text-align: center;
          }
          .covering-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .page-continuation-spacer {
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            page-break-before: always !important;
            break-before: page !important;
          }
          .page-continuation-spacer::after {
            display: none !important;
          }
          .covering-closing-block,
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-top: 4mm;
          }
          .covering-signatures {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20mm;
            text-align: left;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .covering-signatures.sender-only {
            justify-content: flex-end;
          }
          .covering-sig-left,
          .covering-sig-right {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            width: fit-content;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .covering-sig-role p,
          .covering-sig-name,
          .covering-sig-id,
          .covering-sig-phone {
            white-space: nowrap;
          }
          .covering-sig-name {
            margin-top: 28mm;
            font-weight: bold;
            text-align: left;
            white-space: nowrap;
            min-height: 1.2em;
          }
          .covering-sig-id {
            white-space: nowrap;
          }
          .covering-sig-phone {
            white-space: nowrap;
            margin-top: 1mm;
            font-size: 9.5pt;
          }
          .covering-measure-container {
            display: none !important;
          }
        }
        .covering-measure-container {
          position: absolute !important;
          left: -99999px !important;
          top: 0 !important;
          width: 210mm !important;
          visibility: hidden !important;
          pointer-events: none !important;
          opacity: 0 !important;
          z-index: -9999 !important;
        }
      `}</style>

      <article className="covering-page shadow-xl ring-1 ring-zinc-200">
        <div className="covering-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header.png" alt="Kop Surat" />
        </div>

        <div className="covering-meta-row">
          <div className="covering-meta-left">
            <div className="covering-meta-item">
              <span className="covering-meta-label">Nomor</span>
              <span className="covering-meta-colon">:</span>
              <span className="covering-meta-val">{displayDocNumber}</span>
            </div>
            <div className="covering-meta-item">
              <span className="covering-meta-label">Hal</span>
              <span className="covering-meta-colon">:</span>
              <span className="covering-meta-val">
                {regarding || "Surat Pengantar Penyerahan Dokumen Permohonan Pengajuan Lelang dan Dokumen Pengumuman Lelang"}
              </span>
            </div>
          </div>
          <div className="covering-meta-right">
            <span>{formatIndonesianDate(documentDate)}</span>
          </div>
        </div>

        <div className="covering-recipient-block">
          <p>Yth. {recipientTitle || "Kepala Kantor Pelayanan Kekayaan Negara dan Lelang"}</p>
          <p>di {recipientLocation || "Samarinda"}</p>
        </div>

        <table className="covering-table">
          <thead style={{ display: "table-header-group" }}>
            <tr>
              <th style={{ width: "6%" }}>No.</th>
              <th style={{ width: "44%" }}>Berkas yang dikirim</th>
              <th style={{ width: "18%" }}>Banyaknya</th>
              <th style={{ width: "32%" }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {page1Items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#666", padding: "12px" }}>
                  Belum ada berkas ditambahkan.
                </td>
              </tr>
            ) : (
              page1Items.map((item, index) => (
                <tr key={item.id || index}>
                  <td style={{ textAlign: "center" }}>{index + 1}.</td>
                  <td style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>{fallback(item.title)}</td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{fallback(item.quantity)}</td>
                  <td style={{ textAlign: "left" }}>{fallback(item.description)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Page 2 Table (if multi-page) */}
        {isMultiPage && page2Items.length > 0 && (
          <>
            <div className="page-continuation-spacer" />
            <table className="covering-table">
              <thead>
                <tr className="table-number-row">
                  <th style={{ width: "6%" }}>1</th>
                  <th style={{ width: "44%" }}>2</th>
                  <th style={{ width: "18%" }}>3</th>
                  <th style={{ width: "32%" }}>4</th>
                </tr>
                <tr>
                  <th style={{ width: "6%" }}>No.</th>
                  <th style={{ width: "44%" }}>Berkas yang dikirim</th>
                  <th style={{ width: "18%" }}>Banyaknya</th>
                  <th style={{ width: "32%" }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {page2Items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: "center" }}>{page1Items.length + index + 1}.</td>
                    <td style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>{fallback(item.title)}</td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{fallback(item.quantity)}</td>
                    <td style={{ textAlign: "left" }}>{fallback(item.description)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Bagian Penutup & Tanda Tangan: 1 kesatuan (unbreakable, turun semua jika berkas banyak) */}
        <div className="covering-closing-block avoid-break">
          <p style={{ marginTop: "4mm", textAlign: "justify", lineHeight: 1.35 }}>
            {closingPhrase || "Demikian kami sampaikan, atas perhatian dan kerja sama yang baik kami mengucapkan terima kasih."}
          </p>

          {receivedDate && (
            <div className="covering-received-date">
              <span>Diterima tanggal &nbsp; : {formatIndonesianDate(receivedDate)}</span>
            </div>
          )}

          {showSignatures && (
            <div className={`covering-signatures ${!showReceiverSignature ? "sender-only" : ""}`}>
              {showReceiverSignature && (
                <div className="covering-sig-left">
                  {renderRoleLines(receiver?.role || "Penerima,\nPejabat Lelang")}
                  <p className="covering-sig-name" style={{ minHeight: "1.2em" }}>
                    {receiver?.name && receiver.name.trim() ? signatureName(receiver.name) : "\u00A0"}
                  </p>
                  {receiver?.nip && receiver.nip.trim() !== "-" ? (
                    <p className="covering-sig-id">
                      {receiver.nip.startsWith(" ") || receiver.nip.trim() === ""
                        ? `${receiver.idType === "NIK" ? "NIK." : "NIP."}`
                        : `${receiver.idType === "NIK" ? "NIK." : "NIP."} ${receiver.idType === "NIK" ? receiver.nip.trim() : formatNip(receiver.nip)}`.trim()}
                    </p>
                  ) : null}
                  {receiverIncludePhone && (
                    <p className="covering-sig-phone">
                      No. Telp / HP : {receiverPhone?.trim() || ""}
                    </p>
                  )}
                </div>
              )}

              <div className="covering-sig-right">
                {renderRoleLines(sender.role || "Pengirim,\nPenjual Lelang")}
                <p className="covering-sig-name">{signatureName(sender.name || "Heryanto Sumanbowo, S.Hut.")}</p>
                <p className="covering-sig-id">
                  {sender?.nip && sender.nip.trim() !== "-"
                    ? (sender.nip.startsWith(" ") || sender.nip.trim() === ""
                      ? `${sender.idType === "NIK" ? "NIK." : "NIP."}`
                      : `${sender.idType === "NIK" ? "NIK." : "NIP."} ${sender.idType === "NIK" ? sender.nip.trim() : formatNip(sender.nip)}`.trim())
                    : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Hidden measurement container to accurately compute DOM page overflow */}
      <div
        ref={measureContainerRef}
        aria-hidden="true"
        className="covering-measure-container"
      >
        <article className="covering-page">
          <div className="covering-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/header.png" alt="" />
          </div>

          <div className="covering-meta-row">
            <div className="covering-meta-left">
              <div className="covering-meta-item">
                <span className="covering-meta-label">Nomor</span>
                <span className="covering-meta-colon">:</span>
                <span className="covering-meta-val">{displayDocNumber}</span>
              </div>
              <div className="covering-meta-item">
                <span className="covering-meta-label">Hal</span>
                <span className="covering-meta-colon">:</span>
                <span className="covering-meta-val">{regarding || "Surat Pengantar"}</span>
              </div>
            </div>
            <div className="covering-meta-right">
              <span>{formatIndonesianDate(documentDate)}</span>
            </div>
          </div>

          <div className="covering-recipient-block">
            <p>Yth. {recipientTitle || "Kepala..."}</p>
            <p>di {recipientLocation || "Samarinda"}</p>
          </div>

          <table className="covering-table">
            <thead>
              <tr>
                <th style={{ width: "6%" }}>No.</th>
                <th style={{ width: "44%" }}>Berkas yang dikirim</th>
                <th style={{ width: "18%" }}>Banyaknya</th>
                <th style={{ width: "32%" }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index} className="measure-row">
                  <td style={{ textAlign: "center" }}>{index + 1}.</td>
                  <td style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>{fallback(item.title)}</td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{fallback(item.quantity)}</td>
                  <td style={{ textAlign: "left" }}>{fallback(item.description)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="covering-closing-block measure-closing-block">
            <p style={{ marginTop: "4mm", textAlign: "justify", lineHeight: 1.35 }}>
              {closingPhrase || "Demikian kami sampaikan..."}
            </p>
            {receivedDate && (
              <div className="covering-received-date">
                <span>Diterima tanggal &nbsp; : {formatIndonesianDate(receivedDate)}</span>
              </div>
            )}
            {showSignatures && (
              <div className="covering-signatures">
                {showReceiverSignature && (
                  <div className="covering-sig-left">
                    <div className="covering-sig-role"><p><strong>Penerima</strong></p></div>
                    <p className="covering-sig-name">Nama</p>
                  </div>
                )}
                <div className="covering-sig-right">
                  <div className="covering-sig-role"><p><strong>Pengirim</strong></p></div>
                  <p className="covering-sig-name">Nama</p>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
