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
  const labelId = React.useId();
  return (
    <div className={`${maxHeightClass} overflow-auto rounded-xl border border-[var(--ds-border-subtle)] `}>
      <table className={`w-full ${items.length > 0 ? minWidthClass : ""} text-left text-xs`}>
        <thead className={`${items.length === 0 ? "hidden sm:table-header-group" : ""} sticky top-0 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]`}>
          <tr>
            <th className="w-10 px-3 py-2"></th>
            {columns.map((col, index) => (
              <th key={index} className={`px-3 py-2 ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ds-border-subtle)] ">
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-[var(--ds-fg-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <tr key={item.id} aria-selected={isSelected} className="bmn-table-row text-[var(--ds-fg-secondary)]">
                  <td className="px-3 py-2">
                    <input
                      aria-labelledby={`${labelId}-${item.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(item.id)}
                    />
                  </td>
                  {columns.map((col, index) => (
                    <td id={index === 0 ? `${labelId}-${item.id}` : undefined} key={index} className={`px-3 py-2 ${col.className || ""}`}>
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
