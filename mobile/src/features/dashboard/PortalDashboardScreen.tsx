import React, { useState } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import {
  PORTAL_5_TOKENS,
  chunkGridRows,
  usePortalResponsive,
  type ThemeColors,
  useTheme,
} from "../../theme/ThemeContext";
import { AnimateUiScreen } from "../../components/motion/AnimateUi";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../auth/AuthProvider";
import { hasModule } from "../../lib/permissions";
import { apiClient } from "../../lib/api/client";
import { openFile } from "../../lib/files/share";
import { useForegroundRefresh } from "../../hooks/useForegroundRefresh";
import { useReverbRefresh } from "../../hooks/useReverbRefresh";
import { PratinjauSuratTugasModal, PratinjauSuratTugasItem } from "../../components/PratinjauSuratTugasModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { ChangePasswordModal } from "../profile/ChangePasswordModal";
import { ProfileSettingsModal, type ProfileSetting } from "../profile/ProfileSettingsModal";
import { FormulirCutiModal } from "./FormulirCutiModal";
import { FormulirCutiPrintModal, LeaveRequestPrintData } from "../../components/FormulirCutiPrintModal";
import { PortalNotifications, usePortalNotifications } from "./PortalNotifications";
import { createPortalStyles } from "./portalStyles";
import { DashboardData } from "./types";

interface PortalDashboardScreenProps {
  onNavigateToModule?: (moduleKey: string) => void;
  userProfile?: {
    name: string;
    nip: string;
    avatarUrl?: string;
  };
  dashboardData?: DashboardData;
  requestedTab?: "profile";
  onTabRequestHandled?: () => void;
}

const BKSDA_FOREST = "#1e5433";

// Shared portal surfaces keep Beranda, Tugas, Layanan and Profil consistent.
const PORTAL_SURFACES = {
  light: {
    bgDark: "#f1f6f0",
    cardBg: "#ffffff",
    bgSurface: "#ffffff",
    surfaceRaised: "#ffffff",
    surfaceMuted: "#eaf1e8",
    glassBorder: "#d4e2d3",
    borderControl: "#71836f",
    headerBg: "#ffffff",
    headerBorder: "#d4e2d3",
  },
  dark: {
    bgDark: "#101813",
    cardBg: "#1b2820",
    bgSurface: "#1b2820",
    surfaceRaised: "#25362b",
    surfaceMuted: "#25362b",
    glassBorder: "#3b5242",
    borderControl: "#849387",
    headerBg: "#1b2820",
    headerBorder: "#3b5242",
  },
} satisfies Record<"light" | "dark", Partial<ThemeColors>>;

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

export function extractSuratTugasDalamRangka(text?: string | null, tempatTujuan?: string | null): string {
  const firstLine = (text || "").trim().split(/\r?\n/)[0]?.split(";")[0]?.trim() || "";
  if (!firstLine) return "";

  let summary = firstLine
    .replace(/,\s*selama\s+\d+(?:\s*\([^)]+\))?\s*hari\b.*$/i, "")
    .replace(/,\s*(?:terhitung\s+mulai|pada\s+tanggal)\b.*$/i, "")
    .trim();

  const rangkaMatch = summary.match(/\bdalam\s+rangka\s+(.+)$/i);
  summary = rangkaMatch
    ? rangkaMatch[1].trim()
    : summary
        .replace(
          /^(?:melaksanakan\s+(?:perjalanan\s+dinas(?:\s+dari\s+.+?\s+ke\s+.+?)?(?:\s+untuk)?|kegiatan)|menugaskan\s+staf(?:\s+untuk)?)\s+/i,
          ""
        )
        .trim();

  for (let i = 0; i < 2; i++) {
    if (tempatTujuan?.trim()) {
      const escaped = tempatTujuan.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      summary = summary.replace(new RegExp(`\\s+(?:di|pada)\\s+${escaped}$`, "i"), "").trim();
    }
    summary = summary.replace(/\s+(?:di|pada)\s+[^,;]+$/i, "").trim();
  }

  const result = summary || firstLine;
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatSumberDanaLabel(item: any): string {
  if (item?.sumber_dana_label) return String(item.sumber_dana_label).trim();
  const raw = String(item?.sumber_dana || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "other") return String(item?.sumber_dana_other || "Lainnya").trim();
  if (lower === "dipa") return "DIPA";
  if (lower === "dl1") return "DL 1 / Tidak ada biaya";
  return raw;
}

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


function resolveMobilePhotoUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const gdriveMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdriveMatch) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
    const origin = String(apiClient.defaults.baseURL || "").replace(/\/api\/?$/, "");
    return origin ? `${origin}${rawUrl}` : rawUrl;
  }
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
}

function getPrimaryAssetPhoto(item: any): { key: string; label: string; url: string } | null {
  const candidates: [string, string, string | null | undefined][] = [
    ["geotag", "Foto Geotag", item?.foto_geotag_url || (item?.foto_geotag_path?.startsWith("http") ? item.foto_geotag_path : null)],
    ["depan", "Tampak Depan", item?.foto_depan_url],
    ["belakang", "Tampak Belakang", item?.foto_belakang_url],
    ["kiri", "Tampak Kiri", item?.foto_kiri_url],
    ["kanan", "Tampak Kanan", item?.foto_kanan_url],
    ["lokasi", "Foto Lokasi", item?.foto_lokasi_url],
    ["foto", "Dokumentasi", item?.foto_url],
  ];
  for (const [key, label, raw] of candidates) {
    const url = resolveMobilePhotoUrl(raw);
    if (url) return { key, label, url };
  }
  return null;
}

function matchesAssetCategory(item: any, category: string): boolean {
  if (category === "all") return true;
  const jenis = String(item?.jenis_bmn || "").toLowerCase();
  const nama = String(item?.nama_barang || "").toLowerCase();
  if (category === "kendaraan") {
    return (
      item?.kategori === "kendaraan" ||
      jenis.includes("kendaraan") ||
      jenis.includes("angkutan") ||
      Boolean(item?.no_polisi)
    );
  }
  if (category === "it") {
    return item?.kategori === "it" || jenis.includes("ti") || nama.includes("laptop") || nama.includes("pc");
  }
  if (category === "peralatan") {
    return (
      item?.kategori === "peralatan" ||
      jenis.includes("lapangan") ||
      jenis.includes("navigasi") ||
      nama.includes("gps") ||
      nama.includes("drone") ||
      nama.includes("kamera")
    );
  }
  return true;
}

function formatAssetCondition(raw?: string | null): { label: string; shortLabel: string; tone: ToneKey } {
  const clean = String(raw || "B").trim().toUpperCase();
  if (clean === "B" || clean === "BAIK") return { label: "Kondisi: Baik", shortLabel: "Baik", tone: "success" };
  if (clean === "RR" || clean.includes("RINGAN")) return { label: "Rusak Ringan", shortLabel: "RR", tone: "warning" };
  return { label: "Rusak Berat", shortLabel: "RB", tone: "danger" };
}

function formatAssetMerkTipe(item: any): string {
  const parts = [item?.merk_tipe, item?.merk, item?.tipe]
    .filter(Boolean)
    .join(" ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length === 0) return "-";
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique.join(" ");
}

function getLeaveStatusMeta(req: any): {
  kind: "rejected" | "approved" | "verified" | "pending";
  label: string;
  tone: ToneKey;
  canCancel: boolean;
} {
  const status = String(req?.status || "PENGAJUAN").toUpperCase().trim();
  const atasan = String(req?.status_pertimbangan_atasan || "").toUpperCase().trim();

  if (status === "DITOLAK" || status === "REJECTED" || atasan === "DITOLAK" || atasan === "REJECTED") {
    return { kind: "rejected", label: "Ditolak", tone: "danger", canCancel: false };
  }
  if (status === "DISETUJUI" || status === "APPROVED") {
    return { kind: "approved", label: "Disetujui", tone: "success", canCancel: false };
  }
  if (atasan === "DISETUJUI" || atasan === "APPROVED") {
    return {
      kind: "verified",
      label: "Verifikasi Atasan",
      tone: "info",
      canCancel: status === "PENGAJUAN" || status === "PENDING",
    };
  }
  return { kind: "pending", label: "Pengajuan", tone: "warning", canCancel: true };
}

function base64DataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    if (typeof atob !== "function" || typeof URL === "undefined" || typeof Blob === "undefined") {
      return null;
    }
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

export const PortalDashboardScreen: React.FC<PortalDashboardScreenProps> = ({
  onNavigateToModule,
  userProfile,
  dashboardData, requestedTab, onTabRequestHandled,
}) => {
  const isScreenFocused = useIsFocused();
  const { isDark, toggleTheme, colors: themeColors } = useTheme();
  const { user, employee, logout, refreshUser } = useAuth();
  const r = usePortalResponsive();
  const styles = React.useMemo(() => createPortalStyles(r), [r]);

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
  const [profileSetting, setProfileSetting] = useState<ProfileSetting | null>(null);
  const [profilePasswordVisible, setProfilePasswordVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const notifications = usePortalNotifications();
  const [profileNotice, setProfileNotice] = useState("");
  const [failedProfilePhoto, setFailedProfilePhoto] = useState<string | null>(null);
  useFocusEffect(React.useCallback(() => {
    if (requestedTab) {setActiveTab(requestedTab);onTabRequestHandled?.();}
  }, [requestedTab, onTabRequestHandled]));
  const isDashboard = activeTab === "dashboard";
  const colors = React.useMemo(() => ({
    ...themeColors,
    ...PORTAL_SURFACES[isDark ? "dark" : "light"],
  }), [isDark, themeColors]);

  // Center FAB Quick Action Modal
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const pendingAssignmentNavigation = React.useRef(false);

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
  const [bmnViewMode, setBmnViewMode] = useState<"grid" | "list">("grid");
  const [failedBmnThumbs, setFailedBmnThumbs] = useState<Record<string, boolean>>({});
  const [bmnSearchQuery, setBmnSearchQuery] = useState("");
  const [bmnCategoryFilter, setBmnCategoryFilter] = useState<string>("all");
  const [cutiYearFilter, setCutiYearFilter] = useState<number | "all">("all");

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [cutiModalVisible, setCutiModalVisible] = useState(false);
  const [cutiPreviewItem, setCutiPreviewItem] = useState<LeaveRequestPrintData | null>(null);
  const [cutiPreviewVisible, setCutiPreviewVisible] = useState(false);
  const [cancelLeaveTarget, setCancelLeaveTarget] = useState<any>(null);
  const [isCancellingLeave, setIsCancellingLeave] = useState(false);
  const [leaveScanModal, setLeaveScanModal] = useState<{
    visible: boolean;
    title: string;
    fileName?: string | null;
    mimeType?: string;
    dataUrl?: string | null;
    blobUrl?: string | null;
    loading: boolean;
    error?: string | null;
  }>({ visible: false, title: "", loading: false });

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
  const canFetchLeaveBalance = !!(employee ?? user?.employee) &&
    !(employee ?? user?.employee)?.nip?.toUpperCase().startsWith("MMP-");
  const fetchMyLeaveBalance = React.useCallback(async () => {
    if (!canFetchLeaveBalance) {
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
  }, [canFetchLeaveBalance]);

  // 3. Employee Assigned Assets (GET /me/assets - correct endpoint for personal BMN)
  const [assignedAssetsList, setAssignedAssetsList] = useState<any[]>([]);

  const fetchMyAssets = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/me/assets");
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setAssignedAssetsList(list);
    } catch {
      setAssignedAssetsList([]);
    }
  }, []);

  // 4. Employee Active Loans (GET /me/dashboard -> my_assets)
  const [activeLoansList, setActiveLoansList] = useState<any[]>([]);
  // Match the web portal: a currently borrowed asset belongs only in the loan list.
  const myAssetsList = React.useMemo(() => {
    const borrowedIds = new Set(activeLoansList.map((loan) => String(loan.id)));
    return assignedAssetsList.filter((asset) => !borrowedIds.has(String(asset.id)));
  }, [assignedAssetsList, activeLoansList]);
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
    "Pengguna BKSDA";

  const resolvedNip =
    userProfile?.nip ||
    employee?.nip ||
    user?.employee?.nip ||
    user?.username ||
    "—";

  const resolvedJabatan =
    employee?.position ||
    (user as any)?.position ||
    "—";

  const resolvedSisaCuti =
    leaveBalance?.sisa_cuti_tersedia ??
    leaveBalance?.sisa_cuti_n ??
    null;

  const resolvedPangkat =
    (employee as any)?.rank ||
    (user as any)?.employee?.rank ||
    (user as any)?.rank ||
    "—";

  const resolvedSisaCutiLabel =
    resolvedSisaCuti == null ? "—" : `${resolvedSisaCuti ?? "—"} Hari`;

  const profileEmployee = employee || user?.employee;
  const profileName = profileEmployee?.name || user?.name || "Pengguna BKSDA";
  const profilePhoto = resolveMobilePhotoUrl(profileEmployee?.photo);
  const profileLeaveDays = leaveBalance?.sisa_cuti_tersedia ?? leaveBalance?.sisa_cuti_n;
  const profileLeaveLabel = !canFetchLeaveBalance ? "Tidak tersedia" : profileLeaveDays == null ? "Belum tersedia" : `${profileLeaveDays} Hari Kerja`;

  const greetingMeta = getLiveGreeting();
  const todayIndo = formatTodayIndo();

  const summary = dashboardData?.summary;

  const accessibleModules = MODULES.filter((mod) => hasModule(user, mod.key));
  const stBadgeCount = summary?.active_my_letters_count || summary?.pending_my_letters_count || myStList.length || 0;
  const assetsBadgeCount = myAssetsList.length;
  const shadowXs = PORTAL_5_TOKENS.shadow.xs(isDark);
  const shadowLg = PORTAL_5_TOKENS.shadow.lg(isDark);

  const displayStList = myStList;
  const displayLeaveRequests = leaveRequests;

  const filteredBmnAssets = myAssetsList.filter((item: any) => {
    const q = bmnSearchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      String(item.nama_barang || "").toLowerCase().includes(q) ||
      String(item.kode_barang || "").toLowerCase().includes(q) ||
      String(item.nup || "").toLowerCase().includes(q) ||
      String(item.no_polisi || "").toLowerCase().includes(q) ||
      formatAssetMerkTipe(item).toLowerCase().includes(q);
    return matchQuery && matchesAssetCategory(item, bmnCategoryFilter);
  });

  const filteredBmnLoans = activeLoansList.filter((loan: any) => {
    const q = bmnSearchQuery.toLowerCase().trim();
    return (
      !q ||
      String(loan.nama_barang || "").toLowerCase().includes(q) ||
      String(loan.kode_barang || "").toLowerCase().includes(q) ||
      String(loan.nup || "").toLowerCase().includes(q) ||
      String(loan.no_polisi || "").toLowerCase().includes(q) ||
      formatAssetMerkTipe(loan).toLowerCase().includes(q)
    );
  });

  const bmnCategoryCounts = {
    all: myAssetsList.length,
    kendaraan: myAssetsList.filter((item: any) => matchesAssetCategory(item, "kendaraan")).length,
    it: myAssetsList.filter((item: any) => matchesAssetCategory(item, "it")).length,
    peralatan: myAssetsList.filter((item: any) => matchesAssetCategory(item, "peralatan")).length,
  };
  const activeBmnItems = bmnActiveTab === "aset" ? filteredBmnAssets : filteredBmnLoans;

  const cutiCurrentYear = new Date().getFullYear();
  const cutiHakN = leaveBalance?.hak_cuti_n == null ? null : Number(leaveBalance.hak_cuti_n);
  const cutiSisaN1 = Number(leaveBalance?.hak_n1_diakui ?? leaveBalance?.sisa_cuti_n1 ?? 0);
  const cutiSisaN2 = Number(leaveBalance?.hak_n2_diakui ?? 0);
  const cutiTerpakai = leaveBalance?.cuti_terpakai_n0 ?? (cutiHakN != null && resolvedSisaCuti != null ? Math.max(0, cutiHakN - resolvedSisaCuti) : null);
  const cutiPendingHari = Number(leaveBalance?.pending_cuti_tahunan ?? 0);

  const cutiYearCounts = displayLeaveRequests.reduce((acc: Record<number, number>, req: any) => {
    const yr = req.tanggal_mulai ? new Date(req.tanggal_mulai).getFullYear() : (req.year || cutiCurrentYear);
    if (!Number.isNaN(yr)) acc[yr] = (acc[yr] || 0) + 1;
    return acc;
  }, {});
  const cutiYearOptions: { year: number | "all"; label: string }[] = [
    { year: "all", label: `Semua (${displayLeaveRequests.length})` },
    ...Object.keys(cutiYearCounts)
      .map(Number)
      .sort((a, b) => b - a)
      .map((yr) => ({ year: yr, label: `${yr} (${cutiYearCounts[yr]})` })),
  ];

  const filteredLeaveRequests = displayLeaveRequests.filter((req: any) => {
    if (cutiYearFilter === "all") return true;
    const year = req.tanggal_mulai ? new Date(req.tanggal_mulai).getFullYear() : (req.year || cutiCurrentYear);
    return year === cutiYearFilter;
  });

  const closeLeaveScanModal = React.useCallback(() => {
    setLeaveScanModal((prev) => {
      if (prev.blobUrl && typeof URL !== "undefined") {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return { visible: false, title: "", loading: false };
    });
  }, []);

  const handleOpenLeaveScan = React.useCallback(async (req: any, kind: "surat_izin" | "formulir") => {
    const isSuratIzin = kind === "surat_izin";
    const fileName = isSuratIzin
      ? (req.scan_surat_izin_nama || req.scan_surat_nama || "Surat_Izin_Cuti.pdf")
      : (req.scan_formulir_nama || "Formulir_Cuti.pdf");
    const title = isSuratIzin
      ? "Surat Izin Cuti Resmi (TTE Kepala Balai)"
      : "Scan Formulir Permohonan Cuti (TTD & Cap Balai)";

    const endpoint = `/me/leave-requests/${req.id}/${isSuratIzin ? "scan-surat-izin" : "scan-formulir"}`;
    setLeaveScanModal({ visible: true, title, fileName, loading: true });
    try {
      const response = await apiClient.get<any>(endpoint, { params: { preview: 1 } });
      const dataUrl = response.data?.data_url || response.data?.data?.data_url;
      if (typeof dataUrl !== "string" || !/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=\r\n]+$/.test(dataUrl)) {
        throw new Error("Format berkas scan tidak didukung.");
      }
      const serverName = response.data?.file_name || response.data?.data?.file_name || fileName;
      const mimeType = String(response.data?.mime_type || response.data?.data?.mime_type || "application/pdf");
      const blobUrl =
        Platform.OS === "web" && typeof dataUrl === "string" && dataUrl.startsWith("data:")
          ? base64DataUrlToBlobUrl(dataUrl)
          : null;

      setLeaveScanModal({
        visible: true,
        title,
        fileName: serverName,
        mimeType,
        dataUrl: dataUrl || null,
        blobUrl,
        loading: false,
      });
    } catch (err: any) {
      const msg = err?.message || "Berkas scan belum diunggah atau tidak ditemukan.";
      setLeaveScanModal({
        visible: true,
        title,
        fileName,
        loading: false,
        error: msg,
      });
    }
  }, []);

  const handleConfirmCancelLeave = React.useCallback(async () => {
    if (!cancelLeaveTarget) return;
    setIsCancellingLeave(true);
    try {
      await apiClient.delete(`/me/leave-requests/${cancelLeaveTarget.id}`);
      setCancelLeaveTarget(null);
      fetchMyLeaveRequests();
      fetchMyLeaveBalance();
    } catch (err: any) {
      const msg = err?.message || "Gagal membatalkan permohonan cuti.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
      } else {
        Alert.alert("Gagal", msg);
      }
    } finally {
      setIsCancellingLeave(false);
    }
  }, [cancelLeaveTarget, fetchMyLeaveRequests, fetchMyLeaveBalance]);

  const renderLeaveCardActions = (req: any, beforeModalOpen?: () => void) => {
    const statusMeta = getLeaveStatusMeta(req);
    if (statusMeta.kind === "rejected") {
      return null;
    }

    if (statusMeta.kind === "approved") {
      const hasSuratIzin = Boolean(req.scan_surat_izin_path || req.scan_surat_path);
      const hasFormulir = Boolean(req.scan_formulir_path);

      return (
        <>
          <View style={[styles.leaveCardActions]}>
            <TouchableOpacity
              disabled={!hasSuratIzin}
              style={[
                styles.leavePrintOfficialBtn,
                { backgroundColor: hasSuratIzin ? colors.cardBg : colors.surfaceMuted, borderColor: hasSuratIzin ? colors.borderControl : colors.glassBorder },
              ]}
              onPress={() => {
                beforeModalOpen?.();
                void handleOpenLeaveScan(req, "surat_izin");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={r.size.iconSm}
                color={hasSuratIzin ? colors.textDark : colors.textMuted}
                style={[styles.inlineIcon]}
              />
              <Text
                style={[
                  styles.leavePrintOfficialText,
                  { color: hasSuratIzin ? colors.textDark : colors.textMuted },
                ]}
              >
                Surat Izin (Fisik/TTE)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!hasFormulir}
              style={[
                styles.leavePrintOfficialBtn,
                { backgroundColor: hasFormulir ? colors.cardBg : colors.surfaceMuted, borderColor: hasFormulir ? colors.borderControl : colors.glassBorder },
              ]}
              onPress={() => {
                beforeModalOpen?.();
                void handleOpenLeaveScan(req, "formulir");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-text-outline"
                size={r.size.iconSm}
                color={hasFormulir ? colors.textDark : colors.textMuted}
                style={[styles.inlineIcon]}
              />
              <Text
                style={[
                  styles.leavePrintOfficialText,
                  { color: hasFormulir ? colors.textDark : colors.textMuted },
                ]}
              >
                Formulir Scan
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return (
      <View style={[styles.leaveCardActions]}>
        {statusMeta.canCancel && Boolean(req.id) && (
          <TouchableOpacity
            style={[styles.leavePrintOfficialBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
            onPress={() => {
              beforeModalOpen?.();
              setCancelLeaveTarget(req);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={r.size.iconSm} color={colors.dangerFg} style={[styles.inlineIcon]} />
            <Text style={[styles.leavePrintOfficialText, { color: colors.dangerFg }]}>Batalkan</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.leavePrintOfficialBtn, { backgroundColor: colors.cardBg, borderColor: colors.borderControl }]}
          onPress={() => {
            beforeModalOpen?.();
            setCutiPreviewItem(req);
            setCutiPreviewVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="print-outline" size={r.size.iconSm} color={colors.textDark} style={[styles.inlineIcon]} />
          <Text style={[styles.leavePrintOfficialText, { color: colors.textDark }]}>Cetak Formulir Cuti</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
  const homeBorrowedLoans = activeLoansList.filter((loan: any) => !isReturnedLoan(loan));
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

  const isCompletedSt = (item: any) =>
    item?.status === "completed" || item?.kategori === "completed";
  const runningStCount = displayStList.filter(isRunningSt).length;
  const completedStCount = displayStList.filter(isCompletedSt).length;

  const filteredStList = displayStList.filter((item) => {
    if (stFilter === "running") {
      return isRunningSt(item);
    }
    if (stFilter === "completed") {
      return isCompletedSt(item);
    }
    return true;
  });

  const handleLogout = () => setLogoutModalVisible(true);

  // Match the app-bar backing so fractional web pixels cannot expose a pale seam.
  return (
    <View testID="portal-surface" style={[styles.container, { backgroundColor: BKSDA_FOREST }]}>
      {isScreenFocused && <StatusBar style="light" />}
      {/* All portal tabs share the official ministry brand bar. */}
      <View
        testID="portal-header"
        style={[
          styles.header,
          styles.portalHeader,
          { backgroundColor: BKSDA_FOREST },
        ]}
      >
        <View style={[styles.headerInner, styles.portalHeaderInner]}>
          <View style={[styles.headerLeft, styles.portalHeaderLeft]}>
            <View style={styles.headerLogoBadge}>
              <Image
                source={require("../../../assets/kemenhutlogo.png")}
                style={[styles.logoImage, styles.portalLogoImage]}
                resizeMode="contain"
                accessibilityLabel="Logo Kementerian Kehutanan"
              />
            </View>
            <View testID="portal-brand-identity" style={styles.portalBrandText}>
              <Text style={styles.portalMinistry}>Kementerian Kehutanan</Text>
              <Text style={styles.portalInstitution}>Balai KSDA Kalimantan Timur</Text>
            </View>
          </View>

          <View style={[styles.headerRight, styles.portalHeaderRight]}>
            {/* Active Light / Dark Mode Toggle Button */}
            <TouchableOpacity
              style={[styles.headerIconBtn, styles.portalHeaderControl]}
              accessibilityLabel={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
              activeOpacity={0.7}
              onPress={toggleTheme}
            >
              <Ionicons
                name={isDark ? "sunny" : "moon-outline"}
                size={r.size.iconMd}
                color="#ffffff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn, styles.portalHeaderControl]}
              activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Buka notifikasi"
              onPress={() => {setNotificationsVisible(true);void notifications.refresh();}}
            >
              <Ionicons name="notifications-outline" size={r.size.iconMd} color="#ffffff" />
              {notifications.unread > 0 && <View style={[styles.notifDot, { backgroundColor: colors.dangerSolid }]} />}
            </TouchableOpacity>

          </View>
        </View>
      </View>

      <View testID="portal-body" style={[styles.portalBody, { backgroundColor: colors.bgDark }]}>
      <ScrollView
        style={styles.portalScroll}
        contentContainerStyle={[styles.scrollContent, styles.scrollContentCompact]}
        showsVerticalScrollIndicator={false}
      >
        <AnimateUiScreen style={[styles.contentWidthWrap, isDashboard && styles.dashboardContentWidth]} transitionKey={`${activeTab}:${layananSubScreen}`}>
        {/* ========================================================================= */}
        {/* TAB 1: BERANDA PORTAL ASN (FOREST GREEN HERO, 3 MAIN CARDS, 5 TOKENS)     */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <View style={styles.dashboardStack}>
            {/* Welcome belongs to the soft dashboard sheet; the strong brand color stays in the app bar. */}
            <View testID="portal-welcome" style={styles.heroBanner}>
              <View style={styles.heroContent}>
                <View style={styles.heroHeadingRow}>
                  <View style={styles.heroGreetingBody}>
                    <Text style={[styles.heroSalutation, { color: colors.textMuted }]}>{greetingMeta.text},</Text>
                    <Text style={[styles.heroGreeting, { color: colors.textDark }]} numberOfLines={2}>{resolvedName}</Text>
                    <Text style={[styles.heroDate, { color: colors.textMuted }]}>{todayIndo}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.heroIdentityCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Lihat profil pegawai"
                  onPress={() => setActiveTab("profile")}
                >
                  <View style={styles.heroIdentityRow}>
                    <View style={styles.heroIdentityBody}>
                      <Text style={[styles.heroIdentityLabel, { color: colors.textMuted }]}>NIP / Username</Text>
                      <Text style={[styles.heroNipText, { color: colors.textDark }]} numberOfLines={1}>{resolvedNip}</Text>
                    </View>
                    <View style={[styles.heroProfileIcon, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons name="person-outline" size={r.size.iconLg} color={colors.accentFg} />
                    </View>
                  </View>
                  <View style={[styles.heroIdentityFooter, { borderTopColor: colors.glassBorder }]}>
                    <Text style={[styles.heroPosition, { color: colors.textSecondary }]} numberOfLines={1}>{resolvedJabatan}</Text>
                    <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Stats 2x2 Grid (Pangkat, Sisa Cuti, Surat Tugas, Aset Saya) */}
            <View testID="portal-quick-stats" style={[styles.dashboardPanelWidth, styles.quickStatsPanel, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              <View style={[styles.summaryHeader, { borderBottomColor: colors.glassBorder }]}>
                <Ionicons name="stats-chart-outline" size={r.size.iconMd} color={colors.accentFg} />
                <Text style={[styles.summaryTitle, { color: colors.textDark }]}>Ringkasan Pegawai</Text>
              </View>
              <View testID="portal-quick-stat-cells" style={styles.quickStatsGrid}>
                {quickStatItems.map((item, index) => {
                  const pal = getTonePalette(colors, item.tone);
                  const content = (
                    <View style={[styles.quickStripCard, {
                      borderColor: colors.glassBorder,
                      borderRightWidth: r.grid.quickStatCols === 2 && index % 2 === 0 ? 1 : 0,
                      borderBottomWidth: index < quickStatItems.length - r.grid.quickStatCols ? 1 : 0,
                    }]}>
                      <View style={[styles.quickStripIcon, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                        <Ionicons name={item.icon as any} size={r.size.iconMd} color={pal.fg} />
                      </View>
                      <View style={styles.quickStripBody}>
                        <Text style={[styles.quickStripLabel, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                          {item.label}
                        </Text>
                        <Text style={[styles.quickStripValue, { color: colors.textDark }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                          {item.value}
                        </Text>
                      </View>
                      {item.onPress && (
                        <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.textMuted} />
                      )}
                    </View>
                  );

                  return (
                    <View key={item.key} style={styles.quickStatCellWrapper}>
                      {item.onPress ? (
                        <TouchableOpacity style={styles.quickStatTouchable} activeOpacity={0.8} onPress={item.onPress}>
                          {content}
                        </TouchableOpacity>
                      ) : (
                        content
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* CARD 2: Modul Akses System Container Card (matching Web Portal) */}
            <GlassCard style={[styles.dashboardPanelWidth, styles.moduleSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
              <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Modul Akses System
                </Text>
                <View style={[styles.moduleAuthorizedBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                  <Text style={[styles.moduleAuthorizedBadgeText, { color: colors.accentFg }]} numberOfLines={1}>
                    {accessibleModules.length} Modul Terotorisasi
                  </Text>
                </View>
              </View>

              <View style={[styles.moduleGrid]}>
                {chunkGridRows(accessibleModules, r.grid.moduleCols).map((row, rowIdx) => (
                  <View key={`module-row-${rowIdx}`} style={[styles.moduleRow]}>
                    {row.map((mod) => {
                      const pal = getTonePalette(colors, mod.tone);
                      return (
                        <TouchableOpacity
                          key={mod.key}
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
                            <Ionicons name={mod.iconName as any} size={r.size.iconMd} color={pal.fg} />
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
                      );
                    })}
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* CARD 3: Tugas Dinas Berjalan Card (Featured Single Running Assignment) */}
            {activeDutyItem && (
              <TouchableOpacity
                style={[styles.dashboardPanelWidth, styles.homeActivitySpacing]}
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
                    shadowXs,
                  ]}
                >
                  <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                      Tugas Dinas Berjalan
                    </Text>
                    <TouchableOpacity onPress={() => setActiveTab("surattugas")}>
                      <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Semua ›</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.activeDutyHeader]}>
                    {(() => {
                      const badge = getTonePalette(colors, isActiveDutyRunning ? "accent" : "neutral");
                      return (
                        <View style={[styles.activeDutyBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.activeDutyBadgeText, { color: badge.fg }]}>
                            {isActiveDutyRunning ? "SEDANG DINAS" : "PENUGASAN"}
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                      {activeDutyItem.nomor_surat || "ST.042/K.18/TU/KSA/03/2026"}
                    </Text>
                  </View>

                  <Text style={[styles.activeDutyTitle, { color: colors.textDark }]} numberOfLines={2}>
                    {extractSuratTugasDalamRangka(activeDutyItem.maksud_tujuan, activeDutyItem.tempat_tujuan) || "Penugasan Kedinasan Resmi BKSDA"}
                  </Text>

                  <View style={[styles.activeDutyMetaStack]}>
                    <View style={[styles.metaItem]}>
                      <Ionicons name="calendar-outline" size={r.size.iconSm} color={colors.accentFg} />
                      <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                        {`${formatDateIndo(activeDutyItem.tanggal_mulai)} – ${formatDateIndo(activeDutyItem.tanggal_selesai)}`}
                      </Text>
                    </View>
                    <View style={[styles.metaItem]}>
                      <Ionicons name="location-outline" size={r.size.iconSm} color={colors.accentFg} />
                      <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                        {activeDutyItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"}
                      </Text>
                    </View>
                    {Boolean(formatSumberDanaLabel(activeDutyItem)) && (
                      <View style={[styles.metaItem]}>
                        <Ionicons name="wallet-outline" size={r.size.iconSm} color={colors.accentFg} />
                        <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                          {formatSumberDanaLabel(activeDutyItem)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
                    <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                      Surat Tugas Resmi Diterbitkan
                    </Text>
                    <View style={[styles.activeDutyFooterAction]}>
                      <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Detail Penugasan</Text>
                      <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}

            {/* CARD 4 (Kondisional): Pinjaman Aktif jika ada pinjaman */}
            {homeBorrowedLoans.length > 0 && primaryLoan && (() => {
              const loanBadge = getTonePalette(colors, isPrimaryLoanLate ? "danger" : "warning");
              const extraLoans = homeBorrowedLoans.length - 1;
              const primaryLoanMerk = formatAssetMerkTipe(primaryLoan);
              return (
                <GlassCard
                  style={[
                    styles.dashboardPanelWidth,
                    styles.activeDutyCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isPrimaryLoanLate ? colors.dangerBorder : colors.glassBorder,
                    },
                    shadowXs,
                  ]}
                >
                  <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                      Pinjaman Aktif
                    </Text>
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
                    <View style={[styles.activeDutyHeader]}>
                      <View style={[styles.activeDutyBadge, { backgroundColor: loanBadge.bg, borderColor: loanBadge.border }]}>
                        <Text style={[styles.activeDutyBadgeText, { color: loanBadge.fg }]}>
                          {isPrimaryLoanLate ? "TERLAMBAT" : "DIPINJAM"}
                        </Text>
                      </View>
                      <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                        {`NUP ${primaryLoan.nup || "-"} • ${primaryLoan.kode_barang || "-"}`}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.activeDutyTitle,
                        primaryLoanMerk !== "-" && { marginBottom: 0 },
                        { color: colors.textDark },
                      ]}
                      numberOfLines={1}
                    >
                      {primaryLoan.nama_barang}
                    </Text>
                    {primaryLoanMerk !== "-" && (
                      <Text
                        style={[
                          styles.bmnGridSub,
                          { color: colors.textSecondary, marginBottom: r.space.x2 },
                        ]}
                        numberOfLines={1}
                      >
                        {primaryLoanMerk}
                      </Text>
                    )}

                    <View style={[styles.metaItem]}>
                      <Ionicons
                        name="time-outline"
                        size={r.size.iconSm}
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
                      <View style={[styles.activeDutyFooterAction]}>
                        <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Detail Pinjaman</Text>
                        <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </GlassCard>
              );
            })()}
          </View>
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
                  Berjalan ({runningStCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, stFilter === "completed" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                onPress={() => setStFilter("completed")}
              >
                <Text style={[styles.filterSegmentText, { color: stFilter === "completed" ? colors.accentFg : colors.textMuted }, stFilter === "completed" && styles.filterSegmentTextActive]}>
                  Selesai ({completedStCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of ST Cards (selaras dengan card Beranda) */}
            <View style={styles.listStack}>
              {filteredStList.length === 0 ? (
                <View style={[styles.emptySubStateCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                  <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Belum Ada Surat Tugas</Text>
                  <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                    Tidak ada daftar penugasan dinas pada kategori filter ini.
                  </Text>
                </View>
              ) : (
                filteredStList.map((stItem: any, idx: number) => {
                  const isRunning = isRunningSt(stItem);
                  const stBadge = getTonePalette(colors, isRunning ? "accent" : "neutral");
                  const iconColor = isRunning ? colors.accentFg : colors.textMuted;
                  return (
                    <TouchableOpacity
                      key={stItem.id || idx}
                      activeOpacity={0.88}
                      onPress={() => handleOpenStPreview(stItem)}
                    >
                      <GlassCard
                        style={[
                          styles.activeDutyCard,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: isRunning ? colors.accentSoftBorder : colors.glassBorder,
                          },
                          shadowXs,
                        ]}
                      >
                        <View style={styles.activeDutyHeader}>
                          <View style={[styles.activeDutyBadge, { backgroundColor: stBadge.bg, borderColor: stBadge.border }]}>
                            <Text style={[styles.activeDutyBadgeText, { color: stBadge.fg }]}>
                              {isRunning ? "SEDANG DINAS" : "SELESAI & LAPOR"}
                            </Text>
                          </View>
                          <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                            {stItem.nomor_surat || stItem.nomor || `ST.0${idx + 1}/K.18/TU/KSA/2026`}
                          </Text>
                        </View>

                        <Text style={[styles.activeDutyTitle, { color: colors.textDark }]} numberOfLines={2}>
                          {extractSuratTugasDalamRangka(stItem.maksud_tujuan || stItem.kegiatan, stItem.tempat_tujuan) || "Penugasan Kedinasan Resmi BKSDA"}
                        </Text>

                        <View style={styles.activeDutyMetaStack}>
                          <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={r.size.iconSm} color={iconColor} />
                            <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                              {`${formatDateIndo(stItem.tanggal_mulai)} – ${formatDateIndo(stItem.tanggal_selesai)}`}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={r.size.iconSm} color={iconColor} />
                            <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                              {stItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"}
                            </Text>
                          </View>
                          {Boolean(formatSumberDanaLabel(stItem)) && (
                            <View style={styles.metaItem}>
                              <Ionicons name="wallet-outline" size={r.size.iconSm} color={iconColor} />
                              <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                                {formatSumberDanaLabel(stItem)}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
                          <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                            {isRunning ? "SPPD Aktif" : "Laporan Pelaksanaan Terunggah ✓"}
                          </Text>
                          <View style={styles.activeDutyFooterAction}>
                            <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Surat</Text>
                            <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
                          </View>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Quick Helper Strip */}
            <View style={[styles.quickPromptStrip, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }, shadowXs]}>
              <Ionicons name="information-circle-outline" size={r.size.iconLg} color={colors.infoFg} style={styles.stripIcon} />
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
                <View style={styles.serviceStack}>
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
                        <Ionicons name="briefcase-outline" size={r.size.iconLg} color={colors.accentFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Aset Saya</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {myAssetsList.length > 0
                            ? `${myAssetsList.length} Barang Milik Negara terdaftar atas nama Anda`
                            : "Belum ada BMN tetap yang ditugaskan"}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.accentFg }]}>
                            {myAssetsList.length > 0 ? `Buka Daftar (${myAssetsList.length}) ›` : "Lihat Rincian"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
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
                        <Ionicons name="swap-horizontal-outline" size={r.size.iconLg} color={colors.infoFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {activeLoansList.length > 0
                            ? `${activeLoansList.length} Unit Dipinjam: ${activeLoansList.map((l: any) => l.nama_barang).slice(0, 2).join(", ")}`
                            : "Tidak ada pinjaman BMN yang sedang berjalan"}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.infoFg }]}>
                            {activeLoansList.length > 0 ? `${activeLoansList.length} Unit Berjalan ›` : "Status: Bersih"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 3. Riwayat Pengajuan Cuti -> Opens Cuti Sub-screen */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setLayananSubScreen("cuti")}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                        <Ionicons name="calendar-outline" size={r.size.iconLg} color={colors.warningFg} />
                      </View>
                      <View style={styles.serviceMain}>
                        <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                        <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                          {`Sisa Kuota: ${resolvedSisaCuti ?? "—"} Hari Kerja • ${displayLeaveRequests.length} Pengajuan Arsip`}
                        </Text>
                        <View style={[styles.serviceBadge, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.warningFg }]}>Buka Arsip Pertahun ›</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>

                  {/* 4. Kalkulator Dinas (SBM) -> Stays Ergonomic Modal */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSbmModalVisible(true)}
                  >
                    <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                      <View style={[styles.serviceIconBg, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                        <Ionicons name="calculator-outline" size={r.size.iconLg} color={colors.accentFg} />
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
                      <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>
                </View>

                {/* Helpdesk Strip dengan Spacing Lega */}
                <View style={[styles.helpdeskStrip, styles.layananHelpdeskSpacing, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }, shadowXs]}>
                  <View style={[styles.helpdeskIconCircle, { backgroundColor: colors.cardBg, borderColor: colors.accentSoftBorder }]}>
                    <Ionicons name="shield-checkmark" size={r.size.iconLg} color={colors.accentFg} />
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
                    <Ionicons name="arrow-back" size={r.size.iconLg} color={colors.textDark} />
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
                      Aset Tetap ({myAssetsList.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bmnSegmentBtn, bmnActiveTab === "pinjaman" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
                    onPress={() => setBmnActiveTab("pinjaman")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bmnSegmentText, { color: bmnActiveTab === "pinjaman" ? colors.accentFg : colors.textMuted }, bmnActiveTab === "pinjaman" && styles.bmnSegmentTextActive]}>
                      Pinjaman Berjalan ({activeLoansList.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar Input */}
                <View style={[styles.searchBarWrapper, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                  <Ionicons name="search-outline" size={r.size.iconMd} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textDark }]}
                    placeholder={bmnActiveTab === "aset" ? "Cari nama barang, merk, atau NUP..." : "Cari pinjaman aktif..."}
                    placeholderTextColor={colors.textMuted}
                    value={bmnSearchQuery}
                    onChangeText={setBmnSearchQuery}
                  />
                  {bmnSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBmnSearchQuery("")}>
                      <Ionicons name="close-circle" size={r.size.iconMd} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Pills (Only when Aset Tetap tab is active) */}
                {bmnActiveTab === "aset" && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPillScrollView} contentContainerStyle={styles.catPillContent}>
                    {[
                      { key: "all", label: `Semua (${bmnCategoryCounts.all})` },
                      { key: "kendaraan", label: `Kendaraan (${bmnCategoryCounts.kendaraan})` },
                      { key: "it", label: `IT & PC (${bmnCategoryCounts.it})` },
                      { key: "peralatan", label: `Peralatan (${bmnCategoryCounts.peralatan})` },
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

                {/* Web-Parity View Switcher Toolbar (Default Grid + Toggle List) */}
                <View style={styles.bmnViewToolbar}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {bmnActiveTab === "aset"
                      ? `Daftar Aset Tetap (${filteredBmnAssets.length})`
                      : `Daftar Pinjaman Aktif (${filteredBmnLoans.length})`}
                  </Text>
                  <View style={[styles.bmnViewToggleBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                    <TouchableOpacity
                      style={[
                        styles.bmnViewToggleBtn,
                        bmnViewMode === "grid" && { backgroundColor: colors.accentSolid },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setBmnViewMode("grid")}
                      accessibilityLabel="Tampilan Grid"
                    >
                      <Ionicons
                        name="grid-outline"
                        size={r.size.iconMd}
                        color={bmnViewMode === "grid" ? colors.accentOnSolid : colors.textMuted}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.bmnViewToggleBtn,
                        bmnViewMode === "list" && { backgroundColor: colors.accentSolid },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setBmnViewMode("list")}
                      accessibilityLabel="Tampilan List"
                    >
                      <Ionicons
                        name="list-outline"
                        size={r.size.iconMd}
                        color={bmnViewMode === "list" ? colors.accentOnSolid : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items Grid (Default) / List View */}
                {activeBmnItems.length === 0 ? (
                  <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                    <Ionicons
                      name={bmnActiveTab === "aset" ? "cube-outline" : "checkmark-circle-outline"}
                      size={r.size.iconEmpty}
                      color={bmnActiveTab === "aset" ? colors.textMuted : colors.successFg}
                    />
                    <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>
                      {bmnActiveTab === "aset" ? "Tidak Ada Aset Ditemukan" : "Tidak Ada Pinjaman Aktif"}
                    </Text>
                    <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                      {bmnActiveTab === "aset"
                        ? `Tidak ada Barang Milik Negara yang sesuai dengan filter pencarian "${bmnSearchQuery}".`
                        : "Seluruh alat dinas lapangan telah dikembalikan secara tertib ke petugas BMN Balai KSDA Kaltim."}
                    </Text>
                  </View>
                ) : bmnViewMode === "grid" ? (
                  <View style={styles.bmnGrid}>
                    {activeBmnItems.map((item: any, idx: number) => {
                      const isLoanTab = bmnActiveTab === "pinjaman";
                      const isLate = isLoanTab && isLoanOverdue(item);
                      const photo = getPrimaryAssetPhoto(item);
                      const thumbKey = `${bmnActiveTab}-grid-${item.loan_id || item.id || idx}`;
                      const showPhoto = Boolean(photo && !failedBmnThumbs[thumbKey]);
                      const condInfo = formatAssetCondition(item.kondisi);
                      const condPal = getTonePalette(colors, condInfo.tone);
                      const loanBadgePal = getTonePalette(colors, isLate ? "danger" : "info");
                      const merkDisplay = formatAssetMerkTipe(item);
                      const assetLokasi = item.lokasi || item.lokasi_ruang || item.lokasi_spesifik || "Balai KSDA";
                      const dueRaw = item.due_date || item.tanggal_kembali;
                      const dueDaysLeft = dueRaw
                        ? Math.ceil((new Date(dueRaw).getTime() - loanCheckNowTs) / 86400000)
                        : null;

                      return (
                        <View key={thumbKey} style={styles.bmnGridCol}>
                          <GlassCard
                            style={[
                              styles.bmnGridCard,
                              {
                                backgroundColor: colors.cardBg,
                                borderColor: isLate ? colors.dangerBorder : colors.glassBorder,
                              },
                              shadowXs,
                            ]}
                          >
                            {/* Top Photo / Placeholder Container */}
                            <View style={[styles.bmnGridPhotoWrap, { backgroundColor: colors.surfaceMuted, borderBottomColor: colors.glassBorder }]}>
                              {showPhoto ? (
                                <Image
                                  source={{ uri: photo!.url }}
                                  style={styles.bmnGridPhoto}
                                  resizeMode="cover"
                                  onError={() =>
                                    setFailedBmnThumbs((prev) => ({ ...prev, [thumbKey]: true }))
                                  }
                                />
                              ) : (
                                <View style={styles.bmnGridNoPhoto}>
                                  <Ionicons name="camera-outline" size={r.size.iconLg} color={colors.textMuted} />
                                  <Text style={[styles.bmnGridNoPhotoText, { color: colors.textMuted }]}>
                                    Belum ada foto
                                  </Text>
                                </View>
                              )}

                              {item.no_polisi && (
                                <View style={[styles.bmnGridPlateBadge, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                                  <Text style={[styles.bmnGridPlateText, { color: colors.infoFg }]} numberOfLines={1}>
                                    {item.no_polisi}
                                  </Text>
                                </View>
                              )}

                              {isLoanTab && (
                                <View
                                  style={[
                                    styles.bmnGridHeroBadge,
                                    {
                                      backgroundColor: isLate ? colors.dangerSolid : loanBadgePal.bg,
                                      borderColor: isLate ? colors.dangerSolid : loanBadgePal.border,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.bmnGridHeroBadgeText,
                                      { color: isLate ? colors.accentOnSolid : loanBadgePal.fg },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {isLate ? "TERLAMBAT" : "DIPINJAM"}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Card Body: Nama + Merk/Tipe top, Jenis & Lokasi + Footer anchored bottom */}
                            <View style={styles.bmnGridBody}>
                              <View>
                                <Text style={[styles.bmnGridTitle, { color: colors.textDark }]} numberOfLines={2}>
                                  {item.nama_barang}
                                </Text>
                                <Text style={[styles.bmnGridSub, { color: colors.textMuted }]} numberOfLines={2}>
                                  {merkDisplay}
                                </Text>
                              </View>

                              <View style={styles.bmnGridBottom}>
                                <View style={[styles.bmnGridMetaBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                                  {isLoanTab ? (
                                    <>
                                      <View style={styles.bmnGridMetaRow}>
                                        <Text style={[styles.bmnGridMetaKey, { color: colors.textMuted }]}>Pinjam</Text>
                                        <Text style={[styles.bmnGridMetaVal, { color: colors.textDark }]} numberOfLines={1}>
                                          {formatDateIndo(item.loan_date)}
                                        </Text>
                                      </View>
                                      <View style={styles.bmnGridMetaRow}>
                                        <Text style={[styles.bmnGridMetaKey, { color: colors.textMuted }]}>Batas</Text>
                                        <Text
                                          style={[
                                            styles.bmnGridMetaVal,
                                            { color: isLate ? colors.dangerFg : colors.textDark },
                                          ]}
                                          numberOfLines={1}
                                        >
                                          {formatDateIndo(dueRaw)}
                                        </Text>
                                      </View>
                                    </>
                                  ) : (
                                    <>
                                      <View style={styles.bmnGridMetaRow} accessible accessibilityLabel={`Jenis aset: ${item.jenis_bmn || "BMN"}`}>
                                        <Ionicons name="cube-outline" size={r.size.iconSm} color={colors.textMuted} accessible={false} />
                                        <Text style={[styles.bmnGridMetaVal, { color: colors.textDark, textAlign: "left" }]} numberOfLines={1}>
                                          {item.jenis_bmn || "BMN"}
                                        </Text>
                                      </View>
                                      <View style={styles.bmnGridMetaRow} accessible accessibilityLabel={`Lokasi aset: ${assetLokasi}`}>
                                        <Ionicons name="location-outline" size={r.size.iconSm} color={colors.textMuted} accessible={false} />
                                        <Text style={[styles.bmnGridMetaVal, { color: colors.textDark, textAlign: "left" }]} numberOfLines={1}>
                                          {assetLokasi}
                                        </Text>
                                      </View>
                                    </>
                                  )}
                                </View>

                                {/* Footer */}
                                <View style={[styles.bmnGridFooter, { borderTopColor: colors.glassBorder }]}>
                                  <View style={styles.bmnGridFooterIdCol}>
                                    <Text style={[styles.bmnGridCode, { color: colors.textMuted }]} numberOfLines={1}>
                                      {item.kode_barang || "-"}
                                    </Text>
                                    <Text style={[styles.bmnGridNup, { color: colors.textDark }]} numberOfLines={1}>
                                      {`NUP: ${item.nup || "-"}`}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.bmnGridCondPill,
                                      isLoanTab
                                        ? { backgroundColor: loanBadgePal.bg, borderColor: loanBadgePal.border }
                                        : { backgroundColor: condPal.bg, borderColor: condPal.border },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.bmnGridCondText,
                                        { color: isLoanTab ? loanBadgePal.fg : condPal.fg },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {isLoanTab
                                        ? isLate
                                          ? "Lewat"
                                          : dueDaysLeft !== null && dueDaysLeft >= 0
                                          ? `${dueDaysLeft} Hari`
                                          : "Aktif"
                                        : condInfo.shortLabel}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </GlassCard>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.bmnListStack}>
                    {activeBmnItems.map((item: any, idx: number) => {
                      const isLoanTab = bmnActiveTab === "pinjaman";
                      const isLate = isLoanTab && isLoanOverdue(item);
                      const photo = getPrimaryAssetPhoto(item);
                      const thumbKey = `${bmnActiveTab}-list-${item.loan_id || item.id || idx}`;
                      const showPhoto = Boolean(photo && !failedBmnThumbs[thumbKey]);
                      const condInfo = formatAssetCondition(item.kondisi);
                      const condPal = getTonePalette(colors, condInfo.tone);
                      const loanPal = getTonePalette(colors, isLate ? "danger" : "info");
                      const merkDisplay = formatAssetMerkTipe(item);
                      const assetLokasi = item.lokasi || item.lokasi_ruang || item.lokasi_spesifik || "Balai KSDA";
                      const dueRaw = item.due_date || item.tanggal_kembali;
                      const dueDaysLeft = dueRaw
                        ? Math.ceil((new Date(dueRaw).getTime() - loanCheckNowTs) / 86400000)
                        : null;

                      return (
                        <GlassCard
                          key={thumbKey}
                          style={[styles.bmnDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
                        >
                          <View style={styles.bmnDetailHeader}>
                            <View
                              style={[
                                styles.bmnIconBox,
                                isLoanTab
                                  ? { backgroundColor: loanPal.bg, borderColor: loanPal.border }
                                  : { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
                              ]}
                            >
                              {showPhoto ? (
                                <Image
                                  source={{ uri: photo!.url }}
                                  style={styles.bmnThumbImg}
                                  resizeMode="cover"
                                  onError={() =>
                                    setFailedBmnThumbs((prev) => ({ ...prev, [thumbKey]: true }))
                                  }
                                />
                              ) : (
                                <Ionicons
                                  name={
                                    isLoanTab
                                      ? "swap-horizontal-outline"
                                      : item.no_polisi
                                      ? "car-outline"
                                      : item.kategori === "it"
                                      ? "laptop-outline"
                                      : "cube-outline"
                                  }
                                  size={r.size.iconLg}
                                  color={isLoanTab ? loanPal.fg : colors.accentFg}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.bmnItemTitle, { color: colors.textDark }]} numberOfLines={2}>
                                {item.nama_barang}
                              </Text>
                              <Text style={[styles.bmnItemSub, { color: colors.textMuted }]} numberOfLines={2}>
                                {merkDisplay}
                              </Text>
                              <Text style={[styles.bmnItemCode, { color: colors.textMuted }]} numberOfLines={1}>
                                {`${item.kode_barang || "-"} • NUP: ${item.nup || "-"}`}
                                {item.no_polisi ? ` • ${item.no_polisi}` : ""}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.bmnConditionBadge,
                                isLoanTab
                                  ? { backgroundColor: loanPal.bg, borderColor: loanPal.border }
                                  : { backgroundColor: condPal.bg, borderColor: condPal.border },
                              ]}
                            >
                              <Text style={[styles.bmnConditionText, { color: isLoanTab ? loanPal.fg : condPal.fg }]}>
                                {isLoanTab ? (isLate ? "TERLAMBAT" : String(item.status || "DIPINJAM").toUpperCase()) : condInfo.label}
                              </Text>
                            </View>
                          </View>

                          {isLoanTab ? (
                            <View style={[styles.loanMetaGrid, { borderTopColor: colors.glassBorder }]}>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                                <Text style={[styles.loanMetaVal, { color: colors.textDark }]}>
                                  {formatDateIndo(item.loan_date)}
                                </Text>
                              </View>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                                <Text style={[styles.loanMetaVal, { color: isLate ? colors.dangerFg : colors.textDark }]}>
                                  {formatDateIndo(dueRaw)}
                                </Text>
                              </View>
                              <View style={styles.loanMetaCol}>
                                <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>STATUS</Text>
                                <Text style={[styles.loanMetaVal, { color: loanPal.fg }]}>
                                  {isLate
                                    ? "Terlambat"
                                    : dueDaysLeft !== null && dueDaysLeft >= 0
                                    ? `Sisa ${dueDaysLeft} Hari`
                                    : "Aktif"}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={[styles.bmnLocationRow, { borderTopColor: colors.glassBorder }]}>
                              <Ionicons name="location-outline" size={r.size.iconSm} color={colors.accentFg} style={styles.inlineIcon} />
                              <Text style={[styles.bmnLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                                {`${item.jenis_bmn || "BMN"} • ${assetLokasi}`}
                              </Text>
                            </View>
                          )}
                        </GlassCard>
                      );
                    })}
                  </View>
                )}
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
                    <Ionicons name="arrow-back" size={r.size.iconLg} color={colors.textDark} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subScreenTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
                    <Text style={[styles.subScreenSubtitle, { color: colors.textMuted }]}>
                      Arsip Permohonan & Penetapan Izin Cuti ASN
                    </Text>
                  </View>
                </View>

                {/* Grouped quota summary; brand color is reserved for the application action. */}
                <View style={[styles.cutiHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                  <View style={[styles.cutiHeroTopRow, { borderBottomColor: colors.glassBorder }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cutiHeroLabel, { color: colors.textMuted }]}>{`SISA KUOTA CUTI ${cutiCurrentYear}`}</Text>
                      <Text style={[styles.cutiHeroValue, { color: colors.textDark }]}>{`${resolvedSisaCuti ?? "—"} Hari Kerja`}</Text>
                      {cutiPendingHari > 0 && (
                        <Text style={[styles.cutiHeroPendingNote, { color: colors.textMuted }]}>
                          {`${cutiPendingHari} Hari sedang proses pengajuan`}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.cutiHeroActionBtn, { backgroundColor: colors.accentSolid, borderColor: colors.accentSolid }]}
                      onPress={() => setCutiModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={r.size.iconMd} color={colors.accentOnSolid} style={styles.inlineIcon} />
                      <Text style={[styles.cutiHeroActionText, { color: colors.accentOnSolid }]}>Ajukan Cuti</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cutiQuotaStrip}>
                    <View style={[styles.cutiQuotaCell, { borderRightColor: colors.glassBorder }]}>
                      <Text style={[styles.cutiQuotaLabel, { color: colors.textMuted }]}>Hak Tahun N</Text>
                      <Text style={[styles.cutiQuotaVal, { color: colors.textDark }]}>{cutiHakN != null ? `${cutiHakN} Hari` : "—"}</Text>
                    </View>
                    <View style={[styles.cutiQuotaCell, { borderRightColor: colors.glassBorder }]}>
                      <Text style={[styles.cutiQuotaLabel, { color: colors.textMuted }]}>{cutiSisaN2 > 0 ? "Sisa N-1 & N-2" : "Sisa N-1"}</Text>
                      <Text style={[styles.cutiQuotaVal, { color: colors.textDark }]}>{leaveBalance && [leaveBalance.hak_n1_diakui, leaveBalance.sisa_cuti_n1, leaveBalance.hak_n2_diakui].some(value => value != null) ? `${cutiSisaN1 + cutiSisaN2} Hari` : "—"}</Text>
                    </View>
                    <View style={[styles.cutiQuotaCell, { borderRightWidth: 0 }]}>
                      <Text style={[styles.cutiQuotaLabel, { color: colors.textMuted }]}>Terpakai</Text>
                      <Text style={[styles.cutiQuotaVal, { color: colors.textDark }]}>{cutiTerpakai != null ? `${cutiTerpakai} Hari` : "—"}</Text>
                    </View>
                  </View>
                </View>

                {/* Dynamic Horizontal Year Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.catPillScrollView}
                  contentContainerStyle={styles.yearPillsContainer}
                >
                  {cutiYearOptions.map((p) => {
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
                </ScrollView>

                {/* Leave Cards List */}
                <View style={[styles.listStack, styles.leaveListGap]}>
                  {filteredLeaveRequests.length === 0 ? (
                    <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                      <Ionicons name="calendar-outline" size={r.size.iconEmpty} color={colors.warningFg} />
                      <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Pengajuan Cuti</Text>
                      <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                        Tidak ada riwayat cuti tercatat untuk filter tahun yang dipilih.
                      </Text>
                    </View>
                  ) : (
                    filteredLeaveRequests.map((req: any, idx: number) => {
                      const statusMeta = getLeaveStatusMeta(req);
                      const badgePal = getTonePalette(colors, statusMeta.kind === "approved" || statusMeta.kind === "verified" ? "neutral" : statusMeta.tone);
                      const cleanAlasan =
                        !req.alasan_cuti || String(req.alasan_cuti).toLowerCase().includes("sisa cuti")
                          ? `Sesuai ketentuan ${req.jenis_cuti || "Cuti"}`
                          : req.alasan_cuti;

                      return (
                        <GlassCard
                          key={req.id || idx}
                          style={[styles.leaveDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
                        >
                          <View style={styles.leaveCardHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.leaveTitleRow}>
                                <Text style={[styles.leaveItemTitle, { color: colors.textDark }]}>
                                  {req.jenis_cuti || "Cuti Tahunan"}
                                </Text>
                                <View style={[styles.bmnConditionBadge, { backgroundColor: badgePal.bg, borderColor: badgePal.border }]}>
                                  <Text style={[styles.bmnConditionText, { color: badgePal.fg }]}>
                                    {statusMeta.label.toUpperCase()}
                                  </Text>
                                </View>
                              </View>
                              {req.nomor_pengajuan ? (
                                <Text style={[styles.leaveNomorText, { color: colors.textMuted }]}>
                                  {req.nomor_pengajuan}
                                </Text>
                              ) : (
                                <Text style={[styles.leaveNomorEmpty, { color: colors.textMuted }]}>
                                  (Nomor surat penetapan belum diterbitkan)
                                </Text>
                              )}
                            </View>

                            <View style={[styles.leaveDaysPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                              <Text style={[styles.leaveDaysPillText, { color: colors.textDark }]}>
                                {`${req.jumlah_hari || 1} Hari`}
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.leavePeriodBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                            <Ionicons name="calendar-outline" size={r.size.iconSm} color={colors.accentFg} style={styles.inlineIcon} />
                            <Text style={[styles.leaveDateText, { color: colors.textDark }]}>
                              {`${formatDateIndo(req.tanggal_mulai)} s/d ${formatDateIndo(req.tanggal_selesai)}`}
                            </Text>
                          </View>

                          <Text style={[styles.leaveAlasanFullText, { color: colors.textSecondary }]}>
                            <Text style={[styles.leaveAlasanLabel, { color: colors.textDark }]}>Alasan: </Text>
                            {cleanAlasan}
                          </Text>

                          {Boolean(req.catatan_atasan) && (
                            <View style={[styles.leaveApprovalNote, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                              <Text style={[styles.leaveApprovalNoteText, { color: colors.textSecondary }]}>
                                <Text style={styles.leaveApprovalNoteStrong}>Catatan Persetujuan: </Text>
                                {req.catatan_atasan}
                              </Text>
                            </View>
                          )}

                          <View style={[styles.leaveCardFooter, { borderTopColor: colors.glassBorder }]}>
                            <Text style={[styles.leaveAppliedDate, { color: colors.textMuted }]}>
                              {`Tgl: ${formatDateIndo(req.tanggal_pengajuan || req.tanggal_mulai)}`}
                            </Text>
                            {renderLeaveCardActions(req)}
                          </View>
                        </GlassCard>
                      );
                    })
                  )}
                </View>
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
                Identitas, kontak dan pengaturan akun Balai KSDA Kaltim
              </Text>
            </View>

            {/* Profile Hero Card */}
            <GlassCard style={[styles.profileHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ubah foto profil" disabled={!profileEmployee} onPress={() => setProfileSetting("photo")} style={[styles.profileAvatarBig, { backgroundColor: colors.accentSolid }]}>
                {profilePhoto && failedProfilePhoto !== profilePhoto ? <Image source={{uri:profilePhoto}} style={styles.profilePhoto} accessibilityLabel={`Foto ${profileName}`} onError={() => setFailedProfilePhoto(profilePhoto)} /> : <Text style={[styles.profileAvatarText, { color: colors.accentOnSolid }]}>{profileName.charAt(0).toUpperCase()}</Text>}
                {!!profileEmployee && <View style={[styles.profileCamera, {backgroundColor:colors.cardBg,borderColor:colors.glassBorder}]}><Ionicons name="camera-outline" size={16} color={colors.accentFg} /></View>}
              </TouchableOpacity>
              <View style={styles.profileHeroMain}>
                <Text style={[styles.profileHeroName, { color: colors.textDark }]}>{profileName}</Text>
                <Text selectable style={[styles.profileHeroNip, { color: colors.textMuted }]}>{profileEmployee?.nip ? `NIP: ${profileEmployee.nip}` : `Username: ${user?.username || "—"}`}</Text>
                <Text style={[styles.profileHeroJabatan, { color: colors.accentFg }]}>{profileEmployee?.position || "Jabatan belum diisi"}</Text>
                <Text style={[styles.profileHeroUnit, { color: colors.textMuted }]}>{profileEmployee?.department || (profileEmployee ? "Unit kerja belum diisi" : "Akun belum terhubung dengan data pegawai")}</Text>
              </View>
            </GlassCard>

            {/* 2 Metric Pills in Profile */}
            <View style={styles.profileMetricsRow}>
              <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>SISA CUTI TAHUNAN</Text>
                <Text style={[styles.profileMetricValue, { color: colors.warningFg }]}>{profileLeaveLabel}</Text>
              </GlassCard>
              <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>TOTAL ASET DIPEGANG</Text>
                <Text style={[styles.profileMetricValue, { color: colors.accentFg }]}>
                  {`${myAssetsList.length} Aset (${activeLoansList.length} Pinjaman)`}
                </Text>
              </GlassCard>
            </View>

            {!!profileNotice && <Text accessibilityLiveRegion="polite" style={[styles.profileContactValue,{color:colors.accentFg,marginBottom:12}]}>{profileNotice}</Text>}
            <GlassCard style={[styles.profileContactCard,{backgroundColor:colors.cardBg,borderColor:colors.glassBorder},shadowXs]}>
              <View style={styles.profileContactHeading}><Text style={[styles.profileContactTitle,{color:colors.textDark}]}>Informasi kontak</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit informasi kontak" onPress={() => {setProfileNotice("");setProfileSetting("contact");}} style={styles.profileEditButton}><Ionicons name="create-outline" size={21} color={colors.accentFg}/></TouchableOpacity></View>
              {[["Email",profileEmployee?.email || user?.email],["Telepon",profileEmployee?.phone],["Username",user?.username]].map(([label,value])=><View key={label} style={styles.profileContactRow}><Text style={[styles.profileContactLabel,{color:colors.textMuted}]}>{label}</Text><Text selectable style={[styles.profileContactValue,{color:colors.textDark}]}>{value || "Belum diisi"}</Text></View>)}
            </GlassCard>

            {/* Profile Menu Actions List */}
            <View style={styles.profileMenuStack}>
              {[
                {
                  label: "Data Pangkat, Jabatan & Unit Kerja",
                  icon: "ribbon-outline",
                  color: colors.infoFg,
                  action: () => setProfileSetting("employment"),
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
                  action: () => {setActiveTab("layanan");setLayananSubScreen("cuti");},
                },
                {
                  label: "Keamanan Akun & Ubah Kata Sandi",
                  icon: "shield-checkmark-outline",
                  color: colors.textSecondary,
                  action: () => setProfilePasswordVisible(true),
                },
                {
                  label: "Perbarui Data Profil",
                  icon: "refresh-outline",
                  color: colors.accentFg,
                  action: async () => {await refreshUser();refreshAllPortalData();setProfileNotice("Data profil diperbarui.");},
                },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={item.action}
                >
                  <GlassCard style={[styles.profileMenuItem, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
                    <Ionicons name={item.icon as any} size={r.size.iconMd} color={item.color} style={styles.btnIcon} />
                    <Text style={[styles.profileMenuItemLabel, { color: colors.textDark }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }, shadowXs]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Keluar Akun (Logout)"
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={r.size.iconMd} color={colors.dangerFg} style={styles.btnIcon} />
              <Text style={[styles.logoutBtnText, { color: colors.dangerFg }]}>Keluar Akun (Logout)</Text>
            </TouchableOpacity>
          </>
        )}
        </AnimateUiScreen>
      </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* FLOATING BOTTOM NAVIGATION (EXACT 5 ITEMS: BERANDA, TUGAS, FAB, LAYANAN, PROFIL) */}
      {/* ========================================================================= */}
      <View style={[styles.bottomNavContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
        {/* 1. Beranda */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("dashboard")}>
          <Ionicons
            name="home-outline"
            size={r.size.iconLg}
            color={activeTab === "dashboard" ? colors.accentFg : colors.textMuted}
          />
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "dashboard" ? colors.accentFg : colors.textMuted }]}>
            Beranda
          </Text>
        </TouchableOpacity>

        {/* 2. Tugas */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("surattugas")}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name="document-text-outline"
              size={r.size.iconLg}
              color={activeTab === "surattugas" ? colors.accentFg : colors.textMuted}
            />
            {stBadgeCount > 0 && <View style={[styles.navBadge, { backgroundColor: colors.dangerSolid }]} />}
          </View>
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "surattugas" ? colors.accentFg : colors.textMuted }]}>
            Tugas
          </Text>
        </TouchableOpacity>

        {/* 3. Center Elevated FAB (+) -> Opens Modal */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: colors.accentSolid, borderColor: colors.cardBg }, shadowLg]}
            onPress={() => setFabModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Buka aksi cepat"
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={r.size.iconXl} color={colors.accentOnSolid} />
          </TouchableOpacity>
        </View>

        {/* 4. Layanan Terpadu ASN */}
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab("layanan"); setLayananSubScreen("menu"); }}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name="grid-outline"
              size={r.size.iconLg}
              color={activeTab === "layanan" ? colors.accentFg : colors.textMuted}
            />
            {assetsBadgeCount > 0 && <View style={[styles.navBadge, { backgroundColor: colors.dangerSolid }]} />}
          </View>
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "layanan" ? colors.accentFg : colors.textMuted }]}>
            Layanan
          </Text>
        </TouchableOpacity>

        {/* 5. Profil Pegawai */}
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("profile")}>
          <View style={styles.navIconWrapper}>
            <Ionicons
              name="person-outline"
              size={r.size.iconLg}
              color={activeTab === "profile" ? colors.accentFg : colors.textMuted}
            />
          </View>
          <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "profile" ? colors.accentFg : colors.textMuted }]}>
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      <PortalNotifications visible={notificationsVisible} model={notifications} onClose={() => setNotificationsVisible(false)} onSelect={type => {
        if(type === "surat_tugas") setActiveTab("surattugas");
        else if(type === "cuti" || type === "bmn") {setActiveTab("layanan");setLayananSubScreen(type === "cuti" ? "cuti" : "bmn");}
      }} />
      <ConfirmModal visible={logoutModalVisible} title="Konfirmasi Logout"
        message="Apakah Anda yakin ingin keluar dari SuperApp BKSDA Kaltim?"
        confirmText="Ya, Keluar" cancelText="Batal" variant="danger"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={() => {setLogoutModalVisible(false);void logout();}} />
      {profileSetting && <ProfileSettingsModal mode={profileSetting} onClose={() => setProfileSetting(null)} onSaved={message => {setProfileSetting(null);setProfileNotice(message);}} />}
      <ChangePasswordModal visible={profilePasswordVisible} onClose={() => setProfilePasswordVisible(false)} onSuccessLogout={() => {void logout();}} />

      {/* ========================================================================= */}
      {/* QUICK ACTION MODAL BOTTOM SHEET (CENTER FAB)                              */}
      {/* ========================================================================= */}
      <Modal
        visible={fabModalVisible}
        transparent={true}
        animationType="slide"
        onDismiss={() => {
          if (!pendingAssignmentNavigation.current) return;
          pendingAssignmentNavigation.current = false;
          // Let the web modal restore focus before the portal tab is hidden.
          if (Platform.OS === "web") (document.activeElement as HTMLElement | null)?.blur();
          onNavigateToModule?.("buat-surat-tugas");
        }}
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
                <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Option 1: Buat Surat Tugas (SPT) Baru */}
            <TouchableOpacity
              style={[styles.modalOptionCard, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}
              activeOpacity={0.8}
              onPress={() => {
                pendingAssignmentNavigation.current = Platform.OS === "web";
                setFabModalVisible(false);
                if (Platform.OS !== "web") onNavigateToModule?.("buat-surat-tugas");
              }}
            >
              <View style={[styles.modalOptionIconBg, { backgroundColor: colors.accentSolid }]}>
                <Ionicons name="document-text" size={r.size.iconLg} color={colors.accentOnSolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: colors.textDark }]}>Buat Surat Tugas (SPT) Baru</Text>
                <Text style={[styles.modalOptionDesc, { color: colors.textMuted }]}>
                  Ajukan penugasan dinas resmi, rute tujuan, jadwal pelaksanaan, dan pembebanan anggaran DIPA.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.accentFg} />
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
                <Ionicons name="calendar" size={r.size.iconLg} color={colors.accentOnSolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: colors.textDark }]}>Pengajuan Cuti Online</Text>
                <Text style={[styles.modalOptionDesc, { color: colors.textMuted }]}>
                  Cuti tahunan, sakit, melahirkan, atau alasan penting. Kuota Anda saat ini: {resolvedSisaCuti ?? "—"} Hari Kerja.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.warningFg} />
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
                <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: r.size.modalScrollMaxH }} showsVerticalScrollIndicator={false}>
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
                    const loanMerk = formatAssetMerkTipe(loan);
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
                            {loanMerk !== "-" && (
                              <Text style={[styles.bmnGridSub, { color: colors.textSecondary }]} numberOfLines={2}>
                                {loanMerk}
                              </Text>
                            )}
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
                <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
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
        balanceAvailable={resolvedSisaCuti != null}
        sisaCuti={Number(leaveBalance?.sisa_cuti_dapat_diajukan ?? Math.max(0, (resolvedSisaCuti ?? 0) - cutiPendingHari))}
        pendingCutiHari={cutiPendingHari}
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

      {/* Confirm Cancel Leave Request Modal */}
      <Modal
        visible={Boolean(cancelLeaveTarget)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isCancellingLeave && setCancelLeaveTarget(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
              <Ionicons name="alert-circle-outline" size={r.size.iconXl} color={colors.dangerFg} />
            </View>
            <Text style={[styles.confirmModalTitle, { color: colors.textDark }]}>
              Batalkan Pengajuan Cuti?
            </Text>
            <Text style={[styles.confirmModalDesc, { color: colors.textMuted }]}>
              {cancelLeaveTarget
                ? `Permohonan ${cancelLeaveTarget.jenis_cuti || "Cuti"} (${formatDateIndo(cancelLeaveTarget.tanggal_mulai)} s/d ${formatDateIndo(cancelLeaveTarget.tanggal_selesai)}) akan dihapus dari daftar pengajuan.`
                : ""}
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                disabled={isCancellingLeave}
                style={[styles.confirmModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
                onPress={() => setCancelLeaveTarget(null)}
              >
                <Text style={[styles.confirmModalBtnText, { color: colors.textSecondary }]}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isCancellingLeave}
                style={[styles.confirmModalBtn, { backgroundColor: colors.dangerSolid, borderColor: colors.dangerSolid }]}
                onPress={() => void handleConfirmCancelLeave()}
              >
                <Text style={[styles.confirmModalBtnText, { color: colors.accentOnSolid }]}>
                  {isCancellingLeave ? "Membatalkan..." : "Ya, Batalkan"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Scan Document Preview Modal (Surat Izin TTE / Formulir Scan) */}
      <Modal
        visible={leaveScanModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeLeaveScanModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.scanModalSheet, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />
            <View style={styles.menuModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuModalTitle, { color: colors.textDark }]} numberOfLines={1}>
                  {leaveScanModal.title}
                </Text>
                {leaveScanModal.fileName && (
                  <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {leaveScanModal.fileName}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={closeLeaveScanModal}
                accessibilityLabel="Tutup pratinjau berkas cuti"
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              >
                <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.scanModalBody, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
              {leaveScanModal.loading ? (
                <View style={styles.scanModalCenter}>
                  <ActivityIndicator size="large" color={colors.accentFg} />
                  <Text style={[styles.scanStatusText, { color: colors.textMuted }]}>
                    Memuat berkas scan resmi...
                  </Text>
                </View>
              ) : leaveScanModal.error ? (
                <View style={styles.scanModalCenter}>
                  <Ionicons name="document-outline" size={r.size.iconEmpty} color={colors.warningFg} />
                  <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Berkas Belum Tersedia</Text>
                  <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>{leaveScanModal.error}</Text>
                </View>
              ) : leaveScanModal.mimeType?.includes("image") && leaveScanModal.dataUrl ? (
                <Image
                  source={{ uri: leaveScanModal.dataUrl }}
                  style={styles.scanPreviewImg}
                  resizeMode="contain"
                />
              ) : Platform.OS === "web" && leaveScanModal.blobUrl ? (
                React.createElement("iframe", {
                  src: leaveScanModal.blobUrl,
                  title: leaveScanModal.title,
                  style: { width: "100%", height: "100%", border: "none", borderRadius: r.radius.inner },
                })
              ) : (
                <View style={styles.scanModalCenter}>
                  <Ionicons name="document-text-outline" size={r.size.iconEmpty} color={colors.accentFg} />
                  <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Dokumen PDF Siap Dibuka</Text>
                  <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                    Ketuk tombol di bawah untuk membuka atau menyimpan berkas scan.
                  </Text>
                  {leaveScanModal.dataUrl && (
                    <TouchableOpacity
                      style={[styles.scanOpenNativeBtn, { backgroundColor: colors.accentSolid }]}
                      onPress={async () => {
                        try {
                          const base64Body = String(leaveScanModal.dataUrl || "").split(",")[1];
                          const dir = FileSystem.cacheDirectory;
                          if (!base64Body || !dir) return;
                          const safeName = (leaveScanModal.fileName || "scan-cuti.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
                          const localUri = `${dir}${safeName}`;
                          await FileSystem.writeAsStringAsync(localUri, base64Body, {
                            encoding: FileSystem.EncodingType.Base64,
                          });
                          await openFile({
                            localUri,
                            mimeType: leaveScanModal.mimeType || "application/pdf",
                            dialogTitle: leaveScanModal.title,
                          });
                        } catch {
                          Alert.alert("Gagal", "Tidak dapat membuka berkas pada perangkat.");
                        }
                      }}
                    >
                      <Ionicons name="open-outline" size={r.size.iconMd} color={colors.accentOnSolid} style={styles.inlineIcon} />
                      <Text style={[styles.leavePrintOfficialText, { color: colors.accentOnSolid }]}>Buka Berkas PDF</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {Platform.OS === "web" && leaveScanModal.blobUrl && typeof document !== "undefined" && (
              <TouchableOpacity
                style={[styles.scanOpenNativeBtn, { backgroundColor: colors.accentSolid }]}
                onPress={() => {
                  const a = document.createElement("a");
                  a.href = leaveScanModal.blobUrl!;
                  a.download = leaveScanModal.fileName || "Dokumen_Cuti.pdf";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <Ionicons name="download-outline" size={r.size.iconMd} color={colors.accentOnSolid} style={styles.inlineIcon} />
                <Text style={[styles.leavePrintOfficialText, { color: colors.accentOnSolid }]}>Unduh Berkas</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
