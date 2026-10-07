import { toast } from "sonner";
import type { HandoverParty, HandoverItem } from "../_components/HandoverAgreementDocument";

export interface EmployeeOption {
  id: number;
  nama_lengkap: string;
  nip: string;
  jabatan?: string | null;
  pangkat_golongan?: string | null;
  satuan_kerja?: string | null;
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthNumber(value: string): string {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return String((Number.isNaN(date.getTime()) ? new Date() : date).getMonth() + 1).padStart(2, "0");
}

export function yearNumber(value: string): number {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).getFullYear();
}

export const EMPTY_DOC_NUMBER_GAP = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";

export function buildBaNumber(sequence: string, kap: string, documentDate: string): string {
  const seq = sequence.trim() || EMPTY_DOC_NUMBER_GAP;
  return `BA.${seq}/K.18/TU/${kap.trim() || "KAP.03.02"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

export function buildPoaNumber(sequence: string, kap: string, documentDate: string): string {
  const seq = sequence.trim() || EMPTY_DOC_NUMBER_GAP;
  return `KS.${seq}/K.18/TU/${kap.trim() || "KAP.03.02"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

export function buildCoveringNumber(sequence: string, kap: string, documentDate: string): string {
  const seq = sequence.trim() || EMPTY_DOC_NUMBER_GAP;
  return `SP.${seq}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

export function formatDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatNip(nip?: string | null, fallback = "-"): string {
  if (!nip) return fallback;
  const trimmed = nip.trim();
  if (trimmed === "" || trimmed === "-") return fallback;
  if (trimmed.startsWith("MMP-")) return fallback;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 18) {
    return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 18)}`;
  }
  return trimmed;
}

export function employeeToHandoverParty(employee?: EmployeeOption | null): HandoverParty {
  return {
    name: employee?.nama_lengkap || "",
    nip: formatNip(employee?.nip),
    rank: employee?.pangkat_golongan || "",
    position: employee?.jabatan || "",
    address: "Jl. Teuku Umar Samarinda.",
  };
}

export function emptyGeneralItem(): HandoverItem {
  return { name: "", merk_tipe: "", quantity: 1, nup: "" };
}

export function isDraftNumber(num?: string | null): boolean {
  if (!num || num === "-" || num.trim() === "") return true;
  if (num.includes("\u00A0") || /^(?:BA|KS|SP)\.\s*\//i.test(num)) return true;
  return false;
}

export function extractDocumentSequence(num?: string | null): string {
  if (!num || isDraftNumber(num)) return "";
  const match = num.match(/^(?:BA|KS|SP)\.([^\/]+)\//i);
  if (match) {
    const seq = match[1].replace(/\u00A0/g, "").trim();
    return seq;
  }
  return "";
}

export function extractDocumentKap(num?: string | null): string | null {
  if (!num) return null;
  const match = num.match(/^(?:BA|KS|SP)\.[^\/]+\/K\.18\/TU\/([^\/]+)\//i);
  return match ? match[1] : null;
}

/* ==========================================================================
   Shared Text, Spelling, and Date Helpers for Report Documents
   ========================================================================== */

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const SMALL_NUMBERS = [
  "Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam",
  "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
];

export function spellNumber(value: number): string {
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

export function parseDate(value?: string | null): Date {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatSpelledDate(value: string) {
  const date = parseDate(value);
  return {
    day: DAYS[date.getDay()],
    dateText: spellNumber(date.getDate()),
    month: MONTHS[date.getMonth()],
    yearText: spellNumber(date.getFullYear()),
  };
}

export function formatIndonesianDate(value?: string | null): string {
  if (!value) return "";
  const date = parseDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function fallback(value?: string | number | null): string {
  const text = `${value ?? ""}`.trim();
  return text || "-";
}

export function displayName(value?: string | null): string {
  const text = fallback(value);
  if (text === "-") return text;
  if (/[a-z]/.test(text)) return text;

  return text
    .toLocaleLowerCase("id-ID")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("id-ID"))
    .replace(/\bS\.hut\./gi, "S.Hut.")
    .replace(/\bM\.sc\./gi, "M.Sc.")
    .replace(/\bA\.md\.kom\./gi, "A.Md.Kom.")
    .replace(/\bM\.t\./gi, "M.T.")
    .replace(/\bM\.p\./gi, "M.P.")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III")
    .replace(/\bIv\b/g, "IV");
}

export function signatureName(value?: string | null): string {
  const name = displayName(value);
  if (name === "-") return "";
  const [mainName, ...suffix] = name.split(",");
  const upperMain = mainName.trim().toLocaleUpperCase("id-ID");
  return suffix.length > 0 ? `${upperMain},${suffix.join(",")}` : upperMain;
}

export function displayRank(value?: string | null): string {
  const rank = fallback(value);
  if (rank === "-") return rank;

  return rank.replace(
    /\s+\/\s+([IVX]+)\s*([a-e])\b/i,
    (_, roman: string, letter: string) => ` (${roman.toUpperCase()}/${letter.toLowerCase()})`,
  );
}

export function convertDriveUrl(url: string): string {
  if (!url.includes("drive.google.com") && !url.includes("docs.google.com")) {
    return url;
  }
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w800`;
  }
  return url;
}

export function resolvePhotoUrl(url?: string | null, resolveApiUrlFn?: (url: string) => string | null): string | null {
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

  if (resolveApiUrlFn) {
    return resolveApiUrlFn(trimmed) || trimmed;
  }

  return trimmed;
}

export function chunkPhotoAssets<T>(array: T[], size = 3): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
export const PHOTO_LAMPIRAN_PRINT_STYLES = `
  /* Lampiran Foto Styles */
  .photo-lampiran-page {
    page-break-before: always;
    break-before: page;
    width: 210mm;
    margin: 0 auto;
    padding: 3.5mm 20mm 10mm;
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
`;

export interface PrintReportWindowOptions {
  rootId: string;
  title: string;
  emptyMessage?: string;
  styles?: string;
  withAutoCloseScript?: boolean;
  waitForImages?: boolean;
}

export function printReportDocumentWindow({
  rootId,
  title,
  emptyMessage = "Tidak ada dokumen untuk dicetak.",
  styles = "",
  withAutoCloseScript = false,
  waitForImages = false,
}: PrintReportWindowOptions): void {
  const printContent = document.getElementById(rootId);
  if (!printContent) {
    if (emptyMessage) toast.error(emptyMessage);
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const scriptTag = withAutoCloseScript
    ? `
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    `
    : "";

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${printContent.innerHTML}
        ${scriptTag}
      </body>
    </html>
  `);
  printWindow.document.close();

  if (waitForImages) {
    const images = printWindow.document.getElementsByTagName("img");
    for (let i = 0; i < images.length; i++) {
      const src = images[i].getAttribute("src");
      if (src && !/^https?:\/\//i.test(src) && !src.startsWith("data:")) {
        images[i].setAttribute("src", `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`);
      }
    }

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
  } else {
    printWindow.focus();
    if (!withAutoCloseScript) {
      setTimeout(() => printWindow.print(), 500);
    }
  }
}
