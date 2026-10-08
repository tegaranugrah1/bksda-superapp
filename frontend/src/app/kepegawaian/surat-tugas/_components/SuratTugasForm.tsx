"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  Printer,
  Search,
  Loader2,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Send,
  Shield,
  Eye,
  GripVertical,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { isAxiosError } from "axios";
import STBuilderPreview from "./STBuilderPreview";
import { cleanMelaksanakanKegiatanPrefix, cleanRepeatingLocations } from "../_lib/activity-helpers";
import {
  formatDateIndonesian,
  formatDateRangeIndonesian,
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
  formatPlhKegiatanForTemplate,
  replacePlhAllPlaceholders,
  getDefaultUntukItems,
  isGeneratedBiayaItem,
  isSingleDayActivityPrefix,
  normalizeSumberDana,
  shouldRenderAsSingleDayActivity,
  splitStoredUntukItems,
  toDasarItems,
  normalizeEmployeeForSelection,
  printSuratTugas,
  type DasarItem,
  type Employee,
  type StTemplate,
  type StExpenseTemplate,
} from "../_lib";
import { FormSection } from "./FormSection";
import { EditableItemListSection } from "./EditableItemListSection";
import { TembusanSection } from "./TembusanSection";
import { PenandatanganSection } from "./PenandatanganSection";

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
      id: "2",
      text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 24 April 2026.`,
    },
  ]);
  const [untukItems, setUntukItems] = useState<DasarItem[]>(getDefaultUntukItems(null));

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

  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState(
    "Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )"
  );
  const [inputModeKegiatan, setInputModeKegiatan] = useState<"structured" | "manual">("structured");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [plhWilayah, setPlhWilayah] = useState("");
  const [plhKegiatanKasi, setPlhKegiatanKasi] = useState("");
  const [parentStInfo, setParentStInfo] = useState<{
    nomorInduk?: string | null;
    tanggalInduk?: string | null;
  }>({});
  const [pendingPlhEmployeeName, setPendingPlhEmployeeName] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

  // Template PLH hanya boleh dipilih jika pegawai yang ditugaskan mencakup Kasubbag TU atau Kepala Seksi (atau surat ini sudah berjenis PLH)
  const canSelectPlh = useMemo(() => {
    if (isPlhTemplate) return true;
    return selectedEmployees.some((emp) => {
      const pos = (emp.jabatan || emp.position || "").toLowerCase();
      return (
        pos.includes("kepala seksi") ||
        pos.includes("kepala subbagian") ||
        pos.includes("kasubag")
      );
    });
  }, [selectedEmployees, isPlhTemplate]);

  // Beda Hari template: tanggal per pegawai
  const [employeeDates, setEmployeeDates] = useState<
    Record<string, { mulai: string; selesai: string }>
  >({});
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

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Status & Edit Builder Specific States
  const [isInitializing, setIsInitializing] = useState(mode === "edit");
  const [suratStatus, setSuratStatus] = useState<string>("");
  const [draggedUntukIndex, setDraggedUntukIndex] = useState<number | null>(null);

  const isSingleDayActivity = isSingleDayActivityPrefix(activityPrefix);
  const isPublished = ["diterbitkan", "approved", "completed", "published"].includes(
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
      const res = await api.get("/kepegawaian/employees/select");
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

  // Helper formatting items
  const formatYearInItems = (items: DasarItem[]) =>
    (items || []).map((item) => ({
      ...item,
      text: (item.text || "").replace(/{tahun}/g, currentYear),
    }));

  const fetchDynamicTemplates = async (selectDefault = false) => {
    try {
      const res = await api.get("/kepegawaian/st-templates");
      const templates: StTemplate[] = res.data?.data || [];
      setDynamicTemplates(templates);
      if (selectDefault && mode === "create") {
        const defaultTemplate = templates.find((template) => template.is_default);
        if (!templateAppliedRef.current && !initialTemplate && defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setTemplateType(`db_${defaultTemplate.id}`);
          setMenimbangItems(formatYearInItems(defaultTemplate.menimbang || []));
          setDasarItems(formatYearInItems(defaultTemplate.dasar || []));
          if (defaultTemplate.default_signer_name && defaultTemplate.default_signer_nip) {
            setKepalaBalai({
              employeeId: defaultTemplate.default_signer_employee_id || undefined,
              name: defaultTemplate.default_signer_name,
              nip: formatNIP(defaultTemplate.default_signer_nip),
            });
          }
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
    const depts = selectedEmployees.map((e) =>
      ((e as any).department || (e as any).satuan_kerja || "").toLowerCase()
    );

    const isAllSeksi1 = depts.every(
      (d) =>
        d.includes("seksi i") ||
        d.includes("seksi 1") ||
        d.includes("wilayah i") ||
        d.includes("berau") ||
        d.includes("skw i")
    );
    if (isAllSeksi1) {
      setKotaAsal("Berau");
      return;
    }

    const isAllSeksi2 = depts.every(
      (d) =>
        d.includes("seksi ii") ||
        d.includes("seksi 2") ||
        d.includes("wilayah ii") ||
        d.includes("tenggarong") ||
        d.includes("skw ii")
    );
    if (isAllSeksi2) {
      setKotaAsal("Tenggarong");
      return;
    }

    const isAllSeksi3 = depts.every(
      (d) =>
        d.includes("seksi iii") ||
        d.includes("seksi 3") ||
        d.includes("wilayah iii") ||
        d.includes("balikpapan") ||
        d.includes("skw iii")
    );
    if (isAllSeksi3) {
      setKotaAsal("Balikpapan");
      return;
    }

    setKotaAsal("Samarinda");
  }, [selectedEmployees]);

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
          const matchNum = data.nomor_surat.match(/ST\.([^\/]+)/);
          if (matchNum) setStNumber(matchNum[1]);

          const matchKlas = data.nomor_surat.match(/\/TU\/([^\/]+)\/B/);
          if (matchKlas) setKlasifikasi(matchKlas[1]);
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
        if (data.template_type) setTemplateType(data.template_type);

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
        setSelectedEmployees(loadedEmployees);

        // Hydrate employeeDates:
        const initialDates: Record<string, { mulai: string; selesai: string }> = {};
        loadedEmployees.forEach((emp: any) => {
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
          loadedEmployees.forEach((emp: any) => {
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
          loadedEmployees.forEach((emp: any) => {
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
        setUntukItems(
          storedAdditionalUntuk.length > 0
            ? toDasarItems(storedAdditionalUntuk, "stored-untuk")
            : getDefaultUntukItems(
                data.template_type,
                buildBiayaTextFor(
                  funding,
                  data.sumber_dana_other || "",
                  new Date().toISOString().substring(0, 10),
                  data.template_type,
                  expenseTemplates
                )
              )
        );

        const activityStr = storedUntukLines[0] || data.maksud_tujuan || "";
        const cleanedActivity = activityStr
          .replace(/,?\s*selama\s+.*$/i, "")
          .replace(/[;,.]$/, "")
          .trim();

        const regex =
          /^(?:Melaksanakan[.\s]+)?(Perjalanan\s+[Dd]inas)\s+dari\s+(.*?)\s+ke\s+(.*?)\s+dalam\s+rangka\s+(.*)/i;
        const singleDayActivity = cleanedActivity;
        const isParsedSingleDayActivity = /^Melaksanakan\s+Kegiatan/i.test(singleDayActivity);
        const isOneDayFromSubmittedForm =
          loadedTanggalMulai &&
          loadedTanggalSelesai &&
          loadedTanggalMulai === loadedTanggalSelesai &&
          !["bmn-pemeriksaan", "beda-hari", "plh"].includes(data.template_type || "");

        const match = cleanedActivity.match(regex);

        if (isParsedSingleDayActivity || (isOneDayFromSubmittedForm && !match)) {
          setInputModeKegiatan("structured");
          setActivityPrefix("Melaksanakan Kegiatan ( 1 Hari )");
          setKotaAsal("");

          let rest = singleDayActivity.replace(/^Melaksanakan\s+Kegiatan\s*/i, "").trim();
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

          setKotaTujuan(parsedKota);
          setTempatKegiatan(parsedTempat);
          setNamaKegiatan(cleanMelaksanakanKegiatanPrefix(parsedNama));
        } else if (match) {
          setInputModeKegiatan("structured");
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
            setNamaKegiatan(rest.replace(/[;,.]$/, "").trim());
          }
        } else {
          const isInternalTask =
            data.template_type === "plh" ||
            data.template_type === "bmn-pemeriksaan" ||
            !singleDayActivity.toLowerCase().includes("perjalanan dinas");
          setActivityPrefix(isInternalTask ? "Menugaskan Staf" : "");
          setKotaAsal("");
          setKotaTujuan("");
          setNamaKegiatan(cleanedActivity);
          setInputModeKegiatan("manual");
        }

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
      const parentLeadEmployee = parentSt?.employees?.[0];
      const wilayah = extractPlhWilayahFromPosition(
        parentLeadEmployee?.satuan_kerja ||
          parentLeadEmployee?.jabatan ||
          parentLeadEmployee?.position ||
          ""
      );
      const kegiatanKasi = cleanPlhKegiatanKasi(parentSt?.maksud_tujuan);

      setPlhWilayah(wilayah);
      setPlhKegiatanKasi(kegiatanKasi);

      setParentStInfo({
        nomorInduk: parentSt?.nomor_surat,
        tanggalInduk: parentSt?.tanggal_surat ? parentSt.tanggal_surat.split("T")[0] : undefined,
      });

      if (plhTemplate?.menimbang && plhTemplate.menimbang.length > 0) {
        const formattedMenimbang = plhTemplate.menimbang.map((item) => {
          let text = (item.text || "").replace(/{tahun}/g, currentYear);
          return {
            ...item,
            text: replacePlhAllPlaceholders(text, {
              wilayah,
              kegiatanKasi,
              nomorInduk,
              tanggalInduk,
            }),
          };
        });
        setMenimbangItems(formattedMenimbang);
      }

      if (plhTemplate?.dasar && plhTemplate.dasar.length > 0) {
        const formattedDasar = plhTemplate.dasar.map((item) => {
          let text = (item.text || "").replace(/{tahun}/g, currentYear);
          return {
            ...item,
            text: replacePlhAllPlaceholders(text, {
              wilayah,
              kegiatanKasi,
              nomorInduk,
              tanggalInduk,
            }),
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
      setKotaTujuan("");
      setTempatKegiatan("");

      const polaKegiatan =
        typeof config.default_kegiatan === "string" && config.default_kegiatan.trim()
          ? config.default_kegiatan
          : `Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${PLH_WILAYAH_PLACEHOLDER}`;

      setNamaKegiatan(
        replacePlhAllPlaceholders(polaKegiatan, {
          wilayah,
          kegiatanKasi,
          nomorInduk,
          tanggalInduk,
        })
      );

      setInputModeKegiatan("manual");

      setTembusanItems([
        "Direktur Jenderal KSDAE;",
        "Sekretaris Direktorat Jenderal KSDAE.",
      ]);

      if (plhName?.trim()) {
        setPendingPlhEmployeeName(plhName.trim());
      }
    },
    [dynamicTemplates, currentYear]
  );

  // Template switch handler
  const handleTemplateChange = (value: string) => {
    if (value === "bmn-pemeriksaan") {
      setSelectedTemplateId(null);
      applyBmnTemplate();
      const bmnTemplate = dynamicTemplates.find(
        (t) => t.code === "bmn-penghapusan" || t.type === "bmn"
      );
      if (bmnTemplate?.configuration?.default_jenis_tugas) {
        setActivityPrefix(bmnTemplate.configuration.default_jenis_tugas);
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
        setActivityPrefix(bedaHariTemplate.configuration.default_jenis_tugas);
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
        setSelectedTemplateId(template.id);
        setTemplateType(value);
        setMenimbangItems(formatYearInItems(template.menimbang || []));
        setDasarItems(formatYearInItems(template.dasar || []));

        if (template.type === "bmn") {
          applyBmnTemplate();
          setTemplateType(value);
          setMenimbangItems(formatYearInItems(template.menimbang || []));
          setDasarItems(formatYearInItems(template.dasar || []));
        } else if (template.type === "beda_hari") {
          applyBedaHariTemplate();
          setTemplateType(value);
          setMenimbangItems(formatYearInItems(template.menimbang || []));
          setDasarItems(formatYearInItems(template.dasar || []));
        } else if (template.type === "plh") {
          if (!canSelectPlh) {
            toast.error(
              "Template PLH hanya dapat dipilih jika pegawai yang ditugaskan adalah Kasubbag TU atau Kepala Seksi."
            );
            return;
          }
          applyPlhTemplate(undefined, undefined, template);
          setTemplateType(value);
        }

        const configuration = template.configuration || {};
        if (typeof configuration.default_jenis_tugas === "string") {
          setActivityPrefix(configuration.default_jenis_tugas);
        }
        if (
          typeof configuration.default_kegiatan === "string" &&
          configuration.default_kegiatan.trim()
        ) {
          setNamaKegiatan(configuration.default_kegiatan);
        }
        if (configuration.default_mode_kegiatan === "manual" || template.type === "plh") {
          setInputModeKegiatan("manual");
        } else if (configuration.default_mode_kegiatan === "structured") {
          setInputModeKegiatan("structured");
        }
        if (typeof configuration.klasifikasi === "string") setKlasifikasi(configuration.klasifikasi);
        if (typeof configuration.sumber_dana === "string") setSumberDana(configuration.sumber_dana);
        if (typeof configuration.header_title === "string") {
          setHeaderTitle(configuration.header_title);
        } else {
          setHeaderTitle("KEPALA BALAI,");
        }
        if (typeof configuration.penutup_text === "string") {
          setPenutupText(configuration.penutup_text);
        } else {
          setPenutupText("Demikian untuk dilaksanakan dengan penuh tanggung jawab.");
        }
        if (
          configuration.date_format_style === "tabular" ||
          configuration.date_format_style === "inline"
        ) {
          setDateFormatStyle(configuration.date_format_style);
        } else {
          setDateFormatStyle("inline");
        }
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
      }
    } else {
      setSelectedTemplateId(null);
      setTemplateType(null);
      setMenimbangItems([]);
      setDasarItems([]);
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
  }, [initialTemplate, initialParentStId, mode, applyPlhTemplate]);

  // Text builders
  const replacePlhPlaceholders = useCallback(
    (value: string) => {
      if (!isPlhTemplate) return value;
      return replacePlhAllPlaceholders(value, {
        wilayah: plhWilayah,
        kegiatanKasi: plhKegiatanKasi,
        nomorInduk: parentStInfo.nomorInduk,
        tanggalInduk: parentStInfo.tanggalInduk,
      });
    },
    [isPlhTemplate, plhKegiatanKasi, plhWilayah, parentStInfo.nomorInduk, parentStInfo.tanggalInduk]
  );

  const getPreviewMenimbangItems = () =>
    isPlhTemplate
      ? menimbangItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : menimbangItems;

  const getPreviewDasarItems = () =>
    isPlhTemplate
      ? dasarItems.map((item) => ({ ...item, text: replacePlhPlaceholders(item.text) }))
      : dasarItems;

  const getTempatTujuanForPayload = () => {
    if (isPlhTemplate) {
      return plhWilayah.trim() || kotaTujuan.trim() || tempatKegiatan.trim();
    }
    if (inputModeKegiatan === "manual") {
      return kotaTujuan.trim() || tempatKegiatan.trim() || "Kalimantan Timur";
    }
    return kotaTujuan.trim();
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
      let text = replacePlhPlaceholders(namaKegiatan || "...");
      const prefixSep = text.trim().endsWith(",") ? " " : ", ";
      if (days === 1 || tanggalMulai === tanggalSelesai) {
        text += `${prefixSep}selama 1 (satu) hari pada tanggal ${mulaiFormatted};`;
      } else if (days > 1) {
        text += `${prefixSep}selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
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

    setDasarItems((prev) => {
      const newItems = [...prev];
      const existingIdx = newItems.findIndex(
        (item) => item.id === "funding-dasar" || (item.text && item.text.toLowerCase().includes("dipa"))
      );
      if (fundingText) {
        if (existingIdx !== -1) {
          newItems[existingIdx] = {
            id: newItems[existingIdx].id || "funding-dasar",
            text: fundingText,
          };
        } else {
          newItems.push({ id: "funding-dasar", text: fundingText });
        }
      } else if (existingIdx !== -1) {
        newItems.splice(existingIdx, 1);
      }
      return newItems;
    });
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

  const handleNamaKegiatanChange = (value: string) => {
    setNamaKegiatan(value);
    if (sumberDana === "folu") {
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

  const getBedaHariData = () => {
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
        const nipText = emp.nip ? `NIP. ${emp.nip}` : "Non-NIP";
        return `${index + 1}. ${emp.nama_lengkap || emp.name} (${nipText}): ${rangeText}`;
      });
      const scheduleBlock = `[Jadwal Personel Berbeda Hari]:\n${scheduleLines.join("\n")}`;
      updatedKeterangan = baseKeterangan ? `${baseKeterangan}\n\n${scheduleBlock}` : scheduleBlock;
    }

    const employeesPayload = selectedEmployees.map((employee) => ({
      id: employee.id,
      tanggal_mulai: isBedaHariTemplate
        ? (employeeDates[String(employee.id)]?.mulai || employeeDates[employee.id]?.mulai || effectiveMulai)
        : effectiveMulai,
      tanggal_selesai: isBedaHariTemplate
        ? (employeeDates[String(employee.id)]?.selesai || employeeDates[employee.id]?.selesai || effectiveSelesai)
        : effectiveSelesai,
    }));

    const templateSnapshotPayload = isBedaHariTemplate
      ? {
          configuration: {
            judul_lampiran_beda_hari: judulLampiranBedaHari,
            employee_dates: employeeDates,
          },
        }
      : undefined;

    return {
      effectiveMulai,
      effectiveSelesai,
      updatedKeterangan,
      employeesPayload,
      templateSnapshotPayload,
    };
  };

  // Actions
  const handleSaveDraft = async () => {
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    const tempatTujuanPayload = getTempatTujuanForPayload();
    if (!tempatTujuanPayload) {
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
      const fullNomorSurat = stNumber.trim() && klasifikasi.trim()
        ? buildNomorSurat(stNumber.trim(), klasifikasi.trim())
        : null;

      const {
        effectiveMulai,
        effectiveSelesai,
        updatedKeterangan,
        employeesPayload,
        templateSnapshotPayload,
      } = getBedaHariData();

      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: klasifikasi.trim() ? `K.18/TU/${klasifikasi.trim()}/B` : null,
        tanggal_surat: tanggalSurat || null,
        maksud_tujuan: [buildUntukText(), buildBiayaText()].filter(Boolean).join("\n"),
        tanggal_mulai: effectiveMulai,
        tanggal_selesai: effectiveSelesai,
        tempat_tujuan: tempatTujuanPayload,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        template_id: selectedTemplateId,
        menimbang: getPreviewMenimbangItems(),
        dasar: getPreviewDasarItems(),
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employees: employeesPayload,
        keterangan: updatedKeterangan,
        template_snapshot: templateSnapshotPayload,
      };

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
      const fullNomorSurat = buildNomorSurat(stNumber, klasifikasi);
      const {
        effectiveMulai,
        effectiveSelesai,
        updatedKeterangan,
        employeesPayload,
        templateSnapshotPayload,
      } = getBedaHariData();

      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: `K.18/TU/${klasifikasi}/B`,
        tanggal_surat: tanggalSurat || null,
        maksud_tujuan: [buildUntukText(), buildBiayaText()].filter(Boolean).join("\n"),
        tanggal_mulai: effectiveMulai,
        tanggal_selesai: effectiveSelesai,
        tempat_tujuan: tempatTujuanPayload,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        template_id: selectedTemplateId,
        menimbang: getPreviewMenimbangItems(),
        dasar: getPreviewDasarItems(),
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employees: employeesPayload,
        employee_ids: selectedEmployees.map((e) => e.id),
        keterangan: updatedKeterangan,
        template_snapshot: templateSnapshotPayload,
        status: "approved",
      };

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
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!letterId) return;
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");
    if (!tanggalMulai || !tanggalSelesai) return toast.error("Tanggal kegiatan harus diisi.");

    try {
      const fullNomorSurat = buildNomorSurat(stNumber, klasifikasi);
      const {
        effectiveMulai,
        effectiveSelesai,
        updatedKeterangan,
        employeesPayload,
        templateSnapshotPayload,
      } = getBedaHariData();

      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: `K.18/TU/${klasifikasi}/B`,
        maksud_tujuan: [buildUntukText(), buildBiayaText()].filter(Boolean).join("\n"),
        tempat_tujuan: getTempatTujuanForPayload() || null,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        template_type: templateType,
        menimbang: getPreviewMenimbangItems(),
        dasar: getPreviewDasarItems(),
        tembusan: tembusanItems.length > 0 ? tembusanItems : null,
        penandatangan_nama: kepalaBalai.name || DEFAULT_KEPALA_BALAI.name,
        penandatangan_nip: formatNIP(kepalaBalai.nip || DEFAULT_KEPALA_BALAI.nip),
        employees: employeesPayload,
        employee_ids: selectedEmployees.map((e) => e.id),
        tanggal_mulai: effectiveMulai,
        tanggal_selesai: effectiveSelesai,
        keterangan: updatedKeterangan,
        template_snapshot: templateSnapshotPayload,
        status: "pending",
      };
      await api.put(`/surat-tugas/${letterId}/approve`, payload);
      toast.success("Surat Tugas berhasil diajukan! Menunggu persetujuan.");
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
      await queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
      router.push("/kepegawaian/surat-tugas/inbox");
    } catch (err: unknown) {
      let errorMessage = "Gagal mengajukan ST.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleUpdateNomorSurat = async () => {
    if (!letterId) return;
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (!klasifikasi) return toast.error("Klasifikasi harus diisi.");

    try {
      const fullNomorSurat = buildNomorSurat(stNumber, klasifikasi);
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
    printSuratTugas(stNumber, namaKegiatan);
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
    <div className="h-screen flex bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      <aside className="w-105 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col shadow-2xl z-10">
        <header className="p-6 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">
              ST Builder <span className="text-blue-600 dark:text-blue-400">Premium</span>
            </h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
            {mode === "create"
              ? "Direct Issuance Mode"
              : isPublished
              ? "MODE PRATINJAU (SUDAH DITERBITKAN)"
              : "APPROVAL MODE"}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {isPublished && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Surat Tugas ini sudah diterbitkan dan bersifat Read Only.</span>
            </div>
          )}

          {/* === Template Card === */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-500/10">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 items-center rounded-full bg-orange-600 px-2 text-[9px] font-bold uppercase tracking-wider text-white">
                  Template
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                  Pilih Template ST
                </span>
              </div>
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
              className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-700 outline-none transition focus:ring-2 focus:ring-orange-500/20 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-orange-300 disabled:opacity-60"
            >
              <option value="">Default (Manual)</option>
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
                    !["bmn", "plh", "beda_hari", "standard"].includes(t.type) &&
                    !["bmn-penghapusan", "beda-hari", "plh", "default"].includes(t.code || "")
                )
                .map((t) => (
                  <option key={t.id} value={`db_${t.id}`}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Card Nomor Surat */}
          <FormSection title="Nomor Surat">
            <div className="space-y-3">
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
            </div>
          </FormSection>

          {/* Card Menimbang & Dasar */}
          <FormSection title="Menimbang & Dasar Hukum">
            <div className="space-y-4">
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
                          {emp.nip ? `NIP. ${emp.nip}` : "Non-NIP"} • {emp.jabatan || "-"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Judul Lampiran Beda Hari */}
              {isBedaHariTemplate && (
                <div className="space-y-1.5 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/50">
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
              )}

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
                            {index + 1}. {emp.nama_lengkap || emp.name}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {emp.nip ? `NIP. ${emp.nip} • ` : ""}{emp.jabatan || emp.position || "-"}
                          </p>
                        </div>
                        {!isPublished && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployees((prev) => prev.filter((e) => e.id !== emp.id));
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
                        <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-700/70 grid grid-cols-2 gap-2">
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </FormSection>

          {/* Rincian Kegiatan & Waktu */}
          <FormSection title="Rincian Kegiatan & Waktu">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Maksud / Tugas
                </label>
                <textarea
                  rows={3}
                  value={namaKegiatan}
                  disabled={isPublished}
                  onChange={(e) => handleNamaKegiatanChange(e.target.value)}
                  placeholder="Contoh: Melakukan koordinasi teknis..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:border-blue-500 text-zinc-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    disabled={isPublished}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    disabled={isPublished}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              </div>

              {isBedaHariTemplate && (
                <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-900/40 text-[10px] text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">Info:</span> Pada template Beda Hari, rentang tanggal utama surat tugas otomatis disesuaikan dengan rentang tanggal keseluruhan (paling awal s/d paling akhir) dari daftar pegawai saat disimpan.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Kota Asal</label>
                  <input
                    type="text"
                    value={kotaAsal}
                    disabled={isPublished}
                    onChange={(e) => setKotaAsal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
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
                  placeholder="Contoh: Kantor Seksi Wilayah I"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                />
              </div>

              {/* Pembiayaan */}
              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sumber Dana</label>
                <select
                  value={sumberDana}
                  disabled={isPublished}
                  onChange={(e) => setSumberDana(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60 cursor-pointer"
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
                    className="w-full mt-2 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60"
                  />
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
        <footer className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0 space-y-2">
          {mode === "create" ? (
            <>
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                className="w-full h-10 rounded-xl font-bold text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
              >
                <FileText className="w-4 h-4 mr-2" /> Simpan Draft
              </Button>
              <Button
                onClick={handleApprove}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              >
                <CheckCircle className="w-5 h-5 mr-2" /> Terbitkan & Cetak
              </Button>
            </>
          ) : (
            <>
              {!isPublished ? (
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  className="w-full h-10 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                >
                  <FileText className="w-4 h-4 mr-2" /> Simpan Draft
                </Button>
              ) : (
                <Button
                  onClick={handleUpdateNomorSurat}
                  variant="outline"
                  className="w-full h-10 rounded-xl font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <FileText className="w-4 h-4 mr-2" /> Simpan Nomor Surat
                </Button>
              )}

              {isPublished ? (
                <Button
                  disabled
                  className="w-full h-12 bg-emerald-600 text-white rounded-xl font-bold opacity-90 cursor-not-allowed flex items-center justify-center"
                >
                  <CheckCircle className="w-5 h-5 mr-2" /> Sudah Diterbitkan
                </Button>
              ) : suratStatus === "approved" || suratStatus === "completed" ? (
                <Button
                  disabled
                  className="w-full h-12 bg-emerald-500 text-white rounded-xl font-bold opacity-80 cursor-not-allowed"
                >
                  <Send className="w-5 h-5 mr-2" /> Sudah Disetujui
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitForApproval}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
                >
                  <Send className="w-5 h-5 mr-2" />{" "}
                  {suratStatus === "pending" ? "Perbarui & Ajukan" : "Ajukan Persetujuan"}
                </Button>
              )}
            </>
          )}

          <Button
            variant="outline"
            onClick={handlePrint}
            className="w-full h-10 rounded-xl font-bold text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
          >
            <Printer className="w-5 h-5 mr-2" /> Preview Cetak
          </Button>
        </footer>
      </aside>

      {/* Main Preview Panel */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-slate-200/50 dark:bg-zinc-950">
        <div className="relative">
          <div
            id="surat-preview-doc"
            className="w-[210mm] bg-white shadow-2xl selection:bg-blue-100"
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
              judulLampiranBedaHari={judulLampiranBedaHari}
              sumberDana={sumberDana}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
export default SuratTugasForm;
