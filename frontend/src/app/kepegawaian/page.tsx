"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  UserCheck,
  UserPlus,
  Inbox,
  Archive,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useRole } from "@/hooks/useRole";
import {
  RecentActivitiesFeedCard,
  SatkerDistributionCard,
} from "./_components/KepegawaianDashboardComponents";

interface KepegawaianDashboardStats {
  total_employees: number;
  active_employees: number;
  pns_count: number;
  pppk_count: number;
  mmp_count: number;
  active_rate: string;
  active_surat_tugas: number;
  pending_surat_tugas: number;
  pending_cuti: number;
  approved_cuti: number;
  total_surat_masuk: number;
  unreplied_surat_masuk: number;
  satker_breakdown: Array<{
    code?: string;
    name: string;
    count: number;
    percentage: number;
    gradient: string;
    dot: string;
  }>;
  recent_activities: Array<{
    id: string;
    title: string;
    tempat_tujuan: string;
    status: string;
    tanggal_surat: string;
  }>;
}

const DEFAULT_SATKER_BREAKDOWN = [
  { code: "BALAI", name: "Kantor Balai (Samarinda)", count: 0, percentage: 0, gradient: "from-blue-600 to-indigo-600", dot: "bg-blue-500" },
  { code: "SKW_1", name: "Seksi KSDA Wilayah I Berau", count: 0, percentage: 0, gradient: "from-sky-500 to-cyan-500", dot: "bg-sky-400" },
  { code: "SKW_2", name: "Seksi KSDA Wilayah II Tenggarong", count: 0, percentage: 0, gradient: "from-emerald-500 to-teal-500", dot: "bg-emerald-400" },
  { code: "SKW_3", name: "Seksi KSDA Wilayah III Balikpapan", count: 0, percentage: 0, gradient: "from-amber-500 to-orange-500", dot: "bg-amber-400" },
];

export default function KepegawaianDashboardPage() {
  const { canWrite } = useRole();
  const reducedMotion = useReducedMotion();

  const { data: statsResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["kepegawaian-dashboard-stats"],
    queryFn: async () => {
      const { data } = await api.get<{ data: KepegawaianDashboardStats }>("/kepegawaian/dashboard-stats");
      return data.data;
    },
    staleTime: 15000,
  });

  const totalEmployees = statsResponse?.total_employees ?? 0;
  const pnsCount = statsResponse?.pns_count ?? 0;
  const pppkCount = statsResponse?.pppk_count ?? 0;
  const mmpCount = statsResponse?.mmp_count ?? 0;
  const activeStCount = statsResponse?.active_surat_tugas ?? 0;
  const pendingStCount = statsResponse?.pending_surat_tugas ?? 0;
  const pendingCutiCount = statsResponse?.pending_cuti ?? 0;
  const approvedCutiCount = statsResponse?.approved_cuti ?? 0;
  const totalSuratMasuk = statsResponse?.total_surat_masuk ?? 0;
  const unrepliedSuratMasuk = statsResponse?.unreplied_surat_masuk ?? 0;
  const activeRate = statsResponse?.active_rate ?? "0%";
  const satkerBreakdown = statsResponse?.satker_breakdown ?? DEFAULT_SATKER_BREAKDOWN;
  const stList = statsResponse?.recent_activities ?? [];

  const denom = Math.max(1, totalEmployees);
  const pnsPct = Math.round((pnsCount / denom) * 100);
  const pppkPct = Math.round((pppkCount / denom) * 100);
  const mmpPct = Math.round((mmpCount / denom) * 100);

  return (
    <div data-module="kepegawaian" className="kpg-ui kpg-dashboard w-full p-4 md:p-6 space-y-6 text-[var(--ds-fg)]">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="kpg-support-icon w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Dashboard Kepegawaian
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Pusat monitoring komposisi personil SDM (PNS, PPPK, MMP), Surat Tugas, Cuti, dan Surat Masuk.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/kepegawaian/employees" className="kpg-secondary flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-lg transition-colors cursor-pointer">
            <Users className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            <span>Daftar Pegawai</span>
          </Link>
          {canWrite && (
            <>
              <Link href="/kepegawaian/employees/create" className="kpg-secondary flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-lg transition-colors cursor-pointer">
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pegawai</span>
              </Link>
              <Link href="/surat-tugas" className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs rounded-lg transition-colors cursor-pointer">
                <FileText className="w-4 h-4" />
                <span>Buat Surat Tugas</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {isError && <div role="alert" className="p-4 text-sm text-[var(--ds-status-danger-fg)] rounded-3xl border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] shadow-xs">Gagal memuat ringkasan Kepegawaian. <button className="kpg-secondary rounded-lg px-3 py-2 ml-2" onClick={() => refetch()}>Coba lagi</button></div>}
      {isLoading && <p role="status" className="text-sm text-[var(--ds-fg-muted)]">Memuat ringkasan Kepegawaian...</p>}
      <div aria-busy={isLoading} className={isLoading || isError ? "hidden" : "space-y-6"}>
      {/* 2. Top Bento Grid: Left (Komposisi Personil 2-row height) + Right (2x2 Layanan & Keaktifan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Komposisi SDM (spans 6 cols, full height of the 2 rows on the right) */}
        <div className="lg:col-span-6 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--ds-accent-fg)]">
                  Komposisi Personil BKSDA Kalimantan Timur
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h2 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight tabular-nums">
                    {totalEmployees} Personil
                  </h2>
                  <span className="text-xs font-semibold text-[var(--ds-fg-muted)] tabular-nums">
                    ({pnsCount + pppkCount} ASN &amp; {mmpCount} Mitra Polhut)
                  </span>
                </div>
              </div>

              <Link
                href="/kepegawaian/employees?status=all"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--ds-accent-fg)] hover:opacity-80 cursor-pointer shrink-0"
              >
                <span>Kelola Semua Personil</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Segmented Proportion Bar */}
            <div className="w-full h-2 rounded-full bg-[var(--ds-surface-muted)] overflow-hidden flex gap-1">
              <motion.div
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${pnsPct}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeOut" }}
                title={`PNS: ${pnsCount} (${pnsPct}%)`}
              />
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${pppkPct}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeOut", delay: reducedMotion ? 0 : 0.1 }}
                title={`PPPK: ${pppkCount} (${pppkPct}%)`}
              />
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${mmpPct}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeOut", delay: reducedMotion ? 0 : 0.2 }}
                title={`MMP: ${mmpCount} (${mmpPct}%)`}
              />
            </div>
          </div>

          {/* 3 Interactive Category Cards */}
          <div className="grid grid-cols-1 gap-2">
            <motion.div whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                href="/kepegawaian/employees?jenis=PNS&status=all"
                className="group flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/25 border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="kpg-support-icon w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--ds-fg)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Pegawai PNS
                      </span>
                      <span className="kpg-support-badge text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 tabular-nums">
                        {pnsPct}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-fg-muted)]">ASN pemilik NIP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[var(--ds-fg)] tabular-nums">{pnsCount}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--ds-fg-muted)] group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            </motion.div>

            <motion.div whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                href="/kepegawaian/employees?jenis=PPPK&status=all"
                className="group flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-amber-50/60 dark:hover:bg-amber-950/25 border border-slate-200/70 dark:border-zinc-800 hover:border-amber-300/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="kpg-support-icon w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--ds-fg)] group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors">
                        Pegawai PPPK (P3K)
                      </span>
                      <span className="kpg-support-badge text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 tabular-nums">
                        {pppkPct}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-fg-muted)]">ASN pemilik NIPPPK</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[var(--ds-fg)] tabular-nums">{pppkCount}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--ds-fg-muted)] group-hover:text-amber-800 transition-colors" />
                </div>
              </Link>
            </motion.div>

            <motion.div whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                href="/kepegawaian/employees?jenis=MMP&status=all"
                className="group flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25 border border-slate-200/70 dark:border-zinc-800 hover:border-emerald-300/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="kpg-support-icon w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--ds-fg)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Personil MMP
                      </span>
                      <span className="kpg-support-badge text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 tabular-nums">
                        {mmpPct}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Masyarakat Mitra Polhut</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[var(--ds-fg)] tabular-nums">{mmpCount}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--ds-fg-muted)] group-hover:text-emerald-600 transition-colors" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right Column: 2x2 Grid for Surat Tugas, Layanan Cuti, Surat Masuk (Admin), and Status Keaktifan */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canWrite && (
            <>
              <motion.div whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }} className="h-full">
                <Link
                  href="/kepegawaian/surat-tugas/inbox"
                  className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-3xl shadow-xs hover:border-blue-400/70 transition-colors flex flex-col justify-between cursor-pointer h-full"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="kpg-support-icon w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <span className="kpg-support-badge text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 whitespace-nowrap shrink-0">
                      Surat Tugas
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight tabular-nums">
                        {activeStCount}
                      </p>
                      <span className="kpg-support-badge text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-lg">
                        {pendingStCount} Draft/Pending
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-fg-muted)] font-medium truncate mt-1">
                      Surat Tugas Diterbitkan
                    </p>
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }} className="h-full">
                <Link
                  href="/kepegawaian/cuti"
                  className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-3xl shadow-xs hover:border-amber-400/70 transition-colors flex flex-col justify-between cursor-pointer h-full"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="kpg-support-icon w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="kpg-support-badge text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap shrink-0">
                      Layanan Cuti
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight tabular-nums">
                        {pendingCutiCount}
                      </p>
                      <span className="kpg-support-badge text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg">
                        {approvedCutiCount} Disetujui
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-fg-muted)] font-medium truncate mt-1">
                      Permohonan Cuti Menunggu
                    </p>
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }} className="h-full">
                <Link
                  href="/kepegawaian/surat-masuk"
                  className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-3xl shadow-xs hover:border-indigo-400/70 transition-colors flex flex-col justify-between cursor-pointer h-full"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="kpg-support-icon w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                      <Archive className="w-5 h-5" />
                    </div>
                    <span className="kpg-support-badge text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 whitespace-nowrap shrink-0">
                      Surat Masuk
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight tabular-nums">
                        {totalSuratMasuk}
                      </p>
                      <span className="kpg-support-badge text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-lg">
                        {unrepliedSuratMasuk} Belum Dibalas
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-fg-muted)] font-medium truncate mt-1">
                      Total Agenda Surat Masuk
                    </p>
                  </div>
                </Link>
              </motion.div>
            </>
          )}

          <motion.div whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }} className={`h-full ${canWrite ? "" : "sm:col-span-2"}`}>
            <Link
              href="/kepegawaian/employees?status=active"
              className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-3xl shadow-xs hover:border-emerald-400/70 transition-colors flex flex-col justify-between cursor-pointer h-full"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="kpg-support-icon w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="kpg-support-badge text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap shrink-0">
                  Keaktifan
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight tabular-nums">
                    {activeRate}
                  </p>
                  <span className="kpg-support-badge text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg">
                    Aktif
                  </span>
                </div>
                <p className="text-xs text-[var(--ds-fg-muted)] font-medium truncate mt-1">
                  Status Keaktifan Personil SDM
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* 3. Bottom Split Cards (Satker Distribution + Recent ST Feed) */}
      <div className={`grid grid-cols-1 ${canWrite ? "lg:grid-cols-2" : "lg:grid-cols-1"} gap-4`}>
        <SatkerDistributionCard satkerBreakdown={satkerBreakdown} />
        {canWrite && <RecentActivitiesFeedCard activities={stList} />}
      </div>
      </div>
    </div>
  );
}
