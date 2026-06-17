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
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Kebenaran Fotokopi Dokumen Kepemilikan</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Surat keterangan kebenaran dokumen kepemilikan kendaraan bermotor. Tabel dapat diedit langsung.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-cyan-600 text-xs hover:bg-cyan-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
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
