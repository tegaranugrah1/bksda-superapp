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
import { COLORS, RADIUS, SHADOWS } from "../../theme";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";

interface InventoryStockScreenProps {
  onBack?: () => void;
}

export const InventoryStockScreen: React.FC<InventoryStockScreenProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Stok");
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [transType, setTransType] = useState<"out" | "in">("out");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState("1");
  const [notesInput, setNotesInput] = useState("");

  const categories = ["Semua Stok", "Perlengkapan Lapangan", "ATK", "Obat Satwa"];

  const stockItems = [
    {
      id: "1",
      name: "Kantung Tidur / Sleeping Bag Patroli",
      code: "INV-PL-001",
      category: "Perlengkapan Lapangan",
      stock: 24,
      unit: "Unit",
      status: "Tersedia",
      statusColor: COLORS.statusAvailable,
    },
    {
      id: "2",
      name: "Obat Translokasi & Anestesi Satwa",
      code: "INV-MED-004",
      category: "Obat Satwa",
      stock: 5,
      unit: "Paket",
      status: "Stok Tipis",
      statusColor: COLORS.statusPending,
    },
    {
      id: "3",
      name: "Kertas HVS A4 80gr Sidu",
      code: "INV-ATK-012",
      category: "ATK",
      stock: 42,
      unit: "Rim",
      status: "Tersedia",
      statusColor: COLORS.statusAvailable,
    },
    {
      id: "4",
      name: "Tenda Lapangan Waterproof 4P",
      code: "INV-PL-008",
      category: "Perlengkapan Lapangan",
      stock: 12,
      unit: "Unit",
      status: "Tersedia",
      statusColor: COLORS.statusAvailable,
    },
  ];

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
          <Text style={styles.headerIcon}>📦</Text>
          <Text style={styles.headerTitle}>Stok Inventaris</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{stockItems.length} Item</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari Nama Barang, Kode, atau Kategori..."
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

        {/* Stock Items Grid / List */}
        <View style={styles.itemList}>
          {filteredItems.map((item) => (
            <GlassCard key={item.id} style={styles.itemCard} highlighted={item.status === "Stok Tipis"}>
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemCode}>
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
                  <Text style={styles.actionOutText}>📤 Keluar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionInBtn}
                  onPress={() => handleOpenTransaction(item, "in")}
                >
                  <Text style={styles.actionInText}>📥 Masuk</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>

      {/* Transaction Modal */}
      <Modal visible={transModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} highlighted>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transType === "out" ? "Catat Stok Keluar" : "Tambah Stok Masuk"}
              </Text>
              <TouchableOpacity onPress={() => setTransModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Barang: <Text style={{ color: COLORS.textWhite }}>{selectedItem?.name}</Text>
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Jumlah ({selectedItem?.unit})</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={qtyInput}
                onChangeText={setQtyInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Keterangan / Tujuan Penggunaan</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Digunakan untuk Patroli Lapangan"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
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
  itemList: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemMain: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "700",
  },
  itemCode: {
    color: COLORS.textMint,
    fontSize: 11.5,
    marginTop: 2,
    opacity: 0.8,
  },
  stockQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  stockQtyLabel: {
    color: COLORS.textMuted,
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
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
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
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    alignItems: "center",
  },
  actionInText: {
    color: COLORS.emeraldElectric,
    fontSize: 11,
    fontWeight: "700",
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
  closeText: {
    color: COLORS.textMint,
    fontSize: 18,
    padding: 4,
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
});
