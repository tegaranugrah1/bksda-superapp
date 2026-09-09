"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import type { AdvancedFilters } from "../_lib/types";

interface GmailInboxHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalCount?: number;
}

export function GmailInboxHeader({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  hasActiveFilters,
  totalCount,
}: GmailInboxHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsFilterOpen(false);
  };

  const handleReset = () => {
    onResetFilters();
    setLocalFilters({});
    setIsFilterOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Filter Toolbar ala /kepegawaian/cuti */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
        {/* Left: Search Input & Advanced Filter Action */}
        <div className="relative flex-1 flex items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nomor surat, maksud perjalanan, nama pegawai, atau tujuan..."
              className="w-full pl-9 pr-8 h-9 text-xs bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 font-medium transition-colors"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-semibold transition-all relative shrink-0 ${
              isFilterOpen || hasActiveFilters
                ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-xs"
                : "bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
            }`}
            title="Opsi filter penelusuran lanjutan"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-900" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="hidden md:flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Reset filter penelusuran"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: Total counter */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
          <span>
            Total <span className="font-bold text-slate-900 dark:text-slate-100">{totalCount ?? 0}</span> Surat Tugas
          </span>
        </div>
      </div>

      {/* Advanced Filter Popup Panel */}
      {isFilterOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">
              Filter Penelusuran Lanjutan
            </h4>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Semua
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-zinc-400 font-bold mb-1">Nomor Surat</label>
              <input
                type="text"
                placeholder="Contoh: ST.123/K.18..."
                value={localFilters.nomor_surat || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, nomor_surat: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-zinc-400 font-bold mb-1">Nama / NIP Pegawai</label>
              <input
                type="text"
                placeholder="Nama personel atau NIP..."
                value={localFilters.pegawai || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, pegawai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-zinc-400 font-bold mb-1">Tempat Tujuan</label>
              <input
                type="text"
                placeholder="Kota / Kabupaten / Lokasi..."
                value={localFilters.tempat_tujuan || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, tempat_tujuan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-zinc-400 font-bold mb-1">Template Dokumen</label>
              <select
                value={localFilters.template_type || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, template_type: e.target.value || undefined })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 font-medium"
              >
                <option value="">Semua Jenis Template</option>
                <option value="bmn-pemeriksaan">BMN Penghapusan / Pemeriksaan</option>
                <option value="plh">Pelaksana Harian (PLH)</option>
                <option value="standard">Surat Tugas Biasa / Standar</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-zinc-400 font-bold mb-1">Sumber Dana</label>
              <input
                type="text"
                placeholder="DIPA, FOLU, Mitra, dll..."
                value={localFilters.sumber_dana || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, sumber_dana: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-zinc-400 font-bold mb-1">Rentang Tanggal Tugas</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={localFilters.date_from || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 text-[11px] outline-none"
                  title="Dari Tanggal"
                />
                <input
                  type="date"
                  value={localFilters.date_to || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 text-[11px] outline-none"
                  title="Sampai Tanggal"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              onClick={() => setIsFilterOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Batal
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
