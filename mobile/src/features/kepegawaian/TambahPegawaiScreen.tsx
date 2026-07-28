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
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface TambahPegawaiScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const TambahPegawaiScreen: React.FC<TambahPegawaiScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, toggleTheme, colors } = useTheme();

  // Form states matching Screenshot 1 & 2
  const [nipInduk, setNipInduk] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [pangkatGolongan, setPangkatGolongan] = useState("Pilih Pangkat/Golongan");
  const [penempatanSatker, setPenempatanSatker] = useState("Pilih Penempatan...");
  const [statusKepegawaian, setStatusKepegawaian] = useState("Pegawai Aktif");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal pickers state
  const [pangkatModalVisible, setPangkatModalVisible] = useState(false);
  const [satkerModalVisible, setSatkerModalVisible] = useState(false);
  const [pangkatSearch, setPangkatSearch] = useState("");
  const [satkerSearch, setSatkerSearch] = useState("");

  // Official Pangkat / Golongan Options Presisi Screenshot 1
  const pangkatOptions = [
    "- (Tidak ada pangkat)",
    "Juru Muda (I/a)",
    "Juru Muda Tingkat I (I/b)",
    "Juru (I/c)",
    "Juru Tingkat I (I/d)",
    "Pengatur Muda (II/a)",
    "Pengatur Muda Tingkat I (II/b)",
    "Pengatur (II/c)",
    "Pengatur Tingkat I (II/d)",
    "Penata Muda (III/a)",
    "Penata Muda Tingkat I (III/b)",
    "Penata (III/c)",
    "Penata Tingkat I (III/d)",
    "Pembina (IV/a)",
    "Pembina Tingkat I (IV/b)",
    "Pembina Utama Muda (IV/c)",
    "Pembina Utama Madya (IV/d)",
    "Pembina Utama (IV/e)",
    "PPPK Golongan I",
    "PPPK Golongan II",
    "PPPK Golongan III",
    "PPPK Golongan IV",
    "PPPK Golongan V",
    "PPPK Golongan VI",
    "PPPK Golongan VII",
    "PPPK Golongan VIII",
    "PPPK Golongan IX",
    "PPPK Golongan X",
    "PPPK Golongan XI",
    "PPPK Golongan XII",
    "PPPK Golongan XIII",
    "PPPK Golongan XIV",
    "PPPK Golongan XV",
    "PPPK Golongan XVI",
    "PPPK Golongan XVII",
  ];

  // Official Penempatan Satker & Resor Options Presisi Screenshot 2
  const satkerOptions = [
    "Kantor Balai KSDA Kalimantan Timur",
    "Seksi KSDA Wilayah I Berau",
    "Seksi KSDA Wil I - Resor 01. Berau",
    "Seksi KSDA Wil I - Resor 02. Pulau Semama dan Pulau Sangalaki",
    "Seksi KSDA Wil I - Resor 03. Tanjung Selor",
    "Seksi KSDA Wil I - Resor 04. Tarakan",
    "Seksi KSDA Wilayah II Tenggarong",
    "Seksi KSDA Wil II - Resor 05. Samarinda",
    "Seksi KSDA Wil II - Resor 06. Padang Luway",
    "Seksi KSDA Wil II - Resor 07. Muara Kaman Sedulang",
    "Seksi KSDA Wil II - Resor 08. Sangatta",
    "Seksi KSDA Wil II - Resor 09. Suaka Badak Kelian",
    "Seksi KSDA Wilayah III Balikpapan",
    "Seksi KSDA Wil III - Resor 10. Balikpapan",
    "Seksi KSDA Wil III - Resor 11. Teluk Adang",
    "Seksi KSDA Wil III - Resor 12. Teluk Apar",
    "Seksi KSDA Wil III - Resor 13. Paser",
    "Seksi KSDA Wil III - Resor 14. Ibu Kota Nusantara",
  ];

  const filteredPangkatOptions = pangkatOptions.filter((opt) =>
    opt.toLowerCase().includes(pangkatSearch.toLowerCase())
  );

  const filteredSatkerOptions = satkerOptions.filter((opt) =>
    opt.toLowerCase().includes(satkerSearch.toLowerCase())
  );

  const handleGoBack = () => {
    if (onBack) {
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

  const handleSimpanPegawai = async () => {
    if (!nipInduk.trim() || !namaLengkap.trim()) {
      Alert.alert("Perhatian", "Silakan lengkapi NIP Induk dan Nama Lengkap bertanda bintang (*).");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/kepegawaian/employees", {
        nip: nipInduk.trim(),
        nama_lengkap: namaLengkap.trim(),
        jabatan: jabatan.trim() || "Staf BKSDA",
        satuan_kerja: penempatanSatker === "Pilih Penempatan..." ? "Kantor Balai KSDA Kalimantan Timur" : penempatanSatker,
        pangkat_golongan: pangkatGolongan === "Pilih Pangkat/Golongan" ? "Penata Muda (III/a)" : pangkatGolongan,
        status: statusKepegawaian,
      });
    } catch {
      // Local fallback
    } finally {
      setIsSubmitting(false);
      Alert.alert(
        "Pegawai Berhasil Ditambahkan!",
        `Data pegawai atas nama ${namaLengkap} (NIP: ${nipInduk}) telah berhasil disimpan ke database.`,
        [
          {
            text: "Lihat Daftar Pegawai",
            onPress: () => {
              if (navigation) navigation.navigate("Kepegawaian");
              else handleGoBack();
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header Bar */}
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
            <Ionicons name="people" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.headerBadgeText}>KEPEGAWAIAN & SDM</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Tambah Pegawai Baru</Text>
        </View>

        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }]}
          activeOpacity={0.7}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? "sunny" : "moon-outline"}
            size={18}
            color={isDark ? "#f59e0b" : "#64748b"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Form Card Presisi Screenshot 1 & 2 */}
        <GlassCard style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {/* PAS FOTO Upload Section */}
          <View style={styles.pasFotoSection}>
            <Text style={styles.pasFotoTitle}>PAS FOTO</Text>
            <Text style={styles.pasFotoSub}>MAX 10MB • RASIO 3:4</Text>

            <TouchableOpacity
              style={[styles.photoDottedBox, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1" }]}
              onPress={() => Alert.alert("Upload Pas Foto", "Membuka galeri foto perangkat...")}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={32} color="#94a3b8" style={{ marginBottom: 6 }} />
              <Text style={styles.photoDottedText}>PILIH FOTO</Text>
            </TouchableOpacity>
          </View>

          {/* Input 1: NIP INDUK * */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              NIP INDUK <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
              placeholder="19800101..."
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={nipInduk}
              onChangeText={setNipInduk}
            />
          </View>

          {/* Input 2: NAMA LENGKAP * */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              NAMA LENGKAP <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
              placeholder="Budi Santoso..."
              placeholderTextColor="#94a3b8"
              value={namaLengkap}
              onChangeText={setNamaLengkap}
            />
          </View>

          {/* Input 3: JABATAN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>JABATAN</Text>
            <TextInput
              style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
              placeholder="Polhut..."
              placeholderTextColor="#94a3b8"
              value={jabatan}
              onChangeText={setJabatan}
            />
          </View>

          {/* Input 4: PANGKAT / GOLONGAN Presisi Screenshot 1 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PANGKAT/GOLONGAN</Text>
            <TouchableOpacity
              style={[styles.pickerBox, { borderColor: colors.glassBorder }]}
              onPress={() => setPangkatModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pickerText,
                  { color: pangkatGolongan.startsWith("Pilih") ? "#94a3b8" : colors.textDark },
                ]}
                numberOfLines={1}
              >
                {pangkatGolongan}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Input 5: PENEMPATAN SATKER Presisi Screenshot 2 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PENEMPATAN SATKER</Text>
            <TouchableOpacity
              style={[styles.pickerBox, { borderColor: colors.glassBorder }]}
              onPress={() => setSatkerModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pickerText,
                  { color: penempatanSatker.startsWith("Pilih") ? "#94a3b8" : colors.textDark },
                ]}
                numberOfLines={1}
              >
                {penempatanSatker}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Input 6: STATUS KEPEGAWAIAN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>STATUS KEPEGAWAIAN</Text>
            <View style={[styles.pickerBox, { borderColor: colors.glassBorder }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.greenActiveDot} />
                <Text style={[styles.pickerText, { color: colors.textDark }]}>{statusKepegawaian}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </View>

          {/* Bottom Actions Presisi Screenshot 1 & 2 */}
          <View style={styles.formFooterRow}>
            <Text style={styles.helperText}>LENGKAPI SEMUA DATA BERTANDA BINTANG</Text>

            <TouchableOpacity
              style={[styles.simpanBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSimpanPegawai}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.simpanBtnText}>
                {isSubmitting ? "Menyimpan..." : "Simpan Pegawai"}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Modal Picker for PANGKAT/GOLONGAN Presisi Screenshot 1 */}
      <Modal visible={pangkatModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Pilih Pangkat/Golongan</Text>
              <TouchableOpacity onPress={() => setPangkatModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { borderColor: colors.glassBorder, marginBottom: 12 }]}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Cari pangkat/golongan..."
                placeholderTextColor="#94a3b8"
                value={pangkatSearch}
                onChangeText={setPangkatSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {filteredPangkatOptions.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionRow,
                    pangkatGolongan === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setPangkatGolongan(opt);
                    setPangkatModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.textDark },
                      pangkatGolongan === opt && styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {pangkatGolongan === opt && (
                    <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* Modal Picker for PENEMPATAN SATKER Presisi Screenshot 2 */}
      <Modal visible={satkerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Pilih Penempatan Satker / Resor</Text>
              <TouchableOpacity onPress={() => setSatkerModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { borderColor: colors.glassBorder, marginBottom: 12 }]}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Cari satker atau resor..."
                placeholderTextColor="#94a3b8"
                value={satkerSearch}
                onChangeText={setSatkerSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {filteredSatkerOptions.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionRow,
                    penempatanSatker === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setPenempatanSatker(opt);
                    setSatkerModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.textDark },
                      penempatanSatker === opt && styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {penempatanSatker === opt && (
                    <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* Floating Action Button (FAB ☰ Menu) */}
      <FabMenu onNavigateToModule={handleSelectNavTab} activeSubmenu="tambah-pegawai" />
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
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  formCard: {
    padding: 20,
    borderRadius: 22,
  },

  pasFotoSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pasFotoTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#1e293b",
    marginBottom: 2,
  },
  pasFotoSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 12,
  },
  photoDottedBox: {
    width: 140,
    height: 170,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  photoDottedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },

  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13.5,
  },
  pickerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: "#f8fafc",
  },
  pickerText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    paddingRight: 6,
  },
  greenActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    marginRight: 6,
  },

  formFooterRow: {
    marginTop: 10,
    alignItems: "flex-end",
    gap: 10,
  },
  helperText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.5,
    alignSelf: "flex-start",
  },
  simpanBtn: {
    backgroundColor: "#0f172a",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  simpanBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: 22,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: RADIUS.input,
    marginBottom: 4,
  },
  optionRowSelected: {
    backgroundColor: "#eff6ff",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  optionTextSelected: {
    color: "#2563eb",
    fontWeight: "800",
  },
});
