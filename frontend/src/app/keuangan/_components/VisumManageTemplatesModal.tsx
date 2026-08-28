"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Settings2,
  FileSpreadsheet,
  Plus,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  Save,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { VisumSpdData, VisumTransitItem, formatNip } from "./VisumSpdDocument";

export interface VisumTemplateItem {
  id: number;
  name: string;
  description?: string | null;
  is_default: boolean;
  auto_today_date: boolean;
  data: VisumSpdData;
  created_at?: string;
  updated_at?: string;
}

export interface RegionalOfficialItem {
  place: string;
  official_name: string;
  official_nip: string;
  depart_position: string;
  return_position: string;
}

export interface PpkSettingItem {
  name: string;
  nip: string;
  position: string;
  statement: string;
}

export interface VisumSpdSettings {
  samarinda: RegionalOfficialItem;
  berau: RegionalOfficialItem;
  tenggarong: RegionalOfficialItem;
  balikpapan: RegionalOfficialItem;
  ppk: PpkSettingItem;
}

interface VisumManageTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplatesUpdated: () => void;
  onSettingsUpdated: (newSettings?: VisumSpdSettings) => void;
  employeeOptions: { id: number; name: string; nip?: string | null; position?: string | null }[];
}

export default function VisumManageTemplatesModal({
  open,
  onOpenChange,
  onTemplatesUpdated,
  onSettingsUpdated,
  employeeOptions,
}: VisumManageTemplatesModalProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "officials">("templates");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Template List State
  const [templates, setTemplates] = useState<VisumTemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VisumTemplateItem | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Template Form State
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  const [templateAutoToday, setTemplateAutoToday] = useState(true);
  const [templateData, setTemplateData] = useState<VisumSpdData | null>(null);

  // Master Officials State
  const [settings, setSettings] = useState<VisumSpdSettings | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTemplates, resSettings] = await Promise.all([
        api.get("/api/keuangan/visum/templates"),
        api.get("/api/keuangan/visum/settings"),
      ]);

      if (resTemplates.data?.success) {
        setTemplates(resTemplates.data.data);
      }
      if (resSettings.data?.success) {
        setSettings(resSettings.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data pengaturan visum.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      setIsEditingTemplate(false);
      setIsCreatingNew(false);
    }
  }, [open]);

  // Handle Select Template for Edit
  const handleEditTemplate = (tmpl: VisumTemplateItem) => {
    setSelectedTemplate(tmpl);
    setTemplateName(tmpl.name);
    setTemplateDesc(tmpl.description || "");
    setTemplateIsDefault(tmpl.is_default);
    setTemplateAutoToday(tmpl.auto_today_date);
    setTemplateData(tmpl.data);
    setIsEditingTemplate(true);
    setIsCreatingNew(false);
  };

  const handleSelectTemplateOrigin = (
    regionKey: "samarinda" | "berau" | "tenggarong" | "balikpapan"
  ) => {
    if (!settings) return;
    const reg = settings[regionKey];
    setTemplateData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        asal_tempat: reg.place,
        tujuan_1_berangkat_ke: reg.place,
        kembali_tempat: reg.place,
        asal_jabatan_pengesah: reg.depart_position,
        asal_nama_pejabat: reg.official_name,
        asal_nip_pejabat: reg.official_nip,
        kembali_jabatan_pengesah: reg.return_position,
        kembali_nama_pejabat: reg.official_name,
        kembali_nip_pejabat: reg.official_nip,
      };
    });
  };

  const getOriginKey = (asalTempat?: string) => {
    const t = (asalTempat || "Samarinda").toLowerCase();
    if (t.includes("berau")) return "berau";
    if (t.includes("tenggarong") || t.includes("kukar")) return "tenggarong";
    if (t.includes("balikpapan")) return "balikpapan";
    return "samarinda";
  };

  // Handle New Template
  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setTemplateName("");
    setTemplateDesc("");
    setTemplateIsDefault(false);
    setTemplateAutoToday(true);

    const s = settings?.samarinda;
    const ppk = settings?.ppk;

    setTemplateData({
      asal_tempat: s?.place || "Samarinda",
      asal_tanggal: "",
      tujuan_awal: "",
      asal_jabatan_pengesah: s?.depart_position || "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
      asal_nama_pejabat: s?.official_name || "Dheny Mardiono, S.Hut., MSc.",
      asal_nip_pejabat: s?.official_nip || "19750314 199903 1 004",

      tujuan_1_tempat: "",
      tujuan_1_tiba_tanggal: "",
      tujuan_1_kepala_jabatan: "",
      tujuan_1_kepala_nama: "",
      tujuan_1_kepala_nip: "",
      tujuan_1_id_type: "NIP",
      tujuan_1_berangkat_dari: "",
      tujuan_1_berangkat_ke: s?.place || "Samarinda",
      tujuan_1_berangkat_tanggal: "",
      tujuan_1_berangkat_kepala_jabatan: "",
      tujuan_1_berangkat_kepala_nama: "",
      tujuan_1_berangkat_kepala_nip: "",
      tujuan_1_berangkat_id_type: "NIP",

      transit_3: {},
      transit_4: {},
      transit_5: {},

      kembali_tempat: s?.place || "Samarinda",
      kembali_tanggal: "",
      kembali_jabatan_pengesah: s?.return_position || "Kepala Subbagian Tata Usaha",
      kembali_nama_pejabat: s?.official_name || "Dheny Mardiono, S.Hut., MSc.",
      kembali_nip_pejabat: s?.official_nip || "19750314 199903 1 004",

      ppk_keterangan:
        ppk?.statement ||
        "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
      ppk_jabatan: ppk?.position || "Pejabat Pembuat Komitmen,",
      ppk_nama: ppk?.name || "Ahmad Hidayat, S.PKP., M.Ling",
      ppk_nip: ppk?.nip || "19820301 200012 1 001",

      catatan_lain: "",
      perhatian_text:
        "PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealphaannya.",
    });
    setIsEditingTemplate(true);
    setIsCreatingNew(true);
  };

  const updateTemplateTransit = (
    transitKey: "transit_3" | "transit_4" | "transit_5",
    field: keyof VisumTransitItem,
    value: any
  ) => {
    setTemplateData((prev) => {
      if (!prev) return null;
      const existing = prev[transitKey] || {};
      const updated = { ...existing, [field]: value };
      return { ...prev, [transitKey]: updated };
    });
  };

  const hasTemplateTransit3 = Boolean(
    templateData?.transit_3 &&
      Object.keys(templateData.transit_3).length > 0 &&
      (templateData.transit_3.tiba_di !== undefined ||
        templateData.transit_3.berangkat_ke !== undefined ||
        templateData.transit_3.tiba_kepala_nama !== undefined)
  );

  const hasTemplateTransit4 = Boolean(
    templateData?.transit_4 &&
      Object.keys(templateData.transit_4).length > 0 &&
      (templateData.transit_4.tiba_di !== undefined ||
        templateData.transit_4.berangkat_ke !== undefined ||
        templateData.transit_4.tiba_kepala_nama !== undefined)
  );

  const hasTemplateTransit5 = Boolean(
    templateData?.transit_5 &&
      Object.keys(templateData.transit_5).length > 0 &&
      (templateData.transit_5.tiba_di !== undefined ||
        templateData.transit_5.berangkat_ke !== undefined ||
        templateData.transit_5.tiba_kepala_nama !== undefined)
  );

  const handleAddTemplateTransit = () => {
    if (!templateData) return;
    if (!hasTemplateTransit3) {
      setTemplateData({
        ...templateData,
        transit_3: {
          tiba_di: "",
          tiba_tanggal: "",
          tiba_kepala_jabatan: "",
          tiba_kepala_nama: "",
          tiba_kepala_nip: "",
          tiba_id_type: "NIP",
          berangkat_dari: "",
          berangkat_ke: templateData.kembali_tempat || "Samarinda",
          berangkat_tanggal: "",
          berangkat_kepala_jabatan: "",
          berangkat_kepala_nama: "",
          berangkat_kepala_nip: "",
          berangkat_id_type: "NIP",
        },
      });
      toast.success("Destinasi Lanjutan (III) ditambahkan pada template.");
    } else if (!hasTemplateTransit4) {
      setTemplateData({
        ...templateData,
        transit_4: {
          tiba_di: "",
          tiba_tanggal: "",
          tiba_kepala_jabatan: "",
          tiba_kepala_nama: "",
          tiba_kepala_nip: "",
          tiba_id_type: "NIP",
          berangkat_dari: "",
          berangkat_ke: templateData.kembali_tempat || "Samarinda",
          berangkat_tanggal: "",
          berangkat_kepala_jabatan: "",
          berangkat_kepala_nama: "",
          berangkat_kepala_nip: "",
          berangkat_id_type: "NIP",
        },
      });
      toast.success("Destinasi Lanjutan (IV) ditambahkan pada template.");
    } else if (!hasTemplateTransit5) {
      setTemplateData({
        ...templateData,
        transit_5: {
          tiba_di: "",
          tiba_tanggal: "",
          tiba_kepala_jabatan: "",
          tiba_kepala_nama: "",
          tiba_kepala_nip: "",
          tiba_id_type: "NIP",
          berangkat_dari: "",
          berangkat_ke: templateData.kembali_tempat || "Samarinda",
          berangkat_tanggal: "",
          berangkat_kepala_jabatan: "",
          berangkat_kepala_nama: "",
          berangkat_kepala_nip: "",
          berangkat_id_type: "NIP",
        },
      });
      toast.success("Destinasi Lanjutan (V) ditambahkan pada template.");
    }
  };

  const handleRemoveTemplateTransit = (
    transitKey: "transit_3" | "transit_4" | "transit_5",
    label: string
  ) => {
    if (!templateData) return;
    setTemplateData({
      ...templateData,
      [transitKey]: {},
    });
    toast.info(`Destinasi ${label} dihapus dari template.`);
  };

  // Save Template (Create or Update)
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Nama template wajib diisi.");
      return;
    }
    if (!templateData) return;

    setSaving(true);
    try {
      const payload = {
        name: templateName,
        description: templateDesc,
        is_default: templateIsDefault,
        auto_today_date: templateAutoToday,
        data: templateData,
      };

      if (isCreatingNew) {
        await api.post("/api/keuangan/visum/templates", payload);
        toast.success("Template baru berhasil disimpan.");
      } else if (selectedTemplate) {
        await api.put(`/api/keuangan/visum/templates/${selectedTemplate.id}`, payload);
        toast.success("Template berhasil diperbarui.");
      }

      setIsEditingTemplate(false);
      setIsCreatingNew(false);
      fetchData();
      onTemplatesUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan template.");
    } finally {
      setSaving(false);
    }
  };

  // Duplicate Template
  const handleDuplicateTemplate = async (id: number) => {
    setLoading(true);
    try {
      await api.post(`/api/keuangan/visum/templates/${id}/duplicate`);
      toast.success("Template berhasil diduplikasi.");
      fetchData();
      onTemplatesUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menduplikasi template.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Template confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/api/keuangan/visum/templates/${deleteTarget.id}`);
      toast.success(`Template "${deleteTarget.name}" berhasil dihapus.`);
      setDeleteTarget(null);
      fetchData();
      onTemplatesUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus template.");
    } finally {
      setDeleting(false);
    }
  };

  // Set Default Template
  const handleSetDefaultTemplate = async (id: number) => {
    try {
      await api.post(`/api/keuangan/visum/templates/${id}/set-default`);
      toast.success("Template default berhasil diubah.");
      fetchData();
      onTemplatesUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengubah template default.");
    }
  };

  // Update Settings (4 Wilayah & PPK)
  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.put("/api/keuangan/visum/settings", settings);
      toast.success("Pengaturan Pejabat 4 Wilayah & PPK berhasil disimpan.");
      onSettingsUpdated(settings);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan pengaturan pejabat.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to select employee for a region
  const handleSelectOfficialEmployee = (
    regionKey: "samarinda" | "berau" | "tenggarong" | "balikpapan",
    empId: number
  ) => {
    const emp = employeeOptions.find((e) => e.id === empId);
    if (!emp || !settings) return;

    setSettings({
      ...settings,
      [regionKey]: {
        ...settings[regionKey],
        official_name: emp.name,
        official_nip: formatNip(emp.nip),
      },
    });
  };

  // Helper to select employee for PPK
  const handleSelectPpkEmployee = (empId: number) => {
    const emp = employeeOptions.find((e) => e.id === empId);
    if (!emp || !settings) return;

    setSettings({
      ...settings,
      ppk: {
        ...settings.ppk,
        name: emp.name,
        nip: formatNip(emp.nip),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl xl:max-w-7xl w-[96vw] max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 rounded-2xl shadow-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 text-left">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">
                Kelola Template & Pejabat Visum SPD
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Atur template perjalanan dinas terpusat dan konfigurasi penandatangan 4 wilayah kerja.
              </DialogDescription>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              setIsEditingTemplate(false);
            }}
            className="mt-3 w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <TabsTrigger
                value="templates"
                className="flex items-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-amber-400"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Template Perjalanan ({templates.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="officials"
                className="flex items-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-amber-400"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Pejabat 4 Wilayah & PPK</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="p-6 md:p-8">
          {/* TAB 1: TEMPLATE PERJALANAN */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              {!isEditingTemplate ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Daftar Template Perjalanan Dinas
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Template ini dapat dipilih langsung pada lembar visum untuk mengisi tujuan secara cepat.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNewTemplate}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Template</span>
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex h-36 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                      <FileSpreadsheet className="h-8 w-8 text-zinc-400" />
                      <p className="mt-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Belum ada template tersimpan.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleNewTemplate}
                        className="mt-3 text-xs"
                      >
                        Buat Template Pertama
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {templates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                            tmpl.is_default
                              ? "border-amber-500/80 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                                {tmpl.name}
                              </h4>
                              {tmpl.is_default && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">
                              {tmpl.description || "Tidak ada deskripsi."}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                Asal: {tmpl.data?.asal_tempat || "Samarinda"}
                              </span>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                Tujuan: {tmpl.data?.tujuan_1_tempat || tmpl.data?.tujuan_awal || "-"}
                              </span>
                              {tmpl.auto_today_date && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  Tanggal Hari Ini
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            {!tmpl.is_default ? (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultTemplate(tmpl.id)}
                                className="text-[10px] font-semibold text-zinc-500 hover:text-amber-600"
                              >
                                Jadikan Default
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400">Aktif Default</span>
                            )}

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicateTemplate(tmpl.id)}
                                title="Duplikasi Template"
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-amber-600"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(tmpl)}
                                title="Edit Template"
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-blue-600"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget({ id: tmpl.id, name: tmpl.name })}
                                title="Hapus Template"
                                className="h-7 w-7 p-0 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Form Editor Template */
                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                        {isCreatingNew ? "Buat Template Baru" : `Edit Template: ${templateName}`}
                      </h4>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingTemplate(false)}
                      className="text-xs text-zinc-500"
                    >
                      Batal
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        Nama Template *
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Contoh: Suaka Badak Kelian, Patroli SKW I Berau"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        Deskripsi / Keterangan
                      </label>
                      <input
                        type="text"
                        value={templateDesc}
                        onChange={(e) => setTemplateDesc(e.target.value)}
                        placeholder="Keterangan singkat maksud/lokasi perjalanan"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="autoTodayCheck"
                        checked={templateAutoToday}
                        onChange={(e) => setTemplateAutoToday(e.target.checked)}
                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="autoTodayCheck" className="text-xs text-zinc-700 dark:text-zinc-300">
                        Gunakan Tanggal Hari Ini Secara Otomatis saat template dimuat
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="defaultCheck"
                        checked={templateIsDefault}
                        onChange={(e) => setTemplateIsDefault(e.target.checked)}
                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="defaultCheck" className="text-xs text-zinc-700 dark:text-zinc-300">
                        Jadikan sebagai Template Default Visum SPD
                      </label>
                    </div>
                  </div>

                  {/* Origin Balai / Seksi Wilayah Selector */}
                  <div className="mt-4 space-y-2 rounded-2xl border border-amber-200/60 bg-amber-50/30 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Asal Keberangkatan & Pejabat Pengesah Default (Balai / Seksi)</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Pilih kantor penerbit SPT / Pengesah</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                      {/* 1. Samarinda (Balai) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTemplateOrigin("samarinda")}
                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                          getOriginKey(templateData?.asal_tempat) === "samarinda"
                            ? "border-amber-500 bg-white dark:bg-zinc-900 text-amber-950 dark:text-amber-300 font-semibold shadow-sm ring-2 ring-amber-500/20"
                            : "border-zinc-200 bg-white/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">1. Balai (Samarinda)</span>
                            {getOriginKey(templateData?.asal_tempat) === "samarinda" && (
                              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] font-medium mt-1.5 text-zinc-800 dark:text-zinc-200 truncate">
                            {settings?.samarinda?.official_name || "Dheny Mardiono, S.Hut., MSc."}
                          </p>
                        </div>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-2 block">
                          Kasubbag Tata Usaha
                        </span>
                      </button>

                      {/* 2. Berau (Seksi Wilayah I) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTemplateOrigin("berau")}
                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                          getOriginKey(templateData?.asal_tempat) === "berau"
                            ? "border-amber-500 bg-white dark:bg-zinc-900 text-amber-950 dark:text-amber-300 font-semibold shadow-sm ring-2 ring-amber-500/20"
                            : "border-zinc-200 bg-white/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">2. Seksi Wil. I (Berau)</span>
                            {getOriginKey(templateData?.asal_tempat) === "berau" && (
                              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] font-medium mt-1.5 text-zinc-800 dark:text-zinc-200 truncate">
                            {settings?.berau?.official_name || "Yulian Sadono, S.Hut., M.T."}
                          </p>
                        </div>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-2 block">
                          Kepala Seksi Wil. I
                        </span>
                      </button>

                      {/* 3. Tenggarong (Seksi Wilayah II) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTemplateOrigin("tenggarong")}
                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                          getOriginKey(templateData?.asal_tempat) === "tenggarong"
                            ? "border-amber-500 bg-white dark:bg-zinc-900 text-amber-950 dark:text-amber-300 font-semibold shadow-sm ring-2 ring-amber-500/20"
                            : "border-zinc-200 bg-white/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">3. Seksi Wil. II (Tenggarong)</span>
                            {getOriginKey(templateData?.asal_tempat) === "tenggarong" && (
                              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] font-medium mt-1.5 text-zinc-800 dark:text-zinc-200 truncate">
                            {settings?.tenggarong?.official_name || "Suriawati Halim, S.Hut., M.P."}
                          </p>
                        </div>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-2 block">
                          Kepala Seksi Wil. II
                        </span>
                      </button>

                      {/* 4. Balikpapan (Seksi Wilayah III) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTemplateOrigin("balikpapan")}
                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                          getOriginKey(templateData?.asal_tempat) === "balikpapan"
                            ? "border-amber-500 bg-white dark:bg-zinc-900 text-amber-950 dark:text-amber-300 font-semibold shadow-sm ring-2 ring-amber-500/20"
                            : "border-zinc-200 bg-white/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">4. Seksi Wil. III (Balikpapan)</span>
                            {getOriginKey(templateData?.asal_tempat) === "balikpapan" && (
                              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] font-medium mt-1.5 text-zinc-800 dark:text-zinc-200 truncate">
                            {settings?.balikpapan?.official_name || "Bambang Hari T."}
                          </p>
                        </div>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-2 block">
                          Kepala Seksi Wil. III
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Template Data Fields Preview/Editor */}
                  {templateData && (
                    <div className="mt-4 space-y-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                        Isian Data Destinasi & Pejabat Lapangan (Tujuan II)
                      </h5>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-medium text-zinc-500">
                            Lokasi Tujuan (Tiba di)
                          </label>
                          <input
                            type="text"
                            value={templateData.tujuan_1_tempat || ""}
                            onChange={(e) =>
                              setTemplateData({ ...templateData, tujuan_1_tempat: e.target.value })
                            }
                            placeholder="Kabupaten Kutai Barat"
                            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-zinc-500">
                            Jabatan Pejabat Lapangan
                          </label>
                          <input
                            type="text"
                            value={templateData.tujuan_1_kepala_jabatan || ""}
                            onChange={(e) =>
                              setTemplateData({
                                ...templateData,
                                tujuan_1_kepala_jabatan: e.target.value,
                                tujuan_1_berangkat_kepala_jabatan: e.target.value,
                              })
                            }
                            placeholder="Plt. Manager Camp PT. HLKL"
                            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-zinc-500">
                            Nama Pejabat Lapangan
                          </label>
                          <input
                            type="text"
                            value={templateData.tujuan_1_kepala_nama || ""}
                            onChange={(e) =>
                              setTemplateData({
                                ...templateData,
                                tujuan_1_kepala_nama: e.target.value,
                                tujuan_1_berangkat_kepala_nama: e.target.value,
                              })
                            }
                            placeholder="Theodorus Dedi"
                            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-zinc-500">
                            NIP / NIK Pejabat Lapangan (Opsional)
                          </label>
                          <input
                            type="text"
                            value={templateData.tujuan_1_kepala_nip || ""}
                            onChange={(e) =>
                              setTemplateData({
                                ...templateData,
                                tujuan_1_kepala_nip: e.target.value,
                                tujuan_1_berangkat_kepala_nip: e.target.value,
                              })
                            }
                            placeholder="Kosongkan jika swasta"
                            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Template Transit Destinations III, IV, V */}
                  {templateData && (
                    <div className="space-y-3">
                      {hasTemplateTransit3 && (
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/20 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
                            <h5 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                              III. Destinasi Lanjutan / Transit 1
                            </h5>
                            <button
                              type="button"
                              onClick={() => handleRemoveTemplateTransit("transit_3", "III")}
                              className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            >
                              Hapus III
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Lokasi Tujuan (Tiba di)
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_3?.tiba_di || ""}
                                onChange={(e) => updateTemplateTransit("transit_3", "tiba_di", e.target.value)}
                                placeholder="Nama Kota / Pos Lapangan"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Berangkat Ke (Destinasi Berikutnya)
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_3?.berangkat_ke || ""}
                                onChange={(e) => updateTemplateTransit("transit_3", "berangkat_ke", e.target.value)}
                                placeholder="Kota / Tujuan Berikutnya"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Jabatan Pejabat Lapangan
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_3?.tiba_kepala_jabatan || ""}
                                onChange={(e) => {
                                  updateTemplateTransit("transit_3", "tiba_kepala_jabatan", e.target.value);
                                  updateTemplateTransit("transit_3", "berangkat_kepala_jabatan", e.target.value);
                                }}
                                placeholder="Kepala Resort / Camat / Manager"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Nama Pejabat Lapangan
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_3?.tiba_kepala_nama || ""}
                                onChange={(e) => {
                                  updateTemplateTransit("transit_3", "tiba_kepala_nama", e.target.value);
                                  updateTemplateTransit("transit_3", "berangkat_kepala_nama", e.target.value);
                                }}
                                placeholder="Nama Pejabat Lapangan"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {hasTemplateTransit4 && (
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/20 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
                            <h5 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                              IV. Destinasi Lanjutan / Transit 2
                            </h5>
                            <button
                              type="button"
                              onClick={() => handleRemoveTemplateTransit("transit_4", "IV")}
                              className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            >
                              Hapus IV
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Lokasi Tujuan (Tiba di)
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_4?.tiba_di || ""}
                                onChange={(e) => updateTemplateTransit("transit_4", "tiba_di", e.target.value)}
                                placeholder="Nama Kota / Pos Lapangan"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Berangkat Ke (Destinasi Berikutnya)
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_4?.berangkat_ke || ""}
                                onChange={(e) => updateTemplateTransit("transit_4", "berangkat_ke", e.target.value)}
                                placeholder="Kota / Tujuan Berikutnya"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Jabatan Pejabat Lapangan
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_4?.tiba_kepala_jabatan || ""}
                                onChange={(e) => {
                                  updateTemplateTransit("transit_4", "tiba_kepala_jabatan", e.target.value);
                                  updateTemplateTransit("transit_4", "berangkat_kepala_jabatan", e.target.value);
                                }}
                                placeholder="Kepala Resort / Camat / Manager"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Nama Pejabat Lapangan
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_4?.tiba_kepala_nama || ""}
                                onChange={(e) => {
                                  updateTemplateTransit("transit_4", "tiba_kepala_nama", e.target.value);
                                  updateTemplateTransit("transit_4", "berangkat_kepala_nama", e.target.value);
                                }}
                                placeholder="Nama Pejabat Lapangan"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {hasTemplateTransit5 && (
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/20 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
                            <h5 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                              V. Destinasi Lanjutan / Transit 3
                            </h5>
                            <button
                              type="button"
                              onClick={() => handleRemoveTemplateTransit("transit_5", "V")}
                              className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            >
                              Hapus V
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Lokasi Tujuan (Tiba di)
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_5?.tiba_di || ""}
                                onChange={(e) => updateTemplateTransit("transit_5", "tiba_di", e.target.value)}
                                placeholder="Nama Kota / Pos Lapangan"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Berangkat Ke (Destinasi Berikutnya)
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_5?.berangkat_ke || ""}
                                onChange={(e) => updateTemplateTransit("transit_5", "berangkat_ke", e.target.value)}
                                placeholder="Kota / Tujuan Berikutnya"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Jabatan Pejabat Lapangan
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_5?.tiba_kepala_jabatan || ""}
                                onChange={(e) => {
                                  updateTemplateTransit("transit_5", "tiba_kepala_jabatan", e.target.value);
                                  updateTemplateTransit("transit_5", "berangkat_kepala_jabatan", e.target.value);
                                }}
                                placeholder="Kepala Resort / Camat / Manager"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-zinc-500">
                                Nama Pejabat Lapangan
                              </label>
                              <input
                                type="text"
                                value={templateData.transit_5?.tiba_kepala_nama || ""}
                                onChange={(e) => {
                                  updateTemplateTransit("transit_5", "tiba_kepala_nama", e.target.value);
                                  updateTemplateTransit("transit_5", "berangkat_kepala_nama", e.target.value);
                                }}
                                placeholder="Nama Pejabat Lapangan"
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {(!hasTemplateTransit3 || !hasTemplateTransit4 || !hasTemplateTransit5) && (
                        <button
                          type="button"
                          onClick={handleAddTemplateTransit}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100/60 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            + Tambah Destinasi Lanjutan Template (
                            {!hasTemplateTransit3 ? "III" : !hasTemplateTransit4 ? "IV" : "V"})
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingTemplate(false)}
                      className="text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveTemplate}
                      disabled={saving}
                      className="flex items-center gap-1.5 bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Simpan Template</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PEJABAT 4 WILAYAH & PPK */}
          {activeTab === "officials" && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Master Pejabat Penandatangan 4 Wilayah Kerja
                </h3>
                <p className="text-xs text-zinc-500">
                  Data pejabat ini akan otomatis terisi saat user menekan salah satu dari 4 tombol cepat wilayah di formulir Visum SPD.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* 1. Samarinda (Balai) */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2.5 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>1. Samarinda (Balai)</span>
                    </div>
                    {employeeOptions.length > 0 && (
                      <select
                        onChange={(e) =>
                          handleSelectOfficialEmployee("samarinda", Number(e.target.value))
                        }
                        defaultValue=""
                        className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[200px]"
                      >
                        <option value="" disabled>
                          Pilih dari Pegawai...
                        </option>
                        {employeeOptions.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.position ? `(${emp.position})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Nama Pejabat
                      </label>
                      <input
                        type="text"
                        value={settings.samarinda.official_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            samarinda: { ...settings.samarinda, official_name: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        NIP Pejabat
                      </label>
                      <input
                        type="text"
                        value={settings.samarinda.official_nip}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            samarinda: { ...settings.samarinda, official_nip: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Berangkat (Bagian I)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.samarinda.depart_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            samarinda: { ...settings.samarinda, depart_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Tiba Kembali (Bagian VI)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.samarinda.return_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            samarinda: { ...settings.samarinda, return_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Berau (Wilayah I) */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2.5 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>2. Berau (Wilayah I)</span>
                    </div>
                    {employeeOptions.length > 0 && (
                      <select
                        onChange={(e) =>
                          handleSelectOfficialEmployee("berau", Number(e.target.value))
                        }
                        defaultValue=""
                        className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[200px]"
                      >
                        <option value="" disabled>
                          Pilih dari Pegawai...
                        </option>
                        {employeeOptions.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.position ? `(${emp.position})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Nama Pejabat (Kepala Seksi Wil. I)
                      </label>
                      <input
                        type="text"
                        value={settings.berau.official_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            berau: { ...settings.berau, official_name: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        NIP Pejabat
                      </label>
                      <input
                        type="text"
                        value={settings.berau.official_nip}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            berau: { ...settings.berau, official_nip: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Berangkat (Bagian I)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.berau.depart_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            berau: { ...settings.berau, depart_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Tiba Kembali (Bagian VI)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.berau.return_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            berau: { ...settings.berau, return_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Tenggarong (Wilayah II) */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2.5 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>3. Tenggarong (Wilayah II)</span>
                    </div>
                    {employeeOptions.length > 0 && (
                      <select
                        onChange={(e) =>
                          handleSelectOfficialEmployee("tenggarong", Number(e.target.value))
                        }
                        defaultValue=""
                        className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[200px]"
                      >
                        <option value="" disabled>
                          Pilih dari Pegawai...
                        </option>
                        {employeeOptions.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.position ? `(${emp.position})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Nama Pejabat (Kepala Seksi Wil. II)
                      </label>
                      <input
                        type="text"
                        value={settings.tenggarong.official_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            tenggarong: { ...settings.tenggarong, official_name: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        NIP Pejabat
                      </label>
                      <input
                        type="text"
                        value={settings.tenggarong.official_nip}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            tenggarong: { ...settings.tenggarong, official_nip: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Berangkat (Bagian I)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.tenggarong.depart_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            tenggarong: { ...settings.tenggarong, depart_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Tiba Kembali (Bagian VI)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.tenggarong.return_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            tenggarong: { ...settings.tenggarong, return_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Balikpapan (Wilayah III) */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2.5 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>4. Balikpapan (Wilayah III)</span>
                    </div>
                    {employeeOptions.length > 0 && (
                      <select
                        onChange={(e) =>
                          handleSelectOfficialEmployee("balikpapan", Number(e.target.value))
                        }
                        defaultValue=""
                        className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[200px]"
                      >
                        <option value="" disabled>
                          Pilih dari Pegawai...
                        </option>
                        {employeeOptions.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.position ? `(${emp.position})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Nama Pejabat (Kepala Seksi Wil. III)
                      </label>
                      <input
                        type="text"
                        value={settings.balikpapan.official_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            balikpapan: { ...settings.balikpapan, official_name: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        NIP Pejabat
                      </label>
                      <input
                        type="text"
                        value={settings.balikpapan.official_nip}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            balikpapan: { ...settings.balikpapan, official_nip: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Berangkat (Bagian I)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.balikpapan.depart_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            balikpapan: { ...settings.balikpapan, depart_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Jabatan Pengesah Tiba Kembali (Bagian VI)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.balikpapan.return_position}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            balikpapan: { ...settings.balikpapan, return_position: e.target.value },
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PPK Section */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 dark:border-amber-500/30 dark:bg-amber-500/5 shadow-xs">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5 dark:border-amber-500/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                    <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Pengaturan Pejabat Pembuat Komitmen (PPK)</span>
                  </div>
                  {employeeOptions.length > 0 && (
                    <select
                      onChange={(e) => handleSelectPpkEmployee(Number(e.target.value))}
                      defaultValue=""
                      className="h-7 rounded-lg border border-amber-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[200px]"
                    >
                      <option value="" disabled>
                        Pilih dari Pegawai PPK...
                      </option>
                      {employeeOptions.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} {emp.position ? `(${emp.position})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Nama PPK
                    </label>
                    <input
                      type="text"
                      value={settings.ppk.name}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ppk: { ...settings.ppk, name: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      NIP PPK
                    </label>
                    <input
                      type="text"
                      value={settings.ppk.nip}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ppk: { ...settings.ppk, nip: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Keterangan Pernyataan PPK (Bagian VI Kanan)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.ppk.statement}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ppk: { ...settings.ppk, statement: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-md"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Simpan Pengaturan Pejabat & PPK</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* MODAL KONFIRMASI HAPUS TEMPLATE */}
      <Dialog open={!!deleteTarget} onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-6 border border-zinc-200 bg-white/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-8 ring-rose-500/5 dark:bg-rose-500/20 dark:text-rose-400 dark:ring-rose-500/10">
              <Trash2 className="h-7 w-7" />
            </div>

            <DialogHeader className="mt-4 text-center">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">
                Hapus Template Perjalanan?
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                Apakah Anda yakin ingin menghapus template <span className="font-bold text-zinc-800 dark:text-zinc-200">"{deleteTarget?.name}"</span>? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex w-full items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="w-1/2 rounded-xl text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-1/2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 shadow-md shadow-rose-600/20"
              >
                {deleting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                <span>Hapus Template</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
