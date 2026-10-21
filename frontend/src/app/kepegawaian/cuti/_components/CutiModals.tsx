"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, FileCheck, FileText, FileUp, Printer, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormulirCutiPrint } from "@/app/portal/_components/FormulirCutiPrint";

export { ScanViewerModal } from "./ScanViewerModal";

export interface LeaveRequestItem {
  id: number;
  nomor_pengajuan: string;
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
  isPending: boolean;
  onClose: () => void;
  onApprove: (nomorSurat: string, fileScan: File | null, catatan: string) => void;
}

export function ApproveLeaveModal({
  item,
  isPending,
  onClose,
  onApprove,
}: ApproveLeaveModalProps) {
  const [nomorSurat, setNomorSurat] = useState("");
  const [fileScan, setFileScan] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (item) {
      setNomorSurat(item.nomor_pengajuan || "");
      setCatatan(item.catatan_atasan || "");
      setFileScan(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApprove(nomorSurat, fileScan, catatan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Persetujuan Pengajuan Cuti
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

        {/* Request Summary Info */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Jenis Cuti:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{item.jenis_cuti}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Lama Cuti:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.jumlah_hari} Hari</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Periode Pelaksanaan:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {item.tanggal_mulai} s/d {item.tanggal_selesai}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nomor Surat Penetapan Resmi (SI / ST)
            </label>
            <input
              type="text"
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
              placeholder="Contoh: SI.123/K.18/TU/PEG.11.01/B/04/2026"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Dapat disesuaikan dengan nomor surat izin resmi yang diterbitkan.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Unggah Berkas Scan TTD & Cap Balai
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
                Opsional
              </span>
            </div>

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/20 transition-colors">
              <input
                type="file"
                id="file_scan_approve"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f && f.size > 10 * 1024 * 1024) {
                    alert("Ukuran berkas maksimal 10MB");
                    e.target.value = "";
                    return;
                  }
                  setFileScan(f);
                }}
                className="hidden"
              />
              <label htmlFor="file_scan_approve" className="cursor-pointer block space-y-1.5">
                {fileScan ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <FileCheck className="w-5 h-5" />
                    <span className="truncate max-w-xs">{fileScan.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({(fileScan.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pilih berkas PDF atau Foto Scan (JPG/PNG)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Maksimal ukuran berkas: 10MB. Jika belum ada fisik scan, bisa dilewati dan diunggah nanti.
                    </p>
                  </>
                )}
              </label>
            </div>
            {fileScan && (
              <button
                type="button"
                onClick={() => setFileScan(null)}
                className="text-[10px] text-rose-500 hover:underline mt-1"
              >
                Hapus pilihan berkas
              </button>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Catatan Persetujuan (Opsional)
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan dari atasan atau pejabat yang berwenang..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs gap-1.5"
            >
              {isPending ? "Memproses..." : "Setujui Permohonan"}
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
    employee?: {
      nama_lengkap?: string;
    };
  } | null;
  isPending: boolean;
  onClose: () => void;
  onUpload: (fileScan: File) => void;
}

export function UploadScanModal({
  item,
  isPending,
  onClose,
  onUpload,
}: UploadScanModalProps) {
  const [fileScan, setFileScan] = useState<File | null>(null);

  useEffect(() => {
    setFileScan(null);
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileScan) {
      alert("Silakan pilih berkas scan terlebih dahulu.");
      return;
    }
    onUpload(fileScan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.scan_surat_path ? "Ganti Berkas Scan Cuti" : "Unggah Berkas Scan Cuti"}
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

        {item.scan_surat_nama && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
            Berkas saat ini: <span className="font-mono font-bold">{item.scan_surat_nama}</span>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              Mengunggah berkas baru akan menggantikan berkas lama.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/20">
            <input
              type="file"
              id="file_scan_upload_only"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f && f.size > 10 * 1024 * 1024) {
                  alert("Ukuran berkas maksimal 10MB");
                  e.target.value = "";
                  return;
                }
                setFileScan(f);
              }}
              className="hidden"
            />
            <label htmlFor="file_scan_upload_only" className="cursor-pointer block space-y-1.5">
              {fileScan ? (
                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                  <FileCheck className="w-5 h-5" />
                  <span className="truncate max-w-xs">{fileScan.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({(fileScan.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih berkas PDF atau Foto Scan (JPG/PNG)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Maksimal ukuran berkas: 10MB.
                  </p>
                </>
              )}
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !fileScan}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs gap-1.5"
            >
              {isPending ? "Mengunggah..." : "Simpan Berkas Scan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

