"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SkBuilder } from "../SkBuilder";
import { SkPanitiaDocument } from "../SkPanitiaDocument";
import { PanitiaEditor } from "../PanitiaEditor";
import type { SkBuilderItem, SkKepalaBalai, SkMemutuskan } from "../../_lib/sk-defaults";
import type { PanitiaAnggota } from "../../_lib/sk-panitia-defaults";
import type { EmployeeOption } from "../../_hooks/useEmployeeOptions";

interface SkPanitiaSectionProps {
  skPanitiaNumber: string;
  setSkPanitiaNumber: (value: string) => void;
  skPanitiaKap: string;
  setSkPanitiaKap: (value: string) => void;
  panitiaMenimbang: SkBuilderItem[];
  setPanitiaMenimbang: (items: SkBuilderItem[]) => void;
  panitiaMengingat: SkBuilderItem[];
  setPanitiaMengingat: (items: SkBuilderItem[]) => void;
  panitiaMemutuskan: SkMemutuskan;
  setPanitiaMemutuskan: (m: SkMemutuskan) => void;
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: (kb: SkKepalaBalai) => void;
  panitiaTembusan: SkBuilderItem[];
  setPanitiaTembusan: (items: SkBuilderItem[]) => void;
  susunanPanitia: PanitiaAnggota[];
  employees: EmployeeOption[];
  onAddPanitia: () => void;
  onRemovePanitia: (id: string) => void;
  onUpdatePanitia: (id: string, field: keyof PanitiaAnggota, value: string) => void;
  onSelectPanitiaEmployee: (id: string, employeeId: string, employees: EmployeeOption[]) => void;
  onPrint: () => void;
}

export function SkPanitiaSection({
  skPanitiaNumber,
  setSkPanitiaNumber,
  skPanitiaKap,
  setSkPanitiaKap,
  panitiaMenimbang,
  setPanitiaMenimbang,
  panitiaMengingat,
  setPanitiaMengingat,
  panitiaMemutuskan,
  setPanitiaMemutuskan,
  kepalaBalai,
  setKepalaBalai,
  panitiaTembusan,
  setPanitiaTembusan,
  susunanPanitia,
  employees,
  onAddPanitia,
  onRemovePanitia,
  onUpdatePanitia,
  onSelectPanitiaEmployee,
  onPrint,
}: SkPanitiaSectionProps) {
  return (
    <section id="sk-panitia-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview SK Panitia Penghapusan BMN</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Keputusan Kepala Balai tentang pembentukan Panitia Penghapusan BMN.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="SK Panitia"
            prefix="SK."
            number={skPanitiaNumber}
            setNumber={setSkPanitiaNumber}
            kap={skPanitiaKap}
            setKap={setSkPanitiaKap}
          />
          <SkBuilder
            menimbang={panitiaMenimbang}
            setMenimbang={setPanitiaMenimbang}
            mengingat={panitiaMengingat}
            setMengingat={setPanitiaMengingat}
            memutuskan={panitiaMemutuskan}
            setMemutuskan={setPanitiaMemutuskan}
            kepalaBalai={kepalaBalai}
            setKepalaBalai={setKepalaBalai}
            tembusan={panitiaTembusan}
            setTembusan={setPanitiaTembusan}
          />

          <PanitiaEditor
            susunanPanitia={susunanPanitia}
            employees={employees}
            onAdd={onAddPanitia}
            onRemove={onRemovePanitia}
            onUpdate={onUpdatePanitia}
            onSelectEmployee={onSelectPanitiaEmployee}
          />
        </div>
        <div>
          <SkPanitiaDocument
            skNumber={skPanitiaNumber}
            skKap={skPanitiaKap}
            menimbang={panitiaMenimbang}
            mengingat={panitiaMengingat}
            memutuskan={panitiaMemutuskan}
            kepalaBalai={kepalaBalai}
            tembusan={panitiaTembusan}
            susunanPanitia={susunanPanitia}
          />
        </div>
      </div>
    </section>
  );
}
