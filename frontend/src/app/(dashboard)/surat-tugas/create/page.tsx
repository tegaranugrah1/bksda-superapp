"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { 
    ChevronLeft, Upload, Trash2, Plus, FileText, 
    Printer, Info, Calendar as CalendarIcon, MapPin, Users } from "lucide-react";
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

function formatDateIndonesian(dateStr: string): string {
    if (!dateStr) return '.............';
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNIP(nip: string): string {
    if (!nip) return '.............';
    const cleaned = nip.replace(/\s/g, '');
    if (cleaned.length !== 18) return nip;
    return `${cleaned.substring(0, 8)} ${cleaned.substring(8, 14)} ${cleaned.substring(14, 15)} ${cleaned.substring(15)}`;
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
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            setIsSubmitting(false);
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

    const buildPreviewLetter = () => {
        const tanggalSurat = formatDateIndonesian(new Date().toISOString().substring(0, 10));
        const tMulai = formatDateIndonesian(tanggal_mulai);
        const tSelesai = formatDateIndonesian(tanggal_selesai);

        return `
            <div style="padding: 0.4cm 1cm 1cm 3cm; font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.25; color: #000; text-align: justify; box-sizing: border-box;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <thead>
                        <tr><td style="padding: 0;">
                            <img src="/header-new.png" alt="Kop Surat" style="width: 18.8cm; height: auto; display: block; margin-left: -1.5cm; margin-right: -1cm; margin-top: -10px;" />
                        </td></tr>
                    </thead>
                    <tbody><tr><td style="padding: 0; vertical-align: top;">

                <p style="text-align: center; font-weight: bold; margin: 0 0 2px;">SURAT TUGAS</p>
                <p style="text-align: center; font-size: 11pt; margin: 0 0 16px;">Nomor : ${maksud_tujuan ? 'ST.____/K.18/TU/____/2026' : 'ST.____/K.18/TU/____/2026'}</p>

                <p style="text-align: center; font-weight: bold; margin: 16px 0 4px;">KEPALA BALAI,</p>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
                    <tbody>
                        <tr>
                            <td style="width: 90px; vertical-align: top; padding: 2px 0; font-size: 11pt;">Menimbang</td>
                            <td style="width: 12px; vertical-align: top; padding: 2px 0;">:</td>
                            <td style="vertical-align: top; padding: 2px 0; font-size: 11pt;">
                                a. bahwa dalam rangka <em>${maksud_tujuan || '...................'}</em>, perlu;<br />
                                b. bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud.
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed;">
                    <tbody>
                        <tr>
                            <td style="width: 90px; vertical-align: top; padding: 2px 0; font-size: 11pt;">Dasar</td>
                            <td style="width: 12px; vertical-align: top; padding: 2px 0;">:</td>
                            <td style="vertical-align: top; padding: 2px 0; font-size: 11pt;">
                                1. ${dasar_hukum || 'Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja UPT Ditjen KSDAE;'}<br />
                                2. ${personil.length > 0 ? `${personil.length} (${personil.length}) orang staf yang namanya tercantum dalam Surat Tugas ini.`
                                    : 'Surat Pengesahan DIPA Tahun Anggaran 2026;'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p style="text-align: center; font-weight: bold; margin: 16px 0 10px;">MEMBERI TUGAS,</p>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed;">
                    <tbody>
                        <tr>
                            <td style="width: 90px; vertical-align: top; padding: 2px 0; font-size: 11pt;">Kepada</td>
                            <td style="width: 12px; vertical-align: top; padding: 2px 0;">:</td>
                            <td style="vertical-align: top; padding: 2px 0;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tbody>
                                        ${personil.length === 0 
                                            ? '<tr><td style="padding: 4px 0; font-style: italic; color: #999;">(Belum ada pegawai dipilih)</td></tr>'
                                            : personil.map((p, idx) => `
                                                <tr>
                                                    <td style="width: 24px; vertical-align: top; padding: 2px 0; font-weight: bold;">${idx + 1}.</td>
                                                    <td style="padding: 2px 0;">
                                                        <table style="border-collapse: collapse; width: 100%;">
                                                            <tbody>
                                                                <tr>
                                                                    <td style="width: 60px; padding: 1px 0; font-weight: bold;">Nama</td>
                                                                    <td style="width: 12px; padding: 1px 0;">:</td>
                                                                    <td style="padding: 1px 0; font-weight: bold;">${p.nama_lengkap}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding: 1px 0;">NIP</td>
                                                                    <td style="padding: 1px 0;">:</td>
                                                                    <td style="padding: 1px 0;">${formatNIP(p.nip)}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                                ${idx < personil.length - 1 ? '<tr><td colspan="2" style="padding: 4px 0;"></td></tr>' : ''}
                                            `).join('')
                                        }
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
                    <tbody>
                        <tr>
                            <td style="width: 90px; vertical-align: top; padding: 2px 0; font-size: 11pt;">Untuk</td>
                            <td style="width: 12px; vertical-align: top; padding: 2px 0;">:</td>
                            <td style="vertical-align: top; padding: 2px 0; font-size: 11pt;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tbody>
                                        <tr>
                                            <td style="width: 24px; vertical-align: top; padding: 2px 0;">1.</td>
                                            <td style="padding: 2px 0; text-align: justify;">
                                                Melaksanakan Perjalanan Dinas ${tempat_tujuan ? `ke ${tempat_tujuan}` : 'ke ..............'} dalam rangka ${maksud_tujuan || '...................'} terhitung mulai tanggal ${tMulai} sampai dengan ${tSelesai};
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="width: 24px; vertical-align: top; padding: 2px 0;">2.</td>
                                            <td style="padding: 2px 0; text-align: justify;">
                                                Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Tahun Anggaran 2026;
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="width: 24px; vertical-align: top; padding: 2px 0;">3.</td>
                                            <td style="padding: 2px 0; text-align: justify;">
                                                Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p style="margin: 28px 0 0;">Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>

                <div style="display: flex; margin-top: 14px;">
                    <div style="margin-left: 8.5cm; text-align: left;">
                        <p style="margin: 0;">Samarinda, ${tanggalSurat}</p>
                        <p style="margin: 0 0 0;">Kepala Balai,</p>
                        <div style="height: 80px;"></div>
                        <p style="margin: 0; font-weight: bold;">M. Ari Wibawanto, S.Hut., M.Sc.</p>
                        <p style="margin: 0; font-size: 10pt;">NIP. 19740514 199903 1 001</p>
                    </div>
                </div>

                    </td></tr></tbody>
                </table>
            </div>
        `;
    };

    const handlePrintPreview = () => {
        const preview = document.getElementById("letter-preview");
        if (!preview) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>Surat Tugas</title><style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
            img { max-width: none !important; }
        </style></head><body>${preview.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    return (
        <div className="h-full flex overflow-hidden relative">
            {isSubmitting && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-bold text-white">Menyimpan pengajuan...</p>
                </div>
            )}

            {/* LEFT: Form Panel */}
            <div className="w-[440px] shrink-0 border-r border-zinc-700/50 bg-zinc-900/40 backdrop-blur-xl flex flex-col overflow-hidden">
                <div className="p-5 border-b border-zinc-700/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/surat-tugas" 
                            className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-black text-white tracking-tight">Buat Surat Tugas</h1>
                            <p className="text-xs text-zinc-500 mt-0.5">Isi form di bawah, preview akan otomatis terupdate</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Detail */}
                    <FormSection 
                        title="Detail Kegiatan" 
                        icon={<FileText className="w-3.5 h-3.5" />}
                    >
                        <div className="space-y-3">
                            <div>
                                <label className="form-label">Maksud / Tujuan <span className="text-red-400">*</span></label>
                                <textarea
                                    value={maksud_tujuan}
                                    onChange={(e) => setMaksudTujuan(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Melakukan patroli kawasan hutan..."
                                    className="form-input min-h-[80px] resize-none"
                                />
                            </div>
                            <div>
                                <label className="form-label">Dasar Hukum / Dasar</label>
                                <textarea
                                    value={dasar_hukum}
                                    onChange={(e) => setDasarHukum(e.target.value)}
                                    rows={2}
                                    placeholder="Peraturan Menteri Kehutanan Nomor 4 Tahun 2025..."
                                    className="form-input min-h-[60px] resize-none"
                                />
                            </div>
                        </div>
                    </FormSection>

                    <div className="w-full h-px bg-zinc-700/40"></div>

                    {/* Tanggal & Tempat */}
                    <FormSection 
                        title="Waktu & Lokasi" 
                        icon={<CalendarIcon className="w-3.5 h-3.5" />}
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Mulai <span className="text-red-400">*</span></label>
                                    <input 
                                        type="date" 
                                        value={tanggal_mulai}
                                        onChange={(e) => setTanggalMulai(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Selesai <span className="text-red-400">*</span></label>
                                    <input 
                                        type="date"
                                        value={tanggal_selesai}
                                        onChange={(e) => setTanggalSelesai(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    Tempat / Lokasi Tujuan <span className="text-red-400">*</span>
                                </label>
                                <input 
                                    type="text"
                                    value={tempat_tujuan}
                                    onChange={(e) => setTempatTujuan(e.target.value)}
                                    placeholder="Contoh: Resort Conservation Wilayah Selatan"
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </FormSection>

                    <div className="w-full h-px bg-zinc-700/40"></div>

                    {/* Personil */}
                    <FormSection 
                        title={`Personil (${personil.length} dipilih)`}
                        icon={<Users className="w-3.5 h-3.5" />}
                    >
                        <div className="mb-3">
                            <EmployeePicker
                                onSelect={tambahPersonil}
                                placeholder="Cari nama atau NIP pegawai..."
                            />
                        </div>
                        {personil.length === 0 ? (
                            <div className="text-center py-6 text-zinc-500 text-xs border border-dashed border-zinc-700 rounded-xl">
                                <Users className="w-5 h-5 mx-auto mb-2 text-zinc-600" />
                                Belum ada personil ditambahkan
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {personil.map((p, idx) => (
                                    <div key={p.id} className="flex items-start gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3 py-2.5 group">
                                        <span className="text-xs font-bold text-zinc-500 w-4 shrink-0 mt-0.5">{idx + 1}.</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-zinc-200 truncate">{p.nama_lengkap}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono truncate">{p.nip}</p>
                                            <input
                                                type="text"
                                                value={p.peran}
                                                onChange={(e) => updatePeran(p.id, e.target.value)}
                                                placeholder="Peran (cth: Ketua Tim)"
                                                className="mt-1.5 w-full bg-zinc-900 border border-zinc-600 text-zinc-400 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => hapusPersonil(p.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all shrink-0 mt-0.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormSection>

                    <div className="w-full h-px bg-zinc-700/40"></div>

                    {/* Berkas */}
                    <FormSection 
                        title="Berkas Pendukung" 
                        icon={<Upload className="w-3.5 h-3.5" />}
                    >
                        <label className="group cursor-pointer block">
                            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${fileSurat ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/30"}`}>
                                <FileText className={`w-6 h-6 mx-auto mb-2 ${fileSurat ? "text-emerald-400" : "text-zinc-500"}`} />
                                {fileSurat ? (
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-400">{fileSurat.name}</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">{(fileSurat.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-300">Klik untuk Upload PDF</p>
                                        <p className="text-[10px] text-zinc-600 mt-0.5">Maks. 10MB</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                        {fileError && <p className="text-red-400 text-[10px] mt-1.5">{fileError}</p>}
                    </FormSection>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-2.5 text-[11px] text-blue-300">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p>Surat akan berstatus <strong className="text-blue-200">Menunggu</strong> hingga disetujui oleh Kepala Balai.</p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!isValid || mutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                    >
                        <Plus className="w-4 h-4" />
                        {mutation.isPending ? "Menyimpan..." : "Ajukan Surat Tugas"}
                    </button>
                </div>
            </div>

            {/* RIGHT: Preview Panel */}
            <div className="flex-1 flex flex-col bg-zinc-100/50 overflow-hidden">
                <div className="p-4 border-b border-zinc-200/60 bg-white/40 backdrop-blur-xl flex items-center justify-between shrink-0">
                    <h2 className="text-sm font-bold text-zinc-600">Preview Surat Tugas</h2>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/surat-tugas"
                            className="text-xs text-zinc-400 hover:text-zinc-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-200/50 transition-all"
                        >
                            Kembali
                        </Link>
                        <button
                            onClick={handlePrintPreview}
                            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                        >
                            <Printer className="w-3.5 h-3.5" /> Cetak
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-zinc-200/50 p-10 flex justify-center items-start">
                    <div className="w-[210mm] min-w-[210mm] min-h-[297mm] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-lg overflow-hidden">
                        <div
                            id="letter-preview"
                            dangerouslySetInnerHTML={{ __html: buildPreviewLetter() }}
                        />
                    </div>
                    <div className="h-8" />
                </div>
            </div>

            <form onSubmit={mutation.mutate} className="hidden" />

            <style jsx global>{`
                .form-input {
                    width: 100%;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #e2e8f0;
                    background: rgba(24, 24, 27, 0.8);
                    border: 1px solid rgba(63, 63, 70, 0.8);
                    border-radius: 10px;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .form-input:focus {
                    background: rgba(39, 39, 42, 0.9);
                    border-color: rgba(16, 185, 129, 0.5);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }
                .form-input::placeholder { color: #71717a; }
                textarea.form-input { line-height: 1.5; }
                select.form-input {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
                    background-position: right 8px center;
                    background-repeat: no-repeat;
                    background-size: 16px;
                    padding-right: 32px;
                }
            `}</style>
        </div>
    );
}

function FormSection({ 
    title, 
    children, 
    icon 
}: { 
    title: string; 
    children: React.ReactNode; 
    icon?: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {icon && <span className="text-emerald-400">{icon}</span>}
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</label>
            </div>
            {children}
        </div>
    );
}
