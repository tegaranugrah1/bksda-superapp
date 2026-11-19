import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PortalModalViewProps } from "./portalViewTypes";

interface PortalSbmModalProps extends PortalModalViewProps {
  sbmModalVisible: boolean;
  setSbmModalVisible: (value: boolean) => void;
}

export function PortalSbmModal({
  styles, colors, r, shadowLg,
  sbmModalVisible, setSbmModalVisible,
}: PortalSbmModalProps) {
  return (
    <Modal
      visible={sbmModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setSbmModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setSbmModalVisible(false)}
      >
        <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

          <View style={styles.menuModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Kalkulator Dinas (SBM)</Text>
              <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                Standar Biaya Masukan PMK Wilayah Kalimantan Timur
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSbmModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            >
              <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.sbmStack}>
            <View style={styles.sbmRow}>
              <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Kota Asal / Penugasan</Text>
              <Text style={[styles.sbmVal, { color: colors.textDark }]}>Samarinda (Kantor Balai)</Text>
            </View>
            <View style={styles.sbmRow}>
              <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Tujuan Dinas</Text>
              <Text style={[styles.sbmVal, { color: colors.textDark }]}>Paser & Balikpapan (3 Hari)</Text>
            </View>
            <View style={[styles.sbmDivider, { backgroundColor: colors.glassBorder }]} />
            <View style={styles.sbmRow}>
              <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Uang Harian (3 × Rp 430.000)</Text>
              <Text style={[styles.sbmVal, { color: colors.textDark }]}>Rp 1.290.000</Text>
            </View>
            <View style={styles.sbmRow}>
              <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Penginapan (2 × Rp 730.000)</Text>
              <Text style={[styles.sbmVal, { color: colors.textDark }]}>Rp 1.460.000</Text>
            </View>
            <View style={styles.sbmRow}>
              <Text style={[styles.sbmLabel, { color: colors.textMuted }]}>Transport Darat PP</Text>
              <Text style={[styles.sbmVal, { color: colors.textDark }]}>Rp 350.000</Text>
            </View>
            <View style={[styles.sbmDivider, { backgroundColor: colors.glassBorder }]} />
            <View style={styles.sbmRow}>
              <Text style={[styles.sbmTotalLabel, { color: colors.textDark }]}>Total Estimasi Biaya</Text>
              <Text style={[styles.sbmTotalVal, { color: colors.accentFg }]}>Rp 3.100.000</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder, marginTop: 16 }]}
            onPress={() => setSbmModalVisible(false)}
          >
            <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup Kalkulator</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
