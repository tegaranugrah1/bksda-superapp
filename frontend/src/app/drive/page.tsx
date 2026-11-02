"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  HardDrive,
  Users2,
  FolderOpen,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DriveSidebar,
  DriveUnitItem,
  StorageStats,
} from "./_components/DriveSidebar";
import {
  DriveToolbar,
} from "./_components/DriveToolbar";
import {
  DriveFileList,
  DriveFolderItem,
  DriveFileItem,
} from "./_components/DriveFileList";
import { DriveUploadDialog } from "./_components/DriveUploadDialog";
import { DrivePreviewModal } from "./_components/DrivePreviewModal";
import { DriveShareDialog } from "./_components/DriveShareDialog";
import { DriveMoveDialog } from "./_components/DriveMoveDialog";

function DriveDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation & Filter state (support initial space & folder_id from URL)
  const initialSpace = searchParams.get("space") || "my";
  const initialFolderId = searchParams.get("folder_id") ? parseInt(searchParams.get("folder_id")!, 10) : null;

  const [currentSpace, setCurrentSpace] = useState<string>(initialSpace);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(initialFolderId);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [moveItem, setMoveItem] = useState<{ type: "folder" | "file"; id: number; name: string } | null>(null);
  const [currentFilter, setCurrentFilter] = useState<"all" | "starred" | "trash" | "shared_with_me">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Data state
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<DriveUnitItem[]>([]);
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number; name: string }>>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [storage, setStorage] = useState<StorageStats>({
    used_bytes: 0,
    quota_bytes: 5 * 1024 * 1024 * 1024,
    used_percent: 0,
  });

  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);
  const [shareFile, setShareFile] = useState<DriveFileItem | null>(null);
  const [assignManagerFolder, setAssignManagerFolder] = useState<DriveFolderItem | null>(null);
  const [selectedEmployeeNip, setSelectedEmployeeNip] = useState<string>("");
  const [assigning, setAssigning] = useState<boolean>(false);

  const { user } = useAuth();
  const isDriveAdmin = Boolean(
    user?.role === "super_admin" ||
    (Array.isArray(user?.access_modules) && user.access_modules.includes("drive"))
  );

  const { data: employeesData } = useQuery({
    queryKey: ["employees-for-folder-manager"],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; nip: string; nama_lengkap: string; jabatan?: string; satuan_kerja?: string }> }>("/kepegawaian/employees", {
        params: { per_page: "all" },
      });
      return res.data.data;
    },
    enabled: !!assignManagerFolder,
  });

  const handleAssignManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignManagerFolder || !selectedEmployeeNip) return;
    setAssigning(true);
    try {
      await api.post(`/drive/folders/${assignManagerFolder.id}/assign-manager`, {
        nip: selectedEmployeeNip,
      });
      toast.success("Penanggung jawab folder berhasil ditunjuk!");
      setAssignManagerFolder(null);
      setSelectedEmployeeNip("");
      loadDriveData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menunjuk penanggung jawab folder.");
    } finally {
      setAssigning(false);
    }
  };

  const isUnit = currentSpace !== "my";
  const unitIdNumber = isUnit ? parseInt(currentSpace, 10) : null;

  const currentUnit = useMemo(() => {
    if (!isUnit) return null;
    return units.find((u) => u.id === unitIdNumber) || null;
  }, [units, isUnit, unitIdNumber]);

  const filteredFiles = useMemo(() => {
    if (categoryFilter === "all") return files;
    if (categoryFilter === "image") return files.filter((f) => f.mime_type.toLowerCase().includes("image"));
    if (categoryFilter === "pdf") return files.filter((f) => f.mime_type.toLowerCase().includes("pdf"));
    if (categoryFilter === "data") return files.filter((f) => {
      const m = f.mime_type.toLowerCase();
      return m.includes("sheet") || m.includes("excel") || m.includes("csv");
    });
    if (categoryFilter === "archive") return files.filter((f) => {
      const m = f.mime_type.toLowerCase();
      return m.includes("zip") || m.includes("tar") || m.includes("rar");
    });
    return files;
  }, [files, categoryFilter]);

  const spaceName = useMemo(() => {
    if (!isUnit) return "Drive Saya";
    return currentUnit?.name || "Drive Bersama";
  }, [isUnit, currentUnit]);

  // Load Drive Content
  const loadDriveData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("space", currentSpace);
      if (currentFolderId) params.set("folder_id", currentFolderId.toString());
      if (currentFilter !== "all") params.set("filter", currentFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await api.get(`/drive?${params.toString()}`);
      const data = res.data;

      setUnits(data.units || data.available_units || []);
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setBreadcrumbs(data.breadcrumbs || []);
      setCanWrite(data.can_write !== undefined ? Boolean(data.can_write) : true);
      if (data.storage) {
        setStorage(data.storage);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memuat berkas Drive.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [currentSpace, currentFolderId, currentFilter, search]);

  useEffect(() => {
    loadDriveData();
  }, [loadDriveData]);

  // Handlers
  const handleSelectSpace = (space: string) => {
    setCurrentSpace(space);
    setCurrentFolderId(null);
    setCurrentFilter("all");
    setSearch("");
  };

  const handleSelectFilter = (filter: "all" | "starred" | "trash" | "shared_with_me") => {
    setCurrentFilter(filter);
    setCurrentFolderId(null);
  };

  const handleNavigateFolder = (folderId: number | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await api.post("/drive/folders", {
        name,
        unit_id: unitIdNumber,
        parent_id: currentFolderId,
      });
      toast.success(`Folder "${name}" berhasil dibuat.`);
      loadDriveData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal membuat folder.");
      throw err;
    }
  };

  const handleToggleStar = async (type: "folder" | "file", id: number) => {
    try {
      const endpoint = type === "folder" ? `/drive/folders/${id}/star` : `/drive/files/${id}/star`;
      const res = await api.put(endpoint);
      toast.success(res.data.is_starred ? "Ditambahkan ke Berbintang" : "Dihapus dari Berbintang");
      // Update local state smoothly
      if (type === "folder") {
        setFolders((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_starred: res.data.is_starred } : f))
        );
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_starred: res.data.is_starred } : f))
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memperbarui status bintang.");
    }
  };

  const handleRename = async (type: "folder" | "file", id: number, newName: string) => {
    try {
      const endpoint = type === "folder" ? `/drive/folders/${id}/rename` : `/drive/files/${id}/rename`;
      await api.put(endpoint, { name: newName });
      toast.success("Nama berhasil diubah.");
      loadDriveData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengubah nama.");
      throw err;
    }
  };

  const handleTrash = async (type: "folder" | "file", id: number) => {
    try {
      const endpoint = type === "folder" ? `/drive/folders/${id}` : `/drive/files/${id}`;
      await api.delete(endpoint);
      toast.success("Dipindahkan ke Sampah.");
      loadDriveData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memindahkan ke sampah.");
    }
  };

  const handleRestore = async (type: "folder" | "file", id: number) => {
    try {
      const endpoint = type === "folder" ? `/drive/folders/${id}/restore` : `/drive/files/${id}/restore`;
      await api.post(endpoint);
      toast.success("Item berhasil dipulihkan.");
      loadDriveData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memulihkan item.");
    }
  };

  const handleForceDelete = async (type: "folder" | "file", id: number) => {
    try {
      const endpoint = type === "folder" ? `/drive/folders/${id}/force` : `/drive/files/${id}/force`;
      await api.delete(endpoint);
      toast.success("Item telah dihapus secara permanen.");
      loadDriveData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menghapus permanen.");
    }
  };

  const handleDownloadFile = async (file: DriveFileItem) => {
    try {
      const res = await api.get(`/drive/files/${file.id}/url?download=1`);
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengunduh berkas.");
    }
  };

  const handleDownloadFolderZip = async (folder: DriveFolderItem) => {
    try {
      toast.loading("Mempersiapkan unduhan ZIP...", { id: "zip-download" });
      const res = await api.post(`/drive/folders/${folder.id}/zip-token`);
      if (res.data?.download_url) {
        toast.success("Mengunduh arsip ZIP folder...", { id: "zip-download" });
        window.location.href = res.data.download_url;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengunduh folder sebagai ZIP.", { id: "zip-download" });
    }
  };

  const handleMoveSubmit = async (type: "folder" | "file", id: number, targetFolderId: number | null) => {
    try {
      if (type === "folder") {
        await api.post(`/drive/folders/${id}/move`, {
          destination_parent_id: targetFolderId,
        });
      } else {
        await api.post(`/drive/files/${id}/move`, {
          destination_folder_id: targetFolderId,
          destination_unit_id: unitIdNumber,
        });
      }
      toast.success("Item berhasil dipindahkan.");
      loadDriveData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memindahkan item.");
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Portal</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Image
                src="/logo_bksda.png"
                alt="Logo BKSDA"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
              <div className="hidden sm:block">
                <span className="text-xs font-extrabold tracking-tight text-emerald-800 dark:text-emerald-400 block leading-tight">
                  BKSDA DRIVE
                </span>
                <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                  Balai KSDA Kalimantan Timur
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDriveData(true)}
              className="rounded-xl text-xs h-8 px-2.5"
              title="Segarkan data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", loading && "animate-spin")} />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Drive Workspace */}
      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left Navigation Sidebar */}
        <DriveSidebar
          currentSpace={currentSpace}
          currentFilter={currentFilter}
          units={units}
          storage={storage}
          onSelectSpace={handleSelectSpace}
          onSelectFilter={handleSelectFilter}
        />

        {/* Right Main Content Area */}
        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <DriveToolbar
            breadcrumbs={breadcrumbs}
            spaceName={spaceName}
            isUnit={isUnit}
            search={search}
            viewMode={viewMode}
            canWrite={canWrite && currentFilter !== "trash"}
            onSearchChange={setSearch}
            onViewModeChange={setViewMode}
            onNavigateFolder={handleNavigateFolder}
            onCreateFolder={handleCreateFolder}
            onOpenUpload={() => setUploadOpen(true)}
          />

          {loading ? (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Memuat berkas & folder...</p>
            </div>
          ) : (
            <DriveFileList
              folders={folders}
              files={filteredFiles}
              viewMode={viewMode}
              isTrash={currentFilter === "trash"}
              canWrite={canWrite}
              onOpenFolder={handleNavigateFolder}
              onPreviewFile={setPreviewFile}
              onDownloadFile={handleDownloadFile}
              onShareFile={setShareFile}
              onDownloadFolderZip={handleDownloadFolderZip}
              onMoveItem={(type, item) => setMoveItem({ type, id: item.id, name: item.name })}
              onToggleStar={handleToggleStar}
              onRename={handleRename}
              onTrash={handleTrash}
              onRestore={handleRestore}
              onForceDelete={handleForceDelete}
            />
          )}
        </section>
      </main>

      {/* Upload Dialog */}
      <DriveUploadDialog
        open={uploadOpen}
        unitId={unitIdNumber}
        folderId={currentFolderId}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => loadDriveData(false)}
      />

      {/* File Preview Modal */}
      <DrivePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* File Share Dialog */}
      <DriveShareDialog
        file={shareFile}
        open={Boolean(shareFile)}
        onOpenChange={(open) => !open && setShareFile(null)}
      />

      {/* Assign Manager Dialog */}
      <Dialog open={!!assignManagerFolder} onOpenChange={(open) => !open && setAssignManagerFolder(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Atur Admin Resor / Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tunjuk pegawai sebagai Penanggung Jawab / Admin untuk folder:{" "}
              <strong className="text-slate-800 dark:text-slate-200">{assignManagerFolder?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignManagerSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Pegawai / Petugas Lapangan</Label>
              <select
                value={selectedEmployeeNip}
                onChange={(e) => setSelectedEmployeeNip(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              >
                <option value="">-- Pilih Pegawai --</option>
                {employeesData?.map((emp) => (
                  <option key={emp.nip} value={emp.nip}>
                    {emp.nama_lengkap} ({emp.nip}) - {emp.satuan_kerja || "BKSDA"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignManagerFolder(null)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={assigning || !selectedEmployeeNip}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Simpan Penugasan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Item Dialog */}
      <DriveMoveDialog
        isOpen={Boolean(moveItem)}
        onClose={() => setMoveItem(null)}
        item={moveItem}
        folders={folders}
        spaceName={spaceName}
        onMove={handleMoveSubmit}
      />
    </div>
  );
}

export default function DrivePage() {
  return (
    <RouteGuard>
      <DriveDashboard />
    </RouteGuard>
  );
}
