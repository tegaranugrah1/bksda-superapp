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
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
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

      // Extract filename from header or build sensible default
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Export Laporan Surat Masuk
              </h2>
              <p className="text-xs text-zinc-500">
                Unduh rekapitulasi data arsip surat masuk ke format Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Periode Options */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Pilih Rentang / Periode Data
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setPeriod("current_filter")}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all col-span-full ${
                    period === "current_filter"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <Filter className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-xs">
                    <div className="font-semibold">Filter Pencarian Saat Ini</div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      Keyword: &quot;{currentSearch}&quot; ({totalCurrentItems} surat ditemukan)
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPeriod("all")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  period === "all"
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <TableProperties className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs">
                  <div className="font-semibold">Semua Data</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Seluruh arsip surat masuk</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPeriod("this_month")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  period === "this_month"
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs">
                  <div className="font-semibold">Bulan Ini</div>
                  <div className="text-[11px] opacity-75 mt-0.5">
                    {monthNames[currentMonth - 1]} {currentYear}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPeriod("this_year")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  period === "this_year"
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs">
                  <div className="font-semibold">Tahun {currentYear}</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Rekap 1 tahun anggaran</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPeriod("custom")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  period === "custom"
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <Filter className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs">
                  <div className="font-semibold">Rentang Kustom</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Pilih tanggal spesifik</div>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {period === "custom" && (
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Dari Tanggal
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-zinc-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Sampai Tanggal
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kolom Information Info Box */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-950/60 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Format 7 Kolom Excel:</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
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
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/30">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="h-9 text-xs font-medium"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2"
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
      </div>
    </div>
  );
}
