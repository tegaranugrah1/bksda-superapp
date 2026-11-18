"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2, LogOut, Users, Package,
  Boxes, FileText, LayoutGrid, Mail, Banknote, Cloud, ShieldCheck,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api, clearGetCache } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth-store";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { LeaveRequestPrintData } from "./_components/FormulirCutiPrint";
import type { SuratTugasPreviewData } from "@/components/SuratTugasLetterPreview";
import { SuratTugasTab } from "./_components/SuratTugasTab";
import { MyAssetsTab, AssetItem } from "./_components/MyAssetsTab";
import { MyLeaveTab } from "./_components/MyLeaveTab";
import { ActiveLoansTab, BorrowedAssetItem } from "./_components/ActiveLoansTab";
import { PortalProfileSidebar } from "./_components/PortalProfileSidebar";
import { PortalHeaderBanner } from "./_components/PortalHeaderBanner";
import { PortalQuickStats } from "./_components/PortalQuickStats";
import { PortalInfoSidebar } from "./_components/PortalInfoSidebar";
import { NotificationBell, type PortalNotificationItem } from "./_components/NotificationBell";
import { EmailConnectDialog } from "./_components/EmailConnectDialog";
import { MandatoryChangePasswordModal, TwoFactorSetupModal } from "./_components/SecurityModals";

const VALID_PORTAL_TABS = ["dashboard", "pinjaman", "aset", "surat_tugas", "cuti", "visum", "kalkulator_dinas"];

const renderTabLoading = (color = "text-emerald-600") => function TabLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className={cn("h-6 w-6 animate-spin", color)} />
    </div>
  );
};

// Lazy-loaded heavy components for optimal initial bundle performance
const VisumSpdTab = dynamic(
  () => import("@/app/keuangan/_components/VisumSpdTab").then((mod) => mod.VisumSpdTab),
  { loading: renderTabLoading("text-amber-600") }
);

const KalkulatorDinasTab = dynamic(
  () => import("./_components/KalkulatorDinasTab").then((mod) => mod.KalkulatorDinasTab),
  { loading: renderTabLoading() }
);

const SmartPatrolInlineForm = dynamic(
  () => import("./_components/SmartPatrolInlineForm").then((mod) => mod.SmartPatrolInlineForm),
  { loading: renderTabLoading() }
);

const GeneralReportInlineForm = dynamic(
  () => import("./_components/GeneralReportInlineForm").then((mod) => mod.GeneralReportInlineForm),
  { loading: renderTabLoading() }
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
  user: {
    name: string;
    username: string;
    email: string | null;
    role: string;
    access_modules: string[];
    email_verified_at?: string | null;
    email_cooldown_remaining?: number;
  };
  employee: { id: number; nip: string; name: string; position: string; department: string; email: string | null; phone: string | null; photo: string | null; rank: string | null; rank_level: number; is_active: boolean } | null;
  my_assets: Array<{ id: number | string; [key: string]: unknown }> | BorrowedAssetItem[];
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

type SuratTugasDetail = SuratTugasPreviewData;




function PortalSkeleton() {
  return (
    <div data-module="portal" className="min-h-screen bg-[var(--ds-canvas)]">
      {/* HEADER NAVBAR SKELETON */}
      <header className="sticky top-0 z-50 bg-[var(--ds-surface)]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-zinc-800 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:grid sm:grid-cols-12 sm:gap-6">
          <div className="sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex items-center min-w-0">
            <div className="flex items-center gap-2 min-w-0 sm:pr-2 shrink-0">
              <div className="p-1 bg-white shadow-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg shrink-0">
                <Image src="/logo_bksda.png" alt="Logo BKSDA" width={28} height={28} className="w-7 h-7 object-contain" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[var(--ds-fg)] leading-tight truncate block">BKSDA KALTIM</span>
                <span className="text-xs font-bold text-[var(--ds-accent-fg)] leading-tight truncate block">SuperApp Portal</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 min-w-0 pl-3 border-l border-slate-200/70 dark:border-zinc-800 flex-1">
              <div className="p-1 bg-white shadow-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg shrink-0">
                <Image src="/kemenhutlogo.png" alt="Logo Kementerian Kehutanan" width={28} height={28} className="w-7 h-7 object-contain" />
              </div>
              <div className="min-w-0 flex flex-col justify-center leading-tight">
                <p className="text-xs font-bold text-[var(--ds-accent-fg)] uppercase tracking-tight truncate leading-tight">
                  Kementerian Kehutanan
                </p>
                <p className="hidden sm:block text-xs font-medium text-[var(--ds-fg-muted)] truncate leading-tight">
                  Balai KSDA Kalimantan Timur
                </p>
              </div>
            </div>
          </div>
          <div className="sm:col-span-6 lg:col-span-8 xl:col-span-9 2xl:col-span-9 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </header>

      {/* 3-COLUMN SKELETON */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex flex-col space-y-4">
          <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-zinc-800 mx-auto animate-pulse" />
            <div className="space-y-2 text-center">
              <div className="w-36 h-4 bg-slate-200 dark:bg-zinc-800 rounded-sm mx-auto animate-pulse" />
              <div className="w-24 h-3 bg-slate-100 dark:bg-zinc-800 rounded-sm mx-auto animate-pulse" />
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-200/70 dark:border-zinc-800">
              <div className="w-full h-10 bg-slate-100 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
              <div className="w-full h-10 bg-slate-100 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
              <div className="w-full h-10 bg-slate-100 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Center column */}
        <main className="col-span-1 lg:col-span-8 xl:col-span-9 2xl:col-span-6 space-y-6 w-full">
          {/* Banner skeleton */}
          <div className="rounded-3xl bg-linear-to-r from-[#1e5433] via-[#164227] to-[#153e24] p-6 text-white shadow-xs space-y-3 animate-pulse">
            <div className="w-32 h-4 bg-[#1e5433]/60 rounded-sm" />
            <div className="w-64 h-7 bg-[#1e5433]/80 rounded-sm" />
            <div className="w-96 max-w-full h-3 bg-[#1e5433]/50 rounded-sm" />
          </div>

          {/* Quick stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs h-24 animate-pulse" />
            ))}
          </div>

          {/* Tabs skeleton */}
          <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs p-6 min-h-75">
            <div className="w-48 h-5 bg-slate-200 dark:bg-zinc-800 rounded-sm animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="w-full h-14 bg-slate-100 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
              <div className="w-full h-14 bg-slate-100 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
            </div>
          </div>
        </main>

        {/* Right column */}
        <div className="hidden 2xl:block 2xl:col-span-3 space-y-6">
          <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs h-64 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const ALL_MODULE_CARDS = [
  { key: "kepegawaian", href: "/kepegawaian", label: "Kepegawaian", desc: "Surat Tugas & SDM", icon: Users, color: "text-[#2563eb] dark:text-blue-400", bg: "bg-[#eff6ff] dark:bg-blue-950/60", border: "border-[#dbeafe] dark:border-blue-900/40" },
  { key: "keuangan", href: "/keuangan", label: "Keuangan", desc: "SPJ & Visum SPD", icon: Banknote, color: "text-[#d97706] dark:text-amber-400", bg: "bg-[#fffbeb] dark:bg-amber-950/60", border: "border-[#fef3c7] dark:border-amber-900/40" },
  { key: "bmn", href: "/bmn", label: "BMN", desc: "Barang Milik Negara", icon: Package, color: "text-[#059669] dark:text-emerald-400", bg: "bg-[#ecfdf5] dark:bg-emerald-950/60", border: "border-[#d1fae5] dark:border-emerald-900/40" },
  { key: "inventory", href: "/inventory", label: "Persediaan", desc: "Stok ATK & Logistik", icon: Boxes, color: "text-[#ea580c] dark:text-orange-400", bg: "bg-[#fff7ed] dark:bg-orange-950/60", border: "border-[#ffedd5] dark:border-orange-900/40" },
  { key: "dereporting", href: "/dereporting", label: "DeReporting", desc: "Laporan & Patroli", icon: FileText, color: "text-[#9333ea] dark:text-purple-400", bg: "bg-[#faf5ff] dark:bg-purple-950/60", border: "border-[#f3e8ff] dark:border-purple-900/40" },
  { key: "cms", href: "/cms", label: "CMS Portal", desc: "Manajemen Konten", icon: LayoutGrid, color: "text-[#0d9488] dark:text-teal-400", bg: "bg-[#f0fdfa] dark:bg-teal-950/60", border: "border-[#ccfbf1] dark:border-teal-900/40" },
  { key: "surat", href: "/surat", label: "Persuratan", desc: "Naskah Dinas & Disposisi", icon: Mail, color: "text-[#0f766e] dark:text-teal-400", bg: "bg-[#f0fdfa] dark:bg-teal-950/60", border: "border-[#ccfbf1] dark:border-teal-900/40" },
  { key: "drive", href: "/drive", label: "BKSDA Drive", desc: "Cloud & Arsip Dokumen", icon: Cloud, color: "text-[#16a34a] dark:text-emerald-400", bg: "bg-[#f0fdf4] dark:bg-emerald-950/60", border: "border-[#dcfce7] dark:border-emerald-900/40" },
] as const;

function PortalContent() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeNavTab, setActiveNavTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("bksda_portal_nav_tab");
      if (savedTab && VALID_PORTAL_TABS.includes(savedTab)) {
        return savedTab;
      }
    }
    return "dashboard";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && activeNavTab) {
      localStorage.setItem("bksda_portal_nav_tab", activeNavTab);
    }
  }, [activeNavTab]);
  const [suratTugas, setSuratTugas] = useState<SuratTugasItem[]>([]);
  const [stLoading, setStLoading] = useState(false);
  
  // Aset states
  const [myAssets, setMyAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetViewMode, setAssetViewMode] = useState<"list" | "grid">("grid");
  const [assetViewToggled, setAssetViewToggled] = useState(false);
  const [loanViewMode, setLoanViewMode] = useState<"list" | "grid">("grid");
  const [loanViewToggled, setLoanViewToggled] = useState(false);

  // Surat Tugas inline preview state
  const [stPreviewOpen, setStPreviewOpen] = useState(false);
  const [stDetail, setStDetail] = useState<SuratTugasDetail | null>(null);
  const [stDetailLoading, setStDetailLoading] = useState(false);
  const stDetailRequestRef = useRef(0);

  // General Report Builder state
  const [inlineFormType, setInlineFormType] = useState<"general" | "smart_patrol" | null>(null);
  const [activeKalkulatorStId, setActiveKalkulatorStId] = useState<string>("");

  const filteredMyAssets = useMemo(() => {
    if (!data?.my_assets) return myAssets;
    const borrowedIds = new Set(data.my_assets.map(a => String(a.id)));
    return myAssets.filter(a => !borrowedIds.has(String(a.id)));
  }, [myAssets, data]);

  // Auto default view mode: "grid" jika <= 4 aset, "list" jika > 4 aset
  useEffect(() => {
    if (!assetViewToggled && !assetsLoading) {
      setAssetViewMode(filteredMyAssets.length <= 4 ? "grid" : "list");
    }
  }, [filteredMyAssets.length, assetsLoading, assetViewToggled]);

  useEffect(() => {
    if (!loanViewToggled && data?.my_assets) {
      setLoanViewMode(data.my_assets.length <= 4 ? "grid" : "list");
    }
  }, [data?.my_assets?.length, loanViewToggled]);

  const employeeId = data?.employee?.id;
  const isMmp = Boolean(data?.employee?.nip && data.employee.nip.toUpperCase().startsWith("MMP-"));

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get("/me/dashboard");
      const resData = response.data?.data || response.data;
      if (resData) {
        setData(resData);
        try {
          localStorage.setItem("bksda_portal_dashboard_cache", JSON.stringify(resData));
        } catch {}
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        router.push("/login");
      } else {
        setFetchError("Gagal memuat data dashboard.");
      }
    } finally {
      setLoading(false);
    }
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

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const respMy = await api.get("/me/assets");
      const list = respMy.data?.data ?? (Array.isArray(respMy.data) ? respMy.data : []);
      setMyAssets(list);
    } catch {
      // Keep existing list on background error
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  // Fetch assets whenever navigating to the 'aset' tab
  useEffect(() => {
    if (activeNavTab === "aset") {
      fetchAssets();
    }
  }, [activeNavTab, fetchAssets]);

  const fetchSTDetail = useCallback(async (id: string) => {
    const request = ++stDetailRequestRef.current;
    clearGetCache();
    setStDetail(null);
    setStPreviewOpen(false);
    setStDetailLoading(true);
    try {
      const resp = await api.get(`/surat-tugas/my/${encodeURIComponent(id)}`);
      if (request !== stDetailRequestRef.current) return;
      setStDetail(resp.data.data || resp.data);
      setStPreviewOpen(true);
    } catch (error) {
      if (request !== stDetailRequestRef.current) return;
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(status === 403 || status === 404
        ? "Surat tugas tidak tersedia atau tidak dapat diakses."
        : "Gagal memuat detail surat tugas.");
    } finally {
      if (request === stDetailRequestRef.current) setStDetailLoading(false);
    }
  }, []);

  const [activeLeaveId, setActiveLeaveId] = useState<string | number | null>(null);
  const consumeActiveLeave = useCallback(() => setActiveLeaveId(null), []);
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null);
  const [highlightedLoanId, setHighlightedLoanId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedAssetId && !highlightedLoanId) return;
    const timer = setTimeout(() => {
      setHighlightedAssetId(null);
      setHighlightedLoanId(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [highlightedAssetId, highlightedLoanId]);

  const handleNotificationNavigate = useCallback((tabKey: string, referenceId?: string | null) => {
    if (tabKey === "cuti" && !employeeId && data?.user?.role === "super_admin") {
      router.push("/kepegawaian/cuti");
      return;
    }

    const targetTab = VALID_PORTAL_TABS.includes(tabKey) ? tabKey : "dashboard";
    setActiveNavTab(targetTab);

    if (targetTab === "surat_tugas" && referenceId) {
      fetchSTDetail(referenceId);
    } else if (targetTab === "cuti" && referenceId) {
      setActiveLeaveId(referenceId);
    } else if (targetTab === "aset") {
      setHighlightedAssetId(referenceId ? String(referenceId) : null);
    } else if (targetTab === "pinjaman") {
      setHighlightedLoanId(referenceId ? String(referenceId) : null);
    }
  }, [fetchSTDetail, employeeId, data?.user?.role, router]);

  // Fetch leave balance for logged-in employee
  const currentYear = new Date().getFullYear();
  const [myLeaveBalance, setMyLeaveBalance] = useState<{ sisa_cuti_tersedia: number; total_hak_cuti: number } | null>(null);

  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [forcePasswordChangeOpen, setForcePasswordChangeOpen] = useState(false);
  const [setup2FaOpen, setSetup2FaOpen] = useState(false);
  const [printLeaveData, setPrintLeaveData] = useState<LeaveRequestPrintData | null>(null);
  const leavePrintRequestRef = useRef(0);

  const fetchMyLeaveRequests = useCallback(async () => {
    if (isMmp) {
      setMyLeaveRequests([]);
      setMyLeaveBalance(null);
      return;
    }
    try {
      const res = await api.get("/me/leave-requests");
      const list: LeaveRequestPrintData[] = res.data.data || [];
      setMyLeaveRequests(list);

      // Update saldo cuti
      const balRes = await api.get(`/me/leave-balance?year=${currentYear}`);
      setMyLeaveBalance(balRes.data.data);
    } catch (e) {}
  }, [currentYear, isMmp]);

  const handleLeaveUnavailable = useCallback(() => {
    clearGetCache();
    void fetchMyLeaveRequests();
  }, [fetchMyLeaveRequests]);

  const handlePrintLeave = useCallback(async (item: LeaveRequestPrintData) => {
    const request = ++leavePrintRequestRef.current;
    setPrintLeaveData(null);
    if (item.id == null) {
      toast.error("Permohonan cuti tidak tersedia atau tidak dapat diakses.");
      return;
    }
    clearGetCache();
    try {
      const response = await api.get(`/me/leave-requests/${encodeURIComponent(item.id)}`);
      if (request !== leavePrintRequestRef.current) return;
      setPrintLeaveData(response.data.data);
      setTimeout(() => { if (request === leavePrintRequestRef.current) window.print(); }, 300);
    } catch (error: unknown) {
      if (request !== leavePrintRequestRef.current) return;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        handleLeaveUnavailable();
        toast.info("Permohonan cuti ini sudah dihapus atau tidak lagi tersedia.");
      } else {
        toast.error("Permohonan cuti tidak tersedia atau tidak dapat diakses.");
      }
    }
  }, [handleLeaveUnavailable]);

  useEffect(() => {
    if (!printLeaveData) return;
    const handleAfterPrint = () => {
      setPrintLeaveData(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printLeaveData]);

  const handleNotificationChange = useCallback((item: PortalNotificationItem) => {
    if (item.type === "surat_tugas") {
      void fetchSuratTugas();
      if (stPreviewOpen && item.reference_id === String(stDetail?.id)) {
        void fetchSTDetail(item.reference_id);
      }
    } else if (item.type === "cuti") {
      clearGetCache();
      leavePrintRequestRef.current++;
      setPrintLeaveData(null);
      void fetchMyLeaveRequests();
    } else if (item.type === "bmn") {
      clearGetCache();
      void fetchAssets();
      void fetchDashboard();
    }
  }, [fetchSuratTugas, fetchSTDetail, fetchAssets, fetchDashboard, fetchMyLeaveRequests, stDetail?.id, stPreviewOpen]);

  const handleNotificationRefresh = useCallback(() => {
    if (stPreviewOpen && stDetail?.id) void fetchSTDetail(String(stDetail.id));
    if (activeNavTab === "cuti") void fetchMyLeaveRequests();
    if (activeNavTab === "aset" || activeNavTab === "pinjaman") {
      clearGetCache();
      void fetchAssets();
      void fetchDashboard();
    }
  }, [stPreviewOpen, stDetail, fetchSTDetail, activeNavTab, fetchMyLeaveRequests, fetchAssets, fetchDashboard]);

    // Initial dashboard load with fast cache populate (strictly validated to active user session)
  const initialFetchDoneRef = useRef(false);
  useEffect(() => {
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("email_verified") === "1") {
        toast.success("Selamat! Alamat email Anda berhasil diverifikasi. Notifikasi resmi dan pemulihan kata sandi kini aktif.");
        try { localStorage.removeItem("bksda_portal_dashboard_cache"); } catch {}
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (params.get("force_password_change") === "1") {
        setForcePasswordChangeOpen(true);
      }
      if (params.get("force_setup_2fa") === "1") {
        setSetup2FaOpen(true);
      }
    }

    try {
      const cachedStr = localStorage.getItem("bksda_portal_dashboard_cache");
      const currentStoredUser = localStorage.getItem("bksda_user");
      if (cachedStr && currentStoredUser) {
        const cached = JSON.parse(cachedStr);
        const currentUser = JSON.parse(currentStoredUser);
        if (cached?.user?.username && cached.user.username === currentUser?.username) {
          setData(cached);
          setLoading(false);
        }
      }
    } catch {}
    fetchDashboard();
  }, [fetchDashboard]);

  // Show welcome toast only once right after logging in to portal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const justLoggedIn = sessionStorage.getItem("just_logged_in");
      if (justLoggedIn === "true") {
        sessionStorage.removeItem("just_logged_in");
        const userName = data?.user?.name || "Super Admin System";
        toast.success(`Selamat datang kembali, ${userName}!`, {
          id: "welcome-toast",
        });
      }
    }
  }, [data?.user]);

  // Load details when employeeId becomes available
  useEffect(() => {
    if (employeeId) {
      fetchSuratTugas(employeeId);
      fetchAssets();
      fetchMyLeaveRequests();
    }
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Consolidated background polling & visibility synchronization
  const fetchAllRef = useRef<() => void>(() => {});
  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchAllRef.current = () => {
      lastFetchTimeRef.current = Date.now();
      fetchDashboard();
      if (employeeId) {
        fetchSuratTugas(employeeId);
        fetchAssets();
        fetchMyLeaveRequests();
      }
    };
  }, [fetchDashboard, fetchSuratTugas, fetchAssets, fetchMyLeaveRequests, employeeId]);

  // Cek apakah ada pengajuan cuti yang masih menunggu persetujuan (status: Pengajuan)
  const hasPendingLeave = useMemo(() => {
    return myLeaveRequests.some(
      (r) => (r.status || "").toUpperCase() === "PENGAJUAN"
    );
  }, [myLeaveRequests]);

  useEffect(() => {
    if (isMmp && activeNavTab === "cuti") {
      setActiveNavTab("dashboard");
    }
  }, [isMmp, activeNavTab]);

  // Smart Polling (15s saat ada pengajuan cuti pending, 60s default)
  useEffect(() => {
    const pollInterval = hasPendingLeave ? 15000 : 60000;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllRef.current();
      }
    }, pollInterval);

    const handleSync = () => {
      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastFetchTimeRef.current >= 20000) {
        fetchAllRef.current();
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [hasPendingLeave]);

  // Instant Cross-Tab Sync via BroadcastChannel (0ms latency, 0 beban server)
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("bksda_leave_sync");
    channel.onmessage = (event) => {
      if (event.data?.type === "LEAVE_STATUS_CHANGED") {
        fetchMyLeaveRequests();
        fetchDashboard();
      }
    };

    return () => {
      channel.close();
    };
  }, [fetchMyLeaveRequests, fetchDashboard]);

  const handleLogout = async () => {
    try {
      await api.post("/logout").catch(() => {});
    } finally {
      authStore.logout();
      window.location.href = "/login";
    }
  };

  const liveAccessKey = authUser
    ? `${authUser.username}|${authUser.role}|${(authUser.access_modules || []).join(",")}`
    : "";
  const prevAccessKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!liveAccessKey) return;
    if (prevAccessKeyRef.current === null) {
      prevAccessKeyRef.current = liveAccessKey;
      return;
    }
    if (prevAccessKeyRef.current !== liveAccessKey) {
      prevAccessKeyRef.current = liveAccessKey;
      clearGetCache();
      fetchDashboard();
    }
  }, [liveAccessKey, fetchDashboard]);

  const modules = useMemo(() => {
    if (!data) return [];
    const sameUser = authUser && authUser.username === data.user.username;
    const role = sameUser ? authUser.role : data.user.role;
    const accessModules = sameUser
      ? authUser.access_modules
      : data.user.access_modules;
    return role === "super_admin" || accessModules?.includes("*")
      ? ["kepegawaian", "keuangan", "bmn", "inventory", "dereporting", "cms", "surat", "drive"]
      : Array.from(new Set([...(accessModules || []), "drive"]));
  }, [data, authUser]);

  const moduleCards = useMemo(
    () => ALL_MODULE_CARDS.filter((m) => modules.includes(m.key)),
    [modules]
  );

  if (loading && !data) {
    return <PortalSkeleton />;
  }

  if (!data) {
    return (
      <div data-module="portal" className="flex h-screen w-full flex-col items-center justify-center bg-[var(--ds-canvas)]">
        <p className="text-[var(--ds-fg)] font-bold mb-3">{fetchError || "Gagal memuat data"}</p>
        <Button onClick={fetchDashboard} className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg">Coba Lagi</Button>
      </div>
    );
  }


  return (
    <div data-module="portal" className="min-h-screen bg-[var(--ds-canvas)] print:bg-transparent">
        {/* HEADER NAVBAR */}
        <header className="sticky top-0 z-50 bg-[var(--ds-surface)]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-zinc-800 shadow-xs print:hidden">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:grid sm:grid-cols-12 sm:gap-6">
            {/* BRANDING & LOGO KEMENHUT: EXACT CARD PROFILE WIDTH */}
            <div className="sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex items-center min-w-0">
              <div className="flex items-center gap-2 min-w-0 sm:pr-2 shrink-0">
                <div className="p-1 bg-white shadow-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg shrink-0">
                  <Image src="/logo_bksda.png" alt="Logo BKSDA" width={28} height={28} className="w-7 h-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[var(--ds-fg)] leading-tight truncate block">BKSDA KALTIM</span>
                  <span className="text-xs font-bold text-[var(--ds-accent-fg)] leading-tight truncate block">SuperApp Portal</span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 min-w-0 pl-3 border-l border-slate-200/70 dark:border-zinc-800 flex-1">
                <div className="p-1 bg-white shadow-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg shrink-0">
                  <Image src="/kemenhutlogo.png" alt="Logo Kementerian Kehutanan" width={28} height={28} className="w-7 h-7 object-contain" />
                </div>
                <div className="min-w-0 flex flex-col justify-center leading-tight">
                  <p className="text-xs font-bold text-[var(--ds-accent-fg)] uppercase tracking-tight truncate leading-tight">
                    Kementerian Kehutanan
                  </p>
                  <p className="hidden sm:block text-xs font-medium text-[var(--ds-fg-muted)] truncate leading-tight">
                    Balai KSDA Kalimantan Timur
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT ACTIONS: THEME, BELL, USER PILL, LOGOUT */}
            <div className="sm:col-span-6 lg:col-span-8 xl:col-span-9 2xl:col-span-9 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
              <ThemeToggle />
              <NotificationBell onSelectTab={handleNotificationNavigate} onNotification={handleNotificationChange} onRefresh={handleNotificationRefresh} />

              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200/70 dark:border-zinc-800 shrink-0">
                <div className="w-8 h-8 rounded-full bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)] font-bold text-xs shadow-xs">
                  {(data.employee?.name || data.user.name).charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-[var(--ds-fg)] leading-tight truncate max-w-45">
                    {data.employee?.name || data.user.name}
                  </p>
                  <p className="text-xs text-[var(--ds-fg-muted)] truncate max-w-45">
                    {data.employee?.position || data.user.role}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* UNIFIED 3-COLUMN LAYOUT FOR DASHBOARD & TAB WORKSPACES */}
          <div className={cn("max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:p-0 print:m-0 print:block print:max-w-none", printLeaveData && "print:hidden")}>
            {/* LEFT COLUMN: SIDEBAR PROFIL & NAVIGASI */}
            <div className="lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex flex-col print:hidden">
              <PortalProfileSidebar
                user={data.user}
                employee={data.employee}
                activeNavTab={activeNavTab}
                onSelectNavTab={(navTab) => {
                  setInlineFormType(null);
                  setActiveNavTab(navTab);
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

            {/* CENTER COLUMN: MAIN WORKSPACE */}
            <main className={cn(
              "min-w-0 space-y-6 w-full print:m-0 print:p-0 print:space-y-0 print:block",
              activeNavTab === "visum" || activeNavTab === "kalkulator_dinas"
                ? "col-span-1 lg:col-span-8 xl:col-span-9 2xl:col-span-9"
                : "col-span-1 lg:col-span-8 xl:col-span-9 2xl:col-span-6"
            )}>
              <EmailConnectDialog
                currentEmail={data.user.email}
                isVerified={Boolean(data.user.email_verified_at)}
                initialCooldown={data.user.email_cooldown_remaining || 0}
                onSuccess={fetchDashboard}
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={inlineFormType ? `inline-${inlineFormType}` : `tab-${activeNavTab}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full space-y-6"
                >
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
                    <div className="space-y-6">
                      <PortalHeaderBanner
                        displayName={data.employee?.name || data.user.name}
                        onOpenVisum={() => {
                          setInlineFormType(null);
                          setActiveNavTab("visum");
                        }}
                        onOpenKalkulator={() => {
                          setInlineFormType(null);
                          setActiveNavTab("kalkulator_dinas");
                        }}
                        className="min-h-[145px]"
                      />
                      <PortalQuickStats
                        rank={data.employee?.rank}
                        activeSuratTugasCount={suratTugas.length}
                        myAssetsCount={filteredMyAssets.length}
                        leaveBalance={myLeaveBalance}
                        year={currentYear}
                        onSelectTab={(t) => setActiveNavTab(t)}
                        isMmp={isMmp}
                      />
                      {moduleCards.length > 0 && (
                        <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
                            <h3 className="text-xs uppercase font-bold tracking-wider text-[var(--ds-fg-muted)]">
                              Modul Akses System
                            </h3>
                            <span className="text-xs font-semibold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-3 py-1 rounded-full border border-[var(--ds-accent-soft-border)] tabular-nums">
                              {moduleCards.length} Modul Terotorisasi
                            </span>
                          </div>

                          {moduleCards.length >= 4 ? (
                            /* FULL 8 MODUL GRID (4x2) */
                            <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-4 gap-4 flex-1 pt-4 items-stretch">
                              {moduleCards.map((mod) => (
                                <motion.div
                                  key={mod.key}
                                  whileHover={{ y: -4, transition: { type: "spring", stiffness: 420, damping: 20 } }}
                                  whileTap={{ scale: 0.97 }}
                                  className="h-full"
                                >
                                  <Link
                                    href={mod.href}
                                    className="group bg-[var(--ds-surface)] rounded-lg border border-slate-200/80 dark:border-zinc-800 p-4 hover:border-[var(--ds-border-control)] hover:bg-[var(--ds-surface-muted)] transition-colors text-center flex flex-col items-center justify-center space-y-2 h-full cursor-pointer"
                                  >
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 border", mod.bg, mod.color, (mod).border)}>
                                      <mod.icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1 w-full">
                                      <p className="text-xs font-bold text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors leading-tight truncate">
                                        {mod.label}
                                      </p>
                                      <p className="text-xs text-[var(--ds-fg-muted)] truncate w-full">
                                        {mod.desc}
                                      </p>
                                    </div>
                                  </Link>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            /* COMPACT ADAPTIVE GRID FOR FEW MODULES (<4) + SUBBAG TU ACCESS CARD */
                            <div className="flex-1 flex flex-col justify-between pt-4 gap-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {moduleCards.map((mod) => (
                                  <motion.div
                                    key={mod.key}
                                    whileHover={{ y: -3, transition: { type: "spring", stiffness: 420, damping: 20 } }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    <Link
                                      href={mod.href}
                                      className="group bg-[var(--ds-surface)] rounded-lg border border-slate-200/80 dark:border-zinc-800 p-4 hover:border-[var(--ds-border-control)] hover:bg-[var(--ds-surface-muted)] transition-colors flex items-center gap-3 cursor-pointer"
                                    >
                                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105 border shrink-0", mod.bg, mod.color, (mod).border)}>
                                        <mod.icon className="w-5 h-5" />
                                      </div>
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <p className="text-xs font-bold text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors leading-tight truncate">
                                          {mod.label}
                                        </p>
                                        <p className="text-xs text-[var(--ds-fg-muted)] truncate">
                                          {mod.desc}
                                        </p>
                                      </div>
                                      <span className="text-xs text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-accent-fg)] group-hover:translate-x-0.5 transition-all">
                                        →
                                      </span>
                                    </Link>
                                  </motion.div>
                                ))}
                              </div>

                              {/* ACCESS REQUEST CALLOUT TO SUBBAG TU */}
                              <div className="rounded-lg border border-dashed border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] shrink-0 mt-1">
                                    <ShieldCheck className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-[var(--ds-fg)]">
                                      Butuh Hak Akses ke Modul Lain?
                                    </p>
                                    <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-md leading-relaxed">
                                      Hak akses aplikasi Keuangan, BMN, atau Persuratan dikelola berbasis penugasan staf. Silakan ajukan izin ke Subbag Tata Usaha.
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href="mailto:tu.bksdakaltim@ksdae.go.id?subject=Permohonan%20Akses%20Modul%20SuperApp"
                                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] shadow-xs transition-colors"
                                >
                                  <Mail className="w-4 h-4" />
                                  <span>Ajukan ke TU</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : activeNavTab === "pinjaman" ? (
                    <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
                      <ActiveLoansTab
                        assets={data.my_assets as BorrowedAssetItem[]}
                        highlightedId={highlightedLoanId}
                        viewMode={loanViewMode}
                        setViewMode={(mode) => {
                          setLoanViewToggled(true);
                          setLoanViewMode(mode);
                        }}
                      />
                    </div>
                  ) : activeNavTab === "aset" ? (
                    <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
                      <MyAssetsTab
                        assetsLoading={assetsLoading}
                        filteredMyAssets={filteredMyAssets as AssetItem[]}
                        highlightedId={highlightedAssetId}
                        assetViewMode={assetViewMode}
                        setAssetViewMode={(mode) => {
                          setAssetViewToggled(true);
                          setAssetViewMode(mode);
                        }}
                      />
                    </div>
                  ) : activeNavTab === "surat_tugas" ? (
                    <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
                      <SuratTugasTab
                        stLoading={stLoading}
                        suratTugas={suratTugas}
                        fetchSTDetail={fetchSTDetail}
                        stDetailLoading={stDetailLoading}
                        onOpenReportModal={(type) => setInlineFormType(type)}
                        onOpenKalkulator={(stId) => {
                          setInlineFormType(null);
                          setActiveKalkulatorStId(stId);
                          setActiveNavTab("kalkulator_dinas");
                        }}
                      />
                    </div>
                  ) : activeNavTab === "cuti" ? (
                    <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
                      <MyLeaveTab
                        myLeaveRequests={myLeaveRequests}
                        activeLeaveId={activeLeaveId}
                        onOpenLeaveDialog={() => setLeaveDialogOpen(true)}
                        onCancelLeave={async (id) => {
                          if (!confirm("Apakah Anda yakin ingin membatalkan permohonan cuti ini?")) return;
                          try {
                            await api.delete(`/me/leave-requests/${id}`);
                            toast.success("Permohonan cuti berhasil dibatalkan.");
                            fetchMyLeaveRequests();
                          } catch (error: unknown) {
                            const err = error as { response?: { data?: { message?: string } } };
                            toast.error(err.response?.data?.message || "Gagal membatalkan permohonan cuti.");
                          }
                        }}
                        onPrintLeave={handlePrintLeave}
                        onConsumeActiveLeave={consumeActiveLeave}
                        onLeaveUnavailable={handleLeaveUnavailable}
                      />
                    </div>
                  ) : activeNavTab === "visum" ? (
                    <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs p-4 md:p-6">
                      <VisumSpdTab isPortal={true} suratTugasList={suratTugas} />
                    </div>
                  ) : activeNavTab === "kalkulator_dinas" ? (
                    <div className="bg-[var(--ds-surface)] rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs p-4 md:p-6 print:p-0 print:border-none print:shadow-none print:bg-transparent print:rounded-none">
                      <KalkulatorDinasTab
                        suratTugasList={suratTugas}
                        currentUserName={data.employee?.name || data.user.name}
                        initialSelectedStId={activeKalkulatorStId}
                      />
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* RIGHT COLUMN: WIDGET PENGUMUMAN & BANTUAN */}
            {activeNavTab !== "visum" && activeNavTab !== "kalkulator_dinas" && (
              <>
                <div className="hidden 2xl:block 2xl:col-span-3 shrink-0 print:hidden font-sans">
                  <PortalInfoSidebar onOpenReport={() => setInlineFormType("general")} />
                </div>
                <div className="col-span-1 lg:col-span-12 block 2xl:hidden pt-1 print:hidden">
                  <PortalInfoSidebar isHorizontal={true} onOpenReport={() => setInlineFormType("general")} />
                </div>
              </>
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
            data={stDetail}
            onClose={() => setStPreviewOpen(false)}
          />
        )}

        {/* SECURITY GATES (FASE 1C) */}
        <MandatoryChangePasswordModal
          open={forcePasswordChangeOpen}
          onSuccess={() => {
            setForcePasswordChangeOpen(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchDashboard();
          }}
        />
        <TwoFactorSetupModal
          open={setup2FaOpen}
          onOpenChange={setSetup2FaOpen}
          onSuccess={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchDashboard();
          }}
        />
      </div>
  );
}

export default function PersonalDashboard() {
  const { user } = useAuth();
  return (
    <RouteGuard>
      <PortalContent key={user?.id ?? "guest"} />
    </RouteGuard>
  );
}
