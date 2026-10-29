"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import {
  UploadCloud,
  File,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface DriveUploadDialogProps {
  open: boolean;
  unitId?: number | null;
  folderId?: number | null;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

export function DriveUploadDialog({
  open,
  unitId,
  folderId,
  onOpenChange,
  onUploadComplete,
}: DriveUploadDialogProps) {
  const [filesList, setFilesList] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const newItems: UploadingFile[] = Array.from(selected).map((f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      progress: 0,
      status: "pending",
    }));
    setFilesList((prev) => [...prev, ...newItems]);
  };

  const uploadSingleFile = async (item: UploadingFile) => {
    const f = item.file;
    const isLarge = f.size > 100 * 1024 * 1024; // > 100MB uses multipart

    // 1. Inisialisasi upload ke API
    const initResp = await api.post("/drive/upload/init", {
      name: f.name,
      size: f.size,
      mime: f.type || "application/octet-stream",
      unit_id: unitId || undefined,
      folder_id: folderId || undefined,
      is_multipart: isLarge,
    });

    const initData = initResp.data;

    if (!initData.is_multipart) {
      // Direct Single PUT to presigned URL
      await axios.put(initData.presigned_url, f, {
        headers: {
          "Content-Type": f.type || "application/octet-stream",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const p = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFilesList((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress: p } : it))
            );
          }
        },
      });

      // Complete upload
      await api.post("/drive/upload/complete", {
        upload_id: initData.upload_id,
      });
    } else {
      // Multipart upload: chunk and upload parts
      const partSize = initData.part_size || 25 * 1024 * 1024;
      const parts = initData.parts as { part_number: number; url: string }[];
      const completedParts: { PartNumber: number; ETag: string }[] = [];

      let totalUploadedBytes = 0;

      for (const p of parts) {
        const start = (p.part_number - 1) * partSize;
        const end = Math.min(start + partSize, f.size);
        const chunk = f.slice(start, end);

        const partRes = await axios.put(p.url, chunk, {
          onUploadProgress: (progressEvent) => {
            const currentTotal = totalUploadedBytes + progressEvent.loaded;
            const pct = Math.round((currentTotal * 100) / f.size);
            setFilesList((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress: pct } : it))
            );
          },
        });

        totalUploadedBytes += chunk.size;
        const etag = partRes.headers.etag || partRes.headers.ETag || "";
        completedParts.push({
          PartNumber: p.part_number,
          ETag: etag.replace(/"/g, ""),
        });
      }

      // Complete multipart upload
      await api.post("/drive/upload/complete", {
        upload_id: initData.upload_id,
        parts: completedParts,
      });
    }
  };

  const startUploadAll = async () => {
    setIsUploading(true);

    for (let i = 0; i < filesList.length; i++) {
      const item = filesList[i];
      if (item.status === "completed") continue;

      setFilesList((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "uploading" } : it))
      );

      try {
        await uploadSingleFile(item);
        setFilesList((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "completed", progress: 100 } : it))
        );
      } catch (err: any) {
        const msg =
          err.response?.data?.message || err.message || "Gagal mengunggah berkas.";
        setFilesList((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: "error", errorMessage: msg } : it
          )
        );
        toast.error(`Gagal mengunggah ${item.file.name}: ${msg}`);
      }
    }

    setIsUploading(false);
    onUploadComplete();
  };

  const removeFile = (id: string) => {
    setFilesList((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Unggah Berkas ke Drive</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Seret berkas ke sini atau pilih dokumen langsung dari komputer Anda. Mendukung video & dokumen besar hingga 5 GB.
          </DialogDescription>
        </DialogHeader>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFileSelect(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
            dragOver
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Klik untuk memilih berkas atau seret ke sini
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            PDF, Dokumen Kantor, Gambar, Video & Arsip
          </p>
        </div>

        {/* Selected Files List */}
        {filesList.length > 0 && (
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {filesList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <File className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.status === "error"
                              ? "bg-rose-500"
                              : item.status === "completed"
                              ? "bg-emerald-500"
                              : "bg-emerald-600"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {item.status === "completed" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {item.status === "error" && (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  {item.status === "uploading" && (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  )}
                  {!isUploading && item.status !== "completed" && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Tutup
          </Button>
          <Button
            size="sm"
            onClick={startUploadAll}
            disabled={isUploading || filesList.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengunggah ({filesList.filter((f) => f.status === "completed").length}/{filesList.length})
              </>
            ) : (
              "Mulai Unggah"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
