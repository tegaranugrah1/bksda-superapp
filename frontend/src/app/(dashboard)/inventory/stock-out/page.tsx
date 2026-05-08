"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowUpFromLine,
    Send,
    Loader2,
    PackageMinus,
    CheckCircle2,
    AlertOctagon,
} from "lucide-react";
import Link from "next/link";

interface IOffice {
    id: string;
    nama_kantor: string;
}

interface IItem {
    id: string;
    nama_barang: string;
}

interface IEmployee {
    id: string;
    nama_lengkap: string;
    nip: string;
}

export default function StockOutPage() {
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [form, setForm] = useState({
        office_id: "",
        item_id: "",
        employee_id: "",
        quantity: "",
        keterangan: "",
    });

    const { data: offices } = useQuery<IOffice[]>({
        queryKey: ["offices-dropdown"],
        queryFn: async () => (await api.get("/inventory/offices")).data.data,
    });

    const { data: items } = useQuery<IItem[]>({
        queryKey: ["items-dropdown"],
        queryFn: async () => (await api.get("/inventory/items")).data.data,
    });

    const { data: employees } = useQuery<IEmployee[]>({
        queryKey: ["employees-dropdown"],
        queryFn: async () => (await api.get("/kepegawaian/employees")).data.data,
    });

    const mutation = useMutation({
        mutationFn: async (payload: typeof form) => {
            setErrorMessage(null);
            const res = await api.post("/inventory/stock/out", {
                ...payload,
                quantity: Number(payload.quantity),
            });
            return res.data;
        },
        onSuccess: () => {
            setIsSuccess(true);
            setForm({
                office_id: "",
                item_id: "",
                employee_id: "",
                quantity: "",
                keterangan: "",
            });
            queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
            setTimeout(() => setIsSuccess(false), 4000);
        },
        onError: (error: { response?: { data?: { message?: string; error?: string } } }) => {
            const serverMessage =
                error.response?.data?.message || error.response?.data?.error;
            setErrorMessage(
                serverMessage || "Terjadi kesalahan fatal. Sistem menolak mengurangi saldo."
            );
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !form.office_id ||
            !form.item_id ||
            !form.employee_id ||
            !form.quantity
        ) {
            return setErrorMessage(
                "Kantor, Barang, Nama Pegawai, dan Jumlah mutlak harus diisi!"
            );
        }
        mutation.mutate(form);
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                    <ArrowUpFromLine className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Distribusi Keluar
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Serahkan fisik barang logistik kepada pegawai yang membutuhkan.
                    </p>
                </div>
            </div>

            {isSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                        <p className="font-bold">Distribusi Sah!</p>
                        <p className="text-sm text-emerald-500/80">
                            Barang telah berhasil berpindah tangan dan saldo sistem sukses
                            dipotong.
                        </p>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 animate-in fade-in duration-300">
                    <AlertOctagon className="w-6 h-6 shrink-0" />
                    <div>
                        <p className="font-bold">Operasi Digagalkan</p>
                        <p className="text-sm text-red-500/80">{errorMessage}</p>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>

                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">
                                Tarik dari Gudang/Kantor{" "}
                                <span className="text-orange-500">*</span>
                            </label>
                            <select
                                value={form.office_id}
                                onChange={(e) =>
                                    setForm({ ...form, office_id: e.target.value })
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none"
                            >
                                <option value="">-- Lokasi Pengambilan --</option>
                                {offices?.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.nama_kantor}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">
                                Aset/Barang yang Diminta{" "}
                                <span className="text-orange-500">*</span>
                            </label>
                            <select
                                value={form.item_id}
                                onChange={(e) =>
                                    setForm({ ...form, item_id: e.target.value })
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none"
                            >
                                <option value="">-- Tentukan Barang --</option>
                                {items?.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.nama_barang}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-300">
                            Serahkan Kepada (Pegawai Penerima){" "}
                            <span className="text-orange-500">*</span>
                        </label>
                        <select
                            value={form.employee_id}
                            onChange={(e) =>
                                setForm({ ...form, employee_id: e.target.value })
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 text-orange-100 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none"
                        >
                            <option value="">-- Pilih Pegawai BKSDA --</option>
                            {employees?.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.nama_lengkap} (NIP: {emp.nip})
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-zinc-500">
                            Mencakup nama dari Modul Kepegawaian (HRIS).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">
                                Jumlah Dikeluarkan{" "}
                                <span className="text-orange-500">*</span>
                            </label>
                            <div className="relative">
                                <PackageMinus className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                                <input
                                    type="number"
                                    min="1"
                                    value={form.quantity}
                                    onChange={(e) =>
                                        setForm({ ...form, quantity: e.target.value })
                                    }
                                    placeholder="Contoh: 2"
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">
                                Tujuan / Alasan Pemakaian
                            </label>
                            <input
                                type="text"
                                value={form.keterangan}
                                onChange={(e) =>
                                    setForm({ ...form, keterangan: e.target.value })
                                }
                                placeholder="Contoh: Keperluan Rapat Koordinasi"
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    <hr className="border-zinc-800 my-4" />

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/inventory"
                            className="px-6 py-3 rounded-xl font-semibold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-all"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-6 py-3 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/20"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            {mutation.isPending
                                ? "Memverifikasi Saldo..."
                                : "Keluarkan Barang"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
