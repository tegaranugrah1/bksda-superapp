"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { transition, AuctionBatch } from "../../_lib/api";
import { toast } from "sonner";
import {
  Calendar,
  FileText,
  AlertTriangle,
  Check,
  Lock,
  Clock,
  Info,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ScheduleTabProps {
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

export function ScheduleTab({ batch, readOnly, onRefetch }: ScheduleTabProps) {
  const { hasPermission } = useRole();
  const canFinalize = hasPermission("bmn.auction.finalize");

  // Form State
  const [noPersetujuan, setNoPersetujuan] = useState("");
  const [tglPersetujuan, setTglPersetujuan] = useState("");
  const [noPenetapan, setNoPenetapan] = useState("");
  const [tglLelang, setTglLelang] = useState("");

  // Load existing values
  useEffect(() => {
    if (batch) {
      setNoPersetujuan(batch.no_surat_persetujuan || "");
      setTglPersetujuan(batch.tanggal_surat_persetujuan || "");
      setNoPenetapan(batch.no_surat_penetapan || "");
      setTglLelang(batch.tanggal_lelang || "");
    }
  }, [batch]);

  // Transition to JADWAL_DITETAPKAN
  const saveMutation = useMutation({
    mutationFn: (payload: any) => transition(batch.id, payload),
    onSuccess: () => {
      toast.success("Jadwal lelang berhasil ditetapkan.");
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal menetapkan jadwal lelang.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noPersetujuan.trim() || !tglPersetujuan || !noPenetapan.trim() || !tglLelang) {
      toast.error("Semua field wajib diisi.");
      return;
    }
    saveMutation.mutate({
      status: "JADWAL_DITETAPKAN",
      no_surat_persetujuan: noPersetujuan,
      tanggal_surat_persetujuan: tglPersetujuan,
      no_surat_penetapan: noPenetapan,
      tanggal_lelang: tglLelang,
    });
  };

  const isEditable = batch.status === "DIAJUKAN" && canFinalize;
  const validity = batch.validity_warning;
  const hasValidityWarning = validity?.requires_revaluation_review === true;

  const formatDateLabel = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          Penetapan Jadwal Lelang Eksternal
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Catat nomor dokumen persetujuan/penetapan dan tanggal pelaksanaan lelang resmi yang diterbitkan oleh KPKNL.
        </p>
      </div>

      {/* Validity/Revaluation Warning Banner */}
      {hasValidityWarning && (
        <div className="flex gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-350 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl shadow-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold">Perhatian: Masa Berlaku Penilaian Terlampaui</h4>
            <p className="mt-0.5 leading-relaxed">
              {validity.message ||
                `Surat persetujuan lelang ini berumur lebih dari ${validity.approval_review_window_months} bulan. Harap tinjau persyaratan peraturan eksternal mengenai kelayakan batas waktu penilaian aset sebelum melanjutkan.`}
            </p>
            <p className="text-[10px] text-zinc-500 italic mt-1.5">
              * Peringatan ini bersifat imbauan/advisory administratif internal untuk operator dan tidak memblokir fungsionalitas sistem.
            </p>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* No Surat Persetujuan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nomor Surat Persetujuan (KPKNL)
                </label>
                <Input
                  placeholder="S-XXX/MK.6/WKN.XX/KNL.XX/YYYY"
                  value={noPersetujuan}
                  onChange={(e) => setNoPersetujuan(e.target.value)}
                  disabled={!isEditable}
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              {/* Tanggal Surat Persetujuan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tanggal Surat Persetujuan
                </label>
                <Input
                  type="date"
                  value={tglPersetujuan}
                  onChange={(e) => setTglPersetujuan(e.target.value)}
                  disabled={!isEditable}
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              {/* No Surat Penetapan Jadwal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nomor Surat Penetapan Lelang
                </label>
                <Input
                  placeholder="S-PEN-XXX/KNL.XX/YYYY"
                  value={noPenetapan}
                  onChange={(e) => setNoPenetapan(e.target.value)}
                  disabled={!isEditable}
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              {/* Tanggal Lelang */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tanggal Pelaksanaan Lelang
                </label>
                <Input
                  type="date"
                  value={tglLelang}
                  onChange={(e) => setTglLelang(e.target.value)}
                  disabled={!isEditable}
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            {/* Save Button */}
            {isEditable && (
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Simpan & Tetapkan Jadwal
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Read-only / Permission Info Sidebar */}
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl text-xs text-zinc-500 space-y-4 self-start">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200 border-b pb-2 dark:border-zinc-800">
            <Info className="h-4.5 w-4.5 text-zinc-400" />
            Informasi Hak Akses
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={canFinalize ? "secondary" : "outline"} className="text-[10px]">
                {canFinalize ? "Memiliki Akses" : "Tidak Ada Akses"}
              </Badge>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Finalisasi</span>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-400">
              Hanya akun dengan peran verifikator/penandatangan yang memiliki izin <code>bmn.auction.finalize</code> yang dapat menetapkan jadwal lelang eksternal.
            </p>
          </div>

          {!isEditable && (
            <div className="flex gap-1.5 items-start bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-lg text-[10px] text-zinc-450 border border-zinc-200 dark:border-zinc-700">
              <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span>
                Formulir ini dikunci karena status paket bukan <strong>DIAJUKAN</strong> atau Anda tidak memiliki hak akses finalisasi.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
