"use client";

import React, { useState } from 'react';
import { 
  Inbox, Search, Filter, RefreshCw, 
  FileText, Download, User as UserIcon, AlertCircle, Users, Trash2, Undo2,
  MapPin, Calendar, Briefcase, Hash, History, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateIndonesian } from "@/lib/letter-utils";
import { getStatusStyle, getStatusLabel } from "./_lib/status-helpers";
import type { AssignmentLetter, InboxEmployee } from "./_lib/types";

const getResolvedTempatTujuan = (letter: AssignmentLetter): string => {
    if (letter.tempat_tujuan && letter.tempat_tujuan.trim()) {
        return letter.tempat_tujuan;
    }
    const text = letter.maksud_tujuan || "";
    if (text.includes(" ke ")) {
        const keParts = text.split(" ke ")[1];
        if (keParts) {
            const dest = keParts.split(" dalam rangka ")[0]?.split(" di ")[0]?.trim();
            if (dest) return dest;
        }
    }
    if (text.includes(" di ")) {
        const diParts = text.split(" di ");
        const dest = diParts[diParts.length - 1]?.trim();
        if (dest) return dest;
    }
    if (text.includes(" pada ")) {
        const padaParts = text.split(" pada ")[1];
        if (padaParts) {
            const dest = padaParts.split(" di ")[0]?.trim();
            if (dest) return dest;
        }
    }
    return "-";
};

export default function SuratTugasInbox() {
    const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isTrashView, setIsTrashView] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        variant: 'danger' | 'warning' | 'success';
    }>({
        open: false,
        title: '',
        message: '',
        action: async () => {},
        variant: 'warning'
    });
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data, isLoading: loading, refetch: fetchLetters } = useQuery({
        queryKey: ['surat-tugas-inbox', isTrashView, statusFilter],
        queryFn: async () => {
            const resp = await api.get('/surat-tugas', {
                params: { 
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    trashed: isTrashView ? 'true' : 'false'
                }
            });
            return resp.data.data as AssignmentLetter[];
        },
        staleTime: 0,
        refetchInterval: 3000,
        refetchOnWindowFocus: true,
    });

    const letters: AssignmentLetter[] = React.useMemo(() => data || [], [data]);

    // Keep selectedLetter in sync with fresh data from query polling
    React.useEffect(() => {
        if (selectedLetter && letters.length > 0) {
            const updated = letters.find(l => l.id === selectedLetter.id);
            if (updated && (updated.nomor_surat !== selectedLetter.nomor_surat || updated.status !== selectedLetter.status || updated.maksud_tujuan !== selectedLetter.maksud_tujuan)) {
                setSelectedLetter(updated);
            }
        }
    }, [letters, selectedLetter]);

    const findExistingPlhDraft = React.useCallback(
        (parentLetter: AssignmentLetter) => {
            return letters.find((letter) => {
                if (letter.id === parentLetter.id) return false;
                if (letter.template_type !== 'plh') return false;
                if (!['draft', 'pending'].includes(letter.status)) return false;

                const hasParentNumber = Boolean(
                    parentLetter.nomor_surat &&
                    letter.dasar?.some((item) => item.text?.includes(parentLetter.nomor_surat || ''))
                );
                if (hasParentNumber) return true;

                const parentPlhName = parentLetter.nama_plh?.trim().toLowerCase();
                const hasSamePlhPerson = Boolean(
                    parentPlhName &&
                    letter.employees.some((employee) => employee.nama_lengkap?.trim().toLowerCase() === parentPlhName)
                );

                return hasSamePlhPerson && letter.maksud_tujuan.toLowerCase().includes('pelaksana harian');
            });
        },
        [letters],
    );

    const openPlhBuilder = React.useCallback(
        (parentLetter: AssignmentLetter) => {
            const existingDraft = findExistingPlhDraft(parentLetter);
            if (existingDraft) {
                toast.info('Draft ST PLH yang sudah ada dibuka.');
                router.push(`/kepegawaian/surat-tugas/builder/${existingDraft.id}`);
                return;
            }

            router.push(`/kepegawaian/surat-tugas/create?template=plh&parent_st_id=${parentLetter.id}`);
        },
        [findExistingPlhDraft, router],
    );

    // Sync selectedLetter with current list — if selected item no longer exists, pick first
    const resolvedSelected = React.useMemo(() => {
        if (letters.length === 0) return null;
        if (selectedLetter && letters.find(l => l.id === selectedLetter.id)) return selectedLetter;
        return letters[0];
    }, [letters, selectedLetter]);

    // Keep selectedLetter in sync (only update if different to avoid infinite loop)
    if (resolvedSelected?.id !== selectedLetter?.id) {
        setSelectedLetter(resolvedSelected);
    }

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setUpdatingStatus(true);
        try {
            await api.put(`/surat-tugas/${id}/status`, { status: newStatus });
            toast.success(`Berhasil mengubah status menjadi ${newStatus}`);
            fetchLetters();
            queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
            if (selectedLetter && selectedLetter.id === id) {
                setSelectedLetter({ ...selectedLetter, status: newStatus as AssignmentLetter['status'] });
            }
        } catch (error) {
            console.error('Status update failed', error);
            toast.error('Gagal memperbarui status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            open: true,
            title: 'Hapus ke Arsip?',
            message: 'Surat tugas ini akan dipindahkan ke arsip sampah. Anda masih dapat memulihkannya nanti.',
            variant: 'warning',
            action: async () => {
                try {
                    await api.delete(`/surat-tugas/${id}`);
                    toast.success('Berhasil memindahkan ke sampah');
                    if (selectedLetter?.id === id) setSelectedLetter(null);
                    fetchLetters();
                    queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
                } catch (error) {
                    console.error('Delete failed', error);
                    toast.error('Gagal menghapus surat tugas');
                }
            }
        });
    };

    const handleRestore = (id: string) => {
        setConfirmModal({
            open: true,
            title: 'Pulihkan Surat Tugas?',
            message: 'Surat tugas ini akan dikembalikan ke daftar aktif.',
            variant: 'success',
            action: async () => {
                try {
                    await api.post(`/surat-tugas/${id}/restore`);
                    toast.success('Berhasil memulihkan surat tugas');
                    if (selectedLetter?.id === id) setSelectedLetter(null);
                    fetchLetters();
                    queryClient.invalidateQueries({ queryKey: ["surat-tugas-history"] });
                } catch (error) {
                    console.error('Restore failed', error);
                    toast.error('Gagal memulihkan surat tugas');
                }
            }
        });
    };

    const handleForceDelete = (id: string) => {
        setConfirmModal({
            open: true,
            title: 'Hapus Permanen?',
            message: 'Tindakan ini tidak dapat dibatalkan. Seluruh data akan dihapus selamanya.',
            variant: 'danger',
            action: async () => {
                try {
                    await api.delete(`/surat-tugas/${id}/force`);
                    toast.success('Berhasil menghapus permanen');
                    if (selectedLetter?.id === id) setSelectedLetter(null);
                    fetchLetters();
                } catch (error) {
                    console.error('Force delete failed', error);
                    toast.error('Gagal menghapus permanen');
                }
            }
        });
    };

    const handleDownload = async (id: string) => {
        try {
            const resp = await api.get(`/surat-tugas/${id}/download`, { 
                responseType: 'blob',
                timeout: 30000,
            });
            const contentDisposition = resp.headers['content-disposition'];
            const blob = new Blob([resp.data]);
            const blobType = resp.data?.type || resp.headers['content-type'] || '';
            const ext = blobType.includes('png') ? 'png' : blobType.includes('jpeg') || blobType.includes('jpg') ? 'jpg' : 'pdf';
            let filename = `DasarSurat_${id.substring(0, 8)}.${ext}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
                }
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            // IDM or download manager may intercept — file still downloads
            // Only show error if it's genuinely a server error
        }
    };

    const displayedLetters = letters.filter((l: AssignmentLetter) => 
        l.maksud_tujuan.toLowerCase().includes(search.toLowerCase()) || 
        (l.nomor_surat && l.nomor_surat.toLowerCase().includes(search.toLowerCase())) ||
        l.employees.some((emp: InboxEmployee) => emp.nama_lengkap.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section: Matches History Page exactly */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Kepegawaian & SDM</h2>
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Inbox Surat Tugas</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Otorisasi dan kelola pengajuan surat tugas pegawai secara real-time.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsTrashView(!isTrashView)} 
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                            isTrashView 
                                ? "bg-red-50 dark:bg-red-500/10 text-red-600 border-red-100 dark:border-red-500/20" 
                                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        )}
                    >
                        {isTrashView ? <History className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        {isTrashView ? "Inbox Aktif" : "Arsip Sampah"}
                    </button>
                    <button 
                        onClick={() => fetchLetters()} 
                        className="p-3 bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-blue-600 rounded-2xl transition-all shadow-sm"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Main Dual View Box: Matches History Page rounded corners and border */}
            <div className="h-[750px] flex flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm">
                {/* Left Panel: List */}
                <div className="w-full md:w-[360px] border-r border-slate-100 dark:border-zinc-800 bg-slate-50/20 flex flex-col shrink-0 relative">
                    {/* Header Section */}
                    <div className="p-6 pb-4 bg-white dark:bg-zinc-900 sticky top-0 z-10 border-b border-slate-100 dark:border-zinc-800">
                        <div className="space-y-3">
                            <div className="relative group">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Cari kegiatan atau nama..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all font-semibold text-slate-700 dark:text-zinc-200 placeholder-slate-400"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full appearance-none pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl text-[10px] font-bold text-slate-600 dark:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Menunggu Persetujuan</option>
                                    <option value="approved">Diterbitkan</option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* List Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/20 dark:bg-zinc-900/50">
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-24 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800 animate-pulse rounded-2xl" />
                                ))}
                            </div>
                        ) : displayedLetters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-6">
                                <Inbox className="w-10 h-10 opacity-10 mb-2" />
                                <p className="text-xs font-bold text-slate-500">Tidak ada pengajuan</p>
                            </div>
                        ) : (
                            displayedLetters.map((l: AssignmentLetter) => (
                                <div
                                    key={l.id}
                                    onClick={() => setSelectedLetter(l)}
                                    className={cn(
                                        "p-4 rounded-2xl transition-all cursor-pointer border relative group",
                                        selectedLetter?.id === l.id 
                                            ? "bg-white dark:bg-zinc-800 border-blue-500 shadow-md ring-1 ring-blue-500/10" 
                                            : "bg-white dark:bg-zinc-800 border-slate-100 dark:border-zinc-800 hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={cn("px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider", getStatusStyle(l.status))}>
                                            {getStatusLabel(l.status)}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                            {formatDateIndonesian(l.created_at)}
                                        </div>
                                    </div>

                                    <h3 className={cn(
                                        "text-xs font-bold leading-snug mb-3 transition-colors line-clamp-2",
                                        selectedLetter?.id === l.id ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-400 group-hover:text-blue-700"
                                    )}>
                                        {l.maksud_tujuan}
                                    </h3>

                                    {l.template_type === "bmn-pemeriksaan" && (
                                        <div className="mb-2">
                                            <span
                                                className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                                                title="Template BMN Penghapusan"
                                            >
                                                Template BMN
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3 text-slate-400" />
                                                {l.employees.length}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="truncate max-w-[80px]">{getResolvedTempatTujuan(l).split(',')[0]}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isTrashView) { handleRestore(l.id); } else { handleDelete(l.id); }
                                                }}
                                                className={cn(
                                                    "p-1.5 rounded-lg",
                                                    isTrashView ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" : "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                )}
                                            >
                                                {isTrashView ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Detail View */}
                <div className="flex-1 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col relative">
                    {selectedLetter ? (
                        <>
                        <div className="flex-1 overflow-y-auto p-8 pb-16 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Header Section */}
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <div className={cn("px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider", getStatusStyle(selectedLetter.status))}>
                                            {getStatusLabel(selectedLetter.status)}
                                        </div>
                                        {selectedLetter.template_type === "bmn-pemeriksaan" && (
                                            <div className="px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/30 text-[9px] font-black uppercase tracking-wider">
                                                Template BMN Penghapusan
                                            </div>
                                        )}
                                        {selectedLetter.nomor_surat ? (
                                            <div className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[9px] font-black tracking-wider flex items-center gap-1.5">
                                                <Hash className="w-3 h-3" />
                                                {selectedLetter.nomor_surat}
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700 text-[9px] font-black tracking-wider uppercase">
                                                Draft / Menunggu Nomor
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-6 tracking-tight">
                                        {selectedLetter.maksud_tujuan}
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/50 space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Periode</span>
                                            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                {formatDateIndonesian(selectedLetter.tanggal_mulai)} — {formatDateIndonesian(selectedLetter.tanggal_selesai)}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/50 space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Lokasi</span>
                                            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                                {getResolvedTempatTujuan(selectedLetter)}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/50 space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Dana</span>
                                            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                                                {selectedLetter.sumber_dana === 'other' ? selectedLetter.sumber_dana_other : selectedLetter.sumber_dana.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PLH & Tanda Setuju Section */}
                                {(selectedLetter.nama_plh || selectedLetter.has_seksi_employee) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedLetter.nama_plh && (
                                            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 space-y-3">
                                                {(() => {
                                                    const existingPlhDraft = findExistingPlhDraft(selectedLetter);
                                                    return (
                                                        <>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">Nama PLH</span>
                                                    <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                                        <UserIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                        <span className="truncate">{selectedLetter.nama_plh}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => openPlhBuilder(selectedLetter)}
                                                    className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/20"
                                                    title={existingPlhDraft ? "Buka draft ST PLH yang sudah ada" : "Generate Surat Tugas PLH dari data ini"}
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                                                    {existingPlhDraft ? "Buka Draft ST PLH" : "Buat ST PLH"}
                                                </Button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        {selectedLetter.has_seksi_employee && (
                                            <div className={`p-4 rounded-2xl border space-y-1 ${
                                                selectedLetter.tanda_setuju === 'sudah'
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
                                            }`}>
                                                <span className={`text-[9px] font-black uppercase tracking-widest block ${
                                                    selectedLetter.tanda_setuju === 'sudah'
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-amber-600 dark:text-amber-400'
                                                }`}>Persetujuan Kepala Seksi</span>
                                                <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full shadow-sm ${
                                                        selectedLetter.tanda_setuju === 'sudah' ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`} />
                                                    {selectedLetter.tanda_setuju === 'sudah' 
                                                        ? 'Sudah disetujui' 
                                                        : selectedLetter.tanda_setuju === 'belum'
                                                            ? 'Belum disetujui'
                                                            : 'Tidak ada informasi'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Keterangan Section */}
                                {selectedLetter.keterangan && (
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Keterangan Lainnya</span>
                                        <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedLetter.keterangan}
                                        </p>
                                    </div>
                                )}

                                {/* Personil Section */}
                                <div className="space-y-4">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-zinc-300 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        Daftar Personil ({selectedLetter.employees.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedLetter.employees.map((emp) => (
                                            <div key={emp.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all group shadow-sm">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-800 dark:text-zinc-200 truncate leading-none mb-1">{emp.nama_lengkap}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 truncate tracking-widest leading-none">NIP. {emp.nip?.startsWith("MMP-") ? "-" : (emp.nip || "-")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* File Section */}
                                <div className="flex flex-col lg:flex-row gap-4">
                                    <div className="flex-1 p-6 rounded-3xl bg-slate-900 dark:bg-zinc-800 text-white flex flex-col gap-6 relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black tracking-tight">Dokumen Dasar Surat</h4>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">PDF Dokumen Pendukung</p>
                                            </div>
                                        </div>

                                        {selectedLetter.file_surat_path ? (
                                            <button 
                                                onClick={() => handleDownload(selectedLetter.id)}
                                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                UNDUH PDF
                                            </button>
                                        ) : (
                                            <div className="py-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tidak ada lampiran</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full lg:w-64 flex flex-col gap-3">
                                        {isTrashView ? (
                                            <>
                                                <Button 
                                                    onClick={() => handleRestore(selectedLetter.id)}
                                                    className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-blue-500/20"
                                                >
                                                    Pulihkan Surat
                                                </Button>
                                                <Button 
                                                    onClick={() => handleForceDelete(selectedLetter.id)}
                                                    variant="outline"
                                                    className="h-12 rounded-xl border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 font-black text-[10px] tracking-widest uppercase"
                                                >
                                                    Hapus Permanen
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {selectedLetter.status === 'pending' ? (
                                                    <Button 
                                                        onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${selectedLetter.id}`)}
                                                        className="h-20 rounded-3xl bg-linear-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 flex flex-col items-center justify-center gap-1"
                                                    >
                                                        <span className="text-[10px] font-black tracking-[0.2em] opacity-80 uppercase leading-none">Otorisasi ST</span>
                                                        <span className="text-sm font-black tracking-tight leading-none mt-1 uppercase">Proses Sekarang</span>
                                                    </Button>
                                                ) : ['diterbitkan', 'approved', 'completed', 'published'].includes((selectedLetter.status || "").toLowerCase()) ? (
                                                    <Button 
                                                        onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${selectedLetter.id}`)}
                                                        className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        LIHAT SURAT TUGAS
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        onClick={() => router.push(`/kepegawaian/surat-tugas/builder/${selectedLetter.id}`)}
                                                        className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs tracking-widest shadow-lg shadow-indigo-500/20"
                                                    >
                                                        EDIT SURAT TUGAS
                                                    </Button>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button 
                                                        onClick={() => handleUpdateStatus(selectedLetter.id, 'rejected')}
                                                        disabled={updatingStatus || ['rejected', 'approved', 'completed'].includes(selectedLetter.status)}
                                                        variant="outline"
                                                        className="h-10 rounded-xl border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50 font-black text-[9px] tracking-widest uppercase"
                                                    >
                                                        Tolak
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleDelete(selectedLetter.id)}
                                                        variant="outline"
                                                        className="h-10 rounded-xl border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 font-black text-[9px] tracking-widest uppercase"
                                                    >
                                                        Arsipkan
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                            <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mb-6 border border-slate-100 dark:border-zinc-700">
                                <FileText className="w-10 h-10 text-slate-200 dark:text-zinc-700" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-zinc-300 mb-1 tracking-tight">Seleksi Pengajuan</h2>
                            <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 max-w-[200px] mx-auto leading-relaxed">
                                Pilih pengajuan dari daftar di kiri untuk melihat detail.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setConfirmModal({ ...confirmModal, open: false })} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-300">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl",
                            confirmModal.variant === 'danger' ? "bg-red-50 dark:bg-red-500/10 text-red-600 shadow-red-500/10" :
                            confirmModal.variant === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 shadow-emerald-500/10" :
                            "bg-amber-50 dark:bg-amber-500/10 text-amber-600 shadow-amber-500/10"
                        )}>
                            {confirmModal.variant === 'danger' ? <Trash2 className="w-8 h-8" /> :
                             confirmModal.variant === 'success' ? <Undo2 className="w-8 h-8" /> :
                             <AlertCircle className="w-8 h-8" />}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">{confirmModal.title}</h3>
                        <p className="text-slate-500 dark:text-zinc-400 text-center text-[11px] font-bold leading-relaxed mb-10">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={async () => {
                                    await confirmModal.action();
                                    setConfirmModal({ ...confirmModal, open: false });
                                }}
                                className={cn(
                                    "flex-1 py-3.5 rounded-xl text-white font-black text-[10px] tracking-widest uppercase shadow-xl transition-all active:scale-95",
                                    confirmModal.variant === 'danger' ? "bg-red-600 shadow-red-500/30" :
                                    confirmModal.variant === 'success' ? "bg-emerald-600 shadow-emerald-500/30" :
                                    "bg-blue-600 shadow-blue-500/30"
                                )}
                            >
                                Ya
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
