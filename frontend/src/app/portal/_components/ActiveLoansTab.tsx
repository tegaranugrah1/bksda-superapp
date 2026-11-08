"use client";

import React, { useState, useEffect } from "react";
import { Package, List, LayoutGrid, Camera, ZoomIn, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatMerkTipe, getAssetPhotos, AssetItem, AssetPhotoLightbox } from "./MyAssetsTab";
import { formatDateIndonesian } from "@/lib/letter-utils";

export interface BorrowedAssetItem extends Omit<AssetItem, "id"> {
  id: number | string;
  loan_id?: number | string;
  loan_date: string;
  due_date: string;
  status: string;
}

interface ActiveLoansTabProps {
  assets: BorrowedAssetItem[];
  viewMode?: "list" | "grid";
  setViewMode?: (mode: "list" | "grid") => void;
}

function isLoanOverdue(asset: BorrowedAssetItem): boolean {
  const cleanStatus = (asset.status || "").toLowerCase();
  const isBorrowedStatus = cleanStatus === "dipinjam" || cleanStatus === "terlambat" || asset.status === "dipinjam" || asset.status === "terlambat";
  const dueDateTs = asset.due_date ? new Date(asset.due_date).getTime() : NaN;
  return isBorrowedStatus && (cleanStatus === "terlambat" || (!Number.isNaN(dueDateTs) && dueDateTs < Date.now()));
}

export function ActiveLoansTab({
  assets,
  viewMode: controlledViewMode,
  setViewMode: controlledSetViewMode,
}: ActiveLoansTabProps) {
  const [internalViewMode, setInternalViewMode] = useState<"list" | "grid">(() =>
    assets.length <= 4 ? "grid" : "list"
  );
  const [userToggled, setUserToggled] = useState(false);

  useEffect(() => {
    if (!userToggled && !controlledViewMode) {
      setInternalViewMode(assets.length <= 4 ? "grid" : "list");
    }
  }, [assets.length, userToggled, controlledViewMode]);

  const activeMode = controlledViewMode ?? internalViewMode;

  const handleToggleMode = (mode: "list" | "grid") => {
    setUserToggled(true);
    if (controlledSetViewMode) {
      controlledSetViewMode(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const [failedImgMap, setFailedImgMap] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<BorrowedAssetItem | null>(null);

  const handleAssetClick = (asset: BorrowedAssetItem) => {
    const photos = getAssetPhotos(asset);
    if (photos.length === 0) {
      toast.info(`Aset "${asset.nama_barang}" (NUP: ${asset.nup}) belum memiliki foto dokumentasi.`);
      return;
    }
    setSelectedAsset(asset);
  };

  if (assets.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-14 h-14 rounded-2xl bg-[#edf3ee] dark:bg-slate-800/80 text-[#1e5433] dark:text-emerald-400 flex items-center justify-center mb-3 border border-[#dce8dd] dark:border-slate-700/60 shadow-xs">
          <Package className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Pinjaman Aktif</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Saat ini Anda tidak memiliki barang atau peralatan yang sedang dipinjam.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* View Switcher Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#dce8dd] dark:border-slate-800 bg-[#edf3ee]/40 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Daftar Pinjaman Aktif ({assets.length})
          </span>
          <span className="text-[10.5px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            • Klik aset untuk foto dokumentasi
          </span>
        </div>
        <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-[#dce8dd] dark:border-slate-700 shadow-2xs">
          <button
            onClick={() => handleToggleMode("list")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              activeMode === "list"
                ? "bg-[#1e5433] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggleMode("grid")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              activeMode === "grid"
                ? "bg-[#1e5433] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {activeMode === "list" ? (
            /* List View */
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {assets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const hasThumb = Boolean(primaryPhoto?.url && (primaryPhoto.url.startsWith("http") || primaryPhoto.url.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto.key}`]);
            const cleanStatus = (asset.status || "").toLowerCase();
            const isOverdue = isLoanOverdue(asset);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);

            return (
              <div
                key={`loan-${asset.id}`}
                onClick={() => handleAssetClick(asset)}
                className="p-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 transition-all flex items-center gap-4 cursor-pointer group"
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                {/* Thumbnail / Icon */}
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-200/50 dark:border-zinc-700/50 group-hover:border-blue-400 transition-colors">
                  {hasThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={primaryPhoto!.url}
                      alt={asset.nama_barang}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImgMap((prev) => ({
                          ...prev,
                          [`${asset.id}-${primaryPhoto!.key}`]: true,
                        }))
                      }
                    />
                  ) : (
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                  {photos.length > 0 && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {asset.nama_barang}
                    </p>
                    {photos.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                        {photos.length} Foto
                      </span>
                    )}
                  </div>
                  {merkDisplay && (
                    <p className="text-xs text-slate-500 mb-0.5 truncate">{merkDisplay}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {asset.kode_barang}
                    </span>
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
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium",
                          asset.kondisi === "Baik"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : asset.kondisi === "Rusak Ringan"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        )}
                      >
                        {asset.kondisi}
                      </span>
                    )}
                    {asset.loan_date && (
                      <span className="text-xs text-slate-400">
                        • Pinjam: {formatDateIndonesian(asset.loan_date)}
                      </span>
                    )}
                    {asset.due_date && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500"
                        )}
                      >
                        • Batas: {formatDateIndonesian(asset.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Badges */}
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={isOverdue ? "destructive" : "secondary"} className="shrink-0">
                    {isOverdue ? "Terlambat" : (cleanStatus === "dipinjam" ? "Dipinjam" : asset.status)}
                  </Badge>
                  <div className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors p-1">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="p-3 sm:p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {assets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const hasValidThumb = Boolean(primaryPhoto?.url && (primaryPhoto.url.startsWith("http") || primaryPhoto.url.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto.key}`]);
            const cleanStatus = (asset.status || "").toLowerCase();
            const isOverdue = isLoanOverdue(asset);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);

            return (
              <div
                key={`loan-grid-${asset.id}`}
                onClick={() => handleAssetClick(asset)}
                className="bg-white dark:bg-slate-900/60 rounded-xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden hover:shadow-md hover:border-[#1e5433]/40 dark:hover:border-emerald-700/50 hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group"
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                {/* Photo Container */}
                <div className="h-24 sm:h-28 w-full relative bg-slate-100 dark:bg-slate-800/60 border-b border-[#dce8dd]/60 dark:border-slate-800/60 flex items-center justify-center overflow-hidden shrink-0">
                  {hasValidThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={primaryPhoto!.url}
                      alt={asset.nama_barang}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImgMap((prev) => ({
                          ...prev,
                          [`${asset.id}-${primaryPhoto!.key}`]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center text-slate-400 dark:text-slate-600">
                      <Camera className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                        Belum ada foto
                      </p>
                    </div>
                  )}

                  {/* Photo Source Badge */}
                  {primaryPhoto && (
                    <span className="absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-sm shadow-sm border border-white/20">
                      {primaryPhoto.label}
                    </span>
                  )}

                  {/* Vehicle License Plate Badge */}
                  {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full font-black bg-indigo-600 text-white shadow-sm border border-indigo-500/25 uppercase">
                      {asset.no_polisi}
                    </span>
                  )}

                  {/* Overdue or Active Loan Banner */}
                  <span
                    className={cn(
                      "absolute bottom-1.5 left-1.5 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm border",
                      isOverdue
                        ? "bg-rose-600 text-white border-rose-500/30"
                        : "bg-blue-600 text-white border-blue-500/30"
                    )}
                  >
                    {isOverdue ? "Terlambat" : "Dipinjam"}
                  </span>

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">
                      {photos.length > 0 ? "Buka Foto" : "Tanpa Foto"}
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#1e5433] dark:group-hover:text-emerald-400 transition-colors">
                        {asset.nama_barang}
                      </p>
                      {photos.length > 1 && (
                        <span className="text-[8.5px] px-1 py-0.2 rounded font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 shrink-0">
                          +{photos.length - 1} foto
                        </span>
                      )}
                    </div>
                    {merkDisplay && (
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {merkDisplay}
                      </p>
                    )}

                    {/* Loan Schedule Dates Strip */}
                    <div className="mt-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-0.5 text-[10px]">
                      {asset.loan_date && (
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            Tgl Pinjam:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatDateIndonesian(asset.loan_date)}
                          </span>
                        </div>
                      )}
                      {asset.due_date && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            Batas Kembali:
                          </span>
                          <span className={cn("font-semibold", isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-700 dark:text-slate-300")}>
                            {formatDateIndonesian(asset.due_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500">
                        {asset.kode_barang}
                      </span>
                      <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">
                        NUP: {asset.nup}
                      </span>
                    </div>

                    {asset.kondisi && (
                      <span
                        className={cn(
                          "text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider",
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
        </motion.div>
      </AnimatePresence>

      <AssetPhotoLightbox asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </>
  );
}
