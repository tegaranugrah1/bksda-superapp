"use client";

import React from "react";
import {
  Calendar,
  CalendarCheck,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DocumentTemplates } from "@/app/keuangan/_components/DocumentTemplates";
import {
  DipaConfig,
  KwitansiConfig,
  Official,
  Recipient,
  SpbConfig,
  SpdConfig,
  compactDate,
  formatIndoDateOptional,
  formatSpbyNumber,
  getRomanMonth,
  toIsoDateString,
} from "@/app/keuangan/_components/templates/shared";

export interface Step2PreviewSpjProps {
  documentCounts: Array<{ key: string; label: string; count: number; description: string }>;
  selectedDocument: string;
  setSelectedDocument: (k: string) => void;
  selectedDocumentLabel: string;
  previewRecipients: Recipient[];
  activity: { awpCode: string; name: string };
  spjName: string;
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  sptNumber: string;
  ppk: Official;
  pdo: Official;
  verifikator: Official;
  total: number;
  spbNumber: { no: string; suffix: string };
  spdNumber: { no: string; suffix: string };
  setSpdNumber?: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  spbConfig: SpbConfig;
  spdConfig: SpdConfig;
  kwitansiConfig: KwitansiConfig;
  tipeAnggaran: "FOLU" | "DIPA";
  dipaConfig: DipaConfig;
  setDipaConfig?: React.Dispatch<React.SetStateAction<DipaConfig>>;
  handleSaveSpj: (status: "Draft" | "Diajukan") => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  printDocument: () => void;
  handleDownloadExcel?: () => void;
  isDownloadingExcel?: boolean;
}

export function Step2PreviewSpj({
  documentCounts,
  selectedDocument,
  setSelectedDocument,
  selectedDocumentLabel,
  previewRecipients,
  activity,
  spjName,
  travel,
  sptNumber,
  ppk,
  pdo,
  verifikator,
  total,
  spbNumber,
  spdNumber,
  setSpdNumber,
  spbConfig,
  spdConfig,
  kwitansiConfig,
  tipeAnggaran,
  dipaConfig,
  setDipaConfig,
  handleSaveSpj,
  isSubmitting,
  isEditMode,
  printDocument,
  handleDownloadExcel,
  isDownloadingExcel = false,
}: Step2PreviewSpjProps) {
  const isSpdDepan = selectedDocument === "spd-dipa" || selectedDocument === "spd";
  const isSpby = selectedDocument === "spby-dipa" || selectedDocument === "spby";
  const isSptjb = selectedDocument === "sptjb-dipa" || selectedDocument === "sptjb";
  const isRinba = selectedDocument === "rinba-dipa" || selectedDocument === "rinba";
  const isDpRil = selectedDocument === "dp-ril-dipa" || selectedDocument.includes("dp-ril") || selectedDocument.includes("riil");
  const isNominatif = selectedDocument === "nominatif-dipa" || selectedDocument === "nominatif" || selectedDocument.includes("nominatif");

  let currentDateKey: keyof DipaConfig | null = null;
  let activeDocTitle = selectedDocumentLabel;
  let currentDateValue = "";

  if (isSpdDepan) {
    currentDateKey = "spdDate";
    activeDocTitle = "SPD Depan";
    currentDateValue = dipaConfig?.spdDate || travel.startDate || "";
  } else if (isSpby) {
    currentDateKey = "spbyDate";
    activeDocTitle = "SPBy (Surat Perintah Bayar)";
    currentDateValue = dipaConfig?.spbyDate || "";
  } else if (isSptjb) {
    currentDateKey = "sptjbDate";
    activeDocTitle = "SPTJB DIPA";
    currentDateValue = dipaConfig?.sptjbDate || "";
  } else if (isRinba) {
    currentDateKey = "rinbaDate";
    activeDocTitle = "Rinba & Rampung";
    currentDateValue = dipaConfig?.rinbaDate || "";
  } else if (isDpRil) {
    currentDateKey = "dpRilDate";
    activeDocTitle = "DP Ril (Daftar Pengeluaran Riil)";
    currentDateValue = dipaConfig?.dpRilDate || "";
  } else if (isNominatif) {
    currentDateKey = "nominatifDate";
    activeDocTitle = "Nominatif PD";
    currentDateValue = dipaConfig?.nominatifDate || "";
  }

  const updateCurrentDocDate = (val: string) => {
    if (!setDipaConfig || !currentDateKey) return;
    setDipaConfig((prev) => ({
      ...prev,
      [currentDateKey!]: val,
    }));
  };

  const applyToAllDisbursementDocs = () => {
    if (!setDipaConfig) return;
    const val = currentDateValue || "";
    setDipaConfig((prev) => ({
      ...prev,
      spbyDate: val,
      sptjbDate: val,
      rinbaDate: val,
      nominatifDate: val,
      dpRilDate: val,
    }));
    if (val) {
      toast.success(
        `Tanggal ${formatIndoDateOptional(val)} diterapkan ke semua dokumen pencairan (SPBy, SPTJB, Rinba, DP Ril, Nominatif)!`
      );
    } else {
      toast.info("Semua tanggal dokumen pencairan berhasil dikosongkan!");
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
              <FileSpreadsheet className="h-4 w-4" /> TAHAP 3
            </div>
            <h2 className="text-2xl font-bold">Review &amp; Cetak Dokumen</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih dokumen untuk melihat preview di bawahnya, lalu cetak setelah layout sesuai.
            </p>
          </div>
          {handleDownloadExcel && (
            <Button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              {isDownloadingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-emerald-200" />
              )}
              <span>Download Excel (.xlsx)</span>
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documentCounts.map((document) => (
            <button
              key={document.key}
              onClick={() => setSelectedDocument(document.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedDocument === document.key
                  ? "border-amber-400 bg-amber-50 shadow-sm dark:border-amber-600 dark:bg-amber-500/10"
                  : "border-slate-200 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet
                  className={`h-5 w-5 ${selectedDocument === document.key ? "text-amber-600" : "text-slate-400"}`}
                />
                <Badge variant="outline">{document.count} output</Badge>
              </div>
              <p className="mt-4 text-sm font-bold">{document.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{document.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* DIPA DATE CONTROLLER TOOLBAR */}
      {tipeAnggaran === "DIPA" && setDipaConfig && currentDateKey && (
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:bg-slate-900 print:hidden space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Pengaturan Tanggal Dokumen:{" "}
                  <span className="text-amber-700 dark:text-amber-400 font-extrabold">{activeDocTitle}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isSpdDepan
                    ? "Tanggal SPD dikeluarkan (KECUALI SPD Depan, tanggal default otomatis terisi dari tanggal mulai dinas)."
                    : "Tanggal pencairan/tanda tangan dokumen. Sesuai ketentuan, default dikosongkan dahulu (atau pilih tanggal jika sudah siap dicairkan)."}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {currentDateValue ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px]">
                  Terisi: {formatIndoDateOptional(currentDateValue)}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800 text-[11px]">
                  Default: Kosong
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                Pilih Tanggal:
              </label>
              <Input
                type="date"
                value={toIsoDateString(currentDateValue)}
                onChange={(e) => updateCurrentDocDate(e.target.value)}
                className="h-9 w-44 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {!isSpdDepan && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateCurrentDocDate("")}
                  disabled={!currentDateValue}
                  className="h-9 rounded-xl text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Kosongkan Tanggal
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  updateCurrentDocDate(today);
                }}
                className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Hari Ini
              </Button>

              {travel.endDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateCurrentDocDate(travel.endDate)}
                  className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Selesai Dinas ({compactDate(travel.endDate)})
                </Button>
              )}

              {isSpdDepan && travel.startDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateCurrentDocDate(travel.startDate)}
                  className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Reset ke Mulai Dinas ({compactDate(travel.startDate)})
                </Button>
              )}

              {!isSpdDepan && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyToAllDisbursementDocs}
                  className="h-9 rounded-xl text-xs text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                  Terapkan ke Semua Dokumen Pencairan
                </Button>
              )}
            </div>
          </div>

          {/* Form Pengisian Bukti SPTJB khusus saat SPTJB aktif */}
          {isSptjb && (
            <div className="pt-3 border-t border-amber-200/70 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Nomor Bukti SPTJB:
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format kolom Bukti Nomor pada tabel SPTJB. Default otomatis mengikuti bulan berjalan dengan angka romawi.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dipaConfig?.buktiSptjb !== undefined && dipaConfig.buktiSptjb !== "" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono text-[11px]">
                      {dipaConfig.buktiSptjb}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800 font-mono text-[11px]">
                      {`/${getRomanMonth(new Date())}/${new Date().getFullYear()}`} (Default)
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    Nomor Bukti:
                  </label>
                  <Input
                    type="text"
                    value={
                      dipaConfig?.buktiSptjb !== undefined
                        ? dipaConfig.buktiSptjb
                        : `/${getRomanMonth(new Date())}/${new Date().getFullYear()}`
                    }
                    onChange={(e) =>
                      setDipaConfig((prev) => ({
                        ...prev,
                        buktiSptjb: e.target.value,
                      }))
                    }
                    placeholder={`/${getRomanMonth(new Date())}/${new Date().getFullYear()}`}
                    className="h-9 w-52 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDipaConfig((prev) => ({
                      ...prev,
                      buktiSptjb: `/${getRomanMonth(new Date())}/${new Date().getFullYear()}`,
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Bulan Berjalan ({`/${getRomanMonth(new Date())}/${new Date().getFullYear()}`})
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDipaConfig((prev) => ({
                      ...prev,
                      buktiSptjb: "",
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Kosongkan
                </Button>
              </div>
            </div>
          )}

          {/* Form Pengisian Nomor SPBY khusus saat SPBY aktif */}
          {isSpby && (
            <div className="pt-3 border-t border-amber-200/70 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Nomor SPBY (Surat Perintah Bayar):
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format nomor SPBY pada header dokumen. Default dengan spasi agar dapat diisi pulpen manual.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 font-mono text-[11px]">
                    {formatSpbyNumber(dipaConfig)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mr-1 shrink-0 font-sans">
                    Nomor SPBY:
                  </label>
                  <Input
                    type="text"
                    value={dipaConfig?.spbyNo || ""}
                    onChange={(e) =>
                      setDipaConfig((prev) => ({
                        ...prev,
                        spbyNo: e.target.value,
                      }))
                    }
                    placeholder="No."
                    className="h-9 w-16 rounded-xl text-center text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-400 font-bold text-sm">/</span>
                  <Input
                    type="text"
                    value={dipaConfig?.spbyMonth !== undefined ? dipaConfig.spbyMonth : getRomanMonth(new Date())}
                    onChange={(e) =>
                      setDipaConfig((prev) => ({
                        ...prev,
                        spbyMonth: e.target.value,
                      }))
                    }
                    placeholder="Romawi"
                    className="h-9 w-20 rounded-xl text-center text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-400 font-bold text-sm">/</span>
                  <Input
                    type="text"
                    value={dipaConfig?.spbyYear !== undefined ? dipaConfig.spbyYear : new Date().getFullYear().toString()}
                    onChange={(e) =>
                      setDipaConfig((prev) => ({
                        ...prev,
                        spbyYear: e.target.value,
                      }))
                    }
                    placeholder="Tahun"
                    className="h-9 w-20 rounded-xl text-center text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDipaConfig((prev) => ({
                      ...prev,
                      spbyNo: "",
                      spbyMonth: getRomanMonth(new Date()),
                      spbyYear: new Date().getFullYear().toString(),
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Reset Default
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Atas Dasar:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-sans text-[11px]">1. Kuitansi:</span>
                  <Input
                    type="text"
                    value={dipaConfig?.spbyKuitansi || ""}
                    onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyKuitansi: e.target.value }))}
                    placeholder="Kosong (manual)"
                    className="h-8 w-28 rounded-lg text-center font-mono text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-400 font-sans text-[11px]">(Bukti Pembayaran)</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-sans text-[11px]">2. Nota/Barang Jasa:</span>
                  <Input
                    type="text"
                    value={dipaConfig?.spbyNota || ""}
                    onChange={(e) => setDipaConfig((prev) => ({ ...prev, spbyNota: e.target.value }))}
                    placeholder="Kosong (contoh: 5)"
                    className="h-8 w-28 rounded-lg text-center font-mono text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-400 font-sans text-[11px]">(Bukti Pembelian)</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Pengisian Nomor SPD khusus saat Nominatif aktif */}
          {isNominatif && (
            <div className="pt-3 border-t border-amber-200/70 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Nomor SPD (Daftar Nominatif):
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format nomor SPD pada header lembar Nominatif. Kosongkan jika ingin diisi manual dengan pulpen.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(dipaConfig?.nominatifSpd !== undefined
                    ? dipaConfig.nominatifSpd
                    : (dipaConfig?.nominatifSpdNo || dipaConfig?.nominatifSpdSuffix
                        ? `${dipaConfig.nominatifSpdNo ? `${dipaConfig.nominatifSpdNo} ` : ""}${dipaConfig.nominatifSpdSuffix || ""}`.trim()
                        : "")
                  ) ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono text-[11px]">
                      {dipaConfig?.nominatifSpd !== undefined
                        ? dipaConfig.nominatifSpd
                        : `${dipaConfig?.nominatifSpdNo ? `${dipaConfig.nominatifSpdNo} ` : ""}${dipaConfig?.nominatifSpdSuffix || ""}`.trim()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800 text-[11px]">
                      Default: Kosong (Pulpen)
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    Nomor SPD:
                  </label>
                  <Input
                    type="text"
                    value={
                      dipaConfig?.nominatifSpd !== undefined
                        ? dipaConfig.nominatifSpd
                        : (dipaConfig?.nominatifSpdNo || dipaConfig?.nominatifSpdSuffix
                            ? `${dipaConfig.nominatifSpdNo ? `${dipaConfig.nominatifSpdNo} ` : ""}${dipaConfig.nominatifSpdSuffix || ""}`.trim()
                            : "")
                    }
                    onChange={(e) =>
                      setDipaConfig?.((prev) => ({
                        ...prev,
                        nominatifSpd: e.target.value,
                      }))
                    }
                    placeholder="Kosong (manual pulpen) atau nomor SPD"
                    className="h-9 w-64 sm:w-80 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDipaConfig?.((prev) => ({
                      ...prev,
                      nominatifSpd: "",
                      nominatifSpdNo: "",
                      nominatifSpdSuffix: "",
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Kosongkan (Manual Pulpen)
                </Button>
              </div>
            </div>
          )}

          {/* Form Pengisian Nomor Lampiran SPD khusus saat RINBA aktif */}
          {isRinba && (
            <div className="pt-3 border-t border-amber-200/70 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Nomor Lampiran SPD (RINBA):
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format nomor lampiran SPD pada header dokumen RINBA. Kosongkan nomor urut jika ingin diisi manual pulpen.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 font-mono text-[11px]">
                    {(dipaConfig?.rinbaSpdNo !== undefined ? dipaConfig.rinbaSpdNo : spdNumber?.no)
                      ? `SPD. ${(dipaConfig?.rinbaSpdNo !== undefined ? dipaConfig.rinbaSpdNo : spdNumber?.no)}${dipaConfig?.rinbaSpdSuffix !== undefined ? dipaConfig.rinbaSpdSuffix : (spdNumber?.suffix || "")}`
                      : `SPD. [      ] ${dipaConfig?.rinbaSpdSuffix !== undefined ? dipaConfig.rinbaSpdSuffix : (spdNumber?.suffix || "")}`}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mr-1 shrink-0 font-sans">
                    Nomor SPD:
                  </label>
                  <span className="text-xs font-bold text-slate-500">SPD.</span>
                  <Input
                    type="text"
                    value={dipaConfig?.rinbaSpdNo !== undefined ? dipaConfig.rinbaSpdNo : (spdNumber?.no || "")}
                    onChange={(e) =>
                      setDipaConfig?.((prev) => ({
                        ...prev,
                        rinbaSpdNo: e.target.value,
                      }))
                    }
                    placeholder="No."
                    className="h-9 w-20 rounded-xl text-center text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <Input
                    type="text"
                    value={
                      dipaConfig?.rinbaSpdSuffix !== undefined
                        ? dipaConfig.rinbaSpdSuffix
                        : (spdNumber?.suffix || "/K.18-TU/KEU/01/2026")
                    }
                    onChange={(e) =>
                      setDipaConfig?.((prev) => ({
                        ...prev,
                        rinbaSpdSuffix: e.target.value,
                      }))
                    }
                    placeholder="/K.18-TU/KEU/..."
                    className="h-9 w-52 sm:w-64 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDipaConfig?.((prev) => ({
                      ...prev,
                      rinbaSpdNo: "",
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Kosongkan No. (Manual Pulpen)
                </Button>

                {spdNumber?.suffix && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDipaConfig?.((prev) => ({
                        ...prev,
                        rinbaSpdNo: spdNumber.no || "",
                        rinbaSpdSuffix: spdNumber.suffix || "",
                      }))
                    }
                    className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    Ikuti No. SPD Depan
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Form Pengisian Nomor SPD khusus saat SPD Depan aktif */}
          {isSpdDepan && (
            <div className="pt-3 border-t border-amber-200/70 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Nomor Surat Perjalanan Dinas (SPD):
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format nomor SPD pada header lembar SPD Depan. Default nomor urut dikosongkan untuk diisi manual dengan pulpen.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 font-mono text-[11px]">
                    {spdNumber?.no
                      ? `SPD. ${spdNumber.no}${spdNumber.suffix || ""}`
                      : `SPD. [      ] ${spdNumber?.suffix || ""}`}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mr-1 shrink-0 font-sans">
                    Nomor SPD:
                  </label>
                  <span className="text-xs font-bold text-slate-500">SPD.</span>
                  <Input
                    type="text"
                    value={spdNumber?.no || ""}
                    onChange={(e) =>
                      setSpdNumber?.((prev) => ({
                        ...prev,
                        no: e.target.value,
                      }))
                    }
                    placeholder="No."
                    className="h-9 w-20 rounded-xl text-center text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <Input
                    type="text"
                    value={spdNumber?.suffix || ""}
                    onChange={(e) =>
                      setSpdNumber?.((prev) => ({
                        ...prev,
                        suffix: e.target.value,
                      }))
                    }
                    placeholder="/K.18-TU/KEU/..."
                    className="h-9 w-52 sm:w-64 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSpdNumber?.((prev) => ({
                      ...prev,
                      no: "",
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Kosongkan No. (Manual Pulpen)
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSpdNumber?.((prev) => ({
                      ...prev,
                      suffix: `/K.18-TU/KEU/01/${new Date().getFullYear()}`,
                    }))
                  }
                  className="h-9 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Suffix Tahun Berjalan
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <DocumentTemplates
        selectedDocument={selectedDocument}
        recipients={previewRecipients}
        activity={{
          awpCode: activity.awpCode,
          name: activity.name.trim() || spjName.trim(),
        }}
        travel={travel}
        sptNumber={sptNumber}
        ppk={ppk}
        pdo={pdo}
        verifikator={verifikator}
        total={total}
        spbNumber={spbNumber}
        spdNumber={spdNumber}
        spbConfig={spbConfig}
        spdConfig={spdConfig}
        kwitansiConfig={kwitansiConfig}
        tipeAnggaran={tipeAnggaran}
        dipaConfig={dipaConfig}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        <Button
          variant="outline"
          className="h-11 rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700"
          onClick={() => handleSaveSpj("Draft")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4 text-slate-500" />
          )}
          {isEditMode ? "Simpan Perubahan Draft" : "Simpan sebagai Draft"}
        </Button>
        <Button
          className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
          onClick={() => handleSaveSpj("Diajukan")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {isEditMode ? "Simpan & Ajukan SPJ" : "Simpan & Ajukan SPJ"}
        </Button>
        {handleDownloadExcel && (
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-emerald-600/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 font-semibold text-xs transition-all shadow-xs"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
          >
            {isDownloadingExcel ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            Download Excel (.xlsx)
          </Button>
        )}
        <Button className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white" onClick={printDocument}>
          <Printer className="mr-2 h-4 w-4" /> Print {selectedDocumentLabel}
        </Button>
      </div>
    </section>
  );
}
