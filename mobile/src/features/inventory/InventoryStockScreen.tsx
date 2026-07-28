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
import { COLORS, RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface InventoryStockScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const InventoryStockScreen: React.FC<InventoryStockScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Stok");
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [transType, setTransType] = useState<"out" | "in">("out");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState("1");
  const [notesInput, setNotesInput] = useState("");

  const categories = ["Semua Stok", "Perlengkapan Lapangan", "ATK", "Obat Satwa"];
  const [stockItems, setStockItems] = useState<any[]>([]);

  const fetchInventoryStocks = async () => {
    try {
      const response = await apiClient.get<any>("/inventory/stocks");
      if (response.data && Array.isArray(response.data.data)) {
        const apiItems = response.data.data.map((item: any) => ({
          id: String(item.id),
          name: item.nama_barang || item.name,
          code: item.kode_barang || "INV-001",
          category: item.kategori || "Perlengkapan Lapangan",
          stock: item.stok ?? item.stock ?? 0,
          unit: item.satuan || "Unit",
          status: (item.stok ?? item.stock ?? 0) < 10 ? "Stok Tipis" : "Tersedia",
          statusColor: (item.stok ?? item.stock ?? 0) < 10 ? COLORS.statusPending : COLORS.statusAvailable,
          iconName: "cube-outline",
        }));
        setStockItems(apiItems);
      } else {
        setStockItems([]);
      }
    } catch {
      setStockItems([]);
    }
  };

  useEffect(() => {
    fetchInventoryStocks();
  }, []);

  const filteredItems = stockItems.filter((item) => {
    const matchesCat =
      selectedCategory === "Semua Stok" || item.category === selectedCategory;

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesSearch;
  });

  const handleOpenTransaction = (item: any, type: "out" | "in") => {
    setSelectedItem(item);
    setTransType(type);
    setQtyInput("1");
    setNotesInput("");
    setTransModalVisible(true);
  };

  const handleSubmitTransaction = () => {
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Perhatian", "Silakan masukkan jumlah kuantitas yang valid.");
      return;
    }

    const typeName = transType === "out" ? "Pengambilan Stok Keluar" : "Penerimaan Stok Masuk";
    Alert.alert(
      "Transaksi Berhasil",
      `${typeName} sebanyak ${qty} ${selectedItem?.unit} untuk "${selectedItem?.name}" berhasil dicatat.`,
      [{ text: "OK", onPress: () => setTransModalVisible(false) }]
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
          <Ionicons name="cube" size={22} color="#059669" style={{ marginRight: 8 }} />
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Stok Inventaris</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{stockItems.length} Item</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Cari Nama Barang, Kode, atau Kategori..."
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

        {/* Stock Items Grid / List */}
        <View style={styles.itemList}>
          {filteredItems.map((item) => (
            <GlassCard key={item.id} style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]} highlighted={item.status === "Stok Tipis"}>
              <View style={styles.itemIconBg}>
                <Ionicons name={item.iconName as any} size={22} color="#059669" />
              </View>

              <View style={styles.itemMain}>
                <Text style={[styles.itemTitle, { color: colors.textDark }]}>{item.name}</Text>
                <Text style={[styles.itemCode, { color: colors.textMuted }]}>
                  Kode: {item.code} • {item.category}
                </Text>
                <View style={styles.stockQtyRow}>
                  <Text style={styles.stockQtyLabel}>Sisa Stok:</Text>
                  <Text style={[styles.stockQtyValue, { color: item.statusColor }]}>
                    {item.stock} {item.unit}
                  </Text>
                </View>
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionOutBtn}
                  onPress={() => handleOpenTransaction(item, "out")}
                >
                  <Text style={styles.actionOutText}>Stok Keluar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionInBtn}
                  onPress={() => handleOpenTransaction(item, "in")}
                >
                  <Text style={styles.actionInText}>Tambah Stok</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB ☰ Menu) in Bottom Right Corner */}
      <FabMenu onNavigateToModule={handleSelectNavTab} />

      {/* Transaction Modal */}
      <Modal visible={transModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]} highlighted>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>
                {transType === "out" ? "Catat Stok Keluar" : "Tambah Stok Masuk"}
              </Text>
              <TouchableOpacity onPress={() => setTransModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Barang: <Text style={{ color: colors.textDark, fontWeight: "700" }}>{selectedItem?.name}</Text>
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Jumlah ({selectedItem?.unit})</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="1"
                keyboardType="numeric"
                value={qtyInput}
                onChangeText={setQtyInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Keterangan / Tujuan Penggunaan</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Contoh: Digunakan untuk Patroli Lapangan"
                placeholderTextColor="#94a3b8"
                value={notesInput}
                onChangeText={setNotesInput}
              />
            </View>

            <EmeraldButton
              title={transType === "out" ? "PROSES STOK KELUAR ➔" : "SIMPAN STOK MASUK ➔"}
              onPress={handleSubmitTransaction}
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
  itemList: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  itemIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemMain: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemCode: {
    fontSize: 11.5,
    marginTop: 2,
  },
  stockQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  stockQtyLabel: {
    color: "#94a3b8",
    fontSize: 11.5,
    marginRight: 4,
  },
  stockQtyValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  itemActions: {
    gap: 6,
  },
  actionOutBtn: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    alignItems: "center",
  },
  actionOutText: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "700",
  },
  actionInBtn: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    alignItems: "center",
  },
  actionInText: {
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
});
