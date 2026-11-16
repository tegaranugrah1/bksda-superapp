"use client";

import { cn } from "@/lib/utils";

interface SummaryTileProps {
  label: string;
  value: string;
  tone: "red" | "emerald" | "zinc";
}

export function SummaryTile({ label, value, tone }: SummaryTileProps) {
  const toneClass = {
    red: "border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]",
    emerald: "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]",
    zinc: "border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)]",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">{label}</p>
      <p className={cn("mt-2 inline-flex rounded-lg border px-3 py-1 text-xl font-bold tabular-nums", toneClass)}>{value}</p>
    </div>
  );
}
