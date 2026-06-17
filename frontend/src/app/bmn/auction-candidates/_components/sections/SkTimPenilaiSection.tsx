"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SkTimPenilaiBuilder } from "../SkTimPenilaiBuilder";
import { SkTimPenilaiDocument } from "../SkTimPenilaiDocument";
import { TimPenilaiEditor } from "../TimPenilaiEditor";
import type { SkBuilderItem, SkKepalaBalai } from "../../_lib/sk-defaults";
import type {
  SkTimPenilaiMemutuskan,
  TimPenilaiAnggota,
} from "../../_lib/sk-tim-penilai-defaults";
import type { EmployeeOption } from "../../_hooks/useEmployeeOptions";

interface SkTimPenilaiSectionProps {
  skTimPenilaiNumber: string;
  setSkTimPenilaiNumber: (value: string) => void;
  skTimPenilaiKap: string;
  setSkTimPenilaiKap: (value: string) => void;
  timPenilaiMenimbang: SkBuilderItem[];
  setTimPenilaiMenimbang: (items: SkBuilderItem[]) => void;
  timPenilaiMengingat: SkBuilderItem[];
  setTimPenilaiMengingat: (items: SkBuilderItem[]) => void;
  timPenilaiMemutuskan: SkTimPenilaiMemutuskan;
  setTimPenilaiMemutuskan: (m: SkTimPenilaiMemutuskan) => void;
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: (kb: SkKepalaBalai) => void;
  timPenilaiTembusan: SkBuilderItem[];
  setTimPenilaiTembusan: (items: SkBuilderItem[]) => void;
  susunanTimPenilai: TimPenilaiAnggota[];
  employees: EmployeeOption[];
  onAddTimPenilai: () => void;
  onRemoveTimPenilai: (id: string) => void;
  onUpdateTimPenilai: (id: string, field: keyof TimPenilaiAnggota, value: string) => void;
  onSelectTimPenilaiEmployee: (id: string, employeeId: string, employees: EmployeeOption[]) => void;
  onPrint: () => void;
}

export function SkTimPenilaiSection({
  skTimPenilaiNumber,
  setSkTimPenilaiNumber,
  skTimPenilaiKap,
  setSkTimPenilaiKap,
  timPenilaiMenimbang,
  setTimPenilaiMenimbang,
  timPenilaiMengingat,
  setTimPenilaiMengingat,
  timPenilaiMemutuskan,
  setTimPenilaiMemutuskan,
  kepalaBalai,
  setKepalaBalai,
  timPenilaiTembusan,
  setTimPenilaiTembusan,
  susunanTimPenilai,
  employees,
  onAddTimPenilai,
  onRemoveTimPenilai,
  onUpdateTimPenilai,
  onSelectTimPenilaiEmployee,
  onPrint,
}: SkTimPenilaiSectionProps) {
  return (
    <section id="sk-tim-penilai-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Tim Penilai (Panitia Penaksir Harga BMN)</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Keputusan Kepala Balai tentang pembentukan Panitia Penaksir Harga BMN.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-emerald-600 text-xs hover:bg-emerald-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="SK Tim Penilai"
            prefix="SK."
            number={skTimPenilaiNumber}
            setNumber={setSkTimPenilaiNumber}
            kap={skTimPenilaiKap}
            setKap={setSkTimPenilaiKap}
          />
          <SkTimPenilaiBuilder
            menimbang={timPenilaiMenimbang}
            setMenimbang={setTimPenilaiMenimbang}
            mengingat={timPenilaiMengingat}
            setMengingat={setTimPenilaiMengingat}
            memutuskan={timPenilaiMemutuskan}
            setMemutuskan={setTimPenilaiMemutuskan}
            kepalaBalai={kepalaBalai}
            setKepalaBalai={setKepalaBalai}
            tembusan={timPenilaiTembusan}
            setTembusan={setTimPenilaiTembusan}
          />

          <TimPenilaiEditor
            susunanTimPenilai={susunanTimPenilai}
            employees={employees}
            onAdd={onAddTimPenilai}
            onRemove={onRemoveTimPenilai}
            onUpdate={onUpdateTimPenilai}
            onSelectEmployee={onSelectTimPenilaiEmployee}
          />
        </div>
        <div>
          <SkTimPenilaiDocument
            skNumber={skTimPenilaiNumber}
            skKap={skTimPenilaiKap}
            menimbang={timPenilaiMenimbang}
            mengingat={timPenilaiMengingat}
            memutuskan={timPenilaiMemutuskan}
            kepalaBalai={kepalaBalai}
            tembusan={timPenilaiTembusan}
            susunanTimPenilai={susunanTimPenilai}
          />
        </div>
      </div>
    </section>
  );
}
