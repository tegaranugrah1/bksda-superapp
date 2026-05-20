"use client";

import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import type { AuctionAsset } from "../_lib/auction-helpers";

interface ReorderPanelProps {
  orderedIds: string[];
  orderedSelectedAssets: AuctionAsset[];
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function ReorderPanel({
  orderedIds,
  orderedSelectedAssets,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onMoveUp,
  onMoveDown,
}: ReorderPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Urutan Aset Terpilih</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Drag atau gunakan tombol ↑↓ untuk mengatur nomor urut di dokumen.
          </p>
        </div>
        <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {orderedIds.length} aset
        </span>
      </div>
      <ol className="space-y-1.5">
        {orderedSelectedAssets.map((asset, index) => (
          <li
            key={asset.id}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragEnter={() => onDragEnter(index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex cursor-grab items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 transition active:cursor-grabbing active:opacity-60 dark:border-zinc-800 dark:bg-zinc-800/50"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{asset.nama_barang}</p>
              <p className="font-mono text-[10px] text-zinc-400">
                {asset.kode_barang} · NUP {asset.nup}
                {asset.merk_tipe ? ` · ${asset.merk_tipe}` : ""}
                {asset.no_polisi ? ` · ${asset.no_polisi}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label="Pindah ke atas"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === orderedIds.length - 1}
                aria-label="Pindah ke bawah"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
