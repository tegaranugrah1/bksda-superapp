import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/lib/api/client";

interface FormulirCutiModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const JENIS_CUTI_OPTIONS = [
  "Cuti Tahunan",
  "Cuti Besar",
  "Cuti Sakit",
  "Cuti Melahirkan",
  "Cuti Karena Alasan Penting",
  "Cuti di Luar Tanggungan Negara",
];

export const FormulirCutiModal: React.FC<FormulirCutiModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [jenisCuti, setJenisCuti] = useState("Cuti Tahunan");
  const [alasanCuti, setAlasanCuti] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tanggalSelesai, setTanggalSelesai] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!alasanCuti.trim()) {
      Alert.alert("Form Tidak Lengkap", "Mohon isi alasan permohonan cuti Anda.");
      return;
    }
    if (!alamat.trim()) {
      Alert.alert("Form Tidak Lengkap", "Mohon isi alamat menjalankan cuti.");
      return;
    }
    if (!tanggalMulai || !tanggalSelesai) {
      Alert.alert("Form Tidak Lengkap", "Mohon tentukan tanggal mulai & selesai cuti.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/me/leave-requests", {
        jenis_cuti: jenisCuti,
        alasan_cuti: alasanCuti.trim(),
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alamat_menjalankan_cuti: alamat.trim(),
        telepon: telepon.trim() || undefined,
      });

      Alert.alert(
        "Berhasil Disimpan",
        "Pengajuan cuti baru Anda telah berhasil dikirim ke Admin Kepegawaian BKSDA."
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal mengirim permohonan cuti.";
      Alert.alert("Gagal Pengajuan", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Formulir Pengajuan Cuti Baru</Text>
              <Text style={styles.headerSubtitle}>Balai KSDA Kalimantan Timur</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Info Banner Sisa Cuti */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#059669" />
              <Text style={styles.infoBannerText}>
                Hak Cuti Tahunan: <Text style={{ fontWeight: "800" }}>12 Hari Kerja</Text> • Sisa Cuti (N-0): <Text style={{ fontWeight: "800", color: "#059669" }}>12 Hari</Text>
              </Text>
            </View>

            {/* 1. Jenis Cuti */}
            <Text style={styles.label}>1. Jenis Cuti Yang Diambil</Text>
            <View style={styles.chipRow}>
              {JENIS_CUTI_OPTIONS.map((option) => {
                const selected = jenisCuti === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setJenisCuti(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {selected ? "✓ " : ""}{option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Alasan Cuti */}
            <Text style={styles.label}>2. Alasan Cuti</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              placeholder="Jelaskan alasan permohonan cuti..."
              placeholderTextColor="#94a3b8"
              value={alasanCuti}
              onChangeText={setAlasanCuti}
            />

            {/* 3. Tanggal Mulai & Tanggal Selesai */}
            <View style={styles.dateRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.label}>Tanggal Mulai</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={tanggalMulai}
                  onChangeText={setTanggalMulai}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.label}>Tanggal Selesai</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={tanggalSelesai}
                  onChangeText={setTanggalSelesai}
                />
              </View>
            </View>

            {/* 4. Alamat Menjalankan Cuti */}
            <Text style={styles.label}>4. Alamat Menjalankan Cuti</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={2}
              placeholder="Alamat lengkap selama menjalankan cuti..."
              placeholderTextColor="#94a3b8"
              value={alamat}
              onChangeText={setAlamat}
            />

            {/* 5. Telepon Yang Dapat Dihubungi */}
            <Text style={styles.label}>5. Nomor Telepon / HP</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={telepon}
              onChangeText={setTelepon}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Submit Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Kirim Pengajuan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  contentContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#065f46",
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipSelected: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  chipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#059669",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 70,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#059669",
    flex: 1,
    marginLeft: 12,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
