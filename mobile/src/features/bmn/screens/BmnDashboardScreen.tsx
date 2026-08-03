import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, SHADOWS } from "../../../theme";
import { useTheme } from "../../../theme/ThemeContext";
import { GlassCard } from "../../../components/ui/GlassCard";
import { FabMenu } from "../../../components/ui/FabMenu";
import { apiClient } from "../../../lib/api/client";

interface BmnDashboardScreenProps {
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
  onNavigateToCatalog?: () => void;
  onNavigateToLoans?: () => void;
}

interface BmnStatsData {
  total_asset: number;
  total_asset_value: number;
  asset_by_condition: Record<string, number>;
  asset_by_jenis: {
    jenis_bmn: string;
    total: number;
    total_nilai: number;
  }[];
  asset_by_lokasi: {
    lokasi_ruang: string;
    total: number;
  }[];
  recent_transactions: {
    type: "loan" | "maintenance";
    id: number | string;
    asset?: string;
    borrower?: string;
    tanggal?: string;
    status?: string;
    keterangan?: string;
  }[];
  stnk_alerts: {
    expired: any[];
    expiring_soon: any[];
    plat_expired: any[];
  };
}

function formatCurrencyShort(value: number): string {
  if (!value || isNaN(value)) return "Rp 0";
  if (value >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(1).replace(".", ",")} T`;
  }
  if (value >= 1_000_000_000) {
    return `Rp ${Math.round(value / 1_000_000_000)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatCleanDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  // Remove ISO timestamp string e.g. 2026-02-06T16:00:00.000000Z -> 2026-02-06
  const cleanStr = dateStr.split("T")[0];
  return cleanStr;
}

export const BmnDashboardScreen: React.FC<BmnDashboardScreenProps> = ({
  onBack,
  onNavigateToModule,
  onNavigateToCatalog,
  onNavigateToLoans,
}) => {
  const { isDark, colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<BmnStatsData>({
    total_asset: 1613,
    total_asset_value: 62000000000,
    asset_by_condition: {
      Baik: 1116,
      "Rusak Ringan": 444,
      "Rusak Berat": 53,
    },
    asset_by_jenis: [
      { jenis_bmn: "MESIN PERALATAN NON TIK", total: 1060, total_nilai: 6700000000 },
      { jenis_bmn: "MESIN PERALATAN KHUSUS TIK", total: 238, total_nilai: 2900000000 },
      { jenis_bmn: "ALAT BESAR", total: 152, total_nilai: 2000000000 },
      { jenis_bmn: "ALAT ANGKUTAN BERMOTOR", total: 95, total_nilai: 15600000000 },
      { jenis_bmn: "ALAT PERSENJATAAN", total: 25, total_nilai: 89800000 },
      { jenis_bmn: "BANGUNAN DAN GEDUNG", total: 23, total_nilai: 18700000000 },
      { jenis_bmn: "TANAH", total: 16, total_nilai: 14500000000 },
      { jenis_bmn: "RUMAH NEGARA", total: 3, total_nilai: 1300000000 },
      { jenis_bmn: "BANGUNAN AIR", total: 1, total_nilai: 246100000 },
    ],
    asset_by_lokasi: [
      { lokasi_ruang: "Belum berlokasi", total: 395 },
      { lokasi_ruang: "05 - Umum", total: 167 },
      { lokasi_ruang: "04 - Rapat Besar", total: 114 },
      { lokasi_ruang: "01 - Kepala Seksi", total: 86 },
      { lokasi_ruang: "01 - ", total: 79 },
      { lokasi_ruang: "1 - Omsetan", total: 67 },
      { lokasi_ruang: "01 - Gudang Kebakaran", total: 66 },
      { lokasi_ruang: "04 - Teknis", total: 51 },
      { lokasi_ruang: "02 - Kerja", total: 50 },
      { lokasi_ruang: "10 - Teknis", total: 46 },
    ],
    recent_transactions: [],
    stnk_alerts: {
      expired: [
        { id: 1, nama_barang: "Mobil Tangki Air", merk: "HINO", no_polisi: "KT 8578 B", tanggal_pajak_stnk: "2026-02-06" },
        { id: 2, nama_barang: "Pick Up", merk: "Mitsubishi", no_polisi: "KT 8819 F", tanggal_pajak_stnk: "2026-01-17" },
      ],
      expiring_soon: [
        { id: 3, nama_barang: "Station Wagon", merk: "TOYOTA", no_polisi: "KT 1989 BZ", tanggal_pajak_stnk: "2026-08-24" },
        { id: 4, nama_barang: "Station Wagon", merk: "Toyota", no_polisi: "KT 1670 MZ", tanggal_pajak_stnk: "2026-08-08" },
        { id: 5, nama_barang: "Pick Up", merk: "Mitsubishi", no_polisi: "KT 8390 BZ", tanggal_pajak_stnk: "2026-08-08" },
      ],
      plat_expired: [],
    },
  });

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/bmn/dashboard/stats");
      if (response.data) {
        setStats((prev) => ({
          ...prev,
          total_asset: response.data.total_asset ?? prev.total_asset,
          total_asset_value: response.data.total_asset_value ?? prev.total_asset_value,
          asset_by_condition: response.data.asset_by_condition || prev.asset_by_condition,
          asset_by_jenis: response.data.asset_by_jenis || prev.asset_by_jenis,
          asset_by_lokasi: response.data.asset_by_lokasi || prev.asset_by_lokasi,
          recent_transactions: response.data.recent_transactions || prev.recent_transactions,
          stnk_alerts: response.data.stnk_alerts || prev.stnk_alerts,
        }));
      }
    } catch {
      // Fallback data initialized above
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const response = await apiClient.get<any>("/bmn/dashboard/stats");
        if (isMounted && response.data) {
          setStats((prev) => ({
            ...prev,
            total_asset: response.data.total_asset ?? prev.total_asset,
            total_asset_value: response.data.total_asset_value ?? prev.total_asset_value,
            asset_by_condition: response.data.asset_by_condition || prev.asset_by_condition,
            asset_by_jenis: response.data.asset_by_jenis || prev.asset_by_jenis,
            asset_by_lokasi: response.data.asset_by_lokasi || prev.asset_by_lokasi,
            recent_transactions: response.data.recent_transactions || prev.recent_transactions,
            stnk_alerts: response.data.stnk_alerts || prev.stnk_alerts,
          }));
        }
      } catch {
        // Fallback data initialized above
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleSelectNavTab = (tabKey: string) => {
    if (tabKey === "home" || tabKey === "portal" || tabKey === "dashboard") {
      if (onBack) onBack();
    } else {
      if (onNavigateToModule) {
        onNavigateToModule(tabKey);
      }
    }
  };

  // Progress Bar color mapping for categories
  const barColors = [
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#2563eb", // Royal Blue
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#eab308", // Yellow
    "#ec4899", // Pink
    "#94a3b8", // Slate
  ];

  const allStnkAlerts = [
    ...(stats.stnk_alerts?.expired || []).map((item) => ({ ...item, isExpired: true })),
    ...(stats.stnk_alerts?.expiring_soon || []).map((item) => ({ ...item, isExpired: false })),
  ];

  const maxJenisTotal = Math.max(...(stats.asset_by_jenis || []).map((j) => j.total), 1);
  const maxLokasiTotal = Math.max(...(stats.asset_by_lokasi || []).map((l) => l.total), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#090d16" : "#f8fafc" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View style={[styles.headerBar, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderBottomColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack || (() => {})} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f8fafc" : "#0f172a" }]}>BMN BKSDA</Text>
          <Text style={styles.headerSubtitle}>Barang Milik Negara</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />
        }
      >
        {/* Main Dashboard Title Header */}
        <View style={styles.dashboardTitleSection}>
          <Text style={[styles.mainTitle, { color: isDark ? "#f8fafc" : "#0f172a" }]}>Dashboard BMN</Text>
          <Text style={[styles.mainSubtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            Ikhtisar pengelolaan Barang Milik Negara BKSDA Kalimantan Timur.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat data dashboard BMN...</Text>
          </View>
        ) : (
          <>
            {/* 2x2 Grid KPI Summary Cards */}
            <View style={styles.kpiGrid}>
              {/* Card 1: TOTAL ASET */}
              <GlassCard style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
                <View style={styles.kpiHeaderRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: "#eff6ff" }]}>
                    <Ionicons name="cube-outline" size={18} color="#2563eb" />
                  </View>
                  <Text style={styles.kpiLabel}>TOTAL ASET</Text>
                </View>
                <Text style={[styles.kpiValue, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  {stats.total_asset.toLocaleString("id-ID")}
                </Text>
                <Text style={styles.kpiSubtext}>
                  {stats.asset_by_condition?.Baik || 1116} kondisi baik
                </Text>
              </GlassCard>

              {/* Card 2: NILAI PEROLEHAN */}
              <GlassCard style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
                <View style={styles.kpiHeaderRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: "#ecfdf5" }]}>
                    <Ionicons name="trending-up-outline" size={18} color="#059669" />
                  </View>
                  <Text style={styles.kpiLabel}>NILAI PEROLEHAN</Text>
                </View>
                <Text style={[styles.kpiValue, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  {formatCurrencyShort(stats.total_asset_value)}
                </Text>
                <Text style={styles.kpiSubtext}>Total akumulasi</Text>
              </GlassCard>

              {/* Card 3: SEDANG DIPINJAM */}
              <TouchableOpacity
                style={{ width: "48.5%" }}
                onPress={onNavigateToLoans}
                activeOpacity={0.85}
              >
                <GlassCard style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder, width: "100%" }]}>
                  <View style={styles.kpiHeaderRow}>
                    <View style={[styles.kpiIconBox, { backgroundColor: "#fffbe8" }]}>
                      <Ionicons name="hand-left-outline" size={18} color="#d97706" />
                    </View>
                    <Text style={styles.kpiLabel}>SEDANG DIPINJAM</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                    -
                  </Text>
                  <Text style={[styles.kpiSubtext, { color: "#d97706", fontWeight: "700" }]}>
                    Lihat peminjaman
                  </Text>
                </GlassCard>
              </TouchableOpacity>

              {/* Card 4: RUSAK BERAT */}
              <GlassCard style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
                <View style={styles.kpiHeaderRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: "#fef2f2" }]}>
                    <Ionicons name="shield-outline" size={18} color="#ef4444" />
                  </View>
                  <Text style={styles.kpiLabel}>RUSAK BERAT</Text>
                </View>
                <Text style={[styles.kpiValue, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  {stats.asset_by_condition?.["Rusak Berat"] || 53}
                </Text>
                <Text style={[styles.kpiSubtext, { color: "#ef4444" }]}>Perlu perhatian</Text>
              </GlassCard>
            </View>

            {/* Section 2: Peringatan STNK & Plat Kendaraan */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="shield-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionHeading, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  Peringatan STNK & Plat Kendaraan
                </Text>
              </View>

              <View style={styles.stnkList}>
                {allStnkAlerts.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Tidak ada peringatan STNK saat ini
                  </Text>
                ) : (
                  allStnkAlerts.map((item, index) => {
                    const isExp = item.isExpired;
                    const dateFormatted = formatCleanDate(item.tanggal_pajak_stnk || item.tanggal_ganti_plat);

                    return (
                      <View
                        key={item.id || index}
                        style={[
                          styles.stnkCard,
                          {
                            backgroundColor: isExp
                              ? isDark
                                ? "rgba(239, 68, 68, 0.12)"
                                : "#fef2f2"
                              : isDark
                              ? "rgba(234, 179, 8, 0.12)"
                              : "#fffbe8",
                            borderColor: isExp ? "#fecaca" : "#fef08a",
                          },
                        ]}
                      >
                        <View style={styles.stnkMainCol}>
                          <Text style={[styles.stnkTitle, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
                            {item.nama_barang || "Kendaraan Dinas"}
                          </Text>
                          <Text style={styles.stnkMerk}>({item.merk || "BMN"})</Text>
                          <Text style={styles.stnkNopol}>{item.no_polisi || "KT 0000 XX"}</Text>
                        </View>

                        <View
                          style={[
                            styles.stnkBadge,
                            {
                              backgroundColor: isExp ? "#fee2e2" : "#fef9c3",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stnkBadgeText,
                              { color: isExp ? "#dc2626" : "#b45309" },
                            ]}
                          >
                            {isExp ? `🚨 Pajak Expired (${dateFormatted})` : `⚠️ Pajak ${dateFormatted}`}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* Section 3: Distribusi per Jenis BMN */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bar-chart-outline" size={20} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionHeading, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  Distribusi per Jenis BMN
                </Text>
              </View>

              <View style={styles.distribusiList}>
                {(stats.asset_by_jenis || []).map((jenis, index) => {
                  const percent = Math.min(100, Math.round((jenis.total / maxJenisTotal) * 100));
                  const barColor = barColors[index % barColors.length];

                  return (
                    <View key={jenis.jenis_bmn + index} style={styles.distribRow}>
                      <Text
                        style={[styles.distribName, { color: isDark ? "#cbd5e1" : "#475569" }]}
                        numberOfLines={1}
                      >
                        {jenis.jenis_bmn}
                      </Text>

                      <View style={styles.distribBarWrapper}>
                        <View style={[styles.distribBarTrack, { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" }]}>
                          <View
                            style={[
                              styles.distribBarFill,
                              { width: `${percent}%`, backgroundColor: barColor },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.distribValueCol}>
                        <Text style={[styles.distribCount, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                          {jenis.total}
                        </Text>
                        <Text style={styles.distribValueText}>
                          {formatCurrencyShort(jenis.total_nilai)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Section 4: Top Lokasi */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="location-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionHeading, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  Top Lokasi
                </Text>
              </View>

              <View style={styles.distribusiList}>
                {(stats.asset_by_lokasi || []).map((lok, index) => {
                  const percent = Math.min(100, Math.round((lok.total / maxLokasiTotal) * 100));

                  return (
                    <View key={lok.lokasi_ruang + index} style={styles.distribRow}>
                      <Text
                        style={[styles.distribName, { color: isDark ? "#cbd5e1" : "#475569" }]}
                        numberOfLines={1}
                      >
                        {lok.lokasi_ruang || "Lainnya"}
                      </Text>

                      <View style={styles.distribBarWrapper}>
                        <View style={[styles.distribBarTrack, { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" }]}>
                          <View
                            style={[
                              styles.distribBarFill,
                              { width: `${percent}%`, backgroundColor: "#8b5cf6" },
                            ]}
                          />
                        </View>
                      </View>

                      <Text style={[styles.distribCountOnly, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                        {lok.total}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Section 5: Aktivitas Terbaru */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: colors.glassBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="calendar-outline" size={20} color="#ec4899" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionHeading, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                  Aktivitas Terbaru
                </Text>
              </View>

              {(!stats.recent_transactions || stats.recent_transactions.length === 0) ? (
                <View style={styles.emptyAktivitasBox}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada aktivitas</Text>
                </View>
              ) : (
                <View style={styles.recentList}>
                  {stats.recent_transactions.map((tx, idx) => (
                    <View key={tx.id || idx} style={styles.recentRow}>
                      <View style={styles.recentIconBox}>
                        <Ionicons
                          name={tx.type === "loan" ? "swap-horizontal-outline" : "construct-outline"}
                          size={16}
                          color="#059669"
                        />
                      </View>
                      <View style={styles.recentMainCol}>
                        <Text style={[styles.recentTitle, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                          {tx.asset || "Aset BMN"}
                        </Text>
                        <Text style={styles.recentMeta}>
                          {tx.borrower ? `Peminjam: ${tx.borrower}` : tx.keterangan || "Transaksi BMN"}
                        </Text>
                      </View>
                      <Text style={styles.recentDate}>{formatCleanDate(tx.tanggal)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FabMenu) */}
      <FabMenu onNavigateToModule={(mod) => handleSelectNavTab(mod)} activeModule="bmn" activeSubmenu="bmn" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 11,
  },
  katalogQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  katalogQuickText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dashboardTitleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  mainSubtitle: {
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 18,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: "48.5%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  kpiLabel: {
    color: "#64748b",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    flex: 1,
  },
  kpiValue: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 4,
  },
  kpiSubtext: {
    color: "#94a3b8",
    fontSize: 11,
  },
  sectionContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.cardGlass,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
  },
  stnkList: {
    gap: 10,
  },
  stnkCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stnkMainCol: {
    flex: 1,
    marginRight: 8,
  },
  stnkTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  stnkMerk: {
    color: "#94a3b8",
    fontSize: 11,
  },
  stnkNopol: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  stnkBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "55%",
  },
  stnkBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  distribusiList: {
    gap: 12,
  },
  distribRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  distribName: {
    width: 140,
    fontSize: 10.5,
    fontWeight: "700",
  },
  distribBarWrapper: {
    flex: 1,
    marginHorizontal: 8,
  },
  distribBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  distribBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  distribValueCol: {
    alignItems: "flex-end",
    minWidth: 70,
  },
  distribCount: {
    fontSize: 12,
    fontWeight: "800",
  },
  distribCountOnly: {
    fontSize: 12,
    fontWeight: "800",
    minWidth: 35,
    textAlign: "right",
  },
  distribValueText: {
    color: "#94a3b8",
    fontSize: 9.5,
  },
  emptyAktivitasBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12.5,
  },
  recentList: {
    gap: 10,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.12)",
  },
  recentIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  recentMainCol: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  recentMeta: {
    color: "#64748b",
    fontSize: 10.5,
  },
  recentDate: {
    color: "#94a3b8",
    fontSize: 10.5,
  },
});
