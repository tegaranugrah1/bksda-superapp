"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Upload, Trash2, Plus, FileText, 
    Calendar as CalendarIcon, MapPin, Users, Send } from "lucide-react";
import { api } from "@/lib/api";
import { EmployeePicker, Employee } from "@/components/custom/EmployeePicker";
import { toast } from "sonner";

interface Personil {
    id: string;
    nama_lengkap: string;
    nip: string;
    peran: string;
}

export function AssignmentCreationTab({ onSuccess }: { onSuccess?: () => void }) {
    const [maksud_tujuan, setMaksudTujuan] = useState("");
    const [dasar_hukum, setDasarHukum] = useState("");
    const [tanggal_mulai, setTanggalMulai] = useState("");
    const [tanggal_selesai, setTanggalSelesai] = useState("");
    const [tempat_tujuan, setTempatTujuan] = useState("");
    const [personil, setPersonil] = useState<Personil[]>([]);
    const [fileSurat, setFileSurat] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append("maksud_tujuan", maksud_tujuan);
            if (dasar_hukum) formData.append("dasar_hukum", dasar_hukum);
            formData.append("tanggal_mulai", tanggal_mulai);
            formData.append("tanggal_selesai", tanggal_selesai);
            formData.append("tempat_tujuan", tempat_tujuan);

            personil.forEach((p, index) => {
                formData.append(`employees[${index}][id]`, p.id);
                formData.append(`employees[${index}][peran]`, p.peran);
            });

            if (fileSurat) {
                formData.append("file_surat", fileSurat);
            }

            const res = await api.post("/surat-tugas", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Surat Tugas berhasil dibuat dan menunggu otorisasi.");
            queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
            queryClient.invalidateQueries({ queryKey: ["surat-tugas-inbox"] });
            resetForm();
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            setIsSubmitting(false);
            toast.error(err.response?.data?.message || "Terjadi kesalahan saat menyimpan.");
        },
    });

    const resetForm = () => {
        setMaksudTujuan("");
        setDasarHukum("");
        setTanggalMulai("");
        setTanggalSelesai("");
        setTempatTujuan("");
        setPersonil([]);
        setFileSurat(null);
        setIsSubmitting(false);
    };

    const tambahPersonil = (emp: Employee) => {
        if (personil.find((p) => p.id === emp.id)) return;
        setPersonil([...personil, { id: emp.id, nama_lengkap: emp.nama_lengkap, nip: emp.nip, peran: "Anggota" }]);
    };

    const hapusPersonil = (id: string) => {
        setPersonil(personil.filter((p) => p.id !== id));
    };

    const updatePeran = (id: string, peran: string) => {
        setPersonil(personil.map((p) => (p.id === id ? { ...p, peran } : p)));
    };

    const isValid = maksud_tujuan && tanggal_mulai && tanggal_selesai && tempat_tujuan && personil.length > 0;

    return (
        <form onSubmit={mutation.mutate} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bagian Kiri: Detail Kegiatan */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Detail Kegiatan</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Maksud / Tujuan Penugasan</label>
                                <textarea
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[100px] resize-none"
                                    placeholder="Contoh: Melakukan koordinasi terkait pengelolaan kawasan konservasi..."
                                    value={maksud_tujuan}
                                    onChange={(e) => setMaksudTujuan(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Dasar Hukum (Opsional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="Nomor SK atau peraturan terkait"
                                    value={dasar_hukum}
                                    onChange={(e) => setDasarHukum(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Tanggal Mulai</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            value={tanggal_mulai}
                                            onChange={(e) => setTanggalMulai(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Tanggal Selesai</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            value={tanggal_selesai}
                                            onChange={(e) => setTanggalSelesai(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Tempat Tujuan</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Lokasi pelaksanaan tugas"
                                        value={tempat_tujuan}
                                        onChange={(e) => setTempatTujuan(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <Upload className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Dokumen Pendukung</h3>
                        </div>
                        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden group">
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => setFileSurat(e.target.files?.[0] || null)}
                                accept=".pdf"
                            />
                            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    {fileSurat ? fileSurat.name : "Klik untuk unggah draf PDF"}
                                </p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Maksimal 10MB</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bagian Kanan: Personil */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Personil Tugas</h3>
                            </div>
                            <span className="text-xs font-black bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-500">
                                {personil.length} Orang
                            </span>
                        </div>

                        <div className="mb-6">
                            <EmployeePicker onSelect={tambahPersonil} />
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {personil.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-100 dark:border-zinc-900">
                                    <Plus className="w-10 h-10 text-zinc-200 mb-3" />
                                    <p className="text-sm text-zinc-400">Pilih personil melalui pencarian di atas</p>
                                </div>
                            ) : (
                                personil.map((p) => (
                                    <div key={p.id} className="group flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-2xl hover:border-emerald-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                                                {p.nama_lengkap.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{p.nama_lengkap}</p>
                                                <p className="text-[10px] font-mono text-zinc-500">{p.nip}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select
                                                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-emerald-600 outline-none cursor-pointer"
                                                value={p.peran}
                                                onChange={(e) => updatePeran(p.id, e.target.value)}
                                            >
                                                <option value="Ketua Tim">Ketua Tim</option>
                                                <option value="Anggota">Anggota</option>
                                                <option value="Pendamping">Pendamping</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => hapusPersonil(p.id)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-6 mt-auto border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 flex items-center justify-center gap-2 group"
                            >
                                {isSubmitting ? (
                                    "Memproses..."
                                ) : (
                                    <>
                                        Kirim Pengajuan
                                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
