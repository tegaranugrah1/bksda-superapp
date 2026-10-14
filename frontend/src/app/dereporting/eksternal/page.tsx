"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Globe, Search, Loader2, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface EksternalReport {
    id: string;
    nama_pelapor: string;
    instansi: string | null;
    email: string | null;
    no_hp: string | null;
    judul_laporan: string;
    deskripsi: string | null;
    status: "Menunggu Tinjauan" | "Diterima" | "Ditolak" | string;
    created_at: string;
}

interface ApiResponse {
    data: EksternalReport[];
    current_page: number;
    last_page: number;
    total: number;
    next_page_url?: string;
    prev_page_url?: string;
}

const STATUS_FILTERS = [
    { id: "", label: "Semua" },
    { id: "Menunggu Tinjauan", label: "Menunggu Tinjauan", icon: Clock },
    { id: "Diterima", label: "Diterima", icon: CheckCircle2 },
    { id: "Ditolak", label: "Ditolak", icon: XCircle },
];

export default function DeReportingEksternalPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 400);

    const { data: response, isLoading } = useQuery<ApiResponse>({
        queryKey: ["dr-eksternals", debouncedSearch, statusFilter, page],
        queryFn: async () => {
            const params: Record<string, string | number> = { page };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter) params.status = statusFilter;

            const res = await api.get("/dereporting/eksternals", { params });
            return res.data;
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Diterima":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Diterima
                    </span>
                );
            case "Ditolak":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Ditolak
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Menunggu Tinjauan
                    </span>
                );
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Globe className="w-8 h-8 text-blue-500" /> Laporan Publik
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                        Arsip laporan dan pengaduan lapangan yang dikirimkan oleh masyarakat / pihak eksternal.
                    </p>
                </div>

                {/* Pencarian */}
                <div className="relative group w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari judul, pelapor, instansi..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        className="pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full md:w-64 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* Filter Tabs Status */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.id;
                    const Icon = f.icon;
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                                setStatusFilter(f.id);
                                setPage(1);
                            }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                active
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                            }`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {f.label}
                        </button>
                    );
                })}
            </div>

            {/* Tabel Data */}
            <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Tanggal Masuk</th>
                                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Judul & Kronologi</th>
                                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Pelapor</th>
                                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-blue-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Memuat Laporan Publik...</span>
                                    </td>
                                </tr>
                            ) : !response?.data || response.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-zinc-500">
                                        <Globe className="w-8 h-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                                        Tidak ada laporan publik ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                response.data.map((report) => (
                                    <tr key={report.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4 text-xs text-zinc-500">
                                            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                {new Date(report.created_at).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                                {new Date(report.created_at).toLocaleTimeString("id-ID", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })} WITA
                                            </p>
                                        </td>
                                        <td className="p-4 max-w-sm">
                                            <p className="font-bold text-zinc-900 dark:text-white text-sm truncate">
                                                {report.judul_laporan}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                                {report.deskripsi || "Tanpa rincian deskripsi."}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                                {report.nama_pelapor}
                                            </p>
                                            <p className="text-[11px] text-zinc-500">
                                                {report.instansi || "Masyarakat Umum"}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(report.status)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                href={`/dereporting/eksternal/${report.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm hover:scale-[1.02] active:scale-95"
                                            >
                                                Tinjau <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {response && response.total > 20 && (
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                        <p>Total {response.total} laporan masuk</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={!response.prev_page_url}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                            >
                                Sebelumnya
                            </button>
                            <span className="font-mono px-2">
                                Hal {response.current_page} dari {response.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={!response.next_page_url}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
