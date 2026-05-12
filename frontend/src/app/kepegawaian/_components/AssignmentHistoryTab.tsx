"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateIndonesian } from "@/lib/letter-utils";
import { Printer, Trash2, Filter, FileText, RefreshCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SuratTugasItem {
    id: string;
    nomor_surat?: string;
    maksud_tujuan: string;
    tempat_tujuan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: string;
    employees?: { id: string; nama_lengkap: string; nip: string }[];
}

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    pending: "Menunggu Persetujuan",
    approved: "Diterbitkan",
    rejected: "Ditolak",
    completed: "Selesai",
};

export function AssignmentHistoryTab() {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState("");
    const [isTrashMode, setIsTrashMode] = useState(false);
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["surat-tugas-history", filterStatus, isTrashMode, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filterStatus) params.append("status", filterStatus);
            if (isTrashMode) params.append("trashed", "true");
            params.append("page", page.toString());
            params.append("per_page", "5");
            const res = await api.get(`/surat-tugas?${params.toString()}`);
            return res.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/surat-tugas/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] }),
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => api.post(`/surat-tugas/${id}/restore`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] }),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => api.put(`/surat-tugas/${id}/approve`, { status: "approved" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
            toast.success("Surat Tugas berhasil diterbitkan!");
        },
        onError: () => toast.error("Gagal menerbitkan ST."),
    });

    const items = data?.data ?? [];
    const meta = data?.meta ?? { current_page: 1, last_page: 1, total: 0 };

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-sm">
                        <Filter className="w-3.5 h-3.5 text-zinc-400" />
                        <select
                            className="bg-transparent text-zinc-600 dark:text-zinc-300 text-xs font-semibold outline-none cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Menunggu Persetujuan</option>
                            <option value="approved">Diterbitkan</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => setIsTrashMode(!isTrashMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 w-full sm:w-auto justify-center ${
                        isTrashMode
                            ? "bg-red-500/10 text-red-600 border border-red-200 shadow-sm"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isTrashMode ? "Keluar dari Arsip" : "Arsip Terhapus"}
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Nomor Surat</th>
                                <th className="px-6 py-4">Maksud / Tugas</th>
                                <th className="px-6 py-4">Personil</th>
                                <th className="px-6 py-4">Tanggal & Tempat</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full" /></td>
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-10" />
                                        <p className="text-sm">Tidak ada data surat tugas.</p>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item: SuratTugasItem) => (
                                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                {item.nomor_surat || "Belum Input"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-zinc-900 dark:text-zinc-200 text-xs font-semibold line-clamp-2 leading-relaxed">{item.maksud_tujuan}</p>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="flex flex-wrap gap-1">
                                                {item.employees && item.employees.length > 0 ? (
                                                    item.employees.map((emp) => (
                                                        <span key={emp.id} className="inline-block text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                                                            {emp.nama_lengkap}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-zinc-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{formatDateIndonesian(item.tanggal_mulai)}</p>
                                                <p className="text-zinc-400 dark:text-zinc-500 text-[11px] italic">{item.tempat_tujuan}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[item.status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                                                {STATUS_LABELS[item.status] ?? item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isTrashMode && item.status === "pending" && (
                                                    <button
                                                        onClick={() => approveMutation.mutate(item.id)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                                                        title="Setujui & Terbitkan"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {!isTrashMode && (
                                                    <button
                                                        onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${item.id}`)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                                                        title="Buka Builder"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {!isTrashMode && (
                                                    <button
                                                        onClick={() => deleteMutation.mutate(item.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isTrashMode && (
                                                    <button
                                                        onClick={() => restoreMutation.mutate(item.id)}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                                                        title="Pulihkan"
                                                    >
                                                        <RefreshCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-xs text-zinc-500">
                        Halaman {meta.current_page} dari {meta.last_page} ({meta.total} data)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Sebelumnya
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                            disabled={page >= meta.last_page}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
