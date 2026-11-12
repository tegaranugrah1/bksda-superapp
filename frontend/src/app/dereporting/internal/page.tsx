"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    FileText,
    Plus,
    Download,
    Search,
    Loader2,
    Eye,
    CheckSquare,
    Trash2,
    Users,
    Building2,
    CheckCircle2,
    AlertCircle,
    Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import InternalUploadDrawer from "./_components/InternalUploadDrawer";
import InternalReportPreviewModal from "./_components/InternalReportPreviewModal";
import InternalReportReviewModal from "./_components/InternalReportReviewModal";

interface RecipientSummary {
    type: "user" | "urusan";
    label: string;
    read_at?: string | null;
}

interface ReportData {
    id: string;
    judul_laporan: string;
    keterangan?: string;
    target_scope: "all" | "restricted";
    review_status: "terkirim" | "sesuai" | "perlu_revisi";
    review_notes?: string | null;
    created_at: string;
    bidang?: { id: string; nama: string };
    tahun?: { id: string; tahun: number };
    uploader?: { id: number; name?: string; username?: string };
    is_mine: boolean;
    is_read_by_me: boolean;
    read_at?: string | null;
    recipients_summary: RecipientSummary[];
    actions_allowed: {
        can_preview: boolean;
        can_download: boolean;
        can_review: boolean;
        can_delete: boolean;
    };
}

interface ApiResponse {
    data: ReportData[];
    total?: number;
    current_page?: number;
    next_page_url?: string;
}

type TabKey = "all_relevant" | "personal" | "urusan" | "my_uploads" | "balai";

export default function DeReportingInternalPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin" || user?.role === "super_admin";

    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<TabKey>("all_relevant");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 400);

    // Modals
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [previewReport, setPreviewReport] = useState<{ id: string; judul: string } | null>(null);
    const [reviewReport, setReviewReport] = useState<ReportData | null>(null);

    // Penarikan Data Laporan Internal
    const { data: response, isLoading } = useQuery<ApiResponse>({
        queryKey: ["dr-internals", debouncedSearch, page, activeTab],
        queryFn: async () => {
            const res = await api.get("/dereporting/internals", {
                params: {
                    search: debouncedSearch,
                    page,
                    tab: activeTab,
                },
            });
            return res.data;
        },
    });

    const handleDownload = async (id: string, judul: string) => {
        try {
            const res = await api.get(`/dereporting/internals/${id}/download`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${judul || "Laporan_Internal"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Berkas berhasil ditarik dari brankas.");
        } catch {
            toast.error("Gagal mengunduh berkas. Pastikan Anda memiliki hak otorisasi.");
        }
    };

    const handleDelete = async (id: string, judul: string) => {
        if (!confirm(`Tarik laporan "${judul}" dari peredaran internal?`)) return;
        try {
            await api.delete(`/dereporting/internals/${id}`);
            toast.success("Laporan berhasil ditarik (archived).");
            queryClient.invalidateQueries({ queryKey: ["dr-internals"] });
        } catch {
            toast.error("Gagal menghapus laporan.");
        }
    };

    const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
        { key: "all_relevant", label: "Semua Relevan", icon: FileText },
        { key: "personal", label: "Untuk Saya", icon: Users },
        { key: "urusan", label: "Urusan Saya", icon: Building2 },
        { key: "my_uploads", label: "Unggahan Saya", icon: CheckSquare },
        ...(isAdmin ? [{ key: "balai" as TabKey, label: "Seluruh Balai", icon: Building2 }] : []),
    ];

    return (
        <div className="p-4 md:p-8 space-y-5 animate-in fade-in duration-300">
            {/* CANONICAL ENTERPRISE HEADER CARD (Delicate border ala Kepegawaian & BMN) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Laporan Internal BKSDA
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Tata kelola arsip laporan dinas berdasar urusan kerja dan penugasan personal.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-xl bg-amber-700 text-white hover:bg-amber-800 active:scale-98 transition-all shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Unggah Laporan Baru
                    </button>
                </div>
            </div>

            {/* SEGMENTED TAB NAVIGATION & SEARCH */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Segmented Tabs */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100/70 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800/80 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setPage(1);
                                }}
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    isActive
                                        ? "text-[var(--ds-accent-fg)] text-amber-800 dark:text-amber-400 font-bold"
                                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="dr-internal-tabs"
                                        className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-900 shadow-2xs border border-slate-200/80 dark:border-zinc-800/80"
                                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Pencarian Cerdas */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Cari judul laporan..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-9 pr-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
                    />
                </div>
            </div>

            {/* TABEL DATA LAPORAN (Delicate hairline borders & smooth hover) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-800/30 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                <th className="p-4">Tanggal & Judul</th>
                                <th className="p-4">Sasaran / Distribusi</th>
                                <th className="p-4 text-center">Status Baca</th>
                                <th className="p-4">Pengunggah</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-amber-700 dark:text-amber-400">
                                        <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-amber-600" />
                                        <span className="font-semibold text-xs tracking-wider uppercase opacity-80">
                                            Membongkar Lemari Arsip...
                                        </span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-zinc-500">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="font-medium text-xs">Tidak ada laporan internal yang cocok.</p>
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((report: ReportData) => (
                                    <tr
                                        key={report.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        {/* Tanggal & Judul */}
                                        <td className="p-4 max-w-sm">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-[var(--ds-fg)] truncate">
                                                    {report.judul_laporan}
                                                </p>
                                                {/* Review Status Badge */}
                                                {report.review_status === "sesuai" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Sesuai
                                                    </span>
                                                )}
                                                {report.review_status === "perlu_revisi" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Perlu Revisi
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-[var(--ds-fg-muted)] mt-1">
                                                <span>
                                                    {new Date(report.created_at).toLocaleDateString("id-ID", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                                {report.bidang && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-medium text-[var(--ds-accent-fg)]">
                                                            {report.bidang.nama}
                                                        </span>
                                                    </>
                                                )}
                                                {report.is_mine && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="px-1.5 py-0.2 rounded-md bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] font-mono text-[10px]">
                                                            Unggahan Saya
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {report.review_notes && (
                                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 italic">
                                                    Catatan: &ldquo;{report.review_notes}&rdquo;
                                                </p>
                                            )}
                                        </td>

                                        {/* Sasaran / Distribusi */}
                                        <td className="p-4">
                                            {report.target_scope === "all" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border border-[var(--ds-border-subtle)]">
                                                    <Users className="w-3 h-3" />
                                                    Semua Pegawai
                                                </span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {report.recipients_summary?.map((r, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                                                r.type === "urusan"
                                                                    ? "bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300"
                                                                    : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
                                                            }`}
                                                        >
                                                            {r.type === "urusan" ? (
                                                                <Building2 className="w-2.5 h-2.5" />
                                                            ) : (
                                                                <Users className="w-2.5 h-2.5" />
                                                            )}
                                                            {r.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        {/* Status Baca */}
                                        <td className="p-4 text-center">
                                            {report.is_read_by_me ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Sudah Dilihat
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                    <Clock className="w-3 h-3" />
                                                    Belum Dibaca
                                                </span>
                                            )}
                                        </td>

                                        {/* Pengunggah */}
                                        <td className="p-4">
                                            <p className="font-semibold text-[var(--ds-fg)]">
                                                {report.uploader?.name || "Sistem"}
                                            </p>
                                            <p className="text-[10px] text-[var(--ds-fg-muted)] font-mono">
                                                {report.uploader?.username}
                                            </p>
                                        </td>

                                        {/* Aksi */}
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center gap-1">
                                                {/* Pratinjau Cepat */}
                                                <button
                                                    onClick={() =>
                                                        setPreviewReport({
                                                            id: report.id,
                                                            judul: report.judul_laporan,
                                                        })
                                                    }
                                                    className="p-1.5 rounded-lg hover:bg-[var(--ds-accent-soft)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors"
                                                    title="Pratinjau Dokumen Cepat"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                {/* Unduh Berkas */}
                                                <button
                                                    onClick={() => handleDownload(report.id, report.judul_laporan)}
                                                    className="p-1.5 rounded-lg hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] transition-colors"
                                                    title="Unduh Berkas"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>

                                                {/* Tinjau / Review */}
                                                {report.actions_allowed.can_review && (
                                                    <button
                                                        onClick={() => setReviewReport(report)}
                                                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[var(--ds-fg-muted)] hover:text-emerald-600 transition-colors"
                                                        title="Konfirmasi / Tinjau Laporan"
                                                    >
                                                        <CheckSquare className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Hapus / Delete */}
                                                {report.actions_allowed.can_delete && (
                                                    <button
                                                        onClick={() => handleDelete(report.id, report.judul_laporan)}
                                                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--ds-fg-muted)] hover:text-rose-600 transition-colors"
                                                        title="Tarik Laporan"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

                {/* Footer Pagination */}
                <div className="p-3.5 bg-slate-50/50 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">Halaman {page}</span>
                    <div className="flex gap-1.5">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-2xs"
                        >
                            Sebelumnya
                        </button>
                        <button
                            disabled={!response?.next_page_url}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-2xs"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL PRATINJAU DOKUMEN CEPAT */}
            <InternalReportPreviewModal
                reportId={previewReport?.id || null}
                judulLaporan={previewReport?.judul || ""}
                onClose={() => setPreviewReport(null)}
                onReadConfirmed={() => {
                    queryClient.invalidateQueries({ queryKey: ["dr-internals"] });
                }}
            />

            {/* MODAL TINJAUAN STATUS */}
            <InternalReportReviewModal
                reportId={reviewReport?.id || null}
                judulLaporan={reviewReport?.judul_laporan || ""}
                currentStatus={reviewReport?.review_status}
                currentNotes={reviewReport?.review_notes}
                onClose={() => setReviewReport(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["dr-internals"] });
                }}
            />

            {/* DRAWER FORMULIR UNGGAH */}
            <InternalUploadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    );
}
