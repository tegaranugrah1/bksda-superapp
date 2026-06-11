"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Download, Link2, Trash2, Upload, ExternalLink, Package as ZipIcon, X, ChevronLeft, ChevronRight, ShieldCheck, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  assetId: string;
  assetName: string;
  nup: string;
  fotoGeotagUrl: string | null;
  fotoGeotagPath: string | null;
  fotoBelakangUrl: string | null;
  fotoKiriUrl: string | null;
  fotoKananUrl: string | null;
  fotoLokasiUrl: string | null;
  frontLocationNote?: string | null;
  onSaveFrontLocation?: (value: string) => Promise<void>;
  fotoBpkb1Url?: string | null;
  fotoBpkb2Url?: string | null;
  fotoBpkb3Url?: string | null;
  fotoBpkb4Url?: string | null;
  fotoStnk1Url?: string | null;
  fotoStnk2Url?: string | null;
  isVehicle?: boolean;
  verifiedAt: string | null;
  verifiedByName: string | null;
  onRefresh: () => void;
}

const PHOTO_SLOTS = [
  { key: "geotag", label: "Foto Geotag", type: "hybrid" },
  { key: "lokasi", label: "Tampak Depan", type: "upload" },
  { key: "belakang", label: "Tampak Belakang", type: "upload" },
  { key: "kiri", label: "Tampak Kiri", type: "upload" },
  { key: "kanan", label: "Tampak Kanan", type: "upload" },
] as const;

const DOC_SLOTS = [
  { key: "bpkb_1", label: "Foto BPKB 1", type: "upload" },
  { key: "bpkb_2", label: "Foto BPKB 2", type: "upload" },
  { key: "bpkb_3", label: "Foto BPKB 3", type: "upload" },
  { key: "bpkb_4", label: "Foto BPKB 4", type: "upload" },
  { key: "stnk_1", label: "Foto STNK Depan", type: "upload" },
  { key: "stnk_2", label: "Foto STNK Belakang", type: "upload" },
] as const;

/** Convert Google Drive share link to embeddable thumbnail URL */
function driveToThumbnail(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

export function PhotoGallery({ assetId, assetName, nup, fotoGeotagUrl, fotoGeotagPath, fotoBelakangUrl, fotoKiriUrl, fotoKananUrl, fotoLokasiUrl, frontLocationNote, onSaveFrontLocation, fotoBpkb1Url, fotoBpkb2Url, fotoBpkb3Url, fotoBpkb4Url, fotoStnk1Url, fotoStnk2Url, isVehicle, verifiedAt, verifiedByName, onRefresh }: PhotoGalleryProps) {
  const { canWrite } = useRole();
  const [uploading, setUploading] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; label: string; index: number } | null>(null);
  const [geotagInput, setGeotagInput] = useState("");
  const [showGeotagInput, setShowGeotagInput] = useState(false);
  const [frontLocationDraft, setFrontLocationDraft] = useState(frontLocationNote || "");
  const [savingFrontLocation, setSavingFrontLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  // Geotag resolves to: local path (preferred) > external URL
  const resolvedGeotagUrl = fotoGeotagPath || fotoGeotagUrl;

  const photos: Record<string, string | null> = {
    geotag: resolvedGeotagUrl,
    belakang: fotoBelakangUrl,
    kiri: fotoKiriUrl,
    kanan: fotoKananUrl,
    lokasi: fotoLokasiUrl,
    bpkb_1: fotoBpkb1Url || null,
    bpkb_2: fotoBpkb2Url || null,
    bpkb_3: fotoBpkb3Url || null,
    bpkb_4: fotoBpkb4Url || null,
    stnk_1: fotoStnk1Url || null,
    stnk_2: fotoStnk2Url || null,
  };

  const hasAnyPhoto = Object.values(photos).some(Boolean);
  const confirm = useConfirm();

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
  const allSlots = isVehicle ? [...PHOTO_SLOTS, ...DOC_SLOTS] : PHOTO_SLOTS;
  const availablePhotos = allSlots.map((slot) => {
    const url = photos[slot.key];
    if (!url) return null;
    const isExternalOnly = slot.type === "hybrid" && !fotoGeotagPath && !!fotoGeotagUrl;
    const displayUrl = isExternalOnly ? driveToThumbnail(url)?.replace("sz=w400", "sz=w1200") || url : url;
    return { key: slot.key, label: slot.label, url: displayUrl };
  }).filter(Boolean) as { key: string; label: string; url: string }[];

  const openLightbox = (key: string) => {
    const idx = availablePhotos.findIndex(p => p.key === key);
    if (idx >= 0) setLightbox({ url: availablePhotos[idx].url, label: availablePhotos[idx].label, index: idx });
  };

  const navigateLightbox = (dir: 1 | -1) => {
    if (!lightbox || availablePhotos.length <= 1) return;
    const next = (lightbox.index + dir + availablePhotos.length) % availablePhotos.length;
    setLightbox({ url: availablePhotos[next].url, label: availablePhotos[next].label, index: next });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maksimal 5MB"); return; }

    setUploading(uploadTarget);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      if (uploadTarget === "geotag") {
        // Hybrid geotag endpoint
        await api.post(`/bmn/assets/${assetId}/geotag`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        formData.append("type", uploadTarget);
        await api.post(`/bmn/assets/${assetId}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success("Foto berhasil diupload.");
      onRefresh();
    } catch { toast.error("Gagal upload foto."); }
    finally { setUploading(null); setUploadTarget(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSaveGeotag = async () => {
    if (!geotagInput.trim()) return;
    try {
      await api.post(`/bmn/assets/${assetId}/geotag`, { url: geotagInput.trim() });
      toast.success("Link geotag berhasil disimpan.");
      setShowGeotagInput(false);
      setGeotagInput("");
      onRefresh();
    } catch { toast.error("Gagal menyimpan link."); }
  };

  const handleDelete = async (type: string) => {
    const ok = await confirm({
      title: "Hapus Foto",
      description: "Yakin ingin menghapus foto ini? Tindakan tidak bisa dibatalkan.",
      confirmText: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/bmn/assets/${assetId}/photo/${type}`);
      toast.success("Foto dihapus.");
      onRefresh();
    } catch { toast.error("Gagal menghapus."); }
  };

  const handleDownload = async (type: string) => {
    if (type === "geotag") {
      // If local file, download via API; if external URL, open in new tab
      if (fotoGeotagPath) {
        try {
          const res = await api.get(`/bmn/assets/${assetId}/photo/geotag/download`, { responseType: "blob" });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement("a");
          link.href = url;
          const slug = assetName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
          link.setAttribute("download", `${slug}_${nup}_geotag.jpg`);
          document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
        } catch { toast.error("Foto tidak tersedia."); }
      } else if (fotoGeotagUrl) {
        window.open(fotoGeotagUrl, "_blank");
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
      document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
    } catch { toast.error("Foto tidak tersedia."); }
  };

  const handleDownloadAll = async () => {
    try {
      const res = await api.get(`/bmn/assets/${assetId}/photos/download-all`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const slug = assetName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      link.setAttribute("download", `BMN_${slug}_${nup}_Foto.zip`);
      document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
    } catch { toast.error("Tidak ada foto untuk diunduh."); }
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
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200/60 dark:ring-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 dark:from-zinc-800/50 to-white dark:to-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600"><Camera className="w-4 h-4" /></span>
          <h3 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Dokumentasi Foto</h3>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button variant="outline" size="sm" className="text-[10px] rounded-lg h-7 gap-1" onClick={handleVerify}>
              <ShieldCheck className="w-3 h-3" /> Verifikasi BMN
            </Button>
          )}
          {hasAnyPhoto && (
            <Button variant="outline" size="sm" className="text-[10px] rounded-lg h-7 gap-1" onClick={handleDownloadAll}>
              <ZipIcon className="w-3 h-3" /> Download Semua
            </Button>
          )}
        </div>
      </div>

      {/* Verified status */}
      {verifiedAt && (
        <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Telah diverifikasi pada {new Date(verifiedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {verifiedByName && ` oleh ${verifiedByName}`}
          </span>
        </div>
      )}

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {PHOTO_SLOTS.map((slot) => (
          <PhotoSlot
            key={slot.key}
            slot={slot}
            url={photos[slot.key]}
            frontLocationDraft={slot.key === "lokasi" ? frontLocationDraft : undefined}
            onFrontLocationChange={slot.key === "lokasi" ? setFrontLocationDraft : undefined}
            onSaveFrontLocation={slot.key === "lokasi" ? saveFrontLocation : undefined}
            savingFrontLocation={slot.key === "lokasi" ? savingFrontLocation : false}
            openLightbox={openLightbox}
            handleDownload={handleDownload}
            copyLink={copyLink}
            handleDelete={handleDelete}
            setUploadTarget={setUploadTarget}
            fileInputRef={fileInputRef}
            setShowGeotagInput={setShowGeotagInput}
            canWrite={canWrite}
            fotoGeotagPath={fotoGeotagPath}
            fotoGeotagUrl={fotoGeotagUrl}
          />
        ))}
      </div>

      {isVehicle && (
        <>
          <div className="px-5 py-3.5 border-y border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 dark:from-zinc-800/50 to-white dark:to-zinc-900 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600"><FileText className="w-4 h-4" /></span>
            <h3 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Dokumen Kendaraan</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {DOC_SLOTS.map((slot) => (
              <PhotoSlot key={slot.key} slot={slot} url={photos[slot.key]} openLightbox={openLightbox} handleDownload={handleDownload} copyLink={copyLink} handleDelete={handleDelete} setUploadTarget={setUploadTarget} fileInputRef={fileInputRef} setShowGeotagInput={setShowGeotagInput} canWrite={canWrite} fotoGeotagPath={null} fotoGeotagUrl={null} />
            ))}
          </div>
        </>
      )}


      {/* Geotag URL Input */}
      {showGeotagInput && (
        <div className="px-5 pb-4 flex gap-2">
          <input
            type="url"
            value={geotagInput}
            onChange={(e) => setGeotagInput(e.target.value)}
            placeholder="https://link-foto-geotag..."
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <Button size="sm" onClick={handleSaveGeotag} className="rounded-lg bg-emerald-600">Simpan</Button>
          <Button size="sm" variant="outline" onClick={() => setShowGeotagInput(false)} className="rounded-lg">Batal</Button>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {uploading && (
        <div className="px-5 pb-4 text-xs text-emerald-600 font-medium animate-pulse">Mengupload foto {uploading}...</div>
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
    </div>
  );
}

function Lightbox({ url, label, index, total, onClose, onPrev, onNext }: {
  url: string; label: string; index: number; total: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") onPrev();
    if (e.key === "ArrowRight") onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>

      {/* Label + Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-medium z-10">
        {label} <span className="text-white/40 ml-2">{index + 1} / {total}</span>
      </div>

      {/* Prev Arrow */}
      {total > 1 && (
        <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next Arrow */}
      {total > 1 && (
        <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10" onClick={(e) => { e.stopPropagation(); onNext(); }}>
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

interface PhotoSlotProps {
  slot: { key: string; label: string; type: string };
  url: string | null;
  frontLocationDraft?: string;
  onFrontLocationChange?: (value: string) => void;
  onSaveFrontLocation?: () => void;
  savingFrontLocation?: boolean;
  openLightbox: (key: string) => void;
  handleDownload: (key: string) => void;
  copyLink: (url: string) => void;
  handleDelete: (key: string) => void;
  setUploadTarget: (target: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setShowGeotagInput: (show: boolean) => void;
  canWrite: boolean;
  fotoGeotagPath: string | null;
  fotoGeotagUrl: string | null;
}

function PhotoSlot({ slot, url, frontLocationDraft, onFrontLocationChange, onSaveFrontLocation, savingFrontLocation, openLightbox, handleDownload, copyLink, handleDelete, setUploadTarget, fileInputRef, setShowGeotagInput, canWrite, fotoGeotagPath, fotoGeotagUrl }: PhotoSlotProps) {
  const isHybrid = slot.type === "hybrid";
  const isExternalOnly = isHybrid && !fotoGeotagPath && !!fotoGeotagUrl;
  const isFrontView = slot.key === "lokasi";

  return (
    <div className="group relative">
      <div className={cn(
        "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
        url ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5" : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600"
      )}>
        {url ? (
          isExternalOnly ? (
            (() => {
              const thumb = driveToThumbnail(url);
              return thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={slot.label} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" referrerPolicy="no-referrer" onClick={() => openLightbox(slot.key)} />
              ) : (
                <div className="flex flex-col items-center gap-2 p-3 text-center">
                  <ExternalLink className="w-6 h-6 text-emerald-600" />
                  <p className="text-[9px] text-emerald-700 font-bold">Link Tersedia</p>
                </div>
              );
            })()
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={slot.label} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => openLightbox(slot.key)} />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 p-3 text-center">
            <Camera className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
            <p className="text-[9px] text-zinc-400 font-medium">Belum ada</p>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 text-center mt-1.5">{slot.label}</p>
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
          placeholder="Isi lokasi/ruangan barang..."
          className="mt-1 h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-center text-[10px] font-medium text-zinc-600 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        />
      )}
      {isFrontView && !canWrite && frontLocationDraft && (
        <p className="mt-0.5 min-h-4 truncate text-center text-[9px] font-medium text-zinc-400 dark:text-zinc-500" title={frontLocationDraft}>
          {frontLocationDraft}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-1 mt-1">
        {url && (
          <>
            <button onClick={() => handleDownload(slot.key)} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="Download">
              <Download className="w-3 h-3" />
            </button>
            <button onClick={() => copyLink(url)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500" title="Copy Link">
              <Link2 className="w-3 h-3" />
            </button>
            {canWrite && (
              <button onClick={() => handleDelete(slot.key)} className="p-1 rounded hover:bg-red-50 text-red-500" title="Hapus">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </>
        )}
        {canWrite && !url && (
          isHybrid ? (
            <>
              <button onClick={() => { setUploadTarget("geotag"); fileInputRef.current?.click(); }} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Upload File">
                <Upload className="w-3 h-3" />
              </button>
              <button onClick={() => setShowGeotagInput(true)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Tambah Link">
                <Link2 className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button onClick={() => { setUploadTarget(slot.key); fileInputRef.current?.click(); }} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Upload">
              <Upload className="w-3 h-3" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
