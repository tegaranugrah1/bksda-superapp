"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaPemeriksaanDocument } from "../BaPemeriksaanDocument";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { PemeriksaEditor } from "../PemeriksaEditor";
import type { AuctionAsset } from "../../_lib/auction-helpers";
import type { SkKepalaBalai } from "../../_lib/sk-defaults";
import type { PemeriksaAnggota } from "../../_lib/pemeriksa-defaults";
import type { EmployeeOption } from "../../_hooks/useEmployeeOptions";

interface BaPemeriksaanSectionProps {
  assets: AuctionAsset[];
  number: string;
  setNumber: (value: string) => void;
  kap: string;
  setKap: (value: string) => void;
  stNumber: string;
  setStNumber: (value: string) => void;
  stTanggal: string;
  setStTanggal: (value: string) => void;
  kepalaBalai: SkKepalaBalai;
  pemeriksaList: PemeriksaAnggota[];
  employees: EmployeeOption[];
  onAddPemeriksa: () => void;
  onRemovePemeriksa: (id: string) => void;
  onUpdatePemeriksa: (id: string, field: keyof PemeriksaAnggota, value: string) => void;
  onSelectPemeriksaEmployee: (id: string, employeeId: string, employees: EmployeeOption[]) => void;
  onPrint: () => void;
}

export function BaPemeriksaanSection({
  assets,
  number,
  setNumber,
  kap,
  setKap,
  stNumber,
  setStNumber,
  stTanggal,
  setStTanggal,
  kepalaBalai,
  pemeriksaList,
  employees,
  onAddPemeriksa,
  onRemovePemeriksa,
  onUpdatePemeriksa,
  onSelectPemeriksaEmployee,
  onPrint,
}: BaPemeriksaanSectionProps) {
  return (
    <section id="ba-pemeriksaan-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview Berita Acara Pemeriksaan BMN</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Berita Acara Pemeriksaan BMN berupa Alat Angkutan Bermotor oleh tim pemeriksa.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="BA Pemeriksaan"
            prefix="BA."
            number={number}
            setNumber={setNumber}
            kap={kap}
            setKap={setKap}
            stNumber={stNumber}
            setStNumber={setStNumber}
            stTanggal={stTanggal}
            setStTanggal={setStTanggal}
          />
          <PemeriksaEditor
            pemeriksaList={pemeriksaList}
            employees={employees}
            onAdd={onAddPemeriksa}
            onRemove={onRemovePemeriksa}
            onUpdate={onUpdatePemeriksa}
            onSelectEmployee={onSelectPemeriksaEmployee}
          />
        </div>
        <div>
          <BaPemeriksaanDocument
            number={number}
            kap={kap}
            pemeriksaList={pemeriksaList}
            stNumber={stNumber}
            stTanggal={stTanggal}
            assets={assets}
            kepalaBalai={kepalaBalai}
          />
        </div>
      </div>
    </section>
  );
}
