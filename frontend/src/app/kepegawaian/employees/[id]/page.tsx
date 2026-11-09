"use client";

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
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { AssignmentLetterHistory } from "../_components/AssignmentLetterHistory";
import { EmployeeAccessSheet } from "../../_components/EmployeeAccessSheet";
import { EmployeeLeaveTab } from "../_components/EmployeeLeaveTab";
import { EmployeeAuditHistoryTab } from "../_components/EmployeeAuditHistoryTab";
import { EmployeeMealAllowanceTab } from "../_components/EmployeeMealAllowanceTab";
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
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PANGKAT_PNS_OPTIONS,
  PANGKAT_PPPK_OPTIONS,
  JENIS_PEGAWAI_OPTIONS,
  RESOR_OPTIONS,
  SATUAN_KERJA_OPTIONS as UNIT_KERJA_OPTIONS,
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

function CopyIcon({ copied, checkClass = "text-emerald-600" }: { copied: boolean; checkClass?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {copied ? (
        <motion.span
          key="check"
          initial={{ scale: 0.5, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="inline-flex"
        >
          <Check className={cn("w-3.5 h-3.5", checkClass)} />
        </motion.span>
      ) : (
        <motion.span
          key="copy"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          className="inline-flex"
        >
          <Copy className="w-3.5 h-3.5" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);

  // Tab utama default: Biodata Lengkap
  const [activeTab, setActiveTab] = useState<
    "biodata" | "history" | "leave" | "meal_allowance" | "audit"
  >("biodata");

  const { canManageAccess, canWrite, isAdmin } = useRole();

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Biodata edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editJenis, setEditJenis] = useState<JenisPegawai>("PNS");
  const [editForm, setEditForm] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
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
    enabled: !!id && !isMmpEmployee(employee),
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
    enabled: !!id,
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
    enabled: !!id && !isMmpEmployee(employee),
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
  });

  const availableBanks = useMemo(() => {
    const list = registeredBanksData?.map((b) => b.nama_bank) || ["BRI", "Mandiri"];
    if (editForm.nama_bank && !list.some((b) => b.toUpperCase() === editForm.nama_bank.toUpperCase())) {
      return [...list, editForm.nama_bank];
    }
    return list;
  }, [registeredBanksData, editForm.nama_bank]);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const startEditing = () => {
    if (!employee) return;
    const detected = detectEmployeeType(employee);
    setEditJenis(detected);
    setEditForm({
      nip: detected === "MMP" ? "" : cleanFieldValue(employee.nip),
      nama_lengkap: cleanFieldValue(employee.nama_lengkap),
      jabatan: cleanFieldValue(employee.jabatan),
      pangkat_golongan: detected === "MMP" ? "" : cleanFieldValue(employee.pangkat_golongan),
      satuan_kerja: cleanFieldValue(employee.satuan_kerja),
      resor: cleanFieldValue(employee.resor),
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

  const handleEditSatkerChange = (val: string) => {
    const isBalai =
      val.toLowerCase().includes("balai") ||
      (val.toLowerCase().includes("samarinda") &&
        !val.toLowerCase().includes("wilayah ii") &&
        !val.toLowerCase().includes("skw ii") &&
        !val.toLowerCase().includes("resor 05"));
    setEditForm((prev) => ({
      ...prev,
      satuan_kerja: val,
      resor: isBalai ? "" : prev.resor,
      jabatan:
        editJenis === "MMP" && isAutoMmpJabatan(prev.jabatan)
          ? buildMmpDefaultJabatan(val)
          : prev.jabatan,
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
      <div className="p-4 sm:p-6 lg:p-8 2xl:px-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-h-screen">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 xl:col-span-3 h-[600px] bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="h-[460px] bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="p-6 md:p-10 py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Pegawai Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Data pegawai yang Anda cari mungkin telah dinonaktifkan atau dihapus dari sistem.
        </p>
        <Button variant="default" className="rounded-xl" onClick={() => router.push("/kepegawaian/employees")}>
          Kembali ke Daftar Pegawai
        </Button>
      </div>
    );
  }

  const empCategory = detectEmployeeType(employee);
  const isMmp = isMmpEmployee(employee);

  useEffect(() => {
    if (isMmp && (activeTab === "leave" || activeTab === "meal_allowance")) {
      setActiveTab("biodata");
    }
  }, [isMmp, activeTab]);
  const editPangkatOptions = editJenis === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
  const bankTheme = getBankTheme(employee.nama_bank || "BRI");
  const validTelepon = cleanFieldValue(employee.telepon);
  const validEmail = cleanFieldValue(employee.email);
  const validRekening = cleanFieldValue(employee.nomor_rekening);
  const waLink = getWaLink(validTelepon);
  const latestAllowance = allowancesData?.data?.[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 2xl:px-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-h-screen">
      {/* Top Breadcrumb & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/kepegawaian/employees"
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Pegawai</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-xs font-medium text-slate-500 truncate max-w-[200px] sm:max-w-md">
            {employee.nama_lengkap}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-700 dark:text-slate-300 cursor-pointer"
              onClick={() => setResetDialogOpen(true)}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Reset Password</span>
            </Button>
          )}
          {canManageAccess && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 cursor-pointer"
              onClick={() => setAccessSheetOpen(true)}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kelola Akses (IAM)</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-600 dark:border-t-emerald-500 rounded-3xl p-6 shadow-xs">

            {/* Profile Avatar & Primary Badges */}
            <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                  {employee.foto_url ? (
                    <Image
                      src={employee.foto_url}
                      alt={employee.nama_lengkap}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-black text-slate-400">
                      {employee.nama_lengkap.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Status Dot */}
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs",
                    employee.is_active ? "bg-emerald-500" : "bg-rose-500"
                  )}
                  title={employee.is_active ? "Status: Pegawai Aktif" : "Status: Non-Aktif"}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>

                {/* Upload Photo Overlay (for admins) */}
                {canManageAccess && (
                  <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-semibold">
                    <User className="w-6 h-6 mb-1" />
                    <span>Ubah Foto</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("Ukuran foto maksimal 10MB");
                          return;
                        }
                        const fd = new FormData();
                        fd.append("foto", file);
                        try {
                          await api.post(`/kepegawaian/employees/${id}/photo`, fd);
                          toast.success("Foto profil berhasil diperbarui!");
                          queryClient.invalidateQueries({ queryKey: ["employee", id] });
                        } catch {
                          toast.error("Gagal mengupload foto.");
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Name & Category Badges */}
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {employee.nama_lengkap}
              </h1>

              <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    empCategory === "MMP"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : empCategory === "PPPK"
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  )}
                >
                  {empCategory === "PPPK" ? "PPPK (P3K)" : empCategory}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full",
                    employee.is_active
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  )}
                >
                  <BadgeCheck className="w-3 h-3" />
                  {employee.is_active ? "Aktif Bertugas" : "Non-Aktif"}
                </span>
              </div>

              {/* NIP with 1-click Copy */}
              <div className="mt-2.5 flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-100 dark:border-slate-800">
                <span>
                  {empCategory === "MMP"
                    ? "MMP • Tanpa NIP"
                    : `${formatNipLabel(employee, true)} ${employee.nip}`}
                </span>
                {empCategory !== "MMP" && employee.nip && (
                  <button
                    type="button"
                    onClick={() => handleCopy(employee.nip, "nip")}
                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 rounded cursor-pointer"
                    title="Salin NIP"
                  >
                    <CopyIcon copied={copiedField === "nip"} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Details List */}
            <div className="py-4 space-y-3 text-xs border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jabatan</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {employee.jabatan || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Kerja</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {employee.satuan_kerja || "-"}
                  </p>
                  {employee.resor && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Resor: {RESOR_OPTIONS.find((r) => r.code === employee.resor)?.name || employee.resor}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Hash className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pangkat & Golongan</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {empCategory === "MMP" ? "-" : employee.pangkat_golongan || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Card 1: Kontak & Komunikasi (WhatsApp + Email) */}
            <div className="pt-4 pb-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Kontak & Komunikasi
                </span>
              </div>

              {/* Baris WhatsApp / Telepon */}
              {validTelepon ? (
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                      {validTelepon}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      WhatsApp / HP Resmi
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(employee.telepon!, "telepon")}
                      className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Salin Nomor HP"
                    >
                      <CopyIcon copied={copiedField === "telepon"} />
                    </button>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                        title="Buka Chat WhatsApp Web"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp belum diatur</span>
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
              )}

              {/* Baris Email Pegawai */}
              {validEmail ? (
                <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                      {validEmail}
                    </p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-400">
                      Email Akun Resmi
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(employee.email!, "email")}
                      className="p-1.5 rounded-lg border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Salin Alamat Email"
                    >
                      <CopyIcon copied={copiedField === "email"} checkClass="text-blue-600" />
                    </button>
                    <a
                      href={`mailto:${validEmail}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                      title="Kirim Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Kirim</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email belum diatur</span>
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sub-Card 2: Rekening Bank Penyalur Uang Makan */}
            {!isMmp && (
            <div className="pt-2 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  Rekening Uang Makan
                </span>
                {validRekening && (
                  <button
                    type="button"
                    onClick={() => handleCopy(validRekening, "rekening")}
                    className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Salin Nomor Rekening"
                  >
                    <CopyIcon copied={copiedField === "rekening"} />
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "p-3 rounded-2xl border transition-all",
                  bankTheme.border,
                  "bg-slate-50/60 dark:bg-slate-800/40"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-black border",
                      bankTheme.bgBadge
                    )}
                  >
                    {employee.nama_bank || "BRI"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {employee.nama_bank ? "Penyalur Terdaftar" : "Default"}
                  </span>
                </div>

                {validRekening ? (
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                      {validRekening}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      a.n {employee.nama_lengkap}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-400">No. Rekening belum diinput</p>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        + Tambah
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Quick Action Button */}
            {canWrite && !isEditing && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-2xl gap-2 font-bold text-xs h-10 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={startEditing}
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
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
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* Metric 1: Masa Kerja */}
            <motion.div
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={() => setActiveTab("biodata")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer transition-colors shadow-2xs hover:shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Masa Kerja</span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                {empCategory === "MMP"
                  ? "-"
                  : employee.masa_kerja || calculateMasaKerja(employee.nip, employee.nama_lengkap)}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Pengabdian Resmi</p>
            </motion.div>

            {/* Metric 2: Riwayat Penugasan */}
            <motion.div
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={() => setActiveTab("history")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-colors shadow-2xs hover:shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Penugasan</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {assignmentsData?.meta?.total ?? 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Total Surat Tugas</p>
            </motion.div>

            {/* Metric 3: Sisa Cuti PNS */}
            {!isMmp && (
            <motion.div
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={() => setActiveTab("leave")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-colors shadow-2xs hover:shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sisa Cuti</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {leaveBalance?.sisa_cuti_tersedia ?? 12}{" "}
                <span className="text-xs font-semibold text-slate-400">Hari</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Tahun {currentYear}</p>
            </motion.div>
            )}

            {/* Metric 4: Uang Makan Terakhir */}
            {!isMmp && (
            <motion.div
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={() => setActiveTab("meal_allowance")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-colors shadow-2xs hover:shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Uang Makan</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                {latestAllowance ? formatRupiah(latestAllowance.uang_makan_netto) : "Rp 0"}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {latestAllowance?.batch?.periode_bulan || "Bulan berjalan"}
              </p>
            </motion.div>
            )}
          </div>

          {/* Dynamic Tabs Navigation Bar (WRAP 2-TINGKAT, TANPA SCROLL HORIZONTAL) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Tab 1: Biodata Lengkap (UTAMA - DEFAULT AKTIF) */}
              <button
                type="button"
                onClick={() => setActiveTab("biodata")}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "biodata"
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                )}
              >
                {activeTab === "biodata" && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-emerald-600 text-white shadow-xs rounded-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <User className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Biodata Lengkap</span>
              </button>

              {/* Tab 2: Riwayat Penugasan */}
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "history"
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                )}
              >
                {activeTab === "history" && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-emerald-600 text-white shadow-xs rounded-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <FileText className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Riwayat Penugasan</span>
                {assignmentsData?.meta && (
                  <span
                    className={cn(
                      "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                    )}
                  >
                    {assignmentsData.meta.total}
                  </span>
                )}
              </button>

              {/* Tab 3: Cuti Pegawai (PNS) */}
              {!isMmp && (
              <button
                type="button"
                onClick={() => setActiveTab("leave")}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "leave"
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                )}
              >
                {activeTab === "leave" && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-emerald-600 text-white shadow-xs rounded-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Calendar className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Cuti Pegawai (PNS)</span>
                <span
                  className={cn(
                    "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-black",
                    activeTab === "leave"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  )}
                >
                  {leaveBalance?.sisa_cuti_tersedia ?? 12} Hari
                </span>
              </button>
              )}

              {/* Tab 4: Presensi & Uang Makan */}
              {!isMmp && (
              <button
                type="button"
                onClick={() => setActiveTab("meal_allowance")}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                  activeTab === "meal_allowance"
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                )}
              >
                {activeTab === "meal_allowance" && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-emerald-600 text-white shadow-xs rounded-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <UtensilsCrossed className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Presensi & Uang Makan</span>
                {allowancesData?.meta?.total !== undefined && allowancesData.meta.total > 0 && (
                  <span
                    className={cn(
                      "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      activeTab === "meal_allowance" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
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
                  className={cn(
                    "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                    activeTab === "audit"
                      ? "text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                  )}
                >
                  {activeTab === "audit" && (
                    <motion.span
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-emerald-600 text-white shadow-xs rounded-xl"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <History className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">Riwayat Perubahan</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Content Panels with Motion Glide Transition */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {/* TAB 1: BIODATA LENGKAP (DEFAULT AKTIF) */}
          {activeTab === "biodata" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    Identitas & Data Lengkap Pegawai
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isMmp
                      ? "Informasi profil resmi, unit kerja penempatan, serta kontak WhatsApp & Email"
                      : "Informasi profil resmi, unit kerja penempatan, kontak WhatsApp & Email, serta rekening bank uang makan"}
                  </p>
                </div>

                {canWrite && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400 cursor-pointer"
                    onClick={startEditing}
                  >
                    <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit Biodata</span>
                  </Button>
                )}

                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 text-xs cursor-pointer"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </Button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-6">
                  {/* Bagian 1: Data Kepegawaian Utama */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      Data Kepegawaian & Penempatan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
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
                        label={empCategory === "PPPK" ? "NIPPPK" : "NIP"}
                        value={empCategory === "MMP" ? "- (Tanpa NIP)" : employee.nip}
                      />
                      <BioItem label="Nama Lengkap" value={employee.nama_lengkap} />
                      <BioItem label="Jabatan Resmi" value={employee.jabatan || "-"} />
                      <BioItem
                        label="Pangkat / Golongan"
                        value={empCategory === "MMP" ? "-" : employee.pangkat_golongan || "-"}
                      />
                      <BioItem label="Satuan / Unit Kerja" value={employee.satuan_kerja || "-"} />
                      <BioItem
                        label="Resor Lapangan"
                        value={
                          RESOR_OPTIONS.find((r) => r.code === employee.resor)?.name ||
                          employee.resor ||
                          "Kantor Balai / Seksi Wilayah"
                        }
                      />
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
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      Kontak WhatsApp & Email
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Nomor WhatsApp / HP
                          </p>
                          <p className={cn("text-sm mt-0.5", validTelepon ? "font-mono font-bold text-slate-800 dark:text-slate-200" : "font-medium text-slate-400")}>
                            {validTelepon || "Belum diatur"}
                          </p>
                        </div>
                        {validTelepon && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(employee.telepon!, "bio-tel")}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Salin Nomor HP"
                            >
                              {copiedField === "bio-tel" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                title="Chat WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Alamat Email Resmi
                          </p>
                          <p className={cn("text-sm mt-0.5", validEmail ? "font-mono font-bold text-slate-800 dark:text-slate-200" : "font-medium text-slate-400")}>
                            {validEmail || "Belum diatur"}
                          </p>
                        </div>
                        {validEmail && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(employee.email!, "bio-mail")}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Salin Alamat Email"
                            >
                              {copiedField === "bio-mail" ? (
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={`mailto:${employee.email}`}
                              className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              title="Kirim Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Finansial & Rekening Uang Makan */}
                  {!isMmp && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                      Rekening Bank Penyalur Uang Makan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Bank Penyalur
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-xs font-black border",
                                bankTheme.bgBadge
                              )}
                            >
                              {employee.nama_bank || "BRI"}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              (Pemisahan nominatif otomatis)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Nomor Rekening Bank
                          </p>
                          <p className={cn("text-sm mt-0.5", validRekening ? "font-mono font-bold text-slate-800 dark:text-slate-200 tracking-wider" : "font-medium text-slate-400")}>
                            {validRekening || "Belum diatur"}
                          </p>
                        </div>
                        {validRekening && (
                          <button
                            type="button"
                            onClick={() => handleCopy(employee.nomor_rekening!, "bio-rek")}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Salin Nomor Rekening"
                          >
                            {copiedField === "bio-rek" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {JENIS_PEGAWAI_OPTIONS.map((opt) => {
                        const isSelected = editJenis === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleEditJenisChange(opt.value)}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer",
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500/20"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between w-full mb-0.5">
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                                )}
                              >
                                {opt.label}
                              </span>
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  isSelected ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                                )}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">{opt.desc}</span>
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
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white font-mono"
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
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </BioField>
                    </div>

                    <div className={editJenis === "MMP" ? "sm:col-span-2" : ""}>
                      <BioField label="Jabatan">
                        <input
                          type="text"
                          value={editForm.jabatan}
                          onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white"
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
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
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
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </BioField>
                    )}

                    <BioField label="Unit Kerja">
                      <div className="relative">
                        <select
                          value={editForm.satuan_kerja}
                          onChange={(e) => handleEditSatkerChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="">Pilih Unit Kerja</option>
                          {UNIT_KERJA_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </BioField>

                    {(() => {
                      const satker = (editForm.satuan_kerja || "").toLowerCase();
                      const isBalai =
                        satker.includes("balai") ||
                        (satker.includes("samarinda") &&
                          !satker.includes("wilayah ii") &&
                          !satker.includes("skw ii") &&
                          !satker.includes("resor 05"));
                      let availableResors = RESOR_OPTIONS;
                      if (
                        satker.includes("wilayah iii") ||
                        satker.includes("skw iii") ||
                        satker.includes("balikpapan") ||
                        satker.includes("seksi 3") ||
                        satker.includes("seksi iii")
                      ) {
                        availableResors = RESOR_OPTIONS.filter((r) => r.skw === "SKW_3");
                      } else if (
                        satker.includes("wilayah ii") ||
                        satker.includes("skw ii") ||
                        satker.includes("tenggarong") ||
                        satker.includes("seksi 2") ||
                        satker.includes("seksi ii")
                      ) {
                        availableResors = RESOR_OPTIONS.filter((r) => r.skw === "SKW_2");
                      } else if (
                        satker.includes("wilayah i") ||
                        satker.includes("skw i") ||
                        satker.includes("berau") ||
                        satker.includes("seksi 1") ||
                        satker.includes("seksi i")
                      ) {
                        availableResors = RESOR_OPTIONS.filter((r) => r.skw === "SKW_1");
                      }

                      return (
                        <BioField label="Resor Penempatan">
                          <div className="relative">
                            <select
                              disabled={isBalai}
                              value={isBalai ? "" : (editForm.resor || "")}
                              onChange={(e) => setEditForm({ ...editForm, resor: e.target.value })}
                              className={cn(
                                "w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold appearance-none cursor-pointer",
                                isBalai
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-700"
                                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
                              )}
                            >
                              {isBalai ? (
                                <option value="">Pegawai Balai (Bukan Resor Lapangan)</option>
                              ) : (
                                <>
                                  <option value="">Kantor Seksi Wilayah (Bukan Resor)</option>
                                  {availableResors.map((opt) => (
                                    <option key={opt.code} value={opt.code}>
                                      {opt.name}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </BioField>
                      );
                    })()}

                    {editJenis !== "MMP" && (
                      <BioField label="Masa Kerja">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editForm.masa_kerja}
                              onChange={(e) => setEditForm({ ...editForm, masa_kerja: e.target.value })}
                              placeholder="Contoh: 4 Tahun 5 Bulan"
                              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-900 dark:text-white outline-none transition-all"
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
                              className="shrink-0 h-11 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 rounded-xl gap-1.5 cursor-pointer"
                              title="Hitung ulang otomatis berdasarkan NIP & Gelar"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Otomatis</span>
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-400">
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
                          className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold font-mono text-slate-900 dark:text-white"
                        />
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
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
                          className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold font-mono text-slate-900 dark:text-white"
                        />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
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
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          {availableBanks.map((b) => (
                            <option key={b} value={b}>
                              Bank {b}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 mt-1.5">
                        <span>Pilihan bank tersinkronisasi otomatis dari Pengaturan.</span>
                        <Link
                          href="/kepegawaian/settings?tab=uang_makan&sub=banks"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 w-fit"
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
                          className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold font-mono text-slate-900 dark:text-white"
                        />
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
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
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="active">Aktif Bertugas</option>
                          <option value="inactive">Non-Aktif</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </BioField>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RIWAYAT PENUGASAN */}
          {activeTab === "history" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <AssignmentLetterHistory employeeId={String(employee.id)} />
            </div>
          )}

          {/* TAB 3: CUTI PEGAWAI */}
          {activeTab === "leave" && !isMmp && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <EmployeeLeaveTab employeeId={employee.id} />
            </div>
          )}

          {/* TAB 4: PRESENSI & UANG MAKAN */}
          {activeTab === "meal_allowance" && !isMmp && (
            <EmployeeMealAllowanceTab employee={employee} />
          )}

          {/* TAB 5: RIWAYAT PERUBAHAN (ADMIN ONLY) */}
          {activeTab === "audit" && isAdmin && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <EmployeeAuditHistoryTab employeeId={employee.id} />
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Reset Password Dialog */}
      {resetDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset Password</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Masukkan password baru untuk akun pegawai{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {employee.nama_lengkap}
              </span>.
            </p>
            <input
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-amber-500 text-slate-900 dark:text-white"
            />
            <div className="flex items-center gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs cursor-pointer"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                onClick={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? "Mereset..." : "Ya, Reset Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* IAM Access Sheet Modal */}
      {canManageAccess && (
        <EmployeeAccessSheet
          employee={employee}
          open={accessSheetOpen}
          onOpenChange={setAccessSheetOpen}
        />
      )}
    </div>
  );
}

function BioItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function BioField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}
