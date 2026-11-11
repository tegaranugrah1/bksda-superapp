"use client";

import React from "react";
import Link from "next/link";
import { Plus, Loader2, ClipboardList, FileText, Eye, ChevronDown, FileSpreadsheet, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div data-module="surat-tugas" className="st-ui bg-[var(--ds-surface)] p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">Surat Tugas Saya</h3>
          <p className="text-xs text-[var(--ds-fg-muted)]">Ajukan permohonan surat tugas pegawai & buat laporan kegiatan.</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenReportModal && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--ds-status-success-border)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)] font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                  Buat Laporan
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-module="surat-tugas" align="end" className="st-ui w-64 p-1.5 rounded-2xl shadow-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
                <DropdownMenuItem
                  onClick={() => onOpenReportModal("general")}
                  className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-[var(--ds-surface-muted)] text-xs font-semibold text-[var(--ds-fg-muted)] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold leading-tight">Laporan Pelaksanaan</p>
                    <p className="text-xs text-[var(--ds-fg-muted)] font-normal">Format resmi Surat Tugas BKSDA</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onOpenReportModal("smart_patrol")}
                  className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-[var(--ds-surface-muted)] text-xs font-semibold text-[var(--ds-fg-muted)] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold leading-tight">Laporan SMART PATROL</p>
                    <p className="text-xs text-[var(--ds-fg-muted)] font-normal">Form Patroli Kawasan</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button asChild size="sm" className="font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-colors st-primary">
            <Link href="/surat-tugas">
              <Plus className="w-4 h-4" />
              Ajukan Surat Tugas
            </Link>
          </Button>
        </div>
      </div>

      {stLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-status-success-fg)]" />
        </div>
      ) : suratTugas.length === 0 ? (
        <div className="p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-[var(--ds-fg-muted)]" />
          <p className="text-sm text-[var(--ds-fg-muted)]">Belum ada surat tugas yang diterbitkan</p>
        </div>
      ) : (
        <div
          className="divide-y divide-[var(--ds-border-subtle)]"
        >
          {suratTugas.map((st) => (
            <div
              key={st.id}
              className="st-portal-row p-4 hover:bg-[var(--ds-surface-muted)] transition-colors flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--ds-fg)] truncate group-hover:text-[var(--ds-status-success-fg)] transition-colors">{st.maksud_tujuan}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {st.nomor_surat && <span className="text-xs font-bold text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)] px-2 py-0.5 rounded-full">{st.nomor_surat}</span>}
                  {st.status && (
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      ["diterbitkan", "disetujui", "approved", "completed", "published"].includes(st.status.toLowerCase())
                        ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]"
                        : st.status.toLowerCase() === "pending"
                        ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]"
                        : st.status.toLowerCase() === "rejected"
                        ? "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]"
                        : "bg-[var(--ds-status-neutral-bg)] text-[var(--ds-status-neutral-fg)]"
                    )}>
                      {st.status}
                    </span>
                  )}
                  <span className="text-xs text-[var(--ds-fg-muted)]">
                    {formatDateRangeIndonesian(st.tanggal_mulai, st.tanggal_selesai)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onOpenKalkulator && (
                  <button
                    type="button"
                    onClick={() => onOpenKalkulator(st.id)}
                    className="p-2 rounded-lg hover:bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] transition-colors cursor-pointer"
                    title="Hitung Biaya & Pengeluaran Dinas"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                )}
                <button
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
                  className="p-2 rounded-lg hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] transition-colors disabled:opacity-50 cursor-pointer"
                  title="Lihat"
                >
                  {activeLoadingId === st.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
