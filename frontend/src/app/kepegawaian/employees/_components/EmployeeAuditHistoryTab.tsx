"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Clock, History, Loader2, ShieldCheck, UserCheck, ArrowRight } from "lucide-react";
import { RESOR_OPTIONS } from "@/app/kepegawaian/_lib/employee-constants";

interface HistoryChangeItem {
  old: any;
  new: any;
}

interface HistoryRecord {
  id: number;
  employee_id: number;
  user_id: number | null;
  action: string;
  changes: Record<string, HistoryChangeItem>;
  notes: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    username: string;
  } | null;
}

interface EmployeeAuditHistoryTabProps {
  employeeId: string | number;
}

const FIELD_LABELS: Record<string, string> = {
  nama_lengkap: "Nama Lengkap",
  nip: "NIP / NIPPPK",
  jabatan: "Jabatan",
  pangkat_golongan: "Pangkat & Golongan",
  satuan_kerja: "Unit Kerja",
  resor: "Resor Penempatan",
  masa_kerja: "Masa Kerja",
  is_active: "Status Keaktifan",
};

function formatFieldValue(field: string, val: any): string {
  if (val === null || val === undefined || val === "") return "(Kosong)";
  if (field === "is_active") {
    return val ? "Aktif" : "Non-Aktif";
  }
  if (field === "resor") {
    const found = RESOR_OPTIONS.find((r) => r.code === val);
    return found ? found.name : String(val);
  }
  return String(val);
}

function formatDateTimeIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Makassar",
    }) + " WITA";
  } catch {
    return dateStr;
  }
}

export function EmployeeAuditHistoryTab({ employeeId }: EmployeeAuditHistoryTabProps) {
  const { data, isLoading, isError, refetch } = useQuery<{ status: string; data: HistoryRecord[] }>({
    queryKey: ["employee-histories", employeeId],
    queryFn: async () => {
      const res = await api.get(`/kepegawaian/employees/${employeeId}/histories`);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const histories = data?.data || [];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-12 text-center shadow-xs">
        <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Memuat riwayat perubahan biodata...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-rose-600 mb-2">Gagal memuat riwayat perubahan.</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mb-3 text-slate-400">
          <History className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-1">
          Belum Ada Riwayat Perubahan
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
          Setiap perubahan data biodata, jabatan, penempatan resor, atau masa kerja yang dilakukan oleh Administrator akan otomatis tercatat secara kronologis di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              Jejak Audit Perubahan Biodata
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Merekam secara akurat siapa, kapan, dan field apa saja yang disesuaikan pada profil pegawai.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full border border-blue-100 dark:border-blue-900/50">
          {histories.length} Catatan Perubahan
        </span>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
        {histories.map((record) => {
          const changeEntries = Object.entries(record.changes || {});

          return (
            <div key={record.id} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs ring-4 ring-white dark:ring-zinc-900">
                <History className="w-3 h-3" />
              </div>

              {/* Card Container */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-xs transition-shadow hover:shadow-md">
                {/* Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800 gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      {record.user?.name || "Administrator"}
                    </span>
                    {record.user?.username && (
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded-md">
                        {record.user.username}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTimeIndo(record.created_at)}</span>
                  </div>
                </div>

                {/* Changed Fields Grid */}
                <div className="space-y-2.5">
                  {changeEntries.map(([field, diff]) => {
                    const label = FIELD_LABELS[field] || field;
                    const oldVal = formatFieldValue(field, diff.old);
                    const newVal = formatFieldValue(field, diff.new);

                    return (
                      <div
                        key={field}
                        className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-bold text-slate-700 dark:text-zinc-300 min-w-36">
                          {label}
                        </span>

                        <div className="flex items-center flex-wrap gap-2 grow justify-start md:justify-end">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 line-through">
                            {oldVal}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-100 dark:border-emerald-900/40">
                            {newVal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
