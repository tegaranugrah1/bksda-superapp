"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Upload, Trash2, Plus, FileText, Info } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { EmployeePicker, Employee } from "@/components/custom/EmployeePicker";

interface ApiError extends Error {
    response?: { data?: { message?: string } };
}

interface Personil {
    id: string;
    nama_lengkap: string;
    nip: string;
    peran: string;
}

export default function CreateSuratTugasPage() {
    const router = useRouter();

    const [maksud_tujuan, setMaksudTujuan] = useState("");
    const [dasar_hukum, setDasarHukum] = useState("");
    const [tanggal_mulai, setTanggalMulai] = useState("");
    const [tanggal_selesai, setTanggalSelesai] = useState("");
    const [tempat_tujuan, setTempatTujuan] = useState("");
    const [personil, setPersonil] = useState<Personil[]>([]);
    const [fileSurat, setFileSurat] = useState<File | null>(null);
    const [fileError, setFileError] = useState("");

    const mutation = useMutation({
        mutationFn: async (e: React.FormEvent) => {
            e.preventDefault();
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
                if (fileSurat.size > 10 * 1024 * 1024) {
                    setFileError("Ukuran berkas PDF tidak boleh melebihi 10 Megabyte.");
                    throw new Error("File too large");
                }
                formData.append("file_surat", fileSurat);
            }

            const res = await api.post("/surat-tugas", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data;
        },
        onSuccess: () => {
            router.push("/surat-tugas");
        },
        onError: (err: unknown) => {
            const e = err as ApiError;
            if (e.message !== "File too large") {
                alert(e.response?.data?.message || "Terjadi kesalahan saat menyimpan.");
            }
        },
    });

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError("");
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setFileError("Ukuran berkas PDF tidak boleh melebihi 10 Megabyte.");
                setFileSurat(null);
            } else {
                setFileSurat(file);
            }
        }
    };

    const isValid = maksud_tujuan && tanggal_mulai && tanggal_selesai && tempat_tujuan && personil.length > 0;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <Link href="/surat-tugas" className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Buat Surat Tugas</h1>
                    <p className="text-zinc-400 mt-0.5 text-sm">Ajukan permohonan Surat Tugas baru</p>
                </div>
            </div>

            <form onSubmit={mutation.mutate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-400" /> Detail Surat
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-2">Maksud / Tujuan <span className="text-red-500">*</span></label>
                                <textarea
                                    value={maksud_tujuan}
                                    onChange={(e) => setMaksudTujuan(e.target.value)}
                                    rows={4}
                                    placeholder="Contoh: Melakukan patroli kawasan hutan..."
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-2">Dasar Hukum</label>
                                <textarea
                                    value={dasar_hukum}
                                    onChange={(e) => setDasarHukum(e.target.value)}
                                    rows={3}
                                    placeholder="Undang-Undang Nomor 5 Tahun 1990..."
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-300 mb-2">Tanggal Mulai <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={tanggal_mulai}
                                        onChange={(e) => setTanggalMulai(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-300 mb-2">Tanggal Selesai <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={tanggal_selesai}
                                        onChange={(e) => setTanggalSelesai(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-2">Tempat / Lokasi Tujuan <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={tempat_tujuan}
                                    onChange={(e) => setTempatTujuan(e.target.value)}
                                    placeholder="Contoh: Resort conservation wilayah Selatan"
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                            Personil Yang Diberangkatkan <span className="text-red-500">*</span>
                        </h2>

                        <div className="mb-4">
                            <EmployeePicker
                                onSelect={tambahPersonil}
                                placeholder="Cari nama atau NIP pegawai..."
                            />
                        </div>

                        {personil.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500 text-sm border border-dashed border-zinc-700 rounded-xl">
                                Belum ada personil. Gunakan kolom pencarian di atas untuk menambahkan.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {personil.map((p, index) => (
                                    <div key={p.id} className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white">{p.nama_lengkap}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{p.nip}</p>
                                            <input
                                                type="text"
                                                value={p.peran}
                                                onChange={(e) => updatePeran(p.id, e.target.value)}
                                                placeholder="Peran (cth: Ketua Tim, Anggota)"
                                                className="mt-2 w-full bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => hapusPersonil(p.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                            <Upload className="w-4 h-4 text-emerald-400" /> Berkas Pendukung
                        </h2>
                        <label className="group cursor-pointer block">
                            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${fileSurat ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30"}`}>
                                <FileText className={`w-8 h-8 mx-auto mb-3 ${fileSurat ? "text-emerald-400" : "text-zinc-500"}`} />
                                {fileSurat ? (
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-400">{fileSurat.name}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{(fileSurat.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-300 group-hover:text-white">Klik untuk Upload PDF</p>
                                        <p className="text-xs text-zinc-500 mt-1">Maks. 10 Megabyte</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                        {fileError && <p className="text-red-400 text-xs mt-2">{fileError}</p>}
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-xs text-blue-300 mb-4">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>Pastikan seluruh kolom wajib terisi sebelum submitting. Surat akan berstatus <strong>Menunggu</strong> hingga disetujui oleh Kepala Balai.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={!isValid || mutation.isPending}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            {mutation.isPending ? "Menyimpan..." : "Ajukan Surat Tugas"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
