"use client";

import React, { useState, useMemo, useRef } from "react";
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
import { useRole } from "@/hooks/useRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BmnAuctionCandidatesPage() {
  const createTrigger = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canCreateBatch = hasPermission("bmn.auction.create");

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedAssets, setSelectedAssets] = useState<Map<string, AuctionCandidateAsset>>(new Map());
  const selectedIds = useMemo(() => new Set(selectedAssets.keys()), [selectedAssets]);
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
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
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

  const selectedTotalValue = useMemo(() => {
    return Array.from(selectedAssets.values()).reduce((sum, asset) => sum + (asset.nilai_perolehan || 0), 0);
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

  const toggleSelect = (asset: AuctionCandidateAsset) => {
    if (!canCreateBatch || !asset.is_auction_eligible || isFetching || createBatchMutation.isPending) return;
    setSelectedAssets((previous) => {
      const next = new Map(previous);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.set(asset.id, asset);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (!canCreateBatch || isFetching || createBatchMutation.isPending) return;
    setSelectedAssets((previous) => {
      const next = new Map(previous);
      eligibleAssetsOnPage.forEach((asset) => {
        if (allEligibleSelectedOnPage) next.delete(asset.id);
        else next.set(asset.id, asset);
      });
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
    if (!canCreateBatch || isFetching || createBatchMutation.isPending) return;
    createTrigger.current = document.activeElement as HTMLElement | null;
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
    if (!canCreateBatch || selectedIds.size === 0 || isFetching || createBatchMutation.isPending) return;
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
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ds-fg)]">
            Kandidat Rusak Berat
          </h1>
          <p className="text-sm text-[var(--ds-fg-muted)] mt-1">
            Pilih aset-aset dengan kondisi Rusak Berat untuk dikelompokkan ke dalam paket dokumen lelang BMN.
          </p>
        </div>
        {canCreateBatch && (
          <Button
            onClick={handleOpenCreateDialog}
            disabled={selectedIds.size === 0 || isFetching || createBatchMutation.isPending}
            className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-solid)] text-white font-semibold flex items-center gap-2 rounded-xl transition-colors duration-150 ease-out"
          >
            <Plus className="h-4 w-4" />
            Buat Paket Lelang ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 shadow-xs">
          <p className="text-xs font-medium text-[var(--ds-fg-muted)] uppercase tracking-wider">
            Total Kandidat
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--ds-fg)]">
            {isLoading ? "-" : totalCandidates.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 shadow-xs">
          <p className="text-xs font-medium text-[var(--ds-fg-muted)] uppercase tracking-wider">
            Dipilih
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--ds-accent-fg)]">
            {selectedIds.size.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 shadow-xs">
          <p className="text-xs font-medium text-[var(--ds-fg-muted)] uppercase tracking-wider">
            Nilai Perolehan Terpilih
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--ds-fg)] truncate">
            {formatRupiah(selectedTotalValue)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[var(--ds-fg-muted)]" />
            <Input
              aria-label="Cari kandidat aset"
              type="text"
              placeholder="Cari nama aset, nomor register, atau kode barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-[var(--ds-border-subtle)]"
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
      <div className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className={`${assets.length > 0 ? "bmn-wide-table" : ""} w-full text-left border-collapse`}>
            <thead className={assets.length > 0 ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                {canCreateBatch && (
                  <th className="w-12 px-4 py-3 text-center">
                    <Checkbox
                      aria-label="Pilih semua kandidat yang tersedia pada halaman ini"
                      checked={allEligibleSelectedOnPage ? true : eligibleAssetsOnPage.some((asset) => selectedIds.has(asset.id)) ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAllOnPage}
                      disabled={eligibleAssetsOnPage.length === 0 || isFetching || createBatchMutation.isPending}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Identitas Aset
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Kategori / Lokasi
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Status Dokumen
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Nilai Perolehan
                </th>
                <th className="w-16 px-4 py-3 text-center">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={canCreateBatch ? 6 : 5} className="p-12 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--ds-accent-fg)]" />
                    <p className="text-sm text-[var(--ds-fg-muted)]">Memuat kandidat aset...</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr><td colSpan={canCreateBatch ? 6 : 5} className="p-8 text-center"><p role="alert" className="text-[var(--ds-status-danger-fg)]">Kandidat aset gagal dimuat.</p><Button variant="outline" className="mt-3" onClick={() => refetch()}>Coba lagi</Button></td></tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={canCreateBatch ? 6 : 5} className="p-12 text-center">
                    <Package className="mx-auto mb-2 h-10 w-10 text-[var(--ds-fg-muted)]" />
                    <p className="text-sm text-[var(--ds-fg-muted)]">Tidak ada aset kandidat lelang yang ditemukan.</p>
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
                        aria-selected={isSelected}
                        className="bmn-table-row"
                      >
                        {canCreateBatch && (
                          <td className="px-4 py-4 text-center align-middle">
                            <Checkbox
                              checked={isSelected}
                              aria-label={`Pilih ${asset.nama_barang} NUP ${asset.nup}`}
                              onCheckedChange={() => toggleSelect(asset)}
                              disabled={!isEligible || isFetching || createBatchMutation.isPending}
                            />
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <div className="font-semibold text-sm text-[var(--ds-fg)]">
                            {asset.nama_barang}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs text-[var(--ds-fg-muted)]">
                            <span className="font-bold text-[var(--ds-accent-fg)]">
                              {asset.kode_barang}
                            </span>
                            <span>•</span>
                            <span>NUP: {asset.nup}</span>
                            {asset.no_polisi && (
                              <>
                                <span>•</span>
                                <span className="bg-[var(--ds-status-info-bg)] px-1.5 py-0.5 rounded text-[var(--ds-status-info-fg)] font-sans font-semibold">
                                  {asset.no_polisi}
                                </span>
                              </>
                            )}
                          </div>
                          {asset.merk_tipe && (
                            <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">{asset.merk_tipe}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-medium text-[var(--ds-fg)]">
                            {asset.jenis_bmn}
                          </div>
                          <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                            {asset.lokasi_ruang || asset.lokasi_spesifik || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {!isEligible ? (
                            <Badge data-status="warning" className="bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-status-warning-bg)] border-[var(--ds-status-warning-border)] text-xs font-semibold">
                              Aktif di Batch: {asset.active_auction_batch_number}
                            </Badge>
                          ) : hasWarnings ? (
                            <button
                              type="button"
                              data-status="warning"
                              aria-expanded={isExpanded}
                              aria-controls={`candidate-warning-${asset.id}`}
                              onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                              className="bmn-status-toggle inline-flex items-center gap-1 bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] px-2 py-0.5 rounded-full text-xs font-semibold hover:bg-[var(--ds-status-warning-bg)] transition-colors duration-150 ease-out"
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
                            <span data-status="success" className="inline-flex items-center gap-1 bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border border-[var(--ds-status-success-border)] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                              <CheckCircle className="h-3 w-3 shrink-0" />
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-sm text-[var(--ds-fg)]">
                            {formatRupiah(asset.nilai_perolehan)}
                          </div>
                          <div className="text-xs text-[var(--ds-fg-muted)]">
                            Buku: {formatRupiah(asset.nilai_buku)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center align-middle">
                          {isEligible && hasWarnings && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                              aria-label={`Lihat peringatan dokumen ${asset.nama_barang} NUP ${asset.nup}`}
                              aria-expanded={isExpanded}
                              aria-controls={`candidate-warning-${asset.id}`}
                              title="Detail peringatan dokumen"
                            >
                              <Info className="h-4 w-4 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)]" />
                            </Button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Warnings Row */}
                      {isExpanded && isEligible && hasWarnings && (
                        <tr className="bg-[var(--ds-status-warning-bg)] border-t border-b border-[var(--ds-status-warning-border)]">
                          {canCreateBatch && <td />}
                          <td id={`candidate-warning-${asset.id}`} colSpan={5} className="px-4 py-3">
                            <div className="space-y-1.5">
                              <div className="text-xs font-semibold text-[var(--ds-status-warning-fg)] flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Peringatan Kelengkapan Dokumen Administrasi:
                              </div>
                              <ul className="list-disc list-inside text-xs text-[var(--ds-status-warning-fg)] pl-1 space-y-1">
                                {warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                              <p className="text-xs text-[var(--ds-fg-muted)] italic mt-2">
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
          <div className="flex flex-col gap-3 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--ds-fg-muted)]">
                {totalCandidates.toLocaleString("id-ID")} item total
              </span>
              <select
                aria-label="Jumlah kandidat per halaman"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg-secondary)] outline-none"
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
                disabled={isFetching || page <= 1}
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
                disabled={isFetching || page >= (meta.last_page || 1) || perPage === 0}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Batch Dialog Modal */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-module="bmn" onCloseAutoFocus={(event) => { event.preventDefault(); createTrigger.current?.focus(); }} className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--ds-fg)]">
              Buat Paket Lelang BMN
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--ds-fg-muted)]">
              Kelompokkan {selectedIds.size} aset terpilih ke dalam paket dokumen lelang baru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="batchName" className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
                Nama Paket Lelang
              </label>
              <Input
                id="batchName"
                disabled={createBatchMutation.isPending}
                type="text"
                placeholder="Masukkan nama paket lelang..."
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="rounded-xl border-[var(--ds-border-subtle)]"
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
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-solid)] text-white font-semibold rounded-xl flex items-center gap-1.5"
              disabled={createBatchMutation.isPending || !newBatchName.trim() || selectedIds.size === 0 || !canCreateBatch || isFetching}
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
