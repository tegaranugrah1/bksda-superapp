"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowLeft,
    Download,
    TableProperties,
    Loader2,
    Calendar,
    FileText,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FormField {
    id: string;
    label: string;
    type: string;
}

interface DynamicFormDetail {
    id: string;
    title: string;
    slug: string;
    description: string | null;
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

export default function DeReportingFormResponsesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const [page, setPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);

    // Penarikan Tanggapan
    const { data: response, isLoading } = useQuery<ApiResponse>({
        queryKey: ["dr-form-responses", id, page],
        queryFn: async () => {
            const res = await api.get(`/dereporting/forms/${id}/responses`, {
                params: { page },
            });
            return res.data;
        },
    });

    const form = response?.form;
    const items = response?.responses?.data || response?.data || [];
    const fields = form?.fields || [];
    const totalResponses = response?.responses?.total ?? items.length;

    // Handler Ekspor CSV (Native Stream)
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

            {/* Header Formulir & Aksi Ekspor */}
            <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                        <TableProperties className="w-6 h-6 text-violet-500" />
                        Tanggapan: {form?.title || "Formulir"}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
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

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={isExporting || totalResponses === 0}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Ekspor ke CSV / Excel
                    </Button>
                </div>
            </div>

            {/* Tabel Tanggapan Dinamis (Spreadsheet Style) */}
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan={fields.length + 3} className="p-16 text-center text-violet-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            Memuat Rekap Tanggapan...
                                        </span>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={fields.length + 3} className="p-16 text-center text-zinc-500">
                                        <TableProperties className="w-8 h-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                                        Belum ada tanggapan masuk untuk formulir ini.
                                    </td>
                                </tr>
                            ) : (
                                items.map((resp, idx) => (
                                    <tr key={resp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-3.5 text-center text-zinc-400 font-mono">
                                            {idx + 1}
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
            </div>
        </div>
    );
}
