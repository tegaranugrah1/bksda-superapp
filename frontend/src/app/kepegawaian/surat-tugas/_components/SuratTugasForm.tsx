"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  Printer,
  Loader2,
  CheckCircle,
  Trash2,
  Send,
  Shield,
  Calendar,
  ArrowLeft,
  Italic,
  Banknote,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRole } from "@/hooks/useRole";
import STBuilderPreview from "./STBuilderPreview";
import {
  cleanMelaksanakanKegiatanPrefix,
  cleanRepeatingLocations,
  buildKegiatanDiktumText,
  isDalamKawasanTask,
  isJenisKegiatanTask,
  normalizeTaskTypeName,
} from "../_lib/activity-helpers";
import {
  formatDateIndonesian,
  formatDateRangeIndonesian,
  formatNIP,
  formatNipLabel,
  daysBetween,
  numberToWords,
  buildFoluMenimbangText,
  isGeneratedFoluMenimbangText,
  renderFormattedItalic,
  toggleItalicInTextarea,
} from "@/lib/letter-utils";
import {
  DEFAULT_KEPALA_BALAI,
  DEFAULT_LAPORAN_TEXT,
  DEFAULT_PLH_PRINSIP_TEXT,
  PLH_WILAYAH_PLACEHOLDER,
  PLH_KEGIATAN_KASI_PLACEHOLDER,
  PLH_KASUBBAG_TU_TITLE,
  PLH_TARGET_OPTIONS,
  detectPlhTargetRole,
  getPlhTargetOption,
  type PlhTargetRole,
  SUMBER_DANA_OPTIONS,
  buildBiayaTextFor,
  cleanPlhKegiatanKasi,
  extractPlhWilayahFromPosition,
  formatPlhKegiatanForTemplate,
  replacePlhAllPlaceholders,
  buildOrderedAdditionalUntukItems,
  extractCustomUntukItems,
  getDefaultUntukItems,
  isGeneratedBiayaItem,
  isGeneratedLaporanItem,
  isSingleDayActivityPrefix,
  isFundingDasarText,
  normalizeSumberDana,
  isFoluSumberDana,
  findMatchingTemplateForSumberDana,
  shouldRenderAsSingleDayActivity,
  splitStoredUntukItems,
  toDasarItems,
  normalizeEmployeeForSelection,
  printSuratTugas,
  isBuruhEmployee,
  syncEmployeesWithBuruhCount,
  extractBuruhCount,
  getEmployeeCity,
  detectDefaultKotaAsal,
  type DasarItem,
  type Employee,
  type StTemplate,
  type StExpenseTemplate,
} from "../_lib";
import { FormSection } from "./FormSection";
import { EditableItemListSection } from "./EditableItemListSection";
import { TembusanSection } from "./TembusanSection";
import { PenandatanganSection } from "./PenandatanganSection";
import { ScheduleConflictBanner } from "./ScheduleConflictBanner";
import { useScheduleConflicts } from "../_lib/useScheduleConflicts";

export interface SuratTugasFormProps {
  mode: "create" | "edit";
  letterId?: string;
  initialEmployeeId?: string | null;
  initialTemplate?: string | null;
  initialParentStId?: string | null;
}

export function SuratTugasForm({
  mode,
  letterId,
  initialEmployeeId,
  initialTemplate,
  initialParentStId,
}: SuratTugasFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const templateAppliedRef = useRef(false);

  // --- Form State ---
  const [stNumber, setStNumber] = useState("");
  const [klasifikasi, setKlasifikasi] = useState(
    mode === "create" && initialTemplate === "plh" ? "PEG.09.01" : "KSA.0X.0X"
  );
  const [nomorNumberingType, setNomorNumberingType] = useState<"st_pattern" | "naskah_auto">("st_pattern");
  const [customNomorNaskah, setCustomNomorNaskah] = useState("");
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();

  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([
    { id: "1", text: "bahwa dalam rangka , perlu ;" },
    {
      id: "2",
      text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud.",
    },
  ]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([
    {
      id: "1",
      text: "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;",
    },
    {
      id: "funding-dasar",
      text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 24 April 2026.`,
    },
  ]);
  const [untukItems, setUntukItems] = useState<DasarItem[]>([]);

  const [sumberDana, setSumberDana] = useState(
    mode === "create" && initialTemplate === "plh" ? "dl1" : "dipa"
  );
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [templateType, setTemplateType] = useState<string | null>(initialTemplate || null);
  const [dynamicTemplates, setDynamicTemplates] = useState<StTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const selectedDynamicTemplate = dynamicTemplates.find(
    (template) => templateType === `db_${template.id}`
  );
  const isBmnTemplate =
    templateType === "bmn-pemeriksaan" || selectedDynamicTemplate?.type === "bmn";
  const isBedaHariTemplate =
    templateType === "beda-hari" || selectedDynamicTemplate?.type === "beda_hari";
  const isPlhTemplate =
    templateType === "plh" || selectedDynamicTemplate?.type === "plh";

  const [namaKegiatan, setNamaKegiatan] = useState("");
  const namaKegiatanRef = useRef<HTMLTextAreaElement>(null);
  const [untukKegiatanText, setUntukKegiatanText] = useState("Pengawasan Pekerjaan Konstruksi");
  const [activityPrefix, setActivityPrefix] = useState(
    "Perjalanan Dinas Luar Wilayah"
  );
  const [inputModeKegiatan, setInputModeKegiatan] = useState<"structured" | "manual">("structured");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [plhWilayah, setPlhWilayah] = useState("");
  const [plhTargetRole, setPlhTargetRole] = useState<PlhTargetRole>("seksi_1");
  const [plhKegiatanKasi, setPlhKegiatanKasi] = useState("");
  const [parentStInfo, setParentStInfo] = useState<{
    nomorInduk?: string | null;
    tanggalInduk?: string | null;
  }>({});
  const [pendingPlhEmployeeName, setPendingPlhEmployeeName] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [hasBuruh, setHasBuruh] = useState(false);
  const [jumlahBuruh, setJumlahBuruh] = useState(0);
  const [sertakanLaporan, setSertakanLaporan] = useState(true);
  const [taskTypeId, setTaskTypeId] = useState<number | null>(null);

  const { data: taskTypes = [] } = useQuery<
    Array<{
      id: number;
      nama: string;
      kode: string;
      mode_lokasi: string;
      aturan_durasi: string;
      default_sertakan_laporan?: boolean;
      contoh_format?: string;
    }>
  >({
    queryKey: ["st-task-types-public"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/st-task-types/public");
      return res.data?.data || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleToggleBuruh = (nextVal: boolean) => {
    setHasBuruh(nextVal);
    const nextCount = nextVal ? (jumlahBuruh > 0 ? jumlahBuruh : 1) : 0;
    if (nextVal && jumlahBuruh < 1) {
      setJumlahBuruh(1);
    }
    setSelectedEmployees((prev) => syncEmployeesWithBuruhCount(prev, nextCount));
    if (nextVal) {
      setEmployeeDates((prev) => {
        const nextDates = { ...prev };
        const defaultMulai = tanggalMulai || new Date().toISOString().substring(0, 10);
        const defaultSelesai = tanggalSelesai || defaultMulai;
        for (let i = 1; i <= (nextCount || 1); i++) {
          const pmKey = `pm-${i}`;
          if (!nextDates[pmKey]) {
            nextDates[pmKey] = { mulai: defaultMulai, selesai: defaultSelesai };
          }
        }
        return nextDates;
      });
    }
  };

  const handleBuruhCountChange = (newCount: number) => {
    const count = Math.max(0, Math.min(100, newCount));
    setJumlahBuruh(count);
    setHasBuruh(count > 0);
    setSelectedEmployees((prev) => syncEmployeesWithBuruhCount(prev, count));
    if (count > 0) {
      setEmployeeDates((prev) => {
        const nextDates = { ...prev };
        const defaultMulai = tanggalMulai || new Date().toISOString().substring(0, 10);
        const defaultSelesai = tanggalSelesai || defaultMulai;
        for (let i = 1; i <= count; i++) {
          const pmKey = `pm-${i}`;
          if (!nextDates[pmKey]) {
            nextDates[pmKey] = { mulai: defaultMulai, selesai: defaultSelesai };
          }
        }
        return nextDates;
      });
    }
  };

  // Template PLH dapat dipilih kapan saja (pejabat yang digantikan diatur secara fleksibel di form)
  const canSelectPlh = true;

  // Beda Hari template: tanggal per pegawai
  const [employeeDates, setEmployeeDates] = useState<
    Record<string, { mulai: string; selesai: string }>
  >({});
  const [employeeDepartures, setEmployeeDepartures] = useState<Record<string, string>>({});
  const [showDepartureColumn, setShowDepartureColumn] = useState(false);
  const [judulLampiranBedaHari, setJudulLampiranBedaHari] = useState(
    "DAFTAR PEGAWAI MENGIKUTI PATROLI"
  );
  const [keterangan, setKeterangan] = useState("");
  const [kepalaBalai, setKepalaBalai] = useState(DEFAULT_KEPALA_BALAI);
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().substring(0, 10));
  const [kotaSurat, setKotaSurat] = useState("Samarinda");
  const [tembusanItems, setTembusanItems] = useState<string[]>([]);
  const [headerTitle, setHeaderTitle] = useState("KEPALA BALAI,");
  const [penutupText, setPenutupText] = useState(
    "Demikian untuk dilaksanakan dengan penuh tanggung jawab."
  );
  const [dateFormatStyle, setDateFormatStyle] = useState<"inline" | "tabular">("inline");
  const [signerAuthorityMandate, setSignerAuthorityMandate] = useState<string | null>(null);
  const [signerTitle, setSignerTitle] = useState("Kepala Balai,");
  const [tembusanPosition, setTembusanPosition] = useState<"beside" | "bottom">("beside");
  const [tembusanLabel, setTembusanLabel] = useState("Tembusan:");
  const [kopImageUrl, setKopImageUrl] = useState<string | null>(null);

  const effectiveMulai = useMemo(() => {
    if (isBedaHariTemplate) {
      const allMulai = selectedEmployees
        .map((emp) => employeeDates[String(emp.id)]?.mulai || employeeDates[emp.id]?.mulai)
        .filter((d): d is string => Boolean(d));
      if (allMulai.length > 0) {
        return allMulai.reduce((min, d) => (d < min ? d : min), allMulai[0]);
      }
    }
    return tanggalMulai;
  }, [isBedaHariTemplate, selectedEmployees, employeeDates, tanggalMulai]);

  const effectiveSelesai = useMemo(() => {
    if (isBedaHariTemplate) {
      const allSelesai = selectedEmployees
        .map((emp) => employeeDates[String(emp.id)]?.selesai || employeeDates[emp.id]?.selesai)
        .filter((d): d is string => Boolean(d));
      if (allSelesai.length > 0) {
        return allSelesai.reduce((max, d) => (d > max ? d : max), allSelesai[0]);
      }
    }
    return tanggalSelesai || tanggalMulai;
  }, [isBedaHariTemplate, selectedEmployees, employeeDates, tanggalSelesai, tanggalMulai]);

  const { data: conflictData } = useScheduleConflicts({
    employees: selectedEmployees,
    tanggalMulai: effectiveMulai,
    tanggalSelesai: effectiveSelesai,
    isBedaHari: isBedaHariTemplate,
    employeeDates,
    excludeId: letterId ? String(letterId) : undefined,
  });

  const conflicts = conflictData?.conflicts || [];
  const hasConflict = (conflictData?.has_conflict && conflicts.length > 0) ?? false;

  const handleRemoveConflictEmployee = useCallback((empId: number) => {
    const empIdStr = String(empId);
    setSelectedEmployees((prev) => {
      const next = prev.filter((e) => String(e.id) !== empIdStr);
      const remainingBuruh = extractBuruhCount(next);
      setJumlahBuruh(remainingBuruh);
      setHasBuruh(remainingBuruh > 0);
      return next;
    });
    setEmployeeDates((prev) => {
      const next = { ...prev };
      delete next[empIdStr];
      return next;
    });
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Status & Edit Builder Specific States
  const { canWrite } = useRole();
  const [isInitializing, setIsInitializing] = useState(mode === "edit");
  const [suratStatus, setSuratStatus] = useState<string>("");

  const isPublished =
    !canWrite ||
    ["diterbitkan", "approved", "completed", "published"].includes(
      (suratStatus || "").toLowerCase()
    );

  // Queries
  const { data: expenseTemplates = [] } = useQuery<StExpenseTemplate[]>({
    queryKey: ["st-expense-templates-active-form"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/st-expense-templates?active_only=true&per_page=100");
      return (res.data?.data || []) as StExpenseTemplate[];
    },
  });

  const availableSumberDanaOptions = useMemo(() => {
    if (expenseTemplates.length === 0) return SUMBER_DANA_OPTIONS;
    const mapped = expenseTemplates.map((t) => ({
      id: t.code,
      label: t.name,
      dasarText: t.dasar_text || "",
      biayaText: t.biaya_text,
    }));
    mapped.push({
      id: "other",
      label: "Lainnya (Tulis Manual)",
      dasarText: "",
      biayaText: "",
    });
    return mapped;
  }, [expenseTemplates]);

  const { data: allEmployees = [], isLoading: isSearching } = useQuery({
    queryKey: ["employees-select-form"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select", {
        params: { limit: 500 },
      });
      return res.data.data || [];
    },
  });

  const searchResults = allEmployees
    .filter(
      (emp: Employee) =>
        (emp.nama_lengkap?.toLowerCase() || emp.name?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) || (emp.nip?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )
    .slice(0, 50);

  // Auto-select pegawai PLH jika dibuat langsung dari ST Induk (nama_plh)
  useEffect(() => {
    if (!pendingPlhEmployeeName || allEmployees.length === 0 || selectedEmployees.length > 0) return;
    const targetName = pendingPlhEmployeeName.toLowerCase().trim();
    const found = allEmployees.find(
      (emp: Employee) =>
        (emp.nama_lengkap || emp.name || "").toLowerCase().trim() === targetName ||
        (emp.nama_lengkap || emp.name || "").toLowerCase().includes(targetName)
    );
    if (found) {
      setSelectedEmployees([normalizeEmployeeForSelection(found)]);
      setPendingPlhEmployeeName("");
    }
  }, [pendingPlhEmployeeName, allEmployees, selectedEmployees.length]);

  // Helper formatting items
  const formatYearInItems = useCallback(
    (items: DasarItem[]) =>
      (items || []).map((item) => ({
        ...item,
        text: (item.text || "").replace(/{tahun}/gi, currentYear),
      })),
    [currentYear]
  );

  const formatTemplateMenimbang = useCallback(
    (items: DasarItem[], activityText = "", placeText = "") => {
      const actTrim = activityText.trim().replace(/[;,.]$/, "");
      const placeTrim = placeText.trim().replace(/[;,.]$/, "");
      const fullActivity =
        actTrim && placeTrim && !actTrim.toLowerCase().includes(placeTrim.toLowerCase())
          ? `${actTrim} di ${placeTrim}`
          : actTrim;

      return (items || []).map((item) => {
        let text = (item.text || "").replace(/{tahun}/gi, currentYear);
        if (fullActivity && /\{(nama\s*kegiatan|kegiatan)\}/i.test(text)) {
          text = text.replace(/\{(nama\s*kegiatan|kegiatan)\}/gi, fullActivity);
        }
        return { ...item, text };
      });
    },
    [currentYear]
  );

  const extractTemplateUntukItems = useCallback(
    (rawUntuk?: DasarItem[] | null): DasarItem[] => {
      if (!Array.isArray(rawUntuk)) return [];
      return formatYearInItems(rawUntuk).filter((item) => {
        const text = (item.text || "").trim();
        if (!text) return false;
        if (isGeneratedLaporanItem(text)) return false;
        if (isGeneratedBiayaItem(text, expenseTemplates)) return false;
        return true;
      });
    },
    [formatYearInItems, expenseTemplates]
  );

  // Susun urutan baku Dasar: [1. Template ST (Atas)] -> [2. Tambahan Manual Builder (Tengah)] -> [3. Sumber Dana / Biaya (Bawah)]
  const orderDasarLayers = useCallback(
    (items: DasarItem[], fundingOverride?: DasarItem | null): DasarItem[] => {
      const templateLayer: DasarItem[] = [];
      const manualLayer: DasarItem[] = [];
      let fundingItem: DasarItem | null = null;

      items.forEach((item) => {
        const isFunding =
          item.id === "funding-dasar" || isFundingDasarText(item.text, expenseTemplates);
        if (isFunding) {
          fundingItem = { ...item, id: "funding-dasar" };
        } else if (String(item.id).startsWith("manual-dasar-")) {
          manualLayer.push(item);
        } else {
          templateLayer.push(item);
        }
      });

      const finalFunding = fundingOverride !== undefined ? fundingOverride : fundingItem;
      return [
        ...templateLayer,
        ...manualLayer,
        ...(finalFunding && finalFunding.text.trim() ? [finalFunding] : []),
      ];
    },
    [expenseTemplates]
  );

  const updateDasarFromFunding = (fundingId: string, date: string) => {
    const tahun = date
      ? new Date(date).getFullYear().toString()
      : new Date().getFullYear().toString();
    const dynExpense = expenseTemplates.find(
      (o) =>
        o.code === fundingId ||
        o.name.toLowerCase() === fundingId.toLowerCase() ||
        String(o.id) === fundingId
    );
    const opt =
      availableSumberDanaOptions.find((o) => o.id === fundingId) ||
      SUMBER_DANA_OPTIONS.find((o) => o.id === fundingId);
    const rawDasar = dynExpense?.dasar_text ?? opt?.dasarText ?? "";
    const fundingText = rawDasar ? rawDasar.replace(/{tahun}/g, tahun).trim() : "";

    setDasarItems((prev) =>
      orderDasarLayers(
        prev,
        fundingText ? { id: "funding-dasar", text: fundingText } : null
      )
    );
  };

  const handleAddDasarItem = () => {
    setDasarItems((prev) => {
      const newItem: DasarItem = {
        id: `manual-dasar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: "",
      };
      return orderDasarLayers([...prev, newItem]);
    });
  };

  const applyDynamicTemplateToForm = useCallback(
    (
      template: StTemplate,
      options?: {
        preserveSumberDana?: boolean;
        preserveActivity?: boolean;
        preserveStoredMenimbang?: boolean;
        preserveStoredDasar?: boolean;
        preserveStoredTembusan?: boolean;
        preserveStoredUntuk?: boolean;
        activityOverride?: string;
        placeOverride?: string;
      }
    ) => {
      setSelectedTemplateId(template.id);
      setTemplateType(`db_${template.id}`);

      const actText = options?.activityOverride ?? namaKegiatan;
      const placeText = options?.placeOverride ?? (tempatKegiatan || kotaTujuan);

      if (!options?.preserveStoredMenimbang) {
        setMenimbangItems(formatTemplateMenimbang(template.menimbang || [], actText, placeText));
      }

      if (!options?.preserveStoredDasar) {
        setDasarItems((prev) => {
          const manualOnly = prev.filter(
            (i) => String(i.id).startsWith("manual-dasar-") && i.text.trim()
          );
          const existingFunding = prev.find(
            (i) => i.id === "funding-dasar" || isFundingDasarText(i.text, expenseTemplates)
          );
          const cleanTemplateDasar = formatYearInItems(template.dasar || []).filter(
            (i) => !isFundingDasarText(i.text, expenseTemplates)
          );
          return orderDasarLayers([...cleanTemplateDasar, ...manualOnly], existingFunding);
        });
      }

      const configuration = template.configuration || {};

      if (!options?.preserveStoredUntuk) {
        const templateUntuk = extractTemplateUntukItems(configuration.untuk);
        if (templateUntuk.length > 0) {
          setUntukItems(templateUntuk);
        } else if (template.type === "plh") {
          setUntukItems([{ id: "plh-prinsip", text: DEFAULT_PLH_PRINSIP_TEXT }]);
        } else {
          setUntukItems([]);
        }
      }

      if (!options?.preserveActivity) {
        if (typeof configuration.default_jenis_tugas === "string") {
          const norm = normalizeTaskTypeName(configuration.default_jenis_tugas);
          setActivityPrefix(norm);
          if (typeof configuration.default_task_type_id === "number") {
            setTaskTypeId(configuration.default_task_type_id);
          } else {
            const match = taskTypes.find((t) => t.nama === norm);
            if (match) setTaskTypeId(match.id);
          }
        }
        if (typeof configuration.default_sertakan_laporan === "boolean") {
          setSertakanLaporan(configuration.default_sertakan_laporan);
        } else if (template.type === "plh") {
          setSertakanLaporan(false);
        }
        if (configuration.default_mode_kegiatan === "manual" || template.type === "plh") {
          setInputModeKegiatan("manual");
          if (
            typeof configuration.default_kegiatan === "string" &&
            configuration.default_kegiatan.trim()
          ) {
            setNamaKegiatan(configuration.default_kegiatan);
          }
        } else {
          setInputModeKegiatan("structured");
          if (
            !actText.trim() &&
            typeof configuration.default_kegiatan === "string" &&
            configuration.default_kegiatan.trim()
          ) {
            setNamaKegiatan(configuration.default_kegiatan);
          }
        }
      }

      if (typeof configuration.klasifikasi === "string" && !options?.preserveActivity) {
        setKlasifikasi(configuration.klasifikasi);
      }
      if (!options?.preserveSumberDana && typeof configuration.sumber_dana === "string") {
        setSumberDana(configuration.sumber_dana);
      }
      if (!options?.preserveActivity) {
        if (configuration.nomor_numbering_type === "naskah_auto") {
          setNomorNumberingType("naskah_auto");
        } else if (configuration.nomor_numbering_type === "st_pattern") {
          setNomorNumberingType("st_pattern");
        }
      }
      setHeaderTitle(
        typeof configuration.header_title === "string"
          ? configuration.header_title
          : "KEPALA BALAI,"
      );
      setPenutupText(
        typeof configuration.penutup_text === "string"
          ? configuration.penutup_text
          : "Demikian untuk dilaksanakan dengan penuh tanggung jawab."
      );
      setDateFormatStyle(
        configuration.date_format_style === "tabular" ||
          configuration.date_format_style === "inline"
          ? configuration.date_format_style
          : "inline"
      );
      setSignerAuthorityMandate(
        typeof configuration.signer_authority_mandate === "string"
          ? configuration.signer_authority_mandate
          : null
      );
      setSignerTitle(
        typeof configuration.signer_title === "string"
          ? configuration.signer_title
          : "Kepala Balai,"
      );
      if (
        !options?.preserveStoredTembusan &&
        Array.isArray(configuration.tembusan_items) &&
        configuration.tembusan_items.length > 0
      ) {
        setTembusanItems(configuration.tembusan_items);
      }
      setTembusanPosition(configuration.tembusan_position === "bottom" ? "bottom" : "beside");
      setTembusanLabel(
        typeof configuration.tembusan_label === "string"
          ? configuration.tembusan_label
          : "Tembusan:"
      );
      setKopImageUrl(
        typeof configuration.kop_image_url === "string" ? configuration.kop_image_url : null
      );
      if (template.default_signer_name && template.default_signer_nip) {
        setKepalaBalai({
          employeeId: template.default_signer_employee_id || undefined,
          name: template.default_signer_name,
          nip: formatNIP(template.default_signer_nip),
        });
      }
    },
    [
      expenseTemplates,
      extractTemplateUntukItems,
      formatTemplateMenimbang,
      formatYearInItems,
      kotaTujuan,
      namaKegiatan,
      orderDasarLayers,
      taskTypes,
      tempatKegiatan,
    ]
  );

  const fetchDynamicTemplates = async (selectDefault = false) => {
    try {
      const res = await api.get("/kepegawaian/st-templates");
      const templates: StTemplate[] = res.data?.data || [];
      setDynamicTemplates(templates);
      if (selectDefault && mode === "create") {
        const matchedTemplate = findMatchingTemplateForSumberDana(
          sumberDana,
          templates,
          expenseTemplates
        );
        if (!templateAppliedRef.current && !initialTemplate && matchedTemplate) {
          applyDynamicTemplateToForm(matchedTemplate);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dynamic ST templates", err);
    }
  };

  useEffect(() => {
    void fetchDynamicTemplates(true);
  }, [initialTemplate]);

  // Initial employee selection for Create mode
  useEffect(() => {
    if (mode !== "create" || !initialEmployeeId || selectedEmployees.length > 0 || allEmployees.length === 0)
      return;

    const employee = allEmployees.find((emp: Employee) => String(emp.id) === initialEmployeeId);
    if (!employee) return;

    const normalized = {
      ...employee,
      nama_lengkap: employee.nama_lengkap || employee.name || "-",
      jabatan: employee.jabatan || employee.position || "-",
    };

    setSelectedEmployees([normalized]);
  }, [allEmployees, initialEmployeeId, mode, selectedEmployees.length]);

  // Deteksi otomatis Kota Asal berdasarkan Penempatan Satker Pegawai
  useEffect(() => {
    if (!selectedEmployees || selectedEmployees.length === 0) {
      setKotaAsal("Samarinda");
      return;
    }
    if (mode === "create") {
      setKotaAsal(detectDefaultKotaAsal(selectedEmployees));
    }
  }, [selectedEmployees, mode]);

  // Sinkronisasi tempat keberangkatan default untuk setiap personel
  useEffect(() => {
    setEmployeeDepartures((prev) => {
      const next = { ...prev };
      selectedEmployees.forEach((emp) => {
        const empKey = String(emp.id);
        if (!next[empKey]) {
          next[empKey] = getEmployeeCity(emp, kotaAsal || "Samarinda");
        }
      });
      return next;
    });
  }, [selectedEmployees, kotaAsal]);

  const editLetterHydrationRef = useRef<{
    resolved: boolean;
    rawTemplateId: number | null;
    rawTemplateType: string | null;
    hasStoredMenimbang: boolean;
    hasStoredDasar: boolean;
    hasStoredTembusan: boolean;
    hasStoredUntuk: boolean;
    hasSnapshotConfig: boolean;
  }>({
    resolved: false,
    rawTemplateId: null,
    rawTemplateType: null,
    hasStoredMenimbang: false,
    hasStoredDasar: false,
    hasStoredTembusan: false,
    hasStoredUntuk: false,
    hasSnapshotConfig: false,
  });

  // Edit Mode: Fetch and hydrate existing letter
  useEffect(() => {
    if (mode !== "edit" || !letterId) return;

    const fetchAndParse = async (targetId: string) => {
      try {
        setIsInitializing(true);
        const res = await api.get(`/surat-tugas/${targetId}`);
        const data = res.data.data || res.data;

        setSuratStatus(data.status || "");
        if (data.nomor_surat) {
          const isStPattern = data.nomor_surat.startsWith("ST.");
          if (isStPattern) {
            setNomorNumberingType("st_pattern");
            const matchNum = data.nomor_surat.match(/ST\.([^\/]+)/);
            if (matchNum) setStNumber(matchNum[1]);

            const matchKlas = data.nomor_surat.match(/\/TU\/(?:FOLU\.NC-23\/)?([^\/]+)\/B/);
            if (matchKlas) setKlasifikasi(matchKlas[1]);
          } else {
            setNomorNumberingType("naskah_auto");
            setCustomNomorNaskah(data.nomor_surat);
          }
        }

        const loadedTanggalMulai = data.tanggal_mulai ? data.tanggal_mulai.substring(0, 10) : "";
        const loadedTanggalSelesai = data.tanggal_selesai
          ? data.tanggal_selesai.substring(0, 10)
          : "";
        setTanggalMulai(loadedTanggalMulai);
        setTanggalSelesai(loadedTanggalSelesai);
        if (data.tanggal_surat) setTanggalSurat(data.tanggal_surat.substring(0, 10));

        const funding = normalizeSumberDana(data.sumber_dana, expenseTemplates);
        setSumberDana(funding);
        if (data.sumber_dana_other) setSumberDanaOther(data.sumber_dana_other);
        if (data.template_id) setSelectedTemplateId(Number(data.template_id));
        if (data.template_type && data.template_type !== "standard") {
          setTemplateType(data.template_type);
        } else if (data.template_id) {
          setTemplateType(`db_${data.template_id}`);
        }

        if (data.penandatangan_nama) {
          setKepalaBalai({
            name: data.penandatangan_nama || DEFAULT_KEPALA_BALAI.name,
            nip: data.penandatangan_nip
              ? formatNIP(data.penandatangan_nip)
              : DEFAULT_KEPALA_BALAI.nip,
          });
        }

        if (data.keterangan) {
          setKeterangan(data.keterangan);
        }

        const loadedEmployees = data.employees || data.personel || [];
        const buruhCount = Number(data.jumlah_buruh || 0);
        setHasBuruh(buruhCount > 0);
        setJumlahBuruh(buruhCount);

        const allLoadedEmployees = buruhCount > 0
          ? syncEmployeesWithBuruhCount(loadedEmployees, buruhCount)
          : loadedEmployees;
        setSelectedEmployees(allLoadedEmployees);

        // Hydrate employeeDates:
        const initialDates: Record<string, { mulai: string; selesai: string }> = {};
        allLoadedEmployees.forEach((emp: any) => {
          const empMulai = emp.tanggal_mulai || emp.pivot?.tanggal_mulai;
          const empSelesai = emp.tanggal_selesai || emp.pivot?.tanggal_selesai;
          if (empMulai && empSelesai) {
            initialDates[String(emp.id)] = {
              mulai: String(empMulai).substring(0, 10),
              selesai: String(empSelesai).substring(0, 10),
            };
          }
        });

        // Fallback: jika template beda-hari dan ada pegawai belum punya tanggal di pivot, parse dari keterangan
        if (data.keterangan && data.keterangan.includes("[Jadwal Personel Berbeda Hari]")) {
          allLoadedEmployees.forEach((emp: any) => {
            if (!initialDates[String(emp.id)]) {
              const nameEscaped = (emp.nama_lengkap || emp.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const nipEscaped = (emp.nip || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const regex = new RegExp(`(?:${nameEscaped}|${nipEscaped})[^:]*:\\s*(\\d{1,2})\\s*s\\/d\\s*(\\d{1,2})\\s+([A-Za-z]+)\\s+(\\d{4})`, "i");
              const match = data.keterangan.match(regex);
              if (match) {
                const day1 = match[1].padStart(2, "0");
                const day2 = match[2].padStart(2, "0");
                const monthName = match[3].toLowerCase();
                const year = match[4];
                const monthMap: Record<string, string> = {
                  januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
                  juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12"
                };
                const month = monthMap[monthName] || "01";
                initialDates[String(emp.id)] = {
                  mulai: `${year}-${month}-${day1}`,
                  selesai: `${year}-${month}-${day2}`,
                };
              }
            }
          });
        }

        // Fallback default jika masih kosong pada template beda-hari
        if (data.template_type === "beda-hari") {
          allLoadedEmployees.forEach((emp: any) => {
            if (!initialDates[String(emp.id)] && loadedTanggalMulai && loadedTanggalSelesai) {
              initialDates[String(emp.id)] = {
                mulai: loadedTanggalMulai,
                selesai: loadedTanggalSelesai,
              };
            }
          });
        }

        setEmployeeDates(initialDates);
        setKotaTujuan(data.tempat_tujuan || "");

        if (data.menimbang && Array.isArray(data.menimbang) && data.menimbang.length > 0) {
          setMenimbangItems(data.menimbang);
        }
        if (data.dasar && Array.isArray(data.dasar) && data.dasar.length > 0) {
          setDasarItems(data.dasar);
        }
        if (data.tembusan && Array.isArray(data.tembusan) && data.tembusan.length > 0) {
          const parsedTembusan = data.tembusan
            .map((t: unknown) => {
              if (typeof t === "string") return t.trim();
              if (t && typeof t === "object" && "text" in t && typeof (t as any).text === "string")
                return (t as any).text.trim();
              return "";
            })
            .filter(Boolean);
          setTembusanItems(parsedTembusan);
        }

        const snapshotConfig = (data.template_snapshot?.configuration || {}) as Record<
          string,
          unknown
        >;
        if (typeof snapshotConfig.judul_lampiran_beda_hari === "string") {
          setJudulLampiranBedaHari(snapshotConfig.judul_lampiran_beda_hari);
        }
        if (
          snapshotConfig.employee_dates &&
          typeof snapshotConfig.employee_dates === "object" &&
          !Array.isArray(snapshotConfig.employee_dates)
        ) {
          setEmployeeDates((prev) => ({
            ...snapshotConfig.employee_dates as Record<string, { mulai: string; selesai: string }>,
            ...prev,
          }));
        }
        if (
          snapshotConfig.employee_departures &&
          typeof snapshotConfig.employee_departures === "object" &&
          !Array.isArray(snapshotConfig.employee_departures)
        ) {
          setEmployeeDepartures((prev) => ({
            ...snapshotConfig.employee_departures as Record<string, string>,
            ...prev,
          }));
        }
        if (typeof snapshotConfig.show_departure_column === "boolean") {
          setShowDepartureColumn(snapshotConfig.show_departure_column);
        } else if (
          typeof snapshotConfig.show_departure_column === "number" ||
          typeof snapshotConfig.show_departure_column === "string"
        ) {
          setShowDepartureColumn(Boolean(Number(snapshotConfig.show_departure_column)));
        }
        if (snapshotConfig.nomor_numbering_type === "naskah_auto") {
          setNomorNumberingType("naskah_auto");
        } else if (snapshotConfig.nomor_numbering_type === "st_pattern") {
          setNomorNumberingType("st_pattern");
        }
        if (typeof snapshotConfig.custom_nomor_naskah === "string" && snapshotConfig.custom_nomor_naskah) {
          setCustomNomorNaskah(snapshotConfig.custom_nomor_naskah);
        }
        if (typeof snapshotConfig.header_title === "string") {
          setHeaderTitle(snapshotConfig.header_title);
        }
        if (typeof snapshotConfig.penutup_text === "string") {
          setPenutupText(snapshotConfig.penutup_text);
        }
        if (snapshotConfig.date_format_style === "tabular") {
          setDateFormatStyle("tabular");
        }
        if (typeof snapshotConfig.signer_authority_mandate === "string") {
          setSignerAuthorityMandate(snapshotConfig.signer_authority_mandate);
        }
        if (typeof snapshotConfig.signer_title === "string") {
          setSignerTitle(snapshotConfig.signer_title);
        }
        if (snapshotConfig.tembusan_position === "bottom") {
          setTembusanPosition("bottom");
        }
        if (typeof snapshotConfig.tembusan_label === "string") {
          setTembusanLabel(snapshotConfig.tembusan_label);
        }
        if (typeof snapshotConfig.kop_image_url === "string") {
          setKopImageUrl(snapshotConfig.kop_image_url);
        }

        const storedUntukLines = splitStoredUntukItems(data.maksud_tujuan);
        const storedAdditionalUntuk = storedUntukLines.slice(1);
        const extractedCustomUntuk = extractCustomUntukItems(storedAdditionalUntuk, expenseTemplates);
        const extractedSnapshotUntuk = Array.isArray(snapshotConfig.untuk)
          ? extractTemplateUntukItems(snapshotConfig.untuk as DasarItem[])
          : [];
        setUntukItems(
          extractedCustomUntuk.length > 0
            ? extractedCustomUntuk
            : extractedSnapshotUntuk.length > 0
            ? extractedSnapshotUntuk
            : data.template_type === "plh"
            ? [{ id: "plh-prinsip", text: DEFAULT_PLH_PRINSIP_TEXT }]
            : []
        );

        const activityStr = storedUntukLines[0] || data.maksud_tujuan || "";
        const cleanedActivity = activityStr
          .replace(/,?\s*selama\s+.*$/i, "")
          .replace(/[;,.]$/, "")
          .trim();

        if (typeof data.task_type_id === "number") {
          setTaskTypeId(data.task_type_id);
        }

        const customTaskName = data.task_type?.nama ? normalizeTaskTypeName(data.task_type.nama) : null;
        const customTaskFormat = data.task_type?.contoh_format || null;
        const isManualSnapshot = snapshotConfig.input_mode_kegiatan === "manual";

        const regex =
          /^.*?\bdari\s+(.*?)\s+ke\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const jenisKegiatanRegex =
          /^.*?\bdari\s+(.*?)\s+ke\s+(.*?)\s+untuk\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const kawasanRegex =
          /^(?:Melaksanakan\s+)?perjalanan\s+dinas\s+di\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const stafRegex = /^Menugaskan\s+Staf\s*(?:untuk\s+)?(.*)/i;
        const singleDayActivity = cleanedActivity;
        const isParsedSingleDayActivity = /^Melaksanakan\s+Kegiatan/i.test(singleDayActivity);
        const isJenisKegiatanData =
          data.task_type_id === 5 ||
          data.task_type?.kode === "jenis_kegiatan" ||
          isJenisKegiatanTask(data.task_type?.nama, customTaskFormat) ||
          jenisKegiatanRegex.test(cleanedActivity);
        const isMenugaskanStaf =
          stafRegex.test(singleDayActivity) ||
          data.task_type_id === 4 ||
          data.task_type?.kode === "menugaskan_staf" ||
          (Boolean(data.task_type?.nama) && data.task_type.nama.toLowerCase().includes("menugaskan staf"));
        const isOneDayFromSubmittedForm =
          loadedTanggalMulai &&
          loadedTanggalSelesai &&
          loadedTanggalMulai === loadedTanggalSelesai &&
          !["bmn-pemeriksaan", "beda-hari", "plh"].includes(data.template_type || "");

        const jkMatch = cleanedActivity.match(jenisKegiatanRegex);
        const match = cleanedActivity.match(regex);
        const kawasanMatch = cleanedActivity.match(kawasanRegex);
        const stafMatch = singleDayActivity.match(stafRegex);

        if (isManualSnapshot || data.template_type === "plh" || data.template_type === "bmn-pemeriksaan") {
          setInputModeKegiatan("manual");
          setActivityPrefix(customTaskName || "Menugaskan Staf");
          setKotaAsal("");
          setKotaTujuan(data.tempat_tujuan || "");
          setNamaKegiatan(cleanedActivity);
        } else if (isJenisKegiatanData && jkMatch) {
          setInputModeKegiatan("structured");
          setActivityPrefix(customTaskName || "Pengawasan / Pemeriksaan Pekerjaan");
          setKotaAsal(jkMatch[1].trim());
          setKotaTujuan(jkMatch[2].trim());
          const rawUntuk = jkMatch[3].trim();
          const rest = jkMatch[4].trim();
          const diRegex = /(.*)\s+di\s+([^,;]+)$/i;
          const diMatch = rest.match(diRegex);
          const rawPaket = diMatch ? diMatch[1].trim() : rest.replace(/[;,.]$/, "").trim();
          const rawTempat = diMatch ? diMatch[2].trim() : "";
          const placeholderRe = /^\{(paket|kegiatan|untuk|jenis_kegiatan)\}$/i;

          if (placeholderRe.test(rawPaket) && !placeholderRe.test(rawUntuk)) {
            setUntukKegiatanText("Pemeriksaan Pekerjaan");
            setNamaKegiatan(rawUntuk);
          } else {
            setUntukKegiatanText(placeholderRe.test(rawUntuk) ? "Pemeriksaan Pekerjaan" : rawUntuk);
            setNamaKegiatan(placeholderRe.test(rawPaket) ? "" : rawPaket);
          }
          if (rawTempat) {
            setTempatKegiatan(rawTempat);
          }
        } else if (isMenugaskanStaf) {
          setInputModeKegiatan("structured");
          setActivityPrefix(customTaskName || "Menugaskan Staf");
          setKotaAsal("");

          let rest = (stafMatch ? stafMatch[1] : singleDayActivity).trim();
          let parsedKota = "";
          let parsedTempat = "";
          let parsedNama = rest;

          const diMatch = rest.match(/(.*?)\s+di\s+([^,;]+)$/i);
          if (diMatch) {
            parsedKota = diMatch[2].trim();
            rest = diMatch[1].trim();
          }
          const padaMatch = rest.match(/(.*?)\s+pada\s+(.+)$/i);
          if (padaMatch) {
            parsedNama = padaMatch[1].trim();
            parsedTempat = padaMatch[2].trim();
          } else {
            parsedNama = rest.trim();
          }

          setKotaTujuan(parsedKota || data.tempat_tujuan || "");
          setTempatKegiatan(parsedTempat);
          setNamaKegiatan(cleanMelaksanakanKegiatanPrefix(parsedNama));
        } else if (
          isParsedSingleDayActivity ||
          data.task_type?.mode_lokasi === "tempat_saja" ||
          (isOneDayFromSubmittedForm && !match && !kawasanMatch)
        ) {
          setInputModeKegiatan("structured");
          setActivityPrefix(customTaskName || "Melaksanakan Kegiatan (1 Hari)");
          setKotaAsal("");

          let rest = singleDayActivity.replace(/^Melaksanakan\s+Kegiatan\s*/i, "").trim();
          if (customTaskFormat && customTaskFormat.includes("{kegiatan}")) {
            const customPrefix = customTaskFormat.split("{kegiatan}")[0]?.trim();
            if (customPrefix && rest.toLowerCase().startsWith(customPrefix.toLowerCase())) {
              rest = rest.slice(customPrefix.length).trim();
            }
          }
          let parsedKota = "";
          let parsedTempat = "";
          let parsedNama = rest;

          const diMatch = rest.match(/(.*?)\s+di\s+([^,;]+)$/i);
          if (diMatch) {
            parsedKota = diMatch[2].trim();
            rest = diMatch[1].trim();
          }
          const padaMatch = rest.match(/(.*?)\s+pada\s+(.+)$/i);
          if (padaMatch) {
            parsedNama = padaMatch[1].trim();
            parsedTempat = padaMatch[2].trim();
          } else {
            parsedNama = rest.trim();
          }

          setKotaTujuan(parsedKota || data.tempat_tujuan || "");
          setTempatKegiatan(parsedTempat);
          setNamaKegiatan(cleanMelaksanakanKegiatanPrefix(parsedNama));
        } else if (match) {
          setInputModeKegiatan("structured");
          setActivityPrefix(customTaskName || "Perjalanan Dinas Luar Wilayah");
          setKotaAsal(match[1].trim());
          setKotaTujuan(match[2].trim());
          const rest = match[3].trim();
          const diRegex = /(.*)\s+di\s+([^,;]+)$/i;
          const diMatch = rest.match(diRegex);
          if (diMatch) {
            setNamaKegiatan(diMatch[1].trim());
            setTempatKegiatan(diMatch[2].trim());
          } else {
            setNamaKegiatan(rest.replace(/[;,.]$/, "").trim());
          }
        } else if (kawasanMatch) {
          setInputModeKegiatan("structured");
          setActivityPrefix(customTaskName || "Perjalanan Dinas Dalam Kawasan / Wilayah");
          setKotaAsal("");
          setKotaTujuan(kawasanMatch[1].trim());
          const rest = kawasanMatch[2].trim();
          const diRegex = /(.*)\s+di\s+([^,;]+)$/i;
          const diMatch = rest.match(diRegex);
          if (diMatch) {
            setNamaKegiatan(diMatch[1].trim());
            setTempatKegiatan(diMatch[2].trim());
          } else {
            setNamaKegiatan(rest.replace(/[;,.]$/, "").trim());
          }
        } else {
          const isInternalTask = !singleDayActivity.toLowerCase().includes("perjalanan dinas");
          setActivityPrefix(
            customTaskName || (isInternalTask ? "Menugaskan Staf" : "Perjalanan Dinas Luar Wilayah")
          );
          setKotaAsal("");
          setKotaTujuan(data.tempat_tujuan || "");
          setNamaKegiatan(cleanMelaksanakanKegiatanPrefix(cleanedActivity));
          setInputModeKegiatan("structured");
        }

        if (data.template_type === "plh") {
          const sampleText = [
            cleanedActivity,
            data.tempat_tujuan,
            data.menimbang?.[0]?.text,
            data.maksud_tujuan,
          ]
            .filter(Boolean)
            .join(" ");
          const detectedRole = detectPlhTargetRole(sampleText);
          setPlhTargetRole(detectedRole);
          const opt = getPlhTargetOption(detectedRole);
          setPlhWilayah(opt.wilayah);
          const mKegiatan = (data.menimbang?.[0]?.text || "").match(/akan\s+(.*?)(?:;|\.|$)/i);
          if (mKegiatan?.[1]) {
            setPlhKegiatanKasi(mKegiatan[1].trim());
          }
          const mNomor = (data.dasar?.[0]?.text || "").match(
            /Nomor\s*:\s*([^ ]+)\s+tanggal\s+([^.]+)/i
          );
          if (mNomor) {
            setParentStInfo({
              nomorInduk: mNomor[1]?.trim(),
              tanggalInduk: mNomor[2]?.trim(),
            });
          }
        }

        if (typeof data.sertakan_laporan === "boolean") {
          setSertakanLaporan(data.sertakan_laporan);
        }

        const rawTemplateType: string | null = data.template_type || null;
        const rawTemplateId: number | null = data.template_id
          ? Number(data.template_id)
          : rawTemplateType && rawTemplateType.startsWith("db_")
          ? parseInt(rawTemplateType.replace("db_", ""), 10)
          : null;
        const isFoluFunding = isFoluSumberDana(funding, expenseTemplates);
        const hasValidMenimbang =
          Array.isArray(data.menimbang) &&
          data.menimbang.length > 0 &&
          !(data.menimbang[0]?.text === "bahwa dalam rangka , perlu ;" && !rawTemplateId);
        const hasValidDasar =
          Array.isArray(data.dasar) &&
          data.dasar.length > 0 &&
          !(
            !rawTemplateId &&
            isFoluFunding &&
            !data.dasar.some((d: any) => /folu|rocan|awp|norwegia/i.test(d?.text || ""))
          );

        editLetterHydrationRef.current = {
          resolved: false,
          rawTemplateId,
          rawTemplateType,
          hasStoredMenimbang: hasValidMenimbang,
          hasStoredDasar: hasValidDasar,
          hasStoredTembusan: Boolean(Array.isArray(data.tembusan) && data.tembusan.length > 0),
          hasStoredUntuk:
            extractedCustomUntuk.length > 0 || extractedSnapshotUntuk.length > 0,
          hasSnapshotConfig: Boolean(
            snapshotConfig.header_title ||
              snapshotConfig.penutup_text ||
              snapshotConfig.signer_authority_mandate
          ),
        };

        if (!data.dasar || !Array.isArray(data.dasar) || data.dasar.length === 0) {
          updateDasarFromFunding(funding, new Date().toISOString().substring(0, 10));
        }
      } catch (err) {
        console.error(err);
        if (isAxiosError(err) && err.response?.status === 404) {
          toast.error("Surat Tugas tidak ditemukan atau sudah dihapus.");
          router.push("/kepegawaian/surat-tugas/inbox");
          return;
        }
        toast.error("Gagal memuat data Surat Tugas.");
      } finally {
        setIsInitializing(false);
      }
    };

    fetchAndParse(letterId);
  }, [letterId, mode]);

  // Edit Mode: Sinkronisasi otomatis Template ST berdasarkan Sumber Dana atau template_id surat
  useEffect(() => {
    if (
      mode !== "edit" ||
      isInitializing ||
      dynamicTemplates.length === 0 ||
      editLetterHydrationRef.current.resolved
    ) {
      return;
    }

    const hydration = editLetterHydrationRef.current;
    hydration.resolved = true;

    if (["bmn-pemeriksaan", "beda-hari", "plh"].includes(hydration.rawTemplateType || "")) {
      return;
    }

    const normalizedFunding = normalizeSumberDana(sumberDana, expenseTemplates);
    if (normalizedFunding !== sumberDana) {
      setSumberDana(normalizedFunding);
    }

    const matchedById = hydration.rawTemplateId
      ? dynamicTemplates.find((t) => t.id === hydration.rawTemplateId) || null
      : null;
    const matchedByFunding = findMatchingTemplateForSumberDana(
      normalizedFunding,
      dynamicTemplates,
      expenseTemplates
    );
    const targetTemplate = matchedById || matchedByFunding;

    if (!targetTemplate) return;

    applyDynamicTemplateToForm(targetTemplate, {
      preserveSumberDana: true,
      preserveActivity: true,
      preserveStoredMenimbang: hydration.hasStoredMenimbang,
      preserveStoredDasar: hydration.hasStoredDasar,
      preserveStoredTembusan: hydration.hasStoredTembusan,
      preserveStoredUntuk: hydration.hasStoredUntuk,
    });

    updateDasarFromFunding(normalizedFunding, tanggalSurat);
  }, [
    mode,
    isInitializing,
    dynamicTemplates,
    expenseTemplates,
    sumberDana,
    tanggalSurat,
    applyDynamicTemplateToForm,
  ]);

  // Apply BMN Penghapusan template
  const applyBmnTemplate = () => {
    setKlasifikasi("KAP.05");
    setSumberDana("dl1");
    setTemplateType("bmn-pemeriksaan");

    const today = new Date().toISOString().substring(0, 10);
    setTanggalMulai(today);
    setTanggalSelesai(today);

    setMenimbangItems([
      {
        id: "bmn-m1",
        text: "bahwa dalam rangka penghapusan Barang Milik Negara berupa Alat Angkutan Bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur;",
      },
      {
        id: "bmn-m2",
        text: "bahwa sehubungan dengan butir a tersebut di atas dipandang perlu untuk menugaskan staf tersebut di bawah ini untuk melakukan pemeriksaan Barang Milik Negara.",
      },
    ]);

    setDasarItems([
      { id: "bmn-d1", text: "Undang-Undang RI Nomor 17 Tahun 2003 tentang Keuangan Negara;" },
      { id: "bmn-d2", text: "Undang-Undang RI Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;" },
      {
        id: "bmn-d3",
        text: "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;",
      },
      { id: "bmn-d4", text: "Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;" },
      {
        id: "bmn-d5",
        text: "Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;",
      },
      {
        id: "bmn-d6",
        text: "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;",
      },
      {
        id: "bmn-d7",
        text: "Peraturan Menteri Keuangan Nomor 181/PMK.06/2016 tentang Penatausahaan Barang Milik Negara;",
      },
      {
        id: "bmn-d8",
        text: "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan.",
      },
    ]);

    setActivityPrefix("");
    setKotaAsal("");
    setKotaTujuan("");
    setTempatKegiatan("");
    setNamaKegiatan(
      "Melaksanakan pemeriksaan Barang Milik Negara berupa Alat Angkutan Bermotor pada tanggal " +
        formatDateIndonesian(today)
    );
    setInputModeKegiatan("manual");
  };

  // Apply Beda Hari template
  const applyBedaHariTemplate = () => {
    setTemplateType("beda-hari");
    setEmployeeDates((prev) => {
      const next = { ...prev };
      selectedEmployees.forEach((emp) => {
        const empKey = String(emp.id);
        if (!next[empKey] && !next[emp.id]) {
          next[empKey] = { mulai: tanggalMulai || "", selesai: tanggalSelesai || "" };
        }
      });
      return next;
    });
  };

  // Apply PLH template
  const applyPlhTemplate = (
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
      passedTemplate?: StTemplate | null
    ) => {
      const plhTemplate =
        passedTemplate || dynamicTemplates.find((t) => t.code === "plh" || t.type === "plh");

      setTemplateType("plh");
      if (plhTemplate) {
        setSelectedTemplateId(plhTemplate.id);
      }

      const config = plhTemplate?.configuration || {};
      if (typeof config.klasifikasi === "string") setKlasifikasi(config.klasifikasi);
      else setKlasifikasi("PEG.09.01");

      if (typeof config.sumber_dana === "string") setSumberDana(config.sumber_dana);
      else setSumberDana("dl1");

      if (plhTemplate?.default_signer_name && plhTemplate?.default_signer_nip) {
        setKepalaBalai({
          employeeId: plhTemplate.default_signer_employee_id || undefined,
          name: plhTemplate.default_signer_name,
          nip: formatNIP(plhTemplate.default_signer_nip),
        });
      }

      const today = new Date().toISOString().substring(0, 10);
      const mulai = parentSt?.tanggal_mulai?.split("T")[0] || today;
      const selesai = parentSt?.tanggal_selesai?.split("T")[0] || today;
      setTanggalMulai(mulai);
      setTanggalSelesai(selesai);

      const nomorInduk = parentSt?.nomor_surat || "...";
      const tanggalInduk = parentSt?.tanggal_surat
        ? formatDateIndonesian(parentSt.tanggal_surat.split("T")[0])
        : "...";
      const targetOfficial =
        parentSt?.employees?.find((emp) => {
          const pos = (emp.jabatan || emp.position || emp.satuan_kerja || "").toLowerCase();
          return (
            pos.includes("kepala subbagian") ||
            pos.includes("kasubag") ||
            pos.includes("kasubbag") ||
            pos.includes("kepala seksi")
          );
        }) || parentSt?.employees?.[0];

      const candidateText = [
        targetOfficial?.satuan_kerja,
        targetOfficial?.jabatan,
        targetOfficial?.position,
        parentSt?.maksud_tujuan,
        parentSt?.tempat_tujuan,
      ]
        .filter(Boolean)
        .join(" ");

      const detectedRole = detectPlhTargetRole(candidateText);
      const targetOpt = getPlhTargetOption(detectedRole);
      setPlhTargetRole(detectedRole);

      const wilayah =
        detectedRole === "kasubbag_tu"
          ? targetOpt.wilayah
          : extractPlhWilayahFromPosition(
              targetOfficial?.satuan_kerja ||
                targetOfficial?.jabatan ||
                targetOfficial?.position ||
                ""
            ) || targetOpt.wilayah;

      const kegiatanKasi = cleanPlhKegiatanKasi(parentSt?.maksud_tujuan);

      setPlhWilayah(wilayah);
      setPlhKegiatanKasi(kegiatanKasi);

      setParentStInfo({
        nomorInduk: parentSt?.nomor_surat,
        tanggalInduk: parentSt?.tanggal_surat ? parentSt.tanggal_surat.split("T")[0] : undefined,
      });

      const plhContext = {
        targetRole: detectedRole,
        pejabatTitle: targetOpt.pejabatTitle,
        wilayah,
        kegiatanKasi,
        nomorInduk,
        tanggalInduk,
      };

      if (plhTemplate?.menimbang && plhTemplate.menimbang.length > 0) {
        const formattedMenimbang = plhTemplate.menimbang.map((item) => {
          const text = (item.text || "").replace(/{tahun}/g, currentYear);
          return {
            ...item,
            text: replacePlhAllPlaceholders(text, plhContext),
          };
        });
        setMenimbangItems(formattedMenimbang);
      } else {
        setMenimbangItems([
          {
            id: "plh-m1",
            text: `bahwa ${targetOpt.pejabatTitle} akan ${kegiatanKasi || "..."};`,
          },
          {
            id: "plh-m2",
            text: `bahwa sehubungan dengan hal tersebut di atas untuk kelancaran pelaksanaan tugas sehari-hari maka perlu ada pejabat sementara yang menggantikan tugas ${targetOpt.pejabatTitle}.`,
          },
        ]);
      }

      if (plhTemplate?.dasar && plhTemplate.dasar.length > 0) {
        const formattedDasar = plhTemplate.dasar.map((item) => {
          const text = (item.text || "").replace(/{tahun}/g, currentYear);
          return {
            ...item,
            text: replacePlhAllPlaceholders(text, plhContext),
          };
        });
        setDasarItems(formattedDasar);
      } else {
        setDasarItems([
          {
            id: "plh-d1",
            text: `Surat Tugas Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor : ${nomorInduk} tanggal ${tanggalInduk}.`,
          },
        ]);
      }

      const defaultJenis =
        typeof config.default_jenis_tugas === "string" && config.default_jenis_tugas.trim()
          ? config.default_jenis_tugas
          : "Menugaskan Staf";
      setActivityPrefix(defaultJenis);
      setKotaAsal("");

      if (detectedRole === "kasubbag_tu") {
        setKotaTujuan("Samarinda");
        setTempatKegiatan("Kantor Balai KSDA Kalimantan Timur");
      } else {
        setKotaTujuan(targetOpt.defaultLocation);
        setTempatKegiatan(`Kantor Seksi KSDA ${targetOpt.defaultLocation}`);
      }

      const polaKegiatan =
        typeof config.default_kegiatan === "string" && config.default_kegiatan.trim()
          ? config.default_kegiatan
          : detectedRole === "kasubbag_tu"
          ? `Melaksanakan tugas sehari-hari sebagai pelaksana harian ${PLH_KASUBBAG_TU_TITLE}`
          : `Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}`;

      setNamaKegiatan(
        replacePlhAllPlaceholders(polaKegiatan, plhContext)
      );

      setInputModeKegiatan("manual");
      if (Array.isArray(config.untuk) && config.untuk.length > 0) {
        setUntukItems(formatYearInItems(config.untuk));
      } else {
        setUntukItems([{ id: "plh-prinsip", text: DEFAULT_PLH_PRINSIP_TEXT }]);
      }
      setSertakanLaporan(
        typeof config.default_sertakan_laporan === "boolean" ? config.default_sertakan_laporan : false
      );

      setTembusanItems([
        "Direktur Jenderal KSDAE;",
        "Sekretaris Direktorat Jenderal KSDAE.",
      ]);

      if (plhName?.trim()) {
        setPendingPlhEmployeeName(plhName.trim());
      }
    };

  const handlePlhTargetRoleChange = (newRole: PlhTargetRole) => {
    setPlhTargetRole(newRole);
    const opt = getPlhTargetOption(newRole);
    setPlhWilayah(opt.wilayah);

    if (newRole === "kasubbag_tu") {
      setKotaTujuan("Samarinda");
      setTempatKegiatan("Kantor Balai KSDA Kalimantan Timur");
    } else {
      setKotaTujuan(opt.defaultLocation);
      setTempatKegiatan(`Kantor Seksi KSDA ${opt.defaultLocation}`);
    }

    const newPejabatTitle = opt.pejabatTitle;
    const newKegiatan = `Melaksanakan tugas sehari-hari sebagai pelaksana harian ${newPejabatTitle}`;
    setNamaKegiatan(newKegiatan);

    const updateContext = {
      targetRole: newRole,
      pejabatTitle: newPejabatTitle,
      wilayah: opt.wilayah,
      kegiatanKasi: plhKegiatanKasi,
      nomorInduk: parentStInfo.nomorInduk,
      tanggalInduk: parentStInfo.tanggalInduk,
    };

    setMenimbangItems((prev) =>
      prev.map((item) => ({
        ...item,
        text: replacePlhAllPlaceholders(item.text, updateContext),
      }))
    );
  };

  const handlePlhKegiatanChange = (kegiatan: string) => {
    setPlhKegiatanKasi(kegiatan);
    const targetOpt = getPlhTargetOption(plhTargetRole);
    const updateContext = {
      targetRole: plhTargetRole,
      pejabatTitle: targetOpt.pejabatTitle,
      wilayah: plhWilayah || targetOpt.wilayah,
      kegiatanKasi: kegiatan,
      nomorInduk: parentStInfo.nomorInduk,
      tanggalInduk: parentStInfo.tanggalInduk,
    };
    setMenimbangItems((prev) =>
      prev.map((item) => ({
        ...item,
        text: replacePlhAllPlaceholders(item.text, updateContext),
      }))
    );
  };

  const handleParentStInfoChange = (field: "nomor" | "tanggal", value: string) => {
    const nextInfo = {
      ...parentStInfo,
      ...(field === "nomor" ? { nomorInduk: value } : { tanggalInduk: value }),
    };
    setParentStInfo(nextInfo);
    const targetOpt = getPlhTargetOption(plhTargetRole);
    const updateContext = {
      targetRole: plhTargetRole,
      pejabatTitle: targetOpt.pejabatTitle,
      wilayah: plhWilayah || targetOpt.wilayah,
      kegiatanKasi: plhKegiatanKasi,
      nomorInduk: nextInfo.nomorInduk,
      tanggalInduk: nextInfo.tanggalInduk,
    };
    setDasarItems((prev) =>
      prev.map((item) => ({
        ...item,
        text: replacePlhAllPlaceholders(item.text, updateContext),
      }))
    );
  };

  const activeBuilderTaskType = useMemo(() => {
    const norm = normalizeTaskTypeName(activityPrefix);
    return (
      taskTypes.find((t) => t.id === taskTypeId) ||
      taskTypes.find((t) => t.nama === norm || t.nama === activityPrefix) ||
      null
    );
  }, [taskTypes, taskTypeId, activityPrefix]);

  // Template switch handler
  const handleTemplateChange = (value: string) => {
    if (value === "bmn-pemeriksaan") {
      setSelectedTemplateId(null);
      applyBmnTemplate();
      const bmnTemplate = dynamicTemplates.find(
        (t) => t.code === "bmn-penghapusan" || t.type === "bmn"
      );
      if (bmnTemplate?.configuration?.default_jenis_tugas) {
        const norm = normalizeTaskTypeName(bmnTemplate.configuration.default_jenis_tugas);
        setActivityPrefix(norm);
        const match = taskTypes.find((t) => t.nama === norm);
        if (match) setTaskTypeId(match.id);
      }
      if (Array.isArray(bmnTemplate?.configuration?.untuk)) {
        setUntukItems(extractTemplateUntukItems(bmnTemplate.configuration.untuk));
      } else {
        setUntukItems([]);
      }
      if (typeof bmnTemplate?.configuration?.default_sertakan_laporan === "boolean") {
        setSertakanLaporan(bmnTemplate.configuration.default_sertakan_laporan);
      }
      if (bmnTemplate?.configuration?.default_mode_kegiatan) {
        setInputModeKegiatan(bmnTemplate.configuration.default_mode_kegiatan);
      }
    } else if (value === "beda-hari") {
      setSelectedTemplateId(null);
      applyBedaHariTemplate();
      const bedaHariTemplate = dynamicTemplates.find(
        (t) => t.code === "beda-hari" || t.type === "beda_hari"
      );
      if (bedaHariTemplate?.configuration?.default_jenis_tugas) {
        const norm = normalizeTaskTypeName(bedaHariTemplate.configuration.default_jenis_tugas);
        setActivityPrefix(norm);
        const match = taskTypes.find((t) => t.nama === norm);
        if (match) setTaskTypeId(match.id);
      }
      if (Array.isArray(bedaHariTemplate?.configuration?.untuk)) {
        setUntukItems(extractTemplateUntukItems(bedaHariTemplate.configuration.untuk));
      }
      if (typeof bedaHariTemplate?.configuration?.default_sertakan_laporan === "boolean") {
        setSertakanLaporan(bedaHariTemplate.configuration.default_sertakan_laporan);
      }
      if (bedaHariTemplate?.configuration?.default_mode_kegiatan) {
        setInputModeKegiatan(bedaHariTemplate.configuration.default_mode_kegiatan);
      }
    } else if (value === "plh") {
      if (!canSelectPlh) {
        toast.error(
          "Template PLH hanya dapat dipilih jika pegawai yang ditugaskan adalah Kasubbag TU atau Kepala Seksi."
        );
        return;
      }
      const plhDbTemplate = dynamicTemplates.find((t) => t.code === "plh" || t.type === "plh");
      applyPlhTemplate(undefined, undefined, plhDbTemplate);
    } else if (value.startsWith("db_")) {
      const id = parseInt(value.replace("db_", ""), 10);
      const template = dynamicTemplates.find((t) => t.id === id);
      if (template) {
        if (template.type === "bmn") {
          applyBmnTemplate();
        } else if (template.type === "beda_hari") {
          applyBedaHariTemplate();
        } else if (template.type === "plh") {
          if (!canSelectPlh) {
            toast.error(
              "Template PLH hanya dapat dipilih jika pegawai yang ditugaskan adalah Kasubbag TU atau Kepala Seksi."
            );
            return;
          }
          applyPlhTemplate(undefined, undefined, template);
        }
        applyDynamicTemplateToForm(template, {
          preserveActivity: mode === "edit" && Boolean(namaKegiatan.trim()),
        });
      }
    } else {
      setSelectedTemplateId(null);
      setTemplateType(null);
      setMenimbangItems([]);
      setDasarItems((prev) => {
        const manualOnly = prev.filter((i) => String(i.id).startsWith("manual-dasar-"));
        const existingFunding = prev.find(
          (i) => i.id === "funding-dasar" || isFundingDasarText(i.text, expenseTemplates)
        );
        return orderDasarLayers(manualOnly, existingFunding);
      });
      setUntukItems([]);
    }
  };

  // One-shot URL query param handling for Create mode
  useEffect(() => {
    if (mode !== "create" || templateAppliedRef.current) return;
    if (initialTemplate === "bmn-pemeriksaan") {
      templateAppliedRef.current = true;
      applyBmnTemplate();
    } else if (initialTemplate === "plh") {
      templateAppliedRef.current = true;
      (async () => {
        try {
          const [templatesRes, parentRes] = await Promise.allSettled([
            api.get("/kepegawaian/st-templates"),
            initialParentStId ? api.get(`/surat-tugas/${initialParentStId}`) : Promise.resolve(null),
          ]);
          let plhDbTemplate: StTemplate | undefined;
          if (templatesRes.status === "fulfilled" && templatesRes.value) {
            const templates: StTemplate[] = templatesRes.value.data?.data || [];
            setDynamicTemplates(templates);
            plhDbTemplate = templates.find((t) => t.code === "plh" || t.type === "plh");
          }
          let parentData: any = null;
          if (parentRes.status === "fulfilled" && parentRes.value) {
            parentData = parentRes.value.data?.data;
          }
          applyPlhTemplate(
            parentData
              ? {
                  nomor_surat: parentData?.nomor_surat,
                  tanggal_surat: parentData?.tanggal_surat,
                  tanggal_mulai: parentData?.tanggal_mulai,
                  tanggal_selesai: parentData?.tanggal_selesai,
                  tempat_tujuan: parentData?.tempat_tujuan,
                  maksud_tujuan: parentData?.maksud_tujuan,
                  employees: parentData?.employees || parentData?.personel || [],
                }
              : undefined,
            parentData?.nama_plh,
            plhDbTemplate
          );
        } catch (err) {
          applyPlhTemplate();
        }
      })();
    }
  }, [initialTemplate, initialParentStId, mode]);

  // Text builders
  const replacePlhPlaceholders = useCallback(
    (value: string) => {
      if (!isPlhTemplate) return value;
      const targetOpt = getPlhTargetOption(plhTargetRole);
      return replacePlhAllPlaceholders(value, {
        targetRole: plhTargetRole,
        pejabatTitle: targetOpt.pejabatTitle,
        wilayah: plhWilayah || targetOpt.wilayah,
        kegiatanKasi: plhKegiatanKasi,
        nomorInduk: parentStInfo.nomorInduk,
        tanggalInduk: parentStInfo.tanggalInduk,
      });
    },
    [isPlhTemplate, plhTargetRole, plhKegiatanKasi, plhWilayah, parentStInfo.nomorInduk, parentStInfo.tanggalInduk]
  );

  const getPreviewMenimbangItems = () =>
    isPlhTemplate
      ? menimbangItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : formatTemplateMenimbang(menimbangItems, namaKegiatan, tempatKegiatan || kotaTujuan);

  const getPreviewDasarItems = () =>
    isPlhTemplate
      ? dasarItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : dasarItems;

  const getTempatTujuanForPayload = () => {
    if (isPlhTemplate) {
      if (plhTargetRole === "kasubbag_tu") {
        return kotaTujuan.trim() || tempatKegiatan.trim() || "Samarinda";
      }
      return plhWilayah.trim() || kotaTujuan.trim() || tempatKegiatan.trim() || "Wilayah Penugasan";
    }
    if (isDalamKawasanTask(activityPrefix)) {
      return tempatKegiatan.trim() || kotaTujuan.trim() || "Kalimantan Timur";
    }
    if (activityPrefix.includes("Melaksanakan Kegiatan") || activityPrefix.includes("Menugaskan Staf")) {
      return tempatKegiatan.trim() || kotaTujuan.trim() || "Kalimantan Timur";
    }
    if (inputModeKegiatan === "manual") {
      return kotaTujuan.trim() || tempatKegiatan.trim() || "Kalimantan Timur";
    }
    return kotaTujuan.trim() || tempatKegiatan.trim();
  };

  const buildUntukText = (): string => {
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

    if (isBmnTemplate) {
      let text = namaKegiatan || "...";
      if (!text.trim().endsWith(".") && !text.trim().endsWith(";")) {
        text += ".";
      }
      return text;
    }

    if (isPlhTemplate || inputModeKegiatan === "manual") {
      const targetOpt = getPlhTargetOption(plhTargetRole);
      let text = isPlhTemplate
        ? replacePlhPlaceholders(namaKegiatan || "...")
        : (namaKegiatan || "...")
            .replace(/\{wilayah\}/gi, plhWilayah || targetOpt.wilayah || kotaTujuan || "Wilayah I Berau")
            .replace(/\{pejabat\}/gi, targetOpt.pejabatTitle || "Kepala Seksi Konservasi Wilayah I")
            .replace(/\{tahun\}/gi, currentYear);
      text = text.trim().replace(/[;,.]+$/, "");
      if (!/,\s*selama\s+\d+/i.test(text)) {
        if (days === 1 || effectiveMulai === effectiveSelesai) {
          text += `, selama 1 (satu) hari pada tanggal ${mulaiFormatted};`;
        } else if (days > 1) {
          text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
        } else {
          text += ";";
        }
      } else {
        text += ";";
      }
      return text;
    }

    const currentModeLokasi =
      activeBuilderTaskType?.mode_lokasi ||
      (isDalamKawasanTask(activityPrefix)
        ? "dalam_kawasan"
        : activityPrefix.includes("Perjalanan Dinas") ||
          isJenisKegiatanTask(activityPrefix, activeBuilderTaskType?.contoh_format)
        ? "luar_wilayah"
        : "tempat_saja");

    let text = buildKegiatanDiktumText({
      modeLokasi: currentModeLokasi,
      jenisTugas: activityPrefix,
      kotaAsal,
      kotaTujuan,
      tempatSpesifik: tempatKegiatan,
      namaKegiatanText: namaKegiatan,
      untukKegiatanText,
      contohFormat: activeBuilderTaskType?.contoh_format,
    });
    if (days === 1 || effectiveMulai === effectiveSelesai) {
      text += `, selama 1 (satu) hari pada tanggal ${mulaiFormatted};`;
    } else if (days > 1) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };

  const buildBiayaText = (): string => {
    if (isBmnTemplate || isPlhTemplate || sumberDana === "dl1") return "";
    const tahun = tanggalSurat
      ? new Date(tanggalSurat).getFullYear().toString()
      : new Date().getFullYear().toString();

    const dynExpense = expenseTemplates.find(
      (o) =>
        o.code === sumberDana ||
        o.name.toLowerCase() === sumberDana.toLowerCase() ||
        String(o.id) === sumberDana
    );
    if (dynExpense) {
      return dynExpense.biaya_text ? dynExpense.biaya_text.replace(/{tahun}/g, tahun) : "";
    }

    const opt =
      availableSumberDanaOptions.find((o) => o.id === sumberDana) ||
      SUMBER_DANA_OPTIONS.find((o) => o.id === sumberDana);
    if (opt) {
      return opt.biayaText ? opt.biayaText.replace(/{tahun}/g, tahun) : "";
    }
    if (sumberDana === "other") {
      return sumberDanaOther
        ? `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${sumberDanaOther};`
        : "";
    }

    return "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;";
  };

  useEffect(() => {
    if (sumberDana && expenseTemplates.length > 0) {
      updateDasarFromFunding(sumberDana, tanggalSurat);
    }
  }, [expenseTemplates, sumberDana, tanggalSurat]);

  const updateFoluMenimbang = (activity: string, place: string) => {
    setMenimbangItems((prev) => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      const isDefaultText = first.text === "bahwa dalam rangka , perlu ;";
      if (first.id !== "folu-1" && !isDefaultText && !isGeneratedFoluMenimbangText(first.text))
        return prev;

      const nextText = buildFoluMenimbangText(activity, place);
      if (first.text === nextText && first.id === "folu-1") return prev;

      const nextItems = [...prev];
      nextItems[0] = { ...first, id: "folu-1", text: nextText };
      return nextItems;
    });
  };

  const handleSumberDanaChange = (newFunding: string) => {
    setSumberDana(newFunding);
    updateDasarFromFunding(newFunding, tanggalSurat);

    if (!isPlhTemplate && !isBmnTemplate && !isBedaHariTemplate && dynamicTemplates.length > 0) {
      const matched = findMatchingTemplateForSumberDana(
        newFunding,
        dynamicTemplates,
        expenseTemplates
      );
      if (matched && templateType !== `db_${matched.id}`) {
        applyDynamicTemplateToForm(matched, {
          preserveSumberDana: true,
          preserveActivity: true,
        });
      }
    }
  };

  const handleNamaKegiatanChange = (value: string) => {
    setNamaKegiatan(value);
    if (isFoluSumberDana(sumberDana, expenseTemplates)) {
      updateFoluMenimbang(value, tempatKegiatan);
    }
    const lower = value.toLowerCase();
    if (lower.includes("konflik")) {
      setKlasifikasi("KSA.03.01");
      setMenimbangItems((prev) => {
        const newItems = [...prev];
        if (newItems.length > 0) {
          newItems[0] = {
            ...newItems[0],
            text: "bahwa dalam rangka kegiatan penanganan konflik satwa, perlu penyelamatan;",
          };
        }
        return newItems;
      });
    }
  };

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

  const buildPayload = (status?: string) => {
    let effectiveMulai = tanggalMulai;
    let effectiveSelesai = tanggalSelesai;
    if (isBedaHariTemplate) {
      const allMulai = selectedEmployees
        .map((emp) => employeeDates[String(emp.id)]?.mulai || employeeDates[emp.id]?.mulai)
        .filter((d): d is string => Boolean(d));
      const allSelesai = selectedEmployees
        .map((emp) => employeeDates[String(emp.id)]?.selesai || employeeDates[emp.id]?.selesai)
        .filter((d): d is string => Boolean(d));
      if (allMulai.length > 0) {
        effectiveMulai = allMulai.reduce((min, d) => (d < min ? d : min), allMulai[0]);
      }
      if (allSelesai.length > 0) {
        effectiveSelesai = allSelesai.reduce((max, d) => (d > max ? d : max), allSelesai[0]);
      }
    }

    let updatedKeterangan = keterangan;
    if (isBedaHariTemplate) {
      const baseKeterangan = (keterangan || "").replace(/\[Jadwal Personel Berbeda Hari\]:[\s\S]*$/, "").trim();
      const scheduleLines = selectedEmployees.map((emp, index) => {
        const dates = employeeDates[String(emp.id)] || employeeDates[emp.id] || {
          mulai: effectiveMulai,
          selesai: effectiveSelesai,
        };
        const rangeText = formatDateRangeIndonesian(dates.mulai, dates.selesai);
        return `${index + 1}. ${emp.nama_lengkap || emp.name}: ${rangeText}`;
      });
      const scheduleBlock = `[Jadwal Personel Berbeda Hari]:\n${scheduleLines.join("\n")}`;
      updatedKeterangan = baseKeterangan ? `${baseKeterangan}\n\n${scheduleBlock}` : scheduleBlock;
    }

    const realEmployees = selectedEmployees.filter((e) => !isBuruhEmployee(e));
    const employeesPayload = realEmployees.map((employee) => ({
      id: employee.id,
      tanggal_mulai: isBedaHariTemplate
        ? (employeeDates[String(employee.id)]?.mulai || employeeDates[employee.id]?.mulai || effectiveMulai)
        : effectiveMulai,
      tanggal_selesai: isBedaHariTemplate
        ? (employeeDates[String(employee.id)]?.selesai || employeeDates[employee.id]?.selesai || effectiveSelesai)
        : effectiveSelesai,
    }));

    const templateSnapshotPayload = {
      configuration: {
        ...(isBedaHariTemplate
          ? {
              judul_lampiran_beda_hari: judulLampiranBedaHari,
              employee_dates: employeeDates,
              employee_departures: showDepartureColumn ? employeeDepartures : {},
              show_departure_column: showDepartureColumn,
            }
          : {}),
        nomor_numbering_type: nomorNumberingType,
        custom_nomor_naskah: customNomorNaskah,
        input_mode_kegiatan: inputModeKegiatan,
        untuk: untukItems.filter((i) => i.text.trim()),
      },
    };

    const fullNomorSurat =
      nomorNumberingType === "naskah_auto"
        ? (customNomorNaskah.trim() || "${nomor_naskah}")
        : (stNumber.trim() && klasifikasi.trim()
            ? buildNomorSurat(stNumber.trim(), klasifikasi.trim())
            : null);

    const matchedTaskType = taskTypes.find(
      (t) => t.nama === normalizeTaskTypeName(activityPrefix) || t.kode === "jenis_kegiatan"
    );
    const calculatedTaskTypeId =
      matchedTaskType?.id ||
      (isJenisKegiatanTask(activityPrefix)
        ? 5
        : activityPrefix.includes("Menugaskan Staf")
        ? 4
        : activityPrefix.includes("Melaksanakan Kegiatan")
        ? 3
        : isDalamKawasanTask(activityPrefix)
        ? 2
        : 1);

    return {
      nomor_surat: fullNomorSurat,
      kode_surat:
        nomorNumberingType === "naskah_auto"
          ? null
          : (klasifikasi.trim() ? `K.18/TU/${klasifikasi.trim()}/B` : null),
      tanggal_surat: tanggalSurat || null,
      maksud_tujuan: [
        buildUntukText(),
        ...buildOrderedAdditionalUntukItems({
          templateType,
          biayaText: buildBiayaText(),
          customTemplateItems: untukItems,
          sertakanLaporan,
        }).map((item) => item.text),
      ]
        .filter(Boolean)
        .join("\n"),
      tanggal_mulai: effectiveMulai,
      tanggal_selesai: effectiveSelesai,
      tempat_tujuan: getTempatTujuanForPayload() || null,
      task_type_id: taskTypeId || calculatedTaskTypeId,
      sumber_dana: sumberDana,
      sumber_dana_other: sumberDanaOther,
      template_type: templateType,
      template_id: selectedTemplateId,
      sertakan_laporan: sertakanLaporan,
      menimbang: getPreviewMenimbangItems(),
      dasar: getPreviewDasarItems(),
      tembusan: tembusanItems.length > 0 ? tembusanItems : null,
      penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
      penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
      employees: employeesPayload,
      employee_ids: realEmployees.map((e) => e.id),
      jumlah_buruh: hasBuruh ? (jumlahBuruh || extractBuruhCount(selectedEmployees)) : 0,
      keterangan: updatedKeterangan,
      template_snapshot: templateSnapshotPayload,
      ...(status ? { status } : {}),
    };
  };

  // Actions
  const handleSaveDraft = async () => {
    if (hasConflict) {
      return toast.error("Terdapat bentrok jadwal tugas atau cuti aktif untuk personel yang dipilih. Harap sesuaikan tanggal atau personel.");
    }
    const realEmployees = selectedEmployees.filter((e) => !isBuruhEmployee(e));
    if (realEmployees.length === 0) return toast.error("Minimal harus ada satu pegawai yang ditugaskan.");
    if (!getTempatTujuanForPayload()) {
      return toast.error(
        isPlhTemplate ? "Wilayah/tujuan PLH harus diisi." : "Tujuan kegiatan harus diisi."
      );
    }
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");

    const confirmed = await confirm({
      title: "Simpan sebagai draft?",
      description:
        "Surat Tugas akan disimpan ke Inbox sebagai draft dan masih bisa diedit sebelum diterbitkan.",
      confirmText: "Simpan Draft",
      cancelText: "Batal",
      variant: "default",
    });
    if (!confirmed) return;

    try {
      const payload = buildPayload();
      if (mode === "create") {
        await api.post("/surat-tugas", payload);
        toast.success("Draft Surat Tugas berhasil disimpan.");
        router.push("/kepegawaian/surat-tugas/inbox");
      } else if (mode === "edit" && letterId) {
        await api.put(`/surat-tugas/${letterId}`, payload);
        toast.success("Draft berhasil diperbarui!");
        await queryClient.invalidateQueries({ queryKey: ["surat-tugas-detail", letterId] });
        await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      }
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menyimpan draft.";
      if (isAxiosError<{ message?: string; conflicts?: Array<{ message?: string }> }>(err)) {
        if (err.response?.data?.conflicts && err.response.data.conflicts.length > 0) {
          const conflictMsg = err.response.data.conflicts.map((c) => c.message).filter(Boolean).join("\n");
          errorMessage = `Bentrok Jadwal Penugasan:\n${conflictMsg}`;
        } else {
          errorMessage = err.response?.data?.message || errorMessage;
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleApprove = async () => {
    if (hasConflict) {
      return toast.error("Terdapat bentrok jadwal tugas atau cuti aktif untuk personel yang dipilih. Harap sesuaikan tanggal atau personel.");
    }
    if (nomorNumberingType === "st_pattern" && !stNumber) return toast.error("Nomor surat harus diisi.");
    const realEmployees = selectedEmployees.filter((e) => !isBuruhEmployee(e));
    if (realEmployees.length === 0) return toast.error("Minimal harus ada satu pegawai yang ditugaskan.");
    if (!getTempatTujuanForPayload()) {
      return toast.error(
        isPlhTemplate ? "Wilayah/tujuan PLH harus diisi." : "Tujuan kegiatan harus diisi."
      );
    }

    const confirmed = await confirm({
      title: "Terbitkan Surat Tugas?",
      description:
        "Surat Tugas akan langsung diterbitkan dan masuk ke riwayat. Pastikan nomor, personil, tanggal, dan isi dokumen sudah benar.",
      confirmText: "Terbitkan",
      cancelText: "Batal",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      const payload = buildPayload("approved");
      if (mode === "create") {
        await api.post("/surat-tugas", payload);
        toast.success("Surat Tugas berhasil diterbitkan!");
        router.push("/kepegawaian/surat-tugas/inbox");
      } else if (mode === "edit" && letterId) {
        await api.put(`/surat-tugas/${letterId}/approve`, payload);
        toast.success("Surat Tugas berhasil diterbitkan!");
        await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
        await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
        router.push("/kepegawaian/surat-tugas/inbox");
      }
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menerbitkan Surat Tugas.";
      if (isAxiosError<{ message?: string; conflicts?: Array<{ message?: string }> }>(err)) {
        if (err.response?.data?.conflicts && err.response.data.conflicts.length > 0) {
          const conflictMsg = err.response.data.conflicts.map((c) => c.message).filter(Boolean).join("\n");
          errorMessage = `Bentrok Jadwal Penugasan:\n${conflictMsg}`;
        } else {
          errorMessage = err.response?.data?.message || errorMessage;
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleSubmitForApproval = async () => {
    if (hasConflict) {
      return toast.error("Terdapat bentrok jadwal tugas atau cuti aktif untuk personel yang dipilih. Harap sesuaikan tanggal atau personel.");
    }
    if (!letterId) return;
    if (nomorNumberingType === "st_pattern" && !stNumber) {
      return toast.error("Nomor surat harus diisi.");
    }
    const realEmployees = selectedEmployees.filter((e) => !isBuruhEmployee(e));
    if (realEmployees.length === 0) return toast.error("Minimal harus ada satu pegawai yang ditugaskan.");
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");

    try {
      const payload = buildPayload("pending");
      await api.put(`/surat-tugas/${letterId}/approve`, payload);
      toast.success("Surat Tugas berhasil diajukan! Menunggu persetujuan.");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      router.push("/kepegawaian/surat-tugas/inbox");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal mengajukan ST.";
      if (isAxiosError<{ message?: string; conflicts?: Array<{ message?: string }> }>(err)) {
        if (err.response?.data?.conflicts && err.response.data.conflicts.length > 0) {
          const conflictMsg = err.response.data.conflicts.map((c) => c.message).filter(Boolean).join("\n");
          errorMessage = `Bentrok Jadwal Penugasan:\n${conflictMsg}`;
        } else {
          errorMessage = err.response?.data?.message || errorMessage;
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleUpdateNomorSurat = async () => {
    if (!letterId) return;
    if (nomorNumberingType === "st_pattern") {
      if (nomorNumberingType === "st_pattern" && !stNumber) return toast.error("Nomor surat harus diisi.");
      if (!klasifikasi) return toast.error("Klasifikasi harus diisi.");
    }

    try {
      const fullNomorSurat =
        nomorNumberingType === "naskah_auto"
          ? (customNomorNaskah.trim() || "${nomor_naskah}")
          : buildNomorSurat(stNumber, klasifikasi);
      await api.put(`/surat-tugas/${letterId}/nomor`, { nomor_surat: fullNomorSurat });
      toast.success("Nomor surat berhasil diperbarui!");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-detail", letterId] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
    } catch (err: unknown) {
      let errorMessage = "Gagal memperbarui nomor surat.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handlePrint = () => {
    const docNumber = nomorNumberingType === "naskah_auto" ? customNomorNaskah : stNumber;
    printSuratTugas(docNumber, namaKegiatan);
  };

  const displayedNomorFormat = getTemplateNomorFormat()
    .replace(/{bulan}/g, currentMonth)
    .replace(/{tahun}/g, currentYear);
  const [nomorFormatPrefix, nomorFormatSuffix] = displayedNomorFormat.split("{klasifikasi}");

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
          Inisialisasi Builder...
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-slate-100/80 dark:bg-zinc-950 overflow-hidden">
      <aside className="w-120 xl:w-130 shrink-0 bg-slate-50/80 dark:bg-zinc-950/80 border-r border-slate-200/80 dark:border-zinc-800/80 flex flex-col z-10">
        <header className="px-5 py-4 bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/kepegawaian/surat-tugas/inbox"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Inbox</span>
            </Link>
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                isPublished
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800/60"
                  : suratStatus === "pending"
                  ? "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800/60"
                  : "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800/60"
              )}
            >
              {mode === "create"
                ? "ST PLH"
                : isPublished
                ? "Diterbitkan"
                : suratStatus === "pending"
                ? "Menunggu Persetujuan"
                : "Draft"}
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                ST Builder <span className="text-blue-600 dark:text-blue-400">Premium</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {isPublished
                  ? "Mode Pratinjau (Read Only)"
                  : "Penyusunan Naskah & Pengajuan Persetujuan"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide">
          {isPublished && (
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Surat Tugas ini sudah diterbitkan dan bersifat Read Only.</span>
            </div>
          )}

          {/* === Template Card === */}
          <div className="rounded-2xl border border-blue-200/80 bg-white p-4 shadow-2xs dark:border-blue-800/50 dark:bg-zinc-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Template Surat Tugas
              </span>
              <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Format Naskah
              </span>
            </div>
            <select
              value={
                isPlhTemplate
                  ? "plh"
                  : isBmnTemplate
                  ? "bmn-pemeriksaan"
                  : isBedaHariTemplate
                  ? "beda-hari"
                  : (templateType ?? "")
              }
              disabled={isPublished}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100 disabled:opacity-60 cursor-pointer"
            >
              <option value="">Kosong / Manual</option>
              <option value="bmn-pemeriksaan">Penghapusan BMN</option>
              <option value="beda-hari">Beda Hari (Daftar Lampiran)</option>
              <option
                value="plh"
                disabled={!canSelectPlh}
                title={!canSelectPlh ? "Hanya dapat dipilih jika pegawai adalah Kasubbag TU atau Kepala Seksi" : undefined}
              >
                PLH (Pelaksana Harian Kepala Seksi / Kasubbag TU){!canSelectPlh ? " (Perlu Kasubbag TU / Kasi)" : ""}
              </option>
              {dynamicTemplates
                .filter(
                  (t) =>
                    !["bmn", "plh", "beda_hari"].includes(t.type) &&
                    !["bmn-penghapusan", "beda-hari", "plh"].includes(t.code || "")
                )
                .map((t) => (
                  <option key={t.id} value={`db_${t.id}`}>
                    {t.is_default ? `${t.name} (Default DIPA)` : t.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Card Nomor Surat */}
          <FormSection title="Nomor Surat">
            <div className="space-y-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setNomorNumberingType("st_pattern")}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer",
                    nomorNumberingType === "st_pattern"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Pola ST (ST.01/...)
                </button>
                <button
                  type="button"
                  onClick={() => setNomorNumberingType("naskah_auto")}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer",
                    nomorNumberingType === "naskah_auto"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Nomor Naskah (${"{nomor_naskah}"})
                </button>
              </div>

              {nomorNumberingType === "st_pattern" ? (
                <div className="flex items-center gap-2 text-sm font-mono bg-slate-50 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-zinc-700">
                  <span className="text-slate-400 font-bold">ST.</span>
                  <input
                    type="text"
                    placeholder="01"
                    value={stNumber}
                    disabled={isPublished}
                    onChange={(e) => setStNumber(e.target.value)}
                    className="w-16 font-bold bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 text-center outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                  />
                  <span className="text-slate-400 text-xs truncate">{nomorFormatPrefix}</span>
                  <input
                    type="text"
                    value={klasifikasi}
                    disabled={isPublished}
                    onChange={(e) => setKlasifikasi(e.target.value)}
                    className="w-24 font-bold bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 text-center text-xs outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                  />
                  <span className="text-slate-400 text-xs truncate">{nomorFormatSuffix}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-zinc-700">
                    <span className="text-slate-500 dark:text-zinc-400 font-semibold text-xs shrink-0">
                      Nomor :
                    </span>
                    <input
                      type="text"
                      placeholder="${nomor_naskah}"
                      value={customNomorNaskah}
                      disabled={isPublished}
                      onChange={(e) => setCustomNomorNaskah(e.target.value)}
                      className="w-full font-mono text-xs font-semibold bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Masukkan nomor naskah otomatis dari sistem lain. Format pada naskah: <i>Nomor : {customNomorNaskah || "${nomor_naskah}"}</i>
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          {/* Card Menimbang */}
          <FormSection title="Menimbang (Pertimbangan Penugasan)">
            <div className="space-y-4">
              <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 text-[10px] text-slate-600 dark:text-zinc-300 space-y-1 leading-relaxed">
                <p>
                  <b className="text-blue-800 dark:text-blue-200">Konsiderans Menimbang (Huruf a, b, dst.):</b>{" "}
                  Diambil dari <b>Template ST</b> yang dipilih. Klik chip placeholder untuk menyisipkan variabel ke poin yang sedang diedit, atau tekan{" "}
                  <code className="px-1 py-0.5 rounded bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 font-mono">Ctrl+I</code>{" "}
                  (atau tombol <b>Miringkan</b>) untuk cetak miring.
                </p>
              </div>
              <EditableItemListSection
                title="Daftar Poin Menimbang (Huruf a, b, dst.)"
                items={menimbangItems}
                onChange={setMenimbangItems}
                marker="letter"
                disabled={isPublished}
                placeholderChips={[
                  { token: "{nama kegiatan}", label: "Nama Kegiatan / Perihal" },
                  { token: "{tahun}", label: "Tahun Anggaran" },
                  ...(isPlhTemplate
                    ? [
                        { token: "{pejabat}", label: "Jabatan Pejabat Definitif (PLH)" },
                        { token: "{wilayah}", label: "Wilayah Kerja (PLH)" },
                        { token: "{kegiatan_kasi}", label: "Kegiatan Pejabat Definitif (PLH)" },
                      ]
                    : []),
                ]}
              />
            </div>
          </FormSection>

          {/* Card Dasar Hukum */}
          <FormSection title="Dasar Hukum & Anggaran">
            <div className="space-y-4">
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[10px] text-slate-600 dark:text-zinc-300 space-y-1 leading-relaxed">
                <p>
                  <b className="text-amber-800 dark:text-amber-200">Urutan Otomatis 3 Lapis Dasar Hukum:</b>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">1. Template ST (Atas)</span> →{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">2. Tambahan Manual Builder (Tengah)</span> →{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">3. Template Biaya (Bawah)</span>.
                </p>
                <p>
                  <b className="text-amber-800 dark:text-amber-200">Tips Format:</b> Blok kata lalu tekan{" "}
                  <code className="px-1 py-0.5 rounded bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 font-mono">Ctrl+I</code>{" "}
                  (atau tombol <b>Miringkan</b>) untuk cetak miring istilah asing (contoh: <i>*Result Based Contribution*</i>).
                </p>
              </div>
              <EditableItemListSection
                title="Daftar Poin Dasar Hukum (Angka 1, 2, dst.)"
                items={dasarItems}
                onChange={(nextItems) => setDasarItems(orderDasarLayers(nextItems))}
                onAddItem={handleAddDasarItem}
                placeholderChips={[
                  { token: "{tahun}", label: "Tahun Anggaran" },
                  ...(isPlhTemplate
                    ? [
                        { token: "{nomor_st_induk}", label: "Nomor ST Induk (PLH)" },
                        { token: "{tanggal_st_induk}", label: "Tanggal ST Induk (PLH)" },
                        { token: "{perihal_st_induk}", label: "Perihal ST Induk (PLH)" },
                      ]
                    : []),
                ]}
                getItemBadge={(item) => {
                  if (item.id === "funding-dasar" || isFundingDasarText(item.text, expenseTemplates)) {
                    return (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md w-fit">
                        <span>3. Template Biaya & Sumber Dana (Selalu Paling Bawah)</span>
                      </div>
                    );
                  }
                  if (String(item.id).startsWith("manual-dasar-")) {
                    return (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md w-fit">
                        <span>2. Tambahan Manual Builder (Di Bawah Template ST & Di Atas Biaya)</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md w-fit">
                      <span>1. Bawaan Template ST (Paling Atas)</span>
                    </div>
                  );
                }}
                marker="number"
                disabled={isPublished}
              />
            </div>
          </FormSection>

          {/* Pegawai Section */}
          <FormSection title="Pegawai Ditugaskan">
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama atau NIP pegawai..."
                  value={searchQuery}
                  disabled={isPublished}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                />
                {showDropdown && searchQuery && searchResults.length > 0 && !isPublished && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg"
                  >
                    {searchResults.map((emp: Employee) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          if (!selectedEmployees.some((e: Employee) => e.id === emp.id)) {
                            setSelectedEmployees((prev) => [
                              ...prev,
                              normalizeEmployeeForSelection(emp),
                            ]);
                            if (isBedaHariTemplate) {
                              setEmployeeDates((prev) => ({
                                ...prev,
                                [String(emp.id)]: {
                                  mulai: tanggalMulai || new Date().toISOString().substring(0, 10),
                                  selesai: tanggalSelesai || new Date().toISOString().substring(0, 10),
                                },
                              }));
                            }
                          }
                          setSearchQuery("");
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 last:border-0"
                      >
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {emp.nama_lengkap || emp.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {emp.nip ? `${formatNipLabel(emp, true)} ${emp.nip}` : "Non-NIP"} • {emp.jabatan || "-"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Judul Lampiran & Opsi Kolom Tempat Keberangkatan (Beda Hari) */}
              {isBedaHariTemplate && (
                <div className="space-y-2 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/50">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Judul Lampiran Beda Hari
                    </label>
                    <input
                      type="text"
                      value={judulLampiranBedaHari}
                      disabled={isPublished}
                      onChange={(e) => setJudulLampiranBedaHari(e.target.value)}
                      placeholder="DAFTAR PEGAWAI MENGIKUTI PATROLI"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                    />
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Judul tabel lampiran untuk jadwal masing-masing personel.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                        Sertakan Kolom Tempat Keberangkatan?
                      </p>
                      <p className="text-[10px] text-blue-700/90 dark:text-blue-400/90 leading-tight">
                        Tampilkan kolom Tempat Keberangkatan pada tabel lampiran Halaman 2.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPublished}
                      onClick={() => setShowDepartureColumn((prev) => !prev)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                        showDepartureColumn ? "bg-blue-600" : "bg-slate-300 dark:bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                          showDepartureColumn ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Buruh / Tenaga Lapangan (PM) Card */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Buruh / Tenaga Lapangan (PM)
                    </p>
                    <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                      Tambahkan buruh jika diperlukan (format Nama: <b>PM</b>, Jabatan: <b>-</b>).
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPublished}
                    onClick={() => handleToggleBuruh(!hasBuruh)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                      hasBuruh ? "bg-emerald-600" : "bg-slate-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        hasBuruh ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {hasBuruh && (
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                      Jumlah Buruh:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isPublished || jumlahBuruh <= 1}
                        onClick={() => handleBuruhCountChange(jumlahBuruh - 1)}
                        className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        disabled={isPublished}
                        value={jumlahBuruh}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleBuruhCountChange(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                        }}
                        className="w-12 px-1 py-1 text-center bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded-md text-xs font-bold text-slate-800 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        disabled={isPublished || jumlahBuruh >= 100}
                        onClick={() => handleBuruhCountChange(jumlahBuruh + 1)}
                        className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        +
                      </button>
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 ml-1">orang</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Employees Table */}
              <div className="space-y-2">
                {selectedEmployees.map((emp, index) => {
                  const empKey = String(emp.id);
                  const curDates = employeeDates[empKey] || employeeDates[emp.id] || {
                    mulai: tanggalMulai || "",
                    selesai: tanggalSelesai || "",
                  };

                  return (
                    <div
                      key={emp.id}
                      className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {index + 1}. {emp.nama_lengkap || emp.name} {isBuruhEmployee(emp) ? "(Buruh Lapangan)" : ""}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {isBuruhEmployee(emp)
                              ? "Tenaga Lapangan / Buruh • Jabatan: -"
                              : `${emp.nip ? `${formatNipLabel(emp, true)} ${emp.nip} • ` : ""}${emp.jabatan || emp.position || "-"}`}
                          </p>
                        </div>
                        {!isPublished && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployees((prev) => {
                                const next = prev.filter((e) => e.id !== emp.id);
                                const remainingBuruh = extractBuruhCount(next);
                                setJumlahBuruh(remainingBuruh);
                                setHasBuruh(remainingBuruh > 0);
                                return next;
                              });
                              setEmployeeDates((prev) => {
                                const next = { ...prev };
                                delete next[empKey];
                                delete next[emp.id];
                                return next;
                              });
                            }}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg transition-colors shrink-0"
                            title="Hapus Pegawai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {isBedaHariTemplate && (
                        <div className={cn("pt-2 border-t border-slate-200/70 dark:border-zinc-700/70 grid gap-2", showDepartureColumn ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")}>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-blue-500" />
                              Tgl Mulai
                            </label>
                            <input
                              type="date"
                              value={curDates.mulai || ""}
                              disabled={isPublished}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEmployeeDates((prev) => ({
                                  ...prev,
                                  [empKey]: {
                                    mulai: val,
                                    selesai: curDates.selesai || val,
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-blue-500" />
                              Tgl Selesai
                            </label>
                            <input
                              type="date"
                              value={curDates.selesai || ""}
                              disabled={isPublished}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEmployeeDates((prev) => ({
                                  ...prev,
                                  [empKey]: {
                                    mulai: curDates.mulai || val,
                                    selesai: val,
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                            />
                          </div>
                          {showDepartureColumn && (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                                Keberangkatan
                              </label>
                              <input
                                type="text"
                                list="builder-keberangkatan-suggestions"
                                value={employeeDepartures[empKey] || employeeDepartures[emp.id] || getEmployeeCity(emp) || kotaAsal || "Samarinda"}
                                disabled={isPublished}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEmployeeDepartures((prev) => ({
                                    ...prev,
                                    [empKey]: val,
                                  }));
                                }}
                                placeholder="Kota Asal"
                                className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Alert Real-time Bentrok Jadwal Penugasan / Cuti */}
              {conflicts.length > 0 && (
                <div className="pt-2">
                  <ScheduleConflictBanner conflicts={conflicts} />
                </div>
              )}
            </div>
          </FormSection>

          {/* Untuk (Diktum Penugasan, Biaya & Laporan) */}
          <FormSection title="Untuk (Diktum Penugasan, Biaya & Laporan)">
            <div className="space-y-4">
              {/* Info Alur Urutan Untuk */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 text-[10px] text-slate-600 dark:text-zinc-400 space-y-1 leading-relaxed">
                <p>
                  <b className="text-slate-800 dark:text-zinc-200">Urutan Otomatis Bagian Untuk:</b>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">1. Tugas Utama & Waktu (Selalu #1)</span> →{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">2..k. Butir Tambahan Untuk</span> →{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Biaya (Turun di Bawah Tambahan)</span> →{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">Laporan (Selalu Terakhir)</span>.
                </p>
              </div>

              {/* BLOK 1: BUTIR 1 (TUGAS UTAMA & WAKTU) */}
              <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/15 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-900/40">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                      Butir 1 (Selalu Nomor 1)
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 mt-1">
                      Tugas Utama, Lokasi & Waktu Pelaksanaan
                    </p>
                  </div>
                </div>

                {/* Mode Switcher: Terstruktur vs Tulis Manual */}
                {!isPlhTemplate && !isBmnTemplate && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Mode Input Butir 1
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-[11px] font-medium">
                      <button
                        type="button"
                        disabled={isPublished}
                        onClick={() => setInputModeKegiatan("structured")}
                        className={cn(
                          "py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer disabled:opacity-60",
                          inputModeKegiatan === "structured"
                            ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                            : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                      >
                        Terstruktur (Jenis Tugas)
                      </button>
                      <button
                        type="button"
                        disabled={isPublished}
                        onClick={() => {
                          setInputModeKegiatan("manual");
                          if (
                            !namaKegiatan.trim() &&
                            selectedDynamicTemplate?.configuration?.default_kegiatan
                          ) {
                            setNamaKegiatan(selectedDynamicTemplate.configuration.default_kegiatan);
                          }
                        }}
                        className={cn(
                          "py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer disabled:opacity-60",
                          inputModeKegiatan === "manual"
                            ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                            : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                      >
                        Tulis Manual (Uraian + Waktu)
                      </button>
                    </div>
                  </div>
                )}

                {/* Pilih Jenis Tugas hanya tampil jika mode = structured dan bukan PLH */}
                {inputModeKegiatan === "structured" && !isPlhTemplate && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Jenis Tugas (Terkoneksi dari Pengaturan)
                    </label>
                    <select
                      value={normalizeTaskTypeName(activityPrefix)}
                      disabled={isPublished}
                      onChange={(e) => {
                        const val = e.target.value;
                        const normalized = normalizeTaskTypeName(val);
                        setActivityPrefix(normalized);
                        setInputModeKegiatan("structured");
                        const matched = taskTypes.find((t) => t.nama === normalized);
                        if (matched) {
                          setTaskTypeId(matched.id);
                          if (matched.mode_lokasi === "tempat_saja" || matched.mode_lokasi === "dalam_kawasan") {
                            setKotaAsal("");
                          } else if (!kotaAsal) {
                            setKotaAsal("Samarinda");
                          }
                          if (matched.aturan_durasi === "wajib_1_hari" && tanggalMulai) {
                            setTanggalSelesai(tanggalMulai);
                          }
                        } else {
                          if (normalized.includes("1 Hari") || normalized.includes("Menugaskan Staf") || isDalamKawasanTask(normalized)) {
                            setKotaAsal("");
                          } else if (!kotaAsal) {
                            setKotaAsal("Samarinda");
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-semibold cursor-pointer"
                    >
                      {taskTypes.length > 0 ? (
                        taskTypes.map((tt) => (
                          <option key={tt.id} value={tt.nama}>
                            {tt.nama}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Perjalanan Dinas Luar Wilayah">
                            Perjalanan Dinas Luar Wilayah (Dari - Ke)
                          </option>
                          <option value="Perjalanan Dinas Dalam Kawasan / Wilayah">
                            Perjalanan Dinas Dalam Kawasan / Wilayah
                          </option>
                          <option value="Melaksanakan Kegiatan (1 Hari)">
                            Melaksanakan Kegiatan (1 Hari)
                          </option>
                          <option value="Menugaskan Staf">Menugaskan Staf</option>
                        </>
                      )}
                      {taskTypes.length > 0 &&
                        !taskTypes.some((tt) => tt.nama === normalizeTaskTypeName(activityPrefix)) && (
                          <option value={activityPrefix}>{activityPrefix}</option>
                        )}
                    </select>
                  </div>
                )}

                {inputModeKegiatan === "structured" &&
                  !isPlhTemplate &&
                  isJenisKegiatanTask(activityPrefix, activeBuilderTaskType?.contoh_format) && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Untuk ( Jenis Kegiatan / Tugas ) *
                      </label>
                      <input
                        type="text"
                        value={untukKegiatanText}
                        disabled={isPublished}
                        onChange={(e) => setUntukKegiatanText(e.target.value)}
                        placeholder="Contoh: Pemeriksaan Pekerjaan / Pengawasan Pekerjaan Konstruksi"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                      <p className="text-[10px] text-slate-400">
                        Mengisi bagian <code>{"untuk {untuk} dalam rangka {kegiatan}"}</code> pada kalimat Butir 1.
                      </p>
                    </div>
                  )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-300 uppercase">
                      {isPlhTemplate || inputModeKegiatan === "manual"
                        ? "Uraian Tugas Utama (Butir 1) *"
                        : isJenisKegiatanTask(activityPrefix, activeBuilderTaskType?.contoh_format)
                        ? "Dalam Rangka ( Paket Kontrak / Pekerjaan ) *"
                        : activityPrefix.includes("Melaksanakan Kegiatan") || activityPrefix.includes("Menugaskan Staf")
                        ? "Nama Kegiatan / Tugas *"
                        : "Maksud / Dalam Rangka Kegiatan *"}
                    </label>
                    {!isPublished && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (namaKegiatanRef.current) {
                            toggleItalicInTextarea(
                              namaKegiatanRef.current,
                              namaKegiatan,
                              handleNamaKegiatanChange
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                      >
                        <Italic className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-serif italic font-bold">Miringkan (*I*)</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    ref={namaKegiatanRef}
                    rows={3}
                    value={namaKegiatan}
                    disabled={isPublished}
                    onChange={(e) => handleNamaKegiatanChange(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                        e.preventDefault();
                        if (namaKegiatanRef.current) {
                          toggleItalicInTextarea(
                            namaKegiatanRef.current,
                            namaKegiatan,
                            handleNamaKegiatanChange
                          );
                        }
                      }
                    }}
                    placeholder={
                      isPlhTemplate || inputModeKegiatan === "manual"
                        ? "Contoh: Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah}"
                        : isJenisKegiatanTask(activityPrefix, activeBuilderTaskType?.contoh_format)
                        ? "Contoh: Pengelolaan Kontrak Pekerjaan Konstruksi Pembangunan Sarana dan Prasarana di Suaka Badak Kelian"
                        : "Contoh: Melakukan koordinasi teknis..."
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                  />

                  {(isPlhTemplate || inputModeKegiatan === "manual") && !isPublished && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                          Sisipkan Placeholder:
                        </span>
                        {[
                          { token: "{wilayah}", label: "+ {wilayah}" },
                          { token: "{pejabat}", label: "+ {pejabat}" },
                          { token: "{tahun}", label: "+ {tahun}" },
                        ].map((chip) => (
                          <button
                            key={chip.token}
                            type="button"
                            onClick={() =>
                              handleNamaKegiatanChange(
                                `${namaKegiatan}${namaKegiatan && !namaKegiatan.endsWith(" ") ? " " : ""}${chip.token}`
                              )
                            }
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                        <b>Mode Tulis Manual:</b> Uraian di atas langsung menjadi kalimat utama Butir 1, dan keterangan waktu{" "}
                        <i>&quot;, selama X (...) hari terhitung mulai tanggal ... sampai dengan ...;&quot;</i> tetap ditambahkan otomatis di ujung kalimat.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tanggal Mulai & Selesai */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={tanggalMulai}
                      disabled={isPublished}
                      onChange={(e) => {
                        setTanggalMulai(e.target.value);
                        if (
                          inputModeKegiatan === "structured" &&
                          (activeBuilderTaskType?.aturan_durasi === "wajib_1_hari" ||
                            activityPrefix.includes("Melaksanakan Kegiatan"))
                        ) {
                          setTanggalSelesai(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={tanggalSelesai}
                      disabled={
                        isPublished ||
                        (inputModeKegiatan === "structured" &&
                          (activeBuilderTaskType?.aturan_durasi === "wajib_1_hari" ||
                            activityPrefix.includes("Melaksanakan Kegiatan")))
                      }
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                </div>

                {isBedaHariTemplate && (
                  <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-900/40 text-[10px] text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Info:</span> Pada template Beda Hari, rentang tanggal utama surat tugas otomatis disesuaikan dengan rentang tanggal keseluruhan (paling awal s/d paling akhir) dari daftar pegawai saat disimpan.
                  </div>
                )}

                {/* Input Lokasi Berdasarkan Mode */}
                {isPlhTemplate ? (
                  <div className="space-y-3 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                          Konfigurasi Pelaksana Harian (PLH)
                        </span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                        Pejabat Struktural
                      </span>
                    </div>

                    {/* Selector Pejabat Struktural yang Digantikan */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                        Pejabat Struktural yang Digantikan *
                      </label>
                      <select
                        value={plhTargetRole}
                        disabled={isPublished}
                        onChange={(e) => handlePlhTargetRoleChange(e.target.value as PlhTargetRole)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-amber-300/80 dark:border-amber-800 rounded-xl text-xs font-medium outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 cursor-pointer"
                      >
                        {PLH_TARGET_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                        {plhTargetRole === "kasubbag_tu"
                          ? "Diktum menimbang & untuk disesuaikan otomatis untuk Kepala Subbagian Tata Usaha (Samarinda)."
                          : `Diktum menimbang & untuk disesuaikan otomatis untuk ${getPlhTargetOption(plhTargetRole).shortLabel}.`}
                      </p>
                    </div>

                    {/* Input Kegiatan Pejabat yang Digantikan */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                        Kegiatan Pejabat yang Digantikan (Menimbang a) *
                      </label>
                      <input
                        type="text"
                        value={plhKegiatanKasi}
                        disabled={isPublished}
                        onChange={(e) => handlePlhKegiatanChange(e.target.value)}
                        placeholder={
                          plhTargetRole === "kasubbag_tu"
                            ? "Contoh: Melaksanakan rapat koordinasi kepegawaian di Jakarta"
                            : "Contoh: Melaksanakan patroli pengamanan kawasan hutan"
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-amber-300/80 dark:border-amber-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60"
                      />
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                        Otomatis mengisi butir Menimbang: &quot;bahwa {getPlhTargetOption(plhTargetRole).label} akan [kegiatan]...&quot;
                      </p>
                    </div>

                    {/* Referensi Surat Tugas Induk */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                          Nomor ST Induk (Dasar 1)
                        </label>
                        <input
                          type="text"
                          value={parentStInfo.nomorInduk || ""}
                          disabled={isPublished}
                          onChange={(e) => handleParentStInfoChange("nomor", e.target.value)}
                          placeholder="Contoh: ST.01/K.18/TU/..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                          Tanggal ST Induk (Dasar 1)
                        </label>
                        <input
                          type="text"
                          value={parentStInfo.tanggalInduk || ""}
                          disabled={isPublished}
                          onChange={(e) => handleParentStInfoChange("tanggal", e.target.value)}
                          placeholder="Contoh: 28 Oktober 2026"
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* Lokasi Penugasan PLH */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                          Pada ( Tempat / Unit Lokasi )
                        </label>
                        <input
                          type="text"
                          value={tempatKegiatan}
                          disabled={isPublished}
                          onChange={(e) => setTempatKegiatan(e.target.value)}
                          placeholder="Contoh: Kantor Balai KSDA Kalimantan Timur"
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                          Di ( Kota / Wilayah )
                        </label>
                        <input
                          type="text"
                          value={kotaTujuan}
                          disabled={isPublished}
                          onChange={(e) => setKotaTujuan(e.target.value)}
                          placeholder="Contoh: Samarinda"
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                ) : inputModeKegiatan === "manual" ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Wilayah / Kota Tujuan (Untuk Metadata & {"{wilayah}"})
                      </label>
                      <input
                        type="text"
                        value={kotaTujuan}
                        disabled={isPublished}
                        onChange={(e) => setKotaTujuan(e.target.value)}
                        placeholder="Contoh: Wilayah I Berau / Samarinda"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Tempat / Unit Lokasi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={tempatKegiatan}
                        disabled={isPublished}
                        onChange={(e) => setTempatKegiatan(e.target.value)}
                        placeholder="Contoh: Seksi Konservasi Wilayah I"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </div>
                ) : (activeBuilderTaskType?.mode_lokasi === "dalam_kawasan" ||
                    isDalamKawasanTask(activityPrefix)) ? (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Di ( Kota / Kabupaten Wilayah Penugasan )
                      </label>
                      <input
                        type="text"
                        value={kotaTujuan}
                        disabled={isPublished}
                        onChange={(e) => setKotaTujuan(e.target.value)}
                        placeholder="Contoh: Kabupaten Paser"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Di ( Kawasan / Lokasi Spesifik )
                      </label>
                      <input
                        type="text"
                        value={tempatKegiatan}
                        disabled={isPublished}
                        onChange={(e) => setTempatKegiatan(e.target.value)}
                        placeholder="Contoh: Cagar Alam Teluk Adang"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </div>
                ) : (activeBuilderTaskType?.mode_lokasi === "tempat_saja" ||
                    activityPrefix.includes("Melaksanakan Kegiatan") ||
                    activityPrefix.includes("Menugaskan Staf")) ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Pada ( Tempat / Unit Lokasi )
                      </label>
                      <input
                        type="text"
                        value={tempatKegiatan}
                        disabled={isPublished}
                        onChange={(e) => setTempatKegiatan(e.target.value)}
                        placeholder="Contoh: Kantor Balai / Tempat Kegiatan"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Di ( Kota / Kabupaten )
                      </label>
                      <input
                        type="text"
                        value={kotaTujuan}
                        disabled={isPublished}
                        onChange={(e) => setKotaTujuan(e.target.value)}
                        placeholder="Contoh: Samarinda"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Kota Asal</label>
                        <input
                          type="text"
                          value={kotaAsal}
                          disabled={isPublished}
                          onChange={(e) => setKotaAsal(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">
                          Kota Tujuan
                        </label>
                        <input
                          type="text"
                          value={kotaTujuan}
                          disabled={isPublished}
                          onChange={(e) => setKotaTujuan(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Tempat / Lokasi Spesifik
                      </label>
                      <input
                        type="text"
                        value={tempatKegiatan}
                        disabled={isPublished}
                        onChange={(e) => setTempatKegiatan(e.target.value)}
                        placeholder="Contoh: Suaka Badak Kelian Kabupaten Kutai Barat"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </>
                )}

                {/* Pratinjau Hasil Kalimat Butir 1 */}
                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-blue-200/70 dark:border-blue-900/50 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    Pratinjau Kalimat Untuk — Butir 1:
                  </span>
                  <p className="text-[11px] font-serif text-slate-800 dark:text-zinc-200 leading-relaxed">
                    <b className="mr-1.5">1.</b>
                    {renderFormattedItalic(buildUntukText())}
                  </p>
                </div>
              </div>

              {/* BLOK 2: BUTIR TAMBAHAN UNTUK (2, 3, DST. — DI ATAS BIAYA) */}
              <EditableItemListSection
                title="Butir Tambahan Untuk (Butir 2 dst.)"
                description={
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Butir bawaan dari Template ST atau yang Anda tambahkan manual di sini otomatis menempati{" "}
                    <b className="text-slate-700 dark:text-zinc-200">Nomor 2, 3, dst.</b> dan menggeser posisi{" "}
                    <b className="text-amber-700 dark:text-amber-300">Biaya</b> ke bawahnya.
                  </p>
                }
                items={untukItems}
                onChange={setUntukItems}
                marker="number"
                startIndex={1}
                getItemBadge={(_item, idx) => (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md w-fit">
                    <span>Butir {idx + 2} (Di Bawah Butir 1 & Di Atas Biaya)</span>
                  </div>
                )}
                disabled={isPublished}
              />

              {/* BLOK 3: PEMBEBANAN BIAYA & SUMBER DANA */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                      Pembebanan Biaya & Sumber Dana
                    </label>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                    {buildBiayaText()
                      ? `Otomatis Butir ${2 + untukItems.filter((i) => i.text.trim()).length}`
                      : "Tanpa Butir Biaya"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Selalu berada di bawah Butir 1 (atau otomatis turun ke bawah Butir Tambahan Untuk jika ada), serta menyisipkan Dasar Anggaran di urutan paling bawah bagian <b>Dasar</b>.
                </p>
                <select
                  value={sumberDana}
                  disabled={isPublished}
                  onChange={(e) => handleSumberDanaChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold outline-none text-zinc-900 dark:text-white disabled:opacity-60 cursor-pointer"
                >
                  {availableSumberDanaOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {sumberDana === "other" && (
                  <input
                    type="text"
                    value={sumberDanaOther}
                    disabled={isPublished}
                    onChange={(e) => setSumberDanaOther(e.target.value)}
                    placeholder="Sebutkan pembebanan anggaran..."
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                  />
                )}
                {buildBiayaText() && (
                  <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-amber-200/70 dark:border-amber-900/50 text-[11px] font-serif text-slate-700 dark:text-zinc-300 leading-relaxed">
                    <b className="mr-1.5">{2 + untukItems.filter((i) => i.text.trim()).length}.</b>
                    {renderFormattedItalic(buildBiayaText())}
                  </div>
                )}
              </div>

              {/* BLOK 4: KEWAJIBAN MEMBUAT LAPORAN TERTULIS (SELALU TERAKHIR) */}
              <div className="p-3.5 bg-purple-50/35 dark:bg-purple-950/15 rounded-xl border border-purple-200/80 dark:border-purple-900/50 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="builder_chk_laporan"
                        className="text-xs font-bold text-slate-800 dark:text-zinc-200 block cursor-pointer"
                      >
                        Kewajiban Membuat Laporan Tertulis
                      </label>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                        {sertakanLaporan
                          ? `Butir Terakhir (#${
                              2 +
                              untukItems.filter((i) => i.text.trim()).length +
                              (buildBiayaText() ? 1 : 0)
                            })`
                          : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Selalu ditempatkan pada urutan paling terakhir di bagian Untuk.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="builder_chk_laporan"
                    disabled={isPublished}
                    checked={sertakanLaporan}
                    onChange={(e) => setSertakanLaporan(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                {sertakanLaporan && (
                  <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-purple-200/70 dark:border-purple-900/50 text-[11px] font-serif text-slate-700 dark:text-zinc-300 leading-relaxed">
                    <b className="mr-1.5">
                      {2 +
                        untukItems.filter((i) => i.text.trim()).length +
                        (buildBiayaText() ? 1 : 0)}
                      .
                    </b>
                    {DEFAULT_LAPORAN_TEXT}
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* Kaki Surat */}
          <FormSection title="Kaki Surat & Tanggal">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kota Surat</label>
                <input
                  value={kotaSurat}
                  disabled={isPublished}
                  onChange={(e) => setKotaSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Tanggal Surat
                </label>
                <input
                  type="date"
                  value={tanggalSurat}
                  disabled={isPublished}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                />
              </div>
            </div>
          </FormSection>

          <PenandatanganSection
            kepalaBalai={kepalaBalai}
            setKepalaBalai={setKepalaBalai}
            allEmployees={allEmployees}
            isLoading={isSearching}
            disabled={isPublished}
          />

          <TembusanSection
            items={tembusanItems}
            onChange={setTembusanItems}
            disabled={isPublished}
          />
        </div>

        {/* Footer Actions */}
        <footer className="p-4 border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0 space-y-2.5">
          {conflicts.length > 0 && (
            <div className="pb-1">
              <ScheduleConflictBanner conflicts={conflicts} />
            </div>
          )}
          {mode === "create" ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  disabled={hasConflict}
                  className="w-full h-10 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Simpan Draft
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="w-full h-10 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Preview Cetak
                </Button>
              </div>
              <Button
                onClick={handleApprove}
                disabled={hasConflict}
                className={cn(
                  "w-full h-11 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  hasConflict
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                )}
              >
                <CheckCircle className="w-4 h-4 mr-2" />{" "}
                {hasConflict ? "Jadwal Bentrok — Perbaiki Tanggal / Personel" : "Terbitkan & Cetak"}
              </Button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {!isPublished ? (
                  <Button
                    onClick={handleSaveDraft}
                    variant="outline"
                    disabled={hasConflict}
                    className="w-full h-10 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4 mr-1.5" /> Simpan Draft
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpdateNomorSurat}
                    variant="outline"
                    disabled={!canWrite}
                    className="w-full h-10 rounded-xl font-bold text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-1.5" /> Simpan Nomor
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="w-full h-10 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Preview Cetak
                </Button>
              </div>

              {isPublished ? (
                <Button
                  disabled
                  className="w-full h-11 bg-emerald-600 text-white rounded-xl font-bold text-xs opacity-90 cursor-not-allowed flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Sudah Diterbitkan
                </Button>
              ) : suratStatus === "approved" || suratStatus === "completed" ? (
                <Button
                  disabled
                  className="w-full h-11 bg-emerald-500 text-white rounded-xl font-bold text-xs opacity-80 cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" /> Sudah Disetujui
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitForApproval}
                  disabled={hasConflict}
                  className={cn(
                    "w-full h-11 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    hasConflict
                      ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                      : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  )}
                >
                  <Send className="w-4 h-4 mr-2" />{" "}
                  {hasConflict
                    ? "Jadwal Bentrok — Perbaiki Tanggal / Personel"
                    : suratStatus === "pending"
                    ? "Perbarui & Ajukan"
                    : "Ajukan Persetujuan"}
                </Button>
              )}
            </>
          )}
        </footer>
      </aside>

      {/* Main Preview Panel */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center bg-slate-200/60 dark:bg-zinc-950">
        {/* Sticky Top Preview Toolbar */}
        <div className="sticky top-0 z-10 w-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-bold text-slate-700 dark:text-zinc-200">
              Pratinjau Dokumen A4
            </span>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/50">
              {nomorNumberingType === "naskah_auto"
                ? customNomorNaskah || "${nomor_naskah}"
                : `ST.${stNumber || "..."} / K.18/TU/${klasifikasi || "..."}/B`}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>

        <div className="py-8 px-6">
          <div
            id="surat-preview-doc"
            className="w-[210mm] bg-white shadow-xl rounded-xs selection:bg-blue-100"
            style={{
              padding: "0.4cm 0 1.5cm 0",
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
              stNumber={stNumber}
              stCode={klasifikasi ? `K.18/TU/${klasifikasi}/B` : ""}
              currentMonth={currentMonth}
              currentYear={currentYear}
              menimbangItems={getPreviewMenimbangItems()}
              dasarItems={getPreviewDasarItems()}
              untukItems={untukItems}
              selectedEmployees={selectedEmployees}
              buildUntukText={buildUntukText}
              buildBiayaText={buildBiayaText}
              kotaSurat={kotaSurat}
              tanggalSurat={tanggalSurat}
              kepalaBalai={kepalaBalai}
              tembusanItems={tembusanItems}
              headerTitle={headerTitle}
              penutupText={penutupText}
              dateFormatStyle={dateFormatStyle}
              signerAuthorityMandate={signerAuthorityMandate}
              signerTitle={signerTitle}
              tembusanPosition={tembusanPosition}
              tembusanLabel={tembusanLabel}
              kopImageUrl={kopImageUrl}
              templateType={templateType}
              employeeDates={employeeDates}
              employeeDepartures={employeeDepartures}
              showDepartureColumn={isBedaHariTemplate && showDepartureColumn}
              defaultTanggalMulai={tanggalMulai}
              defaultTanggalSelesai={tanggalSelesai}
              judulLampiranBedaHari={judulLampiranBedaHari}
              sumberDana={sumberDana}
              nomorNumberingType={nomorNumberingType}
              customNomorNaskah={customNomorNaskah}
              sertakanLaporan={sertakanLaporan}
            />
          </div>
        </div>
      </main>

      <datalist id="builder-keberangkatan-suggestions">
        <option value="Samarinda" />
        <option value="Balikpapan" />
        <option value="Tenggarong" />
        <option value="Berau" />
      </datalist>
    </div>
  );
}
export default SuratTugasForm;

