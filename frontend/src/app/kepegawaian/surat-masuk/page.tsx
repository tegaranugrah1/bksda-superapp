"use client";

import { useCallback, useEffect, useState } from "react";
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
  Mahasiswa: { badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  Instansi: { badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  Internal: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  Masyarakat: { badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  Lainnya: { badge: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" },
};

const UPLOAD_CONFIG: Record<AttachmentType, { title: string; description: string; hint: string; card: string; icon: string }> = {
  incoming: {
    title: "Surat Masuk Utama",
    description: "Upload berkas surat atau dokumen utama yang diterima.",
    hint: "PDF, DOC, XLS, JPG, PNG (Maks 20MB)",
    card: "border-blue-200 bg-blue-50/50 hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/30",
    icon: "bg-blue-600 text-white",
  },
  supporting: {
    title: "Dokumen Pendukung",
    description: "Proposal, lampiran teknis, materi PPT, atau berkas tambahan.",
    hint: "PPT, PPTX, PDF, DOC, XLS, JPG, PNG",
    card: "border-amber-200 bg-amber-50/50 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30",
    icon: "bg-amber-500 text-white",
  },
  reply: {
    title: "Surat Balasan Balai",
    description: "Upload salinan surat balasan yang sudah diterbitkan.",
    hint: "PDF, DOC, JPG, PNG",
    card: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/30",
    icon: "bg-emerald-600 text-white",
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
    <div className="p-5 md:p-7 space-y-5">
      {/* Header Halaman - Clean Enterprise Pro Max */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
                SDM &amp; Kepegawaian
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              Arsip Surat Masuk
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
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
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Excel</span>
          </Button>
          {canWrite && (
            <Button
              size="sm"
              onClick={openCreate}
              className="h-9 px-4 rounded-xl gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Arsip</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filter Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            key: "all",
            label: "Total Arsip Surat",
            count: summaryCounts.all || total,
            icon: Inbox,
            isActive: !statusBalasan && !isThisMonthFilter,
            onClick: () => {
              setStatusBalasan("");
              setStartDate("");
              setEndDate("");
              setPage(1);
            },
            activeClass: "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/20",
            iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
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
            activeClass: "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/20",
            iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
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
            activeClass: "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20",
            iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
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
            activeClass: "border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-500/20",
            iconClass: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                card.isActive
                  ? card.activeClass
                  : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12 items-center">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari agenda, nomor, pengirim, perihal..."
              className="pl-9 pr-8 h-9 text-xs border-slate-200 dark:border-zinc-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 rounded-full p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
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
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-200"
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
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-200"
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
              className="h-9 text-xs border-slate-200 dark:border-zinc-800"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              title="Sampai Tanggal Diterima"
              className="h-9 text-xs border-slate-200 dark:border-zinc-800"
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
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-200"
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
                className="h-9 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl"
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
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-zinc-500 space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p>Memuat arsip surat masuk...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-sm text-zinc-500 space-y-3">
              <Inbox className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <div className="font-semibold text-zinc-700 dark:text-zinc-300">Belum ada arsip surat masuk</div>
              <p className="text-xs max-w-sm mx-auto text-zinc-400">
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
            <div>
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-zinc-800/50">
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
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {items.map((item) => {
                    const isReplied = Boolean(item.has_reply || (item.no_surat_balasan && item.no_surat_balasan.trim()));
                    const catStyle = CATEGORY_STYLES[item.kategori] || CATEGORY_STYLES.Lainnya;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setDetailItem(item)}
                        className="group cursor-pointer transition-colors hover:bg-blue-50/40 dark:hover:bg-zinc-800/50"
                      >
                        {/* Kolom Agenda */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block rounded-md border border-blue-200 bg-blue-50/80 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
                            #{item.no_agenda || "-"}
                          </span>
                          <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                            Diterima: {item.tanggal_diterima || "-"}
                          </div>
                        </td>

                        {/* Kolom Kategori */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${catStyle.badge}`}
                          >
                            {item.kategori}
                          </span>
                        </td>

                        {/* Kolom Nomor & Tanggal Surat */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 text-xs">
                            {item.no_surat_masuk ? (
                              item.no_surat_masuk
                            ) : (
                              <span className="text-zinc-400 italic">Tanpa nomor surat</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-zinc-500">
                            Tgl Surat: {item.tanggal_surat || <span className="text-zinc-400">-</span>}
                          </div>
                        </td>

                        {/* Kolom Pengirim */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 text-xs">
                            {item.asal_surat}
                          </div>
                          {item.catatan ? (
                            <div className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1 italic">
                              Catatan: {item.catatan}
                            </div>
                          ) : null}
                        </td>

                        {/* Kolom Perihal */}
                        <td className="py-3 px-4">
                          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {item.perihal || <span className="text-zinc-400">-</span>}
                          </p>
                        </td>

                        {/* Kolom Status Balasan */}
                        <td className="py-3 px-4">
                          {isReplied ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Sudah Dibalas
                              </span>
                              {item.no_surat_balasan && (
                                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-44">
                                  {item.no_surat_balasan}
                                </div>
                              )}
                              {item.tanggal_surat_balasan && (
                                <div className="text-[11px] text-zinc-400">Tgl: {item.tanggal_surat_balasan}</div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                              <Clock className="h-3 w-3 text-zinc-400" />
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
                              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>{item.attachments.length} Berkas</span>
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
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
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
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
                                  className="h-8 w-8 p-0 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(item)}
                                  title="Hapus Arsip"
                                  className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 text-xs">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>
                    Menampilkan{" "}
                    <b className="text-slate-800 dark:text-slate-200">
                      {total > 0 ? (page - 1) * perPage + 1 : 0}
                    </b>{" "}
                    -{" "}
                    <b className="text-slate-800 dark:text-slate-200">
                      {Math.min(page * perPage, total)}
                    </b>{" "}
                    dari <b className="text-slate-800 dark:text-slate-200">{total}</b> arsip surat
                  </span>
                  {hasActiveFilters && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
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
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 px-2">
                    Halaman <b className="text-slate-900 dark:text-slate-100">{page}</b> dari{" "}
                    <b className="text-slate-900 dark:text-slate-100">{lastPage}</b>
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
      </div>

      {/* MODAL POP-UP DETAIL SURAT (Tengah Layar) */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailItem(null);
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 flex flex-col max-h-[90vh]">
            {/* Header Modal Detail */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
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
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Sudah Dibalas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                    <Clock className="h-3 w-3" />
                    Menunggu Balasan
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Isi Detail Surat */}
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Grid Metadata Utama */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/30">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Nomor Surat Masuk</div>
                  <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                    {detailItem.no_surat_masuk || <span className="text-zinc-400 italic">Tanpa nomor surat</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Tanggal Surat</div>
                  <div className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">
                    {detailItem.tanggal_surat || <span className="text-zinc-400">-</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Asal / Pengirim Surat</div>
                  <div className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">{detailItem.asal_surat}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Tanggal Diterima Balai</div>
                  <div className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">{detailItem.tanggal_diterima}</div>
                </div>
                {detailItem.catatan && (
                  <div className="sm:col-span-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Catatan Khusus Pengirim</div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 italic">{detailItem.catatan}</div>
                  </div>
                )}
              </div>

              {/* Perihal */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Perihal / Ringkasan Surat</h4>
                <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
                  {detailItem.perihal || <span className="text-zinc-400 italic">Tidak ada catatan perihal.</span>}
                </div>
              </div>

              {/* Status Balasan */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Surat Balasan Balai BKSDA</span>
                </div>
                {detailItem.no_surat_balasan ? (
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-zinc-700 dark:text-zinc-300 pt-1">
                    <div>
                      <span className="text-zinc-500">Nomor Surat Balasan: </span>
                      <b className="font-semibold text-emerald-900 dark:text-emerald-300">{detailItem.no_surat_balasan}</b>
                    </div>
                    <div>
                      <span className="text-zinc-500">Tanggal Balasan: </span>
                      <b>{detailItem.tanggal_surat_balasan || "-"}</b>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Belum ada nomor atau berkas surat balasan yang dicatatkan.
                  </p>
                )}
              </div>

              {/* Daftar Berkas Lampiran */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Berkas Lampiran ({detailItem.attachments?.length || 0})
                  </h4>
                </div>
                {!detailItem.attachments || detailItem.attachments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                    Tidak ada file lampiran pada surat ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailItem.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-sm sm:max-w-md">
                              {attachment.original_name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
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
                            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white"
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
            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-6 py-3.5 dark:border-zinc-800">
              <div>
                {canWrite && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(detailItem)}
                    className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs"
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
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Arsip
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH & EDIT ARSIP (Wide Side-by-Side Tanpa Scroll Layar) */}
      {formOpen && canWrite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditing(null);
              setFormOpen(false);
            }
          }}
        >
          <form
            onSubmit={handleSave}
            className="flex flex-col w-full max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            {/* Header Modal Form (Fixed Top) */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                  {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
                <div>
                  <h2 className="text-base font-bold sm:text-lg">
                    {editing ? `Edit Arsip Agenda #${editing.no_agenda}` : "Tambah Arsip Surat Masuk"}
                  </h2>
                  <p className="text-[11px] text-zinc-500">
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
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Form: 2 Kolom Seimbang (Memanjang ke Samping) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Kolom Kiri (7/12): Data Pokok Surat & Status Balasan */}
              <div className="lg:col-span-7 flex flex-col gap-3.5">
                {/* Data Pokok Surat */}
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/30 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Informasi Identitas Surat
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Nomor Agenda *</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950 font-mono"
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
                        className="h-8.5 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-950"
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
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
                        placeholder="Jika ada nomor"
                        value={form.no_surat_masuk || ""}
                        onChange={(event) => setField("no_surat_masuk", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold sm:col-span-2">
                      <span>Asal Surat / Nama Pengirim *</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
                        placeholder="Contoh: Ditjen KSDAE / Nama Instansi / Pribadi"
                        value={form.asal_surat}
                        onChange={(event) => setField("asal_surat", event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Tanggal Diterima *</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
                        type="date"
                        value={form.tanggal_diterima}
                        onChange={(event) => setField("tanggal_diterima", event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold sm:col-span-2">
                      <span>Catatan Tambahan Pengirim</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
                        placeholder="Contoh: Pengirim dari SKW III Berau"
                        value={form.catatan || ""}
                        onChange={(event) => setField("catatan", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Tanggal Surat</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
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
                        className="w-full resize-none rounded-md border border-zinc-200 bg-white p-2 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </label>
                  </div>
                </div>

                {/* Status Balasan Balai */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Status Balasan Balai (Opsional)
                    </h3>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Nomor Surat Balasan</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
                        placeholder="Contoh: S.123/K.18/TU/KSA/10/2026"
                        value={form.no_surat_balasan || ""}
                        onChange={(event) => setField("no_surat_balasan", event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">
                      <span>Tanggal Surat Balasan</span>
                      <Input
                        className="h-8.5 text-xs bg-white dark:bg-zinc-950"
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
                  <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Lampiran Tersimpan ({editing.attachments.length})
                      </h3>
                      <span className="text-[10px] text-zinc-400">Klik ikon sampah untuk menghapus</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {editing.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[170px] sm:max-w-[210px] text-[11px]">
                                {attachment.original_name}
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                {attachmentLabel(attachment.type)} • {formatBytes(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment)}
                            className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Upload Lampiran Baru
                    </h3>
                    <span className="text-[10px] text-zinc-400">Maks 20 MB/file</span>
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
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {config.hint}
                                </p>
                              </div>
                            </div>

                            <label
                              htmlFor={`attachment-${type}`}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 shrink-0"
                            >
                              <Upload className="h-3 w-3 text-blue-600" />
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
                                  className="flex items-center justify-between rounded-md bg-white/90 px-2 py-1 text-[11px] shadow-2xs dark:bg-zinc-950/80"
                                >
                                  <span className="truncate max-w-[180px] font-medium" title={file.name}>
                                    {file.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                    <span className="text-[10px] text-zinc-400">{formatBytes(file.size)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeStagedFile(type, idx)}
                                      className="p-0.5 text-zinc-400 hover:text-red-500"
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
            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 shrink-0">
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-28 text-xs font-semibold shadow-sm"
                >
                  {saving ? "Menyimpan..." : editing ? "Perbarui Arsip" : "Simpan Arsip"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PRATINJAU LAMPIRAN */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold" title={preview.attachment.original_name}>
                  {preview.attachment.original_name}
                </h3>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {attachmentLabel(preview.attachment.type)} • Pratinjau Berkas
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup pratinjau"
                onClick={closePreview}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto bg-zinc-100 p-4 dark:bg-zinc-900">
              {previewLoading ? (
                <div className="text-sm text-zinc-500">Memuat isi lampiran...</div>
              ) : preview.dataUrl && preview.attachment.mime_type === "application/pdf" ? (
                <iframe
                  title={preview.attachment.original_name}
                  src={preview.dataUrl}
                  className="h-[70vh] w-full rounded-lg bg-white"
                />
              ) : preview.dataUrl ? (
                <img
                  src={preview.dataUrl}
                  alt={preview.attachment.original_name}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="max-w-sm text-center">
                  <FileText className="mx-auto h-12 w-12 text-zinc-400" />
                  <p className="mt-3 text-sm font-semibold">{previewMessage(preview.attachment.mime_type)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Berkas tersimpan aman di storage. Gunakan tombol Unduh Berkas untuk membukanya secara lokal.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={closePreview}>
                Tutup
              </Button>
              <Button
                type="button"
                onClick={() => download(preview.attachment)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4" />
                Unduh Berkas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORT EXCEL */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExportOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Export Arsip Surat Masuk</h2>
                  <p className="text-xs text-zinc-500">Unduh rekapitulasi arsip ke format Excel (.xlsx)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Pilih Rentang / Periode Data
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => setExportPeriod("current_filter")}
                      className={`col-span-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        exportPeriod === "current_filter"
                          ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300"
                          : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"
                      }`}
                    >
                      <Filter className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <div className="text-xs">
                        <div className="font-semibold">Filter Pencarian Saat Ini</div>
                        <div className="mt-0.5 text-[11px] opacity-75">
                          Sesuai kriteria pencarian, status balasan, dan tanggal yang sedang aktif
                        </div>
                      </div>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExportPeriod("all")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      exportPeriod === "all"
                        ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300"
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"
                    }`}
                  >
                    <TableProperties className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="text-xs">
                      <div className="font-semibold">Semua Data</div>
                      <div className="mt-0.5 text-[11px] opacity-75">Seluruh arsip surat masuk</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPeriod("this_month")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      exportPeriod === "this_month"
                        ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300"
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"
                    }`}
                  >
                    <Calendar className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="text-xs">
                      <div className="font-semibold">Bulan Ini</div>
                      <div className="mt-0.5 text-[11px] opacity-75">
                        {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPeriod("this_year")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      exportPeriod === "this_year"
                        ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300"
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"
                    }`}
                  >
                    <Calendar className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="text-xs">
                      <div className="font-semibold">Tahun {new Date().getFullYear()}</div>
                      <div className="mt-0.5 text-[11px] opacity-75">Rekap 1 tahun anggaran</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPeriod("custom")}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      exportPeriod === "custom"
                        ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-300 dark:bg-blue-950/30 dark:text-blue-300"
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"
                    }`}
                  >
                    <Filter className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="text-xs">
                      <div className="font-semibold">Rentang Kustom</div>
                      <div className="mt-0.5 text-[11px] opacity-75">Pilih tanggal spesifik</div>
                    </div>
                  </button>
                </div>
              </div>

              {exportPeriod === "custom" && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Dari Tanggal
                      <Input
                        type="date"
                        value={exportStartDate}
                        onChange={(event) => setExportStartDate(event.target.value)}
                        className="bg-white text-xs dark:bg-zinc-950"
                      />
                    </label>
                    <label className="space-y-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Sampai Tanggal
                      <Input
                        type="date"
                        value={exportEndDate}
                        onChange={(event) => setExportEndDate(event.target.value)}
                        className="bg-white text-xs dark:bg-zinc-950"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-950/60 dark:bg-blue-950/20">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span>Format 11 Kolom Excel:</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
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

            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={exportExcel}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download Excel (.xlsx)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
