"use client";

import React from "react";
import { Sun, Sunset, Moon, Sparkles, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalHeaderBannerProps {
  displayName: string;
  activeSuratTugasCount: number;
  onOpenVisum?: () => void;
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: "Selamat Pagi", icon: <Sun className="w-5 h-5 text-amber-300" /> };
  if (hour >= 11 && hour < 15) return { text: "Selamat Siang", icon: <Sun className="w-5 h-5 text-amber-300" /> };
  if (hour >= 15 && hour < 18) return { text: "Selamat Sore", icon: <Sunset className="w-5 h-5 text-amber-400" /> };
  return { text: "Selamat Malam", icon: <Moon className="w-5 h-5 text-indigo-300" /> };
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
}: PortalHeaderBannerProps) {
  const greeting = getGreeting();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 md:p-7 text-white shadow-md">
      {/* Ambient background decoration glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold tracking-wide">
            {greeting.icon}
            <span>{formatDate()}</span>
            <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
            <span className="bg-emerald-900/60 px-2.5 py-0.5 rounded-full text-[11px] text-emerald-200 border border-emerald-500/30 font-medium">
              {activeSuratTugasCount} Surat Tugas Aktif
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>{greeting.text}, {displayName.split(",")[0]}!</span>
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse hidden sm:inline-block" />
          </h1>
          <p className="text-xs md:text-sm text-emerald-100/90 font-medium max-w-2xl">
            Selamat datang di Portal Layanan Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur.
          </p>
        </div>

        {onOpenVisum && (
          <div className="shrink-0 pt-2 md:pt-0">
            <Button
              type="button"
              onClick={onOpenVisum}
              className="rounded-2xl border border-amber-300/40 bg-amber-400/20 px-4 py-2.5 text-xs font-bold text-amber-100 shadow-sm backdrop-blur-xs hover:bg-amber-400/30 hover:text-white transition-all"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-amber-300" />
              Buat Visum SPD
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
