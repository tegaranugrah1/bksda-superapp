/**
 * Shared types untuk modul Surat Tugas (builder + create + inbox).
 */

export interface Employee {
  id: string;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
  department?: string;
  position?: string;
}

export interface DasarItem {
  id: string;
  text: string;
}

export interface SumberDanaOption {
  id: string;
  label: string;
  dasarText: string;
  biayaText: string;
}

export interface KepalaBalaiInfo {
  name: string;
  nip: string;
}

export interface EmployeeDateRange {
  mulai: string;
  selesai: string;
}

export type EmployeeDates = Record<string, EmployeeDateRange>;

export type TemplateType = "bmn-pemeriksaan" | "beda-hari" | "plh" | null;
