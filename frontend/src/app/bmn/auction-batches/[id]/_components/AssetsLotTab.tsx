"use client";

import React, { useState, useEffect } from "react";
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
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

export function AssetsLotTab({ batch, readOnly, onRefetch }: AssetsLotTabProps) {
  const queryClient = useQueryClient();
  const [localAssets, setLocalAssets] = useState<AuctionBatchAsset[]>([]);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  // Add Assets Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalTriggerSearch, setModalTriggerSearch] = useState("");
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());

  // Edit Lot State
  const [editingLotAssetId, setEditingLotAssetId] = useState<string | null>(null);
  const [editingLotValue, setEditingLotValue] = useState("");

  useEffect(() => {
    if (batch?.assets) {
      setLocalAssets(batch.assets);
    }
  }, [batch]);

  // Query Candidates for Modal
  const { data: candidatesData, isLoading: isLoadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ["bmn-auction-candidates-modal", modalTriggerSearch],
    queryFn: () => getCandidates({ search: modalTriggerSearch || undefined, per_page: 50 }),
    enabled: isAddModalOpen,
  });

  const candidates = candidatesData?.data || [];

  // Mutations
  const addAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) => addAssets(batch.id, assetIds),
    onSuccess: () => {
      toast.success("Aset berhasil ditambahkan!");
      setIsAddModalOpen(false);
      setModalSelectedIds(new Set());
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
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal mengeluarkan aset.");
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: (orderedAssetIds: string[]) => updateOrder(batch.id, orderedAssetIds),
    onSuccess: () => {
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
      setEditingLotAssetId(null);
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui nomor Lot.");
    },
  });

  // Reorder Handlers
  const handleMoveUp = (index: number) => {
    if (readOnly || index === 0) return;
    const nextAssets = [...localAssets];
    [nextAssets[index - 1], nextAssets[index]] = [nextAssets[index], nextAssets[index - 1]];
    setLocalAssets(nextAssets);
    updateOrderMutation.mutate(nextAssets.map((a) => a.id));
  };

  const handleMoveDown = (index: number) => {
    if (readOnly || index >= localAssets.length - 1) return;
    const nextAssets = [...localAssets];
    [nextAssets[index], nextAssets[index + 1]] = [nextAssets[index + 1], nextAssets[index]];
    setLocalAssets(nextAssets);
    updateOrderMutation.mutate(nextAssets.map((a) => a.id));
  };

  // Add Assets Modal Handlers
  const handleOpenAddModal = () => {
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
    if (modalSelectedIds.size === 0) {
      toast.error("Pilih minimal satu aset.");
      return;
    }
    addAssetsMutation.mutate(Array.from(modalSelectedIds));
  };

  // Lot Edit Handlers
  const handleStartEditLot = (asset: AuctionBatchAsset) => {
    if (readOnly) return;
    setEditingLotAssetId(asset.id);
    setEditingLotValue(asset.pivot?.lot_number || "");
  };

  const handleSaveLot = (assetId: string) => {
    updateLotMutation.mutate({
      assetId,
      lotNumber: editingLotValue.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Daftar Aset & Nomor Lot
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola aset dalam paket ini, atur nomor Lot, dan urutan dokumen cetak.
          </p>
        </div>
        {!readOnly && (
          <Button
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Tambah Aset
          </Button>
        )}
      </div>

      {/* Assets Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-900/50">
                {!readOnly && (
                  <th className="w-20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Urutan
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-28">
                  Nomor Lot
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Identitas Aset
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Kategori
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status Dokumen
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nilai Perolehan
                </th>
                {!readOnly && (
                  <th className="w-16 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {localAssets.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 5 : 7} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Package className="h-9 w-9 text-zinc-300 dark:text-zinc-750" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Belum Ada Aset Terpilih
                        </p>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-0.5">
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
                  const isEditingLot = editingLotAssetId === asset.id;

                  return (
                    <React.Fragment key={asset.id}>
                      <tr className="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30">
                        {/* Order action */}
                        {!readOnly && (
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={index === 0}
                                onClick={() => handleMoveUp(index)}
                                className="rounded-lg h-7 w-7"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={index === localAssets.length - 1}
                                onClick={() => handleMoveDown(index)}
                                className="rounded-lg h-7 w-7"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}

                        {/* Lot Number */}
                        <td className="px-4 py-4">
                          {isEditingLot ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingLotValue}
                                onChange={(e) => setEditingLotValue(e.target.value)}
                                className="h-8 rounded-lg text-xs w-20 border-zinc-200 dark:border-zinc-800"
                                placeholder="LOT-XX"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveLot(asset.id);
                                  if (e.key === "Escape") setEditingLotAssetId(null);
                                }}
                              />
                              <Button
                                size="icon-sm"
                                onClick={() => handleSaveLot(asset.id)}
                                className="h-7 w-7 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg"
                                disabled={updateLotMutation.isPending}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditLot(asset)}
                              className={`text-xs font-bold font-mono px-2 py-1 rounded-md border text-center ${
                                asset.pivot?.lot_number
                                  ? "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                                  : "bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 cursor-pointer"
                              } ${!readOnly ? "cursor-pointer hover:border-zinc-355" : ""}`}
                              title={!readOnly ? "Klik untuk mengedit nomor Lot" : undefined}
                            >
                              {asset.pivot?.lot_number || "LOT ?"}
                            </div>
                          )}
                        </td>

                        {/* Identitas Aset */}
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
                        </td>

                        {/* Kategori */}
                        <td className="px-4 py-4 text-xs font-medium text-zinc-700 dark:text-zinc-350">
                          {asset.jenis_bmn}
                        </td>

                        {/* Readiness */}
                        <td className="px-4 py-4">
                          {hasWarnings ? (
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

                        {/* Nilai Perolehan */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {formatRupiah(asset.nilai_perolehan)}
                          </div>
                          {asset.pivot?.nilai_taksiran && (
                            <div className="text-[10px] text-zinc-500 font-semibold mt-0.5">
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
                              onClick={() => removeAssetMutation.mutate(asset.id)}
                              className="text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                              title="Keluarkan dari paket lelang"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Warnings */}
                      {isExpanded && hasWarnings && (
                        <tr className="bg-amber-50/10 dark:bg-amber-900/5 border-t border-b border-amber-100/50 dark:border-amber-900/20">
                          {/* Pad check/order column */}
                          {!readOnly && <td />}
                          <td colSpan={readOnly ? 5 : 6} className="px-5 py-3.5">
                            <div className="space-y-1.5">
                              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Review Dokumen Administrasi Aset:
                              </div>
                              <ul className="list-disc list-inside text-xs text-amber-700/90 dark:text-amber-400/90 pl-1 space-y-1">
                                {warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                              <p className="text-[10px] text-zinc-500 italic mt-2">
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
        <DialogContent className="max-w-3xl rounded-2xl flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Tambah Aset Baru
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-555 dark:text-zinc-400">
              Pilih aset rusak berat yang tidak aktif di paket lain untuk ditambahkan ke paket lelang ini.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar inside modal */}
          <form onSubmit={handleModalSearchSubmit} className="flex gap-2 py-2">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-450" />
              <Input
                type="text"
                placeholder="Cari nama aset, kode barang..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-9 rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 h-9"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="rounded-xl flex items-center gap-1.5 h-9"
            >
              Cari
            </Button>
          </form>

          {/* Modal Table body */}
          <div className="flex-1 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <tr className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="w-12 px-4 py-2.5 text-center">Pilih</th>
                  <th className="px-4 py-2.5">Identitas Aset</th>
                  <th className="px-4 py-2.5">Status Dokumen</th>
                  <th className="px-4 py-2.5 text-right">Nilai Perolehan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {isLoadingCandidates ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-600" />
                      <p className="text-xs text-zinc-400 mt-1">Memuat kandidat aset...</p>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <Package className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                      <p className="text-xs text-zinc-400 mt-1">Tidak ada kandidat aset tersedia.</p>
                    </td>
                  </tr>
                ) : (
                  candidates
                    .filter((c) => c.is_auction_eligible && !localAssets.some((la) => la.id === c.id))
                    .map((asset) => {
                      const isSelected = modalSelectedIds.has(asset.id);
                      return (
                        <tr
                          key={asset.id}
                          className={`transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 cursor-pointer ${
                            isSelected ? "bg-emerald-50/10 dark:bg-emerald-950/5" : ""
                          }`}
                          onClick={() => toggleModalSelect(asset.id)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleModalSelect(asset.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {asset.nama_barang}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-zinc-500">
                              <span className="font-bold text-red-700">{asset.kode_barang}</span>
                              <span>•</span>
                              <span>NUP: {asset.nup}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {asset.requires_document_review ? (
                              <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[9px] font-semibold">
                                Review Dokumen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-semibold">
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
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
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={handleAddSubmit}
              className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5"
              disabled={addAssetsMutation.isPending || modalSelectedIds.size === 0}
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
    </div>
  );
}
