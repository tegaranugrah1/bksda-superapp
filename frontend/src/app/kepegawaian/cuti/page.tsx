"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Inbox, Search, Eye, Edit2, Trash2, Printer, Calendar, User, FileText, Check, AlertCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { calculateMasaKerja } from "../_lib/employee-helpers";
import {
  LeaveRequestItem,
  EditLeaveModal,
  DeleteLeaveModal,
  PrintLeaveModal,
} from "./_components/CutiModals";

export default function InboxSuratCutiPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedYear, selectedStatus, perPage]);

  // Modals state
  const [printItem, setPrintItem] = useState<LeaveRequestItem | null>(null);
  const [editItem, setEditItem] = useState<LeaveRequestItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<LeaveRequestItem | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    jenis_cuti: "Cuti Tahunan",
    alasan_cuti: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    alamat_menjalankan_cuti: "",
    telepon: "",
    masa_kerja: "",
  });

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["inboxLeaveRequests", debouncedSearch, page, perPage, selectedYear, selectedStatus],
    queryFn: async () => {
      const { data } = await api.get(`/kepegawaian/leave-requests`, {
        params: {
          search: debouncedSearch || undefined,
          page,
          per_page: perPage,
          year: selectedYear !== "all" ? selectedYear : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
        },
      });
      return data;
    },
  });

  const list: LeaveRequestItem[] = responseData?.data || (Array.isArray(responseData) ? responseData : []);
  const totalRecords: number = responseData?.total ?? list.length;
  const lastPage: number = responseData?.last_page ?? 1;
  const fromRecord: number = responseData?.from ?? (list.length > 0 ? (page - 1) * perPage + 1 : 0);
  const toRecord: number = responseData?.to ?? (fromRecord + list.length - (list.length > 0 ? 1 : 0));

  // Toggle Status (PENGAJUAN -> DISETUJUI)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: string }) => {
      await api.put(`/kepegawaian/leave-requests/${id}/status`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      if (variables.newStatus === "DISETUJUI") {
        toast.success("Pengajuan Cuti berhasil DISETUJUI! Kuota cuti otomatis terpotong.");
      } else {
        toast.info("Status pengajuan cuti dikembalikan ke PENGAJUAN.");
      }
      queryClient.invalidateQueries({ queryKey: ["inboxLeaveRequests"] });
    },
    onError: () => {
      toast.error("Gagal mengubah status pengajuan.");
    },
  });

  // Edit Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editItem) return;
      await api.put(`/kepegawaian/leave-requests/${editItem.id}`, editForm);
    },
    onSuccess: () => {
      toast.success("Pengajuan Cuti berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["inboxLeaveRequests"] });
      setEditItem(null);
    },
    onError: () => {
      toast.error("Gagal memperbarui pengajuan cuti.");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteItem) return;
      await api.delete(`/kepegawaian/leave-requests/${deleteItem.id}`);
    },
    onSuccess: () => {
      toast.success("Pengajuan Cuti berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["inboxLeaveRequests"] });
      setDeleteItem(null);
    },
    onError: () => {
      toast.error("Gagal menghapus pengajuan cuti.");
    },
  });

  const openEditModal = (item: LeaveRequestItem) => {
    setEditItem(item);
    const defaultMasaKerja = calculateMasaKerja(item.employee?.nip, item.employee?.nama_lengkap);
    setEditForm({
      jenis_cuti: item.jenis_cuti || "Cuti Tahunan",
      alasan_cuti: item.alasan_cuti || "",
      tanggal_mulai: item.tanggal_mulai || "",
      tanggal_selesai: item.tanggal_selesai || "",
      alamat_menjalankan_cuti: item.alamat_menjalankan_cuti || "",
      telepon: item.telepon || "",
      masa_kerja: item.masa_kerja || defaultMasaKerja,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Inbox className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Inbox & Riwayat Surat Cuti Pegawai
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Seluruh riwayat surat penetapan cuti resmi dan pengajuan mandiri dari pegawai BKSDA Kalimantan Timur.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pegawai, NIP, no. surat, jenis cuti..."
              className="pl-9 h-9 text-xs border-slate-200 focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Tahun */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">Semua Tahun</option>
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
              <option value="2024">Tahun 2024</option>
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="DISETUJUI">Disetujui (Resmi)</option>
              <option value="PENGAJUAN">Pengajuan (Pending)</option>
              <option value="DITOLAK">Ditolak</option>
            </select>

            {/* Per Page */}
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
              title="Jumlah baris per halaman"
            >
              <option value={15}>15 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 shrink-0">
          Total <span className="font-bold text-slate-900 dark:text-slate-100">{totalRecords}</span> Data Cuti
        </span>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat riwayat surat cuti...
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Data Cuti</h3>
            <p className="text-xs text-slate-400">Tidak ada data cuti yang sesuai dengan filter pencarian ini.</p>
          </div>
        ) : (
          <div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Pegawai Pemohon</th>
                  <th className="p-3.5">Surat & Jenis Cuti</th>
                  <th className="p-3.5">Masa Pelaksanaan</th>
                  <th className="p-3.5">Alasan Cuti</th>
                  <th className="p-3.5">Alamat Selama Cuti</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi & Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 align-top">
                      <div>{item.employee?.nama_lengkap || "Pegawai"}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.employee?.nip}</div>
                      {item.employee?.satuan_kerja && (
                        <div className="text-[10px] font-normal text-slate-400 truncate max-w-44 mt-0.5">
                          {item.employee?.satuan_kerja}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <div className="font-semibold text-blue-700 dark:text-blue-400">
                        {item.jenis_cuti}
                      </div>
                      {item.nomor_pengajuan ? (
                        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded mt-1 inline-block border border-slate-200 dark:border-slate-700">
                          {item.nomor_pengajuan}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded mt-1 inline-block border border-amber-200/60 dark:border-amber-900">
                          Pengajuan Portal
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.jumlah_hari} Hari</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {item.tanggal_mulai} s/d {item.tanggal_selesai}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-45 text-slate-600 dark:text-slate-400 align-top">
                      {!item.alasan_cuti || item.alasan_cuti.toLowerCase().includes("sisa cuti") ? (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      ) : (
                        <span className="text-[11px]">{item.alasan_cuti}</span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-45 truncate text-slate-600 dark:text-slate-400 align-top">
                      {item.alamat_menjalankan_cuti || "-"}
                    </td>
                    <td className="p-3.5 align-top">
                      <button
                        type="button"
                        onClick={() => {
                          const targetStatus = (item.status === 'DISETUJUI') ? 'PENGAJUAN' : 'DISETUJUI';
                          toggleStatusMutation.mutate({ id: item.id, newStatus: targetStatus });
                        }}
                        disabled={toggleStatusMutation.isPending}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 border",
                          item.status === 'DISETUJUI'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                        )}
                        title="Klik untuk mengubah status (Pengajuan <-> Disetujui)"
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.status === 'DISETUJUI' ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                        )} />
                        {item.status === 'DISETUJUI' ? 'Disetujui' : 'Pengajuan'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap align-top">
                      {/* View/Print Form */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrintItem(item)}
                        className="h-7.5 px-2.5 text-[11px] font-semibold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl gap-1"
                        title="Lihat / Cetak Hasil Formulir Cuti"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Form Cuti
                      </Button>

                      {/* Edit Request */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="h-7.5 px-2.5 text-[11px] font-semibold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-xl gap-1"
                        title="Edit Pengajuan Cuti"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>

                      {/* Delete Request */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteItem(item)}
                        className="h-7.5 px-2.5 text-[11px] font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl gap-1"
                        title="Hapus Pengajuan Cuti"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
              <span className="text-slate-500 text-[11px]">
                Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{fromRecord}</span> - <span className="font-bold text-slate-800 dark:text-slate-200">{toRecord}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{totalRecords}</span> riwayat & surat cuti
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs font-semibold rounded-xl"
                >
                  Sebelumnya
                </Button>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 px-2">
                  Halaman <b className="text-slate-900 dark:text-slate-100">{page}</b> dari <b className="text-slate-900 dark:text-slate-100">{lastPage}</b>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage || isLoading}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="h-8 px-3 text-xs font-semibold rounded-xl"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals Cuti */}
      <EditLeaveModal
        item={editItem}
        editForm={editForm}
        setEditForm={setEditForm}
        isPending={updateMutation.isPending}
        onClose={() => setEditItem(null)}
        onSubmit={() => updateMutation.mutate()}
      />

      <DeleteLeaveModal
        item={deleteItem}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteMutation.mutate()}
      />

      <PrintLeaveModal
        item={printItem}
        onClose={() => setPrintItem(null)}
      />
    </div>
  );
}
