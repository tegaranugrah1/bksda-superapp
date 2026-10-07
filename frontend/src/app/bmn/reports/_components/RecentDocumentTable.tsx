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
  onEdit,
  onView,
  onPrint,
  onDuplicate,
  onDelete,
}: RecentDocumentTableProps<T>) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {(title || loading) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-center text-xs text-zinc-500 dark:border-zinc-800">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Nomor</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Aset</th>
                <th className="px-3 py-2">Pembuat</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item) => (
                <tr key={item.id} className="text-zinc-700 dark:text-zinc-200">
                  <td className="px-3 py-2 font-semibold">{item.number}</td>
                  <td className="px-3 py-2 text-zinc-500">{formatDate(item.document_date)}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {item.assets_snapshot?.length || 0} {unitLabel}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{item.generator?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-emerald-200 px-2 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
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
                      {onDuplicate && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg bg-emerald-600 px-2 text-xs hover:bg-emerald-500"
                          onClick={() => onDuplicate(item)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Duplikasi
                        </Button>
                      )}
                      {canWrite && onDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
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
