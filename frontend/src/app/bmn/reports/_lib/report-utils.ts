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

export function formatNip(nip?: string | null): string {
  if (!nip) return "-";
  const trimmed = nip.trim();
  if (trimmed === "" || trimmed === "-") return "-";
  if (trimmed.startsWith("MMP-")) return "-";
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
