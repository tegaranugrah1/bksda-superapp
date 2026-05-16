"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowDownToLine,
    Save,
    Loader2,
    PackagePlus,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface IOffice {
    id: string;
    nama_kantor: string;
}

interface IItem {
    id: string;
    nama_barang: string;
    satuan: string;
}

export default function StockInPage() {
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);

    const [form, setForm] = useState({
        office_id: "",
        item_id: "",
        quantity: "",
        keterangan: "",
    });

    const { data: offices } = useQuery<IOffice[]>({
        queryKey: ["offices-dropdown"],
        queryFn: async () => {
            const res = await api.get("/inventory/offices");
            return res.data.data;
        },
    });

    const { data: items } = useQuery<IItem[]>({
        queryKey: ["items-dropdown"],
        queryFn: async () => {
            const res = await api.get("/inventory/items");
            return res.data.data;
        },
    });

    const mutation = useMutation({
        mutationFn: async (payload: typeof form) => {
            const res = await api.post("/inventory/stock/in", {
                ...payload,
                quantity: Number(payload.quantity),
            });
            return res.data;
        },
        onSuccess: () => {
            setIsSuccess(true);
            setForm({ office_id: "", item_id: "", quantity: "", keterangan: "" });
            queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
            setTimeout(() => setIsSuccess(false), 3000);
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            alert(error.response?.data?.message || "Gagal mencatat logistik masuk!");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.office_id || !form.item_id || !form.quantity) {
            return alert("Kantor, Barang, dan Jumlah wajib diisi!");
        }
        mutation.mutate(form);
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <ArrowDownToLine className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                        Penerimaan Logistik
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Catat pasokan barang baru yang masuk ke jaringan kantor BKSDA.
                    </p>
                </div>
            </div>

            {isSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                        <p className="font-bold">Mutasi Sukses!</p>
                        <p className="text-sm text-emerald-500/80">
                            Barang telah didistribusikan ke dalam saldo fisik kantor.
                        </p>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-lg dark:shadow-2xl relative overflow-hidden"
            >
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>

                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Kantor Tujuan <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.office_id}
                                onChange={(e) =>
                                    setForm({ ...form, office_id: e.target.value })
                                }
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">-- Pilih Lokasi Kantor --</option>
                                {offices?.map((office) => (
                                    <option key={office.id} value={office.id}>
                                        {office.nama_kantor}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Nama Barang <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.item_id}
                                onChange={(e) =>
                                    setForm({ ...form, item_id: e.target.value })
                                }
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">-- Pilih Master Barang --</option>
                                {items?.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nama_barang} ({item.satuan})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Jumlah (Kuantitas) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <PackagePlus className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                                <input
                                    type="number"
                                    min="1"
                                    value={form.quantity}
                                    onChange={(e) =>
                                        setForm({ ...form, quantity: e.target.value })
                                    }
                                    placeholder="Contoh: 50"
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Catatan Pemasok / Bukti Nota
                            </label>
                            <input
                                type="text"
                                value={form.keterangan}
                                onChange={(e) =>
                                    setForm({ ...form, keterangan: e.target.value })
                                }
                                placeholder="Contoh: Pembelian via SIPLah Bos Afirmasi"
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <hr className="border-zinc-200 dark:border-zinc-800 my-4" />

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/inventory"
                            className="px-6 py-3 rounded-xl font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {mutation.isPending ? "Merekam ke Server..." : "Simpan Mutasi Masuk"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
