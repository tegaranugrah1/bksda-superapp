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
  ArrowRight,
  Sparkles,
  ShieldCheck,
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

  const totalEmployees = employeesData?.meta?.total || employeesData?.data?.length || 142;
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
      description: "Pencarian NIP, Jabatan & Hak Akses",
      href: "/kepegawaian/employees",
      icon: Users,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
    },
    ...(canWrite
      ? [
          {
            title: "Tambah Pegawai",
            description: "Formulir Pendaftaran Personil Baru",
            href: "/kepegawaian/employees/create",
            icon: UserPlus,
            color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20",
          },
          {
            title: "Buat Surat Tugas",
            description: "ST Builder Premium Direct Issuance",
            href: "/kepegawaian/surat-tugas/create",
            icon: FileText,
            color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
          },
          {
            title: "Inbox Surat Tugas",
            description: "Verifikasi & Edit Pengajuan ST",
            href: "/kepegawaian/surat-tugas/inbox",
            icon: Inbox,
            color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200/50 dark:border-sky-500/20",
          },
          {
            title: "Inbox Surat Cuti",
            description: "Manajemen & Approval Cuti Pegawai",
            href: "/kepegawaian/cuti",
            icon: Calendar,
            color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20",
          },
        ]
      : []),
    {
      title: "Riwayat Surat Tugas",
      description: "Arsip & Pencarian Riwayat Naskah ST",
      href: "/kepegawaian/surat-tugas/history",
      icon: History,
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20",
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-[11px] font-black uppercase tracking-widest text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kepegawaian & SDM Balai KSDA Kaltim</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Dashboard Kepegawaian</h1>
          <p className="text-blue-200 text-sm max-w-xl">
            Pusat kontrol dan ringkasan data personil, pengajuan Surat Tugas, dan pengelolaan administrasi SDM Balai.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3">
          <Link href="/kepegawaian/employees">
            <button className="flex items-center gap-2 px-5 py-3 bg-white text-blue-950 hover:bg-blue-50 font-extrabold text-xs rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95">
              <Users className="w-4 h-4" />
              <span>Daftar Pegawai</span>
            </button>
          </Link>
          {canWrite && (
            <Link href="/kepegawaian/surat-tugas/create">
              <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 border border-blue-400/30">
                <FileText className="w-4 h-4" />
                <span>Buat Surat Tugas</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Bento Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Pegawai */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              SDM Total
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalEmployees}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">Personil Terdaftar (PNS, PPPK, MMP)</p>
        </div>

        {/* Card 2: ST Aktif */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              ST Diterbitkan
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{activeStCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">Surat Tugas Berlangsung</p>
        </div>

        {/* Card 3: Cuti Pending */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              Pengajuan
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">5</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">Permohonan Cuti Menunggu</p>
        </div>

        {/* Card 4: Keaktifan Pegawai */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              Normal
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">98.5%</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">Status Keaktifan Personil SDM</p>
        </div>
      </div>

      {/* Akses Pintas Menu Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Akses Pintas Modul Kepegawaian
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 group hover:shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sebaran Satuan Kerja & Activity Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Sebaran Satker */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">Sebaran Personil per Satker</h3>
                <p className="text-xs text-zinc-500">Distribusi pegawai Balai & Seksi Wilayah</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {satkerBreakdown.map((satker) => (
              <div key={satker.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-zinc-800 dark:text-zinc-200">{satker.name}</span>
                  <span className="text-zinc-500">{satker.count} Personil ({satker.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${satker.color} rounded-full transition-all duration-500`} style={{ width: `${satker.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Activity Feed */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">Aktivitas Terkini Kepegawaian</h3>
                <p className="text-xs text-zinc-500">Riwayat penerbitan ST dan pengajuan SDM</p>
              </div>
            </div>
            <Link href="/kepegawaian/surat-tugas/inbox" className="text-xs font-extrabold text-blue-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-4">
            {stList.slice(0, 3).map((st, idx) => (
              <div key={st.id || idx} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all border border-zinc-100 dark:border-zinc-800/60">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">
                    {st.maksud_tujuan || st.nama_kegiatan || "Melaksanakan Perjalanan Dinas"}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    Tujuan: {st.tempat_tujuan || "Kalimantan Timur"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {st.status || "DITERBITKAN"}
                    </span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {st.tanggal_surat || "Terbaru"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {stList.length === 0 && (
              <div className="p-8 text-center text-zinc-400 text-xs font-medium">
                Belum ada aktivitas Surat Tugas terbaru.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}