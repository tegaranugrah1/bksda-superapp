"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Wrench, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string | null;
    assetName: string;
}

export default function MaintenanceModal({ isOpen, onClose, assetId, assetName }: MaintenanceModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
    const [biaya, setBiaya] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [kondisiBaru, setKondisiBaru] = useState("");
    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post(`/bmn/assets/${assetId}/maintenances`, {
                tanggal_service: tanggal, biaya: parseFloat(biaya), deskripsi,
                kondisi_baru: kondisiBaru || undefined,
            });
            toast.success("Nota bengkel/perbaikan sukses terarsip.");
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Benturan sistem bengkel pusat.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-lg overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-accent-soft)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--ds-surface)] rounded-lg text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"><Wrench className="w-5 h-5" /></div>
                        <h2 className="text-xl font-bold text-[var(--ds-fg)]">Catatan Perbaikan Aset</h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="p-3 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg text-sm">
                        <span className="text-[var(--ds-fg-muted)]">Benda yang Diservis: </span>
                        <strong className="text-[var(--ds-accent-fg)] font-mono block truncate">{assetName}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Tgl Nota <span className="text-[var(--ds-status-danger-fg)]">*</span></label>
                            <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3 text-[var(--ds-fg)] focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Total Biaya Rp <span className="text-[var(--ds-status-danger-fg)]">*</span></label>
                            <input type="number" required value={biaya} onChange={(e) => setBiaya(e.target.value)} placeholder="0.00" className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3 text-[var(--ds-fg)] font-mono focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-sm" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Deskripsi Kerusakan <span className="text-[var(--ds-status-danger-fg)]">*</span></label>
                        <textarea required value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3 text-[var(--ds-fg)] focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-sm resize-none" placeholder="Misal: Ganti kampas rem dan oli..." />
                    </div>
                    <div className="space-y-2 p-3 border border-dashed border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] rounded-lg">
                        <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase block mb-1">Pemulihan Fisik (Opsional)</label>
                        <select value={kondisiBaru} onChange={(e) => setKondisiBaru(e.target.value)} className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-2 text-[var(--ds-fg)] focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-xs">
                            <option value="">-- Jangan Rubah Status Fisik --</option>
                            <option value="Baik">Pulih Total: Baik</option>
                            <option value="Rusak Ringan">Pulih Sebagian: Rusak Ringan</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                        Cairkan Tagihan &amp; Rekam Nota
                    </button>
                </form>
            </div>
        </div>
    );
}
