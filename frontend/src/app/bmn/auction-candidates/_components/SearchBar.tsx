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
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Cari nama, kode barang, NUP..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 text-sm text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
          Filter: Rusak Berat
        </span>
        {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
    </div>
  );
}
