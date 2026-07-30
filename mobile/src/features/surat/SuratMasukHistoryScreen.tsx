import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { SuratDisposisiPrintPreviewModal } from "./SuratDisposisiPrintPreviewModal";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface SuratMasukHistoryScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToCreate?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const SuratMasukHistoryScreen: React.FC<SuratMasukHistoryScreenProps> = ({
  navigation,
  onBack,
  onNavigateToCreate,
  onNavigateToModule,
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSifatFilter, setSelectedSifatFilter] = useState("Semua Surat");
  const [previewSuratData, setPreviewSuratData] = useState<any>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const filters = ["Semua Surat", "Sangat Penting", "Penting", "Biasa"];
  const [suratHistoryList, setSuratHistoryList] = useState<any[]>([]);

  const fetchSuratMasuk = async () => {
    try {
      const response = await apiClient.get<any>("/surat/surat-masuk");
      if (response.data && Array.isArray(response.data.data)) {
        const apiList = response.data.data.map((surat: any) => ({
          id: String(surat.id),
          noAgenda: surat.nomor_agenda || String(surat.id),
          noSurat: surat.nomor_surat || "-",
          tanggalSurat: surat.tanggal_surat || "2026",
          terimaAgenda: surat.created_at ? new Date(surat.created_at).toLocaleDateString("id-ID") : "2026",
          asalSurat: surat.pengirim || surat.asal_surat || "-",
          lampiran: surat.lampiran || "-",
          perihal: surat.perihal || "-",
          sifat: (surat.sifat || "Biasa").toUpperCase(),
          sifatColor: surat.sifat === "Sangat Penting" ? COLORS.statusPending : "#3b82f6",
          catatan: surat.ringkasan || surat.catatan || "-",
          diteruskanList: Array.isArray(surat.diteruskan_ke) ? surat.diteruskan_ke : [],
        }));
        setSuratHistoryList(apiList);
      } else {
        setSuratHistoryList([]);
      }
    } catch {
      setSuratHistoryList([]);
    }
  };

  useEffect(() => {
    fetchSuratMasuk();
  }, []);


  const filteredList = suratHistoryList.filter((item) => {
    const matchesFilter =
      selectedSifatFilter === "Semua Surat" ||
      (selectedSifatFilter === "Sangat Penting" && item.sifat === "SANGAT PENTING") ||
      (selectedSifatFilter === "Penting" && item.sifat === "PENTING") ||
      (selectedSifatFilter === "Biasa" && item.sifat === "BIASA");

    const matchesSearch =
      item.noAgenda.includes(searchQuery) ||
      item.noSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asalSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.perihal.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleOpenReprintModal = (item: any) => {
    setPreviewSuratData(item);
    setPreviewModalVisible(true);
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.navigate("Dashboard");
    }
  };

  const handleSelectNavTab = (tabKey: string) => {
    if (tabKey === "home" || tabKey === "portal" || tabKey === "dashboard") {
      if (navigation) {
        navigation.navigate("Dashboard");
      } else if (onBack) {
        onBack();
      }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header */}
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
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="document-text" size={22} color="#059669" style={{ marginRight: 8 }} />
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Riwayat Surat Masuk</Text>
        </View>
        <TouchableOpacity
          style={styles.addNavBtn}
          onPress={() => onNavigateToCreate && onNavigateToCreate()}
        >
          <Text style={styles.addNavIcon}>+ Input</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Cari No. Agenda, No. Surat, atau Perihal..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map((f) => {
            const isActive = selectedSifatFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedSifatFilter(f)}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  isActive && styles.filterPillActive,
                ]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Ordered History Cards */}
        <View style={styles.historyList}>
          {filteredList.map((item) => (
            <GlassCard key={item.id} style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]} highlighted={item.sifat === "SANGAT PENTING"}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.agendaBadge}>
                  <Text style={styles.agendaBadgeText}>Agenda #{item.noAgenda}</Text>
                </View>
                <Text style={styles.dateText}>{item.tanggalSurat}</Text>
                <View style={[styles.sifatBadge, { borderColor: item.sifatColor }]}>
                  <Text style={[styles.sifatBadgeText, { color: item.sifatColor }]}>
                    {item.sifat}
                  </Text>
                </View>
              </View>

              <Text style={[styles.noSuratText, { color: colors.textDark }]}>{item.noSurat}</Text>
              <Text style={[styles.asalSuratText, { color: colors.textMuted }]}>Asal Surat: <Text style={{ color: colors.textDark, fontWeight: "700" }}>{item.asalSurat}</Text></Text>
              <Text style={[styles.perihalText, { color: colors.textDark }]} numberOfLines={2}>
                {item.perihal}
              </Text>

              <View style={styles.cardActionRow}>
                <EmeraldButton
                  title="Cetak Ulang Disposisi"
                  onPress={() => handleOpenReprintModal(item)}
                  style={styles.reprintBtn}
                />
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => onNavigateToCreate && onNavigateToCreate()}
                >
                  <Ionicons name="pencil" size={14} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB ☰ Menu) in Bottom Right Corner */}
      <FabMenu onNavigateToModule={handleSelectNavTab} />

      {/* Print Preview Modal */}
      {previewSuratData && (
        <SuratDisposisiPrintPreviewModal
          visible={previewModalVisible}
          onClose={() => setPreviewModalVisible(false)}
          suratData={previewSuratData}
        />
      )}
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 10,
    padding: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  addNavBtn: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  addNavIcon: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#059669",
  },
  filterPillText: {
    color: "#64748b",
    fontSize: 12.5,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#059669",
    fontWeight: "700",
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  agendaBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  agendaBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  dateText: {
    color: "#94a3b8",
    fontSize: 11.5,
  },
  sifatBadge: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  sifatBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  noSuratText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  asalSuratText: {
    fontSize: 12,
    marginBottom: 6,
  },
  perihalText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  reprintBtn: {
    flex: 1,
    height: 42,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  editBtnText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
});
