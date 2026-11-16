/**
 * Konstanta bersama untuk modul Kepegawaian (Satuan Kerja & Pangkat PNS / PPPK).
 */

export interface ResorOption {
  code: string;
  name: string;
  skw: "SKW_1" | "SKW_2" | "SKW_3";
}

export const RESOR_OPTIONS: ResorOption[] = [
  // SKW I Berau
  { code: "resor_01", name: "Resor 01. Berau", skw: "SKW_1" },
  { code: "resor_02", name: "Resor 02. Pulau Semama dan Pulau Sangalaki", skw: "SKW_1" },
  { code: "resor_03", name: "Resor 03. Tanjung Selor", skw: "SKW_1" },
  { code: "resor_04", name: "Resor 04. Tarakan", skw: "SKW_1" },
  // SKW II Tenggarong
  { code: "resor_05", name: "Resor 05. Samarinda", skw: "SKW_2" },
  { code: "resor_06", name: "Resor 06. Padang Luway", skw: "SKW_2" },
  { code: "resor_07", name: "Resor 07. Muara Kaman Sedulang", skw: "SKW_2" },
  { code: "resor_08", name: "Resor 08. Sangatta", skw: "SKW_2" },
  { code: "resor_09", name: "Resor 09. Suaka Badak Kelian", skw: "SKW_2" },
  // SKW III Balikpapan
  { code: "resor_10", name: "Resor 10. Balikpapan", skw: "SKW_3" },
  { code: "resor_11", name: "Resor 11. Teluk Adang", skw: "SKW_3" },
  { code: "resor_12", name: "Resor 12. Teluk Apar", skw: "SKW_3" },
  { code: "resor_13", name: "Resor 13. Paser", skw: "SKW_3" },
  { code: "resor_14", name: "Resor 14. Ibu Kota Nusantara (IKN)", skw: "SKW_3" },
];

export type JenisPegawai = "PNS" | "PPPK" | "MMP";

export const JENIS_PEGAWAI_OPTIONS: { value: JenisPegawai; label: string; desc: string }[] = [
  { value: "PNS", label: "PNS", desc: "Pegawai Negeri Sipil (NIP)" },
  { value: "PPPK", label: "PPPK (P3K)", desc: "Pegawai Pemerintah dgn Perjanjian Kerja (NIPPPK)" },
  { value: "MMP", label: "MMP", desc: "Masyarakat Mitra Polhut (Tanpa NIP)" },
];

export const PANGKAT_PNS_OPTIONS = [
  "Juru Muda (I/a)",
  "Juru Muda Tingkat I (I/b)",
  "Juru (I/c)",
  "Juru Tingkat I (I/d)",
  "Pengatur Muda (II/a)",
  "Pengatur Muda Tingkat I (II/b)",
  "Pengatur (II/c)",
  "Pengatur Tingkat I (II/d)",
  "Penata Muda (III/a)",
  "Penata Muda Tingkat I (III/b)",
  "Penata (III/c)",
  "Penata Tingkat I (III/d)",
  "Pembina (IV/a)",
  "Pembina Tingkat I (IV/b)",
  "Pembina Utama Muda (IV/c)",
  "Pembina Utama Madya (IV/d)",
  "Pembina Utama (IV/e)",
];

export const PANGKAT_PPPK_OPTIONS = [
  "PPPK Golongan I",
  "PPPK Golongan II",
  "PPPK Golongan III",
  "PPPK Golongan IV",
  "PPPK Golongan V",
  "PPPK Golongan VI",
  "PPPK Golongan VII",
  "PPPK Golongan VIII",
  "PPPK Golongan IX",
  "PPPK Golongan X",
  "PPPK Golongan XI",
  "PPPK Golongan XII",
  "PPPK Golongan XIII",
  "PPPK Golongan XIV",
  "PPPK Golongan XV",
  "PPPK Golongan XVI",
  "PPPK Golongan XVII",
];
