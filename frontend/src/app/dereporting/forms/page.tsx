"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ClipboardList,
    Plus,
    Search,
    Copy,
    Check,
    Edit3,
    TableProperties,
    Trash2,
    Loader2,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";

interface DynamicFormItem {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    responses_count: number;
    created_at: string;
}

export default function DeReportingFormsListPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 400);

    // Dialog Tambah Form Baru
    const [createOpen, setCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newSlug, setNewSlug] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // State Salin Tautan
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    // Penarikan Daftar Formulir
    const { data: response, isLoading } = useQuery<{ data: DynamicFormItem[] }>({
        queryKey: ["dr-dynamic-forms", debouncedSearch],
        queryFn: async () => {
            const res = await api.get("/dereporting/forms", {
                params: { search: debouncedSearch, paginate: "false" },
            });
            return res.data;
        },
    });

    // Mutasi Buat Form Baru
    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/dereporting/forms", {
                title: newTitle,
                slug: newSlug || undefined,
                description: newDesc || undefined,
            });
            return res.data.data;
        },
        onSuccess: (form) => {
            toast.success("Formulir berhasil dibuat!");
            setCreateOpen(false);
            setNewTitle("");
            setNewSlug("");
            setNewDesc("");
            queryClient.invalidateQueries({ queryKey: ["dr-dynamic-forms"] });
            router.push(`/dereporting/forms/${form.id}/builder`);
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Gagal membuat formulir.");
        },
    });

    // Mutasi Toggle Status Aktif/Ditutup
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            await api.put(`/dereporting/forms/${id}`, { is_active });
        },
        onSuccess: (_, vars) => {
            toast.success(vars.is_active ? "Formulir diaktifkan." : "Formulir ditutup.");
            queryClient.invalidateQueries({ queryKey: ["dr-dynamic-forms"] });
        },
        onError: () => {
            toast.error("Gagal mengubah status formulir.");
        },
    });

    // Mutasi Hapus / Arsipkan Form
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/dereporting/forms/${id}`);
        },
        onSuccess: () => {
            toast.success("Formulir berhasil diarsipkan.");
            queryClient.invalidateQueries({ queryKey: ["dr-dynamic-forms"] });
        },
        onError: () => {
            toast.error("Gagal mengarsipkan formulir.");
        },
    });

    const handleCopyLink = (slug: string) => {
        const url = `${window.location.origin}/lapor/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        toast.success("Tautan formulir disalin ke clipboard!");
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    const forms = response?.data || [];

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-violet-500" /> Form Builder
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                        Rancang dan kelola formulir pelaporan eksternal modular (Google Forms style) untuk masyarakat & mitra.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Pencarian */}
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari formulir..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all w-full placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold gap-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Buat Formulir
                    </Button>
                </div>
            </div>

            {/* List Grid Formulir */}
            {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Memuat Daftar Formulir...
                    </p>
                </div>
            ) : forms.length === 0 ? (
                <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto">
                        <ClipboardList className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                            Belum Ada Formulir Dinamis
                        </h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Mulai buat formulir baru untuk mengumpulkan laporan khusus dari warga atau mitra konservasi.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold gap-2"
                    >
                        <Plus className="w-4 h-4" /> Buat Formulir Pertama
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {forms.map((form) => (
                        <div
                            key={form.id}
                            className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                        >
                            <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-bold text-base text-zinc-900 dark:text-white line-clamp-2 leading-snug">
                                        {form.title}
                                    </h3>

                                    {/* Toggle Switch Aktif */}
                                    <button
                                        type="button"
                                        title={form.is_active ? "Klik untuk menutup form" : "Klik untuk mengaktifkan form"}
                                        onClick={() =>
                                            toggleActiveMutation.mutate({
                                                id: form.id,
                                                is_active: !form.is_active,
                                            })
                                        }
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 ${
                                            form.is_active
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200"
                                        }`}
                                    >
                                        {form.is_active ? "Aktif" : "Ditutup"}
                                    </button>
                                </div>

                                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                    {form.description || "Tanpa deskripsi formulir."}
                                </p>

                                {/* URL Slug Link */}
                                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                                    <span className="truncate flex-1">/lapor/{form.slug}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyLink(form.slug)}
                                        title="Salin Tautan Publik"
                                        className="p-1 hover:text-violet-500 text-zinc-400 transition-colors"
                                    >
                                        {copiedSlug === form.slug ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    <a
                                        href={`/lapor/${form.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Buka Tautan Publik di Tab Baru"
                                        className="p-1 hover:text-violet-500 text-zinc-400 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* Footer & Actions */}
                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                                <Link
                                    href={`/dereporting/forms/${form.id}/responses`}
                                    className="font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5"
                                >
                                    <TableProperties className="w-3.5 h-3.5" />
                                    <span>{form.responses_count} Tanggapan</span>
                                </Link>

                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href={`/dereporting/forms/${form.id}/builder`}
                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                                        title="Desain Pertanyaan"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm(`Yakin ingin mengarsipkan formulir "${form.title}"?`)) {
                                                deleteMutation.mutate(form.id);
                                            }
                                        }}
                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 text-zinc-400 transition-colors"
                                        title="Arsipkan Formulir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Dialog Buat Formulir Baru */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-violet-600" />
                            Buat Formulir Baru
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Tentukan judul formulir. Anda dapat menambahkan pertanyaan modular setelah formulir dibuat.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!newTitle.trim()) return;
                            createMutation.mutate();
                        }}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Judul Formulir *</Label>
                            <Input
                                required
                                placeholder="Contoh: Laporan Konflik Satwa Liar 2026"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="text-xs rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Kustom Tautan Slug (Opsional)</Label>
                            <Input
                                placeholder="Contoh: konflik-satwa (otomatis jika dikosongkan)"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value)}
                                className="text-xs rounded-xl font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Deskripsi / Petunjuk Pengisian</Label>
                            <Textarea
                                placeholder="Tuliskan petunjuk atau keterangan formulir bagi responden..."
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="text-xs rounded-xl h-20"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || !newTitle.trim()}
                                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Lanjut ke Desain Pertanyaan"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
