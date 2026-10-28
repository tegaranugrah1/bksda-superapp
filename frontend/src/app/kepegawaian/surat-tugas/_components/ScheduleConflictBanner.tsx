"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

export interface ScheduleConflict {
  employee_id: number;
  employee_name: string;
  type: "surat_tugas" | "cuti";
  reference_id: string | number;
  nomor?: string;
  keterangan?: string;
  status?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  range_formatted: string;
  message: string;
}

interface ScheduleConflictBannerProps {
  conflicts: ScheduleConflict[];
}

export function ScheduleConflictBanner({ conflicts }: ScheduleConflictBannerProps) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800/60 p-3 sm:p-3.5 text-amber-950 dark:text-amber-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-300 tracking-tight">
            Jadwal Tugas / Cuti Bentrok
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-900/90 dark:text-amber-200/90">
            {conflicts.map((c, idx) => (
              <li key={`${c.employee_id}-${c.reference_id}-${idx}`} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  <strong>{c.employee_name}</strong>: Ada {c.type === "cuti" ? "Cuti Aktif" : "Surat Tugas"} pada tanggal{" "}
                  <span className="font-semibold underline decoration-amber-400">{c.range_formatted}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
