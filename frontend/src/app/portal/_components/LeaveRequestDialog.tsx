"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  calculateLeaveDays,
  normalizeHolidayDates,
} from "@/app/kepegawaian/_lib/employee-helpers";
import { authStore, parseAuthSnapshot } from "@/lib/auth-store";
import { toast } from "sonner";
import { Calendar, Send, X, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface LeaveRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const JENIS_CUTI_OPTIONS = [
  "Cuti Tahunan",
  "Cuti Besar",
  "Cuti Sakit",
  "Cuti Melahirkan",
  "Cuti Karena Alasan Penting",
  "Cuti di Luar Tanggungan Negara",
];

export function LeaveRequestDialog({ open, onClose, onSuccess }: LeaveRequestDialogProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();

  const currentUser = parseAuthSnapshot(authStore.getSnapshot()).user;
  const cleanNip = (currentUser?.username || "").replace(/\s+/g, "");
  // PPPK: digit ke 13-14 pada NIP bernilai '21'
  const isPppkUser = cleanNip.length >= 14 && cleanNip.substring(12, 14) === "21";

  const [leaveBalance, setLeaveBalance] = useState<{
    sisa_cuti_tersedia: number;
    total_hak_cuti: number;
    pending_cuti_tahunan?: number;
    sisa_cuti_dapat_diajukan?: number;
  } | null>(null);

  const [leaveTypes, setLeaveTypes] = useState<Array<{
    id: number;
    nama: string;
    kode: string | null;
    hitung_hari: "hari_kerja" | "hari_kalender";
    potong_kuota_tahunan: boolean;
    maks_hari: number | null;
  }>>([]);

  const [holidayDates, setHolidayDates] = useState<Set<string>>(() => new Set());
  const loadedHolidayRangeRef = useRef<{ min: number; max: number } | null>(null);

  const [form, setForm] = useState({
    jenis_cuti: "Cuti Tahunan",
    alasan_cuti: "",
    tanggal_mulai: todayStr,
    tanggal_selesai: todayStr,
    alamat_menjalankan_cuti: "",
    telepon: "",
  });

  const leaveYear = useMemo(() => {
    if (form.tanggal_mulai) {
      const y = parseInt(form.tanggal_mulai.slice(0, 4), 10);
      if (y >= 2000 && y <= 2100) return y;
    }
    return currentYear;
  }, [form.tanggal_mulai, currentYear]);

  useEffect(() => {
    if (open) {
      api.get(`/me/leave-balance?year=${currentYear}`)
        .then((res) => {
          if (res?.data?.data) setLeaveBalance(res.data.data);
        })
        .catch(() => {});
    } else {
      loadedHolidayRangeRef.current = null;
    }
  }, [open, currentYear]);

  useEffect(() => {
    if (!open) return;
    const range = loadedHolidayRangeRef.current;
    if (range && leaveYear >= range.min && leaveYear <= range.max) {
      return;
    }
    let active = true;
    api.get("/me/leave-types", { params: leaveYear !== currentYear ? { year: leaveYear } : undefined })
      .then((res) => {
        if (!active) return;
        if (res?.data?.data && Array.isArray(res.data.data)) {
          setLeaveTypes(res.data.data);
        }
        setHolidayDates(normalizeHolidayDates(res?.data?.holiday_dates));
        loadedHolidayRangeRef.current = {
          min: Math.max(2000, leaveYear - 1),
          max: Math.min(2100, leaveYear + 1),
        };
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, leaveYear, currentYear]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post("/me/leave-requests", {
        ...form,
        alasan_cuti: form.alasan_cuti.trim(),
        alamat_menjalankan_cuti: form.alamat_menjalankan_cuti.trim(),
        telepon: form.telepon.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Pengajuan Cuti berhasil dikirim!");
      setForm({
        jenis_cuti: "Cuti Tahunan",
        alasan_cuti: "",
        tanggal_mulai: todayStr,
        tanggal_selesai: todayStr,
        alamat_menjalankan_cuti: "",
        telepon: "",
      });
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal mengajukan cuti.");
    },
  });

  const selectedLeaveType = leaveTypes.find(
    (lt) => lt.nama.toLowerCase() === form.jenis_cuti.toLowerCase()
  );
  const isHariKerja = selectedLeaveType
    ? selectedLeaveType.hitung_hari === "hari_kerja"
    : form.jenis_cuti.toLowerCase().includes("tahunan");

  // Opsi jenis cuti: untuk PPPK opsi 'Cuti Karena Alasan Penting' otomatis disembunyikan
  const availableLeaveOptions = useMemo(() => {
    const baseList = leaveTypes.length > 0 ? leaveTypes.map((lt) => lt.nama) : JENIS_CUTI_OPTIONS;
    if (isPppkUser) {
      return baseList.filter((nama) => !nama.toLowerCase().includes("alasan penting"));
    }
    return baseList;
  }, [leaveTypes, isPppkUser]);

  const calculatedDays = useMemo(
    () =>
      calculateLeaveDays(
        form.tanggal_mulai,
        form.tanggal_selesai,
        form.jenis_cuti,
        leaveTypes,
        holidayDates
      ),
    [form.tanggal_mulai, form.tanggal_selesai, form.jenis_cuti, leaveTypes, holidayDates]
  );
  const hasInvalidDateRange =
    !form.tanggal_mulai || !form.tanggal_selesai || form.tanggal_mulai > form.tanggal_selesai;

  if (!open) return null;

  return (
    <div data-module="portal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] p-2 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--ds-fg)]">
              Formulir Permintaan Cuti Mandiri
            </h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Isi data pengajuan cuti secara lengkap untuk diterbitkan formulirnya.
            </p>
          </div>
        </div>

        {/* Banner Informatif Sisa Cuti */}
        <div className="bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-lg p-4 mb-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--ds-accent-fg)] shrink-0" />
            <div>
              <span className="text-xs font-bold text-[var(--ds-fg)] block leading-tight tabular-nums">
                Sisa Hak Cuti Tahunan ({currentYear})
              </span>
              <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
                Sesuai saldo akumulasi PerBKN 24/2017
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-[var(--ds-accent-fg)] tabular-nums">
              {leaveBalance ? (leaveBalance.sisa_cuti_dapat_diajukan ?? leaveBalance.sisa_cuti_tersedia) : 12} Hari
            </span>
            {leaveBalance && (leaveBalance.pending_cuti_tahunan ?? 0) > 0 && (
              <span className="text-xs text-[var(--ds-status-warning-fg)] block font-semibold tabular-nums">
                ({leaveBalance.pending_cuti_tahunan} hari dalam proses pengajuan)
              </span>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (submitMutation.isPending) return;
            if (isPppkUser && form.jenis_cuti.toLowerCase().includes("alasan penting")) {
              toast.error("Pegawai PPPK tidak berhak mengajukan Cuti Karena Alasan Penting.");
              return;
            }
            if (hasInvalidDateRange) {
              toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
              return;
            }
            if (calculatedDays <= 0) {
              toast.error(
                "Rentang tanggal yang dipilih jatuh pada hari libur akhir pekan atau hari libur nasional/cuti bersama (0 hari kerja)."
              );
              return;
            }
            if (calculatedDays > 365) {
              toast.error("Durasi pengajuan cuti tidak boleh melebihi 365 hari.");
              return;
            }
            if (new Date(form.tanggal_mulai).getFullYear() !== new Date(form.tanggal_selesai).getFullYear()) {
              toast.error("Pengajuan cuti tidak boleh lintas tahun kalender. Silakan ajukan terpisah per tahun.");
              return;
            }
            const availableQuota = leaveBalance
              ? (leaveBalance.sisa_cuti_dapat_diajukan ?? leaveBalance.sisa_cuti_tersedia)
              : 12;
            const cutsQuota = selectedLeaveType
              ? selectedLeaveType.potong_kuota_tahunan
              : form.jenis_cuti.toLowerCase().includes("tahunan");

            if (cutsQuota && leaveBalance && calculatedDays > availableQuota) {
              toast.error(
                `Jumlah hari cuti (${calculatedDays} hari) melebihi sisa hak cuti tahunan yang dapat diajukan (${availableQuota} hari).`
              );
              return;
            }
            if (selectedLeaveType?.maks_hari && calculatedDays > selectedLeaveType.maks_hari) {
              toast.error(
                `Jumlah hari cuti (${calculatedDays} hari) melebihi batas maksimal untuk ${selectedLeaveType.nama} (${selectedLeaveType.maks_hari} hari).`
              );
              return;
            }
            if (!form.alasan_cuti.trim()) {
              toast.error("Alasan cuti wajib diisi.");
              return;
            }
            if (!form.alamat_menjalankan_cuti.trim()) {
              toast.error("Alamat menjalankan cuti wajib diisi.");
              return;
            }
            const cleanPhone = form.telepon.trim();
            if (cleanPhone && !/^[0-9+\-\s()]+$/.test(cleanPhone)) {
              toast.error("Nomor telepon hanya boleh berisi angka, tanda plus, tanda hubung, atau spasi.");
              return;
            }
            submitMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Jenis Cuti */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--ds-fg)]">
                Jenis Cuti Yang Diambil *
              </label>
              {selectedLeaveType?.maks_hari && (
                <span className="text-xs text-[var(--ds-status-info-fg)] font-medium tabular-nums">
                  Maksimal {selectedLeaveType.maks_hari} hari
                </span>
              )}
            </div>
            <select
              value={form.jenis_cuti}
              onChange={(e) => setForm({ ...form, jenis_cuti: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold text-[var(--ds-fg)]"
            >
              {availableLeaveOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Mulai & Tanggal Selesai */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] block mb-1">
                  Mulai Tanggal *
                </label>
                <Input
                  type="date"
                  value={form.tanggal_mulai}
                  onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
                  className="text-xs font-semibold rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] block mb-1">
                  Sampai Tanggal *
                </label>
                <Input
                  type="date"
                  value={form.tanggal_selesai}
                  onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
                  className="text-xs font-semibold rounded-lg tabular-nums"
                />
              </div>
            </div>

            {/* Indikator Durasi Cuti */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ds-status-info-bg)] border border-[var(--ds-status-info-border)] text-xs">
              <span className="text-[var(--ds-fg-muted)] font-medium">
                Lamanya Cuti ({isHariKerja ? "Hari Kerja" : "Hari Kalender"}):
              </span>
              <span className="font-bold text-[var(--ds-status-info-fg)] tabular-nums">
                {hasInvalidDateRange
                  ? "Tanggal tidak valid"
                  : `${calculatedDays} ${isHariKerja ? "Hari Kerja" : "Hari"}${isHariKerja && calculatedDays === 0 ? " (hari libur)" : ""}`}
              </span>
            </div>
          </div>

          {/* Alasan Cuti */}
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg)] block mb-1">
              Alasan Cuti *
            </label>
            <Textarea
              rows={2}
              value={form.alasan_cuti}
              onChange={(e) => setForm({ ...form, alasan_cuti: e.target.value })}
              placeholder="Contoh: Perpanjang SIM di Balikpapan / Acara keluarga..."
              className="text-xs rounded-lg"
              required
            />
          </div>

          {/* Alamat Selama Menjalankan Cuti */}
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg)] mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--ds-fg-muted)]" />
              Alamat Selama Menjalankan Cuti *
            </label>
            <Input
              type="text"
              value={form.alamat_menjalankan_cuti}
              onChange={(e) => setForm({ ...form, alamat_menjalankan_cuti: e.target.value })}
              placeholder="Contoh: Jl. Sudirman No. 12, Balikpapan"
              className="text-xs rounded-lg"
              required
            />
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="text-xs font-semibold text-[var(--ds-fg)] mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--ds-fg-muted)]" />
              Nomor Telepon Kontak Cuti
            </label>
            <Input
              type="text"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="Contoh: 081351458775"
              className="text-xs rounded-lg tabular-nums"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/70 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-lg cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitMutation.isPending || calculatedDays <= 0 || calculatedDays > 365 || ((selectedLeaveType ? selectedLeaveType.potong_kuota_tahunan : form.jenis_cuti.toLowerCase().includes("tahunan")) && leaveBalance !== null && calculatedDays > (leaveBalance.sisa_cuti_dapat_diajukan ?? leaveBalance.sisa_cuti_tersedia))}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-bold rounded-lg gap-2 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitMutation.isPending ? "Mengirim..." : "Kirim Pengajuan Cuti"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
