"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Inbox, Loader2, CheckCircle, Trash2, Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";

interface PesanItem {
    id: number;
    nama: string;
    email: string | null;
    subjek: string;
    isi: string;
    is_read: boolean;
    created_at: string;
}

export default function PesanMasukPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

    const { data: response, isLoading } = useQuery({
        queryKey: ["cms-pesan", filter, page],
        queryFn: async () => {
            const params: Record<string, unknown> = { page };
            if (filter === "unread") params.is_read = "false";
            if (filter === "read") params.is_read = "true";
            return (await api.get("/cms/admin/pesan", { params })).data;
        },
    });

    const markReadMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/cms/admin/pesan/${id}/read`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cms-pesan"] }); toast.success("Pesan ditandai dibaca."); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/cms/admin/pesan/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cms-pesan"] }); toast.success("Pesan dihapus."); },
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Inbox className="w-8 h-8 text-teal-500" /> Pesan Masuk
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Pesan dari pengunjung website melalui form Kontak Kami.</p>
                </div>
                {/* Filter Tab */}
                <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                    {(["all", "unread", "read"] as const).map(f => (
                        <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-teal-600 text-white" : "text-zinc-400 hover:text-white"}`}>
                            {f === "all" ? "Semua" : f === "unread" ? "Belum Dibaca" : "Sudah Dibaca"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Daftar Pesan */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" /></div>
                ) : response?.data?.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500">Tidak ada pesan.</div>
                ) : (
                    response?.data?.map((pesan: PesanItem) => (
                        <div key={pesan.id} className={`bg-zinc-900/50 border rounded-2xl p-5 transition-all ${pesan.is_read ? "border-zinc-800/50" : "border-teal-500/30 bg-teal-500/5"}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    {pesan.is_read ? <MailOpen className="w-5 h-5 text-zinc-600 mt-0.5 shrink-0" /> : <Mail className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />}
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm ${pesan.is_read ? "text-zinc-400" : "text-white"}`}>{pesan.subjek}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{pesan.nama} {pesan.email && `• ${pesan.email}`}</p>
                                        <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{pesan.isi}</p>
                                        <p className="text-[10px] text-zinc-600 mt-2">{new Date(pesan.created_at).toLocaleString("id-ID")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!pesan.is_read && (
                                        <button onClick={() => markReadMutation.mutate(pesan.id)} className="p-2 hover:bg-teal-500/10 rounded-lg group" title="Tandai dibaca">
                                            <CheckCircle className="w-4 h-4 text-zinc-500 group-hover:text-teal-400" />
                                        </button>
                                    )}
                                    <button onClick={() => { if(confirm("Hapus pesan ini?")) deleteMutation.mutate(pesan.id); }}
                                        className="p-2 hover:bg-red-500/10 rounded-lg group" title="Hapus">
                                        <Trash2 className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {response?.last_page > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50 text-sm">Prev</button>
                    <span className="px-3 py-1 text-zinc-500 text-sm">Hal. {page} / {response.last_page}</span>
                    <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50 text-sm">Next</button>
                </div>
            )}
        </div>
    );
}
