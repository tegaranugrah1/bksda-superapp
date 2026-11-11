"use client";

import { KepegawaianTabContent } from "../_components/KepegawaianTabContent";

import { KepegawaianDialog } from "../_components/KepegawaianDialog";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  TableProperties,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRole } from "@/hooks/useRole";

type AttachmentType = "incoming" | "supporting" | "reply";
type Category = "Mahasiswa" | "Instansi" | "Internal" | "Masyarakat" | "Lainnya";

type Attachment = {
  id: number;
  type: AttachmentType;
  original_name: string;
  mime_type: string;
  size: number;
  note?: string | null;
  download_url: string;
  preview_url: string;
};

type IncomingLetter = {
  id: number;
  no_agenda: string;
  no_surat_masuk?: string | null;
  tanggal_surat?: string | null;
  tanggal_diterima: string;
  asal_surat: string;
  kategori: Category;
  perihal?: string | null;
  catatan?: string | null;
  no_surat_balasan?: string | null;
  tanggal_surat_balasan?: string | null;
  has_reply: boolean;
  attachments: Attachment[];
};

type FormState = Omit<IncomingLetter, "id" | "has_reply" | "attachments" | "kategori"> & { kategori: Category };

const CATEGORIES: Category[] = ["Mahasiswa", "Instansi", "Internal", "Masyarakat", "Lainnya"];
const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png";

const CATEGORY_STYLES: Record<Category, { badge: string }> = {
  Mahasiswa: { badge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]   " },
  Instansi: { badge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]   " },
  Internal: { badge: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]   " },
  Masyarakat: { badge: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]   " },
  Lainnya: { badge: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] border-[var(--ds-border-subtle)]   " },
};

const UPLOAD_CONFIG: Record<AttachmentType, { title: string; description: string; hint: string; card: string; icon: string }> = {
  incoming: {
    title: "Surat Masuk Utama",
    description: "Upload berkas surat atau dokumen utama yang diterima.",
    hint: "PDF, DOC, XLS, JPG, PNG (Maks 20MB)",
    card: "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)]  ",
    icon: "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]",
  },
  supporting: {
    title: "Dokumen Pendukung",
    description: "Proposal, lampiran teknis, materi PPT, atau berkas tambahan.",
    hint: "PPT, PPTX, PDF, DOC, XLS, JPG, PNG",
    card: "border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] hover:border-[var(--ds-status-warning-border)]  ",
    icon: "bg-[var(--ds-status-warning-fg)] text-[var(--ds-accent-on-solid)]",
  },
  reply: {
    title: "Surat Balasan Balai",
    description: "Upload salinan surat balasan yang sudah diterbitkan.",
    hint: "PDF, DOC, JPG, PNG",
    card: "border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] hover:border-[var(--ds-status-success-border)]  ",
    icon: "bg-[var(--ds-status-success-fg)] text-[var(--ds-accent-on-solid)]",
  },
};

const EMPTY_FORM: FormState = {
  no_agenda: "",
  no_surat_masuk: "",
  tanggal_surat: "",
  tanggal_diterima: new Date().toISOString().slice(0, 10),
  asal_surat: "",
  kategori: "Instansi",
  perihal: "",
  catatan: "",
  no_surat_balasan: "",
  tanggal_surat_balasan: "",
};

function formatBytes(size: number): string {
  if (!size || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentLabel(type: AttachmentType): string {
  return type === "incoming" ? "Surat Masuk" : type === "reply" ? "Surat Balasan" : "Pendukung";
}

function previewMessage(mimeType: string): string {
  if (mimeType.includes("powerpoint")) return "PPT/PPTX belum dapat dipreview langsung di browser.";
  if (mimeType.includes("word")) return "DOC/DOCX belum dapat dipreview langsung di browser.";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "XLS/XLSX belum dapat dipreview langsung di browser.";
  return "Pratinjau belum tersedia untuk format ini.";
}

export default function EmployeeIncomingLettersPage() {
  const confirm = useConfirm();
  const { canWrite } = useRole();

  const [items, setItems] = useState<IncomingLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kategori, setKategori] = useState("");
  const [statusBalasan, setStatusBalasan] = useState<"" | "pending" | "replied">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination & Summary
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summaryCounts, setSummaryCounts] = useState({
    all: 0,
    pending: 0,
    replied: 0,
    this_month: 0,
  });

  // Modals & Drawers
  const [detailItem, setDetailItem] = useState<IncomingLetter | null>(null);
  const [editing, setEditing] = useState<IncomingLetter | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<Record<AttachmentType, File[]>>({ incoming: [], supporting: [], reply: [] });
  const [saving, setSaving] = useState(false);

  // Preview & Export
  const [preview, setPreview] = useState<{ attachment: Attachment; dataUrl: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<"all" | "current_filter" | "this_month" | "this_year" | "custom">("all");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const hasActiveFilters = Boolean(search || kategori || statusBalasan || startDate || endDate);

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setKategori("");
    setStatusBalasan("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await api.get("/kepegawaian/surat-masuk", {
        params: {
          search: debouncedSearch || undefined,
          kategori: kategori || undefined,
          status_balasan: statusBalasan || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page,
          per_page: perPage,
        },
      });
      const data = response.data?.data;
      setItems(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      setLastPage(response.data?.meta?.last_page || 1);
      setTotal(response.data?.meta?.total || 0);
      if (response.data?.meta?.summary_counts) {
        setSummaryCounts(response.data.meta.summary_counts);
      }
    } catch {
      setLoadError(true);
      toast.error("Gagal memuat arsip surat.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, endDate, kategori, page, perPage, startDate, statusBalasan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({ ...EMPTY_FORM, tanggal_diterima: new Date().toISOString().slice(0, 10) });
    setFiles({ incoming: [], supporting: [], reply: [] });
  };

  const openEdit = (item: IncomingLetter) => {
    setEditing(item);
    setDetailItem(null);
    setFormOpen(true);
    setForm({
      no_agenda: item.no_agenda,
      no_surat_masuk: item.no_surat_masuk || "",
      tanggal_surat: item.tanggal_surat || "",
      tanggal_diterima: item.tanggal_diterima,
      asal_surat: item.asal_surat,
      kategori: item.kategori,
      perihal: item.perihal || "",
      catatan: item.catatan || "",
      no_surat_balasan: item.no_surat_balasan || "",
      tanggal_surat_balasan: item.tanggal_surat_balasan || "",
    });
    setFiles({ incoming: [], supporting: [], reply: [] });
  };

  const setField = (field: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleFiles = (type: AttachmentType, list: FileList | null) => {
    if (!list) return;
    const validFiles: File[] = [];
    for (const file of Array.from(list)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Berkas "${file.name}" melebihi batas maksimal 20 MB.`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    setFiles((current) => ({
      ...current,
      [type]: [...current[type], ...validFiles],
    }));
  };

  const removeStagedFile = (type: AttachmentType, index: number) => {
    setFiles((current) => ({
      ...current,
      [type]: current[type].filter((_, idx) => idx !== index),
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.no_agenda.trim() || !form.asal_surat.trim() || !form.tanggal_diterima) {
      toast.error("Nomor agenda, tanggal diterima, dan asal surat wajib diisi.");
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, value ?? "");
    });

    files.incoming.forEach((file) => {
      payload.append("attachments[]", file);
      payload.append("attachment_types[]", "incoming");
    });
    files.supporting.forEach((file) => {
      payload.append("attachments[]", file);
      payload.append("attachment_types[]", "supporting");
    });
    files.reply.forEach((file) => {
      payload.append("attachments[]", file);
      payload.append("attachment_types[]", "reply");
    });

    setSaving(true);
    try {
      const url = editing ? `/kepegawaian/surat-masuk/${editing.id}` : "/kepegawaian/surat-masuk";
      await api.post(url, payload, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(editing ? "Arsip surat diperbarui." : "Arsip surat berhasil ditambahkan.");
      setEditing(null);
      setFormOpen(false);
      await loadItems();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Gagal menyimpan arsip surat.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const params: Record<string, string> = {};

      if (exportPeriod === "current_filter") {
        if (debouncedSearch) params.search = debouncedSearch;
        if (kategori) params.kategori = kategori;
        if (statusBalasan) params.status_balasan = statusBalasan;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      } else if (exportPeriod === "this_month") {
        params.start_date = firstDay;
        params.end_date = lastDay;
      } else if (exportPeriod === "this_year") {
        params.start_date = `${year}-01-01`;
        params.end_date = `${year}-12-31`;
      } else if (exportPeriod === "custom") {
        if (!exportStartDate || !exportEndDate) {
          toast.error("Isi rentang tanggal terlebih dahulu.");
          return;
        }
        params.start_date = exportStartDate;
        params.end_date = exportEndDate;
      }

      const response = await api.get("/kepegawaian/surat-masuk/export/excel", {
        params,
        responseType: "blob",
        timeout: 60000,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Arsip_Surat_Masuk_Kepegawaian_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Arsip surat berhasil diekspor ke Excel.");
      setExportOpen(false);
    } catch {
      toast.error("Gagal mengekspor arsip surat.");
    }
  };

  const handleDelete = async (item: IncomingLetter) => {
    if (
      !(await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
        title: "Hapus Arsip Surat",
        description: `Hapus arsip agenda ${item.no_agenda} (${item.asal_surat})? Seluruh berkas lampiran di storage juga akan dihapus permanen.`,
        confirmText: "Hapus",
        cancelText: "Batal",
        variant: "danger",
      }))
    )
      return;

    try {
      await api.delete(`/kepegawaian/surat-masuk/${item.id}`);
      toast.success("Arsip surat berhasil dihapus.");
      if (detailItem?.id === item.id) setDetailItem(null);
      await loadItems();
    } catch {
      toast.error("Gagal menghapus arsip surat.");
    }
  };

  const download = (attachment: Attachment) => {
    const filename = attachment.original_name || "lampiran";
    let downloadPath = attachment.download_url;
    // Sertakan nama berkas pada URL agar IDM/browser langsung mengenali nama dan ekstensi asli
    if (!downloadPath.includes("/download/")) {
      downloadPath = `${downloadPath.replace(/\/download$/, "")}/download/${encodeURIComponent(filename)}`;
    }
    const url = `/api${downloadPath.replace(/^\/api/, "")}`;

    // Buka tab baru untuk navigasi unduhan langsung
    // Mencegah browser ganda mentrigger unduhan lokal saat IDM aktif
    window.open(url, "_blank", "noopener");
  };

  const openAttachment = async (attachment: Attachment) => {
    setPreview({ attachment, dataUrl: null });
    const previewable =
      attachment.mime_type === "application/pdf" ||
      attachment.mime_type === "image/jpeg" ||
      attachment.mime_type === "image/png";

    if (!previewable) return;

    setPreviewLoading(true);
    try {
      const response = await api.get(attachment.preview_url);
      setPreview({ attachment, dataUrl: response.data.data_url });
    } catch {
      setPreview(null);
      toast.error("Gagal memuat isi lampiran.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewLoading(false);
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (
      !editing ||
      !(await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
        title: "Hapus Lampiran",
        description: `Hapus ${attachment.original_name} dari arsip ini? Berkas storage juga akan dihapus.`,
        confirmText: "Hapus",
        cancelText: "Batal",
        variant: "danger",
      }))
    )
      return;

    try {
      await api.delete(`/kepegawaian/surat-masuk/${editing.id}/attachments/${attachment.id}`);
      setEditing((current) =>
        current ? { ...current, attachments: current.attachments.filter((item) => item.id !== attachment.id) } : current
      );
      await loadItems();
      toast.success("Lampiran berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus lampiran.");
    }
  };

  const now = new Date();
  const thisMonthFirst = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const isThisMonthFilter = startDate === thisMonthFirst && endDate === thisMonthLast;

  return (
    <div data-module="kepegawaian" className="kpg-ui p-5 md:p-7 space-y-5">
      {/* Header Halaman - Clean Enterprise Pro Max */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col gap-4 xl:flex-row xl:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center text-[var(--ds-accent-fg)] shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-[var(--ds-fg)] tracking-tight mt-0.5">
              Arsip Surat Masuk
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Pencatatan agenda surat masuk, pengelolaan berkas lampiran, dan penelusuran status balasan balai.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            className="h-9 px-3.5 rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--ds-status-success-fg)]" />
            <span>Export Excel</span>
          </Button>
          {canWrite && (
            <Button
              size="sm"
              onClick={openCreate}
              className="h-9 px-4 rounded-xl gap-1.5 text-xs font-bold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Arsip</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filter Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            key: "all",
            label: "Total Arsip Surat",
            count: summaryCounts.all,
            icon: Inbox,
            isActive: !statusBalasan && !isThisMonthFilter,
            onClick: () => {
              setStatusBalasan("");
              setStartDate("");
              setEndDate("");
              setPage(1);
            },
            activeClass: "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]  ring-1 ring-[var(--ds-accent-soft-border)]",
            iconClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  ",
          },
          {
            key: "pending",
            label: "Menunggu Balasan",
            count: summaryCounts.pending,
            icon: Clock,
            isActive: statusBalasan === "pending",
            onClick: () => {
              setStatusBalasan(statusBalasan === "pending" ? "" : "pending");
              setPage(1);
            },
            activeClass: "border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)]  ring-1 ring-[var(--ds-status-warning-border)]",
            iconClass: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]  ",
          },
          {
            key: "replied",
            label: "Sudah Dibalas",
            count: summaryCounts.replied,
            icon: CheckCircle2,
            isActive: statusBalasan === "replied",
            onClick: () => {
              setStatusBalasan(statusBalasan === "replied" ? "" : "replied");
              setPage(1);
            },
            activeClass: "border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)]  ring-1 ring-[var(--ds-status-success-border)]",
            iconClass: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]  ",
          },
          {
            key: "this_month",
            label: "Arsip Bulan Ini",
            count: summaryCounts.this_month,
            icon: Calendar,
            isActive: isThisMonthFilter,
            onClick: () => {
              if (isThisMonthFilter) {
                setStartDate("");
                setEndDate("");
              } else {
                setStartDate(thisMonthFirst);
                setEndDate(thisMonthLast);
              }
              setPage(1);
            },
            activeClass: "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]  ring-1 ring-[var(--ds-accent-soft-border)]",
            iconClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  ",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              aria-pressed={card.isActive}
              type="button"

              onClick={card.onClick}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                card.isActive
                  ? card.activeClass
                  : "bg-[var(--ds-surface)]  border-[var(--ds-border-subtle)]  hover:border-[var(--ds-border-subtle)] "
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-[var(--ds-fg-muted)] flex items-center gap-1.5">
                  {card.key === "pending" && card.count > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--ds-status-warning-fg)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--ds-status-warning-fg)]" />
                    </span>
                  )}
                  {card.label}
                </p>
                <p className="text-xl font-extrabold text-[var(--ds-fg)] mt-0.5 tabular-nums">
                  {card.count}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconClass}`}>
                <Icon className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3 shadow-xs">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12 items-center">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--ds-fg-muted)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari agenda, nomor, pengirim, perihal..."
              className="pl-9 pr-8 h-9 text-xs border-[var(--ds-border-subtle)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 rounded-full p-1 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]" aria-label="Tutup"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Kategori Select */}
          <div className="lg:col-span-2">
            <select
              value={kategori}
              onChange={(event) => {
                setKategori(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 text-xs font-semibold text-[var(--ds-fg)] transition focus:border-[var(--ds-accent-soft-border)] focus:outline-none" aria-label="Kategori surat"
            >
              <option value="">Semua Kategori</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Status Balasan Select */}
          <div className="lg:col-span-2">
            <select
              value={statusBalasan}
              onChange={(event) => {
                setStatusBalasan(event.target.value as "" | "pending" | "replied");
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 text-xs font-semibold text-[var(--ds-fg)] transition focus:border-[var(--ds-accent-soft-border)] focus:outline-none" aria-label="Status balasan"
            >
              <option value="">Semua Status Balasan</option>
              <option value="pending">Menunggu Balasan</option>
              <option value="replied">Sudah Dibalas</option>
            </select>
          </div>

          {/* Rentang Tanggal Diterima */}
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-3">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              title="Dari Tanggal Diterima"
              className="h-9 text-xs border-[var(--ds-border-subtle)]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              title="Sampai Tanggal Diterima"
              className="h-9 text-xs border-[var(--ds-border-subtle)]"
            />
          </div>

          {/* Per Page & Reset */}
          <div className="lg:col-span-2 flex items-center justify-end gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              title="Jumlah baris per halaman"
              className="h-9 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2.5 text-xs font-semibold text-[var(--ds-fg)] outline-none" aria-label="Jumlah per halaman"
            >
              <option value="10">10 / hal</option>
              <option value="20">20 / hal</option>
              <option value="50">50 / hal</option>
              <option value="100">100 / hal</option>
            </select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] rounded-xl"
                title="Reset Semua Filter"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Arsip Surat */}
      <AnimatePresence mode="wait" initial={false}>
        <KepegawaianTabContent
          key={`${statusBalasan}-${kategori}-${page}-${isThisMonthFilter}-${debouncedSearch}`}

          className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-xs min-h-[460px] flex flex-col justify-between"
        >
          <div className="overflow-x-auto flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-xs text-[var(--ds-fg-muted)] space-y-2">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--ds-accent-soft-border)] border-t-transparent" />
                <p>Memuat arsip surat masuk...</p>
              </div>
            ) : loadError ? (
              <div role="alert" className="p-12 text-center text-sm text-[var(--ds-status-danger-fg)]">Gagal memuat arsip surat. <button type="button" className="kpg-secondary ml-2 rounded-lg px-3 py-2" onClick={loadItems}>Coba lagi</button></div>
            ) : items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-sm text-[var(--ds-fg-muted)] space-y-3">
                <Inbox className="mx-auto h-12 w-12 text-[var(--ds-fg-muted)]" />
                <div className="font-semibold text-[var(--ds-fg)]">Belum ada arsip surat masuk</div>
                <p className="text-xs max-w-sm mx-auto text-[var(--ds-fg-muted)]">
                  {hasActiveFilters
                    ? "Tidak ditemukan surat yang cocok dengan filter aktif. Coba ubah kata kunci atau reset filter."
                    : "Mulai pencatatan dengan menekan tombol Tambah Arsip di atas."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs rounded-xl">
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  <tr>
                    <th className="py-3.5 px-4 w-32"># Agenda</th>
                    <th className="py-3.5 px-3 w-32">Kategori</th>
                    <th className="py-3.5 px-4 min-w-48">Nomor &amp; Tgl Surat</th>
                    <th className="py-3.5 px-4 min-w-56">Asal Surat / Pengirim</th>
                    <th className="py-3.5 px-4 min-w-64">Perihal</th>
                    <th className="py-3.5 px-4 min-w-44">Status Balasan</th>
                    <th className="py-3.5 px-3 min-w-28 text-center">Lampiran</th>
                    <th className="py-3.5 px-4 w-28 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                  {items.map((item) => {
                    const isReplied = Boolean(item.has_reply || (item.no_surat_balasan && item.no_surat_balasan.trim()));
                    const catStyle = CATEGORY_STYLES[item.kategori] || CATEGORY_STYLES.Lainnya;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setDetailItem(item)}
                        className="group cursor-pointer transition-colors hover:bg-[var(--ds-accent-soft)]"
                      >
                        {/* Kolom Agenda */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block rounded-md border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--ds-accent-fg)]">
                            #{item.no_agenda || "-"}
                          </span>
                          <div className="mt-1 text-xs text-[var(--ds-fg-muted)] font-medium">
                            Diterima: {item.tanggal_diterima || "-"}
                          </div>
                        </td>

                        {/* Kolom Kategori */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${catStyle.badge}`}
                          >
                            {item.kategori}
                          </span>
                        </td>

                        {/* Kolom Nomor & Tanggal Surat */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--ds-fg)] line-clamp-2 text-xs">
                            {item.no_surat_masuk ? (
                              item.no_surat_masuk
                            ) : (
                              <span className="text-[var(--ds-fg-muted)] italic">Tanpa nomor surat</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--ds-fg-muted)]">
                            Tgl Surat: {item.tanggal_surat || <span className="text-[var(--ds-fg-muted)]">-</span>}
                          </div>
                        </td>

                        {/* Kolom Pengirim */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--ds-fg)] line-clamp-2 text-xs">
                            {item.asal_surat}
                          </div>
                          {item.catatan ? (
                            <div className="mt-0.5 text-xs text-[var(--ds-fg-muted)] line-clamp-1 italic">
                              Catatan: {item.catatan}
                            </div>
                          ) : null}
                        </td>

                        {/* Kolom Perihal */}
                        <td className="py-3 px-4">
                          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ds-fg-muted)]">
                            {item.perihal || <span className="text-[var(--ds-fg-muted)]">-</span>}
                          </p>
                        </td>

                        {/* Kolom Status Balasan */}
                        <td className="py-3 px-4">
                          {isReplied ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] px-2 py-0.5 text-xs font-bold text-[var(--ds-status-success-fg)]">
                                <CheckCircle2 className="h-3 w-3 text-[var(--ds-status-success-fg)]" />
                                Sudah Dibalas
                              </span>
                              {item.no_surat_balasan && (
                                <div className="text-xs font-semibold text-[var(--ds-fg)] truncate max-w-44">
                                  {item.no_surat_balasan}
                                </div>
                              )}
                              {item.tanggal_surat_balasan && (
                                <div className="text-xs text-[var(--ds-fg-muted)]">Tgl: {item.tanggal_surat_balasan}</div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--ds-fg-muted)]">
                              <Clock className="h-3 w-3 text-[var(--ds-fg-muted)]" />
                              Belum Dibalas
                            </span>
                          )}
                        </td>

                        {/* Kolom Lampiran (Badge Kapsul Cerdas) */}
                        <td className="py-3 px-3 text-center">
                          {item.attachments && item.attachments.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailItem(item);
                              }}
                              title="Klik untuk melihat berkas lampiran"
                              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-fg)] transition hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-accent-fg)]"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-[var(--ds-accent-fg)]" />
                              <span>{item.attachments.length} Berkas</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--ds-fg-muted)]">-</span>
                          )}
                        </td>

                        {/* Kolom Aksi */}
                        <td className="py-3 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailItem(item)}
                              title="Lihat Detail Lengkap"
                              className="h-8 w-8 p-0 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] rounded-xl"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canWrite && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(item)}
                                  title="Edit Arsip"
                                  className="h-8 w-8 p-0 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-status-warning-bg)] rounded-xl"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(item)}
                                  title="Hapus Arsip"
                                  className="h-8 w-8 p-0 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-xl"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--ds-status-danger-fg)]" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs">
                <div className="flex items-center gap-2 text-xs text-[var(--ds-fg-muted)]">
                  <span>
                    Menampilkan{" "}
                    <b className="text-[var(--ds-fg)]">
                      {total > 0 ? (page - 1) * perPage + 1 : 0}
                    </b>{" "}
                    -{" "}
                    <b className="text-[var(--ds-fg)]">
                      {Math.min(page * perPage, total)}
                    </b>{" "}
                    dari <b className="text-[var(--ds-fg)]">{total}</b> arsip surat
                  </span>
                  {hasActiveFilters && (
                    <span className="inline-flex items-center rounded-full bg-[var(--ds-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ds-accent-fg)]">
                      Terfilter
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="h-8 px-3 text-xs font-semibold rounded-xl"
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs font-medium text-[var(--ds-fg-muted)] px-2">
                    Halaman <b className="text-[var(--ds-fg)]">{page}</b> dari{" "}
                    <b className="text-[var(--ds-fg)]">{lastPage}</b>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= lastPage}
                    onClick={() => setPage((value) => value + 1)}
                    className="h-8 px-3 text-xs font-semibold rounded-xl"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </KepegawaianTabContent>
    </AnimatePresence>

      {/* MODAL POP-UP DETAIL SURAT (Tengah Layar) */}
      <AnimatePresence>
        {detailItem && (
          <KepegawaianDialog title="Detail surat masuk" onClose={() => setDetailItem(null)} busy={false} className="sm:max-w-3xl">
            <div

              className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-2xl flex flex-col max-h-[90vh]"
            >
            {/* Header Modal Detail */}
            <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--ds-accent-fg)]">
                  #{detailItem.no_agenda}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    CATEGORY_STYLES[detailItem.kategori]?.badge || ""
                  }`}
                >
                  {detailItem.kategori}
                </span>
                {detailItem.has_reply || detailItem.no_surat_balasan ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--ds-status-success-fg)]">
                    <CheckCircle2 className="h-3 w-3 text-[var(--ds-status-success-fg)]" />
                    Sudah Dibalas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--ds-fg-muted)]">
                    <Clock className="h-3 w-3" />
                    Menunggu Balasan
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-lg p-1.5 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]" aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Isi Detail Surat */}
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Grid Metadata Utama */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">Nomor Surat Masuk</div>
                  <div className="mt-1 font-semibold text-[var(--ds-fg)]">
                    {detailItem.no_surat_masuk || <span className="text-[var(--ds-fg-muted)] italic">Tanpa nomor surat</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">Tanggal Surat</div>
                  <div className="mt-1 font-medium text-[var(--ds-fg)]">
                    {detailItem.tanggal_surat || <span className="text-[var(--ds-fg-muted)]">-</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">Asal / Pengirim Surat</div>
                  <div className="mt-1 font-bold text-[var(--ds-fg)]">{detailItem.asal_surat}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">Tanggal Diterima Balai</div>
                  <div className="mt-1 font-medium text-[var(--ds-fg)]">{detailItem.tanggal_diterima}</div>
                </div>
                {detailItem.catatan && (
                  <div className="sm:col-span-2 pt-2 border-t border-[var(--ds-border-subtle)]">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">Catatan Khusus Pengirim</div>
                    <div className="mt-1 text-xs text-[var(--ds-fg-muted)] italic">{detailItem.catatan}</div>
                  </div>
                )}
              </div>

              {/* Perihal */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Perihal / Ringkasan Surat</h4>
                <div className="mt-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3.5 text-sm leading-relaxed text-[var(--ds-fg)]">
                  {detailItem.perihal || <span className="text-[var(--ds-fg-muted)] italic">Tidak ada catatan perihal.</span>}
                </div>
              </div>

              {/* Status Balasan */}
              <div className="rounded-xl border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--ds-status-success-fg)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--ds-status-success-fg)]" />
                  <span>Surat Balasan Balai BKSDA</span>
                </div>
                {detailItem.no_surat_balasan ? (
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-[var(--ds-fg)] pt-1">
                    <div>
                      <span className="text-[var(--ds-fg-muted)]">Nomor Surat Balasan: </span>
                      <b className="font-semibold text-[var(--ds-status-success-fg)]">{detailItem.no_surat_balasan}</b>
                    </div>
                    <div>
                      <span className="text-[var(--ds-fg-muted)]">Tanggal Balasan: </span>
                      <b>{detailItem.tanggal_surat_balasan || "-"}</b>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Belum ada nomor atau berkas surat balasan yang dicatatkan.
                  </p>
                )}
              </div>

              {/* Daftar Berkas Lampiran */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Berkas Lampiran ({detailItem.attachments?.length || 0})
                  </h4>
                </div>
                {!detailItem.attachments || detailItem.attachments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--ds-border-subtle)] p-6 text-center text-xs text-[var(--ds-fg-muted)]">
                    Tidak ada file lampiran pada surat ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailItem.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--ds-fg)] truncate max-w-sm sm:max-w-md">
                              {attachment.original_name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--ds-fg-muted)]">
                              <span className="font-semibold text-[var(--ds-accent-fg)]">
                                {attachmentLabel(attachment.type)}
                              </span>
                              <span>•</span>
                              <span>{formatBytes(attachment.size)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAttachment(attachment)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Pratinjau
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => download(attachment)}
                            className="h-8 gap-1.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-xs text-[var(--ds-accent-on-solid)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Unduh
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal Detail */}
            <div className="flex items-center justify-between border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-3.5">
              <div>
                {canWrite && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(detailItem)}
                    className="gap-1.5 text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] hover:text-[var(--ds-status-danger-fg)] text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Arsip
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailItem(null)}>
                  Tutup
                </Button>
                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openEdit(detailItem)}
                    className="gap-1.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-xs text-[var(--ds-accent-on-solid)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Arsip
                  </Button>
                )}
              </div>
            </div>
          </div>
        </KepegawaianDialog>
      )}
    </AnimatePresence>

      {/* MODAL TAMBAH & EDIT ARSIP (Wide Side-by-Side Tanpa Scroll Layar) */}
      <AnimatePresence>
        {formOpen && canWrite && (
          <KepegawaianDialog title="Form arsip surat masuk" onClose={() => { setEditing(null); setFormOpen(false); }} busy={saving} className="sm:max-w-6xl">
            <form

              onSubmit={handleSave}
              className="flex flex-col w-full max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-2xl"
            >
            {/* Header Modal Form (Fixed Top) */}
            <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-sm">
                  {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
                <div>
                  <h2 className="text-base font-bold sm:text-lg">
                    {editing ? `Edit Arsip Agenda #${editing.no_agenda}` : "Tambah Arsip Surat Masuk"}
                  </h2>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    {editing
                      ? "Perbarui informasi atau kelola berkas lampiran surat masuk."
                      : "Lengkapi data pokok surat dan lampirkan berkas yang bersangkutan."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(false);
                }}
                className="rounded-lg p-1.5 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]" aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Form: 2 Kolom Seimbang (Memanjang ke Samping) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Kolom Kiri (7/12): Data Pokok Surat & Status Balasan */}
              <div className="lg:col-span-7 flex flex-col gap-3.5">
                {/* Data Pokok Surat */}
                <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Informasi Identitas Surat
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Nomor Agenda *</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)] font-mono"
                        placeholder="Contoh: 1432"
                        value={form.no_agenda}
                        onChange={(event) => setField("no_agenda", event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Kategori Pengirim *</span>
                      <select
                        value={form.kategori}
                        onChange={(event) => setField("kategori", event.target.value as Category)}
                        className="h-8.5 w-full rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2.5 text-xs font-medium"
                      >
                        {CATEGORIES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Nomor Surat Asal</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        placeholder="Jika ada nomor"
                        value={form.no_surat_masuk || ""}
                        onChange={(event) => setField("no_surat_masuk", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold sm:col-span-2">
                      <span>Asal Surat / Nama Pengirim *</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        placeholder="Contoh: Ditjen KSDAE / Nama Instansi / Pribadi"
                        value={form.asal_surat}
                        onChange={(event) => setField("asal_surat", event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Tanggal Diterima *</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        type="date"
                        value={form.tanggal_diterima}
                        onChange={(event) => setField("tanggal_diterima", event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold sm:col-span-2">
                      <span>Catatan Tambahan Pengirim</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        placeholder="Contoh: Pengirim dari SKW III Berau"
                        value={form.catatan || ""}
                        onChange={(event) => setField("catatan", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Tanggal Surat</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        type="date"
                        value={form.tanggal_surat || ""}
                        onChange={(event) => setField("tanggal_surat", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold sm:col-span-3">
                      <span>Perihal / Ringkasan Isi Surat</span>
                      <textarea
                        rows={2}
                        placeholder="Tuliskan uraian ringkas maksud atau perihal surat..."
                        value={form.perihal || ""}
                        onChange={(event) => setField("perihal", event.target.value)}
                        className="w-full resize-none rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-2 text-xs outline-none transition focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Nomor Agenda"
                      />
                    </label>
                  </div>
                </div>

                {/* Status Balasan Balai */}
                <div className="rounded-xl border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--ds-status-success-fg)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-status-success-fg)]">
                      Status Balasan Balai (Opsional)
                    </h3>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Nomor Surat Balasan</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        placeholder="Contoh: S.123/K.18/TU/KSA/10/2026"
                        value={form.no_surat_balasan || ""}
                        onChange={(event) => setField("no_surat_balasan", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Tanggal Surat Balasan</span>
                      <Input
                        className="h-8.5 text-xs bg-[var(--ds-surface)]"
                        type="date"
                        value={form.tanggal_surat_balasan || ""}
                        onChange={(event) => setField("tanggal_surat_balasan", event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan (5/12): Lampiran Tersimpan & Dropzone Upload Baru */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                {/* Lampiran Tersimpan di Storage (Khusus Edit) */}
                {editing && editing.attachments && editing.attachments.length > 0 && (
                  <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                        Lampiran Tersimpan ({editing.attachments.length})
                      </h3>
                      <span className="text-xs text-[var(--ds-fg-muted)]">Klik ikon sampah untuk menghapus</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {editing.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--ds-accent-fg)]" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[170px] sm:max-w-[210px] text-xs">
                                {attachment.original_name}
                              </p>
                              <p className="text-xs text-[var(--ds-fg-muted)]">
                                {attachmentLabel(attachment.type)} • {formatBytes(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment)}
                            className="h-6 w-6 p-0 text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] hover:text-[var(--ds-status-danger-fg)]"
                            title="Hapus berkas ini dari arsip"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dropzone Upload Lampiran Baru (Compact Row-Based Cards) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Upload Lampiran Baru
                    </h3>
                    <span className="text-xs text-[var(--ds-fg-muted)]">Maks 20 MB/file</span>
                  </div>

                  <div className="space-y-2">
                    {(["incoming", "supporting", "reply"] as AttachmentType[]).map((type) => {
                      const config = UPLOAD_CONFIG[type];
                      const stagedFiles = files[type];

                      return (
                        <div
                          key={type}
                          className={`rounded-xl border p-2.5 transition-colors ${config.card}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.icon}`}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold leading-tight">{config.title}</h4>
                                <p className="text-xs text-[var(--ds-fg-muted)] truncate">
                                  {config.hint}
                                </p>
                              </div>
                            </div>

                            <label
                              htmlFor={`attachment-${type}`}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-fg)] shadow-2xs transition hover:bg-[var(--ds-surface)] shrink-0"
                            >
                              <Upload className="h-3 w-3 text-[var(--ds-accent-fg)]" />
                              <span>Pilih File</span>
                              <input
                                id={`attachment-${type}`}
                                type="file"
                                multiple
                                accept={FILE_ACCEPT}
                                onChange={(event) => handleFiles(type, event.target.files)}
                                className="sr-only"
                              />
                            </label>
                          </div>

                          {/* Staged file list preview */}
                          {stagedFiles.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-current/10 pt-1.5">
                              {stagedFiles.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded-md bg-[var(--ds-surface)] px-2 py-1 text-xs shadow-2xs"
                                >
                                  <span className="truncate max-w-[180px] font-medium" title={file.name}>
                                    {file.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                    <span className="text-xs text-[var(--ds-fg-muted)]">{formatBytes(file.size)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeStagedFile(type, idx)}
                                      className="p-0.5 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)]"
                                      title="Batal pilih berkas ini"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form Action (Fixed Bottom) */}
            <div className="flex items-center justify-between border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-3 shrink-0">
              <span className="text-xs text-[var(--ds-fg-muted)] hidden sm:inline">
                Format didukung: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(false);
                  }}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  size="sm"
                  className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] min-w-28 text-xs font-semibold shadow-sm"
                >
                  {saving ? "Menyimpan..." : editing ? "Perbarui Arsip" : "Simpan Arsip"}
                </Button>
              </div>
            </div>
          </form>
        </KepegawaianDialog>
      )}
    </AnimatePresence>

      {/* MODAL PRATINJAU LAMPIRAN */}
      <AnimatePresence>
        {preview && (
          <KepegawaianDialog title="Pratinjau berkas surat masuk" onClose={closePreview} busy={false} className="sm:max-w-5xl">
            <div

              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[var(--ds-surface)] shadow-2xl"
            >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold" title={preview.attachment.original_name}>
                  {preview.attachment.original_name}
                </h3>
                <p className="mt-0.5 truncate text-xs text-[var(--ds-fg-muted)]">
                  {attachmentLabel(preview.attachment.type)} • Pratinjau Berkas
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup pratinjau"
                onClick={closePreview}
                className="rounded-lg p-2 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto bg-[var(--ds-surface-muted)] p-4">
              {previewLoading ? (
                <div className="text-sm text-[var(--ds-fg-muted)]">Memuat isi lampiran...</div>
              ) : preview.dataUrl && preview.attachment.mime_type === "application/pdf" ? (
                <iframe
                  title={preview.attachment.original_name}
                  src={preview.dataUrl}
                  className="h-[70vh] w-full rounded-lg bg-[var(--ds-surface)]"
                />
              ) : preview.dataUrl ? (
                // Native blob/data preview; sending this to the Next image optimizer is unnecessary.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.dataUrl}
                  alt={preview.attachment.original_name}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="max-w-sm text-center">
                  <FileText className="mx-auto h-12 w-12 text-[var(--ds-fg-muted)]" />
                  <p className="mt-3 text-sm font-semibold">{previewMessage(preview.attachment.mime_type)}</p>
                  <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
                    Berkas tersimpan aman di storage. Gunakan tombol Unduh Berkas untuk membukanya secara lokal.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--ds-border-subtle)] p-3">
              <Button type="button" variant="outline" onClick={closePreview}>
                Tutup
              </Button>
              <Button
                type="button"
                onClick={() => download(preview.attachment)}
                className="gap-2 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]"
              >
                <Download className="h-4 w-4" />
                Unduh Berkas
              </Button>
            </div>
          </div>
        </KepegawaianDialog>
      )}
    </AnimatePresence>

      {/* MODAL EXPORT EXCEL */}
      <AnimatePresence>
        {exportOpen && (
          <KepegawaianDialog title="Export arsip surat masuk" onClose={() => setExportOpen(false)} busy={false} className="sm:max-w-lg">
            <div

              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-2xl"
            >
            <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-md">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Export Arsip Surat Masuk</h2>
                  <p className="text-xs text-[var(--ds-fg-muted)]">Unduh rekapitulasi arsip ke format Excel (.xlsx)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-lg p-1.5 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]" aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Pilih Rentang / Periode Data
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => setExportPeriod("current_filter")}
                      className={`col-span-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        exportPeriod === "current_filter"
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   "
                          : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]  "
                      }`}
                    >
                      <Filter className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-accent-fg)]" />
                      <div className="text-xs">
                        <div className="font-semibold">Filter Pencarian Saat Ini</div>
                        <div className="mt-0.5 text-xs opacity-75">
                          Sesuai kriteria pencarian, status balasan, dan tanggal yang sedang aktif
                        </div>
                      </div>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExportPeriod("all")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      exportPeriod === "all"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   "
                        : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]  "
                    }`}
                  >
                    <TableProperties className="mt-0.5 h-4 w-4 text-[var(--ds-accent-fg)]" />
                    <div className="text-xs">
                      <div className="font-semibold">Semua Data</div>
                      <div className="mt-0.5 text-xs opacity-75">Seluruh arsip surat masuk</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPeriod("this_month")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      exportPeriod === "this_month"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   "
                        : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]  "
                    }`}
                  >
                    <Calendar className="mt-0.5 h-4 w-4 text-[var(--ds-accent-fg)]" />
                    <div className="text-xs">
                      <div className="font-semibold">Bulan Ini</div>
                      <div className="mt-0.5 text-xs opacity-75">
                        {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPeriod("this_year")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      exportPeriod === "this_year"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   "
                        : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]  "
                    }`}
                  >
                    <Calendar className="mt-0.5 h-4 w-4 text-[var(--ds-accent-fg)]" />
                    <div className="text-xs">
                      <div className="font-semibold">Tahun {new Date().getFullYear()}</div>
                      <div className="mt-0.5 text-xs opacity-75">Rekap 1 tahun anggaran</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPeriod("custom")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      exportPeriod === "custom"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   "
                        : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]  "
                    }`}
                  >
                    <Filter className="mt-0.5 h-4 w-4 text-[var(--ds-accent-fg)]" />
                    <div className="text-xs">
                      <div className="font-semibold">Rentang Kustom</div>
                      <div className="mt-0.5 text-xs opacity-75">Pilih tanggal spesifik</div>
                    </div>
                  </button>
                </div>
              </div>

              {exportPeriod === "custom" && (
                <div className="space-y-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5 text-xs font-medium text-[var(--ds-fg-muted)]">
                      Dari Tanggal
                      <Input
                        type="date"
                        value={exportStartDate}
                        onChange={(event) => setExportStartDate(event.target.value)}
                        className="bg-[var(--ds-surface)] text-xs"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium text-[var(--ds-fg-muted)]">
                      Sampai Tanggal
                      <Input
                        type="date"
                        value={exportEndDate}
                        onChange={(event) => setExportEndDate(event.target.value)}
                        className="bg-[var(--ds-surface)] text-xs"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] p-3.5">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--ds-accent-fg)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--ds-accent-fg)]" />
                  <span>Format 11 Kolom Excel:</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--ds-fg-muted)]">
                  <div>1. <b>No Agenda</b></div>
                  <div>2. <b>Tanggal Diterima</b></div>
                  <div>3. <b>Tanggal Surat</b></div>
                  <div>4. <b>No Surat Masuk</b></div>
                  <div>5. <b>Kategori</b></div>
                  <div>6. <b>Asal/Pengirim</b></div>
                  <div>7. <b>Perihal</b></div>
                  <div>8. <b>Catatan</b></div>
                  <div>9. <b>No Balasan</b></div>
                  <div>10. <b>Tanggal Balasan</b></div>
                  <div>11. <b>Lampiran</b></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={exportExcel}
                className="gap-2 bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]"
              >
                <Download className="h-4 w-4" />
                Download Excel (.xlsx)
              </Button>
            </div>
          </div>
        </KepegawaianDialog>
      )}
    </AnimatePresence>
    </div>
  );
}
