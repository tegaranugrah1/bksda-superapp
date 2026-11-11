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
    <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5  ">
      {(title || loading) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-[var(--ds-fg)] ">{title}</h3>}
            {subtitle && <p className="text-xs text-[var(--ds-fg-muted)] ">{subtitle}</p>}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />}
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--ds-border-subtle)] px-4 py-5 text-center text-xs text-[var(--ds-fg-muted)] ">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-[var(--ds-border-subtle)] ">
          <table className="w-full min-w-180 text-left text-xs">
            <thead className="bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]  ">
              <tr>
                <th className="px-3 py-2">Nomor</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Aset</th>
                <th className="px-3 py-2">Pembuat</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)] ">
              {items.map((item) => (
                <tr key={item.id} className="bmn-table-row text-[var(--ds-fg-secondary)]">
                  <td className="px-3 py-2 font-semibold">{item.number}</td>
                  <td className="px-3 py-2 text-[var(--ds-fg-muted)]">{formatDate(item.document_date)}</td>
                  <td className="px-3 py-2 text-[var(--ds-fg-muted)]">
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
                          className="h-8 rounded-lg border-[var(--ds-accent-soft-border)] px-2 text-xs text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)]   "
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
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
                          <Eye className="mr-1 h-3.5 w-3.5" />
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
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Cetak
                        </Button>
                      )}
                      {canWrite && onDuplicate && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg bg-[var(--ds-accent-soft)] px-2 text-xs hover:bg-[var(--ds-accent-soft)]"
                          onClick={() => onDuplicate(item)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
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
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
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
