"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Package,
    Activity,
    AlertTriangle,
    ArrowRight,
    Loader2,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function InventoryDashboard() {
    const {
        data: stats,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["inventory-stats"],
        queryFn: async () => {
            const res = await api.get("/inventory/dashboard/stats");
            return res.data.data;
        },
    });

    if (isLoading) {
        return (
            <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center text-emerald-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="text-zinc-400 font-medium">
                    Menyinkronkan Data Logistik BKSDA...
                </p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400">
                    Gagal menarik data dari server. Pastikan Anda telah melakukan Login
                    ulang.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Kop Judul */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Pusat Logistik
                </h1>
                <p className="text-zinc-400 mt-2">
                    Ringkasan pergerakan aset persediaan dan peringatan keamanan stok.
                </p>
            </div>

            {/* Papan Indikator (Stat Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">
                                Total Master Katalog
                            </p>
                            <h3 className="text-4xl font-bold text-white">
                                {stats?.total_items || 0}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Package className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <Link
                        href="/inventory/items"
                        className="mt-6 flex items-center gap-2 text-sm text-blue-400 font-semibold hover:text-blue-300 transition-colors w-max relative z-10"
                    >
                        Kelola Katalog <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">
                                Mutasi Aktif Bulan Ini
                            </p>
                            <h3 className="text-4xl font-bold text-white">
                                {stats?.mutasi_bulan_ini || 0}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Activity className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <Link
                        href="/inventory/transactions"
                        className="mt-6 flex items-center gap-2 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors w-max relative z-10"
                    >
                        Lihat Jejak Rekam <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Panel Peringatan Krisis Stok */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                        Krisis Stok
                    </h2>
                </div>

                <div className="p-6">
                    {!stats?.krisis_stok || stats.krisis_stok.length === 0 ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                            <h3 className="text-emerald-400 font-bold text-lg">
                                Semua Stok Aman
                            </h3>
                            <p className="text-emerald-500/80 text-sm mt-1">
                                Belum ada barang di jaringan kantor yang jatuh melewati batas
                                kuantitas peringatan minimum.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-800/50">
                            {stats.krisis_stok.map((item: { id: string; nama_barang: string; kode_barang: string; satuan: string; total_fisik?: number; min_stock: number }) => (
                                <li
                                    key={item.id}
                                    className="py-4 flex justify-between items-center group"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-lg group-hover:text-red-400 transition-colors">
                                            {item.nama_barang}
                                        </span>
                                        <span className="text-zinc-500 text-sm font-mono mt-1">
                                            Kode: {item.kode_barang}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <span className="text-red-500 font-black text-2xl">
                                            {item.total_fisik || 0}{" "}
                                            <span className="text-sm font-normal text-red-400/70">
                                                {item.satuan}
                                            </span>
                                        </span>
                                        <span className="text-zinc-500 text-xs mt-1">
                                            Batas Minimum: {item.min_stock}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
