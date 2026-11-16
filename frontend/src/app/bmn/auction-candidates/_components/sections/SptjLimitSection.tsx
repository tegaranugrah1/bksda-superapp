"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SptjLimitDocument } from "../SptjLimitDocument";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";

interface SptjLimitSectionProps {
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
  kepalaBalai: SkKepalaBalai;
  onPrint: () => void;
}

export function SptjLimitSection({ number, setNumber, kap, setKap, kepalaBalai, onPrint }: SptjLimitSectionProps) {
  return (
    <section id="sptj-limit-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview Surat Pernyataan Tanggung Jawab Nilai Limit</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Pernyataan tanggung jawab Kepala Balai atas kebenaran nilai limit penjualan BMN.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="SPTJ Nilai Limit"
            prefix="SM."
            number={number}
            setNumber={setNumber}
            kap={kap}
            setKap={setKap}
          />
        </div>
        <SptjLimitDocument number={number} kap={kap} kepalaBalai={kepalaBalai} />
      </div>
    </section>
  );
}
