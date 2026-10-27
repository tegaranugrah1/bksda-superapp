"use client";

import { Plus, X } from "lucide-react";
import { FormSection } from "./FormSection";

interface TembusanSectionProps {
  items: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
}

export function TembusanSection({ items, onChange, disabled = false }: TembusanSectionProps) {
  return (
    <FormSection
      title="Tembusan"
      action={
        !disabled ? (
          <button
            type="button"
            onClick={() => onChange([...items, ""])}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Tambah
          </button>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-[11px] text-slate-400 italic">
            Belum ada tembusan.
          </p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 w-4">{idx + 1}.</span>
            <input
              value={item ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const updated = [...items];
                updated[idx] = e.target.value;
                onChange(updated);
              }}
              placeholder="Nama penerima tembusan..."
              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                title="Hapus tembusan"
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </FormSection>
  );
}
