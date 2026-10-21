"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { isAxiosError } from "axios";

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

export function EmployeeLeaveTab({ employeeId }: EmployeeLeaveTabProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [filterScope, setFilterScope] = useState<"year" | "all">("year");

  // Modal dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecordItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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

  // Mutation: Save/Update Official Leave Record (SI / ST)
  const saveRecordMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nomor_pengajuan: recordForm.nomor_pengajuan,
        tanggal_pengajuan: recordForm.tanggal_pengajuan,
        jenis_cuti: recordForm.jenis_cuti,
        alasan_cuti: recordForm.alasan_cuti || recordForm.jenis_cuti,
        jumlah_hari: Number(recordForm.jumlah_hari),
        tanggal_mulai: recordForm.tanggal_mulai,
        tanggal_selesai: recordForm.tanggal_selesai,
        catatan_atasan: recordForm.catatan_atasan,
        status: "DISETUJUI",
      };

      if (editingRecord) {
        await api.put(`/kepegawaian/employees/${employeeId}/leave-records/${editingRecord.id}`, payload);
      } else {
        await api.post(`/kepegawaian/employees/${employeeId}/leave-records`, payload);
      }
    },
    onSuccess: () => {
      toast.success(editingRecord ? "Penetapan cuti berhasil diperbarui!" : "Surat Izin Cuti berhasil dicatat!");
      setIsDialogOpen(false);
      setEditingRecord(null);
      queryClient.invalidateQueries({ queryKey: ["employeeLeave", employeeId, selectedYear] });
    },
    onError: (err: unknown) => {
      let msg = "Gagal menyimpan penetapan cuti.";
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

  const handleOpenCreateDialog = () => {
    setEditingRecord(null);
    setRecordForm({
      nomor_pengajuan: "",
      tanggal_pengajuan: new Date().toISOString().split("T")[0],
      jenis_cuti: "Cuti Tahunan",
      alasan_cuti: "",
      jumlah_hari: 1,
      tanggal_mulai: new Date().toISOString().split("T")[0],
      tanggal_selesai: new Date().toISOString().split("T")[0],
      catatan_atasan: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (record: LeaveRecordItem) => {
    setEditingRecord(record);
    setRecordForm({
      nomor_pengajuan: record.nomor_pengajuan || "",
      tanggal_pengajuan: record.tanggal_pengajuan || new Date().toISOString().split("T")[0],
      jenis_cuti: record.jenis_cuti || "Cuti Tahunan",
      alasan_cuti: record.alasan_cuti || "",
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

  return (
    <div className="space-y-6">
      {/* Header Selector & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Buku Kendali & Hak Cuti PNS</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Tahun {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Penghitungan otomatis hak cuti tahunan dan pencatatan Surat Izin (SI/ST) sesuai{" "}
              <span className="font-semibold text-slate-700">Peraturan BKN No. 24/2017 & No. 7/2021</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBalanceDialogOpen(true)}
            className="h-8.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-1.5 shadow-2xs"
            title="Penyesuaian saldo awal khusus untuk pegawai pindahan atau mutasi"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sesuaikan Saldo Awal</span>
          </Button>

          <label className="text-xs font-semibold text-slate-600 ml-1">Tahun:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
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
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat data saldo dan riwayat cuti...
        </div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Hak Cuti Tahun Ini */}
            <div className="bg-linear-to-br from-blue-50/80 via-blue-50/40 to-indigo-50/80 border border-blue-100 rounded-2xl p-4.5 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-800">Total Hak Cuti {selectedYear}</span>
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-950 tracking-tight">{calc.totalHak}</span>
                <span className="text-xs font-bold text-blue-600">Hari Kerja</span>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-100/60 flex flex-wrap items-center gap-1.5 text-[11px] text-blue-700">
                <span className="font-semibold">Pokok: {calc.hakN}</span>
                <span>•</span>
                <span>Sisa {selectedYear - 1}: +{calc.hakN1}</span>
                <span>•</span>
                <span>Sisa {selectedYear - 2}: +{calc.hakN2}</span>
              </div>
            </div>

            {/* Card 2: Sisa Cuti Tersedia Saat Ini */}
            <div className="bg-linear-to-br from-emerald-50/80 via-emerald-50/40 to-teal-50/80 border border-emerald-100 rounded-2xl p-4.5 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Sisa Cuti Tersedia</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-950 tracking-tight">{calc.sisaTersedia}</span>
                <span className="text-xs font-bold text-emerald-600">Hari Kerja</span>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100/60 text-[11px] text-emerald-700 flex items-center justify-between">
                <span>Terpakai tahun ini:</span>
                <span className="font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md text-emerald-900">
                  {calc.usedN0} Hari
                </span>
              </div>
            </div>

            {/* Card 3: Status Akumulasi Klausa 24 Hari */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Klausa Akumulasi Cuti</span>
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                </div>
                {calc.isEligible24 ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Akumulasi 24 Hari Aktif</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Maksimal Standar 18 Hari</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
                {calc.isEligible24
                  ? "2 Tahun berturut-turut tanpa pemakaian cuti. Kuota akumulasi maksimal 24 hari diizinkan."
                  : "Sisa cuti tahun lalu (N-1) diakui maksimal 6 hari kerja sesuai ketentuan PerBKN 24/2017."}
              </p>
            </div>
          </div>

          {/* Section: Riwayat Surat Izin / Penetapan Cuti Resmi (Buku Kendali BKSDA) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Riwayat Surat Izin & Penetapan Cuti Resmi</h4>
                  <p className="text-xs text-slate-500">
                    Pencatatan nomor Surat Izin (SI/ST) dari kartu kendali cuti resmi BKSDA Kalimantan Timur.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                {/* Filter toggle: Tahun Ini vs Semua Tahun */}
                <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterScope("year")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterScope === "year"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tahun {selectedYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope("all")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterScope === "all"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Semua ({leaveRequests.length})
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenCreateDialog}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl gap-1.5 h-8.5 px-3.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat Surat Izin
                </Button>
              </div>
            </div>

            {/* Table: Fit 100% without horizontal scrolling */}
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Belum ada riwayat surat izin cuti tercatat</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
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
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">No</th>
                      <th className="py-2.5 px-3 w-[28%]">Surat Persetujuan (SI / ST)</th>
                      <th className="py-2.5 px-3 w-[16%]">Jenis Cuti</th>
                      <th className="py-2.5 px-3 w-[22%]">Pelaksanaan & Durasi</th>
                      <th className="py-2.5 px-3 w-[18%]">Keterangan / Sisa</th>
                      <th className="py-2.5 px-3 w-[16%] text-right">Status & Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req, idx) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400 align-top">{idx + 1}</td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-bold text-slate-900 font-mono text-[11px] break-all leading-tight">
                            {req.nomor_pengajuan || "-"}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Tgl Surat: {formatDate(req.tanggal_pengajuan)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold leading-snug ${
                              req.jenis_cuti.toLowerCase().includes("tahunan")
                                ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                : req.jenis_cuti.toLowerCase().includes("sakit")
                                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                : "bg-purple-50 text-purple-700 border border-purple-200/60"
                            }`}
                          >
                            {req.jenis_cuti}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-slate-800 text-[11px]">
                            {formatDate(req.tanggal_mulai)} s.d. {formatDate(req.tanggal_selesai)}
                          </div>
                          <div className="mt-1">
                            <span className="inline-block font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                              {req.jumlah_hari} Hari Kerja
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          {req.catatan_atasan ? (
                            <span className="inline-block text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md leading-snug">
                              {req.catatan_atasan}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {req.status}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDialog(req)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit penetapan cuti"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(req.id)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus penetapan cuti"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Penyesuaian Saldo Awal (Tahun {selectedYear})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
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
                <label className="text-xs font-bold text-slate-700">Hak Pokok Tahun {selectedYear}</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={balanceForm.hak_cuti_n}
                  onChange={(e) => setBalanceForm({ ...balanceForm, hak_cuti_n: Number(e.target.value) })}
                  className="mt-1 text-xs h-9"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Standar PNS: 12 hari</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Sisa Cuti Tahun {selectedYear - 1} (N-1)</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={balanceForm.sisa_cuti_n1}
                  onChange={(e) => setBalanceForm({ ...balanceForm, sisa_cuti_n1: Number(e.target.value) })}
                  className="mt-1 text-xs h-9"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Diakui maks. 6 hari</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Catatan Penangguhan / Keterangan Khusus</label>
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
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingRecord ? "Edit Surat Izin Penetapan Cuti" : "Catat Surat Izin Penetapan Cuti"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pencatatan data surat keputusan izin cuti resmi (SI / ST) untuk buku kendali cuti pegawai.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveRecordMutation.mutate();
            }}
            className="space-y-3.5 py-2"
          >
            <div>
              <label className="text-xs font-bold text-slate-700">Nomor Surat Persetujuan (SI / ST) *</label>
              <Input
                required
                value={recordForm.nomor_pengajuan}
                onChange={(e) => setRecordForm({ ...recordForm, nomor_pengajuan: e.target.value })}
                placeholder="Contoh: SI.80/K.18/TU/PEG.12.1/B/04/2025"
                className="mt-1 text-xs font-mono h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tanggal Surat *</label>
                <Input
                  type="date"
                  required
                  value={recordForm.tanggal_pengajuan}
                  onChange={(e) => setRecordForm({ ...recordForm, tanggal_pengajuan: e.target.value })}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Jenis Cuti / Izin *</label>
                <select
                  value={recordForm.jenis_cuti}
                  onChange={(e) => setRecordForm({ ...recordForm, jenis_cuti: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {JENIS_CUTI_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Lama (Hari Kerja) *</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={recordForm.jumlah_hari}
                  onChange={(e) => setRecordForm({ ...recordForm, jumlah_hari: Number(e.target.value) })}
                  className="mt-1 text-xs font-bold h-9"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Tanggal Mulai *</label>
                <Input
                  type="date"
                  required
                  value={recordForm.tanggal_mulai}
                  onChange={(e) => setRecordForm({ ...recordForm, tanggal_mulai: e.target.value })}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Tanggal Selesai *</label>
                <Input
                  type="date"
                  required
                  value={recordForm.tanggal_selesai}
                  onChange={(e) => setRecordForm({ ...recordForm, tanggal_selesai: e.target.value })}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Keterangan / Sisa Cuti (Opsional)</label>
              <Input
                value={recordForm.catatan_atasan}
                onChange={(e) => setRecordForm({ ...recordForm, catatan_atasan: e.target.value })}
                placeholder="Contoh: Sisa Cuti= 7 Hari"
                className="mt-1 text-xs h-9"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveRecordMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saveRecordMutation.isPending ? "Menyimpan..." : "Simpan Penetapan Cuti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Delete Record */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Hapus Penetapan Cuti?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
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
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteRecordMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
