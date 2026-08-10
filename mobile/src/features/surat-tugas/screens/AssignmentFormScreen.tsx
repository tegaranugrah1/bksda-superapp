import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { apiClient } from "@/lib/api/client";

interface Employee {
  id: string | number;
  name: string;
  nip: string;
  department?: string;
  position?: string;
}

const SUMBER_DANA_OPTIONS = [
  { id: "dipa", label: "DIPA" },
  { id: "kja", label: "Dana Kerjasama KJA" },
  { id: "mja", label: "Dana Kerjasama MJA" },
  { id: "cop", label: "Dana Kerjasama COP" },
  { id: "tjiwi", label: "Dana Kerjasama PT. Tjiwi Kimia Tbk." },
  { id: "bosf", label: "Dana Kerjasama BOSF" },
  { id: "can", label: "Dana Kerjasama CAN" },
  { id: "alert", label: "Dana Kerjasama ALeRT" },
  { id: "folu", label: "Dana Kerjasama FOLU" },
  { id: "dl1", label: "DL 1 / Tidak ada biaya" },
  { id: "other", label: "Lainnya" },
];

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatDateIndo(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (month >= 0 && month < 12) {
    return `${day} ${MONTH_NAMES[month]} ${year}`;
  }
  return dateStr;
}

export default function AssignmentFormScreen() {
  const navigation = useNavigation<any>();

  // Wizard Step: 1 = Pilih Pegawai, 2 = Detail ST, 3 = Berhasil
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Employee Selection (Step 1)
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Detail Form (Step 2)
  const [jenisTugas, setJenisTugas] = useState<
    "Perjalanan Dinas ( Lebih dari 1 Hari )" | "Melaksanakan Kegiatan ( 1 Hari )" | "Menugaskan Staf"
  >("Perjalanan Dinas ( Lebih dari 1 Hari )");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [namaKegiatanText, setNamaKegiatanText] = useState("");
  const [tempatSpesifik, setTempatSpesifik] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Pickers State
  const [sumberDanaModalVisible, setSumberDanaModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"mulai" | "selesai" | "single" | null>(null);

  const isSingleDayActivity = jenisTugas.includes("1 Hari") || jenisTugas.includes("Melaksanakan Kegiatan");

  // Date picker internal state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Fetch employees for autocomplete search
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true);
      try {
        const response = await apiClient.get("/kepegawaian/employees/select");
        const list = response.data?.data || response.data || [];
        setAllEmployees(
          list.map((e: any) => ({
            id: e.id,
            name: e.name || e.nama_lengkap || e.nama || e.nip || "Pegawai",
            nip: e.nip || "",
            department: e.department || e.satuan_kerja || "",
            position: e.position || e.jabatan || "",
          }))
        );
      } catch (err) {
        console.error("Error fetching employees:", err);
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Filter search results
  const searchResults = allEmployees
    .filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.nip && emp.nip.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .slice(0, 30);

  // Auto detect kota asal by satker
  const detectDefaultKotaAsal = useCallback((employees: Employee[]) => {
    if (!employees || employees.length === 0) return "Samarinda";
    const depts = employees.map((e) => (e.department || "").toLowerCase());
    if (depts.every((d) => d.includes("seksi i") || d.includes("seksi 1") || d.includes("berau"))) return "Berau";
    if (depts.every((d) => d.includes("seksi ii") || d.includes("seksi 2") || d.includes("tenggarong"))) return "Tenggarong";
    if (depts.every((d) => d.includes("seksi iii") || d.includes("seksi 3") || d.includes("balikpapan"))) return "Balikpapan";
    return "Samarinda";
  }, []);

  const toggleEmployee = (emp: Employee) => {
    const validName = emp.name || emp.nip || "Pegawai";
    const isSelected = selectedEmployees.some((e) => String(e.id) === String(emp.id));
    const next = isSelected
      ? selectedEmployees.filter((e) => String(e.id) !== String(emp.id))
      : [...selectedEmployees, { ...emp, name: validName }];
    setSelectedEmployees(next);
    setKotaAsal(detectDefaultKotaAsal(next));
    if (!isSelected) {
      setSearchQuery("");
      setShowDropdown(false);
    }
  };

  const removeEmployee = (id: string | number) => {
    const next = selectedEmployees.filter((e) => String(e.id) !== String(id));
    setSelectedEmployees(next);
    setKotaAsal(detectDefaultKotaAsal(next));
  };

  // Pick PDF file
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        if (fileAsset.size && fileAsset.size > 10 * 1024 * 1024) {
          Alert.alert("Ukuran File Terlalu Besar", "Ukuran maksimal file PDF adalah 10 MB.");
          return;
        }
        setSelectedFile(fileAsset);
      }
    } catch (err) {
      console.error("Document pick error:", err);
    }
  };

  // Date Picker Open Handler
  const openDatePicker = (target: "mulai" | "selesai" | "single") => {
    setDatePickerTarget(target);
    const currentDateStr = target === "selesai" ? tanggalSelesai : tanggalMulai;
    if (currentDateStr && currentDateStr.includes("-")) {
      const parts = currentDateStr.split("-");
      if (parts.length === 3) {
        setCalYear(parseInt(parts[0], 10));
        setCalMonth(parseInt(parts[1], 10) - 1);
      }
    } else {
      setCalYear(today.getFullYear());
      setCalMonth(today.getMonth());
    }
    setDatePickerVisible(true);
  };

  const applySelectedDate = (dateObj: Date) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const formattedStr = `${yyyy}-${mm}-${dd}`;

    if (isSingleDayActivity || datePickerTarget === "single") {
      setTanggalMulai(formattedStr);
      setTanggalSelesai(formattedStr);
    } else if (datePickerTarget === "mulai") {
      setTanggalMulai(formattedStr);
      if (!tanggalSelesai) setTanggalSelesai(formattedStr);
    } else if (datePickerTarget === "selesai") {
      setTanggalSelesai(formattedStr);
    }
    setDatePickerVisible(false);
  };

  // Handle Form Submission
  const handleSubmit = async () => {
    if (!kotaTujuan.trim()) {
      Alert.alert("Form Belum Lengkap", "Mohon isi Kota / Kabupaten Tujuan.");
      return;
    }
    if (!namaKegiatanText.trim()) {
      Alert.alert("Form Belum Lengkap", "Mohon isi deskripsi / maksud kegiatan.");
      return;
    }
    if (!tanggalMulai || !tanggalSelesai) {
      Alert.alert("Form Belum Lengkap", "Mohon isi Tanggal Mulai dan Tanggal Selesai.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalNamaKegiatan = `${jenisTugas}`;
      if (jenisTugas.includes("Perjalanan Dinas")) {
        finalNamaKegiatan = `Melaksanakan Perjalanan Dinas dari ${kotaAsal.trim() || "..."} ke ${kotaTujuan.trim() || "..."}${namaKegiatanText.trim() ? ` dalam rangka ${namaKegiatanText.trim()}` : ""}${tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : ""}`;
      } else if (jenisTugas.includes("Melaksanakan Kegiatan")) {
        finalNamaKegiatan = `Melaksanakan Kegiatan ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
      } else {
        finalNamaKegiatan = `Menugaskan Staf untuk ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
      }

      const calculatedTempatTujuan = tempatSpesifik.trim() || kotaTujuan.trim() || (jenisTugas.includes("Perjalanan Dinas") ? kotaAsal.trim() : "");

      const formData = new FormData();
      formData.append("maksud_tujuan", finalNamaKegiatan);
      formData.append("nama_kegiatan", finalNamaKegiatan);
      formData.append("tempat_tujuan", calculatedTempatTujuan);
      formData.append("tanggal_mulai", tanggalMulai);
      formData.append("tanggal_selesai", tanggalSelesai);
      formData.append("sumber_dana", sumberDana);

      if (sumberDana === "other" && sumberDanaOther) {
        formData.append("sumber_dana_other", sumberDanaOther);
      }
      if (keterangan) {
        formData.append("keterangan", keterangan);
      }

      selectedEmployees.forEach((emp, index) => {
        formData.append(`employees[${index}][id]`, String(emp.id));
      });

      if (selectedFile) {
        formData.append("file_surat", {
          uri: selectedFile.uri,
          name: selectedFile.name || "dasar-surat.pdf",
          type: "application/pdf",
        } as any);
      }

      await apiClient.post("/surat-tugas/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStep(3);
    } catch (err: any) {
      console.error("Submit portal ST error:", err);
      const msg = err?.response?.data?.message || err?.message || "Gagal mengirimkan pengajuan Surat Tugas.";
      Alert.alert("Gagal Mengajukan Surat Tugas", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live generated preview text
  const previewText = jenisTugas.includes("Perjalanan Dinas")
    ? `Melaksanakan Perjalanan Dinas dari ${kotaAsal || "..."} ke ${kotaTujuan || "..."}${namaKegiatanText ? ` dalam rangka ${namaKegiatanText}` : ""}${tempatSpesifik ? ` di ${tempatSpesifik}` : ""}`
    : jenisTugas.includes("Melaksanakan Kegiatan")
    ? `Melaksanakan Kegiatan ${namaKegiatanText || "..."}${tempatSpesifik ? ` pada ${tempatSpesifik}` : ""}${kotaTujuan ? ` di ${kotaTujuan}` : ""}`
    : `Menugaskan Staf untuk ${namaKegiatanText || "..."}${tempatSpesifik ? ` pada ${tempatSpesifik}` : ""}${kotaTujuan ? ` di ${kotaTujuan}` : ""}`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#f8fafc" }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Step 1: Pilih Pegawai */}
        {step === 1 && (
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Pengajuan Surat Tugas</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.iconHeaderBg}>
                <Ionicons name="people" size={28} color="#2563eb" />
              </View>
              <Text style={styles.cardTitle}>Pilih Pegawai</Text>
              <Text style={styles.cardSubtitle}>Cari dan tambahkan pegawai yang akan melaksanakan tugas.</Text>

              {/* Selected List */}
              <Text style={styles.sectionLabel}>DAFTAR PEGAWAI YANG DITUGASKAN</Text>
              {selectedEmployees.length === 0 ? (
                <View style={styles.emptySelectedBox}>
                  <Ionicons name="person-add-outline" size={24} color="#94a3b8" />
                  <Text style={styles.emptySelectedText}>Belum ada pegawai dipilih</Text>
                </View>
              ) : (
                <View style={styles.chipContainer}>
                  {selectedEmployees.map((emp) => (
                    <View key={String(emp.id)} style={styles.chip}>
                      <View style={{ flexShrink: 1, marginRight: 6 }}>
                        <Text style={styles.chipName}>{emp.name || emp.nip || "Pegawai"}</Text>
                        {(emp.department || emp.nip) ? (
                          <Text style={styles.chipDept}>{emp.department || emp.nip}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => removeEmployee(emp.id)} style={styles.chipRemoveBtn}>
                        <Ionicons name="close" size={14} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Search Box */}
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ketik nama atau NIP pegawai (min. 2 karakter)..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={(val) => {
                    setSearchQuery(val);
                    setShowDropdown(val.length >= 2);
                  }}
                  onFocus={() => {
                    if (searchQuery.length >= 2) setShowDropdown(true);
                  }}
                />
                {isLoadingEmployees && <ActivityIndicator size="small" color="#2563eb" />}
              </View>

              {/* Dropdown Results */}
              {showDropdown && searchResults.length > 0 && (
                <View style={styles.dropdown}>
                  {searchResults.map((emp) => {
                    const isSelected = selectedEmployees.some((e) => String(e.id) === String(emp.id));
                    return (
                      <TouchableOpacity
                        key={String(emp.id)}
                        style={[styles.dropdownRow, isSelected && { backgroundColor: "#f1f5f9" }]}
                        onPress={() => toggleEmployee(emp)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownName, isSelected && { color: "#94a3b8" }]}>{emp.name}</Text>
                          <Text style={styles.dropdownDept}>{emp.department || emp.nip}</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#10b981" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  selectedEmployees.length === 0 && { opacity: 0.5 },
                  { marginTop: 24 },
                ]}
                disabled={selectedEmployees.length === 0}
                onPress={() => setStep(2)}
              >
                <Text style={styles.btnPrimaryText}>Lanjutkan</Text>
                <Ionicons name="chevron-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Step 2: Detail ST */}
        {step === 2 && (
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Detail Surat Tugas</Text>
            </View>

            <View style={styles.card}>
              {/* Selected Employees Banner */}
              <View style={styles.bannerBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#047857" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Daftar Pegawai ({selectedEmployees.length})</Text>
                  <Text style={styles.bannerText}>
                    {selectedEmployees.map((e) => e.name).join(", ")}
                  </Text>
                </View>
              </View>

              {/* Jenis Tugas */}
              <Text style={styles.fieldLabel}>JENIS TUGAS *</Text>
              <View style={styles.jenisTugasContainer}>
                {(
                  [
                    "Perjalanan Dinas ( Lebih dari 1 Hari )",
                    "Melaksanakan Kegiatan ( 1 Hari )",
                    "Menugaskan Staf",
                  ] as const
                ).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.jenisTugasOption,
                      jenisTugas === opt && styles.jenisTugasActive,
                    ]}
                    onPress={() => {
                      setJenisTugas(opt);
                      if (opt.includes("1 Hari") || opt.includes("Melaksanakan Kegiatan")) {
                        if (tanggalMulai) setTanggalSelesai(tanggalMulai);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.jenisTugasText,
                        jenisTugas === opt && styles.jenisTugasActiveText,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dynamic Inputs based on Jenis Tugas */}
              {jenisTugas.includes("Perjalanan Dinas") ? (
                <>
                  <Text style={styles.fieldLabel}>DARI ( KOTA / LOKASI ASAL ) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={kotaAsal}
                    onChangeText={setKotaAsal}
                    placeholder="Contoh: Samarinda"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.fieldLabel}>KE ( KOTA / KABUPATEN TUJUAN ) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={kotaTujuan}
                    onChangeText={setKotaTujuan}
                    placeholder="Contoh: Kabupaten Kutai Barat"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.fieldLabel}>DALAM RANGKA *</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
                    multiline
                    value={namaKegiatanText}
                    onChangeText={setNamaKegiatanText}
                    placeholder="Contoh: Kegiatan Inventarisasi dan Verifikasi Keanekaragaman Hayati..."
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.fieldLabel}>DI ( TEMPAT SPESIFIK / OPSIONAL )</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempatSpesifik}
                    onChangeText={setTempatSpesifik}
                    placeholder="Contoh: Suaka Margasatwa Kelian"
                    placeholderTextColor="#94a3b8"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>
                    {jenisTugas.includes("Melaksanakan Kegiatan")
                      ? "NAMA KEGIATAN ( 1 HARI ) *"
                      : "TUGAS STAF *"}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
                    multiline
                    value={namaKegiatanText}
                    onChangeText={setNamaKegiatanText}
                    placeholder="Masukkan uraian kegiatan..."
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.fieldLabel}>PADA ( TEMPAT / UNIT LOKASI )</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempatSpesifik}
                    onChangeText={setTempatSpesifik}
                    placeholder="Contoh: Kantor Balai / tempat kegiatannya"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.fieldLabel}>DI ( KOTA / KABUPATEN ) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={kotaTujuan}
                    onChangeText={setKotaTujuan}
                    placeholder="Contoh: Samarinda"
                    placeholderTextColor="#94a3b8"
                  />
                </>
              )}

              {/* Live Preview Box */}
              <View style={styles.previewBox}>
                <Text style={styles.previewHeader}>📌 PRATINJAU TEKS HASIL RESMI</Text>
                <Text style={styles.previewText}>{previewText}</Text>
              </View>

              {/* Date Pickers (Mulai & Sampai Tanggal or Single Date) */}
              {isSingleDayActivity ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.fieldLabel}>TANGGAL KEGIATAN ( 1 HARI ) *</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => openDatePicker("single")}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text style={[styles.datePickerBtnText, !tanggalMulai && { color: "#94a3b8" }]}>
                      {tanggalMulai ? formatDateIndo(tanggalMulai) : "Pilih Tanggal"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>MULAI TANGGAL *</Text>
                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => openDatePicker("mulai")}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={[styles.datePickerBtnText, !tanggalMulai && { color: "#94a3b8" }]}>
                        {tanggalMulai ? formatDateIndo(tanggalMulai) : "Pilih Tanggal"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>SAMPAI TANGGAL *</Text>
                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => openDatePicker("selesai")}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={[styles.datePickerBtnText, !tanggalSelesai && { color: "#94a3b8" }]}>
                        {tanggalSelesai ? formatDateIndo(tanggalSelesai) : "Pilih Tanggal"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Sumber Dana Compact Dropdown Selector */}
              <Text style={styles.fieldLabel}>SUMBER DANA *</Text>
              <TouchableOpacity
                style={styles.selectDropdownBtn}
                onPress={() => setSumberDanaModalVisible(true)}
              >
                <Ionicons name="wallet-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.selectDropdownValue}>
                  {SUMBER_DANA_OPTIONS.find((o) => o.id === sumberDana)?.label || "Pilih Sumber Dana"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </TouchableOpacity>

              {sumberDana === "other" && (
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  value={sumberDanaOther}
                  onChangeText={setSumberDanaOther}
                  placeholder="Ketik sumber dana lainnya..."
                  placeholderTextColor="#94a3b8"
                />
              )}

              {/* Upload Dasar Surat */}
              <Text style={styles.fieldLabel}>UPLOAD DASAR SURAT (OPSIONAL)</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
                <Ionicons name="cloud-upload-outline" size={28} color="#2563eb" />
                <Text style={styles.uploadTitle}>
                  {selectedFile ? selectedFile.name : "Klik untuk upload file PDF"}
                </Text>
                <Text style={styles.uploadSubtitle}>Format PDF Max 10MB</Text>
              </TouchableOpacity>

              {/* Keterangan */}
              <Text style={styles.fieldLabel}>KETERANGAN LAINNYA (OPSIONAL)</Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: "top" }]}
                multiline
                value={keterangan}
                onChangeText={setKeterangan}
                placeholder="Catatan tambahan (opsional)"
                placeholderTextColor="#94a3b8"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.btnSubmit, isSubmitting && { opacity: 0.7 }]}
                disabled={isSubmitting}
                onPress={handleSubmit}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.btnSubmitText}>Submit Pengajuan</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <View style={styles.successContainer}>
            <View style={styles.cardSuccess}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={56} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>Pengajuan Surat Tugas Berhasil!</Text>
              <Text style={styles.successMessage}>
                Pengajuan Surat Tugas telah berhasil dikirim dan menunggu proses verifikasi.
              </Text>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => {
                  if (navigation && typeof navigation.navigate === "function") {
                    navigation.navigate("Dashboard");
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={styles.btnPrimaryText}>Oke, Saya Mengerti</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modal Picker: Sumber Dana */}
        <Modal visible={sumberDanaModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Sumber Dana</Text>
                <TouchableOpacity onPress={() => setSumberDanaModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {SUMBER_DANA_OPTIONS.map((opt) => {
                  const isSelected = opt.id === sumberDana;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.modalOptionRow, isSelected && styles.modalOptionActive]}
                      onPress={() => {
                        setSumberDana(opt.id);
                        setSumberDanaModalVisible(false);
                      }}
                    >
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSelected ? "#2563eb" : "#94a3b8"}
                        style={{ marginRight: 12 }}
                      />
                      <Text style={[styles.modalOptionText, isSelected && { color: "#2563eb", fontWeight: "700" }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal Picker: Visual Monthly Calendar Grid Modal */}
        <Modal visible={datePickerVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {datePickerTarget === "single" ? "Pilih Tanggal Kegiatan" : datePickerTarget === "mulai" ? "Pilih Tanggal Mulai" : "Pilih Tanggal Selesai"}
                </Text>
                <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Date Presets */}
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => applySelectedDate(new Date())}
                >
                  <Text style={styles.presetText}>Hari Ini</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    applySelectedDate(d);
                  }}
                >
                  <Text style={styles.presetText}>Besok</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    applySelectedDate(d);
                  }}
                >
                  <Text style={styles.presetText}>+3 Hari</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    applySelectedDate(d);
                  }}
                >
                  <Text style={styles.presetText}>+7 Hari</Text>
                </TouchableOpacity>
              </View>

              {/* Calendar Month & Year Header Navigation */}
              <View style={styles.calHeader}>
                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  style={styles.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={20} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.calMonthText}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  style={styles.calNavBtn}
                >
                  <Ionicons name="chevron-forward" size={20} color="#1e293b" />
                </TouchableOpacity>
              </View>

              {/* Day Names Row */}
              <View style={styles.calDaysRow}>
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((dName) => (
                  <Text key={dName} style={styles.calDayNameText}>{dName}</Text>
                ))}
              </View>

              {/* Monthly Calendar Days Grid */}
              <View style={styles.calGrid}>
                {Array.from({ length: (new Date(calYear, calMonth, 1).getDay() + 6) % 7 }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.calDayCell} />
                ))}

                {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateObj = new Date(calYear, calMonth, dayNum);
                  const yyyy = calYear;
                  const mm = String(calMonth + 1).padStart(2, "0");
                  const dd = String(dayNum).padStart(2, "0");
                  const formattedStr = `${yyyy}-${mm}-${dd}`;

                  const isSelected = datePickerTarget === "mulai" ? tanggalMulai === formattedStr : tanggalSelesai === formattedStr;
                  const isToday =
                    today.getFullYear() === calYear &&
                    today.getMonth() === calMonth &&
                    today.getDate() === dayNum;

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[
                        styles.calDayCell,
                        isToday && styles.calDayToday,
                        isSelected && styles.calDaySelected,
                      ]}
                      onPress={() => applySelectedDate(dateObj)}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          isToday && styles.calDayTodayText,
                          isSelected && styles.calDaySelectedText,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16 },
  headerBar: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  card: { backgroundColor: "#ffffff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  iconHeaderBg: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  cardSubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4, marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8 },
  emptySelectedBox: { padding: 24, borderRadius: 16, borderWidth: 2, borderColor: "#cbd5e1", borderStyle: "dashed", backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  emptySelectedText: { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginTop: 6 },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "100%" },
  chipName: { fontSize: 13, fontWeight: "700", color: "#1e3a8a" },
  chipDept: { fontSize: 11, color: "#2563eb", marginTop: 1 },
  chipRemoveBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, paddingHorizontal: 12, height: 48, marginTop: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#0f172a", fontWeight: "500" },
  dropdown: { marginTop: 4, backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", maxHeight: 200, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
  dropdownRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  dropdownDept: { fontSize: 11, color: "#64748b", marginTop: 2 },
  btnPrimary: { backgroundColor: "#0f172a", height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  btnPrimaryText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  bannerBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0", borderRadius: 14, padding: 12, marginBottom: 16 },
  bannerTitle: { fontSize: 13, fontWeight: "800", color: "#047857" },
  bannerText: { fontSize: 12, color: "#065f46", marginTop: 2 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#64748b", letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  jenisTugasContainer: { gap: 6, marginBottom: 4 },
  jenisTugasOption: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff" },
  jenisTugasActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  jenisTugasText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  jenisTugasActiveText: { color: "#1e40af" },
  textInput: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#0f172a", fontWeight: "500" },
  previewBox: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  previewHeader: { fontSize: 10, fontWeight: "800", color: "#2563eb", letterSpacing: 0.5, marginBottom: 4 },
  previewText: { fontSize: 12, fontWeight: "700", color: "#1e3a8a", lineHeight: 18 },
  datePickerBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingHorizontal: 12, height: 44 },
  datePickerBtnText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  selectDropdownBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingHorizontal: 12, height: 46, justifyContent: "space-between" },
  selectDropdownValue: { flex: 1, fontSize: 13, fontWeight: "700", color: "#0f172a" },
  uploadBox: { borderRadius: 14, borderWidth: 2, borderColor: "#cbd5e1", borderStyle: "dashed", backgroundColor: "#f8fafc", padding: 16, alignItems: "center", justifyContent: "center" },
  uploadTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginTop: 6 },
  uploadSubtitle: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  btnSubmit: { backgroundColor: "#10b981", height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 24 },
  btnSubmitText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  successContainer: { flex: 1, justifyContent: "center", padding: 20 },
  cardSuccess: { backgroundColor: "#ffffff", borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  successIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  successMessage: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8, marginBottom: 24, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  modalOptionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  modalOptionActive: { backgroundColor: "#eff6ff" },
  modalOptionText: { fontSize: 13, color: "#334155", fontWeight: "600" },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  presetBtn: { flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  presetText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8, paddingHorizontal: 4 },
  calNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  calMonthText: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  calDaysRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  calDayNameText: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDayCell: { width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center", marginVertical: 2, borderRadius: 20 },
  calDayText: { fontSize: 13, fontWeight: "600", color: "#1e293b" },
  calDayToday: { borderWidth: 1, borderColor: "#2563eb" },
  calDayTodayText: { color: "#2563eb", fontWeight: "800" },
  calDaySelected: { backgroundColor: "#2563eb" },
  calDaySelectedText: { color: "#ffffff", fontWeight: "800" },
});
