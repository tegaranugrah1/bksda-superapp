"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  X,
  Loader2,
  CheckCircle2,
  TableProperties,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { KepegawaianDialog } from "@/app/kepegawaian/_components/KepegawaianDialog";

interface ExportSuratMasukModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSearch?: string;
  totalCurrentItems?: number;
}

type ExportPeriod = "all" | "current_filter" | "this_month" | "this_year" | "custom";

export function ExportSuratMasukModal({
  isOpen,
  onClose,
  currentSearch = "",
  totalCurrentItems = 0,
}: ExportSuratMasukModalProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [period, setPeriod] = useState<ExportPeriod>(currentSearch ? "current_filter" : "all");
  const [startDate, setStartDate] = useState<string>(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
  );
  const [endDate, setEndDate] = useState<string>(
    currentDate.toISOString().substring(0, 10)
  );
  const [selectedYear] = useState<number>(currentYear);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsExporting(true);

      const params: Record<string, string | number> = {};

      if (period === "current_filter" && currentSearch.trim()) {
        params.search = currentSearch.trim();
      } else if (period === "this_month") {
        params.year = currentYear;
        params.month = currentMonth;
      } else if (period === "this_year") {
        params.year = selectedYear;
      } else if (period === "custom") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const res = await api.get("/surat-masuk/export/excel", {
        params,
        responseType: "blob",
        timeout: 60000,
      });

      let filename = `Rekap_Surat_Masuk_BKSDA_${new Date().toISOString().substring(0, 10)}.xlsx`;
      if (period === "this_month") {
        filename = `Rekap_Surat_Masuk_BKSDA_${currentYear}_${String(currentMonth).padStart(2, "0")}.xlsx`;
      } else if (period === "this_year") {
        filename = `Rekap_Surat_Masuk_BKSDA_${selectedYear}.xlsx`;
      } else if (period === "custom" && startDate && endDate) {
        filename = `Rekap_Surat_Masuk_BKSDA_${startDate}_sd_${endDate}.xlsx`;
      }

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Laporan Excel Surat Masuk berhasil diunduh!");
      onClose();
    } catch (err: any) {
      console.error("Export error", err);
      toast.error("Gagal mengunduh laporan Excel. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const getOptionClass = (active: boolean) =>
    `flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
      active
        ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
        : "border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface)] text-[var(--ds-fg)]"
    }`;

  return (
    <KepegawaianDialog
      title="Export Laporan Surat Masuk"
      onClose={onClose}
      busy={isExporting}
      module="persuratan"
      className="sm:max-w-lg overflow-hidden"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--ds-fg)]">
              Export Laporan Surat Masuk
            </h2>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Unduh rekapitulasi data arsip surat masuk ke format Excel (.xlsx)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog export"
          className="rounded-lg p-2 text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-fg)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-6 space-y-4">
        {/* Periode Options */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)]">
            Pilih Rentang / Periode Data
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentSearch.trim() && (
              <button
                type="button"
                aria-pressed={period === "current_filter"}
                onClick={() => setPeriod("current_filter")}
                className={`${getOptionClass(period === "current_filter")} col-span-full`}
              >
                <Filter className="h-4 w-4 mt-1 shrink-0 text-[var(--ds-accent-fg)]" />
                <div className="text-xs">
                  <div className="font-semibold">Filter Pencarian Saat Ini</div>
                  <div className="text-xs opacity-80 mt-1">
                    Keyword: &quot;{currentSearch}&quot; ({totalCurrentItems} surat ditemukan)
                  </div>
                </div>
              </button>
            )}

            <button
              type="button"
              aria-pressed={period === "all"}
              onClick={() => setPeriod("all")}
              className={getOptionClass(period === "all")}
            >
              <TableProperties className="h-4 w-4 mt-1 shrink-0 text-[var(--ds-accent-fg)]" />
              <div className="text-xs">
                <div className="font-semibold">Semua Data</div>
                <div className="text-xs opacity-80 mt-1">Seluruh arsip surat masuk</div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={period === "this_month"}
              onClick={() => setPeriod("this_month")}
              className={getOptionClass(period === "this_month")}
            >
              <Calendar className="h-4 w-4 mt-1 shrink-0 text-[var(--ds-accent-fg)]" />
              <div className="text-xs">
                <div className="font-semibold">Bulan Ini</div>
                <div className="text-xs opacity-80 mt-1">
                  {monthNames[currentMonth - 1]} {currentYear}
                </div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={period === "this_year"}
              onClick={() => setPeriod("this_year")}
              className={getOptionClass(period === "this_year")}
            >
              <Calendar className="h-4 w-4 mt-1 shrink-0 text-[var(--ds-accent-fg)]" />
              <div className="text-xs">
                <div className="font-semibold">Tahun {currentYear}</div>
                <div className="text-xs opacity-80 mt-1">Rekap 1 tahun anggaran</div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={period === "custom"}
              onClick={() => setPeriod("custom")}
              className={getOptionClass(period === "custom")}
            >
              <Filter className="h-4 w-4 mt-1 shrink-0 text-[var(--ds-accent-fg)]" />
              <div className="text-xs">
                <div className="font-semibold">Rentang Kustom</div>
                <div className="text-xs opacity-80 mt-1">Pilih tanggal spesifik</div>
              </div>
            </button>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {period === "custom" && (
          <div className="p-4 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                  Dari Tanggal
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--ds-fg-muted)]">
                  Sampai Tanggal
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Kolom Information Info Box */}
        <div className="rounded-lg border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ds-accent-fg)] mb-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--ds-accent-fg)]" />
            <span>Format 7 Kolom Excel:</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--ds-fg-muted)]">
            <div>1. <b>No Agenda</b></div>
            <div>2. <b>Tanggal</b> (Penerimaan)</div>
            <div>3. <b>No Surat</b></div>
            <div>4. <b>Tanggal Surat</b></div>
            <div>5. <b>Asal Surat</b></div>
            <div>6. <b>Lampiran</b></div>
            <div className="col-span-2">7. <b>Isi Surat</b> (Isi Ringkas / Perihal)</div>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/30 px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isExporting}
          className="kpg-secondary h-9 text-xs font-medium rounded-lg"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={isExporting}
          className="h-9 px-4 text-xs font-bold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyiapkan Excel...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Excel (.xlsx)
            </>
          )}
        </Button>
      </div>
    </KepegawaianDialog>
  );
}
