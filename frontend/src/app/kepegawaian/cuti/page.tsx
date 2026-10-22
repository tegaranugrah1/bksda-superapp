"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Inbox, Search, Eye, Edit2, Trash2, Printer, Calendar, User, FileText, Check, AlertCircle, X, FileUp, FileCheck,
  ChevronDown, MoreHorizontal, CheckCircle2, Clock, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { calculateMasaKerja } from "../_lib/employee-helpers";
import {
  LeaveRequestItem,
  EditLeaveModal,
  DeleteLeaveModal,
  PrintLeaveModal,
  ApproveLeaveModal,
  UploadScanModal,
  ScanViewerModal,
  CatatSuratIzinModal,
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
  const [approveItem, setApproveItem] = useState<LeaveRequestItem | null>(null);
  const [uploadScanItem, setUploadScanItem] = useState<LeaveRequestItem | null>(null);
  const [viewerModal, setViewerModal] = useState<{ url: string; fileName?: string | null; title?: string } | null>(null);
  const [isCatatModalOpen, setIsCatatModalOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    nomor_pengajuan: "",
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

  // Approve Mutation with Optional Scan Upload & Nomor Surat
  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      nomorSurat,
      fileFormulir,
      fileSuratIzin,
      catatan,
    }: {
      id: number;
      nomorSurat: string;
      fileFormulir: File | null;
      fileSuratIzin: File | null;
      catatan: string;
    }) => {
      const formData = new FormData();
      if (nomorSurat) {
        formData.append("nomor_surat", nomorSurat);
      }
      if (fileFormulir) {
        formData.append("file_scan_formulir", fileFormulir);
      }
      if (fileSuratIzin) {
        formData.append("file_scan_surat_izin", fileSuratIzin);
      }
      if (catatan) {
        formData.append("catatan_atasan", catatan);
      }
      await api.post(`/kepegawaian/leave-requests/${id}/approve`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Pengajuan Cuti berhasil disetujui! Kuota cuti pegawai otomatis terpotong.");
      queryClient.invalidateQueries({ queryKey: ["inboxLeaveRequests"] });
      setApproveItem(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Gagal menyetujui pengajuan cuti.";
      toast.error(msg);
    },
  });

  // Upload or Replace Scan File Mutation
  const uploadScanMutation = useMutation({
    mutationFn: async ({
      id,
      fileFormulir,
      fileSuratIzin,
    }: {
      id: number;
      fileFormulir: File | null;
      fileSuratIzin: File | null;
    }) => {
      const formData = new FormData();
      if (fileFormulir) {
        formData.append("file_scan_formulir", fileFormulir);
      }
      if (fileSuratIzin) {
        formData.append("file_scan_surat_izin", fileSuratIzin);
      }
      await api.post(`/kepegawaian/leave-requests/${id}/upload-scan`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Berkas cuti resmi berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["inboxLeaveRequests"] });
      setUploadScanItem(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Gagal mengunggah berkas scan.";
      toast.error(msg);
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
      nomor_pengajuan: item.nomor_pengajuan || "",
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

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
          <span className="text-xs font-semibold text-slate-500 shrink-0">
            Total <span className="font-bold text-slate-900 dark:text-slate-100">{totalRecords}</span> Data Cuti
          </span>

          <Button
            type="button"
            onClick={() => setIsCatatModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl gap-1.5 h-9 px-3.5 shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Surat Izin
          </Button>
        </div>
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
                  <th className="p-3.5 w-[20%]">Pegawai Pemohon</th>
                  <th className="p-3.5 w-[16%]">Surat & Jenis Cuti</th>
                  <th className="p-3.5 w-[14%]">Masa Pelaksanaan</th>
                  <th className="p-3.5 w-[13%]">Alasan Cuti</th>
                  <th className="p-3.5 w-[14%]">Alamat Selama Cuti</th>
                  <th className="p-3.5 w-[9%] text-center">Status</th>
                  <th className="p-3.5 text-right w-[14%]">Aksi & Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Pegawai Pemohon */}
                    <td className="p-3.5 align-middle">
                      <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {item.employee?.nama_lengkap || "Pegawai"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.employee?.nip}
                      </div>
                      {item.employee?.satuan_kerja && (
                        <div
                          className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-52 mt-0.5"
                          title={item.employee?.satuan_kerja}
                        >
                          {item.employee?.satuan_kerja}
                        </div>
                      )}
                    </td>

                    {/* Surat & Jenis Cuti */}
                    <td className="p-3.5 align-middle">
                      <div className="font-semibold text-blue-700 dark:text-blue-400 leading-snug">
                        {item.jenis_cuti}
                      </div>
                      {item.nomor_pengajuan ? (
                        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md mt-1 inline-block border border-slate-200 dark:border-slate-700 font-medium">
                          {item.nomor_pengajuan}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md mt-1 inline-block border border-amber-200/60 dark:border-amber-900 font-medium">
                          Belum Ada Nomor
                        </span>
                      )}
                    </td>

                    {/* Masa Pelaksanaan */}
                    <td className="p-3.5 align-middle">
                      <div className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                        {item.jumlah_hari} Hari
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 whitespace-nowrap">
                        {item.tanggal_mulai} s/d {item.tanggal_selesai}
                      </span>
                    </td>

                    {/* Alasan Cuti */}
                    <td className="p-3.5 max-w-44 align-middle">
                      {!item.alasan_cuti || item.alasan_cuti.toLowerCase().includes("sisa cuti") ? (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      ) : (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed" title={item.alasan_cuti}>
                          {item.alasan_cuti}
                        </span>
                      )}
                      {item.catatan_atasan && (
                        <div className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800 truncate" title={`Catatan Atasan: ${item.catatan_atasan}`}>
                          <span className="font-semibold">Catatan:</span> {item.catatan_atasan}
                        </div>
                      )}
                    </td>

                    {/* Alamat Selama Cuti */}
                    <td className="p-3.5 max-w-44 align-middle">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block" title={item.alamat_menjalankan_cuti || "-"}>
                        {item.alamat_menjalankan_cuti || "-"}
                      </span>
                    </td>

                    {/* Status Toggle Button */}
                    <td className="p-3.5 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.status === 'DISETUJUI') {
                            toggleStatusMutation.mutate({ id: item.id, newStatus: 'PENGAJUAN' });
                          } else {
                            setApproveItem(item);
                          }
                        }}
                        disabled={toggleStatusMutation.isPending || approveMutation.isPending}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95 border",
                          item.status === 'DISETUJUI'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                        )}
                        title={item.status === 'DISETUJUI' ? "Klik untuk mengembalikan ke status Pengajuan" : "Klik untuk menyetujui pengajuan cuti (opsional berkas scan)"}
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          item.status === 'DISETUJUI' ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                        )} />
                        {item.status === 'DISETUJUI' ? 'Disetujui' : 'Pengajuan'}
                      </button>
                    </td>

                    {/* Aksi & Verifikasi */}
                    <td className="p-3.5 text-right whitespace-nowrap align-middle">
                      {(() => {
                        const hasSuratIzin = !!(item.scan_surat_izin_path || item.scan_surat_path);
                        const hasFormulir = !!item.scan_formulir_path;
                        const uploadedCount = (hasSuratIzin ? 1 : 0) + (hasFormulir ? 1 : 0);

                        return (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Berkas Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 px-2.5 text-xs font-semibold rounded-xl gap-1.5 shadow-2xs transition-all cursor-pointer",
                                    uploadedCount === 2
                                      ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                      : uploadedCount === 1
                                      ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                      : "text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                                  )}
                                  title="Kelola & Lihat Berkas Scan Cuti"
                                >
                                  {uploadedCount === 2 ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : uploadedCount === 1 ? (
                                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  ) : (
                                    <FileUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                  )}
                                  <span>{uploadedCount > 0 ? `Berkas (${uploadedCount})` : "+ Berkas"}</span>
                                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5">
                                  Berkas Resmi Cuti
                                </DropdownMenuLabel>

                                <DropdownMenuItem
                                  disabled={!hasSuratIzin}
                                  onClick={() =>
                                    setViewerModal({
                                      url: `/kepegawaian/leave-requests/${item.id}/scan-surat-izin`,
                                      fileName: item.scan_surat_izin_nama || item.scan_surat_nama,
                                      title: "Surat Izin Cuti Resmi (TTE Kepala Balai)",
                                    })
                                  }
                                  className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileCheck className={cn("w-4 h-4", hasSuratIzin ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                                    <span className={cn("font-medium", !hasSuratIzin && "text-slate-400")}>Surat Izin (TTE)</span>
                                  </div>
                                  {hasSuratIzin ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                      Lihat
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  disabled={!hasFormulir}
                                  onClick={() =>
                                    setViewerModal({
                                      url: `/kepegawaian/leave-requests/${item.id}/scan-formulir`,
                                      fileName: item.scan_formulir_nama,
                                      title: "Scan Formulir Permohonan Cuti (TTD Manual & Cap Balai)",
                                    })
                                  }
                                  className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className={cn("w-4 h-4", hasFormulir ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                                    <span className={cn("font-medium", !hasFormulir && "text-slate-400")}>Formulir (Scan)</span>
                                  </div>
                                  {hasFormulir ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                      Lihat
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                                <DropdownMenuItem
                                  onClick={() => setUploadScanItem(item)}
                                  className="flex items-center gap-2 text-xs py-2 px-2.5 rounded-xl text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer font-semibold"
                                >
                                  <FileUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  <span>{uploadedCount > 0 ? "Unggah Ulang / Kelola Berkas" : "Unggah Berkas Scan"}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 2. View/Print Form */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPrintItem(item)}
                              className="h-8 px-2.5 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
                              title="Lihat / Cetak Hasil Formulir Cuti"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              Form Cuti
                            </Button>

                            {/* 3. More Actions Dropdown Menu (...) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                                  title="Aksi Lainnya"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 p-1 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <DropdownMenuItem
                                  onClick={() => openEditModal(item)}
                                  className="flex items-center gap-2 text-xs py-2 px-2.5 rounded-xl cursor-pointer text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-medium"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit Pengajuan</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                                <DropdownMenuItem
                                  onClick={() => setDeleteItem(item)}
                                  className="flex items-center gap-2 text-xs py-2 px-2.5 rounded-xl cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus Pengajuan</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })()}
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

      {/* Persetujuan Cuti Modal */}
      <ApproveLeaveModal
        item={approveItem}
        isPending={approveMutation.isPending}
        onClose={() => setApproveItem(null)}
        onApprove={(nomorSurat, fileFormulir, fileSuratIzin, catatan) => {
          if (approveItem) {
            approveMutation.mutate({
              id: approveItem.id,
              nomorSurat,
              fileFormulir,
              fileSuratIzin,
              catatan,
            });
          }
        }}
      />

      {/* Upload / Ganti Berkas Scan Cuti Modal */}
      <UploadScanModal
        item={uploadScanItem}
        isPending={uploadScanMutation.isPending}
        onClose={() => setUploadScanItem(null)}
        onUpload={({ fileFormulir, fileSuratIzin }) => {
          if (uploadScanItem) {
            uploadScanMutation.mutate({
              id: uploadScanItem.id,
              fileFormulir,
              fileSuratIzin,
            });
          }
        }}
      />

      {/* Pratinjau Berkas Scan Cuti Modal */}
      <ScanViewerModal
        isOpen={!!viewerModal}
        scanUrl={viewerModal?.url || null}
        fileName={viewerModal?.fileName}
        title={viewerModal?.title}
        onClose={() => setViewerModal(null)}
      />

      {/* Catat Surat Izin Penetapan Cuti Modal */}
      <CatatSuratIzinModal
        isOpen={isCatatModalOpen}
        onClose={() => setIsCatatModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["inboxLeaveRequests"] });
        }}
      />
    </div>
  );
}
