"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Search, Plus, Loader2, Eye, Trash2, Package, Download } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { AssetImportDialog } from "@/app/bmn/_components/AssetImportDialog";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

interface IAsset {
  id: string;
  kode_barang: string;
  nup: string;
  nama_barang: string;
  merk_tipe?: string;
  tahun_perolehan?: number;
  kondisi: string;
  nilai_perolehan: number;
  lokasi_spesifik?: string;
  penanggung_jawab?: { nama_lengkap: string };
}

interface IResponse { data: IAsset[]; last_page: number; total?: number }

const KONDISI_OPTIONS = ["Semua", "Baik", "Rusak Ringan", "Rusak Berat"];

export default function BmnAssetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [kondisiFilter, setKondisiFilter] = useState("Semua");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const { canWrite } = useRole();

  const { data: response, isLoading, isFetching } = useQuery<IResponse>({
    queryKey: ["bmn-assets", debouncedSearch, page, kondisiFilter],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { page };
      if (debouncedSearch) params.search = debouncedSearch;
      if (kondisiFilter !== "Semua") params.kondisi = kondisiFilter;
      const res = await api.get("/bmn/assets", { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const handleExport = async () => {
    try {
      const res = await api.get("/bmn/assets/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Katalog_Aset_BMN.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Export berhasil!");
    } catch { toast.error("Gagal export data."); }
  };

  const handleDispose = async (id: string) => {
    if (!confirm("Yakin ingin menghapus/dispose aset ini?")) return;
    try {
      await api.delete(`/bmn/assets/${id}/dispose`);
      toast.success("Aset berhasil di-dispose.");
    } catch { toast.error("Gagal dispose aset."); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Aset</h1>
          <p className="text-sm text-slate-500 mt-0.5">Katalog seluruh Barang Milik Negara.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          {canWrite && (
            <>
              <AssetImportDialog onImportSuccess={() => setPage(1)} />
              <Link href="/bmn/assets/create">
                <Button size="sm" className="rounded-xl gap-2 text-xs bg-emerald-600 hover:bg-emerald-500">
                  <Plus className="w-3.5 h-3.5" /> Tambah Aset
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, NUP..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1">
          {KONDISI_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setKondisiFilter(opt); setPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                kondisiFilter === opt ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden relative">
        {isFetching && !isLoading && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-100 overflow-hidden z-10">
            <div className="h-full bg-emerald-500 animate-pulse w-1/3 rounded-r-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kode / NUP</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Barang</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kondisi</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Nilai Perolehan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lokasi</th>
                {canWrite && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" /><p className="text-sm text-slate-400">Memuat data...</p></td></tr>
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">Tidak ada data ditemukan</p></td></tr>
              ) : (
                response?.data?.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono font-bold text-emerald-700">{asset.kode_barang}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NUP: {asset.nup}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 max-w-[200px] truncate">{asset.nama_barang}</p>
                      <p className="text-[11px] text-slate-400">{asset.merk_tipe || "-"} • {asset.tahun_perolehan || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold",
                        asset.kondisi === "Baik" ? "bg-emerald-50 text-emerald-700" :
                        asset.kondisi === "Rusak Ringan" ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      )}>{asset.kondisi}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-slate-800">{formatRupiah(asset.nilai_perolehan)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500 max-w-[120px] truncate">{asset.lokasi_spesifik || "Gudang Utama"}</p>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/bmn/assets/${asset.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye className="w-4 h-4" /></Link>
                          <button onClick={() => handleDispose(asset.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-slate-400 text-xs">{response?.data?.length || 0} item ditampilkan</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg">Prev</Button>
            <Button variant="outline" size="sm" disabled={page === response?.last_page} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
