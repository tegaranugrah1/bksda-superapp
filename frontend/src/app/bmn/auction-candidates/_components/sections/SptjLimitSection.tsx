"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SptjLimitDocument } from "../SptjLimitDocument";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";

interface SptjLimitSectionProps {
  number: string;
  kepalaBalai: SkKepalaBalai;
  onPrint: () => void;
}

export function SptjLimitSection({ number, kepalaBalai, onPrint }: SptjLimitSectionProps) {
  return (
    <section id="sptj-limit-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview Surat Pernyataan Tanggung Jawab Nilai Limit</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pernyataan tanggung jawab Kepala Balai atas kebenaran nilai limit penjualan BMN.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-blue-600 text-xs hover:bg-blue-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Cetak / Save PDF
        </Button>
      </div>
      <SptjLimitDocument number={number} kepalaBalai={kepalaBalai} />
    </section>
  );
}
