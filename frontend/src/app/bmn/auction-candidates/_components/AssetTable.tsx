"use client";

import Link from "next/link";
import { Eye, Loader2, Package } from "lucide-react";
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
}: AssetTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Identitas Aset</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Jenis / Lokasi</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Kondisi</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Nilai Perolehan</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                  <p className="text-sm text-zinc-400">Memuat aset rusak berat...</p>
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Package className="mx-auto mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm text-zinc-400">Belum ada aset kondisi Rusak Berat.</p>
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className={cn(
                    "transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40",
                    selectedIds.has(asset.id) && "bg-red-50/50 dark:bg-red-500/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <Checkbox checked={selectedIds.has(asset.id)} onCheckedChange={() => onToggleSelect(asset.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-75 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{asset.nama_barang}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-red-700 dark:text-red-400">{asset.kode_barang}</span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">NUP: {asset.nup}</span>
                      {asset.nup_lama && <span className="font-mono text-[10px] text-zinc-400">NUP Lama: {asset.nup_lama}</span>}
                    </div>
                    {asset.merk_tipe && <p className="mt-1 text-[11px] text-zinc-400">{asset.merk_tipe}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{asset.jenis_bmn || "-"}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{shortenLokasi(asset.lokasi_ruang || asset.lokasi_spesifik)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                      {asset.kondisi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRupiah(asset.nilai_perolehan)}</p>
                    <p className="text-[10px] text-zinc-400">Buku: {formatRupiah(asset.nilai_buku)}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/bmn/assets/${asset.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-500/10">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">{response?.total || assets.length} item total</span>
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-600 outline-none focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value={10}>10 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
            <option value={0}>Semua</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange((prev) => prev - 1)} className="rounded-lg text-xs">Prev</Button>
          <span className="px-2 text-xs text-zinc-500 dark:text-zinc-400">Hal {page} / {response?.last_page || 1}</span>
          <Button variant="outline" size="sm" disabled={page === response?.last_page || perPage === 0} onClick={() => onPageChange((prev) => prev + 1)} className="rounded-lg text-xs">Next</Button>
        </div>
      </div>
    </div>
  );
}
