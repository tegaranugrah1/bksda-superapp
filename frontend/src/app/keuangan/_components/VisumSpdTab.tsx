"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  Calendar,
  UserCheck,
  Settings2,
  BookmarkPlus,
  Plus,
  Trash2,
  ClipboardList,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  VisumSpdDocument,
  VisumSpdData,
  VisumTransitItem,
  DEFAULT_VISUM_SPD_DATA,
  getTemplateKelian,
  getTemplateDipaTenggarong,
  getTemplateManual,
  getTodayIndoDate,
  handlePrintVisumSpd,
} from "./VisumSpdDocument";
import VisumManageTemplatesModal, {
  VisumTemplateItem,
  VisumSpdSettings,
} from "./VisumManageTemplatesModal";
import VisumSaveAsTemplateModal from "./VisumSaveAsTemplateModal";
import api from "@/lib/api";
import { toast } from "sonner";

function cleanTemplateName(name: string): string {
  return name
    .replace(/^(\[(DIPA|FOLU|UMUM)\]\s*)+/gi, "")
    .replace(/\s*\((DIPA|FOLU)\)$/gi, "")
    .trim();
}

function getRegionRank(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("samarinda") || n.includes("balai")) return 1;
  if (n.includes("berau") || n.includes("wilayah i") || n.includes("skw i")) return 2;
  if (n.includes("tenggarong") || n.includes("wilayah ii") || n.includes("skw ii") || n.includes("kelian")) return 3;
  if (n.includes("balikpapan") || n.includes("wilayah iii") || n.includes("skw iii")) return 4;
  return 5;
}

interface EmployeeOption {
  id: number;
  name: string;
  nip: string | null;
  position: string | null;
  department: string | null;
}

const STORAGE_KEY = "bksda_visum_spd_draft_v2";
const STORAGE_KEY_TMPL_ID = "bksda_visum_spd_selected_template_id";

const BULAN_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatNip(rawNip?: string | null): string {
  if (!rawNip) return "";
  const cleaned = rawNip.replace(/\s+/g, "");
  if (cleaned.length === 18) {
    return `${cleaned.slice(0, 8)} ${cleaned.slice(8, 14)} ${cleaned.slice(14, 15)} ${cleaned.slice(15)}`;
  }
  return rawNip;
}

function formatDateToIndo(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${BULAN_INDO[monthIndex]} ${year}`;
    }
  }
  return isoDate;
}

function parseIndoDateToIso(indoDate: string): string {
  if (!indoDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(indoDate)) return indoDate;
  const parts = indoDate.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const monthStr = parts[1].toLowerCase();
    const year = parts[2];
    const monthIndex = BULAN_INDO.findIndex((m) => m.toLowerCase() === monthStr);
    if (monthIndex >= 0) {
      const month = String(monthIndex + 1).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  return "";
}

function IndoDatePicker({
  value,
  onChange,
  placeholder,
  className,
}: {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);
  const isoVal = parseIndoDateToIso(value || "");

  const handleIsoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      onChange(formatDateToIndo(iso));
    }
  };

  const handleCalendarClick = () => {
    if (hiddenInputRef.current) {
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          hiddenInputRef.current.showPicker();
        } else {
          hiddenInputRef.current.focus();
        }
      } catch {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className || ""} pr-9`}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        title="Pilih tanggal dari kalender"
        className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={hiddenInputRef}
        type="date"
        value={isoVal}
        onChange={handleIsoChange}
        className="sr-only pointer-events-none absolute right-0 bottom-0 opacity-0"
        tabIndex={-1}
      />
    </div>
  );
}

export interface SuratTugasSimpleItem {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan?: string | null;
}

export function VisumSpdTab({
  isPortal = false,
  suratTugasList = [],
}: {
  isPortal?: boolean;
  suratTugasList?: SuratTugasSimpleItem[];
}) {
  const [spdType, setSpdType] = useState<"dipa" | "folu">("dipa");
  const [data, setData] = useState<VisumSpdData>(getTemplateDipaTenggarong());
  const [templates, setTemplates] = useState<VisumTemplateItem[]>([]);
  const [settings, setSettings] = useState<VisumSpdSettings | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");

  const [includeBalaiData, setIncludeBalaiData] = useState<boolean>(true);
  const [includeDestinationData, setIncludeDestinationData] = useState<boolean>(true);
  const [showTableBorder, setShowTableBorder] = useState<boolean>(true);
  const [showTransitSection, setShowTransitSection] = useState<boolean>(false);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [previewZoom, setPreviewZoom] = useState<number>(0.85); // Default 85% large clear scale for high readability

  // Modals
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);

  // Fetch employees list from API
  useEffect(() => {
    api
      .get("/kepegawaian/employees/select")
      .then((res) => {
        const list = res.data?.data ?? res.data;
        if (Array.isArray(list)) {
          setEmployeeOptions(list);
        }
      })
      .catch(() => {});
  }, []);

  // Save changes to localStorage
  const updateData = <K extends keyof VisumSpdData>(key: K, value: VisumSpdData[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const updateTransitData = (
    transitKey: "transit_3" | "transit_4" | "transit_5",
    field: keyof VisumTransitItem,
    value: any
  ) => {
    setData((prev) => {
      const existing = prev[transitKey] || {};
      const updated = { ...existing, [field]: value };
      const next = { ...prev, [transitKey]: updated };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const hasTransit3 = Boolean(
    data.transit_3 && Object.keys(data.transit_3).length > 0 &&
      (data.transit_3.tiba_di !== undefined ||
        data.transit_3.berangkat_ke !== undefined ||
        data.transit_3.tiba_kepala_nama !== undefined)
  );
  const hasTransit4 = Boolean(
    data.transit_4 && Object.keys(data.transit_4).length > 0 &&
      (data.transit_4.tiba_di !== undefined ||
        data.transit_4.berangkat_ke !== undefined ||
        data.transit_4.tiba_kepala_nama !== undefined)
  );
  const hasTransit5 = Boolean(
    data.transit_5 && Object.keys(data.transit_5).length > 0 &&
      (data.transit_5.tiba_di !== undefined ||
        data.transit_5.berangkat_ke !== undefined ||
        data.transit_5.tiba_kepala_nama !== undefined)
  );

  const handleAddNextTransit = () => {
    const today = getTodayIndoDate();
    if (!hasTransit3) {
      updateData("transit_3", {
        tiba_di: "",
        tiba_tanggal: today,
        tiba_kepala_jabatan: "",
        tiba_kepala_nama: "",
        tiba_kepala_nip: "",
        tiba_id_type: "NIP",
        berangkat_dari: "",
        berangkat_ke: data.kembali_tempat || "Samarinda",
        berangkat_tanggal: today,
        berangkat_kepala_jabatan: "",
        berangkat_kepala_nama: "",
        berangkat_kepala_nip: "",
        berangkat_id_type: "NIP",
      });
      toast.success("Destinasi Lanjutan (III) berhasil ditambahkan.");
    } else if (!hasTransit4) {
      updateData("transit_4", {
        tiba_di: "",
        tiba_tanggal: today,
        tiba_kepala_jabatan: "",
        tiba_kepala_nama: "",
        tiba_kepala_nip: "",
        tiba_id_type: "NIP",
        berangkat_dari: "",
        berangkat_ke: data.kembali_tempat || "Samarinda",
        berangkat_tanggal: today,
        berangkat_kepala_jabatan: "",
        berangkat_kepala_nama: "",
        berangkat_kepala_nip: "",
        berangkat_id_type: "NIP",
      });
      toast.success("Destinasi Lanjutan (IV) berhasil ditambahkan.");
    } else if (!hasTransit5) {
      updateData("transit_5", {
        tiba_di: "",
        tiba_tanggal: today,
        tiba_kepala_jabatan: "",
        tiba_kepala_nama: "",
        tiba_kepala_nip: "",
        tiba_id_type: "NIP",
        berangkat_dari: "",
        berangkat_ke: data.kembali_tempat || "Samarinda",
        berangkat_tanggal: today,
        berangkat_kepala_jabatan: "",
        berangkat_kepala_nama: "",
        berangkat_kepala_nip: "",
        berangkat_id_type: "NIP",
      });
      toast.success("Destinasi Lanjutan (V) berhasil ditambahkan.");
    } else {
      toast.info("Maksimal 4 destinasi (Baris II, III, IV, dan V) pada lembar Visum SPD.");
    }
  };

  const handleRemoveTransit = (
    transitKey: "transit_3" | "transit_4" | "transit_5",
    label: string
  ) => {
    updateData(transitKey, {});
    toast.info(`Destinasi ${label} telah dihapus.`);
  };

  // Apply template item from database and merge with active master officials & PPK
  const applyTemplateItem = (
    tmpl: VisumTemplateItem,
    notify: boolean = true,
    customSettings?: VisumSpdSettings | null
  ) => {
    setSelectedTemplateId(String(tmpl.id));
    const tmplData = { ...tmpl.data };
    const currentSettings = customSettings !== undefined ? customSettings : settings;
    const isDipa = tmplData.spd_type === "dipa" || tmpl.name.toLowerCase().includes("dipa");
    if (isDipa) {
      setSpdType("dipa");
      try {
        localStorage.setItem("bksda_visum_spd_type_v1", "dipa");
      } catch {}
    } else if (tmplData.spd_type === "folu" || tmpl.name.toLowerCase().includes("folu")) {
      setSpdType("folu");
      try {
        localStorage.setItem("bksda_visum_spd_type_v1", "folu");
      } catch {}
    }

    // Auto today date if configured
    if (tmpl.auto_today_date) {
      const today = getTodayIndoDate();
      tmplData.asal_tanggal = today;
      tmplData.tujuan_1_tiba_tanggal = today;
      tmplData.tujuan_1_berangkat_tanggal = today;
      if (tmplData.transit_3 && (tmplData.transit_3.tiba_di || tmplData.transit_3.berangkat_ke)) {
        tmplData.transit_3 = {
          ...tmplData.transit_3,
          tiba_tanggal: today,
          berangkat_tanggal: today,
        };
      }
      if (tmplData.transit_4 && (tmplData.transit_4.tiba_di || tmplData.transit_4.berangkat_ke)) {
        tmplData.transit_4 = {
          ...tmplData.transit_4,
          tiba_tanggal: today,
          berangkat_tanggal: today,
        };
      }
      if (tmplData.transit_5 && (tmplData.transit_5.tiba_di || tmplData.transit_5.berangkat_ke)) {
        tmplData.transit_5 = {
          ...tmplData.transit_5,
          tiba_tanggal: today,
          berangkat_tanggal: today,
        };
      }
      tmplData.kembali_tanggal = today;
    }

    // Always inject the current active master PPK from settings according to SPD type
    if (isDipa && currentSettings?.ppk_dipa) {
      tmplData.ppk_nama = currentSettings.ppk_dipa.name;
      tmplData.ppk_nip = currentSettings.ppk_dipa.nip;
      tmplData.ppk_jabatan = currentSettings.ppk_dipa.position || "Pejabat Pembuat Komitmen,";
      if (currentSettings.ppk_dipa.statement) tmplData.ppk_keterangan = currentSettings.ppk_dipa.statement;
    } else if (!isDipa) {
      const ppkFolu = currentSettings?.ppk_folu || currentSettings?.ppk;
      if (ppkFolu) {
        tmplData.ppk_nama = ppkFolu.name;
        tmplData.ppk_nip = ppkFolu.nip;
        tmplData.ppk_jabatan = ppkFolu.position || "Pejabat Pembuat Komitmen,";
        if (ppkFolu.statement) tmplData.ppk_keterangan = ppkFolu.statement;
      }
    }

    // Always sync with the active regional official for template's departure city
    if (currentSettings) {
      const asalLower = (tmplData.asal_tempat || "Samarinda").toLowerCase();
      let matchedRegion = currentSettings.samarinda;
      if (asalLower.includes("berau")) matchedRegion = currentSettings.berau;
      else if (asalLower.includes("tenggarong") || asalLower.includes("kukar"))
        matchedRegion = currentSettings.tenggarong;
      else if (asalLower.includes("balikpapan"))
        matchedRegion = currentSettings.balikpapan;

      if (matchedRegion) {
        tmplData.asal_nama_pejabat = matchedRegion.official_name;
        tmplData.asal_nip_pejabat = matchedRegion.official_nip;
        // In DIPA, use depart_position_dipa or fallback
        if (isDipa) {
          const dipaPos =
            matchedRegion.depart_position_dipa ||
            (matchedRegion.depart_position || "")
              .replace(/^a\.n\.\s*Kepala\s+Balai\s*\n?/i, "")
              .replace(/^a\.n\.\s*Kepala\s+Balai,?\s*/i, "")
              .trim();
          tmplData.asal_jabatan_pengesah = dipaPos.endsWith(",") ? dipaPos : `${dipaPos},`;
        } else {
          tmplData.asal_jabatan_pengesah = matchedRegion.depart_position_folu || matchedRegion.depart_position;
        }

        // If not DIPA, ensure Section VI return signatory uses regional official
        if (!isDipa) {
          tmplData.kembali_nama_pejabat = matchedRegion.official_name;
          tmplData.kembali_nip_pejabat = matchedRegion.official_nip;
          tmplData.kembali_jabatan_pengesah = matchedRegion.return_position;
        }
      }
    }

    setData(tmplData);
    try {
      localStorage.setItem(STORAGE_KEY_TMPL_ID, String(tmpl.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tmplData));
    } catch {
      // ignore
    }

    if (notify) {
      toast.success(`Template "${tmpl.name}" berhasil diterapkan.`);
    }
  };

  // Fetch Templates & Settings from API
  const fetchTemplatesAndSettings = async () => {
    try {
      const [resTemplates, resSettings] = await Promise.all([
        api.get("/api/keuangan/visum/templates"),
        api.get("/api/keuangan/visum/settings"),
      ]);

      let loadedSettings: VisumSpdSettings | null = null;
      if (resSettings.data?.success) {
        const raw = resSettings.data.data;
        loadedSettings = {
          ...raw,
          ppk_dipa: raw.ppk_dipa || {
            name: "RUSMANTO, S.Hut",
            nip: "19810907 200012 1 004",
            position: "Pejabat Pembuat Komitmen,",
            statement:
              "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
          },
          ppk_folu: raw.ppk_folu || raw.ppk || {
            name: "Ahmad Hidayat, S.PKP., M.Ling",
            nip: "19820301 200012 1 001",
            position: "Pejabat Pembuat Komitmen,",
            statement:
              "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
          },
        };
        setSettings(loadedSettings);
      }

      if (resTemplates.data?.success && Array.isArray(resTemplates.data.data)) {
        const tmpls: VisumTemplateItem[] = resTemplates.data.data;
        setTemplates(tmpls);

        let savedDataRaw: string | null = null;
        let savedTmplId: string | null = null;
        let savedType: string | null = null;
        try {
          savedDataRaw = localStorage.getItem(STORAGE_KEY);
          savedTmplId = localStorage.getItem(STORAGE_KEY_TMPL_ID);
          savedType = localStorage.getItem("bksda_visum_spd_type_v1");
        } catch {}

        if (savedType === "folu") {
          setSpdType("folu");
        } else {
          setSpdType("dipa");
        }

        let parsedSavedData: VisumSpdData | null = null;
        try {
          if (savedDataRaw) parsedSavedData = JSON.parse(savedDataRaw);
        } catch {}

        if (savedTmplId === "manual") {
          setSelectedTemplateId("manual");
          if (parsedSavedData) {
            setData(parsedSavedData);
          } else {
            setData(getTemplateManual());
          }
        } else if (savedTmplId && tmpls.some((t) => String(t.id) === savedTmplId)) {
          const matchedTmpl = tmpls.find((t) => String(t.id) === savedTmplId)!;
          setSelectedTemplateId(String(matchedTmpl.id));
          if (parsedSavedData && (parsedSavedData.asal_tempat || parsedSavedData.tujuan_1_tempat)) {
            setData(parsedSavedData);
          } else {
            applyTemplateItem(matchedTmpl, false, loadedSettings);
          }
        } else {
          // Default: Pick DIPA template if spdType is dipa, or default template
          const dipaTmpl = tmpls.find((t) => t.data?.spd_type === "dipa" || t.name.toLowerCase().includes("dipa"));
          const def = dipaTmpl || tmpls.find((t) => t.is_default) || tmpls[0];
          if (def) {
            setSelectedTemplateId(String(def.id));
            if (parsedSavedData && (parsedSavedData.asal_tempat || parsedSavedData.tujuan_1_tempat)) {
              setData(parsedSavedData);
            } else {
              applyTemplateItem(def, false, loadedSettings);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load visum templates/settings", err);
    }
  };

  useEffect(() => {
    fetchTemplatesAndSettings();
  }, []);

  // Switch between SPD DIPA and SPD FOLU Net Sink 2030
  const handleSwitchSpdType = (type: "dipa" | "folu") => {
    setSpdType(type);
    try {
      localStorage.setItem("bksda_visum_spd_type_v1", type);
    } catch {}

    if (type === "dipa") {
      const ppkDipa = settings?.ppk_dipa || {
        name: "RUSMANTO, S.Hut",
        nip: "19810907 200012 1 004",
        position: "Pejabat Pembuat Komitmen,",
        statement:
          "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
      };

      // Default to Manual (Kosong) when switching to DIPA
      setSelectedTemplateId("manual");
      const emptyDipa: VisumSpdData = {
        spd_type: "dipa",
        asal_tempat: "",
        asal_tanggal: getTodayIndoDate(),
        tujuan_awal: "",
        asal_jabatan_pengesah: "",
        asal_nama_pejabat: "",
        asal_nip_pejabat: "",
        tujuan_1_tempat: "",
        tujuan_1_tiba_tanggal: getTodayIndoDate(),
        tujuan_1_kepala_jabatan: "",
        tujuan_1_kepala_nama: "",
        tujuan_1_kepala_nip: "",
        tujuan_1_id_type: "NIP",
        tujuan_1_berangkat_dari: "",
        tujuan_1_berangkat_ke: "",
        tujuan_1_berangkat_tanggal: getTodayIndoDate(),
        tujuan_1_berangkat_kepala_jabatan: "",
        tujuan_1_berangkat_kepala_nama: "",
        tujuan_1_berangkat_kepala_nip: "",
        tujuan_1_berangkat_id_type: "NIP",
        transit_3: {},
        transit_4: {},
        transit_5: {},
        kembali_tempat: "",
        kembali_tanggal: getTodayIndoDate(),
        kembali_jabatan_pengesah: "Pejabat Pembuat Komitmen,",
        kembali_nama_pejabat: ppkDipa.name,
        kembali_nip_pejabat: ppkDipa.nip,
        ppk_jabatan: "Pejabat Pembuat Komitmen,",
        ppk_nama: ppkDipa.name,
        ppk_nip: ppkDipa.nip,
        ppk_keterangan: ppkDipa.statement,
        catatan_lain: "",
        perhatian_text:
          "PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealphaannya.",
      };

      setData(emptyDipa);
      try {
        localStorage.setItem(STORAGE_KEY_TMPL_ID, "manual");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyDipa));
      } catch {}
      toast.success("Beralih ke SPD DIPA (Manual Kosong - PPK: " + ppkDipa.name + ")");
    } else {
      const ppkFolu = settings?.ppk_folu || settings?.ppk || {
        name: "Ahmad Hidayat, S.PKP., M.Ling",
        nip: "19820301 200012 1 001",
        position: "Pejabat Pembuat Komitmen,",
        statement:
          "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
      };

      const foluTmpl = templates.find((t) => t.data?.spd_type === "folu" || t.name.toLowerCase().includes("kelian") || t.is_default);
      if (foluTmpl) {
        applyTemplateItem(foluTmpl, false);
      } else {
        setData((prev) => {
          const asalLower = (prev.asal_tempat || "Samarinda").toLowerCase();
          let matchedRegion = settings?.samarinda;
          if (asalLower.includes("berau")) matchedRegion = settings?.berau;
          else if (asalLower.includes("tenggarong") || asalLower.includes("kukar"))
            matchedRegion = settings?.tenggarong;
          else if (asalLower.includes("balikpapan"))
            matchedRegion = settings?.balikpapan;

          const next: VisumSpdData = {
            ...prev,
            spd_type: "folu",
            asal_jabatan_pengesah: matchedRegion?.depart_position || prev.asal_jabatan_pengesah,
            ppk_nama: ppkFolu.name,
            ppk_nip: ppkFolu.nip,
            ppk_jabatan: ppkFolu.position || "Pejabat Pembuat Komitmen,",
            ppk_keterangan: ppkFolu.statement || prev.ppk_keterangan,
            kembali_jabatan_pengesah: matchedRegion?.return_position || "Kepala Subbagian Tata Usaha",
            kembali_nama_pejabat: matchedRegion?.official_name || "Dheny Mardiono, S.Hut., MSc.",
            kembali_nip_pejabat: matchedRegion?.official_nip || "19750314 199903 1 004",
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      toast.success("Beralih ke SPD FOLU Net Sink 2030 (PPK: " + ppkFolu.name + ")");
    }
  };

  const handleSelectTemplateOption = (val: string) => {
    setSelectedTemplateId(val);
    try {
      localStorage.setItem(STORAGE_KEY_TMPL_ID, val);
    } catch {}

    if (val === "manual") {
      const activePpk =
        spdType === "dipa"
          ? settings?.ppk_dipa || {
              name: "RUSMANTO, S.Hut",
              nip: "19810907 200012 1 004",
              position: "Pejabat Pembuat Komitmen,",
              statement:
                "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
            }
          : settings?.ppk_folu ||
            settings?.ppk || {
              name: "Ahmad Hidayat, S.PKP., M.Ling",
              nip: "19820301 200012 1 001",
              position: "Pejabat Pembuat Komitmen,",
              statement:
                "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
            };

      const manualData = getTemplateManual();
      manualData.spd_type = spdType;
      manualData.ppk_jabatan = activePpk.position || "Pejabat Pembuat Komitmen,";
      manualData.ppk_nama = activePpk.name;
      manualData.ppk_nip = activePpk.nip;
      manualData.ppk_keterangan = activePpk.statement;
      if (spdType === "dipa") {
        manualData.kembali_jabatan_pengesah = "Pejabat Pembuat Komitmen,";
        manualData.kembali_nama_pejabat = activePpk.name;
        manualData.kembali_nip_pejabat = activePpk.nip;
      }
      setData(manualData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(manualData));
      } catch {}
      toast.info("Form dikosongkan untuk pengisian manual.");
      return;
    }

    const found = templates.find((t) => String(t.id) === val);
    if (found) {
      applyTemplateItem(found, true);
    }
  };

  const handleApplySuratTugas = (st: SuratTugasSimpleItem) => {
    const tglMulaiIndo = formatDateToIndo(st.tanggal_mulai);
    const tglSelesaiIndo = formatDateToIndo(st.tanggal_selesai);
    const dest = st.tempat_tujuan || st.maksud_tujuan || "";

    setData((prev) => {
      const next: VisumSpdData = {
        ...prev,
        tujuan_awal: dest,
        tujuan_1_tempat: dest,
        tujuan_1_berangkat_dari: dest,
        asal_tanggal: tglMulaiIndo || prev.asal_tanggal,
        tujuan_1_tiba_tanggal: tglMulaiIndo || prev.tujuan_1_tiba_tanggal,
        tujuan_1_berangkat_tanggal: tglSelesaiIndo || prev.tujuan_1_berangkat_tanggal,
        kembali_tanggal: tglSelesaiIndo || prev.kembali_tanggal,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    toast.success(
      `Data dari Surat Tugas "${st.nomor_surat || st.maksud_tujuan}" berhasil diterapkan ke form Visum.`
    );
  };

  const handleResetDefault = () => {
    if (selectedTemplateId === "manual") {
      handleSelectTemplateOption("manual");
    } else {
      const found =
        templates.find((t) => String(t.id) === selectedTemplateId) ||
        (spdType === "dipa"
          ? templates.find((t) => t.data?.spd_type === "dipa" || t.name.toLowerCase().includes("dipa"))
          : templates.find((t) => t.data?.spd_type === "folu" || t.is_default)) ||
        templates[0];
      if (found) {
        applyTemplateItem(found, true);
      } else {
        const fallback = spdType === "dipa" ? getTemplateDipaTenggarong() : getTemplateKelian();
        setData(fallback);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
        toast.info("Form direset ke template default.");
      }
    }
  };

  // Dynamic 4 Regional Presets using Master Settings (or default fallbacks)
  const applyPresetSamarinda = () => {
    const s = settings?.samarinda;
    const activePpk =
      spdType === "dipa"
        ? settings?.ppk_dipa || { name: "RUSMANTO, S.Hut", nip: "19810907 200012 1 004" }
        : settings?.ppk_folu || settings?.ppk || { name: "Ahmad Hidayat, S.PKP., M.Ling", nip: "19820301 200012 1 001" };

    const nama = s?.official_name || "Dheny Mardiono, S.Hut., MSc.";
    const nip = s?.official_nip || "19750314 199903 1 004";
    const departPos =
      spdType === "dipa"
        ? s?.depart_position_dipa || "Kepala Subbagian Tata Usaha,"
        : s?.depart_position_folu || s?.depart_position || "a.n. Kepala Balai\nKepala Subbagian Tata Usaha";
    const returnPos = s?.return_position || "Kepala Subbagian Tata Usaha";

    setData((prev) => ({
      ...prev,
      asal_tempat: s?.place || "Samarinda",
      asal_jabatan_pengesah: departPos,
      asal_nama_pejabat: nama,
      asal_nip_pejabat: nip,
      tujuan_1_berangkat_ke: s?.place || "Samarinda",
      kembali_tempat: s?.place || "Samarinda",
      kembali_jabatan_pengesah: spdType === "dipa" ? "Pejabat Pembuat Komitmen," : returnPos,
      kembali_nama_pejabat: spdType === "dipa" ? activePpk.name : nama,
      kembali_nip_pejabat: spdType === "dipa" ? activePpk.nip : nip,
      ppk_nama: activePpk.name,
      ppk_nip: activePpk.nip,
      ppk_jabatan: "Pejabat Pembuat Komitmen,",
    }));
    toast.info(`Pejabat Balai diterapkan: ${s?.place || "Samarinda"} (${nama}).`);
  };

  const applyPresetBerau = () => {
    const b = settings?.berau;
    const activePpk =
      spdType === "dipa"
        ? settings?.ppk_dipa || { name: "RUSMANTO, S.Hut", nip: "19810907 200012 1 004" }
        : settings?.ppk_folu || settings?.ppk || { name: "Ahmad Hidayat, S.PKP., M.Ling", nip: "19820301 200012 1 001" };

    const nama = b?.official_name || "Yulian Sadono, S.Hut., M.T.";
    const nip = b?.official_nip || "19800707 200604 1 003";
    const departPos =
      spdType === "dipa"
        ? b?.depart_position_dipa || "Kepala Seksi Konservasi Sumber Daya Alam Wilayah I,"
        : b?.depart_position_folu ||
          b?.depart_position ||
          "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah I";
    const returnPos =
      b?.return_position ||
      "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah I";

    setData((prev) => ({
      ...prev,
      asal_tempat: b?.place || "Berau",
      asal_jabatan_pengesah: departPos,
      asal_nama_pejabat: nama,
      asal_nip_pejabat: nip,
      tujuan_1_berangkat_ke: b?.place || "Berau",
      kembali_tempat: b?.place || "Berau",
      kembali_jabatan_pengesah: spdType === "dipa" ? "Pejabat Pembuat Komitmen," : returnPos,
      kembali_nama_pejabat: spdType === "dipa" ? activePpk.name : nama,
      kembali_nip_pejabat: spdType === "dipa" ? activePpk.nip : nip,
      ppk_nama: activePpk.name,
      ppk_nip: activePpk.nip,
      ppk_jabatan: "Pejabat Pembuat Komitmen,",
    }));
    toast.info(`Pejabat Wilayah I diterapkan: ${b?.place || "Berau"} (${nama}).`);
  };

  const applyPresetTenggarong = () => {
    const t = settings?.tenggarong;
    const activePpk =
      spdType === "dipa"
        ? settings?.ppk_dipa || { name: "RUSMANTO, S.Hut", nip: "19810907 200012 1 004" }
        : settings?.ppk_folu || settings?.ppk || { name: "Ahmad Hidayat, S.PKP., M.Ling", nip: "19820301 200012 1 001" };

    const nama = t?.official_name || "Suriawati Halim, S.Hut., M.P.";
    const nip = t?.official_nip || "19751127 200003 2 001";
    const departPos =
      spdType === "dipa"
        ? t?.depart_position_dipa || "Kepala Seksi Konservasi Sumber Daya Alam Wilayah II,"
        : t?.depart_position_folu ||
          t?.depart_position ||
          "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah II";
    const returnPos =
      t?.return_position ||
      "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah II";

    setData((prev) => ({
      ...prev,
      asal_tempat: t?.place || "Tenggarong",
      asal_jabatan_pengesah: departPos,
      asal_nama_pejabat: nama,
      asal_nip_pejabat: nip,
      tujuan_1_berangkat_ke: t?.place || "Tenggarong",
      kembali_tempat: t?.place || "Tenggarong",
      kembali_jabatan_pengesah: spdType === "dipa" ? "Pejabat Pembuat Komitmen," : returnPos,
      kembali_nama_pejabat: spdType === "dipa" ? activePpk.name : nama,
      kembali_nip_pejabat: spdType === "dipa" ? activePpk.nip : nip,
      ppk_nama: activePpk.name,
      ppk_nip: activePpk.nip,
      ppk_jabatan: "Pejabat Pembuat Komitmen,",
    }));
    toast.info(`Pejabat Wilayah II diterapkan: ${t?.place || "Tenggarong"} (${nama}).`);
  };

  const applyPresetBalikpapan = () => {
    const bp = settings?.balikpapan;
    const activePpk =
      spdType === "dipa"
        ? settings?.ppk_dipa || { name: "RUSMANTO, S.Hut", nip: "19810907 200012 1 004" }
        : settings?.ppk_folu || settings?.ppk || { name: "Ahmad Hidayat, S.PKP., M.Ling", nip: "19820301 200012 1 001" };

    const nama = bp?.official_name || "Bambang Hari Trimarsito, S.Si., M.P.";
    const nip = bp?.official_nip || "19740626 200112 1 004";
    const departPos =
      spdType === "dipa"
        ? bp?.depart_position_dipa || "Kepala Seksi Konservasi Sumber Daya Alam Wilayah III,"
        : bp?.depart_position_folu ||
          bp?.depart_position ||
          "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah III";
    const returnPos =
      bp?.return_position ||
      "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah III";

    setData((prev) => ({
      ...prev,
      asal_tempat: bp?.place || "Balikpapan",
      asal_jabatan_pengesah: departPos,
      asal_nama_pejabat: nama,
      asal_nip_pejabat: nip,
      tujuan_1_berangkat_ke: bp?.place || "Balikpapan",
      kembali_tempat: bp?.place || "Balikpapan",
      kembali_jabatan_pengesah: spdType === "dipa" ? "Pejabat Pembuat Komitmen," : returnPos,
      kembali_nama_pejabat: spdType === "dipa" ? activePpk.name : nama,
      kembali_nip_pejabat: spdType === "dipa" ? activePpk.nip : nip,
      ppk_nama: activePpk.name,
      ppk_nip: activePpk.nip,
      ppk_jabatan: "Pejabat Pembuat Komitmen,",
    }));
    toast.info(`Pejabat Wilayah III diterapkan: ${bp?.place || "Balikpapan"} (${nama}).`);
  };

  // When settings are saved from modal, immediately sync form
  const handleSettingsUpdated = (newSettings?: VisumSpdSettings) => {
    fetchTemplatesAndSettings();
    if (newSettings) {
      setSettings(newSettings);
      setData((prev) => {
        const asalLower = (prev.asal_tempat || "Samarinda").toLowerCase();
        let matchedRegion = newSettings.samarinda;
        if (asalLower.includes("berau")) matchedRegion = newSettings.berau;
        else if (asalLower.includes("tenggarong") || asalLower.includes("kukar"))
          matchedRegion = newSettings.tenggarong;
        else if (asalLower.includes("balikpapan"))
          matchedRegion = newSettings.balikpapan;

        const isDipa = spdType === "dipa";
        const activePpk = isDipa
          ? newSettings.ppk_dipa || {
              name: "RUSMANTO, S.Hut",
              nip: "19810907 200012 1 004",
              position: "Pejabat Pembuat Komitmen,",
              statement:
                "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
            }
          : newSettings.ppk_folu ||
            newSettings.ppk || {
              name: "Ahmad Hidayat, S.PKP., M.Ling",
              nip: "19820301 200012 1 001",
              position: "Pejabat Pembuat Komitmen,",
              statement:
                "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
            };

        const departPosDipa = matchedRegion.depart_position_dipa || matchedRegion.depart_position;
        const departPosFolu = matchedRegion.depart_position_folu || matchedRegion.depart_position;
        const departPos = isDipa ? departPosDipa : departPosFolu;

        const next = {
          ...prev,
          asal_nama_pejabat: matchedRegion.official_name,
          asal_nip_pejabat: matchedRegion.official_nip,
          asal_jabatan_pengesah: departPos,
          kembali_nama_pejabat: isDipa ? activePpk.name : matchedRegion.official_name,
          kembali_nip_pejabat: isDipa ? activePpk.nip : matchedRegion.official_nip,
          kembali_jabatan_pengesah: isDipa ? "Pejabat Pembuat Komitmen," : matchedRegion.return_position,
          ppk_nama: activePpk.name,
          ppk_nip: activePpk.nip,
          ppk_jabatan: activePpk.position || prev.ppk_jabatan,
          ppk_keterangan: activePpk.statement || prev.ppk_keterangan,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 dark:border-amber-500/20 dark:from-amber-500/15">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{isPortal ? "PORTAL PEGAWAI / LEMBAR VISUM SPD" : "MODUL KEUANGAN / LEMBAR VISUM SPD"}</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Lembar Visum Perjalanan Dinas
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {isPortal
              ? "Isi rute dan cetak lembar Visum SPD untuk melengkapi bukti perjalanan dinas Anda."
              : "Cetak lembar belakang SPD sebelum pelaksanaan SPJ. Mendukung cetak blanko kosong, cetak parsial sisi Balai, lengkap, maupun cetak tumpuk (overlay nilai saja)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* TIPE SPD ANGGARAN TOGGLE / SWITCHER */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-xs dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => handleSwitchSpdType("dipa")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                spdType === "dipa"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>🏛️ SPD DIPA</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchSpdType("folu")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                spdType === "folu"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
              }`}
            >
              <span>🌿 SPD FOLU</span>
            </button>
          </div>

          {/* Template Selector Dropdown */}
          {(() => {
            const dipaTemplates = templates
              .filter(
                (t) =>
                  (t.data?.spd_type || "").toLowerCase() === "dipa" ||
                  t.name.toUpperCase().includes("DIPA")
              )
              .sort((a, b) => getRegionRank(a.name) - getRegionRank(b.name));

            const foluTemplates = templates
              .filter(
                (t) =>
                  (t.data?.spd_type || "").toLowerCase() === "folu" ||
                  t.name.toUpperCase().includes("FOLU") ||
                  t.name.toLowerCase().includes("kelian")
              )
              .sort((a, b) => getRegionRank(a.name) - getRegionRank(b.name));

            const otherTemplates = templates.filter(
              (t) =>
                !dipaTemplates.some((dt) => dt.id === t.id) &&
                !foluTemplates.some((ft) => ft.id === t.id)
            );

            const activeTemplates = spdType === "dipa" ? dipaTemplates : foluTemplates;
            const categoryLabel =
              spdType === "dipa" ? "🏛️ Template SPD DIPA" : "🌿 Template SPD FOLU";

            return (
              <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-xs dark:border-zinc-700 dark:bg-zinc-900">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Template:
                </span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplateOption(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-800 outline-none dark:text-zinc-200 cursor-pointer max-w-[220px] truncate"
                >
                  <option value="manual" className="dark:bg-zinc-900 font-semibold text-amber-700 dark:text-amber-400">
                    ✏️ Manual (Kosong)
                  </option>

                  {activeTemplates.length > 0 && (
                    <optgroup label={categoryLabel} className="dark:bg-zinc-900 font-bold">
                      {activeTemplates.map((t) => (
                        <option key={t.id} value={String(t.id)} className="dark:bg-zinc-900 font-normal">
                          {cleanTemplateName(t.name)} {t.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {otherTemplates.length > 0 && (
                    <optgroup label="🌐 Template Lainnya" className="dark:bg-zinc-900 font-bold">
                      {otherTemplates.map((t) => (
                        <option key={t.id} value={String(t.id)} className="dark:bg-zinc-900 font-normal">
                          {cleanTemplateName(t.name)} {t.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            );
          })()}

          {/* Admin-Only: Manage Templates & Officials Modal Button */}
          {!isPortal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManageModalOpen(true)}
              title="Kelola daftar template dan master pejabat 4 wilayah"
              className="rounded-xl border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              <span>Kelola Template</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefault}
            className="rounded-xl border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Grid: Form Left (5 cols), Preview Right (7 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT COLUMN: FORM CONTROLS (5 cols on xl) */}
        <div className="space-y-5 xl:col-span-5">
          {/* Portal Only: Tarik Data dari Surat Tugas Aktif Saya */}
          {isPortal && suratTugasList && suratTugasList.length > 0 && (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-1.5">
                <ClipboardList className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Tarik Data dari Surat Tugas Saya (Opsional)
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-2.5">
                Pilih Surat Tugas aktif Anda untuk mengisi otomatis tujuan dan tanggal perjalanan dinas.
              </p>
              <select
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (!selectedId) return;
                  const st = suratTugasList.find((s) => String(s.id) === selectedId);
                  if (st) {
                    handleApplySuratTugas(st);
                  }
                }}
                defaultValue=""
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-700/50 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">-- Pilih Surat Tugas Aktif Anda --</option>
                {suratTugasList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nomor_surat || "Tanpa Nomor"} — {st.maksud_tujuan}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Card: Mode & Toggle Cetak */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Opsi & Mode Cetak
                </h3>
              </div>
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                Preset Cepat
              </Badge>
            </div>

            {/* Quick Presets (3 Pilihan) */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setShowTableBorder(true);
                  setIncludeBalaiData(true);
                  setIncludeDestinationData(true);
                }}
                className={`rounded-xl border p-2.5 text-left text-xs transition ${
                  showTableBorder && includeBalaiData && includeDestinationData
                    ? "border-amber-500 bg-amber-50 font-bold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <p className="font-semibold">Lengkap Semua Data</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Tabel + Balai + Tujuan</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTableBorder(true);
                  setIncludeBalaiData(false);
                  setIncludeDestinationData(false);
                }}
                className={`rounded-xl border p-2.5 text-left text-xs transition ${
                  showTableBorder && !includeBalaiData && !includeDestinationData
                    ? "border-amber-500 bg-amber-50 font-bold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <p className="font-semibold">Blanko Kosong</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Hanya garis & label</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTableBorder(false);
                  setIncludeBalaiData(true);
                  setIncludeDestinationData(true);
                }}
                className={`rounded-xl border p-2.5 text-left text-xs transition ${
                  !showTableBorder
                    ? "border-amber-500 bg-amber-50 font-bold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <p className="font-semibold">Nilai Saja (Overlay)</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Untuk form cetak fisik</p>
              </button>
            </div>

            {/* Individual Switches */}
            <div className="mt-4 space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Cetak Garis Tabel & Label Blanko
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Matikan jika mencetak di atas kertas form fisik yang sudah ada garisnya.
                  </p>
                </div>
                <Switch
                  checked={showTableBorder}
                  onCheckedChange={setShowTableBorder}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Cetak Data Keberangkatan & Balai (I & VI)
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Kota asal, tanggal berangkat, pengesah Balai, tiba kembali, dan PPK.
                  </p>
                </div>
                <Switch
                  checked={includeBalaiData}
                  onCheckedChange={setIncludeBalaiData}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Cetak Data Tujuan / Lapangan (II)
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Kota tujuan, tanggal tiba di tujuan, pejabat lapangan, dan tanggal berangkat kembali.
                  </p>
                </div>
                <Switch
                  checked={includeDestinationData}
                  onCheckedChange={setIncludeDestinationData}
                />
              </div>
            </div>
          </div>

          {/* Quick Pejabat Presets 4 Wilayah (2x2 Grid for spacious layout without overflow) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Pilihan Pejabat Balai / Wilayah:
              </span>
              <span className="text-[10px] text-zinc-400">4 Wilayah Kerja</span>
            </div>
            {/* Dynamic 4 Regional Presets */}
            {(() => {
              const currentOfficial = data.asal_nama_pejabat || "";
              const currentPlace = (data.asal_tempat || "").toLowerCase();

              const isSamarindaActive =
                currentOfficial === (settings?.samarinda?.official_name || "Dheny Mardiono, S.Hut., MSc.") ||
                (currentPlace.includes("samarinda") && !currentOfficial);

              const isBerauActive =
                currentOfficial === (settings?.berau?.official_name || "Yulian Sadono, S.Hut., M.T.") ||
                (currentPlace.includes("berau") && !currentOfficial);

              const isTenggarongActive =
                currentOfficial === (settings?.tenggarong?.official_name || "Suriawati Halim, S.Hut., M.P.") ||
                ((currentPlace.includes("tenggarong") || currentPlace.includes("kukar")) && !currentOfficial);

              const isBalikpapanActive =
                currentOfficial === (settings?.balikpapan?.official_name || "Bambang Hari Trimarsito, S.Si., M.P.") ||
                (currentPlace.includes("balikpapan") && !currentOfficial);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyPresetSamarinda}
                    className={`h-auto flex-col items-start justify-start p-3 text-left text-xs rounded-xl border transition cursor-pointer ${
                      isSamarindaActive
                        ? "border-amber-500 bg-amber-50/85 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300 font-semibold ring-2 ring-amber-500/40 shadow-xs"
                        : "border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{settings?.samarinda?.place || "Samarinda"}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">
                        Balai
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate w-full" title={settings?.samarinda?.official_name || "Dheny Mardiono, S.Hut., MSc."}>
                      {settings?.samarinda?.official_name || "Dheny Mardiono, S.Hut., MSc."}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full mt-0.5">
                      {settings?.samarinda?.return_position?.split("\n")[0] || "Kasubbag Tata Usaha"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyPresetBerau}
                    className={`h-auto flex-col items-start justify-start p-3 text-left text-xs rounded-xl border transition cursor-pointer ${
                      isBerauActive
                        ? "border-amber-500 bg-amber-50/85 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300 font-semibold ring-2 ring-amber-500/40 shadow-xs"
                        : "border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{settings?.berau?.place || "Berau"}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">
                        Wil. I
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate w-full" title={settings?.berau?.official_name || "Yulian Sadono, S.Hut., M.T."}>
                      {settings?.berau?.official_name || "Yulian Sadono, S.Hut., M.T."}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full mt-0.5">
                      {settings?.berau?.return_position?.split("\n")[0] || "Kepala Seksi Wil. I"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyPresetTenggarong}
                    className={`h-auto flex-col items-start justify-start p-3 text-left text-xs rounded-xl border transition cursor-pointer ${
                      isTenggarongActive
                        ? "border-amber-500 bg-amber-50/85 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300 font-semibold ring-2 ring-amber-500/40 shadow-xs"
                        : "border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{settings?.tenggarong?.place || "Tenggarong"}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">
                        Wil. II
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate w-full" title={settings?.tenggarong?.official_name || "Suriawati Halim, S.Hut., M.P."}>
                      {settings?.tenggarong?.official_name || "Suriawati Halim, S.Hut., M.P."}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full mt-0.5">
                      {settings?.tenggarong?.return_position?.split("\n")[0] || "Kepala Seksi Wil. II"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyPresetBalikpapan}
                    className={`h-auto flex-col items-start justify-start p-3 text-left text-xs rounded-xl border transition cursor-pointer ${
                      isBalikpapanActive
                        ? "border-amber-500 bg-amber-50/85 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300 font-semibold ring-2 ring-amber-500/40 shadow-xs"
                        : "border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>{settings?.balikpapan?.place || "Balikpapan"}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase text-purple-700 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-500/20 px-1.5 py-0.5 rounded">
                        Wil. III
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate w-full" title={settings?.balikpapan?.official_name || "Bambang Hari T."}>
                      {settings?.balikpapan?.official_name || "Bambang Hari T."}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full mt-0.5">
                      {settings?.balikpapan?.return_position?.split("\n")[0] || "Kepala Seksi Wil. III"}
                    </span>
                  </Button>
                </div>
              );
            })()}
          </div>

          {/* SECTION I: BERANGKAT DARI TEMPAT KEDUDUKAN */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <MapPin className="h-4 w-4 text-amber-600" />
              <span>I. Berangkat dari Tempat Kedudukan</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Tempat Kedudukan (Asal)
                </label>
                <input
                  type="text"
                  value={data.asal_tempat}
                  onChange={(e) => updateData("asal_tempat", e.target.value)}
                  placeholder="Samarinda"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Pada Tanggal Berangkat
                </label>
                <IndoDatePicker
                  value={data.asal_tanggal}
                  onChange={(v) => updateData("asal_tanggal", v)}
                  placeholder="23 April 2026"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Ke (Tempat Tujuan Awal)
                </label>
                <input
                  type="text"
                  value={data.tujuan_awal}
                  onChange={(e) => updateData("tujuan_awal", e.target.value)}
                  placeholder="Kabupaten Kutai Barat"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Jabatan Pengesah Berangkat
                </label>
                <textarea
                  rows={2}
                  value={data.asal_jabatan_pengesah}
                  onChange={(e) => updateData("asal_jabatan_pengesah", e.target.value)}
                  placeholder="a.n. Kepala Balai&#10;Kepala Subbagian Tata Usaha"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Nama Pejabat Berangkat
                </label>
                <input
                  type="text"
                  value={data.asal_nama_pejabat}
                  onChange={(e) => updateData("asal_nama_pejabat", e.target.value)}
                  placeholder="Dheny Mardiono, S.Hut., MSc."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  NIP Pejabat Berangkat
                </label>
                <input
                  type="text"
                  value={data.asal_nip_pejabat}
                  onChange={(e) => updateData("asal_nip_pejabat", e.target.value)}
                  placeholder="19750314 199903 1 004"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION II: TIBA DI TUJUAN & BERANGKAT KEMBALI */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Building2 className="h-4 w-4 text-amber-600" />
              <span>II. Tiba di Tujuan & Berangkat Kembali</span>
            </div>

            <div className="space-y-4">
              {/* Kolom Kiri II: Tiba di */}
              <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                  Tiba di Lokasi Tujuan:
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Tiba di</label>
                    <input
                      type="text"
                      value={data.tujuan_1_tempat}
                      onChange={(e) => updateData("tujuan_1_tempat", e.target.value)}
                      placeholder="Kabupaten Kutai Barat"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal</label>
                    <IndoDatePicker
                      value={data.tujuan_1_tiba_tanggal}
                      onChange={(v) => updateData("tujuan_1_tiba_tanggal", v)}
                      placeholder="23 April 2026"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Jabatan Pejabat Tujuan</label>
                    <input
                      type="text"
                      value={data.tujuan_1_kepala_jabatan}
                      onChange={(e) => updateData("tujuan_1_kepala_jabatan", e.target.value)}
                      placeholder="Plt. Manager Camp PT. HLKL"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Nama Pejabat Tujuan</label>
                    <input
                      type="text"
                      value={data.tujuan_1_kepala_nama}
                      onChange={(e) => updateData("tujuan_1_kepala_nama", e.target.value)}
                      placeholder="Theodorus Dedi"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Nomor Identitas Pejabat Tujuan (Opsional)
                      </label>
                      <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => updateData("tujuan_1_id_type", "NIP")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            (data.tujuan_1_id_type || "NIP") === "NIP"
                              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          NIP
                        </button>
                        <button
                          type="button"
                          onClick={() => updateData("tujuan_1_id_type", "NIK")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            data.tujuan_1_id_type === "NIK"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          NIK
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={data.tujuan_1_kepala_nip || ""}
                      onChange={(e) => updateData("tujuan_1_kepala_nip", e.target.value)}
                      placeholder={
                        data.tujuan_1_id_type === "NIK"
                          ? "Masukkan 16 digit NIK (misal: 6402...)"
                          : "Kosongkan jika bukan ASN / swasta"
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Kanan II: Berangkat dari */}
              <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                  Berangkat Kembali dari Tujuan:
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Berangkat Dari</label>
                    <input
                      type="text"
                      value={data.tujuan_1_berangkat_dari}
                      onChange={(e) => updateData("tujuan_1_berangkat_dari", e.target.value)}
                      placeholder="Kabupaten Kutai Barat"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Ke</label>
                    <input
                      type="text"
                      value={data.tujuan_1_berangkat_ke}
                      onChange={(e) => updateData("tujuan_1_berangkat_ke", e.target.value)}
                      placeholder="Samarinda"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal</label>
                    <IndoDatePicker
                      value={data.tujuan_1_berangkat_tanggal}
                      onChange={(v) => updateData("tujuan_1_berangkat_tanggal", v)}
                      placeholder="30 April 2026"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Jabatan Pejabat Berangkat</label>
                    <input
                      type="text"
                      value={data.tujuan_1_berangkat_kepala_jabatan || ""}
                      onChange={(e) => updateData("tujuan_1_berangkat_kepala_jabatan", e.target.value)}
                      placeholder="Plt. Manager Camp PT. HLKL"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Nama Pejabat Berangkat</label>
                    <input
                      type="text"
                      value={data.tujuan_1_berangkat_kepala_nama}
                      onChange={(e) => updateData("tujuan_1_berangkat_kepala_nama", e.target.value)}
                      placeholder="Theodorus Dedi"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Identitas Pejabat Berangkat
                      </label>
                      <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => updateData("tujuan_1_berangkat_id_type", "NIP")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            (data.tujuan_1_berangkat_id_type || "NIP") === "NIP"
                              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          NIP
                        </button>
                        <button
                          type="button"
                          onClick={() => updateData("tujuan_1_berangkat_id_type", "NIK")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            data.tujuan_1_berangkat_id_type === "NIK"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          NIK
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={data.tujuan_1_berangkat_kepala_nip || ""}
                      onChange={(e) => updateData("tujuan_1_berangkat_kepala_nip", e.target.value)}
                      placeholder={
                        data.tujuan_1_berangkat_id_type === "NIK"
                          ? "Masukkan 16 digit NIK"
                          : "Kosongkan jika bukan ASN / swasta"
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC DESTINATIONS: III, IV, V */}
          {hasTransit3 && (
            <TransitDestinationCard
              romNum="III"
              title="Destinasi Lanjutan / Transit 1"
              item={data.transit_3}
              onChange={(f, v) => updateTransitData("transit_3", f, v)}
              onRemove={() => handleRemoveTransit("transit_3", "III")}
            />
          )}

          {hasTransit4 && (
            <TransitDestinationCard
              romNum="IV"
              title="Destinasi Lanjutan / Transit 2"
              item={data.transit_4}
              onChange={(f, v) => updateTransitData("transit_4", f, v)}
              onRemove={() => handleRemoveTransit("transit_4", "IV")}
            />
          )}

          {hasTransit5 && (
            <TransitDestinationCard
              romNum="V"
              title="Destinasi Lanjutan / Transit 3"
              item={data.transit_5}
              onChange={(f, v) => updateTransitData("transit_5", f, v)}
              onRemove={() => handleRemoveTransit("transit_5", "V")}
            />
          )}

          {/* Button: + Tambah Destinasi Lanjutan */}
          {(!hasTransit3 || !hasTransit4 || !hasTransit5) && (
            <button
              type="button"
              onClick={handleAddNextTransit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 py-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100/70 hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-300 dark:hover:bg-amber-500/10"
            >
              <Plus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>
                + Tambah Destinasi Lanjutan ({!hasTransit3 ? "III" : !hasTransit4 ? "IV" : "V"})
              </span>
            </button>
          )}

          {/* SECTION VI: TIBA KEMBALI & PEMERIKSAAN PPK */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <UserCheck className="h-4 w-4 text-amber-600" />
              <span>VI. Tiba Kembali di Balai & Pengesahan PPK</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Tiba Kembali di
                </label>
                <input
                  type="text"
                  value={data.kembali_tempat}
                  onChange={(e) => updateData("kembali_tempat", e.target.value)}
                  placeholder="Samarinda"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Pada Tanggal Kembali
                </label>
                <IndoDatePicker
                  value={data.kembali_tanggal}
                  onChange={(v) => updateData("kembali_tanggal", v)}
                  placeholder="30 April 2026"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Quick Switch for Signatory VI Kiri */}
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  Pengesah Tiba (VI Kiri):
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const activePpk =
                        spdType === "dipa"
                          ? settings?.ppk_dipa || { name: "RUSMANTO, S.Hut", nip: "19810907 200012 1 004" }
                          : settings?.ppk_folu || settings?.ppk || { name: "Ahmad Hidayat, S.PKP., M.Ling", nip: "19820301 200012 1 001" };
                      updateData("kembali_jabatan_pengesah", "Pejabat Pembuat Komitmen,");
                      updateData("kembali_nama_pejabat", activePpk.name);
                      updateData("kembali_nip_pejabat", activePpk.nip);
                      toast.success(`Pengesah Tiba diset ke PPK (${activePpk.name})`);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                      data.kembali_jabatan_pengesah.toLowerCase().includes("pembuat komitmen")
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    Set PPK ({spdType === "dipa" ? "Rusmanto" : "Ahmad H."})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const asalLower = (data.asal_tempat || "Samarinda").toLowerCase();
                      let matchedRegion = settings?.samarinda;
                      if (asalLower.includes("berau")) matchedRegion = settings?.berau;
                      else if (asalLower.includes("tenggarong") || asalLower.includes("kukar"))
                        matchedRegion = settings?.tenggarong;
                      else if (asalLower.includes("balikpapan"))
                        matchedRegion = settings?.balikpapan;

                      const pos = matchedRegion?.return_position || "Kepala Subbagian Tata Usaha";
                      const name = matchedRegion?.official_name || "Dheny Mardiono, S.Hut., MSc.";
                      const nip = matchedRegion?.official_nip || "19750314 199903 1 004";

                      updateData("kembali_jabatan_pengesah", pos);
                      updateData("kembali_nama_pejabat", name);
                      updateData("kembali_nip_pejabat", nip);
                      toast.success(`Pengesah Tiba diset ke Pejabat Wilayah (${name})`);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                      !data.kembali_jabatan_pengesah.toLowerCase().includes("pembuat komitmen")
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    Set Pejabat Balai/Wilayah
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Jabatan Pengesah Tiba Kembali
                </label>
                <textarea
                  rows={2}
                  value={data.kembali_jabatan_pengesah}
                  onChange={(e) => updateData("kembali_jabatan_pengesah", e.target.value)}
                  placeholder="Kepala Subbagian Tata Usaha"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Nama Pejabat Tiba
                </label>
                <input
                  type="text"
                  value={data.kembali_nama_pejabat}
                  onChange={(e) => updateData("kembali_nama_pejabat", e.target.value)}
                  placeholder="Dheny Mardiono, S.Hut., MSc."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  NIP Pejabat Tiba
                </label>
                <input
                  type="text"
                  value={data.kembali_nip_pejabat}
                  onChange={(e) => updateData("kembali_nip_pejabat", e.target.value)}
                  placeholder="19750314 199903 1 004"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* PPK Block */}
              <div className="sm:col-span-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
                  Pejabat Pembuat Komitmen (PPK):
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Nama PPK
                    </label>
                    <input
                      type="text"
                      value={data.ppk_nama}
                      onChange={(e) => updateData("ppk_nama", e.target.value)}
                      placeholder="Ahmad Hidayat, S.PKP., M.Ling"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      NIP PPK
                    </label>
                    <input
                      type="text"
                      value={data.ppk_nip}
                      onChange={(e) => updateData("ppk_nip", e.target.value)}
                      placeholder="19820301 200012 1 001"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW (7 cols on xl for large readable preview) */}
        <div className="space-y-4 xl:col-span-7">
          <div className="sticky top-20">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Preview Lembar Visum SPD
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Format A4 Portrait · Tampilan langsung sesuai hasil cetak
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(0.5, Number((z - 0.05).toFixed(2))))}
                      className="rounded p-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      title="Perkecil Tampilan"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[36px] text-center font-bold text-zinc-700 dark:text-zinc-200 text-[11px]">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(1.25, Number((z + 0.05).toFixed(2))))}
                      className="rounded p-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      title="Perbesar Tampilan"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(0.85)}
                      className="ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                      title="Ukuran Pas (85%)"
                    >
                      Fit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(1.0)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                      title="Ukuran Penuh 100%"
                    >
                      100%
                    </button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handlePrintVisumSpd("visum-spd-print-root", showTableBorder)}
                    className="rounded-xl bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-500 shadow-sm"
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Cetak Lembar Visum
                  </Button>
                </div>
              </div>

              {/* Scaled A4 Paper Frame (Single Unified Sheet, Zero Scrollbar) */}
              <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80 p-2 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950 flex justify-center">
                <div
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: "top center",
                    marginBottom: `${(previewZoom - 1) * 1140}px`,
                    width: "210mm",
                  }}
                  className="transition-all duration-150 shrink-0"
                >
                  <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl ring-1 ring-zinc-900/10 px-[12mm] py-[8mm] mx-auto box-border">
                    <VisumSpdDocument
                      data={data}
                      documentId="visum-spd-print-root"
                      includeBalaiData={includeBalaiData}
                      includeDestinationData={includeDestinationData}
                      showTableBorder={showTableBorder}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Modals (Only when not in portal mode) */}
      {!isPortal && (
        <>
          {/* MODAL 1: KELOLA TEMPLATE & PEJABAT 4 WILAYAH */}
          <VisumManageTemplatesModal
            open={isManageModalOpen}
            onOpenChange={setIsManageModalOpen}
            onTemplatesUpdated={fetchTemplatesAndSettings}
            onSettingsUpdated={handleSettingsUpdated}
            employeeOptions={employeeOptions}
          />

          {/* MODAL 2: SIMPAN FORM INI SEBAGAI TEMPLATE */}
          <VisumSaveAsTemplateModal
            open={isSaveAsModalOpen}
            onOpenChange={setIsSaveAsModalOpen}
            currentFormData={data}
            onTemplateSaved={(newId) => {
              fetchTemplatesAndSettings();
              if (newId) {
                setSelectedTemplateId(String(newId));
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function TransitDestinationCard({
  romNum,
  title,
  item,
  onChange,
  onRemove,
}: {
  romNum: string;
  title: string;
  item?: VisumTransitItem;
  onChange: (field: keyof VisumTransitItem, value: any) => void;
  onRemove: () => void;
}) {
  const d = item || {};
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-xs dark:border-amber-500/20 dark:bg-zinc-900 transition-all">
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
          <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>
            {romNum}. {title}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          <span>Hapus {romNum}</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Kolom Kiri: Tiba di */}
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Tiba di Destinasi {romNum}:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Lokasi Tujuan (Tiba di)
              </label>
              <input
                type="text"
                value={d.tiba_di || ""}
                onChange={(e) => onChange("tiba_di", e.target.value)}
                placeholder="Nama Kota / Pos / Resort Lapangan"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal Tiba</label>
              <IndoDatePicker
                value={d.tiba_tanggal || ""}
                onChange={(v) => onChange("tiba_tanggal", v)}
                placeholder="Pilih tanggal tiba"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Jabatan Pejabat Lapangan
              </label>
              <input
                type="text"
                value={d.tiba_kepala_jabatan || ""}
                onChange={(e) => {
                  onChange("tiba_kepala_jabatan", e.target.value);
                  if (!d.berangkat_kepala_jabatan) {
                    onChange("berangkat_kepala_jabatan", e.target.value);
                  }
                }}
                placeholder="Kepala Resort / Camat / Manager"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Nama Pejabat Lapangan
              </label>
              <input
                type="text"
                value={d.tiba_kepala_nama || ""}
                onChange={(e) => {
                  onChange("tiba_kepala_nama", e.target.value);
                  if (!d.berangkat_kepala_nama) {
                    onChange("berangkat_kepala_nama", e.target.value);
                  }
                }}
                placeholder="Nama Pejabat Pengesah"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Identitas Pejabat Lapangan (NIP / NIK)
                </label>
                <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => onChange("tiba_id_type", "NIP")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      (d.tiba_id_type || "NIP") === "NIP"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange("tiba_id_type", "NIK")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      d.tiba_id_type === "NIK"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIK
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={d.tiba_kepala_nip || ""}
                onChange={(e) => {
                  onChange("tiba_kepala_nip", e.target.value);
                  if (!d.berangkat_kepala_nip) {
                    onChange("berangkat_kepala_nip", e.target.value);
                  }
                }}
                placeholder={
                  d.tiba_id_type === "NIK"
                    ? "Masukkan 16 digit NIK"
                    : "Kosongkan jika bukan ASN / swasta"
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Berangkat dari */}
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-950">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Berangkat Kembali / Melanjutkan dari {romNum}:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Berangkat Dari
              </label>
              <input
                type="text"
                value={d.berangkat_dari || d.tiba_di || ""}
                onChange={(e) => onChange("berangkat_dari", e.target.value)}
                placeholder="Lokasi Berangkat"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Ke (Destinasi Selanjutnya)
              </label>
              <input
                type="text"
                value={d.berangkat_ke || ""}
                onChange={(e) => onChange("berangkat_ke", e.target.value)}
                placeholder="Kota / Destinasi Selanjutnya"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">Pada Tanggal</label>
              <IndoDatePicker
                value={d.berangkat_tanggal || ""}
                onChange={(v) => onChange("berangkat_tanggal", v)}
                placeholder="Pilih tanggal berangkat"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Jabatan Pejabat Berangkat
              </label>
              <input
                type="text"
                value={d.berangkat_kepala_jabatan || ""}
                onChange={(e) => onChange("berangkat_kepala_jabatan", e.target.value)}
                placeholder="Kepala Resort / Camat / Manager"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Nama Pejabat Berangkat
              </label>
              <input
                type="text"
                value={d.berangkat_kepala_nama || ""}
                onChange={(e) => onChange("berangkat_kepala_nama", e.target.value)}
                placeholder="Nama Pejabat Pengesah"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Identitas Pejabat Berangkat
                </label>
                <div className="flex items-center gap-1 rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => onChange("berangkat_id_type", "NIP")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      (d.berangkat_id_type || "NIP") === "NIP"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange("berangkat_id_type", "NIK")}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      d.berangkat_id_type === "NIK"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    NIK
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={d.berangkat_kepala_nip || ""}
                onChange={(e) => onChange("berangkat_kepala_nip", e.target.value)}
                placeholder={
                  d.berangkat_id_type === "NIK"
                    ? "Masukkan 16 digit NIK"
                    : "Kosongkan jika bukan ASN / swasta"
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
