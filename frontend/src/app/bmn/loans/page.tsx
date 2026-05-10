"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Handshake, Loader2, Calendar, FileText } from "lucide-react";

interface ILoan {
    id: string;
    tanggal_pinjam: string;
    tanggal_kembali?: string;
    status: string;
    keterangan?: string;
    asset?: { nama_barang: string; kode_barang: string };
    borrower?: { nama_lengkap: string; nip: string };
}

interface IResponse {
    data: ILoan[];
    last_page: number;
}

export default function BmnLoansPage() {
    const [page, setPage] = useState(1);

    const { data: response, isLoading } = useQuery<IResponse>({
        queryKey: ["bmn-loans", page],
        queryFn: async () => {
            const res = await api.get("/bmn/loans", { params: { page } });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Handshake className="w-8 h-8 text-amber-500" /> Lalu Lintas Peminjaman
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">Buku riwayat serah-terima aset kepada pegawai BKSDA.</p>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Tgl Pinjam & Aset</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Pegawai Peminjam</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Status Pengembalian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-amber-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membongkar Buku Pinjaman...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-zinc-500">
                                        <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                                        Belum ada riwayat peminjaman aset.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> {loan.tanggal_pinjam}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">{loan.asset?.nama_barang || "Aset Terhapus"}</p>
                                            <p className="text-[10px] text-zinc-600 font-mono">{loan.asset?.kode_barang}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm">{loan.borrower?.nama_lengkap || "-"}</p>
                                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{loan.borrower?.nip}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${loan.status === "dikembalikan" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                                {loan.status === "dikembalikan" ? "Dikembalikan" : "Masih Dipinjam"}
                                            </span>
                                            {loan.tanggal_kembali && (
                                                <p className="text-[10px] text-zinc-500 mt-1">Kembali: {loan.tanggal_kembali}</p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Menampilkan {response?.data?.length || 0} riwayat peminjaman.</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={page === response?.last_page || !response} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
