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
    <div className="min-h-screen bg-[#edf3ee] dark:bg-slate-950">
      {/* HEADER NAVBAR SKELETON */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-[#dce8dd] dark:border-slate-800 shadow-sm">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-12 gap-6 items-center">
          <div className="col-span-8 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex items-center min-w-0">
            <div className="flex items-center gap-2 min-w-0 pr-2 shrink-0">
              <div className="p-1 bg-white dark:bg-slate-900 shadow-sm border border-[#dce8dd] dark:border-slate-800 rounded-lg shrink-0">
                <Image src="/logo_bksda.png" alt="Logo BKSDA" width={28} height={28} className="w-7 h-7 object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-none truncate">BKSDA KALTIM</h1>
                <p className="text-[8.5px] sm:text-[9px] font-bold text-[#1e5433] dark:text-emerald-400 uppercase tracking-wider mt-0.5 truncate">SuperApp Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0 pl-2.5 sm:pl-3 border-l border-[#dce8dd] dark:border-slate-800 flex-1">
              <div className="p-1 bg-white dark:bg-slate-900 shadow-sm border border-[#dce8dd] dark:border-slate-800 rounded-lg shrink-0">
                <Image src="/kemenhutlogo.png" alt="Logo Kementerian Kehutanan" width={28} height={28} className="w-7 h-7 object-contain" />
              </div>
              <div className="min-w-0 flex flex-col justify-center leading-tight">
                <p className="text-[9px] sm:text-[9.5px] font-extrabold text-[#1e5433] dark:text-emerald-400 uppercase tracking-tight truncate leading-tight">
                  KEMENTERIAN KEHUTANAN
                </p>
                <p className="text-[7px] sm:text-[7.5px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter truncate leading-tight mt-0.5">
                  BALAI KONSERVASI SUMBER DAYA ALAM
                </p>
                <p className="text-[6.5px] sm:text-[7px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-tight">
                  KALIMANTAN TIMUR
                </p>
              </div>
            </div>
          </div>
          <div className="col-span-4 sm:col-span-6 lg:col-span-8 xl:col-span-9 2xl:col-span-9 flex items-center justify-end gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </header>

      {/* 3-COLUMN SKELETON */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex flex-col space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 p-6 space-y-4 shadow-sm">
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
        <main className="col-span-1 lg:col-span-8 xl:col-span-9 2xl:col-span-6 space-y-6 w-full">
          {/* Banner skeleton */}
          <div className="rounded-3xl bg-linear-to-r from-[#1e5433] via-[#164227] to-[#153e24] p-6 md:p-7 text-white shadow-md space-y-3 animate-pulse">
            <div className="w-32 h-4 bg-[#1e5433]/60 rounded" />
            <div className="w-64 h-7 bg-[#1e5433]/80 rounded" />
            <div className="w-96 max-w-full h-3 bg-[#1e5433]/50 rounded" />
          </div>

          {/* Quick stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-4 shadow-sm h-24 animate-pulse" />
            ))}
          </div>

          {/* Tabs skeleton */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 shadow-sm p-6 min-h-75">
            <div className="w-48 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="w-full h-14 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="w-full h-14 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
          </div>
        </main>

        {/* Right column */}
        <div className="hidden 2xl:block 2xl:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 p-6 shadow-sm h-64 animate-pulse" />
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
  { key: "surat", href: "/surat", label: "Persuratan", desc: "Naskah Dinas & Disposisi", icon: Mail, color: "text-[#4f46e5] dark:text-indigo-400", bg: "bg-[#eef2ff] dark:bg-indigo-950/60", border: "border-[#e0e7ff] dark:border-indigo-900/40" },
  { key: "drive", href: "/drive", label: "BKSDA Drive", desc: "Cloud & Arsip Dokumen", icon: Cloud, color: "text-[#16a34a] dark:text-emerald-400", bg: "bg-[#f0fdf4] dark:bg-emerald-950/60", border: "border-[#dcfce7] dark:border-emerald-900/40" },
] as const;

function PortalContent() {
  const router = useRouter();
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

  const handleNotificationNavigate = useCallback((tabKey: string, referenceId?: string | null) => {
    const targetTab = VALID_PORTAL_TABS.includes(tabKey) ? tabKey : "dashboard";
    setActiveNavTab(targetTab);

    if (targetTab === "surat_tugas" && referenceId) {
      fetchSTDetail(referenceId);
    } else if (targetTab === "cuti" && referenceId) {
      setActiveLeaveId(referenceId);
    }
  }, [fetchSTDetail]);

  // Fetch leave balance for logged-in employee
  const currentYear = new Date().getFullYear();
  const [myLeaveBalance, setMyLeaveBalance] = useState<{ sisa_cuti_tersedia: number; total_hak_cuti: number } | null>(null);

  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [forcePasswordChangeOpen, setForcePasswordChangeOpen] = useState(false);
  const [setup2FaOpen, setSetup2FaOpen] = useState(false);
  const [printLeaveData, setPrintLeaveData] = useState<LeaveRequestPrintData | null>(null);
  const leavePrintRequestRef = useRef(0);
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
    } catch {
      if (request === leavePrintRequestRef.current) toast.error("Permohonan cuti tidak tersedia atau tidak dapat diakses.");
    }
  }, []);


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

  const handleNotificationChange = useCallback((item: PortalNotificationItem) => {
    if (item.type === "surat_tugas") {
      void fetchSuratTugas();
      if (stPreviewOpen && item.reference_id === String(stDetail?.id)) {
        void fetchSTDetail(item.reference_id);
      }
    } else if (item.type === "cuti") {
      leavePrintRequestRef.current++;
      setPrintLeaveData(null);
      void fetchMyLeaveRequests();
    } else if (item.type === "bmn") {
      void fetchAssets();
    }
  }, [fetchSuratTugas, fetchSTDetail, fetchAssets, fetchMyLeaveRequests, stDetail?.id, stPreviewOpen]);

  const handleNotificationRefresh = useCallback(() => {
    if (stPreviewOpen && stDetail?.id) void fetchSTDetail(String(stDetail.id));
    if (activeNavTab === "cuti") void fetchMyLeaveRequests();
    if (activeNavTab === "aset" || activeNavTab === "pinjaman") void fetchAssets();
  }, [stPreviewOpen, stDetail, fetchSTDetail, activeNavTab, fetchMyLeaveRequests, fetchAssets]);

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

  const modules = useMemo(() => {
    if (!data) return [];
    return data.user.role === "super_admin" || (data.user.access_modules?.includes("*"))
      ? ["kepegawaian", "keuangan", "bmn", "inventory", "dereporting", "cms", "surat", "drive"]
      : Array.from(new Set([...(data.user.access_modules || []), "drive"]));
  }, [data]);

  const moduleCards = useMemo(
    () => ALL_MODULE_CARDS.filter((m) => modules.includes(m.key)),
    [modules]
  );

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


  return (
    <div className="min-h-screen bg-[#edf3ee] dark:bg-slate-950 print:bg-transparent">
        {/* HEADER NAVBAR */}
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-[#dce8dd] dark:border-slate-800 shadow-sm print:hidden">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-12 gap-6 items-center">
            {/* BRANDING & LOGO KEMENHUT: EXACT CARD PROFILE WIDTH */}
            <div className="col-span-8 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3 flex items-center min-w-0">
              <div className="flex items-center gap-2 min-w-0 pr-2 shrink-0">
                <div className="p-1 bg-white dark:bg-slate-900 shadow-sm border border-[#dce8dd] dark:border-slate-800 rounded-lg shrink-0">
                  <Image src="/logo_bksda.png" alt="Logo BKSDA" width={28} height={28} className="w-7 h-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-none truncate">BKSDA KALTIM</h1>
                  <p className="text-[8.5px] sm:text-[9px] font-bold text-[#1e5433] dark:text-emerald-400 uppercase tracking-wider mt-0.5 truncate">SuperApp Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0 pl-2.5 sm:pl-3 border-l border-[#dce8dd] dark:border-slate-800 flex-1">
                <div className="p-1 bg-white dark:bg-slate-900 shadow-sm border border-[#dce8dd] dark:border-slate-800 rounded-lg shrink-0">
                  <Image src="/kemenhutlogo.png" alt="Logo Kementerian Kehutanan" width={28} height={28} className="w-7 h-7 object-contain" />
                </div>
                <div className="min-w-0 flex flex-col justify-center leading-tight">
                  <p className="text-[9px] sm:text-[9.5px] font-extrabold text-[#1e5433] dark:text-emerald-400 uppercase tracking-tight truncate leading-tight">
                    KEMENTERIAN KEHUTANAN
                  </p>
                  <p className="text-[7px] sm:text-[7.5px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter truncate leading-tight mt-0.5">
                    BALAI KONSERVASI SUMBER DAYA ALAM
                  </p>
                  <p className="text-[6.5px] sm:text-[7px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-tight">
                    KALIMANTAN TIMUR
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT ACTIONS: THEME, BELL, USER PILL, LOGOUT */}
            <div className="col-span-4 sm:col-span-6 lg:col-span-8 xl:col-span-9 2xl:col-span-9 flex items-center justify-end gap-3 min-w-0">
              <ThemeToggle />
              <NotificationBell onSelectTab={handleNotificationNavigate} onNotification={handleNotificationChange} onRefresh={handleNotificationRefresh} />

              <div className="flex items-center gap-2 pl-3 border-l border-[#dce8dd] dark:border-slate-800 shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#1e5433] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {(data.employee?.name || data.user.name).charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-45">
                    {data.employee?.name || data.user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-45">
                    {data.employee?.position || data.user.role}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
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
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                          <div className="flex items-center justify-between pb-3 border-b border-[#edf3ee] dark:border-slate-800">
                            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                              Modul Akses System
                            </h3>
                            <span className="text-[10px] font-semibold text-[#1e5433] dark:text-emerald-300 bg-[#dff0e2] dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-[#dce8dd] dark:border-emerald-800/40">
                              {moduleCards.length} Modul Terotorisasi
                            </span>
                          </div>

                          {moduleCards.length >= 4 ? (
                            /* FULL 8 MODUL GRID (4x2) */
                            <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-4 gap-2.5 sm:gap-3 flex-1 pt-3 items-stretch">
                              {moduleCards.map((mod) => (
                                <motion.div
                                  key={mod.key}
                                  whileHover={{ y: -4, transition: { type: "spring", stiffness: 420, damping: 20 } }}
                                  whileTap={{ scale: 0.97 }}
                                  className="h-full"
                                >
                                  <Link
                                    href={mod.href}
                                    className="group bg-white dark:bg-slate-800/60 rounded-xl border border-[#dce8dd] dark:border-slate-800 p-2.5 sm:p-3 hover:shadow-sm hover:border-[#1e5433]/40 dark:hover:border-emerald-700 hover:bg-[#edf3ee]/40 transition-all duration-200 text-center flex flex-col items-center justify-center space-y-1.5 h-full cursor-pointer"
                                  >
                                    <div className={cn("w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:shadow-xs border", mod.bg, mod.color, (mod).border)}>
                                      <mod.icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 w-full">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1e5433] dark:group-hover:text-emerald-400 transition-colors leading-tight truncate">
                                        {mod.label}
                                      </p>
                                      <p className="text-[10px] text-slate-400 truncate w-full">
                                        {mod.desc}
                                      </p>
                                    </div>
                                  </Link>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            /* COMPACT ADAPTIVE GRID FOR FEW MODULES (<4) + SUBBAG TU ACCESS CARD */
                            <div className="flex-1 flex flex-col justify-between pt-3 gap-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {moduleCards.map((mod) => (
                                  <motion.div
                                    key={mod.key}
                                    whileHover={{ y: -3, transition: { type: "spring", stiffness: 420, damping: 20 } }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    <Link
                                      href={mod.href}
                                      className="group bg-white dark:bg-slate-800/60 rounded-xl border border-[#dce8dd] dark:border-slate-800 p-3.5 hover:shadow-sm hover:border-[#1e5433]/40 dark:hover:border-emerald-700 hover:bg-[#edf3ee]/40 transition-all duration-200 flex items-center gap-3 cursor-pointer"
                                    >
                                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xs border shrink-0", mod.bg, mod.color, (mod).border)}>
                                        <mod.icon className="w-5 h-5" />
                                      </div>
                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1e5433] dark:group-hover:text-emerald-400 transition-colors leading-tight truncate">
                                          {mod.label}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate">
                                          {mod.desc}
                                        </p>
                                      </div>
                                      <span className="text-xs text-slate-400 group-hover:text-[#1e5433] group-hover:translate-x-0.5 transition-all">
                                        →
                                      </span>
                                    </Link>
                                  </motion.div>
                                ))}
                              </div>

                              {/* ACCESS REQUEST CALLOUT TO SUBBAG TU */}
                              <div className="rounded-xl border border-dashed border-[#dce8dd] dark:border-slate-800 bg-[#edf3ee]/50 dark:bg-slate-800/40 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 text-[#1e5433] dark:text-emerald-400 border border-[#dce8dd] dark:border-slate-800 shrink-0 mt-0.5">
                                    <ShieldCheck className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      Butuh Hak Akses ke Modul Lain?
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-md leading-relaxed">
                                      Hak akses aplikasi Keuangan, BMN, atau Persuratan dikelola berbasis penugasan staf. Silakan ajukan izin ke Subbag Tata Usaha.
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href="mailto:tu.bksdakaltim@ksdae.go.id?subject=Permohonan%20Akses%20Modul%20SuperApp"
                                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e5433] hover:bg-[#164227] text-white shadow-2xs transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Ajukan ke TU</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : activeNavTab === "pinjaman" ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm">
                      <ActiveLoansTab
                        assets={data.my_assets as BorrowedAssetItem[]}
                        viewMode={loanViewMode}
                        setViewMode={(mode) => {
                          setLoanViewToggled(true);
                          setLoanViewMode(mode);
                        }}
                      />
                    </div>
                  ) : activeNavTab === "aset" ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm">
                      <MyAssetsTab
                        assetsLoading={assetsLoading}
                        filteredMyAssets={filteredMyAssets as AssetItem[]}
                        assetViewMode={assetViewMode}
                        setAssetViewMode={(mode) => {
                          setAssetViewToggled(true);
                          setAssetViewMode(mode);
                        }}
                      />
                    </div>
                  ) : activeNavTab === "surat_tugas" ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm">
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm">
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
                      />
                    </div>
                  ) : activeNavTab === "visum" ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-4 md:p-6">
                      <VisumSpdTab isPortal={true} suratTugasList={suratTugas} />
                    </div>
                  ) : activeNavTab === "kalkulator_dinas" ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-4 md:p-6 print:p-0 print:border-none print:shadow-none print:bg-transparent print:rounded-none">
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
