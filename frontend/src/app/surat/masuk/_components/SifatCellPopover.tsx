"use client";

import { useState, useEffect } from "react";
import { Tag, Check, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import type { SuratMasuk } from "../../_lib/surat-types";
import { SIFAT_OPTIONS } from "../../_lib/surat-types";
import { saveSuratMasukQuickPatch } from "../../_lib/surat-api";

interface SifatCellPopoverProps {
  item: SuratMasuk;
  onUpdated?: (updatedItem: SuratMasuk) => void;
}

export function getSifatBadgeStyle(sifat: string) {
  switch (sifat) {
    case "Penting":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
    case "Sangat Penting":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300";
    case "Segera":
      return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
    case "Kilat":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 font-extrabold";
    case "Rahasia":
      return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 font-bold";
    case "Biasa":
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

export function SifatCellPopover({ item, onUpdated }: SifatCellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSifat, setSelectedSifat] = useState<string>(() => {
    return Array.isArray(item.sifat_json) && item.sifat_json.length > 0 ? item.sifat_json[0] : "Penting";
  });

  useEffect(() => {
    if (Array.isArray(item.sifat_json) && item.sifat_json.length > 0) {
      setSelectedSifat(item.sifat_json[0]);
    }
  }, [item.sifat_json]);

  const selectSifatOption = async (sifat: string) => {
    setSelectedSifat(sifat);
    setIsSaving(true);

    try {
      const resData = await saveSuratMasukQuickPatch(item, { sifat_json: [sifat] });

      toast.success(`Sifat surat diperbarui: ${sifat}`);
      setIsOpen(false);
      if (onUpdated) {
        onUpdated(resData);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memperbarui sifat surat.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer inline-flex items-center gap-1 hover:opacity-85 transition-opacity bg-transparent border-none p-1 rounded-lg"
          title="Klik untuk mengubah sifat surat arahan pimpinan (Pilih 1)"
          aria-label={`Sifat surat: ${selectedSifat}`}
        >
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold border transition-colors ${getSifatBadgeStyle(
              selectedSifat
            )}`}
          >
            {selectedSifat}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        data-module="persuratan"
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        className="psr-ui w-52 rounded-2xl bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-lg z-50 p-2 space-y-2"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-zinc-800">
          <span className="text-xs font-bold text-[var(--ds-fg)] flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-[var(--ds-accent-fg)]" />
            Pilih 1 Sifat Surat
          </span>
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ds-accent-fg)]" />}
        </div>

        <div className="space-y-1">
          {SIFAT_OPTIONS.map((opt) => {
            const isChecked = selectedSifat === opt;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={isChecked}
                onClick={() => selectSifatOption(opt)}
                className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors text-left"
              >
                <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${getSifatBadgeStyle(opt)}`}>
                  {opt}
                </span>
                {isChecked && <Check className="h-3.5 w-3.5 text-[var(--ds-accent-fg)] stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
