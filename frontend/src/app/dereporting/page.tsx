"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    BarChart3,
    FileText,
    Globe,
    Clock,
    Loader2,
    ArrowRight,
    TrendingUp,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Palet Amber Kedinasan untuk Grafik
const CHART_COLORS = ["#d97706", "#b45309", "#f59e0b", "#92400e", "#fbbf24", "#78350f"];

export default function DeReportingDashboardPage() {
    const [mounted, setMounted] = useState(false);
    const reducedMotion = useReducedMotion();

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setMounted(true);
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Penarikan Data Statistik dari Backend
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dr-dashboard-stats"],
        queryFn: async () => {
            const [internals, eksternal, bidangList] = await Promise.all([
                api.get("/dereporting/internals", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
                api.get("/dereporting/eksternals", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
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

    // Kartu Statistik dengan Kaidah 60-30-10 & Aksen Kedinasan (Delicate Borders & Micro-interactions ala Kepegawaian & BMN)
    const STAT_CARDS = [
        {
            label: "Laporan Internal",
            sublabel: "Arsip Dokumen Kedinasan",
            value: stats?.totalInternal ?? 0,
            icon: FileText,
            iconColor: "text-amber-700 dark:text-amber-400",
            iconBg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20",
            badge: "Utama",
            badgeColor: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
            hoverBorder: "hover:border-amber-400/70 dark:hover:border-amber-500/40",
            href: "/dereporting/internal",
        },
        {
            label: "Laporan Publik",
            sublabel: "Aduan & Laporan Masyarakat",
            value: stats?.totalEksternal ?? 0,
            icon: Globe,
            iconColor: "text-blue-700 dark:text-blue-400",
            iconBg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20",
            badge: "Eksternal",
            badgeColor: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
            hoverBorder: "hover:border-blue-400/70 dark:hover:border-blue-500/40",
            href: "/dereporting/eksternal",
        },
        {
            label: "Menunggu Tinjauan",
            sublabel: "Perlu Verifikasi Operator",
            value: stats?.menungguTinjauan ?? 0,
            icon: Clock,
            iconColor: "text-orange-700 dark:text-orange-400",
            iconBg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200/60 dark:border-orange-500/20",
            badge: "Pending",
            badgeColor: "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60",
            hoverBorder: "hover:border-orange-400/70 dark:hover:border-orange-500/40",
            href: "/dereporting/eksternal",
        },
        {
            label: "Bidang Aktif",
            sublabel: "Klasifikasi Data TSL Balai",
            value: stats?.totalBidang ?? 0,
            icon: BarChart3,
            iconColor: "text-emerald-700 dark:text-emerald-400",
            iconBg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20",
            badge: "Master",
            badgeColor: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
            hoverBorder: "hover:border-emerald-400/70 dark:hover:border-emerald-500/40",
            href: "/dereporting/internal",
        },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
            {/* CANONICAL ENTERPRISE HEADER CARD (Delicate border ala Kepegawaian & BMN) */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Pusat Komando Laporan
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Ikhtisar rekapitulasi seluruh laporan internal & publik BKSDA Kalimantan Timur secara real-time.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-stretch xl:self-auto shrink-0">
                    <Link
                        href="/dereporting/eksternal"
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
                    >
                        <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Laporan Publik
                    </Link>
                    <Link
                        href="/dereporting/internal"
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-xl bg-amber-700 text-white hover:bg-amber-800 active:scale-98 transition-all shadow-xs"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Buka Laporan Internal
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>
                </div>
            </div>

            {/* Grid Kartu Statistik (30% Sekunder dengan Sentuhan 10% Aksen) */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {STAT_CARDS.map((card) => (
                            <motion.div
                                key={card.label}
                                whileHover={reducedMotion ? undefined : { y: -3 }}
                                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="h-full"
                            >
                                <Link
                                    href={card.href}
                                    className={`group bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 ${card.hoverBorder} rounded-2xl p-5 shadow-2xs transition-colors flex flex-col justify-between h-full cursor-pointer`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div
                                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}
                                        >
                                            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${card.badgeColor}`}
                                        >
                                            {card.badge}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                            {card.value}
                                        </p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors mt-1">
                                            {card.label}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                            {card.sublabel}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Grafik Batang: Laporan per Bidang (Delicate borders & subtle contrast) */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-2xs">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                                    Distribusi Laporan Internal per Bidang
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                    Sebaran dokumen internal berdasarkan bidang dan perizinan konservasi.
                                </p>
                            </div>
                            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-lg bg-slate-100/70 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-800">
                                Tahun Berjalan
                            </span>
                        </div>

                        {stats?.bidangCounts?.length ? (
                            <div className="h-[320px] w-full">
                                {mounted ? (
                                    <ResponsiveContainer width="100%" height={320} minWidth={0} debounce={50}>
                                        <BarChart
                                            data={stats.bidangCounts}
                                            margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
                                        >
                                            <XAxis
                                                dataKey="nama"
                                                tick={{ fill: "var(--ds-fg-muted)", fontSize: 11 }}
                                                angle={-25}
                                                textAnchor="end"
                                                interval={0}
                                            />
                                            <YAxis
                                                tick={{ fill: "var(--ds-fg-muted)", fontSize: 12 }}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "var(--ds-surface)",
                                                    border: "1px solid var(--ds-border-subtle)",
                                                    borderRadius: "12px",
                                                    color: "var(--ds-fg)",
                                                    fontSize: "12px",
                                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                                }}
                                            />
                                            <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                                                {stats.bidangCounts.map(
                                                    (_: { nama: string; total: number }, i: number) => (
                                                        <Cell
                                                            key={`cell-${i}`}
                                                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                                                        />
                                                    )
                                                )}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full bg-[var(--ds-surface-muted)] animate-pulse rounded-xl" />
                                )}
                            </div>
                        ) : (
                            <div className="py-16 text-center text-[var(--ds-fg-muted)]">
                                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-medium">Belum ada data laporan untuk divisualisasikan.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
