"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SpTugasDocument } from "../SpTugasDocument";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";

interface SpTugasSectionProps {
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
  kepalaBalai: SkKepalaBalai;
  onPrint: () => void;
}

export function SpTugasSection({ number, setNumber, kap, setKap, kepalaBalai, onPrint }: SpTugasSectionProps) {
  return (
    <section id="sp-tugas-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview Surat Pernyataan Tidak Mengganggu Kelancaran Tugas</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pernyataan bahwa pemindahtanganan BMN tidak mengganggu kelancaran tugas dinas.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-pink-600 text-xs hover:bg-pink-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="print:hidden">
          <DocumentNumberInlineCard
            label="SP Tidak Mengganggu Tugas"
            prefix="SM."
            number={number}
            setNumber={setNumber}
            kap={kap}
            setKap={setKap}
          />
        </div>
        <SpTugasDocument number={number} kap={kap} kepalaBalai={kepalaBalai} />
      </div>
    </section>
  );
}
