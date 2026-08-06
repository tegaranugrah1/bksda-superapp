"use client";

import React, { useState, useCallback } from "react";
import {
  Pencil, BadgeCheck, Fingerprint, Building2, Calendar, Mail, Phone,
  KeyRound, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DashboardData {
  user: { name: string; username: string; email: string | null; role: string; access_modules: string[] };
  employee: { id: number; nip: string; name: string; position: string; department: string; email: string | null; phone: string | null; photo: string | null; rank: string | null; rank_level: number; is_active: boolean } | null;
  my_assets: Array<{ id: number; nama_barang: string; kode_barang: string; nup: string; loan_date: string; due_date: string; status: string; merk: string | null; jenis_bmn?: string; no_polisi?: string | null; nup_lama?: string | null }>;
}

interface ProfileSidebarProps {
  data: DashboardData;
  isActive: boolean;
  currentYear: number;
  myLeaveBalance: { sisa_cuti_tersedia: number; total_hak_cuti: number } | null;
  mobileProfileOpen: boolean;
  setMobileProfileOpen: (open: boolean) => void;
  fetchDashboard: () => void;
}

export function ProfileSidebar({
  data,
  isActive,
  currentYear,
  myLeaveBalance,
  mobileProfileOpen,
  setMobileProfileOpen,
  fetchDashboard,
}: ProfileSidebarProps) {
  // Password Dialog state
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwData, setPwData] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [pwLoading, setPwLoading] = useState(false);

  // Edit Profile Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ email: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);

  const openEditDialog = useCallback(() => {
    setEditData({ email: data.employee?.email || data.user.email || "", phone: data.employee?.phone || "" });
    setEditDialogOpen(true);
  }, [data]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.post("/me/update-profile", editData);
      toast.success("Profil berhasil diperbarui!");
      setEditDialogOpen(false);
      fetchDashboard();
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
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/me/change-password", pwData);
      toast.success("Password berhasil diperbarui!");
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
      {/* Mobile Profile Backdrop */}
      {mobileProfileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileProfileOpen(false)}
        />
      )}

      {/* Sidebar Profile */}
      <aside className={cn(
        "fixed lg:static top-0 right-0 h-dvh lg:h-auto w-70 sm:w-[320px] lg:w-70 bg-slate-50 dark:bg-slate-900/50 lg:bg-transparent shadow-2xl lg:shadow-none z-50 lg:z-auto transition-transform duration-300 overflow-y-auto lg:overflow-visible p-6 lg:p-0 space-y-4",
        mobileProfileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 text-center relative">
          <button onClick={openEditDialog} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-colors" title="Edit Profil">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <div className="w-20 h-20 rounded-full bg-emerald-600 mx-auto flex items-center justify-center text-white text-2xl font-black mb-3 relative group overflow-hidden">
            {data.employee?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.employee.photo} alt="Foto Profil" className="w-full h-full object-cover" />
            ) : (
              data.user.name.charAt(0)
            )}
            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Pencil className="w-5 h-5 text-white" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) { toast.error("Maksimal 10MB"); return; }
                  const fd = new FormData();
                  fd.append("foto", file);
                  try {
                    await api.post("/me/update-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
                    toast.success("Foto profil berhasil diperbarui!");
                    fetchDashboard();
                  } catch { toast.error("Gagal mengupload foto."); }
                }}
              />
            </label>
          </div>
          <div className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2", isActive ? "bg-emerald-800 text-white dark:bg-emerald-900" : "bg-slate-700 text-white dark:bg-slate-800")}>
            <BadgeCheck className="w-3 h-3" /> {isActive ? "Aktif" : "Nonaktif"}
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{data.employee?.name || data.user.name}</h2>
          <p className="text-xs text-slate-400 mb-1">NIP {data.employee?.nip || data.user.username}</p>
          <Badge className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none">
            {data.user.role === "super_admin" ? "Super Admin" : data.user.role === "admin" ? "Administrator" : "Pegawai"}
          </Badge>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 space-y-2">
          {[
            { icon: <Fingerprint className="w-4 h-4" />, label: "Jabatan", value: data.employee?.position || "-", color: "text-emerald-500" },
            { icon: <Building2 className="w-4 h-4" />, label: "Unit Kerja", value: data.employee?.department || "-", color: "text-blue-500" },
            { icon: <Calendar className="w-4 h-4" />, label: `Sisa Cuti (${currentYear})`, value: myLeaveBalance ? `${myLeaveBalance.sisa_cuti_tersedia} Hari Kerja` : "12 Hari Kerja", color: "text-amber-500" },
            { icon: <Mail className="w-4 h-4" />, label: "Email", value: data.employee?.email || data.user.email || "-", color: "text-rose-500" },
            { icon: <Phone className="w-4 h-4" />, label: "Telepon", value: data.employee?.phone || "-", color: "text-teal-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 transition-colors">
              <div className={cn("shrink-0", item.color)}>{item.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full rounded-xl text-xs h-10 font-semibold">
                <KeyRound className="w-4 h-4 mr-2 text-emerald-500" /> Ganti Password
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-100 w-[90vw] mx-auto rounded-2xl">
              <form onSubmit={handleChangePassword}>
                <DialogHeader><DialogTitle>Ubah Password</DialogTitle><DialogDescription>Password baru minimal 8 karakter.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label htmlFor="current_password">Password Saat Ini</Label><Input id="current_password" type="password" value={pwData.current_password} onChange={(e) => setPwData({ ...pwData, current_password: e.target.value })} required /></div>
                  <div className="grid gap-2"><Label htmlFor="new_password">Password Baru</Label><Input id="new_password" type="password" value={pwData.new_password} onChange={(e) => setPwData({ ...pwData, new_password: e.target.value })} required minLength={8} /></div>
                  <div className="grid gap-2"><Label htmlFor="new_password_confirmation">Konfirmasi</Label><Input id="new_password_confirmation" type="password" value={pwData.new_password_confirmation} onChange={(e) => setPwData({ ...pwData, new_password_confirmation: e.target.value })} required minLength={8} /></div>
                </div>
                <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="w-full sm:w-auto">Batal</Button></DialogClose><Button type="submit" disabled={pwLoading} className="w-full sm:w-auto">{pwLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-100 w-[90vw] mx-auto rounded-2xl">
            <form onSubmit={handleSaveProfile}>
              <DialogHeader><DialogTitle>Edit Profil</DialogTitle><DialogDescription>Perbarui informasi profil Anda.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
                <div className="grid gap-2"><Label htmlFor="phone">Telepon</Label><Input id="phone" type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} /></div>
              </div>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose><Button type="submit" disabled={editLoading}>{editLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </aside>
    </>
  );
}
