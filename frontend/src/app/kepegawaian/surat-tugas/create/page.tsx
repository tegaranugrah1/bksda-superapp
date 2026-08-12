"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Printer,
  Search,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { isAxiosError } from "axios";
import STBuilderPreview from "../builder/[id]/STBuilderPreview";
import { cleanMelaksanakanKegiatanPrefix } from "../_lib/activity-helpers";
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
  cleanPlhKegiatanKasi,
  extractPlhWilayahFromPosition,
  normalizeEmployeeForSelection,
  printSuratTugas,
  type DasarItem,
  type Employee,
  type StTemplate,
} from "../_lib";
import { FormSection } from "../_components/FormSection";
import { EditableItemListSection } from "../_components/EditableItemListSection";
import { TembusanSection } from "../_components/TembusanSection";
import { PenandatanganSection } from "../_components/PenandatanganSection";

// --- Local types & constants below moved to ../_lib ---
export default function STCreatePremiumPage() {
  const router = useRouter();
  const confirm = useConfirm();
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
  const [dynamicTemplates, setDynamicTemplates] = useState<StTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const selectedDynamicTemplate = dynamicTemplates.find((template) => templateType === `db_${template.id}`);
  const isBmnTemplate = templateType === "bmn-pemeriksaan" || selectedDynamicTemplate?.type === "bmn";
  const isBedaHariTemplate = templateType === "beda-hari" || selectedDynamicTemplate?.type === "beda_hari";
  const isPlhTemplate = templateType === "plh" || selectedDynamicTemplate?.type === "plh";

  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState("Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [plhWilayah, setPlhWilayah] = useState("");
  const [plhKegiatanKasi, setPlhKegiatanKasi] = useState("");
  const [pendingPlhEmployeeName, setPendingPlhEmployeeName] = useState("");
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

  const selectPlhEmployeeByName = useCallback(
    (plhName?: string | null) => {
      const name = plhName?.trim().toLowerCase();
      if (!name || allEmployees.length === 0) return false;

      const matched = allEmployees.find((emp: Employee) => {
        const fullName = (emp.nama_lengkap || emp.name || "").toLowerCase();
        return fullName === name || fullName.includes(name);
      });

      if (!matched) return false;

      setSelectedEmployees([normalizeEmployeeForSelection(matched)]);
      setPendingPlhEmployeeName("");
      return true;
    },
    [allEmployees],
  );

  useEffect(() => {
    if (!isPlhTemplate || selectedEmployees.length > 0 || !pendingPlhEmployeeName) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    selectPlhEmployeeByName(pendingPlhEmployeeName);
  }, [isPlhTemplate, pendingPlhEmployeeName, selectPlhEmployeeByName, selectedEmployees.length]);

  const fetchDynamicTemplates = useCallback(async () => {
    try {
      const res = await api.get("/kepegawaian/st-templates");
      const templates: StTemplate[] = res.data?.data || [];
      setDynamicTemplates(templates);
      const defaultTemplate = templates.find((template) => template.is_default);
      if (!templateAppliedRef.current && !initialTemplate && defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setTemplateType(`db_${defaultTemplate.id}`);
        setMenimbangItems(defaultTemplate.menimbang || []);
        setDasarItems(defaultTemplate.dasar || []);
        if (defaultTemplate.default_signer_name && defaultTemplate.default_signer_nip) {
          setKepalaBalai({
            employeeId: defaultTemplate.default_signer_employee_id || undefined,
            name: defaultTemplate.default_signer_name,
            nip: formatNIP(defaultTemplate.default_signer_nip),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch dynamic ST templates", err);
    }
  }, [initialTemplate]);

  useEffect(() => {
    fetchDynamicTemplates();
  }, [fetchDynamicTemplates]);

  const handleSaveNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      return toast.error("Nama template wajib diisi");
    }
    
    try {
      const payload = {
        name: newTemplateName.trim(),
        code: newTemplateName.trim().toLowerCase().replace(/\s+/g, "-"),
        type: "custom",
        menimbang: menimbangItems,
        dasar: dasarItems,
        default_signer_employee_id: kepalaBalai.employeeId || null,
      };
      
      const res = await api.post("/kepegawaian/st-templates", payload);
      toast.success("Template berhasil disimpan");
      
      await fetchDynamicTemplates();
      
      // Auto-select the newly created template
      if (res.data?.data?.id) {
        setTemplateType(`db_${res.data.data.id}`);
      }
      
      setNewTemplateName("");
      setShowSaveTemplateModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateType?.startsWith("db_")) return;
    const id = parseInt(templateType.replace("db_", ""), 10);
    const confirmed = await confirm({
      title: "Hapus Template",
      description: "Apakah Anda yakin ingin menghapus template ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/kepegawaian/st-templates/${id}`);
      toast.success("Template berhasil dihapus");
      await fetchDynamicTemplates();
      setTemplateType(null);
      setMenimbangItems([]);
      setDasarItems([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menghapus template");
    }
  };

  const replacePlhPlaceholders = useCallback(
    (value: string) => {
      if (!isPlhTemplate) return value;
      return value
        .split(PLH_WILAYAH_PLACEHOLDER)
        .join(plhWilayah.trim() || "...")
        .split(PLH_KEGIATAN_KASI_PLACEHOLDER)
        .join(plhKegiatanKasi.trim() || "...");
    },
    [isPlhTemplate, plhKegiatanKasi, plhWilayah],
  );

  const getPreviewMenimbangItems = () =>
    isPlhTemplate
      ? menimbangItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : menimbangItems;

  const getTempatTujuanForPayload = () => {
    if (isPlhTemplate) {
      return plhWilayah.trim() || kotaTujuan.trim() || tempatKegiatan.trim();
    }
    return kotaTujuan.trim();
  };

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

  // Apply BMN Penghapusan template â€” extracted into a function so it can be triggered by query param OR sidebar button
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

  // Apply Beda Hari template â€” Kepada jadi "Daftar nama terlampir." + halaman lampiran auto-generate
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

  // Apply PLH template â€” pelaksana harian Kepala Seksi
  const applyPlhTemplate = useCallback(
    (
      parentSt?: {
        nomor_surat?: string | null;
        tanggal_surat?: string | null;
        tanggal_mulai?: string | null;
        tanggal_selesai?: string | null;
        tempat_tujuan?: string | null;
        maksud_tujuan?: string | null;
        employees?: Employee[];
      },
      plhName?: string,
    ) => {
      setTemplateType("plh");
      setKlasifikasi("PEG.09.01");
      setSumberDana("dl1");

      // Default tanggal: ikut tanggal ST induk kalau ada
      const today = new Date().toISOString().substring(0, 10);
      const mulai = parentSt?.tanggal_mulai?.split("T")[0] || today;
      const selesai = parentSt?.tanggal_selesai?.split("T")[0] || today;
      setTanggalMulai(mulai);
      setTanggalSelesai(selesai);

      const nomorInduk = parentSt?.nomor_surat || "...";
      const tanggalInduk = parentSt?.tanggal_surat
        ? formatDateIndonesian(parentSt.tanggal_surat.split("T")[0])
        : "...";
      const parentLeadEmployee = parentSt?.employees?.[0];
      setPlhWilayah(extractPlhWilayahFromPosition(parentLeadEmployee?.jabatan || parentLeadEmployee?.position || ""));
      setPlhKegiatanKasi(cleanPlhKegiatanKasi(parentSt?.maksud_tujuan));

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
          text: `Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : ${nomorInduk} tanggal ${tanggalInduk}.`,
        },
      ]);

      // Freeform: clear structured fields, set namaKegiatan ke kalimat PLH
      setActivityPrefix("");
      setKotaAsal("");
      setKotaTujuan("");
      setTempatKegiatan("");
      setNamaKegiatan(
        `Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}`,
      );

      setTembusanItems([
        "Direktur Jenderal KSDAE;",
        "Sekretaris Direktorat Jenderal KSDAE.",
      ]);

      if (plhName?.trim()) {
        setPendingPlhEmployeeName(plhName.trim());
        selectPlhEmployeeByName(plhName);
      }
    },
    [selectPlhEmployeeByName],
  );

  // Generic template handler: dropdown 4 pilihan + dynamic
  const handleTemplateChange = useCallback(
    (value: string) => {
      if (value === "bmn-pemeriksaan") {
        setSelectedTemplateId(null);
        applyBmnTemplate();
      } else if (value === "beda-hari") {
        setSelectedTemplateId(null);
        applyBedaHariTemplate();
      } else if (value === "plh") {
        setSelectedTemplateId(null);
        applyPlhTemplate();
      } else if (value.startsWith("db_")) {
        const id = parseInt(value.replace("db_", ""), 10);
        const template = dynamicTemplates.find((t) => t.id === id);
        if (template) {
          setSelectedTemplateId(template.id);
          setTemplateType(value);
          setMenimbangItems(template.menimbang || []);
          setDasarItems(template.dasar || []);

          // Keep the existing specialized form behavior while taking editable
          // content and configuration from the database template.
          if (template.type === "bmn") {
            applyBmnTemplate();
            setTemplateType(value);
            setMenimbangItems(template.menimbang || []);
            setDasarItems(template.dasar || []);
          } else if (template.type === "beda_hari") {
            applyBedaHariTemplate();
            setTemplateType(value);
            setMenimbangItems(template.menimbang || []);
            setDasarItems(template.dasar || []);
          } else if (template.type === "plh") {
            applyPlhTemplate();
            setTemplateType(value);
            setMenimbangItems(template.menimbang || []);
            setDasarItems(template.dasar || []);
          }

          const configuration = template.configuration || {};
          if (typeof configuration.klasifikasi === "string") setKlasifikasi(configuration.klasifikasi);
          if (typeof configuration.sumber_dana === "string") setSumberDana(configuration.sumber_dana);
          if (template.default_signer_name && template.default_signer_nip) {
            setKepalaBalai({
              employeeId: template.default_signer_employee_id || undefined,
              name: template.default_signer_name,
              nip: formatNIP(template.default_signer_nip),
            });
          }
          if (template.type === "beda_hari") {
            applyBedaHariTemplate();
            setTemplateType(value);
          }
        }
      } else {
        setSelectedTemplateId(null);
        setTemplateType(null);
        // Reset to default empty items if reverting to default manual
        setMenimbangItems([]);
        setDasarItems([]);
      }
    },
    [applyBmnTemplate, applyBedaHariTemplate, applyPlhTemplate, dynamicTemplates],
  );

  // Apply BMN Pemeriksaan template from query param (one-shot)
  useEffect(() => {
    if (templateAppliedRef.current) return;
    if (initialTemplate !== "bmn-pemeriksaan") return;
    templateAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyBmnTemplate();
  }, [initialTemplate, applyBmnTemplate]);

  // Apply PLH template from query param + fetch parent ST data
  useEffect(() => {
    if (templateAppliedRef.current) return;
    if (initialTemplate !== "plh") return;
    templateAppliedRef.current = true;

    const parentStId = searchParams.get("parent_st_id");
    if (!parentStId) {
      // Apply tanpa data induk
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applyPlhTemplate();
      return;
    }

    // Fetch parent ST data, then apply template with parent info
    (async () => {
      try {
        const res = await api.get(`/surat-tugas/${parentStId}`);
        const parentData = res.data?.data;
        applyPlhTemplate(
          {
            nomor_surat: parentData?.nomor_surat,
            tanggal_surat: parentData?.tanggal_surat,
            tanggal_mulai: parentData?.tanggal_mulai,
            tanggal_selesai: parentData?.tanggal_selesai,
            tempat_tujuan: parentData?.tempat_tujuan,
            maksud_tujuan: parentData?.maksud_tujuan,
            employees: parentData?.employees || [],
          },
          parentData?.nama_plh,
        );
      } catch (err) {
        console.error("Failed to fetch parent ST:", err);
        toast.error("Gagal memuat data ST induk. Template PLH diterapkan tanpa data referensi.");
        applyPlhTemplate();
      }
    })();
  }, [initialTemplate, searchParams, applyPlhTemplate]);

  // Helper for "Untuk" text
  const buildUntukText = (): string => {
    // Beda Hari: hitung MIN tanggal mulai dan MAX tanggal selesai dari semua pegawai
    const isBedaHari = isBedaHariTemplate;
    let effectiveMulai = tanggalMulai;
    let effectiveSelesai = tanggalSelesai;
    if (isBedaHari) {
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
    if (isBmnTemplate) {
      let text = namaKegiatan || "...";
      if (!text.trim().endsWith(".") && !text.trim().endsWith(";")) {
        text += ".";
      }
      return text;
    }

    // PLH template: durasi tampil di bagian Untuk, bukan di kegiatan Kepala Seksi.
    if (isPlhTemplate) {
      let text = replacePlhPlaceholders(namaKegiatan || "...");
      if (days === 1 || tanggalMulai === tanggalSelesai) {
        text += ` selama 1 (satu) hari pada tanggal ${mulaiFormatted};`;
      } else if (days > 1) {
        text += ` selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
      } else if (!text.trim().endsWith(";") && !text.trim().endsWith(".")) {
        text += ".";
      }
      return text;
    }

    let text = "";
    if (activityPrefix.includes("Perjalanan Dinas")) {
      text = `Melaksanakan Perjalanan Dinas dari ${kotaAsal || "..."} ke ${kotaTujuan || "..."}`;
      if (namaKegiatan) {
        text += ` dalam rangka ${cleanMelaksanakanKegiatanPrefix(namaKegiatan)}`;
      }
      if (tempatKegiatan) {
        text += ` di ${tempatKegiatan}`;
      }
    } else if (activityPrefix.includes("Melaksanakan Kegiatan")) {
      const cleanNama = cleanMelaksanakanKegiatanPrefix(namaKegiatan);
      text = `Melaksanakan Kegiatan ${cleanNama || "..."}`;
      if (tempatKegiatan) {
        text += ` pada ${tempatKegiatan}`;
      }
      if (kotaTujuan) {
        text += ` di ${kotaTujuan}`;
      }
    } else {
      text = `Menugaskan Staf untuk ${cleanMelaksanakanKegiatanPrefix(namaKegiatan) || "..."}`;
      if (tempatKegiatan) {
        text += ` pada ${tempatKegiatan}`;
      }
      if (kotaTujuan) {
        text += ` di ${kotaTujuan}`;
      }
    }
    if (days === 1 || tanggalMulai === tanggalSelesai) {
      text += `, selama 1 (satu) hari pada tanggal ${mulaiFormatted};`;
    } else if (days > 1) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };

  // Build biaya text
  const buildBiayaText = (): string => {
    // BMN Penghapusan template: skip biaya line entirely (regardless of sumberDana)
    if (isBmnTemplate) return '';
    // PLH template: skip biaya line (PLH tugas internal, tidak ada biaya)
    if (isPlhTemplate) return '';

    const configuredBiaya = selectedDynamicTemplate?.configuration?.biaya_text;
    if (typeof configuredBiaya === "string" && configuredBiaya.trim()) {
      const tahun = tanggalSurat ? new Date(tanggalSurat).getFullYear().toString() : new Date().getFullYear().toString();
      return configuredBiaya.replace(/{tahun}/g, tahun);
    }

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
  const getTemplateNomorFormat = (): string => {
    const configuredFormat = selectedDynamicTemplate?.configuration?.nomor_surat_format;
    return typeof configuredFormat === "string" && configuredFormat.trim()
      ? configuredFormat
      : "/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}";
  };

  const buildNomorSurat = (number: string, classification: string): string => {
    const format = getTemplateNomorFormat();
    const suffix = format.startsWith("/") ? format : `/${format}`;

    return `ST.${number}${suffix
      .replace(/{klasifikasi}/g, classification)
      .replace(/{bulan}/g, currentMonth)
      .replace(/{tahun}/g, currentYear)}`;
  };

  const buildDraftPayload = () => {
    const tempatTujuanPayload = getTempatTujuanForPayload();
    const trimmedNumber = stNumber.trim();
    const trimmedKlasifikasi = klasifikasi.trim();
    const fullNomorSurat = trimmedNumber && trimmedKlasifikasi
      ? buildNomorSurat(trimmedNumber, trimmedKlasifikasi)
      : null;

    return {
      nomor_surat: fullNomorSurat,
      kode_surat: trimmedKlasifikasi ? `K.18/TU/${trimmedKlasifikasi}/B` : null,
      tanggal_surat: tanggalSurat || null,
      maksud_tujuan: [buildUntukText(), buildBiayaText()].filter(Boolean).join("\n"),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      tempat_tujuan: tempatTujuanPayload,
      sumber_dana: sumberDana,
      sumber_dana_other: sumberDanaOther,
      template_type: templateType,
      template_id: selectedTemplateId,
      menimbang: getPreviewMenimbangItems(),
      dasar: dasarItems,
      tembusan: tembusanItems.length > 0 ? tembusanItems : null,
      penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
      penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
      employees: selectedEmployees.map((employee) => ({ id: employee.id })),
    };
  };

  const handleSaveDraft = async () => {
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (!tempatTujuanPayload) {
      return toast.error(isPlhTemplate ? "Wilayah/tujuan PLH harus diisi." : "Tujuan kegiatan harus diisi.");
    }
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");

    const confirmed = await confirm({
      title: "Simpan sebagai draft?",
      description: "Surat Tugas akan disimpan ke Inbox sebagai draft dan masih bisa diedit sebelum diterbitkan.",
      confirmText: "Simpan Draft",
      cancelText: "Batal",
      variant: "default",
    });
    if (!confirmed) return;

    try {
      await api.post("/surat-tugas", buildDraftPayload());
      toast.success("Draft Surat Tugas berhasil disimpan.");
      router.push("/kepegawaian/surat-tugas/inbox");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menyimpan draft.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleApprove = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (!tempatTujuanPayload) {
      return toast.error(isPlhTemplate ? "Wilayah/tujuan PLH harus diisi." : "Tujuan kegiatan harus diisi.");
    }

    const confirmed = await confirm({
      title: "Terbitkan Surat Tugas?",
      description: "Surat Tugas akan langsung diterbitkan dan masuk ke riwayat. Pastikan nomor, personil, tanggal, dan isi dokumen sudah benar.",
      confirmText: "Terbitkan",
      cancelText: "Batal",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      const fullNomorSurat = buildNomorSurat(stNumber, klasifikasi);
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: `K.18/TU/${klasifikasi}/B`,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employee_ids: selectedEmployees.map((employee) => employee.id),
        template_id: selectedTemplateId,
        maksud_tujuan: [buildUntukText(), buildBiayaText()].filter(Boolean).join("\n"),
        tempat_tujuan: tempatTujuanPayload,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: dasarItems,
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
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
    printSuratTugas(stNumber, namaKegiatan);
  };

  const displayedNomorFormat = getTemplateNomorFormat()
    .replace(/{bulan}/g, currentMonth)
    .replace(/{tahun}/g, currentYear);
  const [nomorFormatPrefix, nomorFormatSuffix] = displayedNomorFormat.split("{klasifikasi}");

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      <aside className="w-105 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col shadow-2xl z-10">
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
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 items-center rounded-full bg-orange-600 px-2 text-[9px] font-bold uppercase tracking-wider text-white">Template</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                  Pilih Template ST
                </span>
              </div>
              <div className="flex items-center gap-3">
                {templateType?.startsWith("db_") && !selectedDynamicTemplate?.is_system && (
                  <button
                    onClick={handleDeleteTemplate}
                    className="text-[9px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors"
                  >
                    Hapus
                  </button>
                )}
                <button
                  onClick={() => setShowSaveTemplateModal(!showSaveTemplateModal)}
                  className="text-[9px] font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                >
                  {showSaveTemplateModal ? "Tutup" : "+ Simpan Baru"}
                </button>
              </div>
            </div>
            <select
              value={templateType ?? ""}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-700 outline-none transition focus:ring-2 focus:ring-orange-500/20 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-orange-300"
            >
              <option value="">Default (Manual)</option>
              {dynamicTemplates.map((t) => (
                <option key={t.id} value={`db_${t.id}`}>
                  {t.name}
                </option>
              ))}
            </select>
            {isBedaHariTemplate && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Kepada surat akan otomatis &quot;Daftar nama terlampir.&quot; Set tanggal per pegawai di section di bawah.
              </p>
            )}
            {isBmnTemplate && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Klasifikasi KAP.05 + 8 peraturan dasar + freeform Untuk telah diterapkan.
              </p>
            )}
            {isPlhTemplate && (
              <p className="mt-2 text-[10px] text-orange-700 dark:text-orange-300">
                Template PLH aktif. Ganti placeholder <code>{"{wilayah}"}</code> dan <code>{"{kegiatan Kepala Seksi}"}</code> di Menimbang/Untuk dengan nilai sesuai.
              </p>
            )}
            
            <AnimatePresence>
              {showSaveTemplateModal && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-orange-200 dark:border-orange-500/30 rounded-xl space-y-3">
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Simpan butir Menimbang & Dasar yang ada saat ini menjadi Template Baru.
                    </p>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Nama Template Baru"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:bg-zinc-900"
                    />
                    <button
                      onClick={handleSaveNewTemplate}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                    >
                      Simpan Template
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <FormSection title="Nomor Surat">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">Format nomor otomatis mengikuti template yang dipilih di atas. Untuk mengganti format, ubah pengaturan template di halaman Manajemen Template.</p>
              <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex shrink-0 items-center border-r border-slate-200 bg-slate-100 px-3 dark:border-zinc-600 dark:bg-zinc-700"><span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">ST.</span></div>
                <input value={stNumber} onChange={e => setStNumber(e.target.value)} placeholder="001" className="w-14 bg-transparent px-2 py-2 text-center text-sm font-bold text-zinc-900 outline-none dark:text-white" />
                <div className="flex min-w-0 flex-1 items-center border-l border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-zinc-600 dark:text-zinc-300">
                  <span className="whitespace-pre">{nomorFormatPrefix}</span>
                  <input value={klasifikasi} onChange={e => setKlasifikasi(e.target.value)} placeholder="KSA.0X.0X" className="min-w-20 flex-1 bg-transparent px-1 py-1 font-medium text-zinc-900 outline-none dark:text-white" />
                  <span className="whitespace-pre">{nomorFormatSuffix}</span>
                </div>
              </div>
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

          <EditableItemListSection
            title="Menimbang"
            items={menimbangItems}
            onChange={setMenimbangItems}
            marker="letter"
          />

          <EditableItemListSection
            title="Dasar"
            items={dasarItems}
            onChange={setDasarItems}
            marker="number"
          />

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
                        if (isBedaHariTemplate) {
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
                    {isBedaHariTemplate && (
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
            {isBedaHariTemplate && (
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
              {isPlhTemplate && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">Wilayah Kepala Seksi</label>
                    <input
                      value={plhWilayah}
                      onChange={(e) => setPlhWilayah(e.target.value)}
                      placeholder="Contoh: Wilayah II Tenggarong"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">Kegiatan Kepala Seksi</label>
                    <textarea
                      value={plhKegiatanKasi}
                      onChange={(e) => setPlhKegiatanKasi(e.target.value)}
                      placeholder="Kegiatan Kepala Seksi yang menjadi dasar PLH"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm min-h-[72px] outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Tugas</label>
                <select 
                  value={activityPrefix} 
                  onChange={e => setActivityPrefix(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none cursor-pointer text-zinc-900 dark:text-white"
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
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Dari ( Kota / Lokasi Asal ) *</label>
                      <input value={kotaAsal} onChange={e => setKotaAsal(e.target.value)} placeholder="Contoh: Samarinda" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Ke ( Kota / Kabupaten Tujuan ) *</label>
                      <input value={kotaTujuan} onChange={e => setKotaTujuan(e.target.value)} placeholder="Contoh: Kutai Barat" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Dalam Rangka *</label>
                    <textarea value={namaKegiatan} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder="Contoh: Kegiatan Inventarisasi dan Verifikasi..." className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Di ( Tempat Spesifik / Opsional )</label>
                    <input value={tempatKegiatan} onChange={e => {
                      const nextPlace = e.target.value;
                      setTempatKegiatan(nextPlace);
                      if (sumberDana === "folu") {
                        updateFoluMenimbang(namaKegiatan, nextPlace);
                      }
                    }} placeholder="Contoh: Suaka Margasatwa Kelian" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      {activityPrefix.includes("Melaksanakan Kegiatan") ? "Melaksanakan Kegiatan ( 1 Hari ) *" : "Menugaskan Staf *"}
                    </label>
                    <textarea value={namaKegiatan} onChange={e => handleNamaKegiatanChange(e.target.value)} placeholder={activityPrefix.includes("Melaksanakan Kegiatan") ? "opname fisik (stok opname) barang persediaan" : "verifikasi berkas administrasi persediaan"} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm min-h-[60px] outline-none text-zinc-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Pada ( Tempat / Unit / Lokasi )</label>
                      <input value={tempatKegiatan} onChange={e => {
                        const nextPlace = e.target.value;
                        setTempatKegiatan(nextPlace);
                        if (sumberDana === "folu") {
                          updateFoluMenimbang(namaKegiatan, nextPlace);
                        }
                      }} placeholder="Contoh: Kantor Balai / tempat kegiatannya" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Di ( Kota / Kabupaten ) *</label>
                      <input value={kotaTujuan} onChange={e => setKotaTujuan(e.target.value)} placeholder="Contoh: Samarinda" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                    </div>
                  </div>
                </>
              )}
              <div className={`grid grid-cols-2 gap-2 ${isBedaHariTemplate ? "hidden" : ""}`}>
                <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
                <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white" />
              </div>
              {isBedaHariTemplate && (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-[10px] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  Mode Beda Hari aktif: tanggal kegiatan dihitung otomatis dari tanggal mulai paling awal sampai tanggal selesai paling akhir di daftar pegawai.
                </p>
              )}
            </div>
          </FormSection>

          <TembusanSection items={tembusanItems} onChange={setTembusanItems} />

          <PenandatanganSection
            kepalaBalai={kepalaBalai}
            setKepalaBalai={setKepalaBalai}
            allEmployees={allEmployees}
            isLoading={isSearching}
          />
        </div>

        <footer className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0">
          <Button onClick={handleSaveDraft} variant="outline" className="w-full h-10 rounded-xl font-bold text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 mb-2">
            <FileText className="w-4 h-4 mr-2" /> Simpan Draft
          </Button>
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
              menimbangItems={getPreviewMenimbangItems()} dasarItems={dasarItems} selectedEmployees={selectedEmployees}
              buildUntukText={buildUntukText} buildBiayaText={buildBiayaText}
              kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} kepalaBalai={kepalaBalai}
              sumberDana={sumberDana}
              templateType={templateType}
              employeeDates={employeeDates}
              judulLampiranBedaHari={judulLampiranBedaHari}
              tembusanItems={tembusanItems}
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
