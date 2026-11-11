"use client";

import { DialogTitle } from "@/components/ui/dialog";
import { SuratTugasDialog } from "@/app/surat-tugas/_components/SuratTugasDialog";
import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  FileText,
  Banknote,
  Search,
  SlidersHorizontal,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Italic,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { toggleItalicInTextarea } from "@/lib/letter-utils";
import { EditableItemListSection } from "../../../surat-tugas/_components/EditableItemListSection";
import STBuilderPreview from "../../../surat-tugas/_components/STBuilderPreview";
import {
  resolveKopImageUrl,
  isFundingDasarText,
  isGeneratedLaporanItem,
  isGeneratedBiayaItem,
  buildKegiatanDiktumText,
  buildBiayaTextFor,
  normalizeTaskTypeName,
  type DasarItem,
  type Employee,
  type StTemplate,
  type StExpenseTemplate,
} from "../../../surat-tugas/_lib";
import { templateCodeFromName, errorMessage } from "./utils";

type TemplateKind = StTemplate["type"];

const TEMPLATE_TYPES: Array<{ value: TemplateKind; label: string }> = [
  { value: "standard", label: "Standard (Tanpa Lampiran)" },
  { value: "bmn", label: "BMN" },
  { value: "beda_hari", label: "Beda Hari (Ada Lampiran Tabel Jadwal)" },
  { value: "plh", label: "PLH" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_NOMOR_SURAT_FORMAT = "/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}";

export function StTemplatesTab() {
  const { canWrite } = useRole();
  const [templates, setTemplates] = useState<StTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenseTemplates, setExpenseTemplates] = useState<StExpenseTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateStatusFilter, setTemplateStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deleteTarget, setDeleteTarget] = useState<StTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTemplateSubmitting, setIsTemplateSubmitting] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateType, setTemplateType] = useState<TemplateKind>("custom");
  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([]);
  const [signerId, setSignerId] = useState("");
  const [templateIsActive, setTemplateIsActive] = useState(true);
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  const [templateBiayaText, setTemplateBiayaText] = useState("");
  const [nomorSuratFormat, setNomorSuratFormat] = useState(DEFAULT_NOMOR_SURAT_FORMAT);
  const [nomorFormatMode, setNomorFormatMode] = useState<"default" | "manual">("default");
  const [nomorNumberingType, setNomorNumberingType] = useState<"st_pattern" | "naskah_auto">("st_pattern");
  const [defaultJenisTugas, setDefaultJenisTugas] = useState<string>("Perjalanan Dinas Luar Wilayah");
  const [defaultSertakanLaporan, setDefaultSertakanLaporan] = useState<boolean>(true);
  const [availableTaskTypes, setAvailableTaskTypes] = useState<
    Array<{
      id: number;
      nama: string;
      kode: string;
      mode_lokasi: string;
      aturan_durasi: string;
      default_sertakan_laporan: boolean;
      contoh_format?: string | null;
      keterangan?: string | null;
    }>
  >([]);

  useEffect(() => {
    api.get("/kepegawaian/st-task-types/public")
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setAvailableTaskTypes(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const activeTaskType = useMemo(() => {
    return availableTaskTypes.find((t) => t.nama === defaultJenisTugas) || null;
  }, [availableTaskTypes, defaultJenisTugas]);

  const handleDefaultJenisTugasChange = (val: string) => {
    const normalized = normalizeTaskTypeName(val);
    setDefaultJenisTugas(normalized);
    const matched = availableTaskTypes.find((t) => t.nama === normalized);
    if (matched && typeof matched.default_sertakan_laporan === "boolean") {
      setDefaultSertakanLaporan(matched.default_sertakan_laporan);
    }
  };
  const [defaultModeKegiatan, setDefaultModeKegiatan] = useState<"structured" | "manual">("structured");
  const [defaultKegiatan, setDefaultKegiatan] = useState<string>("");
  const [untukItems, setUntukItems] = useState<DasarItem[]>([]);
  const [templateConfiguration, setTemplateConfiguration] = useState<Record<string, unknown>>({});
  const [headerTitle, setHeaderTitle] = useState("KEPALA BALAI,");
  const [penutupText, setPenutupText] = useState(
    "Demikian untuk dilaksanakan dengan penuh tanggung jawab."
  );
  const [dateFormatStyle, setDateFormatStyle] = useState<"inline" | "tabular">("inline");
  const [signerAuthorityMandate, setSignerAuthorityMandate] = useState("");
  const [signerTitle, setSignerTitle] = useState("Kepala Balai,");
  const [tembusanItems, setTembusanItems] = useState<string[]>([]);
  const [tembusanPosition, setTembusanPosition] = useState<"beside" | "bottom">("beside");
  const [tembusanLabel, setTembusanLabel] = useState("Tembusan:");
  const [defaultSumberDana, setDefaultSumberDana] = useState("");
  const [kopImageUrl, setKopImageUrl] = useState<string | null>(null);
  const [kopMode, setKopMode] = useState<"default" | "custom">("default");
  const [isUploadingKop, setIsUploadingKop] = useState(false);
  const [previewScale, setPreviewScale] = useState<number>(0.7);
  const [activeCard, setActiveCard] = useState<number>(1);
  const isClickingPillRef = useRef(false);
  const headerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const defaultKegiatanRef = useRef<HTMLTextAreaElement | null>(null);

  const currentYear = new Date().getFullYear().toString();

  const applyItalicToHeader = () => {
    if (headerTextareaRef.current) {
      toggleItalicInTextarea(headerTextareaRef.current, headerTitle, setHeaderTitle);
    }
  };

  const applyItalicToDefaultKegiatan = () => {
    if (defaultKegiatanRef.current) {
      toggleItalicInTextarea(defaultKegiatanRef.current, defaultKegiatan, setDefaultKegiatan);
    }
  };

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoadingTemplates(true);
      const response = await api.get("/kepegawaian/st-templates?include_inactive=true&per_page=100");
      setTemplates(response.data?.data || []);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal memuat template ST"));
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/kepegawaian/employees/select");
      setEmployees(response.data?.data || []);
    } catch {
      toast.error("Daftar pegawai penandatangan gagal dimuat");
    }
  }, []);

  const fetchExpenseTemplates = useCallback(async () => {
    try {
      const response = await api.get(
        "/kepegawaian/st-expense-templates?include_inactive=true&per_page=100"
      );
      setExpenseTemplates(response.data?.data || []);
    } catch {
      // Non-critical for ST templates
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
    void fetchEmployees();
    void fetchExpenseTemplates();
  }, [fetchTemplates, fetchEmployees, fetchExpenseTemplates]);

  // Auto-scrollspy for the 7 template form cards based on dominant visible area
  useEffect(() => {
    if (!isTemplateFormOpen) return;

    const cardIds = [1, 2, 3, 4, 5, 6, 7];

    const updateActiveCard = () => {
      if (isClickingPillRef.current) return;

      const main = document.querySelector("main");
      if (main && main.scrollHeight - main.scrollTop - main.clientHeight < 50) {
        setActiveCard(7);
        return;
      }

      const headerEl = document.getElementById("template-form-sticky-header");
      const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 140;
      const viewportBottom = window.innerHeight;

      let maxVisibleHeight = -1;
      let bestCard = 1;

      for (const id of cardIds) {
        const el = document.getElementById(`card-template-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const visibleTop = Math.max(rect.top, headerBottom);
          const visibleBottom = Math.min(rect.bottom, viewportBottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            bestCard = id;
          }
        }
      }

      if (maxVisibleHeight > 0) {
        setActiveCard(bestCard);
      }
    };

    let ticking = false;
    const handleScroll = () => {
      if (isClickingPillRef.current) return;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveCard();
          ticking = false;
        });
        ticking = true;
      }
    };

    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    updateActiveCard();

    return () => {
      if (mainEl) {
        mainEl.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleScroll);
    };
  }, [isTemplateFormOpen]);

  const scrollToCard = (cardNum: number) => {
    setActiveCard(cardNum);
    isClickingPillRef.current = true;
    const el = document.getElementById(`card-template-${cardNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      isClickingPillRef.current = false;
    }, 700);
  };

  const handleAddDasarItem = () => {
    setDasarItems((prev) => {
      const fundingIdx = prev.findIndex((item) => isFundingDasarText(item.text, expenseTemplates));
      const newItem: DasarItem = { id: Math.random().toString(), text: "" };
      if (fundingIdx !== -1) {
        const next = [...prev];
        const [fundingItem] = next.splice(fundingIdx, 1);
        next.push(newItem);
        next.push(fundingItem);
        return next;
      }
      return [...prev, newItem];
    });
  };

  const resetTemplateForm = () => {
    setEditTemplateId(null);
    setTemplateName("");
    setTemplateCode("");
    setTemplateDescription("");
    setTemplateType("custom");
    setMenimbangItems([]);
    setDasarItems([]);
    setSignerId("");
    setTemplateIsActive(true);
    setTemplateIsDefault(false);
    setTemplateBiayaText("");
    setNomorSuratFormat(DEFAULT_NOMOR_SURAT_FORMAT);
    setNomorFormatMode("default");
    setNomorNumberingType("st_pattern");
    setDefaultJenisTugas("Perjalanan Dinas Luar Wilayah");
    setDefaultSertakanLaporan(true);
    setDefaultModeKegiatan("structured");
    setDefaultKegiatan("");
    setUntukItems([]);
    setTemplateConfiguration({});
    setHeaderTitle("KEPALA BALAI,");
    setPenutupText("Demikian untuk dilaksanakan dengan penuh tanggung jawab.");
    setDateFormatStyle("inline");
    setSignerAuthorityMandate("");
    setSignerTitle("Kepala Balai,");
    setTembusanItems([]);
    setTembusanPosition("beside");
    setTembusanLabel("Tembusan:");
    setDefaultSumberDana("");
    setKopImageUrl(null);
    setKopMode("default");
    setActiveCard(1);
    setIsTemplateFormOpen(false);
  };

  const applyTemplatePreset = (template: StTemplate, keepIdentity = false) => {
    if (!keepIdentity) {
      setTemplateName(template.name);
      setTemplateCode(template.code || templateCodeFromName(template.name));
      setTemplateDescription(template.description || "");
      setTemplateIsActive(template.is_active);
      setTemplateIsDefault(template.is_default);
    }
    setTemplateType(template.type);
    setMenimbangItems(template.menimbang || []);
    setDasarItems(template.dasar || []);
    setSignerId(template.default_signer_employee_id ? String(template.default_signer_employee_id) : "");

    const config = template.configuration || {};
    setTemplateConfiguration(config);
    const existingBiaya = typeof config.biaya_text === "string" ? config.biaya_text : "";
    setTemplateBiayaText(existingBiaya);

    const existingNomorFormat =
      typeof config.nomor_surat_format === "string"
        ? config.nomor_surat_format
        : DEFAULT_NOMOR_SURAT_FORMAT;
    setNomorSuratFormat(existingNomorFormat);
    setNomorFormatMode(existingNomorFormat === DEFAULT_NOMOR_SURAT_FORMAT ? "default" : "manual");
    const existingNumberingType =
      config.nomor_numbering_type === "naskah_auto" ? "naskah_auto" : "st_pattern";
    setNomorNumberingType(existingNumberingType);

    const existingJenisTugas =
      typeof config.default_jenis_tugas === "string"
        ? normalizeTaskTypeName(config.default_jenis_tugas)
        : "Perjalanan Dinas Luar Wilayah";
    setDefaultJenisTugas(existingJenisTugas);

    const existingSertakanLaporan =
      typeof config.default_sertakan_laporan === "boolean"
        ? config.default_sertakan_laporan
        : true;
    setDefaultSertakanLaporan(existingSertakanLaporan);

    const existingMode = config.default_mode_kegiatan === "manual" ? "manual" : "structured";
    setDefaultModeKegiatan(existingMode);

    const existingKegiatan =
      typeof config.default_kegiatan === "string" ? config.default_kegiatan : "";
    setDefaultKegiatan(existingKegiatan);

    const existingUntuk = Array.isArray(config.untuk)
      ? config.untuk.filter((item) => {
          const text = (item?.text || "").trim();
          if (!text) return false;
          if (isGeneratedLaporanItem(text)) return false;
          if (isGeneratedBiayaItem(text, expenseTemplates)) return false;
          return true;
        })
      : [];
    setUntukItems(existingUntuk);

    setHeaderTitle(
      typeof config.header_title === "string" ? config.header_title : "KEPALA BALAI,"
    );
    setPenutupText(
      typeof config.penutup_text === "string"
        ? config.penutup_text
        : "Demikian untuk dilaksanakan dengan penuh tanggung jawab."
    );
    setDateFormatStyle(config.date_format_style === "tabular" ? "tabular" : "inline");
    setSignerAuthorityMandate(
      typeof config.signer_authority_mandate === "string" ? config.signer_authority_mandate : ""
    );
    setSignerTitle(
      typeof config.signer_title === "string" ? config.signer_title : "Kepala Balai,"
    );
    setTembusanItems(Array.isArray(config.tembusan_items) ? config.tembusan_items : []);
    setTembusanPosition(config.tembusan_position === "bottom" ? "bottom" : "beside");
    setTembusanLabel(
      typeof config.tembusan_label === "string" ? config.tembusan_label : "Tembusan:"
    );
    setDefaultSumberDana(typeof config.sumber_dana === "string" ? config.sumber_dana : "");
    const existingKop = typeof config.kop_image_url === "string" ? config.kop_image_url : null;
    setKopImageUrl(existingKop);
    setKopMode(existingKop ? "custom" : "default");
  };

  const handleEditTemplate = (template: StTemplate) => {
    setActiveCard(1);
    setEditTemplateId(template.id);
    applyTemplatePreset(template, false);
    setIsTemplateFormOpen(true);
  };

  const handleUploadKop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("kop", file);

    try {
      setIsUploadingKop(true);
      const res = await api.post("/kepegawaian/st-templates/upload-kop", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.path) {
        setKopImageUrl(res.data.path);
        setKopMode("custom");
        toast.success("Kop surat berhasil diupload");
      }
    } catch (err: unknown) {
      const msg = errorMessage(err, "Gagal mengupload kop surat");
      toast.error(msg);
    } finally {
      setIsUploadingKop(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleTemplateSubmit = async () => {
    if (!templateName.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }
    const finalCode = templateCode.trim() || templateCodeFromName(templateName);
    if (!finalCode) {
      toast.error("Kode template wajib diisi");
      return;
    }

    const payload = {
      name: templateName.trim(),
      code: finalCode,
      description: templateDescription.trim() || null,
      type: templateType,
      menimbang: menimbangItems.filter((i) => i.text.trim()),
      dasar: dasarItems.filter((i) => i.text.trim()),
      default_signer_employee_id: signerId ? Number(signerId) : null,
      is_active: templateIsActive,
      is_default: templateIsDefault,
      configuration: {
        ...templateConfiguration,
        kop_image_url: kopMode === "custom" && kopImageUrl ? kopImageUrl : null,
        header_title: headerTitle.trim() || "KEPALA BALAI,",
        penutup_text:
          penutupText.trim() || "Demikian untuk dilaksanakan dengan penuh tanggung jawab.",
        date_format_style: dateFormatStyle,
        signer_authority_mandate: signerAuthorityMandate.trim() || null,
        signer_title: signerTitle.trim() || "Kepala Balai,",
        tembusan_position: tembusanPosition,
        tembusan_label: tembusanLabel.trim() || "Tembusan:",
        tembusan_items: tembusanItems.filter((t) => t.trim()),
        sumber_dana: defaultSumberDana.trim() || null,
        default_jenis_tugas: defaultJenisTugas,
        default_task_type_id: activeTaskType?.id || null,
        default_sertakan_laporan: defaultSertakanLaporan,
        default_mode_kegiatan: defaultModeKegiatan,
        default_kegiatan: defaultKegiatan.trim() || null,
        untuk: untukItems.filter((i) => i.text.trim()),
        biaya_text: templateBiayaText.trim() || null,
        nomor_surat_format:
          nomorFormatMode === "manual" && nomorSuratFormat.trim()
            ? nomorSuratFormat.trim()
            : DEFAULT_NOMOR_SURAT_FORMAT,
        nomor_numbering_type: nomorNumberingType,
      },
    };

    try {
      setIsTemplateSubmitting(true);
      if (editTemplateId) {
        await api.put(`/kepegawaian/st-templates/${editTemplateId}`, payload);
        toast.success("Template berhasil diperbarui");
      } else {
        await api.post("/kepegawaian/st-templates", payload);
        toast.success("Template baru berhasil dibuat");
      }
      resetTemplateForm();
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menyimpan template"));
    } finally {
      setIsTemplateSubmitting(false);
    }
  };

  const handleToggleTemplateActive = async (template: StTemplate) => {
    try {
      await api.patch(`/kepegawaian/st-templates/${template.id}/toggle-active`, {
        is_active: !template.is_active,
      });
      toast.success(template.is_active ? "Template dinonaktifkan" : "Template diaktifkan");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal mengubah status template"));
    }
  };

  const handleSetDefaultTemplate = async (id: number) => {
    try {
      await api.post(`/kepegawaian/st-templates/${id}/set-default`);
      toast.success("Template default berhasil diubah");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menetapkan template default"));
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      await api.post(`/kepegawaian/st-templates/${id}/duplicate`);
      toast.success("Template berhasil diduplikasi");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menduplikasi template"));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_system) {
      toast.error("Template sistem tidak dapat dihapus. Nonaktifkan jika tidak digunakan.");
      setDeleteTarget(null);
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/kepegawaian/st-templates/${deleteTarget.id}`);
      toast.success("Template berhasil dihapus");
      setDeleteTarget(null);
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menghapus template"));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      const q = templateSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.code || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q);
      const matchStatus =
        templateStatusFilter === "all" ||
        (templateStatusFilter === "active" && item.is_active) ||
        (templateStatusFilter === "inactive" && !item.is_active);
      return matchSearch && matchStatus;
    });
  }, [templates, templateSearch, templateStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Search Bar when list view is shown */}
      {!isTemplateFormOpen && (
        <>
          <div className="p-4 rounded-2xl bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-[var(--ds-accent-soft-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0 mt-0.5 st-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--ds-fg)]">
                  Master Template Surat Tugas (ST)
                </h3>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                  Atur susunan kop surat, format penomoran, konsiderans (Menimbang &amp; Dasar), klausul penugasan, pejabat penandatangan, dan tembusan.
                </p>
              </div>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  resetTemplateForm();
                  setActiveCard(1);
                  setIsTemplateFormOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer shrink-0 st-primary"
              >
                <Plus className="w-4 h-4" /> Buat Template ST
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Cari nama template, kode, deskripsi..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent-fg)] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-[var(--ds-fg-muted)] flex items-center gap-1 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Status:
              </span>
              <div className="inline-flex p-1 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={() => setTemplateStatusFilter("all")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    templateStatusFilter === "all"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  }`}
                >
                  Semua ({templates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateStatusFilter("active")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    templateStatusFilter === "active"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-status-success-fg)] shadow-xs"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  }`}
                >
                  Aktif ({templates.filter((t) => t.is_active).length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateStatusFilter("inactive")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    templateStatusFilter === "inactive"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-status-danger-fg)] shadow-xs"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  }`}
                >
                  Nonaktif ({templates.filter((t) => !t.is_active).length})
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isTemplateFormOpen ? (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <section className="space-y-5 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-6 shadow-sm">
            {/* STICKY HEADER & QUICK-JUMP PILL BAR */}
            <div
              id="template-form-sticky-header"
              className="sticky top-0 z-30 -mt-6 -mx-6 px-6 pt-5 pb-3.5 bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] rounded-t-2xl space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--ds-fg)] flex items-center gap-2">
                    {editTemplateId ? "Edit Template Surat Tugas" : "Buat Template Surat Tugas Baru"}
                    {templateCode && (
                      <span className="hidden sm:inline-block font-mono text-xs font-normal px-2 py-0.5 rounded bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                        {templateCode}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--ds-fg-muted)] hidden sm:block">
                    Pengaturan susunan naskah dinas dari Kepala hingga Tembusan
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetTemplateForm}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTemplateSubmit()}
                    disabled={isTemplateSubmitting}
                    className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer st-primary"
                  >
                    {isTemplateSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={resetTemplateForm}
                    className="rounded-full p-1.5 hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] transition ml-1 cursor-pointer"
                    title="Tutup form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick-Jump Navigation Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
                {[
                  { id: 1, label: "1. Identitas" },
                  { id: 2, label: "2. Kepala & Nomor" },
                  { id: 3, label: "3. Menimbang" },
                  { id: 4, label: "4. Dasar Hukum" },
                  { id: 5, label: "5. Diktum & Biaya" },
                  { id: 6, label: "6. Kaki Surat & TTD" },
                  { id: 7, label: "7. Tembusan" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => scrollToCard(pill.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeCard === pill.id
                        ? "shadow-xs font-semibold st-primary"
                        : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-fg)]"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. KARTU IDENTITAS & KONFIGURASI TEMPLATE */}
            {/* ========================================================================= */}
            <div
              id="card-template-1"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ds-border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Identitas &amp; Konfigurasi Template
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Pengaturan nama tampilan, kode sistem, tipe template, dan status.
                  </p>
                </div>
              </div>

              {!editTemplateId && templates.length > 0 && (
                <div className="p-3 rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--ds-accent-fg)]">
                      Buat Cepat: Salin Isian Awal dari Template yang Sudah Ada
                    </p>
                    <p className="text-xs text-[var(--ds-accent-fg)]">
                      Menyalin otomatis Menimbang, Dasar, Untuk, Kop, dan Tembusan agar Anda tinggal mengubah bagian yang berbeda saja.
                    </p>
                  </div>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const found = templates.find((t) => String(t.id) === e.target.value);
                      if (found) {
                        applyTemplatePreset(found, true);
                        toast.success(`Isian awal disalin dari template "${found.name}"`);
                      }
                    }}
                    className="rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface)] px-3 py-2 text-xs font-semibold text-[var(--ds-accent-fg)] outline-none focus:border-[var(--ds-accent-fg)] cursor-pointer shrink-0"
                  >
                    <option value="">-- Pilih Template untuk Disalin --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        Salin dari: {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                  Nama Template
                  <input
                    value={templateName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTemplateName(value);
                      if (!editTemplateId) setTemplateCode(templateCodeFromName(value));
                    }}
                    placeholder="Perjalanan Dinas Biasa"
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none focus:border-[var(--ds-accent-fg)]"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                  Kode Template <span className="font-normal text-[var(--ds-fg-muted)]">(otomatis)</span>
                  <input
                    value={editTemplateId ? templateCode : templateCodeFromName(templateName)}
                    readOnly
                    placeholder="dibuat dari nama template"
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2.5 text-[var(--ds-fg-muted)] outline-none"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                  Tipe Template
                  <select
                    value={templateType}
                    onChange={(event) => setTemplateType(event.target.value as TemplateKind)}
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none"
                  >
                    {TEMPLATE_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {templateType === "beda_hari" && (
                    <p className="text-xs text-[var(--ds-status-warning-fg)] mt-1 leading-relaxed">
                      Template Beda Hari otomatis menyertakan <b>Lampiran Surat Tugas (Halaman 2)</b> untuk tabel jadwal masing-masing personil, dan bagian &ldquo;Kepada&rdquo; di halaman 1 otomatis bertuliskan <i>&ldquo;Daftar nama terlampir.&rdquo;</i>.
                    </p>
                  )}
                </label>
                <div className="flex flex-col justify-center space-y-2 pt-2 sm:pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--ds-fg-muted)]">
                    <input
                      type="checkbox"
                      checked={templateIsActive}
                      onChange={(event) => setTemplateIsActive(event.target.checked)}
                      className="rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)]"
                    />
                    Aktif (tersedia untuk pembuatan ST)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--ds-fg-muted)]">
                    <input
                      type="checkbox"
                      checked={templateIsDefault}
                      onChange={(event) => setTemplateIsDefault(event.target.checked)}
                      className="rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)]"
                    />
                    Jadikan template default
                  </label>
                </div>
              </div>

              <label className="block space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                Deskripsi Template
                <textarea
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.target.value)}
                  rows={2}
                  placeholder="Keterangan singkat peruntukan template ini..."
                  className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none focus:border-[var(--ds-accent-fg)]"
                />
              </label>
            </div>

            {/* ========================================================================= */}
            {/* 2. KARTU KEPALA SURAT & FORMAT NOMOR (HEADER DOKUMEN) */}
            {/* ========================================================================= */}
            <div
              id="card-template-2"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ds-border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Kepala Surat &amp; Format Nomor
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Kop surat resmi, aturan nomor surat, dan judul pejabat pemberi tugas.
                  </p>
                </div>
              </div>

              {/* Kop Surat */}
              <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--ds-fg)] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                      Kop Surat
                    </h4>
                    <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                      Pilih kop standar Balai atau upload kop khusus untuk template ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setKopMode("default");
                        setKopImageUrl(null);
                      }}
                      className={`rounded-md px-2.5 py-1 transition-all ${
                        kopMode === "default"
                          ? "shadow-sm st-primary"
                          : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                      }`}
                    >
                      Standar (BKSDA)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKopMode("custom")}
                      className={`rounded-md px-2.5 py-1 transition-all ${
                        kopMode === "custom"
                          ? "shadow-sm st-primary"
                          : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                      }`}
                    >
                      Upload Kop Khusus
                    </button>
                  </div>
                </div>

                {kopMode === "custom" && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-[var(--ds-border-subtle)]">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--ds-border-subtle)] rounded-xl p-4 text-center cursor-pointer hover:border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface)] hover:bg-[var(--ds-accent-soft)] transition-colors">
                          <Upload className="w-5 h-5 text-[var(--ds-fg-muted)] mb-1" />
                          <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">
                            {isUploadingKop ? "Mengunggah..." : "Pilih file gambar Kop"}
                          </span>
                          <span className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                            PNG, JPG, WEBP (Max 5MB, resolusi tinggi)
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={isUploadingKop}
                            onChange={handleUploadKop}
                          />
                        </label>
                      </div>
                      {kopImageUrl && (
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className="relative w-44 h-16 border rounded-lg overflow-hidden bg-[var(--ds-surface)] shadow-sm p-1 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveKopImageUrl(kopImageUrl)}
                              alt="Kop Preview"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setKopImageUrl(null);
                              setKopMode("default");
                            }}
                            className="text-xs text-[var(--ds-status-danger-fg)] hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Hapus / Gunakan Standar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Format Nomor Surat */}
              <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--ds-fg)]">
                    Format &amp; Tipe Nomor Surat
                  </h4>
                  <p className="text-xs font-normal text-[var(--ds-fg-muted)]">
                    Pilih skema penomoran default untuk naskah surat tugas dari template ini.
                  </p>
                </div>

                {/* Switcher Tipe Penomoran: Pola ST vs Nomor Naskah Otomatis */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-all ${
                      nomorNumberingType === "st_pattern"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] shadow-xs"
                        : "border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-subtle)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="settings-nomor-numbering-type"
                      checked={nomorNumberingType === "st_pattern"}
                      onChange={() => setNomorNumberingType("st_pattern")}
                      className="mt-0.5 text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)]"
                    />
                    <div>
                      <strong className="block text-xs font-bold text-[var(--ds-fg)]">
                        Pola Standar ST (ST.01/...)
                      </strong>
                      <span className="text-xs text-[var(--ds-fg-muted)] leading-tight block mt-0.5">
                        Pola berawalan ST. dengan nomor urut, kode balai, dan klasifikasi.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-all ${
                      nomorNumberingType === "naskah_auto"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] shadow-xs"
                        : "border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-subtle)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="settings-nomor-numbering-type"
                      checked={nomorNumberingType === "naskah_auto"}
                      onChange={() => setNomorNumberingType("naskah_auto")}
                      className="mt-0.5 text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)]"
                    />
                    <div>
                      <strong className="block text-xs font-bold text-[var(--ds-fg)]">
                        Nomor Naskah Otomatis (${"{nomor_naskah}"})
                      </strong>
                      <span className="text-xs text-[var(--ds-fg-muted)] leading-tight block mt-0.5">
                        Format: Nomor : ${"{nomor_naskah}"} dari sistem eksternal (Srikandi / TTE / dsb).
                      </span>
                    </div>
                  </label>
                </div>

                {nomorNumberingType === "st_pattern" ? (
                  <div className="space-y-3 pt-1 border-t border-[var(--ds-border-subtle)]">
                    <div className="grid gap-2 md:grid-cols-2">
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                          nomorFormatMode === "default"
                            ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                            : "border-[var(--ds-border-subtle)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="settings-nomor-format-mode"
                          checked={nomorFormatMode === "default"}
                          onChange={() => {
                            setNomorFormatMode("default");
                            setNomorSuratFormat(DEFAULT_NOMOR_SURAT_FORMAT);
                          }}
                        />
                        <span>
                          <strong>Format Default BKSDA</strong>
                          <br />
                          <span className="text-xs font-normal font-mono">
                            /K.18/TU/{"{klasifikasi}"}/B/{"{bulan}"}/{"{tahun}"}
                          </span>
                        </span>
                      </label>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                          nomorFormatMode === "manual"
                            ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                            : "border-[var(--ds-border-subtle)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="settings-nomor-format-mode"
                          checked={nomorFormatMode === "manual"}
                          onChange={() => setNomorFormatMode("manual")}
                        />
                        <span>
                          <strong>Tulis Format Kustom</strong>
                          <br />
                          <span className="text-xs font-normal">Masukkan pola penomoran khusus</span>
                        </span>
                      </label>
                    </div>
                    {nomorFormatMode === "manual" && (
                      <div className="space-y-2">
                        <input
                          value={nomorSuratFormat}
                          onChange={(event) => setNomorSuratFormat(event.target.value)}
                          placeholder="/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}"
                          className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none font-mono text-xs focus:border-[var(--ds-accent-fg)]"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                          <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Sisipkan variabel:</span>
                          {[
                            { tag: "{klasifikasi}", desc: "Kode Klasifikasi" },
                            { tag: "{bulan}", desc: "Bulan Romawi / Angka" },
                            { tag: "{tahun}", desc: "Tahun Surat" },
                          ].map((chip) => (
                            <button
                              key={chip.tag}
                              type="button"
                              onClick={() =>
                                setNomorSuratFormat((prev) => (prev ? `${prev}/${chip.tag}` : chip.tag))
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)] transition-colors cursor-pointer"
                              title={`Klik untuk menambahkan ${chip.tag} (${chip.desc})`}
                            >
                              + {chip.tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] p-3 text-xs text-[var(--ds-accent-fg)] flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[var(--ds-accent-fg)] mt-0.5 shrink-0" />
                    <div className="leading-relaxed">
                      Format penomoran naskah &amp; lampiran akan menjadi <strong>Nomor : ${"{nomor_naskah}"}</strong>. 
                      Di Builder ST, admin cukup menginput nomor utuh dari sistem luar tanpa perlu menyusun prefix/klasifikasi manual.
                    </div>
                  </div>
                )}
              </div>

              {/* Header Atas Surat */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-[var(--ds-fg-muted)]">
                    Header Atas Surat (di bawah Nomor, sebelum Menimbang)
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={applyItalicToHeader}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 font-serif text-xs font-semibold text-[var(--ds-fg-muted)] shadow-sm hover:bg-[var(--ds-surface-muted)]"
                      title="Blok teks lalu klik ini atau tekan Ctrl+I untuk memiringkan (*kata*)"
                    >
                      <Italic className="h-3.5 w-3.5 text-[var(--ds-accent-fg)]" />
                      <span className="italic font-bold">Miringkan (*I*)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderTitle(
                          "KEPALA UPT SELAKU\nPELAKSANA SATUAN KERJA *IMPLEMENTING PARTNER* FOLU NC 2&3"
                        )
                      }
                      className="inline-flex items-center rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 text-xs font-medium text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
                      title="Salin contoh format FOLU"
                    >
                      + Contoh FOLU
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--ds-fg-muted)]">
                  Judul pejabat/kegiatan. Gunakan tanda bintang{" "}
                  <code className="rounded bg-[var(--ds-surface-muted)] px-1 py-0.5 font-mono text-[var(--ds-accent-fg)]">
                    *kata miring*
                  </code>{" "}
                  atau tombol <strong>Miringkan (Ctrl+I)</strong> untuk tulisan miring.
                </p>

                <textarea
                  ref={headerTextareaRef}
                  value={headerTitle}
                  onChange={(event) => setHeaderTitle(event.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                      e.preventDefault();
                      applyItalicToHeader();
                    }
                  }}
                  rows={2}
                  placeholder="KEPALA BALAI,"
                  className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 font-bold text-sm tracking-wide outline-none focus:border-[var(--ds-accent-fg)]"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. KARTU KONSIDERANS — MENIMBANG (PERTIMBANGAN PENUGASAN) */}
            {/* ========================================================================= */}
            <div
              id="card-template-3"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ds-border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Konsiderans — Menimbang (Pertimbangan Penugasan)
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Landasan pertimbangan penugasan (huruf a, b, c...) yang selalu diambil dari Template ST ini.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs text-[var(--ds-fg-muted)] space-y-1 leading-relaxed">
                <p>
                  <b className="text-[var(--ds-accent-fg)]">Cara Penggunaan Menimbang:</b> Gunakan{" "}
                  <code className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-[var(--ds-accent-fg)]">
                    {"{nama kegiatan}"}
                  </code>{" "}
                  agar otomatis terisi dengan nama kegiatan surat di Builder, serta{" "}
                  <code className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-[var(--ds-accent-fg)]">
                    *kata miring*
                  </code>{" "}
                  (atau blok teks + <kbd className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-xs">Ctrl+I</kbd>) untuk istilah asing seperti <i>*Project Management Unit*</i>.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
                <EditableItemListSection
                  title="Daftar Poin Menimbang (Huruf a, b, dst.)"
                  items={menimbangItems}
                  onChange={setMenimbangItems}
                  marker="letter"
                  placeholderChips={[
                    {
                      token: "{nama kegiatan}",
                      desc: "Otomatis diganti dengan Nama Kegiatan & Lokasi dari surat",
                    },
                    {
                      token: "{tahun}",
                      desc: `Tahun Anggaran berjalan (${currentYear})`,
                    },
                    {
                      token: "{pejabat}",
                      desc: "Khusus PLH: Jabatan pejabat struktural yang digantikan",
                    },
                    {
                      token: "{wilayah}",
                      desc: "Khusus PLH: Wilayah Seksi (contoh: Wilayah I Berau)",
                    },
                    {
                      token: "{kegiatan_kasi}",
                      desc: "Khusus PLH: Kegiatan pejabat yang digantikan",
                    },
                  ]}
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. KARTU KONSIDERANS — DASAR HUKUM & ANGGARAN */}
            {/* ========================================================================= */}
            <div
              id="card-template-4"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ds-border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Konsiderans — Dasar Hukum &amp; Regulasi
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Landasan hukum/regulasi (angka 1, 2, 3...) yang selalu ditempatkan di urutan paling atas bagian Dasar.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs space-y-1.5">
                <p className="font-bold text-[var(--ds-accent-fg)]">
                  Aturan 3 Lapis Urutan Otomatis Bagian Dasar di ST Builder:
                </p>
                <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
                  <div className="p-2 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)]">
                    <b className="text-[var(--ds-accent-fg)] block">1. Paling Atas (1..k)</b>
                    <span className="text-[var(--ds-fg-muted)]">
                      Semua butir Dasar dari <b>Template ST</b> ini.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-status-success-border)]">
                    <b className="text-[var(--ds-status-success-fg)] block">2. Tengah (Opsional)</b>
                    <span className="text-[var(--ds-fg-muted)]">
                      Butir Dasar yang ditambah manual di <b>ST Builder</b>.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-status-warning-border)]">
                    <b className="text-[var(--ds-status-warning-fg)] block">3. Paling Bawah (Terakhir)</b>
                    <span className="text-[var(--ds-fg-muted)]">
                      Dasar DIPA/PKS dari <b>Template Biaya &amp; Sumber Dana</b> (jika ada).
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
                <EditableItemListSection
                  title="Daftar Poin Dasar (Angka 1, 2, dst. — Paling Atas)"
                  items={dasarItems}
                  onChange={setDasarItems}
                  onAddItem={handleAddDasarItem}
                  marker="number"
                  placeholderChips={[
                    {
                      token: "{tahun}",
                      desc: `Tahun Anggaran berjalan (${currentYear})`,
                    },
                    {
                      token: "{nomor_induk}",
                      desc: "Khusus PLH: Nomor Surat Tugas Induk",
                    },
                    {
                      token: "{tanggal_induk}",
                      desc: "Khusus PLH: Tanggal Surat Tugas Induk",
                    },
                  ]}
                  getItemBadge={(item) => {
                    if (isFundingDasarText(item.text, expenseTemplates)) {
                      return (
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--ds-status-warning-fg)] bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] px-2 py-0.5 rounded-md w-fit">
                          <Banknote className="w-3 h-3 text-[var(--ds-status-warning-fg)]" />
                          <span>Otomatis Sinkron Sumber Dana (Paling Bawah)</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] px-2 py-0.5 rounded-md w-fit">
                        <span>1. Bawaan Template ST (Paling Atas)</span>
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. KARTU DIKTUM PENUGASAN (UNTUK & BIAYA) */}
            {/* ========================================================================= */}
            <div
              id="card-template-5"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ds-border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                  5
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Diktum Penugasan (Untuk &amp; Pembebanan Biaya)
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Pola butir 1 tugas pokok, klausul butir tambahan, dan sumber dana default.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                  Default Jenis Tugas
                  <select
                    value={defaultJenisTugas}
                    onChange={(event) => handleDefaultJenisTugasChange(event.target.value)}
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none font-medium cursor-pointer"
                  >
                    {availableTaskTypes.length > 0 ? (
                      availableTaskTypes.map((tt) => (
                        <option key={tt.id} value={tt.nama}>
                          {tt.nama}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Perjalanan Dinas Luar Wilayah">
                          Perjalanan Dinas Luar Wilayah
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
                    {availableTaskTypes.length > 0 &&
                      !availableTaskTypes.some((tt) => tt.nama === defaultJenisTugas) && (
                        <option value={defaultJenisTugas}>{defaultJenisTugas}</option>
                      )}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                  Mode Input Butir 1 Bawaan
                  <select
                    value={defaultModeKegiatan}
                    onChange={(event) =>
                      setDefaultModeKegiatan(event.target.value as "structured" | "manual")
                    }
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="structured">
                      Detail Terstruktur (Otomatis Gabungan Jenis Tugas + Lokasi + Waktu)
                    </option>
                    <option value="manual">
                      Tulis Manual (Default Uraian Tugas Jadi Utama + Waktu Otomatis)
                    </option>
                  </select>
                </label>
              </div>

              {/* Info Ringkas Jenis Tugas Terpilih */}
              {activeTaskType && defaultModeKegiatan === "structured" && (
                <div className="p-3 bg-[var(--ds-accent-soft)] rounded-xl border border-[var(--ds-accent-soft-border)] text-xs space-y-1.5 duration-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[var(--ds-accent-fg)]">{activeTaskType.nama}</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] uppercase tracking-wider">
                      {activeTaskType.mode_lokasi === "dalam_kawasan"
                        ? "Dalam Kawasan"
                        : activeTaskType.mode_lokasi === "tempat_saja"
                        ? "Tempat Saja (Pada / Di)"
                        : "Luar Wilayah (Dari / Ke)"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                      {activeTaskType.aturan_durasi === "wajib_1_hari" ? "Wajib 1 Hari" : "Durasi Fleksibel"}
                    </span>
                  </div>
                  {activeTaskType.contoh_format && (
                    <div className="text-xs text-[var(--ds-accent-fg)] font-mono bg-[var(--ds-surface)] p-2 rounded-lg border border-[var(--ds-accent-soft-border)]">
                      <span className="font-sans font-bold text-[var(--ds-fg-muted)] mr-1">Pola Diktum:</span>
                      {activeTaskType.contoh_format}
                    </div>
                  )}
                </div>
              )}

              {defaultModeKegiatan === "manual" && (
                <div className="p-3 bg-[var(--ds-status-warning-bg)] rounded-xl border border-[var(--ds-status-warning-border)] text-xs space-y-1 duration-200">
                  <p className="font-bold text-[var(--ds-status-warning-fg)]">
                    Mode Tulis Manual Aktif (Seperti PLH / Penugasan Khusus):
                  </p>
                  <p className="text-xs text-[var(--ds-status-warning-fg)] leading-relaxed">
                    <b>Default Uraian Tugas</b> di bawah akan selalu menjadi kalimat utama <b>Butir 1</b> di Builder (tanpa dibungkus awalan Perjalanan Dinas), dan sistem <b>tetap otomatis menambahkan rentang waktu</b> di akhir kalimat:{" "}
                    <i>&quot;, selama 3 (tiga) hari terhitung mulai tanggal 15 September sampai dengan 17 September {currentYear};&quot;</i>.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-[var(--ds-fg-muted)]">
                    Default Uraian Tugas / Pola Butir 1 {defaultModeKegiatan === "manual" ? "(Kalimat Utama Butir 1)" : "(Opsional)"}
                  </label>
                  <button
                    type="button"
                    onClick={applyItalicToDefaultKegiatan}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1 font-serif text-xs font-semibold text-[var(--ds-fg-muted)] shadow-sm hover:bg-[var(--ds-surface-muted)] cursor-pointer"
                    title="Blok teks lalu klik ini atau tekan Ctrl+I untuk memiringkan (*kata*)"
                  >
                    <Italic className="h-3.5 w-3.5 text-[var(--ds-accent-fg)]" />
                    <span className="italic font-bold">Miringkan (*I*)</span>
                  </button>
                </div>
                <span className="block text-xs font-normal text-[var(--ds-fg-muted)]">
                  {defaultModeKegiatan === "manual"
                    ? "Tulis kalimat utama penugasan (tanpa tanggal). Tanggal & lama hari akan ditempel otomatis di ujung kalimat saat surat dibuat."
                    : "Teks awal maksud/kegiatan pada formulir penugasan. Mendukung huruf miring (*kata*) dan placeholder di bawah."}
                </span>
                <textarea
                  ref={defaultKegiatanRef}
                  value={defaultKegiatan}
                  onChange={(event) => setDefaultKegiatan(event.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                      e.preventDefault();
                      applyItalicToDefaultKegiatan();
                    }
                  }}
                  rows={2}
                  placeholder="Contoh: Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah {wilayah}"
                  className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none focus:border-[var(--ds-accent-fg)] text-sm"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                  <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Sisipkan placeholder:</span>
                  {[
                    { tag: "{wilayah}", desc: "Nama Wilayah / Seksi (contoh: Wilayah I Berau)" },
                    { tag: "{pejabat}", desc: "Jabatan Pejabat yang Digantikan" },
                    { tag: "{tahun}", desc: "Tahun Anggaran" },
                  ].map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() =>
                        setDefaultKegiatan((prev) => (prev ? `${prev} ${chip.tag}` : chip.tag))
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)] transition-colors cursor-pointer"
                      title={`Klik untuk menyisipkan ${chip.tag} (${chip.desc})`}
                    >
                      + {chip.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Butir Tambahan Untuk */}
              <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
                <EditableItemListSection
                  title="Default Butir Tambahan (Untuk — Mulai Nomor 2 dst.)"
                  items={untukItems}
                  onChange={setUntukItems}
                  marker="number"
                  startIndex={1}
                  description={
                    <div className="text-xs text-[var(--ds-fg-muted)] space-y-1">
                      <p>
                        Klausul penugasan tambahan mulai <strong>Butir ke-2</strong>. Saat template ini dipilih di Builder, daftar di sini akan <strong>menimpa seluruh butir tambahan Untuk sebelumnya</strong>.
                      </p>
                      <p className="text-xs text-[var(--ds-fg-muted)]">
                        * Urutan Otomatis Bagian Untuk: <strong>1. Tugas Utama &amp; Waktu</strong> → <strong>2..k. Butir Tambahan (Untuk)</strong> → <strong>Biaya (Otomatis turun ke bawah Butir Tambahan)</strong> → <strong>Laporan Tertulis (Selalu Terakhir)</strong>.
                      </p>
                    </div>
                  }
                />
              </div>

              {/* Toggle Kewajiban Membuat Laporan Tertulis Bawaan */}
              <div className="p-3 bg-[var(--ds-surface-muted)] rounded-xl border border-[var(--ds-border-subtle)] flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="chk_template_laporan" className="text-xs font-bold text-[var(--ds-fg)] block cursor-pointer">
                    Kewajiban Membuat Laporan Tertulis Bawaan
                  </label>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                    Menyertakan klausul laporan (paling lambat 7 hari kerja) otomatis di baris paling akhir pada bagian Untuk.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="chk_template_laporan"
                  checked={defaultSertakanLaporan}
                  onChange={(e) => setDefaultSertakanLaporan(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)] cursor-pointer"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                  Sumber Dana Default
                  <select
                    value={defaultSumberDana}
                    onChange={(event) => setDefaultSumberDana(event.target.value)}
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none font-medium"
                  >
                    <option value="">Pilih Sumber Dana Default (Opsional)</option>
                    {expenseTemplates.map((exp) => (
                      <option key={exp.id} value={exp.code}>
                        {exp.name} ({exp.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs font-normal text-[var(--ds-fg-muted)]">
                    Terhubung 2 arah: sumber dana ini otomatis terpilih saat template ST digunakan, dan pengajuan dari <code>/surat-tugas</code> atau Builder dengan sumber dana ini otomatis memilih template ST ini.
                  </span>
                </label>

                <div className="space-y-1">
                  <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
                    Biaya Khusus Template Ini (Opsional Penimpa)
                    <textarea
                      value={templateBiayaText}
                      onChange={(event) => setTemplateBiayaText(event.target.value)}
                      rows={2}
                      placeholder="Segala biaya yang timbul dibebankan pada ... Tahun Anggaran {tahun};"
                      className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs font-mono outline-none focus:border-[var(--ds-accent-fg)]"
                    />
                    <span className="block text-xs font-normal text-[var(--ds-fg-muted)]">
                      Jika diisi, menimpa teks klausul pembebanan sumber dana umum.
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                    <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Sisipkan variabel:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTemplateBiayaText((prev) =>
                          prev ? `${prev} {tahun}` : "Tahun Anggaran {tahun};"
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)] transition-colors cursor-pointer"
                      title="Klik untuk menyisipkan {tahun}"
                    >
                      + {"{tahun}"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 6. KARTU KAKI SURAT & PENGESAHAN (TANDA TANGAN) */}
            {/* ========================================================================= */}
            <div
              id="card-template-6"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ds-border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                  6
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Kaki Surat &amp; Pengesahan (Tanda Tangan)
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Kalimat penutup, tanggal penetapan, pejabat penandatangan default, dan mandat
                    wewenang.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                    Kalimat Penutup Surat
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPenutupText("Demikian untuk dilaksanakan dengan penuh tanggung jawab.")
                      }
                      className="text-xs font-medium text-[var(--ds-accent-fg)] hover:underline cursor-pointer"
                    >
                      Reset Standar BKSDA
                    </button>
                    <span className="text-[var(--ds-fg-muted)]">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPenutupText(
                          "Demikian Surat Perintah Tugas ini dibuat, untuk dapat dipergunakan sebagaimana mestinya dan kepada instansi yang dikunjungi dimohon bantuan seperlunya demi kelancaran pelaksanaan tugas."
                        )
                      }
                      className="text-xs font-medium text-[var(--ds-status-success-fg)] hover:underline cursor-pointer"
                    >
                      Gunakan Standar FOLU
                    </button>
                  </div>
                </div>
                <textarea
                  value={penutupText}
                  onChange={(e) => setPenutupText(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs outline-none focus:border-[var(--ds-accent-fg)] leading-relaxed"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                    Gaya Format Tanggal Surat
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs ${
                        dateFormatStyle === "inline"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                          : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="settings-date-format-style"
                        checked={dateFormatStyle === "inline"}
                        onChange={() => setDateFormatStyle("inline")}
                      />
                      <span>
                        <strong>Biasa (Inline)</strong>
                        <br />
                        <span className="text-xs text-[var(--ds-fg-muted)]">
                          Samarinda, 28 September {currentYear}
                        </span>
                      </span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs ${
                        dateFormatStyle === "tabular"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                          : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="settings-date-format-style"
                        checked={dateFormatStyle === "tabular"}
                        onChange={() => setDateFormatStyle("tabular")}
                      />
                      <span>
                        <strong>Tabular (FOLU)</strong>
                        <br />
                        <span className="text-xs text-[var(--ds-fg-muted)]">
                          Dikeluarkan di / Pada tanggal
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <label className="space-y-1 text-xs font-medium text-[var(--ds-fg-muted)]">
                  Penandatangan Default
                  <select
                    value={signerId}
                    onChange={(event) => setSignerId(event.target.value)}
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs outline-none"
                  >
                    <option value="">Gunakan default manual</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nama_lengkap || employee.name} — {employee.nip}
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-[var(--ds-fg-muted)]">
                    Pejabat yang ditugaskan menandatangani surat tugas ini secara default.
                  </span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                    Jabatan Penandatangan
                  </label>
                  <input
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="Kepala Balai,"
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs outline-none focus:border-[var(--ds-accent-fg)]"
                  />
                  <span className="block text-xs text-[var(--ds-fg-muted)]">
                    Default: Kepala Balai, (atau Plh. Kepala Balai,, Kepala Subbagian Tata Usaha,, dll)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                    Teks Mandat / Pelimpahan Wewenang (a.n. ...)
                  </label>
                  <textarea
                    value={signerAuthorityMandate}
                    onChange={(e) => setSignerAuthorityMandate(e.target.value)}
                    rows={2}
                    placeholder="Contoh: a.n. Sekretaris Direktorat Jenderal KSDAE&#10;selaku Koordinator Kegiatan Implementing Partner FOLU NC 2&3"
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs font-mono outline-none focus:border-[var(--ds-accent-fg)]"
                  />
                  <span className="block text-xs text-[var(--ds-fg-muted)]">
                    Opsional, kosongkan jika ditandatangani langsung oleh Kepala Balai.
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 7. KARTU TEMBUSAN */}
            {/* ========================================================================= */}
            <div
              id="card-template-7"
              className="scroll-mt-36 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--ds-border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black st-primary">
                    7
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--ds-fg)]">Tembusan</h3>
                    <p className="text-xs text-[var(--ds-fg-muted)]">
                      Daftar penerima tembusan dan tata letak cetak pada dokumen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTembusanItems([...tembusanItems, ""])}
                  className="flex items-center gap-1 rounded-lg bg-[var(--ds-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Tembusan
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                    Posisi Layout Tembusan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs ${
                        tembusanPosition === "beside"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                          : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="settings-tembusan-position"
                        checked={tembusanPosition === "beside"}
                        onChange={() => setTembusanPosition("beside")}
                      />
                      <span>
                        <strong>Samping TTD</strong>
                        <br />
                        <span className="text-xs text-[var(--ds-fg-muted)]">Sejajar kiri NIP</span>
                      </span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs ${
                        tembusanPosition === "bottom"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                          : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="settings-tembusan-position"
                        checked={tembusanPosition === "bottom"}
                        onChange={() => setTembusanPosition("bottom")}
                      />
                      <span>
                        <strong>Bawah TTD (FOLU)</strong>
                        <br />
                        <span className="text-xs text-[var(--ds-fg-muted)]">Full-width di bawah NIP</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                    Judul / Label Tembusan
                  </label>
                  <input
                    value={tembusanLabel}
                    onChange={(e) => setTembusanLabel(e.target.value)}
                    placeholder="Tembusan: atau Tembusan Kepada :"
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs outline-none focus:border-[var(--ds-accent-fg)]"
                  />
                </div>
              </div>

              {tembusanItems.length > 0 ? (
                <div className="space-y-2">
                  {tembusanItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-right text-xs font-semibold text-[var(--ds-fg-muted)]">
                        {idx + 1}.
                      </span>
                      <input
                        value={item}
                        onChange={(e) => {
                          const next = [...tembusanItems];
                          next[idx] = e.target.value;
                          setTembusanItems(next);
                        }}
                        placeholder={`Tembusan ${idx + 1}`}
                        className="flex-1 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs outline-none focus:border-[var(--ds-accent-fg)]"
                      />
                      <button
                        type="button"
                        onClick={() => setTembusanItems(tembusanItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-[var(--ds-fg-muted)]">
                  Belum ada tembusan default untuk template ini.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--ds-border-subtle)] pt-4">
              <button
                onClick={resetTemplateForm}
                className="rounded-xl px-5 py-2 text-sm text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => void handleTemplateSubmit()}
                disabled={isTemplateSubmitting}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer st-primary"
              >
                {isTemplateSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}{" "}
                Simpan Template ST
              </button>
            </div>
          </section>

          {/* KOLOM KANAN: LIVE PREVIEW LEMBAR A4 */}
          <div className="lg:sticky lg:top-4 z-20 space-y-3 self-start">
            <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg)]">
                    Live Preview (Lembar A4)
                  </span>
                </div>
                {/* Word-like Zoom Controls */}
                <div className="flex items-center gap-2 bg-[var(--ds-surface-muted)] rounded-lg px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewScale((prev) => Math.max(0.4, Number((prev - 0.05).toFixed(2))))
                    }
                    className="p-1 hover:bg-[var(--ds-surface)] rounded text-[var(--ds-fg-muted)] transition-colors"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="0.4"
                    max="1.2"
                    step="0.05"
                    value={previewScale}
                    onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                    className="w-16 sm:w-24 accent-blue-600 cursor-pointer h-1.5 bg-[var(--ds-surface-muted)] rounded-lg"
                    title="Zoom Slider"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewScale((prev) => Math.min(1.2, Number((prev + 0.05).toFixed(2))))
                    }
                    className="p-1 hover:bg-[var(--ds-surface)] rounded text-[var(--ds-fg-muted)] transition-colors"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-[var(--ds-fg-muted)] min-w-[38px] text-right">
                    {Math.round(previewScale * 100)}%
                  </span>
                  <div className="hidden sm:flex items-center gap-1 border-l border-[var(--ds-border-subtle)] pl-2 ml-1">
                    <button
                      type="button"
                      onClick={() => setPreviewScale(0.7)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        previewScale === 0.7
                          ? "st-primary"
                          : "hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                      }`}
                    >
                      Pas (70%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewScale(1.0)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        previewScale === 1.0
                          ? "st-primary"
                          : "hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                      }`}
                    >
                      100%
                    </button>
                  </div>
                </div>
              </div>

              {/* Wrapper Scroll & Scaled Preview Container (Word-like Canvas) */}
              <div className="overflow-x-auto max-h-[calc(100vh-140px)] overflow-y-auto p-4 sm:p-6 flex justify-center bg-[var(--ds-surface-muted)] rounded-xl border border-[var(--ds-border-subtle)] shadow-inner">
                <div
                  style={{
                    width: `${210 * previewScale}mm`,
                    minHeight: `${297 * previewScale}mm`,
                    transition: "width 0.15s ease, min-height 0.15s ease",
                  }}
                  className="shrink-0 flex justify-center my-1"
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top center",
                      width: "210mm",
                    }}
                  >
                    <div
                      id="surat-preview-doc"
                      className="w-[210mm] bg-white shadow-2xl selection:bg-blue-100 ring-1 ring-slate-900/10"
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
                        stNumber="001"
                        stCode={
                          nomorFormatMode === "manual" && nomorSuratFormat
                            ? nomorSuratFormat
                                .replace("{klasifikasi}", "KSA.02.01")
                                .replace("{bulan}", "09")
                                .replace("{tahun}", currentYear)
                            : `K.18/TU/KSA.02.01/B`
                        }
                        currentMonth="09"
                        currentYear={currentYear}
                        menimbangItems={
                          menimbangItems.length > 0
                            ? menimbangItems
                            : [{ id: "preview-1", text: "bahwa dalam rangka pelaksanaan tugas..." }]
                        }
                        dasarItems={
                          dasarItems.length > 0
                            ? dasarItems
                            : [
                                {
                                  id: "preview-d1",
                                  text: `DIPA Balai KSDA Kalimantan Timur Tahun Anggaran ${currentYear}`,
                                },
                              ]
                        }
                        templateType={templateType}
                        untukItems={untukItems}
                        selectedEmployees={
                          templateType === "beda_hari"
                            ? [
                                {
                                  id: "emp-sample-1",
                                  nama_lengkap: "Contoh Pelaksana Tugas 1, S.Hut.",
                                  name: "Contoh Pelaksana Tugas 1, S.Hut.",
                                  nip: "19850101 201001 1 001",
                                  jabatan: "Pengendali Ekosistem Hutan",
                                },
                                {
                                  id: "emp-sample-2",
                                  nama_lengkap: "Contoh Pelaksana Tugas 2, A.Md.",
                                  name: "Contoh Pelaksana Tugas 2, A.Md.",
                                  nip: "19900202 201502 1 002",
                                  jabatan: "Polisi Kehutanan Terampil",
                                },
                              ]
                            : [
                                {
                                  id: "emp-sample-1",
                                  nama_lengkap: "Contoh Pelaksana Tugas, S.Hut.",
                                  name: "Contoh Pelaksana Tugas, S.Hut.",
                                  nip: "19850101 201001 1 001",
                                  jabatan: "Pengendali Ekosistem Hutan",
                                },
                              ]
                        }
                        employeeDates={{
                          "emp-sample-1": {
                            mulai: `${currentYear}-09-15`,
                            selesai: `${currentYear}-09-17`,
                          },
                          "emp-sample-2": {
                            mulai: `${currentYear}-09-16`,
                            selesai: `${currentYear}-09-19`,
                          },
                        }}
                        employeeDepartures={{
                          "emp-sample-1": "Samarinda",
                          "emp-sample-2": "Balikpapan",
                        }}
                        sertakanLaporan={defaultSertakanLaporan}
                        buildUntukText={() => {
                          const currentModeLokasi = activeTaskType?.mode_lokasi || (
                            defaultJenisTugas.toLowerCase().includes("dalam kawasan") ? "dalam_kawasan" :
                            defaultJenisTugas.toLowerCase().includes("perjalanan dinas") || defaultJenisTugas.toLowerCase().includes("luar wilayah") ? "luar_wilayah" :
                            "tempat_saja"
                          );
                          const sampleKegiatan = defaultKegiatan.trim() || "koordinasi dan verifikasi teknis lapangan perlindungan kawasan konservasi";

                          if (templateType === "plh" || defaultModeKegiatan === "manual") {
                            const manualBase = (
                              defaultKegiatan.trim() ||
                              "Melaksanakan tugas sehari-hari sebagai pelaksana harian Kepala Seksi Konservasi Sumber Daya Alam Wilayah Wilayah I Berau"
                            )
                              .replace(/\{wilayah\}/gi, "Wilayah I Berau")
                              .replace(/\{pejabat\}/gi, "Kepala Seksi Konservasi Sumber Daya Alam Wilayah Wilayah I Berau")
                              .replace(/\{tahun\}/gi, currentYear)
                              .trim()
                              .replace(/[;,.]+$/, "");
                            if (activeTaskType?.aturan_durasi === "wajib_1_hari") {
                              return `${manualBase}, selama 1 (satu) hari pada tanggal 15 September ${currentYear};`;
                            }
                            return `${manualBase}, selama 3 (tiga) hari terhitung mulai tanggal 15 September sampai dengan 17 September ${currentYear};`;
                          }

                          const diktum = buildKegiatanDiktumText({
                            modeLokasi: currentModeLokasi,
                            jenisTugas: defaultJenisTugas,
                            kotaAsal: "Samarinda",
                            kotaTujuan: currentModeLokasi === "dalam_kawasan" ? "Kabupaten Paser" : "Kabupaten Kutai Barat",
                            tempatSpesifik: currentModeLokasi === "dalam_kawasan" ? "Cagar Alam Teluk Adang" : "Suaka Badak Kelian",
                            namaKegiatanText: sampleKegiatan,
                            untukKegiatanText: "Pemeriksaan Pekerjaan",
                            contohFormat: activeTaskType?.contoh_format,
                          });

                          if (activeTaskType?.aturan_durasi === "wajib_1_hari" || defaultJenisTugas.includes("1 Hari")) {
                            return `${diktum}, selama 1 (satu) hari pada tanggal 15 September ${currentYear};`;
                          }

                          return `${diktum}, selama 3 (tiga) hari terhitung mulai tanggal 15 September sampai dengan 17 September ${currentYear};`;
                        }}
                        buildBiayaText={() => {
                          if (templateBiayaText && templateBiayaText.trim()) {
                            return templateBiayaText.replace(/{tahun}/g, currentYear);
                          }
                          return buildBiayaTextFor(
                            defaultSumberDana || "dipa",
                            "",
                            currentYear,
                            templateType,
                            expenseTemplates
                          );
                        }}
                        kotaSurat="Samarinda"
                        tanggalSurat={`28 September ${currentYear}`}
                        kepalaBalai={{
                          name:
                            employees.find((e) => String(e.id) === signerId)?.nama_lengkap ||
                            employees.find((e) => String(e.id) === signerId)?.name ||
                            "M. Ari Wibawanto, S.Hut., M.Sc.",
                          nip:
                            employees.find((e) => String(e.id) === signerId)?.nip ||
                            "19740514 199903 1 001",
                        }}
                        headerTitle={headerTitle}
                        penutupText={penutupText}
                        dateFormatStyle={dateFormatStyle}
                        signerAuthorityMandate={signerAuthorityMandate}
                        signerTitle={signerTitle}
                        tembusanPosition={tembusanPosition}
                        tembusanLabel={tembusanLabel}
                        tembusanItems={tembusanItems.filter(Boolean)}
                        sumberDana={defaultSumberDana || "dipa"}
                        kopImageUrl={kopImageUrl}
                        nomorNumberingType={nomorNumberingType}
                        customNomorNaskah="${nomor_naskah}"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Template Surat Tugas</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Tipe Format</th>
                  <th className="py-3.5 px-4 min-w-[190px]">Penandatangan Default</th>
                  <th className="py-3.5 px-4 w-28 text-center">Status</th>
                  {canWrite && <th className="py-3.5 px-4 w-32 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {isLoadingTemplates ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="py-12 text-center text-[var(--ds-fg-muted)]">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--ds-accent-fg)] mb-2" />
                      Memuat daftar template Surat Tugas...
                    </td>
                  </tr>
                ) : filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="py-12 text-center text-[var(--ds-fg-muted)]">
                      <AlertCircle className="w-8 h-8 text-[var(--ds-fg-muted)] mx-auto mb-2" />
                      {templateSearch || templateStatusFilter !== "all"
                        ? "Tidak ada template Surat Tugas yang sesuai kriteria pencarian."
                        : "Belum ada template Surat Tugas."}
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((template, index) => (
                    <tr
                      key={template.id}
                      className="hover:bg-[var(--ds-surface-muted)] transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-[var(--ds-fg-muted)]">
                        {index + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--ds-fg)] text-sm">
                            {template.name}
                          </span>
                          {template.code && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-mono text-xs font-bold border border-[var(--ds-accent-soft-border)]">
                              {template.code}
                            </span>
                          )}
                          {template.is_default && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] text-xs font-bold border border-[var(--ds-accent-soft-border)]">
                              Default
                            </span>
                          )}
                          <span className="text-xs text-[var(--ds-fg-muted)] font-mono">
                            v{template.version} · {template.is_system ? "Sistem" : "Custom"}
                          </span>
                        </div>
                        <div className="mt-1 max-w-2xl text-xs text-[var(--ds-fg-muted)] line-clamp-2">
                          {template.description || "—"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {template.type === "beda_hari" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]">
                            Beda Hari • Lampiran
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] uppercase font-mono">
                            {template.type}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[var(--ds-fg)]">
                          {template.default_signer_name || "Default manual"}
                        </div>
                        {template.default_signer_nip && (
                          <div className="text-xs font-mono text-[var(--ds-fg-muted)] mt-0.5">
                            NIP. {template.default_signer_nip}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => canWrite && void handleToggleTemplateActive(template)}
                          title={canWrite ? "Klik untuk ubah status aktif/nonaktif" : undefined}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                            canWrite ? "cursor-pointer" : "cursor-default"
                          } ${
                            template.is_active
                              ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
                              : "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)]"
                          }`}
                        >
                          {template.is_active ? (
                            <>
                              <Check className="w-3 h-3" /> Aktif
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" /> Nonaktif
                            </>
                          )}
                        </button>
                      </td>

                      {canWrite && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="Edit Template"
                              onClick={() => handleEditTemplate(template)}
                              className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Jadikan Default"
                              onClick={() => void handleSetDefaultTemplate(template.id)}
                              disabled={template.is_default || !template.is_active}
                              className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Duplikasi Template"
                              onClick={() => void handleDuplicateTemplate(template.id)}
                              className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)] transition-colors cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Hapus Template"
                              onClick={() => setDeleteTarget(template)}
                              disabled={template.is_system}
                              className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <SuratTugasDialog onClose={() => setDeleteTarget(null)} busy={isDeleting} className="sm:max-w-md">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">
                  Hapus Template Surat Tugas?
                </DialogTitle>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1 leading-relaxed">
                  Template <strong>{deleteTarget.name}</strong> akan dihapus. Surat tugas yang sudah pernah dibuat dengan template ini tetap aman.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteTemplate()}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer st-danger"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Hapus Template
              </button>
            </div>
        </SuratTugasDialog>
      )}
    </div>
  );
}
