import React from "react";
import { Modal, View, Text, TouchableOpacity, Platform, Image, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { openFile } from "@/lib/files/share";
import { formatDateIndo } from "./portalHelpers";
import type { PortalModalViewProps, PortalLeaveScanState } from "./portalViewTypes";

interface PortalLeaveCancelModalProps extends PortalModalViewProps {
  cancelLeaveTarget: any;
  isCancellingLeave: boolean;
  setCancelLeaveTarget: (value: any) => void;
  handleConfirmCancelLeave: () => Promise<void>;
}

export function PortalLeaveCancelModal({
  styles, colors, r, shadowLg,
  cancelLeaveTarget, isCancellingLeave, setCancelLeaveTarget, handleConfirmCancelLeave,
}: PortalLeaveCancelModalProps) {
  return (
    <Modal
      visible={Boolean(cancelLeaveTarget)}
      transparent={true}
      animationType="fade"
      onRequestClose={() => !isCancellingLeave && setCancelLeaveTarget(null)}
    >
      <View style={styles.modalOverlayCenter}>
        <View style={[styles.confirmModalCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
          <View style={[styles.confirmIconWrap, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
            <Ionicons name="alert-circle-outline" size={r.size.iconXl} color={colors.dangerFg} />
          </View>
          <Text style={[styles.confirmModalTitle, { color: colors.textDark }]}>
            Batalkan Pengajuan Cuti?
          </Text>
          <Text style={[styles.confirmModalDesc, { color: colors.textMuted }]}>
            {cancelLeaveTarget
              ? `Permohonan ${cancelLeaveTarget.jenis_cuti || "Cuti"} (${formatDateIndo(cancelLeaveTarget.tanggal_mulai)} s/d ${formatDateIndo(cancelLeaveTarget.tanggal_selesai)}) akan dihapus dari daftar pengajuan.`
              : ""}
          </Text>
          <View style={styles.confirmModalActions}>
            <TouchableOpacity
              disabled={isCancellingLeave}
              style={[styles.confirmModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
              onPress={() => setCancelLeaveTarget(null)}
            >
              <Text style={[styles.confirmModalBtnText, { color: colors.textSecondary }]}>Kembali</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isCancellingLeave}
              style={[styles.confirmModalBtn, { backgroundColor: colors.dangerSolid, borderColor: colors.dangerSolid }]}
              onPress={() => void handleConfirmCancelLeave()}
            >
              <Text style={[styles.confirmModalBtnText, { color: colors.accentOnSolid }]}>
                {isCancellingLeave ? "Membatalkan..." : "Ya, Batalkan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface PortalLeaveScanModalProps extends PortalModalViewProps {
  leaveScanModal: PortalLeaveScanState;
  closeLeaveScanModal: () => void;
}

export function PortalLeaveScanModal({
  styles, colors, r, shadowLg,
  leaveScanModal, closeLeaveScanModal,
}: PortalLeaveScanModalProps) {
  return (
    <Modal
      visible={leaveScanModal.visible}
      transparent={true}
      animationType="slide"
      onRequestClose={closeLeaveScanModal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.scanModalSheet, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />
          <View style={styles.menuModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuModalTitle, { color: colors.textDark }]} numberOfLines={1}>
                {leaveScanModal.title}
              </Text>
              {leaveScanModal.fileName && (
                <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {leaveScanModal.fileName}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={closeLeaveScanModal}
              accessibilityLabel="Tutup pratinjau berkas cuti"
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            >
              <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.scanModalBody, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
            {leaveScanModal.loading ? (
              <View style={styles.scanModalCenter}>
                <ActivityIndicator size="large" color={colors.accentFg} />
                <Text style={[styles.scanStatusText, { color: colors.textMuted }]}>
                  Memuat berkas scan resmi...
                </Text>
              </View>
            ) : leaveScanModal.error ? (
              <View style={styles.scanModalCenter}>
                <Ionicons name="document-outline" size={r.size.iconEmpty} color={colors.warningFg} />
                <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Berkas Belum Tersedia</Text>
                <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>{leaveScanModal.error}</Text>
              </View>
            ) : leaveScanModal.mimeType?.includes("image") && leaveScanModal.dataUrl ? (
              <Image
                source={{ uri: leaveScanModal.dataUrl }}
                style={styles.scanPreviewImg}
                resizeMode="contain"
              />
            ) : Platform.OS === "web" && leaveScanModal.blobUrl ? (
              React.createElement("iframe", {
                src: leaveScanModal.blobUrl,
                title: leaveScanModal.title,
                style: { width: "100%", height: "100%", border: "none", borderRadius: r.radius.inner },
              })
            ) : (
              <View style={styles.scanModalCenter}>
                <Ionicons name="document-text-outline" size={r.size.iconEmpty} color={colors.accentFg} />
                <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Dokumen PDF Siap Dibuka</Text>
                <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
                  Ketuk tombol di bawah untuk membuka atau menyimpan berkas scan.
                </Text>
                {leaveScanModal.dataUrl && (
                  <TouchableOpacity
                    style={[styles.scanOpenNativeBtn, { backgroundColor: colors.accentSolid }]}
                    onPress={async () => {
                      try {
                        const base64Body = String(leaveScanModal.dataUrl || "").split(",")[1];
                        const dir = FileSystem.cacheDirectory;
                        if (!base64Body || !dir) return;
                        const safeName = (leaveScanModal.fileName || "scan-cuti.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
                        const localUri = `${dir}${safeName}`;
                        await FileSystem.writeAsStringAsync(localUri, base64Body, {
                          encoding: FileSystem.EncodingType.Base64,
                        });
                        await openFile({
                          localUri,
                          mimeType: leaveScanModal.mimeType || "application/pdf",
                          dialogTitle: leaveScanModal.title,
                        });
                      } catch {
                        Alert.alert("Gagal", "Tidak dapat membuka berkas pada perangkat.");
                      }
                    }}
                  >
                    <Ionicons name="open-outline" size={r.size.iconMd} color={colors.accentOnSolid} style={styles.inlineIcon} />
                    <Text style={[styles.leavePrintOfficialText, { color: colors.accentOnSolid }]}>Buka Berkas PDF</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {Platform.OS === "web" && leaveScanModal.blobUrl && typeof document !== "undefined" && (
            <TouchableOpacity
              style={[styles.scanOpenNativeBtn, { backgroundColor: colors.accentSolid }]}
              onPress={() => {
                const a = document.createElement("a");
                a.href = leaveScanModal.blobUrl!;
                a.download = leaveScanModal.fileName || "Dokumen_Cuti.pdf";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              <Ionicons name="download-outline" size={r.size.iconMd} color={colors.accentOnSolid} style={styles.inlineIcon} />
              <Text style={[styles.leavePrintOfficialText, { color: colors.accentOnSolid }]}>Unduh Berkas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
