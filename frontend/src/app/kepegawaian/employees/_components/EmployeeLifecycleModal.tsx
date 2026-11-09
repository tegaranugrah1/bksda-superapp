"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserX,
  UserCheck,
  Calendar,
  AlertTriangle,
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { Employee } from "../../_lib/employee-types";

interface EmployeeLifecycleModalProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REASONS = [
  { value: "pensiun", label: "Pensiun / Purna Tugas" },
  { value: "mengundurkan_diri", label: "Mengundurkan Diri" },
  { value: "habis_kontrak", label: "Selesai Masa Kontrak (PPPK / MMP)" },
  { value: "mutasi", label: "Mutasi / Pindah Instansi" },
  { value: "meninggal", label: "Meninggal Dunia" },
  { value: "diberhentikan", label: "Diberhentikan (Hukuman Disiplin)" },
  { value: "lainnya", label: "Lainnya" },
];

export function EmployeeLifecycleModal({
  employee,
  open,
  onOpenChange,
}: EmployeeLifecycleModalProps) {
  const queryClient = useQueryClient();

  const isScheduled = Boolean(
    employee.is_active &&
      employee.inactive_effective_date &&
      employee.inactive_effective_date > new Date().toISOString().slice(0, 10)
  );

  const [action, setAction] = useState<"deactivate" | "cancel_schedule" | "reactivate">(
    employee.is_active ? "deactivate" : "reactivate"
  );
  const [reason, setReason] = useState<string>(employee.inactive_reason || "pensiun");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    employee.inactive_effective_date || new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>(employee.inactive_notes || "");
  const [submitting, setSubmitting] = useState(false);

  // Tanggungan BMN state
  const [bmnLoading, setBmnLoading] = useState(false);
  const [bmnData, setBmnData] = useState<{
    unique_asset_count: number | null;
    assets: Array<{ id: string; nama_barang: string; kode_barang: string; nup: string; tipe_tanggungan: string }>;
    status_check: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setAction(employee.is_active ? "deactivate" : "reactivate");
      setReason(employee.inactive_reason || "pensiun");
      setEffectiveDate(
        employee.inactive_effective_date || new Date().toISOString().slice(0, 10)
      );
      setNotes(employee.inactive_notes || "");

      // Fetch BMN clearance
      setBmnLoading(true);
      api
        .get(`/kepegawaian/employees/${employee.id}/bmn-clearance`)
        .then((res) => {
          setBmnData(res.data?.data || null);
        })
        .catch(() => {
          setBmnData({
            unique_asset_count: null,
            assets: [],
            status_check: "error",
            message: "Status tanggungan belum dapat diperiksa.",
          });
        })
        .finally(() => {
          setBmnLoading(false);
        });
    }
  }, [open, employee]);

  if (!open) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isBackdate = action === "deactivate" && effectiveDate < todayStr;
  const isFuture = action === "deactivate" && effectiveDate > todayStr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (action === "deactivate" && reason === "lainnya" && !notes.trim()) {
      toast.error("Catatan alasan wajib diisi jika memilih opsi 'Lainnya'.");
      return;
    }

    if (action === "deactivate" && isBackdate && !notes.trim()) {
      toast.error("Catatan penjelasan wajib diisi untuk penetapan TMT lampau (backdate).");
      return;
    }

    if (action === "reactivate" && !notes.trim()) {
      toast.error("Catatan alasan wajib diisi saat mengaktifkan kembali pegawai.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/kepegawaian/employees/${employee.id}/lifecycle`, {
        action,
        inactive_reason: action === "deactivate" ? reason : undefined,
        inactive_effective_date: action === "deactivate" ? effectiveDate : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(res.data?.message || "Status pegawai berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", String(employee.id)] });
      queryClient.invalidateQueries({ queryKey: ["employee-access", String(employee.id)] });
      queryClient.invalidateQueries({ queryKey: ["employee-histories", String(employee.id)] });
      queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal memperbarui status pegawai.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
              {employee.is_active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola Status Kepegawaian (Lifecycle)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {employee.nama_lengkap} • {employee.nip}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tanggungan BMN Check Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-500" />
              Pemeriksaan Tanggungan BMN
            </span>
            {bmnLoading ? (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Memeriksa...
              </span>
            ) : bmnData?.unique_asset_count && bmnData.unique_asset_count > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200">
                {bmnData.unique_asset_count} Aset Aktif
              </span>
            ) : bmnData?.status_check === "ok" ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Bebas Tanggungan
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Status belum dapat diperiksa</span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {bmnLoading ? (
              <motion.div
                key="bmn-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-1 text-[11px] text-slate-400 flex items-center gap-1.5"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memeriksa status tanggungan BMN...
              </motion.div>
            ) : bmnData?.unique_asset_count && bmnData.unique_asset_count > 0 ? (
              <motion.div
                key="bmn-assets"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed"
              >
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Pegawai masih memiliki {bmnData.unique_asset_count} aset BMN yang perlu ditindaklanjuti.
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Penonaktifan akses tetap dapat diproses; penyelesaian pengembalian aset diselesaikan melalui modul BMN.
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {bmnData.assets.slice(0, 3).map((ast) => (
                    <p key={ast.id} className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      • {ast.nama_barang} ({ast.nup ? `NUP ${ast.nup}` : ast.kode_barang}) [{ast.tipe_tanggungan}]
                    </p>
                  ))}
                  {bmnData.assets.length > 3 && (
                    <p className="text-[10px] text-slate-500 italic">
                      +{bmnData.assets.length - 3} aset lainnya...
                    </p>
                  )}
                </div>
              </motion.div>
            ) : bmnData?.status_check === "ok" ? (
              <motion.div
                key="bmn-clear"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-[11px] leading-relaxed flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Pegawai bersih dari tanggungan BMN aktif. Penonaktifan aman dilanjutkan.</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Form Action */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Action Tabs */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tindakan Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {employee.is_active ? (
                <>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAction("deactivate")}
                    className={`px-3 py-2.5 rounded-xl font-bold border transition-colors cursor-pointer text-center ${
                      action === "deactivate"
                        ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                        : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    Nonaktifkan / Pensiun
                  </motion.button>
                  {isScheduled && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setAction("cancel_schedule")}
                      className={`px-3 py-2.5 rounded-xl font-bold border transition-colors cursor-pointer text-center ${
                        action === "cancel_schedule"
                          ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                          : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                      }`}
                    >
                      Batalkan Jadwal Nonaktif
                    </motion.button>
                  )}
                </>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAction("reactivate")}
                  className={`col-span-2 px-3 py-2.5 rounded-xl font-bold border transition-colors cursor-pointer text-center ${
                    action === "reactivate"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  Aktifkan Kembali Pegawai
                </motion.button>
              )}
            </div>
          </div>

          {/* Deactivation Fields */}
          {action === "deactivate" && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Alasan Nonaktif <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  TMT Nonaktif (Tanggal Efektif) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {isFuture
                    ? "📅 TMT Mendatang: Pegawai tetap aktif sampai tanggal ini, lalu otomatis dinonaktifkan oleh scheduler sistem."
                    : "⚡ TMT Hari Ini / Lampau: Pegawai dan akun portal langsung dinonaktifkan saat disimpan."}
                </p>
              </div>
            </>
          )}

          {action === "reactivate" && (
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
              <p className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Informasi Pengaktifan Kembali
              </p>
              <p className="mt-0.5">
                Mengaktifkan pegawai memulihkan status kepegawaian aktif. Demi keamanan, akun akses portal pegawai tetap non-aktif sampai Anda membuka aksesnya melalui modul IAM.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Catatan / Nomor SK
              {(reason === "lainnya" || isBackdate || action === "reactivate") && (
                <span className="text-rose-500"> * (Wajib)</span>
              )}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: SK Pensiun No. 800/123/2026 atau catatan alasan"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className={`rounded-xl text-xs font-bold text-white cursor-pointer ${
                action === "reactivate"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : action === "cancel_schedule"
                  ? "bg-slate-700 hover:bg-slate-800"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                </span>
              ) : action === "reactivate" ? (
                "Aktifkan Kembali Pegawai"
              ) : action === "cancel_schedule" ? (
                "Batalkan Jadwal"
              ) : (
                "Konfirmasi Nonaktifkan Pegawai"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
