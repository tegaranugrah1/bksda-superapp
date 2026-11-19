import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getLeaveStatusMeta } from "./portalHelpers";
import type { PortalViewProps } from "./portalViewTypes";
import type { usePortalLeaveActions } from "./usePortalLeaveActions";

interface PortalLeaveCardActionsProps extends
  Pick<PortalViewProps, "styles" | "colors" | "r">,
  Pick<ReturnType<typeof usePortalLeaveActions>,
    "handleOpenLeaveScan" | "setCancelLeaveTarget" | "setCutiPreviewItem" | "setCutiPreviewVisible"> {
  req: any;
  beforeModalOpen?: () => void;
}

export function PortalLeaveCardActions({
  styles, colors, r, req, beforeModalOpen,
  handleOpenLeaveScan, setCancelLeaveTarget, setCutiPreviewItem, setCutiPreviewVisible,
}: PortalLeaveCardActionsProps) {
  const statusMeta = getLeaveStatusMeta(req);
  if (statusMeta.kind === "rejected") {
    return null;
  }

  if (statusMeta.kind === "approved") {
    const hasSuratIzin = Boolean(req.scan_surat_izin_path || req.scan_surat_path);
    const hasFormulir = Boolean(req.scan_formulir_path);

    return (
      <>
        <View style={[styles.leaveCardActions]}>
          <TouchableOpacity
            disabled={!hasSuratIzin}
            style={[
              styles.leavePrintOfficialBtn,
              { backgroundColor: hasSuratIzin ? colors.cardBg : colors.surfaceMuted, borderColor: hasSuratIzin ? colors.borderControl : colors.glassBorder },
            ]}
            onPress={() => {
              beforeModalOpen?.();
              void handleOpenLeaveScan(req, "surat_izin");
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={r.size.iconSm}
              color={hasSuratIzin ? colors.textDark : colors.textMuted}
              style={[styles.inlineIcon]}
            />
            <Text
              style={[
                styles.leavePrintOfficialText,
                { color: hasSuratIzin ? colors.textDark : colors.textMuted },
              ]}
            >
              Surat Izin (Fisik/TTE)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!hasFormulir}
            style={[
              styles.leavePrintOfficialBtn,
              { backgroundColor: hasFormulir ? colors.cardBg : colors.surfaceMuted, borderColor: hasFormulir ? colors.borderControl : colors.glassBorder },
            ]}
            onPress={() => {
              beforeModalOpen?.();
              void handleOpenLeaveScan(req, "formulir");
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text-outline"
              size={r.size.iconSm}
              color={hasFormulir ? colors.textDark : colors.textMuted}
              style={[styles.inlineIcon]}
            />
            <Text
              style={[
                styles.leavePrintOfficialText,
                { color: hasFormulir ? colors.textDark : colors.textMuted },
              ]}
            >
              Formulir Scan
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <View style={[styles.leaveCardActions]}>
      {statusMeta.canCancel && Boolean(req.id) && (
        <TouchableOpacity
          style={[styles.leavePrintOfficialBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
          onPress={() => {
            beforeModalOpen?.();
            setCancelLeaveTarget(req);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={r.size.iconSm} color={colors.dangerFg} style={[styles.inlineIcon]} />
          <Text style={[styles.leavePrintOfficialText, { color: colors.dangerFg }]}>Batalkan</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.leavePrintOfficialBtn, { backgroundColor: colors.cardBg, borderColor: colors.borderControl }]}
        onPress={() => {
          beforeModalOpen?.();
          setCutiPreviewItem(req);
          setCutiPreviewVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="print-outline" size={r.size.iconSm} color={colors.textDark} style={[styles.inlineIcon]} />
        <Text style={[styles.leavePrintOfficialText, { color: colors.textDark }]}>Cetak Formulir Cuti</Text>
      </TouchableOpacity>
    </View>
  );
}
