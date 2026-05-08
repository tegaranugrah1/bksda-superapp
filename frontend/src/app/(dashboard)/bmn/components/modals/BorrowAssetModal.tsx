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
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Benturan sistem saat mengeksekusi rute pinjaman.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-gradient-to-r from-emerald-900/20 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400"><Handshake className="w-5 h-5" /></div>
                        <h2 className="text-lg font-bold text-white">Delegasi Peminjaman</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm">
                        <span className="text-zinc-500">Target Aset: </span>
                        <strong className="text-emerald-400 font-mono block truncate">{assetName}</strong>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">UUID Pegawai Peminjam <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input type="text" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="UUID Pegawai..." className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Tanggal Pinjam <span className="text-red-500">*</span></label>
                        <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Peruntukkan / Misi</label>
                        <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm resize-none" placeholder="Misal: Liputan evakuasi buaya..." />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Handshake className="w-5 h-5" />}
                        Sahkan Pemindahan Hak Guna
                    </button>
                </form>
            </div>
        </div>
    );
}
