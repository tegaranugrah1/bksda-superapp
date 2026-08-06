import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FabMenu } from "../../components/ui/FabMenu";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { NotificationModal } from "../../components/ui/NotificationModal";
import { apiClient } from "../../lib/api/client";
import { downloadAssignmentFile } from "@/lib/files/download";
import { shareFile } from "@/lib/files/share";

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const cleaned = String(dateStr).split("T")[0].trim();
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

function formatPeriodeIndo(tglMulai?: string | null, tglSelesai?: string | null): string {
  if (!tglMulai) return "-";
  const startClean = String(tglMulai).split("T")[0].trim();
  const endClean = tglSelesai ? String(tglSelesai).split("T")[0].trim() : startClean;

  if (startClean === endClean) {
    return formatDateIndo(startClean);
  }

  const p1 = startClean.split("-");
  const p2 = endClean.split("-");
  if (p1.length === 3 && p2.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const y1 = parseInt(p1[0], 10);
    const m1 = parseInt(p1[1], 10) - 1;
    const d1 = parseInt(p1[2], 10);
    const y2 = parseInt(p2[0], 10);
    const m2 = parseInt(p2[1], 10) - 1;
    const d2 = parseInt(p2[2], 10);

    if (y1 === y2 && m1 === m2) {
      return `${d1} - ${d2} ${months[m1]} ${y1}`;
    }
  }
  return `${formatDateIndo(startClean)} - ${formatDateIndo(endClean)}`;
}

interface RiwayatSuratTugasScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

interface SuratTugasItem {
  id: string;
  nomor_surat?: string;
  maksud_tujuan: string;
  tempat_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  file_surat_path?: string | null;
  employees?: { id: string; nama_lengkap?: string; name?: string; nip: string; peran?: string }[];
  rawItem?: any;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "DRAFT", bg: "#f3f4f6", text: "#4b5563" },
  pending: { label: "PENDING", bg: "#fef3c7", text: "#d97706" },
  approved: { label: "DITERBITKAN", bg: "#d1fae5", text: "#059669" },
  rejected: { label: "DITOLAK", bg: "#fee2e2", text: "#dc2626" },
  completed: { label: "SELESAI", bg: "#dbeafe", text: "#2563eb" },
};

export const RiwayatSuratTugasScreen: React.FC<RiwayatSuratTugasScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const isFocused = useIsFocused();
  const { isDark, colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isTrashMode, setIsTrashMode] = useState<boolean>(false);
  const [stList, setStList] = useState<SuratTugasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [notifModal, setNotifModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant?: "danger" | "warning" | "success" | "info";
    buttonText?: string;
  }>({
    visible: false,
    title: "",
    message: "",
    variant: "info",
  });

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) params.append("status", selectedStatus);
      if (isTrashMode) params.append("trashed", "true");
      params.append("per_page", "50");

      const res = await apiClient.get(`/surat-tugas?${params.toString()}`);
      const rawData = res.data?.data || res.data || [];
      const listArray = Array.isArray(rawData) ? rawData : [];

      const formatted: SuratTugasItem[] = listArray.map((item: any) => ({
        id: String(item.id),
        nomor_surat: item.nomor_surat || undefined,
        maksud_tujuan: item.maksud_tujuan || item.title || "Melaksanakan Perjalanan Dinas",
        tempat_tujuan: item.tempat_tujuan || item.location || "Balai KSDA Kaltim",
        tanggal_mulai: item.tanggal_mulai || item.created_at || new Date().toISOString(),
        tanggal_selesai: item.tanggal_selesai || item.tanggal_mulai || new Date().toISOString(),
        status: String(item.status || "draft").toLowerCase(),
        file_surat_path: item.file_surat_path || null,
        employees: Array.isArray(item.employees)
          ? item.employees.map((e: any) => ({
              id: String(e.id),
              nama_lengkap: e.nama_lengkap || e.name || "Pegawai",
              nip: e.nip || "-",
              peran: e.pivot?.peran || e.peran || undefined,
            }))
          : [],
        rawItem: item,
      }));

      setStList(formatted);
    } catch {
      setStList([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus, isTrashMode]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      const timer = setInterval(() => {
        fetchHistory();
      }, 3000);
      return () => clearInterval(timer);
    }, [fetchHistory])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHistory();
  };

  const handleSoftDelete = (item: SuratTugasItem) => {
    const titleSnippet = item.maksud_tujuan.length > 45 ? `${item.maksud_tujuan.substring(0, 45)}...` : item.maksud_tujuan;
    setConfirmModal({
      visible: true,
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin memindahkan Surat Tugas "${item.nomor_surat || titleSnippet}" ke Sampah?`,
      confirmText: "Hapus ke Sampah",
      cancelText: "Batal",
      iconName: "trash-outline",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          setActionLoadingId(item.id);
          await apiClient.delete(`/surat-tugas/${item.id}`);
          setNotifModal({
            visible: true,
            title: "Berhasil Dihapus",
            message: "Surat Tugas telah berhasil dipindahkan ke Sampah.",
            variant: "success",
          });
          fetchHistory();
        } catch (err: any) {
          setNotifModal({
            visible: true,
            title: "Gagal Hapus",
            message: err?.response?.data?.message || "Gagal memindahkan Surat Tugas ke Sampah.",
            variant: "danger",
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const handleRestore = (item: SuratTugasItem) => {
    const titleSnippet = item.maksud_tujuan.length > 45 ? `${item.maksud_tujuan.substring(0, 45)}...` : item.maksud_tujuan;
    setConfirmModal({
      visible: true,
      title: "Konfirmasi Pulihkan",
      message: `Apakah Anda yakin ingin memulihkan Surat Tugas "${item.nomor_surat || titleSnippet}" dari Sampah?`,
      confirmText: "Pulihkan Surat",
      cancelText: "Batal",
      iconName: "refresh-outline",
      variant: "info",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          setActionLoadingId(item.id);
          await apiClient.post(`/surat-tugas/${item.id}/restore`);
          setNotifModal({
            visible: true,
            title: "Berhasil Dipulihkan",
            message: "Surat Tugas telah berhasil dipulihkan dari Sampah.",
            variant: "success",
          });
          fetchHistory();
        } catch (err: any) {
          setNotifModal({
            visible: true,
            title: "Gagal Pulihkan",
            message: err?.response?.data?.message || "Gagal memulihkan Surat Tugas.",
            variant: "danger",
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const handleApproveDirect = (item: SuratTugasItem) => {
    const titleSnippet = item.maksud_tujuan.length > 45 ? `${item.maksud_tujuan.substring(0, 45)}...` : item.maksud_tujuan;
    setConfirmModal({
      visible: true,
      title: "Konfirmasi Terbitkan",
      message: `Apakah Anda yakin ingin menerbitkan Surat Tugas "${item.nomor_surat || titleSnippet}"?`,
      confirmText: "Terbitkan Sekarang",
      cancelText: "Batal",
      iconName: "checkmark-circle-outline",
      variant: "info",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          setActionLoadingId(item.id);
          await apiClient.put(`/surat-tugas/${item.id}/approve`, { status: "approved" });
          setNotifModal({
            visible: true,
            title: "Surat Tugas Diterbitkan",
            message: "Surat Tugas telah berhasil diterbitkan!",
            variant: "success",
          });
          fetchHistory();
        } catch (err: any) {
          setNotifModal({
            visible: true,
            title: "Gagal Menerbitkan",
            message: err?.response?.data?.message || "Gagal menerbitkan Surat Tugas.",
            variant: "danger",
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const handleDownloadDoc = async (item: SuratTugasItem) => {
    if (!item.file_surat_path) return;
    try {
      setActionLoadingId(item.id);
      const filename = item.nomor_surat ? `ST-${item.nomor_surat.replace(/\//g, "_")}.pdf` : `Surat-Tugas-${item.id}.pdf`;
      const res = await downloadAssignmentFile({ assignmentId: item.id, mode: "management", filename });
      await shareFile({ localUri: res.localUri, dialogTitle: "Bagikan Surat Tugas PDF", mimeType: "application/pdf" });
    } catch (err: any) {
      setNotifModal({
        visible: true,
        title: "Gagal Unduh Berkas",
        message: err?.message || "Terjadi kesalahan saat mengunduh PDF.",
        variant: "danger",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEdit = (item: SuratTugasItem) => {
    const editPayload = item.rawItem || {
      id: item.id,
      maksud_tujuan: item.maksud_tujuan,
      tempat_tujuan: item.tempat_tujuan,
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai,
      status: item.status,
      nomor_surat: item.nomor_surat,
    };

    if (navigation && typeof navigation.navigate === "function") {
      navigation.navigate("BuatSuratTugas", { editId: item.id, editData: editPayload });
    } else if (onNavigateToModule) {
      onNavigateToModule("buat-surat-tugas");
    }
  };

  const filteredList = stList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.maksud_tujuan.toLowerCase().includes(q) ||
      item.tempat_tujuan.toLowerCase().includes(q) ||
      (item.nomor_surat && item.nomor_surat.toLowerCase().includes(q)) ||
      item.employees?.some((e) => (e.nama_lengkap || "").toLowerCase().includes(q) || e.nip.includes(q));

    return matchSearch;
  });

  const statusOptions = [
    { key: "", label: "Semua" },
    { key: "draft", label: "Draft" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Diterbitkan" },
    { key: "rejected", label: "Ditolak" },
    { key: "completed", label: "Selesai" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#090d16" : "#f8fafc" }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderBottomColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) onBack();
            else if (navigation) navigation.goBack();
          }}
          style={styles.backBtn}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerSub}>SDM & KEPEGAWAIAN BALAI KSDA KALTIM</Text>
          <Text style={[styles.headerTitle, { color: isDark ? "#ffffff" : "#0f172a" }]}>
            {isTrashMode ? "Sampah Surat Tugas" : "Riwayat Surat Tugas"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsTrashMode(!isTrashMode)}
          style={[styles.trashToggleBtn, { backgroundColor: isTrashMode ? "#fee2e2" : isDark ? "#1e293b" : "#f1f5f9" }]}
          activeOpacity={0.7}
        >
          <Ionicons name={isTrashMode ? "trash" : "trash-outline"} size={20} color={isTrashMode ? "#dc2626" : "#64748b"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
      >
        {/* Search & Filter Controls */}
        <GlassCard style={[styles.controlCard, { borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textDark }]}
              placeholder="Cari nomor, maksud kegiatan, lokasi, pegawai..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Status Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
            {statusOptions.map((opt) => {
              const isSelected = selectedStatus === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSelectedStatus(opt.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? "#2563eb" : isDark ? "#1e293b" : "#f1f5f9",
                      borderColor: isSelected ? "#2563eb" : isDark ? "#334155" : "#cbd5e1",
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: isSelected ? "#ffffff" : isDark ? "#cbd5e1" : "#475569" }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GlassCard>

        {/* List Content */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat riwayat surat tugas...</Text>
          </View>
        ) : filteredList.length === 0 ? (
          <GlassCard style={[styles.emptyBox, { borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
            <Ionicons name={isTrashMode ? "trash-bin-outline" : "document-text-outline"} size={44} color="#94a3b8" />
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>
              {isTrashMode ? "Sampah Kosong" : "Belum Ada Surat Tugas"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {isTrashMode ? "Tidak ada berkas surat tugas di tempat sampah." : "Belum ada riwayat surat tugas yang diterbitkan."}
            </Text>
          </GlassCard>
        ) : (
          filteredList.map((item) => {
            const stConf = STATUS_CONFIG[item.status] || { label: item.status.toUpperCase(), bg: "#f3f4f6", text: "#4b5563" };
            const periodeStr = formatPeriodeIndo(item.tanggal_mulai, item.tanggal_selesai);
            const isProcessingThis = actionLoadingId === item.id;

            return (
              <GlassCard key={item.id} style={[styles.card, { borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
                {/* Header Row: Status Badge & Periode */}
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: stConf.bg }]}>
                    <Text style={[styles.statusText, { color: stConf.text }]}>{stConf.label}</Text>
                  </View>
                  <View style={styles.periodeRow}>
                    <Ionicons name="calendar-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={[styles.periodeText, { color: colors.textMuted }]}>{periodeStr}</Text>
                  </View>
                </View>

                {/* Nomor Surat */}
                {item.nomor_surat ? (
                  <Text style={[styles.nomorSuratText, { color: colors.textDark }]}>
                    {item.nomor_surat}
                  </Text>
                ) : null}

                {/* Maksud Tujuan */}
                <Text style={[styles.titleText, { color: colors.textDark }]} numberOfLines={3}>
                  {item.maksud_tujuan}
                </Text>

                {/* Lokasi */}
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                  <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.tempat_tujuan}
                  </Text>
                </View>

                {/* Personil */}
                {item.employees && item.employees.length > 0 ? (
                  <View style={styles.personilContainer}>
                    <Text style={styles.personilLabel}>PERSONIL ({item.employees.length}):</Text>
                    <Text style={[styles.personilNames, { color: colors.textDark }]} numberOfLines={2}>
                      {item.employees.map((e) => e.nama_lengkap || e.name || "Pegawai").join(", ")}
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actionRow}>
                  {isTrashMode ? (
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnRestore]}
                      onPress={() => handleRestore(item)}
                      disabled={isProcessingThis}
                    >
                      <Ionicons name="refresh-outline" size={15} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={[styles.btnActionText, { color: "#059669" }]}>Pulihkan</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnEdit]}
                        onPress={() => handleEdit(item)}
                        disabled={isProcessingThis}
                      >
                        <Ionicons name="create-outline" size={15} color="#2563eb" style={{ marginRight: 4 }} />
                        <Text style={[styles.btnActionText, { color: "#2563eb" }]}>Edit</Text>
                      </TouchableOpacity>

                      {item.file_surat_path ? (
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnDownload]}
                          onPress={() => handleDownloadDoc(item)}
                          disabled={isProcessingThis}
                        >
                          <Ionicons name="cloud-download-outline" size={15} color="#0284c7" style={{ marginRight: 4 }} />
                          <Text style={[styles.btnActionText, { color: "#0284c7" }]}>PDF</Text>
                        </TouchableOpacity>
                      ) : null}

                      {item.status === "pending" ? (
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnApprove]}
                          onPress={() => handleApproveDirect(item)}
                          disabled={isProcessingThis}
                        >
                          <Ionicons name="checkmark-circle-outline" size={15} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={[styles.btnActionText, { color: "#059669" }]}>Terbitkan</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnDelete]}
                        onPress={() => handleSoftDelete(item)}
                        disabled={isProcessingThis}
                      >
                        <Ionicons name="trash-outline" size={15} color="#dc2626" style={{ marginRight: 4 }} />
                        <Text style={[styles.btnActionText, { color: "#dc2626" }]}>Hapus</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FabMenu onNavigateToModule={onNavigateToModule || ((key) => navigation && navigation.navigate(key))} />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        iconName={confirmModal.iconName}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Custom Notification Modal */}
      <NotificationModal
        visible={notifModal.visible}
        title={notifModal.title}
        message={notifModal.message}
        variant={notifModal.variant}
        buttonText={notifModal.buttonText || "Saya Mengerti"}
        onClose={() => setNotifModal((prev) => ({ ...prev, visible: false }))}
      />
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  trashToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.button,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  controlCard: {
    padding: 12,
    marginBottom: 16,
    borderRadius: RADIUS.card,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderRadius: RADIUS.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  chipScroll: {
    marginTop: 10,
  },
  chipContainer: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    padding: 30,
    alignItems: "center",
    borderRadius: RADIUS.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: RADIUS.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.input,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  periodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  periodeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  nomorSuratText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  personilContainer: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    padding: 8,
    borderRadius: RADIUS.input,
    marginBottom: 12,
  },
  personilLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  personilNames: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 10,
  },
  btnAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.input,
    borderWidth: 1,
  },
  btnActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  btnEdit: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  btnDownload: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
  },
  btnApprove: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  btnDelete: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  btnRestore: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
});
