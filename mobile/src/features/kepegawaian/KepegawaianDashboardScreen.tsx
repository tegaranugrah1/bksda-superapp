import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface KepegawaianDashboardScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const KepegawaianDashboardScreen: React.FC<KepegawaianDashboardScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Metrics Data State
  const [stats, setStats] = useState({
    totalEmployees: 149,
    activeSuratTugas: 1,
    pendingCuti: 0,
    activeRate: "100.0%",
  });

  const [satkerDistribution, setSatkerDistribution] = useState([
    { name: "Kantor Balai (Samarinda)", count: 34, percentage: 23, color: "#2563eb", dotColor: "#3b82f6" },
    { name: "Seksi KSDA Wilayah I Berau", count: 30, percentage: 20, color: "#0284c7", dotColor: "#38bdf8" },
    { name: "Seksi KSDA Wilayah II Tenggarong", count: 44, percentage: 30, color: "#10b981", dotColor: "#34d399" },
    { name: "Seksi KSDA Wilayah III Balikpapan", count: 41, percentage: 28, color: "#f59e0b", dotColor: "#fbbf24" },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([
    {
      id: "1",
      title: "Melaksanakan Perjalanan Dinas dari Samarinda ke Balikpapan dalam rangka Kegiatan Inventarisasi BMN di Paser...",
      status: "APPROVED",
      statusBg: "#dbeafe",
      statusColor: "#1e40af",
      location: "Balikpapan",
    },
    {
      id: "2",
      title: "Melaksanakan Perjalanan Dinas dari Samarinda ke Balikpapan dalam rangka Konservasi HKAN di Balikpapan...",
      status: "DRAFT",
      statusBg: "#e0e7ff",
      statusColor: "#3730a3",
      location: "Balikpapan",
    },
  ]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/kepegawaian/dashboard-stats");
      const d = res.data?.data;
      if (d) {
        setStats({
          totalEmployees: d.total_employees ?? 149,
          activeSuratTugas: d.active_surat_tugas ?? 1,
          pendingCuti: d.pending_cuti ?? 0,
          activeRate: d.active_rate ?? "100.0%",
        });

        if (Array.isArray(d.satker_breakdown) && d.satker_breakdown.length > 0) {
          const colorPalette = [
            { color: "#2563eb", dotColor: "#3b82f6" },
            { color: "#0284c7", dotColor: "#38bdf8" },
            { color: "#10b981", dotColor: "#34d399" },
            { color: "#f59e0b", dotColor: "#fbbf24" },
          ];
          setSatkerDistribution(
            d.satker_breakdown.map((item: any, idx: number) => {
              const pal = colorPalette[idx % colorPalette.length];
              return {
                name: item.name,
                count: item.count,
                percentage: item.percentage,
                color: pal.color,
                dotColor: pal.dotColor,
              };
            })
          );
        }

        if (Array.isArray(d.recent_activities) && d.recent_activities.length > 0) {
          setRecentActivities(
            d.recent_activities.map((item: any) => ({
              id: item.id || Math.random().toString(),
              title: item.title || "Melaksanakan Perjalanan Dinas",
              status: item.status || "DITERBITKAN",
              statusBg: item.status === "APPROVED" ? "#dbeafe" : item.status === "DRAFT" ? "#e0e7ff" : "#dcfce7",
              statusColor: item.status === "APPROVED" ? "#1e40af" : item.status === "DRAFT" ? "#3730a3" : "#166534",
              location: item.tempat_tujuan || "Kalimantan Timur",
            }))
          );
        }
      }
    } catch {
      // fallback to preloaded state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleNavigate = (routeKey: string) => {
    const routeMap: Record<string, string> = {
      "daftar-pegawai": "Kepegawaian",
      "tambah-pegawai": "TambahPegawai",
      "buat-surat-tugas": "BuatSuratTugas",
      "inbox-surat-tugas": "InboxSuratTugas",
      "inbox-surat-cuti": "InboxSuratCuti",
      "riwayat-surat-tugas": "InboxSuratTugas",
    };

    if (navigation && typeof navigation.navigate === "function") {
      const target = routeMap[routeKey] || "Kepegawaian";
      navigation.navigate(target);
    } else if (onNavigateToModule) {
      onNavigateToModule(routeKey);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#090d16" : "#f8fafc" }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderBottomColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) onBack();
            else if (navigation) navigation.goBack();
          }}
          style={styles.backBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 35 }}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <View style={styles.headerBadgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.headerBadgeText}>SDM & KEPEGAWAIAN BALAI KSDA KALTIM</Text>
          </View>
          <Text style={[styles.headerTitle, { color: isDark ? "#ffffff" : "#0f172a" }]}>Dashboard Kepegawaian</Text>
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
      >
        {/* 1. Dark Mesh Header Banner Card (Exact Web Match) */}
        <View style={styles.meshBanner}>
          <View style={styles.meshBadgePill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.meshBadgeText}>SDM & KEPEGAWAIAN BALAI KSDA KALIMANTAN TIMUR</Text>
          </View>

          <Text style={styles.meshTitle}>Dashboard Kepegawaian</Text>

          <View style={styles.meshButtonsRow}>
            <TouchableOpacity
              style={styles.btnDaftarPegawai}
              onPress={() => handleNavigate("daftar-pegawai")}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnDaftarText}>Daftar Pegawai</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnBuatSt}
              onPress={() => handleNavigate("buat-surat-tugas")}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnBuatStText}>Buat Surat Tugas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Glassmorphism 2x2 Bento Stat Cards */}
        <View style={styles.bentoGrid}>
          {/* Card 1: SDM Total */}
          <GlassCard style={[styles.bentoCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#f1f5f9" }]}>
            <View style={styles.bentoHeaderRow}>
              <View style={[styles.bentoIconBox, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="people" size={18} color="#2563eb" />
              </View>
              <View style={[styles.bentoBadgePill, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                <Text style={[styles.bentoBadgeText, { color: "#1d4ed8" }]}>SDM TOTAL</Text>
              </View>
            </View>
            <View style={styles.bentoValueRow}>
              <Text style={[styles.bentoValueText, { color: isDark ? "#ffffff" : "#0f172a" }]}>
                {loading ? <ActivityIndicator size="small" color="#2563eb" /> : stats.totalEmployees}
              </Text>
              <View style={styles.pillGreen}>
                <Text style={styles.pillGreenText}>Terdaftar</Text>
              </View>
            </View>
            <Text style={styles.bentoSubText} numberOfLines={1}>Personil Active (PNS, PPPK, MMP)</Text>
          </GlassCard>

          {/* Card 2: ST Aktif */}
          <GlassCard style={[styles.bentoCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#f1f5f9" }]}>
            <View style={styles.bentoHeaderRow}>
              <View style={[styles.bentoIconBox, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="document-text" size={18} color="#0284c7" />
              </View>
              <View style={[styles.bentoBadgePill, { backgroundColor: "#e0f2fe", borderColor: "#bae6fd" }]}>
                <Text style={[styles.bentoBadgeText, { color: "#0369a1" }]}>ST AKTIF</Text>
              </View>
            </View>
            <View style={styles.bentoValueRow}>
              <Text style={[styles.bentoValueText, { color: isDark ? "#ffffff" : "#0f172a" }]}>
                {loading ? <ActivityIndicator size="small" color="#0284c7" /> : stats.activeSuratTugas}
              </Text>
              <View style={styles.pillSky}>
                <Text style={styles.pillSkyText}>Berlangsung</Text>
              </View>
            </View>
            <Text style={styles.bentoSubText} numberOfLines={1}>Surat Tugas Resmi Balai</Text>
          </GlassCard>

          {/* Card 3: Review Cuti */}
          <GlassCard style={[styles.bentoCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#f1f5f9" }]}>
            <View style={styles.bentoHeaderRow}>
              <View style={[styles.bentoIconBox, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="calendar" size={18} color="#f59e0b" />
              </View>
              <View style={[styles.bentoBadgePill, { backgroundColor: "#fff7ed", borderColor: "#fde68a" }]}>
                <Text style={[styles.bentoBadgeText, { color: "#b45309" }]}>REVIEW CUTI</Text>
              </View>
            </View>
            <View style={styles.bentoValueRow}>
              <Text style={[styles.bentoValueText, { color: isDark ? "#ffffff" : "#0f172a" }]}>{stats.pendingCuti}</Text>
              <View style={styles.pillAmber}>
                <Text style={styles.pillAmberText}>Pending</Text>
              </View>
            </View>
            <Text style={styles.bentoSubText} numberOfLines={1}>Permohonan Cuti Menunggu</Text>
          </GlassCard>

          {/* Card 4: Sangat Baik */}
          <GlassCard style={[styles.bentoCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#f1f5f9" }]}>
            <View style={styles.bentoHeaderRow}>
              <View style={[styles.bentoIconBox, { backgroundColor: "#ecfdf5" }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              </View>
              <View style={[styles.bentoBadgePill, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
                <Text style={[styles.bentoBadgeText, { color: "#047857" }]}>SANGAT BAIK</Text>
              </View>
            </View>
            <View style={styles.bentoValueRow}>
              <Text style={[styles.bentoValueText, { color: isDark ? "#ffffff" : "#0f172a" }]}>{stats.activeRate}</Text>
              <View style={styles.pillGreen}>
                <Text style={styles.pillGreenText}>Normal</Text>
              </View>
            </View>
            <Text style={styles.bentoSubText} numberOfLines={1}>Status Keaktifan Personil SDM</Text>
          </GlassCard>
        </View>

        {/* 3. Aktivitas Terkini Kepegawaian Card (Top) */}
        <GlassCard style={[styles.sectionCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#f1f5f9" }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconCircle, { backgroundColor: "#ecfdf5" }]}>
                <Ionicons name="trending-up" size={18} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.sectionTitleText, { color: isDark ? "#ffffff" : "#0f172a" }]}>Aktivitas Terkini Kepegawaian</Text>
                <Text style={styles.sectionSubText}>Riwayat penerbitan ST dan permohonan</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.lihatSemuaBtn}
              onPress={() => handleNavigate("inbox-surat-tugas")}
              activeOpacity={0.7}
            >
              <Text style={styles.lihatSemuaText}>Lihat Semua</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.activityListContainer}>
            {recentActivities.map((act) => (
              <TouchableOpacity
                key={act.id}
                style={[styles.activityRowBox, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0" }]}
                onPress={() => {
                  if (navigation && typeof navigation.navigate === "function") {
                    navigation.navigate("BuatSuratTugas", { editData: act });
                  } else if (onNavigateToModule) {
                    onNavigateToModule("buat-surat-tugas");
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.activityIconBox}>
                  <Ionicons name="document-text" size={18} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityTitle, { color: isDark ? "#f1f5f9" : "#0f172a" }]} numberOfLines={2}>
                    {act.title}
                  </Text>
                  <View style={styles.activityMetaRow}>
                    <View style={[styles.activityStatusBadge, { backgroundColor: act.statusBg }]}>
                      <Text style={[styles.activityStatusText, { color: act.statusColor }]}>{act.status}</Text>
                    </View>
                    <View style={styles.activityLocationRow}>
                      <Ionicons name="location-outline" size={12} color="#3b82f6" style={{ marginRight: 2 }} />
                      <Text style={styles.activityLocationText}>{act.location}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* 4. Sebaran Personil per Satker Card (Bottom) */}
        <GlassCard style={[styles.sectionCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#f1f5f9", marginBottom: 50 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconCircle, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="business" size={18} color="#2563eb" />
              </View>
              <View>
                <Text style={[styles.sectionTitleText, { color: isDark ? "#ffffff" : "#0f172a" }]}>Sebaran Personil per Satker</Text>
                <Text style={styles.sectionSubText}>Distribusi Kantor Balai & Seksi Wilayah</Text>
              </View>
            </View>

            <View style={styles.wilayahBadgePill}>
              <Text style={styles.wilayahBadgeText}>4 Wilayah</Text>
            </View>
          </View>

          <View style={styles.satkerListContainer}>
            {satkerDistribution.map((item, idx) => (
              <View key={idx} style={[styles.satkerCardBox, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#f1f5f9" }]}>
                <View style={styles.satkerRowHeader}>
                  <View style={styles.satkerNameRow}>
                    <View style={[styles.dotCircle, { backgroundColor: item.dotColor }]} />
                    <Text style={[styles.satkerNameText, { color: isDark ? "#f1f5f9" : "#1e293b" }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.satkerCountText}>
                    {item.count} Personil ({item.percentage}%)
                  </Text>
                </View>

                <View style={styles.satkerTrack}>
                  <View style={[styles.satkerBar, { width: `${Math.max(5, item.percentage)}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>
        </GlassCard>
      </ScrollView>

      {/* Floating Action Button Menu */}
      <FabMenu onNavigateToModule={onNavigateToModule} activeModule="kepegawaian" activeSubmenu="dashboard-kepegawaian" />
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
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563eb",
    marginRight: 6,
  },
  headerBadgeText: {
    color: "#2563eb",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  /* 1. Dark Mesh Banner */
  meshBanner: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  meshBadgePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
    marginBottom: 10,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
    marginRight: 6,
  },
  meshBadgeText: {
    color: "#93c5fd",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  meshTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  meshButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnDaftarPegawai: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  btnDaftarText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  btnBuatSt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.4)",
  },
  btnBuatStText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  /* 2. Bento Grid */
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bentoCard: {
    width: (Dimensions.get("window").width - 42) / 2,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  bentoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bentoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  bentoBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  bentoValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 4,
  },
  bentoValueText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  pillGreen: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillGreenText: {
    color: "#15803d",
    fontSize: 9.5,
    fontWeight: "800",
  },
  pillSky: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillSkyText: {
    color: "#0369a1",
    fontSize: 9.5,
    fontWeight: "800",
  },
  pillAmber: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillAmberText: {
    color: "#b45309",
    fontSize: 9.5,
    fontWeight: "800",
  },
  bentoSubText: {
    fontSize: 9.5,
    color: "#64748b",
    fontWeight: "600",
  },
  /* Section Card General */
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  sectionSubText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },
  wilayahBadgePill: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  wilayahBadgeText: {
    color: "#2563eb",
    fontSize: 10,
    fontWeight: "800",
  },
  satkerListContainer: {
    gap: 10,
  },
  satkerCardBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  satkerRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  satkerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  dotCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  satkerNameText: {
    fontSize: 11.5,
    fontWeight: "800",
    flex: 1,
  },
  satkerCountText: {
    fontSize: 10.5,
    fontFamily: "monospace",
    color: "#64748b",
    fontWeight: "700",
  },
  satkerTrack: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  satkerBar: {
    height: "100%",
    borderRadius: 3,
  },
  /* Activity List */
  lihatSemuaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  lihatSemuaText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
  },
  activityListContainer: {
    gap: 10,
  },
  activityRowBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  activityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    marginBottom: 6,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activityStatusText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  activityLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityLocationText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
});
