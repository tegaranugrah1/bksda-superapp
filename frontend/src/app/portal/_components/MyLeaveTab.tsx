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
}

export function MyLeaveTab({
  myLeaveRequests,
  onOpenLeaveDialog,
  onPrintLeave,
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
          {myLeaveRequests.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {item.jenis_cuti}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      item.status === "DISETUJUI" || item.status_pertimbangan_atasan === "DISETUJUI"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    )}
                  >
                    {item.status === "DISETUJUI" || item.status_pertimbangan_atasan === "DISETUJUI"
                      ? "Disetujui"
                      : "Pengajuan"}
                  </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
