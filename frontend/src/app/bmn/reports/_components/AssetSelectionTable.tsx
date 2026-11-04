"use client";

import React from "react";

export interface ColumnDef<T> {
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

export interface AssetSelectionTableProps<T extends { id: string }> {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage?: string;
  columns: ColumnDef<T>[];
  maxHeightClass?: string;
  minWidthClass?: string;
}

export function AssetSelectionTable<T extends { id: string }>({
  items,
  selectedIds,
  onToggle,
  emptyMessage = "Belum ada aset yang tersedia.",
  columns,
  maxHeightClass = "max-h-96",
  minWidthClass = "min-w-[640px]",
}: AssetSelectionTableProps<T>) {
  return (
    <div className={`${maxHeightClass} overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800`}>
      <table className={`w-full ${minWidthClass} text-left text-xs`}>
        <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          <tr>
            <th className="w-10 px-3 py-2"></th>
            {columns.map((col, index) => (
              <th key={index} className={`px-3 py-2 ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <tr key={item.id} className="text-zinc-700 dark:text-zinc-200">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(item.id)}
                    />
                  </td>
                  {columns.map((col, index) => (
                    <td key={index} className={`px-3 py-2 ${col.className || ""}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
