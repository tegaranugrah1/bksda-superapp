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
  name: string;
  count: number;
  percentage: number;
  gradient: string;
  dot: string;
}

export function RecentActivitiesFeedCard({ activities }: { activities: RecentActivityItem[] }) {
  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs md:text-sm text-zinc-900 dark:text-white">
              Aktivitas Terkini Kepegawaian
            </h3>
            <p className="text-[10px] text-zinc-400">Riwayat penerbitan ST dan permohonan</p>
          </div>
        </div>
        <Link
          href="/kepegawaian/surat-tugas/inbox"
          className="text-[11px] font-extrabold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-0.5"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {activities.slice(0, 4).map((st, idx) => (
          <div
            key={st.id || idx}
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-zinc-200/60 dark:border-zinc-800/80 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-extrabold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                {st.title || "Melaksanakan Perjalanan Dinas"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                  {st.status || "DITERBITKAN"}
                </span>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 truncate font-medium">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  {st.tempat_tujuan || "Kalimantan Timur"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="p-6 text-center text-zinc-400 text-xs font-medium bg-zinc-50/40 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            Belum ada aktivitas Surat Tugas terbaru.
          </div>
        )}
      </div>
    </div>
  );
}

export function SatkerDistributionCard({ satkerBreakdown }: { satkerBreakdown: SatkerBreakdownItem[] }) {
  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs md:text-sm text-zinc-900 dark:text-white">
              Sebaran Personil per Satker
            </h3>
            <p className="text-[10px] text-zinc-400">Distribusi Kantor Balai & Seksi Wilayah</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-800/50">
          {satkerBreakdown.length} Wilayah
        </span>
      </div>

      <div className="space-y-3.5">
        {satkerBreakdown.map((satker) => (
          <div
            key={satker.name}
            className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/40 dark:border-zinc-800/60"
          >
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
              <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-2 truncate">
                <span className={`w-2.5 h-2.5 rounded-full ${satker.dot}`} />
                {satker.name}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[10.5px] shrink-0 ml-2">
                {satker.count} Personil ({satker.percentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full bg-gradient-to-r ${satker.gradient} rounded-full transition-all duration-700 shadow-xs`}
                style={{ width: `${Math.max(5, satker.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
