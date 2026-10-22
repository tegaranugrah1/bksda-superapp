"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  X,
  FileBadge,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("all");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeItem, setActiveItem] = useState<SuratTemplateItem | null>(null);
  const [deleteConfirmItem, setDeleteItem] = useState<SuratTemplateItem | null>(null);

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

  const { data: templates = [], isLoading } = useQuery<SuratTemplateItem[]>({
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
      setDeleteItem(null);
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

  const categories = Array.from(new Set(templates.map((t) => t.kategori).filter(Boolean)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Pengaturan Template Naskah Dinas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Konfigurasi template persuratan resmi, kode klasifikasi arsip, dan nomor prefix BKSDA Kalimantan Timur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Reset seluruh template sistem ke format bawaan resmi Permen Kehutanan?")) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending}
            className="rounded-xl text-xs gap-1.5 cursor-pointer text-zinc-600 dark:text-zinc-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bawaan Sistem</span>
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Template</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari template, kode, atau kategori..."
            className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedKategori("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedKategori === "all"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            Semua ({templates.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedKategori(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedKategori === cat
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Nama Template & Key</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Prefix & Klasifikasi</th>
                <th className="p-3.5">Tipe</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    Memuat daftar template persuratan...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    Tidak ada template yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3.5 align-middle">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {tpl.nama}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400 mt-0.5">
                        key: {tpl.key}
                      </div>
                      {tpl.deskripsi && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {tpl.deskripsi}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 align-middle">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                        {tpl.kategori || "-"}
                      </span>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
                        {tpl.nomor_prefix || "S"}
                      </div>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        {tpl.kode_klasifikasi || "KSA.01.05"}
                      </span>
                    </td>

                    <td className="p-3.5 align-middle">
                      {tpl.is_system ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                          Sistem
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                          Kustom
                        </Badge>
                      )}
                    </td>

                    <td className="p-3.5 align-middle text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tpl.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tpl.is_active ? "bg-emerald-600" : "bg-zinc-400"}`} />
                        {tpl.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl"
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
                          onClick={() => openEditModal(tpl)}
                          className="h-8 px-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        {!tpl.is_system && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteItem(tpl)}
                            className="h-8 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl cursor-pointer"
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

      {/* Create / Edit Template Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <FileBadge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {modalMode === "create" ? "Tambah Template Baru" : "Edit Template Naskah"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {modalMode === "create" ? "Buat format naskah dinas kustom" : `Mengubah: ${activeItem?.nama}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setModalMode(null)} className="h-8 w-8 p-0 rounded-xl">
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
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nama Template
                </label>
                <Input
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Surat Izin Masuk Kawasan (SIMAKSI)"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Key Identifikasi
                  </label>
                  <Input
                    value={formData.key}
                    disabled={modalMode === "edit" && activeItem?.is_system}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    placeholder="contoh: surat_izin_simaksi"
                    required
                    className="font-mono rounded-xl"
                  />
                  {modalMode === "edit" && activeItem?.is_system && (
                    <span className="text-[10px] text-zinc-400">Key sistem terkunci</span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Kategori
                  </label>
                  <Input
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    placeholder="Contoh: Izin & Kepegawaian"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Prefix Nomor Surat
                  </label>
                  <Input
                    value={formData.nomor_prefix}
                    onChange={(e) => setFormData({ ...formData, nomor_prefix: e.target.value })}
                    placeholder="Contoh: SI atau S atau ND"
                    className="font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Kode Klasifikasi Arsip
                  </label>
                  <Input
                    value={formData.kode_klasifikasi}
                    onChange={(e) => setFormData({ ...formData, kode_klasifikasi: e.target.value })}
                    placeholder="Contoh: PEG.11.01 atau KSA.01.05"
                    className="font-mono rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Deskripsi / Petunjuk Penggunaan
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat fungsi dan tujuan penggunaan naskah dinas ini..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tpl_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="tpl_is_active" className="font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer text-xs">
                  Aktifkan template ini dalam menu pilihan Tata Naskah Dinas
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan Template"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Hapus Template Kustom?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Template <b>{deleteConfirmItem.nama}</b> akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteItem(null)} className="rounded-xl">
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteConfirmItem.id)}
                disabled={deleteMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
