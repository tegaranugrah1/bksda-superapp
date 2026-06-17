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
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-lime-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

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
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview Nota Dinas Permohonan KSDAE</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nota Dinas permohonan persetujuan pemindahtanganan BMN ke Sekretaris Direktorat Jenderal KSDAE.</p>
        </div>
        <Button className="rounded-xl gap-2 bg-lime-600 text-xs hover:bg-lime-500" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pengaturan Nota Dinas
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Perihal</label>
                <textarea value={perihal} onChange={(e) => setPerihal(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lampiran</label>
                <input value={lampiran} onChange={(e) => setLampiran(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lokasi BMN</label>
                <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Nilai Taksiran (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={nilaiTaksiran || ""}
                  onChange={(e) => setNilaiTaksiran(Number(e.target.value) || 0)}
                  placeholder="contoh: 167024000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Kalimat Penutup</label>
                <textarea value={kesimpulan} onChange={(e) => setKesimpulan(e.target.value)} rows={2} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Tembusan</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-lg text-[10px]"
                onClick={() => setTembusan([...tembusan, newSkBuilderItem("")])}
              >
                <Plus className="h-3 w-3" />
                Tambah
              </Button>
            </div>
            <div className="space-y-2">
              {tembusan.map((t, idx) => (
                <div className="flex gap-2" key={t.id}>
                  <span className="pt-2 text-xs text-zinc-400">{idx + 1}.</span>
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
                    className="h-9 px-2 text-zinc-400 hover:text-red-500"
                    onClick={() => setTembusan(tembusan.filter((x) => x.id !== t.id))}
                  >
                    <X className="h-3.5 w-3.5" />
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
