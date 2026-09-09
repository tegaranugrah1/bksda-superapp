"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Undo2,
  ChevronDown,
  Columns,
  Square,
  CheckSquare,
  MinusSquare,
} from "lucide-react";
import type { PaginationMeta } from "../_lib/types";

interface GmailToolbarProps {
  meta?: PaginationMeta;
  loading: boolean;
  onRefresh: () => void;
  page: number;
  perPage: number;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
  selectedCount: number;
  totalOnPage: number;
  onSelectAllPage: () => void;
  onDeselectAll: () => void;
  onBulkTrash: () => void;
  onBulkRestore: () => void;
  isTrashView: boolean;
  splitView: boolean;
  onToggleSplitView: () => void;
}

export function GmailToolbar({
  meta,
  loading,
  onRefresh,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  selectedCount,
  totalOnPage,
  onSelectAllPage,
  onDeselectAll,
  onBulkTrash,
  onBulkRestore,
  isTrashView,
  splitView,
  onToggleSplitView,
}: GmailToolbarProps) {
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const selectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectMenuRef.current && !selectMenuRef.current.contains(event.target as Node)) {
        setIsSelectMenuOpen(false);
      }
    }
    if (isSelectMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSelectMenuOpen]);

  const allSelectedOnPage = totalOnPage > 0 && selectedCount === totalOnPage;
  const someSelected = selectedCount > 0 && !allSelectedOnPage;

  const totalItems = meta?.total ?? 0;
  const from = meta?.from ?? (totalItems > 0 ? (page - 1) * perPage + 1 : 0);
  const to = meta?.to ?? Math.min(page * perPage, totalItems);
  const hasNextPage = meta ? meta.current_page < meta.last_page : false;
  const hasPrevPage = page > 1;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-xs select-none">
      {/* Left side: Selection & Actions */}
      <div className="flex items-center gap-2">
        {/* Master Selection Box with Dropdown */}
        <div className="relative flex items-center" ref={selectMenuRef}>
          <button
            onClick={() => {
              if (selectedCount > 0) {
                onDeselectAll();
              } else {
                onSelectAllPage();
              }
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400"
            title={selectedCount > 0 ? "Batalkan pilihan" : "Pilih semua di halaman ini"}
          >
            {allSelectedOnPage ? (
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : someSelected ? (
              <MinusSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            title="Opsi pilihan"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {isSelectMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 w-36 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 text-xs">
              <button
                onClick={() => {
                  onSelectAllPage();
                  setIsSelectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200"
              >
                Pilih Semua ({totalOnPage})
              </button>
              <button
                onClick={() => {
                  onDeselectAll();
                  setIsSelectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200"
              >
                Kosongkan Pilihan
              </button>
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 transition-colors"
          title="Segarkan data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>

        {/* Contextual Bulk Action Buttons */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-800 animate-in fade-in duration-150">
            <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {selectedCount} dipilih
            </span>

            {isTrashView ? (
              <button
                onClick={onBulkRestore}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 font-bold text-[11px] transition-colors"
                title="Pulihkan dokumen terpilih"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </button>
            ) : (
              <button
                onClick={onBulkTrash}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-300 font-bold text-[11px] transition-colors"
                title="Pindahkan ke sampah"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ke Sampah</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side: View Toggle, Per Page, Pagination */}
      <div className="flex items-center gap-3">
        {/* Toggle Split Pane */}
        <button
          onClick={onToggleSplitView}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
            splitView
              ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
              : "border-slate-200 hover:border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
          }`}
          title={splitView ? "Beralih ke Tampilan Baris Penuh" : "Beralih ke Mode Split-Pane"}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{splitView ? "Split View" : "Full View"}</span>
        </button>

        {/* Per Page Selector */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
          <span className="hidden md:inline">Baris:</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="bg-slate-100 dark:bg-zinc-800 border-none rounded-md px-1.5 py-0.5 font-bold text-slate-700 dark:text-zinc-200 outline-none cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Pagination text: 1-50 dari 2.450 */}
        <div className="font-semibold text-slate-600 dark:text-zinc-300 text-[11px] tracking-tight">
          {totalItems === 0 ? (
            "0 dari 0"
          ) : (
            <>
              {from}–{to} <span className="text-slate-400 dark:text-zinc-500 font-normal">dari</span>{" "}
              {totalItems.toLocaleString("id-ID")}
            </>
          )}
        </div>

        {/* Navigation arrow buttons */}
        <div className="flex items-center">
          <button
            disabled={!hasPrevPage || loading}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-600 dark:text-zinc-300 transition-colors"
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!hasNextPage || loading}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-600 dark:text-zinc-300 transition-colors"
            title="Halaman berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
