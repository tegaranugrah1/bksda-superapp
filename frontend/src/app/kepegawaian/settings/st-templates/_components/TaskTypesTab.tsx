"use client";

import { DialogTitle } from "@/components/ui/dialog";
import { SuratTugasDialog } from "@/app/surat-tugas/_components/SuratTugasDialog";
import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Italic,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { buildKegiatanDiktumText } from "@/app/kepegawaian/surat-tugas/_lib/activity-helpers";
import { renderFormattedItalic, toggleItalicInTextarea } from "@/lib/letter-utils";
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
  const contohFormatRef = useRef<HTMLTextAreaElement | null>(null);
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-[var(--ds-fg)] rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] text-xs font-semibold tracking-wide">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Master Klasifikasi Penugasan</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Klasifikasi Jenis Surat Tugas
          </h2>
          <p className="text-xs md:text-sm text-[var(--ds-accent-fg)] leading-relaxed font-normal">
            Kelola kategori jenis penugasan resmi, mode input lokasi (Luar Wilayah, Dalam Kawasan, Tempat Saja), aturan durasi hari, dan format baku diktum tugas.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] font-bold text-xs shadow-md transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jenis Tugas</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis tugas, kode, atau keterangan..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] focus:bg-[var(--ds-accent-fg)] text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] transition-colors font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex p-1 bg-[var(--ds-surface-muted)] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === "all"
                  ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-2xs font-bold"
                  : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === "active"
                  ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-2xs font-bold"
                  : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("inactive")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === "inactive"
                  ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-2xs font-bold"
                  : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
              }`}
            >
              Nonaktif ({items.length - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--ds-fg-muted)]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--ds-accent-fg)]" />
                    <span>Memuat master jenis tugas...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--ds-fg-muted)]">
                    <AlertCircle className="w-8 h-8 text-[var(--ds-fg-muted)] mx-auto mb-2" />
                    <p className="font-semibold text-[var(--ds-fg-muted)]">
                      Tidak ada jenis tugas ditemukan
                    </p>
                    <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                      {search ? "Coba kata kunci pencarian lain." : "Belum ada master jenis tugas yang tersimpan."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--ds-surface-muted)] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-[var(--ds-fg-muted)]">
                      {item.urutan || idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--ds-fg)] leading-tight">
                        {item.nama}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                          {item.kode}
                        </span>
                        {item.keterangan && (
                          <span className="text-xs text-[var(--ds-fg-muted)] truncate max-w-xs">
                            • {item.keterangan}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.mode_lokasi === "dalam_kawasan" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]">
                          <MapPin className="w-3 h-3" />
                          Dalam Kawasan / Wilayah
                        </span>
                      ) : item.mode_lokasi === "luar_wilayah" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                          <MapPin className="w-3 h-3" />
                          Luar Wilayah (Dari - Ke)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                          <FileText className="w-3 h-3" />
                          Tempat Saja / Internal
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.aturan_durasi === "wajib_1_hari" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]">
                          <Calendar className="w-3 h-3" />
                          Wajib 1 Hari
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                          <Calendar className="w-3 h-3" />
                          Fleksibel (1 s/d N Hari)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.default_sertakan_laporan ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ds-status-success-fg)]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Laporan Wajib (Paling Akhir)
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--ds-fg-muted)]">
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
                            ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
                            : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
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
                              className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors cursor-pointer"
                              title="Edit Jenis Tugas"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] transition-colors cursor-pointer"
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
        <SuratTugasDialog onClose={() => setIsModalOpen(false)} busy={isSubmitting} className="sm:max-w-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">
                    {editingItem ? "Edit Jenis Tugas" : "Tambah Jenis Tugas Baru"}
                  </DialogTitle>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Konfigurasi nama, pola diktum, dan mode input lokasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Tutup formulir jenis tugas"
                className="w-8 h-8 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                  Nama Jenis Tugas <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Perjalanan Dinas Dalam Kawasan / Wilayah"
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] focus:bg-[var(--ds-accent-fg)] text-[var(--ds-fg)] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                    Kode Unik / Slug
                  </label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    placeholder="Contoh: dalam_kawasan (opsional)"
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] focus:bg-[var(--ds-accent-fg)] text-[var(--ds-fg)] font-mono"
                  />
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Otomatis dibuat dari nama jika dikosongkan.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={urutan}
                    onChange={(e) => setUrutan(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] focus:bg-[var(--ds-accent-fg)] text-[var(--ds-fg)] font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                  Mode Input Lokasi <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeLokasiChange("luar_wilayah")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      modeLokasi === "luar_wilayah"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] ring-1 ring-[var(--ds-accent-soft-border)]"
                        : "border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                    }`}
                  >
                    <div className="font-bold text-xs">Luar Wilayah</div>
                    <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                      Rute Dari (Asal) ke (Tujuan)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeLokasiChange("dalam_kawasan")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      modeLokasi === "dalam_kawasan"
                        ? "border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] ring-1 ring-[var(--ds-status-success-border)]"
                        : "border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                    }`}
                  >
                    <div className="font-bold text-xs">Dalam Kawasan</div>
                    <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                      Wilayah Kab/Kota &amp; Kawasan
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeLokasiChange("tempat_saja")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      modeLokasi === "tempat_saja"
                        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] ring-1 ring-[var(--ds-accent-soft-border)]"
                        : "border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                    }`}
                  >
                    <div className="font-bold text-xs">Tempat Saja</div>
                    <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                      Pada (Tempat) di (Kota)
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                    Aturan Durasi Tanggal
                  </label>
                  <select
                    value={aturanDurasi}
                    onChange={(e) => setAturanDurasi(e.target.value as "fleksibel" | "wajib_1_hari")}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none font-semibold text-[var(--ds-fg)]"
                  >
                    <option value="fleksibel">Fleksibel (Bisa 1 hari atau multi-hari)</option>
                    <option value="wajib_1_hari">Wajib 1 Hari (Kunci tanggal mulai = selesai)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                    Klausul Laporan Default
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={defaultSertakanLaporan}
                      onChange={(e) => setDefaultSertakanLaporan(e.target.checked)}
                      className="rounded text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)]"
                    />
                    <span className="text-xs font-medium text-[var(--ds-fg-muted)]">
                      Wajib buat laporan tertulis
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[var(--ds-fg)]">
                    Pola Format Diktum (Kalimat Untuk — Butir 1)
                  </label>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (contohFormatRef.current) {
                        toggleItalicInTextarea(contohFormatRef.current, contohFormat, setContohFormat);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-0.5 font-serif text-xs font-semibold text-[var(--ds-fg-muted)] shadow-2xs hover:bg-[var(--ds-surface-muted)] cursor-pointer"
                    title="Blok teks lalu klik ini atau tekan Ctrl+I untuk memiringkan (*kata*)"
                  >
                    <Italic className="h-3 w-3 text-[var(--ds-accent-fg)]" />
                    <span className="italic font-bold">Miringkan (*I*)</span>
                  </button>
                </div>

                {/* Preset Pola Cepat */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)]">
                    Pola Cepat:
                  </span>
                  {[
                    {
                      label: "Luar Wilayah (Standar)",
                      mode: "luar_wilayah" as const,
                      pattern:
                        "Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} dalam rangka {kegiatan} di {tempat}",
                    },
                    {
                      label: "Luar Wilayah + Untuk Kegiatan",
                      mode: "luar_wilayah" as const,
                      pattern:
                        "Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {untuk} dalam rangka {kegiatan} di {tempat}",
                    },
                    {
                      label: "Dalam Kawasan",
                      mode: "dalam_kawasan" as const,
                      pattern:
                        "Melaksanakan perjalanan dinas di {kota} dalam rangka {kegiatan} di {tempat}",
                    },
                    {
                      label: "Tempat Saja / Kegiatan",
                      mode: "tempat_saja" as const,
                      pattern: "Melaksanakan Kegiatan {kegiatan} pada {tempat} di {kota}",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setModeLokasi(preset.mode);
                        setContohFormat(preset.pattern);
                      }}
                      className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:border-[var(--ds-accent-soft-border)] hover:text-[var(--ds-accent-fg)] cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={contohFormatRef}
                  rows={2}
                  value={contohFormat}
                  onChange={(e) => setContohFormat(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                      e.preventDefault();
                      if (contohFormatRef.current) {
                        toggleItalicInTextarea(contohFormatRef.current, contohFormat, setContohFormat);
                      }
                    }
                  }}
                  placeholder="Contoh: Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {untuk} dalam rangka {kegiatan} di {tempat}"
                  className="w-full px-3.5 py-2 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] text-[var(--ds-fg)] font-mono resize-none"
                />

                {/* Tombol Sisipkan Placeholder */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">
                    Sisipkan Placeholder:
                  </span>
                  {[
                    { tag: "{asal}", desc: "Kota Asal (contoh: Samarinda)" },
                    { tag: "{tujuan}", desc: "Kota/Kabupaten Tujuan" },
                    { tag: "{untuk}", desc: "Untuk Jenis Kegiatan (sebelum dalam rangka)" },
                    { tag: "{kegiatan}", desc: "Dalam Rangka / Nama Kegiatan" },
                    { tag: "{paket}", desc: "Nama Paket Kontrak / Pekerjaan (setelah dalam rangka)" },
                    { tag: "{tempat}", desc: "Tempat / Kawasan Spesifik" },
                    { tag: "{kota}", desc: "Kota/Kabupaten Lokasi" },
                  ].map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() =>
                        setContohFormat((prev) =>
                          prev ? `${prev}${prev.endsWith(" ") ? "" : " "}${chip.tag}` : chip.tag
                        )
                      }
                      className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] cursor-pointer"
                      title={chip.desc}
                    >
                      + {chip.tag}
                    </button>
                  ))}
                </div>

                {/* Info Koneksi Otomatis ke /surat-tugas & Builder */}
                <div className="text-xs text-[var(--ds-fg-muted)] space-y-1 pt-1 border-t border-[var(--ds-accent-soft-border)] leading-relaxed">
                  <p>
                    • <b>Otomatis Terkoneksi ke Form Publik (<code>/surat-tugas</code>) &amp; Builder:</b> Jika pola mengandung{" "}
                    <code className="px-1 py-0.5 rounded bg-[var(--ds-surface)] border font-mono text-[var(--ds-accent-fg)]">{"{untuk}"}</code>, sistem otomatis memunculkan kolom input{" "}
                    <b>&quot;Untuk (Jenis Kegiatan / Tugas)&quot;</b> sebelum <i>dalam rangka</i>.
                  </p>
                  <p>
                    • Keterangan durasi waktu (<i>&quot;, selama X (...) hari terhitung mulai tanggal ...;&quot;</i>) selalu ditambahkan otomatis di akhir kalimat Butir 1.
                  </p>
                </div>

                {/* Live Preview Kalimat Untuk Butir 1 */}
                <div className="p-2.5 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)] space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--ds-accent-fg)] block">
                    Pratinjau Hasil Kalimat Untuk (Butir 1):
                  </span>
                  <p className="text-xs font-serif text-[var(--ds-fg)] leading-relaxed">
                    <b className="mr-1.5">1.</b>
                    {renderFormattedItalic(
                      `${buildKegiatanDiktumText({
                        modeLokasi,
                        jenisTugas: nama || "Perjalanan Dinas Luar Wilayah",
                        kotaAsal: "Samarinda",
                        kotaTujuan: "Kabupaten Kutai Barat",
                        tempatSpesifik: "Suaka Badak Kelian Kabupaten Kutai Barat",
                        untukKegiatanText: "Pemeriksaan Pekerjaan",
                        namaKegiatanText:
                          "Pengelolaan Kontrak Pekerjaan Konstruksi Pembangunan Sarana dan Prasarana Tahun 2026",
                        contohFormat: contohFormat.trim() || null,
                      })}${
                        aturanDurasi === "wajib_1_hari"
                          ? ", selama 1 (satu) hari pada tanggal 15 September 2026;"
                          : ", selama 3 (tiga) hari terhitung mulai tanggal 15 September sampai dengan 17 September 2026;"
                      }`
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)]">
                  Keterangan / Catatan Admin
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Deskripsi peruntukan jenis tugas ini (opsional)"
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] focus:bg-[var(--ds-accent-fg)] text-[var(--ds-fg)] font-medium"
                />
              </div>

              <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-fg)]"
                  />
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)]">
                    Status Aktif (Tampil di form pengajuan)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer st-primary"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingItem ? "Simpan Perubahan" : "Simpan Jenis Tugas"}</span>
                  </button>
                </div>
              </div>
            </form>
        </SuratTugasDialog>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <SuratTugasDialog onClose={() => setDeleteTarget(null)} busy={isDeleting} className="sm:max-w-md">
            <div className="w-12 h-12 rounded-xl bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">
                Hapus Jenis Tugas?
              </DialogTitle>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Apakah Anda yakin ingin menghapus jenis tugas{" "}
                <span className="font-bold text-[var(--ds-fg)]">
                  &quot;{deleteTarget.nama}&quot;
                </span>
                ? Data yang sudah tersimpan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer st-danger"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
        </SuratTugasDialog>
      )}
    </div>
  );
}
