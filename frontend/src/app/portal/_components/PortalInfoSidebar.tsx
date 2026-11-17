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
        className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs transition-colors space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--ds-fg)] border-b border-slate-200/70 dark:border-zinc-800 pb-2">
          <Megaphone className="w-4 h-4 text-[var(--ds-accent-fg)]" />
          <span>Pengumuman Resmi</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1 p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 transition-colors hover:border-[var(--ds-border-control)]">
            <span className="inline-block text-xs font-bold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-2 py-1 rounded-full border border-[var(--ds-accent-soft-border)] tabular-nums">
              DIPA 2026
            </span>
            <p className="font-semibold text-[var(--ds-fg)] pt-1">
              Pembaruan Tata Kerja & DIPA TA 2026
            </p>
            <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-2 tabular-nums">
              DIPA Balai KSDA Kalimantan Timur Nomor: DIPA-143.04.2.693614/2026 terbit 08 Juli 2026.
            </p>
          </div>

          <div className="space-y-1 p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 transition-colors hover:border-[var(--ds-border-control)]">
            <span className="inline-block text-xs font-bold text-[var(--ds-status-info-fg)] bg-[var(--ds-status-info-bg)] px-2 py-1 rounded-full border border-[var(--ds-status-info-border)]">
              ASET BMN
            </span>
            <p className="font-semibold text-[var(--ds-fg)] pt-1">
              Inventarisasi BMN Berkala
            </p>
            <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-2">
              Pelaksanaan opname fisik ATK & BMN di Seksi KSDA Wilayah I Berau dan Seksi Wilayah II Tenggarong.
            </p>
          </div>
        </div>
      </motion.div>

      {/* WIDGET 2: PANDUAN LAPORAN SURAT TUGAS */}
      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        className="bg-linear-to-br from-[#164227] to-[#153e24] text-white rounded-3xl p-4 shadow-xs transition-colors space-y-3 border border-[#164227]"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
          <BookOpen className="w-4 h-4" />
          <span>Panduan Laporan ST</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed tabular-nums">
          Setiap Surat Tugas wajib dibuatkan Laporan Pelaksanaan paling lambat <span className="text-emerald-300 font-bold">7 hari kerja</span> setelah selesai kegiatan.
        </p>
        <div className="pt-1">
          {onOpenReport ? (
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-all hover:translate-x-1 cursor-pointer"
            >
              <span>Format Laporan Resmi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span>Format Laporan Resmi</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </motion.div>

      {/* WIDGET 3: PUSAT BANTUAN */}
      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs transition-colors space-y-2 text-xs"
      >
        <div className="flex items-center gap-2 font-bold text-[var(--ds-fg)]">
          <HelpCircle className="w-4 h-4 text-[var(--ds-accent-fg)]" />
          <span>Pusat Bantuan Subbag TU</span>
        </div>
        <p className="text-[var(--ds-fg-muted)] text-xs">
          Kendala akun, reset password, atau modul akses? Hubungi Admin Subbag Tata Usaha BKSDA Kaltim.
        </p>
        <p className="text-[var(--ds-accent-fg)] font-mono font-bold text-xs pt-1">
          tu.bksdakaltim@ksdae.go.id
        </p>
      </motion.div>
    </aside>
  );
}
