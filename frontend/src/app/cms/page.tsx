"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Newspaper, Camera, Video, Inbox, BookOpen, MapPin,
    TreePine, Scale, Loader2, Settings
} from "lucide-react";

export default function CMSDashboardPage() {
    // Penarikan Statistik Paralel (Promise.all untuk kecepatan)
    const { data: stats, isLoading } = useQuery({
        queryKey: ["cms-dashboard-stats"],
        queryFn: async () => {
            const endpoints = [
                { key: "informasi", url: "/cms/admin/informasi" },
                { key: "photos",    url: "/cms/admin/photos" },
                { key: "videos",    url: "/cms/admin/videos" },
                { key: "pesan",     url: "/cms/admin/pesan?is_read=false" },
                { key: "buku",      url: "/cms/admin/buku" },
                { key: "kawasan",   url: "/cms/admin/kawasan" },
                { key: "tsl",       url: "/cms/admin/tsl" },
                { key: "regulasi",  url: "/cms/admin/regulasi" },
            ];

            const results = await Promise.all(
                endpoints.map(ep =>
                    api.get(ep.url, { params: { per_page: 1 } }) // Hanya ambil meta, bukan data
                       .then(res => ({ key: ep.key, total: res.data?.total || res.data?.data?.length || 0 }))
                       .catch(() => ({ key: ep.key, total: 0 }))
                )
            );

            // Konversi array ke object { informasi: 42, photos: 15, ... }
            return Object.fromEntries(results.map(r => [r.key, r.total]));
        },
    });

    const STAT_CARDS = [
        { label: "Total Berita",        value: stats?.informasi ?? 0, icon: Newspaper, bg: "bg-teal-500/5 dark:bg-teal-500/5",       border: "border-teal-500/15 hover:border-teal-500/30",    iconBg: "bg-teal-500/10",    iconColor: "text-teal-500 dark:text-teal-400" },
        { label: "Galeri Foto",         value: stats?.photos ?? 0,    icon: Camera,    bg: "bg-cyan-500/5 dark:bg-cyan-500/5",       border: "border-cyan-500/15 hover:border-cyan-500/30",    iconBg: "bg-cyan-500/10",    iconColor: "text-cyan-500 dark:text-cyan-400" },
        { label: "Galeri Video",        value: stats?.videos ?? 0,    icon: Video,     bg: "bg-blue-500/5 dark:bg-blue-500/5",       border: "border-blue-500/15 hover:border-blue-500/30",    iconBg: "bg-blue-500/10",    iconColor: "text-blue-500 dark:text-blue-400" },
        { label: "Pesan Belum Dibaca",  value: stats?.pesan ?? 0,     icon: Inbox,     bg: "bg-rose-500/5 dark:bg-rose-500/5",       border: "border-rose-500/15 hover:border-rose-500/30",    iconBg: "bg-rose-500/10",    iconColor: "text-rose-500 dark:text-rose-400" },
        { label: "Buku Publikasi",      value: stats?.buku ?? 0,      icon: BookOpen,  bg: "bg-violet-500/5 dark:bg-violet-500/5",   border: "border-violet-500/15 hover:border-violet-500/30",iconBg: "bg-violet-500/10",  iconColor: "text-violet-500 dark:text-violet-400" },
        { label: "Kawasan Konservasi",  value: stats?.kawasan ?? 0,   icon: MapPin,    bg: "bg-emerald-500/5 dark:bg-emerald-500/5", border: "border-emerald-500/15 hover:border-emerald-500/30",iconBg: "bg-emerald-500/10",iconColor: "text-emerald-500 dark:text-emerald-400" },
        { label: "Spesies TSL",         value: stats?.tsl ?? 0,       icon: TreePine,  bg: "bg-lime-500/5 dark:bg-lime-500/5",       border: "border-lime-500/15 hover:border-lime-500/30",    iconBg: "bg-lime-500/10",    iconColor: "text-lime-500 dark:text-lime-400" },
        { label: "Dokumen Regulasi",    value: stats?.regulasi ?? 0,  icon: Scale,     bg: "bg-amber-500/5 dark:bg-amber-500/5",     border: "border-amber-500/15 hover:border-amber-500/30",  iconBg: "bg-amber-500/10",   iconColor: "text-amber-500 dark:text-amber-400" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-teal-500" /> CMS Dashboard
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                    Ikhtisar seluruh konten website publik BKSDA yang Anda kelola.
                </p>
            </div>

            {/* Grid Kartu Statistik */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {STAT_CARDS.map((card) => (
                        <div key={card.label}
                            className={`${card.bg} border ${card.border} rounded-2xl p-5 flex items-start gap-4 transition-all hover:scale-[1.02]`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900 dark:text-white">{card.value}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{card.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Panduan Cepat */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Panduan Cepat</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/50">
                        <p className="font-bold text-teal-600 dark:text-teal-400 mb-1">📰 Menulis Berita</p>
                        <p className="text-zinc-500 dark:text-zinc-500">Buka menu <strong>Berita</strong>, klik tombol <strong>Tambah</strong>, isi konten lalu klik <strong>Terbitkan</strong>.</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/50">
                        <p className="font-bold text-teal-600 dark:text-teal-400 mb-1">📸 Mengunggah Foto</p>
                        <p className="text-zinc-500 dark:text-zinc-500">Buka menu <strong>Galeri Foto</strong>, seret file ke area unggah, lalu beri judul dan album.</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/50">
                        <p className="font-bold text-teal-600 dark:text-teal-400 mb-1">⚙️ Pengaturan Website</p>
                        <p className="text-zinc-500 dark:text-zinc-500">Klik ikon <strong>⚙️ di Sidebar</strong> untuk mengubah logo, alamat, dan tautan sosial media.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
