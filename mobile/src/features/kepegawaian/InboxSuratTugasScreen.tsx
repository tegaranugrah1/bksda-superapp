import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface InboxSuratTugasScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

interface SuratTugasItem {
  id: string;
  status: "DRAFT" | "DITERBITKAN" | "DITOLAK";
  statusColor: string;
  date: string;
  periode: string;
  title: string;
  location: string;
  dana: string;
  personil: Array<{ name: string; nip: string }>;
}

export const InboxSuratTugasScreen: React.FC<InboxSuratTugasScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Semua Status");
  const [selectedSt, setSelectedSt] = useState<SuratTugasItem | null>(null);
  const [stList, setStList] = useState<SuratTugasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuratTugas = async () => {
    try {
      const response = await apiClient.get<any>("/kepegawaian/surat-tugas");
      if (response.data && Array.isArray(response.data.data)) {
        const apiList = response.data.data.map((st: any) => ({
          id: String(st.id),
          status: st.status || "DRAFT",
          statusColor: st.status === "DITERBITKAN" ? "#2563eb" : "#64748b",
          date: st.created_at ? new Date(st.created_at).toLocaleDateString("id-ID") : "2026",
          periode: st.periode || "2026",
          title: st.perihal || st.title || "-",
          location: st.tujuan || st.location || "Kalimantan Timur",
          dana: st.sumber_dana || "DIPA",
          personil: Array.isArray(st.personil) ? st.personil : [],
        }));
        setStList(apiList);
      } else {
        setStList([]);
      }
    } catch {
      setStList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuratTugas();
  }, []);

  // Handle hardware back press & back gesture: return to Inbox list view first
  useEffect(() => {
    const onBackPress = () => {
      if (selectedSt !== null) {
        setSelectedSt(null);
        return true; // Consume event & stay in Inbox Surat Tugas list view
      }
      return false; // Delegate to default navigation back
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [selectedSt]);

  const handleGoBack = () => {
    if (selectedSt !== null) {
      setSelectedSt(null);
    } else if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.navigate("Kepegawaian");
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
    } else if (tabKey === "profile") {
      if (navigation) navigation.navigate("Profile");
    } else if (tabKey === "kepegawaian") {
      if (navigation) navigation.navigate("Kepegawaian");
    } else if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    }
  };

  const filteredStList = stList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.personil.some((p) => p.name.toLowerCase().includes(q));

    if (selectedStatusFilter === "Semua Status") return matchesSearch;
    return matchesSearch && item.status === selectedStatusFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Top Header Bar */}
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
            <Ionicons name="business" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.headerBadgeText}>KEPEGAWAIAN & SDM</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>
            {selectedSt ? "Detail Surat Tugas" : "Inbox Surat Tugas"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddStBtn}
          onPress={() => {
            if (navigation) navigation.navigate("BuatSuratTugas");
            else if (onNavigateToModule) onNavigateToModule("buat-surat-tugas");
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.headerAddStText}>Buat ST</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* VIEW 1: LIST MODE (Default List View) */}
        {!selectedSt ? (
          <>
            {/* Controls Search & Filter Row */}
            <View style={styles.controlsRow}>
              <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textDark }]}
                  placeholder="Cari kegiatan atau nama..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
                onPress={() =>
                  Alert.alert("Filter Status", "Pilih status pengajuan:", [
                    { text: "Semua Status", onPress: () => setSelectedStatusFilter("Semua Status") },
                    { text: "DRAFT", onPress: () => setSelectedStatusFilter("DRAFT") },
                    { text: "DITERBITKAN", onPress: () => setSelectedStatusFilter("DITERBITKAN") },
                    { text: "Batal", style: "cancel" },
                  ])
                }
                activeOpacity={0.8}
              >
                <Text style={[styles.filterBtnText, { color: colors.textDark }]}>
                  {selectedStatusFilter}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Vertical List of Surat Tugas Cards */}
            <View style={styles.verticalListContainer}>
              {filteredStList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.verticalStCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  ]}
                  onPress={() => setSelectedSt(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.statusBadge, { backgroundColor: `${item.statusColor}15` }]}>
                      <Text style={[styles.statusBadgeText, { color: item.statusColor }]}>
                        {item.status}
                      </Text>
                    </View>
                    <Text style={styles.cardDateText}>{item.date}</Text>
                  </View>

                  <Text style={[styles.cardTitleText, { color: colors.textDark }]} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.cardFooterRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <Ionicons name="location-outline" size={13} color="#2563eb" style={{ marginRight: 4 }} />
                      <Text style={styles.cardLocationText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>

                    <View style={styles.viewDetailBadge}>
                      <Text style={styles.viewDetailText}>Detail</Text>
                      <Ionicons name="chevron-forward" size={12} color="#2563eb" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* VIEW 2: DETAIL MODE (Opens when tapping a card) */
          <GlassCard style={[styles.detailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            {/* Top Back Button to List View */}
            <TouchableOpacity
              style={styles.backToListBtn}
              onPress={() => setSelectedSt(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={styles.backToListText}>Kembali ke Daftar Inbox</Text>
            </TouchableOpacity>

            {/* Full Title / Activity Description */}
            <Text style={[styles.detailFullTitle, { color: colors.textDark }]}>
              {selectedSt.title}
            </Text>

            {/* DAFTAR PERSONIL Presisi User Directive: Ditaruh di Atas Lokasi & Bento Metrics */}
            <View style={styles.personilSection}>
              <View style={styles.personilHeaderRow}>
                <Ionicons name="people-outline" size={15} color="#2563eb" style={{ marginRight: 4 }} />
                <Text style={styles.personilTitle}>
                  DAFTAR PERSONIL ({selectedSt.personil.length})
                </Text>
              </View>

              <View style={styles.personilGrid}>
                {selectedSt.personil.map((p, idx) => (
                  <View
                    key={idx}
                    style={[styles.personilCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}
                  >
                    <View style={styles.personilAvatar}>
                      <Ionicons name="person-outline" size={14} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.personilName, { color: colors.textDark }]}>{p.name}</Text>
                      <Text style={styles.personilNip}>{p.nip}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 3 Bento Metric Cards (PERIODE, LOKASI, DANA) */}
            <View style={styles.bentoMetricsRow}>
              {/* Metric 1: PERIODE */}
              <View style={[styles.metricCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc" }]}>
                <Text style={styles.metricLabel}>PERIODE</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={13} color="#2563eb" style={{ marginRight: 4 }} />
                  <Text style={[styles.metricValue, { color: colors.textDark }]} numberOfLines={2}>
                    {selectedSt.periode}
                  </Text>
                </View>
              </View>

              {/* Metric 2: LOKASI */}
              <View style={[styles.metricCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc" }]}>
                <Text style={styles.metricLabel}>LOKASI</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="location-outline" size={13} color="#2563eb" style={{ marginRight: 4 }} />
                  <Text style={[styles.metricValue, { color: colors.textDark }]} numberOfLines={2}>
                    {selectedSt.location}
                  </Text>
                </View>
              </View>

              {/* Metric 3: DANA */}
              <View style={[styles.metricCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc" }]}>
                <Text style={styles.metricLabel}>DANA</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.blueDot} />
                  <Text style={[styles.metricValue, { color: colors.textDark }]}>
                    {selectedSt.dana}
                  </Text>
                </View>
              </View>
            </View>

            {/* Dokumen Dasar Surat Card */}
            <View style={styles.dokumenCard}>
              <View style={styles.dokumenHeaderRow}>
                <Ionicons name="document-text-outline" size={20} color="#60a5fa" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.dokumenTitle}>Dokumen Dasar Surat</Text>
                  <Text style={styles.dokumenSub}>PDF DOKUMEN PENDUKUNG</Text>
                </View>
              </View>
              <Text style={styles.dokumenStatusText}>TIDAK ADA LAMPIRAN</Text>
            </View>

            {/* Action Button Group */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={styles.editStBtn}
                onPress={() => Alert.alert("Edit Surat Tugas", "Membuka formulir pengeditan Surat Tugas...")}
                activeOpacity={0.8}
              >
                <Text style={styles.editStText}>EDIT SURAT TUGAS</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActionRow}>
                <TouchableOpacity
                  style={styles.tolakBtn}
                  onPress={() => Alert.alert("Tolak Surat Tugas", "Permohonan Surat Tugas ini telah ditolak.")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tolakText}>TOLAK</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.arsipkanBtn}
                  onPress={() => Alert.alert("Arsipkan Surat Tugas", "Surat Tugas ini berhasil diarsipkan.")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.arsipkanText}>ARSIPKAN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB ☰ Menu) */}
      <FabMenu onNavigateToModule={handleSelectNavTab} activeSubmenu="inbox-surat-tugas" />
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
  headerAddStBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  headerAddStText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
    marginLeft: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 10,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Vertical List of ST Cards */
  verticalListContainer: {
    gap: 12,
  },
  verticalStCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardDateText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cardLocationText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
  viewDetailBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  viewDetailText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
    marginRight: 2,
  },

  /* Detail Card View */
  detailCard: {
    padding: 18,
    borderRadius: 22,
  },
  backToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    marginBottom: 14,
  },
  backToListText: {
    color: "#2563eb",
    fontSize: 11.5,
    fontWeight: "800",
  },
  detailFullTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    lineHeight: 19,
    marginBottom: 14,
  },

  personilSection: {
    marginBottom: 16,
  },
  personilHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  personilTitle: {
    color: "#1e293b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  personilGrid: {
    gap: 6,
  },
  personilCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: RADIUS.input,
  },
  personilAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  personilName: {
    fontSize: 12,
    fontWeight: "800",
  },
  personilNip: {
    color: "#94a3b8",
    fontSize: 10,
  },

  bentoMetricsRow: {
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    padding: 10,
    borderRadius: RADIUS.input,
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 15,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563eb",
    marginRight: 6,
  },

  dokumenCard: {
    backgroundColor: "#0f172a",
    borderRadius: RADIUS.card,
    padding: 14,
    marginBottom: 16,
  },
  dokumenHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dokumenTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  dokumenSub: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dokumenStatusText: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
    paddingVertical: 10,
    backgroundColor: "#1e293b",
    borderRadius: RADIUS.input,
  },

  actionGroup: {
    gap: 8,
  },
  editStBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: RADIUS.input,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  editStText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  tolakBtn: {
    flex: 1,
    backgroundColor: "#fef2f2",
    borderRadius: RADIUS.input,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tolakText: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  arsipkanBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: RADIUS.input,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  arsipkanText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
