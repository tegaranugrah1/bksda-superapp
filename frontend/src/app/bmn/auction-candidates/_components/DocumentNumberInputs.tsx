"use client";

import { useState } from "react";
import { ChevronDown, FileText, Settings2 } from "lucide-react";
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

interface NumberRow {
  id: string;
  label: string;
  prefix: string;
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
}

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

interface DocumentNumberInlineCardProps {
  title?: string;
  label: string;
  prefix: string;
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
  stNumber?: string;
  setStNumber?: (value: string) => void;
  stTanggal?: string;
  setStTanggal?: (value: string) => void;
}

export function DocumentNumberInlineCard({
  title = "Nomor Surat",
  label,
  prefix,
  number,
  setNumber,
  kap,
  setKap,
  stNumber,
  setStNumber,
  stTanggal,
  setStTanggal,
}: DocumentNumberInlineCardProps) {
  const monthSuffix = `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;
  const preview = `${prefix}${number || "____"}/K.18/TU/${kap || "____"}/B/${monthSuffix}`;
  const showStFields = setStNumber && setStTanggal;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{title}</p>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{label}</h3>
          <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{preview}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <label className="grid min-w-0 gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nomor</span>
          <input
            type="text"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="____"
            className={`${fieldClass} text-center`}
          />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">KAP</span>
          <input
            type="text"
            value={kap}
            onChange={(event) => setKap(event.target.value)}
            placeholder="KAP.00.00"
            className={fieldClass}
          />
        </label>
      </div>

      {showStFields && (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-200 p-3 dark:border-zinc-800">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Referensi Surat Tugas
          </p>
          <div className="grid gap-2">
            <label className="grid gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. ST</span>
              <input
                type="text"
                value={stNumber || ""}
                onChange={(event) => setStNumber(event.target.value)}
                placeholder="ST.xxx/K.18/TU/..."
                className={fieldClass}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tanggal ST</span>
              <input
                type="text"
                value={stTanggal || ""}
                onChange={(event) => setStTanggal(event.target.value)}
                placeholder={formatDateLong(new Date())}
                className={fieldClass}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberSettingRow({ row, monthSuffix }: { row: NumberRow; monthSuffix: string }) {
  const preview = `${row.prefix}${row.number || "____"}/K.18/TU/${row.kap || "____"}/B/${monthSuffix}`;

  return (
    <div className="grid gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950 lg:grid-cols-[minmax(0,1fr)_6.5rem_8rem] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{row.label}</p>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{preview}</p>
      </div>
      <label className="grid gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nomor</span>
        <input
          id={`${row.id}-number`}
          type="text"
          value={row.number}
          onChange={(event) => row.setNumber(event.target.value)}
          placeholder="____"
          className={`${fieldClass} text-center`}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">KAP</span>
        <input
          id={`${row.id}-kap`}
          type="text"
          value={row.kap}
          onChange={(event) => row.setKap(event.target.value)}
          placeholder="KAP.00.00"
          className={fieldClass}
        />
      </label>
    </div>
  );
}

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
  const rows: NumberRow[] = [
    { id: "ba", label: "BA Koreksi", prefix: "BA.", number: baNumber, setNumber: setBaNumber, kap: baKap, setKap: setBaKap },
    { id: "sk", label: "SK Penghentian", prefix: "SK.", number: skNumber, setNumber: setSkNumber, kap: skKap, setKap: setSkKap },
    { id: "sk-panitia", label: "SK Panitia", prefix: "SK.", number: skPanitiaNumber, setNumber: setSkPanitiaNumber, kap: skPanitiaKap, setKap: setSkPanitiaKap },
    { id: "sk-tim-penilai", label: "SK Tim Penilai", prefix: "SK.", number: skTimPenilaiNumber, setNumber: setSkTimPenilaiNumber, kap: skTimPenilaiKap, setKap: setSkTimPenilaiKap },
    { id: "sptj-limit", label: "SPTJ Nilai Limit", prefix: "SM.", number: sptjLimitNumber, setNumber: setSptjLimitNumber, kap: sptjLimitKap, setKap: setSptjLimitKap },
    { id: "sptjm", label: "SPTJM", prefix: "SPTJM.", number: sptjmNumber, setNumber: setSptjmNumber, kap: sptjmKap, setKap: setSptjmKap },
    { id: "sp-tugas", label: "SP Tidak Mengganggu Tugas", prefix: "SM.", number: spTugasNumber, setNumber: setSpTugasNumber, kap: spTugasKap, setKap: setSpTugasKap },
    { id: "sk-kebenaran", label: "SK Kebenaran Dokumen", prefix: "KT.", number: skKebenaranNumber, setNumber: setSkKebenaranNumber, kap: skKebenaranKap, setKap: setSkKebenaranKap },
    { id: "ba-pemeriksaan", label: "BA Pemeriksaan", prefix: "BA.", number: baPemeriksaanNumber, setNumber: setBaPemeriksaanNumber, kap: baPemeriksaanKap, setKap: setBaPemeriksaanKap },
    { id: "nota-dinas", label: "Nota Dinas KSDAE", prefix: "ND.", number: notaDinasNumber, setNumber: setNotaDinasNumber, kap: notaDinasKap, setKap: setNotaDinasKap },
    { id: "permohonan-kpknl", label: "Permohonan KPKNL", prefix: "S.", number: permohonanKpknlNumber, setNumber: setPermohonanKpknlNumber, kap: permohonanKpknlKap, setKap: setPermohonanKpknlKap },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Pengaturan Nomor Surat</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              Atur nomor dan KAP dokumen lelang dari satu tempat.
            </p>
          </div>
          <span className="hidden rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline-flex">
            12 dokumen
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <div className="grid gap-2">
            {rows.map((row) => (
              <NumberSettingRow key={row.id} row={row} monthSuffix={monthSuffix} />
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Referensi Surat Tugas (untuk BA Pemeriksaan)
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. ST</span>
                <input
                  type="text"
                  value={stNumber}
                  onChange={(event) => setStNumber(event.target.value)}
                  placeholder="ST.xxx/K.18/TU/..."
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tanggal ST</span>
                <input
                  type="text"
                  value={stTanggal}
                  onChange={(event) => setStTanggal(event.target.value)}
                  placeholder={formatDateLong(new Date())}
                  className={fieldClass}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
