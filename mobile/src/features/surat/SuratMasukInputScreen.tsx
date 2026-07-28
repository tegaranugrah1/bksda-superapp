import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { COLORS, RADIUS } from "../../theme";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { SuratDisposisiPrintPreviewModal } from "./SuratDisposisiPrintPreviewModal";

interface SuratMasukInputScreenProps {
  onBack?: () => void;
  onSaveSuccess?: () => void;
}

export const SuratMasukInputScreen: React.FC<SuratMasukInputScreenProps> = ({
  onBack,
  onSaveSuccess,
}) => {
  const [noAgenda] = useState("1016");
  const [noSurat, setNoSurat] = useState("SURAT/BKSDA/2026/1016");
  const [tanggalSurat, setTanggalSurat] = useState("26/07/2026");
  const [terimaAgenda, setTerimaAgenda] = useState("28/07/2026");
  const [asalSurat, setAsalSurat] = useState("Apekli");
  const [lampiran, setLampiran] = useState("3 Set");
  const [perihal, setPerihal] = useState(
    "Permohonan Pengadaan Obat-Obatan Translokasi Badak Sumatera"
  );
  const [sifat, setSifat] = useState("SANGAT PENTING");
  const [catatan, setCatatan] = useState(
    "Harap segera ditindaklanjuti dan disiapkan bahan laporannya."
  );

  // 9 Default Recipient Items + Ability to Add 10th Custom Item
  const [diteruskanList, setDiteruskanList] = useState<string[]>([
    "1. Ka Sub Bag TU",
    "2. Urusan Umum dan Perlengkapan",
    "3. Urusan Kepegawaian",
    "4. Urusan Program",
    "5. Urusan Keuangan",
    "6. Urusan Data Evlap dan Humas",
    "7. Urusan Teknis",
    "8. Urusan Perlindungan",
    "9. PPK FOLU NC 2030",
  ]);

  const [customRecipientInput, setCustomRecipientInput] = useState("");
  const [showAddCustomInput, setShowAddCustomInput] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const sifatOptions = ["Biasa", "Penting", "SANGAT PENTING", "Rahasia", "Segera", "Kilat"];

  const handleAdd10thItem = () => {
    if (!customRecipientInput.trim()) {
      Alert.alert("Perhatian", "Silakan ketik nama unit/posisi penerus ke-10.");
      return;
    }

    const newItem = `10. ${customRecipientInput.trim()}`;
    setDiteruskanList([...diteruskanList, newItem]);
    setCustomRecipientInput("");
    setShowAddCustomInput(false);
    Alert.alert("Item Ditambahkan", `Baris ke-10 ("${newItem}") berhasil ditambahkan.`);
  };

  const handleRemoveRecipientItem = (index: number) => {
    if (index < 9) {
      Alert.alert("Info", "Baris 1-9 adalah daftar default resmi BKSDA.");
      return;
    }
    const updated = diteruskanList.filter((_, idx) => idx !== index);
    setDiteruskanList(updated);
  };

  const handleSaveSurat = () => {
    if (!noSurat.trim() || !perihal.trim() || !asalSurat.trim()) {
      Alert.alert("Perhatian", "Silakan lengkapi No. Surat, Asal Surat, dan Perihal.");
      return;
    }

    Alert.alert("Berhasil Disimpan", `Data Surat Masuk No. Agenda #${noAgenda} berhasil tersimpan.`, [
      {
        text: "OK",
        onPress: () => {
          if (onSaveSuccess) onSaveSuccess();
        },
      },
    ]);
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
          <Text style={styles.headerIcon}>📝</Text>
          <Text style={styles.headerTitle}>Input Surat Masuk</Text>
        </View>
        <View style={styles.agendaBadge}>
          <Text style={styles.agendaBadgeText}>Agenda #{noAgenda}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Data Surat Masuk */}
        <GlassCard style={styles.sectionCard} highlighted>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderIcon}>📄</Text>
            <Text style={styles.cardHeaderTitle}>Informasi Surat Masuk</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>No. Surat</Text>
            <TextInput
              style={styles.input}
              value={noSurat}
              onChangeText={setNoSurat}
              placeholder="SURAT/BKSDA/2026/1016"
              placeholderTextColor="rgba(167, 243, 208, 0.4)"
            />
          </View>

          <View style={styles.grid2Col}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tanggal Surat</Text>
              <TextInput
                style={styles.input}
                value={tanggalSurat}
                onChangeText={setTanggalSurat}
                placeholder="26/07/2026"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Terima Agenda</Text>
              <TextInput
                style={styles.input}
                value={terimaAgenda}
                onChangeText={setTerimaAgenda}
                placeholder="28/07/2026"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
              />
            </View>
          </View>

          <View style={styles.grid2Col}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Asal Surat</Text>
              <TextInput
                style={styles.input}
                value={asalSurat}
                onChangeText={setAsalSurat}
                placeholder="Apekli"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Lampiran</Text>
              <TextInput
                style={styles.input}
                value={lampiran}
                onChangeText={setLampiran}
                placeholder="3 Set"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Isi Ringkas / Perihal</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={perihal}
              onChangeText={setPerihal}
              multiline
              numberOfLines={3}
              placeholder="Isi perihal surat..."
              placeholderTextColor="rgba(167, 243, 208, 0.4)"
            />
          </View>
        </GlassCard>

        {/* Section 2: Diteruskan Kepada Yth (9 Items Default + Add 10th Custom Item) */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderIcon}>📋</Text>
            <Text style={styles.cardHeaderTitle}>Diteruskan Kepada Yth (Daftar Baris)</Text>
          </View>

          <View style={styles.recipientList}>
            {diteruskanList.map((item, index) => (
              <View key={index} style={styles.recipientItemRow}>
                <Text style={styles.recipientItemText}>{item}</Text>
                {index >= 9 && (
                  <TouchableOpacity onPress={() => handleRemoveRecipientItem(index)}>
                    <Text style={styles.deleteRecipientText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Add 10th Custom Item Input */}
          {showAddCustomInput ? (
            <View style={styles.add10thBox}>
              <TextInput
                style={styles.input}
                placeholder="Ketik Unit / Posisi Penerus Ke-10..."
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                value={customRecipientInput}
                onChangeText={setCustomRecipientInput}
              />
              <View style={styles.add10thBtnRow}>
                <EmeraldButton
                  title="Simpan Baris Ke-10"
                  onPress={handleAdd10thItem}
                  style={styles.add10thBtn}
                />
                <TouchableOpacity
                  onPress={() => setShowAddCustomInput(false)}
                  style={styles.cancelAddBtn}
                >
                  <Text style={styles.cancelAddText}>Batal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            diteruskanList.length < 10 && (
              <TouchableOpacity
                style={styles.addDashedBtn}
                onPress={() => setShowAddCustomInput(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addDashedText}>+ Tambah Baris ke-10 (Kustom)</Text>
              </TouchableOpacity>
            )
          )}
        </GlassCard>

        {/* Section 3: Catatan & Sifat Surat */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderIcon}>🏷️</Text>
            <Text style={styles.cardHeaderTitle}>Catatan & Sifat Disposisi</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sifat Surat</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sifatScroll}>
              {sifatOptions.map((opt) => {
                const isActive = sifat === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setSifat(opt)}
                    style={[styles.sifatChip, isActive && styles.sifatChipActive]}
                  >
                    <Text style={[styles.sifatChipText, isActive && styles.sifatChipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catatan Disposisi</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={3}
              placeholder="Tambahkan catatan instruksi disposisi..."
              placeholderTextColor="rgba(167, 243, 208, 0.4)"
            />
          </View>
        </GlassCard>

        {/* Primary Action Buttons */}
        <View style={styles.actionBtnContainer}>
          <EmeraldButton
            title="🖨️ CETAK LEMBAR DISPOSISI"
            onPress={() => setPreviewModalVisible(true)}
            style={styles.printPrimaryBtn}
          />
          <EmeraldButton
            title="💾 Simpan Data Surat"
            variant="secondary"
            onPress={handleSaveSurat}
            style={styles.saveSecondaryBtn}
          />
        </View>
      </ScrollView>

      {/* Print Preview Modal */}
      <SuratDisposisiPrintPreviewModal
        visible={previewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
        suratData={{
          noAgenda,
          noSurat,
          tanggalSurat,
          terimaAgenda,
          asalSurat,
          lampiran,
          perihal,
          sifat,
          catatan,
          diteruskanList,
        }}
      />
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
  agendaBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  agendaBadgeText: {
    color: COLORS.emeraldElectric,
    fontSize: 11.5,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    paddingBottom: 10,
  },
  cardHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  cardHeaderTitle: {
    color: COLORS.textMint,
    fontSize: 15,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 14,
  },
  grid2Col: {
    flexDirection: "row",
    gap: 12,
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
    paddingHorizontal: 14,
    height: 46,
    color: COLORS.textWhite,
    fontSize: 13.5,
  },
  textarea: {
    height: 72,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  recipientList: {
    gap: 8,
    marginBottom: 12,
  },
  recipientItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(6, 26, 18, 0.6)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  recipientItemText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteRecipientText: {
    color: COLORS.statusUrgent,
    fontSize: 15,
    paddingHorizontal: 6,
  },
  addDashedBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.emeraldElectric,
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    borderRadius: RADIUS.button,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addDashedText: {
    color: COLORS.emeraldElectric,
    fontSize: 13,
    fontWeight: "700",
  },
  add10thBox: {
    marginTop: 8,
    gap: 10,
  },
  add10thBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  add10thBtn: {
    flex: 1,
    height: 44,
  },
  cancelAddBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelAddText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  sifatScroll: {
    flexDirection: "row",
  },
  sifatChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(6, 26, 18, 0.6)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginRight: 8,
  },
  sifatChipActive: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: COLORS.statusPending,
  },
  sifatChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sifatChipTextActive: {
    color: COLORS.statusPending,
    fontWeight: "800",
  },
  actionBtnContainer: {
    marginTop: 10,
    gap: 10,
  },
  printPrimaryBtn: {
    height: 52,
  },
  saveSecondaryBtn: {
    height: 48,
  },
});
