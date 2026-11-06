"use client";

import React from "react";
import { Plus, Calculator, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalHeaderBannerProps {
  displayName?: string;
  activeSuratTugasCount: number;
  onOpenVisum?: () => void;
  onOpenKalkulator?: () => void;
  onOpenSuratTugasTab?: () => void;
}

function formatDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PortalHeaderBanner({
  displayName,
  activeSuratTugasCount,
  onOpenVisum,
  onOpenKalkulator,
  onOpenSuratTugasTab,
}: PortalHeaderBannerProps) {
  const currentDate = formatDate();

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4" data-purpose="welcome-and-performance-hero">
      {/* HERO CARD (8 Cols) */}
      <div className="lg:col-span-8 bg-[#1e5433] text-white rounded-2xl p-6 shadow-sm border border-[#164227] flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              {currentDate}
            </span>
            <span className="text-xs text-emerald-200/80">•</span>
            <span className="text-[11px] font-medium text-emerald-200">
              Wilayah I - III Terpantau Aktif
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 leading-snug">
            Selamat Datang di Portal Terpadu BKSDA Kaltim!
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed mb-6">
            Pusat layanan operasional konservasi sumber daya alam, administrasi kepegawaian ASN, serta tata kelola kehutanan Kalimantan Timur terintegrasi dalam satu sistem superapp.
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
          {onOpenVisum && (
            <button
              type="button"
              onClick={onOpenVisum}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1e5433] hover:bg-[#edf3ee] font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Visum SPD</span>
            </button>
          )}

          {onOpenKalkulator && (
            <button
              type="button"
              onClick={onOpenKalkulator}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Kalkulator Dinas</span>
            </button>
          )}

          <a
            href="/panduan"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white transition-colors ml-auto group"
          >
            <span>Panduan Operasional Balai</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </div>

      {/* INDIKATOR KINERJA 2026 CARD (4 Cols) */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-[#dce8dd] dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-[#edf3ee] dark:border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              INDIKATOR KINERJA 2026
            </span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              Realisasi Patroli &amp; Layanan
            </h4>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#dff0e2] text-[#1e5433] border border-[#dce8dd]">
            +3.2%
          </span>
        </div>

        <div className="my-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                94.8%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                target tercapai
              </span>
            </div>
            <span className="text-xs font-bold text-[#1e5433] dark:text-emerald-400">
              142/150 ST
            </span>
          </div>

          <div className="w-full bg-[#edf3ee] dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-3.5">
            <div className="bg-[#1e5433] h-2 rounded-full" style={{ width: "94.8%" }} />
          </div>

          {/* Mini Weekly Bar Chart (Sen - Jum) */}
          <div className="grid grid-cols-5 gap-1.5 pt-1 mb-2 text-center">
            {[
              { day: "Sen", active: false },
              { day: "Sel", active: false },
              { day: "Rab", active: true },
              { day: "Kam", active: false },
              { day: "Jum", active: false },
            ].map((col) => (
              <div key={col.day} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full h-7 rounded-md transition-colors",
                    col.active
                      ? "bg-[#1e5433] shadow-xs"
                      : "bg-[#d5e8d9]/70 dark:bg-slate-800 hover:bg-[#d5e8d9]"
                  )}
                />
                <span className={cn("text-[10px] font-medium", col.active ? "text-[#1e5433] dark:text-emerald-300 font-bold" : "text-slate-400")}>
                  {col.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[#edf3ee] dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sinkron Terakhir: 10:45
          </span>
          <button
            type="button"
            onClick={onOpenSuratTugasTab}
            className="font-bold text-[#1e5433] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Rekapitulasi</span>
            <span className="text-[11px]">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
