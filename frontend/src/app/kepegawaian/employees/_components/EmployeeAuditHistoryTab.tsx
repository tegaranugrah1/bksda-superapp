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
  nama_bank: "Bank Penyalur Uang Makan",
  nomor_rekening: "Nomor Rekening Bank",
  telepon: "Nomor WhatsApp / HP",
  email: "Alamat Email",
  is_active: "Status Keaktifan",
  role: "Peran / Tingkat Akses Akun",
  access_modules: "Wewenang Modul",
  permissions: "Izin Khusus",
};

function formatFieldValue(field: string, val: any): string {
  if (val === null || val === undefined || val === "") return "(Kosong)";
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(", ") : "(Tidak ada)";
  }
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
      <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-12 text-center shadow-xs">
        <Loader2 className="w-8 h-8 mx-auto text-[var(--ds-accent-fg)] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[var(--ds-fg-muted)]">Memuat riwayat perubahan biodata...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-status-danger-border)] p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-[var(--ds-status-danger-fg)] mb-2">Gagal memuat riwayat perubahan.</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-[var(--ds-accent-fg)] hover:underline font-bold cursor-pointer"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--ds-surface)] flex items-center justify-center mb-3 text-[var(--ds-fg-muted)]">
          <History className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[var(--ds-fg)] mb-1">
          Belum Ada Riwayat Perubahan
        </h3>
        <p className="text-xs text-[var(--ds-fg-muted)] max-w-md mx-auto">
          Setiap perubahan data biodata, jabatan, penempatan resor, atau masa kerja yang dilakukan oleh Administrator akan otomatis tercatat secara kronologis di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] flex items-center justify-center text-[var(--ds-accent-fg)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ds-fg)]">
              Jejak Audit Perubahan Biodata
            </h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Merekam secara akurat siapa, kapan, dan field apa saja yang disesuaikan pada profil pegawai.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-bold text-xs rounded-full border border-[var(--ds-accent-soft-border)]">
          {histories.length} Catatan Perubahan
        </span>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--ds-surface-muted)] dark:before:bg-[var(--ds-fg)]">
        {histories.map((record) => {
          const changeEntries = Object.entries(record.changes || {});

          return (
            <div key={record.id} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] flex items-center justify-center shadow-xs ring-4 ring-white">
                <History className="w-3 h-3" />
              </div>

              {/* Card Container */}
              <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-5 shadow-xs transition-shadow hover:shadow-md">
                {/* Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[var(--ds-border-subtle)] gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
                    <span className="text-xs font-bold text-[var(--ds-fg)]">
                      {record.user?.name || "Administrator"}
                    </span>
                    {record.user?.username && (
                      <span className="text-xs font-mono px-2 py-0.5 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] rounded-md">
                        {record.user.username}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--ds-fg-muted)] text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTimeIndo(record.created_at)}</span>
                  </div>
                </div>

                {/* Catatan Tindakan / Administrative Notes */}
                {record.notes && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg-muted)]">
                    <span className="font-bold text-[var(--ds-fg)] mr-1.5">Keterangan:</span>
                    <span>{record.notes}</span>
                  </div>
                )}

                {/* Changed Fields Grid */}
                <div className="space-y-2.5">
                  {changeEntries.map(([field, diff]) => {
                    const label = FIELD_LABELS[field] || field;
                    const oldVal = formatFieldValue(field, diff.old);
                    const newVal = formatFieldValue(field, diff.new);

                    return (
                      <div
                        key={field}
                        className="p-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-bold text-[var(--ds-fg)] min-w-36">
                          {label}
                        </span>

                        <div className="flex items-center flex-wrap gap-2 grow justify-start md:justify-end">
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] line-through">
                            {oldVal}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--ds-fg-muted)] shrink-0" />
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] font-bold border border-[var(--ds-status-success-border)]">
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
