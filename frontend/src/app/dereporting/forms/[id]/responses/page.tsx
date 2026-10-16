"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowLeft,
    Download,
    TableProperties,
    BarChart2,
    Loader2,
    Calendar,
    FileText,
    ExternalLink,
    Edit3,
    CheckSquare,
    Radio,
    List,
    UploadCloud,
    MessageSquare,
    Hash,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FormField {
    id: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
}

interface DynamicFormDetail {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    is_active?: boolean;
    fields: FormField[];
}

interface ResponseItem {
    id: string;
    answers: Record<string, unknown>;
    file_paths: Record<string, string>;
    ip_address: string | null;
    created_at: string;
}

interface ApiResponse {
    form: DynamicFormDetail;
    data?: ResponseItem[];
    responses?: {
        data: ResponseItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

const PALETTE = [
    { bg: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", hex: "#8b5cf6", lightBg: "bg-violet-500/10", border: "border-violet-500/30" },
    { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", hex: "#10b981", lightBg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", hex: "#3b82f6", lightBg: "bg-blue-500/10", border: "border-blue-500/30" },
    { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b", lightBg: "bg-amber-500/10", border: "border-amber-500/30" },
    { bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", hex: "#f43f5e", lightBg: "bg-rose-500/10", border: "border-rose-500/30" },
    { bg: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", hex: "#06b6d4", lightBg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    { bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", hex: "#6366f1", lightBg: "bg-indigo-500/10", border: "border-indigo-500/30" },
];

export default function DeReportingFormResponsesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<"summary" | "table">("summary");
    const [isExporting, setIsExporting] = useState(false);

    // Penarikan Tanggapan Paginasi untuk Tampilan Tabel
    const { data: paginatedResponse, isLoading: isLoadingTable } = useQuery<ApiResponse>({
        queryKey: ["dr-form-responses-paginated", id, page],
        queryFn: async () => {
            const res = await api.get(`/dereporting/forms/${id}/responses`, {
                params: { page },
            });
            return res.data;
        },
    });

    // Penarikan Seluruh Tanggapan untuk Tab Ringkasan Statistik Visual
    const { data: allResponse, isLoading: isLoadingAll } = useQuery<{ form: DynamicFormDetail; data: ResponseItem[] }>({
        queryKey: ["dr-form-responses-all", id],
        queryFn: async () => {
            const res = await api.get(`/dereporting/forms/${id}/responses`, {
                params: { all: "true" },
            });
            return res.data;
        },
    });

    const form = allResponse?.form || paginatedResponse?.form;
    const allItems = allResponse?.data || [];
    const tableItems = paginatedResponse?.responses?.data || paginatedResponse?.data || [];
    const fields = form?.fields || [];
    const totalResponses = allItems.length || paginatedResponse?.responses?.total || 0;

    // Timestamp tanggapan terbaru
    const latestResponseTime = allItems.length > 0 ? allItems[0].created_at : null;

    // Handler Ekspor CSV
    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const res = await api.get(`/dereporting/forms/${id}/responses/export`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${form?.slug || "form"}_tanggapan.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("File CSV berhasil diekspor!");
        } catch {
            toast.error("Gagal mengekspor data ke CSV.");
        } finally {
            setIsExporting(false);
        }
    };

    // Handler Unduh Lampiran Spesifik
    const handleDownloadAttachment = async (responseId: string, fieldId: string, fieldLabel: string) => {
        try {
            const res = await api.get(`/dereporting/forms/responses/${responseId}/download/${fieldId}`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${fieldLabel}_lampiran`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Lampiran berhasil diunduh.");
        } catch {
            toast.error("Gagal mengunduh berkas lampiran.");
        }
    };

    const getFieldTypeIcon = (type: string) => {
        switch (type) {
            case "radio":
                return <Radio className="w-4 h-4 text-violet-500" />;
            case "checkbox":
                return <CheckSquare className="w-4 h-4 text-emerald-500" />;
            case "select":
                return <List className="w-4 h-4 text-blue-500" />;
            case "textarea":
                return <MessageSquare className="w-4 h-4 text-amber-500" />;
            case "date":
                return <Calendar className="w-4 h-4 text-cyan-500" />;
            case "file":
                return <UploadCloud className="w-4 h-4 text-rose-500" />;
            default:
                return <FileText className="w-4 h-4 text-zinc-500" />;
        }
    };

    const getFieldTypeBadge = (type: string) => {
        switch (type) {
            case "radio":
                return "Pilihan Ganda";
            case "checkbox":
                return "Kotak Centang";
            case "select":
                return "Dropdown";
            case "textarea":
                return "Paragraf";
            case "date":
                return "Tanggal";
            case "file":
                return "Berkas / Foto";
            default:
                return "Teks Singkat";
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Bar Navigasi */}
            <div>
                <Link
                    href="/dereporting/forms"
                    className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-violet-500 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Formulir
                </Link>
            </div>

            {/* Header Formulir & Aksi */}
            <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-violet-500" />
                        Tanggapan: {form?.title || "Formulir"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span>Total <strong>{totalResponses}</strong> Tanggapan Masuk</span>
                        <span>•</span>
                        <a
                            href={`/lapor/${form?.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-violet-500 hover:underline flex items-center gap-1"
                        >
                            /lapor/{form?.slug} <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dereporting/forms/${id}/builder`}>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl text-xs font-bold gap-1.5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                            <Edit3 className="w-3.5 h-3.5 text-zinc-500" /> Edit Pertanyaan
                        </Button>
                    </Link>

                    <Button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={isExporting || totalResponses === 0}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2 shadow-sm"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Ekspor ke CSV
                    </Button>
                </div>
            </div>

            {/* Tab Navigasi ala Google Forms (Ringkasan vs Tabel) */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-px">
                <button
                    type="button"
                    onClick={() => setActiveTab("summary")}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
                        activeTab === "summary"
                            ? "border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-500/5"
                            : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                >
                    <BarChart2 className="w-4 h-4" />
                    Ringkasan Statistik ({totalResponses})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("table")}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
                        activeTab === "table"
                            ? "border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-500/5"
                            : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                >
                    <TableProperties className="w-4 h-4" />
                    Tabel Individual
                </button>
            </div>

            {/* KONTEN TAB: RINGKASAN STATISTIK VISUAL (GOOGLE FORMS STYLE) */}
            {activeTab === "summary" && (
                <div className="space-y-6">
                    {/* Kartu Ringkasan Atas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <BarChart2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900 dark:text-white">{totalResponses}</p>
                                <p className="text-xs text-zinc-500 font-medium">Total Tanggapan</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Hash className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900 dark:text-white">{fields.length}</p>
                                <p className="text-xs text-zinc-500 font-medium">Total Pertanyaan</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                    {latestResponseTime
                                        ? new Date(latestResponseTime).toLocaleDateString("id-ID", {
                                              day: "numeric",
                                              month: "short",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                          })
                                        : "Belum Ada"}
                                </p>
                                <p className="text-xs text-zinc-500 font-medium">Respons Terakhir Masuk</p>
                            </div>
                        </div>
                    </div>

                    {isLoadingAll ? (
                        <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-16 text-center text-violet-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                            <span className="text-xs font-bold uppercase tracking-widest">
                                Menganalisis Statistik Respon...
                            </span>
                        </div>
                    ) : totalResponses === 0 ? (
                        <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-16 text-center text-zinc-500">
                            <BarChart2 className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Belum ada tanggapan masuk untuk dianalisis
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                                Bagikan tautan formulir <span className="font-mono text-violet-500">/lapor/{form?.slug}</span> kepada responden.
                            </p>
                        </div>
                    ) : (
                        /* Kartu Statistik Tiap Pertanyaan */
                        <div className="space-y-5">
                            {fields.map((field, idx) => {
                                const isChoice = ["radio", "checkbox", "select"].includes(field.type);
                                const isText = ["text", "textarea"].includes(field.type);
                                const isDate = field.type === "date";
                                const isFile = field.type === "file";

                                // Agregasi Pilihan Ganda / Checkbox / Dropdown
                                let choiceStats: { option: string; count: number; percent: number }[] = [];
                                let totalChoiceVotes = 0;

                                if (isChoice) {
                                    const counts: Record<string, number> = {};
                                    (field.options || []).forEach((opt) => {
                                        counts[opt] = 0;
                                    });

                                    allItems.forEach((item) => {
                                        const raw = item.answers?.[field.id];
                                        if (raw !== undefined && raw !== null && raw !== "") {
                                            if (Array.isArray(raw)) {
                                                raw.forEach((r) => {
                                                    const s = String(r);
                                                    counts[s] = (counts[s] || 0) + 1;
                                                    totalChoiceVotes++;
                                                });
                                            } else {
                                                const s = String(raw);
                                                counts[s] = (counts[s] || 0) + 1;
                                                totalChoiceVotes++;
                                            }
                                        }
                                    });

                                    choiceStats = Object.entries(counts).map(([option, count]) => ({
                                        option,
                                        count,
                                        percent: totalChoiceVotes > 0 ? Math.round((count / totalChoiceVotes) * 100) : 0,
                                    }));
                                }

                                // Agregasi Tanggapan Teks
                                const textAnswers = isText
                                    ? allItems
                                          .map((item) => ({
                                              text: String(item.answers?.[field.id] || "").trim(),
                                              date: item.created_at,
                                          }))
                                          .filter((a) => a.text.length > 0)
                                    : [];

                                // Agregasi Tanggapan Tanggal
                                const dateAnswers = isDate
                                    ? allItems
                                          .map((item) => String(item.answers?.[field.id] || "").trim())
                                          .filter((d) => d.length > 0)
                                    : [];

                                // Agregasi Lampiran Berkas
                                const fileAnswers = isFile
                                    ? allItems
                                          .filter((item) => item.file_paths?.[field.id])
                                          .map((item) => ({
                                              responseId: item.id,
                                              path: item.file_paths[field.id],
                                              date: item.created_at,
                                          }))
                                    : [];

                                return (
                                    <div
                                        key={field.id}
                                        className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4"
                                    >
                                        {/* Header Pertanyaan */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                                                    {field.label}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                                                    {getFieldTypeIcon(field.type)}
                                                    {getFieldTypeBadge(field.type)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tampilan Visual Pilihan Ganda / Checkbox / Dropdown */}
                                        {isChoice && (
                                            <div className="space-y-3 pt-1">
                                                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                    <span>{choiceStats.length} Pilihan Opsi</span>
                                                    <span>Total {totalChoiceVotes} Pemilih</span>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {choiceStats.map((stat, sIdx) => {
                                                        const color = PALETTE[sIdx % PALETTE.length];
                                                        return (
                                                            <div key={stat.option} className="space-y-1">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                                                                        {stat.option}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className="text-zinc-500 font-mono text-[11px]">
                                                                            {stat.count} suara
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${color.lightBg} ${color.text} border ${color.border}`}>
                                                                            {stat.percent}%
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Horizontal Progress Bar */}
                                                                <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden border border-zinc-200/50 dark:border-zinc-800">
                                                                    <div
                                                                        className={`h-full ${color.bg} transition-all duration-700 rounded-full`}
                                                                        style={{ width: `${stat.percent}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tampilan Tanggapan Teks / Paragraf */}
                                        {isText && (
                                            <div className="space-y-3 pt-1">
                                                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                    <span>{textAnswers.length} Tanggapan Teks Masuk</span>
                                                </div>

                                                {textAnswers.length === 0 ? (
                                                    <p className="text-xs text-zinc-400 italic py-3 text-center">
                                                        Belum ada tanggapan teks yang diisi.
                                                    </p>
                                                ) : (
                                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-100 dark:divide-zinc-800/40">
                                                        {textAnswers.map((item, tIdx) => (
                                                            <div key={tIdx} className="pt-2 first:pt-0">
                                                                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                                                                    &ldquo;{item.text}&rdquo;
                                                                </p>
                                                                <span className="text-[10px] text-zinc-400 font-mono mt-1 block pl-1">
                                                                    {new Date(item.date).toLocaleDateString("id-ID", {
                                                                        day: "numeric",
                                                                        month: "short",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Tampilan Tanggapan Tanggal */}
                                        {isDate && (
                                            <div className="space-y-3 pt-1">
                                                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                    <span>{dateAnswers.length} Tanggapan Tanggal Masuk</span>
                                                </div>

                                                {dateAnswers.length === 0 ? (
                                                    <p className="text-xs text-zinc-400 italic py-3 text-center">
                                                        Belum ada tanggal yang diisi.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {dateAnswers.map((d, dIdx) => (
                                                            <span
                                                                key={dIdx}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                                                            >
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {d}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Tampilan Tanggapan Berkas / Foto */}
                                        {isFile && (
                                            <div className="space-y-3 pt-1">
                                                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                    <span>{fileAnswers.length} Berkas Telah Diunggah</span>
                                                </div>

                                                {fileAnswers.length === 0 ? (
                                                    <p className="text-xs text-zinc-400 italic py-3 text-center">
                                                        Belum ada lampiran berkas yang diunggah responden.
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                        {fileAnswers.map((file, fIdx) => (
                                                            <div
                                                                key={fIdx}
                                                                className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-2"
                                                            >
                                                                <div className="truncate">
                                                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                                                        Lampiran #{fIdx + 1}
                                                                    </p>
                                                                    <p className="text-[10px] text-zinc-400 font-mono">
                                                                        {new Date(file.date).toLocaleDateString("id-ID", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                        })}
                                                                    </p>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        handleDownloadAttachment(file.responseId, field.id, field.label)
                                                                    }
                                                                    className="h-7 text-[11px] rounded-lg gap-1 font-bold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                                                >
                                                                    <Download className="w-3 h-3" /> Unduh
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* KONTEN TAB: TABEL DATA INDIVIDUAL (SPREADSHEET VIEW) */}
            {activeTab === "table" && (
                <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-bold text-[11px]">
                                    <th className="p-3.5 w-12 text-center">#</th>
                                    <th className="p-3.5">Tanggal Masuk</th>
                                    {fields.map((field) => (
                                        <th key={field.id} className="p-3.5 min-w-[160px]">
                                            {field.label}
                                        </th>
                                    ))}
                                    <th className="p-3.5">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                {isLoadingTable ? (
                                    <tr>
                                        <td colSpan={fields.length + 3} className="p-16 text-center text-violet-500">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                            <span className="text-xs font-bold uppercase tracking-widest">
                                                Memuat Rekap Tanggapan...
                                            </span>
                                        </td>
                                    </tr>
                                ) : tableItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={fields.length + 3} className="p-16 text-center text-zinc-500">
                                            <TableProperties className="w-8 h-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                                            Belum ada tanggapan masuk untuk formulir ini.
                                        </td>
                                    </tr>
                                ) : (
                                    tableItems.map((resp, idx) => (
                                        <tr key={resp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                            <td className="p-3.5 text-center text-zinc-400 font-mono">
                                                {(page - 1) * 30 + (idx + 1)}
                                            </td>
                                            <td className="p-3.5 text-zinc-500 font-mono">
                                                {new Date(resp.created_at).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}{" "}
                                                {new Date(resp.created_at).toLocaleTimeString("id-ID", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>

                                            {/* Kolom Jawaban Dinamis */}
                                            {fields.map((field) => {
                                                const isFile = field.type === "file";
                                                const hasFile = isFile && resp.file_paths?.[field.id];
                                                const rawVal = resp.answers?.[field.id];

                                                if (isFile) {
                                                    return (
                                                        <td key={field.id} className="p-3.5">
                                                            {hasFile ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        handleDownloadAttachment(resp.id, field.id, field.label)
                                                                    }
                                                                    className="h-7 text-[11px] rounded-lg gap-1.5 font-bold text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                                                                >
                                                                    <Download className="w-3 h-3" /> Unduh Berkas
                                                                </Button>
                                                            ) : (
                                                                <span className="text-zinc-400 italic">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                }

                                                let displayVal = "-";
                                                if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
                                                    displayVal = Array.isArray(rawVal) ? rawVal.join(", ") : String(rawVal);
                                                }

                                                return (
                                                    <td key={field.id} className="p-3.5 text-zinc-800 dark:text-zinc-200 font-medium max-w-[280px] truncate">
                                                        {displayVal}
                                                    </td>
                                                );
                                            })}

                                            <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                                                {resp.ip_address || "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {paginatedResponse?.responses && paginatedResponse.responses.last_page > 1 && (
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">
                                Halaman {paginatedResponse.responses.current_page} dari {paginatedResponse.responses.last_page}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="text-xs rounded-xl"
                                >
                                    Sebelumnya
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={page >= paginatedResponse.responses.last_page}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="text-xs rounded-xl"
                                >
                                    Berikutnya
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
