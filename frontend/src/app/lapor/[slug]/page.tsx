"use client";

import { use, useState, FormEvent } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
    CheckCircle2,
    Loader2,
    FileUp,
    AlertCircle,
    ArrowLeft,
    Send,
    HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type FieldType = "text" | "textarea" | "radio" | "checkbox" | "select" | "date" | "file";

interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
}

interface PublicFormSchema {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    fields: FormField[];
}

export default function PublicDynamicFormPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = use(params);

    // Form input state: text/choices and files
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Fetch Skema Form Publik
    const { data: form, isLoading, isError } = useQuery<PublicFormSchema>({
        queryKey: ["public-form-schema", slug],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/dereporting/public-forms/${slug}`);
            return res.data.data;
        },
        retry: false,
    });

    const handleTextChange = (fieldId: string, val: string) => {
        setAnswers((prev) => ({ ...prev, [fieldId]: val }));
    };

    const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
        setAnswers((prev) => {
            const current = (prev[fieldId] as string[]) || [];
            let next: string[];
            if (checked) {
                next = [...current, option];
            } else {
                next = current.filter((item) => item !== option);
            }
            return { ...prev, [fieldId]: next };
        });
    };

    const handleFileChange = (fieldId: string, file: File | null) => {
        if (!file) {
            setFiles((prev) => {
                const copy = { ...prev };
                delete copy[fieldId];
                return copy;
            });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage(`Berkas ${file.name} melebihi batas 10 MB.`);
            return;
        }

        setFiles((prev) => ({ ...prev, [fieldId]: file }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        if (!form) return;

        // Validasi Sisi Klien
        for (const field of form.fields) {
            if (field.required) {
                if (field.type === "file") {
                    if (!files[field.id]) {
                        setErrorMessage(`Lampiran "${field.label}" wajib diunggah.`);
                        return;
                    }
                } else if (field.type === "checkbox") {
                    const selected = (answers[field.id] as string[]) || [];
                    if (selected.length === 0) {
                        setErrorMessage(`Pertanyaan "${field.label}" wajib dipilih minimal satu opsi.`);
                        return;
                    }
                } else {
                    const val = answers[field.id];
                    if (val === undefined || val === null || String(val).trim() === "") {
                        setErrorMessage(`Pertanyaan "${field.label}" wajib diisi.`);
                        return;
                    }
                }
            }
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();

            // Lampirkan jawaban teks & pilihan
            Object.entries(answers).forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                    if (Array.isArray(val)) {
                        val.forEach((item) => formData.append(`${key}[]`, item));
                    } else {
                        formData.append(key, String(val));
                    }
                }
            });

            // Lampirkan file
            Object.entries(files).forEach(([key, file]) => {
                formData.append(key, file);
            });

            await axios.post(`${API_BASE}/dereporting/public-forms/${slug}/submit`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setIsSuccess(true);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(
                error.response?.data?.message || "Terjadi kendala saat mengirimkan tanggapan. Silakan coba lagi."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Memuat Formulir BKSDA...
                </p>
            </div>
        );
    }

    if (isError || !form) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold">Formulir Tidak Tersedia</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Formulir tidak ditemukan atau saat ini sedang ditutup dan tidak menerima tanggapan baru dari publik.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/lapor"
                            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" /> Buka Layanan Pengaduan Umum
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Layar Sukses Setelah Pengiriman
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md space-y-4">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white">Tanggapan Berhasil Dikirim!</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Terima kasih atas partisipasi dan informasi yang Anda kirimkan. Tanggapan Anda telah tercatat dengan aman di pangkalan data BKSDA Kalimantan Timur.
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button
                            type="button"
                            onClick={() => {
                                setIsSuccess(false);
                                setAnswers({});
                                setFiles({});
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold w-full sm:w-auto"
                        >
                            Kirim Tanggapan Lain
                        </Button>
                        <Link
                            href="/"
                            className="text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                            Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8 text-zinc-100">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header Brand */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                        Balai KSDA Kalimantan Timur
                    </span>
                    <Link
                        href="/lapor"
                        className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Pengaduan Umum
                    </Link>
                </div>

                {/* Header Formulir Card */}
                <div className="bg-zinc-900 border-t-8 border-t-emerald-600 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {form.title}
                    </h1>
                    {form.description && (
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                            {form.description}
                        </p>
                    )}
                    <p className="text-[11px] text-rose-400 pt-2 font-mono">
                        * Menunjukkan pertanyaan yang wajib diisi
                    </p>
                </div>

                {/* Pesan Kesalahan */}
                {errorMessage && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-400 flex items-start gap-3 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Form Pertanyaan Modular */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {form.fields.map((field, idx) => (
                        <div
                            key={field.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3 transition-all hover:border-zinc-700"
                        >
                            <label className="block text-sm font-bold text-zinc-200">
                                {idx + 1}. {field.label}
                                {field.required && <span className="text-rose-500 ml-1">*</span>}
                            </label>

                            {/* Teks Pendek */}
                            {field.type === "text" && (
                                <Input
                                    value={(answers[field.id] as string) || ""}
                                    onChange={(e) => handleTextChange(field.id, e.target.value)}
                                    placeholder="Jawaban Anda..."
                                    className="bg-zinc-950 border-zinc-800 text-xs rounded-xl focus:border-emerald-500"
                                />
                            )}

                            {/* Paragraf */}
                            {field.type === "textarea" && (
                                <Textarea
                                    value={(answers[field.id] as string) || ""}
                                    onChange={(e) => handleTextChange(field.id, e.target.value)}
                                    placeholder="Tuliskan jawaban lengkap Anda..."
                                    className="bg-zinc-950 border-zinc-800 text-xs rounded-xl h-24 focus:border-emerald-500 leading-relaxed"
                                />
                            )}

                            {/* Tanggal */}
                            {field.type === "date" && (
                                <Input
                                    type="date"
                                    value={(answers[field.id] as string) || ""}
                                    onChange={(e) => handleTextChange(field.id, e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 text-xs rounded-xl focus:border-emerald-500 w-full sm:w-60"
                                />
                            )}

                            {/* Pilihan Ganda (Radio) */}
                            {field.type === "radio" && (
                                <div className="space-y-2 pt-1">
                                    {(field.options || []).map((opt, optIdx) => (
                                        <label
                                            key={optIdx}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/40 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="radio"
                                                name={field.id}
                                                value={opt}
                                                checked={answers[field.id] === opt}
                                                onChange={() => handleTextChange(field.id, opt)}
                                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 bg-zinc-900"
                                            />
                                            <span className="text-xs text-zinc-300">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Kotak Centang (Checkbox Multi) */}
                            {field.type === "checkbox" && (
                                <div className="space-y-2 pt-1">
                                    {(field.options || []).map((opt, optIdx) => {
                                        const selected = ((answers[field.id] as string[]) || []).includes(opt);
                                        return (
                                            <label
                                                key={optIdx}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/40 cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={(e) =>
                                                        handleCheckboxChange(field.id, opt, e.target.checked)
                                                    }
                                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 bg-zinc-900 rounded"
                                                />
                                                <span className="text-xs text-zinc-300">{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Dropdown (Select) */}
                            {field.type === "select" && (
                                <select
                                    value={(answers[field.id] as string) || ""}
                                    onChange={(e) => handleTextChange(field.id, e.target.value)}
                                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">-- Pilih Salah Satu --</option>
                                    {(field.options || []).map((opt, optIdx) => (
                                        <option key={optIdx} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Upload File / Bukti */}
                            {field.type === "file" && (
                                <div className="space-y-2">
                                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl cursor-pointer bg-zinc-950/50 transition-colors">
                                        <FileUp className="w-8 h-8 text-zinc-500 mb-2" />
                                        <span className="text-xs font-bold text-zinc-300">
                                            {files[field.id]
                                                ? files[field.id].name
                                                : "Pilih berkas foto / dokumen untuk diunggah"}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 mt-1">
                                            Maksimal 10 MB (Format gambar, PDF, atau dokumen)
                                        </span>
                                        <input
                                            type="file"
                                            onChange={(e) =>
                                                handleFileChange(field.id, e.target.files?.[0] || null)
                                            }
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Tombol Kirim */}
                    <div className="pt-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl transition-all gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Mengirimkan Formulir...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Kirim Formulir
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
