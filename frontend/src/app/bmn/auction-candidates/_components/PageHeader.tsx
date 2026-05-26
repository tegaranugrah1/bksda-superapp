"use client";

import { ArrowLeft, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  orderedIdsLength: number;
  onResetSelection: () => void;
}

export function PageHeader({
  orderedIdsLength,
  onResetSelection,
}: PageHeaderProps) {
  const hasSelection = orderedIdsLength === 0;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
