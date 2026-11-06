"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2, Users, Package, Boxes, FileText, LayoutGrid, Mail, Banknote,
  Search, HelpCircle, Cloud,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api, getApiSessionSnapshot } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth-store";
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
import { NotificationBell } from "./_components/NotificationBell";
import { EmailConnectDialog } from "./_components/EmailConnectDialog";
import { MandatoryChangePasswordModal, TwoFactorSetupModal } from "./_components/SecurityModals";

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

const KalkulatorDinasTab = dynamic(
  () => import("./_components/KalkulatorDinasTab").then((mod) => mod.KalkulatorDinasTab),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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
  user: {
    name: string;
    username: string;
    email: string | null;
    role: string;
    access_modules: string[];
    email_verified_at?: string | null;
    email_cooldown_remaining?: number;
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
  my_assets: BorrowedAssetItem[];
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
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#dce8dd] dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-1">
              <div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </header>

      {/* SKELETON BODY */}
      <main className="max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 p-6 space-y-4 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto animate-pulse" />
              <div className="space-y-2 text-center">
                <div className="w-36 h-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto animate-pulse" />
                <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800 rounded mx-auto animate-pulse" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 p-4 space-y-2 shadow-sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-full h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Center/Right column */}
          <div className="lg:col-span-9 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 rounded-2xl bg-[#1e5433]/80 p-6 shadow-sm h-64 animate-pulse" />
              <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#dce8dd] dark:border-slate-800 p-6 shadow-sm h-64 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dce8dd] dark:border-slate-800 p-4 shadow-xs h-20 animate-pulse" />
              ))}
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 p-6 shadow-sm h-72 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}

const ALL_MODULE_CARDS = [
  {
    key: "kepegawaian",
    href: "/kepegawaian",
    label: "Kepegawaian",
    desc: "Surat Tugas, Cuti Pegawai & SK Balai",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/60",
    border: "border-blue-100 dark:border-blue-900/40",
  },
  {
    key: "keuangan",
    href: "/keuangan",
    label: "Keuangan",
    desc: "SPJ & Visum SPD, Biaya Riil Dinas",
    icon: Banknote,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/60",
    border: "border-amber-100 dark:border-amber-900/40",
  },
  {
    key: "bmn",
    href: "/bmn",
    label: "BMN",
    desc: "Barang Milik Negara & Aset Inventaris",
    icon: Package,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    border: "border-emerald-100 dark:border-emerald-900/40",
  },
  {
    key: "inventory",
    href: "/inventory",
    label: "Persediaan",
    desc: "Stok ATK, Logistik & Distribusi Lapangan",
    icon: Boxes,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/60",
    border: "border-orange-100 dark:border-orange-900/40",
  },
  {
    key: "dereporting",
    href: "/dereporting",
    label: "DeReporting",
    desc: "Pelaporan Digital Konservasi & Patroli",
    icon: FileText,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/60",
    border: "border-purple-100 dark:border-purple-900/40",
  },
  {
    key: "cms",
    href: "/cms",
    label: "CMS Portal",
    desc: "Manajemen Konten Publik & Informasi Balai",
    icon: LayoutGrid,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/60",
    border: "border-teal-100 dark:border-teal-900/40",
  },
  {
    key: "surat",
    href: "/surat",
    label: "Persuratan",
    desc: "Naskah Dinas Elektronik & Disposisi",
    icon: Mail,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    border: "border-indigo-100 dark:border-indigo-900/40",
  },
  {
    key: "drive",
    href: "/drive",
    label: "BKSDA Drive",
    desc: "Penyimpanan Cloud & Arsip Berkas Dokumen",
    icon: Cloud,
    color: "text-[#1e5433] dark:text-emerald-400",
    bg: "bg-[#e4f0e6] dark:bg-emerald-950/60",
    border: "border-[#dce8dd] dark:border-emerald-800/40",
  },
] as const;

function PortalContent() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeNavTab, setActiveNavTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("bksda_portal_nav_tab");
      if (
        savedTab &&
        ["dashboard", "pinjaman", "aset", "surat_tugas", "cuti", "visum", "kalkulator_dinas"].includes(savedTab)
      ) {
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

  // Keyboard shortcut Ctrl+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // WITA Clock (UTC+8)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("10:45");
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeFormatter = new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Makassar",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setCurrentTimeStr(timeFormatter.format(new Date()));
      } catch {
        // Fallback
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

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
  const [activeKalkulatorStId, setActiveKalkulatorStId] = useState<string>("");

  const filteredMyAssets = useMemo(() => {
    if (!data?.my_assets) return myAssets;
    const borrowedIds = new Set(data.my_assets.map((a) => String(a.id)));
    return myAssets.filter((a) => !borrowedIds.has(a.id));
  }, [myAssets, data]);

  const employeeId = data?.employee?.id;

  const fetchDashboard = useCallback(async () => {
    const session = getApiSessionSnapshot();
    try {
      const response = await api.get("/me/dashboard");
      if (session !== getApiSessionSnapshot()) return;
      const resData = response.data?.data || response.data;
      if (resData) {
        setData(resData);
        try {
          localStorage.setItem("bksda_portal_dashboard_cache", JSON.stringify(resData));
        } catch {}
        if (resData.user) {
          authStore.updateUser(resData.user);
        }
      }
    } catch (error: unknown) {
      if (session !== getApiSessionSnapshot()) return;
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

  const fetchSuratTugas = useCallback(
    async (targetEmpId?: number) => {
      const empId = targetEmpId ?? employeeId;
      if (!empId) {
        setSuratTugas([]);
        return;
      }
      try {
        const resp = await api.get("/surat-tugas/my", {
          params: { per_page: 20 },
        });
        setSuratTugas(resp.data.data || []);
      } catch {
        // Keep existing list on background error
      } finally {
        setStLoading(false);
      }
    },
    [employeeId]
  );

  const fetchAssets = useCallback(async () => {
    try {
      const respMy = await api.get("/me/assets");
      setMyAssets(respMy.data.data || []);
    } catch {
      // Keep existing list on background error
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  const fetchSTDetail = useCallback(async (id: string) => {
    setStDetailLoading(true);
    try {
      const resp = await api.get(`/surat-tugas/my/${encodeURIComponent(id)}`);
      setStDetail(resp.data.data || resp.data);
      setStPreviewOpen(true);
    } catch {
      toast.error("Gagal memuat detail surat tugas.");
    } finally {
      setStDetailLoading(false);
    }
  }, []);

  const [activeLeaveId, setActiveLeaveId] = useState<string | number | null>(null);

  const handleNotificationNavigate = useCallback(
    (tabKey: string, referenceId?: string | null) => {
      const validTabs = ["dashboard", "pinjaman", "aset", "surat_tugas", "cuti", "visum", "kalkulator_dinas"];
      const targetTab = validTabs.includes(tabKey) ? tabKey : "dashboard";
      setActiveNavTab(targetTab);

      if (targetTab === "surat_tugas" && referenceId) {
        fetchSTDetail(referenceId);
      } else if (targetTab === "cuti" && referenceId) {
        setActiveLeaveId(referenceId);
      }
    },
    [fetchSTDetail]
  );

  // Fetch leave balance for logged-in employee
  const currentYear = new Date().getFullYear();
  const [myLeaveBalance, setMyLeaveBalance] = useState<{
    sisa_cuti_tersedia: number;
    total_hak_cuti: number;
  } | null>(null);

  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [forcePasswordChangeOpen, setForcePasswordChangeOpen] = useState(false);
  const [setup2FaOpen, setSetup2FaOpen] = useState(false);
  const [printLeaveData, setPrintLeaveData] = useState<LeaveRequestPrintData | null>(null);

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
    try {
      const res = await api.get("/me/leave-requests");
      const list: LeaveRequestPrintData[] = res.data.data || [];
      setMyLeaveRequests(list);

      // Update saldo cuti
      const balRes = await api.get(`/me/leave-balance?year=${currentYear}`);
      setMyLeaveBalance(balRes.data.data);
    } catch {}
  }, [currentYear]);

  // Initial dashboard load with cache populate
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("email_verified") === "1") {
        toast.success(
          "Selamat! Alamat email Anda berhasil diverifikasi. Notifikasi resmi dan pemulihan kata sandi kini aktif."
        );
        try {
          localStorage.removeItem("bksda_portal_dashboard_cache");
        } catch {}
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

  const hasPendingLeave = useMemo(() => {
    return myLeaveRequests.some(
      (r) => (r.status || "").toUpperCase() === "PENGAJUAN"
    );
  }, [myLeaveRequests]);

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

  // Instant Cross-Tab Sync via BroadcastChannel
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
    return data.user.role === "super_admin" || data.user.access_modules?.includes("*")
      ? ["kepegawaian", "keuangan", "bmn", "inventory", "dereporting", "cms", "surat", "drive"]
      : [...(data.user.access_modules || []), "drive"];
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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#edf3ee] dark:bg-slate-900/50">
        <p className="text-slate-700 dark:text-slate-300 font-bold mb-3">
          {fetchError || "Gagal memuat data"}
        </p>
        <Button onClick={fetchDashboard} className="bg-[#1e5433] hover:bg-[#164227] text-white">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf3ee] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans antialiased flex flex-col selection:bg-[#1e5433] selection:text-white print:bg-transparent">
      {/* BEGIN: MainHeader */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#dce8dd] dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 transition-shadow print:hidden">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          {/* Sisi Kiri: Brand, Organisasi & Status Sub-Sistem */}
          <div className="flex items-center gap-4 shrink-0" data-purpose="app-branding">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-[#dce8dd] dark:border-slate-800 shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0">
                <Image
                  src="/logo_bksda.png"
                  alt="Logo Kementerian Kehutanan"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                    BKSDA KALTIM
                  </h1>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e4f0e6] dark:bg-emerald-950/60 text-[#1e5433] dark:text-emerald-300 uppercase tracking-wider">
                    SUPERAPP
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Kementerian Kehutanan RI
                </p>
              </div>
            </div>
          </div>

          {/* Sisi Tengah: Global Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-2" data-purpose="global-search-bar">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                ref={searchInputRef}
                aria-label="Pencarian Global"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-16 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-[#dce8dd] dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#1e5433] focus:ring-1 focus:ring-[#1e5433] shadow-xs transition-all"
                placeholder="Cari surat tugas, modul, berkas, atau pegawai..."
                type="text"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-[#edf3ee] dark:bg-slate-700 border border-[#dce8dd] dark:border-slate-600 rounded-md">
                  Ctrl K
                </kbd>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Status Server, Jam Operasional & Quick Tools */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0" data-purpose="header-quick-tools">
            {/* Jam & Tanggal Operasional Samarinda */}
            <div className="hidden lg:flex flex-col items-end text-right pr-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">WITA</span>
                <span>{currentTimeStr}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Samarinda, Kaltim</span>
            </div>

            {/* Tombol Pusat Bantuan / Panduan */}
            <Link
              href="/panduan"
              className="w-9 h-9 rounded-xl border border-[#dce8dd] dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shadow-xs"
              title="Pusat Bantuan & Panduan Sistem"
            >
              <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </Link>

            {/* Theme / Sun Toggle */}
            <div className="flex items-center justify-center">
              <ThemeToggle />
            </div>

            {/* Notification Bell */}
            <NotificationBell onSelectTab={handleNotificationNavigate} />
          </div>
        </div>
      </header>

      {/* BEGIN: DashboardBodyLayout */}
      <main className={cn("flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-7 print:p-0 print:m-0 print:block print:max-w-none", printLeaveData && "print:hidden")}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================== */}
          {/* LEFT COLUMN: User Card & Primary Navigation     */}
          {/* ============================================== */}
          <div className="lg:col-span-3 space-y-5 print:hidden">
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
              onLogout={handleLogout}
            />
          </div>

          {/* ============================================== */}
          {/* CENTER/RIGHT COLUMN: Primary Dashboard Workspace */}
          {/* ============================================== */}
          <div className="lg:col-span-9 space-y-6 print:m-0 print:p-0 print:space-y-0 print:block">
            {/* Alert Banner Notifikasi Email Belum Terverifikasi */}
            <EmailConnectDialog
              currentEmail={data.user.email}
              isVerified={Boolean(data.user.email_verified_at)}
              initialCooldown={data.user.email_cooldown_remaining || 0}
              onSuccess={fetchDashboard}
            />

            {/* Main Tab Switcher Content */}
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
              <div className="space-y-6 w-full">
                {/* HERO BANNER & KINERJA GRID */}
                <PortalHeaderBanner
                  displayName={data.employee?.name || data.user.name}
                  activeSuratTugasCount={suratTugas.length}
                  onOpenVisum={() => {
                    setInlineFormType(null);
                    setActiveNavTab("visum");
                  }}
                  onOpenKalkulator={() => {
                    setInlineFormType(null);
                    setActiveNavTab("kalkulator_dinas");
                  }}
                  onOpenSuratTugasTab={() => {
                    setInlineFormType(null);
                    setActiveNavTab("surat_tugas");
                  }}
                />

                {/* 4 QUICK STATS METRIC CARDS */}
                <PortalQuickStats
                  rank={data.employee?.rank}
                  activeSuratTugasCount={suratTugas.length}
                  myAssetsCount={filteredMyAssets.length}
                  leaveBalance={myLeaveBalance}
                  year={currentYear}
                  onSelectTab={(t) => setActiveNavTab(t)}
                />

                {/* MODUL AKSES SISTEM BENTO GRID (8 MODUL) */}
                {moduleCards.length > 0 && (
                  <section
                    className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-[#dce8dd] dark:border-slate-800 shadow-sm"
                    data-purpose="modules-bento-grid"
                  >
                    {/* Header with Authorized Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-[#edf3ee] dark:border-slate-800 mb-6">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Modul Akses Sistem
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Pilih aplikasi operasional terintegrasi Balai KSDA Kaltim
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dff0e2] border border-[#dce8dd] text-[#1e5433] text-xs font-bold self-start sm:self-auto">
                        <span className="w-2 h-2 rounded-full bg-[#1e5433]" />
                        <span>{moduleCards.length} Modul Terotorisasi</span>
                      </div>
                    </div>

                    {/* 8 Module Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {moduleCards.map((mod) => (
                        <Link
                          key={mod.key}
                          href={mod.href}
                          className="group p-4 rounded-2xl border border-[#dce8dd] dark:border-slate-800 hover:border-[#1e5433]/40 dark:hover:border-emerald-500/40 bg-white dark:bg-slate-850 hover:bg-[#edf3ee]/40 dark:hover:bg-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center border",
                                mod.bg,
                                mod.color,
                                mod.border
                              )}
                            >
                              <mod.icon className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1e5433] dark:group-hover:text-emerald-400 mt-3 transition-colors">
                              {mod.label}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {mod.desc}
                            </p>
                          </div>
                          <div className="mt-4 pt-2 flex items-center text-[11px] font-semibold text-[#1e5433] dark:text-emerald-400">
                            <span>Buka Modul</span>
                            <span className="ml-1 text-xs transition-transform group-hover:translate-x-1">→</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : activeNavTab === "pinjaman" ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-6">
                <ActiveLoansTab assets={data.my_assets as BorrowedAssetItem[]} />
              </div>
            ) : activeNavTab === "aset" ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-6">
                <MyAssetsTab
                  assetsLoading={assetsLoading}
                  filteredMyAssets={filteredMyAssets as AssetItem[]}
                  assetViewMode={assetViewMode}
                  setAssetViewMode={setAssetViewMode}
                />
              </div>
            ) : activeNavTab === "surat_tugas" ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-6">
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-6">
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
                  onPrintLeave={(item) => {
                    setPrintLeaveData(item);
                    setTimeout(() => window.print(), 300);
                  }}
                />
              </div>
            ) : activeNavTab === "visum" ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-6">
                <VisumSpdTab isPortal={true} suratTugasList={suratTugas} />
              </div>
            ) : activeNavTab === "kalkulator_dinas" ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#dce8dd] dark:border-slate-800 overflow-hidden shadow-sm p-6 print:p-0 print:border-none print:shadow-none print:bg-transparent print:rounded-none">
                <KalkulatorDinasTab
                  suratTugasList={suratTugas}
                  currentUserName={data.employee?.name || data.user.name}
                  initialSelectedStId={activeKalkulatorStId}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* BEGIN: MinimalFooter */}
      <footer className="mt-auto border-t border-[#dce8dd] dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-8 text-center text-xs text-slate-500 dark:text-slate-400 print:hidden">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Balai Konservasi Sumber Daya Alam Kalimantan Timur - Kementerian Kehutanan Republik Indonesia.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            <span>v3.4.0 (Enterprise)</span>
            <span>•</span>
            <span>Server Wilayah I Samarinda</span>
          </div>
        </div>
      </footer>

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

      {/* SECURITY GATES */}
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
      <PortalContent key={user?.username || user?.id || "anonymous"} />
    </RouteGuard>
  );
}
