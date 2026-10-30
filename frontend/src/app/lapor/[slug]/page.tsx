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
    MapPin,
    Navigation,
    X,
    FileImage,
    FileText,
    ShieldCheck,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type FieldType = "text" | "textarea" | "radio" | "checkbox" | "select" | "date" | "file" | "gps_location";

interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
    max_files?: number;
}

interface PublicFormSchema {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    is_active?: boolean;
    is_closed?: boolean;
    closed_at?: string | null;
    closed_message?: string | null;
    fields: FormField[];
}

interface GpsValue {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address_hint?: string;
}

/**
 * Kompresi Gambar Klien menggunakan HTML5 Canvas
 * Menjaga dimensi maksimal 1600px dan kompresi JPEG 0.82
 * Menghasilkan ukuran 200KB - 800KB dari foto ponsel 10MB
 */
async function compressImageIfNeeded(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 1600;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");

                if (!ctx) return resolve(file);

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            return resolve(file);
                        }
                        const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                        resolve(new File([blob], cleanName, { type: "image/jpeg" }));
                    },
                    "image/jpeg",
                    0.82
                );
            };
            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

export default function PublicDynamicFormPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = use(params);

    // Form input state: text/choices, multi-files, and GPS
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [files, setFiles] = useState<Record<string, File[]>>({});
    const [locatingFieldId, setLocatingFieldId] = useState<string | null>(null);
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

    const handleFilesAdded = async (fieldId: string, addedFiles: FileList | null, maxFiles: number) => {
        if (!addedFiles || addedFiles.length === 0) return;

        const currentList = files[fieldId] || [];
        const remainingSlots = maxFiles - currentList.length;

        if (remainingSlots <= 0) {
            setErrorMessage(`Maksimal ${maxFiles} berkas yang dapat diunggah.`);
            return;
        }

        const filesToProcess = Array.from(addedFiles).slice(0, remainingSlots);
        const processedFiles: File[] = [];

        for (const f of filesToProcess) {
            if (f.size > 15 * 1024 * 1024) {
                setErrorMessage(`Berkas "${f.name}" melebihi batas 15 MB.`);
                continue;
            }
            const compressed = await compressImageIfNeeded(f);
            processedFiles.push(compressed);
        }

        setFiles((prev) => ({
            ...prev,
            [fieldId]: [...(prev[fieldId] || []), ...processedFiles],
        }));
    };

    const handleRemoveFile = (fieldId: string, index: number) => {
        setFiles((prev) => {
            const current = prev[fieldId] || [];
            const next = current.filter((_, idx) => idx !== index);
            return { ...prev, [fieldId]: next };
        });
    };

    const handleAcquireLocation = (fieldId: string) => {
        if (!navigator.geolocation) {
            setErrorMessage("Peramban Anda tidak mendukung sensor Geolocation GPS.");
            return;
        }

        setLocatingFieldId(fieldId);
        setErrorMessage("");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocatingFieldId(null);
                const gps: GpsValue = {
                    latitude: Number(pos.coords.latitude.toFixed(6)),
                    longitude: Number(pos.coords.longitude.toFixed(6)),
                    accuracy: Math.round(pos.coords.accuracy),
                };
                setAnswers((prev) => ({ ...prev, [fieldId]: gps }));
            },
            (err) => {
                setLocatingFieldId(null);
                let msg = "Gagal membaca titik lokasi GPS.";
                if (err.code === err.PERMISSION_DENIED) {
                    msg = "Izin akses lokasi ditolak. Silakan izinkan akses lokasi pada browser Anda.";
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    msg = "Informasi lokasi tidak tersedia dari sensor perangkat.";
                } else if (err.code === err.TIMEOUT) {
                    msg = "Waktu pencarian lokasi habis (timeout). Coba lagi.";
                }
                setErrorMessage(msg);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        if (!form) return;

        if (form.is_closed) {
            setErrorMessage(form.closed_message || "Formulir ini sudah ditutup.");
            return;
        }

        // Validasi Sisi Klien
        for (const field of form.fields) {
            if (field.required) {
                if (field.type === "file") {
                    const currentFiles = files[field.id] || [];
                    if (currentFiles.length === 0) {
                        setErrorMessage(`Lampiran "${field.label}" wajib diunggah.`);
                        return;
                    }
                } else if (field.type === "gps_location") {
                    const gps = answers[field.id] as GpsValue | undefined;
                    if (!gps || gps.latitude === undefined || gps.longitude === undefined) {
                        setErrorMessage(`Titik koordinat GPS pada "${field.label}" wajib diambil.`);
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

            // Lampirkan jawaban teks, pilihan, dan GPS
            Object.entries(answers).forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                    if (typeof val === "object" && !Array.isArray(val)) {
                        // GPS coordinate object
                        formData.append(key, JSON.stringify(val));
                    } else if (Array.isArray(val)) {
                        val.forEach((item) => formData.append(`${key}[]`, item));
                    } else {
                        formData.append(key, String(val));
                    }
                }
            });

            // Lampirkan file (multi-file per input field)
            Object.entries(files).forEach(([key, fileList]) => {
                fileList.forEach((file) => {
                    formData.append(`${key}[]`, file);
                });
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
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-5">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight">Tanggapan Diterima!</h2>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Terima kasih telah berpartisipasi mengisi formulir <strong>&ldquo;{form.title}&rdquo;</strong>.
                            Laporan dan berkas Anda telah tersimpan secara aman di server BKSDA Kalimantan Timur.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
                        <Button
                            type="button"
                            onClick={() => {
                                setIsSuccess(false);
                                setAnswers({});
                                setFiles({});
                            }}
                            variant="outline"
                            className="w-full rounded-xl text-xs font-bold border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                        >
                            Kirim Tanggapan Lain
                        </Button>

                        <Link href="/lapor">
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full rounded-xl text-xs text-zinc-500 hover:text-white"
                            >
                                Kembali ke Beranda Pengaduan
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white py-10 px-4 sm:px-6 flex flex-col items-center">
            <div className="max-w-2xl w-full space-y-6">
                {/* Header Formulir */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            BKSDA Kalimantan Timur
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                            {form.title}
                        </h1>

                        {form.description && (
                            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                                {form.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Banner Status Formulir Ditutup */}
                {form.is_closed ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-base text-amber-300">Formulir Ini Sudah Ditutup</h3>
                        <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                            {form.closed_message || "Formulir ini telah mencapai batas waktu penerimaan dan tidak lagi menerima tanggapan baru dari masyarakat."}
                        </p>
                        <div className="pt-2">
                            <Link href="/lapor">
                                <Button variant="outline" className="rounded-xl text-xs font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Buka Layanan Pengaduan BKSDA
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Formulir Masukan */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMessage && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-3 animate-in shake duration-300">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {form.fields.map((field, idx) => {
                            const isGps = field.type === "gps_location";
                            const isFile = field.type === "file";
                            const currentGps = answers[field.id] as GpsValue | undefined;
                            const currentFileList = files[field.id] || [];
                            const maxFiles = field.max_files || 5;

                            return (
                                <div
                                    key={field.id}
                                    className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 shadow-md space-y-3.5 transition-all focus-within:border-emerald-500/40"
                                >
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                                            <span>
                                                {idx + 1}. {field.label}
                                            </span>
                                            {field.required && (
                                                <span className="text-rose-500 font-bold" title="Wajib diisi">
                                                    *
                                                </span>
                                            )}
                                        </label>
                                    </div>

                                    {/* Teks Pendek */}
                                    {field.type === "text" && (
                                        <Input
                                            value={(answers[field.id] as string) || ""}
                                            onChange={(e) => handleTextChange(field.id, e.target.value)}
                                            placeholder="Tuliskan jawaban Anda..."
                                            className="bg-zinc-950 border-zinc-800 text-xs rounded-xl h-11 focus:border-emerald-500"
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

                                    {/* Multi-File Upload dengan Kompresi Otomatis */}
                                    {isFile && (
                                        <div className="space-y-3">
                                            {/* Drop Area & Picker */}
                                            {currentFileList.length < maxFiles && (
                                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl cursor-pointer bg-zinc-950/50 transition-colors">
                                                    <FileUp className="w-8 h-8 text-zinc-500 mb-2" />
                                                    <span className="text-xs font-bold text-zinc-300 text-center">
                                                        Klik atau seret foto / dokumen ke sini
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 mt-1 text-center">
                                                        Maksimal {maxFiles} berkas (Format gambar, PDF, atau dokumen). Otomatis dikompresi agar hemat kuota.
                                                    </span>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        onChange={(e) => handleFilesAdded(field.id, e.target.files, maxFiles)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}

                                            {/* List Berkas Terpilih */}
                                            {currentFileList.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[11px] font-bold text-zinc-400">
                                                        Berkas Terpilih ({currentFileList.length}/{maxFiles}):
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {currentFileList.map((file, fIdx) => (
                                                            <div
                                                                key={fIdx}
                                                                className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl gap-2"
                                                            >
                                                                <div className="flex items-center gap-2 truncate">
                                                                    {file.type.startsWith("image/") ? (
                                                                        <FileImage className="w-4 h-4 text-emerald-400 shrink-0" />
                                                                    ) : (
                                                                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                                                    )}
                                                                    <div className="truncate">
                                                                        <p className="text-xs font-medium text-zinc-200 truncate">
                                                                            {file.name}
                                                                        </p>
                                                                        <p className="text-[10px] text-zinc-500 font-mono">
                                                                            {Math.round(file.size / 1024)} KB
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveFile(field.id, fIdx)}
                                                                    className="p-1 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors"
                                                                    title="Hapus Berkas"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pertanyaan Titik Koordinat GPS */}
                                    {isGps && (
                                        <div className="space-y-3">
                                            {currentGps ? (
                                                <div className="p-4 bg-zinc-950 border border-emerald-500/40 rounded-2xl space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                                                            <MapPin className="w-4 h-4" />
                                                            <span>Titik Koordinat Berhasil Terkunci</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAcquireLocation(field.id)}
                                                            className="text-[11px] text-zinc-400 hover:text-white underline"
                                                        >
                                                            Perbarui Titik
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                                        <div className="p-2 bg-zinc-900 rounded-xl">
                                                            <span className="text-zinc-500 block text-[10px]">Latitude</span>
                                                            <span className="text-zinc-200 font-bold">{currentGps.latitude}</span>
                                                        </div>
                                                        <div className="p-2 bg-zinc-900 rounded-xl">
                                                            <span className="text-zinc-500 block text-[10px]">Longitude</span>
                                                            <span className="text-zinc-200 font-bold">{currentGps.longitude}</span>
                                                        </div>
                                                    </div>

                                                    {currentGps.accuracy && (
                                                        <p className="text-[10px] text-zinc-400 font-mono">
                                                            Tingkat Akurasi Sensor: ±{currentGps.accuracy} meter
                                                        </p>
                                                    )}

                                                    {/* Petunjuk Alamat Tambahan (Opsional) */}
                                                    <Input
                                                        value={currentGps.address_hint || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setAnswers((prev) => ({
                                                                ...prev,
                                                                [field.id]: { ...currentGps, address_hint: val },
                                                            }));
                                                        }}
                                                        placeholder="Keterangan patokan lokasi (contoh: Dekat Pos Jaga Tahura Bukit Soeharto)"
                                                        className="bg-zinc-900 border-zinc-800 text-xs rounded-xl h-9 text-zinc-300 placeholder:text-zinc-600"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleAcquireLocation(field.id)}
                                                        disabled={locatingFieldId === field.id}
                                                        className="w-full py-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 shadow-lg"
                                                    >
                                                        {locatingFieldId === field.id ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Mencari Sinyal GPS Ponsel...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Navigation className="w-4 h-4" />
                                                                Ambil Lokasi Saya Sekarang
                                                            </>
                                                        )}
                                                    </Button>

                                                    <div className="flex items-start gap-2 p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-[11px] text-zinc-400">
                                                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                        <span>
                                                            Titik GPS hanya digunakan oleh petugas BKSDA untuk navigasi dan pemetaan penanganan satwa di lapangan.
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

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
                )}
            </div>
        </div>
    );
}
