"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trash2, Loader2, AlertTriangle, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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

interface IResponse {
    data: IDisposedAsset[];
    last_page: number;
}

export default function BmnDisposalLogsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(searchTerm, 500);

    const { data: response, isLoading } = useQuery<IResponse>({
        queryKey: ["bmn-assets-disposed", debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get("/bmn/assets", {
                params: { status: "disposed", search: debouncedSearch || undefined, page },
            });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-red-500 tracking-tight flex items-center gap-3">
                        <Trash2 className="w-8 h-8" /> Arsip Karantina & Pemutihan
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Daftar abadi barang negara yang telah dilelang, musnah, atau diputihkan secara legal.</p>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                    <input
                        type="text" placeholder="Cari aset hantu..." value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="pl-10 pr-4 py-2 bg-red-950/20 border border-red-900/50 rounded-xl text-sm text-red-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all w-64 placeholder:text-red-900"
                    />
                </div>
            </div>

            <div className="bg-zinc-950/80 border border-red-900/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-red-950/40 border-b border-red-900/50">
                                <th className="p-4 text-xs font-bold text-red-400/80 uppercase">Tgl Pemutihan</th>
                                <th className="p-4 text-xs font-bold text-red-400/80 uppercase">Identitas BMN</th>
                                <th className="p-4 text-xs font-bold text-red-400/80 uppercase text-right">Valuasi Terakhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-950/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-red-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membangkitkan Arsip Hantu...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-red-500/50">
                                        <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
                                        Belum ada aset negara yang dimusnahkan.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-red-950/20 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-red-300 text-sm">{new Date(asset.deleted_at).toLocaleDateString("id-ID")}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-300 text-sm max-w-[300px] truncate">{asset.nama_barang}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-mono text-zinc-500">{asset.kode_barang}</span>
                                                <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-mono uppercase border border-red-900/50">NUP: {asset.nup}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-mono text-sm font-black text-red-400">{formatRupiah(asset.nilai_buku || asset.nilai_perolehan)}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-950 border-t border-red-900/30 flex items-center justify-between text-sm">
                    <span className="text-red-500/60 font-medium">Menampilkan {response?.data?.length || 0} aset musnah.</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={page === response?.last_page || !response} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
