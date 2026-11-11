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
            <div data-module="surat-tugas" className="st-ui min-h-[80vh] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-[var(--ds-surface)] rounded-2xl p-8 shadow-sm shadow-black/5 animate-pulse border border-[var(--ds-border-subtle)]">
                    <div className="w-20 h-20 bg-[var(--ds-surface-muted)] rounded-full mx-auto mb-8 shadow-inner" />
                    <div className="h-6 bg-[var(--ds-surface-muted)] rounded w-2/3 mx-auto mb-4" />
                    <div className="h-3 bg-[var(--ds-surface-muted)] rounded w-1/2 mx-auto mb-10" />
                    <div className="space-y-5">
                        <div className="h-4 bg-[var(--ds-surface-muted)] rounded w-full" />
                        <div className="h-4 bg-[var(--ds-surface-muted)] rounded w-full" />
                        <div className="h-4 bg-[var(--ds-surface-muted)] rounded w-3/4" />
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !data?.valid) {
        const errorMsg = (error as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message || "Dokumen tidak terdaftar di dalam database resmi BKSDA.";

        return (
            <div data-module="surat-tugas" className="st-ui min-h-[80vh] flex items-center justify-center p-6">
                <div className="st-page-enter w-full max-w-md bg-[var(--ds-surface)] border border-[var(--ds-status-danger-border)] rounded-2xl p-8 shadow-sm text-center">

                    <div className="w-24 h-24 bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] rounded-full flex items-center justify-center mx-auto mb-6 ring-[12px] ring-[var(--ds-status-danger-border)]">
                        <XCircle className="w-12 h-12" />
                    </div>

                    <h1 className="text-2xl font-black text-[var(--ds-fg)] tracking-tight mb-2">VERIFIKASI GAGAL</h1>
                    <p className="text-[var(--ds-fg-muted)] mb-8 text-sm">{errorMsg}</p>

                    <div className="p-4 bg-[var(--ds-status-danger-bg)] rounded-2xl flex items-start gap-3 text-left text-sm text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)]">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
                        <p className="font-medium">Peringatan: Jika Anda disodorkan dokumen fisik dengan Barcode ini, ada kemungkinan itu adalah pemalsuan hukum. Harap hubungi layanan aduan BKSDA.</p>
                    </div>
                </div>
            </div>
        );
    }

    const detail = data.data;

    return (
        <div data-module="surat-tugas" className="st-ui min-h-[80vh] flex flex-col items-center justify-center py-12 px-6">
            <div className="st-page-enter w-full max-w-lg bg-[var(--ds-surface)] border border-[var(--ds-status-success-border)] rounded-2xl p-8 md:p-10 shadow-sm">

                <div className="text-center mb-10 border-b border-[var(--ds-border-subtle)] pb-10">
                    <div className="w-24 h-24 bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] rounded-full flex items-center justify-center mx-auto mb-6 ring-[12px] ring-[var(--ds-status-success-border)] shadow-inner">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-black text-[var(--ds-fg)] tracking-tighter mb-3 uppercase">Dokumen Sah</h1>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] text-xs font-bold uppercase tracking-widest">
                        Terverifikasi BKSDA
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-widest mb-1">Nomor Surat / Maksud Perjalanan</p>
                            <p className="font-bold text-[var(--ds-fg)] text-base">{detail.nomor_surat || 'Tunggu Penomoran Resmi'}</p>
                            <p className="text-sm text-[var(--ds-fg-muted)] mt-1 leading-relaxed">{detail.maksud_tujuan}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-widest mb-1">Masa Berlaku Operasional</p>
                            <p className="font-bold text-[var(--ds-fg)] text-base">{detail.tanggal_berlaku}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-widest mb-1">Titik Tujuan / Lokasi Penugasan</p>
                            <p className="font-bold text-[var(--ds-fg)] text-base">{detail.tempat_tujuan}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-widest mb-1">Daftar Personil Yang Diberangkatkan</p>
                            <ul className="space-y-2 mt-3">
                                {detail.personil.map((nama: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-[var(--ds-fg)] bg-[var(--ds-surface)] p-2.5 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-[var(--ds-status-success-fg)]" />
                                        {nama}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t-2 border-dashed border-[var(--ds-border-subtle)] text-center">
                    <p className="text-xs text-[var(--ds-fg-muted)] uppercase tracking-widest font-semibold">
                        Sistem Terintegrasi SuperApp BKSDA<br />
                        <span className="text-[var(--ds-status-success-fg)]">Pengecekan Otomatis Real-Time</span>
                    </p>
                </div>
            </div>
        </div>
    );
}



