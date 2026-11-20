"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  RefreshCw,
  Minus,
  FileSpreadsheet,
  Search,
  X,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { deduplicateMerkTipe } from "@/app/bmn/_lib/asset-utils";

interface ChangedField {
  old: string | number | null;
  new: string | number | null;
  selected?: boolean;
}

interface StagingRow {
  id: string;
  diff_status: "new" | "updated" | "unchanged";
  imported_data: Record<string, unknown>;
  changed_fields: Record<string, ChangedField> | null;
  selected: boolean;
  existing_asset_id: string | null;
}

interface BatchInfo {
  id: string;
  filename: string;
  total_rows: number;
  new_rows: number;
  updated_rows: number;
  unchanged_rows: number;
  status: string;
  created_at: string;
}

interface SelectionSummary {
  selected_total: number;
  selected_new: number;
  selected_updated: number;
  filtered_new: number;
  filtered_updated: number;
}

interface RowsPagination {
  current_page: number;
  data: StagingRow[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

interface FieldSummaryItem {
  field: string;
  total: number;
  selected: number;
}

interface BatchQueryData {
  batch: BatchInfo;
  rows: RowsPagination;
  selection_summary: SelectionSummary;
  field_summary?: FieldSummaryItem[];
}

function getIdentityFilterParamsFrom(filters: {
  kode_barang: string;
  nup: string;
  nama_barang: string;
}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value !== "")
  );
}

function updateSummaryDelta(
  summary: SelectionSummary,
  diffStatus: StagingRow["diff_status"],
  delta: number
): SelectionSummary {
  if (delta === 0) return summary;
  return {
    ...summary,
    selected_total: Math.max(0, summary.selected_total + delta),
    selected_new:
      diffStatus === "new" ? Math.max(0, summary.selected_new + delta) : summary.selected_new,
    selected_updated:
      diffStatus === "updated"
        ? Math.max(0, summary.selected_updated + delta)
        : summary.selected_updated,
  };
}

function updateFieldSummaryDeltas(
  fieldSummary: FieldSummaryItem[] | undefined,
  deltas: Record<string, number>
): FieldSummaryItem[] | undefined {
  if (!fieldSummary || Object.keys(deltas).length === 0) return fieldSummary;
  return fieldSummary.map((item) => {
    const delta = deltas[item.field];
    if (!delta) return item;
    return {
      ...item,
      selected: Math.max(0, Math.min(item.total, item.selected + delta)),
    };
  });
}

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  nup_lama: "NUP Lama",
  tanggal_pengapusan: "Tanggal Penghapusan",
  foto_geotag_url: "Foto Geotag URL",
  jumlah_foto: "Jumlah Foto",
  nama_barang: "Nama Barang",
  jenis_bmn: "Jenis BMN",
  merk: "Merk",
  tipe: "Tipe",
  merk_tipe: "Merk / Tipe",
  kondisi: "Kondisi",
  status_bmn: "Status BMN",
  nilai_perolehan: "Nilai Perolehan",
  nilai_buku: "Nilai Buku",
  nilai_penyusutan: "Nilai Penyusutan",
  nilai_mutasi: "Nilai Mutasi",
  nilai_perolehan_pertama: "Nilai Perolehan Pertama",
  no_polisi: "No Polisi",
  no_stnk: "No STNK",
  status_sertifikasi: "Status Sertifikasi",
  jenis_sertipikat: "Jenis Sertifikat",
  no_sertifikat: "No Sertifikat",
  nama: "Nama",
  jenis_dokumen: "Jenis Dokumen",
  no_dokumen: "No Dokumen",
  no_bpkp: "No BPKP",
  no_psp: "No PSP",
  tanggal_psp: "Tanggal PSP",
  status_pmk: "Status PMK",
  tanggal_perolehan: "Tanggal Perolehan",
  tanggal_buku_pertama: "Tanggal Buku Pertama",
  luas_tanah_seluruhnya: "Luas Tanah",
  luas_bangunan: "Luas Bangunan",
  luas_tapak_bangunan: "Luas Tapak Bangunan",
  jumlah_lantai: "Jumlah Lantai",
  alamat: "Alamat",
  kecamatan: "Kecamatan",
  kab_kota: "Kab/Kota",
  provinsi: "Provinsi",
  status_penggunaan: "Status Penggunaan",
  lokasi_ruang: "Lokasi Ruang",
  penghuni: "Penghuni",
  pengguna: "Pengguna",
  nama_pengguna: "Nama Pengguna",
  nama_e1: "Nama E1",
  _restore: "Status Aset",
  intra_extra: "Intra/Extra",
  henti_guna: "Henti Guna",
  umur_aset: "Umur Aset",
};

export default function ImportReviewDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = React.use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { hasPermission } = useRole();
  const canReview = hasPermission("bmn.import.review");
  const canApprove = hasPermission("bmn.import.approve");
  const canWrite = canReview; // canWrite represents general review/toggle ability here

  const [filter, setFilter] = useState<"all" | "new" | "updated" | "unchanged">("all");
  const [page, setPage] = useState(1);
  const [identityFilters, setIdentityFilters] = useState({
    kode_barang: "",
    nup: "",
    nama_barang: "",
  });
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [changedFieldFilter, setChangedFieldFilter] = useState<string>("");
  const [showCheckedFieldsOnly, setShowCheckedFieldsOnly] = useState(false);
  const [showAllBulkFields, setShowAllBulkFields] = useState(false);
  const [pendingToggleCount, setPendingToggleCount] = useState(0);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mutationSeqRef = useRef(0);

  const handleStatusFilterChange = (nextFilter: "all" | "new" | "updated" | "unchanged") => {
    setPage(1);
    setFilter(nextFilter);
  };

  const handleIdentityFilterChange = (field: keyof typeof identityFilters, value: string) => {
    setPage(1);
    setIdentityFilters((current) => ({ ...current, [field]: value }));
  };

  const handleChangedFieldFilterChange = (nextField: string) => {
    setPage(1);
    setChangedFieldFilter(nextField);
    if (nextField && nextField !== "__selected__" && (filter === "new" || filter === "unchanged")) {
      setFilter("all");
    }
  };

  const activeQueryKey = useMemo(
    () => ["bmn-import-batch", batchId, filter, identityFilters, changedFieldFilter, page] as const,
    [batchId, filter, identityFilters, changedFieldFilter, page]
  );
  const activeQueryKeyRef = useRef(activeQueryKey);
  const identityFiltersRef = useRef(identityFilters);

  useEffect(() => {
    activeQueryKeyRef.current = activeQueryKey;
    identityFiltersRef.current = identityFilters;
  }, [activeQueryKey, identityFilters]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery<BatchQueryData>({
    queryKey: activeQueryKey,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      // Wait for queued checkbox toggles so filter/page switches read committed DB state.
      await mutationQueueRef.current;
      const params: Record<string, string> = { page: String(page), per_page: "50" };
      if (filter !== "all") params.status = filter;
      if (changedFieldFilter) params.changed_field = changedFieldFilter;
      Object.assign(params, getIdentityFilterParamsFrom(identityFilters));
      const res = await api.get(`/bmn/import-review/${batchId}`, { params, signal });
      return res.data;
    },
  });

  const batch: BatchInfo | null = data?.batch || null;
  const rowsPagination: RowsPagination | null = data?.rows || null;
  const rows: StagingRow[] = rowsPagination?.data || [];
  const fieldSummary: FieldSummaryItem[] = data?.field_summary || [];
  const selectionSummary: SelectionSummary = data?.selection_summary || {
    selected_total: 0,
    selected_new: 0,
    selected_updated: 0,
    filtered_new: 0,
    filtered_updated: 0,
  };

  const enqueueSelectionMutation = useCallback(
    (
      applyOptimistic: (prev: BatchQueryData) => BatchQueryData,
      sendRequest: (
        filterParams: Record<string, string>
      ) => Promise<{ data?: { selection_summary?: SelectionSummary | null } }>,
      errorMessage: string
    ) => {
      const queryKey = activeQueryKeyRef.current;
      const filterParams = getIdentityFilterParamsFrom(identityFiltersRef.current);
      const seq = ++mutationSeqRef.current;

      void queryClient.cancelQueries({ queryKey: ["bmn-import-batch", batchId] });
      queryClient.setQueryData<BatchQueryData>(queryKey, (prev) =>
        prev ? applyOptimistic(prev) : prev
      );
      setPendingToggleCount((count) => count + 1);

      const run = async () => {
        try {
          const res = await sendRequest(filterParams);
          const serverSummary = res?.data?.selection_summary;
          if (serverSummary && seq === mutationSeqRef.current) {
            queryClient.setQueryData<BatchQueryData>(queryKey, (prev) =>
              prev ? { ...prev, selection_summary: serverSummary } : prev
            );
          }
        } catch {
          toast.error(errorMessage);
          queryClient.invalidateQueries({ queryKey: ["bmn-import-batch", batchId] });
        } finally {
          setPendingToggleCount((count) => Math.max(0, count - 1));
        }
      };

      mutationQueueRef.current = mutationQueueRef.current.then(run, run);
    },
    [batchId, queryClient]
  );

  const handleToggleRow = useCallback(
    (rowId: string, selected: boolean) => {
      if (!canReview) return;
      enqueueSelectionMutation(
        (prev) => {
          let nextSummary = prev.selection_summary;
          const fieldDeltas: Record<string, number> = {};
          const nextRows = prev.rows.data.map((row) => {
            if (row.id !== rowId) return row;
            const delta = (selected ? 1 : 0) - (row.selected ? 1 : 0);
            nextSummary = updateSummaryDelta(nextSummary, row.diff_status, delta);
            const nextChangedFields = row.changed_fields
              ? Object.fromEntries(
                  Object.entries(row.changed_fields).map(([key, value]) => {
                    const wasFieldSelected = value.selected !== false;
                    const diff = (selected ? 1 : 0) - (wasFieldSelected ? 1 : 0);
                    if (diff !== 0) fieldDeltas[key] = (fieldDeltas[key] || 0) + diff;
                    return [key, { ...value, selected }];
                  })
                )
              : null;
            return { ...row, selected, changed_fields: nextChangedFields };
          });
          return {
            ...prev,
            rows: { ...prev.rows, data: nextRows },
            selection_summary: nextSummary,
            field_summary: updateFieldSummaryDeltas(prev.field_summary, fieldDeltas),
          };
        },
        (filterParams) =>
          api.post("/bmn/import-review/toggle-selection", {
            ids: [rowId],
            selected,
            ...filterParams,
          }),
        "Gagal mengubah seleksi."
      );
    },
    [canReview, enqueueSelectionMutation]
  );

  const handleToggleField = useCallback(
    (rowId: string, field: string, selected: boolean) => {
      if (!canReview) return;
      enqueueSelectionMutation(
        (prev) => {
          let nextSummary = prev.selection_summary;
          const fieldDeltas: Record<string, number> = {};
          const nextRows = prev.rows.data.map((row) => {
            if (row.id !== rowId || !row.changed_fields?.[field]) return row;
            const wasFieldSelected = row.changed_fields[field].selected !== false;
            const fieldDiff = (selected ? 1 : 0) - (wasFieldSelected ? 1 : 0);
            if (fieldDiff !== 0) fieldDeltas[field] = fieldDiff;
            const nextChangedFields: Record<string, ChangedField> = {
              ...row.changed_fields,
              [field]: { ...row.changed_fields[field], selected },
            };
            const nextSelected = Object.values(nextChangedFields).some(
              (value) => value.selected !== false
            );
            const delta = (nextSelected ? 1 : 0) - (row.selected ? 1 : 0);
            nextSummary = updateSummaryDelta(nextSummary, row.diff_status, delta);
            return { ...row, selected: nextSelected, changed_fields: nextChangedFields };
          });
          return {
            ...prev,
            rows: { ...prev.rows, data: nextRows },
            selection_summary: nextSummary,
            field_summary: updateFieldSummaryDeltas(prev.field_summary, fieldDeltas),
          };
        },
        (filterParams) =>
          api.post("/bmn/import-review/toggle-field-selection", {
            row_id: rowId,
            field,
            selected,
            ...filterParams,
          }),
        "Gagal mengubah seleksi kolom."
      );
    },
    [canReview, enqueueSelectionMutation]
  );

  const handleBulkSelection = async (
    action: "select_changed" | "clear_changed" | "select_new_only" | "select_updated" | "clear_updated" | "select_field" | "clear_field",
    field?: string
  ) => {
    if (!canReview) return;
    setBulkAction(field ? `${action}:${field}` : action);
    try {
      await mutationQueueRef.current;
      const res = await api.post("/bmn/import-review/bulk-selection", {
        batch_id: batchId,
        action,
        ...(field ? { field } : {}),
        ...getIdentityFilterParamsFrom(identityFilters),
      });
      toast.success(res.data.message || "Seleksi diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batch", batchId] });
    } catch {
      toast.error("Gagal mengubah seleksi massal.");
    } finally {
      setBulkAction(null);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) {
      toast.error("Approve import hanya tersedia untuk admin.");
      return;
    }
    setIsApproving(true);
    try {
      await mutationQueueRef.current;
      const res = await api.post(`/bmn/import-review/${batchId}/approve`, {}, { timeout: 120000 });
      toast.success(res.data.message);
      await queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batches"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-asset"] });
      router.push("/bmn/assets");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Gagal menyetujui import.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!canApprove) {
      toast.error("Tolak import hanya tersedia untuk admin.");
      return;
    }
    setIsRejecting(true);
    try {
      await api.post(`/bmn/import-review/${batchId}/reject`);
      toast.success("Import dibatalkan.");
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batches"] });
    } catch {
      toast.error("Gagal membatalkan import.");
    } finally {
      setIsRejecting(false);
    }
  };

  const totalActionable = selectionSummary.selected_total;
  const isPending = batch?.status === "pending";
  const hasIdentityFilters = Object.values(identityFilters).some((value) => value.trim() !== "");
  const hasAnyFilter = hasIdentityFilters || changedFieldFilter !== "";
  const filteredNewTotal = selectionSummary.filtered_new;
  const checkedFieldCount = fieldSummary.filter((item) => item.selected > 0).length;
  const visibleBulkFields = showCheckedFieldsOnly
    ? fieldSummary.filter((item) => item.selected > 0)
    : fieldSummary;
  const displayedBulkFields = showAllBulkFields
    ? visibleBulkFields
    : visibleBulkFields.slice(0, 8);

  if (isLoading) {
    return (
      <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui flex items-center justify-center h-96" role="status" aria-label="Memuat review impor">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-accent-fg)]" />
      </div>
    );
  }

  if (isError || !batch) {
    return <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui p-6 space-y-4">
      <p role="alert" className="text-[var(--ds-status-danger-fg)]">Detail impor gagal dimuat atau tidak tersedia.</p>
      <Button variant="outline" onClick={() => refetch()}>Coba lagi</Button>
      <Button asChild variant="ghost"><Link href="/bmn/import-review">Kembali ke Import Review</Link></Button>
    </div>;
  }

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-6 space-y-6">
      {/* Enterprise Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-6 rounded-3xl shadow-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
          <Link href="/bmn/import-review">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Link>
            </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 text-xl font-bold text-[var(--ds-fg)] flex items-start gap-2">
                <FileSpreadsheet className="w-5 h-5 shrink-0 mt-1 text-[var(--ds-accent-fg)]" />
                <span className="min-w-0 break-words">{batch?.filename}</span>
              </h1>
              <span data-status="neutral" className="text-xs font-medium px-2 py-1 rounded-full">
                Review Impor
              </span>
            </div>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1 tabular-nums">
              {batch?.total_rows} baris total •{" "}
              Diupload {batch?.created_at ? new Date(batch.created_at).toLocaleDateString("id-ID") : ""}
            </p>
          </div>
        </div>

        {canApprove && isPending && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={handleReject}
              disabled={isRejecting || isApproving || isFetching}
              variant="outline"
              className="bmn-icon-danger rounded-lg"
            >
              {isRejecting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Tolak
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting || isFetching || pendingToggleCount > 0 || totalActionable === 0}
              className="rounded-lg bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold tabular-nums"
            >
              {isApproving ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Memproses...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1" />Setujui ({totalActionable} dipilih)</>
              )}
            </Button>
          </div>
        )}
      </div>

      {!canApprove && isPending && (
        <div className="rounded-lg border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] px-4 py-3 text-sm text-[var(--ds-status-warning-fg)]">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
            <p>
              Batch ini masih menunggu review. Kamu bisa melihat detail perubahan, tetapi approval dan pengaturan seleksi hanya tersedia untuk admin.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total"
          value={batch?.total_rows || 0}
          active={filter === "all"}
          onClick={() => handleStatusFilterChange("all")}
        />
        <SummaryCard
          label="Baru"
          value={batch?.new_rows || 0}
          icon={<Plus className="w-4 h-4" />}
          active={filter === "new"}
          onClick={() => handleStatusFilterChange("new")}
        />
        <SummaryCard
          label="Update"
          value={batch?.updated_rows || 0}
          icon={<RefreshCw className="w-4 h-4" />}
          active={filter === "updated"}
          onClick={() => handleStatusFilterChange("updated")}
        />
        <SummaryCard
          label="Tidak Berubah"
          value={batch?.unchanged_rows || 0}
          icon={<Minus className="w-4 h-4" />}
          active={filter === "unchanged"}
          onClick={() => handleStatusFilterChange("unchanged")}
        />
      </div>

      {/* Identity Filters */}
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">
              Kode Barang
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
              <Input
                aria-label="Kode Barang"
                value={identityFilters.kode_barang}
                onChange={(event) => handleIdentityFilterChange("kode_barang", event.target.value)}
                placeholder="Cari kode barang..."
                className="h-10 pl-9 rounded-lg bg-[var(--ds-surface-muted)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg)]"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">
              NUP
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
              <Input
                aria-label="NUP"
                value={identityFilters.nup}
                onChange={(event) => handleIdentityFilterChange("nup", event.target.value)}
                placeholder="Cari NUP..."
                className="h-10 pl-9 rounded-lg bg-[var(--ds-surface-muted)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg)]"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">
              Nama / Merk Barang
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
              <Input
                aria-label="Nama atau Merk Barang"
                value={identityFilters.nama_barang}
                onChange={(event) => handleIdentityFilterChange("nama_barang", event.target.value)}
                placeholder="Cari nama barang, merk, atau tipe..."
                className="h-10 pl-9 rounded-lg bg-[var(--ds-surface-muted)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg)]"
              />
            </div>
          </div>
          <div className="min-w-0 lg:w-64">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">
              Tampilkan per Kolom
            </label>
            <select
              aria-label="Tampilkan per Kolom"
              value={changedFieldFilter}
              onChange={(event) => handleChangedFieldFilterChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] px-3 text-sm text-[var(--ds-fg)]"
            >
              <option value="">Semua kolom</option>
              <option value="__selected__">Hanya baris yang dicentang</option>
              {fieldSummary.map((item) => (
                <option key={item.field} value={item.field}>
                  {FIELD_LABELS[item.field] || item.field} ({item.selected}/{item.total})
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!hasAnyFilter}
            onClick={() => {
              setPage(1);
              setIdentityFilters({ kode_barang: "", nup: "", nama_barang: "" });
              setChangedFieldFilter("");
            }}
            className="h-10 shrink-0 rounded-lg border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-secondary)]"
          >
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Selection Toolbar */}
      {canWrite && isPending && (filteredNewTotal > 0 || selectionSummary.filtered_updated > 0) && (
        <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl px-4 py-3 shadow-xs space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-sm text-[var(--ds-fg-secondary)] tabular-nums">
              Dipilih: <strong className="text-[var(--ds-fg)]">{selectionSummary.selected_new}</strong> baru, <strong className="text-[var(--ds-fg)]">{selectionSummary.selected_updated}</strong> update
              {pendingToggleCount > 0 && (
                <span className="ml-2 text-xs text-[var(--ds-fg-muted)]">(Menyimpan...)</span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isFetching || bulkAction !== null}
                onClick={() => handleBulkSelection("select_changed")}
                variant="outline"
                className="h-8 rounded-lg tabular-nums"
              >
                {bulkAction === "select_changed" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Pilih semua ({filteredNewTotal + selectionSummary.filtered_updated})
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isFetching || bulkAction !== null || filteredNewTotal === 0}
                onClick={() => handleBulkSelection("select_new_only")}
                className="h-8 rounded-lg bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)] tabular-nums"
              >
                {bulkAction === "select_new_only" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Pilih hanya aset baru ({filteredNewTotal})
              </Button>
            </div>
          </div>

          {selectionSummary.filtered_updated > 0 && fieldSummary.length > 0 && (
            <div className="pt-3 border-t border-slate-200/70 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">
                  Centang massal kolom update {hasIdentityFilters ? "(sesuai filter)" : ""}:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isFetching || bulkAction !== null || isApproving || isRejecting}
                    onClick={() => handleBulkSelection("select_updated")}
                    className="h-7 rounded-lg px-2.5 text-xs"
                  >
                    {bulkAction === "select_updated" ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    )}
                    Centang semua kolom
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isFetching || bulkAction !== null || isApproving || isRejecting || checkedFieldCount === 0}
                    onClick={() => handleBulkSelection("clear_updated")}
                    className="h-7 rounded-lg px-2.5 text-xs"
                  >
                    {bulkAction === "clear_updated" ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="mr-1 h-3.5 w-3.5" />
                    )}
                    Lepas semua kolom
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowCheckedFieldsOnly((v) => !v)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer tabular-nums",
                      showCheckedFieldsOnly
                        ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                        : "border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-secondary)] hover:border-[var(--ds-accent-soft-border)]"
                    )}
                  >
                    Hanya yg dicentang ({checkedFieldCount})
                  </button>
                  {visibleBulkFields.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setShowAllBulkFields((v) => !v)}
                      className="text-xs font-medium text-[var(--ds-accent-fg)] hover:underline cursor-pointer tabular-nums"
                    >
                      {showAllBulkFields ? "Tampilkan lebih sedikit" : `Tampilkan semua (${visibleBulkFields.length} kolom)`}
                    </button>
                  )}
                </div>
              </div>
              {displayedBulkFields.length === 0 ? (
                <p className="text-xs text-[var(--ds-fg-muted)]">Belum ada kolom update yang dicentang.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {displayedBulkFields.map((item) => {
                    const isAll = item.selected >= item.total && item.total > 0;
                    const isPartial = item.selected > 0 && item.selected < item.total;
                    const nextAction = isAll ? "clear_field" : "select_field";
                    const isBusy = bulkAction === `${nextAction}:${item.field}`;

                    return (
                      <button
                        key={item.field}
                        type="button"
                        role="checkbox"
                        aria-checked={isAll ? true : isPartial ? "mixed" : false}
                        disabled={bulkAction !== null || isApproving || isRejecting}
                        onClick={() => handleBulkSelection(nextAction, item.field)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tabular-nums",
                          isAll
                            ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                            : isPartial
                            ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]"
                            : "border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)] hover:border-[var(--ds-accent-soft-border)]"
                        )}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                              isAll || isPartial
                                ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                                : "border-slate-300 dark:border-zinc-600 bg-[var(--ds-surface)]"
                            )}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isAll ? (
                              <Check className="h-3 w-3" />
                            ) : isPartial ? (
                              <Minus className="h-3 w-3" />
                            ) : null}
                          </span>
                          <span className="truncate">{FIELD_LABELS[item.field] || item.field}</span>
                        </span>
                        <span className="shrink-0 text-[11px] opacity-75">
                          ({item.selected}/{item.total})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rows Table */}
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className={`${rows.length > 0 ? "bmn-wide-table" : ""} w-full text-sm`}>
            <thead className="bg-slate-50/70 dark:bg-zinc-800/30 border-b border-slate-200/70 dark:border-zinc-800">
              <tr>
                {canWrite && isPending && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      aria-label="Pilih semua perubahan sesuai filter"
                      checked={(() => {
                        const changed = rows.filter((r) => r.diff_status === "new" || r.diff_status === "updated");
                        const selected = changed.filter((r) => r.selected);
                        if (changed.length === 0) return false;
                        if (selected.length === changed.length) return true;
                        if (selected.length > 0) return "indeterminate" as const;
                        return false;
                      })()}
                      disabled={bulkAction !== null || isApproving || isRejecting}
                      onCheckedChange={(checked) => {
                        handleBulkSelection(checked ? "select_changed" : "clear_changed");
                      }}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-semibold text-[var(--ds-fg-secondary)]">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--ds-fg-secondary)]">Kode Barang</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--ds-fg-secondary)]">NUP</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--ds-fg-secondary)]">Nama Barang</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--ds-fg-secondary)]">Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canWrite && isPending ? 6 : 5} className="px-4 py-12 text-center text-[var(--ds-fg-muted)]">
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelectableRow = row.diff_status === "new" || row.diff_status === "updated";
                  const isSelected = isSelectableRow && row.selected;
                  const isSelectionDisabled = bulkAction !== null || isApproving || isRejecting;
                  const namaBarang = String(row.imported_data.nama_barang || "");
                  const rawMerkTipe = String(
                    row.imported_data.merk_tipe ||
                      row.imported_data.merk ||
                      row.imported_data.tipe ||
                      ""
                  ).trim();
                  const merkTipePreview = deduplicateMerkTipe(rawMerkTipe || null);
                  const showMerkSubtitle =
                    merkTipePreview !== "-" &&
                    merkTipePreview.toLowerCase() !== namaBarang.trim().toLowerCase();

                  return (
                    <tr
                      key={row.id}
                      aria-selected={isSelected}
                      className="bmn-table-row"
                    >
                    {canWrite && isPending && (
                      <td className="px-4 py-3">
                        {isSelectableRow && (
                          <Checkbox
                            aria-label={`Pilih ${namaBarang} NUP ${String(row.imported_data.nup)}`}
                            checked={isSelected}
                            disabled={isSelectionDisabled}
                            onCheckedChange={(checked) => handleToggleRow(row.id, !!checked)}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <DiffStatusBadge status={row.diff_status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ds-fg-secondary)] tabular-nums">
                      {row.imported_data.kode_barang as string}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ds-fg-secondary)] tabular-nums">
                      {row.imported_data.nup as string}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="text-[var(--ds-fg)] font-medium truncate" title={namaBarang}>
                        {namaBarang}
                      </div>
                      {showMerkSubtitle && (
                        <div className="text-xs text-[var(--ds-fg-muted)] truncate mt-0.5" title={merkTipePreview}>
                          {merkTipePreview}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.diff_status === "new" && (
                        <span className="text-xs text-[var(--ds-accent-fg)] font-medium">Aset baru akan ditambahkan</span>
                      )}
                      {row.diff_status === "unchanged" && (
                        <span className="text-xs text-[var(--ds-fg-muted)]">Tidak ada perubahan</span>
                      )}
                      {row.diff_status === "updated" && row.changed_fields && (
                        <DiffFields
                          fields={row.changed_fields}
                          rowId={row.id}
                          focusField={changedFieldFilter || undefined}
                          isPending={canWrite && isPending}
                          isDisabled={isSelectionDisabled}
                          onToggleField={handleToggleField}
                        />
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rowsPagination && rowsPagination.last_page > 1 && (
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-4 py-3 text-sm text-[var(--ds-fg-secondary)] shadow-xs md:flex-row md:items-center md:justify-between">
          <span className="tabular-nums">
            Menampilkan {rowsPagination.from || 0}-{rowsPagination.to || 0} dari {rowsPagination.total} baris hasil filter
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={isFetching || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
              Halaman {rowsPagination.current_page} / {rowsPagination.last_page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={isFetching || page >= rowsPagination.last_page}
              onClick={() => setPage((current) => Math.min(rowsPagination.last_page, current + 1))}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new":
      return (
        <Badge data-status="success" className="text-xs rounded-full">
          <Plus className="w-3 h-3 mr-1" /> Baru
        </Badge>
      );
    case "updated":
      return (
        <Badge data-status="info" className="text-xs rounded-full">
          <RefreshCw className="w-3 h-3 mr-1" /> Update
        </Badge>
      );
    case "unchanged":
      return (
        <Badge data-status="neutral" className="text-xs rounded-full">
          <Minus className="w-3 h-3 mr-1" /> Sama
        </Badge>
      );
    default:
      return null;
  }
}

const DiffFields = React.memo(function DiffFields({
  fields,
  rowId,
  focusField,
  isPending,
  isDisabled,
  onToggleField,
}: {
  fields: Record<string, ChangedField>;
  rowId: string;
  focusField?: string;
  isPending: boolean;
  isDisabled: boolean;
  onToggleField: (rowId: string, field: string, selected: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(fields);
  const orderedEntries = !focusField
    ? entries
    : focusField === "__selected__"
    ? [
        ...entries.filter(([, values]) => values.selected !== false),
        ...entries.filter(([, values]) => values.selected === false),
      ]
    : [
        ...entries.filter(([field]) => field === focusField),
        ...entries.filter(([field]) => field !== focusField),
      ];
  const visible = expanded ? orderedEntries : orderedEntries.slice(0, 4);
  const remaining = orderedEntries.length - 4;
  const selectedCount = entries.filter(([, values]) => values.selected !== false).length;

  return (
    <div className="space-y-2">
      {isPending && (
        <div className="mb-1 text-xs font-medium text-[var(--ds-fg-muted)] tabular-nums">
          Kolom disetujui: <span className="text-[var(--ds-fg-secondary)]">{selectedCount}</span>/{entries.length}
        </div>
      )}
      {visible.map(([field, values]) => (
        <div
          key={field}
          className={cn(
            "flex items-center gap-2 text-xs",
            values.selected === false && "text-[var(--ds-fg-muted)]"
          )}
        >
          {isPending && (
            <Checkbox
              aria-label={`Setujui kolom ${FIELD_LABELS[field] || field}`}
              checked={values.selected !== false}
              disabled={isDisabled}
              onCheckedChange={(checked) => onToggleField(rowId, field, checked === true)}
              className="size-4 shrink-0"
            />
          )}
          <span
            className={cn(
              "min-w-[100px] font-medium",
              focusField && focusField === field
                ? "font-semibold text-[var(--ds-fg)]"
                : "text-[var(--ds-fg-muted)]"
            )}
          >
            {FIELD_LABELS[field] || field}:
          </span>
          <span className="text-[var(--ds-status-danger-fg)] line-through truncate max-w-[120px]">
            {values.old != null && values.old !== "" ? String(values.old) : "—"}
          </span>
          <span className="text-[var(--ds-fg-muted)]">→</span>
          <span className="text-[var(--ds-accent-fg)] font-medium truncate max-w-[120px]">
            {values.new != null && values.new !== "" ? String(values.new) : "—"}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[var(--ds-status-info-fg)] hover:text-[var(--ds-status-info-fg)] font-medium mt-1 cursor-pointer tabular-nums"
        >
          {expanded ? "Sembunyikan perubahan lainnya" : `+${remaining} perubahan lainnya`}
        </button>
      )}
    </div>
  );
});

function SummaryCard({
  label,
  value,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "p-4 rounded-3xl border shadow-xs transition-colors duration-150 ease-out text-left hover:bg-[var(--ds-accent-soft)] hover:border-[var(--ds-accent-soft-border)]",
        active
          ? "border-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
          : "border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)]"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </button>
  );
}
