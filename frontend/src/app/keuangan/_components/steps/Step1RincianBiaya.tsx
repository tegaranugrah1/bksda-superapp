"use client";

import React from "react";
import { FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FinanceEmployee } from "@/app/keuangan/_components/finance-data";
import {
  DipaConfig,
  KwitansiConfig,
  MengetahuiOfficial,
  Official,
  RecipientRow,
  SATUAN_KERJA,
  SpbConfig,
  SpdConfig,
} from "@/app/keuangan/_components/templates/shared";
import { Step1DipaTabs } from "./Step1DipaTabs";
import { Step1FoluTabs } from "./Step1FoluTabs";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

export interface Step1RincianBiayaProps {
  tipeAnggaran: "FOLU" | "DIPA";
  activity: { awpCode: string; name: string };
  setActivity: React.Dispatch<React.SetStateAction<{ awpCode: string; name: string }>>;
  spjName: string;
  recipients: RecipientRow[];
  setRecipients: React.Dispatch<React.SetStateAction<RecipientRow[]>>;
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  activeDipaTab: "nominatif" | "sptb" | "rinba" | "spby" | "spd";
  setActiveDipaTab: (t: "nominatif" | "sptb" | "rinba" | "spby" | "spd") => void;
  activeFoluTab: "rekap" | "spb" | "kwitansi" | "rinba" | "spd";
  setActiveFoluTab: (t: "rekap" | "spb" | "kwitansi" | "rinba" | "spd") => void;
  total: number;
  ppk: Official;
  setPpk: (o: Official) => void;
  pdo: Official;
  setPdo: (o: Official) => void;
  verifikator: Official;
  setVerifikator: (o: Official) => void;
  allEmployees: FinanceEmployee[];
  dipaConfig: DipaConfig;
  setDipaConfig: React.Dispatch<React.SetStateAction<DipaConfig>>;
  defaultEvidenceSuffix: string;
  setDefaultEvidenceSuffix: (v: string) => void;
  spbNumber: { no: string; suffix: string };
  setSpbNumber: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  spdNumber: { no: string; suffix: string };
  setSpdNumber: React.Dispatch<React.SetStateAction<{ no: string; suffix: string }>>;
  spbConfig: SpbConfig;
  setSpbConfig: React.Dispatch<React.SetStateAction<SpbConfig>>;
  spdConfig: SpdConfig;
  setSpdConfig: React.Dispatch<React.SetStateAction<SpdConfig>>;
  kwitansiConfig: KwitansiConfig;
  setKwitansiConfig: React.Dispatch<React.SetStateAction<KwitansiConfig>>;
  pejabatMengetahuiList: MengetahuiOfficial[];
}

export function Step1RincianBiaya({
  tipeAnggaran,
  activity,
  setActivity,
  spjName,
  recipients,
  setRecipients,
  travel,
  activeDipaTab,
  setActiveDipaTab,
  activeFoluTab,
  setActiveFoluTab,
  total,
  ppk,
  setPpk,
  pdo,
  setPdo,
  verifikator,
  setVerifikator,
  allEmployees,
  dipaConfig,
  setDipaConfig,
  defaultEvidenceSuffix,
  setDefaultEvidenceSuffix,
  spbNumber,
  setSpbNumber,
  spdNumber,
  setSpdNumber,
  spbConfig,
  setSpbConfig,
  spdConfig,
  setSpdConfig,
  kwitansiConfig,
  setKwitansiConfig,
  pejabatMengetahuiList,
}: Step1RincianBiayaProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
              <FileSpreadsheet className="h-4 w-4" /> TAHAP 2
            </div>
            <h2 className="text-2xl font-bold">{tipeAnggaran === "DIPA" ? "REKAP DIPA" : "REKAP"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {tipeAnggaran === "DIPA"
                ? "Pertanggungjawaban Biaya Perjalanan Dinas DIPA Balai KSDA — satu dokumen dengan banyak baris penerima."
                : "Surat Pernyataan Tanggung Jawab Belanja — satu dokumen dengan banyak baris penerima."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              {recipients.length} penerima
            </Badge>
          </div>
        </div>

        {tipeAnggaran !== "DIPA" && (
          <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800/60">
            <InfoRow label="Nama Satuan Kerja" value={dipaConfig.namaSatker || SATUAN_KERJA} />
            <Field label="Kode AWP">
              <Input
                value={activity.awpCode || ""}
                onChange={(e) => setActivity({ ...activity, awpCode: e.target.value })}
                className="rounded-xl bg-white font-mono text-xs"
                placeholder="C.1.1.2.01"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Nama Kegiatan">
                <Input
                  value={activity.name || ""}
                  onChange={(e) => setActivity({ ...activity, name: e.target.value })}
                  className="rounded-xl bg-white font-medium text-xs"
                  placeholder="Operasionalisasi SMART Patrol di KSA, KPA dan TB"
                />
                <span className="mt-1 block text-[11px] text-slate-400 font-normal">
                  Nama kegiatan yang tercantum pada dokumen SPTJB / REKAP.
                </span>
              </Field>
            </div>
          </div>
        )}

        {/* 5-TAB NAVIGATION FOR DIPA OR FOLU */}
        {tipeAnggaran === "DIPA" ? (
          <Step1DipaTabs
            recipients={recipients}
            setRecipients={setRecipients}
            travel={travel}
            activeDipaTab={activeDipaTab}
            setActiveDipaTab={setActiveDipaTab}
            ppk={ppk}
            setPpk={setPpk}
            pdo={pdo}
            setPdo={setPdo}
            verifikator={verifikator}
            setVerifikator={setVerifikator}
            allEmployees={allEmployees}
            dipaConfig={dipaConfig}
            setDipaConfig={setDipaConfig}
            defaultEvidenceSuffix={defaultEvidenceSuffix}
            setDefaultEvidenceSuffix={setDefaultEvidenceSuffix}
            spbNumber={spbNumber}
            setSpbNumber={setSpbNumber}
            spdNumber={spdNumber}
            setSpdNumber={setSpdNumber}
            activity={activity}
            spjName={spjName}
          />
        ) : (
          <Step1FoluTabs
            recipients={recipients}
            setRecipients={setRecipients}
            travel={travel}
            total={total}
            activeFoluTab={activeFoluTab}
            setActiveFoluTab={setActiveFoluTab}
            defaultEvidenceSuffix={defaultEvidenceSuffix}
            setDefaultEvidenceSuffix={setDefaultEvidenceSuffix}
            ppk={ppk}
            setPpk={setPpk}
            pdo={pdo}
            setPdo={setPdo}
            verifikator={verifikator}
            setVerifikator={setVerifikator}
            allEmployees={allEmployees}
            spbNumber={spbNumber}
            setSpbNumber={setSpbNumber}
            spdNumber={spdNumber}
            setSpdNumber={setSpdNumber}
            spbConfig={spbConfig}
            setSpbConfig={setSpbConfig}
            spdConfig={spdConfig}
            setSpdConfig={setSpdConfig}
            kwitansiConfig={kwitansiConfig}
            setKwitansiConfig={setKwitansiConfig}
            pejabatMengetahuiList={pejabatMengetahuiList}
            activity={activity}
            spjName={spjName}
          />
        )}
      </div>
    </section>
  );
}
