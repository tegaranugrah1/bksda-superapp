import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PortalModalViewProps } from "./portalViewTypes";
import { getTonePalette } from "./portalHelpers";
import { formatAssetMerkTipe } from "./portalAssetHelpers";

interface PortalLoansModalProps extends PortalModalViewProps {
  pinjamanModalVisible: boolean;
  setPinjamanModalVisible: (value: boolean) => void;
  activeLoansList: any[];
}

export function PortalLoansModal({
  styles, colors, r, shadowLg,
  pinjamanModalVisible, setPinjamanModalVisible, activeLoansList,
}: PortalLoansModalProps) {
  return (
    <Modal
      visible={pinjamanModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setPinjamanModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setPinjamanModalVisible(false)}
      >
        <View style={[styles.menuModalContent, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, maxHeight: "85%" }, shadowLg]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

          <View style={styles.menuModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuModalTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
              <Text style={[styles.menuModalSubtitle, { color: colors.textMuted }]}>
                Daftar aset BMN operasional dinas yang sedang Anda pinjam
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPinjamanModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
            >
              <Ionicons name="close" size={r.size.iconMd} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: r.size.modalScrollMaxH }} showsVerticalScrollIndicator={false}>
            {activeLoansList.length === 0 ? (
              <View style={styles.emptyServiceContainer}>
                <Ionicons name="checkmark-circle-outline" size={44} color={colors.successFg} />
                <Text style={[styles.emptyServiceTitle, { color: colors.textDark }]}>Tidak Ada Pinjaman Aktif</Text>
                <Text style={[styles.emptyServiceSub, { color: colors.textMuted }]}>
                  Seluruh barang operasional dinas tercatat telah dikembalikan ke pengurus BMN Balai KSDA Kaltim.
                </Text>
              </View>
            ) : (
              <View style={styles.modalListStack}>
                {activeLoansList.map((loan, idx) => {
                  const isLate = String(loan.status || "").toLowerCase().includes("terlambat");
                  const loanPal = getTonePalette(colors, isLate ? "danger" : "info");
                  const loanMerk = formatAssetMerkTipe(loan);
                  return (
                    <View
                      key={loan.id || idx}
                      style={[
                        styles.loanItemCard,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderColor: colors.glassBorder,
                        },
                      ]}
                    >
                      <View style={styles.loanItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.loanItemTitle, { color: colors.textDark }]}>
                            {loan.nama_barang || "Aset BMN"}
                          </Text>
                          {loanMerk !== "-" && (
                            <Text style={[styles.bmnGridSub, { color: colors.textSecondary }]} numberOfLines={2}>
                              {loanMerk}
                            </Text>
                          )}
                          <Text style={[styles.loanItemMeta, { color: colors.textMuted }]}>
                            NUP: {loan.nup || "-"} • Kode: {loan.kode_barang || "-"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.loanStatusBadge,
                            {
                              backgroundColor: loanPal.bg,
                              borderColor: loanPal.border,
                            },
                          ]}
                        >
                          <Text style={[styles.loanStatusText, { color: loanPal.fg }]}>
                            {loan.status?.toUpperCase() || "DIPINJAM"}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.loanDatesRow, { borderTopColor: colors.glassBorder }]}>
                        <View style={styles.loanDateCol}>
                          <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                          <Text style={[styles.loanDateVal, { color: colors.textDark }]}>
                            {loan.loan_date ? String(loan.loan_date).split("T")[0] : "-"}
                          </Text>
                        </View>
                        <View style={styles.loanDateCol}>
                          <Text style={[styles.loanDateLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                          <Text style={[styles.loanDateVal, { color: isLate ? colors.dangerFg : colors.textDark }]}>
                            {loan.due_date ? String(loan.due_date).split("T")[0] : "-"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder, marginTop: 16 }]}
            onPress={() => setPinjamanModalVisible(false)}
          >
            <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
