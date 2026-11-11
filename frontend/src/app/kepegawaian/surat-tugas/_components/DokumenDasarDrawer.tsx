"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const reducedMotion = useReducedMotion();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => opener?.focus();
  }, [isOpen]);

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
    setDataUrl(null);
    setBlobUrl(null);
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
          initial={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : 12 }}
          transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
          className="fixed top-14 right-0 bottom-0 z-30 w-[640px] xl:w-[750px] 2xl:w-[850px] max-w-full lg:max-w-[calc(100vw-28rem)] bg-[var(--ds-surface)] border-l border-[var(--ds-border-subtle)] shadow-2xl flex flex-col overflow-hidden"
          aria-label="Panel Dokumen Dasar"
          onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
        >
          {/* Header Panel */}
          <div className="px-5 py-3 bg-[var(--ds-surface)] flex items-center justify-between border-b border-[var(--ds-border-subtle)] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border border-[var(--ds-border-subtle)] flex items-center justify-center shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[var(--ds-fg)] truncate">
                    Dokumen Dasar Permohonan
                  </h3>
                  {hasFile && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border border-[var(--ds-border-subtle)] shrink-0">
                      {isPdf ? "PDF" : "Gambar"}
                    </span>
                  )}
                </div>
                {currentDisplayName ? (
                  <p className="text-xs text-[var(--ds-fg-muted)] truncate max-w-md" title={currentDisplayName}>
                    {currentDisplayName}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--ds-fg-muted)]">Berkas rujukan penugasan dari pemohon</p>
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
                    className="h-8 px-2.5 text-xs font-semibold text-[var(--ds-fg-muted)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] rounded-lg cursor-pointer gap-1.5"
                    title="Buka Berkas di Tab Baru (Layar Penuh)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                    <span>Tab Baru</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                    className="h-8 px-2.5 text-xs font-semibold text-[var(--ds-fg-muted)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] rounded-lg cursor-pointer gap-1.5"
                    title="Unduh Berkas Dasar"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                    <span>Unduh</span>
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                ref={closeButton}
                aria-label="Tutup panel dokumen dasar"
                onClick={onClose}
                className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] h-8 w-8 p-0 rounded-lg cursor-pointer"
                title="Tutup Panel Dasar Surat (Kembali ke Pratinjau ST)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Document Content Viewer - Full Width & Height */}
          <div className="flex-1 bg-[var(--ds-surface-muted)] flex flex-col items-center justify-center overflow-hidden p-2">
            {isLoading ? (
              <div className="text-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-[var(--ds-accent-fg)] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[var(--ds-fg-muted)]">
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
                  className="w-full h-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-sm"
                />
              ) : (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-3">
                  {/* Native blob/data preview; the object URL belongs to this browser session. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blobUrl || dataUrl || undefined}
                    alt="Pratinjau Dokumen Dasar"
                    className="max-h-full max-w-full object-contain rounded-xl shadow-md border border-[var(--ds-border-subtle)]"
                  />
                </div>
              )
            ) : (
              <div className="text-center py-16 px-6 max-w-md space-y-3 text-[var(--ds-fg-muted)]">
                <div className="w-12 h-12 rounded-2xl bg-[var(--ds-surface-muted)] flex items-center justify-center mx-auto text-[var(--ds-fg-muted)]">
                  <FileQuestion className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[var(--ds-fg-muted)]">
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
