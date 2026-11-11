"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { formatNIP, formatNipLabel } from "@/lib/letter-utils";
import { FormSection } from "./FormSection";
import type { Employee, KepalaBalaiInfo } from "../_lib/types";

interface PenandatanganSectionProps {
  kepalaBalai: KepalaBalaiInfo;
  setKepalaBalai: (kb: KepalaBalaiInfo) => void;
  allEmployees: Employee[];
  isLoading: boolean;
  disabled?: boolean;
}

export function PenandatanganSection({
  kepalaBalai,
  setKepalaBalai,
  allEmployees,
  isLoading,
  disabled = false,
}: PenandatanganSectionProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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
      employeeId: emp.id,
      name: emp.nama_lengkap || emp.name || kepalaBalai.name,
      nip: formatNIP(emp.nip || kepalaBalai.nip),
    });
    setQuery("");
    setShowDropdown(false);
  };

  return (
    <FormSection title="Penandatangan">
      {!disabled && (
        <div ref={containerRef} className="relative mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Cari pegawai penandatangan..."
              className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] pl-9 pr-3 py-2 text-xs font-medium outline-none text-[var(--ds-fg)] focus:bg-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)]"
            />
          </div>
          {showDropdown && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-lg">
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--ds-fg-muted)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat pegawai...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(emp)}
                    className="w-full border-b border-[var(--ds-border-subtle)] px-3 py-2 text-left last:border-0 hover:bg-[var(--ds-accent-soft)] cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[var(--ds-fg)]">
                      {emp.nama_lengkap || emp.name}
                    </div>
                    <div className="text-xs text-[var(--ds-fg-muted)]">
                      {formatNipLabel(emp, true)} {formatNIP(emp.nip)}
                      {emp.jabatan || emp.position
                        ? ` • ${emp.jabatan || emp.position}`
                        : ""}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-[var(--ds-fg-muted)]">
                  Pegawai tidak ditemukan.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        <input
          value={kepalaBalai.name}
          disabled={disabled}
          placeholder="Nama Penandatangan"
          onChange={(e) => setKepalaBalai({ ...kepalaBalai, name: e.target.value })}
          className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-semibold outline-none focus:border-[var(--ds-accent-fg)] text-[var(--ds-fg)] disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <input
          value={kepalaBalai.nip}
          disabled={disabled}
          placeholder="NIP Penandatangan"
          onChange={(e) => setKepalaBalai({ ...kepalaBalai, nip: e.target.value })}
          onBlur={() => setKepalaBalai({ ...kepalaBalai, nip: formatNIP(kepalaBalai.nip) })}
          className="w-full px-3 py-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-mono outline-none focus:border-[var(--ds-accent-fg)] text-[var(--ds-fg)] disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    </FormSection>
  );
}
