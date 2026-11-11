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
  onBulkForceDelete?: () => void;
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
  onBulkForceDelete,
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
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs select-none">
      {/* Left side: Selection & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Master Selection Box with Dropdown */}
        <div className="relative flex items-center" ref={selectMenuRef}>
          <button
            disabled={loading || totalOnPage === 0}
            onClick={() => {
              if (selectedCount > 0) {
                onDeselectAll();
              } else {
                onSelectAllPage();
              }
            }}
            className="p-1.5 hover:bg-[var(--ds-surface-muted)] rounded-lg text-[var(--ds-fg-muted)]"
            title={selectedCount > 0 ? "Batalkan pilihan" : "Pilih semua di halaman ini"}
          >
            {allSelectedOnPage ? (
              <CheckSquare className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            ) : someSelected ? (
              <MinusSquare className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <button
            disabled={loading || totalOnPage === 0}
            aria-expanded={isSelectMenuOpen}
            onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)}
            className="p-1 hover:bg-[var(--ds-surface-muted)] rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)]"
            title="Opsi pilihan"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {isSelectMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 w-36 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl shadow-lg py-1 text-xs">
              <button
                onClick={() => {
                  onSelectAllPage();
                  setIsSelectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-fg-muted)]"
              >
                Pilih Semua ({totalOnPage})
              </button>
              <button
                onClick={() => {
                  onDeselectAll();
                  setIsSelectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-fg-muted)]"
              >
                Kosongkan Pilihan
              </button>
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          disabled={loading}
          onClick={onRefresh}
          className="p-1.5 hover:bg-[var(--ds-surface-muted)] rounded-lg text-[var(--ds-fg-muted)] transition-colors"
          title="Segarkan data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--ds-accent-fg)]" : ""}`} />
        </button>

        {/* Contextual Bulk Action Buttons */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-[var(--ds-border-subtle)]">
            <span className="font-bold text-xs text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-2 py-0.5 rounded-full">
              {selectedCount} dipilih
            </span>

            {isTrashView ? (
              <>
                <button
                  onClick={onBulkRestore}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--ds-status-success-bg)] hover:bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] font-bold text-xs transition-colors cursor-pointer"
                  title="Pulihkan dokumen terpilih"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Pulihkan</span>
                </button>
                {onBulkForceDelete && (
                  <button
                    onClick={onBulkForceDelete}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] font-bold text-xs transition-colors cursor-pointer"
                    title="Hapus permanen dokumen terpilih"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onBulkTrash}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] font-bold text-xs transition-colors cursor-pointer"
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
          aria-pressed={splitView}
          onClick={onToggleSplitView}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
            splitView
              ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)]"
              : "border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)]"
          }`}
          title={splitView ? "Beralih ke Tampilan Baris Penuh" : "Beralih ke Mode Split-Pane"}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{splitView ? "Split View" : "Full View"}</span>
        </button>

        {/* Per Page Selector */}
        <div className="flex items-center gap-1 text-xs font-medium text-[var(--ds-fg-muted)]">
          <span className="hidden md:inline">Baris:</span>
          <select
            aria-label="Jumlah baris per halaman"
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="bg-[var(--ds-surface-muted)] border-none rounded-md px-1.5 py-0.5 font-bold text-[var(--ds-fg-muted)] outline-none cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Pagination text: 1-50 dari 2.450 */}
        <div className="font-semibold text-[var(--ds-fg-muted)] text-xs tracking-tight">
          {totalItems === 0 ? (
            "0 dari 0"
          ) : (
            <>
              {from}–{to} <span className="text-[var(--ds-fg-muted)] font-normal">dari</span>{" "}
              {totalItems.toLocaleString("id-ID")}
            </>
          )}
        </div>

        {/* Navigation arrow buttons */}
        <div className="flex items-center">
          <button
            disabled={!hasPrevPage || loading}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 hover:bg-[var(--ds-surface-muted)] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-[var(--ds-fg-muted)] transition-colors"
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!hasNextPage || loading}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 hover:bg-[var(--ds-surface-muted)] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-[var(--ds-fg-muted)] transition-colors"
            title="Halaman berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
