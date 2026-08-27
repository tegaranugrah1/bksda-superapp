"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Check, Copy, Loader2, Pencil, Plus, Save, ToggleLeft, Trash2, X, FileText, Banknote, Search, Sparkles, AlertCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { EditableItemListSection } from "../../surat-tugas/_components/EditableItemListSection";
import type { DasarItem, Employee, StTemplate, StExpenseTemplate } from "../../surat-tugas/_lib";

type TemplateKind = StTemplate["type"];

const TEMPLATE_TYPES: Array<{ value: TemplateKind; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "bmn", label: "BMN" },
  { value: "beda_hari", label: "Beda Hari" },
  { value: "plh", label: "PLH" },
  { value: "custom", label: "Custom" },
];

const EXPENSE_CATEGORIES: Array<{ value: StExpenseTemplate["category"]; label: string }> = [
  { value: "dipa", label: "DIPA" },
  { value: "hibah_folu", label: "Hibah / FOLU" },
  { value: "kerjasama", label: "Mitra Kerjasama" },
  { value: "dl1", label: "DL 1 / Tanpa Biaya" },
  { value: "other", label: "Lainnya" },
];

const DEFAULT_NOMOR_SURAT_FORMAT = "/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}";

function templateCodeFromName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
}

export default function StSettingsPage() {
  const [activeTab, setActiveTab] = useState<"st_templates" | "expense_templates">("st_templates");

  // ==========================================
  // 1. STATE: TEMPLATE SURAT TUGAS
  // ==========================================
  const [templates, setTemplates] = useState<StTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
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
  const [templateConfiguration, setTemplateConfiguration] = useState<Record<string, unknown>>({});

  // ==========================================
  // 2. STATE: TEMPLATE BIAYA / SUMBER DANA
  // ==========================================
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

  const currentYear = new Date().getFullYear().toString();

  // ==========================================
  // FETCH DATA
  // ==========================================
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
      setIsLoadingExpenses(true);
      const response = await api.get("/kepegawaian/st-expense-templates?include_inactive=true&per_page=100");
      setExpenseTemplates(response.data?.data || []);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal memuat template biaya"));
    } finally {
      setIsLoadingExpenses(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
    void fetchEmployees();
    void fetchExpenseTemplates();
  }, [fetchEmployees, fetchTemplates, fetchExpenseTemplates]);

  // ==========================================
  // HANDLERS: TEMPLATE SURAT TUGAS
  // ==========================================
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
    setTemplateConfiguration({});
    setIsTemplateFormOpen(false);
  };

  const handleEditTemplate = (template: StTemplate) => {
    setEditTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateCode(template.code || templateCodeFromName(template.name));
    setTemplateDescription(template.description || "");
    setTemplateType(template.type);
    setMenimbangItems(template.menimbang || []);
    setDasarItems(template.dasar || []);
    setSignerId(template.default_signer_employee_id ? String(template.default_signer_employee_id) : "");
    setTemplateIsActive(template.is_active);
    setTemplateIsDefault(template.is_default);

    const config = template.configuration || {};
    setTemplateConfiguration(config);
    const existingBiaya = typeof config.biaya_text === "string" ? config.biaya_text : "";
    setTemplateBiayaText(existingBiaya);

    const existingNomorFormat = typeof config.nomor_surat_format === "string" ? config.nomor_surat_format : DEFAULT_NOMOR_SURAT_FORMAT;
    setNomorSuratFormat(existingNomorFormat);
    setNomorFormatMode(existingNomorFormat === DEFAULT_NOMOR_SURAT_FORMAT ? "default" : "manual");

    setIsTemplateFormOpen(true);
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
        biaya_text: templateBiayaText.trim() || null,
        nomor_surat_format: nomorFormatMode === "manual" && nomorSuratFormat.trim() ? nomorSuratFormat.trim() : DEFAULT_NOMOR_SURAT_FORMAT,
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

  const handleDeleteTemplate = async (template: StTemplate) => {
    if (template.is_system) {
      toast.error("Template sistem tidak dapat dihapus. Nonaktifkan jika tidak digunakan.");
      return;
    }
    if (!window.confirm(`Hapus template ${template.name}?`)) return;

    try {
      await api.delete(`/kepegawaian/st-templates/${template.id}`);
      toast.success("Template berhasil dihapus");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menghapus template"));
    }
  };

  // ==========================================
  // HANDLERS: TEMPLATE BIAYA / SUMBER DANA
  // ==========================================
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
        item.biaya_text.toLowerCase().includes(expenseSearch.toLowerCase());

      const matchCategory =
        expenseCategoryFilter === "all" || item.category === expenseCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [expenseTemplates, expenseSearch, expenseCategoryFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Pengaturan Surat Tugas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola template dokumen Surat Tugas dan pengaturan sumber dana / klausul pembebanan biaya.
          </p>
        </div>
        <div>
          {activeTab === "st_templates" && !isTemplateFormOpen && (
            <button
              onClick={() => setIsTemplateFormOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" /> Buat Template ST
            </button>
          )}
          {activeTab === "expense_templates" && !isExpenseFormOpen && (
            <button
              onClick={() => {
                resetExpenseForm();
                setIsExpenseFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" /> Tambah Template Biaya
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab("st_templates");
            resetExpenseForm();
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "st_templates"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          Template Surat Tugas
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            {templates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("expense_templates");
            resetTemplateForm();
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "expense_templates"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          <Banknote className="h-4 w-4" />
          Template Biaya &amp; Sumber Dana
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            {expenseTemplates.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEMPLATE SURAT TUGAS */}
      {/* ========================================================================= */}
      {activeTab === "st_templates" && (
        <>
          {isTemplateFormOpen ? (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {editTemplateId ? "Edit Template Surat Tugas" : "Buat Template Surat Tugas Baru"}
                </h2>
                <button onClick={resetTemplateForm} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Nama Template
                  <input
                    value={templateName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTemplateName(value);
                      if (!editTemplateId) setTemplateCode(templateCodeFromName(value));
                    }}
                    placeholder="Perjalanan Dinas Biasa"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Kode Template <span className="font-normal text-slate-400">(otomatis)</span>
                  <input
                    value={editTemplateId ? templateCode : templateCodeFromName(templateName)}
                    readOnly
                    placeholder="dibuat dari nama template"
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Tipe
                  <select
                    value={templateType}
                    onChange={(event) => setTemplateType(event.target.value as TemplateKind)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    {TEMPLATE_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Penandatangan Default
                  <select
                    value={signerId}
                    onChange={(event) => setSignerId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">Gunakan default manual</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nama_lengkap || employee.name} — {employee.nip}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
                Deskripsi
                <textarea
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </label>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                <EditableItemListSection
                  title="Default Menimbang"
                  items={menimbangItems}
                  onChange={setMenimbangItems}
                  marker="letter"
                />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                <EditableItemListSection
                  title="Default Dasar"
                  items={dasarItems}
                  onChange={setDasarItems}
                  marker="number"
                />
              </div>

              <label className="block space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">
                Biaya / Klausul Pembebanan Anggaran Khusus Template Ini
                <span className="block text-xs font-normal text-slate-400">
                  (Opsional) Jika diisi, akan menimpa pilihan sumber dana umum saat template ini dipilih. Gunakan {"{tahun}"} agar tahun dinamis.
                </span>
                <textarea
                  value={templateBiayaText}
                  onChange={(event) => setTemplateBiayaText(event.target.value)}
                  rows={3}
                  placeholder="Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ... Tahun Anggaran {tahun};"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono text-xs"
                />
              </label>

              <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Format Nomor Surat</h3>
                  <p className="text-xs font-normal text-slate-400">
                    Bagian ini dimulai setelah nomor otomatis ST. Nomor surat tetap dibuat oleh sistem.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                      nomorFormatMode === "default"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "border-slate-200 dark:border-zinc-700"
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
                      <strong>Format Default</strong>
                      <br />
                      <span className="text-xs font-normal">
                        /K.18/TU/KSA.0X.0X/B/{"{bulan berjalan}"}/{"{tahun berjalan}"}
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                      nomorFormatMode === "manual"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "border-slate-200 dark:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="settings-nomor-format-mode"
                      checked={nomorFormatMode === "manual"}
                      onChange={() => setNomorFormatMode("manual")}
                    />
                    <span>
                      <strong>Tulis Manual</strong>
                      <br />
                      <span className="text-xs font-normal">Masukkan format sendiri</span>
                    </span>
                  </label>
                </div>
                {nomorFormatMode === "manual" && (
                  <input
                    value={nomorSuratFormat}
                    onChange={(event) => setNomorSuratFormat(event.target.value)}
                    placeholder="/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                )}
              </section>

              <div className="flex flex-wrap gap-5 text-sm text-slate-700 dark:text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateIsActive}
                    onChange={(event) => setTemplateIsActive(event.target.checked)}
                  />
                  Aktif
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateIsDefault}
                    onChange={(event) => setTemplateIsDefault(event.target.checked)}
                  />
                  Jadikan template default
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
                <button
                  onClick={resetTemplateForm}
                  className="rounded-xl px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  onClick={() => void handleTemplateSubmit()}
                  disabled={isTemplateSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isTemplateSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
                  Simpan Template ST
                </button>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {isLoadingTemplates ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : templates.length === 0 ? (
                <div className="p-12 text-center text-slate-500">Belum ada template Surat Tugas.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                      <tr>
                        <th className="px-5 py-4">Template</th>
                        <th className="px-5 py-4">Tipe</th>
                        <th className="px-5 py-4">Penandatangan</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {templates.map((template) => (
                        <tr key={template.id} className="text-slate-600 dark:text-zinc-300 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-zinc-900 dark:text-white">{template.name}</div>
                            <div className="text-xs text-slate-400">
                              {template.code || "tanpa-kode"} · v{template.version}{" "}
                              {template.is_system ? "· Sistem" : "· Custom"}
                            </div>
                            <div className="mt-1 max-w-sm text-xs text-slate-500 line-clamp-2">
                              {template.description || "Tidak ada deskripsi"}
                            </div>
                          </td>
                          <td className="px-5 py-4 uppercase font-mono text-xs">{template.type}</td>
                          <td className="px-5 py-4 text-xs">
                            <div className="font-medium text-slate-700 dark:text-zinc-200">
                              {template.default_signer_name || "Default manual"}
                            </div>
                            <div className="text-slate-400">{template.default_signer_nip || ""}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  template.is_active
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}
                              >
                                {template.is_active ? "Aktif" : "Nonaktif"}
                              </span>
                              {template.is_default && (
                                <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                title="Edit"
                                onClick={() => handleEditTemplate(template)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-zinc-800"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Jadikan default"
                                onClick={() => void handleSetDefaultTemplate(template.id)}
                                disabled={template.is_default || !template.is_active}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 dark:hover:bg-zinc-800"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                title="Aktif/nonaktif"
                                onClick={() => void handleToggleTemplateActive(template)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-zinc-800"
                              >
                                <ToggleLeft className="h-4 w-4" />
                              </button>
                              <button
                                title="Duplikasi"
                                onClick={() => void handleDuplicateTemplate(template.id)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-zinc-800"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                title="Hapus"
                                onClick={() => void handleDeleteTemplate(template)}
                                disabled={template.is_system}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-zinc-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEMPLATE BIAYA / SUMBER DANA */}
      {/* ========================================================================= */}
      {activeTab === "expense_templates" && (
        <>
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
                <button onClick={resetExpenseForm} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
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
                    onChange={(event) => setExpenseCategory(event.target.value as StExpenseTemplate["category"])}
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Teks Klausul Pembebanan Biaya (Bagian "Untuk") {expenseCategory !== "dl1" ? <span className="text-red-500">*</span> : <span className="text-xs text-slate-400 font-normal">(Opsional untuk DL 1)</span>}
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">
                    {expenseCategory === "dl1"
                      ? "Khusus kategori DL 1 / Tanpa Biaya, kosongkan jika pada bagian 'Untuk' Surat Tugas tidak perlu dicantumkan klausul pembebanan biaya."
                      : <>Gunakan tag <code className="rounded bg-slate-100 px-1 py-0.5 text-emerald-700 dark:bg-zinc-800">{"{tahun}"}</code> agar tahun otomatis dinamis mengikuti tanggal surat tugas.</>}
                  </span>
                </label>
                <textarea
                  value={expenseBiayaText}
                  onChange={(event) => setExpenseBiayaText(event.target.value)}
                  rows={3}
                  placeholder={expenseCategory === "dl1" ? "Kosongkan jika tanpa kalimat biaya..." : "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Teks Dasar Hukum / PKS / DIPA (Bagian "Dasar" Poin 2) <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">
                    Teks ini akan otomatis menggantikan atau mengisi poin nomor 2 di bagian Dasar Surat Tugas saat sumber dana ini dipilih.
                  </span>
                </label>
                <textarea
                  value={expenseDasarText}
                  onChange={(event) => setExpenseDasarText(event.target.value)}
                  rows={3}
                  placeholder="Contoh: Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan ... Nomor: ... tanggal ..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-xs font-mono leading-relaxed"
                />
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
                      <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block mb-1">Dasar (Poin 2):</span>
                      <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-sans bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        {(expenseDasarText || "").replace(/\{tahun\}/g, currentYear)}
                      </p>
                    </div>
                  )}
                  {expenseBiayaText?.trim() && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block mb-1">Klausul Biaya (Bagian Untuk Poin 3):</span>
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
                  {isExpenseSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
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

              {/* Table / List */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {isLoadingExpenses ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    {expenseSearch ? "Tidak ada template biaya yang cocok." : "Belum ada template biaya."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                        <tr>
                          <th className="px-5 py-4 w-12 text-center">No</th>
                          <th className="px-5 py-4">Sumber Dana &amp; Klausul Biaya</th>
                          <th className="px-5 py-4">Kategori</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {filteredExpenses.map((expense, index) => {
                          const categoryObj = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
                          return (
                            <tr
                              key={expense.id}
                              className="text-slate-600 dark:text-zinc-300 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30"
                            >
                              <td className="px-5 py-4 text-center font-mono text-xs text-slate-400">
                                {expense.sort_order || index + 1}
                              </td>
                              <td className="px-5 py-4 max-w-md">
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
                                <div className="text-xs font-mono text-slate-400 mt-0.5">{expense.code}</div>
                                {expense.dasar_text && (
                                  <div className="mt-2 text-[11px] text-slate-600 dark:text-zinc-300 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40 leading-relaxed line-clamp-2">
                                    <span className="font-bold text-amber-900 dark:text-amber-300 block text-[10px] uppercase mb-0.5">Dasar Hukum:</span>
                                    {expense.dasar_text}
                                  </div>
                                )}
                                {expense.biaya_text ? (
                                  <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800 font-mono leading-relaxed line-clamp-2">
                                    <span className="font-bold text-slate-700 dark:text-zinc-300 block text-[10px] uppercase mb-0.5 font-sans">Klausul Biaya:</span>
                                    {expense.biaya_text}
                                  </p>
                                ) : (
                                  <div className="mt-2 text-[11px] italic text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800/30 p-2 rounded-lg border border-slate-100 dark:border-zinc-800/60">
                                    — Tanpa Pembebanan Biaya (Poin &quot;Untuk&quot; tidak dicantumkan) —
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  {categoryObj?.label || expense.category}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      expense.is_active
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                                    }`}
                                  >
                                    {expense.is_active ? "Aktif" : "Nonaktif"}
                                  </span>
                                </div>
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
        </>
      )}
    </div>
  );
}
