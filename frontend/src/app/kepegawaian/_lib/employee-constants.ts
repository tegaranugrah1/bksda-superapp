/**
 * Konstanta bersama untuk modul Kepegawaian (Satuan Kerja & Pangkat PNS / PPPK).
 */

export const SATUAN_KERJA_OPTIONS = [
  // Kantor Balai
  "Kantor Balai KSDA Kalimantan Timur",
  // Seksi KSDA Wilayah I Berau
  "Seksi KSDA Wilayah I Berau",
  "Seksi KSDA Wil I - Resor 01. Berau",
  "Seksi KSDA Wil I - Resor 02. Pulau Semama dan Pulau Sangalaki",
  "Seksi KSDA Wil I - Resor 03. Tanjung Selor",
  "Seksi KSDA Wil I - Resor 04. Tarakan",
  // Seksi KSDA Wilayah II Tenggarong
  "Seksi KSDA Wilayah II Tenggarong",
  "Seksi KSDA Wil II - Resor 05. Samarinda",
  "Seksi KSDA Wil II - Resor 06. Padang Luway",
  "Seksi KSDA Wil II - Resor 07. Muara Kaman Sedulang",
  "Seksi KSDA Wil II - Resor 08. Sangatta",
  "Seksi KSDA Wil II - Resor 09. Suaka Badak Kelian",
  // Seksi KSDA Wilayah III Balikpapan
  "Seksi KSDA Wilayah III Balikpapan",
  "Seksi KSDA Wil III - Resor 10. Balikpapan",
  "Seksi KSDA Wil III - Resor 11. Teluk Adang",
  "Seksi KSDA Wil III - Resor 12. Teluk Apar",
  "Seksi KSDA Wil III - Resor 13. Paser",
  "Seksi KSDA Wil III - Resor 14. Ibu Kota Nusantara",
];

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

export const PANGKAT_OPTIONS = [
  "- (Tidak ada pangkat)",
  ...PANGKAT_PNS_OPTIONS,
  ...PANGKAT_PPPK_OPTIONS,
];
