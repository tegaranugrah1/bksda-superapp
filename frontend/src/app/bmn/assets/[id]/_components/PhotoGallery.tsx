"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Camera, Download, Eye, Link2, Trash2, Upload, ExternalLink, Package as ZipIcon, X, ChevronLeft, ChevronRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

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

  const openLightbox = useCallback((key: string) => {
    const idx = availablePhotos.findIndex((p) => p.key === key);
    if (idx >= 0) {
      setLightbox({ url: availablePhotos[idx].url, label: availablePhotos[idx].label, index: idx });
    } else if (photos[key]) {
      const url = photos[key]!;
      setLightbox({ url, label: "Foto Aset", index: 0 });
    }
  }, [availablePhotos, photos]);

  useImperativeHandle(ref, () => ({
    openLightbox,
  }), [openLightbox]);

  const openDocumentLightbox = (document: VehicleDocument | null | undefined, label: string) => {
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
    <section className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
      {/* Header Deck Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Dokumentasi &amp; Bukti Fisik Aset
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold">
                {filledCount} / 5 Terisi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
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
                "h-8 text-xs gap-1.5 rounded-lg border-slate-200 dark:border-zinc-800",
                verifiedAt ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10" : ""
              )}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{verifiedAt ? "Verifikasi Ulang" : "Verifikasi BMN"}</span>
            </Button>
          )}

          {hasAnyPhoto && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              className="h-8 text-xs gap-1.5 rounded-lg border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
            >
              <ZipIcon className="w-4 h-4 text-slate-500" />
              <span>Download Semua</span>
            </Button>
          )}
        </div>
      </div>

      {/* Verified status banner */}
      {verifiedAt && (
        <div className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
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
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Dokumen Legalitas Kendaraan (BPKB &amp; STNK)
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
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
        <div className="mt-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="url"
            value={geotagInput}
            onChange={(e) => setGeotagInput(e.target.value)}
            placeholder="Tempel tautan Google Drive / Foto Geotag..."
            className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSaveGeotag} className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
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
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
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
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/20 dark:border-emerald-500/30 aspect-[4/3] bg-slate-100 dark:bg-zinc-800 group shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayThumb || url}
            alt={slot.label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy={displayThumb?.includes("drive.google.com") ? "no-referrer" : undefined}
          />
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono tracking-wider backdrop-blur-xs">
            {slot.shortLabel}
          </span>

          {/* Hover Actions Bar */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
            <button
              onClick={() => openLightbox(slot.key)}
              className="w-7 h-7 rounded-full bg-white/95 text-slate-800 hover:bg-white flex items-center justify-center shadow-xs transition-transform hover:scale-110"
              title="Lihat Foto"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDownload(slot.key)}
              className="w-7 h-7 rounded-full bg-white/95 text-slate-800 hover:bg-white flex items-center justify-center shadow-xs transition-transform hover:scale-110"
              title="Unduh"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => copyLink(url)}
              className="w-7 h-7 rounded-full bg-white/95 text-slate-800 hover:bg-white flex items-center justify-center shadow-xs transition-transform hover:scale-110"
              title="Salin Tautan"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            {canWrite && (
              <button
                onClick={() => handleDelete(slot.key)}
                className="w-7 h-7 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-xs transition-transform hover:scale-110"
                title="Hapus"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty Slot Trigger */
        <div
          onClick={() => (canWrite ? openUploadPicker(slot.key) : undefined)}
          className={cn(
            "rounded-xl border-2 border-dashed border-slate-300/80 dark:border-zinc-700 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition-all group bg-slate-50/50 dark:bg-zinc-800/30",
            canWrite ? "cursor-pointer hover:border-emerald-500/80 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5" : "cursor-default"
          )}
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors mb-1.5">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
            {canWrite ? "+ Unggah Foto" : "Belum ada"}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Maks. 5MB (PNG/JPG)</span>

          {/* Quick link button for geotag if empty */}
          {canWrite && isHybrid && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGeotagInput(true);
              }}
              className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <Link2 className="w-2.5 h-2.5" /> Tautan Drive
            </button>
          )}
        </div>
      )}

      {/* Caption & Metadata */}
      <div className="text-center">
        <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{slot.label}</div>
        {url ? (
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Tersedia
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Menunggu Unggahan</div>
        )}

        {/* Front Location Specific Note */}
        {isFrontView && canWrite && onFrontLocationChange && onSaveFrontLocation && (
          <input
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
            className="mt-1.5 h-6 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-center text-[10px] font-medium text-slate-700 dark:text-zinc-300 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
          />
        )}
        {isFrontView && !canWrite && frontLocationDraft && (
          <p className="mt-1 inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-zinc-400 truncate max-w-full">
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
    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-blue-300 dark:hover:border-blue-500/40 transition">
      <button
        type="button"
        onClick={document ? onPreview : undefined}
        className={cn(
          "relative flex h-44 w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-zinc-800/50",
          previewUrl ? "cursor-zoom-in" : "cursor-default"
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={slot.label} className="h-full w-full object-contain" />
        ) : document ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-10 w-10 text-blue-500" />
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              {isPdf ? "DOKUMEN PDF" : "GAMBAR SCAN"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-9 w-9 text-slate-300 dark:text-zinc-600" />
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Belum ada dokumen</p>
          </div>
        )}
      </button>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{slot.label}</h4>
            {document && (
              <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                {isPdf ? "PDF" : "GAMBAR"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 truncate">
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
                    className="h-8 rounded-lg border-rose-200 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/20"
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
            <span className="text-xs text-slate-400">Belum tersedia</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Lightbox({
  url,
  label,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  url: string;
  label: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        onClick={onClose}
        title="Tutup (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium z-10">
        {label} <span className="text-white/40 ml-2">{index + 1} / {total}</span>
      </div>

      {total > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          title="Sebelumnya (Panah Kiri)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {total > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          title="Berikutnya (Panah Kanan)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        referrerPolicy={url?.includes("drive.google.com") ? "no-referrer" : undefined}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
