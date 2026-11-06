"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Key, LayoutDashboard, HandHelping, Briefcase, ClipboardList,
  Calendar, UserCheck, Building, FileText, ChevronDown, FileCheck,
  FileSpreadsheet, Pencil, Loader2, Mail, Phone, Lock, Calculator,
  Camera, Cloud,
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
      toast.error("Format email tidak valid.");
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

    if (!file.type.startsWith("image/")) {
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
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-4 sm:p-4.5 shadow-xs space-y-4 relative flex flex-col justify-between", part === "profile" && "h-full", className)}>
      {/* Edit Profile Icon (Top Right Pencil) */}
      <button
        type="button"
        onClick={openEditDialog}
        title="Edit Informasi Kontak Profil"
        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-[#16a34a] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#1e5433]/20 shadow-md bg-[#e4f0e6] dark:bg-emerald-950 flex items-center justify-center">
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
                <div className="w-full h-full bg-[#1e5433] flex items-center justify-center text-white text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Camera Action Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Ganti Foto Profil"
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#164227] hover:bg-[#153e24] text-white shadow-md border-2 border-white dark:border-slate-900 transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            {/* Status Pill */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#1e5433] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              AKTIF
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {displayName}
            </h3>
            <p className="text-xs font-mono font-medium text-[#1e5433] dark:text-emerald-300 bg-[#e4f0e6] dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-[#dce8dd] inline-block">
              {displayNip}
            </p>
          </div>
        </div>

        {/* Info Details List */}
        <div className="space-y-2.5 pt-2.5 border-t border-[#edf3ee] dark:border-slate-800 text-xs">
          <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <UserCheck className="w-4 h-4 text-[#1e5433] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Jabatan</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{displayPosition}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <Building className="w-4 h-4 text-[#1e5433] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Kerja</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{displayDept}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <Mail className="w-4 h-4 text-[#1e5433] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {displayEmail}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <Phone className="w-4 h-4 text-[#1e5433] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Telepon / WhatsApp</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
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
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-[#edf3ee] dark:bg-slate-800 hover:bg-[#e4f0e6] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#1e5433] dark:hover:text-emerald-300 transition-colors border border-[#dce8dd] dark:border-slate-700 cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-slate-500" />
          <span>Ganti Password</span>
        </button>
      </div>
    </div>
  );

  const menuCard = (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-3.5 shadow-sm flex flex-col justify-between", part === "menu" && "h-full", className)}>
      <div className="space-y-1">
        <p className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
          Menu Utama
        </p>

        {/* 1 s.d. 7: Vertical Nav Items with Sliding Indicator */}
        {[
          { id: "dashboard", label: "Dashboard Utama", icon: LayoutDashboard, count: 0 },
          { id: "pinjaman", label: "Pinjaman Aktif", icon: HandHelping, count: pinjamanCount },
          { id: "aset", label: "Aset Saya", icon: Briefcase, count: assetCount },
          { id: "surat_tugas", label: "Surat Tugas & Laporan", icon: ClipboardList, count: suratTugasCount },
          { id: "cuti", label: "Pengajuan Cuti", icon: Calendar, count: leaveCount },
          { id: "visum", label: "Visum SPD", icon: FileSpreadsheet, badgeText: "Baru", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
          { id: "kalkulator_dinas", label: "Kalkulator Dinas", icon: Calculator, badgeText: "Estimasi", badgeClass: "bg-[#e4f0e6] text-[#1e5433] dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#dce8dd]" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id && !isInlineReportOpen;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNavTab(item.id)}
              className={cn(
                "relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left select-none cursor-pointer",
                isActive ? "text-[#1e5433] dark:text-emerald-300 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-[#edf3ee] dark:hover:bg-slate-800 hover:text-[#1e5433] dark:hover:text-emerald-400"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="activePortalSidebarIndicator"
                  className="absolute inset-0 bg-[#d5e8d9] dark:bg-emerald-950/80 rounded-xl shadow-2xs border border-[#b8dabf] dark:border-emerald-800/60"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <div className={cn("flex items-center gap-2.5 relative z-10", isActive && "text-[#1e5433] dark:text-emerald-300")}>
                <Icon className={cn("w-4 h-4", isActive ? "text-[#1e5433] dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={cn(
                    "relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    isActive ? "bg-[#1e5433]/15 text-[#1e5433] dark:bg-emerald-800/40 dark:text-emerald-300"
                      : "bg-[#edf3ee] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[#dce8dd] dark:border-slate-700"
                  )}
                >
                  {item.count}
                </span>
              )}
              {item.badgeText && (
                <span
                  className={cn(
                    "relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    isActive ? "bg-[#1e5433]/15 text-[#1e5433] dark:bg-emerald-800/40 dark:text-emerald-300" : item.badgeClass
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
        <div className="pt-2.5 mt-auto border-t border-[#edf3ee] dark:border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 font-bold text-xs rounded-xl shadow-xs bg-[#1e5433] hover:bg-[#164227] text-white transition-all focus:outline-none">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span>{isInlineReportOpen ? "Form Laporan Aktif" : "Buat Laporan"}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border border-slate-200 shadow-xl bg-white dark:bg-slate-900">
              <DropdownMenuItem
                onClick={() => onOpenInlineReport("general")}
                className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#edf3ee] dark:hover:bg-emerald-950/40 focus:bg-emerald-50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[#1e5433] dark:text-emerald-400 shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Laporan Pelaksanaan ST</p>
                  <p className="text-[10px] text-slate-500 font-normal">Buka Mode Inline Form Laporan</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => onOpenInlineReport("smart_patrol")}
                className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#edf3ee] dark:hover:bg-emerald-950/40 focus:bg-emerald-50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">2. Laporan SMART PATROL</p>
                  <p className="text-[10px] text-slate-500 font-normal">Buka Form Patroli Kawasan</p>
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
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#1e5433]" />
              Edit Informasi Profil Kontak
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Perbarui alamat email dan nomor telepon pegawai BKSDA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="email"
                  required
                  placeholder="contoh@ksdae.go.id"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nomor Telepon / WhatsApp</Label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="text"
                  placeholder="08123456789"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {editData.email.trim().toLowerCase() !== (employee?.email || user?.email || "").toLowerCase() && (
              <div className="space-y-1.5 rounded-xl p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                <Label className="text-xs font-bold flex justify-between items-center text-amber-900 dark:text-amber-200">
                  <span>Kata Sandi Akun Saat Ini</span>
                  <span className="text-[10px] font-normal text-amber-700 dark:text-amber-400">Wajib konfirmasi</span>
                </Label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Masukkan kata sandi login Anda"
                    value={editData.current_password}
                    onChange={(e) => setEditData({ ...editData, current_password: e.target.value })}
                    className="pl-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Verifikasi kata sandi diperlukan untuk melindungi akun saat mengganti alamat email.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-[#1e5433] hover:bg-[#164227] text-white rounded-xl text-xs">
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
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-[#1e5433]" />
              Pratinjau Foto Profil
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pastikan foto sudah sesuai sebelum disimpan ke server.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[#1e5433]/30 shadow-lg bg-slate-100 dark:bg-slate-800">
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
              <p className="mt-3 text-[11px] text-slate-500 font-mono truncate max-w-60">
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
              className="rounded-xl text-xs w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUploadPhoto}
              disabled={photoLoading}
              className="bg-[#1e5433] hover:bg-[#164227] text-white rounded-xl text-xs w-full sm:w-auto"
            >
              {photoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
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
