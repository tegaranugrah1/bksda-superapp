"use client";

import React from "react";
import { Sun, Sunset, Moon, FileSpreadsheet, Calculator, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PortalHeaderBannerProps {
  displayName: string;
  onOpenVisum?: () => void;
  onOpenKalkulator?: () => void;
  className?: string;
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: "Selamat Pagi", icon: <Sun className="w-4 h-4 text-emerald-200" /> };
  if (hour >= 11 && hour < 15) return { text: "Selamat Siang", icon: <Sun className="w-4 h-4 text-amber-300" /> };
  if (hour >= 15 && hour < 18) return { text: "Selamat Sore", icon: <Sunset className="w-4 h-4 text-amber-400" /> };
  return { text: "Selamat Malam", icon: <Moon className="w-4 h-4 text-indigo-300" /> };
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
  onOpenVisum,
  onOpenKalkulator,
  className,
}: PortalHeaderBannerProps) {
  const greeting = getGreeting();

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e5433] via-[#164227] to-[#153e24] p-5 sm:p-6 text-white shadow-sm border border-[#164227] flex flex-col justify-between", className)}>
      {/* Ambient background decoration glow */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.18, 0.3, 0.18],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.28, 0.15],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col justify-between h-full gap-4">
        {/* Top: Tanggal Hari Ini */}
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold tracking-wide">
          <div className="inline-flex items-center gap-1.5">
            {greeting.icon}
            <span>{formatDate()}</span>
          </div>
        </div>

        {/* Middle: Title & Subtitle without AI sparkles */}
        <div className="space-y-1.5 my-auto py-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
            {greeting.text}, {((displayName || "").trim() || "Pegawai").split(",")[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-2xl leading-relaxed">
            Pusat layanan operasional konservasi sumber daya alam, administrasi kepegawaian ASN, serta tata kelola kehutanan terpadu BKSDA Kalimantan Timur.
          </p>
        </div>

        {/* Bottom: Action Buttons & Sistem Terintegrasi Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenKalkulator && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="button"
                  onClick={onOpenKalkulator}
                  className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs backdrop-blur-xs hover:bg-white/20 hover:text-white transition-all cursor-pointer"
                >
                  <Calculator className="mr-1.5 h-4 w-4 text-emerald-200" />
                  Kalkulator Dinas
                </Button>
              </motion.div>
            )}

            {onOpenVisum && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="button"
                  onClick={onOpenVisum}
                  className="rounded-xl border border-white/20 bg-white px-3.5 py-2 text-xs font-bold text-[#1e5433] shadow-xs backdrop-blur-xs hover:bg-[#edf3ee] transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="mr-1.5 h-4 w-4 text-amber-500" />
                  Buat Visum SPD
                </Button>
              </motion.div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-200/80 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Sistem Terintegrasi Kemenhut</span>
          </div>
        </div>
      </div>
    </div>
  );
}
