"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Download, Eye, FileSpreadsheet, FileText, Filter, Inbox, Paperclip, Pencil, Plus, Search, TableProperties, Trash2, Upload, X } from "lucide-react";
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
const UPLOAD_CONFIG: Record<AttachmentType, { title: string; description: string; hint: string; card: string; icon: string }> = {
  incoming: {
    title: "Surat masuk utama",
    description: "Upload surat atau dokumen utama yang diterima.",
    hint: "PDF, DOC, XLS, JPG, PNG",
    card: "border-blue-200 bg-blue-50/70 hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/30",
    icon: "bg-blue-600 text-white",
  },
  supporting: {
    title: "Dokumen pendukung",
    description: "Proposal, presentasi PPT, lampiran, atau dokumen tambahan.",
    hint: "PPT, PPTX, PDF, DOC, XLS, JPG, PNG",
    card: "border-amber-200 bg-amber-50/70 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30",
    icon: "bg-amber-500 text-white",
  },
  reply: {
    title: "Surat balasan",
    description: "Upload surat balasan jika sudah diterbitkan.",
    hint: "PDF, DOC, JPG, PNG",
    card: "border-emerald-200 bg-emerald-50/70 hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/30",
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
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentLabel(type: AttachmentType): string {
  return type === "incoming" ? "Surat masuk" : type === "reply" ? "Surat balasan" : "Dokumen pendukung";
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kategori, setKategori] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<IncomingLetter | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<Record<AttachmentType, File[]>>({ incoming: [], supporting: [], reply: [] });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ attachment: Attachment; dataUrl: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<"all" | "current_filter" | "this_month" | "this_year" | "custom">("all");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/kepegawaian/surat-masuk", {
        params: { search: debouncedSearch || undefined, kategori: kategori || undefined, start_date: startDate || undefined, end_date: endDate || undefined, page, per_page: 20 },
      });
      const data = response.data?.data;
      setItems(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      setLastPage(response.data?.meta?.last_page || 1);
      setTotal(response.data?.meta?.total || 0);
    } catch {
      toast.error("Gagal memuat arsip surat.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, endDate, kategori, page, startDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({ ...EMPTY_FORM, tanggal_diterima: new Date().toISOString().slice(0, 10) });
    setFiles({ incoming: [], supporting: [], reply: [] });
  };

  const openEdit = (item: IncomingLetter) => {
    setEditing(item);
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

  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleFiles = (type: AttachmentType, list: FileList | null) => {
    setFiles((current) => ({ ...current, [type]: list ? Array.from(list) : [] }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.no_agenda.trim() || !form.asal_surat.trim() || !form.tanggal_diterima) {
      toast.error("Nomor agenda, tanggal diterima, dan asal surat wajib diisi.");
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value) payload.append(key, value);
    });
    files.incoming.forEach((file) => { payload.append("attachments[]", file); payload.append("attachment_types[]", "incoming"); });
    files.supporting.forEach((file) => { payload.append("attachments[]", file); payload.append("attachment_types[]", "supporting"); });
    files.reply.forEach((file) => { payload.append("attachments[]", file); payload.append("attachment_types[]", "reply"); });

    setSaving(true);
    try {
      const url = editing ? `/kepegawaian/surat-masuk/${editing.id}` : "/kepegawaian/surat-masuk";
      await api.post(url, payload, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(editing ? "Arsip surat diperbarui." : "Arsip surat disimpan.");
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
    if (!await confirm({ title: "Hapus Arsip Surat", description: `Hapus arsip ${item.no_agenda}? Semua lampiran RustFS akan ikut dihapus.`, confirmText: "Hapus", cancelText: "Batal", variant: "danger" })) return;
    try {
      await api.delete(`/kepegawaian/surat-masuk/${item.id}`);
      toast.success("Arsip surat dihapus.");
      await loadItems();
    } catch {
      toast.error("Gagal menghapus arsip surat.");
    }
  };

  const download = (attachment: Attachment) => {
    // Navigasi langsung ke URL download — Sanctum cookie auth otomatis dikirim
    // browser, backend sudah set Content-Disposition: attachment sehingga tidak
    // pindah halaman. IDM atau browser native handle download tanpa konflik 0 B.
    const url = `/api${attachment.download_url.replace(/^\/api/, "")}`;
    window.open(url, "_blank", "noopener");
  };

  const openAttachment = async (attachment: Attachment) => {
    setPreview({ attachment, dataUrl: null });
    const previewable = attachment.mime_type === "application/pdf" || attachment.mime_type === "image/jpeg" || attachment.mime_type === "image/png";
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
    if (!editing || !await confirm({ title: "Hapus Lampiran", description: `Hapus ${attachment.original_name} dari arsip ini? File RustFS juga akan dihapus.`, confirmText: "Hapus", cancelText: "Batal", variant: "danger" })) return;
    try {
      await api.delete(`/kepegawaian/surat-masuk/${editing.id}/attachments/${attachment.id}`);
      setEditing((current) => current ? { ...current, attachments: current.attachments.filter((item) => item.id !== attachment.id) } : current);
      await loadItems();
      toast.success("Lampiran berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus lampiran.");
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><Inbox className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Kepegawaian</span></div>
          <h1 className="mt-1 text-2xl font-black">Arsip Surat Masuk</h1>
          <p className="text-sm text-zinc-500">Riwayat surat masuk, lampiran, dan surat balasan.</p>
        </div>
        <div className="flex flex-wrap gap-2">{canWrite && <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4" />Tambah Arsip</Button>}<Button variant="outline" onClick={() => setExportOpen(true)} className="gap-2"><FileSpreadsheet className="h-4 w-4" />Export Excel</Button></div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-[1fr_170px_150px_150px]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari agenda, nomor, pengirim, perihal, file..." className="pl-9" /></div>
        <select value={kategori} onChange={(event) => { setKategori(event.target.value); setPage(1); }} className="h-10 rounded-md border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-800"><option value="">Semua kategori</option>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
        <Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} />
        <Input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500"><span>{total} arsip</span><span>Halaman {page} dari {lastPage}</span></div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {loading ? <div className="p-10 text-center text-sm text-zinc-500">Memuat arsip...</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-zinc-500">Belum ada arsip surat.</div> : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"><tr><th className="p-3">Agenda</th><th className="p-3">Kategori</th><th className="p-3">Nomor &amp; tanggal surat</th><th className="p-3">Asal surat / pengirim</th><th className="p-3">Perihal</th><th className="p-3">Balasan Balai</th><th className="p-3">Lampiran</th><th className="p-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{items.map((item, index) => <tr key={item.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="p-3 min-w-28 whitespace-nowrap"><div className="font-bold text-blue-600">{item.no_agenda}</div><div className="mt-0.5 text-xs text-zinc-500">{item.tanggal_diterima}</div></td>
              <td className="p-3 min-w-28"><span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{item.kategori}</span></td>
              <td className="p-3 min-w-52"><div className="line-clamp-2 font-semibold">{item.no_surat_masuk || "Tanpa nomor surat"}</div><div className="mt-0.5 text-xs text-zinc-500">Tanggal: {item.tanggal_surat || "-"}</div></td>
              <td className="p-3 min-w-56"><div className="line-clamp-2 font-semibold">{item.asal_surat}</div><div className="mt-1 line-clamp-1 text-xs text-zinc-500">{item.catatan || "-"}</div></td>
              <td className="p-3 min-w-64"><p className="line-clamp-3 leading-relaxed">{item.perihal || "-"}</p></td>
              <td className="p-3 min-w-44"><div className="font-semibold text-emerald-700 dark:text-emerald-400">{item.no_surat_balasan || "Belum ada"}</div><div className="text-xs text-zinc-500">Tanggal: {item.tanggal_surat_balasan || "-"}</div>{item.attachments.filter((attachment) => attachment.type === "reply").map((attachment) => <button key={attachment.id} type="button" onClick={() => openAttachment(attachment)} title={`${attachment.original_name} (${formatBytes(attachment.size)})`} className="mt-1 inline-flex max-w-44 items-center gap-1 truncate rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"><Eye className="h-3 w-3 shrink-0" />Balasan: {attachment.original_name}</button>)}</td>
              <td className="p-3"><div className="flex max-w-xs flex-wrap gap-1">{item.attachments.filter((attachment) => attachment.type !== "reply").map((attachment) => <button key={attachment.id} type="button" onClick={() => openAttachment(attachment)} title={`${attachmentLabel(attachment.type)} · ${attachment.original_name} (${formatBytes(attachment.size)})`} className="inline-flex max-w-[190px] items-center gap-1 truncate rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"><Eye className="h-3 w-3 shrink-0" />{attachmentLabel(attachment.type)}: {attachment.original_name}</button>)}</div>{!item.attachments.some((attachment) => attachment.type !== "reply") && <span className="text-xs text-zinc-400">-</span>}</td>
              <td className="p-3"><div className="flex justify-end gap-1">{canWrite && <><Button variant="outline" size="sm" onClick={() => openEdit(item)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="outline" size="sm" onClick={() => handleDelete(item)} title="Hapus" className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></>}</div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</Button><Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)}>Berikutnya</Button></div>

      {exportOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setExportOpen(false); }}><div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"><div className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent px-6 py-4 dark:border-zinc-800"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20"><FileSpreadsheet className="h-5 w-5" /></div><div><h2 className="text-base font-bold">Export Arsip Surat Masuk</h2><p className="text-xs text-zinc-500">Unduh rekapitulasi arsip ke format Excel (.xlsx)</p></div></div><button type="button" onClick={() => setExportOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-6"><div className="space-y-3"><label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Pilih Rentang / Periode Data</label><div className="grid gap-2.5 sm:grid-cols-2">{debouncedSearch.trim() && <button type="button" onClick={() => setExportPeriod("current_filter")} className={`col-span-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${exportPeriod === "current_filter" ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300" : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"}`}><Filter className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div className="text-xs"><div className="font-semibold">Filter Pencarian Saat Ini</div><div className="mt-0.5 text-[11px] opacity-75">Keyword, kategori, dan tanggal aktif</div></div></button>}<button type="button" onClick={() => setExportPeriod("all")} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${exportPeriod === "all" ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300" : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"}`}><TableProperties className="mt-0.5 h-4 w-4 text-blue-600" /><div className="text-xs"><div className="font-semibold">Semua Data</div><div className="mt-0.5 text-[11px] opacity-75">Seluruh arsip surat masuk</div></div></button><button type="button" onClick={() => setExportPeriod("this_month")} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${exportPeriod === "this_month" ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300" : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"}`}><Calendar className="mt-0.5 h-4 w-4 text-blue-600" /><div className="text-xs"><div className="font-semibold">Bulan Ini</div><div className="mt-0.5 text-[11px] opacity-75">{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())}</div></div></button><button type="button" onClick={() => setExportPeriod("this_year")} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${exportPeriod === "this_year" ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-500/80 dark:bg-blue-950/30 dark:text-blue-300" : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"}`}><Calendar className="mt-0.5 h-4 w-4 text-blue-600" /><div className="text-xs"><div className="font-semibold">Tahun {new Date().getFullYear()}</div><div className="mt-0.5 text-[11px] opacity-75">Rekap 1 tahun anggaran</div></div></button><button type="button" onClick={() => setExportPeriod("custom")} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${exportPeriod === "custom" ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-300 dark:bg-blue-950/30 dark:text-blue-300" : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"}`}><Filter className="mt-0.5 h-4 w-4 text-blue-600" /><div className="text-xs"><div className="font-semibold">Rentang Kustom</div><div className="mt-0.5 text-[11px] opacity-75">Pilih tanggal spesifik</div></div></button></div></div>{exportPeriod === "custom" && <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"><div className="grid grid-cols-2 gap-3"><label className="space-y-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Dari Tanggal<Input type="date" value={exportStartDate} onChange={(event) => setExportStartDate(event.target.value)} className="bg-white text-xs dark:bg-zinc-950" /></label><label className="space-y-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Sampai Tanggal<Input type="date" value={exportEndDate} onChange={(event) => setExportEndDate(event.target.value)} className="bg-white text-xs dark:bg-zinc-950" /></label></div></div>}<div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-950/60 dark:bg-blue-950/20"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300"><CheckCircle2 className="h-4 w-4 text-blue-600" /><span>Format 11 Kolom Excel:</span></div><div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400"><div>1. <b>No Agenda</b></div><div>2. <b>Tanggal Diterima</b></div><div>3. <b>Tanggal Surat</b></div><div>4. <b>No Surat Masuk</b></div><div>5. <b>Kategori</b></div><div>6. <b>Asal/Pengirim</b></div><div>7. <b>Perihal</b></div><div>8. <b>Catatan</b></div><div>9. <b>No Balasan</b></div><div>10. <b>Tanggal Balasan</b></div><div>11. <b>Lampiran</b></div></div></div></div><div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800"><Button type="button" variant="outline" onClick={() => setExportOpen(false)}>Batal</Button><Button type="button" onClick={exportExcel} className="gap-2 bg-blue-600 text-white hover:bg-blue-700"><Download className="h-4 w-4" />Download Excel (.xlsx)</Button></div></div></div>}

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}><div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-950"><div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="min-w-0"><h3 className="truncate text-sm font-bold" title={preview.attachment.original_name}>{preview.attachment.original_name}</h3><p className="mt-1 truncate text-xs text-zinc-500">{attachmentLabel(preview.attachment.type)} · Lihat lampiran</p></div><button type="button" aria-label="Tutup pratinjau" onClick={closePreview} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"><X className="h-5 w-5" /></button></div><div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto bg-zinc-100 p-4 dark:bg-zinc-900">{previewLoading ? <div className="text-sm text-zinc-500">Memuat isi lampiran...</div> : preview.dataUrl && preview.attachment.mime_type === "application/pdf" ? <iframe title={preview.attachment.original_name} src={preview.dataUrl} className="h-[70vh] w-full rounded-lg bg-white" /> : preview.dataUrl ? <img src={preview.dataUrl} alt={preview.attachment.original_name} className="max-h-[70vh] max-w-full rounded-lg object-contain" /> : <div className="max-w-sm text-center"><FileText className="mx-auto h-12 w-12 text-zinc-400" /><p className="mt-3 text-sm font-semibold">{previewMessage(preview.attachment.mime_type)}</p><p className="mt-1 text-xs text-zinc-500">File tetap private di RustFS. Gunakan tombol Unduh file untuk membukanya dengan aplikasi yang sesuai.</p></div>}</div><div className="flex justify-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"><Button type="button" variant="outline" onClick={closePreview}>Tutup</Button><Button type="button" onClick={() => download(preview.attachment)} className="gap-2"><Download className="h-4 w-4" />Unduh file</Button></div></div></div>}

      {formOpen && canWrite && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setEditing(null); setFormOpen(false); } }}>
          <form onSubmit={handleSave} className="mx-auto w-full max-w-7xl space-y-3 rounded-2xl bg-white p-4 shadow-2xl md:p-5 dark:bg-zinc-950">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">{editing ? "Edit Arsip Surat" : "Tambah Arsip Surat"}</h2><p className="text-xs text-zinc-500">File maksimal 20 MB per lampiran.</p></div><button type="button" onClick={() => { setEditing(null); setFormOpen(false); }}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <section className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div><h3 className="text-sm font-bold">Informasi surat</h3><p className="text-xs text-zinc-500">Isi identitas dasar surat agar mudah ditemukan kembali.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <label className="block space-y-1 text-sm font-semibold xl:col-span-2">Nomor agenda *<Input className="h-10" value={form.no_agenda} onChange={(event) => setField("no_agenda", event.target.value)} required /></label>
                <label className="block space-y-1 text-sm font-semibold xl:col-span-2">Kategori<select value={form.kategori} onChange={(event) => setField("kategori", event.target.value)} className="h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-800">{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="block space-y-1 text-sm font-semibold xl:col-span-2">Nomor surat masuk<Input className="h-10" value={form.no_surat_masuk || ""} onChange={(event) => setField("no_surat_masuk", event.target.value)} /></label>
                <label className="block min-w-0 space-y-1 text-sm font-semibold xl:col-span-3">Asal/pengirim *<textarea rows={2} value={form.asal_surat} onChange={(event) => setField("asal_surat", event.target.value)} className="min-h-16 w-full resize-y rounded-md border border-zinc-200 bg-transparent p-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800" required /></label>
                <label className="block min-w-0 space-y-1 text-sm font-semibold xl:col-span-3">Catatan spesifik pengirim<textarea rows={2} placeholder="Contoh: Surat dari SKW III Berau" value={form.catatan || ""} onChange={(event) => setField("catatan", event.target.value)} className="min-h-16 w-full resize-y rounded-md border border-zinc-200 bg-transparent p-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800" /></label>
                <label className="block space-y-1 text-sm font-semibold xl:col-span-3">Tanggal surat<Input className="h-10" type="date" value={form.tanggal_surat || ""} onChange={(event) => setField("tanggal_surat", event.target.value)} /></label>
                <label className="block space-y-1 text-sm font-semibold xl:col-span-3">Tanggal diterima *<Input className="h-10" type="date" value={form.tanggal_diterima} onChange={(event) => setField("tanggal_diterima", event.target.value)} required /></label>
                <label className="block space-y-1 text-sm font-semibold sm:col-span-2 xl:col-span-6">Perihal/ringkasan<textarea value={form.perihal || ""} onChange={(event) => setField("perihal", event.target.value)} className="min-h-16 w-full rounded-md border border-zinc-200 bg-transparent p-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800" /></label>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div><h3 className="text-sm font-bold">Surat balasan</h3><p className="text-xs text-zinc-500">Nomor balasan boleh diisi sekarang atau nanti saat surat diterbitkan.</p></div>
              <div className="grid gap-3">
                <label className="block space-y-1 text-sm font-semibold">Nomor surat balasan<Input className="h-10" value={form.no_surat_balasan || ""} onChange={(event) => setField("no_surat_balasan", event.target.value)} /></label>
                <label className="block space-y-1 text-sm font-semibold">Tanggal surat balasan<Input className="h-10" type="date" value={form.tanggal_surat_balasan || ""} onChange={(event) => setField("tanggal_surat_balasan", event.target.value)} /></label>
              </div>
            </section>
            </div>

            {editing && editing.attachments.length > 0 && <div><p className="mb-2 text-sm font-semibold">Lampiran tersimpan</p><div className="space-y-1">{editing.attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 text-xs dark:border-zinc-800"><FileText className="h-4 w-4 shrink-0" /><span className="flex-1 truncate">{attachment.original_name} · {attachmentLabel(attachment.type)}</span><Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(attachment)} className="h-8 shrink-0 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"> <Trash2 className="mr-1 h-3.5 w-3.5" />Hapus</Button></div>)}</div></div>}
            <section className="space-y-3"><div><h3 className="text-sm font-bold">Lampiran surat</h3><p className="text-xs text-zinc-500">Pilih area yang sesuai. Anda dapat memilih beberapa file sekaligus.</p></div><div className="grid gap-4 md:grid-cols-3">{(["incoming", "supporting", "reply"] as AttachmentType[]).map((type) => { const config = UPLOAD_CONFIG[type]; return <div key={type} className={`rounded-2xl border p-4 transition-colors ${config.card}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.icon}`}><Paperclip className="h-5 w-5" /></div><div className="min-w-0"><h4 className="text-sm font-bold">{config.title}</h4><p className="mt-1 min-h-10 text-xs leading-5 text-zinc-600 dark:text-zinc-300">{config.description}</p></div></div><label htmlFor={`attachment-${type}`} className="mt-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-current/20 bg-white/70 px-3 text-center transition hover:bg-white dark:bg-zinc-950/40 dark:hover:bg-zinc-950/70"><Upload className="h-5 w-5 opacity-70" /><span className="mt-2 text-xs font-bold">Klik untuk memilih file</span><span className="mt-1 text-[11px] text-zinc-500">{config.hint}</span><input id={`attachment-${type}`} type="file" multiple accept={FILE_ACCEPT} onChange={(event) => handleFiles(type, event.target.files)} className="sr-only" />{files[type].length > 0 && <span className="mt-2 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-zinc-900">{files[type].length} file dipilih</span>}</label></div>; })}</div></section>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setEditing(null); setFormOpen(false); }}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button></div>
          </form>
        </div>
      )}
    </div>
  );
}
