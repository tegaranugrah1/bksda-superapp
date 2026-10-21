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

export function ScanViewerModal({
  isOpen,
  title = "Pratinjau Surat Cuti Resmi (Scan)",
  scanUrl,
  fileName,
  onClose,
}: ScanViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdf, setIsPdf] = useState(true);

  useEffect(() => {
    if (!isOpen || !scanUrl) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let active = true;
    setIsLoading(true);

    api
      .get(scanUrl, { responseType: "blob" })
      .then((res) => {
        const contentType = String(res.headers["content-type"] || "");
        const blob = new Blob([res.data], {
          type: contentType || "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        const lowerName = (fileName || "").toLowerCase();
        setIsPdf(
          contentType.includes("pdf") ||
            lowerName.endsWith(".pdf") ||
            (!contentType.includes("image") && !lowerName.match(/\.(jpg|jpeg|png)$/))
        );
      })
      .catch(async (err) => {
        if (!active) return;
        let message = "Berkas scan surat cuti belum diunggah atau tidak ditemukan.";
        if (err?.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            if (json.message) message = json.message;
          } catch {
            // keep default
          }
        } else if (err?.response?.data?.message) {
          message = err.response.data.message;
        }
        toast.error(message);
        onClose();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, scanUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "Surat_Cuti_Resmi.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = () => {
    if (!blobUrl) return;
    window.open(blobUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              {fileName && <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">{fileName}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenExternal}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8 gap-1.5 rounded-xl font-bold"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Tab Baru
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 rounded-xl font-bold shadow-xs"
                  title="Unduh Berkas Scan"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 rounded-xl"
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
              <p className="text-xs font-semibold text-slate-500">Memuat berkas scan resmi...</p>
            </div>
          ) : blobUrl ? (
            isPdf ? (
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-[70vh] rounded-xl shadow-xs border border-slate-200 dark:border-slate-800"
              >
                <iframe
                  src={blobUrl}
                  title={title}
                  className="w-full h-[70vh] rounded-xl"
                />
              </object>
            ) : (
              <img
                src={blobUrl}
                alt="Scan Surat Cuti"
                className="max-h-[70vh] max-w-full mx-auto object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
              />
            )
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Berkas scan tidak tersedia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
