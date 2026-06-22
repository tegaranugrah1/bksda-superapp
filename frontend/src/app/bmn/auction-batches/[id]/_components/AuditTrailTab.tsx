"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEvents, AuctionBatchEvent } from "../../_lib/api";
import {
  Loader2,
  History,
  AlertTriangle,
  User,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditTrailTabProps {
  batchId: string;
}

export function AuditTrailTab({ batchId }: AuditTrailTabProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Fetch events list
  const { data: response, isLoading, error } = useQuery({
    queryKey: ["bmn-auction-batch-events", batchId],
    queryFn: () => getEvents(batchId),
  });

  const events = response?.data || [];

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "batch.created":
        return "Pembuatan Paket";
      case "status.changed":
        return "Perubahan Status";
      case "asset.added":
        return "Penambahan Aset";
      case "asset.removed":
        return "Pengeluaran Aset";
      case "asset.order.updated":
        return "Penyusunan Urutan";
      case "asset.valuation.updated":
        return "Penilaian Aset";
      case "batch.locked":
        return "Penguncian Paket";
      case "asset.freeze_snapshot.created":
        return "Pembekuan Operasional Aset";
      case "schedule.recorded":
        return "Perekaman Jadwal Lelang";
      case "first_auction.result.recorded":
        return "Pencatatan Hasil Lelang I";
      case "reauction.started":
        return "Penetapan Lelang Ulang";
      case "reauction.result.recorded":
        return "Pencatatan Hasil Lelang II";
      case "realization.finalized":
        return "Finalisasi Realisasi";
      case "asset.disposed":
        return "Aset Terhapus/Disposed";
      case "asset.restored":
        return "Aset Dipulihkan/Restored";
      case "batch.canceled":
        return "Pembatalan Paket";
      case "document.printed":
        return "Pencetakan Dokumen";
      default:
        return action;
    }
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes("created") || action.includes("added")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30";
    }
    if (action.includes("removed") || action.includes("canceled") || action.includes("batal")) {
      return "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30";
    }
    if (action.includes("locked") || action.includes("freeze")) {
      return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30";
    }
    if (action.includes("printed")) {
      return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30";
    }
    return "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800";
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
          <History className="h-5 w-5 text-emerald-600" />
          Riwayat Audit Aktivitas
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Log historis lengkap mengenai seluruh tindakan administratif dan perubahan data pada paket lelang BMN.
        </p>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-52">
                  Waktu
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-44">
                  Aktor
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-56">
                  Tindakan
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Catatan / Aset Terkait
                </th>
                <th className="w-16 px-5 py-3.5 text-center">
                  <span className="sr-only">Detail</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-600" />
                    <p className="text-xs text-zinc-400 mt-1">Memuat log riwayat...</p>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-400">
                    Belum ada riwayat aktivitas yang tercatat untuk paket lelang ini.
                  </td>
                </tr>
              ) : (
                events.map((event: AuctionBatchEvent) => {
                  const isExpanded = expandedEventId === event.id;
                  const hasDetails = event.previous_values || event.new_values;

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30">
                        {/* Time */}
                        <td className="px-5 py-4 text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{formatDateTime(event.created_at)}</span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="px-5 py-4 text-zinc-850 dark:text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="font-medium truncate max-w-[150px]">
                              {event.actor_name || "Sistem"}
                            </span>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block border px-2 py-0.5 rounded-md text-[10px] font-bold ${getActionBadgeClass(
                              event.action
                            )}`}
                          >
                            {getActionLabel(event.action)}
                          </span>
                        </td>

                        {/* Notes / Affected Asset */}
                        <td className="px-5 py-4 text-zinc-650 dark:text-zinc-350">
                          <div className="space-y-0.5">
                            <p className="font-medium">{event.notes || "-"}</p>
                            {event.bmn_asset_id && (
                              <div className="flex items-center gap-1 text-[9px] text-zinc-450 font-mono">
                                <Layers className="h-3 w-3" />
                                <span>Aset ID: {event.bmn_asset_id}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Detail Trigger */}
                        <td className="px-5 py-4 text-center align-middle">
                          {hasDetails && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="rounded-lg h-7 w-7"
                              title="Tampilkan detail JSON diff"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON details panel */}
                      {isExpanded && hasDetails && (
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-b border-zinc-100 dark:border-zinc-800">
                          <td />
                          <td colSpan={4} className="px-5 py-4">
                            <div className="grid gap-4 md:grid-cols-2 text-[10px] font-mono">
                              {/* Previous Values */}
                              <div className="space-y-1">
                                <span className="font-sans font-bold text-zinc-500 uppercase tracking-wider block">
                                  Sebelum (Previous)
                                </span>
                                <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-h-48 text-zinc-600 dark:text-zinc-400">
                                  {event.previous_values
                                    ? JSON.stringify(event.previous_values, null, 2)
                                    : "null"}
                                </pre>
                              </div>

                              {/* New Values */}
                              <div className="space-y-1">
                                <span className="font-sans font-bold text-zinc-500 uppercase tracking-wider block">
                                  Sesudah (New)
                                </span>
                                <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-h-48 text-zinc-700 dark:text-zinc-300">
                                  {event.new_values
                                    ? JSON.stringify(event.new_values, null, 2)
                                    : "null"}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
