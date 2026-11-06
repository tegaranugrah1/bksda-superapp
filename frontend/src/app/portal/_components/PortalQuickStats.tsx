"use client";

import React from "react";
import { ShieldCheck, Award, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalQuickStatsProps {
  rank?: string | null;
  activeSuratTugasCount: number;
  myAssetsCount: number;
  leaveBalance?: {
    sisa_cuti_tersedia: number;
    total_hak_cuti: number;
    pending_cuti_tahunan?: number;
    sisa_cuti_dapat_diajukan?: number;
  } | null;
  year?: number;
  onSelectTab?: (tab: "pinjaman" | "aset" | "surat_tugas" | "cuti") => void;
}

export function PortalQuickStats({
  rank,
  activeSuratTugasCount,
  myAssetsCount,
  leaveBalance,
  year,
  onSelectTab,
}: PortalQuickStatsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="quick-metrics-row">
      {/* 1. STATUS KEPEGAWAIAN / VERIFIKASI DUKCAPIL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#dce8dd] dark:border-slate-800 shadow-xs hover:border-[#1e5433]/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e4f0e6] dark:bg-emerald-950/60 text-[#1e5433] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#dce8dd] dark:border-emerald-800/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Status Kepegawaian
            </span>
            <p className="text-xs font-bold text-[#1e5433] dark:text-emerald-400 flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e5433] dark:bg-emerald-400 animate-pulse" />
              Terverifikasi Aktif
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Data ASN Sinkron BKN
            </p>
          </div>
        </div>
      </div>

      {/* 2. PANGKAT / GOLONGAN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#dce8dd] dark:border-slate-800 shadow-xs hover:border-[#1e5433]/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pangkat / Golongan
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              {rank || "Penata Muda (III/a)"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {rank ? "Jabatan Fungsional" : "Non-PNS / Belum Diatur"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SISA CUTI (2026) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectTab?.("cuti")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectTab?.("cuti");
          }
        }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#dce8dd] dark:border-slate-800 shadow-xs hover:border-[#1e5433]/40 hover:shadow-xs transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sisa Cuti ({year || new Date().getFullYear()})
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              {leaveBalance ? `${leaveBalance.sisa_cuti_tersedia} Hari Kerja` : "12 Hari Kerja"}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5 truncate">
              {leaveBalance && (leaveBalance.pending_cuti_tahunan ?? 0) > 0
                ? `${leaveBalance.pending_cuti_tahunan} Hari Diajukan`
                : "Cuti Tahunan Siap Pakai"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. SURAT TUGAS & ASET */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectTab?.("surat_tugas")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectTab?.("surat_tugas");
          }
        }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#dce8dd] dark:border-slate-800 shadow-xs hover:border-[#1e5433]/40 hover:shadow-xs transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/40">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Surat Tugas &amp; Aset
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              {activeSuratTugasCount} ST <span className="text-slate-300 dark:text-slate-600 mx-0.5">|</span> {myAssetsCount} Aset
            </p>
            <p className="text-[11px] text-[#1e5433] dark:text-emerald-400 font-semibold mt-0.5 truncate">
              Patroli Terjadwal
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
