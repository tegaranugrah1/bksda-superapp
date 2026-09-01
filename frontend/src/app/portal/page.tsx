"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Sun, Sunset, Moon, Loader2, LogOut, Users, Package,
  Boxes, FileText, LayoutGrid, Mail, Sparkles, Bell,
  HandHelping, Briefcase, ClipboardList, Calendar,
  ChevronDown, FileCheck, FileSpreadsheet, Banknote,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth-store";
import dynamic from "next/dynamic";
import type { LeaveRequestPrintData } from "./_components/FormulirCutiPrint";
import { SuratTugasTab } from "./_components/SuratTugasTab";
import { MyAssetsTab, AssetItem } from "./_components/MyAssetsTab";
import { MyLeaveTab } from "./_components/MyLeaveTab";
import { ActiveLoansTab, BorrowedAssetItem } from "./_components/ActiveLoansTab";
import { PortalProfileSidebar } from "./_components/PortalProfileSidebar";
import { PortalHeaderBanner } from "./_components/PortalHeaderBanner";
import { PortalQuickStats } from "./_components/PortalQuickStats";
import { PortalInfoSidebar } from "./_components/PortalInfoSidebar";

// Lazy-loaded heavy components for optimal initial bundle performance
const VisumSpdTab = dynamic(
  () => import("@/app/keuangan/_components/VisumSpdTab").then((mod) => mod.VisumSpdTab),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      </div>
    ),
  }
);

const SmartPatrolInlineForm = dynamic(
  () => import("./_components/SmartPatrolInlineForm").then((mod) => mod.SmartPatrolInlineForm),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    ),
  }
);

const GeneralReportInlineForm = dynamic(
  () => import("./_components/GeneralReportInlineForm").then((mod) => mod.GeneralReportInlineForm),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    ),
  }
);

const LeaveRequestDialog = dynamic(
  () => import("./_components/LeaveRequestDialog").then((mod) => mod.LeaveRequestDialog),
  { ssr: false }
);


const FormulirCutiPrint = dynamic(
  () => import("./_components/FormulirCutiPrint").then((mod) => mod.FormulirCutiPrint),
  { ssr: false }
);

const SuratTugasLetterPreview = dynamic(
  () => import("@/components/SuratTugasLetterPreview"),
  { ssr: false }
);

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

function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950">
      {/* HEADER NAVBAR SKELETON */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-1">
              <div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-20 h-2 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </header>

      {/* 3-COLUMN SKELETON */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row items-start gap-6">
        {/* Left column */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto animate-pulse" />
            <div className="space-y-2 text-center">
              <div className="w-36 h-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto animate-pulse" />
              <div className="w-24 h-3 bg-slate-100 dark:bg-slate-850 rounded mx-auto animate-pulse" />
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="w-full h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              <div className="w-full h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              <div className="w-full h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* Center column */}
        <main className="flex-1 min-w-0 space-y-6 w-full">
          {/* Banner skeleton */}
          <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 md:p-7 text-white shadow-md space-y-3 animate-pulse">
            <div className="w-32 h-4 bg-emerald-600/60 rounded" />
            <div className="w-64 h-7 bg-emerald-600/80 rounded" />
            <div className="w-96 max-w-full h-3 bg-emerald-600/50 rounded" />
          </div>

          {/* Quick stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm h-24 animate-pulse" />
            ))}
          </div>

          {/* Tabs skeleton */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 min-h-[300px]">
            <div className="w-48 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="w-full h-14 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="w-full h-14 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
          </div>
        </main>

        {/* Right column */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm h-64 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function PortalContent() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pinjaman");
  const [activeNavTab, setActiveNavTab] = useState<string>("dashboard");
  const [suratTugas, setSuratTugas] = useState<SuratTugasItem[]>([]);
  const [stLoading, setStLoading] = useState(false);
  
  // Aset states
  const [myAssets, setMyAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetViewMode, setAssetViewMode] = useState<"list" | "grid">("list");

  // Surat Tugas inline preview state
  const [stPreviewOpen, setStPreviewOpen] = useState(false);
  const [stDetail, setStDetail] = useState<SuratTugasDetail | null>(null);
  const [stDetailLoading, setStDetailLoading] = useState(false);

  // General Report Builder state
  const [inlineFormType, setInlineFormType] = useState<"general" | "smart_patrol" | null>(null);

  const filteredMyAssets = useMemo(() => {
    if (!data?.my_assets) return myAssets;
    const borrowedIds = new Set(data.my_assets.map(a => String(a.id)));
    return myAssets.filter(a => !borrowedIds.has(a.id));
  }, [myAssets, data]);

  const employeeId = data?.employee?.id;

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get("/me/dashboard");
      const resData = response.data?.data || response.data;
      if (resData) {
        setData(resData);
        try {
          localStorage.setItem("bksda_portal_dashboard_cache", JSON.stringify(resData));
        } catch {}
        if (resData.user) {
          const currentSnap = authStore.getSnapshot();
          const userStr = JSON.stringify(resData.user);
          if (!currentSnap.includes(userStr)) {
            authStore.updateUser(resData.user);
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) { router.push("/login"); }
      else { setFetchError("Gagal memuat data dashboard."); }
    } finally { setLoading(false); }
  }, [router]);

  const fetchSuratTugas = useCallback(async (targetEmpId?: number) => {
    const empId = targetEmpId ?? employeeId;
    if (!empId) {
      setSuratTugas([]);
      return;
    }
    try {
      const resp = await api.get("/surat-tugas/my", { 
        params: { per_page: 20 } 
      });
      setSuratTugas(resp.data.data || []);
    } catch {
      // Keep existing list on background error
    } finally {
      setStLoading(false);
    }
  }, [employeeId]);

  const fetchAssets = useCallback(async (targetEmpId?: number) => {
    const empId = targetEmpId ?? employeeId;
    if (!empId) {
      setMyAssets([]);
      return;
    }
    try {
      const respMy = await api.get("/bmn/assets", { params: { employee_id: empId, per_page: 50 } });
      setMyAssets(respMy.data.data || []);
    } catch {
      // Keep existing list on background error
    } finally {
      setAssetsLoading(false);
    }
  }, [employeeId]);

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

  // Fetch leave balance for logged-in employee
  const currentYear = new Date().getFullYear();
  const [myLeaveBalance, setMyLeaveBalance] = useState<{ sisa_cuti_tersedia: number; total_hak_cuti: number } | null>(null);

  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [printLeaveData, setPrintLeaveData] = useState<LeaveRequestPrintData | null>(null);

  const fetchMyLeaveRequests = useCallback(async (targetEmpId?: number) => {
    const empId = targetEmpId ?? employeeId;
    try {
      const res = await api.get("/me/leave-requests");
      setMyLeaveRequests(res.data.data || []);
      if (empId) {
        const balRes = await api.get(`/kepegawaian/employees/${empId}/leaves?year=${currentYear}`);
        setMyLeaveBalance(balRes.data.data);
      }
    } catch (e) {}
  }, [employeeId, currentYear]);

  // Initial dashboard load with fast cache populate
  useEffect(() => {
    try {
      const cached = localStorage.getItem("bksda_portal_dashboard_cache");
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}
    fetchDashboard();
  }, [fetchDashboard]);

  // Load details when employeeId becomes available
  useEffect(() => {
    if (employeeId) {
      fetchSuratTugas(employeeId);
      fetchAssets(employeeId);
      fetchMyLeaveRequests(employeeId);
    }
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable reference for 60-second background polling without dependency loop
  const fetchAllRef = useRef<() => void>(() => {});
  const lastFetchTimeRef = useRef<number>(0);
  const MIN_REFETCH_INTERVAL_MS = 30000; // Minimal jeda 30 detik antar event refetch

  useEffect(() => {
    fetchAllRef.current = () => {
      lastFetchTimeRef.current = Date.now();
      fetchDashboard();
      if (employeeId) {
        fetchSuratTugas(employeeId);
        fetchAssets(employeeId);
        fetchMyLeaveRequests(employeeId);
      }
    };
  }, [fetchDashboard, fetchSuratTugas, fetchAssets, fetchMyLeaveRequests, employeeId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllRef.current();
      }
    }, 60000);

    const handleFocus = () => {
      const now = Date.now();
      if (
        document.visibilityState === "visible" &&
        now - lastFetchTimeRef.current >= MIN_REFETCH_INTERVAL_MS
      ) {
        fetchAllRef.current();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/logout").catch(() => {});
    } finally {
      authStore.logout();
      window.location.href = "/login";
    }
  };

  const modules = useMemo(() => {
    if (!data) return [];
    return data.user.role === "super_admin" || (data.user.access_modules?.includes("*"))
      ? ["kepegawaian", "keuangan", "bmn", "inventory", "dereporting", "cms", "surat"]
      : (data.user.access_modules || []);
  }, [data]);

  const moduleCards = useMemo(() => {
    const all: { key: string; href: string; label: string; desc: string; icon: React.ReactNode; color: string; bg: string }[] = [
      { key: "kepegawaian", href: "/kepegawaian", label: "Kepegawaian", desc: "Surat Tugas & SDM", icon: <Users className="w-5 h-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60" },
      { key: "keuangan", href: "/keuangan", label: "Keuangan", desc: "SPJ & Visum SPD", icon: <Banknote className="w-5 h-5" />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60" },
      { key: "bmn", href: "/bmn", label: "BMN", desc: "Barang Milik Negara", icon: <Package className="w-5 h-5" />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
      { key: "inventory", href: "/inventory", label: "Persediaan", desc: "Stok & Distribusi", icon: <Boxes className="w-5 h-5" />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/60" },
      { key: "dereporting", href: "/dereporting", label: "DeReporting", desc: "Pelaporan Digital", icon: <FileText className="w-5 h-5" />, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/60" },
      { key: "cms", href: "/cms", label: "CMS Portal", desc: "Manajemen Konten", icon: <LayoutGrid className="w-5 h-5" />, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60" },
      { key: "surat", href: "/surat", label: "Persuratan", desc: "Surat & Disposisi", icon: <Mail className="w-5 h-5" />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
    ];
    return all.filter(m => modules.includes(m.key));
  }, [modules]);

  if (loading && !data) {
    return <PortalSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <p className="text-slate-700 dark:text-slate-300 font-bold mb-3">{fetchError || "Gagal memuat data"}</p>
        <Button onClick={fetchDashboard}>Coba Lagi</Button>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "pinjaman", label: "Pinjaman Aktif", icon: <HandHelping className="w-4 h-4" />, count: data.my_assets.length },
    { key: "aset", label: "Aset Saya", icon: <Briefcase className="w-4 h-4" />, count: filteredMyAssets.length },
    { key: "surat_tugas", label: "Surat Tugas", icon: <ClipboardList className="w-4 h-4" />, count: suratTugas.length },
    { key: "cuti", label: "Pengajuan Cuti Saya", icon: <Calendar className="w-4 h-4" />, count: myLeaveRequests.length },
  ];
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 print:bg-transparent">
        {/* HEADER NAVBAR */}
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm print:hidden">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <Image src="/logo_bksda.png" alt="Logo BKSDA" width={32} height={32} className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-none">BKSDA KALTIM</h1>
                <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">SuperApp Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
              </button>

              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {(data.employee?.name || data.user.name).charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {data.employee?.name || data.user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                    {data.employee?.position || data.user.role}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* 3-COLUMN HYBRID LAYOUT (MYASN INSPIRED) */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row items-start gap-6 print:p-0 print:m-0 print:block print:max-w-none">
          {/* LEFT COLUMN: SIDEBAR PROFIL & NAVIGASI */}
          <div className="w-full lg:w-72 shrink-0 print:hidden">
            <PortalProfileSidebar
              user={data.user}
              employee={data.employee}
              activeNavTab={activeNavTab}
              onSelectNavTab={(navTab) => {
                setInlineFormType(null);
                setActiveNavTab(navTab);
                if (navTab === "pinjaman" || navTab === "aset" || navTab === "surat_tugas" || navTab === "cuti") {
                  setActiveTab(navTab);
                }
              }}
              pinjamanCount={data.my_assets.length}
              assetCount={filteredMyAssets.length}
              suratTugasCount={suratTugas.length}
              leaveCount={myLeaveRequests.length}
              onOpenInlineReport={(type) => setInlineFormType(type)}
              isInlineReportOpen={inlineFormType !== null}
              onRefreshDashboard={fetchDashboard}
            />
          </div>

          {/* CENTER COLUMN: MAIN WORKSPACE OR SPECIFIC MENU ITEM */}
          <main className="flex-1 min-w-0 space-y-6 w-full print:m-0 print:p-0 print:space-y-0 print:block">
            {inlineFormType === "general" ? (
              <GeneralReportInlineForm
                onBack={() => {
                  setInlineFormType(null);
                  setActiveNavTab("dashboard");
                }}
              />
            ) : inlineFormType === "smart_patrol" ? (
              <SmartPatrolInlineForm
                onBack={() => {
                  setInlineFormType(null);
                  setActiveNavTab("dashboard");
                }}
              />
            ) : activeNavTab === "dashboard" ? (
              <>
                {/* HERO BANNER GREETING */}
                <PortalHeaderBanner
                  displayName={data.employee?.name || data.user.name}
                  activeSuratTugasCount={suratTugas.length}
                  onOpenVisum={() => {
                    setInlineFormType(null);
                    setActiveNavTab("visum");
                  }}
                />

                {/* QUICK STATS ROW (4 STATUS CARDS) */}
                <PortalQuickStats
                  rank={data.employee?.rank}
                  rankLevel={data.employee?.rank_level}
                  activeSuratTugasCount={suratTugas.length}
                  myAssetsCount={filteredMyAssets.length}
                  onSelectTab={(t) => {
                    setActiveTab(t);
                    setActiveNavTab(t);
                  }}
                />

                {/* MODUL AKSES GRID */}
                {moduleCards.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                        Modul Akses System
                      </h3>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                        {moduleCards.length} Modul Terotorisasi
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {moduleCards.map((mod) => (
                        <Link
                          key={mod.key}
                          href={mod.href}
                          className="group bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-center flex flex-col items-center justify-center space-y-2"
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", mod.bg, mod.color)}>
                            {mod.icon}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                              {mod.label}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[100px]">
                              {mod.desc}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : activeNavTab === "pinjaman" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                <ActiveLoansTab assets={data.my_assets as BorrowedAssetItem[]} />
              </div>
            ) : activeNavTab === "aset" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                <MyAssetsTab
                  assetsLoading={assetsLoading}
                  filteredMyAssets={filteredMyAssets as AssetItem[]}
                  assetViewMode={assetViewMode}
                  setAssetViewMode={setAssetViewMode}
                />
              </div>
            ) : activeNavTab === "surat_tugas" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                <SuratTugasTab
                  stLoading={stLoading}
                  suratTugas={suratTugas}
                  fetchSTDetail={fetchSTDetail}
                  stDetailLoading={stDetailLoading}
                  onOpenReportModal={(type) => setInlineFormType(type)}
                />
              </div>
            ) : activeNavTab === "cuti" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                <MyLeaveTab
                  myLeaveRequests={myLeaveRequests}
                  onOpenLeaveDialog={() => setLeaveDialogOpen(true)}
                  onPrintLeave={(item) => {
                    setPrintLeaveData(item);
                    setTimeout(() => window.print(), 300);
                  }}
                />
              </div>
            ) : activeNavTab === "visum" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm p-4 md:p-6">
                <VisumSpdTab isPortal={true} suratTugasList={suratTugas} />
              </div>
            ) : null}
          </main>

          {/* RIGHT COLUMN: WIDGET PENGUMUMAN & BANTUAN (Hidden on Visum tab to give full width) */}
          {activeNavTab !== "visum" && (
            <div className="shrink-0 print:hidden font-sans">
              <PortalInfoSidebar />
            </div>
          )}
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
  );
}

export default function PersonalDashboard() {
  return (
    <RouteGuard>
      <PortalContent />
    </RouteGuard>
  );
}
