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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] text-xs font-bold uppercase tracking-wider text-[var(--ds-accent-fg)] transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Tambah
          </button>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-[var(--ds-fg-muted)] italic">
            Belum ada tembusan.
          </p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--ds-fg-muted)] w-4">{idx + 1}.</span>
            <input
              value={item ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const updated = [...items];
                updated[idx] = e.target.value;
                onChange(updated);
              }}
              placeholder="Nama penerima tembusan..."
              className="flex-1 px-3 py-1.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs outline-none focus:border-[var(--ds-accent-fg)] text-[var(--ds-fg)] disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                title="Hapus tembusan"
                className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] p-1.5 rounded-lg transition-colors cursor-pointer"
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
