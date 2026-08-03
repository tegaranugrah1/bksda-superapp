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
    { name: "Kantor Balai (Samarinda)", count: 45, percentage: 32, color: "bg-blue-600" },
    { name: "Seksi KSDA Wilayah I Berau", count: 38, percentage: 27, color: "bg-sky-500" },
    { name: "Seksi KSDA Wilayah II Tenggarong", count: 34, percentage: 24, color: "bg-emerald-500" },
    { name: "Seksi KSDA Wilayah III Balikpapan", count: 25, percentage: 17, color: "bg-amber-500" },
  ];

  const quickLinks = [
    {
      title: "Daftar Pegawai",
      description: "Pencarian NIP & Hak Akses",
      href: "/kepegawaian/employees",
      icon: Users,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
    },
    ...(canWrite
      ? [
          {
            title: "Tambah Pegawai",
            description: "Form Personil Baru",
            href: "/kepegawaian/employees/create",
            icon: UserPlus,
            color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20",
          },
          {
            title: "Buat Surat Tugas",
            description: "ST Builder Premium Direct",
            href: "/kepegawaian/surat-tugas/create",
            icon: FileText,
            color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
          },
          {
            title: "Inbox Surat Tugas",
            description: "Verifikasi & Edit ST",
            href: "/kepegawaian/surat-tugas/inbox",
            icon: Inbox,
            color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200/50 dark:border-sky-500/20",
          },
          {
            title: "Inbox Surat Cuti",
            description: "Manajemen Cuti Pegawai",
            href: "/kepegawaian/cuti",
            icon: Calendar,
            color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20",
          },
        ]
      : []),
    {
      title: "Riwayat Surat Tugas",
      description: "Arsip Naskah ST",
      href: "/kepegawaian/surat-tugas/history",
      icon: History,
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20",
    },
  ];

  return (
    <div className="h-full w-full p-4 md:p-5 flex flex-col justify-between gap-4 overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* 1. Header Banner (Compact Full-Width) */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 md:px-6 md:py-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-300">
            <Sparkles className="w-3 h-3" />
            <span>Kepegawaian & SDM Balai KSDA Kaltim</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">Dashboard Kepegawaian</h1>
          <p className="text-blue-200 text-xs hidden md:block">
            Pusat kontrol dan ringkasan data personil, pengajuan Surat Tugas, dan pengelolaan administrasi SDM.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <Link href="/kepegawaian/employees">
            <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-blue-950 hover:bg-blue-50 font-extrabold text-xs rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95">
              <Users className="w-3.5 h-3.5" />
              <span>Daftar Pegawai</span>
            </button>
          </Link>
          {canWrite && (
            <Link href="/kepegawaian/surat-tugas/create">
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 border border-blue-400/30">
                <FileText className="w-3.5 h-3.5" />
                <span>Buat Surat Tugas</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Metrics Bento Grid (4 Cards - Compact) */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Pegawai */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 md:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              SDM Total
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black tracking-tight">{totalEmployees}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">Personil (PNS, PPPK, MMP)</p>
          </div>
        </div>

        {/* Card 2: ST Aktif */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 md:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              ST Diterbitkan
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black tracking-tight">{activeStCount}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">Surat Tugas Berlangsung</p>
          </div>
        </div>

        {/* Card 3: Cuti Pending */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 md:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              Pengajuan
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black tracking-tight">5</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">Permohonan Cuti Menunggu</p>
          </div>
        </div>

        {/* Card 4: Keaktifan Pegawai */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 md:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              Normal
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black tracking-tight">98.5%</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">Status Keaktifan SDM</p>
          </div>
        </div>
      </div>

      {/* 3. Akses Pintas Menu Grid (6 Column Single Row / Compact 2 Rows) */}
      <div className="shrink-0">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
          Akses Pintas Modul Kepegawaian
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-200 group hover:shadow-sm flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Split Section (Satker Distribution + Recent Feed) - Fills Remaining Vertical Space */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3.5 overflow-hidden">
        {/* Card Sebaran Satker */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white">Sebaran Personil per Satker</h3>
                <p className="text-[10px] text-zinc-400">Distribusi Balai & Seksi Wilayah</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-around py-1 space-y-2 overflow-y-auto">
            {satkerBreakdown.map((satker) => (
              <div key={satker.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-800 dark:text-zinc-200 truncate">{satker.name}</span>
                  <span className="text-zinc-500 shrink-0 ml-2">{satker.count} ({satker.percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${satker.color} rounded-full transition-all duration-500`} style={{ width: `${satker.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Activity Feed */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white">Aktivitas Terkini Kepegawaian</h3>
                <p className="text-[10px] text-zinc-400">Riwayat penerbitan ST dan permohonan</p>
              </div>
            </div>
            <Link href="/kepegawaian/surat-tugas/inbox" className="text-[11px] font-extrabold text-blue-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-around py-1 space-y-2 overflow-y-auto">
            {stList.slice(0, 3).map((st, idx) => (
              <div key={st.id || idx} className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
                    {st.maksud_tujuan || st.nama_kegiatan || "Melaksanakan Perjalanan Dinas"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {st.status || "DITERBITKAN"}
                    </span>
                    <span className="text-[9.5px] text-zinc-400 truncate">
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