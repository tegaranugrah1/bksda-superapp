"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X, Download, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PreviewModalProps {
    reportId: string | null;
    judulLaporan: string;
    onClose: () => void;
    onReadConfirmed?: () => void;
}

export default function InternalReportPreviewModal({
    reportId,
    judulLaporan,
    onClose,
    onReadConfirmed,
}: PreviewModalProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reportId) return;

        let activeUrl: string | null = null;
        let isMounted = true;

        const loadPreview = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get(`/dereporting/internals/${reportId}/preview`, {
                    responseType: "blob",
                });
                if (isMounted) {
                    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
                    activeUrl = url;
                    setBlobUrl(url);
                    if (onReadConfirmed) {
                        onReadConfirmed();
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const status = (err as { response?: { status?: number } })?.response?.status;
                    if (status === 403) {
                        setError("Anda tidak memiliki hak otorisasi untuk membuka berkas ini.");
                    } else {
                        setError("Gagal memuat pratinjau dokumen dari brankas server.");
                    }
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadPreview();

        return () => {
            isMounted = false;
            if (activeUrl) {
                window.URL.revokeObjectURL(activeUrl);
            }
        };
    }, [reportId, onReadConfirmed]);

    if (!reportId) return null;

    const handleDownload = async () => {
        try {
            const res = await api.get(`/dereporting/internals/${reportId}/download`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${judulLaporan || "Laporan_Internal"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Dokumen berhasil diunduh.");
        } catch {
            toast.error("Gagal mengunduh dokumen.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl h-[90vh] bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header Modal */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]">
                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                        <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-sm text-[var(--ds-fg)] truncate">
                                {judulLaporan}
                            </h3>
                            <p className="text-[11px] text-[var(--ds-fg-muted)]">
                                Pratinjau Dokumen Kedinasan (Brankas Privat)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {blobUrl && (
                            <>
                                <a
                                    href={blobUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors"
                                    title="Buka di Tab Baru"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Tab Baru
                                </a>
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--ds-accent-solid)] text-white hover:opacity-90 transition-opacity"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Unduh
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] transition-colors"
                            aria-label="Tutup"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Konten Viewer PDF */}
                <div className="flex-1 bg-zinc-900/90 relative flex items-center justify-center overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-2 text-white">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-accent-fg)]" />
                            <p className="text-xs font-semibold tracking-wider uppercase opacity-80">
                                Membuka Berkas dari Brankas...
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-6 text-center max-w-md bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl shadow-lg m-4">
                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">
                                Akses Berkas Ditolak / Gagal
                            </p>
                            <p className="text-xs text-[var(--ds-fg-muted)] mb-4">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] hover:opacity-80"
                            >
                                Kembali
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && blobUrl && (
                        <iframe
                            src={blobUrl}
                            className="w-full h-full border-0"
                            title={`Pratinjau ${judulLaporan}`}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
