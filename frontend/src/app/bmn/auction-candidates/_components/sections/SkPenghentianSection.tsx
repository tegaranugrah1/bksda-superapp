"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkBuilder } from "../SkBuilder";
import { SkPenghentianDocument } from "../SkPenghentianDocument";
import type { AuctionAsset } from "../../_lib/auction-helpers";
import type { SkBuilderItem, SkKepalaBalai, SkMemutuskan } from "../../_lib/sk-defaults";

interface SkPenghentianSectionProps {
  assets: AuctionAsset[];
  skNumber: string;
  skKap: string;
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
  skKap,
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
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Penghentian Penggunaan BMN</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Keputusan Kepala Balai tentang penghentian penggunaan aset terpilih.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-amber-600 text-xs hover:bg-amber-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="print:hidden">
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
