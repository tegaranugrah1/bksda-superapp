"use client";

import { getPrimaryPhoto, type AssetPhotoSource } from "@/app/bmn/_lib/asset-photos";
import { BmnMediaImage } from "@/components/BmnMediaImage";

import { useState } from "react";
import { Camera, Eye, X } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

export function AssetPhotoPreview({ asset, name, nup }: {
  asset: AssetPhotoSource;
  name: string;
  nup: string;
}) {
  const [failedThumbnails, setFailedThumbnails] = useState<string[]>([]);
  const photo = getPrimaryPhoto(asset, failedThumbnails);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);

  if (!photo) {
    const message = getPrimaryPhoto(asset) ? "Foto tidak dapat dimuat"
      : Object.values(asset.photo_availability || {}).includes(false) ? "Berkas foto tidak ditemukan"
      : "Belum ada foto";
    return (
      <div className="bmn-asset-photo bmn-photo-placeholder">
        <Camera className="w-7 h-7" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="bmn-asset-photo bmn-photo-trigger" aria-label={`Lihat foto utama ${name} NUP ${nup}`}>
          {/* Authenticated URLs use the existing backend path; no image-optimizer fetch or new credentials. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <BmnMediaImage src={photo.url} alt={`Foto utama ${name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedThumbnails(previous => [...previous, photo.url])} />
          <span className="bmn-photo-affordance"><Eye className="w-4 h-4" aria-hidden="true" /><span className="sr-only">Perbesar foto</span></span>
        </button>
      </DialogTrigger>
      <DialogContent data-module="bmn" showCloseButton={false} className="bmn-assets-ui bmn-popover bmn-photo-dialog rounded-3xl p-4 shadow-lg border border-slate-200/80 dark:border-zinc-800">
        <DialogHeader className="pr-10">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription className="text-[var(--ds-fg-muted)]">NUP {nup} · {photo.label}</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <button type="button" aria-label="Tutup preview foto" className="bmn-button bmn-secondary absolute right-3 top-3 rounded-lg p-2"><X className="w-4 h-4" /></button>
        </DialogClose>
        {failedPreview === photo.url ? (
          <p role="status" className="bmn-photo-placeholder min-h-48">Foto tidak dapat dimuat</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <BmnMediaImage src={photo.url} alt={`Foto utama ${name}`} className="bmn-photo-full" referrerPolicy="no-referrer" onError={() => setFailedPreview(photo.url)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
