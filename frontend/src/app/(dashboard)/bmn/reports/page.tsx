"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Archive, Download, FileSpreadsheet, Loader2, Wrench, Handshake } from "lucide-react";
import { toast } from "sonner";

export default function BmnReportsPage() {
    const [loadingAsset, setLoadingAsset] = useState(false);
    const [loadingLoan, setLoadingLoan] = useState(false);
    const [loadingMaintenance, setLoadingMaintenance] = useState(false);

    const executeDownload = async (endpoint: string, filename: string, setLoading: (s: boolean) => void) => {
        setLoading(true);
        try {
            const response = await api.get(endpoint, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success(`Dokumen BPK: ${filename} berhasil dicetak.`);
        } catch {
            toast.error("Gagal menarik laporan. Pastikan Backend mendukung eksportasi Excel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Archive className="w-8 h-8 text-emerald-500" /> Pusat Publikasi Laporan
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">Pencetakan dokumen legal untuk audit Eksternal BPK dan Inspektorat Wilayah.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-zinc-950/80 border border-emerald-500/20 p-6 rounded-3xl shadow-xl hover:border-emerald-500/50 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Buku Induk Aset Nasional</h3>
                        <p className="text-zinc-400 text-sm mb-6">Mencetak rekapitulasi seluruh wujud fisik Aset BKSDA beserta harga valuasinya.</p>
                    </div>
                    <button disabled={loadingAsset} onClick={() => executeDownload("/bmn/assets/export", "Katalog_Aset_BKSDA.xlsx", setLoadingAsset)} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                        {loadingAsset ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Tarik Buku Format Excel
                    </button>
                </div>

                <div className="bg-zinc-950/80 border border-amber-500/20 p-6 rounded-3xl shadow-xl hover:border-amber-500/50 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Handshake className="w-6 h-6 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Riwayat Pinjam Pakai</h3>
                        <p className="text-zinc-400 text-sm mb-6">Mencetak catatan historis serah-terima alat kepada pegawai.</p>
                    </div>
                    <button disabled={loadingLoan} onClick={() => executeDownload("/bmn/loans/export", "Lalu_Lintas_Peminjaman_BMN.xlsx", setLoadingLoan)} className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                        {loadingLoan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Tarik Buku Format Excel
                    </button>
                </div>

                <div className="bg-zinc-950/80 border border-blue-500/20 p-6 rounded-3xl shadow-xl hover:border-blue-500/50 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Wrench className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Arsip Biaya Pemeliharaan</h3>
                        <p className="text-zinc-400 text-sm mb-6">Mencetak rekap nota pengeluaran dana negara untuk servis barang.</p>
                    </div>
                    <button disabled={loadingMaintenance} onClick={() => executeDownload("/bmn/maintenances/export", "Laporan_Biaya_Servis_BMN.xlsx", setLoadingMaintenance)} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                        {loadingMaintenance ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Tarik Buku Format Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
