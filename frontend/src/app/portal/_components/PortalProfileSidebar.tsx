"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import {
  User, Key, LayoutDashboard, HandHelping, Briefcase, ClipboardList,
  Calendar, UserCheck, Building, FileText, ChevronDown, FileCheck,
  FileSpreadsheet, Pencil, Loader2, Mail, Phone, Lock, Calculator,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth-store";
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
}: PortalProfileSidebarProps) {
  const displayName = employee?.name || user?.name || "Pegawai BKSDA";
  const displayNip = employee?.nip || user?.username || "-";
  const displayPosition = employee?.position || "Staf Balai KSDA Kaltim";
  const displayDept = employee?.department || "Balai KSDA Kalimantan Timur";
  const displayEmail = employee?.email || user?.email || "-";
  const displayPhone = employee?.phone || "-";

  // Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ email: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [pwLoading, setPwLoading] = useState(false);

  // Photo Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoKey, setPhotoKey] = useState(Date.now());

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
    });
    setEditDialogOpen(true);
  }, [employee, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = editData.email.trim();
    const cleanPhone = editData.phone.trim();

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Format email tidak valid.");
      return;
    }
    if (cleanPhone && !/^[0-9+\-\s()]+$/.test(cleanPhone)) {
      toast.error("Nomor telepon hanya boleh berisi angka, tanda plus, tanda hubung, atau spasi.");
      return;
    }

    setEditLoading(true);
    try {
      await api.post("/me/update-profile", {
        email: cleanEmail,
        phone: cleanPhone,
      });
      toast.success("Profil kontak berhasil diperbarui!");
      setEditDialogOpen(false);
      onRefreshDashboard?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal memperbarui profil.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwData.current_password) {
      toast.error("Password saat ini wajib diisi.");
      return;
    }
    if (!pwData.new_password || pwData.new_password.length < 8) {
      toast.error("Password baru minimal 8 karakter.");
      return;
    }
    if (pwData.new_password !== pwData.new_password_confirmation) {
      toast.error("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (pwData.new_password === pwData.current_password) {
      toast.error("Password baru tidak boleh sama dengan password saat ini.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/me/change-password", pwData);
      toast.success("Password berhasil diubah! Silakan login kembali dengan password baru.");
      setPwDialogOpen(false);
      setPwData({ current_password: "", new_password: "", new_password_confirmation: "" });
      authStore.logout();
      window.location.href = "/login";
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const serverMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : err.response?.data?.message;
      toast.error(serverMsg || "Gagal mengubah password.");
    } finally {
      setPwLoading(false);
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
      setPhotoKey(Date.now());
      onRefreshDashboard?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal mengunggah foto profil.");
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <>
      <aside className="w-full lg:w-72 shrink-0 space-y-4">
        {/* PROFILE CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 relative">
          {/* Edit Profile Icon (Top Right Pencil) */}
          <button
            type="button"
            onClick={openEditDialog}
            title="Edit Informasi Kontak Profil"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>

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
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 shadow-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                {employee?.photo ? (
                  <Image
                    src={`${employee.photo}${employee.photo.includes("?") ? "&" : "?"}v=${photoKey}`}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Camera Action Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Ganti Foto Profil"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-2 border-white dark:border-slate-900 transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              {/* Status Pill */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                AKTIF
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {displayName}
              </h3>
              <p className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded inline-block">
                {displayNip}
              </p>
            </div>
          </div>

          {/* Info Details List */}
          <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jabatan</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{displayPosition}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <Building className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Kerja</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{displayDept}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {displayEmail}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Telepon / WhatsApp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {displayPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Single Ganti Password Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setPwDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Ganti Password</span>
            </button>
          </div>
        </div>

        {/* VERTICAL NAV MENU (MYASN STYLE) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-sm space-y-1">
          <p className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Menu Utama
          </p>

          {/* 1. Dashboard Utama */}
          <button
            type="button"
            onClick={() => onSelectNavTab("dashboard")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "dashboard" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Utama</span>
            </div>
          </button>

          {/* 2. Pinjaman Aktif */}
          <button
            type="button"
            onClick={() => onSelectNavTab("pinjaman")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "pinjaman" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <HandHelping className="w-4 h-4" />
              <span>Pinjaman Aktif</span>
            </div>
            {pinjamanCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeNavTab === "pinjaman" && !isInlineReportOpen
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {pinjamanCount}
              </span>
            )}
          </button>

          {/* 3. Aset Saya */}
          <button
            type="button"
            onClick={() => onSelectNavTab("aset")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "aset" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4" />
              <span>Aset Saya</span>
            </div>
            {assetCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeNavTab === "aset" && !isInlineReportOpen
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {assetCount}
              </span>
            )}
          </button>

          {/* 4. Surat Tugas & Laporan */}
          <button
            type="button"
            onClick={() => onSelectNavTab("surat_tugas")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "surat_tugas" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-4 h-4" />
              <span>Surat Tugas & Laporan</span>
            </div>
            {suratTugasCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeNavTab === "surat_tugas" && !isInlineReportOpen
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {suratTugasCount}
              </span>
            )}
          </button>

          {/* 5. Pengajuan Cuti */}
          <button
            type="button"
            onClick={() => onSelectNavTab("cuti")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "cuti" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4" />
              <span>Pengajuan Cuti</span>
            </div>
            {leaveCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeNavTab === "cuti" && !isInlineReportOpen
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {leaveCount}
              </span>
            )}
          </button>

          {/* 6. Visum SPD */}
          <button
            type="button"
            onClick={() => onSelectNavTab("visum")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "visum" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Visum SPD</span>
            </div>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeNavTab === "visum" && !isInlineReportOpen
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
              )}
            >
              Baru
            </span>
          </button>

          {/* 7. Kalkulator & Pengeluaran Dinas */}
          <button
            type="button"
            onClick={() => onSelectNavTab("kalkulator_dinas")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              activeNavTab === "kalkulator_dinas" && !isInlineReportOpen
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Calculator className="w-4 h-4" />
              <span>Kalkulator Dinas</span>
            </div>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeNavTab === "kalkulator_dinas" && !isInlineReportOpen
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
              )}
            >
              Baru
            </span>
          </button>

          {/* FAST ACTION: BUAT LAPORAN DROPDOWN */}
          {onOpenInlineReport && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between px-3.5 py-2.5 font-bold text-xs rounded-xl shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all focus:outline-none">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white" />
                    <span>{isInlineReportOpen ? "Form Laporan Aktif" : "Buat Laporan"}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border border-slate-200 shadow-xl bg-white dark:bg-slate-900">
                  <DropdownMenuItem
                    onClick={() => onOpenInlineReport("general")}
                    className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 focus:bg-emerald-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 shrink-0 mt-0.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Laporan Pelaksanaan ST</p>
                      <p className="text-[10px] text-slate-500 font-normal">Buka Mode Inline Form Laporan</p>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => onOpenInlineReport("smart_patrol")}
                    className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 focus:bg-emerald-50 transition-colors"
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
      </aside>

      {/* DIALOG EDIT PROFIL KONTAK */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-600" />
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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG GANTI PASSWORD */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              Ganti Password Akun
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Masukkan password lama dan password baru Anda untuk mengamankan akun.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Password Saat Ini</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={pwData.current_password}
                  onChange={(e) => setPwData({ ...pwData, current_password: e.target.value })}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Password Baru</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={pwData.new_password}
                  onChange={(e) => setPwData({ ...pwData, new_password: e.target.value })}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Konfirmasi Password Baru</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={pwData.new_password_confirmation}
                  onChange={(e) => setPwData({ ...pwData, new_password_confirmation: e.target.value })}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPwDialogOpen(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={pwLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Perbarui Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG PREVIEW GANTI FOTO */}
      <Dialog open={photoDialogOpen} onOpenChange={(open) => !open && closePhotoDialog()}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              Pratinjau Foto Profil
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pastikan foto sudah sesuai sebelum disimpan ke server.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-lg bg-slate-100 dark:bg-slate-800">
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
              <p className="mt-3 text-[11px] text-slate-500 font-mono truncate max-w-[240px]">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs w-full sm:w-auto"
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
}
