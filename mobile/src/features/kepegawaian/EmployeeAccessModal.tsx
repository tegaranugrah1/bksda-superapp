import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";

import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { apiClient } from "../../lib/api/client";

interface EmployeeAccessModalProps {
  visible: boolean;
  onClose: () => void;
  employee: {
    id: string | number;
    name: string;
    nip: string;
    role?: string;
    accessModules?: string[];
  } | null;
  onSuccess?: () => void;
}

export const EmployeeAccessModal: React.FC<EmployeeAccessModalProps> = ({
  visible,
  onClose,
  employee,
  onSuccess,
}) => {
  const { isDark, colors } = useTheme();
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableModules = [
    {
      key: "kepegawaian",
      title: "Kepegawaian",
      subtitle: "Manajemen SDM & Data Pegawai",
    },
    {
      key: "bmn",
      title: "BMN & Aset",
      subtitle: "Barang Milik Negara & Inventaris Aset",
    },
    {
      key: "inventory",
      title: "Inventory",
      subtitle: "Stok Barang & Logistik Persediaan",
    },
    {
      key: "dereporting",
      title: "D-Reporting",
      subtitle: "Pelaporan Kejadian Digital Elektronik",
    },
    {
      key: "cms",
      title: "CMS Panel",
      subtitle: "Manajemen Konten Website & Portal Publik",
    },
    {
      key: "surat",
      title: "Persuratan & Disposisi",
      subtitle: "Pengelolaan Surat Masuk & Keluar",
    },
  ];

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      if (!employee) return;

      setSelectedRole(employee.role || "user");
      setSelectedModules(employee.accessModules || []);

      try {
        const response = await apiClient.get(`/kepegawaian/employees/${employee.id}/access`);
        const access = response.data?.data;
        if (!cancelled && access) {
          setSelectedRole(access.role || "user");
          setSelectedModules(Array.isArray(access.access_modules) ? access.access_modules : []);
        }
      } catch {
        // Keep the list data if the access detail request fails.
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, [employee]);

  const toggleModule = (moduleKey: string) => {
    if (selectedModules.includes(moduleKey)) {
      setSelectedModules(selectedModules.filter((m) => m !== moduleKey));
    } else {
      setSelectedModules([...selectedModules, moduleKey]);
    }
  };

  const handleSave = async () => {
    if (!employee) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/kepegawaian/employees/${employee.id}/access`, {
        role: selectedRole,
        access_modules: selectedModules,
      });

      Alert.alert(
        "Berhasil",
        `Hak akses untuk ${employee.name} berhasil diperbarui.`,
        [{ text: "OK", onPress: () => { onClose(); if (onSuccess) onSuccess(); } }]
      );
    } catch {
      Alert.alert("Gagal", "Hak akses gagal diperbarui. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!employee) return null;

  const avatarInitial = (employee.name.charAt(0) || "A").toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? "#092318" : "#ffffff",
              borderColor: colors.glassBorder,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBg}>
                <Ionicons name="shield-checkmark" size={18} color="#2563eb" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>
                Manajemen Hak Akses
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Employee Info Header Card */}
            <View style={[styles.employeeCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#eff6ff" }]}>
              <View style={styles.employeeAvatarCircle}>
                <Text style={styles.employeeAvatarText}>{avatarInitial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.employeeName, { color: colors.textDark }]}>{employee.name}</Text>
                <Text style={styles.employeeNip}>NIP: {employee.nip}</Text>
              </View>
            </View>

            {/* Role System Section */}
            <View style={styles.sectionGroup}>
              <Text style={[styles.sectionLabel, { color: colors.textDark }]}>Peran Sistem (Role)</Text>
              <View style={styles.rolePickerRow}>
                {[
                  { key: "admin", label: "Admin (Pengelola Modul)" },
                  { key: "super_admin", label: "Super Admin" },
                  { key: "user", label: "User (Pegawai Biasa)" },
                ].map((r) => {
                  const isSelected = selectedRole === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[
                        styles.roleChip,
                        { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                        isSelected && styles.roleChipSelected,
                      ]}
                      onPress={() => setSelectedRole(r.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={16}
                        color={isSelected ? "#2563eb" : "#94a3b8"}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Module Access Section */}
            <View style={styles.sectionGroup}>
              <View style={styles.moduleSectionHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textDark }]}>Akses Modul</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{selectedModules.length} Terpilih</Text>
                </View>
              </View>

              <View style={styles.moduleList}>
                {availableModules.map((mod) => {
                  const isChecked = selectedModules.includes(mod.key);
                  return (
                    <TouchableOpacity
                      key={mod.key}
                      style={[
                        styles.moduleCardRow,
                        { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                        isChecked && styles.moduleCardRowChecked,
                      ]}
                      onPress={() => toggleModule(mod.key)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkboxCircle, isChecked && styles.checkboxCircleChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.moduleTitle, isChecked && styles.moduleTitleChecked]}>
                          {mod.title}
                        </Text>
                        <Text style={[styles.moduleSub, { color: colors.textMuted }]}>{mod.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={[styles.modalFooter, { borderTopColor: colors.glassBorder }]}>
            <TouchableOpacity style={styles.batalBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.batalText, { color: colors.textDark }]}>Batal</Text>
            </TouchableOpacity>

            <EmeraldButton
              title={isSubmitting ? "MENYIMPAN..." : "🛡️ Simpan"}
              onPress={handleSave}
              loading={isSubmitting}
              style={styles.simpanBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  modalContent: {
    borderRadius: 22,
    borderWidth: 1,
    maxHeight: "90%",
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    maxHeight: 460,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: 14,
    marginBottom: 16,
  },
  employeeAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  employeeAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  employeeName: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  employeeNip: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 1,
  },
  sectionGroup: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  rolePickerRow: {
    gap: 8,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  roleChipSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  roleChipText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  roleChipTextSelected: {
    color: "#1e40af",
    fontWeight: "700",
  },
  moduleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  countBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
  },
  moduleList: {
    gap: 8,
  },
  moduleCardRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: 12,
  },
  moduleCardRowChecked: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxCircleChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  moduleTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  moduleTitleChecked: {
    color: "#1e40af",
  },
  moduleSub: {
    fontSize: 11,
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 10,
  },
  batalBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  batalText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  simpanBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#2563eb",
  },
});
