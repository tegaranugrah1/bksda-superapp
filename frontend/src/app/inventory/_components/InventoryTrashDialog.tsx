"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Loader2, AlertTriangle, PackageSearch } from "lucide-react";

interface ITrashedItem {
    id: string;
    kode_barang: string;
    nama_barang: string;
    deleted_at: string;
}

interface ITrashResponse {
    data: ITrashedItem[];
}

export function InventoryTrashDialog({ onActionSuccess }: { onActionSuccess: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    // 1. Fetch Trash Data
    const { data: response, isLoading } = useQuery<ITrashResponse>({
        queryKey: ["inventory-items-trash"],
        queryFn: async () => {
            const res = await api.get("/inventory/items/trash");
            return res.data;
        },
        enabled: isOpen,
    });

    // 2. Restore Mutation
    const restoreMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/inventory/items/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory-items-trash"] });
            queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
            onActionSuccess();
            alert("Barang berhasil dikembalikan ke katalog!");
        },
    });

    // 3. Force Delete Mutation
    const forceDeleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/inventory/items/${id}/force`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory-items-trash"] });
            alert("Barang telah dihapus secara permanen.");
        },
    });

    const handleRestore = (id: string) => {
        if (confirm("Kembalikan barang ini ke katalog aktif?")) {
            restoreMutation.mutate(id);
        }
    };

    const handleForceDelete = (id: string) => {
        if (confirm("PERINGATAN: Barang ini akan dihapus permanen dan tidak bisa dikembalikan. Lanjutkan?")) {
            forceDeleteMutation.mutate(id);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-red-400 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg"
                >
                    <Trash2 className="w-4 h-4" /> Tempat Sampah
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-white rounded-3xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/50">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <Trash2 className="w-6 h-6 text-red-500" /> Tempat Sampah Katalog
                    </DialogTitle>
                    <p className="text-zinc-500 text-sm mt-1">
                        Daftar barang yang telah dihapus sementara. Anda bisa memulihkan atau menghapusnya secara permanen.
                    </p>
                </DialogHeader>

                <div className="max-h-[400px] overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-emerald-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-zinc-500 text-sm">Membuka Tempat Sampah...</span>
                        </div>
                    ) : response?.data?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-center">
                            <PackageSearch className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium text-zinc-400">Tempat Sampah Kosong</p>
                            <p className="text-xs mt-1">Tidak ada barang yang didelete sementara.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {response?.data?.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors group"
                                >
                                    <div>
                                        <p className="text-xs font-mono text-zinc-500">{item.kode_barang}</p>
                                        <p className="font-bold text-zinc-200">{item.nama_barang}</p>
                                        <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-tighter">
                                            Dihapus pada: {new Date(item.deleted_at).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRestore(item.id)}
                                            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                            title="Pulihkan"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleForceDelete(item.id)}
                                            className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Hapus Permanen"
                                        >
                                            <AlertTriangle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="text-zinc-500 hover:text-white"
                    >
                        Tutup
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
