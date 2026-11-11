"use client";

import { useKepegawaianTabs } from "../_lib/useKepegawaianTabs";

import { KepegawaianTabContent } from "../_components/KepegawaianTabContent";

import { KepegawaianDialog } from "../_components/KepegawaianDialog";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  History,
  FileText,
  Save,
  Trash2,
  ChevronDown,
  Info,
  Check,
  X,
  FileUp,
  Sparkles,
  Users,
  Coins,
  RotateCcw,
  Edit3,
  Lock,
  Settings,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Status options for daily attendance
const STATUS_OPTIONS = [
  { code: "H", label: "Hadir (Dapat Uang Makan)", desc: "Pegawai hadir di kantor / WFO / WFH sah", color: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]   border-[var(--ds-status-success-border)]" },
  { code: "PD", label: "Perjalanan Dinas (SPPD)", desc: "Dinas luar kota (uang saku masuk di SPPD)", color: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]   border-[var(--ds-status-warning-border)]" },
  { code: "CT", label: "Cuti Sah", desc: "Cuti Tahunan, Alasan Penting, Bersalin", color: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   border-[var(--ds-accent-soft-border)]" },
  { code: "S", label: "Sakit", desc: "Sakit dengan bukti surat keterangan dokter", color: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   border-[var(--ds-accent-soft-border)]" },
  { code: "I", label: "Izin Resmi", desc: "Izin kedinasan resmi tertulis", color: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   border-[var(--ds-accent-soft-border)]" },
  { code: "TK", label: "Tanpa Keterangan / Alpa", desc: "Tidak ada presensi masuk & tidak ada keterangan", color: "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]   border-[var(--ds-status-danger-border)]" },
  { code: "-", label: "Hari Libur / Akhir Pekan", desc: "Sabtu, Minggu, atau Hari Libur Nasional SKB", color: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]   border-[var(--ds-border-subtle)]" },
];

export interface ReconciledEmployeeItem {
  nip: string;
  nama: string;
  jabatan: string;
  golongan: string;
  jenis_pegawai?: string;
  nama_bank?: string;
  nomor_rekening?: string;
  telepon?: string;
  tarif: number;
  pph_rate: number;
  daily_matrix: Record<string, string>;
  override_logs: Array<{
    date: string;
    from: string;
    to: string;
    reason: string;
    st_nomor?: string;
  }>;
  total_working_days: number;
  total_hadir: number;
  total_pd: number;
  total_cuti: number;
  total_sakit: number;
  total_izin: number;
  total_alpa: number;
  total_bruto: number;
  total_pph: number;
  total_netto: number;
}

export interface SavedBatchSummary {
  id: number;
  title: string;
  month: number;
  year: number;
  total_employees: number;
  grand_total_netto: number;
  created_at: string;
}

export default function UangMakanPage() {
  const { role, isAdmin } = useRole();
  const reducedMotion = useReducedMotion();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<"upload" | "matrix" | "nominatif" | "history">("upload");
  const [selectedMonth, setSelectedMonth] = useState<string>("09");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [filterGroup, setFilterGroup] = useState<"all" | "pns" | "pppk">("all");
  const [filterCategory, setFilterCategory] = useState<"all" | "PNS_BRI" | "PNS_MNDRI" | "PPPK_MNDRI" | "PPPK_BRI">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyOverrides, setOnlyOverrides] = useState(false);

  // Reconciled Data State
  const [items, setItems] = useState<ReconciledEmployeeItem[]>([]);
  const [daysInMonth, setDaysInMonth] = useState<number>(30);
  const [holidays, setHolidays] = useState<Record<string, { day: number; date: string; name: string; is_cuti_bersama?: boolean }> | any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const tabs = useKepegawaianTabs(activeTab, "Data uang makan");

  // Modal Peringatan Beda Periode Bulan saat Upload Bareng
  const [mismatchedModal, setMismatchedModal] = useState<{
    open: boolean;
    message: string;
    groups: Array<{
      periode: string;
      label: string;
      files: Array<{
        filename: string;
        nama: string;
        nip: string;
        periode: string;
        label: string;
      }>;
    }>;
  }>({
    open: false,
    message: "",
    groups: [],
  });

  // Admin Cell Editing Modal State
  const [editingModal, setEditingModal] = useState<{
    item: ReconciledEmployeeItem;
    day: number;
    currentCode: string;
    reason: string;
  } | null>(null);

  // Helper identifikasi libur nasional & cuti bersama
  const getHolidayInfo = (day: number) => {
    if (!holidays) return null;
    if (Array.isArray(holidays)) {
      return (holidays as Array<{ day: number; date: string; name: string; is_cuti_bersama?: boolean }>).find(
        (h) => h.day === day || h.date?.endsWith(`-${String(day).padStart(2, "0")}`)
      ) || null;
    }
    const map = holidays as Record<string, { day: number; date: string; name: string; is_cuti_bersama?: boolean }>;
    return map[day] || map[String(day)] || null;
  };

  // Sinkronisasi kalender hari kerja, akhir pekan, libur nasional, dan cuti bersama
  useEffect(() => {
    let isMounted = true;
    const fetchCalendar = async () => {
      try {
        const res = await api.get(`/kepegawaian/uang-makan/calendar?year=${selectedYear}&month=${selectedMonth}`);
        if (res.data?.success && isMounted) {
          setDaysInMonth(res.data.data.days_in_month || 30);
          setHolidays(res.data.data.holidays || {});
        }
      } catch {
        if (isMounted) {
          const d = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
          setDaysInMonth(d);
        }
      }
    };
    fetchCalendar();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear]);

  // Breakdown 4 Kategori Sheet Standar BKSDA Kaltim (PNS/PPPK x Mandiri/BRI)
  const sheetCategoryStats = useMemo(() => {
    const stats = {
      PNS_BRI: { count: 0, netto: 0 },
      PNS_MNDRI: { count: 0, netto: 0 },
      PPPK_MNDRI: { count: 0, netto: 0 },
      PPPK_BRI: { count: 0, netto: 0 },
    };

    items.forEach((it) => {
      const isPppk = it.jenis_pegawai
        ? it.jenis_pegawai === "PPPK"
        : (it.golongan || "").toLowerCase().includes("pppk");
      const isMandiri = (it.nama_bank || "").toLowerCase().includes("mandiri");
      if (!isPppk && !isMandiri) {
        stats.PNS_BRI.count++;
        stats.PNS_BRI.netto += it.total_netto;
      } else if (!isPppk && isMandiri) {
        stats.PNS_MNDRI.count++;
        stats.PNS_MNDRI.netto += it.total_netto;
      } else if (isPppk && isMandiri) {
        stats.PPPK_MNDRI.count++;
        stats.PPPK_MNDRI.netto += it.total_netto;
      } else {
        stats.PPPK_BRI.count++;
        stats.PPPK_BRI.netto += it.total_netto;
      }
    });

    return stats;
  }, [items]);

  // Saved Batches State
  const [savedBatches, setSavedBatches] = useState<SavedBatchSummary[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchesError, setBatchesError] = useState(false);
  const [currentBatchTitle, setCurrentBatchTitle] = useState("Rekonsiliasi Uang Makan BKSDA Kaltim");

  // Load saved batches on mount and history tab switch

  const fetchBatches = async () => {
    setLoadingBatches(true);
    setBatchesError(false);
    try {
      const res = await api.get("/kepegawaian/uang-makan/batches");
      if (res.data?.success) {
        const batchList = res.data.data?.data || res.data.data || [];
        setSavedBatches(
          batchList.map((b: any) => ({
            id: b.id,
            title: b.nama_batch || b.title,
            month: b.periode_bulan ? parseInt(b.periode_bulan.split("-")[1]) : (b.month || 9),
            year: b.periode_bulan ? parseInt(b.periode_bulan.split("-")[0]) : (b.year || 2026),
            total_employees: b.total_pegawai || b.total_employees || 0,
            grand_total_netto: b.total_netto || b.grand_total_netto || 0,
            created_at: b.created_at,
          }))
        );
      }
    } catch {
      setBatchesError(true);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchBatches();
    }
  }, [activeTab]);

  // Normalizer: Menjembatani format backend dan frontend
  const normalizeEmployeeItem = (it: any): ReconciledEmployeeItem => {
    const daily: Record<string, string> = {};
    if (it.daily_matrix) {
      Object.entries(it.daily_matrix).forEach(([k, v]: [string, any]) => {
        if (typeof v === "object" && v !== null) {
          daily[k] = v.is_overridden ? `${v.status}*` : (v.status || "-");
        } else {
          daily[k] = String(v);
        }
      });
    }
    const tarif = it.tarif_harian ?? it.tarif ?? 35000;
    const pph_rate =
      it.persen_pph21 !== undefined
        ? it.persen_pph21 > 1
          ? it.persen_pph21 / 100
          : it.persen_pph21
        : it.pph_rate ?? 0;

    return {
      nip: it.nip,
      nama: it.nama_lengkap ?? it.nama ?? "",
      jabatan: it.jabatan ?? "",
      golongan: it.golongan ?? "",
      jenis_pegawai: it.jenis_pegawai,
      nama_bank: it.nama_bank || "BRI",
      nomor_rekening: it.nomor_rekening || "",
      telepon: it.telepon || "",
      tarif,
      pph_rate,
      daily_matrix: daily,
      override_logs: it.override_logs ?? [],
      total_working_days: it.jml_hari_kerja ?? it.total_working_days ?? 22,
      total_hadir: it.jml_hadir ?? it.total_hadir ?? 0,
      total_pd: it.jml_pd ?? it.total_pd ?? 0,
      total_cuti: it.jml_cuti ?? it.total_cuti ?? 0,
      total_sakit: it.jml_sakit ?? it.total_sakit ?? 0,
      total_izin: it.jml_izin ?? it.total_izin ?? 0,
      total_alpa: it.jml_alpa ?? it.total_alpa ?? 0,
      total_bruto: it.uang_makan_bruto ?? it.total_bruto ?? 0,
      total_pph: it.potongan_pph21 ?? it.total_pph ?? 0,
      total_netto: it.uang_makan_netto ?? it.total_netto ?? 0,
    };
  };

  // Recalculate summary metrics for an employee row
  const recalculateItem = (item: ReconciledEmployeeItem): ReconciledEmployeeItem => {
    let hadir = 0;
    let pd = 0;
    let cuti = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    Object.values(item.daily_matrix).forEach((st) => {
      const clean = st.replace("*", "").trim();
      if (clean === "H") hadir++;
      else if (clean === "PD") pd++;
      else if (clean === "CT") cuti++;
      else if (clean === "S") sakit++;
      else if (clean === "I") izin++;
      else if (clean === "TK") alpa++;
    });

    const total_bruto = hadir * item.tarif;
    const total_pph = Math.round(total_bruto * item.pph_rate);
    const total_netto = total_bruto - total_pph;

    return {
      ...item,
      total_hadir: hadir,
      total_pd: pd,
      total_cuti: cuti,
      total_sakit: sakit,
      total_izin: izin,
      total_alpa: alpa,
      total_bruto,
      total_pph,
      total_netto,
    };
  };

  // Handle cell click (Khusus Admin & Super Admin)
  const handleCellClick = (emp: ReconciledEmployeeItem, day: number) => {
    if (!isAdmin) {
      toast.error("Akses ditolak: Hanya Admin atau Super Admin yang dapat mengoreksi status presensi.");
      return;
    }
    const currentCode = (emp.daily_matrix[day] || "-").replace("*", "");
    setEditingModal({
      item: emp,
      day,
      currentCode,
      reason: "",
    });
  };

  // Submit manual cell edit from modal
  const handleSaveModalEdit = (newCode: string, reasonText: string) => {
    if (!editingModal) return;
    const { item, day, currentCode } = editingModal;

    setItems((prev) =>
      prev.map((it) => {
        if (it.nip !== item.nip) return it;

        const newDaily = { ...it.daily_matrix, [day]: newCode };
        const newLogs = [...it.override_logs];
        if (newCode !== currentCode) {
          newLogs.push({
            date: `${selectedYear}-${selectedMonth}-${String(day).padStart(2, "0")}`,
            from: currentCode,
            to: newCode,
            reason: reasonText.trim() || `Koreksi manual admin (${role})`,
          });
        }

        return recalculateItem({
          ...it,
          daily_matrix: newDaily,
          override_logs: newLogs,
        });
      })
    );

    toast.success(`Tanggal ${day} untuk ${item.nama} berhasil diubah menjadi: ${newCode}`);
    setEditingModal(null);
  };

  // Handle entire column holiday toggle (Header action)
  const handleToggleColumnHoliday = (day: number) => {
    if (!isAdmin) {
      toast.error("Hanya Admin Kepegawaian yang dapat mengubah status libur kolom tanggal.");
      return;
    }

    const isHoliday = items.every((it) => it.daily_matrix[day] === "-");
    const targetStatus = isHoliday ? "H" : "-";

    setItems((prev) =>
      prev.map((item) => {
        const newDaily = { ...item.daily_matrix, [day]: targetStatus };
        return recalculateItem({ ...item, daily_matrix: newDaily });
      })
    );

    toast.info(`Tanggal ${day} telah diatur sebagai: ${targetStatus === "-" ? "Hari Libur (-)" : "Hari Kerja (H)"}`);
  };

  // Upload and process files
  const processUploadedFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setUploadedFiles(files);
    setIsProcessing(true);

    const formData = new FormData();
    files.forEach((f) => formData.append("files[]", f));
    formData.append("periode", `${selectedYear}-${selectedMonth}`);
    formData.append("month", selectedMonth);
    formData.append("year", selectedYear);

    try {
      toast.info(`Memproses dan merekonsiliasi ${files.length} berkas presensi SIKADIR...`);
      const res = await api.post("/kepegawaian/uang-makan/reconcile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const data = res.data.data;
        const normalized = (data.items || []).map(normalizeEmployeeItem);
        setItems(normalized);
        setDaysInMonth(data.days_in_month || 30);
        setHolidays(data.holidays || {});

        // Otomatis sesuaikan bulan & tahun jika terdeteksi dari berkas SIKADIR
        if (data.detected_month && data.detected_year) {
          const newMonth = String(data.detected_month).padStart(2, "0");
          const newYear = String(data.detected_year);
          setSelectedMonth(newMonth);
          setSelectedYear(newYear);
          toast.success(`Periode otomatis disesuaikan ke ${data.detected_period_label || `${newMonth}/${newYear}`}`);
        } else {
          toast.success(`Berhasil merekonsiliasi presensi untuk ${normalized.length} pegawai!`);
        }

        setActiveTab("matrix");
      } else {
        toast.error(res.data?.message || "Gagal memproses file presensi");
      }
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error_code?: string;
            groups?: Array<{
              periode: string;
              label: string;
              files: Array<{
                filename: string;
                nama: string;
                nip: string;
                periode: string;
                label: string;
              }>;
            }>;
          };
        };
      };

      if (e.response?.data?.error_code === "MISMATCHED_PERIODS") {
        setMismatchedModal({
          open: true,
          message: e.response.data.message || "Ditemukan berkas dengan periode bulan yang berbeda.",
          groups: e.response.data.groups || [],
        });
        toast.error("Upload dibatalkan: Berkas memiliki periode bulan berbeda!");
        return;
      }

      toast.error(e.response?.data?.message || "Terjadi kesalahan saat memproses file di server");
    } finally {
      setIsProcessing(false);
    }
  };

  // Muat berkas contoh asli syafey.xls (HANYA Syafey, data riil SIKADIR: 11 Hadir, 11 PD)
  const handleLoadSampleData = () => {
    const days = 30;
    setDaysInMonth(days);
    setSelectedMonth("09");
    setSelectedYear("2026");

    // Data riil SIKADIR September 2026 dari syafey.xls: 11 Hadir, 11 PD, 8 Akhir Pekan
    const syafeyDaily: Record<string, string> = {
      1: "PD", 2: "PD", 3: "H", 4: "H", 5: "-", 6: "-",
      7: "H", 8: "H", 9: "H", 10: "PD", 11: "PD", 12: "-", 13: "-",
      14: "PD", 15: "PD", 16: "PD", 17: "PD", 18: "H", 19: "-", 20: "-",
      21: "H", 22: "H", 23: "H", 24: "H", 25: "H", 26: "-", 27: "-",
      28: "PD", 29: "PD", 30: "PD",
    };

    const syafey: ReconciledEmployeeItem = {
      nip: "200009222024211004",
      nama: "Achmad Syafey N",
      jabatan: "Pengendali Ekosistem Hutan Pemula",
      golongan: "PPPK Golongan V",
      tarif: 35000,
      pph_rate: 0,
      daily_matrix: syafeyDaily,
      override_logs: [],
      total_working_days: 22,
      total_hadir: 11,
      total_pd: 11,
      total_cuti: 0,
      total_sakit: 0,
      total_izin: 0,
      total_alpa: 0,
      total_bruto: 11 * 35000,
      total_pph: 0,
      total_netto: 11 * 35000,
    };

    setItems([syafey]);
    toast.success("Berkas contoh riil syafey.xls (11 Hadir, 11 PD, Rp 385.000) berhasil dimuat!");
    setActiveTab("matrix");
  };

  // Reset / Kosongkan Data Pratinjau & Upload Ulang dengan UI Dialog Modul Kepegawaian
  const handleResetAll = async () => {
    if (items.length > 0) {
      const ok = await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
        title: "Kosongkan Data Pratinjau Presensi?",
        description: (
          <div className="space-y-2 text-left">
            <p>
              Seluruh matriks presensi dari <b>{items.length} pegawai</b> yang sedang ditampilkan serta koreksi manual yang belum disimpan akan dikosongkan.
            </p>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Anda dapat mengunggah berkas SIKADIR baru atau memuat berkas contoh setelahnya.
            </p>
          </div>
        ),
        confirmText: "Kosongkan Data",
        cancelText: "Batal",
        variant: "danger",
        icon: <RotateCcw className="h-7 w-7 text-[var(--ds-status-danger-fg)]" />,
      });
      if (!ok) return;
    }

    setItems([]);
    setUploadedFiles([]);
    setEditingModal(null);
    setSearchQuery("");
    setFilterGroup("all");
    setFilterCategory("all");
    setOnlyOverrides(false);
    setActiveTab("upload");
    toast.info("Data pratinjau telah dikosongkan. Silakan unggah berkas baru.");
  };

  // Simpan Batch ke Database
  const handleSaveBatch = async () => {
    if (items.length === 0) return;

    try {
      const payload = {
        title: currentBatchTitle || `Rekonsiliasi Presensi ${selectedMonth}/${selectedYear}`,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        days_in_month: daysInMonth,
        items,
      };

      const res = await api.post("/kepegawaian/uang-makan/batches", payload);
      if (res.data?.success) {
        toast.success("Batch rekonsiliasi uang makan berhasil disimpan permanen ke database!");
        fetchBatches();
      } else {
        toast.error("Gagal menyimpan batch");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Gagal menyimpan batch");
    }
  };

  // Download Berkas Excel 2-Sheet Resmi
  const handleExportExcel = async () => {
    if (items.length === 0) return;

    try {
      toast.info("Sedang men-generate berkas Excel 2-Sheet resmi BKSDA...");
      const res = await api.post(
        "/kepegawaian/uang-makan/export-excel",
        {
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          days_in_month: daysInMonth,
          items,
        },
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Daftar_Uang_Makan_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Berkas Excel resmi berhasil diunduh!");
    } catch {
      toast.error("Gagal men-download berkas Excel");
    }
  };

  // Hapus batch dari database dengan UI Dialog Modul Kepegawaian
  const handleDeleteBatch = async (id: number, batchTitle?: string) => {
    const ok = await confirm({
      contentModule: "kepegawaian",
      contentClassName: "kpg-ui",
      title: "Hapus Batch dari Database?",
      description: (
        <div className="space-y-2 text-left">
          <p>
            Batch <b>&quot;{batchTitle || "Rekonsiliasi Uang Makan"}&quot;</b> beserta seluruh catatan riwayat absensi dan log override per pegawai akan dihapus permanen.
          </p>
          <p className="text-xs text-[var(--ds-status-danger-fg)] font-medium">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      ),
      confirmText: "Hapus Permanen",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await api.delete(`/kepegawaian/uang-makan/batches/${id}`);
      if (res.data?.success) {
        toast.success("Batch berhasil dihapus dari database");
        fetchBatches();
      }
    } catch {
      toast.error("Gagal menghapus batch");
    }
  };

  // Buka batch dari riwayat
  const handleLoadBatch = async (id: number) => {
    try {
      const res = await api.get(`/kepegawaian/uang-makan/batches/${id}`);
      if (res.data?.success) {
        const b = res.data.data;
        const pMonth = b.periode_bulan ? b.periode_bulan.split("-")[1] : String(b.month || "09");
        const pYear = b.periode_bulan ? b.periode_bulan.split("-")[0] : String(b.year || "2026");
        setSelectedMonth(pMonth.padStart(2, "0"));
        setSelectedYear(pYear);
        setDaysInMonth(b.days_in_month || 30);
        setCurrentBatchTitle(b.nama_batch || b.title);
        const normalized = (b.items || []).map(normalizeEmployeeItem);
        setItems(normalized);
        toast.success(`Batch "${b.nama_batch || b.title}" berhasil dimuat!`);
        setActiveTab("matrix");
      }
    } catch {
      toast.error("Gagal memuat batch tersimpan");
    }
  };

  // Filtered rows for Matrix & Nominatif
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filterGroup === "pns") {
        if (it.golongan.toLowerCase().includes("pppk")) return false;
      } else if (filterGroup === "pppk") {
        if (!it.golongan.toLowerCase().includes("pppk")) return false;
      }

      if (onlyOverrides && it.override_logs.length === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = it.nama.toLowerCase().includes(q);
        const matchNip = it.nip.toLowerCase().includes(q);
        if (!matchNama && !matchNip) return false;
      }

      return true;
    });
  }, [items, filterGroup, onlyOverrides, searchQuery]);

  // Aggregate totals
  const totalEmployees = items.length;
  const totalHadirAll = items.reduce((sum, it) => sum + it.total_hadir, 0);
  const grandTotalBruto = items.reduce((sum, it) => sum + it.total_bruto, 0);
  const grandTotalPph = items.reduce((sum, it) => sum + it.total_pph, 0);
  const grandTotalNetto = items.reduce((sum, it) => sum + it.total_netto, 0);

  return (
    <div data-module="kepegawaian" className="kpg-ui p-4 md:p-6 w-full max-w-[1700px] mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[var(--ds-surface)] p-6 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] flex items-center justify-center border border-[var(--ds-status-warning-border)] shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--ds-fg)]">
                Hitung &amp; Rekonsiliasi Uang Makan
              </h1>


            </div>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Otomasi komparasi presensi SIKADIR Kemenhut vs Surat Tugas resmi untuk mencegah temuan dobel bayar BPK/Itjen.
            </p>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--ds-surface)] px-3 py-2 rounded-xl border border-[var(--ds-border-subtle)]">
            <Calendar className="w-4 h-4 text-[var(--ds-fg-muted)]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[var(--ds-fg)] focus:outline-hidden cursor-pointer" aria-label="Bulan"
            >
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[var(--ds-fg)] focus:outline-hidden cursor-pointer ml-1" aria-label="Tahun"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metric Counters Banner (Visible when data exists) */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div

            className="bg-[var(--ds-surface)] p-4 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">Total Pegawai</p>
              <p className="text-xl font-bold text-[var(--ds-fg)] mt-1">{totalEmployees} Orang</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div

            className="bg-[var(--ds-surface)] p-4 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">Total Hari Hadir</p>
              <p className="text-xl font-bold text-[var(--ds-status-success-fg)] mt-1">{totalHadirAll} Hari</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div

            className="bg-[var(--ds-surface)] p-4 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">Potongan PPh 21</p>
              <p className="text-xl font-bold text-[var(--ds-status-danger-fg)] mt-1">
                Rp {grandTotalPph.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div

            className="bg-[var(--ds-surface)] p-4 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider">Total Hak Bersih (Netto)</p>
              <p className="text-xl font-bold text-[var(--ds-accent-fg)] mt-1">
                Rp {grandTotalNetto.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar with Sliding Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-2">
        <div {...tabs.tabListProps} className="kpg-pill-tabs flex max-w-full flex-wrap items-center gap-2">
          {[
            { id: "upload", label: "Upload Presensi", icon: UploadCloud },
            { id: "matrix", label: "Pratinjau Matriks (Sheet 1)", icon: FileSpreadsheet, count: items.length },
            { id: "nominatif", label: "Daftar Nominatif (Sheet 2)", icon: Layers },
            { id: "history", label: "Riwayat Batch Tersimpan", icon: History, count: savedBatches.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                {...tabs.tabProps(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                  isActive
                    ? "text-[var(--ds-accent-on-solid)]"
                    : "text-[var(--ds-fg-muted)]  hover:bg-[var(--ds-surface-muted)] "
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={tabs.indicatorId}
                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-xl shadow-xs"
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "relative z-10 ml-1.5 px-2 py-0.5 rounded-full text-xs",
                      isActive ? "bg-[var(--ds-surface)] text-[var(--ds-accent-on-solid)]" : "bg-[var(--ds-surface-muted)]  text-[var(--ds-fg)] "
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action buttons (Reset, Save & Export) */}
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleResetAll}
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Ulang Data
            </Button>
            <Button
              onClick={handleSaveBatch}
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl border-[var(--ds-border-subtle)] font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5 text-[var(--ds-accent-fg)]" />
              Simpan Batch ke DB
            </Button>
            <Button
              onClick={handleExportExcel}
              size="sm"
              className="text-xs h-9 rounded-xl bg-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-fg)] text-[var(--ds-accent-on-solid)] font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download .xlsx (2 Sheets)
            </Button>
          </div>
        )}
      </div>

      {/* Tab Panels with Motion Glide Transition ala Detail Pegawai */}
      <AnimatePresence mode="wait" initial={false}>
        <KepegawaianTabContent
          panelProps={tabs.panelProps}
          key={activeTab}

        >
          {/* Tab 1: Upload & Reconciliation Drag-and-Drop */}
          {activeTab === "upload" && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processUploadedFiles(Array.from(e.dataTransfer.files));
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
              isDragging
                ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] "
                : "border-[var(--ds-border-subtle)]  bg-[var(--ds-surface)]  hover:border-[var(--ds-accent-soft-border)]"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-[var(--ds-fg)]">
              Tarik atau Pilih File Rekap Presensi SIKADIR Kemenhut
            </h3>
            <p className="text-xs text-[var(--ds-fg-muted)] max-w-md mt-1 leading-relaxed">
              Mendukung berkas HTML export (.xls), berkas Excel (.xlsx), atau arsip ZIP berisi presensi seluruh pegawai per bulan.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <label className="kpg-file-control px-5 py-2.5 rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                {isProcessing ? "Memproses..." : "Pilih File dari Komputer"}
                <input
                  type="file"
                  disabled={isProcessing}
                  aria-label="Pilih berkas presensi SIKADIR"
                  multiple
                  accept=".xls,.xlsx,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processUploadedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="sr-only"
                />
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={handleLoadSampleData}
                className="px-4 py-2.5 rounded-xl border border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] text-xs font-semibold"
              >
                Muat Contoh Riil SIKADIR (syafey.xls)
              </Button>
            </div>

            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--ds-accent-fg)] animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sedang membaca berkas dan mengomparasi dengan Surat Tugas aktif...</span>
              </div>
            )}
          </div>

          {/* Rule Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[var(--ds-accent-fg)]">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="text-xs font-bold text-[var(--ds-fg)]">Cross-Check Surat Tugas</h4>
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                Otomatis meng-override absensi Hadir (<span className="font-semibold text-[var(--ds-status-success-fg)]">H</span>) menjadi Perjalanan Dinas (<span className="font-semibold text-[var(--ds-status-warning-fg)]">PD</span>) jika terdaftar di Surat Tugas terbit demi mencegah temuan dobel bayar BPK.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[var(--ds-status-success-fg)]">
                <CheckCircle2 className="w-4 h-4" />
                <h4 className="text-xs font-bold text-[var(--ds-fg)]">Tarif SBM &amp; Pajak PPh 21</h4>
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                Gol I/II &amp; PPPK: Rp35.000 (0%), Gol III: Rp37.000 (5%), Gol IV: Rp41.000 (15%) dihitung presisi netto.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[var(--ds-accent-fg)]">
                <Download className="w-4 h-4" />
                <h4 className="text-xs font-bold text-[var(--ds-fg)]">2-Sheet Excel Generator</h4>
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                Format keluaran Excel identik dengan berkas resmi BKSDA: Sheet Matriks Presensi + Sheet Daftar Nominatif bertandatangan Kasubbag TU.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Matrix View (Full Screen UX) */}
      {activeTab === "matrix" && (
        <div className="bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs space-y-4">
          {/* Admin Edit Mode Banner */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] p-3.5 rounded-2xl text-xs text-[var(--ds-status-warning-fg)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--ds-status-warning-fg)]" />
              <span>
                <b>Mode Pratinjau &amp; Verifikasi:</b> Klik sembarang sel tanggal di bawah ini untuk mengedit manual status presensi (Khusus <b>Admin / Super Admin</b>) sebelum men-download Excel atau menyimpan ke database.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin ? (
                <Badge className="bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)] text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Izin Edit Aktif ({role})
                </Badge>
              ) : (
                <Badge className="bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Mode Baca Saja ({role})
                </Badge>
              )}
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--ds-fg-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau NIP..."
                  className="pl-9 text-xs h-9 rounded-xl bg-[var(--ds-surface)]"
                />
              </div>

              {/* Group filter pills */}
              <div className="flex items-center gap-1 bg-[var(--ds-surface-muted)] p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setFilterGroup("all")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterGroup === "all" ? "bg-[var(--ds-surface)]  shadow-xs text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)] "
                  }`}
                >
                  Semua ({items.length})
                </button>
                <button
                  onClick={() => setFilterGroup("pns")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterGroup === "pns" ? "bg-[var(--ds-surface)]  shadow-xs text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)] "
                  }`}
                >
                  PNS
                </button>
                <button
                  onClick={() => setFilterGroup("pppk")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterGroup === "pppk" ? "bg-[var(--ds-surface)]  shadow-xs text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)] "
                  }`}
                >
                  PPPK
                </button>
              </div>

              {/* Filter only overrides */}
              <button
                onClick={() => setOnlyOverrides(!onlyOverrides)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  onlyOverrides
                    ? "bg-[var(--ds-status-warning-bg)] border-[var(--ds-status-warning-border)] text-[var(--ds-status-warning-fg)] "
                    : "border-[var(--ds-border-subtle)]  text-[var(--ds-fg-muted)]  hover:bg-[var(--ds-surface)]"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Hanya yang Kena Override ST
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ds-fg-muted)]">
                Menampilkan <b>{filteredItems.length}</b> dari {items.length} pegawai
              </span>
            </div>
          </div>

          {/* Matrix Table with CSS Sticky Columns */}
          <div className="relative border border-[var(--ds-border-subtle)] rounded-xl overflow-x-auto max-h-[650px] shadow-xs">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] font-bold sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="p-2 border border-[var(--ds-border-subtle)] w-12 sticky left-0 bg-[var(--ds-surface-muted)] z-30">
                    NO
                  </th>
                  <th className="p-2 border border-[var(--ds-border-subtle)] text-left min-w-[200px] sticky left-12 bg-[var(--ds-surface-muted)] z-30">
                    NAMA / NIP
                  </th>
                  <th className="p-2 border border-[var(--ds-border-subtle)] min-w-[130px] sticky left-[248px] bg-[var(--ds-surface-muted)] z-30">
                    GOLONGAN
                  </th>

                  {/* Day Columns 1..N */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateObj = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
                    const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
                    const holidayInfo = getHolidayInfo(day);
                    const isHoliday = !!holidayInfo;
                    const dayNames = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"];
                    const dayName = dayNames[dayOfWeek] || "";

                    let headerBg = "hover:bg-[var(--ds-accent-soft)]  bg-[var(--ds-surface)] ";
                    let textClass = "text-[var(--ds-fg)] ";
                    let tooltip = `Tanggal ${day}: Hari Kerja. Klik untuk toggle libur.`;

                    if (isHoliday) {
                      headerBg = "bg-[var(--ds-status-danger-bg)]  hover:bg-[var(--ds-status-danger-bg)] border-[var(--ds-status-danger-border)] ";
                      textClass = "text-[var(--ds-status-danger-fg)]  font-extrabold";
                      tooltip = `Tanggal ${day}: ${holidayInfo.name} (${holidayInfo.is_cuti_bersama ? "Cuti Bersama" : "Hari Libur Nasional"})`;
                    } else if (dayOfWeek === 0) {
                      headerBg = "bg-[var(--ds-status-danger-bg)]  hover:bg-[var(--ds-status-danger-bg)] border-[var(--ds-status-danger-border)] ";
                      textClass = "text-[var(--ds-status-danger-fg)]  font-bold";
                      tooltip = `Tanggal ${day}: Hari Minggu (Akhir Pekan)`;
                    } else if (dayOfWeek === 6) {
                      headerBg = "kpg-secondary border-[var(--ds-border-subtle)] ";
                      textClass = "text-[var(--ds-fg-muted)]  font-semibold";
                      tooltip = `Tanggal ${day}: Hari Sabtu (Akhir Pekan)`;
                    }

                    return (
                      <th
                        key={day}
                        title={tooltip}
                        className={`p-0 border border-[var(--ds-border-subtle)] w-8 ${headerBg}`}
                      >
                        <button type="button" className="kpg-presence-button w-full min-w-8 min-h-9 p-1" disabled={!isAdmin} onClick={() => handleToggleColumnHoliday(day)} aria-label={`Ubah hari kerja tanggal ${day}`}>
                        <span className={`block text-xs uppercase font-semibold leading-tight ${dayOfWeek === 0 || isHoliday ? "text-[var(--ds-status-danger-fg)] " : "text-[var(--ds-fg-muted)]"}`}>
                          {dayName}
                        </span>
                        <span className={`block text-xs leading-tight font-bold ${textClass}`}>{day}</span>
                        {isHoliday && (
                          <span className="block w-1.5 h-1.5 rounded-full bg-[var(--ds-danger-solid)] mx-auto mt-0.5" />
                        )}
                        </button>
                      </th>
                    );
                  })}

                  {/* Summary Totals Columns */}
                  <th className="p-2 border border-[var(--ds-border-subtle)] bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] font-bold w-12">
                    H
                  </th>
                  <th className="p-2 border border-[var(--ds-border-subtle)] bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] font-bold w-12">
                    PD
                  </th>
                  <th className="p-2 border border-[var(--ds-border-subtle)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-bold w-12">
                    CT
                  </th>
                  <th className="p-2 border border-[var(--ds-border-subtle)] bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] font-bold w-12">
                    TK
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {filteredItems.map((emp, idx) => (
                  <tr key={emp.nip} className="hover:bg-[var(--ds-surface)] transition-colors">
                    {/* Sticky No */}
                    <td className="p-2 border border-[var(--ds-border-subtle)] font-semibold sticky left-0 bg-[var(--ds-surface)] z-10">
                      {idx + 1}
                    </td>

                    {/* Sticky Nama & NIP */}
                    <td className="p-2 border border-[var(--ds-border-subtle)] text-left sticky left-12 bg-[var(--ds-surface)] z-10">
                      <div className="font-bold text-[var(--ds-fg)] whitespace-nowrap">{emp.nama}</div>
                      <div className="text-xs text-[var(--ds-fg-muted)] font-mono">{emp.nip}</div>
                    </td>

                    {/* Sticky Golongan */}
                    <td className="p-2 border border-[var(--ds-border-subtle)] sticky left-[248px] bg-[var(--ds-surface)] z-10 text-[var(--ds-fg-muted)]">
                      <span className="text-xs font-semibold">{emp.golongan}</span>
                    </td>

                    {/* Interactive Days Cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const rawVal = emp.daily_matrix[day] || "-";
                      const cleanVal = rawVal.replace("*", "");
                      const dateObj = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
                      const dayOfWeek = dateObj.getDay();
                      const holidayInfo = getHolidayInfo(day);
                      const isHoliday = !!holidayInfo;

                      // Determine cell styling
                      let cellStyle = "text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] ";
                      if (cleanVal === "H") cellStyle = "text-[var(--ds-status-success-fg)]  font-bold bg-[var(--ds-status-success-bg)]";
                      else if (cleanVal === "PD") cellStyle = "text-[var(--ds-status-warning-fg)]  font-bold bg-[var(--ds-status-warning-bg)]";
                      else if (cleanVal === "CT") cellStyle = "text-[var(--ds-accent-fg)]  font-semibold bg-[var(--ds-accent-soft)]";
                      else if (cleanVal === "S") cellStyle = "text-[var(--ds-accent-fg)]  font-semibold bg-[var(--ds-accent-soft)]";
                      else if (cleanVal === "I") cellStyle = "text-[var(--ds-accent-fg)]  font-semibold bg-[var(--ds-accent-soft)]";
                      else if (cleanVal === "TK") cellStyle = "text-[var(--ds-status-danger-fg)]  font-bold bg-[var(--ds-status-danger-bg)]";
                      else if (cleanVal === "-") {
                        if (isHoliday || dayOfWeek === 0) {
                          cellStyle = "text-[var(--ds-status-danger-fg)] bg-[var(--ds-status-danger-bg)] ";
                        } else if (dayOfWeek === 6) {
                          cellStyle = "text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] ";
                        }
                      }

                      const dayTooltip = isHoliday
                        ? `Tgl ${day}: ${holidayInfo.name}`
                        : dayOfWeek === 0
                        ? `Tgl ${day}: Hari Minggu (Akhir Pekan)`
                        : dayOfWeek === 6
                        ? `Tgl ${day}: Hari Sabtu (Akhir Pekan)`
                        : `Tgl ${day}: ${rawVal}`;

                      return (
                        <td
                          key={day}
                          className={`p-0 border border-[var(--ds-border-subtle)] text-xs ${cellStyle}`}
                          title={`${dayTooltip} ${isAdmin ? "(Klik untuk koreksi status admin)" : ""}`}
                        >
                          <button type="button" className="kpg-presence-button w-full min-w-8 min-h-9 p-1" disabled={!isAdmin} onClick={() => handleCellClick(emp, day)} aria-label={`Koreksi presensi ${emp.nama} tanggal ${day}, ${rawVal}`}>{rawVal}</button>
                        </td>
                      );
                    })}

                    {/* Summary Counters */}
                    <td className="p-2 border border-[var(--ds-border-subtle)] font-bold text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)]">
                      {emp.total_hadir}
                    </td>
                    <td className="p-2 border border-[var(--ds-border-subtle)] font-bold text-[var(--ds-status-warning-fg)] bg-[var(--ds-status-warning-bg)]">
                      {emp.total_pd}
                    </td>
                    <td className="p-2 border border-[var(--ds-border-subtle)] font-bold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)]">
                      {emp.total_cuti}
                    </td>
                    <td className="p-2 border border-[var(--ds-border-subtle)] font-bold text-[var(--ds-status-danger-fg)] bg-[var(--ds-status-danger-bg)]">
                      {emp.total_alpa}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 text-xs text-[var(--ds-fg-muted)]">
            <div className="flex items-center gap-2 text-[var(--ds-status-warning-fg)]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <b>PD*</b> = Otomatis di-override dari <b>Hadir (SIKADIR)</b> ke <b>Perjalanan Dinas</b> karena tercatat dalam Surat Tugas resmi.
              </span>
            </div>
            <div>
              <span>Klik angka tanggal di baris header tabel untuk toggle Hari Libur Nasional / Cuti Bersama.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[var(--ds-fg-muted)] border-t border-[var(--ds-border-subtle)]">
            <span className="font-semibold text-[var(--ds-fg)]">Legenda Presensi:</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] text-xs font-bold text-[var(--ds-status-success-fg)] flex items-center justify-center">H</span> Hadir (Uang Makan)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] text-xs font-bold text-[var(--ds-status-warning-fg)] flex items-center justify-center">PD</span> Perjalanan Dinas</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs font-bold text-[var(--ds-accent-fg)] flex items-center justify-center">CT</span> Cuti Sah</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs font-bold text-[var(--ds-accent-fg)] flex items-center justify-center">S</span> Sakit</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs font-bold text-[var(--ds-accent-fg)] flex items-center justify-center">I</span> Izin</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] text-xs font-bold text-[var(--ds-status-danger-fg)] flex items-center justify-center">TK</span> Alpa</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] text-xs font-bold text-[var(--ds-status-danger-fg)] flex items-center justify-center">Mg</span> Libur Nasional / Cuti Bersama SKB / Minggu</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg-muted)] flex items-center justify-center">Sb</span> Sabtu</span>
          </div>
        </div>
      )}

      {/* Tab 3: Daftar Nominatif (Sheet 2) */}
      {activeTab === "nominatif" && (
        <div className="bg-[var(--ds-surface)] p-6 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                Daftar Nominatif Pembayaran Uang Makan Pegawai
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Perhitungan total hak uang makan berdasarkan tarif SBM per golongan dan potongan PPh 21.
              </p>
            </div>
            <Button
              onClick={handleExportExcel}
              className="bg-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-fg)] text-[var(--ds-accent-on-solid)] text-xs font-bold"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export Nominatif Excel
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--ds-border-subtle)] shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-[var(--ds-surface-muted)] font-bold text-[var(--ds-fg)] text-center">
                <tr>
                  <th className="p-3 border border-[var(--ds-border-subtle)] w-12">NO</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)] text-left">NAMA / NIP</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)]">GOLONGAN</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)]">JML HARI</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)] text-right">TARIF SBM</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)] text-right">KOTOR (BRUTO)</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)]">PPH 21</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)] text-right">POTONGAN</th>
                  <th className="p-3 border border-[var(--ds-border-subtle)] text-right font-bold text-[var(--ds-status-success-fg)]">
                    JUMLAH DITERIMA (NETTO)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {filteredItems.map((emp, idx) => (
                  <tr key={emp.nip} className="hover:bg-[var(--ds-surface)]">
                    <td className="p-3 text-center font-semibold border border-[var(--ds-border-subtle)]">
                      {idx + 1}
                    </td>
                    <td className="p-3 border border-[var(--ds-border-subtle)]">
                      <div className="font-bold text-[var(--ds-fg)]">{emp.nama}</div>
                      <div className="text-xs text-[var(--ds-fg-muted)] font-mono">{emp.nip}</div>
                    </td>
                    <td className="p-3 text-center border border-[var(--ds-border-subtle)] font-semibold text-[var(--ds-fg)]">
                      {emp.golongan}
                    </td>
                    <td className="p-3 text-center font-bold border border-[var(--ds-border-subtle)]">
                      {emp.total_hadir} Hari
                    </td>
                    <td className="p-3 text-right font-mono border border-[var(--ds-border-subtle)]">
                      Rp {emp.tarif.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold border border-[var(--ds-border-subtle)]">
                      Rp {emp.total_bruto.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-center border border-[var(--ds-border-subtle)] font-bold">
                      {(emp.pph_rate * 100).toFixed(0)}%
                    </td>
                    <td className="p-3 text-right font-mono border border-[var(--ds-border-subtle)] text-[var(--ds-status-danger-fg)]">
                      Rp {emp.total_pph.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[var(--ds-status-success-fg)] border border-[var(--ds-border-subtle)]">
                      Rp {emp.total_netto.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--ds-surface-muted)] font-bold text-[var(--ds-fg)]">
                <tr>
                  <td colSpan={6} className="p-3 text-center uppercase tracking-wider">
                    Total Keseluruhan ({filteredItems.length} Pegawai)
                  </td>
                  <td className="p-3 text-right font-mono">
                    Rp {filteredItems.reduce((s, it) => s + it.total_bruto, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-right font-mono text-[var(--ds-status-danger-fg)]">
                    Rp {filteredItems.reduce((s, it) => s + it.total_pph, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3 text-right font-mono text-[var(--ds-status-success-fg)] font-extrabold">
                    Rp {filteredItems.reduce((s, it) => s + it.total_netto, 0).toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: History Batches */}
      {activeTab === "history" && (
        <div className="bg-[var(--ds-surface)] p-6 rounded-2xl border border-[var(--ds-border-subtle)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                Riwayat Perhitungan Uang Makan Tersimpan
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Daftar batch rekonsiliasi yang telah disimpan permanen ke database BKSDA.
              </p>
            </div>
            <Button
              onClick={fetchBatches}
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl border-[var(--ds-border-subtle)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingBatches ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingBatches ? (
            <p role="status" className="p-8 text-sm text-[var(--ds-fg-muted)]">Memuat riwayat batch...</p>
          ) : batchesError ? (
            <div role="alert" className="p-8 text-sm text-[var(--ds-status-danger-fg)]">Gagal memuat riwayat batch. <button type="button" className="kpg-secondary ml-2 rounded-lg px-3 py-2" onClick={fetchBatches}>Coba lagi</button></div>
          ) : savedBatches.length === 0 ? (
            <div className="p-12 text-center text-[var(--ds-fg-muted)] text-xs">
              Belum ada batch yang disimpan secara permanen ke database. Silakan unggah presensi di tab Upload Presensi lalu klik &quot;Simpan Batch ke DB&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-5 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:border-[var(--ds-accent-soft-border)] transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--ds-fg)]">{batch.title}</h4>
                      <p className="text-xs text-[var(--ds-fg-muted)]">
                        Periode: Bulan {batch.month} Tahun {batch.year}
                      </p>
                    </div>
                    <Badge className="bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] text-xs">
                      {batch.total_employees} Pegawai
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-[var(--ds-border-subtle)] flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--ds-fg-muted)]">Total Netto</p>
                      <p className="text-sm font-bold text-[var(--ds-status-success-fg)] font-mono">
                        Rp {Number(batch.grand_total_netto).toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLoadBatch(batch.id)}
                        className="h-8 px-2.5 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] rounded-lg"
                      >
                        Buka
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteBatch(batch.id, batch.title)}
                        className="h-8 px-2 text-xs text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-lg" aria-label="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </KepegawaianTabContent>
      </AnimatePresence>

      {/* Modal Koreksi Presensi Khusus Admin & Super Admin */}
      {editingModal && (
        <KepegawaianDialog title="Koreksi presensi" onClose={() => setEditingModal(null)} busy={false} className="sm:max-w-lg">
          <div className="bg-[var(--ds-surface)] rounded-2xl p-6 border border-[var(--ds-border-subtle)] shadow-2xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center font-bold">
                  {editingModal.day}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                    Koreksi Status Presensi (Admin Edit)
                  </h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    {editingModal.item.nama} • {editingModal.item.golongan}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--ds-surface-muted)] flex items-center justify-center text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)]" aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-[var(--ds-fg)]">
                Pilih Status Absensi Tanggal {editingModal.day}:
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = editingModal.currentCode === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setEditingModal({ ...editingModal, currentCode: opt.code })}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  ring-2 ring-[var(--ds-accent-soft-border)]"
                          : "border-[var(--ds-border-subtle)]  hover:bg-[var(--ds-surface)]  text-[var(--ds-fg)] "
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${opt.color}`}>
                          {opt.code}
                        </span>
                        <div>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-xs text-[var(--ds-fg-muted)]">{opt.desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-[var(--ds-fg)]">
                  Catatan / Alasan Koreksi (Opsional):
                </label>
                <Input
                  value={editingModal.reason}
                  onChange={(e) => setEditingModal({ ...editingModal, reason: e.target.value })}
                  placeholder="Contoh: Perintah dinas lisan pimpinan / Revisi jadwal..."
                  className="mt-1 text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingModal(null)}
                className="text-xs h-9 rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveModalEdit(editingModal.currentCode, editingModal.reason)}
                className="text-xs h-9 rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold"
              >
                Terapkan Perubahan
              </Button>
            </div>
          </div>
        </KepegawaianDialog>
      )}
      {/* Modal Peringatan Beda Periode Bulan saat Upload Bareng */}
      {mismatchedModal.open && (
        <KepegawaianDialog title="Perbedaan periode berkas" onClose={() => setMismatchedModal({ open: false, message: '', groups: [] })} busy={false} className="sm:max-w-3xl">
          <div className="bg-[var(--ds-surface)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[var(--ds-status-danger-border)] space-y-5  -50 ">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] flex items-center justify-center shrink-0 border border-[var(--ds-status-danger-border)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[var(--ds-fg)]">
                  Peringatan: Berkas Memiliki Periode Bulan Berbeda!
                </h3>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1 leading-relaxed">
                  {mismatchedModal.message}
                </p>
              </div>
              <button
                onClick={() => setMismatchedModal({ open: false, message: "", groups: [] })}
                className="w-8 h-8 rounded-lg hover:bg-[var(--ds-surface-muted)] flex items-center justify-center text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)]" aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-[var(--ds-fg)]">
                Rincian berkas berdasarkan periode bulan terdeteksi:
              </p>
              {mismatchedModal.groups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="p-3.5 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                      <span className="text-xs font-bold text-[var(--ds-fg)]">
                        {group.label} ({group.periode})
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold">
                      {group.files.length} Berkas
                    </Badge>
                  </div>

                  <div className="divide-y divide-[var(--ds-border-subtle)]">
                    {group.files.map((f, fIdx) => (
                      <div key={fIdx} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                          <span className="font-semibold text-[var(--ds-fg)]">
                            {f.filename}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--ds-fg-muted)]">
                          {f.nama} ({f.nip})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] text-xs text-[var(--ds-status-warning-fg)] leading-relaxed">
              💡 <b>Solusi:</b> Silakan pisahkan berkas berdasarkan bulannya masing-masing. Unggah berkas presensi untuk satu periode bulan sekaligus agar perhitungan uang makan, pemotongan PPh 21, dan kalender hari kerja terhitung tepat.
            </div>

            <div className="pt-2 border-t border-[var(--ds-border-subtle)] flex items-center justify-end">
              <Button
                onClick={() => setMismatchedModal({ open: false, message: "", groups: [] })}
                className="text-xs h-9 rounded-xl bg-[var(--ds-fg)] hover:bg-[var(--ds-fg)] text-[var(--ds-accent-on-solid)] font-bold"
              >
                Mengerti, Saya Akan Periksa Ulang
              </Button>
            </div>
          </div>
        </KepegawaianDialog>
      )}
    </div>
  );
}
