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
import * as FileSystem from "expo-file-system/legacy";
import { shareFile } from "@/lib/files/share";

export interface LeaveRequestPrintData {
  id?: number | string;
  nomor_pengajuan?: string;
  tanggal_pengajuan?: string;
  jenis_cuti: string;
  alasan_cuti: string;
  jumlah_hari: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alamat_menjalankan_cuti: string;
  telepon?: string;
  masa_kerja?: string;
  status?: string;
  sisa_n2?: number;
  sisa_n1?: number;
  sisa_n0?: number;
  status_pertimbangan_atasan?: string;
  status_pertimbangan_pejabat?: string;
  catatan_atasan?: string;
  kasubbag_nama?: string;
  kasubbag_nip?: string;
  kepala_balai_nama?: string;
  kepala_balai_nip?: string;
  employee?: {
    nama_lengkap?: string;
    nip?: string;
    jabatan?: string;
    satuan_kerja?: string;
    pangkat_golongan?: string;
  };
}

interface FormulirCutiPrintModalProps {
  visible: boolean;
  data: LeaveRequestPrintData | null;
  onClose: () => void;
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function strMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().includes(b.toLowerCase());
}

function calculateMasaKerja(nip?: string | null, namaLengkap?: string | null): string {
  if (!nip) return "0 Tahun 0 Bulan";
  const cleanNip = nip.replace(/\D/g, "");
  if (cleanNip.length < 12) return "0 Tahun 0 Bulan";

  const yearAdmitted = parseInt(cleanNip.substring(8, 12), 10);
  if (isNaN(yearAdmitted) || yearAdmitted < 1950 || yearAdmitted > 2099) {
    return "0 Tahun 0 Bulan";
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  let totalMonths = Math.max(0, (currentYear - yearAdmitted) * 12);

  const nama = (namaLengkap || "").toLowerCase();
  if (nama.includes("a.md") || nama.includes("amd")) {
    totalMonths += 36;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years} Tahun ${months} Bulan`;
}

function getKotaAtasanFromSatuanKerja(satuanKerja?: string) {
  const sk = (satuanKerja || "").toLowerCase();
  let kota = "Samarinda";
  let atasanTitle = "Kasubbag Tata Usaha";
  let atasanNama = "DHENY MARDIONO, S.Hut., M.Sc.";
  let atasanNip = "19750314 199903 1 004";

  if (sk.includes("wilayah iii") || sk.includes("balikpapan")) {
    kota = "Balikpapan";
    atasanTitle = "Kepala Seksi KSDA Wilayah III Balikpapan";
    atasanNama = "BAMBANG HARI TRIMARSITO, S.Si., M.P.";
    atasanNip = "19740626 200112 1 004";
  } else if (sk.includes("wilayah ii") || sk.includes("tenggarong")) {
    kota = "Tenggarong";
    atasanTitle = "Kepala Seksi KSDA Wilayah II Tenggarong";
    atasanNama = "SURIAWATI HALIM, S.Hut., M.P.";
    atasanNip = "19751127 200003 2 001";
  } else if (sk.includes("wilayah i") || sk.includes("berau")) {
    kota = "Tanjung Redeb";
    atasanTitle = "Kepala Seksi KSDA Wilayah I Berau";
    atasanNama = "YULIAN SADONO, S.Hut., M.T.";
    atasanNip = "19800707 200604 1 003";
  }

  return { kota, atasanTitle, atasanNama, atasanNip };
}

function buildFormulirCutiHtml(data: LeaveRequestPrintData): string {
  const emp = data.employee || {
    nama_lengkap: "TEGAR ANUGRAH, A.Md.Kom.",
    nip: "19990707 202506 1 006",
    jabatan: "PRANATA KOMPUTER TERAMPIL",
    satuan_kerja: "Balai KSDA Kalimantan Timur",
  };

  const { kota: kotaTujuan, atasanTitle, atasanNama, atasanNip } = getKotaAtasanFromSatuanKerja(emp.satuan_kerja);

  const isDefaultDheny = !data.kasubbag_nama || data.kasubbag_nama.includes("DHENY");
  const finalAtasanNama = (isDefaultDheny && atasanNama !== "DHENY MARDIONO, S.Hut., M.Sc.") ? atasanNama : (data.kasubbag_nama || atasanNama);
  const finalAtasanNip = (isDefaultDheny && atasanNip !== "19750314 199903 1 004") ? atasanNip : (data.kasubbag_nip || atasanNip);

  const isTahunan = strMatch(data.jenis_cuti, "tahunan");
  const isBesar = strMatch(data.jenis_cuti, "besar");
  const isSakit = strMatch(data.jenis_cuti, "sakit");
  const isMelahirkan = strMatch(data.jenis_cuti, "melahirkan");
  const isPenting = strMatch(data.jenis_cuti, "penting");
  const isLuarTanggungan = strMatch(data.jenis_cuti, "luar");

  const statusStr = (data.status || "PENGAJUAN").toUpperCase();
  const isSetuju = statusStr === "DISETUJUI";
  const isTolak = statusStr === "DITOLAK";

  const currentYear = new Date().getFullYear();

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
          font-family: Arial, Helvetica, sans-serif;
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
          padding: 18mm 15mm;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          color: #000000;
          font-size: 9.5pt;
          line-height: 1.3;
          position: relative;
        }

        .header-top { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9.5pt; }
        .header-top-left { text-align: left; }
        .doc-title { text-align: center; margin-bottom: 12px; }
        .doc-title h1 { font-size: 11pt; font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 9.5pt; }
        table, th, td { border: 1px solid #000000; }
        th { background-color: #f8fafc; text-align: left; padding: 3px 8px; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
        td { padding: 3px 8px; vertical-align: middle; }
        td.label { font-weight: 600; width: 110px; }

        .check-box { text-align: center; font-weight: bold; font-size: 11pt; width: 36px; height: 20px; }
        .sig-name { font-weight: bold; font-size: 9.5pt; text-transform: uppercase; }

        .footer-note p { margin: 1px 0; font-size: 8.5pt; color: #1e293b; }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="page-card">
          <!-- Header Surat -->
          <div class="header-top">
            <div class="header-top-left">
              <div>${kotaTujuan}, ${formatDateIndo(data.tanggal_pengajuan)}</div>
              <div>Kepada</div>
              <div style="font-weight: bold;">Kepala Balai KSDA Kaltim</div>
              <div>di -</div>
              <div style="padding-left: 16px;">Samarinda</div>
            </div>
          </div>

          <!-- Judul -->
          <div class="doc-title">
            <h1>FORMULIR PERMINTAAN DAN PEMBERIAN CUTI</h1>
          </div>

          <!-- I. DATA PEGAWAI -->
          <table>
            <thead>
              <tr>
                <th colSpan="4">I. DATA PEGAWAI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label">Nama</td>
                <td style="width: 42%; text-transform: uppercase;">${emp.nama_lengkap || '-'}</td>
                <td class="label" style="width: 70px;">NIP</td>
                <td>${emp.nip || '-'}</td>
              </tr>
              <tr>
                <td class="label">Jabatan</td>
                <td style="text-transform: uppercase;">${emp.jabatan || '-'}</td>
                <td class="label">Masa Kerja</td>
                <td>${data.masa_kerja || calculateMasaKerja(emp.nip, emp.nama_lengkap)}</td>
              </tr>
              <tr>
                <td class="label">Unit Kerja</td>
                <td colSpan="3" style="text-transform: uppercase;">${emp.satuan_kerja || "Balai KSDA Kalimantan Timur"}</td>
              </tr>
            </tbody>
          </table>

          <!-- II. JENIS CUTI YANG DIAMBIL -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th colSpan="4">II. JENIS CUTI YANG DIAMBIL**</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="width: 40%;">1. Cuti Tahunan</td>
                <td class="check-box">${isTahunan ? '✓' : ''}</td>
                <td style="width: 40%;">2. Cuti Besar</td>
                <td class="check-box">${isBesar ? '✓' : ''}</td>
              </tr>
              <tr>
                <td>3. Cuti Sakit</td>
                <td class="check-box">${isSakit ? '✓' : ''}</td>
                <td>4. Cuti Melahirkan</td>
                <td class="check-box">${isMelahirkan ? '✓' : ''}</td>
              </tr>
              <tr>
                <td>5. Cuti Karena Alasan Penting</td>
                <td class="check-box">${isPenting ? '✓' : ''}</td>
                <td>6. Cuti di Luar Tanggungan Negara</td>
                <td class="check-box">${isLuarTanggungan ? '✓' : ''}</td>
              </tr>
            </tbody>
          </table>

          <!-- III. ALASAN CUTI -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th>III. ALASAN CUTI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; min-height: 40px;">${data.alasan_cuti || '-'}</td>
              </tr>
            </tbody>
          </table>

          <!-- IV. LAMANYA CUTI (EXACT 6-CELL TABLE LAYOUT MATCHING WEB) -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th colSpan="6">IV. LAMANYA CUTI</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center;">
                <td style="width: 80px; font-weight: 600;">SELAMA</td>
                <td style="width: 80px; font-weight: bold;">${data.jumlah_hari} HARI</td>
                <td style="width: 120px; font-weight: 600;">MULAI TANGGAL</td>
                <td style="font-weight: bold;">${formatDateIndo(data.tanggal_mulai)}</td>
                <td style="width: 50px; font-weight: 600;">S.D</td>
                <td style="font-weight: bold;">${formatDateIndo(data.tanggal_selesai)}</td>
              </tr>
            </tbody>
          </table>

          <!-- V. CATATAN CUTI (EXACT MATCH WEB SPLIT TABLE) -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th colSpan="4">V. CATATAN CUTI ***</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <!-- Left half: Cuti Tahunan -->
                <td colSpan="2" style="width: 50%; vertical-align: top; padding: 0;">
                  <div style="padding: 3px 8px; font-weight: 600; border-bottom: 1px solid #000000;">1. CUTI TAHUNAN</div>
                  <table style="width: 100%; text-align: center; border-collapse: collapse; font-size: 9pt;">
                    <thead>
                      <tr style="background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #000000;">
                        <td style="width: 60px; padding: 2px 0;">TAHUN</td>
                        <td style="width: 60px; padding: 2px 0;">SISA</td>
                        <td style="text-align: left; padding-left: 8px;">KETERANGAN</td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="border-bottom: 1px solid #000000;">
                        <td>N - 2</td>
                        <td style="font-weight: bold;">${data.sisa_n2 || "-"}</td>
                        <td style="text-align: left; padding-left: 8px;">Tahun ${currentYear - 2}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #000000;">
                        <td>N - 1</td>
                        <td style="font-weight: bold;">${data.sisa_n1 || "-"}</td>
                        <td style="text-align: left; padding-left: 8px;">Tahun ${currentYear - 1}</td>
                      </tr>
                      <tr>
                        <td>N</td>
                        <td style="font-weight: bold;">${data.sisa_n0 ?? 12}</td>
                        <td style="text-align: left; padding-left: 8px;">Tahun ${currentYear}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>

                <!-- Right half -->
                <td colSpan="2" style="width: 50%; vertical-align: top; padding: 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                    <tbody>
                      <tr style="border-bottom: 1px solid #000000;">
                        <td style="padding: 3px 8px;">2. Cuti Besar</td>
                        <td class="check-box">${isBesar ? '✓' : ''}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #000000;">
                        <td style="padding: 3px 8px;">3. Cuti Sakit</td>
                        <td class="check-box">${isSakit ? '✓' : ''}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #000000;">
                        <td style="padding: 3px 8px;">4. Cuti Melahirkan</td>
                        <td class="check-box">${isMelahirkan ? '✓' : ''}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #000000;">
                        <td style="padding: 3px 8px;">5. Cuti Karena Alasan Penting</td>
                        <td class="check-box">${isPenting ? '✓' : ''}</td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 8px;">6. Cuti di Luar Tanggungan Negara</td>
                        <td class="check-box">${isLuarTanggungan ? '✓' : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- VI. ALAMAT SELAMA MENJALANKAN CUTI -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th colSpan="2">VI. ALAMAT SELAMA MENJALANKAN CUTI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="width: 55%; vertical-align: top; padding: 0;">
                  <div style="padding: 6px; min-height: 44px; line-height: 1.3;">
                    ${data.alamat_menjalankan_cuti || '-'}
                  </div>
                  <div style="padding: 4px 6px; border-top: 1px solid #000000; font-weight: bold;">
                    TELPON: ${data.telepon || '-'}
                  </div>
                </td>
                <td style="text-align: center; vertical-align: bottom; padding: 6px; white-space: nowrap;">
                  <div>Hormat Saya,</div>
                  <div style="height: 40px;"></div>
                  <div class="sig-name">${emp.nama_lengkap}</div>
                  <div style="font-size: 9pt;">NIP. ${emp.nip}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- VII. PERTIMBANGAN ATASAN LANGSUNG (EXACT MATCH WEB) -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th colSpan="4">VII. PERTIMBANGAN ATASAN LANGSUNG**</th>
              </tr>
              <tr style="text-align: center; font-size: 9pt; font-weight: 600;">
                <td style="width: 25%;">DISETUJUI</td>
                <td style="width: 25%;">PERUBAHAN****</td>
                <td style="width: 25%;">DITANGGUHKAN****</td>
                <td style="width: 25%;">TIDAK DISETUJUI****</td>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; height: 28px;">
                <td class="check-box"></td>
                <td class="check-box"></td>
                <td class="check-box"></td>
                <td class="check-box"></td>
              </tr>
              <tr>
                <td colSpan="4" style="padding: 6px;">
                  <div style="display: flex; justify-content: flex-end;">
                    <div style="text-align: center; min-width: 280px; white-space: nowrap;">
                      <div>${atasanTitle},</div>
                      <div style="height: 40px;"></div>
                      <div class="sig-name">${finalAtasanNama}</div>
                      <div style="font-size: 9pt;">NIP. ${finalAtasanNip}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- VIII. PERTIMBANGAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI (EXACT MATCH WEB) -->
          <table style="margin-top: -1px;">
            <thead>
              <tr>
                <th colSpan="4">VIII. PERTIMBANGAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI**</th>
              </tr>
              <tr style="text-align: center; font-size: 9pt; font-weight: 600;">
                <td style="width: 25%;">DISETUJUI</td>
                <td style="width: 25%;">PERUBAHAN****</td>
                <td style="width: 25%;">DITANGGUHKAN****</td>
                <td style="width: 25%;">TIDAK DISETUJUI****</td>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; height: 28px;">
                <td class="check-box"></td>
                <td class="check-box"></td>
                <td class="check-box"></td>
                <td class="check-box"></td>
              </tr>
              <tr>
                <td colSpan="4" style="padding: 6px;">
                  <div style="display: flex; justify-content: flex-end;">
                    <div style="text-align: center; min-width: 280px; white-space: nowrap;">
                      <div>Kepala Balai,</div>
                      <div style="height: 40px;"></div>
                      <div class="sig-name">${data.kepala_balai_nama || "M. ARI WIBOWANTO, S.Hut., M.Sc."}</div>
                      <div style="font-size: 9pt;">NIP. ${data.kepala_balai_nip || "19740514 199903 1 001"}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- CATATAN KAKI (FOOTER NOTES MATCHING WEB) -->
          <table style="margin-top: -1px;">
            <tbody>
              <tr>
                <td class="footer-note" style="padding: 6px;">
                  <p style="font-weight: bold;">Catatan :</p>
                  <p>* Coret yang tidak perlu</p>
                  <p>** Pilih salah satu dengan memberi tanda centang ( ✓ )</p>
                  <p>*** Diisi oleh pejabat yang menangani bidang kepegawaian sebelum PNS mengajukan cuti</p>
                  <p>**** Diberi tanda centang dan alasannya</p>
                  <p>N = Cuti tahun berjalan</p>
                  <p>N-1 = Sisa Cuti 1 Tahun Sebelumnya</p>
                  <p>N-2 = Sisa Cuti Tahunan Sebelumnya</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const FormulirCutiPrintModal: React.FC<FormulirCutiPrintModalProps> = ({
  visible,
  data,
  onClose,
}) => {
  const [isPrinting, setIsPrinting] = React.useState(false);

  if (!data) return null;

  const nomorPengajuan = data.nomor_pengajuan || `CUTI/${new Date().getFullYear()}/001`;
  const htmlContent = buildFormulirCutiHtml(data);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const filename = `Formulir-Cuti-${nomorPengajuan.replace(/[\/\\\\:*?"<>|]/g, "_")}.html`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(localUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await shareFile({
        localUri,
        mimeType: "text/html",
        dialogTitle: "Cetak / Bagikan Formulir Cuti Ke WA",
      });
    } catch (err) {
      console.warn("Cuti share error:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Sticky Header Bar */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarTitleCol}>
            <Text style={styles.toolbarTag}>FORMULIR CUTI RESMI BKSDA</Text>
            <Text style={styles.toolbarNomor} numberOfLines={1}>{nomorPengajuan}</Text>
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
                  <Ionicons name="share-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.printBtnText}>Cetak / Share (WA)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* WebView Form Content */}
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
    color: "#10b981",
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
