"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Wrench, Loader2, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/app/bmn/_lib/asset-utils";

interface IMaintenance {
  id: string;
  tanggal_service: string;
  deskripsi: string;
  biaya: number;
  kondisi_baru?: string;
  asset?: { nama_barang: string; kode_barang: string };
}

interface IResponse { data: IMaintenance[]; last_page?: number; meta?: { last_page: number; total: number } }

export default function BmnMaintenancePage() {
  const [page, setPage] = useState(1);

  const { data: response, isLoading, isFetching, isError, refetch } = useQuery<IResponse>({
    queryKey: ["bmn-maintenances", page],
    queryFn: async () => { const res = await api.get("/bmn/maintenances", { params: { page } }); return res.data; },
    placeholderData: (prev) => prev,
  });
  const lastPage = response?.meta?.last_page ?? response?.last_page ?? 1;

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 sm:p-5 md:p-7 space-y-5 text-[var(--ds-fg)] ">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>

            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Pemeliharaan Aset
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Riwayat servis, perbaikan teknis, dan catatan biaya pemeliharaan BMN.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className={`${response?.data?.length ? "bmn-wide-table" : ""} w-full text-left`}>
            <thead>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Tanggal & Aset</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Deskripsi</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-right">Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={3} className="px-4 py-4">
                      <div className="h-10 bg-[var(--ds-surface-muted)] rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr><td colSpan={3} className="p-8 text-center"><p role="alert" className="text-sm text-[var(--ds-status-danger-fg)]">Riwayat pemeliharaan gagal dimuat.</p><Button variant="outline" className="mt-3" onClick={() => refetch()}>Coba lagi</Button></td></tr>
              ) : !response?.data?.length ? (
                <tr><td colSpan={3} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-[var(--ds-fg-muted)]" /><p className="text-sm text-[var(--ds-fg-muted)]">Belum ada riwayat pemeliharaan.</p></td></tr>
              ) : (
                response?.data?.map((log) => (
                  <tr key={log.id} className="bmn-table-row">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-[var(--ds-fg)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--ds-fg-muted)]" /> {log.tanggal_service}
                      </p>
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">{log.asset?.nama_barang || "Aset Terhapus"}</p>
                      <p className="text-xs text-[var(--ds-fg-muted)] font-mono">{log.asset?.kode_barang}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--ds-fg-muted)] max-w-sm truncate">{log.deskripsi}</p>
                      {log.kondisi_baru && (
                        <span data-status={log.kondisi_baru === "Baik" ? "success" : log.kondisi_baru === "Rusak Ringan" ? "warning" : log.kondisi_baru === "Rusak Berat" ? "danger" : "neutral"} className="inline-flex mt-1 text-xs px-2 py-0.5 rounded-full font-bold">
                          → {log.kondisi_baru}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-[var(--ds-fg)]">{formatRupiah(log.biaya)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-between text-sm">
          <span className="text-xs text-[var(--ds-fg-muted)]">Total {response?.data?.length || 0} catatan servis</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(p => Math.max(1, p - 1))} className="text-xs rounded-lg">Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={page >= lastPage || isFetching} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Selanjutnya</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
