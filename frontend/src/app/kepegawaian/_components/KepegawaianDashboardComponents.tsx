"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, FileText, MapPin, ChevronRight, Building2 } from "lucide-react";

export interface RecentActivityItem {
  id: string;
  title: string;
  tempat_tujuan: string;
  status: string;
  tanggal_surat?: string;
}

export interface SatkerBreakdownItem {
  code?: string;
  name: string;
  count: number;
  percentage: number;
  gradient: string;
  dot: string;
}

export function RecentActivitiesFeedCard({ activities }: { activities: RecentActivityItem[] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white">
              Aktivitas Terkini Surat Tugas
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Riwayat penerbitan ST dan penugasan terbaru
            </p>
          </div>
        </div>
        <Link
          href="/kepegawaian/surat-tugas/inbox"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5 cursor-pointer"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {activities.slice(0, 4).map((st, idx) => {
          const cleanId = st.id.replace(/^st-/, "");
          return (
            <Link
              key={st.id || idx}
              href={`/kepegawaian/surat-tugas/builder/${cleanId}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/60 dark:border-zinc-800/80 hover:border-blue-300/60 transition-colors group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {st.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    {st.status}
                  </span>
                  {st.tempat_tujuan && (
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 truncate font-medium">
                      <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                      {st.tempat_tujuan}
                    </span>
                  )}
                  {st.tanggal_surat && (
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-auto shrink-0">
                      {st.tanggal_surat}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0 transition-colors" />
            </Link>
          );
        })}
        {activities.length === 0 && (
          <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50/40 dark:bg-zinc-800/20 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
            Belum ada aktivitas Surat Tugas terbaru.
          </div>
        )}
      </div>
    </div>
  );
}

export function SatkerDistributionCard({ satkerBreakdown }: { satkerBreakdown: SatkerBreakdownItem[] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-2xs flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white">
              Sebaran Personil per Wilayah Satker
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Klik wilayah untuk memfilter Daftar Pegawai
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
          {satkerBreakdown.length} Wilayah
        </span>
      </div>

      <div className="space-y-3">
        {satkerBreakdown.map((satker) => {
          const href = satker.code
            ? `/kepegawaian/employees?wilayah=${encodeURIComponent(satker.code)}`
            : `/kepegawaian/employees`;
          return (
            <Link
              key={satker.name}
              href={href}
              className="block p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/25 border border-slate-200/60 dark:border-zinc-800/70 hover:border-blue-300/60 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-2 truncate transition-colors">
                  <span className={`w-2.5 h-2.5 rounded-full ${satker.dot}`} />
                  {satker.name}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 font-mono text-[11px] shrink-0 ml-2 flex items-center gap-1">
                  <span>
                    {satker.count} Personil ({satker.percentage}%)
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-linear-to-r ${satker.gradient} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(5, satker.percentage)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
