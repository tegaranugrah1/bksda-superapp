"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SptjmDocument } from "../SptjmDocument";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";

interface SptjmSectionProps {
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
  kepalaBalai: SkKepalaBalai;
  onPrint: () => void;
}

export function SptjmSection({ number, setNumber, kap, setKap, kepalaBalai, onPrint }: SptjmSectionProps) {
  return (
    <section id="sptjm-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Pernyataan tanggung jawab mutlak atas usulan pemindahtanganan BMN.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="SPTJM"
            prefix="SPTJM."
            number={number}
            setNumber={setNumber}
            kap={kap}
            setKap={setKap}
          />
        </div>
        <SptjmDocument number={number} kap={kap} kepalaBalai={kepalaBalai} />
      </div>
    </section>
  );
}
