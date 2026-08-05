"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Sun, Sunset, Moon, Loader2, LogOut, Users, Package,
  Boxes, FileText, LayoutGrid, Mail, Sparkles, Bell,
  HandHelping, Briefcase, ClipboardList, Calendar,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth-store";
import SuratTugasLetterPreview from "@/components/SuratTugasLetterPreview";
import { LeaveRequestDialog } from "./_components/LeaveRequestDialog";
import { FormulirCutiPrint, LeaveRequestPrintData } from "./_components/FormulirCutiPrint";
import { ProfileSidebar } from "./_components/ProfileSidebar";
import { SuratTugasTab } from "./_components/SuratTugasTab";
import { MyAssetsTab, AssetItem } from "./_components/MyAssetsTab";
import { MyLeaveTab } from "./_components/MyLeaveTab";
import { ActiveLoansTab, BorrowedAssetItem } from "./_components/ActiveLoansTab";

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

  const filteredMyAssets = useMemo(() => {
    if (!data?.my_assets) return myAssets;
    const borrowedIds = new Set(data.my_assets.map(a => String(a.id)));
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
    if (data?.employee?.id) fetchAssets();
  }, [data?.employee?.id, activeTab, fetchAssets]);
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

  const fetchAllPortalData = useCallback(() => {
    fetchDashboard();
    fetchSuratTugas();
    fetchAssets();
    fetchMyLeaveRequests();
  }, [fetchDashboard, fetchSuratTugas, fetchAssets, fetchMyLeaveRequests]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllPortalData();
      }
    }, 15000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        fetchAllPortalData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchAllPortalData]);

  const handleLogout = () => { authStore.logout(); router.push("/login"); };

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
            fetchDashboard={fetchDashboard}
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
                  <ActiveLoansTab assets={data.my_assets as BorrowedAssetItem[]} />
                </div>
              )}

              {/* Tab: Aset Saya */}
              {activeTab === "aset" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                  <MyAssetsTab
                    assetsLoading={assetsLoading}
                    filteredMyAssets={filteredMyAssets as AssetItem[]}
                    assetViewMode={assetViewMode}
                    setAssetViewMode={setAssetViewMode}
                  />
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

              {/* Tab: Cuti Saya */}
              {activeTab === "cuti" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                  <MyLeaveTab
                    myLeaveRequests={myLeaveRequests}
                    onOpenLeaveDialog={() => setLeaveDialogOpen(true)}
                    onPrintLeave={(item) => {
                      setPrintLeaveData(item);
                      setTimeout(() => window.print(), 300);
                    }}
                  />
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
      </div>
    </RouteGuard>
  );
}
