"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import {
  User, Key, LayoutDashboard, HandHelping, Briefcase, ClipboardList,
  Calendar, UserCheck, Building, FileText, ChevronDown, FileCheck,
  FileSpreadsheet, Pencil, Loader2, Mail, Phone, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
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

  const openEditDialog = useCallback(() => {
    setEditData({
      email: employee?.email || user?.email || "",
      phone: employee?.phone || "",
    });
    setEditDialogOpen(true);
  }, [employee, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.post("/me/update-profile", editData);
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
    if (pwData.new_password !== pwData.new_password_confirmation) {
      toast.error("Konfirmasi password baru tidak cocok.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/me/change-password", pwData);
      toast.success("Password berhasil diubah!");
      setPwDialogOpen(false);
      setPwData({ current_password: "", new_password: "", new_password_confirmation: "" });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal mengubah password.");
    } finally {
      setPwLoading(false);
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
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 shadow-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                {employee?.photo ? (
                  <Image
                    src={employee.photo}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Status Pill */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
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
    </>
  );
}
