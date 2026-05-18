"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Search,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { isAxiosError } from "axios";
import STBuilderPreview from "./STBuilderPreview";
import {
  formatDateIndonesian,
  daysBetween,
  numberToWords,
  indexToLetter,
} from "@/lib/letter-utils";

// --- Types ---
interface Employee {
  id: string;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
  department?: string;
  position?: string;
}

interface DasarItem {
  id: string;
  text: string;
}

interface SumberDanaOption {
  id: string;
  label: string;
  dasarText: string;
  biayaText: string;
}

const SUMBER_DANA_OPTIONS: SumberDanaOption[] = [
  { id: 'dipa', label: 'DIPA', 
    dasarText: 'Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};'
  },
  { id: 'kja', label: 'Dana Kerjasama KJA',
    dasarText: 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT Kideco Jaya Agung Nomor : PKS.140/K.18/TU /Teknis/08/2023 dan Nomor : 213/KJA/LGL/CON/VIII/2023 tanggal 08 Agustus 2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Kideco Jaya Agung;'
  },
  { id: 'mja', label: 'Dana Kerjasama MJA',
    dasarText: 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Direktur PT Multi Jayantara Abadi Nomor : PKS.36/K.18/TU/Teknis/02/2023 dan Nomor : 001/MJA-Dir/ TPG/II /2023 tanggal 01 Februari 2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Multi Jayantara Abadi;'
  },
  { id: 'cop', label: 'Dana Kerjasama COP',
    dasarText: 'Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan Centre for Orangutan Protection (COP) Nomor: PKS.191/K.18/TU/Teknis/10/2023 dan Nomor 17/HQ10/COP/2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Centre for Orangutan Protection (COP);'
  },
  { id: 'tjiwi_kimia', label: 'Dana Kerjasama PT. Tjiwi Kimia Tbk.',
    dasarText: 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 dan Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang dan Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur dan PT Pabrik Kertas Tjiwi Kimia Tbk;'
  },
  { id: 'bosf', label: 'Dana Kerjasama BOSF',
    dasarText: 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Ketua Pengurus Yayasan Penyelamatan Orangutan Borneo Nomor : PKS.184/K.18/TU/PK12/2021 dan Nomor 176/YBOS /XII/2021 tanggal 6 Desember 2021.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan Yayasan Penyelamatan Orangutan Borneo (BOSF);'
  },
  { id: 'can', label: 'Dana Kerjasama CAN',
    dasarText: 'Perjanjian Kerja Sama antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Conservation Action Network (CAN) Nomor : PKS.45/K.18/TU/KSA.2.5/03/2025 dan 007/K-JAK/PKS/III/2025 tanggal 14 Maret 2025.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Conservation Action Network (CAN);'
  },
  { id: 'alert', label: 'Dana Kerjasama ALeRT',
    dasarText: 'Perjanjian Kerjasama Antara Kepala Balai KSDA Kalimantan Timur dengan Direktur Aliansi Lestrai Rimba Terpadu (AleRT) Nomor: PKS.192/K.18/TU/Teknis/10/2023 dan Nomor: 51/PKS-ALeRT/ X/2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan ALeRT (Aliansi Lestari Rimba Terpadu);'
  },
  { id: 'folu', label: 'Dana Kerjasama FOLU NC 2&3',
    dasarText: '',
    biayaText: 'Sumber dana dibebankan pada anggaran Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - Tahun Anggaran {tahun};'
  },
  { id: 'dl1', label: 'DL 1 / Tidak ada biaya',
    dasarText: '',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini tidak dibebankan pada anggaran manapun (DL 1 / tanpa biaya).'
  },
  { id: 'other', label: 'Lainnya',
    dasarText: '',
    biayaText: ''
  },
];

export default function STBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // --- Form State ---
  const [stNumber, setStNumber] = useState("");
  const [klasifikasi, setKlasifikasi] = useState("KSA.0X.0X");
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();

  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([
    { id: "1", text: "bahwa dalam rangka , perlu ;" },
    { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
  ]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([
    { id: "1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
    { id: "2", text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 24 April 2026.` },
  ]);

  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [headerTitle, setHeaderTitle] = useState("KEPALA BALAI,");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState("Perjalanan Dinas");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [kepalaBalai, setKepalaBalai] = useState({ name: "M. Ari Wibawanto, S.Hut., M.Sc.", nip: "19740514 199903 1 001" });
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().substring(0, 10));
  const [kotaSurat, setKotaSurat] = useState("Samarinda");
  const [tembusanItems, setTembusanItems] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suratStatus, setSuratStatus] = useState<string>("");

  const { data: allEmployees = [], isLoading: isSearching } = useQuery({
    queryKey: ["employees-select-builder"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data.data || [];
    },
  });

  const searchResults = allEmployees
    .filter((emp: Employee) => 
      (emp.nama_lengkap?.toLowerCase() || emp.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
      (emp.nip?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )
    .slice(0, 50);

  // Helper for "Untuk" text
  const buildUntukText = (): string => {
    const days = daysBetween(tanggalMulai, tanggalSelesai);
    const daysWord = numberToWords(days);
    const mulaiFormatted = formatDateIndonesian(tanggalMulai);
    const selesaiFormatted = formatDateIndonesian(tanggalSelesai);

    let text = "";

    if (activityPrefix && kotaAsal) {
      // Structured mode: prefix + dari + ke + dalam rangka + kegiatan
      text = `${activityPrefix} dari ${kotaAsal} ke ${kotaTujuan || "..."}`;
      if (namaKegiatan) {
        text += ` dalam rangka ${namaKegiatan}`;
      }
      if (tempatKegiatan) {
        text += ` di ${tempatKegiatan}`;
      }
    } else {
      // Freeform mode: namaKegiatan already contains the full text
      text = namaKegiatan || "...";
    }

    if (days > 0) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };

  // Build biaya text
  const buildBiayaText = (): string => {
    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === sumberDana);
    if (opt?.biayaText) {
      const tahun = tanggalSurat ? new Date(tanggalSurat).getFullYear().toString() : new Date().getFullYear().toString();
      return opt.biayaText.replace(/{tahun}/g, tahun);
    }
    if (sumberDana === 'other') {
      return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${sumberDanaOther || '...'};`;
    }
    return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;`;
  };

  // Function to update Dasar items based on Funding
  const updateDasarFromFunding = (fundingId: string, date: string) => {
    const tahun = date ? new Date(date).getFullYear().toString() : new Date().getFullYear().toString();

    // FOLU has a completely different template
    if (fundingId === 'folu') {
      setHeaderTitle("KEPALA UPT SELAKU\nPELAKSANA SATUAN KERJA IMPLEMENTING PARTNER FOLU NC 2&3");
      // Auto-set klasifikasi with FOLU.NC-23 prefix
      setKlasifikasi(prev => prev.startsWith("FOLU.NC-23/") ? prev : "FOLU.NC-23/" + prev);
      setMenimbangItems([
        { id: "folu-1", text: "bahwa dalam upaya menjaga kelestarian keanekaragaman hayati, perlu dilakukan kegiatan pengamanan dan perlindungan;" },
        { id: "folu-2", text: "bahwa dalam rangka kelancaran tugas Project Management Unit FOLU-NC 2 dan 3 maka dipandang perlu menugaskan pegawai dimaksud;" },
        { id: "folu-3", text: "bahwa untuk maksud tersebut (poin a dan b) perlu diterbitkan Surat Tugas." },
      ]);
      setDasarItems([
        { id: "folu-d1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
        { id: "folu-d2", text: `Keputusan Kepala Biro Perencanaan Kementerian Kehutanan Selaku Project Director FOLU NC 2&3 Nomor SK.30/ROCAN/PK/REN.02/6/2025 tentang Perubahan Atas Keputusan Kepala Biro Perencanaan Selaku Project Director FOLU NC 2&3 Nomor SK.11/ROCAN/PK/REN.02/4/2025 tentang Pedoman Operasional Proyek Implementasi FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia - Norwegia Tahap Kedua dan Ketiga yang dikelola oleh Badan Pengelola Dana Lingkungan Hidup dengan Mekanisme Pengelolaan Dana Lingkungan Hidup;` },
        { id: "folu-d3", text: `Keputusan Sekretaris Direktorat Jenderal Konservasi Sumber Daya Alam Dan Ekosistem Selaku Koordinator Kegiatan Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Nomor: SK.2/KSDAE/FOLU.NC-23/I/2026 Tentang Penunjukan Personil Tim Pengelola Proyek Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Yang Dikelola Oleh Badan Pengelola Dana Lingkungan Hidup;` },
        { id: "folu-d4", text: `Annual Work Plan (AWP) Tahun Anggaran ${tahun} Implementasi FOLU Net Sink 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia-Norwegia Tahap Kedua dan Ketiga Ditjen KSDAE.` },
      ]);
      setTembusanItems([
        "Kuasa Pengguna Anggaran Project Management Unit FOLU NC 2&3;",
        "Sekretaris Direktorat Jenderal KSDAE selaku Koordinator Kegiatan;",
        "Kepala Seksi KSDA Wilayah II Tenggarong;",
        "Yang Bersangkutan.",
      ]);
      return;
    }

    // Reset header for non-FOLU
    setHeaderTitle("KEPALA BALAI,");

    // Remove FOLU.NC-23 prefix from klasifikasi if present
    setKlasifikasi(prev => prev.replace(/^FOLU\.NC-23\//, ""));

    // Reset menimbang to default (2 items) if previously was FOLU (3 items)
    setMenimbangItems(prev => {
      if (prev.length === 3 && prev[0]?.id?.startsWith("folu")) {
        return [
          { id: "1", text: "bahwa dalam rangka , perlu ;" },
          { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
        ];
      }
      return prev;
    });

    // Reset tembusan if it was FOLU auto-filled
    setTembusanItems(prev => {
      if (prev.length === 4 && prev[0]?.includes("Kuasa Pengguna Anggaran")) {
        return [];
      }
      return prev;
    });

    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === fundingId);
    if (opt && opt.dasarText) {
      const text = opt.dasarText.replace(/{tahun}/g, tahun);
      
      setDasarItems(prev => {
        const newItems = [...prev];
        // Reset to 2 items if previously was FOLU (4 items)
        if (newItems.length > 2) {
          return [
            { id: "1", text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
            { id: Date.now().toString(), text },
          ];
        }
        if (newItems.length >= 2) {
          newItems[1].text = text;
        } else if (newItems.length === 1) {
          newItems.push({ id: Date.now().toString(), text });
        }
        return newItems;
      });
    }
  };

  // Initial Fetch & Parse
  useEffect(() => {
    const fetchAndParse = async (id: string) => {
      try {
        const res = await api.get(`/surat-tugas/${id}`);
        const data = res.data.data;
        setSuratStatus(data.status);

        // Parse nomor surat: "ST.001/K.18/TU/KSA.03.01/B/05/2026"
        if (data.nomor_surat) {
          // Extract number: ST.{number}/K.18/TU/{klasifikasi}/B/{mm}/{yyyy}
          const nomorMatch = data.nomor_surat.match(/^ST\.(.+?)\/K\.18\/TU\/(.+?)\/B\/(\d{2})\/(\d{4})$/);
          if (nomorMatch) {
            setStNumber(nomorMatch[1]);
            setKlasifikasi(nomorMatch[2]);
          } else {
            // Legacy fallback: ST.{number}/{code}/{mm}/{yyyy}
            const legacyMatch = data.nomor_surat.match(/^ST\.(.+?)\/(.+)\/(\d{2})\/(\d{4})$/);
            if (legacyMatch) {
              setStNumber(legacyMatch[1]);
              // Try to extract klasifikasi from code like "K.18/TU/KSA.03.01/B"
              const codeMatch = legacyMatch[2].match(/K\.18\/TU\/(.+?)\/B/);
              setKlasifikasi(codeMatch ? codeMatch[1] : legacyMatch[2]);
            } else {
              setStNumber(data.nomor_surat.replace(/^ST\./, ""));
            }
          }
        }
        if (data.kode_surat) {
          // Extract klasifikasi from kode_surat like "K.18/TU/KSA.03.01/B"
          const codeMatch = data.kode_surat.match(/K\.18\/TU\/(.+?)\/B/);
          if (codeMatch) {
            setKlasifikasi(codeMatch[1]);
          }
        }

        // Tanggal surat: default hari ini, bisa diganti manual
        // Hanya load dari API jika sudah pernah disimpan (bukan tanggal lama dari pengajuan)
        setTanggalSurat(new Date().toISOString().substring(0, 10));

        setTanggalMulai(data.tanggal_mulai?.split("T")[0] || "");
        setTanggalSelesai(data.tanggal_selesai?.split("T")[0] || "");
        
        const funding = data.sumber_dana || "dipa";
        setSumberDana(funding);
        if (data.sumber_dana_other) setSumberDanaOther(data.sumber_dana_other);
        
        setSelectedEmployees(data.employees || []);
        setKotaTujuan(data.tempat_tujuan || "");

        // Parse menimbang & dasar if saved
        if (data.menimbang && Array.isArray(data.menimbang) && data.menimbang.length > 0) {
          setMenimbangItems(data.menimbang);
        }
        if (data.dasar && Array.isArray(data.dasar) && data.dasar.length > 0) {
          setDasarItems(data.dasar);
        }
        if (data.tembusan && Array.isArray(data.tembusan) && data.tembusan.length > 0) {
          setTembusanItems(data.tembusan.filter((t: unknown): t is string => typeof t === 'string'));
        }

        const activityStr = data.maksud_tujuan || "";
        // Strip "selama X hari terhitung..." suffix that buildUntukText appends
        const selamaRegex = /,?\s*selama\s+\d+\s*\([^)]+\)\s*hari\s+terhitung.*$/i;
        const cleanedActivity = activityStr.replace(selamaRegex, "").replace(/[;,.]$/, "").trim();
        
        // Try to parse structured activity text: "[Melaksanakan] Perjalanan Dinas dari X ke Y [dalam rangka Z] [di W]"
        const regex = /^(?:Melaksanakan[.\s]+)?(Perjalanan\s+[Dd]inas)\s+dari\s+(.*?)\s+ke\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const match = cleanedActivity.match(regex);

        if (match) {
          setActivityPrefix(match[1]);
          setKotaAsal(match[2].trim());
          setKotaTujuan(match[3].trim());
          const rest = match[4].trim();
          const diRegex = /(.*)\s+di\s+([^,;]+)$/i;
          const diMatch = rest.match(diRegex);
          if (diMatch) {
            setNamaKegiatan(diMatch[1].trim());
            setTempatKegiatan(diMatch[2].trim());
          } else {
            // Remove trailing punctuation
            setNamaKegiatan(rest.replace(/[;,.]$/, '').trim());
          }
        } else {
          // Text doesn't match structured pattern — put entire text as namaKegiatan
          // and clear prefix/kota so buildUntukText just outputs namaKegiatan directly
          setActivityPrefix("");
          setKotaAsal("");
          setKotaTujuan("");
          setNamaKegiatan(cleanedActivity);
        }

        // Only update Dasar from funding if no saved dasar
        if (!data.dasar || !Array.isArray(data.dasar) || data.dasar.length === 0) {
          updateDasarFromFunding(funding, new Date().toISOString().substring(0, 10));
        }

        // Auto-fill klasifikasi & menimbang if kegiatan contains "konflik"
        const parsedKegiatan = cleanedActivity.toLowerCase();
        if (parsedKegiatan.includes("konflik")) {
          setKlasifikasi("KSA.03.01");
          // Override menimbang if it's still the default template (not yet customized by user)
          const currentMenimbang = data.menimbang && Array.isArray(data.menimbang) ? data.menimbang : [];
          const isDefaultTemplate = currentMenimbang.length === 0 || 
            (currentMenimbang[0]?.text === "bahwa dalam rangka , perlu ;");
          if (isDefaultTemplate) {
            setMenimbangItems([
              { id: "1", text: "bahwa dalam rangka kegiatan penanganan konflik satwa, perlu penyelamatan;" },
              { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
            ]);
          }
        }

        toast.success("Data berhasil diurai.");
      } catch (err) {
        console.error(err);
        if (isAxiosError(err) && err.response?.status === 404) {
          toast.error("Surat Tugas tidak ditemukan atau sudah dihapus.");
          router.push("/kepegawaian/surat-tugas/inbox");
          return;
        }
        toast.error("Gagal memuat data.");
      } finally {
        setIsInitializing(false);
      }
    };

    if (id) {
      fetchAndParse(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-fill klasifikasi & menimbang based on nama kegiatan keywords
  const handleNamaKegiatanChange = (value: string) => {
    setNamaKegiatan(value);
    const lower = value.toLowerCase();
    if (lower.includes("konflik")) {
      setKlasifikasi("KSA.03.01");
      setMenimbangItems(prev => {
        const newItems = [...prev];
        if (newItems.length > 0) {
          newItems[0] = { ...newItems[0], text: "bahwa dalam rangka kegiatan penanganan konflik satwa, perlu penyelamatan;" };
        }
        return newItems;
      });
    }
  };

  // Handlers
  // Simpan draft — save semua data tanpa ubah status
  const handleSave = async () => {
    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = stNumber && klasifikasi 
        ? `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}` 
        : "";
      const payload = {
        nomor_surat: fullNomorSurat || null,
        kode_surat: stCode || null,
        nama_kegiatan: buildUntukText(),
        tempat_tujuan: kotaTujuan || null,
        tanggal_surat: tanggalSurat || null,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        menimbang: menimbangItems,
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        employee_ids: selectedEmployees.map(e => e.id),
        tanggal_mulai: tanggalMulai || null,
        tanggal_selesai: tanggalSelesai || null,
      };
      await api.put(`/surat-tugas/${id}/approve`, payload);
      toast.success("Draft berhasil disimpan!");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menyimpan draft.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  // Ajukan persetujuan — ubah status ke "pending" (menunggu persetujuan kasubag)
  const handleSubmitForApproval = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (!klasifikasi) return toast.error("Klasifikasi harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");

    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        nama_kegiatan: buildUntukText(),
        tempat_tujuan: kotaTujuan || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        menimbang: menimbangItems,
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        employee_ids: selectedEmployees.map(e => e.id),
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        status: "pending"
      };
      await api.put(`/surat-tugas/${id}/approve`, payload);
      toast.success("Surat Tugas berhasil diajukan! Menunggu persetujuan Kasubag.");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      router.push("/kepegawaian/surat-tugas/history");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal mengajukan ST.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  // Setujui — ubah status ke "approved" (hanya kasubag/admin)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleApprove = async () => {
    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        nama_kegiatan: buildUntukText(),
        tempat_tujuan: kotaTujuan || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        menimbang: menimbangItems,
        dasar: dasarItems,
        employee_ids: selectedEmployees.map(e => e.id),
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        status: "approved"
      };
      await api.put(`/surat-tugas/${id}/approve`, payload);
      toast.success("Surat Tugas berhasil diterbitkan!");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      router.push("/kepegawaian/surat-tugas/history");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menerbitkan ST.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("surat-preview-doc");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>ST.${stNumber}-${namaKegiatan.replace(/[/\\?%*:|"<>]/g, '-')}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { 
            font-family: 'Bookman Old Style', 'Georgia', serif; 
            font-size: 11pt; 
            line-height: 1.25; 
            color: #000; 
            margin: 0; 
            padding: 0.4cm 1cm 1cm 3cm; 
            text-align: justify; 
          }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 2px 0; font-size: 11pt; }
          tr { page-break-inside: avoid; }
          img { max-width: none !important; }
          .ttd-placeholder { height: 80px; }
          /* KOP only on page 1 — hide on subsequent pages */
          .kop-surat { display: block; }
          /* Prevent signature + tembusan from being split across pages */
          div[style*="page-break-inside"] { page-break-inside: avoid; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Inisialisasi Builder...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <aside className="w-[420px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl z-10">
        <header className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-zinc-800 dark:text-white">ST Builder <span className="text-blue-600">Premium</span></h1>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Approval Mode</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <FormSection title="Nomor Surat">
            <div className="flex items-stretch bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/10">
              <div className="bg-zinc-100 dark:bg-zinc-700 px-3 flex items-center border-r border-zinc-200 dark:border-zinc-600 shrink-0"><span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">ST.</span></div>
              <input value={stNumber} onChange={e => setStNumber(e.target.value)} placeholder="001" className="w-14 px-2 py-2 text-sm font-bold bg-transparent outline-none text-center text-zinc-900 dark:text-white" />
              <div className="bg-zinc-100 dark:bg-zinc-700 px-2 flex items-center border-x border-zinc-200 dark:border-zinc-600 shrink-0"><span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">/K.18/TU/</span></div>
              <input value={klasifikasi} onChange={e => setKlasifikasi(e.target.value)} placeholder="KSA.0X.0X" className="flex-1 min-w-0 px-2 py-2 text-xs font-medium bg-transparent outline-none text-zinc-900 dark:text-white" />
              <div className="bg-zinc-100 dark:bg-zinc-700 px-2 flex items-center border-l border-zinc-200 dark:border-zinc-600 shrink-0"><span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">/B/{currentMonth}/{currentYear}</span></div>
            </div>
          </FormSection>

          <FormSection title="Pengaturan Dokumen">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Kota</label>
                <input value={kotaSurat} onChange={e => setKotaSurat(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Tanggal</label>
                <input 
                  type="date" 
                  value={tanggalSurat} 
                  onChange={e => {
                    const newDate = e.target.value;
                    setTanggalSurat(newDate);
                    updateDasarFromFunding(sumberDana, newDate);
                  }} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white" 
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Sumber Dana">
            <div className="space-y-2">
              <select 
                value={sumberDana} 
                onChange={e => {
                  const newFunding = e.target.value;
                  setSumberDana(newFunding);
                  updateDasarFromFunding(newFunding, tanggalSurat);
                }} 
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white"
              >
                {SUMBER_DANA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              {sumberDana === 'other' && (
                <input 
                  value={sumberDanaOther} 
                  onChange={e => setSumberDanaOther(e.target.value)} 
                  placeholder="Sebutkan sumber dana..." 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 animate-in slide-in-from-top-1 text-zinc-900 dark:text-white" 
                />
              )}
            </div>
          </FormSection>

          <FormSection title="Menimbang" action={<button onClick={() => setMenimbangItems([...menimbangItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-blue-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {menimbangItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-zinc-400 mt-2">{indexToLetter(idx)}</span>
                  <textarea value={item.text} onChange={e => { const n = [...menimbangItems]; n[idx].text = e.target.value; setMenimbangItems(n); }} className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white" />
                  <button onClick={() => setMenimbangItems(menimbangItems.filter(i => i.id !== item.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Dasar" action={<button onClick={() => setDasarItems([...dasarItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-blue-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {dasarItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-zinc-400 mt-2">{idx + 1}.</span>
                  <textarea value={item.text} onChange={e => { const n = [...dasarItems]; n[idx].text = e.target.value; setDasarItems(n); }} className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white" />
                  <button onClick={() => setDasarItems(dasarItems.filter(i => i.id !== item.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Kepada (Personil)" action={<span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">{selectedEmployees.length}</span>}>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                )}
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" placeholder="Cari..." />
              </div>
              <AnimatePresence>
                {showDropdown && searchQuery && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map((emp: Employee) => {
                      const isSelected = selectedEmployees.some(e => e.id === emp.id);
                      return (
                      <button key={emp.id} disabled={isSelected} onClick={() => { 
                        if (isSelected) return;
                        const normalized = { ...emp, nama_lengkap: emp.nama_lengkap || emp.name || "", jabatan: emp.jabatan || emp.position || "" };
                        setSelectedEmployees([...selectedEmployees, normalized]); 
                        setSearchQuery(""); 
                        setShowDropdown(false); 
                      }} className={`w-full px-4 py-2 text-left border-b border-zinc-100 dark:border-zinc-700 last:border-0 ${isSelected ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-700" : "hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}>
                        <p className={`text-sm font-bold ${isSelected ? "text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>{emp.nama_lengkap || emp.name} {isSelected ? "✓" : ""}</p>
                        <p className="text-[10px] text-zinc-400">{emp.nip}</p>
                      </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-2 mt-3">
              {selectedEmployees.map((emp, idx) => (
                <div key={`${emp.id}-${idx}`} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl group">
                  <span className="text-[10px] font-bold text-zinc-400">{idx+1}</span>
                  <div className="flex-1 truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">{emp.nama_lengkap || emp.name}</div>
                  <button onClick={() => setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Detail Kegiatan">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Jenis Tugas</label>
                <select 
                  value={activityPrefix} 
                  onChange={e => setActivityPrefix(e.target.value)} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white"
                >
                  <option value="Perjalanan Dinas">Perjalanan Dinas</option>
                  <option value="Melaksanakan Tugas">Melaksanakan Tugas</option>
                  <option value="Menugaskan Staf">Menugaskan Staf</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={kotaAsal} onChange={e => setKotaAsal(e.target.value)} placeholder="Asal" className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                <input value={kotaTujuan} onChange={e => setKotaTujuan(e.target.value)} placeholder="Tujuan" className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              </div>
              <textarea value={namaKegiatan} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder="Kegiatan..." className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white" />
              <input value={tempatKegiatan} onChange={e => setTempatKegiatan(e.target.value)} placeholder="Tempat Spesifik" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Tembusan" action={
            <button onClick={() => setTembusanItems([...tembusanItems, ""])} className="text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" />
            </button>
          }>
            <div className="space-y-2">
              {tembusanItems.length === 0 && (
                <p className="text-[11px] text-zinc-400 italic">Belum ada tembusan. Klik + untuk menambah.</p>
              )}
              {tembusanItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-4">{idx + 1}.</span>
                  <input
                    value={item}
                    onChange={(e) => {
                      const updated = [...tembusanItems];
                      updated[idx] = e.target.value;
                      setTembusanItems(updated);
                    }}
                    placeholder="Nama penerima tembusan..."
                    className="flex-1 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                  />
                  <button onClick={() => setTembusanItems(tembusanItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Penandatangan">
            <input value={kepalaBalai.name} onChange={e => setKepalaBalai({...kepalaBalai, name: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm mb-2 outline-none text-zinc-900 dark:text-white" />
            <input value={kepalaBalai.nip} onChange={e => setKepalaBalai({...kepalaBalai, nip: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
          </FormSection>
        </div>

        <footer className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0 space-y-2">
          <Button onClick={handleSave} variant="outline" className="w-full h-10 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
            <FileText className="w-4 h-4 mr-2" /> Simpan Draft
          </Button>
          
          {suratStatus === 'approved' || suratStatus === 'completed' ? (
            <Button disabled className="w-full h-12 bg-emerald-500 text-white rounded-xl font-bold opacity-80 cursor-not-allowed">
              <Send className="w-5 h-5 mr-2" /> Sudah Disetujui
            </Button>
          ) : (
            <Button onClick={handleSubmitForApproval} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">
              <Send className="w-5 h-5 mr-2" /> {suratStatus === 'pending' ? 'Perbarui & Ajukan' : 'Ajukan Persetujuan'}
            </Button>
          )}

          <Button variant="outline" onClick={handlePrint} className="w-full h-10 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
            <Printer className="w-5 h-5 mr-2" /> Cetak / Download
          </Button>
        </footer>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-zinc-200/50 dark:bg-zinc-950">
        <div className="relative">
          <div
            id="surat-preview-doc"
            className="w-[210mm] bg-white shadow-2xl selection:bg-blue-100"
            style={{
              padding: "0.4cm 1cm 1cm 3cm",
              fontFamily: "'Bookman Old Style', 'Georgia', serif",
              fontSize: "11pt",
              lineHeight: "1.25",
              color: "#000",
              textAlign: "justify",
              boxSizing: "border-box",
              minHeight: "297mm",
            }}
          >
            <STBuilderPreview 
              stNumber={stNumber} stCode={`K.18/TU/${klasifikasi}/B`} currentMonth={currentMonth} currentYear={currentYear}
              menimbangItems={menimbangItems} dasarItems={dasarItems} selectedEmployees={selectedEmployees}
              buildUntukText={buildUntukText} buildBiayaText={buildBiayaText}
              kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} kepalaBalai={kepalaBalai}
              tembusanItems={tembusanItems}
              headerTitle={headerTitle}
              sumberDana={sumberDana}
            />
          </div>
          {/* Page break indicators */}
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "297mm" }}>
            <div className="h-8 bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 tracking-widest">HALAMAN 2</span>
            </div>
          </div>
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "calc(297mm * 2 + 32px)" }}>
            <div className="h-8 bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 tracking-widest">HALAMAN 3</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{title}</label>
        {action}
      </div>
      {children}
    </div>
  );
}
