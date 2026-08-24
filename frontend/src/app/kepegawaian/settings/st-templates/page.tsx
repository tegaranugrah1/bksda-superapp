"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Pencil, Plus, Save, ToggleLeft, Trash2, X } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { EditableItemListSection } from "../../surat-tugas/_components/EditableItemListSection";
import type { DasarItem, Employee, StTemplate } from "../../surat-tugas/_lib";

type TemplateKind = StTemplate["type"];

const TEMPLATE_TYPES: Array<{ value: TemplateKind; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "bmn", label: "BMN" },
  { value: "beda_hari", label: "Beda Hari" },
  { value: "plh", label: "PLH" },
  { value: "custom", label: "Custom" },
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

export default function StTemplatesSettingsPage() {
  const [templates, setTemplates] = useState<StTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TemplateKind>("custom");
  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([]);
  const [signerId, setSignerId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [biayaText, setBiayaText] = useState("");
  const [nomorSuratFormat, setNomorSuratFormat] = useState(DEFAULT_NOMOR_SURAT_FORMAT);
  const [nomorFormatMode, setNomorFormatMode] = useState<"default" | "manual">("default");
  const [templateConfiguration, setTemplateConfiguration] = useState<Record<string, unknown>>({});

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/kepegawaian/st-templates?include_inactive=true&per_page=100");
      setTemplates(response.data?.data || []);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal memuat template ST"));
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    void fetchTemplates();
    void fetchEmployees();
  }, [fetchEmployees, fetchTemplates]);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setCode("");
    setDescription("");
    setType("custom");
    setMenimbangItems([]);
    setDasarItems([]);
    setSignerId("");
    setIsActive(true);
    setIsDefault(false);
    setBiayaText("");
    setNomorSuratFormat(DEFAULT_NOMOR_SURAT_FORMAT);
    setNomorFormatMode("default");
    setTemplateConfiguration({});
    setIsFormOpen(false);
  };

  const handleEdit = (template: StTemplate) => {
    setEditId(template.id);
    setName(template.name);
    setCode(template.code || "");
    setDescription(template.description || "");
    setType(template.type);
    setMenimbangItems(template.menimbang || []);
    setDasarItems(template.dasar || []);
    setSignerId(template.default_signer_employee_id ? String(template.default_signer_employee_id) : "");
    setIsActive(template.is_active);
    setIsDefault(template.is_default);
    setBiayaText(typeof template.configuration?.biaya_text === "string" ? template.configuration.biaya_text : "");
    const savedNomorFormat = typeof template.configuration?.nomor_surat_format === "string" ? template.configuration.nomor_surat_format : "";
    setNomorSuratFormat(savedNomorFormat || DEFAULT_NOMOR_SURAT_FORMAT);
    setNomorFormatMode(!savedNomorFormat || savedNomorFormat === DEFAULT_NOMOR_SURAT_FORMAT ? "default" : "manual");
    setTemplateConfiguration(template.configuration || {});
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const generatedCode = editId ? code.trim() : templateCodeFromName(name);
    if (!name.trim() || !generatedCode) {
      toast.error("Nama template wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: generatedCode,
        description: description.trim() || null,
        type,
        menimbang: menimbangItems,
        dasar: dasarItems,
        default_signer_employee_id: signerId ? Number(signerId) : null,
        configuration: {
          ...templateConfiguration,
          ...(biayaText.trim() ? { biaya_text: biayaText.trim() } : {}),
          nomor_surat_format: nomorFormatMode === "default" ? DEFAULT_NOMOR_SURAT_FORMAT : nomorSuratFormat.trim() || DEFAULT_NOMOR_SURAT_FORMAT,
        },
        is_active: isActive,
        is_default: isDefault,
      };

      if (editId) {
        await api.put(`/kepegawaian/st-templates/${editId}`, payload);
        toast.success("Template berhasil diperbarui");
      } else {
        await api.post("/kepegawaian/st-templates", payload);
        toast.success("Template berhasil dibuat");
      }

      resetForm();
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menyimpan template"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.post(`/kepegawaian/st-templates/${id}/set-default`);
      toast.success("Template default berhasil diubah");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal mengubah template default"));
    }
  };

  const handleToggleActive = async (template: StTemplate) => {
    try {
      await api.patch(`/kepegawaian/st-templates/${template.id}/toggle-active`, { is_active: !template.is_active });
      toast.success(template.is_active ? "Template dinonaktifkan" : "Template diaktifkan");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal mengubah status template"));
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.post(`/kepegawaian/st-templates/${id}/duplicate`);
      toast.success("Template berhasil diduplikasi");
      await fetchTemplates();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Gagal menduplikasi template"));
    }
  };

  const handleDelete = async (template: StTemplate) => {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Manajemen Template Surat Tugas</h1>
          <p className="mt-1 text-sm text-slate-500">Superadmin mengelola Menimbang, Dasar, penandatangan, dan status template.</p>
        </div>
        {!isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Template Baru
          </button>
        )}
      </div>

      {isFormOpen ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{editId ? "Edit Template" : "Buat Template Baru"}</h2>
            <button onClick={resetForm} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="h-5 w-5 text-slate-400" /></button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">Nama Template
              <input value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!editId) setCode(templateCodeFromName(value)); }} placeholder="Perjalanan Dinas Biasa" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">Kode Template <span className="font-normal text-slate-400">(otomatis)</span>
              <input value={editId ? code : templateCodeFromName(name)} readOnly placeholder="dibuat dari nama template" className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">Tipe
              <select value={type} onChange={(event) => setType(event.target.value as TemplateKind)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                {TEMPLATE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">Penandatangan Default
              <select value={signerId} onChange={(event) => setSignerId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                <option value="">Gunakan default manual</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nama_lengkap || employee.name} — {employee.nip}</option>)}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">Deskripsi
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800"><EditableItemListSection title="Default Menimbang" items={menimbangItems} onChange={setMenimbangItems} marker="letter" /></div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800"><EditableItemListSection title="Default Dasar" items={dasarItems} onChange={setDasarItems} marker="number" /></div>

          <label className="block space-y-1 text-sm font-medium text-slate-700 dark:text-zinc-300">Biaya / Nomor 3
            <span className="block text-xs font-normal text-slate-400">Kalimat biaya yang otomatis menjadi bagian dari “Untuk”. Gunakan {"{tahun}"} agar tahun mengikuti tanggal surat.</span>
            <textarea value={biayaText} onChange={(event) => setBiayaText(event.target.value)} rows={3} placeholder="Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ... Tahun Anggaran {tahun};" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>

          <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Format Nomor Surat</h3>
              <p className="text-xs font-normal text-slate-400">Bagian ini dimulai setelah nomor otomatis ST. Nomor surat tetap dibuat oleh sistem.</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${nomorFormatMode === "default" ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 dark:border-zinc-700"}`}>
                <input type="radio" name="settings-nomor-format-mode" checked={nomorFormatMode === "default"} onChange={() => { setNomorFormatMode("default"); setNomorSuratFormat(DEFAULT_NOMOR_SURAT_FORMAT); }} />
                <span><strong>Format Default</strong><br /><span className="text-xs font-normal">/K.18/TU/KSA.0X.0X/B/{"{bulan berjalan}"}/{"{tahun berjalan}"}</span></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${nomorFormatMode === "manual" ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 dark:border-zinc-700"}`}>
                <input type="radio" name="settings-nomor-format-mode" checked={nomorFormatMode === "manual"} onChange={() => setNomorFormatMode("manual")} />
                <span><strong>Tulis Manual</strong><br /><span className="text-xs font-normal">Masukkan format sendiri</span></span>
              </label>
            </div>
            {nomorFormatMode === "manual" && (
              <input value={nomorSuratFormat} onChange={(event) => setNomorSuratFormat(event.target.value)} placeholder="/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            )}
          </section>

          <div className="flex flex-wrap gap-5 text-sm text-slate-700 dark:text-zinc-300">
            <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Aktif</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Jadikan template default</label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
            <button onClick={resetForm} className="rounded-xl px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">Batal</button>
            <button onClick={() => void handleSubmit()} disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Template
            </button>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div> : templates.length === 0 ? <div className="p-12 text-center text-slate-500">Belum ada template.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400"><tr><th className="px-5 py-4">Template</th><th className="px-5 py-4">Tipe</th><th className="px-5 py-4">Penandatangan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {templates.map((template) => <tr key={template.id} className="text-slate-600 dark:text-zinc-300"><td className="px-5 py-4"><div className="font-semibold text-zinc-900 dark:text-white">{template.name}</div><div className="text-xs text-slate-400">{template.code || "tanpa-kode"} · v{template.version} {template.is_system ? "· Sistem" : "· Custom"}</div><div className="mt-1 max-w-sm text-xs text-slate-500">{template.description || "Tidak ada deskripsi"}</div></td><td className="px-5 py-4 uppercase">{template.type}</td><td className="px-5 py-4 text-xs">{template.default_signer_name || "Default manual"}<br />{template.default_signer_nip || ""}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1"><span className={`rounded-full px-2 py-1 text-[10px] ${template.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{template.is_active ? "Aktif" : "Nonaktif"}</span>{template.is_default && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] text-blue-700">Default</span>}</div></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button title="Edit" onClick={() => handleEdit(template)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button><button title="Jadikan default" aria-label="Jadikan default" onClick={() => void handleSetDefault(template.id)} disabled={template.is_default || !template.is_active} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"><Check className="h-4 w-4" /><span className="inline">Jadikan Default</span></button><button title="Aktif/nonaktif" onClick={() => void handleToggleActive(template)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"><ToggleLeft className="h-4 w-4" /></button><button title="Duplikasi" onClick={() => void handleDuplicate(template.id)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><Copy className="h-4 w-4" /></button><button title="Hapus" onClick={() => void handleDelete(template)} disabled={template.is_system} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
            </tbody></table></div>
          )}
        </section>
      )}
    </div>
  );
}
