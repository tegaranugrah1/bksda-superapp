"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Employee } from "./types";

interface SignatoryPickerSectionProps {
  employees: Employee[];
  isLoadingEmployees: boolean;
  kepalaBalaiId: string;
  panitiaIds: string[];
  timPenilaiIds: string[];
  pemeriksaIds: string[];
  onKepalaBalaiChange: (id: string) => void;
  onPanitiaChange: (ids: string[]) => void;
  onTimPenilaiChange: (ids: string[]) => void;
  onPemeriksaChange: (ids: string[]) => void;
}

const getEmployeeName = (employee: Employee) => employee.nama_lengkap || employee.name || "-";
const getEmployeePosition = (employee: Employee) => employee.jabatan || employee.position || "";
const getEmployeeLabel = (employee: Employee) =>
  `${getEmployeeName(employee)}${employee.nip ? ` - NIP. ${employee.nip}` : ""}`;

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

function MultiPicker({
  label,
  employees,
  selectedIds,
  onChange,
}: {
  label: string;
  employees: Employee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-[var(--ds-fg-secondary)]">{label}</label>
      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3">
        <div className="space-y-2">
          {employees.map((employee) => {
            const id = String(employee.id);
            return (
              <button
                type="button"
                key={employee.id}
                className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-[var(--ds-surface)]"
                onClick={() => onChange(toggleId(selectedIds, id))}
              >
                <Checkbox
                  checked={selectedIds.includes(id)}
                  onClick={(event) => event.stopPropagation()}
                  onCheckedChange={() => onChange(toggleId(selectedIds, id))}
                />
                <span className="text-xs text-[var(--ds-fg)]">
                  {getEmployeeName(employee)}{" "}
                  <span className="font-mono text-xs text-[var(--ds-fg-muted)] tabular-nums">(NIP. {employee.nip || "-"})</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SignatoryPickerSection({
  employees,
  isLoadingEmployees,
  kepalaBalaiId,
  panitiaIds,
  timPenilaiIds,
  pemeriksaIds,
  onKepalaBalaiChange,
  onPanitiaChange,
  onTimPenilaiChange,
  onPemeriksaChange,
}: SignatoryPickerSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedKepalaBalai = employees.find((employee) => String(employee.id) === kepalaBalaiId) || null;
  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [getEmployeeName(employee), employee.nip, getEmployeePosition(employee)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <h2 className="text-sm font-bold text-[var(--ds-fg)]">Daftar Penandatangan Dokumen</h2>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Kepala Balai</label>
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={isPickerOpen}
              className="h-auto min-h-10 w-full justify-between rounded-lg border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-3 py-2 text-left text-xs font-normal"
              disabled={isLoadingEmployees}
            >
              <span className="min-w-0 truncate">
                {selectedKepalaBalai ? getEmployeeLabel(selectedKepalaBalai) : "-- Pilih Kepala Balai --"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[var(--ds-fg-muted)]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover w-[min(560px,calc(100vw-2rem))] p-0 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-lg" align="start">
            <div className="border-b border-slate-200/70 dark:border-zinc-800 px-3 py-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--ds-fg-muted)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIP, atau jabatan..."
                  className="h-9 border-0 px-0 text-xs focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredEmployees.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-[var(--ds-fg-muted)]">Pegawai tidak ditemukan.</div>
              ) : (
                filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[var(--ds-surface-muted)]"
                    onClick={() => {
                      const employeeId = String(employee.id);
                      onKepalaBalaiChange(employeeId);
                      setSearch("");
                      setIsPickerOpen(false);
                    }}
                  >
                    <Check
                      className={`h-4 w-4 shrink-0 text-[var(--ds-accent-fg)] ${
                        kepalaBalaiId === String(employee.id) ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--ds-fg)]">
                        {getEmployeeName(employee)}
                      </span>
                      <span className="block truncate font-mono text-xs text-[var(--ds-fg-muted)] tabular-nums">
                        NIP. {employee.nip || "-"}
                        {getEmployeePosition(employee) ? ` - ${getEmployeePosition(employee)}` : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <MultiPicker label="Panitia Penghapusan" employees={employees} selectedIds={panitiaIds} onChange={onPanitiaChange} />
      <MultiPicker label="Tim Penilai / Penaksir" employees={employees} selectedIds={timPenilaiIds} onChange={onTimPenilaiChange} />
      <MultiPicker label="Tim Pemeriksa" employees={employees} selectedIds={pemeriksaIds} onChange={onPemeriksaChange} />
    </div>
  );
}
