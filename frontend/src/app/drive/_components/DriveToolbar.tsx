"use client";

import React, { useState } from "react";
import {
  FolderPlus,
  UploadCloud,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  Folder,
  HardDrive,
  Building2,
  Image,
  FileText,
  FileSpreadsheet,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface BreadcrumbItem {
  id: number;
  name: string;
}

interface DriveToolbarProps {
  breadcrumbs: BreadcrumbItem[];
  spaceName: string;
  isUnit: boolean;
  search: string;
  viewMode: "grid" | "list";
  canWrite: boolean;
  categoryFilter?: string;
  onCategoryFilterChange?: (cat: string) => void;
  onSearchChange: (search: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onNavigateFolder: (folderId: number | null) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onOpenUpload: () => void;
}

export function DriveToolbar({
  breadcrumbs,
  spaceName,
  isUnit,
  search,
  viewMode,
  canWrite,
  categoryFilter = "all",
  onCategoryFilterChange,
  onSearchChange,
  onViewModeChange,
  onNavigateFolder,
  onCreateFolder,
  onOpenUpload,
}: DriveToolbarProps) {
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setFolderModalOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold py-1">
          <button
            onClick={() => onNavigateFolder(null)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
          >
            {isUnit ? <Building2 className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
            <span>{spaceName}</span>
          </button>

          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              <button
                onClick={() => onNavigateFolder(b.id)}
                className={`truncate max-w-32 transition-colors shrink-0 ${
                  idx === breadcrumbs.length - 1
                    ? "font-bold text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari berkas atau folder..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-8 text-xs rounded-xl"
            />
          </div>

          {/* Grid/List Switcher */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Write Action Buttons */}
          {canWrite && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFolderModalOpen(true)}
                className="h-9 rounded-xl text-xs font-bold"
              >
                <FolderPlus className="w-4 h-4 mr-1.5 text-emerald-600" />
                Folder Baru
              </Button>
              <Button
                size="sm"
                onClick={onOpenUpload}
                className="h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <UploadCloud className="w-4 h-4 mr-1.5" />
                Unggah
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chip Filter Kategori Berkas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 text-xs">
        {[
          { id: "all", label: "Semua Berkas" },
          { id: "image", label: "Foto & Gambar" },
          { id: "pdf", label: "Dokumen PDF" },
          { id: "data", label: "Excel & Data" },
          { id: "archive", label: "Arsip / ZIP" },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onCategoryFilterChange?.(chip.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              categoryFilter === chip.id
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Modal Folder Baru */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Buat Folder Baru</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Masukkan nama folder untuk mengelompokkan dokumen Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Folder</Label>
              <Input
                type="text"
                placeholder="Contoh: Laporan Lapangan 2026"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
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
                onClick={() => setFolderModalOpen(false)}
                disabled={creating}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating || !newFolderName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {creating ? "Membuat..." : "Buat Folder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
