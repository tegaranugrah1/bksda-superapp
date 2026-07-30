import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

import { BmnDashboardScreen } from "./screens/BmnDashboardScreen";

interface BmnAssetCatalogScreenProps {
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
  navigation?: any;
}

export const BmnAssetCatalogScreen: React.FC<BmnAssetCatalogScreenProps> = ({
  onBack,
  onNavigateToModule,
  navigation,
}) => {
  const { isDark, colors } = useTheme();
  const [activeSegment, setActiveSegment] = useState<"dashboard" | "katalog">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [nupQuery, setNupQuery] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("Semua Aset");
  const [selectedJenis, setSelectedJenis] = useState("Semua Jenis BMN");
  const [selectedLokasi, setSelectedLokasi] = useState("Semua Lokasi");

  const [jenisModalVisible, setJenisModalVisible] = useState(false);
  const [lokasiModalVisible, setLokasiModalVisible] = useState(false);

  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [selectedAssetForLoan, setSelectedAssetForLoan] = useState<any>(null);

  const [loanPurpose, setLoanPurpose] = useState("");
  const [loanDurationDays, setLoanDurationDays] = useState("3");

  const [assets, setAssets] = useState<any[]>([]);

  // Pagination & Loading States
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const jenisOptions = [
    "Semua Jenis BMN",
    "Alat Angkutan Bermotor",
    "Alat Besar",
    "Alat Persenjataan",
    "Bangunan Air",
    "Bangunan dan Gedung",
    "Mesin Peralatan TIK",
    "Mesin Peralatan Non TIK",
    "Rumah Negara",
    "Tanah",
  ];

  const lokasiOptions = [
    "Semua Lokasi",
    "Belum berlokasi",
    "1 - Omsetan",
    "Gudang BMN",
  ];

  const fetchBmnAssets = useCallback(async (page: number = 1, isPullRefresh: boolean = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params: Record<string, any> = {
        page: page,
        per_page: perPage,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (nupQuery.trim()) params.nup = nupQuery.trim();
      if (selectedCategory && selectedCategory !== "Semua Aset") {
        params.kondisi = selectedCategory;
      }
      if (selectedJenis && selectedJenis !== "Semua Jenis BMN") {
        params.jenis_bmn = selectedJenis;
      }
      if (selectedLokasi && selectedLokasi !== "Semua Lokasi") {
        params.lokasi_ruang = selectedLokasi;
      }

      const response = await apiClient.get<any>("/bmn/assets", { params });

      if (response.data && Array.isArray(response.data.data)) {
        const apiAssets = response.data.data.map((item: any) => {
          const year = item.tanggal_perolehan
            ? new Date(item.tanggal_perolehan).getFullYear()
            : (item.tanggal_buku_pertama ? new Date(item.tanggal_buku_pertama).getFullYear() : 2022);
          
          const merkType = item.merk_tipe || item.merk || item.tipe || "-";
          
          return {
            id: String(item.id),
            name: item.nama_barang || item.name || "Aset BMN",
            nup: item.nup ? String(item.nup) : "1",
            nupLama: item.nup_lama ? String(item.nup_lama) : "-",
            code: item.kode_barang || "3150303005",
            category: item.jenis_bmn || item.kategori || "ELEKTRONIK",
            merkType: merkType,
            year: year,
            kondisi: item.kondisi || "Baik",
            lokasi: item.lokasi_ruang || "Belum berlokasi",
            pengguna: item.nama_pengguna || item.pengguna || "-",
            noPolisi: item.no_polisi || item.no_bpkp || null,
            status: item.status_bmn || item.status || "Tersedia",
          };
        });

        setAssets(apiAssets);

        const meta = response.data.meta || {};
        setCurrentPage(meta.current_page || page);
        setTotalPages(meta.last_page || 1);
        setTotalItems(meta.total || apiAssets.length);
        setFromItem(meta.from || (apiAssets.length > 0 ? (page - 1) * perPage + 1 : 0));
        setToItem(meta.to || (apiAssets.length > 0 ? (page - 1) * perPage + apiAssets.length : 0));
      } else {
        setAssets([]);
        setTotalPages(1);
        setTotalItems(0);
        setFromItem(0);
        setToItem(0);
      }
    } catch {
      setAssets([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, nupQuery, selectedCategory, selectedJenis, selectedLokasi, perPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchBmnAssets(1);
  }, [searchQuery, nupQuery, selectedCategory, selectedJenis, selectedLokasi]);

  useEffect(() => {
    fetchBmnAssets(currentPage);
  }, [currentPage]);

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
    if (tabKey === "bmn") {
      setActiveSegment("dashboard");
    } else if (tabKey === "data-aset") {
      setActiveSegment("katalog");
    } else if (tabKey === "home" || tabKey === "portal" || tabKey === "dashboard") {
      if (navigation) {
        navigation.navigate("Dashboard");
      } else if (onBack) {
        onBack();
      }
    } else if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    }
  };

  if (activeSegment === "dashboard") {
    return (
      <BmnDashboardScreen
        onBack={handleGoBack}
        onNavigateToModule={(mod) => handleSelectNavTab(mod)}
        onNavigateToCatalog={() => setActiveSegment("katalog")}
      />
    );
  }

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
          <Ionicons name="cube-outline" size={20} color="#059669" style={{ marginRight: 6 }} />
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Data Aset BMN</Text>
        </View>

        <TouchableOpacity
          style={styles.dashSegmentBtn}
          onPress={() => setActiveSegment("dashboard")}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.dashSegmentText}>Dashboard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBmnAssets(currentPage, true)}
            colors={["#059669"]}
          />
        }
      >
        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.dataAsetTitle, { color: colors.textDark }]}>Data Aset</Text>
          <Text style={styles.dataAsetSub}>Katalog seluruh Barang Milik Negara.</Text>
        </View>

        <View style={styles.actionRowTop}>
          <TouchableOpacity style={styles.exportBtn}>
            <Ionicons name="download-outline" size={14} color="#334155" style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>Export (filtered)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imporBtn}>
            <Ionicons name="cloud-upload-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.imporBtnText}>Impor Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tambahAsetBtn}>
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.tambahAsetBtnText}>Tambah Aset</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBarContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, marginBottom: 8 }]}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Cari nama, kode, merk..."
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

        <View style={[styles.searchBarContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, marginBottom: 12 }]}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Cari NUP (baru/lama)..."
            placeholderTextColor="#94a3b8"
            value={nupQuery}
            onChangeText={setNupQuery}
          />
          {nupQuery.length > 0 && (
            <TouchableOpacity onPress={() => setNupQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.conditionPillRow}>
          {["Semua", "Baik", "Rusak Ringan", "Rusak Berat"].map((cat) => {
            const isActive = selectedCategory === cat || (cat === "Semua" && selectedCategory === "Semua Aset");
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat === "Semua" ? "Semua Aset" : cat)}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                ]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.dropdownFilterRow}>
          <TouchableOpacity style={styles.dropdownPill} onPress={() => setJenisModalVisible(true)}>
            <Text style={styles.dropdownPillText}>{selectedJenis}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownPill} onPress={() => setLokasiModalVisible(true)}>
            <Text style={styles.dropdownPillText}>{selectedLokasi}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            setSearchQuery("");
            setNupQuery("");
            setSelectedCategory("Semua Aset");
            setSelectedJenis("Semua Jenis BMN");
            setSelectedLokasi("Semua Lokasi");
          }}>
            <Text style={styles.resetFilterText}>Reset Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator when switching pages or filtering */}
        {isLoading && !refreshing && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Memuat data aset BMN...</Text>
          </View>
        )}

        <View style={styles.assetListVertical}>
          {assets.length === 0 && !isLoading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Tidak ada data aset BMN</Text>
            </View>
          ) : (
            assets.map((asset, idx) => {
              const isBaik = asset.kondisi === "Baik";
              const isRusakRingan = asset.kondisi === "Rusak Ringan";
              const kondisiBg = isBaik ? "#ecfdf5" : isRusakRingan ? "#fffbe8" : "#fef2f2";
              const kondisiColor = isBaik ? "#059669" : isRusakRingan ? "#d97706" : "#dc2626";

              return (
                <TouchableOpacity
                  key={asset.id || idx}
                  style={[
                    styles.assetMobileCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (navigation && typeof navigation.navigate === "function") {
                      navigation.navigate("BmnDetail", { id: asset.id });
                    }
                  }}
                >
                  {/* Top Row: Kode/NUP & Kondisi Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kodeGreen}>{asset.code}</Text>
                      <Text style={styles.nupSub}>
                        NUP: {asset.nup} {asset.nupLama && asset.nupLama !== "-" ? `• NUP Lama: ${asset.nupLama}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.kondisiBadge, { backgroundColor: kondisiBg }]}>
                      <Text style={[styles.kondisiBadgeText, { color: kondisiColor }]}>
                        {asset.kondisi}
                      </Text>
                    </View>
                  </View>

                  {/* Category Tag & License Plate */}
                  {(() => {
                    const categoryLower = (asset.category || "").toLowerCase();
                    const isAngkutanBermotor =
                      categoryLower.includes("angkutan") ||
                      categoryLower.includes("kendaraan");
                    const showPlatBadge =
                      isAngkutanBermotor &&
                      !!asset.noPolisi &&
                      asset.noPolisi !== "-" &&
                      asset.noPolisi !== "null";

                    return (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <View style={styles.jenisTag}>
                          <Text style={styles.jenisTagText}>{asset.category.toUpperCase()}</Text>
                        </View>
                        {showPlatBadge && (
                          <View style={{ backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#a7f3d0" }}>
                            <Text style={{ color: "#059669", fontSize: 10, fontWeight: "700" }}>
                              🚘 No. Plat: {asset.noPolisi}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Asset Name & Real Merk/Tipe • Year */}
                  <View style={{ marginVertical: 6 }}>
                    <Text style={[styles.namaBarangText, { color: colors.textDark }]}>
                      {asset.name}
                    </Text>
                    <Text style={styles.merkSub}>
                      {asset.merkType} • {asset.year}
                    </Text>
                  </View>

                  {/* Location & Pengguna Info Box */}
                  <View style={[styles.cardFooterBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                    <View style={styles.footerInfoCol}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="location-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.footerLabel}>LOKASI</Text>
                      </View>
                      <Text style={[styles.footerValue, { color: colors.textDark }]} numberOfLines={1}>
                        {asset.lokasi}
                      </Text>
                    </View>

                    <View style={styles.footerInfoCol}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="person-outline" size={13} color="#2563eb" style={{ marginRight: 4 }} />
                        <Text style={styles.footerLabel}>PENGGUNA</Text>
                      </View>
                      <Text style={[styles.footerValue, { color: colors.textDark }]} numberOfLines={1}>
                        {asset.pengguna}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Pagination Control Bar */}
        {totalItems > 0 && (
          <View style={[styles.paginationCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <Text style={styles.paginationInfoText}>
              Menampilkan <Text style={{ fontWeight: "700", color: colors.textDark }}>{fromItem}-{toItem}</Text> dari{" "}
              <Text style={{ fontWeight: "700", color: colors.textDark }}>{totalItems}</Text> data aset
            </Text>

            <View style={styles.paginationBtnRow}>
              <TouchableOpacity
                style={[
                  styles.pageNavBtn,
                  (currentPage <= 1 || isLoading) && styles.pageNavBtnDisabled,
                ]}
                disabled={currentPage <= 1 || isLoading}
                onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={currentPage <= 1 ? "#94a3b8" : colors.textDark}
                />
                <Text style={[styles.pageNavText, { color: currentPage <= 1 ? "#94a3b8" : colors.textDark }]}>
                  Sebelumnya
                </Text>
              </TouchableOpacity>

              <View style={styles.pageNumberGroup}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))
                  .map((pageNum) => {
                    const isActive = pageNum === currentPage;
                    return (
                      <TouchableOpacity
                        key={pageNum}
                        style={[
                          styles.pageNumBtn,
                          isActive && styles.pageNumBtnActive,
                        ]}
                        onPress={() => setCurrentPage(pageNum)}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pageNumText, isActive && styles.pageNumTextActive]}>
                          {pageNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              <TouchableOpacity
                style={[
                  styles.pageNavBtn,
                  (currentPage >= totalPages || isLoading) && styles.pageNavBtnDisabled,
                ]}
                disabled={currentPage >= totalPages || isLoading}
                onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pageNavText,
                    { color: currentPage >= totalPages ? "#94a3b8" : colors.textDark },
                  ]}
                >
                  Selanjutnya
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={currentPage >= totalPages ? "#94a3b8" : colors.textDark}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <FabMenu onNavigateToModule={handleSelectNavTab} activeModule="bmn" activeSubmenu="data-aset" />

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

      {/* Modal Filter Jenis BMN */}
      <Modal visible={jenisModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]} highlighted>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Pilih Jenis BMN</Text>
              <TouchableOpacity onPress={() => setJenisModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {jenisOptions.map((opt) => {
                const isActive = selectedJenis === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: isActive ? "#ecfdf5" : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onPress={() => {
                      setSelectedJenis(opt);
                      setJenisModalVisible(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isActive ? "700" : "500", color: isActive ? "#059669" : colors.textDark }}>
                      {opt}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={18} color="#059669" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* Modal Filter Lokasi */}
      <Modal visible={lokasiModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]} highlighted>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Pilih Lokasi Ruang</Text>
              <TouchableOpacity onPress={() => setLokasiModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {lokasiOptions.map((opt) => {
                const isActive = selectedLokasi === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: isActive ? "#ecfdf5" : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onPress={() => {
                      setSelectedLokasi(opt);
                      setLokasiModalVisible(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isActive ? "700" : "500", color: isActive ? "#059669" : colors.textDark }}>
                      {opt}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={18} color="#059669" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  dataAsetTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  dataAsetSub: {
    color: "#64748b",
    fontSize: 12.5,
    marginTop: 2,
  },
  actionRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exportBtnText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  imporBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imporBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  tambahAsetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tambahAsetBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  conditionPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  filterPillActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  filterPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  dropdownFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  dropdownPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  dropdownPillText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "600",
  },
  resetFilterText: {
    color: "#ef4444",
    fontSize: 11.5,
    fontWeight: "700",
    marginLeft: 4,
  },
  assetListVertical: {
    gap: 12,
    marginBottom: 24,
  },
  assetMobileCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  kondisiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  kondisiBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  jenisTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  jenisTagText: {
    color: "#475569",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cardFooterBox: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    gap: 8,
  },
  footerInfoCol: {
    flex: 1,
  },
  footerLabel: {
    color: "#64748b",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  footerValue: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  tableContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  thCell: {
    color: "#64748b",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  trRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  tdCell: {
    justifyContent: "center",
  },
  kodeGreen: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "800",
  },
  nupSub: {
    color: "#64748b",
    fontSize: 10,
  },
  nupLamaSub: {
    color: "#94a3b8",
    fontSize: 9.5,
  },
  jenisText: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "700",
  },
  namaBarangText: {
    fontSize: 12,
    fontWeight: "700",
  },
  merkSub: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2,
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
  dashSegmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dashSegmentText: {
    color: "#059669",
    fontSize: 11.5,
    fontWeight: "700",
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
  paginationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 30,
    alignItems: "center",
  },
  paginationInfoText: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 12,
  },
  paginationBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  pageNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pageNavBtnDisabled: {
    opacity: 0.5,
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  pageNavText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  pageNumberGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pageNumBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumBtnActive: {
    backgroundColor: "#059669",
  },
  pageNumText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  pageNumTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
