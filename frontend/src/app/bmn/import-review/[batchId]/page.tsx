"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
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
import React from "react";
import { useRole } from "@/hooks/useRole";

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

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  nup_lama: "NUP Lama",
  tanggal_pengapusan: "Tanggal Penghapusan",
  foto_geotag_url: "Foto Geotag URL",
  nama_barang: "Nama Barang",
  jenis_bmn: "Jenis BMN",
  merk: "Merk",
  tipe: "Tipe",
  kondisi: "Kondisi",
  status_bmn: "Status BMN",
  nilai_perolehan: "Nilai Perolehan",
  nilai_buku: "Nilai Buku",
  nilai_penyusutan: "Nilai Penyusutan",
  nilai_mutasi: "Nilai Mutasi",
  nilai_perolehan_pertama: "Nilai Perolehan Pertama",
  no_polisi: "No Polisi",
  no_stnk: "No STNK",
  no_sertifikat: "No Sertifikat",
  nama: "Nama",
  no_dokumen: "No Dokumen",
  no_bpkp: "No BPKP",
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
  const [bulkAction, setBulkAction] = useState<"select_changed" | "clear_changed" | "select_new_only" | null>(null);
  const [fieldAction, setFieldAction] = useState<string | null>(null);

  const handleStatusFilterChange = (nextFilter: "all" | "new" | "updated" | "unchanged") => {
    setPage(1);
    setFilter(nextFilter);
  };

  const handleIdentityFilterChange = (field: keyof typeof identityFilters, value: string) => {
    setPage(1);
    setIdentityFilters((current) => ({ ...current, [field]: value }));
  };

  const { data, isLoading } = useQuery({
    queryKey: ["bmn-import-batch", batchId, filter, identityFilters, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), per_page: "200" };
      if (filter !== "all") params.status = filter;
      Object.entries(identityFilters).forEach(([key, value]) => {
        const trimmedValue = value.trim();
        if (trimmedValue) params[key] = trimmedValue;
      });
      const res = await api.get(`/bmn/import-review/${batchId}`, { params });
      return res.data;
    },
  });

  const batch: BatchInfo | null = data?.batch || null;
  const rowsPagination: RowsPagination | null = data?.rows || null;
  const rows: StagingRow[] = rowsPagination?.data || [];
  const selectionSummary: SelectionSummary = data?.selection_summary || {
    selected_total: 0,
    selected_new: 0,
    selected_updated: 0,
    filtered_new: 0,
    filtered_updated: 0,
  };

  const handleToggleRow = async (rowId: string, selected: boolean) => {
    if (!canReview) return;
    try {
      await api.post("/bmn/import-review/toggle-selection", {
        ids: [rowId],
        selected,
      });
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batch", batchId] });
    } catch {
      toast.error("Gagal mengubah seleksi.");
    }
  };

  const handleToggleField = async (rowId: string, field: string, selected: boolean) => {
    if (!canReview) return;
    const actionKey = `${rowId}:${field}`;
    setFieldAction(actionKey);
    try {
      await api.post("/bmn/import-review/toggle-field-selection", {
        row_id: rowId,
        field,
        selected,
      });
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batch", batchId] });
    } catch {
      toast.error("Gagal mengubah seleksi kolom.");
    } finally {
      setFieldAction(null);
    }
  };

  const getIdentityFilterParams = () =>
    Object.fromEntries(
      Object.entries(identityFilters)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value !== "")
    );

  const handleBulkSelection = async (action: "select_changed" | "clear_changed" | "select_new_only") => {
    if (!canReview) return;
    setBulkAction(action);
    try {
      const res = await api.post("/bmn/import-review/bulk-selection", {
        batch_id: batchId,
        action,
        ...getIdentityFilterParams(),
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
  const filteredNewTotal = selectionSummary.filtered_new;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bmn/import-review">
            <Button variant="ghost" size="sm" className="text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              {batch?.filename}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {batch?.total_rows} baris total •{" "}
              Diupload {batch?.created_at ? new Date(batch.created_at).toLocaleDateString("id-ID") : ""}
            </p>
          </div>
        </div>

        {canApprove && isPending && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReject}
              disabled={isRejecting}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {isRejecting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Tolak
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || totalActionable === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Batch ini masih menunggu review. Kamu bisa melihat detail perubahan, tetapi approval dan pengaturan seleksi hanya tersedia untuk admin.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Total"
          value={batch?.total_rows || 0}
          color="slate"
          active={filter === "all"}
          onClick={() => handleStatusFilterChange("all")}
        />
        <SummaryCard
          label="Baru"
          value={batch?.new_rows || 0}
          color="emerald"
          icon={<Plus className="w-3.5 h-3.5" />}
          active={filter === "new"}
          onClick={() => handleStatusFilterChange("new")}
        />
        <SummaryCard
          label="Update"
          value={batch?.updated_rows || 0}
          color="blue"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          active={filter === "updated"}
          onClick={() => handleStatusFilterChange("updated")}
        />
        <SummaryCard
          label="Tidak Berubah"
          value={batch?.unchanged_rows || 0}
          color="slate"
          icon={<Minus className="w-3.5 h-3.5" />}
          active={filter === "unchanged"}
          onClick={() => handleStatusFilterChange("unchanged")}
        />
      </div>

      {/* Identity Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Kode Barang
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={identityFilters.kode_barang}
                onChange={(event) => handleIdentityFilterChange("kode_barang", event.target.value)}
                placeholder="Cari kode barang..."
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              NUP
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={identityFilters.nup}
                onChange={(event) => handleIdentityFilterChange("nup", event.target.value)}
                placeholder="Cari NUP..."
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Nama Barang
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={identityFilters.nama_barang}
                onChange={(event) => handleIdentityFilterChange("nama_barang", event.target.value)}
                placeholder="Cari nama barang..."
                className="h-10 pl-9"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!hasIdentityFilters}
            onClick={() => {
              setPage(1);
              setIdentityFilters({ kode_barang: "", nup: "", nama_barang: "" });
            }}
            className="h-10 shrink-0"
          >
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Selection Toolbar */}
      {canWrite && isPending && (filteredNewTotal > 0 || selectionSummary.filtered_updated > 0) && (
        <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <span className="text-sm text-slate-600">
            Dipilih: <strong>{selectionSummary.selected_new}</strong> baru, <strong>{selectionSummary.selected_updated}</strong> update
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={bulkAction !== null}
              onClick={() => handleBulkSelection("select_changed")}
              className="h-8 bg-slate-700 text-white hover:bg-slate-800"
            >
              {bulkAction === "select_changed" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
              Pilih semua ({filteredNewTotal + selectionSummary.filtered_updated})
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={bulkAction !== null || filteredNewTotal === 0}
              onClick={() => handleBulkSelection("select_new_only")}
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {bulkAction === "select_new_only" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              Pilih hanya aset baru ({filteredNewTotal})
            </Button>
          </div>
        </div>
      )}

      {/* Rows Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {canWrite && isPending && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={(() => {
                        const changed = rows.filter((r) => r.diff_status === "new" || r.diff_status === "updated");
                        const selected = changed.filter((r) => r.selected);
                        if (changed.length === 0) return false;
                        if (selected.length === changed.length) return true;
                        if (selected.length > 0) return "indeterminate" as const;
                        return false;
                      })()}
                      disabled={bulkAction !== null}
                      onCheckedChange={(checked) => {
                        handleBulkSelection(checked ? "select_changed" : "clear_changed");
                      }}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Kode Barang</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">NUP</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nama Barang</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canWrite && isPending ? 6 : 5} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelectableRow = row.diff_status === "new" || row.diff_status === "updated";
                  const isSelected = isSelectableRow && row.selected;

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        row.diff_status === "new" && "bg-emerald-50/30",
                        row.diff_status === "updated" && "bg-blue-50/30",
                        isSelectableRow && !isSelected && "opacity-60"
                      )}
                    >
                    {canWrite && isPending && (
                      <td className="px-4 py-3">
                        {isSelectableRow && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleToggleRow(row.id, !!checked)}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <DiffStatusBadge status={row.diff_status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.imported_data.kode_barang as string}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.imported_data.nup as string}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">
                      {row.imported_data.nama_barang as string}
                    </td>
                    <td className="px-4 py-3">
                      {row.diff_status === "new" && (
                        <span className="text-xs text-emerald-600 font-medium">Aset baru akan ditambahkan</span>
                      )}
                      {row.diff_status === "unchanged" && (
                        <span className="text-xs text-slate-400">Tidak ada perubahan</span>
                      )}
                      {row.diff_status === "updated" && row.changed_fields && (
                        <DiffFields
                          fields={row.changed_fields}
                          rowId={row.id}
                          isPending={canWrite && isPending}
                          fieldAction={fieldAction}
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
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>
            Menampilkan {rowsPagination.from || 0}-{rowsPagination.to || 0} dari {rowsPagination.total} baris hasil filter
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-xs text-slate-500">
              Halaman {rowsPagination.current_page} / {rowsPagination.last_page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= rowsPagination.last_page}
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
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
          <Plus className="w-3 h-3 mr-0.5" /> Baru
        </Badge>
      );
    case "updated":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
          <RefreshCw className="w-3 h-3 mr-0.5" /> Update
        </Badge>
      );
    case "unchanged":
      return (
        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
          <Minus className="w-3 h-3 mr-0.5" /> Sama
        </Badge>
      );
    default:
      return null;
  }
}

function DiffFields({
  fields,
  rowId,
  isPending,
  fieldAction,
  onToggleField,
}: {
  fields: Record<string, ChangedField>;
  rowId: string;
  isPending: boolean;
  fieldAction: string | null;
  onToggleField: (rowId: string, field: string, selected: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(fields);
  const visible = expanded ? entries : entries.slice(0, 4);
  const remaining = entries.length - 4;
  const selectedCount = entries.filter(([, values]) => values.selected !== false).length;

  return (
    <div className="space-y-1.5">
      {isPending && (
        <div className="mb-1 text-[10px] font-medium text-slate-500">
          Kolom disetujui: <span className="text-slate-700">{selectedCount}</span>/{entries.length}
        </div>
      )}
      {visible.map(([field, values]) => (
        <div
          key={field}
          className={cn(
            "flex items-center gap-2 text-xs",
            values.selected === false && "opacity-50"
          )}
        >
          {isPending && (
            <Checkbox
              checked={values.selected !== false}
              disabled={fieldAction === `${rowId}:${field}`}
              onCheckedChange={(checked) => onToggleField(rowId, field, checked === true)}
              className="size-3.5 shrink-0"
            />
          )}
          <span className="text-slate-500 font-medium min-w-[100px]">
            {FIELD_LABELS[field] || field}:
          </span>
          <span className="text-red-500 line-through truncate max-w-[120px]">
            {values.old != null && values.old !== "" ? String(values.old) : "—"}
          </span>
          <span className="text-slate-400">→</span>
          <span className="text-emerald-600 font-medium truncate max-w-[120px]">
            {values.new != null && values.new !== "" ? String(values.new) : "—"}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium mt-1 cursor-pointer"
        >
          {expanded ? "▲ Sembunyikan" : `▼ +${remaining} perubahan lainnya`}
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
    blue: "border-blue-300 bg-blue-50 text-blue-700",
    slate: "border-slate-300 bg-slate-50 text-slate-700",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border-2 transition-all text-left",
        active ? colorMap[color] : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </button>
  );
}
