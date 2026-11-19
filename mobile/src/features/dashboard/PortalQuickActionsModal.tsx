import React from "react";
import { Modal, View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PortalModalViewProps } from "./portalViewTypes";

interface PortalQuickActionsModalProps extends PortalModalViewProps {
  fabModalVisible: boolean;
  setFabModalVisible: (value: boolean) => void;
  pendingAssignmentNavigation: React.RefObject<boolean>;
  setCutiModalVisible: (value: boolean) => void;
  resolvedSisaCuti: number | null;
  onNavigateToModule?: (moduleKey: string) => void;
}

export function PortalQuickActionsModal({
  styles, colors, r, shadowLg,
  fabModalVisible, setFabModalVisible, pendingAssignmentNavigation, setCutiModalVisible,
  resolvedSisaCuti, onNavigateToModule,
}: PortalQuickActionsModalProps) {
  return (
    <Modal
      visible={fabModalVisible}
      transparent={true}
      animationType="slide"
      onDismiss={() => {
        if (!pendingAssignmentNavigation.current) return;
        pendingAssignmentNavigation.current = false;
        // Let the web modal restore focus before the portal tab is hidden.
        if (Platform.OS === "web") (document.activeElement as HTMLElement | null)?.blur();
        onNavigateToModule?.("buat-surat-tugas");
      }}
      onRequestClose={() => setFabModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setFabModalVisible(false)}
      >
        <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

          <View style={styles.menuModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Buat Pengajuan Baru</Text>
              <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                Pilih jenis formulir kedinasan yang ingin Anda buat
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setFabModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            >
              <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Option 1: Buat Surat Tugas (SPT) Baru */}
          <TouchableOpacity
            style={[styles.modalOptionCard, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}
            activeOpacity={0.8}
            onPress={() => {
              pendingAssignmentNavigation.current = Platform.OS === "web";
              setFabModalVisible(false);
              if (Platform.OS !== "web") onNavigateToModule?.("buat-surat-tugas");
            }}
          >
            <View style={[styles.modalOptionIconBg, { backgroundColor: colors.accentSolid }]}>
              <Ionicons name="document-text" size={r.size.iconLg} color={colors.accentOnSolid} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalOptionTitle, { color: colors.textDark }]}>Buat Surat Tugas (SPT) Baru</Text>
              <Text style={[styles.modalOptionDesc, { color: colors.textMuted }]}>
                Ajukan penugasan dinas resmi, rute tujuan, jadwal pelaksanaan, dan pembebanan anggaran DIPA.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.accentFg} />
          </TouchableOpacity>

          {/* Option 2: Pengajuan Cuti Online */}
          <TouchableOpacity
            style={[styles.modalOptionCard, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}
            activeOpacity={0.8}
            onPress={() => {
              setFabModalVisible(false);
              setCutiModalVisible(true);
            }}
          >
            <View style={[styles.modalOptionIconBg, { backgroundColor: colors.warningFg }]}>
              <Ionicons name="calendar" size={r.size.iconLg} color={colors.accentOnSolid} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalOptionTitle, { color: colors.textDark }]}>Pengajuan Cuti Online</Text>
              <Text style={[styles.modalOptionDesc, { color: colors.textMuted }]}>
                Cuti tahunan, sakit, melahirkan, atau alasan penting. Kuota Anda saat ini: {resolvedSisaCuti ?? "—"} Hari Kerja.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.warningFg} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            onPress={() => setFabModalVisible(false)}
          >
            <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup Menu</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
