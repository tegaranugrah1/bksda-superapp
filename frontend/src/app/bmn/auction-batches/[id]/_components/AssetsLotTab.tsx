"use client";

import React, { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addAssets,
  removeAsset,
  updateOrder,
  updateValuation,
  getCandidates,
  AuctionBatch,
  AuctionBatchAsset,
  AuctionCandidateAsset,
} from "../../_lib/api";
import { api } from "@/lib/api";
import { formatRupiah } from "../../../auction-candidates/_lib/auction-helpers";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  Search,
  Package,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssetsLotTabProps {
  formState: ReturnType<typeof useAssetsLotFormState>;
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

export function useAssetsLotFormState(batch?: AuctionBatch) {
  const [localAssets, setLocalAssets] = useState<AuctionBatchAsset[]>([]);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalTriggerSearch, setModalTriggerSearch] = useState("");
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());
  const [lotDrafts, setLotDrafts] = useState<Record<string, string>>({});
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditAsset, setQuickEditAsset] = useState<AuctionBatchAsset | null>(null);
  const [quickEditBpkb, setQuickEditBpkb] = useState("");
  const [quickEditPolisi, setQuickEditPolisi] = useState("");
  const [quickEditRangka, setQuickEditRangka] = useState("");
  const [quickEditMesin, setQuickEditMesin] = useState("");
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
  useEffect(() => {
    if (batch?.assets) {
      setLocalAssets(batch.assets);
      setLotDrafts(
        Object.fromEntries(
          batch.assets.map((asset) => [asset.id, asset.pivot?.lot_number || ""])
        )
      );
    }
  }, [batch]);
  return { localAssets, setLocalAssets, expandedAssetId, setExpandedAssetId, isAddModalOpen, setIsAddModalOpen, modalSearch, setModalSearch, modalTriggerSearch, setModalTriggerSearch, modalSelectedIds, setModalSelectedIds, lotDrafts, setLotDrafts, isQuickEditOpen, setIsQuickEditOpen, quickEditAsset, setQuickEditAsset, quickEditBpkb, setQuickEditBpkb, quickEditPolisi, setQuickEditPolisi, quickEditRangka, setQuickEditRangka, quickEditMesin, setQuickEditMesin, isSavingQuickEdit, setIsSavingQuickEdit };
}

export function AssetsLotTab({ batch, readOnly, onRefetch, formState }: AssetsLotTabProps) {
  const dialogOpener = useRef<HTMLElement | null>(null);
  const { localAssets, setLocalAssets, expandedAssetId, setExpandedAssetId, isAddModalOpen, setIsAddModalOpen, modalSearch, setModalSearch, modalTriggerSearch, setModalTriggerSearch, modalSelectedIds, setModalSelectedIds, lotDrafts, setLotDrafts, isQuickEditOpen, setIsQuickEditOpen, quickEditAsset, setQuickEditAsset, quickEditBpkb, setQuickEditBpkb, quickEditPolisi, setQuickEditPolisi, quickEditRangka, setQuickEditRangka, quickEditMesin, setQuickEditMesin, isSavingQuickEdit, setIsSavingQuickEdit } = formState;
  const queryClient = useQueryClient();

  // Add Assets Modal State

  // Edit Lot State

  // Quick Edit Asset State

  const handleOpenQuickEdit = (asset: AuctionBatchAsset) => {
    if (readOnly) return;
    dialogOpener.current = document.activeElement as HTMLElement | null;
    setQuickEditAsset(asset);
    setQuickEditBpkb(asset.no_bpkp || "");
    setQuickEditPolisi(asset.no_polisi || "");
    setQuickEditRangka(asset.no_rangka || "");
    setQuickEditMesin(asset.no_mesin || "");
    setIsQuickEditOpen(true);
  };

  const handleSaveQuickEdit = async () => {
    if (readOnly || isSavingQuickEdit || !quickEditAsset) return;
    setIsSavingQuickEdit(true);
    try {
      await api.put(`/bmn/assets/${quickEditAsset.id}`, {
        no_bpkp: quickEditBpkb.trim() || null,
        no_polisi: quickEditPolisi.trim() || null,
        no_rangka: quickEditRangka.trim() || null,
        no_mesin: quickEditMesin.trim() || null,
      });
      toast.success("Dokumen aset berhasil diperbarui.");
      setIsQuickEditOpen(false);
      onRefetch();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Gagal memperbarui dokumen aset.";
      toast.error(errorMsg);
    } finally {
      setIsSavingQuickEdit(false);
    }
  };



  // Query Candidates for Modal
  const { data: candidatesData, isLoading: isLoadingCandidates, refetch: refetchCandidates, isError: candidateError, isFetching: isFetchingCandidates } = useQuery({
    queryKey: ["bmn-auction-candidates-modal", modalTriggerSearch],
    queryFn: () => getCandidates({ search: modalTriggerSearch || undefined, per_page: 50 }),
    enabled: isAddModalOpen,
  });

  const candidates = candidatesData?.data || [];
  const availableCandidates = candidates.filter(c => c.is_auction_eligible && !localAssets.some(a => a.id === c.id));

  // Mutations
  const invalidateDocumentContext = () => {
    queryClient.invalidateQueries({ queryKey: ["bmn-auction-document-context", batch.id] });
  };

  const addAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) => addAssets(batch.id, assetIds),
    onSuccess: () => {
      toast.success("Aset berhasil ditambahkan!");
      setIsAddModalOpen(false);
      setModalSelectedIds(new Set());
      invalidateDocumentContext();
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal menambahkan aset.");
    },
  });

  const removeAssetMutation = useMutation({
    mutationFn: (assetId: string) => removeAsset(batch.id, assetId),
    onSuccess: () => {
      toast.success("Aset berhasil dikeluarkan dari paket.");
      invalidateDocumentContext();
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal mengeluarkan aset.");
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: (orderedAssetIds: string[]) => updateOrder(batch.id, orderedAssetIds),
    onSuccess: () => {
      invalidateDocumentContext();
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui urutan aset.");
      // Rollback local state
      if (batch.assets) setLocalAssets(batch.assets);
    },
  });

  const updateLotMutation = useMutation({
    mutationFn: ({ assetId, lotNumber }: { assetId: string; lotNumber: string | null }) =>
      updateValuation(batch.id, assetId, { lot_number: lotNumber }),
    onSuccess: () => {
      toast.success("Nomor Lot berhasil diperbarui.");
      invalidateDocumentContext();
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui nomor Lot.");
    },
  });

  // Reorder Handlers
  const handleMoveUp = (index: number) => {
    if (readOnly || updateOrderMutation.isPending || index === 0) return;
    const nextAssets = [...localAssets];
    [nextAssets[index - 1], nextAssets[index]] = [nextAssets[index], nextAssets[index - 1]];
    setLocalAssets(nextAssets);
    updateOrderMutation.mutate(nextAssets.map((a) => a.id));
  };

  const handleMoveDown = (index: number) => {
    if (readOnly || updateOrderMutation.isPending || index >= localAssets.length - 1) return;
    const nextAssets = [...localAssets];
    [nextAssets[index], nextAssets[index + 1]] = [nextAssets[index + 1], nextAssets[index]];
    setLocalAssets(nextAssets);
    updateOrderMutation.mutate(nextAssets.map((a) => a.id));
  };

  // Add Assets Modal Handlers
  const handleOpenAddModal = () => {
    if (readOnly) return;
    dialogOpener.current = document.activeElement as HTMLElement | null;
    setModalSearch("");
    setModalTriggerSearch("");
    setModalSelectedIds(new Set());
    setIsAddModalOpen(true);
  };

  const handleModalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalTriggerSearch(modalSearch);
  };

  const toggleModalSelect = (id: string) => {
    if (readOnly || addAssetsMutation.isPending || isFetchingCandidates || !candidates.some(a => a.id === id && a.is_auction_eligible) || localAssets.some(a => a.id === id)) return;
    setModalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSubmit = () => {
    if (readOnly || addAssetsMutation.isPending || isFetchingCandidates) return;
    if (modalSelectedIds.size === 0) {
      toast.error("Pilih minimal satu aset.");
      return;
    }
    addAssetsMutation.mutate(Array.from(modalSelectedIds));
  };

  const handleSaveLot = (assetId: string) => {
    if (readOnly || updateLotMutation.isPending) return;
    updateLotMutation.mutate({
      assetId,
      lotNumber: lotDrafts[assetId]?.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)]">
            Daftar Aset & Nomor Lot
          </h2>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
            Kelola aset dalam paket ini, atur nomor Lot, dan urutan dokumen cetak.
          </p>
        </div>
        {!readOnly && (
          <Button
            onClick={handleOpenAddModal}
            className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Tambah Aset
          </Button>
        )}
      </div>

      {/* Assets Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-xs">
        <div className="overflow-x-auto">
          <table className={`${localAssets.length ? "bmn-wide-table" : ""} w-full text-left border-collapse`}>
            <thead className={localAssets.length ? "" : "hidden sm:table-header-group"}>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="w-24 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  No. / Urutan
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Identitas Aset
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Kategori
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Status Dokumen
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Nilai Perolehan
                </th>
                {!readOnly && (
                  <th className="w-16 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {localAssets.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 5 : 6} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Package className="h-9 w-9 text-[var(--ds-fg-muted)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ds-fg-secondary)]">
                          Belum Ada Aset Terpilih
                        </p>
                        <p className="text-xs text-[var(--ds-fg-muted)] max-w-sm mx-auto mt-0.5">
                          Silakan tambahkan aset dari daftar kandidat rusak berat ke dalam paket lelang ini.
                        </p>
                      </div>
                      {!readOnly && (
                        <Button
                          onClick={handleOpenAddModal}
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs flex items-center gap-1.5 mt-2"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Tambah Aset
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                localAssets.map((asset, index) => {
                  const isExpanded = expandedAssetId === asset.id;
                  const hasWarnings = asset.requires_document_review;
                  const warnings = asset.document_readiness_warnings || [];
                  return (
                    <React.Fragment key={asset.id}>
                      <tr className="bmn-table-row">
                        {/* No / Urutan */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono text-xs font-bold text-[var(--ds-fg-secondary)] w-5 text-right">
                              {index + 1}.
                            </span>
                            {!readOnly && (
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={index === 0 || updateOrderMutation.isPending}
                                  onClick={() => handleMoveUp(index)}
                                  className="rounded-lg h-7 w-7"
                                  title="Naikkan urutan"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={index === localAssets.length - 1 || updateOrderMutation.isPending}
                                  onClick={() => handleMoveDown(index)}
                                  className="rounded-lg h-7 w-7"
                                  title="Turunkan urutan"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Identitas Aset */}
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
                        </td>

                        {/* Kategori */}
                        <td className="px-4 py-4 text-xs font-medium text-[var(--ds-fg-secondary)]">
                          {asset.jenis_bmn}
                        </td>

                        {/* Readiness */}
                        <td className="px-4 py-4">
                          {hasWarnings ? (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-controls={`lot-warning-${asset.id}`}
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
                            <span className="inline-flex items-center gap-1 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                              <CheckCircle className="h-3 w-3 shrink-0" />
                              Ready
                            </span>
                          )}
                        </td>

                        {/* Nilai Perolehan */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-sm text-[var(--ds-fg)]">
                            {formatRupiah(asset.nilai_perolehan)}
                          </div>
                          {asset.pivot?.nilai_taksiran && (
                            <div className="text-xs text-[var(--ds-fg-muted)] font-semibold mt-0.5">
                              Taksiran: {formatRupiah(asset.pivot.nilai_taksiran)}
                            </div>
                          )}
                        </td>

                        {/* Delete action */}
                        {!readOnly && (
                          <td className="px-4 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={removeAssetMutation.isPending}
                              onClick={() => { if (!readOnly) removeAssetMutation.mutate(asset.id); }}
                              className="bmn-icon-danger text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-lg"
                              title="Keluarkan dari paket lelang"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Warnings */}
                      {isExpanded && hasWarnings && (
                        <tr className="bg-[var(--ds-status-warning-bg)] border-t border-b border-[var(--ds-status-warning-border)]">
                          <td id={`lot-warning-${asset.id}`} colSpan={readOnly ? 5 : 6} className="px-5 py-3.5">
                            <div className="space-y-1.5">
                              <div className="text-xs font-semibold text-[var(--ds-status-warning-fg)] flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Review Dokumen Administrasi Aset:
                              </div>
                              <ul className="list-disc list-inside text-xs text-[var(--ds-status-warning-fg)] pl-1 space-y-1">
                                {warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                              {!readOnly && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenQuickEdit(asset)}
                                  className="rounded-xl text-xs h-7 px-3 flex items-center gap-1 bg-[var(--ds-status-warning-bg)] hover:bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)] mt-2.5"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Lengkapi Dokumen Aset
                                </Button>
                              )}
                              <p className="text-xs text-[var(--ds-fg-muted)] italic mt-2">
                                * Peringatan ini bersifat imbauan dan tidak memblokir proses lelang.
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
      </div>

      {/* Add Assets Modal Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover w-full sm:max-w-6xl max-w-[calc(100vw-2rem)] rounded-2xl flex flex-col max-h-[88vh] p-6 gap-4 border border-[var(--ds-border-subtle)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--ds-fg)]">
              Tambah Aset Baru
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--ds-fg-muted)]">
              Pilih aset rusak berat yang tidak aktif di paket lain untuk ditambahkan ke paket lelang ini.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar inside modal */}
          <form onSubmit={handleModalSearchSubmit} className="flex gap-2 py-1">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-[var(--ds-fg-muted)]" />
              <Input
                type="text"
                aria-label="Cari kandidat untuk paket"
                placeholder="Cari nama aset, kode barang, NUP..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-9 rounded-xl border-[var(--ds-border-subtle)] focus-visible:ring-[var(--ds-accent-soft-border)] h-9 text-xs"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="rounded-xl flex items-center gap-1.5 h-9 text-xs px-4"
            >
              Cari
            </Button>
          </form>

          {/* Modal Table body */}
          <div className="flex-1 overflow-y-auto border border-[var(--ds-border-subtle)] rounded-xl">
            <table className={`${availableCandidates.length ? "bmn-wide-table" : ""} w-full text-left border-collapse`}>
              <thead className="sticky top-0 bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)]">
                <tr className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  <th className="w-12 px-4 py-3 text-center">Pilih</th>
                  <th className="px-4 py-3">Identitas Aset</th>
                  <th className="px-4 py-3">Merk / Tipe / Polisi</th>
                  <th className="px-4 py-3 text-center">Kondisi</th>
                  <th className="px-4 py-3 text-center">Status Dokumen</th>
                  <th className="px-4 py-3 text-right">Nilai Perolehan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)] text-xs">
                {isLoadingCandidates ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--ds-accent-fg)]" />
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-2">Memuat kandidat aset...</p>
                    </td>
                  </tr>
                ) : candidateError ? (<tr><td colSpan={6} className="p-6 text-center"><p role="alert">Kandidat gagal dimuat.</p><Button variant="outline" onClick={() => refetchCandidates()}>Coba lagi</Button></td></tr>) : availableCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Package className="mx-auto h-8 w-8 text-[var(--ds-fg-muted)]" />
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-2">Tidak ada kandidat aset tersedia.</p>
                    </td>
                  </tr>
                ) : (
                  availableCandidates
                    .map((asset) => {
                      const isSelected = modalSelectedIds.has(asset.id);
                      return (
                        <tr
                          key={asset.id}
                          className="bmn-table-row"
                          aria-selected={isSelected}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              aria-label={`Pilih ${asset.nama_barang} NUP ${asset.nup}`}
                              disabled={readOnly || addAssetsMutation.isPending || isFetchingCandidates}
                              onCheckedChange={() => toggleModalSelect(asset.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[var(--ds-fg)]">
                              {asset.nama_barang}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-[var(--ds-fg-muted)]">
                              <span className="font-bold text-[var(--ds-accent-fg)]">{asset.kode_barang}</span>
                              <span>•</span>
                              <span>NUP: {asset.nup}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[var(--ds-fg)]">
                              {asset.merk_tipe || "-"}
                            </div>
                            {asset.no_polisi && (
                              <div className="text-xs font-mono text-[var(--ds-fg-muted)] mt-0.5">
                                Polisi: {asset.no_polisi}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)]">
                              {asset.kondisi || "Rusak Berat"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {asset.requires_document_review ? (
                              <span className="inline-flex items-center gap-0.5 bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                Review Dokumen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[var(--ds-fg)]">
                            {formatRupiah(asset.nilai_perolehan)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs">
              Batal
            </Button>
            <Button
              onClick={handleAddSubmit}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl flex items-center gap-1.5 text-xs"
              disabled={readOnly || isFetchingCandidates || addAssetsMutation.isPending || modalSelectedIds.size === 0}
            >
              {addAssetsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menambahkan...
                </>
              ) : (
                <>Tambah Terpilih ({modalSelectedIds.size})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Asset Modal */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--ds-fg)]">
              Lengkapi Dokumen Aset
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Perbarui dokumen administrasi untuk <strong>{quickEditAsset?.nama_barang}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ds-fg-muted)]">Nomor BPKB</label>
              <Input aria-label="Nomor BPKB"
                value={quickEditBpkb}
                onChange={(e) => setQuickEditBpkb(e.target.value)}
                placeholder="Masukkan Nomor BPKB"
                className="rounded-xl text-xs border-[var(--ds-border-subtle)] h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ds-fg-muted)]">Nomor Polisi</label>
              <Input aria-label="Nomor Polisi"
                value={quickEditPolisi}
                onChange={(e) => setQuickEditPolisi(e.target.value)}
                placeholder="Masukkan Nomor Polisi (contoh: KT 1234 XX)"
                className="rounded-xl text-xs border-[var(--ds-border-subtle)] h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ds-fg-muted)]">Nomor Rangka</label>
              <Input aria-label="Nomor Rangka"
                value={quickEditRangka}
                onChange={(e) => setQuickEditRangka(e.target.value)}
                placeholder="Masukkan Nomor Rangka"
                className="rounded-xl text-xs border-[var(--ds-border-subtle)] h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ds-fg-muted)]">Nomor Mesin</label>
              <Input aria-label="Nomor Mesin"
                value={quickEditMesin}
                onChange={(e) => setQuickEditMesin(e.target.value)}
                placeholder="Masukkan Nomor Mesin"
                className="rounded-xl text-xs border-[var(--ds-border-subtle)] h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsQuickEditOpen(false)}
              className="rounded-xl text-xs"
              disabled={isSavingQuickEdit}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveQuickEdit}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              disabled={isSavingQuickEdit}
            >
              {isSavingQuickEdit ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
