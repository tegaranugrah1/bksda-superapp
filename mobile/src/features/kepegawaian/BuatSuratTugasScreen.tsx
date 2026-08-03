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
import { useRoute } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
  const [dropdownModalType, setDropdownModalType] = useState<"jenisTugas" | "sumberDana" | "templateST" | null>(null);

  // PREVIEW CETAK & PRINT STATE
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Custom Notification Modal State
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: "warning" | "error" | "success" | "info";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: "warning",
    title: "",
    message: "",
  });

  const showNotif = (
    title: string,
    message: string,
    type: "warning" | "error" | "success" | "info" = "warning",
    onConfirm?: () => void
  ) => {
    setNotification({ visible: true, title, message, type, onConfirm });
  };

  // ST BUILDER PREMIUM STATE (Synced with Web /kepegawaian/surat-tugas/create)
  const route = useRoute<any>();
  const editData = route?.params?.editData;
  const [editId, setEditId] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState("DEFAULT (MANUAL)");
  const [nomorUrut, setNomorUrut] = useState("001");
  const [klasifikasi, setKlasifikasi] = useState("KSA.0X.0X");
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();
  const [kotaDokumen, setKotaDokumen] = useState("Samarinda");
  const [tanggalDokumen, setTanggalDokumen] = useState(new Date().toISOString().substring(0, 10));

  // Sync state if opening in Edit Mode from InboxSuratTugasScreen
  useEffect(() => {
    if (!editData) return;

    setEditId(String(editData.id));

    if (editData.title || editData.maksud_tujuan) {
      setNamaKegiatanText(editData.title || editData.maksud_tujuan || "");
    }
    if (editData.location || editData.tempat_tujuan) {
      setKotaTujuan(editData.location || editData.tempat_tujuan || "");
    }
    if (editData.dana || editData.sumber_dana) {
      const d = String(editData.dana || editData.sumber_dana || "dipa").toLowerCase();
      setSumberDana(d);
    }
    if (editData.periode) {
      const parts = String(editData.periode).split("s.d");
      if (parts.length === 2) {
        setTanggalMulai(parts[0].trim());
        setTanggalSelesai(parts[1].trim());
      }
    }

    if (Array.isArray(editData.personil) && editData.personil.length > 0) {
      const emps: Employee[] = editData.personil.map((p: any, idx: number) => ({
        id: p.id ? String(p.id) : `edit-p-${idx}`,
        name: p.name || p.nama_lengkap || "Pegawai",
        nip: p.nip || "",
        position: p.position || p.jabatan || "",
      }));
      setSelectedEmployees(emps);
    }

    const fetchFullSt = async () => {
      try {
        const res = await apiClient.get(`/surat-tugas/${editData.id}`);
        const full = res.data?.data || res.data;
        if (full) {
          if (full.nomor_surat || full.st_number) {
            const numStr = full.nomor_surat || full.st_number;
            const match = numStr.match(/ST\.\s*(\d+)/i);
            if (match) setNomorUrut(match[1]);
          }
          if (full.tanggal_mulai) setTanggalMulai(full.tanggal_mulai);
          if (full.tanggal_selesai) setTanggalSelesai(full.tanggal_selesai);
          if (full.kota_asal) setKotaAsal(full.kota_asal);
          if (full.tempat_spesifik) setTempatSpesifik(full.tempat_spesifik);
          if (full.menimbang && Array.isArray(full.menimbang)) {
            setMenimbangItems(full.menimbang.map((m: any, i: number) => ({ id: `m-${i}`, text: typeof m === "string" ? m : m.text })));
          }
          if (full.dasar && Array.isArray(full.dasar)) {
            setDasarItems(full.dasar.map((d: any, i: number) => ({ id: `d-${i}`, text: typeof d === "string" ? d : d.text })));
          }
          if (full.untuk && Array.isArray(full.untuk)) {
            setUntukItems(full.untuk.map((u: any, i: number) => ({ id: `u-${i}`, text: typeof u === "string" ? u : u.text })));
          }
          if (full.tembusan && Array.isArray(full.tembusan)) {
            setTembusanItems(full.tembusan.map((t: any, i: number) => ({ id: `t-${i}`, text: typeof t === "string" ? t : t.text })));
          }
          if (full.penandatangan_nama) setPenandatanganName(full.penandatangan_nama);
          if (full.penandatangan_nip) setPenandatanganNip(full.penandatangan_nip);
        }
      } catch {
        // use local editData state fallback
      }
    };

    fetchFullSt();
  }, [editData]);

  const [menimbangItems, setMenimbangItems] = useState<Array<{ id: string; text: string }>>([
    { id: "m-1", text: "bahwa dalam rangka , perlu ;" },
    { id: "m-2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
  ]);

  const [dasarItems, setDasarItems] = useState<Array<{ id: string; text: string }>>([
    { id: "d-1", text: "2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
    { id: "d-2", text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP` },
  ]);

  const [untukItems, setUntukItems] = useState<Array<{ id: string; text: string }>>([
    { id: "u-1", text: "Melaksanakan Perjalanan Dinas dari Samarinda ke Balikpapan terhitung mulai..." },
    { id: "u-2", text: "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut." },
    { id: "u-3", text: "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE" },
  ]);

  const [tembusanItems, setTembusanItems] = useState<Array<{ id: string; text: string }>>([]);

  const [penandatanganName, setPenandatanganName] = useState("M. Ari Wibawanto, S.Hut., M.Sc.");
  const [penandatanganNip, setPenandatanganNip] = useState("19740514 199903 1 001");

  // Dynamic List Handlers
  const handleAddMenimbangItem = () => {
    setMenimbangItems((prev) => [...prev, { id: `m-${Date.now()}`, text: "bahwa..." }]);
  };
  const handleDeleteMenimbangItem = (id: string) => {
    setMenimbangItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateMenimbangItem = (id: string, text: string) => {
    setMenimbangItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleAddDasarItem = () => {
    setDasarItems((prev) => [...prev, { id: `d-${Date.now()}`, text: "" }]);
  };
  const handleDeleteDasarItem = (id: string) => {
    setDasarItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateDasarItem = (id: string, text: string) => {
    setDasarItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleAddUntukItem = () => {
    setUntukItems((prev) => [...prev, { id: `u-${Date.now()}`, text: "" }]);
  };
  const handleDeleteUntukItem = (id: string) => {
    setUntukItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateUntukItem = (id: string, text: string) => {
    setUntukItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleAddTembusanItem = () => {
    setTembusanItems((prev) => [...prev, { id: `t-${Date.now()}`, text: "" }]);
  };
  const handleDeleteTembusanItem = (id: string) => {
    setTembusanItems((prev) => prev.filter((i) => i.id !== id));
  };
  const handleUpdateTembusanItem = (id: string, text: string) => {
    setTembusanItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  // BUILDER STATE UNTUK DETAIL KEGIATAN
  const [jenisTugas, setJenisTugas] = useState<"Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" | "Melaksanakan Kegiatan ( 1 Hari )" | "Menugaskan Staf">("Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [namaKegiatanText, setNamaKegiatanText] = useState("");
  const [tempatSpesifik, setTempatSpesifik] = useState("");

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
    } else if (tabKey === "kepegawaian") {
      if (navigation) navigation.navigate("Kepegawaian");
    } else if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    }
  };

  const getSuratTugasHtmlContent = () => {
    const pegawaiRows = selectedEmployees.map((p, idx) => `
      <tr>
        <td style="padding: 6px; border: 1px solid #333; text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #333;"><strong>${p.name}</strong><br/><span style="font-size: 11px; color: #555;">NIP. ${p.nip}</span></td>
        <td style="padding: 6px; border: 1px solid #333;">${p.position || "Staf Balai KSDA"}</td>
      </tr>
    `).join("");

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Surat Tugas BKSDA Kaltim</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 24px; color: #000; font-size: 13px; line-height: 1.5; }
        .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px; }
        .kop h3 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .kop h2 { margin: 2px 0; font-size: 15px; font-weight: bold; text-transform: uppercase; }
        .kop h1 { margin: 2px 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
        .sub { font-size: 10px; margin-top: 4px; font-family: Arial, sans-serif; }
        .title { text-align: center; margin: 16px 0; }
        .title h2 { margin: 0; font-size: 16px; font-weight: bold; text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        td { vertical-align: top; }
        .ttd { float: right; width: 250px; margin-top: 24px; text-align: left; }
        .clear { clear: both; }
      </style>
    </head>
    <body>
      <div class="kop">
        <h3>KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN</h3>
        <h2>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</h2>
        <h1>BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</h1>
        <div class="sub">Jl. Teuku Umar No. 1, Samarinda • Telp: (0541) 743510 • bksdakaltim.org</div>
      </div>

      <div class="title">
        <h2>SURAT TUGAS</h2>
        <p style="margin-top:2px;">Nomor: ST. 001/K.18/TU/KSA.0X.0X/B/08/2026</p>
      </div>

      <table>
        <tr>
          <td style="width: 110px; font-weight: bold;">Menimbang</td>
          <td style="width: 15px;">:</td>
          <td>
            <ol type="a" style="margin: 0; padding-left: 18px;">
              <li>bahwa dalam rangka ${namaKegiatanText || jenisTugas}, perlu menugaskan pegawai untuk melaksanakannya;</li>
              <li>bahwa sehubungan dengan huruf a di atas, perlu diterbitkan Surat Tugas.</li>
            </ol>
          </td>
        </tr>
        <tr><td colspan="3" style="height:8px;"></td></tr>
        <tr>
          <td style="font-weight: bold;">Dasar</td>
          <td>:</td>
          <td>
            <ol style="margin: 0; padding-left: 18px;">
              <li>Peraturan Menteri LHK tentang Organisasi dan Tata Kerja Balai Konservasi Sumber Daya Alam;</li>
              <li>Surat Pengesahan DIPA TA 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur.</li>
            </ol>
          </td>
        </tr>
      </table>

      <div style="text-align: center; font-weight: bold; margin: 14px 0 6px 0;">MEMBERI PERINTAH:</div>

      <table>
        <tr>
          <td style="width: 110px; font-weight: bold;">Kepada</td>
          <td style="width: 15px;">:</td>
          <td>
            <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 6px; border: 1px solid #333; width: 30px;">No</th>
                  <th style="padding: 6px; border: 1px solid #333;">Nama / NIP</th>
                  <th style="padding: 6px; border: 1px solid #333;">Jabatan</th>
                </tr>
              </thead>
              <tbody>
                ${pegawaiRows}
              </tbody>
            </table>
          </td>
        </tr>
        <tr><td colspan="3" style="height:8px;"></td></tr>
        <tr>
          <td style="font-weight: bold;">Untuk</td>
          <td>:</td>
          <td>
            <ol style="margin: 0; padding-left: 18px;">
              <li>Melaksanakan ${jenisTugas} dari ${kotaAsal || "Samarinda"} ke ${kotaTujuan || "Balikpapan"}${tempatSpesifik ? ` (${tempatSpesifik})` : ""} terhitung mulai tanggal <strong>${tanggalMulai}</strong> s.d. <strong>${tanggalSelesai}</strong>.</li>
              <li>Membuat laporan tertulis paling lambat 7 hari kerja setelah kegiatan.</li>
              <li>Segala biaya dibebankan pada DIPA Balai KSDA Kalimantan Timur.</li>
            </ol>
          </td>
        </tr>
      </table>

      <div class="ttd">
        Ditetapkan di: Samarinda<br/>
        Pada tanggal: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}<br/><br/>
        <strong>Kepala Balai KSDA Kaltim,</strong><br/><br/><br/><br/>
        <strong><u>M. Ari Wibawanto, S.Hut., M.Sc.</u></strong><br/>
        NIP. 19740514 199903 1 001
      </div>
      <div class="clear"></div>
    </body>
    </html>
    `;
  };

  const handleSharePDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = getSuratTugasHtmlContent();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Bagikan Surat Tugas BKSDA",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        showNotif("Berhasil", `File PDF tersimpan di: ${uri}`, "success");
      }
    } catch (err: any) {
      showNotif("Gagal Berbagi PDF", err?.message || "Terjadi kesalahan saat membagikan PDF.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSavePDFToHP = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = getSuratTugasHtmlContent();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Simpan Surat Tugas PDF ke HP",
          mimeType: "application/pdf",
        });
        showNotif("Berhasil!", "Surat Tugas PDF siap disimpan ke perangkat HP Anda.", "success");
      } else {
        showNotif("Berhasil Disimpan", `PDF tersimpan di: ${uri}`, "success");
      }
    } catch (err: any) {
      showNotif("Gagal Menyimpan PDF", err?.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPrint = async () => {
    try {
      const html = getSuratTugasHtmlContent();
      await Print.printAsync({ html });
    } catch (err: any) {
      showNotif("Gagal Mencetak", err?.message || "Terjadi kesalahan saat mencetak.", "error");
    }
  };

  const handleSubmitSuratTugas = async () => {
    if (!setujuData) {
      showNotif("Persetujuan Diperlukan", "Silakan beri centang persetujuan bahwa data pengajuan sudah benar.");
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
        employees: selectedEmployees.map((e) => ({
          id: Number(e.id),
          peran: undefined,
        })),
      };

      if (editId) {
        await apiClient.put(`/surat-tugas/${editId}`, payload).catch(async () => {
          await apiClient.post(`/surat-tugas/${editId}`, payload);
        });

        showNotif(
          "Surat Tugas Berhasil Diperbarui!",
          `Surat Tugas #${editId} telah berhasil diperbarui.`,
          "success",
          () => {
            setNotification((prev) => ({ ...prev, visible: false }));
            if (navigation && typeof navigation.navigate === "function") {
              navigation.navigate("InboxSuratTugas");
            } else if (onNavigateToModule) {
              onNavigateToModule("inbox-surat-tugas");
            } else if (onBack) {
              onBack();
            }
          }
        );
      } else {
        await apiClient.post("/surat-tugas/submit", payload).catch(async () => {
          await apiClient.post("/surat-tugas", payload);
        });

        showNotif(
          "Pengajuan Surat Tugas Berhasil!",
          `Surat Tugas untuk ${selectedEmployees.length} pegawai telah berhasil diterbitkan.`,
          "success",
          () => {
            setNotification((prev) => ({ ...prev, visible: false }));
            if (navigation && typeof navigation.navigate === "function") {
              navigation.navigate("InboxSuratTugas");
            } else if (onNavigateToModule) {
              onNavigateToModule("inbox-surat-tugas");
            } else if (onBack) {
              onBack();
            }
          }
        );
      }
    } catch (err: any) {
      console.error("Submit Surat Tugas Error:", err);
      const errMsg =
        err?.response?.data?.message || err?.message || "Terjadi kesalahan saat menyimpan data pengajuan.";
      showNotif("Gagal Mengajukan Surat Tugas", errMsg, "error");
    } finally {
      setIsSubmitting(false);
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
            <Ionicons name="document-text" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.headerBadgeText}>
              {editId ? "ST BUILDER PREMIUM (EDIT MODE)" : "ST BUILDER PREMIUM"}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>
            {editId ? "Edit Surat Tugas" : "Buat Surat Tugas"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GlassCard style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {/* Header Banner ST Builder Premium */}
          <View style={styles.stBuilderHeaderCard}>
            <View style={styles.builderIconBox}>
              <Ionicons name="document-text" size={24} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.builderTitleText}>
                ST Builder <Text style={{ color: "#2563eb" }}>Premium</Text>
              </Text>
              <Text style={styles.builderSubtitleText}>
                {editId ? `EDITING SURAT TUGAS #${editId}` : "DIRECT ISSUANCE MODE"}
              </Text>
            </View>
          </View>

          {/* TEMPLATE ST (Presisi Screenshot 1) */}
          <View style={styles.templateCardContainer}>
            <View style={styles.templateBadgeRow}>
              <View style={styles.templateBadge}>
                <Text style={styles.templateBadgeText}>TEMPLATE</Text>
              </View>
              <Text style={styles.templateLabelText}>PILIH TEMPLATE ST</Text>
            </View>
            <TouchableOpacity
              style={styles.templateSelectTrigger}
              onPress={() => setDropdownModalType("templateST")}
              activeOpacity={0.8}
            >
              <Text style={styles.templateSelectText}>{selectedTemplate}</Text>
              <Ionicons name="chevron-down" size={18} color="#ea580c" />
            </TouchableOpacity>
          </View>

          {/* NOMOR SURAT (Presisi Screenshot 1) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOMOR SURAT</Text>
            <View style={styles.nomorSuratRow}>
              <View style={styles.nomorSuratPrefix}><Text style={styles.nomorSuratPrefixText}>ST.</Text></View>
              <TextInput style={styles.nomorSuratInput} value={nomorUrut} onChangeText={setNomorUrut} keyboardType="numeric" placeholder="001" />
              <View style={styles.nomorSuratFixed}><Text style={styles.nomorSuratFixedText}>/K.18/TU/</Text></View>
              <TextInput style={[styles.nomorSuratInput, { flex: 1.5 }]} value={klasifikasi} onChangeText={setKlasifikasi} placeholder="KSA.0X.0X" />
              <View style={styles.nomorSuratFixed}><Text style={styles.nomorSuratFixedText}>/B/{currentMonth}/{currentYear}</Text></View>
            </View>
          </View>

          {/* PENGATURAN DOKUMEN (KOTA & TANGGAL - Presisi Screenshot 1) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PENGATURAN DOKUMEN</Text>
            <View style={styles.rowTwoInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>KOTA</Text>
                <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={kotaDokumen} onChangeText={setKotaDokumen} placeholder="Samarinda" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>TANGGAL</Text>
                <TouchableOpacity style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]} onPress={() => setActiveDatePicker("mulai")}>
                  <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>{tanggalDokumen}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginLeft: "auto" }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SUMBER DANA (Presisi Screenshot 1) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SUMBER DANA</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { borderColor: colors.glassBorder }]}
              onPress={() => setDropdownModalType("sumberDana")}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownTriggerText, { color: colors.textDark }]}>
                {sumberDana.toUpperCase()}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* MENIMBANG (Presisi Screenshot 1 with + TAMBAH) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>MENIMBANG</Text>
              <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddMenimbangItem}>
                <Ionicons name="add" size={14} color="#2563eb" />
                <Text style={styles.addBtnTextSmall}>TAMBAH</Text>
              </TouchableOpacity>
            </View>
            {menimbangItems.map((item, idx) => (
              <View key={item.id} style={styles.dynamicItemRow}>
                <Text style={styles.itemIndexText}>{String.fromCharCode(97 + idx)}.</Text>
                <TextInput
                  style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={item.text}
                  onChangeText={(text) => handleUpdateMenimbangItem(item.id, text)}
                  multiline
                />
                <TouchableOpacity onPress={() => handleDeleteMenimbangItem(item.id)} style={styles.deleteItemBtn}>
                  <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* DASAR (Presisi Screenshot 2 with + TAMBAH) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>DASAR</Text>
              <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddDasarItem}>
                <Ionicons name="add" size={14} color="#2563eb" />
                <Text style={styles.addBtnTextSmall}>TAMBAH</Text>
              </TouchableOpacity>
            </View>
            {dasarItems.map((item, idx) => (
              <View key={item.id} style={styles.dynamicItemRow}>
                <Text style={styles.itemIndexText}>{idx + 1}.</Text>
                <TextInput
                  style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={item.text}
                  onChangeText={(text) => handleUpdateDasarItem(item.id, text)}
                  multiline
                />
                <TouchableOpacity onPress={() => handleDeleteDasarItem(item.id)} style={styles.deleteItemBtn}>
                  <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* KEPADA (PERSONIL) (Presisi Screenshot 2) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>KEPADA (PERSONIL)</Text>
              {selectedEmployees.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{selectedEmployees.length}</Text>
                </View>
              )}
            </View>

            <View style={[styles.searchBox, { borderColor: colors.glassBorder }]}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Cari..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {searchQuery.trim().length > 0 && (
              <ScrollView style={[styles.dropdownResults, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]} nestedScrollEnabled>
                {searchResults.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={styles.searchResultRow}
                    onPress={() => toggleEmployee(emp)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultName, { color: colors.textDark }]}>{emp.name}</Text>
                      <Text style={styles.resultNip}>NIP. {emp.nip}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={{ gap: 8, marginTop: 8 }}>
              {selectedEmployees.map((emp, idx) => (
                <View key={emp.id} style={styles.personilChipCard}>
                  <View style={styles.personilBadgeNum}><Text style={styles.personilNumText}>{idx + 1}</Text></View>
                  <Text style={[styles.personilNameText, { color: colors.textDark }]} numberOfLines={1}>{emp.name}</Text>
                  <TouchableOpacity onPress={() => toggleEmployee(emp)} style={{ marginLeft: "auto" }}>
                    <Ionicons name="close" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* DETAIL KEGIATAN (Presisi Screenshot 2 & 3) */}
          <Text style={styles.sectionTitleHeader}>DETAIL KEGIATAN</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.subLabel}>JENIS TUGAS</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { borderColor: colors.glassBorder }]}
              onPress={() => setDropdownModalType("jenisTugas")}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropdownTriggerText, { color: colors.textDark }]}>
                {jenisTugas}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.rowTwoInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.subLabel}>DARI ( KOTA / LOKASI ASAL ) *</Text>
              <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={kotaAsal} onChangeText={setKotaAsal} placeholder="Samarinda" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.subLabel}>KE ( KOTA / KABUPATEN TUJUAN ) *</Text>
              <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={kotaTujuan} onChangeText={setKotaTujuan} placeholder="Balikpapan" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.subLabel}>DALAM RANGKA *</Text>
            <TextInput
              style={[styles.multilineInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
              value={namaKegiatanText}
              onChangeText={setNamaKegiatanText}
              placeholder="Konservasi HKAN"
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.subLabel}>DI ( TEMPAT SPESIFIK / OPSIONAL )</Text>
            <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={tempatSpesifik} onChangeText={setTempatSpesifik} placeholder="Balikpapan" />
          </View>

          <View style={styles.rowTwoInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.subLabel}>TANGGAL MULAI</Text>
              <TouchableOpacity style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]} onPress={() => setActiveDatePicker("mulai")}>
                <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>{tanggalMulai}</Text>
                <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.subLabel}>TANGGAL SELESAI</Text>
              <TouchableOpacity style={[styles.input, styles.datePickerBtn, { borderColor: colors.glassBorder }]} onPress={() => setActiveDatePicker("selesai")}>
                <Text style={[styles.datePickerBtnText, { color: colors.textDark }]}>{tanggalSelesai}</Text>
                <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* UNTUK (Presisi Screenshot 3 with + TAMBAH) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>UNTUK</Text>
              <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddUntukItem}>
                <Ionicons name="add" size={14} color="#2563eb" />
                <Text style={styles.addBtnTextSmall}>TAMBAH</Text>
              </TouchableOpacity>
            </View>
            {untukItems.map((item, idx) => (
              <View key={item.id} style={styles.dynamicItemRow}>
                <Text style={styles.itemIndexText}>{idx + 1}.</Text>
                <TextInput
                  style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                  value={item.text}
                  onChangeText={(text) => handleUpdateUntukItem(item.id, text)}
                  multiline
                />
                <TouchableOpacity onPress={() => handleDeleteUntukItem(item.id)} style={styles.deleteItemBtn}>
                  <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* TEMBUSAN (Presisi Screenshot 3 with +) */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>TEMBUSAN</Text>
              <TouchableOpacity style={styles.addBtnIconOnly} onPress={handleAddTembusanItem}>
                <Ionicons name="add" size={18} color="#2563eb" />
              </TouchableOpacity>
            </View>
            {tembusanItems.length === 0 ? (
              <Text style={styles.emptyTembusanText}>Belum ada tembusan. Klik + untuk menambah.</Text>
            ) : (
              tembusanItems.map((item, idx) => (
                <View key={item.id} style={styles.dynamicItemRow}>
                  <Text style={styles.itemIndexText}>{idx + 1}.</Text>
                  <TextInput
                    style={[styles.dynamicItemInput, { color: colors.textDark, borderColor: colors.glassBorder }]}
                    value={item.text}
                    onChangeText={(text) => handleUpdateTembusanItem(item.id, text)}
                  />
                  <TouchableOpacity onPress={() => handleDeleteTembusanItem(item.id)} style={styles.deleteItemBtn}>
                    <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* PENANDATANGAN (Presisi Screenshot 3) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PENANDATANGAN</Text>
            <View style={[styles.searchBox, { borderColor: colors.glassBorder, marginBottom: 8 }]}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput style={[styles.searchInput, { color: colors.textDark }]} placeholder="Cari pegawai penandatangan..." placeholderTextColor="#94a3b8" />
            </View>
            <View style={{ gap: 8 }}>
              <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={penandatanganName} onChangeText={setPenandatanganName} />
              <TextInput style={[styles.input, { color: colors.textDark, borderColor: colors.glassBorder }]} value={penandatanganNip} onChangeText={setPenandatanganNip} />
            </View>
          </View>

          {/* ACTION BUTTONS (Presisi Screenshot 1, 2, and 3) */}
          <View style={{ gap: 10, marginTop: 20, marginBottom: 20 }}>
            {/* 1. Simpan Draft */}
            <TouchableOpacity style={styles.btnSimpanDraft} onPress={() => showNotif("Draft Disimpan", "Draft Surat Tugas berhasil disimpan.", "success")} activeOpacity={0.8}>
              <Ionicons name="document-outline" size={18} color="#334155" style={{ marginRight: 8 }} />
              <Text style={styles.btnSimpanDraftText}>Simpan Draft</Text>
            </TouchableOpacity>

            {/* 2. Terbitkan & Cetak / Simpan Perubahan */}
            <TouchableOpacity style={styles.btnTerbitkanCetak} onPress={handleSubmitSuratTugas} disabled={isSubmitting} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.btnTerbitkanCetakText}>
                {isSubmitting ? "Memproses..." : editId ? "Simpan Perubahan ST" : "Terbitkan & Cetak"}
              </Text>
            </TouchableOpacity>

            {/* 3. Preview Cetak */}
            <TouchableOpacity style={styles.btnPreviewCetakFull} onPress={() => setPreviewModalVisible(true)} activeOpacity={0.8}>
              <Ionicons name="print-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.btnPreviewCetakFullText}>Preview Cetak</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Render Modal Preview Cetak Surat Tugas (With Download & Share) */}
      <Modal visible={previewModalVisible} animationType="slide" transparent>
        <View style={styles.previewModalContainer}>
          {/* Header Bar */}
          <View style={styles.previewModalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="print-outline" size={20} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.previewModalTitle}>Pratinjau Cetak Surat Tugas</Text>
            </View>
            <TouchableOpacity onPress={() => setPreviewModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Printable Document Preview Content */}
          <ScrollView style={styles.previewScroll} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.paperSheet}>
              {/* Kop Surat Header */}
              <View style={styles.paperKopHeader}>
                <Text style={styles.kopKemLabel}>KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN</Text>
                <Text style={styles.kopDirLabel}>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</Text>
                <Text style={styles.kopBalaiLabel}>BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</Text>
                <Text style={styles.kopSubText}>
                  Jl. Teuku Umar No. 1, Samarinda • Telp: (0541) 743510 • bksdakaltim.org
                </Text>
                <View style={styles.doubleBorderLine} />
              </View>

              {/* Title Surat Tugas */}
              <View style={styles.paperTitleBox}>
                <Text style={styles.paperMainTitle}>SURAT TUGAS</Text>
                <Text style={styles.paperSubTitleNum}>
                  Nomor: ST. 001/K.18/TU/KSA.0X.0X/B/08/2026
                </Text>
              </View>

              {/* Section Menimbang & Dasar */}
              <View style={styles.paperSection}>
                <Text style={styles.paperSectionLabel}>MENIMBANG :</Text>
                <Text style={styles.paperBodyText}>
                  a. bahwa dalam rangka {namaKegiatanText || jenisTugas}, perlu menugaskan pegawai untuk melaksanakannya;
                </Text>
                <Text style={styles.paperBodyText}>
                  b. bahwa sehubungan dengan huruf a di atas, perlu diterbitkan Surat Tugas.
                </Text>
              </View>

              <View style={styles.paperSection}>
                <Text style={styles.paperSectionLabel}>DASAR :</Text>
                <Text style={styles.paperBodyText}>
                  1. Peraturan Menteri LHK tentang Organisasi dan Tata Kerja Balai Konservasi Sumber Daya Alam;
                </Text>
                <Text style={styles.paperBodyText}>
                  2. Surat Pengesahan DIPA TA 2026 Balai KSDA Kalimantan Timur.
                </Text>
              </View>

              {/* Memberi Perintah Kepada */}
              <Text style={styles.paperPerintahTitle}>MEMBERI PERINTAH:</Text>

              <View style={styles.paperSection}>
                <Text style={styles.paperSectionLabel}>KEPADA :</Text>
                {selectedEmployees.length === 0 ? (
                  <Text style={styles.paperBodyText}>- Belum ada pegawai terpilih -</Text>
                ) : (
                  selectedEmployees.map((p, idx) => (
                    <View key={p.id} style={styles.paperEmpRow}>
                      <Text style={styles.paperEmpNum}>{idx + 1}.</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paperEmpName}>{p.name}</Text>
                        <Text style={styles.paperEmpNip}>NIP. {p.nip}</Text>
                        <Text style={styles.paperEmpPos}>{p.position || "Staf Balai KSDA Kaltim"}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Untuk */}
              <View style={styles.paperSection}>
                <Text style={styles.paperSectionLabel}>UNTUK :</Text>
                <Text style={styles.paperBodyText}>
                  1. Melaksanakan {jenisTugas} dari {kotaAsal || "Samarinda"} ke {kotaTujuan || "Balikpapan"}{tempatSpesifik ? ` (${tempatSpesifik})` : ""} terhitung mulai tanggal <Text style={{ fontWeight: "800" }}>{tanggalMulai}</Text> s.d. <Text style={{ fontWeight: "800" }}>{tanggalSelesai}</Text>.
                </Text>
                <Text style={styles.paperBodyText}>
                  2. Membuat laporan tertulis paling lambat 7 hari kerja setelah selesainya kegiatan tersebut.
                </Text>
                <Text style={styles.paperBodyText}>
                  3. Segala biaya yang timbul dibebankan pada DIPA Balai KSDA Kalimantan Timur.
                </Text>
              </View>

              {/* Tanda Tangan Section */}
              <View style={styles.paperTtdBox}>
                <Text style={styles.paperTtdLoc}>Ditetapkan di: Samarinda</Text>
                <Text style={styles.paperTtdDate}>
                  Pada tanggal: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
                <Text style={styles.paperTtdJabatan}>Kepala Balai KSDA Kaltim,</Text>
                <View style={{ height: 45 }} />
                <Text style={styles.paperTtdName}>M. Ari Wibawanto, S.Hut., M.Sc.</Text>
                <Text style={styles.paperTtdNip}>NIP. 19740514 199903 1 001</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Toolbar Bottom Bar (Simpan ke HP & Share PDF & Print) */}
          <View style={styles.previewToolbarBottom}>
            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: "#059669" }]}
              onPress={handleSavePDFToHP}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.toolbarActionText}>Simpan ke HP</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: "#2563eb" }]}
              onPress={handleSharePDF}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.toolbarActionText}>Bagikan PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: "#475569" }]}
              onPress={handleDirectPrint}
              activeOpacity={0.8}
            >
              <Ionicons name="print-outline" size={18} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.toolbarActionText}>Cetak</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                          style={styles.dayCell}
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
                          <View style={[styles.dayCellInner, isSelected && styles.dayCellSelected]}>
                            <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                              {day}
                            </Text>
                          </View>
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

      {/* Render Dropdown Select Modal */}
      {Boolean(dropdownModalType) && (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDropdownModalType(null)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.dropdownModalCard}>
              <View style={styles.dropdownModalHeader}>
                <Text style={styles.dropdownModalTitle}>
                  {dropdownModalType === "jenisTugas" ? "Pilih Jenis Tugas" : "Pilih Sumber Dana"}
                </Text>
                <TouchableOpacity onPress={() => setDropdownModalType(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {(dropdownModalType === "templateST"
                  ? [
                      { id: "DEFAULT (MANUAL)", label: "DEFAULT (MANUAL)" },
                      { id: "BEDA HARI PATROLI", label: "BEDA HARI PATROLI" },
                      { id: "PATROLI FOLU NET SINK", label: "PATROLI FOLU NET SINK" },
                      { id: "PENDAMPINGAN FOLU NET SINK", label: "PENDAMPINGAN FOLU NET SINK" },
                    ]
                  : dropdownModalType === "jenisTugas"
                  ? [
                      { id: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )", label: "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )" },
                      { id: "Melaksanakan Kegiatan ( 1 Hari )", label: "Melaksanakan Kegiatan ( 1 Hari )" },
                      { id: "Menugaskan Staf", label: "Menugaskan Staf" },
                    ]
                  : [
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
                    ]
                ).map((opt) => {
                  const isSelected =
                    (dropdownModalType === "templateST"
                      ? selectedTemplate
                      : dropdownModalType === "jenisTugas"
                      ? jenisTugas
                      : sumberDana) === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowSelected]}
                      onPress={() => {
                        if (dropdownModalType === "templateST") {
                          setSelectedTemplate(opt.id);
                        } else if (dropdownModalType === "jenisTugas") {
                          setJenisTugas(opt.id as any);
                        } else {
                          setSumberDana(opt.id);
                        }
                        setDropdownModalType(null);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2563eb" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Render Custom Notification Modal */}
      {notification.visible && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setNotification((prev) => ({ ...prev, visible: false }))}
          >
            <TouchableOpacity activeOpacity={1} style={styles.notifCard}>
              <View style={[styles.notifIconBox, { backgroundColor: notification.type === "error" ? "#fef2f2" : "#fffbe8" }]}>
                <Ionicons
                  name={
                    notification.type === "error"
                      ? "alert-circle"
                      : notification.type === "success"
                      ? "checkmark-circle"
                      : "warning"
                  }
                  size={34}
                  color={
                    notification.type === "error"
                      ? "#ef4444"
                      : notification.type === "success"
                      ? "#10b981"
                      : "#f59e0b"
                  }
                />
              </View>
              <Text style={styles.notifTitle}>{notification.title}</Text>
              <Text style={styles.notifMessage}>{notification.message}</Text>
              <TouchableOpacity
                style={[
                  styles.notifBtn,
                  {
                    backgroundColor:
                      notification.type === "error"
                        ? "#ef4444"
                        : notification.type === "success"
                        ? "#10b981"
                        : "#2563eb",
                  },
                ]}
                onPress={() => {
                  if (notification.onConfirm) {
                    notification.onConfirm();
                  } else {
                    setNotification((prev) => ({ ...prev, visible: false }));
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.notifBtnText}>Saya Mengerti</Text>
              </TouchableOpacity>
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

  stBuilderHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.card,
    padding: 12,
    marginBottom: 16,
  },
  builderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  builderTitleText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  builderSubtitleText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 1,
  },
  templateCardContainer: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: RADIUS.input,
    padding: 12,
    marginBottom: 16,
  },
  templateBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  templateBadge: {
    backgroundColor: "#ea580c",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  templateBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  templateLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c2410c",
  },
  templateSelectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateSelectText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9a3412",
  },
  nomorSuratRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nomorSuratPrefix: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  nomorSuratPrefixText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  nomorSuratInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  nomorSuratFixed: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  nomorSuratFixedText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  addBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addBtnTextSmall: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
    marginLeft: 2,
  },
  addBtnIconOnly: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  dynamicItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  itemIndexText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 8,
    width: 16,
  },
  dynamicItemInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  deleteItemBtn: {
    padding: 8,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  personilChipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: RADIUS.input,
    padding: 8,
  },
  personilBadgeNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  personilNumText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  personilNameText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  emptyTembusanText: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
    marginVertical: 4,
  },
  sectionTitleHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1e293b",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 10,
  },
  btnSimpanDraft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingVertical: 12,
  },
  btnSimpanDraftText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  btnTerbitkanCetak: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: RADIUS.input,
    paddingVertical: 13,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnTerbitkanCetakText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  btnPreviewCetakFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.input,
    paddingVertical: 12,
  },
  btnPreviewCetakFullText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563eb",
  },
  subLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 4,
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
    alignItems: "center",
    marginBottom: 8,
  },
  weekDayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayCellInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
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

  // Dropdown Select & Custom Notification Styles
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#ffffff",
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
  },
  dropdownModalCard: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    elevation: 25,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  dropdownModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
  },
  dropdownOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownOptionRowSelected: {
    backgroundColor: "#eff6ff",
  },
  dropdownOptionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginRight: 8,
  },
  dropdownOptionTextSelected: {
    color: "#2563eb",
    fontWeight: "800",
  },

  // Notification Modal Styles
  notifCard: {
    width: "84%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    elevation: 25,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  notifIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  notifMessage: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  notifBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  // Preview Cetak ST Button & Modal Styles
  previewCetakBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  previewCetakBtnText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "800",
  },

  previewModalContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  previewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  previewScroll: {
    flex: 1,
    backgroundColor: "#334155",
  },
  paperSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 20,
    minHeight: 680,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  paperKopHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  kopKemLabel: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
  },
  kopDirLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginVertical: 1,
  },
  kopBalaiLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginBottom: 2,
  },
  kopSubText: {
    fontSize: 8.5,
    color: "#475569",
    textAlign: "center",
    marginBottom: 8,
  },
  doubleBorderLine: {
    width: "100%",
    height: 3,
    backgroundColor: "#000000",
    marginTop: 2,
  },
  paperTitleBox: {
    alignItems: "center",
    marginVertical: 12,
  },
  paperMainTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
    textDecorationLine: "underline",
    letterSpacing: 1,
  },
  paperSubTitleNum: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  paperSection: {
    marginBottom: 12,
  },
  paperSectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 3,
  },
  paperBodyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 16,
    marginBottom: 3,
  },
  paperPerintahTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginVertical: 8,
    letterSpacing: 0.5,
  },
  paperEmpRow: {
    flexDirection: "row",
    marginBottom: 6,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  paperEmpNum: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    marginRight: 6,
  },
  paperEmpName: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0f172a",
  },
  paperEmpNip: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  paperEmpPos: {
    fontSize: 10,
    color: "#475569",
  },
  paperTtdBox: {
    alignSelf: "flex-end",
    width: 220,
    marginTop: 16,
    paddingTop: 8,
  },
  paperTtdLoc: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  paperTtdDate: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  paperTtdJabatan: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 4,
  },
  paperTtdName: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0f172a",
    textDecorationLine: "underline",
  },
  paperTtdNip: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  previewToolbarBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  toolbarActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  toolbarActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});
