"use client";

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

  const docData: SuratDinasData = {
    templateType: "surat_izin_cuti",
    nomor: nomorSurat,
    kotaTanggal: payload?.kotaTanggal || `Samarinda, ${item.tanggal_pengajuan || ""}`,
    jenisCuti: item.jenis_cuti,
    jumlahHari: item.jumlah_hari,
    terbilangHari: payload?.terbilangHari || `${item.jumlah_hari}`,
    tanggalMulai: payload?.tanggalMulai || item.tanggal_mulai,
    tanggalSelesai: payload?.tanggalSelesai || item.tanggal_selesai,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Toolbar */}
        <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileBadge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                Surat Izin Cuti Resmi (TTE)
                <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 whitespace-pre">
                  {nomorSurat}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pemohon: <span className="text-slate-200 font-semibold">{item.employee?.nama_lengkap}</span> • {item.jenis_cuti}
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
                className="h-8 px-2.5 text-xs font-semibold text-amber-300 border-amber-800/80 bg-amber-950/40 hover:bg-amber-900/60 rounded-xl gap-1.5"
                title="Generate Ulang / Ubah Nomor Surat Izin"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Generate Ulang</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handlePrintSuratDinas}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 shadow-sm"
              title="Cetak Naskah Dinas Resmi (PDF/Print)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Surat</span>
            </Button>

            {item.surat_keluar_id && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl gap-1"
                title="Buka di Modul Persuratan Tata Naskah Dinas"
              >
                <Link href={`/surat/keluar/dinas?template=surat_izin_cuti&id=${item.surat_keluar_id}`} target="_blank">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">Modul Persuratan</span>
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Document Viewer Body */}
        <div className="p-4 sm:p-8 bg-slate-200/70 dark:bg-slate-950 overflow-y-auto flex-1 flex justify-center">
          <div className="bg-white shadow-xl rounded-md my-auto">
            <SuratDinasDocument data={docData} />
          </div>
        </div>
      </div>
    </div>
  );
}
