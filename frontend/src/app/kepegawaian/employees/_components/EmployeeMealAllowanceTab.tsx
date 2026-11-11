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
  H: { label: "Hadir", color: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]", desc: "Hadir Bertugas (Dapat Uang Makan)" },
  PD: { label: "Dinas Luar", color: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]", desc: "Perjalanan Dinas (Dapat Uang Makan)" },
  C: { label: "Cuti", color: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]", desc: "Cuti Tahunan / Alasan Penting" },
  S: { label: "Sakit", color: "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border-[var(--ds-status-danger-border)]", desc: "Izin Sakit" },
  I: { label: "Izin", color: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]", desc: "Izin Tidak Masuk" },
  A: { label: "Alpa", color: "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border-[var(--ds-status-danger-border)]", desc: "Tanpa Keterangan" },
  L: { label: "Libur", color: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border-[var(--ds-border-subtle)]", desc: "Akhir Pekan / Libur Nasional" },
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
        <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
          <div className="flex items-center gap-2 mb-2 text-[var(--ds-status-success-fg)]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Penerimaan Terakhir</span>
          </div>
          <p className="text-xl font-black text-[var(--ds-fg)]">
            {latestRecord ? formatRupiah(latestRecord.uang_makan_netto) : "Rp 0"}
          </p>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            {latestRecord?.batch ? formatPeriodLabel(latestRecord.batch.periode_bulan) : "Belum ada batch"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
          <div className="flex items-center gap-2 mb-2 text-[var(--ds-accent-fg)]">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Hari Dihitung (Terakhir)</span>
          </div>
          <p className="text-xl font-black text-[var(--ds-fg)]">
            {latestRecord ? `${latestRecord.jml_hadir + latestRecord.jml_pd} Hari` : "0 Hari"}
          </p>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            {latestRecord ? `${latestRecord.jml_hadir} Hadir + ${latestRecord.jml_pd} Dinas Luar (PD)` : "-"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
          <div className="flex items-center gap-2 mb-2 text-[var(--ds-accent-fg)]">
            <Building className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Bank Penyalur Terdaftar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-black text-xs">
              {employee.nama_bank || "BELUM DISET"}
            </span>
          </div>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-mono">
            {employee.nomor_rekening ? `No. Rek: ${employee.nomor_rekening}` : "Rekening belum diinput"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
          <div className="flex items-center gap-2 mb-2 text-[var(--ds-status-warning-fg)]">
            <UtensilsCrossed className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Tarif & PPh 21</span>
          </div>
          <p className="text-base font-bold text-[var(--ds-fg)]">
            {latestRecord ? `${formatRupiah(latestRecord.tarif_harian)} / hari` : "Sesuai Golongan"}
          </p>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            {latestRecord ? `PPh 21: ${latestRecord.persen_pph21}% (${formatRupiah(latestRecord.potongan_pph21)})` : "Pajak sesuai ketentuan Menkeu"}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[var(--ds-border-subtle)] flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--ds-fg)] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
              Riwayat Pembayaran Uang Makan Pegawai
            </h3>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Daftar rekapitulasi batch pencairan uang makan resmi berdasarkan presensi SIKADIR & Surat Tugas
            </p>
          </div>
          {meta && meta.total > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
              Total {meta.total} Periode
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-3 border-[var(--ds-status-success-border)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--ds-fg-muted)]">Memuat riwayat uang makan pegawai...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] mx-auto flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[var(--ds-fg)]">
              Belum Ada Data Pembayaran Uang Makan
            </h4>
            <p className="text-xs text-[var(--ds-fg-muted)] max-w-sm mx-auto">
              Pegawai ini belum tercatat dalam batch final uang makan, atau proses perhitungan presensi bulan berjalan belum disimpan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] uppercase tracking-wider font-semibold border-b border-[var(--ds-border-subtle)] text-xs">
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
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {records.map((rec) => {
                  const totalHari = Number(rec.jml_hadir || 0) + Number(rec.jml_pd || 0);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[var(--ds-surface)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--ds-fg)]">
                          {rec.batch ? formatPeriodLabel(rec.batch.periode_bulan) : "-"}
                        </div>
                        <div className="text-xs text-[var(--ds-fg-muted)] truncate max-w-[180px]">
                          {rec.batch?.nama_batch || `Batch #${rec.batch_id}`}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]">
                            {rec.jml_hadir} Hadir
                          </span>
                          {rec.jml_pd > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                              {rec.jml_pd} PD
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5 font-medium">
                          Total: {totalHari} hari
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--ds-fg)]">
                          {formatRupiah(rec.tarif_harian)}
                        </div>
                        <div className="text-xs text-[var(--ds-fg-muted)] font-mono">
                          Gol: {rec.golongan || "-"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-[var(--ds-fg)]">
                        {formatRupiah(rec.uang_makan_bruto)}
                      </td>

                      <td className="py-3 px-4 text-right text-[var(--ds-status-danger-fg)] font-medium">
                        {rec.potongan_pph21 && Number(rec.potongan_pph21) > 0 ? (
                          <>
                            <div>-{formatRupiah(rec.potongan_pph21)}</div>
                            <span className="text-xs text-[var(--ds-fg-muted)]">({rec.persen_pph21}%)</span>
                          </>
                        ) : (
                          <span className="text-[var(--ds-fg-muted)] text-xs">0% (Rp 0)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-[var(--ds-status-success-fg)] text-sm">
                          {formatRupiah(rec.uang_makan_netto)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded font-black text-xs bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]">
                            {rec.nama_bank || "BRI"}
                          </span>
                        </div>
                        {rec.nomor_rekening && (
                          <div className="text-xs font-mono text-[var(--ds-fg-muted)] mt-0.5 flex items-center gap-1">
                            <span>{rec.nomor_rekening}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(rec.nomor_rekening, `table-rek-${rec.id}`)}
                              className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors"
                              title="Salin Nomor Rekening"
                            >
                              {copiedField === `table-rek-${rec.id}` ? (
                                <Check className="w-2.5 h-2.5 text-[var(--ds-status-success-fg)]" />
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
                          className="h-7 px-2 text-xs rounded-lg gap-1 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
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
          <div className="p-4 border-t border-[var(--ds-border-subtle)] flex items-center justify-between text-xs text-[var(--ds-fg-muted)]">
            <div>
              Halaman {meta.current_page} dari {meta.last_page} ({meta.total} entri)
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg" aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                className="h-8 rounded-lg" aria-label="Halaman berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Rincian Kalender Harian Presensi (Daily Matrix) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4   ">
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--ds-border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--ds-fg)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                  Rincian Matriks Presensi Harian
                </h3>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                  {selectedRecord.batch ? formatPeriodLabel(selectedRecord.batch.periode_bulan) : "Periode"} • {selectedRecord.nama_lengkap}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                onClick={() => setSelectedRecord(null)} aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)]">
                  <div className="text-xs text-[var(--ds-status-success-fg)] font-bold uppercase">Hadir (H)</div>
                  <div className="text-lg font-black text-[var(--ds-status-success-fg)]">{selectedRecord.jml_hadir} Hari</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)]">
                  <div className="text-xs text-[var(--ds-accent-fg)] font-bold uppercase">Dinas Luar (PD)</div>
                  <div className="text-lg font-black text-[var(--ds-accent-fg)]">{selectedRecord.jml_pd} Hari</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)]">
                  <div className="text-xs text-[var(--ds-status-warning-fg)] font-bold uppercase">Cuti & Izin</div>
                  <div className="text-lg font-black text-[var(--ds-status-warning-fg)]">
                    {Number(selectedRecord.jml_cuti || 0) + Number(selectedRecord.jml_sakit || 0) + Number(selectedRecord.jml_izin || 0)} Hari
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)]">
                  <div className="text-xs text-[var(--ds-fg-muted)] font-bold uppercase">Netto Uang Makan</div>
                  <div className="text-base font-black text-[var(--ds-status-success-fg)]">
                    {formatRupiah(selectedRecord.uang_makan_netto)}
                  </div>
                </div>
              </div>

              {/* Matrix Grid */}
              <div>
                <h4 className="text-xs font-bold text-[var(--ds-fg)] mb-2">
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
                          color: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] border-[var(--ds-border-subtle)]",
                          desc: code,
                        };
                        return (
                          <div
                            key={dateKey}
                            className={cn(
                              "p-2 rounded-xl border flex flex-col items-center justify-between transition-colors",
                              metaCode.color
                            )}
                            title={`${dateKey}: ${metaCode.label} (${metaCode.desc})`}
                          >
                            <span className="text-xs font-mono text-[var(--ds-fg-muted)] font-medium">{dayNum}</span>
                            <span className="text-xs font-black my-0.5">{code}</span>
                            <span className="text-[8px] font-semibold truncate max-w-full">{metaCode.label}</span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[var(--ds-fg-muted)] border border-dashed rounded-xl">
                    Data matriks harian tidak tersimpan untuk batch ini.
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="p-3 bg-[var(--ds-surface)] rounded-xl space-y-1.5 text-xs">
                <div className="font-bold text-[var(--ds-fg)] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                  Keterangan Simbol:
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(STATUS_LABELS).map(([code, val]) => (
                    <span key={code} className={cn("px-2 py-0.5 rounded-md border font-semibold", val.color)}>
                      {code} = {val.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] flex justify-end">
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
