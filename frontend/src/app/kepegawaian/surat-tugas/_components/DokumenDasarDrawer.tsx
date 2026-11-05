"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  ExternalLink,
  X,
  Loader2,
  Paperclip,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface DokumenDasarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  letterId?: string | null;
  hasFile?: boolean;
  fileName?: string | null;
}

function base64ToBlobUrl(base64DataUrl: string): string {
  try {
    const parts = base64DataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return base64DataUrl;
  }
}

export function DokumenDasarDrawer({
  isOpen,
  onClose,
  letterId,
  hasFile = true,
  fileName,
}: DokumenDasarDrawerProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [resolvedFileName, setResolvedFileName] = useState<string | null>(fileName || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdf, setIsPdf] = useState(true);

  // Fetch file preview data when drawer opens
  useEffect(() => {
    if (!isOpen || !letterId) {
      setDataUrl(null);
      setBlobUrl(null);
      setResolvedFileName(fileName || null);
      setIsLoading(false);
      return;
    }

    let active = true;
    let localBlobUrl: string | null = null;
    setIsLoading(true);
    setResolvedFileName(fileName || null);

    api
      .get(`/surat-tugas/${letterId}/download`, { params: { preview: 1 } })
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
        setDataUrl(resDataUrl);

        if (resDataUrl && typeof resDataUrl === "string" && resDataUrl.startsWith("data:")) {
          localBlobUrl = base64ToBlobUrl(resDataUrl);
          setBlobUrl(localBlobUrl);
        } else {
          setBlobUrl(resDataUrl || null);
        }
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err?.response?.data?.message || "Berkas dokumen dasar belum diunggah atau tidak ditemukan di server.";
        console.warn("Gagal memuat berkas dokumen dasar:", message);
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
  }, [isOpen, letterId, fileName]);

  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(`${blobUrl}#navpanes=0&view=FitH`, "_blank", "noopener");
      return;
    }
    if (!letterId) return;
    const streamUrl = `/api/surat-tugas/${letterId}/download?stream=1#navpanes=0&view=FitH`;
    window.open(streamUrl, "_blank", "noopener");
  };

  const handleDownload = () => {
    const targetUrl = blobUrl || dataUrl;
    if (!targetUrl) return;
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = resolvedFileName || `Dokumen_Dasar_${letterId || "ST"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const currentDisplayName = resolvedFileName || fileName;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-14 right-0 bottom-0 z-30 w-[640px] xl:w-[750px] 2xl:w-[850px] max-w-[calc(100vw-32rem)] bg-white dark:bg-zinc-900 border-l border-slate-200/90 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
          aria-label="Panel Dokumen Dasar"
        >
          {/* Header Panel */}
          <div className="px-5 py-3 bg-white dark:bg-zinc-900 flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                    Dokumen Dasar Permohonan
                  </h3>
                  {hasFile && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 shrink-0">
                      {isPdf ? "PDF" : "Gambar"}
                    </span>
                  )}
                </div>
                {currentDisplayName ? (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-md" title={currentDisplayName}>
                    {currentDisplayName}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">Berkas rujukan penugasan dari pemohon</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              {(blobUrl || dataUrl) && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenExternal}
                    className="h-8 px-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer gap-1.5"
                    title="Buka Berkas di Tab Baru (Layar Penuh)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tab Baru</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                    className="h-8 px-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer gap-1.5"
                    title="Unduh Berkas Dasar"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unduh</span>
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 h-8 w-8 p-0 rounded-lg cursor-pointer"
                title="Tutup Panel Dasar Surat (Kembali ke Pratinjau ST)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Document Content Viewer - Full Width & Height */}
          <div className="flex-1 bg-slate-100 dark:bg-zinc-950 flex flex-col items-center justify-center overflow-hidden p-2">
            {isLoading ? (
              <div className="text-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Memuat berkas pratinjau dokumen dasar...
                </p>
              </div>
            ) : blobUrl || dataUrl ? (
              isPdf ? (
                <iframe
                  src={
                    blobUrl
                      ? `${blobUrl}#navpanes=0&view=FitH&pagemode=none`
                      : dataUrl
                      ? `${dataUrl}#navpanes=0&view=FitH&pagemode=none`
                      : undefined
                  }
                  title="Pratinjau Dokumen Dasar"
                  className="w-full h-full rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white shadow-sm"
                />
              ) : (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-3">
                  <img
                    src={blobUrl || dataUrl || undefined}
                    alt="Pratinjau Dokumen Dasar"
                    className="max-h-full max-w-full object-contain rounded-xl shadow-md border border-slate-200 dark:border-zinc-800"
                  />
                </div>
              )
            ) : (
              <div className="text-center py-16 px-6 max-w-md space-y-3 text-slate-500 dark:text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400">
                  <FileQuestion className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                    Berkas Fisik Tidak Tersedia
                  </p>
                  <p className="text-xs leading-relaxed">
                    Pegawai tidak melampirkan berkas fisik (PDF/gambar) saat mengajukan surat tugas ini, atau berkas belum diunggah ke server.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
