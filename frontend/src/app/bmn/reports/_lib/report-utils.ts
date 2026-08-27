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

export function buildBaNumber(sequence: string, kap: string, documentDate: string): string {
  return `BA.${sequence.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.03.02"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

export function buildPoaNumber(sequence: string, kap: string, documentDate: string): string {
  return `KS.${sequence.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.03.02"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

export function buildCoveringNumber(sequence: string, kap: string, documentDate: string): string {
  return `SP.${sequence.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

export function formatDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function employeeToHandoverParty(employee?: EmployeeOption | null): HandoverParty {
  return {
    name: employee?.nama_lengkap || "",
    nip: employee?.nip || "",
    rank: employee?.pangkat_golongan || "",
    position: employee?.jabatan || "",
    address: "Jl. Teuku Umar Samarinda.",
  };
}

export function emptyGeneralItem(): HandoverItem {
  return { name: "", quantity: 1, nup: "" };
}
