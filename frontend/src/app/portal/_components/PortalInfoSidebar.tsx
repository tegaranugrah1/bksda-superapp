"use client";

import React from "react";
import { Megaphone, BookOpen, HelpCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function PortalInfoSidebar({
  isHorizontal = false,
  onOpenReport,
}: {
  isHorizontal?: boolean;
  onOpenReport?: () => void;
}) {
  return (
    <aside
      className={cn(
        "w-full shrink-0",
        isHorizontal
          ? "grid grid-cols-1 md:grid-cols-3 gap-4"
          : "w-full space-y-4"
      )}
    >
      {/* WIDGET 1: PENGUMUMAN BALAI */}
      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-4 shadow-xs hover:shadow-md transition-shadow space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white border-b border-[#edf3ee] dark:border-slate-800 pb-2">
          <Megaphone className="w-4 h-4 text-[#1e5433]" />
          <span>Pengumuman Resmi</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#edf3ee] dark:border-slate-800 transition-colors hover:border-emerald-200">
            <span className="text-[10px] font-bold text-[#1e5433] dark:text-emerald-300 bg-[#dff0e2] dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-[#dce8dd]">
              DIPA 2026
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 pt-1">
              Pembaruan Tata Kerja & DIPA TA 2026
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              DIPA Balai KSDA Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 terbit 08 Juli 2026.
            </p>
          </div>

          <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#edf3ee] dark:border-slate-800 transition-colors hover:border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
              ASET BMN
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 pt-1">
              Inventarisasi BMN Berkala
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              Pelaksanaan opname fisik ATK & BMN di Seksi KSDA Wilayah I Berau dan Seksi Wilayah II Tenggarong.
            </p>
          </div>
        </div>
      </motion.div>

      {/* WIDGET 2: PANDUAN LAPORAN SURAT TUGAS */}
      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        className="bg-gradient-to-br from-[#164227] to-[#153e24] text-white rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow space-y-3 border border-[#164227]"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <BookOpen className="w-4 h-4" />
          <span>Panduan Laporan ST</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Setiap Surat Tugas wajib dibuatkan Laporan Pelaksanaan paling lambat <span className="text-emerald-400 font-bold">7 hari kerja</span> setelah selesai kegiatan.
        </p>
        <div className="pt-1">
          {onOpenReport ? (
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all hover:translate-x-1 cursor-pointer"
            >
              <span>Format Laporan Resmi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span>Format Laporan Resmi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </motion.div>

      {/* WIDGET 3: PUSAT BANTUAN */}
      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-4 shadow-xs hover:shadow-md transition-shadow space-y-2 text-xs"
      >
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <HelpCircle className="w-4 h-4 text-[#1e5433] dark:text-emerald-400" />
          <span>Pusat Bantuan Subbag TU</span>
        </div>
        <p className="text-slate-500 text-[11px]">
          Kendala akun, reset password, atau modul akses? Hubungi Admin Subbag Tata Usaha BKSDA Kaltim.
        </p>
        <p className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px] pt-1">
          tu.bksdakaltim@ksdae.go.id
        </p>
      </motion.div>
    </aside>
  );
}
