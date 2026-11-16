"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CorrectionDocument } from "../BaKoreksiDocument";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import type { AuctionAsset } from "../../_lib/auction-helpers";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";

interface BaKoreksiSectionProps {
  assets: AuctionAsset[];
  baNumber: string;
  setBaNumber: (value: string) => void;
  baKap: string;
  setBaKap: (value: string) => void;
  kepalaBalai: SkKepalaBalai;
  onPrint: () => void;
}

export function BaKoreksiSection({
  assets,
  baNumber,
  setBaNumber,
  baKap,
  setBaKap,
  kepalaBalai,
  onPrint,
}: BaKoreksiSectionProps) {
  return (
    <section id="ba-koreksi-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview BA Koreksi Kondisi</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Dokumen pertama untuk aset terpilih: Rusak Ringan menjadi Rusak Berat.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="BA Koreksi"
            prefix="BA."
            number={baNumber}
            setNumber={setBaNumber}
            kap={baKap}
            setKap={setBaKap}
          />
        </div>
        <CorrectionDocument assets={assets} baNumber={baNumber} baKap={baKap} kepalaBalai={kepalaBalai} />
      </div>
    </section>
  );
}
