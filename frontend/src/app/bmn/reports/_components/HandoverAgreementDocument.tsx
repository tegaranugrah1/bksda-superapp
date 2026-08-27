"use client";

import { toast } from "sonner";

export type HandoverVariant = "general_goods" | "vehicle";

export interface HandoverParty {
  name: string;
  idType?: "NIP" | "NIK" | string;
  nip?: string | null;
  rank?: string | null;
  position?: string | null;
  address?: string | null;
}

export interface HandoverWitness {
  name?: string | null;
  nip?: string | null;
  position?: string | null;
  label?: string | null;
}

export interface HandoverItem {
  asset_id?: string | null;
  name?: string | null;
  quantity?: number | null;
  nup?: string | null;
  vehicle_type?: string | null;
  merk_tipe?: string | null;
  no_polisi?: string | null;
  no_mesin?: string | null;
  no_rangka?: string | null;
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_geotag_url?: string | null;
  foto_url?: string | null;
  photos?: string[];
}

interface HandoverAgreementDocumentProps {
  documentId?: string;
  variant: HandoverVariant;
  title: string;
  number: string;
  documentDate: string;
  firstParty: HandoverParty;
  secondParty: HandoverParty;
  items: HandoverItem[];
  description?: string;
  receiptClause?: string;
  signerCount?: 2 | 3;
  witness?: HandoverWitness | null;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const SMALL_NUMBERS = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function spellNumber(value: number): string {
  if (value < 12) return SMALL_NUMBERS[value];
  if (value < 20) return `${spellNumber(value - 10)} Belas`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    return `${spellNumber(tens)} Puluh${rest ? ` ${spellNumber(rest)}` : ""}`;
  }
  if (value < 200) return `Seratus${value > 100 ? ` ${spellNumber(value - 100)}` : ""}`;
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    return `${spellNumber(hundreds)} Ratus${rest ? ` ${spellNumber(rest)}` : ""}`;
  }
  if (value < 2000) return `Seribu${value > 1000 ? ` ${spellNumber(value - 1000)}` : ""}`;
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  return `${spellNumber(thousands)} Ribu${rest ? ` ${spellNumber(rest)}` : ""}`;
}

function parseDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatSpelledDate(value: string) {
  const date = parseDate(value);
  return {
    day: DAYS[date.getDay()],
    dateText: spellNumber(date.getDate()),
    month: MONTHS[date.getMonth()],
    yearText: spellNumber(date.getFullYear()),
  };
}

function fallback(value?: string | number | null) {
  const text = `${value ?? ""}`.trim();
  return text || "-";
}

function dataCell(value?: string | number | null) {
  const text = fallback(value);
  return <td className={text === "-" ? "handover-cell-center" : "handover-cell-left"}>{text}</td>;
}

function displayName(value?: string | null) {
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

function signatureName(value?: string | null) {
  const name = displayName(value);
  if (name === "-") return name;
  const [mainName, ...suffix] = name.split(",");
  const upperMain = mainName.trim().toLocaleUpperCase("id-ID");
  return suffix.length > 0 ? `${upperMain},${suffix.join(",")}` : upperMain;
}

function renderFormattedClause(text: string) {
  if (!text) return null;
  const parts = text.split(/(PIHAK KESATU|PIHAK KEDUA)/g);
  return (
    <>
      {parts.map((part, i) =>
        part === "PIHAK KESATU" || part === "PIHAK KEDUA" ? (
          <strong key={i}>{part}</strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function convertDriveUrl(url: string): string {
  if (!url.includes("drive.google.com") && !url.includes("docs.google.com")) {
    return url;
  }
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w800`;
  }
  return url;
}

function resolvePhotoUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const driveConverted = convertDriveUrl(trimmed);
  if (driveConverted !== trimmed) {
    return driveConverted;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  }
  return trimmed;
}

function getItemPrintPhotos(item: HandoverItem): string[] {
  const rawUrls: string[] = [];

  if (item.photos && Array.isArray(item.photos)) {
    rawUrls.push(...item.photos.filter(Boolean));
  }
  if (item.foto_depan_url) rawUrls.push(item.foto_depan_url);
  if (item.foto_belakang_url) rawUrls.push(item.foto_belakang_url);
  if (item.foto_kiri_url) rawUrls.push(item.foto_kiri_url);
  if (item.foto_kanan_url) rawUrls.push(item.foto_kanan_url);
  if (item.foto_geotag_url) rawUrls.push(item.foto_geotag_url);
  if (item.foto_url) rawUrls.push(item.foto_url);

  const resolved = Array.from(new Set(rawUrls.map(resolvePhotoUrl).filter(Boolean) as string[]));
  return resolved.slice(0, 2);
}

function chunkPhotoItems<T>(array: T[], size = 3): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function handlePrintHandoverAgreement(documentId = "ba-serah-terima-print-root") {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Tidak ada dokumen BA Serah Terima untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>BA Serah Terima BMN</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.22; }
          p { margin: 0; }
          .handover-page { width: 210mm; margin: 0 auto; padding: 0 20mm 10mm; }
          .handover-header { margin: 0 -12mm; text-align: center; }
          .handover-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          .handover-title { margin-top: 5mm; text-align: center; font-weight: 700; }
          .handover-body { margin-top: 5mm; text-align: justify; }
          .handover-party { display: grid; grid-template-columns: 7mm 1fr; column-gap: 4mm; margin: 4mm 0; }
          .handover-rows { display: grid; grid-template-columns: 26mm 5mm minmax(0, 1fr); align-items: flex-start; margin-bottom: 0.5mm; }
          .handover-colon { text-align: center; }
          .handover-val { text-align: left; word-break: break-word; overflow-wrap: break-word; line-height: 1.25; }
          .handover-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm; font-size: 8.4pt; text-align: center; }
          .handover-table th, .handover-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
          .handover-table td.handover-cell-left { text-align: left; }
          .handover-table td.handover-cell-center { text-align: center; }
          .handover-table thead tr.table-number-row th { font-weight: 400; padding: 1px 0; font-size: 8.4pt; }
          .handover-table tr { break-inside: avoid; page-break-inside: avoid; }
          .handover-signatures { display: flex; justify-content: space-between; align-items: flex-start; gap: 20mm; margin-top: 4mm; text-align: left; }
          .handover-sig-left { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; max-width: 48%; }
          .handover-sig-right { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; max-width: 52%; }
          .handover-sig-left p, .handover-sig-right p, .handover-signature-name { white-space: nowrap; }
          .handover-signature-name { margin-top: 20mm; font-weight: 700; white-space: nowrap; }
          .handover-witness-block { margin-top: 6mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
          .page-continuation-spacer { height: 15mm; page-break-before: always; break-before: page; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }

          /* Lampiran Foto Styles */
          .photo-lampiran-page {
            page-break-before: always;
            break-before: page;
            width: 210mm;
            margin: 0 auto;
            padding: 0 20mm 10mm;
          }
          .photo-lampiran-title {
            margin-top: 3mm;
            margin-bottom: 5mm;
            text-align: center;
            font-weight: 700;
            font-size: 10pt;
          }
          .photo-asset-block {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8mm;
            text-align: center;
          }
          .photo-asset-title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            font-weight: 400;
            margin-bottom: 3mm;
            text-align: center;
          }
          .photo-grid-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8mm;
          }
          .photo-img {
            width: 82mm;
            height: 60mm;
            object-fit: contain;
            background-color: transparent;
            border: none;
          }
          .photo-placeholder {
            width: 82mm;
            height: 60mm;
            border: 1px dashed #ccc;
            background: #f9fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 8.5pt;
          }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  const images = printWindow.document.getElementsByTagName("img");
  let loaded = 0;
  const total = images.length;
  const doPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (total === 0) {
    setTimeout(doPrint, 300);
  } else {
    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        loaded++;
      } else {
        images[i].onload = images[i].onerror = () => {
          loaded++;
          if (loaded >= total) doPrint();
        };
      }
    }
    if (loaded >= total) {
      setTimeout(doPrint, 300);
    }
  }
}

function PartyBlock({ index, party, label }: { index: number; party: HandoverParty; label: string }) {
  const idLabel = party.idType === "NIK" ? "NIK" : "NIP";
  const positionLabel = party.idType === "NIK" ? "Pekerjaan" : "Jabatan";
  return (
    <div className="handover-party">
      <div>{index}</div>
      <div>
        <div className="handover-rows"><span>Nama</span><span className="handover-colon">:</span><span className="handover-val">{displayName(party.name)}</span></div>
        <div className="handover-rows"><span>{idLabel}</span><span className="handover-colon">:</span><span className="handover-val">{fallback(party.nip)}</span></div>
        <div className="handover-rows"><span>{positionLabel}</span><span className="handover-colon">:</span><span className="handover-val">{fallback(party.position)}</span></div>
        <div className="handover-rows"><span>Alamat</span><span className="handover-colon">:</span><span className="handover-val">{fallback(party.address)}</span></div>
        <p style={{ marginTop: "1mm" }}>Selanjutnya disebut <strong>{label}</strong></p>
      </div>
    </div>
  );
}

const DEFAULT_RECEIPT_CLAUSE = "PIHAK KEDUA telah menerima barang tersebut dalam keadaan baik dan dapat dipergunakan dengan baik, dengan diserahkan barang tersebut dari PIHAK KESATU kepada PIHAK KEDUA, maka pengelolaan barang tersebut menjadi tanggung jawab PIHAK KEDUA.";

export function HandoverAgreementDocument({
  documentId = "ba-serah-terima-print-root",
  variant,
  title,
  number,
  documentDate,
  firstParty,
  secondParty,
  items,
  description,
  receiptClause = DEFAULT_RECEIPT_CLAUSE,
  signerCount = 2,
  witness,
}: HandoverAgreementDocumentProps) {
  const { day, dateText, month, yearText } = formatSpelledDate(documentDate);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const itemCountText = `${itemCount} (${spellNumber(itemCount).toLocaleLowerCase("id-ID")})`;
  const itemDescription = (description || (variant === "vehicle" ? "kendaraan" : "barang")).trim();

  // Dynamic pagination threshold
  const PAGE_1_MAX_ITEMS = signerCount === 3 ? 12 : 17;
  const isMultiPage = items.length > PAGE_1_MAX_ITEMS;
  const page1Items = isMultiPage ? items.slice(0, PAGE_1_MAX_ITEMS) : items;
  const page2Items = isMultiPage ? items.slice(PAGE_1_MAX_ITEMS) : [];

  // Group items for Photo Lampiran pages (3 items per page with Kop Surat header)
  const photoPages = chunkPhotoItems(items, 3);

  const firstPartyIdPrefix = firstParty.idType === "NIK" ? "NIK." : "NIP.";
  const secondPartyIdPrefix = secondParty.idType === "NIK" ? "NIK." : "NIP.";

  return (
    <div id={documentId}>
      <style jsx global>{`
        .handover-preview .handover-page { width: 210mm; max-width: 100%; margin: 0 auto; padding: 5mm 20mm 10mm; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.22; }
        .handover-preview p { margin: 0; }
        .handover-preview .handover-header { margin: 0 -12mm; text-align: center; }
        .handover-preview .handover-header img { width: 188mm; max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .handover-preview .handover-title { margin-top: 5mm; text-align: center; font-weight: 700; }
        .handover-preview .handover-body { margin-top: 5mm; text-align: justify; }
        .handover-preview .handover-party { display: grid; grid-template-columns: 7mm 1fr; column-gap: 4mm; margin: 4mm 0; }
        .handover-preview .handover-rows { display: grid; grid-template-columns: 26mm 5mm minmax(0, 1fr); align-items: flex-start; margin-bottom: 0.5mm; }
        .handover-preview .handover-colon { text-align: center; }
        .handover-preview .handover-val { text-align: left; word-break: break-word; overflow-wrap: break-word; line-height: 1.25; }
        .handover-preview .handover-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm; font-size: 8.4pt; text-align: center; }
        .handover-preview .handover-table th,
        .handover-preview .handover-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
        .handover-preview .handover-table td.handover-cell-left { text-align: left; }
        .handover-preview .handover-table td.handover-cell-center { text-align: center; }
        .handover-preview .handover-table thead { display: table-header-group; }
        .handover-preview .handover-table thead tr.table-number-row th { font-weight: 400; padding: 1px 0; font-size: 8.4pt; }
        .handover-preview .handover-table tr { break-inside: avoid; page-break-inside: avoid; }
        .handover-preview .handover-signatures { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-top: 4mm; text-align: left; }
        .handover-preview .handover-sig-left { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; max-width: 48%; }
        .handover-preview .handover-sig-right { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; max-width: 52%; }
        .handover-preview .handover-sig-left p, .handover-preview .handover-sig-right p, .handover-preview .handover-signature-name { white-space: nowrap; }
        .handover-preview .handover-signature-name { margin-top: 20mm; font-weight: 700; white-space: nowrap; }
        .handover-preview .handover-witness-block { margin-top: 6mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
        .handover-preview .page-continuation-spacer { height: 15mm; page-break-before: always; break-before: page; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }

        /* Lampiran Foto Styles */
        .handover-preview .photo-lampiran-page {
          page-break-before: always;
          break-before: page;
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 5mm 20mm 10mm;
          background: white;
        }
        .handover-preview .photo-lampiran-title {
          margin-top: 3mm;
          margin-bottom: 5mm;
          text-align: center;
          font-weight: 700;
          font-size: 10pt;
        }
        .photo-asset-block {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 8mm;
          text-align: center;
        }
        .photo-asset-title {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          font-weight: 400;
          margin-bottom: 3mm;
          text-align: center;
        }
        .photo-grid-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8mm;
        }
        .photo-img {
          width: 82mm;
          height: 60mm;
          object-fit: contain;
          background-color: transparent;
          border: none;
        }
        .photo-placeholder {
          width: 82mm;
          height: 60mm;
          border: 1px dashed #ccc;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 8.5pt;
        }
        @media print {
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          body * { visibility: hidden; }
          #ba-serah-terima-print-root, #ba-serah-terima-print-root * { visibility: visible; }
          #ba-serah-terima-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; }
          .handover-page { box-shadow: none !important; }
          .photo-lampiran-page { box-shadow: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="handover-preview">
        <article className="handover-page shadow-xl ring-1 ring-zinc-200">
          <div className="handover-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/header-terbaru.png" alt="Kop Surat" />
          </div>

          <div className="handover-title">
            <p>{title.toLocaleUpperCase("id-ID")}</p>
            <p>NOMOR : {number || "BA.___/K.18/TU/KAP.03.02/B/__/____"}</p>
          </div>

          <div className="handover-body">
            <p>Pada hari ini {day} tanggal {dateText} bulan {month} tahun {yearText}, yang bertanda tangan di bawah ini:</p>
            <PartyBlock index={1} party={firstParty} label="PIHAK KESATU" />
            <PartyBlock index={2} party={secondParty} label="PIHAK KEDUA" />

            <p><strong>PIHAK KESATU</strong> telah menyerahkan barang kepada <strong>PIHAK KEDUA</strong> berupa {itemCountText} unit {itemDescription} sebagai berikut:</p>

            {/* Table */}
            {variant === "vehicle" ? (
              <table className="handover-table">
                <colgroup>
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "26%" }} />
                </colgroup>
                <thead>
                  <tr><th>No</th><th>Jenis Kendaraan</th><th>No. Polisi</th><th>No. Mesin</th><th>No. Rangka</th></tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.vehicle_type || item.merk_tipe}-${index}`}>
                      <td>{index + 1}</td>
                      {dataCell(item.merk_tipe || item.vehicle_type)}
                      {dataCell(item.no_polisi)}
                      {dataCell(item.no_mesin)}
                      {dataCell(item.no_rangka)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="handover-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "62%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <thead>
                  <tr><th>No</th><th>Nama Barang</th><th>Jumlah</th><th>NUP</th></tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{index + 1}</td>
                      {dataCell(item.name)}
                      {dataCell(item.quantity)}
                      {dataCell(item.nup)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p style={{ marginTop: "3mm" }}>
              {renderFormattedClause(receiptClause)}
            </p>

            {/* Signature Block (Always keeps closing text TOGETHER with signatures on the same page) */}
            <div className="handover-signature-block avoid-break">
              <p style={{ marginTop: "3mm" }}>
                Demikian {(() => {
                  const cleanTitle = (title || (variant === "vehicle" ? "Berita Acara Serah Terima Kendaraan" : "Berita Acara Serah Terima Barang")).trim();
                  if (/^berita acara/i.test(cleanTitle)) {
                    return cleanTitle;
                  }
                  return `Berita Acara ${cleanTitle}`;
                })()} ini dibuat dengan sebenarnya, ditandatangani masing-masing kedua belah pihak pada tanggal tersebut di atas untuk dipergunakan sebagaimana mestinya.
              </p>
              <div className="handover-signatures">
                <div className="handover-sig-left">
                  <p><strong>PIHAK KEDUA,</strong></p>
                  <p className="handover-signature-name">{signatureName(secondParty.name)}</p>
                  <p>{secondPartyIdPrefix} {fallback(secondParty.nip)}</p>
                </div>
                <div className="handover-sig-right">
                  <p><strong>PIHAK KESATU,</strong></p>
                  <p className="handover-signature-name">{signatureName(firstParty.name)}</p>
                  <p>{firstPartyIdPrefix} {fallback(firstParty.nip)}</p>
                </div>
              </div>

              {signerCount === 3 && (
                <div className="handover-witness-block">
                  <p>{witness?.label || "Mengetahui,"}</p>
                  <p style={{ maxWidth: "85mm", margin: "0 auto" }}>
                    {(() => {
                      const pos = (witness?.position || "KEPALA BALAI,").trim();
                      if (/^kepala balai konservasi sumber daya alam/i.test(pos)) {
                        return "KEPALA BALAI,";
                      }
                      return pos.endsWith(",") ? pos : `${pos},`;
                    })()}
                  </p>
                  <p className="handover-signature-name" style={{ marginTop: "18mm" }}>{signatureName(witness?.name || "M. Ari Wibawanto, S.Hut., M.Sc.")}</p>
                  <p>NIP. {fallback(witness?.nip || "19740514 199903 1 001")}</p>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Halaman Baru Lampiran Dokumentasi Foto Aset BMN (3 Aset per Halaman Memenuhi Layar) */}
        {photoPages.map((pageGroup, pageIndex) => (
          <article key={`photo-page-${pageIndex}`} className="photo-lampiran-page shadow-xl ring-1 ring-zinc-200 mt-6">
            <div className="handover-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/header-terbaru.png" alt="Kop Surat" />
            </div>

            {/* Title ONLY on pageIndex === 0 */}
            {pageIndex === 0 && (
              <div className="photo-lampiran-title">
                <p>LAMPIRAN DOKUMENTASI FOTO BARANG MILIK NEGARA</p>
              </div>
            )}

            {pageGroup.map((item, index) => {
              const photos = getItemPrintPhotos(item);
              const itemName = item.name || item.vehicle_type || `Barang #${index + 1}`;
              return (
                <div key={`photo-${index}`} className="photo-asset-block avoid-break">
                  <p className="photo-asset-title">
                    {itemName} ( NUP {item.nup || "-"} )
                  </p>
                  <div className="photo-grid-row">
                    {photos.length > 0 ? (
                      photos.map((photoUrl, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={photoUrl}
                          alt={`${itemName} ${idx + 1}`}
                          className="photo-img"
                        />
                      ))
                    ) : (
                      <>
                        <div className="photo-placeholder">
                          <span>Foto 1 (Tampak Depan)</span>
                        </div>
                        <div className="photo-placeholder">
                          <span>Foto 2 (Tampak Belakang)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </div>
  );
}
