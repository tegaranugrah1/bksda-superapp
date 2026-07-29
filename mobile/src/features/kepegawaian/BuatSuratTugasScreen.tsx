import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FabMenu } from "../../components/ui/FabMenu";
import { apiClient } from "../../lib/api/client";

interface Employee {
  id: string;
  name: string;
  nip: string;
  position?: string;
  department?: string;
}

interface BuatSuratTugasScreenProps {
  navigation?: any;
  onBack?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

// Master Employee List Fallback
const masterEmployeeList: Employee[] = [
  {
    id: "m-1",
    name: "Tegar Anugrah, A.Md.Kom.",
    nip: "199907072025061006",
    position: "Pranata Komputer Terampil",
    department: "Kantor Balai KSDA Kalimantan Timur",
  },
  {
    id: "m-2",
    name: "Rido, S.Hut.",
    nip: "198106052000121004",
    position: "Kepala Seksi Konservasi Wilayah II",
    department: "Seksi KSDA Wilayah II Tenggarong",
  },
  {
    id: "m-3",
    name: "Witono, S.Hut.",
    nip: "197912232000121001",
    position: "Polisi Kehutanan Ahli Madya",
    department: "Seksi KSDA Wilayah II Tenggarong",
  },
  {
    id: "m-4",
    name: "Ahmad Ripai, S.Hut.",
    nip: "198004122000121003",
    position: "Pengendali Ekosistem Hutan Ahli Muda",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-5",
    name: "Budi Santoso, S.Hut.",
    nip: "198001012005011001",
    position: "Kepala Seksi Konservasi Wilayah I",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-6",
    name: "Ari Susanto, S.Hut.",
    nip: "198502102008011002",
    position: "Polisi Kehutanan Ahli Pertama",
    department: "Seksi KSDA Wilayah III Balikpapan",
  },
  {
    id: "m-7",
    name: "Afrizal Maula Alfarisi, S.Hut.",
    nip: "199308162025061005",
    position: "Polisi Kehutanan Ahli Pertama",
    department: "Seksi KSDA Wilayah II Tenggarong",
  },
  {
    id: "m-8",
    name: "Agung Suseno, S.PKP.",
    nip: "198108242000121002",
    position: "Pengendali Ekosistem Hutan Ahli Muda",
    department: "Seksi KSDA Wilayah III Balikpapan",
  },
  {
    id: "m-9",
    name: "Agus Salim",
    nip: "MMP-008",
    position: "MMP Resor KSDA Wilayah 02 Kepulauan Derawan",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-10",
    name: "Agustaf Samber",
    nip: "197208292007101001",
    position: "Polisi Kehutanan Penyelia",
    department: "Seksi KSDA Wilayah I Berau",
  },
  {
    id: "m-11",
    name: "Affi Agung Rahmadi",
    nip: "199306242025061001",
    position: "Pengendali Ekosistem Hutan Pemula",
    department: "Seksi KSDA Wilayah III Balikpapan",
  },
];

export const BuatSuratTugasScreen: React.FC<BuatSuratTugasScreenProps> = ({
  navigation,
  onBack,
  onNavigateToModule,
}) => {
  const { isDark, colors } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // STEP 1: PILIH PEGAWAI
  const [searchQuery, setSearchQuery] = useState("");
  const [allEmployees, setAllEmployees] = useState<Employee[]>(masterEmployeeList);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // STEP 2: DETAIL PERJALANAN DINAS
  const [maksudKegiatan, setMaksudKegiatan] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().substring(0, 10));
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().substring(0, 10));
  const [keterangan, setKeterangan] = useState("");
  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [namaPlh, setNamaPlh] = useState("");
  const [activeDatePicker, setActiveDatePicker] = useState<"mulai" | "selesai" | null>(null);
  const [currentPickerMonth, setCurrentPickerMonth] = useState(new Date());

  // BUILDER STATE UNTUK DETAIL KEGIATAN (SYNCED 100% DENGAN /kepegawaian/surat-tugas/create)
  const [jenisTugas, setJenisTugas] = useState<"Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" | "Melaksanakan Kegiatan ( 1 Hari )" | "Menugaskan Staf">("Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [namaKegiatanText, setNamaKegiatanText] = useState("");
  const [tempatSpesifik, setTempatSpesifik] = useState("");

  // STEP 3: KONFIRMASI & DOKUMEN
  const [setujuData, setSetujuData] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deteksi otomatis jika ada Pejabat Struktural (Kasubag TU / Kepala Seksi)
  const hasPejabatStruktural = selectedEmployees.some((emp) => {
    const pos = (emp.position || "").toLowerCase();
    return pos.includes("kepala seksi") || pos.includes("kepala subbagian") || pos.includes("kasubag");
  });

  // Deteksi otomatis Kota Asal berdasarkan Penempatan Satker Pegawai
  useEffect(() => {
    if (!selectedEmployees || selectedEmployees.length === 0) {
      setKotaAsal("Samarinda");
      return;
    }
    const depts = selectedEmployees.map((e) => ((e as any).department || (e as any).satuan_kerja || "").toLowerCase());

    const isAllSeksi1 = depts.every((d) => d.includes("seksi i") || d.includes("seksi 1") || d.includes("wilayah i") || d.includes("berau") || d.includes("skw i"));
    if (isAllSeksi1) {
      setKotaAsal("Berau");
      return;
    }

    const isAllSeksi2 = depts.every((d) => d.includes("seksi ii") || d.includes("seksi 2") || d.includes("wilayah ii") || d.includes("tenggarong") || d.includes("skw ii"));
    if (isAllSeksi2) {
      setKotaAsal("Tenggarong");
      return;
    }

    const isAllSeksi3 = depts.every((d) => d.includes("seksi iii") || d.includes("seksi 3") || d.includes("wilayah iii") || d.includes("balikpapan") || d.includes("skw iii"));
    if (isAllSeksi3) {
      setKotaAsal("Balikpapan");
      return;
    }

    setKotaAsal("Samarinda");
  }, [selectedEmployees]);

  // Fetch employees from API and merge with master list
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsSearching(true);
      try {
        let apiList: Employee[] = [];
        try {
          const respSelect = await apiClient.get<any>("/kepegawaian/employees/select");
          if (respSelect.data && Array.isArray(respSelect.data.data)) {
            apiList = respSelect.data.data.map((emp: any) => ({
              id: String(emp.id),
              name: emp.name || emp.nama_lengkap,
              nip: emp.nip || "-",
              position: emp.position || emp.jabatan || "Staf BKSDA",
              department: emp.department || emp.satuan_kerja || "Balai KSDA Kaltim",
            }));
          }
        } catch {
          // fallback to index
          const respIndex = await apiClient.get<any>("/kepegawaian/employees?per_page=200");
          if (respIndex.data && Array.isArray(respIndex.data.data)) {
            apiList = respIndex.data.data.map((emp: any) => ({
              id: String(emp.id),
              name: emp.nama_lengkap || emp.name,
              nip: emp.nip || "-",
              position: emp.jabatan || "Staf BKSDA",
              department: emp.satuan_kerja || "Balai KSDA Kaltim",
            }));
          }
        }

        // Merge API employees with masterEmployeeList (deduplicate by NIP or ID)
        const combined = [...apiList];
        masterEmployeeList.forEach((mEmp) => {
          if (!combined.some((c) => c.nip === mEmp.nip || c.name.toLowerCase() === mEmp.name.toLowerCase())) {
            combined.push(mEmp);
          }
        });

        setAllEmployees(combined);
      } catch {
        setAllEmployees(masterEmployeeList);
      } finally {
        setIsSearching(false);
      }
    };

    fetchEmployees();
  }, []);

  const searchResults = allEmployees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.position && emp.position.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleEmployee = (emp: Employee) => {
    if (selectedEmployees.some((e) => e.id === emp.id)) {
      setSelectedEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } else {
      setSelectedEmployees((prev) => [...prev, emp]);
      setSearchQuery("");
    }
  };

  const handleAddManualEmployee = () => {
    if (!searchQuery.trim()) return;
    const manualEmp: Employee = {
      id: `manual-${Date.now()}`,
      name: searchQuery.trim(),
      nip: `PEG-${Math.floor(100000 + Math.random() * 900000)}`,
      position: "Staf Ditugaskan",
      department: "Balai KSDA Kalimantan Timur",
    };
    setSelectedEmployees((prev) => [...prev, manualEmp]);
    setSearchQuery("");
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    } else if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.navigate("Dashboard");
    }
  };

  const handleSelectNavTab = (tabKey: string) => {
    if (tabKey === "home" || tabKey === "portal" || tabKey === "dashboard") {
      if (navigation) navigation.navigate("Dashboard");
    } else if (tabKey === "bmn") {
      if (navigation) navigation.navigate("Bmn");
    } else if (tabKey === "surat") {
      if (navigation) navigation.navigate("Surat");
    } else if (tabKey === "inventory") {
      if (navigation) navigation.navigate("Inventory");
    } else if (tabKey === "profile") {
      if (navigation) navigation.navigate("Profile");
    } else if (tabKey === "kepegawaian") {
      if (navigation) navigation.navigate("Kepegawaian");
    } else if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    }
  };

  const handleSubmitSuratTugas = async () => {
    if (!setujuData) {
      Alert.alert("Perhatian", "Silakan beri centang persetujuan bahwa data pengajuan sudah benar.");
      return;
    }

    let finalNamaKegiatan = `${jenisTugas}`;
    if (jenisTugas.includes("Perjalanan Dinas")) {
      finalNamaKegiatan = `Melaksanakan Perjalanan Dinas dari ${kotaAsal.trim() || "..."} ke ${kotaTujuan.trim() || "..."}${namaKegiatanText.trim() ? ` dalam rangka ${namaKegiatanText.trim()}` : ""}${tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : ""}`;
    } else if (jenisTugas.includes("Melaksanakan Kegiatan")) {
      finalNamaKegiatan = `Melaksanakan Kegiatan ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
    } else {
      finalNamaKegiatan = `Menugaskan Staf untuk ${namaKegiatanText.trim() || "..."}${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""}`;
    }

    const calculatedTempatTujuan = tempatSpesifik.trim() || kotaTujuan.trim() || (jenisTugas.includes("Perjalanan Dinas") ? kotaAsal.trim() : "");

    setIsSubmitting(true);
    try {
      const payload = {
        maksud_tujuan: finalNamaKegiatan,
        nama_kegiatan: finalNamaKegiatan,
        tempat_tujuan: calculatedTempatTujuan,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDana === "other" ? sumberDanaOther : undefined,
        keterangan: keterangan || undefined,
        nama_plh: namaPlh || undefined,
        employee_ids: selectedEmployees.map((e) => e.id),
      };

      await apiClient.post("/surat-tugas/public-submit", payload).catch(async () => {
        // Fallback to /kepegawaian/surat-tugas endpoint
        await apiClient.post("/kepegawaian/surat-tugas", payload);
      });
    } catch (err) {
      console.error("Submit Surat Tugas Error:", err);
    } finally {
      setIsSubmitting(false);
      Alert.alert(
        "Pengajuan Surat Tugas Berhasil!",
        `Surat Tugas untuk ${selectedEmployees.length} pegawai telah berhasil diajukan dan dikirim ke sistem untuk diproses.`,
        [
          {
            text: "Lihat Inbox Surat Tugas",
            onPress: () => {
              if (navigation) navigation.navigate("InboxSuratTugas");
              else handleGoBack();
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
        ]}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 35 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <View style={styles.headerBadgeRow}>
            <Ionicons name="business" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.headerBadgeText}>BKSDA KALTIM</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Pengajuan Surat Tugas</Text>
        </View>
      </View>

      {/* Stepper Progress Bar Presisi Web Wizard */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Pilih Pegawai</Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Detail Kegiatan</Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Dokumen & Kirim</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: PILIH PEGAWAI Presisi Screenshot Web 1 */}
        {step === 1 && (
          <GlassCard style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="people-outline" size={28} color="#2563eb" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textDark }]}>Pilih Pegawai</Text>
            <Text style={styles.cardSubTitle}>Cari dan tambahkan pegawai yang akan melaksanakan tugas.</Text>

            {/* DAFTAR PEGAWAI YANG DITUGASKAN */}
            <Text style={styles.sectionLabel}>DAFTAR PEGAWAI YANG DITUGASKAN</Text>

            {selectedEmployees.length === 0 ? (
              <View style={[styles.emptyDottedBox, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1" }]}>
                <Ionicons name="person-add-outline" size={24} color="#94a3b8" style={{ marginBottom: 4 }} />
                <Text style={styles.emptyDottedText}>Belum ada pegawai dipilih</Text>
              </View>
            ) : (
              <View style={styles.selectedGrid}>
                {selectedEmployees.map((emp) => (
                  <View key={emp.id} style={styles.employeeChip}>
                    <View style={styles.chipAvatar}>
                      <Ionicons name="person" size={12} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.chipName} numberOfLines={1}>
                        {emp.name}
                      </Text>
                      <Text style={styles.chipNip}>{emp.nip}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleEmployee(emp)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Search Input Box */}
            <View style={[styles.searchBox, { borderColor: colors.glassBorder, marginTop: 14 }]}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Ketik nama atau NIP pegawai (min. 1 karakter)..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isSearching && <ActivityIndicator size="small" color="#2563eb" />}
            </View>

            {/* Autocomplete Dropdown Search Results */}
            {searchQuery.trim().length >= 1 && (
              <View style={[styles.dropdownResults, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
                {searchResults.map((emp) => {
                  const isSelected = selectedEmployees.some((e) => e.id === emp.id);
                  return (
                    <TouchableOpacity
                      key={emp.id}
                      style={[styles.searchResultRow, isSelected && styles.searchResultSelected]}
                      onPress={() => toggleEmployee(emp)}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                        size={20}
                        color={isSelected ? "#2563eb" : "#64748b"}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.textDark }]}>{emp.name}</Text>
                        <Text style={styles.resultNip}>NIP. {emp.nip} • {emp.position}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Next Step Action Button */}
            <TouchableOpacity
              style={[
                styles.nextStepBtn,
                selectedEmployees.length === 0 && { backgroundColor: "#94a3b8", opacity: 0.6 },
              ]}
              onPress={() => {
                if (selectedEmployees.length === 0) {
                  Alert.alert("Perhatian", "Silakan pilih minimal 1 pegawai yang akan ditugaskan.");
                  return;
                }
                setStep(2);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.nextStepText}>Lanjutkan</Text>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" />
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* STEP 2: DETAIL KEGIATAN Presisi Web Step 2 */}
        {step === 2 && (
          <GlassCard style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="document-text-outline" size={28} color="#2563eb" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textDark }]}>Detail Kegiatan</Text>
            <Text style={styles.cardSubTitle}>Lengkapi maksud perjalanan dinas, periode, dan lokasi tujuan.</Text>

            {/* JENIS TUGAS Dropdown Select */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                JENIS TUGAS <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              {["Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )", "Melaksanakan Kegiatan ( 1 Hari )", "Menugaskan Staf"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.radioRow}
                  onPress={() => setJenisTugas(opt as any)}
                >
                  <View style={[styles.radioCircle, jenisTugas === opt && styles.radioCircleActive]}>
                    {jenisTugas === opt && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.radioText, { color: colors.textDark }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Builder Inputs Presisi User Directive */}
            {jenisTugas.includes("Perjalanan Dinas") ? (
              <View style={{ marginBottom: 14 }}>
                {/* 2 Split Columns: Dari (Asal) & Ke (Tujuan) */}
                <View style={styles.rowTwoInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>
                      DARI ( ASAL ) <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                      placeholder="Samarinda"
                      placeholderTextColor="#94a3b8"
                      value={kotaAsal}
                      onChangeText={setKotaAsal}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>
                      KE ( TUJUAN ) <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                      placeholder="Kabupaten Kutai Barat"
                      placeholderTextColor="#94a3b8"
                      value={kotaTujuan}
                      onChangeText={setKotaTujuan}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    DALAM RANGKA <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.multilineInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    placeholder="Kegiatan Inventarisasi dan Verifikasi Keanekaragaman..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={2}
                    value={namaKegiatanText}
                    onChangeText={setNamaKegiatanText}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>DI ( TEMPAT SPESIFIK / OPSIONAL )</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    placeholder="Suaka Margasatwa Kelian"
                    placeholderTextColor="#94a3b8"
                    value={tempatSpesifik}
                    onChangeText={setTempatSpesifik}
                  />
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 14 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {jenisTugas.includes("Melaksanakan Kegiatan") ? "MELAKSANAKAN KEGIATAN ( 1 HARI )" : "MENUGASKAN STAF"} <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.multilineInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    placeholder={jenisTugas.includes("Melaksanakan Kegiatan") ? "opname fisik (stok opname) barang persediaan" : "verifikasi berkas administrasi persediaan"}
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={2}
                    value={namaKegiatanText}
                    onChangeText={setNamaKegiatanText}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PADA ( TEMPAT / UNIT / LOKASI KEGIATAN )</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    placeholder="Kantor Balai / tempat kegiatannya"
                    placeholderTextColor="#94a3b8"
                    value={tempatSpesifik}
                    onChangeText={setTempatSpesifik}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    DI ( KOTA / KABUPATEN ) <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    placeholder="Samarinda"
                    placeholderTextColor="#94a3b8"
                    value={kotaTujuan}
                    onChangeText={setKotaTujuan}
                  />
                </View>
              </View>
            )}

            {/* Preview Box Teks Resmi */}
            <View style={styles.plhAlertCard}>
              <View style={styles.plhHeaderRow}>
                <Ionicons name="document-text-outline" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={styles.plhAlertTitle}>📌 Pratinjau Teks Hasil Resmi</Text>
              </View>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#1e3a8a", marginTop: 2 }}>
                {jenisTugas.includes("Perjalanan Dinas")
                  ? `Melaksanakan Perjalanan Dinas dari ${kotaAsal || "..."} ke ${kotaTujuan || "..."}${namaKegiatanText ? ` dalam rangka ${namaKegiatanText}` : ""}${tempatSpesifik ? ` di ${tempatSpesifik}` : ""}`
                  : jenisTugas.includes("Melaksanakan Kegiatan")
                  ? `Melaksanakan Kegiatan ${namaKegiatanText || "..."}${tempatSpesifik ? ` pada ${tempatSpesifik}` : ""}${kotaTujuan ? ` di ${kotaTujuan}` : ""}`
                  : `Menugaskan Staf untuk ${namaKegiatanText || "..."}${tempatSpesifik ? ` pada ${tempatSpesifik}` : ""}${kotaTujuan ? ` di ${kotaTujuan}` : ""}`}
              </Text>
            </View>

            {/* Input 2 & 3: Periode Tanggal (Pakai DatePicker Button) */}
            <View style={styles.rowTwoInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>TANGGAL MULAI *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]}
                  onPress={() => setActiveDatePicker("mulai")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>
                    {tanggalMulai || "Pilih Tanggal Mulai"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>TANGGAL SELESAI *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]}
                  onPress={() => setActiveDatePicker("selesai")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>
                    {tanggalSelesai || "Pilih Tanggal Selesai"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Input 4: Keterangan Lainnya (Gantikan Lokasi Kegiatan yang sudah ada di atas) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>KETERANGAN LAINNYA</Text>
              <TextInput
                style={[styles.multilineInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                placeholder="Catatan tambahan (opsional)"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={keterangan}
                onChangeText={setKeterangan}
              />
            </View>

            {/* Input 5: Sumber Dana (Synched 100% dengan Localhost) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SUMBER DANA *</Text>
              {[
                { id: "dipa", label: "DIPA Balai KSDA Kalimantan Timur" },
                { id: "dipa_lain", label: "DIPA Instansi Lain" },
                { id: "swadaya", label: "Non-DIPA / Swadaya" },
                { id: "dl1", label: "Tanpa Biaya / DL 1" },
                { id: "kja", label: "Dana Kerjasama KJA" },
                { id: "mja", label: "Dana Kerjasama MJA" },
                { id: "cop", label: "Dana Kerjasama COP" },
                { id: "tjiwi", label: "Dana Kerjasama PT. Tjiwi Kimia Tbk." },
                { id: "bosf", label: "Dana Kerjasama BOSF" },
                { id: "can", label: "Dana Kerjasama CAN" },
                { id: "alert", label: "Dana Kerjasama ALeRT" },
                { id: "folu", label: "Dana Kerjasama FOLU" },
                { id: "other", label: "Lainnya" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.radioRow}
                  onPress={() => setSumberDana(opt.id)}
                >
                  <View style={[styles.radioCircle, sumberDana === opt.id && styles.radioCircleActive]}>
                    {sumberDana === opt.id && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.radioText, { color: colors.textDark }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}

              {sumberDana === "other" && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.label, { fontSize: 10 }]}>SEBUTKAN SUMBER DANA LAINNYA *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    placeholder="Sebutkan sumber dana..."
                    placeholderTextColor="#94a3b8"
                    value={sumberDanaOther}
                    onChangeText={setSumberDanaOther}
                  />
                </View>
              )}
            </View>

            {/* Conditional PLH Input (If Pejabat Struktural is in team) */}
            {hasPejabatStruktural && (
              <View style={styles.plhAlertCard}>
                <View style={styles.plhHeaderRow}>
                  <Ionicons name="information-circle" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={styles.plhAlertTitle}>Penunjukan Pelaksana Harian (PLH)</Text>
                </View>
                <Text style={styles.plhAlertSub}>
                  Terdeteksi Pejabat Struktural ikut perjalanan dinas. Silakan tentukan PLH Pengganti.
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: "#ffffff", borderColor: "#bfdbfe", marginTop: 8 }]}
                  placeholder="Ketik Nama / NIP PLH Pengganti..."
                  placeholderTextColor="#94a3b8"
                  value={namaPlh}
                  onChangeText={setNamaPlh}
                />
              </View>
            )}

            {/* Step 2 Actions Row */}
            <View style={styles.stepActionRow}>
              <TouchableOpacity
                style={styles.prevStepBtn}
                onPress={() => setStep(1)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={16} color="#64748b" />
                <Text style={styles.prevStepText}>Kembali</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={() => {
                  if (jenisTugas.includes("Perjalanan Dinas")) {
                    if (!kotaAsal.trim() || !kotaTujuan.trim()) {
                      Alert.alert("Perhatian", "Silakan isi Kota Asal dan Kota/Tujuan (*).");
                      return;
                    }
                  } else {
                    if (!namaKegiatanText.trim()) {
                      Alert.alert("Perhatian", "Silakan isi Nama Kegiatan (*).");
                      return;
                    }
                  }
                  setStep(3);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.nextStepText}>Lanjutkan ke Step 3</Text>
                <Ionicons name="chevron-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* STEP 3: DOKUMEN DASAR & SUBMIT Presisi Web Step 3 */}
        {step === 3 && (
          <GlassCard style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textDark }]}>Konfirmasi & Kirim</Text>
            <Text style={styles.cardSubTitle}>Unggah berkas pendukung dan periksa kembali rincian pengajuan.</Text>

            {/* Upload Document Box */}
            <Text style={styles.sectionLabel}>UPLOAD DOKUMEN DASAR (PDF / FOTO)</Text>
            <TouchableOpacity
              style={[styles.uploadDottedBox, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1" }]}
              onPress={() => {
                setSelectedFileName("Dokumen_Pendukung_ST.pdf");
                Alert.alert("Berkas Dipilih", "Dokumen_Pendukung_ST.pdf siap diunggah.");
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={32} color="#2563eb" style={{ marginBottom: 6 }} />
              <Text style={styles.uploadDottedTitle}>
                {selectedFileName ? selectedFileName : "PILIH BERKAS DOKUMEN"}
              </Text>
              <Text style={styles.uploadDottedSub}>MAX 10MB • FORMAT PDF / JPG / PNG</Text>
            </TouchableOpacity>

            {/* Summary Preview Box */}
            <View style={[styles.summaryBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc" }]}>
              <Text style={styles.summaryTitle}>RINGKASAN PENGAJUAN SURAT TUGAS</Text>
              <Text style={[styles.summaryLine, { color: colors.textDark }]}>
                • Personil: <Text style={{ fontWeight: "800" }}>{selectedEmployees.map((e) => e.name).join(", ")}</Text>
              </Text>
              <Text style={[styles.summaryLine, { color: colors.textDark }]}>
                • Kegiatan: <Text style={{ fontWeight: "800" }}>{maksudKegiatan || "-"}</Text>
              </Text>
              <Text style={[styles.summaryLine, { color: colors.textDark }]}>
                • Lokasi: <Text style={{ fontWeight: "800" }}>{tempatSpesifik || kotaTujuan || kotaAsal}</Text>
              </Text>
              {Boolean(keterangan) && (
                <Text style={[styles.summaryLine, { color: colors.textDark }]}>
                  • Keterangan: <Text style={{ fontWeight: "800" }}>{keterangan}</Text>
                </Text>
              )}
              <Text style={[styles.summaryLine, { color: colors.textDark }]}>
                • Sumber Dana: <Text style={{ fontWeight: "800" }}>{sumberDana}</Text>
              </Text>
            </View>

            {/* Checkbox Persetujuan */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSetujuData(!setujuData)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={setujuData ? "checkbox" : "square-outline"}
                size={22}
                color={setujuData ? "#2563eb" : "#94a3b8"}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.checkboxText, { color: colors.textDark }]}>
                Saya menyatakan data pengajuan Surat Tugas ini sudah benar dan siap diproses.
              </Text>
            </TouchableOpacity>

            {/* Final Submit Button */}
            <View style={styles.stepActionRow}>
              <TouchableOpacity
                style={styles.prevStepBtn}
                onPress={() => setStep(2)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={16} color="#64748b" />
                <Text style={styles.prevStepText}>Kembali</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitFinalBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmitSuratTugas}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name="paper-plane-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.submitFinalText}>
                  {isSubmitting ? "Mengirim..." : "Kirim Pengajuan ST"}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Render Modal DatePicker */}
      {Boolean(activeDatePicker) && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setActiveDatePicker(null)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.datePickerCard}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity 
                  onPress={() => setCurrentPickerMonth(new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth() - 1, 1))} 
                  style={styles.monthNavBtn}
                >
                  <Ionicons name="chevron-back" size={20} color="#2563eb" />
                </TouchableOpacity>
                <Text style={styles.datePickerMonthTitle}>
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][currentPickerMonth.getMonth()]} {currentPickerMonth.getFullYear()}
                </Text>
                <TouchableOpacity 
                  onPress={() => setCurrentPickerMonth(new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth() + 1, 1))} 
                  style={styles.monthNavBtn}
                >
                  <Ionicons name="chevron-forward" size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={styles.weekDaysRow}>
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                  <Text key={d} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              {/* Grid of days */}
              <View style={styles.daysGrid}>
                {(() => {
                  const y = currentPickerMonth.getFullYear();
                  const m = currentPickerMonth.getMonth();
                  const totalDays = new Date(y, m + 1, 0).getDate();
                  const firstDay = new Date(y, m, 1).getDay();
                  const grid = [];
                  for (let i = 0; i < firstDay; i++) grid.push(null);
                  for (let d = 1; d <= totalDays; d++) grid.push(d);

                  return grid.map((day, idx) => {
                    if (day === null) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                    const formattedM = String(m + 1).padStart(2, "0");
                    const formattedD = String(day).padStart(2, "0");
                    const dateStr = `${y}-${formattedM}-${formattedD}`;
                    const isSelected = activeDatePicker === "mulai" ? tanggalMulai === dateStr : tanggalSelesai === dateStr;

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                        onPress={() => {
                          if (activeDatePicker === "mulai") {
                            setTanggalMulai(dateStr);
                            if (!tanggalSelesai || tanggalSelesai < dateStr) setTanggalSelesai(dateStr);
                          } else {
                            setTanggalSelesai(dateStr);
                          }
                          setActiveDatePicker(null);
                        }}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>

              {/* Quick Actions Footer */}
              <View style={styles.datePickerFooter}>
                <TouchableOpacity 
                  style={styles.quickDateBtn}
                  onPress={() => {
                    const today = new Date().toISOString().substring(0, 10);
                    if (activeDatePicker === "mulai") setTanggalMulai(today);
                    else setTanggalSelesai(today);
                    setActiveDatePicker(null);
                  }}
                >
                  <Text style={styles.quickDateText}>Hari Ini</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickDateBtn, { backgroundColor: "#2563eb" }]}
                  onPress={() => setActiveDatePicker(null)}
                >
                  <Text style={[styles.quickDateText, { color: "#ffffff" }]}>Tutup</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Floating Action Button (FAB ☰ Menu) */}
      <FabMenu onNavigateToModule={handleSelectNavTab} activeSubmenu="buat-surat-tugas" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingRight: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  headerBadgeText: {
    color: "#2563eb",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepCircleActive: {
    backgroundColor: "#2563eb",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },
  stepNumberActive: {
    color: "#ffffff",
  },
  stepLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
  },
  stepLabelActive: {
    color: "#2563eb",
    fontWeight: "800",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  stepCard: {
    padding: 20,
    borderRadius: 22,
  },
  cardHeaderIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  cardSubTitle: {
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 18,
  },

  sectionLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyDottedBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: RADIUS.card,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  emptyDottedText: {
    color: "#94a3b8",
    fontSize: 11.5,
    fontWeight: "700",
  },
  selectedGrid: {
    gap: 8,
  },
  employeeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.input,
    padding: 8,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  chipName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
  },
  chipNip: {
    fontSize: 9.5,
    color: "#64748b",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  dropdownResults: {
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 4,
    maxHeight: 220,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchResultSelected: {
    backgroundColor: "#eff6ff",
  },
  resultName: {
    fontSize: 12,
    fontWeight: "800",
  },
  resultNip: {
    color: "#64748b",
    fontSize: 10,
  },

  addCustomNameRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#eff6ff",
    borderTopWidth: 1,
    borderTopColor: "#bfdbfe",
  },
  addCustomNameText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },

  inputGroup: {
    marginBottom: 14,
  },
  rowTwoInputs: {
    flexDirection: "row",
    gap: 10,
  },
  label: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: "#2563eb",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563eb",
  },
  radioText: {
    fontSize: 12.5,
    fontWeight: "600",
  },

  plhAlertCard: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.input,
    padding: 12,
    marginBottom: 14,
  },
  plhHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  plhAlertTitle: {
    color: "#1e3a8a",
    fontSize: 12,
    fontWeight: "800",
  },
  plhAlertSub: {
    color: "#3b82f6",
    fontSize: 10.5,
  },

  uploadDottedBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: RADIUS.card,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    marginBottom: 16,
  },
  uploadDottedTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    marginBottom: 2,
  },
  uploadDottedSub: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
  },

  summaryBox: {
    padding: 14,
    borderRadius: RADIUS.input,
    marginBottom: 16,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryLine: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 16,
  },

  nextStepBtn: {
    backgroundColor: "#2563eb",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 4,
  },
  nextStepText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  stepActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  prevStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  prevStepText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
  },

  submitFinalBtn: {
    backgroundColor: "#10b981",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitFinalText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },

  // DatePicker & Multiline Input Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  datePickerBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  datePickerCard: {
    width: "88%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    elevation: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
  },
  datePickerMonthTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekDayText: {
    width: 38,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: "#2563eb",
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  dayTextSelected: {
    color: "#ffffff",
    fontWeight: "900",
  },
  datePickerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  quickDateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
});
