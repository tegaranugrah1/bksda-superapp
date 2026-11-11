"use client";

import { KepegawaianTabContent } from "../_components/KepegawaianTabContent";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
  UserX,
  Eye,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EmployeeAccessSheet } from "../_components/EmployeeAccessSheet";
import { useRole } from "@/hooks/useRole";
import { motion, AnimatePresence } from "framer-motion";
import { isPppk } from "@/lib/letter-utils";
import { isMmpEmployee, SATUAN_KERJA_OPTIONS, type Employee } from "../_lib";

interface EmployeeCounts {
  total: number;
  active?: number;
  scheduled?: number;
  pensiun?: number;
  inactive?: number;
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
const VALID_STATUS = new Set(["all", "active", "scheduled", "pensiun", "inactive", "trashed"]);

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
  const [statusFilter, setStatusFilter] = useState<string>("active");

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
  const accessTriggerRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useConfirm();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
  };

  const handleSoftDelete = async (emp: Employee) => {
    const ok = await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
      title: "Hapus Data Pegawai?",
      description: `Pindahkan data pegawai "${emp.nama_lengkap}" ke Data Terhapus? Akun akses sistemnya akan dinonaktifkan.`,
      confirmText: "Hapus Pegawai",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/kepegawaian/employees/${emp.id}`);
      toast.success(`Data pegawai "${emp.nama_lengkap}" berhasil dipindahkan ke Data Terhapus.`);
      invalidateAll();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus data pegawai.";
      toast.error(msg);
    }
  };

  const handleRestore = async (emp: Employee) => {
    const ok = await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
      title: "Pulihkan Data Pegawai?",
      description: `Pulihkan data pegawai "${emp.nama_lengkap}"? Aktivasi akun aplikasi diatur terpisah oleh Super Admin melalui Manajemen Hak Akses.`,
      confirmText: "Pulihkan Pegawai",
      variant: "info",
    });
    if (!ok) return;

    setRestoringId(emp.id);
    try {
      await api.post(`/kepegawaian/employees/${emp.id}/restore`);
      toast.success(`Data pegawai "${emp.nama_lengkap}" berhasil dipulihkan.`);
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

  const handleForceDelete = async (emp: Employee) => {
    const ok = await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
      title: "Hapus Permanen Data Pegawai?",
      description: `Tindakan ini tidak dapat dibatalkan. Data pegawai "${emp.nama_lengkap}", akun login, dan berkas terkait akan dihapus secara permanen.`,
      confirmText: "Hapus Permanen",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/kepegawaian/employees/${emp.id}/force`);
      toast.success(`Data pegawai "${emp.nama_lengkap}" berhasil dihapus permanen.`);
      invalidateAll();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus permanen data pegawai.";
      toast.error(msg);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, isPlaceholderData, isFetching, refetch } = useQuery({
    queryKey: ["employees", page, perPage, debouncedSearch, jenisFilter, wilayahFilter, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/kepegawaian/employees`, {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          jenis_pegawai: jenisFilter || undefined,
          wilayah: wilayahFilter || undefined,
          status: statusFilter,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  const counts: EmployeeCounts = data?.meta?.counts ?? {
    total: 0,
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
    statusFilter !== "active";

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setJenisFilter("");
    setWilayahFilter("");
    setStatusFilter("active");
    setPage(1);
  };

  const totalItems = data?.meta?.total ?? 0;
  const currentPerPage = data?.meta?.per_page ?? 10;
  const startItem = totalItems === 0 ? 0 : (page - 1) * currentPerPage + 1;
  const endItem = Math.min(page * currentPerPage, totalItems);

  const statCards = [
    {
      key: "ACTIVE",
      label: "Pegawai Aktif",
      subtitle: "Personil Aktif",
      count: counts.active ?? counts.total,
      icon: Users,
      active: !isTrashedView && statusFilter === "active" && jenisFilter === "",
      activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-fg)] border-[var(--ds-accent-fg)]",
      hoverClass: "hover:border-[var(--ds-border-subtle)] ",
      iconBadgeClass: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]  ",
      onClick: () => {
        setJenisFilter("");
        setStatusFilter("active");
        setPage(1);
      },
    },
    {
      key: "PNS",
      label: "Pegawai PNS",
      subtitle: "ASN aktif pemilik NIP",
      count: counts.pns,
      icon: ShieldCheck,
      active: !isTrashedView && statusFilter === "active" && jenisFilter === "PNS",
      activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-fg)] border-[var(--ds-accent-fg)]",
      hoverClass: "hover:border-[var(--ds-accent-soft-border)] ",
      iconBadgeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  ",
      onClick: () => {
        setJenisFilter("PNS");
        if (statusFilter !== "active" || isTrashedView) setStatusFilter("active");
        setPage(1);
      },
    },
    {
      key: "PPPK",
      label: "Pegawai PPPK",
      subtitle: "ASN aktif pemilik NIPPPK",
      count: counts.pppk,
      icon: Briefcase,
      active: !isTrashedView && statusFilter === "active" && jenisFilter === "PPPK",
      activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-fg)] border-[var(--ds-accent-fg)]",
      hoverClass: "hover:border-[var(--ds-status-warning-border)] ",
      iconBadgeClass: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]  ",
      onClick: () => {
        setJenisFilter("PPPK");
        if (statusFilter !== "active" || isTrashedView) setStatusFilter("active");
        setPage(1);
      },
    },
    {
      key: "MMP",
      label: "Personil MMP",
      subtitle: "Mitra Polhut aktif",
      count: counts.mmp,
      icon: UserCheck,
      active: !isTrashedView && statusFilter === "active" && jenisFilter === "MMP",
      activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-fg)] border-[var(--ds-accent-fg)]",
      hoverClass: "hover:border-[var(--ds-status-success-border)] ",
      iconBadgeClass: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]  ",
      onClick: () => {
        setJenisFilter("MMP");
        if (statusFilter !== "active" || isTrashedView) setStatusFilter("active");
        setPage(1);
      },
    },
    {
      key: "INACTIVE",
      label: "Purna / Keluar",
      subtitle: "Pensiun & Nonaktif",
      count: counts.inactive ?? 0,
      icon: UserX,
      active: !isTrashedView && (statusFilter === "inactive" || statusFilter === "pensiun"),
      activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-fg)] border-[var(--ds-accent-fg)]",
      hoverClass: "hover:border-[var(--ds-border-subtle)] ",
      iconBadgeClass: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]  ",
      onClick: () => {
        setJenisFilter("");
        setStatusFilter("inactive");
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
            activeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-fg)] border-[var(--ds-accent-fg)]",
            hoverClass: "hover:border-[var(--ds-status-danger-border)] ",
            iconBadgeClass: "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]  ",
            onClick: () => {
              setStatusFilter(isTrashedView ? "active" : "trashed");
              setPage(1);
            },
          },
        ]
      : []),
  ];

  return (
    <div data-module="kepegawaian" className="kpg-ui p-5 md:p-7 space-y-5 text-[var(--ds-fg)]">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>

            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Daftar Pegawai
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Kelola informasi personil PNS, PPPK, MMP, dan hak akses sistem.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/kepegawaian/cuti" className="flex items-center gap-2 px-4 py-2.5 kpg-secondary text-[var(--ds-fg)] rounded-xl text-xs font-bold transition-colors cursor-pointer">

              <Inbox className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              <span>Inbox Surat Cuti</span>

          </Link>
          {canWrite && (
            <Link href="/kepegawaian/employees/create" className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer">

                <Plus className="w-4 h-4" />
                <span>Tambah Pegawai</span>

            </Link>
          )}
        </div>
      </div>

      {/* 2. Clickable Summary Stat Cards (Data-driven Ponytail + Clean Enterprise Pro Max) */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${
          canWrite ? "xl:grid-cols-6 lg:grid-cols-3" : "xl:grid-cols-5 lg:grid-cols-3"
        } gap-3`}
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              aria-pressed={card.active}
              type="button"

              onClick={card.onClick}
              className={`kpg-filter-card text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
                card.active
                  ? card.activeClass
                  : `bg-[var(--ds-surface)]  border-[var(--ds-border-subtle)]  shadow-2xs ${card.hoverClass}`
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    card.active ? "opacity-85" : "text-[var(--ds-fg-muted)] "
                  }`}
                >
                  {card.label}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    card.active ? "bg-[var(--ds-surface)] text-current" : card.iconBadgeClass
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-1.5">{card.count}</p>
              <p
                className={`text-xs mt-0.5 whitespace-normal wrap-break-word ${
                  card.active ? "opacity-80" : "text-[var(--ds-fg-muted)] "
                }`}
              >
                {card.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
            <input
              type="text"
              placeholder="Cari Nama, NIP/NIPPPK, Jabatan, Satker..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:border-[var(--ds-accent-soft-border)] outline-none transition-colors" aria-label="Cari Nama, NIP/NIPPPK, Jabatan, Satker..."
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                title="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] cursor-pointer"
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
              className="w-full px-3 py-2.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] cursor-pointer" aria-label="Jenis pegawai"
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
              className="w-full px-3 py-2.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] cursor-pointer" aria-label="Wilayah kerja"
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
              className="w-full px-3 py-2.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] cursor-pointer" aria-label="Status pegawai"
            >
              <option value="active">Status: Aktif Bertugas ({counts.active ?? counts.total})</option>
              <option value="inactive">Status: Purna / Non-Aktif ({counts.inactive ?? 0})</option>
              <option value="scheduled">Status: Terjadwal Nonaktif ({counts.scheduled ?? 0})</option>
              <option value="pensiun">Status: Purna Tugas / Pensiun ({counts.pensiun ?? 0})</option>
              <option value="all">Semua Status (Aktif & Nonaktif)</option>
              {canWrite && <option value="trashed">Data Terhapus ({counts.trashed})</option>}
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                title="Reset Filter"
                className="px-3 py-2.5 kpg-secondary text-[var(--ds-fg-muted)] rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Table Card with Motion Glide Transition */}
      <AnimatePresence mode="wait" initial={false}>
        <KepegawaianTabContent
          key={`${jenisFilter}-${statusFilter}-${wilayahFilter}`}

          className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-2xs min-h-[460px] flex flex-col justify-between"
        >
          {isTrashedView ? (
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ds-status-danger-bg)] border-b border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] text-xs font-medium">
              <span>
                Menampilkan <strong>Data Pegawai Terhapus (Soft Delete)</strong>. Anda dapat memulihkan pegawai kembali ke daftar aktif atau menghapusnya secara permanen.
              </span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
                className="font-bold underline ml-4 shrink-0 cursor-pointer"
              >
                Kembali ke Pegawai Aktif
              </button>
            </div>
          ) : (statusFilter === "inactive" || statusFilter === "pensiun") ? (
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] text-[var(--ds-fg)] text-xs font-medium">
              <span>
                Menampilkan <strong>Daftar Pegawai Purna Tugas / Non-Aktif ({counts.inactive ?? 0} orang)</strong>. Pegawai di daftar ini diarsipkan, tidak aktif dalam operasional baru, dan akun dinonaktifkan.
              </span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
                className="font-bold underline ml-4 shrink-0 cursor-pointer text-[var(--ds-accent-fg)]"
              >
                Kembali ke Pegawai Aktif
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] font-bold text-xs uppercase tracking-widest">
              <tr>
                <th className="px-6 py-3.5">Profil Pegawai</th>
                <th className="px-6 py-3.5">NIP / NIPPPK / Kategori</th>
                <th className="px-6 py-3.5">Jabatan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading || isPlaceholderData ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-10 bg-[var(--ds-surface-muted)] rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--ds-status-danger-fg)] font-medium">
                    Gagal memuat data pegawai.
                    <button type="button" className="kpg-secondary ml-3 rounded-lg px-3 py-2" onClick={() => refetch()}>Coba lagi</button>
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-[var(--ds-fg-muted)]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="w-10 h-10 text-[var(--ds-fg-muted)]" />
                      <p className="font-bold text-sm text-[var(--ds-fg)]">
                        {isTrashedView
                          ? "Tidak ada data pegawai di tempat sampah."
                          : "Tidak ada pegawai ditemukan sesuai filter."}
                      </p>
                      <p className="text-xs text-[var(--ds-fg-muted)]">
                        {isTrashedView
                          ? "Semua data pegawai saat ini berstatus aktif atau arsip bersih."
                          : "Coba ubah kata kunci pencarian atau reset filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data.map((emp) => {
                  const mmp = isMmpEmployee(emp);
                  const pppk = !mmp && isPppk(emp);
                  const avatarTone = mmp
                    ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]   "
                    : pppk
                    ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]   "
                    : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]   ";

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-[var(--ds-surface)] transition-colors group"
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
                              <p className="font-bold text-[var(--ds-fg)] truncate">
                                {emp.nama_lengkap}
                              </p>
                            ) : (
                              <Link href={`/kepegawaian/employees/${emp.id}`}>
                                <p className="font-bold text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer truncate">
                                  {emp.nama_lengkap}
                                </p>
                              </Link>
                            )}
                            <p className="text-xs text-[var(--ds-fg-muted)] truncate">
                              {emp.satuan_kerja || "Satuan Kerja Belum Diatur"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-[var(--ds-fg-muted)]">
                        {mmp ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]">
                              MMP
                            </span>
                            <span className="text-[var(--ds-fg-muted)]">Mitra Polhut</span>
                          </span>
                        ) : pppk ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]">
                              NIPPPK
                            </span>
                            <span>{emp.nip}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                              NIP
                            </span>
                            <span>{emp.nip}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-[var(--ds-fg)]">
                        {emp.jabatan || "-"}
                      </td>
                      <td className="px-6 py-3.5">
                        {isTrashedView ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)]">
                            Terhapus
                          </span>
                        ) : emp.status_badge?.state === "scheduled_inactive" ? (
                          <span
                            title={`TMT: ${emp.status_badge.effective_date || "-"}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-status-warning-fg)] animate-pulse" />
                            {emp.status_badge.label}
                          </span>
                        ) : !emp.is_active ? (
                          <span
                            title={emp.inactive_effective_date ? `TMT: ${emp.inactive_effective_date}` : undefined}
                            className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] border border-[var(--ds-border-subtle)]"
                          >
                            {emp.status_badge?.label || "Non-Aktif"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]">
                            Aktif
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
                                  onClick={() => handleRestore(emp)}
                                  title="Pulihkan Pegawai"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--ds-status-success-bg)] hover:bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] rounded-xl text-[var(--ds-status-success-fg)] text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{restoringId === emp.id ? "..." : "Pulihkan"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleForceDelete(emp)}
                                  title="Hapus Permanen"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] rounded-xl text-[var(--ds-status-danger-fg)] text-xs font-bold transition-colors cursor-pointer"
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
                                className="p-2 bg-[var(--ds-surface)] hover:bg-[var(--ds-accent-soft)] border border-[var(--ds-border-subtle)] rounded-xl text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {canManageAccess && (
                                <button
                                  type="button"
                                  title="Kelola Hak Akses"
                                  onClick={(event) => {
                                    accessTriggerRef.current = event.currentTarget;
                                    setSelectedEmployee(emp);
                                    setAccessSheetOpen(true);
                                  }}
                                  className="p-2 bg-[var(--ds-surface)] hover:bg-[var(--ds-status-warning-bg)] border border-[var(--ds-border-subtle)] rounded-xl text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-warning-fg)] transition-colors cursor-pointer"
                                >
                                  <UserCog className="w-4 h-4" />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => handleSoftDelete(emp)}
                                  title="Hapus Pegawai"
                                  className="p-2 bg-[var(--ds-surface)] hover:bg-[var(--ds-status-danger-bg)] border border-[var(--ds-border-subtle)] rounded-xl text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] transition-colors cursor-pointer"
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
          <div className="px-6 py-4 border-t border-[var(--ds-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--ds-surface)]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--ds-fg-muted)]">Tampilkan:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] cursor-pointer" aria-label="Jumlah per halaman"
                >
                  <option value="10">10 baris</option>
                  <option value="20">20 baris</option>
                  <option value="50">50 baris</option>
                  <option value="all">Semua ({totalItems})</option>
                </select>
              </div>
              <p className="text-xs font-bold text-[var(--ds-fg-muted)]">
                Menampilkan <span className="text-[var(--ds-fg)]">{startItem}–{endItem}</span> dari{" "}
                <span className="text-[var(--ds-fg)]">{totalItems}</span> pegawai (Halaman {page} dari {data.meta.last_page})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={isFetching || page === 1}
                className="px-4 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-[var(--ds-surface)] transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                disabled={isFetching || page >= data.meta.last_page}
                className="px-4 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-[var(--ds-surface)] transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
        </KepegawaianTabContent>
      </AnimatePresence>

      {canManageAccess && (
        <EmployeeAccessSheet
          employee={selectedEmployee}
          open={accessSheetOpen}
          returnFocusRef={accessTriggerRef}
          onOpenChange={setAccessSheetOpen}
        />
      )}
    </div>
  );
}
