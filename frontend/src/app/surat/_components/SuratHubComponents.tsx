"use client";

import React from "react";
import Link from "next/link";
import {
  Mail,
  Inbox,
  Send,
  Plus,
  FileCheck,
  CheckCircle2,
  Shield,
  ChevronRight,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface SuratMasukItem {
  id?: string | number;
  no_agenda?: string;
  asal_surat?: string;
  perihal?: string;
  tanggal_terima?: string;
  status_disposisi?: string;
  sifat?: string;
}

interface SuratKeluarItem {
  id?: string | number;
  no_surat?: string;
  tujuan_surat?: string;
  perihal?: string;
  tanggal_surat?: string;
  status?: string;
}

export function HeaderBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-slate-950 p-5 md:px-7 md:py-5 border border-white/10 shadow-2xl">
      {/* Glowing Mesh Gradients */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-gradient-to-br from-emerald-600/40 via-teal-600/30 to-cyan-600/0 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 bg-gradient-to-tr from-blue-500/20 via-teal-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md">
            <Mail className="h-3.5 w-3.5 text-emerald-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              MODUL PERSURATAN & DISPOSISI DIGITAL BKSDA KALTIM
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Pengelolaan Surat Masuk & Surat Keluar
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> Digital Registry
            </span>
          </div>

          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed hidden md:block">
            Penatausahaan naskah dinas resmi BKSDA Kalimantan Timur, registrasi nomor agenda, penerusan lembar disposisi presisi 2-Up, dan pengarsipan digital.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/surat/masuk/create">
            <button className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 border border-emerald-400/30">
              <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform" />
              <span>Input Surat Masuk</span>
            </button>
          </Link>
          <Link href="/surat/keluar/create">
            <button className="group flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-emerald-500/10 active:scale-95">
              <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform" />
              <span>Input Surat Keluar</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BentoStatCards({
  totalSuratMasuk,
  totalSuratKeluar,
}: {
  totalSuratMasuk: number;
  totalSuratKeluar: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Total Surat Masuk */}
      <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
        <div className="flex items-center justify-between">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <Inbox className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            Surat Masuk
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              {totalSuratMasuk}
            </p>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">
              Agenda Aktif
            </span>
          </div>
          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">
            Disposisi & Teragendakan
          </p>
        </div>
      </div>

      {/* Card 2: Total Surat Keluar */}
      <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all group flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
        <div className="flex items-center justify-between">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <Send className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            Surat Keluar
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              {totalSuratKeluar}
            </p>
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded-md">
              Terarsip
            </span>
          </div>
          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">
            Penomoran Naskah Resmi
          </p>
        </div>
      </div>

      {/* Card 3: Lembar Disposisi 2-Up */}
      <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all group flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
        <div className="flex items-center justify-between">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            <FileCheck className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            Disposisi Cetak
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              2-Up Letter
            </p>
            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-md">
              Standar
            </span>
          </div>
          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">
            2 Lembar Disposisi per Halaman
          </p>
        </div>
      </div>

      {/* Card 4: Keaktifan Naskah */}
      <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs hover:shadow-md hover:border-teal-500/40 transition-all group flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-teal-500/10 transition-all" />
        <div className="flex items-center justify-between">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
            Responsif
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              100%
            </p>
            <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded-md">
              Terdata
            </span>
          </div>
          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">
            Penatausahaan Naskah Resmi
          </p>
        </div>
      </div>
    </div>
  );
}

export function RecentSuratWidget({
  suratMasukList,
  suratKeluarList,
}: {
  suratMasukList: SuratMasukItem[];
  suratKeluarList: SuratKeluarItem[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Card Left: Surat Masuk Terbaru */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Inbox className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs md:text-sm text-zinc-900 dark:text-white">
                Surat Masuk Terbaru
              </h3>
              <p className="text-[10px] text-zinc-400">
                Naskah dinas masuk & lembar disposisi
              </p>
            </div>
          </div>
          <Link
            href="/surat/masuk"
            className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {suratMasukList.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-zinc-200/60 dark:border-zinc-800/80 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Inbox className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-extrabold text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                    {item.perihal || "Naskah Surat Masuk"}
                  </p>
                  <span className="text-[9px] font-mono text-zinc-400 shrink-0 ml-2">
                    Agenda: {item.no_agenda || `#${idx + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                    {item.sifat || "Biasa"}
                  </span>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1 truncate font-medium">
                    Dari: {item.asal_surat || "Instansi Luar"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {suratMasukList.length === 0 && (
            <div className="p-6 text-center text-zinc-400 text-xs font-medium bg-zinc-50/40 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Belum ada data Surat Masuk terbaru.
            </div>
          )}
        </div>
      </div>

      {/* Card Right: Surat Keluar Terbaru */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Send className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs md:text-sm text-zinc-900 dark:text-white">
                Surat Keluar Terbaru
              </h3>
              <p className="text-[10px] text-zinc-400">
                Pengagendaan naskah dinas keluar
              </p>
            </div>
          </div>
          <Link
            href="/surat/keluar"
            className="text-[11px] font-extrabold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-0.5"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {suratKeluarList.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-zinc-200/60 dark:border-zinc-800/80 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Send className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-extrabold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                    {item.perihal || "Surat Keluar Resmi"}
                  </p>
                  <span className="text-[9px] font-mono text-zinc-400 shrink-0 ml-2">
                    {item.no_surat || `#${idx + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                    {item.status || "Terarsip"}
                  </span>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1 truncate font-medium">
                    Kepada: {item.tujuan_surat || "Tujuan Resmi"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {suratKeluarList.length === 0 && (
            <div className="p-6 text-center text-zinc-400 text-xs font-medium bg-zinc-50/40 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Belum ada data Surat Keluar terbaru.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
