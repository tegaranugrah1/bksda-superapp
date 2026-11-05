"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, List, LayoutGrid, Camera, X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatMerkTipe, getAssetPhotos, AssetItem } from "./MyAssetsTab";

export interface BorrowedAssetItem {
  id: number | string;
  loan_id?: number | string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  nup_lama?: string | null;
  loan_date: string;
  due_date: string;
  status: string;
  kondisi?: string | null;
  merk?: string | null;
  tipe?: string | null;
  merk_tipe?: string | null;
  jenis_bmn?: string | null;
  no_polisi?: string | null;
  lokasi_ruang?: string | null;
  foto_geotag_url?: string | null;
  foto_geotag_path?: string | null;
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_lokasi_url?: string | null;
  foto_url?: string | null;
}

interface ActiveLoansTabProps {
  assets: BorrowedAssetItem[];
}

export function ActiveLoansTab({ assets }: ActiveLoansTabProps) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [failedImgMap, setFailedImgMap] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<BorrowedAssetItem | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const activePhotos = selectedAsset ? getAssetPhotos(selectedAsset as unknown as AssetItem) : [];
  const currentPhoto = activePhotos[activePhotoIndex] || null;

  const handleAssetClick = (asset: BorrowedAssetItem) => {
    const photos = getAssetPhotos(asset as unknown as AssetItem);
    if (photos.length === 0) {
      toast.info(`Aset "${asset.nama_barang}" (NUP: ${asset.nup}) belum memiliki foto dokumentasi.`);
      return;
    }
    setSelectedAsset(asset);
    setActivePhotoIndex(0);
  };

  const handlePrevPhoto = useCallback(() => {
    if (activePhotos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1));
  }, [activePhotos.length]);

  const handleNextPhoto = useCallback(() => {
    if (activePhotos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev < activePhotos.length - 1 ? prev + 1 : 0));
  }, [activePhotos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedAsset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAsset(null);
      } else if (e.key === "ArrowLeft") {
        handlePrevPhoto();
      } else if (e.key === "ArrowRight") {
        handleNextPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAsset, handlePrevPhoto, handleNextPhoto]);

  if (assets.length === 0) {
    return (
      <div className="p-12 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada pinjaman aktif</p>
      </div>
    );
  }

  return (
    <>
      {/* View Switcher Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Daftar Pinjaman Aktif ({assets.length})
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            • Klik aset untuk melihat foto dokumentasi
          </span>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-zinc-850 p-0.5 rounded-lg border border-slate-200/40 dark:border-zinc-700/40">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-sm"
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
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {viewMode === "list" ? (
            /* List View */
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {assets.map((asset) => {
            const photos = getAssetPhotos(asset as unknown as AssetItem);
            const primaryPhoto = photos[0] || null;
            const hasThumb = Boolean(primaryPhoto?.url && !failedImgMap[`${asset.id}-${primaryPhoto.key}`]);
            const cleanStatus = (asset.status || "").toLowerCase();
            const isOverdue =
              asset.status === "terlambat" ||
              cleanStatus === "terlambat" ||
              Boolean(
                (asset.status === "dipinjam" || cleanStatus === "dipinjam") &&
                  asset.due_date &&
                  !Number.isNaN(new Date(asset.due_date).getTime()) &&
                  new Date(asset.due_date) < new Date()
              );
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
                        • Pinjam: {new Date(asset.loan_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {asset.due_date && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500"
                        )}
                      >
                        • Batas: {new Date(asset.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
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
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const photos = getAssetPhotos(asset as unknown as AssetItem);
            const primaryPhoto = photos[0] || null;
            const hasValidThumb = Boolean(primaryPhoto?.url && !failedImgMap[`${asset.id}-${primaryPhoto.key}`]);
            const cleanStatus = (asset.status || "").toLowerCase();
            const isOverdue =
              asset.status === "terlambat" ||
              cleanStatus === "terlambat" ||
              Boolean(
                (asset.status === "dipinjam" || cleanStatus === "dipinjam") &&
                  asset.due_date &&
                  !Number.isNaN(new Date(asset.due_date).getTime()) &&
                  new Date(asset.due_date) < new Date()
              );
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);

            return (
              <div
                key={`loan-grid-${asset.id}`}
                onClick={() => handleAssetClick(asset)}
                className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group"
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                {/* Photo Container */}
                <div className="aspect-video relative bg-slate-200/50 dark:bg-slate-800/50 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center overflow-hidden shrink-0">
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
                    <div className="flex flex-col items-center gap-1.5 p-3 text-center text-slate-400 dark:text-slate-600">
                      <Camera className="w-7 h-7 text-slate-300 dark:text-slate-700" />
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                        Belum ada foto
                      </p>
                    </div>
                  )}

                  {/* Photo Source Badge */}
                  {primaryPhoto && (
                    <span className="absolute top-2.5 left-2.5 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-sm shadow-sm border border-white/20">
                      {primaryPhoto.label}
                    </span>
                  )}

                  {/* Vehicle License Plate Badge */}
                  {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] px-2.5 py-0.5 rounded-full font-black bg-indigo-600 text-white shadow-sm border border-indigo-500/25 uppercase">
                      {asset.no_polisi}
                    </span>
                  )}

                  {/* Overdue or Active Loan Banner */}
                  <span
                    className={cn(
                      "absolute bottom-2.5 left-2.5 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm border",
                      isOverdue
                        ? "bg-rose-600 text-white border-rose-500/30"
                        : "bg-blue-600 text-white border-blue-500/30"
                    )}
                  >
                    {isOverdue ? "Terlambat" : "Dipinjam"}
                  </span>

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <ZoomIn className="w-5 h-5" />
                    <span className="text-xs font-semibold">
                      {photos.length > 0 ? "Buka Foto" : "Tanpa Foto"}
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {asset.nama_barang}
                      </p>
                      {photos.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 shrink-0">
                          +{photos.length - 1} foto
                        </span>
                      )}
                    </div>
                    {merkDisplay && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {merkDisplay}
                      </p>
                    )}

                    {/* Loan Schedule Dates Strip */}
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-100/70 dark:bg-zinc-800/50 border border-slate-200/50 dark:border-zinc-750 flex flex-col gap-1 text-[11px]">
                      {asset.loan_date && (
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Pinjam:
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {new Date(asset.loan_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      )}
                      {asset.due_date && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Batas Kembali:
                          </span>
                          <span className={cn("font-medium", isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-700 dark:text-slate-300")}>
                            {new Date(asset.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
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
        </motion.div>
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* LIGHTBOX PHOTO MODAL (Triggered when asset is clicked) */}
      {/* ========================================================================= */}
      {selectedAsset && currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedAsset(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between py-2 px-4 rounded-xl bg-slate-900/90 text-white border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {selectedAsset.nama_barang}
                  {formatMerkTipe(selectedAsset.merk, selectedAsset.tipe, selectedAsset.merk_tipe)
                    ? ` - ${formatMerkTipe(selectedAsset.merk, selectedAsset.tipe, selectedAsset.merk_tipe)}`
                    : ""}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 flex-wrap">
                  <span className="font-mono text-emerald-400">NUP: {selectedAsset.nup}</span>
                  {selectedAsset.no_polisi && <span>• {selectedAsset.no_polisi}</span>}
                  <span>• {currentPhoto.label}</span>
                  {activePhotos.length > 1 && (
                    <span className="text-slate-400">
                      ({activePhotoIndex + 1} dari {activePhotos.length})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={currentPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Buka Foto Asli di Tab Baru"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Container */}
          <div
            className="flex-1 w-full max-w-5xl flex items-center justify-center relative my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {activePhotos.length > 1 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-xl hover:scale-110 transition-all"
                title="Foto Sebelumnya (Panah Kiri)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Photo Element */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.url}
              alt={currentPhoto.label}
              className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10 select-none animate-in zoom-in-95 duration-150"
              referrerPolicy="no-referrer"
            />

            {/* Next Button */}
            {activePhotos.length > 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-xl hover:scale-110 transition-all"
                title="Foto Selanjutnya (Panah Kanan)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip (if multiple photos exist) */}
          {activePhotos.length > 1 && (
            <div
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-white/10 overflow-x-auto max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {activePhotos.map((photo, idx) => (
                <button
                  key={`photo-pill-${photo.key}`}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2",
                    activePhotoIndex === idx
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photo.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
