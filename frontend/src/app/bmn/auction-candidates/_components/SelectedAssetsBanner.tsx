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
    <div className="sticky top-4 z-20 flex flex-col gap-3 rounded-3xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface)] px-4 py-3 shadow-xs backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--ds-fg)] tabular-nums">{orderedIdsLength} aset dipilih</p>
          <p className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
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
              className="h-9 shrink-0 rounded-lg border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface)] text-xs font-bold text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)]"
              onClick={action.onClick}
            >
              <Printer className="mr-2 h-4 w-4" />
              Cetak {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
