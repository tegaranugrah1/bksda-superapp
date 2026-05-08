"use client";

import { useState, FormEvent } from "react";
import axios from "axios";
import { Send, Loader2, CheckCircle2, FileUp, AlertTriangle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function LaporPublikPage() {
    // State Formulir
    const [formData, setFormData] = useState({
        nama_pelapor: "",
        instansi: "",
        email: "",
        no_hp: "",
        judul_laporan: "",
        deskripsi: "",
    });
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Pengendali Perubahan Input (Generik untuk semua field)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Pengendali Pengiriman Formulir
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        // Validasi Sisi Klien (Mengurangi beban server)
        if (!formData.nama_pelapor.trim()) {
            setErrorMsg("Nama Pelapor wajib diisi.");
            return;
        }
        if (!formData.judul_laporan.trim()) {
            setErrorMsg("Judul Laporan wajib diisi.");
            return;
        }
        if (!file) {
            setErrorMsg("Bukti file (PDF/Foto) wajib dilampirkan.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Merakit FormData (Wajib! Karena kita mengirim file biner)
            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value) payload.append(key, value);
            });
            payload.append("file", file);

            // Menembak Endpoint PUBLIK (Tanpa Bearer Token!)
            await axios.post(`${API_BASE}/dereporting/eksternals/public`, payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setIsSuccess(true);
        } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'response' in error) {
                const err = error as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } };
                if (err.response?.status === 422) {
                    // Menangkap pesan validasi dari Backend (FormRequest Issue 085)
                    const messages = err.response.data?.errors;
                    const firstError = messages ? Object.values(messages).flat()[0] as string : undefined;
                    setErrorMsg(firstError || "Data yang Anda masukkan tidak valid.");
                } else if (err.response?.status === 429) {
                    setErrorMsg("Anda terlalu sering mengirim laporan. Silakan coba lagi dalam 1 menit.");
                } else {
                    setErrorMsg("Terjadi gangguan pada server. Silakan coba beberapa saat lagi.");
                }
            } else {
                setErrorMsg("Terjadi gangguan pada server. Silakan coba beberapa saat lagi.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // LAYAR SUKSES: Ditampilkan setelah pengiriman berhasil
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">Laporan Terkirim!</h2>
                    <p className="text-zinc-400 text-sm mb-8">
                        Terima kasih atas kepedulian Anda terhadap kelestarian alam Indonesia.
                        Tim BKSDA akan meninjau laporan Anda dalam waktu 1x24 jam kerja.
                    </p>
                    <button
                        onClick={() => { setIsSuccess(false); setFormData({ nama_pelapor: "", instansi: "", email: "", no_hp: "", judul_laporan: "", deskripsi: "" }); setFile(null); }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
                    >
                        Kirim Laporan Lainnya
                    </button>
                </div>
            </div>
        );
    }

    // LAYAR UTAMA: Formulir Pelaporan
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Lapor ke BKSDA</h1>
                    <p className="text-zinc-400 mt-2 text-sm max-w-md mx-auto">
                        Formulir pengaduan pelestarian alam terbuka. Anda tidak perlu membuat akun.
                    </p>
                </div>

                {/* Kartu Formulir */}
                <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Baris Error */}
                    {errorMsg && (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Grid 2 Kolom: Nama & Instansi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nama_pelapor" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Nama Pelapor *</label>
                            <input id="nama_pelapor" name="nama_pelapor" type="text" value={formData.nama_pelapor} onChange={handleChange} maxLength={150} placeholder="Nama lengkap Anda"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                        <div>
                            <label htmlFor="instansi" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Instansi / Lembaga</label>
                            <input id="instansi" name="instansi" type="text" value={formData.instansi} onChange={handleChange} maxLength={150} placeholder="Opsional"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                    </div>

                    {/* Grid 2 Kolom: Email & No HP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Email</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={100} placeholder="email@contoh.com"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                        <div>
                            <label htmlFor="no_hp" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">No. Handphone</label>
                            <input id="no_hp" name="no_hp" type="text" value={formData.no_hp} onChange={handleChange} maxLength={20} placeholder="08xxxxxxxxxx"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                    </div>

                    {/* Judul Laporan */}
                    <div>
                        <label htmlFor="judul_laporan" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Judul Laporan *</label>
                        <input id="judul_laporan" name="judul_laporan" type="text" value={formData.judul_laporan} onChange={handleChange} maxLength={255} placeholder="Contoh: Penebangan Liar di Kawasan Hutan Lindung"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                    </div>

                    {/* Deskripsi */}
                    <div>
                        <label htmlFor="deskripsi" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Deskripsi Kejadian</label>
                        <textarea id="deskripsi" name="deskripsi" value={formData.deskripsi} onChange={handleChange} rows={4} placeholder="Jelaskan kronologi kejadian secara detail..."
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none" />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Lampiran Bukti *</label>
                        <label htmlFor="file_upload" className="flex items-center justify-center gap-3 w-full bg-zinc-950 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-6 cursor-pointer hover:border-blue-500 transition-all group">
                            <FileUp className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            <span className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                {file ? file.name : "Klik untuk unggah (PDF, Foto, Excel — Maks 10 MB)"}
                            </span>
                        </label>
                        <input id="file_upload" type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </div>

                    {/* Tombol Kirim */}
                    <button type="submit" disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {isSubmitting ? "Mengunci & Mengirim Ke Brankas BKSDA..." : "Kirim Laporan"}
                    </button>

                    <p className="text-center text-[11px] text-zinc-600">
                        Dengan mengirim formulir ini, Anda menyetujui bahwa data Anda akan diproses oleh BKSDA sesuai ketentuan yang berlaku.
                    </p>
                </form>
            </div>
        </div>
    );
}
