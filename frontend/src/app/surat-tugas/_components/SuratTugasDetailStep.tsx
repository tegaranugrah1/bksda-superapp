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
  Italic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Employee } from "./EmployeeSelectionStep";
import {
  buildKegiatanDiktumText,
  cleanMelaksanakanKegiatanPrefix,
  normalizeTaskTypeName,
  isJenisKegiatanTask,
  capitalizeOfficialText,
} from "@/app/kepegawaian/surat-tugas/_lib/activity-helpers";
import {
  formatNipLabel,
  formatDateIndonesian,
  daysBetween,
  renderFormattedItalic,
  toggleItalicInTextarea,
} from "@/lib/letter-utils";
import api from "@/lib/api";
import { ScheduleConflictBanner } from "@/app/kepegawaian/surat-tugas/_components/ScheduleConflictBanner";
import { useScheduleConflicts } from "@/app/kepegawaian/surat-tugas/_lib/useScheduleConflicts";

export type JenisTugasType =
  | "Perjalanan Dinas ( Lebih dari 1 Hari )"
  | "Perjalanan Dinas Luar Wilayah"
  | "Perjalanan Dinas Dalam Kawasan / Wilayah"
  | "Melaksanakan Kegiatan ( 1 Hari )"
  | "Menugaskan Staf"
  | "Pengawasan / Pemeriksaan Pekerjaan"
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
  untukKegiatanText?: string;
  setUntukKegiatanText?: (val: string) => void;
  removeEmployee?: (id: string) => void;
}

export function SuratTugasDetailStep({
  setStep,
  selectedEmployees,
  removeEmployee,
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
  untukKegiatanText = "Pengawasan Pekerjaan Konstruksi",
  setUntukKegiatanText,
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

  const { data: conflictData, isLoading: isCheckingConflicts } = useScheduleConflicts({
    employees: selectedEmployees,
    tanggalMulai: formData.tanggal_mulai,
    tanggalSelesai: formData.tanggal_selesai,
    isBedaHari,
    employeeDates,
  });

  const conflicts = conflictData?.conflicts || [];
  const hasConflict = (conflictData?.has_conflict && conflicts.length > 0) ?? false;

  const handleRemoveEmployee = React.useCallback(
    (empId: number) => {
      if (removeEmployee) {
        removeEmployee(String(empId));
      }
    },
    [removeEmployee]
  );

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

  const isJenisKegiatan = React.useMemo(() => {
    return (
      isJenisKegiatanTask(jenisTugas, activeTaskType?.contoh_format) ||
      activeTaskType?.kode === "jenis_kegiatan"
    );
  }, [jenisTugas, activeTaskType]);

  const modeLokasi = React.useMemo(() => {
    if (activeTaskType?.mode_lokasi) return activeTaskType.mode_lokasi;
    if (isJenisKegiatan) return "luar_wilayah";
    if (jenisTugas.toLowerCase().includes("dalam kawasan")) return "dalam_kawasan";
    if (jenisTugas.toLowerCase().includes("perjalanan dinas")) return "luar_wilayah";
    return "tempat_saja";
  }, [activeTaskType, jenisTugas, isJenisKegiatan]);

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
      if (
        matched.kode === "jenis_kegiatan" ||
        isJenisKegiatanTask(matched.nama, matched.contoh_format)
      ) {
        if (!untukKegiatanText) {
          setUntukKegiatanText?.("Pengawasan Pekerjaan Konstruksi");
        }
      }
    }
  };

  const handleNamaKegiatanChange = (val: string) => {
    const fullMatch = val.trim().match(
      /^Melaksanakan\s+Perjalanan\s+Dinas\s+dari\s+(.+?)\s+ke\s+(.+?)\s+dalam\s+rangka\s+(.+)$/i
    );
    if (fullMatch) {
      const asal = capitalizeOfficialText(fullMatch[1].trim());
      const tujuan = capitalizeOfficialText(fullMatch[2].trim());
      let rest = fullMatch[3].trim().replace(/;$/, "");
      let tempat = "";
      const diMatch = rest.match(/^(.*?)\s+di\s+([^,;]+)$/i);
      if (diMatch) {
        rest = diMatch[1].trim();
        tempat = capitalizeOfficialText(diMatch[2].trim());
      }
      const cleanAct = capitalizeOfficialText(rest);
      setKotaAsal(asal);
      setKotaTujuan(tujuan);
      if (tempat) setTempatSpesifik(tempat);
      setNamaKegiatanText(cleanAct);
      return;
    }
    setNamaKegiatanText(val);
  };

  const previewDiktumUtama = React.useMemo(() => {
    return buildKegiatanDiktumText({
      modeLokasi,
      jenisTugas,
      kotaAsal,
      kotaTujuan,
      tempatSpesifik,
      namaKegiatanText,
      untukKegiatanText,
      contohFormat: activeTaskType?.contoh_format,
    });
  }, [modeLokasi, jenisTugas, kotaAsal, kotaTujuan, tempatSpesifik, namaKegiatanText, untukKegiatanText, activeTaskType]);

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
    <div className="bg-[var(--ds-surface)] rounded-2xl p-6 sm:p-10 shadow-sm border border-[var(--ds-border-subtle)]">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--ds-border-subtle)]">
        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={isSubmitting}
          aria-label="Kembali ke pemilihan personel"
          className="w-11 h-11 shrink-0 rounded-xl st-secondary flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-[var(--ds-fg)] tracking-tight">
            Detail Surat Tugas
          </h2>
          <p className="text-[var(--ds-fg-muted)] text-sm font-medium">
            Lengkapi rincian penugasan, jadwal kegiatan, dan pembebanan anggaran.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-8 [&_input:not([type=radio])]:text-base [&_textarea]:text-base [&_select]:text-base [&_label:has(input:focus-visible)]:outline-2 [&_label:has(input:focus-visible)]:outline-[var(--ds-accent-fg)]">
        {/* Ringkasan Pegawai */}
        <div className="bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-2xl p-4 flex gap-3 text-[var(--ds-accent-fg)]">
          <Users className="w-5 h-5 shrink-0 mt-0.5 text-[var(--ds-accent-fg)]" />
          <div className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wider text-[var(--ds-accent-fg)] mb-0.5">
              Personel yang Ditugaskan ({selectedEmployees.length} Orang)
            </span>
            <div className="text-xs font-semibold text-[var(--ds-accent-fg)] flex flex-wrap gap-x-2 gap-y-1">
              {selectedEmployees.map((e) => e.name).join(", ")}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Card Klasifikasi Jenis Tugas & Lokasi */}
          <div className="space-y-4 bg-[var(--ds-surface)] p-5 rounded-2xl border border-[var(--ds-border-subtle)]">
            <div className="space-y-1.5">
              <label htmlFor="task-type" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] block">
                JENIS TUGAS <span className="text-[var(--ds-status-danger-fg)]">*</span>
              </label>

              <select
                id="task-type"
                value={normalizeTaskTypeName(jenisTugas)}
                onChange={(e) => handleTaskTypeChange(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-bold text-[var(--ds-fg)] outline-none cursor-pointer"
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
                    <option value="Melaksanakan Kegiatan (1 Hari)">
                      Melaksanakan Kegiatan (1 Hari)
                    </option>
                    <option value="Menugaskan Staf">Menugaskan Staf</option>
                  </>
                )}
              </select>
            </div>

            {/* Input Form Sesuai Mode Lokasi */}
            {modeLokasi === "dalam_kawasan" ? (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="st-detail-field-1" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Di ( Kota / Kabupaten Wilayah Penugasan ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  <input
                    id="st-detail-field-1"
                    type="text"
                    required
                    value={kotaTujuan}
                    onChange={(e) => setKotaTujuan(e.target.value)}
                    onBlur={() => setKotaTujuan(capitalizeOfficialText(kotaTujuan))}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                    placeholder="Contoh: Kabupaten Paser"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="st-detail-field-2" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Dalam Rangka <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  <textarea
                    id="st-detail-field-2"
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => handleNamaKegiatanChange(e.target.value)}
                    onBlur={() => setNamaKegiatanText(capitalizeOfficialText(namaKegiatanText))}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)] resize-none"
                    placeholder="Contoh: Patroli kebakaran hutan"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="st-detail-field-3" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Di ( Kawasan / Lokasi Spesifik ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  <input
                    id="st-detail-field-3"
                    type="text"
                    required
                    value={tempatSpesifik}
                    onChange={(e) => setTempatSpesifik(e.target.value)}
                    onBlur={() => setTempatSpesifik(capitalizeOfficialText(tempatSpesifik))}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                    placeholder="Contoh: Cagar Alam Teluk Adang"
                  />
                </div>
              </div>
            ) : isJenisKegiatan ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="st-detail-field-4" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Dari ( Kota / Lokasi Asal ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <input
                      id="st-detail-field-4"
                      type="text"
                      required
                      value={kotaAsal}
                      onChange={(e) => setKotaAsal(e.target.value)}
                      onBlur={() => setKotaAsal(capitalizeOfficialText(kotaAsal))}
                      className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                      placeholder="Contoh: Samarinda"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="st-detail-field-5" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Ke ( Kota / Kabupaten Tujuan ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <input
                      id="st-detail-field-5"
                      type="text"
                      required
                      value={kotaTujuan}
                      onChange={(e) => setKotaTujuan(e.target.value)}
                      onBlur={() => setKotaTujuan(capitalizeOfficialText(kotaTujuan))}
                      className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                      placeholder="Contoh: Kabupaten Kutai Barat"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="st-detail-field-6" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Untuk ( Jenis Kegiatan / Tugas ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  <input
                    id="st-detail-field-6"
                    type="text"
                    required
                    value={untukKegiatanText}
                    onChange={(e) => setUntukKegiatanText?.(e.target.value)}
                    onBlur={() => setUntukKegiatanText?.(capitalizeOfficialText(untukKegiatanText))}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                    placeholder="Contoh: Pengawasan Pekerjaan Konstruksi"
                  />
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Bisa disesuaikan jika jenis pekerjaan lain (misal: Pengawasan Pekerjaan Konstruksi, Pemeriksaan Fisik BMN, dll.)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="st-detail-field-7" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Dalam Rangka ( Paket Kontrak / Pekerjaan ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        const textarea = e.currentTarget.closest(".space-y-1.5")?.querySelector("textarea");
                        if (textarea) toggleItalicInTextarea(textarea, namaKegiatanText, setNamaKegiatanText);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors cursor-pointer"
                      title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                    >
                      <Italic className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                      <span className="font-serif italic font-bold">Miringkan (*I*)</span>
                    </button>
                  </div>
                  <textarea
                    id="st-detail-field-7"
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => handleNamaKegiatanChange(e.target.value)}
                    onBlur={() => setNamaKegiatanText(capitalizeOfficialText(namaKegiatanText))}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                        e.preventDefault();
                        toggleItalicInTextarea(e.currentTarget, namaKegiatanText, setNamaKegiatanText);
                      }
                    }}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)] resize-none"
                    placeholder="Contoh: Pengelolaan kontrak sarpras"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="st-detail-field-8" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Di ( Tempat Spesifik / Lokasi Proyek )
                  </label>
                  <input
                    id="st-detail-field-8"
                    type="text"
                    value={tempatSpesifik}
                    onChange={(e) => setTempatSpesifik(e.target.value)}
                    onBlur={() => setTempatSpesifik(capitalizeOfficialText(tempatSpesifik))}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                    placeholder="Contoh: Suaka Badak Kelian"
                  />
                </div>
              </div>
            ) : modeLokasi === "luar_wilayah" ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="st-detail-field-9" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Dari ( Kota / Lokasi Asal ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <input
                      id="st-detail-field-9"
                      type="text"
                      required
                      value={kotaAsal}
                      onChange={(e) => setKotaAsal(e.target.value)}
                      onBlur={() => setKotaAsal(capitalizeOfficialText(kotaAsal))}
                      className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                      placeholder="Contoh: Samarinda"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="st-detail-field-10" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Ke ( Kota / Kabupaten Tujuan ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <input
                      id="st-detail-field-10"
                      type="text"
                      required
                      value={kotaTujuan}
                      onChange={(e) => setKotaTujuan(e.target.value)}
                      onBlur={() => setKotaTujuan(capitalizeOfficialText(kotaTujuan))}
                      className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                      placeholder="Contoh: Kabupaten Kutai Barat"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="st-detail-field-11" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Dalam Rangka <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        const textarea = e.currentTarget.closest(".space-y-1.5")?.querySelector("textarea");
                        if (textarea) toggleItalicInTextarea(textarea, namaKegiatanText, setNamaKegiatanText);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors cursor-pointer"
                      title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                    >
                      <Italic className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                      <span className="font-serif italic font-bold">Miringkan (*I*)</span>
                    </button>
                  </div>
                  <textarea
                    id="st-detail-field-11"
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => handleNamaKegiatanChange(e.target.value)}
                    onBlur={() => setNamaKegiatanText(capitalizeOfficialText(namaKegiatanText))}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                        e.preventDefault();
                        toggleItalicInTextarea(e.currentTarget, namaKegiatanText, setNamaKegiatanText);
                      }
                    }}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)] resize-none"
                    placeholder="Contoh: Inventarisasi satwa"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="st-detail-field-12" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Di ( Tempat Spesifik / Opsional )
                  </label>
                  <input
                    id="st-detail-field-12"
                    type="text"
                    value={tempatSpesifik}
                    onChange={(e) => setTempatSpesifik(e.target.value)}
                    onBlur={() => setTempatSpesifik(capitalizeOfficialText(tempatSpesifik))}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                    placeholder="Contoh: Suaka Margasatwa Kelian"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="st-detail-field-13" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Nama Kegiatan / Tugas <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        const textarea = e.currentTarget.closest(".space-y-1.5")?.querySelector("textarea");
                        if (textarea) toggleItalicInTextarea(textarea, namaKegiatanText, setNamaKegiatanText);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors cursor-pointer"
                      title="Miringkan teks terpilih (*kata*) - Ctrl+I"
                    >
                      <Italic className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                      <span className="font-serif italic font-bold">Miringkan (*I*)</span>
                    </button>
                  </div>
                  <textarea
                    id="st-detail-field-13"
                    required
                    rows={2}
                    value={namaKegiatanText}
                    onChange={(e) => handleNamaKegiatanChange(e.target.value)}
                    onBlur={() => setNamaKegiatanText(capitalizeOfficialText(namaKegiatanText))}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                        e.preventDefault();
                        toggleItalicInTextarea(e.currentTarget, namaKegiatanText, setNamaKegiatanText);
                      }
                    }}
                    className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)] resize-none"
                    placeholder="Contoh: Stok opname persediaan"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="st-detail-field-14" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Pada ( Tempat / Unit Lokasi )
                    </label>
                    <input
                      id="st-detail-field-14"
                      type="text"
                      value={tempatSpesifik}
                      onChange={(e) => setTempatSpesifik(e.target.value)}
                      onBlur={() => setTempatSpesifik(capitalizeOfficialText(tempatSpesifik))}
                      className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                      placeholder="Contoh: Kantor Balai / Tempat Kegiatan"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="st-detail-field-15" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                      Di ( Kota / Kabupaten ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
                    </label>
                    <input
                      id="st-detail-field-15"
                      type="text"
                      required
                      value={kotaTujuan}
                      onChange={(e) => setKotaTujuan(e.target.value)}
                      onBlur={() => setKotaTujuan(capitalizeOfficialText(kotaTujuan))}
                      className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] text-sm font-medium text-[var(--ds-fg)]"
                      placeholder="Contoh: Samarinda"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Generated Preview Box */}
            <div className="mt-3 p-3.5 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-xl text-[var(--ds-accent-fg)]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-accent-fg)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Pratinjau Kalimat Tugas Resmi
                </span>
                <span className="text-xs text-[var(--ds-accent-fg)] font-medium">
                  Tata Naskah Dinas KSDAE
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-[var(--ds-fg)]">
                {renderFormattedItalic(previewDiktumUtama)}
                {formData.tanggal_mulai && formData.tanggal_selesai ? (
                  formData.tanggal_mulai === formData.tanggal_selesai ? (
                    <span className="text-[var(--ds-fg-muted)] font-medium">
                      , selama 1 (satu) hari pada tanggal {formatDateIndonesian(formData.tanggal_mulai)};
                    </span>
                  ) : (
                    <span className="text-[var(--ds-fg-muted)] font-medium">
                      , selama {daysBetween(formData.tanggal_mulai, formData.tanggal_selesai)} hari terhitung mulai tanggal {formatDateIndonesian(formData.tanggal_mulai)} sampai dengan {formatDateIndonesian(formData.tanggal_selesai)};
                    </span>
                  )
                ) : ";"}
              </p>
              {previewBiayaText && (
                <p className="text-xs text-[var(--ds-fg-muted)] mt-2 pt-2 border-t border-[var(--ds-accent-soft-border)] leading-relaxed">
                  <span className="font-semibold text-[var(--ds-fg-muted)]">Pembebanan Anggaran: </span>
                  {renderFormattedItalic(previewBiayaText)}
                </p>
              )}
            </div>
          </div>

          {/* Waktu & Jadwal Pelaksanaan */}
          {isWajibSatuHari ? (
            <div className="space-y-2">
              <label htmlFor="st-detail-field-16" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] block">
                Tanggal Kegiatan ( 1 Hari ) <span className="text-[var(--ds-status-danger-fg)]">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                <input
                  id="st-detail-field-16"
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
                  className="w-full pl-11 pr-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:bg-[var(--ds-accent-fg)] focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors text-sm font-medium text-[var(--ds-fg-muted)] cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="st-detail-field-17" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] block">
                    Mulai Tanggal <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                    <input
                      id="st-detail-field-17"
                      type="date"
                      required
                      value={formData.tanggal_mulai}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_mulai: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:bg-[var(--ds-accent-fg)] focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors text-sm font-medium text-[var(--ds-fg-muted)] cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="st-detail-field-18" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] block">
                    Sampai Tanggal <span className="text-[var(--ds-status-danger-fg)]">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                    <input
                      id="st-detail-field-18"
                      type="date"
                      required
                      min={formData.tanggal_mulai}
                      value={formData.tanggal_selesai}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_selesai: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:bg-[var(--ds-accent-fg)] focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors text-sm font-medium text-[var(--ds-fg-muted)] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle Jadwal Personel Berbeda Hari */}
              {selectedEmployees.length > 1 && (
                <div className="p-4 bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-[var(--ds-status-warning-fg)]">
                        Jadwal Personel Berbeda Hari?
                      </p>
                      <p className="text-xs text-[var(--ds-status-warning-fg)] mt-0.5">
                        Aktifkan jika masing-masing pegawai memiliki tanggal tugas berbeda (Template Beda Hari).
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isBedaHari}
                      aria-label="Jadwal personel berbeda hari"
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
                        "relative inline-flex min-h-11 w-11 items-center shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)]",
                        isBedaHari ? "bg-[var(--ds-status-warning-bg)]" : "bg-[var(--ds-surface-muted)]"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--ds-surface)] shadow-md ring-0 transition duration-150 ease-out",
                          isBedaHari ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {isBedaHari && (
                    <div className="pt-2 border-t border-[var(--ds-status-warning-border)] space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-status-warning-fg)]">
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
                              className="p-3 bg-[var(--ds-surface)] border border-[var(--ds-status-warning-border)] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[var(--ds-fg)] truncate">
                                  {idx + 1}. {emp.name}
                                </p>
                                <p className="text-xs text-[var(--ds-fg-muted)] truncate">
                                  {emp.nip ? `${formatNipLabel(emp, true)} ${emp.nip}` : "Non-NIP"} • {emp.position || emp.department || "-"}
                                </p>
                              </div>
                              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 w-full md:w-auto shrink-0">
                                <div>
                                  <label htmlFor={`st-detail-field-19-${emp.id}`} className="text-[9px] font-bold text-[var(--ds-fg-muted)] uppercase block mb-1">
                                    Mulai
                                  </label>
                                  <input
                                    id={`st-detail-field-19-${emp.id}`}
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
                                    className="w-full md:w-32 px-2.5 py-1.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-lg text-xs font-medium text-[var(--ds-fg-muted)] cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`st-detail-field-20-${emp.id}`} className="text-[9px] font-bold text-[var(--ds-fg-muted)] uppercase block mb-1">
                                    Selesai
                                  </label>
                                  <input
                                    id={`st-detail-field-20-${emp.id}`}
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
                                    className="w-full md:w-32 px-2.5 py-1.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-lg text-xs font-medium text-[var(--ds-fg-muted)] cursor-pointer"
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

              {/* Alert Real-time Bentrok Jadwal Penugasan / Cuti */}
              {conflicts.length > 0 && (
                <div className="pt-2">
                  <ScheduleConflictBanner conflicts={conflicts} />
                </div>
              )}

              {/* Toggle Buruh / Tenaga Lapangan (PM) */}
              <div className="p-4 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[var(--ds-accent-fg)]">
                      Apakah ada Buruh / Tenaga Lapangan (PM)?
                    </p>
                    <p className="text-xs text-[var(--ds-accent-fg)] mt-0.5">
                      Aktifkan jika penugasan menyertakan buruh (format: Nama: <b>PM</b>, Jabatan: <b>-</b>).
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasBuruh}
                    aria-label="Sertakan buruh atau tenaga lapangan"
                    onClick={() => {
                      const nextVal = !hasBuruh;
                      setHasBuruh(nextVal);
                      if (nextVal && jumlahBuruh < 1) {
                        setJumlahBuruh(1);
                      }
                    }}
                    className={cn(
                      "relative inline-flex min-h-11 w-11 items-center shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)]",
                      hasBuruh ? "bg-[var(--ds-accent-soft)]" : "bg-[var(--ds-surface-muted)]"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--ds-surface)] shadow-md ring-0 transition duration-150 ease-out",
                        hasBuruh ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {hasBuruh && (
                  <div className="pt-3 border-t border-[var(--ds-accent-soft-border)] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <label htmlFor="worker-count" className="text-xs font-bold text-[var(--ds-accent-fg)] block">
                        Jumlah Buruh (Orang)
                      </label>
                      <p className="text-xs text-[var(--ds-accent-fg)]">
                        Berapa orang buruh yang diikutsertakan?
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setJumlahBuruh((prev) => Math.max(1, prev - 1))}
                        disabled={jumlahBuruh <= 1}
                        aria-label="Kurangi jumlah buruh"
                        className="w-11 h-11 rounded-lg bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        id="worker-count"
                        min={1}
                        max={100}
                        value={jumlahBuruh}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setJumlahBuruh(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                        }}
                        className="w-16 px-2 py-1.5 text-center bg-[var(--ds-surface)] border border-[var(--ds-accent-soft-border)] rounded-lg text-sm font-bold text-[var(--ds-fg)]"
                      />
                      <button
                        type="button"
                        onClick={() => setJumlahBuruh((prev) => Math.min(100, prev + 1))}
                        disabled={jumlahBuruh >= 100}
                        aria-label="Tambah jumlah buruh"
                        className="w-11 h-11 rounded-lg bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
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
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] block mb-2">
              Sumber Dana <span className="text-[var(--ds-status-danger-fg)]">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expenseOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-colors",
                    formData.sumber_dana === opt.id
                      ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] ring-1 ring-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)]"
                      : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
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
                        ? "border-[var(--ds-accent-soft-border)]"
                        : "border-[var(--ds-border-subtle)]"
                    )}
                  >
                    {formData.sumber_dana === opt.id && (
                      <div className="w-2.5 h-2.5 bg-[var(--ds-accent-soft)] rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold">{opt.label}</span>
                </label>
              ))}
            </div>

            {formData.sumber_dana === "other" && (
              <div className="mt-3">
                <label htmlFor="other-funding" className="block mb-2 text-xs font-bold text-[var(--ds-fg-muted)]">Nama sumber dana lainnya</label>
                <input
                  type="text"
                  id="other-funding"
                  required
                  value={formData.sumber_dana_other}
                  onChange={(e) =>
                    setFormData({ ...formData, sumber_dana_other: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors text-sm font-medium"
                  placeholder="Sebutkan sumber dana..."
                />
              </div>
            )}
          </div>

          {/* PLH Jika ada Pejabat Struktural */}
          {hasPejabatStruktural && (
            <div className="space-y-2">
              <label htmlFor="plh-search" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                Nama PLH <span className="text-[var(--ds-status-danger-fg)]">*</span>
              </label>
              <p className="text-xs text-[var(--ds-status-warning-fg)] font-medium bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] rounded-xl px-4 py-2">
                Wajib diisi karena Kepala Subbagian Tata Usaha atau Kepala Seksi melaksanakan perjalanan dinas.
              </p>
              <div className="relative" ref={plhDropdownRef} onKeyDown={(event) => {
                if (event.key === "Escape") {
                  plhDropdownRef.current?.querySelector("input")?.focus();
                  setShowPlhDropdown(false);
                }
              }}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[var(--ds-fg-muted)]" />
                  </div>
                  <input
                    type="text"
                    id="plh-search"
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown" && showPlhDropdown) {
                        const firstResult = plhDropdownRef.current?.querySelector<HTMLButtonElement>("ul button");
                        if (firstResult) {
                          event.preventDefault();
                          firstResult.focus();
                        }
                      }
                    }}
                    required={!namaPlh}
                    value={plhSearchQuery || namaPlh}
                    onChange={(e) => {
                      setPlhSearchQuery(e.target.value);
                      setNamaPlh(e.target.value);
                      setShowPlhDropdown(true);
                    }}
                    onFocus={() => setShowPlhDropdown(true)}
                    className="w-full pl-11 pr-4 py-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl focus:bg-[var(--ds-accent-fg)] focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors text-sm font-medium"
                    placeholder="Nama atau NIP PLH"
                  />
                </div>
                {showPlhDropdown &&
                  plhSearchQuery.length >= 2 &&
                  plhSearchResults.length > 0 && (
                    <div className="absolute mt-2 w-full bg-[var(--ds-surface)] rounded-2xl shadow-sm border border-[var(--ds-border-subtle)] overflow-hidden max-h-60 overflow-y-auto z-30">
                      <ul className="py-2">
                        {plhSearchResults.map((emp: Employee) => (
                          <li key={emp.id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-[var(--ds-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)] flex items-center justify-between transition-colors cursor-pointer"
                              onClick={() => {
                                plhDropdownRef.current?.querySelector("input")?.focus();
                                setNamaPlh(emp.name);
                                setPlhSearchQuery("");
                                setShowPlhDropdown(false);
                              }}
                            >
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-semibold truncate text-[var(--ds-fg-muted)]">
                                  {emp.name}
                                </span>
                                <span className="text-xs text-[var(--ds-fg-muted)] truncate mt-0.5">
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
                <div className="flex items-center gap-2 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--ds-accent-fg)] shrink-0" />
                  <span className="text-sm font-bold text-[var(--ds-accent-fg)] flex-1 truncate">
                    {namaPlh}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNamaPlh("");
                      setPlhSearchQuery("");
                    }}
                    aria-label={`Hapus PLH ${namaPlh}`}
                    className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-[var(--ds-accent-fg)] hover:text-[var(--ds-status-danger-fg)] focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tanda Setuju Kepala Seksi jika ada pegawai Seksi */}
          {hasSeksiEmployee && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                Tanda Setuju Kepala Seksi <span className="text-[var(--ds-status-danger-fg)]">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-colors",
                    tandaSetuju === "sudah"
                      ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] ring-1 ring-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)]"
                      : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
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
                      tandaSetuju === "sudah" ? "border-[var(--ds-accent-soft-border)]" : "border-[var(--ds-border-subtle)]"
                    )}
                  >
                    {tandaSetuju === "sudah" && (
                      <div className="w-2.5 h-2.5 bg-[var(--ds-accent-soft)] rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold">Sudah disetujui Kepala Seksi</span>
                </label>
                <label
                  className={cn(
                    "flex items-center p-4 border rounded-xl cursor-pointer transition-colors",
                    tandaSetuju === "belum"
                      ? "bg-[var(--ds-status-warning-bg)] border-[var(--ds-status-warning-border)] ring-1 ring-[var(--ds-status-warning-border)] text-[var(--ds-status-warning-fg)]"
                      : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
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
                      tandaSetuju === "belum" ? "border-[var(--ds-status-warning-border)]" : "border-[var(--ds-border-subtle)]"
                    )}
                  >
                    {tandaSetuju === "belum" && (
                      <div className="w-2.5 h-2.5 bg-[var(--ds-status-warning-fg)] rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold">Belum disetujui Kepala Seksi</span>
                </label>
              </div>
            </div>
          )}

          {/* Upload Dasar Surat */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
              Upload Dasar Surat{" "}
              <span className="text-[var(--ds-fg-muted)] font-normal normal-case tracking-normal ml-1">
                (Opsional, PDF/Gambar Max. 10MB)
              </span>
            </label>
            <div className="mt-2 relative">
              <input
                type="file"
                id="dasar_surat"
                aria-label="Unggah dasar surat"
                disabled={isSubmitting}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="peer sr-only"
                onChange={handleFileChange}
              />
              <label
                htmlFor="dasar_surat"
                className={cn(
                  "flex flex-col items-center justify-center st-upload w-full min-h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-colors bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]",
                  selectedFile
                    ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)]"
                    : "border-[var(--ds-border-subtle)]"
                )}
              >
                <div className="flex min-w-0 max-w-full flex-col items-center justify-center px-3 py-4">
                  {selectedFile ? (
                    <>
                      <FileText className="w-7 h-7 text-[var(--ds-accent-fg)] mb-1.5" />
                      <p className="text-xs font-bold text-[var(--ds-accent-fg)] break-all text-center max-w-full">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[var(--ds-accent-fg)] font-medium mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-[var(--ds-fg-muted)] mb-1.5" />
                      <p className="text-xs font-semibold text-[var(--ds-fg-muted)]">
                        Klik untuk upload dokumen pendukung / disposisi
                      </p>
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
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
            <label htmlFor="st-detail-field-21" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
              Keterangan Lainnya
            </label>
            <textarea
              id="st-detail-field-21"
              value={formData.keterangan}
              onChange={(e) =>
                setFormData({ ...formData, keterangan: e.target.value })
              }
              className="w-full min-h-20 p-3.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl focus:bg-[var(--ds-accent-fg)] focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors resize-none text-xs font-medium text-[var(--ds-fg)]"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 border-t border-[var(--ds-border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(1)}
            disabled={isSubmitting}
            className="min-h-12 h-auto whitespace-normal px-4 sm:px-6 rounded-xl border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] font-bold text-xs cursor-pointer"
          >
            Kembali ke Personel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || hasConflict}
            className="min-h-12 h-auto whitespace-normal px-4 sm:px-8 py-3 rounded-xl font-bold text-xs"
          >
            {isSubmitting
              ? "Mengirim Data..."
              : hasConflict
              ? "Jadwal Bentrok — Harap Perbaiki"
              : "Submit Pengajuan Surat Tugas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
