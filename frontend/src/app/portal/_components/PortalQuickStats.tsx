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
  isMmp?: boolean;
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
  isMmp = false,
}: PortalQuickStatsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
    >
      {/* 1. PANGKAT & GOLONGAN (compact 4-up strip: uses 10px/12px scale inside narrow 2xl:col-span-6 so labels never clip) */}
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.98 }}
        className="bg-[var(--ds-surface)] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3 shadow-xs hover:border-[var(--ds-border-control)] transition-colors flex items-start gap-2.5 select-none"
      >
        <div className="p-2 rounded-lg bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] shrink-0 border border-[var(--ds-status-info-border)]">
          <Award className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] leading-tight uppercase font-bold tracking-tight text-[var(--ds-fg-muted)]">Pangkat / Golongan</p>
          <p className="text-xs leading-snug font-bold text-[var(--ds-fg)] tabular-nums break-words">
            {rank || "-"}
          </p>
          <p className="text-[10px] leading-snug text-[var(--ds-fg-muted)]">
            {rank ? "Golongan Aktif" : "Non-PNS / Belum Diatur"}
          </p>
        </div>
      </motion.div>

      {/* 2–4. INTERAKTIF STAT CARDS */}
      {([
        ...(!isMmp ? [{
          tab: "cuti" as const,
          icon: Calendar,
          iconBoxClass:
            "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]",
          label: `Sisa Cuti (${year || new Date().getFullYear()})`,
          value: leaveBalance ? `${leaveBalance.sisa_cuti_tersedia} Hari Kerja` : "-",
          subtitle:
            leaveBalance && (leaveBalance.pending_cuti_tahunan ?? 0) > 0
              ? `${leaveBalance.pending_cuti_tahunan} Hari Diajukan`
              : "Cuti Tahunan Ready",
          subtitleClass: "text-[var(--ds-status-warning-fg)]",
        }] : []),
        {
          tab: "surat_tugas" as const,
          icon: FileCheck,
          iconBoxClass:
            "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
          label: "Surat Tugas",
          value: `${activeSuratTugasCount} ST Aktif`,
          subtitle: activeSuratTugasCount > 0 ? "Dalam Penugasan" : "Tidak Ada Penugasan",
          subtitleClass: "text-sky-700 dark:text-sky-300",
        },
        {
          tab: "aset" as const,
          icon: Package,
          iconBoxClass:
            "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]",
          label: "Aset Saya",
          value: `${myAssetsCount} Barang / Alat`,
          subtitle: myAssetsCount > 0 ? "Dalam Penguasaan" : "Tidak Ada Aset",
          subtitleClass: "text-[var(--ds-accent-fg)]",
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
          className="bg-[var(--ds-surface)] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3 shadow-xs hover:border-[var(--ds-border-control)] transition-colors flex items-start gap-2.5 cursor-pointer select-none"
        >
          <div className={`p-2 rounded-lg shrink-0 border ${iconBoxClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] leading-tight uppercase font-bold tracking-tight text-[var(--ds-fg-muted)]">
              {label}
            </p>
            <p className="text-xs leading-snug font-bold text-[var(--ds-fg)] tabular-nums break-words">{value}</p>
            <p className={`text-[10px] leading-snug font-semibold tabular-nums ${subtitleClass}`}>{subtitle}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
