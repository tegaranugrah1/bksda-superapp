"use client";

import { Plus, X } from "lucide-react";
import { FormSection } from "./FormSection";

interface TembusanSectionProps {
  items: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
}

/**
 * Section editor untuk daftar Tembusan (string list).
 * Dipakai bersama oleh ST Builder + Create.
 */
export function TembusanSection({ items, onChange, disabled = false }: TembusanSectionProps) {
  return (
    <FormSection
      title="Tembusan"
      action={
        !disabled ? (
          <button
            onClick={() => onChange([...items, ""])}
            className="text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
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
          <div key={idx} className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 w-4">{idx + 1}.</span>
            <input
              value={item}
              disabled={disabled}
              onChange={(e) => {
                const updated = [...items];
                updated[idx] = e.target.value;
                onChange(updated);
              }}
              placeholder="Nama penerima tembusan..."
              className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {!disabled && (
              <button
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </FormSection>
  );
}
