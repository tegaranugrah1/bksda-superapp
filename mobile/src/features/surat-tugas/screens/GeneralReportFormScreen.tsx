import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppDatePickerModal } from "@/components/AppDatePickerModal";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { COLORS, RADIUS } from "../../../theme";
import { useAuth } from "../../auth/AuthProvider";
import { apiClient } from "../../../lib/api/client";

interface MySuratTugasOption {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tempat_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  employees?: any[];
  tanggal_surat?: string;
}

// ----------------------------------------------------
// UTILS
// ----------------------------------------------------
function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr || "-";
  }
}

function getDurationInDays(startStr: string, endStr: string): number {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  } catch {
    return 1;
  }
}

function numberToTerbilang(num: number): string {
  const terbilangMap: Record<number, string> = {
    1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima",
    6: "enam", 7: "tujuh", 8: "delapan", 9: "sembilan", 10: "sepuluh",
  };
  return terbilangMap[num] || String(num);
}

function formatJudulLaporan(rawText: string): string {
  let cleaned = (rawText || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();
  const matchDalamRangka = cleaned.match(/dalam\s+rangka\s+(.+)$/i);
  if (matchDalamRangka && matchDalamRangka[1]) {
    cleaned = matchDalamRangka[1].trim();
  } else {
    cleaned = cleaned.replace(/^(melaksanakan\s+perjalanan\s+dinas\s+dari\s+[^\s]+\s+ke\s+[^\s]+|melaksanakan\s+kegiatan|melaksanakan\s+perjalanan\s+dinas|menugaskan\s+staf|melaksanakan)\s+/i, "");
  }
  cleaned = cleaned.replace(/^(dari\s+[^\s]+\s+ke\s+[^\s]+\s+)/i, "").trim();
  return `PELAKSANAAN ${cleaned.toUpperCase()}`;
}

function extractShortActivity(rawText: string): string {
  let cleaned = (rawText || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();
  const matchDalamRangka = cleaned.match(/dalam\s+rangka\s+(.+)$/i);
  if (matchDalamRangka && matchDalamRangka[1]) {
    cleaned = matchDalamRangka[1].trim();
  } else {
    cleaned = cleaned.replace(/^(melaksanakan\s+perjalanan\s+dinas\s+dari\s+[^\s]+\s+ke\s+[^\s]+|melaksanakan\s+kegiatan|melaksanakan\s+perjalanan\s+dinas|menugaskan\s+staf|melaksanakan)\s+/i, "");
  }
  cleaned = cleaned.replace(/^(dari\s+[^\s]+\s+ke\s+[^\s]+\s+)/i, "").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractAgendaPelaksanaan(rawText: string): string {
  let cleaned = (rawText || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();
  cleaned = cleaned.replace(/[\.\s]+$/, "");
  return cleaned;
}

function formatMaksudDanTujuan(maksud: string, tujuan: string): string {
  const cleanMaksud = (maksud || "").trim().replace(/[\.\s]+$/, "");
  const cleanTujuan = (tujuan || "").trim().replace(/[\.\s]+$/, "");
  if (cleanMaksud && cleanTujuan) {
    return `Maksud kegiatan ini adalah ${cleanMaksud} dan dengan tujuan untuk ${cleanTujuan}.`;
  }
  if (cleanMaksud) return `Maksud kegiatan ini adalah ${cleanMaksud}.`;
  if (cleanTujuan) return `dengan tujuan untuk ${cleanTujuan}.`;
  return "";
}

function formatWaktuDanTempatPelaksanaan(rawMaksud: string, tanggalMulai: string, tanggalSelesai: string, tempatTujuan?: string): string {
  const daysCount = getDurationInDays(tanggalMulai, tanggalSelesai);
  const daysTerbilang = numberToTerbilang(daysCount);
  const tglMulaiStr = formatDateIndo(tanggalMulai);
  const tglSelesaiStr = formatDateIndo(tanggalSelesai);

  let cleaned = (rawMaksud || "").split(";")[0].trim();
  cleaned = cleaned.replace(/[,;]?\s*selama\s+\d+.*$/i, "").trim();

  const isPerjalananDinas = /perjalanan\s+dinas/i.test(rawMaksud);

  let shortActivity = cleaned;
  const matchDalamRangka = cleaned.match(/dalam\s+rangka\s+(.+)$/i);
  if (matchDalamRangka && matchDalamRangka[1]) {
    shortActivity = matchDalamRangka[1].trim();
  } else {
    shortActivity = shortActivity.replace(/^(melaksanakan\s+perjalanan\s+dinas\s+dari\s+[^\s]+\s+ke\s+[^\s]+|melaksanakan\s+kegiatan|melaksanakan\s+perjalanan\s+dinas|menugaskan\s+staf|melaksanakan)\s+/i, "");
  }
  shortActivity = shortActivity.replace(/^(dari\s+[^\s]+\s+ke\s+[^\s]+\s+)/i, "").trim();

  let locationClause = "";
  const matchLocationInActivity = shortActivity.match(/(.+?)\s+((?:pada|di)\s+.+)$/i);
  if (matchLocationInActivity && matchLocationInActivity[1] && matchLocationInActivity[2]) {
    shortActivity = matchLocationInActivity[1].trim();
    locationClause = matchLocationInActivity[2].trim();
  } else if (tempatTujuan) {
    locationClause = tempatTujuan;
  }

  shortActivity = shortActivity.replace(/^kegiatan\s+/i, "").trim();
  shortActivity = shortActivity.charAt(0).toUpperCase() + shortActivity.slice(1);

  const isSingleDay = daysCount === 1 || tglMulaiStr === tglSelesaiStr;
  const dateClause = isSingleDay
    ? `pada tanggal ${tglMulaiStr}`
    : `terhitung mulai tanggal ${tglMulaiStr} sampai dengan ${tglSelesaiStr}`;

  let locationFormatted = "";
  if (locationClause) {
    if (locationClause.toLowerCase().startsWith("pada ") || locationClause.toLowerCase().startsWith("di ")) {
      locationFormatted = locationClause;
    } else if (isPerjalananDinas) {
      locationFormatted = `di ${locationClause}`;
    } else {
      locationFormatted = `pada ${locationClause}`;
    }
  } else {
    locationFormatted = isPerjalananDinas
      ? `di Kalimantan Timur`
      : `pada Balai KSDA Kalimantan Timur di Samarinda`;
  }

  return `Kegiatan ${shortActivity} ini dilaksanakan selama ${daysCount} (${daysTerbilang}) hari ${dateClause} ${locationFormatted}.`;
}


// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------
export default function GeneralReportFormScreen() {
  const navigation = useNavigation<any>();
  const [stOptions, setStOptions] = useState<MySuratTugasOption[]>([]);
  const [loadingST, setLoadingST] = useState(false);
  const [selectedSTId, setSelectedSTId] = useState<string>("");
  const [searchST, setSearchST] = useState("");
  const [isSTPickerOpen, setIsSTPickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Report States
  const [judulLaporan, setJudulLaporan] = useState("");
  const [kotaLaporan, setKotaLaporan] = useState("Samarinda");
  const [tanggalLaporan, setTanggalLaporan] = useState(new Date().toISOString().split("T")[0]);
  const [agendaPelaksanaan, setAgendaPelaksanaan] = useState("");
  const [dasarPelaksanaan, setDasarPelaksanaan] = useState<string[]>([
    "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam Kalimantan Timur.",
    "Pengesahan DIPA Tahun Anggaran 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 tanggal 08 Juli 2026.",
  ]);
  const [maksudText, setMaksudText] = useState("");
  const [tujuanText, setTujuanText] = useState("");
  const [pelaksana, setPelaksana] = useState<Array<{ no: number; nama_lengkap: string; nip: string; jabatan: string }>>([]);
  const [waktuTempat, setWaktuTempat] = useState("");
  const [hasilPelaksanaan, setHasilPelaksanaan] = useState<string[]>([
    "Pada hari pertama, mendatangi lokasi penugasan resmi untuk berkoordinasi dan memverifikasi berkas.",
    "Pada hari kedua, menghadiri serta memantau penutupan pelaksanaan lelang/kegiatan secara tertib.",
  ]);
  const [dokumentasiFoto, setDokumentasiFoto] = useState<Array<{ url: string; caption?: string }>>([]);

  // Cover States
  const [coverMode, setCoverMode] = useState<"standard" | "image" | "custom_text">("standard");
  const [useCustomCover, setUseCustomCover] = useState(false);
  const [customCoverImageUrl, setCustomCoverImageUrl] = useState("");
  const [customCoverTitle, setCustomCoverTitle] = useState("");
  const [customCoverAuthor, setCustomCoverAuthor] = useState("");
  const [customCoverFooter, setCustomCoverFooter] = useState("BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR");

  const fetchMySuratTugas = async () => {
    setLoadingST(true);
    try {
      const resp = await apiClient.get("/surat-tugas/my", { params: { per_page: 50 } });
      const dataArray = resp.data?.data || resp.data || [];
      setStOptions(Array.isArray(dataArray) ? dataArray : []);
    } catch {
      Alert.alert("Error", "Gagal memuat daftar Surat Tugas");
    } finally {
      setLoadingST(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchMySuratTugas();
    }, 0);
  }, []);

  const handleSelectSuratTugas = async (stId: string) => {
    setSelectedSTId(stId);
    if (!stId) return;
    try {
      const resp = await apiClient.get(`/surat-tugas/my/${stId}`);
      const st = resp.data?.data || resp.data;
      if (!st) return;

      const rawMaksud = st.maksud_tujuan || "";
      setJudulLaporan(formatJudulLaporan(rawMaksud));
      setAgendaPelaksanaan(extractAgendaPelaksanaan(rawMaksud) + ".");

      const baseDasar = [
        "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam Kalimantan Timur.",
        "Pengesahan DIPA Tahun Anggaran 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 tanggal 08 Juli 2026.",
      ];
      if (st.nomor_surat) {
        const stDateStr = formatDateIndo(st.tanggal_surat || st.tanggal_mulai);
        baseDasar.push(`Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : ${st.nomor_surat} tanggal ${stDateStr}.`);
      }
      setDasarPelaksanaan(baseDasar);

      setMaksudText(extractAgendaPelaksanaan(rawMaksud));
      setTujuanText("");

      if (Array.isArray(st.employees) && st.employees.length > 0) {
        setPelaksana(st.employees.map((e: any, idx: number) => ({
          no: idx + 1,
          nama_lengkap: e.nama_lengkap || e.name || "Pegawai",
          nip: e.nip || "-",
          jabatan: e.jabatan || "Pelaksana",
        })));
      }

      setWaktuTempat(formatWaktuDanTempatPelaksanaan(rawMaksud, st.tanggal_mulai, st.tanggal_selesai, st.tempat_tujuan));

    } catch {
      Alert.alert("Error", "Gagal mengambil detail Surat Tugas.");
    }
  };

  const handlePickCoverImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCustomCoverImageUrl(result.assets[0].uri);
    }
  };

  const handlePickDokumentasi = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map(asset => ({
        url: asset.uri,
        caption: "Dokumentasi Kegiatan"
      }));
      setDokumentasiFoto(prev => [...prev, ...newPhotos]);
    }
  };

  const handlePreview = () => {
    const reportData = {
      judul_laporan: judulLaporan,
      kota_laporan: kotaLaporan,
      tanggal_laporan: tanggalLaporan,
      agenda_pelaksanaan: agendaPelaksanaan,
      dasar_pelaksanaan: dasarPelaksanaan,
      maksud_tujuan: formatMaksudDanTujuan(maksudText, tujuanText),
      pelaksana: pelaksana,
      waktu_tempat_pelaksanaan: waktuTempat,
      hasil_pelaksanaan: hasilPelaksanaan,
      dokumentasi_foto: dokumentasiFoto,
      use_custom_cover: useCustomCover,
      cover_mode: coverMode,
      custom_cover_image_url: customCoverImageUrl,
      custom_cover_title: customCoverTitle,
      custom_cover_author: customCoverAuthor,
      custom_cover_footer: customCoverFooter,
    };
    navigation.navigate("GeneralReportPreview", { reportData });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#059669" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Form Laporan Pelaksanaan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: SURAT TUGAS */}
        <View style={[styles.card, { zIndex: 100 }]}>
          <Text style={styles.cardTitle}>Pilih Surat Tugas Acuan</Text>
          {loadingST ? (
            <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 10 }} />
          ) : (
            <View>
              <TouchableOpacity 
                style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]} 
                onPress={() => setIsSTPickerOpen(!isSTPickerOpen)}
              >
                <Text style={{ color: selectedSTId ? "#0f172a" : "#475569", flex: 1 }} numberOfLines={1}>
                  {selectedSTId 
                    ? (stOptions.find(st => st.id === selectedSTId)?.nomor_surat ? `${stOptions.find(st => st.id === selectedSTId)?.nomor_surat} - ` : "") +
                      (stOptions.find(st => st.id === selectedSTId)?.maksud_tujuan || "")
                    : "[ Tanpa Surat Tugas / Input Manual ]"}
                </Text>
                <Ionicons name={isSTPickerOpen ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
              </TouchableOpacity>

              {isSTPickerOpen && (
                <View style={[styles.pickerWrapper, { 
                  position: 'absolute', 
                  top: 90, 
                  left: 16, 
                  right: 16, 
                  zIndex: 999,
                  backgroundColor: '#ffffff',
                  elevation: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10
                }]}>
                  <TextInput
                    style={[styles.input, { marginBottom: 8, height: 40, padding: 8 }]}
                    placeholder="Cari nomor atau tujuan ST..."
                    value={searchST}
                    onChangeText={setSearchST}
                  />
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} style={{ maxHeight: 250 }}>
                    <View style={{ width: '100%' }}>
                      <TouchableOpacity
                        style={[styles.stOptionItem, selectedSTId === "" && styles.stOptionActive]}
                        onPress={() => { handleSelectSuratTugas(""); setIsSTPickerOpen(false); }}
                      >
                        <Text style={[styles.stOptionText, selectedSTId === "" && { color: "#ffffff" }]}>
                          [ Tanpa Surat Tugas / Input Manual ]
                        </Text>
                      </TouchableOpacity>
                      {stOptions.filter(st => 
                        st.nomor_surat?.toLowerCase().includes(searchST.toLowerCase()) || 
                        st.maksud_tujuan?.toLowerCase().includes(searchST.toLowerCase())
                      ).map((st) => (
                        <TouchableOpacity
                          key={st.id}
                          style={[styles.stOptionItem, selectedSTId === st.id && styles.stOptionActive]}
                          onPress={() => { handleSelectSuratTugas(st.id); setIsSTPickerOpen(false); }}
                        >
                          <Text style={[styles.stOptionText, selectedSTId === st.id && { color: "#ffffff" }]}>
                            {st.nomor_surat ? `${st.nomor_surat} - ` : ""}
                            {st.maksud_tujuan.length > 80 ? st.maksud_tujuan.substring(0, 80) + "..." : st.maksud_tujuan}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {stOptions.filter(st => st.nomor_surat?.toLowerCase().includes(searchST.toLowerCase()) || st.maksud_tujuan?.toLowerCase().includes(searchST.toLowerCase())).length === 0 && <Text style={{ padding: 10, color: '#64748b' }}>Tidak ada ST yang cocok.</Text>}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          )}
          <Text style={styles.helpText}>Memilih Surat Tugas akan otomatis mengisi isian di bawah ini.</Text>
        </View>

        {/* SECTION: PENGATURAN COVER */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pengaturan Cover (Desain Hal. 1)</Text>
          <View style={styles.coverModesRow}>
            <TouchableOpacity 
              style={[styles.coverModeBtn, coverMode === "standard" && styles.coverModeBtnActive]}
              onPress={() => {
                setUseCustomCover(false);
                setCoverMode("standard");
                setCustomCoverFooter("BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR");
              }}
            >
              <Text style={[styles.coverModeText, coverMode === "standard" && { color: '#ffffff' }]}>Standar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.coverModeBtn, coverMode === "image" && styles.coverModeBtnActive]}
              onPress={() => {
                setUseCustomCover(true);
                setCoverMode("image");
              }}
            >
              <Text style={[styles.coverModeText, coverMode === "image" && { color: '#ffffff' }]}>Upload Gambar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.coverModeBtn, coverMode === "custom_text" && styles.coverModeBtnActive]}
              onPress={() => {
                setUseCustomCover(true);
                setCoverMode("custom_text");
              }}
            >
              <Text style={[styles.coverModeText, coverMode === "custom_text" && { color: '#ffffff' }]}>Teks Custom</Text>
            </TouchableOpacity>
          </View>

          {coverMode === "image" && (
            <View style={styles.coverImageUpload}>
              {customCoverImageUrl ? (
                <View style={{ position: 'relative' }}>
                  <Image source={{ uri: customCoverImageUrl }} style={styles.coverPreviewImage} />
                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => setCustomCoverImageUrl("")}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickCoverImage}>
                  <Ionicons name="image-outline" size={24} color="#059669" />
                  <Text style={styles.uploadBtnText}>Pilih Gambar Cover</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {coverMode === "custom_text" && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Teks Footer Instansi</Text>
              <TextInput style={styles.input} value={customCoverFooter} onChangeText={setCustomCoverFooter} />
            </View>
          )}
        </View>

        {/* SECTION: INFORMASI UMUM */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Umum Laporan</Text>
          <Text style={styles.label}>Judul Laporan</Text>
          <TextInput
            style={styles.input}
            value={judulLaporan}
            onChangeText={setJudulLaporan}
            placeholder="Contoh: PELAKSANAAN KEGIATAN..."
          />
          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Kota Laporan</Text>
              <TextInput style={styles.input} value={kotaLaporan} onChangeText={setKotaLaporan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tanggal Laporan</Text>
              <TouchableOpacity 
                style={[styles.input, { justifyContent: "center", paddingVertical: 10 }]} 
                onPress={() => setIsDatePickerOpen(true)}
              >
                <Text style={{ color: "#0f172a" }}>{tanggalLaporan || "Pilih Tanggal..."}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION: BAB I - PENDAHULUAN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BAB I - Pendahuluan</Text>
          
          <Text style={styles.label}>A. Agenda Pelaksanaan</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={agendaPelaksanaan}
            onChangeText={setAgendaPelaksanaan}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>B. Dasar Pelaksanaan</Text>
          {dasarPelaksanaan.map((item, idx) => (
            <View key={idx} style={styles.arrayItemRow}>
              <Text style={styles.bulletNum}>{idx + 1}.</Text>
              <TextInput
                style={[styles.input, { flex: 1, height: 60 }]}
                multiline
                value={item}
                onChangeText={(val) => {
                  const arr = [...dasarPelaksanaan];
                  arr[idx] = val;
                  setDasarPelaksanaan(arr);
                }}
              />
              <TouchableOpacity onPress={() => setDasarPelaksanaan(prev => prev.filter((_, i) => i !== idx))}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addArrayBtn} onPress={() => setDasarPelaksanaan([...dasarPelaksanaan, ""])}>
            <Ionicons name="add" size={16} color="#059669" />
            <Text style={styles.addArrayText}>Tambah Poin</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 16 }]}>C. Maksud & Tujuan (Otomatis digabung)</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Maksud</Text>
            <TextInput style={[styles.input, { height: 60 }]} multiline value={maksudText} onChangeText={setMaksudText} placeholder="Maksud..." />
          </View>
          <View style={{ marginTop: 4 }}>
            <Text style={styles.label}>Tujuan</Text>
            <TextInput style={[styles.input, { height: 60 }]} multiline value={tujuanText} onChangeText={setTujuanText} placeholder="Tujuan..." />
          </View>
        </View>

        {/* SECTION: BAB II & III */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BAB II & III - Isi Laporan</Text>
          
          <Text style={styles.label}>Waktu & Tempat Pelaksanaan</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={waktuTempat}
            onChangeText={setWaktuTempat}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Hasil Pelaksanaan</Text>
          {hasilPelaksanaan.map((item, idx) => (
            <View key={idx} style={styles.arrayItemRow}>
              <Text style={styles.bulletNum}>{idx + 1}.</Text>
              <TextInput
                style={[styles.input, { flex: 1, height: 80 }]}
                multiline
                value={item}
                onChangeText={(val) => {
                  const arr = [...hasilPelaksanaan];
                  arr[idx] = val;
                  setHasilPelaksanaan(arr);
                }}
              />
              <TouchableOpacity onPress={() => setHasilPelaksanaan(prev => prev.filter((_, i) => i !== idx))}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addArrayBtn} onPress={() => setHasilPelaksanaan([...hasilPelaksanaan, ""])}>
            <Ionicons name="add" size={16} color="#059669" />
            <Text style={styles.addArrayText}>Tambah Poin</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: DOKUMENTASI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dokumentasi / Lampiran</Text>
          {dokumentasiFoto.map((foto, idx) => (
            <View key={idx} style={styles.fotoRow}>
              <Image source={{ uri: foto.url }} style={styles.fotoThumb} />
              <TextInput
                style={[styles.input, { flex: 1, height: 40, marginLeft: 12, marginBottom: 0 }]}
                value={foto.caption}
                onChangeText={(val) => {
                  const arr = [...dokumentasiFoto];
                  arr[idx].caption = val;
                  setDokumentasiFoto(arr);
                }}
                placeholder="Caption Foto"
              />
              <TouchableOpacity onPress={() => setDokumentasiFoto(prev => prev.filter((_, i) => i !== idx))}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDokumentasi}>
            <Ionicons name="camera-outline" size={20} color="#059669" />
            <Text style={styles.uploadBtnText}>Tambah Foto</Text>
          </TouchableOpacity>
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity style={styles.previewBtn} onPress={handlePreview}>
          <Ionicons name="print-outline" size={20} color="#ffffff" />
          <Text style={styles.previewBtnText}>Pratinjau & Cetak Laporan</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <AppDatePickerModal
        visible={isDatePickerOpen}
        value={tanggalLaporan}
        title="Tanggal Laporan"
        onConfirm={(date) => {
          setTanggalLaporan(date);
          setIsDatePickerOpen(false);
        }}
        onClose={() => setIsDatePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 12,
    textAlignVertical: "top",
  },
  rowInputs: { flexDirection: "row" },
  pickerWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
  },
  stOptionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  stOptionActive: { backgroundColor: "#059669" },
  stOptionText: { fontSize: 12, color: "#334155" },
  helpText: { fontSize: 11, color: "#64748b", marginTop: 8 },
  arrayItemRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  bulletNum: { width: 20, fontSize: 13, fontWeight: "600", color: "#64748b", marginTop: 14 },
  addArrayBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ecfdf5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addArrayText: { fontSize: 12, fontWeight: "600", color: "#059669", marginLeft: 4 },
  coverModesRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  coverModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
  },
  coverModeBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  coverModeText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  coverImageUpload: { marginTop: 12 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#059669",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
  },
  uploadBtnText: { fontSize: 13, fontWeight: "600", color: "#059669", marginLeft: 8 },
  coverPreviewImage: { width: "100%", height: 180, borderRadius: 12, resizeMode: "cover" },
  deletePhotoBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "#ffffff", borderRadius: 20, padding: 6, elevation: 4
  },
  fotoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  fotoThumb: { width: 60, height: 60, borderRadius: 8 },
  previewBtn: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  previewBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700", marginLeft: 8 },
});
