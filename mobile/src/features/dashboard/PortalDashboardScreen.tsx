import React, { useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
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
    subtitle: "Surat Tugas & SDM",
    iconName: "people-outline",
    badgeBg: COLORS.badgeBlueBg,
    iconColor: COLORS.badgeBlueIcon,
  },
  {
    key: "bmn",
    title: "BMN",
    subtitle: "Barang Milik Negara",
    iconName: "cube-outline",
    badgeBg: COLORS.badgeEmeraldBg,
    iconColor: COLORS.badgeEmeraldIcon,
  },
  {
    key: "inventory",
    title: "Persediaan",
    subtitle: "Stok & Distribusi",
    iconName: "apps-outline",
    badgeBg: COLORS.badgeOrangeBg,
    iconColor: COLORS.badgeOrangeIcon,
  },
  {
    key: "dereporting",
    title: "DeReporting",
    subtitle: "Pelaporan Digital",
    iconName: "document-text-outline",
    badgeBg: COLORS.badgePurpleBg,
    iconColor: COLORS.badgePurpleIcon,
  },
  {
    key: "cms",
    title: "CMS Portal",
    subtitle: "Manajemen Konten",
    iconName: "grid-outline",
    badgeBg: COLORS.badgeTealBg,
    iconColor: COLORS.badgeTealIcon,
  },
  {
    key: "surat",
    title: "Persuratan",
    subtitle: "Surat & Disposisi",
    iconName: "mail-outline",
    badgeBg: COLORS.badgeMintBg,
    iconColor: COLORS.badgeMintIcon,
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
  const { user, employee } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("pinjaman");
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

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [cutiModalVisible, setCutiModalVisible] = useState(false);
  const [cutiPreviewItem, setCutiPreviewItem] = useState<LeaveRequestPrintData | null>(null);
  const [cutiPreviewVisible, setCutiPreviewVisible] = useState(false);

  const fetchMyLeaveRequests = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/me/leave-requests");
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setLeaveRequests(list);
    } catch {}
  }, []);

  const [myAssetsList, setMyAssetsList] = useState<any[]>([]);

  const fetchMyAssets = React.useCallback(async () => {
    if (!employee?.id) {
      setMyAssetsList([]);
      return;
    }
    try {
      const response = await apiClient.get<any>(`/bmn/assets?employee_id=${employee.id}`);
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setMyAssetsList(list);
    } catch {
      setMyAssetsList([]);
    }
  }, [employee]);

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
    fetchMyAssets();
  }, [fetchMySt, fetchMyLeaveRequests, fetchMyAssets]);

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
    "Super Admin System";

  const resolvedNip =
    userProfile?.nip ||
    employee?.nip ||
    user?.employee?.nip ||
    user?.username ||
    "superadmin";

  const avatarInitial = (resolvedName.charAt(0) || "S").toUpperCase();
  const summary = dashboardData?.summary;

  const accessibleModules = MODULES.filter((mod) => hasModule(user, mod.key));
  const stBadgeCount = summary?.active_my_letters_count || summary?.pending_my_letters_count || myStList.length || 0;
  const cutiBadgeCount = leaveRequests.length;
  const assetsBadgeCount = myAssetsList.length || summary?.assigned_assets_count || 0;

  const tabOptions = [
    { key: "pinjaman", label: "Pinjaman Aktif", icon: "swap-horizontal-outline", count: summary?.active_loans_count || 0 },
    { key: "aset", label: "Aset Saya", icon: "briefcase-outline", count: assetsBadgeCount },
    {
      key: "surattugas",
      label: "Surat Tugas",
      count: stBadgeCount,
      icon: "document-text-outline",
    },
    {
      key: "cuti",
      label: "Pengajuan Cuti Saya",
      count: cutiBadgeCount,
      icon: "calendar-outline",
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "pinjaman":
        if (summary && summary.active_loans_count > 0) {
          return (
            <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.contentItemRow}>
                <View style={styles.contentIconBg}>
                  <Ionicons name="swap-horizontal-outline" size={18} color="#059669" />
                </View>
                <View style={styles.contentMain}>
                  <Text style={[styles.contentTitle, { color: colors.textDark }]}>
                    {summary.active_loans_count} Peminjaman BMN Aktif
                  </Text>
                  <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                    Data tersinkronisasi dengan portal web BKSDA
                  </Text>
                  <Text style={styles.contentMeta}>Status: Aktif Dipinjam</Text>
                </View>
              </View>
            </GlassCard>
          );
        }
        return (
          <GlassCard style={[styles.tabContentCard, styles.emptyStateCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="swap-horizontal-outline" size={36} color="#cbd5e1" />
            </View>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Tidak ada pinjaman aktif saat ini
            </Text>
            <TouchableOpacity
              style={styles.actionLinkBtn}
              onPress={() => onNavigateToModule && onNavigateToModule("bmn")}
            >
              <Text style={styles.actionLinkText}>+ Ajukan Peminjaman BMN</Text>
            </TouchableOpacity>
          </GlassCard>
        );

      case "aset":
        if (myAssetsList.length > 0) {
          return (
            <View style={{ gap: 10 }}>
              {myAssetsList.map((assetItem, idx) => {
                const year = assetItem.tanggal_perolehan
                  ? new Date(assetItem.tanggal_perolehan).getFullYear()
                  : 2022;
                const merkType = assetItem.merk_tipe || assetItem.merk || assetItem.tipe || "-";
                const isBaik = assetItem.kondisi === "Baik";
                const isRusakRingan = assetItem.kondisi === "Rusak Ringan";
                const kondisiBg = isBaik ? "#ecfdf5" : isRusakRingan ? "#fffbe8" : "#fef2f2";
                const kondisiColor = isBaik ? "#059669" : isRusakRingan ? "#d97706" : "#dc2626";

                return (
                  <GlassCard key={assetItem.id || idx} style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
                    <View style={styles.contentItemRow}>
                      <View style={[styles.contentIconBg, { backgroundColor: "#ecfdf5" }]}>
                        <Ionicons name="cube" size={20} color="#059669" />
                      </View>
                      <View style={styles.contentMain}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.contentTitle, { color: colors.textDark }]} numberOfLines={1}>
                              {assetItem.nama_barang || assetItem.name || "Aset BMN"}
                            </Text>
                            <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                              {merkType} • {year}
                            </Text>
                          </View>
                          <View style={{ backgroundColor: kondisiBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                            <Text style={{ color: kondisiColor, fontSize: 10, fontWeight: "700" }}>
                              {assetItem.kondisi || "Baik"}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <View style={{ backgroundColor: "#ecfdf5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: "#059669", fontSize: 10, fontWeight: "700" }}>
                              Kode: {assetItem.kode_barang || "3150303005"}
                            </Text>
                          </View>
                          <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                            NUP: {assetItem.nup || "1"}
                          </Text>
                          <Text style={{ color: "#64748b", fontSize: 10, marginLeft: "auto" }}>
                            📍 {assetItem.lokasi_ruang || "Belum berlokasi"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          );
        } else if (summary && summary.assigned_assets_count > 0) {
          return (
            <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.contentItemRow}>
                <View style={styles.contentIconBg}>
                  <Ionicons name="car-sport-outline" size={18} color="#059669" />
                </View>
                <View style={styles.contentMain}>
                  <Text style={[styles.contentTitle, { color: colors.textDark }]}>
                    Aset Terpenuhi ({summary.assigned_assets_count} Unit)
                  </Text>
                  <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                    Kendaraan & barang di bawah tanggung jawab Anda
                  </Text>
                  <Text style={styles.contentMeta}>Status: Aktif Pegang</Text>
                </View>
              </View>
            </GlassCard>
          );
        }
        // Exact Web Portal Empty State Matching Screenshot 1
        return (
          <GlassCard style={[styles.tabContentCard, styles.emptyStateCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="briefcase-outline" size={44} color="#cbd5e1" />
            </View>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Tidak ada aset di bawah tanggung jawab Anda.
            </Text>
          </GlassCard>
        );

      case "surattugas":
        if (myStList.length > 0) {
          return (
            <View style={{ gap: 10 }}>
              {myStList.map((stItem, idx) => (
                <GlassCard key={stItem.id || idx} style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
                  <TouchableOpacity
                    style={styles.contentItemRow}
                    activeOpacity={0.7}
                    onPress={() => handleOpenStPreview(stItem)}
                  >
                    <View style={[styles.contentIconBg, { backgroundColor: "#ecfdf5" }]}>
                      <Ionicons name="document-text" size={20} color="#10b981" />
                    </View>
                    <View style={styles.contentMain}>
                      <Text style={[styles.contentTitle, { color: colors.textDark }]} numberOfLines={1}>
                        {stItem.maksud_tujuan || stItem.kegiatan || "Melaksanakan Perjalanan Dinas..."}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#a7f3d0" }}>
                          <Text style={{ color: "#059669", fontSize: 10, fontWeight: "700" }}>
                            {stItem.nomor_surat || stItem.nomor || "ST.1/K.18/TU/KSA.05.06/B/07/2026"}
                          </Text>
                        </View>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                          {stItem.tanggal_mulai && stItem.tanggal_selesai && stItem.tanggal_mulai.split('T')[0] === stItem.tanggal_selesai.split('T')[0]
                            ? formatDateIndo(stItem.tanggal_mulai)
                            : stItem.tanggal_mulai && stItem.tanggal_selesai
                            ? `${formatDateIndo(stItem.tanggal_mulai)} - ${formatDateIndo(stItem.tanggal_selesai)}`
                            : formatDateIndo(stItem.tanggal_mulai || "2026-07-28")}
                        </Text>
                      </View>
                    </View>

                    {/* Eye Preview Icon Button Matching Screenshot 2 */}
                    <TouchableOpacity
                      style={{ padding: 8, borderRadius: 8, backgroundColor: "#eff6ff" }}
                      onPress={() => handleOpenStPreview(stItem)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#2563eb" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </GlassCard>
              ))}
            </View>
          );
        }

        if (summary && (summary.active_my_letters_count > 0 || summary.pending_my_letters_count > 0)) {
          return (
            <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
              <TouchableOpacity
                style={styles.contentItemRow}
                activeOpacity={0.7}
                onPress={() => onNavigateToModule && onNavigateToModule("surat-tugas-personal")}
              >
                <View style={[styles.contentIconBg, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="document-text" size={20} color="#10b981" />
                </View>
                <View style={styles.contentMain}>
                  <Text style={[styles.contentTitle, { color: colors.textDark }]}>
                    ST.1/K.18/TU/KSA.05.06/B/07/2026
                  </Text>
                  <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                    Melaksanakan Perjalanan Dinas...
                  </Text>
                  <Text style={styles.contentMeta}>28 Jul 2026</Text>
                </View>
                <TouchableOpacity
                  style={{ padding: 8, borderRadius: 8, backgroundColor: "#eff6ff" }}
                  onPress={() => setSelectedPreviewSt({
                    id: 1,
                    nomor_surat: "ST.1/K.18/TU/KSA.05.06/B/07/2026",
                    maksud_tujuan: "Melaksanakan Perjalanan Dinas dari Samarinda ke Balikpapan dalam rangka Kegiatan Inventarisasi BMN di Paser",
                    tempat_tujuan: "Balikpapan",
                    tanggal_mulai: "2026-07-28",
                    tanggal_selesai: "2026-07-29",
                    status: "approved",
                  })}
                >
                  <Ionicons name="eye-outline" size={18} color="#2563eb" />
                </TouchableOpacity>
              </TouchableOpacity>
            </GlassCard>
          );
        }
        // Exact Web Portal Empty State Matching Screenshot 2
        return (
          <GlassCard style={[styles.tabContentCard, styles.emptyStateCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="clipboard-outline" size={44} color="#cbd5e1" />
            </View>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Belum ada surat tugas yang diterbitkan
            </Text>
          </GlassCard>
        );

      case "cuti":
        // Exact Web Portal Structure Matching Screenshot 3
        return (
          <View>
            <View style={styles.cutiHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cutiHeaderTitle, { color: colors.textDark }]}>
                  Daftar Pengajuan Cuti Saya
                </Text>
                <Text style={[styles.cutiHeaderSub, { color: colors.textMuted }]}>
                  Ajukan permohonan cuti dan cetak formulir resmi BKSDA.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ajukanCutiBtn}
                onPress={() => setCutiModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.ajukanCutiText}>+ Ajukan Cuti Baru</Text>
              </TouchableOpacity>
            </View>

            {leaveRequests.length === 0 ? (
              <GlassCard style={[styles.tabContentCard, styles.emptyStateCard, { backgroundColor: colors.cardBg }]}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="calendar-outline" size={44} color="#cbd5e1" />
                </View>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Belum ada pengajuan cuti
                </Text>
              </GlassCard>
            ) : (
              leaveRequests.map((req, idx) => {
                const statusStr = (req.status || "PENGAJUAN").toUpperCase();
                const isSetuju = statusStr === "DISETUJUI";
                const isTolak = statusStr === "DITOLAK";

                return (
                  <TouchableOpacity
                    key={req.id || idx}
                    onPress={() => {
                      setCutiPreviewItem(req);
                      setCutiPreviewVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <GlassCard style={[styles.stCardContainer, { backgroundColor: colors.cardBg, marginBottom: 10 }]}>
                      <View style={styles.stHeaderRow}>
                        <View style={[styles.stBadge, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
                          <Ionicons name="document-text" size={14} color="#059669" />
                          <Text style={[styles.stBadgeText, { color: "#047857" }]}>{req.jenis_cuti}</Text>
                        </View>
                        <View style={[
                          styles.stBadge,
                          isSetuju ? { backgroundColor: "#d1fae5", borderColor: "#a7f3d0" } :
                          isTolak ? { backgroundColor: "#fee2e2", borderColor: "#fecaca" } :
                          { backgroundColor: "#fef3c7", borderColor: "#fde68a" }
                        ]}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: isSetuju ? "#047857" : isTolak ? "#b91c1c" : "#b45309" }}>
                            {statusStr}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.stTitle, { color: colors.textDark }]}>
                        {req.alasan_cuti || "Permohonan Cuti"}
                      </Text>
                      <Text style={[styles.stNomorTag, { color: "#059669" }]}>
                        {req.nomor_pengajuan || `CUTI/2026/${idx + 1}`}
                      </Text>

                      <View style={styles.stMetaRow}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.stMetaText, { color: colors.textMuted }]}>
                            {req.tanggal_mulai} s/d {req.tanggal_selesai} ({req.jumlah_hari} Hari)
                          </Text>
                        </View>

                        <View style={[styles.stEyeBtn, { backgroundColor: "#ecfdf5" }]}>
                          <Ionicons name="eye" size={16} color="#059669" />
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Web Portal Header Bar */}
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
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>SUPERAPP PORTAL</Text>
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
              size={18}
              color={isDark ? "#f59e0b" : "#64748b"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color={isDark ? "#a7f3d0" : "#64748b"} />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => onNavigateToModule && onNavigateToModule("profile")}
          >
            <Text style={styles.avatarInitial}>{avatarInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emerald Hero Greeting Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroDate}>Selasa, 28 Juli 2026</Text>
          <Text style={styles.heroGreeting}>Selamat Siang, {resolvedName}! ☀️</Text>
          <Text style={styles.heroSubtitle}>Selamat datang di portal BKSDA Kalimantan Timur ({resolvedNip}).</Text>

          {/* Buat Surat Tugas Button */}
          <TouchableOpacity
            style={[styles.buatStQuickBtn, { alignSelf: 'flex-start', marginTop: 4 }]}
            onPress={() => onNavigateToModule && onNavigateToModule("buat-surat-tugas")}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.buatStQuickText}>Buat ST Baru</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Cards */}
        <View style={styles.quickStatsRow}>
          <GlassCard style={[styles.quickStatCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.quickStatHeader}>
              <View style={[styles.quickStatIconBg, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                <Ionicons name="ribbon-outline" size={14} color="#3B82F6" />
              </View>
              <Text style={[styles.quickStatTitle, { color: colors.textMuted }]} numberOfLines={1}>PANGKAT / GOLONGAN</Text>
            </View>
            <Text style={[styles.quickStatValue, { color: colors.textDark }]} numberOfLines={1}>
              {"Penata Muda (III/a)"}
            </Text>
            <Text style={[styles.quickStatSubtitle, { color: colors.textMuted }]}>TMT: 1 Juni 2025</Text>
          </GlassCard>

          <GlassCard style={[styles.quickStatCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.quickStatHeader}>
              <View style={[styles.quickStatIconBg, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                <Ionicons name="calendar-outline" size={14} color="#F59E0B" />
              </View>
              <Text style={[styles.quickStatTitle, { color: colors.textMuted }]} numberOfLines={1}>SISA CUTI ({new Date().getFullYear()})</Text>
            </View>
            <Text style={[styles.quickStatValue, { color: colors.textDark }]}>12 Hari Kerja</Text>
            <Text style={[styles.quickStatSubtitle, { color: colors.textMuted }]}>Cuti Tahunan Ready</Text>
          </GlassCard>
        </View>

        {/* Section Title */}
        {accessibleModules.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Modul Akses</Text>
            </View>

            {/* Compact 3-Column Module Grid */}
            <View style={styles.moduleGrid}>
              {accessibleModules.map((mod) => (
                <TouchableOpacity
                  key={mod.key}
                  style={styles.moduleCardWrapper}
                  activeOpacity={0.8}
                  onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
                >
                  <GlassCard
                    style={[
                      styles.moduleCard,
                      { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                    ]}
                  >
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
          </>
        )}

        {/* 2-Row x 2-Column Tab Buttons Grid Layout */}
        <View style={styles.tabGrid}>
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  isActive && styles.tabButtonActive,
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={13}
                  color={isActive ? "#ffffff" : isDark ? "#a7f3d0" : "#64748b"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isDark ? "#a7f3d0" : "#64748b" },
                    isActive && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Tab Content Box Presisi Web Portal */}
        {renderTabContent()}
      </ScrollView>

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

      {/* Formulir Permohonan Cuti Print Modal */}
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
    backgroundColor: COLORS.emeraldElectric,
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
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: COLORS.emeraldElectric,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 14,
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  heroGreeting: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11.5,
    marginBottom: 10,
  },
  employeeQuickActionsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  sisaCutiBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: RADIUS.button,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  sisaCutiLabel: {
    color: "#059669",
    fontSize: 10.5,
    fontWeight: "700",
  },
  sisaCutiValue: {
    color: "#065f46",
    fontSize: 10.5,
    fontWeight: "800",
  },
  buatStQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: RADIUS.button,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  buatStQuickText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.card,
    borderWidth: 1,
  },
  quickStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
    fontSize: 9.5,
    fontWeight: "700",
    flex: 1,
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  quickStatSubtitle: {
    fontSize: 10,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
    marginBottom: 12,
  },
  moduleCardWrapper: {
    width: "33.33%",
    paddingHorizontal: 3,
    marginBottom: 6,
  },
  moduleCard: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  moduleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 1,
  },
  moduleSubtitle: {
    fontSize: 9,
    textAlign: "center",
  },
  tabGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 10,
  },
  tabButton: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.emeraldElectric,
    borderColor: COLORS.emeraldElectric,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  tabContentCard: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 110,
  },
  emptyStateCard: {
    paddingVertical: 24,
  },
  emptyIconBg: {
    marginBottom: 8,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  actionLinkBtn: {
    marginTop: 8,
    backgroundColor: "#ecfdf5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  actionLinkText: {
    color: "#059669",
    fontSize: 11.5,
    fontWeight: "700",
  },
  contentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  contentIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contentMain: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  contentSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  contentMeta: {
    color: "#059669",
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 1,
  },
  cutiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cutiHeaderTitle: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  cutiHeaderSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  ajukanCutiBtn: {
    backgroundColor: "#059669",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  ajukanCutiText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  tabBadge: {
    marginLeft: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: {
    backgroundColor: "#ffffff",
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  tabBadgeTextActive: {
    color: "#059669",
  },
  stCardContainer: {
    padding: 12,
    borderRadius: 14,
  },
  stHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  stBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  stTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  stNomorTag: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  stMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  stMetaText: {
    fontSize: 11,
    marginLeft: 4,
  },
  stEyeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
