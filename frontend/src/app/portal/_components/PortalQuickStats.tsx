"use client";

import React from "react";
import { ShieldCheck, Award, Calendar, FileCheck, Layers } from "lucide-react";

interface PortalQuickStatsProps {
  rank?: string | null;
  rankLevel?: number | null;
  activeSuratTugasCount: number;
  myAssetsCount: number;
  onSelectTab?: (tab: "pinjaman" | "aset" | "surat_tugas" | "cuti") => void;
}

export function PortalQuickStats({
  rank,
  rankLevel,
  activeSuratTugasCount,
  myAssetsCount,
  onSelectTab,
}: PortalQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. STATUS VERIFIKASI DUKCAPIL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Verifikasi Dukcapil</p>
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Terverifikasi Aktif
          </p>
          <p className="text-[10px] text-slate-500 truncate">Data ASN Sinkron</p>
        </div>
      </div>

      {/* 2. PANGKAT & GOLONGAN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pangkat / Golongan</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {rank || "Penata Muda (III/a)"}
          </p>
          <p className="text-[10px] text-slate-500 truncate">TMT: 1 Juni 2025</p>
        </div>
      </div>

      {/* 3. SISA CUTI TAHUN 2026 */}
      <div
        onClick={() => onSelectTab?.("cuti")}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
      >
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sisa Cuti (2026)</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white">12 Hari Kerja</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Cuti Tahunan Ready</p>
        </div>
      </div>

      {/* 4. SURAT TUGAS & ASET */}
      <div
        onClick={() => onSelectTab?.("surat_tugas")}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
      >
        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
          <FileCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Surat Tugas / Aset</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {activeSuratTugasCount} ST | {myAssetsCount} Aset
          </p>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Aktif Dalam Penugasan</p>
        </div>
      </div>
    </div>
  );
}
