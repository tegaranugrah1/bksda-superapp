"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    Download,
    User,
    Building2,
    Mail,
    Phone,
    FileText,
    Calendar,
    Loader2,
    FileSpreadsheet,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface EksternalReport {
    id: string;
    nama_pelapor: string;
    instansi: string | null;
    email: string | null;
    no_hp: string | null;
    judul_laporan: string;
    deskripsi: string | null;
    file_path: string | null;
    status: "Menunggu Tinjauan" | "Diterima" | "Ditolak" | string;
    created_at: string;
    updated_at: string;
}

export default function DeReportingEksternalDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const queryClient = useQueryClient();

    // Penarikan Detail Laporan
    const { data: report, isLoading, isError } = useQuery<EksternalReport>({
        queryKey: ["dr-eksternal-detail", id],
        queryFn: async () => {
            const res = await api.get(`/dereporting/eksternals/${id}`);
            return res.data.data;
        },
    });

    // Mutasi Perubahan Status Laporan
    const statusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            await api.put(`/dereporting/eksternals/${id}/status`, { status: newStatus });
        },
        onSuccess: (_, newStatus) => {
            toast.success(`Status laporan berhasil diubah menjadi: ${newStatus}`);
            queryClient.invalidateQueries({ queryKey: ["dr-eksternal-detail", id] });
            queryClient.invalidateQueries({ queryKey: ["dr-eksternals"] });
            queryClient.invalidateQueries({ queryKey: ["dr-dashboard-stats"] });
        },
        onError: () => {
            toast.error("Gagal mengubah status laporan.");
        },
    });

    // Handler Pengunduhan Berkas Bukti (Authenticated Stream)
    const handleDownload = async () => {
        if (!report) return;
        try {
            const res = await api.get(`/dereporting/eksternals/${id}/download`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${report.judul_laporan}_Bukti_Eksternal`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Berkas bukti berhasil diunduh.");
        } catch {
            toast.error("Gagal mengunduh berkas. Pastikan file tersedia di storage.");
        }
    };

    if (isLoading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm font-bold tracking-widest text-zinc-500 uppercase">
                    Memuat Rincian Laporan...
                </p>
            </div>
        );
    }

    if (isError || !report) {
        return (
            <div className="p-10 text-center space-y-4">
                <p className="text-zinc-500 text-sm">Laporan tidak ditemukan atau telah dihapus.</p>
                <Link
                    href="/dereporting/eksternal"
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
                </Link>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Diterima":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> Diterima
                    </span>
                );
            case "Ditolak":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircle className="w-4 h-4" /> Ditolak
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-4 h-4" /> Menunggu Tinjauan
                    </span>
                );
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigasi Kembali */}
            <div>
                <Link
                    href="/dereporting/eksternal"
                    className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Laporan Publik
                </Link>
            </div>

            {/* Header Laporan */}
            <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                            {report.judul_laporan}
                        </h1>
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        Diterima pada{" "}
                        {new Date(report.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}{" "}
                        pukul{" "}
                        {new Date(report.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}{" "}
                        WITA
                    </p>
                </div>
                <div>{getStatusBadge(report.status)}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Kolom Kiri: Profil & Kontak Pelapor */}
                <div className="space-y-6 md:col-span-1">
                    <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" /> Identitas Pelapor
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Nama</span>
                                <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm mt-0.5">
                                    {report.nama_pelapor}
                                </p>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Instansi / Lembaga</span>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                    {report.instansi || "Masyarakat Umum"}
                                </p>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Nomor Telepon / WhatsApp</span>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5 flex items-center gap-1.5 font-mono">
                                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                    {report.no_hp || "-"}
                                </p>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Email</span>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5 flex items-center gap-1.5 break-all">
                                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                    {report.email || "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Card Tindakan Petugas */}
                    <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-500" /> Tindakan Verifikasi
                        </h3>

                        <p className="text-xs text-zinc-500">
                            Perbarui status verifikasi pengaduan ini untuk rekapitulasi data.
                        </p>

                        <div className="space-y-2 pt-1">
                            <Button
                                type="button"
                                disabled={statusMutation.isPending || report.status === "Diterima"}
                                onClick={() => statusMutation.mutate("Diterima")}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-2 justify-center"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Tandai Diterima
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={statusMutation.isPending || report.status === "Ditolak"}
                                onClick={() => statusMutation.mutate("Ditolak")}
                                className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 rounded-xl text-xs font-bold gap-2 justify-center"
                            >
                                <XCircle className="w-4 h-4" /> Tandai Ditolak
                            </Button>

                            {report.status !== "Menunggu Tinjauan" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={statusMutation.isPending}
                                    onClick={() => statusMutation.mutate("Menunggu Tinjauan")}
                                    className="w-full text-zinc-500 hover:text-zinc-700 text-[11px] rounded-xl font-medium"
                                >
                                    Kembalikan ke Menunggu Tinjauan
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Kronologi Laporan & Bukti Berkas */}
                <div className="space-y-6 md:col-span-2">
                    {/* Kronologi */}
                    <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                        <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" /> Deskripsi & Kronologi Kasus
                        </h3>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                            {report.deskripsi || "Tidak ada deskripsi rinci yang disertakan oleh pelapor."}
                        </div>
                    </div>

                    {/* Bukti Lampiran Berkas */}
                    <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Berkas Bukti Lampiran
                        </h3>

                        {report.file_path ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                            {report.judul_laporan}_Bukti
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                            Tersimpan aman di brankas privat RustFS
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleDownload}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-2 shrink-0"
                                >
                                    <Download className="w-4 h-4" /> Unduh Berkas
                                </Button>
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400 italic">
                                Pelapor tidak menyertakan berkas bukti lampiran.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
