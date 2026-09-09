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
} from "lucide-react";
import type { AssignmentLetter } from "../_lib/types";
import {
  getStatusStyle,
  getStatusLabel,
  getResolvedTempatTujuan,
  extractDalamRangka,
  cleanMaksudTujuan,
  formatFormalSumberDana,
} from "../_lib/status-helpers";
import { formatDateIndonesian } from "@/lib/letter-utils";

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
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
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
  onDelete,
  onRestore,
  onCreatePlh,
  existingPlh,
  onOpenExistingPlh,
  isTrashView,
  updatingStatus,
  isSplitView = false,
}: GmailReaderViewProps) {
  const router = useRouter();
  const employees = letter.employees || [];
  const tujuan = getResolvedTempatTujuan(letter);
  const mainTitle = extractDalamRangka(letter.maksud_tujuan);
  const cleanedContext = cleanMaksudTujuan(letter.maksud_tujuan);
  const isKepalaAssigned = employees.some(
    (e) =>
      e.jabatan?.toLowerCase().includes("kepala balai") ||
      e.nama_lengkap?.toLowerCase().includes("ari wibawanto")
  );
  const hasPejabatStruktural = employees.some((e) => {
    const pos = (e.jabatan || "").toLowerCase();
    const name = (e.nama_lengkap || "").toLowerCase();
    return (
      pos.includes("kepala seksi") ||
      pos.includes("kepala subbagian") ||
      pos.includes("kasubag") ||
      pos.includes("kepala balai") ||
      name.includes("ari wibawanto")
    );
  });
  const hasPlhInfo = Boolean(letter.nama_plh || hasPejabatStruktural || isKepalaAssigned);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden select-text">
      {/* Top Action Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 shrink-0">
        {/* Left: Navigation (Back & Prev/Next) */}
        <div className="flex items-center gap-1">
          {onBack && !isSplitView && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 rounded-xl text-slate-700 dark:text-zinc-200 text-xs font-semibold mr-1 transition-colors"
              title="Kembali ke daftar surat tugas"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-zinc-700 pl-1">
            {onPrev && (
              <button
                disabled={!hasPrev}
                onClick={onPrev}
                className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-600 dark:text-zinc-300 transition-colors"
                title="Surat sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onNext && (
              <button
                disabled={!hasNext}
                onClick={onNext}
                className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-600 dark:text-zinc-300 transition-colors"
                title="Surat berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Workflow Actions & Destructive Action Separated */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Approve / Publish Button (Hanya tampil jika sudah ada nomor surat) */}
          {onApprove && !isTrashView && letter.status !== "approved" && Boolean(letter.nomor_surat && letter.nomor_surat.trim() && letter.nomor_surat.toLowerCase() !== "belum terbit") && (
            <button
              disabled={updatingStatus}
              onClick={() => onApprove(letter)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              title="Setujui & Terbitkan Surat Tugas"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Terbitkan</span>
            </button>
          )}

          {/* Reject Button */}
          {onReject && !isTrashView && letter.status === "pending" && (
            <button
              disabled={updatingStatus}
              onClick={() => onReject(letter)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 disabled:opacity-50 rounded-xl text-xs font-bold transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors"
              title="Buka Pratinjau Surat Tugas"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Surat</span>
            </button>
          ) : onEdit ? (
            <button
              onClick={() => onEdit(letter)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors"
              title={existingPlh ? "Buka Draf ST PLH" : "Buat Draf ST PLH"}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{existingPlh ? "Buka Draf PLH" : "Buat ST PLH"}</span>
            </button>
          )}

          {/* Separator before Delete Action */}
          {(onDelete || onRestore) && (
            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />
          )}

          {/* Delete / Restore Action (Destructive separated with red/rose accent) */}
          {isTrashView ? (
            onRestore && (
              <button
                onClick={() => onRestore(letter.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors"
                title="Pulihkan dari sampah"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </button>
            )
          ) : (
            onDelete && (
              <button
                onClick={() => onDelete(letter.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors"
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
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-zinc-950/40">
        {/* Title & Status Header Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                    Template BMN
                  </span>
                )}

                {letter.template_type === "plh" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                    Template PLH
                  </span>
                )}

                <span className="text-xs text-slate-400 font-medium">
                  Dibuat {formatDateIndonesian(letter.created_at)}
                </span>
              </div>

              {/* H1 Main Title: Core Activity extracted from "dalam rangka" */}
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight leading-snug">
                {mainTitle}
              </h1>

              {/* Cleaned Context Text (without boilerplate "Membuat laporan..." or "Segala biaya...") */}
              {cleanedContext && (
                <div className="mt-3 p-3.5 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800/80 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  <span className="font-bold text-slate-400 dark:text-zinc-400 text-[10px] uppercase tracking-wider block mb-1">
                    Maksud Perjalanan Dinas:
                  </span>
                  {cleanedContext}
                </div>
              )}
            </div>
          </div>

          {/* Quick Meta Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Nomor Surat</p>
                <p className="font-mono font-bold truncate">{letter.nomor_surat || "Belum Terbit"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tempat Tujuan</p>
                <p className="font-bold truncate">{tujuan || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Tugas</p>
                <p className="font-bold truncate">
                  {letter.tanggal_mulai ? formatDateIndonesian(letter.tanggal_mulai) : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Sumber Dana</p>
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
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
              Personel yang Ditugaskan ({employees.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 font-bold">
                  <th className="py-2 px-3 w-8">No</th>
                  <th className="py-2 px-3">Nama Pegawai</th>
                  <th className="py-2 px-3">NIP</th>
                  <th className="py-2 px-3">Jabatan / Satker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {employees.map((emp, idx) => (
                  <tr key={emp.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-zinc-100">
                      {emp.nama_lengkap}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-400">{emp.nip}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                      {emp.jabatan || "-"} {emp.satuan_kerja ? `(${emp.satuan_kerja})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section: 3 Sejajar (PLH, Dokumen Dasar Surat, dan 1 Group Edit/Lihat/Tolak/Arsipkan) */}
        <div className={`grid grid-cols-1 gap-4 ${hasPlhInfo ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}>
          {/* 1. Card Pelaksana Harian (PLH) */}
          {hasPlhInfo && (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
                      Pelaksana Harian (PLH)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate mt-0.5" title={letter.nama_plh || undefined}>
                      {letter.nama_plh ? letter.nama_plh : "Belum Ditentukan"}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  {hasPejabatStruktural
                    ? "Pejabat struktural melaksanakan tugas dinas. Penunjukan PLH diperlukan untuk operasional harian."
                    : "Petugas yang ditunjuk sebagai pelaksana tugas harian selama dinas berlangsung."}
                </p>

                {letter.has_seksi_employee && (
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                      letter.tanda_setuju === "sudah"
                        ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                        : "bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        letter.tanda_setuju === "sudah" ? "bg-emerald-500" : "bg-amber-500"
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
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{existingPlh ? "Buka Draf ST PLH" : "Buat ST PLH"}</span>
                </button>
              ) : (
                <div className="h-10" />
              )}
            </div>
          )}

          {/* 2. Card Dokumen Dasar Surat */}
          <div
            className={`p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-4 ${
              !hasPlhInfo ? "lg:col-span-2" : ""
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                    Dokumen Pendukung
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate mt-0.5">
                    Dokumen Dasar Surat
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                {letter.file_surat_path
                  ? "PDF Dokumen Pendukung / Surat Permohonan Pengajuan"
                  : "Tidak ada file lampiran dokumen pendukung"}
              </p>
            </div>

            {letter.file_surat_path ? (
              onDownload && (
                <button
                  onClick={() => onDownload(letter)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>UNDUH PDF</span>
                </button>
              )
            ) : (
              <div className="py-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 text-center">
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                  Tidak ada lampiran dokumen
                </span>
              </div>
            )}
          </div>

          {/* 3. Group Action Buttons Panel (Edit / Lihat Surat, Tolak, Arsipkan) */}
          <div className="flex flex-col justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
            {isTrashView ? (
              <>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                    Manajemen Arsip
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Tindakan Dokumen
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Dokumen ini berada di arsip sampah. Anda dapat memulihkan atau menghapusnya secara permanen.
                  </p>
                </div>

                <div className="space-y-2 mt-auto">
                  {onRestore && (
                    <button
                      onClick={() => onRestore(letter.id)}
                      className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-widest uppercase shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>Pulihkan Surat</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(letter.id)}
                      className="h-10 w-full rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all"
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                    Aksi Surat Tugas
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Otorisasi & Pemrosesan
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Kelola naskah surat dinas, persetujuan, penolakan, atau pengarsipan dokumen.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  {/* Primary Action Button: Otorisasi / Lihat / Edit */}
                  {letter.status === "pending" ? (
                    <button
                      onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
                      className="h-12 w-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 font-black text-xs tracking-wider uppercase transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Otorisasi ST</span>
                    </button>
                  ) : ["diterbitkan", "approved", "completed", "published"].includes((letter.status || "").toLowerCase()) ? (
                    <button
                      onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
                      className="h-12 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-wider shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 uppercase transition-all active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                      <span>LIHAT SURAT TUGAS</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${letter.id}`)}
                      className="h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs tracking-wider shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 uppercase transition-all active:scale-95"
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
                      className="h-10 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-40 disabled:hover:bg-transparent font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(letter.id)}
                      className="h-10 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1 transition-all"
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


