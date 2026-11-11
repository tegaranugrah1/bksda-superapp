"use client";

import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Camera, Download, Eye, Link2, Trash2, Upload, ExternalLink, Package as ZipIcon, X, ChevronLeft, ChevronRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

export interface PhotoGalleryRef {
  openLightbox: (key: string) => void;
}

export interface PhotoGalleryProps {
  assetId: string;
  assetName: string;
  nup: string;
  fotoGeotagUrl: string | null;
  fotoGeotagPath: string | null;
  fotoDepanUrl: string | null;
  fotoBelakangUrl: string | null;
  fotoKiriUrl: string | null;
  fotoKananUrl: string | null;
  frontLocationNote?: string | null;
  onSaveFrontLocation?: (value: string) => Promise<void>;
  fotoBpkb1Url?: string | null;
  fotoBpkb2Url?: string | null;
  fotoBpkb3Url?: string | null;
  fotoBpkb4Url?: string | null;
  fotoStnk1Url?: string | null;
  fotoStnk2Url?: string | null;
  bpkbDocument?: VehicleDocument | null;
  stnkDocument?: VehicleDocument | null;
  isVehicle?: boolean;
  verifiedAt: string | null;
  verifiedByName: string | null;
  onRefresh: () => void | Promise<unknown>;
}

export interface VehicleDocument {
  path: string;
  mime?: string | null;
  original_name?: string | null;
  preview_path?: string | null;
  url: string;
  download_url: string;
  preview_url?: string | null;
  preview_urls?: string[];
}

const PHOTO_SLOTS = [
  { key: "geotag", label: "Foto Geotag", shortLabel: "GEOTAG", type: "hybrid" },
  { key: "depan", label: "Tampak Depan", shortLabel: "DEPAN", type: "upload" },
  { key: "belakang", label: "Tampak Belakang", shortLabel: "BELAKANG", type: "upload" },
  { key: "kiri", label: "Tampak Kiri", shortLabel: "KIRI", type: "upload" },
  { key: "kanan", label: "Tampak Kanan", shortLabel: "KANAN", type: "upload" },
] as const;

const DOC_SLOTS = [
  { key: "bpkb", label: "BPKB", description: "Scan BPKB kendaraan" },
  { key: "stnk", label: "STNK", description: "Scan STNK kendaraan" },
] as const;

const PHOTO_ACCEPT = "image/*";
const DOCUMENT_ACCEPT = ".pdf,application/pdf,image/jpeg,image/png,image/webp";

/** Convert Google Drive share link to embeddable thumbnail URL */
export function driveToThumbnail(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  const firstError = response?.data?.errors ? Object.values(response.data.errors)[0]?.[0] : null;

  return firstError || response?.data?.message || fallback;
}

function resolveApiUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return url;

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase || apiBase === "/api" || !apiBase.startsWith("http")) {
    return url;
  }

  const origin = new URL(apiBase).origin;
  return `${origin}${url}`;
}

function getDocumentPreviewPages(document?: VehicleDocument | null): string[] {
  const urls = document?.preview_urls?.length ? document.preview_urls : (document?.preview_url ? [document.preview_url] : []);

  return urls.map((url) => resolveApiUrl(url)).filter(Boolean) as string[];
}

export const PhotoGallery = forwardRef<PhotoGalleryRef, PhotoGalleryProps>(function PhotoGallery(
  {
    assetId,
    assetName,
    nup,
    fotoGeotagUrl,
    fotoGeotagPath,
    fotoDepanUrl,
    fotoBelakangUrl,
    fotoKiriUrl,
    fotoKananUrl,
    frontLocationNote,
    onSaveFrontLocation,
    fotoBpkb1Url,
    fotoBpkb2Url,
    fotoBpkb3Url,
    fotoBpkb4Url,
    fotoStnk1Url,
    fotoStnk2Url,
    bpkbDocument,
    stnkDocument,
    isVehicle,
    verifiedAt,
    verifiedByName,
    onRefresh,
  },
  ref
) {
  const { hasPermission } = useRole();
  const canUpdate = hasPermission("bmn.asset.update");
  const previewTrigger = useRef<HTMLElement | null>(null);
  const restorePreviewFocus = () => { if (previewTrigger.current?.isConnected) previewTrigger.current.focus(); };
  const [uploading, setUploading] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; label: string; index: number } | null>(null);
  const [documentLightbox, setDocumentLightbox] = useState<{ pages: string[]; label: string; index: number } | null>(null);
  const [geotagInput, setGeotagInput] = useState("");
  const [showGeotagInput, setShowGeotagInput] = useState(false);
  const [frontLocationDraft, setFrontLocationDraft] = useState(frontLocationNote || "");
  const [savingFrontLocation, setSavingFrontLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const uploadKindRef = useRef<"photo" | "document">("photo");
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<"photo" | "document">("photo");

  // Geotag resolves to: local path (preferred) > external URL
  const resolvedGeotagUrl = fotoGeotagPath || fotoGeotagUrl;

  const photos: Record<string, string | null> = {
    geotag: resolvedGeotagUrl,
    depan: fotoDepanUrl,
    belakang: fotoBelakangUrl,
    kiri: fotoKiriUrl,
    kanan: fotoKananUrl,
    bpkb_1: fotoBpkb1Url || null,
    bpkb_2: fotoBpkb2Url || null,
    bpkb_3: fotoBpkb3Url || null,
    bpkb_4: fotoBpkb4Url || null,
    stnk_1: fotoStnk1Url || null,
    stnk_2: fotoStnk2Url || null,
  };

  const hasAnyPhoto = Object.values(photos).some(Boolean);
  const documents: Record<string, VehicleDocument | null | undefined> = {
    bpkb: bpkbDocument,
    stnk: stnkDocument,
  };
  const hasAnyDocument = Object.values(documents).some(Boolean);
  const confirm = useConfirm();

  // Count filled photos among 5 standard slots
  const filledCount = PHOTO_SLOTS.filter((s) => Boolean(photos[s.key])).length;

  const handleVerify = async () => {
    const ok = await confirm({
      title: "Verifikasi BMN",
      description: "Lakukan verifikasi BMN untuk aset ini? Tindakan ini akan mencatat tanggal dan nama verifikator.",
      confirmText: "Ya, Verifikasi",
      variant: "default",
    });
    if (!ok) return;
    try {
      await api.post(`/bmn/assets/${assetId}/verify`);
      toast.success("Aset berhasil diverifikasi.");
      onRefresh();
    } catch {
      toast.error("Gagal memverifikasi aset.");
    }
  };

  // Get all available photos for navigation
  const availablePhotos = PHOTO_SLOTS.map((slot) => {
    const url = photos[slot.key];
    if (!url) return null;
    const isExternalOnly = slot.type === "hybrid" && !fotoGeotagPath && !!fotoGeotagUrl;
    const displayUrl = isExternalOnly ? driveToThumbnail(url)?.replace("sz=w400", "sz=w1200") || url : url;
    return { key: slot.key, label: slot.label, url: displayUrl };
  }).filter(Boolean) as { key: string; label: string; url: string }[];

  const openLightbox = (key: string) => {
    previewTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const idx = availablePhotos.findIndex((p) => p.key === key);
    if (idx >= 0) {
      setLightbox({ url: availablePhotos[idx].url, label: availablePhotos[idx].label, index: idx });
    } else if (photos[key]) {
      const url = photos[key]!;
      setLightbox({ url, label: "Foto Aset", index: 0 });
    }
  };

  useImperativeHandle(ref, () => ({
    openLightbox,
  }));

  const openDocumentLightbox = (document: VehicleDocument | null | undefined, label: string) => {
    previewTrigger.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    const pages = getDocumentPreviewPages(document);
    if (pages.length > 0) {
      setDocumentLightbox({ pages, label, index: 0 });
      return;
    }

    const viewUrl = resolveApiUrl(document?.url);
    if (viewUrl) window.open(viewUrl, "_blank", "noopener,noreferrer");
  };

  const navigateLightbox = (dir: 1 | -1) => {
    if (!lightbox || availablePhotos.length <= 1) return;
    const next = (lightbox.index + dir + availablePhotos.length) % availablePhotos.length;
    setLightbox({ url: availablePhotos[next].url, label: availablePhotos[next].label, index: next });
  };

  const navigateDocumentLightbox = (dir: 1 | -1) => {
    if (!documentLightbox || documentLightbox.pages.length <= 1) return;
    const next = (documentLightbox.index + dir + documentLightbox.pages.length) % documentLightbox.pages.length;
    setDocumentLightbox({ ...documentLightbox, index: next });
  };

  const openUploadPicker = (target: string, kind: "photo" | "document" = "photo") => {
    uploadTargetRef.current = target;
    uploadKindRef.current = kind;
    setUploadTarget(target);
    setUploadKind(kind);

    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.accept = kind === "document" ? DOCUMENT_ACCEPT : PHOTO_ACCEPT;
    input.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current || uploadTarget;
    const kind = uploadKindRef.current || uploadKind;
    if (!file || !target) return;
    const maxSize = kind === "document" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(kind === "document" ? "Maksimal 20MB" : "Maksimal 5MB");
      return;
    }

    setUploading(target);
    const formData = new FormData();

    try {
      if (kind === "document") {
        formData.append("document", file);
        formData.append("type", target);
        await api.post(`/bmn/assets/${assetId}/document`, formData);
        toast.success(`Dokumen ${target.toUpperCase()} berhasil diupload.`);
      } else if (target === "geotag") {
        formData.append("photo", file);
        await api.post(`/bmn/assets/${assetId}/geotag`, formData);
        toast.success("Foto Geotag berhasil diupload.");
      } else {
        formData.append("photo", file);
        formData.append("type", target);
        await api.post(`/bmn/assets/${assetId}/photo`, formData);
        toast.success("Foto berhasil diupload.");
      }
      await onRefresh();
      setDocumentLightbox(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, kind === "document" ? "Gagal upload dokumen." : "Gagal upload foto."));
    } finally {
      setUploading(null);
      setUploadTarget(null);
      setUploadKind("photo");
      uploadTargetRef.current = null;
      uploadKindRef.current = "photo";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveGeotag = async () => {
    if (!geotagInput.trim()) return;
    try {
      await api.post(`/bmn/assets/${assetId}/geotag`, { url: geotagInput.trim() });
      toast.success("Link geotag berhasil disimpan.");
      setShowGeotagInput(false);
      setGeotagInput("");
      onRefresh();
    } catch {
      toast.error("Gagal menyimpan link.");
    }
  };

  const handleDelete = async (type: string) => {
    const isDocument = type === "bpkb" || type === "stnk";
    const ok = await confirm({
      title: isDocument ? "Hapus Dokumen" : "Hapus Foto",
      description: isDocument
        ? "Yakin ingin menghapus dokumen kendaraan ini? Tindakan tidak bisa dibatalkan."
        : "Yakin ingin menghapus foto ini? Tindakan tidak bisa dibatalkan.",
      confirmText: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;
    try {
      if (isDocument) {
        await api.delete(`/bmn/assets/${assetId}/document/${type}`);
        toast.success("Dokumen dihapus.");
      } else {
        await api.delete(`/bmn/assets/${assetId}/photo/${type}`);
        toast.success("Foto dihapus.");
      }
      onRefresh();
    } catch {
      toast.error("Gagal menghapus.");
    }
  };

  const handleDownload = async (type: string) => {
    if (type === "bpkb" || type === "stnk") {
      const document = documents[type];
      const downloadUrl = resolveApiUrl(document?.download_url);
      if (downloadUrl) {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    if (type === "geotag") {
      if (fotoGeotagPath) {
        try {
          const res = await api.get(`/bmn/assets/${assetId}/photo/geotag/download`, { responseType: "blob" });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement("a");
          link.href = url;
          const slug = assetName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
          link.setAttribute("download", `${slug}_${nup}_geotag.jpg`);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        } catch {
          toast.error("Foto tidak tersedia.");
        }
      } else if (fotoGeotagUrl && (fotoGeotagUrl.startsWith("http://") || fotoGeotagUrl.startsWith("https://"))) {
        window.open(fotoGeotagUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    try {
      const res = await api.get(`/bmn/assets/${assetId}/photo/${type}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const slug = assetName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      link.setAttribute("download", `${slug}_${nup}_${type}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      toast.error("Foto tidak tersedia.");
    }
  };

  const handleDownloadAll = async () => {
    try {
      const res = await api.get(`/bmn/assets/${assetId}/photos/download-all`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const slug = assetName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      link.setAttribute("download", `BMN_${slug}_${nup}_Foto.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      toast.error("Tidak ada foto untuk diunduh.");
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link disalin ke clipboard.");
  };

  const saveFrontLocation = async () => {
    if (!onSaveFrontLocation) return;
    const nextValue = frontLocationDraft.trim();
    if (nextValue === (frontLocationNote || "")) return;

    setSavingFrontLocation(true);
    try {
      await onSaveFrontLocation(nextValue);
    } finally {
      setSavingFrontLocation(false);
    }
  };

  return (
    <section className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-3 sm:p-6 shadow-xs ">
      {/* Header Deck Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--ds-border-subtle)] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[var(--ds-fg)] tracking-tight">
                Dokumentasi &amp; Bukti Fisik Aset
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] text-xs font-semibold">
                {filledCount} / 5 Terisi
              </span>
            </div>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Kelengkapan sudut pandang standar audit BMN (Geotag, Tampak Depan, Belakang, Kiri, Kanan)
            </p>
          </div>
        </div>

        {/* Deck Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerify}
              className={cn(
                "h-8 text-xs gap-1.5 rounded-lg border-[var(--ds-border-subtle)]",
                verifiedAt ? "text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)]" : ""
              )}
            >
              <ShieldCheck className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              <span>{verifiedAt ? "Verifikasi Ulang" : "Verifikasi BMN"}</span>
            </Button>
          )}

          {hasAnyPhoto && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              className="h-8 text-xs gap-1.5 rounded-lg border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)]"
            >
              <ZipIcon className="w-4 h-4 text-[var(--ds-fg-muted)]" />
              <span>Download Semua</span>
            </Button>
          )}
        </div>
      </div>

      {/* Verified status banner */}
      {verifiedAt && (
        <div data-status="success" className="mt-4 px-4 py-2.5 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />
          <span className="text-xs text-[var(--ds-accent-fg)] font-medium">
            Telah diverifikasi BMN pada{" "}
            {new Date(verifiedAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {verifiedByName && ` oleh ${verifiedByName}`}
          </span>
        </div>
      )}

      {/* 5-Point Audit Photo Cards Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
        {PHOTO_SLOTS.map((slot) => (
          <PhotoCardSlot
            key={slot.key}
            slot={slot}
            url={photos[slot.key]}
            frontLocationDraft={slot.key === "depan" ? frontLocationDraft : undefined}
            onFrontLocationChange={slot.key === "depan" ? setFrontLocationDraft : undefined}
            onSaveFrontLocation={slot.key === "depan" ? saveFrontLocation : undefined}
            savingFrontLocation={slot.key === "depan" ? savingFrontLocation : false}
            openLightbox={openLightbox}
            handleDownload={handleDownload}
            copyLink={copyLink}
            handleDelete={handleDelete}
            openUploadPicker={openUploadPicker}
            setShowGeotagInput={setShowGeotagInput}
            canWrite={canUpdate}
            fotoGeotagPath={fotoGeotagPath}
            fotoGeotagUrl={fotoGeotagUrl}
          />
        ))}
      </div>

      {/* Vehicle Documents (BPKB & STNK) */}
      {isVehicle && (
        <div className="mt-6 pt-5 border-t border-[var(--ds-border-subtle)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)]">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-[var(--ds-fg)] uppercase tracking-wider">
                Dokumen Legalitas Kendaraan (BPKB &amp; STNK)
              </h4>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Pindaian dokumen kepemilikan dan pajak kendaraan bermotor
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOC_SLOTS.map((slot) => (
              <VehicleDocumentCard
                key={slot.key}
                slot={slot}
                document={documents[slot.key] || null}
                canWrite={canUpdate}
                onPreview={() => openDocumentLightbox(documents[slot.key], slot.label)}
                onDownload={() => handleDownload(slot.key)}
                onDelete={() => handleDelete(slot.key)}
                onUpload={() => openUploadPicker(slot.key, "document")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Geotag URL Input Modal/Bar */}
      {showGeotagInput && (
        <div className="mt-4 p-4 rounded-xl border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            aria-label="Tautan foto geotag"
            type="url"
            value={geotagInput}
            onChange={(e) => setGeotagInput(e.target.value)}
            placeholder="Tempel tautan Google Drive / Foto Geotag..."
            className="flex-1 px-3 py-2 text-xs border border-[var(--ds-border-subtle)] rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] outline-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSaveGeotag} className="bmn-button bmn-primary text-xs rounded-lg">
              Simpan Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowGeotagInput(false)} className="h-8 text-xs rounded-lg">
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={uploadKind === "document" ? DOCUMENT_ACCEPT : PHOTO_ACCEPT}
        className="hidden"
        onChange={handleUpload}
      />

      {uploading && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-[var(--ds-accent-soft)] text-xs text-[var(--ds-accent-fg)] font-medium flex items-center gap-2 motion-reduce:animate-none animate-pulse">
          <span className="w-2 h-2 rounded-full bg-current motion-reduce:animate-none animate-ping"></span>
          Mengunggah {uploadKind === "document" ? "dokumen" : "foto"} {uploading}...
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <Lightbox
          url={lightbox.url}
          label={lightbox.label}
          index={lightbox.index}
          total={availablePhotos.length}
          onReturnFocus={restorePreviewFocus}
          onClose={() => setLightbox(null)}
          onPrev={() => navigateLightbox(-1)}
          onNext={() => navigateLightbox(1)}
        />
      )}

      {documentLightbox && (
        <Lightbox
          url={documentLightbox.pages[documentLightbox.index]}
          label={documentLightbox.label}
          index={documentLightbox.index}
          total={documentLightbox.pages.length}
          onReturnFocus={restorePreviewFocus}
          onClose={() => setDocumentLightbox(null)}
          onPrev={() => navigateDocumentLightbox(-1)}
          onNext={() => navigateDocumentLightbox(1)}
        />
      )}
    </section>
  );
});

interface PhotoCardSlotProps {
  slot: { key: string; label: string; shortLabel: string; type: string };
  url: string | null;
  frontLocationDraft?: string;
  onFrontLocationChange?: (value: string) => void;
  onSaveFrontLocation?: () => void;
  savingFrontLocation?: boolean;
  openLightbox: (key: string) => void;
  handleDownload: (key: string) => void;
  copyLink: (url: string) => void;
  handleDelete: (key: string) => void;
  openUploadPicker: (target: string, kind?: "photo" | "document") => void;
  setShowGeotagInput: (show: boolean) => void;
  canWrite: boolean;
  fotoGeotagPath: string | null;
  fotoGeotagUrl: string | null;
}

function PhotoCardSlot({
  slot,
  url,
  frontLocationDraft,
  onFrontLocationChange,
  onSaveFrontLocation,
  savingFrontLocation,
  openLightbox,
  handleDownload,
  copyLink,
  handleDelete,
  openUploadPicker,
  setShowGeotagInput,
  canWrite,
  fotoGeotagPath,
  fotoGeotagUrl,
}: PhotoCardSlotProps) {
  const isHybrid = slot.type === "hybrid";
  const isExternalOnly = isHybrid && !fotoGeotagPath && !!fotoGeotagUrl;
  const isFrontView = slot.key === "depan";

  const displayThumb = isExternalOnly && url ? driveToThumbnail(url) : url;

  return (
    <div className="flex flex-col gap-2">
      {/* Box Image / Upload Trigger */}
      {url ? (
        <div>
          <button type="button" aria-label={`Lihat ${slot.label}`} onClick={() => openLightbox(slot.key)} className="relative block w-full rounded-xl overflow-hidden border border-[var(--ds-border-subtle)] aspect-4/3 bg-[var(--ds-surface-muted)] cursor-zoom-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayThumb || url} alt={slot.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[var(--ds-surface)] text-[var(--ds-fg)] text-xs">{slot.shortLabel}</span>
          </button>
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            <button type="button" onClick={() => openLightbox(slot.key)} className="bmn-button bmn-secondary rounded-lg p-2" aria-label={`Perbesar ${slot.label}`}><Eye className="w-4 h-4" /></button>
            <button type="button" onClick={() => handleDownload(slot.key)} className="bmn-button bmn-secondary rounded-lg p-2" aria-label={`Unduh ${slot.label}`}><Download className="w-4 h-4" /></button>
            <button type="button" onClick={() => copyLink(url)} className="bmn-button bmn-secondary rounded-lg p-2" aria-label={`Salin tautan ${slot.label}`}><Link2 className="w-4 h-4" /></button>
            {canWrite && <button type="button" onClick={() => handleDelete(slot.key)} className="bmn-button bmn-danger rounded-lg p-2" aria-label={`Hapus ${slot.label}`}><Trash2 className="w-4 h-4" /></button>}
          </div>
        </div>
      ) : (
        <div className="bmn-photo-upload rounded-xl border border-dashed border-[var(--ds-border-subtle)] aspect-4/3 flex flex-col items-center justify-center text-center bg-[var(--ds-surface-muted)]">
          <button type="button" disabled={!canWrite} aria-label={canWrite ? `Unggah ${slot.label}` : `Belum ada ${slot.label}`} onClick={() => openUploadPicker(slot.key)} className="bmn-photo-upload-trigger flex flex-col items-center justify-center gap-1.5 w-full flex-1 p-3 rounded-xl text-xs text-[var(--ds-fg-muted)]">
            <Camera className="w-5 h-5 text-[var(--ds-accent-fg)]" />
            <span className="font-semibold">{canWrite ? "+ Unggah Foto" : "Belum ada"}</span>
            <span>Maks. 5MB (PNG/JPG)</span>
          </button>
          {canWrite && isHybrid && <button type="button" onClick={() => setShowGeotagInput(true)} className="mb-3 text-xs text-[var(--ds-accent-fg)] hover:underline inline-flex items-center gap-1"><Link2 className="w-3 h-3" />Tautan Drive</button>}
        </div>
      )}

      {/* Caption & Metadata */}
      <div className="text-center">
        <div className="text-xs font-semibold text-[var(--ds-fg)]">{slot.label}</div>
        {url ? (
          <div className="text-xs text-[var(--ds-accent-fg)] flex items-center justify-center gap-1 mt-0.5 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Tersedia
          </div>
        ) : (
          <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">Menunggu Unggahan</div>
        )}

        {/* Front Location Specific Note */}
        {isFrontView && canWrite && onFrontLocationChange && onSaveFrontLocation && (
          <input
            aria-label="Lokasi spesifik foto tampak depan"
            value={frontLocationDraft || ""}
            onChange={(event) => onFrontLocationChange(event.target.value)}
            onBlur={onSaveFrontLocation}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            disabled={savingFrontLocation}
            placeholder="Ketik lokasi spesifik..."
            className="mt-1.5 min-h-9 w-full rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 text-center text-xs font-medium text-[var(--ds-fg-muted)] outline-none "
          />
        )}
        {isFrontView && !canWrite && frontLocationDraft && (
          <p className="mt-1 inline-block px-2 py-0.5 rounded bg-[var(--ds-surface-muted)] text-xs font-medium text-[var(--ds-fg-muted)] truncate max-w-full">
            {frontLocationDraft}
          </p>
        )}
      </div>
    </div>
  );
}

interface VehicleDocumentCardProps {
  slot: { key: "bpkb" | "stnk"; label: string; description: string };
  document: VehicleDocument | null;
  canWrite: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onUpload: () => void;
}

function VehicleDocumentCard({
  slot,
  document,
  canWrite,
  onPreview,
  onDownload,
  onDelete,
  onUpload,
}: VehicleDocumentCardProps) {
  const isPdf = document?.mime === "application/pdf";
  const filename = document?.original_name || document?.path?.split("/").pop() || `${slot.label}.pdf`;
  const previewUrl = resolveApiUrl(document?.preview_url);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-xs">
      <button
        type="button"
        disabled={!document}
        aria-label={document ? `Lihat ${slot.label}` : `Belum ada ${slot.label}`}
        onClick={document ? onPreview : undefined}
        className={cn(
          "relative flex h-44 w-full items-center justify-center overflow-hidden bg-[var(--ds-surface-muted)]",
          previewUrl ? "cursor-zoom-in" : "cursor-default"
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={slot.label} className="h-full w-full object-contain" />
        ) : document ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-10 w-10 text-[var(--ds-status-info-fg)]" />
            <span className="rounded-full bg-[var(--ds-status-info-bg)] px-2 py-0.5 text-xs font-bold text-[var(--ds-status-info-fg)]">
              {isPdf ? "DOKUMEN PDF" : "GAMBAR SCAN"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-9 w-9 text-[var(--ds-fg-muted)]" />
            <p className="text-xs font-semibold text-[var(--ds-fg-muted)]">Belum ada dokumen</p>
          </div>
        )}
      </button>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-[var(--ds-fg)]">{slot.label}</h4>
            {document && (
              <span className="rounded-md bg-[var(--ds-surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--ds-fg-muted)]">
                {isPdf ? "PDF" : "GAMBAR"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--ds-fg-muted)] truncate">
            {document ? filename : slot.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {document ? (
            <>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={onPreview}>
                <Eye className="h-3.5 w-3.5" /> Lihat
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" /> Unduh
              </Button>
              {canWrite && (
                <>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={onUpload}>
                    <Upload className="h-3.5 w-3.5" /> Ganti
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bmn-button bmn-danger rounded-lg text-xs"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </>
              )}
            </>
          ) : canWrite ? (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={onUpload}>
              <Upload className="h-3.5 w-3.5" /> Upload Dokumen
            </Button>
          ) : (
            <span className="text-xs text-[var(--ds-fg-muted)]">Belum tersedia</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Lightbox({ url, label, index, total, onClose, onPrev, onNext, onReturnFocus }: {
  url: string;
  label: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReturnFocus: () => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        data-module="bmn"
        showCloseButton={false}
        className="bmn-assets-ui bmn-detail-ui bmn-popover bmn-photo-dialog"
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}
        onKeyDown={(event) => {
          if (total <= 1) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); onPrev(); }
          if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
        }}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription className="text-[var(--ds-fg-muted)]">{index + 1} dari {total}</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <button type="button" aria-label="Tutup preview foto" className="bmn-button bmn-secondary absolute right-3 top-3 rounded-lg p-2"><X className="w-4 h-4" /></button>
        </DialogClose>
        {failedUrl === url ? <p role="status" className="bmn-photo-placeholder min-h-48">Foto tidak dapat dimuat</p> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="bmn-photo-full" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
        )}
        {total > 1 && <div className="flex items-center justify-between gap-2">
          <button type="button" className="bmn-button bmn-secondary inline-flex items-center gap-1 rounded-lg px-3 text-xs" onClick={onPrev}><ChevronLeft className="w-4 h-4" />Sebelumnya</button>
          <button type="button" className="bmn-button bmn-secondary inline-flex items-center gap-1 rounded-lg px-3 text-xs" onClick={onNext}>Berikutnya<ChevronRight className="w-4 h-4" /></button>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
