"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  UserCog,
  Trash2,
  Users,
  Inbox,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Briefcase,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmployeeAccessSheet } from "../_components/EmployeeAccessSheet";
import { useRole } from "@/hooks/useRole";
import { isPppk } from "@/lib/letter-utils";
import { isMmpEmployee, SATUAN_KERJA_OPTIONS, type Employee } from "../_lib";

interface EmployeeCounts {
  total: number;
  pns: number;
  pppk: number;
  mmp: number;
  trashed: number;
}

interface ApiResponse {
  data: Employee[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    counts?: EmployeeCounts;
  };
}

export default function EmployeeListPage() {
  const { canWrite, canManageAccess } = useRole();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<string>("10");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jenisFilter, setJenisFilter] = useState<string>("");
  const [wilayahFilter, setWilayahFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qJenis = params.get("jenis");
    const qWilayah = params.get("wilayah");
    const qStatus = params.get("status");
    if (qJenis) setJenisFilter(qJenis.toUpperCase());
    if (qWilayah) setWilayahFilter(qWilayah);
    if (qStatus) setStatusFilter(qStatus);
  }, []);

  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    nip: string;
    nama_lengkap: string;
  } | null>(null);
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);

  const [deleteItem, setDeleteItem] = useState<Employee | null>(null);
  const [forceDeleteItem, setForceDeleteItem] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
  };

  const executeDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/kepegawaian/employees/${deleteItem.id}`);
      toast.success(`Pegawai "${deleteItem.nama_lengkap}" dipindahkan ke Data Terhapus.`);
      invalidateAll();
      setDeleteItem(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus data pegawai.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeRestore = async (emp: Employee) => {
    setRestoringId(emp.id);
    try {
      await api.post(`/kepegawaian/employees/${emp.id}/restore`);
      toast.success(`Data pegawai "${emp.nama_lengkap}" berhasil dipulihkan!`);
      invalidateAll();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal memulihkan data pegawai.";
      toast.error(msg);
    } finally {
      setRestoringId(null);
    }
  };

  const executeForceDelete = async () => {
    if (!forceDeleteItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/kepegawaian/employees/${forceDeleteItem.id}/force`);
      toast.success(`Data pegawai "${forceDeleteItem.nama_lengkap}" dihapus permanen!`);
      invalidateAll();
      setForceDeleteItem(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus permanen data pegawai.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employees", page, perPage, debouncedSearch, jenisFilter, wilayahFilter, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/kepegawaian/employees`, {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          jenis_pegawai: jenisFilter || undefined,
          wilayah: wilayahFilter || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      });
      return data;
    },
    staleTime: 30000,
  });

  const counts = data?.meta?.counts ?? {
    total: data?.meta?.total ?? 0,
    pns: 0,
    pppk: 0,
    mmp: 0,
    trashed: 0,
  };

  const isTrashedView = statusFilter === "trashed";
  const hasActiveFilter =
    Boolean(searchInput) ||
    Boolean(jenisFilter) ||
    Boolean(wilayahFilter) ||
    statusFilter !== "all";

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setJenisFilter("");
    setWilayahFilter("");
    setStatusFilter("all");
    setPage(1);
  };

  const totalItems = data?.meta?.total ?? 0;
  const currentPerPage = data?.meta?.per_page ?? 10;
  const startItem = totalItems === 0 ? 0 : (page - 1) * currentPerPage + 1;
  const endItem = Math.min(page * currentPerPage, totalItems);

  return (
    <div className="p-5 md:p-7 space-y-5">
      {/* Unified Clean Enterprise Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              SDM &amp; Kepegawaian
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Daftar Pegawai
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Kelola informasi personil PNS, PPPK, MMP, dan hak akses sistem.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/kepegawaian/cuti">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Inbox className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Inbox Surat Cuti</span>
            </button>
          </Link>
          {canWrite && (
            <Link href="/kepegawaian/employees/create">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pegawai</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Clickable Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => {
            setJenisFilter("");
            setStatusFilter("all");
            setPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            !isTrashedView && jenisFilter === ""
              ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-md"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              Total Pegawai
            </span>
            <Users className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.total}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Personil Aktif</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setJenisFilter("PNS");
            if (isTrashedView) setStatusFilter("all");
            setPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            !isTrashedView && jenisFilter === "PNS"
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-75">
              Pegawai PNS
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.pns}</p>
          <p className="text-[11px] opacity-70 mt-0.5">ASN pemilik NIP</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setJenisFilter("PPPK");
            if (isTrashedView) setStatusFilter("all");
            setPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            !isTrashedView && jenisFilter === "PPPK"
              ? "bg-amber-500 text-white border-amber-500 shadow-md"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-75">
              Pegawai PPPK
            </span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.pppk}</p>
          <p className="text-[11px] opacity-70 mt-0.5">ASN pemilik NIPPPK</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setJenisFilter("MMP");
            if (isTrashedView) setStatusFilter("all");
            setPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            !isTrashedView && jenisFilter === "MMP"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-75">
              Personil MMP
            </span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.mmp}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Mitra Polhut (Tanpa NIP)</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(isTrashedView ? "all" : "trashed");
            setPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            isTrashedView
              ? "bg-rose-600 text-white border-rose-600 shadow-md"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-75">
              Data Terhapus
            </span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.trashed}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Arsip / Sampah</p>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari Nama, NIP/NIPPPK, Jabatan, Satker..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Kategori */}
          <div className="md:col-span-2">
            <select
              value={jenisFilter}
              onChange={(e) => {
                setJenisFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              <option value="PNS">PNS ({counts.pns})</option>
              <option value="PPPK">PPPK / P3K ({counts.pppk})</option>
              <option value="MMP">MMP ({counts.mmp})</option>
            </select>
          </div>

          {/* Filter Wilayah / Satker */}
          <div className="md:col-span-4">
            <select
              value={wilayahFilter}
              onChange={(e) => {
                setWilayahFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Wilayah & Satuan Kerja</option>
              <optgroup label="Wilayah Utama">
                <option value="BALAI">Kantor Balai KSDA (Samarinda)</option>
                <option value="SKW_1">Seksi KSDA Wilayah I Berau</option>
                <option value="SKW_2">Seksi KSDA Wilayah II Tenggarong</option>
                <option value="SKW_3">Seksi KSDA Wilayah III Balikpapan</option>
              </optgroup>
              <optgroup label="Spesifik Satker / Resor">
                {SATUAN_KERJA_OPTIONS.map((satker) => (
                  <option key={satker} value={satker}>
                    {satker}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Filter Status */}
          <div className="md:col-span-2 flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Pegawai</option>
              <option value="active">Status: Aktif</option>
              <option value="inactive">Status: Non-Aktif</option>
              <option value="trashed">Data Terhapus ({counts.trashed})</option>
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                title="Reset Filter"
                className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {isTrashedView && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
            <span>
              Menampilkan <strong>Data Pegawai Terhapus (Soft Delete)</strong>. Anda dapat memulihkan pegawai kembali ke daftar aktif atau menghapusnya secara permanen.
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
              className="font-bold underline ml-4 shrink-0 cursor-pointer"
            >
              Kembali ke Daftar Aktif
            </button>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Profil Pegawai</th>
                <th className="px-6 py-4">NIP / NIPPPK / Status</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                    Gagal memuat data pegawai.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    {isTrashedView
                      ? "Tidak ada data pegawai di tempat sampah."
                      : "Tidak ada pegawai ditemukan sesuai filter."}
                  </td>
                </tr>
              ) : (
                data?.data.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      {isTrashedView ? (
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {emp.nama_lengkap}
                        </p>
                      ) : (
                        <Link href={`/kepegawaian/employees/${emp.id}`}>
                          <p className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors cursor-pointer">
                            {emp.nama_lengkap}
                          </p>
                        </Link>
                      )}
                      <p className="text-[11px] text-zinc-500">
                        {emp.satuan_kerja || "Satuan Kerja Belum Diatur"}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {isMmpEmployee(emp) ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            MMP
                          </span>
                          <span className="text-zinc-400">-</span>
                        </span>
                      ) : isPppk(emp) ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            NIPPPK
                          </span>
                          {emp.nip}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                            NIP
                          </span>
                          {emp.nip}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                      {emp.jabatan || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {isTrashedView ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                          Terhapus
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            emp.is_active
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {emp.is_active ? "Aktif" : "Non-Aktif"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isTrashedView ? (
                          canWrite && (
                            <>
                              <button
                                type="button"
                                disabled={restoringId === emp.id}
                                onClick={() => executeRestore(emp)}
                                title="Pulihkan Pegawai"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{restoringId === emp.id ? "..." : "Pulihkan"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setForceDeleteItem(emp)}
                                title="Hapus Permanen"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Permanen</span>
                              </button>
                            </>
                          )
                        ) : (
                          <>
                            <Link
                              href={`/kepegawaian/employees/${emp.id}`}
                              title="Lihat Detail Pegawai"
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600"
                            >
                              <Search className="w-4 h-4" />
                            </Link>
                            {canManageAccess && (
                              <button
                                type="button"
                                title="Kelola Hak Akses"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setAccessSheetOpen(true);
                                }}
                                className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-amber-600 cursor-pointer"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            )}
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => setDeleteItem(emp)}
                                title="Hapus Pegawai"
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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

        {/* Pagination Footer */}
        {data && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-800/20">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-500">Tampilkan:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="10">10 baris</option>
                  <option value="20">20 baris</option>
                  <option value="50">50 baris</option>
                  <option value="all">Semua ({totalItems})</option>
                </select>
              </div>
              <p className="text-[11px] font-bold text-zinc-500">
                Menampilkan <span className="text-zinc-900 dark:text-white">{startItem}–{endItem}</span> dari{" "}
                <span className="text-zinc-900 dark:text-white">{totalItems}</span> pegawai (Halaman {page} dari {data.meta.last_page})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                disabled={page >= data.meta.last_page}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Soft Delete (mirip /kepegawaian/cuti) */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Konfirmasi Hapus Data Pegawai
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data pegawai{" "}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {deleteItem.nama_lengkap}
                </span>
                ? Data akan dipindahkan ke tab <strong>Data Terhapus</strong> dan akun akses sistemnya dinonaktifkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={isDeleting}>
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={executeDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Pegawai"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Force Delete (Hapus Permanen) */}
      {forceDeleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Hapus Permanen Data Pegawai
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini <strong>tidak dapat dibatalkan</strong>. Data pegawai{" "}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {forceDeleteItem.nama_lengkap}
                </span>
                , akun login terkait, serta foto profil di RustFS akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setForceDeleteItem(null)} disabled={isDeleting}>
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={executeForceDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {canManageAccess && (
        <EmployeeAccessSheet
          employee={selectedEmployee}
          open={accessSheetOpen}
          onOpenChange={setAccessSheetOpen}
        />
      )}
    </div>
  );
}
