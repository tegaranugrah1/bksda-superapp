import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
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
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>📋</Text>
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
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari No. Agenda, No. Surat, atau Perihal..."
            placeholderTextColor="rgba(167, 243, 208, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>✕</Text>
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
              <Text style={styles.asalSuratText}>Asal Surat: <Text style={{ color: COLORS.textWhite }}>{item.asalSurat}</Text></Text>
              <Text style={styles.perihalText} numberOfLines={2}>
                {item.perihal}
              </Text>

              <View style={styles.cardActionRow}>
                <EmeraldButton
                  title="🖨️ Cetak Ulang Disposisi"
                  onPress={() => handleOpenReprintModal(item)}
                  style={styles.reprintBtn}
                />
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => onNavigateToCreate && onNavigateToCreate()}
                >
                  <Text style={styles.editBtnText}>✏️ Edit</Text>
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
          <Text style={styles.fabIcon}>+</Text>
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
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: "rgba(15, 41, 30, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  backIcon: {
    color: COLORS.textWhite,
    fontSize: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: "700",
  },
  addNavBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: COLORS.emeraldElectric,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  addNavIcon: {
    color: COLORS.emeraldElectric,
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
    backgroundColor: "rgba(15, 41, 30, 0.6)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 14,
  },
  clearSearchText: {
    color: COLORS.textMint,
    fontSize: 14,
    opacity: 0.6,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(15, 41, 30, 0.5)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: COLORS.emeraldElectric,
  },
  filterPillText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: COLORS.emeraldElectric,
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
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  agendaBadgeText: {
    color: COLORS.emeraldElectric,
    fontSize: 11,
    fontWeight: "800",
  },
  dateText: {
    color: COLORS.textMuted,
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
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  asalSuratText: {
    color: COLORS.textMint,
    fontSize: 12,
    marginBottom: 6,
    opacity: 0.85,
  },
  perihalText: {
    color: COLORS.textWhite,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    paddingTop: 12,
  },
  reprintBtn: {
    flex: 1,
    height: 42,
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  editBtnText: {
    color: COLORS.textMint,
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
    backgroundColor: COLORS.emeraldElectric,
    alignItems: "center",
    justifyContent: "center",
  },
  fabIcon: {
    color: COLORS.textDark,
    fontSize: 32,
    fontWeight: "300",
    marginTop: -2,
  },
});
