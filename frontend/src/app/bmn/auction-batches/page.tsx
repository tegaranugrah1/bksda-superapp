"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBatches, deleteBatch, AuctionBatch } from "./_lib/api";
import { getStatusLabel, getStatusColorClass } from "./_lib/status";
import { formatRupiah } from "../auction-candidates/_lib/auction-helpers";
import {
  Search,
  Loader2,
  Plus,
  FileText,
  Eye,
  Inbox,
  Calendar,
  Layers,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

export default function BmnAuctionBatchesListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canCreate = hasPermission("bmn.auction.create");
  const canDelete = hasPermission("bmn.auction.delete");

  const handleDelete = async (batch: AuctionBatch) => {
    if (!canDelete || deletingId || !["DRAFT", "BATAL"].includes(batch.status)) return;
    const ok = await confirm({
      title: "Hapus Paket Lelang",
      description: `Apakah Anda yakin ingin menghapus paket "${batch.name}" (${batch.batch_number})? Sebanyak ${batch.assets_count} aset di dalamnya akan dikembalikan ke daftar kandidat lelang.`,
      confirmText: "Hapus Paket",
      cancelText: "Batal",
      variant: "danger",
      contentModule: "bmn",
      contentClassName: "bmn-assets-ui bmn-standard-ui bmn-popover",
    });

    if (!ok) return;

    try {
      setDeletingId(batch.id);
      await deleteBatch(batch.id);
      toast.success("Paket lelang berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["bmn-auction-batches"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menghapus paket lelang.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerSearch(searchTerm);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Fetch batches
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["bmn-auction-batches", triggerSearch, statusFilter, page, perPage],
    queryFn: async () => {
      return getBatches({
        search: triggerSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: perPage,
      });
    },
    placeholderData: (prev) => prev,
  });

  const batches = data?.data || [];
  const meta = data?.meta;
  const totalBatches = meta?.total || 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

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
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-8 space-y-6">
      {/* Enterprise Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] rounded-xl border border-[var(--ds-accent-soft-border)] shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--ds-fg)]">
                Paket Lelang BMN
              </h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                Lelang & Penghapusan
              </span>
            </div>
            <p className="text-sm text-[var(--ds-fg-muted)] mt-1">
              Daftar paket dokumen lelang BMN yang sedang diproses maupun yang telah terealisasi.
            </p>
          </div>
        </div>
        {canCreate && (
          <Button asChild className="w-full sm:w-auto bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white font-semibold flex items-center justify-center gap-2 rounded-xl transition-colors duration-150 ease-out min-h-[40px] shadow-sm"><Link href="/bmn/auction-candidates">
              <Plus className="h-4 w-4" />
              Buat Paket Baru
            </Link></Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[var(--ds-fg-muted)]" />
            <Input
              type="text"
              aria-label="Cari paket lelang"
              placeholder="Cari nama paket atau nomor batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-[var(--ds-border-subtle)] focus-visible:ring-[var(--ds-accent-soft-border)]"
            />
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Status paket lelang"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-9 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 text-sm text-[var(--ds-fg-secondary)] outline-none focus:ring-1 focus:ring-[var(--ds-accent-soft-border)] min-w-44"
            >
              <option value="">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="DIAJUKAN">Diajukan</option>
              <option value="JADWAL_DITETAPKAN">Jadwal Ditetapkan</option>
              <option value="LELANG_ULANG">Lelang Ulang</option>
              <option value="REALISASI">Realisasi</option>
              <option value="BATAL">Batal</option>
            </select>
            <Button
              type="submit"
              variant="outline"
              className="rounded-xl flex items-center gap-1.5 h-9"
              disabled={isLoading || isFetching}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-[var(--ds-accent-fg)]" /> : "Filter"}
            </Button>
          </div>
        </form>
      </div>

      {/* Batches Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className={`${batches.length ? "bmn-wide-table" : ""} w-full text-left border-collapse`}>
            <thead className={batches.length ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Nomor Batch
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Nama Paket
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Jumlah Aset
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Total Nilai Taksiran
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Tanggal Lelang
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Terakhir Diperbarui
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-[var(--ds-border-subtle)] rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-[var(--ds-border-subtle)] rounded" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 bg-[var(--ds-border-subtle)] rounded-md" /></td>
                    <td className="px-5 py-4 text-center"><div className="h-4 w-8 bg-[var(--ds-border-subtle)] rounded mx-auto" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-28 bg-[var(--ds-border-subtle)] rounded ml-auto" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-[var(--ds-border-subtle)] rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-[var(--ds-border-subtle)] rounded" /></td>
                    <td className="px-5 py-4 text-center"><div className="h-8 w-16 bg-[var(--ds-border-subtle)] rounded-lg mx-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr><td colSpan={8} className="p-8 text-center"><p role="alert" className="text-[var(--ds-status-danger-fg)]">Paket lelang gagal dimuat.</p><Button variant="outline" className="mt-3" onClick={() => refetch()}>Coba lagi</Button></td></tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Inbox className="h-10 w-10 text-[var(--ds-fg-muted)]" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--ds-fg-secondary)]">
                          Tidak Ada Paket Lelang
                        </p>
                        <p className="text-xs text-[var(--ds-fg-muted)] max-w-sm mx-auto">
                          Belum ada paket lelang yang dibuat untuk kriteria filter ini. Silakan buat paket baru melalui halaman kandidat.
                        </p>
                      </div>
                      <Button asChild
                          variant="outline"
                          size="sm"
                          className="mt-2 rounded-xl text-xs flex items-center gap-1.5"
                        ><Link href="/bmn/auction-candidates">
                          <Layers className="h-3.5 w-3.5" />
                          Pilih Kandidat Aset
                        </Link></Button>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch: AuctionBatch) => (
                  <tr
                    key={batch.id}
                    className="bmn-table-row"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--ds-fg)]">
                      {batch.batch_number}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-[var(--ds-fg)]">
                        {batch.name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={`${getStatusColorClass(
                          batch.status
                        )} text-xs font-bold px-2 py-0.5 rounded-md`}
                      >
                        {getStatusLabel(batch.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-center text-sm font-medium text-[var(--ds-fg)]">
                      {batch.assets_count}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-sm text-[var(--ds-fg)]">
                      {formatRupiah(batch.nilai_taksiran_total)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--ds-fg-secondary)]">
                        <Calendar className="h-3.5 w-3.5 text-[var(--ds-fg-muted)] shrink-0" />
                        <span>
                          {batch.status === "LELANG_ULANG" && batch.tanggal_lelang_ulang
                            ? formatDate(batch.tanggal_lelang_ulang)
                            : formatDate(batch.tanggal_lelang)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--ds-fg-muted)]">
                        <Clock className="h-3.5 w-3.5 text-[var(--ds-fg-muted)] shrink-0" />
                        <span>{formatDateTime(batch.updated_at)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button asChild
                            variant="ghost"
                            size="sm"
                            className="text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px] px-2.5"
                          ><Link href={`/bmn/auction-batches/${batch.id}`}>
                            <Eye className="h-4 w-4" />
                            Lihat
                          </Link></Button>
                        {(batch.status === "DRAFT" || batch.status === "BATAL") && canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={Boolean(deletingId)}
                            onClick={() => handleDelete(batch)}
                            className="bmn-icon-danger text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px] px-2.5"
                            title="Hapus paket lelang"
                          >
                            {deletingId === batch.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[var(--ds-status-danger-fg)]" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Hapus
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination footer */}
        {meta && totalBatches > 0 && (
          <div className="flex flex-col gap-3 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[var(--ds-fg-muted)]">
              Menampilkan {batches.length} dari {totalBatches.toLocaleString("id-ID")} paket
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((prev) => prev - 1)}
                className="rounded-lg text-xs"
              >
                Sebelumnya
              </Button>
              <span className="px-2 text-xs text-[var(--ds-fg-muted)]">
                Hal {page} / {meta.last_page || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (meta.last_page || 1) || isFetching}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
