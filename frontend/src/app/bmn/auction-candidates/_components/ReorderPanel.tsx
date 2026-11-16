"use client";

import { ArrowDown, ArrowUp, FileSpreadsheet, GripVertical } from "lucide-react";
import type { AuctionAsset } from "../_lib/auction-helpers";

interface ReorderPanelProps {
  orderedIds: string[];
  orderedSelectedAssets: AuctionAsset[];
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onOpenWorksheet?: (assetId: string) => void;
}

export function ReorderPanel({
  orderedIds,
  orderedSelectedAssets,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onOpenWorksheet,
}: ReorderPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs print:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--ds-fg)]">Urutan Aset Terpilih</h2>
          <p className="text-xs text-[var(--ds-fg-muted)]">
            Drag atau gunakan tombol naik/turun untuk mengatur nomor urut di dokumen.
          </p>
        </div>
        <span className="rounded-full border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--ds-accent-fg)] tabular-nums">
          {orderedIds.length} aset
        </span>
      </div>
      <ol className="space-y-2">
        {orderedSelectedAssets.map((asset, index) => (
          <li
            key={asset.id}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragEnter={() => onDragEnter(index)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => event.preventDefault()}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] px-3 py-2 transition active:cursor-grabbing active:opacity-60"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-[var(--ds-fg-muted)]" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-accent-solid)] text-xs font-bold text-[var(--ds-accent-on-solid)] tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--ds-fg)]">{asset.nama_barang}</p>
              <p className="truncate font-mono text-xs text-[var(--ds-fg-muted)] tabular-nums">
                {asset.kode_barang} - NUP {asset.nup}
                {asset.merk_tipe ? ` - ${asset.merk_tipe}` : ""}
                {asset.no_polisi ? ` - ${asset.no_polisi}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {onOpenWorksheet && (
                <button
                  type="button"
                  onClick={() => onOpenWorksheet(asset.id)}
                  aria-label={`Buka kertas kerja aset nomor ${index + 1}`}
                  className="flex h-8 items-center gap-1 rounded-lg border border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface)] px-2 text-xs font-semibold text-[var(--ds-accent-fg)] transition hover:bg-[var(--ds-accent-soft)] tabular-nums"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Kertas #{index + 1}
                </button>
              )}
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label="Pindah ke atas"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] transition hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-fg)] disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === orderedIds.length - 1}
                aria-label="Pindah ke bawah"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] transition hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-fg)] disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
