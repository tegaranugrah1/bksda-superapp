export interface SuratDisposisi {
  id?: number;
  surat_masuk_id?: number;
  diteruskan_json?: string[];
  instruksi_json?: string[];
  catatan?: string;
  ka_subbag_tu_id?: number | string | null;
  kepala_balai_id?: number | string | null;
  kaSubbagTu?: any;
  kepalaBalai?: any;
}

export interface SuratMasuk {
  id?: number;
  no_agenda: string;
  tanggal_agenda: string;
  indeks?: string;
  kode?: string;
  no_surat: string;
  referensi?: string;
  tanggal_penyelesaian?: string;
  tanggal_surat?: string;
  isi_ringkas?: string;
  asal_surat?: string;
  lampiran?: string;
  sifat_json?: string[];
  catatan?: string;
  file_path?: string;
  created_by?: number;
  created_at?: string;
  disposisi?: SuratDisposisi;
}

export interface SuratKeluar {
  id?: number;
  no_surat: string;
  kode_klasifikasi?: string;
  tanggal_surat: string;
  tujuan_surat: string;
  perihal: string;
  sifat?: string;
  lampiran?: string;
  file_path?: string;
  penandatangan_id?: number | string | null;
  penandatangan?: any;
  created_by?: number;
  created_at?: string;
}

export const SIFAT_OPTIONS = [
  "Biasa",
  "Penting",
  "Sangat Penting",
  "Rahasia",
  "Segera",
  "Kilat",
];

export const DITERUSKAN_OPTIONS = [
  "1. Ka Sub Bag TU",
  "2. Urusan Umum dan Perlengkapan",
  "3. Urusan Kepegawaian",
  "4. Urusan Program",
  "5. Urusan Keuangan",
  "6. Urusan Data Evlap dan Humas",
  "7. Urusan Teknis",
  "8. Urusan Perlindungan",
  "9. PPK FOLU NC 2030",
];

export const DISPOSISI_INTRUKSI_OPTIONS = [
  "Untuk Diselesaikan",
  "Harap Saran/Pertimbangan",
  "Penjelasan",
  "Untuk Diketahui/dipergunakan seperlunya",
  "Bahas dengan saya",
];
