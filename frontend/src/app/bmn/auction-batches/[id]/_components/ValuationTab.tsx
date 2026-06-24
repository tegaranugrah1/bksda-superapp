"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateValuation, AuctionBatch, AuctionBatchAsset, ChecklistResponse } from "../../_lib/api";
import { formatRupiah, type AuctionAsset } from "../../../auction-candidates/_lib/auction-helpers";
import { KertasKerjaAssetSection } from "../../../auction-candidates/_components/KertasKerjaAssetSection";
import { toast } from "sonner";
import {
  Loader2,
  FileSpreadsheet,
  Check,
  Calculator,
  Plus,
  Trash2,
  Info,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ValuationTabProps {
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
  checklist?: ChecklistResponse | null;
  onGoToPreDocs?: () => void;
}

export function ValuationTab({ batch, readOnly, onRefetch, checklist, onGoToPreDocs }: ValuationTabProps) {
  const [assets, setAssets] = useState<AuctionBatchAsset[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Worksheet modal state
  const [activeAsset, setActiveAsset] = useState<AuctionBatchAsset | null>(null);
  const [worksheetData, setWorksheetData] = useState<any>(null);

  useEffect(() => {
    if (batch?.assets) {
      setAssets(batch.assets);
    }
  }, [batch]);

  const updateValuationMutation = useMutation({
    mutationFn: ({
      assetId,
      taksiran,
      worksheet,
    }: {
      assetId: string;
      taksiran: number | null;
      worksheet?: any;
    }) =>
      updateValuation(batch.id, assetId, {
        nilai_taksiran: taksiran,
        kertas_kerja_data: worksheet || null,
      }),
    onSuccess: () => {
      toast.success("Nilai taksiran berhasil diperbarui.");
      setEditingAssetId(null);
      setActiveAsset(null);
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui nilai taksiran.");
    },
  });

  const handleStartEditValuation = (asset: AuctionBatchAsset) => {
    if (readOnly) return;
    setEditingAssetId(asset.id);
    setEditingValue(String(asset.pivot?.nilai_taksiran || ""));
  };

  const handleSaveValuation = (assetId: string) => {
    const val = parseFloat(editingValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Nilai taksiran harus lebih besar dari 0.");
      return;
    }
    updateValuationMutation.mutate({
      assetId,
      taksiran: val,
    });
  };

  const isVehicleAsset = (asset: AuctionBatchAsset) =>
    /alat angkutan bermotor|kendaraan|motor/i.test(`${asset.jenis_bmn} ${asset.nama_barang}`);

  const toWorksheetAsset = (asset: AuctionBatchAsset): AuctionAsset => ({
    id: asset.id,
    kode_barang: asset.kode_barang,
    nup: asset.nup,
    nup_lama: asset.nup_lama,
    nama_barang: asset.nama_barang,
    jenis_bmn: asset.jenis_bmn,
    merk_tipe: asset.merk_tipe,
    kondisi: asset.kondisi,
    nilai_perolehan: asset.nilai_perolehan,
    nilai_buku: asset.nilai_buku,
    no_polisi: asset.no_polisi,
    no_bpkp: asset.no_bpkp,
    no_mesin: asset.no_mesin,
    no_rangka: asset.no_rangka,
  });

  const getVehicleWorksheetInitialState = (data: any) => {
    if (!data || typeof data !== "object") return null;
    if (data.type === "vehicle_worksheet_v1") return data.vehicleWorksheet || null;
    if (Array.isArray(data.lelangRows)) return data;
    return null;
  };

  const createWorksheetData = (asset: AuctionBatchAsset, savedData?: any) => {
    const isMotor = /motor|sepeda/i.test(`${asset.nama_barang} ${asset.merk_tipe || ""}`);
    const price = asset.nilai_perolehan || 0;
    const defaultData = {
      namaObjek: asset.nama_barang,
      tipe: asset.merk_tipe || "-",
      isRoda2: isMotor,
      isRoda4: !isMotor,
      comparable1: { name: "Pembanding A", price: Math.round(price * 0.4), adjustment: -10 },
      comparable2: { name: "Pembanding B", price: Math.round(price * 0.45), adjustment: -5 },
      comparable3: { name: "Pembanding C", price: Math.round(price * 0.38), adjustment: -15 },
      faktorLimit: 0.7,
    };

    if (!savedData || typeof savedData !== "object") return defaultData;

    return {
      ...defaultData,
      ...savedData,
      comparable1: { ...defaultData.comparable1, ...(savedData.comparable1 || {}) },
      comparable2: { ...defaultData.comparable2, ...(savedData.comparable2 || {}) },
      comparable3: { ...defaultData.comparable3, ...(savedData.comparable3 || {}) },
      faktorLimit: savedData.faktorLimit ?? defaultData.faktorLimit,
    };
  };

  // Open Worksheet Calculator
  const handleOpenWorksheet = (asset: AuctionBatchAsset) => {
    if (readOnly) return;
    setActiveAsset(asset);
    setWorksheetData(createWorksheetData(asset, asset.pivot?.kertas_kerja_data));
  };

  const parseCurrencyInput = (value: unknown) => Number(String(value ?? "").replace(/\D/g, "")) || 0;

  const formatThousands = (value: unknown) => {
    const parsed = parseCurrencyInput(value);
    return parsed ? parsed.toLocaleString("id-ID") : "";
  };

  const hasAssetDetail = (value?: string | null) => {
    const normalized = value?.trim();
    return !!normalized && normalized !== "-";
  };

  const getAssetSummaryItems = (asset: AuctionBatchAsset) =>
    [
      { label: "Nama Objek", value: asset.nama_barang, strong: false },
      ...(hasAssetDetail(asset.merk_tipe)
        ? [{ label: "Merk/Tipe", value: asset.merk_tipe, strong: false }]
        : []),
      ...(hasAssetDetail(asset.no_polisi)
        ? [{ label: "No Polisi", value: asset.no_polisi, strong: false }]
        : []),
      { label: "Nilai Perolehan Asal", value: formatRupiah(asset.nilai_perolehan), strong: true },
    ].filter((detail) => hasAssetDetail(detail.value));

  const calculateWorksheetValuation = () => {
    if (!worksheetData) return 0;

    const { comparable1, comparable2, comparable3, faktorLimit } = worksheetData;

    const getAdjusted = (comp: any) => {
      const p = parseCurrencyInput(comp?.price);
      const adj = parseFloat(comp?.adjustment) || 0;
      return p * (1 + adj / 100);
    };

    const v1 = getAdjusted(comparable1);
    const v2 = getAdjusted(comparable2);
    const v3 = getAdjusted(comparable3);

    const average = (v1 + v2 + v3) / 3;
    return Math.round(average * (parseFloat(faktorLimit) || 0.7));
  };

  const handleSaveWorksheet = () => {
    if (!activeAsset) return;
    const finalValuation = calculateWorksheetValuation();

    updateValuationMutation.mutate({
      assetId: activeAsset.id,
      taksiran: finalValuation,
      worksheet: worksheetData,
    });
  };

  const handleSaveVehicleWorksheet = (payload: { nilaiTaksiran: number; worksheet: any }) => {
    if (!activeAsset) return;

    updateValuationMutation.mutate({
      assetId: activeAsset.id,
      taksiran: payload.nilaiTaksiran,
      worksheet: {
        type: "vehicle_worksheet_v1",
        vehicleWorksheet: payload.worksheet,
        finalValuation: payload.nilaiTaksiran,
      },
    });
  };

  const preValuationSection = checklist?.sections?.find((section) => section.key === "pre_valuation_documents");
  const assetsLotSection = checklist?.sections?.find((section) => section.key === "assets_lot");
  const missingGateItems = [...(assetsLotSection?.items ?? []), ...(preValuationSection?.items ?? [])].filter(
    (item) => (item.required ?? true) && !item.passed
  );
  const isValuationBlocked = !readOnly && checklist?.can_enter_valuation === false;

  if (isValuationBlocked) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold">Nilai taksiran belum dapat diisi</h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/80">
                Selesaikan dokumen awal dan kelengkapan lot sebelum tim penilai mengisi kertas kerja nilai taksiran.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Yang masih kurang</h3>
            {onGoToPreDocs && (
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold" onClick={onGoToPreDocs}>
                Buka Dokumen Awal
              </Button>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {missingGateItems.map((item) => (
              <div key={item.key} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">{item.label}</p>
                {item.message && <p className="mt-0.5 text-[11px] text-zinc-500">{item.message}</p>}
              </div>
            ))}
            {missingGateItems.length === 0 && (
              <p className="text-xs text-zinc-500">Checklist sedang dimuat ulang. Coba buka kembali beberapa detik lagi.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 font-sans">
            Penetapan Nilai Taksiran
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Lengkapi nilai taksiran untuk seluruh aset. Gunakan kalkulator Kertas Kerja untuk melakukan penilaian komparasi.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2 rounded-xl text-xs font-bold">
          <DollarSign className="h-4.5 w-4.5" />
          <span>Total Taksiran: {formatRupiah(batch.nilai_taksiran_total)}</span>
        </div>
      </div>

      {/* Valuation warning */}
      {assets.some((a) => !a.pivot?.nilai_taksiran) && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-350 border border-amber-100 dark:border-amber-900/30 px-4 py-3 rounded-xl text-xs">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
          <span>
            Beberapa aset belum memiliki Nilai Taksiran. Semua aset <strong>wajib</strong> dinilai sebelum paket lelang dapat dikunci dan diajukan.
          </span>
        </div>
      )}

      {/* Valuation Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-24">
                  Lot
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Identitas Aset
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nilai Perolehan
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-60">
                  Nilai Taksiran
                </th>
                {!readOnly && (
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-36">
                    Kertas Kerja
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 4 : 5} className="p-10 text-center text-zinc-400 text-xs">
                    Belum ada aset dalam paket lelang ini.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const isEditing = editingAssetId === asset.id;
                  const hasWorksheet = !!asset.pivot?.kertas_kerja_data;

                  return (
                    <tr
                      key={asset.id}
                      className="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-bold text-zinc-655 dark:text-zinc-400">
                        {asset.pivot?.lot_number || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm text-zinc-950 dark:text-zinc-50">
                          {asset.nama_barang}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                          <span className="font-bold text-red-700">{asset.kode_barang}</span>
                          <span>•</span>
                          <span>NUP: {asset.nup}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-sm text-zinc-850 dark:text-zinc-300">
                        {formatRupiah(asset.nilai_perolehan)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="h-8 rounded-lg text-xs w-36 text-right border-zinc-200 dark:border-zinc-800"
                              placeholder="0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveValuation(asset.id);
                                if (e.key === "Escape") setEditingAssetId(null);
                              }}
                            />
                            <Button
                              size="icon-sm"
                              onClick={() => handleSaveValuation(asset.id)}
                              className="h-8 w-8 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg"
                              disabled={updateValuationMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditValuation(asset)}
                            className={`inline-block font-bold text-sm text-right px-3 py-1 rounded-lg border min-w-36 text-zinc-900 dark:text-zinc-100 ${
                              asset.pivot?.nilai_taksiran
                                ? "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800"
                                : "bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/30"
                            } ${!readOnly ? "cursor-pointer hover:border-zinc-350" : ""}`}
                            title={!readOnly ? "Klik untuk mengisi nilai taksiran secara langsung" : undefined}
                          >
                            {asset.pivot?.nilai_taksiran
                              ? formatRupiah(asset.pivot.nilai_taksiran)
                              : "Belum Dinilai"}
                          </div>
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-5 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenWorksheet(asset)}
                            className={`rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto ${
                              hasWorksheet
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                            }`}
                            title="Buka kalkulator komparasi pasar"
                          >
                            <Calculator className="h-4 w-4" />
                            {hasWorksheet ? "Edit Kertas Kerja" : "Kertas Kerja"}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worksheet Modal Dialog */}
      {activeAsset && isVehicleAsset(activeAsset) && (
        <Dialog open={!!activeAsset} onOpenChange={() => setActiveAsset(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] rounded-2xl max-h-[94vh] overflow-y-auto">
            <KertasKerjaAssetSection
              asset={toWorksheetAsset(activeAsset)}
              worksheetNumber={Number(activeAsset.pivot?.lot_number) || 1}
              employees={[]}
              initialState={getVehicleWorksheetInitialState(activeAsset.pivot?.kertas_kerja_data)}
              isSaving={updateValuationMutation.isPending}
              onClose={() => setActiveAsset(null)}
              onSave={handleSaveVehicleWorksheet}
            />
          </DialogContent>
        </Dialog>
      )}

      {activeAsset && !isVehicleAsset(activeAsset) && worksheetData && (
        <Dialog open={!!activeAsset} onOpenChange={() => setActiveAsset(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-6xl rounded-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Kertas Kerja Penaksiran Aset
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-555">
                Lakukan komparasi harga pasar dengan 3 objek sejenis untuk merumuskan Nilai Taksiran BMN.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-3 text-sm">
              {/* Asset Info Card */}
              <div className="overflow-hidden rounded-2xl border border-zinc-150 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid grid-cols-1 divide-y divide-zinc-150 dark:divide-zinc-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                  {getAssetSummaryItems(activeAsset).map((item) => (
                    <div key={item.label} className="min-w-0 px-5 py-4">
                      <p className="text-xs font-semibold uppercase text-zinc-400">{item.label}</p>
                      <p
                        className={`mt-1 truncate text-sm text-zinc-850 dark:text-zinc-100 ${
                          item.strong ? "font-bold" : "font-semibold"
                        }`}
                        title={String(item.value)}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparable Listings */}
              <div className="space-y-4">
                <h3 className="font-bold text-base text-zinc-850 dark:text-zinc-300 border-b pb-2 dark:border-zinc-800">
                  Data Pembanding Pasar
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Comparable 1 */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 bg-white dark:bg-zinc-950">
                    <p className="font-bold text-base text-zinc-800 dark:text-zinc-200">Listing Pembanding 1</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Uraian / Sumber</label>
                        <Input
                          value={worksheetData.comparable1.name}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable1: { ...worksheetData.comparable1, name: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Harga Pasar (Rp)</label>
                        <Input
                          inputMode="numeric"
                          value={formatThousands(worksheetData.comparable1.price)}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable1: {
                                ...worksheetData.comparable1,
                                price: e.target.value.replace(/\D/g, ""),
                              },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Penyesuaian (%)</label>
                        <Input
                          type="number"
                          value={worksheetData.comparable1.adjustment}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable1: { ...worksheetData.comparable1, adjustment: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Comparable 2 */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 bg-white dark:bg-zinc-950">
                    <p className="font-bold text-base text-zinc-800 dark:text-zinc-200">Listing Pembanding 2</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Uraian / Sumber</label>
                        <Input
                          value={worksheetData.comparable2.name}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable2: { ...worksheetData.comparable2, name: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Harga Pasar (Rp)</label>
                        <Input
                          inputMode="numeric"
                          value={formatThousands(worksheetData.comparable2.price)}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable2: {
                                ...worksheetData.comparable2,
                                price: e.target.value.replace(/\D/g, ""),
                              },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Penyesuaian (%)</label>
                        <Input
                          type="number"
                          value={worksheetData.comparable2.adjustment}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable2: { ...worksheetData.comparable2, adjustment: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Comparable 3 */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 bg-white dark:bg-zinc-950">
                    <p className="font-bold text-base text-zinc-800 dark:text-zinc-200">Listing Pembanding 3</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Uraian / Sumber</label>
                        <Input
                          value={worksheetData.comparable3.name}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable3: { ...worksheetData.comparable3, name: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Harga Pasar (Rp)</label>
                        <Input
                          inputMode="numeric"
                          value={formatThousands(worksheetData.comparable3.price)}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable3: {
                                ...worksheetData.comparable3,
                                price: e.target.value.replace(/\D/g, ""),
                              },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Penyesuaian (%)</label>
                        <Input
                          type="number"
                          value={worksheetData.comparable3.adjustment}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable3: { ...worksheetData.comparable3, adjustment: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factors */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 bg-zinc-50/50 dark:bg-zinc-900/30 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div>
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Faktor Penaksiran / Kondisi Objektif
                  </label>
                  <p className="text-xs text-zinc-400 mt-1">
                    Rasio limit harga jual lelang dari hasil rata-rata perbandingan pasar (default: 0.7 atau 70%).
                  </p>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  value={worksheetData.faktorLimit}
                  onChange={(e) => setWorksheetData({ ...worksheetData, faktorLimit: e.target.value })}
                  className="h-10 text-sm rounded-lg border-zinc-200 dark:border-zinc-800 max-w-48 md:justify-self-end text-right font-bold"
                />
              </div>

              {/* Calculated Result */}
              <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                <div>
                  <h4 className="font-bold text-emerald-850 dark:text-emerald-300 text-base">
                    Hasil Penaksiran Nilai
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    (Rata-rata Harga Komparasi Terkoreksi) x Faktor Penaksiran
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(calculateWorksheetValuation())}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveAsset(null)} className="h-10 rounded-xl">
                Batal
              </Button>
              <Button
                onClick={handleSaveWorksheet}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5"
                disabled={updateValuationMutation.isPending}
              >
                {updateValuationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Simpan Nilai Taksiran
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
