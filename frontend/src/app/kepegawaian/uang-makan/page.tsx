"use client";

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

// Status options for daily attendance
const STATUS_OPTIONS = [
  { code: "H", label: "Hadir (Dapat Uang Makan)", desc: "Pegawai hadir di kantor / WFO / WFH sah", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300" },
  { code: "PD", label: "Perjalanan Dinas (SPPD)", desc: "Dinas luar kota (uang saku masuk di SPPD)", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300" },
  { code: "CT", label: "Cuti Sah", desc: "Cuti Tahunan, Alasan Penting, Bersalin", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300" },
  { code: "S", label: "Sakit", desc: "Sakit dengan bukti surat keterangan dokter", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300" },
  { code: "I", label: "Izin Resmi", desc: "Izin kedinasan resmi tertulis", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300" },
  { code: "TK", label: "Tanpa Keterangan / Alpa", desc: "Tidak ada presensi masuk & tidak ada keterangan", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300" },
  { code: "-", label: "Hari Libur / Akhir Pekan", desc: "Sabtu, Minggu, atau Hari Libur Nasional SKB", color: "bg-slate-200/80 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border-slate-300" },
];

export interface ReconciledEmployeeItem {
  nip: string;
  nama: string;
  jabatan: string;
  golongan: string;
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
      const isPppk = it.golongan.toLowerCase().includes("pppk");
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
  const [currentBatchTitle, setCurrentBatchTitle] = useState("Rekonsiliasi Uang Makan BKSDA Kaltim");

  // Load saved batches on mount and history tab switch
  useEffect(() => {
    if (activeTab === "history") {
      fetchBatches();
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    setLoadingBatches(true);
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
      // ignore
    } finally {
      setLoadingBatches(false);
    }
  };

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
        title: "Kosongkan Data Pratinjau Presensi?",
        description: (
          <div className="space-y-2 text-left">
            <p>
              Seluruh matriks presensi dari <b>{items.length} pegawai</b> yang sedang ditampilkan serta koreksi manual yang belum disimpan akan dikosongkan.
            </p>
            <p className="text-xs text-slate-400">
              Anda dapat mengunggah berkas SIKADIR baru atau memuat berkas contoh setelahnya.
            </p>
          </div>
        ),
        confirmText: "Kosongkan Data",
        cancelText: "Batal",
        variant: "danger",
        icon: <RotateCcw className="h-7 w-7 text-rose-600" />,
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
      title: "Hapus Batch dari Database?",
      description: (
        <div className="space-y-2 text-left">
          <p>
            Batch <b>&quot;{batchTitle || "Rekonsiliasi Uang Makan"}&quot;</b> beserta seluruh catatan riwayat absensi dan log override per pegawai akan dihapus permanen.
          </p>
          <p className="text-xs text-rose-500 font-medium">
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
    <div className="p-4 md:p-6 w-full max-w-[1700px] mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Hitung &amp; Rekonsiliasi Uang Makan
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                10/10 Precision Engine
              </Badge>
              {isAdmin && (
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  Admin Edit Enabled
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Otomasi komparasi presensi SIKADIR Kemenhut vs Surat Tugas resmi untuk mencegah temuan dobel bayar BPK/Itjen.
            </p>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer"
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
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer ml-1"
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
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pegawai</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{totalEmployees} Orang</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Hari Hadir</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalHadirAll} Hari</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Potongan PPh 21</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                Rp {grandTotalPph.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Hak Bersih (Netto)</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                Rp {grandTotalNetto.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "upload"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Upload Presensi
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "matrix"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Pratinjau Matriks (Sheet 1)
            {items.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-200">
                {items.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("nominatif")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "nominatif"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            Daftar Nominatif (Sheet 2)
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat Batch Tersimpan
          </button>
        </div>

        {/* Action buttons (Reset, Save & Export) */}
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleResetAll}
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-800 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Ulang Data
            </Button>
            <Button
              onClick={handleSaveBatch}
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl border-slate-200 dark:border-zinc-700 font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Simpan Batch ke DB
            </Button>
            <Button
              onClick={handleExportExcel}
              size="sm"
              className="text-xs h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download .xlsx (2 Sheets)
            </Button>
          </div>
        )}
      </div>

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
            className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20"
                : "border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 hover:border-blue-500/50"
            }`}
          >
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tarik atau Pilih File Rekap Presensi SIKADIR Kemenhut
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mt-1 leading-relaxed">
              Mendukung berkas HTML export (.xls), berkas Excel (.xlsx), atau arsip ZIP berisi presensi seluruh pegawai per bulan.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <label className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                {isProcessing ? "Memproses..." : "Pilih File dari Komputer"}
                <input
                  type="file"
                  multiple
                  accept=".xls,.xlsx,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processUploadedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={handleLoadSampleData}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold"
              >
                Muat Contoh Riil SIKADIR (syafey.xls)
              </Button>
            </div>

            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sedang membaca berkas dan mengomparasi dengan Surat Tugas aktif...</span>
              </div>
            )}
          </div>

          {/* Rule Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cross-Check Surat Tugas</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Otomatis meng-override absensi Hadir (<span className="font-semibold text-emerald-600">H</span>) menjadi Perjalanan Dinas (<span className="font-semibold text-amber-600">PD</span>) jika terdaftar di Surat Tugas terbit demi mencegah temuan dobel bayar BPK.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tarif SBM &amp; Pajak PPh 21</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Gol I/II &amp; PPPK: Rp35.000 (0%), Gol III: Rp37.000 (5%), Gol IV: Rp41.000 (15%) dihitung presisi netto.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Download className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">2-Sheet Excel Generator</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Format keluaran Excel identik dengan berkas resmi BKSDA: Sheet Matriks Presensi + Sheet Daftar Nominatif bertandatangan Kasubbag TU.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Matrix View (Full Screen UX) */}
      {activeTab === "matrix" && (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          {/* Admin Edit Mode Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <b>Mode Pratinjau &amp; Verifikasi:</b> Klik sembarang sel tanggal di bawah ini untuk mengedit manual status presensi (Khusus <b>Admin / Super Admin</b>) sebelum men-download Excel atau menyimpan ke database.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin ? (
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Izin Edit Aktif ({role})
                </Badge>
              ) : (
                <Badge className="bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Mode Baca Saja ({role})
                </Badge>
              )}
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau NIP..."
                  className="pl-9 text-xs h-9 rounded-xl bg-slate-50 dark:bg-zinc-800"
                />
              </div>

              {/* Group filter pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setFilterGroup("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterGroup === "all" ? "bg-white dark:bg-zinc-700 shadow-xs text-blue-600" : "text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  Semua ({items.length})
                </button>
                <button
                  onClick={() => setFilterGroup("pns")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterGroup === "pns" ? "bg-white dark:bg-zinc-700 shadow-xs text-blue-600" : "text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  PNS
                </button>
                <button
                  onClick={() => setFilterGroup("pppk")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterGroup === "pppk" ? "bg-white dark:bg-zinc-700 shadow-xs text-blue-600" : "text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  PPPK
                </button>
              </div>

              {/* Filter only overrides */}
              <button
                onClick={() => setOnlyOverrides(!onlyOverrides)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  onlyOverrides
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Hanya yang Kena Override ST
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Menampilkan <b>{filteredItems.length}</b> dari {items.length} pegawai
              </span>
            </div>
          </div>

          {/* Matrix Table with CSS Sticky Columns */}
          <div className="relative border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto max-h-[650px] shadow-xs">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 w-12 sticky left-0 bg-slate-100 dark:bg-zinc-800 z-30">
                    NO
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 text-left min-w-[200px] sticky left-12 bg-slate-100 dark:bg-zinc-800 z-30">
                    NAMA / NIP
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 min-w-[130px] sticky left-[248px] bg-slate-100 dark:bg-zinc-800 z-30">
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

                    let headerBg = "hover:bg-blue-100 dark:hover:bg-zinc-700 bg-white dark:bg-zinc-900";
                    let textClass = "text-slate-700 dark:text-zinc-200";
                    let tooltip = `Tanggal ${day}: Hari Kerja. Klik untuk toggle libur.`;

                    if (isHoliday) {
                      headerBg = "bg-rose-100/90 dark:bg-rose-950/70 hover:bg-rose-200 border-rose-300 dark:border-rose-900";
                      textClass = "text-rose-700 dark:text-rose-300 font-extrabold";
                      tooltip = `Tanggal ${day}: ${holidayInfo.name} (${holidayInfo.is_cuti_bersama ? "Cuti Bersama" : "Hari Libur Nasional"})`;
                    } else if (dayOfWeek === 0) {
                      headerBg = "bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border-red-200 dark:border-red-900";
                      textClass = "text-red-600 dark:text-red-400 font-bold";
                      tooltip = `Tanggal ${day}: Hari Minggu (Akhir Pekan)`;
                    } else if (dayOfWeek === 6) {
                      headerBg = "bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 border-slate-300 dark:border-zinc-700";
                      textClass = "text-slate-500 dark:text-zinc-400 font-semibold";
                      tooltip = `Tanggal ${day}: Hari Sabtu (Akhir Pekan)`;
                    }

                    return (
                      <th
                        key={day}
                        onClick={() => handleToggleColumnHoliday(day)}
                        title={tooltip}
                        className={`p-1 border border-slate-200 dark:border-zinc-700 w-8 cursor-pointer transition-colors ${headerBg}`}
                      >
                        <div className={`text-[8px] uppercase font-semibold leading-tight ${dayOfWeek === 0 || isHoliday ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                          {dayName}
                        </div>
                        <div className={`text-[10px] leading-tight font-bold ${textClass}`}>{day}</div>
                        {isHoliday && (
                          <span className="block w-1.5 h-1.5 rounded-full bg-rose-500 mx-auto mt-0.5" />
                        )}
                      </th>
                    );
                  })}

                  {/* Summary Totals Columns */}
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold w-12">
                    H
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold w-12">
                    PD
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold w-12">
                    CT
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold w-12">
                    TK
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredItems.map((emp, idx) => (
                  <tr key={emp.nip} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* Sticky No */}
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 font-semibold sticky left-0 bg-white dark:bg-zinc-900 z-10">
                      {idx + 1}
                    </td>

                    {/* Sticky Nama & NIP */}
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 text-left sticky left-12 bg-white dark:bg-zinc-900 z-10">
                      <div className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{emp.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.nip}</div>
                    </td>

                    {/* Sticky Golongan */}
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 sticky left-[248px] bg-white dark:bg-zinc-900 z-10 text-slate-600 dark:text-zinc-300">
                      <span className="text-[11px] font-semibold">{emp.golongan}</span>
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
                      let cellStyle = "text-slate-400 bg-slate-100/50 dark:bg-zinc-800/30";
                      if (cleanVal === "H") cellStyle = "text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/70";
                      else if (cleanVal === "PD") cellStyle = "text-amber-800 dark:text-amber-300 font-bold bg-amber-100/80";
                      else if (cleanVal === "CT") cellStyle = "text-blue-700 dark:text-blue-300 font-semibold bg-blue-50/70";
                      else if (cleanVal === "S") cellStyle = "text-purple-700 dark:text-purple-300 font-semibold bg-purple-50/70";
                      else if (cleanVal === "I") cellStyle = "text-cyan-700 dark:text-cyan-300 font-semibold bg-cyan-50/70";
                      else if (cleanVal === "TK") cellStyle = "text-rose-700 dark:text-rose-300 font-bold bg-rose-100/80";
                      else if (cleanVal === "-") {
                        if (isHoliday || dayOfWeek === 0) {
                          cellStyle = "text-rose-400 bg-rose-50/30 dark:bg-rose-950/20";
                        } else if (dayOfWeek === 6) {
                          cellStyle = "text-slate-400 bg-slate-100/60 dark:bg-zinc-800/40";
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
                          onClick={() => handleCellClick(emp, day)}
                          className={`p-1 border border-slate-200 dark:border-zinc-800 text-[11px] ${
                            isAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:z-20" : "cursor-default"
                          } transition-all ${cellStyle}`}
                          title={`${dayTooltip} ${isAdmin ? "(Klik untuk koreksi status admin)" : ""}`}
                        >
                          <span>{rawVal}</span>
                        </td>
                      );
                    })}

                    {/* Summary Counters */}
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-emerald-600 bg-emerald-50/30">
                      {emp.total_hadir}
                    </td>
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-amber-600 bg-amber-50/30">
                      {emp.total_pd}
                    </td>
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-blue-600 bg-blue-50/30">
                      {emp.total_cuti}
                    </td>
                    <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-rose-600 bg-rose-50/30">
                      {emp.total_alpa}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <b>PD*</b> = Otomatis di-override dari <b>Hadir (SIKADIR)</b> ke <b>Perjalanan Dinas</b> karena tercatat dalam Surat Tugas resmi.
              </span>
            </div>
            <div>
              <span>Klik angka tanggal di baris header tabel untuk toggle Hari Libur Nasional / Cuti Bersama.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800">
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Legenda Presensi:</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-emerald-100 border border-emerald-300 text-[9px] font-bold text-emerald-800 flex items-center justify-center">H</span> Hadir (Uang Makan)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-amber-100 border border-amber-300 text-[9px] font-bold text-amber-800 flex items-center justify-center">PD</span> Perjalanan Dinas</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-blue-100 border border-blue-300 text-[9px] font-bold text-blue-800 flex items-center justify-center">CT</span> Cuti Sah</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-purple-100 border border-purple-300 text-[9px] font-bold text-purple-800 flex items-center justify-center">S</span> Sakit</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-cyan-100 border border-cyan-300 text-[9px] font-bold text-cyan-800 flex items-center justify-center">I</span> Izin</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-rose-100 border border-rose-300 text-[9px] font-bold text-rose-800 flex items-center justify-center">TK</span> Alpa</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-red-100 border border-red-300 text-[9px] font-bold text-red-700 flex items-center justify-center">Mg</span> Libur Nasional / Cuti Bersama SKB / Minggu</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-slate-200 border border-slate-300 text-[9px] font-bold text-slate-600 flex items-center justify-center">Sb</span> Sabtu</span>
          </div>
        </div>
      )}

      {/* Tab 3: Daftar Nominatif (Sheet 2) */}
      {activeTab === "nominatif" && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Nominatif Pembayaran Uang Makan Pegawai
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Perhitungan total hak uang makan berdasarkan tarif SBM per golongan dan potongan PPh 21.
              </p>
            </div>
            <Button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export Nominatif Excel
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300 text-center">
                <tr>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700 w-12">NO</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700 text-left">NAMA / NIP</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700">GOLONGAN</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700">JML HARI</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700 text-right">TARIF SBM</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700 text-right">KOTOR (BRUTO)</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700">PPH 21</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700 text-right">POTONGAN</th>
                  <th className="p-3 border border-slate-200 dark:border-zinc-700 text-right font-bold text-emerald-700 dark:text-emerald-400">
                    JUMLAH DITERIMA (NETTO)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredItems.map((emp, idx) => (
                  <tr key={emp.nip} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="p-3 text-center font-semibold border border-slate-200 dark:border-zinc-800">
                      {idx + 1}
                    </td>
                    <td className="p-3 border border-slate-200 dark:border-zinc-800">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.nip}</div>
                    </td>
                    <td className="p-3 text-center border border-slate-200 dark:border-zinc-800 font-semibold text-slate-700 dark:text-zinc-300">
                      {emp.golongan}
                    </td>
                    <td className="p-3 text-center font-bold border border-slate-200 dark:border-zinc-800">
                      {emp.total_hadir} Hari
                    </td>
                    <td className="p-3 text-right font-mono border border-slate-200 dark:border-zinc-800">
                      Rp {emp.tarif.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold border border-slate-200 dark:border-zinc-800">
                      Rp {emp.total_bruto.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-center border border-slate-200 dark:border-zinc-800 font-bold">
                      {(emp.pph_rate * 100).toFixed(0)}%
                    </td>
                    <td className="p-3 text-right font-mono border border-slate-200 dark:border-zinc-800 text-rose-600">
                      Rp {emp.total_pph.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-zinc-800">
                      Rp {emp.total_netto.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-zinc-800 font-bold text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={6} className="p-3 text-center uppercase tracking-wider">
                    Total Keseluruhan ({filteredItems.length} Pegawai)
                  </td>
                  <td className="p-3 text-right font-mono">
                    Rp {filteredItems.reduce((s, it) => s + it.total_bruto, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-right font-mono text-rose-600">
                    Rp {filteredItems.reduce((s, it) => s + it.total_pph, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
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
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Riwayat Perhitungan Uang Makan Tersimpan
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Daftar batch rekonsiliasi yang telah disimpan permanen ke database BKSDA.
              </p>
            </div>
            <Button
              onClick={fetchBatches}
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl border-slate-200 dark:border-zinc-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingBatches ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {savedBatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Belum ada batch yang disimpan secara permanen ke database. Silakan unggah presensi di tab Upload Presensi lalu klik &quot;Simpan Batch ke DB&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-blue-500/50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{batch.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        Periode: Bulan {batch.month} Tahun {batch.year}
                      </p>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px]">
                      {batch.total_employees} Pegawai
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400">Total Netto</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        Rp {Number(batch.grand_total_netto).toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLoadBatch(batch.id)}
                        className="h-8 px-2.5 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-700 rounded-lg"
                      >
                        Buka
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteBatch(batch.id, batch.title)}
                        className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-700 rounded-lg"
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

      {/* Modal Koreksi Presensi Khusus Admin & Super Admin */}
      {editingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  {editingModal.day}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Koreksi Status Presensi (Admin Edit)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingModal.item.nama} • {editingModal.item.golongan}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20"
                          : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${opt.color}`}>
                          {opt.code}
                        </span>
                        <div>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] text-slate-400">{opt.desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
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
                className="text-xs h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Terapkan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Peringatan Beda Periode Bulan saat Upload Bareng */}
      {mismatchedModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Peringatan: Berkas Memiliki Periode Bulan Berbeda!
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {mismatchedModal.message}
                </p>
              </div>
              <button
                onClick={() => setMismatchedModal({ open: false, message: "", groups: [] })}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Rincian berkas berdasarkan periode bulan terdeteksi:
              </p>
              {mismatchedModal.groups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {group.label} ({group.periode})
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {group.files.length} Berkas
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-200/60 dark:divide-zinc-700/60">
                    {group.files.map((f, fIdx) => (
                      <div key={fIdx} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700 dark:text-zinc-200">
                            {f.filename}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {f.nama} ({f.nip})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              💡 <b>Solusi:</b> Silakan pisahkan berkas berdasarkan bulannya masing-masing. Unggah berkas presensi untuk satu periode bulan sekaligus agar perhitungan uang makan, pemotongan PPh 21, dan kalender hari kerja terhitung tepat.
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
              <Button
                onClick={() => setMismatchedModal({ open: false, message: "", groups: [] })}
                className="text-xs h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold"
              >
                Mengerti, Saya Akan Periksa Ulang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
