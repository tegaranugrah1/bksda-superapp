"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectedAssetsBannerProps {
  orderedIdsLength: number;
  showDocument: boolean;
  showSkDocument: boolean;
  showSkPanitia: boolean;
  showSkTimPenilai: boolean;
  showSptjLimit: boolean;
  showSptjm: boolean;
  showSpTugas: boolean;
  showSkKebenaran: boolean;
  showBaPemeriksaan: boolean;
  onPrint: () => void;
  onPrintSk: () => void;
  onPrintSkPanitia: () => void;
  onPrintSkTimPenilai: () => void;
  onPrintSptjLimit: () => void;
  onPrintSptjm: () => void;
  onPrintSpTugas: () => void;
  onPrintSkKebenaran: () => void;
  onPrintBaPemeriksaan: () => void;
}

interface PrintAction {
  label: string;
  onClick: () => void;
}

export function SelectedAssetsBanner({
  orderedIdsLength,
  showDocument,
  showSkDocument,
  showSkPanitia,
  showSkTimPenilai,
  showSptjLimit,
  showSptjm,
  showSpTugas,
  showSkKebenaran,
  showBaPemeriksaan,
  onPrint,
  onPrintSk,
  onPrintSkPanitia,
  onPrintSkTimPenilai,
  onPrintSptjLimit,
  onPrintSptjm,
  onPrintSpTugas,
  onPrintSkKebenaran,
  onPrintBaPemeriksaan,
}: SelectedAssetsBannerProps) {
  if (orderedIdsLength === 0) return null;

  const printActions: PrintAction[] = [];
  if (showDocument) printActions.push({ label: "Cetak BA Koreksi", onClick: onPrint });
  if (showSkDocument) printActions.push({ label: "Cetak SK Penghentian", onClick: onPrintSk });
  if (showSkPanitia) printActions.push({ label: "Cetak SK Panitia", onClick: onPrintSkPanitia });
  if (showSkTimPenilai) printActions.push({ label: "Cetak SK Tim Penilai", onClick: onPrintSkTimPenilai });
  if (showSptjLimit) printActions.push({ label: "Cetak SPTJ Limit", onClick: onPrintSptjLimit });
  if (showSptjm) printActions.push({ label: "Cetak SPTJM", onClick: onPrintSptjm });
  if (showSpTugas) printActions.push({ label: "Cetak SP Tugas", onClick: onPrintSpTugas });
  if (showSkKebenaran) printActions.push({ label: "Cetak SK Kebenaran", onClick: onPrintSkKebenaran });
  if (showBaPemeriksaan) printActions.push({ label: "Cetak BA Pemeriksaan", onClick: onPrintBaPemeriksaan });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-red-800 dark:text-red-300">{orderedIdsLength} aset dipilih</p>
        <p className="text-xs text-red-700/80 dark:text-red-400">
          {printActions.length > 0
            ? "Klik tombol cetak untuk dokumen yang sudah ter-generate."
            : "Klik salah satu tombol Generate Dokumen di atas untuk membuat dokumen lelang."}
        </p>
      </div>
      {printActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {printActions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant="outline"
              className="rounded-lg border-red-300 bg-white text-xs text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-500/20"
              onClick={action.onClick}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
