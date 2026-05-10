"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, FileText, Calendar, MapPin, Users, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function SuratTugasVerificationPage() {
    const params = useParams();
    const id = params.id as string;

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['verify-st', id],
        queryFn: async () => {
            const res = await api.get(`/surat-tugas/verify/${id}`);
            return res.data;
        },
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-2xl shadow-black/5 animate-pulse border border-zinc-100 dark:border-zinc-800">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-8 shadow-inner" />
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mx-auto mb-4" />
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-1/2 mx-auto mb-10" />
                    <div className="space-y-5">
                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !data?.valid) {
        const errorMsg = (error as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message || "Dokumen tidak terdaftar di dalam database resmi BKSDA.";

        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-[2rem] p-8 shadow-2xl shadow-red-500/10 text-center animate-in zoom-in-95 duration-500">

                    <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-[12px] ring-red-50 dark:ring-red-500/5">
                        <XCircle className="w-12 h-12" />
                    </div>

                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">VERIFIKASI GAGAL</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">{errorMsg}</p>

                    <div className="p-4 bg-red-50/50 dark:bg-red-500/10 rounded-2xl flex items-start gap-3 text-left text-sm text-red-800 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
                        <p className="font-medium">Peringatan: Jika Anda disodorkan dokumen fisik dengan Barcode ini, ada kemungkinan itu adalah pemalsuan hukum. Harap hubungi layanan aduan BKSDA.</p>
                    </div>
                </div>
            </div>
        );
    }

    const detail = data.data;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-6">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-emerald-500/10 animate-in slide-in-from-bottom-6 duration-700 fade-in">

                <div className="text-center mb-10 border-b border-zinc-100 dark:border-zinc-800/80 pb-10">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-[12px] ring-emerald-50 dark:ring-emerald-500/5 shadow-inner">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-3 uppercase">Dokumen Sah</h1>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">
                        Terverifikasi BKSDA
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Nomor Surat / Maksud Perjalanan</p>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detail.nomor_surat || 'Tunggu Penomoran Resmi'}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{detail.maksud_tujuan}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Masa Berlaku Operasional</p>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detail.tanggal_berlaku}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Titik Tujuan / Lokasi Penugasan</p>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detail.tempat_tujuan}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Daftar Personil Yang Diberangkatkan</p>
                            <ul className="space-y-2 mt-3">
                                {detail.personil.map((nama: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        {nama}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t-2 border-dashed border-zinc-100 dark:border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                        Sistem Terintegrasi SuperApp BKSDA<br />
                        <span className="text-emerald-500">Pengecekan Otomatis Real-Time</span>
                    </p>
                </div>
            </div>
        </div>
    );
}



