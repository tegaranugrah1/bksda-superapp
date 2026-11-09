"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Briefcase, List, LayoutGrid, Package, Camera, X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AssetItem {
  id: number | string;
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
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_lokasi_url?: string | null;
  foto_url?: string | null;
}

export interface PhotoItem {
  key: string;
  label: string;
  url: string;
}

export function formatMerkTipe(merk?: string | null, tipe?: string | null, merkTipe?: string | null): string | null {
  const parts = [merk, tipe, merkTipe].filter(Boolean).join(" ").split(/[\s,]+/).filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join(" ") : null;
}

/**
 * Resolves Google Drive share links into direct high-res images and relative URLs to full API URLs
 */
export function resolvePhotoUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  // Google Drive link: parse file ID and convert to direct image URL
  const gdriveMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdriveMatch) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }

  // Relative API URL: prefix with NEXT_PUBLIC_API_URL host if available
  if (rawUrl.startsWith("/")) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (apiBase && apiBase.startsWith("http")) {
      try {
        const origin = new URL(apiBase).origin;
        return `${origin}${rawUrl}`;
      } catch {
        return /^https?:\/\//i.test(rawUrl) || (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) ? rawUrl : null;
      }
    }
  }

  return /^https?:\/\//i.test(rawUrl) || (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) ? rawUrl : null;
}

/**
 * Extracts and prioritizes available documentation photos for an asset:
 * 1. Foto Geotag (Highest Priority)
 * 2. Tampak Depan
 * 3. Tampak Belakang
 * 4. Tampak Kiri
 * 5. Tampak Kanan
 * 6. Foto Lokasi
 * 7. Foto Dokumentasi Umum
 */
export function getAssetPhotos(asset: AssetItem): PhotoItem[] {
  const entries: Array<[string, string, string | null | undefined]> = [
    ["geotag", "Foto Geotag", asset.foto_geotag_url || (asset.foto_geotag_path?.startsWith("http") ? asset.foto_geotag_path : null)],
    ["depan", "Tampak Depan", asset.foto_depan_url],
    ["belakang", "Tampak Belakang", asset.foto_belakang_url],
    ["kiri", "Tampak Kiri", asset.foto_kiri_url],
    ["kanan", "Tampak Kanan", asset.foto_kanan_url],
    ["lokasi", "Foto Lokasi", asset.foto_lokasi_url],
    ["foto_url", "Foto Dokumentasi", asset.foto_url],
  ];
  return entries.flatMap(([key, label, raw]) => {
    const url = resolvePhotoUrl(raw);
    return url ? [{ key, label, url }] : [];
  });
}

interface MyAssetsTabProps {
  assetsLoading: boolean;
  filteredMyAssets: AssetItem[];
  assetViewMode: "list" | "grid";
  setAssetViewMode: (mode: "list" | "grid") => void;
}

export function AssetPhotoLightbox({
  asset,
  onClose,
}: {
  asset: AssetItem | null;
  onClose: () => void;
}) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const activePhotos = asset ? getAssetPhotos(asset) : [];
  const currentPhoto = activePhotos[activePhotoIndex] || null;

  const handlePrevPhoto = useCallback(() => {
    if (activePhotos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1));
  }, [activePhotos.length]);

  const handleNextPhoto = useCallback(() => {
    if (activePhotos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev < activePhotos.length - 1 ? prev + 1 : 0));
  }, [activePhotos.length]);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [asset]);

  useEffect(() => {
    if (!asset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrevPhoto();
      else if (e.key === "ArrowRight") handleNextPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, onClose, handlePrevPhoto, handleNextPhoto]);

  if (!asset || !currentPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl flex items-center justify-between py-2 px-4 rounded-xl bg-slate-900/90 text-white border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">
              {asset.nama_barang}
              {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) ? ` - ${formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}` : ""}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span className="font-mono text-emerald-400">NUP: {asset.nup}</span>
              {asset.no_polisi && <span>• {asset.no_polisi}</span>}
              <span>• {currentPhoto.label}</span>
              {activePhotos.length > 1 && (
                <span className="text-slate-400">({activePhotoIndex + 1} dari {activePhotos.length})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={currentPhoto.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Buka Foto Asli di Tab Baru"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 w-full max-w-5xl flex items-center justify-center relative my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {activePhotos.length > 1 && (
          <button
            onClick={handlePrevPhoto}
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-xl hover:scale-110 transition-all cursor-pointer"
            title="Foto Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentPhoto.url}
          alt={currentPhoto.label}
          className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10 select-none animate-in zoom-in-95 duration-150"
          referrerPolicy="no-referrer"
        />

        {activePhotos.length > 1 && (
          <button
            onClick={handleNextPhoto}
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-xl hover:scale-110 transition-all cursor-pointer"
            title="Foto Selanjutnya (Panah Kanan)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

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
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer",
                activePhotoIndex === idx
                  ? "bg-emerald-600 text-white shadow-md"
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
  );
}

export function MyAssetsTab({
  assetsLoading,
  filteredMyAssets,
  assetViewMode,
  setAssetViewMode,
}: MyAssetsTabProps) {
  const [failedImgMap, setFailedImgMap] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  const handleAssetClick = (asset: AssetItem) => {
    const photos = getAssetPhotos(asset);
    if (photos.length === 0) {
      toast.info(`Aset "${asset.nama_barang}" (NUP: ${asset.nup}) belum memiliki foto dokumentasi.`);
      return;
    }
    setSelectedAsset(asset);
  };

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
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-14 h-14 rounded-2xl bg-[#edf3ee] dark:bg-slate-800/80 text-[#1e5433] dark:text-emerald-400 flex items-center justify-center mb-3 border border-[#dce8dd] dark:border-slate-700/60 shadow-xs">
          <Briefcase className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Aset Penguasaan</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Tidak ada barang atau peralatan BMN di bawah tanggung jawab langsung Anda.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* View Switcher Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#dce8dd] dark:border-slate-800 bg-[#edf3ee]/40 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Daftar Aset ({filteredMyAssets.length})
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            • Klik aset untuk melihat foto dokumentasi
          </span>
        </div>
        <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-[#dce8dd] dark:border-slate-700 shadow-2xs">
          <button
            onClick={() => setAssetViewMode("list")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              assetViewMode === "list"
                ? "bg-[#1e5433] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAssetViewMode("grid")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              assetViewMode === "grid"
                ? "bg-[#1e5433] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {assetViewMode === "list" ? (
        /* List View: Click anywhere on row to view photo */
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {filteredMyAssets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const thumbUrl = primaryPhoto?.url ?? null;
            const hasThumb = Boolean(thumbUrl && (thumbUrl.startsWith("http") || thumbUrl.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto?.key || "thumb"}`]);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);

            return (
              <div
                key={`my-${asset.id}`}
                onClick={() => handleAssetClick(asset)}
                className="p-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Thumbnail / Icon */}
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-200/50 dark:border-zinc-700/50 group-hover:border-[#1e5433] transition-colors">
                    {hasThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl!}
                        alt={asset.nama_barang}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImgMap((prev) => ({ ...prev, [`${asset.id}-${primaryPhoto?.key || "thumb"}`]: true }))}
                      />
                    ) : (
                      <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#1e5433] dark:group-hover:text-emerald-400 transition-colors">
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
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", 
                          asset.kondisi === "Baik" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                          asset.kondisi === "Rusak Ringan" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                          "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        )}>{asset.kondisi}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Badges */}
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="bg-[#edf3ee] dark:bg-emerald-950/40 text-[#1e5433] dark:text-emerald-400 border-[#dce8dd] dark:border-emerald-800/50 shrink-0 font-semibold">
                    Tanggung Jawab
                  </Badge>
                  <div className="text-slate-400 group-hover:text-[#1e5433] dark:group-hover:text-emerald-400 transition-colors p-1">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View: Exact Same Size & Layout as Active Loans */
        <div className="p-3 sm:p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {filteredMyAssets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const thumbUrl = primaryPhoto?.url ?? null;
            const hasValidThumb = Boolean(thumbUrl && (thumbUrl.startsWith("http") || thumbUrl.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto?.key || "thumb"}`]);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);

            return (
              <div
                key={`my-grid-${asset.id}`}
                onClick={() => handleAssetClick(asset)}
                className="bg-white dark:bg-slate-900/60 rounded-xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden hover:shadow-md hover:border-[#1e5433]/40 dark:hover:border-emerald-700/50 hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group"
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                {/* Photo Container */}
                <div className="h-24 sm:h-28 w-full relative bg-slate-100 dark:bg-slate-800/60 border-b border-[#dce8dd]/60 dark:border-slate-800/60 flex items-center justify-center overflow-hidden shrink-0">
                  {hasValidThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl!}
                      alt={asset.nama_barang}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImgMap((prev) => ({ ...prev, [`${asset.id}-${primaryPhoto?.key || "thumb"}`]: true }))}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center text-slate-400 dark:text-slate-600">
                      <Camera className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Belum ada foto</p>
                    </div>
                  )}

                  {/* Photo Source Badge (Geotag, Tampak Depan, etc.) */}
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

                  {/* Assignment Badge matching Pinjaman's bottom-left badge */}
                  <span className="absolute bottom-1.5 left-1.5 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm border bg-[#1e5433] text-white border-emerald-600/30">
                    Tanggung Jawab
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

                    {/* Middle Strip: EXACT SAME HEIGHT & STRUCTURE AS PINJAMAN */}
                    <div className="mt-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-0.5 text-[10px]">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Package className="w-2.5 h-2.5 text-[#1e5433] dark:text-emerald-400" />
                          Jenis BMN:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                          {asset.jenis_bmn || "Peralatan & Mesin"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                          Status:
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {asset.kondisi === "Baik" ? "Siap Operasional" : asset.kondisi || "Tersedia"}
                        </span>
                      </div>
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

      <AssetPhotoLightbox asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </>
  );
}
