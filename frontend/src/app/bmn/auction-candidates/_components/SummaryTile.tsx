"use client";

import { cn } from "@/lib/utils";

interface SummaryTileProps {
  label: string;
  value: string;
  tone: "red" | "emerald" | "zinc";
}

export function SummaryTile({ label, value, tone }: SummaryTileProps) {
  const toneClass = {
    red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    zinc: "bg-zinc-50 text-zinc-700 ring-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={cn("mt-2 inline-flex rounded-xl px-3 py-1 text-lg font-black ring-1", toneClass)}>{value}</p>
    </div>
  );
}
