"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";

import {
  Key, LayoutDashboard, HandHelping, Briefcase, ClipboardList,
  Calendar, UserCheck, Building, FileText, ChevronDown, FileCheck,
  FileSpreadsheet, Pencil, Loader2, Mail, Phone, Lock, Calculator,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { ChangePasswordModal } from "./SecurityModals";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmployeeProfile {
  id?: number;
  nip?: string;
  name?: string;
  position?: string;
  department?: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  rank?: string | null;
  is_active?: boolean;
}

interface PortalProfileSidebarProps {
  user: { name: string; username: string; email: string | null; role: string } | null;
  employee: EmployeeProfile | null;
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
  pinjamanCount?: number;
  assetCount?: number;
  suratTugasCount?: number;
  leaveCount?: number;
  onOpenInlineReport: (type: "general" | "smart_patrol") => void;
  isInlineReportOpen: boolean;
  onRefreshDashboard?: () => void;
  part?: "all" | "profile" | "menu";
  className?: string;
}

export function PortalProfileSidebar({
  user,
  employee,
  activeNavTab,
  onSelectNavTab,
  pinjamanCount = 0,
  assetCount = 0,
  suratTugasCount = 0,
  leaveCount = 0,
  onOpenInlineReport,
  isInlineReportOpen,
  onRefreshDashboard,
  part = "all",
  className,
}: PortalProfileSidebarProps) {
  const displayName = employee?.name || user?.name || "Pegawai BKSDA";
  const displayNip = employee?.nip || user?.username || "-";
  const displayPosition = employee?.position || "Staf Balai KSDA Kaltim";
  const displayDept = employee?.department || "Balai KSDA Kalimantan Timur";
  const displayEmail = employee?.email || user?.email || "-";
  const displayPhone = employee?.phone || "-";

  // Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ email: "", phone: "", current_password: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);

  // Photo Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const openEditDialog = useCallback(() => {
    setEditData({
      email: employee?.email || user?.email || "",
      phone: employee?.phone || "",
      current_password: "",
    });
    setEditDialogOpen(true);
  }, [employee, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = editData.email.trim();
    const cleanPhone = editData.phone.trim();
    const currentRegisteredEmail = (employee?.email || user?.email || "").toLowerCase();
    const isEmailChanging = cleanEmail.toLowerCase() !== currentRegisteredEmail;

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Format email tidak valid."); return; } if (cleanEmail && cleanEmail.toLowerCase().endsWith(".local")) { toast.error("Gunakan alamat email aktif yang valid (bukan domain .local).");
      return;
    }
    if (cleanPhone && !/^[0-9+\-\s()]+$/.test(cleanPhone)) {
      toast.error("Nomor telepon hanya boleh berisi angka, tanda plus, tanda hubung, atau spasi.");
      return;
    }
    if (isEmailChanging && !editData.current_password) {
      toast.error("Kata sandi akun saat ini wajib diisi untuk mengonfirmasi perubahan alamat email.");
      return;
    }

    setEditLoading(true);
    try {
      const resp = await api.post("/me/update-profile", {
        email: cleanEmail,
        phone: cleanPhone,
        current_password: editData.current_password,
      });
      toast.success(
        resp.data?.message ||
          (resp.data?.email_changed
            ? `Alamat email berhasil diperbarui. Tautan verifikasi telah dikirim ke ${cleanEmail}.`
            : "Profil kontak berhasil diperbarui!")
      );
      setEditDialogOpen(false);
      onRefreshDashboard?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal memperbarui profil.");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      e.target.value = "";
      toast.error("File harus berupa gambar (JPG, PNG, atau WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      e.target.value = "";
      toast.error("Ukuran file foto maksimal 10 MB.");
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setPhotoDialogOpen(true);
    e.target.value = "";
  };

  const closePhotoDialog = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoDialogOpen(false);
  };

  const handleUploadPhoto = async () => {
    if (!selectedPhotoFile) return;

    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("foto", selectedPhotoFile);

      await api.post("/me/update-photo", formData);
      toast.success("Foto profil berhasil diperbarui!");
      closePhotoDialog();
      setPhotoVersion((v) => v + 1);
      onRefreshDashboard?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal mengunggah foto profil.");
    } finally {
      setPhotoLoading(false);
    }
  };

    const profileCard = (
    <div className={cn("bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-4 relative flex flex-col justify-between", part === "profile" && "h-full", className)}>
      {/* Edit Profile Icon (Top Right Pencil) */}
      <button
        type="button"
        onClick={openEditDialog}
        title="Edit Informasi Kontak Profil"
        className="absolute top-4 right-4 p-2 rounded-full text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
      </button>

      <div className="space-y-4">
        {/* Avatar Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[var(--ds-accent-soft-border)] shadow-xs bg-[var(--ds-accent-soft)] flex items-center justify-center">
              {employee?.photo ? (
                <Image
                  src={`${employee.photo}${employee.photo.includes("?") ? "&" : "?"}v=${photoVersion}`}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)] text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Camera Action Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Ganti Foto Profil"
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] shadow-xs border-2 border-[var(--ds-surface)] transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
            >
              <Camera className="w-4 h-4" />
            </button>
            {/* Status Pill */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] text-xs font-bold px-2 rounded-full shadow-xs flex items-center gap-1 z-20">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              AKTIF
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-sm font-bold text-[var(--ds-fg)] leading-tight">
              {displayName}
            </h3>
            <p className="text-xs font-mono font-medium text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-3 py-1 rounded-full border border-[var(--ds-accent-soft-border)] inline-block tabular-nums">
              {displayNip}
            </p>
          </div>
        </div>

        {/* Info Details List */}
        <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-zinc-800 text-xs">
          <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
            <UserCheck className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Jabatan</span>
              <span className="font-semibold text-[var(--ds-fg)]">{displayPosition}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
            <Building className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Unit Kerja</span>
              <span className="font-semibold text-[var(--ds-fg)]">{displayDept}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
            <Mail className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Email</span>
              <span className="font-semibold text-[var(--ds-fg)] truncate block">
                {displayEmail}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
            <Phone className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Telepon / WhatsApp</span>
              <span className="font-semibold text-[var(--ds-fg)] tabular-nums">
                {displayPhone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Single Ganti Password Button pinned to bottom */}
      <div className="pt-2 mt-auto">
        <button
          type="button"
          onClick={() => setPwDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ds-fg)] bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-accent-fg)] transition-colors border border-slate-200/80 dark:border-zinc-800 cursor-pointer"
        >
          <Key className="w-4 h-4 text-[var(--ds-fg-muted)]" />
          <span>Ganti Password</span>
        </button>
      </div>
    </div>
  );

  const menuCard = (
    <div className={cn("bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs flex flex-col justify-between", part === "menu" && "h-full", className)}>
      <div className="space-y-1">
        <p className="px-3 py-1 text-xs uppercase tracking-wider font-bold text-[var(--ds-fg-muted)]">
          Menu Utama
        </p>

        {/* 1 s.d. 7: Vertical Nav Items with Sliding Indicator */}
        {(() => {
          const isMmp = Boolean(employee?.nip && employee.nip.toUpperCase().startsWith("MMP-"));
          return [
            { id: "dashboard", label: "Dashboard Utama", icon: LayoutDashboard, count: 0 },
            { id: "pinjaman", label: "Pinjaman Aktif", icon: HandHelping, count: pinjamanCount },
            { id: "aset", label: "Aset Saya", icon: Briefcase, count: assetCount },
            { id: "surat_tugas", label: "Surat Tugas & Laporan", icon: ClipboardList, count: suratTugasCount },
            ...(!isMmp ? [{ id: "cuti", label: "Pengajuan Cuti", icon: Calendar, count: leaveCount }] : []),
            { id: "visum", label: "Visum SPD", icon: FileSpreadsheet, badgeText: "Baru", badgeClass: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]" },
            { id: "kalkulator_dinas", label: "Kalkulator Dinas", icon: Calculator, badgeText: "Estimasi", badgeClass: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]" },
          ];
        })().map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id && !isInlineReportOpen;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNavTab(item.id)}
              className={cn(
                "relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left select-none cursor-pointer",
                isActive ? "text-[var(--ds-accent-fg)] font-bold"
                  : "text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-accent-fg)]"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="activePortalSidebarIndicator"
                  className="absolute inset-0 bg-[var(--ds-accent-soft)] rounded-lg shadow-xs border border-[var(--ds-accent-soft-border)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <div className={cn("flex items-center gap-3 relative z-10", isActive && "text-[var(--ds-accent-fg)]")}>
                <Icon className={cn("w-4 h-4", isActive ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)]")} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={cn(
                    "relative z-10 px-2 py-0 rounded-full text-xs font-bold tabular-nums",
                    isActive ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"
                      : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border border-slate-200/80 dark:border-zinc-800"
                  )}
                >
                  {item.count}
                </span>
              )}
              {item.badgeText && (
                <span
                  className={cn(
                    "relative z-10 px-2 py-0 rounded-full text-xs font-bold",
                    isActive ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]" : item.badgeClass
                  )}
                >
                  {item.badgeText}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FAST ACTION: BUAT LAPORAN DROPDOWN */}
      {onOpenInlineReport && (
        <div className="pt-3 mt-auto border-t border-slate-200/70 dark:border-zinc-800">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 font-bold text-xs rounded-lg shadow-xs bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] transition-all focus:outline-none cursor-pointer">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{isInlineReportOpen ? "Form Laporan Aktif" : "Buat Laporan"}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent data-module="portal" align="start" className="w-64 p-2 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-lg bg-[var(--ds-surface)]">
              <DropdownMenuItem
                onClick={() => onOpenInlineReport("general")}
                className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--ds-surface-muted)] focus-visible:bg-[var(--ds-accent-soft)] transition-colors"
              >
                <div className="p-2 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] shrink-0 mt-1">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--ds-fg)]">1. Laporan Pelaksanaan ST</p>
                  <p className="text-xs text-[var(--ds-fg-muted)] font-normal">Buka Mode Inline Form Laporan</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onOpenInlineReport("smart_patrol")}
                className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--ds-surface-muted)] focus-visible:bg-[var(--ds-accent-soft)] transition-colors"
              >
                <div className="p-2 rounded-lg bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] shrink-0 mt-1">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--ds-fg)]">2. Laporan SMART PATROL</p>
                  <p className="text-xs text-[var(--ds-fg-muted)] font-normal">Buka Form Patroli Kawasan</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  const dialogs = (
    <>
      {/* DIALOG EDIT PROFIL KONTAK */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-module="portal" className="sm:max-w-md rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--ds-fg)] flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[var(--ds-accent-fg)]" />
              Edit Informasi Profil Kontak
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Perbarui alamat email dan nomor telepon pegawai BKSDA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ds-fg)]">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-3" />
                <Input
                  type="email"
                  placeholder="contoh@ksdae.go.id"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="pl-9 text-sm rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ds-fg)]">Nomor Telepon / WhatsApp</Label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-3" />
                <Input
                  type="text"
                  placeholder="08123456789"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="pl-9 text-sm rounded-lg tabular-nums"
                />
              </div>
            </div>

            {editData.email.trim().toLowerCase() !== (employee?.email || user?.email || "").toLowerCase() && (
              <div className="space-y-2 rounded-lg p-3 bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)]">
                <Label className="text-xs font-bold flex justify-between items-center text-[var(--ds-status-warning-fg)]">
                  <span>Kata Sandi Akun Saat Ini</span>
                  <span className="text-xs font-normal text-[var(--ds-status-warning-fg)]">Wajib konfirmasi</span>
                </Label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-[var(--ds-fg-muted)] absolute left-3 top-3" />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Masukkan kata sandi login Anda"
                    value={editData.current_password}
                    onChange={(e) => setEditData({ ...editData, current_password: e.target.value })}
                    className="pl-9 text-sm rounded-lg bg-[var(--ds-surface)]"
                  />
                </div>
                <p className="text-xs text-[var(--ds-status-warning-fg)]">
                  Verifikasi kata sandi diperlukan untuk melindungi akun saat mengganti alamat email.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-lg text-xs cursor-pointer">
                Batal
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG GANTI PASSWORD (REUSED FROM SecurityModals) */}
      <ChangePasswordModal
        open={pwDialogOpen}
        onClose={() => setPwDialogOpen(false)}
      />

      {/* DIALOG PREVIEW GANTI FOTO */}
      <Dialog open={photoDialogOpen} onOpenChange={(open) => !open && closePhotoDialog()}>
        <DialogContent data-module="portal" className="sm:max-w-sm rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-6 shadow-lg text-center">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl font-bold text-[var(--ds-fg)] flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-[var(--ds-accent-fg)]" />
              Pratinjau Foto Profil
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Pastikan foto sudah sesuai sebelum disimpan ke server.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[var(--ds-accent-soft-border)] shadow-xs bg-[var(--ds-surface-muted)]">
              {photoPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreviewUrl}
                  alt="Pratinjau foto profil baru"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {selectedPhotoFile && (
              <p className="mt-3 text-xs text-[var(--ds-fg-muted)] font-mono truncate max-w-60 tabular-nums">
                {selectedPhotoFile.name} ({(selectedPhotoFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closePhotoDialog}
              disabled={photoLoading}
              className="rounded-lg text-xs w-full sm:w-auto cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUploadPhoto}
              disabled={photoLoading}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg text-xs font-semibold shadow-xs w-full sm:w-auto cursor-pointer"
            >
              {photoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Mengunggah...
                </>
              ) : (
                "Simpan Foto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (part === "profile") {
    return (
      <>
        {profileCard}
        {dialogs}
      </>
    );
  }

  if (part === "menu") {
    return menuCard;
  }

  return (
    <>
      <aside className={cn("w-full space-y-4", className)}>
        {profileCard}
        {menuCard}
      </aside>
      {dialogs}
    </>
  );
}
