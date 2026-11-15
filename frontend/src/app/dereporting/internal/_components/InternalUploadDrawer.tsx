"use client";

import { useState, FormEvent, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterLocations } from "@/lib/locations";
import { X, Upload, Loader2, Building2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";

interface MasterItem {
    id: string;
    nama?: string;
    tahun?: string;
}

interface CandidateUser {
    id: number;
    name: string;
    nip: string;
    jabatan?: string;
    urusan?: string;
}

interface DrawerProps {
    open: boolean;
    onClose: () => void;
}

const DEFAULT_URUSAN_OPTIONS = [
    "Urusan Kepegawaian & Umum",
    "Urusan Keuangan & BMN",
    "Urusan Perencanaan, Kerjasama & Kehumasan",
    "Urusan Teknis Konservasi",
    "SKW I Berau",
    "SKW II Tenggarong",
    "SKW III Balikpapan",
];

export default function InternalUploadDrawer({ open, onClose }: DrawerProps) {
    const queryClient = useQueryClient();
    const { data: masterLocations = [] } = useMasterLocations(true);
    const urusanOptions = useMemo(() => {
        if (!masterLocations.length) return DEFAULT_URUSAN_OPTIONS;
        const labels: string[] = [];
        const seen = new Set<string>();
        const pushUnique = (label?: string | null) => {
            const clean = (label || "").trim();
            if (!clean) return;
            const key = clean.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                labels.push(clean);
            }
        };
        for (const loc of masterLocations) {
            if (loc.location_type === "balai") continue;
            pushUnique(loc.location_type === "seksi" ? (loc.unit_kerja || loc.name) : loc.name);
        }
        return labels.length > 0 ? labels : DEFAULT_URUSAN_OPTIONS;
    }, [masterLocations]);

    const [bidangId, setBidangId] = useState("");
    const [jenisId, setJenisId] = useState("");
    const [kategoriId, setKategoriId] = useState("");
    const [jenisDataId, setJenisDataId] = useState("");
    const [tahunId, setTahunId] = useState("");
    const [judulLaporan, setJudulLaporan] = useState("");
    const [keterangan, setKeterangan] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sasaran & Distribusi Laporan
    const [targetScope, setTargetScope] = useState<"all" | "restricted">("all");
    const [selectedUrusans, setSelectedUrusans] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<CandidateUser[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);

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

    const { data: candidateUsers } = useQuery({
        queryKey: ["dr-recipients-candidates", userSearchTerm],
        queryFn: async (): Promise<CandidateUser[]> => {
            const res = await api.get("/dereporting/recipients/candidates", {
                params: { search: userSearchTerm },
            });
            return res.data?.data || [];
        },
        enabled: open && targetScope === "restricted",
    });

    const toggleUrusan = (urusan: string) => {
        setSelectedUrusans(prev =>
            prev.includes(urusan) ? prev.filter(u => u !== urusan) : [...prev, urusan]
        );
    };

    const addSelectedUser = (u: CandidateUser) => {
        if (!selectedUsers.some(exist => exist.id === u.id)) {
            setSelectedUsers(prev => [...prev, u]);
        }
        setUserSearchTerm("");
        setShowUserDropdown(false);
    };

    const removeSelectedUser = (userId: number) => {
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    };

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
        if (!file) {
            toast.error("File laporan wajib dilampirkan.");
            return;
        }

        if (targetScope === "restricted" && selectedUrusans.length === 0 && selectedUsers.length === 0) {
            toast.error("Untuk sasaran terbatas, pilih minimal 1 Urusan atau 1 Pegawai penerima.");
            return;
        }

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
            payload.append("target_scope", targetScope);

            if (targetScope === "restricted") {
                const recipients = [
                    ...selectedUrusans.map(u => ({ type: "urusan", urusan_name: u })),
                    ...selectedUsers.map(u => ({ type: "user", user_id: u.id })),
                ];
                payload.append("recipients", JSON.stringify(recipients));
            }

            await api.post("/dereporting/internals", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Laporan berhasil disandikan ke dalam brankas!");
            queryClient.invalidateQueries({ queryKey: ["dr-internals"] });
            onClose();

            // Reset Form
            setBidangId("");
            setJenisId("");
            setKategoriId("");
            setJenisDataId("");
            setTahunId("");
            setJudulLaporan("");
            setKeterangan("");
            setFile(null);
            setTargetScope("all");
            setSelectedUrusans([]);
            setSelectedUsers([]);
        } catch {
            toast.error("Gagal mengunggah laporan. Periksa kelengkapan formulir.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[var(--ds-surface)] border-l border-[var(--ds-border-subtle)] h-full overflow-y-auto animate-in slide-in-from-right duration-300 p-6 flex flex-col justify-between">
                <div>
                    {/* Header Drawer */}
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--ds-border-subtle)] mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
                                <Upload className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[var(--ds-fg)] tracking-tight">
                                    Unggah Laporan Internal Baru
                                </h2>
                                <p className="text-[11px] text-[var(--ds-fg-muted)]">
                                    Arsip kedinasan tersimpan aman di brankas server.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} id="upload-internal-form" className="space-y-4">
                        {/* Judul Laporan */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1.5">
                                Judul Laporan <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={judulLaporan}
                                onChange={(e) => setJudulLaporan(e.target.value)}
                                placeholder="Contoh: Laporan Realisasi Keuangan Triwulan III..."
                                className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)]"
                            />
                        </div>

                        {/* SASARAN & DISTRIBUSI LAPORAN */}
                        <div className="p-3.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]/50 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-[var(--ds-fg)] mb-1 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                                    Sasaran Distribusi Laporan <span className="text-rose-500">*</span>
                                </label>
                                <p className="text-[11px] text-[var(--ds-fg-muted)] mb-2">
                                    Tentukan siapa yang berhak melihat dan menerima dokumen ini.
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetScope("all")}
                                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                            targetScope === "all"
                                                ? "bg-[var(--ds-surface)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-fg)] shadow-xs"
                                                : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface)]"
                                        }`}
                                    >
                                        <span className="block font-bold">Semua Pegawai</span>
                                        <span className="text-[10px] opacity-75">Publik internal Balai</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetScope("restricted")}
                                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                            targetScope === "restricted"
                                                ? "bg-[var(--ds-surface)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-fg)] shadow-xs"
                                                : "border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface)]"
                                        }`}
                                    >
                                        <span className="block font-bold">Sasaran Terbatas</span>
                                        <span className="text-[10px] opacity-75">Urusan & Staf Tertentu</span>
                                    </button>
                                </div>
                            </div>

                            {/* Opsi Terbatas: Multi-Urusan & Multi-Pegawai */}
                            {targetScope === "restricted" && (
                                <div className="pt-2 border-t border-[var(--ds-border-subtle)] space-y-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--ds-fg)] mb-1.5">
                                            Pilih Urusan / Seksi Penerima:
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {urusanOptions.map((u) => {
                                                const isSelected = selectedUrusans.includes(u);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={u}
                                                        onClick={() => toggleUrusan(u)}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 ${
                                                            isSelected
                                                                ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)]"
                                                                : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                                                        }`}
                                                    >
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                        {u}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pilih Pegawai Spesifik */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--ds-fg)] mb-1.5">
                                            Tambah Pegawai Penerima Personal:
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={userSearchTerm}
                                                onFocus={() => setShowUserDropdown(true)}
                                                onChange={(e) => {
                                                    setUserSearchTerm(e.target.value);
                                                    setShowUserDropdown(true);
                                                }}
                                                placeholder="Ketik nama atau NIP pegawai..."
                                                className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)]"
                                            />
                                            {showUserDropdown && candidateUsers && candidateUsers.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl shadow-xl p-1 divide-y divide-[var(--ds-border-subtle)]">
                                                    {candidateUsers.map((u) => (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => addSelectedUser(u)}
                                                            className="w-full text-left p-2 hover:bg-[var(--ds-surface-muted)] rounded-lg text-xs transition-colors flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-semibold text-[var(--ds-fg)]">{u.name}</p>
                                                                <p className="text-[10px] text-[var(--ds-fg-muted)]">{u.nip} • {u.urusan || u.jabatan}</p>
                                                            </div>
                                                            <UserPlus className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected User Pills */}
                                        {selectedUsers.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {selectedUsers.map((u) => (
                                                    <span
                                                        key={u.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300"
                                                    >
                                                        {u.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSelectedUser(u.id)}
                                                            className="hover:text-rose-500 ml-0.5"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Klasifikasi DeReporting */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                    Tahun <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={tahunId}
                                    onChange={(e) => setTahunId(e.target.value)}
                                    className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)]"
                                >
                                    <option value="">— Pilih Tahun —</option>
                                    {tahunList?.map((opt: MasterItem) => (
                                        <option key={opt.id} value={opt.id}>{opt.tahun}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                    Bidang <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={bidangId}
                                    onChange={(e) => handleBidangChange(e.target.value)}
                                    className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)]"
                                >
                                    <option value="">— Pilih Bidang —</option>
                                    {bidangList?.map((opt: MasterItem) => (
                                        <option key={opt.id} value={opt.id}>{opt.nama}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                    Jenis <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    disabled={!bidangId}
                                    value={jenisId}
                                    onChange={(e) => handleJenisChange(e.target.value)}
                                    className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)] disabled:opacity-50"
                                >
                                    <option value="">— Pilih Jenis —</option>
                                    {jenisList?.map((opt: MasterItem) => (
                                        <option key={opt.id} value={opt.id}>{opt.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                    Kategori <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    disabled={!jenisId}
                                    value={kategoriId}
                                    onChange={(e) => handleKategoriChange(e.target.value)}
                                    className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)] disabled:opacity-50"
                                >
                                    <option value="">— Pilih Kategori —</option>
                                    {kategoriList?.map((opt: MasterItem) => (
                                        <option key={opt.id} value={opt.id}>{opt.nama}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                Jenis Data <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                disabled={!kategoriId}
                                value={jenisDataId}
                                onChange={(e) => setJenisDataId(e.target.value)}
                                className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)] disabled:opacity-50"
                            >
                                <option value="">— Pilih Jenis Data —</option>
                                {jenisDataList?.map((opt: MasterItem) => (
                                    <option key={opt.id} value={opt.id}>{opt.nama}</option>
                                ))}
                            </select>
                        </div>

                        {/* Keterangan */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                Keterangan Tambahan
                            </label>
                            <textarea
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                placeholder="Catatan singkat perihal dokumen..."
                                rows={2}
                                className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl p-3 text-xs text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent-solid)]"
                            />
                        </div>

                        {/* Lampiran Berkas */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--ds-fg)] mb-1">
                                Berkas Laporan (PDF / DOCX / XLSX, maks. 25 MB) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="file"
                                required
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--ds-fg)] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--ds-accent-soft)] file:text-[var(--ds-accent-fg)] hover:file:opacity-90"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer Drawer */}
                <div className="pt-4 border-t border-[var(--ds-border-subtle)] flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="upload-internal-form"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--ds-accent-solid)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-xs"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Simpan ke Brankas
                    </button>
                </div>
            </div>
        </div>
    );
}
