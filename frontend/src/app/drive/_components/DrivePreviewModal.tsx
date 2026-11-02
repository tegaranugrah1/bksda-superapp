"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Loader2,
  FileText,
  FileQuestion,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { DriveFileItem } from "./DriveFileList";

interface DrivePreviewModalProps {
  file: DriveFileItem | null;
  onClose: () => void;
}

export function DrivePreviewModal({ file, onClose }: DrivePreviewModalProps) {
  const [urlData, setUrlData] = useState<{
    url: string;
    is_inline: boolean;
    mime_type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      setLoading(true);
      setUrlData(null);
      api
        .get(`/drive/files/${file.id}/url`)
        .then((resp) => {
          setUrlData(resp.data);
        })
        .catch(() => {
          toast.error("Gagal mendapatkan tautan pratinjau berkas.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [file]);

  if (!file) return null;

  const mime = (urlData?.mime_type || file.mime_type || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";
  const isVideo = mime.startsWith("video/");

  const handleDownload = () => {
    if (!file) return;
    api
      .get(`/drive/files/${file.id}/url?download=1`)
      .then((resp) => {
        window.open(resp.data.url, "_blank");
      })
      .catch(() => {
        toast.error("Gagal memulai unduhan.");
      });
  };

  return (
    <Dialog open={file !== null} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-900 border-slate-800 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 truncate pr-4">
            <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold truncate">{file.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Unduh
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-slate-950">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-xs text-slate-400 font-medium">Memuat pratinjau...</p>
            </div>
          ) : !urlData ? (
            <div className="text-center text-slate-400">
              <p className="text-xs">Pratinjau tidak tersedia.</p>
            </div>
          ) : isImage ? (
            <div className="relative max-h-full max-w-full flex items-center justify-center overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlData.url}
                alt={file.name}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-xl"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={urlData.url}
              className="w-full h-full rounded-lg border-0 shadow-xl"
              title={file.name}
            />
          ) : isVideo ? (
            <video
              controls
              autoPlay
              src={urlData.url}
              className="max-h-[70vh] max-w-full rounded-lg shadow-xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
                <FileQuestion className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                Pratinjau Langsung Tidak Didukung
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Tipe berkas ini tidak dapat ditampilkan langsung di browser. Silakan unduh berkas untuk membukanya di komputer Anda.
              </p>
              <Button
                onClick={handleDownload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                Unduh Berkas Sekarang
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
