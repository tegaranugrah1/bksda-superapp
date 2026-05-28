"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { isAxiosError } from "axios";
import STBuilderPreview from "../builder/[id]/STBuilderPreview";
import {
  formatDateIndonesian,
  daysBetween,
  numberToWords,
  indexToLetter,
  buildFoluMenimbangText,
  isGeneratedFoluMenimbangText,
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
  { id: 'folu', label: 'Dana Kerjasama FOLU',
    dasarText: '',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Dana Kerjasama FOLU;'
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

export default function STCreatePremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmployeeId = searchParams.get("employee_id");
  const initialTemplate = searchParams.get("template");
  const templateAppliedRef = useRef(false);

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
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState("Perjalanan Dinas");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  // Beda Hari template: tanggal per pegawai
  const [employeeDates, setEmployeeDates] = useState<Record<string, { mulai: string; selesai: string }>>({});
  const [judulLampiranBedaHari, setJudulLampiranBedaHari] = useState("DAFTAR PEGAWAI MENGIKUTI PATROLI");
  const [kepalaBalai, setKepalaBalai] = useState({ name: "M. Ari Wibawanto, S.Hut., M.Sc.", nip: "19740514 199903 1 001" });
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().substring(0, 10));
  const [kotaSurat, setKotaSurat] = useState("Samarinda");

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allEmployees = [], isLoading: isSearching } = useQuery({
    queryKey: ["employees-select-builder-create"],
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

  useEffect(() => {
    if (!initialEmployeeId || selectedEmployees.length > 0 || allEmployees.length === 0) return;

    const employee = allEmployees.find((emp: Employee) => String(emp.id) === initialEmployeeId);
    if (!employee) return;

    const normalized = {
      ...employee,
      nama_lengkap: employee.nama_lengkap || employee.name || "-",
      jabatan: employee.jabatan || employee.position || "-",
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedEmployees([normalized]);
  }, [allEmployees, initialEmployeeId, selectedEmployees.length]);

  // Apply BMN Penghapusan template — extracted into a function so it can be triggered by query param OR sidebar button
  const applyBmnTemplate = useCallback(() => {
    setKlasifikasi("KAP.05");
    setSumberDana("dl1");
    setTemplateType("bmn-pemeriksaan");

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

    setActivityPrefix("");
    setKotaAsal("");
    setKotaTujuan("");
    setTempatKegiatan("");
    setNamaKegiatan("Melaksanakan pemeriksaan Barang Milik Negara berupa Alat Angkutan Bermotor pada tanggal " + formatDateIndonesian(today));
  }, []);

  // Apply Beda Hari template — Kepada jadi "Daftar nama terlampir." + halaman lampiran auto-generate
  const applyBedaHariTemplate = useCallback(() => {
    setTemplateType("beda-hari");
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
  }, [selectedEmployees, tanggalMulai, tanggalSelesai]);

  // Generic template handler: dropdown 3 pilihan
  const handleTemplateChange = useCallback(
    (value: string) => {
      if (value === "bmn-pemeriksaan") {
        applyBmnTemplate();
      } else if (value === "beda-hari") {
        applyBedaHariTemplate();
      } else {
        setTemplateType(null);
      }
    },
    [applyBmnTemplate, applyBedaHariTemplate],
  );

  // Apply BMN Pemeriksaan template from query param (one-shot)
  useEffect(() => {
    if (templateAppliedRef.current) return;
    if (initialTemplate !== "bmn-pemeriksaan") return;
    templateAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyBmnTemplate();
  }, [initialTemplate, applyBmnTemplate]);

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

    // BMN template: always freeform, no date suffix
    if (templateType === "bmn-pemeriksaan") {
      let text = namaKegiatan || "...";
      if (!text.trim().endsWith(".") && !text.trim().endsWith(";")) {
        text += ".";
      }
      return text;
    }

    let text = `${activityPrefix} dari ${kotaAsal || "..."} ke ${kotaTujuan || "..."}`;
    if (namaKegiatan) {
      text += ` dalam rangka ${namaKegiatan}`;
    }
    if (tempatKegiatan) {
      text += ` di ${tempatKegiatan}`;
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
    // BMN Penghapusan template: skip biaya line entirely (regardless of sumberDana)
    if (templateType === 'bmn-pemeriksaan') return '';
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
    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === fundingId);
    if (opt && opt.dasarText) {
      const tahun = date ? new Date(date).getFullYear().toString() : new Date().getFullYear().toString();
      const text = opt.dasarText.replace(/{tahun}/g, tahun);
      
      setDasarItems(prev => {
        const newItems = [...prev];
        if (newItems.length >= 2) {
          newItems[1].text = text;
        } else if (newItems.length === 1) {
          newItems.push({ id: Date.now().toString(), text });
        }
        return newItems;
      });
    }
  };

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

  // Handlers
  const handleApprove = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");

    try {
      const fullNomorSurat = `ST.${stNumber}/K.18/TU/${klasifikasi}/B/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: `K.18/TU/${klasifikasi}/B`,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: menimbangItems,
        dasar: dasarItems,
        employee_ids: selectedEmployees.map(e => e.id),
        maksud_tujuan: buildUntukText() + "\n" + buildBiayaText(),
        tempat_tujuan: kotaTujuan,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai
      };
      await api.post(`/surat-tugas/direct`, payload);
      toast.success("Surat Tugas berhasil diterbitkan!");
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
    const safeKegiatan = (namaKegiatan || "ST").replace(/[/\\?%*:|"<>]/g, '-');
    printWindow.document.write(`
      <html>
      <head>
        <title>ST.${stNumber}-${safeKegiatan}</title>
        <style>
          @page { size: A4; margin: 3cm 1cm 1.9cm 1.55cm; }
          @page :first { margin: 0.7cm 1cm 1.9cm 1.55cm; }
          @page st-lampiran-beda-hari { size: A4; margin: 2cm 1cm 1.9cm 1.55cm; }
          body {
            font-family: 'Bookman Old Style', 'Georgia', serif;
            font-size: 11pt;
            line-height: 1.25;
            color: #000;
            margin: 0;
            padding: 0;
            text-align: justify;
          }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 2px 0; font-size: 11pt; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          img { max-width: none !important; }
          .ttd-placeholder { height: 80px; }
          .kop-surat { margin-left: 0 !important; margin-right: -0.95cm !important; margin-top: -0.25cm !important; margin-bottom: 2px !important; overflow: visible !important; }
          .kop-surat img { width: 18.8cm !important; height: auto !important; }
          .surat-content { margin-left: 1.25cm !important; width: calc(100% - 2.2cm) !important; margin-right: 0.95cm !important; }
          .field-section, .kepada-section, .kepada-list, .untuk-section, .untuk-list { break-inside: auto !important; page-break-inside: auto !important; }
          .employee-entry, .untuk-entry, .penutup-ttd-group { break-inside: avoid !important; page-break-inside: avoid !important; }
          div[style*="page-break-inside"] { page-break-inside: avoid; }
          .st-lampiran-page-wrapper { page: st-lampiran-beda-hari; padding-top: 0 !important; break-before: page !important; page-break-before: always !important; }
          .st-lampiran-page { margin-left: 1.25cm !important; width: calc(100% - 2.2cm) !important; box-sizing: border-box !important; line-height: 1.25 !important; }
          .lampiran-meta { margin-left: 7.3cm !important; margin-bottom: 0.8rem !important; }
          .lampiran-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          .lampiran-table th, .lampiran-table td { border: 1px solid #000 !important; padding: 4px 6px !important; font-size: 10.5pt !important; line-height: 1.2 !important; vertical-align: middle !important; }
          .lampiran-ttd { margin-left: 9.2cm !important; margin-top: 1.6rem !important; text-align: left !important; }
          thead.page-spacer td { height: 0; padding: 0; line-height: 0; font-size: 0; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      <aside className="w-[420px] bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col shadow-2xl z-10">
        <header className="p-6 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">ST Builder <span className="text-blue-600 dark:text-blue-400">Premium</span></h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Direct Issuance Mode</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
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
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-700 outline-none transition focus:ring-2 focus:ring-orange-500/20 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-orange-300"
            >
              <option value="">Default (Manual)</option>
              <option value="bmn-pemeriksaan">Penghapusan BMN</option>
              <option value="beda-hari">Beda Hari (Daftar Lampiran)</option>
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
          </div>

          <FormSection title="Nomor Surat">
            <div className="flex items-stretch bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/10">
              <div className="bg-slate-100 dark:bg-zinc-700 px-3 flex items-center border-r border-slate-200 dark:border-zinc-600 shrink-0"><span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">ST.</span></div>
              <input value={stNumber} onChange={e => setStNumber(e.target.value)} placeholder="001" className="w-14 px-2 py-2 text-sm font-bold bg-transparent outline-none text-center text-zinc-900 dark:text-white" />
              <div className="bg-slate-100 dark:bg-zinc-700 px-2 flex items-center border-x border-slate-200 dark:border-zinc-600 shrink-0"><span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">/K.18/TU/</span></div>
              <input value={klasifikasi} onChange={e => setKlasifikasi(e.target.value)} placeholder="KSA.0X.0X" className="flex-1 min-w-0 px-2 py-2 text-xs font-medium bg-transparent outline-none text-zinc-900 dark:text-white" />
              <div className="bg-slate-100 dark:bg-zinc-700 px-2 flex items-center border-l border-slate-200 dark:border-zinc-600 shrink-0"><span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">/B/{currentMonth}/{currentYear}</span></div>
            </div>
          </FormSection>

          <FormSection title="Pengaturan Dokumen">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kota</label>
                <input value={kotaSurat} onChange={e => setKotaSurat(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal</label>
                <input 
                  type="date" 
                  value={tanggalSurat} 
                  onChange={e => {
                    const newDate = e.target.value;
                    setTanggalSurat(newDate);
                    updateDasarFromFunding(sumberDana, newDate);
                  }} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 text-zinc-900 dark:text-white"
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
                  if (newFunding === "folu") {
                    updateFoluMenimbang(namaKegiatan, tempatKegiatan);
                  }
                }} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white"
              >
                {SUMBER_DANA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              {sumberDana === 'other' && (
                <input 
                  value={sumberDanaOther} 
                  onChange={e => setSumberDanaOther(e.target.value)} 
                  placeholder="Sebutkan sumber dana..." 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-zinc-700 animate-in slide-in-from-top-1 text-zinc-900 dark:text-white"
                />
              )}
            </div>
          </FormSection>

          <FormSection title="Menimbang" action={<button onClick={() => setMenimbangItems([...menimbangItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-blue-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {menimbangItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-slate-400 mt-2">{indexToLetter(idx)}</span>
                  <textarea value={item.text} onChange={e => { const n = [...menimbangItems]; n[idx].text = e.target.value; setMenimbangItems(n); }} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white" />
                  <button onClick={() => setMenimbangItems(menimbangItems.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Dasar" action={<button onClick={() => setDasarItems([...dasarItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-blue-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {dasarItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-slate-400 mt-2">{idx + 1}.</span>
                  <textarea value={item.text} onChange={e => { const n = [...dasarItems]; n[idx].text = e.target.value; setDasarItems(n); }} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs focus:bg-white dark:focus:bg-zinc-700 outline-none min-h-[60px] text-zinc-900 dark:text-white" />
                  <button onClick={() => setDasarItems(dasarItems.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Kepada (Personil)" action={<span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{selectedEmployees.length}</span>}>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" placeholder="Cari..." />
              </div>
              <AnimatePresence>
                {showDropdown && searchQuery && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute w-full mt-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map((emp: Employee) => (
                      <button key={emp.id} onClick={() => { 
                        const normalized = { ...emp, nama_lengkap: emp.nama_lengkap || emp.name || "", jabatan: emp.jabatan || emp.position || "" };
                        setSelectedEmployees([...selectedEmployees, normalized]);
                        // Auto-init employeeDates jika template Beda Hari aktif
                        if (templateType === "beda-hari") {
                          setEmployeeDates((prev) => ({
                            ...prev,
                            [normalized.id]: prev[normalized.id] || { mulai: tanggalMulai || "", selesai: tanggalSelesai || "" },
                          }));
                        }
                        setSearchQuery(""); 
                        setShowDropdown(false); 
                      }} className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-700 border-b border-slate-100 dark:border-zinc-700 last:border-0">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{emp.nama_lengkap || emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.nip}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-2 mt-3">
              {selectedEmployees.map((emp, idx) => {
                const dateRange = employeeDates[emp.id] || { mulai: "", selesai: "" };
                return (
                  <div key={emp.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                      <div className="flex-1 truncate text-xs font-bold text-zinc-900 dark:text-white">{emp.nama_lengkap || emp.name}</div>
                      <button onClick={() => {
                        setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
                        setEmployeeDates((prev) => {
                          const next = { ...prev };
                          delete next[emp.id];
                          return next;
                        });
                      }} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                    {templateType === "beda-hari" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Tanggal Mulai</label>
                          <input
                            type="date"
                            value={dateRange.mulai}
                            onChange={(e) =>
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [emp.id]: { ...dateRange, mulai: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Tanggal Selesai</label>
                          <input
                            type="date"
                            value={dateRange.selesai}
                            onChange={(e) =>
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [emp.id]: { ...dateRange, selesai: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
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
                  onChange={(e) => setJudulLampiranBedaHari(e.target.value)}
                  className="w-full rounded-lg border border-orange-300 bg-white px-2 py-1 text-xs outline-none dark:border-orange-500/30 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            )}
          </FormSection>

          <FormSection title="Detail Kegiatan">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Tugas</label>
                <select 
                  value={activityPrefix} 
                  onChange={e => setActivityPrefix(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none cursor-pointer text-zinc-900 dark:text-white"
                >
                  <option value="Perjalanan Dinas">Perjalanan Dinas</option>
                  <option value="Melaksanakan Tugas">Melaksanakan Tugas</option>
                  <option value="Menugaskan Staf">Menugaskan Staf</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={kotaAsal} onChange={e => setKotaAsal(e.target.value)} placeholder="Asal" className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                <input value={kotaTujuan} onChange={e => setKotaTujuan(e.target.value)} placeholder="Tujuan" className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              </div>
              <textarea value={namaKegiatan} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder="Kegiatan..." className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white" />
              <input value={tempatKegiatan} onChange={e => {
                const nextPlace = e.target.value;
                setTempatKegiatan(nextPlace);
                if (sumberDana === "folu") {
                  updateFoluMenimbang(namaKegiatan, nextPlace);
                }
              }} placeholder="Tempat Spesifik" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              <div className={`grid grid-cols-2 gap-2 ${templateType === "beda-hari" ? "hidden" : ""}`}>
                <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              </div>
              {templateType === "beda-hari" && (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-[10px] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  Mode Beda Hari aktif: tanggal kegiatan dihitung otomatis dari tanggal mulai paling awal sampai tanggal selesai paling akhir di daftar pegawai.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Penandatangan">
            <input value={kepalaBalai.name} onChange={e => setKepalaBalai({...kepalaBalai, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm mb-2 outline-none text-zinc-900 dark:text-white" />
            <input value={kepalaBalai.nip} onChange={e => setKepalaBalai({...kepalaBalai, nip: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
          </FormSection>
        </div>

        <footer className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0">
          <Button onClick={handleApprove} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mb-3"><CheckCircle className="w-5 h-5 mr-2" /> Terbitkan & Cetak</Button>
          <Button variant="outline" onClick={handlePrint} className="w-full h-12 rounded-xl font-bold text-slate-600 dark:text-zinc-400"><Printer className="w-5 h-5 mr-2" /> Preview Cetak</Button>
        </footer>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-slate-200/50 dark:bg-zinc-950">
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

function FormSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{title}</label>
        {action}
      </div>
      {children}
    </div>
  );
}
