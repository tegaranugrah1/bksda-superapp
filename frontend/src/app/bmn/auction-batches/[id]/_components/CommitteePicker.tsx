"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, Search, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Employee } from "./workflow/types";

export interface CommitteePickerProps {
  label: string;
  description: string;
  employees: Employee[];
  selectedIds: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

export const getEmployeeName = (employee: Employee) => employee.nama_lengkap || employee.name || "-";
export const getEmployeePosition = (employee: Employee) => employee.jabatan || employee.position || "";
export const getEmployeeLabel = (employee: Employee) =>
  `${getEmployeeName(employee)}${employee.nip ? ` - NIP. ${employee.nip}` : ""}`;

export function normalizeIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(Boolean).map((id) => String(id)) : [];
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

export function CommitteePicker({
  label,
  description,
  employees,
  selectedIds,
  disabled,
  onChange,
}: CommitteePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const selectedEmployees = selectedIds
    .map((id) => employees.find((employee) => String(employee.id) === id))
    .filter(Boolean) as Employee[];
  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [getEmployeeName(employee), employee.nip, getEmployeePosition(employee)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const reorderSelected = (dragId: string, targetId: string) => {
    if (disabled || dragId === targetId) return;

    const fromIndex = selectedIds.indexOf(dragId);
    const toIndex = selectedIds.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = [...selectedIds];
    const [movedId] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, movedId);
    onChange(nextIds);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{description}</p>
        </div>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8 shrink-0 rounded-lg text-[11px] font-semibold"
            >
              Pilih ({selectedIds.length})
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(620px,calc(100vw-2rem))] p-0" align="end">
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIP, atau jabatan..."
                  className="h-9 border-0 px-0 text-xs focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {filteredEmployees.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">Pegawai tidak ditemukan.</div>
              ) : (
                filteredEmployees.map((employee) => {
                  const employeeId = String(employee.id);
                  const isSelected = selectedIds.includes(employeeId);

                  return (
                    <button
                      key={employee.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      onClick={() => onChange(toggleId(selectedIds, employeeId))}
                    >
                      <Check className={`h-4 w-4 shrink-0 text-emerald-600 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-zinc-850 dark:text-zinc-100">
                          {getEmployeeName(employee)}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-zinc-400">
                          NIP. {employee.nip || "-"}
                          {getEmployeePosition(employee) ? ` - ${getEmployeePosition(employee)}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {selectedEmployees.map((employee, index) => (
          <span
            key={employee.id}
            draggable={!disabled}
            onDragStart={(event) => {
              const employeeId = String(employee.id);
              setDraggingId(employeeId);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", employeeId);
            }}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => {
              if (!disabled) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragId = event.dataTransfer.getData("text/plain") || draggingId;
              if (dragId) {
                reorderSelected(dragId, String(employee.id));
              }
              setDraggingId(null);
            }}
            className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200 transition dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 ${
              draggingId === String(employee.id) ? "opacity-50 ring-emerald-300" : ""
            } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="max-w-52 truncate">
              {index + 1}. {getEmployeeName(employee)}
            </span>
            <button
              type="button"
              disabled={disabled}
              className="ml-0.5 rounded-full p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
              aria-label={`Hapus ${getEmployeeName(employee)}`}
              onClick={() => onChange(selectedIds.filter((id) => id !== String(employee.id)))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {selectedEmployees.length === 0 && (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-400 ring-1 ring-dashed ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            Belum dipilih
          </span>
        )}
      </div>
    </div>
  );
}
