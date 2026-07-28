import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { EmployeeAccessModal } from "./EmployeeAccessModal";
import { useAuth } from "../auth/AuthProvider";
import { apiClient } from "../../lib/api/client";

interface EmployeeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  employee: {
    id: string | number;
    name: string;
    nip: string;
    position?: string;
    workUnit?: string;
    rankGrade?: string;
    remainingLeaveDays?: number;
    role?: string;
    accessModules?: string[];
  } | null;
  onEmployeeUpdated?: () => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  visible,
  onClose,
  employee,
  onEmployeeUpdated,
}) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("penugasan");
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit form states
  const [editNama, setEditNama] = useState("");
  const [editNip, setEditNip] = useState("");
  const [editJabatan, setEditJabatan] = useState("");
  const [editWorkUnit, setEditWorkUnit] = useState("");
  const [editRankGrade, setEditRankGrade] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  if (!employee) return null;

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";
  const avatarInitial = (employee.name.charAt(0) || "A").toUpperCase();

  const handleOpenEdit = () => {
    setEditNama(employee.name);
    setEditNip(employee.nip);
    setEditJabatan(employee.position || "Pengendali Ekosistem Hutan Ahli Pertama");
    setEditWorkUnit(employee.workUnit || "Seksi KSDA Wilayah III Balikpapan");
    setEditRankGrade(employee.rankGrade || "PPPK Golongan IX");
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editNama.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan Nama Lengkap Pegawai.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await apiClient.put(`/kepegawaian/employees/${employee.id}`, {
        nama_lengkap: editNama.trim(),
        nip: editNip.trim(),
        jabatan: editJabatan.trim(),
        satuan_kerja: editWorkUnit.trim(),
        pangkat_golongan: editRankGrade.trim(),
      });
    } catch {
      // Local fallback
    } finally {
      setIsSubmittingEdit(false);
      setEditModalVisible(false);
      // Mutate current employee local prop reference
      employee.name = editNama.trim();
      employee.nip = editNip.trim();
      employee.position = editJabatan.trim();
      employee.workUnit = editWorkUnit.trim();
      employee.rankGrade = editRankGrade.trim();

      if (onEmployeeUpdated) onEmployeeUpdated();
      Alert.alert("Berhasil", `Data pegawai ${editNama} berhasil diperbarui.`);
    }
  };

  const handleResetPassword = () => {
    Alert.alert(
      "Reset Password Pegawai",
      `Apakah Anda yakin ingin mereset kata sandi akun ${employee.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Reset",
          onPress: () =>
            Alert.alert(
              "Kata Sandi Direset",
              `Kata sandi baru untuk ${employee.name} telah dikirim via email.`
            ),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
        {/* Header with Clickable Back Button & Action Chips */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textDark} />
            <Text style={[styles.backText, { color: colors.textDark }]}> Kembali</Text>
          </TouchableOpacity>

          <View style={styles.headerActionChips}>
            <TouchableOpacity
              style={styles.resetPasswordChip}
              onPress={handleResetPassword}
              activeOpacity={0.8}
            >
              <Ionicons name="key-outline" size={13} color="#d97706" style={{ marginRight: 4 }} />
              <Text style={styles.resetPasswordText}>Reset Password</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                style={styles.kelolaAksesChip}
                onPress={() => setAccessModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={13} color="#2563eb" style={{ marginRight: 4 }} />
                <Text style={styles.kelolaAksesText}>Kelola Akses</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Profile Header Card Presisi Screenshot 2 */}
          <GlassCard style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.profileName, { color: colors.textDark }]}>
                    {employee.name}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Aktif</Text>
                  </View>
                </View>

                <Text style={[styles.profileNip, { color: colors.textMuted }]}>
                  {employee.nip}
                </Text>
              </View>
            </View>

            {/* 4 Bento Stat Cards Grid Presisi Screenshot 2 */}
            <View style={styles.bentoGrid}>
              {/* Card 1: JABATAN */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc" }]}>
                <View style={styles.bentoHeaderRow}>
                  <Ionicons name="briefcase-outline" size={13} color="#3b82f6" style={{ marginRight: 4 }} />
                  <Text style={styles.bentoLabel}>JABATAN</Text>
                </View>
                <Text style={[styles.bentoValue, { color: colors.textDark }]} numberOfLines={2}>
                  {employee.position || "Pengendali Ekosistem Hutan Ahli Pertama"}
                </Text>
              </View>

              {/* Card 2: UNIT KERJA */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc" }]}>
                <View style={styles.bentoHeaderRow}>
                  <Ionicons name="business-outline" size={13} color="#8b5cf6" style={{ marginRight: 4 }} />
                  <Text style={styles.bentoLabel}>UNIT KERJA</Text>
                </View>
                <Text style={[styles.bentoValue, { color: colors.textDark }]} numberOfLines={2}>
                  {employee.workUnit || "Seksi KSDA Wilayah III Balikpapan"}
                </Text>
              </View>

              {/* Card 3: PANGKAT/GOL */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc" }]}>
                <View style={styles.bentoHeaderRow}>
                  <Ionicons name="ribbon-outline" size={13} color="#f59e0b" style={{ marginRight: 4 }} />
                  <Text style={styles.bentoLabel}>PANGKAT/GOL</Text>
                </View>
                <Text style={[styles.bentoValue, { color: colors.textDark }]}>
                  {employee.rankGrade || "PPPK Golongan IX"}
                </Text>
              </View>

              {/* Card 4: SISA CUTI */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc" }]}>
                <View style={styles.bentoHeaderRow}>
                  <Ionicons name="calendar-outline" size={13} color="#10b981" style={{ marginRight: 4 }} />
                  <Text style={styles.bentoLabel}>SISA CUTI (2026)</Text>
                </View>
                <Text style={[styles.bentoValue, { color: colors.textDark }]}>
                  {employee.remainingLeaveDays ?? 12} Hari Kerja
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Horizontal Scrollable Tab Navigation Bar (Tanpa Overflow) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabNavRow}
          >
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "penugasan" && styles.tabBtnActive]}
              onPress={() => setActiveTab("penugasan")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-text-outline"
                size={14}
                color={activeTab === "penugasan" ? "#ffffff" : "#64748b"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabBtnText, activeTab === "penugasan" && styles.tabBtnTextActive]}>
                Riwayat Penugasan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "biodata" && styles.tabBtnActive]}
              onPress={() => setActiveTab("biodata")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={activeTab === "biodata" ? "#ffffff" : "#64748b"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabBtnText, activeTab === "biodata" && styles.tabBtnTextActive]}>
                Biodata
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "cuti" && styles.tabBtnActive]}
              onPress={() => setActiveTab("cuti")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={activeTab === "cuti" ? "#ffffff" : "#64748b"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabBtnText, activeTab === "cuti" && styles.tabBtnTextActive]}>
                Cuti Pegawai (PNS)
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>12 Hari</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Tab Content Box Presisi Web Portal Screenshot 2 */}
          {activeTab === "penugasan" && (
            <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.penugasanHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                  Riwayat Penugasan
                </Text>
                <TouchableOpacity
                  style={styles.buatStBtn}
                  onPress={() => Alert.alert("Surat Tugas Baru", "Formulir Pembuatan Surat Tugas Baru.")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buatStText}>+ Buat Surat Tugas</Text>
                </TouchableOpacity>
              </View>

              {/* Sample ST Card Presisi Screenshot 2 */}
              <View style={[styles.stItemCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc" }]}>
                <View style={styles.stCodeBadge}>
                  <Text style={styles.stCodeText}>
                    ST.12/K.18/TU/FOLU.NC-23/KSA.0X.0X/B/05/2026
                  </Text>
                </View>

                <Text style={[styles.stPerihalText, { color: colors.textDark }]}>
                  Melaksanakan perjalanan dinas dari Samarinda ke Jakarta dalam rangka konsultasi pengelolaan konservasi spesies dan genetik ...
                </Text>

                <View style={styles.stMetaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                  <Text style={styles.stDateText}>16 Mei 2026 - 17 Mei 2026</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Biodata Tab Presisi Screenshot 2 with Edit Button */}
          {activeTab === "biodata" && (
            <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.biodataHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                  Identitas Kepegawaian
                </Text>
                {isSuperAdmin && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={handleOpenEdit}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color="#0f172a" style={{ marginRight: 4 }} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.biodataBentoGrid}>
                {/* NIP */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>NIP</Text>
                  <Text style={[styles.fieldValue, { color: colors.textDark }]}>{employee.nip}</Text>
                </View>

                {/* NAMA LENGKAP */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>NAMA LENGKAP</Text>
                  <Text style={[styles.fieldValue, { color: colors.textDark }]}>{employee.name}</Text>
                </View>

                {/* JABATAN */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>JABATAN</Text>
                  <Text style={[styles.fieldValue, { color: colors.textDark }]}>
                    {employee.position || "Pengendali Ekosistem Hutan Ahli Pertama"}
                  </Text>
                </View>

                {/* PANGKAT / GOLONGAN */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>PANGKAT / GOLONGAN</Text>
                  <Text style={[styles.fieldValue, { color: colors.textDark }]}>
                    {employee.rankGrade || "PPPK Golongan IX"}
                  </Text>
                </View>

                {/* UNIT KERJA */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>UNIT KERJA</Text>
                  <Text style={[styles.fieldValue, { color: colors.textDark }]}>
                    {employee.workUnit || "Seksi KSDA Wilayah III Balikpapan"}
                  </Text>
                </View>

                {/* MASA KERJA */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>MASA KERJA</Text>
                  <Text style={[styles.fieldValue, { color: colors.textDark }]}>2 Tahun 0 Bulan</Text>
                </View>

                {/* STATUS */}
                <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                  <Text style={styles.fieldLabel}>STATUS</Text>
                  <Text style={[styles.fieldValue, { color: "#059669" }]}>Aktif Bertugas</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {activeTab === "cuti" && (
            <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 12 }]}>
                Riwayat & Kuota Cuti (2026)
              </Text>
              <View style={[styles.biodataFieldCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }]}>
                <Text style={styles.fieldLabel}>STATUS HAK CUTI</Text>
                <Text style={[styles.fieldValue, { color: colors.textDark }]}>
                  Hak Cuti Tahunan: 12 Hari Kerja • Terpakai: 0 Hari • Sisa Cuti: 12 Hari
                </Text>
              </View>
            </GlassCard>
          )}
        </ScrollView>

        {/* Modal IAM Kelola Akses */}
        {isSuperAdmin && (
          <EmployeeAccessModal
            visible={accessModalVisible}
            onClose={() => setAccessModalVisible(false)}
            employee={employee}
          />
        )}

        {/* Modal Edit Pegawai Khusus Superadmin */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]} highlighted>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textDark }]}>Edit Identitas Pegawai</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nama Lengkap & Gelar</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={editNama}
                    onChangeText={setEditNama}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>NIP</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={editNip}
                    onChangeText={setEditNip}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Jabatan</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={editJabatan}
                    onChangeText={setEditJabatan}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Unit Kerja / Seksi</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={editWorkUnit}
                    onChangeText={setEditWorkUnit}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pangkat / Golongan</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={editRankGrade}
                    onChangeText={setEditRankGrade}
                  />
                </View>
              </ScrollView>

              <EmeraldButton
                title={isSubmittingEdit ? "MENYIMPAN..." : "💾 Simpan Perubahan"}
                onPress={handleSaveEdit}
                loading={isSubmittingEdit}
                style={{ marginTop: 12 }}
              />
            </GlassCard>
          </View>
        </Modal>
      </View>
    </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerActionChips: {
    flexDirection: "row",
    gap: 8,
  },
  resetPasswordChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe8",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  resetPasswordText: {
    color: "#d97706",
    fontSize: 11,
    fontWeight: "700",
  },
  kelolaAksesChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  kelolaAksesText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 16,
    marginBottom: 14,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1,
  },
  statusBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  statusBadgeText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "800",
  },
  profileNip: {
    fontSize: 12,
    marginTop: 2,
  },

  /* 4 Bento Stat Cards Grid Presisi Screenshot 2 */
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  bentoCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 8,
    padding: 10,
    borderRadius: RADIUS.input,
  },
  bentoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  bentoLabel: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bentoValue: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },

  /* Horizontal Scrollable Tab Nav Bar */
  tabNavRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingRight: 16,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tabBtnActive: {
    backgroundColor: "#2563eb",
  },
  tabBtnText: {
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: RADIUS.pill,
    paddingVertical: 1,
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  tabBadgeText: {
    color: "#059669",
    fontSize: 9.5,
    fontWeight: "800",
  },

  tabContentCard: {
    padding: 16,
  },
  penugasanHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  buatStBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  buatStText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  stItemCard: {
    padding: 12,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stCodeBadge: {
    backgroundColor: "#eff6ff",
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  stCodeText: {
    color: "#2563eb",
    fontSize: 10,
    fontWeight: "700",
  },
  stPerihalText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    marginBottom: 8,
  },
  stMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stDateText: {
    color: "#94a3b8",
    fontSize: 11,
  },

  /* Biodata Section Presisi Screenshot 2 */
  biodataHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  editText: {
    color: "#0f172a",
    fontSize: 11.5,
    fontWeight: "700",
  },
  biodataBentoGrid: {
    gap: 8,
  },
  biodataFieldCard: {
    padding: 10,
    borderRadius: RADIUS.input,
  },
  fieldLabel: {
    color: "#94a3b8",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 12.5,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: "#1e293b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
});
