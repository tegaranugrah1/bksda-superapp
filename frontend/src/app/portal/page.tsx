"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes, LayoutGrid, Package, FileText, LogOut,
  Fingerprint, KeyRound, Loader2, BadgeCheck, Mail, Phone, Briefcase,
  HandHelping, Sun, Sunset, Moon, Pencil, Sparkles, Bell,
  Download, Eye, Users, ClipboardList, Building2,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { authStore } from "@/lib/auth-store";

interface DashboardData {
  user: { name: string; username: string; email: string | null; role: string; access_modules: string[] };
  employee: { id: number; nip: string; name: string; position: string; department: string; email: string | null; phone: string | null; photo: string | null; rank: string | null; rank_level: number; is_active: boolean } | null;
  my_assets: Array<{ id: number; nama_barang: string; kode_barang: string; nup: string; loan_date: string; due_date: string; status: string; merk: string | null; jenis_bmn?: string; no_polisi?: string | null; nup_lama?: string | null }>;
}

interface SuratTugasItem {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  file_surat_path: string | null;
}

type TabKey = "pinjaman" | "aset" | "surat_tugas";

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: "Selamat Pagi", icon: <Sun className="w-5 h-5 text-amber-400" /> };
  if (hour >= 11 && hour < 15) return { text: "Selamat Siang", icon: <Sun className="w-5 h-5 text-orange-400" /> };
  if (hour >= 15 && hour < 18) return { text: "Selamat Sore", icon: <Sunset className="w-5 h-5 text-orange-500" /> };
  return { text: "Selamat Malam", icon: <Moon className="w-5 h-5 text-indigo-400" /> };
}

function formatDate(): string {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatMerkTipe(merk?: string | null, tipe?: string | null, merkTipe?: string | null): string | null {
  const combined = [merk, tipe, merkTipe].filter(Boolean).join(" ");
  if (!combined) return null;
  const parts = combined.split(/[\s,]+/);
  return [...new Set(parts)].join(" ");
}

interface AssetItem {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  nup_lama?: string | null;
  merk?: string | null;
  tipe?: string | null;
  merk_tipe?: string | null;
  kondisi?: string | null;
  no_polisi?: string | null;
  jenis_bmn?: string | null;
}

export default function PersonalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pinjaman");
  const [suratTugas, setSuratTugas] = useState<SuratTugasItem[]>([]);
  const [stLoading, setStLoading] = useState(false);
  
  // Aset states
  const [myAssets, setMyAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwData, setPwData] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ email: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);

  const filteredMyAssets = useMemo(() => {
    if (!data?.my_assets) return myAssets;
    const borrowedIds = new Set(data.my_assets.map(a => a.id));
    return myAssets.filter(a => !borrowedIds.has(a.id));
  }, [myAssets, data?.my_assets]);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get("/me/dashboard");
      setData(response.data);
      if (response.data?.user) authStore.updateUser(response.data.user);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) { router.push("/login"); }
      else { setFetchError("Gagal memuat data dashboard."); }
    } finally { setLoading(false); }
  }, [router]);

  const fetchSuratTugas = useCallback(async () => {
    if (!data?.employee?.id) {
      setSuratTugas([]);
      return;
    }
    setStLoading(true);
    try {
      const resp = await api.get("/surat-tugas", { 
        params: { status: "approved", per_page: 20, employee_id: data.employee.id } 
      });
      setSuratTugas(resp.data.data || []);
    } catch { setSuratTugas([]); }
    finally { setStLoading(false); }
  }, [data]);

  const fetchAssets = useCallback(async () => {
    if (!data?.employee?.id) {
      setMyAssets([]);
      return;
    }
    setAssetsLoading(true);
    try {
      const respMy = await api.get("/bmn/assets", { params: { employee_id: data.employee.id, per_page: 50 } });
      setMyAssets(respMy.data.data || []);
    } catch {
      setMyAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }, [data]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { 
    if (activeTab === "surat_tugas") fetchSuratTugas(); 
    if (activeTab === "aset") fetchAssets();
  }, [activeTab, fetchSuratTugas, fetchAssets]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = () => { authStore.logout(); router.push("/login"); };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwData.new_password !== pwData.new_password_confirmation) { toast.error("Konfirmasi password tidak cocok."); return; }
    setPwLoading(true);
    try { await api.post("/me/change-password", pwData); toast.success("Password berhasil diperbarui!"); setPwDialogOpen(false); setPwData({ current_password: "", new_password: "", new_password_confirmation: "" }); }
    catch (error: unknown) { const err = error as { response?: { data?: { message?: string } } }; toast.error(err.response?.data?.message || "Gagal mengubah password."); }
    finally { setPwLoading(false); }
  };

  const openEditDialog = useCallback(() => {
    if (!data) return;
    setEditData({ email: data.employee?.email || data.user.email || "", phone: data.employee?.phone || "" });
    setEditDialogOpen(true);
  }, [data]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setEditLoading(true);
    try { await api.post("/me/update-profile", editData); toast.success("Profil berhasil diperbarui!"); setEditDialogOpen(false); fetchDashboard(); }
    catch (error: unknown) { const err = error as { response?: { data?: { message?: string } } }; toast.error(err.response?.data?.message || "Gagal memperbarui profil."); }
    finally { setEditLoading(false); }
  };

  const handleDownloadST = async (id: string) => {
    try {
      const resp = await api.get(`/surat-tugas/${id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a"); link.href = url;
      link.setAttribute("download", `ST_${id.substring(0, 8)}.pdf`);
      document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
    } catch { toast.error("File tidak tersedia untuk diunduh."); }
  };

  const modules = useMemo(() => {
    if (!data) return [];
    return data.user.role === "super_admin" || (data.user.access_modules?.includes("*"))
      ? ["kepegawaian", "bmn", "inventory", "dereporting", "cms"]
      : (data.user.access_modules || []);
  }, [data]);

  const moduleCards = useMemo(() => {
    const all: { key: string; href: string; label: string; desc: string; icon: React.ReactNode; color: string; bg: string }[] = [
      { key: "kepegawaian", href: "/kepegawaian", label: "Kepegawaian", desc: "Surat Tugas & SDM", icon: <Users className="w-6 h-6" />, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
      { key: "bmn", href: "/bmn", label: "BMN", desc: "Barang Milik Negara", icon: <Package className="w-6 h-6" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
      { key: "inventory", href: "/inventory", label: "Persediaan", desc: "Stok & Distribusi", icon: <Boxes className="w-6 h-6" />, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-500/10" },
      { key: "dereporting", href: "/dereporting", label: "DeReporting", desc: "Pelaporan Digital", icon: <FileText className="w-6 h-6" />, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-500/10" },
      { key: "cms", href: "/cms", label: "CMS Portal", desc: "Manajemen Konten", icon: <LayoutGrid className="w-6 h-6" />, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-500/10" },
    ];
    return all.filter(m => modules.includes(m.key));
  }, [modules]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 mb-4">
          <Sparkles className="h-6 w-6 text-white animate-pulse" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mb-2" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Memuat dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <p className="text-slate-700 dark:text-slate-300 font-bold mb-3">{fetchError || "Gagal memuat data"}</p>
        <Button onClick={fetchDashboard}>Coba Lagi</Button>
      </div>
    );
  }

  const greeting = getGreeting();
  const firstName = (data.employee?.name || data.user.name).split(" ")[0];
  const isActive = data.employee?.is_active !== false;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "pinjaman", label: "Pinjaman Aktif", icon: <HandHelping className="w-4 h-4" />, count: data.my_assets.length },
    { key: "aset", label: "Aset Saya", icon: <Briefcase className="w-4 h-4" />, count: filteredMyAssets.length },
    { key: "surat_tugas", label: "Surat Tugas", icon: <ClipboardList className="w-4 h-4" />, count: suratTugas.length },
  ];

  return (
    <RouteGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800/50 rounded-xl">
                <Image src="/logo_bksda.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">BKSDA Kaltim</h1>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">SuperApp Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
              <button 
                onClick={() => setMobileProfileOpen(true)}
                className="lg:hidden w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm ml-2 shadow-sm border border-emerald-500"
              >
                {data.user.name.charAt(0)}
              </button>
              <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {data.user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{data.user.name}</p>
                  <p className="text-[10px] text-slate-400">{data.employee?.position || data.user.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
          {/* Mobile Profile Backdrop */}
          {mobileProfileOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
              onClick={() => setMobileProfileOpen(false)}
            />
          )}

          {/* Sidebar Profile */}
          <aside className={cn(
            "fixed lg:static top-0 right-0 h-dvh lg:h-auto w-[280px] sm:w-[320px] lg:w-[280px] bg-slate-50 dark:bg-slate-900/50 lg:bg-transparent shadow-2xl lg:shadow-none z-50 lg:z-auto transition-transform duration-300 overflow-y-auto lg:overflow-visible p-6 lg:p-0 space-y-4",
            mobileProfileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 text-center relative">
              <button onClick={openEditDialog} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-colors" title="Edit Profil">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <div className="w-20 h-20 rounded-full bg-emerald-600 mx-auto flex items-center justify-center text-white text-2xl font-black mb-3">
                {data.user.name.charAt(0)}
              </div>
              <div className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2", isActive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-500 dark:text-slate-400")}>
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
                <DialogContent className="sm:max-w-[400px] w-[90vw] mx-auto rounded-2xl">
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
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-6 order-1 lg:order-2">
            {/* Welcome Banner */}
            <div className="bg-emerald-600 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
              <div className="relative z-10">
                <p className="text-emerald-100 text-sm mb-1">{formatDate()}</p>
                <h2 className="text-2xl sm:text-3xl font-black flex flex-wrap items-center gap-2">
                  {greeting.text}, {firstName}! {greeting.icon}
                </h2>
                <p className="text-emerald-100 text-sm mt-2">Selamat datang di portal BKSDA Kalimantan Timur.</p>
              </div>
            </div>

            {/* Module Grid */}
            {moduleCards.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Modul Akses</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {moduleCards.map((mod) => (
                    <Link key={mod.key} href={mod.href} className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-center">
                      <div className={cn("w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-2", mod.bg, mod.color)}>
                        {mod.icon}
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{mod.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mod.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs Section */}
            <div>
              <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden items-center gap-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-1 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center whitespace-nowrap min-w-fit",
                      activeTab === tab.key ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50"
                    )}
                  >
                    {tab.icon} {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === tab.key ? "bg-white/20" : "bg-slate-100 dark:bg-zinc-700")}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab: Pinjaman Aktif */}
              {activeTab === "pinjaman" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                  {data.my_assets.length === 0 ? (
                    <div className="p-12 text-center">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada pinjaman aktif</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {data.my_assets.map((asset) => (
                        <div key={asset.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{asset.nama_barang}</p>
                            {formatMerkTipe(asset.merk) && (
                              <p className="text-xs text-slate-500 mb-0.5 truncate">{formatMerkTipe(asset.merk)}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{asset.kode_barang}</span>
                              <span className="text-xs text-slate-500">NUP: {asset.nup}</span>
                              {asset.nup_lama && (
                                <span className="text-xs text-slate-400">• NUP Lama: {asset.nup_lama}</span>
                              )}
                              {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                                  {asset.no_polisi}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant={new Date(asset.due_date) < new Date() ? "destructive" : "secondary"} className="shrink-0">
                            {new Date(asset.due_date) < new Date() ? "Terlambat" : asset.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Aset Saya */}
              {activeTab === "aset" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                  {assetsLoading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Memuat aset Anda...</p>
                    </div>
                  ) : filteredMyAssets.length === 0 ? (
                    <div className="p-12 text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada aset di bawah tanggung jawab Anda.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {filteredMyAssets.map((asset) => (
                        <div key={`my-${asset.id}`} className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{asset.nama_barang}</p>
                            {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                              <p className="text-xs text-slate-500 mb-0.5 truncate">{formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{asset.kode_barang}</span>
                              <span className="text-xs text-slate-500">NUP: {asset.nup}</span>
                              {asset.nup_lama && (
                                <span className="text-xs text-slate-400">• NUP Lama: {asset.nup_lama}</span>
                              )}
                              {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                                  {asset.no_polisi}
                                </span>
                              )}
                              {asset.kondisi && (
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium ml-1", 
                                  asset.kondisi === "Baik" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                  asset.kondisi === "Rusak Ringan" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                                  "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                )}>{asset.kondisi}</span>
                              )}
                            </div>
                          </div>
                          <Link href={`/bmn/assets/${asset.id}`} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 transition-colors" title="Lihat Detail">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Surat Tugas */}
              {activeTab === "surat_tugas" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                  {stLoading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Memuat surat tugas...</p>
                    </div>
                  ) : suratTugas.length === 0 ? (
                    <div className="p-12 text-center">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada surat tugas yang diterbitkan</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {suratTugas.map((st) => (
                        <div key={st.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{st.maksud_tujuan}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {st.nomor_surat && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{st.nomor_surat}</span>}
                              <span className="text-xs text-slate-400">
                                {new Date(st.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link href={`/verifikasi/surat-tugas/${st.id}`} className="p-2 rounded-lg hover:bg-blue-50 dark:bg-blue-500/10 text-blue-600 transition-colors" title="Lihat">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {st.file_surat_path && (
                              <button onClick={() => handleDownloadST(st.id)} className="p-2 rounded-lg hover:bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 transition-colors" title="Download">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
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
      </div>
    </RouteGuard>
  );
}
