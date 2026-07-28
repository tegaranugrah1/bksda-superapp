import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface BmnAssetCatalogScreenProps {
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const BmnAssetCatalogScreen: React.FC<BmnAssetCatalogScreenProps> = ({
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Aset");
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [selectedAssetForLoan, setSelectedAssetForLoan] = useState<any>(null);

  const [loanPurpose, setLoanPurpose] = useState("");
  const [loanDurationDays, setLoanDurationDays] = useState("3");

  const categories = ["Semua Aset", "Kendaraan", "Elektronik", "Dipinjam"];
  const [assets, setAssets] = useState<any[]>([]);

  const fetchBmnAssets = async () => {
    try {
      const response = await apiClient.get<any>("/bmn/assets");
      if (response.data && Array.isArray(response.data.data)) {
        const apiAssets = response.data.data.map((item: any) => ({
          id: String(item.id),
          name: item.nama_barang || item.name,
          nup: item.nup || "00001",
          code: item.kode_barang || "3.02.01",
          category: item.kategori || "Elektronik",
          status: item.status || "Tersedia",
          statusColor: item.status === "Dipinjam" ? COLORS.statusPending : COLORS.statusAvailable,
          iconName: item.kategori === "Kendaraan" ? "car-outline" : "laptop-outline",
        }));
        setAssets(apiAssets);
      } else {
        setAssets([]);
      }
    } catch {
      setAssets([]);
    }
  };

  useEffect(() => {
    fetchBmnAssets();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.nup.includes(searchQuery) ||
      asset.code.includes(searchQuery);

    if (selectedCategory === "Semua Aset") return matchesSearch;
    if (selectedCategory === "Dipinjam") return matchesSearch && asset.status === "Dipinjam";
    return matchesSearch && asset.category === selectedCategory;
  });

  const handleOpenLoanModal = (asset?: any) => {
    const target = asset || { name: "Toyota Hilux Double Cabin 4x4", nup: "00012" };
    if (target.status === "Dipinjam") {
      Alert.alert(
        "Aset Sedang Dipinjam",
        `Aset ${target.name} (NUP: ${target.nup}) saat ini sedang dipinjam oleh personil lain.`
      );
      return;
    }
    setSelectedAssetForLoan(target);
    setLoanModalVisible(true);
  };

  const handleSubmitLoan = () => {
    if (!loanPurpose.trim()) {
      Alert.alert("Perhatian", "Silakan isi keperluan peminjaman aset.");
      return;
    }
    Alert.alert(
      "Peminjaman Berhasil Diajukan!",
      `Permohonan peminjaman ${selectedAssetForLoan?.name} selama ${loanDurationDays} hari telah diajukan ke Subbag TU.`,
      [{ text: "OK", onPress: () => setLoanModalVisible(false) }]
    );
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
      {/* Header with Working Back Button */}
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
          <Ionicons name="car-sport" size={22} color="#059669" style={{ marginRight: 8 }} />
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Katalog Aset BMN</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>4 Aset</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Cari Nama Aset, NUP, atau Plat Nomor..."
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

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  isActive && styles.filterPillActive,
                ]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Asset Bento Box Card */}
        <GlassCard style={[styles.featuredCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]} highlighted>
          <View style={styles.featuredTagRow}>
            <View style={styles.statusBadgeWarning}>
              <Ionicons name="time-outline" size={13} color={COLORS.statusPending} style={{ marginRight: 4 }} />
              <Text style={styles.statusTextWarning}>Dipinjam (Sisa 3 Hari)</Text>
            </View>
          </View>

          <Text style={[styles.featuredTitle, { color: colors.textDark }]}>Toyota Hilux Double Cabin 4x4</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Kode Barang</Text>
              <Text style={[styles.detailValue, { color: colors.textDark }]}>3.02.01.01.002</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>NUP</Text>
              <Text style={[styles.detailValue, { color: colors.textDark }]}>00012</Text>
            </View>
          </View>

          <View style={styles.platRow}>
            <Text style={styles.detailLabel}>Plat Nomor Kendaraan</Text>
            <Text style={styles.platValue}>KT 8192 BKS</Text>
          </View>

          <View style={[styles.borrowerCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f8fafc" }]}>
            <Ionicons name="person-circle-outline" size={24} color="#059669" style={{ marginRight: 8 }} />
            <View style={styles.borrowerInfo}>
              <Text style={[styles.borrowerName, { color: colors.textDark }]}>Dipinjam oleh Subagja</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Daftar Aset BMN Lainnya</Text>

        <View style={styles.assetList}>
          {filteredAssets.map((asset) => (
            <GlassCard key={asset.id} style={[styles.assetCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              <View style={styles.assetIconBg}>
                <Ionicons name={asset.iconName as any} size={20} color="#059669" />
              </View>

              <View style={styles.assetMain}>
                <Text style={[styles.assetTitle, { color: colors.textDark }]}>{asset.name}</Text>
                <Text style={[styles.assetMeta, { color: colors.textMuted }]}>
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

      {/* Floating Action Button (FAB ☰ Menu) in Bottom Right Corner */}
      <FabMenu onNavigateToModule={handleSelectNavTab} />

      {/* Loan Request Modal */}
      <Modal visible={loanModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]} highlighted>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Form Peminjaman BMN</Text>
              <TouchableOpacity onPress={() => setLoanModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Aset: <Text style={{ color: colors.textDark, fontWeight: "700" }}>{selectedAssetForLoan?.name}</Text> (NUP: {selectedAssetForLoan?.nup})
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Keperluan / Tujuan Pemakaian</Text>
              <TextInput
                style={[styles.input, styles.textarea, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Contoh: Operasional Patroli Kawasan Cagar Alam"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={loanPurpose}
                onChangeText={setLoanPurpose}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rencana Durasi Peminjaman (Hari)</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
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
  countBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  countText: {
    color: "#059669",
    fontSize: 11.5,
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
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
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
    color: "#94a3b8",
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 2,
    fontWeight: "700",
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  platRow: {
    marginBottom: 14,
  },
  platValue: {
    color: "#059669",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  borrowerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: RADIUS.input,
    padding: 10,
    marginBottom: 16,
  },
  borrowerInfo: {
    flex: 1,
  },
  borrowerName: {
    fontSize: 13,
    fontWeight: "700",
  },
  borrowerRole: {
    color: "#64748b",
    fontSize: 11,
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnFlex: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
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
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  assetMain: {
    flex: 1,
  },
  assetTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  assetMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  assetBorrower: {
    color: COLORS.statusPending,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
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
    backgroundColor: "#ecfdf5",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  loanQuickText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
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
    fontSize: 18,
    fontWeight: "800",
  },
  modalSub: {
    color: "#64748b",
    fontSize: 12.5,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#1e293b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
  },
  textarea: {
    height: 72,
    textAlignVertical: "top",
    paddingTop: 10,
  },
});
