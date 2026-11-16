"use client";

import { Printer, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentNumberInlineCard } from "../DocumentNumberInputs";
import { NotaDinasDocument } from "../NotaDinasDocument";
import type { AuctionAsset } from "../../_lib/auction-helpers";
import type { SkBuilderItem, SkKepalaBalai } from "../../_lib/sk-defaults";
import { newSkBuilderItem } from "../../_lib/sk-defaults";

interface NotaDinasSectionProps {
  assets: AuctionAsset[];
  number: string;
  setNumber: (v: string) => void;
  kap: string;
  setKap: (v: string) => void;
  kepalaBalai: SkKepalaBalai;
  perihal: string;
  setPerihal: (v: string) => void;
  lampiran: string;
  setLampiran: (v: string) => void;
  lokasi: string;
  setLokasi: (v: string) => void;
  tembusan: SkBuilderItem[];
  setTembusan: (items: SkBuilderItem[]) => void;
  kesimpulan: string;
  setKesimpulan: (v: string) => void;
  nilaiTaksiran: number;
  setNilaiTaksiran: (v: number) => void;
  onPrint: () => void;
}

const inputCls =
  "w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-3 py-2 text-xs text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft)]";

export function NotaDinasSection({
  assets,
  number,
  setNumber,
  kap,
  setKap,
  kepalaBalai,
  perihal,
  setPerihal,
  lampiran,
  setLampiran,
  lokasi,
  setLokasi,
  tembusan,
  setTembusan,
  kesimpulan,
  setKesimpulan,
  nilaiTaksiran,
  setNilaiTaksiran,
  onPrint,
}: NotaDinasSectionProps) {
  return (
    <section id="nota-dinas-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[var(--ds-fg)]">Preview Nota Dinas Permohonan KSDAE</h2>
          <p className="text-sm text-[var(--ds-fg-muted)]">Nota Dinas permohonan persetujuan pemindahtanganan BMN ke Sekretaris Direktorat Jenderal KSDAE.</p>
        </div>
        <Button className="rounded-lg gap-2 bg-[var(--ds-accent-solid)] text-xs text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)]" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 print:hidden">
          <DocumentNumberInlineCard
            label="Nota Dinas KSDAE"
            prefix="ND."
            number={number}
            setNumber={setNumber}
            kap={kap}
            setKap={setKap}
          />
          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
              Pengaturan Nota Dinas
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Perihal</label>
                <textarea value={perihal} onChange={(e) => setPerihal(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Lampiran</label>
                <input value={lampiran} onChange={(e) => setLampiran(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Lokasi BMN</label>
                <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Total Nilai Taksiran (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={nilaiTaksiran || ""}
                  onChange={(e) => setNilaiTaksiran(Number(e.target.value) || 0)}
                  placeholder="contoh: 167024000"
                  className={`${inputCls} tabular-nums`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Kalimat Penutup</label>
                <textarea value={kesimpulan} onChange={(e) => setKesimpulan(e.target.value)} rows={2} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">Tembusan</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-lg text-xs"
                onClick={() => setTembusan([...tembusan, newSkBuilderItem("")])}
              >
                <Plus className="h-3 w-3" />
                Tambah
              </Button>
            </div>
            <div className="space-y-2">
              {tembusan.map((t, idx) => (
                <div className="flex gap-2" key={t.id}>
                  <span className="pt-2 text-xs text-[var(--ds-fg-muted)] tabular-nums">{idx + 1}.</span>
                  <input
                    value={t.text}
                    onChange={(e) =>
                      setTembusan(
                        tembusan.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)),
                      )
                    }
                    className={inputCls}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 px-2 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)]"
                    onClick={() => setTembusan(tembusan.filter((x) => x.id !== t.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <NotaDinasDocument
            number={number}
            kap={kap}
            assets={assets}
            kepalaBalai={kepalaBalai}
            perihal={perihal}
            lampiran={lampiran}
            lokasi={lokasi}
            tembusan={tembusan}
            kesimpulan={kesimpulan}
            nilaiTaksiran={nilaiTaksiran}
          />
        </div>
      </div>
    </section>
  );
}
