"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

interface ApprovalDialogProps {
    suratId: string;
    onClose: () => void;
}

interface ApiError extends Error {
    response?: { data?: { message?: string } };
}

export default function ApprovalDialog({ suratId, onClose }: ApprovalDialogProps) {
    const [actionType, setActionType] = useState<"idle" | "approve" | "reject">("idle");
    const [nomorSurat, setNomorSurat] = useState("");
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (payload: { status: string; nomor_surat?: string }) => {
            const res = await api.put(`/surat-tugas/${suratId}/status`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["surat-tugas-list"] });
            onClose();
        },
        onError: (err: unknown) => {
            const e = err as ApiError;
            alert(e.response?.data?.message || "Terjadi kesalahan sistem.");
        },
    });

    const handleConfirm = () => {
        if (actionType === "approve" && !nomorSurat.trim()) {
            alert("Nomor Surat Resmi WAJIB diisi saat melakukan persetujuan!");
            return;
        }
        mutation.mutate({
            status: actionType === "approve" ? "approved" : "rejected",
            ...(actionType === "approve" && { nomor_surat: nomorSurat }),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">

                <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Otorisasi Surat</h2>
                </div>

                {actionType === "idle" && (
                    <div className="space-y-3">
                        <p className="text-zinc-400 text-sm mb-6">Silakan pilih tindakan otoritatif Anda terhadap pengajuan surat tugas ini.</p>
                        <button
                            onClick={() => setActionType("approve")}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold transition-all"
                        >
                            <Check className="w-5 h-5" /> Setujui Dokumen
                        </button>
                        <button
                            onClick={() => setActionType("reject")}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold transition-all"
                        >
                            <X className="w-5 h-5" /> Tolak Pengajuan
                        </button>
                    </div>
                )}

                {actionType === "approve" && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-2">
                                Masukkan Nomor Surat Resmi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: SK.123/BKSDA/2026"
                                value={nomorSurat}
                                onChange={(e) => setNomorSurat(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-zinc-500 mt-2">Nomor ini akan tercetak permanen di PDF dan QR Code.</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setActionType("idle")}
                                className="flex-1 py-3 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl font-semibold"
                            >
                                Kembali
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={mutation.isPending}
                                className="flex-1 py-3 text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-semibold shadow-lg shadow-emerald-500/20"
                            >
                                {mutation.isPending ? "Memproses..." : "Sahkan Surat"}
                            </button>
                        </div>
                    </div>
                )}

                {actionType === "reject" && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <p className="text-red-400 bg-red-500/10 p-4 rounded-xl text-sm border border-red-500/20">
                            Anda yakin ingin menolak permohonan ini? Surat yang ditolak tidak bisa dipulihkan kembali statusnya.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setActionType("idle")}
                                className="flex-1 py-3 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl font-semibold"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={mutation.isPending}
                                className="flex-1 py-3 text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-semibold shadow-lg shadow-red-500/20"
                            >
                                {mutation.isPending ? "Memproses..." : "Ya, Tolak"}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
