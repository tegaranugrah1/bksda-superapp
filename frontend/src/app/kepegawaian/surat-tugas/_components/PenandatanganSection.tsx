"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { formatNIP } from "@/lib/letter-utils";
import { FormSection } from "./FormSection";
import type { Employee, KepalaBalaiInfo } from "../_lib/types";

interface PenandatanganSectionProps {
  kepalaBalai: KepalaBalaiInfo;
  setKepalaBalai: (kb: KepalaBalaiInfo) => void;
  allEmployees: Employee[];
  isLoading: boolean;
}

/**
 * Section editor Penandatangan (Kepala Balai) dengan searchable employee picker.
 * State search query/dropdown dikelola lokal di dalam komponen.
 * Dipakai bersama oleh ST Builder + Create.
 */
export function PenandatanganSection({
  kepalaBalai,
  setKepalaBalai,
  allEmployees,
  isLoading,
}: PenandatanganSectionProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const searchResults = allEmployees
    .filter((emp) => {
      const q = query.toLowerCase();
      if (!q) return true;
      const name = emp.nama_lengkap?.toLowerCase() || emp.name?.toLowerCase() || "";
      const nip = emp.nip?.toLowerCase() || "";
      const position =
        emp.jabatan?.toLowerCase() || emp.position?.toLowerCase() || "";
      return name.includes(q) || nip.includes(q) || position.includes(q);
    })
    .slice(0, 8);

  const handleSelect = (emp: Employee) => {
    setKepalaBalai({
      name: emp.nama_lengkap || emp.name || kepalaBalai.name,
      nip: formatNIP(emp.nip || kepalaBalai.nip),
    });
    setQuery("");
    setShowDropdown(false);
  };

  return (
    <FormSection title="Penandatangan">
      <div className="relative mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Cari pegawai penandatangan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-9 py-2 text-sm outline-none text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:bg-zinc-700"
          />
        </div>
        {showDropdown && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat pegawai...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(emp)}
                  className="w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-700"
                >
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    {emp.nama_lengkap || emp.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                    NIP. {formatNIP(emp.nip)}
                    {emp.jabatan || emp.position
                      ? ` - ${emp.jabatan || emp.position}`
                      : ""}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-500">
                Pegawai tidak ditemukan.
              </div>
            )}
          </div>
        )}
      </div>
      <input
        value={kepalaBalai.name}
        onChange={(e) => setKepalaBalai({ ...kepalaBalai, name: e.target.value })}
        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm mb-2 outline-none text-zinc-900 dark:text-white"
      />
      <input
        value={kepalaBalai.nip}
        onChange={(e) => setKepalaBalai({ ...kepalaBalai, nip: e.target.value })}
        onBlur={() => setKepalaBalai({ ...kepalaBalai, nip: formatNIP(kepalaBalai.nip) })}
        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none text-zinc-900 dark:text-white"
      />
    </FormSection>
  );
}
