"use client";

import React, { useState } from "react";
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileArchive,
  File,
  MoreVertical,
  Star,
  Download,
  Trash2,
  Edit2,
  Eye,
  RotateCcw,
  ShieldAlert,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface DriveFolderItem {
  id: number;
  name: string;
  color?: string | null;
  is_starred: boolean;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DriveFileItem {
  id: number;
  name: string;
  size_bytes: number;
  mime_type: string;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface DriveFileListProps {
  folders: DriveFolderItem[];
  files: DriveFileItem[];
  viewMode: "grid" | "list";
  isTrash: boolean;
  canWrite: boolean;
  onOpenFolder: (folderId: number) => void;
  onPreviewFile: (file: DriveFileItem) => void;
  onDownloadFile: (file: DriveFileItem) => void;
  onShareFile?: (file: DriveFileItem) => void;
  onToggleStar: (type: "folder" | "file", id: number) => void;
  onRename: (type: "folder" | "file", id: number, newName: string) => Promise<void>;
  onTrash: (type: "folder" | "file", id: number) => void;
  onRestore: (type: "folder" | "file", id: number) => void;
  onForceDelete: (type: "folder" | "file", id: number) => void;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFileIcon(mime: string) {
  const m = mime.toLowerCase();
  if (m.includes("image")) return <FileImage className="w-5 h-5 text-emerald-500" />;
  if (m.includes("video")) return <FileVideo className="w-5 h-5 text-purple-500" />;
  if (m.includes("pdf")) return <FileText className="w-5 h-5 text-rose-500" />;
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv"))
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (m.includes("zip") || m.includes("tar") || m.includes("rar"))
    return <FileArchive className="w-5 h-5 text-amber-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

export function DriveFileList({
  folders,
  files,
  viewMode,
  isTrash,
  canWrite,
  onOpenFolder,
  onPreviewFile,
  onDownloadFile,
  onShareFile,
  onToggleStar,
  onRename,
  onTrash,
  onRestore,
  onForceDelete,
}: DriveFileListProps) {
  const [renameItem, setRenameItem] = useState<{ type: "folder" | "file"; id: number; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !newName.trim()) return;
    setRenaming(true);
    try {
      await onRename(renameItem.type, renameItem.id, newName.trim());
      setRenameItem(null);
    } finally {
      setRenaming(false);
    }
  };

  const isEmpty = folders.length === 0 && files.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
          <Folder className="h-8 w-8" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {isTrash ? "Tempat Sampah Kosong" : "Belum Ada Berkas atau Folder"}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          {isTrash
            ? "Berkas atau folder yang Anda hapus akan tersimpan di sini selama 30 hari sebelum dimusnahkan."
            : "Gunakan tombol Unggah di pojok kanan atas atau seret berkas Anda ke area ini untuk menyimpan."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Folders Section */}
        {folders.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Folder ({folders.length})
            </h3>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
                  : "space-y-1.5"
              )}
            >
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onDoubleClick={() => !isTrash && onOpenFolder(folder.id)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:shadow-xs hover:border-emerald-500/50 cursor-pointer select-none",
                    viewMode === "grid" ? "flex-col items-start gap-3" : "flex-row"
                  )}
                >
                  <div
                    onClick={() => !isTrash && onOpenFolder(folder.id)}
                    className="flex items-center gap-2.5 truncate w-full"
                  >
                    <Folder className="w-5 h-5 text-amber-500 shrink-0 fill-amber-500/20" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {folder.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end">
                    {!isTrash && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar("folder", folder.id);
                        }}
                        className={cn(
                          "p-1 rounded-md transition-opacity",
                          folder.is_starred
                            ? "text-amber-500 opacity-100"
                            : "text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 text-xs">
                        {!isTrash ? (
                          <>
                            <DropdownMenuItem onClick={() => onOpenFolder(folder.id)}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> Buka
                            </DropdownMenuItem>
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameItem({ type: "folder", id: folder.id, name: folder.name });
                                  setNewName(folder.name);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Ganti Nama
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => onTrash("folder", folder.id)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Buang ke Sampah
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => onRestore("folder", folder.id)}>
                              <RotateCcw className="w-3.5 h-3.5 mr-2" /> Pulihkan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onForceDelete("folder", folder.id)}
                              className="text-rose-600 focus:text-rose-600 font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Permanen
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Berkas ({files.length})
            </h3>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
                  : "space-y-1.5"
              )}
            >
              {files.map((file) => (
                <div
                  key={file.id}
                  onDoubleClick={() => !isTrash && onPreviewFile(file)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:shadow-xs hover:border-emerald-500/50 cursor-pointer select-none",
                    viewMode === "grid" ? "flex-col items-start gap-3" : "flex-row"
                  )}
                >
                  <div
                    onClick={() => !isTrash && onPreviewFile(file)}
                    className="flex items-center gap-2.5 truncate w-full"
                  >
                    {getFileIcon(file.mime_type)}
                    <div className="truncate min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatBytes(file.size_bytes)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end">
                    {!isTrash && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar("file", file.id);
                        }}
                        className={cn(
                          "p-1 rounded-md transition-opacity",
                          file.is_starred
                            ? "text-amber-500 opacity-100"
                            : "text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 text-xs">
                        {!isTrash ? (
                          <>
                            <DropdownMenuItem onClick={() => onPreviewFile(file)}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownloadFile(file)}>
                              <Download className="w-3.5 h-3.5 mr-2" /> Unduh
                            </DropdownMenuItem>
                            {canWrite && onShareFile && (
                              <DropdownMenuItem onClick={() => onShareFile(file)}>
                                <Share2 className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Bagikan Berkas
                              </DropdownMenuItem>
                            )}
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameItem({ type: "file", id: file.id, name: file.name });
                                  setNewName(file.name);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Ganti Nama
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => onTrash("file", file.id)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Buang ke Sampah
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => onRestore("file", file.id)}>
                              <RotateCcw className="w-3.5 h-3.5 mr-2" /> Pulihkan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onForceDelete("file", file.id)}
                              className="text-rose-600 focus:text-rose-600 font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Permanen
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameItem !== null} onOpenChange={() => setRenameItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Ganti Nama {renameItem?.type === "folder" ? "Folder" : "Berkas"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRenameSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Baru</Label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenameItem(null)}
                disabled={renaming}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={renaming || !newName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {renaming ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
