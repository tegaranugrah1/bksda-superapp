"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Banknote, Calculator, Check, CheckCircle2, ChevronDown, FileCheck2, FileSpreadsheet, Loader2, Plus, Printer, ReceiptText, RefreshCw, Search, Trash2, UserRound, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import api from "@/lib/api";
import { DOCUMENT_LABELS, FinanceEmployee, MOCK_EMPLOYEES, formatRupiah } from "@/app/keuangan/_components/finance-data";
import { DocumentTemplates } from "@/app/keuangan/_components/DocumentTemplates";

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

type RecipientType = "pegawai" | "pihak_ketiga";
interface RecipientRow {
  id: string;
  name: string;
  type: RecipientType;
  description: string;
  evidenceNo: string;
  evidenceSuffix: string;
  amount: number;
  rinba?: RinbaDetails;
}
interface Official { id: string; name: string; nik: string; position: string }

interface ApiEmployee {
  id: number | string;
  nama_lengkap: string;
  nip: string;
  jabatan?: string;
  pangkat_golongan?: string;
  satuan_kerja?: string;
}

interface ApiSuratTugas {
  id: string;
  nomor_surat: string;
  kode_surat?: string;
  maksud_tujuan?: string;
  tempat_tujuan?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  tanggal_surat?: string;
  sumber_dana?: string;
  sumber_dana_other?: string;
  status: string;
  employees?: ApiEmployee[];
}

const STEPS = ["SPT Panduan", "REKAP", "Review & Cetak"];
const SATUAN_KERJA = "Balai Konservasi Sumber Daya Alam Kalimantan Timur";
const OFFICIALS: Official[] = [
  { id: "ahmad-hidayat", name: "Ahmad Hidayat, S.PKP., M.Ling", nik: "19820301 200012 1 001", position: "Pejabat Pembuat Komitmen" },
  { id: "dilemma-ferti", name: "Dilemma Ferti Hidayah, S.E.", nik: "19870130 201012 2 005", position: "Pemegang Dana Operasional" },
  { id: "sukma-mawarni", name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053", position: "Verifikator Keuangan" },
  { id: "dheny-mardiono", name: "Dheny Mardiono, S.Hut., MSc.", nik: "19750314 199903 1 004", position: "Kepala Subbagian Tata Usaha" },
];
const DEFAULT_URAIAN = "Perjalanan dinas dari Tenggarong ke Kabupaten Kutai Barat dalam rangka kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian di Suaka Margasatwa Kelian selama 8 (Delapan) hari terhitung mulai tanggal 10 Juli 2026 sampai dengan 17 Juli 2026";
const externalUraian = "Biaya Medical Check Up a.n Didi Susanto, S. Si dalam rangka Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian Tanggal 08 Juli 2026";
const DEFAULT_SUFFIX = "/K.18/FOLU.NC-23/08/2026";

const formatRupiahInput = (num: number) => (num ? num.toLocaleString("id-ID") : "");
const parseRupiahInput = (str: string) => {
  const clean = str.replace(/\D/g, "");
  return clean ? parseInt(clean, 10) : 0;
};
const formatNumber = (value: number) => (value ? value.toLocaleString("id-ID") : "0");

function extractOriginFromMaksud(maksud?: string): string {
  if (!maksud) return "Samarinda";
  const match = maksud.match(/dari\s+([A-Za-z\s]+?)\s+ke\s+/i);
  if (match && match[1]) return match[1].trim();
  if (maksud.toLowerCase().includes("tenggarong")) return "Tenggarong";
  return "Samarinda";
}

function extractActivityNameFromMaksud(maksud?: string): string {
  if (!maksud) return "Operasionalisasi SMART Patrol di KSA, KPA dan TB";
  const match = maksud.match(/kegiatan\s+([^,;]+)/i);
  if (match && match[1]) {
    const act = match[1].trim();
    if (act.length > 5) return act;
  }
  return "Operasionalisasi SMART Patrol di KSA, KPA dan TB";
}

function buildUraianForEmployee(empName: string, origin: string, destination: string, startDate?: string, endDate?: string) {
  const startStr = startDate
    ? new Date(`${startDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "10 Juli 2026";
  const endStr = endDate
    ? new Date(`${endDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "17 Juli 2026";

  let days = 8;
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) days = diff;
  }

  const terbilangHari = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas"][days] || `${days}`;

  const empOrigin = empName.toLowerCase().includes("tegar") ? "Samarinda" : origin;
  return `Perjalanan dinas dari ${empOrigin} ke ${destination} dalam rangka kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian di Suaka Margasatwa Kelian selama ${days} (${terbilangHari}) hari terhitung mulai tanggal ${startStr} sampai dengan ${endStr}`;
}

function cleanNip(nip?: string): string {
  return (nip || "").replace(/\D/g, "");
}

function formatNip(nip?: string): string {
  if (!nip) return "-";
  const clean = nip.replace(/\D/g, "");
  if (clean.length === 18) {
    return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15, 18)}`;
  }
  return nip;
}

function cleanName(name?: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/(,\s*|\.)(s\.hut|s\.si|a\.md|s\.e|m\.ling|m\.sc|msc|m\.t|s\.pkp|a\.md\.kom|s\.tr\.kom|kom|hut|si|se|dr|ir)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function isSameEmployee(
  a?: { id?: string | number; nip?: string; nik?: string; name?: string },
  b?: { id?: string | number; nip?: string; nik?: string; name?: string }
): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;

  const nipA = cleanNip(a.nip || a.nik);
  const nipB = cleanNip(b.nip || b.nik);
  if (nipA && nipB && nipA.length >= 6 && nipB.length >= 6 && nipA === nipB) return true;

  const nameA = cleanName(a.name);
  const nameB = cleanName(b.name);
  if (nameA && nameB && nameA.length >= 4 && nameB.length >= 4 && (nameA === nameB || (nameA.startsWith(nameB) || nameB.startsWith(nameA)))) return true;

  return false;
}

function getTwoDaysBeforeFormatted(startDateStr?: string): string {
  if (!startDateStr) return "23 Agustus 2026";
  try {
    const d = new Date(`${startDateStr}T00:00:00`);
    d.setDate(d.getDate() - 2);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

const initialRecipient = (employee: FinanceEmployee, origin = "Samarinda", destination = "Kabupaten Kutai Barat", startDate = "2026-08-25", endDate = "2026-09-01"): RecipientRow => {
  const rinba = buildDefaultRinba(employee.name, origin, destination, startDate, endDate);
  const total = calculateRinbaTotal(rinba);
  return {
    id: `employee-${employee.id}`,
    name: employee.name,
    type: "pegawai",
    description: buildUraianForEmployee(employee.name, origin, destination, startDate, endDate),
    evidenceNo: "",
    evidenceSuffix: DEFAULT_SUFFIX,
    amount: total || (employee.name.toLowerCase().includes("tegar") ? 3590000 : 5590000),
    rinba,
  };
};

export default function CreateSpjPage() {
  const { canWrite } = useRole();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<"linked" | "manual">("linked");
  const [foluLetters, setFoluLetters] = useState<ApiSuratTugas[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [selectedStId, setSelectedStId] = useState<string>("");
  const [sptNumber, setSptNumber] = useState("ST.685/K.18/TU/FOLU-NC-23/KSA.02.01/B/07/2026");
  const [sptSearch, setSptSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [sptEmployees, setSptEmployees] = useState<FinanceEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<FinanceEmployee[]>([]);
  const [activity, setActivity] = useState({ awpCode: "C.1.1.2.01", name: "Operasionalisasi SMART Patrol di KSA, KPA dan TB" });
  const [travel, setTravel] = useState({ origin: "Tenggarong", destination: "Kabupaten Kutai Barat", startDate: "2026-07-10", endDate: "2026-07-17" });
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [expandedRinbaIds, setExpandedRinbaIds] = useState<Record<string, boolean>>({});
  const [externalName, setExternalName] = useState("UPTD Lab. Kesehatan Daerah Kota Samarinda");
  const [externalAmount, setExternalAmount] = useState(115000);
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

  // Master employees list (combines database employees with assigned SPT employees)
  const allEmployees = useMemo(() => {
    const base = dbEmployees.length > 0 ? dbEmployees : MOCK_EMPLOYEES;
    const missingSelected = selectedEmployees.filter(
      (sel) => !base.some((b) => isSameEmployee(b, sel))
    );
    return [...missingSelected, ...base];
  }, [dbEmployees, selectedEmployees]);

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

    setTravel({
      origin,
      destination,
      startDate,
      endDate,
    });

    setActivity((prev) => ({
      ...prev,
      name: activityName,
    }));

    if (letter.employees && letter.employees.length > 0) {
      const mappedEmployees: FinanceEmployee[] = letter.employees.map((emp) => ({
        id: String(emp.id),
        name: emp.nama_lengkap,
        nip: emp.nip,
        rank: emp.pangkat_golongan || "Penata Muda (III/a)",
        position: emp.jabatan || "Polisi Kehutanan",
        origin: emp.nama_lengkap.toLowerCase().includes("tegar") ? "Samarinda" : origin,
        destination: destination,
      }));
      setSptEmployees(mappedEmployees);
      setSelectedEmployees(mappedEmployees);

      // Default recipients contain ONLY employees (external is added manually if needed)
      setRecipients(
        mappedEmployees.map((emp) => initialRecipient(emp, origin, destination, startDate, endDate))
      );

      // Prepare MCU description for "Tambah penerima eksternal" box
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

  // Fetch real FOLU Surat Tugas from API
  const fetchSuratTugas = async () => {
    setIsLoadingLetters(true);
    try {
      const resp = await api.get("/surat-tugas", {
        params: { per_page: 100 },
      });
      const allLetters: ApiSuratTugas[] = resp.data?.data || [];
      const foluOnly = allLetters.filter((letter) => {
        const sDana = (letter.sumber_dana || "").toLowerCase();
        const sOther = (letter.sumber_dana_other || "").toLowerCase();
        const nomor = (letter.nomor_surat || "").toLowerCase();
        const maksud = (letter.maksud_tujuan || "").toLowerCase();
        return (
          sDana === "folu" ||
          sDana.includes("folu") ||
          sOther.includes("folu") ||
          nomor.includes("folu") ||
          maksud.includes("folu")
        );
      });
      setFoluLetters(foluOnly);

      // Auto-select first approved FOLU ST if available
      if (foluOnly.length > 0) {
        const primary = foluOnly.find((l) => l.status === "approved") || foluOnly[0];
        applySuratTugas(primary);
      }
    } catch (err) {
      console.error("Failed to fetch surat tugas:", err);
      toast.error("Gagal memuat daftar Surat Tugas dari server.");
    } finally {
      setIsLoadingLetters(false);
    }
  };

  // Fetch full employee master data from Kepegawaian
  const fetchKepegawaianEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      // Use /kepegawaian/employees/select which is public & returns full active personnel list
      const resp = await api.get("/kepegawaian/employees/select");
      const rawData = resp.data?.data || [];
      if (rawData.length > 0) {
        const mapped: FinanceEmployee[] = rawData.map((emp: { id: number | string; name?: string; nama_lengkap?: string; nip?: string; position?: string; jabatan?: string; department?: string; rank?: string; pangkat_golongan?: string }) => {
          const name = emp.name || emp.nama_lengkap || "";
          return {
            id: String(emp.id),
            name,
            nip: emp.nip || "",
            rank: emp.pangkat_golongan || emp.rank || "Pelaksana",
            position: emp.position || emp.jabatan || "Pegawai",
            origin: name.toLowerCase().includes("tegar") ? "Samarinda" : "Tenggarong",
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

  const displayedEmployees = useMemo(() => {
    if (source === "linked") {
      // In linked mode: default shows ONLY the personnel in the selected SPT!
      if (!employeeSearch.trim()) {
        return sptEmployees;
      }
      // If user actively searches, search across the master database
      const q = employeeSearch.toLowerCase();
      const qNum = cleanNip(employeeSearch);
      return allEmployees.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(e.nip).includes(qNum)) ||
        e.nip.includes(q)
      );
    }

    // In manual mode: search across master database
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase();
      const qNum = cleanNip(employeeSearch);
      return allEmployees.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(e.nip).includes(qNum)) ||
        e.nip.includes(q)
      );
    }
    // In manual mode without search: sort selected on top
    return [...allEmployees].sort((a, b) => {
      const aSel = selectedEmployees.some((item) => isSameEmployee(item, a));
      const bSel = selectedEmployees.some((item) => isSameEmployee(item, b));
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [source, sptEmployees, allEmployees, employeeSearch, selectedEmployees]);

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

  const syncRecipients = (employees: FinanceEmployee[]) => setRecipients((current) => [
    ...employees.map((e) => initialRecipient(e, travel.origin, travel.destination, travel.startDate, travel.endDate)),
    ...current.filter((item) => item.type === "pihak_ketiga")
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
    if (!externalName.trim()) { toast.error("Isi nama penerima eksternal terlebih dahulu."); return; }
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
      },
    ]);
    toast.success("Penerima eksternal ditambahkan ke REKAP.");
  };
  const updateRecipient = (id: string, patch: Partial<RecipientRow>) => setRecipients((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeRecipient = (id: string) => setRecipients((items) => items.filter((item) => item.id !== id));

  const nextStep = () => {
    if (step === 0 && (selectedEmployees.length === 0 || !sptNumber.trim())) { toast.error("Pilih minimal satu pegawai dan isi nomor SPT Panduan."); return; }
    if (step === 1 && (recipients.length === 0 || !activity.name.trim())) { toast.error("Lengkapi kegiatan dan minimal satu penerima."); return; }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };
  const printDocument = () => {
    window.print();
  };
  const submitPreview = () => toast.success("Preview SPJ siap dicetak.", { description: "Penyimpanan ke backend akan diaktifkan setelah endpoint final tersedia." });

  if (!canWrite) return <div className="p-10"><div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900"><Banknote className="mx-auto h-8 w-8" /><h1 className="mt-3 font-bold">Akses terbatas</h1><p className="mt-2 text-sm">Hanya admin dan superadmin yang dapat membuat atau mengubah SPJ.</p><Link href="/keuangan/spj" className="mt-5 inline-block text-sm font-semibold underline">Kembali ke daftar SPJ</Link></div></div>;

  return (
    <div className="space-y-7 p-5 md:p-10 print:p-0">
      <div className="flex items-center gap-3 print:hidden"><Button asChild variant="ghost" size="icon" className="rounded-xl"><Link href="/keuangan/spj" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Link></Button><div><p className="text-xs font-semibold text-amber-700 dark:text-amber-300">KEUANGAN / SPJ / BARU</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Buat SPJ</h1></div></div>
      <div className="overflow-x-auto print:hidden"><div className="flex min-w-160 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">{STEPS.map((label, index) => <div key={label} className="flex flex-1 items-center gap-2"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${index < step ? "bg-emerald-100 text-emerald-700" : index === step ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</div><span className={`text-xs font-semibold ${index === step ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{label}</span>{index < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${index < step ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />}</div>)}</div></div>

      {step === 0 && (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr] print:hidden">
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
                    value={sptSearch}
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
                value={sptNumber}
                onChange={(event) => setSptNumber(event.target.value)}
                className="mt-1.5 rounded-xl font-mono text-xs"
                placeholder="Masukkan nomor surat (contoh: ST.685/K.18/...)"
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
                value={employeeSearch}
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
                <Input value={activity.awpCode} onChange={(e) => setActivity({ ...activity, awpCode: e.target.value })} className="rounded-xl bg-white" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Nama Kegiatan">
                  <Input value={activity.name} onChange={(e) => setActivity({ ...activity, name: e.target.value })} className="rounded-xl bg-white" />
                </Field>
              </div>
            </div>

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
                  const isExpanded = !!expandedRinbaIds[recipient.id];

                  const operasionalTotal = (rinba.operasionalDays || 8) * (rinba.operasionalDailyRate || 360000);
                  const transportTotal = (rinba.transportItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);

                  return (
                    <div key={recipient.id} className="p-4 space-y-3">
                      <div className="grid gap-4 md:grid-cols-[2.5rem_1.1fr_2fr_1.4fr_1fr_auto] md:items-start">
                        <div className="text-xs font-bold text-slate-400 whitespace-nowrap pt-2">{index + 1}</div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Penerima</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input value={recipient.name} onChange={(e) => updateRecipient(recipient.id, { name: e.target.value })} className="rounded-lg font-semibold" />
                            <Badge variant="outline" className={recipient.type === "pegawai" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-violet-200 bg-violet-50 text-violet-700"}>
                              {recipient.type === "pegawai" ? "Pegawai" : "Eksternal"}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Uraian</label>
                          <Textarea value={recipient.description} onChange={(e) => updateRecipient(recipient.id, { description: e.target.value })} className="mt-1 min-h-28 rounded-lg text-xs leading-5" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Bukti</label>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Input
                              value={recipient.evidenceNo}
                              onChange={(e) => updateRecipient(recipient.id, { evidenceNo: e.target.value })}
                              placeholder="No."
                              className="w-16 shrink-0 rounded-lg text-center font-mono text-xs"
                            />
                            <Input
                              value={recipient.evidenceSuffix}
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
                            className="mt-1 rounded-lg text-right font-mono"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={() => removeRecipient(recipient.id)} aria-label="Hapus penerima">
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
                                      value={rinba.operasionalDays}
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
                                        value={item.label}
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

                                <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-xs dark:border-slate-800">
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">Subtotal Transportasi:</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatRupiah(transportTotal)}</span>
                                </div>
                              </div>

                              {/* Total RINBA Banner */}
                              <div className="flex items-center justify-between rounded-xl bg-amber-100/90 p-3 text-xs dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800">
                                <div>
                                  <span className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                                    <Calculator className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                                    Total RINBA:
                                  </span>
                                  <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                                    Otomatis mengupdate Jumlah (Rp.) baris Rekap &amp; SPTJB
                                  </p>
                                </div>
                                <span className="text-base font-black font-mono text-amber-950 dark:text-amber-100">
                                  {formatRupiah(recipient.amount)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
                <span className="text-sm font-bold">JUMLAH</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatRupiah(total)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 dark:border-violet-700 dark:bg-violet-500/5">
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-violet-600" />
                <h3 className="font-bold text-violet-900 dark:text-violet-200">Tambah penerima eksternal</h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-violet-700 dark:text-violet-300">
                Penerima seperti UPTD/laboratorium dapat ditulis manual tanpa memilih pegawai.
              </p>
              <div className="mt-4 space-y-3">
                <Input
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder="Nama UPTD / pihak ketiga"
                  className="rounded-xl bg-white"
                />
                <Textarea
                  value={externalDescription}
                  onChange={(e) => setExternalDescription(e.target.value)}
                  className="min-h-20 rounded-xl bg-white text-xs"
                  placeholder="Uraian penerima eksternal"
                />
                <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <Input
                    value={externalEvidenceNo}
                    onChange={(e) => setExternalEvidenceNo(e.target.value)}
                    placeholder="No."
                    className="rounded-xl bg-white text-center font-mono text-xs"
                  />
                  <Input
                    value={externalEvidenceSuffix}
                    onChange={(e) => setExternalEvidenceSuffix(e.target.value)}
                    placeholder="/K.18/..."
                    className="rounded-xl bg-white font-mono text-xs"
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(externalAmount)}
                    onChange={(e) => setExternalAmount(parseRupiahInput(e.target.value))}
                    placeholder="Jumlah (Rp.)"
                    className="rounded-xl bg-white text-right font-mono"
                  />
                  <Button type="button" onClick={addExternal} className="rounded-xl bg-violet-600 px-5 hover:bg-violet-500">
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

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
          <div className="print:hidden">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Review & Cetak</h2>
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
          <DocumentPreview
            selectedDocument={selectedDocument}
            recipients={previewRecipients}
            activity={activity}
            travel={travel}
            sptNumber={sptNumber}
            ppk={ppk}
            pdo={pdo}
            verifikator={verifikator}
            total={total}
          />
          <div className="flex flex-wrap justify-end gap-3 print:hidden">
            <Button variant="outline" className="h-11 rounded-xl" onClick={submitPreview}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Simpan preview
            </Button>
            <Button className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500" onClick={printDocument}>
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
          <Button onClick={nextStep} className="h-11 rounded-xl bg-amber-600 px-5 hover:bg-amber-500">
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
          <span className="truncate">{value.name}</span>
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
function DocumentPreview({
  selectedDocument,
  recipients,
  activity,
  travel,
  sptNumber,
  ppk,
  pdo,
  verifikator,
  total,
}: {
  selectedDocument: string;
  recipients: Array<{ id: string; name: string; description: string; evidence: string; amount: number }>;
  activity: { awpCode: string; name: string };
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  sptNumber: string;
  ppk: Official;
  pdo: Official;
  verifikator: Official;
  total: number;
}) {
  return (
    <DocumentTemplates
      selectedDocument={selectedDocument}
      recipients={recipients}
      activity={activity}
      travel={travel}
      sptNumber={sptNumber}
      ppk={ppk}
      pdo={pdo}
      verifikator={verifikator}
      total={total}
    />
  );
}
