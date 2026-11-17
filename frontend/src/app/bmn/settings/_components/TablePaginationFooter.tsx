"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface TablePaginationFooterProps {
  totalItems: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  itemLabel: string;
}

export function TablePaginationFooter({
  totalItems,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
  itemLabel,
}: TablePaginationFooterProps) {
  if (totalItems === 0) return null;

  const startItem = pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = pageSize === 0 ? totalItems : Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="px-4 py-3 border-t border-slate-200/70 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-[var(--ds-surface-muted)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[var(--ds-fg-muted)]">
          Menampilkan{" "}
          <span className="font-semibold text-[var(--ds-fg)] tabular-nums">
            {startItem}
          </span>
          {" - "}
          <span className="font-semibold text-[var(--ds-fg)] tabular-nums">
            {endItem}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-[var(--ds-fg)] tabular-nums">
            {totalItems}
          </span>{" "}
          {itemLabel}
        </span>
        <select
          aria-label={`Jumlah ${itemLabel} per halaman`}
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="h-8 px-2 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)] cursor-pointer"
        >
          <option value={10}>10 / halaman</option>
          <option value={25}>25 / halaman</option>
          <option value={50}>50 / halaman</option>
          <option value={0}>Semua</option>
        </select>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange((p) => Math.max(1, p - 1))}
            className="h-8 text-xs rounded-lg px-3"
          >
            Sebelumnya
          </Button>
          <span className="text-[var(--ds-fg-muted)] px-1 font-medium tabular-nums">
            Hal {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
            className="h-8 text-xs rounded-lg px-3"
          >
            Selanjutnya
          </Button>
        </div>
      )}
    </div>
  );
}
