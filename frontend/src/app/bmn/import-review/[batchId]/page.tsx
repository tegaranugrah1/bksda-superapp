"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  RefreshCw,
  Minus,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

interface ChangedField {
  old: string | number | null;
  new: string | number | null;
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

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
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
  const [filter, setFilter] = useState<"all" | "new" | "updated" | "unchanged">("all");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["bmn-import-batch", batchId, filter],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: "200" };
      if (filter !== "all") params.status = filter;
      const res = await api.get(`/bmn/import-review/${batchId}`, { params });
      return res.data;
    },
  });

  const batch: BatchInfo | null = data?.batch || null;
  const rows: StagingRow[] = data?.rows?.data || [];

  const handleToggleRow = async (rowId: string, selected: boolean) => {
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

  const handleToggleAll = async (selected: boolean) => {
    const ids = rows.filter((r) => r.diff_status !== "unchanged").map((r) => r.id);
    if (ids.length === 0) return;
    try {
      await api.post("/bmn/import-review/toggle-selection", { ids, selected });
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batch", batchId] });
    } catch {
      toast.error("Gagal mengubah seleksi.");
    }
  };

  const handleApprove = async () => {
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


  const totalActionable = (batch?.new_rows || 0) + (batch?.updated_rows || 0);
  const isPending = batch?.status === "pending";

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

        {isPending && (
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
                <><CheckCircle2 className="w-4 h-4 mr-1" />Setujui ({totalActionable} baris)</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Total"
          value={batch?.total_rows || 0}
          color="slate"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <SummaryCard
          label="Baru"
          value={batch?.new_rows || 0}
          color="emerald"
          icon={<Plus className="w-3.5 h-3.5" />}
          active={filter === "new"}
          onClick={() => setFilter("new")}
        />
        <SummaryCard
          label="Update"
          value={batch?.updated_rows || 0}
          color="blue"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          active={filter === "updated"}
          onClick={() => setFilter("updated")}
        />
        <SummaryCard
          label="Tidak Berubah"
          value={batch?.unchanged_rows || 0}
          color="slate"
          icon={<Minus className="w-3.5 h-3.5" />}
          active={filter === "unchanged"}
          onClick={() => setFilter("unchanged")}
        />
      </div>

      {/* Select All */}
      {isPending && rows.some((r) => r.diff_status !== "unchanged") && (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <Checkbox
            checked={rows.filter((r) => r.diff_status !== "unchanged").every((r) => r.selected)}
            onCheckedChange={(checked) => handleToggleAll(!!checked)}
          />
          <span className="text-sm text-slate-600">Pilih semua baris yang berubah</span>
        </div>
      )}

      {/* Rows Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {isPending && <th className="px-4 py-3 w-10"></th>}
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
                  <td colSpan={isPending ? 6 : 5} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors",
                      row.diff_status === "new" && "bg-emerald-50/30",
                      row.diff_status === "updated" && "bg-blue-50/30",
                      !row.selected && row.diff_status !== "unchanged" && "opacity-50"
                    )}
                  >
                    {isPending && (
                      <td className="px-4 py-3">
                        {row.diff_status !== "unchanged" && (
                          <Checkbox
                            checked={row.selected}
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
                        <DiffFields fields={row.changed_fields} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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

function DiffFields({ fields }: { fields: Record<string, ChangedField> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(fields);
  const visible = expanded ? entries : entries.slice(0, 4);
  const remaining = entries.length - 4;

  return (
    <div className="space-y-1">
      {visible.map(([field, values]) => (
        <div key={field} className="flex items-center gap-2 text-xs">
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
