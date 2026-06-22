"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getBatches, AuctionBatch } from "./_lib/api";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function BmnAuctionBatchesListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [triggerSearch, setTriggerSearch] = useState("");

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
  const { data, isLoading, isFetching } = useQuery({
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
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Paket Lelang BMN
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Daftar paket dokumen lelang BMN yang sedang diproses maupun yang telah terealisasi.
          </p>
        </div>
        <Link href="/bmn/auction-candidates">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 rounded-xl transition duration-200">
            <Plus className="h-4 w-4" />
            Buat Paket Baru
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Cari nama paket atau nomor batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-650 outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 min-w-44"
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
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : "Filter"}
            </Button>
          </div>
        </form>
      </div>

      {/* Batches Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nomor Batch
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nama Paket
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Jumlah Aset
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Total Nilai Taksiran
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Tanggal Lelang
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Terakhir Diperbarui
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <Loader2 className="mx-auto mb-2.5 h-7 w-7 animate-spin text-emerald-600" />
                    <p className="text-sm text-zinc-400 font-medium">Memuat daftar paket lelang...</p>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Inbox className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Tidak Ada Paket Lelang
                        </p>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          Belum ada paket lelang yang dibuat untuk kriteria filter ini. Silakan buat paket baru melalui halaman kandidat.
                        </p>
                      </div>
                      <Link href="/bmn/auction-candidates">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 rounded-xl text-xs flex items-center gap-1.5"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Pilih Kandidat Aset
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch: AuctionBatch) => (
                  <tr
                    key={batch.id}
                    className="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {batch.batch_number}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-zinc-950 dark:text-zinc-50">
                        {batch.name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={`${getStatusColorClass(
                          batch.status
                        )} text-[10px] font-bold px-2 py-0.5 rounded-md`}
                      >
                        {getStatusLabel(batch.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-center text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {batch.assets_count}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {formatRupiah(batch.nilai_taksiran_total)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-655 dark:text-zinc-300">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {batch.status === "LELANG_ULANG" && batch.tanggal_lelang_ulang
                            ? formatDate(batch.tanggal_lelang_ulang)
                            : formatDate(batch.tanggal_lelang)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>{formatDateTime(batch.updated_at)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      <Link href={`/bmn/auction-batches/${batch.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Lihat
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination footer */}
        {meta && totalBatches > 0 && (
          <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/20 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Menampilkan {batches.length} dari {totalBatches.toLocaleString("id-ID")} paket
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="rounded-lg text-xs"
              >
                Prev
              </Button>
              <span className="px-2 text-xs text-zinc-500 dark:text-zinc-400">
                Hal {page} / {meta.last_page || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === meta.last_page || perPage === 0}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
