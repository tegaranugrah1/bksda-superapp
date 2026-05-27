"use client";

import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentActionsProps {
  orderedIdsLength: number;
  onProcess: () => void;
  onProcessSk: () => void;
  onProcessSkPanitia: () => void;
  onProcessSkTimPenilai: () => void;
  onProcessSptjLimit: () => void;
  onProcessSptjm: () => void;
  onProcessSpTugas: () => void;
  onProcessSkKebenaran: () => void;
  onProcessBaPemeriksaan: () => void;
}

export function DocumentActions({
  orderedIdsLength,
  onProcess,
  onProcessSk,
  onProcessSkPanitia,
  onProcessSkTimPenilai,
  onProcessSptjLimit,
  onProcessSptjm,
  onProcessSpTugas,
  onProcessSkKebenaran,
  onProcessBaPemeriksaan,
}: DocumentActionsProps) {
  const noSelection = orderedIdsLength === 0;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-zinc-400" />
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Generate Dokumen Lelang
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-red-600 py-2.5 text-xs hover:bg-red-500"
          onClick={onProcess}
          disabled={noSelection}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">BA Koreksi</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-amber-600 py-2.5 text-xs hover:bg-amber-500"
          onClick={onProcessSk}
          disabled={noSelection}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SK Penghentian</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-teal-600 py-2.5 text-xs hover:bg-teal-500"
          onClick={onProcessSkPanitia}
          disabled={noSelection}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SK Panitia</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-emerald-600 py-2.5 text-xs hover:bg-emerald-500"
          onClick={onProcessSkTimPenilai}
          disabled={noSelection}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SK Tim Penilai</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-orange-600 py-2.5 text-xs hover:bg-orange-500"
          onClick={onProcessBaPemeriksaan}
          disabled={noSelection}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">BA Pemeriksaan</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-cyan-600 py-2.5 text-xs hover:bg-cyan-500"
          onClick={onProcessSkKebenaran}
          disabled={noSelection}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SK Kebenaran</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-blue-600 py-2.5 text-xs hover:bg-blue-500"
          onClick={onProcessSptjLimit}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SPTJ Limit</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-purple-600 py-2.5 text-xs hover:bg-purple-500"
          onClick={onProcessSptjm}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SPTJM</span>
        </Button>
        <Button
          size="sm"
          className="h-auto rounded-xl gap-2 bg-pink-600 py-2.5 text-xs hover:bg-pink-500"
          onClick={onProcessSpTugas}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SP Tugas</span>
        </Button>
      </div>
      {noSelection && (
        <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
          Pilih aset di bawah untuk mengaktifkan dokumen yang memerlukan tabel lampiran.
        </p>
      )}
    </div>
  );
}
