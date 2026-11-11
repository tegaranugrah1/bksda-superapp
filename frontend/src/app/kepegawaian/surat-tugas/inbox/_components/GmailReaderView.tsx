"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Pencil,
  CheckCircle2,
  XCircle,
  Trash2,
  Undo2,
  Calendar,
  MapPin,
  Users,
  Wallet,
  FileText,
  Clock,
  ShieldCheck,
  Eye,
  StickyNote,
} from "lucide-react";
import type { AssignmentLetter } from "../_lib/types";
import {
  getStatusStyle,
  getStatusLabel,
  needsBuilderCompletion,
  getResolvedTempatTujuan,
  extractDalamRangka,
  cleanMaksudTujuan,
  formatFormalSumberDana,
} from "../_lib/status-helpers";
import { formatDateIndonesian, formatDateRangeIndonesian, formatNIP } from "@/lib/letter-utils";

interface GmailReaderViewProps {
  letter: AssignmentLetter;
  onBack?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onApprove?: (letter: AssignmentLetter) => void;
  onReject?: (letter: AssignmentLetter) => void;
  onEdit?: (letter: AssignmentLetter) => void;
  onDownload?: (letter: AssignmentLetter) => void;
  onViewDoc?: (letter: AssignmentLetter, trigger: HTMLButtonElement) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onForceDelete?: (id: string) => void;
  onCreatePlh?: (letter: AssignmentLetter) => void;
  existingPlh?: AssignmentLetter | null;
  onOpenExistingPlh?: (letter: AssignmentLetter) => void;
  isTrashView: boolean;
  updatingStatus: boolean;
  isSplitView?: boolean;
}

export function GmailReaderView({
  letter,
  onBack,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onApprove,
  onReject,
  onEdit,
  onDownload,
  onViewDoc,
  onDelete,
  onRestore,
  onForceDelete,
  onCreatePlh,
  existingPlh,
  onOpenExistingPlh,
  isTrashView,
  updatingStatus,
  isSplitView = false,
}: GmailReaderViewProps) {
  const router = useRouter();
  const employees = letter.employees || [];
  const needsCompletion = needsBuilderCompletion(letter);
  const tujuan = getResolvedTempatTujuan(letter);
  const mainTitle = extractDalamRangka(letter.maksud_tujuan);
  const cleanedContext = cleanMaksudTujuan(letter.maksud_tujuan);

  // Deteksi pejabat struktural yang mewajibkan penunjukan PLH:
  // Wajib jika Kasubbag TU atau Kepala Seksi yang melaksanakan perjalanan dinas (Kepala Balai tidak perlu PLH)
  const hasPejabatStruktural = employees.some((e) => {
    const pos = (e.jabatan || "").toLowerCase();
    return (
      pos.includes("kepala seksi") ||
      pos.includes("kepala subbagian") ||
      pos.includes("kasubag")
    );
  });
  const hasPlhInfo = Boolean(letter.nama_plh || hasPejabatStruktural);
  const hasBedaHari =
    letter.template_type === "beda-hari" ||
    employees.some((e) => Boolean(e.tanggal_mulai && e.tanggal_selesai));

  return (
    <div className="flex flex-col h-full bg-[var(--ds-surface)] overflow-hidden select-text">
      {/* Top Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shrink-0">
        {/* Left: Navigation (Back & Prev/Next) */}
        <div className="flex items-center gap-1">
          {onBack && !isSplitView && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--ds-surface-muted)] rounded-xl text-[var(--ds-fg-muted)] text-xs font-semibold mr-1 transition-colors"
              title="Kembali ke daftar surat tugas"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 border-l border-[var(--ds-border-subtle)] pl-1">
            {onPrev && (
              <button
                disabled={!hasPrev}
                onClick={onPrev}
                className="p-1.5 hover:bg-[var(--ds-surface-muted)] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-[var(--ds-fg-muted)] transition-colors"
                title="Surat sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onNext && (
              <button
                disabled={!hasNext}
                onClick={onNext}
                className="p-1.5 hover:bg-[var(--ds-surface-muted)] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-[var(--ds-fg-muted)] transition-colors"
                title="Surat berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Workflow Actions & Destructive Action Separated */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Approve / Publish Button (Hanya tampil jika status Menunggu Persetujuan / pending) */}
          {onApprove && !isTrashView && letter.status === "pending" && (
            <button
              disabled={updatingStatus}
              onClick={() => onApprove(letter)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-50 text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold shadow-sm transition-colors"
              title={needsCompletion ? "Lengkapi Surat Tugas di Builder sebelum diterbitkan" : "Setujui & Terbitkan Surat Tugas"}
            >
              {needsCompletion ? <Pencil className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{needsCompletion ? "Lengkapi di Builder" : "Setujui & Terbitkan"}</span>
            </button>
          )}

          {/* Reject Button */}
          {onReject && !isTrashView && letter.status === "pending" && (
            <button
              disabled={updatingStatus}
              onClick={() => onReject(letter)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] disabled:opacity-50 rounded-xl text-xs font-bold transition-colors"
              title="Tolak Pengajuan Surat Tugas"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Tolak</span>
            </button>
          )}

          {/* Edit or Lihat in Builder */}
          {["diterbitkan", "approved", "completed", "published"].includes((letter.status || "").toLowerCase()) ? (
            <button
              onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] rounded-xl text-xs font-bold transition-colors"
              title="Buka Pratinjau Surat Tugas"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Surat</span>
            </button>
          ) : onEdit ? (
            <button
              onClick={() => onEdit(letter)}
              className="flex items-center gap-1.5 px-3 py-1.5 st-secondary rounded-xl text-xs font-bold transition-colors"
              title="Edit di Dokumen Builder"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Surat</span>
            </button>
          ) : null}

          {/* PLH Action */}
          {hasPlhInfo && onCreatePlh && (
            <button
              onClick={() => (existingPlh && onOpenExistingPlh ? onOpenExistingPlh(existingPlh) : onCreatePlh(letter))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] rounded-xl text-xs font-bold transition-colors"
              title={existingPlh ? "Buka Draf ST PLH" : "Buat Draf ST PLH"}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{existingPlh ? "Buka Draf PLH" : "Buat ST PLH"}</span>
            </button>
          )}

          {/* Separator before Delete Action */}
          {(onDelete || onRestore) && (
            <div className="h-4 w-px bg-[var(--ds-surface-muted)] mx-0.5" />
          )}

          {/* Delete / Restore Action (Destructive separated with red/rose accent) */}
          {isTrashView ? (
            onRestore && (
              <button
                onClick={() => onRestore(letter.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ds-status-success-bg)] hover:bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] rounded-xl text-xs font-bold transition-colors"
                title="Pulihkan dari sampah"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </button>
            )
          ) : (
            onDelete && (
              <button
                onClick={() => onDelete?.(letter.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-xl text-xs font-bold transition-colors"
                title="Pindahkan ke sampah"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pindahkan ke Sampah</span>
              </button>
            )
          )}
          {isTrashView && onForceDelete && (
            <button
              onClick={() => onForceDelete(letter.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Hapus permanen dari arsip"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Permanen</span>
            </button>
          )}
          {false && onDelete && ((
              <button
                onClick={() => onDelete?.(letter.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-xl text-xs font-bold transition-colors"
                title="Pindahkan ke sampah"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pindahkan ke Sampah</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Document Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[var(--ds-surface)]">
        {/* Title & Status Header Card */}
        <div className="bg-[var(--ds-surface)] p-6 rounded-2xl border border-[var(--ds-border-subtle)] shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusStyle(
                    letter.status
                  )}`}
                >
                  {getStatusLabel(letter.status)}
                </span>

                {letter.template_type === "bmn-pemeriksaan" && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]">
                    Template BMN
                  </span>
                )}

                {letter.template_type === "plh" && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                    Template PLH
                  </span>
                )}

                <span className="text-xs text-[var(--ds-fg-muted)] font-medium">
                  Dibuat {formatDateIndonesian(letter.created_at)}
                </span>
              </div>

              {/* H1 Main Title: Core Activity extracted from "dalam rangka" */}
              <h1 className="text-xl md:text-2xl font-black text-[var(--ds-fg)] tracking-tight leading-snug">
                {mainTitle}
              </h1>

              {/* Cleaned Context Text (without boilerplate "Membuat laporan..." or "Segala biaya...") */}
              {cleanedContext && (
                <div className="mt-3 p-3.5 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                  <span className="font-bold text-[var(--ds-fg-muted)] text-xs uppercase tracking-wider block mb-1">
                    Maksud Perjalanan Dinas:
                  </span>
                  {cleanedContext}
                </div>
              )}
            </div>
          </div>

          {/* Quick Meta Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--ds-border-subtle)] text-xs">
            <div className="flex items-center gap-2 text-[var(--ds-fg-muted)]">
              <FileText className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />
              <div>
                <p className="text-xs text-[var(--ds-fg-muted)] font-bold uppercase">Nomor Surat</p>
                <p className="font-mono font-bold truncate">{letter.nomor_surat || "Belum Terbit"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[var(--ds-fg-muted)]">
              <MapPin className="w-4 h-4 text-[var(--ds-status-success-fg)] shrink-0" />
              <div>
                <p className="text-xs text-[var(--ds-fg-muted)] font-bold uppercase">Tempat Tujuan</p>
                <p className="font-bold truncate">{tujuan || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[var(--ds-fg-muted)]">
              <Calendar className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />
              <div>
                <p className="text-xs text-[var(--ds-fg-muted)] font-bold uppercase">Tanggal Tugas</p>
                <p
                  className="font-bold truncate"
                  title={formatDateRangeIndonesian(letter.tanggal_mulai, letter.tanggal_selesai)}
                >
                  {formatDateRangeIndonesian(letter.tanggal_mulai, letter.tanggal_selesai)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[var(--ds-fg-muted)]">
              <Wallet className="w-4 h-4 text-[var(--ds-status-warning-fg)] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--ds-fg-muted)] font-bold uppercase">Sumber Dana</p>
                <p
                  className="font-bold truncate"
                  title={formatFormalSumberDana(letter.sumber_dana, letter.sumber_dana_other)}
                >
                  {formatFormalSumberDana(letter.sumber_dana, letter.sumber_dana_other)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Personnel Table */}
        <div className="bg-[var(--ds-surface)] p-6 rounded-2xl border border-[var(--ds-border-subtle)] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            <h3 className="text-sm font-bold text-[var(--ds-fg)] uppercase tracking-wider">
              Personel yang Ditugaskan ({employees.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] font-bold">
                  <th className="py-2 px-3 w-8">No</th>
                  <th className="py-2 px-3">Nama Pegawai</th>
                  <th className="py-2 px-3">NIP</th>
                  <th className="py-2 px-3">Jabatan / Satker</th>
                  {hasBedaHari && <th className="py-2 px-3">Jadwal Tugas</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {employees.map((emp, idx) => (
                  <tr key={emp.id || idx} className="hover:bg-[var(--ds-surface-muted)]">
                    <td className="py-2.5 px-3 font-mono text-[var(--ds-fg-muted)]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-[var(--ds-fg)]">
                      {emp.nama_lengkap}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--ds-fg-muted)]">{formatNIP(emp.nip)}</td>
                    <td className="py-2.5 px-3 text-[var(--ds-fg-muted)]">
                      {emp.jabatan || "-"} {emp.satuan_kerja ? `(${emp.satuan_kerja})` : ""}
                    </td>
                    {hasBedaHari && (
                      <td className="py-2.5 px-3 font-semibold text-[var(--ds-accent-fg)] whitespace-nowrap text-xs">
                        {emp.tanggal_mulai && emp.tanggal_selesai
                          ? formatDateRangeIndonesian(emp.tanggal_mulai, emp.tanggal_selesai)
                          : "-"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Keterangan (Tampil full-width jika ada PLH Kasubbag TU/Kasi agar leluasa dibaca) */}
        {hasPlhInfo && (
          <div className="p-6 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] flex items-center justify-center text-[var(--ds-status-warning-fg)] shrink-0">
                <StickyNote className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black uppercase tracking-widest text-[var(--ds-status-warning-fg)] block">
                  Catatan & Keterangan
                </span>
                <h4 className="text-sm font-bold text-[var(--ds-fg)] truncate mt-0.5">
                  Keterangan Surat Tugas
                </h4>
              </div>
            </div>

            {letter.keterangan && letter.keterangan.trim() ? (
              <div className="text-xs text-[var(--ds-fg-muted)] whitespace-pre-line leading-relaxed bg-[var(--ds-surface)] p-3.5 rounded-xl border border-[var(--ds-border-subtle)] font-medium">
                {letter.keterangan}
              </div>
            ) : (
              <div className="py-2.5 px-3 bg-[var(--ds-surface)] rounded-xl border border-dashed border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] text-xs italic">
                Tidak ada catatan atau keterangan tambahan
              </div>
            )}
          </div>
        )}

        {/* Bottom Section: 3 Sejajar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Card Pelaksana Harian (PLH) ATAU Card Keterangan jika tanpa PLH */}
          {hasPlhInfo ? (
            <div className="p-6 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center text-[var(--ds-accent-fg)] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--ds-accent-fg)] block">
                      Pelaksana Harian (PLH)
                    </span>
                    <h4 className="text-sm font-bold text-[var(--ds-fg)] truncate mt-0.5" title={letter.nama_plh || undefined}>
                      {letter.nama_plh ? letter.nama_plh : "Belum Ditentukan"}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                  {hasPejabatStruktural
                    ? "Kasubbag TU atau Kepala Seksi melaksanakan perjalanan dinas. Penunjukan PLH diperlukan untuk operasional harian."
                    : "Petugas yang ditunjuk sebagai pelaksana tugas harian selama dinas berlangsung."}
                </p>

                {letter.has_seksi_employee && (
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                      letter.tanda_setuju === "sudah"
                        ? "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]"
                        : "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        letter.tanda_setuju === "sudah" ? "bg-[var(--ds-status-success-bg)]" : "bg-[var(--ds-status-warning-bg)]"
                      }`}
                    />
                    <span className="truncate">
                      {letter.tanda_setuju === "sudah"
                        ? "Disetujui Kepala Seksi"
                        : "Seksi: Belum Ditandatangani"}
                    </span>
                  </div>
                )}
              </div>

              {onCreatePlh ? (
                <button
                  onClick={() => (existingPlh && onOpenExistingPlh ? onOpenExistingPlh(existingPlh) : onCreatePlh(letter))}
                  className="w-full py-3 rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{existingPlh ? "Buka Draf ST PLH" : "Buat ST PLH"}</span>
                </button>
              ) : (
                <div className="h-10" />
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] flex items-center justify-center text-[var(--ds-status-warning-fg)] shrink-0">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--ds-status-warning-fg)] block">
                      Catatan & Keterangan
                    </span>
                    <h4 className="text-sm font-bold text-[var(--ds-fg)] truncate mt-0.5">
                      Keterangan Surat Tugas
                    </h4>
                  </div>
                </div>

                {letter.keterangan && letter.keterangan.trim() ? (
                  <div className="text-xs text-[var(--ds-fg-muted)] whitespace-pre-line leading-relaxed bg-[var(--ds-surface)] p-3 rounded-xl border border-[var(--ds-border-subtle)] font-medium max-h-48 overflow-y-auto custom-scrollbar">
                    {letter.keterangan}
                  </div>
                ) : (
                  <div className="py-3 px-3 bg-[var(--ds-surface)] rounded-xl border border-dashed border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] text-xs italic">
                    Tidak ada catatan atau keterangan tambahan
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Card Dokumen Dasar Surat */}
          <div className="p-6 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-sm flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center text-[var(--ds-accent-fg)] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--ds-fg-muted)] block">
                    Dokumen Pendukung
                  </span>
                  <h4 className="text-sm font-bold text-[var(--ds-fg)] truncate mt-0.5">
                    Dokumen Dasar Surat
                  </h4>
                </div>
              </div>

              <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                {letter.file_surat_path
                  ? "PDF Dokumen Pendukung / Surat Permohonan Pengajuan"
                  : "Tidak ada file lampiran dokumen pendukung"}
              </p>
            </div>

            {letter.file_surat_path ? (
              <div className="grid grid-cols-2 gap-2">
                {onViewDoc && (
                  <button
                    onClick={(event) => onViewDoc(letter, event.currentTarget)}
                    className="st-secondary w-full py-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                    title="Lihat Pratinjau Dokumen Dasar"
                  >
                    <Eye className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                    <span>LIHAT DOKUMEN</span>
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={() => onDownload(letter)}
                    className="w-full py-2.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Unduh Berkas Dokumen Dasar"
                  >
                    <Download className="w-4 h-4" />
                    <span>UNDUH</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-3 bg-[var(--ds-surface)] rounded-xl border border-dashed border-[var(--ds-border-subtle)] text-center">
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">
                  Tidak ada lampiran dokumen
                </span>
              </div>
            )}
          </div>

          {/* 3. Group Action Buttons Panel (Edit / Lihat Surat, Tolak, Arsipkan) */}
          <div className="flex flex-col justify-between gap-4 p-6 rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] shadow-sm">
            {isTrashView ? (
              <>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--ds-fg-muted)] block">
                    Manajemen Arsip
                  </span>
                  <h4 className="text-sm font-bold text-[var(--ds-fg)]">
                    Tindakan Dokumen
                  </h4>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    Dokumen ini berada di arsip sampah. Anda dapat memulihkan atau menghapusnya secara permanen.
                  </p>
                </div>

                <div className="space-y-2 mt-auto">
                  {onRestore && (
                    <button
                      onClick={() => onRestore(letter.id)}
                      className="h-11 w-full rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-black text-xs tracking-widest uppercase shadow-md flex items-center justify-center gap-2 transition-colors"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>Pulihkan Surat</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete?.(letter.id)}
                      className="h-10 w-full rounded-xl border border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Permanen</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--ds-fg-muted)] block">
                    Aksi Surat Tugas
                  </span>
                  <h4 className="text-sm font-bold text-[var(--ds-fg)]">
                    Otorisasi & Pemrosesan
                  </h4>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    Kelola naskah surat dinas, persetujuan, penolakan, atau pengarsipan dokumen.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  {/* Primary Action Button: Otorisasi / Lihat / Edit */}
                  {letter.status === "pending" ? (
                    <button
                      onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
                      className="h-12 w-full rounded-xl st-primary shadow-md flex items-center justify-center gap-2 font-black text-xs tracking-wider uppercase transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Otorisasi ST</span>
                    </button>
                  ) : ["diterbitkan", "approved", "completed", "published"].includes((letter.status || "").toLowerCase()) ? (
                    <button
                      onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
                      className="h-12 w-full rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-black text-xs tracking-wider shadow-md flex items-center justify-center gap-2 uppercase transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>LIHAT SURAT TUGAS</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
                      className="h-12 w-full rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-black text-xs tracking-wider shadow-md flex items-center justify-center gap-2 uppercase transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>EDIT SURAT TUGAS</span>
                    </button>
                  )}

                  {/* Secondary Actions Grid: Tolak & Arsipkan */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onReject && onReject(letter)}
                      disabled={updatingStatus || ["rejected", "approved", "completed"].includes(letter.status)}
                      className="h-10 rounded-xl border border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] disabled:opacity-40 disabled:hover:bg-transparent font-black text-xs tracking-wider uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(letter.id)}
                      className="h-10 rounded-xl border border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] font-black text-xs tracking-wider uppercase flex items-center justify-center gap-1 transition-colors"
                      title="Pindahkan dokumen ke sampah"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Pindahkan ke Sampah</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


