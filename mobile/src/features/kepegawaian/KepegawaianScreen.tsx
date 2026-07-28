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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";
import { FabMenu } from "../../components/ui/FabMenu";
import { EmployeeDetailModal } from "./EmployeeDetailModal";
import { EmployeeAccessModal } from "./EmployeeAccessModal";
import { useAuth } from "../auth/AuthProvider";
import { apiClient } from "../../lib/api/client";

interface EmployeeItem {
  id: string | number;
  name: string;
  nip: string;
  position: string;
  workUnit: string;
  rankGrade?: string;
  remainingLeaveDays?: number;
  role?: string;
  accessModules?: string[];
}

interface KepegawaianScreenProps {
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const KepegawaianScreen: React.FC<KepegawaianScreenProps> = ({
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Selected Employee for Modals
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<EmployeeItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEmployeeForAccess, setSelectedEmployeeForAccess] = useState<EmployeeItem | null>(null);
  const [accessModalVisible, setAccessModalVisible] = useState(false);

  // Form states for Tambah Pegawai
  const [newNama, setNewNama] = useState("");
  const [newNip, setNewNip] = useState("");
  const [newJabatan, setNewJabatan] = useState("");
  const [newWilayah, setNewWilayah] = useState("");

  const isSuperAdmin = user?.role === "super_admin";

  const defaultEmployeeList: EmployeeItem[] = [
    {
      id: "1",
      name: "A. Aliah Indah Fitriah, S.Hut.",
      nip: "199601032024212050",
      position: "Pengendali Ekosistem Hutan Ahli Pertama",
      workUnit: "Seksi KSDA Wilayah III Balikpapan",
      rankGrade: "PPPK Golongan IX",
      remainingLeaveDays: 12,
      role: "admin",
      accessModules: ["kepegawaian"],
    },
    {
      id: "2",
      name: "Abdul Farij",
      nip: "-",
      position: "MMP Resor KSDA Wilayah 02 Kepulauan Derawan",
      workUnit: "Seksi KSDA Wilayah I Berau",
      rankGrade: "Non-ASN",
      remainingLeaveDays: 12,
      role: "user",
      accessModules: ["kepegawaian"],
    },
    {
      id: "3",
      name: "Abdurrahman",
      nip: "196906172025211013",
      position: "Manggala Agni Pemula",
      workUnit: "Seksi KSDA Wilayah II Tenggarong",
      rankGrade: "Golongan II/a",
      remainingLeaveDays: 12,
      role: "user",
      accessModules: ["kepegawaian"],
    },
    {
      id: "4",
      name: "Achmad Syafey N",
      nip: "200009222024211004",
      position: "Pengendali Ekosistem Hutan Pemula",
      workUnit: "Seksi KSDA Wilayah II Tenggarong",
      rankGrade: "Golongan II/c",
      remainingLeaveDays: 12,
      role: "user",
      accessModules: ["kepegawaian"],
    },
    {
      id: "5",
      name: "Administrator Pusat BKSDA",
      nip: "198001012005011001",
      position: "Kepala Satuan Teknologi",
      workUnit: "BKSDA Pusat Provinsi",
      rankGrade: "Golongan IV/a",
      remainingLeaveDays: 12,
      role: "super_admin",
      accessModules: ["kepegawaian", "bmn", "inventory", "dereporting", "cms", "surat"],
    },
  ];

  const fetchEmployeeData = async () => {
    try {
      const response = await apiClient.get<any>("/kepegawaian/employees");
      if (response.data && Array.isArray(response.data.data)) {
        const apiList = response.data.data.map((emp: any) => ({
          id: emp.id,
          name: emp.nama_lengkap || emp.name,
          nip: emp.nip || "-",
          position: emp.jabatan || "Staf BKSDA",
          workUnit: emp.satuan_kerja || "Balai KSDA Kaltim",
          rankGrade: emp.pangkat_golongan || "Golongan III/a",
          remainingLeaveDays: emp.sisa_cuti ?? 12,
          role: emp.user?.role || emp.role || "user",
          accessModules: emp.user?.access_modules || emp.access_modules || ["kepegawaian"],
        }));
        setEmployees(apiList.length > 0 ? apiList : defaultEmployeeList);
      } else {
        setEmployees(defaultEmployeeList);
      }
    } catch {
      setEmployees(defaultEmployeeList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.nip.includes(q) ||
      emp.position.toLowerCase().includes(q) ||
      emp.workUnit.toLowerCase().includes(q)
    );
  });

  const handleOpenDetail = (emp: EmployeeItem) => {
    setSelectedEmployeeForDetail(emp);
    setDetailModalVisible(true);
  };

  const handleOpenAccess = (emp: EmployeeItem) => {
    setSelectedEmployeeForAccess(emp);
    setAccessModalVisible(true);
  };

  const handleDeleteEmployee = (emp: EmployeeItem) => {
    Alert.alert(
      "Hapus Data Pegawai",
      `Apakah Anda yakin ingin menghapus data pegawai ${emp.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/kepegawaian/employees/${emp.id}`);
            } catch {
              // Local fallback delete
            }
            setEmployees(employees.filter((item) => item.id !== emp.id));
            Alert.alert("Berhasil", `Data pegawai ${emp.name} telah dihapus.`);
          },
        },
      ]
    );
  };

  const handleAddEmployee = () => {
    if (!newNama.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan Nama Lengkap Pegawai.");
      return;
    }

    const newEmp: EmployeeItem = {
      id: String(Date.now()),
      name: newNama.trim(),
      nip: newNip.trim() || "-",
      position: newJabatan.trim() || "Staf BKSDA",
      workUnit: newWilayah.trim() || "Balai KSDA Kaltim",
      rankGrade: "Golongan III/a",
      remainingLeaveDays: 12,
      role: "user",
      accessModules: ["kepegawaian"],
    };

    setEmployees([newEmp, ...employees]);
    setAddModalVisible(false);
    setNewNama("");
    setNewNip("");
    setNewJabatan("");
    setNewWilayah("");

    Alert.alert("Berhasil", `Data pegawai ${newEmp.name} berhasil ditambahkan.`);
  };

  const handleSelectNavTab = (tabKey: string) => {
    if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    } else if (tabKey === "home" && onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
        ]}
      >
        <TouchableOpacity
          onPress={onBack ? onBack : () => onNavigateToModule && onNavigateToModule("home")}
          style={styles.backBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Ionicons name="people" size={20} color="#3b82f6" style={{ marginRight: 6 }} />
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>KEPEGAWAIAN & SDM</Text>
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
        {/* Module Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: colors.textDark }]}>Daftar Pegawai</Text>
          <Text style={[styles.mainSub, { color: colors.textMuted }]}>
            Kelola informasi personil dan hak akses sistem.
          </Text>
        </View>

        {/* Action Controls Row Presisi Screenshot 1 */}
        <View style={styles.controlsRow}>
          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textDark }]}
              placeholder="Cari NIP / Nama..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Inbox Surat Cuti Pill Button */}
          <TouchableOpacity
            style={styles.inboxCutiBtn}
            onPress={() => Alert.alert("Inbox Cuti", "Membuka Inbox Permohonan Cuti Pegawai...")}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-unread-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.inboxCutiText}>Inbox{"\n"}Surat Cuti</Text>
          </TouchableOpacity>

          {/* Tambah Pegawai Solid Button */}
          <TouchableOpacity
            style={styles.tambahPegawaiBtn}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.tambahPegawaiText}>+ Tambah{"\n"}Pegawai</Text>
          </TouchableOpacity>
        </View>

        {/* Employee Table Container Presisi Screenshot 1 */}
        <GlassCard style={[styles.tableCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {/* Table Column Headers */}
          <View style={[styles.tableHeaderRow, { borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0" }]}>
            <Text style={styles.tableHeaderCol1}>PROFIL PEGAWAI</Text>
            <Text style={styles.tableHeaderCol2}>NIP</Text>
            <Text style={styles.tableHeaderCol3}>AKSI</Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : (
            filteredEmployees.map((emp, index) => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.tableDataRow,
                  index < filteredEmployees.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleOpenDetail(emp)}
              >
                {/* Column 1: Profil Pegawai */}
                <View style={styles.tableDataCol1}>
                  <Text style={[styles.empName, { color: colors.textDark }]}>{emp.name}</Text>
                  <Text style={[styles.empUnit, { color: colors.textMuted }]}>{emp.workUnit}</Text>
                </View>

                {/* Column 2: NIP */}
                <View style={styles.tableDataCol2}>
                  <Text style={[styles.empNip, { color: colors.textDark }]}>{emp.nip}</Text>
                </View>

                {/* Column 3: Action Buttons (Search Detail, IAM Access, Delete) */}
                <View style={styles.tableDataCol3}>
                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleOpenDetail(emp)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="search-outline" size={16} color="#2563eb" />
                  </TouchableOpacity>

                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      onPress={() => handleOpenAccess(emp)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#d97706" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleDeleteEmployee(emp)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>
      </ScrollView>

      {/* Floating Action Button (FAB ☰ Menu) */}
      <FabMenu onNavigateToModule={handleSelectNavTab} />

      {/* Modal Detail Pegawai (Opens when clicking any employee) */}
      <EmployeeDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        employee={selectedEmployeeForDetail}
      />

      {/* Modal Manajemen Hak Akses IAM (Opens when clicking 🛡️ icon or Kelola Akses) */}
      {isSuperAdmin && (
        <EmployeeAccessModal
          visible={accessModalVisible}
          onClose={() => setAccessModalVisible(false)}
          employee={selectedEmployeeForAccess}
          onSuccess={fetchEmployeeData}
        />
      )}

      {/* Modal Tambah Pegawai Baru */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { backgroundColor: colors.cardBg }]} highlighted>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Tambah Pegawai Baru</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap & Gelar</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Contoh: Drs. Ahmad Subagja, M.Si."
                placeholderTextColor="#94a3b8"
                value={newNama}
                onChangeText={setNewNama}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>NIP</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Contoh: 19850412 201012 1 002"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={newNip}
                onChangeText={setNewNip}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Jabatan</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Contoh: Kepala Sub Bagian TU"
                placeholderTextColor="#94a3b8"
                value={newJabatan}
                onChangeText={setNewJabatan}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Seksi / Wilayah Kerja</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Contoh: Seksi KSDA Wilayah II Tenggarong"
                placeholderTextColor="#94a3b8"
                value={newWilayah}
                onChangeText={setNewWilayah}
              />
            </View>

            <EmeraldButton
              title="SIMPAN PEGAWAI BARU ➔"
              onPress={handleAddEmployee}
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingRight: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 90,
  },
  titleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  mainSub: {
    fontSize: 12.5,
  },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 10,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  inboxCutiBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  inboxCutiText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    textAlign: "center",
  },
  tambahPegawaiBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    height: 48,
  },
  tambahPegawaiText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    textAlign: "center",
  },

  tableCard: {
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableHeaderCol1: {
    flex: 1.3,
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tableHeaderCol2: {
    flex: 1,
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tableHeaderCol3: {
    width: 72,
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  tableDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tableDataCol1: {
    flex: 1.3,
    paddingRight: 6,
  },
  empName: {
    fontSize: 13.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  empUnit: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  tableDataCol2: {
    flex: 1,
    justifyContent: "center",
  },
  empNip: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  tableDataCol3: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionIconButton: {
    padding: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
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
