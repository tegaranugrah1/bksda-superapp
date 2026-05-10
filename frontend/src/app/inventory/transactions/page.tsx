"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    History,
    Loader2,
    ArrowDownToLine,
    ArrowUpFromLine,
    Filter,
    Download,
} from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";

interface ITransaction {
    id: string;
    type: "in" | "out";
    quantity: number;
    remaining_stock: number;
    keterangan?: string;
    created_at: string;
    item?: { nama_barang: string; satuan: string };
    office?: { nama_kantor: string };
    user?: { name: string };
    employee?: { nama_lengkap: string };
}

interface ITransactionResponse {
    data: ITransaction[];
    current_page: number;
    last_page: number;
}

export default function TransactionsHistoryPage() {
    const [filterType, setFilterType] = useState<string>("");

    const { data: response, isLoading, isFetching } = useQuery<ITransactionResponse>({
        queryKey: ["inventory-transactions", filterType],
        queryFn: async () => {
            const res = await api.get("/inventory/transactions", {
                params: { type: filterType || undefined },
            });
            return res.data;
        },
    });

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <History className="w-8 h-8 text-emerald-500" /> Buku Riwayat
                        Mutasi
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Pencatatan utuh (Audit Trail) keluar-masuknya aset persediaan
                        negara.
                    </p>
                </div>

                {/* Tombol Filter Dinamis */}
                <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800">
                    <Filter className="w-4 h-4 text-zinc-500 ml-2" />
                    <button
                        onClick={() => setFilterType("")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            filterType === ""
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Semua
                    </button>
                    <button
                        onClick={() => setFilterType("in")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            filterType === "in"
                                ? "bg-blue-500/20 text-blue-400"
                                : "text-zinc-400 hover:text-blue-300"
                        }`}
                    >
                        Stok Masuk
                    </button>
                    <button
                        onClick={() => setFilterType("out")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            filterType === "out"
                                ? "bg-orange-500/20 text-orange-400"
                                : "text-zinc-400 hover:text-orange-300"
                        }`}
                    >
                        Distribusi Keluar
                    </button>
                    
                    <div className="w-px h-6 bg-zinc-800 mx-2 hidden md:block" />
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/inventory/export/transactions?type=${filterType}`, "_blank")}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2 font-bold px-4"
                    >
                        <Download className="w-4 h-4 text-blue-500" /> Ekspor
                    </Button>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Indikator Refetch */}
                {isFetching && !isLoading && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20 overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-pulse w-1/3 rounded-r-full"></div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-950/50 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Tgl / Waktu
                                </th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Aksi
                                </th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Barang &amp; Lokasi
                                </th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">
                                    Mutasi (Sisa)
                                </th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Keterlibatan / Aktor
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-10 text-center text-emerald-500"
                                    >
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        <span className="text-sm font-medium text-zinc-500">
                                            Membuka lembaran buku kas...
                                        </span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-10 text-center text-zinc-500"
                                    >
                                        Belum ada satupun riwayat logistik yang tercatat di
                                        arsip BKSDA.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className="hover:bg-emerald-500/5 transition-colors"
                                    >
                                        <td className="p-4">
                                            <p className="font-mono text-sm text-zinc-300">
                                                {dayjs(tx.created_at).format("DD MMM YYYY")}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {dayjs(tx.created_at).format("HH:mm:ss")} WIB
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            {tx.type === "in" ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold">
                                                    <ArrowDownToLine className="w-3 h-3" /> MASUK
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-xs font-bold">
                                                    <ArrowUpFromLine className="w-3 h-3" />{" "}
                                                    KELUAR
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200">
                                                {tx.item?.nama_barang || "Barang Dihapus"}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                di {tx.office?.nama_kantor || "Kantor Dihapus"}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p
                                                className={`font-black text-lg ${
                                                    tx.type === "in"
                                                        ? "text-blue-500"
                                                        : "text-orange-500"
                                                }`}
                                            >
                                                {tx.type === "in" ? "+" : "-"}
                                                {tx.quantity}{" "}
                                                <span className="text-xs font-normal opacity-70">
                                                    {tx.item?.satuan}
                                                </span>
                                            </p>
                                            <p className="text-[10px] font-mono text-zinc-500">
                                                Sisa: {tx.remaining_stock}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-semibold text-zinc-300">
                                                Admin:{" "}
                                                <span className="font-normal text-zinc-400">
                                                    {tx.user?.name || "Sistem"}
                                                </span>
                                            </p>
                                            {tx.type === "out" && (
                                                <p className="text-xs font-semibold text-zinc-300 mt-1">
                                                    Penerima:{" "}
                                                    <span className="font-normal text-zinc-400">
                                                        {tx.employee?.nama_lengkap || "-"}
                                                    </span>
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-950/30 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-medium">
                    Halaman {response?.current_page || 1} dari{" "}
                    {response?.last_page || 1} Total Arsip
                </div>
            </div>
        </div>
    );
}
