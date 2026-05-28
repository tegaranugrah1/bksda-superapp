"use client";

import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { formatDateLong } from "../_lib/auction-helpers";

interface DocumentNumberInputsProps {
  baNumber: string;
  setBaNumber: (value: string) => void;
  baKap: string;
  setBaKap: (value: string) => void;
  skNumber: string;
  setSkNumber: (value: string) => void;
  skKap: string;
  setSkKap: (value: string) => void;
  skPanitiaNumber: string;
  setSkPanitiaNumber: (value: string) => void;
  skPanitiaKap: string;
  setSkPanitiaKap: (value: string) => void;
  skTimPenilaiNumber: string;
  setSkTimPenilaiNumber: (value: string) => void;
  skTimPenilaiKap: string;
  setSkTimPenilaiKap: (value: string) => void;
  sptjLimitNumber: string;
  setSptjLimitNumber: (value: string) => void;
  sptjLimitKap: string;
  setSptjLimitKap: (value: string) => void;
  sptjmNumber: string;
  setSptjmNumber: (value: string) => void;
  sptjmKap: string;
  setSptjmKap: (value: string) => void;
  spTugasNumber: string;
  setSpTugasNumber: (value: string) => void;
  spTugasKap: string;
  setSpTugasKap: (value: string) => void;
  skKebenaranNumber: string;
  setSkKebenaranNumber: (value: string) => void;
  skKebenaranKap: string;
  setSkKebenaranKap: (value: string) => void;
  baPemeriksaanNumber: string;
  setBaPemeriksaanNumber: (value: string) => void;
  baPemeriksaanKap: string;
  setBaPemeriksaanKap: (value: string) => void;
  notaDinasNumber: string;
  setNotaDinasNumber: (value: string) => void;
  notaDinasKap: string;
  setNotaDinasKap: (value: string) => void;
  permohonanKpknlNumber: string;
  setPermohonanKpknlNumber: (value: string) => void;
  permohonanKpknlKap: string;
  setPermohonanKpknlKap: (value: string) => void;
  stNumber: string;
  setStNumber: (value: string) => void;
  stTanggal: string;
  setStTanggal: (value: string) => void;
}

const inputBoxClass =
  "flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

const labelClass =
  "text-[9px] font-bold uppercase tracking-wider text-zinc-400";

export function DocumentNumberInputs({
  baNumber,
  setBaNumber,
  baKap,
  setBaKap,
  skNumber,
  setSkNumber,
  skKap,
  setSkKap,
  skPanitiaNumber,
  setSkPanitiaNumber,
  skPanitiaKap,
  setSkPanitiaKap,
  skTimPenilaiNumber,
  setSkTimPenilaiNumber,
  skTimPenilaiKap,
  setSkTimPenilaiKap,
  sptjLimitNumber,
  setSptjLimitNumber,
  sptjLimitKap,
  setSptjLimitKap,
  sptjmNumber,
  setSptjmNumber,
  sptjmKap,
  setSptjmKap,
  spTugasNumber,
  setSpTugasNumber,
  spTugasKap,
  setSpTugasKap,
  skKebenaranNumber,
  setSkKebenaranNumber,
  skKebenaranKap,
  setSkKebenaranKap,
  baPemeriksaanNumber,
  setBaPemeriksaanNumber,
  baPemeriksaanKap,
  setBaPemeriksaanKap,
  notaDinasNumber,
  setNotaDinasNumber,
  notaDinasKap,
  setNotaDinasKap,
  permohonanKpknlNumber,
  setPermohonanKpknlNumber,
  permohonanKpknlKap,
  setPermohonanKpknlKap,
  stNumber,
  setStNumber,
  stTanggal,
  setStTanggal,
}: DocumentNumberInputsProps) {
  const [open, setOpen] = useState(false);
  const monthSuffix = `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Pengaturan Nomor Surat
          </span>
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            12 dokumen
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {/* BA Koreksi */}
            <div>
              <label htmlFor="ba-number" className={labelClass}>
                BA Koreksi
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">BA.</span>
                <input
                  id="ba-number"
                  type="text"
                  value={baNumber}
                  onChange={(e) => setBaNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={baKap}
                  onChange={(e) => setBaKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SK Penghentian */}
            <div>
              <label htmlFor="sk-number" className={labelClass}>
                SK Penghentian
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">SK.</span>
                <input
                  id="sk-number"
                  type="text"
                  value={skNumber}
                  onChange={(e) => setSkNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={skKap}
                  onChange={(e) => setSkKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SK Panitia */}
            <div>
              <label htmlFor="sk-panitia-number" className={labelClass}>
                SK Panitia
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">SK.</span>
                <input
                  id="sk-panitia-number"
                  type="text"
                  value={skPanitiaNumber}
                  onChange={(e) => setSkPanitiaNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={skPanitiaKap}
                  onChange={(e) => setSkPanitiaKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SK Tim Penilai */}
            <div>
              <label htmlFor="sk-tim-penilai-number" className={labelClass}>
                SK Tim Penilai
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">SK.</span>
                <input
                  id="sk-tim-penilai-number"
                  type="text"
                  value={skTimPenilaiNumber}
                  onChange={(e) => setSkTimPenilaiNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={skTimPenilaiKap}
                  onChange={(e) => setSkTimPenilaiKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SPTJ Nilai Limit */}
            <div>
              <label htmlFor="sptj-limit-number" className={labelClass}>
                SPTJ Nilai Limit
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">SM.</span>
                <input
                  id="sptj-limit-number"
                  type="text"
                  value={sptjLimitNumber}
                  onChange={(e) => setSptjLimitNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={sptjLimitKap}
                  onChange={(e) => setSptjLimitKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SPTJM */}
            <div>
              <label htmlFor="sptjm-number" className={labelClass}>
                SPTJM
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">SPTJM.</span>
                <input
                  id="sptjm-number"
                  type="text"
                  value={sptjmNumber}
                  onChange={(e) => setSptjmNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={sptjmKap}
                  onChange={(e) => setSptjmKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SP Tidak Mengganggu Tugas */}
            <div>
              <label htmlFor="sp-tugas-number" className={labelClass}>
                SP Tidak Mengganggu Tugas
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">SM.</span>
                <input
                  id="sp-tugas-number"
                  type="text"
                  value={spTugasNumber}
                  onChange={(e) => setSpTugasNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={spTugasKap}
                  onChange={(e) => setSpTugasKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* SK Kebenaran Dokumen */}
            <div>
              <label htmlFor="sk-kebenaran-number" className={labelClass}>
                SK Kebenaran Dokumen
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">KT.</span>
                <input
                  id="sk-kebenaran-number"
                  type="text"
                  value={skKebenaranNumber}
                  onChange={(e) => setSkKebenaranNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={skKebenaranKap}
                  onChange={(e) => setSkKebenaranKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* BA Pemeriksaan */}
            <div>
              <label htmlFor="ba-pemeriksaan-number" className={labelClass}>
                BA Pemeriksaan
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">BA.</span>
                <input
                  id="ba-pemeriksaan-number"
                  type="text"
                  value={baPemeriksaanNumber}
                  onChange={(e) => setBaPemeriksaanNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={baPemeriksaanKap}
                  onChange={(e) => setBaPemeriksaanKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* Nota Dinas KSDAE */}
            <div>
              <label htmlFor="nota-dinas-number" className={labelClass}>
                Nota Dinas KSDAE
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">ND.</span>
                <input
                  id="nota-dinas-number"
                  type="text"
                  value={notaDinasNumber}
                  onChange={(e) => setNotaDinasNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={notaDinasKap}
                  onChange={(e) => setNotaDinasKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>

            {/* Permohonan KPKNL */}
            <div>
              <label htmlFor="permohonan-kpknl-number" className={labelClass}>
                Permohonan KPKNL
              </label>
              <div className={`${inputBoxClass} mt-1`}>
                <span className="font-semibold">S.</span>
                <input
                  id="permohonan-kpknl-number"
                  type="text"
                  value={permohonanKpknlNumber}
                  onChange={(e) => setPermohonanKpknlNumber(e.target.value)}
                  placeholder="____"
                  className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
                />
                <span>/K.18/TU/</span>
                <input
                  type="text"
                  value={permohonanKpknlKap}
                  onChange={(e) => setPermohonanKpknlKap(e.target.value)}
                  className="w-20 bg-transparent text-center font-semibold outline-none"
                />
                <span>/B/{monthSuffix}</span>
              </div>
            </div>
          </div>

          {/* Surat Tugas reference (hanya untuk BA Pemeriksaan) */}
          <div className="rounded-xl border border-dashed border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Referensi Surat Tugas (untuk BA Pemeriksaan)
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <div className={inputBoxClass}>
                <span className="mr-2 shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  No. ST
                </span>
                <input
                  type="text"
                  value={stNumber}
                  onChange={(e) => setStNumber(e.target.value)}
                  placeholder="ST.xxx/K.18/TU/..."
                  className="w-full bg-transparent font-semibold outline-none"
                />
              </div>
              <div className={inputBoxClass}>
                <span className="mr-2 shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  Tgl ST
                </span>
                <input
                  type="text"
                  value={stTanggal}
                  onChange={(e) => setStTanggal(e.target.value)}
                  placeholder={formatDateLong(new Date())}
                  className="w-full bg-transparent font-semibold outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
