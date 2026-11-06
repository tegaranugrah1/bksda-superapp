"use client";

import React from "react";
import Link from "next/link";
import { Plus, Loader2, ClipboardList, FileText, Eye, ChevronDown, FileSpreadsheet, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateRangeIndonesian } from "@/lib/letter-utils";

interface SuratTugasItem {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  file_surat_path: string | null;
}

interface SuratTugasTabProps {
  stLoading: boolean;
  suratTugas: SuratTugasItem[];
  fetchSTDetail: (id: string) => Promise<void>;
  stDetailLoading: boolean;
  onOpenReportModal: (type: "general" | "smart_patrol") => void;
  onOpenKalkulator?: (stId: string) => void;
}

export function SuratTugasTab({
  stLoading,
  suratTugas,
  fetchSTDetail,
  stDetailLoading,
  onOpenReportModal,
  onOpenKalkulator,
}: SuratTugasTabProps) {
  const [activeLoadingId, setActiveLoadingId] = React.useState<string | null>(null);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Surat Tugas Saya</h3>
          <p className="text-xs text-slate-500">Ajukan permohonan surat tugas pegawai & buat laporan kegiatan.</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenReportModal && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all active:scale-97"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Buat Laporan
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <DropdownMenuItem
                  onClick={() => onOpenReportModal("general")}
                  className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold leading-tight">1. Laporan Pelaksanaan</p>
                    <p className="text-[10px] text-slate-400 font-normal">Format resmi Surat Tugas BKSDA</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onOpenReportModal("smart_patrol")}
                  className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold leading-tight">2. Laporan SMART PATROL</p>
                    <p className="text-[10px] text-slate-400 font-normal">Form Patroli Kawasan</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Link href="/surat-tugas/usulan">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all active:scale-97">
              <Plus className="w-4 h-4" />
              Ajukan Surat Tugas
            </Button>
          </Link>
        </div>
      </div>

      {stLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : suratTugas.length === 0 ? (
        <div className="p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada surat tugas yang diterbitkan</p>
        </div>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.04 },
            },
          }}
          initial="hidden"
          animate="show"
          className="divide-y divide-slate-100 dark:divide-zinc-800"
        >
          {suratTugas.map((st) => (
            <motion.div
              key={st.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
              }}
              className="p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{st.maksud_tujuan}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {st.nomor_surat && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{st.nomor_surat}</span>}
                  {st.status && (
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      ["diterbitkan", "disetujui", "approved", "completed", "published"].includes(st.status.toLowerCase())
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : ["pending", "draft"].includes(st.status.toLowerCase())
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    )}>
                      {st.status}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatDateRangeIndonesian(st.tanggal_mulai, st.tanggal_selesai)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onOpenKalkulator && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => onOpenKalkulator(st.id)}
                    className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 transition-colors cursor-pointer"
                    title="Hitung Biaya & Pengeluaran Dinas"
                  >
                    <Calculator className="w-4 h-4" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={async () => {
                    setActiveLoadingId(st.id);
                    try {
                      await fetchSTDetail(st.id);
                    } finally {
                      setActiveLoadingId(null);
                    }
                  }}
                  disabled={stDetailLoading}
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Lihat"
                >
                  {activeLoadingId === st.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
