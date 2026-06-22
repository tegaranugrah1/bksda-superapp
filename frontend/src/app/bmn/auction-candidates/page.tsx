"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCandidates, createBatch, AuctionCandidateAsset } from "../auction-batches/_lib/api";
import { formatRupiah } from "./_lib/auction-helpers";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Package,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BmnAuctionCandidatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");

  // Debounced search can be simplified or just regular search trigger
  const [triggerSearch, setTriggerSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerSearch(searchTerm);
    setPage(1);
  };

  // Fetch candidates from API
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["bmn-auction-candidates", triggerSearch, page, perPage],
    queryFn: async () => {
      return getCandidates({
        search: triggerSearch || undefined,
        page,
        per_page: perPage === 0 ? 9999 : perPage,
      });
    },
    placeholderData: (prev) => prev,
  });

  const assets = data?.data || [];
  const meta = data?.meta;
  const totalCandidates = meta?.total || 0;

  // Selected assets detailed list for calculation
  const selectedAssets = useMemo(() => {
    // Since we only have the current page's assets in memory, we merge currently fetched assets that are selected.
    // If they were selected on a previous page, we might not have their full details, so we match whatever we can find.
    // In a fully robust scenario, we keep a map of selected asset details.
    return assets.filter((asset) => selectedIds.has(asset.id));
  }, [assets, selectedIds]);

  const selectedTotalValue = useMemo(() => {
    return selectedAssets.reduce((sum, asset) => sum + (asset.nilai_perolehan || 0), 0);
  }, [selectedAssets]);

  // Selection handlers
  const eligibleAssetsOnPage = useMemo(() => {
    return assets.filter((asset) => asset.is_auction_eligible);
  }, [assets]);

  const allEligibleSelectedOnPage = useMemo(() => {
    return (
      eligibleAssetsOnPage.length > 0 &&
      eligibleAssetsOnPage.every((asset) => selectedIds.has(asset.id))
    );
  }, [eligibleAssetsOnPage, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allEligibleSelectedOnPage) {
        eligibleAssetsOnPage.forEach((asset) => next.delete(asset.id));
      } else {
        eligibleAssetsOnPage.forEach((asset) => next.add(asset.id));
      }
      return next;
    });
  };

  // Create Batch Mutation
  const createBatchMutation = useMutation({
    mutationFn: async (payload: { name: string; asset_ids: string[] }) => {
      return createBatch(payload);
    },
    onSuccess: (response) => {
      toast.success("Paket lelang berhasil dibuat!");
      setIsCreateDialogOpen(false);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["bmn-auction-candidates"] });
      // Redirect to the new batch workspace
      const newBatchId = response.data.id;
      router.push(`/bmn/auction-batches/${newBatchId}`);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || "Gagal membuat paket lelang.";
      toast.error(msg);
    },
  });

  const handleOpenCreateDialog = () => {
    if (selectedIds.size === 0) {
      toast.error("Pilih minimal satu aset terlebih dahulu.");
      return;
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setNewBatchName(`Paket Lelang BMN ${dd}/${mm}/${yyyy}`);
    setIsCreateDialogOpen(true);
  };

  const handleCreateBatchSubmit = () => {
    if (!newBatchName.trim()) {
      toast.error("Nama paket lelang wajib diisi.");
      return;
    }
    createBatchMutation.mutate({
      name: newBatchName,
      asset_ids: Array.from(selectedIds),
    });
  };

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kandidat Rusak Berat
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Pilih aset-aset dengan kondisi Rusak Berat untuk dikelompokkan ke dalam paket dokumen lelang BMN.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateDialog}
          disabled={selectedIds.size === 0}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2 rounded-xl transition duration-200"
        >
          <Plus className="h-4 w-4" />
          Buat Paket Lelang ({selectedIds.size})
        </Button>
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Total Kandidat
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {isLoading ? "-" : totalCandidates.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Dipilih
          </p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {selectedIds.size.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Nilai Perolehan Terpilih
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
            {formatRupiah(selectedTotalValue)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Cari nama aset, nomor register, atau kode barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-red-500"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="rounded-xl flex items-center gap-1.5"
            disabled={isLoading || isFetching}
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
          </Button>
        </form>
      </div>

      {/* Candidates Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="w-12 px-4 py-3 text-center">
                  <Checkbox
                    checked={allEligibleSelectedOnPage}
                    onCheckedChange={toggleSelectAllOnPage}
                    disabled={eligibleAssetsOnPage.length === 0}
                  />
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Identitas Aset
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Kategori / Lokasi
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status Dokumen
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nilai Perolehan
                </th>
                <th className="w-16 px-4 py-3 text-center">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                    <p className="text-sm text-zinc-400">Memuat kandidat aset...</p>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Package className="mx-auto mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm text-zinc-400">Tidak ada aset kandidat lelang yang ditemukan.</p>
                  </td>
                </tr>
              ) : (
                assets.map((asset: AuctionCandidateAsset) => {
                  const isSelected = selectedIds.has(asset.id);
                  const isEligible = asset.is_auction_eligible;
                  const isExpanded = expandedAssetId === asset.id;
                  const hasWarnings = asset.requires_document_review;
                  const warnings = asset.document_readiness_warnings || [];

                  return (
                    <React.Fragment key={asset.id}>
                      <tr
                        className={`transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 ${
                          isSelected ? "bg-red-50/20 dark:bg-red-500/5" : ""
                        } ${!isEligible ? "opacity-60 bg-zinc-50/20 dark:bg-zinc-900/10" : ""}`}
                      >
                        <td className="px-4 py-4 text-center align-middle">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(asset.id)}
                            disabled={!isEligible}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            {asset.nama_barang}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-bold text-red-700 dark:text-red-400">
                              {asset.kode_barang}
                            </span>
                            <span>•</span>
                            <span>NUP: {asset.nup}</span>
                            {asset.no_polisi && (
                              <>
                                <span>•</span>
                                <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 font-sans font-semibold">
                                  {asset.no_polisi}
                                </span>
                              </>
                            )}
                          </div>
                          {asset.merk_tipe && (
                            <div className="text-xs text-zinc-400 mt-0.5">{asset.merk_tipe}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                            {asset.jenis_bmn}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {asset.lokasi_ruang || asset.lokasi_spesifik || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {!isEligible ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 text-[10px] font-semibold">
                              Aktif di Batch: {asset.active_auction_batch_number}
                            </Badge>
                          ) : hasWarnings ? (
                            <button
                              type="button"
                              onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                              className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-2 py-0.5 rounded-full text-[10px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition"
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Review Dokumen ({warnings.length})
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                              <CheckCircle className="h-3 w-3 shrink-0" />
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {formatRupiah(asset.nilai_perolehan)}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Buku: {formatRupiah(asset.nilai_buku)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center align-middle">
                          {isEligible && hasWarnings && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                              title="Detail warnings dokumen"
                            >
                              <Info className="h-4 w-4 text-zinc-400 hover:text-zinc-600" />
                            </Button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Warnings Row */}
                      {isExpanded && isEligible && hasWarnings && (
                        <tr className="bg-amber-50/10 dark:bg-amber-900/5 border-t border-b border-amber-100/50 dark:border-amber-900/20">
                          <td />
                          <td colSpan={5} className="px-4 py-3">
                            <div className="space-y-1.5">
                              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Peringatan Kelengkapan Dokumen Administrasi:
                              </div>
                              <ul className="list-disc list-inside text-xs text-amber-700/90 dark:text-amber-400/90 pl-1 space-y-1">
                                {warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                              <p className="text-[10px] text-zinc-500 italic mt-2">
                                * Peringatan ini bersifat imbauan/advisory internal dan tidak menghalangi pembuatan paket lelang.
                              </p>
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

        {/* Table Pagination footer */}
        {meta && (
          <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/20 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {totalCandidates.toLocaleString("id-ID")} item total
              </span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-600 outline-none focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-850 dark:text-zinc-300"
              >
                <option value={10}>10 / halaman</option>
                <option value={50}>50 / halaman</option>
                <option value={100}>100 / halaman</option>
                <option value={0}>Semua</option>
              </select>
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

      {/* Create Batch Dialog Modal */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Buat Paket Lelang BMN
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              Kelompokkan {selectedIds.size} aset terpilih ke dalam paket dokumen lelang baru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="batchName" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Nama Paket Lelang
              </label>
              <Input
                id="batchName"
                type="text"
                placeholder="Masukkan nama paket lelang..."
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-xl"
              disabled={createBatchMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreateBatchSubmit}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
              disabled={createBatchMutation.isPending}
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  Buat Paket
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
