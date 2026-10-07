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
    <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/30 dark:bg-slate-900/30">
      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-slate-400">
          Menampilkan{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {startItem}
          </span>
          {" - "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {endItem}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {totalItems}
          </span>{" "}
          {itemLabel}
        </span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="h-7 px-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 cursor-pointer"
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
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Prev
          </Button>
          <span className="text-slate-500 dark:text-slate-400 px-1 font-medium">
            Hal {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
