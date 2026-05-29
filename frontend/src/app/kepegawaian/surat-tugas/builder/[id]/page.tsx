"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Search,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { isAxiosError } from "axios";
import STBuilderPreview from "./STBuilderPreview";
import {
  formatDateIndonesian,
  formatNIP,
  daysBetween,
  numberToWords,
  indexToLetter,
  buildFoluMenimbangText,
  isGeneratedFoluMenimbangText,
} from "@/lib/letter-utils";

// --- Types ---
interface Employee {
  id: string;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
  department?: string;
  position?: string;
}

interface DasarItem {
  id: string;
  text: string;
}

const DEFAULT_KEPALA_BALAI = {
  name: "M. Ari Wibawanto, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
};

const PLH_WILAYAH_PLACEHOLDER = "{wilayah}";
const PLH_KEGIATAN_KASI_PLACEHOLDER = "{kegiatan Kepala Seksi}";

function extractPlhWilayahFromPosition(position?: string | null) {
  const text = (position || "").trim();
  const match = text.match(/Seksi\s+KSDA\s+Wilayah\s+(.+)$/i);
  return match?.[1]?.trim() || text;
}

function cleanPlhKegiatanKasi(text?: string | null) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/,?\s*selama\s+\d+\s*\([^)]+\)\s*(?:hari(?:\s+kerja)?\s+)?terhitung.*?(?:;|\.)?$/i, "")
    .replace(/[;.\s]+$/, "")
    .trim();
}

function getDefaultUntukItem(templateType?: string | null) {
  if (templateType === "plh") {
    return "Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai.";
  }
  if (templateType === "bmn-pemeriksaan") {
    return "Membuat laporan tertulis paling lambat 7 (tujuh) hari setelah selesainya kegiatan tersebut.";
  }
  return "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.";
}

function splitStoredUntukItems(value?: string | null) {
  return (value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isGeneratedBiayaItem(value: string) {
  return /^(Segala biaya yang timbul|Sumber dana dibebankan)/i.test(value.trim());
}

function toDasarItems(items: string[], prefix: string): DasarItem[] {
  return items.map((text, idx) => ({
    id: `${prefix}-${idx}-${Date.now()}`,
    text,
  }));
}

function isSingleDayActivityPrefix(prefix: string) {
  return prefix === "Melaksanakan Kegiatan";
}

interface SumberDanaOption {
  id: string;
  label: string;
  dasarText: string;
  biayaText: string;
}

const SUMBER_DANA_OPTIONS: SumberDanaOption[] = [
  { id: 'dipa', label: 'DIPA', 
    dasarText: 'Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};'
  },
  { id: 'kja', label: 'Dana Kerjasama KJA',
    dasarText: 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT Kideco Jaya Agung Nomor : PKS.140/K.18/TU /Teknis/08/2023 dan Nomor : 213/KJA/LGL/CON/VIII/2023 tanggal 08 Agustus 2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Kideco Jaya Agung;'
  },
  { id: 'mja', label: 'Dana Kerjasama MJA',
    dasarText: 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Direktur PT Multi Jayantara Abadi Nomor : PKS.36/K.18/TU/Teknis/02/2023 dan Nomor : 001/MJA-Dir/ TPG/II /2023 tanggal 01 Februari 2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Multi Jayantara Abadi;'
  },
  { id: 'cop', label: 'Dana Kerjasama COP',
    dasarText: 'Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan Centre for Orangutan Protection (COP) Nomor: PKS.191/K.18/TU/Teknis/10/2023 dan Nomor 17/HQ10/COP/2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Centre for Orangutan Protection (COP);'
  },
  { id: 'tjiwi_kimia', label: 'Dana Kerjasama PT. Tjiwi Kimia Tbk.',
    dasarText: 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 dan Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang dan Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur dan PT Pabrik Kertas Tjiwi Kimia Tbk;'
  },
  { id: 'bosf', label: 'Dana Kerjasama BOSF',
    dasarText: 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Ketua Pengurus Yayasan Penyelamatan Orangutan Borneo Nomor : PKS.184/K.18/TU/PK12/2021 dan Nomor 176/YBOS /XII/2021 tanggal 6 Desember 2021.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan Yayasan Penyelamatan Orangutan Borneo (BOSF);'
  },
  { id: 'can', label: 'Dana Kerjasama CAN',
    dasarText: 'Perjanjian Kerja Sama antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Conservation Action Network (CAN) Nomor : PKS.45/K.18/TU/KSA.2.5/03/2025 dan 007/K-JAK/PKS/III/2025 tanggal 14 Maret 2025.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Conservation Action Network (CAN);'
  },
  { id: 'alert', label: 'Dana Kerjasama ALeRT',
    dasarText: 'Perjanjian Kerjasama Antara Kepala Balai KSDA Kalimantan Timur dengan Direktur Aliansi Lestrai Rimba Terpadu (AleRT) Nomor: PKS.192/K.18/TU/Teknis/10/2023 dan Nomor: 51/PKS-ALeRT/ X/2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan ALeRT (Aliansi Lestari Rimba Terpadu);'
  },
  { id: 'folu', label: 'Dana Kerjasama FOLU NC 2&3',
    dasarText: '',
    biayaText: 'Sumber dana dibebankan pada anggaran Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - Tahun Anggaran {tahun};'
  },
  { id: 'dl1', label: 'DL 1 / Tidak ada biaya',
    dasarText: '',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini tidak dibebankan pada anggaran manapun (DL 1 / tanpa biaya).'
  },
  { id: 'other', label: 'Lainnya',
    dasarText: '',
    biayaText: ''
  },
];

function normalizeSumberDana(value: string | null | undefined): string {
  if (!value) return "dipa";

  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  const exactId = SUMBER_DANA_OPTIONS.find(option => option.id === normalized);
  if (exactId) return exactId.id;

  const exactLabel = SUMBER_DANA_OPTIONS.find(option => option.label.toLowerCase() === normalized);
  if (exactLabel) return exactLabel.id;

  if (normalized.includes("folu")) return "folu";
  if (normalized.includes("dipa")) return "dipa";
  if (normalized.includes("kja")) return "kja";
  if (normalized.includes("mja")) return "mja";
  if (normalized.includes("cop")) return "cop";
  if (normalized.includes("tjiwi")) return "tjiwi_kimia";
  if (normalized.includes("bosf")) return "bosf";
  if (normalized.includes("can")) return "can";
  if (normalized.includes("alert")) return "alert";
  if (normalized.includes("dl 1") || normalized.includes("tidak ada biaya")) return "dl1";

  return "other";
}

export default function STBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // --- Form State ---
  const [stNumber, setStNumber] = useState("");
  const [klasifikasi, setKlasifikasi] = useState("KSA.0X.0X");
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();

  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([
    { id: "1", text: "bahwa dalam rangka , perlu ;" },
    { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
  ]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([
    { id: "1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
    { id: "2", text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 24 April 2026.` },
  ]);
  const [untukItems, setUntukItems] = useState<DasarItem[]>([
    { id: "untuk-default", text: getDefaultUntukItem(null) },
  ]);

  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState("KEPALA BALAI,");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState("Perjalanan Dinas");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [plhWilayah, setPlhWilayah] = useState("");
  const [plhKegiatanKasi, setPlhKegiatanKasi] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  // Beda Hari template: tanggal per pegawai
  const [employeeDates, setEmployeeDates] = useState<Record<string, { mulai: string; selesai: string }>>({});
  const [judulLampiranBedaHari, setJudulLampiranBedaHari] = useState("DAFTAR PEGAWAI MENGIKUTI PATROLI");
  const [kepalaBalai, setKepalaBalai] = useState(DEFAULT_KEPALA_BALAI);
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().substring(0, 10));
  const [kotaSurat, setKotaSurat] = useState("Samarinda");
  const [tembusanItems, setTembusanItems] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [penandatanganSearchQuery, setPenandatanganSearchQuery] = useState("");
  const [showPenandatanganDropdown, setShowPenandatanganDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suratStatus, setSuratStatus] = useState<string>("");
  const isSingleDayActivity = isSingleDayActivityPrefix(activityPrefix);

  const { data: allEmployees = [], isLoading: isSearching } = useQuery({
    queryKey: ["employees-select-builder"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data.data || [];
    },
  });

  const searchResults = allEmployees
    .filter((emp: Employee) => 
      (emp.nama_lengkap?.toLowerCase() || emp.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
      (emp.nip?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )
    .slice(0, 50);

  const penandatanganSearchResults = allEmployees
    .filter((emp: Employee) => {
      const query = penandatanganSearchQuery.toLowerCase();
      if (!query) return true;
      const name = emp.nama_lengkap?.toLowerCase() || emp.name?.toLowerCase() || "";
      const nip = emp.nip?.toLowerCase() || "";
      const position = emp.jabatan?.toLowerCase() || emp.position?.toLowerCase() || "";
      return name.includes(query) || nip.includes(query) || position.includes(query);
    })
    .slice(0, 8);

  const handleSelectPenandatangan = (emp: Employee) => {
    setKepalaBalai({
      name: emp.nama_lengkap || emp.name || DEFAULT_KEPALA_BALAI.name,
      nip: formatNIP(emp.nip || DEFAULT_KEPALA_BALAI.nip),
    });
    setPenandatanganSearchQuery("");
    setShowPenandatanganDropdown(false);
  };

  const replacePlhPlaceholders = (value: string) => {
    if (templateType !== "plh") return value;
    return value
      .split(PLH_WILAYAH_PLACEHOLDER)
      .join(plhWilayah.trim() || "...")
      .split(PLH_KEGIATAN_KASI_PLACEHOLDER)
      .join(plhKegiatanKasi.trim() || "...");
  };

  const getPreviewMenimbangItems = () =>
    templateType === "plh"
      ? menimbangItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : menimbangItems;

  const getPreviewUntukItems = () =>
    templateType === "plh"
      ? untukItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : untukItems;

  const getTempatTujuanForPayload = () => {
    if (templateType === "plh") {
      return plhWilayah.trim() || kotaTujuan.trim() || tempatKegiatan.trim();
    }
    return kotaTujuan.trim();
  };

  // Helper for "Untuk" text
  const buildUntukText = (): string => {
    // Beda Hari: hitung MIN tanggal mulai dan MAX tanggal selesai dari semua pegawai
    const isBedaHariTemplate = templateType === "beda-hari";
    let effectiveMulai = tanggalMulai;
    let effectiveSelesai = tanggalSelesai;
    if (isBedaHariTemplate) {
      const allMulai = selectedEmployees
        .map((emp) => employeeDates[emp.id]?.mulai)
        .filter((d): d is string => Boolean(d));
      const allSelesai = selectedEmployees
        .map((emp) => employeeDates[emp.id]?.selesai)
        .filter((d): d is string => Boolean(d));
      if (allMulai.length > 0) {
        effectiveMulai = allMulai.reduce((min, d) => (d < min ? d : min), allMulai[0]);
      }
      if (allSelesai.length > 0) {
        effectiveSelesai = allSelesai.reduce((max, d) => (d > max ? d : max), allSelesai[0]);
      }
    }

    const days = daysBetween(effectiveMulai, effectiveSelesai);
    const daysWord = numberToWords(days);
    const mulaiFormatted = formatDateIndonesian(effectiveMulai);
    const selesaiFormatted = formatDateIndonesian(effectiveSelesai);

    let text = "";
    const isBmnTemplate = templateType === "bmn-pemeriksaan";
    const isPlhTemplate = templateType === "plh";
    const isSingleDayActivity = isSingleDayActivityPrefix(activityPrefix);

    // BMN template: always freeform, no date suffix
    if (isBmnTemplate) {
      text = namaKegiatan || "...";
      if (!text.trim().endsWith(".") && !text.trim().endsWith(";")) {
        text += ".";
      }
      return text;
    }

    // PLH template: durasi tampil di bagian Untuk, bukan di kegiatan Kepala Seksi.
    if (isPlhTemplate) {
      text = replacePlhPlaceholders(namaKegiatan || "...");
      if (days > 0) {
        text += ` selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
      } else if (!text.trim().endsWith(";") && !text.trim().endsWith(".")) {
        text += ".";
      }
      return text;
    }

    if (isSingleDayActivity) {
      text = (namaKegiatan || "...").replace(/[;.\s]+$/, "").trim();
      if (effectiveMulai) {
        text += ` pada tanggal ${mulaiFormatted}.`;
      } else if (!text.trim().endsWith(".") && !text.trim().endsWith(";")) {
        text += ".";
      }
      return text;
    }

    if (activityPrefix && kotaAsal) {
      // Structured mode: prefix + dari + ke + dalam rangka + kegiatan
      text = `${activityPrefix} dari ${kotaAsal} ke ${kotaTujuan || "..."}`;
      if (namaKegiatan) {
        text += ` dalam rangka ${namaKegiatan}`;
      }
      if (tempatKegiatan) {
        text += ` di ${tempatKegiatan}`;
      }
    } else {
      // Freeform mode: namaKegiatan already contains the full text
      text = namaKegiatan || "...";
    }

    if (days > 0) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };

  const buildMaksudTujuanText = (): string =>
    [
      buildUntukText(),
      ...getPreviewUntukItems().map((item) => item.text),
    ]
      .filter((item) => item && item.trim())
      .join("\n");

  // Build biaya text
  const buildBiayaText = (): string => {
    // One-day kegiatan mode keeps every extra "Untuk" line user-managed.
    if (isSingleDayActivityPrefix(activityPrefix)) return '';
    // BMN Penghapusan template: no biaya line in Untuk list (regardless of sumberDana)
    if (templateType === 'bmn-pemeriksaan') return '';
    // PLH template: skip biaya line (PLH tugas internal, tidak ada biaya)
    if (templateType === 'plh') return '';
    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === sumberDana);
    if (opt?.biayaText) {
      const tahun = tanggalSurat ? new Date(tanggalSurat).getFullYear().toString() : new Date().getFullYear().toString();
      return opt.biayaText.replace(/{tahun}/g, tahun);
    }
    if (sumberDana === 'other') {
      return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${sumberDanaOther || '...'};`;
    }
    return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;`;
  };

  // Function to update Dasar items based on Funding
  const updateDasarFromFunding = (fundingId: string, date: string) => {
    const tahun = date ? new Date(date).getFullYear().toString() : new Date().getFullYear().toString();

    // FOLU has a completely different template
    if (fundingId === 'folu') {
      setHeaderTitle("KEPALA UPT SELAKU\nPELAKSANA SATUAN KERJA IMPLEMENTING PARTNER FOLU NC 2&3");
      // Auto-set klasifikasi with FOLU.NC-23 prefix
      setKlasifikasi(prev => prev.startsWith("FOLU.NC-23/") ? prev : "FOLU.NC-23/" + prev);
      setMenimbangItems([
        { id: "folu-1", text: buildFoluMenimbangText(namaKegiatan, tempatKegiatan) },
        { id: "folu-2", text: "bahwa dalam rangka kelancaran tugas Project Management Unit FOLU-NC 2 dan 3 maka dipandang perlu menugaskan pegawai dimaksud;" },
        { id: "folu-3", text: "bahwa untuk maksud tersebut (poin a dan b) perlu diterbitkan Surat Tugas." },
      ]);
      setDasarItems([
        { id: "folu-d1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
        { id: "folu-d2", text: `Keputusan Kepala Biro Perencanaan Kementerian Kehutanan Selaku Project Director FOLU NC 2&3 Nomor SK.30/ROCAN/PK/REN.02/6/2025 tentang Perubahan Atas Keputusan Kepala Biro Perencanaan Selaku Project Director FOLU NC 2&3 Nomor SK.11/ROCAN/PK/REN.02/4/2025 tentang Pedoman Operasional Proyek Implementasi FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia - Norwegia Tahap Kedua dan Ketiga yang dikelola oleh Badan Pengelola Dana Lingkungan Hidup dengan Mekanisme Pengelolaan Dana Lingkungan Hidup;` },
        { id: "folu-d3", text: `Keputusan Sekretaris Direktorat Jenderal Konservasi Sumber Daya Alam Dan Ekosistem Selaku Koordinator Kegiatan Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Nomor: SK.2/KSDAE/FOLU.NC-23/I/2026 Tentang Penunjukan Personil Tim Pengelola Proyek Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Yang Dikelola Oleh Badan Pengelola Dana Lingkungan Hidup;` },
        { id: "folu-d4", text: `Annual Work Plan (AWP) Tahun Anggaran ${tahun} Implementasi FOLU Net Sink 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia-Norwegia Tahap Kedua dan Ketiga Ditjen KSDAE.` },
      ]);
      setTembusanItems([
        "Kuasa Pengguna Anggaran Project Management Unit FOLU NC 2&3;",
        "Sekretaris Direktorat Jenderal KSDAE selaku Koordinator Kegiatan;",
        "Kepala Seksi KSDA Wilayah II Tenggarong;",
        "Yang Bersangkutan.",
      ]);
      return;
    }

    // Reset header for non-FOLU
    setHeaderTitle("KEPALA BALAI,");

    // Remove FOLU.NC-23 prefix from klasifikasi if present
    setKlasifikasi(prev => prev.replace(/^FOLU\.NC-23\//, ""));

    // Reset menimbang to default (2 items) if previously was FOLU (3 items)
    setMenimbangItems(prev => {
      if (prev.length === 3 && prev[0]?.id?.startsWith("folu")) {
        return [
          { id: "1", text: "bahwa dalam rangka , perlu ;" },
          { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
        ];
      }
      return prev;
    });

    // Reset tembusan if it was FOLU auto-filled
    setTembusanItems(prev => {
      if (prev.length === 4 && prev[0]?.includes("Kuasa Pengguna Anggaran")) {
        return [];
      }
      return prev;
    });

    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === fundingId);
    if (opt && opt.dasarText) {
      const text = opt.dasarText.replace(/{tahun}/g, tahun);
      
      setDasarItems(prev => {
        const newItems = [...prev];
        // Reset to 2 items if previously was FOLU (4 items)
        if (newItems.length > 2) {
          return [
            { id: "1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
            { id: Date.now().toString(), text },
          ];
        }
        if (newItems.length >= 2) {
          newItems[1].text = text;
        } else if (newItems.length === 1) {
          newItems.push({ id: Date.now().toString(), text });
        }
        return newItems;
      });
    }
  };

  // Apply BMN Penghapusan template: one-click preset for ST Pemeriksaan BMN
  const applyBmnTemplate = () => {
    setHeaderTitle("KEPALA BALAI,");
    setKlasifikasi("KAP.05");
    setSumberDana("dl1");
    setTemplateType("bmn-pemeriksaan");

    // Default tanggal kegiatan = hari ini (1 hari, user bisa ubah)
    const today = new Date().toISOString().substring(0, 10);
    setTanggalMulai(today);
    setTanggalSelesai(today);

    setMenimbangItems([
      { id: "bmn-m1", text: "bahwa dalam rangka penghapusan Barang Milik Negara berupa Alat Angkutan Bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur;" },
      { id: "bmn-m2", text: "bahwa sehubungan dengan butir a tersebut di atas dipandang perlu untuk menugaskan staf tersebut di bawah ini untuk melakukan pemeriksaan Barang Milik Negara." },
    ]);

    setDasarItems([
      { id: "bmn-d1", text: "Undang-Undang RI Nomor 17 Tahun 2003 tentang Keuangan Negara;" },
      { id: "bmn-d2", text: "Undang-Undang RI Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;" },
      { id: "bmn-d3", text: "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;" },
      { id: "bmn-d4", text: "Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;" },
      { id: "bmn-d5", text: "Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;" },
      { id: "bmn-d6", text: "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;" },
      { id: "bmn-d7", text: "Peraturan Menteri Keuangan Nomor 181/PMK.06/2016 tentang Penatausahaan Barang Milik Negara;" },
      { id: "bmn-d8", text: "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan." },
    ]);

    // Freeform "Untuk" mode: clear structured fields, set namaKegiatan to BMN-specific text
    setActivityPrefix("");
    setKotaAsal("");
    setKotaTujuan("");
    setTempatKegiatan("");
    setNamaKegiatan("Melaksanakan pemeriksaan Barang Milik Negara berupa Alat Angkutan Bermotor pada tanggal " + formatDateIndonesian(today));
    setUntukItems([{ id: "bmn-untuk-1", text: getDefaultUntukItem("bmn-pemeriksaan") }]);

    setTembusanItems([]);
  };

  // Apply Beda Hari template — Kepada jadi "Daftar nama terlampir." + halaman lampiran auto-generate
  const applyBedaHariTemplate = () => {
    setTemplateType("beda-hari");
    setUntukItems([{ id: "untuk-default", text: getDefaultUntukItem("beda-hari") }]);
    // Initialize employeeDates dari tanggalMulai/Selesai global jika sudah diisi
    setEmployeeDates((prev) => {
      const next = { ...prev };
      selectedEmployees.forEach((emp) => {
        if (!next[emp.id]) {
          next[emp.id] = { mulai: tanggalMulai || "", selesai: tanggalSelesai || "" };
        }
      });
      return next;
    });
  };

  // Apply PLH template — pelaksana harian Kepala Seksi
  const applyPlhTemplate = () => {
    setTemplateType("plh");
    setHeaderTitle("KEPALA BALAI,");
    setKlasifikasi("PEG.09.01");
    setSumberDana("dl1");

    setPlhWilayah("");
    setPlhKegiatanKasi("");

    setMenimbangItems([
      {
        id: "plh-m1",
        text: `bahwa Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER} akan melaksanakan ${PLH_KEGIATAN_KASI_PLACEHOLDER};`,
      },
      {
        id: "plh-m2",
        text: `bahwa sehubungan dengan hal tersebut di atas untuk kelancaran pelaksanaan tugas sehari-hari maka perlu ada pejabat sementara yang menggantikan tugas Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}.`,
      },
    ]);

    setDasarItems([
      {
        id: "plh-d1",
        text: "Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : {nomor_st_induk} tanggal {tanggal_st_induk}.",
      },
    ]);

    // Freeform "Untuk" mode
    setActivityPrefix("");
    setKotaAsal("");
    setKotaTujuan("");
    setTempatKegiatan("");
    setNamaKegiatan(
      `Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}`,
    );
    setUntukItems([{ id: "plh-untuk-1", text: getDefaultUntukItem("plh") }]);

    setTembusanItems([
      "Direktur Jenderal KSDAE;",
      "Sekretaris Direktorat Jenderal KSDAE.",
    ]);
  };

  // Generic template handler: dropdown 4 pilihan
  const handleTemplateChange = (value: string) => {
    if (value === "bmn-pemeriksaan") {
      applyBmnTemplate();
    } else if (value === "beda-hari") {
      applyBedaHariTemplate();
    } else if (value === "plh") {
      applyPlhTemplate();
    } else {
      setTemplateType(null);
      setUntukItems([{ id: "untuk-default", text: getDefaultUntukItem(null) }]);
    }
  };

  // Initial Fetch & Parse
  useEffect(() => {
    const fetchAndParse = async (id: string) => {
      try {
        const res = await api.get(`/surat-tugas/${id}`);
        const data = res.data.data;
        setSuratStatus(data.status);

        // Parse nomor surat: "ST.001/K.18/TU/KSA.03.01/B/05/2026"
        if (data.nomor_surat) {
          // Extract number: ST.{number}/K.18/TU/{klasifikasi}/B/{mm}/{yyyy}
          const nomorMatch = data.nomor_surat.match(/^ST\.(.+?)\/K\.18\/TU\/(.+?)\/B\/(\d{2})\/(\d{4})$/);
          if (nomorMatch) {
            setStNumber(nomorMatch[1]);
            setKlasifikasi(nomorMatch[2]);
          } else {
            // Legacy fallback: ST.{number}/{code}/{mm}/{yyyy}
            const legacyMatch = data.nomor_surat.match(/^ST\.(.+?)\/(.+)\/(\d{2})\/(\d{4})$/);
            if (legacyMatch) {
              setStNumber(legacyMatch[1]);
              // Try to extract klasifikasi from code like "K.18/TU/KSA.03.01/B"
              const codeMatch = legacyMatch[2].match(/K\.18\/TU\/(.+?)\/B/);
              setKlasifikasi(codeMatch ? codeMatch[1] : legacyMatch[2]);
            } else {
              setStNumber(data.nomor_surat.replace(/^ST\./, ""));
            }
          }
        }
        if (data.kode_surat) {
          // Extract klasifikasi from kode_surat like "K.18/TU/KSA.03.01/B"
          const codeMatch = data.kode_surat.match(/K\.18\/TU\/(.+?)\/B/);
          if (codeMatch) {
            setKlasifikasi(codeMatch[1]);
          }
        }

        // Tanggal surat: default hari ini, bisa diganti manual
        // Hanya load dari API jika sudah pernah disimpan (bukan tanggal lama dari pengajuan)
        setTanggalSurat(new Date().toISOString().substring(0, 10));

        setTanggalMulai(data.tanggal_mulai?.split("T")[0] || "");
        setTanggalSelesai(data.tanggal_selesai?.split("T")[0] || "");
        
        const funding = normalizeSumberDana(data.sumber_dana);
        setSumberDana(funding);
        if (data.sumber_dana_other) setSumberDanaOther(data.sumber_dana_other);

        // Load template type if present (for ST that was created with a template)
        if (data.template_type) {
          setTemplateType(data.template_type);
          if (data.template_type === "plh") {
            const firstEmployee = data.employees?.[0];
            setPlhWilayah(extractPlhWilayahFromPosition(firstEmployee?.jabatan || firstEmployee?.position || data.tempat_tujuan));
            const firstMenimbang = Array.isArray(data.menimbang) ? data.menimbang[0]?.text || "" : "";
            const kegiatanMatch = firstMenimbang.match(/akan melaksanakan\s+(.+?);?$/i);
            setPlhKegiatanKasi(cleanPlhKegiatanKasi(kegiatanMatch?.[1] || data.maksud_tujuan));
          }
        }
        if (data.penandatangan_nama || data.penandatangan_nip) {
          setKepalaBalai({
            name: data.penandatangan_nama || DEFAULT_KEPALA_BALAI.name,
            nip: data.penandatangan_nip ? formatNIP(data.penandatangan_nip) : DEFAULT_KEPALA_BALAI.nip,
          });
        }
        
        setSelectedEmployees(data.employees || []);
        setKotaTujuan(data.tempat_tujuan || "");

        // Parse menimbang & dasar if saved
        if (data.menimbang && Array.isArray(data.menimbang) && data.menimbang.length > 0) {
          setMenimbangItems(data.menimbang);
        }
        if (data.dasar && Array.isArray(data.dasar) && data.dasar.length > 0) {
          setDasarItems(data.dasar);
        }
        if (data.tembusan && Array.isArray(data.tembusan) && data.tembusan.length > 0) {
          setTembusanItems(data.tembusan.filter((t: unknown): t is string => typeof t === 'string'));
        }

        const storedUntukLines = splitStoredUntukItems(data.maksud_tujuan);
        const storedAdditionalUntuk = storedUntukLines
          .slice(1)
          .filter((item) => !isGeneratedBiayaItem(item));
        setUntukItems(
          storedAdditionalUntuk.length > 0
            ? toDasarItems(storedAdditionalUntuk, "stored-untuk")
            : [{ id: "untuk-default", text: getDefaultUntukItem(data.template_type) }],
        );

        const activityStr = storedUntukLines[0] || data.maksud_tujuan || "";
        // Strip "selama X hari terhitung..." suffix that buildUntukText appends
        const selamaRegex = /,?\s*selama\s+\d+\s*\([^)]+\)\s*(?:hari(?:\s+kerja)?\s+)?terhitung.*$/i;
        const cleanedActivity = activityStr.replace(selamaRegex, "").replace(/[;,.]$/, "").trim();
        
        // Try to parse structured activity text: "[Melaksanakan] Perjalanan Dinas dari X ke Y [dalam rangka Z] [di W]"
        const regex = /^(?:Melaksanakan[.\s]+)?(Perjalanan\s+[Dd]inas)\s+dari\s+(.*?)\s+ke\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const singleDayActivity = cleanedActivity.replace(/\s+pada\s+tanggal\s+.+$/i, "").replace(/[;,.]$/, "").trim();
        const isParsedSingleDayActivity = /^Melaksanakan\s+/i.test(singleDayActivity) && /\s+pada\s+tanggal\s+/i.test(cleanedActivity);

        const match = cleanedActivity.match(regex);

        if (isParsedSingleDayActivity) {
          setActivityPrefix("Melaksanakan Kegiatan");
          setKotaAsal("");
          setKotaTujuan("");
          setNamaKegiatan(singleDayActivity);
        } else if (match) {
          setActivityPrefix(match[1]);
          setKotaAsal(match[2].trim());
          setKotaTujuan(match[3].trim());
          const rest = match[4].trim();
          const diRegex = /(.*)\s+di\s+([^,;]+)$/i;
          const diMatch = rest.match(diRegex);
          if (diMatch) {
            setNamaKegiatan(diMatch[1].trim());
            setTempatKegiatan(diMatch[2].trim());
          } else {
            // Remove trailing punctuation
            setNamaKegiatan(rest.replace(/[;,.]$/, '').trim());
          }
        } else {
          // Text doesn't match structured pattern — put entire text as namaKegiatan
          // and clear prefix/kota so buildUntukText just outputs namaKegiatan directly
          setActivityPrefix("");
          setKotaAsal("");
          setKotaTujuan("");
          setNamaKegiatan(cleanedActivity);
        }

        // Only update Dasar from funding if no saved dasar
        if (!data.dasar || !Array.isArray(data.dasar) || data.dasar.length === 0) {
          updateDasarFromFunding(funding, new Date().toISOString().substring(0, 10));
        }

        if (funding === "folu") {
          const currentMenimbang = data.menimbang && Array.isArray(data.menimbang) ? data.menimbang : [];
          const firstMenimbang = currentMenimbang[0];
          const shouldUseFoluTemplate = currentMenimbang.length === 0 ||
            firstMenimbang?.id === "folu-1" ||
            isGeneratedFoluMenimbangText(firstMenimbang?.text);

          if (shouldUseFoluTemplate) {
            setMenimbangItems(prev => {
              const nextItems = prev.length >= 3 ? [...prev] : [
                { id: "folu-1", text: "" },
                { id: "folu-2", text: "bahwa dalam rangka kelancaran tugas Project Management Unit FOLU-NC 2 dan 3 maka dipandang perlu menugaskan pegawai dimaksud;" },
                { id: "folu-3", text: "bahwa untuk maksud tersebut (poin a dan b) perlu diterbitkan Surat Tugas." },
              ];

              nextItems[0] = {
                ...nextItems[0],
                id: "folu-1",
                text: buildFoluMenimbangText(cleanedActivity),
              };
              return nextItems;
            });
          }
        }

        // Auto-fill klasifikasi & menimbang if kegiatan contains "konflik"
        const parsedKegiatan = cleanedActivity.toLowerCase();
        if (parsedKegiatan.includes("konflik")) {
          setKlasifikasi("KSA.03.01");
          // Override menimbang if it's still the default template (not yet customized by user)
          const currentMenimbang = data.menimbang && Array.isArray(data.menimbang) ? data.menimbang : [];
          const isDefaultTemplate = currentMenimbang.length === 0 || 
            (currentMenimbang[0]?.text === "bahwa dalam rangka , perlu ;");
          if (isDefaultTemplate) {
            setMenimbangItems([
              { id: "1", text: "bahwa dalam rangka kegiatan penanganan konflik satwa, perlu penyelamatan;" },
              { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
            ]);
          }
        }

        toast.success("Data berhasil diurai.");
      } catch (err) {
        console.error(err);
        if (isAxiosError(err) && err.response?.status === 404) {
          toast.error("Surat Tugas tidak ditemukan atau sudah dihapus.");
          router.push("/kepegawaian/surat-tugas/inbox");
          return;
        }
        toast.error("Gagal memuat data.");
      } finally {
        setIsInitializing(false);
      }
    };

    if (id) {
      fetchAndParse(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-fill klasifikasi & menimbang based on nama kegiatan keywords
  const updateFoluMenimbang = (activity: string, place: string) => {
    setMenimbangItems(prev => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      const isDefaultText = first.text === "bahwa dalam rangka , perlu ;";
      if (first.id !== "folu-1" && !isDefaultText && !isGeneratedFoluMenimbangText(first.text)) return prev;

      const nextText = buildFoluMenimbangText(activity, place);
      if (first.text === nextText && first.id === "folu-1") return prev;

      const nextItems = [...prev];
      nextItems[0] = { ...first, id: "folu-1", text: nextText };
      return nextItems;
    });
  };

  const handleNamaKegiatanChange = (value: string) => {
    setNamaKegiatan(value);
    if (sumberDana === "folu") {
      updateFoluMenimbang(value, tempatKegiatan);
    }

    const lower = value.toLowerCase();
    if (lower.includes("konflik")) {
      setKlasifikasi("KSA.03.01");
      setMenimbangItems(prev => {
        const newItems = [...prev];
        if (newItems.length > 0) {
          newItems[0] = { ...newItems[0], text: "bahwa dalam rangka kegiatan penanganan konflik satwa, perlu penyelamatan;" };
        }
        return newItems;
      });
    }
  };

  const handleActivityPrefixChange = (value: string) => {
    setActivityPrefix(value);
    if (isSingleDayActivityPrefix(value)) {
      const singleDate = tanggalMulai || tanggalSelesai;
      setKotaAsal("");
      setKotaTujuan("");
      if (singleDate) {
        setTanggalMulai(singleDate);
        setTanggalSelesai(singleDate);
      }
    }
  };

  // Handlers
  // Simpan draft — save semua data tanpa ubah status
  const handleSave = async () => {
    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = stNumber && klasifikasi 
        ? `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}` 
        : "";
      const payload = {
        nomor_surat: fullNomorSurat || null,
        kode_surat: stCode || null,
        nama_kegiatan: buildMaksudTujuanText(),
        tempat_tujuan: getTempatTujuanForPayload() || null,
        tanggal_surat: tanggalSurat || null,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employee_ids: selectedEmployees.map(e => e.id),
        tanggal_mulai: tanggalMulai || null,
        tanggal_selesai: tanggalSelesai || null,
      };
      await api.put(`/surat-tugas/${id}/approve`, payload);
      toast.success("Draft berhasil disimpan!");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menyimpan draft.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  // Ajukan persetujuan — ubah status ke "pending" (menunggu persetujuan kasubag)
  const handleSubmitForApproval = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (!klasifikasi) return toast.error("Klasifikasi harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (templateType === "plh" && !tempatTujuanPayload) return toast.error("Wilayah/tujuan PLH harus diisi.");

    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        nama_kegiatan: buildMaksudTujuanText(),
        tempat_tujuan: tempatTujuanPayload || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employee_ids: selectedEmployees.map(e => e.id),
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        status: "pending"
      };
      await api.put(`/surat-tugas/${id}/approve`, payload);
      toast.success("Surat Tugas berhasil diajukan! Menunggu persetujuan Kasubag.");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      router.push("/kepegawaian/surat-tugas/history");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal mengajukan ST.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  // Setujui — ubah status ke "approved" (hanya kasubag/admin)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleApprove = async () => {
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (templateType === "plh" && !tempatTujuanPayload) return toast.error("Wilayah/tujuan PLH harus diisi.");

    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        nama_kegiatan: buildMaksudTujuanText(),
        tempat_tujuan: tempatTujuanPayload || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employee_ids: selectedEmployees.map(e => e.id),
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        status: "approved"
      };
      await api.put(`/surat-tugas/${id}/approve`, payload);
      toast.success("Surat Tugas berhasil diterbitkan!");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      router.push("/kepegawaian/surat-tugas/history");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menerbitkan ST.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("surat-preview-doc");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>ST.${stNumber}-${namaKegiatan.replace(/[/\\?%*:|"<>]/g, '-')}</title>
        <style>
          @page { size: A4; margin: 3cm 1cm 1.9cm 1.55cm; }
          @page :first { margin: 0.7cm 1cm 1.9cm 1.55cm; }
          @page st-lampiran-beda-hari { size: A4; margin: 2cm 1cm 1.9cm 1.55cm; }
          body { 
            font-family: 'Bookman Old Style', 'Georgia', serif; 
            font-size: 11pt; 
            line-height: 1.25; 
            color: #000; 
            margin: 0; 
            padding: 0; 
            text-align: justify; 
          }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 2px 0; font-size: 11pt; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          img { max-width: none !important; }
          .ttd-placeholder { height: 80px; }
          /* First page gets its own safe letterhead area; page 2+ keeps the 3cm @page margin. */
          .kop-surat { margin-left: 0 !important; margin-right: -0.95cm !important; margin-top: -0.25cm !important; margin-bottom: 2px !important; overflow: visible !important; }
          .kop-surat img { width: 18.8cm !important; height: auto !important; }
          .surat-content { margin-left: 1.25cm !important; width: calc(100% - 2.2cm) !important; margin-right: 0.95cm !important; }
          .field-section, .kepada-section, .kepada-list, .untuk-section, .untuk-list { break-inside: auto !important; page-break-inside: auto !important; }
          .employee-entry, .untuk-entry, .penutup-ttd-group { break-inside: avoid !important; page-break-inside: avoid !important; }
          div[style*="page-break-inside"] { page-break-inside: avoid; }
          .st-lampiran-page-wrapper { page: st-lampiran-beda-hari; padding-top: 0 !important; break-before: page !important; page-break-before: always !important; }
          .st-lampiran-page { margin-left: 1.25cm !important; width: calc(100% - 2.2cm) !important; box-sizing: border-box !important; line-height: 1.25 !important; }
          .lampiran-meta { margin-left: 7.3cm !important; margin-bottom: 0.8rem !important; }
          .lampiran-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          .lampiran-table th, .lampiran-table td { border: 1px solid #000 !important; padding: 4px 6px !important; font-size: 10.5pt !important; line-height: 1.2 !important; vertical-align: middle !important; }
          .lampiran-ttd { margin-left: 9.2cm !important; margin-top: 1.6rem !important; text-align: left !important; }
          /* thead spacer: hidden, not needed with @page margin */
          thead.page-spacer td { height: 0; padding: 0; line-height: 0; font-size: 0; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Inisialisasi Builder...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <aside className="w-[420px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl z-10">
        <header className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-zinc-800 dark:text-white">ST Builder <span className="text-blue-600">Premium</span></h1>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Approval Mode</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {/* === Template Card (paling atas, di atas Nomor Surat) === */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-500/10">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded-full bg-orange-600 px-2 text-[9px] font-bold uppercase tracking-wider text-white">Template</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                Pilih Template ST
              </span>
            </div>
            <select
              value={templateType ?? ""}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-700 outline-none transition focus:ring-2 focus:ring-orange-500/20 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-orange-300"
            >
              <option value="">Default (Manual)</option>
              <option value="bmn-pemeriksaan">Penghapusan BMN</option>
              <option value="beda-hari">Beda Hari (Daftar Lampiran)</option>
              <option value="plh">PLH (Pelaksana Harian Kepala Seksi)</option>
            </select>
            {templateType === "beda-hari" && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Kepada surat akan otomatis &quot;Daftar nama terlampir.&quot; Set tanggal per pegawai di section di bawah.
              </p>
            )}
            {templateType === "bmn-pemeriksaan" && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Klasifikasi KAP.05 + 8 peraturan dasar + freeform Untuk telah diterapkan.
              </p>
            )}
            {templateType === "plh" && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Template PLH aktif. Ganti placeholder <code>{"{wilayah}"}</code> dan <code>{"{kegiatan Kepala Seksi}"}</code> di Menimbang/Untuk dengan nilai sesuai.
              </p>
            )}
          </div>

          <FormSection title="Nomor Surat">
            <div className="flex items-stretch bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/10">
              <div className="bg-zinc-100 dark:bg-zinc-700 px-3 flex items-center border-r border-zinc-200 dark:border-zinc-600 shrink-0"><span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">ST.</span></div>
              <input value={stNumber} onChange={e => setStNumber(e.target.value)} placeholder="001" className="w-14 px-2 py-2 text-sm font-bold bg-transparent outline-none text-center text-zinc-900 dark:text-white" />
              <div className="bg-zinc-100 dark:bg-zinc-700 px-2 flex items-center border-x border-zinc-200 dark:border-zinc-600 shrink-0"><span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">/K.18/TU/</span></div>
              <input value={klasifikasi} onChange={e => setKlasifikasi(e.target.value)} placeholder="KSA.0X.0X" className="flex-1 min-w-0 px-2 py-2 text-xs font-medium bg-transparent outline-none text-zinc-900 dark:text-white" />
              <div className="bg-zinc-100 dark:bg-zinc-700 px-2 flex items-center border-l border-zinc-200 dark:border-zinc-600 shrink-0"><span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">/B/{currentMonth}/{currentYear}</span></div>
            </div>
          </FormSection>

          <FormSection title="Pengaturan Dokumen">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Kota</label>
                <input value={kotaSurat} onChange={e => setKotaSurat(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Tanggal</label>
                <input 
                  type="date" 
                  value={tanggalSurat} 
                  onChange={e => {
                    const newDate = e.target.value;
                    setTanggalSurat(newDate);
                    updateDasarFromFunding(sumberDana, newDate);
                  }} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white" 
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Sumber Dana">
            <div className="space-y-2">
              <select
                value={sumberDana}
                onChange={e => {
                  const newFunding = e.target.value;
                  setSumberDana(newFunding);
                  updateDasarFromFunding(newFunding, tanggalSurat);
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white"
              >
                {SUMBER_DANA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              {sumberDana === 'other' && (
                <input 
                  value={sumberDanaOther} 
                  onChange={e => setSumberDanaOther(e.target.value)} 
                  placeholder="Sebutkan sumber dana..." 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 animate-in slide-in-from-top-1 text-zinc-900 dark:text-white" 
                />
              )}
            </div>
          </FormSection>

          <FormSection title="Menimbang" action={<button onClick={() => setMenimbangItems([...menimbangItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-blue-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {menimbangItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-zinc-400 mt-2">{indexToLetter(idx)}</span>
                  <textarea value={item.text} onChange={e => { const n = [...menimbangItems]; n[idx].text = e.target.value; setMenimbangItems(n); }} className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white" />
                  <button onClick={() => setMenimbangItems(menimbangItems.filter(i => i.id !== item.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Dasar" action={<button onClick={() => setDasarItems([...dasarItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-blue-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {dasarItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-zinc-400 mt-2">{idx + 1}.</span>
                  <textarea value={item.text} onChange={e => { const n = [...dasarItems]; n[idx].text = e.target.value; setDasarItems(n); }} className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white" />
                  <button onClick={() => setDasarItems(dasarItems.filter(i => i.id !== item.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Kepada (Personil)" action={<span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">{selectedEmployees.length}</span>}>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                )}
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" placeholder="Cari..." />
              </div>
              <AnimatePresence>
                {showDropdown && searchQuery && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map((emp: Employee) => {
                      const isSelected = selectedEmployees.some(e => e.id === emp.id);
                      return (
                      <button key={emp.id} disabled={isSelected} onClick={() => { 
                        if (isSelected) return;
                        const normalized = { ...emp, nama_lengkap: emp.nama_lengkap || emp.name || "", jabatan: emp.jabatan || emp.position || "" };
                        setSelectedEmployees([...selectedEmployees, normalized]);
                        if (templateType === "beda-hari") {
                          setEmployeeDates((prev) => ({
                            ...prev,
                            [normalized.id]: prev[normalized.id] || { mulai: tanggalMulai || "", selesai: tanggalSelesai || "" },
                          }));
                        }
                        setSearchQuery(""); 
                        setShowDropdown(false); 
                      }} className={`w-full px-4 py-2 text-left border-b border-zinc-100 dark:border-zinc-700 last:border-0 ${isSelected ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-700" : "hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}>
                        <p className={`text-sm font-bold ${isSelected ? "text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>{emp.nama_lengkap || emp.name} {isSelected ? "✓" : ""}</p>
                        <p className="text-[10px] text-zinc-400">{emp.nip}</p>
                      </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-2 mt-3">
              {selectedEmployees.map((emp, idx) => {
                const dateRange = employeeDates[emp.id] || { mulai: "", selesai: "" };
                return (
                  <div key={`${emp.id}-${idx}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-400">{idx + 1}</span>
                      <div className="flex-1 truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">{emp.nama_lengkap || emp.name}</div>
                      <button onClick={() => {
                        setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
                        setEmployeeDates((prev) => {
                          const next = { ...prev };
                          delete next[emp.id];
                          return next;
                        });
                      }} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                    {templateType === "beda-hari" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Tanggal Mulai</label>
                          <input
                            type="date"
                            value={dateRange.mulai}
                            onChange={(e) =>
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [emp.id]: { ...dateRange, mulai: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Tanggal Selesai</label>
                          <input
                            type="date"
                            value={dateRange.selesai}
                            onChange={(e) =>
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [emp.id]: { ...dateRange, selesai: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {templateType === "beda-hari" && (
              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-2 dark:border-orange-500/30 dark:bg-orange-500/10">
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                  Judul Lampiran
                </label>
                <input
                  type="text"
                  value={judulLampiranBedaHari}
                  onChange={(e) => setJudulLampiranBedaHari(e.target.value)}
                  className="w-full rounded-lg border border-orange-300 bg-white px-2 py-1 text-xs outline-none dark:border-orange-500/30 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            )}
          </FormSection>

          <FormSection title="Detail Kegiatan">
            <div className="space-y-3">
              {templateType === "plh" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">Wilayah Kepala Seksi</label>
                    <input
                      value={plhWilayah}
                      onChange={(e) => setPlhWilayah(e.target.value)}
                      placeholder="Contoh: Wilayah II Tenggarong"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">Kegiatan Kepala Seksi</label>
                    <textarea
                      value={plhKegiatanKasi}
                      onChange={(e) => setPlhKegiatanKasi(e.target.value)}
                      placeholder="Kegiatan Kepala Seksi yang menjadi dasar PLH"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm min-h-[72px] outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Jenis Tugas</label>
                <select 
                  value={activityPrefix} 
                  onChange={e => handleActivityPrefixChange(e.target.value)} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white"
                >
                  <option value="Perjalanan Dinas">Perjalanan Dinas</option>
                  <option value="Melaksanakan Kegiatan">Melaksanakan Kegiatan (1 Hari)</option>
                  <option value="Melaksanakan Tugas">Melaksanakan Tugas</option>
                  <option value="Menugaskan Staf">Menugaskan Staf</option>
                </select>
              </div>
              {!isSingleDayActivity && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={kotaAsal} onChange={e => setKotaAsal(e.target.value)} placeholder="Asal" className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                  <input value={kotaTujuan} onChange={e => setKotaTujuan(e.target.value)} placeholder="Tujuan" className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                </div>
              )}
              <textarea value={namaKegiatan} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder={isSingleDayActivity ? "Contoh: Melaksanakan Pemeriksaan dan Penilaian Barang Milik Negara berupa Alat Angkutan Bermotor" : "Kegiatan..."} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white" />
              {!isSingleDayActivity && (
                <input value={tempatKegiatan} onChange={e => {
                  const nextPlace = e.target.value;
                  setTempatKegiatan(nextPlace);
                  if (sumberDana === "folu") {
                    updateFoluMenimbang(namaKegiatan, nextPlace);
                  }
                }} placeholder="Tempat Spesifik" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              )}
              {isSingleDayActivity ? (
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={e => {
                    setTanggalMulai(e.target.value);
                    setTanggalSelesai(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white"
                />
              ) : (
                <div className={`grid grid-cols-2 gap-2 ${templateType === "beda-hari" ? "hidden" : ""}`}>
                  <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                  <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                </div>
              )}
              {templateType === "beda-hari" && (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-[10px] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  Mode Beda Hari aktif: tanggal kegiatan dihitung otomatis dari tanggal mulai paling awal sampai tanggal selesai paling akhir di daftar pegawai.
                </p>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Untuk</h3>
                  <button onClick={() => setUntukItems([...untukItems, { id: Math.random().toString(), text: "" }])} className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase">
                    <Plus className="w-3 h-3" /> Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {untukItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-2">
                      <span className="text-xs font-bold text-zinc-400 mt-2">{idx + 2}.</span>
                      <textarea
                        value={item.text}
                        onChange={e => {
                          const nextItems = [...untukItems];
                          nextItems[idx].text = e.target.value;
                          setUntukItems(nextItems);
                        }}
                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white"
                      />
                      <button onClick={() => setUntukItems(untukItems.filter(i => i.id !== item.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Tembusan" action={
            <button onClick={() => setTembusanItems([...tembusanItems, ""])} className="text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" />
            </button>
          }>
            <div className="space-y-2">
              {tembusanItems.length === 0 && (
                <p className="text-[11px] text-zinc-400 italic">Belum ada tembusan. Klik + untuk menambah.</p>
              )}
              {tembusanItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-4">{idx + 1}.</span>
                  <input
                    value={item}
                    onChange={(e) => {
                      const updated = [...tembusanItems];
                      updated[idx] = e.target.value;
                      setTembusanItems(updated);
                    }}
                    placeholder="Nama penerima tembusan..."
                    className="flex-1 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                  />
                  <button onClick={() => setTembusanItems(tembusanItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Penandatangan">
            <div className="relative mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={penandatanganSearchQuery}
                  onChange={e => {
                    setPenandatanganSearchQuery(e.target.value);
                    setShowPenandatanganDropdown(true);
                  }}
                  onFocus={() => setShowPenandatanganDropdown(true)}
                  placeholder="Cari pegawai penandatangan..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-9 py-2 text-sm outline-none text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:bg-zinc-700"
                />
              </div>
              {showPenandatanganDropdown && (
                <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat pegawai...
                    </div>
                  ) : penandatanganSearchResults.length > 0 ? (
                    penandatanganSearchResults.map((emp: Employee) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectPenandatangan(emp)}
                        className="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-0 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700"
                      >
                        <div className="text-xs font-bold text-zinc-900 dark:text-white">{emp.nama_lengkap || emp.name}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          NIP. {formatNIP(emp.nip)}{(emp.jabatan || emp.position) ? ` - ${emp.jabatan || emp.position}` : ""}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-zinc-500">Pegawai tidak ditemukan.</div>
                  )}
                </div>
              )}
            </div>
            <input value={kepalaBalai.name} onChange={e => setKepalaBalai({...kepalaBalai, name: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm mb-2 outline-none text-zinc-900 dark:text-white" />
            <input
              value={kepalaBalai.nip}
              onChange={e => setKepalaBalai({...kepalaBalai, nip: e.target.value})}
              onBlur={() => setKepalaBalai(prev => ({ ...prev, nip: formatNIP(prev.nip) }))}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white"
            />
          </FormSection>
        </div>

        <footer className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0 space-y-2">
          <Button onClick={handleSave} variant="outline" className="w-full h-10 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
            <FileText className="w-4 h-4 mr-2" /> Simpan Draft
          </Button>
          
          {suratStatus === 'approved' || suratStatus === 'completed' ? (
            <Button disabled className="w-full h-12 bg-emerald-500 text-white rounded-xl font-bold opacity-80 cursor-not-allowed">
              <Send className="w-5 h-5 mr-2" /> Sudah Disetujui
            </Button>
          ) : (
            <Button onClick={handleSubmitForApproval} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">
              <Send className="w-5 h-5 mr-2" /> {suratStatus === 'pending' ? 'Perbarui & Ajukan' : 'Ajukan Persetujuan'}
            </Button>
          )}

          <Button variant="outline" onClick={handlePrint} className="w-full h-10 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
            <Printer className="w-5 h-5 mr-2" /> Cetak / Download
          </Button>
        </footer>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-zinc-200/50 dark:bg-zinc-950">
        <div className="relative">
          <div
            id="surat-preview-doc"
            className="w-[210mm] bg-white shadow-2xl selection:bg-blue-100"
            style={{
              padding: "0.4cm 1cm 1cm 3cm",
              fontFamily: "'Bookman Old Style', 'Georgia', serif",
              fontSize: "11pt",
              lineHeight: "1.25",
              color: "#000",
              textAlign: "justify",
              boxSizing: "border-box",
              minHeight: "297mm",
            }}
          >
            <STBuilderPreview 
              stNumber={stNumber} stCode={`K.18/TU/${klasifikasi}/B`} currentMonth={currentMonth} currentYear={currentYear}
              menimbangItems={getPreviewMenimbangItems()} dasarItems={dasarItems} untukItems={getPreviewUntukItems()} selectedEmployees={selectedEmployees}
              buildUntukText={buildUntukText} buildBiayaText={buildBiayaText}
              kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} kepalaBalai={kepalaBalai}
              tembusanItems={tembusanItems}
              headerTitle={headerTitle}
              sumberDana={sumberDana}
              templateType={templateType}
              employeeDates={employeeDates}
              judulLampiranBedaHari={judulLampiranBedaHari}
            />
          </div>
          {/* Page break indicators */}
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "297mm" }}>
            <div className="h-8 bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 tracking-widest">HALAMAN 2</span>
            </div>
          </div>
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "calc(297mm * 2 + 32px)" }}>
            <div className="h-8 bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 tracking-widest">HALAMAN 3</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{title}</label>
        {action}
      </div>
      {children}
    </div>
  );
}
