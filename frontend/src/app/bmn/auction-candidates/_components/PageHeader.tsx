"use client";

import { ArrowLeft, FileText, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  orderedIdsLength: number;
  onResetSelection: () => void;
  onProcess: () => void;
  onProcessSk: () => void;
  onProcessSkPanitia: () => void;
  onProcessSptjLimit: () => void;
  onProcessSptjm: () => void;
  onProcessSpTugas: () => void;
  onProcessSkKebenaran: () => void;
  onProcessBaPemeriksaan: () => void;
}

export function PageHeader({
  orderedIdsLength,
  onResetSelection,
  onProcess,
  onProcessSk,
  onProcessSkPanitia,
  onProcessSptjLimit,
  onProcessSptjm,
  onProcessSpTugas,
  onProcessSkKebenaran,
  onProcessBaPemeriksaan,
}: PageHeaderProps) {
  const hasSelection = orderedIdsLength === 0;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Aset Akan Di Lelang</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Kandidat aset kondisi Rusak Berat untuk proses koreksi dan dokumen lelang.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-2 text-xs"
          onClick={onResetSelection}
          disabled={hasSelection}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Reset Pilihan
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-red-600 text-xs hover:bg-red-500"
          onClick={onProcess}
          disabled={hasSelection}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses BA Koreksi
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-amber-600 text-xs hover:bg-amber-500"
          onClick={onProcessSk}
          disabled={hasSelection}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses SK Penghentian
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-teal-600 text-xs hover:bg-teal-500"
          onClick={onProcessSkPanitia}
          disabled={hasSelection}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses SK Panitia
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-blue-600 text-xs hover:bg-blue-500"
          onClick={onProcessSptjLimit}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses SPTJ Limit
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-purple-600 text-xs hover:bg-purple-500"
          onClick={onProcessSptjm}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses SPTJM
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-pink-600 text-xs hover:bg-pink-500"
          onClick={onProcessSpTugas}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses SP Tugas
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-cyan-600 text-xs hover:bg-cyan-500"
          onClick={onProcessSkKebenaran}
          disabled={hasSelection}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses SK Kebenaran
        </Button>
        <Button
          size="sm"
          className="rounded-xl gap-2 bg-orange-600 text-xs hover:bg-orange-500"
          onClick={onProcessBaPemeriksaan}
          disabled={hasSelection}
        >
          <FileText className="h-3.5 w-3.5" />
          Proses BA Pemeriksaan
        </Button>
      </div>
    </div>
  );
}
