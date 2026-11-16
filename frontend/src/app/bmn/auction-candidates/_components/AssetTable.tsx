"use client";

import Link from "next/link";
import { Eye, FileSpreadsheet, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AssetResponse, AuctionAsset } from "../_lib/auction-helpers";
import { formatRupiah, shortenLokasi } from "../_lib/auction-helpers";

interface AssetTableProps {
  assets: AuctionAsset[];
  selectedIds: Set<string>;
  allSelected: boolean;
  isLoading: boolean;
  response: AssetResponse | undefined;
  page: number;
  perPage: number;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPerPageChange: (value: number) => void;
  onPageChange: (value: number | ((prev: number) => number)) => void;
  worksheetNumberByAssetId?: Map<string, number>;
  onOpenWorksheet?: (assetId: string) => void;
}

export function AssetTable({
  assets,
  selectedIds,
  allSelected,
  isLoading,
  response,
  page,
  perPage,
  onToggleSelect,
  onToggleSelectAll,
  onPerPageChange,
  onPageChange,
  worksheetNumberByAssetId,
  onOpenWorksheet,
}: AssetTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/30">
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Identitas Aset</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Jenis / Lokasi</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Kondisi</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Nilai Perolehan</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--ds-status-danger-fg)]" />
                  <p className="text-sm text-[var(--ds-fg-muted)]">Memuat aset rusak berat...</p>
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Package className="mx-auto mb-2 h-10 w-10 text-[var(--ds-fg-muted)]" />
                  <p className="text-sm text-[var(--ds-fg-muted)]">Belum ada aset kondisi Rusak Berat.</p>
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className={cn(
                    "transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-800/30",
                    selectedIds.has(asset.id) && "bg-[var(--ds-accent-soft)]"
                  )}
                >
                  <td className="px-4 py-3">
                    <Checkbox checked={selectedIds.has(asset.id)} onCheckedChange={() => onToggleSelect(asset.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-75 truncate text-sm font-semibold text-[var(--ds-fg)]">{asset.nama_barang}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 tabular-nums">
                      <span className="font-mono text-xs font-bold text-[var(--ds-status-danger-fg)]">{asset.kode_barang}</span>
                      <span className="rounded-lg bg-[var(--ds-surface-muted)] px-2 py-1 font-mono text-xs text-[var(--ds-fg-muted)]">NUP: {asset.nup}</span>
                      {asset.no_polisi && asset.jenis_bmn?.toLowerCase().includes("angkutan bermotor") && (
                        <span className="rounded-lg bg-[var(--ds-status-info-bg)] px-2 py-1 font-mono text-xs font-semibold text-[var(--ds-status-info-fg)]">
                          {asset.no_polisi}
                        </span>
                      )}
                      {asset.nup_lama && <span className="font-mono text-xs text-[var(--ds-fg-muted)]">NUP Lama: {asset.nup_lama}</span>}
                    </div>
                    {asset.merk_tipe && <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">{asset.merk_tipe}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--ds-fg-secondary)]">{asset.jenis_bmn || "-"}</p>
                    <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">{shortenLokasi(asset.lokasi_ruang || asset.lokasi_spesifik)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] px-2 py-1 text-xs font-bold text-[var(--ds-status-danger-fg)]">
                      {asset.kondisi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <p className="text-sm font-bold text-[var(--ds-fg)]">{formatRupiah(asset.nilai_perolehan)}</p>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Buku: {formatRupiah(asset.nilai_buku)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                    <Link href={`/bmn/assets/${asset.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ds-status-info-fg)] transition hover:bg-[var(--ds-status-info-bg)]" title="Lihat detail aset">
                      <Eye className="h-4 w-4" />
                    </Link>
                    {selectedIds.has(asset.id) && onOpenWorksheet && (
                      <button
                        type="button"
                        onClick={() => onOpenWorksheet(asset.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold text-[var(--ds-accent-fg)] transition hover:bg-[var(--ds-accent-soft)] tabular-nums"
                        title="Buka kertas kerja aset"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        #{worksheetNumberByAssetId?.get(asset.id) || "-"}
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200/70 dark:border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">{response?.total || assets.length} item total</span>
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg-secondary)] outline-none focus:ring-1 focus:ring-[var(--ds-accent-soft-border)]"
          >
            <option value={10}>10 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
            <option value={0}>Semua</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange((prev) => prev - 1)} className="rounded-lg text-xs">Prev</Button>
          <span className="px-2 text-xs text-[var(--ds-fg-muted)] tabular-nums">Hal {page} / {response?.last_page || 1}</span>
          <Button variant="outline" size="sm" disabled={page === response?.last_page || perPage === 0} onClick={() => onPageChange((prev) => prev + 1)} className="rounded-lg text-xs">Next</Button>
        </div>
      </div>
    </div>
  );
}
