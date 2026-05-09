"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Wrench, Loader2, Calendar, FileText } from "lucide-react";

const formatRupiah = (angka: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

interface IMaintenance {
    id: string;
    tanggal_service: string;
    deskripsi: string;
    biaya: number;
    kondisi_baru?: string;
    asset?: { nama_barang: string; kode_barang: string };
}

interface IResponse {
    data: IMaintenance[];
    last_page: number;
}

export default function BmnMaintenanceLogsPage() {
    const [page, setPage] = useState(1);

    const { data: response, isLoading } = useQuery<IResponse>({
        queryKey: ["bmn-maintenances", page],
        queryFn: async () => {
            const res = await api.get("/bmn/maintenances", { params: { page } });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Wrench className="w-8 h-8 text-blue-500" /> Riwayat Bengkel & Servis
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">Rekam jejak aliran dana pemeliharaan aset BKSDA yang tak dapat dimanipulasi.</p>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Tgl Nota & Aset</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Deskripsi Perbaikan</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-right">Tagihan (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-blue-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membongkar Brankas Nota...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-zinc-500">
                                        <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                                        Belum ada riwayat perbaikan di database.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> {log.tanggal_service}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">{log.asset?.nama_barang || "Aset Terhapus"}</p>
                                            <p className="text-[10px] text-zinc-600 font-mono">{log.asset?.kode_barang}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-zinc-300 max-w-sm truncate">{log.deskripsi}</p>
                                            {log.kondisi_baru && (
                                                <span className="inline-block mt-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">
                                                    Status Pulih → {log.kondisi_baru}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-mono text-sm font-black text-blue-400">{formatRupiah(log.biaya)}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Menampilkan {response?.data?.length || 0} riwayat perbaikan.</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={page === response?.last_page || !response} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
