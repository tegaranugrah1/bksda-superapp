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
    <div className="rounded-xl border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] p-3 sm:p-3.5 text-[var(--ds-status-warning-fg)] shadow-sm">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-[var(--ds-status-warning-fg)] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[var(--ds-status-warning-fg)] tracking-tight">
            Jadwal Tugas / Cuti Bentrok
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--ds-status-warning-fg)]">
            {conflicts.map((c, idx) => (
              <li key={`${c.employee_id}-${c.reference_id}-${idx}`} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-status-warning-fg)] shrink-0" />
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
