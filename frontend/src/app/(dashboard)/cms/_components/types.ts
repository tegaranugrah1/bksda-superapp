import type { LucideIcon } from "lucide-react";

/** Definisi satu kolom di Tabel */
export interface CrudColumn {
  key: string; // Nama properti di objek data (misal: "nama", "judul")
  label: string; // Label header kolom (misal: "Nama Kawasan")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any) => React.ReactNode; // Custom render (untuk badge, gambar, dll)
}

/** Definisi satu field di Formulir */
export interface CrudField {
  key: string; // Nama properti yang dikirim ke API
  label: string; // Label input
  type: "text" | "textarea" | "select" | "file" | "number" | "checkbox" | "url";
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  accept?: string; // Untuk file: "image/*", ".pdf", dll
  options?: { value: string; label: string }[]; // Untuk select dropdown
}

/** Konfigurasi lengkap 1 halaman CRUD */
export interface CrudPageConfig {
  title: string; // "Kelola Kawasan Konservasi"
  subtitle: string; // "Daftar kawasan hutan lindung..."
  icon: LucideIcon;
  accentColor: string;
  apiEndpoint: string; // "/cms/admin/kawasan"
  columns: CrudColumn[];
  fields: CrudField[];
  searchPlaceholder?: string;
}
