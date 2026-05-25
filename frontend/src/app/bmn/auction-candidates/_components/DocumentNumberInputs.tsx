"use client";

import { formatDateLong, getSkNumberSuffix } from "../_lib/auction-helpers";

interface DocumentNumberInputsProps {
  baNumber: string;
  setBaNumber: (value: string) => void;
  baKap: string;
  setBaKap: (value: string) => void;
  skNumber: string;
  setSkNumber: (value: string) => void;
  skPanitiaNumber: string;
  setSkPanitiaNumber: (value: string) => void;
  sptjLimitNumber: string;
  setSptjLimitNumber: (value: string) => void;
  sptjmNumber: string;
  setSptjmNumber: (value: string) => void;
  spTugasNumber: string;
  setSpTugasNumber: (value: string) => void;
  skKebenaranNumber: string;
  setSkKebenaranNumber: (value: string) => void;
  baPemeriksaanNumber: string;
  setBaPemeriksaanNumber: (value: string) => void;
  stNumber: string;
  setStNumber: (value: string) => void;
  stTanggal: string;
  setStTanggal: (value: string) => void;
}

export function DocumentNumberInputs({
  baNumber,
  setBaNumber,
  baKap,
  setBaKap,
  skNumber,
  setSkNumber,
  skPanitiaNumber,
  setSkPanitiaNumber,
  sptjLimitNumber,
  setSptjLimitNumber,
  sptjmNumber,
  setSptjmNumber,
  spTugasNumber,
  setSpTugasNumber,
  skKebenaranNumber,
  setSkKebenaranNumber,
  baPemeriksaanNumber,
  setBaPemeriksaanNumber,
  stNumber,
  setStNumber,
  stTanggal,
  setStTanggal,
}: DocumentNumberInputsProps) {
  const monthSuffix = `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="ba-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Nomor Berita Acara
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">BA.</span>
            <input
              id="ba-number"
              type="text"
              value={baNumber}
              onChange={(event) => setBaNumber(event.target.value)}
              placeholder="____"
              className="mx-1 w-20 bg-transparent text-center font-semibold outline-none"
            />
            <span>/K.18/TU/</span>
            <input
              type="text"
              value={baKap}
              onChange={(event) => setBaKap(event.target.value)}
              className="w-24 bg-transparent text-center font-semibold outline-none"
            />
            <span>/B/{monthSuffix}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Bulan dan tahun otomatis mengikuti tanggal generate dokumen.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="sk-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Nomor SK Penghentian
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SK.</span>
            <input
              id="sk-number"
              type="text"
              value={skNumber}
              onChange={(event) => setSkNumber(event.target.value)}
              placeholder="____"
              className="mx-1 w-20 bg-transparent text-center font-semibold outline-none"
            />
            <span>/{getSkNumberSuffix()}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tahun otomatis mengikuti tanggal generate dokumen.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="sk-panitia-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Nomor SK Panitia Penghapusan
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SK.</span>
            <input
              id="sk-panitia-number"
              type="text"
              value={skPanitiaNumber}
              onChange={(event) => setSkPanitiaNumber(event.target.value)}
              placeholder="____"
              className="mx-1 w-20 bg-transparent text-center font-semibold outline-none"
            />
            <span>/{getSkNumberSuffix()}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tahun otomatis mengikuti tanggal generate dokumen.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label htmlFor="sptj-limit-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Nomor SPTJ Nilai Limit
          </label>
          <div className="mt-2 flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SM.</span>
            <input
              id="sptj-limit-number"
              type="text"
              value={sptjLimitNumber}
              onChange={(event) => setSptjLimitNumber(event.target.value)}
              placeholder="41"
              className="mx-1 w-16 bg-transparent text-center font-semibold outline-none"
            />
            <span className="truncate">/K.18/TU/KAP.06.01/{monthSuffix}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label htmlFor="sptjm-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Nomor SPTJM
          </label>
          <div className="mt-2 flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SPTJM.</span>
            <input
              id="sptjm-number"
              type="text"
              value={sptjmNumber}
              onChange={(event) => setSptjmNumber(event.target.value)}
              placeholder="202"
              className="mx-1 w-16 bg-transparent text-center font-semibold outline-none"
            />
            <span className="truncate">/K.18/TU/KAP.06.01/{monthSuffix}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label htmlFor="sp-tugas-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Nomor SP Tidak Mengganggu Tugas
          </label>
          <div className="mt-2 flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SM.</span>
            <input
              id="sp-tugas-number"
              type="text"
              value={spTugasNumber}
              onChange={(event) => setSpTugasNumber(event.target.value)}
              placeholder="40"
              className="mx-1 w-16 bg-transparent text-center font-semibold outline-none"
            />
            <span className="truncate">/K.18/TU/KAP.06.01/{monthSuffix}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label htmlFor="sk-kebenaran-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Nomor SK Kebenaran Dokumen
          </label>
          <div className="mt-2 flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">KT.</span>
            <input
              id="sk-kebenaran-number"
              type="text"
              value={skKebenaranNumber}
              onChange={(event) => setSkKebenaranNumber(event.target.value)}
              placeholder="200"
              className="mx-1 w-16 bg-transparent text-center font-semibold outline-none"
            />
            <span className="truncate">/K.18/TU/KAP.06.01/{monthSuffix}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 xl:col-span-2">
          <label htmlFor="ba-pemeriksaan-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Nomor BA Pemeriksaan + Surat Tugas
          </label>
          <div className="mt-2 grid gap-2 lg:grid-cols-3">
            <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
              <span className="font-semibold">BA.</span>
              <input
                id="ba-pemeriksaan-number"
                type="text"
                value={baPemeriksaanNumber}
                onChange={(event) => setBaPemeriksaanNumber(event.target.value)}
                placeholder="158"
                className="mx-1 w-14 bg-transparent text-center font-semibold outline-none"
              />
              <span className="truncate">/K.18/TU/KAP.06.01/{monthSuffix}</span>
            </div>
            <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
              <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. ST</span>
              <input
                type="text"
                value={stNumber}
                onChange={(event) => setStNumber(event.target.value)}
                placeholder="ST.xxx/K.18/TU/..."
                className="w-full bg-transparent font-semibold outline-none"
              />
            </div>
            <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
              <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tgl ST</span>
              <input
                type="text"
                value={stTanggal}
                onChange={(event) => setStTanggal(event.target.value)}
                placeholder={formatDateLong(new Date())}
                className="w-full bg-transparent font-semibold outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
