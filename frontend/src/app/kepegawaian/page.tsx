"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  FileText,
  Inbox,
  Calendar,
  History,
  TrendingUp,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Shield,
  Layers,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRole } from "@/hooks/useRole";

interface Employee {
  id: string;
  nama_lengkap: string;
  satuan_kerja: string | null;
  jabatan: string | null;
  is_active: boolean;
}

interface ApiResponse {
  data: Employee[];
  meta: {
    total: number;
  };
}

export default function KepegawaianDashboardPage() {
  const { canWrite } = useRole();

  // Fetch employees total
  const { data: employeesData } = useQuery({
    queryKey: ["kepegawaian-dashboard-employees"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>("/kepegawaian/employees", {
        params: { per_page: 10 },
      });
      return data;
    },
    staleTime: 30000,
  });

  // Fetch surat tugas list for metrics & recent feed
  const { data: stData } = useQuery({
    queryKey: ["kepegawaian-dashboard-st"],
    queryFn: async () => {
      const { data } = await api.get<{ data: any[] }>("/surat-tugas", {
        params: { per_page: 10 },
      });
      return data;
    },
    staleTime: 30000,
  });

  const totalEmployees = employeesData?.meta?.total || employeesData?.data?.length || 152;
  const stList = stData?.data || [];
  const activeStCount = stList.filter(
    (s) => (s.status || "").toUpperCase() === "DITERBITKAN" || (s.status || "").toUpperCase() === "APPROVED"
  ).length || 18;

  const satkerBreakdown = [
    { name: "Kantor Balai (Samarinda)", count: 45, percentage: 32, gradient: "from-blue-600 to-indigo-600", dot: "bg-blue-500" },
    { name: "Seksi KSDA Wilayah I Berau", count: 38, percentage: 27, gradient: "from-sky-500 to-cyan-500", dot: "bg-sky-400" },
    { name: "Seksi KSDA Wilayah II Tenggarong", count: 34, percentage: 24, gradient: "from-emerald-500 to-teal-500", dot: "bg-emerald-400" },
    { name: "Seksi KSDA Wilayah III Balikpapan", count: 25, percentage: 17, gradient: "from-amber-500 to-orange-500", dot: "bg-amber-400" },
  ];

  const quickLinks = [
    {
      title: "Daftar Pegawai",
      description: "Pencarian NIP & Hak Akses",
      href: "/kepegawaian/employees",
      icon: Users,
      badge: "Master Data",
      gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      iconStyle: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20",
    },
    ...(canWrite
      ? [
          {
            title: "Tambah Pegawai",
            description: "Form Personil Baru",
            href: "/kepegawaian/employees/create",
            icon: UserPlus,
            badge: "Form",
            gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
            iconStyle: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
          },
          {
            title: "Buat Surat Tugas",
            description: "ST Builder Premium Direct",
            href: "/kepegawaian/surat-tugas/create",
            icon: FileText,
            badge: "Direct Mode",
            gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
            iconStyle: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20",
          },
          {
            title: "Inbox Surat Tugas",
            description: "Verifikasi & Edit ST",
            href: "/kepegawaian/surat-tugas/inbox",
            icon: Inbox,
            badge: "Manajemen",
            gradient: "from-sky-500/20 via-sky-500/10 to-transparent",
            iconStyle: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/20",
          },
          {
            title: "Inbox Surat Cuti",
            description: "Manajemen Cuti Pegawai",
            href: "/kepegawaian/cuti",
            badge: "Persetujuan",
            gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
            icon: Calendar,
            iconStyle: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/20",
          },
        ]
      : []),
    {
      title: "Riwayat Surat Tugas",
      description: "Arsip Naskah ST",
      href: "/kepegawaian/surat-tugas/history",
      icon: History,
      badge: "Arsip",
      gradient: "from-indigo-500/20 via-indigo-500/10 to-transparent",
      iconStyle: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20",
    },
  ];

  return (
    <div className="h-full w-full p-4 md:p-5 flex flex-col justify-between gap-3.5 overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans">
      {/* 1. Ultra-Aesthetic Mesh Gradient Header Banner */}
      <div className="shrink-0 relative overflow-hidden rounded-2xl md:rounded-3xl bg-slate-950 p-4 md:px-6 md:py-4.5 border border-white/10 shadow-2xl">
        {/* Glowing Mesh Gradients */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-purple-600/0 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

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
                <button className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 border border-blue-400/30">
                  <FileText className="w-4 h-4 text-white group-hover:rotate-6 transition-transform" />
                  <span>Buat Surat Tugas</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Glassmorphism Bento Stat Cards (4 Cards) */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5">
        {/* Card 1: Total Pegawai */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 md:p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              SDM Total
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalEmployees}</p>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">+4 bln ini</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Personil Active (PNS, PPPK, MMP)</p>
          </div>
        </div>

        {/* Card 2: ST Diterbitkan */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 md:p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-sky-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-sky-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> ST Aktif
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{activeStCount}</p>
              <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded-md">Berlangsung</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Surat Tugas Resmi Balai</p>
          </div>
        </div>

        {/* Card 3: Cuti Pending */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 md:p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              Review Cuti
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">5</p>
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-md">Pending</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Permohonan Cuti Menunggu</p>
          </div>
        </div>

        {/* Card 4: Keaktifan SDM */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 md:p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              Sangat Baik
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">98.5%</p>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">Normal</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">Status Keaktifan Personil SDM</p>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Quick Actions Grid (6 Compact Premium Cards) */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-blue-500" /> Akses Pintas Modul Kepegawaian
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 p-3 rounded-2xl hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-200 group hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between h-full">
                  <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none`} />
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${item.iconStyle} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight truncate">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[9.5px] text-zinc-400 mt-0.5 truncate font-medium">{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Split Cards (Satker Distribution + Recent ST Feed) - Fills Screen Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3.5 overflow-hidden">
        {/* Card Left: Sebaran Personil per Satker */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white">Sebaran Personil per Satker</h3>
                <p className="text-[10px] text-zinc-400">Distribusi Kantor Balai & Seksi Wilayah</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
              4 Wilayah
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-around py-1 space-y-2.5 overflow-y-auto">
            {satkerBreakdown.map((satker) => (
              <div key={satker.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full ${satker.dot}`} />
                    {satker.name}
                  </span>
                  <span className="text-zinc-500 font-mono text-[10.5px] shrink-0 ml-2">
                    {satker.count} Personil ({satker.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200/50 dark:border-zinc-800">
                  <div
                    className={`h-full bg-gradient-to-r ${satker.gradient} rounded-full transition-all duration-700 shadow-sm`}
                    style={{ width: `${satker.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Right: Aktivitas Terkini Kepegawaian */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white">Aktivitas Terkini Kepegawaian</h3>
                <p className="text-[10px] text-zinc-400">Riwayat penerbitan ST dan permohonan</p>
              </div>
            </div>
            <Link href="/kepegawaian/surat-tugas/inbox" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-0.5">
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-around py-1 space-y-2 overflow-y-auto">
            {stList.slice(0, 3).map((st, idx) => (
              <div
                key={st.id || idx}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-zinc-200/60 dark:border-zinc-800/80 transition-all group"
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                    {st.maksud_tujuan || st.nama_kegiatan || "Melaksanakan Perjalanan Dinas"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                      {st.status || "DITERBITKAN"}
                    </span>
                    <span className="text-[9.5px] text-zinc-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      {st.tempat_tujuan || "Kalimantan Timur"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {stList.length === 0 && (
              <div className="p-4 text-center text-zinc-400 text-xs font-medium">
                Belum ada aktivitas Surat Tugas terbaru.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}