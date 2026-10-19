"use client";

import React from "react";
import { Calendar, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeaveRequestPrintData } from "./FormulirCutiPrint";

interface MyLeaveTabProps {
  myLeaveRequests: LeaveRequestPrintData[];
  onOpenLeaveDialog: () => void;
  onPrintLeave: (item: LeaveRequestPrintData) => void;
  onCancelLeave?: (id: number) => void;
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
}: MyLeaveTabProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Daftar Pengajuan Cuti Saya
          </h3>
          <p className="text-xs text-slate-500">
            Ajukan permohonan cuti dan cetak formulir resmi BKSDA.
          </p>
        </div>
        <Button
          onClick={onOpenLeaveDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-sm gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Ajukan Cuti Baru
        </Button>
      </div>

      {myLeaveRequests.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Belum Ada Pengajuan Cuti
          </p>
          <p className="text-xs text-slate-400">
            Klik tombol &quot;Ajukan Cuti Baru&quot; untuk mengisi formulir permohonan cuti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myLeaveRequests.map((item, idx) => (
            <div
              key={item.id ?? `leave-${item.tanggal_pengajuan}-${idx}`}
              className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {item.jumlah_hari} Hari ({item.tanggal_mulai} s/d {item.tanggal_selesai})
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Alasan: </span>
                {item.alasan_cuti}
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">Pengajuan: {item.tanggal_pengajuan}</span>
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
                  <Button
                    size="sm"
                    onClick={() => onPrintLeave(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Formulir Cuti
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
