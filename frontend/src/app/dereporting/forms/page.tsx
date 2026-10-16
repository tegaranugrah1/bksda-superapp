"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import QRCode from "react-qr-code";
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
    CopyPlus,
    QrCode,
    Download,
    Share2,
    Send,
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

    // Dialog Duplikasi Form
    const [duplicateForm, setDuplicateForm] = useState<DynamicFormItem | null>(null);
    const [duplicateTitle, setDuplicateTitle] = useState("");

    // Dialog QR Code / Bagikan
    const [shareForm, setShareForm] = useState<DynamicFormItem | null>(null);

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

    // Mutasi Duplikasi Form
    const duplicateMutation = useMutation({
        mutationFn: async () => {
            if (!duplicateForm) return;
            const res = await api.post(`/dereporting/forms/${duplicateForm.id}/duplicate`, {
                title: duplicateTitle,
            });
            return res.data.data;
        },
        onSuccess: (newForm) => {
            const id = newForm.id;
            setDuplicateForm(null);
            queryClient.invalidateQueries({ queryKey: ["dr-dynamic-forms"] });
            toast.success(`Formulir "${newForm.title}" berhasil diduplikasi (Status: Non-aktif).`, {
                action: {
                    label: "Buka Editor",
                    onClick: () => router.push(`/dereporting/forms/${id}/builder`),
                },
            });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Gagal menduplikasi formulir.");
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

    const handleDownloadQr = () => {
        const svg = document.getElementById("qr-code-svg");
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = 300;
            canvas.height = 300;
            if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, 300, 300);
                ctx.drawImage(img, 10, 10, 280, 280);
                const a = document.createElement("a");
                a.download = `qrcode_${shareForm?.slug || "form"}.png`;
                a.href = canvas.toDataURL("image/png");
                a.click();
                toast.success("Gambar QR Code berhasil diunduh!");
            }
        };
        img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    };

    const handleShareWhatsApp = (slug: string, title: string) => {
        const url = `${window.location.origin}/lapor/${slug}`;
        const text = encodeURIComponent(
            `Halo, mohon kesediaannya untuk mengisi formulir BKSDA Kalimantan Timur:\n*${title}*\n\nBuka tautan:\n${url}`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    };

    const forms = response?.data || [];
    const shareUrl = shareForm && typeof window !== "undefined" ? `${window.location.origin}/lapor/${shareForm.slug}` : "";

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
                    <ClipboardList className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
                    <div>
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">
                            Belum Ada Formulir Dinamis
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                            Buat formulir survei publik pertama Anda untuk mengumpulkan laporan masyarakat atau kegiatan mitra.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold gap-2"
                    >
                        <Plus className="w-4 h-4" /> Buat Formulir Sekarang
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

                                <div className="flex items-center gap-1">
                                    {/* Tombol QR Code / Bagikan */}
                                    <button
                                        type="button"
                                        onClick={() => setShareForm(form)}
                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                                        title="Bagikan / QR Code"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>

                                    {/* Tombol Duplikasi */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDuplicateForm(form);
                                            setDuplicateTitle(`${form.title} (Salinan)`);
                                        }}
                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                                        title="Duplikasi Formulir"
                                    >
                                        <CopyPlus className="w-4 h-4" />
                                    </button>

                                    {/* Tombol Desain Pertanyaan */}
                                    <Link
                                        href={`/dereporting/forms/${form.id}/builder`}
                                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                                        title="Desain Pertanyaan"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Link>

                                    {/* Tombol Arsipkan */}
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

            {/* Modal Dialog Duplikasi Formulir */}
            <Dialog open={!!duplicateForm} onOpenChange={(open) => !open && setDuplicateForm(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <CopyPlus className="w-5 h-5 text-violet-600" />
                            Duplikasi Formulir
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Salin seluruh struktur pertanyaan dan opsi ke formulir baru. Status awal akan non-aktif sehingga dapat Anda tinjau terlebih dahulu.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!duplicateTitle.trim()) return;
                            duplicateMutation.mutate();
                        }}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Judul Formulir Baru *</Label>
                            <Input
                                required
                                value={duplicateTitle}
                                onChange={(e) => setDuplicateTitle(e.target.value)}
                                placeholder="Judul salinan formulir..."
                                className="text-xs rounded-xl"
                            />
                            <p className="text-[11px] text-zinc-400">
                                Anda dapat mengubah judul ini sekarang atau nanti saat mengedit pertanyaan.
                            </p>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDuplicateForm(null)}
                                className="rounded-xl text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={duplicateMutation.isPending || !duplicateTitle.trim()}
                                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                            >
                                {duplicateMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        Menduplikasi...
                                    </>
                                ) : (
                                    "Duplikat Sekarang"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Dialog Bagikan & QR Code */}
            <Dialog open={!!shareForm} onOpenChange={(open) => !open && setShareForm(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 text-center space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
                            <Share2 className="w-5 h-5 text-violet-600" />
                            Bagikan Formulir Publik
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500 line-clamp-2">
                            {shareForm?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {shareForm && (
                        <div className="space-y-5 py-1">
                            {/* Kotak QR Code */}
                            <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm inline-block mx-auto">
                                <QRCode
                                    id="qr-code-svg"
                                    value={shareUrl}
                                    size={180}
                                    level="H"
                                />
                            </div>

                            {/* Kotak Tautan URL */}
                            <div className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                                <span className="truncate flex-1 text-left px-1">{shareUrl}</span>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleCopyLink(shareForm.slug)}
                                    className="h-8 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white gap-1.5 shrink-0"
                                >
                                    {copiedSlug === shareForm.slug ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" /> Disalin
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" /> Salin
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Tombol Aksi Download QR & WhatsApp */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleDownloadQr}
                                    className="rounded-xl text-xs font-bold gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                >
                                    <Download className="w-3.5 h-3.5" /> Unduh QR (.png)
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => handleShareWhatsApp(shareForm.slug, shareForm.title)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2"
                                >
                                    <Send className="w-3.5 h-3.5" /> Kirim WhatsApp
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
