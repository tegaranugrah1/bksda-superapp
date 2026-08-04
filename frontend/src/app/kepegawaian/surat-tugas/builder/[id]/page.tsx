"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  GripVertical,
  Printer,
  Plus,
  Trash2,
  Search,
  Loader2,
  Send,
  X,
  CheckCircle,
  Shield,
  Eye,
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
  formatNIP,
  daysBetween,
  numberToWords,
  buildFoluMenimbangText,
  isGeneratedFoluMenimbangText,
} from "@/lib/letter-utils";
import {
  DEFAULT_KEPALA_BALAI,
  PLH_WILAYAH_PLACEHOLDER,
  PLH_KEGIATAN_KASI_PLACEHOLDER,
  SUMBER_DANA_OPTIONS,
  buildBiayaTextFor,
  cleanPlhKegiatanKasi,
  extractPlhWilayahFromPosition,
  getDefaultUntukItems,
  isGeneratedBiayaItem,
  isSingleDayActivityPrefix,
  normalizeSumberDana,
  shouldRenderAsSingleDayActivity,
  splitStoredUntukItems,
  toDasarItems,
  printSuratTugas,
  type DasarItem,
  type Employee,
} from "../../_lib";
import { FormSection } from "../../_components/FormSection";
import { EditableItemListSection } from "../../_components/EditableItemListSection";
import { TembusanSection } from "../../_components/TembusanSection";
import { PenandatanganSection } from "../../_components/PenandatanganSection";

// --- Local types & constants below moved to ../../_lib ---
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
  const [untukItems, setUntukItems] = useState<DasarItem[]>(getDefaultUntukItems(null));

  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState("KEPALA BALAI,");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState("Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [plhWilayah, setPlhWilayah] = useState("");
  const [plhKegiatanKasi, setPlhKegiatanKasi] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  // Beda Hari template: tanggal per pegawai
  const [employeeDates, setEmployeeDates] = useState<Record<string, { mulai: string; selesai: string }>>({});
  const [judulLampiranBedaHari, setJudulLampiranBedaHari] = useState("DAFTAR PEGAWAI MENGIKUTI PATROLI");
  const [kepalaBalai, setKepalaBalai] = useState(DEFAULT_KEPALA_BALAI);
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().substring(0, 10));
  const [kotaSurat, setKotaSurat] = useState("Samarinda");
  const [tembusanItems, setTembusanItems] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suratStatus, setSuratStatus] = useState<string>("");
  const [draggedUntukIndex, setDraggedUntukIndex] = useState<number | null>(null);
  const isSingleDayActivity = isSingleDayActivityPrefix(activityPrefix);
  const isPublished = ['diterbitkan', 'approved', 'completed', 'published'].includes((suratStatus || "").toLowerCase());

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

  const replacePlhPlaceholders = (value: string) => {
    if (templateType !== "plh") return value;
    return value
      .split(PLH_WILAYAH_PLACEHOLDER)
      .join(plhWilayah.trim() || "...")
      .split(PLH_KEGIATAN_KASI_PLACEHOLDER)
      .join(plhKegiatanKasi.trim() || "...");
  };

  const getPreviewMenimbangItems = () =>
    templateType === "plh"
      ? menimbangItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : menimbangItems;

  const getPreviewUntukItems = () =>
    templateType === "plh"
      ? untukItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : untukItems;

  const getTempatTujuanForPayload = () => {
    if (templateType === "plh") {
      return plhWilayah.trim() || kotaTujuan.trim() || tempatKegiatan.trim();
    }
    return kotaTujuan.trim();
  };

  // Helper for "Untuk" text
  const buildUntukText = (): string => {
    // Beda Hari: hitung MIN tanggal mulai dan MAX tanggal selesai dari semua pegawai
    const isBedaHariTemplate = templateType === "beda-hari";
    let effectiveMulai = tanggalMulai;
    let effectiveSelesai = tanggalSelesai;
    if (isBedaHariTemplate) {
      const allMulai = selectedEmployees
        .map((emp) => employeeDates[emp.id]?.mulai)
        .filter((d): d is string => Boolean(d));
      const allSelesai = selectedEmployees
        .map((emp) => employeeDates[emp.id]?.selesai)
        .filter((d): d is string => Boolean(d));
      if (allMulai.length > 0) {
        effectiveMulai = allMulai.reduce((min, d) => (d < min ? d : min), allMulai[0]);
      }
      if (allSelesai.length > 0) {
        effectiveSelesai = allSelesai.reduce((max, d) => (d > max ? d : max), allSelesai[0]);
      }
    }

    const days = daysBetween(effectiveMulai, effectiveSelesai);
    const daysWord = numberToWords(days);
    const mulaiFormatted = formatDateIndonesian(effectiveMulai);
    const selesaiFormatted = formatDateIndonesian(effectiveSelesai);

    let text = "";
    const isBmnTemplate = templateType === "bmn-pemeriksaan";
    const isPlhTemplate = templateType === "plh";
    const isSingleDayActivity = shouldRenderAsSingleDayActivity(activityPrefix, effectiveMulai, effectiveSelesai, templateType);

    // BMN template: always freeform, no date suffix
    if (isBmnTemplate) {
      text = namaKegiatan || "...";
      if (!text.trim().endsWith(".") && !text.trim().endsWith(";")) {
        text += ".";
      }
      return text;
    }

    // PLH template: durasi tampil di bagian Untuk, bukan di kegiatan Kepala Seksi.
    if (isPlhTemplate) {
      text = replacePlhPlaceholders(namaKegiatan || "...");
      if (days > 0) {
        text += ` selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
      } else if (!text.trim().endsWith(";") && !text.trim().endsWith(".")) {
        text += ".";
      }
      return text;
    }

    if (activityPrefix.includes("Perjalanan Dinas")) {
      text = `Melaksanakan Perjalanan Dinas dari ${kotaAsal || "..."} ke ${kotaTujuan || "..."}`;
      if (namaKegiatan) {
        text += ` dalam rangka ${namaKegiatan}`;
      }
      if (tempatKegiatan) {
        text += ` di ${tempatKegiatan}`;
      }
    } else if (activityPrefix.includes("Melaksanakan Kegiatan")) {
      text = `Melaksanakan Kegiatan ${namaKegiatan || "..."}`;
      if (tempatKegiatan) {
        text += ` pada ${tempatKegiatan}`;
      }
      if (kotaTujuan) {
        text += ` di ${kotaTujuan}`;
      }
    } else {
      text = `Menugaskan Staf untuk ${namaKegiatan || "..."}`;
      if (tempatKegiatan) {
        text += ` pada ${tempatKegiatan}`;
      }
      if (kotaTujuan) {
        text += ` di ${kotaTujuan}`;
      }
    }

    if (days > 0) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };

  const buildMaksudTujuanText = (): string =>
    [
      buildUntukText(),
      ...getPreviewUntukItems().map((item) => item.text),
    ]
      .filter((item) => item && item.trim())
      .join("\n");

  const syncBiayaUntukItem = (nextBiayaText: string) => {
    setUntukItems((prev) => {
      const existingIndex = prev.findIndex((item) => isGeneratedBiayaItem(item.text));
      if (!nextBiayaText.trim()) {
        return existingIndex >= 0 ? prev.filter((_, idx) => idx !== existingIndex) : prev;
      }
      if (existingIndex >= 0) {
        return prev.map((item, idx) => idx === existingIndex ? { ...item, text: nextBiayaText } : item);
      }
      return [...prev, { id: "untuk-biaya", text: nextBiayaText }];
    });
  };

  const handleSumberDanaChange = (newFunding: string) => {
    setSumberDana(newFunding);
    updateDasarFromFunding(newFunding, tanggalSurat);
    syncBiayaUntukItem(buildBiayaTextFor(newFunding, sumberDanaOther, tanggalSurat, templateType));
  };

  const handleSumberDanaOtherChange = (value: string) => {
    setSumberDanaOther(value);
    if (sumberDana === "other") {
      syncBiayaUntukItem(buildBiayaTextFor("other", value, tanggalSurat, templateType));
    }
  };

  const moveUntukItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setUntukItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
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
        { id: "folu-1", text: buildFoluMenimbangText(namaKegiatan, tempatKegiatan) },
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

  // Apply BMN Penghapusan template: one-click preset for ST Pemeriksaan BMN
  const applyBmnTemplate = () => {
    setHeaderTitle("KEPALA BALAI,");
    setKlasifikasi("KAP.05");
    setSumberDana("dl1");
    setTemplateType("bmn-pemeriksaan");

    // Default tanggal kegiatan = hari ini (1 hari, user bisa ubah)
    const today = new Date().toISOString().substring(0, 10);
    setTanggalMulai(today);
    setTanggalSelesai(today);

    setMenimbangItems([
      { id: "bmn-m1", text: "bahwa dalam rangka penghapusan Barang Milik Negara berupa Alat Angkutan Bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur;" },
      { id: "bmn-m2", text: "bahwa sehubungan dengan butir a tersebut di atas dipandang perlu untuk menugaskan staf tersebut di bawah ini untuk melakukan pemeriksaan Barang Milik Negara." },
    ]);

    setDasarItems([
      { id: "bmn-d1", text: "Undang-Undang RI Nomor 17 Tahun 2003 tentang Keuangan Negara;" },
      { id: "bmn-d2", text: "Undang-Undang RI Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;" },
      { id: "bmn-d3", text: "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;" },
      { id: "bmn-d4", text: "Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;" },
      { id: "bmn-d5", text: "Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;" },
      { id: "bmn-d6", text: "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;" },
      { id: "bmn-d7", text: "Peraturan Menteri Keuangan Nomor 181/PMK.06/2016 tentang Penatausahaan Barang Milik Negara;" },
      { id: "bmn-d8", text: "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan." },
    ]);

    // Freeform "Untuk" mode: clear structured fields, set namaKegiatan to BMN-specific text
    setActivityPrefix("");
    setKotaAsal("");
    setKotaTujuan("");
    setTempatKegiatan("");
    setNamaKegiatan("Melaksanakan pemeriksaan Barang Milik Negara berupa Alat Angkutan Bermotor pada tanggal " + formatDateIndonesian(today));
    setUntukItems(getDefaultUntukItems("bmn-pemeriksaan"));

    setTembusanItems([]);
  };

  // Apply Beda Hari template â€” Kepada jadi "Daftar nama terlampir." + halaman lampiran auto-generate
  const applyBedaHariTemplate = () => {
    setTemplateType("beda-hari");
    setUntukItems(getDefaultUntukItems("beda-hari", buildBiayaTextFor(sumberDana, sumberDanaOther, tanggalSurat, "beda-hari")));
    // Initialize employeeDates dari tanggalMulai/Selesai global jika sudah diisi
    setEmployeeDates((prev) => {
      const next = { ...prev };
      selectedEmployees.forEach((emp) => {
        if (!next[emp.id]) {
          next[emp.id] = { mulai: tanggalMulai || "", selesai: tanggalSelesai || "" };
        }
      });
      return next;
    });
  };

  // Apply PLH template â€” pelaksana harian Kepala Seksi
  const applyPlhTemplate = () => {
    setTemplateType("plh");
    setHeaderTitle("KEPALA BALAI,");
    setKlasifikasi("PEG.09.01");
    setSumberDana("dl1");

    setPlhWilayah("");
    setPlhKegiatanKasi("");

    setMenimbangItems([
      {
        id: "plh-m1",
        text: `bahwa Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER} akan melaksanakan ${PLH_KEGIATAN_KASI_PLACEHOLDER};`,
      },
      {
        id: "plh-m2",
        text: `bahwa sehubungan dengan hal tersebut di atas untuk kelancaran pelaksanaan tugas sehari-hari maka perlu ada pejabat sementara yang menggantikan tugas Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}.`,
      },
    ]);

    setDasarItems([
      {
        id: "plh-d1",
        text: "Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : {nomor_st_induk} tanggal {tanggal_st_induk}.",
      },
    ]);

    // Freeform "Untuk" mode
    setActivityPrefix("");
    setKotaAsal("");
    setKotaTujuan("");
    setTempatKegiatan("");
    setNamaKegiatan(
      `Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}`,
    );
    setUntukItems(getDefaultUntukItems("plh"));

    setTembusanItems([
      "Direktur Jenderal KSDAE;",
      "Sekretaris Direktorat Jenderal KSDAE.",
    ]);
  };

  // Generic template handler: dropdown 4 pilihan
  const handleTemplateChange = (value: string) => {
    if (value === "bmn-pemeriksaan") {
      applyBmnTemplate();
    } else if (value === "beda-hari") {
      applyBedaHariTemplate();
    } else if (value === "plh") {
      applyPlhTemplate();
    } else {
      setTemplateType(null);
      setUntukItems(getDefaultUntukItems(null, buildBiayaTextFor(sumberDana, sumberDanaOther, tanggalSurat, null)));
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
          const match = data.nomor_surat.match(/ST\.\s*(.+?)\/K\.18\/TU\/(.+?)\/B/i);
          if (match) {
            setStNumber(match[1].trim());
            setKlasifikasi(match[2].trim());
          } else {
            const simpleMatch = data.nomor_surat.match(/ST\.\s*(\d+)/i);
            if (simpleMatch) {
              setStNumber(simpleMatch[1].trim());
            } else {
              setStNumber(data.nomor_surat.replace(/^ST\./, "").trim());
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

        const loadedTanggalMulai = data.tanggal_mulai?.split("T")[0] || "";
        const loadedTanggalSelesai = data.tanggal_selesai?.split("T")[0] || "";
        setTanggalMulai(loadedTanggalMulai);
        setTanggalSelesai(loadedTanggalSelesai);
        
        const funding = normalizeSumberDana(data.sumber_dana);
        setSumberDana(funding);
        if (data.sumber_dana_other) setSumberDanaOther(data.sumber_dana_other);

        // Load template type if present (for ST that was created with a template)
        if (data.template_type) {
          setTemplateType(data.template_type);
          if (data.template_type === "plh") {
            const firstEmployee = data.employees?.[0];
            setPlhWilayah(extractPlhWilayahFromPosition(firstEmployee?.jabatan || firstEmployee?.position || data.tempat_tujuan));
            const firstMenimbang = Array.isArray(data.menimbang) ? data.menimbang[0]?.text || "" : "";
            const kegiatanMatch = firstMenimbang.match(/akan melaksanakan\s+(.+?);?$/i);
            setPlhKegiatanKasi(cleanPlhKegiatanKasi(kegiatanMatch?.[1] || data.maksud_tujuan));
          }
        }
        if (data.penandatangan_nama || data.penandatangan_nip) {
          setKepalaBalai({
            name: data.penandatangan_nama || DEFAULT_KEPALA_BALAI.name,
            nip: data.penandatangan_nip ? formatNIP(data.penandatangan_nip) : DEFAULT_KEPALA_BALAI.nip,
          });
        }
        
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
          const parsedTembusan = data.tembusan.map((t: unknown) => {
            if (typeof t === 'string') return t.trim();
            if (t && typeof t === 'object' && 'text' in t && typeof (t as any).text === 'string') return (t as any).text.trim();
            return '';
          }).filter(Boolean);
          setTembusanItems(parsedTembusan);
        }

        const storedUntukLines = splitStoredUntukItems(data.maksud_tujuan);
        const storedAdditionalUntuk = storedUntukLines
          .slice(1);
        setUntukItems(
          storedAdditionalUntuk.length > 0
            ? toDasarItems(storedAdditionalUntuk, "stored-untuk")
            : getDefaultUntukItems(data.template_type, buildBiayaTextFor(funding, data.sumber_dana_other || "", new Date().toISOString().substring(0, 10), data.template_type)),
        );

        const activityStr = storedUntukLines[0] || data.maksud_tujuan || "";
        // Strip "selama X hari terhitung..." suffix that buildUntukText appends
        const selamaRegex = /,?\s*selama\s+\d+\s*\([^)]+\)\s*(?:hari(?:\s+kerja)?\s+)?terhitung.*$/i;
        const cleanedActivity = activityStr.replace(selamaRegex, "").replace(/[;,.]$/, "").trim();
        
        // Try to parse structured activity text: "[Melaksanakan] Perjalanan Dinas dari X ke Y [dalam rangka Z] [di W]"
        const regex = /^(?:Melaksanakan[.\s]+)?(Perjalanan\s+[Dd]inas)\s+dari\s+(.*?)\s+ke\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const singleDayActivity = cleanedActivity.replace(/\s+pada\s+tanggal\s+.+$/i, "").replace(/[;,.]$/, "").trim();
        const isParsedSingleDayActivity = /^Melaksanakan\s+/i.test(singleDayActivity) && /\s+pada\s+tanggal\s+/i.test(cleanedActivity);
        const isOneDayFromSubmittedForm =
          loadedTanggalMulai &&
          loadedTanggalSelesai &&
          loadedTanggalMulai === loadedTanggalSelesai &&
          !["bmn-pemeriksaan", "beda-hari", "plh"].includes(data.template_type || "");

        const match = cleanedActivity.match(regex);

        if (isParsedSingleDayActivity || (isOneDayFromSubmittedForm && !match)) {
          setActivityPrefix("Melaksanakan Kegiatan");
          setKotaAsal("");
          setKotaTujuan("");
          setTempatKegiatan("");
          setNamaKegiatan(singleDayActivity);
        } else if (match) {
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
          // Text doesn't match structured pattern â€” put entire text as namaKegiatan
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

        if (funding === "folu") {
          const currentMenimbang = data.menimbang && Array.isArray(data.menimbang) ? data.menimbang : [];
          const firstMenimbang = currentMenimbang[0];
          const shouldUseFoluTemplate = currentMenimbang.length === 0 ||
            firstMenimbang?.id === "folu-1" ||
            isGeneratedFoluMenimbangText(firstMenimbang?.text);

          if (shouldUseFoluTemplate) {
            setMenimbangItems(prev => {
              const nextItems = prev.length >= 3 ? [...prev] : [
                { id: "folu-1", text: "" },
                { id: "folu-2", text: "bahwa dalam rangka kelancaran tugas Project Management Unit FOLU-NC 2 dan 3 maka dipandang perlu menugaskan pegawai dimaksud;" },
                { id: "folu-3", text: "bahwa untuk maksud tersebut (poin a dan b) perlu diterbitkan Surat Tugas." },
              ];

              nextItems[0] = {
                ...nextItems[0],
                id: "folu-1",
                text: buildFoluMenimbangText(cleanedActivity),
              };
              return nextItems;
            });
          }
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
  const updateFoluMenimbang = (activity: string, place: string) => {
    setMenimbangItems(prev => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      const isDefaultText = first.text === "bahwa dalam rangka , perlu ;";
      if (first.id !== "folu-1" && !isDefaultText && !isGeneratedFoluMenimbangText(first.text)) return prev;

      const nextText = buildFoluMenimbangText(activity, place);
      if (first.text === nextText && first.id === "folu-1") return prev;

      const nextItems = [...prev];
      nextItems[0] = { ...first, id: "folu-1", text: nextText };
      return nextItems;
    });
  };

  const handleNamaKegiatanChange = (value: string) => {
    setNamaKegiatan(value);
    if (sumberDana === "folu") {
      updateFoluMenimbang(value, tempatKegiatan);
    }

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

  const handleActivityPrefixChange = (value: string) => {
    setActivityPrefix(value);
    if (isSingleDayActivityPrefix(value)) {
      const singleDate = tanggalMulai || tanggalSelesai;
      setKotaAsal("");
      setKotaTujuan("");
      if (singleDate) {
        setTanggalMulai(singleDate);
        setTanggalSelesai(singleDate);
      }
    }
  };

  // Handlers
  // Simpan draft â€” save semua data tanpa ubah status
  const handleSave = async () => {
    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = stNumber && stNumber.trim()
        ? `ST.${stNumber.trim()}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}` 
        : null;
      const payload = {
        status: "draft",
        nomor_surat: fullNomorSurat,
        kode_surat: stCode || null,
        maksud_tujuan: buildMaksudTujuanText(),
        nama_kegiatan: buildMaksudTujuanText(),
        tempat_tujuan: getTempatTujuanForPayload() || null,
        tanggal_surat: tanggalSurat || null,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employees: selectedEmployees.map(e => ({ id: e.id })),
        tanggal_mulai: tanggalMulai || null,
        tanggal_selesai: tanggalSelesai || null,
      };

      await api.put(`/surat-tugas/${id}`, payload);
      toast.success("Draft berhasil disimpan!");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menyimpan draft.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleUpdateNomorSurat = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (!klasifikasi) return toast.error("Klasifikasi harus diisi.");

    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      await api.put(`/surat-tugas/${id}`, {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
      });
      toast.success("Nomor Surat berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["surat-tugas-detail", id] });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Gagal memperbarui Nomor Surat.");
    }
  };

  // Ajukan persetujuan — ubah status ke "pending" (menunggu persetujuan kasubag)
  const handleSubmitForApproval = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (!klasifikasi) return toast.error("Klasifikasi harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (templateType === "plh" && !tempatTujuanPayload) return toast.error("Wilayah/tujuan PLH harus diisi.");

    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        nama_kegiatan: buildMaksudTujuanText(),
        tempat_tujuan: tempatTujuanPayload || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
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

  // Setujui â€” ubah status ke "approved" (hanya kasubag/admin)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleApprove = async () => {
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (templateType === "plh" && !tempatTujuanPayload) return toast.error("Wilayah/tujuan PLH harus diisi.");

    try {
      const stCode = `K.18/TU/${klasifikasi}/B`;
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        nama_kegiatan: buildMaksudTujuanText(),
        tempat_tujuan: tempatTujuanPayload || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
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
    printSuratTugas(stNumber, namaKegiatan);
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
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">
            {isPublished ? "MODE PRATINJAU (SUDAH DITERBITKAN)" : "APPROVAL MODE"}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {isPublished && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Surat Tugas ini sudah diterbitkan dan bersifat Read Only (tidak dapat diubah).</span>
            </div>
          )}
          {/* === Template Card (paling atas, di atas Nomor Surat) === */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-500/10">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded-full bg-orange-600 px-2 text-[9px] font-bold uppercase tracking-wider text-white">Template</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                Pilih Template ST
              </span>
            </div>
            <select
              value={templateType ?? ""}
              disabled={isPublished}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-700 outline-none transition focus:ring-2 focus:ring-orange-500/20 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-orange-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Default (Manual)</option>
              <option value="bmn-pemeriksaan">Penghapusan BMN</option>
              <option value="beda-hari">Beda Hari (Daftar Lampiran)</option>
              <option value="plh">PLH (Pelaksana Harian Kepala Seksi)</option>
            </select>
            {templateType === "beda-hari" && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Kepada surat akan otomatis &quot;Daftar nama terlampir.&quot; Set tanggal per pegawai di section di bawah.
              </p>
            )}
            {templateType === "bmn-pemeriksaan" && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Klasifikasi KAP.05 + 8 peraturan dasar + freeform Untuk telah diterapkan.
              </p>
            )}
            {templateType === "plh" && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Template PLH aktif. Ganti placeholder <code>{"{wilayah}"}</code> dan <code>{"{kegiatan Kepala Seksi}"}</code> di Menimbang/Untuk dengan nilai sesuai.
              </p>
            )}
          </div>

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
                <input value={kotaSurat} disabled={isPublished} onChange={e => setKotaSurat(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Tanggal</label>
                <input 
                  type="date" 
                  value={tanggalSurat} 
                  disabled={isPublished}
                  onChange={e => {
                    const newDate = e.target.value;
                    setTanggalSurat(newDate);
                    updateDasarFromFunding(sumberDana, newDate);
                    syncBiayaUntukItem(buildBiayaTextFor(sumberDana, sumberDanaOther, newDate, templateType));
                  }} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Sumber Dana">
            <div className="space-y-2">
              <select 
                value={sumberDana} 
                disabled={isPublished}
                onChange={e => handleSumberDanaChange(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {SUMBER_DANA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              {sumberDana === 'other' && (
                <input 
                  value={sumberDanaOther} 
                  disabled={isPublished}
                  onChange={e => handleSumberDanaOtherChange(e.target.value)} 
                  placeholder="Sebutkan sumber dana..." 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 animate-in slide-in-from-top-1 text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              )}
            </div>
          </FormSection>

          <EditableItemListSection
            title="Menimbang"
            items={menimbangItems}
            onChange={setMenimbangItems}
            marker="letter"
            disabled={isPublished}
          />

          <EditableItemListSection
            title="Dasar"
            items={dasarItems}
            onChange={setDasarItems}
            marker="number"
            disabled={isPublished}
          />

          <FormSection title="Kepada (Personil)" action={<span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">{selectedEmployees.length}</span>}>
            {!isPublished && (
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
                          if (templateType === "beda-hari") {
                            setEmployeeDates((prev) => ({
                              ...prev,
                              [normalized.id]: prev[normalized.id] || { mulai: tanggalMulai || "", selesai: tanggalSelesai || "" },
                            }));
                          }
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
            )}
            <div className="space-y-2 mt-3">
              {selectedEmployees.map((emp, idx) => {
                const dateRange = employeeDates[emp.id] || { mulai: "", selesai: "" };
                return (
                  <div key={`${emp.id}-${idx}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-400">{idx + 1}</span>
                      <div className="flex-1 truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">{emp.nama_lengkap || emp.name}</div>
                      {!isPublished && (
                        <button onClick={() => {
                          setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
                          setEmployeeDates((prev) => {
                            const next = { ...prev };
                            delete next[emp.id];
                            return next;
                          });
                        }} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                    {templateType === "beda-hari" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Tanggal Mulai</label>
                          <input
                            type="date"
                            value={dateRange.mulai}
                            disabled={isPublished}
                            onChange={(e) =>
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [emp.id]: { ...dateRange, mulai: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Tanggal Selesai</label>
                          <input
                            type="date"
                            value={dateRange.selesai}
                            disabled={isPublished}
                            onChange={(e) =>
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [emp.id]: { ...dateRange, selesai: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {templateType === "beda-hari" && (
              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-2 dark:border-orange-500/30 dark:bg-orange-500/10">
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                  Judul Lampiran
                </label>
                <input
                  type="text"
                  value={judulLampiranBedaHari}
                  disabled={isPublished}
                  onChange={(e) => setJudulLampiranBedaHari(e.target.value)}
                  className="w-full rounded-lg border border-orange-300 bg-white px-2 py-1 text-xs outline-none dark:border-orange-500/30 dark:bg-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </FormSection>

          <FormSection title="Detail Kegiatan">
            <div className="space-y-3">
              {templateType === "plh" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">Wilayah Kepala Seksi</label>
                    <input
                      value={plhWilayah}
                      disabled={isPublished}
                      onChange={(e) => setPlhWilayah(e.target.value)}
                      placeholder="Contoh: Wilayah II Tenggarong"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">Kegiatan Kepala Seksi</label>
                    <textarea
                      value={plhKegiatanKasi}
                      disabled={isPublished}
                      onChange={(e) => setPlhKegiatanKasi(e.target.value)}
                      placeholder="Kegiatan Kepala Seksi yang menjadi dasar PLH"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm min-h-[72px] outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Jenis Tugas</label>
                <select 
                  value={activityPrefix} 
                  disabled={isPublished}
                  onChange={e => handleActivityPrefixChange(e.target.value)} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none cursor-pointer text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )">Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )</option>
                  <option value="Melaksanakan Kegiatan ( 1 Hari )">Melaksanakan Kegiatan ( 1 Hari )</option>
                  <option value="Menugaskan Staf">Menugaskan Staf</option>
                </select>
              </div>

              {activityPrefix.includes("Perjalanan Dinas") ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Dari ( Kota / Lokasi Asal ) *</label>
                      <input value={kotaAsal} disabled={isPublished} onChange={e => setKotaAsal(e.target.value)} placeholder="Contoh: Samarinda" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Ke ( Kota / Kabupaten Tujuan ) *</label>
                      <input value={kotaTujuan} disabled={isPublished} onChange={e => setKotaTujuan(e.target.value)} placeholder="Contoh: Kutai Barat" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Dalam Rangka *</label>
                    <textarea value={namaKegiatan} disabled={isPublished} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder="Contoh: Kegiatan Inventarisasi dan Verifikasi..." className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Di ( Tempat Spesifik / Opsional )</label>
                    <input value={tempatKegiatan} disabled={isPublished} onChange={e => {
                      const nextPlace = e.target.value;
                      setTempatKegiatan(nextPlace);
                      if (sumberDana === "folu") {
                        updateFoluMenimbang(namaKegiatan, nextPlace);
                      }
                    }} placeholder="Contoh: Suaka Margasatwa Kelian" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">
                      {activityPrefix.includes("Melaksanakan Kegiatan") ? "Melaksanakan Kegiatan ( 1 Hari ) *" : "Menugaskan Staf *"}
                    </label>
                    <textarea value={namaKegiatan} disabled={isPublished} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder={activityPrefix.includes("Melaksanakan Kegiatan") ? "opname fisik (stok opname) barang persediaan" : "verifikasi berkas administrasi persediaan"} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Pada ( Tempat / Unit / Lokasi )</label>
                      <input value={tempatKegiatan} disabled={isPublished} onChange={e => {
                        const nextPlace = e.target.value;
                        setTempatKegiatan(nextPlace);
                        if (sumberDana === "folu") {
                          updateFoluMenimbang(namaKegiatan, nextPlace);
                        }
                      }} placeholder="Contoh: Kantor Balai / tempat kegiatannya" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Di ( Kota / Kabupaten ) *</label>
                      <input value={kotaTujuan} disabled={isPublished} onChange={e => setKotaTujuan(e.target.value)} placeholder="Contoh: Samarinda" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                    </div>
                  </div>
                </>
              )}
              {isSingleDayActivity ? (
                <input
                  type="date"
                  value={tanggalMulai}
                  disabled={isPublished}
                  onChange={e => {
                    setTanggalMulai(e.target.value);
                    setTanggalSelesai(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              ) : (
                <div className={`grid grid-cols-2 gap-2 ${templateType === "beda-hari" ? "hidden" : ""}`}>
                  <input type="date" value={tanggalMulai} disabled={isPublished} onChange={e => setTanggalMulai(e.target.value)} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                  <input type="date" value={tanggalSelesai} disabled={isPublished} onChange={e => setTanggalSelesai(e.target.value)} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                </div>
              )}
              {templateType === "beda-hari" && (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-[10px] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  Mode Beda Hari aktif: tanggal kegiatan dihitung otomatis dari tanggal mulai paling awal sampai tanggal selesai paling akhir di daftar pegawai.
                </p>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Untuk</h3>
                  {!isPublished && (
                    <button onClick={() => setUntukItems([...untukItems, { id: Math.random().toString(), text: "" }])} className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase">
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {untukItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable={!isPublished}
                      onDragStart={() => !isPublished && setDraggedUntukIndex(idx)}
                      onDragOver={(e) => !isPublished && e.preventDefault()}
                      onDrop={() => {
                        if (!isPublished && draggedUntukIndex !== null) {
                          moveUntukItem(draggedUntukIndex, idx);
                        }
                        setDraggedUntukIndex(null);
                      }}
                      onDragEnd={() => setDraggedUntukIndex(null)}
                      className={`flex gap-2 rounded-xl ${draggedUntukIndex === idx ? "opacity-50" : ""}`}
                    >
                      <span className="text-xs font-bold text-zinc-400 mt-2">{idx + 2}.</span>
                      {!isPublished && (
                        <span className="mt-2 cursor-grab text-zinc-300 active:cursor-grabbing dark:text-zinc-600" title="Geser untuk mengubah urutan">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <textarea
                        value={item.text}
                        disabled={isPublished}
                        onChange={e => {
                          const nextItems = [...untukItems];
                          nextItems[idx].text = e.target.value;
                          setUntukItems(nextItems);
                        }}
                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      {!isPublished && (
                        <button onClick={() => setUntukItems(untukItems.filter(i => i.id !== item.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          <TembusanSection items={tembusanItems} onChange={setTembusanItems} disabled={isPublished} />

          <PenandatanganSection
            kepalaBalai={kepalaBalai}
            setKepalaBalai={setKepalaBalai}
            allEmployees={allEmployees}
            isLoading={isSearching}
            disabled={isPublished}
          />
        </div>

        <footer className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0 space-y-2">
          {!isPublished ? (
            <Button onClick={handleSave} variant="outline" className="w-full h-10 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
              <FileText className="w-4 h-4 mr-2" /> Simpan Draft
            </Button>
          ) : (
            <Button onClick={handleUpdateNomorSurat} variant="outline" className="w-full h-10 rounded-xl font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40">
              <FileText className="w-4 h-4 mr-2" /> Simpan Nomor Surat
            </Button>
          )}
          
          {isPublished ? (
            <Button disabled className="w-full h-12 bg-emerald-600 text-white rounded-xl font-bold opacity-90 cursor-not-allowed flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2" /> Sudah Diterbitkan
            </Button>
          ) : suratStatus === 'approved' || suratStatus === 'completed' ? (
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
              menimbangItems={getPreviewMenimbangItems()} dasarItems={dasarItems} untukItems={getPreviewUntukItems()} selectedEmployees={selectedEmployees}
              buildUntukText={buildUntukText}
              kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} kepalaBalai={kepalaBalai}
              tembusanItems={tembusanItems}
              headerTitle={headerTitle}
              sumberDana={sumberDana}
              templateType={templateType}
              employeeDates={employeeDates}
              judulLampiranBedaHari={judulLampiranBedaHari}
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
