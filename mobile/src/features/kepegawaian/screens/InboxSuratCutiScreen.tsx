import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { apiClient } from "@/lib/api/client";
import {
  FormulirCutiPrintModal,
  LeaveRequestPrintData,
} from "@/components/FormulirCutiPrintModal";
import { EditCutiModal } from "../components/EditCutiModal";

interface ConfirmTarget {
  id: number | string;
  newStatus: "DISETUJUI" | "DITOLAK" | "PENGAJUAN";
  employeeName: string;
}

export const InboxSuratCutiScreen: React.FC = () => {
  const navigation = useNavigation();
  const [requests, setRequests] = useState<LeaveRequestPrintData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Semua");
  const [processingId, setProcessingId] = useState<number | string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selected item for Formulir Cuti Modal preview
  const [previewItem, setPreviewItem] = useState<LeaveRequestPrintData | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Selected item for Edit Modal
  const [editItem, setEditItem] = useState<LeaveRequestPrintData | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  // Custom Status Confirmation Dialog State
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const response = await apiClient.get("/kepegawaian/leave-requests", {
        params: {
          page,
          per_page: 15,
          search: searchQuery.trim() || undefined,
        },
      });

      if (response.data?.data && Array.isArray(response.data.data)) {
        setRequests(response.data.data);
        setPage(response.data.current_page || 1);
        setLastPage(response.data.last_page || 1);
        setTotal(response.data.total || response.data.data.length);
      } else {
        const listData = Array.isArray(response.data) ? response.data : [];
        setRequests(listData);
        setTotal(listData.length);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaveRequests();
    }, [fetchLeaveRequests])
  );

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaveRequests();
  };

  const openConfirmDialog = (id: number | string, newStatus: "DISETUJUI" | "DITOLAK" | "PENGAJUAN", employeeName: string) => {
    setConfirmTarget({ id, newStatus, employeeName });
    setConfirmVisible(true);
  };

  const handleExecuteStatusUpdate = async () => {
    if (!confirmTarget) return;
    const { id, newStatus } = confirmTarget;

    setIsUpdatingStatus(true);
    setProcessingId(id);
    try {
      await apiClient.put(`/kepegawaian/leave-requests/${id}/status`, {
        status: newStatus,
      });

      setConfirmVisible(false);
      setConfirmTarget(null);
      fetchLeaveRequests();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal memperbarui status pengajuan cuti.";
      Alert.alert("Gagal Memperbarui", msg);
    } finally {
      setIsUpdatingStatus(false);
      setProcessingId(null);
    }
  };

  const handleDeleteRequest = (id: number | string) => {
    Alert.alert(
      "Konfirmasi Hapus",
      "Apakah Anda yakin ingin menghapus permohonan cuti ini secara permanen?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Hapus",
          style: "destructive",
          onPress: async () => {
            setProcessingId(id);
            try {
              await apiClient.delete(`/kepegawaian/leave-requests/${id}`);
              fetchLeaveRequests();
            } catch (err: any) {
              const msg = err.response?.data?.message || "Gagal menghapus pengajuan cuti.";
              Alert.alert("Gagal Hapus", msg);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const openPreview = (item: LeaveRequestPrintData) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  };

  const openEdit = (item: LeaveRequestPrintData) => {
    setEditItem(item);
    setEditVisible(true);
  };

  const filteredRequests = requests.filter((item) => {
    const status = (item.status || "PENGAJUAN").toUpperCase();
    if (selectedFilter === "Pengajuan") return status === "PENGAJUAN";
    if (selectedFilter === "Disetujui") return status === "DISETUJUI";
    if (selectedFilter === "Ditolak") return status === "DITOLAK";
    return true;
  });

  const renderItem = ({ item }: { item: LeaveRequestPrintData }) => {
    const status = (item.status || "PENGAJUAN").toUpperCase();
    const isSetuju = status === "DISETUJUI";
    const isTolak = status === "DITOLAK";
    const isPengajuan = status === "PENGAJUAN";
    const emp = item.employee || {};
    const empName = emp.nama_lengkap || "Nama Pegawai";
    const empNip = emp.nip ? `NIP. ${emp.nip}` : "-";
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeJenisText}>{item.jenis_cuti}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isSetuju
                ? styles.statusSetuju
                : isTolak
                ? styles.statusTolak
                : styles.statusPengajuan,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isSetuju
                  ? styles.statusTextSetuju
                  : isTolak
                  ? styles.statusTextTolak
                  : styles.statusTextPengajuan,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <Text style={styles.empNameText}>{empName}</Text>
        <Text style={styles.empNipText}>{empNip} • {emp.jabatan || "Pegawai BKSDA"}</Text>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.infoText}>
            {item.tanggal_mulai} s/d {item.tanggal_selesai} ({item.jumlah_hari} Hari Kerja)
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.infoText} numberOfLines={2}>
            Alasan: {item.alasan_cuti || "-"}
          </Text>
        </View>

        {/* Action Buttons Row (Form Cuti, Edit, Hapus) */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => openPreview(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.previewBtnText}>Form Cuti</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEdit(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={14} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => item.id && handleDeleteRequest(item.id)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={styles.deleteBtnText}>Hapus</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Action Row (Setujui / Tolak / Reset ke Pengajuan) */}
        <View style={styles.statusActionGroup}>
          {!isSetuju && (
            <TouchableOpacity
              style={[styles.approveBtn, isProcessing && styles.btnDisabled]}
              onPress={() => item.id && openConfirmDialog(item.id, "DISETUJUI", empName)}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.approveBtnText}>Setujui</Text>
            </TouchableOpacity>
          )}

          {!isTolak && (
            <TouchableOpacity
              style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
              onPress={() => item.id && openConfirmDialog(item.id, "DITOLAK", empName)}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={15} color="#ef4444" style={{ marginRight: 4 }} />
              <Text style={styles.rejectBtnText}>Tolak</Text>
            </TouchableOpacity>
          )}

          {!isPengajuan && (
            <TouchableOpacity
              style={[styles.resetBtn, isProcessing && styles.btnDisabled]}
              onPress={() => item.id && openConfirmDialog(item.id, "PENGAJUAN", empName)}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-circle-outline" size={15} color="#d97706" style={{ marginRight: 4 }} />
              <Text style={styles.resetBtnText}>Kembalikan Pengajuan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Inbox Surat Cuti</Text>
          <Text style={styles.headerSubtitle}>Total {total} Pengajuan Cuti</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama pegawai, NIP, atau jenis cuti..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setPage(1);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterBar}>
        {["Semua", "Pengajuan", "Disetujui", "Ditolak"].map((filter) => {
          const active = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Memuat inbox permohonan cuti...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />
          }
          ListFooterComponent={
            lastPage > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={16} color={page <= 1 ? "#94a3b8" : "#0f172a"} />
                  <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Sebelumnya</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  Hal {page} dari {lastPage}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, page >= lastPage && styles.pageBtnDisabled]}
                  disabled={page >= lastPage}
                  onPress={() => setPage((p) => Math.min(lastPage, p + 1))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pageBtnText, page >= lastPage && styles.pageBtnTextDisabled]}>Berikutnya</Text>
                  <Ionicons name="chevron-forward" size={16} color={page >= lastPage ? "#94a3b8" : "#0f172a"} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Tidak Ada Permohonan Cuti</Text>
              <Text style={styles.emptySubtitle}>
                Belum ada pengajuan cuti pegawai dengan kriteria ini.
              </Text>
            </View>
          }
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmVisible && confirmTarget && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <View
                style={[
                  styles.confirmIconContainer,
                  confirmTarget.newStatus === "DISETUJUI"
                    ? styles.iconBgSetuju
                    : confirmTarget.newStatus === "DITOLAK"
                    ? styles.iconBgTolak
                    : styles.iconBgReset,
                ]}
              >
                <Ionicons
                  name={
                    confirmTarget.newStatus === "DISETUJUI"
                      ? "checkmark-circle"
                      : confirmTarget.newStatus === "DITOLAK"
                      ? "close-circle"
                      : "refresh-circle"
                  }
                  size={42}
                  color={
                    confirmTarget.newStatus === "DISETUJUI"
                      ? "#059669"
                      : confirmTarget.newStatus === "DITOLAK"
                      ? "#dc2626"
                      : "#d97706"
                  }
                />
              </View>

              <Text style={styles.confirmTitle}>
                {confirmTarget.newStatus === "DISETUJUI"
                  ? "Konfirmasi Persetujuan Cuti"
                  : confirmTarget.newStatus === "DITOLAK"
                  ? "Konfirmasi Penolakan Cuti"
                  : "Kembalikan Status ke Pengajuan"}
              </Text>

              <Text style={styles.confirmMessage}>
                Apakah Anda yakin ingin memperbarui status pengajuan cuti pegawai{" "}
                <Text style={{ fontWeight: "800", color: "#0f172a" }}>{confirmTarget.employeeName}</Text>{" "}
                menjadi <Text style={{ fontWeight: "800" }}>{confirmTarget.newStatus}</Text>?
              </Text>

              <View style={styles.confirmBtnRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setConfirmVisible(false)}
                  disabled={isUpdatingStatus}
                >
                  <Text style={styles.confirmCancelBtnText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmProceedBtn,
                    confirmTarget.newStatus === "DISETUJUI"
                      ? { backgroundColor: "#059669" }
                      : confirmTarget.newStatus === "DITOLAK"
                      ? { backgroundColor: "#dc2626" }
                      : { backgroundColor: "#d97706" },
                  ]}
                  onPress={handleExecuteStatusUpdate}
                  disabled={isUpdatingStatus}
                  activeOpacity={0.8}
                >
                  {isUpdatingStatus ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmProceedBtnText}>Ya, Lanjutkan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Pratinjau Formulir Cuti Modal */}
      <FormulirCutiPrintModal
        visible={previewVisible}
        data={previewItem}
        onClose={() => setPreviewVisible(false)}
      />

      {/* Edit Cuti Modal for Admin */}
      <EditCutiModal
        visible={editVisible}
        data={editItem}
        onClose={() => setEditVisible(false)}
        onSuccess={() => fetchLeaveRequests()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    padding: 0,
  },

  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterChipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badgeContainer: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeJenisText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusSetuju: { backgroundColor: "#d1fae5" },
  statusTolak: { backgroundColor: "#fee2e2" },
  statusPengajuan: { backgroundColor: "#fef3c7" },
  statusText: { fontSize: 11, fontWeight: "800" },
  statusTextSetuju: { color: "#047857" },
  statusTextTolak: { color: "#b91c1c" },
  statusTextPengajuan: { color: "#b45309" },

  empNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  empNipText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#334155",
    flex: 1,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#d97706",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },

  statusActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#d97706",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconBgSetuju: { backgroundColor: "#ecfdf5" },
  iconBgTolak: { backgroundColor: "#fef2f2" },
  iconBgReset: { backgroundColor: "#fffbeb" },

  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  confirmProceedBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmProceedBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  pageBtnTextDisabled: {
    color: "#94a3b8",
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
});
