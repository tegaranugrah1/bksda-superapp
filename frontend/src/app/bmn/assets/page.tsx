"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialPerPage = Number(searchParams.get("per_page")) || 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPageState] = useState(initialPage);
  const [perPage, setPerPageState] = useState(initialPerPage);
  const [kondisiFilter, setKondisiFilter] = useState("Semua");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(searchTerm, 400);
  const { canWrite } = useRole();
  const queryClient = useQueryClient();

  const setPage = (p: number | ((prev: number) => number)) => {
    const newPage = typeof p === "function" ? p(page) : p;
    setPageState(newPage);
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    params.set("per_page", String(perPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const setPerPage = (pp: number) => {
    setPerPageState(pp);
    setPageState(1);
    const params = new URLSearchParams(window.location.search);
    params.set("page", "1");
    params.set("per_page", String(pp));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const { data: response, isLoading, isFetching } = useQuery<IResponse>({
    queryKey: ["bmn-assets", debouncedSearch, page, perPage, kondisiFilter],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { page, per_page: perPage === 0 ? 9999 : perPage };
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
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch { toast.error("Gagal dispose aset."); }
  };

  const handleBulkDispose = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.size} aset yang dipilih?`)) return;
    try {
      await api.post("/bmn/assets/bulk-dispose", { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} aset berhasil di-dispose.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch { toast.error("Gagal bulk dispose."); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!response?.data) return;
    const allIds = response.data.map(a => a.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const allSelected = response?.data ? response.data.length > 0 && response.data.every(a => selectedIds.has(a.id)) : false;

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
              <AssetImportDialog onImportSuccess={() => { setPage(1); queryClient.invalidateQueries({ queryKey: ["bmn-assets"] }); }} />
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

      {/* Bulk Action Bar */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm font-semibold text-red-700">{selectedIds.size} aset dipilih</span>
          <Button size="sm" variant="destructive" className="rounded-lg gap-1 text-xs" onClick={handleBulkDispose}>
            <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setSelectedIds(new Set())}>Batal</Button>
        </div>
      )}

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
                {canWrite && (
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                )}
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
                <tr><td colSpan={canWrite ? 7 : 5} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" /><p className="text-sm text-slate-400">Memuat data...</p></td></tr>
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={canWrite ? 7 : 5} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">Tidak ada data ditemukan</p></td></tr>
              ) : (
                response?.data?.map((asset) => (
                  <tr key={asset.id} className={cn("hover:bg-slate-50/50 transition-colors group", selectedIds.has(asset.id) && "bg-emerald-50/30")}>
                    {canWrite && (
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      </td>
                    )}
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
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs">{response?.data?.length || 0} item ditampilkan</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); }}
              className="h-7 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
              <option value={0}>Semua</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg">Prev</Button>
            <span className="flex items-center text-xs text-slate-500 px-2">Hal {page}{response?.last_page ? ` / ${response.last_page}` : ""}</span>
            <Button variant="outline" size="sm" disabled={page === response?.last_page || perPage === 0} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
