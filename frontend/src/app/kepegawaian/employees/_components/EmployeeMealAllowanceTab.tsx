"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  UtensilsCrossed,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Eye,
  X,
  TrendingUp,
  Receipt,
  Building,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Employee } from "../../_lib";

interface MealAllowanceBatchInfo {
  id: number;
  periode_bulan: string; // YYYY-MM
  nama_batch: string;
  status: string;
  created_at: string;
}

interface MealAllowanceRecord {
  id: number;
  batch_id: number;
  employee_id: number;
  nip: string;
  nama_lengkap: string;
  jabatan: string;
  jenis_pegawai: string;
  satuan_kerja: string;
  golongan: string;
  nama_bank: string;
  nomor_rekening: string;
  tarif_harian: number | string;
  persen_pph21: number | string;
  jml_hari_kerja: number;
  jml_hadir: number;
  jml_pd: number;
  jml_cuti: number;
  jml_sakit: number;
  jml_izin: number;
  jml_alpa: number;
  uang_makan_bruto: number | string;
  potongan_pph21: number | string;
  uang_makan_netto: number | string;
  daily_matrix?: Record<string, string>;
  batch?: MealAllowanceBatchInfo;
}

interface ApiResponse {
  message: string;
  data: MealAllowanceRecord[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface Props {
  employee: Employee;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatRupiah(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPeriodLabel(periodeStr?: string): string {
  if (!periodeStr) return "-";
  const [yearStr, monthStr] = periodeStr.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  H: { label: "Hadir", color: "bg-emerald-100 text-emerald-800 border-emerald-300", desc: "Hadir Bertugas (Dapat Uang Makan)" },
  PD: { label: "Dinas Luar", color: "bg-blue-100 text-blue-800 border-blue-300", desc: "Perjalanan Dinas (Dapat Uang Makan)" },
  C: { label: "Cuti", color: "bg-amber-100 text-amber-800 border-amber-300", desc: "Cuti Tahunan / Alasan Penting" },
  S: { label: "Sakit", color: "bg-rose-100 text-rose-800 border-rose-300", desc: "Izin Sakit" },
  I: { label: "Izin", color: "bg-purple-100 text-purple-800 border-purple-300", desc: "Izin Tidak Masuk" },
  A: { label: "Alpa", color: "bg-red-100 text-red-800 border-red-300", desc: "Tanpa Keterangan" },
  L: { label: "Libur", color: "bg-slate-100 text-slate-600 border-slate-200", desc: "Akhir Pekan / Libur Nasional" },
};

export function EmployeeMealAllowanceTab({ employee }: Props) {
  const [page, setPage] = useState(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MealAllowanceRecord | null>(null);

  const { data: response, isLoading } = useQuery<ApiResponse>({
    queryKey: ["employee-meal-allowances", employee.id, page],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(
        `/kepegawaian/employees/${employee.id}/meal-allowances?page=${page}&per_page=10`
      );
      return data;
    },
  });

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Berhasil disalin ke papan klip!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const records = response?.data || [];
  const meta = response?.meta;

  // Total akumulasi penerimaan
  const totalNettoKumulatif = records.reduce((acc, r) => acc + Number(r.uang_makan_netto || 0), 0);
  const latestRecord = records[0];

  return (
    <div className="space-y-6">
      {/* Mini Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Penerimaan Terakhir</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {latestRecord ? formatRupiah(latestRecord.uang_makan_netto) : "Rp 0"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {latestRecord?.batch ? formatPeriodLabel(latestRecord.batch.periode_bulan) : "Belum ada batch"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400">
            <Receipt className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Hari Dihitung (Terakhir)</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {latestRecord ? `${latestRecord.jml_hadir + latestRecord.jml_pd} Hari` : "0 Hari"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {latestRecord ? `${latestRecord.jml_hadir} Hadir + ${latestRecord.jml_pd} Dinas Luar (PD)` : "-"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400">
            <Building className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bank Penyalur Terdaftar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-black text-xs">
              {employee.nama_bank || "BELUM DISET"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {employee.nomor_rekening ? `No. Rek: ${employee.nomor_rekening}` : "Rekening belum diinput"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
            <UtensilsCrossed className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tarif & PPh 21</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {latestRecord ? `${formatRupiah(latestRecord.tarif_harian)} / hari` : "Sesuai Golongan"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {latestRecord ? `PPh 21: ${latestRecord.persen_pph21}% (${formatRupiah(latestRecord.potongan_pph21)})` : "Pajak sesuai ketentuan Menkeu"}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Riwayat Pembayaran Uang Makan Pegawai
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar rekapitulasi batch pencairan uang makan resmi berdasarkan presensi SIKADIR & Surat Tugas
            </p>
          </div>
          {meta && meta.total > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Total {meta.total} Periode
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Memuat riwayat uang makan pegawai...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Belum Ada Data Pembayaran Uang Makan
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Pegawai ini belum tercatat dalam batch final uang makan, atau proses perhitungan presensi bulan berjalan belum disimpan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Periode & Batch</th>
                  <th className="py-3.5 px-4 text-center">Kehadiran & PD</th>
                  <th className="py-3.5 px-4">Tarif & Golongan</th>
                  <th className="py-3.5 px-4 text-right">Bruto</th>
                  <th className="py-3.5 px-4 text-right">Pot. PPh 21</th>
                  <th className="py-3.5 px-4 text-right">Netto Diterima</th>
                  <th className="py-3.5 px-4">Penyalur</th>
                  <th className="py-3.5 px-4 text-center">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((rec) => {
                  const totalHari = Number(rec.jml_hadir || 0) + Number(rec.jml_pd || 0);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {rec.batch ? formatPeriodLabel(rec.batch.periode_bulan) : "-"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                          {rec.batch?.nama_batch || `Batch #${rec.batch_id}`}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {rec.jml_hadir} Hadir
                          </span>
                          {rec.jml_pd > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {rec.jml_pd} PD
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Total: {totalHari} hari
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(rec.tarif_harian)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Gol: {rec.golongan || "-"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatRupiah(rec.uang_makan_bruto)}
                      </td>

                      <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-medium">
                        {rec.potongan_pph21 && Number(rec.potongan_pph21) > 0 ? (
                          <>
                            <div>-{formatRupiah(rec.potongan_pph21)}</div>
                            <span className="text-[9px] text-slate-400">({rec.persen_pph21}%)</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[10px]">0% (Rp 0)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatRupiah(rec.uang_makan_netto)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded font-black text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {rec.nama_bank || "BRI"}
                          </span>
                        </div>
                        {rec.nomor_rekening && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>{rec.nomor_rekening}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(rec.nomor_rekening, `table-rek-${rec.id}`)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="Salin Nomor Rekening"
                            >
                              {copiedField === `table-rek-${rec.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs rounded-lg gap-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Kalender</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta && meta.last_page > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Halaman {meta.current_page} dari {meta.last_page} ({meta.total} entri)
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                className="h-8 rounded-lg"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Rincian Kalender Harian Presensi (Daily Matrix) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Rincian Matriks Presensi Harian
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedRecord.batch ? formatPeriodLabel(selectedRecord.batch.periode_bulan) : "Periode"} • {selectedRecord.nama_lengkap}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700"
                onClick={() => setSelectedRecord(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Hadir (H)</div>
                  <div className="text-lg font-black text-emerald-800 dark:text-emerald-200">{selectedRecord.jml_hadir} Hari</div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                  <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase">Dinas Luar (PD)</div>
                  <div className="text-lg font-black text-blue-800 dark:text-blue-200">{selectedRecord.jml_pd} Hari</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase">Cuti & Izin</div>
                  <div className="text-lg font-black text-amber-800 dark:text-amber-200">
                    {Number(selectedRecord.jml_cuti || 0) + Number(selectedRecord.jml_sakit || 0) + Number(selectedRecord.jml_izin || 0)} Hari
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase">Netto Uang Makan</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(selectedRecord.uang_makan_netto)}
                  </div>
                </div>
              </div>

              {/* Matrix Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Status Kehadiran per Tanggal:
                </h4>
                {selectedRecord.daily_matrix && Object.keys(selectedRecord.daily_matrix).length > 0 ? (
                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 text-center">
                    {Object.entries(selectedRecord.daily_matrix)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dateKey, code]) => {
                        const dayNum = dateKey.split("-")[2];
                        const metaCode = STATUS_LABELS[code] || {
                          label: code,
                          color: "bg-slate-100 text-slate-700 border-slate-200",
                          desc: code,
                        };
                        return (
                          <div
                            key={dateKey}
                            className={cn(
                              "p-2 rounded-xl border flex flex-col items-center justify-between transition-all",
                              metaCode.color
                            )}
                            title={`${dateKey}: ${metaCode.label} (${metaCode.desc})`}
                          >
                            <span className="text-[10px] font-mono text-slate-500 font-medium">{dayNum}</span>
                            <span className="text-xs font-black my-0.5">{code}</span>
                            <span className="text-[8px] font-semibold truncate max-w-full">{metaCode.label}</span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    Data matriks harian tidak tersimpan untuk batch ini.
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Keterangan Simbol:
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {Object.entries(STATUS_LABELS).map(([code, val]) => (
                    <span key={code} className={cn("px-2 py-0.5 rounded-md border font-semibold", val.color)}>
                      {code} = {val.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setSelectedRecord(null)}
              >
                Tutup Rincian
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
