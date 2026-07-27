"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
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
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

export function RealizationTab({ batch, readOnly, onRefetch }: RealizationTabProps) {
  const { hasPermission } = useRole();
  const canFinalize = hasPermission("bmn.auction.finalize");

  // First auction form state
  const [firstAuctionSold, setFirstAuctionSold] = useState<Record<string, boolean>>({});
  const [firstAuctionPrice, setFirstAuctionPrice] = useState<Record<string, string>>({});

  // Reauction form state
  const [reauctionSold, setReauctionSold] = useState<Record<string, boolean>>({});
  const [reauctionPrice, setReauctionPrice] = useState<Record<string, string>>({});

  // Dialog states
  const [isReauctionDialogOpen, setIsReauctionDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Reauction scheduling form state
  const [noSuratJadwalUlang, setNoSuratJadwalUlang] = useState("");
  const [tglLelangUlang, setTglLelangUlang] = useState("");
  const [reauctionNotes, setReauctionNotes] = useState("");

  // Cancel notes state
  const [cancelNotes, setCancelNotes] = useState("");

  const assets = batch?.assets || [];

  // Initialize input fields based on existing values
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
          initialFirstPrice[asset.id] = pivot.first_auction_price ? String(pivot.first_auction_price) : "";
          initialReSold[asset.id] = pivot.reauction_is_sold ?? false;
          initialRePrice[asset.id] = pivot.reauction_price ? String(pivot.reauction_price) : "";
        }
      });

      setFirstAuctionSold(initialFirstSold);
      setFirstAuctionPrice(initialFirstPrice);
      setReauctionSold(initialReSold);
      setReauctionPrice(initialRePrice);
    }
  }, [batch, assets]);

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
    const payload = assets.map((asset) => {
      const isSold = firstAuctionSold[asset.id] || false;
      const priceStr = firstAuctionPrice[asset.id];
      const price = parseFloat(priceStr);

      if (isSold && (isNaN(price) || price < 0)) {
        throw new Error(`Harga terbentuk wajib diisi untuk aset terjual pada Lot ${asset.pivot?.lot_number}.`);
      }

      return {
        bmn_asset_id: asset.id,
        first_auction_is_sold: isSold,
        first_auction_price: isSold ? price : null,
      };
    });

    try {
      recordFirstMutation.mutate(payload);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveReauctionResults = () => {
    const unsoldInFirst = assets.filter((a) => !a.pivot?.first_auction_is_sold);
    const payload = unsoldInFirst.map((asset) => {
      const isSold = reauctionSold[asset.id] || false;
      const priceStr = reauctionPrice[asset.id];
      const price = parseFloat(priceStr);

      if (isSold && (isNaN(price) || price < 0)) {
        throw new Error(`Harga terbentuk wajib diisi untuk aset terjual pada Lot ${asset.pivot?.lot_number}.`);
      }

      return {
        bmn_asset_id: asset.id,
        reauction_is_sold: isSold,
        reauction_price: isSold ? price : null,
      };
    });

    try {
      recordReauctionMutation.mutate(payload);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleScheduleReauction = () => {
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
    cancelMutation.mutate(cancelNotes.trim() || null);
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
    canFinalize;

  return (
    <div className="space-y-6">
      {/* Top Banner / Tab Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Realisasi & Hasil Lelang
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Lacak hasil akhir penjualan aset BMN dan finalisasi penghapusan inventaris negara.
          </p>
        </div>
        {canCancel && (
          <Button
            variant="destructive"
            onClick={() => setIsCancelDialogOpen(true)}
            className="rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center"
          >
            <XCircle className="h-4 w-4" />
            Batalkan Paket Lelang
          </Button>
        )}
      </div>

      {/* -------------------- 1. JADWAL_DITETAPKAN STATUS VIEW -------------------- */}
      {batch.status === "JADWAL_DITETAPKAN" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Gavel className="h-4.5 w-4.5 text-emerald-600" />
              Hasil Pelaksanaan Lelang Pertama
            </h3>

            <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-500">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5 text-right">Nilai Taksiran</th>
                    <th className="px-4 py-2.5 text-center w-36">Status Terjual</th>
                    <th className="px-4 py-2.5 text-right w-52">Harga Terbentuk (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {assets.map((asset) => {
                    const isSold = firstAuctionSold[asset.id] || false;
                    return (
                      <tr key={asset.id}>
                        <td className="px-4 py-3 font-mono font-bold text-zinc-500">
                          {asset.pivot?.lot_number || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {asset.nama_barang}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            NUP: {asset.nup} • {asset.jenis_bmn}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-300">
                          {formatRupiah(asset.pivot?.nilai_taksiran)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={isSold ? "true" : "false"}
                            onChange={(e) => {
                              const val = e.target.value === "true";
                              setFirstAuctionSold({ ...firstAuctionSold, [asset.id]: val });
                              if (!val) {
                                setFirstAuctionPrice({ ...firstAuctionPrice, [asset.id]: "" });
                              }
                            }}
                            disabled={!canFinalize}
                            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="false">Tidak Terjual</option>
                            <option value="true">Terjual</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="number"
                            placeholder="Rp Harga Terbentuk"
                            value={firstAuctionPrice[asset.id] || ""}
                            onChange={(e) =>
                              setFirstAuctionPrice({ ...firstAuctionPrice, [asset.id]: e.target.value })
                            }
                            disabled={!isSold || !canFinalize}
                            className="h-8 text-right text-xs rounded-lg border-zinc-200 dark:border-zinc-800"
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
                  onClick={handleSaveFirstResults}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold py-2 px-4 shadow-sm flex items-center gap-1.5"
                  disabled={recordFirstMutation.isPending}
                >
                  {recordFirstMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Simpan Hasil Lelang I
                </Button>
              </div>
            )}
          </div>

          {/* Subsequent Actions Block */}
          {firstResultsSaved && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-250 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-zinc-400" />
                Langkah Penyelesaian
              </h4>

              {hasUnsoldAssetsInFirst ? (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Terdapat aset yang <strong>tidak terjual</strong> pada pelaksanaan lelang pertama. Anda dapat menetapkan Lelang Ulang untuk sisa aset tersebut, atau langsung memfinalisasi realisasi (aset tidak terjual akan dikembalikan ke status operasional dinas).
                  </p>
                  {canFinalize && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => setIsReauctionDialogOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                      >
                        Jadwal Lelang Ulang (Lelang II)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => realizeMutation.mutate()}
                        className="rounded-xl text-xs font-bold border-zinc-300 hover:bg-zinc-100"
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
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Semua aset di dalam paket lelang ini telah <strong>berhasil terjual</strong>. Lakukan finalisasi realisasi untuk menyelesaikan dokumen penghapusan aset.
                  </p>
                  {canFinalize && (
                    <Button
                      onClick={() => realizeMutation.mutate()}
                      className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
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
          <div className="bg-purple-50/20 dark:bg-purple-950/5 border border-purple-200 dark:border-purple-900/30 p-4 rounded-2xl text-xs flex gap-3 items-start">
            <Calendar className="h-5 w-5 text-purple-650 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-purple-900 dark:text-purple-400">Status: Lelang Ulang (Lelang II)</h4>
              <p className="mt-0.5 leading-relaxed text-zinc-650 dark:text-zinc-400">
                Surat penetapan lelang ulang: <strong>{batch.no_surat_jadwal_ulang}</strong> • Tanggal pelaksanaan lelang ulang: <strong>{batch.tanggal_lelang_ulang ? formatDateLong(new Date(batch.tanggal_lelang_ulang)) : "-"}</strong>
              </p>
            </div>
          </div>

          {/* Reauction table */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Gavel className="h-4.5 w-4.5 text-purple-650" />
              Hasil Pelaksanaan Lelang Kedua (Ulang)
            </h3>

            <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-500">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5 text-right">Nilai Taksiran</th>
                    <th className="px-4 py-2.5 text-center w-36">Status Terjual</th>
                    <th className="px-4 py-2.5 text-right w-52">Harga Terbentuk (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {assets
                    .filter((a) => !a.pivot?.first_auction_is_sold)
                    .map((asset) => {
                      const isSold = reauctionSold[asset.id] || false;
                      return (
                        <tr key={asset.id}>
                          <td className="px-4 py-3 font-mono font-bold text-zinc-500">
                            {asset.pivot?.lot_number || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {asset.nama_barang}
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              NUP: {asset.nup} • {asset.jenis_bmn}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-300">
                            {formatRupiah(asset.pivot?.nilai_taksiran)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={isSold ? "true" : "false"}
                              onChange={(e) => {
                                const val = e.target.value === "true";
                                setReauctionSold({ ...reauctionSold, [asset.id]: val });
                                if (!val) {
                                  setReauctionPrice({ ...reauctionPrice, [asset.id]: "" });
                                }
                              }}
                              disabled={!canFinalize}
                              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="false">Tidak Terjual</option>
                              <option value="true">Terjual</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              placeholder="Rp Harga Terbentuk"
                              value={reauctionPrice[asset.id] || ""}
                              onChange={(e) =>
                                setReauctionPrice({ ...reauctionPrice, [asset.id]: e.target.value })
                              }
                              disabled={!isSold || !canFinalize}
                              className="h-8 text-right text-xs rounded-lg border-zinc-200 dark:border-zinc-800"
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
                  className="bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-xs font-bold py-2 px-4 shadow-sm flex items-center gap-1.5"
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
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-sm text-zinc-855 dark:text-zinc-250">Finalisasi Akhir</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Hasil lelang ulang telah dicatat. Finalisasi realisasi sekarang untuk menghapus aset terjual dan memulihkan aset tidak terjual.
              </p>
              <Button
                onClick={() => realizeMutation.mutate()}
                className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
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
          <div className="bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-250 dark:border-emerald-900/30 p-4 rounded-2xl text-xs flex gap-3 items-center">
            <CheckCircle className="h-5 w-5 text-emerald-650 shrink-0" />
            <div>
              <h4 className="font-bold text-emerald-900 dark:text-emerald-400">Realisasi Selesai</h4>
              <p className="mt-0.5 leading-relaxed text-zinc-650 dark:text-zinc-400">
                Paket lelang ini telah difinalisasi. Penghapusan aset yang terjual telah dicatat secara hukum, dan aset yang tidak terjual telah dikembalikan ke status aktif.
              </p>
            </div>
          </div>

          {/* Outcomes list table */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Laporan Akhir Penjualan Aset</h3>
            <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-500">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5 text-right">Nilai Taksiran</th>
                    <th className="px-4 py-2.5 text-center w-40">Status Akhir</th>
                    <th className="px-4 py-2.5 text-right w-44">Harga Terbentuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {assets.map((asset) => {
                    const pivot = asset.pivot;
                    const finalResult = pivot?.final_result;
                    const finalPrice = pivot?.final_price;

                    let label = "Tidak Terjual";
                    let badgeCls = "bg-zinc-100 text-zinc-850";

                    if (finalResult === "SOLD_FIRST") {
                      label = "Terjual Lelang I";
                      badgeCls = "bg-emerald-50 text-emerald-800 border-emerald-100";
                    } else if (finalResult === "SOLD_REAUCTION") {
                      label = "Terjual Lelang II";
                      badgeCls = "bg-purple-50 text-purple-800 border-purple-100";
                    }

                    return (
                      <tr key={asset.id}>
                        <td className="px-4 py-3 font-mono font-bold text-zinc-500">
                          {pivot?.lot_number || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {asset.nama_barang}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            NUP: {asset.nup} • {asset.jenis_bmn}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-350">
                          {formatRupiah(pivot?.nilai_taksiran)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`${badgeCls} text-[10px] font-semibold`}>
                            {label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {finalPrice ? formatRupiah(finalPrice) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 4. BATAL (CANCELLED) VIEW -------------------- */}
      {batch.status === "BATAL" && (
        <div className="space-y-6">
          <div className="bg-red-50/20 dark:bg-red-950/5 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl text-xs flex gap-3 items-start">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-950 dark:text-red-400">Paket Dibatalkan</h4>
              <p className="mt-0.5 leading-relaxed text-zinc-650 dark:text-zinc-400">
                Proses lelang dibatalkan. Aset yang dibekukan telah dikembalikan ke status dinas semula.
              </p>
              {batch.reauction_notes && (
                <p className="mt-2 text-zinc-500">
                  Catatan pembatalan: <strong className="text-zinc-800 dark:text-zinc-200">"{batch.reauction_notes}"</strong>
                </p>
              )}
            </div>
          </div>

          {/* List of assets in cancelled batch */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Daftar Aset</h3>
            <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-500">
                    <th className="px-4 py-2.5 w-20">Lot</th>
                    <th className="px-4 py-2.5">Identitas Aset</th>
                    <th className="px-4 py-2.5">Jenis BMN</th>
                    <th className="px-4 py-2.5 text-right">Nilai Perolehan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-400">
                        {asset.pivot?.lot_number || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                          {asset.nama_barang}
                        </div>
                        <div className="text-[10px] text-zinc-450 mt-0.5">NUP: {asset.nup}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-650 dark:text-zinc-400">{asset.jenis_bmn}</td>
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

      {/* -------------------- 5. NO DATA EMPTY STATES (DRAFT/DIAJUKAN) -------------------- */}
      {(batch.status === "DRAFT" || batch.status === "DIAJUKAN") && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-8 rounded-2xl text-center space-y-3">
          <TrendingUp className="h-10 w-10 text-zinc-350 dark:text-zinc-700 mx-auto" />
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Realisasi Belum Dimulai</h3>
          <p className="text-xs text-zinc-450 max-w-sm mx-auto">
            Halaman pencatatan realisasi baru akan tersedia setelah Surat Persetujuan dan Penetapan Jadwal lelang eksternal terbit (status <strong>JADWAL DITETAPKAN</strong>).
          </p>
        </div>
      )}

      {/* -------------------- DIALOGS -------------------- */}

      {/* Reauction Scheduling Dialog */}
      <Dialog open={isReauctionDialogOpen} onOpenChange={setIsReauctionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Jadwal Ulang Pelaksanaan Lelang (Lelang II)
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Masukkan nomor surat keputusan jadwal ulang KPKNL untuk aset-aset yang belum laku terjual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Nomor Surat Jadwal Ulang
              </label>
              <Input
                placeholder="S-JADWAL-ULANG-XXX/KNL.XX/YYYY"
                value={noSuratJadwalUlang}
                onChange={(e) => setNoSuratJadwalUlang(e.target.value)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Tanggal Pelaksanaan Lelang Ulang
              </label>
              <Input
                type="date"
                value={tglLelangUlang}
                onChange={(e) => setTglLelangUlang(e.target.value)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Catatan / Keterangan (Opsional)
              </label>
              <Input
                placeholder="Tambahkan alasan atau detail lainnya..."
                value={reauctionNotes}
                onChange={(e) => setReauctionNotes(e.target.value)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
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
              className="bg-purple-600 hover:bg-purple-750 text-white rounded-xl font-bold text-xs"
              disabled={startReauctionMutation.isPending}
            >
              Ya, Mulai Lelang Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Batch Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold dark:text-zinc-50 flex items-center gap-1.5 text-red-600">
              <XCircle className="h-5 w-5" />
              Batalkan Paket Lelang ini?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Membatalkan paket akan mengembalikan seluruh aset yang dibekukan kembali ke status aktif operasional dinas. Tindakan ini tidak dapat dianulir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Alasan Pembatalan (Opsional)
              </label>
              <Input
                placeholder="Sebutkan alasan penundaan atau pembatalan..."
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
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
              onClick={handleCancelSubmit}
              className="bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold text-xs"
              disabled={cancelMutation.isPending}
            >
              Ya, Batalkan Paket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
