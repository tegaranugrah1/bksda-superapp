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
  employeeId?: string | number;
}

export interface StTemplate {
  id: number;
  name: string;
  code: string | null;
  description?: string | null;
  type: "standard" | "bmn" | "beda_hari" | "plh" | "custom";
  menimbang: DasarItem[];
  dasar: DasarItem[];
  default_signer_employee_id?: number | null;
  default_signer_name?: string | null;
  default_signer_nip?: string | null;
  default_signer?: {
    id?: number | null;
    name: string;
    nip: string;
    jabatan?: string | null;
  } | null;
  configuration?: Record<string, unknown>;
  is_system: boolean;
  is_active: boolean;
  is_default: boolean;
  version: number;
}

export interface EmployeeDateRange {
  mulai: string;
  selesai: string;
}

export type EmployeeDates = Record<string, EmployeeDateRange>;

export type TemplateType = "bmn-pemeriksaan" | "beda-hari" | "plh" | null;
