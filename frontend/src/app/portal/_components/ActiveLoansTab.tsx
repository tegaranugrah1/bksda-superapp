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
  highlightedId?: string | null;
}

function isLoanOverdue(asset: BorrowedAssetItem): boolean {
  const cleanStatus = (asset.status || "").toLowerCase();
  const isBorrowedStatus = cleanStatus === "dipinjam" || cleanStatus === "terlambat";
  const dueDateTs = asset.due_date ? new Date(asset.due_date).getTime() : NaN;
  return isBorrowedStatus && (cleanStatus === "terlambat" || (!Number.isNaN(dueDateTs) && dueDateTs < Date.now()));
}

export function ActiveLoansTab({
  assets,
  viewMode: controlledViewMode,
  setViewMode: controlledSetViewMode,
  highlightedId,
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

  useEffect(() => {
    if (!highlightedId) return;
    const el = document.querySelector(`[data-highlight-id="${CSS.escape(String(highlightedId))}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedId, assets.length, activeMode]);

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
        <div className="w-14 h-14 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center mb-3 border border-[var(--ds-accent-soft-border)] shadow-xs">
          <Package className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-[var(--ds-fg)]">Tidak Ada Pinjaman Aktif</p>
        <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-sm">
          Saat ini Anda tidak memiliki barang atau peralatan yang sedang dipinjam.
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
            Daftar Pinjaman Aktif ({assets.length})
          </span>
          <span className="text-xs text-[var(--ds-fg-muted)] hidden sm:inline">
            • Klik aset untuk foto dokumentasi
          </span>
        </div>
        <div className="flex items-center bg-[var(--ds-surface)] p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 shadow-xs gap-1">
          <button
            onClick={() => handleToggleMode("list")}
            className={cn(
              "p-1 rounded-lg transition-all cursor-pointer",
              activeMode === "list"
                ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xs"
                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            )}
            title="Tampilan List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleMode("grid")}
            className={cn(
              "p-1 rounded-lg transition-all cursor-pointer",
              activeMode === "grid"
                ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xs"
                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            )}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-4 h-4" />
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
            <div className="divide-y divide-slate-200/70 dark:divide-zinc-800">
          {assets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const hasThumb = Boolean(primaryPhoto?.url && (primaryPhoto.url.startsWith("http") || primaryPhoto.url.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto?.key || "thumb"}`]);
            const cleanStatus = (asset.status || "").toLowerCase();
            const isOverdue = isLoanOverdue(asset);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);
            const loanKey = String(asset.loan_id ?? asset.id);
            const isHighlighted = Boolean(highlightedId && (loanKey === String(highlightedId) || String(asset.id) === String(highlightedId)));

            return (
              <div
                key={`loan-${loanKey}`}
                data-highlight-id={loanKey}
                onClick={() => handleAssetClick(asset)}
                className={cn(
                  "p-4 hover:bg-[var(--ds-surface-muted)] transition-colors flex items-center gap-4 cursor-pointer group",
                  isHighlighted && "ring-2 ring-inset ring-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)]"
                )}
                title={photos.length > 0 ? "Klik untuk melihat foto dokumentasi" : "Belum ada foto"}
              >
                {/* Thumbnail / Icon */}
                <div className="w-12 h-12 rounded-lg bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-200/80 dark:border-zinc-800 group-hover:border-[var(--ds-status-info-fg)] transition-colors">
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
                          [`${asset.id}-${primaryPhoto?.key || "thumb"}`]: true,
                        }))
                      }
                    />
                  ) : (
                    <Package className="w-5 h-5 text-[var(--ds-status-info-fg)]" />
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
                    <p className="text-sm font-semibold text-[var(--ds-fg)] truncate group-hover:text-[var(--ds-status-info-fg)] transition-colors">
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
                    <span className="text-xs font-mono text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-2 py-0 rounded-lg tabular-nums">
                      {asset.kode_barang}
                    </span>
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
                      <span
                        className={cn(
                          "text-xs px-2 py-0 rounded-full font-medium",
                          asset.kondisi === "Baik"
                            ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]"
                            : asset.kondisi === "Rusak Ringan"
                            ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]"
                            : "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]"
                        )}
                      >
                        {asset.kondisi}
                      </span>
                    )}
                    {asset.loan_date && (
                      <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
                        • Pinjam: {formatDateIndonesian(asset.loan_date)}
                      </span>
                    )}
                    {asset.due_date && (
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          isOverdue ? "text-[var(--ds-status-danger-fg)] font-bold" : "text-[var(--ds-fg-muted)]"
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
                  <div className="text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-status-info-fg)] transition-colors p-1">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assets.map((asset) => {
            const photos = getAssetPhotos(asset);
            const primaryPhoto = photos[0] || null;
            const hasValidThumb = Boolean(primaryPhoto?.url && (primaryPhoto.url.startsWith("http") || primaryPhoto.url.startsWith("/")) && !failedImgMap[`${asset.id}-${primaryPhoto?.key || "thumb"}`]);
            const cleanStatus = (asset.status || "").toLowerCase();
            const isOverdue = isLoanOverdue(asset);
            const merkDisplay = formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe);
            const loanKey = String(asset.loan_id ?? asset.id);
            const isHighlighted = Boolean(highlightedId && (loanKey === String(highlightedId) || String(asset.id) === String(highlightedId)));

            return (
              <div
                key={`loan-grid-${loanKey}`}
                data-highlight-id={loanKey}
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
                      src={primaryPhoto!.url}
                      alt={asset.nama_barang}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImgMap((prev) => ({
                          ...prev,
                          [`${asset.id}-${primaryPhoto?.key || "thumb"}`]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center text-[var(--ds-fg-muted)]">
                      <Camera className="w-5 h-5 text-[var(--ds-fg-muted)]" />
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                        Belum ada foto
                      </p>
                    </div>
                  )}

                  {/* Photo Source Badge */}
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

                  {/* Overdue or Active Loan Banner */}
                  <span
                    className={cn(
                      "absolute bottom-2 left-2 text-xs px-2 py-0 rounded-full font-bold uppercase tracking-wider shadow-xs",
                      isOverdue
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                    )}
                  >
                    {isOverdue ? "Terlambat" : "Dipinjam"}
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

                    {/* Loan Schedule Dates Strip */}
                    <div className="mt-2 p-2 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-1 text-xs tabular-nums">
                      {asset.loan_date && (
                        <div className="flex items-center justify-between text-[var(--ds-fg-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[var(--ds-fg-muted)]" />
                            Tgl Pinjam:
                          </span>
                          <span className="font-semibold text-[var(--ds-fg)]">
                            {formatDateIndonesian(asset.loan_date)}
                          </span>
                        </div>
                      )}
                      {asset.due_date && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[var(--ds-fg-muted)]">
                            <Clock className="w-3 h-3 text-[var(--ds-fg-muted)]" />
                            Batas Kembali:
                          </span>
                          <span className={cn("font-semibold", isOverdue ? "text-[var(--ds-status-danger-fg)] font-bold" : "text-[var(--ds-fg)]")}>
                            {formatDateIndonesian(asset.due_date)}
                          </span>
                        </div>
                      )}
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
        </motion.div>
      </AnimatePresence>

      <AssetPhotoLightbox asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </>
  );
}
