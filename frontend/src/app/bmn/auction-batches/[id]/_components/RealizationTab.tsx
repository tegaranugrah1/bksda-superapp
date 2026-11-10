"use client";

import React, { useRef, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  recordFirstAuctionResults,
  recordReauctionResults,
  realize,
  transition,
  AuctionBatch,
  AuctionBatchAsset,
} from "../../_lib/api";
import { formatRupiah, formatDateLong } from "../../../auction-candidates/_lib/auction-helpers";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  Calendar,
  AlertTriangle,
  XCircle,
  TrendingUp,
  FileSpreadsheet,
  Gavel,
  CheckCircle,
  HelpCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RealizationTabProps {
  formState: ReturnType<typeof useRealizationFormState>;
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

function formatThousandsInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const digitsOnly = String(value).replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digitsOnly));
}

function parseThousandsInput(value: string | null | undefined): number | null {
  if (!value) return null;
  const digitsOnly = String(value).replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  return Number(digitsOnly);
}

export function useRealizationFormState(batch?: AuctionBatch) {
  const [isMovingUnsold, setIsMovingUnsold] = useState(false);
  const [firstAuctionSold, setFirstAuctionSold] = useState<Record<string, boolean>>({});
  const [firstAuctionPrice, setFirstAuctionPrice] = useState<Record<string, string>>({});
  const [reauctionSold, setReauctionSold] = useState<Record<string, boolean>>({});
  const [reauctionPrice, setReauctionPrice] = useState<Record<string, string>>({});
  const [isReauctionDialogOpen, setIsReauctionDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [noSuratJadwalUlang, setNoSuratJadwalUlang] = useState("");
  const [tglLelangUlang, setTglLelangUlang] = useState("");
  const [reauctionNotes, setReauctionNotes] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const assets = batch?.assets || [];
  useEffect(() => {
    if (batch && assets.length > 0) {
      const initialFirstSold: Record<string, boolean> = {};
      const initialFirstPrice: Record<string, string> = {};
      const initialReSold: Record<string, boolean> = {};
      const initialRePrice: Record<string, string> = {};

      assets.forEach((asset) => {
        const pivot = asset.pivot;
        if (pivot) {
          initialFirstSold[asset.id] = pivot.first_auction_is_sold ?? false;
          initialFirstPrice[asset.id] = pivot.first_auction_price ? formatThousandsInput(pivot.first_auction_price) : "";
          initialReSold[asset.id] = pivot.reauction_is_sold ?? false;
          initialRePrice[asset.id] = pivot.reauction_price ? formatThousandsInput(pivot.reauction_price) : "";
        }
      });

      setFirstAuctionSold(initialFirstSold);
      setFirstAuctionPrice(initialFirstPrice);
      setReauctionSold(initialReSold);
      setReauctionPrice(initialRePrice);
    }
  }, [batch, assets]);
  return { isMovingUnsold, setIsMovingUnsold, firstAuctionSold, setFirstAuctionSold, firstAuctionPrice, setFirstAuctionPrice, reauctionSold, setReauctionSold, reauctionPrice, setReauctionPrice, isReauctionDialogOpen, setIsReauctionDialogOpen, isCancelDialogOpen, setIsCancelDialogOpen, noSuratJadwalUlang, setNoSuratJadwalUlang, tglLelangUlang, setTglLelangUlang, reauctionNotes, setReauctionNotes, cancelNotes, setCancelNotes };
}

export function RealizationTab({ batch, readOnly, onRefetch, formState }: RealizationTabProps) {
  const dialogOpener = useRef<HTMLElement | null>(null);
  const { isMovingUnsold, setIsMovingUnsold, firstAuctionSold, setFirstAuctionSold, firstAuctionPrice, setFirstAuctionPrice, reauctionSold, setReauctionSold, reauctionPrice, setReauctionPrice, isReauctionDialogOpen, setIsReauctionDialogOpen, isCancelDialogOpen, setIsCancelDialogOpen, noSuratJadwalUlang, setNoSuratJadwalUlang, tglLelangUlang, setTglLelangUlang, reauctionNotes, setReauctionNotes, cancelNotes, setCancelNotes } = formState;
  const router = useRouter();
  const { hasPermission } = useRole();
  const terminal = batch.status === "REALISASI" || batch.status === "BATAL";
  const canFinalize = hasPermission("bmn.auction.finalize") && !terminal;
  const canTransition = hasPermission("bmn.auction.update") && !terminal;
  const canMoveUnsold = hasPermission("bmn.auction.create") && hasPermission("bmn.auction.update") && (batch.status === "REALISASI" || canFinalize);

  // First auction form state

  // Reauction form state

  // Dialog states

  // Reauction scheduling form state

  // Cancel notes state

  const assets = batch?.assets || [];

  // Initialize input fields based on existing values


  // Mutations
  const recordFirstMutation = useMutation({
    mutationFn: (payload: any[]) => recordFirstAuctionResults(batch.id, payload),
    onSuccess: () => {
      toast.success("Hasil lelang pertama berhasil disimpan.");
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal menyimpan hasil lelang pertama.");
    },
  });

  const recordReauctionMutation = useMutation({
    mutationFn: (payload: any[]) => recordReauctionResults(batch.id, payload),
    onSuccess: () => {
      toast.success("Hasil lelang ulang berhasil disimpan.");
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal menyimpan hasil lelang ulang.");
    },
  });

  const startReauctionMutation = useMutation({
    mutationFn: (payload: any) => transition(batch.id, payload),
    onSuccess: () => {
      toast.success("Status berubah ke Lelang Ulang.");
      setIsReauctionDialogOpen(false);
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memulai lelang ulang.");
    },
  });

  const realizeMutation = useMutation({
    mutationFn: () => realize(batch.id),
    onSuccess: () => {
      toast.success("Proses lelang berhasil difinalisasi!");
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memfinalisasi lelang.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (notes: string | null) => transition(batch.id, { status: "BATAL", notes }),
    onSuccess: () => {
      toast.success("Paket lelang telah dibatalkan.");
      setIsCancelDialogOpen(false);
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal membatalkan paket lelang.");
    },
  });

  // Action Triggers
  const handleSaveFirstResults = () => {
    if (!canFinalize) return;
    try {
      const payload = assets.map((asset) => {
        const isSold = firstAuctionSold[asset.id] || false;
        const priceStr = firstAuctionPrice[asset.id];
        const price = parseThousandsInput(priceStr);

        if (isSold && (price === null || price < 0)) {
          throw new Error(`Harga terbentuk wajib diisi untuk aset terjual pada Lot ${asset.pivot?.lot_number}.`);
        }

        return {
          bmn_asset_id: asset.id,
          first_auction_is_sold: isSold,
          first_auction_price: isSold ? price : null,
        };
      });

      recordFirstMutation.mutate(payload);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveAndFinalize = async () => {
    if (!canFinalize) return;
    try {
      const payload = assets.map((asset) => {
        const isSold = firstAuctionSold[asset.id] || false;
        const priceStr = firstAuctionPrice[asset.id];
        const price = parseThousandsInput(priceStr);

        if (isSold && (price === null || price < 0)) {
          throw new Error(`Harga terbentuk wajib diisi untuk aset terjual.`);
        }

        return {
          bmn_asset_id: asset.id,
          first_auction_is_sold: isSold,
          first_auction_price: isSold ? price : null,
        };
      });

      await recordFirstMutation.mutateAsync(payload);
      await realizeMutation.mutateAsync();
    } catch (e: any) {
      toast.error(e.message || "Gagal memfinalisasi lelang.");
    }
  };

  const handleSaveReauctionResults = () => {
    if (!canFinalize) return;
    try {
      const unsoldInFirst = assets.filter((a) => !a.pivot?.first_auction_is_sold);
      const payload = unsoldInFirst.map((asset) => {
        const isSold = reauctionSold[asset.id] || false;
        const priceStr = reauctionPrice[asset.id];
        const price = parseThousandsInput(priceStr);

        if (isSold && (price === null || price < 0)) {
          throw new Error(`Harga terbentuk wajib diisi untuk aset terjual pada Lot ${asset.pivot?.lot_number}.`);
        }

        return {
          bmn_asset_id: asset.id,
          reauction_is_sold: isSold,
          reauction_price: isSold ? price : null,
        };
      });

      recordReauctionMutation.mutate(payload);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleScheduleReauction = () => {
    if (!canTransition || startReauctionMutation.isPending) return;
    if (!noSuratJadwalUlang.trim() || !tglLelangUlang) {
      toast.error("Nomor surat dan tanggal lelang ulang wajib diisi.");
      return;
    }
    startReauctionMutation.mutate({
      status: "LELANG_ULANG",
      no_surat_jadwal_ulang: noSuratJadwalUlang,
      tanggal_lelang_ulang: tglLelangUlang,
      reauction_notes: reauctionNotes || null,
    });
  };

  const handleCancelSubmit = () => {
    if (!canTransition || cancelMutation.isPending) return;
    cancelMutation.mutate(cancelNotes.trim() || null);
  };

  // Move Unsold Assets to New Batch
  const handleMoveUnsoldToNewBatch = async () => {
    if (!canMoveUnsold || isMovingUnsold) return;
    const unsoldAssets = assets.filter((asset) => {
      const p = asset.pivot;
      if (p?.final_result === "UNSOLD") return true;
      if (p?.first_auction_is_sold === false && !p?.reauction_is_sold) return true;
      return false;
    });

    if (unsoldAssets.length === 0) {
      toast.error("Tidak ada barang tidak laku yang perlu dipindahkan.");
      return;
    }

    setIsMovingUnsold(true);
    try {
      const newBatchRes = await api.post("/bmn/auction-batches", {
        name: `Paket Lelang BMN (Lelang Ulang ${new Date().toLocaleDateString("id-ID")})`,
      });

      const newBatch = newBatchRes.data?.data;
      if (!newBatch?.id) {
        throw new Error("Gagal membuat paket lelang baru.");
      }

      const unsoldIds = unsoldAssets.map((a) => a.id);
      await api.post(`/bmn/auction-batches/${newBatch.id}/assets`, {
        asset_ids: unsoldIds,
      });

      if (batch.status !== "REALISASI") {
        await realize(batch.id);
      }

      toast.success(
        `Berhasil membuat Paket Lelang Baru (#${newBatch.batch_number}) dengan ${unsoldAssets.length} barang tidak laku. Riwayat paket lama telah dikunci aman.`
      );

      router.push(`/bmn/auction-batches/${newBatch.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Gagal memindahkan barang tidak laku.");
    } finally {
      setIsMovingUnsold(false);
    }
  };

  // Helper check status values
  const firstResultsSaved = assets.length > 0 && assets.every((a) => a.pivot?.first_auction_is_sold !== null);
  const reauctionResultsSaved =
    batch.status === "LELANG_ULANG" &&
    assets.filter((a) => !a.pivot?.first_auction_is_sold).every((a) => a.pivot?.reauction_is_sold !== null);

  const hasUnsoldAssetsInFirst = assets.some((a) => a.pivot?.first_auction_is_sold === false);

  const canCancel =
    (batch.status === "DRAFT" ||
      batch.status === "DIAJUKAN" ||
      batch.status === "JADWAL_DITETAPKAN" ||
      batch.status === "LELANG_ULANG") &&
    canTransition;

  return (
    <div className="space-y-6">
      {/* Top Banner / Tab Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)]">
            Realisasi & Hasil Lelang
          </h2>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
            Lacak hasil akhir penjualan aset BMN dan finalisasi penghapusan inventaris negara.
          </p>
        </div>
        {canCancel && (
          <Button
            variant="destructive"
            onClick={() => { dialogOpener.current = document.activeElement as HTMLElement | null; setIsCancelDialogOpen(true); }}
            className="rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center"
          >
            <XCircle className="h-4 w-4" />
            Batalkan Paket Lelang
          </Button>
        )}
      </div>

      {/* -------------------- 1. REALISASI & PENCATATAN HASIL LELANG -------------------- */}
      {batch.status !== "REALISASI" && batch.status !== "BATAL" && (
        <div className="space-y-6">
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-[var(--ds-fg)] flex items-center gap-1.5">
              <Gavel className="h-4.5 w-4.5 text-[var(--ds-accent-fg)]" />
              Hasil Pelaksanaan Lelang Pertama
            </h3>

            <div className="overflow-x-auto border border-[var(--ds-border-subtle)] rounded-xl">
              <table className="bmn-wide-table w-full text-left">
                <thead>
                  <tr className="bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg-muted)]">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5 text-right">Nilai Taksiran</th>
                    <th className="px-4 py-2.5 text-center w-36">Status Terjual</th>
                    <th className="px-4 py-2.5 text-right w-52">Harga Terbentuk (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)] text-xs">
                  {assets.map((asset) => {
                    const isSold = firstAuctionSold[asset.id] || false;
                    return (
                      <tr key={asset.id}>
                        <td className="px-4 py-3 font-mono font-bold text-[var(--ds-fg-muted)]">
                          {asset.pivot?.lot_number || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--ds-fg)]">
                            {asset.nama_barang}
                          </div>
                          <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                            NUP: {asset.nup} • {asset.jenis_bmn}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--ds-fg)]">
                          {formatRupiah(asset.pivot?.nilai_taksiran)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            aria-label={`Status terjual ${asset.nama_barang} NUP ${asset.nup}`}
                            value={isSold ? "true" : "false"}
                            onChange={(e) => {
                              const val = e.target.value === "true";
                              setFirstAuctionSold({ ...firstAuctionSold, [asset.id]: val });
                              if (!val) {
                                setFirstAuctionPrice({ ...firstAuctionPrice, [asset.id]: "" });
                              }
                            }}
                            disabled={!canFinalize}
                            className="h-8 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 text-xs outline-none focus:ring-1 focus:ring-[var(--ds-accent-soft-border)]"
                          >
                            <option value="false">Tidak Terjual</option>
                            <option value="true">Terjual</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="text"
                            inputMode="numeric"
                            aria-label={`Harga lelang ${asset.nama_barang} NUP ${asset.nup}`}
                            placeholder="0"
                            value={firstAuctionPrice[asset.id] || ""}
                            onChange={(e) =>
                              setFirstAuctionPrice({
                                ...firstAuctionPrice,
                                [asset.id]: formatThousandsInput(e.target.value),
                              })
                            }
                            disabled={!isSold || !canFinalize}
                            className="h-8 text-right font-mono text-xs rounded-lg border-[var(--ds-border-subtle)]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {canFinalize && (
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSaveFirstResults}
                  className="rounded-xl text-xs font-semibold py-2 px-4 flex items-center gap-1.5 border-[var(--ds-border-subtle)]"
                  disabled={recordFirstMutation.isPending || realizeMutation.isPending}
                >
                  {recordFirstMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Simpan Draf Realisasi
                </Button>
                <Button
                  onClick={handleSaveAndFinalize}
                  className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl text-xs font-bold py-2 px-4 shadow-sm flex items-center gap-1.5"
                  disabled={recordFirstMutation.isPending || realizeMutation.isPending}
                >
                  {realizeMutation.isPending || recordFirstMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Finalisasi & Selesaikan Paket Lelang
                </Button>
              </div>
            )}
          </div>

          {/* Subsequent Actions Block */}
          {firstResultsSaved && (
            <div className="bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-sm text-[var(--ds-fg)] flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-[var(--ds-fg-muted)]" />
                Langkah Penyelesaian
              </h4>

              {hasUnsoldAssetsInFirst ? (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                    Terdapat aset yang <strong>tidak terjual</strong> pada pelaksanaan lelang pertama. Anda dapat menetapkan Lelang Ulang untuk sisa aset tersebut, atau langsung memfinalisasi realisasi (aset tidak terjual akan dikembalikan ke status operasional dinas).
                  </p>
                  {canFinalize && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={!canTransition}
                        onClick={() => { if (!canTransition) return; dialogOpener.current = document.activeElement as HTMLElement | null; setIsReauctionDialogOpen(true); }}
                        className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold"
                      >
                        Jadwal Lelang Ulang (Lelang II)
                      </Button>
                      <Button
                        onClick={handleMoveUnsoldToNewBatch}
                        disabled={isMovingUnsold || !canMoveUnsold}
                        className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold"
                      >
                        {isMovingUnsold && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        Pindahkan Barang Tidak Laku ke Paket Baru
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { if (canFinalize) realizeMutation.mutate(); }}
                        className="rounded-xl text-xs font-bold border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)]"
                        disabled={realizeMutation.isPending}
                      >
                        {realizeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        Finalisasi Tanpa Lelang Ulang
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                    Semua aset di dalam paket lelang ini telah <strong>berhasil terjual</strong>. Lakukan finalisasi realisasi untuk menyelesaikan dokumen penghapusan aset.
                  </p>
                  {canFinalize && (
                    <Button
                      onClick={() => { if (canFinalize) realizeMutation.mutate(); }}
                      className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl text-xs font-bold"
                      disabled={realizeMutation.isPending}
                    >
                      {realizeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      Finalisasi Realisasi Paket
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -------------------- 2. LELANG_ULANG STATUS VIEW -------------------- */}
      {batch.status === "LELANG_ULANG" && (
        <div className="space-y-6">
          {/* Reauction details info */}
          <div className="bg-[var(--ds-status-info-bg)] border border-[var(--ds-status-info-border)] p-4 rounded-2xl text-xs flex gap-3 items-start">
            <Calendar className="h-5 w-5 text-[var(--ds-status-info-fg)] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--ds-status-info-fg)]">Status: Lelang Ulang (Lelang II)</h4>
              <p className="mt-0.5 leading-relaxed text-[var(--ds-fg-secondary)]">
                Surat penetapan lelang ulang: <strong>{batch.no_surat_jadwal_ulang}</strong> • Tanggal pelaksanaan lelang ulang: <strong>{batch.tanggal_lelang_ulang ? formatDateLong(new Date(batch.tanggal_lelang_ulang)) : "-"}</strong>
              </p>
            </div>
          </div>

          {/* Reauction table */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="font-bold text-sm text-[var(--ds-fg)] flex items-center gap-1.5">
              <Gavel className="h-4.5 w-4.5 text-[var(--ds-status-info-fg)]" />
              Hasil Pelaksanaan Lelang Kedua (Ulang)
            </h3>

            <div className="overflow-x-auto border border-[var(--ds-border-subtle)] rounded-xl">
              <table className="bmn-wide-table w-full text-left">
                <thead>
                  <tr className="bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg-muted)]">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5 text-right">Nilai Taksiran</th>
                    <th className="px-4 py-2.5 text-center w-36">Status Terjual</th>
                    <th className="px-4 py-2.5 text-right w-52">Harga Terbentuk (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)] text-xs">
                  {assets
                    .filter((a) => !a.pivot?.first_auction_is_sold)
                    .map((asset) => {
                      const isSold = reauctionSold[asset.id] || false;
                      return (
                        <tr key={asset.id}>
                          <td className="px-4 py-3 font-mono font-bold text-[var(--ds-fg-muted)]">
                            {asset.pivot?.lot_number || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[var(--ds-fg)]">
                              {asset.nama_barang}
                            </div>
                            <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                              NUP: {asset.nup} • {asset.jenis_bmn}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[var(--ds-fg)]">
                            {formatRupiah(asset.pivot?.nilai_taksiran)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              aria-label={`Status lelang ulang ${asset.nama_barang} NUP ${asset.nup}`}
                              value={isSold ? "true" : "false"}
                              onChange={(e) => {
                                const val = e.target.value === "true";
                                setReauctionSold({ ...reauctionSold, [asset.id]: val });
                                if (!val) {
                                  setReauctionPrice({ ...reauctionPrice, [asset.id]: "" });
                                }
                              }}
                              disabled={!canFinalize}
                              className="h-8 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 text-xs outline-none focus:ring-1 focus:ring-[var(--ds-status-info-border)]"
                            >
                              <option value="false">Tidak Terjual</option>
                              <option value="true">Terjual</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Harga lelang ulang ${asset.nama_barang} NUP ${asset.nup}`}
                              placeholder="Rp Harga Terbentuk"
                              value={reauctionPrice[asset.id] || ""}
                              onChange={(e) =>
                                setReauctionPrice({ ...reauctionPrice, [asset.id]: formatThousandsInput(e.target.value) })
                              }
                              disabled={!isSold || !canFinalize}
                              className="h-8 text-right text-xs rounded-lg border-[var(--ds-border-subtle)]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {canFinalize && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveReauctionResults}
                  className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold py-2 px-4 shadow-sm flex items-center gap-1.5"
                  disabled={recordReauctionMutation.isPending}
                >
                  {recordReauctionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Simpan Hasil Lelang II (Ulang)
                </Button>
              </div>
            )}
          </div>

          {/* Finalize Action */}
          {reauctionResultsSaved && canFinalize && (
            <div className="bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-sm text-[var(--ds-fg)]">Finalisasi Akhir</h4>
              <p className="text-xs text-[var(--ds-fg-muted)] leading-relaxed">
                Hasil lelang ulang telah dicatat. Finalisasi realisasi sekarang untuk menghapus aset terjual dan memulihkan aset tidak terjual.
              </p>
              <Button
                onClick={() => { if (canFinalize) realizeMutation.mutate(); }}
                className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl text-xs font-bold"
                disabled={realizeMutation.isPending}
              >
                {realizeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Finalisasi Realisasi
              </Button>
            </div>
          )}
        </div>
      )}

      {/* -------------------- 3. REALISASI (FINALIZED) VIEW -------------------- */}
      {batch.status === "REALISASI" && (
        <div className="space-y-6">
          <div className="bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] p-4 rounded-2xl text-xs flex gap-3 items-center">
            <CheckCircle className="h-5 w-5 text-[var(--ds-accent-fg)] shrink-0" />
            <div>
              <h4 className="font-bold text-[var(--ds-accent-fg)]">Realisasi Selesai</h4>
              <p className="mt-0.5 leading-relaxed text-[var(--ds-fg-secondary)]">
                Paket lelang ini telah difinalisasi. Penghapusan aset yang terjual telah dicatat secara hukum, dan aset yang tidak terjual telah dikembalikan ke status aktif.
              </p>
            </div>
          </div>

          {/* Outcomes list table */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[var(--ds-fg)]">Laporan Akhir Penjualan Aset</h3>
            <div className="overflow-x-auto border border-[var(--ds-border-subtle)] rounded-xl">
              <table className="bmn-wide-table w-full text-left">
                <thead>
                  <tr className="bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg-muted)]">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5 text-right">Nilai Taksiran</th>
                    <th className="px-4 py-2.5 text-center w-40">Status Akhir</th>
                    <th className="px-4 py-2.5 text-right w-44">Harga Terbentuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)] text-xs">
                  {assets.map((asset) => {
                    const pivot = asset.pivot;
                    const finalResult = pivot?.final_result;
                    const finalPrice = pivot?.final_price;

                    let label = "Tidak Terjual";
                    let badgeCls = "bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]";

                    if (finalResult === "SOLD_FIRST" || pivot?.first_auction_is_sold) {
                      label = "Terjual Lelang I";
                      badgeCls = "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]";
                    } else if (finalResult === "SOLD_REAUCTION" || pivot?.reauction_is_sold) {
                      label = "Terjual Lelang II";
                      badgeCls = "bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border-[var(--ds-status-info-border)]";
                    }

                    const displayPrice = finalPrice ?? (pivot?.first_auction_is_sold ? pivot?.first_auction_price : pivot?.reauction_is_sold ? pivot?.reauction_price : null);

                    return (
                      <tr key={asset.id}>
                        <td className="px-4 py-3 font-mono font-bold text-[var(--ds-fg-muted)]">
                          {pivot?.lot_number || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--ds-fg)]">
                            {asset.nama_barang}
                          </div>
                          <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                            NUP: {asset.nup} • {asset.jenis_bmn}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--ds-fg)]">
                          {formatRupiah(pivot?.nilai_taksiran)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`${badgeCls} text-xs font-semibold`}>
                            {label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--ds-fg)]">
                          {displayPrice ? formatRupiah(displayPrice) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {assets.some((a) => a.pivot?.final_result === "UNSOLD" || (!a.pivot?.first_auction_is_sold && !a.pivot?.reauction_is_sold)) && (
              <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--ds-status-info-bg)] p-4 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-[var(--ds-fg)]">
                    Terdapat Aset Tidak Terjual
                  </p>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                    Buat paket lelang draf baru khusus untuk barang yang tidak laku dengan set dokumen SK/BA baru.
                  </p>
                </div>
                <Button
                  onClick={handleMoveUnsoldToNewBatch}
                  disabled={isMovingUnsold || !canMoveUnsold}
                  className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold shrink-0"
                >
                  {isMovingUnsold && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Pindahkan Barang Tidak Laku ke Paket Baru
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- 4. BATAL (CANCELLED) VIEW -------------------- */}
      {batch.status === "BATAL" && (
        <div className="space-y-6">
          <div className="bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] p-4 rounded-2xl text-xs flex gap-3 items-start">
            <XCircle className="h-5 w-5 text-[var(--ds-status-danger-fg)] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--ds-status-danger-fg)]">Paket Dibatalkan</h4>
              <p className="mt-0.5 leading-relaxed text-[var(--ds-fg-secondary)]">
                Proses lelang dibatalkan. Aset yang dibekukan telah dikembalikan ke status dinas semula.
              </p>
              {batch.reauction_notes && (
                <p className="mt-2 text-[var(--ds-fg-muted)]">
                  Catatan pembatalan: <strong className="text-[var(--ds-fg)]">"{batch.reauction_notes}"</strong>
                </p>
              )}
            </div>
          </div>

          {/* List of assets in cancelled batch */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[var(--ds-fg)]">Daftar Aset</h3>
            <div className="overflow-x-auto border border-[var(--ds-border-subtle)] rounded-xl">
              <table className="bmn-wide-table w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] text-xs font-bold text-[var(--ds-fg-muted)]">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5">Jenis BMN</th>
                    <th className="px-4 py-2.5 text-right">Nilai Perolehan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="px-4 py-3 font-mono font-bold text-[var(--ds-fg-muted)]">
                        {asset.pivot?.lot_number || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--ds-fg)]">
                          {asset.nama_barang}
                        </div>
                        <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">NUP: {asset.nup}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--ds-fg-secondary)]">{asset.jenis_bmn}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatRupiah(asset.nilai_perolehan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* -------------------- DIALOGS -------------------- */}

      {/* Reauction Scheduling Dialog */}
      <Dialog open={isReauctionDialogOpen} onOpenChange={setIsReauctionDialogOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--ds-fg)]">
              Jadwal Ulang Pelaksanaan Lelang (Lelang II)
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Masukkan nomor surat keputusan jadwal ulang KPKNL untuk aset-aset yang belum laku terjual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
                Nomor Surat Jadwal Ulang
              </label>
              <Input aria-label="Nomor Surat Jadwal Ulang"
                placeholder="S-JADWAL-ULANG-XXX/KNL.XX/YYYY"
                value={noSuratJadwalUlang}
                onChange={(e) => setNoSuratJadwalUlang(e.target.value)}
                className="rounded-xl border-[var(--ds-border-subtle)] text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
                Tanggal Pelaksanaan Lelang Ulang
              </label>
              <Input aria-label="Tanggal Pelaksanaan Lelang Ulang"
                type="date"
                value={tglLelangUlang}
                onChange={(e) => setTglLelangUlang(e.target.value)}
                className="rounded-xl border-[var(--ds-border-subtle)] text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
                Catatan / Keterangan (Opsional)
              </label>
              <Input aria-label="Catatan / Keterangan (Opsional)"
                placeholder="Tambahkan alasan atau detail lainnya..."
                value={reauctionNotes}
                onChange={(e) => setReauctionNotes(e.target.value)}
                className="rounded-xl border-[var(--ds-border-subtle)] text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReauctionDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleScheduleReauction}
              className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl font-bold text-xs"
              disabled={!canTransition || startReauctionMutation.isPending || !noSuratJadwalUlang.trim() || !tglLelangUlang}
            >
              Ya, Mulai Lelang Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Batch Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-[var(--ds-status-danger-fg)]">
              <XCircle className="h-5 w-5" />
              Batalkan Paket Lelang ini?
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ds-fg-muted)]">
              Membatalkan paket akan mengembalikan seluruh aset yang dibekukan kembali ke status aktif operasional dinas. Tindakan ini tidak dapat dianulir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
                Alasan Pembatalan (Opsional)
              </label>
              <Input aria-label="Alasan Pembatalan (Opsional)"
                placeholder="Sebutkan alasan penundaan atau pembatalan..."
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                className="rounded-xl border-[var(--ds-border-subtle)] text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              className="bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] text-white rounded-xl font-bold text-xs"
              disabled={!canTransition || cancelMutation.isPending}
            >
              Ya, Batalkan Paket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
