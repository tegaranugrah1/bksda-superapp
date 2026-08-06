import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { downloadAssignmentFile } from "@/lib/files/download";
import { openFile } from "@/lib/files/share";
import { HEADER_NEW_BASE64 } from "@/assets/headerNewBase64";

export interface PratinjauSuratTugasItem {
  id: string | number;
  nomor_surat?: string | null;
  nomor?: string | null;
  kode_surat?: string | null;
  maksud_tujuan?: string | null;
  kegiatan?: string | null;
  tempat_tujuan?: string | null;
  tujuan?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tanggal_surat?: string | null;
  sumber_dana?: string | null;
  status?: string | null;
  nama_plh?: string | null;
  penandatangan_nama?: string | null;
  penandatangan_nip?: string | null;
  menimbang?: any;
  dasar?: any;
  tembusan?: any;
  employees?: {
    id?: string | number;
    nama_lengkap?: string;
    name?: string;
    nip?: string;
    jabatan?: string;
  }[];
  personel?: {
    id?: string | number;
    nama_lengkap?: string;
    name?: string;
    nip?: string;
    jabatan?: string;
  }[];
}

interface PratinjauSuratTugasModalProps {
  visible: boolean;
  data: PratinjauSuratTugasItem | null;
  onClose: () => void;
}

function formatDateIndonesian(dateStr: string | null | undefined): string {
  if (!dateStr) return "...";
  try {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const cleaned = String(dateStr).split("T")[0].trim();
    const parts = cleaned.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr || "...";
  }
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  try {
    const s = new Date(start.split("T")[0] + "T00:00:00");
    const e = new Date(end.split("T")[0] + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

function numberToWords(n: number): string {
  const ones = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 12) return ones[n] || String(n);
  if (n < 20) return numberToWords(n - 10) + ' belas';
  if (n < 100) {
    const div = Math.floor(n / 10);
    const rem = n % 10;
    return (div === 1 ? 'sepuluh' : (ones[div] || String(div)) + ' puluh') + (rem > 0 ? ' ' + (ones[rem] || String(rem)) : '');
  }
  return String(n);
}

function formatNIP(nip: string | null | undefined): string {
  if (!nip) return "19740514 199903 1 001";
  const cleaned = nip.replace(/\s/g, "");
  if (cleaned.length !== 18) return nip;
  return `${cleaned.substring(0, 8)} ${cleaned.substring(8, 14)} ${cleaned.substring(14, 15)} ${cleaned.substring(15)}`;
}

function indexToLetter(index: number): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  if (index < letters.length) return `${letters[index]}.`;
  return `${index + 1}.`;
}

function parseItems(value: any): Array<{ id: string; text: string }> {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => {
          if (typeof item === "string") return { id: String(idx), text: item };
          return { id: item.id || String(idx), text: item.text || String(item) };
        });
      }
    } catch {
      return value.split(";").filter((s) => s.trim()).map((s, idx) => ({ id: String(idx), text: s.trim() }));
    }
  }
  if (Array.isArray(value)) {
    return value.map((item, idx) => {
      if (typeof item === "string") return { id: String(idx), text: item };
      return { id: item.id || String(idx), text: item.text || String(item) };
    });
  }
  return [];
}

function parseTembusan(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : (v.text || String(v))).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(v => typeof v === 'string' ? v : (v.text || String(v))).filter(Boolean);
    } catch {
      return value.split("\n").map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function buildSuratTugasHtml(data: PratinjauSuratTugasItem): string {
  const nomorSurat = data.nomor_surat || data.nomor || "ST.1/K.18/TU/KSA.05.06/B/07/2026";
  const kegiatanText = data.maksud_tujuan || data.kegiatan || "Melaksanakan Perjalanan Dinas...";
  const tempatText = data.tempat_tujuan || data.tujuan || "Balikpapan";
  const tglMulai = data.tanggal_mulai || "2026-07-28";
  const tglSelesai = data.tanggal_selesai || "2026-07-29";
  const tglSurat = data.tanggal_surat || tglMulai;
  const danaText = data.sumber_dana
    ? `DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran 2026`
    : `DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran 2026`;
  
  const menimbangItems = parseItems(data.menimbang);
  const dasarItems = parseItems(data.dasar);
  const tembusanItems = parseTembusan(data.tembusan);

  const penandatanganNama = (data as any).penandatangan_nama || (data as any).approver?.name || data.nama_plh || "M. Ari Wibawanto, S.Hut., M.Sc.";
  const penandatanganNip = (data as any).penandatangan_nip || (data as any).approver?.nip || "197405141999031001";

  const hasDuration = /selama\s+\d+|terhitung\s+mulai\s+tanggal|pada\s+tanggal/i.test(kegiatanText);
  const isSingleDay = Boolean(tglMulai && tglSelesai && tglMulai === tglSelesai);
  const days = daysBetween(tglMulai, tglSelesai);

  let firstUntukLine = kegiatanText;
  if (!hasDuration && !kegiatanText.endsWith(";")) {
    if (tempatText && !kegiatanText.includes(tempatText)) {
      firstUntukLine += `, dari Samarinda ke ${tempatText}`;
    }
    if (isSingleDay) {
      firstUntukLine += `, selama 1 (satu) hari pada tanggal ${formatDateIndonesian(tglMulai)};`;
    } else if (days > 1) {
      firstUntukLine += `, selama ${days} (${numberToWords(days)}) hari terhitung mulai tanggal ${formatDateIndonesian(tglMulai)} sampai dengan ${formatDateIndonesian(tglSelesai)};`;
    } else {
      firstUntukLine += `;`;
    }
  }

  const menimbangRowsHtml = menimbangItems.length > 0
    ? menimbangItems.map((m, idx) => `
        <tr>
          <td style="width: 24px; vertical-align: top; padding: ${idx === 0 ? '0' : '4px 0 0'};">${indexToLetter(idx)}</td>
          <td style="vertical-align: top; padding: ${idx === 0 ? '0' : '4px 0 0'}; text-align: justify;">${m.text || '...'}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td style="width: 24px; vertical-align: top;">a.</td>
          <td style="vertical-align: top; text-align: justify;">bahwa dalam rangka , perlu ;</td>
        </tr>
        <tr>
          <td style="vertical-align: top; padding-top: 4px;">b.</td>
          <td style="vertical-align: top; padding-top: 4px; text-align: justify;">bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud.</td>
        </tr>
      `;

  const dasarRowsHtml = dasarItems.length > 0
    ? dasarItems.map((d, idx) => `
        <tr>
          <td style="width: 24px; vertical-align: top; padding: ${idx === 0 ? '0' : '4px 0 0'};">${idx + 1}.</td>
          <td style="vertical-align: top; padding: ${idx === 0 ? '0' : '4px 0 0'}; text-align: justify;">${d.text || '...'}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td style="width: 24px; vertical-align: top;">1.</td>
          <td style="vertical-align: top; text-align: justify;">Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;</td>
        </tr>
        <tr>
          <td style="vertical-align: top; padding-top: 4px;">2.</td>
          <td style="vertical-align: top; padding-top: 4px; text-align: justify;">Surat Pengesahan DIPA Tahun Anggaran 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/2026 tanggal 24 April 2026.</td>
        </tr>
      `;

  const tembusanSectionHtml = tembusanItems.length > 0
    ? `
      <div style="margin-top: -22px; max-width: 9.4cm; font-size: 10pt; font-weight: normal; color: #000000;">
        <p style="margin: 0 0 4px; font-weight: normal; font-size: 10pt; color: #000000;">Tembusan:</p>
        <table style="border-collapse: collapse;">
          <tbody>
            ${tembusanItems.map((t, idx) => `
              <tr>
                ${tembusanItems.length > 1 ? `<td style="width: 20px; vertical-align: top; padding: 1px 0; font-size: 10pt;">${idx + 1}.</td>` : ''}
                <td style="vertical-align: top; padding: 1px 0; font-size: 10pt; white-space: nowrap;">${t}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : '';

  // Extract employees list
  const personnelList = data.employees && data.employees.length > 0
    ? data.employees
    : data.personel && data.personel.length > 0
    ? data.personel
    : [
        { name: "Anisa Rahmawati, S.Tr.Kom.", nip: "199911032025062012", jabatan: "Pranata Komputer Ahli Pertama" },
        { name: "Tegar Anugrah, A.Md.Kom.", nip: "199907072025061006", jabatan: "Pranata Komputer Terampil" },
      ];

  const personnelRowsHtml = personnelList.map((p: any, idx) => `
    <tr>
      <td style="width: 24px; vertical-align: top; padding: 2px 0;">${idx + 1}.</td>
      <td style="vertical-align: top; padding: 2px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 70px; padding: 1px 0;">Nama</td>
            <td style="width: 12px; padding: 1px 0;">:</td>
            <td style="font-weight: bold; padding: 1px 0;">${p.nama_lengkap || p.name || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 1px 0;">NIP</td>
            <td style="padding: 1px 0;">:</td>
            <td style="padding: 1px 0;">${formatNIP(p.nip)}</td>
          </tr>
          <tr>
            <td style="padding: 1px 0;">Jabatan</td>
            <td style="padding: 1px 0;">:</td>
            <td style="padding: 1px 0;">${p.jabatan || p.pivot?.peran || 'Pranata Komputer'}</td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=210mm, initial-scale=0.42, minimum-scale=0.2, maximum-scale=3.0, user-scalable=yes">
      <style>
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #0f172a;
          width: 100%;
          min-height: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          font-family: 'Bookman Old Style', 'Georgia', 'Times New Roman', serif;
        }
        .page-wrapper {
          padding: 16px 8px;
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .page-card {
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          padding: 25mm 20mm;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          color: #000000;
          font-size: 11pt;
          line-height: 1.25;
          text-align: justify;
          position: relative;
        }
        .kop-container {
          text-align: center;
          margin-top: -15mm;
          margin-bottom: 14px;
        }
        .kop-title-1 { font-size: 13pt; font-weight: bold; margin: 0; letter-spacing: 0.5px; }
        .kop-title-2 { font-size: 9.5pt; font-weight: bold; margin: 2px 0 0; }
        .kop-title-3 { font-size: 11pt; font-weight: bold; margin: 2px 0 0; }
        .line-thick { width: 100%; height: 3px; background-color: #000000; margin-top: 6px; }
        .line-thin { width: 100%; height: 1px; background-color: #000000; margin-top: 2px; }

        .doc-header { text-align: center; margin: 16px 0; }
        .doc-title { font-size: 11pt; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 1px; }
        .doc-number { font-size: 11pt; margin: 0; }

        .section-center { text-align: center; font-weight: bold; margin: 16px 0 6px; }

        table.main-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
        td.col-label { width: 110px; vertical-align: top; padding: 2px 0; font-size: 11pt; }
        td.col-colon { width: 12px; vertical-align: top; padding: 2px 0; font-size: 11pt; }
        td.col-content { vertical-align: top; padding: 2px 0; font-size: 11pt; }

        p.penutup-text { margin: 24px 0 0; text-align: justify; font-size: 11pt; }

        .sig-box {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }
        .sig-inner {
          margin-left: auto;
          text-align: left;
          width: 280px;
        }
        .sig-text { font-size: 11pt; margin: 0; }
        .sig-space { height: 70px; display: flex; align-items: center; }
        .sig-name { font-weight: bold; font-size: 11pt; margin: 0; }
        .sig-nip { font-size: 10pt; margin: 2px 0 0; }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="page-card">
          <!-- KOP SURAT MATCHING LOCALHOST -->
          <div data-kop class="kop-container" style="margin-top: -22mm; margin-bottom: 2px; margin-left: -1.5cm; margin-right: -1cm;">
            <img
              src="${HEADER_NEW_BASE64}"
              alt="Kop Surat"
              style="width: 18.8cm; height: auto; display: block;"
            />
          </div>

          <!-- JUDUL & NOMOR -->
          <div class="doc-header">
            <div class="doc-title">SURAT TUGAS</div>
            <div class="doc-number">Nomor : ${nomorSurat}</div>
          </div>

          <!-- KEPALA BALAI -->
          <div class="section-center">KEPALA BALAI,</div>

          <!-- MENIMBANG -->
          <table class="main-table">
            <tr>
              <td class="col-label">Menimbang</td>
              <td class="col-colon">:</td>
              <td class="col-content">
                <table style="width: 100%; border-collapse: collapse;">
                  ${menimbangRowsHtml}
                </table>
              </td>
            </tr>
          </table>

          <!-- DASAR -->
          <table class="main-table">
            <tr>
              <td class="col-label">Dasar</td>
              <td class="col-colon">:</td>
              <td class="col-content">
                <table style="width: 100%; border-collapse: collapse;">
                  ${dasarRowsHtml}
                </table>
              </td>
            </tr>
          </table>

          <!-- MEMBERI TUGAS -->
          <div class="section-center">MEMBERI TUGAS,</div>

          <!-- KEPADA -->
          <table class="main-table">
            <tr>
              <td class="col-label">Kepada</td>
              <td class="col-colon">:</td>
              <td class="col-content">
                <table style="width: 100%; border-collapse: collapse;">
                  ${personnelRowsHtml}
                </table>
              </td>
            </tr>
          </table>

          <!-- UNTUK -->
          <table class="main-table">
            <tr>
              <td class="col-label">Untuk</td>
              <td class="col-colon">:</td>
              <td class="col-content">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 24px; vertical-align: top;">1.</td>
                    <td style="vertical-align: top; text-align: justify;">${firstUntukLine}</td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top; padding-top: 4px;">2.</td>
                    <td style="vertical-align: top; padding-top: 4px; text-align: justify;">Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.</td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top; padding-top: 4px;">3.</td>
                    <td style="vertical-align: top; padding-top: 4px; text-align: justify;">Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${danaText};</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- PENUTUP -->
          <p class="penutup-text">Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>

          <!-- TANDA TANGAN BSKDA LOCALHOST MATCHING -->
          <div class="sig-box">
            <div class="sig-inner">
              <div class="sig-text">Samarinda, ${formatDateIndonesian(tglSurat)}</div>
              <div class="sig-text">Kepala Balai,</div>
              <div class="sig-space"></div>
              <div class="sig-name">${penandatanganNama}</div>
              <div class="sig-nip">NIP. ${formatNIP(penandatanganNip)}</div>
            </div>
          </div>

          <!-- TEMBUSAN -->
          ${tembusanSectionHtml}
        </div>
      </div>
    </body>
    </html>
  `;
}

export const PratinjauSuratTugasModal: React.FC<PratinjauSuratTugasModalProps> = ({
  visible,
  data,
  onClose,
}) => {
  const [isPrinting, setIsPrinting] = React.useState(false);

  if (!data) return null;

  const nomorSurat = data.nomor_surat || data.nomor || "ST.1/K.18/TU/KSA.05.06/B/07/2026";

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const file = await downloadAssignmentFile({
        assignmentId: data.id,
        mode: "personal",
        filename: `ST-${nomorSurat.replace(/[\/\\\\:*?"<>|]/g, "_")}.pdf`,
        storage: "cache",
      });

      await openFile({
        localUri: file.localUri,
        mimeType: file.mimeType || "application/pdf",
        dialogTitle: "Cetak / Simpan Surat Tugas",
      });
    } catch {
      // Fallback
    } finally {
      setIsPrinting(false);
    }
  };

  const htmlContent = buildSuratTugasHtml(data);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Sticky Header Bar Presisi Web Modal */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarTitleCol}>
            <Text style={styles.toolbarTag}>CETAK / DOWNLOAD SURAT TUGAS</Text>
            <Text style={styles.toolbarNomor} numberOfLines={1}>{nomorSurat}</Text>
          </View>

          <View style={styles.toolbarActionsRow}>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={handlePrint}
              disabled={isPrinting}
              activeOpacity={0.8}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="print-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.printBtnText}>Cetak (A4)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scaled A4 Document WebView Presisi Web Responsive */}
        <View style={styles.webViewContainer}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlContent }}
            style={styles.webView}
            scalesPageToFit={true}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={true}
            bounces={false}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    zIndex: 10,
  },
  toolbarTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  toolbarTag: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  toolbarNomor: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  toolbarActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  printBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },

  webViewContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  webView: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
});
