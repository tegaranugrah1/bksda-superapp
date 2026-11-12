"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReviewModalProps {
    reportId: string | null;
    judulLaporan: string;
    currentStatus?: string;
    currentNotes?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function InternalReportReviewModal({
    reportId,
    judulLaporan,
    currentStatus = "terkirim",
    currentNotes = "",
    onClose,
    onSuccess,
}: ReviewModalProps) {
    const [status, setStatus] = useState<"sesuai" | "perlu_revisi">(
        currentStatus === "perlu_revisi" ? "perlu_revisi" : "sesuai"
    );
    const [notes, setNotes] = useState(currentNotes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!reportId) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.put(`/dereporting/internals/${reportId}/review`, {
                review_status: status,
                review_notes: notes.trim() || null,
            });
            toast.success("Tinjauan laporan berhasil disimpan.");
            onSuccess();
            onClose();
        } catch {
            toast.error("Gagal memperbarui status tinjauan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl shadow-2xl p-5 overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)] mb-4">
                    <h3 className="font-bold text-sm text-[var(--ds-fg)]">Tinjau Laporan Internal</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-xs text-[var(--ds-fg-muted)] mb-3">
                    Laporan: <span className="font-medium text-[var(--ds-fg)]">{judulLaporan}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-2">
                            Hasil Tinjauan / Konfirmasi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setStatus("sesuai")}
                                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                    status === "sesuai"
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                        : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
                                }`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Sesuai / Diterima
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus("perlu_revisi")}
                                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                    status === "perlu_revisi"
                                        ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                                        : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
                                }`}
                            >
                                <AlertCircle className="w-4 h-4" />
                                Perlu Revisi
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1.5">
                            Catatan / Tindak Lanjut (Opsional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contoh: Berkas dan fisik data terkonfirmasi lengkap..."
                            rows={3}
                            className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl p-3 text-xs text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)]"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ds-border-subtle)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)]"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--ds-accent-solid)] text-white hover:opacity-90 disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Simpan Tinjauan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
