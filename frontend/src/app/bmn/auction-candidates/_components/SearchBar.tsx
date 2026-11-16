"use client";

import { Loader2, Search } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isFetching: boolean;
  isLoading: boolean;
}

export function SearchBar({ searchTerm, onSearchChange, isFetching, isLoading }: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
        <input
          type="text"
          placeholder="Cari nama, kode barang, NUP..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] pl-9 pr-4 text-sm text-[var(--ds-fg)] outline-none transition focus:border-[var(--ds-status-danger-border)] focus:ring-2 focus:ring-[var(--ds-status-danger-bg)]"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--ds-fg-muted)]">
        <span className="rounded-full border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] px-3 py-1 font-bold text-[var(--ds-status-danger-fg)]">
          Filter: Rusak Berat
        </span>
        {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    </div>
  );
}
