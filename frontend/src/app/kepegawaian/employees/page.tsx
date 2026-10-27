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
  Eye,
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

const VALID_JENIS = new Set(["PNS", "PPPK", "MMP"]);
const VALID_STATUS = new Set(["all", "active", "inactive", "trashed"]);

function getInitials(name?: string): string {
  if (!name) return "PG";
  const parts = name
    .replace(/[^a-zA-Z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "PG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
    const qJenis = params.get("jenis")?.toUpperCase() ?? "";
    const qWilayah = params.get("wilayah")?.trim() ?? "";
    const qStatus = params.get("status")?.toLowerCase() ?? "";

    if (VALID_JENIS.has(qJenis)) setJenisFilter(qJenis);
    if (qWilayah) setWilayahFilter(qWilayah);
    if (VALID_STATUS.has(qStatus) && (qStatus !== "trashed" || canWrite)) {
      setStatusFilter(qStatus);
    }
  }, [canWrite]);

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

  const isTrashedView = canWrite && statusFilter === "trashed";
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

  const statCards = [
    {
      key: "TOTAL",
      label: "Total Pegawai",
      subtitle: "Personil Aktif",
      count: counts.total,
      icon: Users,
      active: !isTrashedView && jenisFilter === "",
      activeClass: "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-sm",
      hoverClass: "hover:border-slate-300 dark:hover:border-zinc-700",
      iconBadgeClass: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
      onClick: () => {
        setJenisFilter("");
        setStatusFilter("all");
        setPage(1);
      },
    },
    {
      key: "PNS",
      label: "Pegawai PNS",
      subtitle: "ASN pemilik NIP",
      count: counts.pns,
      icon: ShieldCheck,
      active: !isTrashedView && jenisFilter === "PNS",
      activeClass: "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20",
      hoverClass: "hover:border-blue-300 dark:hover:border-blue-800",
      iconBadgeClass: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
      onClick: () => {
        setJenisFilter("PNS");
        if (isTrashedView) setStatusFilter("all");
        setPage(1);
      },
    },
    {
      key: "PPPK",
      label: "Pegawai PPPK",
      subtitle: "ASN pemilik NIPPPK",
      count: counts.pppk,
      icon: Briefcase,
      active: !isTrashedView && jenisFilter === "PPPK",
      activeClass: "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20",
      hoverClass: "hover:border-amber-300 dark:hover:border-amber-800",
      iconBadgeClass: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
      onClick: () => {
        setJenisFilter("PPPK");
        if (isTrashedView) setStatusFilter("all");
        setPage(1);
      },
    },
    {
      key: "MMP",
      label: "Personil MMP",
      subtitle: "Masyarakat Mitra Polhut",
      count: counts.mmp,
      icon: UserCheck,
      active: !isTrashedView && jenisFilter === "MMP",
      activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20",
      hoverClass: "hover:border-emerald-300 dark:hover:border-emerald-800",
      iconBadgeClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
      onClick: () => {
        setJenisFilter("MMP");
        if (isTrashedView) setStatusFilter("all");
        setPage(1);
      },
    },
    ...(canWrite
      ? [
          {
            key: "TRASHED",
            label: "Data Terhapus",
            subtitle: "Arsip / Sampah",
            count: counts.trashed,
            icon: Trash2,
            active: isTrashedView,
            activeClass: "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20",
            hoverClass: "hover:border-rose-300 dark:hover:border-rose-800",
            iconBadgeClass: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
            onClick: () => {
              setStatusFilter(isTrashedView ? "all" : "trashed");
              setPage(1);
            },
          },
        ]
      : []),
  ];

  return (
    <div className="p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100">
      {/* 1. Unified Clean Enterprise Header Bar */}
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

      {/* 2. Clickable Summary Stat Cards (Data-driven Ponytail + Clean Enterprise Pro Max) */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${
          canWrite ? "lg:grid-cols-5" : "lg:grid-cols-4"
        } gap-3`}
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                card.active
                  ? card.activeClass
                  : `bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80 shadow-2xs ${card.hoverClass}`
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    card.active ? "opacity-85" : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  {card.label}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    card.active ? "bg-white/20 text-current" : card.iconBadgeClass
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-1.5">{card.count}</p>
              <p
                className={`text-[11px] mt-0.5 truncate ${
                  card.active ? "opacity-80" : "text-slate-500 dark:text-zinc-400"
                }`}
              >
                {card.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nama, NIP/NIPPPK, Jabatan, Satker..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                title="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
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
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Wilayah &amp; Satuan Kerja</option>
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
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Pegawai</option>
              <option value="active">Status: Aktif</option>
              <option value="inactive">Status: Non-Aktif</option>
              {canWrite && <option value="trashed">Data Terhapus ({counts.trashed})</option>}
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                title="Reset Filter"
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {isTrashedView && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
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

      {/* 4. Table Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-3.5">Profil Pegawai</th>
                <th className="px-6 py-3.5">NIP / NIPPPK / Kategori</th>
                <th className="px-6 py-3.5">Jabatan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-rose-500 font-medium">
                    Gagal memuat data pegawai.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    {isTrashedView
                      ? "Tidak ada data pegawai di tempat sampah."
                      : "Tidak ada pegawai ditemukan sesuai filter."}
                  </td>
                </tr>
              ) : (
                data?.data.map((emp) => {
                  const mmp = isMmpEmployee(emp);
                  const pppk = !mmp && isPppk(emp);
                  const avatarTone = mmp
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20"
                    : pppk
                    ? "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20"
                    : "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20";

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border text-xs font-bold flex items-center justify-center shrink-0 ${avatarTone}`}
                          >
                            {getInitials(emp.nama_lengkap)}
                          </div>
                          <div className="min-w-0">
                            {isTrashedView ? (
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {emp.nama_lengkap}
                              </p>
                            ) : (
                              <Link href={`/kepegawaian/employees/${emp.id}`}>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer truncate">
                                  {emp.nama_lengkap}
                                </p>
                              </Link>
                            )}
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                              {emp.satuan_kerja || "Satuan Kerja Belum Diatur"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600 dark:text-zinc-400">
                        {mmp ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              MMP
                            </span>
                            <span className="text-slate-400">Mitra Polhut</span>
                          </span>
                        ) : pppk ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              NIPPPK
                            </span>
                            <span>{emp.nip}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              NIP
                            </span>
                            <span>{emp.nip}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
                        {emp.jabatan || "-"}
                      </td>
                      <td className="px-6 py-3.5">
                        {isTrashedView ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50">
                            Terhapus
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              emp.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800/50"
                                : "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-800/50"
                            }`}
                          >
                            {emp.is_active ? "Aktif" : "Non-Aktif"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTrashedView ? (
                            canWrite && (
                              <>
                                <button
                                  type="button"
                                  disabled={restoringId === emp.id}
                                  onClick={() => executeRestore(emp)}
                                  title="Pulihkan Pegawai"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{restoringId === emp.id ? "..." : "Pulihkan"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setForceDeleteItem(emp)}
                                  title="Hapus Permanen"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200/60 dark:border-rose-800/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
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
                                className="p-2 bg-slate-50 hover:bg-blue-50 dark:bg-zinc-800/70 dark:hover:bg-blue-500/15 border border-slate-200/70 dark:border-zinc-700/70 rounded-xl text-slate-600 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {canManageAccess && (
                                <button
                                  type="button"
                                  title="Kelola Hak Akses"
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setAccessSheetOpen(true);
                                  }}
                                  className="p-2 bg-slate-50 hover:bg-amber-50 dark:bg-zinc-800/70 dark:hover:bg-amber-500/15 border border-slate-200/70 dark:border-zinc-700/70 rounded-xl text-slate-600 hover:text-amber-600 dark:text-zinc-300 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                >
                                  <UserCog className="w-4 h-4" />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteItem(emp)}
                                  title="Hapus Pegawai"
                                  className="p-2 bg-slate-50 hover:bg-rose-50 dark:bg-zinc-800/70 dark:hover:bg-rose-500/15 border border-slate-200/70 dark:border-zinc-700/70 rounded-xl text-slate-600 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && (
          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-800/20">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Tampilkan:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="10">10 baris</option>
                  <option value="20">20 baris</option>
                  <option value="50">50 baris</option>
                  <option value="all">Semua ({totalItems})</option>
                </select>
              </div>
              <p className="text-[11px] font-bold text-slate-500">
                Menampilkan <span className="text-slate-900 dark:text-white">{startItem}–{endItem}</span> dari{" "}
                <span className="text-slate-900 dark:text-white">{totalItems}</span> pegawai (Halaman {page} dari {data.meta.last_page})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                disabled={page >= data.meta.last_page}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Soft Delete */}
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
