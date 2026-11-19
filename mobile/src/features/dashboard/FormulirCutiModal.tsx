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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../lib/api/client";
import { PORTAL_5_TOKENS, useTheme, usePortalResponsive, type ResponsivePortalMetrics } from "../../theme/ThemeContext";
import { AppDatePickerModal } from "../../components/AppDatePickerModal";
import type { ApiError, ApiSuccess } from "@/types/api";

interface FormulirCutiModalProps {
  visible: boolean;
  sisaCuti?: number;
  balanceAvailable?: boolean;
  pendingCutiHari?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface PortalLeaveType {
  id: number | string;
  nama: string;
  kode: string;
  hitung_hari: "hari_kerja" | "hari_kalender";
  potong_kuota_tahunan: boolean;
  maks_hari: number | null;
}

const FONT_FAMILY = Platform.select({
  web: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

function formatTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcLeaveDurationDays(
  startStr: string,
  endStr: string,
  isHariKerja: boolean
): number {
  if (!startStr || !endStr) return 0;
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  if (!isHariKerja) {
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  }

  let workingDays = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) workingDays++;
    curr.setDate(curr.getDate() + 1);
  }
  return workingDays;
}

export const FormulirCutiModal: React.FC<FormulirCutiModalProps> = ({
  visible,
  sisaCuti = 0,
  balanceAvailable = true,
  pendingCutiHari = 0,
  onClose,
  onSuccess,
}) => {
  const { isDark, colors } = useTheme();
  const r = usePortalResponsive();
  const styles = React.useMemo(() => createLeaveStyles(r), [r]);
  const shadowLg = PORTAL_5_TOKENS.shadow.lg(isDark);
  const currentYear = new Date().getFullYear();

  const [jenisCuti, setJenisCuti] = useState("");
  const [leaveTypes, setLeaveTypes] = useState<PortalLeaveType[]>([]);
  const [typesStatus, setTypesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [typesError, setTypesError] = useState<string | null>(null);
  const [typesRevision, setTypesRevision] = useState(0);
  const [jenisDropdownOpen, setJenisDropdownOpen] = useState(false);
  const [alasanCuti, setAlasanCuti] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(formatTodayIso);
  const [tanggalSelesai, setTanggalSelesai] = useState(formatTodayIso);
  const [activeDateField, setActiveDateField] = useState<"mulai" | "selesai" | null>(null);
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLock = React.useRef(false);

  React.useEffect(() => {
    if (!visible) return;
    let current = true;
    setTypesStatus("loading");
    setTypesError(null);
    setLeaveTypes([]);
    setJenisDropdownOpen(false);
    void apiClient.get<ApiSuccess<PortalLeaveType[]>>("/me/leave-types").then(response => {
      if (!current) return;
      if (!Array.isArray(response.data.data)) throw new Error("Daftar jenis cuti tidak valid. Silakan muat ulang.");
      const options = response.data.data;
      setLeaveTypes(options);
      setJenisCuti(previous => options.some(option => option.nama === previous)
        ? previous : (options.find(option => option.kode === "CT") || options[0])?.nama || "");
      setTypesStatus("ready");
      if (!options.length) setTypesError("Tidak ada jenis cuti yang tersedia untuk akun ini.");
    }).catch((failure: ApiError) => {
      if (!current) return;
      setTypesStatus("error");
      setTypesError(Object.values(failure.fieldErrors || {}).flat().join("\n") || failure.message || "Jenis cuti belum dapat dimuat. Ketuk pilihan jenis cuti untuk mencoba lagi.");
    });
    return () => { current = false; };
  }, [visible, typesRevision]);

  const selectedLeaveType = leaveTypes.find(option => option.nama === jenisCuti);
  const isHariKerja = selectedLeaveType?.hitung_hari === "hari_kerja";
  const usesAnnualQuota = selectedLeaveType?.potong_kuota_tahunan === true;
  const calculatedDays = calcLeaveDurationDays(tanggalMulai, tanggalSelesai, isHariKerja);

  const handleClose = () => {
    if (submitLock.current) return;
    setJenisDropdownOpen(false);
    setActiveDateField(null);
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;
    if (typesStatus !== "ready" || !selectedLeaveType) {
      setErrorMsg("Pilih jenis cuti yang tersedia terlebih dahulu.");
      return;
    }
    if (usesAnnualQuota && !balanceAvailable) {setErrorMsg("Saldo cuti belum tersedia. Perbarui data lalu coba lagi.");return;}
    if (calculatedDays <= 0) {
      setErrorMsg("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (tanggalMulai.slice(0, 4) !== tanggalSelesai.slice(0, 4)) {
      setErrorMsg("Pengajuan cuti tidak boleh lintas tahun kalender. Silakan ajukan terpisah per tahun.");
      return;
    }
    if (usesAnnualQuota && calculatedDays > sisaCuti) {
      setErrorMsg(
        `Jumlah hari cuti (${calculatedDays} hari) melebihi sisa hak cuti tahunan yang dapat diajukan (${sisaCuti} hari).`
      );
      return;
    }
    if (selectedLeaveType.maks_hari && calculatedDays > selectedLeaveType.maks_hari) {
      setErrorMsg(`Jumlah hari cuti (${calculatedDays} hari) melebihi batas maksimal untuk jenis cuti ${selectedLeaveType.nama} (${selectedLeaveType.maks_hari} hari).`);
      return;
    }
    if (!alasanCuti.trim()) {
      setErrorMsg("Mohon isi alasan permohonan cuti Anda.");
      return;
    }
    if (!alamat.trim()) {
      setErrorMsg("Mohon isi alamat lengkap selama menjalankan cuti.");
      return;
    }

    submitLock.current = true;
    setErrorMsg(null);
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

      if (Platform.OS !== "web") {
        Alert.alert(
          "Berhasil Disimpan",
          "Pengajuan cuti baru Anda telah dikirim ke Admin Kepegawaian BKSDA."
        );
      }
      setAlasanCuti("");
      setAlamat("");
      setTelepon("");
      onSuccess();
      submitLock.current = false;
      handleClose();
    } catch (failure) {
      const error = failure as ApiError;
      setErrorMsg(Object.values(error.fieldErrors || {}).flat().join("\n") || error.message || "Gagal mengirim permohonan cuti.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && (Platform.OS === "web" || !activeDateField)}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
              shadowLg,
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>
                  Formulir Pengajuan Cuti
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  Balai KSDA Kalimantan Timur
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.closeBtn,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder },
                ]}
                disabled={isSubmitting}
                onPress={handleClose}
                accessibilityLabel="Tutup formulir cuti"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Banner Informatif Sisa Cuti Tahunan (Web Portal Parity) */}
              <View
                style={[
                  styles.infoBanner,
                  { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.accentFg} />
                <View style={styles.infoBannerMain}>
                  <Text style={[styles.infoBannerTitle, { color: colors.textDark }]}>
                    {`Sisa Hak Cuti Tahunan (${currentYear})`}
                  </Text>
                  <Text style={[styles.infoBannerSub, { color: colors.textMuted }]}>
                    Sesuai saldo akumulasi PerBKN 24/2017
                  </Text>
                </View>
                <View style={styles.infoBannerRight}>
                  <Text style={[styles.infoBannerValue, { color: colors.accentFg }]}>
                    {balanceAvailable ? `${sisaCuti} Hari` : "Belum tersedia"}
                  </Text>
                  {pendingCutiHari > 0 && (
                    <Text style={[styles.infoBannerPending, { color: colors.warningFg }]}>
                      {`(${pendingCutiHari} hari dalam proses)`}
                    </Text>
                  )}
                </View>
              </View>

              {Boolean(errorMsg || typesError) && (
                <View
                  style={[
                    styles.errorBanner,
                    { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.dangerFg} />
                  <Text style={[styles.errorBannerText, { color: colors.dangerFg }]}>
                    {errorMsg || typesError}
                  </Text>
                </View>
              )}

              {/* 1. Jenis Cuti Dropdown */}
              <Text style={[styles.label, { color: colors.textDark }]}>1. Jenis Cuti</Text>
              <TouchableOpacity
                style={[
                  styles.pickerTrigger,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: jenisDropdownOpen ? colors.accentFg : colors.glassBorder,
                  },
                ]}
                accessibilityLabel="Jenis cuti"
                disabled={typesStatus === "loading" || isSubmitting}
                onPress={() => {
                  if (typesStatus === "error" || !leaveTypes.length) { setTypesRevision(value => value + 1); return; }
                  setJenisDropdownOpen((open) => !open);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerTriggerText, { color: colors.textDark }]} numberOfLines={1}>
                  {typesStatus === "loading" ? "Memuat jenis cuti..." : selectedLeaveType?.nama || "Ketuk untuk memuat ulang jenis cuti"}
                </Text>
                <Ionicons
                  name={jenisDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {/* 2. Rentang Tanggal via AppDatePickerModal */}
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={[styles.label, { color: colors.textDark }]}>2. Tanggal Mulai</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerTrigger,
                      { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                    ]}
                    accessibilityLabel="Tanggal mulai cuti"
                    disabled={isSubmitting}
                    onPress={() => {
                      setJenisDropdownOpen(false);
                      setActiveDateField("mulai");
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.accentFg}
                      style={styles.triggerIcon}
                    />
                    <Text style={[styles.dateText, { color: colors.textDark }]} numberOfLines={1}>
                      {tanggalMulai}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateCol}>
                  <Text style={[styles.label, { color: colors.textDark }]}>3. Tanggal Selesai</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerTrigger,
                      { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                    ]}
                    accessibilityLabel="Tanggal selesai cuti"
                    disabled={isSubmitting}
                    onPress={() => {
                      setJenisDropdownOpen(false);
                      setActiveDateField("selesai");
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.accentFg}
                      style={styles.triggerIcon}
                    />
                    <Text style={[styles.dateText, { color: colors.textDark }]} numberOfLines={1}>
                      {tanggalSelesai}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Indikator Lamanya Cuti (Hari Kerja / Hari Kalender) */}
              <View
                style={[
                  styles.durationBanner,
                  {
                    backgroundColor: calculatedDays > 0 ? colors.infoBg : colors.dangerBg,
                    borderColor: calculatedDays > 0 ? colors.infoBorder : colors.dangerBorder,
                  },
                ]}
              >
                <Text style={[styles.durationLabel, { color: colors.textMuted }]}>
                  {`Lamanya Cuti (${isHariKerja ? "Hari Kerja" : "Hari Kalender"}):`}
                </Text>
                <Text
                  style={[
                    styles.durationValue,
                    { color: calculatedDays > 0 ? colors.infoFg : colors.dangerFg },
                  ]}
                >
                  {calculatedDays > 0
                    ? `${calculatedDays} ${isHariKerja ? "Hari Kerja" : "Hari"}`
                    : "Tanggal tidak valid"}
                </Text>
              </View>

              {/* 4. Alasan Cuti */}
              <Text style={[styles.label, { color: colors.textDark }]}>4. Alasan Cuti</Text>
              <TextInput
                editable={!isSubmitting}
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                    color: colors.textDark,
                  },
                ]}
                multiline
                numberOfLines={3}
                placeholder="Jelaskan alasan permohonan cuti..."
                placeholderTextColor={colors.textMuted}
                value={alasanCuti}
                onChangeText={(val) => {
                  setAlasanCuti(val);
                  if (errorMsg) setErrorMsg(null);
                }}
              />

              {/* 5. Alamat Menjalankan Cuti */}
              <Text style={[styles.label, { color: colors.textDark }]}>
                5. Alamat Menjalankan Cuti
              </Text>
              <TextInput
                editable={!isSubmitting}
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                    color: colors.textDark,
                  },
                ]}
                multiline
                numberOfLines={2}
                placeholder="Alamat lengkap selama menjalankan cuti..."
                placeholderTextColor={colors.textMuted}
                value={alamat}
                onChangeText={(val) => {
                  setAlamat(val);
                  if (errorMsg) setErrorMsg(null);
                }}
              />

              {/* 6. Telepon */}
              <Text style={[styles.label, { color: colors.textDark }]}>
                6. Nomor Telepon / HP
              </Text>
              <TextInput
                editable={!isSubmitting}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                    color: colors.textDark,
                  },
                ]}
                placeholder="Contoh: 081234567890"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={telepon}
                onChangeText={setTelepon}
              />

              <View style={styles.scrollBottomSpacer} />
            </ScrollView>

            {/* Footer Actions */}
            <View
              style={[
                styles.footer,
                { backgroundColor: colors.cardBg, borderTopColor: colors.glassBorder },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder },
                ]}
                disabled={isSubmitting}
                onPress={handleClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.accentSolid },
                  isSubmitting && styles.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || typesStatus !== "ready" || !selectedLeaveType}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.accentOnSolid} />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane-outline"
                      size={16}
                      color={colors.accentOnSolid}
                      style={styles.triggerIcon}
                    />
                    <Text style={[styles.submitBtnText, { color: colors.accentOnSolid }]}>
                      Kirim Pengajuan
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Floating Jenis Cuti Dropdown Overlay (keeps sheet height constant) */}
          {jenisDropdownOpen && (
            <View style={styles.dropdownOverlay}>
              <TouchableOpacity
                style={styles.dropdownBackdrop}
                activeOpacity={1}
                onPress={() => setJenisDropdownOpen(false)}
              />
              <View
                style={[
                  styles.dropdownCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  shadowLg,
                ]}
              >
                <View style={[styles.dropdownHeader, { borderBottomColor: colors.glassBorder }]}>
                  <Text style={[styles.dropdownTitle, { color: colors.textDark }]}>
                    Pilih Jenis Cuti
                  </Text>
                  <TouchableOpacity onPress={() => setJenisDropdownOpen(false)}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: r.height * 0.55 }} keyboardShouldPersistTaps="handled">
                {leaveTypes.map((option, idx) => {
                  const selected = jenisCuti === option.nama;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownItem,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.glassBorder },
                        selected && { backgroundColor: colors.accentSoft },
                      ]}
                      onPress={() => {
                        setJenisCuti(option.nama);
                        setErrorMsg(null);
                        setJenisDropdownOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: selected ? colors.accentFg : colors.textDark },
                          selected && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {option.nama}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={16} color={colors.accentFg} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <AppDatePickerModal
        visible={Boolean(activeDateField)}
        value={activeDateField === "selesai" ? tanggalSelesai : tanggalMulai}
        title={activeDateField === "selesai" ? "Pilih Tanggal Selesai" : "Pilih Tanggal Mulai"}
        onConfirm={(picked) => {
          setErrorMsg(null);
          if (activeDateField === "mulai") {
            setTanggalMulai(picked);
            if (picked > tanggalSelesai) setTanggalSelesai(picked);
          } else if (activeDateField === "selesai") {
            setTanggalSelesai(picked);
          }
          setActiveDateField(null);
        }}
        onClose={() => setActiveDateField(null)}
      />
    </>
  );
};

function createLeaveStyles(r: ResponsivePortalMetrics) {
  const T = r.type;
  const S = r.space;
  const R = r.radius;

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      width: "100%",
      maxWidth: r.size.maxContentWidth,
      alignSelf: "center",
      borderTopLeftRadius: R.card,
      borderTopRightRadius: R.card,
      borderWidth: 1,
      borderBottomWidth: 0,
      maxHeight: "90%",
    },
    sheetHandle: {
      width: 44,
      height: S.x1,
      borderRadius: R.bar,
      alignSelf: "center",
      marginTop: S.x3,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: S.x4,
      paddingTop: S.x3,
      paddingBottom: S.x3,
      borderBottomWidth: 1,
      gap: S.x2,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xl,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    headerSubtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      marginTop: S.x1,
    },
    closeBtn: {
      width: 48,
      height: 48,
      borderRadius: R.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    formScroll: {
      paddingHorizontal: S.x4,
      paddingTop: S.x4,
    },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: R.inner,
      padding: S.x3,
      marginBottom: S.x2,
      gap: S.x2,
    },
    infoBannerMain: {
      flex: 1,
    },
    infoBannerTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    infoBannerSub: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      marginTop: S.x1,
    },
    infoBannerRight: {
      alignItems: "flex-end",
    },
    infoBannerValue: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xl,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    infoBannerPending: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    durationBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: R.inner,
      paddingHorizontal: S.x3,
      paddingVertical: S.x2,
      marginTop: S.x2,
      gap: S.x2,
    },
    durationLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      fontWeight: "500",
    },
    durationValue: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: R.inner,
      padding: S.x3,
      marginBottom: S.x2,
      gap: S.x2,
    },
    errorBannerText: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      fontWeight: "600",
      flex: 1,
    },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: T.xs,
      fontWeight: "700",
      marginTop: S.x3,
      marginBottom: S.x2,
    },
    pickerTrigger: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: R.inner,
      paddingHorizontal: S.x3,
      paddingVertical: S.x3,
    },
    pickerTriggerText: {
      fontFamily: FONT_FAMILY,
      fontSize: T.sm,
      fontWeight: "500",
      flex: 1,
      marginRight: S.x2,
    },
    triggerIcon: {
      marginRight: S.x2,
    },
    dropdownOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "center",
      paddingHorizontal: S.x4,
      zIndex: 20,
    },
    dropdownBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(15, 23, 42, 0.35)",
    },
    dropdownCard: {
      width: "100%",
      maxWidth: r.size.maxContentWidth,
      alignSelf: "center",
      borderWidth: 1,
      borderRadius: R.card,
      overflow: "hidden",
    },
    dropdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: S.x4,
      paddingVertical: S.x3,
      borderBottomWidth: 1,
    },
    dropdownTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: T.sm,
      fontWeight: "700",
    },
    dropdownItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: S.x3,
      paddingVertical: S.x3,
    },
    dropdownItemText: {
      fontFamily: FONT_FAMILY,
      fontSize: T.sm,
      fontWeight: "500",
      flex: 1,
    },
    dropdownItemTextSelected: {
      fontWeight: "700",
    },
    dateRow: {
      flexDirection: r.isExtraNarrow ? "column" : "row",
      gap: S.x3,
    },
    dateCol: {
      flex: 1,
    },
    dateText: {
      fontFamily: FONT_FAMILY,
      fontSize: T.sm,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      flex: 1,
    },
    input: {
      fontFamily: FONT_FAMILY,
      borderWidth: 1,
      borderRadius: R.inner,
      paddingHorizontal: S.x3,
      paddingVertical: S.x3,
      fontSize: T.sm,
    },
    multilineInput: {
      textAlignVertical: "top",
      minHeight: 72,
    },
    scrollBottomSpacer: {
      height: S.x6,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: S.x3,
      paddingHorizontal: S.x4,
      paddingVertical: S.x3,
      borderTopWidth: 1,
    },
    cancelBtn: {
      minHeight: 48,
      paddingVertical: S.x3,
      paddingHorizontal: S.x4,
      borderRadius: R.inner,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelBtnText: {
      fontFamily: FONT_FAMILY,
      fontSize: T.sm,
      fontWeight: "600",
    },
    submitBtn: {
      minHeight: 48,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: S.x3,
      paddingHorizontal: S.x4,
      borderRadius: R.inner,
    },
    submitBtnText: {
      flexShrink: 1,
      fontFamily: FONT_FAMILY,
      fontSize: T.sm,
      fontWeight: "700",
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}
