"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Save,
  ToggleLeft,
  Trash2,
  X,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { StExpenseTemplate } from "../../../surat-tugas/_lib";

const EXPENSE_CATEGORIES: Array<{ value: StExpenseTemplate["category"]; label: string }> = [
  { value: "dipa", label: "DIPA" },
  { value: "hibah_folu", label: "Hibah / FOLU" },
  { value: "kerjasama", label: "Mitra Kerjasama" },
  { value: "dl1", label: "DL 1 / Tanpa Biaya" },
  { value: "other", label: "Lainnya" },
];

function templateCodeFromName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
}

export function ExpenseTemplatesTab() {
  const [expenseTemplates, setExpenseTemplates] = useState<StExpenseTemplate[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
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
  const [expandedExpenses, setExpandedExpenses] = useState<Record<number, boolean>>({});

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

  const handleDeleteExpense = async (expense: StExpenseTemplate) => {
    if (!window.confirm(`Hapus template biaya "${expense.name}"?`)) return;

    try {
      await api.delete(`/kepegawaian/st-expense-templates/${expense.id}`);
      toast.success("Template biaya berhasil dihapus");
      await fetchExpenseTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menghapus template biaya"));
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

      return matchSearch && matchCategory;
    });
  }, [expenseTemplates, expenseSearch, expenseCategoryFilter]);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Top Action Bar when list view is shown */}
      {!isExpenseFormOpen && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              resetExpenseForm();
              setIsExpenseFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" /> Tambah Sumber Dana Baru
          </button>
        </div>
      )}

      {isExpenseFormOpen ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editExpenseId ? "Edit Template Biaya / Sumber Dana" : "Tambah Template Biaya Baru"}
              </h2>
              <p className="text-xs text-slate-500">
                Klausul ini otomatis menjadi teks pembebanan anggaran pada bagian &ldquo;Untuk&rdquo; Surat Tugas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetExpenseForm}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleExpenseSubmit()}
                disabled={isExpenseSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
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
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 ml-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Tutup form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Nama Sumber Dana <span className="text-red-500">*</span>
              <input
                value={expenseName}
                onChange={(event) => {
                  const val = event.target.value;
                  setExpenseName(val);
                  if (!editExpenseId) setExpenseCode(templateCodeFromName(val));
                }}
                placeholder="Contoh: DIPA Balai KSDA Kaltim (693614)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Kode / Slug <span className="font-normal text-slate-400">(otomatis)</span>
              <input
                value={expenseCode}
                onChange={(e) => setExpenseCode(e.target.value)}
                placeholder="dipa"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono text-xs"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Kategori Sumber Dana
              <select
                value={expenseCategory}
                onChange={(event) =>
                  setExpenseCategory(event.target.value as StExpenseTemplate["category"])
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Urutan Tampil (Sort Order)
              <input
                type="number"
                value={expenseSortOrder}
                onChange={(e) => setExpenseSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Teks Klausul Pembebanan Biaya (Bagian &quot;Untuk&quot;){" "}
                {expenseCategory !== "dl1" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-xs text-slate-400 font-normal">(Opsional untuk DL 1)</span>
                )}
                <span className="block text-xs font-normal text-slate-400 mt-0.5">
                  {expenseCategory === "dl1" ? (
                    "Khusus kategori DL 1 / Tanpa Biaya, kosongkan jika pada bagian 'Untuk' Surat Tugas tidak perlu dicantumkan klausul pembebanan biaya."
                  ) : (
                    <>
                      Gunakan tag{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-emerald-700 dark:bg-zinc-800">
                        {"{tahun}"}
                      </code>{" "}
                      agar tahun otomatis dinamis mengikuti tanggal surat tugas.
                    </>
                  )}
                </span>
              </label>
              <textarea
                value={expenseBiayaText}
                onChange={(event) => setExpenseBiayaText(event.target.value)}
                rows={4}
                placeholder={
                  expenseCategory === "dl1"
                    ? "Kosongkan jika tanpa kalimat biaya..."
                    : "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};"
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-xs font-mono leading-relaxed"
              />
              <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Sisipkan variabel:</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpenseBiayaText((prev) =>
                      prev ? `${prev} {tahun}` : "Tahun Anggaran {tahun};"
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer"
                  title="Klik untuk menyisipkan {tahun}"
                >
                  + {"{tahun}"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Teks Dasar Hukum / PKS / DIPA (Bagian &quot;Dasar&quot; Poin 2){" "}
                <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                <span className="block text-xs font-normal text-slate-400 mt-0.5">
                  Teks ini akan otomatis mengisi atau menggantikan poin nomor 2 di bagian Dasar Surat Tugas.
                </span>
              </label>
              <textarea
                value={expenseDasarText}
                onChange={(event) => setExpenseDasarText(event.target.value)}
                rows={4}
                placeholder="Contoh: Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan ... Nomor: ... tanggal ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-xs font-mono leading-relaxed"
              />
              <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Sisipkan variabel:</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpenseDasarText((prev) =>
                      prev ? `${prev} {tahun}` : "Tahun Anggaran {tahun}"
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer"
                  title="Klik untuk menyisipkan {tahun}"
                >
                  + {"{tahun}"}
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          {(expenseBiayaText?.trim() || expenseDasarText?.trim()) && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Live Preview Output pada Surat Tugas ({currentYear})</span>
              </div>
              {expenseDasarText?.trim() && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block mb-1">
                    Dasar (Poin 2):
                  </span>
                  <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-sans bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    {(expenseDasarText || "").replace(/\{tahun\}/g, currentYear)}
                  </p>
                </div>
              )}
              {expenseBiayaText?.trim() && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block mb-1">
                    Klausul Biaya (Bagian Untuk Poin 3):
                  </span>
                  <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-sans bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    {(expenseBiayaText || "").replace(/\{tahun\}/g, currentYear)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-5 text-sm text-slate-700 dark:text-zinc-300">
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

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
            <button
              onClick={resetExpenseForm}
              className="rounded-xl px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              onClick={() => void handleExpenseSubmit()}
              disabled={isExpenseSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Cari sumber dana atau klausul biaya..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="all">Semua Kategori</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table List */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {isLoadingExpenses ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {expenseSearch
                  ? "Tidak ada template biaya yang cocok."
                  : "Belum ada template biaya."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                    <tr>
                      <th className="px-5 py-4 w-12 text-center">No</th>
                      <th className="px-5 py-4">Sumber Dana &amp; Klausul Biaya</th>
                      <th className="px-5 py-4 w-36">Kategori</th>
                      <th className="px-5 py-4 w-28">Status</th>
                      <th className="px-5 py-4 w-36 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredExpenses.map((expense, index) => {
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
                          className="text-slate-600 dark:text-zinc-300 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30"
                        >
                          <td className="px-5 py-4 text-center font-mono text-xs text-slate-400">
                            {expense.sort_order || index + 1}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-900 dark:text-white">
                                {expense.name}
                              </span>
                              {expense.is_default && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-400 mt-0.5">
                              {expense.code}
                            </div>

                            {expense.dasar_text && (
                              <div className="mt-2 text-[11px] text-slate-700 dark:text-zinc-200 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 leading-relaxed">
                                <span className="font-bold text-amber-900 dark:text-amber-300 block text-[10px] uppercase tracking-wider mb-1">
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
                              <div className="mt-2 text-xs text-slate-700 dark:text-zinc-300 bg-slate-50/90 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-700/60 font-mono leading-relaxed">
                                <span className="font-bold text-slate-800 dark:text-zinc-200 block text-[10px] uppercase tracking-wider mb-1 font-sans">
                                  Klausul Biaya:
                                </span>
                                <span>
                                  {!isExpanded && isLongBiaya
                                    ? `${expense.biaya_text.slice(0, 125)}...`
                                    : expense.biaya_text}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2 text-[11px] italic text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800/30 p-2 rounded-xl border border-slate-100 dark:border-zinc-800/60">
                                — Tanpa Pembebanan Biaya (Poin &quot;Untuk&quot; tidak dicantumkan) —
                              </div>
                            )}

                            {hasLongText && (
                              <button
                                type="button"
                                onClick={() => toggleExpenseExpanded(expense.id)}
                                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer transition-colors"
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
                          <td className="px-5 py-4 w-36 whitespace-nowrap">
                            {(() => {
                              switch (expense.category) {
                                case "dipa":
                                  return (
                                    <span className="inline-block rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                                      {categoryObj?.label || "DIPA"}
                                    </span>
                                  );
                                case "hibah_folu":
                                  return (
                                    <span className="inline-block rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300">
                                      {categoryObj?.label || "Hibah / FOLU"}
                                    </span>
                                  );
                                case "kerjasama":
                                  return (
                                    <span className="inline-block rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                                      {categoryObj?.label || "Mitra Kerjasama"}
                                    </span>
                                  );
                                case "dl1":
                                  return (
                                    <span className="inline-block rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      {categoryObj?.label || "DL 1 / Tanpa Biaya"}
                                    </span>
                                  );
                                default:
                                  return (
                                    <span className="inline-block rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                      {categoryObj?.label || expense.category}
                                    </span>
                                  );
                              }
                            })()}
                          </td>
                          <td className="px-5 py-4 w-28 whitespace-nowrap">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                expense.is_active
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                              }`}
                            >
                              {expense.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                title="Edit"
                                onClick={() => handleEditExpense(expense)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-zinc-800"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Jadikan default"
                                onClick={() => void handleSetDefaultExpense(expense.id)}
                                disabled={expense.is_default || !expense.is_active}
                                className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 dark:hover:bg-zinc-800"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                title="Aktif/nonaktif"
                                onClick={() => void handleToggleExpenseActive(expense)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-zinc-800"
                              >
                                <ToggleLeft className="h-4 w-4" />
                              </button>
                              <button
                                title="Duplikasi"
                                onClick={() => void handleDuplicateExpense(expense.id)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-zinc-800"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                title="Hapus"
                                onClick={() => void handleDeleteExpense(expense)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export default ExpenseTemplatesTab;
