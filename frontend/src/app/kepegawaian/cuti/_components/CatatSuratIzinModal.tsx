"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileCheck,
  FileCheck2,
  FileText,
  Info,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeSelect, type Employee } from "@/components/ui/employee-select";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DynamicLeaveType {
  id: number;
  nama: string;
  kode: string | null;
  hitung_hari: "hari_kerja" | "hari_kalender";
  potong_kuota_tahunan: boolean;
  maks_hari: number | null;
}

const DEFAULT_JENIS_CUTI = [
  "Cuti Tahunan",
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
    const diffTime = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffTime + 1);
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

interface CatatSuratIzinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CatatSuratIzinModal({
  isOpen,
  onClose,
  onSuccess,
}: CatatSuratIzinModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<DynamicLeaveType[]>([]);

  // Form State
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    nomor_pengajuan: "",
    tanggal_pengajuan: today,
    jenis_cuti: "Cuti Tahunan",
    alasan_cuti: "",
    jumlah_hari: 1,
    tanggal_mulai: today,
    tanggal_selesai: today,
    alamat_menjalankan_cuti: "",
    telepon: "",
    catatan_atasan: "",
  });

  const [fileScanFormulir, setFileScanFormulir] = useState<File | null>(null);
  const [fileScanSuratIzin, setFileScanSuratIzin] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quota Data State
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<{
    hak_cuti_n?: number;
    sisa_cuti_n1?: number;
    cuti_terpakai_n1?: number;
    sisa_cuti_n2?: number;
    cuti_terpakai_n2?: number;
    cuti_terpakai_n0?: number;
    hak_n1_diakui?: number;
    hak_n2_diakui?: number;
    total_hak_cuti?: number;
    is_eligible_24_days?: boolean;
    sisa_cuti_tersedia?: number;
  } | null>(null);

  // Fetch Leave Types once on mount/open
  useEffect(() => {
    if (!isOpen) return;
    api
      .get("/kepegawaian/leave-types")
      .then((res) => {
        setLeaveTypes(res.data?.data || []);
      })
      .catch(() => setLeaveTypes([]));
  }, [isOpen]);

  // Determine year for quota lookup from tanggal_mulai
  const leaveYear = useMemo(() => {
    if (form.tanggal_mulai) {
      const y = parseInt(form.tanggal_mulai.slice(0, 4), 10);
      if (y >= 2000 && y <= 2100) return y;
    }
    return new Date().getFullYear();
  }, [form.tanggal_mulai]);

  // Load employee leave balance whenever selectedEmployee or leaveYear changes
  useEffect(() => {
    if (!isOpen || !selectedEmployee?.id) {
      setLeaveBalance(null);
      return;
    }

    let active = true;
    setLeaveLoading(true);

    api
      .get(`/kepegawaian/employees/${selectedEmployee.id}/leaves`, {
        params: { year: leaveYear },
      })
      .then((res) => {
        if (!active) return;
        setLeaveBalance(res.data?.data || null);
      })
      .catch((err) => {
        if (!active) return;
        setLeaveBalance(null);
        toast.error("Gagal memuat saldo cuti pegawai.");
      })
      .finally(() => {
        if (active) setLeaveLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedEmployee?.id, leaveYear]);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployee(null);
      setLeaveBalance(null);
      setFileScanFormulir(null);
      setFileScanSuratIzin(null);
      setForm({
        nomor_pengajuan: "",
        tanggal_pengajuan: today,
        jenis_cuti: "Cuti Tahunan",
        alasan_cuti: "",
        jumlah_hari: 1,
        tanggal_mulai: today,
        tanggal_selesai: today,
        alamat_menjalankan_cuti: "",
        telepon: "",
        catatan_atasan: "",
      });
    }
  }, [isOpen, today]);

  // Auto calculate duration in days
  const handleDateChange = (start: string, end: string, jenis: string) => {
    const days = calculateLeaveDays(start, end, jenis, leaveTypes);
    setForm((prev) => ({
      ...prev,
      tanggal_mulai: start,
      tanggal_selesai: end,
      jenis_cuti: jenis,
      jumlah_hari: days > 0 ? days : 1,
    }));
  };

  // Quota breakdown calculation matching EmployeeLeaveTab (PerBKN 24/2017 & 7/2021)
  const calc = useMemo(() => {
    if (!leaveBalance) return null;
    const hakN = Math.max(0, leaveBalance.hak_cuti_n ?? 12);
    const sisaN1Raw = Math.max(0, leaveBalance.sisa_cuti_n1 ?? 0);
    const hakN1 = typeof leaveBalance.hak_n1_diakui === "number"
      ? leaveBalance.hak_n1_diakui
      : Math.min(6, sisaN1Raw);

    const usedN1 = Math.max(0, leaveBalance.cuti_terpakai_n1 ?? 0);
    const usedN2 = Math.max(0, leaveBalance.cuti_terpakai_n2 ?? 0);
    const sisaN2Raw = Math.max(0, leaveBalance.sisa_cuti_n2 ?? 0);

    const isEligible24 = typeof leaveBalance.is_eligible_24_days === "boolean"
      ? leaveBalance.is_eligible_24_days
      : (usedN1 === 0 && usedN2 === 0 && sisaN1Raw >= 12 && sisaN2Raw >= 12);
    const hakN2 = typeof leaveBalance.hak_n2_diakui === "number"
      ? leaveBalance.hak_n2_diakui
      : (isEligible24 ? 6 : 0);

    const totalHak = typeof leaveBalance.total_hak_cuti === "number"
      ? leaveBalance.total_hak_cuti
      : (hakN + hakN1 + hakN2);

    const usedN0 = Math.max(0, leaveBalance.cuti_terpakai_n0 ?? 0);
    const sisaTersedia = typeof leaveBalance.sisa_cuti_tersedia === "number"
      ? leaveBalance.sisa_cuti_tersedia
      : Math.max(0, totalHak - usedN0);

    return {
      hakN,
      hakN1,
      hakN2,
      isEligible24,
      totalHak,
      usedN0,
      sisaTersedia,
    };
  }, [leaveBalance]);

  const matchedLeaveType = leaveTypes.find(
    (lt) =>
      lt.nama.toLowerCase() === form.jenis_cuti.toLowerCase() ||
      (lt.kode && lt.kode.toLowerCase() === form.jenis_cuti.toLowerCase())
  );
  const isTahunan = matchedLeaveType
    ? matchedLeaveType.potong_kuota_tahunan
    : form.jenis_cuti.toLowerCase().includes("tahunan");

  const projectedRemaining = calc ? calc.sisaTersedia - form.jumlah_hari : 0;

  const handleFileValidate = (file: File | null): boolean => {
    if (!file) return true;
    if (!file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      toast.error("Format berkas harus berupa PDF, JPG, JPEG, atau PNG.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran berkas tidak boleh melebihi 10 MB.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Pilih pegawai terlebih dahulu.");
      return;
    }

    if (!form.nomor_pengajuan.trim()) {
      toast.error("Nomor surat persetujuan (SI / ST) wajib diisi.");
      return;
    }

    if (!form.tanggal_mulai || !form.tanggal_selesai) {
      toast.error("Rentang tanggal cuti wajib diisi.");
      return;
    }

    const startYear = parseInt(form.tanggal_mulai.slice(0, 4), 10);
    const endYear = parseInt(form.tanggal_selesai.slice(0, 4), 10);
    if (startYear !== endYear) {
      toast.error("Pengajuan cuti tidak boleh lintas tahun kalender (PerBKN 24/2017).");
      return;
    }

    const formData = new FormData();
    formData.append("nomor_pengajuan", form.nomor_pengajuan.trim());
    formData.append("tanggal_pengajuan", form.tanggal_pengajuan);
    formData.append("jenis_cuti", form.jenis_cuti);
    formData.append("alasan_cuti", form.alasan_cuti.trim() || form.jenis_cuti);
    formData.append("jumlah_hari", String(form.jumlah_hari));
    formData.append("tanggal_mulai", form.tanggal_mulai);
    formData.append("tanggal_selesai", form.tanggal_selesai);
    formData.append(
      "alamat_menjalankan_cuti",
      form.alamat_menjalankan_cuti.trim() || selectedEmployee.department || "Balikpapan"
    );
    formData.append("telepon", form.telepon.trim() || "-");
    formData.append("catatan_atasan", form.catatan_atasan.trim() || form.alasan_cuti.trim());
    formData.append("status", "DISETUJUI");

    if (fileScanFormulir) {
      formData.append("file_scan_formulir", fileScanFormulir);
    }
    if (fileScanSuratIzin) {
      formData.append("file_scan_surat_izin", fileScanSuratIzin);
    }

    setIsSubmitting(true);
    try {
      await api.post(`/kepegawaian/employees/${selectedEmployee.id}/leave-records`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Surat izin penetapan cuti berhasil dicatat!");
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gagal mencatat surat izin penetapan cuti.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] p-6 max-h-[92vh] overflow-y-auto">
        {/* Header Modal */}
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Catat Surat Izin Penetapan Cuti
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pencatatan data surat keputusan izin cuti resmi (SI / ST) langsung ke buku kendali pegawai.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 pb-1">
          {/* Step 1: Pemilihan Pegawai */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Pilih Pegawai <span className="text-rose-500">*</span>
            </label>
            <EmployeeSelect
              value={selectedEmployee?.id || null}
              onChange={(val, emp) => {
                setSelectedEmployee(emp || null);
              }}
              placeholder="Cari nama atau NIP pegawai..."
              disabled={isSubmitting}
              className="text-xs h-9 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Loading Sisa Kuota Cuti */}
          {selectedEmployee && leaveLoading && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memuat sisa kuota cuti pegawai ({selectedEmployee.name})...</span>
            </div>
          )}

          {/* Interactive Employee Leave Balance Card */}
          {selectedEmployee && !leaveLoading && calc && (
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/60 bg-linear-to-r from-blue-50/90 via-indigo-50/40 to-slate-50/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/80 p-3 mt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Sisa Kuota Cuti Pegawai (Tahun {leaveYear}):</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
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
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Kuota Tersedia</span>
                  <span className="text-lg font-extrabold text-blue-700 dark:text-blue-400">
                    {calc.sisaTersedia} <span className="text-xs font-bold">Hari</span>
                  </span>
                </div>
              </div>

              {/* Live simulation of remaining balance if Cuti Tahunan */}
              {isTahunan && form.jumlah_hari > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-100/70 dark:border-slate-700 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400">
                    Simulasi sisa setelah cuti ini ({form.jumlah_hari} hari):
                  </span>
                  {projectedRemaining < 0 ? (
                    <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Melebihi kuota (kurang {Math.abs(projectedRemaining)} hari)
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sisa {projectedRemaining} Hari
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Fields (Hanya aktif/tampil jika pegawai sudah dipilih) */}
          {selectedEmployee && (
            <div className="space-y-3.5">
              {/* Row 1: Nomor Surat & Tanggal Terbit */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-7">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Nomor Surat Persetujuan (SI / ST) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={form.nomor_pengajuan}
                    onChange={(e) => setForm({ ...form, nomor_pengajuan: e.target.value })}
                    placeholder="Contoh: SI.123/K.18/TU/KSA/05/2026"
                    className="mt-1 text-xs font-mono h-9 bg-slate-50/50 focus:bg-white transition-colors border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Tanggal Terbit Surat <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={form.tanggal_pengajuan}
                    onChange={(e) => setForm({ ...form, tanggal_pengajuan: e.target.value })}
                    className="mt-1 text-xs h-9 bg-slate-50/50 focus:bg-white transition-colors border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Row 2: Jenis Cuti & Alasan Cuti (1 Baris Side-by-Side) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-6">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Jenis Cuti <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.jenis_cuti}
                    onChange={(e) => handleDateChange(form.tanggal_mulai, form.tanggal_selesai, e.target.value)}
                    className="w-full mt-1 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                  >
                    {leaveTypes.length > 0
                      ? leaveTypes.map((t) => (
                          <option key={t.id} value={t.nama}>
                            {t.nama}
                          </option>
                        ))
                      : DEFAULT_JENIS_CUTI.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Alasan / Keperluan Cuti
                    </label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-medium">
                      Opsional
                    </span>
                  </div>
                  <Input
                    value={form.alasan_cuti}
                    onChange={(e) => setForm({ ...form, alasan_cuti: e.target.value })}
                    placeholder="Opsional (otomatis sesuai jenis cuti)"
                    className="mt-1 text-xs h-9 bg-slate-50/50 focus:bg-white transition-colors border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Row 3: Tanggal Mulai & Tanggal Selesai (Di atas Lama Cuti) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Tanggal Mulai Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={form.tanggal_mulai}
                    onChange={(e) => handleDateChange(e.target.value, form.tanggal_selesai, form.jenis_cuti)}
                    className="mt-1 text-xs h-9 bg-slate-50/50 focus:bg-white transition-colors border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Tanggal Selesai Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={form.tanggal_selesai}
                    onChange={(e) => handleDateChange(form.tanggal_mulai, e.target.value, form.jenis_cuti)}
                    className="mt-1 text-xs h-9 bg-slate-50/50 focus:bg-white transition-colors border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Row 4: Lama Cuti (Di bawah Tanggal Mulai & Selesai) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                <div className="sm:col-span-5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Lama Cuti <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {isTahunan ? "Hari Kerja" : "Hari Kalender"}
                    </span>
                  </label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      required
                      value={form.jumlah_hari}
                      onChange={(e) => setForm({ ...form, jumlah_hari: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="text-xs font-bold h-9 pr-14 bg-slate-50/50 focus:bg-white transition-colors border-slate-200 dark:border-slate-700"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[11px] font-medium text-slate-400">
                      Hari
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-7 flex flex-col justify-end">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      {isTahunan
                        ? "Otomatis dihitung hari kerja (Senin - Jumat)."
                        : "Otomatis dihitung hari kalender penuh."}
                      {" Dapat diedit manual jika terdapat libur nasional."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 5: Berkas Scan Surat Cuti (1 Baris - 2 Slot Side-by-Side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Slot 1: Scan Surat Pengantar dan Formulir Cuti */}
                <div className="flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">1. Scan Surat Pengantar & Formulir</span>
                    </label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      Opsional
                    </span>
                  </div>

                  <div className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                    <input
                      type="file"
                      id="file_scan_formulir_catat"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (handleFileValidate(f)) {
                          setFileScanFormulir(f);
                        } else {
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="file_scan_formulir_catat" className="cursor-pointer block">
                      {fileScanFormulir ? (
                        <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[130px] sm:max-w-[160px]">{fileScanFormulir.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                            ({(fileScanFormulir.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium block truncate">
                          Pilih Scan Pengantar & Formulir
                        </span>
                      )}
                    </label>
                  </div>
                  {fileScanFormulir && (
                    <button
                      type="button"
                      onClick={() => setFileScanFormulir(null)}
                      className="text-[10px] text-rose-500 hover:underline mt-1 text-left"
                    >
                      Batalkan pilihan berkas
                    </button>
                  )}
                </div>

                {/* Slot 2: Scan Surat Izin Resmi Penetapan Cuti */}
                <div className="flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">2. Scan Surat Izin Resmi (TTE)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      Opsional
                    </span>
                  </div>

                  <div className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                    <input
                      type="file"
                      id="file_scan_surat_izin_catat"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (handleFileValidate(f)) {
                          setFileScanSuratIzin(f);
                        } else {
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="file_scan_surat_izin_catat" className="cursor-pointer block">
                      {fileScanSuratIzin ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[130px] sm:max-w-[160px]">{fileScanSuratIzin.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                            ({(fileScanSuratIzin.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium block truncate">
                          Pilih Surat Izin Resmi / TTE
                        </span>
                      )}
                    </label>
                  </div>
                  {fileScanSuratIzin && (
                    <button
                      type="button"
                      onClick={() => setFileScanSuratIzin(null)}
                      className="text-[10px] text-rose-500 hover:underline mt-1 text-left"
                    >
                      Batalkan pilihan surat izin
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <DialogFooter className="gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedEmployee}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Surat Izin"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
