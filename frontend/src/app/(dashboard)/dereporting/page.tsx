"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart3, FileText, Globe, Clock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Palet Warna Seragam untuk Grafik
const CHART_COLORS = ["#8b5cf6", "#6366f1", "#a78bfa", "#7c3aed", "#818cf8", "#c4b5fd"];

export default function DeReportingDashboardPage() {
    // Penarikan Data Statistik dari Backend
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dr-dashboard-stats"],
        queryFn: async () => {
            // Kita memanggil beberapa endpoint secara paralel untuk kecepatan
            const [internals, eksternal, bidangList] = await Promise.all([
                api.get("/dereporting/internals", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
                api.get("/dereporting/eksternal", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
                api.get("/dereporting/master/bidang", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
            ]);

            const internalData = internals.data?.data || [];
            const eksternalData = eksternal.data?.data || [];
            const bidangData = bidangList.data?.data || [];

            // Hitung total laporan per bidang (untuk grafik)
            const bidangCounts = bidangData.map((b: { id: string; nama: string }) => ({
                nama: b.nama,
                total: internalData.filter((r: { bidang_id: string }) => r.bidang_id === b.id).length,
            }));

            return {
                totalInternal: internalData.length,
                totalEksternal: eksternalData.length,
                menungguTinjauan: eksternalData.filter((e: { status: string }) => e.status === "Menunggu Tinjauan").length,
                totalBidang: bidangData.length,
                bidangCounts,
            };
        },
    });

    // Kartu Statistik Pembantu
    const STAT_CARDS = [
        { label: "Laporan Internal",    value: stats?.totalInternal ?? 0,     icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
        { label: "Laporan Publik",      value: stats?.totalEksternal ?? 0,    icon: Globe,    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
        { label: "Menunggu Tinjauan",   value: stats?.menungguTinjauan ?? 0,  icon: Clock,    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
        { label: "Bidang Aktif",        value: stats?.totalBidang ?? 0,       icon: BarChart3,color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-violet-500" /> Pusat Komando Laporan
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">Ikhtisar rekapitulasi seluruh laporan internal & publik BKSDA secara real-time.</p>
            </div>

            {/* Grid Kartu Statistik */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {STAT_CARDS.map((card) => (
                            <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-5 flex items-start gap-4 transition-all hover:scale-[1.02]`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-white">{card.value}</p>
                                    <p className="text-xs text-zinc-400 font-medium mt-0.5">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grafik Batang: Laporan per Bidang */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Distribusi Laporan Internal per Bidang</h3>
                        {stats?.bidangCounts?.length ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={stats.bidangCounts} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                                    <XAxis dataKey="nama" tick={{ fill: "#71717a", fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                                    <YAxis tick={{ fill: "#71717a", fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px", color: "#fff" }} />
                                    <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                                        {stats.bidangCounts.map((_: { nama: string; total: number }, i: number) => (
                                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-zinc-500 text-sm text-center py-12">Belum ada data laporan untuk divisualisasikan.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
