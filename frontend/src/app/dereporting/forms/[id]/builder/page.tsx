"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowLeft,
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Save,
    ExternalLink,
    Loader2,
    Type,
    AlignLeft,
    CheckSquare,
    List,
    Calendar,
    UploadCloud,
    Radio,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FieldType = "text" | "textarea" | "radio" | "checkbox" | "select" | "date" | "file";

interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
}

interface DynamicFormDetail {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    fields: FormField[];
}

const FIELD_TYPES: { type: FieldType; label: string; icon: typeof Type }[] = [
    { type: "text", label: "Teks Pendek", icon: Type },
    { type: "textarea", label: "Paragraf", icon: AlignLeft },
    { type: "radio", label: "Pilihan Ganda", icon: Radio },
    { type: "checkbox", label: "Kotak Centang", icon: CheckSquare },
    { type: "select", label: "Dropdown", icon: List },
    { type: "date", label: "Tanggal", icon: Calendar },
    { type: "file", label: "Unggah Berkas / Foto", icon: UploadCloud },
];

export default function DeReportingFormBuilderPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const queryClient = useQueryClient();

    // Form Data State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [fields, setFields] = useState<FormField[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    // Penarikan Detail Form
    const { data: form, isLoading } = useQuery<DynamicFormDetail>({
        queryKey: ["dr-form-builder", id],
        queryFn: async () => {
            const res = await api.get(`/dereporting/forms/${id}`);
            return res.data.data;
        },
    });

    useEffect(() => {
        if (form) {
            setTitle(form.title || "");
            setDescription(form.description || "");
            setIsActive(form.is_active ?? true);
            setFields(form.fields || []);
        }
    }, [form]);

    // Mutasi Simpan Perubahan Form & Fields
    const saveMutation = useMutation({
        mutationFn: async () => {
            await api.put(`/dereporting/forms/${id}`, {
                title,
                description,
                is_active: isActive,
                fields,
            });
        },
        onSuccess: () => {
            toast.success("Perubahan formulir berhasil disimpan!");
            setIsDirty(false);
            queryClient.invalidateQueries({ queryKey: ["dr-form-builder", id] });
            queryClient.invalidateQueries({ queryKey: ["dr-dynamic-forms"] });
        },
        onError: () => {
            toast.error("Gagal menyimpan perubahan formulir.");
        },
    });

    // Tambah Pertanyaan Baru
    const handleAddField = () => {
        const newField: FormField = {
            id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            label: "Pertanyaan Baru",
            type: "text",
            required: false,
        };
        setFields((prev) => [...prev, newField]);
        setIsDirty(true);
    };

    // Update field property
    const handleUpdateField = (index: number, updates: Partial<FormField>) => {
        setFields((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...updates };
            // Inisialisasi opsi default jika beralih ke tipe pilihan
            if (
                updates.type &&
                ["radio", "checkbox", "select"].includes(updates.type) &&
                (!copy[index].options || copy[index].options?.length === 0)
            ) {
                copy[index].options = ["Opsi 1", "Opsi 2"];
            }
            return copy;
        });
        setIsDirty(true);
    };

    // Hapus field
    const handleDeleteField = (index: number) => {
        setFields((prev) => prev.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    // Pindah urutan pertanyaan
    const handleMoveField = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;

        setFields((prev) => {
            const copy = [...prev];
            const temp = copy[index];
            copy[index] = copy[targetIndex];
            copy[targetIndex] = temp;
            return copy;
        });
        setIsDirty(true);
    };

    // Tambah Opsi Jawaban (untuk radio/checkbox/select)
    const handleAddOption = (fieldIndex: number) => {
        setFields((prev) => {
            const copy = [...prev];
            const currentOptions = copy[fieldIndex].options || [];
            copy[fieldIndex].options = [...currentOptions, `Opsi ${currentOptions.length + 1}`];
            return copy;
        });
        setIsDirty(true);
    };

    // Update Opsi Jawaban
    const handleUpdateOption = (fieldIndex: number, optIndex: number, val: string) => {
        setFields((prev) => {
            const copy = [...prev];
            const opts = [...(copy[fieldIndex].options || [])];
            opts[optIndex] = val;
            copy[fieldIndex].options = opts;
            return copy;
        });
        setIsDirty(true);
    };

    // Hapus Opsi Jawaban
    const handleDeleteOption = (fieldIndex: number, optIndex: number) => {
        setFields((prev) => {
            const copy = [...prev];
            const opts = (copy[fieldIndex].options || []).filter((_, i) => i !== optIndex);
            copy[fieldIndex].options = opts.length > 0 ? opts : ["Opsi 1"];
            return copy;
        });
        setIsDirty(true);
    };

    if (isLoading) {
        return (
            <div className="p-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Membuka Editor Formulir...
                </p>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="p-10 text-center space-y-3">
                <p className="text-zinc-500 text-sm">Formulir tidak ditemukan.</p>
                <Link href="/dereporting/forms" className="text-xs font-bold text-violet-500 hover:underline">
                    Kembali ke Daftar Formulir
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Bar Navigasi & Aksi Simpan */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-4 z-20 bg-zinc-50/90 dark:bg-black/90 backdrop-blur-md p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-md">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dereporting/forms"
                        className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                            Desain Formulir
                        </h2>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <span className="font-mono">/lapor/{form.slug}</span>
                            <a
                                href={`/lapor/${form.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-violet-500 hover:underline flex items-center gap-1"
                            >
                                Pratinjau <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Status Toggle */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsActive(!isActive);
                            setIsDirty(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                            isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700"
                        }`}
                    >
                        {isActive ? "Status: Aktif" : "Status: Ditutup"}
                    </button>

                    <Button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className={`rounded-xl text-xs font-bold gap-2 ${
                            isDirty
                                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg animate-pulse"
                                : "bg-zinc-800 hover:bg-zinc-700 text-white"
                        }`}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Simpan Perubahan
                    </Button>
                </div>
            </div>

            {/* Header Formulir Card (Judul & Deskripsi) */}
            <div className="bg-white dark:bg-zinc-950/50 border-t-8 border-t-violet-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Judul Formulir</Label>
                    <Input
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setIsDirty(true);
                        }}
                        placeholder="Judul Formulir..."
                        className="text-lg font-black rounded-xl border-zinc-200 dark:border-zinc-800"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Deskripsi / Petunjuk Pengisian
                    </Label>
                    <Textarea
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            setIsDirty(true);
                        }}
                        placeholder="Berikan arahan singkat bagi responden..."
                        className="text-xs rounded-xl h-20 border-zinc-200 dark:border-zinc-800 leading-relaxed"
                    />
                </div>
            </div>

            {/* List Pertanyaan Modular */}
            <div className="space-y-4">
                {fields.map((field, index) => {
                    const isChoice = ["radio", "checkbox", "select"].includes(field.type);

                    return (
                        <div
                            key={field.id}
                            className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5 transition-all hover:border-violet-500/40"
                        >
                            {/* Baris Atas: Label Pertanyaan & Pilihan Tipe Input */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs flex items-center justify-center shrink-0">
                                    {index + 1}
                                </span>

                                <Input
                                    value={field.label}
                                    onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                                    placeholder="Tuliskan pertanyaan di sini..."
                                    className="flex-1 font-semibold text-sm rounded-xl"
                                />

                                {/* Dropdown Tipe Input */}
                                <select
                                    value={field.type}
                                    onChange={(e) =>
                                        handleUpdateField(index, { type: e.target.value as FieldType })
                                    }
                                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-violet-500 shrink-0"
                                >
                                    {FIELD_TYPES.map((t) => (
                                        <option key={t.type} value={t.type}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Opsi Jawaban (Jika Radio / Checkbox / Dropdown) */}
                            {isChoice && (
                                <div className="space-y-2.5 pl-9">
                                    <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                                        Pilihan Opsi Responden:
                                    </Label>

                                    {(field.options || []).map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
                                            <Input
                                                value={opt}
                                                onChange={(e) =>
                                                    handleUpdateOption(index, optIdx, e.target.value)
                                                }
                                                placeholder={`Opsi ${optIdx + 1}`}
                                                className="text-xs h-8 rounded-lg flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteOption(index, optIdx)}
                                                className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-md transition-colors"
                                                title="Hapus Opsi"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAddOption(index)}
                                        className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 gap-1.5 rounded-lg px-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Tambah Opsi
                                    </Button>
                                </div>
                            )}

                            {/* Preview Jenis Input (Untuk teks, paragraf, tanggal, file) */}
                            {!isChoice && (
                                <div className="pl-9 text-xs text-zinc-400 italic">
                                    {field.type === "text" && "Pratinjau: Input satu baris teks pendek."}
                                    {field.type === "textarea" && "Pratinjau: Kotak paragraf teks panjang."}
                                    {field.type === "date" && "Pratinjau: Pemilih kalender tanggal."}
                                    {field.type === "file" && "Pratinjau: Pemilih unggah berkas / foto (maks 10 MB)."}
                                </div>
                            )}

                            {/* Baris Bawah: Pengaturan Wajib Diisi & Kontrol Urutan */}
                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) =>
                                            handleUpdateField(index, { required: e.target.checked })
                                        }
                                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-zinc-300"
                                    />
                                    <span>Wajib Diisi</span>
                                </label>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => handleMoveField(index, "up")}
                                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-500 transition-colors"
                                        title="Geser ke Atas"
                                    >
                                        <MoveUp className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        disabled={index === fields.length - 1}
                                        onClick={() => handleMoveField(index, "down")}
                                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-500 transition-colors"
                                        title="Geser ke Bawah"
                                    >
                                        <MoveDown className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteField(index)}
                                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-600 transition-colors ml-2"
                                        title="Hapus Pertanyaan"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tombol Tambah Pertanyaan Baru */}
            <div className="text-center pt-2">
                <Button
                    type="button"
                    onClick={handleAddField}
                    className="w-full py-6 rounded-2xl border-2 border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-sm gap-2 transition-all"
                >
                    <Plus className="w-5 h-5" /> Tambah Pertanyaan Baru
                </Button>
            </div>
        </div>
    );
}
