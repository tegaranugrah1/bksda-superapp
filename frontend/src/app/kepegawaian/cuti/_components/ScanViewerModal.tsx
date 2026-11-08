"use client";

import React, { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ScanViewerModalProps {
  isOpen: boolean;
  title?: string;
  scanUrl: string | null;
  fileName?: string | null;
  onClose: () => void;
}

function base64ToBlobUrl(base64DataUrl: string): string {
  try {
    const parts = base64DataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const rawMime = (mimeMatch ? mimeMatch[1] : "application/pdf").toLowerCase();
    const mime =
      rawMime === "application/pdf" || /^image\/(jpeg|jpg|png|webp|gif)$/.test(rawMime)
        ? rawMime
        : "application/pdf";
    const byteArray = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([byteArray], { type: mime }));
  } catch {
    return "";
  }
}

export function ScanViewerModal({
  isOpen,
  title = "Pratinjau Berkas Dokumen",
  scanUrl,
  fileName,
  onClose,
}: ScanViewerModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolvedFileName, setResolvedFileName] = useState<string | null>(fileName || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdf, setIsPdf] = useState(true);

  useEffect(() => {
    if (!isOpen || !scanUrl) {
      setPreviewUrl(null);
      setResolvedFileName(fileName || null);
      setIsLoading(false);
      return;
    }

    let active = true;
    let localBlobUrl: string | null = null;
    setIsLoading(true);
    setResolvedFileName(fileName || null);

    // Minta data pratinjau JSON dengan data_url base64 (identik dengan Surat Masuk)
    // Pendekatan ini mencegah download ganda dan tidak memicu hook interceptor downloader (IDM)
    api
      .get(scanUrl, { params: { preview: 1 } })
      .then((res) => {
        if (!active) return;
        const resDataUrl = res.data?.data_url || res.data?.data?.data_url;
        const serverFileName = res.data?.file_name || res.data?.data?.file_name;
        if (serverFileName) {
          setResolvedFileName(serverFileName);
        }
        const mimeType = String(
          res.data?.mime_type || res.data?.data?.mime_type || "application/pdf"
        );
        const effectiveName = (serverFileName || fileName || "").toLowerCase();
        const detectedIsPdf =
          mimeType.includes("pdf") ||
          (!mimeType.includes("image") && !effectiveName.match(/\.(jpe?g|png|webp)$/i));

        setIsPdf(detectedIsPdf);

        if (resDataUrl && typeof resDataUrl === "string" && resDataUrl.startsWith("data:")) {
          localBlobUrl = base64ToBlobUrl(resDataUrl);
          setPreviewUrl(localBlobUrl || null);
        } else if (
          resDataUrl &&
          typeof resDataUrl === "string" &&
          (resDataUrl.startsWith("http://") || resDataUrl.startsWith("https://") || resDataUrl.startsWith("/"))
        ) {
          setPreviewUrl(resDataUrl);
        } else {
          setPreviewUrl(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err?.response?.data?.message || "Berkas dokumen belum diunggah atau tidak ditemukan.";
        toast.error(message);
        onClose();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (localBlobUrl && localBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [isOpen, scanUrl, fileName, onClose]);

  if (!isOpen) return null;

  const currentDisplayName = resolvedFileName || fileName;

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = currentDisplayName || "Dokumen_Resmi.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = () => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              {currentDisplayName && (
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                  {currentDisplayName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previewUrl && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenExternal}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8 gap-1.5 rounded-xl font-bold cursor-pointer"
                  title="Buka Berkas di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Tab Baru
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                  title="Unduh Berkas"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-4 bg-slate-100 dark:bg-slate-950/60 overflow-y-auto flex items-center justify-center min-h-[50vh]">
          {isLoading ? (
            <div className="text-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Memuat berkas pratinjau resmi...</p>
            </div>
          ) : previewUrl ? (
            isPdf ? (
              <iframe
                src={previewUrl}
                title={title}
                className="w-full h-[72vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-xs"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={title}
                className="max-h-[72vh] max-w-full mx-auto object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
              />
            )
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Berkas dokumen tidak tersedia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
