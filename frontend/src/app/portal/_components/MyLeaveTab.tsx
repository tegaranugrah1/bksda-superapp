"use client";

import React from "react";
import { Calendar, FileCheck, FileText, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LeaveRequestPrintData } from "./FormulirCutiPrint";
import { ScanViewerModal } from "@/app/kepegawaian/cuti/_components/ScanViewerModal";
import { formatDateRangeIndonesian, formatDateIndonesian } from "@/lib/letter-utils";
import { api, clearGetCache } from "@/lib/api";
import { toast } from "sonner";

interface MyLeaveTabProps {
  myLeaveRequests: LeaveRequestPrintData[];
  onOpenLeaveDialog: () => void;
  onPrintLeave: (item: LeaveRequestPrintData) => void;
  onCancelLeave?: (id: number) => void;
  activeLeaveId?: number | string | null;
  onConsumeActiveLeave?: () => void;
  onLeaveUnavailable?: () => void;
}

function getLeaveStatusBadge(item: LeaveRequestPrintData): { label: string; className: string } {
  const status = (item.status || "").toUpperCase();
  const atasanStatus = (item.status_pertimbangan_atasan || "").toUpperCase();

  if (status === "DITOLAK" || status === "REJECTED" || atasanStatus === "DITOLAK" || atasanStatus === "REJECTED") {
    return {
      label: "Ditolak",
      className: "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)]",
    };
  }
  if (status === "DISETUJUI" || status === "APPROVED") {
    return {
      label: "Disetujui",
      className: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)]",
    };
  }
  if (atasanStatus === "DISETUJUI" || atasanStatus === "APPROVED") {
    return {
      label: "Verifikasi Atasan",
      className: "bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border border-[var(--ds-status-info-border)]",
    };
  }
  return {
    label: "Pengajuan",
    className: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]",
  };
}

export function MyLeaveTab({
  myLeaveRequests,
  onOpenLeaveDialog,
  onPrintLeave,
  onCancelLeave,
  activeLeaveId,
  onConsumeActiveLeave,
  onLeaveUnavailable,
}: MyLeaveTabProps) {
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const [viewerModal, setViewerModal] = React.useState<{ url: string; fileName?: string | null; title?: string } | null>(null);

  React.useEffect(() => {
    if (!activeLeaveId) return;
    let active = true;
    setViewerModal(null);
    clearGetCache();
    void api.get(`/me/leave-requests/${encodeURIComponent(activeLeaveId)}`).then(response => {
      if (!active) return;
      const target: LeaveRequestPrintData = response.data.data;
      if (target.scan_surat_izin_path || target.scan_surat_path) {
        setViewerModal({
          url: `/me/leave-requests/${target.id}/scan-surat-izin`,
          fileName: target.scan_surat_izin_nama || target.scan_surat_nama,
          title: "Surat Izin Cuti Resmi (TTE Kepala Balai)",
        });
      } else {
        onPrintLeave(target);
      }
    }).catch((error: unknown) => {
      if (!active) return;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        onLeaveUnavailable?.();
        toast.info("Permohonan cuti ini sudah dihapus atau tidak lagi tersedia.");
      } else {
        toast.error("Permohonan cuti tidak tersedia atau tidak dapat diakses.");
      }
    }).finally(() => {
      if (active) onConsumeActiveLeave?.();
    });
    return () => { active = false; };
  }, [activeLeaveId, onPrintLeave, onConsumeActiveLeave, onLeaveUnavailable]);

  // Extract available years from records dynamically
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    myLeaveRequests.forEach((req) => {
      if (req.tanggal_mulai) {
        years.add(String(req.tanggal_mulai).slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [myLeaveRequests]);

  const filteredRequests = React.useMemo(() => {
    if (selectedYear === "all") return myLeaveRequests;
    return myLeaveRequests.filter((req) => String(req.tanggal_mulai).startsWith(selectedYear));
  }, [myLeaveRequests, selectedYear]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ds-fg)] flex items-center gap-2">
            <span>Riwayat & Pengajuan Cuti Saya</span>
            <span className="text-xs font-semibold bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] px-2 py-0 rounded-full border border-[var(--ds-status-info-border)] tabular-nums">
              {filteredRequests.length} Data
            </span>
          </h3>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            Daftar seluruh riwayat surat izin cuti resmi (SI/ST) dan pengajuan mandiri Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] text-xs font-semibold text-[var(--ds-fg)] outline-none tabular-nums cursor-pointer"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={onOpenLeaveDialog}
            className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs h-9 rounded-lg shadow-xs gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ajukan Cuti Baru
          </Button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg space-y-3">
          <Calendar className="w-10 h-10 text-[var(--ds-fg-muted)] mx-auto" />
          <p className="text-sm font-bold text-[var(--ds-fg)]">
            Belum Ada Riwayat Cuti
          </p>
          <p className="text-xs text-[var(--ds-fg-muted)]">
            {selectedYear === "all"
              ? 'Klik tombol "Ajukan Cuti Baru" untuk mengisi formulir permohonan cuti.'
              : `Tidak ada data cuti yang tercatat untuk tahun ${selectedYear}.`}
          </p>
        </div>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {filteredRequests.map((item, idx) => (
            <motion.div
              key={item.id ?? `leave-${item.tanggal_pengajuan}-${idx}`}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
              }}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
              className="bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-4 space-y-3 shadow-xs transition-colors"
            >
              <div className="flex items-start justify-between border-b border-slate-200/70 dark:border-zinc-800 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--ds-fg)]">
                      {item.jenis_cuti}
                    </span>
                    {(() => {
                      const badge = getLeaveStatusBadge(item);
                      return (
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-0 rounded-full uppercase tracking-wider",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  {item.nomor_pengajuan ? (
                    <div className="font-mono text-xs text-[var(--ds-status-info-fg)] bg-[var(--ds-status-info-bg)] border border-[var(--ds-status-info-border)] px-2 py-0 rounded-lg mt-1 inline-block tabular-nums">
                      SI: {item.nomor_pengajuan}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--ds-fg-muted)] italic mt-1">
                      (Nomor surat penetapan belum diterbitkan)
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--ds-surface)] text-[var(--ds-fg)] border border-slate-200/80 dark:border-zinc-800 shrink-0 tabular-nums">
                  {item.jumlah_hari} Hari
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-[var(--ds-fg-muted)] flex items-center justify-between text-xs gap-2">
                  <span>Periode:</span>
                  <span className="font-semibold text-[var(--ds-fg)] tabular-nums text-right">
                    {formatDateRangeIndonesian(item.tanggal_mulai, item.tanggal_selesai)}
                  </span>
                </div>
                <p className="text-xs text-[var(--ds-fg-muted)] font-medium pt-1">
                  <span className="font-semibold text-[var(--ds-fg)]">Alasan: </span>
                  {!item.alasan_cuti || item.alasan_cuti.toLowerCase().includes("sisa cuti") ? (
                    <span className="text-[var(--ds-fg-muted)] italic">Sesuai ketentuan {item.jenis_cuti}</span>
                  ) : (
                    <span>{item.alasan_cuti}</span>
                  )}
                </p>
                {item.catatan_atasan && (
                  <div className="text-xs text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] rounded-lg p-2 font-medium mt-2">
                    <span className="font-bold">Catatan Persetujuan: </span>
                    {item.catatan_atasan}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-zinc-800 text-xs">
                <span className="text-[var(--ds-fg-muted)] tabular-nums">Tgl: {formatDateIndonesian(item.tanggal_pengajuan)}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {(item.status?.toUpperCase() === "PENGAJUAN" || item.status?.toUpperCase() === "PENDING") && onCancelLeave && item.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancelLeave(item.id!)}
                      className="border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] text-xs h-8 rounded-lg font-bold cursor-pointer"
                    >
                      Batalkan
                    </Button>
                  )}
                  {(() => {
                    const statusUpper = (item.status || "").toUpperCase();
                    const atasanStatusUpper = (item.status_pertimbangan_atasan || "").toUpperCase();
                    const isRejected = statusUpper === "DITOLAK" || statusUpper === "REJECTED" || atasanStatusUpper === "DITOLAK" || atasanStatusUpper === "REJECTED";
                    const isApproved = statusUpper === "DISETUJUI" || statusUpper === "APPROVED";
                    const hasSuratIzin = !!(item.scan_surat_izin_path || item.scan_surat_path);
                    const hasFormulir = !!item.scan_formulir_path;

                    // 1. Status Ditolak: Sembunyikan seluruh tombol aksi
                    if (isRejected) {
                      return null;
                    }

                    // 2. Status Disetujui: Tombol Cetak Formulir Cuti HILANG, digantikan tombol berkas fisik/scan resmi
                    if (isApproved) {
                      return (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!hasSuratIzin}
                            onClick={() => {
                              if (hasSuratIzin) {
                                setViewerModal({
                                  url: `/me/leave-requests/${item.id}/scan-surat-izin`,
                                  fileName: item.scan_surat_izin_nama || item.scan_surat_nama,
                                  title: "Surat Izin Cuti Resmi (TTE Kepala Balai)",
                                });
                              }
                            }}
                            className={cn(
                              "font-bold text-xs h-8 rounded-lg gap-2 shadow-xs transition-colors",
                              hasSuratIzin
                                ? "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] cursor-pointer"
                                : "bg-[var(--ds-disabled-bg)] text-[var(--ds-disabled-fg)] border border-slate-200/80 dark:border-zinc-800 cursor-not-allowed"
                            )}
                            title={hasSuratIzin ? "Lihat Surat Izin Cuti Resmi (TTE Kepala Balai)" : "Menunggu Unggahan Admin"}
                          >
                            <FileCheck className="w-4 h-4" />
                            <span>Surat Izin (Fisik/TTE)</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={!hasFormulir}
                            onClick={() => {
                              if (hasFormulir) {
                                setViewerModal({
                                  url: `/me/leave-requests/${item.id}/scan-formulir`,
                                  fileName: item.scan_formulir_nama,
                                  title: "Scan Formulir Permohonan Cuti (TTD Manual & Cap Balai)",
                                });
                              }
                            }}
                            className={cn(
                              "font-bold text-xs h-8 rounded-lg gap-2 shadow-xs transition-colors",
                              hasFormulir
                                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                : "bg-[var(--ds-disabled-bg)] text-[var(--ds-disabled-fg)] border border-slate-200/80 dark:border-zinc-800 cursor-not-allowed"
                            )}
                            title={hasFormulir ? "Lihat Scan Formulir Cuti (TTD Manual & Cap Balai)" : "Menunggu Unggahan Admin"}
                          >
                            <FileText className="w-4 h-4" />
                            <span>Formulir Scan</span>
                          </Button>
                        </>
                      );
                    }

                    // 3. Status Pengajuan / Verifikasi Atasan: Tombol Cetak Formulir Cuti aktif
                    return (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onPrintLeave(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-lg gap-2 shadow-xs cursor-pointer"
                        title="Cetak Formulir Cuti untuk penandatanganan fisik"
                      >
                        <Printer className="w-4 h-4" />
                        Cetak Formulir Cuti
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal Pratinjau Berkas Scan Cuti Pegawai */}
      <ScanViewerModal
        isOpen={!!viewerModal}
        scanUrl={viewerModal?.url || null}
        fileName={viewerModal?.fileName}
        title={viewerModal?.title}
        onClose={() => setViewerModal(null)}
      />
    </div>
  );
}
