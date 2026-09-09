/**
 * Types untuk halaman Inbox Surat Tugas.
 */

export interface InboxEmployee {
  id: string;
  nama_lengkap: string;
  nip: string;
  satuan_kerja?: string;
  jabatan?: string;
}

export interface LetterItem {
  id: string;
  text: string;
}

export type LetterStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "completed";

export interface AssignmentLetter {
  id: string;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan: string;
  sumber_dana: string;
  sumber_dana_other: string | null;
  template_type: string | null;
  dasar?: LetterItem[] | null;
  file_surat_path: string | null;
  status: LetterStatus;
  nomor_surat: string | null;
  tanggal_surat: string | null;
  nama_plh: string | null;
  has_seksi_employee: boolean;
  tanda_setuju: "sudah" | "belum" | null;
  keterangan: string | null;
  created_at: string;
  employees: InboxEmployee[];
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface StatusCounts {
  all: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  trashed: number;
}

export interface AdvancedFilters {
  nomor_surat?: string;
  pegawai?: string;
  tempat_tujuan?: string;
  date_from?: string;
  date_to?: string;
  sumber_dana?: string;
  template_type?: string;
}
