"use client";

import React from "react";
import { Calendar, FileCheck, FileText, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeaveRequestPrintData } from "./FormulirCutiPrint";
import { ScanViewerModal } from "@/app/kepegawaian/cuti/_components/ScanViewerModal";

interface MyLeaveTabProps {
  myLeaveRequests: LeaveRequestPrintData[];
  onOpenLeaveDialog: () => void;
  onPrintLeave: (item: LeaveRequestPrintData) => void;
  onCancelLeave?: (id: number) => void;
  activeLeaveId?: number | string | null;
}

function getLeaveStatusBadge(item: LeaveRequestPrintData): { label: string; className: string } {
  const status = (item.status || "").toUpperCase();
  const atasanStatus = (item.status_pertimbangan_atasan || "").toUpperCase();

  if (status === "DITOLAK" || status === "REJECTED" || atasanStatus === "DITOLAK" || atasanStatus === "REJECTED") {
    return {
      label: "Ditolak",
      className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    };
  }
  if (status === "DISETUJUI" || status === "APPROVED") {
    return {
      label: "Disetujui",
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    };
  }
  if (atasanStatus === "DISETUJUI" || atasanStatus === "APPROVED") {
    return {
      label: "Verifikasi Atasan",
      className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    };
  }
  return {
    label: "Pengajuan",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  };
}

export function MyLeaveTab({
  myLeaveRequests,
  onOpenLeaveDialog,
  onPrintLeave,
  onCancelLeave,
  activeLeaveId,
}: MyLeaveTabProps) {
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const [viewerModal, setViewerModal] = React.useState<{ url: string; fileName?: string | null; title?: string } | null>(null);

  React.useEffect(() => {
    if (!activeLeaveId || !myLeaveRequests.length) return;
    const target = myLeaveRequests.find((r) => String(r.id) === String(activeLeaveId));
    if (target) {
      if (target.scan_surat_izin_path || target.scan_surat_path) {
        setViewerModal({
          url: `/me/leave-requests/${target.id}/scan-surat-izin`,
          fileName: target.scan_surat_izin_nama || target.scan_surat_nama,
          title: "Surat Izin Cuti Resmi (TTE Kepala Balai)",
        });
      } else {
        onPrintLeave(target);
      }
    }
  }, [activeLeaveId, myLeaveRequests, onPrintLeave]);

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
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Riwayat & Pengajuan Cuti Saya</span>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900">
              {filteredRequests.length} Data
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar seluruh riwayat surat izin cuti resmi (SI/ST) dan pengajuan mandiri Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajukan Cuti Baru
          </Button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Belum Ada Riwayat Cuti
          </p>
          <p className="text-xs text-slate-400">
            {selectedYear === "all"
              ? 'Klik tombol "Ajukan Cuti Baru" untuk mengisi formulir permohonan cuti.'
              : `Tidak ada data cuti yang tercatat untuk tahun ${selectedYear}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((item, idx) => (
            <div
              key={item.id ?? `leave-${item.tanggal_pengajuan}-${idx}`}
              className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2.5 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.jenis_cuti}
                    </span>
                    {(() => {
                      const badge = getLeaveStatusBadge(item);
                      return (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  {item.nomor_pengajuan ? (
                    <div className="font-mono text-[10px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900 px-1.5 py-0.5 rounded mt-1 inline-block">
                      SI: {item.nomor_pengajuan}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1">
                      (Nomor surat penetapan belum diterbitkan)
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shrink-0">
                  {item.jumlah_hari} Hari
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Periode:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {item.tanggal_mulai} s.d. {item.tanggal_selesai}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Alasan: </span>
                  {!item.alasan_cuti || item.alasan_cuti.toLowerCase().includes("sisa cuti") ? (
                    <span className="text-slate-400 italic">Sesuai ketentuan {item.jenis_cuti}</span>
                  ) : (
                    <span>{item.alasan_cuti}</span>
                  )}
                </p>
                {item.catatan_atasan && (
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-lg p-2 font-medium mt-1.5">
                    <span className="font-bold">Catatan Persetujuan: </span>
                    {item.catatan_atasan}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800 text-[11px]">
                <span className="text-slate-400">Tgl: {item.tanggal_pengajuan}</span>
                <div className="flex items-center gap-2">
                  {(item.status?.toUpperCase() === "PENGAJUAN" || item.status?.toUpperCase() === "PENDING") && onCancelLeave && item.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancelLeave(item.id!)}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs h-8 rounded-xl font-bold"
                    >
                      Batalkan
                    </Button>
                  )}
                  {(() => {
                    const isApproved = item.status?.toUpperCase() === "DISETUJUI" || item.status?.toUpperCase() === "APPROVED";
                    const hasSuratIzin = !!(item.scan_surat_izin_path || item.scan_surat_path);
                    const hasFormulir = !!item.scan_formulir_path;

                    if (isApproved && (hasSuratIzin || hasFormulir)) {
                      return (
                        <>
                          {hasSuratIzin && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setViewerModal({
                                  url: `/me/leave-requests/${item.id}/scan-surat-izin`,
                                  fileName: item.scan_surat_izin_nama || item.scan_surat_nama,
                                  title: "Surat Izin Cuti Resmi (TTE Kepala Balai)",
                                })
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-xs"
                              title="Lihat Surat Izin Cuti Resmi (TTE Kepala Balai)"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Surat Izin (TTE)
                            </Button>
                          )}
                          {hasFormulir && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setViewerModal({
                                  url: `/me/leave-requests/${item.id}/scan-formulir`,
                                  fileName: item.scan_formulir_nama,
                                  title: "Scan Formulir Permohonan Cuti (TTD Manual & Cap Balai)",
                                })
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-xs"
                              title="Lihat Scan Formulir Cuti (TTD Manual & Cap Balai)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Scan Formulir
                            </Button>
                          )}
                        </>
                      );
                    }

                    return (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onPrintLeave(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak Formulir Cuti
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
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
