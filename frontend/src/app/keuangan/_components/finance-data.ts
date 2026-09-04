export type SpjStatus = "Draft" | "Diajukan" | "Diproses" | "Disetujui" | "Selesai";

export interface FinanceEmployee {
  id: string;
  name: string;
  nip: string;
  rank: string;
  position: string;
  satuanKerja?: string;
  origin?: string;
  destination: string;
}

export interface SpjRecord {
  id: string;
  number: string;
  activity: string;
  creator: string;
  period: string;
  employeeCount: number;
  total: number;
  status: SpjStatus;
  updatedAt: string;
}

export const MOCK_EMPLOYEES: FinanceEmployee[] = [
  {
    id: "emp-001",
    name: "Didi Susanto, S.Si.",
    nip: "19880719 2012 1 003",
    rank: "Penata Muda (III/a)",
    position: "Polisi Kehutanan Ahli Pertama",
    satuanKerja: "Seksi Konservasi Wilayah II",
    origin: "Tenggarong",
    destination: "Kabupaten Kutai Barat",
  },
  {
    id: "emp-002",
    name: "Tegar Anugrah, A.md.Kom.",
    nip: "19990707 2025 1 006",
    rank: "Pengatur (II/c)",
    position: "Penata Komputer Terampil",
    satuanKerja: "Subbagian Tata Usaha",
    origin: "Samarinda",
    destination: "Kabupaten Kutai Barat",
  },
  {
    id: "emp-003",
    name: "Menik Tjahyoningrum, A.Md.",
    nip: "19811215 200501 2 014",
    rank: "Penata (III/c)",
    position: "Pengadministrasi Umum",
    satuanKerja: "Subbagian Tata Usaha",
    origin: "Samarinda",
    destination: "Kabupaten Kutai Barat",
  },
  {
    id: "emp-004",
    name: "Sukma Mawarni, S.E.",
    nip: "19930425 2024 2 053",
    rank: "Penata (III/c)",
    position: "Analis Keuangan",
    satuanKerja: "Subbagian Tata Usaha",
    origin: "Samarinda",
    destination: "Samarinda",
  },
];

export const DOCUMENT_LABELS = [
  { key: "sptjb", label: "SPTJB / Rekap", description: "Satu paket dengan seluruh rincian penerima" },
  { key: "spb", label: "SPB", description: "Surat persetujuan bayar" },
  { key: "daftar-isian", label: "Daftar Rincian Permintaan Pembayaran", description: "Rincian permintaan pembayaran" },
  { key: "kuitansi", label: "Kuitansi", description: "Bukti penerimaan pembayaran" },
  { key: "rinba", label: "Rinba", description: "Rincian biaya perjalanan dinas" },
  { key: "spd", label: "SPD", description: "Surat perjalanan dinas per pegawai" },
] as const;

export const DOCUMENT_LABELS_DIPA = [
  { key: "spby-dipa", label: "SPBy", description: "Surat Perintah Bayar (3 Kolom TTD)" },
  { key: "sptjb-dipa", label: "SPTJB DIPA", description: "Surat Pernyataan Tanggung Jawab Belanja Satker 693614" },
  { key: "rinba-dipa", label: "Rinba & Rampung", description: "Rincian Biaya Perjalanan Dinas & Perhitungan SPD Rampung" },
  { key: "nominatif-dipa", label: "Nominatif PD", description: "Daftar Nominatif Perjalanan Dinas (Tabel 10 Kolom)" },
  { key: "spd-dipa", label: "SPD Depan", description: "Surat Perjalanan Dinas (Lembar Muka 10 Butir)" },
] as const;

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const statusClass: Record<SpjStatus, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Diajukan: "bg-blue-100 text-blue-700 border-blue-200",
  Diproses: "bg-amber-100 text-amber-700 border-amber-200",
  Disetujui: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Selesai: "bg-purple-100 text-purple-700 border-purple-200",
};

export const BANK_ACCOUNTS: Record<string, { bank: string; accountNo: string; holderName: string }> = {
  "didi susanto": { bank: "Mandiri", accountNo: "1480024359104", holderName: "Didi Susanto" },
  "tegar anugrah": { bank: "Mandiri", accountNo: "1490018015471", holderName: "Tegar Anugrah" },
  "menik tjahyoningrum": { bank: "Mandiri", accountNo: "1480017892341", holderName: "Menik Tjahyoningrum" },
  "sukma mawarni": { bank: "Mandiri", accountNo: "1490018239012", holderName: "Sukma Mawarni" },
};

export function getRecipientBankInfo(name: string) {
  const lower = (name || "").toLowerCase();
  for (const [key, val] of Object.entries(BANK_ACCOUNTS)) {
    if (lower.includes(key)) return { ...val };
  }
  if (lower.includes("uptd") || lower.includes("lab") || lower.includes("kesehatan")) {
    return {
      bank: "BPD Kaltimtara",
      accountNo: "00360012402202040039",
      holderName: "UPTD Lab. Kesehatan Daerah Kota Samarinda",
    };
  }
  return {
    bank: "Mandiri",
    accountNo: "1480024" + String(Math.abs(name.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))).slice(0, 6),
    holderName: name.replace(/,\s*[A-Za-z\.\s]+$/, "").trim(),
  };
}
