"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes, LayoutGrid, Package, FileText, LogOut,
  Fingerprint, KeyRound, Loader2, BadgeCheck, Mail, Phone, Briefcase,
  HandHelping, Sun, Sunset, Moon, Pencil, Sparkles, Bell,
  Eye, Users, ClipboardList, Building2, List, Camera, Calendar,
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
import SuratTugasLetterPreview from "@/components/SuratTugasLetterPreview";
import { LeaveRequestDialog } from "./_components/LeaveRequestDialog";
import { FormulirCutiPrint, LeaveRequestPrintData } from "./_components/FormulirCutiPrint";
import { ProfileSidebar } from "./_components/ProfileSidebar";
import { SuratTugasTab } from "./_components/SuratTugasTab";
import { Printer, Plus } from "lucide-react";

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

interface DasarItem {
  id?: string;
  text: string;
}

interface SuratTugasDetail {
  id: string;
  nomor_surat: string | null;
  kode_surat: string | null;
  maksud_tujuan: string;
  tempat_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tanggal_surat: string | null;
  status: string;
  transportasi: string | null;
  sumber_dana: string | null;
  nama_plh: string | null;
  keterangan: string | null;
  dasar: DasarItem[] | string | null;
  menimbang: DasarItem[] | string | null;
  tembusan: string[] | null;
  employees?: Array<{
    id: string;
    nama_lengkap: string;
    nip: string;
    jabatan?: string;
    pivot?: { peran?: string };
  }>;
  approver?: { id: number; name: string; nip?: string };
}

type TabKey = "pinjaman" | "aset" | "surat_tugas" | "cuti";

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
  foto_geotag_url?: string | null;
  foto_geotag_path?: string | null;
}

function driveToThumbnail(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
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
  const [assetViewMode, setAssetViewMode] = useState<"list" | "grid">("list");

  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  // Surat Tugas inline preview state
  const [stPreviewOpen, setStPreviewOpen] = useState(false);
  const [stDetail, setStDetail] = useState<SuratTugasDetail | null>(null);
  const [stDetailLoading, setStDetailLoading] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwData, setPwData] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ email: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);

  const borrowedAssets = data?.my_assets;
  const filteredMyAssets = useMemo(() => {
    if (!borrowedAssets) return myAssets;
    const borrowedIds = new Set(borrowedAssets.map(a => String(a.id)));
    return myAssets.filter(a => !borrowedIds.has(a.id));
  }, [myAssets, borrowedAssets]);

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
      const resp = await api.get("/surat-tugas/my", { 
        params: { per_page: 20 } 
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

  const fetchSTDetail = useCallback(async (id: string) => {
    setStDetailLoading(true);
    try {
      const resp = await api.get(`/surat-tugas/my/${id}`);
      setStDetail(resp.data.data || resp.data);
      setStPreviewOpen(true);
    } catch {
      toast.error("Gagal memuat detail surat tugas.");
    } finally {
      setStDetailLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch surat tugas immediately when employee data is available
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data?.employee?.id) {
      fetchSuratTugas();
    }
  }, [data, fetchSuratTugas]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { 
    if (activeTab === "aset") fetchAssets();
  }, [activeTab, fetchAssets]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch leave balance for logged-in employee
  const currentYear = new Date().getFullYear();
  const [myLeaveBalance, setMyLeaveBalance] = useState<{ sisa_cuti_tersedia: number; total_hak_cuti: number } | null>(null);

  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [printLeaveData, setPrintLeaveData] = useState<LeaveRequestPrintData | null>(null);

  const fetchMyLeaveRequests = useCallback(async () => {
    try {
      const res = await api.get("/me/leave-requests");
      setMyLeaveRequests(res.data.data || []);
      if (data?.employee?.id) {
        const balRes = await api.get(`/kepegawaian/employees/${data.employee.id}/leaves?year=${currentYear}`);
        setMyLeaveBalance(balRes.data.data);
      }
    } catch (e) {}
  }, [data, currentYear]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchMyLeaveRequests();
  }, [fetchMyLeaveRequests]);
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

  const modules = useMemo(() => {
    if (!data) return [];
    return data.user.role === "super_admin" || (data.user.access_modules?.includes("*"))
      ? ["kepegawaian", "bmn", "inventory", "dereporting", "cms", "surat"]
      : (data.user.access_modules || []);
  }, [data]);

  const moduleCards = useMemo(() => {
    const all: { key: string; href: string; label: string; desc: string; icon: React.ReactNode; color: string; bg: string }[] = [
      { key: "kepegawaian", href: "/kepegawaian", label: "Kepegawaian", desc: "Surat Tugas & SDM", icon: <Users className="w-6 h-6" />, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
      { key: "bmn", href: "/bmn", label: "BMN", desc: "Barang Milik Negara", icon: <Package className="w-6 h-6" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
      { key: "inventory", href: "/inventory", label: "Persediaan", desc: "Stok & Distribusi", icon: <Boxes className="w-6 h-6" />, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-500/10" },
      { key: "dereporting", href: "/dereporting", label: "DeReporting", desc: "Pelaporan Digital", icon: <FileText className="w-6 h-6" />, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-500/10" },
      { key: "cms", href: "/cms", label: "CMS Portal", desc: "Manajemen Konten", icon: <LayoutGrid className="w-6 h-6" />, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-500/10" },
      { key: "surat", href: "/surat", label: "Persuratan", desc: "Surat & Disposisi", icon: <Mail className="w-6 h-6" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
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
    { key: "cuti", label: "Pengajuan Cuti Saya", icon: <Calendar className="w-4 h-4" />, count: myLeaveRequests.length },
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
          {/* Sidebar Profile */}
          <ProfileSidebar
            data={data}
            isActive={isActive}
            currentYear={currentYear}
            myLeaveBalance={myLeaveBalance}
            mobileProfileOpen={mobileProfileOpen}
            setMobileProfileOpen={setMobileProfileOpen}
            openEditDialog={openEditDialog}
            fetchDashboard={fetchDashboard}
            pwDialogOpen={pwDialogOpen}
            setPwDialogOpen={setPwDialogOpen}
            pwData={pwData}
            setPwData={setPwData}
            pwLoading={pwLoading}
            handleChangePassword={handleChangePassword}
          />

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
                      activeTab === tab.key ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {tab.icon} {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                        activeTab === tab.key ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}>
                        {tab.count}
                      </span>
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
                    <>
                      {/* View Switcher Header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Daftar Aset
                        </span>
                        <div className="flex items-center bg-slate-100 dark:bg-zinc-850 p-0.5 rounded-lg border border-slate-200/40 dark:border-zinc-700/40">
                          <button
                            onClick={() => setAssetViewMode("list")}
                            className={cn(
                              "p-1.5 rounded-md transition-all",
                              assetViewMode === "list"
                                ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                            title="Tampilan List"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssetViewMode("grid")}
                            className={cn(
                              "p-1.5 rounded-md transition-all",
                              assetViewMode === "grid"
                                ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                            title="Tampilan Grid"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {assetViewMode === "list" ? (
                        /* List View (Without Eye Button) */
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Grid View with Geotag Image */
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredMyAssets.map((asset) => {
                            const thumbUrl = asset.foto_geotag_path
                              ? asset.foto_geotag_path
                              : (asset.foto_geotag_url ? driveToThumbnail(asset.foto_geotag_url) : null);

                            return (
                              <div
                                key={`my-grid-${asset.id}`}
                                className="bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
                              >
                                {/* Photo Container */}
                                <div className="aspect-video relative bg-slate-200/50 dark:bg-slate-800/50 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center overflow-hidden shrink-0">
                                  {thumbUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={thumbUrl}
                                      alt={asset.nama_barang}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1.5 p-3 text-center text-slate-400 dark:text-slate-600">
                                      <Camera className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Belum ada foto</p>
                                    </div>
                                  )}
                                  {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                                    <span className="absolute top-2.5 right-2.5 text-[9px] px-2.5 py-0.5 rounded-full font-black bg-indigo-600 text-white shadow-sm border border-indigo-500/25 uppercase">
                                      {asset.no_polisi}
                                    </span>
                                  )}
                                </div>

                                {/* Card Details */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                      {asset.nama_barang}
                                    </p>
                                    {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                                      </p>
                                    )}
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-slate-155 dark:border-zinc-800/60 flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                                        {asset.kode_barang}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                                        NUP: {asset.nup}
                                      </span>
                                    </div>

                                    {asset.kondisi && (
                                      <span
                                        className={cn(
                                          "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                          asset.kondisi === "Baik"
                                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                                            : asset.kondisi === "Rusak Ringan"
                                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
                                            : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20"
                                        )}
                                      >
                                        {asset.kondisi}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab: Surat Tugas */}
              {activeTab === "surat_tugas" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                  <SuratTugasTab
                    stLoading={stLoading}
                    suratTugas={suratTugas}
                    fetchSTDetail={fetchSTDetail}
                    stDetailLoading={stDetailLoading}
                  />
                </div>
              )}
              {activeTab === "cuti" && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daftar Pengajuan Cuti Saya</h3>
                      <p className="text-xs text-slate-500">Ajukan permohonan cuti dan cetak formulir resmi BKSDA.</p>
                    </div>
                    <Button
                      onClick={() => setLeaveDialogOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-sm gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Ajukan Cuti Baru
                    </Button>
                  </div>

                  {myLeaveRequests.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl space-y-3">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Pengajuan Cuti</p>
                      <p className="text-xs text-slate-400">Klik tombol "Ajukan Cuti Baru" untuk mengisi formulir permohonan cuti.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myLeaveRequests.map((item) => (
                        <div key={item.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.jenis_cuti}</span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                (item.status === "DISETUJUI" || item.status_pertimbangan_atasan === "DISETUJUI")
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              )}>
                                {(item.status === "DISETUJUI" || item.status_pertimbangan_atasan === "DISETUJUI") ? "Disetujui" : "Pengajuan"}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              {item.jumlah_hari} Hari ({item.tanggal_mulai} s/d {item.tanggal_selesai})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Alasan: </span>
                            {item.alasan_cuti}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] text-slate-400">Pengajuan: {item.tanggal_pengajuan}</span>
                            <Button
                              size="sm"
                              onClick={() => {
                                setPrintLeaveData(item);
                                setTimeout(() => window.print(), 300);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Cetak Formulir Cuti
                            </Button>
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

        {/* Modal Pengajuan Cuti Mandiri */}
        <LeaveRequestDialog
          open={leaveDialogOpen}
          onClose={() => setLeaveDialogOpen(false)}
          onSuccess={() => fetchMyLeaveRequests()}
        />

        {/* Hidden Printable Formulir Cuti */}
        {printLeaveData && (
          <div className="hidden print:block">
            <FormulirCutiPrint data={printLeaveData} />
          </div>
        )}

        {/* Surat Tugas Formal Letter Preview */}
        {stPreviewOpen && stDetail && (
          <SuratTugasLetterPreview
            data={{
              id: stDetail.id,
              nomor_surat: stDetail.nomor_surat,
              kode_surat: stDetail.kode_surat,
              menimbang: stDetail.menimbang,
              dasar: stDetail.dasar,
              maksud_tujuan: stDetail.maksud_tujuan,
              tempat_tujuan: stDetail.tempat_tujuan,
              tanggal_mulai: stDetail.tanggal_mulai,
              tanggal_selesai: stDetail.tanggal_selesai,
              tanggal_surat: stDetail.tanggal_surat,
              sumber_dana: stDetail.sumber_dana,
              nama_plh: stDetail.nama_plh,
              status: stDetail.status,
              keterangan: stDetail.keterangan,
              tembusan: stDetail.tembusan,
              employees: stDetail.employees?.map(e => ({
                id: e.id,
                nama_lengkap: e.nama_lengkap,
                nip: e.nip,
                jabatan: e.jabatan,
                pivot: e.pivot,
              })),
              approver: stDetail.approver ? { name: stDetail.approver.name, nip: stDetail.approver.nip } : undefined,
            }}
            onClose={() => setStPreviewOpen(false)}
          />
        )}

        {/* Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-100">
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
