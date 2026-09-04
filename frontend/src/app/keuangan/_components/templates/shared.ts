import { formatRupiah, MOCK_EMPLOYEES } from "@/app/keuangan/_components/finance-data";

export interface TransportItem {
  id?: string;
  amount: number;
  label: string;
}

export interface RinbaDetails {
  operasionalDays: number;
  operasionalDailyRate: number;
  transportItems: TransportItem[];
}

export interface DipaDetails {
  uangHarianRate?: number;
  uangHarianDays?: number;
  penginapanRate?: number;
  penginapanNights?: number;
  transportUdara?: number;
  taksiPp?: number;
  extraItems?: TransportItem[];
}

export interface Recipient {
  id: string;
  name: string;
  description: string;
  evidence: string;
  amount: number;
  rinba?: RinbaDetails;
  dipa?: DipaDetails;
  bankName?: string;
  accountNo?: string;
  accountHolder?: string;
  nip?: string;
  rank?: string;
  position?: string;
  satuanKerja?: string;
  mengetahui?: MengetahuiOfficial;
}

export interface MengetahuiOfficial {
  name: string;
  nik: string;
  position: string;
}

export interface SpbConfig {
  virtualAccount?: string;
  ppkPosition?: string;
  keperluanPrefix?: string;
  point2Text?: string;
  cityDateText?: string;
}

export interface SpdConfig {
  ppkPoin1Text?: string;
  anggaranHeader?: string;
  instansiPoin9a?: string;
  akunPoin9b?: string;
}

export interface KwitansiConfig {
  sudahTerimaDari?: string;
}

export interface DipaConfig {
  kodeSatker?: string;
  namaSatker?: string;
  noSpDipa?: string;
  klasifikasiMak?: string;
  kodeMak?: string;
  akun?: string;
  bendahara?: Official;
  maksudTujuan?: string;
  uraianSptjb?: string;
  cityDateText?: string;
  transportMode?: string;
  stDate?: string;
  spdDate?: string;
  spbyKepada?: string;
  spbyUraian?: string;
}

export interface Official {
  id?: string;
  name: string;
  nik: string;
  position?: string;
}

export interface Props {
  selectedDocument: string;
  recipients: Recipient[];
  activity: { awpCode: string; name: string };
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  sptNumber: string;
  ppk: Official;
  pdo: Official;
  verifikator?: Official;
  total: number;
  spbNumber?: { no?: string; suffix?: string };
  spdNumber?: { no?: string; suffix?: string };
  spbConfig?: SpbConfig;
  spdConfig?: SpdConfig;
  kwitansiConfig?: KwitansiConfig;
  tipeAnggaran?: "FOLU" | "DIPA";
  dipaConfig?: DipaConfig;
}

export const SATUAN_KERJA = "Balai Konservasi Sumber Daya Alam Kalimantan Timur";

export const compactDate = (value: string) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

export function formatPeriod(startDate?: string, endDate?: string): string {
  if (!startDate) return "-";
  const d1 = new Date(`${startDate.split("T")[0]}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  if (!endDate) return d1;
  const d2 = new Date(`${endDate.split("T")[0]}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${d1} — ${d2}`;
}

export function cleanTemplateName(name: string): string {
  return name
    .replace(/^(\[(DIPA|FOLU|UMUM)\]\s*)+/gi, "")
    .replace(/\s*\((DIPA|FOLU)\)$/gi, "")
    .trim();
}

export function formatNip(nip?: string | null): string {
  if (!nip) return "-";
  const clean = nip.replace(/\D/g, "");
  if (clean.length === 18) {
    return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15, 18)}`;
  }
  return nip;
}

const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

export function terbilang(n: number): string {
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  if (n < 200) return "Seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  if (n < 2000) return "Seribu " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  return terbilang(Math.floor(n / 1000000000)) + " Milyar " + terbilang(n % 1000000000);
}

export const words = (value: number) => {
  if (!value || value === 0) return "Nol Rupiah";
  const str = terbilang(Math.floor(value)).replace(/\s+/g, " ").trim();
  return `${str} Rupiah`;
};

export const formatNumber = (value: number) => (value ? value.toLocaleString("en-US") : "0");

export const BANK_ACCOUNTS: Record<string, { bank: string; accountNo: string; holderName: string }> = {
  "didi susanto": { bank: "Mandiri", accountNo: "1480024359104", holderName: "Didi Susanto" },
  "tegar anugrah": { bank: "Mandiri", accountNo: "1490018015471", holderName: "Tegar Anugrah" },
  "sukma mawarni": { bank: "Mandiri", accountNo: "1490018239012", holderName: "Sukma Mawarni" },
};

export function getRecipientBankInfo(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(BANK_ACCOUNTS)) {
    if (lower.includes(key)) return val;
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
    accountNo:
      "1480024" +
      String(Math.abs(name.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))).slice(0, 6),
    holderName: name.replace(/,\s*[A-Za-z\.\s]+$/, "").trim(),
  };
}

export function calculateDays(startDate?: string, endDate?: string): number {
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) return diff;
  }
  return 8;
}

export function formatIndonesianDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "-";
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const sDay = String(s.getDate()).padStart(2, "0");
    const eDay = String(e.getDate()).padStart(2, "0");
    const sMonth = months[s.getMonth()];
    const eMonth = months[e.getMonth()];
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (sMonth === eMonth && sYear === eYear) {
      return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
    }
    return `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
}

export function getRecipientExecutionDate(
  recipient: { name: string; description: string },
  travel: { startDate: string; endDate: string }
): string {
  const match = recipient.description.match(/tanggal\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (match && match[1]) {
    return match[1];
  }
  return formatIndonesianDateRange(travel.startDate, travel.endDate);
}

export function formatUraianText(recipient: { name: string; description: string }): string {
  let desc = recipient.description.trim();
  if (!desc.toLowerCase().startsWith("pembayaran biaya")) {
    desc = `Pembayaran Biaya ${desc}`;
  }
  if (!desc.toLowerCase().includes("atas nama") && !desc.toLowerCase().includes("a.n ")) {
    desc = `${desc} atas nama ${recipient.name}`;
  }
  return desc;
}

export const RECIPIENT_NIP: Record<string, string> = {
  "didi susanto": "19880719 202012 1 003",
  "tegar anugrah": "19990707 202506 1 006",
  "sukma mawarni": "19930425 202421 2 053",
};

export function getReceiverInfo(recipient: { name: string; id: string; description: string; nip?: string }) {
  if (recipient.nip && recipient.nip.trim()) {
    return {
      name: recipient.name,
      nip: formatNip(recipient.nip.trim()),
    };
  }
  if (recipient.description.toLowerCase().includes("a.n didi susanto")) {
    return {
      name: "Didi Susanto, S.Si.",
      nip: "19880719 202012 1 003",
    };
  }
  const lower = recipient.name.toLowerCase();
  for (const [key, nip] of Object.entries(RECIPIENT_NIP)) {
    if (lower.includes(key)) return { name: recipient.name, nip: formatNip(nip) };
  }
  return {
    name: recipient.name,
    nip: recipient.id.startsWith("employee-") ? "19880719 202012 1 003" : "-",
  };
}

export const PEJABAT_MENGETAHUI_OPTIONS: MengetahuiOfficial[] = [
  {
    position: "Kepala Seksi KSDA Wilayah II",
    name: "Suriawati Halim, S.Hut., M.P.",
    nik: "19751127 200003 2 001",
  },
  {
    position: "Kepala Subbagian Tata Usaha",
    name: "Dheny Mardiono, S.Hut., MSc.",
    nik: "19750314 199903 1 004",
  },
  {
    position: "Kepala Seksi KSDA Wilayah I",
    name: "Yulian Sadono, S.Hut., M.T.",
    nik: "19800707 200604 1 003",
  },
  {
    position: "Kepala Seksi KSDA Wilayah III",
    name: "Bambang Hari Trimarsito, S.Si., M.P.",
    nik: "19740626 200112 1 004",
  },
];

export function getMengetahuiOfficial(recipient: Recipient) {
  if (recipient.mengetahui && recipient.mengetahui.name) {
    return recipient.mengetahui;
  }

  const lowerName = (recipient.name || "").toLowerCase();
  const lowerUnit = (recipient.satuanKerja || "").toLowerCase();
  const lowerDesc = (recipient.description || "").toLowerCase();

  if (
    lowerName.includes("menik") ||
    lowerName.includes("tegar") ||
    lowerName.includes("sukma") ||
    lowerName.includes("dilemma") ||
    lowerUnit.includes("tata usaha") ||
    lowerUnit.includes("subbag tu") ||
    lowerUnit.includes("balai") ||
    lowerDesc.includes("tata usaha")
  ) {
    return PEJABAT_MENGETAHUI_OPTIONS[1];
  }

  if (lowerUnit.includes("wilayah i") || lowerUnit.includes("wil 1") || lowerUnit.includes("berau")) {
    return PEJABAT_MENGETAHUI_OPTIONS[2];
  }

  if (lowerUnit.includes("wilayah iii") || lowerUnit.includes("wil 3") || lowerUnit.includes("balikpapan")) {
    return PEJABAT_MENGETAHUI_OPTIONS[3];
  }

  return PEJABAT_MENGETAHUI_OPTIONS[0];
}

export function getRinbaBreakdown(
  recipient: { name: string; amount: number; rinba?: RinbaDetails },
  travel: { origin: string; destination: string }
) {
  if (recipient.rinba) {
    const operasionalDays = recipient.rinba.operasionalDays || 8;
    const operasionalDailyRate = recipient.rinba.operasionalDailyRate || 360000;
    const operasionalTotal = operasionalDays * operasionalDailyRate;
    const transportItems = recipient.rinba.transportItems || [];
    const total = recipient.amount || (operasionalTotal + transportItems.reduce((sum, item) => sum + item.amount, 0));

    return {
      operasionalDays,
      operasionalDailyRate,
      operasionalTotal,
      transportItems,
      total,
    };
  }

  const total = recipient.amount;
  const operasionalDays = 8;
  const operasionalDailyRate = 360000;
  const operasionalTotal = Math.min(total, operasionalDays * operasionalDailyRate);
  const transportTotal = Math.max(0, total - operasionalTotal);

  let transportItems: Array<{ amount: number; label: string }> = [];

  if (transportTotal === 2710000 || recipient.name.toLowerCase().includes("didi")) {
    transportItems = [
      { amount: 200000, label: "Transportasi Samarinda ke Kab. Kubar" },
      { amount: 510000, label: "Transportasi Kab. Kubar ke Samarinda" },
      { amount: 1000000, label: "Transportasi Melak ke SM Kelian" },
      { amount: 1000000, label: "Transportasi SM Kelian ke Melak" },
    ];
  } else if (transportTotal === 710000 || recipient.name.toLowerCase().includes("tegar")) {
    transportItems = [
      { amount: 200000, label: "Transportasi Samarinda ke Kab. Kubar" },
      { amount: 510000, label: "Transportasi Kab. Kubar ke Samarinda" },
    ];
  } else if (transportTotal > 0) {
    if (transportTotal <= 710000) {
      const p1 = Math.min(200000, Math.round(transportTotal * 0.3));
      transportItems = [
        { amount: p1, label: `Transportasi ${travel.origin || "Samarinda"} ke ${travel.destination || "Kab. Kubar"}` },
        { amount: transportTotal - p1, label: `Transportasi ${travel.destination || "Kab. Kubar"} ke ${travel.origin || "Samarinda"}` },
      ];
    } else {
      const p1 = 200000;
      const p2 = 510000;
      const rem = transportTotal - p1 - p2;
      const halfRem = Math.round(rem / 2);
      transportItems = [
        { amount: p1, label: `Transportasi ${travel.origin || "Samarinda"} ke ${travel.destination || "Kab. Kubar"}` },
        { amount: p2, label: `Transportasi ${travel.destination || "Kab. Kubar"} ke ${travel.origin || "Samarinda"}` },
        { amount: halfRem, label: `Transportasi Melak ke SM Kelian` },
        { amount: rem - halfRem, label: `Transportasi SM Kelian ke Melak` },
      ];
    }
  }

  return {
    operasionalDays,
    operasionalDailyRate,
    operasionalTotal,
    transportItems,
    total,
  };
}

export function getEmployeeSpdInfo(recipient: Recipient, travel: { origin: string; destination: string }) {
  const emp = MOCK_EMPLOYEES.find((e) => e.name.toLowerCase().includes(recipient.name.toLowerCase().split(",")[0]));
  const receiver = getReceiverInfo(recipient);

  let origin = travel.origin || "Samarinda";
  if (recipient.name.toLowerCase().includes("didi") || recipient.description.toLowerCase().includes("tenggarong")) {
    origin = "Tenggarong";
  } else if (recipient.name.toLowerCase().includes("tegar") || recipient.description.toLowerCase().includes("samarinda")) {
    origin = "Samarinda";
  }

  return {
    name: receiver.name,
    nip: receiver.nip,
    rank: recipient.rank?.trim() || emp?.rank || "Penata Muda (III/a)",
    position: recipient.position?.trim() || emp?.position || "Polisi Kehutanan",
    tingkatBiaya: "D",
    origin: origin,
    destination: travel.destination || "Kabupaten Kutai Barat",
  };
}

export function formatSingleDate(dateStr: string): string {
  if (!dateStr) return "-";
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function cleanMaksudForUraian(text?: string): string {
  if (!text) return "kegiatan operasional balai";
  text = text.split(";")[0].trim();
  text = text.replace(/,?\s+selama\s+\d+.*$/i, "").trim();
  text = text.replace(/,?\s+terhitung\s+mulai.*$/i, "").trim();
  const dalamRangkaMatch = text.match(/dalam\s+rangka\s+(.+)$/i);
  if (dalamRangkaMatch && dalamRangkaMatch[1]) {
    text = dalamRangkaMatch[1].trim();
  }
  text = text.replace(/^(?:perjalanan\s+dinas\s+dari\s+.*?\s+ke\s+.*?\s+)+/i, "").trim();
  text = text.replace(/^(?:melaksanakan\s+tugas\s+|melaksanakan\s+|untuk\s+melaksanakan\s+|dalam\s+rangka\s+)+/i, "").trim();
  text = text.replace(/[,.;\s]+$/, "").trim();
  return text;
}

export function formatFullDateIndonesia(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

const angkaArray = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

export function terbilangNumber(n: number): string {
  if (n < 12) return angkaArray[n] || String(n);
  if (n < 20) return terbilangNumber(n - 10) + " Belas";
  if (n < 100) return terbilangNumber(Math.floor(n / 10)) + " Puluh" + (n % 10 !== 0 ? " " + terbilangNumber(n % 10) : "");
  return String(n);
}

export function getRomanMonth(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return romanMonths[month - 1] || "IX";
}

export function buildDefaultSptjbUraian(
  travel: { origin: string; destination: string; startDate: string; endDate: string },
  recipientCount: number,
  activityName: string
): string {
  const days = calculateDays(travel.startDate, travel.endDate);
  const daysWords = terbilangNumber(days);
  const countWords = terbilangNumber(recipientCount || 1);
  const startStr = formatFullDateIndonesia(travel.startDate);
  const endStr = formatFullDateIndonesia(travel.endDate);
  const maksud = cleanMaksudForUraian(activityName);

  return `Belanja Perjalanan Dinas Biasa, Perjalanan Dinas dari ${travel.origin} ke ${travel.destination} sebanyak ${recipientCount} (${countWords}) orang tugas (OT) dalam rangka ${maksud} selama ${days} (${daysWords}) hari terhitung mulai tanggal ${startStr} sampai dengan ${endStr}.`;
}

export interface RecipientRow {
  id: string;
  name: string;
  type: "pegawai" | "pihak_ketiga";
  description: string;
  evidenceNo?: string;
  evidenceSuffix?: string;
  amount: number;
  rinba?: RinbaDetails;
  dipa?: DipaDetails;
  bankName?: string;
  accountNo?: string;
  accountHolder?: string;
  nip?: string;
  rank?: string;
  position?: string;
  satuanKerja?: string;
  mengetahui?: MengetahuiOfficial;
}

export interface ApiSuratTugas {
  id: string;
  nomor_surat?: string;
  maksud_tujuan?: string;
  tempat_tujuan?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  status?: string;
  sumber_dana?: string;
  employees?: Array<{
    id: number | string;
    nama_lengkap: string;
    nip: string;
    jabatan?: string;
    pangkat_golongan?: string;
  }>;
}

export const DEFAULT_SPD_ANGGARAN_HEADER =
  "Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - TA 2026";
export const DEFAULT_SUFFIX = "/K.18/FOLU.NC-23/08/2026";
export const DEFAULT_FOLU_ACTIVITY_NAME = "Operasionalisasi SMART Patrol di KSA, KPA dan TB";

export function calculateRinbaTotal(rinba?: RinbaDetails): number {
  if (!rinba) return 0;
  const opTotal = (rinba.operasionalDays || 0) * (rinba.operasionalDailyRate || 0);
  const trTotal = (rinba.transportItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  return opTotal + trTotal;
}

export const OFFICIALS: Official[] = [
  { name: "Ahmad Hidayat, S.PKP., M.Ling", nik: "19820301 200012 1 001", position: "Pejabat Pembuat Komitmen" },
  { name: "Dilemma Ferti Hidayah, S.E.", nik: "19870130 201012 2 005", position: "Pemegang Dana Operasional" },
  { name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053", position: "Verifikator Keuangan" },
  { name: "Rusmanto, S.Hut.", nik: "19780512 200501 1 008", position: "Kepala Subbagian Tata Usaha" },
];

export const OFFICIALS_DIPA: Official[] = [
  { name: "RUSMANTO, S.Hut", nik: "19810907 200012 1 004", position: "Pejabat Pembuat Komitmen" },
  { name: "SOERENDENG, SE", nik: "19790721 200701 2 001", position: "Bendahara Pengeluaran" },
  { name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053", position: "Verifikator Keuangan" },
  { name: "Rusmanto, S.Hut.", nik: "19780512 200501 1 008", position: "Kepala Subbagian Tata Usaha" },
];

export function formatRupiahInput(value: number): string {
  if (!value && value !== 0) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function parseRupiahInput(value: string): number {
  const cleaned = value.replace(/\D/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function cleanNip(raw?: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function cleanName(raw?: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function isSameEmployee(a: { id?: string | number; name: string; nip?: string; nik?: string }, b: { id?: string | number; name: string; nip?: string; nik?: string }): boolean {
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  const nipA = cleanNip(a.nip || a.nik);
  const nipB = cleanNip(b.nip || b.nik);
  if (nipA && nipB && nipA.length >= 6 && nipB.length >= 6 && nipA === nipB) return true;
  const nameA = cleanName(a.name);
  const nameB = cleanName(b.name);
  if (nameA && nameB && nameA.length >= 4 && nameB.length >= 4 && (nameA === nameB || nameA.startsWith(nameB) || nameB.startsWith(nameA))) return true;
  return false;
}

export function extractOriginFromMaksud(maksud?: string): string {
  if (!maksud) return "Tenggarong";
  const m = maksud.match(/(?:dari|asal|di)\s+([A-Za-z0-9\s]+?)(?:\s+(?:ke|menuju|dalam|selama|pada)\b|$)/i);
  if (m && m[1]) {
    const cleaned = m[1].trim();
    if (cleaned.length > 2 && !cleaned.toLowerCase().startsWith("kawasan")) {
      return cleaned;
    }
  }
  if (maksud.toLowerCase().includes("tenggarong")) return "Tenggarong";
  if (maksud.toLowerCase().includes("samarinda")) return "Samarinda";
  if (maksud.toLowerCase().includes("balikpapan")) return "Balikpapan";
  return "Samarinda";
}

export function extractActivityNameFromMaksud(maksud?: string): string {
  if (!maksud) return "Operasionalisasi SMART Patrol di KSA, KPA dan TB";
  let line = maksud.split(/\r?\n/)[0].split(";")[0].trim();
  line = line.replace(/,?\s+selama\s+\d+.*$/i, "").trim();
  line = line.replace(/,?\s+terhitung\s+mulai.*$/i, "").trim();
  const m = line.match(/dalam\s+rangka\s+(?:kegiatan\s+)?([^,;.\n]+)/i);
  if (m && m[1]) {
    return m[1].trim();
  }
  const mk = line.match(/kegiatan\s+([^,;.\n]+)/i);
  if (mk && mk[1]) {
    return mk[1].trim();
  }
  return line.length > 80 ? line.slice(0, 77) + "..." : line;
}

export function buildUraianForEmployee(
  empName: string,
  origin = "Samarinda",
  destination = "Kabupaten Kutai Barat",
  startDate = "2026-08-25",
  endDate = "2026-09-01",
  maksudTujuan?: string
): string {
  const isTegar = empName.toLowerCase().includes("tegar");
  const orig = isTegar ? "Samarinda" : origin;
  const days = calculateDays(startDate, endDate);
  const daysWords = terbilangNumber(days);
  const startStr = formatFullDateIndonesia(startDate);
  const endStr = formatFullDateIndonesia(endDate);
  const maksud = cleanMaksudForUraian(maksudTujuan);

  return `Perjalanan dinas dari ${orig} ke ${destination} dalam rangka ${maksud} selama ${days} (${daysWords}) hari terhitung mulai tanggal ${startStr} sampai dengan ${endStr}`;
}

export function getTwoDaysBeforeFormatted(startDateStr?: string): string {
  if (!startDateStr) return "23 Agustus 2026";
  try {
    const d = new Date(`${startDateStr}T00:00:00`);
    d.setDate(d.getDate() - 2);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "23 Agustus 2026";
  }
}

export function buildExternalMcuDescription(empName: string, startDateStr?: string): string {
  const mcuDate = getTwoDaysBeforeFormatted(startDateStr);
  const name = empName || "Petugas";
  return `Biaya Medical Check Up a.n ${name} dalam rangka Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian Tanggal ${mcuDate}`;
}

export function buildDefaultRinba(
  empName: string,
  origin = "Samarinda",
  destination = "Kabupaten Kutai Barat",
  startDate = "2026-08-25",
  endDate = "2026-09-01"
): RinbaDetails {
  const days = calculateDays(startDate, endDate);
  const dailyRate = 360000;
  const isTegar = empName.toLowerCase().includes("tegar");

  const transportItems: TransportItem[] = isTegar
    ? [
        { id: `t-1-${Date.now()}-1`, label: `Transportasi ${origin} ke ${destination}`, amount: 200000 },
        { id: `t-2-${Date.now()}-2`, label: `Transportasi ${destination} ke ${origin}`, amount: 510000 },
      ]
    : [
        { id: `t-1-${Date.now()}-1`, label: `Transportasi ${origin} ke ${destination}`, amount: 200000 },
        { id: `t-2-${Date.now()}-2`, label: `Transportasi ${destination} ke ${origin}`, amount: 510000 },
        { id: `t-3-${Date.now()}-3`, label: "Transportasi Melak ke SM Kelian", amount: 1000000 },
        { id: `t-4-${Date.now()}-4`, label: "Transportasi SM Kelian ke Melak", amount: 1000000 },
      ];

  return {
    operasionalDays: days,
    operasionalDailyRate: dailyRate,
    transportItems,
  };
}

export function buildDefaultDipa(
  startDate = "2026-08-25",
  endDate = "2026-09-01"
): DipaDetails {
  const days = calculateDays(startDate, endDate);
  return {
    uangHarianRate: 360000,
    uangHarianDays: days,
    penginapanRate: 0,
    penginapanNights: 0,
    transportUdara: 0,
    taksiPp: 0,
    extraItems: [],
  };
}

export function calculateDipaTotal(dipa: DipaDetails): number {
  const days = dipa.uangHarianDays || 1;
  const rate = dipa.uangHarianRate || 0;
  const uangHarian = days * rate;
  const transport = (dipa.transportUdara || 0) + (dipa.taksiPp || 0);
  const hotel = (dipa.penginapanNights || 0) * (dipa.penginapanRate || 0);
  const extra = (dipa.extraItems || []).reduce((acc, it) => acc + (it.amount || 0), 0);
  return uangHarian + transport + hotel + extra;
}
