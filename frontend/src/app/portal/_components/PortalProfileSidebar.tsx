"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Key, LayoutDashboard, Handshake, Package, ClipboardList,
  Calendar, UserCheck, Building, ChevronDown, FileCheck,
  FileSpreadsheet, Pencil, Loader2, Mail, Phone, Lock, Calculator,
  Camera, Cloud, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  onLogout?: () => void;
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
  onLogout,
}: PortalProfileSidebarProps) {
  const displayName = employee?.name || user?.name || "Pegawai BKSDA";
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

  return (
    <>
      <aside className="w-full space-y-5" data-purpose="sidebar-profile-and-menu">
        {/* CARD 1: PROFILE CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 shadow-sm p-6 relative overflow-hidden">
          {/* Top Right Edit Pencil Icon */}
          <button
            type="button"
            onClick={openEditDialog}
            title="Ubah Profil"
            className="absolute top-5 right-5 text-slate-400 hover:text-[#1e5433] dark:hover:text-emerald-400 transition-colors p-1"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Avatar & Badges */}
          <div className="flex flex-col items-center text-center pt-2">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <div className="w-24 h-24 rounded-full bg-[#1e5433] text-white text-3xl font-extrabold flex items-center justify-center shadow-md overflow-hidden">
                {employee?.photo ? (
                  <Image
                    src={`${employee.photo}${employee.photo.includes("?") ? "&" : "?"}v=${photoVersion}`}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Camera button overlay right */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Ganti Foto"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#164227] hover:bg-[#153e24] text-white flex items-center justify-center transition-colors shadow-sm border-2 border-white dark:border-slate-900 cursor-pointer z-10"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* AKTIF Pill positioned overlapping avatar bottom */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1e5433] text-white text-[10px] font-bold tracking-wider shadow-xs z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span>AKTIF</span>
              </div>
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-4">
              {displayName}
            </h2>
            <div className="mt-1">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#e4f0e6] dark:bg-emerald-950/60 text-[#1e5433] dark:text-emerald-300 border border-[#dce8dd] dark:border-emerald-800/40">
                {user?.role || "superadmin"}
              </span>
            </div>
          </div>

          <hr className="my-5 border-[#edf3ee] dark:border-slate-800" />

          {/* Information Meta List */}
          <div className="space-y-3.5 text-left text-xs">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#1e5433] dark:text-emerald-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">JABATAN</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{displayPosition}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#1e5433] dark:text-emerald-400 shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">UNIT KERJA</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{displayDept}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#1e5433] dark:text-emerald-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">EMAIL</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={displayEmail}>
                  {displayEmail}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#1e5433] dark:text-emerald-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">TELEPON / WHATSAPP</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{displayPhone}</p>
              </div>
            </div>
          </div>

          {/* Ganti Password CTA Pill */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setPwDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#edf3ee] dark:bg-slate-800 hover:bg-[#e4f0e6] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#1e5433] dark:hover:text-emerald-300 text-xs font-semibold transition-all border border-[#dce8dd] dark:border-slate-700 shadow-xs cursor-pointer"
            >
              <Key className="w-4 h-4 text-[#1e5433] dark:text-emerald-400" />
              <span>Ganti Password</span>
            </button>
          </div>
        </div>

        {/* CARD 2: PRIMARY NAVIGATION MENU */}
        <nav className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 shadow-sm p-4 space-y-1" data-purpose="primary-navigation-sidebar">
          <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider px-3 py-1 mb-1">
            MENU UTAMA
          </p>

          {/* Nav Items */}
          {[
            { id: "dashboard", label: "Dashboard Utama", icon: LayoutDashboard },
            { id: "pinjaman", label: "Pinjaman Aktif", icon: Handshake, count: pinjamanCount },
            { id: "aset", label: "Aset Saya", icon: Package, count: assetCount },
            { id: "surat_tugas", label: "Surat Tugas & Laporan", icon: ClipboardList, count: suratTugasCount },
            { id: "cuti", label: "Pengajuan Cuti", icon: Calendar, count: leaveCount },
            { id: "visum", label: "Visum SPD", icon: FileSpreadsheet, badgeText: "Baru", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200/80" },
            { id: "kalkulator_dinas", label: "Kalkulator Dinas", icon: Calculator, badgeText: "Estimasi", badgeClass: "bg-[#e4f0e6] text-[#1e5433] dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#dce8dd] dark:border-emerald-800/40" },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id && !isInlineReportOpen;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNavTab(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer",
                  isActive
                    ? "bg-[#d5e8d9] dark:bg-emerald-950/60 text-[#1e5433] dark:text-emerald-300 font-bold shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:text-[#1e5433] dark:hover:text-emerald-400 hover:bg-[#edf3ee] dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", isActive ? "text-[#1e5433] dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-[#1e5433] text-white"
                        : "bg-[#edf3ee] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[#dce8dd] dark:border-slate-700"
                    )}
                  >
                    {item.count}
                  </span>
                )}
                {item.badgeText && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold",
                      item.badgeClass
                    )}
                  >
                    {item.badgeText}
                  </span>
                )}
              </button>
            );
          })}

          {/* BKSDA Drive */}
          <Link
            href="/drive"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1e5433] dark:hover:text-emerald-400 hover:bg-[#edf3ee] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>BKSDA Drive</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e4f0e6] dark:bg-emerald-950/60 text-[#1e5433] dark:text-emerald-300 border border-[#dce8dd] dark:border-emerald-800/40">
              Baru
            </span>
          </Link>

          {/* Buat Laporan Dropdown Action */}
          <div className="pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between py-3 px-4 rounded-2xl bg-[#1e5433] hover:bg-[#164227] text-white font-bold text-xs shadow-sm transition-all group focus:outline-hidden cursor-pointer">
                <span className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-white" />
                  <span>{isInlineReportOpen ? "Form Laporan Aktif" : "Buat Laporan"}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-white opacity-80 group-hover:translate-y-0.5 transition-transform" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border border-[#dce8dd] shadow-xl bg-white dark:bg-slate-900">
                <DropdownMenuItem
                  onClick={() => onOpenInlineReport("general")}
                  className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#edf3ee] dark:hover:bg-slate-800 focus:bg-[#edf3ee] transition-colors"
                >
                  <div className="p-2 rounded-lg bg-[#e4f0e6] text-[#1e5433] shrink-0 mt-0.5">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Laporan Pelaksanaan ST</p>
                    <p className="text-[10px] text-slate-500 font-normal">Buka Mode Inline Form Laporan</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onOpenInlineReport("smart_patrol")}
                  className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#edf3ee] dark:hover:bg-slate-800 focus:bg-[#edf3ee] transition-colors"
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
        </nav>

        {/* CARD 3: DEDICATED SEPARATED LOGOUT CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 shadow-sm p-4 space-y-3">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-[#dce8dd] dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition-all cursor-pointer group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
            <span>Keluar / Logout</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 font-mono">
            v3.4.0 (Enterprise) • BKSDA Kaltim
          </p>
        </div>
      </aside>

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

      {/* DIALOG GANTI PASSWORD */}
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
}
