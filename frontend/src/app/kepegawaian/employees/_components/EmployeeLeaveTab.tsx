"use client";

import { useDialogFocusReturn } from "@/components/ui/use-dialog-focus-return";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  detectEmployeeType,
  isEligibleForAnnualLeave,
  isMmpEmployee,
} from "@/app/kepegawaian/_lib/employee-helpers";
import { toast } from "sonner";
import {
  Calendar,
  Save,
  Award,
  Info,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Plus,
  FileText,
  Pencil,
  Trash2,
  CalendarDays,
  FileCheck2,
  SlidersHorizontal,
  FileCheck,
  FileUp,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { isAxiosError } from "axios";
import { cn } from "@/lib/utils";
import { ScanViewerModal, UploadScanModal } from "@/app/kepegawaian/cuti/_components/CutiModals";

interface EmployeeLeaveData {
  id?: number;
  employee_id: number;
  year: number;
  hak_cuti_n: number;
  sisa_cuti_n1: number;
  cuti_terpakai_n1: number;
  sisa_cuti_n2: number;
  cuti_terpakai_n2: number;
  cuti_terpakai_n0: number;
  catatan?: string | null;
  hak_n1_diakui: number;
  hak_n2_diakui: number;
  total_hak_cuti: number;
  sisa_cuti_tersedia: number;
  is_eligible_24_days: boolean;
}

interface LeaveRecordItem {
  id: number;
  employee_id: number;
  nomor_pengajuan: string;
  tanggal_pengajuan: string;
  jenis_cuti: string;
  alasan_cuti?: string | null;
  jumlah_hari: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alamat_menjalankan_cuti?: string | null;
  telepon?: string | null;
  catatan_atasan?: string | null;
  status: string;
  scan_surat_path?: string | null;
  scan_surat_nama?: string | null;
  scan_formulir_path?: string | null;
  scan_formulir_nama?: string | null;
  scan_surat_izin_path?: string | null;
  scan_surat_izin_nama?: string | null;
}

interface ApiResponse {
  data: EmployeeLeaveData;
  requests: LeaveRecordItem[];
  employee: {
    id: number;
    nip: string;
    nama_lengkap: string;
  };
}

interface EmployeeLeaveTabProps {
  employeeId: string;
}

const JENIS_CUTI_OPTIONS = [
  "Cuti Tahunan",
  "Cuti Tahunan Tahun 2025",
  "Cuti Tahunan 2025 & 2026",
  "Cuti Sakit",
  "Cuti Alasan Penting",
  "Cuti Melahirkan",
  "Cuti Besar",
  "Cuti Bersama",
  "Cuti di Luar Tanggungan Negara",
];

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

interface DynamicLeaveType {
  id: number;
  nama: string;
  kode: string | null;
  hitung_hari: "hari_kerja" | "hari_kalender";
  potong_kuota_tahunan: boolean;
  maks_hari: number | null;
}

function calculateLeaveDays(
  startDateStr: string,
  endDateStr: string,
  jenisCuti: string,
  leaveTypes: DynamicLeaveType[] = []
): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  const matched = leaveTypes.find(
    (lt) =>
      lt.nama.toLowerCase() === jenisCuti.toLowerCase() ||
      (lt.kode && lt.kode.toLowerCase() === jenisCuti.toLowerCase())
  );
  const isHariKerja = matched
    ? matched.hitung_hari === "hari_kerja"
    : jenisCuti.toLowerCase().includes("tahunan");

  if (!isHariKerja) {
    // Hari Kalender
    const diffTime = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffTime + 1);
  }

  // Hari Kerja (Senin - Jumat, abaikan Sabtu & Minggu)
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay(); // 0 is Sunday, 6 is Saturday
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

export function EmployeeLeaveTab({ employeeId }: EmployeeLeaveTabProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [filterScope, setFilterScope] = useState<"year" | "all">("year");

  // Fetch dynamic leave types
  const { data: leaveTypes = [] } = useQuery<DynamicLeaveType[]>({
    queryKey: ["leaveTypes"],
    queryFn: async () => {
      const res = await api.get(`/api/kepegawaian/leave-types?employee_id=${employeeId}`);
      return res.data?.data || [];
    },
  });

  // Modal dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecordItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [fileScanFormulir, setFileScanFormulir] = useState<File | null>(null);
  const [fileScanSuratIzin, setFileScanSuratIzin] = useState<File | null>(null);
  const viewerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusReturn = useDialogFocusReturn();
  const [viewerModal, setViewerModal] = useState<{ url: string; fileName?: string | null; title?: string } | null>(null);
  const closeViewer = useCallback(() => setViewerModal(null), []);
  const [uploadScanItem, setUploadScanItem] = useState<LeaveRecordItem | null>(null);

  // Form for Leave Balance (Admin Quota)
  const [balanceForm, setBalanceForm] = useState({
    hak_cuti_n: 12,
    sisa_cuti_n1: 0,
    cuti_terpakai_n1: 0,
    sisa_cuti_n2: 0,
    cuti_terpakai_n2: 0,
    cuti_terpakai_n0: 0,
    catatan: "",
  });

  // Form for Official Leave Record (Surat Izin Cuti)
  const [recordForm, setRecordForm] = useState({
    nomor_pengajuan: "",
    tanggal_pengajuan: new Date().toISOString().split("T")[0],
    jenis_cuti: "Cuti Tahunan",
    alasan_cuti: "",
    jumlah_hari: 1,
    tanggal_mulai: new Date().toISOString().split("T")[0],
    tanggal_selesai: new Date().toISOString().split("T")[0],
    catatan_atasan: "",
  });

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ["employeeLeave", employeeId, selectedYear],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(
        `/kepegawaian/employees/${employeeId}/leaves?year=${selectedYear}`
      );
      return data;
    },
  });

  const leaveData = apiResponse?.data;
  const leaveRequests = useMemo(() => apiResponse?.requests || [], [apiResponse]);

  // Filter requests based on selected filterScope (timezone-safe ISO string slice)
  const filteredRequests = useMemo(() => {
    if (filterScope === "all") return leaveRequests;
    return leaveRequests.filter((r) => {
      if (!r.tanggal_mulai) return false;
      const startYear = parseInt(String(r.tanggal_mulai).slice(0, 4), 10);
      return startYear === selectedYear;
    });
  }, [leaveRequests, filterScope, selectedYear]);

  // Sync balance form state whenever leaveData changes
  useEffect(() => {
    if (leaveData) {
      setBalanceForm({
        hak_cuti_n: leaveData.hak_cuti_n ?? 12,
        sisa_cuti_n1: leaveData.sisa_cuti_n1 ?? 0,
        cuti_terpakai_n1: leaveData.cuti_terpakai_n1 ?? 0,
        sisa_cuti_n2: leaveData.sisa_cuti_n2 ?? 0,
        cuti_terpakai_n2: leaveData.cuti_terpakai_n2 ?? 0,
        cuti_terpakai_n0: leaveData.cuti_terpakai_n0 ?? 0,
        catatan: leaveData.catatan || "",
      });
    }
  }, [leaveData]);

  // Real-time calculation based on BKN PNS Leave Rules (PerBKN 24/2017 & 7/2021)
  const calc = useMemo(() => {
    const hakN = Math.max(0, balanceForm.hak_cuti_n || 12);
    const sisaN1Raw = Math.max(0, balanceForm.sisa_cuti_n1 || 0);
    const hakN1 = Math.min(6, sisaN1Raw);

    const usedN1 = Math.max(0, balanceForm.cuti_terpakai_n1 || 0);
    const usedN2 = Math.max(0, balanceForm.cuti_terpakai_n2 || 0);
    const sisaN2Raw = Math.max(0, balanceForm.sisa_cuti_n2 || 0);

    const isEligible24 = usedN1 === 0 && usedN2 === 0 && sisaN1Raw >= 12 && sisaN2Raw >= 12;
    const hakN2 = isEligible24 ? 6 : 0;

    const totalHak = hakN + hakN1 + hakN2;
    const usedN0 = Math.max(0, balanceForm.cuti_terpakai_n0 || 0);
    const sisaTersedia = Math.max(0, totalHak - usedN0);

    return {
      hakN,
      hakN1,
      hakN2,
      isEligible24,
      totalHak,
      usedN0,
      sisaTersedia,
    };
  }, [balanceForm]);

  // Mutation: Save Quota Balance
  const saveBalanceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        year: selectedYear,
        hak_cuti_n: balanceForm.hak_cuti_n,
        sisa_cuti_n1: balanceForm.sisa_cuti_n1,
        cuti_terpakai_n1: balanceForm.cuti_terpakai_n1,
        sisa_cuti_n2: balanceForm.sisa_cuti_n2,
        cuti_terpakai_n2: balanceForm.cuti_terpakai_n2,
        cuti_terpakai_n0: balanceForm.cuti_terpakai_n0,
        catatan: balanceForm.catatan,
      };
      await api.post(`/kepegawaian/employees/${employeeId}/leaves`, payload);
    },
    onSuccess: () => {
      toast.success("Saldo & Kuota Cuti Pegawai berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["employeeLeave", employeeId, selectedYear] });
    },
    onError: (err: unknown) => {
      let msg = "Gagal menyimpan saldo cuti.";
      if (isAxiosError<{ message?: string }>(err)) {
        msg = err.response?.data?.message || msg;
      }
      toast.error(msg);
    },
  });

  const handleFileValidate = (f: File | null) => {
    if (!f) return false;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Ukuran berkas maksimal 10MB");
      return false;
    }
    const validExts = ["pdf", "jpg", "jpeg", "png"];
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExts.includes(ext)) {
      toast.error("Format berkas harus PDF, JPG, atau PNG");
      return false;
    }
    return true;
  };

  // Mutation: Save/Update Official Leave Record (SI / ST) with Optional Scan
  const saveRecordMutation = useMutation({
    mutationFn: async () => {
      if (!recordForm.nomor_pengajuan.trim()) {
        toast.error("Nomor surat persetujuan (SI / ST) wajib diisi.");
        throw new Error("Nomor surat wajib diisi");
      }
      if (!recordForm.tanggal_mulai || !recordForm.tanggal_selesai) {
        toast.error("Rentang tanggal cuti wajib diisi.");
        throw new Error("Tanggal cuti wajib diisi");
      }
      const startYear = parseInt(recordForm.tanggal_mulai.slice(0, 4), 10);
      const endYear = parseInt(recordForm.tanggal_selesai.slice(0, 4), 10);
      if (startYear !== endYear) {
        toast.error("Pengajuan cuti tidak boleh lintas tahun kalender (PerBKN 24/2017).");
        throw new Error("Lintas tahun kalender tidak diperbolehkan");
      }

      const isTahunanForm = selectedLeaveType
        ? selectedLeaveType.potong_kuota_tahunan
        : recordForm.jenis_cuti.toLowerCase().includes("tahunan");
      const startDate = recordForm.tanggal_mulai ? parseLocalDate(recordForm.tanggal_mulai) : new Date();
      if (isTahunanForm && apiResponse?.employee?.nip && !isEligibleForAnnualLeave({ nip: apiResponse.employee.nip }, startDate)) {
        toast.error("Pegawai baru berhak mengajukan Cuti Tahunan setelah genap 1 tahun masa kerja sejak pengangkatan.");
        throw new Error("Pegawai baru berhak mengajukan Cuti Tahunan setelah genap 1 tahun masa kerja terhitung sejak pengangkatan.");
      }

      const formData = new FormData();
      formData.append("nomor_pengajuan", recordForm.nomor_pengajuan);
      formData.append("tanggal_pengajuan", recordForm.tanggal_pengajuan);
      formData.append("jenis_cuti", recordForm.jenis_cuti);
      formData.append("alasan_cuti", recordForm.alasan_cuti || recordForm.jenis_cuti);
      formData.append("jumlah_hari", String(recordForm.jumlah_hari));
      formData.append("tanggal_mulai", recordForm.tanggal_mulai);
      formData.append("tanggal_selesai", recordForm.tanggal_selesai);
      formData.append("catatan_atasan", recordForm.alasan_cuti || "");
      formData.append("status", "DISETUJUI");
      if (fileScanFormulir) {
        formData.append("file_scan_formulir", fileScanFormulir);
      }
      if (fileScanSuratIzin) {
        formData.append("file_scan_surat_izin", fileScanSuratIzin);
      }

      if (editingRecord) {
        formData.append("_method", "PUT");
        await api.post(`/kepegawaian/employees/${employeeId}/leave-records/${editingRecord.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post(`/kepegawaian/employees/${employeeId}/leave-records`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingRecord ? "Penetapan cuti berhasil diperbarui!" : "Surat Izin Cuti berhasil dicatat!");
      setIsDialogOpen(false);
      setEditingRecord(null);
      setFileScanFormulir(null);
      setFileScanSuratIzin(null);
      queryClient.invalidateQueries({ queryKey: ["employeeLeave", employeeId, selectedYear] });
    },
    onError: (err: unknown) => {
      let msg = "Gagal menyimpan penetapan cuti.";
      if (err instanceof Error) {
        msg = err.message;
      }
      if (isAxiosError<{ message?: string }>(err)) {
        msg = err.response?.data?.message || msg;
      }
      toast.error(msg);
    },
  });

  // Mutation: Upload or Replace Scan File on Existing Record
  const uploadRecordScanMutation = useMutation({
    mutationFn: async ({
      id,
      fileFormulir,
      fileSuratIzin,
    }: {
      id: number;
      fileFormulir: File | null;
      fileSuratIzin: File | null;
    }) => {
      const formData = new FormData();
      if (fileFormulir) {
        formData.append("file_scan_formulir", fileFormulir);
      }
      if (fileSuratIzin) {
        formData.append("file_scan_surat_izin", fileSuratIzin);
      }
      await api.post(`/kepegawaian/leave-requests/${id}/upload-scan`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Berkas cuti resmi berhasil disimpan!");
      setUploadScanItem(null);
      queryClient.invalidateQueries({ queryKey: ["employeeLeave", employeeId, selectedYear] });
    },
    onError: (err: unknown) => {
      let msg = "Gagal mengunggah berkas scan.";
      if (isAxiosError<{ message?: string }>(err)) {
        msg = err.response?.data?.message || msg;
      }
      toast.error(msg);
    },
  });

  // Mutation: Delete Official Leave Record
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/kepegawaian/employees/${employeeId}/leave-records/${id}`);
    },
    onSuccess: () => {
      toast.success("Penetapan cuti berhasil dihapus.");
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["employeeLeave", employeeId, selectedYear] });
    },
    onError: (err: unknown) => {
      let msg = "Gagal menghapus penetapan cuti.";
      if (isAxiosError<{ message?: string }>(err)) {
        msg = err.response?.data?.message || msg;
      }
      toast.error(msg);
    },
  });

  const handleDateChange = (field: "tanggal_mulai" | "tanggal_selesai", val: string) => {
    setRecordForm((prev) => {
      const next = { ...prev, [field]: val };
      if (next.tanggal_mulai && next.tanggal_selesai) {
        const days = calculateLeaveDays(next.tanggal_mulai, next.tanggal_selesai, next.jenis_cuti, leaveTypes);
        if (days > 0) {
          next.jumlah_hari = days;
        }
      }
      return next;
    });
  };

  const handleJenisCutiChange = (val: string) => {
    setRecordForm((prev) => {
      const next = { ...prev, jenis_cuti: val };
      if (next.tanggal_mulai && next.tanggal_selesai) {
        const days = calculateLeaveDays(next.tanggal_mulai, next.tanggal_selesai, val, leaveTypes);
        if (days > 0) {
          next.jumlah_hari = days;
        }
      }
      return next;
    });
  };

  const handleOpenCreateDialog = () => {
    setEditingRecord(null);
    setFileScanFormulir(null);
    setFileScanSuratIzin(null);
    const today = new Date().toISOString().split("T")[0];
    const initialDays = calculateLeaveDays(today, today, "Cuti Tahunan", leaveTypes);
    setRecordForm({
      nomor_pengajuan: "",
      tanggal_pengajuan: today,
      jenis_cuti: "Cuti Tahunan",
      alasan_cuti: "",
      jumlah_hari: initialDays || 1,
      tanggal_mulai: today,
      tanggal_selesai: today,
      catatan_atasan: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (record: LeaveRecordItem) => {
    setEditingRecord(record);
    setFileScanFormulir(null);
    setFileScanSuratIzin(null);
    const rawAlasan = record.alasan_cuti || record.catatan_atasan || "";
    const cleanAlasan = rawAlasan.toLowerCase().includes("sisa cuti") ? "" : rawAlasan;

    setRecordForm({
      nomor_pengajuan: record.nomor_pengajuan || "",
      tanggal_pengajuan: record.tanggal_pengajuan || new Date().toISOString().split("T")[0],
      jenis_cuti: record.jenis_cuti || "Cuti Tahunan",
      alasan_cuti: cleanAlasan,
      jumlah_hari: record.jumlah_hari || 1,
      tanggal_mulai: record.tanggal_mulai || "",
      tanggal_selesai: record.tanggal_selesai || "",
      catatan_atasan: record.catatan_atasan || "",
    });
    setIsDialogOpen(true);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const isPppk = apiResponse?.employee?.nip
    ? detectEmployeeType({ nip: apiResponse.employee.nip }) === "PPPK"
    : false;

  const availableLeaveTypeNames = useMemo(() => {
    let list = leaveTypes;
    if (isPppk) {
      list = list.filter(
        (lt) => lt.kode !== "CAP" && !lt.nama.toLowerCase().includes("alasan penting")
      );
    }
    if (list.length > 0) {
      const names = list.map((lt) => lt.nama);
      if (recordForm.jenis_cuti && !names.includes(recordForm.jenis_cuti)) {
        names.push(recordForm.jenis_cuti);
      }
      return names;
    }
    const defaultOptions = isPppk
      ? JENIS_CUTI_OPTIONS.filter((opt) => !opt.toLowerCase().includes("alasan penting"))
      : JENIS_CUTI_OPTIONS;
    return defaultOptions;
  }, [leaveTypes, recordForm.jenis_cuti, isPppk]);

  const selectedLeaveType = leaveTypes.find(
    (lt) => lt.nama.toLowerCase() === recordForm.jenis_cuti.toLowerCase()
  );
  const isTahunan = selectedLeaveType
    ? selectedLeaveType.potong_kuota_tahunan
    : recordForm.jenis_cuti.toLowerCase().includes("tahunan");

  return (
    <div className="space-y-6">
      {/* Header Selector & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--ds-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--ds-fg)]">Buku Kendali & Hak Cuti PNS</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                Tahun {selectedYear}
              </span>
            </div>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Penghitungan otomatis hak cuti tahunan dan pencatatan Surat Izin (SI/ST) sesuai{" "}
              <span className="font-semibold text-[var(--ds-fg)]">Peraturan BKN No. 24/2017 & No. 7/2021</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBalanceDialogOpen(true)}
            className="h-8.5 px-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs font-semibold text-[var(--ds-fg)] hover:bg-[var(--ds-surface)] gap-1.5 shadow-2xs"
            title="Penyesuaian saldo awal khusus untuk pegawai pindahan atau mutasi"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
            <span className="hidden sm:inline">Sesuaikan Saldo Awal</span>
          </Button>

          <label className="text-xs font-semibold text-[var(--ds-fg-muted)] ml-1">Tahun:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg)] outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] shadow-xs" aria-label="Tahun:"
          >
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--ds-fg-muted)]">
          <div className="w-6 h-6 border-2 border-[var(--ds-accent-soft-border)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat data saldo dan riwayat cuti...
        </div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Hak Cuti Tahun Ini */}
            <div className="border border-[var(--ds-accent-soft-border)] rounded-2xl p-4.5 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ds-accent-fg)]">Total Hak Cuti {selectedYear}</span>
                <Award className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[var(--ds-accent-fg)] tracking-tight">{calc.totalHak}</span>
                <span className="text-xs font-bold text-[var(--ds-accent-fg)]">Hari Kerja</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--ds-accent-soft-border)] flex flex-wrap items-center gap-1.5 text-xs text-[var(--ds-accent-fg)]">
                <span className="font-semibold">Pokok: {calc.hakN}</span>
                <span>•</span>
                <span>Sisa {selectedYear - 1}: +{calc.hakN1}</span>
                <span>•</span>
                <span>Sisa {selectedYear - 2}: +{calc.hakN2}</span>
              </div>
            </div>

            {/* Card 2: Sisa Cuti Tersedia Saat Ini */}
            <div className="border border-[var(--ds-status-success-border)] rounded-2xl p-4.5 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ds-status-success-fg)]">Sisa Cuti Tersedia</span>
                <CheckCircle2 className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[var(--ds-status-success-fg)] tracking-tight">{calc.sisaTersedia}</span>
                <span className="text-xs font-bold text-[var(--ds-status-success-fg)]">Hari Kerja</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--ds-status-success-border)] text-xs text-[var(--ds-status-success-fg)] flex items-center justify-between">
                <span>Terpakai tahun ini:</span>
                <span className="font-bold bg-[var(--ds-status-success-bg)] px-2 py-0.5 rounded-md text-[var(--ds-status-success-fg)]">
                  {calc.usedN0} Hari
                </span>
              </div>
            </div>

            {/* Card 3: Status Akumulasi Klausa 24 Hari */}
            <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--ds-fg)]">Klausa Akumulasi Cuti</span>
                  <ShieldCheck className="w-4 h-4 text-[var(--ds-fg-muted)]" />
                </div>
                {calc.isEligible24 ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ds-status-success-fg)] shrink-0" />
                    <span>Akumulasi 24 Hari Aktif</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ds-fg)] bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-[var(--ds-fg-muted)] shrink-0" />
                    <span>Maksimal Standar 18 Hari</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-2.5 leading-relaxed">
                {calc.isEligible24
                  ? "2 Tahun berturut-turut tanpa pemakaian cuti. Kuota akumulasi maksimal 24 hari diizinkan."
                  : "Sisa cuti tahun lalu (N-1) diakui maksimal 6 hari kerja sesuai ketentuan PerBKN 24/2017."}
              </p>
            </div>
          </div>

          {/* Section: Riwayat Surat Izin / Penetapan Cuti Resmi (Buku Kendali BKSDA) */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--ds-fg)]">Riwayat Surat Izin & Penetapan Cuti Resmi</h4>
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Pencatatan nomor Surat Izin (SI/ST) dari kartu kendali cuti resmi BKSDA Kalimantan Timur.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                {/* Filter toggle: Tahun Ini vs Semua Tahun */}
                <div className="inline-flex p-0.5 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterScope("year")}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      filterScope === "year"
                        ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs"
                        : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                    }`}
                  >
                    Tahun {selectedYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope("all")}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      filterScope === "all"
                        ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs"
                        : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                    }`}
                  >
                    Semua ({leaveRequests.length})
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenCreateDialog}
                  size="sm"
                  className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-bold rounded-xl gap-1.5 h-8.5 px-3.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat Surat Izin
                </Button>
              </div>
            </div>

            {/* Table: Fit 100% without horizontal scrolling */}
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[var(--ds-surface)] border border-dashed border-[var(--ds-border-subtle)]">
                <FileText className="w-8 h-8 text-[var(--ds-fg-muted)] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[var(--ds-fg)]">Belum ada riwayat surat izin cuti tercatat</p>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                  {filterScope === "year"
                    ? `Tidak ada transaksi cuti pada tahun ${selectedYear}.`
                    : "Belum ada penetapan cuti untuk pegawai ini."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCreateDialog}
                  className="mt-3 text-xs font-bold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Cuti Pertama
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] font-bold border-b border-[var(--ds-border-subtle)]">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">No</th>
                      <th className="py-2.5 px-3 w-[28%]">Surat Persetujuan (SI / ST)</th>
                      <th className="py-2.5 px-3 w-[16%]">Jenis Cuti</th>
                      <th className="py-2.5 px-3 w-[22%]">Pelaksanaan & Durasi</th>
                      <th className="py-2.5 px-3 w-[18%]">Alasan Cuti</th>
                      <th className="py-2.5 px-3 w-[16%] text-right">Status & Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                    {filteredRequests.map((req, idx) => (
                      <tr key={req.id} className="hover:bg-[var(--ds-surface)] transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-[var(--ds-fg-muted)] align-top">{idx + 1}</td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-bold text-[var(--ds-fg)] font-mono text-xs break-all leading-tight">
                            {req.nomor_pengajuan || "-"}
                          </div>
                          <div className="text-xs text-[var(--ds-fg-muted)] mt-1 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-[var(--ds-fg-muted)] shrink-0" />
                            <span>Tgl Surat: {formatDate(req.tanggal_pengajuan)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold leading-snug ${
                              req.jenis_cuti.toLowerCase().includes("tahunan")
                                ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"
                                : req.jenis_cuti.toLowerCase().includes("sakit")
                                ? "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)]"
                                : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"
                            }`}
                          >
                            {req.jenis_cuti}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-[var(--ds-fg)] text-xs">
                            {formatDate(req.tanggal_mulai)} s.d. {formatDate(req.tanggal_selesai)}
                          </div>
                          <div className="mt-1">
                            <span className="inline-block font-bold text-[var(--ds-fg)] bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] px-1.5 py-0.5 rounded text-xs">
                              {req.jumlah_hari} {req.jenis_cuti.toLowerCase().includes("tahunan") ? "Hari Kerja" : "Hari"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          {(() => {
                            const raw = req.alasan_cuti || req.catatan_atasan;
                            if (!raw || raw.toLowerCase().includes("sisa cuti")) {
                              return <span className="text-[var(--ds-fg-muted)] text-xs italic">-</span>;
                            }
                            return (
                              <span className="inline-block text-xs font-medium text-[var(--ds-fg)] bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] px-2 py-0.5 rounded-md leading-snug">
                                {raw}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3 align-top text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                            {(() => {
                              const st = (req.status || "PENGAJUAN").toUpperCase();
                              const isApproved = st === "DISETUJUI" || st === "APPROVED";
                              const isRejected = st === "DITOLAK" || st === "REJECTED";

                              return (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0 uppercase tracking-wider",
                                    isApproved
                                      ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]   "
                                      : isRejected
                                      ? "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border-[var(--ds-status-danger-border)]   "
                                      : "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]   "
                                  )}
                                >
                                  {isApproved ? (
                                    <CheckCircle2 className="w-3 h-3 text-[var(--ds-status-success-fg)]" />
                                  ) : isRejected ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-danger-solid)]" />
                                  ) : (
                                    <span className="relative flex h-2 w-2 shrink-0">
                                      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--ds-status-warning-fg)] opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--ds-status-warning-fg)]" />
                                    </span>
                                  )}
                                  <span>{isApproved ? "Disetujui" : isRejected ? "Ditolak" : "Pengajuan"}</span>
                                </span>
                              );
                            })()}
                            {(() => {
                              const hasSuratIzin = !!(req.scan_surat_izin_path || req.scan_surat_path);
                              const hasFormulir = !!req.scan_formulir_path;
                              const uploadedCount = (hasSuratIzin ? 1 : 0) + (hasFormulir ? 1 : 0);

                              return (
                                <div className="flex items-center gap-1.5">
                                  {/* Berkas Dropdown Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild
                                      onPointerDownCapture={(event) => { viewerTriggerRef.current = event.currentTarget; }}
                                      onKeyDownCapture={(event) => { viewerTriggerRef.current = event.currentTarget; }}
                                    >
                                      <button
                                        type="button"
                                        className={cn(
                                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
                                          uploadedCount === 2
                                            ? "text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-bg)] hover:bg-[var(--ds-status-success-bg)]"
                                            : uploadedCount === 1
                                            ? "text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] hover:bg-[var(--ds-status-warning-bg)]"
                                            : "text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)]"
                                        )}
                                        title="Kelola & Lihat Berkas Scan Cuti"
                                      >
                                        {uploadedCount === 2 ? (
                                          <CheckCircle2 className="w-3 h-3 text-[var(--ds-status-success-fg)]" />
                                        ) : uploadedCount === 1 ? (
                                          <Clock className="w-3 h-3 text-[var(--ds-status-warning-fg)]" />
                                        ) : (
                                          <FileUp className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                                        )}
                                        <span>{uploadedCount > 0 ? `Berkas (${uploadedCount})` : "+ Berkas"}</span>
                                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent data-module="kepegawaian" align="end" className="kpg-ui w-60 p-1.5 rounded-2xl shadow-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
                                      <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] px-2 py-1">
                                        Berkas Scan Cuti
                                      </DropdownMenuLabel>

                                      <DropdownMenuItem
                                        disabled={!hasSuratIzin}
                                        onClick={() => setViewerModal({
                                            url: `/kepegawaian/leave-requests/${req.id}/scan-surat-izin`,
                                            fileName: req.scan_surat_izin_nama || req.scan_surat_nama,
                                            title: "Surat Izin Cuti Resmi (TTE Kepala Balai)",
                                          })}
                                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileCheck className={cn("w-4 h-4", hasSuratIzin ? "text-[var(--ds-status-success-fg)]" : "text-[var(--ds-fg-muted)]")} />
                                          <span className={cn("font-medium", !hasSuratIzin && "text-[var(--ds-fg-muted)]")}>Surat Izin (TTE)</span>
                                        </div>
                                        {hasSuratIzin ? (
                                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]">
                                            Lihat
                                          </span>
                                        ) : (
                                          <span className="text-xs text-[var(--ds-fg-muted)] italic">Belum ada</span>
                                        )}
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        disabled={!hasFormulir}
                                        onClick={() => setViewerModal({
                                            url: `/kepegawaian/leave-requests/${req.id}/scan-formulir`,
                                            fileName: req.scan_formulir_nama,
                                            title: "Scan Formulir Permohonan Cuti (TTD Manual & Cap Balai)",
                                          })}
                                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileText className={cn("w-4 h-4", hasFormulir ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)]")} />
                                          <span className={cn("font-medium", !hasFormulir && "text-[var(--ds-fg-muted)]")}>Formulir (Scan)</span>
                                        </div>
                                        {hasFormulir ? (
                                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                                            Lihat
                                          </span>
                                        ) : (
                                          <span className="text-xs text-[var(--ds-fg-muted)] italic">Belum ada</span>
                                        )}
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator className="my-1 border-[var(--ds-border-subtle)]" />

                                      <DropdownMenuItem
                                        onClick={() => setUploadScanItem(req)}
                                        className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-xl text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] cursor-pointer font-semibold"
                                      >
                                        <FileUp className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                                        <span>{uploadedCount > 0 ? "Unggah Ulang Berkas" : "Unggah Berkas Scan"}</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {/* Aksi More Dropdown (...) */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild
                                      onPointerDownCapture={(event) => { viewerTriggerRef.current = event.currentTarget; }}
                                      onKeyDownCapture={(event) => { viewerTriggerRef.current = event.currentTarget; }}
                                    >
                                      <button
                                        type="button"
                                        className="p-1 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg transition-colors cursor-pointer"
                                        title="Aksi Lainnya"
                                      >
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent data-module="kepegawaian" align="end" className="kpg-ui w-40 p-1 rounded-2xl shadow-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
                                      <DropdownMenuItem
                                        onClick={() => handleOpenEditDialog(req)}
                                        className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-xl cursor-pointer text-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-status-warning-bg)] font-medium"
                                      >
                                        <Pencil className="w-3 h-3" />
                                        <span>Edit Cuti</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1 border-[var(--ds-border-subtle)]" />
                                      <DropdownMenuItem
                                        onClick={() => setDeleteConfirmId(req.id)}
                                        className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-xl cursor-pointer text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] font-medium"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Hapus Cuti</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}

      {/* Modal Dialog: Penyesuaian Saldo Awal (Khusus Pindahan / Mutasi) */}
      <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
        <DialogContent {...focusReturn} data-module="kepegawaian" className="kpg-ui max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">
              Penyesuaian Saldo Awal (Tahun {selectedYear})
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Digunakan khusus pegawai baru atau mutasi instansi luar. Untuk operasional rutin BKSDA, saldo cuti otomatis dihitung dari Surat Izin (SI/ST).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBalanceMutation.mutate();
              setIsBalanceDialogOpen(false);
            }}
            className="space-y-3.5 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[var(--ds-fg)]">Hak Pokok Tahun {selectedYear}</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={balanceForm.hak_cuti_n}
                  onChange={(e) => setBalanceForm({ ...balanceForm, hak_cuti_n: Number(e.target.value) })}
                  className="mt-1 text-xs h-9"
                />
                <span className="text-xs text-[var(--ds-fg-muted)] mt-0.5 block">Standar PNS: 12 hari</span>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--ds-fg)]">Sisa Cuti Tahun {selectedYear - 1} (N-1)</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={balanceForm.sisa_cuti_n1}
                  onChange={(e) => setBalanceForm({ ...balanceForm, sisa_cuti_n1: Number(e.target.value) })}
                  className="mt-1 text-xs h-9"
                />
                <span className="text-xs text-[var(--ds-fg-muted)] mt-0.5 block">Diakui maks. 6 hari</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--ds-fg)]">Catatan Penangguhan / Keterangan Khusus</label>
              <Textarea
                rows={2}
                value={balanceForm.catatan}
                onChange={(e) => setBalanceForm({ ...balanceForm, catatan: e.target.value })}
                placeholder="Contoh: Pegawai pindahan dari BKSDA Sulsel, membawa sisa cuti..."
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBalanceDialogOpen(false)}
                className="text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveBalanceMutation.isPending}
                className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-bold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saveBalanceMutation.isPending ? "Menyimpan..." : "Simpan Penyesuaian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Tambah / Edit Surat Izin Cuti */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent {...focusReturn} data-module="kepegawaian" className="kpg-ui sm:max-w-2xl max-w-[95vw] p-6">
          <DialogHeader className="pb-3 border-b border-[var(--ds-border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center text-[var(--ds-accent-fg)] shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">
                  {editingRecord ? "Edit Surat Izin Penetapan Cuti" : "Catat Surat Izin Penetapan Cuti"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                  Pencatatan data surat keputusan izin cuti resmi (SI / ST) untuk buku kendali cuti pegawai.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Interactive Employee Leave Balance Card */}
          <div className="rounded-xl border border-[var(--ds-accent-soft-border)] p-3.5 mt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ds-fg)]">
                  <Award className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                  <span>Sisa Kuota Cuti Pegawai (Tahun {selectedYear}):</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--ds-fg-muted)]">
                  <span>Pokok: <b>{calc.hakN}</b></span>
                  <span>•</span>
                  <span>N-1: <b>+{calc.hakN1}</b></span>
                  <span>•</span>
                  <span>N-2: <b>+{calc.hakN2}</b></span>
                  <span>•</span>
                  <span>Terpakai: <b>{calc.usedN0}</b></span>
                </div>
              </div>
              <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                <span className="text-xs uppercase tracking-wider font-semibold text-[var(--ds-fg-muted)]">Kuota Tersedia</span>
                <span className="text-xl font-extrabold text-[var(--ds-accent-fg)]">{calc.sisaTersedia} <span className="text-xs font-bold">Hari</span></span>
              </div>
            </div>

            {/* Live simulation of remaining balance if Cuti Tahunan / cuts quota */}
            {isTahunan && recordForm.jumlah_hari > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[var(--ds-accent-soft-border)] flex items-center justify-between text-xs">
                <span className="text-[var(--ds-fg-muted)]">Simulasi sisa setelah cuti ini ({recordForm.jumlah_hari} hari):</span>
                {(() => {
                  const projectedDiff = editingRecord
                    ? Math.max(0, recordForm.jumlah_hari - editingRecord.jumlah_hari)
                    : recordForm.jumlah_hari;
                  const projectedRemaining = calc.sisaTersedia - projectedDiff;
                  if (projectedRemaining < 0) {
                    return (
                      <span className="font-bold text-[var(--ds-status-danger-fg)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Melebihi kuota (kurang {Math.abs(projectedRemaining)} hari)
                      </span>
                    );
                  }
                  return (
                    <span className="font-bold text-[var(--ds-status-success-fg)] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sisa {projectedRemaining} Hari
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveRecordMutation.mutate();
            }}
            className="space-y-4 pt-1 pb-1"
          >
            {/* Grid Baris 1: Surat Persetujuan & Tanggal Terbit */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-7">
                <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1">
                  Nomor Surat Persetujuan (SI / ST) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <Input
                  required
                  value={recordForm.nomor_pengajuan}
                  onChange={(e) => setRecordForm({ ...recordForm, nomor_pengajuan: e.target.value })}
                  placeholder="Contoh: SI.80/K.18/TU/PEG.12.1/B/04/2025"
                  className="mt-1 text-xs font-mono h-9 bg-[var(--ds-surface)] focus:bg-white transition-colors"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1">
                  Tanggal Surat <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={recordForm.tanggal_pengajuan}
                  onChange={(e) => setRecordForm({ ...recordForm, tanggal_pengajuan: e.target.value })}
                  className="mt-1 text-xs h-9 bg-[var(--ds-surface)] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Grid Baris 2: Jenis Cuti & Alasan Cuti (1 Baris Side-by-Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1">
                  Jenis Cuti / Izin <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <select
                  value={recordForm.jenis_cuti}
                  onChange={(e) => handleJenisCutiChange(e.target.value)}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] focus:bg-white text-xs font-medium focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] outline-none transition-colors" aria-label="Jenis Cuti / Izin"
                >
                  {availableLeaveTypeNames.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--ds-fg)]">
                    Alasan / Keperluan Cuti
                  </label>
                  <span className="text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-1.5 py-0.5 rounded-full font-medium">
                    Opsional
                  </span>
                </div>
                <Input
                  value={recordForm.alasan_cuti}
                  onChange={(e) => setRecordForm({ ...recordForm, alasan_cuti: e.target.value })}
                  placeholder="Opsional (otomatis sesuai jenis cuti)"
                  className="mt-1 text-xs h-9 bg-[var(--ds-surface)] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Grid Baris 3: Rentang Tanggal Mulai & Selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1">
                  Tanggal Mulai Pelaksanaan <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={recordForm.tanggal_mulai}
                  onChange={(e) => handleDateChange("tanggal_mulai", e.target.value)}
                  className="mt-1 text-xs h-9 bg-[var(--ds-surface)] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1">
                  Tanggal Selesai Pelaksanaan <span className="text-[var(--ds-status-danger-fg)]">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={recordForm.tanggal_selesai}
                  onChange={(e) => handleDateChange("tanggal_selesai", e.target.value)}
                  className="mt-1 text-xs h-9 bg-[var(--ds-surface)] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Grid Baris 4 (DI BAWAH Tanggal Mulai & Selesai): Lama Cuti Otomatis Terhitung */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-5">
                <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center justify-between">
                  <span>Lama Cuti <span className="text-[var(--ds-status-danger-fg)]">*</span></span>
                  <span className="text-xs text-[var(--ds-fg-muted)] font-normal">
                    {selectedLeaveType
                      ? selectedLeaveType.hitung_hari === "hari_kerja"
                        ? "Hari Kerja"
                        : "Hari Kalender"
                      : recordForm.jenis_cuti.toLowerCase().includes("tahunan")
                      ? "Hari Kerja"
                      : "Hari Kalender"}
                  </span>
                </label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={recordForm.jumlah_hari}
                    onChange={(e) => setRecordForm({ ...recordForm, jumlah_hari: Number(e.target.value) })}
                    className="text-xs font-bold h-9 pr-14 bg-[var(--ds-surface)] focus:bg-white transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-medium text-[var(--ds-fg-muted)]">
                    Hari
                  </div>
                </div>
              </div>

              <div className="sm:col-span-7 flex flex-col justify-end">
                <div className="p-2 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg-muted)] flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[var(--ds-accent-fg)] shrink-0" />
                  <span>
                    {(selectedLeaveType
                      ? selectedLeaveType.hitung_hari === "hari_kerja"
                        : recordForm.jenis_cuti.toLowerCase().includes("tahunan"))
                      ? "Otomatis dihitung hari kerja (Senin - Jumat)."
                      : "Otomatis dihitung hari kalender penuh."}
                    {" Dapat diedit manual jika terdapat libur nasional."}
                  </span>
                </div>
              </div>
            </div>

            {/* Baris 5: Berkas Scan Surat Cuti (1 Baris - 2 Slot Side-by-Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Slot 1: Scan Surat Pengantar dan Formulir Cuti */}
              <div className="flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 gap-1">
                  <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-[var(--ds-accent-fg)] shrink-0" />
                    <span className="truncate">1. Scan Surat Pengantar & Formulir</span>
                  </label>
                  <span className="text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-1.5 py-0.5 rounded-full font-medium shrink-0">
                    Opsional
                  </span>
                </div>

                {editingRecord?.scan_formulir_nama && !fileScanFormulir && (
                  <div className="mb-1.5 p-1.5 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-xs text-[var(--ds-accent-fg)] flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-[var(--ds-accent-fg)] shrink-0" />
                      <span className="truncate font-semibold">{editingRecord.scan_formulir_nama}</span>
                    </span>
                    <span className="text-xs text-[var(--ds-accent-fg)] font-medium shrink-0">Tersimpan</span>
                  </div>
                )}

                <div className="border border-dashed border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-soft-border)] rounded-xl p-2.5 text-center bg-[var(--ds-surface)] transition-colors">
                  <input
                    type="file"
                    id="file_scan_formulir_manual"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (handleFileValidate(f)) {
                        setFileScanFormulir(f);
                      } else {
                        e.target.value = "";
                      }
                    }}
                    className="sr-only"
                  />
                  <label htmlFor="file_scan_formulir_manual" className="kpg-upload cursor-pointer block rounded-lg p-2">
                    {fileScanFormulir ? (
                      <div className="flex items-center justify-center gap-1.5 text-[var(--ds-accent-fg)] font-semibold text-xs">
                        <FileCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[160px]">{fileScanFormulir.name}</span>
                        <span className="text-xs text-[var(--ds-fg-muted)] font-normal shrink-0">
                          ({(fileScanFormulir.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--ds-fg-muted)] text-xs font-medium block truncate">
                        {editingRecord?.scan_formulir_nama ? "Ganti Berkas Pengantar & Formulir" : "Pilih Scan Pengantar & Formulir"}
                      </span>
                    )}
                  </label>
                </div>
                {fileScanFormulir && (
                  <button
                    type="button"
                    onClick={() => setFileScanFormulir(null)}
                    className="text-xs text-[var(--ds-status-danger-fg)] hover:underline mt-1 text-left"
                  >
                    Batalkan pilihan berkas
                  </button>
                )}
              </div>

              {/* Slot 2: Surat Izin Cuti Resmi (TTE) */}
              <div className="flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 gap-1">
                  <label className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1.5 truncate">
                    <FileCheck className="w-3.5 h-3.5 text-[var(--ds-status-success-fg)] shrink-0" />
                    <span className="truncate">2. Scan Surat Izin Resmi (TTE)</span>
                  </label>
                  <span className="text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-1.5 py-0.5 rounded-full font-medium shrink-0">
                    Opsional
                  </span>
                </div>

                {(editingRecord?.scan_surat_izin_nama || editingRecord?.scan_surat_nama) && !fileScanSuratIzin && (
                  <div className="mb-1.5 p-1.5 rounded-lg bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] text-xs text-[var(--ds-status-success-fg)] flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-[var(--ds-status-success-fg)] shrink-0" />
                      <span className="truncate font-semibold">{editingRecord.scan_surat_izin_nama || editingRecord.scan_surat_nama}</span>
                    </span>
                    <span className="text-xs text-[var(--ds-status-success-fg)] font-medium shrink-0">Tersimpan</span>
                  </div>
                )}

                <div className="border border-dashed border-[var(--ds-border-subtle)] hover:border-[var(--ds-status-success-border)] rounded-xl p-2.5 text-center bg-[var(--ds-surface)] transition-colors">
                  <input
                    type="file"
                    id="file_scan_surat_izin_manual"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (handleFileValidate(f)) {
                        setFileScanSuratIzin(f);
                      } else {
                        e.target.value = "";
                      }
                    }}
                    className="sr-only"
                  />
                  <label htmlFor="file_scan_surat_izin_manual" className="kpg-upload cursor-pointer block rounded-lg p-2">
                    {fileScanSuratIzin ? (
                      <div className="flex items-center justify-center gap-1.5 text-[var(--ds-status-success-fg)] font-semibold text-xs">
                        <FileCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[160px]">{fileScanSuratIzin.name}</span>
                        <span className="text-xs text-[var(--ds-fg-muted)] font-normal shrink-0">
                          ({(fileScanSuratIzin.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--ds-fg-muted)] text-xs font-medium block truncate">
                        {editingRecord?.scan_surat_izin_nama || editingRecord?.scan_surat_nama ? "Ganti Berkas Surat Izin" : "Pilih Surat Izin Resmi / TTE"}
                      </span>
                    )}
                  </label>
                </div>
                {fileScanSuratIzin && (
                  <button
                    type="button"
                    onClick={() => setFileScanSuratIzin(null)}
                    className="text-xs text-[var(--ds-status-danger-fg)] hover:underline mt-1 text-left"
                  >
                    Batalkan pilihan surat izin
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="gap-2 pt-3 border-t border-[var(--ds-border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveRecordMutation.isPending}
                className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {saveRecordMutation.isPending
                  ? "Menyimpan..."
                  : editingRecord
                  ? "Simpan Perubahan"
                  : "Simpan Penetapan Cuti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Delete Record */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent {...focusReturn} data-module="kepegawaian" className="kpg-ui max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">Hapus Penetapan Cuti?</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Apakah Anda yakin ingin menghapus data penetapan cuti ini? Saldo cuti terpakai akan otomatis dikurangi
              kembali.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteRecordMutation.isPending}
              onClick={() => deleteConfirmId && deleteRecordMutation.mutate(deleteConfirmId)}
              className="bg-[var(--ds-danger-solid)] hover:bg-[var(--ds-danger-solid)] text-[var(--ds-accent-on-solid)] text-xs font-bold gap-1.5" variant="destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteRecordMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pratinjau Berkas Scan Cuti Pegawai */}
      <ScanViewerModal
        contentModule="kepegawaian"
        returnFocusRef={viewerTriggerRef}
        isOpen={!!viewerModal}
        scanUrl={viewerModal?.url || null}
        fileName={viewerModal?.fileName}
        title={viewerModal?.title}
        onClose={closeViewer}
      />

      {/* Upload / Ganti Berkas Scan Cuti Pegawai */}
      <UploadScanModal
        item={uploadScanItem ? {
          id: uploadScanItem.id,
          scan_surat_path: uploadScanItem.scan_surat_path,
          scan_surat_nama: uploadScanItem.scan_surat_nama,
          scan_formulir_path: uploadScanItem.scan_formulir_path,
          scan_formulir_nama: uploadScanItem.scan_formulir_nama,
          scan_surat_izin_path: uploadScanItem.scan_surat_izin_path,
          scan_surat_izin_nama: uploadScanItem.scan_surat_izin_nama,
          employee: { nama_lengkap: apiResponse?.employee?.nama_lengkap || "Pegawai" },
        } : null}
        isPending={uploadRecordScanMutation.isPending}
        onClose={() => setUploadScanItem(null)}
        onUpload={({ fileFormulir, fileSuratIzin }) => {
          if (uploadScanItem) {
            uploadRecordScanMutation.mutate({
              id: uploadScanItem.id,
              fileFormulir,
              fileSuratIzin,
            });
          }
        }}
      />
    </div>
  );
}
