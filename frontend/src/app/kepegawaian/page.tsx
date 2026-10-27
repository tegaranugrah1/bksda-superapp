"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  LayoutDashboard,
  Shield,
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

  const { data: statsResponse } = useQuery({
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
  const activeRate = statsResponse?.active_rate ?? "100%";
  const satkerBreakdown = statsResponse?.satker_breakdown ?? DEFAULT_SATKER_BREAKDOWN;
  const stList = statsResponse?.recent_activities ?? [];

  const denom = Math.max(1, totalEmployees);
  const pnsPct = Math.round((pnsCount / denom) * 100);
  const pppkPct = Math.round((pppkCount / denom) * 100);
  const mmpPct = Math.max(0, 100 - pnsPct - pppkPct);

  return (
    <div className="w-full p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                SDM &amp; Kepegawaian
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2 py-0.2 rounded-full">
                <Shield className="w-2.5 h-2.5" /> Live System
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Dashboard Kepegawaian
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Pusat monitoring komposisi personil SDM (PNS, PPPK, MMP), Surat Tugas, Cuti, dan Surat Masuk.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link href="/kepegawaian/employees">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Daftar Pegawai</span>
            </button>
          </Link>
          {canWrite && (
            <>
              <Link href="/kepegawaian/employees/create">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pegawai</span>
                </button>
              </Link>
              <Link href="/surat-tugas">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buat Surat Tugas</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 2. Top Bento Grid: Left (Komposisi Personil 2-row height) + Right (2x2 Layanan & Keaktifan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Komposisi SDM (spans 6 cols, full height of the 2 rows on the right) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Komposisi Personil BKSDA Kalimantan Timur
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {totalEmployees} Personil
                  </h2>
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    ({pnsCount + pppkCount} ASN &amp; {mmpCount} Mitra Polhut)
                  </span>
                </div>
              </div>

              <Link
                href="/kepegawaian/employees"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer shrink-0"
              >
                <span>Kelola Semua Personil</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Segmented Proportion Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${pnsPct}%` }}
                title={`PNS: ${pnsCount} (${pnsPct}%)`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${pppkPct}%` }}
                title={`PPPK: ${pppkCount} (${pppkPct}%)`}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${mmpPct}%` }}
                title={`MMP: ${mmpCount} (${mmpPct}%)`}
              />
            </div>
          </div>

          {/* 3 Interactive Category Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            <Link
              href="/kepegawaian/employees?jenis=PNS"
              className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/25 border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Pegawai PNS
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {pnsPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">ASN pemilik NIP</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{pnsCount}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>

            <Link
              href="/kepegawaian/employees?jenis=PPPK"
              className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-amber-50/60 dark:hover:bg-amber-950/25 border border-slate-200/70 dark:border-zinc-800 hover:border-amber-300/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Pegawai PPPK (P3K)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {pppkPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">ASN pemilik NIPPPK</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{pppkCount}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
            </Link>

            <Link
              href="/kepegawaian/employees?jenis=MMP"
              className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25 border border-slate-200/70 dark:border-zinc-800 hover:border-emerald-300/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Personil MMP
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {mmpPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Masyarakat Mitra Polhut</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{mmpCount}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: 2x2 Grid for Surat Tugas, Layanan Cuti, Surat Masuk, Status Keaktifan */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/kepegawaian/surat-tugas/inbox"
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs hover:border-blue-400/70 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center">
                <Inbox className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Surat Tugas
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {activeStCount}
                </p>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                  {pendingStCount} Draft/Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-1">
                Surat Tugas Diterbitkan
              </p>
            </div>
          </Link>

          <Link
            href="/kepegawaian/cuti"
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs hover:border-amber-400/70 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                Layanan Cuti
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {pendingCutiCount}
                </p>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                  {approvedCutiCount} Disetujui
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-1">
                Permohonan Cuti Menunggu
              </p>
            </div>
          </Link>

          <Link
            href="/kepegawaian/surat-masuk"
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs hover:border-indigo-400/70 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center">
                <Archive className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Surat Masuk
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {totalSuratMasuk}
                </p>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                  {unrepliedSuratMasuk} Belum Dibalas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-1">
                Total Agenda Surat Masuk
              </p>
            </div>
          </Link>

          <Link
            href="/kepegawaian/employees?status=active"
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs hover:border-emerald-400/70 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Keaktifan
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {activeRate}
                </p>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-1">
                Status Keaktifan Personil SDM
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Bottom Split Cards (Satker Distribution + Recent ST Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SatkerDistributionCard satkerBreakdown={satkerBreakdown} />
        <RecentActivitiesFeedCard activities={stList} />
      </div>
    </div>
  );
}
