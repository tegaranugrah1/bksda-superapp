export type SpjStatus = "Draft" | "Diajukan" | "Diproses" | "Disetujui" | "Selesai";

export interface FinanceEmployee {
  id: string;
  name: string;
  nip: string;
  rank: string;
  position: string;
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
    destination: "Kabupaten Kutai Barat",
  },
  {
    id: "emp-002",
    name: "Tegar Anugrah, A.md.Kom.",
    nip: "19990707 2025 1 006",
    rank: "Pengatur (II/c)",
    position: "Penata Komputer Terampil",
    destination: "Kabupaten Kutai Barat",
  },
  {
    id: "emp-003",
    name: "Sukma Mawarni, S.E.",
    nip: "19930425 2024 2 053",
    rank: "Penata (III/c)",
    position: "Analis Keuangan",
    destination: "Samarinda",
  },
];

export const MOCK_SPJ: SpjRecord[] = [
  {
    id: "spj-001",
    number: "SPJ.685/K.18/TU/FOLU-NC-23/KSA.02.01/B/07/2026",
    activity: "Operasionalisasi SMART Patroli di KSA, KPA dan TB",
    creator: "Didi Susanto, S.Si.",
    period: "10 Jul — 17 Jul 2026",
    employeeCount: 2,
    total: 9_180_000,
    status: "Diajukan",
    updatedAt: "09 Jul 2026",
  },
  {
    id: "spj-002",
    number: "SPJ.412/K.18/TU/02/2026",
    activity: "Monitoring kawasan konservasi wilayah III",
    creator: "Tegar Anugrah, A.md.Kom.",
    period: "21 Jun — 23 Jun 2026",
    employeeCount: 3,
    total: 4_750_000,
    status: "Disetujui",
    updatedAt: "25 Jun 2026",
  },
  {
    id: "spj-003",
    number: "SPJ.398/K.18/TU/02/2026",
    activity: "Kegiatan administrasi dan koordinasi balai",
    creator: "Sukma Mawarni, S.E.",
    period: "12 Jun 2026",
    employeeCount: 1,
    total: 1_250_000,
    status: "Draft",
    updatedAt: "12 Jun 2026",
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

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const statusClass: Record<SpjStatus, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Diajukan: "bg-blue-50 text-blue-700 border-blue-200",
  Diproses: "bg-amber-50 text-amber-700 border-amber-200",
  Disetujui: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Selesai: "bg-violet-50 text-violet-700 border-violet-200",
};
