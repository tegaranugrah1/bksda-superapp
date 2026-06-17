"use client";

import { CheckCircle2, Printer } from "lucide-react";
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
  showNotaDinas: boolean;
  showPermohonanKpknl: boolean;
  onPrint: () => void;
  onPrintSk: () => void;
  onPrintSkPanitia: () => void;
  onPrintSkTimPenilai: () => void;
  onPrintSptjLimit: () => void;
  onPrintSptjm: () => void;
  onPrintSpTugas: () => void;
  onPrintSkKebenaran: () => void;
  onPrintBaPemeriksaan: () => void;
  onPrintNotaDinas: () => void;
  onPrintPermohonanKpknl: () => void;
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
  showNotaDinas,
  showPermohonanKpknl,
  onPrint,
  onPrintSk,
  onPrintSkPanitia,
  onPrintSkTimPenilai,
  onPrintSptjLimit,
  onPrintSptjm,
  onPrintSpTugas,
  onPrintSkKebenaran,
  onPrintBaPemeriksaan,
  onPrintNotaDinas,
  onPrintPermohonanKpknl,
}: SelectedAssetsBannerProps) {
  if (orderedIdsLength === 0) return null;

  const printActions: PrintAction[] = [];
  if (showDocument) printActions.push({ label: "BA Koreksi", onClick: onPrint });
  if (showSkDocument) printActions.push({ label: "SK Penghentian", onClick: onPrintSk });
  if (showSkPanitia) printActions.push({ label: "SK Panitia", onClick: onPrintSkPanitia });
  if (showSkTimPenilai) printActions.push({ label: "SK Tim Penilai", onClick: onPrintSkTimPenilai });
  if (showSptjLimit) printActions.push({ label: "SPTJ Limit", onClick: onPrintSptjLimit });
  if (showSptjm) printActions.push({ label: "SPTJM", onClick: onPrintSptjm });
  if (showSpTugas) printActions.push({ label: "SP Tugas", onClick: onPrintSpTugas });
  if (showSkKebenaran) printActions.push({ label: "SK Kebenaran", onClick: onPrintSkKebenaran });
  if (showBaPemeriksaan) printActions.push({ label: "BA Pemeriksaan", onClick: onPrintBaPemeriksaan });
  if (showNotaDinas) printActions.push({ label: "Nota Dinas", onClick: onPrintNotaDinas });
  if (showPermohonanKpknl) printActions.push({ label: "Permohonan KPKNL", onClick: onPrintPermohonanKpknl });

  return (
    <div className="sticky top-4 z-20 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-sm shadow-emerald-950/5 backdrop-blur dark:border-emerald-500/20 dark:bg-zinc-900/95 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{orderedIdsLength} aset dipilih</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {printActions.length > 0
              ? `${printActions.length} dokumen siap dicetak.`
              : "Lengkapi detail, lalu generate dokumen pada langkah 3."}
          </p>
        </div>
      </div>

      {printActions.length > 0 && (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:justify-end sm:pb-0">
          {printActions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant="outline"
              className="h-9 shrink-0 rounded-lg border-emerald-200 bg-white text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-zinc-950 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
              onClick={action.onClick}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Cetak {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
