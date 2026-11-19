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
import { PratinjauSuratTugasModal, PratinjauSuratTugasItem } from "../../components/PratinjauSuratTugasModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { ChangePasswordModal } from "../profile/ChangePasswordModal";
import { ProfileSettingsModal, type ProfileSetting } from "../profile/ProfileSettingsModal";
import { FormulirCutiModal } from "./FormulirCutiModal";
import { FormulirCutiPrintModal, LeaveRequestPrintData } from "../../components/FormulirCutiPrintModal";
import { PortalNotifications, usePortalNotifications } from "./PortalNotifications";
import { createPortalStyles } from "./portalStyles";
import { DashboardData } from "./types";
import { PortalProfileTab } from "./PortalProfileTab";
import { PortalServicesMenu } from "./PortalServicesMenu";
import { PortalAssetsView } from "./PortalAssetsView";
import { PortalLeaveView } from "./PortalLeaveView";
import type { PortalServiceScreen } from "./portalViewTypes";
import { formatAssetMerkTipe } from "./portalAssetHelpers";
import { usePortalData } from "./usePortalData";
import { PortalTasksTab, type PortalTaskFilter } from "./PortalTasksTab";
import { getTonePalette, extractSuratTugasDalamRangka, formatDateIndo, formatSumberDanaLabel, isRunningSt, getLeaveStatusMeta, type ToneKey } from "./portalHelpers";
export { extractSuratTugasDalamRangka } from "./portalHelpers";

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
  const [stFilter, setStFilter] = useState<PortalTaskFilter>("all");

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
  const [layananSubScreen, setLayananSubScreen] = useState<PortalServiceScreen>("menu");
  const [bmnActiveTab, setBmnActiveTab] = useState<"aset" | "pinjaman">("aset");
  const [bmnViewMode, setBmnViewMode] = useState<"grid" | "list">("grid");
  const [failedBmnThumbs, setFailedBmnThumbs] = useState<Record<string, boolean>>({});
  const [bmnSearchQuery, setBmnSearchQuery] = useState("");
  const [bmnCategoryFilter, setBmnCategoryFilter] = useState<string>("all");
  const [cutiYearFilter, setCutiYearFilter] = useState<number | "all">("all");

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

  const [pinjamanModalVisible, setPinjamanModalVisible] = useState(false);
  const {
    myStList, leaveRequests, leaveBalance, canFetchLeaveBalance,
    myAssetsList, activeLoansList, loanCheckNowTs,
    fetchMyLeaveRequests, fetchMyLeaveBalance, refreshAllPortalData,
  } = usePortalData(employee ?? user?.employee);

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

  const cutiPendingHari = Number(leaveBalance?.pending_cuti_tahunan ?? 0);

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
          <PortalTasksTab styles={styles} colors={colors} r={r} shadowXs={shadowXs}
            displayStList={displayStList} stFilter={stFilter} setStFilter={setStFilter}
            handleOpenStPreview={handleOpenStPreview} />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LAYANAN TERPADU ASN (MENU, SUB-SCREEN BMN, SUB-SCREEN CUTI)        */}
        {/* ========================================================================= */}
        {activeTab === "layanan" && (
          <>
            {/* SUB-VIEW 1: MENU UTAMA 4 KARTU LAYANAN */}
            {layananSubScreen === "menu" && (
              <PortalServicesMenu
                styles={styles} colors={colors} r={r} shadowXs={shadowXs}
                myAssetsList={myAssetsList} activeLoansList={activeLoansList} resolvedSisaCuti={resolvedSisaCuti} displayLeaveRequests={displayLeaveRequests}
                setLayananSubScreen={setLayananSubScreen} setBmnActiveTab={setBmnActiveTab} setSbmModalVisible={setSbmModalVisible} />
            )}
            {/* SUB-VIEW 2: DEDICATED FULL SCREEN INVENTARIS BMN SAYA */}
            {layananSubScreen === "bmn" && (
              <PortalAssetsView
                styles={styles} colors={colors} r={r} shadowXs={shadowXs}
                myAssetsList={myAssetsList} activeLoansList={activeLoansList} bmnActiveTab={bmnActiveTab} bmnSearchQuery={bmnSearchQuery}
                bmnCategoryFilter={bmnCategoryFilter} bmnViewMode={bmnViewMode} failedBmnThumbs={failedBmnThumbs} loanCheckNowTs={loanCheckNowTs}
                isLoanOverdue={isLoanOverdue} setLayananSubScreen={setLayananSubScreen} setBmnActiveTab={setBmnActiveTab} setBmnSearchQuery={setBmnSearchQuery}
                setBmnCategoryFilter={setBmnCategoryFilter} setBmnViewMode={setBmnViewMode} setFailedBmnThumbs={setFailedBmnThumbs} />
            )}
            {/* SUB-VIEW 3: DEDICATED FULL SCREEN RIWAYAT PENGAJUAN CUTI */}
            {layananSubScreen === "cuti" && (
              <PortalLeaveView
                styles={styles} colors={colors} r={r} shadowXs={shadowXs}
                leaveBalance={leaveBalance} resolvedSisaCuti={resolvedSisaCuti} cutiPendingHari={cutiPendingHari} cutiYearFilter={cutiYearFilter}
                displayLeaveRequests={displayLeaveRequests} setLayananSubScreen={setLayananSubScreen} setCutiModalVisible={setCutiModalVisible} setCutiYearFilter={setCutiYearFilter}
                renderLeaveCardActions={renderLeaveCardActions} />
            )}

          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROFIL PEGAWAI ASN (BOTTOM NAV 5: PALING AKHIR, LOGOUT)            */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <PortalProfileTab
            styles={styles} colors={colors} r={r} shadowXs={shadowXs}
            user={user} employee={employee} leaveBalance={leaveBalance} canFetchLeaveBalance={canFetchLeaveBalance}
            myAssetsList={myAssetsList} activeLoansList={activeLoansList} failedProfilePhoto={failedProfilePhoto} setFailedProfilePhoto={setFailedProfilePhoto}
            profileNotice={profileNotice} setProfileNotice={setProfileNotice} setProfileSetting={setProfileSetting} setActiveTab={setActiveTab}
            setLayananSubScreen={setLayananSubScreen} setProfilePasswordVisible={setProfilePasswordVisible} refreshUser={refreshUser} refreshAllPortalData={refreshAllPortalData}
            handleLogout={handleLogout} />
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
