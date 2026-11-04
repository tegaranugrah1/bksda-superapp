"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Loader2,
  Clock,
  Briefcase,
  AlertCircle,
  FileCheck2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { errorMessage } from "./utils";

export interface LeaveType {
  id: number;
  nama: string;
  kode: string | null;
  hitung_hari: "hari_kerja" | "hari_kalender";
  potong_kuota_tahunan: boolean;
  maks_hari: number | null;
  keterangan: string | null;
  is_active: boolean;
  urutan: number;
  created_at?: string;
  updated_at?: string;
}

export function LeaveTypesTab() {
  const { canWrite } = useRole();
  const [items, setItems] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [nama, setNama] = useState("");
  const [kode, setKode] = useState("");
  const [hitungHari, setHitungHari] = useState<"hari_kerja" | "hari_kalender">("hari_kalender");
  const [potongKuotaTahunan, setPotongKuotaTahunan] = useState(false);
  const [maksHari, setMaksHari] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [urutan, setUrutan] = useState<number>(1);

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/kepegawaian/leave-types?all=1");
      setItems(res.data?.data || []);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal memuat daftar master jenis cuti"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setNama("");
    setKode("");
    setHitungHari("hari_kalender");
    setPotongKuotaTahunan(false);
    setMaksHari("");
    setKeterangan("");
    setIsActive(true);
    setUrutan(items.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (item: LeaveType) => {
    setEditingItem(item);
    setNama(item.nama);
    setKode(item.kode || "");
    setHitungHari(item.hitung_hari);
    setPotongKuotaTahunan(item.potong_kuota_tahunan);
    setMaksHari(item.maks_hari !== null ? String(item.maks_hari) : "");
    setKeterangan(item.keterangan || "");
    setIsActive(item.is_active);
    setUrutan(item.urutan);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama jenis cuti wajib diisi");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      nama: nama.trim(),
      kode: kode.trim() ? kode.trim().toUpperCase() : null,
      hitung_hari: hitungHari,
      potong_kuota_tahunan: potongKuotaTahunan,
      maks_hari: maksHari !== "" ? parseInt(maksHari, 10) : null,
      keterangan: keterangan.trim() ? keterangan.trim() : null,
      is_active: isActive,
      urutan: Number(urutan) || 0,
    };

    try {
      if (editingItem) {
        await api.put(`/kepegawaian/leave-types/${editingItem.id}`, payload);
        toast.success("Jenis cuti berhasil diperbarui");
      } else {
        await api.post("/kepegawaian/leave-types", payload);
        toast.success("Jenis cuti berhasil ditambahkan");
      }
      closeModal();
      void fetchLeaveTypes();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal menyimpan jenis cuti"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: LeaveType) => {
    if (!canWrite) return;
    try {
      await api.patch(`/kepegawaian/leave-types/${item.id}/toggle-active`);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_active: !it.is_active } : it))
      );
      toast.success(
        item.is_active
          ? `Jenis cuti "${item.nama}" dinonaktifkan`
          : `Jenis cuti "${item.nama}" diaktifkan`
      );
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal mengubah status jenis cuti"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await api.delete(`/kepegawaian/leave-types/${deleteTarget.id}`);
      toast.success("Jenis cuti berhasil dihapus");
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Gagal menghapus jenis cuti"));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        search === "" ||
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="p-4 rounded-2xl bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200 dark:border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Master Jenis Surat Cuti ASN &amp; Pegawai
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              Atur daftar jenis cuti, rumus penghitungan durasi (Hari Kerja / Kalender), aturan pemotongan kuota cuti tahunan, dan batas maksimal permohonan.
            </p>
          </div>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Jenis Cuti
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis cuti, kode, aturan..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Status:
          </span>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterStatus === "all"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterStatus === "active"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Aktif ({items.filter((i) => i.is_active).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("inactive")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterStatus === "inactive"
                  ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Nonaktif ({items.filter((i) => !i.is_active).length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 min-w-[200px]">Jenis Surat Cuti</th>
                <th className="py-3.5 px-4 min-w-[170px]">Perhitungan Hari</th>
                <th className="py-3.5 px-4 min-w-[170px]">Potong Kuota</th>
                <th className="py-3.5 px-4 min-w-[130px]">Batas Maksimal</th>
                <th className="py-3.5 px-4 min-w-[220px]">Ketentuan / Catatan</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                {canWrite && <th className="py-3.5 px-4 w-24 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Memuat data jenis cuti...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                    Tidak ada jenis cuti yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {item.urutan || index + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {item.nama}
                        </span>
                        {item.kode && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                            {item.kode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.hitung_hari === "hari_kerja" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Briefcase className="w-3 h-3" />
                          Hari Kerja (Senin–Jumat)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          <Calendar className="w-3 h-3" />
                          Hari Kalender
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.potong_kuota_tahunan ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <FileCheck2 className="w-3 h-3" />
                          Memotong Hak Tahunan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                          Tidak Memotong Kuota
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.maks_hari ? (
                        <span className="inline-flex items-center gap-1 text-zinc-800 dark:text-zinc-200 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Maks {item.maks_hari} Hari
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Tidak dibatasi</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 max-w-xs truncate" title={item.keterangan || ""}>
                      {item.keterangan || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => void handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          canWrite ? "cursor-pointer" : "cursor-default"
                        } ${
                          item.is_active
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200"
                            : "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-200"
                        }`}
                      >
                        {item.is_active ? (
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="Edit Jenis Cuti"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus Jenis Cuti"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Hapus Jenis Surat Cuti?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Jenis cuti <strong>{deleteTarget.nama}</strong> akan dihapus. Data riwayat cuti pegawai yang sudah ada tetap aman tersimpan.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    {editingItem ? "Edit Jenis Surat Cuti" : "Tambah Jenis Surat Cuti Baru"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Konfigurasi parameter dan aturan penghitungan cuti
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Nama Jenis Cuti <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Cuti Tahunan, Cuti Sakit"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Kode Singkat
                  </label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value.toUpperCase())}
                    placeholder="Contoh: CT, CS"
                    maxLength={10}
                    className="w-full px-3 py-2 text-xs uppercase font-mono rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Rumus Penghitungan Hari */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Rumus Hitung Hari
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      hitungHari === "hari_kerja"
                        ? "border-blue-500 bg-blue-50/40 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200"
                        : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hitungHari"
                      checked={hitungHari === "hari_kerja"}
                      onChange={() => setHitungHari("hari_kerja")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold block flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        Hari Kerja
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight block mt-0.5">
                        Sabtu &amp; Minggu otomatis dilewati (tidak dihitung).
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      hitungHari === "hari_kalender"
                        ? "border-blue-500 bg-blue-50/40 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200"
                        : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hitungHari"
                      checked={hitungHari === "hari_kalender"}
                      onChange={() => setHitungHari("hari_kalender")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold block flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        Hari Kalender
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight block mt-0.5">
                        Dihitung penuh setiap hari berturut-turut.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Potong Kuota Tahunan Switch */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Memotong Kuota Cuti Tahunan?
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                    Aktifkan jika cuti ini mengurangi sisa jatah cuti tahunan pegawai (N, N-1, N-2).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={potongKuotaTahunan}
                  onChange={(e) => setPotongKuotaTahunan(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Batas Maksimal & Urutan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Batas Maksimal Hari (Opsional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={maksHari}
                    onChange={(e) => setMaksHari(e.target.value)}
                    placeholder="Kosongkan jika tak terbatas"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Nomor Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={urutan}
                    onChange={(e) => setUrutan(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Ketentuan / Deskripsi Peraturan
                </label>
                <textarea
                  rows={3}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Keterangan singkat aturan atau persyaratan surat cuti ini..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  Jenis cuti ini aktif dan dapat dipilih oleh pegawai / admin
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem ? "Simpan Perubahan" : "Tambahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
