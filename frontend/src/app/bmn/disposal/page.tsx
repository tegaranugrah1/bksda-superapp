"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trash2, Loader2, Search, Package } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";

const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

interface IDisposedAsset {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  nilai_buku: number;
  nilai_perolehan: number;
  deleted_at: string;
}

interface IResponse { data: IDisposedAsset[]; last_page: number }

export default function BmnDisposalPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data: response, isLoading } = useQuery<IResponse>({
    queryKey: ["bmn-assets-disposed", debouncedSearch, page],
    queryFn: async () => {
      const res = await api.get("/bmn/assets", { params: { status: "disposed", search: debouncedSearch || undefined, page } });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-500" /> Aset Dihapus
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Daftar aset yang telah di-dispose atau dimusnahkan.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Cari aset..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 w-56"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Tgl Penghapusan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Identitas BMN</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto mb-2" /><p className="text-sm text-slate-400">Memuat...</p></td></tr>
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={3} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">Tidak ada aset yang dihapus.</p></td></tr>
              ) : (
                response?.data?.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{new Date(asset.deleted_at).toLocaleDateString("id-ID")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 max-w-[250px] truncate">{asset.nama_barang}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{asset.kode_barang}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">NUP: {asset.nup}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-slate-800">{formatRupiah(asset.nilai_buku || asset.nilai_perolehan)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{response?.data?.length || 0} item</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg">Prev</Button>
            <Button variant="outline" size="sm" disabled={page === response?.last_page} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
