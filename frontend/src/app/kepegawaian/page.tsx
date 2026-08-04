"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, FileText, Calendar, CheckCircle2, Shield } from "lucide-react";
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
  active_rate: string;
  active_surat_tugas: number;
  pending_cuti: number;
  satker_breakdown: Array<{
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
  { name: "Kantor Balai (Samarinda)", count: 0, percentage: 0, gradient: "from-blue-600 to-indigo-600", dot: "bg-blue-500" },
  { name: "Seksi KSDA Wilayah I Berau", count: 0, percentage: 0, gradient: "from-sky-500 to-cyan-500", dot: "bg-sky-400" },
  { name: "Seksi KSDA Wilayah II Tenggarong", count: 0, percentage: 0, gradient: "from-emerald-500 to-teal-500", dot: "bg-emerald-400" },
  { name: "Seksi KSDA Wilayah III Balikpapan", count: 0, percentage: 0, gradient: "from-amber-500 to-orange-500", dot: "bg-amber-400" },
];

export default function KepegawaianDashboardPage() {
  const { canWrite } = useRole();

  // Fetch real-time dashboard stats from backend DB
  const { data: statsResponse } = useQuery({
    queryKey: ["kepegawaian-dashboard-stats"],
    queryFn: async () => {
      const { data } = await api.get<{ data: KepegawaianDashboardStats }>("/kepegawaian/dashboard-stats");
      return data.data;
    },
    staleTime: 15000,
  });

  const totalEmployees = statsResponse?.total_employees ?? 0;
  const activeStCount = statsResponse?.active_surat_tugas ?? 0;
  const pendingCutiCount = statsResponse?.pending_cuti ?? 0;
  const activeRate = statsResponse?.active_rate ?? "100%";
  const satkerBreakdown = statsResponse?.satker_breakdown ?? DEFAULT_SATKER_BREAKDOWN;
  const stList = statsResponse?.recent_activities ?? [];

  return (
    <div className="w-full p-4 md:p-6 space-y-5 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* 1. Ultra-Aesthetic Mesh Gradient Header Banner */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-slate-950 p-5 md:px-7 md:py-5 border border-white/10 shadow-2xl">
        {/* Glowing Mesh Gradients */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-linear-to-br from-blue-600/40 via-indigo-600/30 to-purple-600/0 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 bg-linear-to-tr from-emerald-500/20 via-cyan-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                SDM & KEPEGAWAIAN BALAI KSDA KALIMANTAN TIMUR
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                Dashboard Kepegawaian
              </h1>
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <Shield className="w-3 h-3" /> Live System
              </span>
            </div>

            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed hidden md:block">
              Pusat monitoring dan pengelolaan terpadu personil SDM, penerbitan Surat Tugas, serta permohonan Cuti pegawai secara otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/kepegawaian/employees">
              <button className="group flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 active:scale-95">
                <Users className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Daftar Pegawai</span>
              </button>
            </Link>
            {canWrite && (
              <Link href="/kepegawaian/surat-tugas/create">
                <button className="group flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 border border-blue-400/30">
                  <FileText className="w-4 h-4 text-white group-hover:rotate-6 transition-transform" />
                  <span>Buat Surat Tugas</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Glassmorphism Bento Stat Cards (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Pegawai */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9.5 h-9.5 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              SDM Total
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalEmployees}</p>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">Terdaftar</span>
            </div>
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Personil Active (PNS, PPPK, MMP)</p>
          </div>
        </div>

        {/* Card 2: ST Diterbitkan */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-sky-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-sky-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9.5 h-9.5 rounded-xl bg-linear-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> ST Aktif
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{activeStCount}</p>
              <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded-md">Berlangsung</span>
            </div>
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Surat Tugas Resmi Balai</p>
          </div>
        </div>

        {/* Card 3: Cuti Pending */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9.5 h-9.5 rounded-xl bg-linear-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              Review Cuti
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{pendingCutiCount}</p>
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-md">Pending</span>
            </div>
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Permohonan Cuti Menunggu</p>
          </div>
        </div>

        {/* Card 4: Keaktifan SDM */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9.5 h-9.5 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              Sangat Baik
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{activeRate}</p>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">Normal</span>
            </div>
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Status Keaktifan Personil SDM</p>
          </div>
        </div>
      </div>


      {/* 4. Bottom Split Cards (Recent ST Feed + Satker Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivitiesFeedCard activities={stList} />
        <SatkerDistributionCard satkerBreakdown={satkerBreakdown} />
      </div>
    </div>
  );
}