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
    <div className="bg-white/80 backdrop-blur-xl rounded-4xl p-6 sm:p-10 shadow-xl border border-white/50 ring-1 ring-slate-100/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm border border-blue-100/50">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Pilih Pegawai
        </h2>
        <p className="text-slate-500 text-sm mt-2 font-medium">
          Cari dan tambahkan pegawai yang akan melaksanakan tugas.
        </p>
      </div>

      <div className="mb-8">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
          Daftar Pegawai yang Ditugaskan
        </label>
        {selectedEmployees.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center flex flex-col items-center justify-center">
            <UserPlus className="w-6 h-6 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-400">
              Belum ada pegawai dipilih
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="group flex items-center gap-2 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 pl-3 pr-1 py-1 rounded-full transition-all duration-200"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-blue-900 leading-tight">
                    {emp.name}
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium truncate max-w-37.5">
                    {emp.department || emp.nip}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeEmployee(emp.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-blue-400 hover:bg-white hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-20" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 shadow-sm"
            placeholder="Ketik nama atau NIP pegawai (min. 2 karakter)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {showDropdown && searchResults.length > 0 && searchQuery.length >= 2 && (
          <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
            <ul className="py-2">
              {searchResults.map((emp: Employee) => {
                const isSelected = selectedEmployees.some(
                  (e: Employee) => e.id === emp.id
                );
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors",
                        isSelected && "bg-slate-50/80"
                      )}
                      onClick={() => toggleEmployee(emp)}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span
                          className={cn(
                            "text-sm font-semibold truncate",
                            isSelected ? "text-slate-400" : "text-slate-700"
                          )}
                        >
                          {emp.name}
                        </span>
                        <span className="text-xs text-slate-500 truncate mt-0.5">
                          {emp.department && emp.department !== "-"
                            ? emp.department
                            : emp.nip}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-colors",
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300"
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

      <div className="mt-10 flex justify-end pt-4 border-t border-slate-100">
        <Button
          onClick={handleNextStep}
          disabled={selectedEmployees.length === 0}
          className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-wide disabled:opacity-50 transition-all gap-2"
        >
          Lanjutkan <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
