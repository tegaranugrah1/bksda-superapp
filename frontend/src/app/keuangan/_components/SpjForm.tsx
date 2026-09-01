"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import api from "@/lib/api";
import { DOCUMENT_LABELS, FinanceEmployee, MOCK_EMPLOYEES, formatRupiah, getRecipientBankInfo } from "@/app/keuangan/_components/finance-data";
import { DocumentTemplates, MengetahuiOfficial, PEJABAT_MENGETAHUI_OPTIONS, SpbConfig, SpdConfig } from "@/app/keuangan/_components/DocumentTemplates";

export interface TransportItem {
  id: string;
  amount: number;
  label: string;
}

export interface RinbaDetails {
  operasionalDays: number;
  operasionalDailyRate: number;
  transportItems: TransportItem[];
}

export interface RecipientRow {
  id: string;
  name: string;
  type: "pegawai" | "pihak_ketiga";
  description: string;
  evidenceNo: string;
  evidenceSuffix: string;
  amount: number;
  rinba?: RinbaDetails;
  bankName?: string;
  accountNo?: string;
  accountHolder?: string;
  nip?: string;
  rank?: string;
  position?: string;
  satuanKerja?: string;
  mengetahui?: MengetahuiOfficial;
}

interface Official {
  id?: string;
  name: string;
  nik: string;
  position?: string;
}

interface ApiSuratTugas {
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

const STEPS = ["1. SPT Panduan", "2. REKAP", "3. Review & Cetak"];
const SATUAN_KERJA = "Balai Konservasi Sumber Daya Alam Kalimantan Timur";
const DEFAULT_SUFFIX = "/K.18/FOLU.NC-23/08/2026";
const OFFICIALS: Official[] = [
  { name: "Ahmad Hidayat, S.PKP., M.Ling", nik: "19820301 200012 1 001", position: "Pejabat Pembuat Komitmen" },
  { name: "Dilemma Ferti Hidayah, S.E.", nik: "19870130 201012 2 005", position: "Pemegang Dana Operasional" },
  { name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053", position: "Verifikator Keuangan" },
  { name: "Rusmanto, S.Hut.", nik: "19780512 200501 1 008", position: "Kepala Subbagian Tata Usaha" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatRupiahInput(value: number): string {
  if (!value && value !== 0) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

function parseRupiahInput(value: string): number {
  const cleaned = value.replace(/\D/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function formatNip(nip?: string): string {
  if (!nip) return "-";
  const digits = nip.replace(/\D/g, "");
  if (digits.length === 18) {
    return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15)}`;
  }
  return nip;
}

function cleanNip(raw?: string): string {
  return (raw || "").replace(/\D/g, "");
}

function cleanName(raw?: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractOriginFromMaksud(maksud?: string): string {
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

function extractActivityNameFromMaksud(maksud?: string): string {
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

const angkaArray = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
function terbilangNumber(n: number): string {
  if (n < 12) return angkaArray[n] || String(n);
  if (n < 20) return terbilangNumber(n - 10) + " Belas";
  if (n < 100) return terbilangNumber(Math.floor(n / 10)) + " Puluh" + (n % 10 !== 0 ? " " + terbilangNumber(n % 10) : "");
  return String(n);
}

function formatFullDateIndonesia(dateStr?: string): string {
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

function cleanMaksudForUraian(maksud?: string): string {
  if (!maksud) return "kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian di Suaka Margasatwa Kelian";
  let text = maksud.trim();
  // Cut off second/third paragraphs or numbered points (Membuat laporan..., Sumber dana...)
  text = text.split(/\r?\n/)[0].trim();
  // Cut off everything after semicolons
  text = text.split(";")[0].trim();
  // Cut off ", selama ...", "selama ... hari...", "terhitung mulai..."
  text = text.replace(/,?\s+selama\s+\d+.*$/i, "").trim();
  text = text.replace(/,?\s+terhitung\s+mulai.*$/i, "").trim();

  // If text contains "dalam rangka", extract only the part after "dalam rangka"
  const dalamRangkaMatch = text.match(/dalam\s+rangka\s+(.+)$/i);
  if (dalamRangkaMatch && dalamRangkaMatch[1]) {
    text = dalamRangkaMatch[1].trim();
  }

  // Remove leading prefixes like "Perjalanan Dinas dari ... ke ...", "Melaksanakan tugas...", "Untuk melaksanakan..."
  text = text.replace(/^(?:perjalanan\s+dinas\s+dari\s+.*?\s+ke\s+.*?\s+)+/i, "").trim();
  text = text.replace(/^(?:melaksanakan\s+tugas\s+|melaksanakan\s+|untuk\s+melaksanakan\s+|dalam\s+rangka\s+)+/i, "").trim();

  // Ensure it starts with "kegiatan " if it doesn't already
  if (!text.toLowerCase().startsWith("kegiatan")) {
    text = `kegiatan ${text}`;
  }

  // Remove trailing commas, periods, or semicolons
  text = text.replace(/[,.;\s]+$/, "").trim();

  return text;
}

function buildUraianForEmployee(
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

function isSameEmployee(a: FinanceEmployee | Official, b: FinanceEmployee | Official): boolean {
  if ("id" in a && "id" in b && a.id && b.id && String(a.id) === String(b.id)) return true;
  const nipA = cleanNip("nip" in a ? a.nip : a.nik);
  const nipB = cleanNip("nip" in b ? b.nip : b.nik);
  if (nipA && nipB && nipA.length >= 6 && nipB.length >= 6 && nipA === nipB) return true;
  const nameA = cleanName(a.name);
  const nameB = cleanName(b.name);
  if (nameA && nameB && nameA.length >= 4 && nameB.length >= 4 && (nameA === nameB || nameA.startsWith(nameB) || nameB.startsWith(nameA))) return true;
  return false;
}

function getTwoDaysBeforeFormatted(startDateStr?: string): string {
  if (!startDateStr) return "23 Agustus 2026";
  try {
    const d = new Date(`${startDateStr}T00:00:00`);
    d.setDate(d.getDate() - 2);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "23 Agustus 2026";
  }
}

function buildExternalMcuDescription(empName: string, startDateStr?: string): string {
  const mcuDate = getTwoDaysBeforeFormatted(startDateStr);
  const name = empName || "Petugas";
  return `Biaya Medical Check Up a.n ${name} dalam rangka Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian Tanggal ${mcuDate}`;
}

function calculateDays(startDate?: string, endDate?: string): number {
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) return diff;
  }
  return 8;
}

function calculateRinbaTotal(rinba?: RinbaDetails): number {
  if (!rinba) return 0;
  const opTotal = (rinba.operasionalDays || 0) * (rinba.operasionalDailyRate || 0);
  const trTotal = (rinba.transportItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  return opTotal + trTotal;
}

function buildDefaultRinba(
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

const initialRecipient = (
  employee: FinanceEmployee,
  origin = "Samarinda",
  destination = "Kabupaten Kutai Barat",
  startDate = "2026-08-25",
  endDate = "2026-09-01",
  maksudTujuan?: string
): RecipientRow => {
  const rinba = buildDefaultRinba(employee.name, origin, destination, startDate, endDate);
  const total = calculateRinbaTotal(rinba);
  const bankInfo = getRecipientBankInfo(employee.name);
  const lowerName = employee.name.toLowerCase();
  const isTu =
    lowerName.includes("tegar") ||
    lowerName.includes("menik") ||
    lowerName.includes("sukma") ||
    lowerName.includes("dilemma") ||
    (employee.satuanKerja || "").toLowerCase().includes("tata usaha") ||
    (employee.satuanKerja || "").toLowerCase().includes("subbag tu") ||
    (employee.satuanKerja || "").toLowerCase().includes("balai");
  const defaultMengetahui = isTu ? PEJABAT_MENGETAHUI_OPTIONS[1] : PEJABAT_MENGETAHUI_OPTIONS[0];

  return {
    id: `employee-${employee.id}`,
    name: employee.name,
    type: "pegawai",
    description: buildUraianForEmployee(employee.name, origin, destination, startDate, endDate, maksudTujuan),
    evidenceNo: "",
    evidenceSuffix: DEFAULT_SUFFIX,
    amount: total || (lowerName.includes("tegar") ? 3590000 : 5590000),
    rinba,
    bankName: bankInfo.bank,
    accountNo: bankInfo.accountNo,
    accountHolder: bankInfo.holderName,
    nip: employee.nip,
    rank: employee.rank,
    position: employee.position,
    satuanKerja: employee.satuanKerja || (isTu ? "Subbagian Tata Usaha" : "Seksi Konservasi Wilayah II"),
    mengetahui: defaultMengetahui,
  };
};

const DEFAULT_FOLU_ACTIVITY_NAME = "Operasionalisasi SMART Patrol di KSA, KPA dan TB";

export function SpjForm({ spjId }: { spjId?: string | number }) {
  const router = useRouter();
  const isEditMode = Boolean(spjId);

  const { canWrite } = useRole();
  const [step, setStep] = useState(0);
  const [tipeAnggaran, setTipeAnggaran] = useState<"FOLU" | "DIPA">("FOLU");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spjName, setSpjName] = useState("Operasionalisasi SMART Patrol di KSA, KPA dan TB");
  const [nomorSpj, setNomorSpj] = useState("SPJ.001/K.18/TU/FOLU-NC-23/VIII/2026");
  const [source, setSource] = useState<"linked" | "manual">("linked");
  const [foluLetters, setFoluLetters] = useState<ApiSuratTugas[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [selectedStId, setSelectedStId] = useState<string>("");
  const [sptNumber, setSptNumber] = useState("ST.685/K.18/TU/FOLU-NC-23/KSA.02.01/B/07/2026");
  const [sptSearch, setSptSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [sptEmployees, setSptEmployees] = useState<FinanceEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<FinanceEmployee[]>([]);
  const [activity, setActivity] = useState({ awpCode: "C.1.1.2.01", name: DEFAULT_FOLU_ACTIVITY_NAME });
  const [travel, setTravel] = useState({ origin: "Tenggarong", destination: "Kabupaten Kutai Barat", startDate: "2026-07-10", endDate: "2026-07-17" });
  const [spbNumber, setSpbNumber] = useState({
    no: "",
    suffix: "/SPB/K.18/FOLU-NC23/05/2026",
  });
  const [spdNumber, setSpdNumber] = useState({
    no: "",
    suffix: "/K.18-TU/FOLU.NC-23/04/2026",
  });
  const DEFAULT_SPB_POINT2 =
    "Memerintahkan Pemegang Dana Operasional untuk pembayaran dan membebankan pengeluaran pada Annual Work Plan (AWP) Project FOLU-NC 2&3 IP BKSDA Kalimantan Timur untuk Kode AWP {awpCode} Tahun Anggaran 2026.";
  const DEFAULT_SPD_ANGGARAN_HEADER =
    "Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - TA 2026";
  const DEFAULT_SPD_PPK_POIN1 = "FOLU RBC NC 2&3 IP BKSDA KALTIM TA 2026";
  const DEFAULT_SPD_INSTANSI = "Balai KSDA Kalimantan Timur";

  const [spbConfig, setSpbConfig] = useState<SpbConfig>({
    virtualAccount: "9899410000000115",
    ppkPosition: "Pejabat Pembuat Komitmen IP BKSDA Kalimantan Timur",
    keperluanPrefix: "Pembayaran Biaya",
    point2Text: DEFAULT_SPB_POINT2,
    cityDateText: "Samarinda,",
  });
  const [spdConfig, setSpdConfig] = useState<SpdConfig>({
    ppkPoin1Text: DEFAULT_SPD_PPK_POIN1,
    anggaranHeader: DEFAULT_SPD_ANGGARAN_HEADER,
    instansiPoin9a: DEFAULT_SPD_INSTANSI,
    akunPoin9b: "{awpCode}",
  });
  const [defaultEvidenceSuffix, setDefaultEvidenceSuffix] = useState(DEFAULT_SUFFIX);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [expandedRinbaIds, setExpandedRinbaIds] = useState<Record<string, boolean>>({});
  const [externalName, setExternalName] = useState("UPTD Lab. Kesehatan Daerah Kota Samarinda");
  const [externalAmount, setExternalAmount] = useState(115000);
  const [externalBankName, setExternalBankName] = useState("BPD Kaltimtara");
  const [externalAccountNo, setExternalAccountNo] = useState("00360012402202040039");
  const [externalAccountHolder, setExternalAccountHolder] = useState("UPTD Lab. Kesehatan Daerah Kota Samarinda");
  const [externalEvidenceNo, setExternalEvidenceNo] = useState("");
  const [externalEvidenceSuffix, setExternalEvidenceSuffix] = useState(DEFAULT_SUFFIX);
  const [externalDescription, setExternalDescription] = useState(() =>
    buildExternalMcuDescription("Menik Tjahyoningrum, A.Md.", "2026-08-25")
  );
  const [ppk, setPpk] = useState<Official>(OFFICIALS[0]);
  const [pdo, setPdo] = useState<Official>(OFFICIALS[1]);
  const [verifikator, setVerifikator] = useState<Official>(OFFICIALS[2]);
  const [dbEmployees, setDbEmployees] = useState<FinanceEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState("sptjb");

  const allEmployees = useMemo(() => {
    const base = dbEmployees.length > 0 ? dbEmployees : MOCK_EMPLOYEES;
    const missingSelected = selectedEmployees.filter(
      (sel) => !base.some((b) => isSameEmployee(b, sel))
    );
    return [...missingSelected, ...base];
  }, [dbEmployees, selectedEmployees]);

  const pejabatMengetahuiList: MengetahuiOfficial[] = useMemo(() => {
    const matched = allEmployees.filter((emp) => {
      const pos = (emp.position || "").toLowerCase();
      const name = (emp.name || "").toLowerCase();
      return (
        pos.includes("kepala seksi") ||
        pos.includes("kasi") ||
        pos.includes("kasubbag") ||
        pos.includes("kepala subbagian") ||
        pos.includes("kepala sub") ||
        name.includes("suriawati") ||
        name.includes("dheny") ||
        name.includes("yulian") ||
        name.includes("bambang")
      );
    });

    const result: MengetahuiOfficial[] = [];

    matched.forEach((emp) => {
      let shortPos = emp.position || "Pejabat Pengawas";
      if (shortPos.includes("Wilayah II")) shortPos = "Kepala Seksi KSDA Wilayah II";
      else if (shortPos.includes("Wilayah I")) shortPos = "Kepala Seksi KSDA Wilayah I";
      else if (shortPos.includes("Wilayah III")) shortPos = "Kepala Seksi KSDA Wilayah III";
      else if (shortPos.toLowerCase().includes("tata usaha")) shortPos = "Kepala Subbagian Tata Usaha";

      if (!result.some((r) => isSameEmployee({ name: r.name, nik: r.nik } as any, emp as any))) {
        result.push({
          name: emp.name,
          nik: formatNip(emp.nip),
          position: shortPos,
        });
      }
    });

    PEJABAT_MENGETAHUI_OPTIONS.forEach((def) => {
      if (!result.some((r) => isSameEmployee({ name: r.name, nik: r.nik } as any, { name: def.name, nip: def.nik } as any))) {
        result.push(def);
      }
    });

    return result;
  }, [allEmployees]);

  const applySuratTugas = (letter: ApiSuratTugas) => {
    setSelectedStId(letter.id);
    if (letter.nomor_surat) {
      setSptNumber(letter.nomor_surat);
    }

    const origin = extractOriginFromMaksud(letter.maksud_tujuan);
    const destination = letter.tempat_tujuan || "Kabupaten Kutai Barat";
    const startDate = letter.tanggal_mulai || "2026-08-25";
    const endDate = letter.tanggal_selesai || "2026-09-01";
    const activityName = extractActivityNameFromMaksud(letter.maksud_tujuan);
    const letterMaksud = letter.maksud_tujuan || "";

    setTravel({
      origin,
      destination,
      startDate,
      endDate,
    });

    setSpjName(activityName);

    const letterStartDate = letter.tanggal_mulai ? new Date(letter.tanggal_mulai) : new Date();
    const mm = isNaN(letterStartDate.getTime()) ? "05" : String(letterStartDate.getMonth() + 1).padStart(2, "0");
    const yyyy = isNaN(letterStartDate.getTime()) ? "2026" : String(letterStartDate.getFullYear());
    const computedSpbSuffix = `/SPB/K.18/FOLU-NC23/${mm}/${yyyy}`;
    const computedSpdSuffix = `/K.18-TU/FOLU.NC-23/${mm}/${yyyy}`;
    const computedEvidenceSuffix = `/K.18/FOLU.NC-23/${mm}/${yyyy}`;

    setSpbNumber({ no: "", suffix: computedSpbSuffix });
    setSpdNumber({ no: "", suffix: computedSpdSuffix });
    setDefaultEvidenceSuffix(computedEvidenceSuffix);
    setExternalEvidenceSuffix(computedEvidenceSuffix);

    if (letter.employees && letter.employees.length > 0) {
      const mappedEmployees: FinanceEmployee[] = letter.employees.map((emp) => {
        const kepegawaianEmp = allEmployees.find(
          (k) =>
            (emp.id && String(k.id) === String(emp.id)) ||
            (emp.nip && cleanNip(k.nip) === cleanNip(emp.nip)) ||
            isSameEmployee(k, { name: emp.nama_lengkap, nip: emp.nip } as any)
        );

        const realRank = kepegawaianEmp?.rank || emp.pangkat_golongan || "Penata Muda (III/a)";
        const realPosition = kepegawaianEmp?.position || emp.jabatan || "Staf";
        const realName = kepegawaianEmp?.name || emp.nama_lengkap;
        const realNip = kepegawaianEmp?.nip || emp.nip;
        const realSatuanKerja =
          kepegawaianEmp?.satuanKerja ||
          (emp as any).unit_kerja ||
          (realName.toLowerCase().includes("tegar") || realName.toLowerCase().includes("menik")
            ? "Subbagian Tata Usaha"
            : "Seksi Konservasi Wilayah II");

        const isTu =
          realName.toLowerCase().includes("tegar") ||
          realName.toLowerCase().includes("menik") ||
          realSatuanKerja.toLowerCase().includes("tata usaha") ||
          realSatuanKerja.toLowerCase().includes("subbag tu") ||
          realSatuanKerja.toLowerCase().includes("balai");

        return {
          id: String(emp.id || kepegawaianEmp?.id || `emp-${Date.now()}`),
          name: realName,
          nip: realNip,
          rank: realRank,
          position: realPosition,
          satuanKerja: realSatuanKerja,
          origin: isTu ? "Samarinda" : origin,
          destination: destination,
        };
      });
      setSptEmployees(mappedEmployees);
      setSelectedEmployees(mappedEmployees);
      setRecipients(
        mappedEmployees.map((emp) => ({
          ...initialRecipient(emp, origin, destination, startDate, endDate, letterMaksud),
          evidenceSuffix: computedEvidenceSuffix,
        }))
      );
      const primaryEmpName = mappedEmployees[0]?.name || "Petugas";
      setExternalName("UPTD Lab. Kesehatan Daerah Kota Samarinda");
      setExternalAmount(115000);
      setExternalDescription(buildExternalMcuDescription(primaryEmpName, startDate));
    } else {
      setSptEmployees([]);
      setSelectedEmployees([]);
      setRecipients([]);
    }
  };

  const fetchSuratTugas = async () => {
    setIsLoadingLetters(true);
    try {
      const resp = await api.get("/surat-tugas", {
        params: { per_page: 100 },
      });
      const allLetters: ApiSuratTugas[] = resp.data?.data || [];
      const foluOnly = allLetters.filter((l) => {
        const dana = (l.sumber_dana || "").toLowerCase();
        const num = (l.nomor_surat || "").toLowerCase();
        const maksud = (l.maksud_tujuan || "").toLowerCase();
        return dana.includes("folu") || num.includes("folu") || maksud.includes("folu");
      });
      setFoluLetters(foluOnly);
    } catch (err) {
      console.error("Gagal memuat Surat Tugas FOLU:", err);
    } finally {
      setIsLoadingLetters(false);
    }
  };

  const fetchKepegawaianEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const resp = await api.get("/kepegawaian/employees", {
        params: { per_page: 500 },
      });
      const rawData = resp.data?.data || [];
      if (rawData.length > 0) {
        const mapped: FinanceEmployee[] = rawData.map((emp: { id: number | string; name?: string; nama_lengkap?: string; nip?: string; position?: string; jabatan?: string; department?: string; satuan_kerja?: string; rank?: string; pangkat_golongan?: string }) => {
          const name = emp.nama_lengkap || emp.name || "";
          const satuanKerja = emp.satuan_kerja || emp.department || "";
          const isTu =
            name.toLowerCase().includes("tegar") ||
            name.toLowerCase().includes("menik") ||
            name.toLowerCase().includes("sukma") ||
            satuanKerja.toLowerCase().includes("tata usaha") ||
            satuanKerja.toLowerCase().includes("subbag tu") ||
            satuanKerja.toLowerCase().includes("balai");
          return {
            id: String(emp.id),
            name,
            nip: emp.nip || "",
            rank: emp.pangkat_golongan || emp.rank || "Penata Muda (III/a)",
            position: emp.jabatan || emp.position || "Staf",
            satuanKerja: satuanKerja || (isTu ? "Subbagian Tata Usaha" : "Seksi Konservasi Wilayah II"),
            origin: isTu ? "Samarinda" : "Tenggarong",
            destination: "Kabupaten Kutai Barat",
          };
        });
        setDbEmployees(mapped);
      }
    } catch (err) {
      console.warn("Could not load Kepegawaian employees, using fallback:", err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchSuratTugas();
    fetchKepegawaianEmployees();
  }, []);

  useEffect(() => {
    if (!spjId) return;
    const loadExistingSpj = async () => {
      try {
        const res = await api.get(`/api/keuangan/spj/${spjId}`);
        const data = res.data?.data;
        if (!data) return;

        if (data.nomor_spj) setNomorSpj(data.nomor_spj);
        if (data.tipe_anggaran) setTipeAnggaran(data.tipe_anggaran);
        if (data.nama_kegiatan) {
          setSpjName(data.nama_kegiatan);
          setActivity((prev) => ({
            ...prev,
            name: data.nama_kegiatan,
            awpCode: data.kode_awp || prev.awpCode,
          }));
        }
        if (data.nomor_spt) setSptNumber(data.nomor_spt);
        if (data.surat_tugas_id) setSelectedStId(data.surat_tugas_id);
        if (data.asal || data.tujuan) {
          setTravel({
            origin: data.asal || "Samarinda",
            destination: data.tujuan || "Kabupaten Kutai Barat",
            startDate: data.tanggal_mulai ? data.tanggal_mulai.split("T")[0] : "2026-07-10",
            endDate: data.tanggal_selesai ? data.tanggal_selesai.split("T")[0] : "2026-07-17",
          });
        }
        if (data.pejabat_ppk) setPpk(data.pejabat_ppk);
        if (data.pejabat_pdo) setPdo(data.pejabat_pdo);
        if (data.pejabat_verifikator) setVerifikator(data.pejabat_verifikator);
        if (data.recipients && Array.isArray(data.recipients)) {
          const sanitizedRecipients: RecipientRow[] = data.recipients.map((r: any) => ({
            id: String(r.id || `rec-${Date.now()}`),
            name: r.name || "",
            type: r.type === "pihak_ketiga" ? "pihak_ketiga" : "pegawai",
            description: r.description || "",
            evidenceNo: r.evidenceNo || "",
            evidenceSuffix: r.evidenceSuffix || DEFAULT_SUFFIX,
            amount: Number(r.amount) || 0,
            rinba: r.rinba || buildDefaultRinba(r.name || "Petugas", data.asal || "Samarinda", data.tujuan || "Kabupaten Kutai Barat"),
          }));
          setRecipients(sanitizedRecipients);
          const emps: FinanceEmployee[] = sanitizedRecipients
            .filter((r) => r.type === "pegawai")
            .map((r) => ({
              id: r.id,
              name: r.name,
              nip: r.id?.replace("employee-", "") || "",
              rank: "Pelaksana",
              position: "Pegawai",
              origin: data.asal || "Samarinda",
              destination: data.tujuan || "Kabupaten Kutai Barat",
            }));
          if (emps.length > 0) {
            setSelectedEmployees(emps);
          }
        }
        toast.info(`Mode Edit: Memuat data SPJ #${spjId}`);
      } catch (err) {
        console.error("Gagal memuat SPJ untuk diedit:", err);
        toast.error("Gagal memuat data SPJ untuk diedit.");
      }
    };
    loadExistingSpj();
  }, [spjId]);

  const displayedEmployees = useMemo(() => {
    if (source === "linked") {
      if (!employeeSearch.trim()) return sptEmployees;
      const q = employeeSearch.toLowerCase();
      const qNum = cleanNip(employeeSearch);
      return allEmployees.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(e.nip).includes(qNum)) ||
        e.nip.includes(q)
      );
    }
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase();
      const qNum = cleanNip(employeeSearch);
      return allEmployees.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(e.nip).includes(qNum)) ||
        e.nip.includes(q)
      );
    }
    return [...allEmployees].sort((a, b) => {
      const aSel = selectedEmployees.some((item) => isSameEmployee(item, a));
      const bSel = selectedEmployees.some((item) => isSameEmployee(item, b));
      return (bSel ? 1 : 0) - (aSel ? 1 : 0);
    });
  }, [allEmployees, employeeSearch, selectedEmployees, source, sptEmployees]);

  const filteredFoluLetters = useMemo(() => {
    if (!sptSearch.trim()) return foluLetters;
    return foluLetters.filter((letter) =>
      letter.nomor_surat?.toLowerCase().includes(sptSearch.toLowerCase()) ||
      letter.maksud_tujuan?.toLowerCase().includes(sptSearch.toLowerCase()) ||
      letter.employees?.some((e) => e.nama_lengkap.toLowerCase().includes(sptSearch.toLowerCase()))
    );
  }, [foluLetters, sptSearch]);

  const total = recipients.reduce((sum, item) => sum + item.amount, 0);
  const documentCounts = useMemo(() => DOCUMENT_LABELS.map((document) => ({ ...document, count: ["rinba", "spd", "spb", "kuitansi"].includes(document.key) ? recipients.length : 1 })), [recipients.length]);
  const selectedDocumentLabel = DOCUMENT_LABELS.find((document) => document.key === selectedDocument)?.label || "SPTJB / Rekap";

  const previewRecipients = useMemo(() => {
    return recipients.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      evidence: r.evidenceNo ? `${r.evidenceNo}${r.evidenceSuffix}` : `          ${r.evidenceSuffix}`,
      amount: r.amount,
      rinba: r.rinba,
      bankName: r.bankName,
      accountNo: r.accountNo,
      accountHolder: r.accountHolder,
      nip: r.nip,
      rank: r.rank,
      position: r.position,
      satuanKerja: r.satuanKerja,
      mengetahui: r.mengetahui,
    }));
  }, [recipients]);

  const updateRinbaOperasionalDays = (id: string, days: number) => {
    setRecipients((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const currentRinba = item.rinba || buildDefaultRinba(item.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const nextRinba = { ...currentRinba, operasionalDays: Math.max(1, days) };
        const newTotal = calculateRinbaTotal(nextRinba);
        return { ...item, rinba: nextRinba, amount: newTotal };
      })
    );
  };

  const updateRinbaOperasionalDailyRate = (id: string, rate: number) => {
    setRecipients((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const currentRinba = item.rinba || buildDefaultRinba(item.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const nextRinba = { ...currentRinba, operasionalDailyRate: rate };
        const newTotal = calculateRinbaTotal(nextRinba);
        return { ...item, rinba: nextRinba, amount: newTotal };
      })
    );
  };

  const updateRinbaTransportItem = (id: string, index: number, patch: Partial<TransportItem>) => {
    setRecipients((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const currentRinba = item.rinba || buildDefaultRinba(item.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const newItems = [...currentRinba.transportItems];
        newItems[index] = { ...newItems[index], ...patch };
        const nextRinba = { ...currentRinba, transportItems: newItems };
        const newTotal = calculateRinbaTotal(nextRinba);
        return { ...item, rinba: nextRinba, amount: newTotal };
      })
    );
  };

  const addRinbaTransportItem = (id: string) => {
    setRecipients((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const currentRinba = item.rinba || buildDefaultRinba(item.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const newItems = [
          ...currentRinba.transportItems,
          { id: `t-${Date.now()}`, label: "Transportasi Lokal", amount: 0 },
        ];
        const nextRinba = { ...currentRinba, transportItems: newItems };
        const newTotal = calculateRinbaTotal(nextRinba);
        return { ...item, rinba: nextRinba, amount: newTotal };
      })
    );
  };

  const removeRinbaTransportItem = (id: string, index: number) => {
    setRecipients((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const currentRinba = item.rinba || buildDefaultRinba(item.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
        const newItems = currentRinba.transportItems.filter((_, i) => i !== index);
        const nextRinba = { ...currentRinba, transportItems: newItems };
        const newTotal = calculateRinbaTotal(nextRinba);
        return { ...item, rinba: nextRinba, amount: newTotal };
      })
    );
  };

  const toggleRinbaExpanded = (id: string) => {
    setExpandedRinbaIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAllRinba = (open: boolean) => {
    const next: Record<string, boolean> = {};
    recipients.forEach((r) => {
      if (r.type === "pegawai") next[r.id] = open;
    });
    setExpandedRinbaIds(next);
  };

  const syncRecipients = (employees: FinanceEmployee[]) =>
    setRecipients((current) => [
      ...employees.map((e) => ({
        ...initialRecipient(e, travel.origin, travel.destination, travel.startDate, travel.endDate, spjName),
        evidenceSuffix: defaultEvidenceSuffix,
      })),
      ...current.filter((item) => item.type === "pihak_ketiga"),
    ]);

  const toggleEmployee = (employee: FinanceEmployee) => {
    const exists = selectedEmployees.some((item) => isSameEmployee(item, employee));
    const next = exists
      ? selectedEmployees.filter((item) => !isSameEmployee(item, employee))
      : [...selectedEmployees, employee];
    setSelectedEmployees(next);
    syncRecipients(next);
    if (next.length > 0) {
      setExternalDescription(buildExternalMcuDescription(next[0].name, travel.startDate));
    }
  };

  const addExternal = () => {
    if (!externalName.trim()) {
      toast.error("Isi nama penerima eksternal terlebih dahulu.");
      return;
    }
    setRecipients((items) => [
      ...items,
      {
        id: `external-${Date.now()}`,
        name: externalName.trim(),
        type: "pihak_ketiga",
        description: externalDescription,
        evidenceNo: externalEvidenceNo,
        evidenceSuffix: externalEvidenceSuffix || DEFAULT_SUFFIX,
        amount: externalAmount || 115000,
        bankName: externalBankName.trim() || "BPD Kaltimtara",
        accountNo: externalAccountNo.trim() || "00360012402202040039",
        accountHolder: externalAccountHolder.trim() || externalName.trim(),
      },
    ]);
    toast.success("Penerima eksternal ditambahkan ke REKAP.");
  };

  const updateRecipient = (id: string, patch: Partial<RecipientRow>) =>
    setRecipients((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeRecipient = (id: string) =>
    setRecipients((items) => items.filter((item) => item.id !== id));

  const nextStep = () => {
    if (step === 0) {
      if (!spjName.trim()) {
        toast.error("Nama SPJ tidak boleh kosong.");
        return;
      }
      if (!sptNumber.trim()) {
        toast.error("Nomor SPT Panduan tidak boleh kosong.");
        return;
      }
      if (selectedEmployees.length === 0) {
        toast.error("Pilih minimal satu pegawai personil.");
        return;
      }
    }
    if (step === 1 && recipients.length === 0) {
      toast.error("Minimal harus ada satu penerima di REKAP.");
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const printDocument = () => {
    window.print();
  };

  const handleSaveSpj = async (statusToSave: "Draft" | "Diajukan") => {
    const finalSpjName = spjName.trim() || activity.name.trim();
    if (!finalSpjName) {
      toast.error("Nama SPJ tidak boleh kosong.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("Minimal harus ada satu penerima di REKAP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nomor_spj: nomorSpj.trim() || undefined,
        nama_kegiatan: finalSpjName,
        tipe_anggaran: tipeAnggaran,
        nomor_spt: sptNumber,
        surat_tugas_id: selectedStId || null,
        sumber_dana: tipeAnggaran === "FOLU" ? "FOLU-NC-23" : "DIPA",
        kode_awp: activity.awpCode,
        satuan_kerja: SATUAN_KERJA,
        asal: travel.origin,
        tujuan: travel.destination,
        tanggal_mulai: travel.startDate,
        tanggal_selesai: travel.endDate,
        pejabat_ppk: ppk,
        pejabat_pdo: pdo,
        pejabat_verifikator: verifikator,
        pejabat_kasubbag: OFFICIALS[3],
        recipients,
        total_anggaran: total,
        employee_count: recipients.length,
        status: statusToSave,
      };

      if (isEditMode && spjId) {
        await api.put(`/api/keuangan/spj/${spjId}`, payload);
        toast.success(
          statusToSave === "Diajukan"
            ? "SPJ berhasil diperbarui dan diajukan!"
            : "SPJ draft berhasil diperbarui!"
        );
      } else {
        await api.post("/api/keuangan/spj", payload);
        toast.success(
          statusToSave === "Diajukan"
            ? "SPJ berhasil disimpan dan diajukan!"
            : "SPJ berhasil disimpan sebagai draft!"
        );
      }
      router.push("/keuangan/spj");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Gagal menyimpan SPJ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canWrite) {
    return (
      <div className="p-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
          <Banknote className="mx-auto h-8 w-8" />
          <h1 className="mt-3 font-bold">Akses terbatas</h1>
          <p className="mt-2 text-sm">Hanya admin dan superadmin yang dapat membuat atau mengubah SPJ.</p>
          <Link href="/keuangan/spj" className="mt-5 inline-block text-sm font-semibold underline">
            Kembali ke daftar SPJ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-5 md:p-10 print:p-0">
      <div className="flex items-center gap-3 print:hidden">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link href="/keuangan/spj" aria-label="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            KEUANGAN / SPJ / {isEditMode ? `EDIT #${spjId}` : "BARU"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {isEditMode ? "Edit SPJ" : "Buat SPJ"}
          </h1>
        </div>
      </div>

      {/* TIPE ANGGARAN SWITCHER */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl print:hidden">
        <button
          type="button"
          onClick={() => setTipeAnggaran("FOLU")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            tipeAnggaran === "FOLU"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-white/60"
          }`}
        >
          SPJ Dana FOLU Net Sink 2030 (Aktif)
        </button>
        <button
          type="button"
          disabled
          title="Format SPJ DIPA akan segera hadir"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
        >
          SPJ DIPA (Mendatang)
        </button>
      </div>

      <div className="overflow-x-auto print:hidden">
        <div className="flex min-w-160 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  index < step
                    ? "bg-emerald-100 text-emerald-700"
                    : index === step
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                {index < step ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`text-xs font-semibold ${
                  index === step ? "text-slate-900 dark:text-white" : "text-slate-400"
                }`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${
                    index < step ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="space-y-6 print:hidden">
          {/* Identitas SPJ: Nama SPJ dan Nomor SPJ Berdampingan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-base font-bold">Identitas SPJ</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Nama kegiatan dan nomor SPJ yang akan tercantum pada seluruh berkas pertanggungjawaban belanja.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">
                  Nama SPJ <span className="text-red-500">*</span>
                </label>
                <Input
                  value={spjName || ""}
                  onChange={(e) => setSpjName(e.target.value)}
                  className="mt-1.5 rounded-xl bg-white font-medium text-xs"
                  placeholder="Contoh: Smart Patrol di Suaka Marga Satwa Kelian"
                />
                <span className="mt-1 block text-[11px] text-slate-400 font-normal">
                  Nama SPJ utama yang akan tersimpan saat di-save.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>Nomor SPJ</span>
                  <span className="text-[10px] text-amber-600 font-normal">Dapat diedit</span>
                </label>
                <Input
                  value={nomorSpj || ""}
                  onChange={(e) => setNomorSpj(e.target.value)}
                  className="mt-1.5 rounded-xl font-mono text-xs font-bold text-amber-800 dark:text-amber-300"
                  placeholder="SPJ.001/K.18/TU/FOLU-NC-23/VIII/2026"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      Khusus Dana FOLU
                    </Badge>
                    {isLoadingLetters && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                  </div>
                  <h2 className="mt-2 font-bold text-base">Surat Tugas (SPT Panduan)</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Pilih Surat Tugas aktif yang dibiayai oleh dana <b>FOLU NC 2&amp;3</b> untuk otomatis mengisi personil, rute, dan jadwal.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-700"
                  onClick={fetchSuratTugas}
                  title="Muat ulang surat tugas"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingLetters ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {([["linked", "Pilih dari Database FOLU"], ["manual", "Isi manual"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSource(value)}
                    className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                      source === value
                        ? "bg-white text-amber-700 shadow-sm dark:bg-slate-700 dark:text-amber-300"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {source === "linked" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={sptSearch || ""}
                      onChange={(event) => setSptSearch(event.target.value)}
                      placeholder="Cari nomor ST, kegiatan, atau personil..."
                      className="rounded-xl pl-9 text-xs"
                    />
                  </div>

                  {isLoadingLetters ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-600 mb-2" />
                      Memuat Surat Tugas Dana FOLU...
                    </div>
                  ) : filteredFoluLetters.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                      <p className="font-semibold">Tidak ada Surat Tugas dengan sumber dana FOLU.</p>
                      <p className="mt-1 text-slate-400">Pastikan Surat Tugas dibuat dengan sumber dana FOLU NC 2&amp;3 di menu Kepegawaian.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-lg text-xs"
                        onClick={() => setSource("manual")}
                      >
                        Beralih ke Input Manual
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {filteredFoluLetters.map((letter) => {
                        const isSelected = selectedStId === letter.id || sptNumber === letter.nomor_surat;
                        const employeeNames = letter.employees?.map((e) => e.nama_lengkap).join(", ") || "Tidak ada pegawai";

                        return (
                          <button
                            key={letter.id}
                            type="button"
                            onClick={() => applySuratTugas(letter)}
                            className={`w-full rounded-xl border p-3.5 text-left text-xs transition relative ${
                              isSelected
                                ? "border-amber-400 bg-amber-50/90 text-amber-950 shadow-sm dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-100"
                                : "border-slate-200 hover:border-amber-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
                                <FileCheck2 className="h-4 w-4 shrink-0 text-amber-600" />
                                <span className="truncate">{letter.nomor_surat}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  letter.status === "approved"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 shrink-0 text-[10px]"
                                    : "border-amber-300 bg-amber-50 text-amber-700 shrink-0 text-[10px]"
                                }
                              >
                                {letter.status === "approved" ? "Disetujui" : letter.status}
                              </Badge>
                            </div>

                            <p className="mt-2 font-medium line-clamp-2 text-slate-700 dark:text-slate-300 leading-snug">
                              {letter.maksud_tujuan || "Pelaksanaan tugas lapangan"}
                            </p>

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>📍 {letter.tempat_tujuan || "Kab. Kutai Barat"}</span>
                              <span>📅 {letter.tanggal_mulai || "-"} s.d {letter.tanggal_selesai || "-"}</span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Personil: </span>
                              <span className="line-clamp-1">{employeeNames}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold">Nomor SPT Panduan</label>
                <Input
                  value={sptNumber || ""}
                  onChange={(event) => setSptNumber(event.target.value)}
                  className="mt-1.5 rounded-xl font-mono text-xs"
                  placeholder="ST.685/K.18/TU/..."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base">Personil Perjalanan Dinas</h2>
                    {isLoadingEmployees && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {source === "linked"
                      ? "Personil otomatis mengikuti nama orang yang ada di SPT."
                      : "Pilih personil perjalanan dinas secara manual dari daftar pegawai di kepegawaian."}
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0">
                  {selectedEmployees.length} Terpilih
                </Badge>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={employeeSearch || ""}
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder={source === "linked" ? "Cari / tambah personil lain..." : "Cari nama atau NIP pegawai..."}
                  className="rounded-xl pl-9 text-xs"
                />
              </div>

              <div className="space-y-2 flex-1 max-h-[380px] overflow-y-auto pr-1">
                {displayedEmployees.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    {source === "linked"
                      ? "Tidak ada data personil pada Surat Tugas ini."
                      : "Tidak ada pegawai yang cocok dengan pencarian."}
                  </div>
                ) : (
                  displayedEmployees.map((employee) => {
                    const checked = selectedEmployees.some((item) => isSameEmployee(item, employee));
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => toggleEmployee(employee)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                          checked
                            ? "border-amber-400 bg-amber-50/70 dark:border-amber-600 dark:bg-amber-500/10 shadow-xs"
                            : "border-slate-200 hover:border-amber-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            checked ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="block text-sm truncate">{employee.name}</strong>
                            {checked && (
                              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0 h-4">
                                Tercentang
                              </Badge>
                            )}
                          </div>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            NIP {employee.nip} · {employee.rank}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {employee.position} · {employee.destination}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-6 print:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <FileSpreadsheet className="h-4 w-4" /> TAHAP 2
                </div>
                <h2 className="text-2xl font-bold">REKAP</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Surat Pernyataan Tanggung Jawab Belanja — satu dokumen dengan banyak baris penerima.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllRinba(true)}
                  className="h-8 rounded-lg border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  <ReceiptText className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Buka Semua RINBA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllRinba(false)}
                  className="h-8 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Tutup Semua
                </Button>
                <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {recipients.length} penerima
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800/60">
              <InfoRow label="Nama Satuan Kerja" value={SATUAN_KERJA} />
              <Field label="Kode AWP">
                <Input
                  value={activity.awpCode || ""}
                  onChange={(e) => setActivity({ ...activity, awpCode: e.target.value })}
                  className="rounded-xl bg-white font-mono text-xs"
                  placeholder="C.1.1.2.01"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Nama Kegiatan">
                  <Input
                    value={activity.name || ""}
                    onChange={(e) => setActivity({ ...activity, name: e.target.value })}
                    className="rounded-xl bg-white font-medium text-xs"
                    placeholder="Operasionalisasi SMART Patrol di KSA, KPA dan TB"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400 font-normal">
                    Nama kegiatan yang tercantum pada dokumen SPTJB / REKAP (Default FOLU: Operasionalisasi SMART Patrol di KSA, KPA dan TB).
                  </span>
                </Field>
              </div>
            </div>

            {/* Format Penomoran Dokumen (SPB, SPD/RINBA, Default Kwitansi/Bukti) */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Format Penomoran Dokumen SPJ
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  2 kolom (No. Urut &amp; Format Suffix) untuk SPB, SPD, RINBA, dan Kwitansi
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* SPB */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Surat Persetujuan Bayar (SPB)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">No:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={spbNumber.no || ""}
                      onChange={(e) => setSpbNumber((prev) => ({ ...prev, no: e.target.value }))}
                      placeholder="No."
                      className="w-16 shrink-0 rounded-lg text-center font-mono text-xs"
                    />
                    <Input
                      value={spbNumber.suffix || ""}
                      onChange={(e) => setSpbNumber((prev) => ({ ...prev, suffix: e.target.value }))}
                      placeholder="/SPB/K.18/FOLU-NC23/05/2026"
                      className="min-w-0 flex-1 rounded-lg font-mono text-xs text-amber-800 dark:text-amber-300 font-semibold"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Contoh: No: {spbNumber.no || "___"}{spbNumber.suffix}
                  </p>
                </div>

                {/* SPD & RINBA */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Surat Perjalanan Dinas (SPD &amp; RINBA)
                    </label>
                    <span className="text-[10px] text-amber-600 font-semibold">SPD.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={spdNumber.no || ""}
                      onChange={(e) => setSpdNumber((prev) => ({ ...prev, no: e.target.value }))}
                      placeholder="No."
                      className="w-16 shrink-0 rounded-lg text-center font-mono text-xs"
                    />
                    <Input
                      value={spdNumber.suffix || ""}
                      onChange={(e) => setSpdNumber((prev) => ({ ...prev, suffix: e.target.value }))}
                      placeholder="/K.18-TU/FOLU.NC-23/04/2026"
                      className="min-w-0 flex-1 rounded-lg font-mono text-xs text-amber-800 dark:text-amber-300 font-semibold"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Contoh: Nomor: SPD. {spdNumber.no || "___"}{spdNumber.suffix}
                  </p>
                </div>

                {/* Default Kwitansi / Bukti */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Default Suffix Bukti / Kwitansi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipients((prev) =>
                          prev.map((r) => ({ ...r, evidenceSuffix: defaultEvidenceSuffix }))
                        );
                        toast.success("Suffix diterapkan ke semua baris penerima!");
                      }}
                      className="text-[10px] text-amber-600 hover:underline font-semibold"
                    >
                      Terapkan ke Semua
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={defaultEvidenceSuffix || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDefaultEvidenceSuffix(val);
                        setRecipients((prev) =>
                          prev.map((r) => ({ ...r, evidenceSuffix: val }))
                        );
                      }}
                      placeholder="/K.18/FOLU.NC-23/08/2026"
                      className="w-full rounded-lg font-mono text-xs text-amber-800 dark:text-amber-300 font-semibold"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Format suffix otomatis disinkronkan ke baris bukti
                  </p>
                </div>
              </div>

              {/* SPB Configuration Card */}
              <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pengaturan &amp; Kustomisasi Isi Dokumen SPB
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Dapat disesuaikan per SPJ sebelum dicetak
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Virtual Account */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Virtual Account
                    </label>
                    <Input
                      value={spbConfig.virtualAccount || ""}
                      onChange={(e) => setSpbConfig((prev) => ({ ...prev, virtualAccount: e.target.value }))}
                      placeholder="9899410000000115"
                      className="mt-1 rounded-lg font-mono text-xs bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>

                  {/* Jabatan PPK */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Jabatan PPK (Pemberi Persetujuan)
                    </label>
                    <Input
                      value={spbConfig.ppkPosition || ""}
                      onChange={(e) => setSpbConfig((prev) => ({ ...prev, ppkPosition: e.target.value }))}
                      placeholder="Pejabat Pembuat Komitmen IP BKSDA Kalimantan Timur"
                      className="mt-1 rounded-lg text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                  </div>

                  {/* Prefix Keperluan */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Prefix Keperluan (Poin 1)
                    </label>
                    <Input
                      value={spbConfig.keperluanPrefix || ""}
                      onChange={(e) => setSpbConfig((prev) => ({ ...prev, keperluanPrefix: e.target.value }))}
                      placeholder="Pembayaran Biaya"
                      className="mt-1 rounded-lg text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                  </div>

                  {/* Kota / Tanggal TTD */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Tempat / Tanggal TTD PPK
                    </label>
                    <Input
                      value={spbConfig.cityDateText || ""}
                      onChange={(e) => setSpbConfig((prev) => ({ ...prev, cityDateText: e.target.value }))}
                      placeholder="Samarinda,"
                      className="mt-1 rounded-lg text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Teks Perintah Poin 2 */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Teks Perintah Beban Anggaran (Poin 2 SPB)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSpbConfig((prev) => ({ ...prev, point2Text: DEFAULT_SPB_POINT2 }))}
                      className="text-[10px] text-amber-600 hover:underline font-semibold"
                    >
                      Reset ke Default
                    </button>
                  </div>
                  <Textarea
                    value={spbConfig.point2Text || ""}
                    onChange={(e) => setSpbConfig((prev) => ({ ...prev, point2Text: e.target.value }))}
                    placeholder="Memerintahkan Pemegang Dana Operasional untuk pembayaran dan membebankan pengeluaran pada..."
                    className="rounded-lg text-xs bg-white dark:bg-slate-900 min-h-16 leading-relaxed"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Gunakan <code className="font-mono text-amber-600 dark:text-amber-400">{"{awpCode}"}</code> jika ingin kode AWP terisi secara otomatis.
                  </p>
                </div>
              </div>

              {/* SPD Document Customization Card */}
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-black text-[10px] text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      SPD
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pengaturan &amp; Kustomisasi Isi Dokumen SPD (Poin 1 &amp; Poin 9)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSpdConfig({
                        ppkPoin1Text: DEFAULT_SPD_PPK_POIN1,
                        anggaranHeader: DEFAULT_SPD_ANGGARAN_HEADER,
                        instansiPoin9a: DEFAULT_SPD_INSTANSI,
                        akunPoin9b: "{awpCode}",
                      })
                    }
                    className="text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset SPD ke Default
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
                  {/* PPK Poin 1 */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Pejabat Pembuat Komitmen (Poin 1 SPD)
                    </label>
                    <Input
                      value={spdConfig.ppkPoin1Text || ""}
                      onChange={(e) => setSpdConfig((prev) => ({ ...prev, ppkPoin1Text: e.target.value }))}
                      placeholder="FOLU RBC NC 2&3 IP BKSDA KALTIM TA 2026"
                      className="mt-1 rounded-lg text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                  </div>

                  {/* Instansi Poin 9.a */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Instansi Pembebanan (Poin 9.a SPD)
                    </label>
                    <Input
                      value={spdConfig.instansiPoin9a || ""}
                      onChange={(e) => setSpdConfig((prev) => ({ ...prev, instansiPoin9a: e.target.value }))}
                      placeholder="Balai KSDA Kalimantan Timur"
                      className="mt-1 rounded-lg text-xs bg-white dark:bg-slate-900 font-medium"
                    />
                  </div>

                  {/* Akun Poin 9.b */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Akun / Kode AWP (Poin 9.b SPD)
                    </label>
                    <Input
                      value={spdConfig.akunPoin9b || ""}
                      onChange={(e) => setSpdConfig((prev) => ({ ...prev, akunPoin9b: e.target.value }))}
                      placeholder="{awpCode}"
                      className="mt-1 rounded-lg font-mono text-xs bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                </div>

                {/* Sumber Dana Pembebanan Anggaran (Poin 9 Header) */}
                <div className="mt-3">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Sumber Dana Pembebanan Anggaran (Poin 9 SPD)
                  </label>
                  <Textarea
                    value={spdConfig.anggaranHeader || ""}
                    onChange={(e) => setSpdConfig((prev) => ({ ...prev, anggaranHeader: e.target.value }))}
                    placeholder="Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - TA 2026"
                    className="mt-1 rounded-lg text-xs bg-white dark:bg-slate-900 min-h-14 leading-relaxed"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Gunakan <code className="font-mono text-blue-600 dark:text-blue-400">{"{awpCode}"}</code> pada kolom Akun jika ingin kode AWP terisi secara otomatis.
                  </p>
                </div>
              </div>
            </div>

            {/* REKAP Recipient Table & RINBA Editor */}
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="hidden grid-cols-[2.5rem_1.1fr_2fr_1.4fr_1fr_auto] gap-3 bg-slate-100 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:grid dark:bg-slate-800">
                <span className="whitespace-nowrap">NO</span>
                <span>Penerima</span>
                <span>Uraian</span>
                <span>Bukti (No. &amp; Format)</span>
                <span>Jumlah (Rp.)</span>
                <span />
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {recipients.map((recipient, index) => {
                  const isPegawai = recipient.type === "pegawai";
                  const rinba = recipient.rinba || buildDefaultRinba(recipient.name, travel.origin, travel.destination, travel.startDate, travel.endDate);
                  const isExpanded = Boolean(expandedRinbaIds[recipient.id]);

                  const operasionalTotal = (rinba.operasionalDays || 8) * (rinba.operasionalDailyRate || 360000);

                  return (
                    <div key={recipient.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                      <div className="grid gap-4 md:grid-cols-[2.5rem_1.1fr_2fr_1.4fr_1fr_auto] md:items-start">
                        <div className="text-xs font-bold text-slate-400 whitespace-nowrap pt-2">{index + 1}</div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Penerima</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              value={recipient.name || ""}
                              onChange={(e) => updateRecipient(recipient.id, { name: e.target.value })}
                              className="rounded-lg font-semibold text-xs"
                            />
                            <Badge
                              variant="outline"
                              className={
                                recipient.type === "pegawai"
                                  ? "border-blue-200 bg-blue-50 text-blue-700 text-[10px]"
                                  : "border-violet-200 bg-violet-50 text-violet-700 text-[10px]"
                              }
                            >
                              {recipient.type === "pegawai" ? "Pegawai" : "Eksternal"}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Uraian</label>
                          <Textarea
                            value={recipient.description || ""}
                            onChange={(e) => updateRecipient(recipient.id, { description: e.target.value })}
                            className="mt-1 min-h-24 rounded-lg text-xs leading-5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Bukti</label>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Input
                              value={recipient.evidenceNo || ""}
                              onChange={(e) => updateRecipient(recipient.id, { evidenceNo: e.target.value })}
                              placeholder="001"
                              className="w-16 shrink-0 rounded-lg text-center font-mono text-xs"
                            />
                            <Input
                              value={recipient.evidenceSuffix || DEFAULT_SUFFIX}
                              onChange={(e) => updateRecipient(recipient.id, { evidenceSuffix: e.target.value })}
                              className="min-w-0 flex-1 rounded-lg font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Jumlah (Rp.)</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(recipient.amount)}
                            onChange={(e) => updateRecipient(recipient.id, { amount: parseRupiahInput(e.target.value) })}
                            className="mt-1 rounded-lg text-right font-mono text-xs"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-rose-500 hover:bg-rose-50"
                            onClick={() => removeRecipient(recipient.id)}
                            aria-label="Hapus penerima"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* RINBA Accordion Toggle & Form Card */}
                      {isPegawai && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                          <button
                            type="button"
                            onClick={() => toggleRinbaExpanded(recipient.id)}
                            className="flex w-full items-center justify-between text-left text-xs font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-900"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <ReceiptText className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>Form Rincian Biaya (RINBA) {recipient.name ? `— ${recipient.name}` : ""}</span>
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                {rinba.operasionalDays} hr @ Rp {formatNumber(rinba.operasionalDailyRate)} + {rinba.transportItems.length} Transport = {formatRupiah(recipient.amount)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              <span>{isExpanded ? "Tutup Form RINBA" : "Buka & Edit RINBA"}</span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="mt-4 space-y-4 rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-800 dark:bg-slate-900">
                              {/* 1. Operasional Pengamanan Hutan */}
                              <div>
                                <div className="flex items-center justify-between">
                                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-black text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                      1
                                    </span>
                                    Operasional Pengamanan Hutan
                                  </h4>
                                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                    Subtotal: {formatRupiah(operasionalTotal)}
                                  </span>
                                </div>
                                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Jumlah Hari</label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="30"
                                      value={rinba.operasionalDays || ""}
                                      onChange={(e) => updateRinbaOperasionalDays(recipient.id, parseInt(e.target.value, 10) || 1)}
                                      className="mt-1 rounded-lg text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Tarif per Hari (Rp)</label>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={formatRupiahInput(rinba.operasionalDailyRate)}
                                      onChange={(e) => updateRinbaOperasionalDailyRate(recipient.id, parseRupiahInput(e.target.value))}
                                      className="mt-1 rounded-lg text-right font-mono text-xs"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 2. Transportasi */}
                              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-black text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                      2
                                    </span>
                                    Rincian Transportasi
                                  </h4>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addRinbaTransportItem(recipient.id)}
                                    className="h-7 gap-1 rounded-lg border-amber-300 bg-amber-50/50 text-xs text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                                  >
                                    <Plus className="h-3 w-3" /> Tambah Rute
                                  </Button>
                                </div>

                                <div className="mt-2.5 space-y-2">
                                  {rinba.transportItems.map((item, itemIdx) => (
                                    <div key={item.id || itemIdx} className="grid grid-cols-[1fr_140px_auto] items-center gap-2">
                                      <Input
                                        value={item.label || ""}
                                        onChange={(e) => updateRinbaTransportItem(recipient.id, itemIdx, { label: e.target.value })}
                                        placeholder="Keterangan rute transportasi..."
                                        className="rounded-lg text-xs"
                                      />
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatRupiahInput(item.amount)}
                                        onChange={(e) => updateRinbaTransportItem(recipient.id, itemIdx, { amount: parseRupiahInput(e.target.value) })}
                                        placeholder="Rp 0"
                                        className="rounded-lg text-right font-mono text-xs"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeRinbaTransportItem(recipient.id, itemIdx)}
                                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                                        aria-label="Hapus rute"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                  {rinba.transportItems.length === 0 && (
                                    <p className="text-xs italic text-slate-400">Belum ada rincian transportasi untuk personil ini.</p>
                                  )}
                                </div>
                              </div>

                              {/* 3. Informasi Rekening Bank (untuk Dokumen Daftar Isian Pembayaran) */}
                              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-black text-[10px] text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                                      3
                                    </span>
                                    Informasi Rekening Bank (Daftar Isian Pembayaran)
                                  </h4>
                                </div>
                                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Nama Bank</label>
                                    <Input
                                      value={recipient.bankName || ""}
                                      onChange={(e) => updateRecipient(recipient.id, { bankName: e.target.value })}
                                      placeholder="Mandiri / BPD Kaltimtara"
                                      className="mt-1 rounded-lg text-xs font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Nomor Rekening</label>
                                    <Input
                                      value={recipient.accountNo || ""}
                                      onChange={(e) => updateRecipient(recipient.id, { accountNo: e.target.value })}
                                      placeholder="1480024359104"
                                      className="mt-1 rounded-lg font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Rekening Atas Nama</label>
                                    <Input
                                      value={recipient.accountHolder || ""}
                                      onChange={(e) => updateRecipient(recipient.id, { accountHolder: e.target.value })}
                                      placeholder={recipient.name}
                                      className="mt-1 rounded-lg text-xs font-medium"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 4. Data Personil & Jabatan (Dokumen SPD) */}
                              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 font-black text-[10px] text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                      4
                                    </span>
                                    Data Personil &amp; Jabatan (Dokumen SPD)
                                  </h4>
                                </div>
                                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">NIP</label>
                                    <Input
                                      value={recipient.nip || ""}
                                      onChange={(e) => updateRecipient(recipient.id, { nip: e.target.value })}
                                      placeholder="19880719 2012 1 003"
                                      className="mt-1 rounded-lg font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Pangkat / Golongan</label>
                                    <Input
                                      value={recipient.rank || ""}
                                      onChange={(e) => updateRecipient(recipient.id, { rank: e.target.value })}
                                      placeholder="Penata Muda (III/a)"
                                      className="mt-1 rounded-lg text-xs font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Jabatan</label>
                                    <Input
                                      value={recipient.position || ""}
                                      onChange={(e) => updateRecipient(recipient.id, { position: e.target.value })}
                                      placeholder="Polisi Kehutanan"
                                      className="mt-1 rounded-lg text-xs font-medium"
                                    />
                                  </div>
                                </div>

                                {/* Pilihan Pejabat Mengetahui */}
                                <div className="mt-3">
                                  <label className="text-[10px] font-bold uppercase text-slate-500">
                                    Pejabat Mengetahui / Atasan Langsung (Dokumen Kuitansi)
                                  </label>
                                  <div className="mt-1.5 flex flex-wrap gap-2">
                                    {pejabatMengetahuiList.map((pejabat) => {
                                      const isSelected = (recipient.mengetahui?.name || "") === pejabat.name;
                                      return (
                                        <button
                                          key={pejabat.name}
                                          type="button"
                                          onClick={() => updateRecipient(recipient.id, { mengetahui: pejabat })}
                                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                                            isSelected
                                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300"
                                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                                          }`}
                                        >
                                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-emerald-600 dark:bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                                          <span>{pejabat.name}</span>
                                          <span className="text-[10px] opacity-75">({pejabat.position})</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tambah Penerima Eksternal Section */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-violet-600" />
                  <h3 className="font-bold">Tambah penerima eksternal (Pihak ketiga / MCU)</h3>
                </div>
                <Badge variant="outline" className="border-violet-300 bg-violet-50 text-[10px] text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                  Labkesda / Puskesmas / Vendor
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nama Instansi / Pihak Ketiga</label>
                    <Input
                      value={externalName || ""}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder="Nama instansi (contoh: UPTD Labkesda)"
                      className="mt-1 rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">No. Bukti</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Input
                        value={externalEvidenceNo || ""}
                        onChange={(e) => setExternalEvidenceNo(e.target.value)}
                        placeholder="No."
                        className="w-16 shrink-0 rounded-xl bg-white text-center font-mono text-xs"
                      />
                      <Input
                        value={externalEvidenceSuffix || DEFAULT_SUFFIX}
                        onChange={(e) => setExternalEvidenceSuffix(e.target.value)}
                        placeholder="/K.18/..."
                        className="min-w-0 flex-1 rounded-xl bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Jumlah (Rp.)</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatRupiahInput(externalAmount)}
                      onChange={(e) => setExternalAmount(parseRupiahInput(e.target.value))}
                      placeholder="Jumlah (Rp.)"
                      className="mt-1 rounded-xl bg-white text-right font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nama Bank</label>
                    <Input
                      value={externalBankName || ""}
                      onChange={(e) => setExternalBankName(e.target.value)}
                      placeholder="BPD Kaltimtara"
                      className="mt-1 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nomor Rekening</label>
                    <Input
                      value={externalAccountNo || ""}
                      onChange={(e) => setExternalAccountNo(e.target.value)}
                      placeholder="00360012402202040039"
                      className="mt-1 rounded-xl bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Rekening Atas Nama</label>
                    <Input
                      value={externalAccountHolder || ""}
                      onChange={(e) => setExternalAccountHolder(e.target.value)}
                      placeholder={externalName}
                      className="mt-1 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Uraian Pengeluaran / Keterangan Lengkap
                    </label>
                    <Textarea
                      value={externalDescription || ""}
                      onChange={(e) => setExternalDescription(e.target.value)}
                      placeholder="Uraian pengeluaran lengkap (contoh: Biaya Medical Check Up a.n ...)"
                      className="mt-1 min-h-18 rounded-xl bg-white text-xs leading-5"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={addExternal}
                    className="h-11 rounded-xl bg-violet-600 px-6 hover:bg-violet-500 text-white font-semibold text-xs shrink-0"
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Tambah ke REKAP
                  </Button>
                </div>
              </div>
            </div>

            {/* Pejabat Penandatangan Form Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-amber-600" />
                  <h3 className="font-bold">Pejabat dan pengelola</h3>
                </div>
                <Badge variant="outline" className="text-[10px] text-slate-500 font-normal">
                  Cari dari master pegawai
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <SearchableOfficialSelect
                    label="Pejabat Pembuat Komitmen"
                    value={ppk}
                    onChange={setPpk}
                    employees={allEmployees}
                    defaultRoleLabel="Pejabat Pembuat Komitmen"
                  />
                  <p className="mt-1 text-xs text-slate-500">NIK / NIP: {formatNip(ppk.nik)}</p>
                </div>
                <div>
                  <SearchableOfficialSelect
                    label="Pemegang Dana Operasional"
                    value={pdo}
                    onChange={setPdo}
                    employees={allEmployees}
                    defaultRoleLabel="Pemegang Dana Operasional"
                  />
                  <p className="mt-1 text-xs text-slate-500">NIK / NIP: {formatNip(pdo.nik)}</p>
                </div>
                <div>
                  <SearchableOfficialSelect
                    label="Verifikator Keuangan"
                    value={verifikator}
                    onChange={setVerifikator}
                    employees={allEmployees}
                    defaultRoleLabel="Verifikator Keuangan"
                  />
                  <p className="mt-1 text-xs text-slate-500">NIK / NIP: {formatNip(verifikator.nik)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <FileSpreadsheet className="h-4 w-4" /> TAHAP 3
              </div>
              <h2 className="text-2xl font-bold">Review &amp; Cetak Dokumen</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pilih dokumen untuk melihat preview di bawahnya, lalu cetak setelah layout sesuai.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documentCounts.map((document) => (
                <button
                  key={document.key}
                  onClick={() => setSelectedDocument(document.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedDocument === document.key
                      ? "border-amber-400 bg-amber-50 shadow-sm dark:border-amber-600 dark:bg-amber-500/10"
                      : "border-slate-200 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <FileSpreadsheet
                      className={`h-5 w-5 ${selectedDocument === document.key ? "text-amber-600" : "text-slate-400"}`}
                    />
                    <Badge variant="outline">{document.count} output</Badge>
                  </div>
                  <p className="mt-4 text-sm font-bold">{document.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{document.description}</p>
                </button>
              ))}
            </div>
          </div>

          <DocumentTemplates
            selectedDocument={selectedDocument}
            recipients={previewRecipients}
            activity={{
              awpCode: activity.awpCode,
              name: activity.name.trim() || spjName.trim(),
            }}
            travel={travel}
            sptNumber={sptNumber}
            ppk={ppk}
            pdo={pdo}
            verifikator={verifikator}
            total={total}
            spbNumber={spbNumber}
            spdNumber={spdNumber}
            spbConfig={spbConfig}
            spdConfig={spdConfig}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700"
              onClick={() => handleSaveSpj("Draft")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4 text-slate-500" />
              )}
              {isEditMode ? "Simpan Perubahan Draft" : "Simpan sebagai Draft"}
            </Button>
            <Button
              className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
              onClick={() => handleSaveSpj("Diajukan")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? "Simpan & Ajukan SPJ" : "Simpan & Ajukan SPJ"}
            </Button>
            <Button className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white" onClick={printDocument}>
              <Printer className="mr-2 h-4 w-4" /> Print {selectedDocumentLabel}
            </Button>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800 print:hidden">
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={nextStep} className="h-11 rounded-xl bg-amber-600 px-5 hover:bg-amber-500 text-white">
            Lanjut <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SearchableOfficialSelect({
  label,
  value,
  onChange,
  employees,
  defaultRoleLabel,
}: {
  label: string;
  value: Official;
  onChange: (official: Official) => void;
  employees: FinanceEmployee[];
  defaultRoleLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const options = useMemo(() => {
    const defaultList: Official[] = OFFICIALS.map((o) => ({ ...o, nik: formatNip(o.nik) }));
    const extraList: Official[] = employees
      .filter((e) => !defaultList.some((d) => isSameEmployee(d, e)))
      .map((e) => ({
        id: String(e.id),
        name: e.name,
        nik: formatNip(e.nip),
        position: e.position || defaultRoleLabel,
      }));
    const combined = [...defaultList, ...extraList];

    if (!search.trim()) return combined;
    const q = search.toLowerCase();
    const qNum = cleanNip(search);
    return combined.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(o.nik).includes(qNum)) ||
        o.nik.toLowerCase().includes(q)
    );
  }, [employees, search, defaultRoleLabel]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="mt-1.5 flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium outline-none transition hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900"
        >
          <span className="truncate">{value?.name || "Pilih Pejabat"}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </label>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau NIP pegawai..."
                className="h-8 w-full rounded-lg bg-slate-50 pl-8 pr-3 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1 text-xs">
            {options.length === 0 ? (
              <div className="p-3 text-center text-slate-400">Pegawai tidak ditemukan</div>
            ) : (
              options.map((opt) => {
                const isSelected = isSameEmployee(opt, value);
                return (
                  <button
                    key={`${opt.id}-${opt.nik}`}
                    type="button"
                    onClick={() => {
                      onChange({
                        id: opt.id,
                        name: opt.name,
                        nik: formatNip(opt.nik),
                        position: opt.position || defaultRoleLabel,
                      });
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg p-2 text-left transition ${
                      isSelected
                        ? "bg-amber-50 font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{opt.name}</div>
                      <div className="text-[11px] text-slate-400">NIP: {formatNip(opt.nik)}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
