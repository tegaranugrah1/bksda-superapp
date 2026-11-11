"use client";

import { DialogTitle } from "@/components/ui/dialog";
import { SuratTugasDialog } from "@/app/surat-tugas/_components/SuratTugasDialog";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Search,
  SlidersHorizontal,
  Banknote,
  FileText,
  ChevronDown,
  ChevronUp,
  Italic,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { renderFormattedItalic, toggleItalicInTextarea } from "@/lib/letter-utils";
import type { StExpenseTemplate } from "../../../surat-tugas/_lib";
import { templateCodeFromName, errorMessage } from "./utils";

const EXPENSE_CATEGORIES: Array<{ value: StExpenseTemplate["category"]; label: string }> = [
  { value: "dipa", label: "DIPA" },
  { value: "hibah_folu", label: "Hibah / FOLU" },
  { value: "kerjasama", label: "Mitra Kerjasama" },
  { value: "dl1", label: "DL 1 / Tanpa Biaya" },
  { value: "other", label: "Lainnya" },
];

export function ExpenseTemplatesTab() {
  const { canWrite } = useRole();
  const [expenseTemplates, setExpenseTemplates] = useState<StExpenseTemplate[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StExpenseTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<number | null>(null);
  const [expenseName, setExpenseName] = useState("");
  const [expenseCode, setExpenseCode] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<StExpenseTemplate["category"]>("dipa");
  const [expenseBiayaText, setExpenseBiayaText] = useState("");
  const [expenseDasarText, setExpenseDasarText] = useState("");
  const [expenseIsActive, setExpenseIsActive] = useState(true);
  const [expenseIsDefault, setExpenseIsDefault] = useState(false);
  const [expenseSortOrder, setExpenseSortOrder] = useState(0);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("all");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedExpenses, setExpandedExpenses] = useState<Record<number, boolean>>({});
  const expenseBiayaRef = React.useRef<HTMLTextAreaElement>(null);
  const expenseDasarRef = React.useRef<HTMLTextAreaElement>(null);

  const currentYear = new Date().getFullYear().toString();

  const toggleExpenseExpanded = (id: number) => {
    setExpandedExpenses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchExpenseTemplates = useCallback(async () => {
    try {
      setIsLoadingExpenses(true);
      const response = await api.get(
        "/kepegawaian/st-expense-templates?include_inactive=true&per_page=100"
      );
      setExpenseTemplates(response.data?.data || []);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal memuat template biaya"));
    } finally {
      setIsLoadingExpenses(false);
    }
  }, []);

  useEffect(() => {
    void fetchExpenseTemplates();
  }, [fetchExpenseTemplates]);

  const resetExpenseForm = () => {
    setEditExpenseId(null);
    setExpenseName("");
    setExpenseCode("");
    setExpenseCategory("dipa");
    setExpenseBiayaText("");
    setExpenseDasarText("");
    setExpenseIsActive(true);
    setExpenseIsDefault(false);
    setExpenseSortOrder(expenseTemplates.length + 1);
    setIsExpenseFormOpen(false);
  };

  const handleEditExpense = (expense: StExpenseTemplate) => {
    setEditExpenseId(expense.id);
    setExpenseName(expense.name || "");
    setExpenseCode(expense.code || "");
    setExpenseCategory(expense.category || "dipa");
    setExpenseBiayaText(expense.biaya_text || "");
    setExpenseDasarText(expense.dasar_text || "");
    setExpenseIsActive(Boolean(expense.is_active));
    setExpenseIsDefault(Boolean(expense.is_default));
    setExpenseSortOrder(expense.sort_order ?? 0);
    setIsExpenseFormOpen(true);
  };

  const handleExpenseSubmit = async () => {
    if (!expenseName?.trim()) {
      toast.error("Nama sumber dana wajib diisi");
      return;
    }
    if (expenseCategory !== "dl1" && !expenseBiayaText?.trim()) {
      toast.error("Teks kalimat klausul biaya wajib diisi");
      return;
    }

    const payload = {
      name: (expenseName || "").trim(),
      code: (expenseCode || "").trim() || templateCodeFromName(expenseName || ""),
      category: expenseCategory,
      biaya_text: (expenseBiayaText || "").trim() || null,
      dasar_text: (expenseDasarText || "").trim() || null,
      is_active: expenseIsActive,
      is_default: expenseIsDefault,
      sort_order: Number(expenseSortOrder) || 0,
    };

    try {
      setIsExpenseSubmitting(true);
      if (editExpenseId) {
        await api.put(`/kepegawaian/st-expense-templates/${editExpenseId}`, payload);
        toast.success("Template biaya berhasil diperbarui");
      } else {
        await api.post("/kepegawaian/st-expense-templates", payload);
        toast.success("Template biaya baru berhasil dibuat");
      }
      resetExpenseForm();
      await fetchExpenseTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menyimpan template biaya"));
    } finally {
      setIsExpenseSubmitting(false);
    }
  };

  const handleToggleExpenseActive = async (expense: StExpenseTemplate) => {
    try {
      await api.patch(`/kepegawaian/st-expense-templates/${expense.id}/toggle-active`, {
        is_active: !expense.is_active,
      });
      toast.success(expense.is_active ? "Template biaya dinonaktifkan" : "Template biaya diaktifkan");
      await fetchExpenseTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal mengubah status template biaya"));
    }
  };

  const handleSetDefaultExpense = async (id: number) => {
    try {
      await api.post(`/kepegawaian/st-expense-templates/${id}/set-default`);
      toast.success("Template biaya default berhasil diubah");
      await fetchExpenseTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menetapkan template biaya default"));
    }
  };

  const handleDuplicateExpense = async (id: number) => {
    try {
      await api.post(`/kepegawaian/st-expense-templates/${id}/duplicate`);
      toast.success("Template biaya berhasil diduplikasi");
      await fetchExpenseTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menduplikasi template biaya"));
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await api.delete(`/kepegawaian/st-expense-templates/${deleteTarget.id}`);
      toast.success("Template biaya berhasil dihapus");
      setDeleteTarget(null);
      await fetchExpenseTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menghapus template biaya"));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenseTemplates.filter((item) => {
      const matchSearch =
        !expenseSearch.trim() ||
        item.name.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (item.biaya_text || "").toLowerCase().includes(expenseSearch.toLowerCase());

      const matchCategory =
        expenseCategoryFilter === "all" || item.category === expenseCategoryFilter;

      const matchStatus =
        expenseStatusFilter === "all" ||
        (expenseStatusFilter === "active" && item.is_active) ||
        (expenseStatusFilter === "inactive" && !item.is_active);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [expenseTemplates, expenseSearch, expenseCategoryFilter, expenseStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner when list view is shown */}
      {!isExpenseFormOpen && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-[var(--ds-accent-soft-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl shrink-0 mt-0.5 st-primary">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--ds-fg)]">
                Master Template Biaya &amp; Sumber Dana
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                Kelola daftar sumber anggaran (DIPA, Hibah/FOLU, Mitra Kerjasama, atau DL 1) beserta klausul pembebanan biaya dan dasar hukumnya.
              </p>
            </div>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => {
                resetExpenseForm();
                setIsExpenseFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer shrink-0 st-primary"
            >
              <Plus className="w-4 h-4" /> Tambah Sumber Dana Baru
            </button>
          )}
        </div>
      )}

      {isExpenseFormOpen ? (
        <section className="space-y-5 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--ds-fg)]">
                {editExpenseId ? "Edit Template Biaya / Sumber Dana" : "Tambah Template Biaya Baru"}
              </h2>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Klausul ini otomatis menjadi teks pembebanan anggaran pada bagian &ldquo;Untuk&rdquo; Surat Tugas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetExpenseForm}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleExpenseSubmit()}
                disabled={isExpenseSubmitting}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer st-primary"
              >
                {isExpenseSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Simpan
              </button>
              <button
                type="button"
                onClick={resetExpenseForm}
                className="rounded-full p-2 hover:bg-[var(--ds-surface-muted)] ml-1 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] transition cursor-pointer"
                title="Tutup form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Panduan Posisi Otomatis & Preset Cepat */}
          <div className="p-4 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--ds-accent-soft-border)]">
              <span className="font-bold text-[var(--ds-accent-fg)]">
                Isi Cepat dari Contoh Standar:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  {
                    label: "+ Contoh DIPA",
                    cat: "dipa" as const,
                    biaya:
                      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};",
                    dasar:
                      "Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA-143.04.2.693614/{tahun} tanggal 24 April {tahun}.",
                  },
                  {
                    label: "+ Contoh Hibah FOLU",
                    cat: "hibah_folu" as const,
                    biaya:
                      "Segala biaya yang timbul akibat dikeluarkannya Surat Perintah Tugas ini dibebankan pada anggaran *Annual Work Plan* (AWP) Tahun {tahun} Implementasi FOLU *Net Sink* 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia-Norwegia Tahap Kedua dan Ketiga Ditjen KSDAE;",
                    dasar:
                      "*Annual Work Plan* (AWP) Tahun Anggaran {tahun} Implementasi FOLU *Net Sink* 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia-Norwegia Tahap Kedua dan Ketiga Ditjen KSDAE.",
                  },
                  {
                    label: "+ Contoh Mitra PKS",
                    cat: "kerjasama" as const,
                    biaya:
                      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Rencana Kerja Tahunan (RKT) Tahun {tahun} Kerja Sama Balai KSDA Kalimantan Timur;",
                    dasar:
                      "Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan Mitra Nomor: ... tanggal ... tentang ...",
                  },
                  {
                    label: "+ Contoh DL 1 (Tanpa Biaya)",
                    cat: "dl1" as const,
                    biaya: "",
                    dasar: "",
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setExpenseCategory(preset.cat);
                      setExpenseBiayaText(preset.biaya);
                      setExpenseDasarText(preset.dasar);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)] text-xs font-semibold text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-xs text-[var(--ds-fg-muted)] leading-relaxed">
              <div>
                <p className="font-bold text-[var(--ds-fg)]">
                  Aturan Posisi Otomatis di Surat Tugas &amp; Builder:
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  <li>
                    • <b>Teks Dasar Hukum (DIPA/PKS/AWP):</b> Selalu ditempatkan pada <b>urutan paling bawah (terakhir)</b> di bagian <b>Dasar</b> (di bawah Dasar Template ST &amp; tambahan manual Builder).
                  </li>
                  <li>
                    • <b>Teks Klausul Biaya:</b> Ditempatkan di bagian <b>Untuk</b> tepat di bawah Butir 1 (<b>Butir 2</b>), atau otomatis turun ke bawah jika ada Butir Tambahan Untuk.
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[var(--ds-fg)]">
                  Panduan Placeholder &amp; Huruf Miring:
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  <li>
                    • Gunakan <code className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-[var(--ds-accent-fg)]">{"{tahun}"}</code> agar Tahun Anggaran otomatis mengikuti tahun tanggal surat.
                  </li>
                  <li>
                    • Apit kata dengan <code className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-[var(--ds-accent-fg)]">*bintang*</code> atau blok teks + tekan <kbd className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-xs">Ctrl+I</kbd> untuk cetak miring (contoh: <i>*Annual Work Plan*</i>).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
              Nama Sumber Dana <span className="text-[var(--ds-status-danger-fg)]">*</span>
              <input
                value={expenseName}
                onChange={(event) => {
                  const val = event.target.value;
                  setExpenseName(val);
                  if (!editExpenseId) setExpenseCode(templateCodeFromName(val));
                }}
                placeholder="Contoh: DIPA Balai KSDA Kaltim (693614)"
                className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none focus:border-[var(--ds-accent-fg)]"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
              Kode / Slug <span className="font-normal text-[var(--ds-fg-muted)]">(otomatis)</span>
              <input
                value={expenseCode}
                onChange={(e) => setExpenseCode(e.target.value)}
                placeholder="dipa"
                className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none focus:border-[var(--ds-accent-fg)] font-mono text-xs"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
              Kategori Sumber Dana
              <select
                value={expenseCategory}
                onChange={(event) =>
                  setExpenseCategory(event.target.value as StExpenseTemplate["category"])
                }
                className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-[var(--ds-fg-muted)]">
              Urutan Tampil (Sort Order)
              <input
                type="number"
                value={expenseSortOrder}
                onChange={(e) => setExpenseSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5 outline-none focus:border-[var(--ds-accent-fg)]"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--ds-fg-muted)]">
                Teks Klausul Pembebanan Biaya (Bagian &quot;Untuk&quot;){" "}
                {expenseCategory !== "dl1" ? (
                  <span className="text-[var(--ds-status-danger-fg)]">*</span>
                ) : (
                  <span className="text-xs text-[var(--ds-fg-muted)] font-normal">(Opsional untuk DL 1)</span>
                )}
                <span className="block text-xs font-normal text-[var(--ds-fg-muted)] mt-0.5">
                  {expenseCategory === "dl1" ? (
                    "Khusus kategori DL 1 / Tanpa Biaya, kosongkan jika pada bagian 'Untuk' Surat Tugas tidak perlu dicantumkan klausul pembebanan biaya."
                  ) : (
                    <>
                      Gunakan tag{" "}
                      <code className="rounded bg-[var(--ds-surface-muted)] px-1 py-0.5 text-[var(--ds-accent-fg)]">
                        {"{tahun}"}
                      </code>{" "}
                      agar tahun otomatis dinamis mengikuti tanggal surat tugas.
                    </>
                  )}
                </span>
              </label>
              <textarea
                ref={expenseBiayaRef}
                value={expenseBiayaText}
                onChange={(event) => setExpenseBiayaText(event.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                    e.preventDefault();
                    if (expenseBiayaRef.current) {
                      toggleItalicInTextarea(
                        expenseBiayaRef.current,
                        expenseBiayaText,
                        setExpenseBiayaText
                      );
                    }
                  }
                }}
                rows={4}
                placeholder={
                  expenseCategory === "dl1"
                    ? "Kosongkan jika tanpa kalimat biaya..."
                    : "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};"
                }
                className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3 outline-none focus:border-[var(--ds-accent-fg)] text-xs font-mono leading-relaxed"
              />
              <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Sisipkan:</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpenseBiayaText((prev) =>
                      prev ? `${prev} {tahun}` : "Tahun Anggaran {tahun};"
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)] transition-colors cursor-pointer"
                  title="Klik untuk menyisipkan {tahun}"
                >
                  + {"{tahun}"}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (expenseBiayaRef.current) {
                      toggleItalicInTextarea(
                        expenseBiayaRef.current,
                        expenseBiayaText,
                        setExpenseBiayaText
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-0.5 text-xs font-medium text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
                  title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                >
                  <Italic className="h-3 w-3 text-[var(--ds-accent-fg)]" />
                  <span className="font-serif italic font-bold">Miringkan (*I*)</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--ds-fg-muted)]">
                Teks Dasar Hukum / PKS / DIPA (Bagian &quot;Dasar&quot; — Selalu Paling Bawah){" "}
                <span className="text-xs text-[var(--ds-fg-muted)] font-normal">(Opsional)</span>
                <span className="block text-xs font-normal text-[var(--ds-fg-muted)] mt-0.5">
                  Teks ini selalu otomatis menempati urutan paling bawah (terakhir) di bagian Dasar Surat Tugas, di bawah Dasar dari Template ST maupun tambahan manual di Builder.
                </span>
              </label>
              <textarea
                ref={expenseDasarRef}
                value={expenseDasarText}
                onChange={(event) => setExpenseDasarText(event.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                    e.preventDefault();
                    if (expenseDasarRef.current) {
                      toggleItalicInTextarea(
                        expenseDasarRef.current,
                        expenseDasarText,
                        setExpenseDasarText
                      );
                    }
                  }
                }}
                rows={4}
                placeholder="Contoh: Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan ... Nomor: ... tanggal ..."
                className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3 outline-none focus:border-[var(--ds-accent-fg)] text-xs font-mono leading-relaxed"
              />
              <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Sisipkan:</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpenseDasarText((prev) =>
                      prev ? `${prev} {tahun}` : "Tahun Anggaran {tahun}"
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)] transition-colors cursor-pointer"
                  title="Klik untuk menyisipkan {tahun}"
                >
                  + {"{tahun}"}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (expenseDasarRef.current) {
                      toggleItalicInTextarea(
                        expenseDasarRef.current,
                        expenseDasarText,
                        setExpenseDasarText
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-0.5 text-xs font-medium text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
                  title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                >
                  <Italic className="h-3 w-3 text-[var(--ds-accent-fg)]" />
                  <span className="font-serif italic font-bold">Miringkan (*I*)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          {(expenseBiayaText?.trim() || expenseDasarText?.trim()) && (
            <div className="space-y-3 rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-accent-fg)]">
                <FileText className="h-3.5 w-3.5" />
                <span>Live Preview Output pada Surat Tugas ({currentYear})</span>
              </div>
              {expenseDasarText?.trim() && (
                <div>
                  <span className="text-xs font-bold uppercase text-[var(--ds-accent-fg)] block mb-1">
                    Dasar (Selalu di Urutan Paling Bawah / Terakhir):
                  </span>
                  <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed font-sans bg-[var(--ds-surface)] p-2.5 rounded-lg border border-[var(--ds-accent-soft-border)]">
                    {renderFormattedItalic((expenseDasarText || "").replace(/\{tahun\}/g, currentYear))}
                  </p>
                </div>
              )}
              {expenseBiayaText?.trim() && (
                <div>
                  <span className="text-xs font-bold uppercase text-[var(--ds-accent-fg)] block mb-1">
                    Klausul Biaya (Bagian Untuk — Di Bawah Butir 1 / Butir Tambahan):
                  </span>
                  <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed font-sans bg-[var(--ds-surface)] p-2.5 rounded-lg border border-[var(--ds-accent-soft-border)]">
                    {renderFormattedItalic((expenseBiayaText || "").replace(/\{tahun\}/g, currentYear))}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-5 text-sm text-[var(--ds-fg-muted)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={expenseIsActive}
                onChange={(event) => setExpenseIsActive(event.target.checked)}
              />
              Aktif (Tampil di Form Buat Surat Tugas)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={expenseIsDefault}
                onChange={(event) => setExpenseIsDefault(event.target.checked)}
              />
              Jadikan pilihan sumber dana default
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--ds-border-subtle)] pt-4">
            <button
              onClick={resetExpenseForm}
              className="rounded-xl px-5 py-2 text-sm text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
            >
              Batal
            </button>
            <button
              onClick={() => void handleExpenseSubmit()}
              disabled={isExpenseSubmitting}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer st-primary"
            >
              {isExpenseSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              Simpan Template Biaya
            </button>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Search, Category & Status Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Cari sumber dana atau klausul biaya..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent-fg)] transition-colors"
                />
              </div>

              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs text-[var(--ds-fg)] outline-none focus:ring-2 focus:ring-[var(--ds-accent-fg)]"
              >
                <option value="all">Semua Kategori</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-[var(--ds-fg-muted)] flex items-center gap-1 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Status:
              </span>
              <div className="inline-flex p-1 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter("all")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    expenseStatusFilter === "all"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  }`}
                >
                  Semua ({expenseTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter("active")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    expenseStatusFilter === "active"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-status-success-fg)] shadow-xs"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  }`}
                >
                  Aktif ({expenseTemplates.filter((e) => e.is_active).length})
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter("inactive")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    expenseStatusFilter === "inactive"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-status-danger-fg)] shadow-xs"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  }`}
                >
                  Nonaktif ({expenseTemplates.filter((e) => !e.is_active).length})
                </button>
              </div>
            </div>
          </div>

          {/* Table List */}
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4 min-w-[320px]">Sumber Dana &amp; Klausul Biaya</th>
                    <th className="py-3.5 px-4 w-40">Kategori</th>
                    <th className="py-3.5 px-4 w-28 text-center">Status</th>
                    {canWrite && <th className="py-3.5 px-4 w-32 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                  {isLoadingExpenses ? (
                    <tr>
                      <td colSpan={canWrite ? 5 : 4} className="py-12 text-center text-[var(--ds-fg-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--ds-accent-fg)] mb-2" />
                        Memuat daftar sumber dana...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={canWrite ? 5 : 4} className="py-12 text-center text-[var(--ds-fg-muted)]">
                        <AlertCircle className="w-8 h-8 text-[var(--ds-fg-muted)] mx-auto mb-2" />
                        {expenseSearch || expenseCategoryFilter !== "all" || expenseStatusFilter !== "all"
                          ? "Tidak ada sumber dana yang sesuai kriteria pencarian."
                          : "Belum ada template sumber dana."}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense, index) => {
                      const categoryObj = EXPENSE_CATEGORIES.find(
                        (c) => c.value === expense.category
                      );
                      const isExpanded = !!expandedExpenses[expense.id];
                      const isLongDasar = Boolean(
                        expense.dasar_text && expense.dasar_text.length > 130
                      );
                      const isLongBiaya = Boolean(
                        expense.biaya_text && expense.biaya_text.length > 130
                      );
                      const hasLongText = isLongDasar || isLongBiaya;

                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-[var(--ds-surface-muted)] transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-[var(--ds-fg-muted)]">
                            {expense.sort_order || index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[var(--ds-fg)] text-sm">
                                {expense.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-mono text-xs font-bold border border-[var(--ds-accent-soft-border)]">
                                {expense.code}
                              </span>
                              {expense.is_default && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] text-xs font-bold border border-[var(--ds-accent-soft-border)]">
                                  Default
                                </span>
                              )}
                            </div>

                            {expense.dasar_text && (
                              <div className="mt-2 text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-status-warning-bg)] p-2.5 rounded-xl border border-[var(--ds-status-warning-border)] leading-relaxed">
                                <span className="font-bold text-[var(--ds-status-warning-fg)] block text-xs uppercase tracking-wider mb-1">
                                  Dasar Hukum:
                                </span>
                                <span>
                                  {!isExpanded && isLongDasar
                                    ? `${expense.dasar_text.slice(0, 125)}...`
                                    : expense.dasar_text}
                                </span>
                              </div>
                            )}

                            {expense.biaya_text ? (
                              <div className="mt-2 text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface)] p-2.5 rounded-xl border border-[var(--ds-border-subtle)] font-mono leading-relaxed">
                                <span className="font-bold text-[var(--ds-fg)] block text-xs uppercase tracking-wider mb-1 font-sans">
                                  Klausul Biaya:
                                </span>
                                <span>
                                  {!isExpanded && isLongBiaya
                                    ? `${expense.biaya_text.slice(0, 125)}...`
                                    : expense.biaya_text}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs italic text-[var(--ds-fg-muted)] bg-[var(--ds-surface)] p-2 rounded-xl border border-[var(--ds-border-subtle)]">
                                — Tanpa Pembebanan Biaya (Poin &quot;Untuk&quot; tidak dicantumkan) —
                              </div>
                            )}

                            {hasLongText && (
                              <button
                                type="button"
                                onClick={() => toggleExpenseExpanded(expense.id)}
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)] hover:underline cursor-pointer transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Ringkas Teks
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Lihat Selengkapnya
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {(() => {
                              switch (expense.category) {
                                case "dipa":
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                                      {categoryObj?.label || "DIPA"}
                                    </span>
                                  );
                                case "hibah_folu":
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                                      {categoryObj?.label || "Hibah / FOLU"}
                                    </span>
                                  );
                                case "kerjasama":
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]">
                                      {categoryObj?.label || "Mitra Kerjasama"}
                                    </span>
                                  );
                                case "dl1":
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]">
                                      {categoryObj?.label || "DL 1 / Tanpa Biaya"}
                                    </span>
                                  );
                                default:
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                                      {categoryObj?.label || expense.category}
                                    </span>
                                  );
                              }
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              disabled={!canWrite}
                              onClick={() => canWrite && void handleToggleExpenseActive(expense)}
                              title={canWrite ? "Klik untuk ubah status aktif/nonaktif" : undefined}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                canWrite ? "cursor-pointer" : "cursor-default"
                              } ${
                                expense.is_active
                                  ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
                                  : "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)]"
                              }`}
                            >
                              {expense.is_active ? (
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
                                  title="Edit Sumber Dana"
                                  onClick={() => handleEditExpense(expense)}
                                  className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Jadikan Default"
                                  onClick={() => void handleSetDefaultExpense(expense.id)}
                                  disabled={expense.is_default || !expense.is_active}
                                  className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] disabled:opacity-30 transition-colors cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Duplikasi Sumber Dana"
                                  onClick={() => void handleDuplicateExpense(expense.id)}
                                  className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)] transition-colors cursor-pointer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Hapus Sumber Dana"
                                  onClick={() => setDeleteTarget(expense)}
                                  disabled={expense.is_default}
                                  className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] disabled:opacity-30 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
                  Hapus Template Sumber Dana?
                </DialogTitle>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1 leading-relaxed">
                  Template biaya <strong>{deleteTarget.name}</strong> akan dihapus dari pilihan sumber dana.
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
                onClick={() => void handleDeleteExpense()}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer st-danger"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Hapus
              </button>
            </div>
        </SuratTugasDialog>
      )}
    </div>
  );
}
export default ExpenseTemplatesTab;
