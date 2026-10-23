"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileText,
  FileUp,
  Printer,
  UploadCloud,
  X,
  RotateCcw,
  Sparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Edit Pengajuan Cuti
            </h3>
            <p className="text-xs text-slate-400">Pemohon: {item.employee?.nama_lengkap}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
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
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nomor Surat Penetapan Resmi (SI)
            </label>
            <input
              type="text"
              value={editForm.nomor_pengajuan}
              onChange={(e) => setEditForm({ ...editForm, nomor_pengajuan: e.target.value })}
              placeholder="Contoh: SI.12/K.18/TU/KSA/03/2026 (kosongkan jika belum diterbitkan)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Nomor surat penetapan diisi oleh admin kepegawaian setelah surat izin terbit.
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Jenis Cuti</label>
            <select
              value={editForm.jenis_cuti}
              onChange={(e) => setEditForm({ ...editForm, jenis_cuti: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
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
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mulai Tanggal</label>
              <input
                type="date"
                value={editForm.tanggal_mulai}
                onChange={(e) => setEditForm({ ...editForm, tanggal_mulai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={editForm.tanggal_selesai}
                onChange={(e) => setEditForm({ ...editForm, tanggal_selesai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alasan Cuti</label>
            <textarea
              value={editForm.alasan_cuti}
              onChange={(e) => setEditForm({ ...editForm, alasan_cuti: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alamat Selama Cuti</label>
            <textarea
              value={editForm.alamat_menjalankan_cuti}
              onChange={(e) => setEditForm({ ...editForm, alamat_menjalankan_cuti: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={editForm.telepon}
                onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Masa Kerja (Kustom)</label>
              <input
                type="text"
                value={editForm.masa_kerja}
                onChange={(e) => setEditForm({ ...editForm, masa_kerja: e.target.value })}
                placeholder="Contoh: 2 Tahun 0 Bulan"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Konfirmasi Hapus Pengajuan Cuti
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Apakah Anda yakin ingin menghapus pengajuan cuti milik{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
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
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {isPending ? "Menghapus..." : "Ya, Hapus Pengajuan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PrintLeaveModalProps {
  item: LeaveRequestItem | null;
  onClose: () => void;
}

export function PrintLeaveModal({ item, onClose }: PrintLeaveModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full mx-auto shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">Verifikasi & Preview Formulir Cuti Resmi</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Formulir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 bg-slate-100 overflow-y-auto max-h-[85vh]">
          <FormulirCutiPrint data={item} />
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {isRegenerate ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isRegenerate ? "Terbitkan / Generate Ulang Surat Izin" : "Persetujuan & Generate Surat Izin Cuti"}
              </h3>
              <p className="text-xs text-slate-500">
                Pemohon: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.employee?.nama_lengkap}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Live Naskah Ringkas / Document Preview Card */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <FileBadge className="w-3.5 h-3.5" />
              SURAT IZIN CUTI {(item.jenis_cuti || "TAHUNAN").toUpperCase().replace(/^CUTI\s+/i, "")}
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
              TTE Kepala Balai
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/40 dark:border-emerald-800/40 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">
                {isPppk(item.employee) ? "PPPK Pemohon" : "PNS Pemohon"}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {item.employee?.nama_lengkap}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{formatNipLabel(item.employee, true)} {item.employee?.nip}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Durasi & Pelaksanaan</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                {item.jumlah_hari} Hari Kerja
              </span>
              <span className="text-[10px] text-slate-500">{item.tanggal_mulai} s.d {item.tanggal_selesai}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Pilihan Tanggal Penetapan Surat Izin */}
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Tanggal Penetapan Surat Izin
              </label>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                {tanggalSurat ? formatDateIndonesian(tanggalSurat) : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                required
              />
              <button
                type="button"
                onClick={() => handleDateChange(new Date().toISOString().split("T")[0])}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 hover:bg-emerald-200/80 rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                title="Gunakan tanggal hari ini"
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* Segmented Form Nomor Surat Penetapan Resmi (SI) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                Nomor Surat Penetapan Resmi (SI)
                {isLoadingPreview && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
              </label>
              {isNomorModified && (
                <button
                  type="button"
                  onClick={handleResetNomor}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  title="Kembalikan semua form ke nomor urut otomatis yang disarankan sistem"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset ke No. Otomatis
                </button>
              )}
            </div>

            {/* 4 Form Inputs: SI.{nomor}, /K.18/TU/, {klasifikasi}, /B/{bulan}/{tahun} */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
              {/* Form 1: SI.{nomor} */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate" title="SI.{nomor}">
                  SI.&#123;nomor&#125;
                </label>
                <div className="flex items-center">
                  <span className="px-1.5 py-1.5 bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 select-none">
                    SI.
                  </span>
                  <input
                    type="text"
                    value={formNomorUrut}
                    onChange={(e) => setFormNomorUrut(e.target.value.replace(/^SI\.?\s*/i, ""))}
                    placeholder="93"
                    className="w-full px-1.5 py-1.5 font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-r-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-center"
                  />
                </div>
              </div>

              {/* Form 2: /K.18/TU/ */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate" title="/K.18/TU/">
                  /K.18/TU/
                </label>
                <input
                  type="text"
                  value={formKodeUnit}
                  onChange={(e) => setFormKodeUnit(e.target.value)}
                  placeholder="/K.18/TU/"
                  className="w-full px-2 py-1.5 font-mono text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-center"
                  required
                />
              </div>

              {/* Form 3: {klasifikasi} */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate" title="{klasifikasi}">
                  &#123;klasifikasi&#125;
                </label>
                <input
                  type="text"
                  value={formKlasifikasi}
                  onChange={(e) => setFormKlasifikasi(e.target.value)}
                  placeholder="PEG.11.01"
                  className="w-full px-2 py-1.5 font-mono text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-center"
                  required
                />
              </div>

              {/* Form 4: /B/{bulan}/{tahun} */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate" title="/B/{bulan}/{tahun}">
                  /B/&#123;bln&#125;/&#123;thn&#125;
                </label>
                <input
                  type="text"
                  value={formBulanTahun}
                  onChange={(e) => setFormBulanTahun(e.target.value)}
                  placeholder={`/B/${currentMonth}/${currentYear}`}
                  className="w-full px-2 py-1.5 font-mono text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-center"
                  required
                />
              </div>
            </div>

            {/* Live Result Preview Banner */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px]">
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                Nomor Surat Terbentuk:
              </span>
              <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200 whitespace-pre">
                {assembledNomor}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Catatan Persetujuan (Opsional)
              </label>
              <button
                type="button"
                onClick={() => setCatatan(defaultCatatanText)}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
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
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              *Jika tidak diisi, otomatis terisi: <span className="font-semibold text-slate-600 dark:text-slate-300">{defaultCatatanText}</span>
            </p>
          </div>

          {/* Collapsible Manual Scan Files (Optional) */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFileUploads(!showFileUploads)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <FileUp className="w-3.5 h-3.5 text-slate-400" />
                Lampirkan Berkas Scan Manual / Fisik (Opsional)
              </span>
              {showFileUploads ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {showFileUploads && (
              <div className="p-3 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                {/* Slot 1: Scan Formulir Cuti TTD Manual */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                    <FileText className="w-3 h-3 text-blue-500" />
                    1. Scan Formulir Cuti Basah (Cap Balai)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileFormulir(e.target.files?.[0] || null)}
                    className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                {/* Slot 2: Scan Surat Izin Cuti Fisik */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                    <FileCheck className="w-3 h-3 text-emerald-500" />
                    2. Scan Surat Izin Bertandatangan Basah (Jika Ada)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileSuratIzin(e.target.files?.[0] || null)}
                    className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || isLoadingPreview}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs gap-1.5 px-4 cursor-pointer"
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
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Terbitkan Surat Izin & Setujui</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Unggah / Kelola Berkas Cuti
              </h3>
              <p className="text-xs text-slate-500">
                Pemohon: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.employee?.nama_lengkap}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Slot 1: Scan Formulir */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                1. Scan Surat Pengantar dan Formulir Cuti (TTD & Cap)
              </label>
              {item.scan_formulir_nama ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Sudah Terunggah
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Belum ada
                </span>
              )}
            </div>
            {item.scan_formulir_nama && (
              <p className="text-[10px] text-slate-500 font-mono truncate">
                Berkas aktif: {item.scan_formulir_nama}
              </p>
            )}
            <div className="border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 rounded-lg p-2.5 text-center bg-white dark:bg-slate-900">
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
                className="hidden"
              />
              <label htmlFor="file_scan_formulir_upload" className="cursor-pointer block">
                {fileFormulir ? (
                  <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                    <FileCheck className="w-4 h-4" />
                    <span className="truncate max-w-xs">{fileFormulir.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({(fileFormulir.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                    {item.scan_formulir_nama ? "Pilih berkas baru untuk mengganti" : "Pilih berkas PDF / Gambar Scan Formulir"}
                  </span>
                )}
              </label>
            </div>
            {fileFormulir && (
              <button
                type="button"
                onClick={() => setFileFormulir(null)}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Batalkan berkas formulir ini
              </button>
            )}
          </div>

          {/* Slot 2: Surat Izin Cuti Resmi (TTE) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                2. Surat Izin Cuti Resmi (TTE Kepala Balai)
              </label>
              {currentSuratIzin ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Sudah Terunggah
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Belum ada
                </span>
              )}
            </div>
            {currentSuratIzin && (
              <p className="text-[10px] text-slate-500 font-mono truncate">
                Berkas aktif: {currentSuratIzin}
              </p>
            )}
            <div className="border border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-lg p-2.5 text-center bg-white dark:bg-slate-900">
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
                className="hidden"
              />
              <label htmlFor="file_scan_surat_izin_upload" className="cursor-pointer block">
                {fileSuratIzin ? (
                  <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <FileCheck className="w-4 h-4" />
                    <span className="truncate max-w-xs">{fileSuratIzin.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({(fileSuratIzin.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                    {currentSuratIzin ? "Pilih berkas baru untuk mengganti" : "Pilih berkas PDF / Gambar Surat Izin Resmi (TTE)"}
                  </span>
                )}
              </label>
            </div>
            {fileSuratIzin && (
              <button
                type="button"
                onClick={() => setFileSuratIzin(null)}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Batalkan berkas surat izin ini
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || (!fileFormulir && !fileSuratIzin)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs gap-1.5"
            >
              {isPending ? "Mengunggah..." : "Simpan Berkas"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

