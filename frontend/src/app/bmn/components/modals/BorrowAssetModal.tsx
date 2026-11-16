"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Handshake, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string | null;
    assetName: string;
}

export default function BorrowAssetModal({ isOpen, onClose, assetId, assetName }: BorrowModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [employeeId, setEmployeeId] = useState("");
    const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
    const [keterangan, setKeterangan] = useState("");
    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId) return toast.error("Identitas peminjam belum diisi!");
        setIsLoading(true);
        try {
            await api.post(`/bmn/assets/${assetId}/loans`, { employee_id: employeeId, tanggal_pinjam: tanggal, keterangan });
            toast.success("Kontrak peminjaman aset berhasil disahkan.");
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-asset", assetId] });
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Benturan sistem saat mengeksekusi rute pinjaman.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-lg overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-accent-soft)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--ds-surface)] rounded-lg text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"><Handshake className="w-5 h-5" /></div>
                        <h2 className="text-xl font-bold text-[var(--ds-fg)]">Delegasi Peminjaman</h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="p-3 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg text-sm">
                        <span className="text-[var(--ds-fg-muted)]">Target Aset: </span>
                        <strong className="text-[var(--ds-accent-fg)] font-mono block truncate">{assetName}</strong>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase">ID Pegawai Peminjam <span className="text-[var(--ds-status-danger-fg)]">*</span></label>
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ds-fg-muted)]" />
                            <input type="text" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="ID Pegawai..." className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-[var(--ds-fg)] focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-sm" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Tanggal Pinjam <span className="text-[var(--ds-status-danger-fg)]">*</span></label>
                        <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3 text-[var(--ds-fg)] focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-sm" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Peruntukkan / Misi</label>
                        <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} className="w-full bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3 text-[var(--ds-fg)] focus:ring-1 focus:ring-[var(--ds-accent-fg)] outline-none text-sm resize-none" placeholder="Misal: Liputan evakuasi buaya..." />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Handshake className="w-5 h-5" />}
                        Sahkan Pemindahan Hak Guna
                    </button>
                </form>
            </div>
        </div>
    );
}
