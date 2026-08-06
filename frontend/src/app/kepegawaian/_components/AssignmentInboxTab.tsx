"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateIndonesian } from "@/lib/letter-utils";
import { ShieldCheck, Clock, MapPin } from "lucide-react";

interface SuratTugasItem {
    id: string;
    maksud_tujuan: string;
    tempat_tujuan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: string;
}

export function AssignmentInboxTab() {
    const router = useRouter();

    const { data, isLoading } = useQuery({
        queryKey: ["surat-tugas-inbox"],
        queryFn: async () => {
            const res = await api.get("/surat-tugas?status=pending");
            return res.data;
        },
        staleTime: 0,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    });

    const items = data?.data ?? [];

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Menunggu Otorisasi
                </h3>
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20">
                    {items.length} Pending
                </span>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                    <ShieldCheck className="w-12 h-12 opacity-10 mb-2" />
                    <p className="text-sm">Tidak ada surat tugas yang menunggu persetujuan.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item: SuratTugasItem) => (
                        <div key={item.id} className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                    {item.maksud_tujuan}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDateIndonesian(item.tanggal_mulai)} - {formatDateIndonesian(item.tanggal_selesai)}
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {item.tempat_tujuan}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${item.id}`)}
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 flex items-center justify-center gap-2 shrink-0"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Otorisasi Sekarang
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
