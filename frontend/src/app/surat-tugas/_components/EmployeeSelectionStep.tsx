"use client";

import React from "react";
import { Users, Search, UserPlus, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Employee {
  id: string;
  name: string;
  nip: string;
  department: string;
  position?: string;
  is_seksi?: boolean;
  seksi_wilayah?: string | null;
}

interface EmployeeSelectionStepProps {
  selectedEmployees: Employee[];
  removeEmployee: (id: string) => void;
  toggleEmployee: (emp: Employee) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  searchResults: Employee[];
  isSearching: boolean;
  handleNextStep: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function EmployeeSelectionStep({
  selectedEmployees,
  removeEmployee,
  toggleEmployee,
  searchQuery,
  setSearchQuery,
  showDropdown,
  setShowDropdown,
  searchResults,
  isSearching,
  handleNextStep,
  dropdownRef,
}: EmployeeSelectionStepProps) {
  return (
    <div className="bg-[var(--ds-surface)] rounded-2xl p-6 sm:p-10 shadow-sm border border-[var(--ds-border-subtle)]">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm border border-[var(--ds-accent-soft-border)]">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[var(--ds-fg)] tracking-tight">
          Pilih Personel Tugas
        </h2>
        <p className="text-[var(--ds-fg-muted)] text-sm mt-2 font-medium">
          Cari dan pilih pegawai BKSDA Kalimantan Timur yang ditugaskan.
        </p>
      </div>

      <div className="mb-8">
        <p aria-live="polite" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] mb-3 block">
          Daftar Personel Terpilih ({selectedEmployees.length})
        </p>
        {selectedEmployees.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-center flex flex-col items-center justify-center">
            <UserPlus className="w-6 h-6 text-[var(--ds-fg-muted)] mb-2" />
            <span className="text-sm font-medium text-[var(--ds-fg-muted)]">
              Belum ada pegawai dipilih
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="group flex min-w-0 max-w-full items-center gap-2 bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] pl-3 pr-1 py-1 rounded-full transition-colors duration-200"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-bold text-[var(--ds-accent-fg)] leading-tight break-words">
                    {emp.name}
                  </span>
                  <span className="text-xs text-[var(--ds-accent-fg)] font-medium truncate max-w-37.5">
                    {emp.department || emp.nip}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeEmployee(emp.id)}
                  aria-label={`Hapus ${emp.name} dari personel tugas`}
                  className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[var(--ds-accent-fg)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-status-danger-fg)] focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-20" ref={dropdownRef} onKeyDown={(event) => {
        if (event.key === "Escape") {
          dropdownRef.current?.querySelector("input")?.focus();
          setShowDropdown(false);
        }
      }}>
        <label htmlFor="personnel-search" className="block text-xs font-bold text-[var(--ds-fg-muted)] mb-2">
          Cari Personel
        </label>
        <p id="personnel-search-hint" className="text-xs text-[var(--ds-fg-muted)] mb-2">Ketik nama atau NIP pegawai...</p>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[var(--ds-fg-muted)]" />
          </div>
          <input
            type="text"
            id="personnel-search"
            aria-describedby="personnel-search-hint"

            aria-controls="personnel-search-results"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && showDropdown) {
                const firstResult = dropdownRef.current?.querySelector<HTMLButtonElement>("ul button");
                if (firstResult) {
                  event.preventDefault();
                  firstResult.focus();
                }
              }
            }}
            className="block w-full pl-11 pr-4 py-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-fg)] focus:border-[var(--ds-accent-fg)] transition-colors font-medium text-[var(--ds-fg-muted)] shadow-sm"
            placeholder="Nama atau NIP"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (searchResults.length > 0 || searchQuery.trim().length > 0) setShowDropdown(true);
            }}
          />
          {isSearching && (
            <span role="status" className="sr-only">Mencari personel...</span>
          )}
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <div className="w-4 h-4 border-2 border-[var(--ds-accent-soft-border)] border-t-[var(--ds-accent-soft-border)] rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {!isSearching && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
          <p role="status" className="mt-2 text-sm text-[var(--ds-fg-muted)]">Personel tidak ditemukan. Coba nama atau NIP lain.</p>
        )}
        {showDropdown && searchResults.length > 0 && searchQuery.trim().length >= 1 && (
          <div className="absolute mt-2 w-full bg-[var(--ds-surface)] rounded-2xl shadow-sm border border-[var(--ds-border-subtle)] overflow-hidden max-h-60 overflow-y-auto">
            <ul id="personnel-search-results" aria-label="Hasil pencarian personel" className="py-2">
              {searchResults.map((emp: Employee) => {
                const isSelected = selectedEmployees.some(
                  (e: Employee) => e.id === emp.id
                );
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-[var(--ds-surface-muted)] focus-visible:bg-[var(--ds-accent-fg)] focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)] flex items-center justify-between transition-colors cursor-pointer",
                        isSelected && "bg-[var(--ds-surface)]"
                      )}
                      aria-pressed={isSelected}
                      onClick={() => {
                        toggleEmployee(emp);
                        dropdownRef.current?.querySelector("input")?.focus();
                      }}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span
                          className={cn(
                            "text-sm font-semibold truncate",
                            isSelected ? "text-[var(--ds-fg-muted)]" : "text-[var(--ds-fg-muted)]"
                          )}
                        >
                          {emp.name}
                        </span>
                        <span className="text-xs text-[var(--ds-fg-muted)] truncate mt-0.5">
                          {emp.department && emp.department !== "-"
                            ? emp.department
                            : emp.nip}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-colors",
                          isSelected
                            ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-on-solid)]"
                            : "border-[var(--ds-border-subtle)]"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-10 flex justify-end pt-4 border-t border-[var(--ds-border-subtle)]">
        <Button
          onClick={handleNextStep}
          disabled={selectedEmployees.length === 0}
          className="min-h-12 h-auto whitespace-normal px-4 sm:px-8 rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold tracking-wide disabled:opacity-50 transition-colors gap-2 cursor-pointer"
        >
          Lanjutkan ke Detail Tugas <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
