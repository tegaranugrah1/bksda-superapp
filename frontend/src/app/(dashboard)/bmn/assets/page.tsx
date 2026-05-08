"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Search, Plus, CarFront, Loader2, MapPin, User, Pencil, Eye, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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

interface IResponse {
    data: IAsset[];
    last_page: number;
}

export default function BmnAssetsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(searchTerm, 500);

    const { data: response, isLoading, isFetching } = useQuery<IResponse>({
        queryKey: ["bmn-assets", debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get("/bmn/assets", {
                params: { search: debouncedSearch || undefined, page },
            });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <CarFront className="w-8 h-8 text-emerald-500" /> Katalog Master Aset
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Pusat kontrol wujud fisik dan nilai finansial seluruh Barang Milik Negara.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari nama, NUP, kode..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-64"
                        />
                    </div>
                    <Link href="/bmn/assets/create" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                        <Plus className="w-4 h-4" /> Registrasi Aset
                    </Link>
                </div>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative backdrop-blur-sm">
                {isFetching && !isLoading && (
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-zinc-800 overflow-hidden z-10">
                        <div className="h-full bg-emerald-500 animate-pulse w-1/3 rounded-r-full shadow-[0_0_10px_#10b981]"></div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Identitas BMN (Kode &amp; NUP)</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Spesifikasi Barang</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Valuasi &amp; Kondisi</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status &amp; Lokasi</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-emerald-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membongkar Brankas Data...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-zinc-500">
                                        <div className="bg-zinc-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-6 h-6 text-zinc-600" />
                                        </div>
                                        Tidak ditemukan aset yang cocok dengan pencarian.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-zinc-900/40 transition-colors group">
                                        <td className="p-4">
                                            <p className="font-mono text-sm font-bold text-emerald-400">{asset.kode_barang}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase border border-zinc-700">NUP</span>
                                                <span className="text-xs font-mono text-zinc-300">{asset.nup}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-100 text-sm max-w-[250px] truncate">{asset.nama_barang}</p>
                                            <p className="text-xs text-zinc-500 truncate">{asset.merk_tipe || "Tanpa Merk"} &bull; {asset.tahun_perolehan}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-black text-sm text-zinc-200">{formatRupiah(asset.nilai_perolehan)}</p>
                                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                asset.kondisi === "Baik" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                asset.kondisi === "Rusak Berat" ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" :
                                                "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                            }`}>
                                                {asset.kondisi}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                                                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                                                <span className="truncate max-w-[150px]">{asset.lokasi_spesifik || "Gudang Utama"}</span>
                                            </div>
                                            {asset.penanggung_jawab ? (
                                                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded w-fit border border-blue-500/20">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span className="font-semibold">{asset.penanggung_jawab.nama_lengkap}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-zinc-600 italic">Tersedia / Tidak dipinjam</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors" title="Detail"><Eye className="w-4 h-4" /></button>
                                                <button className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors border border-blue-500/20" title="Edit"><Pencil className="w-4 h-4" /></button>
                                                <button className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors border border-red-500/20" title="Pemutihan"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Menampilkan {response?.data?.length || 0} entitas</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors">Sebelumnya</button>
                        <button disabled={page === response?.last_page || !response} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors">Selanjutnya</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
