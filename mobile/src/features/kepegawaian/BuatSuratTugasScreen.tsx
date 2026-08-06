import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { HEADER_NEW_BASE64 } from "../../assets/headerNewBase64";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface Employee {
  id: string;
  name: string;
  nip: string;
  position?: string;
  department?: string;
}

interface BuatSuratTugasScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return "...";
  try {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr || "...";
  }
}

function formatNipIndo(nip: string | null | undefined): string {
  if (!nip) return "19740514 199903 1 001";
  const cleaned = nip.replace(/\s/g, "");
  if (cleaned.length !== 18) return nip;
  return `${cleaned.substring(0, 8)} ${cleaned.substring(8, 14)} ${cleaned.substring(14, 15)} ${cleaned.substring(15)}`;
}

function numberToWordsIndo(n: number): string {
  const words = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (n >= 0 && n <= 11) return words[n];
  if (n < 20) return `${words[n - 10]} belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;
    return `${words[tens]} puluh${rem > 0 ? " " + words[rem] : ""}`;
  }
  return String(n);
}

function calculateDaysBetween(startStr: string, endStr: string): number {
  try {
    const d1 = new Date(startStr);
    const d2 = new Date(endStr);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 1;
  }
}

function parsePersonnelData(raw: any, availableEmployees: Employee[]): Employee[] {
  if (!raw) return [];

  // Case 1: Array of objects or strings
  if (Array.isArray(raw)) {
    const result: Employee[] = [];
    raw.forEach((p: any, idx: number) => {
      if (typeof p === "object" && p !== null) {
        const pName = p.nama_lengkap || p.name || "";
        const matched = availableEmployees.filter(emp => 
          emp.name && pName.toLowerCase().includes(emp.name.toLowerCase())
        );
        if (matched.length > 1) {
          result.push(...matched);
        } else if (matched.length === 1) {
          result.push(matched[0]);
        } else {
          result.push({
            id: p.id ? String(p.id) : `edit-p-${idx}`,
            name: pName || "Pegawai",
            nip: p.nip || "",
            position: p.position || p.jabatan || "",
            department: p.department || p.satker || "",
          });
        }
      } else if (typeof p === "string") {
        const matched = availableEmployees.filter(emp => 
          emp.name && p.toLowerCase().includes(emp.name.toLowerCase())
        );
        if (matched.length > 0) {
          result.push(...matched);
        } else {
          result.push({
            id: `edit-p-${idx}`,
            name: p,
            nip: "",
            position: "Staf Balai KSDA",
          });
        }
      }
    });
    const uniqueMap = new Map<string, Employee>();
    result.forEach(emp => uniqueMap.set(emp.id || emp.name, emp));
    return Array.from(uniqueMap.values());
  }

  // Case 2: String (e.g. "Carica Deffa Yullinda, S.Kom., Tegar Anugrah, A.Md.Kom.")
  if (typeof raw === "string") {
    const matched = availableEmployees.filter(emp => 
      emp.name && raw.toLowerCase().includes(emp.name.toLowerCase())
    );
    if (matched.length > 0) {
      return matched;
    }
    const parts = raw.split(/;|\n/).map(s => s.trim()).filter(Boolean);
    return parts.map((nameStr, idx) => ({
      id: `edit-p-str-${idx}`,
      name: nameStr,
      nip: "",
      position: "Staf Balai KSDA",
    }));
  }

  return [];
}

function parseMaksudTujuanData(maksudTujuanRaw: string) {
  if (!maksudTujuanRaw) {
    return {
      line1: "",
      additionalLines: [],
      namaKegiatan: "",
      kotaAsal: "Samarinda",
      kotaTujuan: "",
      tempatSpesifik: "",
      jenisTugas: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" as const,
    };
  }

  const lines = maksudTujuanRaw.split("\n").map((l) => l.trim()).filter(Boolean);
  const line1 = lines[0] || "";
  const additionalLines = lines.slice(1);

  const selamaRegex = /,?\s*selama\s+\d+\s*\([^)]+\)\s*(?:hari(?:\s+kerja)?\s+)?terhitung.*$/i;
  const cleanedActivity = line1.replace(selamaRegex, "").replace(/[;,.]$/, "").trim();

  // Pattern 1: Perjalanan Dinas dari X ke Y dalam rangka Z [di W]
  const pdRegex = /^(?:Melaksanakan[.\s]+)?(Perjalanan\s+[Dd]inas)\s+dari\s+(.*?)\s+ke\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
  const pdMatch = cleanedActivity.match(pdRegex);

  if (pdMatch) {
    const kotaAsal = pdMatch[2].trim();
    const kotaTujuan = pdMatch[3].trim();
    const rest = pdMatch[4].trim();
    const diRegex = /(.*)\s+di\s+([^,;]+)$/i;
    const diMatch = rest.match(diRegex);

    let namaKegiatan = rest.replace(/[;,.]$/, "").trim();
    let tempatSpesifik = "";
    if (diMatch) {
      namaKegiatan = diMatch[1].trim();
      tempatSpesifik = diMatch[2].trim();
    }

    return {
      line1,
      additionalLines,
      namaKegiatan,
      kotaAsal,
      kotaTujuan,
      tempatSpesifik,
      jenisTugas: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" as const,
    };
  }

  // Pattern 2: Melaksanakan Kegiatan Z [pada W] [di Y]
  const mkRegex = /^Melaksanakan\s+Kegiatan\s+(.*)/i;
  const mkMatch = cleanedActivity.match(mkRegex);
  if (mkMatch) {
    let rest = mkMatch[1].trim();
    let kotaTujuan = "";
    let tempatSpesifik = "";

    const diMatch = rest.match(/(.*)\s+di\s+([^,;]+)$/i);
    if (diMatch) {
      rest = diMatch[1].trim();
      kotaTujuan = diMatch[2].trim();
    }

    const padaMatch = rest.match(/(.*)\s+pada\s+([^,;]+)$/i);
    if (padaMatch) {
      rest = padaMatch[1].trim();
      tempatSpesifik = padaMatch[2].trim();
    }

    return {
      line1,
      additionalLines,
      namaKegiatan: rest.replace(/[;,.]$/, "").trim(),
      kotaAsal: "Samarinda",
      kotaTujuan,
      tempatSpesifik,
      jenisTugas: "Melaksanakan Kegiatan ( 1 Hari )" as const,
    };
  }

  // Pattern 3: Menugaskan Staf untuk Z [pada W] [di Y]
  const msRegex = /^Menugaskan\s+Staf\s+(?:untuk\s+)?(.*)/i;
  const msMatch = cleanedActivity.match(msRegex);
  if (msMatch) {
    let rest = msMatch[1].trim();
    let kotaTujuan = "";
    let tempatSpesifik = "";

    const diMatch = rest.match(/(.*)\s+di\s+([^,;]+)$/i);
    if (diMatch) {
      rest = diMatch[1].trim();
      kotaTujuan = diMatch[2].trim();
    }

    const padaMatch = rest.match(/(.*)\s+pada\s+([^,;]+)$/i);
    if (padaMatch) {
      rest = padaMatch[1].trim();
      tempatSpesifik = padaMatch[2].trim();
    }

    return {
      line1,
      additionalLines,
      namaKegiatan: rest.replace(/[;,.]$/, "").trim(),
      kotaAsal: "Samarinda",
      kotaTujuan,
      tempatSpesifik,
      jenisTugas: "Menugaskan Staf" as const,
    };
  }

  return {
    line1,
    additionalLines,
    namaKegiatan: cleanedActivity,
    kotaAsal: "Samarinda",
    kotaTujuan: "",
    tempatSpesifik: "",
    jenisTugas: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" as const,
  };
}

function parseNomorSuratParts(numStr?: string) {
  if (!numStr) return null;
  const match = numStr.match(/ST\.\s*(.+?)\/K\.18\/TU\/(.+?)\/B/i);
  if (match) {
    return {
      nomorUrut: match[1].trim(),
      klasifikasi: match[2].trim(),
    };
  }
  const simpleMatch = numStr.match(/ST\.\s*(\d+)/i);
  if (simpleMatch) {
    return {
      nomorUrut: simpleMatch[1].trim(),
      klasifikasi: null,
    };
  }
  return null;
}

// Master Employee List Fallback
const masterEmployeeList: Employee[] = [
  {
    id: "m-1",
    name: "Tegar Anugrah, A.Md.Kom.",
    nip: "199907072025061006",
    position: "Pranata Komputer Terampil",
    department: "Kantor Balai KSDA Kalimantan Timur",
  },
  {
    id: "m-2",
    name: "Rido, S.Hut.",
    nip: "198106052000121004",
    position: "Kepala Seksi Konservasi Wilayah II",
    department: "Seksi KSDA Wilayah II Tenggarong",
  },
  {
    id: "m-3",
    name: "Witono, S.Hut.",
    nip: "197912232000121001",
    position: "Polisi Kehutanan Ahli Madya",
    department: "Seksi KSDA Wilayah II Tenggarong",
  },
  {
    id: "m-4",
    name: "Ahmad Ripai, S.Hut.",
    nip: "198004122000121003",
    position: "Pengendali Ekosistem Hutan Ahli Muda",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-5",
    name: "Budi Santoso, S.Hut.",
    nip: "198001012005011001",
    position: "Kepala Seksi Konservasi Wilayah I",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-6",
    name: "Ari Susanto, S.Hut.",
    nip: "198502102008011002",
    position: "Polisi Kehutanan Ahli Pertama",
    department: "Seksi KSDA Wilayah III Balikpapan",
  },
  {
    id: "m-7",
    name: "Afrizal Maula Alfarisi, S.Hut.",
    nip: "199308162025061005",
    position: "Polisi Kehutanan Ahli Pertama",
    department: "Seksi KSDA Wilayah II Tenggarong",
  },
  {
    id: "m-8",
    name: "Agung Suseno, S.PKP.",
    nip: "198108242000121002",
    position: "Pengendali Ekosistem Hutan Ahli Muda",
    department: "Seksi KSDA Wilayah III Balikpapan",
  },
  {
    id: "m-9",
    name: "Agus Salim",
    nip: "MMP-008",
    position: "MMP Resor KSDA Wilayah 02 Kepulauan Derawan",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-10",
    name: "Agustaf Samber",
    nip: "197208292007101001",
    position: "Polisi Kehutanan Penyelia",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-11",
    name: "Affi Agung Rahmadi",
    nip: "199306242025061001",
    position: "Pengendali Ekosistem Hutan Pemula",
    department: "Seksi KSDA Wilayah III Balikpapan",
  },
];

const SUMBER_DANA_OPTIONS = [
  {
    id: "dipa",
    label: "DIPA",
    dasarText:
      "Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};",
  },
  {
    id: "kja",
    label: "Dana Kerjasama KJA",
    dasarText:
      "Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT Kideco Jaya Agung Nomor : PKS.140/K.18/TU /Teknis/08/2023 dan Nomor : 213/KJA/LGL/CON/VIII/2023 tanggal 08 Agustus 2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Kideco Jaya Agung;",
  },
  {
    id: "mja",
    label: "Dana Kerjasama MJA",
    dasarText:
      "Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Direktur PT Multi Jayantara Abadi Nomor : PKS.36/K.18/TU/Teknis/02/2023 dan Nomor : 001/MJA-Dir/ TPG/II /2023 tanggal 01 Februari 2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Multi Jayantara Abadi;",
  },
  {
    id: "cop",
    label: "Dana Kerjasama COP",
    dasarText:
      "Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan Centre for Orangutan Protection (COP) Nomor: PKS.191/K.18/TU/Teknis/10/2023 dan Nomor 17/HQ10/COP/2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Centre for Orangutan Protection (COP);",
  },
  {
    id: "tjiwi_kimia",
    label: "Dana Kerjasama PT. Tjiwi Kimia Tbk.",
    dasarText:
      "Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 dan Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang dan Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur dan PT Pabrik Kertas Tjiwi Kimia Tbk;",
  },
  {
    id: "tjiwi",
    label: "Dana Kerjasama PT. Tjiwi Kimia Tbk.",
    dasarText:
      "Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 dan Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang dan Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur dan PT Pabrik Kertas Tjiwi Kimia Tbk;",
  },
  {
    id: "bosf",
    label: "Dana Kerjasama BOSF",
    dasarText:
      "Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Ketua Pengurus Yayasan Penyelamatan Orangutan Borneo Nomor : PKS.184/K.18/TU/PK12/2021 dan Nomor 176/YBOS /XII/2021 tanggal 6 Desember 2021.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan Yayasan Penyelamatan Orangutan Borneo (BOSF);",
  },
  {
    id: "can",
    label: "Dana Kerjasama CAN",
    dasarText:
      "Perjanjian Kerja Sama antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Conservation Action Network (CAN) Nomor : PKS.45/K.18/TU/KSA.2.5/03/2025 dan 007/K-JAK/PKS/III/2025 tanggal 14 Maret 2025.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Conservation Action Network (CAN);",
  },
  {
    id: "alert",
    label: "Dana Kerjasama ALeRT",
    dasarText:
      "Perjanjian Kerjasama Antara Kepala Balai KSDA Kalimantan Timur dengan Direktur Aliansi Lestrai Rimba Terpadu (AleRT) Nomor: PKS.192/K.18/TU/Teknis/10/2023 dan Nomor: 51/PKS-ALeRT/ X/2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan ALeRT (Aliansi Lestari Rimba Terpadu);",
  },
  {
    id: "folu",
    label: "Dana Kerjasama FOLU",
    dasarText: "",
    biayaText:
      "Sumber dana dibebankan pada anggaran Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - Tahun Anggaran {tahun};",
  },
  {
    id: "dipa_lain",
    label: "DIPA Instansi Lain",
    dasarText: "",
    biayaText: "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Instansi Lain;",
  },
  {
    id: "swadaya",
    label: "Non-DIPA / Swadaya",
    dasarText: "",
    biayaText: "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada non-DIPA / swadaya;",
  },
  {
    id: "dl1",
    label: "Tanpa Biaya / DL 1",
    dasarText: "",
    biayaText: "Segala biaya yang timbul akibat Surat Tugas ini tidak dibebankan pada anggaran manapun (DL 1 / tanpa biaya).",
  },
  {
    id: "other",
    label: "Lainnya",
    dasarText: "",
    biayaText: "",
  },
];

export const BuatSuratTugasScreen: React.FC<BuatSuratTugasScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, colors } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // STEP 1: PILIH PEGAWAI
  const [searchQuery, setSearchQuery] = useState("");
  const [allEmployees, setAllEmployees] = useState<Employee[]>(masterEmployeeList);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isSearching, setIsSearching] = useState(false);

  // STEP 2: DETAIL PERJALANAN DINAS
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_maksudKegiatan, _setMaksudKegiatan] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().substring(0, 10));
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().substring(0, 10));
  const [keterangan, _setKeterangan] = useState("");
  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, _setSumberDanaOther] = useState("");
  const [namaPlh, _setNamaPlh] = useState("");
  const [setujuData, _setSetujuData] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedFileName, _setSelectedFileName] = useState("");
  const [activeDatePicker, setActiveDatePicker] = useState<"mulai" | "selesai" | null>(null);
  const [currentPickerMonth, setCurrentPickerMonth] = useState(new Date());
  const [dropdownModalType, setDropdownModalType] = useState<"jenisTugas" | "sumberDana" | "templateST" | null>(null);

  // PREVIEW CETAK & PRINT STATE
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Custom Notification Modal State
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: "warning" | "error" | "success" | "info";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: "warning",
    title: "",
    message: "",
  });

  const showNotif = (
    title: string,
    message: string,
    type: "warning" | "error" | "success" | "info" = "warning",
    onConfirm?: () => void
  ) => {
    setNotification({ visible: true, title, message, type, onConfirm });
  };

  // ST BUILDER PREMIUM STATE (Synced with Web /kepegawaian/surat-tugas/create)
  const route = useRoute<any>();
  const editData = route?.params?.editData;
  const [editId, setEditId] = useState<string | null>(null);
  const [suratStatus, setSuratStatus] = useState<string>("draft");
  const isPublished = ["diterbitkan", "approved", "completed", "published"].includes(suratStatus.toLowerCase());

  const [selectedTemplate, setSelectedTemplate] = useState("DEFAULT (MANUAL)");
  const [nomorUrut, setNomorUrut] = useState("");
  const [klasifikasi, setKlasifikasi] = useState("KSA.0X.0X");
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();
  const [kotaDokumen, setKotaDokumen] = useState("Samarinda");
  const [tanggalDokumen, _setTanggalDokumen] = useState(new Date().toISOString().substring(0, 10));

  const [menimbangItems, setMenimbangItems] = useState<{ id: string; text: string }[]>([
    { id: "m-1", text: "bahwa dalam rangka , perlu ;" },
    { id: "m-2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
  ]);

  const [dasarItems, setDasarItems] = useState<{ id: string; text: string }[]>([
    { id: "d-1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
    { id: "d-2", text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 24 April 2026.` },
  ]);

  const [untukItems, setUntukItems] = useState<{ id: string; text: string }[]>([
    { id: "u-2", text: "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut." },
    { id: "u-3", text: `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran ${currentYear};` },
  ]);

  const [tembusanItems, setTembusanItems] = useState<{ id: string; text: string }[]>([]);

  const [penandatanganName, setPenandatanganName] = useState("M. Ari Wibawanto, S.Hut., M.Sc.");
  const [penandatanganNip, setPenandatanganNip] = useState("19740514 199903 1 001");

  // BUILDER STATE UNTUK DETAIL KEGIATAN
  const [jenisTugas, setJenisTugas] = useState<"Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" | "Melaksanakan Kegiatan ( 1 Hari )" | "Menugaskan Staf">("Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [namaKegiatanText, setNamaKegiatanText] = useState("");
  const [tempatSpesifik, setTempatSpesifik] = useState("");

  // Sync state if opening in Edit Mode from InboxSuratTugasScreen or reset if Create Mode
  useEffect(() => {
    const defaultMenimbang = [
      { id: "m-1", text: "bahwa dalam rangka , perlu ;" },
      { id: "m-2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
    ];
    const defaultDasar = [
      { id: "d-1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
      { id: "d-2", text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 24 April 2026.` },
    ];
    const defaultUntuk = [
      { id: "u-2", text: "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut." },
      { id: "u-3", text: `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran ${currentYear};` },
    ];

    if (!editData) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditId(String(editData.id));
    if (editData.status) {
      setSuratStatus(String(editData.status).toLowerCase());
    } else {
      setSuratStatus("draft");
    }

    if (editData.nomor_surat || editData.st_number) {
      const parsedNomorEdit = parseNomorSuratParts(editData.nomor_surat || editData.st_number);
      if (parsedNomorEdit) {
        if (parsedNomorEdit.nomorUrut) setNomorUrut(parsedNomorEdit.nomorUrut);
        if (parsedNomorEdit.klasifikasi) setKlasifikasi(parsedNomorEdit.klasifikasi);
      } else {
        setNomorUrut("");
        setKlasifikasi("KSA.0X.0X");
      }
    } else {
      setNomorUrut("");
      setKlasifikasi("KSA.0X.0X");
    }

    if (editData.maksud_tujuan || editData.title) {
      const parsedMT = parseMaksudTujuanData(editData.maksud_tujuan || editData.title);
      if (parsedMT.namaKegiatan) setNamaKegiatanText(parsedMT.namaKegiatan);
      if (parsedMT.kotaAsal) setKotaAsal(parsedMT.kotaAsal);
      if (parsedMT.kotaTujuan) setKotaTujuan(parsedMT.kotaTujuan);
      if (parsedMT.tempatSpesifik) setTempatSpesifik(parsedMT.tempatSpesifik);
      if (parsedMT.jenisTugas) setJenisTugas(parsedMT.jenisTugas);
      if (parsedMT.additionalLines.length > 0) {
        setUntukItems(parsedMT.additionalLines.map((l, i) => ({ id: `u-${i + 2}`, text: l })));
      } else {
        setUntukItems(defaultUntuk);
      }
    } else {
      setUntukItems(defaultUntuk);
    }
    if (editData.location || editData.tempat_tujuan) {
      setKotaTujuan(editData.location || editData.tempat_tujuan || "");
    }
    if (editData.dana || editData.sumber_dana) {
      const d = String(editData.dana || editData.sumber_dana || "dipa").toLowerCase();
      setSumberDana(d);
    }
    if (editData.periode) {
      const parts = String(editData.periode).split("s.d");
      if (parts.length === 2) {
        setTanggalMulai(parts[0].trim());
        setTanggalSelesai(parts[1].trim());
      }
    }

    const rawPersonel = editData.personil || editData.personel || editData.employees;
    if (rawPersonel) {
      const parsedEmps = parsePersonnelData(rawPersonel, allEmployees.length > 0 ? allEmployees : masterEmployeeList);
      setSelectedEmployees(parsedEmps);
    } else {
      setSelectedEmployees([]);
    }

    const fetchFullSt = async () => {
      try {
        const res = await apiClient.get(`/surat-tugas/${editData.id}`);
        const full = res.data?.data || res.data;
        if (full) {
          if (full.status) {
            setSuratStatus(String(full.status).toLowerCase());
          }
          if (full.maksud_tujuan) {
            const parsedMT = parseMaksudTujuanData(full.maksud_tujuan);
            if (parsedMT.namaKegiatan) setNamaKegiatanText(parsedMT.namaKegiatan);
            if (parsedMT.kotaAsal) setKotaAsal(parsedMT.kotaAsal);
            if (parsedMT.kotaTujuan) setKotaTujuan(parsedMT.kotaTujuan);
            if (parsedMT.tempatSpesifik) setTempatSpesifik(parsedMT.tempatSpesifik);
            if (parsedMT.jenisTugas) setJenisTugas(parsedMT.jenisTugas);
            if (parsedMT.additionalLines.length > 0 && (!full.untuk || !Array.isArray(full.untuk))) {
              setUntukItems(parsedMT.additionalLines.map((l, i) => ({ id: `u-${i + 2}`, text: l })));
            }
          }
          if (full.nomor_surat || full.st_number) {
            const parsedNomor = parseNomorSuratParts(full.nomor_surat || full.st_number);
            if (parsedNomor) {
              if (parsedNomor.nomorUrut) setNomorUrut(parsedNomor.nomorUrut);
              if (parsedNomor.klasifikasi) setKlasifikasi(parsedNomor.klasifikasi);
            }
          }
          if (full.kode_surat) {
            const codeMatch = full.kode_surat.match(/K\.18\/TU\/(.+?)\/B/i);
            if (codeMatch) {
              setKlasifikasi(codeMatch[1]);
            }
          }
          if (full.sumber_dana) {
            setSumberDana(full.sumber_dana.toLowerCase());
          }
          if (full.tanggal_mulai) setTanggalMulai(full.tanggal_mulai);
          if (full.tanggal_selesai) setTanggalSelesai(full.tanggal_selesai);
          if (full.kota_asal) setKotaAsal(full.kota_asal);
          if (full.tempat_spesifik) setTempatSpesifik(full.tempat_spesifik);
          if (full.menimbang && Array.isArray(full.menimbang) && full.menimbang.length > 0) {
            setMenimbangItems(full.menimbang.map((m: any, i: number) => ({ id: `m-${i}`, text: typeof m === "string" ? m : m.text })));
          } else {
            setMenimbangItems(defaultMenimbang);
          }
          if (full.dasar && Array.isArray(full.dasar) && full.dasar.length > 0) {
            setDasarItems(full.dasar.map((d: any, i: number) => ({ id: `d-${i}`, text: typeof d === "string" ? d : d.text })));
          } else {
            setDasarItems(defaultDasar);
          }
          if (full.untuk && Array.isArray(full.untuk) && full.untuk.length > 0) {
            const parsedUntuk = full.untuk.map((u: any, i: number) => ({ id: `u-${i}`, text: typeof u === "string" ? u : u.text }));
            if (parsedUntuk.length > 1 && (parsedUntuk[0].text.includes("Melaksanakan Perjalanan Dinas") || parsedUntuk[0].text.includes("Melaksanakan Kegiatan") || parsedUntuk[0].text.includes("Menugaskan Staf"))) {
              setUntukItems(parsedUntuk.slice(1));
            } else {
              setUntukItems(parsedUntuk);
            }
          }
          if (full.tembusan && Array.isArray(full.tembusan) && full.tembusan.length > 0) {
            setTembusanItems(full.tembusan.map((t: any, i: number) => ({ id: `t-${i}`, text: typeof t === "string" ? t : t.text })));
          } else {
            setTembusanItems([]);
          }
          if (full.penandatangan_nama) setPenandatanganName(full.penandatangan_nama);
          if (full.penandatangan_nip) setPenandatanganNip(full.penandatangan_nip);

          const fullPersonel = full.personil || full.personel || full.employees;
          if (fullPersonel) {
            const parsedEmps = parsePersonnelData(fullPersonel, allEmployees.length > 0 ? allEmployees : masterEmployeeList);
            setSelectedEmployees(parsedEmps);
          }
        }
      } catch {
        // use local editData state fallback
      }
    };

    fetchFullSt();
  }, [editData, allEmployees, currentYear]);

  // Dynamic List Handlers
  const handleAddMenimbangItem = () => {
    setMenimbangItems((prev) => [...prev, { id: `m-${Date.now()}`, text: "bahwa..." }]);
  };
  const handleDeleteMenimbangItem = (id: string) => {
    setMenimbangItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateMenimbangItem = (id: string, text: string) => {
    setMenimbangItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleAddDasarItem = () => {
    setDasarItems((prev) => [...prev, { id: `d-${Date.now()}`, text: "" }]);
  };
  const handleDeleteDasarItem = (id: string) => {
    setDasarItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateDasarItem = (id: string, text: string) => {
    setDasarItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleAddUntukItem = () => {
    setUntukItems((prev) => [...prev, { id: `u-${Date.now()}`, text: "" }]);
  };
  const handleDeleteUntukItem = (id: string) => {
    setUntukItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateUntukItem = (id: string, text: string) => {
    setUntukItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleAddTembusanItem = () => {
    setTembusanItems((prev) => [...prev, { id: `t-${Date.now()}`, text: "" }]);
  };
  const handleDeleteTembusanItem = (id: string) => {
    setTembusanItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateTembusanItem = (id: string, text: string) => {
    setTembusanItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const updateDasarFromFunding = (fundingId: string, date: string) => {
    const opt = SUMBER_DANA_OPTIONS.find((o) => o.id === fundingId);
    if (opt && opt.dasarText) {
      const tahun = date ? new Date(date).getFullYear().toString() : currentYear;
      const text = opt.dasarText.replace(/{tahun}/g, tahun);

      setDasarItems((prev) => {
        const newItems = [...prev];
        if (newItems.length >= 2) {
          newItems[1] = { ...newItems[1], text };
        } else if (newItems.length === 1) {
          newItems.push({ id: `d-${Date.now()}`, text });
        }
        return newItems;
      });
    }
  };

  const handleSumberDanaChange = (newFunding: string) => {
    setSumberDana(newFunding);
    updateDasarFromFunding(newFunding, tanggalDokumen || currentYear);

    const opt = SUMBER_DANA_OPTIONS.find((o) => o.id === newFunding);
    let newBiayaText = opt?.biayaText || "";
    if (newBiayaText) {
      newBiayaText = newBiayaText.replace(/{tahun}/g, currentYear);
      setUntukItems((prev) => {
        if (prev.length >= 2) {
          const next = [...prev];
          next[1] = { ...next[1], text: newBiayaText };
          return next;
        }
        if (prev.length === 1) {
          return [...prev, { id: `u-${Date.now()}`, text: newBiayaText }];
        }
        return prev;
      });
    }
  };


  // Helper to build Untuk item 1 from Detail Kegiatan
  const buildUntukText = (): string => {
    const days = calculateDaysBetween(tanggalMulai, tanggalSelesai);
    const daysWord = numberToWordsIndo(days);
    const tglMulaiFormatted = formatDateIndo(tanggalMulai);
    const tglSelesaiFormatted = formatDateIndo(tanggalSelesai);

    let text = "";
    if (jenisTugas.includes("Perjalanan Dinas")) {
      text = `Melaksanakan Perjalanan Dinas dari ${kotaAsal || "Samarinda"} ke ${kotaTujuan || "Balikpapan"}`;
      if (namaKegiatanText) text += ` dalam rangka ${namaKegiatanText}`;
      if (tempatSpesifik) text += ` di ${tempatSpesifik}`;
    } else if (jenisTugas.includes("Kegiatan")) {
      text = `Melaksanakan Kegiatan ${namaKegiatanText || "..."}`;
      if (tempatSpesifik) text += ` pada ${tempatSpesifik}`;
      if (kotaTujuan) text += ` di ${kotaTujuan}`;
    } else {
      text = `Menugaskan Staf untuk ${namaKegiatanText || "..."}`;
      if (tempatSpesifik) text += ` pada ${tempatSpesifik}`;
      if (kotaTujuan) text += ` di ${kotaTujuan}`;
    }

    if (days === 1 || tanggalMulai === tanggalSelesai) {
      text += `, selama 1 (satu) hari pada tanggal ${tglMulaiFormatted};`;
    } else if (days > 1) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${tglMulaiFormatted} sampai dengan ${tglSelesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };



  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deteksi otomatis Kota Asal berdasarkan Penempatan Satker Pegawai
  useEffect(() => {
    if (!selectedEmployees || selectedEmployees.length === 0) return;
    const depts = selectedEmployees.map((e) => ((e as any).department || (e as any).satuan_kerja || "").toLowerCase());

    let target = "Samarinda";
    if (depts.every((d) => d.includes("seksi i") || d.includes("seksi 1") || d.includes("wilayah i") || d.includes("berau") || d.includes("skw i"))) {
      target = "Berau";
    } else if (depts.every((d) => d.includes("seksi ii") || d.includes("seksi 2") || d.includes("wilayah ii") || d.includes("tenggarong") || d.includes("skw ii"))) {
      target = "Tenggarong";
    } else if (depts.every((d) => d.includes("seksi iii") || d.includes("seksi 3") || d.includes("wilayah iii") || d.includes("balikpapan") || d.includes("skw iii"))) {
      target = "Balikpapan";
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKotaAsal((prev) => (prev !== target ? target : prev));
  }, [selectedEmployees]);

  // Fetch employees from API and merge with master list
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsSearching(true);
      try {
        let apiList: Employee[] = [];
        try {
          const respSelect = await apiClient.get<any>("/kepegawaian/employees/select");
          if (respSelect.data && Array.isArray(respSelect.data.data)) {
            apiList = respSelect.data.data.map((emp: any) => ({
              id: String(emp.id),
              name: emp.name || emp.nama_lengkap,
              nip: emp.nip || "-",
              position: emp.position || emp.jabatan || "Staf BKSDA",
              department: emp.department || emp.satuan_kerja || "Balai KSDA Kaltim",
            }));
          }
        } catch {
          // fallback to index
          const respIndex = await apiClient.get<any>("/kepegawaian/employees?per_page=200");
          if (respIndex.data && Array.isArray(respIndex.data.data)) {
            apiList = respIndex.data.data.map((emp: any) => ({
              id: String(emp.id),
              name: emp.nama_lengkap || emp.name,
              nip: emp.nip || "-",
              position: emp.jabatan || "Staf BKSDA",
              department: emp.satuan_kerja || "Balai KSDA Kaltim",
            }));
          }
        }

        // Merge API employees with masterEmployeeList (deduplicate by NIP or ID)
        const combined = [...apiList];
        masterEmployeeList.forEach((mEmp) => {
          if (!combined.some((c) => c.nip === mEmp.nip || c.name.toLowerCase() === mEmp.name.toLowerCase())) {
            combined.push(mEmp);
          }
        });

        setAllEmployees(combined);
      } catch {
        setAllEmployees(masterEmployeeList);
      } finally {
        setIsSearching(false);
      }
    };

    fetchEmployees();
  }, []);

  const searchResults = allEmployees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.position && emp.position.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleEmployee = (emp: Employee) => {
    if (selectedEmployees.some((e) => e.id === emp.id)) {
      setSelectedEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } else {
      setSelectedEmployees((prev) => [...prev, emp]);
      setSearchQuery("");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddManualEmployee = () => {
    if (!searchQuery.trim()) return;
    const manualEmp: Employee = {
      id: `manual-${Date.now()}`,
      name: searchQuery.trim(),
      nip: `PEG-${Math.floor(100000 + Math.random() * 900000)}`,
      position: "Staf Ditugaskan",
      department: "Balai KSDA Kalimantan Timur",
    };
    setSelectedEmployees((prev) => [...prev, manualEmp]);
    setSearchQuery("");
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    } else if (onBack) {
      onBack();
    } else if (navigation) {
      if (editId || editData) {
        navigation.navigate("InboxSuratTugas");
      } else {
        navigation.navigate("KepegawaianDashboard");
      }
    }
  };

  const handleSelectNavTab = (tabKey: string) => {
    if (tabKey === "home" || tabKey === "portal" || tabKey === "dashboard") {
      if (navigation) navigation.navigate("Dashboard");
    } else if (tabKey === "bmn") {
      if (navigation) navigation.navigate("Bmn");
    } else if (tabKey === "surat") {
      if (navigation) navigation.navigate("Surat");
    } else if (tabKey === "inventory") {
      if (navigation) navigation.navigate("Inventory");
    } else if (tabKey === "kepegawaian") {
      if (navigation) navigation.navigate("Kepegawaian");
    } else if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    }
  };

  const buildOfficialBksdaSuratTugasHtml = (params: {
    nomorUrut?: string;
    kotaAsal?: string;
    kotaTujuan?: string;
    namaKegiatanText?: string;
    tempatSpesifik?: string;
    tanggalMulai?: string;
    tanggalSelesai?: string;
    penandatanganName?: string;
    penandatanganNip?: string;
    selectedEmployees?: Employee[];
    menimbangItems?: { id: string; text: string }[];
    dasarItems?: { id: string; text: string }[];
    untukItems?: { id: string; text: string }[];
    tembusanItems?: { id: string; text: string }[] | string[];
  }): string => {
    const nomorSurat = `ST. ${params.nomorUrut || nomorUrut || "001"}/K.18/TU/${klasifikasi || "KSA.0X.0X"}/B/${currentMonth}/${currentYear}`;
    const ttdNama = params.penandatanganName || "M. Ari Wibawanto, S.Hut., M.Sc.";
    const ttdNip = formatNipIndo(params.penandatanganNip || "19740514 199903 1 001");

    const listEmp = (params.selectedEmployees && params.selectedEmployees.length > 0)
      ? params.selectedEmployees
      : [
          { name: "Carica Deffa Yullinda, S.Kom.", nip: "200207312025062007", position: "Pranata Komputer Ahli Pertama" },
          { name: "Tegar Anugrah, A.Md.Kom.", nip: "199907072025061006", position: "Pranata Komputer Terampil" },
        ];

    const personnelRowsHtml = listEmp.map((p, idx) => `
      <tr>
        <td style="width: 24px; vertical-align: top; padding: 2px 0;">${idx + 1}.</td>
        <td style="vertical-align: top; padding: 2px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 75px; padding: 1px 0;">Nama</td>
              <td style="width: 12px; padding: 1px 0;">:</td>
              <td style="font-weight: bold; padding: 1px 0;">${p.name}</td>
            </tr>
            <tr>
              <td style="padding: 1px 0;">NIP</td>
              <td style="padding: 1px 0;">:</td>
              <td style="padding: 1px 0;">${formatNipIndo(p.nip)}</td>
            </tr>
            <tr>
              <td style="padding: 1px 0;">Jabatan</td>
              <td style="padding: 1px 0;">:</td>
              <td style="padding: 1px 0;">${p.position || 'Pranata Komputer'}</td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    const listMenimbang = (params.menimbangItems && params.menimbangItems.length > 0)
      ? params.menimbangItems
      : menimbangItems;

    const menimbangRowsHtml = listMenimbang.map((m, idx) => `
      <tr>
        <td style="width: 24px; vertical-align: top; padding: ${idx === 0 ? '1px 0' : '2px 0 1px 0'};">${String.fromCharCode(97 + idx)}.</td>
        <td style="vertical-align: top; padding: ${idx === 0 ? '1px 0' : '2px 0 1px 0'}; text-align: justify; line-height: 1.22;">${m.text || '...'}</td>
      </tr>
    `).join('');

    const listDasar = (params.dasarItems && params.dasarItems.length > 0)
      ? params.dasarItems
      : dasarItems;

    const dasarRowsHtml = listDasar.map((d, idx) => `
      <tr>
        <td style="width: 24px; vertical-align: top; padding: ${idx === 0 ? '1px 0' : '2px 0 1px 0'};">${idx + 1}.</td>
        <td style="vertical-align: top; padding: ${idx === 0 ? '1px 0' : '2px 0 1px 0'}; text-align: justify; line-height: 1.22;">${d.text || '...'}</td>
      </tr>
    `).join('');

    const item1Text = buildUntukText();
    const listUntuk = (params.untukItems && params.untukItems.length > 0)
      ? params.untukItems
      : untukItems;

    const fullUntukList = [
      { id: "u-1", text: item1Text },
      ...listUntuk,
    ];

    const untukRowsHtml = fullUntukList.map((u, idx) => `
      <tr>
        <td style="width: 24px; vertical-align: top; padding: ${idx === 0 ? '1px 0' : '2px 0 1px 0'};">${idx + 1}.</td>
        <td style="vertical-align: top; padding: ${idx === 0 ? '1px 0' : '2px 0 1px 0'}; text-align: justify; line-height: 1.22;">${u.text || '...'}</td>
      </tr>
    `).join('');

    const rawTembusanList = (params.tembusanItems && params.tembusanItems.length > 0)
      ? params.tembusanItems
      : tembusanItems;

    const listTembusan = rawTembusanList
      .map((t: any) => (typeof t === 'string' ? t : (t.text || ''))?.trim())
      .filter((t: string) => t.length > 0);

    const shouldNumberTembusan = listTembusan.length > 1;

    const tembusanRowsHtml = listTembusan.map((t: string, idx: number) => `
      <tr>
        ${shouldNumberTembusan ? `<td style="width: 20px; vertical-align: top; padding: 1px 0;">${idx + 1}.</td>` : ''}
        <td style="vertical-align: top; padding: 1px 0; white-space: nowrap;">${t}</td>
      </tr>
    `).join('');

    const tembusanHtml = (listTembusan.length > 0)
      ? `
        <div style="margin-top: -22px; max-width: 9.4cm; font-size: 10pt; font-weight: normal; color: #000000;">
          <p style="margin: 0 0 4px; font-weight: normal; font-size: 10pt; color: #000000;">Tembusan:</p>
          <table style="border-collapse: collapse;">
            <tbody>
              ${tembusanRowsHtml}
            </tbody>
          </table>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=210mm, initial-scale=0.42, minimum-scale=0.2, maximum-scale=3.0, user-scalable=yes">
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #0f172a;
            width: 100%;
            min-height: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            font-family: 'Bookman Old Style', 'Georgia', serif;
          }
          .page-wrapper {
            padding: 16px 8px;
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .page-card {
            width: 210mm;
            min-height: 297mm;
            background: #ffffff;
            padding: 22mm 15.5mm 22mm 20mm;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            color: #000000;
            font-size: 11pt;
            line-height: 1.22;
            text-align: justify;
            position: relative;
          }
          .kop-container {
            text-align: left;
            margin-top: -16mm;
            margin-bottom: 4px;
            margin-left: -1.0cm;
            margin-right: -0.45cm;
            width: calc(100% + 1.45cm);
          }
          .doc-header { text-align: center; margin: 12px 0; }
          .doc-title { font-size: 11pt; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 1px; }
          .doc-number { font-size: 11pt; margin: 0; }
          .section-center { text-align: center; font-weight: bold; margin: 12px 0 4px; }
          table.main-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
          td.col-label { width: 110px; vertical-align: top; padding: 1px 0; font-size: 11pt; }
          td.col-colon { width: 12px; vertical-align: top; padding: 1px 0; font-size: 11pt; }
          td.col-content { vertical-align: top; padding: 1px 0; font-size: 11pt; }
          p.penutup-text { margin: 16px 0 0; text-align: justify; font-size: 11pt; }
          .sig-box {
            margin-top: 12px;
            display: flex;
            justify-content: flex-end;
            width: 100%;
          }
          .sig-inner {
            margin-left: auto;
            text-align: left;
            width: 280px;
          }
          .sig-text { font-size: 11pt; margin: 0; }
          .ttd-placeholder {
            margin: 14px 0 0;
            height: 105px;
            display: flex;
            align-items: flex-start;
            padding-top: 34px;
            padding-left: 1.35cm;
            box-sizing: border-box;
            color: #94a3b8;
            font-size: 9pt;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .sig-name { font-weight: bold; font-size: 11pt; margin: 0; }
          .sig-nip { font-size: 10pt; margin: 2px 0 0; }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <div class="page-card">
            <!-- KOP SURAT MATCHING LOCALHOST -->
            <div data-kop class="kop-container">
              <img
                src="${HEADER_NEW_BASE64}"
                alt="Kop Surat"
                style="width: 18.8cm; max-width: 18.8cm; height: auto; display: block; margin-left: 0;"
              />
            </div>

            <!-- JUDUL & NOMOR -->
            <div class="doc-header">
              <div class="doc-title">SURAT TUGAS</div>
              <div class="doc-number">Nomor : ${nomorSurat}</div>
            </div>

            <!-- KEPALA BALAI -->
            <div class="section-center">KEPALA BALAI,</div>

            <!-- MENIMBANG -->
            <table class="main-table">
              <tr>
                <td class="col-label">Menimbang</td>
                <td class="col-colon">:</td>
                <td class="col-content">
                  <table style="width: 100%; border-collapse: collapse;">
                    ${menimbangRowsHtml}
                  </table>
                </td>
              </tr>
            </table>

            <!-- DASAR -->
            <table class="main-table">
              <tr>
                <td class="col-label">Dasar</td>
                <td class="col-colon">:</td>
                <td class="col-content">
                  <table style="width: 100%; border-collapse: collapse;">
                    ${dasarRowsHtml}
                  </table>
                </td>
              </tr>
            </table>

            <!-- MEMBERI TUGAS -->
            <div class="section-center">MEMBERI TUGAS,</div>

            <!-- KEPADA -->
            <table class="main-table">
              <tr>
                <td class="col-label">Kepada</td>
                <td class="col-colon">:</td>
                <td class="col-content">
                  <table style="width: 100%; border-collapse: collapse;">
                    ${personnelRowsHtml}
                  </table>
                </td>
              </tr>
            </table>

            <!-- UNTUK -->
            <table class="main-table">
              <tr>
                <td class="col-label">Untuk</td>
                <td class="col-colon">:</td>
                <td class="col-content">
                  <table style="width: 100%; border-collapse: collapse;">
                    ${untukRowsHtml}
                  </table>
                </td>
              </tr>
            </table>

            <!-- PENUTUP -->
            <p class="penutup-text">Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>

            <!-- TANDA TANGAN -->
            <div class="sig-box">
              <div class="sig-inner">
                <div class="sig-text">${params.kotaAsal || "Samarinda"}, 4 Agustus 2026</div>
                <div class="sig-text">Kepala Balai,</div>
                <div class="ttd-placeholder">
                  \${ttd_pengirim}
                </div>
                <div class="sig-name">${ttdNama}</div>
                <div class="sig-nip">NIP. ${ttdNip}</div>
              </div>
            </div>

            <!-- TEMBUSAN -->
            ${tembusanHtml}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const getSuratTugasHtmlContent = () => {
    return buildOfficialBksdaSuratTugasHtml({
      nomorUrut,
      kotaAsal,
      kotaTujuan,
      namaKegiatanText,
      tempatSpesifik,
      tanggalMulai,
      tanggalSelesai,
      penandatanganName,
      penandatanganNip,
      selectedEmployees,
      menimbangItems,
      dasarItems,
      untukItems,
      tembusanItems,
    });
  };

  const handleSharePDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = getSuratTugasHtmlContent();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Bagikan Surat Tugas BKSDA",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        showNotif("Berhasil", `File PDF tersimpan di: ${uri}`, "success");
      }
    } catch (err: any) {
      showNotif("Gagal Berbagi PDF", err?.message || "Terjadi kesalahan saat membagikan PDF.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSavePDFToHP = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = getSuratTugasHtmlContent();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Simpan Surat Tugas PDF ke HP",
          mimeType: "application/pdf",
        });
        showNotif("Berhasil!", "Surat Tugas PDF siap disimpan ke perangkat HP Anda.", "success");
      } else {
        showNotif("Berhasil Disimpan", `PDF tersimpan di: ${uri}`, "success");
      }
    } catch (err: any) {
      showNotif("Gagal Menyimpan PDF", err?.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPrint = async () => {
    try {
      const html = getSuratTugasHtmlContent();
      await Print.printAsync({ html });
    } catch (err: any) {
      showNotif("Gagal Mencetak", err?.message || "Terjadi kesalahan saat mencetak.", "error");
    }
  };

  const handleSubmitSuratTugas = async () => {
    if (!setujuData) {
      showNotif("Persetujuan Diperlukan", "Silakan beri centang persetujuan bahwa data pengajuan sudah benar.");
      return;
    }

    let finalNamaKegiatan = `${jenisTugas}`;
    if (jenisTugas.includes("Perjalanan Dinas")) {
      finalNamaKegiatan = `Melaksanakan Perjalanan Dinas dari ${kotaAsal.trim() || "..."} ke ${kotaTujuan.trim() || "..."}${namaKegiatanText.trim() ? ` dalam rangka ${namaKegiatanText.trim()}` : ""}${tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : ""}`;
    } else if (jenisTugas.includes("Melaksanakan Kegiatan")) {
      finalNamaKegiatan = `Melaksanakan Kegiatan ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
    } else {
      finalNamaKegiatan = `Menugaskan Staf untuk ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
    }

    const calculatedTempatTujuan = tempatSpesifik.trim() || kotaTujuan.trim() || (jenisTugas.includes("Perjalanan Dinas") ? kotaAsal.trim() : "");

    setIsSubmitting(true);
    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = nomorUrut && nomorUrut.trim()
        ? `ST.${nomorUrut.trim()}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`
        : undefined;

      const item1Text = buildUntukText();
      const fullUntukArray = [
        { id: "u-1", text: item1Text },
        ...untukItems
      ];
      const fullMaksudTujuan = fullUntukArray.map((u) => u.text).filter(Boolean).join("\n");
      const cleanTembusanArray = tembusanItems
        .map((t) => (typeof t === "string" ? t : t.text || "").trim())
        .filter(Boolean);

      const payload: any = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        maksud_tujuan: fullMaksudTujuan,
        nama_kegiatan: namaKegiatanText.trim() || finalNamaKegiatan,
        tempat_tujuan: calculatedTempatTujuan,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDana === "other" ? sumberDanaOther : undefined,
        menimbang: menimbangItems,
        dasar: dasarItems,
        untuk: fullUntukArray,
        tembusan: cleanTembusanArray.length > 0 ? cleanTembusanArray : null,
        penandatangan_nama: penandatanganName,
        penandatangan_nip: penandatanganNip,
        keterangan: keterangan || undefined,
        nama_plh: namaPlh || undefined,
        employees: selectedEmployees.map((e) => ({
          id: isNaN(Number(e.id)) ? e.id : Number(e.id),
          peran: undefined,
        })),
      };

      if (editId) {
        await apiClient.put(`/surat-tugas/${editId}`, payload);

        showNotif(
          "Surat Tugas Berhasil Diperbarui!",
          `Surat Tugas telah berhasil diperbarui.`,
          "success",
          () => {
            setNotification((prev) => ({ ...prev, visible: false }));
            if (navigation && typeof navigation.navigate === "function") {
              navigation.navigate("InboxSuratTugas");
            } else if (onNavigateToModule) {
              onNavigateToModule("inbox-surat-tugas");
            } else if (onBack) {
              onBack();
            }
          }
        );
      } else {
        await apiClient.post("/surat-tugas", payload);

        showNotif(
          "Pengajuan Surat Tugas Berhasil!",
          `Surat Tugas untuk ${selectedEmployees.length} pegawai telah berhasil diterbitkan.`,
          "success",
          () => {
            setNotification((prev) => ({ ...prev, visible: false }));
            if (navigation && typeof navigation.navigate === "function") {
              navigation.navigate("InboxSuratTugas");
            } else if (onNavigateToModule) {
              onNavigateToModule("inbox-surat-tugas");
            } else if (onBack) {
              onBack();
            }
          }
        );
      }
    } catch (err: any) {
      console.error("Submit Surat Tugas Error:", err);
      const errMsg =
        err?.response?.data?.message || err?.message || "Terjadi kesalahan saat menyimpan data pengajuan.";
      showNotif("Gagal Mengajukan Surat Tugas", errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraftMobile = async () => {
    let finalNamaKegiatan = `${jenisTugas}`;
    if (jenisTugas.includes("Perjalanan Dinas")) {
      finalNamaKegiatan = `Melaksanakan Perjalanan Dinas dari ${kotaAsal.trim() || "..."} ke ${kotaTujuan.trim() || "..."}${namaKegiatanText.trim() ? ` dalam rangka ${namaKegiatanText.trim()}` : ""}${tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : ""}`;
    } else if (jenisTugas.includes("Melaksanakan Kegiatan")) {
      finalNamaKegiatan = `Melaksanakan Kegiatan ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
    } else {
      finalNamaKegiatan = `Menugaskan Staf untuk ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
    }

    const calculatedTempatTujuan = tempatSpesifik.trim() || kotaTujuan.trim() || (jenisTugas.includes("Perjalanan Dinas") ? kotaAsal.trim() : "");

    setIsSubmitting(true);
    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = nomorUrut && nomorUrut.trim()
        ? `ST.${nomorUrut.trim()}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`
        : undefined;

      const item1Text = buildUntukText();
      const fullUntukArray = [
        { id: "u-1", text: item1Text },
        ...untukItems
      ];
      const fullMaksudTujuan = fullUntukArray.map((u) => u.text).filter(Boolean).join("\n");
      const cleanTembusanArray = tembusanItems
        .map((t) => (typeof t === "string" ? t : t.text || "").trim())
        .filter(Boolean);

      const payload: any = {
        status: "draft",
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        maksud_tujuan: fullMaksudTujuan,
        nama_kegiatan: namaKegiatanText.trim() || finalNamaKegiatan,
        tempat_tujuan: calculatedTempatTujuan,
        tanggal_mulai: tanggalMulai || undefined,
        tanggal_selesai: tanggalSelesai || undefined,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDana === "other" ? sumberDanaOther : undefined,
        menimbang: menimbangItems,
        dasar: dasarItems,
        untuk: fullUntukArray,
        tembusan: cleanTembusanArray.length > 0 ? cleanTembusanArray : null,
        penandatangan_nama: penandatanganName,
        penandatangan_nip: penandatanganNip,
        keterangan: keterangan || undefined,
        nama_plh: namaPlh || undefined,
        employees: selectedEmployees.map((e) => ({
          id: isNaN(Number(e.id)) ? e.id : Number(e.id),
          peran: undefined,
        })),
      };

      if (editId) {
        await apiClient.put(`/surat-tugas/${editId}`, payload);
      } else {
        await apiClient.post("/surat-tugas", payload);
      }

      showNotif(
        "Draft Disimpan!",
        "Draft Surat Tugas berhasil disimpan.",
        "success",
        () => {
          setNotification((prev) => ({ ...prev, visible: false }));
          if (navigation && typeof navigation.navigate === "function") {
            navigation.navigate("InboxSuratTugas");
          } else if (onNavigateToModule) {
            onNavigateToModule("inbox-surat-tugas");
          } else if (onBack) {
            onBack();
          }
        }
      );
    } catch (err: any) {
      console.error("Save draft error:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Gagal menyimpan draft Surat Tugas.";
      showNotif("Gagal Menyimpan Draft", errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNomorSuratMobile = async () => {
    if (!editId) return;
    try {
      setIsSubmitting(true);
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${nomorUrut}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      await apiClient.put(`/surat-tugas/${editId}`, {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
      });
      showNotif("Berhasil", "Nomor Surat berhasil diperbarui.", "success");
    } catch (err: any) {
      showNotif("Gagal", err?.response?.data?.message || "Gagal memperbarui Nomor Surat.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
        ]}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 35 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <View style={styles.headerBadgeRow}>
            <Ionicons name="document-text" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.headerBadgeText}>
              {editId ? "ST BUILDER PREMIUM (EDIT MODE)" : "ST BUILDER PREMIUM"}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>
            {editId ? "Edit Surat Tugas" : "Buat Surat Tugas"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GlassCard style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {/* Header Banner ST Builder Premium */}
          <View style={styles.stBuilderHeaderCard}>
            <View style={styles.builderIconBox}>
              <Ionicons name="document-text" size={24} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.builderTitleText}>
                ST Builder <Text style={{ color: "#2563eb" }}>Premium</Text>
              </Text>
              <Text style={styles.builderSubtitleText}>
                {editId ? `EDITING SURAT TUGAS #${editId}` : "DIRECT ISSUANCE MODE"}
              </Text>
            </View>
          </View>

          {/* TEMPLATE ST (Presisi Screenshot 1) */}
          <View style={styles.templateCardContainer}>
            <View style={styles.templateBadgeRow}>
              <View style={styles.templateBadge}>
                <Text style={styles.templateBadgeText}>TEMPLATE</Text>
              </View>
              <Text style={styles.templateLabelText}>PILIH TEMPLATE ST</Text>
            </View>
            <TouchableOpacity
              style={styles.templateSelectTrigger}
              onPress={() => !isPublished && setDropdownModalType("templateST")}
              disabled={isPublished}
              activeOpacity={0.8}
            >
              <Text style={styles.templateSelectText}>{selectedTemplate}</Text>
              <Ionicons name="chevron-down" size={18} color="#ea580c" />
            </TouchableOpacity>
          </View>

          {/* NOMOR SURAT (Presisi Screenshot 1 - Always Editable) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOMOR SURAT</Text>
            <View style={styles.nomorSuratRow}>
              <View style={styles.nomorSuratPrefix}><Text style={styles.nomorSuratPrefixText}>ST.</Text></View>
              <TextInput style={styles.nomorSuratInput} value={nomorUrut} onChangeText={setNomorUrut} keyboardType="numeric" placeholder="001" />
              <View style={styles.nomorSuratFixed}><Text style={styles.nomorSuratFixedText}>/K.18/TU/</Text></View>
              <TextInput style={[styles.nomorSuratInput, { flex: 1.5 }]} value={klasifikasi} onChangeText={setKlasifikasi} placeholder="KSA.0X.0X" />
              <View style={styles.nomorSuratFixed}><Text style={styles.nomorSuratFixedText}>/B/{currentMonth}/{currentYear}</Text></View>
            </View>
          </View>

          {/* PENGATURAN DOKUMEN (KOTA & TANGGAL - Presisi Screenshot 1) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PENGATURAN DOKUMEN</Text>
            <View style={styles.rowTwoInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>KOTA</Text>
                <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={kotaDokumen} onChangeText={setKotaDokumen} editable={!isPublished} placeholder="Samarinda" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>TANGGAL</Text>
                <TouchableOpacity style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]} onPress={() => !isPublished && setActiveDatePicker("mulai")} disabled={isPublished}>
                  <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>{tanggalDokumen}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginLeft: "auto" }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SUMBER DANA (Presisi Screenshot 1) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SUMBER DANA</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { borderColor: colors.glassBorder }]}
              onPress={() => !isPublished && setDropdownModalType("sumberDana")}
              disabled={isPublished}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownTriggerText, { color: colors.textDark }]}>
                {SUMBER_DANA_OPTIONS.find((o) => o.id === sumberDana)?.label || sumberDana.toUpperCase()}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* MENIMBANG (Presisi Screenshot 1 with + TAMBAH) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>MENIMBANG</Text>
              {!isPublished && (
                <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddMenimbangItem}>
                  <Ionicons name="add" size={14} color="#2563eb" />
                  <Text style={styles.addBtnTextSmall}>TAMBAH</Text>
                </TouchableOpacity>
              )}
            </View>
            {menimbangItems.map((item, idx) => (
              <View key={item.id} style={styles.dynamicItemRow}>
                <Text style={styles.itemIndexText}>{String.fromCharCode(97 + idx)}.</Text>
                <TextInput
                  style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={item.text}
                  editable={!isPublished}
                  onChangeText={(text) => handleUpdateMenimbangItem(item.id, text)}
                  multiline
                />
                {!isPublished && (
                  <TouchableOpacity onPress={() => handleDeleteMenimbangItem(item.id)} style={styles.deleteItemBtn}>
                    <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* DASAR (Presisi Screenshot 2 with + TAMBAH) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>DASAR</Text>
              {!isPublished && (
                <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddDasarItem}>
                  <Ionicons name="add" size={14} color="#2563eb" />
                  <Text style={styles.addBtnTextSmall}>TAMBAH</Text>
                </TouchableOpacity>
              )}
            </View>
            {dasarItems.map((item, idx) => (
              <View key={item.id} style={styles.dynamicItemRow}>
                <Text style={styles.itemIndexText}>{idx + 1}.</Text>
                <TextInput
                  style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={item.text}
                  editable={!isPublished}
                  onChangeText={(text) => handleUpdateDasarItem(item.id, text)}
                  multiline
                />
                {!isPublished && (
                  <TouchableOpacity onPress={() => handleDeleteDasarItem(item.id)} style={styles.deleteItemBtn}>
                    <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* KEPADA (PERSONIL) (Presisi Screenshot 2) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>KEPADA (PERSONIL)</Text>
              {selectedEmployees.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{selectedEmployees.length}</Text>
                </View>
              )}
            </View>

            {!isPublished && (
              <View style={[styles.searchBox, { borderColor: colors.glassBorder }]}>
                <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textDark }]}
                  placeholder="Cari..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

            {!isPublished && searchQuery.trim().length > 0 && (
              <ScrollView style={[styles.dropdownResults, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]} nestedScrollEnabled>
                {searchResults.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={styles.searchResultRow}
                    onPress={() => toggleEmployee(emp)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultName, { color: colors.textDark }]}>{emp.name}</Text>
                      <Text style={styles.resultNip}>NIP. {emp.nip}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={{ gap: 8, marginTop: 8 }}>
              {selectedEmployees.map((emp, idx) => (
                <View key={emp.id} style={styles.personilChipCard}>
                  <View style={styles.personilBadgeNum}><Text style={styles.personilNumText}>{idx + 1}</Text></View>
                  <Text style={[styles.personilNameText, { color: colors.textDark }]} numberOfLines={1}>{emp.name}</Text>
                  {!isPublished && (
                    <TouchableOpacity onPress={() => toggleEmployee(emp)} style={{ marginLeft: "auto" }}>
                      <Ionicons name="close" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* DETAIL KEGIATAN (Presisi Screenshot 2 & 3) */}
          <Text style={styles.sectionTitleHeader}>DETAIL KEGIATAN</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.subLabel}>JENIS TUGAS</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { borderColor: colors.glassBorder }]}
              onPress={() => !isPublished && setDropdownModalType("jenisTugas")}
              disabled={isPublished}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropdownTriggerText, { color: colors.textDark }]}>
                {jenisTugas}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {jenisTugas.includes("Perjalanan Dinas") ? (
            <>
              <View style={styles.rowTwoInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.subLabel}>DARI ( KOTA / LOKASI ASAL ) *</Text>
                  <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={kotaAsal} onChangeText={setKotaAsal} editable={!isPublished} placeholder="Samarinda" />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.subLabel}>KE ( KOTA / KABUPATEN TUJUAN ) *</Text>
                  <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={kotaTujuan} onChangeText={setKotaTujuan} editable={!isPublished} placeholder="Balikpapan" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.subLabel}>DALAM RANGKA *</Text>
                <TextInput
                  style={[styles.multilineInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={namaKegiatanText}
                  onChangeText={setNamaKegiatanText}
                  editable={!isPublished}
                  placeholder="Kegiatan Inventarisasi BMN"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.subLabel}>DI ( TEMPAT SPESIFIK / OPSIONAL )</Text>
                <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={tempatSpesifik} onChangeText={setTempatSpesifik} editable={!isPublished} placeholder="Balikpapan" />
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.subLabel}>
                  {jenisTugas.includes("Melaksanakan Kegiatan")
                    ? "MELAKSANAKAN KEGIATAN ( 1 HARI ) *"
                    : "MENUGASKAN STAF *"}
                </Text>
                <TextInput
                  style={[styles.multilineInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={namaKegiatanText}
                  onChangeText={setNamaKegiatanText}
                  editable={!isPublished}
                  placeholder={
                    jenisTugas.includes("Melaksanakan Kegiatan")
                      ? "opname fisik (stok opname) barang persediaan"
                      : "verifikasi berkas administrasi persediaan"
                  }
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.rowTwoInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.subLabel}>PADA ( TEMPAT / UNIT / LOKASI )</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={tempatSpesifik}
                    onChangeText={setTempatSpesifik}
                    editable={!isPublished}
                    placeholder="Paser"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.subLabel}>DI ( KOTA / KABUPATEN ) *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={kotaTujuan}
                    onChangeText={setKotaTujuan}
                    editable={!isPublished}
                    placeholder="Balikpapan"
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.rowTwoInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.subLabel}>TANGGAL MULAI</Text>
              <TouchableOpacity style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]} onPress={() => !isPublished && setActiveDatePicker("mulai")} disabled={isPublished}>
                <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>{tanggalMulai}</Text>
                <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.subLabel}>TANGGAL SELESAI</Text>
              <TouchableOpacity style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]} onPress={() => !isPublished && setActiveDatePicker("selesai")} disabled={isPublished}>
                <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>{tanggalSelesai}</Text>
                <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* UNTUK (Presisi Screenshot 3 with + TAMBAH) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>UNTUK</Text>
              {!isPublished && (
                <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddUntukItem}>
                  <Ionicons name="add" size={14} color="#2563eb" />
                  <Text style={styles.addBtnTextSmall}>TAMBAH</Text>
                </TouchableOpacity>
              )}
            </View>
            {untukItems.map((item, idx) => (
              <View key={item.id} style={styles.dynamicItemRow}>
                <Text style={styles.itemIndexText}>{idx + 2}.</Text>
                <TextInput
                  style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={item.text}
                  editable={!isPublished}
                  onChangeText={(text) => handleUpdateUntukItem(item.id, text)}
                  multiline
                />
                {!isPublished && (
                  <TouchableOpacity onPress={() => handleDeleteUntukItem(item.id)} style={styles.deleteItemBtn}>
                    <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* TEMBUSAN (Presisi Screenshot 3 with +) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>TEMBUSAN</Text>
              {!isPublished && (
                <TouchableOpacity style={styles.addBtnIconOnly} onPress={handleAddTembusanItem}>
                  <Ionicons name="add" size={18} color="#2563eb" />
                </TouchableOpacity>
              )}
            </View>
            {tembusanItems.length === 0 ? (
              <Text style={styles.emptyTembusanText}>Belum ada tembusan.</Text>
            ) : (
              tembusanItems.map((item, idx) => (
                <View key={item.id} style={styles.dynamicItemRow}>
                  <Text style={styles.itemIndexText}>{idx + 1}.</Text>
                  <TextInput
                    style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={item.text}
                    editable={!isPublished}
                    onChangeText={(text) => handleUpdateTembusanItem(item.id, text)}
                  />
                  {!isPublished && (
                    <TouchableOpacity onPress={() => handleDeleteTembusanItem(item.id)} style={styles.deleteItemBtn}>
                      <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>

          {/* PENANDATANGAN (Presisi Screenshot 3) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PENANDATANGAN</Text>
            {!isPublished && (
              <View style={[styles.searchBox, { borderColor: colors.glassBorder, marginBottom: 8 }]}>
                <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput style={[styles.searchInput, { color: colors.textDark }]} placeholder="Cari pegawai penandatangan..." placeholderTextColor="#94a3b8" />
              </View>
            )}
            <View style={{ gap: 8 }}>
              <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={penandatanganName} onChangeText={setPenandatanganName} editable={!isPublished} />
              <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={penandatanganNip} onChangeText={setPenandatanganNip} editable={!isPublished} />
            </View>
          </View>

          {/* ACTION BUTTONS (Presisi Localhost Screenshots 1, 2, and 3) */}
          <View style={{ gap: 10, marginTop: 20, marginBottom: 20 }}>
            {/* 1. Simpan Draft / Simpan Nomor Surat */}
            {!isPublished ? (
              <TouchableOpacity
                style={styles.btnSimpanDraft}
                onPress={handleSaveDraftMobile}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={18} color="#334155" style={{ marginRight: 8 }} />
                <Text style={styles.btnSimpanDraftText}>
                  {isSubmitting ? "Memproses..." : "Simpan Draft"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnSimpanDraft, { borderColor: "#2563eb" }]}
                onPress={handleUpdateNomorSuratMobile}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name="key-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={[styles.btnSimpanDraftText, { color: "#2563eb" }]}>
                  {isSubmitting ? "Memproses..." : "Simpan Nomor Surat"}
                </Text>
              </TouchableOpacity>
            )}

            {/* 2. Main Middle Button (Ajukan Persetujuan / Perbarui & Ajukan / Sudah Disetujui / Sudah Diterbitkan) */}
            {isPublished ? (
              <View
                style={[
                  styles.btnTerbitkanCetak,
                  { backgroundColor: "#10b981", opacity: 0.95 },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={[styles.btnTerbitkanCetakText, { fontSize: 15, fontWeight: "700" }]}>
                  Sudah Diterbitkan
                </Text>
              </View>
            ) : ["approved", "completed"].includes(suratStatus.toLowerCase()) ? (
              <View
                style={[
                  styles.btnTerbitkanCetak,
                  { backgroundColor: "#10b981", opacity: 0.85 },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={[styles.btnTerbitkanCetakText, { fontSize: 15, fontWeight: "700" }]}>
                  Sudah Disetujui
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.btnTerbitkanCetak,
                  { backgroundColor: "#ea580c" },
                ]}
                onPress={handleSubmitSuratTugas}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={18}
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.btnTerbitkanCetakText}>
                  {isSubmitting
                    ? "Memproses..."
                    : suratStatus === "pending" || suratStatus === "proses"
                    ? "Perbarui & Ajukan"
                    : "Ajukan Persetujuan"}
                </Text>
              </TouchableOpacity>
            )}

            {/* 3. Cetak / Download */}
            <TouchableOpacity
              style={styles.btnPreviewCetakFull}
              onPress={() => setPreviewModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="print-outline" size={18} color="#334155" style={{ marginRight: 8 }} />
              <Text style={styles.btnPreviewCetakFullText}>Cetak / Download</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Render Modal Cetak / Download Surat Tugas (Presisi Web Localhost Screenshots 3 & 4) */}
      <Modal visible={previewModalVisible} animationType="slide" transparent>
        <View style={styles.previewModalContainer}>
          {/* Header Bar */}
          <View style={styles.previewModalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="print-outline" size={20} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.previewModalTitle}>Cetak / Download Surat Tugas</Text>
            </View>
            <TouchableOpacity onPress={() => setPreviewModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Printable Document Preview WebView (Presisi Web Localhost Screenshots 2, 3 & 4) */}
          <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
            <WebView
              originWhitelist={["*"]}
              source={{
                html: getSuratTugasHtmlContent(),
              }}
              style={{ flex: 1, backgroundColor: "#0f172a" }}
              scalesPageToFit={true}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={true}
            />
          </View>

          {/* Action Toolbar Bottom Bar (Simpan ke HP & Share PDF & Print) */}
          <View style={styles.previewToolbarBottom}>
            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: "#059669" }]}
              onPress={handleSavePDFToHP}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.toolbarActionText}>Simpan ke HP</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: "#2563eb" }]}
              onPress={handleSharePDF}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.toolbarActionText}>Bagikan PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: "#475569" }]}
              onPress={handleDirectPrint}
              activeOpacity={0.8}
            >
              <Ionicons name="print-outline" size={18} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.toolbarActionText}>Cetak</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Render Modal DatePicker */}
      {Boolean(activeDatePicker) && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setActiveDatePicker(null)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.datePickerCard}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity 
                  onPress={() => setCurrentPickerMonth(new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth() - 1, 1))} 
                  style={styles.monthNavBtn}
                >
                  <Ionicons name="chevron-back" size={20} color="#2563eb" />
                </TouchableOpacity>
                <Text style={styles.datePickerMonthTitle}>
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][currentPickerMonth.getMonth()]} {currentPickerMonth.getFullYear()}
                </Text>
                <TouchableOpacity 
                  onPress={() => setCurrentPickerMonth(new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth() + 1, 1))} 
                  style={styles.monthNavBtn}
                >
                  <Ionicons name="chevron-forward" size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={styles.weekDaysRow}>
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                  <Text key={d} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              {/* Grid of days */}
              <View style={styles.daysGrid}>
                {(() => {
                  const y = currentPickerMonth.getFullYear();
                  const m = currentPickerMonth.getMonth();
                  const totalDays = new Date(y, m + 1, 0).getDate();
                  const firstDay = new Date(y, m, 1).getDay();
                  const grid = [];
                  for (let i = 0; i < firstDay; i++) grid.push(null);
                  for (let d = 1; d <= totalDays; d++) grid.push(d);

                    return grid.map((day, idx) => {
                      if (day === null) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                      const formattedM = String(m + 1).padStart(2, "0");
                      const formattedD = String(day).padStart(2, "0");
                      const dateStr = `${y}-${formattedM}-${formattedD}`;
                      const isSelected = activeDatePicker === "mulai" ? tanggalMulai === dateStr : tanggalSelesai === dateStr;

                      return (
                        <TouchableOpacity
                          key={`day-${day}`}
                          style={styles.dayCell}
                          onPress={() => {
                            if (activeDatePicker === "mulai") {
                              setTanggalMulai(dateStr);
                              if (!tanggalSelesai || tanggalSelesai < dateStr) setTanggalSelesai(dateStr);
                            } else {
                              setTanggalSelesai(dateStr);
                            }
                            setActiveDatePicker(null);
                          }}
                        >
                          <View style={[styles.dayCellInner, isSelected && styles.dayCellSelected]}>
                            <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                              {day}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    });
                })()}
              </View>

              {/* Quick Actions Footer */}
              <View style={styles.datePickerFooter}>
                <TouchableOpacity 
                  style={styles.quickDateBtn}
                  onPress={() => {
                    const today = new Date().toISOString().substring(0, 10);
                    if (activeDatePicker === "mulai") setTanggalMulai(today);
                    else setTanggalSelesai(today);
                    setActiveDatePicker(null);
                  }}
                >
                  <Text style={styles.quickDateText}>Hari Ini</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickDateBtn, { backgroundColor: "#2563eb" }]}
                  onPress={() => setActiveDatePicker(null)}
                >
                  <Text style={[styles.quickDateText, { color: "#ffffff" }]}>Tutup</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Render Dropdown Select Modal */}
      {Boolean(dropdownModalType) && (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDropdownModalType(null)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.dropdownModalCard}>
              <View style={styles.dropdownModalHeader}>
                <Text style={styles.dropdownModalTitle}>
                  {dropdownModalType === "jenisTugas" ? "Pilih Jenis Tugas" : "Pilih Sumber Dana"}
                </Text>
                <TouchableOpacity onPress={() => setDropdownModalType(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {(dropdownModalType === "templateST"
                  ? [
                      { id: "DEFAULT (MANUAL)", label: "DEFAULT (MANUAL)" },
                      { id: "BEDA HARI PATROLI", label: "BEDA HARI PATROLI" },
                      { id: "PATROLI FOLU NET SINK", label: "PATROLI FOLU NET SINK" },
                      { id: "PENDAMPINGAN FOLU NET SINK", label: "PENDAMPINGAN FOLU NET SINK" },
                    ]
                  : dropdownModalType === "jenisTugas"
                  ? [
                      { id: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )", label: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" },
                      { id: "Melaksanakan Kegiatan ( 1 Hari )", label: "Melaksanakan Kegiatan ( 1 Hari )" },
                      { id: "Menugaskan Staf", label: "Menugaskan Staf" },
                    ]
                  : [
                      { id: "dipa", label: "DIPA Balai KSDA Kalimantan Timur" },
                      { id: "dipa_lain", label: "DIPA Instansi Lain" },
                      { id: "swadaya", label: "Non-DIPA / Swadaya" },
                      { id: "dl1", label: "Tanpa Biaya / DL 1" },
                      { id: "kja", label: "Dana Kerjasama KJA" },
                      { id: "mja", label: "Dana Kerjasama MJA" },
                      { id: "cop", label: "Dana Kerjasama COP" },
                      { id: "tjiwi", label: "Dana Kerjasama PT. Tjiwi Kimia Tbk." },
                      { id: "bosf", label: "Dana Kerjasama BOSF" },
                      { id: "can", label: "Dana Kerjasama CAN" },
                      { id: "alert", label: "Dana Kerjasama ALeRT" },
                      { id: "folu", label: "Dana Kerjasama FOLU" },
                      { id: "other", label: "Lainnya" },
                    ]
                ).map((opt) => {
                  const isSelected =
                    (dropdownModalType === "templateST"
                      ? selectedTemplate
                      : dropdownModalType === "jenisTugas"
                      ? jenisTugas
                      : sumberDana) === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowSelected]}
                      onPress={() => {
                        if (dropdownModalType === "templateST") {
                          setSelectedTemplate(opt.id);
                        } else if (dropdownModalType === "jenisTugas") {
                          setJenisTugas(opt.id as any);
                        } else {
                          handleSumberDanaChange(opt.id);
                        }
                        setDropdownModalType(null);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2563eb" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Render Custom Notification Modal */}
      {notification.visible && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setNotification((prev) => ({ ...prev, visible: false }))}
          >
            <TouchableOpacity activeOpacity={1} style={styles.notifCard}>
              <View style={[styles.notifIconBox, { backgroundColor: notification.type === "error" ? "#fef2f2" : "#fffbe8" }]}>
                <Ionicons
                  name={
                    notification.type === "error"
                      ? "alert-circle"
                      : notification.type === "success"
                      ? "checkmark-circle"
                      : "warning"
                  }
                  size={34}
                  color={
                    notification.type === "error"
                      ? "#ef4444"
                      : notification.type === "success"
                      ? "#10b981"
                      : "#f59e0b"
                  }
                />
              </View>
              <Text style={styles.notifTitle}>{notification.title}</Text>
              <Text style={styles.notifMessage}>{notification.message}</Text>
              <TouchableOpacity
                style={[
                  styles.notifBtn,
                  {
                    backgroundColor:
                      notification.type === "error"
                        ? "#ef4444"
                        : notification.type === "success"
                        ? "#10b981"
                        : "#2563eb",
                  },
                ]}
                onPress={() => {
                  if (notification.onConfirm) {
                    notification.onConfirm();
                  } else {
                    setNotification((prev) => ({ ...prev, visible: false }));
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.notifBtnText}>Saya Mengerti</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Floating Action Button (FAB ☰ Menu) */}
      <FabMenu onNavigateToModule={handleSelectNavTab} activeSubmenu="buat-surat-tugas" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingRight: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  headerBadgeText: {
    color: "#2563eb",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepCircleActive: {
    backgroundColor: "#2563eb",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },
  stepNumberActive: {
    color: "#ffffff",
  },
  stepLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
  },
  stepLabelActive: {
    color: "#2563eb",
    fontWeight: "800",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  stepCard: {
    padding: 20,
    borderRadius: 22,
  },
  cardHeaderIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  cardSubTitle: {
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 18,
  },

  stBuilderHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.card,
    padding: 12,
    marginBottom: 16,
  },
  builderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  builderTitleText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  builderSubtitleText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 1,
  },
  templateCardContainer: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: RADIUS.input,
    padding: 12,
    marginBottom: 16,
  },
  templateBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  templateBadge: {
    backgroundColor: "#ea580c",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  templateBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  templateLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c2410c",
  },
  templateSelectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateSelectText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9a3412",
  },
  nomorSuratRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nomorSuratPrefix: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  nomorSuratPrefixText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  nomorSuratInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  nomorSuratFixed: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  nomorSuratFixedText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  addBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addBtnTextSmall: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
    marginLeft: 2,
  },
  addBtnIconOnly: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  dynamicItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  itemIndexText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 8,
    width: 16,
  },
  dynamicItemInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  deleteItemBtn: {
    padding: 8,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  personilChipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: RADIUS.input,
    padding: 8,
  },
  personilBadgeNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  personilNumText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  personilNameText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  emptyTembusanText: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
    marginVertical: 4,
  },
  sectionTitleHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1e293b",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 10,
  },
  btnSimpanDraft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingVertical: 12,
  },
  btnSimpanDraftText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  btnTerbitkanCetak: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: RADIUS.input,
    paddingVertical: 13,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnTerbitkanCetakText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  btnPreviewCetakFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingVertical: 12,
  },
  btnPreviewCetakFullText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  subLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  sectionLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyDottedBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: RADIUS.card,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  emptyDottedText: {
    color: "#94a3b8",
    fontSize: 11.5,
    fontWeight: "700",
  },
  selectedGrid: {
    gap: 8,
  },
  employeeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.input,
    padding: 8,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  chipName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
  },
  chipNip: {
    fontSize: 9.5,
    color: "#64748b",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  dropdownResults: {
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 4,
    maxHeight: 220,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchResultSelected: {
    backgroundColor: "#eff6ff",
  },
  resultName: {
    fontSize: 12,
    fontWeight: "800",
  },
  resultNip: {
    color: "#64748b",
    fontSize: 10,
  },

  addCustomNameRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#eff6ff",
    borderTopWidth: 1,
    borderTopColor: "#bfdbfe",
  },
  addCustomNameText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },

  inputGroup: {
    marginBottom: 14,
  },
  rowTwoInputs: {
    flexDirection: "row",
    gap: 10,
  },
  label: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: "#2563eb",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563eb",
  },
  radioText: {
    fontSize: 12.5,
    fontWeight: "600",
  },

  plhAlertCard: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.input,
    padding: 12,
    marginBottom: 14,
  },
  plhHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  plhAlertTitle: {
    color: "#1e3a8a",
    fontSize: 12,
    fontWeight: "800",
  },
  plhAlertSub: {
    color: "#3b82f6",
    fontSize: 10.5,
  },

  uploadDottedBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: RADIUS.card,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    marginBottom: 16,
  },
  uploadDottedTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    marginBottom: 2,
  },
  uploadDottedSub: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
  },

  summaryBox: {
    padding: 14,
    borderRadius: RADIUS.input,
    marginBottom: 16,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryLine: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 16,
  },

  nextStepBtn: {
    backgroundColor: "#2563eb",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 4,
  },
  nextStepText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  stepActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  prevStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  prevStepText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
  },

  submitFinalBtn: {
    backgroundColor: "#10b981",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitFinalText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },

  // DatePicker & Multiline Input Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  datePickerBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  datePickerCard: {
    width: "88%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    elevation: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
  },
  datePickerMonthTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  weekDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  weekDayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayCellInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellSelected: {
    backgroundColor: "#2563eb",
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  dayTextSelected: {
    color: "#ffffff",
    fontWeight: "900",
  },
  datePickerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  quickDateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },

  // Dropdown Select & Custom Notification Styles
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#ffffff",
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
  },
  dropdownModalCard: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    elevation: 25,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  dropdownModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
  },
  dropdownOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownOptionRowSelected: {
    backgroundColor: "#eff6ff",
  },
  dropdownOptionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginRight: 8,
  },
  dropdownOptionTextSelected: {
    color: "#2563eb",
    fontWeight: "800",
  },

  // Notification Modal Styles
  notifCard: {
    width: "84%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    elevation: 25,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  notifIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  notifMessage: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  notifBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  // Preview Cetak ST Button & Modal Styles
  previewCetakBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  previewCetakBtnText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "800",
  },

  previewModalContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  previewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  previewScroll: {
    flex: 1,
    backgroundColor: "#334155",
  },
  paperSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 20,
    minHeight: 680,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  paperKopHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  kopKemLabel: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
  },
  kopDirLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginVertical: 1,
  },
  kopBalaiLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginBottom: 2,
  },
  kopSubText: {
    fontSize: 8.5,
    color: "#475569",
    textAlign: "center",
    marginBottom: 8,
  },
  doubleBorderLine: {
    width: "100%",
    height: 3,
    backgroundColor: "#000000",
    marginTop: 2,
  },
  paperTitleBox: {
    alignItems: "center",
    marginVertical: 12,
  },
  paperMainTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
    textDecorationLine: "underline",
    letterSpacing: 1,
  },
  paperSubTitleNum: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  paperSection: {
    marginBottom: 12,
  },
  paperSectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 3,
  },
  paperBodyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 16,
    marginBottom: 3,
  },
  paperPerintahTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginVertical: 8,
    letterSpacing: 0.5,
  },
  paperEmpRow: {
    flexDirection: "row",
    marginBottom: 6,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  paperEmpNum: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    marginRight: 6,
  },
  paperEmpName: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0f172a",
  },
  paperEmpNip: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  paperEmpPos: {
    fontSize: 10,
    color: "#475569",
  },
  paperTtdBox: {
    alignSelf: "flex-end",
    width: 220,
    marginTop: 16,
    paddingTop: 8,
  },
  paperTtdLoc: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  paperTtdDate: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  paperTtdJabatan: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 4,
  },
  paperTtdName: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0f172a",
    textDecorationLine: "underline",
  },
  paperTtdNip: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  previewToolbarBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  toolbarActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  toolbarActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});
