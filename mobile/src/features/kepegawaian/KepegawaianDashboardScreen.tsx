import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
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
    totalEmployees: 142,
    activeSuratTugas: 18,
    pendingCuti: 5,
    activeRate: "98.5%",
  });

  const [satkerDistribution, setSatkerDistribution] = useState([
    { name: "Kantor Balai (Samarinda)", count: 0, percentage: 0, color: "#2563eb" },
    { name: "Seksi KSDA Wilayah I Berau", count: 0, percentage: 0, color: "#0284c7" },
    { name: "Seksi KSDA Wilayah II Tenggarong", count: 0, percentage: 0, color: "#10b981" },
    { name: "Seksi KSDA Wilayah III Balikpapan", count: 0, percentage: 0, color: "#f59e0b" },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/kepegawaian/dashboard-stats");
      const d = res.data?.data;
      if (d) {
        setStats({
          totalEmployees: d.total_employees ?? 0,
          activeSuratTugas: d.active_surat_tugas ?? 0,
          pendingCuti: d.pending_cuti ?? 0,
          activeRate: d.active_rate ?? "100%",
        });

        if (Array.isArray(d.satker_breakdown) && d.satker_breakdown.length > 0) {
          const colors = ["#2563eb", "#0284c7", "#10b981", "#f59e0b"];
          setSatkerDistribution(
            d.satker_breakdown.map((item: any, idx: number) => ({
              name: item.name,
              count: item.count,
              percentage: item.percentage,
              color: colors[idx % colors.length],
            }))
          );
        }

        if (Array.isArray(d.recent_activities) && d.recent_activities.length > 0) {
          setRecentActivities(
            d.recent_activities.map((item: any) => ({
              id: item.id,
              icon: "document-text",
              iconBg: "#eff6ff",
              iconColor: "#2563eb",
              title: item.title,
              subtitle: `Tujuan: ${item.tempat_tujuan || "Kaltim"} • ${item.status}`,
              time: item.tanggal_surat || "Terbaru",
            }))
          );
        }
      }
    } catch {
      // fallback
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
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) onBack();
            else if (navigation) navigation.goBack();
          }}
          style={styles.backBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 35 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <View style={styles.headerBadgeRow}>
            <Ionicons name="people" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.headerBadgeText}>SDM & KEPEGAWAIAN</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Dashboard Kepegawaian</Text>
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
      >
        {/* Banner Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconBox}>
            <Ionicons name="sparkles" size={24} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Manajemen SDM BKSDA Kaltim</Text>
            <Text style={styles.welcomeSub}>
              Pantau jumlah personil, aktivitas pengajuan Surat Tugas, dan pengelolaan hak akses pegawai.
            </Text>
          </View>
        </View>

        {/* Bento Metrics 4 Grid */}
        <Text style={styles.sectionHeaderTitle}>METRIK & STATISTIK SDM</Text>

        <View style={styles.metricsGrid}>
          {/* Card 1: Total Pegawai */}
          <GlassCard style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIconCircle, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="people" size={18} color="#2563eb" />
              </View>
              <View style={[styles.badgeSmall, { backgroundColor: "#dbeafe" }]}>
                <Text style={[styles.badgeSmallText, { color: "#1e40af" }]}>Total</Text>
              </View>
            </View>
            <Text style={[styles.metricNumber, { color: colors.textDark }]}>
              {loading ? <ActivityIndicator size="small" color="#2563eb" /> : stats.totalEmployees}
            </Text>
            <Text style={styles.metricLabel}>Total Personil SDM</Text>
          </GlassCard>

          {/* Card 2: Surat Tugas Aktif */}
          <GlassCard style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIconCircle, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="document-text" size={18} color="#0284c7" />
              </View>
              <View style={[styles.badgeSmall, { backgroundColor: "#e0f2fe" }]}>
                <Text style={[styles.badgeSmallText, { color: "#0369a1" }]}>Aktif</Text>
              </View>
            </View>
            <Text style={[styles.metricNumber, { color: colors.textDark }]}>
              {loading ? <ActivityIndicator size="small" color="#0284c7" /> : stats.activeSuratTugas}
            </Text>
            <Text style={styles.metricLabel}>Surat Tugas Berlangsung</Text>
          </GlassCard>

          {/* Card 3: Pending Cuti */}
          <GlassCard style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIconCircle, { backgroundColor: "#fef9c3" }]}>
                <Ionicons name="calendar" size={18} color="#ca8a04" />
              </View>
              <View style={[styles.badgeSmall, { backgroundColor: "#fef08a" }]}>
                <Text style={[styles.badgeSmallText, { color: "#854d0e" }]}>Inbox</Text>
              </View>
            </View>
            <Text style={[styles.metricNumber, { color: colors.textDark }]}>{stats.pendingCuti}</Text>
            <Text style={styles.metricLabel}>Pengajuan Cuti</Text>
          </GlassCard>

          {/* Card 4: Kehadiran / Status Aktif */}
          <GlassCard style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIconCircle, { backgroundColor: "#ecfdf5" }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              </View>
              <View style={[styles.badgeSmall, { backgroundColor: "#d1fae5" }]}>
                <Text style={[styles.badgeSmallText, { color: "#065f46" }]}>Normal</Text>
              </View>
            </View>
            <Text style={[styles.metricNumber, { color: colors.textDark }]}>{stats.activeRate}</Text>
            <Text style={styles.metricLabel}>Status Kehadiran SDM</Text>
          </GlassCard>
        </View>

        {/* Quick Actions Grid (Akses Cepat Kepegawaian) */}
        <Text style={styles.sectionHeaderTitle}>AKSES CEPAT MODUL KEPEGAWAIAN</Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => handleNavigate("daftar-pegawai")}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="people-outline" size={20} color="#2563eb" />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textDark }]}>Daftar Pegawai</Text>
            <Text style={styles.quickSub}>Pencarian & Hak Akses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => handleNavigate("tambah-pegawai")}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: "#ecfdf5" }]}>
              <Ionicons name="person-add-outline" size={20} color="#10b981" />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textDark }]}>Tambah Pegawai</Text>
            <Text style={styles.quickSub}>Form Personil Baru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => handleNavigate("buat-surat-tugas")}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: "#fff7ed" }]}>
              <Ionicons name="document-text-outline" size={20} color="#ea580c" />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textDark }]}>Buat Surat Tugas</Text>
            <Text style={styles.quickSub}>ST Builder Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => handleNavigate("inbox-surat-tugas")}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: "#e0f2fe" }]}>
              <Ionicons name="mail-unread-outline" size={20} color="#0284c7" />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textDark }]}>Inbox Surat Tugas</Text>
            <Text style={styles.quickSub}>Daftar & Edit ST</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => handleNavigate("inbox-surat-cuti")}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: "#fef9c3" }]}>
              <Ionicons name="calendar-outline" size={20} color="#ca8a04" />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textDark }]}>Inbox Surat Cuti</Text>
            <Text style={styles.quickSub}>Persetujuan Cuti</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => handleNavigate("riwayat-surat-tugas")}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: "#faf5ff" }]}>
              <Ionicons name="time-outline" size={20} color="#9333ea" />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textDark }]}>Riwayat ST</Text>
            <Text style={styles.quickSub}>Arsip Surat Tugas</Text>
          </TouchableOpacity>
        </View>

        {/* Satuan Kerja Distribution Progress Bars */}
        <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="business-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitleText, { color: colors.textDark }]}>Sebaran Pegawai per Satuan Kerja</Text>
          </View>

          <View style={{ gap: 12, marginTop: 10 }}>
            {satkerDistribution.map((item, idx) => (
              <View key={idx}>
                <View style={styles.progressLabelRow}>
                  <Text style={[styles.progressName, { color: colors.textDark }]}>{item.name}</Text>
                  <Text style={styles.progressVal}>{item.count} Personil ({item.percentage}%)</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Recent SDM Activity Feed */}
        <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, marginBottom: 40 }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="pulse-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitleText, { color: colors.textDark }]}>Aktivitas Kepegawaian Terkini</Text>
          </View>

          <View style={{ gap: 10, marginTop: 10 }}>
            {recentActivities.map((act) => (
              <View key={act.id} style={styles.activityRow}>
                <View style={[styles.actIconCircle, { backgroundColor: act.iconBg }]}>
                  <Ionicons name={act.icon as any} size={16} color={act.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actTitle, { color: colors.textDark }]}>{act.title}</Text>
                  <Text style={styles.actSub} numberOfLines={1}>{act.subtitle}</Text>
                  <Text style={styles.actTime}>{act.time}</Text>
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
  },

  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.card,
    padding: 14,
    marginBottom: 16,
  },
  welcomeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  welcomeTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e3a8a",
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 11,
    color: "#3b82f6",
    lineHeight: 15,
  },

  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    padding: 12,
    borderRadius: RADIUS.card,
    borderWidth: 1,
  },
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSmall: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeSmallText: {
    fontSize: 9,
    fontWeight: "900",
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    width: "31%",
    padding: 10,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    alignItems: "center",
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 2,
  },
  quickSub: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
  },

  sectionCard: {
    padding: 14,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "900",
  },

  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressName: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  progressVal: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  actIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  actSub: {
    fontSize: 10.5,
    color: "#64748b",
  },
  actTime: {
    fontSize: 9.5,
    color: "#94a3b8",
    marginTop: 2,
  },
});
