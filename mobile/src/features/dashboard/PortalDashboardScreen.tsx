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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../auth/AuthProvider";
import { hasModule } from "../../lib/permissions";
import { apiClient } from "../../lib/api/client";
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

const MODULES = [
  {
    key: "kepegawaian",
    title: "Kepegawaian",
    subtitle: "Surat & SDM",
    iconName: "people-outline",
    badgeBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
  {
    key: "keuangan",
    title: "Keuangan",
    subtitle: "SPJ & Visum",
    iconName: "cash-outline",
    badgeBg: "#FFFBEB",
    iconColor: "#D97706",
  },
  {
    key: "bmn",
    title: "BMN",
    subtitle: "Barang Negara",
    iconName: "cube-outline",
    badgeBg: "#ECFDF5",
    iconColor: "#059669",
  },
  {
    key: "inventory",
    title: "Persediaan",
    subtitle: "Stok Barang",
    iconName: "apps-outline",
    badgeBg: "#FFF7ED",
    iconColor: "#EA580C",
  },
  {
    key: "dereporting",
    title: "DeReporting",
    subtitle: "Laporan Mandiri",
    iconName: "document-text-outline",
    badgeBg: "#FAF5FF",
    iconColor: "#9333EA",
  },
  {
    key: "cms",
    title: "CMS Portal",
    subtitle: "Kelola Konten",
    iconName: "grid-outline",
    badgeBg: "#F0FDFA",
    iconColor: "#0D9488",
  },
  {
    key: "surat",
    title: "Persuratan",
    subtitle: "Disposisi Surat",
    iconName: "mail-outline",
    badgeBg: "#ECFEFF",
    iconColor: "#0891B2",
  },
  {
    key: "drive",
    title: "BKSDA Drive",
    subtitle: "Cloud Berkas",
    iconName: "cloud-outline",
    badgeBg: "#F0F9FF",
    iconColor: "#0284C7",
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

export const PortalDashboardScreen: React.FC<PortalDashboardScreenProps> = ({
  onNavigateToModule,
  userProfile,
  dashboardData,
}) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const { user, employee, logout } = useAuth();

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
    try {
      const response = await apiClient.get<any>("/me/leave-balance?year=2026");
      const data = response.data?.data || response.data || {};
      setLeaveBalance(data);
    } catch {
      setLeaveBalance(null);
    }
  }, []);

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
  const [pinjamanModalVisible, setPinjamanModalVisible] = useState(false);

  const fetchActiveLoans = React.useCallback(async () => {
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
      const interval = setInterval(() => {
        refreshAllPortalData();
      }, 15000);

      return () => clearInterval(interval);
    }, [refreshAllPortalData])
  );

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

  const avatarInitial = (resolvedName.charAt(0) || "H").toUpperCase();
  const summary = dashboardData?.summary;

  const accessibleModules = MODULES.filter((mod) => hasModule(user, mod.key));
  const stBadgeCount = summary?.active_my_letters_count || summary?.pending_my_letters_count || myStList.length || 0;
  const cutiBadgeCount = leaveRequests.length;
  const assetsBadgeCount = myAssetsList.length || summary?.assigned_assets_count || 0;
  const activeLoansCount = activeLoansList.length || summary?.active_loans_count || 0;

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
      loan_date: "2026-11-04",
      due_date: "2026-11-10",
      status: "dipinjam",
    },
    {
      id: "l2",
      nama_barang: "Teropong Binokular Bushnell 10x42",
      kode_barang: "3.05.01.05.012",
      nup: "00104",
      merk: "Bushnell Legend Ultra HD",
      loan_date: "2026-11-02",
      due_date: "2026-11-12",
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

  const filteredStList = displayStList.filter((item) => {
    if (stFilter === "running") {
      return (item as any).status === "approved" || (item as any).status === "SEDANG DINAS" || (item as any).kategori === "running";
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
            <Text style={[styles.brandSubtitle, { color: "#059669" }]}>SUPERAPP PORTAL</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Active Light / Dark Mode Toggle Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }]}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon-outline"}
              size={17}
              color={isDark ? "#f59e0b" : "#64748b"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={17} color={isDark ? "#a7f3d0" : "#64748b"} />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => setActiveTab("profile")}
          >
            <Text style={styles.avatarInitial}>{avatarInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* TAB 1: BERANDA PORTAL ASN (MODUL 3x2, GREETING, STATS, TUGAS BERJALAN)    */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <>
            {/* Soft Executive Greeting Banner */}
            <View style={styles.heroBanner}>
              <Text style={styles.heroDate}>Selasa, 28 Juli 2026</Text>
              <Text style={styles.heroGreeting}>Selamat Siang, {resolvedName}! ☀️</Text>
              <Text style={styles.heroSubtitle}>
                Portal Terpadu BKSDA Kalimantan Timur (NIP: {resolvedNip}).
              </Text>
            </View>

            {/* Quick Stats Cards */}
            <View style={styles.quickStatsRow}>
              <GlassCard style={[styles.quickStatCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                <View style={styles.quickStatHeader}>
                  <View style={[styles.quickStatIconBg, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                    <Ionicons name="ribbon-outline" size={14} color="#2563EB" />
                  </View>
                  <Text style={[styles.quickStatTitle, { color: colors.textMuted }]} numberOfLines={1}>
                    PANGKAT / GOLONGAN
                  </Text>
                </View>
                <Text style={[styles.quickStatValue, { color: colors.textDark }]} numberOfLines={1}>
                  {"Pembina (IV/a)"}
                </Text>
                <Text style={[styles.quickStatSubtitle, { color: colors.textMuted }]}>TMT: 01 April 2022</Text>
              </GlassCard>

              <GlassCard style={[styles.quickStatCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                <View style={styles.quickStatHeader}>
                  <View style={[styles.quickStatIconBg, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                    <Ionicons name="calendar-outline" size={14} color="#D97706" />
                  </View>
                  <Text style={[styles.quickStatTitle, { color: colors.textMuted }]} numberOfLines={1}>
                    SISA CUTI ({new Date().getFullYear()})
                  </Text>
                </View>
                <Text style={[styles.quickStatValue, { color: colors.textDark }]}>{`${resolvedSisaCuti} Hari Kerja`}</Text>
                <Text style={[styles.quickStatSubtitle, { color: "#D97706", fontWeight: "600" }]}>Cuti Tahunan Ready</Text>
              </GlassCard>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>MODUL AKSES SYSTEM</Text>
              <View style={styles.moduleAuthorizedBadge}>
                <Text style={styles.moduleAuthorizedBadgeText}>8 Modul Terotorisasi</Text>
              </View>
            </View>

            {/* Compact 3-Column Module Grid */}
            <View style={styles.moduleGrid}>
              {accessibleModules.map((mod: any) => (
                <TouchableOpacity
                  key={mod.key}
                  style={styles.moduleCardWrapper}
                  activeOpacity={0.8}
                  onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
                >
                  <GlassCard
                    style={[
                      styles.moduleCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: mod.key === "drive" ? "#BAE6FD" : colors.glassBorder,
                      },
                    ]}
                  >
                    {mod.isNew && (
                      <View style={styles.gridBaruBadge}>
                        <Text style={styles.gridBaruBadgeText}>BARU</Text>
                      </View>
                    )}
                    <View style={[styles.moduleIconBadge, { backgroundColor: mod.badgeBg }]}>
                      <Ionicons name={mod.iconName as any} size={16} color={mod.iconColor} />
                    </View>
                    <Text style={[styles.moduleTitle, { color: colors.textDark }]} numberOfLines={1}>
                      {mod.title}
                    </Text>
                    <Text style={[styles.moduleSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                      {mod.subtitle}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tugas Dinas Berjalan (Sedang Dinas) Card */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Tugas Dinas Berjalan</Text>
              <TouchableOpacity onPress={() => setActiveTab("surattugas")}>
                <Text style={styles.seeAllText}>Lihat Semua ›</Text>
              </TouchableOpacity>
            </View>

            <GlassCard style={[styles.activeDutyCard, { backgroundColor: colors.cardBg, borderColor: "#A7F3D0" }]}>
              <View style={styles.activeDutyHeader}>
                <View style={styles.activeDutyBadge}>
                  <Text style={styles.activeDutyBadgeText}>● SEDANG DINAS</Text>
                </View>
                <Text style={styles.activeDutyNumber}>ST.128/K.18/TU/KSA.05.06/B/07/2026</Text>
              </View>

              <Text style={[styles.activeDutyTitle, { color: colors.textDark }]}>
                Inventarisasi Aset BMN di Paser & Balikpapan
              </Text>

              <View style={styles.activeDutyMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color="#059669" />
                  <Text style={[styles.metaItemText, { color: colors.textMuted }]}>28 - 30 Juli 2026 (3 Hari)</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color="#059669" />
                  <Text style={[styles.metaItemText, { color: colors.textMuted }]}>SKW III Paser & Seksi I</Text>
                </View>
              </View>

              {/* SPD dan Visum di-hide sementara karena modul keuangan dikerjakan tim lain */}
            </GlassCard>

            {/* Layanan Terpadu & Helpdesk TU Strip */}
            <View style={styles.helpdeskStrip}>
              <Ionicons name="shield-checkmark" size={20} color="#15803D" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helpdeskTitle}>Layanan Terpadu & Helpdesk TU</Text>
                <Text style={styles.helpdeskSub}>Konsultasi SPPD, Visum & SK: tu.bksdakaltim@ksdae.go.id</Text>
              </View>
            </View>
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
            <View style={styles.filterSegmentContainer}>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "all" && styles.filterSegmentBtnActive]}
                onPress={() => setStFilter("all")}
              >
                <Text style={[styles.filterSegmentText, stFilter === "all" && styles.filterSegmentTextActive]}>
                  Semua ({displayStList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "running" && styles.filterSegmentBtnActive]}
                onPress={() => setStFilter("running")}
              >
                <Text style={[styles.filterSegmentText, stFilter === "running" && styles.filterSegmentTextActive]}>
                  Berjalan (1)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "completed" && styles.filterSegmentBtnActive]}
                onPress={() => setStFilter("completed")}
              >
                <Text style={[styles.filterSegmentText, stFilter === "completed" && styles.filterSegmentTextActive]}>
                  Selesai ({Math.max(0, displayStList.length - 1)})
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of ST Cards */}
            <View style={{ gap: 12 }}>
              {filteredStList.map((stItem: any, idx: number) => {
                const isRunning = stItem.status === "approved" || stItem.kategori === "running";
                return (
                  <GlassCard
                    key={stItem.id || idx}
                    style={[
                      styles.stListCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: isRunning ? "#A7F3D0" : colors.glassBorder,
                      },
                    ]}
                  >
                    <View style={styles.stListHeaderRow}>
                      <View style={[styles.stStatusBadge, isRunning ? styles.stStatusBadgeRunning : styles.stStatusBadgeCompleted]}>
                        <Text style={[styles.stStatusBadgeText, isRunning ? styles.stStatusBadgeTextRunning : styles.stStatusBadgeTextCompleted]}>
                          {isRunning ? "● SEDANG DINAS" : "● SELESAI & LAPOR"}
                        </Text>
                      </View>
                      <Text style={[styles.stListNumber, { color: isRunning ? "#059669" : colors.textMuted }]}>
                        {stItem.nomor_surat || stItem.nomor || `ST.0${idx + 1}/K.18/TU/KSA/2026`}
                      </Text>
                      <TouchableOpacity
                        style={styles.eyePreviewBtn}
                        onPress={() => handleOpenStPreview(stItem)}
                      >
                        <Ionicons name="eye-outline" size={17} color="#2563EB" />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.stListTitle, { color: colors.textDark }]} numberOfLines={2}>
                      {stItem.maksud_tujuan || stItem.kegiatan || "Melaksanakan Penugasan Kedinasan Resmi BKSDA"}
                    </Text>

                    <Text style={[styles.stListDestination, { color: colors.textMuted }]}>
                      {stItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"} • {formatDateIndo(stItem.tanggal_mulai)} s/d {formatDateIndo(stItem.tanggal_selesai)}
                    </Text>

                    <View style={styles.stListFooterRow}>
                      <Text style={[styles.stListFooterText, { color: isRunning ? "#047857" : "#059669" }]}>
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
            <View style={styles.quickPromptStrip}>
              <Ionicons name="information-circle-outline" size={20} color="#2563EB" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.quickPromptTitle}>Punya Surat Tugas yang Belum Ada di Daftar?</Text>
                <Text style={styles.quickPromptSub}>
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
                <View style={{ gap: 12 }}>
                  {/* 1. Aset Saya (Paling Atas) -> Opens BMN Sub-screen on Aset tab */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setLayananSubScreen("bmn");
                      setBmnActiveTab("aset");
                    }}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: "#ECFDF5" }]}>
                        <Ionicons name="briefcase-outline" size={22} color="#059669" />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Aset Saya</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {displayAssetsList.length > 0
                            ? `${displayAssetsList.length} Barang Milik Negara terdaftar atas nama Anda`
                            : "Belum ada BMN tetap yang ditugaskan"}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                          <Text style={[styles.serviceBadgeText, { color: "#047857" }]}>
                            {displayAssetsList.length > 0 ? "Buka Daftar Lengkap (10+) ›" : "Lihat Rincian"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: "#EFF6FF" }]}>
                        <Ionicons name="swap-horizontal-outline" size={22} color="#2563EB" />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {displayLoansList.length > 0
                            ? `${displayLoansList.length} Unit Dipinjam: ${displayLoansList.map((l: any) => l.nama_barang).slice(0, 2).join(", ")}`
                            : "Tidak ada pinjaman BMN yang sedang berjalan"}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                          <Text style={[styles.serviceBadgeText, { color: "#1D4ED8" }]}>
                            {displayLoansList.length > 0 ? `${displayLoansList.length} Unit Berjalan ›` : "Status: Bersih"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 3. Riwayat Pengajuan Cuti -> Opens Cuti Sub-screen */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setLayananSubScreen("cuti")}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: "#FFFBEB" }]}>
                        <Ionicons name="calendar-outline" size={22} color="#D97706" />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {`Sisa Kuota: ${resolvedSisaCuti} Hari Kerja • ${displayLeaveRequests.length} Pengajuan Arsip`}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                          <Text style={[styles.serviceBadgeText, { color: "#B45309" }]}>Buka Arsip Pertahun ›</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 4. Kalkulator Dinas (SBM) -> Stays Ergonomic Modal */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSbmModalVisible(true)}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: "#F0FDFA" }]}>
                        <Ionicons name="calculator-outline" size={22} color="#0D9488" />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Kalkulator Dinas (SBM)</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          Simulasi uang harian, penginapan & biaya transport sesuai PMK SBM
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: "#F0FDFA", borderColor: "#99F6E4" }]}>
                          <Text style={[styles.serviceBadgeText, { color: "#0F766E" }]}>Hitung Estimasi (Modal) ›</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </GlassCard>
                  </TouchableOpacity>
                </View>

                {/* Helpdesk Strip dengan Spacing Lega */}
                <View style={[styles.helpdeskStrip, styles.layananHelpdeskSpacing]}>
                  <View style={styles.helpdeskIconCircle}>
                    <Ionicons name="shield-checkmark" size={20} color="#15803D" />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={styles.helpdeskTitle}>Butuh bantuan administrasi & TU?</Text>
                    <Text style={styles.helpdeskSub}>
                      Hubungi Subbagian Tata Usaha Balai KSDA Kaltim untuk konsultasi SPPD, BMN & Cuti
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
                    style={styles.subScreenBackBtn}
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

                {/* Segmented Switcher [ Aset Tetap Saya (12) | Pinjaman Berjalan (3) ] */}
                <View style={styles.bmnSegmentedWrapper}>
                  <TouchableOpacity
                    style={[styles.bmnSegmentBtn, bmnActiveTab === "aset" && styles.bmnSegmentBtnActive]}
                    onPress={() => setBmnActiveTab("aset")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bmnSegmentText, bmnActiveTab === "aset" && styles.bmnSegmentTextActive]}>
                      Aset Tetap ({displayAssetsList.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bmnSegmentBtn, bmnActiveTab === "pinjaman" && styles.bmnSegmentBtnActive]}
                    onPress={() => setBmnActiveTab("pinjaman")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bmnSegmentText, bmnActiveTab === "pinjaman" && styles.bmnSegmentTextActive]}>
                      Pinjaman Berjalan ({displayLoansList.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar Input */}
                <View style={[styles.searchBarWrapper, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                  <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textDark }]}
                    placeholder={bmnActiveTab === "aset" ? "Cari nama barang, merk, atau NUP..." : "Cari pinjaman aktif..."}
                    placeholderTextColor="#94A3B8"
                    value={bmnSearchQuery}
                    onChangeText={setBmnSearchQuery}
                  />
                  {bmnSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBmnSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Pills (Only when Aset Tetap tab is active) */}
                {bmnActiveTab === "aset" && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPillScrollView} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                    {[
                      { key: "all", label: `Semua (${displayAssetsList.length})` },
                      { key: "kendaraan", label: "Kendaraan (3)" },
                      { key: "it", label: "IT & PC (5)" },
                      { key: "peralatan", label: "Peralatan (4)" },
                    ].map((pill) => (
                      <TouchableOpacity
                        key={pill.key}
                        style={[
                          styles.catPillBtn,
                          bmnCategoryFilter === pill.key && styles.catPillBtnActive,
                        ]}
                        onPress={() => setBmnCategoryFilter(pill.key)}
                      >
                        <Text
                          style={[
                            styles.catPillText,
                            bmnCategoryFilter === pill.key && styles.catPillTextActive,
                          ]}
                        >
                          {pill.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Items List */}
                <View style={{ gap: 10, marginTop: 12 }}>
                  {bmnActiveTab === "aset" ? (
                    filteredBmnAssets.length === 0 ? (
                      <View style={styles.emptySubStateCard}>
                        <Ionicons name="cube-outline" size={40} color="#94A3B8" />
                        <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Aset Ditemukan</Text>
                        <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                          Tidak ada Barang Milik Negara yang sesuai dengan filter pencarian "{bmnSearchQuery}".
                        </Text>
                      </View>
                    ) : (
                      filteredBmnAssets.map((asset: any, idx: number) => {
                        const kondisi = String(asset.kondisi || "B").toUpperCase();
                        const isGood = kondisi === "B";
                        const isLightDmg = kondisi === "RR";
                        const badgeColor = isGood ? "#059669" : isLightDmg ? "#D97706" : "#DC2626";
                        const badgeBg = isGood ? "#ECFDF5" : isLightDmg ? "#FFFBEB" : "#FEF2F2";
                        const badgeLabel = isGood ? "Kondisi: Baik" : isLightDmg ? "Rusak Ringan" : "Rusak Berat";

                        return (
                          <GlassCard
                            key={asset.id || idx}
                            style={[styles.bmnDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
                          >
                            <View style={styles.bmnDetailHeader}>
                              <View style={styles.bmnIconBox}>
                                <Ionicons
                                  name={asset.no_polisi ? "car-outline" : asset.kategori === "it" ? "laptop-outline" : "cube-outline"}
                                  size={22}
                                  color="#059669"
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
                              <View style={[styles.bmnConditionBadge, { backgroundColor: badgeBg, borderColor: badgeColor + "33" }]}>
                                <Text style={[styles.bmnConditionText, { color: badgeColor }]}>{badgeLabel}</Text>
                              </View>
                            </View>
                            {asset.lokasi && (
                              <View style={styles.bmnLocationRow}>
                                <Ionicons name="location-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
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
                      <View style={styles.emptySubStateCard}>
                        <Ionicons name="checkmark-circle-outline" size={40} color="#059669" />
                        <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Pinjaman Aktif</Text>
                        <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                          Seluruh alat dinas lapangan telah dikembalikan secara tertib ke petugas BMN Balai KSDA Kaltim.
                        </Text>
                      </View>
                    ) : (
                      filteredBmnLoans.map((loan: any, idx: number) => {
                        const isLate = String(loan.status || "").toLowerCase().includes("terlambat");
                        const statusColor = isLate ? "#DC2626" : "#2563EB";
                        const statusBg = isLate ? "#FEF2F2" : "#EFF6FF";

                        return (
                          <GlassCard
                            key={loan.id || idx}
                            style={[styles.bmnDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
                          >
                            <View style={styles.bmnDetailHeader}>
                              <View style={[styles.bmnIconBox, { backgroundColor: statusBg }]}>
                                <Ionicons name="swap-horizontal-outline" size={22} color={statusColor} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.bmnItemTitle, { color: colors.textDark }]}>{loan.nama_barang}</Text>
                                <Text style={[styles.bmnItemCode, { color: colors.textMuted }]}>
                                  NUP: {loan.nup || "-"} • {loan.kode_barang || "-"}
                                </Text>
                              </View>
                              <View style={[styles.bmnConditionBadge, { backgroundColor: statusBg, borderColor: statusColor + "33" }]}>
                                <Text style={[styles.bmnConditionText, { color: statusColor }]}>
                                  {loan.status?.toUpperCase() || "DIPINJAM"}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.loanMetaGrid}>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                                <Text style={[styles.loanMetaVal, { color: colors.textDark }]}>
                                  {loan.loan_date ? String(loan.loan_date).split("T")[0] : "-"}
                                </Text>
                              </View>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                                <Text style={[styles.loanMetaVal, { color: isLate ? "#DC2626" : colors.textDark }]}>
                                  {loan.due_date ? String(loan.due_date).split("T")[0] : "-"}
                                </Text>
                              </View>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>STATUS</Text>
                                <Text style={[styles.loanMetaVal, { color: statusColor }]}>
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
                    style={styles.subScreenBackBtn}
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

                {/* Top Quota Summary Hero Card (Soft Emerald) */}
                <View style={styles.cutiHeroCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cutiHeroLabel}>SISA KUOTA CUTI TAHUN 2026</Text>
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
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.cutiHeroActionText}>+ Ajukan Cuti</Text>
                  </TouchableOpacity>
                </View>

                {/* Horizontal Year Filter Pills */}
                <View style={styles.yearPillsContainer}>
                  {[
                    { year: 2026, label: "Tahun 2026 (3)" },
                    { year: 2025, label: "Tahun 2025 (1)" },
                    { year: 2024, label: "Tahun 2024 (1)" },
                    { year: "all" as const, label: `Semua (${displayLeaveRequests.length})` },
                  ].map((p) => {
                    const isActive = cutiYearFilter === p.year;
                    return (
                      <TouchableOpacity
                        key={String(p.year)}
                        style={[
                          styles.yearPillBtn,
                          isActive && styles.yearPillBtnActive,
                        ]}
                        onPress={() => setCutiYearFilter(p.year)}
                      >
                        <Text
                          style={[
                            styles.yearPillText,
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
                <View style={{ gap: 12, marginTop: 12 }}>
                  {filteredLeaveRequests.length === 0 ? (
                    <View style={styles.emptySubStateCard}>
                      <Ionicons name="calendar-outline" size={40} color="#D97706" />
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
                      const statusColor = isApproved ? "#059669" : isPending ? "#D97706" : "#DC2626";
                      const statusBg = isApproved ? "#ECFDF5" : isPending ? "#FFFBEB" : "#FEF2F2";

                      return (
                        <GlassCard
                          key={req.id || idx}
                          style={[styles.leaveDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
                        >
                          <View style={styles.leaveCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.leaveItemTitle, { color: colors.textDark }]}>
                                {(req as any).jenis_cuti_label || req.jenis_cuti || "Cuti Tahunan"}
                              </Text>
                              <View style={styles.leaveDateRow}>
                                <Ionicons name="calendar-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
                                <Text style={styles.leaveDateText}>
                                  {req.tanggal_mulai} s/d {req.tanggal_selesai} ({req.jumlah_hari || 1} Hari Kerja)
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.bmnConditionBadge, { backgroundColor: statusBg, borderColor: statusColor + "33" }]}>
                              <Text style={[styles.bmnConditionText, { color: statusColor }]}>
                                {statusStr}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.leaveAlasanFullText, { color: colors.textDark }]}>
                            "{req.alasan_cuti || "Keperluan dinas dan keluarga"}"
                          </Text>

                          <View style={styles.leaveCardActions}>
                            <TouchableOpacity
                              style={styles.leavePrintOfficialBtn}
                              onPress={() => {
                                setCutiPreviewItem(req);
                                setCutiPreviewVisible(true);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="print-outline" size={14} color="#059669" style={{ marginRight: 5 }} />
                              <Text style={styles.leavePrintOfficialText}>Cetak Formulir BKN ›</Text>
                            </TouchableOpacity>
                          </View>
                        </GlassCard>
                      );
                    })
                  )}
                </View>

                {/* Big Bottom Action Button */}
                <TouchableOpacity
                  style={styles.ajukanCutiBottomBtn}
                  onPress={() => setCutiModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.ajukanCutiBottomText}>+ Ajukan Permohonan Cuti Baru</Text>
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
            <GlassCard style={[styles.profileHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              <View style={styles.profileAvatarBig}>
                <Text style={styles.profileAvatarText}>{avatarInitial}</Text>
              </View>
              <View style={styles.profileHeroMain}>
                <Text style={[styles.profileHeroName, { color: colors.textDark }]}>{resolvedName}</Text>
                <Text style={[styles.profileHeroNip, { color: colors.textMuted }]}>NIP: {resolvedNip}</Text>
                <Text style={styles.profileHeroJabatan}>{resolvedJabatan}</Text>
                <Text style={[styles.profileHeroUnit, { color: colors.textMuted }]}>{resolvedUnitKerja}</Text>
              </View>
            </GlassCard>

            {/* 2 Metric Pills in Profile */}
            <View style={styles.profileMetricsRow}>
              <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                <Text style={styles.profileMetricLabel}>SISA CUTI TAHUNAN</Text>
                <Text style={[styles.profileMetricValue, { color: "#D97706" }]}>{`${resolvedSisaCuti} Hari Kerja`}</Text>
              </GlassCard>
              <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                <Text style={styles.profileMetricLabel}>TOTAL ASET DIPEGANG</Text>
                <Text style={[styles.profileMetricValue, { color: "#059669" }]}>
                  {`${myAssetsList.length} Aset (${activeLoansList.length} Pinjaman)`}
                </Text>
              </GlassCard>
            </View>

            {/* Profile Menu Actions List */}
            <View style={{ gap: 8, marginTop: 4 }}>
              {[
                {
                  label: "Informasi Riwayat Pangkat & Jabatan",
                  icon: "ribbon-outline",
                  color: "#2563EB",
                  action: () => Alert.alert("Pangkat & Jabatan", `Pangkat: Pembina (IV/a)\nJabatan: ${resolvedJabatan}\nUnit: ${resolvedUnitKerja}`),
                },
                {
                  label: "Riwayat Surat Tugas & SPPD",
                  icon: "document-text-outline",
                  color: "#059669",
                  action: () => setActiveTab("surattugas"),
                },
                {
                  label: "Riwayat Pengajuan Cuti Online",
                  icon: "calendar-outline",
                  color: "#D97706",
                  action: () => setCutiModalVisible(true),
                },
                {
                  label: "Keamanan Akun & Ubah Kata Sandi",
                  icon: "shield-checkmark-outline",
                  color: "#475569",
                  action: () => Alert.alert("Keamanan Akun", "Fitur reset sandi terhubung dengan IAM Portal BKSDA."),
                },
                {
                  label: "Hubungi Subbag Tata Usaha (TU)",
                  icon: "mail-outline",
                  color: "#0D9488",
                  action: () => Alert.alert("Helpdesk TU", "Email: tu.bksdakaltim@ksdae.go.id\nWhatsApp TU: 0812-3456-7890"),
                },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={item.action}
                >
                  <GlassCard style={[styles.profileMenuItem, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} style={{ marginRight: 12 }} />
                    <Text style={[styles.profileMenuItemLabel, { color: colors.textDark }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </GlassCard>
                </TouchableOpacity>
              ))}

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutBtn}
                activeOpacity={0.8}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.logoutBtnText}>Keluar Akun (Logout)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* FLOATING BOTTOM NAVIGATION (EXACT 5 ITEMS: BERANDA, ST, FAB, LAYANAN, PROFIL) */}
      {/* ========================================================================= */}
      <View style={[styles.bottomNavContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
        {/* 1. Beranda */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("dashboard")}>
          <Ionicons
            name={activeTab === "dashboard" ? "home" : "home-outline"}
            size={22}
            color={activeTab === "dashboard" ? "#059669" : colors.textMuted}
          />
          <Text style={[styles.navText, { color: activeTab === "dashboard" ? "#059669" : colors.textMuted, fontWeight: activeTab === "dashboard" ? "700" : "500" }]}>
            Beranda
          </Text>
          {activeTab === "dashboard" && <View style={styles.navActiveDot} />}
        </TouchableOpacity>

        {/* 2. Surat Tugas */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("surattugas")}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name={activeTab === "surattugas" ? "document-text" : "document-text-outline"}
              size={22}
              color={activeTab === "surattugas" ? "#059669" : colors.textMuted}
            />
            {stBadgeCount > 0 && <View style={styles.navBadge} />}
          </View>
          <Text style={[styles.navText, { color: activeTab === "surattugas" ? "#059669" : colors.textMuted, fontWeight: activeTab === "surattugas" ? "700" : "500" }]}>
            Surat Tugas
          </Text>
          {activeTab === "surattugas" && <View style={styles.navActiveDot} />}
        </TouchableOpacity>

        {/* 3. Center Elevated FAB (+) -> Opens Modal */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => setFabModalVisible(true)}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 4. Layanan Terpadu ASN */}
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab("layanan"); setLayananSubScreen("menu"); }}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name={activeTab === "layanan" ? "grid" : "grid-outline"}
              size={22}
              color={activeTab === "layanan" ? "#059669" : colors.textMuted}
            />
            {assetsBadgeCount > 0 && <View style={styles.navBadge} />}
          </View>
          <Text style={[styles.navText, { color: activeTab === "layanan" ? "#059669" : colors.textMuted, fontWeight: activeTab === "layanan" ? "700" : "500" }]}>
            Layanan
          </Text>
          {activeTab === "layanan" && <View style={styles.navActiveDot} />}
        </TouchableOpacity>

        {/* 5. Profil Pegawai */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("profile")}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name={activeTab === "profile" ? "person" : "person-outline"}
              size={22}
              color={activeTab === "profile" ? "#059669" : colors.textMuted}
            />
          </View>
          <Text style={[styles.navText, { color: activeTab === "profile" ? "#059669" : colors.textMuted, fontWeight: activeTab === "profile" ? "700" : "500" }]}>
            Profil
          </Text>
          {activeTab === "profile" && <View style={styles.navActiveDot} />}
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
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.menuModalHeader}>
              <View>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Buat Pengajuan Baru</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Pilih jenis formulir kedinasan yang ingin Anda buat
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFabModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Buat Surat Tugas (SPT) Baru */}
            <TouchableOpacity
              style={[styles.modalOptionCard, { backgroundColor: "#F0FDF4", borderColor: "#A7F3D0" }]}
              activeOpacity={0.8}
              onPress={() => {
                setFabModalVisible(false);
                if (onNavigateToModule) onNavigateToModule("buat-surat-tugas");
              }}
            >
              <View style={[styles.modalOptionIconBg, { backgroundColor: "#059669" }]}>
                <Ionicons name="document-text" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: "#064E3B" }]}>Buat Surat Tugas (SPT) Baru</Text>
                <Text style={[styles.modalOptionDesc, { color: "#166534" }]}>
                  Ajukan penugasan dinas resmi, rute tujuan, jadwal pelaksanaan, dan pembebanan anggaran DIPA.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#059669" />
            </TouchableOpacity>

            {/* Option 2: Pengajuan Cuti Online */}
            <TouchableOpacity
              style={[styles.modalOptionCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}
              activeOpacity={0.8}
              onPress={() => {
                setFabModalVisible(false);
                setCutiModalVisible(true);
              }}
            >
              <View style={[styles.modalOptionIconBg, { backgroundColor: "#D97706" }]}>
                <Ionicons name="calendar" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: "#78350F" }]}>Pengajuan Cuti Online</Text>
                <Text style={[styles.modalOptionDesc, { color: "#92400E" }]}>
                  Cuti tahunan, sakit, melahirkan, atau alasan penting. Kuota Anda saat ini: 12 Hari Kerja Ready.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D97706" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setFabModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Tutup Menu</Text>
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
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Daftar aset BMN operasional dinas yang sedang Anda pinjam
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPinjamanModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {activeLoansList.length === 0 ? (
                <View style={styles.emptyServiceContainer}>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#059669" />
                  <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Tidak Ada Pinjaman Aktif</Text>
                  <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                    Seluruh barang operasional dinas tercatat telah dikembalikan ke pengurus BMN Balai KSDA Kaltim.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginVertical: 6 }}>
                  {activeLoansList.map((loan, idx) => {
                    const isLate = String(loan.status || "").toLowerCase().includes("terlambat");
                    return (
                      <View
                        key={loan.id || idx}
                        style={[
                          styles.loanItemCard,
                          {
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC",
                            borderColor: isDark ? "#334155" : "#E2E8F0",
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
                                backgroundColor: isLate ? "#FEF2F2" : "#EFF6FF",
                                borderColor: isLate ? "#FECACA" : "#BFDBFE",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.loanStatusText,
                                { color: isLate ? "#DC2626" : "#2563EB" },
                              ]}
                            >
                              {loan.status?.toUpperCase() || "DIPINJAM"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.loanDatesRow}>
                          <View style={styles.loanDateCol}>
                            <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                            <Text style={[styles.loanDateVal, { color: colors.textDark }]}>
                              {loan.loan_date ? String(loan.loan_date).split("T")[0] : "-"}
                            </Text>
                          </View>
                          <View style={styles.loanDateCol}>
                            <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                            <Text style={[styles.loanDateVal, { color: isLate ? "#DC2626" : colors.textDark }]}>
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
              style={[styles.cancelModalBtn, { marginTop: 16 }]}
              onPress={() => setPinjamanModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Tutup</Text>
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
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Aset BMN Saya</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Barang Milik Negara yang tercatat resmi dalam penguasaan dinas Anda
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAsetModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {myAssetsList.length === 0 ? (
                <View style={styles.emptyServiceContainer}>
                  <Ionicons name="cube-outline" size={44} color="#64748B" />
                  <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Belum Ada Aset Terdaftar</Text>
                  <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                    Belum ada Barang Milik Negara tetap yang dialokasikan resmi atas NIP/nama Anda.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginVertical: 6 }}>
                  {myAssetsList.map((asset, idx) => {
                    const kondisi = String(asset.kondisi || "B").toUpperCase();
                    const kondisiColor = kondisi === "B" ? "#059669" : kondisi === "RR" ? "#D97706" : "#DC2626";
                    const kondisiBg = kondisi === "B" ? "#ECFDF5" : kondisi === "RR" ? "#FFFBEB" : "#FEF2F2";
                    const kondisiLabel = kondisi === "B" ? "Baik" : kondisi === "RR" ? "Rusak Ringan" : "Rusak Berat";

                    return (
                      <View
                        key={asset.id || idx}
                        style={[
                          styles.loanItemCard,
                          {
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC",
                            borderColor: isDark ? "#334155" : "#E2E8F0",
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
                              { backgroundColor: kondisiBg, borderColor: kondisiColor + "40" },
                            ]}
                          >
                            <Text style={[styles.loanStatusText, { color: kondisiColor }]}>
                              {kondisiLabel}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.loanDatesRow}>
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
              style={[styles.cancelModalBtn, { marginTop: 16 }]}
              onPress={() => setAsetModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Tutup</Text>
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
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Sisa Kuota Cuti: {resolvedSisaCuti} Hari Kerja (Tahun {new Date().getFullYear()})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCutiHistoryModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick Action: Ajukan Cuti Baru */}
            <TouchableOpacity
              style={styles.ajukanCutiQuickBtn}
              onPress={() => {
                setCutiHistoryModalVisible(false);
                setCutiModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.ajukanCutiQuickText}>+ Ajukan Permohonan Cuti Baru</Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 340, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {leaveRequests.length === 0 ? (
                <View style={styles.emptyServiceContainer}>
                  <Ionicons name="calendar-outline" size={44} color="#D97706" />
                  <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Belum Ada Pengajuan Cuti</Text>
                  <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                    Anda belum pernah mengajukan cuti tahunan atau alasan penting tahun ini.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {leaveRequests.map((req, idx) => {
                    const statusStr = String(req.status || "PENDING").toUpperCase();
                    const isApproved = statusStr.includes("SETUJU") || statusStr.includes("APPROV");
                    const isPending = statusStr.includes("PENDING") || statusStr.includes("MENUNGGU");
                    const statusColor = isApproved ? "#059669" : isPending ? "#D97706" : "#DC2626";
                    const statusBg = isApproved ? "#ECFDF5" : isPending ? "#FFFBEB" : "#FEF2F2";

                    return (
                      <View
                        key={req.id || idx}
                        style={[
                          styles.loanItemCard,
                          {
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC",
                            borderColor: isDark ? "#334155" : "#E2E8F0",
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
                              { backgroundColor: statusBg, borderColor: statusColor + "40" },
                            ]}
                          >
                            <Text style={[styles.loanStatusText, { color: statusColor }]}>
                              {statusStr}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.leaveAlasanText, { color: colors.textDark }]} numberOfLines={2}>
                          "{req.alasan_cuti || "Keperluan keluarga"}"
                        </Text>

                        <View style={styles.leaveActionsRow}>
                          <TouchableOpacity
                            style={styles.leavePrintBtn}
                            onPress={() => {
                              setCutiHistoryModalVisible(false);
                              setCutiPreviewItem(req);
                              setCutiPreviewVisible(true);
                            }}
                          >
                            <Ionicons name="document-text-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
                            <Text style={styles.leavePrintBtnText}>Cetak Lembar Cuti</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { marginTop: 14 }]}
              onPress={() => setCutiHistoryModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Tutup</Text>
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
          <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.menuModalHeader}>
              <View>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Kalkulator Dinas (SBM)</Text>
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                  Standar Biaya Masukan PMK Wilayah Kalimantan Timur
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSbmModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginVertical: 8 }}>
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Kota Asal / Penugasan</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Samarinda (Kantor Balai)</Text>
              </View>
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Tujuan Dinas</Text>
                <Text style={[styles.sbmVal, { color: colors.textDark }]}>Paser & Balikpapan (3 Hari)</Text>
              </View>
              <View style={styles.sbmDivider} />
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
              <View style={styles.sbmDivider} />
              <View style={styles.sbmRow}>
                <Text style={[styles.sbmTotalLabel, { color: "#064E3B" }]}>Total Estimasi Biaya</Text>
                <Text style={[styles.sbmTotalVal, { color: "#059669" }]}>Rp 3.100.000</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { marginTop: 16 }]}
              onPress={() => setSbmModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Tutup Kalkulator</Text>
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
        onSuccess={() => fetchMyLeaveRequests()}
      />

      <FormulirCutiPrintModal
        visible={cutiPreviewVisible}
        data={cutiPreviewItem}
        onClose={() => setCutiPreviewVisible(false)}
      />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTitleCol: {
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110, // accommodate floating bottom nav
  },

  // Hero greeting card
  heroBanner: {
    backgroundColor: "#064E3B",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroDate: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  heroGreeting: {
    color: "#ffffff",
    fontSize: 16.5,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: "#D1FAE5",
    fontSize: 11,
    lineHeight: 16,
  },

  // Quick stats
  quickStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  quickStatIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  quickStatTitle: {
    fontSize: 9,
    fontWeight: "700",
    flex: 1,
    letterSpacing: 0.2,
  },
  quickStatValue: {
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  quickStatSubtitle: {
    fontSize: 9.5,
  },

  // Modules Grid
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
    marginBottom: 10,
  },
  moduleCardWrapper: {
    width: "25%",
    paddingHorizontal: 3,
    marginBottom: 6,
  },
  gridBaruBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    zIndex: 10,
  },
  gridBaruBadgeText: {
    color: "#047857",
    fontSize: 6.5,
    fontWeight: "800",
  },
  moduleCard: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  moduleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 1,
  },
  moduleSubtitle: {
    fontSize: 8.5,
    textAlign: "center",
  },

  // Active duty card
  moduleAuthorizedBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  moduleAuthorizedBadgeText: {
    color: "#047857",
    fontSize: 9,
    fontWeight: "800",
  },
  driveCardWrapper: {
    marginBottom: 12,
  },
  driveCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  driveIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  driveTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  driveSubtitle: {
    fontSize: 9.5,
    marginTop: 1,
  },
  baruBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  baruBadgeText: {
    color: "#047857",
    fontSize: 8,
    fontWeight: "800",
  },
  activeDutyCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  activeDutyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activeDutyBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  activeDutyBadgeText: {
    color: "#047857",
    fontSize: 9,
    fontWeight: "800",
  },
  activeDutyNumber: {
    color: "#64748B",
    fontSize: 9.5,
    fontWeight: "600",
  },
  activeDutyTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  activeDutyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItemText: {
    fontSize: 10,
    fontWeight: "500",
  },
  activeDutyLink: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  activeDutyLinkText: {
    color: "#047857",
    fontSize: 10.5,
    fontWeight: "700",
  },

  // Helpdesk TU Strip
  helpdeskStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  layananHelpdeskSpacing: {
    marginTop: 22,
    marginBottom: 95,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  helpdeskIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  helpdeskTitle: {
    color: "#14532D",
    fontSize: 11.5,
    fontWeight: "800",
  },
  helpdeskSub: {
    color: "#166534",
    fontSize: 10,
    marginTop: 2,
    lineHeight: 15,
  },

  // Subpage headers
  pageHeaderCol: {
    marginBottom: 12,
  },
  pageMainTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  pageMainSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },

  // Filter segments
  filterSegmentContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  filterSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 9,
  },
  filterSegmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterSegmentText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  filterSegmentTextActive: {
    color: "#059669",
    fontWeight: "800",
  },

  // ST List cards
  stListCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  stListHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  stStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  stStatusBadgeRunning: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  stStatusBadgeCompleted: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stStatusBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  stStatusBadgeTextRunning: {
    color: "#047857",
  },
  stStatusBadgeTextCompleted: {
    color: "#475569",
  },
  stListNumber: {
    fontSize: 10,
    fontWeight: "700",
    flex: 1,
  },
  eyePreviewBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  stListTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 4,
  },
  stListDestination: {
    fontSize: 10,
    marginBottom: 6,
  },
  stListFooterRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  stListFooterText: {
    fontSize: 9.5,
    fontWeight: "600",
  },

  quickPromptStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  quickPromptTitle: {
    color: "#1E40AF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  quickPromptSub: {
    color: "#1E3A8A",
    fontSize: 9,
    marginTop: 1,
  },

  // Layanan Service Cards
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  serviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceMain: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  serviceSubtitle: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  serviceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  // Profile Screen
  profileHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  profileAvatarBig: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  profileHeroMain: {
    flex: 1,
  },
  profileHeroName: {
    fontSize: 14,
    fontWeight: "800",
  },
  profileHeroNip: {
    fontSize: 10,
    marginTop: 1,
  },
  profileHeroJabatan: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    marginTop: 2,
  },
  profileHeroUnit: {
    fontSize: 9,
    marginTop: 1,
  },
  profileMetricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  profileMetricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileMetricLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.2,
  },
  profileMetricValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  profileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileMenuItemLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontWeight: "700",
  },

  // Bottom Navigation Bar
  bottomNavContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    flex: 1,
  },
  navText: {
    fontSize: 8.5,
    marginTop: 2,
  },
  navIconWrapper: {
    position: "relative",
  },
  navBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#059669",
    position: "absolute",
    bottom: 4,
  },
  fabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#ffffff",
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  menuModalContent: {
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  menuModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  menuModalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  menuModalSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  modalOptionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  modalOptionDesc: {
    fontSize: 9.5,
    lineHeight: 14,
  },
  cancelModalBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  cancelModalBtnText: {
    color: "#475569",
    fontSize: 11.5,
    fontWeight: "700",
  },

  // SBM Modal Styles
  sbmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sbmLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  sbmVal: {
    fontSize: 11,
    fontWeight: "700",
  },
  sbmDivider: {
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    marginVertical: 4,
  },
  sbmTotalLabel: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  sbmTotalVal: {
    fontSize: 13,
    fontWeight: "800",
  },

  // Service Modal Styles (Loans, Assets, Leave History)
  emptyServiceContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyServiceTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyServiceSub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  loanItemCard: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  loanItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  loanItemTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    lineHeight: 18,
  },
  loanItemMeta: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  loanStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  loanStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  loanDatesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    gap: 8,
  },
  loanDateCol: {
    flex: 1,
  },
  loanDateLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  loanDateVal: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 2,
  },
  ajukanCutiQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  ajukanCutiQuickText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  leaveAlasanText: {
    fontSize: 11.5,
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 16,
  },
  leaveActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  leavePrintBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(5, 150, 105, 0.1)",
  },
  leavePrintBtnText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },

  // Dedicated Sub-Screens Styles (BMN & Cuti)
  subScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  subScreenBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  subScreenTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subScreenSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  bmnSegmentedWrapper: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  bmnSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  bmnSegmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bmnSegmentText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  bmnSegmentTextActive: {
    color: "#064E3B",
    fontWeight: "800",
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  catPillScrollView: {
    marginBottom: 4,
  },
  catPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  catPillBtnActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  catPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  catPillTextActive: {
    color: "#064E3B",
    fontWeight: "800",
  },
  bmnDetailCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  bmnDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bmnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  bmnItemTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    lineHeight: 18,
  },
  bmnItemCode: {
    fontSize: 10.5,
    marginTop: 2,
  },
  bmnItemSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  bmnConditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  bmnConditionText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  bmnLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  bmnLocationText: {
    fontSize: 10.5,
  },
  loanMetaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  loanMetaCol: {
    flex: 1,
  },
  loanMetaLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  loanMetaVal: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  cutiHeroCard: {
    backgroundColor: "#064E3B",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cutiHeroLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#6EE7B7",
    letterSpacing: 0.5,
  },
  cutiHeroValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 2,
  },
  cutiHeroBreakdown: {
    fontSize: 10,
    color: "#D1FAE5",
  },
  cutiHeroActionBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cutiHeroActionText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  yearPillsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  yearPillBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  yearPillBtnActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  yearPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  yearPillTextActive: {
    color: "#064E3B",
    fontWeight: "800",
  },
  leaveDetailCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  leaveCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  leaveItemTitle: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  leaveDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  leaveDateText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
  },
  leaveAlasanFullText: {
    fontSize: 11.5,
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 16,
  },
  leaveCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  leavePrintOfficialBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  leavePrintOfficialText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  ajukanCutiBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    marginBottom: 20,
  },
  ajukanCutiBottomText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emptySubStateCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  emptySubTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubDesc: {
    fontSize: 11.5,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
});
