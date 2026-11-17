"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  ExternalLink,
  SlidersHorizontal,
  X,
  FileBadge,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { KepegawaianDialog } from "@/app/kepegawaian/_components/KepegawaianDialog";
import { useKepegawaianTabs } from "@/app/kepegawaian/_lib/useKepegawaianTabs";
import { KepegawaianTabContent } from "@/app/kepegawaian/_components/KepegawaianTabContent";

interface SuratTemplateItem {
  id: number;
  key: string;
  nama: string;
  kategori: string;
  deskripsi: string | null;
  nomor_prefix: string;
  kode_klasifikasi: string;
  judul_dokumen: string | null;
  default_payload: any | null;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function SuratSettingsPage() {
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();
  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("all");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeItem, setActiveItem] = useState<SuratTemplateItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    key: "",
    nama: "",
    kategori: "Tata Naskah Dinas",
    deskripsi: "",
    nomor_prefix: "S",
    kode_klasifikasi: "KSA.01.05",
    judul_dokumen: "",
    is_active: true,
  });

  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SuratTemplateItem[]>({
    queryKey: ["suratTemplates", search, selectedKategori],
    queryFn: async () => {
      const res = await api.get("/surat/templates", {
        params: {
          search: search || undefined,
          kategori: selectedKategori !== "all" ? selectedKategori : undefined,
        },
      });
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post("/surat/templates", data);
    },
    onSuccess: () => {
      toast.success("Template naskah dinas berhasil ditambahkan!");
      queryClient.invalidateQueries({ queryKey: ["suratTemplates"] });
      setModalMode(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal menambahkan template.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      await api.put(`/surat/templates/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Template naskah dinas berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["suratTemplates"] });
      setModalMode(null);
      setActiveItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal memperbarui template.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/surat/templates/${id}`);
    },
    onSuccess: () => {
      toast.success("Template berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["suratTemplates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal menghapus template.");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.post("/surat/templates/reset-defaults");
    },
    onSuccess: () => {
      toast.success("Template sistem berhasil di-reset ke standar resmi!");
      queryClient.invalidateQueries({ queryKey: ["suratTemplates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal me-reset template.");
    },
  });

  const openCreateModal = () => {
    setFormData({
      key: "",
      nama: "",
      kategori: "Tata Naskah Dinas",
      deskripsi: "",
      nomor_prefix: "S",
      kode_klasifikasi: "KSA.01.05",
      judul_dokumen: "",
      is_active: true,
    });
    setModalMode("create");
  };

  const openEditModal = (t: SuratTemplateItem) => {
    setActiveItem(t);
    setFormData({
      key: t.key,
      nama: t.nama,
      kategori: t.kategori || "Tata Naskah Dinas",
      deskripsi: t.deskripsi || "",
      nomor_prefix: t.nomor_prefix || "S",
      kode_klasifikasi: t.kode_klasifikasi || "KSA.01.05",
      judul_dokumen: t.judul_dokumen || "",
      is_active: t.is_active,
    });
    setModalMode("edit");
  };

  const handleResetDefaults = async () => {
    const ok = await confirmDialog({
      title: "Reset Template Bawaan Sistem?",
      description:
        "Seluruh template sistem akan dikembalikan ke format bawaan resmi Permen Kehutanan No. 1/2025.",
      confirmText: "Ya, Reset",
      cancelText: "Batal",
      variant: "warning",
      contentModule: "persuratan",
      contentClassName: "psr-ui",
    });
    if (ok) {
      resetMutation.mutate();
    }
  };

  const handleDeleteTemplate = async (tpl: SuratTemplateItem) => {
    const ok = await confirmDialog({
      title: "Hapus Template Kustom?",
      description: (
        <div className="space-y-2 pt-1">
          <p className="text-sm text-[var(--ds-fg-muted)]">
            Template <b className="text-[var(--ds-fg)]">{tpl.nama}</b> akan dihapus secara permanen.
          </p>
        </div>
      ),
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger",
      contentModule: "persuratan",
      contentClassName: "psr-ui",
    });
    if (ok) {
      deleteMutation.mutate(tpl.id);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.kategori).filter(Boolean))),
    [templates]
  );
  const categoryKeys = useMemo(() => ["all", ...categories], [categories]);
  const tabs = useKepegawaianTabs(selectedKategori, "Filter kategori template");

  return (
    <div className="psr-ui w-full p-4 md:p-6 space-y-6 text-[var(--ds-fg)]">
      {/* Enterprise Header Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="kpg-support-icon w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
                Pengaturan Template Naskah Dinas
              </h1>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                Konfigurasi template persuratan resmi, kode klasifikasi arsip, dan nomor prefix BKSDA Kalimantan Timur.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              disabled={resetMutation.isPending}
              className="kpg-secondary h-9 px-4 text-xs font-semibold rounded-lg gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bawaan Sistem</span>
            </Button>

            <Button
              size="sm"
              onClick={openCreateModal}
              className="h-9 px-4 text-xs font-semibold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Template</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari template, kode, atau kategori..."
            className="pl-9 h-8 text-xs rounded-lg"
          />
        </div>

        <div
          {...tabs.tabListProps}
          className="kpg-pill-tabs flex items-center flex-wrap gap-1 p-1 rounded-lg w-full lg:w-auto"
        >
          {categoryKeys.map((cat) => {
            const isActive = selectedKategori === cat;
            return (
              <button
                key={cat}
                type="button"
                {...tabs.tabProps(cat)}
                onClick={() => setSelectedKategori(cat)}
                className={cn(
                  "relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap select-none",
                  isActive
                    ? "text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeSuratSettingsTab"
                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{cat === "all" ? `Semua (${templates.length})` : cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] p-4 text-xs text-[var(--ds-status-danger-fg)] shadow-xs">
          <span>Gagal memuat daftar template persuratan dari server.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg"
          >
            Coba lagi
          </Button>
        </div>
      )}

      {/* Templates Table */}
      <div {...tabs.panelProps}>
        <KepegawaianTabContent key={selectedKategori}>
        <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/30 text-[var(--ds-fg-muted)] font-bold uppercase tracking-wider text-xs">
                  <th className="py-3 px-4">Nama Template & Key</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Prefix & Klasifikasi</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--ds-fg-muted)]">
                      Memuat daftar template persuratan...
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--ds-fg-muted)]">
                      Tidak ada template yang sesuai dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-[var(--ds-surface-muted)]/70 transition-colors">
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-[var(--ds-fg)] text-sm">
                          {tpl.nama}
                        </div>
                        <div className="font-mono text-xs text-[var(--ds-fg-muted)] mt-1">
                          key: {tpl.key}
                        </div>
                        {tpl.deskripsi && (
                          <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-1 mt-1">
                            {tpl.deskripsi}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <span className="inline-block px-3 py-1 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] font-medium text-xs whitespace-nowrap">
                          {tpl.kategori || "-"}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-middle">
                        <div className="font-mono text-[var(--ds-fg)] font-semibold">
                          {tpl.nomor_prefix || "S"}
                        </div>
                        <span className="text-xs text-[var(--ds-fg-muted)] block font-mono">
                          {tpl.kode_klasifikasi || "KSA.01.05"}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-middle">
                        {tpl.is_system ? (
                          <Badge variant="outline" className="text-xs bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] rounded-lg">
                            Sistem
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)] rounded-lg">
                            Kustom
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 align-middle text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            tpl.is_active
                              ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]"
                              : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border-transparent"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${tpl.is_active ? "bg-[var(--ds-status-success-fg)]" : "bg-[var(--ds-fg-muted)]"}`} />
                          {tpl.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            aria-label={`Buka generator untuk ${tpl.nama}`}
                            className="h-8 px-2 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] rounded-lg"
                            title="Buka Editor Naskah Dinas dengan Template Ini"
                          >
                            <Link href={`/surat/keluar/dinas?template=${tpl.key}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit template ${tpl.nama}`}
                            onClick={() => openEditModal(tpl)}
                            className="h-8 px-2 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg cursor-pointer"
                            title="Edit Template"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {!tpl.is_system && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Hapus template ${tpl.nama}`}
                              onClick={() => handleDeleteTemplate(tpl)}
                              className="h-8 px-2 text-xs text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-lg cursor-pointer"
                              title="Hapus Template Kustom"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </KepegawaianTabContent>
      </div>

      {/* Create / Edit Template Modal */}
      {modalMode && (
      <KepegawaianDialog
        title={modalMode === "create" ? "Tambah Template Baru" : "Edit Template Naskah"}
        onClose={() => setModalMode(null)}
        busy={createMutation.isPending || updateMutation.isPending}
        module="persuratan"
        className="sm:max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center font-bold">
              <FileBadge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                {modalMode === "create" ? "Tambah Template Baru" : "Edit Template Naskah"}
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                {modalMode === "create" ? "Buat format naskah dinas kustom" : `Mengubah: ${activeItem?.nama}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Tutup dialog template"
            onClick={() => setModalMode(null)}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (modalMode === "create") {
              createMutation.mutate(formData);
            } else if (activeItem) {
              updateMutation.mutate({ id: activeItem.id, data: formData });
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="font-bold text-[var(--ds-fg)] block mb-1">
              Nama Template
            </label>
            <Input
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Surat Izin Masuk Kawasan (SIMAKSI)"
              required
              className="rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">
                Key Identifikasi
              </label>
              <Input
                value={formData.key}
                disabled={modalMode === "edit" && activeItem?.is_system}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                placeholder="contoh: surat_izin_simaksi"
                required
                className="font-mono rounded-lg"
              />
              {modalMode === "edit" && activeItem?.is_system && (
                <span className="text-xs text-[var(--ds-fg-muted)] mt-1 block">Key sistem terkunci</span>
              )}
            </div>

            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">
                Kategori
              </label>
              <Input
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                placeholder="Contoh: Izin & Kepegawaian"
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">
                Prefix Nomor Surat
              </label>
              <Input
                value={formData.nomor_prefix}
                onChange={(e) => setFormData({ ...formData, nomor_prefix: e.target.value })}
                placeholder="Contoh: SI atau S atau ND"
                className="font-mono rounded-lg"
              />
            </div>

            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">
                Kode Klasifikasi Arsip
              </label>
              <Input
                value={formData.kode_klasifikasi}
                onChange={(e) => setFormData({ ...formData, kode_klasifikasi: e.target.value })}
                placeholder="Contoh: PEG.11.01 atau KSA.01.05"
                className="font-mono rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[var(--ds-fg)] block mb-1">
              Deskripsi / Petunjuk Penggunaan
            </label>
            <textarea
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Deskripsi singkat fungsi dan tujuan penggunaan naskah dinas ini..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 text-xs text-[var(--ds-fg)] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="tpl_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded cursor-pointer"
            />
            <label htmlFor="tpl_is_active" className="font-medium text-[var(--ds-fg)] cursor-pointer text-xs">
              Aktifkan template ini dalam menu pilihan Tata Naskah Dinas
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200/70 dark:border-zinc-800 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModalMode(null)}
              className="kpg-secondary rounded-lg"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold rounded-lg"
            >
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan Template"}
            </Button>
          </div>
        </form>
      </KepegawaianDialog>
      )}
    </div>
  );
}
