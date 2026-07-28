import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../../theme";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";

interface BmnAssetCatalogScreenProps {
  onBack?: () => void;
}

export const BmnAssetCatalogScreen: React.FC<BmnAssetCatalogScreenProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Aset");
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [selectedAssetForLoan, setSelectedAssetForLoan] = useState<any>(null);

  // Form states for Loan Request
  const [loanPurpose, setLoanPurpose] = useState("");
  const [loanDurationDays, setLoanDurationDays] = useState("3");

  const categories = ["Semua Aset", "Kendaraan", "Elektronik", "Dipinjam"];

  const assets = [
    {
      id: "1",
      name: "Laptop Panasonic Toughbook",
      nup: "00045",
      code: "3.02.02.01.005",
      category: "Elektronik",
      status: "Tersedia",
      statusColor: COLORS.statusAvailable,
      iconName: "laptop-outline",
    },
    {
      id: "2",
      name: "GPS Garmin GPSMAP 66sr",
      nup: "00112",
      code: "3.02.02.03.012",
      category: "Elektronik",
      status: "Dipinjam",
      statusColor: COLORS.statusPending,
      borrower: "Hendra (Urusan Teknis)",
      iconName: "navigate-outline",
    },
    {
      id: "3",
      name: "Drone DJI Mavic 3 Enterprise",
      nup: "00088",
      code: "3.02.02.04.001",
      category: "Elektronik",
      status: "Tersedia",
      statusColor: COLORS.statusAvailable,
      iconName: "airplane-outline",
    },
  ];

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory =
      selectedCategory === "Semua Aset" ||
      (selectedCategory === "Kendaraan" && asset.category === "Kendaraan") ||
      (selectedCategory === "Elektronik" && asset.category === "Elektronik") ||
      (selectedCategory === "Dipinjam" && asset.status === "Dipinjam");

    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.nup.includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  const handleOpenLoanModal = (asset?: any) => {
    setSelectedAssetForLoan(asset || { name: "Toyota Hilux Double Cabin 4x4", nup: "00012" });
    setLoanModalVisible(true);
  };

  const handleSubmitLoan = () => {
    if (!loanPurpose.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan tujuan keperluan peminjaman.");
      return;
    }

    Alert.alert(
      "Pengajuan Berhasil",
      `Permohonan peminjaman ${selectedAssetForLoan?.name} selama ${loanDurationDays} hari telah diajukan ke Subbag TU.`,
      [{ text: "OK", onPress: () => setLoanModalVisible(false) }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textWhite} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleRow}>
          <Ionicons name="car-sport-sharp" size={22} color={COLORS.emeraldElectric} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Katalog Aset BMN</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>4 Aset</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMint} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari Nama Aset, NUP, atau Plat Nomor..."
            placeholderTextColor="rgba(167, 243, 208, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMint} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Asset Bento Box Card */}
        <GlassCard style={styles.featuredCard} highlighted>
          <View style={styles.featuredTagRow}>
            <View style={styles.statusBadgeWarning}>
              <Ionicons name="time-outline" size={13} color={COLORS.statusPending} style={{ marginRight: 4 }} />
              <Text style={styles.statusTextWarning}>Dipinjam (Sisa 3 Hari)</Text>
            </View>
          </View>

          <Text style={styles.featuredTitle}>Toyota Hilux Double Cabin 4x4</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Kode Barang</Text>
              <Text style={styles.detailValue}>3.02.01.01.002</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>NUP</Text>
              <Text style={styles.detailValue}>00012</Text>
            </View>
          </View>

          <View style={styles.platRow}>
            <Text style={styles.detailLabel}>Plat Nomor Kendaraan</Text>
            <Text style={styles.platValue}>KT 8192 BKS</Text>
          </View>

          <View style={styles.borrowerCard}>
            <Ionicons name="person-circle-outline" size={24} color={COLORS.emeraldElectric} style={{ marginRight: 8 }} />
            <View style={styles.borrowerInfo}>
              <Text style={styles.borrowerName}>Dipinjam oleh Subagja</Text>
              <Text style={styles.borrowerRole}>Ka Sub Bag TU (Operasional Patroli)</Text>
            </View>
          </View>

          <View style={styles.actionBtnRow}>
            <EmeraldButton
              title="Scan QR Aset"
              onPress={() => Alert.alert("QR Scanner", "Pemindai Kamera QR Code BMN aktif!")}
              style={styles.actionBtnFlex}
            />
            <EmeraldButton
              title="Surat Kuasa PDF"
              variant="outline"
              onPress={() => Alert.alert("PDF Document", "Mengunduh Surat Kuasa Penggunaan Kendaraan Dinas...")}
              style={styles.actionBtnFlex}
            />
          </View>
        </GlassCard>

        {/* Catalog List Section */}
        <Text style={styles.sectionTitle}>Daftar Aset BMN Lainnya</Text>

        <View style={styles.assetList}>
          {filteredAssets.map((asset) => (
            <GlassCard key={asset.id} style={styles.assetCard}>
              <View style={styles.assetIconBg}>
                <Ionicons name={asset.iconName as any} size={20} color={COLORS.emeraldElectric} />
              </View>

              <View style={styles.assetMain}>
                <Text style={styles.assetTitle}>{asset.name}</Text>
                <Text style={styles.assetMeta}>
                  NUP: {asset.nup} • Kode: {asset.code}
                </Text>
                {asset.borrower && (
                  <Text style={styles.assetBorrower}>Peminjam: {asset.borrower}</Text>
                )}
              </View>

              <View style={styles.assetRight}>
                <View style={[styles.statusTag, { borderColor: asset.statusColor }]}>
                  <Text style={[styles.statusTagText, { color: asset.statusColor }]}>
                    {asset.status}
                  </Text>
                </View>
                {asset.status === "Tersedia" && (
                  <TouchableOpacity
                    style={styles.loanQuickBtn}
                    onPress={() => handleOpenLoanModal(asset)}
                  >
                    <Text style={styles.loanQuickText}>Pinjam ›</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>

      {/* FAB (+) Button */}
      <TouchableOpacity
        style={[styles.fab, SHADOWS.glowEmerald]}
        onPress={() => handleOpenLoanModal()}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={COLORS.textDark} />
      </TouchableOpacity>

      {/* Loan Request Modal */}
      <Modal visible={loanModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} highlighted>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Form Peminjaman BMN</Text>
              <TouchableOpacity onPress={() => setLoanModalVisible(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMint} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Aset: <Text style={{ color: COLORS.textWhite }}>{selectedAssetForLoan?.name}</Text> (NUP: {selectedAssetForLoan?.nup})
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Keperluan / Tujuan Pemakaian</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Contoh: Operasional Patroli Kawasan Cagar Alam"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                multiline
                numberOfLines={3}
                value={loanPurpose}
                onChangeText={setLoanPurpose}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rencana Durasi Peminjaman (Hari)</Text>
              <TextInput
                style={styles.input}
                placeholder="3"
                keyboardType="numeric"
                value={loanDurationDays}
                onChangeText={setLoanDurationDays}
              />
            </View>

            <EmeraldButton
              title="KIRIM PENGAJUAN PEMINJAMAN ➔"
              onPress={handleSubmitLoan}
              style={{ marginTop: 10 }}
            />
          </GlassCard>
        </View>
      </Modal>
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  countText: {
    color: COLORS.emeraldElectric,
    fontSize: 11.5,
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
    backgroundColor: "rgba(15, 41, 30, 0.6)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 14,
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
  featuredCard: {
    padding: 18,
    marginBottom: 24,
  },
  featuredTagRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  statusBadgeWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  statusTextWarning: {
    color: COLORS.statusPending,
    fontSize: 11.5,
    fontWeight: "700",
  },
  featuredTitle: {
    color: COLORS.textWhite,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.textWhite,
    fontSize: 13.5,
    fontWeight: "600",
  },
  platRow: {
    marginBottom: 14,
  },
  platValue: {
    color: COLORS.emeraldElectric,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  borrowerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 26, 18, 0.7)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    padding: 10,
    marginBottom: 16,
  },
  borrowerInfo: {
    flex: 1,
  },
  borrowerName: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: "700",
  },
  borrowerRole: {
    color: COLORS.textMint,
    fontSize: 11,
    opacity: 0.8,
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnFlex: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  assetList: {
    gap: 10,
  },
  assetCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  assetIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  assetMain: {
    flex: 1,
  },
  assetTitle: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "700",
  },
  assetMeta: {
    color: COLORS.textMint,
    fontSize: 11.5,
    marginTop: 2,
    opacity: 0.8,
  },
  assetBorrower: {
    color: COLORS.statusPending,
    fontSize: 11,
    marginTop: 2,
  },
  assetRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusTag: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  statusTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  loanQuickBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  loanQuickText: {
    color: COLORS.emeraldElectric,
    fontSize: 11,
    fontWeight: "700",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    padding: 22,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: "700",
  },
  modalSub: {
    color: COLORS.textMint,
    fontSize: 12.5,
    marginBottom: 16,
    opacity: 0.85,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: COLORS.textMint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(6, 26, 18, 0.7)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.textWhite,
    fontSize: 13.5,
  },
  textarea: {
    height: 72,
    textAlignVertical: "top",
    paddingTop: 10,
  },
});
