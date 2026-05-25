"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CorrectionDocument } from "../BaKoreksiDocument";
import type { AuctionAsset } from "../../_lib/auction-helpers";

interface BaKoreksiSectionProps {
  assets: AuctionAsset[];
  baNumber: string;
  baKap: string;
  onPrint: () => void;
}

export function BaKoreksiSection({ assets, baNumber, baKap, onPrint }: BaKoreksiSectionProps) {
  return (
    <section id="ba-koreksi-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview BA Koreksi Kondisi</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Dokumen pertama untuk aset terpilih: Rusak Ringan menjadi Rusak Berat.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-zinc-900 text-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Cetak / Save PDF
        </Button>
      </div>
      <CorrectionDocument assets={assets} baNumber={baNumber} baKap={baKap} />
    </section>
  );
}
