"use client";

import React from "react";
import { Award, Calendar, FileCheck, Package } from "lucide-react";
import { motion, type Variants } from "framer-motion";

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
};

export function PortalQuickStats({
  rank,
  activeSuratTugasCount,
  myAssetsCount,
  leaveBalance,
  year,
  onSelectTab,
}: PortalQuickStatsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
    >
      {/* 1. PANGKAT & GOLONGAN */}
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.98 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-sm transition-shadow flex items-start gap-3 select-none"
      >
        <div className="p-2 rounded-xl bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 shrink-0 border border-[#dbeafe] dark:border-blue-900/40">
          <Award className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[9.5px] uppercase font-bold tracking-tight text-slate-400 truncate">Pangkat / Golongan</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {rank || "-"}
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            {rank ? "Golongan Aktif" : "Non-PNS / Belum Diatur"}
          </p>
        </div>
      </motion.div>

      {/* 2–4. INTERAKTIF STAT CARDS */}
      {([
        {
          tab: "cuti" as const,
          icon: Calendar,
          iconBoxClass:
            "bg-[#fffbeb] dark:bg-amber-950/60 text-[#d97706] dark:text-amber-400 border-[#fef3c7] dark:border-amber-900/40",
          label: `Sisa Cuti (${year || new Date().getFullYear()})`,
          value: leaveBalance ? `${leaveBalance.sisa_cuti_tersedia} Hari Kerja` : "-",
          subtitle:
            leaveBalance && (leaveBalance.pending_cuti_tahunan ?? 0) > 0
              ? `${leaveBalance.pending_cuti_tahunan} Hari Diajukan`
              : "Cuti Tahunan Ready",
          subtitleClass: "text-[#d97706] dark:text-amber-400",
        },
        {
          tab: "surat_tugas" as const,
          icon: FileCheck,
          iconBoxClass:
            "bg-[#faf5ff] dark:bg-purple-950/60 text-[#9333ea] dark:text-purple-400 border-[#f3e8ff] dark:border-purple-900/40",
          label: "Surat Tugas",
          value: `${activeSuratTugasCount} ST Aktif`,
          subtitle: activeSuratTugasCount > 0 ? "Dalam Penugasan" : "Tidak Ada Penugasan",
          subtitleClass: "text-[#9333ea] dark:text-purple-400",
        },
        {
          tab: "aset" as const,
          icon: Package,
          iconBoxClass:
            "bg-[#e4f0e6] dark:bg-emerald-950/60 text-[#1e5433] dark:text-emerald-400 border-[#dce8dd] dark:border-emerald-800/40",
          label: "Aset Saya",
          value: `${myAssetsCount} Barang / Alat`,
          subtitle: myAssetsCount > 0 ? "Dalam Penguasaan" : "Tidak Ada Aset",
          subtitleClass: "text-[#1e5433] dark:text-emerald-400",
        },
      ]).map(({ tab, icon: Icon, iconBoxClass, label, value, subtitle, subtitleClass }) => (
        <motion.div
          key={tab}
          role="button"
          tabIndex={0}
          variants={itemVariants}
          whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelectTab?.(tab)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectTab?.(tab);
            }
          }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-sm hover:border-[#1e5433]/40 dark:hover:border-emerald-700 transition-all flex items-start gap-3 cursor-pointer select-none"
        >
          <div className={`p-2 rounded-xl shrink-0 border ${iconBoxClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9.5px] uppercase font-bold tracking-tight text-slate-400 truncate">
              {label}
            </p>
            <p className="text-xs font-bold text-slate-900 dark:text-white">{value}</p>
            <p className={`text-[10px] font-semibold truncate ${subtitleClass}`}>{subtitle}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
