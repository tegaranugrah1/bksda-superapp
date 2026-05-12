"use client";

import { useState, useRef } from "react";
import { Camera, Download, Link2, Trash2, Upload, ExternalLink, Package as ZipIcon } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  assetId: string;
  assetName: string;
  nup: string;
  fotoGeotagUrl: string | null;
  fotoDepanUrl: string | null;
  fotoBelakangUrl: string | null;
  fotoKiriUrl: string | null;
  fotoKananUrl: string | null;
  onRefresh: () => void;
}

const PHOTO_SLOTS = [
  { key: "geotag", label: "Foto Geotag", type: "link" },
  { key: "depan", label: "Tampak Depan", type: "upload" },
  { key: "belakang", label: "Tampak Belakang", type: "upload" },
  { key: "kiri", label: "Tampak Kiri", type: "upload" },
  { key: "kanan", label: "Tampak Kanan", type: "upload" },
] as const;

/** Convert Google Drive share link to embeddable thumbnail URL */
function driveToThumbnail(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

export function PhotoGallery({ assetId, assetName, nup, fotoGeotagUrl, fotoDepanUrl, fotoBelakangUrl, fotoKiriUrl, fotoKananUrl, onRefresh }: PhotoGalleryProps) {
  const { canWrite } = useRole();
  const [uploading, setUploading] = useState<string | null>(null);
  const [geotagInput, setGeotagInput] = useState("");
  const [showGeotagInput, setShowGeotagInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const photos: Record<string, string | null> = {
    geotag: fotoGeotagUrl,
    depan: fotoDepanUrl,
    belakang: fotoBelakangUrl,
    kiri: fotoKiriUrl,
    kanan: fotoKananUrl,
  };

  const hasAnyPhoto = Object.values(photos).some(Boolean);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maksimal 5MB"); return; }

    setUploading(uploadTarget);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("type", uploadTarget);

    try {
      await api.post(`/bmn/assets/${assetId}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Foto berhasil diupload.");
      onRefresh();
    } catch { toast.error("Gagal upload foto."); }
    finally { setUploading(null); setUploadTarget(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSaveGeotag = async () => {
    if (!geotagInput.trim()) return;
    try {
      await api.put(`/bmn/assets/${assetId}/geotag`, { url: geotagInput.trim() });
      toast.success("Link geotag berhasil disimpan.");
      setShowGeotagInput(false);
      setGeotagInput("");
      onRefresh();
    } catch { toast.error("Gagal menyimpan link."); }
  };

  const handleDelete = async (type: string) => {
    if (!confirm("Hapus foto ini?")) return;
    try {
      await api.delete(`/bmn/assets/${assetId}/photo/${type}`);
      toast.success("Foto dihapus.");
      onRefresh();
    } catch { toast.error("Gagal menghapus."); }
  };

  const handleDownload = async (type: string) => {
    if (type === "geotag" && fotoGeotagUrl) {
      window.open(fotoGeotagUrl, "_blank");
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

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600"><Camera className="w-4 h-4" /></span>
          <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Dokumentasi Foto</h3>
        </div>
        {hasAnyPhoto && (
          <Button variant="outline" size="sm" className="text-[10px] rounded-lg h-7 gap-1" onClick={handleDownloadAll}>
            <ZipIcon className="w-3 h-3" /> Download Semua
          </Button>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {PHOTO_SLOTS.map((slot) => {
          const url = photos[slot.key];
          const isGeotag = slot.type === "link";

          return (
            <div key={slot.key} className="group relative">
              <div className={cn(
                "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
                url ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-slate-50 hover:border-slate-300"
              )}>
                {url ? (
                  isGeotag ? (
                    (() => {
                      const thumb = driveToThumbnail(url);
                      return thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={slot.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-3 text-center">
                          <ExternalLink className="w-6 h-6 text-emerald-600" />
                          <p className="text-[9px] text-emerald-700 font-bold">Link Tersedia</p>
                        </div>
                      );
                    })()
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={slot.label} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-1 p-3 text-center">
                    <Camera className="w-5 h-5 text-slate-300" />
                    <p className="text-[9px] text-slate-400 font-medium">Belum ada</p>
                  </div>
                )}
              </div>

              {/* Label */}
              <p className="text-[10px] font-bold text-slate-600 text-center mt-1.5">{slot.label}</p>

              {/* Actions */}
              <div className="flex items-center justify-center gap-1 mt-1">
                {url && (
                  <>
                    <button onClick={() => handleDownload(slot.key)} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="Download">
                      <Download className="w-3 h-3" />
                    </button>
                    <button onClick={() => copyLink(url)} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Copy Link">
                      <Link2 className="w-3 h-3" />
                    </button>
                    {canWrite && !isGeotag && (
                      <button onClick={() => handleDelete(slot.key)} className="p-1 rounded hover:bg-red-50 text-red-500" title="Hapus">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
                {canWrite && !url && (
                  isGeotag ? (
                    <button onClick={() => setShowGeotagInput(true)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Tambah Link">
                      <Link2 className="w-3 h-3" />
                    </button>
                  ) : (
                    <button onClick={() => { setUploadTarget(slot.key); fileInputRef.current?.click(); }} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Upload">
                      <Upload className="w-3 h-3" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Geotag URL Input */}
      {showGeotagInput && (
        <div className="px-5 pb-4 flex gap-2">
          <input
            type="url"
            value={geotagInput}
            onChange={(e) => setGeotagInput(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
    </div>
  );
}
