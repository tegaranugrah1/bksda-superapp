"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FileText, Plus, Download, Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import InternalUploadDrawer from "./_components/InternalUploadDrawer";

interface ReportData {
    id: string;
    judul_laporan: string;
    created_at: string;
    bidang?: { nama: string };
    uploader?: { nama_lengkap?: string; nip?: string };
}

interface ApiResponse {
    data: ReportData[];
    next_page_url?: string;
}

export default function DeReportingInternalPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Penarikan Data Laporan Internal
    const { data: response, isLoading } = useQuery({
        queryKey: ["dr-internals", debouncedSearch, page],
        queryFn: async (): Promise<ApiResponse> => {
            const res = await api.get("/dereporting/internals", {
                params: { search: debouncedSearch || undefined, page },
            });
            return res.data;
        },
        keepPreviousData: true,
    });

    // Fungsi Pengunduh Berkas Terproteksi (Authenticated Blob Download)
    const handleDownload = async (id: string, judul: string) => {
        try {
            const res = await api.get(`/dereporting/internals/${id}/download`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", judul + ".pdf");
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("Berkas berhasil ditarik dari brankas.");
        } catch {
            toast.error("Gagal mengunduh berkas. Pastikan file masih tersedia.");
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-violet-500" /> Laporan Internal
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Arsip dokumen resmi yang diunggah pegawai BKSDA.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Pencarian */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <input type="text" placeholder="Cari judul laporan..." value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all w-56 placeholder:text-zinc-600" />
                    </div>
                    {/* Tombol Unggah */}
                    <button onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all">
                        <Plus className="w-4 h-4" /> Unggah Baru
                    </button>
                </div>
            </div>

            {/* Tabel Data */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Tanggal & Judul</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Bidang</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Pengunggah</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-12 text-center text-violet-500">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                    <span className="text-sm font-bold tracking-widest uppercase">Membongkar Lemari Arsip...</span>
                                </td></tr>
                            ) : response?.data?.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-zinc-500">
                                    <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                                    Belum ada laporan internal.
                                </td></tr>
                            ) : (
                                response?.data?.map((report: ReportData) => (
                                    <tr key={report.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm max-w-[280px] truncate">{report.judul_laporan}</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">{new Date(report.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-1 rounded-lg border border-violet-500/20 font-medium">
                                                {report.bidang?.nama || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-zinc-300">{report.uploader?.nama_lengkap || "Sistem"}</p>
                                            <p className="text-[10px] text-zinc-600 font-mono">{report.uploader?.nip}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleDownload(report.id, report.judul_laporan)}
                                                className="p-2 hover:bg-violet-500/10 rounded-lg transition-colors group" title="Unduh Berkas">
                                                <Download className="w-4 h-4 text-zinc-500 group-hover:text-violet-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer Pagination */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Hal. {page}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Drawer Formulir Unggah */}
            <InternalUploadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    );
}
