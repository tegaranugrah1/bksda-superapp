import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

  const [leaveBalance, setLeaveBalance] = useState<{
    sisa_cuti_tersedia: number;
    total_hak_cuti: number;
    pending_cuti_tahunan?: number;
    sisa_cuti_dapat_diajukan?: number;
  } | null>(null);

  const [form, setForm] = useState({
    jenis_cuti: "Cuti Tahunan",
    alasan_cuti: "",
    tanggal_mulai: todayStr,
    tanggal_selesai: todayStr,
    alamat_menjalankan_cuti: "",
    telepon: "",
  });

  useEffect(() => {
    if (open) {
      api.get(`/me/leave-balance?year=${currentYear}`)
        .then((res) => {
          if (res?.data?.data) setLeaveBalance(res.data.data);
        })
        .catch(() => {});
    }
  }, [open, currentYear]);

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

  const calculatedDays = React.useMemo(() => {
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 1;
    const start = new Date(form.tanggal_mulai);
    const end = new Date(form.tanggal_selesai);
    const diffTime = end.getTime() - start.getTime();
    if (Number.isNaN(diffTime) || diffTime < 0) return 0;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [form.tanggal_mulai, form.tanggal_selesai]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Formulir Permintaan Cuti Mandiri
            </h3>
            <p className="text-xs text-slate-500">
              Isi data pengajuan cuti secara lengkap untuk diterbitkan formulirnya.
            </p>
          </div>
        </div>

        {/* Banner Informatif Sisa Cuti */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200 block leading-tight">
                Sisa Hak Cuti Tahunan ({currentYear})
              </span>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                Sesuai saldo akumulasi PerBKN 24/2017
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
              {leaveBalance ? (leaveBalance.sisa_cuti_dapat_diajukan ?? leaveBalance.sisa_cuti_tersedia) : 12} Hari
            </span>
            {leaveBalance && (leaveBalance.pending_cuti_tahunan ?? 0) > 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">
                ({leaveBalance.pending_cuti_tahunan} hari dalam proses pengajuan)
              </span>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (submitMutation.isPending) return;
            if (calculatedDays <= 0) {
              toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
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
            if (form.jenis_cuti === "Cuti Tahunan" && leaveBalance && calculatedDays > availableQuota) {
              toast.error(`Jumlah hari cuti (${calculatedDays} hari) melebihi sisa hak cuti tahunan yang dapat diajukan (${availableQuota} hari).`);
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
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Jenis Cuti Yang Diambil *
            </label>
            <select
              value={form.jenis_cuti}
              onChange={(e) => setForm({ ...form, jenis_cuti: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              {JENIS_CUTI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Mulai & Tanggal Selesai */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mulai Tanggal *
                </label>
                <Input
                  type="date"
                  value={form.tanggal_mulai}
                  onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
                  className="text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Sampai Tanggal *
                </label>
                <Input
                  type="date"
                  value={form.tanggal_selesai}
                  onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
                  className="text-xs font-semibold"
                />
              </div>
            </div>

            {/* Indikator Durasi Cuti */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Lamanya Cuti:</span>
              <span className="font-extrabold text-blue-700 dark:text-blue-300">
                {calculatedDays > 0 ? `${calculatedDays} Hari Kerja` : "Tanggal tidak valid"}
              </span>
            </div>
          </div>

          {/* Alasan Cuti */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Alasan Cuti *
            </label>
            <Textarea
              rows={2}
              value={form.alasan_cuti}
              onChange={(e) => setForm({ ...form, alasan_cuti: e.target.value })}
              placeholder="Contoh: Perpanjang SIM di Balikpapan / Acara keluarga..."
              className="text-xs"
              required
            />
          </div>

          {/* Alamat Selama Menjalankan Cuti */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Alamat Selama Menjalankan Cuti *
            </label>
            <Input
              type="text"
              value={form.alamat_menjalankan_cuti}
              onChange={(e) => setForm({ ...form, alamat_menjalankan_cuti: e.target.value })}
              placeholder="Contoh: Jl. Sudirman No. 12, Balikpapan"
              className="text-xs"
              required
            />
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Nomor Telepon Kontak Cuti
            </label>
            <Input
              type="text"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="Contoh: 081351458775"
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitMutation.isPending || calculatedDays <= 0 || calculatedDays > 365 || (form.jenis_cuti === "Cuti Tahunan" && leaveBalance !== null && calculatedDays > (leaveBalance.sisa_cuti_dapat_diajukan ?? leaveBalance.sisa_cuti_tersedia))}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitMutation.isPending ? "Mengirim..." : "Kirim Pengajuan Cuti"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
