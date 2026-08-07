import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { logoBksdaBase64 } from "./logoBksdaBase64";

function formatNameWithDegree(fullName: string): string {
  if (!fullName) return "-";
  const parts = fullName.split(",");
  if (parts.length > 1) {
    const name = parts[0].trim().toUpperCase();
    const degree = parts.slice(1).join(",").trim();
    return `${name}, ${degree}`;
  }
  return fullName.toUpperCase();
}

function cleanCoverSubtitle(rawTitle?: string): string {
  if (!rawTitle) return "PELAKSANAAN TUGAS DINAS";
  let cleaned = rawTitle.trim();
  cleaned = cleaned.replace(/^laporan\s+/i, "").trim();
  return cleaned.toUpperCase();
}

export default function GeneralReportPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const reportData = route.params?.reportData;
  const [loading, setLoading] = useState(true);

  if (!reportData) {
    return (
      <View style={styles.centerContainer}>
        <Text>Data Laporan tidak ditemukan.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: "white" }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Generate HTML based on GeneralReportPrint.tsx logic
  const generateHTML = () => {
    const {
      judul_laporan, kota_laporan, tanggal_laporan, agenda_pelaksanaan, dasar_pelaksanaan,
      maksud_tujuan, pelaksana, waktu_tempat_pelaksanaan, hasil_pelaksanaan, dokumentasi_foto,
      use_custom_cover, cover_mode, custom_cover_image_url, custom_cover_title, custom_cover_footer
    } = reportData;

    const isCustomImageCover = use_custom_cover && cover_mode === "image" && custom_cover_image_url;

    // Cover Page HTML
    let coverHTML = "";
    if (isCustomImageCover) {
      coverHTML = `
        <div class="a4-page" style="padding:0; display:flex; flex-direction:column; justify-content:center; align-items:center;">
          <img src="${custom_cover_image_url}" style="width:100%; height:100%; object-fit:cover;" />
        </div>
      `;
    } else {
      let pelaksanaHTML = "";
      if (pelaksana && pelaksana.length > 0) {
        pelaksanaHTML = pelaksana.map((p: any) => `<p style="margin:2px 0; font-size:14px; font-weight:bold;">${formatNameWithDegree(p.nama_lengkap)}</p>`).join("");
      }

      coverHTML = `
        <div class="a4-page" style="display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center;">
          <div style="margin-top: 40px;">
            <h1 style="font-size:24px; font-weight:bold; margin-bottom:10px;">LAPORAN</h1>
            <h2 style="font-size:18px; font-weight:bold;">${cleanCoverSubtitle(judul_laporan)}</h2>
          </div>
          <div style="margin: 40px 0;">
            <img src="${logoBksdaBase64}" style="width:120px; height:120px; object-fit:contain;" />
          </div>
          <div style="margin-bottom: 20px;">
            <p style="font-size:14px; font-weight:bold; margin-bottom:10px;">Disusun Oleh :</p>
            ${pelaksanaHTML}
          </div>
          <div style="margin-bottom: 40px;">
            <p style="font-size:16px; font-weight:bold; margin-bottom:4px;">KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN</p>
            <p style="font-size:16px; font-weight:bold; margin-bottom:4px;">DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</p>
            <p style="font-size:16px; font-weight:bold;">${custom_cover_footer || "BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR"}</p>
            <p style="font-size:16px; font-weight:bold; margin-top:8px;">2026</p>
          </div>
        </div>
      `;
    }

    let dasarHTML = "";
    if (dasar_pelaksanaan && dasar_pelaksanaan.length > 0) {
      dasarHTML = `<ol style="margin-top:0; padding-left:20px;">` + dasar_pelaksanaan.map((d: string) => `<li style="margin-bottom:6px; text-align:justify;">${d}</li>`).join("") + `</ol>`;
    }

    let pelaksanaTableHTML = "";
    if (pelaksana && pelaksana.length > 0) {
      pelaksanaTableHTML = `
        <table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:10px;">
          ${pelaksana.map((p: any, idx: number) => `
            <tr>
              <td style="width:20px; vertical-align:top;">${idx + 1}.</td>
              <td style="width:120px; vertical-align:top;">Nama</td>
              <td style="width:10px; vertical-align:top;">:</td>
              <td style="font-weight:bold;">${p.nama_lengkap}</td>
            </tr>
            <tr>
              <td></td>
              <td style="vertical-align:top;">NIP</td>
              <td style="vertical-align:top;">:</td>
              <td>${p.nip || "-"}</td>
            </tr>
            <tr>
              <td></td>
              <td style="vertical-align:top;">Jabatan</td>
              <td style="vertical-align:top;">:</td>
              <td style="padding-bottom:8px;">${p.jabatan}</td>
            </tr>
          `).join("")}
        </table>
      `;
    }

    let hasilHTML = "";
    if (hasil_pelaksanaan && hasil_pelaksanaan.length > 0) {
      hasilHTML = `<ol style="margin-top:0; padding-left:20px;">` + hasil_pelaksanaan.map((h: string) => `<li style="margin-bottom:6px; text-align:justify;">${h}</li>`).join("") + `</ol>`;
    }

    let fotoHTML = "";
    if (dokumentasi_foto && dokumentasi_foto.length > 0) {
      fotoHTML = `
        <div class="a4-page" style="page-break-before:always;">
          <h3 style="text-align:center; text-decoration:underline; font-size:16px; font-weight:bold; margin-bottom:20px;">DOKUMENTASI KEGIATAN</h3>
          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px;">
            ${dokumentasi_foto.map((f: any) => `
              <div style="width:45%; display:flex; flex-direction:column; align-items:center; margin-bottom:20px;">
                <img src="${f.url}" style="width:100%; height:auto; border:2px solid #333; max-height:250px; object-fit:contain;" />
                <p style="text-align:center; font-size:12px; margin-top:8px; font-style:italic;">${f.caption || ""}</p>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    const ttdHTML = `
      <div style="margin-top:40px; display:flex; justify-content:flex-end;">
        <div style="width:300px; text-align:center;">
          <p style="margin-bottom:80px;">${kota_laporan}, ${tanggal_laporan}</p>
          <p style="font-weight:bold;">${pelaksana?.[0]?.nama_lengkap || "Pelaksana"}</p>
          <p>NIP. ${pelaksana?.[0]?.nip || "-"}</p>
        </div>
      </div>
    `;

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { 
              margin: 0; 
              padding: 24px 16px; 
              background: #0f172a; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              font-family: Arial, sans-serif; 
            }
            .a4-page { 
              background: white; 
              width: 100%; 
              max-width: 210mm; 
              min-height: 297mm; 
              padding: 20mm; 
              box-sizing: border-box; 
              box-shadow: 0 10px 25px rgba(0,0,0,0.3); 
              margin-bottom: 24px; 
              color: #000;
              font-size: 14px; 
              line-height: 1.5;
              position: relative;
            }
            @media print {
              body { background: white; padding: 0; display: block; }
              .a4-page { box-shadow: none; margin: 0; padding: 0; min-height: auto; max-width: none; page-break-after: always; }
            }
            h3 { font-size:14px; margin-bottom:4px; font-weight:bold; }
            p { margin:0 0 8px 0; text-align:justify; }
            .section { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <!-- PAGE 1: COVER -->
          ${coverHTML}
          
          <!-- PAGE 2: CONTENT -->
          <div class="a4-page">
            <h3 style="text-align:center; text-decoration:underline; font-size:16px; margin-bottom:20px;">${judul_laporan}</h3>
            
            <div class="section">
              <h3>I. PENDAHULUAN</h3>
              <p><strong>A. Dasar Pelaksanaan</strong></p>
              ${dasarHTML}
              <p><strong>B. Maksud dan Tujuan</strong></p>
              <p>${maksud_tujuan}</p>
            </div>

            <div class="section">
              <h3>II. PELAKSANAAN KEGIATAN</h3>
              <p><strong>A. Waktu dan Tempat</strong></p>
              <p>${waktu_tempat_pelaksanaan}</p>
              <p><strong>B. Susunan Pelaksana</strong></p>
              ${pelaksanaTableHTML}
              <p><strong>C. Agenda Pelaksanaan</strong></p>
              <p>${agenda_pelaksanaan}</p>
            </div>

            <div class="section">
              <h3>III. HASIL PELAKSANAAN</h3>
              ${hasilHTML}
            </div>

            <div class="section">
              <h3>IV. PENUTUP</h3>
              <p>Demikian laporan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
            </div>

            ${ttdHTML}
          </div>
          
          <!-- PAGE 3: LAMPIRAN (OPTIONAL) -->
          ${fotoHTML}
        </body>
      </html>
    `;
  };

  const htmlContent = generateHTML();

  const handlePrint = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview Laporan A4</Text>
        <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
          <Ionicons name="share-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: "#0f172a" }}
        onLoadEnd={() => setLoading(false)}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.submitBtn}>
          <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
          <Text style={styles.submitBtnText}>Kirim Laporan (Final)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    elevation: 2,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  printBtn: { padding: 4 },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  submitBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700", marginLeft: 8 },
});
