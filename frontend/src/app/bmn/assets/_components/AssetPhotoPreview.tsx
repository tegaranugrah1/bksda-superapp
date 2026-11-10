"use client";

import { useState } from "react";
import { Camera, Eye, X } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

export function AssetPhotoPreview({ photo, name, nup }: {
  photo: { url: string; label: string } | null;
  name: string;
  nup: string;
}) {
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);

  if (!photo || failedThumbnail === photo.url) {
    return (
      <div className="bmn-asset-photo bmn-photo-placeholder">
        <Camera className="w-7 h-7" aria-hidden="true" />
        <span>{photo ? "Foto tidak dapat dimuat" : "Belum ada foto"}</span>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="bmn-asset-photo bmn-photo-trigger" aria-label={`Lihat foto utama ${name} NUP ${nup}`}>
          {/* Authenticated URLs use the existing backend path; no image-optimizer fetch or new credentials. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Foto utama ${name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedThumbnail(photo.url)} />
          <span className="bmn-photo-affordance"><Eye className="w-4 h-4" aria-hidden="true" /><span className="sr-only">Perbesar foto</span></span>
        </button>
      </DialogTrigger>
      <DialogContent data-module="bmn" showCloseButton={false} className="bmn-assets-ui bmn-popover bmn-photo-dialog">
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
          <img src={photo.url} alt={`Foto utama ${name}`} className="bmn-photo-full" referrerPolicy="no-referrer" onError={() => setFailedPreview(photo.url)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
