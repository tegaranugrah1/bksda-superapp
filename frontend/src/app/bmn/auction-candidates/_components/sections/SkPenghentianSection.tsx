"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { SkBuilder } from "../SkBuilder";
import { SkPenghentianDocument } from "../SkPenghentianDocument";
import type { AuctionAsset } from "../../_lib/auction-helpers";
import type { SkBuilderItem, SkKepalaBalai, SkMemutuskan } from "../../_lib/sk-defaults";

interface SkPenghentianSectionProps {
  assets: AuctionAsset[];
  skNumber: string;
  setSkNumber: (value: string) => void;
  skKap: string;
  setSkKap: (value: string) => void;
  menimbang: SkBuilderItem[];
  setMenimbang: (items: SkBuilderItem[]) => void;
  mengingat: SkBuilderItem[];
  setMengingat: (items: SkBuilderItem[]) => void;
  memutuskan: SkMemutuskan;
  setMemutuskan: (m: SkMemutuskan) => void;
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: (kb: SkKepalaBalai) => void;
  tembusan: SkBuilderItem[];
  setTembusan: (items: SkBuilderItem[]) => void;
  onPrint: () => void;
}

export function SkPenghentianSection({
  assets,
  skNumber,
  setSkNumber,
  skKap,
  setSkKap,
  menimbang,
  setMenimbang,
  mengingat,
  setMengingat,
  memutuskan,
  setMemutuskan,
  kepalaBalai,
  setKepalaBalai,
  tembusan,
  setTembusan,
  onPrint,
}: SkPenghentianSectionProps) {
  return (
    <section id="sk-penghentian-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview SK Penghentian Penggunaan BMN</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Keputusan Kepala Balai tentang penghentian penggunaan aset terpilih.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="SK Penghentian"
            prefix="SK."
            number={skNumber}
            setNumber={setSkNumber}
            kap={skKap}
            setKap={setSkKap}
          />
          <SkBuilder
            menimbang={menimbang}
            setMenimbang={setMenimbang}
            mengingat={mengingat}
            setMengingat={setMengingat}
            memutuskan={memutuskan}
            setMemutuskan={setMemutuskan}
            kepalaBalai={kepalaBalai}
            setKepalaBalai={setKepalaBalai}
            tembusan={tembusan}
            setTembusan={setTembusan}
          />
        </div>
        <div>
          <SkPenghentianDocument
            assets={assets}
            skNumber={skNumber}
            skKap={skKap}
            menimbang={menimbang}
            mengingat={mengingat}
            memutuskan={memutuskan}
            kepalaBalai={kepalaBalai}
            tembusan={tembusan}
          />
        </div>
      </div>
    </section>
  );
}
