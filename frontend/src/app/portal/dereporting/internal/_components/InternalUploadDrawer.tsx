"use client";

import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MasterItem {
    id: string;
    nama?: string;
    tahun?: string;
}

interface DrawerProps {
    open: boolean;
    onClose: () => void;
}

export default function InternalUploadDrawer({ open, onClose }: DrawerProps) {
    const queryClient = useQueryClient();

    const [bidangId, setBidangId] = useState("");
    const [jenisId, setJenisId] = useState("");
    const [kategoriId, setKategoriId] = useState("");
    const [jenisDataId, setJenisDataId] = useState("");
    const [tahunId, setTahunId] = useState("");
    const [judulLaporan, setJudulLaporan] = useState("");
    const [keterangan, setKeterangan] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: tahunList } = useQuery({
        queryKey: ["dr-master-tahun"],
        queryFn: async (): Promise<MasterItem[]> => (await api.get("/dereporting/master/tahun", { params: { paginate: "false" } })).data.data,
    });

    const { data: bidangList } = useQuery({
        queryKey: ["dr-master-bidang"],
        queryFn: async (): Promise<MasterItem[]> => (await api.get("/dereporting/master/bidang", { params: { paginate: "false" } })).data.data,
    });

    const { data: jenisList } = useQuery({
        queryKey: ["dr-master-jenis", bidangId],
        queryFn: async (): Promise<MasterItem[]> => (await api.get("/dereporting/master/jenis", { params: { bidang_id: bidangId, paginate: "false" } })).data.data,
        enabled: !!bidangId,
    });

    const { data: kategoriList } = useQuery({
        queryKey: ["dr-master-kategori", jenisId],
        queryFn: async (): Promise<MasterItem[]> => (await api.get("/dereporting/master/kategori", { params: { jenis_id: jenisId, paginate: "false" } })).data.data,
        enabled: !!jenisId,
    });

    const { data: jenisDataList } = useQuery({
        queryKey: ["dr-master-jenis-data", kategoriId],
        queryFn: async (): Promise<MasterItem[]> => (await api.get("/dereporting/master/jenis-data", { params: { kategori_id: kategoriId, paginate: "false" } })).data.data,
        enabled: !!kategoriId,
    });

    // Handler untuk reset kaskade dropdown
    const handleBidangChange = (val: string) => {
        setBidangId(val);
        setJenisId("");
        setKategoriId("");
        setJenisDataId("");
    };

    const handleJenisChange = (val: string) => {
        setJenisId(val);
        setKategoriId("");
        setJenisDataId("");
    };

    const handleKategoriChange = (val: string) => {
        setKategoriId(val);
        setJenisDataId("");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error("File laporan wajib dilampirkan."); return; }
        setIsSubmitting(true);

        try {
            const payload = new FormData();
            payload.append("tahun_id", tahunId);
            payload.append("bidang_id", bidangId);
            payload.append("jenis_id", jenisId);
            payload.append("kategori_id", kategoriId);
            payload.append("jenis_data_id", jenisDataId);
            payload.append("judul_laporan", judulLaporan);
            if (keterangan) payload.append("keterangan", keterangan);
            payload.append("file", file);

            await api.post("/dereporting/internals", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Laporan berhasil disandikan ke dalam brankas!");
            queryClient.invalidateQueries({ queryKey: ["dr-internals"] });
            onClose();
            setBidangId(""); setJenisId(""); setKategoriId(""); setJenisDataId("");
            setTahunId(""); setJudulLaporan(""); setKeterangan(""); setFile(null);
        } catch {
            toast.error("Gagal mengunggah laporan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto animate-in slide-in-from-right duration-300 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white">Unggah Laporan Baru</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Tahun *</label>
                        <select value={tahunId} onChange={(e) => setTahunId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500">
                            <option value="">— Pilih Tahun —</option>
                            {tahunList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.tahun}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Bidang *</label>
                        <select value={bidangId} onChange={(e) => handleBidangChange(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500">
                            <option value="">— Pilih Bidang —</option>
                            {bidangList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Jenis *</label>
                        <select value={jenisId} onChange={(e) => handleJenisChange(e.target.value)} disabled={!bidangId}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <option value="">— Pilih Jenis —</option>
                            {jenisList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Kategori *</label>
                        <select value={kategoriId} onChange={(e) => handleKategoriChange(e.target.value)} disabled={!jenisId}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <option value="">— Pilih Kategori —</option>
                            {kategoriList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Jenis Data *</label>
                        <select value={jenisDataId} onChange={(e) => setJenisDataId(e.target.value)} disabled={!kategoriId}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <option value="">— Pilih Jenis Data —</option>
                            {jenisDataList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Jenis *</label>
                        <select value={jenisId} onChange={(e) => setJenisId(e.target.value)} disabled={!bidangId}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40">
                            <option value="">— Pilih Jenis —</option>
                            {jenisList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Kategori *</label>
                        <select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} disabled={!jenisId}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40">
                            <option value="">— Pilih Kategori —</option>
                            {kategoriList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Jenis Data *</label>
                        <select value={jenisDataId} onChange={(e) => setJenisDataId(e.target.value)} disabled={!kategoriId}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40">
                            <option value="">— Pilih Jenis Data —</option>
                            {jenisDataList?.map((opt: MasterItem) => (
                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Judul Laporan *</label>
                        <input type="text" value={judulLaporan} onChange={(e) => setJudulLaporan(e.target.value)} maxLength={255}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Keterangan</label>
                        <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={3}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Berkas Laporan *</label>
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer file:transition-all" />
                    </div>

                    <button type="submit" disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-4">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {isSubmitting ? "Mengunci Dokumen..." : "Simpan ke Brankas"}
                    </button>
                </form>
            </div>
        </div>
    );
}
