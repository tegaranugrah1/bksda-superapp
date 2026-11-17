"use client";

import { KepegawaianDialog } from "../../_components/KepegawaianDialog";

import React from "react";
import Link from "next/link";
import { Printer, X, RefreshCw, ExternalLink, FileBadge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SuratDinasDocument,
  SuratDinasData,
  handlePrintSuratDinas,
  DEFAULT_KEPALA_BALAI,
} from "@/app/surat/_components/SuratDinasDocument";
import { LeaveRequestItem } from "./CutiModals";

interface DigitalSuratIzinModalProps {
  isOpen: boolean;
  item: LeaveRequestItem | null;
  onClose: () => void;
  onRegenerate?: (item: LeaveRequestItem) => void;
}

export function DigitalSuratIzinModal({
  isOpen,
  item,
  onClose,
  onRegenerate,
}: DigitalSuratIzinModalProps) {
  if (!isOpen || !item) return null;

  // Build or use existing document_payload
  const payload = item.surat_keluar?.document_payload;
  const nomorSurat = item.nomor_pengajuan || item.surat_keluar?.no_surat || "SI..../K.18/TU/PEG.11.01/B/...";

  // Resolve tahun cuti text for Cuti Tahunan (tahun berjalan + akumulasi N-1 / N-2)
  let resolvedTahunCutiText = payload?.tahunCutiText || null;
  if (!resolvedTahunCutiText && item.jenis_cuti?.toLowerCase().includes("tahunan")) {
    const yearMatch = String(item.tanggal_mulai || payload?.tanggalMulai || item.tanggal_pengajuan || "").match(/(?:19|20)\d{2}/);
    const curYear = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();
    const s1 = (item.sisa_n1 || 0) > 0;
    const s2 = (item.sisa_n2 || 0) > 0;
    const years: string[] = [];
    if (s2) years.push(`tahun ${curYear - 2}`);
    if (s1) years.push(`tahun ${curYear - 1}`);
    years.push(`tahun ${curYear}`);
    resolvedTahunCutiText =
      years.length === 1
        ? `untuk ${years[0]}`
        : years.length === 2
        ? `untuk ${years[0]} dan ${years[1]}`
        : `untuk ${years.slice(0, -1).join(", ")} dan ${years[years.length - 1]}`;
  }

  const docData: SuratDinasData = {
    templateType: "surat_izin_cuti",
    nomor: nomorSurat,
    kotaTanggal: payload?.kotaTanggal || `Samarinda, ${item.tanggal_pengajuan || ""}`,
    jenisCuti: item.jenis_cuti,
    jumlahHari: item.jumlah_hari,
    terbilangHari: payload?.terbilangHari || `${item.jumlah_hari}`,
    tanggalMulai: payload?.tanggalMulai || item.tanggal_mulai,
    tanggalSelesai: payload?.tanggalSelesai || item.tanggal_selesai,
    tahunCutiText: resolvedTahunCutiText,
    pegawai: {
      nama: item.employee?.nama_lengkap || "-",
      nip: item.employee?.nip || "-",
      pangkatGol: payload?.pegawai?.pangkatGol || (item.employee as any)?.pangkat_golongan || "-",
      jabatan: item.employee?.jabatan || "-",
      satuanKerja: "Balai Konservasi Sumber Daya Alam Kalimantan Timur",
    },
    paragraf: [],
    jabatanPenandatangan: payload?.jabatanPenandatangan || DEFAULT_KEPALA_BALAI.jabatan,
    namaPenandatangan: payload?.namaPenandatangan || DEFAULT_KEPALA_BALAI.nama,
    nipPenandatangan: payload?.nipPenandatangan || DEFAULT_KEPALA_BALAI.nip,
    tembusan: payload?.tembusan || [],
  };

  return (
    <KepegawaianDialog title="Pratinjau surat izin cuti" onClose={onClose} busy={false} className="sm:max-w-4xl">
      <div className="bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl w-full max-w-4xl shadow-lg overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header Toolbar */}
        <div className="p-4 bg-[var(--ds-surface)] text-[var(--ds-fg)] flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-zinc-800 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] flex items-center justify-center">
              <FileBadge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--ds-fg)] flex flex-wrap items-center gap-2">
                Surat Izin Cuti Resmi (TTE)
                <span className="font-mono text-xs text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)] px-2 py-1 rounded-full border border-[var(--ds-status-success-border)] whitespace-pre">
                  {nomorSurat}
                </span>
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Pemohon: <span className="text-[var(--ds-fg-muted)] font-semibold">{item.employee?.nama_lengkap}</span> • {item.jenis_cuti}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRegenerate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onRegenerate(item);
                }}
                className="h-8 px-3 text-xs font-semibold text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] rounded-lg gap-2"
                title="Generate Ulang / Ubah Nomor Surat Izin"
              >
                <RefreshCw className="w-4 h-4 text-[var(--ds-status-warning-fg)]" />
                <span className="hidden sm:inline">Generate Ulang</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handlePrintSuratDinas}
              className="h-8 px-3 text-xs font-semibold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg gap-2 shadow-xs"
              title="Cetak Naskah Dinas Resmi (PDF/Print)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Surat</span>
            </Button>

            {item.surat_keluar_id && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg gap-1"
                title="Buka di Modul Persuratan Tata Naskah Dinas"
              >
                <Link href={`/surat/keluar/dinas?template=surat_izin_cuti&id=${item.surat_keluar_id}`} target="_blank">
                  <ExternalLink className="w-4 h-4 text-[var(--ds-fg-muted)]" />
                  <span className="hidden md:inline">Modul Persuratan</span>
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg" aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Document Viewer Body */}
        <div role="region" aria-label="Dokumen surat izin cuti, gulir horizontal untuk melihat seluruh halaman" tabIndex={0} className="p-4 sm:p-8 bg-[var(--ds-surface-muted)] overflow-auto min-h-0 flex-1 focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)]">
          <div className="flex w-max min-w-full justify-center">
          <div className="shrink-0 bg-white text-black shadow-lg rounded-lg">
            <SuratDinasDocument data={docData} />
          </div>
          </div>
        </div>
      </div>
    </KepegawaianDialog>
  );
}
