"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileCheck2,
  Loader2,
  RefreshCw,
  Search,
  Check,
} from "lucide-react";
import {
  ApiSuratTugas,
  isSameEmployee,
} from "@/app/keuangan/_components/templates/shared";
import { FinanceEmployee } from "@/app/keuangan/_components/finance-data";

export interface Step0IdentitasStProps {
  tipeAnggaran: "FOLU" | "DIPA";
  spjName: string;
  setSpjName: (v: string) => void;
  nomorSpj: string;
  setNomorSpj: (v: string) => void;
  source: "linked" | "manual";
  setSource: (v: "linked" | "manual") => void;
  sptSearch: string;
  setSptSearch: (v: string) => void;
  employeeSearch: string;
  setEmployeeSearch: (v: string) => void;
  sptNumber: string;
  setSptNumber: (v: string) => void;
  selectedStId: string;
  foluLetters: ApiSuratTugas[];
  isLoadingLetters: boolean;
  isLoadingEmployees: boolean;
  displayedEmployees: FinanceEmployee[];
  selectedEmployees: FinanceEmployee[];
  onSelectSuratTugas: (letter: ApiSuratTugas) => void;
  onToggleEmployee: (emp: FinanceEmployee) => void;
  onRefreshSuratTugas: () => void;
}

export function Step0IdentitasSt({
  tipeAnggaran,
  spjName,
  setSpjName,
  nomorSpj,
  setNomorSpj,
  source,
  setSource,
  sptSearch,
  setSptSearch,
  employeeSearch,
  setEmployeeSearch,
  sptNumber,
  setSptNumber,
  selectedStId,
  foluLetters,
  isLoadingLetters,
  isLoadingEmployees,
  displayedEmployees,
  selectedEmployees,
  onSelectSuratTugas,
  onToggleEmployee,
  onRefreshSuratTugas,
}: Step0IdentitasStProps) {
  const filteredFoluLetters = foluLetters.filter((letter) => {
    if (!sptSearch.trim()) return true;
    const q = sptSearch.toLowerCase();
    const noMatch = (letter.nomor_surat || "").toLowerCase().includes(q);
    const tujuanMatch = (letter.maksud_tujuan || "").toLowerCase().includes(q);
    const tempatMatch = (letter.tempat_tujuan || "").toLowerCase().includes(q);
    const empMatch = (letter.employees || []).some((e) => e.nama_lengkap.toLowerCase().includes(q));
    return noMatch || tujuanMatch || tempatMatch || empMatch;
  });

  return (
    <section className="space-y-6 print:hidden">
      {/* Identitas SPJ: Nama SPJ dan Nomor SPJ Berdampingan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-base font-bold">Identitas SPJ</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Nama kegiatan dan nomor SPJ yang akan tercantum pada seluruh berkas pertanggungjawaban belanja.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold">
              Nama SPJ <span className="text-red-500">*</span>
            </label>
            <Input
              value={spjName || ""}
              onChange={(e) => setSpjName(e.target.value)}
              className="mt-1.5 rounded-xl bg-white font-medium text-xs"
              placeholder={
                tipeAnggaran === "DIPA"
                  ? "Contoh: Perjalanan Dinas dalam rangka tugas operasional balai"
                  : "Contoh: Smart Patrol di Suaka Marga Satwa Kelian"
              }
            />
            <span className="mt-1 block text-[11px] text-slate-400 font-normal">
              Nama SPJ utama yang akan tersimpan saat di-save.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold flex items-center justify-between">
              <span>Nomor SPJ</span>
              <span className="text-[10px] text-amber-600 font-normal">Dapat diedit</span>
            </label>
            <Input
              value={nomorSpj || ""}
              onChange={(e) => setNomorSpj(e.target.value)}
              className="mt-1.5 rounded-xl font-mono text-xs font-bold text-amber-800 dark:text-amber-300"
              placeholder={
                tipeAnggaran === "DIPA"
                  ? "SPJ.001/K.18/TU/KEU/VIII/2026"
                  : "SPJ.001/K.18/TU/FOLU-NC-23/VIII/2026"
              }
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    tipeAnggaran === "DIPA"
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  }
                >
                  {tipeAnggaran === "DIPA" ? "DIPA Balai KSDA" : "Khusus Dana FOLU"}
                </Badge>
                {isLoadingLetters && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
              </div>
              <h2 className="mt-2 font-bold text-base">Surat Tugas (SPT Panduan)</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Pilih Surat Tugas aktif yang dibiayai oleh dana{" "}
                <b>{tipeAnggaran === "DIPA" ? "DIPA Balai KSDA" : "FOLU NC 2&3"}</b> untuk otomatis
                mengisi personil, rute, dan jadwal.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-700"
              onClick={onRefreshSuratTugas}
              title="Muat ulang surat tugas"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingLetters ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {([
              ["linked", "Pilih dari Database FOLU"],
              ["manual", "Isi manual"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSource(value)}
                className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                  source === value
                    ? "bg-white text-amber-700 shadow-sm dark:bg-slate-700 dark:text-amber-300"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {source === "linked" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={sptSearch || ""}
                  onChange={(event) => setSptSearch(event.target.value)}
                  placeholder="Cari nomor ST, kegiatan, atau personil..."
                  className="rounded-xl pl-9 text-xs"
                />
              </div>

              {isLoadingLetters ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600 mb-2" />
                  Memuat Surat Tugas Dana {tipeAnggaran}...
                </div>
              ) : filteredFoluLetters.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                  <p className="font-semibold">Tidak ada Surat Tugas dengan sumber dana {tipeAnggaran}.</p>
                  <p className="mt-1 text-slate-400">
                    Pastikan Surat Tugas dibuat dengan sumber dana {tipeAnggaran} di menu Kepegawaian.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-lg text-xs"
                    onClick={() => setSource("manual")}
                  >
                    Beralih ke Input Manual
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-95 overflow-y-auto pr-1">
                  {filteredFoluLetters.map((letter) => {
                    const isSelected = selectedStId === letter.id || sptNumber === letter.nomor_surat;
                    const employeeNames =
                      letter.employees?.map((e) => e.nama_lengkap).join(", ") || "Tidak ada pegawai";

                    return (
                      <button
                        key={letter.id}
                        type="button"
                        onClick={() => onSelectSuratTugas(letter)}
                        className={`w-full rounded-xl border p-3.5 text-left text-xs transition relative ${
                          isSelected
                            ? "border-amber-400 bg-amber-50/90 text-amber-950 shadow-sm dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-100"
                            : "border-slate-200 hover:border-amber-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
                            <FileCheck2 className="h-4 w-4 shrink-0 text-amber-600" />
                            <span className="truncate">{letter.nomor_surat}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              letter.status === "approved"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 shrink-0 text-[10px]"
                                : "border-amber-300 bg-amber-50 text-amber-700 shrink-0 text-[10px]"
                            }
                          >
                            {letter.status === "approved" ? "Disetujui" : letter.status}
                          </Badge>
                        </div>

                        <p className="mt-2 font-medium line-clamp-2 text-slate-700 dark:text-slate-300 leading-snug">
                          {letter.maksud_tujuan || "Pelaksanaan tugas lapangan"}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>📍 {letter.tempat_tujuan || "Kab. Kutai Barat"}</span>
                          <span>
                            📅 {letter.tanggal_mulai || "-"} s.d {letter.tanggal_selesai || "-"}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Personil:{" "}
                          </span>
                          <span className="line-clamp-1">{employeeNames}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold">Nomor SPT Panduan</label>
            <Input
              value={sptNumber || ""}
              onChange={(event) => setSptNumber(event.target.value)}
              className="mt-1.5 rounded-xl font-mono text-xs"
              placeholder="ST.685/K.18/TU/..."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base">Personil Perjalanan Dinas</h2>
                {isLoadingEmployees && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {source === "linked"
                  ? "Personil otomatis mengikuti nama orang yang ada di SPT."
                  : "Pilih personil perjalanan dinas secara manual dari daftar pegawai di kepegawaian."}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0"
            >
              {selectedEmployees.length} Terpilih
            </Badge>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={employeeSearch || ""}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              placeholder={
                source === "linked" ? "Cari / tambah personil lain..." : "Cari nama atau NIP pegawai..."
              }
              className="rounded-xl pl-9 text-xs"
            />
          </div>

          <div className="space-y-2 flex-1 max-h-95 overflow-y-auto pr-1">
            {displayedEmployees.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                {source === "linked"
                  ? "Tidak ada data personil pada Surat Tugas ini."
                  : "Tidak ada pegawai yang cocok dengan pencarian."}
              </div>
            ) : (
              displayedEmployees.map((employee) => {
                const checked = selectedEmployees.some((item) => isSameEmployee(item, employee));
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => onToggleEmployee(employee)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      checked
                        ? "border-amber-400 bg-amber-50/70 dark:border-amber-600 dark:bg-amber-500/10 shadow-xs"
                        : "border-slate-200 hover:border-amber-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        checked
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="block text-sm truncate">{employee.name}</strong>
                        {checked && (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0 h-4"
                          >
                            Tercentang
                          </Badge>
                        )}
                      </div>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        NIP {employee.nip} · {employee.rank}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {employee.position} · {employee.destination}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
