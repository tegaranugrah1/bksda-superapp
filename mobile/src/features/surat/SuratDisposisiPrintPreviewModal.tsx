import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { COLORS, RADIUS } from "../../theme";
import { EmeraldButton } from "../../components/ui/EmeraldButton";

interface PrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  suratData: {
    noAgenda: string;
    noSurat: string;
    tanggalSurat: string;
    terimaAgenda: string;
    asalSurat: string;
    lampiran: string;
    perihal: string;
    sifat: string;
    catatan: string;
    diteruskanList: string[];
  };
}

export const SuratDisposisiPrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  visible,
  onClose,
  suratData,
}) => {
  const [printMode, setPrintMode] = useState<"1-up" | "2-up">("1-up");
  const [upPosition, setUpPosition] = useState<"kiri" | "kanan">("kiri");

  const handlePrint = () => {
    Alert.alert(
      "Mencetak Dokumen",
      `Mengirim Lembar Disposisi Agenda #${suratData.noAgenda} (Mode: ${printMode.toUpperCase()}, Posisi: ${upPosition.toUpperCase()}) ke printer...`,
      [{ text: "OK", onPress: onClose }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        {/* Top Control Bar */}
        <View style={styles.controlBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.controlTitle}>Preview Cetak Lembar Disposisi</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Print Position Toggles */}
        <View style={styles.toggleRow}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, printMode === "1-up" && styles.toggleBtnActive]}
              onPress={() => setPrintMode("1-up")}
            >
              <Text style={[styles.toggleText, printMode === "1-up" && styles.toggleTextActive]}>
                Cetak 1-Up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, printMode === "2-up" && styles.toggleBtnActive]}
              onPress={() => setPrintMode("2-up")}
            >
              <Text style={[styles.toggleText, printMode === "2-up" && styles.toggleTextActive]}>
                Cetak 2-Up (Side-by-side)
              </Text>
            </TouchableOpacity>
          </View>

          {printMode === "1-up" && (
            <View style={styles.posToggle}>
              <TouchableOpacity
                style={[styles.posBtn, upPosition === "kiri" && styles.posBtnActive]}
                onPress={() => setUpPosition("kiri")}
              >
                <Text style={[styles.posText, upPosition === "kiri" && styles.posTextActive]}>
                  ⬅️ Kiri
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.posBtn, upPosition === "kanan" && styles.posBtnActive]}
                onPress={() => setUpPosition("kanan")}
              >
                <Text style={[styles.posText, upPosition === "kanan" && styles.posTextActive]}>
                  Kanan ➡️
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Official BKSDA Sheet Render (White Paper Canvas) */}
        <ScrollView contentContainerStyle={styles.canvasContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetPaper}>
            {/* Header Instansi */}
            <View style={styles.sheetHeader}>
              <Text style={styles.kemenhutTitle}>KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN</Text>
              <Text style={styles.direktoratTitle}>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</Text>
              <Text style={styles.bksdaTitle}>BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</Text>
            </View>

            {/* Document Title */}
            <View style={styles.titleBox}>
              <Text style={styles.documentTitle}>LEMBAR DISPOSISI</Text>
            </View>

            {/* Agenda & Sifat Grid */}
            <View style={styles.gridRow}>
              <View style={[styles.gridCell, { flex: 1.2 }]}>
                <Text style={styles.cellLabel}>Surat dari: <Text style={styles.cellValueBold}>{suratData.asalSurat}</Text></Text>
                <Text style={styles.cellLabel}>No. Surat: <Text style={styles.cellValue}>{suratData.noSurat}</Text></Text>
                <Text style={styles.cellLabel}>Tgl. Surat: <Text style={styles.cellValue}>{suratData.tanggalSurat}</Text></Text>
              </View>

              <View style={[styles.gridCell, { flex: 1, borderLeftWidth: 1, borderColor: "#000" }]}>
                <Text style={styles.cellLabel}>Diterima Tgl: <Text style={styles.cellValue}>{suratData.terimaAgenda}</Text></Text>
                <Text style={styles.cellLabel}>No. Agenda: <Text style={styles.cellValueBold}>{suratData.noAgenda}</Text></Text>
                <Text style={styles.cellLabel}>Sifat: <Text style={styles.cellValueBold}>{suratData.sifat}</Text></Text>
              </View>
            </View>

            {/* Perihal Box */}
            <View style={styles.perihalBox}>
              <Text style={styles.cellLabel}>Hal / Perihal:</Text>
              <Text style={styles.perihalText}>{suratData.perihal}</Text>
            </View>

            {/* Recipients & Instructions 2-Column Split */}
            <View style={styles.splitRow}>
              {/* Left Column: Diteruskan Kepada Yth */}
              <View style={[styles.splitCol, { flex: 1.1, borderRightWidth: 1, borderColor: "#000" }]}>
                <Text style={styles.columnHeader}>DITERUSKAN KEPADA YTH:</Text>
                {suratData.diteruskanList.map((item, idx) => (
                  <View key={idx} style={styles.recipientRowItem}>
                    <View style={styles.printCheckbox} />
                    <Text style={styles.recipientTextItem}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* Right Column: Petunjuk / Catatan */}
              <View style={[styles.splitCol, { flex: 0.9 }]}>
                <Text style={styles.columnHeader}>DISPOSISI / CATATAN:</Text>
                <Text style={styles.catatanContentText}>{suratData.catatan || "Harap ditindaklanjuti."}</Text>

                <View style={styles.signatureBox}>
                  <Text style={styles.sigRole}>Ka Sub Bag TU,</Text>
                  <View style={{ height: 40 }} />
                  <Text style={styles.sigName}>Drs. Ahmad Subagja, M.Si.</Text>
                  <Text style={styles.sigNip}>NIP. 19850412 201012 1 002</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Print Action Bar */}
        <View style={styles.bottomBar}>
          <EmeraldButton
            title="🖨️ CETAK LEMBAR DISPOSISI"
            onPress={handlePrint}
            style={styles.printBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "rgba(15, 41, 30, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  closeBtn: {
    padding: 6,
  },
  closeIcon: {
    color: COLORS.textWhite,
    fontSize: 20,
  },
  controlTitle: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: "700",
  },
  toggleRow: {
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    gap: 8,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(6, 26, 18, 0.7)",
    borderRadius: RADIUS.pill,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: RADIUS.pill,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.emeraldElectric,
  },
  toggleText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: COLORS.textDark,
    fontWeight: "800",
  },
  posToggle: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  posBtn: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  posBtnActive: {
    borderColor: COLORS.emeraldElectric,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  posText: {
    color: COLORS.textMint,
    fontSize: 11.5,
  },
  posTextActive: {
    color: COLORS.emeraldElectric,
    fontWeight: "700",
  },
  canvasContainer: {
    padding: 16,
    alignItems: "center",
  },
  sheetPaper: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#000000",
    padding: 14,
  },
  sheetHeader: {
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 8,
  },
  kemenhutTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#000000",
    textAlign: "center",
  },
  direktoratTitle: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginTop: 2,
  },
  bksdaTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginTop: 2,
  },
  titleBox: {
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingVertical: 4,
    marginBottom: 6,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 1,
  },
  gridRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 6,
  },
  gridCell: {
    padding: 6,
  },
  cellLabel: {
    fontSize: 10,
    color: "#000000",
    marginBottom: 2,
  },
  cellValue: {
    fontWeight: "600",
    color: "#000000",
  },
  cellValueBold: {
    fontWeight: "800",
    color: "#000000",
  },
  perihalBox: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
    marginBottom: 6,
  },
  perihalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000000",
    marginTop: 2,
  },
  splitRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    minHeight: 220,
  },
  splitCol: {
    padding: 6,
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 4,
    marginBottom: 6,
  },
  recipientRowItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  printCheckbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: "#000000",
    marginRight: 6,
  },
  recipientTextItem: {
    fontSize: 9.5,
    color: "#000000",
    fontWeight: "500",
  },
  catatanContentText: {
    fontSize: 10.5,
    color: "#000000",
    fontStyle: "italic",
    marginBottom: 16,
  },
  signatureBox: {
    marginTop: "auto",
    alignItems: "flex-end",
  },
  sigRole: {
    fontSize: 9.5,
    color: "#000000",
    fontWeight: "700",
  },
  sigName: {
    fontSize: 10,
    fontWeight: "800",
    color: "#000000",
    textDecorationLine: "underline",
  },
  sigNip: {
    fontSize: 8.5,
    color: "#000000",
  },
  bottomBar: {
    padding: 16,
    backgroundColor: "rgba(15, 41, 30, 0.95)",
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  printBtn: {
    height: 48,
  },
});
