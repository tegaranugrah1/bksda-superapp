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
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]">
          <Gavel className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--ds-fg)]">Aset Akan Di Lelang</h1>
          <p className="mt-1 text-sm text-[var(--ds-fg-muted)]">
            Kandidat aset kondisi Rusak Berat untuk proses koreksi dan dokumen lelang.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg gap-2 text-xs"
        onClick={onResetSelection}
        disabled={hasSelection}
      >
        <ArrowLeft className="h-4 w-4" />
        Reset Pilihan
      </Button>
    </div>
  );
}
