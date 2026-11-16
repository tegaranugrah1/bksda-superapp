"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Eye, Printer, FileText, Trash2 } from "lucide-react";
import { formatDate } from "../_lib/report-utils";

export interface RecentDocumentItem {
  id: string;
  number: string;
  document_date: string;
  assets_snapshot?: any[] | null;
  generator?: { name?: string | null } | null;
}

export interface RecentDocumentTableProps<T extends RecentDocumentItem> {
  items: T[];
  title?: string;
  subtitle?: string;
  unitLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  onEdit?: (item: T) => void;
  onView?: (item: T) => void;
  onPrint?: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export function RecentDocumentTable<T extends RecentDocumentItem>({
  items,
  title,
  subtitle,
  unitLabel = "aset",
  emptyMessage = "Belum ada dokumen yang pernah digenerate untuk pegawai ini.",
  loading = false,
  canWrite = false,
  canDelete = false,
  onEdit,
  onView,
  onPrint,
  onDuplicate,
  onDelete,
}: RecentDocumentTableProps<T>) {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      {(title || loading) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-[var(--ds-fg)]">{title}</h3>}
            {subtitle && <p className="text-xs text-[var(--ds-fg-muted)]">{subtitle}</p>}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />}
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200/80 dark:border-zinc-800 px-4 py-4 text-center text-xs text-[var(--ds-fg-muted)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200/80 dark:border-zinc-800">
          <table className="w-full min-w-180 text-left text-xs">
            <thead className="bg-slate-50/70 dark:bg-zinc-800/30 border-b border-slate-200/70 dark:border-zinc-800 text-[var(--ds-fg-muted)]">
              <tr>
                <th className="px-3 py-2">Nomor</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Aset</th>
                <th className="px-3 py-2">Pembuat</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
              {items.map((item) => (
                <tr key={item.id} className="bmn-table-row text-[var(--ds-fg-secondary)]">
                  <td className="px-3 py-2 font-semibold tabular-nums">{item.number}</td>
                  <td className="px-3 py-2 text-[var(--ds-fg-muted)] tabular-nums">{formatDate(item.document_date)}</td>
                  <td className="px-3 py-2 text-[var(--ds-fg-muted)] tabular-nums">
                    {item.assets_snapshot?.length || 0} {unitLabel}
                  </td>
                  <td className="px-3 py-2 text-[var(--ds-fg-muted)]">{item.generator?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {canWrite && onEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-[var(--ds-accent-soft-border)] px-2 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)]"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {onView && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => onView(item)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Lihat
                        </Button>
                      )}
                      {onPrint && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => onPrint(item)}
                        >
                          <Printer className="mr-1 h-4 w-4" />
                          Cetak
                        </Button>
                      )}
                      {canWrite && onDuplicate && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] px-2 text-xs hover:bg-[var(--ds-accent-soft)]"
                          onClick={() => onDuplicate(item)}
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          Duplikasi
                        </Button>
                      )}
                      {canDelete && onDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bmn-icon-danger h-8 rounded-lg px-2 text-xs"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
