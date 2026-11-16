"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SkKebenaranDokumenDocument } from "../SkKebenaranDokumenDocument";
import type { AuctionAsset } from "../../_lib/auction-helpers";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";

interface SkKebenaranSectionProps {
  assets: AuctionAsset[];
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
  kepalaBalai: SkKepalaBalai;
  onPrint: () => void;
}

export function SkKebenaranSection({ assets, number, setNumber, kap, setKap, kepalaBalai, onPrint }: SkKebenaranSectionProps) {
  return (
    <section id="sk-kebenaran-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview SK Kebenaran Fotokopi Dokumen Kepemilikan</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Surat keterangan kebenaran dokumen kepemilikan kendaraan bermotor. Tabel dapat diedit langsung.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="print:hidden">
          <DocumentNumberInlineCard
            label="SK Kebenaran Dokumen"
            prefix="KT."
            number={number}
            setNumber={setNumber}
            kap={kap}
            setKap={setKap}
          />
        </div>
        <SkKebenaranDokumenDocument
          number={number}
          kap={kap}
          assets={assets}
          kepalaBalai={kepalaBalai}
        />
      </div>
    </section>
  );
}
