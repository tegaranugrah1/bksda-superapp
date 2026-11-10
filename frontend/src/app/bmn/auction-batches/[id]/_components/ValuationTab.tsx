"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateValuation, AuctionBatch, AuctionBatchAsset, ChecklistResponse } from "../../_lib/api";
import { formatRupiah, type AuctionAsset } from "../../../auction-candidates/_lib/auction-helpers";
import {
  KertasKerjaAssetSection,
  type WorksheetSourceAsset,
} from "../../../auction-candidates/_components/KertasKerjaAssetSection";
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
  formState: ReturnType<typeof useValuationFormState>;
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
  checklist?: ChecklistResponse | null;
  onGoToPreDocs?: () => void;
}

export function useValuationFormState(batch?: AuctionBatch) {
  const [assets, setAssets] = useState<AuctionBatchAsset[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [activeAsset, setActiveAsset] = useState<AuctionBatchAsset | null>(null);
  const [worksheetData, setWorksheetData] = useState<any>(null);
  useEffect(() => {
    if (batch?.assets) {
      setAssets(batch.assets);
    }
  }, [batch]);
  return { assets, setAssets, editingAssetId, setEditingAssetId, editingValue, setEditingValue, activeAsset, setActiveAsset, worksheetData, setWorksheetData };
}

export function ValuationTab({ batch, readOnly, onRefetch, checklist, onGoToPreDocs, formState }: ValuationTabProps) {
  const dialogOpener = useRef<HTMLElement | null>(null);
  const { assets, setAssets, editingAssetId, setEditingAssetId, editingValue, setEditingValue, activeAsset, setActiveAsset, worksheetData, setWorksheetData } = formState;

  // Worksheet modal state



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
    if (readOnly || updateValuationMutation.isPending) return;
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
    if (!data) return null;
    let parsed = data;
    while (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch { break; }
    }
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "vehicle_worksheet_v1") return parsed.vehicleWorksheet || null;
    if (Array.isArray(parsed.lelangRows)) return parsed;
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

    if (!savedData) return defaultData;
    let parsed = savedData;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return defaultData;
      }
    }
    if (!parsed || typeof parsed !== "object") return defaultData;

    return {
      ...defaultData,
      ...parsed,
      comparable1: { ...defaultData.comparable1, ...(parsed.comparable1 || {}) },
      comparable2: { ...defaultData.comparable2, ...(parsed.comparable2 || {}) },
      comparable3: { ...defaultData.comparable3, ...(parsed.comparable3 || {}) },
      faktorLimit: parsed.faktorLimit ?? defaultData.faktorLimit,
    };
  };

  // Open Worksheet Calculator
  const handleOpenWorksheet = (asset: AuctionBatchAsset) => {
    if (readOnly) return;
    dialogOpener.current = document.activeElement as HTMLElement | null;
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
    if (readOnly || updateValuationMutation.isPending || !activeAsset) return;
    const finalValuation = calculateWorksheetValuation();

    updateValuationMutation.mutate({
      assetId: activeAsset.id,
      taksiran: finalValuation,
      worksheet: worksheetData,
    });
  };

  const handleSaveVehicleWorksheet = (payload: { nilaiTaksiran: number; worksheet: any }) => {
    if (readOnly || updateValuationMutation.isPending || !activeAsset) return;

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

  const availableSourceAssets = useMemo<WorksheetSourceAsset[]>(() => {
    if (!activeAsset || !assets) return [];
    return assets
      .filter((a) => a.id !== activeAsset.id && a.pivot?.kertas_kerja_data)
      .map((a) => ({
        id: a.id,
        nama_barang: a.nama_barang,
        merk_tipe: a.merk_tipe,
        kode_barang: a.kode_barang,
        nup: a.nup,
        jenis_bmn: a.jenis_bmn,
        nilai_taksiran: a.pivot?.nilai_taksiran,
        worksheet: getVehicleWorksheetInitialState(a.pivot?.kertas_kerja_data) as any,
      }))
      .filter((a) => Boolean(a.worksheet));
  }, [activeAsset, assets]);

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)] font-sans">
            Penetapan Nilai Taksiran
          </h2>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
            Lengkapi nilai taksiran untuk seluruh aset. Gunakan kalkulator Kertas Kerja untuk melakukan penilaian komparasi.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] px-4 py-2 rounded-xl text-xs font-bold">
          <DollarSign className="h-4.5 w-4.5" />
          <span>Total Taksiran: {formatRupiah(batch.nilai_taksiran_total)}</span>
        </div>
      </div>

      {/* Valuation warning */}
      {assets.some((a) => !a.pivot?.nilai_taksiran) && (
        <div className="flex items-center gap-2 bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] px-4 py-3 rounded-xl text-xs">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-[var(--ds-status-warning-fg)]" />
          <span>
            Beberapa aset belum memiliki Nilai Taksiran. Semua aset <strong>wajib</strong> dinilai sebelum paket lelang dapat dikunci dan diajukan.
          </span>
        </div>
      )}

      {/* Mobile Stacked Cards (< sm) */}
      <div className="sm:hidden space-y-3">
        {assets.length === 0 ? (
          <div className="p-8 text-center text-[var(--ds-fg-muted)] text-xs bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)]">
            Belum ada aset dalam paket lelang ini.
          </div>
        ) : (
          assets.map((asset, index) => {
            const isEditing = editingAssetId === asset.id;
            const hasWorksheet = !!asset.pivot?.kertas_kerja_data;

            return (
              <div
                key={asset.id}
                className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[var(--ds-fg-muted)]">#{index + 1}</span>
                    <h3 className="font-bold text-sm text-[var(--ds-fg)]">{asset.nama_barang}</h3>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--ds-fg-muted)] mt-0.5">
                      <span className="font-bold text-[var(--ds-accent-fg)]">{asset.kode_barang}</span>
                      <span>•</span>
                      <span>NUP: {asset.nup}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs py-1 border-t border-[var(--ds-border-subtle)]">
                  <span className="text-[var(--ds-fg-muted)]">Nilai Perolehan:</span>
                  <span className="font-semibold text-[var(--ds-fg)]">{formatRupiah(asset.nilai_perolehan)}</span>
                </div>

                <div className="flex justify-between items-center text-xs py-1 border-t border-[var(--ds-border-subtle)]">
                  <span className="text-[var(--ds-fg-muted)]">Nilai Taksiran:</span>
                  <div>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          aria-label={`Nilai taksiran ${asset.nama_barang} NUP ${asset.nup}`}
                          type="text"
                          inputMode="numeric"
                          value={formatThousands(editingValue)}
                          onChange={(e) => setEditingValue(e.target.value.replace(/\D/g, ""))}
                          className="h-8 rounded-lg text-xs w-28 text-right border-[var(--ds-border-subtle)] font-medium"
                          placeholder="0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveValuation(asset.id);
                            if (e.key === "Escape") setEditingAssetId(null);
                          }}
                        />
                        <Button
                          size="icon-sm"
                          aria-label={`Simpan taksiran ${asset.nama_barang} NUP ${asset.nup}`}
                          onClick={() => handleSaveValuation(asset.id)}
                          className="h-8 w-8 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-lg"
                          disabled={updateValuationMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button type="button" disabled={readOnly} aria-label={`Ubah taksiran ${asset.nama_barang} NUP ${asset.nup}`}
                        onClick={() => handleStartEditValuation(asset)}
                        className={`bmn-choice-card font-bold text-xs px-2.5 py-1 rounded-lg border ${
                          asset.pivot?.nilai_taksiran
                            ? "bg-[var(--ds-surface-muted)] border-[var(--ds-border-subtle)]   text-[var(--ds-fg)] "
                            : "bg-[var(--ds-status-danger-bg)] border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)]  "
                        } ${!readOnly ? "cursor-pointer" : ""}`}
                      >
                        {asset.pivot?.nilai_taksiran ? formatRupiah(asset.pivot.nilai_taksiran) : "Belum Dinilai"}
                      </button>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <div className="pt-2 border-t border-[var(--ds-border-subtle)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenWorksheet(asset)}
                      className={`w-full rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[36px] ${
                        hasWorksheet
                          ? "text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] "
                          : "text-[var(--ds-fg-secondary)] "
                      }`}
                    >
                      <Calculator className="h-4 w-4" />
                      {hasWorksheet ? "Edit Kertas Kerja" : "Buka Kertas Kerja"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Valuation Table (>= sm) */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] w-16">
                  No.
                </th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Identitas Aset
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)]">
                  Nilai Perolehan
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] w-60">
                  Nilai Taksiran
                </th>
                {!readOnly && (
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] w-36">
                    Kertas Kerja
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 4 : 5} className="p-10 text-center text-[var(--ds-fg-muted)] text-xs">
                    Belum ada aset dalam paket lelang ini.
                  </td>
                </tr>
              ) : (
                assets.map((asset, index) => {
                  const isEditing = editingAssetId === asset.id;
                  const hasWorksheet = !!asset.pivot?.kertas_kerja_data;

                  return (
                    <tr
                      key={asset.id}
                      className="transition-colors hover:bg-[var(--ds-surface-muted)]"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--ds-fg-secondary)]">
                        {index + 1}.
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm text-[var(--ds-fg)]">
                          {asset.nama_barang}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-[var(--ds-fg-muted)]">
                          <span className="font-bold text-[var(--ds-accent-fg)]">{asset.kode_barang}</span>
                          <span>•</span>
                          <span>NUP: {asset.nup}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-sm text-[var(--ds-fg)]">
                        {formatRupiah(asset.nilai_perolehan)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              aria-label={`Nilai taksiran ${asset.nama_barang} NUP ${asset.nup}`}
                              type="text"
                              inputMode="numeric"
                              value={formatThousands(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value.replace(/\D/g, ""))}
                              className="h-8 rounded-lg text-xs w-36 text-right border-[var(--ds-border-subtle)] font-medium"
                              placeholder="0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveValuation(asset.id);
                                if (e.key === "Escape") setEditingAssetId(null);
                              }}
                            />
                            <Button
                              size="icon-sm"
                              aria-label={`Simpan taksiran ${asset.nama_barang} NUP ${asset.nup}`}
                              onClick={() => handleSaveValuation(asset.id)}
                              className="h-8 w-8 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-lg"
                              disabled={updateValuationMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button type="button" disabled={readOnly} aria-label={`Ubah taksiran ${asset.nama_barang} NUP ${asset.nup}`}
                            onClick={() => handleStartEditValuation(asset)}
                            className={`bmn-choice-card inline-block font-bold text-sm text-right px-3 py-1 rounded-lg border min-w-36 text-[var(--ds-fg)]  ${
                              asset.pivot?.nilai_taksiran
                                ? "bg-[var(--ds-surface-muted)] border-[var(--ds-border-subtle)]  "
                                : "bg-[var(--ds-status-danger-bg)] border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)]  "
                            } ${!readOnly ? "cursor-pointer hover:border-[var(--ds-border-subtle)]" : ""}`}
                            title={!readOnly ? "Klik untuk mengisi nilai taksiran secara langsung" : undefined}
                          >
                            {asset.pivot?.nilai_taksiran
                              ? formatRupiah(asset.pivot.nilai_taksiran)
                              : "Belum Dinilai"}
                          </button>
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
                                ? "text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] "
                                : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)]"
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
          <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] rounded-2xl max-h-[94vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>Kertas Kerja Penaksiran Kendaraan</DialogTitle>
              <DialogDescription>
                Formulir analisis dan penentuan nilai taksiran BMN kendaraan dinas operasional untuk lelang.
              </DialogDescription>
            </DialogHeader>
            <KertasKerjaAssetSection
              asset={toWorksheetAsset(activeAsset)}
              worksheetNumber={Math.max(1, assets.findIndex((a) => a.id === activeAsset.id) + 1)}
              initialState={getVehicleWorksheetInitialState(activeAsset.pivot?.kertas_kerja_data)}
              isSaving={updateValuationMutation.isPending}
              onClose={() => setActiveAsset(null)}
              onSave={handleSaveVehicleWorksheet}
              availableSourceAssets={availableSourceAssets}
            />
          </DialogContent>
        </Dialog>
      )}

      {activeAsset && !isVehicleAsset(activeAsset) && worksheetData && (
        <Dialog open={!!activeAsset} onOpenChange={() => setActiveAsset(null)}>
          <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover w-[calc(100vw-2rem)] sm:max-w-6xl rounded-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[var(--ds-fg)]">
                Kertas Kerja Penaksiran Aset
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--ds-fg-muted)]">
                Lakukan komparasi harga pasar dengan 3 objek sejenis untuk merumuskan Nilai Taksiran BMN.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-3 text-sm">
              {/* Asset Info Card */}
              <div className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                <div className="grid grid-cols-1 divide-y divide-[var(--ds-border-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                  {getAssetSummaryItems(activeAsset).map((item) => (
                    <div key={item.label} className="min-w-0 px-5 py-4">
                      <p className="text-xs font-semibold uppercase text-[var(--ds-fg-muted)]">{item.label}</p>
                      <p
                        className={`mt-1 truncate text-sm text-[var(--ds-fg)]  ${
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
                <h3 className="font-bold text-base text-[var(--ds-fg)] border-b pb-2">
                  Data Pembanding Pasar
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Comparable 1 */}
                  <div className="border border-[var(--ds-border-subtle)] rounded-2xl p-5 space-y-4 bg-[var(--ds-surface)]">
                    <p className="font-bold text-base text-[var(--ds-fg)]">Listing Pembanding 1</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Uraian / Sumber</label>
                        <Input aria-label="Uraian / Sumber"
                          value={worksheetData.comparable1.name}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable1: { ...worksheetData.comparable1, name: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Harga Pasar (Rp)</label>
                        <Input aria-label="Harga Pasar (Rp)"
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
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Penyesuaian (%)</label>
                        <Input aria-label="Penyesuaian (%)"
                          type="number"
                          value={worksheetData.comparable1.adjustment}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable1: { ...worksheetData.comparable1, adjustment: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Comparable 2 */}
                  <div className="border border-[var(--ds-border-subtle)] rounded-2xl p-5 space-y-4 bg-[var(--ds-surface)]">
                    <p className="font-bold text-base text-[var(--ds-fg)]">Listing Pembanding 2</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Uraian / Sumber</label>
                        <Input aria-label="Uraian / Sumber"
                          value={worksheetData.comparable2.name}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable2: { ...worksheetData.comparable2, name: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Harga Pasar (Rp)</label>
                        <Input aria-label="Harga Pasar (Rp)"
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
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Penyesuaian (%)</label>
                        <Input aria-label="Penyesuaian (%)"
                          type="number"
                          value={worksheetData.comparable2.adjustment}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable2: { ...worksheetData.comparable2, adjustment: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Comparable 3 */}
                  <div className="border border-[var(--ds-border-subtle)] rounded-2xl p-5 space-y-4 bg-[var(--ds-surface)]">
                    <p className="font-bold text-base text-[var(--ds-fg)]">Listing Pembanding 3</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Uraian / Sumber</label>
                        <Input aria-label="Uraian / Sumber"
                          value={worksheetData.comparable3.name}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable3: { ...worksheetData.comparable3, name: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Harga Pasar (Rp)</label>
                        <Input aria-label="Harga Pasar (Rp)"
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
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--ds-fg-muted)] font-medium">Penyesuaian (%)</label>
                        <Input aria-label="Penyesuaian (%)"
                          type="number"
                          value={worksheetData.comparable3.adjustment}
                          onChange={(e) =>
                            setWorksheetData({
                              ...worksheetData,
                              comparable3: { ...worksheetData.comparable3, adjustment: e.target.value },
                            })
                          }
                          className="h-10 text-sm mt-1 rounded-lg border-[var(--ds-border-subtle)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factors */}
              <div className="border border-[var(--ds-border-subtle)] rounded-2xl p-5 bg-[var(--ds-surface-muted)] grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div>
                  <label className="text-sm font-semibold text-[var(--ds-fg-secondary)]">
                    Faktor Penaksiran / Kondisi Objektif
                  </label>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    Rasio limit harga jual lelang dari hasil rata-rata perbandingan pasar (default: 0.7 atau 70%).
                  </p>
                </div>
                <Input
                  aria-label="Faktor Penaksiran / Kondisi Objektif"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  value={worksheetData.faktorLimit}
                  onChange={(e) => setWorksheetData({ ...worksheetData, faktorLimit: e.target.value })}
                  className="h-10 text-sm rounded-lg border-[var(--ds-border-subtle)] max-w-48 md:justify-self-end text-right font-bold"
                />
              </div>

              {/* Calculated Result */}
              <div className="bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                <div>
                  <h4 className="font-bold text-[var(--ds-accent-fg)] text-base">
                    Hasil Penaksiran Nilai
                  </h4>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                    (Rata-rata Harga Komparasi Terkoreksi) x Faktor Penaksiran
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-2xl font-extrabold text-[var(--ds-accent-fg)]">
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
                className="h-10 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-white rounded-xl flex items-center gap-1.5"
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
