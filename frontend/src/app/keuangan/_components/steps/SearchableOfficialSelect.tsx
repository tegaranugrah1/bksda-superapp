"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { FinanceEmployee } from "@/app/keuangan/_components/finance-data";
import {
  Official,
  OFFICIALS,
  cleanNip,
  formatNip,
  isSameEmployee,
} from "@/app/keuangan/_components/templates/shared";

export function SearchableOfficialSelect({
  label,
  value,
  onChange,
  employees,
  defaultRoleLabel,
}: {
  label: string;
  value: Official;
  onChange: (official: Official) => void;
  employees: FinanceEmployee[];
  defaultRoleLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const options = useMemo(() => {
    const defaultList: Official[] = OFFICIALS.map((o) => ({ ...o, nik: formatNip(o.nik) }));
    const extraList: Official[] = employees
      .filter((e) => !defaultList.some((d) => isSameEmployee(d, e)))
      .map((e) => ({
        id: String(e.id),
        name: e.name,
        nik: formatNip(e.nip),
        position: e.position || defaultRoleLabel,
      }));
    const combined = [...defaultList, ...extraList];

    if (!search.trim()) return combined;
    const q = search.toLowerCase();
    const qNum = cleanNip(search);
    return combined.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(o.nik).includes(qNum)) ||
        o.nik.toLowerCase().includes(q)
    );
  }, [employees, search, defaultRoleLabel]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="mt-1.5 flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium outline-none transition hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900"
        >
          <span className="truncate">{value?.name || "Pilih Pejabat"}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </label>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau NIP pegawai..."
                className="h-8 w-full rounded-lg bg-slate-50 pl-8 pr-3 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1 text-xs">
            {options.length === 0 ? (
              <div className="p-3 text-center text-slate-400">Pegawai tidak ditemukan</div>
            ) : (
              options.map((opt) => {
                const isSelected = isSameEmployee(opt, value);
                return (
                  <button
                    key={`${opt.id || opt.nik}-${opt.nik}`}
                    type="button"
                    onClick={() => {
                      onChange({
                        name: opt.name,
                        nik: formatNip(opt.nik),
                      });
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg p-2 text-left transition ${
                      isSelected
                        ? "bg-amber-50 font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{opt.name}</div>
                      <div className="text-[11px] text-slate-400">NIP: {formatNip(opt.nik)}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
