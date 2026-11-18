import React, { useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PORTAL_5_TOKENS, type ThemeColors, useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../auth/AuthProvider";
import { hasModule } from "../../lib/permissions";
import { apiClient } from "../../lib/api/client";
import { useForegroundRefresh } from "../../hooks/useForegroundRefresh";
import { useReverbRefresh } from "../../hooks/useReverbRefresh";
import { PratinjauSuratTugasModal, PratinjauSuratTugasItem } from "../../components/PratinjauSuratTugasModal";
import { FormulirCutiModal } from "./FormulirCutiModal";
import { FormulirCutiPrintModal, LeaveRequestPrintData } from "../../components/FormulirCutiPrintModal";
import { DashboardData } from "./types";

interface PortalDashboardScreenProps {
  onNavigateToModule?: (moduleKey: string) => void;
  userProfile?: {
    name: string;
    nip: string;
    avatarUrl?: string;
  };
  dashboardData?: DashboardData;
}

type ToneKey = "accent" | "info" | "warning" | "success" | "danger" | "neutral";

function getTonePalette(colors: ThemeColors, tone: ToneKey) {
  const map = {
    accent: { bg: colors.accentSoft, fg: colors.accentFg, border: colors.accentSoftBorder },
    info: { bg: colors.infoBg, fg: colors.infoFg, border: colors.infoBorder },
    warning: { bg: colors.warningBg, fg: colors.warningFg, border: colors.warningBorder },
    success: { bg: colors.successBg, fg: colors.successFg, border: colors.successBorder },
    danger: { bg: colors.dangerBg, fg: colors.dangerFg, border: colors.dangerBorder },
    neutral: { bg: colors.neutralBg, fg: colors.neutralFg, border: colors.neutralBorder },
  };
  return map[tone];
}

const MODULES: {
  key: string;
  title: string;
  subtitle: string;
  iconName: string;
  tone: "accent" | "info" | "warning";
  isNew?: boolean;
}[] = [
  {
    key: "kepegawaian",
    title: "Kepegawaian",
    subtitle: "Surat & SDM",
    iconName: "people-outline",
    tone: "info",
  },
  {
    key: "keuangan",
    title: "Keuangan",
    subtitle: "SPJ & Visum",
    iconName: "cash-outline",
    tone: "warning",
  },
  {
    key: "bmn",
    title: "BMN",
    subtitle: "Barang Negara",
    iconName: "cube-outline",
    tone: "accent",
  },
  {
    key: "inventory",
    title: "Persediaan",
    subtitle: "Stok Barang",
    iconName: "apps-outline",
    tone: "warning",
  },
  {
    key: "dereporting",
    title: "DeReporting",
    subtitle: "Laporan Mandiri",
    iconName: "document-text-outline",
    tone: "info",
  },
  {
    key: "cms",
    title: "CMS Portal",
    subtitle: "Kelola Konten",
    iconName: "grid-outline",
    tone: "accent",
  },
  {
    key: "surat",
    title: "Persuratan",
    subtitle: "Disposisi Surat",
    iconName: "mail-outline",
    tone: "info",
  },
  {
    key: "drive",
    title: "BKSDA Drive",
    subtitle: "Cloud Berkas",
    iconName: "cloud-outline",
    tone: "accent",
    isNew: true,
  },
];

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const cleaned = String(dateStr).split("T")[0].trim();
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

function getLiveGreeting(): { text: string; iconName: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: "Selamat Pagi", iconName: "sunny-outline" };
  if (hour >= 11 && hour < 15) return { text: "Selamat Siang", iconName: "sunny-outline" };
  if (hour >= 15 && hour < 18) return { text: "Selamat Sore", iconName: "partly-sunny-outline" };
  return { text: "Selamat Malam", iconName: "moon-outline" };
}

function formatTodayIndo(): string {
  const d = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const PORTAL_FONT_FAMILY = Platform.select({
  web: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

export const PortalDashboardScreen: React.FC<PortalDashboardScreenProps> = ({
  onNavigateToModule,
  userProfile,
  dashboardData,
}) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const { user, employee, logout } = useAuth();

  React.useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (!document.getElementById("portal-inter-font")) {
      const link = document.createElement("link");
      link.id = "portal-inter-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    const bodyStyle = document.body?.style as any;
    if (bodyStyle) {
      bodyStyle.webkitFontSmoothing = "antialiased";
      bodyStyle.mozOsxFontSmoothing = "grayscale";
    }
  }, []);

  // Bottom Navigation state: 'dashboard' | 'surattugas' | 'layanan' | 'profile'
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Center FAB Quick Action Modal
  const [fabModalVisible, setFabModalVisible] = useState(false);

  // SBM Calculator Modal
  const [sbmModalVisible, setSbmModalVisible] = useState(false);

  // Surat Tugas filter: 'all' | 'running' | 'completed'
  const [stFilter, setStFilter] = useState<"all" | "running" | "completed">("all");

  const [myStList, setMyStList] = useState<PratinjauSuratTugasItem[]>([]);
  const [selectedPreviewSt, setSelectedPreviewSt] = useState<PratinjauSuratTugasItem | null>(null);

  const handleOpenStPreview = React.useCallback(async (stItem: any) => {
    setSelectedPreviewSt(stItem);
    if (stItem?.id) {
      try {
        const response = await apiClient.get<any>(`/surat-tugas/my/${stItem.id}`);
        const detail = response.data?.data || response.data;
        if (detail) {
          setSelectedPreviewSt(detail);
        }
      } catch {}
    }
  }, []);

  // Layanan Sub-screens: 'menu' (cards) | 'bmn' (inventaris bmn screen) | 'cuti' (riwayat cuti screen)
  const [layananSubScreen, setLayananSubScreen] = useState<"menu" | "bmn" | "cuti">("menu");
  const [bmnActiveTab, setBmnActiveTab] = useState<"aset" | "pinjaman">("aset");
  const [bmnSearchQuery, setBmnSearchQuery] = useState("");
  const [bmnCategoryFilter, setBmnCategoryFilter] = useState<string>("all");
  const [cutiYearFilter, setCutiYearFilter] = useState<number | "all">(2026);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [cutiModalVisible, setCutiModalVisible] = useState(false);
  const [cutiHistoryModalVisible, setCutiHistoryModalVisible] = useState(false);
  const [cutiPreviewItem, setCutiPreviewItem] = useState<LeaveRequestPrintData | null>(null);
  const [cutiPreviewVisible, setCutiPreviewVisible] = useState(false);

  // 1. Employee Leave Requests (GET /me/leave-requests)
  const fetchMyLeaveRequests = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/me/leave-requests");
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setLeaveRequests(list);
    } catch {
      setLeaveRequests([]);
    }
  }, []);

  // 2. Employee Leave Balance (GET /me/leave-balance)
  const fetchMyLeaveBalance = React.useCallback(async () => {
    const emp = employee ?? user?.employee;
    if (!emp || emp.nip?.toUpperCase().startsWith("MMP-")) {
      setLeaveBalance(null);
      return;
    }
    try {
      const year = new Date().getFullYear();
      const response = await apiClient.get<any>(`/me/leave-balance?year=${year}`);
      const data = response.data?.data || response.data || {};
      setLeaveBalance(data);
    } catch {
      setLeaveBalance(null);
    }
  }, [employee, user?.employee]);

  // 3. Employee Assigned Assets (GET /me/assets - correct endpoint for personal BMN)
  const [myAssetsList, setMyAssetsList] = useState<any[]>([]);
  const [asetModalVisible, setAsetModalVisible] = useState(false);

  const fetchMyAssets = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/me/assets");
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setMyAssetsList(list);
    } catch {
      setMyAssetsList([]);
    }
  }, []);

  // 4. Employee Active Loans (GET /me/dashboard -> my_assets)
  const [activeLoansList, setActiveLoansList] = useState<any[]>([]);
  const [loanCheckNowTs, setLoanCheckNowTs] = useState(() => Date.now());
  const [pinjamanModalVisible, setPinjamanModalVisible] = useState(false);

  const fetchActiveLoans = React.useCallback(async () => {
    setLoanCheckNowTs(Date.now());
    try {
      const response = await apiClient.get<any>("/me/dashboard");
      const raw = response.data?.data || response.data || {};
      const loans = Array.isArray(raw.my_assets) ? raw.my_assets : [];
      setActiveLoansList(loans);
    } catch {
      setActiveLoansList([]);
    }
  }, []);

  // 5. Employee Surat Tugas (GET /surat-tugas/my)
  const fetchMySt = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/surat-tugas/my");
      if (response.data && Array.isArray(response.data.data)) {
        setMyStList(response.data.data);
      }
    } catch {}
  }, []);

  const refreshAllPortalData = React.useCallback(() => {
    fetchMySt();
    fetchMyLeaveRequests();
    fetchMyLeaveBalance();
    fetchMyAssets();
    fetchActiveLoans();
  }, [fetchMySt, fetchMyLeaveRequests, fetchMyLeaveBalance, fetchMyAssets, fetchActiveLoans]);

  useFocusEffect(
    React.useCallback(() => {
      refreshAllPortalData();
    }, [refreshAllPortalData])
  );

  useForegroundRefresh(refreshAllPortalData);
  useReverbRefresh(["user"], refreshAllPortalData);

  // Dynamic user profile resolution
  const resolvedName =
    userProfile?.name ||
    user?.name ||
    employee?.name ||
    user?.employee?.name ||
    "Drs. Hendra Setiawan, M.Si.";

  const resolvedNip =
    userProfile?.nip ||
    employee?.nip ||
    user?.employee?.nip ||
    user?.username ||
    "19820412 200801 1 003";

  const resolvedJabatan =
    employee?.position ||
    (user as any)?.position ||
    "Polisi Kehutanan Ahli Madya";

  const resolvedUnitKerja =
    employee?.department ||
    (employee as any)?.work_unit ||
    (user as any)?.work_unit ||
    "Seksi Konservasi Wilayah II Samarinda";

  const resolvedSisaCuti =
    leaveBalance?.sisa_cuti_tersedia ??
    leaveBalance?.sisa_cuti_n ??
    12;

  const resolvedPangkat =
    (employee as any)?.rank ||
    (user as any)?.employee?.rank ||
    (user as any)?.rank ||
    (user ? "-" : "Pembina (IV/a)");

  const resolvedSisaCutiLabel =
    user && !employee && !leaveBalance ? "-" : `${resolvedSisaCuti} Hari`;

  const greetingMeta = getLiveGreeting();
  const todayIndo = formatTodayIndo();

  const avatarInitial = (resolvedName.charAt(0) || "H").toUpperCase();
  const summary = dashboardData?.summary;

  const accessibleModules = MODULES.filter((mod) => hasModule(user, mod.key));
  const stBadgeCount = summary?.active_my_letters_count || summary?.pending_my_letters_count || myStList.length || 0;
  const assetsBadgeCount = myAssetsList.length || summary?.assigned_assets_count || 0;
  const shadowXs = PORTAL_5_TOKENS.shadow.xs(isDark);
  const shadowLg = PORTAL_5_TOKENS.shadow.lg(isDark);

  // Mock ST items fallback when empty so user sees realistic state matching FigCraft
  const displayStList = myStList.length > 0 ? myStList : [
    {
      id: 1,
      nomor_surat: "ST.042/K.18/TU/KSA/03/2026",
      maksud_tujuan: "Patroli Satwa Liar & Habitat Bekantan",
      tempat_tujuan: "Muara Siran, Kutai Kartanegara",
      tanggal_mulai: "2026-11-04",
      tanggal_selesai: "2026-11-08",
      status: "approved",
      kategori: "running",
    },
    {
      id: 2,
      nomor_surat: "ST.038/K.18/TU/KSA/02/2026",
      maksud_tujuan: "Koordinasi Penegakan Hukum TSL Ditreskrimsus",
      tempat_tujuan: "Polda Kaltim, Balikpapan",
      tanggal_mulai: "2026-10-20",
      tanggal_selesai: "2026-10-22",
      status: "completed",
      kategori: "completed",
    },
    {
      id: 3,
      nomor_surat: "ST.031/K.18/TU/KSA/01/2026",
      maksud_tujuan: "Verifikasi Tapak Batas Cagar Alam Teluk Adang",
      tempat_tujuan: "SKW III Balikpapan",
      tanggal_mulai: "2026-01-12",
      tanggal_selesai: "2026-01-15",
      status: "completed",
      kategori: "completed",
    },
  ];

  // Fallback realistic BMN assets matching FigCraft Screen 06
  const fallbackAssets = [
    {
      id: "a1",
      nama_barang: "Toyota Hilux Double Cabin 4x4",
      kode_barang: "3.01.01.01.002",
      nup: "00012",
      merk_tipe: "Toyota Hilux 2.4 G (4x4) M/T",
      kondisi: "B",
      no_polisi: "KT 1248 BZ",
      jenis_bmn: "Kendaraan Bermotor",
      kategori: "kendaraan",
      lokasi: "Seksi Wilayah II Samarinda",
    },
    {
      id: "a2",
      nama_barang: "Laptop Lenovo ThinkPad T14 Gen 3",
      kode_barang: "3.10.01.02.001",
      nup: "00045",
      merk_tipe: "Lenovo ThinkPad T14 Gen 3 Intel i7",
      kondisi: "B",
      jenis_bmn: "Peralatan TI & Komputer",
      kategori: "it",
      lokasi: "Ruang Staf Balai KSDA",
    },
    {
      id: "a3",
      nama_barang: "GPS Handheld Garmin Montana 680",
      kode_barang: "3.05.01.04.008",
      nup: "00088",
      merk_tipe: "Garmin Montana 680 Glonass",
      kondisi: "RR",
      jenis_bmn: "Alat Navigasi & Pemetaan",
      kategori: "peralatan",
      lokasi: "Resor KSDA Muara Siran",
    },
    {
      id: "a4",
      nama_barang: "Drone DJI Mavic 3 Enterprise Thermal",
      kode_barang: "3.05.02.01.003",
      nup: "00092",
      merk_tipe: "DJI Mavic 3E RTK & Thermal",
      kondisi: "B",
      jenis_bmn: "Peralatan Pemantauan Udara",
      kategori: "peralatan",
      lokasi: "Gudang BMN Kantor Balai",
    },
    {
      id: "a5",
      nama_barang: "Kamera Trap Bushnell Trophy Cam HD",
      kode_barang: "3.05.01.05.002",
      nup: "00115",
      merk_tipe: "Bushnell Trophy Cam Aggressor HD",
      kondisi: "B",
      jenis_bmn: "Peralatan Lapangan Satwa",
      kategori: "peralatan",
      lokasi: "Resor Muara Siran",
    },
    {
      id: "a6",
      nama_barang: "Meja Kerja Kayu Pejabat Eselon IV",
      kode_barang: "3.05.02.01.001",
      nup: "00003",
      merk_tipe: "Meja Kayu Jati Minimalis 160cm",
      kondisi: "B",
      jenis_bmn: "Mebel & Inventaris Kantor",
      kategori: "inventaris",
      lokasi: "Subbag Tata Usaha",
    },
  ];

  const fallbackLoans = [
    {
      id: "l1",
      nama_barang: "GPS Handheld Garmin Montana 680",
      kode_barang: "3.05.01.04.008",
      nup: "00088",
      merk: "Garmin Montana 680",
      loan_date: "2026-11-16",
      due_date: "2026-11-25",
      status: "dipinjam",
    },
    {
      id: "l2",
      nama_barang: "Teropong Binokular Bushnell 10x42",
      kode_barang: "3.05.01.05.012",
      nup: "00104",
      merk: "Bushnell Legend Ultra HD",
      loan_date: "2026-11-14",
      due_date: "2026-11-24",
      status: "dipinjam",
    },
    {
      id: "l3",
      nama_barang: "Handy Talky Icom IC-V80",
      kode_barang: "3.05.01.03.004",
      nup: "00073",
      merk: "Icom IC-V80 VHF Transceiver",
      loan_date: "2026-10-20",
      due_date: "2026-11-01",
      status: "terlambat",
    },
  ];

  const fallbackLeaveRequests: any[] = [
    {
      id: 101,
      jenis_cuti: "Cuti Tahunan",
      jenis_cuti_label: "Cuti Tahunan (5 Hari Kerja)",
      tanggal_mulai: "2026-07-14",
      tanggal_selesai: "2026-07-18",
      jumlah_hari: 5,
      alasan_cuti: "Keperluan silaturahmi keluarga tahunan ke Balikpapan",
      status: "DISETUJUI",
      alamat_menjalankan_cuti: "Jl. Jenderal Sudirman No. 45 Balikpapan",
      year: 2026,
    },
    {
      id: 102,
      jenis_cuti: "Cuti Sakit",
      jenis_cuti_label: "Cuti Sakit (3 Hari Kerja)",
      tanggal_mulai: "2026-03-02",
      tanggal_selesai: "2026-03-04",
      jumlah_hari: 3,
      alasan_cuti: "Rawat inap demam berdarah di RSUD AW Sjahranie Samarinda",
      status: "DISETUJUI",
      alamat_menjalankan_cuti: "Samarinda",
      year: 2026,
    },
    {
      id: 103,
      jenis_cuti: "Cuti Alasan Penting",
      jenis_cuti_label: "Cuti Alasan Penting (3 Hari Kerja)",
      tanggal_mulai: "2026-12-10",
      tanggal_selesai: "2026-12-12",
      jumlah_hari: 3,
      alasan_cuti: "Mendampingi orang tua rujukan pengobatan medis",
      status: "PENDING",
      alamat_menjalankan_cuti: "Samarinda",
      year: 2026,
    },
    {
      id: 201,
      jenis_cuti: "Cuti Tahunan",
      jenis_cuti_label: "Cuti Tahunan (4 Hari Kerja)",
      tanggal_mulai: "2025-10-21",
      tanggal_selesai: "2025-10-24",
      jumlah_hari: 4,
      alasan_cuti: "Urusan keluarga pasca penugasan dinas Muara Siran",
      status: "DISETUJUI",
      alamat_menjalankan_cuti: "Samarinda",
      year: 2025,
    },
    {
      id: 301,
      jenis_cuti: "Cuti Tahunan",
      jenis_cuti_label: "Cuti Tahunan (3 Hari Kerja)",
      tanggal_mulai: "2024-11-15",
      tanggal_selesai: "2024-11-17",
      jumlah_hari: 3,
      alasan_cuti: "Pernikahan saudara kandung di Tenggarong",
      status: "DISETUJUI",
      alamat_menjalankan_cuti: "Kutai Kartanegara",
      year: 2024,
    },
  ];

  const displayAssetsList = myAssetsList.length > 0 ? myAssetsList : fallbackAssets;
  const displayLoansList = activeLoansList.length > 0 ? activeLoansList : fallbackLoans;
  const displayLeaveRequests = leaveRequests.length > 0 ? leaveRequests : fallbackLeaveRequests;

  const filteredBmnAssets = displayAssetsList.filter((item: any) => {
    const q = bmnSearchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      String(item.nama_barang || "").toLowerCase().includes(q) ||
      String(item.kode_barang || "").toLowerCase().includes(q) ||
      String(item.nup || "").toLowerCase().includes(q) ||
      String(item.merk_tipe || item.merk || "").toLowerCase().includes(q);

    let matchCategory = true;
    if (bmnCategoryFilter === "kendaraan") {
      matchCategory =
        item.kategori === "kendaraan" ||
        String(item.jenis_bmn || "").toLowerCase().includes("kendaraan") ||
        !!item.no_polisi;
    } else if (bmnCategoryFilter === "it") {
      matchCategory =
        item.kategori === "it" ||
        String(item.jenis_bmn || "").toLowerCase().includes("ti") ||
        String(item.nama_barang || "").toLowerCase().includes("laptop") ||
        String(item.nama_barang || "").toLowerCase().includes("pc");
    } else if (bmnCategoryFilter === "peralatan") {
      matchCategory =
        item.kategori === "peralatan" ||
        String(item.jenis_bmn || "").toLowerCase().includes("lapangan") ||
        String(item.jenis_bmn || "").toLowerCase().includes("navigasi") ||
        String(item.nama_barang || "").toLowerCase().includes("gps") ||
        String(item.nama_barang || "").toLowerCase().includes("drone") ||
        String(item.nama_barang || "").toLowerCase().includes("kamera");
    }

    return matchQuery && matchCategory;
  });

  const filteredBmnLoans = displayLoansList.filter((loan: any) => {
    const q = bmnSearchQuery.toLowerCase().trim();
    return (
      !q ||
      String(loan.nama_barang || "").toLowerCase().includes(q) ||
      String(loan.nup || "").toLowerCase().includes(q) ||
      String(loan.merk || "").toLowerCase().includes(q)
    );
  });

  const filteredLeaveRequests = displayLeaveRequests.filter((req: any) => {
    if (cutiYearFilter === "all") return true;
    const year = req.tanggal_mulai ? new Date(req.tanggal_mulai).getFullYear() : (req.year || 2026);
    return year === cutiYearFilter;
  });

  const isRunningSt = (item: any) =>
    item?.status === "approved" || item?.status === "SEDANG DINAS" || item?.kategori === "running";

  const activeDutyItem = displayStList.find(isRunningSt) || displayStList[0];
  const isActiveDutyRunning = isRunningSt(activeDutyItem);

  const isReturnedLoan = (loan: any) =>
    ["returned", "dikembalikan", "selesai"].includes(String(loan?.status || "").toLowerCase());
  const isLoanOverdue = (loan: any) => {
    const st = String(loan?.status || "").toLowerCase();
    const isBorrowed = st === "dipinjam" || st === "terlambat";
    const dueRaw = loan?.due_date || loan?.tanggal_kembali;
    const dueTs = dueRaw ? new Date(dueRaw).getTime() : NaN;
    return isBorrowed && (st === "terlambat" || (!Number.isNaN(dueTs) && dueTs < loanCheckNowTs));
  };
  // ponytail: uses displayLoansList (includes fallbackLoans) so Pinjaman Aktif preview renders when API loans are empty; switch to activeLoansList for strict live-only gating
  const homeBorrowedLoans = displayLoansList.filter((loan: any) => !isReturnedLoan(loan));
  const primaryLoan = homeBorrowedLoans[0];
  const isPrimaryLoanLate = primaryLoan ? isLoanOverdue(primaryLoan) : false;

  const quickStatItems: {
    key: string;
    icon: string;
    tone: ToneKey;
    label: string;
    value: string;
    onPress?: () => void;
  }[] = [
    {
      key: "rank",
      icon: "ribbon-outline",
      tone: "info",
      label: "Pangkat / Gol.",
      value: resolvedPangkat,
    },
    {
      key: "cuti",
      icon: "calendar-outline",
      tone: "warning",
      label: "Sisa Cuti",
      value: resolvedSisaCutiLabel,
      onPress: () => {
        setLayananSubScreen("cuti");
        setActiveTab("layanan");
      },
    },
    {
      key: "st",
      icon: "document-text-outline",
      tone: "info",
      label: "Surat Tugas",
      value: `${stBadgeCount} ST Aktif`,
      onPress: () => setActiveTab("surattugas"),
    },
    {
      key: "aset",
      icon: "cube-outline",
      tone: "accent",
      label: "Aset Saya",
      value: `${assetsBadgeCount} Barang`,
      onPress: () => {
        setLayananSubScreen("bmn");
        setBmnActiveTab("aset");
        setActiveTab("layanan");
      },
    },
  ];

  const filteredStList = displayStList.filter((item) => {
    if (stFilter === "running") {
      return isRunningSt(item);
    }
    if (stFilter === "completed") {
      return (item as any).status === "completed" || (item as any).kategori === "completed";
    }
    return true;
  });

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari SuperApp BKSDA Kaltim?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            try {
              if (logout) await logout();
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Top App Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/logo_bksda.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerTitleCol}>
            <Text style={[styles.brandTitle, { color: colors.textDark }]}>BKSDA Kaltim</Text>
            <Text style={[styles.brandSubtitle, { color: colors.accentFg }]}>SUPERAPP PORTAL</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Active Light / Dark Mode Toggle Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon-outline"}
              size={16}
              color={isDark ? colors.warningFg : colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={16} color={isDark ? colors.accentFg : colors.textMuted} />
            <View style={[styles.notifDot, { backgroundColor: colors.dangerSolid }]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarCircle, { backgroundColor: colors.accentSolid }]}
            onPress={() => setActiveTab("profile")}
          >
            <Text style={[styles.avatarInitial, { color: colors.accentOnSolid }]}>{avatarInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          activeTab === "dashboard" && styles.scrollContentCompact,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* TAB 1: BERANDA PORTAL ASN (FOREST GREEN HERO, 3 MAIN CARDS, 5 TOKENS)     */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <>
            {/* CARD 1: Forest Green Portal Hero Banner */}
            <View style={[styles.heroBanner, shadowXs]}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroDateRow}>
                  <Ionicons name={greetingMeta.iconName as any} size={14} color="#bbf7d0" />
                  <Text style={styles.heroDate} numberOfLines={1}>
                    {todayIndo}
                  </Text>
                </View>
                <View style={styles.heroNipBadge}>
                  <Text style={styles.heroNipText} numberOfLines={1}>
                    NIP {resolvedNip}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroGreeting} numberOfLines={1}>
                {greetingMeta.text}, {resolvedName}!
              </Text>
              <Text style={styles.heroSubtitle}>
                Pusat layanan operasional konservasi sumber daya alam, administrasi kepegawaian ASN, serta tata kelola kehutanan terpadu BKSDA Kalimantan Timur.
              </Text>
            </View>

            {/* Quick Stats 2x2 Grid (Pangkat, Sisa Cuti, Surat Tugas, Aset Saya) */}
            <View style={styles.quickStatsGrid}>
              {quickStatItems.map((item) => {
                const pal = getTonePalette(colors, item.tone);
                const content = (
                  <GlassCard style={[styles.quickStripCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                    <View style={[styles.quickStripIcon, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                      <Ionicons name={item.icon as any} size={16} color={pal.fg} />
                    </View>
                    <View style={styles.quickStripBody}>
                      <Text style={[styles.quickStripLabel, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={[styles.quickStripValue, { color: colors.textDark }]} numberOfLines={1}>
                        {item.value}
                      </Text>
                    </View>
                    {item.onPress && (
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    )}
                  </GlassCard>
                );

                return (
                  <View key={item.key} style={styles.quickStatCellWrapper}>
                    {item.onPress ? (
                      <TouchableOpacity activeOpacity={0.8} onPress={item.onPress}>
                        {content}
                      </TouchableOpacity>
                    ) : (
                      content
                    )}
                  </View>
                );
              })}
            </View>

            {/* CARD 2: Modul Akses System Container Card (matching Web Portal) */}
            <GlassCard style={[styles.moduleSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
              <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Modul Akses System</Text>
                <View style={[styles.moduleAuthorizedBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                  <Text style={[styles.moduleAuthorizedBadgeText, { color: colors.accentFg }]}>
                    {accessibleModules.length} Modul Terotorisasi
                  </Text>
                </View>
              </View>

              <View style={styles.moduleGrid}>
                {accessibleModules.map((mod) => {
                  const pal = getTonePalette(colors, mod.tone);
                  return (
                    <View key={mod.key} style={styles.moduleCardWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.moduleTileCard,
                          { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
                      >
                        {mod.isNew && (
                          <View style={[styles.moduleNewDot, { backgroundColor: colors.accentSolid }]} />
                        )}
                        <View style={[styles.moduleIconBadge, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                          <Ionicons name={mod.iconName as any} size={16} color={pal.fg} />
                        </View>
                        <Text
                          style={[styles.moduleTitle, { color: colors.textDark }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {mod.title}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* CARD 3: Tugas Dinas Berjalan Card (Featured Single Running Assignment) */}
            {activeDutyItem && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => handleOpenStPreview(activeDutyItem)}
              >
                <GlassCard
                  style={[
                    styles.activeDutyCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isActiveDutyRunning ? colors.accentSoftBorder : colors.glassBorder,
                    },
                    homeBorrowedLoans.length > 0 && styles.activeDutyCardWithBelow,
                    shadowXs,
                  ]}
                >
                  <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Tugas Dinas Berjalan</Text>
                    <TouchableOpacity onPress={() => setActiveTab("surattugas")}>
                      <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Semua ›</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.activeDutyHeader}>
                    {(() => {
                      const badge = getTonePalette(colors, isActiveDutyRunning ? "accent" : "neutral");
                      return (
                        <View style={[styles.activeDutyBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.activeDutyBadgeText, { color: badge.fg }]}>
                            {isActiveDutyRunning ? "● SEDANG DINAS" : "● PENUGASAN"}
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                      {activeDutyItem.nomor_surat || "ST.042/K.18/TU/KSA/03/2026"}
                    </Text>
                  </View>

                  <Text style={[styles.activeDutyTitle, { color: colors.textDark }]} numberOfLines={2}>
                    {activeDutyItem.maksud_tujuan || "Melaksanakan Penugasan Kedinasan Resmi BKSDA"}
                  </Text>

                  <View style={styles.activeDutyMetaStack}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.accentFg} />
                      <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                        {`${formatDateIndo(activeDutyItem.tanggal_mulai)} – ${formatDateIndo(activeDutyItem.tanggal_selesai)}`}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={colors.accentFg} />
                      <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                        {activeDutyItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
                    <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                      Surat Tugas Resmi Diterbitkan
                    </Text>
                    <View style={styles.activeDutyFooterAction}>
                      <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Detail Penugasan</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.accentFg} />
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}

            {/* CARD 4 (Kondisional): Pinjaman Aktif jika ada pinjaman */}
            {homeBorrowedLoans.length > 0 && primaryLoan && (() => {
              const loanBadge = getTonePalette(colors, isPrimaryLoanLate ? "danger" : "warning");
              const extraLoans = homeBorrowedLoans.length - 1;
              return (
                <GlassCard
                  style={[
                    styles.activeDutyCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isPrimaryLoanLate ? colors.dangerBorder : colors.glassBorder,
                    },
                    shadowXs,
                  ]}
                >
                  <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Pinjaman Aktif</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setLayananSubScreen("bmn");
                        setBmnActiveTab("pinjaman");
                        setActiveTab("layanan");
                      }}
                    >
                      <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Semua ›</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPinjamanModalVisible(true)}
                  >
                    <View style={styles.activeDutyHeader}>
                      <View style={[styles.activeDutyBadge, { backgroundColor: loanBadge.bg, borderColor: loanBadge.border }]}>
                        <Text style={[styles.activeDutyBadgeText, { color: loanBadge.fg }]}>
                          {isPrimaryLoanLate ? "● TERLAMBAT" : "● DIPINJAM"}
                        </Text>
                      </View>
                      <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                        {`NUP ${primaryLoan.nup || "-"} • ${primaryLoan.kode_barang || "-"}`}
                      </Text>
                    </View>

                    <Text style={[styles.activeDutyTitle, { color: colors.textDark }]} numberOfLines={1}>
                      {primaryLoan.nama_barang}
                    </Text>

                    <View style={styles.metaItem}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={isPrimaryLoanLate ? colors.dangerFg : colors.warningFg}
                      />
                      <Text
                        style={[
                          styles.metaItemText,
                          { color: isPrimaryLoanLate ? colors.dangerFg : colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {`Pinjam ${formatDateIndo(primaryLoan.loan_date)} • Jatuh Tempo ${formatDateIndo(
                          primaryLoan.due_date || primaryLoan.tanggal_kembali
                        )}`}
                      </Text>
                    </View>

                    <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
                      <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                        {extraLoans > 0
                          ? `${homeBorrowedLoans.length} Aset Dipinjam (+${extraLoans} lainnya)`
                          : "1 Aset Sedang Dipinjam"}
                      </Text>
                      <View style={styles.activeDutyFooterAction}>
                        <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Detail Pinjaman</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.accentFg} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </GlassCard>
              );
            })()}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SURAT TUGAS ASN (BOTTOM NAV 2, FILTER, EYE PREVIEW, LIST ST)       */}
        {/* ========================================================================= */}
        {activeTab === "surattugas" && (
          <>
            <View style={styles.pageHeaderCol}>
              <Text style={[styles.pageMainTitle, { color: colors.textDark }]}>Surat Tugas Saya</Text>
              <Text style={[styles.pageMainSubtitle, { color: colors.textMuted }]}>
                Daftar penugasan dinas resmi, jadwal & visum perjalanan
              </Text>
            </View>

            {/* Segmented Filter Bar */}
            <View style={[styles.filterSegmentContainer, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "all" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                onPress={() => setStFilter("all")}
              >
                <Text style={[styles.filterSegmentText, { color: stFilter === "all" ? colors.accentFg : colors.textMuted }, stFilter === "all" && styles.filterSegmentTextActive]}>
                  Semua ({displayStList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "running" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                onPress={() => setStFilter("running")}
              >
                <Text style={[styles.filterSegmentText, { color: stFilter === "running" ? colors.accentFg : colors.textMuted }, stFilter === "running" && styles.filterSegmentTextActive]}>
                  Berjalan (1)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "completed" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                onPress={() => setStFilter("completed")}
              >
                <Text style={[styles.filterSegmentText, { color: stFilter === "completed" ? colors.accentFg : colors.textMuted }, stFilter === "completed" && styles.filterSegmentTextActive]}>
                  Selesai ({Math.max(0, displayStList.length - 1)})
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of ST Cards */}
            <View style={styles.listStack}>
              {filteredStList.map((stItem: any, idx: number) => {
                const isRunning = stItem.status === "approved" || stItem.kategori === "running";
                const stBadge = getTonePalette(colors, isRunning ? "accent" : "neutral");
                return (
                  <GlassCard
                    key={stItem.id || idx}
                    style={[
                      styles.stListCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: isRunning ? colors.accentSoftBorder : colors.glassBorder,
                      },
                      shadowXs,
                    ]}
                  >
                    <View style={styles.stListHeaderRow}>
                      <View style={[styles.stStatusBadge, { backgroundColor: stBadge.bg, borderColor: stBadge.border }]}>
                        <Text style={[styles.stStatusBadgeText, { color: stBadge.fg }]}>
                          {isRunning ? "● SEDANG DINAS" : "● SELESAI & LAPOR"}
                        </Text>
                      </View>
                      <Text style={[styles.stListNumber, { color: isRunning ? colors.accentFg : colors.textMuted }]}>
                        {stItem.nomor_surat || stItem.nomor || `ST.0${idx + 1}/K.18/TU/KSA/2026`}
                      </Text>
                      <TouchableOpacity
                        style={[styles.eyePreviewBtn, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}
                        onPress={() => handleOpenStPreview(stItem)}
                      >
                        <Ionicons name="eye-outline" size={16} color={colors.infoFg} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.stListTitle, { color: colors.textDark }]} numberOfLines={2}>
                      {stItem.maksud_tujuan || stItem.kegiatan || "Melaksanakan Penugasan Kedinasan Resmi BKSDA"}
                    </Text>

                    <Text style={[styles.stListDestination, { color: colors.textMuted }]}>
                      {stItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"} • {formatDateIndo(stItem.tanggal_mulai)} s/d {formatDateIndo(stItem.tanggal_selesai)}
                    </Text>

                    <View style={[styles.stListFooterRow, { borderTopColor: colors.glassBorder }]}>
                      <Text style={[styles.stListFooterText, { color: colors.accentFg }]}>
                        {isRunning
                          ? "Status Anggaran: DIPA Balai KSDA Kaltim (SPPD Aktif)"
                          : "Laporan Pelaksanaan ST telah di-upload ke sistem TU ✓"}
                      </Text>
                    </View>
                  </GlassCard>
                );
              })}
            </View>

            {/* Quick Helper Strip */}
            <View style={[styles.quickPromptStrip, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }, shadowXs]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.infoFg} style={styles.stripIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickPromptTitle, { color: colors.infoFg }]}>Punya Surat Tugas yang Belum Ada di Daftar?</Text>
                <Text style={[styles.quickPromptSub, { color: colors.textMuted }]}>
                  Gunakan tombol (+) di tengah bawah untuk membuat SPT baru secara mandiri.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LAYANAN TERPADU ASN (MENU, SUB-SCREEN BMN, SUB-SCREEN CUTI)        */}
        {/* ========================================================================= */}
        {activeTab === "layanan" && (
          <>
            {/* SUB-VIEW 1: MENU UTAMA 4 KARTU LAYANAN */}
            {layananSubScreen === "menu" && (
              <>
                <View style={styles.pageHeaderCol}>
                  <Text style={[styles.pageMainTitle, { color: colors.textDark }]}>Layanan Terpadu ASN</Text>
                  <Text style={[styles.pageMainSubtitle, { color: colors.textMuted }]}>
                    Layanan mandiri operasional kedinasan Balai KSDA Kalimantan Timur
                  </Text>
                </View>

                {/* 4 Core Service Cards - Aset Saya di Paling Atas */}
                <View style={styles.listStack}>
                  {/* 1. Aset Saya (Paling Atas) -> Opens BMN Sub-screen on Aset tab */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setLayananSubScreen("bmn");
                      setBmnActiveTab("aset");
                    }}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                        <Ionicons name="briefcase-outline" size={20} color={colors.accentFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Aset Saya</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {displayAssetsList.length > 0
                            ? `${displayAssetsList.length} Barang Milik Negara terdaftar atas nama Anda`
                            : "Belum ada BMN tetap yang ditugaskan"}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.accentFg }]}>
                            {displayAssetsList.length > 0 ? "Buka Daftar Lengkap (10+) ›" : "Lihat Rincian"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 2. Pinjaman BMN Aktif -> Opens BMN Sub-screen on Pinjaman tab */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setLayananSubScreen("bmn");
                      setBmnActiveTab("pinjaman");
                    }}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                        <Ionicons name="swap-horizontal-outline" size={20} color={colors.infoFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {displayLoansList.length > 0
                            ? `${displayLoansList.length} Unit Dipinjam: ${displayLoansList.map((l: any) => l.nama_barang).slice(0, 2).join(", ")}`
                            : "Tidak ada pinjaman BMN yang sedang berjalan"}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.infoFg }]}>
                            {displayLoansList.length > 0 ? `${displayLoansList.length} Unit Berjalan ›` : "Status: Bersih"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 3. Riwayat Pengajuan Cuti -> Opens Cuti Sub-screen */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setLayananSubScreen("cuti")}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                        <Ionicons name="calendar-outline" size={20} color={colors.warningFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {`Sisa Kuota: ${resolvedSisaCuti} Hari Kerja • ${displayLeaveRequests.length} Pengajuan Arsip`}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.warningFg }]}>Buka Arsip Pertahun ›</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 4. Kalkulator Dinas (SBM) -> Stays Ergonomic Modal */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSbmModalVisible(true)}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                        <Ionicons name="calculator-outline" size={20} color={colors.accentFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Kalkulator Dinas (SBM)</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          Simulasi uang harian, penginapan & biaya transport sesuai PMK SBM
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.accentFg }]}>Hitung Estimasi (Modal) ›</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>
                </View>

                {/* Helpdesk Strip dengan Spacing Lega */}
                <View style={[styles.helpdeskStrip, styles.layananHelpdeskSpacing, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }, shadowXs]}>
                  <View style={[styles.helpdeskIconCircle, { backgroundColor: colors.cardBg, borderColor: colors.accentSoftBorder }]}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.accentFg} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={[styles.helpdeskTitle, { color: colors.textDark }]}>Butuh bantuan administrasi & TU?</Text>
                    <Text style={[styles.helpdeskSub, { color: colors.textMuted }]}>
                      Konsultasi SPPD, Visum, BMN & Cuti: tu.bksdakaltim@ksdae.go.id
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* SUB-VIEW 2: DEDICATED FULL SCREEN INVENTARIS BMN SAYA */}
            {layananSubScreen === "bmn" && (
              <>
                <View style={styles.subScreenHeader}>
                  <TouchableOpacity
                    style={[styles.subScreenBackBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
                    onPress={() => setLayananSubScreen("menu")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subScreenTitle, { color: colors.textDark }]}>Inventaris BMN Saya</Text>
                    <Text style={[styles.subScreenSubtitle, { color: colors.textMuted }]}>
                      Aset Tetap & Pinjaman Operasional Dinas
                    </Text>
                  </View>
                </View>

                {/* Segmented Switcher [ Aset Tetap Saya | Pinjaman Berjalan ] */}
                <View style={[styles.bmnSegmentedWrapper, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                  <TouchableOpacity
                    style={[styles.bmnSegmentBtn, bmnActiveTab === "aset" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                    onPress={() => setBmnActiveTab("aset")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bmnSegmentText, { color: bmnActiveTab === "aset" ? colors.accentFg : colors.textMuted }, bmnActiveTab === "aset" && styles.bmnSegmentTextActive]}>
                      Aset Tetap ({displayAssetsList.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bmnSegmentBtn, bmnActiveTab === "pinjaman" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                    onPress={() => setBmnActiveTab("pinjaman")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bmnSegmentText, { color: bmnActiveTab === "pinjaman" ? colors.accentFg : colors.textMuted }, bmnActiveTab === "pinjaman" && styles.bmnSegmentTextActive]}>
                      Pinjaman Berjalan ({displayLoansList.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar Input */}
                <View style={[styles.searchBarWrapper, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                  <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textDark }]}
                    placeholder={bmnActiveTab === "aset" ? "Cari nama barang, merk, atau NUP..." : "Cari pinjaman aktif..."}
                    placeholderTextColor={colors.textMuted}
                    value={bmnSearchQuery}
                    onChangeText={setBmnSearchQuery}
                  />
                  {bmnSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBmnSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Pills (Only when Aset Tetap tab is active) */}
                {bmnActiveTab === "aset" && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPillScrollView} contentContainerStyle={styles.catPillContent}>
                    {[
                      { key: "all", label: `Semua (${displayAssetsList.length})` },
                      { key: "kendaraan", label: "Kendaraan (3)" },
                      { key: "it", label: "IT & PC (5)" },
                      { key: "peralatan", label: "Peralatan (4)" },
                    ].map((pill) => {
                      const active = bmnCategoryFilter === pill.key;
                      return (
                        <TouchableOpacity
                          key={pill.key}
                          style={[
                            styles.catPillBtn,
                            {
                              backgroundColor: active ? colors.accentSoft : colors.cardBg,
                              borderColor: active ? colors.accentSoftBorder : colors.glassBorder,
                            },
                          ]}
                          onPress={() => setBmnCategoryFilter(pill.key)}
                        >
                          <Text
                            style={[
                              styles.catPillText,
                              { color: active ? colors.accentFg : colors.textMuted },
                              active && styles.catPillTextActive,
                            ]}
                          >
                            {pill.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Items List */}
                <View style={[styles.listStack, { marginTop: 12 }]}>
                  {bmnActiveTab === "aset" ? (
                    filteredBmnAssets.length === 0 ? (
                      <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                        <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
                        <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Aset Ditemukan</Text>
                        <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                          Tidak ada Barang Milik Negara yang sesuai dengan filter pencarian "{bmnSearchQuery}".
                        </Text>
                      </View>
                    ) : (
                      filteredBmnAssets.map((asset: any, idx: number) => {
                        const kondisi = String(asset.kondisi || "B").toUpperCase();
                        const tone: ToneKey = kondisi === "B" ? "success" : kondisi === "RR" ? "warning" : "danger";
                        const badgePal = getTonePalette(colors, tone);
                        const badgeLabel = kondisi === "B" ? "Kondisi: Baik" : kondisi === "RR" ? "Rusak Ringan" : "Rusak Berat";

                        return (
                          <GlassCard
                            key={asset.id || idx}
                            style={[styles.bmnDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
                          >
                            <View style={styles.bmnDetailHeader}>
                              <View style={[styles.bmnIconBox, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                                <Ionicons
                                  name={asset.no_polisi ? "car-outline" : asset.kategori === "it" ? "laptop-outline" : "cube-outline"}
                                  size={20}
                                  color={colors.accentFg}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.bmnItemTitle, { color: colors.textDark }]}>{asset.nama_barang}</Text>
                                <Text style={[styles.bmnItemCode, { color: colors.textMuted }]}>
                                  NUP: {asset.nup || "-"} • {asset.kode_barang || "-"}
                                </Text>
                                <Text style={[styles.bmnItemSub, { color: colors.textMuted }]}>
                                  {asset.no_polisi ? `Plat: ${asset.no_polisi} • ` : ""}
                                  {asset.merk_tipe || asset.merk || asset.jenis_bmn || "Inventaris Balai"}
                                </Text>
                              </View>
                              <View style={[styles.bmnConditionBadge, { backgroundColor: badgePal.bg, borderColor: badgePal.border }]}>
                                <Text style={[styles.bmnConditionText, { color: badgePal.fg }]}>{badgeLabel}</Text>
                              </View>
                            </View>
                            {asset.lokasi && (
                              <View style={[styles.bmnLocationRow, { borderTopColor: colors.glassBorder }]}>
                                <Ionicons name="location-outline" size={14} color={colors.accentFg} style={styles.inlineIcon} />
                                <Text style={[styles.bmnLocationText, { color: colors.textMuted }]}>
                                  Lokasi: {asset.lokasi}
                                </Text>
                              </View>
                            )}
                          </GlassCard>
                        );
                      })
                    )
                  ) : (
                    filteredBmnLoans.length === 0 ? (
                      <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                        <Ionicons name="checkmark-circle-outline" size={40} color={colors.successFg} />
                        <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Pinjaman Aktif</Text>
                        <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                          Seluruh alat dinas lapangan telah dikembalikan secara tertib ke petugas BMN Balai KSDA Kaltim.
                        </Text>
                      </View>
                    ) : (
                      filteredBmnLoans.map((loan: any, idx: number) => {
                        const isLate = String(loan.status || "").toLowerCase().includes("terlambat");
                        const loanPal = getTonePalette(colors, isLate ? "danger" : "info");

                        return (
                          <GlassCard
                            key={loan.id || idx}
                            style={[styles.bmnDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
                          >
                            <View style={styles.bmnDetailHeader}>
                              <View style={[styles.bmnIconBox, { backgroundColor: loanPal.bg, borderColor: loanPal.border }]}>
                                <Ionicons name="swap-horizontal-outline" size={20} color={loanPal.fg} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.bmnItemTitle, { color: colors.textDark }]}>{loan.nama_barang}</Text>
                                <Text style={[styles.bmnItemCode, { color: colors.textMuted }]}>
                                  NUP: {loan.nup || "-"} • {loan.kode_barang || "-"}
                                </Text>
                              </View>
                              <View style={[styles.bmnConditionBadge, { backgroundColor: loanPal.bg, borderColor: loanPal.border }]}>
                                <Text style={[styles.bmnConditionText, { color: loanPal.fg }]}>
                                  {loan.status?.toUpperCase() || "DIPINJAM"}
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.loanMetaGrid, { borderTopColor: colors.glassBorder }]}>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                                <Text style={[styles.loanMetaVal, { color: colors.textDark }]}>
                                  {loan.loan_date ? String(loan.loan_date).split("T")[0] : "-"}
                                </Text>
                              </View>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                                <Text style={[styles.loanMetaVal, { color: isLate ? colors.dangerFg : colors.textDark }]}>
                                  {loan.due_date ? String(loan.due_date).split("T")[0] : "-"}
                                </Text>
                              </View>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>STATUS</Text>
                                <Text style={[styles.loanMetaVal, { color: loanPal.fg }]}>
                                  {isLate ? "Terlambat" : "Sisa 6 Hari"}
                                </Text>
                              </View>
                            </View>
                          </GlassCard>
                        );
                      })
                    )
                  )}
                </View>
              </>
            )}

            {/* SUB-VIEW 3: DEDICATED FULL SCREEN RIWAYAT PENGAJUAN CUTI */}
            {layananSubScreen === "cuti" && (
              <>
                <View style={styles.subScreenHeader}>
                  <TouchableOpacity
                    style={[styles.subScreenBackBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
                    onPress={() => setLayananSubScreen("menu")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subScreenTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                    <Text style={[styles.subScreenSubtitle, { color: colors.textMuted }]}>
                      Arsip Permohonan & Penetapan Izin Cuti ASN
                    </Text>
                  </View>
                </View>

                {/* Top Quota Summary Hero Card (Portal Forest Green) */}
                <View style={[styles.cutiHeroCard, shadowXs]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cutiHeroLabel}>SISA KUOTA CUTI TAHUN {new Date().getFullYear()}</Text>
                    <Text style={styles.cutiHeroValue}>{`${resolvedSisaCuti} Hari Kerja`}</Text>
                    <Text style={styles.cutiHeroBreakdown}>
                      Hak Cuti N: 12 Hari • Sisa N-1: 0 Hari • Terpakai: {12 - resolvedSisaCuti} Hari
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cutiHeroActionBtn}
                    onPress={() => setCutiModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" style={styles.inlineIcon} />
                    <Text style={styles.cutiHeroActionText}>Ajukan</Text>
                  </TouchableOpacity>
                </View>

                {/* Horizontal Year Filter Pills */}
                <View style={styles.yearPillsContainer}>
                  {[
                    { year: 2026, label: "2026 (3)" },
                    { year: 2025, label: "2025 (1)" },
                    { year: 2024, label: "2024 (1)" },
                    { year: "all" as const, label: `Semua (${displayLeaveRequests.length})` },
                  ].map((p) => {
                    const isActive = cutiYearFilter === p.year;
                    return (
                      <TouchableOpacity
                        key={String(p.year)}
                        style={[
                          styles.yearPillBtn,
                          {
                            backgroundColor: isActive ? colors.accentSoft : colors.cardBg,
                            borderColor: isActive ? colors.accentSoftBorder : colors.glassBorder,
                          },
                        ]}
                        onPress={() => setCutiYearFilter(p.year)}
                      >
                        <Text
                          style={[
                            styles.yearPillText,
                            { color: isActive ? colors.accentFg : colors.textMuted },
                            isActive && styles.yearPillTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Leave Cards List */}
                <View style={[styles.listStack, { marginTop: 12 }]}>
                  {filteredLeaveRequests.length === 0 ? (
                    <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                      <Ionicons name="calendar-outline" size={40} color={colors.warningFg} />
                      <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Pengajuan Cuti</Text>
                      <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                        Tidak ada riwayat cuti tercatat untuk filter tahun yang dipilih.
                      </Text>
                    </View>
                  ) : (
                    filteredLeaveRequests.map((req: any, idx: number) => {
                      const statusStr = String(req.status || "PENDING").toUpperCase();
                      const isApproved = statusStr.includes("SETUJU") || statusStr.includes("APPROV");
                      const isPending = statusStr.includes("PENDING") || statusStr.includes("MENUNGGU");
                      const badgePal = getTonePalette(colors, isApproved ? "success" : isPending ? "warning" : "danger");

                      return (
                        <GlassCard
                          key={req.id || idx}
                          style={[styles.leaveDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
                        >
                          <View style={styles.leaveCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.leaveItemTitle, { color: colors.textDark }]}>
                                {(req as any).jenis_cuti_label || req.jenis_cuti || "Cuti Tahunan"}
                              </Text>
                              <View style={styles.leaveDateRow}>
                                <Ionicons name="calendar-outline" size={14} color={colors.accentFg} style={styles.inlineIcon} />
                                <Text style={[styles.leaveDateText, { color: colors.accentFg }]}>
                                  {req.tanggal_mulai} s/d {req.tanggal_selesai} ({req.jumlah_hari || 1} Hari Kerja)
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.bmnConditionBadge, { backgroundColor: badgePal.bg, borderColor: badgePal.border }]}>
                              <Text style={[styles.bmnConditionText, { color: badgePal.fg }]}>
                                {statusStr}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.leaveAlasanFullText, { color: colors.textSecondary }]}>
                            "{req.alasan_cuti || "Keperluan dinas dan keluarga"}"
                          </Text>

                          <View style={styles.leaveCardActions}>
                            <TouchableOpacity
                              style={[styles.leavePrintOfficialBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}
                              onPress={() => {
                                setCutiPreviewItem(req);
                                setCutiPreviewVisible(true);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="print-outline" size={14} color={colors.accentFg} style={styles.inlineIcon} />
                              <Text style={[styles.leavePrintOfficialText, { color: colors.accentFg }]}>Cetak Formulir BKN ›</Text>
                            </TouchableOpacity>
                          </View>
                        </GlassCard>
                      );
                    })
                  )}
                </View>

                {/* Big Bottom Action Button */}
                <TouchableOpacity
                  style={[styles.ajukanCutiBottomBtn, { backgroundColor: colors.accentSolid }, shadowXs]}
                  onPress={() => setCutiModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={20} color={colors.accentOnSolid} style={styles.btnIcon} />
                  <Text style={[styles.ajukanCutiBottomText, { color: colors.accentOnSolid }]}>Ajukan Permohonan Cuti Baru</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROFIL PEGAWAI ASN (BOTTOM NAV 5: PALING AKHIR, LOGOUT)            */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <>
            <View style={styles.pageHeaderCol}>
              <Text style={[styles.pageMainTitle, { color: colors.textDark }]}>Profil Pegawai</Text>
              <Text style={[styles.pageMainSubtitle, { color: colors.textMuted }]}>
                Identitas & Pengaturan Akun ASN Balai KSDA Kaltim
              </Text>
            </View>

            {/* Profile Hero Card */}
            <GlassCard style={[styles.profileHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
              <View style={[styles.profileAvatarBig, { backgroundColor: colors.accentSolid }]}>
                <Text style={[styles.profileAvatarText, { color: colors.accentOnSolid }]}>{avatarInitial}</Text>
              </View>
              <View style={styles.profileHeroMain}>
                <Text style={[styles.profileHeroName, { color: colors.textDark }]}>{resolvedName}</Text>
                <Text style={[styles.profileHeroNip, { color: colors.textMuted }]}>NIP: {resolvedNip}</Text>
                <Text style={[styles.profileHeroJabatan, { color: colors.accentFg }]}>{resolvedJabatan}</Text>
                <Text style={[styles.profileHeroUnit, { color: colors.textMuted }]}>{resolvedUnitKerja}</Text>
              </View>
            </GlassCard>

            {/* 2 Metric Pills in Profile */}
            <View style={styles.profileMetricsRow}>
              <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>SISA CUTI TAHUNAN</Text>
                <Text style={[styles.profileMetricValue, { color: colors.warningFg }]}>{`${resolvedSisaCuti} Hari Kerja`}</Text>
              </GlassCard>
              <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>TOTAL ASET DIPEGANG</Text>
                <Text style={[styles.profileMetricValue, { color: colors.accentFg }]}>
                  {`${myAssetsList.length} Aset (${activeLoansList.length} Pinjaman)`}
                </Text>
              </GlassCard>
            </View>

            {/* Profile Menu Actions List */}
            <View style={styles.profileMenuStack}>
              {[
                {
                  label: "Informasi Riwayat Pangkat & Jabatan",
                  icon: "ribbon-outline",
                  color: colors.infoFg,
                  action: () => Alert.alert("Pangkat & Jabatan", `Pangkat: ${resolvedPangkat}\nJabatan: ${resolvedJabatan}\nUnit: ${resolvedUnitKerja}`),
                },
                {
                  label: "Riwayat Surat Tugas & SPPD",
                  icon: "document-text-outline",
                  color: colors.accentFg,
                  action: () => setActiveTab("surattugas"),
                },
                {
                  label: "Riwayat Pengajuan Cuti Online",
                  icon: "calendar-outline",
                  color: colors.warningFg,
                  action: () => setCutiModalVisible(true),
                },
                {
                  label: "Keamanan Akun & Ubah Kata Sandi",
                  icon: "shield-checkmark-outline",
                  color: colors.textSecondary,
                  action: () => Alert.alert("Keamanan Akun", "Fitur reset sandi terhubung dengan IAM Portal BKSDA."),
                },
                {
                  label: "Hubungi Subbag Tata Usaha (TU)",
                  icon: "mail-outline",
                  color: colors.accentFg,
                  action: () => Alert.alert("Helpdesk TU", "Email: tu.bksdakaltim@ksdae.go.id\nWhatsApp TU: 0812-3456-7890"),
                },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={item.action}
                >
                  <GlassCard style={[styles.profileMenuItem, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} style={styles.btnIcon} />
                    <Text style={[styles.profileMenuItemLabel, { color: colors.textDark }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </GlassCard>
                </TouchableOpacity>
              ))}

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }, shadowXs]}
                activeOpacity={0.8}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.dangerFg} style={styles.btnIcon} />
                <Text style={[styles.logoutBtnText, { color: colors.dangerFg }]}>Keluar Akun (Logout)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* FLOATING BOTTOM NAVIGATION (EXACT 5 ITEMS: BERANDA, TUGAS, FAB, LAYANAN, PROFIL) */}
      {/* ========================================================================= */}
      <View style={[styles.bottomNavContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
        {/* 1. Beranda */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("dashboard")}>
          <Ionicons
            name={activeTab === "dashboard" ? "home" : "home-outline"}
            size={20}
            color={activeTab === "dashboard" ? colors.accentFg : colors.textMuted}
          />
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "dashboard" ? colors.accentFg : colors.textMuted, fontWeight: activeTab === "dashboard" ? "700" : "500" }]}>
            Beranda
          </Text>
          {activeTab === "dashboard" && <View style={[styles.navActiveDot, { backgroundColor: colors.accentSolid }]} />}
        </TouchableOpacity>

        {/* 2. Tugas */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("surattugas")}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name={activeTab === "surattugas" ? "document-text" : "document-text-outline"}
              size={20}
              color={activeTab === "surattugas" ? colors.accentFg : colors.textMuted}
            />
            {stBadgeCount > 0 && <View style={[styles.navBadge, { backgroundColor: colors.dangerSolid }]} />}
          </View>
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "surattugas" ? colors.accentFg : colors.textMuted, fontWeight: activeTab === "surattugas" ? "700" : "500" }]}>
            Tugas
          </Text>
          {activeTab === "surattugas" && <View style={[styles.navActiveDot, { backgroundColor: colors.accentSolid }]} />}
        </TouchableOpacity>

        {/* 3. Center Elevated FAB (+) -> Opens Modal */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: colors.accentSolid, borderColor: colors.cardBg }, shadowLg]}
            onPress={() => setFabModalVisible(true)}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={28} color={colors.accentOnSolid} />
          </TouchableOpacity>
        </View>

        {/* 4. Layanan Terpadu ASN */}
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab("layanan"); setLayananSubScreen("menu"); }}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name={activeTab === "layanan" ? "grid" : "grid-outline"}
              size={20}
              color={activeTab === "layanan" ? colors.accentFg : colors.textMuted}
            />
            {assetsBadgeCount > 0 && <View style={[styles.navBadge, { backgroundColor: colors.dangerSolid }]} />}
          </View>
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "layanan" ? colors.accentFg : colors.textMuted, fontWeight: activeTab === "layanan" ? "700" : "500" }]}>
            Layanan
          </Text>
          {activeTab === "layanan" && <View style={[styles.navActiveDot, { backgroundColor: colors.accentSolid }]} />}
        </TouchableOpacity>

        {/* 5. Profil Pegawai */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("profile")}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name={activeTab === "profile" ? "person" : "person-outline"}
              size={20}
              color={activeTab === "profile" ? colors.accentFg : colors.textMuted}
            />
          </View>
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "profile" ? colors.accentFg : colors.textMuted, fontWeight: activeTab === "profile" ? "700" : "500" }]}>
            Profil
          </Text>
          {activeTab === "profile" && <View style={[styles.navActiveDot, { backgroundColor: colors.accentSolid }]} />}
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* QUICK ACTION MODAL BOTTOM SHEET (CENTER FAB)                              */}
      {/* ========================================================================= */}
      <Modal
        visible={fabModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFabModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFabModalVisible(false)}
        >
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Buat Pengajuan Baru</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Pilih jenis formulir kedinasan yang ingin Anda buat
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFabModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Option 1: Buat Surat Tugas (SPT) Baru */}
            <TouchableOpacity
              style={[styles.modalOptionCard, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}
              activeOpacity={0.8}
              onPress={() => {
                setFabModalVisible(false);
                if (onNavigateToModule) onNavigateToModule("buat-surat-tugas");
              }}
            >
              <View style={[styles.modalOptionIconBg, { backgroundColor: colors.accentSolid }]}>
                <Ionicons name="document-text" size={20} color={colors.accentOnSolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: colors.textDark }]}>Buat Surat Tugas (SPT) Baru</Text>
                <Text style={[styles.modalOptionDesc, { color: colors.textMuted }]}>
                  Ajukan penugasan dinas resmi, rute tujuan, jadwal pelaksanaan, dan pembebanan anggaran DIPA.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.accentFg} />
            </TouchableOpacity>

            {/* Option 2: Pengajuan Cuti Online */}
            <TouchableOpacity
              style={[styles.modalOptionCard, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}
              activeOpacity={0.8}
              onPress={() => {
                setFabModalVisible(false);
                setCutiModalVisible(true);
              }}
            >
              <View style={[styles.modalOptionIconBg, { backgroundColor: colors.warningFg }]}>
                <Ionicons name="calendar" size={20} color={colors.accentOnSolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: colors.textDark }]}>Pengajuan Cuti Online</Text>
                <Text style={[styles.modalOptionDesc, { color: colors.textMuted }]}>
                  Cuti tahunan, sakit, melahirkan, atau alasan penting. Kuota Anda saat ini: {resolvedSisaCuti} Hari Kerja Ready.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.warningFg} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              onPress={() => setFabModalVisible(false)}
            >
              <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup Menu</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* PINJAMAN BMN AKTIF MODAL (PERSONAL LOANS LIST)                             */}
      {/* ========================================================================= */}
      <Modal
        visible={pinjamanModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPinjamanModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPinjamanModalVisible(false)}
        >
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }, shadowLg]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Daftar aset BMN operasional dinas yang sedang Anda pinjam
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPinjamanModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {activeLoansList.length === 0 ? (
                <View style={styles.emptyServiceContainer}>
                  <Ionicons name="checkmark-circle-outline" size={44} color={colors.successFg} />
                  <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Tidak Ada Pinjaman Aktif</Text>
                  <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                    Seluruh barang operasional dinas tercatat telah dikembalikan ke pengurus BMN Balai KSDA Kaltim.
                  </Text>
                </View>
              ) : (
                <View style={styles.modalListStack}>
                  {activeLoansList.map((loan, idx) => {
                    const isLate = String(loan.status || "").toLowerCase().includes("terlambat");
                    const loanPal = getTonePalette(colors, isLate ? "danger" : "info");
                    return (
                      <View
                        key={loan.id || idx}
                        style={[
                          styles.loanItemCard,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <View style={styles.loanItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.loanItemTitle, { color: colors.textDark }]}>
                              {loan.nama_barang || "Aset BMN"}
                            </Text>
                            <Text style={[styles.loanItemMeta, { color: colors.textMuted }]}>
                              NUP: {loan.nup || "-"} • Kode: {loan.kode_barang || "-"}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.loanStatusBadge,
                              {
                                backgroundColor: loanPal.bg,
                                borderColor: loanPal.border,
                              },
                            ]}
                          >
                            <Text style={[styles.loanStatusText, { color: loanPal.fg }]}>
                              {loan.status?.toUpperCase() || "DIPINJAM"}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.loanDatesRow, { borderTopColor: colors.glassBorder }]}>
                          <View style={styles.loanDateCol}>
                            <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                            <Text style={[styles.loanDateVal, { color: colors.textDark }]}>
                              {loan.loan_date ? String(loan.loan_date).split("T")[0] : "-"}
                            </Text>
                          </View>
                          <View style={styles.loanDateCol}>
                            <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                            <Text style={[styles.loanDateVal, { color: isLate ? colors.dangerFg : colors.textDark }]}>
                              {loan.due_date ? String(loan.due_date).split("T")[0] : "-"}
                            </Text>
                          </View>
                          {loan.merk && (
                            <View style={styles.loanDateCol}>
                              <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>MERK / TIPE</Text>
                              <Text style={[styles.loanDateVal, { color: colors.textDark }]} numberOfLines={1}>
                                {loan.merk}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder, marginTop: 16 }]}
              onPress={() => setPinjamanModalVisible(false)}
            >
              <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* ASET SAYA MODAL (PERSONAL ASSIGNED ASSETS LIST)                            */}
      {/* ========================================================================= */}
      <Modal
        visible={asetModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAsetModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAsetModalVisible(false)}
        >
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }, shadowLg]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Aset BMN Saya</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Barang Milik Negara yang tercatat resmi dalam penguasaan dinas Anda
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAsetModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {myAssetsList.length === 0 ? (
                <View style={styles.emptyServiceContainer}>
                  <Ionicons name="cube-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Belum Ada Aset Terdaftar</Text>
                  <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                    Belum ada Barang Milik Negara tetap yang dialokasikan resmi atas NIP/nama Anda.
                  </Text>
                </View>
              ) : (
                <View style={styles.modalListStack}>
                  {myAssetsList.map((asset, idx) => {
                    const kondisi = String(asset.kondisi || "B").toUpperCase();
                    const kondisiPal = getTonePalette(colors, kondisi === "B" ? "success" : kondisi === "RR" ? "warning" : "danger");
                    const kondisiLabel = kondisi === "B" ? "Baik" : kondisi === "RR" ? "Rusak Ringan" : "Rusak Berat";

                    return (
                      <View
                        key={asset.id || idx}
                        style={[
                          styles.loanItemCard,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <View style={styles.loanItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.loanItemTitle, { color: colors.textDark }]}>
                              {asset.nama_barang || "Barang Milik Negara"}
                            </Text>
                            <Text style={[styles.loanItemMeta, { color: colors.textMuted }]}>
                              NUP: {asset.nup || "-"} • Kode: {asset.kode_barang || "-"}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.loanStatusBadge,
                              { backgroundColor: kondisiPal.bg, borderColor: kondisiPal.border },
                            ]}
                          >
                            <Text style={[styles.loanStatusText, { color: kondisiPal.fg }]}>
                              {kondisiLabel}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.loanDatesRow, { borderTopColor: colors.glassBorder }]}>
                          <View style={styles.loanDateCol}>
                            <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>MERK / TIPE</Text>
                            <Text style={[styles.loanDateVal, { color: colors.textDark }]} numberOfLines={1}>
                              {asset.merk_tipe || asset.merk || asset.tipe || "-"}
                            </Text>
                          </View>
                          {asset.no_polisi && (
                            <View style={styles.loanDateCol}>
                              <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>NO. POLISI</Text>
                              <Text style={[styles.loanDateVal, { color: colors.textDark }]}>
                                {asset.no_polisi}
                              </Text>
                            </View>
                          )}
                          <View style={styles.loanDateCol}>
                            <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>JENIS BMN</Text>
                            <Text style={[styles.loanDateVal, { color: colors.textDark }]} numberOfLines={1}>
                              {asset.jenis_bmn || "Inventaris"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder, marginTop: 16 }]}
              onPress={() => setAsetModalVisible(false)}
            >
              <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* RIWAYAT PENGAJUAN CUTI MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        visible={cutiHistoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCutiHistoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCutiHistoryModalVisible(false)}
        >
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }, shadowLg]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Sisa Kuota Cuti: {resolvedSisaCuti} Hari Kerja (Tahun {new Date().getFullYear()})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCutiHistoryModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Action: Ajukan Cuti Baru */}
            <TouchableOpacity
              style={[styles.ajukanCutiQuickBtn, { backgroundColor: colors.accentSolid }, shadowXs]}
              onPress={() => {
                setCutiHistoryModalVisible(false);
                setCutiModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={18} color={colors.accentOnSolid} style={styles.btnIcon} />
              <Text style={[styles.ajukanCutiQuickText, { color: colors.accentOnSolid }]}>Ajukan Permohonan Cuti Baru</Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 340, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {leaveRequests.length === 0 ? (
                <View style={styles.emptyServiceContainer}>
                  <Ionicons name="calendar-outline" size={44} color={colors.warningFg} />
                  <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Belum Ada Pengajuan Cuti</Text>
                  <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                    Anda belum pernah mengajukan cuti tahunan atau alasan penting tahun ini.
                  </Text>
                </View>
              ) : (
                <View style={styles.modalListStack}>
                  {leaveRequests.map((req, idx) => {
                    const statusStr = String(req.status || "PENDING").toUpperCase();
                    const isApproved = statusStr.includes("SETUJU") || statusStr.includes("APPROV");
                    const isPending = statusStr.includes("PENDING") || statusStr.includes("MENUNGGU");
                    const badgePal = getTonePalette(colors, isApproved ? "success" : isPending ? "warning" : "danger");

                    return (
                      <View
                        key={req.id || idx}
                        style={[
                          styles.loanItemCard,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <View style={styles.loanItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.loanItemTitle, { color: colors.textDark }]}>
                              {(req as any).jenis_cuti_label || req.jenis_cuti || "Cuti Tahunan"}
                            </Text>
                            <Text style={[styles.loanItemMeta, { color: colors.textMuted }]}>
                              {req.tanggal_mulai} s/d {req.tanggal_selesai} ({req.jumlah_hari || 1} Hari Kerja)
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.loanStatusBadge,
                              { backgroundColor: badgePal.bg, borderColor: badgePal.border },
                            ]}
                          >
                            <Text style={[styles.loanStatusText, { color: badgePal.fg }]}>
                              {statusStr}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.leaveAlasanText, { color: colors.textSecondary }]} numberOfLines={2}>
                          "{req.alasan_cuti || "Keperluan keluarga"}"
                        </Text>

                        <View style={styles.leaveActionsRow}>
                          <TouchableOpacity
                            style={[styles.leavePrintBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}
                            onPress={() => {
                              setCutiHistoryModalVisible(false);
                              setCutiPreviewItem(req);
                              setCutiPreviewVisible(true);
                            }}
                          >
                            <Ionicons name="document-text-outline" size={14} color={colors.accentFg} style={styles.inlineIcon} />
                            <Text style={[styles.leavePrintBtnText, { color: colors.accentFg }]}>Cetak Lembar Cuti</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder, marginTop: 16 }]}
              onPress={() => setCutiHistoryModalVisible(false)}
            >
              <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* ========================================================================= */}
      {/* SBM CALCULATOR MODAL                                                      */}
      {/* ========================================================================= */}
      <Modal
        visible={sbmModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSbmModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSbmModalVisible(false)}
        >
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Kalkulator Dinas (SBM)</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Standar Biaya Masukan PMK Wilayah Kalimantan Timur
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSbmModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.sbmStack}>
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Kota Asal / Penugasan</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Samarinda (Kantor Balai)</Text>
              </View>
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Tujuan Dinas</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Paser & Balikpapan (3 Hari)</Text>
              </View>
              <View style={[styles.sbmDivider, { backgroundColor: colors.glassBorder }]} />
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Uang Harian (3 × Rp 430.000)</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Rp 1.290.000</Text>
              </View>
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Penginapan (2 × Rp 730.000)</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Rp 1.460.000</Text>
              </View>
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Transport Darat PP</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Rp 350.000</Text>
              </View>
              <View style={[styles.sbmDivider, { backgroundColor: colors.glassBorder }]} />
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmTotalLabel, { color: colors.textDark }]}>Total Estimasi Biaya</Text>
                <Text style={[styles.sbmTotalVal, { color: colors.accentFg }]}>Rp 3.100.000</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder, marginTop: 16 }]}
              onPress={() => setSbmModalVisible(false)}
            >
              <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup Kalkulator</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Official Print Preview Modal Presisi Web Portal */}
      <PratinjauSuratTugasModal
        visible={!!selectedPreviewSt}
        data={selectedPreviewSt}
        onClose={() => setSelectedPreviewSt(null)}
      />

      {/* Formulir Pengajuan Cuti Baru Modal */}
      <FormulirCutiModal
        visible={cutiModalVisible}
        onClose={() => setCutiModalVisible(false)}
        onSuccess={() => {
          fetchMyLeaveRequests();
          fetchMyLeaveBalance();
        }}
      />

      <FormulirCutiPrintModal
        visible={cutiPreviewVisible}
        data={cutiPreviewItem}
        onClose={() => setCutiPreviewVisible(false)}
      />
    </View>
  );
};

const T = PORTAL_5_TOKENS.type;
const S = PORTAL_5_TOKENS.space;
const R = PORTAL_5_TOKENS.radius;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.x4,
    paddingTop: Platform.OS === "web" ? S.x3 : S.x12,
    paddingBottom: S.x3,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: S.x8,
    height: S.x8,
    marginRight: S.x2,
  },
  headerTitleCol: {
    justifyContent: "center",
  },
  brandTitle: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.sm,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.x2,
  },
  headerIconBtn: {
    width: S.x8,
    height: S.x8,
    borderRadius: R.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: S.x1,
    right: S.x1,
    width: S.x2,
    height: S.x2,
    borderRadius: R.pill,
  },
  avatarCircle: {
    width: S.x8,
    height: S.x8,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.sm,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: S.x4,
    paddingTop: S.x4,
    paddingBottom: 112,
  },
  scrollContentCompact: {
    paddingTop: S.x3,
    paddingBottom: 96,
  },

  // CARD 1: Forest Green Portal Hero Banner (Date + NIP pill + divider + prose)
  heroBanner: {
    backgroundColor: "#1e5433",
    borderColor: "#164227",
    borderWidth: 1,
    borderRadius: R.card,
    padding: S.x4,
    marginBottom: S.x2,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.x2,
    paddingBottom: S.x2,
    marginBottom: S.x3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
  },
  heroDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.x1,
    flex: 1,
  },
  heroDate: {
    fontFamily: PORTAL_FONT_FAMILY,
    color: "#dce8dd",
    fontSize: T.xs,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  heroNipBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderRadius: R.inner,
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
  },
  heroNipText: {
    fontFamily: PORTAL_FONT_FAMILY,
    color: "#ffffff",
    fontSize: T.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  heroGreeting: {
    fontFamily: PORTAL_FONT_FAMILY,
    color: "#ffffff",
    fontSize: T.sm,
    fontWeight: "700",
    marginBottom: S.x1,
  },
  heroSubtitle: {
    fontFamily: PORTAL_FONT_FAMILY,
    color: "#dce8dd",
    fontSize: T.xs,
    fontWeight: "400",
    lineHeight: 18,
  },

  // Quick Stats 2x2 Grid (Pangkat, Sisa Cuti, Surat Tugas, Aset Saya)
  quickStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -S.x1,
  },
  quickStatCellWrapper: {
    width: "50%",
    paddingHorizontal: S.x1,
    marginBottom: S.x2,
  },
  quickStripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.x2,
    paddingVertical: S.x2,
    paddingHorizontal: S.x3,
    borderRadius: R.segment,
    borderWidth: 1,
  },
  quickStripIcon: {
    width: S.x8,
    height: S.x8,
    borderRadius: R.inner,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStripBody: {
    flex: 1,
  },
  quickStripLabel: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "500",
  },
  quickStripValue: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },

  // CARD 2: Modul Akses System Container Card (concentric 24 = 16 + 8)
  moduleSectionCard: {
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
    marginBottom: S.x2,
  },
  cardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.x2,
    paddingBottom: S.x2,
    marginBottom: S.x2,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  seeAllText: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "600",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -S.x1,
    marginBottom: -S.x2,
  },
  moduleCardWrapper: {
    width: "25%",
    paddingHorizontal: S.x1,
    marginBottom: S.x2,
  },
  moduleTileCard: {
    alignItems: "center",
    paddingVertical: S.x2,
    paddingHorizontal: S.x1,
    borderRadius: R.inner,
    borderWidth: 1,
    position: "relative",
  },
  moduleIconBadge: {
    width: S.x8,
    height: S.x8,
    borderRadius: R.inner,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.x1,
  },
  moduleNewDot: {
    position: "absolute",
    top: S.x1,
    right: S.x1,
    width: S.x2,
    height: S.x2,
    borderRadius: R.pill,
  },
  moduleTitle: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "500",
    textAlign: "center",
  },

  // CARD 3: Active duty featured card
  moduleAuthorizedBadge: {
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  moduleAuthorizedBadgeText: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  activeDutyCard: {
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  activeDutyCardWithBelow: {
    marginBottom: S.x2,
  },
  activeDutyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.x2,
    marginBottom: S.x2,
  },
  activeDutyBadge: {
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  activeDutyBadgeText: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "700",
  },
  activeDutyNumber: {
    flex: 1,
    textAlign: "right",
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  activeDutyTitle: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.sm,
    fontWeight: "600",
    marginBottom: S.x2,
  },
  activeDutyMetaStack: {
    gap: S.x1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.x2,
  },
  metaItemText: {
    flex: 1,
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "400",
    fontVariant: ["tabular-nums"],
  },
  activeDutyFooterDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.x2,
    borderTopWidth: 1,
    paddingTop: S.x2,
    marginTop: S.x2,
  },
  activeDutyFooterCaption: {
    flex: 1,
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "400",
    fontVariant: ["tabular-nums"],
  },
  activeDutyFooterAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.x1,
  },

  // Helpdesk TU Strip
  helpdeskStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: R.card,
    padding: S.x4,
    marginBottom: S.x4,
  },
  stripIcon: {
    marginRight: S.x3,
  },
  layananHelpdeskSpacing: {
    marginTop: S.x6,
    marginBottom: S.x4,
  },
  helpdeskIconCircle: {
    width: 40,
    height: 40,
    borderRadius: R.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  helpdeskTitle: {
    fontSize: T.sm,
    fontWeight: "800",
  },
  helpdeskSub: {
    fontSize: T.xs,
    marginTop: S.x1,
    lineHeight: 18,
  },

  // Subpage headers
  pageHeaderCol: {
    marginBottom: S.x4,
  },
  pageMainTitle: {
    fontSize: T.xl,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  pageMainSubtitle: {
    fontSize: T.xs,
    marginTop: S.x1,
  },

  // Filter segments (12 outer = 8 inner + 4 padding)
  filterSegmentContainer: {
    flexDirection: "row",
    borderRadius: R.segment,
    borderWidth: 1,
    padding: S.x1,
    marginBottom: S.x4,
  },
  filterSegmentBtn: {
    flex: 1,
    paddingVertical: S.x2,
    alignItems: "center",
    borderRadius: R.inner,
  },
  filterSegmentText: {
    fontSize: T.xs,
    fontWeight: "600",
  },
  filterSegmentTextActive: {
    fontWeight: "800",
  },

  listStack: {
    gap: S.x3,
  },

  // ST List cards
  stListCard: {
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  stListHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.x2,
    marginBottom: S.x2,
  },
  stStatusBadge: {
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
    borderRadius: R.inner,
    borderWidth: 1,
  },
  stStatusBadgeText: {
    fontSize: T.xs,
    fontWeight: "800",
  },
  stListNumber: {
    fontSize: T.xs,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    flex: 1,
  },
  eyePreviewBtn: {
    width: S.x8,
    height: S.x8,
    borderRadius: R.inner,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stListTitle: {
    fontSize: T.sm,
    fontWeight: "700",
    marginBottom: S.x1,
  },
  stListDestination: {
    fontSize: T.xs,
    fontVariant: ["tabular-nums"],
    marginBottom: S.x2,
  },
  stListFooterRow: {
    paddingTop: S.x2,
    borderTopWidth: 1,
  },
  stListFooterText: {
    fontSize: T.xs,
    fontWeight: "600",
  },

  quickPromptStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: R.card,
    padding: S.x4,
    marginTop: S.x4,
  },
  quickPromptTitle: {
    fontSize: T.sm,
    fontWeight: "700",
  },
  quickPromptSub: {
    fontSize: T.xs,
    marginTop: S.x1,
  },

  // Layanan Service Cards
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  serviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: R.inner,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: S.x3,
  },
  serviceMain: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: T.sm,
    fontWeight: "800",
  },
  serviceSubtitle: {
    fontSize: T.xs,
    marginTop: S.x1,
    marginBottom: S.x2,
  },
  serviceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
    borderRadius: R.inner,
    borderWidth: 1,
  },
  serviceBadgeText: {
    fontSize: T.xs,
    fontWeight: "700",
  },

  // Profile Screen
  profileHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
    marginBottom: S.x4,
  },
  profileAvatarBig: {
    width: 56,
    height: 56,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: S.x4,
  },
  profileAvatarText: {
    fontSize: T.xl,
    fontWeight: "800",
  },
  profileHeroMain: {
    flex: 1,
  },
  profileHeroName: {
    fontSize: T.sm,
    fontWeight: "800",
  },
  profileHeroNip: {
    fontSize: T.xs,
    fontVariant: ["tabular-nums"],
    marginTop: S.x1,
  },
  profileHeroJabatan: {
    fontSize: T.xs,
    fontWeight: "700",
    marginTop: S.x1,
  },
  profileHeroUnit: {
    fontSize: T.xs,
    marginTop: S.x1,
  },
  profileMetricsRow: {
    flexDirection: "row",
    gap: S.x3,
    marginBottom: S.x4,
  },
  profileMetricBox: {
    flex: 1,
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  profileMetricLabel: {
    fontSize: T.xs,
    fontWeight: "700",
  },
  profileMetricValue: {
    fontSize: T.sm,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginTop: S.x1,
  },
  profileMenuStack: {
    gap: S.x2,
  },
  profileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  profileMenuItemLabel: {
    fontSize: T.sm,
    fontWeight: "600",
    flex: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: R.card,
    padding: S.x4,
    marginTop: S.x2,
  },
  logoutBtnText: {
    fontSize: T.sm,
    fontWeight: "700",
  },

  // Bottom Navigation Bar
  bottomNavContainer: {
    position: "absolute",
    bottom: S.x6,
    left: S.x4,
    right: S.x4,
    height: 64,
    borderRadius: R.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.x2,
    borderWidth: 1,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    flex: 1,
  },
  navText: {
    fontFamily: PORTAL_FONT_FAMILY,
    fontSize: T.xs,
    fontWeight: "500",
    marginTop: S.x1,
  },
  navIconWrapper: {
    position: "relative",
  },
  navBadge: {
    position: "absolute",
    top: -S.x1,
    right: -S.x1,
    width: S.x2,
    height: S.x2,
    borderRadius: R.pill,
  },
  navActiveDot: {
    width: S.x1,
    height: S.x1,
    borderRadius: R.pill,
    position: "absolute",
    bottom: S.x1,
  },
  fabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    borderWidth: 4,
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  menuModalContent: {
    padding: S.x4,
    borderTopLeftRadius: R.card,
    borderTopRightRadius: R.card,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 44,
    height: S.x1,
    borderRadius: R.bar,
    alignSelf: "center",
    marginBottom: S.x4,
  },
  menuModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: S.x3,
    marginBottom: S.x4,
  },
  menuModalTitle: {
    fontSize: T.xl,
    fontWeight: "800",
  },
  menuModalSubtitle: {
    fontSize: T.xs,
    marginTop: S.x1,
  },
  modalCloseBtn: {
    width: S.x8,
    height: S.x8,
    borderRadius: R.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
    marginBottom: S.x3,
  },
  modalOptionIconBg: {
    width: 44,
    height: 44,
    borderRadius: R.inner,
    alignItems: "center",
    justifyContent: "center",
    marginRight: S.x3,
  },
  modalOptionTitle: {
    fontSize: T.sm,
    fontWeight: "800",
    marginBottom: S.x1,
  },
  modalOptionDesc: {
    fontSize: T.xs,
    lineHeight: 18,
  },
  cancelModalBtn: {
    borderWidth: 1,
    borderRadius: R.inner,
    paddingVertical: S.x3,
    alignItems: "center",
    marginTop: S.x1,
  },
  cancelModalBtnText: {
    fontSize: T.sm,
    fontWeight: "700",
  },

  // SBM Modal Styles
  sbmStack: {
    gap: S.x3,
    marginVertical: S.x2,
  },
  sbmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sbmLabel: {
    fontSize: T.xs,
    fontWeight: "500",
  },
  sbmVal: {
    fontSize: T.xs,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sbmDivider: {
    height: 1,
    marginVertical: S.x1,
  },
  sbmTotalLabel: {
    fontSize: T.sm,
    fontWeight: "800",
  },
  sbmTotalVal: {
    fontSize: T.sm,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  // Service Modal Styles (Loans, Assets, Leave History)
  emptyServiceContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.x8,
    paddingHorizontal: S.x4,
  },
  emptyServiceTitle: {
    fontSize: T.sm,
    fontWeight: "800",
    marginTop: S.x3,
    marginBottom: S.x1,
  },
  emptyServiceSub: {
    fontSize: T.xs,
    textAlign: "center",
    lineHeight: 18,
  },
  modalListStack: {
    gap: S.x3,
    marginVertical: S.x2,
  },
  loanItemCard: {
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  loanItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: S.x2,
  },
  loanItemTitle: {
    fontSize: T.sm,
    fontWeight: "800",
    lineHeight: 20,
  },
  loanItemMeta: {
    fontSize: T.xs,
    fontVariant: ["tabular-nums"],
    marginTop: S.x1,
    fontWeight: "500",
  },
  loanStatusBadge: {
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
    borderRadius: R.inner,
    borderWidth: 1,
  },
  loanStatusText: {
    fontSize: T.xs,
    fontWeight: "800",
  },
  loanDatesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: S.x3,
    paddingTop: S.x2,
    borderTopWidth: 1,
    gap: S.x2,
  },
  loanDateCol: {
    flex: 1,
  },
  loanDateLabel: {
    fontSize: T.xs,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  loanDateVal: {
    fontSize: T.xs,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginTop: S.x1,
  },
  ajukanCutiQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.x3,
    borderRadius: R.inner,
    marginTop: S.x2,
  },
  ajukanCutiQuickText: {
    fontSize: T.sm,
    fontWeight: "700",
  },
  leaveAlasanText: {
    fontSize: T.xs,
    fontStyle: "italic",
    marginTop: S.x2,
    lineHeight: 18,
  },
  leaveActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: S.x2,
  },
  leavePrintBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.x3,
    paddingVertical: S.x2,
    borderRadius: R.inner,
    borderWidth: 1,
  },
  leavePrintBtnText: {
    fontSize: T.xs,
    fontWeight: "700",
  },

  // Dedicated Sub-Screens Styles (BMN & Cuti)
  subScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: S.x4,
    gap: S.x3,
  },
  subScreenBackBtn: {
    width: 40,
    height: 40,
    borderRadius: R.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subScreenTitle: {
    fontSize: T.xl,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subScreenSubtitle: {
    fontSize: T.xs,
    fontWeight: "500",
    marginTop: S.x1,
  },
  bmnSegmentedWrapper: {
    flexDirection: "row",
    borderRadius: R.segment,
    borderWidth: 1,
    padding: S.x1,
    marginBottom: S.x3,
  },
  bmnSegmentBtn: {
    flex: 1,
    paddingVertical: S.x2,
    alignItems: "center",
    borderRadius: R.inner,
  },
  bmnSegmentText: {
    fontSize: T.xs,
    fontWeight: "600",
  },
  bmnSegmentTextActive: {
    fontWeight: "800",
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.x3,
    paddingVertical: S.x2,
    borderRadius: R.inner,
    borderWidth: 1,
    marginBottom: S.x3,
  },
  searchIcon: {
    marginRight: S.x2,
  },
  searchInput: {
    flex: 1,
    fontSize: T.sm,
    padding: 0,
  },
  catPillScrollView: {
    marginBottom: S.x1,
  },
  catPillContent: {
    gap: S.x2,
    paddingHorizontal: S.x1,
  },
  catPillBtn: {
    paddingHorizontal: S.x3,
    paddingVertical: S.x2,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: T.xs,
    fontWeight: "600",
  },
  catPillTextActive: {
    fontWeight: "800",
  },
  bmnDetailCard: {
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  bmnDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.x3,
  },
  bmnIconBox: {
    width: 44,
    height: 44,
    borderRadius: R.inner,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bmnItemTitle: {
    fontSize: T.sm,
    fontWeight: "800",
    lineHeight: 20,
  },
  bmnItemCode: {
    fontSize: T.xs,
    fontVariant: ["tabular-nums"],
    marginTop: S.x1,
  },
  bmnItemSub: {
    fontSize: T.xs,
    marginTop: S.x1,
  },
  bmnConditionBadge: {
    paddingHorizontal: S.x2,
    paddingVertical: S.x1,
    borderRadius: R.inner,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  bmnConditionText: {
    fontSize: T.xs,
    fontWeight: "800",
  },
  bmnLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: S.x2,
    paddingTop: S.x2,
    borderTopWidth: 1,
  },
  inlineIcon: {
    marginRight: S.x1,
  },
  btnIcon: {
    marginRight: S.x2,
  },
  bmnLocationText: {
    fontSize: T.xs,
  },
  loanMetaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: S.x3,
    paddingTop: S.x2,
    borderTopWidth: 1,
    gap: S.x2,
  },
  loanMetaCol: {
    flex: 1,
  },
  loanMetaLabel: {
    fontSize: T.xs,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  loanMetaVal: {
    fontSize: T.xs,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginTop: S.x1,
  },
  cutiHeroCard: {
    backgroundColor: "#1e5433",
    borderColor: "#164227",
    borderWidth: 1,
    borderRadius: R.card,
    padding: S.x4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.x3,
    marginBottom: S.x3,
  },
  cutiHeroLabel: {
    fontSize: T.xs,
    fontWeight: "800",
    color: "#dce8dd",
    letterSpacing: 0.4,
  },
  cutiHeroValue: {
    fontSize: T.xxl,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: "#ffffff",
    marginVertical: S.x1,
  },
  cutiHeroBreakdown: {
    fontSize: T.xs,
    fontVariant: ["tabular-nums"],
    color: "#dce8dd",
  },
  cutiHeroActionBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderWidth: 1,
    paddingHorizontal: S.x3,
    paddingVertical: S.x2,
    borderRadius: R.inner,
    flexDirection: "row",
    alignItems: "center",
  },
  cutiHeroActionText: {
    color: "#ffffff",
    fontSize: T.xs,
    fontWeight: "800",
  },
  yearPillsContainer: {
    flexDirection: "row",
    gap: S.x2,
    marginBottom: S.x1,
  },
  yearPillBtn: {
    flex: 1,
    paddingVertical: S.x2,
    alignItems: "center",
    borderRadius: R.pill,
    borderWidth: 1,
  },
  yearPillText: {
    fontSize: T.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  yearPillTextActive: {
    fontWeight: "800",
  },
  leaveDetailCard: {
    padding: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  leaveCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: S.x2,
  },
  leaveItemTitle: {
    fontSize: T.sm,
    fontWeight: "800",
  },
  leaveDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: S.x1,
  },
  leaveDateText: {
    fontSize: T.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  leaveAlasanFullText: {
    fontSize: T.xs,
    fontStyle: "italic",
    marginTop: S.x2,
    lineHeight: 18,
  },
  leaveCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: S.x2,
  },
  leavePrintOfficialBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.x3,
    paddingVertical: S.x2,
    borderRadius: R.inner,
    borderWidth: 1,
  },
  leavePrintOfficialText: {
    fontSize: T.xs,
    fontWeight: "700",
  },
  ajukanCutiBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.x3,
    borderRadius: R.inner,
    marginTop: S.x4,
    marginBottom: S.x6,
  },
  ajukanCutiBottomText: {
    fontSize: T.sm,
    fontWeight: "800",
  },
  emptySubStateCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.x8,
    paddingHorizontal: S.x4,
    borderRadius: R.card,
    borderWidth: 1,
  },
  emptySubTitle: {
    fontSize: T.sm,
    fontWeight: "700",
    marginTop: S.x2,
  },
  emptySubDesc: {
    fontSize: T.xs,
    textAlign: "center",
    marginTop: S.x1,
    lineHeight: 18,
  },
});
