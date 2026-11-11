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
  const filterTrigger = useRef<HTMLButtonElement>(null);
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
    filterTrigger.current?.focus();
  };

  const handleReset = () => {
    onResetFilters();
    setLocalFilters({});
    setIsFilterOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef} onKeyDown={(event) => {
      if (event.key === "Escape" && isFilterOpen) {
        setIsFilterOpen(false);
        filterTrigger.current?.focus();
      }
    }}>
      {/* Filter Toolbar ala /kepegawaian/cuti */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-3 shadow-sm">
        {/* Left: Search Input & Advanced Filter Action */}
        <div className="relative flex-1 flex items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--ds-fg-muted)]" />
            <input
              type="text"
              aria-label="Cari surat tugas"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nomor surat, maksud perjalanan, nama pegawai, atau tujuan..."
              className="w-full pl-9 pr-8 h-9 text-xs bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl outline-none focus:border-[var(--ds-accent-fg)] text-[var(--ds-fg)] placeholder-slate-400 dark:placeholder-zinc-500 font-medium transition-colors"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-2.5 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)]"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            ref={filterTrigger}
            aria-expanded={isFilterOpen}
            aria-controls="st-advanced-filters"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-semibold transition-all relative shrink-0 ${
              isFilterOpen || hasActiveFilters
                ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] shadow-xs"
                : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
            }`}
            title="Opsi filter penelusuran lanjutan"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[var(--ds-accent-soft)] ring-2 ring-[var(--ds-border-subtle)]" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="hidden md:flex items-center gap-1 text-xs text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] font-semibold px-2 py-1 hover:bg-[var(--ds-status-danger-bg)] rounded-lg transition-colors"
              title="Reset filter penelusuran"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: Total counter */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-[var(--ds-fg-muted)] shrink-0">
          <span>
            Total <span className="font-bold text-[var(--ds-fg)]">{totalCount ?? 0}</span> Surat Tugas
          </span>
        </div>
      </div>

      {/* Advanced Filter Popup Panel */}
      {isFilterOpen && (
        <div id="st-advanced-filters" className="absolute left-0 right-0 top-full mt-2 z-30 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl shadow-2xl p-5 space-y-4 st-panel-enter">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--ds-fg-muted)]">
              Filter Penelusuran Lanjutan
            </h4>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Semua
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[var(--ds-fg-muted)] font-bold mb-1">Nomor Surat</label>
              <input
                type="text"
                placeholder="Contoh: ST.123/K.18..."
                value={localFilters.nomor_surat || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, nomor_surat: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-fg)]"
              />
            </div>

            <div>
              <label className="block text-[var(--ds-fg-muted)] font-bold mb-1">Nama / NIP Pegawai</label>
              <input
                type="text"
                placeholder="Nama personel atau NIP..."
                value={localFilters.pegawai || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, pegawai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-fg)]"
              />
            </div>

            <div>
              <label className="block text-[var(--ds-fg-muted)] font-bold mb-1">Tempat Tujuan</label>
              <input
                type="text"
                placeholder="Kota / Kabupaten / Lokasi..."
                value={localFilters.tempat_tujuan || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, tempat_tujuan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-fg)]"
              />
            </div>

            <div>
              <label className="block text-[var(--ds-fg-muted)] font-bold mb-1">Template Dokumen</label>
              <select
                value={localFilters.template_type || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, template_type: e.target.value || undefined })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-fg)] font-medium"
              >
                <option value="">Semua Jenis Template</option>
                <option value="bmn-pemeriksaan">BMN Penghapusan / Pemeriksaan</option>
                <option value="plh">Pelaksana Harian (PLH)</option>
                <option value="standard">Surat Tugas Biasa / Standar</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--ds-fg-muted)] font-bold mb-1">Sumber Dana</label>
              <input
                type="text"
                placeholder="DIPA, FOLU, Mitra, dll..."
                value={localFilters.sumber_dana || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, sumber_dana: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-fg)]"
              />
            </div>

            <div>
              <label className="block text-[var(--ds-fg-muted)] font-bold mb-1">Rentang Tanggal Tugas</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={localFilters.date_from || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] text-xs outline-none"
                  title="Dari Tanggal"
                />
                <input
                  type="date"
                  value={localFilters.date_to || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] text-[var(--ds-fg)] text-xs outline-none"
                  title="Sampai Tanggal"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--ds-border-subtle)]">
            <button
              onClick={() => { setIsFilterOpen(false); filterTrigger.current?.focus(); }}
              className="px-4 py-2 text-xs font-bold text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            >
              Batal
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-bold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl shadow-sm transition-colors"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
