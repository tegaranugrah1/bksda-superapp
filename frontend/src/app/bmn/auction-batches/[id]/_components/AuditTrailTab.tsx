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
  const { data: response, isLoading, error, refetch } = useQuery({
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
      return "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]   ";
    }
    if (action.includes("removed") || action.includes("canceled") || action.includes("batal")) {
      return "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border-[var(--ds-status-danger-border)]   ";
    }
    if (action.includes("locked") || action.includes("freeze")) {
      return "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]   ";
    }
    if (action.includes("printed")) {
      return "bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border-[var(--ds-status-info-border)]   ";
    }
    return "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] border-[var(--ds-border-subtle)]   ";
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-5 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-[var(--ds-fg)] flex items-center gap-1.5">
          <History className="h-5 w-5 text-[var(--ds-accent-fg)]" />
          Riwayat Audit Aktivitas
        </h2>
        <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
          Log historis lengkap mengenai seluruh tindakan administratif dan perubahan data pada paket lelang BMN.
        </p>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-xs">
        <div className="overflow-x-auto">
          <table className={`${events.length ? "bmn-wide-table" : ""} w-full text-left border-collapse`}>
            <thead className={events.length ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] w-52">
                  Waktu
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] w-44">
                  Aktor
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] w-56">
                  Tindakan
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Catatan / Aset Terkait
                </th>
                <th className="w-16 px-5 py-3.5 text-center">
                  <span className="sr-only">Detail</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--ds-accent-fg)]" />
                    <p className="text-xs text-[var(--ds-fg-muted)] mt-1">Memuat log riwayat...</p>
                  </td>
                </tr>
              ) : error ? (<tr><td colSpan={5} className="p-8 text-center"><p role="alert" className="text-[var(--ds-status-danger-fg)]">Riwayat audit gagal dimuat.</p><Button variant="outline" onClick={() => refetch()}>Coba lagi</Button></td></tr>) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[var(--ds-fg-muted)]">
                    Belum ada riwayat aktivitas yang tercatat untuk paket lelang ini.
                  </td>
                </tr>
              ) : (
                events.map((event: AuctionBatchEvent) => {
                  const isExpanded = expandedEventId === event.id;
                  const hasDetails = event.previous_values || event.new_values;

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="bmn-table-row">
                        {/* Time */}
                        <td className="px-5 py-4 text-[var(--ds-fg-muted)]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[var(--ds-fg-muted)]" />
                            <span>{formatDateTime(event.created_at)}</span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="px-5 py-4 text-[var(--ds-fg)]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[var(--ds-fg-muted)] shrink-0" />
                            <span className="font-medium truncate max-w-[150px]">
                              {event.actor_name || "Sistem"}
                            </span>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block border px-2 py-0.5 rounded-md text-xs font-bold ${getActionBadgeClass(
                              event.action
                            )}`}
                          >
                            {getActionLabel(event.action)}
                          </span>
                        </td>

                        {/* Notes / Affected Asset */}
                        <td className="px-5 py-4 text-[var(--ds-fg-secondary)]">
                          <div className="space-y-0.5">
                            <p className="font-medium">{event.notes || "-"}</p>
                            {event.bmn_asset_id && (
                              <div className="flex items-center gap-1 text-xs text-[var(--ds-fg-muted)] font-mono">
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
                              aria-label={`Lihat detail ${getActionLabel(event.action)}`}
                              aria-expanded={isExpanded}
                              aria-controls={`auction-event-${event.id}`}
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
                        <tr className="bg-[var(--ds-surface-muted)] border-t border-b border-[var(--ds-border-subtle)]">
                          <td />
                          <td id={`auction-event-${event.id}`} colSpan={4} className="px-5 py-4">
                            <div className="grid gap-4 md:grid-cols-2 text-xs font-mono">
                              {/* Previous Values */}
                              <div className="space-y-1">
                                <span className="font-sans font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider block">
                                  Sebelum (Previous)
                                </span>
                                <pre className="bg-[var(--ds-surface-muted)] p-3 rounded-lg border border-[var(--ds-border-subtle)] overflow-x-auto max-h-48 text-[var(--ds-fg-secondary)]">
                                  {event.previous_values
                                    ? JSON.stringify(event.previous_values, null, 2)
                                    : "null"}
                                </pre>
                              </div>

                              {/* New Values */}
                              <div className="space-y-1">
                                <span className="font-sans font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider block">
                                  Sesudah (New)
                                </span>
                                <pre className="bg-[var(--ds-surface-muted)] p-3 rounded-lg border border-[var(--ds-border-subtle)] overflow-x-auto max-h-48 text-[var(--ds-fg-secondary)]">
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
