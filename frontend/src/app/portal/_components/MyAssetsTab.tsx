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
  highlightedId?: string | null;
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
        className="w-full max-w-5xl flex items-center justify-between py-2 px-4 rounded-3xl bg-slate-900/90 text-white border border-white/10"
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
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 tabular-nums">
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
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-lg hover:scale-110 transition-all cursor-pointer"
            title="Foto Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentPhoto.url}
          alt={currentPhoto.label}
          className="max-h-[72vh] max-w-full object-contain rounded-3xl shadow-lg border border-white/10 select-none animate-in zoom-in-95 duration-150"
          referrerPolicy="no-referrer"
        />

        {activePhotos.length > 1 && (
          <button
            onClick={handleNextPhoto}
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-lg hover:scale-110 transition-all cursor-pointer"
            title="Foto Selanjutnya (Panah Kanan)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {activePhotos.length > 1 && (
        <div
          className="flex items-center gap-2 p-2 rounded-3xl bg-slate-900/90 border border-white/10 overflow-x-auto max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {activePhotos.map((photo, idx) => (
            <button
              key={`photo-pill-${photo.key}`}
              onClick={() => setActivePhotoIndex(idx)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer",
                activePhotoIndex === idx
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
              )}
            >
              <Camera className="w-4 h-4" />
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
  highlightedId,
}: MyAssetsTabProps) {
  const [failedImgMap, setFailedImgMap] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  useEffect(() => {
    if (!highlightedId) return;
    const el = document.querySelector(`[data-highlight-id="${CSS.escape(String(highlightedId))}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedId, filteredMyAssets.length, assetViewMode]);

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
        <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-accent-fg)] mx-auto mb-2" />
        <p className="text-sm text-[var(--ds-fg-muted)]">Memuat aset Anda...</p>
      </div>
    );
  }

  if (filteredMyAssets.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-14 h-14 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center mb-3 border border-[var(--ds-accent-soft-border)] shadow-xs">
          <Briefcase className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-[var(--ds-fg)]">Tidak Ada Aset Penguasaan</p>
        <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-sm">
          Tidak ada barang atau peralatan BMN di bawah tanggung jawab langsung Anda.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* View Switcher Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-surface-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider tabular-nums">
            Daftar Aset ({filteredMyAssets.length})
          </span>
          <span className="text-xs text-[var(--ds-fg-muted)] hidden sm:inline">
            • Klik aset untuk melihat foto dokumentasi
          </span>
        </div>
        <div className="flex items-center bg-[var(--ds-surface)] p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 shadow-xs gap-1">
          <button
            onClick={() => setAssetViewMode("list")}
            className={cn(
              "p-1 rounded-lg transition-all cursor-pointer",
              assetViewMode === "list"
                ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xs"
                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            )}
            title="Tampilan List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAssetViewMode("grid")}
            className={cn(
              "p-1 rounded-lg transition-all cursor-pointer",
              assetViewMode === "grid"
                ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xs"
                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            )}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {assetViewMode === "list" ? (
        /* List View: Click anywhere on row to view photo */
        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800">
          {filteredMyAssets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const thumbUrl = primaryPhoto?.url ?? null;
            const hasThumb = Boolean(thumbUrl && (thumbUrl.startsWith("http") || thumbUrl.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto?.key || "thumb"}`]);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);
            const isHighlighted = Boolean(highlightedId && String(asset.id) === String(highlightedId));

            return (
              <div
                key={`my-${asset.id}`}
                data-highlight-id={String(asset.id)}
                onClick={() => handleAssetClick(asset)}
                className={cn(
                  "p-4 hover:bg-[var(--ds-surface-muted)] transition-colors flex items-center justify-between gap-4 cursor-pointer group",
                  isHighlighted && "ring-2 ring-inset ring-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)]"
                )}
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Thumbnail / Icon */}
                  <div className="w-12 h-12 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-200/80 dark:border-zinc-800 group-hover:border-[var(--ds-accent-fg)] transition-colors">
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
                      <Package className="w-5 h-5 text-[var(--ds-accent-fg)]" />
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
                      <p className="text-sm font-semibold text-[var(--ds-fg)] truncate group-hover:text-[var(--ds-accent-fg)] transition-colors">
                        {asset.nama_barang}
                      </p>
                      {photos.length > 0 && (
                        <span className="text-xs px-2 py-0 rounded-lg font-medium bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] shrink-0 tabular-nums">
                          {photos.length} Foto
                        </span>
                      )}
                    </div>
                    {merkDisplay && (
                      <p className="text-xs text-[var(--ds-fg-muted)] mb-1 truncate">{merkDisplay}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-mono text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-2 py-0 rounded-lg tabular-nums">{asset.kode_barang}</span>
                      <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">NUP: {asset.nup}</span>
                      {asset.nup_lama && (
                        <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">• NUP Lama: {asset.nup_lama}</span>
                      )}
                      {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                        <span className="text-xs px-2 py-0 rounded-full font-medium bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border border-[var(--ds-status-info-border)]">
                          {asset.no_polisi}
                        </span>
                      )}
                      {asset.kondisi && (
                        <span className={cn("text-xs px-2 py-0 rounded-full font-medium",
                          asset.kondisi === "Baik" ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]" :
                          asset.kondisi === "Rusak Ringan" ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]" :
                          "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]"
                        )}>{asset.kondisi}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Badges */}
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] shrink-0 font-semibold">
                    Tanggung Jawab
                  </Badge>
                  <div className="text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-accent-fg)] transition-colors p-1">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View: Exact Same Size & Layout as Active Loans */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredMyAssets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const thumbUrl = primaryPhoto?.url ?? null;
            const hasValidThumb = Boolean(thumbUrl && (thumbUrl.startsWith("http") || thumbUrl.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto?.key || "thumb"}`]);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);
            const isHighlighted = Boolean(highlightedId && String(asset.id) === String(highlightedId));

            return (
              <div
                key={`my-grid-${asset.id}`}
                data-highlight-id={String(asset.id)}
                onClick={() => handleAssetClick(asset)}
                className={cn(
                  "bg-[var(--ds-surface)] rounded-lg border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs hover:border-[var(--ds-border-control)] transition-colors flex flex-col cursor-pointer group",
                  isHighlighted && "ring-2 ring-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)]"
                )}
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                {/* Photo Container */}
                <div className="h-28 w-full relative bg-[var(--ds-surface-muted)] border-b border-slate-200/70 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
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
                    <div className="flex flex-col items-center gap-1 p-2 text-center text-[var(--ds-fg-muted)]">
                      <Camera className="w-5 h-5 text-[var(--ds-fg-muted)]" />
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Belum ada foto</p>
                    </div>
                  )}

                  {/* Photo Source Badge (Geotag, Tampak Depan, etc.) */}
                  {primaryPhoto && (
                    <span className="absolute top-2 left-2 text-xs px-2 py-0 rounded-lg font-bold uppercase tracking-wider bg-slate-900/85 text-white shadow-xs border border-white/20">
                      {primaryPhoto.label}
                    </span>
                  )}

                  {/* Vehicle License Plate Badge */}
                  {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-0 rounded-full font-bold bg-[var(--ds-status-info-fg)] text-white shadow-xs uppercase tabular-nums">
                      {asset.no_polisi}
                    </span>
                  )}

                  {/* Assignment Badge matching Pinjaman's bottom-left badge */}
                  <span className="absolute bottom-2 left-2 text-xs px-2 py-0 rounded-full font-bold uppercase tracking-wider shadow-xs bg-[#1e5433] text-white">
                    Tanggung Jawab
                  </span>

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-xs font-semibold">
                      {photos.length > 0 ? "Buka Foto" : "Tanpa Foto"}
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[var(--ds-fg)] truncate group-hover:text-[var(--ds-accent-fg)] transition-colors">
                        {asset.nama_barang}
                      </p>
                      {photos.length > 1 && (
                        <span className="text-xs px-2 py-0 rounded-lg font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] shrink-0 tabular-nums">
                          +{photos.length - 1} foto
                        </span>
                      )}
                    </div>
                    {merkDisplay && (
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-1 truncate">
                        {merkDisplay}
                      </p>
                    )}

                    {/* Middle Strip: EXACT SAME HEIGHT & STRUCTURE AS PINJAMAN */}
                    <div className="mt-2 p-2 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between text-[var(--ds-fg-muted)]">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                          Jenis BMN:
                        </span>
                        <span className="font-semibold text-[var(--ds-fg)] truncate max-w-[130px]">
                          {asset.jenis_bmn || "Peralatan & Mesin"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[var(--ds-fg-muted)]">
                          <CheckCircle2 className="w-3 h-3 text-[var(--ds-status-success-fg)]" />
                          Status:
                        </span>
                        <span className="font-semibold text-[var(--ds-status-success-fg)]">
                          {asset.kondisi === "Baik" ? "Siap Operasional" : asset.kondisi || "Tersedia"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono text-[var(--ds-fg-muted)] tabular-nums">
                        {asset.kode_barang}
                      </span>
                      <span className="text-xs font-bold text-[var(--ds-fg)] tabular-nums">
                        NUP: {asset.nup}
                      </span>
                    </div>

                    {asset.kondisi && (
                      <span
                        className={cn(
                          "text-xs px-2 py-0 rounded-full font-bold uppercase tracking-wider",
                          asset.kondisi === "Baik"
                            ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]"
                            : asset.kondisi === "Rusak Ringan"
                            ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]"
                            : "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)]"
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
