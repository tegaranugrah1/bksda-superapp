"use client";

import React from "react";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  X,
  FileText,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Employee } from "./EmployeeSelectionStep";
import {
  buildKegiatanDiktumText,
  cleanMelaksanakanKegiatanPrefix,
} from "@/app/kepegawaian/surat-tugas/_lib/activity-helpers";
import { formatNipLabel, formatDateIndonesian, daysBetween } from "@/lib/letter-utils";
import api from "@/lib/api";

export type JenisTugasType =
  | "Perjalanan Dinas ( Lebih dari 1 Hari )"
  | "Perjalanan Dinas Luar Wilayah"
  | "Perjalanan Dinas Dalam Kawasan / Wilayah"
  | "Melaksanakan Kegiatan ( 1 Hari )"
  | "Menugaskan Staf"
  | string;

export interface StTaskTypeOption {
  id: number;
  nama: string;
  kode: string;
  mode_lokasi: "luar_wilayah" | "dalam_kawasan" | "tempat_saja";
  aturan_durasi: "fleksibel" | "wajib_1_hari";
  default_sertakan_laporan: boolean;
  contoh_format?: string | null;
}

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
  taskTypes: StTaskTypeOption[];
  selectedTaskTypeId: number | null;
  setSelectedTaskTypeId: (id: number | null) => void;
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
  isBedaHari: boolean;
  setIsBedaHari: (val: boolean) => void;
  employeeDates: Record<string, { mulai: string; selesai: string }>;
  setEmployeeDates: React.Dispatch<React.SetStateAction<Record<string, { mulai: string; selesai: string }>>>;
  hasBuruh: boolean;
  setHasBuruh: (val: boolean) => void;
  jumlahBuruh: number;
  setJumlahBuruh: React.Dispatch<React.SetStateAction<number>>;
}

export function SuratTugasDetailStep({
  setStep,
  selectedEmployees,
  handleSubmit,
  jenisTugas,
  setJenisTugas,
  taskTypes,
  selectedTaskTypeId,
  setSelectedTaskTypeId,
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
  isBedaHari,
  setIsBedaHari,
  employeeDates,
  setEmployeeDates,
  hasBuruh,
  setHasBuruh,
  jumlahBuruh,
  setJumlahBuruh,
}: SuratTugasDetailStepProps) {
  const [expenseOptions, setExpenseOptions] = React.useState<Array<{ id: string; label: string }>>([
    { id: "DIPA", label: "DIPA Balai KSDA Kalimantan Timur" },
    { id: "Dana Hibah FOLU Net Sink 2030 (NC 2&3)", label: "Dana Hibah FOLU Net Sink 2030 (NC 2&3)" },
    { id: "Dana Kerjasama KJA", label: "Dana Kerjasama PT Kideco Jaya Agung" },
    { id: "Dana Kerjasama MJA", label: "Dana Kerjasama PT Multi Jayantara Abadi" },
    { id: "Dana Kerjasama COP", label: "Dana Kerjasama COP (Centre for Orangutan Protection)" },
    { id: "Dana Kerjasama PT. Tjiwi Kimia Tbk.", label: "Dana Kerjasama PT Pabrik Kertas Tjiwi Kimia Tbk" },
    { id: "Dana Kerjasama BOSF", label: "Dana Kerjasama Yayasan BOSF" },
    { id: "Dana Kerjasama CAN", label: "Dana Kerjasama CAN (Conservation Action Network)" },
    { id: "Dana Kerjasama ALeRT", label: "Dana Kerjasama ALeRT" },
    { id: "DL 1 / Tidak ada biaya", label: "DL 1 / Tidak ada biaya" },
    { id: "other", label: "Lainnya" },
  ]);

  React.useEffect(() => {
    api.get("/kepegawaian/st-expense-templates/public?active_only=true")
      .then((res) => {
        const data = res.data;
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const list = data.data.map((item: { name: string; code: string }) => ({
            id: item.name,
            label: item.name,
          }));
          list.push({ id: "other", label: "Lainnya" });
          setExpenseOptions(list);
        }
      })
      .catch(() => {});
  }, []);

  const activeTaskType = React.useMemo(() => {
    if (selectedTaskTypeId) {
      return taskTypes.find((t) => t.id === selectedTaskTypeId) || null;
    }
    return (
      taskTypes.find((t) => t.nama.toLowerCase() === jenisTugas.toLowerCase()) ||
      taskTypes.find((t) => t.kode.toLowerCase() === jenisTugas.toLowerCase()) ||
      null
    );
  }, [selectedTaskTypeId, taskTypes, jenisTugas]);

  const modeLokasi = React.useMemo(() => {
    if (activeTaskType?.mode_lokasi) return activeTaskType.mode_lokasi;
    if (jenisTugas.toLowerCase().includes("dalam kawasan")) return "dalam_kawasan";
    if (jenisTugas.toLowerCase().includes("perjalanan dinas")) return "luar_wilayah";
    return "tempat_saja";
  }, [activeTaskType, jenisTugas]);

  const isWajibSatuHari = React.useMemo(() => {
    if (activeTaskType?.aturan_durasi === "wajib_1_hari") return true;
    return jenisTugas.toLowerCase().includes("1 hari");
  }, [activeTaskType, jenisTugas]);

  const handleTaskTypeChange = (typeName: string) => {
    setJenisTugas(typeName);
    const matched = taskTypes.find((t) => t.nama === typeName);
    if (matched) {
      setSelectedTaskTypeId(matched.id);
      if (matched.aturan_durasi === "wajib_1_hari") {
        setFormData((prev) => ({ ...prev, tanggal_selesai: prev.tanggal_mulai }));
      }
    }
  };

  const previewDiktumUtama = React.useMemo(() => {
    return buildKegiatanDiktumText({
      modeLokasi,
      jenisTugas,
      kotaAsal,
      kotaTujuan,
      tempatSpesifik,
      namaKegiatanText,
    });
  }, [modeLokasi, jenisTugas, kotaAsal, kotaTujuan, tempatSpesifik, namaKegiatanText]);

  const previewBiayaText = React.useMemo(() => {
    if (!formData.sumber_dana || formData.sumber_dana === "dl1" || formData.sumber_dana.toLowerCase().includes("tidak ada biaya")) {
      return "";
    }
    if (formData.sumber_dana === "other") {
      return formData.sumber_dana_other
        ? `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${formData.sumber_dana_other};`
        : "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;";
    }
    return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${formData.sumber_dana};`;
  }, [formData.sumber_dana, formData.sumber_dana_other]);

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-4xl p-6 sm:p-10 shadow-xl border border-white/60 ring-1 ring-slate-100/60 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Detail Surat Tugas
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Lengkapi rincian penugasan, jadwal kegiatan, dan pembebanan anggaran.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Ringkasan Pegawai */}
        <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl p-4 flex gap-3 text-blue-900">
          <Users className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          <div className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wider text-blue-700 mb-0.5">
              Personel yang Ditugaskan ({selectedEmployees.length} Orang)
            </span>
            <div className="text-xs font-semibold text-blue-950 flex flex-wrap gap-x-2 gap-y-1">
              {selectedEmployees.map((e) => e.name).join(", ")}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Card Klasifikasi Jenis Tugas & Lokasi */}
          <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                JENIS TUGAS <span className="text-red-500">*</span>
              </label>

              <select
                value={jenisTugas}
                onChange={(e) => handleTaskTypeChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold text-slate-800 outline-none cursor-pointer"
              >
                {taskTypes && taskTypes.length > 0 ? (
                  taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.nama}>
                      {tt.nama}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Perjalanan Dinas Luar Wilayah">
                      Perjalanan Dinas Luar Wilayah
                    </option>
                    <option value="Perjalanan Dinas Dalam Kawasan / Wilayah">
                      Perjalanan Dinas Dalam Kawasan / Wilayah
                    </option>
                    <option value="Melaksanakan Kegiatan ( 1 Hari )">
                      Melaksanakan Kegiatan ( 1 Hari )
                    </option>
                    <option value="Menugaskan Staf">Menugaskan Staf</option>
                  </>
                )}
              </select>
            </div>

            {/* Input Form Sesuai Mode Lokasi */}
            {modeLokasi === "dalam_kawasan" ? (
              <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Di ( Kota / Kabupaten Wilayah Penugasan ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={kotaTujuan}
                    onChange={(e) => setKotaTujuan(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                    placeholder="Contoh: Kabupaten Paser"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Dalam Rangka <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => setNamaKegiatanText(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 resize-none"
                    placeholder="Contoh: kegiatan Patroli Pencegahan/Pengendalian Kebakaran Hutan..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Di ( Kawasan / Lokasi Spesifik ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tempatSpesifik}
                    onChange={(e) => setTempatSpesifik(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                    placeholder="Contoh: Cagar Alam Teluk Adang"
                  />
                </div>
              </div>
            ) : modeLokasi === "luar_wilayah" ? (
              <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nama Kegiatan / Tugas <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => setNamaKegiatanText(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 resize-none"
                    placeholder="Contoh: opname fisik (stok opname) barang persediaan..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Pada ( Tempat / Unit Lokasi )
                    </label>
                    <input
                      type="text"
                      value={tempatSpesifik}
                      onChange={(e) => setTempatSpesifik(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800"
                      placeholder="Contoh: Kantor Balai / Tempat Kegiatan"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
            <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-blue-950">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Pratinjau Kalimat Tugas Resmi
                </span>
                <span className="text-[10px] text-blue-600/70 font-medium">
                  Tata Naskah Dinas KSDAE
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-slate-800">
                {previewDiktumUtama}
                {formData.tanggal_mulai && formData.tanggal_selesai ? (
                  formData.tanggal_mulai === formData.tanggal_selesai ? (
                    <span className="text-slate-600 font-medium">
                      , selama 1 (satu) hari pada tanggal {formatDateIndonesian(formData.tanggal_mulai)};
                    </span>
                  ) : (
                    <span className="text-slate-600 font-medium">
                      , selama {daysBetween(formData.tanggal_mulai, formData.tanggal_selesai)} hari terhitung mulai tanggal {formatDateIndonesian(formData.tanggal_mulai)} sampai dengan {formatDateIndonesian(formData.tanggal_selesai)};
                    </span>
                  )
                ) : ";"}
              </p>
              {previewBiayaText && (
                <p className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-blue-200/50 leading-relaxed">
                  <span className="font-semibold text-slate-700">Pembebanan Anggaran: </span>
                  {previewBiayaText}
                </p>
              )}
            </div>
          </div>

          {/* Waktu & Jadwal Pelaksanaan */}
          {isWajibSatuHari ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Tanggal Kegiatan ( 1 Hari ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={formData.tanggal_mulai}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tanggal_mulai: e.target.value,
                      tanggal_selesai: e.target.value,
                    })
                  }
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Mulai Tanggal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={formData.tanggal_mulai}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_mulai: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Sampai Tanggal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={formData.tanggal_mulai}
                      value={formData.tanggal_selesai}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_selesai: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle Jadwal Personel Berbeda Hari */}
              {selectedEmployees.length > 1 && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-amber-950">
                        Jadwal Personel Berbeda Hari?
                      </p>
                      <p className="text-[11px] text-amber-700/90 mt-0.5">
                        Aktifkan jika masing-masing pegawai memiliki tanggal tugas berbeda (Template Beda Hari).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !isBedaHari;
                        setIsBedaHari(nextVal);
                        if (nextVal) {
                          setEmployeeDates((prev) => {
                            const nextDates = { ...prev };
                            selectedEmployees.forEach((emp) => {
                              if (!nextDates[emp.id]?.mulai && formData.tanggal_mulai) {
                                nextDates[emp.id] = {
                                   mulai: formData.tanggal_mulai,
                                   selesai: formData.tanggal_selesai || formData.tanggal_mulai,
                                };
                              }
                            });
                            return nextDates;
                          });
                        }
                      }}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        isBedaHari ? "bg-amber-600" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                          isBedaHari ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {isBedaHari && (
                    <div className="pt-2 border-t border-amber-200/60 space-y-3 animate-in fade-in duration-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Rincian Tanggal Tugas Per Personel:
                      </p>
                      <div className="space-y-2">
                        {selectedEmployees.map((emp, idx) => {
                          const dates = employeeDates[emp.id] || {
                            mulai: formData.tanggal_mulai || "",
                            selesai: formData.tanggal_selesai || "",
                          };
                          return (
                            <div
                              key={emp.id}
                              className="p-3 bg-white border border-amber-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {idx + 1}. {emp.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {emp.nip ? `${formatNipLabel(emp, true)} ${emp.nip}` : "Non-NIP"} • {emp.position || emp.department || "-"}
                                </p>
                              </div>
                              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 w-full md:w-auto shrink-0">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                                    Mulai
                                  </label>
                                  <input
                                    type="date"
                                    required={isBedaHari}
                                    value={dates.mulai}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEmployeeDates((prev) => ({
                                        ...prev,
                                        [emp.id]: {
                                          mulai: val,
                                          selesai: prev[emp.id]?.selesai || val,
                                        },
                                      }));
                                    }}
                                    className="w-full md:w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                                    Selesai
                                  </label>
                                  <input
                                    type="date"
                                    required={isBedaHari}
                                    min={dates.mulai}
                                    value={dates.selesai}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEmployeeDates((prev) => ({
                                        ...prev,
                                        [emp.id]: {
                                          mulai: prev[emp.id]?.mulai || val,
                                          selesai: val,
                                        },
                                      }));
                                    }}
                                    className="w-full md:w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Toggle Buruh / Tenaga Lapangan (PM) */}
              <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-blue-950">
                      Apakah ada Buruh / Tenaga Lapangan (PM)?
                    </p>
                    <p className="text-[11px] text-blue-700/90 mt-0.5">
                      Aktifkan jika penugasan menyertakan buruh (format: Nama: <b>PM</b>, Jabatan: <b>-</b>).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !hasBuruh;
                      setHasBuruh(nextVal);
                      if (nextVal && jumlahBuruh < 1) {
                        setJumlahBuruh(1);
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      hasBuruh ? "bg-blue-600" : "bg-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        hasBuruh ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {hasBuruh && (
                  <div className="pt-3 border-t border-blue-200/60 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-bold text-blue-900 block">
                        Jumlah Buruh (Orang)
                      </label>
                      <p className="text-[11px] text-blue-700/80">
                        Berapa orang buruh yang diikutsertakan?
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setJumlahBuruh((prev) => Math.max(1, prev - 1))}
                        disabled={jumlahBuruh <= 1}
                        className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={jumlahBuruh}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setJumlahBuruh(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                        }}
                        className="w-16 px-2 py-1.5 text-center bg-white border border-blue-300 rounded-lg text-sm font-bold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setJumlahBuruh((prev) => Math.min(100, prev + 1))}
                        disabled={jumlahBuruh >= 100}
                        className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sumber Dana */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Sumber Dana <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expenseOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                    formData.sumber_dana === opt.id
                      ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500/20 text-blue-900"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
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
                        ? "border-blue-600"
                        : "border-slate-300"
                    )}
                  >
                    {formData.sumber_dana === opt.id && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold">{opt.label}</span>
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
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                  placeholder="Sebutkan sumber dana..."
                />
              </div>
            )}
          </div>

          {/* PLH Jika ada Pejabat Struktural */}
          {hasPejabatStruktural && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Nama PLH <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
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
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
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
                    className="text-blue-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tanda Setuju Kepala Seksi jika ada pegawai Seksi */}
          {hasSeksiEmployee && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Tanda Setuju Kepala Seksi <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                    tandaSetuju === "sudah"
                      ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500/20 text-blue-900"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
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
                      tandaSetuju === "sudah" ? "border-blue-600" : "border-slate-300"
                    )}
                  >
                    {tandaSetuju === "sudah" && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold">Sudah disetujui Kepala Seksi</span>
                </label>
                <label
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-all",
                    tandaSetuju === "belum"
                      ? "bg-amber-50 border-amber-500 ring-1 ring-amber-500/20 text-amber-900"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
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
                      tandaSetuju === "belum" ? "border-amber-500" : "border-slate-300"
                    )}
                  >
                    {tandaSetuju === "belum" && (
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold">Belum disetujui Kepala Seksi</span>
                </label>
              </div>
            </div>
          )}

          {/* Upload Dasar Surat */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Upload Dasar Surat{" "}
              <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">
                (Opsional, PDF/Gambar Max. 10MB)
              </span>
            </label>
            <div className="mt-2 relative">
              <input
                type="file"
                id="dasar_surat"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={handleFileChange}
              />
              <label
                htmlFor="dasar_surat"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all bg-slate-50 hover:bg-slate-100",
                  selectedFile
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-slate-300"
                )}
              >
                <div className="flex flex-col items-center justify-center py-4">
                  {selectedFile ? (
                    <>
                      <FileText className="w-7 h-7 text-blue-600 mb-1.5" />
                      <p className="text-xs font-bold text-blue-900 truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-slate-400 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">
                        Klik untuk upload dokumen pendukung / disposisi
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PDF atau Gambar (Max. 10MB)
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Keterangan Tambahan */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Keterangan Lainnya
            </label>
            <textarea
              value={formData.keterangan}
              onChange={(e) =>
                setFormData({ ...formData, keterangan: e.target.value })
              }
              className="w-full min-h-20 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-xs font-medium text-slate-800"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(1)}
            className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
          >
            Kembali ke Personel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide shadow-md shadow-blue-500/10 transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? "Mengirim Data..." : "Submit Pengajuan Surat Tugas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
