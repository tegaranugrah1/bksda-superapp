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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-linear-to-r from-blue-900/20 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><Wrench className="w-5 h-5" /></div>
                        <h2 className="text-lg font-bold text-white">Catatan Perbaikan Aset</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm">
                        <span className="text-zinc-500">Benda yang Diservis: </span>
                        <strong className="text-blue-400 font-mono block truncate">{assetName}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase">Tgl Nota <span className="text-red-500">*</span></label>
                            <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase">Total Biaya Rp <span className="text-red-500">*</span></label>
                            <input type="number" required value={biaya} onChange={(e) => setBiaya(e.target.value)} placeholder="0.00" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Deskripsi Kerusakan <span className="text-red-500">*</span></label>
                        <textarea required value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" placeholder="Misal: Ganti kampas rem dan oli..." />
                    </div>
                    <div className="space-y-1.5 p-3 border border-dashed border-zinc-700 bg-zinc-900/30 rounded-xl">
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Pemulihan Fisik (Opsional)</label>
                        <select value={kondisiBaru} onChange={(e) => setKondisiBaru(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white focus:ring-1 focus:ring-blue-500 outline-none text-xs">
                            <option value="">-- Jangan Rubah Status Fisik --</option>
                            <option value="Baik">Pulih Total: Baik</option>
                            <option value="Rusak Ringan">Pulih Sebagian: Rusak Ringan</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                        Cairkan Tagihan &amp; Rekam Nota
                    </button>
                </form>
            </div>
        </div>
    );
}
