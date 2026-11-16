"use client";

import { useKepegawaianTabs } from "../../_lib/useKepegawaianTabs";

import { KepegawaianTabContent } from "../../_components/KepegawaianTabContent";

import { KepegawaianDialog } from "../../_components/KepegawaianDialog";

import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  FileText,
  Shield,
  Briefcase,
  Building2,
  BadgeCheck,
  Hash,
  ChevronDown,
  Pencil,
  Save,
  X,
  KeyRound,
  Calendar,
  History,
  RotateCcw,
  Phone,
  Mail,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  UtensilsCrossed,
  Award,
  Receipt,
  MessageCircle,
  Building,
  AlertCircle,
  CheckCircle2,
  UserX,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { AssignmentLetterHistory } from "../_components/AssignmentLetterHistory";
import { EmployeeAccessSheet } from "../../_components/EmployeeAccessSheet";
import { EmployeeLeaveTab } from "../_components/EmployeeLeaveTab";
import { EmployeeAuditHistoryTab } from "../_components/EmployeeAuditHistoryTab";
import { EmployeeMealAllowanceTab } from "../_components/EmployeeMealAllowanceTab";
import { EmployeeLifecycleModal } from "../_components/EmployeeLifecycleModal";
import { getBankTheme } from "../../_lib/bank-themes";
import {
  calculateMasaKerja,
  isMmpEmployee,
  detectEmployeeType,
  detectJenisFromNipInput,
  buildMmpDefaultJabatan,
  isAutoMmpJabatan,
} from "../../_lib/employee-helpers";
import { formatNipLabel } from "@/lib/letter-utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useMasterLocations,
  getLocationHierarchy,
  resolveLocationPlacement,
  getEmployeePlacementDisplay,
} from "@/lib/locations";
import {
  PANGKAT_PNS_OPTIONS,
  PANGKAT_PPPK_OPTIONS,
  JENIS_PEGAWAI_OPTIONS,
  RESOR_OPTIONS,
  type JenisPegawai,
} from "../../_lib/employee-constants";
import type { Employee } from "../../_lib";

function cleanFieldValue(val?: string | null): string {
  if (!val) return "";
  const trimmed = String(val).trim();
  return trimmed === "-" ? "" : trimmed;
}

function formatRupiah(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function getWaLink(phone?: string | null): string | null {
  const clean = cleanFieldValue(phone);
  if (!clean) return null;
  const digits = clean.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0")
    ? "62" + digits.slice(1)
    : digits.startsWith("62")
    ? digits
    : "62" + digits;
  return `https://wa.me/${international}`;
}

function CopyIcon({ copied, checkClass = "text-[var(--ds-status-success-fg)]" }: { copied: boolean; checkClass?: string }) {
  return copied
    ? <Check className={cn("w-3 h-3", checkClass)} />
    : <Copy className="w-3 h-3" />;
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);
  const accessTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);

  // Tab utama default: Biodata Lengkap
  const [activeTab, setActiveTab] = useState<
    "biodata" | "history" | "leave" | "meal_allowance" | "audit"
  >("biodata");

  const tabs = useKepegawaianTabs(activeTab, "Dossier pegawai");

  const { user: currentUser } = useAuth();
  const { canManageAccess, canWrite, isAdmin } = useRole();

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Biodata edit state
  const { data: masterLocations = [], isLoading: locationsLoading } = useMasterLocations(true);
  const { parents: locationParents, childrenByParentId, orphans: locationOrphans } = useMemo(
    () => getLocationHierarchy(masterLocations),
    [masterLocations]
  );
  const [editParentId, setEditParentId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editJenis, setEditJenis] = useState<JenisPegawai>("PNS");
  const [editForm, setEditForm] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
    location_id: "",
    satuan_kerja: "",
    resor: "",
    masa_kerja: "",
    telepon: "",
    email: "",
    nama_bank: "BRI",
    nomor_rekening: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Reset password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Employee }>(`/kepegawaian/employees/${id}`);
      return data.data;
    },
  });

  const isSelfProfile = Boolean(
    currentUser?.username &&
      employee?.nip &&
      currentUser.username.trim() === employee.nip.trim()
  );
  const canViewSensitive = canWrite || isSelfProfile;

  const currentYear = new Date().getFullYear();
  const { data: leaveBalance } = useQuery({
    queryKey: ["employeeLeave", id, currentYear],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ data: { sisa_cuti_tersedia: number; total_hak_cuti: number } }>(
          `/kepegawaian/employees/${id}/leaves?year=${currentYear}`
        );
        return data.data;
      } catch {
        return null;
      }
    },
    enabled: !!id && !isMmpEmployee(employee) && canViewSensitive,
  });

  // Query Assignment Letters count for metric card
  const { data: assignmentsData } = useQuery({
    queryKey: ["employee-assignments", id],
    queryFn: async () => {
      const { data } = await api.get<{ meta: { total: number } }>(
        `/kepegawaian/employees/${id}/assignment-letters?per_page=1`
      );
      return data;
    },
    enabled: !!id && canViewSensitive,
  });

  // Query Latest Meal Allowance for metric card
  const { data: allowancesData } = useQuery({
    queryKey: ["employee-meal-allowances", id, 1],
    queryFn: async () => {
      try {
        const { data } = await api.get<{
          data: Array<{ uang_makan_netto: number | string; batch?: { periode_bulan: string; nama_batch: string } }>;
          meta: { total: number };
        }>(`/kepegawaian/employees/${id}/meal-allowances?per_page=1`);
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!id && !isMmpEmployee(employee) && canViewSensitive,
  });

  // Query Bank Terdaftar yang tersinkronisasi dari Pengaturan
  const { data: registeredBanksData } = useQuery({
    queryKey: ["registered-banks"],
    queryFn: async () => {
      try {
        const { data } = await api.get<{
          success: boolean;
          data: Array<{ id: number; nama_bank: string; count: number }>;
        }>("/kepegawaian/settings/registered-banks");
        return data.data;
      } catch {
        return [
          { id: 1, nama_bank: "BRI", count: 0 },
          { id: 2, nama_bank: "Mandiri", count: 0 },
        ];
      }
    },
    enabled: canWrite,
  });

  const availableBanks = useMemo(() => {
    const list = registeredBanksData?.map((b) => b.nama_bank) || ["BRI", "Mandiri"];
    if (editForm.nama_bank && !list.some((b) => b.toUpperCase() === editForm.nama_bank.toUpperCase())) {
      return [...list, editForm.nama_bank];
    }
    return list;
  }, [registeredBanksData, editForm.nama_bank]);

  const isMmp = isMmpEmployee(employee);
  const placement = useMemo(
    () => (employee ? getEmployeePlacementDisplay(employee, masterLocations, RESOR_OPTIONS) : null),
    [employee, masterLocations]
  );

  useEffect(() => {
    if ((!canViewSensitive && activeTab !== "biodata") || (isMmp && (activeTab === "leave" || activeTab === "meal_allowance"))) {
      setActiveTab("biodata");
    }
  }, [isMmp, canViewSensitive, activeTab]);

  useEffect(() => {
    if (!isEditing || !employee || !masterLocations.length || editParentId) return;
    const resolved = resolveLocationPlacement(
      masterLocations,
      employee.location_id,
      cleanFieldValue(employee.satuan_kerja),
      cleanFieldValue(employee.resor)
    );
    if (resolved.parentId) {
      setEditParentId(resolved.parentId);
      setEditForm((prev) => ({
        ...prev,
        location_id: prev.location_id || resolved.selectedLocation?.id || "",
      }));
    }
  }, [isEditing, employee, masterLocations, editParentId]);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const editSelectedParentLoc = useMemo(
    () => masterLocations.find((l) => l.id === editParentId) || null,
    [masterLocations, editParentId]
  );
  const editChildLocations = useMemo(
    () => (editParentId ? childrenByParentId.get(editParentId) || [] : []),
    [childrenByParentId, editParentId]
  );

  const startEditing = () => {
    if (!employee) return;
    const detected = detectEmployeeType(employee);
    const satker = cleanFieldValue(employee.satuan_kerja);
    const resor = cleanFieldValue(employee.resor);
    const resolved = resolveLocationPlacement(
      masterLocations,
      employee.location_id,
      satker,
      resor
    );
    setEditJenis(detected);
    setEditParentId(resolved.parentId);
    setEditForm({
      nip: detected === "MMP" ? "" : cleanFieldValue(employee.nip),
      nama_lengkap: cleanFieldValue(employee.nama_lengkap),
      jabatan: cleanFieldValue(employee.jabatan),
      pangkat_golongan: detected === "MMP" ? "" : cleanFieldValue(employee.pangkat_golongan),
      location_id: resolved.selectedLocation?.id || employee.location_id || "",
      satuan_kerja: satker,
      resor,
      masa_kerja: cleanFieldValue(employee.masa_kerja) || calculateMasaKerja(employee.nip, employee.nama_lengkap),
      telepon: cleanFieldValue(employee.telepon),
      email: cleanFieldValue(employee.email),
      nama_bank: detected === "MMP" ? "" : (employee.nama_bank || "BRI"),
      nomor_rekening: detected === "MMP" ? "" : cleanFieldValue(employee.nomor_rekening),
      is_active: employee.is_active,
    });
    setIsEditing(true);
    setActiveTab("biodata");
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleEditJenisChange = (nextJenis: JenisPegawai) => {
    setEditJenis(nextJenis);
    setEditForm((prev) => {
      if (nextJenis === "MMP") {
        return {
          ...prev,
          nip: "",
          pangkat_golongan: "",
          jabatan: isAutoMmpJabatan(prev.jabatan)
            ? buildMmpDefaultJabatan(prev.satuan_kerja)
            : prev.jabatan,
        };
      }
      const validPangkat =
        nextJenis === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
      return {
        ...prev,
        pangkat_golongan: validPangkat.includes(prev.pangkat_golongan)
          ? prev.pangkat_golongan
          : "",
        jabatan: isAutoMmpJabatan(prev.jabatan) ? "" : prev.jabatan,
      };
    });
  };

  const handleEditNipChange = (val: string) => {
    const detected = detectJenisFromNipInput(val);
    if (detected === "MMP") {
      handleEditJenisChange("MMP");
      return;
    }
    if (detected && detected !== editJenis) {
      setEditJenis(detected);
      const validPangkat =
        detected === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
      setEditForm((prev) => ({
        ...prev,
        nip: val,
        pangkat_golongan: validPangkat.includes(prev.pangkat_golongan)
          ? prev.pangkat_golongan
          : "",
      }));
      return;
    }
    setEditForm((prev) => ({ ...prev, nip: val }));
  };

  const handleEditParentLocationChange = (parentId: string) => {
    setEditParentId(parentId);
    const parent = masterLocations.find((l) => l.id === parentId);
    const nextSatker = parent ? parent.name : "";
    setEditForm((prev) => ({
      ...prev,
      location_id: parent ? parent.id : "",
      satuan_kerja: nextSatker,
      resor: parent?.location_type === "resor" ? parent.code || parent.name : "",
      jabatan:
        editJenis === "MMP" && isAutoMmpJabatan(prev.jabatan)
          ? buildMmpDefaultJabatan(nextSatker)
          : prev.jabatan,
    }));
  };

  const handleEditChildLocationChange = (childId: string) => {
    if (!childId) {
      setEditForm((prev) => ({
        ...prev,
        location_id: editParentId,
        resor: "",
      }));
      return;
    }
    const child = masterLocations.find((l) => l.id === childId);
    setEditForm((prev) => ({
      ...prev,
      location_id: childId,
      resor: child?.location_type === "resor" ? child.code || child.name : "",
    }));
  };

  const handleSave = async () => {
    if (!editForm.nama_lengkap.trim()) {
      toast.error("Nama Lengkap wajib diisi.");
      return;
    }
    if (editJenis !== "MMP" && !editForm.nip.trim()) {
      toast.error(`${editJenis === "PPPK" ? "NIPPPK" : "NIP"} wajib diisi.`);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/kepegawaian/employees/${id}`, {
        jenis_pegawai: editJenis,
        nip: editJenis === "MMP" ? (isMmpEmployee(employee) ? employee?.nip : "") : editForm.nip,
        nama_lengkap: editForm.nama_lengkap,
        jabatan: editForm.jabatan || null,
        pangkat_golongan: editJenis === "MMP" ? null : editForm.pangkat_golongan || null,
        location_id: editForm.location_id || null,
        satuan_kerja: editForm.satuan_kerja || null,
        resor: editForm.resor || null,
        masa_kerja: editJenis === "MMP" ? null : (editForm.masa_kerja || null),
        telepon: editForm.telepon || null,
        email: editForm.email || null,
        nama_bank: editJenis === "MMP" ? null : (editForm.nama_bank || null),
        nomor_rekening: editJenis === "MMP" ? null : (editForm.nomor_rekening || null),
        is_active: editForm.is_active,
      });
      toast.success("Biodata berhasil diperbarui.");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-histories", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menyimpan perubahan.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter.");
      return;
    }
    setResetting(true);
    try {
      await api.post(`/kepegawaian/employees/${id}/reset-password`, { password: resetPassword });
      toast.success("Password berhasil direset.");
      setResetPassword("");
      setResetDialogOpen(false);
    } catch {
      toast.error("Gagal mereset password.");
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div data-module="kepegawaian" className="kpg-ui p-4 sm:p-6 lg:p-6 space-y-6 w-full min-h-screen">
        <div className="h-8 w-48 bg-[var(--ds-surface-muted)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 xl:col-span-3 h-[600px] bg-[var(--ds-surface-muted)] rounded-3xl animate-pulse" />
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <div className="h-24 bg-[var(--ds-surface-muted)] rounded-3xl animate-pulse" />
            <div className="h-12 bg-[var(--ds-surface-muted)] rounded-3xl animate-pulse" />
            <div className="h-[460px] bg-[var(--ds-surface-muted)] rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div data-module="kepegawaian" className="kpg-ui p-6 py-20 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] mx-auto flex items-center justify-center mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--ds-fg)]">Pegawai Tidak Ditemukan</h2>
        <p className="text-xs text-[var(--ds-fg-muted)] mt-1 mb-6">
          Data pegawai yang Anda cari mungkin telah dinonaktifkan atau dihapus dari sistem.
        </p>
        <Button variant="default" className="rounded-lg shadow-xs" onClick={() => router.push("/kepegawaian/employees")}>
          Kembali ke Daftar Pegawai
        </Button>
      </div>
    );
  }

  const empCategory = detectEmployeeType(employee);
  const editPangkatOptions = editJenis === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
  const bankTheme = getBankTheme(employee.nama_bank || "BRI");
  const validTelepon = cleanFieldValue(employee.telepon);
  const validEmail = cleanFieldValue(employee.email);
  const validRekening = cleanFieldValue(employee.nomor_rekening);
  const waLink = getWaLink(validTelepon);
  const latestAllowance = allowancesData?.data?.[0];

  return (
    <div data-module="kepegawaian" className="kpg-ui p-4 sm:p-6 lg:p-6 space-y-6 w-full min-h-screen">
      {/* Top Breadcrumb & Quick Actions Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/kepegawaian/employees"
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg kpg-secondary text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Pegawai</span>
          </Link>
          <span className="text-[var(--ds-fg-muted)]">/</span>
          <span className="text-xs font-medium text-[var(--ds-fg-muted)] truncate max-w-[200px] sm:max-w-md">
            {employee.nama_lengkap}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs gap-2 border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-status-warning-border)] hover:bg-[var(--ds-status-warning-bg)] text-[var(--ds-fg)] cursor-pointer"
              onClick={() => setResetDialogOpen(true)}
            >
              <KeyRound className="w-4 h-4 text-[var(--ds-status-warning-fg)]" />
              <span>Reset Password</span>
            </Button>
          )}
          {canManageAccess && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs gap-2 border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-status-success-border)] hover:bg-[var(--ds-status-success-bg)] text-[var(--ds-fg)] cursor-pointer"
              onClick={(event) => { accessTriggerRef.current = event.currentTarget; setAccessSheetOpen(true); }}
            >
              <Shield className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
              <span>Kelola Akses (IAM)</span>
            </Button>
          )}
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs gap-2 border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-status-danger-border)] hover:bg-[var(--ds-status-danger-bg)] text-[var(--ds-fg)] cursor-pointer"
              onClick={() => setLifecycleModalOpen(true)}
            >
              <UserX className="w-4 h-4 text-[var(--ds-status-danger-fg)]" />
              <span>Status & Pensiun</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Responsive Full-Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: STICKY PROFILE COCKPIT (col-span-4 / col-span-3) */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-6">
          {/* Cockpit Card */}
          <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xs">

            {/* Profile Avatar & Primary Badges */}
            <div className="flex flex-col items-center text-center pb-5 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                  {employee.foto_url ? (
                    <Image
                      src={employee.foto_url}
                      alt={employee.nama_lengkap}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-[var(--ds-fg-muted)]">
                      {employee.nama_lengkap.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Status Dot */}
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--ds-surface)] flex items-center justify-center shadow-xs",
                    employee.is_active ? "bg-[var(--ds-status-success-fg)]" : "bg-[var(--ds-danger-solid)]"
                  )}
                  title={employee.is_active ? "Status: Pegawai Aktif" : "Status: Non-Aktif"}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--ds-surface)]" />
                </span>

                {/* Upload Photo Overlay (for admins) */}
                {canManageAccess && (
                  <label className="kpg-photo-upload absolute inset-0 bg-black/75 rounded-lg flex flex-col items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 cursor-pointer text-white text-xs font-semibold">
                    <User className="w-6 h-6 mb-1" />
                    <span>{photoUploading ? "Mengunggah..." : "Ubah Foto"}</span>
                    <input
                      type="file"
                      disabled={photoUploading}
                      aria-label="Unggah foto profil pegawai"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("Ukuran foto maksimal 10MB");
                          return;
                        }
                        const fd = new FormData();
                        fd.append("foto", file);
                        setPhotoUploading(true);
                        try {
                          await api.post(`/kepegawaian/employees/${id}/photo`, fd);
                          toast.success("Foto profil berhasil diperbarui!");
                          queryClient.invalidateQueries({ queryKey: ["employee", id] });
                        } catch {
                          toast.error("Gagal mengupload foto.");
                        } finally {
                          setPhotoUploading(false);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Name & Category Badges */}
              <h1 className="text-xl font-black text-[var(--ds-fg)] leading-tight">
                {employee.nama_lengkap}
              </h1>

              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                <span
                  className={cn(
                    "inline-flex items-center text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider",
                    empCategory === "MMP"
                      ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]"
                      : empCategory === "PPPK"
                      ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]"
                      : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"
                  )}
                >
                  {empCategory === "PPPK" ? "PPPK (P3K)" : empCategory}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full",
                    employee.status_badge?.color === "emerald"
                      ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]"
                      : employee.status_badge?.color === "amber"
                      ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]"
                      : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] border border-slate-200/80 dark:border-zinc-800"
                  )}
                >
                  <BadgeCheck className="w-3 h-3" />
                  {employee.status_badge?.label || (employee.is_active ? "Aktif Bertugas" : "Non-Aktif")}
                </span>
              </div>

              {/* NIP / Username with 1-click Copy */}
              <div className="mt-3 flex items-center gap-2 font-mono text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface)] px-3 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800">
                <span>
                  {empCategory === "MMP"
                    ? `Username: ${employee.nip}`
                    : `${formatNipLabel(employee, true)} ${employee.nip}`}
                </span>
                {employee.nip && (
                  <button
                    type="button"
                    onClick={() => handleCopy(employee.nip, "nip")}
                    className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors p-1 rounded-lg cursor-pointer"
                    title={empCategory === "MMP" ? "Salin Username Portal" : "Salin NIP"}
                  >
                    <CopyIcon copied={copiedField === "nip"} />
                  </button>
                )}
              </div>
            </div>

            {/* Info Details List (Mirip Portal, Natural & Terpadu) */}
            <div className="py-4 space-y-3 text-xs border-b border-slate-200/70 dark:border-zinc-800">
              {/* Jabatan */}
              <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
                <Briefcase className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Jabatan</span>
                  <span className="font-semibold text-[var(--ds-fg)] truncate block">
                    {employee.jabatan || "-"}
                  </span>
                </div>
              </div>

              {/* Unit Kerja */}
              <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
                <Building2 className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Unit Kerja</span>
                  <span className="font-semibold text-[var(--ds-fg)] truncate block">
                    {placement?.unitName || "-"}
                  </span>
                  {placement?.subValue && (
                    <span className="text-xs text-[var(--ds-fg-muted)] block">
                      {placement.subShortLabel}: {placement.subValue}
                    </span>
                  )}
                </div>
              </div>

              {/* Pangkat & Golongan (Non-MMP) */}
              {empCategory !== "MMP" && (
                <div className="flex items-start gap-3 text-[var(--ds-fg-muted)]">
                  <Hash className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Pangkat & Golongan</span>
                    <span className="font-semibold text-[var(--ds-fg)] block">
                      {employee.pangkat_golongan || "-"}
                    </span>
                  </div>
                </div>
              )}

              {/* Email Resmi */}
              <div className="flex items-start justify-between gap-2 text-[var(--ds-fg-muted)]">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Mail className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Email Akun Resmi</span>
                    {validEmail ? (
                      <span className="font-semibold text-[var(--ds-fg)] truncate block font-mono text-xs">
                        {validEmail}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--ds-fg-muted)] italic">Belum diatur</span>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={startEditing}
                            className="text-xs font-bold text-[var(--ds-accent-fg)] hover:underline cursor-pointer"
                          >
                            + Tambah
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {validEmail && (
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(employee.email!, "email")}
                      className="p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
                      title="Salin Alamat Email"
                    >
                      <CopyIcon copied={copiedField === "email"} checkClass="text-[var(--ds-accent-fg)]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Telepon / WhatsApp */}
              <div className="flex items-start justify-between gap-2 text-[var(--ds-fg-muted)]">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Phone className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] block">Telepon / WhatsApp</span>
                    {validTelepon ? (
                      <span className="font-semibold text-[var(--ds-fg)] truncate block font-mono text-xs">
                        {validTelepon}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--ds-fg-muted)] italic">Belum diatur</span>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={startEditing}
                            className="text-xs font-bold text-[var(--ds-accent-fg)] hover:underline cursor-pointer"
                          >
                            + Tambah
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {validTelepon && (
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(employee.telepon!, "telepon")}
                      className="p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
                      title="Salin Nomor HP"
                    >
                      <CopyIcon copied={copiedField === "telepon"} />
                    </button>
                  </div>
                )}
              </div>

              {/* Rekening Penyalur Uang Makan (Non-MMP) */}
              {!isMmp && canViewSensitive && (
                <div className="flex items-start justify-between gap-2 text-[var(--ds-fg-muted)]">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <CreditCard className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase font-bold text-[var(--ds-fg-muted)]">Rekening Penyalur</span>
                        <span className={cn("px-2 py-1 rounded-lg text-xs font-black border", bankTheme.bgBadge)}>
                          {employee.nama_bank || "BRI"}
                        </span>
                      </div>
                      {validRekening ? (
                        <span className="font-semibold text-[var(--ds-fg)] truncate block font-mono text-xs">
                          {validRekening}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--ds-fg-muted)] italic">Belum diinput</span>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={startEditing}
                              className="text-xs font-bold text-[var(--ds-accent-fg)] hover:underline cursor-pointer"
                            >
                              + Tambah
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {validRekening && (
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(validRekening, "rekening")}
                        className="p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
                        title="Salin Nomor Rekening"
                      >
                        <CopyIcon copied={copiedField === "rekening"} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {canWrite && !isEditing && (
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-lg kpg-secondary gap-2 font-bold text-xs h-9 text-[var(--ds-fg)] transition-colors cursor-pointer"
                  onClick={startEditing}
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Data Pegawai</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: METRIC BANNERS & DYNAMIC TABS (col-span-8/9) */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Top 4 Metric Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Metric 1: Masa Kerja */}
            <div
              onClick={() => setActiveTab("biodata")}
              aria-pressed={activeTab === "biodata"}
              className="p-4 rounded-3xl bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-status-warning-border)] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Masa Kerja</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[var(--ds-fg)] truncate">
                {empCategory === "MMP"
                  ? "-"
                  : employee.masa_kerja || calculateMasaKerja(employee.nip, employee.nama_lengkap)}
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1 truncate">Pengabdian Resmi</p>
            </div>

            {/* Metric 2: Riwayat Penugasan */}
            {canViewSensitive && (
            <div
              onClick={() => setActiveTab("history")}
              aria-pressed={activeTab === "history"}
              className="p-4 rounded-3xl bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-accent-soft-border)] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Penugasan</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[var(--ds-fg)]">
                {assignmentsData?.meta?.total ?? 0}
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1 truncate">Total Surat Tugas</p>
            </div>
            )}

            {/* Metric 3: Sisa Cuti PNS */}
            {!isMmp && canViewSensitive && (
            <div
              onClick={() => setActiveTab("leave")}
              aria-pressed={activeTab === "leave"}
              className="p-4 rounded-3xl bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-status-success-border)] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Sisa Cuti</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[var(--ds-fg)]">
                {leaveBalance?.sisa_cuti_tersedia ?? 12}{" "}
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Hari</span>
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1 truncate">Tahun {currentYear}</p>
            </div>
            )}

            {/* Metric 4: Uang Makan Terakhir */}
            {!isMmp && canViewSensitive && (
            <div
              onClick={() => setActiveTab("meal_allowance")}
              aria-pressed={activeTab === "meal_allowance"}
              className="p-4 rounded-3xl bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-accent-soft-border)] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Uang Makan</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[var(--ds-status-success-fg)] truncate">
                {latestAllowance ? formatRupiah(latestAllowance.uang_makan_netto) : "Rp 0"}
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1 truncate">
                {latestAllowance?.batch?.periode_bulan || "Bulan berjalan"}
              </p>
            </div>
            )}
          </div>

          {/* Dynamic Tabs Navigation Bar (WRAP 2-TINGKAT, TANPA SCROLL HORIZONTAL) */}
          <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-2 shadow-xs">
            <div {...tabs.tabListProps} className="kpg-pill-tabs flex flex-wrap items-center gap-2">
              {/* Tab 1: Biodata Lengkap (UTAMA - DEFAULT AKTIF) */}
              <button
                type="button"
                onClick={() => setActiveTab("biodata")}
                {...tabs.tabProps("biodata")}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "biodata"
                    ? "text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                {activeTab === "biodata" && (
                  <motion.span
                    layoutId={tabs.indicatorId}
                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <User className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Biodata Lengkap</span>
              </button>

              {/* Tab 2: Riwayat Penugasan */}
              {canViewSensitive && (
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                {...tabs.tabProps("history")}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "history"
                    ? "text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                {activeTab === "history" && (
                  <motion.span
                    layoutId={tabs.indicatorId}
                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <FileText className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Riwayat Penugasan</span>
                {assignmentsData?.meta && (
                  <span
                    className={cn(
                      "relative z-10 px-2 py-1 rounded-full text-xs font-black",
                      activeTab === "history" ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)]" : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                    )}
                  >
                    {assignmentsData.meta.total}
                  </span>
                )}
              </button>
              )}

              {/* Tab 3: Cuti Pegawai (PNS) */}
              {!isMmp && canViewSensitive && (
              <button
                type="button"
                onClick={() => setActiveTab("leave")}
                {...tabs.tabProps("leave")}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "leave"
                    ? "text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                {activeTab === "leave" && (
                  <motion.span
                    layoutId={tabs.indicatorId}
                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Calendar className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Cuti Pegawai (PNS)</span>
                <span
                  className={cn(
                    "relative z-10 px-2 py-1 rounded-full text-xs font-black",
                    activeTab === "leave"
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)]"
                      : "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]"
                  )}
                >
                  {leaveBalance?.sisa_cuti_tersedia ?? 12} Hari
                </span>
              </button>
              )}

              {/* Tab 4: Presensi & Uang Makan */}
              {!isMmp && canViewSensitive && (
              <button
                type="button"
                onClick={() => setActiveTab("meal_allowance")}
                {...tabs.tabProps("meal_allowance")}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "meal_allowance"
                    ? "text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                )}
              >
                {activeTab === "meal_allowance" && (
                  <motion.span
                    layoutId={tabs.indicatorId}
                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <UtensilsCrossed className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Presensi & Uang Makan</span>
                {allowancesData?.meta?.total !== undefined && allowancesData.meta.total > 0 && (
                  <span
                    className={cn(
                      "relative z-10 px-2 py-1 rounded-full text-xs font-black",
                      activeTab === "meal_allowance" ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)]" : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                    )}
                  >
                    {allowancesData.meta.total} Batch
                  </span>
                )}
              </button>
              )}

              {/* Tab 5: Riwayat Perubahan (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("audit")}
                  {...tabs.tabProps("audit")}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none",
                    activeTab === "audit"
                      ? "text-[var(--ds-accent-on-solid)]"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                  )}
                >
                  {activeTab === "audit" && (
                    <motion.span
                      layoutId={tabs.indicatorId}
                      className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <History className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Riwayat Perubahan</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Content Panels with Motion Glide Transition */}
          <AnimatePresence mode="wait" initial={false}>
            <KepegawaianTabContent
          panelProps={tabs.panelProps}
              key={activeTab}

            >
              {/* TAB 1: BIODATA LENGKAP (DEFAULT AKTIF) */}
          {activeTab === "biodata" && (
            <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/70 dark:border-zinc-800">
                <div>
                  <h3 className="text-xl font-bold text-[var(--ds-fg)] flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                    Identitas & Data Lengkap Pegawai
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    {isMmp
                      ? "Informasi profil resmi, unit kerja penempatan, serta kontak WhatsApp & Email"
                      : "Informasi profil resmi, unit kerja penempatan, kontak WhatsApp & Email, serta rekening bank uang makan"}
                  </p>
                </div>

                {canWrite && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-2 text-xs font-bold hover:bg-[var(--ds-status-success-bg)] hover:text-[var(--ds-status-success-fg)] hover:border-[var(--ds-status-success-border)] cursor-pointer"
                    onClick={startEditing}
                  >
                    <Pencil className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                    <span>Edit Biodata</span>
                  </Button>
                )}

                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg gap-2 text-xs cursor-pointer"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      <X className="w-4 h-4" />
                      <span>Batal</span>
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-lg gap-2 text-xs bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold cursor-pointer"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </Button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-6">
                  {/* Bagian 1: Data Kepegawaian Utama */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ds-fg-muted)] mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                      Data Kepegawaian & Penempatan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      <BioItem
                        label="Kategori Pegawai"
                        value={
                          empCategory === "MMP"
                            ? "MMP (Masyarakat Mitra Polhut)"
                            : empCategory === "PPPK"
                            ? "PPPK (P3K)"
                            : "PNS (Pegawai Negeri Sipil)"
                        }
                      />
                      <BioItem
                        label={empCategory === "PPPK" ? "NIPPPK" : empCategory === "MMP" ? "Username Portal (Kode MMP)" : "NIP"}
                        value={employee.nip || "-"}
                      />
                      <BioItem label="Nama Lengkap" value={employee.nama_lengkap} />
                      <BioItem label="Jabatan Resmi" value={employee.jabatan || "-"} />
                      <BioItem
                        label="Pangkat / Golongan"
                        value={empCategory === "MMP" ? "-" : employee.pangkat_golongan || "-"}
                      />
                      <BioItem
                        label="Satuan / Unit Kerja"
                        value={placement?.unitName || "-"}
                      />
                      <BioItem
                        label={placement?.subLabel || "Resor Lapangan"}
                        value={
                          placement?.subValue ||
                          (employee.location?.location_type === "seksi"
                            ? "Kantor Seksi Wilayah"
                            : "Kantor Balai / Umum")
                        }
                      />
                      <BioItem
                        label="Status Kepegawaian"
                        value={employee.status_badge?.label || (employee.is_active ? "Aktif Bertugas" : "Non-Aktif")}
                      />
                      {employee.inactive_effective_date && (
                        <BioItem
                          label="TMT Nonaktif"
                          value={employee.inactive_effective_date}
                        />
                      )}
                      {employee.inactive_notes && (
                        <BioItem
                          label="Catatan / Nomor SK"
                          value={employee.inactive_notes}
                        />
                      )}
                      <BioItem
                        label="Masa Kerja"
                        value={
                          empCategory === "MMP"
                            ? "-"
                            : (employee.masa_kerja || calculateMasaKerja(employee.nip, employee.nama_lengkap))
                        }
                      />
                      <BioItem
                        label="Status Keaktifan"
                        value={employee.is_active ? "Aktif Bertugas" : "Non-Aktif"}
                      />
                    </div>
                  </div>

                  {/* Bagian 2: Kontak & Komunikasi */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ds-fg-muted)] mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                      Kontak WhatsApp & Email
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                            Nomor WhatsApp / HP
                          </p>
                          <p className={cn("text-sm mt-1", validTelepon ? "font-mono font-bold text-[var(--ds-fg)]" : "font-medium text-[var(--ds-fg-muted)]")}>
                            {validTelepon || "Belum diatur"}
                          </p>
                        </div>
                        {validTelepon && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(employee.telepon!, "bio-tel")}
                              className="p-2 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                              title="Salin Nomor HP"
                            >
                              {copiedField === "bio-tel" ? (
                                <Check className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)] transition-colors"
                                title="Chat WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                            Alamat Email Resmi
                          </p>
                          <p className={cn("text-sm mt-1", validEmail ? "font-mono font-bold text-[var(--ds-fg)]" : "font-medium text-[var(--ds-fg-muted)]")}>
                            {validEmail || "Belum diatur"}
                          </p>
                        </div>
                        {validEmail && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(employee.email!, "bio-mail")}
                              className="p-2 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                              title="Salin Alamat Email"
                            >
                              {copiedField === "bio-mail" ? (
                                <Check className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <a
                              href={`mailto:${employee.email}`}
                              className="p-2 rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)] transition-colors"
                              title="Kirim Email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Finansial & Rekening Uang Makan */}
                  {!isMmp && canViewSensitive && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ds-fg-muted)] mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                      Rekening Bank Penyalur Uang Makan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                            Bank Penyalur
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2 py-1 rounded-lg text-xs font-black border",
                                bankTheme.bgBadge
                              )}
                            >
                              {employee.nama_bank || "BRI"}
                            </span>
                            <span className="text-xs text-[var(--ds-fg-muted)]">
                              (Pemisahan nominatif otomatis)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                            Nomor Rekening Bank
                          </p>
                          <p className={cn("text-sm mt-1", validRekening ? "font-mono font-bold text-[var(--ds-fg)] tracking-wider" : "font-medium text-[var(--ds-fg-muted)]")}>
                            {validRekening || "Belum diatur"}
                          </p>
                        </div>
                        {validRekening && (
                          <button
                            type="button"
                            onClick={() => handleCopy(employee.nomor_rekening!, "bio-rek")}
                            className="p-2 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                            title="Salin Nomor Rekening"
                          >
                            {copiedField === "bio-rek" ? (
                              <Check className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              ) : (
                /* FORM EDIT BIODATA LENGKAP */
                <div className="space-y-6">
                  {/* Pemilihan Kategori Pegawai */}
                  <BioField label="Kategori / Jenis Pegawai">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {JENIS_PEGAWAI_OPTIONS.map((opt) => {
                        const isSelected = editJenis === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleEditJenisChange(opt.value)}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-lg border text-left transition-colors cursor-pointer",
                              isSelected
                                ? "bg-[var(--ds-status-success-bg)] border-[var(--ds-status-success-border)] ring-2 ring-[var(--ds-status-success-border)]"
                                : "bg-[var(--ds-surface)] border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                            )}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  isSelected ? "text-[var(--ds-status-success-fg)]" : "text-[var(--ds-fg)]"
                                )}
                              >
                                {opt.label}
                              </span>
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  isSelected ? "bg-[var(--ds-status-success-fg)]" : "bg-[var(--ds-surface-muted)]"
                                )}
                              />
                            </div>
                            <span className="text-xs text-[var(--ds-fg-muted)]">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </BioField>

                  {/* Input Grid Field Biodata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {editJenis !== "MMP" && (
                      <BioField label={editJenis === "PPPK" ? "NIPPPK" : "NIP"}>
                        <input
                          type="text"
                          value={editForm.nip}
                          onChange={(e) => handleEditNipChange(e.target.value)}
                          placeholder={
                            editJenis === "PPPK"
                              ? "19930425 202421 2 053..."
                              : "19800101 200501 1 001..."
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)] font-mono" aria-label="NIP atau NIPPPK"
                        />
                      </BioField>
                    )}

                    <div className={editJenis === "MMP" ? "sm:col-span-2" : ""}>
                      <BioField label="Nama Lengkap">
                        <input
                          type="text"
                          value={editForm.nama_lengkap}
                          onChange={(e) =>
                            setEditForm({ ...editForm, nama_lengkap: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)]" aria-label="Nama lengkap pegawai"
                        />
                      </BioField>
                    </div>

                    <div className={editJenis === "MMP" ? "sm:col-span-2" : ""}>
                      <BioField label="Jabatan">
                        <input
                          type="text"
                          value={editForm.jabatan}
                          onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)]" aria-label="Jabatan"
                        />
                      </BioField>
                    </div>

                    {editJenis !== "MMP" && (
                      <BioField
                        label={
                          editJenis === "PPPK" ? "Golongan PPPK" : "Pangkat / Golongan PNS"
                        }
                      >
                        <div className="relative">
                          <select
                            value={editForm.pangkat_golongan}
                            onChange={(e) =>
                              setEditForm({ ...editForm, pangkat_golongan: e.target.value })
                            }
                            className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)] appearance-none cursor-pointer" aria-label="Pangkat atau golongan"
                          >
                            <option value="">
                              {editJenis === "PPPK"
                                ? "Pilih Golongan PPPK"
                                : "Pilih Pangkat/Golongan PNS"}
                            </option>
                            {editPangkatOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                        </div>
                      </BioField>
                    )}

                    <BioField label="Unit Kerja / Wilayah Induk">
                      <div className="relative">
                        <select
                          value={editParentId}
                          onChange={(e) => handleEditParentLocationChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)] appearance-none cursor-pointer"
                          aria-label="Satuan kerja"
                        >
                          <option value="">
                            {locationsLoading ? "Memuat Master Lokasi..." : "Pilih Unit Kerja"}
                          </option>
                          {locationParents.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                          {locationOrphans.length > 0 && (
                            <optgroup label="Lokasi Khusus">
                              {locationOrphans.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                      </div>
                    </BioField>

                    {(() => {
                      const isBalai = editSelectedParentLoc?.location_type === "balai";
                      const isDisabled =
                        !editParentId || (editChildLocations.length === 0 && !isBalai);
                      const subLabel = isBalai
                        ? "Subbagian / Ruang Kerja Balai"
                        : "Resor Penempatan";
                      const emptyLabel = !editParentId
                        ? "Pilih Unit Kerja terlebih dahulu"
                        : isBalai
                        ? "Kantor Balai Induk (Umum)"
                        : "Kantor Seksi Wilayah (Bukan Resor)";

                      return (
                        <BioField label={subLabel}>
                          <div className="relative">
                            <select
                              disabled={isDisabled}
                              value={editForm.location_id === editParentId ? "" : editForm.location_id}
                              onChange={(e) => handleEditChildLocationChange(e.target.value)}
                              className={cn(
                                "w-full px-4 py-3 rounded-lg border outline-none text-sm font-semibold appearance-none cursor-pointer",
                                isDisabled
                                  ? "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] cursor-not-allowed border-slate-200/80 dark:border-zinc-800"
                                  : "bg-[var(--ds-surface)] border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] text-[var(--ds-fg)]"
                              )}
                            >
                              <option value="">{emptyLabel}</option>
                              {editChildLocations.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                          </div>
                        </BioField>
                      );
                    })()}

                    {editJenis !== "MMP" && (
                      <BioField label="Masa Kerja">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editForm.masa_kerja}
                              onChange={(e) => setEditForm({ ...editForm, masa_kerja: e.target.value })}
                              placeholder="Contoh: 4 Tahun 5 Bulan"
                              className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] text-sm font-semibold text-[var(--ds-fg)] outline-none transition-colors" aria-label="Masa kerja"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const autoVal = calculateMasaKerja(editForm.nip, editForm.nama_lengkap);
                                setEditForm({ ...editForm, masa_kerja: autoVal });
                                toast.info(`Masa kerja direset ke hitungan otomatis: ${autoVal}`);
                              }}
                              className="shrink-0 h-11 px-3 text-xs font-semibold text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] rounded-lg gap-2 cursor-pointer"
                              title="Hitung ulang otomatis berdasarkan NIP & Gelar"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Reset Otomatis</span>
                            </Button>
                          </div>
                          <p className="text-xs text-[var(--ds-fg-muted)]">
                            Terisi otomatis dari NIP & gelar. Admin dapat menyesuaikan jika terdapat penyesuaian masa kerja (PMK).
                          </p>
                        </div>
                      </BioField>
                    )}

                    {/* FIELD: Nomor WhatsApp / HP */}
                    <BioField label="Nomor WhatsApp / HP">
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.telepon}
                          onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                          placeholder="Misal: 081234567890"
                          className="w-full px-4 py-3 pl-10 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold font-mono text-[var(--ds-fg)]" aria-label="Nomor telepon"
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-status-success-fg)] pointer-events-none" />
                      </div>
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                        Format nomor HP lokal diawali 08 (misal: 081234567890).
                      </p>
                    </BioField>

                    {/* FIELD: Alamat Email Resmi */}
                    <BioField label="Alamat Email Resmi">
                      <div className="relative">
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="Misal: nama@kemenlhk.go.id atau @bksda.local"
                          className="w-full px-4 py-3 pl-10 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold font-mono text-[var(--ds-fg)]" aria-label="Email pegawai"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-accent-fg)] pointer-events-none" />
                      </div>
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                        Email login dan notifikasi persuratan resmi pegawai.
                      </p>
                    </BioField>

                    {/* FIELD: Bank Penyalur Uang Makan (Tersinkronisasi dari Pengaturan) */}
                    {editJenis !== "MMP" && (
                    <>
                    <BioField label="Bank Penyalur Uang Makan">
                      <div className="relative">
                        <select
                          value={editForm.nama_bank}
                          onChange={(e) => setEditForm({ ...editForm, nama_bank: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)] appearance-none cursor-pointer" aria-label="Bank pembayaran"
                        >
                          {availableBanks.map((b) => (
                            <option key={b} value={b}>
                              Bank {b}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                      </div>

                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 text-xs text-[var(--ds-fg-muted)] mt-2">
                        <span>Pilihan bank tersinkronisasi otomatis dari Pengaturan.</span>
                        <Link
                          href="/kepegawaian/settings?tab=uang_makan&sub=banks"
                          className="text-[var(--ds-accent-fg)] hover:underline font-semibold flex items-center gap-1 w-fit"
                          target="_blank"
                        >
                          <span>+ Daftarkan bank baru di Pengaturan</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </BioField>

                    {/* FIELD: Nomor Rekening Bank */}
                    <BioField label="Nomor Rekening Bank">
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.nomor_rekening}
                          onChange={(e) => setEditForm({ ...editForm, nomor_rekening: e.target.value })}
                          placeholder="Nomor rekening tanpa spasi / tanda hubung"
                          className="w-full px-4 py-3 pl-10 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold font-mono text-[var(--ds-fg)]" aria-label="Nomor rekening"
                        />
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-accent-fg)] pointer-events-none" />
                      </div>
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                        Nomor rekening buku tabungan atas nama pegawai yang bersangkutan.
                      </p>
                    </BioField>
                    </>
                    )}

                    <BioField label="Status Keaktifan">
                      <div className="relative">
                        <select
                          value={editForm.is_active ? "active" : "inactive"}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_active: e.target.value === "active" })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 focus:ring-2 focus:ring-[var(--ds-status-success-border)] focus:border-[var(--ds-status-success-border)] outline-none text-sm font-semibold text-[var(--ds-fg)] appearance-none cursor-pointer"
                        >
                          <option value="active">Aktif Bertugas</option>
                          <option value="inactive">Non-Aktif</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                      </div>
                    </BioField>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RIWAYAT PENUGASAN */}
          {activeTab === "history" && (
            <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xs">
              <AssignmentLetterHistory employeeId={String(employee.id)} />
            </div>
          )}

          {/* TAB 3: CUTI PEGAWAI */}
          {activeTab === "leave" && !isMmp && (
            <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xs">
              <EmployeeLeaveTab employeeId={employee.id} />
            </div>
          )}

          {/* TAB 4: PRESENSI & UANG MAKAN */}
          {activeTab === "meal_allowance" && !isMmp && (
            <EmployeeMealAllowanceTab employee={employee} />
          )}

          {/* TAB 5: RIWAYAT PERUBAHAN (ADMIN ONLY) */}
          {activeTab === "audit" && isAdmin && (
            <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xs">
              <EmployeeAuditHistoryTab employeeId={employee.id} />
            </div>
          )}
            </KepegawaianTabContent>
          </AnimatePresence>
        </div>
      </div>

      {/* Reset Password Dialog */}
      {resetDialogOpen && (
        <KepegawaianDialog title="Reset password pegawai" onClose={() => setResetDialogOpen(false)} busy={resetting} className="sm:max-w-md">
          <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-lg space-y-4">
            <h3 className="text-xl font-bold text-[var(--ds-fg)]">Reset Password</h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Masukkan password baru untuk akun pegawai{" "}
              <span className="font-semibold text-[var(--ds-fg)]">
                {employee.nama_lengkap}
              </span>.
            </p>
            <div className="p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--ds-fg-muted)]">{empCategory === "MMP" ? "Username Portal:" : "Username / NIP:"}</span>
              <span className="font-bold text-[var(--ds-fg)]">{employee.nip}</span>
            </div>
            <input
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--ds-status-warning-border)] text-[var(--ds-fg)]" aria-label="Minimal 8 karakter"
            />
            <div className="flex items-center gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs cursor-pointer"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="rounded-lg bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-bold cursor-pointer"
                onClick={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? "Mereset..." : "Ya, Reset Password"}
              </Button>
            </div>
          </div>
        </KepegawaianDialog>
      )}

      {/* IAM Access Sheet Modal */}
      {canManageAccess && (
        <EmployeeAccessSheet
          employee={employee}
          open={accessSheetOpen}
          returnFocusRef={accessTriggerRef}
          onOpenChange={setAccessSheetOpen}
        />
      )}

      {/* Employee Lifecycle (Pensiun/Status) Modal */}
      {canWrite && (
        <EmployeeLifecycleModal
          employee={employee}
          open={lifecycleModalOpen}
          onOpenChange={setLifecycleModalOpen}
        />
      )}
    </div>
  );
}

function BioItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--ds-fg-muted)] mb-1">{label}</p>
      <p className="text-xs font-bold text-[var(--ds-fg)]">{value}</p>
    </div>
  );
}

function BioField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--ds-fg-muted)] mb-2">{label}</p>
      {children}
    </div>
  );
}
