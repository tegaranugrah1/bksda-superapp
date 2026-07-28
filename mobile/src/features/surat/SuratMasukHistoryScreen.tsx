import React, { useState } from "react";
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
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { SuratDisposisiPrintPreviewModal } from "./SuratDisposisiPrintPreviewModal";

interface SuratMasukHistoryScreenProps {
  onBack?: () => void;
  onNavigateToCreate?: () => void;
}

export const SuratMasukHistoryScreen: React.FC<SuratMasukHistoryScreenProps> = ({
  onBack,
  onNavigateToCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSifatFilter, setSelectedSifatFilter] = useState("Semua Surat");
  const [previewSuratData, setPreviewSuratData] = useState<any>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const filters = ["Semua Surat", "Sangat Penting", "Penting", "Biasa"];

  const suratHistoryList = [
    {
      id: "1",
      noAgenda: "1015",
      noSurat: "SURAT/BKSDA/2026/1015",
      tanggalSurat: "25/07/2026",
      terimaAgenda: "25/07/2026",
      asalSurat: "Apekli",
      lampiran: "3 Set",
      perihal: "Permohonan Pengadaan Obat-Obatan Translokasi Badak Sumatera",
      sifat: "SANGAT PENTING",
      sifatColor: COLORS.statusPending,
      catatan: "Harap segera ditindaklanjuti dan disiapkan bahan laporannya.",
      diteruskanList: [
        "1. Ka Sub Bag TU",
        "2. Urusan Kepegawaian",
        "3. Urusan Keuangan",
        "4. Urusan Teknis",
      ],
    },
    {
      id: "2",
      noAgenda: "1014",
      noSurat: "UND/DIRJEN/142/2026",
      tanggalSurat: "24/07/2026",
      terimaAgenda: "24/07/2026",
      asalSurat: "Kementerian LHK",
      lampiran: "1 Berkas",
      perihal: "Undangan Rapat Koordinasi Mitigasi Konflik Satwa Liar Regional Kalimantan",
      sifat: "BIASA",
      sifatColor: COLORS.statusAvailable,
      catatan: "Wakili dan koordinasikan dengan Urusan Teknis.",
      diteruskanList: [
        "1. Ka Sub Bag TU",
        "2. Urusan Teknis",
        "3. Urusan Perlindungan",
      ],
    },
    {
      id: "3",
      noAgenda: "1013",
      noSurat: "LAP/RESORT-W/089/2026",
      tanggalSurat: "23/07/2026",
      terimaAgenda: "24/07/2026",
      asalSurat: "Resort Konservasi Wilayah Barat",
      lampiran: "2 Lembar",
      perihal: "Laporan Patroli Rutin Pencegahan Ilegal Logging Kawasan Penyangga",
      sifat: "PENTING",
      sifatColor: COLORS.statusInfo,
      catatan: "Arsipkan dan masukkan dalam laporan triwulanan.",
      diteruskanList: [
        "1. Ka Sub Bag TU",
        "2. Urusan Data Evlap dan Humas",
        "3. Urusan Program",
      ],
    },
  ];

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleRow}>
          <Ionicons name="document-text" size={22} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Riwayat Surat Masuk</Text>
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
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
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
                style={[styles.filterPill, isActive && styles.filterPillActive]}
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
            <GlassCard key={item.id} style={styles.historyCard} highlighted={item.sifat === "SANGAT PENTING"}>
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

              <Text style={styles.noSuratText}>{item.noSurat}</Text>
              <Text style={styles.asalSuratText}>Asal Surat: <Text style={{ color: "#0f172a", fontWeight: "700" }}>{item.asalSurat}</Text></Text>
              <Text style={styles.perihalText} numberOfLines={2}>
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

      {/* FAB (+) Button */}
      {onNavigateToCreate && (
        <TouchableOpacity
          style={[styles.fab, SHADOWS.glowEmerald]}
          onPress={onNavigateToCreate}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#ffffff" />
        </TouchableOpacity>
      )}

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
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    color: "#0f172a",
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
    paddingBottom: 40,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#0f172a",
    fontSize: 14,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    backgroundColor: "#ffffff",
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
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  asalSuratText: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 6,
  },
  perihalText: {
    color: "#334155",
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
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
});
