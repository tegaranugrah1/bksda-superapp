"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Printer, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import AssignmentLetterPreview from "./_components/AssignmentLetterPreview";

interface SuratTugasItem {
    id: string;
    nomor_surat?: string;
    maksud_tujuan: string;
    tempat_tujuan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: string;
}

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const STATUS_LABELS: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    completed: "Selesai",
};

export default function SuratTugasPage() {
    const [previewData, setPreviewData] = useState<SuratTugasItem | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["surat-tugas-list"],
        queryFn: async () => {
            const res = await api.get("/surat-tugas");
            return res.data;
        },
    });

    const items = data?.data ?? [];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Surat Tugas</h1>
                    <p className="text-zinc-400 mt-1 text-sm">Kelola pengajuan dan pencetakan Surat Tugas</p>
                </div>
                <Link
                    href="/surat-tugas/create"
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4" /> Buat Surat
                </Link>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left px-6 py-4 text-zinc-400 font-semibold uppercase text-xs tracking-widest">Nomor Surat</th>
                                <th className="text-left px-6 py-4 text-zinc-400 font-semibold uppercase text-xs tracking-widest">Maksud / Tugas</th>
                                <th className="text-left px-6 py-4 text-zinc-400 font-semibold uppercase text-xs tracking-widest">Tempat</th>
                                <th className="text-left px-6 py-4 text-zinc-400 font-semibold uppercase text-xs tracking-widest">Tanggal</th>
                                <th className="text-left px-6 py-4 text-zinc-400 font-semibold uppercase text-xs tracking-widest">Status</th>
                                <th className="text-right px-6 py-4 text-zinc-400 font-semibold uppercase text-xs tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-zinc-800 rounded animate-pulse w-24" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                                                <ChevronLeft className="w-8 h-8 text-zinc-600" />
                                            </div>
                                            <p className="font-medium">Belum ada surat tugas</p>
                                            <Link href="/surat-tugas/create" className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold underline underline-offset-2">
                                                Buat surat pertama
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item: SuratTugasItem) => (
                                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-zinc-200 font-semibold text-xs">
                                                {item.nomor_surat || (
                                                    <span className="text-zinc-500 italic">Belum ditentukan</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2">{item.maksud_tujuan}</p>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 text-xs">{item.tempat_tujuan}</td>
                                        <td className="px-6 py-4 text-zinc-400 text-xs">
                                            {item.tanggal_mulai} s/d {item.tanggal_selesai}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[item.status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                                                {STATUS_LABELS[item.status] ?? item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setPreviewData(item)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all text-xs font-semibold"
                                                    title="Pratinjau / Cetak"
                                                >
                                                    <Printer className="w-3.5 h-3.5" /> Cetak
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {previewData && (
                <AssignmentLetterPreview data={previewData} onClose={() => setPreviewData(null)} />
            )}
        </div>
    );
}
