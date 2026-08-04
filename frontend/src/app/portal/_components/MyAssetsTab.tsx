"use client";

import React from "react";
import { Loader2, Briefcase, List, LayoutGrid, Package, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssetItem {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  nup_lama?: string | null;
  merk?: string | null;
  tipe?: string | null;
  merk_tipe?: string | null;
  kondisi?: string | null;
  no_polisi?: string | null;
  jenis_bmn?: string | null;
  foto_geotag_url?: string | null;
  foto_geotag_path?: string | null;
}

export function formatMerkTipe(merk?: string | null, tipe?: string | null, merkTipe?: string | null): string | null {
  const combined = [merk, tipe, merkTipe].filter(Boolean).join(" ");
  if (!combined) return null;
  const parts = combined.split(/[\s,]+/);
  return [...new Set(parts)].join(" ");
}

function driveToThumbnail(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

interface MyAssetsTabProps {
  assetsLoading: boolean;
  filteredMyAssets: AssetItem[];
  assetViewMode: "list" | "grid";
  setAssetViewMode: (mode: "list" | "grid") => void;
}

export function MyAssetsTab({
  assetsLoading,
  filteredMyAssets,
  assetViewMode,
  setAssetViewMode,
}: MyAssetsTabProps) {
  if (assetsLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Memuat aset Anda...</p>
      </div>
    );
  }

  if (filteredMyAssets.length === 0) {
    return (
      <div className="p-12 text-center">
        <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tidak ada aset di bawah tanggung jawab Anda.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* View Switcher Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Daftar Aset
        </span>
        <div className="flex items-center bg-slate-100 dark:bg-zinc-850 p-0.5 rounded-lg border border-slate-200/40 dark:border-zinc-700/40">
          <button
            onClick={() => setAssetViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              assetViewMode === "list"
                ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAssetViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              assetViewMode === "grid"
                ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {assetViewMode === "list" ? (
        /* List View (Without Eye Button) */
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {filteredMyAssets.map((asset) => (
            <div key={`my-${asset.id}`} className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{asset.nama_barang}</p>
                {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                  <p className="text-xs text-slate-500 mb-0.5 truncate">{formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{asset.kode_barang}</span>
                  <span className="text-xs text-slate-500">NUP: {asset.nup}</span>
                  {asset.nup_lama && (
                    <span className="text-xs text-slate-400">• NUP Lama: {asset.nup_lama}</span>
                  )}
                  {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                      {asset.no_polisi}
                    </span>
                  )}
                  {asset.kondisi && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium ml-1", 
                      asset.kondisi === "Baik" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                      asset.kondisi === "Rusak Ringan" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                      "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    )}>{asset.kondisi}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View with Geotag Image */
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMyAssets.map((asset) => {
            const thumbUrl = asset.foto_geotag_path
              ? asset.foto_geotag_path
              : (asset.foto_geotag_url ? driveToThumbnail(asset.foto_geotag_url) : null);

            return (
              <div
                key={`my-grid-${asset.id}`}
                className="bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
              >
                {/* Photo Container */}
                <div className="aspect-video relative bg-slate-200/50 dark:bg-slate-800/50 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center overflow-hidden shrink-0">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={asset.nama_barang}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-3 text-center text-slate-400 dark:text-slate-600">
                      <Camera className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Belum ada foto</p>
                    </div>
                  )}
                  {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] px-2.5 py-0.5 rounded-full font-black bg-indigo-600 text-white shadow-sm border border-indigo-500/25 uppercase">
                      {asset.no_polisi}
                    </span>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {asset.nama_barang}
                    </p>
                    {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-155 dark:border-zinc-800/60 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                        {asset.kode_barang}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                        NUP: {asset.nup}
                      </span>
                    </div>

                    {asset.kondisi && (
                      <span
                        className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          asset.kondisi === "Baik"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                            : asset.kondisi === "Rusak Ringan"
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
                            : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20"
                        )}
                      >
                        {asset.kondisi}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
