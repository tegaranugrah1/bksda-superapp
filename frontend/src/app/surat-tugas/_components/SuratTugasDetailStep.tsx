"use client";

import React from "react";
import {
  ChevronLeft,
  AlertCircle,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  X,
  FileText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Employee } from "./EmployeeSelectionStep";
import { cleanMelaksanakanKegiatanPrefix } from "@/app/kepegawaian/surat-tugas/_lib/activity-helpers";

export type JenisTugasType =
  | "Perjalanan Dinas ( Lebih dari 1 Hari )"
  | "Melaksanakan Kegiatan ( 1 Hari )"
  | "Menugaskan Staf";

export interface SuratTugasFormData {
  nama_kegiatan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  sumber_dana: string;
  sumber_dana_other: string;
  keterangan: string;
}

interface SuratTugasDetailStepProps {
  setStep: (step: 1 | 2 | 3) => void;
  selectedEmployees: Employee[];
  handleSubmit: (e: React.FormEvent) => void;
  jenisTugas: JenisTugasType;
  setJenisTugas: (val: JenisTugasType) => void;
  kotaAsal: string;
  setKotaAsal: (val: string) => void;
  kotaTujuan: string;
  setKotaTujuan: (val: string) => void;
  namaKegiatanText: string;
  setNamaKegiatanText: (val: string) => void;
  tempatSpesifik: string;
  setTempatSpesifik: (val: string) => void;
  formData: SuratTugasFormData;
  setFormData: React.Dispatch<React.SetStateAction<SuratTugasFormData>>;
  hasPejabatStruktural: boolean;
  namaPlh: string;
  setNamaPlh: (val: string) => void;
  plhSearchQuery: string;
  setPlhSearchQuery: (val: string) => void;
  showPlhDropdown: boolean;
  setShowPlhDropdown: (val: boolean) => void;
  plhSearchResults: Employee[];
  plhDropdownRef: React.RefObject<HTMLDivElement | null>;
  hasSeksiEmployee: boolean;
  tandaSetuju: "sudah" | "belum" | "";
  setTandaSetuju: (val: "sudah" | "belum" | "") => void;
  selectedFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubmitting: boolean;
}

export function SuratTugasDetailStep({
  setStep,
  selectedEmployees,
  handleSubmit,
  jenisTugas,
  setJenisTugas,
  kotaAsal,
  setKotaAsal,
  kotaTujuan,
  setKotaTujuan,
  namaKegiatanText,
  setNamaKegiatanText,
  tempatSpesifik,
  setTempatSpesifik,
  formData,
  setFormData,
  hasPejabatStruktural,
  namaPlh,
  setNamaPlh,
  plhSearchQuery,
  setPlhSearchQuery,
  showPlhDropdown,
  setShowPlhDropdown,
  plhSearchResults,
  plhDropdownRef,
  hasSeksiEmployee,
  tandaSetuju,
  setTandaSetuju,
  selectedFile,
  handleFileChange,
  isSubmitting,
}: SuratTugasDetailStepProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-10 shadow-xl border border-white/50 ring-1 ring-slate-100/50 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Detail Surat Tugas
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Lengkapi informasi perjalanan dinas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex gap-3 text-emerald-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="block text-sm font-bold mb-1">
              Daftar Pegawai ({selectedEmployees.length})
            </span>
            <div className="text-xs font-medium text-emerald-700/80 flex flex-wrap gap-x-2 gap-y-1">
              {selectedEmployees.map((e) => e.name).join(", ")}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                JENIS TUGAS <span className="text-red-500">*</span>
              </label>

              <select
                value={jenisTugas}
                onChange={(e) => {
                  const val = e.target.value as JenisTugasType;
                  setJenisTugas(val);
                  if (val.includes("Melaksanakan Kegiatan")) {
                    setFormData((prev) => ({ ...prev, tanggal_selesai: prev.tanggal_mulai }));
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="Perjalanan Dinas ( Lebih dari 1 Hari )">
                  Melaksanakan Perjalanan Dinas ( Lebih dari 1 Hari )
                </option>
                <option value="Melaksanakan Kegiatan ( 1 Hari )">
                  Melaksanakan Kegiatan ( 1 Hari )
                </option>
                <option value="Menugaskan Staf">Menugaskan Staf</option>
              </select>
            </div>

            {jenisTugas.includes("Perjalanan Dinas") ? (
              <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                {/* 2 Split Columns: Dari (Asal) & Ke (Tujuan) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Dari ( Kota / Lokasi Asal ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={kotaAsal}
                      onChange={(e) => setKotaAsal(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                      placeholder="Contoh: Samarinda"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Ke ( Kota / Kabupaten Tujuan ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={kotaTujuan}
                      onChange={(e) => setKotaTujuan(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                      placeholder="Contoh: Kabupaten Kutai Barat"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Dalam Rangka <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => setNamaKegiatanText(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 resize-none"
                    placeholder="Contoh: Kegiatan Inventarisasi dan Verifikasi Keanekaragaman Hayati..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Di ( Tempat Spesifik / Opsional )
                  </label>
                  <input
                    type="text"
                    value={tempatSpesifik}
                    onChange={(e) => setTempatSpesifik(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                    placeholder="Contoh: Suaka Margasatwa Kelian"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {jenisTugas.includes("Melaksanakan Kegiatan")
                      ? "Melaksanakan Kegiatan ( 1 Hari )"
                      : "Menugaskan Staf"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => setNamaKegiatanText(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 resize-none"
                    placeholder={
                      jenisTugas.includes("Melaksanakan Kegiatan")
                        ? "Contoh: opname fisik (stok opname) barang persediaan"
                        : "Contoh: verifikasi berkas administrasi persediaan"
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pada ( Tempat / Unit / Lokasi Kegiatan )
                    </label>
                    <input
                      type="text"
                      value={tempatSpesifik}
                      onChange={(e) => setTempatSpesifik(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                      placeholder="Contoh: Kantor Balai / tempat kegiatannya"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Di ( Kota / Kabupaten ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={kotaTujuan}
                      onChange={(e) => setKotaTujuan(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                      placeholder="Contoh: Samarinda"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Generated Preview Box */}
            <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                📌 Pratinjau Teks Hasil Resmi
              </span>
              <p className="text-xs font-bold leading-relaxed">
                {jenisTugas.includes("Perjalanan Dinas")
                  ? `Melaksanakan Perjalanan Dinas dari ${kotaAsal || "..."} ke ${
                      kotaTujuan || "..."
                    }${namaKegiatanText ? ` dalam rangka ${cleanMelaksanakanKegiatanPrefix(namaKegiatanText)}` : ""}${
                      tempatSpesifik ? ` di ${tempatSpesifik}` : ""
                    }`
                  : jenisTugas.includes("Melaksanakan Kegiatan")
                  ? `Melaksanakan Kegiatan ${cleanMelaksanakanKegiatanPrefix(namaKegiatanText) || "..."}${
                      tempatSpesifik ? ` pada ${tempatSpesifik}` : ""
                    }${kotaTujuan ? ` di ${kotaTujuan}` : ""}`
                  : `Menugaskan Staf untuk ${cleanMelaksanakanKegiatanPrefix(namaKegiatanText) || "..."}${
                      tempatSpesifik ? ` pada ${tempatSpesifik}` : ""
                    }${kotaTujuan ? ` di ${kotaTujuan}` : ""}`}
              </p>
            </div>
          </div>

          {jenisTugas.includes("Melaksanakan Kegiatan") ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tanggal Kegiatan ( 1 Hari ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.tanggal_mulai}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tanggal_mulai: e.target.value,
                      tanggal_selesai: e.target.value,
                    })
                  }
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mulai Tanggal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={formData.tanggal_mulai}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_mulai: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Sampai Tanggal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    min={formData.tanggal_mulai}
                    value={formData.tanggal_selesai}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_selesai: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Sumber Dana <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: "DIPA", label: "DIPA" },
                { id: "Dana Kerjasama KJA", label: "Dana Kerjasama KJA" },
                { id: "Dana Kerjasama MJA", label: "Dana Kerjasama MJA" },
                { id: "Dana Kerjasama COP", label: "Dana Kerjasama COP" },
                {
                  id: "Dana Kerjasama PT. Tjiwi Kimia Tbk.",
                  label: "Dana Kerjasama PT. Tjiwi Kimia Tbk.",
                },
                { id: "Dana Kerjasama BOSF", label: "Dana Kerjasama BOSF" },
                { id: "Dana Kerjasama CAN", label: "Dana Kerjasama CAN" },
                { id: "Dana Kerjasama ALeRT", label: "Dana Kerjasama ALeRT" },
                { id: "Dana Kerjasama FOLU", label: "Dana Kerjasama FOLU" },
                { id: "DL 1 / Tidak ada biaya", label: "DL 1 / Tidak ada biaya" },
                { id: "other", label: "Lainnya" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                    formData.sumber_dana === opt.id
                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="sumber_dana"
                    value={opt.id}
                    required
                    className="sr-only"
                    checked={formData.sumber_dana === opt.id}
                    onChange={(e) =>
                      setFormData({ ...formData, sumber_dana: e.target.value })
                    }
                  />
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors",
                      formData.sumber_dana === opt.id
                        ? "border-emerald-500"
                        : "border-slate-300"
                    )}
                  >
                    {formData.sumber_dana === opt.id && (
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      formData.sumber_dana === opt.id
                        ? "text-emerald-900"
                        : "text-slate-600"
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>

            {formData.sumber_dana === "other" && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  required
                  value={formData.sumber_dana_other}
                  onChange={(e) =>
                    setFormData({ ...formData, sumber_dana_other: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                  placeholder="Sebutkan sumber dana..."
                />
              </div>
            )}
          </div>

          {/* PLH - muncul jika ada Kasubag TU / Kepala Seksi yang ikut perjalanan */}
          {hasPejabatStruktural && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama PLH <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
                Wajib diisi karena Kepala Subbagian Tata Usaha atau Kepala Seksi melaksanakan perjalanan dinas.
              </p>
              <div className="relative" ref={plhDropdownRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required={!namaPlh}
                    value={plhSearchQuery || namaPlh}
                    onChange={(e) => {
                      setPlhSearchQuery(e.target.value);
                      setNamaPlh(e.target.value);
                      setShowPlhDropdown(true);
                    }}
                    onFocus={() => setShowPlhDropdown(true)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                    placeholder="Cari nama atau NIP Pelaksana Harian (PLH)..."
                  />
                </div>
                {showPlhDropdown &&
                  plhSearchQuery.length >= 2 &&
                  plhSearchResults.length > 0 && (
                    <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-h-60 overflow-y-auto z-30">
                      <ul className="py-2">
                        {plhSearchResults.map((emp: Employee) => (
                          <li key={emp.id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors"
                              onClick={() => {
                                setNamaPlh(emp.name);
                                setPlhSearchQuery("");
                                setShowPlhDropdown(false);
                              }}
                            >
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-semibold truncate text-slate-700">
                                  {emp.name}
                                </span>
                                <span className="text-xs text-slate-500 truncate mt-0.5">
                                  {emp.department && emp.department !== "-"
                                    ? emp.department
                                    : emp.nip}
                                </span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              {namaPlh && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-bold text-blue-900 flex-1 truncate">
                    {namaPlh}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNamaPlh("");
                      setPlhSearchQuery("");
                    }}
                    className="text-blue-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tanda Setuju - muncul jika ada pegawai dari Seksi */}
          {hasSeksiEmployee && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tanda Setuju <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                    tandaSetuju === "sudah"
                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="tanda_setuju"
                    value="sudah"
                    required
                    className="sr-only"
                    checked={tandaSetuju === "sudah"}
                    onChange={() => setTandaSetuju("sudah")}
                  />
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors",
                      tandaSetuju === "sudah"
                        ? "border-emerald-500"
                        : "border-slate-300"
                    )}
                  >
                    {tandaSetuju === "sudah" && (
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      tandaSetuju === "sudah"
                        ? "text-emerald-900"
                        : "text-slate-600"
                    )}
                  >
                    Sudah disetujui Kepala Seksi
                  </span>
                </label>
                <label
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                    tandaSetuju === "belum"
                      ? "bg-amber-50 border-amber-500 ring-1 ring-amber-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="tanda_setuju"
                    value="belum"
                    required
                    className="sr-only"
                    checked={tandaSetuju === "belum"}
                    onChange={() => setTandaSetuju("belum")}
                  />
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors",
                      tandaSetuju === "belum"
                        ? "border-amber-500"
                        : "border-slate-300"
                    )}
                  >
                    {tandaSetuju === "belum" && (
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      tandaSetuju === "belum"
                        ? "text-amber-900"
                        : "text-slate-600"
                    )}
                  >
                    Belum disetujui Kepala Seksi
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upload Dasar Surat{" "}
              <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">
                (Opsional)
              </span>
            </label>
            <div className="mt-2 relative">
              <input
                type="file"
                id="dasar_surat"
                accept=".pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
              <label
                htmlFor="dasar_surat"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all bg-slate-50 hover:bg-slate-100",
                  selectedFile
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-300"
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {selectedFile ? (
                    <>
                      <FileText className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="text-sm font-bold text-emerald-700">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-emerald-600/70 opacity-80 mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">
                        Klik untuk upload file
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PDF (Max. 10MB)
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Keterangan Lainnya
            </label>
            <textarea
              value={formData.keterangan}
              onChange={(e) =>
                setFormData({ ...formData, keterangan: e.target.value })
              }
              className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-sm font-medium"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-14 px-10 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold tracking-wide shadow-lg shadow-emerald-500/20 transition-all text-base disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Mengirim Data..." : "Submit Pengajuan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
