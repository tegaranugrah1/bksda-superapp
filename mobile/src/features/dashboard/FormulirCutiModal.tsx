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
import { PORTAL_5_TOKENS, useTheme } from "../../theme/ThemeContext";
import { AppDatePickerModal } from "../../components/AppDatePickerModal";

interface FormulirCutiModalProps {
  visible: boolean;
  sisaCuti?: number;
  pendingCutiHari?: number;
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

const T = PORTAL_5_TOKENS.type;
const S = PORTAL_5_TOKENS.space;
const R = PORTAL_5_TOKENS.radius;
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
  sisaCuti = 12,
  pendingCutiHari = 0,
  onClose,
  onSuccess,
}) => {
  const { isDark, colors } = useTheme();
  const shadowLg = PORTAL_5_TOKENS.shadow.lg(isDark);
  const currentYear = new Date().getFullYear();

  const [jenisCuti, setJenisCuti] = useState("Cuti Tahunan");
  const [jenisDropdownOpen, setJenisDropdownOpen] = useState(false);
  const [alasanCuti, setAlasanCuti] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(formatTodayIso);
  const [tanggalSelesai, setTanggalSelesai] = useState(formatTodayIso);
  const [activeDateField, setActiveDateField] = useState<"mulai" | "selesai" | null>(null);
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isHariKerja = jenisCuti.toLowerCase().includes("tahunan");
  const calculatedDays = calcLeaveDurationDays(tanggalMulai, tanggalSelesai, isHariKerja);

  const handleClose = () => {
    setJenisDropdownOpen(false);
    setActiveDateField(null);
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (calculatedDays <= 0) {
      setErrorMsg("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (tanggalMulai.slice(0, 4) !== tanggalSelesai.slice(0, 4)) {
      setErrorMsg("Pengajuan cuti tidak boleh lintas tahun kalender. Silakan ajukan terpisah per tahun.");
      return;
    }
    if (isHariKerja && calculatedDays > sisaCuti) {
      setErrorMsg(
        `Jumlah hari cuti (${calculatedDays} hari) melebihi sisa hak cuti tahunan yang dapat diajukan (${sisaCuti} hari).`
      );
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
      handleClose();
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Gagal mengirim permohonan cuti."
      );
    } finally {
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
                onPress={handleClose}
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
                    {`${sisaCuti} Hari`}
                  </Text>
                  {pendingCutiHari > 0 && (
                    <Text style={[styles.infoBannerPending, { color: colors.warningFg }]}>
                      {`(${pendingCutiHari} hari dalam proses)`}
                    </Text>
                  )}
                </View>
              </View>

              {Boolean(errorMsg) && (
                <View
                  style={[
                    styles.errorBanner,
                    { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.dangerFg} />
                  <Text style={[styles.errorBannerText, { color: colors.dangerFg }]}>
                    {errorMsg}
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
                onPress={() => setJenisDropdownOpen((open) => !open)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerTriggerText, { color: colors.textDark }]} numberOfLines={1}>
                  {jenisCuti}
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
                disabled={isSubmitting}
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
                {JENIS_CUTI_OPTIONS.map((option, idx) => {
                  const selected = jenisCuti === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.glassBorder },
                        selected && { backgroundColor: colors.accentSoft },
                      ]}
                      onPress={() => {
                        setJenisCuti(option);
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
                        {option}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={16} color={colors.accentFg} />
                      )}
                    </TouchableOpacity>
                  );
                })}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
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
    width: S.x8,
    height: S.x8,
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
    flexDirection: "row",
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.x3,
    paddingHorizontal: S.x4,
    borderRadius: R.inner,
  },
  submitBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: T.sm,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
