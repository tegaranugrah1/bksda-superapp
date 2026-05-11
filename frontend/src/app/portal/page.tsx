"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes, LayoutGrid,
  Package,
  FileText,
  LogOut,
  ShieldCheck,
  Building2,
  Fingerprint,
  KeyRound,
  Loader2,
  BadgeCheck,
  Mail,
  Phone,
  Briefcase,
  HandHelping,
  Sun,
  Sunset,
  Moon,
  Pencil,
  Sparkles,
  Bell,
  ArrowRight,
  Search,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth-store";

interface DashboardData {
  user: {
    name: string;
    username: string;
    email: string | null;
    role: string;
    access_modules: string[];
  };
  employee: {
    id: number;
    nip: string;
    name: string;
    position: string;
    department: string;
    email: string | null;
    phone: string | null;
    photo: string | null;
    rank: string | null;
    rank_level: number;
    is_active: boolean;
  } | null;
  my_assets: Array<{
    id: number;
    nama_barang: string;
    kode_barang: string;
    nup: string;
    loan_date: string;
    due_date: string;
    status: string;
    merk: string | null;
  }>;
}

type TabKey = 'pinjaman' | 'aset' | 'surat_tugas';

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: 'Selamat Pagi', icon: <Sun className="w-5 h-5" /> };
  if (hour >= 11 && hour < 15) return { text: 'Selamat Siang', icon: <Sun className="w-5 h-5" /> };
  if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', icon: <Sunset className="w-5 h-5" /> };
  return { text: 'Selamat Malam', icon: <Moon className="w-5 h-5" /> };
}

function formatDate(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const ITEMS_PER_PAGE = 6;

export default function PersonalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('pinjaman');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: ""
  });
  const [pwLoading, setPwLoading] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ email: '', phone: '' });
  const [editLoading, setEditLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get("/me/dashboard");
      setData(response.data);
      if (response.data?.user) {
        authStore.updateUser(response.data.user);
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      console.error("Failed to fetch dashboard:", error);
      if (err.response?.status === 401) {
        router.push("/login");
      } else {
        setFetchError("Gagal memuat data dashboard. Pastikan backend sudah running.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = () => {
    authStore.logout();
    router.push("/login");
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

  const openEditDialog = useCallback(() => {
    if (!data) return;
    setEditData({
      email: data.employee?.email || data.user.email || '',
      phone: data.employee?.phone || '',
    });
    setEditDialogOpen(true);
  }, [data]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.post('/me/update-profile', editData);
      toast.success('Profil berhasil diperbarui!');
      setEditDialogOpen(false);
      fetchDashboard();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil.');
    } finally {
      setEditLoading(false);
    }
  };

  const modules = useMemo(() => {
    if (!data) return [];
    return ['admin', 'super_admin'].includes(data.user.role) || (data.user.access_modules && data.user.access_modules.includes('*'))
      ? ['admin', 'bmn', 'inventory', 'dereporting', 'cms']
      : (data.user.access_modules || []);
  }, [data]);

  const overdueCount = useMemo(() => {
    if (!data) return 0;
    return data.my_assets.filter(a => new Date(a.due_date) < new Date()).length;
  }, [data]);

  const filteredAssets = useMemo(() => {
    if (!data) return [];
    let assets = data.my_assets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      assets = assets.filter(a =>
        a.nama_barang.toLowerCase().includes(q) ||
        a.kode_barang.toLowerCase().includes(q) ||
        (a.merk && a.merk.toLowerCase().includes(q))
      );
    }
    if (filterCondition !== 'all') {
      assets = assets.filter(a => {
        const s = a.status?.toLowerCase() || '';
        if (filterCondition === 'baik') return s.includes('baik') || s.includes('active') || s.includes('approved');
        if (filterCondition === 'rusak_ringan') return s.includes('rusak ringan') || s.includes('minor');
        if (filterCondition === 'rusak_berat') return s.includes('rusak berat') || s.includes('major');
        if (filterCondition === 'overdue') return new Date(a.due_date) < new Date();
        return true;
      });
    }
    return assets;
  }, [data, searchQuery, filterCondition]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE));
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCondition]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const moduleCards = useMemo(() => {
    const all: { key: string; href: string; label: string; description: string; renderIcon: (cls: string) => React.ReactNode; gradient: string; iconBg: string }[] = [];
    if (modules.includes('admin')) all.push({
      key: 'admin', href: '/admin', label: 'Administrasi', description: 'Manajemen sistem & pegawai',
      renderIcon: (cls) => <ShieldCheck className={cls} />,
      gradient: 'from-violet-500 to-purple-600', iconBg: 'bg-violet-500/10 text-violet-600'
    });
    if (modules.includes('bmn')) all.push({
      key: 'bmn', href: '/bmn', label: 'BMN', description: 'Barang Milik Negara',
      renderIcon: (cls) => <Package className={cls} />,
      gradient: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-500/10 text-blue-600'
    });
    if (modules.includes('inventory')) all.push({
      key: 'inv', href: '/inventory', label: 'Persediaan', description: 'Stok & distribusi',
      renderIcon: (cls) => <Boxes className={cls} />,
      gradient: 'from-orange-500 to-amber-500', iconBg: 'bg-orange-500/10 text-orange-600'
    });
    if (modules.includes('dereporting')) all.push({
      key: 'dr', href: '/dereporting', label: 'DeReporting', description: 'Pelaporan digital elektronik',
      renderIcon: (cls) => <FileText className={cls} />,
      gradient: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-500/10 text-emerald-600'
    });
    if (modules.includes('cms')) all.push({
      key: 'cms', href: '/cms', label: 'CMS Portal', description: 'Manajemen konten website',
      renderIcon: (cls) => <LayoutGrid className={cls} />,
      gradient: 'from-blue-600 to-indigo-600', iconBg: 'bg-blue-500/10 text-blue-600'
    });
    return all;
  }, [modules]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f7f8fa] relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-linear-to-br from-emerald-200/40 to-cyan-200/30 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-linear-to-br from-violet-200/30 to-blue-200/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-200/50">
              <Sparkles className="h-7 w-7 text-white animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-700 font-bold text-sm tracking-tight">Menyiapkan Dashboard</p>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              <p className="text-slate-400 font-medium text-xs">Memuat data Anda...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f7f8fa] relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-linear-to-br from-red-200/40 to-orange-200/30 rounded-full blur-[150px]"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center shadow-xl shadow-red-200/50">
            <span className="text-3xl">!</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-700 font-bold text-sm tracking-tight">{fetchError || "Gagal memuat data"}</p>
            <Button onClick={() => fetchDashboard()} className="mt-2">
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = data.employee?.is_active !== false;
  const greeting = getGreeting();
  const firstName = (data.employee?.name || data.user.name).split(' ')[0];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'pinjaman', label: 'Pinjaman Aktif', icon: <HandHelping className="w-4 h-4" />, badge: data.my_assets.length },
    { key: 'aset', label: 'Aset Saya', icon: <Briefcase className="w-4 h-4" /> },
  ];

  return (
    <RouteGuard>
      <div className="h-screen bg-[#f7f8fa] font-sans relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-linear-to-br from-emerald-300/25 to-cyan-300/15 rounded-full blur-[130px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-linear-to-br from-violet-300/15 to-blue-300/10 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] left-[30%] w-[35%] h-[35%] bg-linear-to-br from-amber-200/15 to-orange-200/10 rounded-full blur-[130px]"></div>
      </div>

      <header className="sticky top-0 z-50 w-full bg-white/75 backdrop-blur-2xl border-b border-slate-200/50">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-xl">
                <Image
                  src="/logo_bksda.png"
                  alt="Logo BKSDA"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-[15px] font-black tracking-tight text-slate-900 leading-none">SuperApp</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">BKSDA</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2.5 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
                <Bell className="w-[18px] h-[18px] text-slate-500" />
                {overdueCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
              <div className="hidden md:flex items-center gap-3 pl-3 ml-1 border-l border-slate-200/60">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-emerald-200/40">
                  {data.user.name.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{data.user.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{data.employee?.position || data.user.role}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={handleLogout} className="rounded-xl h-9 w-9 p-0 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all ml-1">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative z-10 flex overflow-hidden">
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-r border-slate-200/40 bg-white/50 backdrop-blur-xl overflow-y-auto">
          <div className="p-6 flex flex-col items-center text-center relative">
            <button
              onClick={openEditDialog}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100/80 hover:bg-emerald-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all duration-200 hover:shadow-sm"
              title="Edit Profil"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <div className="relative mb-5">
              <div className="w-[88px] h-[88px] rounded-[22px] bg-linear-to-br from-emerald-400 via-teal-500 to-cyan-600 p-[3px] shadow-xl shadow-emerald-200/30">
                <div className="w-full h-full rounded-[19px] bg-white flex items-center justify-center overflow-hidden">
                  <span className="text-[32px] font-black bg-linear-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    {data.user.name.charAt(0)}
                  </span>
                </div>
              </div>
              <div className={cn(
                "absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase px-3 py-1 rounded-full ring-3 ring-white shadow-md flex items-center gap-1",
                isActive ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"
              )}>
                <BadgeCheck className="w-2.5 h-2.5" />
                {isActive ? "Aktif" : "Nonaktif"}
              </div>
            </div>
            <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight leading-snug">
              {data.employee?.name || data.user.name}
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5 tracking-tight">
              NIP {data.employee?.nip || data.user.username}
            </p>
            <Badge className={cn(
              "rounded-full font-bold text-[10px] uppercase px-3.5 py-1 border-none mt-2.5 tracking-wide",
              data.user.role === 'admin'
                ? "bg-linear-to-r from-violet-500/10 to-purple-500/10 text-violet-700"
                : "bg-linear-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700"
            )}>
              {data.user.role === 'admin' ? "Administrator" : "Pegawai"}
            </Badge>
          </div>

          <div className="px-5 pb-5 space-y-2">
            {[
              { icon: <Fingerprint className="w-4 h-4" />, label: 'Jabatan', value: data.employee?.position || '-', color: 'text-emerald-500' },
              { icon: <Building2 className="w-4 h-4" />, label: 'Unit Kerja', value: data.employee?.department || '-', color: 'text-blue-500' },
              { icon: <Mail className="w-4 h-4" />, label: 'Email', value: data.employee?.email || data.user.email || '-', color: 'text-rose-500' },
              { icon: <Phone className="w-4 h-4" />, label: 'Telepon', value: data.employee?.phone || '-', color: 'text-teal-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 hover:bg-white/80 transition-colors duration-200">
                <div className={cn("shrink-0", item.color)}>{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="text-[13px] font-semibold text-slate-700 truncate leading-tight">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto p-5 space-y-2 border-t border-slate-100/60">
            <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full rounded-2xl border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm font-semibold text-xs h-11 hover:bg-white hover:shadow-md transition-all duration-300">
                  <KeyRound className="w-4 h-4 mr-2 text-emerald-500" /> Ganti Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleChangePassword}>
                  <DialogHeader>
                    <DialogTitle>Ubah Password</DialogTitle>
                    <DialogDescription>
                      Password baru minimal 8 karakter.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current_password">Password Saat Ini</Label>
                      <Input
                        id="current_password"
                        type="password"
                        value={pwData.current_password}
                        onChange={(e) => setPwData({ ...pwData, current_password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_password">Password Baru</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={pwData.new_password}
                        onChange={(e) => setPwData({ ...pwData, new_password: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_password_confirmation">Konfirmasi Password Baru</Label>
                      <Input
                        id="new_password_confirmation"
                        type="password"
                        value={pwData.new_password_confirmation}
                        onChange={(e) => setPwData({ ...pwData, new_password_confirmation: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={pwLoading}>
                      {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Simpan
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1200px] mx-auto space-y-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-slate-500">
                <span>{greeting.text},</span>
                <span className="font-bold text-emerald-600">{firstName}</span>
                <span>{greeting.icon}</span>
              </div>
              <p className="text-slate-400 text-sm">{formatDate()}</p>
            </div>

            {moduleCards.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Modul Akses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {moduleCards.map((mod) => (
                    <Link
                      key={mod.key}
                      href={mod.href}
                      className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50 p-5 hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className={cn("absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", mod.gradient)} />
                      <div className="relative z-10 flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", mod.iconBg)}>
                          {mod.renderIcon("w-6 h-6")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 group-hover:text-white transition-colors">{mod.label}</h3>
                          <p className="text-xs text-slate-500 group-hover:text-white/80 transition-colors">{mod.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                <TabsList>
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                      {tab.icon}
                      {tab.label}
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">{tab.badge}</Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="pinjaman" className="mt-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/50 overflow-hidden">
                    <div className="p-4 border-b border-slate-200/50 flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Cari barang..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <select
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value)}
                        className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm"
                      >
                        <option value="all">Semua Status</option>
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak Ringan</option>
                        <option value="rusak_berat">Rusak Berat</option>
                        <option value="overdue">Terlambat</option>
                      </select>
                    </div>

                    {paginatedAssets.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Tidak ada data pinjaman</p>
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-slate-100">
                          {paginatedAssets.map((asset) => (
                            <div key={asset.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">{asset.nama_barang}</p>
                                  <p className="text-xs text-slate-500">{asset.kode_barang} - NUP {asset.nup}</p>
                                  {asset.merk && <p className="text-xs text-slate-400">{asset.merk}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <Badge variant={new Date(asset.due_date) < new Date() ? "destructive" : "secondary"}>
                                    {new Date(asset.due_date) < new Date() ? 'Terlambat' : asset.status}
                                  </Badge>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Jatuh tempo: {new Date(asset.due_date).toLocaleDateString('id-ID')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div className="p-4 border-t border-slate-200/50 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                              Halaman {currentPage} dari {totalPages}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="aset" className="mt-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 text-center text-slate-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Data aset Anda akan muncul di sini</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveProfile}>
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
              <DialogDescription>
                Perbarui informasi profil Anda.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </RouteGuard>
  );
}
