"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Loader2,
  AlertCircle,
  FileText,
  MapPin,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { errorMessage } from "./utils";

export interface StTaskType {
  id: number;
  nama: string;
  kode: string;
  mode_lokasi: "luar_wilayah" | "dalam_kawasan" | "tempat_saja";
  aturan_durasi: "fleksibel" | "wajib_1_hari";
  default_sertakan_laporan: boolean;
  contoh_format?: string | null;
  keterangan?: string | null;
  urutan: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function TaskTypesTab() {
  const { canWrite } = useRole();
  const [items, setItems] = useState<StTaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<StTaskType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StTaskType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [nama, setNama] = useState("");
  const [kode, setKode] = useState("");
  const [modeLokasi, setModeLokasi] = useState<"luar_wilayah" | "dalam_kawasan" | "tempat_saja">("luar_wilayah");
  const [aturanDurasi, setAturanDurasi] = useState<"fleksibel" | "wajib_1_hari">("fleksibel");
  const [defaultSertakanLaporan, setDefaultSertakanLaporan] = useState(true);
  const [contohFormat, setContohFormat] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [urutan, setUrutan] = useState<number>(1);

  const fetchTaskTypes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/kepegawaian/st-task-types");
      setItems(res.data?.data || []);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal memuat master jenis tugas"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskTypes();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setNama("");
    setKode("");
    setModeLokasi("luar_wilayah");
    setAturanDurasi("fleksibel");
    setDefaultSertakanLaporan(true);
    setContohFormat("Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} dalam rangka {kegiatan} di {tempat}");
    setKeterangan("");
    setIsActive(true);
    setUrutan(items.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (item: StTaskType) => {
    setEditingItem(item);
    setNama(item.nama);
    setKode(item.kode || "");
    setModeLokasi(item.mode_lokasi);
    setAturanDurasi(item.aturan_durasi);
    setDefaultSertakanLaporan(item.default_sertakan_laporan);
    setContohFormat(item.contoh_format || "");
    setKeterangan(item.keterangan || "");
    setIsActive(item.is_active);
    setUrutan(item.urutan);
    setIsModalOpen(true);
  };

  const handleModeLokasiChange = (mode: "luar_wilayah" | "dalam_kawasan" | "tempat_saja") => {
    setModeLokasi(mode);
    if (!editingItem) {
      if (mode === "dalam_kawasan") {
        setContohFormat("Melaksanakan perjalanan dinas di {kota} dalam rangka {kegiatan} di {tempat}");
      } else if (mode === "tempat_saja") {
        setContohFormat("Melaksanakan Kegiatan {kegiatan} pada {tempat} di {kota}");
      } else {
        setContohFormat("Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} dalam rangka {kegiatan} di {tempat}");
      }
    }
  };

  const handleToggleActive = async (item: StTaskType) => {
    if (!canWrite) {
      toast.error("Anda tidak memiliki izin untuk mengubah status.");
      return;
    }
    const nextStatus = !item.is_active;
    try {
      await api.put(`/kepegawaian/st-task-types/${item.id}`, {
        is_active: nextStatus,
      });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_active: nextStatus } : it))
      );
      toast.success(
        `Jenis tugas "${item.nama}" berhasil di-${nextStatus ? "aktifkan" : "nonaktifkan"}.`
      );
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal memperbarui status"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      toast.error("Anda tidak memiliki hak akses untuk menyimpan perubahan.");
      return;
    }

    if (!nama.trim()) {
      toast.error("Nama jenis tugas wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      nama: nama.trim(),
      kode: kode.trim() || undefined,
      mode_lokasi: modeLokasi,
      aturan_durasi: aturanDurasi,
      default_sertakan_laporan: defaultSertakanLaporan,
      contoh_format: contohFormat.trim() || null,
      keterangan: keterangan.trim() || null,
      is_active: isActive,
      urutan: Number(urutan) || 1,
    };

    try {
      if (editingItem) {
        const res = await api.put(`/kepegawaian/st-task-types/${editingItem.id}`, payload);
        const updated = res.data?.data;
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? updated : it)));
        toast.success(`Jenis tugas "${payload.nama}" berhasil diperbarui.`);
      } else {
        const res = await api.post("/kepegawaian/st-task-types", payload);
        const created = res.data?.data;
        setItems((prev) => [...prev, created]);
        toast.success(`Jenis tugas baru "${payload.nama}" berhasil ditambahkan.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal menyimpan jenis tugas"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canWrite) return;
    setIsDeleting(true);
    try {
      await api.delete(`/kepegawaian/st-task-types/${deleteTarget.id}`);
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      toast.success(`Jenis tugas "${deleteTarget.nama}" berhasil dihapus.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal menghapus jenis tugas"));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        it.nama.toLowerCase().includes(search.toLowerCase()) ||
        (it.kode && it.kode.toLowerCase().includes(search.toLowerCase())) ||
        (it.keterangan && it.keterangan.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && it.is_active) ||
        (filterStatus === "inactive" && !it.is_active);

      return matchSearch && matchStatus;
    });
  }, [items, search, filterStatus]);

  const activeCount = useMemo(() => items.filter((it) => it.is_active).length, [items]);

  return (
    <div className="space-y-4">
      {/* Banner Header Identik dengan LeaveTypesTab */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-blue-100 text-[11px] font-semibold tracking-wide">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Master Klasifikasi Penugasan</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Klasifikasi Jenis Surat Tugas
          </h2>
          <p className="text-xs md:text-sm text-blue-100/90 leading-relaxed font-normal">
            Kelola kategori jenis penugasan resmi, mode input lokasi (Luar Wilayah, Dalam Kawasan, Tempat Saja), aturan durasi hari, dan format baku diktum tugas.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jenis Tugas</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis tugas, kode, atau keterangan..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === "all"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === "active"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("inactive")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === "inactive"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Nonaktif ({items.length - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Jenis Tugas</th>
                <th className="py-3 px-4">Mode Input Lokasi</th>
                <th className="py-3 px-4">Aturan Durasi</th>
                <th className="py-3 px-4">Kewajiban Lapor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat master jenis tugas...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-zinc-300">
                      Tidak ada jenis tugas ditemukan
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? "Coba kata kunci pencarian lain." : "Belum ada master jenis tugas yang tersimpan."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {item.urutan || idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white leading-tight">
                        {item.nama}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                          {item.kode}
                        </span>
                        {item.keterangan && (
                          <span className="text-[11px] text-slate-400 truncate max-w-xs">
                            • {item.keterangan}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.mode_lokasi === "dalam_kawasan" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          <MapPin className="w-3 h-3" />
                          Dalam Kawasan / Wilayah
                        </span>
                      ) : item.mode_lokasi === "luar_wilayah" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                          <MapPin className="w-3 h-3" />
                          Luar Wilayah (Dari - Ke)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          <FileText className="w-3 h-3" />
                          Tempat Saja / Internal
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.aturan_durasi === "wajib_1_hari" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                          <Calendar className="w-3 h-3" />
                          Wajib 1 Hari
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                          <Calendar className="w-3 h-3" />
                          Fleksibel (1 s/d N Hari)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.default_sertakan_laporan ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Laporan Wajib (Paling Akhir)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          Opsional
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-slate-200"
                        }`}
                      >
                        {item.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{item.is_active ? "Aktif" : "Nonaktif"}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Edit Jenis Tugas"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Hapus Jenis Tugas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingItem ? "Edit Jenis Tugas" : "Tambah Jenis Tugas Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Konfigurasi nama, pola diktum, dan mode input lokasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Nama Jenis Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Perjalanan Dinas Dalam Kawasan / Wilayah"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Kode Unik / Slug
                  </label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    placeholder="Contoh: dalam_kawasan (opsional)"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-slate-900 dark:text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Otomatis dibuat dari nama jika dikosongkan.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={urutan}
                    onChange={(e) => setUrutan(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Mode Input Lokasi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeLokasiChange("luar_wilayah")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      modeLokasi === "luar_wilayah"
                        ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/20"
                        : "border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="font-bold text-xs">Luar Wilayah</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Rute Dari (Asal) ke (Tujuan)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeLokasiChange("dalam_kawasan")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      modeLokasi === "dalam_kawasan"
                        ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20"
                        : "border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="font-bold text-xs">Dalam Kawasan</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Wilayah Kab/Kota &amp; Kawasan
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeLokasiChange("tempat_saja")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      modeLokasi === "tempat_saja"
                        ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500/20"
                        : "border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="font-bold text-xs">Tempat Saja</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Pada (Tempat) di (Kota)
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Aturan Durasi Tanggal
                  </label>
                  <select
                    value={aturanDurasi}
                    onChange={(e) => setAturanDurasi(e.target.value as "fleksibel" | "wajib_1_hari")}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none font-semibold text-slate-800 dark:text-zinc-200"
                  >
                    <option value="fleksibel">Fleksibel (Bisa 1 hari atau multi-hari)</option>
                    <option value="wajib_1_hari">Wajib 1 Hari (Kunci tanggal mulai = selesai)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Klausul Laporan Default
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={defaultSertakanLaporan}
                      onChange={(e) => setDefaultSertakanLaporan(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Wajib buat laporan tertulis
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Contoh / Pola Format Diktum
                </label>
                <textarea
                  rows={2}
                  value={contohFormat}
                  onChange={(e) => setContohFormat(e.target.value)}
                  placeholder="Contoh format kalimat resmi penugasan..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-slate-900 dark:text-white font-medium resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Keterangan / Catatan Admin
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Deskripsi peruntukan jenis tugas ini (opsional)"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Status Aktif (Tampil di form pengajuan)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingItem ? "Simpan Perubahan" : "Simpan Jenis Tugas"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Jenis Tugas?
              </h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus jenis tugas{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  &quot;{deleteTarget.nama}&quot;
                </span>
                ? Data yang sudah tersimpan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
