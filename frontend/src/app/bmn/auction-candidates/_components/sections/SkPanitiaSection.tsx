"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkBuilder } from "../SkBuilder";
import { SkPanitiaDocument } from "../SkPanitiaDocument";
import { PanitiaEditor } from "../PanitiaEditor";
import type { SkBuilderItem, SkKepalaBalai, SkMemutuskan } from "../../_lib/sk-defaults";
import type { PanitiaAnggota } from "../../_lib/sk-panitia-defaults";
import type { EmployeeOption } from "../../_hooks/useEmployeeOptions";

interface SkPanitiaSectionProps {
  skPanitiaNumber: string;
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
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Panitia Penghapusan BMN</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Keputusan Kepala Balai tentang pembentukan Panitia Penghapusan BMN.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-teal-600 text-xs hover:bg-teal-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="print:hidden">
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
