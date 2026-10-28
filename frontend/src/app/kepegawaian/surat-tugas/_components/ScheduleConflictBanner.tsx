"use client";

import React from "react";
import { AlertTriangle, Calendar, UserX } from "lucide-react";

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
  onRemoveEmployee?: (employeeId: number) => void;
}

export function ScheduleConflictBanner({ conflicts, onRemoveEmployee }: ScheduleConflictBannerProps) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50/90 p-4 sm:p-5 text-red-950 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-red-900 tracking-tight">
            Jadwal Tugas / Cuti Bentrok ({conflicts.length} Konflik Ditemukan)
          </h4>
          <p className="text-xs text-red-700 mt-0.5 font-medium">
            Personel di bawah ini tidak tersedia pada tanggal yang dipilih karena sudah memiliki penugasan resmi / permohonan aktif atau sedang dalam masa cuti yang disetujui:
          </p>

          <div className="mt-3 space-y-2">
            {conflicts.map((c, idx) => (
              <div
                key={`${c.employee_id}-${c.reference_id}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/90 border border-red-200/80 rounded-xl text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{c.employee_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.type === "cuti"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.type === "cuti" ? "Cuti Aktif" : `Surat Tugas (${c.status || "Aktif"})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-red-600">{c.range_formatted}</span>
                    {c.nomor && c.nomor !== "-" && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="truncate max-w-xs">{c.nomor}</span>
                      </>
                    )}
                  </div>
                  {c.keterangan && (
                    <p className="text-[11px] text-slate-600 italic line-clamp-1">
                      "{c.keterangan}"
                    </p>
                  )}
                </div>

                {onRemoveEmployee && (
                  <button
                    type="button"
                    onClick={() => onRemoveEmployee(c.employee_id)}
                    className="self-end sm:self-center shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-100/60 hover:bg-red-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Hapus dari Tugas
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 p-2.5 bg-red-100/60 rounded-xl text-[11px] text-red-800 font-medium">
            ⚠️ <strong>Perhatian:</strong> Sistem memblokir pengajuan selama terdapat bentrok jadwal. Silakan sesuaikan tanggal pelaksanaan kegiatan atau ganti personel tugas agar dapat melanjutkan.
          </div>
        </div>
      </div>
    </div>
  );
}
