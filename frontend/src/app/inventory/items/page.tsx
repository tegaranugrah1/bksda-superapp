"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PackageSearch, Plus, Loader2, Save, Trash2, Edit, Download } from "lucide-react";
import { InventoryImportDialog } from "../_components/InventoryImportDialog";
import { InventoryTrashDialog } from "../_components/InventoryTrashDialog";
import { Button } from "@/components/ui/button";

interface IItem {
    id: string;
    kode_barang: string;
    nama_barang: string;
    satuan: string;
    min_stock: number;
}

interface IItemsResponse {
    data: IItem[];
    current_page: number;
    last_page: number;
}

export default function ItemsManagementPage() {
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        // Catatan: UUID dummy sementara — sesuaikan dengan UUID Kategori dari Database
        category_id: "00000000-0000-0000-0000-000000000000",
        kode_barang: "",
        nama_barang: "",
        satuan: "Pcs",
        min_stock: "5",
    });

    // 1. Tarik Data Tabel (Data Grid)
    const { data: response, isLoading } = useQuery<IItemsResponse>({
        queryKey: ["inventory-items"],
        queryFn: async () => {
            const res = await api.get("/inventory/items");
            return res.data;
        },
    });

    // 2. Mesin Penambah Barang (Mutasi Server)
    const mutation = useMutation({
        mutationFn: async (payload: typeof form) => {
            const finalPayload = { ...payload, min_stock: Number(payload.min_stock) };
            const res = await api.post("/inventory/items", finalPayload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
            setForm({ ...form, kode_barang: "", nama_barang: "" });
            alert("Barang baru berhasil masuk katalog!");
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            alert(err.response?.data?.message || "Gagal mendaftarkan barang.");
        },
    });

    // 3. Mesin Penghapus Barang (Soft Delete)
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/inventory/items/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
            alert("Barang berhasil dipindahkan ke tempat sampah.");
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            alert(err.response?.data?.message || "Gagal menghapus barang.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.kode_barang || !form.nama_barang)
            return alert("Kode dan Nama wajib diisi!");
        mutation.mutate(form);
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <PackageSearch className="w-8 h-8 text-emerald-500" /> Katalog Barang
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Daftarkan dan kelola master rujukan logistik negara.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <InventoryTrashDialog onActionSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventory-items"] })} />
                    <InventoryImportDialog onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventory-items"] })} />
                    <Button
                        variant="outline"
                        onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/inventory/export/items`, "_blank")}
                        className="flex items-center gap-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg"
                    >
                        <Download className="w-4 h-4 text-blue-500" /> Ekspor Excel
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* KOLOM KIRI: FORMULIR TAMBAH CEPAT */}
                <div className="lg:col-span-1">
                    <form
                        onSubmit={handleSubmit}
                        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl sticky top-6"
                    >
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-500" /> Barang Baru
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Kategori ID
                                </label>
                                <input
                                    type="text"
                                    value={form.category_id}
                                    onChange={(e) =>
                                        setForm({ ...form, category_id: e.target.value })
                                    }
                                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-2.5 focus:outline-none font-mono text-sm"
                                    placeholder="UUID Kategori"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">
                                    Isi dengan UUID Kategori dari Database Supabase Anda.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Kode Barang (SKU)
                                </label>
                                <input
                                    type="text"
                                    value={form.kode_barang}
                                    onChange={(e) =>
                                        setForm({ ...form, kode_barang: e.target.value })
                                    }
                                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                                    placeholder="Misal: ATK-001"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Nama Barang
                                </label>
                                <input
                                    type="text"
                                    value={form.nama_barang}
                                    onChange={(e) =>
                                        setForm({ ...form, nama_barang: e.target.value })
                                    }
                                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                                    placeholder="Kertas HVS A4 80gr"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Satuan
                                    </label>
                                    <select
                                        value={form.satuan}
                                        onChange={(e) =>
                                            setForm({ ...form, satuan: e.target.value })
                                        }
                                        className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 appearance-none"
                                    >
                                        <option value="Pcs">Pcs (Buah)</option>
                                        <option value="Rim">Rim</option>
                                        <option value="Box">Box</option>
                                        <option value="Unit">Unit</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Batas Min.
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.min_stock}
                                        onChange={(e) =>
                                            setForm({ ...form, min_stock: e.target.value })
                                        }
                                        className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full mt-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Simpan ke Katalog
                        </button>
                    </form>
                </div>

                {/* KOLOM KANAN: TABEL DATA GRID */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-950/50 border-b border-zinc-800">
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                            SKU
                                        </th>
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                            Nama Logistik
                                        </th>
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">
                                            Batas Aman
                                        </th>
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-emerald-500">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                                <span className="text-sm font-medium text-zinc-500">
                                                    Menarik Data Tabel...
                                                </span>
                                            </td>
                                        </tr>
                                    ) : response?.data?.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="p-10 text-center text-zinc-500"
                                            >
                                                Tidak ada barang yang terdaftar di dalam katalog.
                                            </td>
                                        </tr>
                                    ) : (
                                        response?.data?.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-emerald-500/5 transition-colors group"
                                            >
                                                <td className="p-4 font-mono text-sm text-zinc-300">
                                                    {item.kode_barang}
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-zinc-200">
                                                        {item.nama_barang}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">
                                                        {item.satuan}
                                                    </p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold border border-zinc-700">
                                                        Min {item.min_stock}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Yakin ingin membuang ${item.nama_barang} ke tempat sampah?`)) {
                                                                    deleteMutation.mutate(item.id);
                                                                }
                                                            }}
                                                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-zinc-950/30 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-medium">
                            Menampilkan halaman {response?.current_page || 1} dari{" "}
                            {response?.last_page || 1}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
