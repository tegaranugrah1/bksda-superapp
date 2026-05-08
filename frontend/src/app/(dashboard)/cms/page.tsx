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
        { label: "Total Berita",        value: stats?.informasi ?? 0, icon: Newspaper, color: "teal" },
        { label: "Galeri Foto",         value: stats?.photos ?? 0,    icon: Camera,    color: "cyan" },
        { label: "Galeri Video",        value: stats?.videos ?? 0,    icon: Video,     color: "blue" },
        { label: "Pesan Belum Dibaca",  value: stats?.pesan ?? 0,     icon: Inbox,     color: "rose" },
        { label: "Buku Publikasi",      value: stats?.buku ?? 0,      icon: BookOpen,  color: "violet" },
        { label: "Kawasan Konservasi",  value: stats?.kawasan ?? 0,   icon: MapPin,    color: "emerald" },
        { label: "Spesies TSL",         value: stats?.tsl ?? 0,       icon: TreePine,  color: "lime" },
        { label: "Dokumen Regulasi",    value: stats?.regulasi ?? 0,  icon: Scale,     color: "amber" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-teal-500" /> CMS Dashboard
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">
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
                            className={`bg-${card.color}-500/5 border border-${card.color}-500/15 rounded-2xl p-5 flex items-start gap-4 transition-all hover:scale-[1.02] hover:border-${card.color}-500/30`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${card.color}-500/10`}>
                                <card.icon className={`w-6 h-6 text-${card.color}-400`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white">{card.value}</p>
                                <p className="text-xs text-zinc-400 font-medium mt-0.5">{card.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Panduan Cepat */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Panduan Cepat</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                        <p className="font-bold text-teal-400 mb-1">📰 Menulis Berita</p>
                        <p className="text-zinc-500">Buka menu <strong>Berita</strong>, klik tombol <strong>Tambah</strong>, isi konten lalu klik <strong>Terbitkan</strong>.</p>
                    </div>
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                        <p className="font-bold text-teal-400 mb-1">📸 Mengunggah Foto</p>
                        <p className="text-zinc-500">Buka menu <strong>Galeri Foto</strong>, seret file ke area unggah, lalu beri judul dan album.</p>
                    </div>
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                        <p className="font-bold text-teal-400 mb-1">⚙️ Pengaturan Website</p>
                        <p className="text-zinc-500">Klik ikon <strong>⚙️ di Sidebar</strong> untuk mengubah logo, alamat, dan tautan sosial media.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
