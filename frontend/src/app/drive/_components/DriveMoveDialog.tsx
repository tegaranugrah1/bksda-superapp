"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, HardDrive, Check, Loader2, ArrowRight } from "lucide-react";
import { DriveFolderItem } from "./DriveFileList";

interface DriveMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: { type: "folder" | "file"; id: number; name: string } | null;
  folders: DriveFolderItem[];
  spaceName: string;
  onMove: (type: "folder" | "file", id: number, targetFolderId: number | null) => Promise<void>;
}

export function DriveMoveDialog({
  isOpen,
  onClose,
  item,
  folders,
  spaceName,
  onMove,
}: DriveMoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);

  if (!item) return null;

  // Saring folder: tidak boleh memindahkan folder ke dalam dirinya sendiri
  const validFolders = folders.filter((f) => {
    if (item.type === "folder" && f.id === item.id) return false;
    return true;
  });

  const handleConfirmMove = async () => {
    setMoving(true);
    try {
      await onMove(item.type, item.id, selectedFolderId);
      onClose();
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !moving && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-emerald-600" />
            Pindahkan {item.type === "folder" ? "Folder" : "Berkas"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Pilih folder tujuan untuk memindahkan <strong>&ldquo;{item.name}&rdquo;</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2 max-h-64 overflow-y-auto pr-1">
          {/* Pilihan Root / Drive Utama */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
              selectedFolderId === null
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>{spaceName} (Tingkat Utama / Root)</span>
            </div>
            {selectedFolderId === null && <Check className="w-4 h-4 text-emerald-600" />}
          </button>

          {/* Daftar Subfolder */}
          {validFolders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500/20" />
                  <span className="truncate">{f.name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={moving}
            className="rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmMove}
            disabled={moving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5"
          >
            {moving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Memindahkan...
              </>
            ) : (
              "Pindahkan ke Sini"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
