"use client";

import { KepegawaianDialog } from "../../_components/KepegawaianDialog";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileText,
  FileUp,
  Printer,
  X,
  RotateCcw,
  RefreshCw,
  FileBadge,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { FormulirCutiPrint } from "@/app/portal/_components/FormulirCutiPrint";
import { formatDateIndonesian, formatNipLabel, isPppk } from "@/lib/letter-utils";

export { ScanViewerModal } from "./ScanViewerModal";
export { CatatSuratIzinModal } from "./CatatSuratIzinModal";
export { DigitalSuratIzinModal } from "./DigitalSuratIzinModal";

export interface LeaveRequestItem {
  id: number;
  surat_keluar_id?: number | null;
  surat_keluar?: any | null;
  nomor_pengajuan: string | null;
  tanggal_pengajuan: string;
  jenis_cuti: string;
  alasan_cuti: string;
  jumlah_hari: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alamat_menjalankan_cuti: string;
  telepon: string;
  masa_kerja?: string;
  status?: string;
  sisa_n2: number;
  sisa_n1: number;
  sisa_n0: number;
  status_pertimbangan_atasan: string;
  status_pertimbangan_pejabat: string;
  kasubbag_nama: string;
  kasubbag_nip: string;
  kepala_balai_nama: string;
  kepala_balai_nip: string;
  catatan_atasan: string | null;
  scan_surat_path?: string | null;
  scan_surat_nama?: string | null;
  scan_formulir_path?: string | null;
  scan_formulir_nama?: string | null;
  scan_surat_izin_path?: string | null;
  scan_surat_izin_nama?: string | null;
  scan_surat_uploaded_at?: string | null;
  scan_surat_uploaded_by?: number | null;
  employee: {
    id: number;
    nip: string;
    nama_lengkap: string;
    jabatan: string;
    satuan_kerja: string;
  };
}

export interface EditFormState {
  nomor_pengajuan: string;
  jenis_cuti: string;
  alasan_cuti: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alamat_menjalankan_cuti: string;
  telepon: string;
  masa_kerja: string;
}

interface EditLeaveModalProps {
  item: LeaveRequestItem | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function EditLeaveModal({
  item,
  editForm,
  setEditForm,
  isPending,
  onClose,
  onSubmit,
}: EditLeaveModalProps) {
  if (!item) return null;

  return (
    <KepegawaianDialog title="Edit pengajuan cuti" onClose={onClose} busy={isPending} className="sm:max-w-lg">
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--ds-fg)]">
              Edit Pengajuan Cuti
            </h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">Pemohon: {item.employee?.nama_lengkap}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" aria-label="Tutup">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="font-bold text-[var(--ds-fg)] block mb-1">
              Nomor Surat Penetapan Resmi (SI)
            </label>
            <input
              type="text"
              value={editForm.nomor_pengajuan}
              onChange={(e) => setEditForm({ ...editForm, nomor_pengajuan: e.target.value })}
              placeholder="Contoh: SI.12/K.18/TU/KSA/03/2026 (kosongkan jika belum diterbitkan)"
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-mono text-xs focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Contoh: SI.12/K.18/TU/KSA/03/2026 (kosongkan jika belum diterbitkan)"
            />
            <span className="text-xs text-[var(--ds-fg-muted)] mt-0.5 block">
              Nomor surat penetapan diisi oleh admin kepegawaian setelah surat izin terbit.
            </span>
          </div>

          <div>
            <label className="font-bold text-[var(--ds-fg)] block mb-1">Jenis Cuti</label>
            <select
              value={editForm.jenis_cuti}
              onChange={(e) => setEditForm({ ...editForm, jenis_cuti: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-semibold focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Jenis Cuti"
            >
              <option value="Cuti Tahunan">Cuti Tahunan</option>
              <option value="Cuti Besar">Cuti Besar</option>
              <option value="Cuti Sakit">Cuti Sakit</option>
              <option value="Cuti Melahirkan">Cuti Melahirkan</option>
              <option value="Cuti Karena Alasan Penting">Cuti Karena Alasan Penting</option>
              <option value="Cuti di Luar Tanggungan Negara">Cuti di Luar Tanggungan Negara</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">Mulai Tanggal</label>
              <input
                type="date"
                value={editForm.tanggal_mulai}
                onChange={(e) => setEditForm({ ...editForm, tanggal_mulai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-semibold focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]"
                required
              />
            </div>
            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={editForm.tanggal_selesai}
                onChange={(e) => setEditForm({ ...editForm, tanggal_selesai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-semibold focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[var(--ds-fg)] block mb-1">Alasan Cuti</label>
            <textarea
              value={editForm.alasan_cuti}
              onChange={(e) => setEditForm({ ...editForm, alasan_cuti: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-medium focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[var(--ds-fg)] block mb-1">Alamat Selama Cuti</label>
            <textarea
              value={editForm.alamat_menjalankan_cuti}
              onChange={(e) => setEditForm({ ...editForm, alamat_menjalankan_cuti: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-medium focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={editForm.telepon}
                onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-semibold focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]"
              />
            </div>
            <div>
              <label className="font-bold text-[var(--ds-fg)] block mb-1">Masa Kerja (Kustom)</label>
              <input
                type="text"
                value={editForm.masa_kerja}
                onChange={(e) => setEditForm({ ...editForm, masa_kerja: e.target.value })}
                placeholder="Contoh: 2 Tahun 0 Bulan"
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] font-semibold focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Contoh: 2 Tahun 0 Bulan"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold"
            >
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </KepegawaianDialog>
  );
}

interface DeleteLeaveModalProps {
  item: LeaveRequestItem | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteLeaveModal({
  item,
  isPending,
  onClose,
  onConfirm,
}: DeleteLeaveModalProps) {
  if (!item) return null;

  return (
    <KepegawaianDialog title="Konfirmasi pengajuan cuti" onClose={onClose} busy={isPending} className="sm:max-w-md">
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--ds-fg)]">
            Konfirmasi Hapus Pengajuan Cuti
          </h3>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            Apakah Anda yakin ingin menghapus pengajuan cuti milik{" "}
            <span className="font-bold text-[var(--ds-fg)]">
              {item.employee?.nama_lengkap}
            </span>
            ? Pengajuan di portal pegawai juga akan otomatis terhapus.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
            className="bg-[var(--ds-danger-solid)] hover:bg-[var(--ds-danger-solid)] text-[var(--ds-accent-on-solid)] font-bold"
          >
            {isPending ? "Menghapus..." : "Ya, Hapus Pengajuan"}
          </Button>
        </div>
      </div>
    </KepegawaianDialog>
  );
}

interface PrintLeaveModalProps {
  item: LeaveRequestItem | null;
  onClose: () => void;
}

export function PrintLeaveModal({ item, onClose }: PrintLeaveModalProps) {
  if (!item) return null;

  return (
    <KepegawaianDialog title="Pratinjau formulir cuti" onClose={onClose} busy={false} className="sm:max-w-6xl">
      <div className="bg-[var(--ds-surface)] rounded-2xl max-w-4xl w-full mx-auto shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-[var(--ds-surface)] text-[var(--ds-fg)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[var(--ds-accent-fg)]" />
            <h3 className="text-sm font-bold">Verifikasi & Preview Formulir Cuti Resmi</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] font-bold gap-1 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Formulir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Tutup pratinjau formulir cuti"
              onClick={onClose}
              className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div role="region" aria-label="Dokumen formulir cuti, gulir horizontal untuk melihat seluruh halaman" tabIndex={0} className="p-6 bg-[var(--ds-surface-muted)] overflow-auto max-h-[85vh] focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)]">
          <div className="flex w-max min-w-full justify-center">
          <div className="w-[210mm] shrink-0 bg-white text-black">
          <FormulirCutiPrint data={item} />
          </div>
          </div>
        </div>
      </div>
    </KepegawaianDialog>
  );
}

interface ApproveLeaveModalProps {
  item: LeaveRequestItem | null;
  mode?: "approve" | "regenerate";
  isPending: boolean;
  onClose: () => void;
  onApprove: (
    nomorSurat: string,
    fileFormulir: File | null,
    fileSuratIzin: File | null,
    catatan: string,
    tanggalSurat: string
  ) => void;
}

function assembleNomorSuratIzin(
  noUrut: string,
  unit: string,
  klas: string,
  bulanTahun: string
): string {
  const cleanNomor = (noUrut || "").trim().replace(/^SI\.?\s*/i, "");
  // Jika nomor urut diisi: SI.619 (tanpa spasi)
  // Jika nomor urut dikosongkan/dihapus: SI.      (6 spasi sebagai tempat nomor fisik)
  const siPart = cleanNomor ? `SI.${cleanNomor}` : "SI.      ";

  let unitPart = (unit || "").trim();
  if (unitPart && !unitPart.startsWith("/")) unitPart = "/" + unitPart;
  if (unitPart && !unitPart.endsWith("/")) unitPart = unitPart + "/";
  if (!unitPart) unitPart = "/K.18/TU/";

  const klasPart = (klas || "").trim().replace(/^\/+|\/+$/g, "") || "PEG.11.01";

  let btPart = (bulanTahun || "").trim();
  if (btPart && !btPart.startsWith("/")) btPart = "/" + btPart;
  if (!btPart) {
    const d = new Date();
    btPart = `/B/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  return `${siPart}${unitPart}${klasPart}${btPart}`;
}

function parseNomorSuratIzin(fullNomor: string) {
  const d = new Date();
  const currentMonth = String(d.getMonth() + 1).padStart(2, "0");
  const currentYear = String(d.getFullYear());
  const fallback = {
    nomorUrut: "1",
    kodeUnit: "/K.18/TU/",
    klasifikasi: "PEG.11.01",
    bulanTahun: `/B/${currentMonth}/${currentYear}`,
  };

  if (!fullNomor) return fallback;

  // Mendukung nomor dengan angka (SI.619) maupun nomor kosong berpola spasi (SI.      )
  const regex = /^SI\.?\s*(\d*)\s*(\/[^\/]+\/[^\/]+\/)\s*([A-Za-z0-9\.]+)\s*(\/B\/[^\/]+\/[^\/]+)/i;
  const match = fullNomor.match(regex);
  if (match) {
    return {
      nomorUrut: match[1].trim(),
      kodeUnit: match[2].trim(),
      klasifikasi: match[3].trim(),
      bulanTahun: match[4].trim(),
    };
  }

  const looseRegex = /^SI\.?\s*([^\/\s]+)?\s*(\/[^\/]+\/[^\/]+\/)?\s*([A-Za-z0-9\.]+)?\s*(\/B\/.+)?/i;
  const looseMatch = fullNomor.match(looseRegex);
  if (looseMatch) {
    return {
      nomorUrut: (looseMatch[1] || "").trim(),
      kodeUnit: (looseMatch[2] || fallback.kodeUnit).trim(),
      klasifikasi: (looseMatch[3] || fallback.klasifikasi).trim(),
      bulanTahun: (looseMatch[4] || fallback.bulanTahun).trim(),
    };
  }

  return fallback;
}

export function ApproveLeaveModal({
  item,
  mode = "approve",
  isPending,
  onClose,
  onApprove,
}: ApproveLeaveModalProps) {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentYear = String(now.getFullYear());

  const [formNomorUrut, setFormNomorUrut] = useState("");
  const [formKodeUnit, setFormKodeUnit] = useState("/K.18/TU/");
  const [formKlasifikasi, setFormKlasifikasi] = useState("PEG.11.01");
  const [formBulanTahun, setFormBulanTahun] = useState(`/B/${currentMonth}/${currentYear}`);

  const [defaultComponents, setDefaultComponents] = useState({
    nomorUrut: "1",
    kodeUnit: "/K.18/TU/",
    klasifikasi: "PEG.11.01",
    bulanTahun: `/B/${currentMonth}/${currentYear}`,
  });

  const [tanggalSurat, setTanggalSurat] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showFileUploads, setShowFileUploads] = useState(false);
  const [fileFormulir, setFileFormulir] = useState<File | null>(null);
  const [fileSuratIzin, setFileSuratIzin] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (!item) return;

    const initial = parseNomorSuratIzin(item.nomor_pengajuan || "");
    setFormNomorUrut(initial.nomorUrut);
    setFormKodeUnit(initial.kodeUnit);
    setFormKlasifikasi(initial.klasifikasi);
    setFormBulanTahun(initial.bulanTahun);
    setDefaultComponents(initial);

    const todayIso = new Date().toISOString().split("T")[0];
    setTanggalSurat(todayIso);

    // Hitung default sisa cuti jika catatan kosong
    const totalSisa = (item.sisa_n0 || 0) + (item.sisa_n1 || 0) + (item.sisa_n2 || 0);
    const isTahunan = (item.jenis_cuti || "").toLowerCase().includes("tahunan");
    const isAlreadyApproved = (item.status || "").toUpperCase() === "DISETUJUI";
    const sisaAwal = isTahunan && !isAlreadyApproved
      ? Math.max(0, totalSisa - (item.jumlah_hari || 0))
      : totalSisa;
    const initialDefaultCatatan = `Sisa Cuti = ${sisaAwal} Hari`;

    setCatatan(item.catatan_atasan || initialDefaultCatatan);
    setFileFormulir(null);
    setFileSuratIzin(null);
    setShowFileUploads(false);

    let active = true;
    setIsLoadingPreview(true);

    api
      .get(`/kepegawaian/leave-requests/${item.id}/preview-surat-izin`)
      .then((res) => {
        if (!active) return;
        const comps = res.data?.components;
        const defComps = res.data?.default_components || comps;
        if (comps) {
          setFormNomorUrut(comps.nomor_urut || initial.nomorUrut);
          setFormKodeUnit(comps.kode_unit || initial.kodeUnit);
          setFormKlasifikasi(comps.klasifikasi || initial.klasifikasi);
          setFormBulanTahun(comps.bulan_tahun || initial.bulanTahun);
        }
        if (defComps) {
          setDefaultComponents({
            nomorUrut: defComps.nomor_urut || "1",
            kodeUnit: defComps.kode_unit || "/K.18/TU/",
            klasifikasi: defComps.klasifikasi || "PEG.11.01",
            bulanTahun: defComps.bulan_tahun || `/B/${currentMonth}/${currentYear}`,
          });
        }
        if (res.data?.suggested_tanggal_surat) {
          setTanggalSurat(res.data.suggested_tanggal_surat);
        }
        if (res.data?.default_catatan) {
          setCatatan((prev) => {
            if (!prev || prev.startsWith("Sisa Cuti =")) {
              return item.catatan_atasan || res.data.default_catatan;
            }
            return prev;
          });
        }
      })
      .catch(() => {
        // Fallback already populated
      })
      .finally(() => {
        if (active) setIsLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [item, currentMonth, currentYear]);

  const handleDateChange = (newDateStr: string) => {
    setTanggalSurat(newDateStr);
    if (newDateStr) {
      try {
        const d = new Date(newDateStr);
        if (!isNaN(d.getTime())) {
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const y = String(d.getFullYear());
          setFormBulanTahun(`/B/${m}/${y}`);
        }
      } catch {}
    }
  };

  const assembledNomor = useMemo(() => {
    return assembleNomorSuratIzin(formNomorUrut, formKodeUnit, formKlasifikasi, formBulanTahun);
  }, [formNomorUrut, formKodeUnit, formKlasifikasi, formBulanTahun]);

  const isNomorModified =
    formNomorUrut !== defaultComponents.nomorUrut ||
    formKodeUnit !== defaultComponents.kodeUnit ||
    formKlasifikasi !== defaultComponents.klasifikasi ||
    formBulanTahun !== defaultComponents.bulanTahun;

  const handleResetNomor = () => {
    setFormNomorUrut(defaultComponents.nomorUrut);
    setFormKodeUnit(defaultComponents.kodeUnit);
    setFormKlasifikasi(defaultComponents.klasifikasi);
    setFormBulanTahun(defaultComponents.bulanTahun);
  };

  const defaultCatatanText = useMemo(() => {
    if (!item) return "Sisa Cuti = 12 Hari";
    const total = (item.sisa_n0 || 0) + (item.sisa_n1 || 0) + (item.sisa_n2 || 0);
    const isTahunan = (item.jenis_cuti || "").toLowerCase().includes("tahunan");
    const isAlreadyApproved = (item.status || "").toUpperCase() === "DISETUJUI";
    const sisa = isTahunan && !isAlreadyApproved
      ? Math.max(0, total - (item.jumlah_hari || 0))
      : total;
    return `Sisa Cuti = ${sisa} Hari`;
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCatatan = catatan.trim() || defaultCatatanText;
    onApprove(assembledNomor, fileFormulir, fileSuratIzin, finalCatatan, tanggalSurat);
  };

  const isRegenerate = mode === "regenerate" || !!item.surat_keluar_id;

  return (
    <KepegawaianDialog title="Persetujuan cuti" onClose={onClose} busy={isPending} className="sm:max-w-3xl">
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] flex items-center justify-center">
              {isRegenerate ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                {isRegenerate ? "Terbitkan / Generate Ulang Surat Izin" : "Persetujuan & Generate Surat Izin Cuti"}
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Pemohon: <span className="font-semibold text-[var(--ds-fg)]">{item.employee?.nama_lengkap}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-xl" aria-label="Tutup">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Live Naskah Ringkas / Document Preview Card */}
        <div className="   border border-[var(--ds-status-success-border)] rounded-xl p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--ds-status-success-fg)] flex items-center gap-1.5">
              <FileBadge className="w-3.5 h-3.5" />
              SURAT IZIN CUTI {(item.jenis_cuti || "TAHUNAN").toUpperCase().replace(/^CUTI\s+/i, "")}
            </span>
            <span className="text-xs bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] px-2 py-0.5 rounded-full font-semibold">
              TTE Kepala Balai
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--ds-status-success-border)] text-xs">
            <div>
              <span className="text-[var(--ds-fg-muted)] block text-xs">
                {isPppk(item.employee) ? "PPPK Pemohon" : "PNS Pemohon"}
              </span>
              <span className="font-semibold text-[var(--ds-fg)] truncate block">
                {item.employee?.nama_lengkap}
              </span>
              <span className="text-xs font-mono text-[var(--ds-fg-muted)]">{formatNipLabel(item.employee, true)} {item.employee?.nip}</span>
            </div>
            <div>
              <span className="text-[var(--ds-fg-muted)] block text-xs">Durasi & Pelaksanaan</span>
              <span className="font-bold text-[var(--ds-status-success-fg)] block">
                {item.jumlah_hari} Hari Kerja
              </span>
              <span className="text-xs text-[var(--ds-fg-muted)]">{item.tanggal_mulai} s.d {item.tanggal_selesai}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Pilihan Tanggal Penetapan Surat Izin */}
          <div className="space-y-1.5 bg-[var(--ds-surface)] p-2.5 rounded-xl border border-[var(--ds-border-subtle)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--ds-fg)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--ds-status-success-fg)]" />
                Tanggal Penetapan Surat Izin
              </label>
              <span className="text-xs text-[var(--ds-status-success-fg)] font-semibold">
                {tanggalSurat ? formatDateIndonesian(tanggalSurat) : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--ds-status-success-border)] outline-none text-[var(--ds-fg)]"
                required
              />
              <button
                type="button"
                onClick={() => handleDateChange(new Date().toISOString().split("T")[0])}
                className="px-2.5 py-1.5 text-xs font-semibold text-[var(--ds-status-success-fg)] bg-[var(--ds-status-success-bg)] hover:bg-[var(--ds-status-success-bg)] rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                title="Gunakan tanggal hari ini"
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* Segmented Form Nomor Surat Penetapan Resmi (SI) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--ds-fg)] flex items-center gap-1.5 text-xs">
                Nomor Surat Penetapan Resmi (SI)
                {isLoadingPreview && <Loader2 className="w-3 h-3 animate-spin text-[var(--ds-status-success-fg)]" />}
              </label>
              {isNomorModified && (
                <button
                  type="button"
                  onClick={handleResetNomor}
                  className="text-xs text-[var(--ds-status-success-fg)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  title="Kembalikan semua form ke nomor urut otomatis yang disarankan sistem"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset ke No. Otomatis
                </button>
              )}
            </div>

            {/* 4 Form Inputs: SI.{nomor}, /K.18/TU/, {klasifikasi}, /B/{bulan}/{tahun} */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--ds-surface)] p-2.5 rounded-xl border border-[var(--ds-border-subtle)]">
              {/* Form 1: SI.{nomor} */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)] block truncate" title="SI.{nomor}">
                  SI.&#123;nomor&#125;
                </label>
                <div className="flex items-center">
                  <span className="px-1.5 py-1.5 bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] font-mono font-bold text-xs rounded-l-lg border border-r-0 border-[var(--ds-border-subtle)] select-none">
                    SI.
                  </span>
                  <input
                    type="text"
                    value={formNomorUrut}
                    onChange={(e) => setFormNomorUrut(e.target.value.replace(/^SI\.?\s*/i, ""))}
                    placeholder="93"
                    className="w-full px-1.5 py-1.5 font-mono text-xs font-bold bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-r-lg focus:ring-2 focus:ring-[var(--ds-status-success-border)] outline-none text-[var(--ds-fg)] text-center" aria-label="SI.&#123;nomor&#125;"
                  />
                </div>
              </div>

              {/* Form 2: /K.18/TU/ */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)] block truncate" title="/K.18/TU/">
                  /K.18/TU/
                </label>
                <input
                  type="text"
                  value={formKodeUnit}
                  onChange={(e) => setFormKodeUnit(e.target.value)}
                  placeholder="/K.18/TU/"
                  className="w-full px-2 py-1.5 font-mono text-xs font-semibold bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--ds-status-success-border)] outline-none text-[var(--ds-fg)] text-center"
                  required aria-label="/K.18/TU/"
                />
              </div>

              {/* Form 3: {klasifikasi} */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)] block truncate" title="{klasifikasi}">
                  &#123;klasifikasi&#125;
                </label>
                <input
                  type="text"
                  value={formKlasifikasi}
                  onChange={(e) => setFormKlasifikasi(e.target.value)}
                  placeholder="PEG.11.01"
                  className="w-full px-2 py-1.5 font-mono text-xs font-semibold bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--ds-status-success-border)] outline-none text-[var(--ds-fg)] text-center"
                  required aria-label="PEG.11.01"
                />
              </div>

              {/* Form 4: /B/{bulan}/{tahun} */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ds-fg-muted)] block truncate" title="/B/{bulan}/{tahun}">
                  /B/&#123;bln&#125;/&#123;thn&#125;
                </label>
                <input
                  type="text"
                  value={formBulanTahun}
                  onChange={(e) => setFormBulanTahun(e.target.value)}
                  placeholder={`/B/${currentMonth}/${currentYear}`}
                  className="w-full px-2 py-1.5 font-mono text-xs font-semibold bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--ds-status-success-border)] outline-none text-[var(--ds-fg)] text-center"
                  required
                />
              </div>
            </div>

            {/* Live Result Preview Banner */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] text-xs">
              <span className="text-[var(--ds-status-success-fg)] font-medium">
                Nomor Surat Terbentuk:
              </span>
              <span className="font-mono font-bold text-[var(--ds-status-success-fg)] whitespace-pre">
                {assembledNomor}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[var(--ds-fg)] block">
                Catatan Persetujuan (Opsional)
              </label>
              <button
                type="button"
                onClick={() => setCatatan(defaultCatatanText)}
                className="text-xs text-[var(--ds-status-success-fg)] hover:underline cursor-pointer font-medium"
                title="Gunakan format default sisa cuti"
              >
                Gunakan: &quot;{defaultCatatanText}&quot;
              </button>
            </div>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={`Contoh: ${defaultCatatanText}`}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-xs focus:ring-2 focus:ring-[var(--ds-status-success-border)] outline-none"
            />
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              *Jika tidak diisi, otomatis terisi: <span className="font-semibold text-[var(--ds-fg-muted)]">{defaultCatatanText}</span>
            </p>
          </div>

          {/* Collapsible Manual Scan Files (Optional) */}
          <div className="border border-[var(--ds-border-subtle)] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFileUploads(!showFileUploads)}
              className="w-full px-3 py-2 bg-[var(--ds-surface)] flex items-center justify-between text-xs font-semibold text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <FileUp className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />
                Lampirkan Berkas Scan Manual / Fisik (Opsional)
              </span>
              {showFileUploads ? <ChevronUp className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" />}
            </button>

            {showFileUploads && (
              <div className="p-3 space-y-3 bg-[var(--ds-surface)] border-t border-[var(--ds-border-subtle)]">
                {/* Slot 1: Scan Formulir Cuti TTD Manual */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ds-fg)] flex items-center gap-1 text-xs">
                    <FileText className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                    1. Scan Formulir Cuti Basah (Cap Balai)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileFormulir(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[var(--ds-fg-muted)] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--ds-accent-soft)] file:text-[var(--ds-accent-fg)] hover:file:bg-[var(--ds-accent-soft)] cursor-pointer"
                  />
                </div>

                {/* Slot 2: Scan Surat Izin Cuti Fisik */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ds-fg)] flex items-center gap-1 text-xs">
                    <FileCheck className="w-3 h-3 text-[var(--ds-status-success-fg)]" />
                    2. Scan Surat Izin Bertandatangan Basah (Jika Ada)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileSuratIzin(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[var(--ds-fg-muted)] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--ds-status-success-bg)] file:text-[var(--ds-status-success-fg)] hover:file:bg-[var(--ds-status-success-bg)] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || isLoadingPreview}
              className="bg-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-fg)] text-[var(--ds-accent-on-solid)] font-bold rounded-xl shadow-xs gap-1.5 px-4 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : isRegenerate ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Terbitkan Ulang Surat Izin</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terbitkan Surat Izin & Setujui</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </KepegawaianDialog>
  );
}

interface UploadScanModalProps {
  item: {
    id: number;
    scan_surat_path?: string | null;
    scan_surat_nama?: string | null;
    scan_formulir_path?: string | null;
    scan_formulir_nama?: string | null;
    scan_surat_izin_path?: string | null;
    scan_surat_izin_nama?: string | null;
    employee?: {
      nama_lengkap?: string;
    };
  } | null;
  isPending: boolean;
  onClose: () => void;
  onUpload: (files: { fileFormulir: File | null; fileSuratIzin: File | null }) => void;
}

export function UploadScanModal({
  item,
  isPending,
  onClose,
  onUpload,
}: UploadScanModalProps) {
  const [fileFormulir, setFileFormulir] = useState<File | null>(null);
  const [fileSuratIzin, setFileSuratIzin] = useState<File | null>(null);

  useEffect(() => {
    setFileFormulir(null);
    setFileSuratIzin(null);
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileFormulir && !fileSuratIzin) {
      alert("Silakan pilih minimal salah satu berkas untuk diunggah.");
      return;
    }
    onUpload({ fileFormulir, fileSuratIzin });
  };

  const currentSuratIzin = item.scan_surat_izin_nama || item.scan_surat_nama;

  return (
    <KepegawaianDialog title="Unggah berkas cuti" onClose={onClose} busy={isPending} className="sm:max-w-lg">
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                Unggah / Kelola Berkas Cuti
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Pemohon: <span className="font-semibold text-[var(--ds-fg)]">{item.employee?.nama_lengkap}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-xl" aria-label="Tutup">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Slot 1: Scan Formulir */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--ds-fg)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                1. Scan Surat Pengantar dan Formulir Cuti (TTD & Cap)
              </label>
              {item.scan_formulir_nama ? (
                <span className="text-xs text-[var(--ds-status-success-fg)] font-semibold bg-[var(--ds-status-success-bg)] px-2 py-0.5 rounded-full">
                  Sudah Terunggah
                </span>
              ) : (
                <span className="text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded-full">
                  Belum ada
                </span>
              )}
            </div>
            {item.scan_formulir_nama && (
              <p className="text-xs text-[var(--ds-fg-muted)] font-mono truncate">
                Berkas aktif: {item.scan_formulir_nama}
              </p>
            )}
            <div className="border border-dashed border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-soft-border)] rounded-lg p-2.5 text-center bg-[var(--ds-surface)]">
              <input
                type="file"
                id="file_scan_formulir_upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f && f.size > 10 * 1024 * 1024) {
                    alert("Ukuran berkas maksimal 10MB");
                    e.target.value = "";
                    return;
                  }
                  setFileFormulir(f);
                }}
                className="sr-only"
              />
              <label htmlFor="file_scan_formulir_upload" className="kpg-upload cursor-pointer block rounded-lg p-2">
                {fileFormulir ? (
                  <div className="flex items-center justify-center gap-1.5 text-[var(--ds-accent-fg)] font-semibold text-xs">
                    <FileCheck className="w-4 h-4" />
                    <span className="truncate max-w-xs">{fileFormulir.name}</span>
                    <span className="text-xs text-[var(--ds-fg-muted)] font-normal">
                      ({(fileFormulir.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <span className="text-[var(--ds-fg-muted)] text-xs font-medium">
                    {item.scan_formulir_nama ? "Pilih berkas baru untuk mengganti" : "Pilih berkas PDF / Gambar Scan Formulir"}
                  </span>
                )}
              </label>
            </div>
            {fileFormulir && (
              <button
                type="button"
                onClick={() => setFileFormulir(null)}
                className="text-xs text-[var(--ds-status-danger-fg)] hover:underline"
              >
                Batalkan berkas formulir ini
              </button>
            )}
          </div>

          {/* Slot 2: Surat Izin Cuti Resmi (TTE) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--ds-fg)] flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-[var(--ds-status-success-fg)]" />
                2. Surat Izin Cuti Resmi (TTE Kepala Balai)
              </label>
              {currentSuratIzin ? (
                <span className="text-xs text-[var(--ds-status-success-fg)] font-semibold bg-[var(--ds-status-success-bg)] px-2 py-0.5 rounded-full">
                  Sudah Terunggah
                </span>
              ) : (
                <span className="text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded-full">
                  Belum ada
                </span>
              )}
            </div>
            {currentSuratIzin && (
              <p className="text-xs text-[var(--ds-fg-muted)] font-mono truncate">
                Berkas aktif: {currentSuratIzin}
              </p>
            )}
            <div className="border border-dashed border-[var(--ds-border-subtle)] hover:border-[var(--ds-status-success-border)] rounded-lg p-2.5 text-center bg-[var(--ds-surface)]">
              <input
                type="file"
                id="file_scan_surat_izin_upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f && f.size > 10 * 1024 * 1024) {
                    alert("Ukuran berkas maksimal 10MB");
                    e.target.value = "";
                    return;
                  }
                  setFileSuratIzin(f);
                }}
                className="sr-only"
              />
              <label htmlFor="file_scan_surat_izin_upload" className="kpg-upload cursor-pointer block rounded-lg p-2">
                {fileSuratIzin ? (
                  <div className="flex items-center justify-center gap-1.5 text-[var(--ds-status-success-fg)] font-semibold text-xs">
                    <FileCheck className="w-4 h-4" />
                    <span className="truncate max-w-xs">{fileSuratIzin.name}</span>
                    <span className="text-xs text-[var(--ds-fg-muted)] font-normal">
                      ({(fileSuratIzin.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <span className="text-[var(--ds-fg-muted)] text-xs font-medium">
                    {currentSuratIzin ? "Pilih berkas baru untuk mengganti" : "Pilih berkas PDF / Gambar Surat Izin Resmi (TTE)"}
                  </span>
                )}
              </label>
            </div>
            {fileSuratIzin && (
              <button
                type="button"
                onClick={() => setFileSuratIzin(null)}
                className="text-xs text-[var(--ds-status-danger-fg)] hover:underline"
              >
                Batalkan berkas surat izin ini
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || (!fileFormulir && !fileSuratIzin)}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold rounded-xl shadow-xs gap-1.5"
            >
              {isPending ? "Mengunggah..." : "Simpan Berkas"}
            </Button>
          </div>
        </form>
      </div>
    </KepegawaianDialog>
  );
}

