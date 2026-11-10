"use client";

import { useState, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Loader2, RotateCcw, Package, AlertTriangle, CalendarClock, Handshake } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRole } from "@/hooks/useRole";
import { ReturnLoanModal } from "./_components/ReturnLoanModal";

interface Loan {
    id: string;
    asset_id: string;
    asset?: { id: string; kode_barang: string | null; nama_barang: string | null; nup: string | null; nup_lama: string | null; merk: string | null; merk_tipe: string | null; pengguna: string | null; no_polisi: string | null; lokasi_ruang: string | null; };
    borrower_employee_id: string;
    borrower?: { id: string; name: string; nip: string | null };
    loan_date: string;
    due_date: string | null;
    return_date: string | null;
    return_condition: string | null;
    status: string;
    purpose: string | null;
    notes: string | null;
    late_days?: number | null;
}

const STATUS_OPTIONS = [
    { value: 'dipinjam', label: 'Dipinjam' },
    { value: 'dikembalikan', label: 'Dikembalikan' },
    { value: 'terlambat', label: 'Terlambat' },
];

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'dipinjam': return <Badge data-status="info" className="text-xs font-bold">Dipinjam</Badge>;
        case 'dikembalikan': return <Badge data-status="success" className="text-xs font-bold">Dikembalikan</Badge>;
        case 'terlambat': return <Badge data-status="danger" className="text-xs font-bold">Terlambat</Badge>;
        default: return <Badge data-status="neutral" className="text-xs">{status || 'Belum diisi'}</Badge>;
    }
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function LoansPage() {
    const router = useRouter();
    const statusId = useId();
    const dialogOpener = useRef<HTMLElement | null>(null);
    const queryClient = useQueryClient();
    const { hasPermission, canWrite, isAdmin } = useRole();
    const canManage = canWrite || isAdmin || hasPermission("bmn.asset.update");
    const [page, setPage] = useState(1);
    const [filterStatus, setFilterStatus] = useState("all");

    const { data: response, isLoading: loading, isFetching, isError, refetch } = useQuery({
        queryKey: ["bmn-loans", page, filterStatus],
        queryFn: async () => {
            const params: Record<string, string | number> = { page, per_page: 10 };
            if (filterStatus !== "all") params.status = filterStatus;
            const res = await api.get('/bmn/loans', { params });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    const records: Loan[] = response?.data || [];
    const pagination = {
        current_page: response?.meta?.current_page || response?.current_page || 1,
        last_page: response?.meta?.last_page || response?.last_page || 1,
        total: response?.meta?.total || response?.total || 0,
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [returnCondition, setReturnCondition] = useState("Baik");
    const [deletingRecord, setDeletingRecord] = useState<Loan | null>(null);
    const [returningRecord, setReturningRecord] = useState<Loan | null>(null);
    const [editingRecord, setEditingRecord] = useState<Loan | null>(null);
    const [saving, setSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        loan_date: "",
        due_date: "",
        purpose: "",
        notes: "",
    });

    const openReturnModal = (record: Loan) => {
        setReturningRecord(record);
        setReturnCondition("Baik");
        setIsReturnModalOpen(true);
    };

    const openEditModal = (record: Loan) => {
        setEditingRecord(record);
        setEditForm({
            loan_date: record.loan_date || "",
            due_date: record.due_date || "",
            purpose: record.purpose || "",
            notes: record.notes || "",
        });
        setIsEditModalOpen(true);
    };

    const handleReturn = async () => {
        if (!returningRecord) return;
        setSaving(true);
        try {
            await api.post(`/bmn/loans/${returningRecord.id}/return`, {
                return_condition: returnCondition,
            });
            toast.success("Aset berhasil dikembalikan");
            setIsReturnModalOpen(false);
            setReturningRecord(null);
            queryClient.invalidateQueries({ queryKey: ["bmn-loans"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-asset", returningRecord.asset_id] });
            router.refresh();
        } catch (error) {
            const err = error as { response?: { data?: { message?: string; error?: string } } };
            toast.error(err.response?.data?.message || err.response?.data?.error || "Gagal mengembalikan");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!editingRecord) return;
        setSaving(true);
        try {
            await api.put(`/bmn/loans/${editingRecord.id}`, editForm);
            toast.success("Peminjaman berhasil diperbarui");
            setIsEditModalOpen(false);
            setEditingRecord(null);
            queryClient.invalidateQueries({ queryKey: ["bmn-loans"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-asset", editingRecord.asset_id] });
            router.refresh();
        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Gagal memperbarui");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingRecord) return;
        setSaving(true);
        try {
            await api.delete(`/bmn/loans/${deletingRecord.id}`);
            toast.success("Peminjaman berhasil dihapus");
            setIsDeleteModalOpen(false);

            // Store asset_id before nullifying
            const assetId = deletingRecord.asset_id;
            setDeletingRecord(null);

            queryClient.invalidateQueries({ queryKey: ["bmn-loans"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-asset", assetId] });
            router.refresh();
        } catch {
            toast.error("Gagal menghapus");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 sm:p-5 md:p-7 space-y-5 text-[var(--ds-fg)] ">
            {/* 1. Unified Clean Enterprise Header Bar */}
            <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
                        <Handshake className="w-5 h-5" />
                    </div>
                    <div>

                        <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
                            Peminjaman Aset
                        </h1>
                        <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                            Kelola data sirkulasi, peminjaman, dan pengembalian BMN.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Button
                        onClick={() => router.push('/bmn/loans/create')}
                        size="sm"
                        className="rounded-xl gap-2 text-xs bmn-primary shadow-sm  cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> Pinjam Aset
                    </Button>
                </div>
            </div>

            {/* Sliding Pill Status Filter */}
            <div className="flex flex-wrap items-center gap-1 bg-[var(--ds-surface-muted)] p-1 rounded-xl w-fit">
                {[
                    { value: "all", label: "Semua Status" },
                    ...STATUS_OPTIONS,
                ].map((opt) => {
                    const isActive = filterStatus === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => { setFilterStatus(opt.value); setPage(1); }}
                            className={cn(
                                "relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none",
                                isActive
                                    ? "text-[var(--ds-accent-on-solid)] font-bold"
                                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                            )}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId={`${statusId}-status`}
                                    initial={false}
                                    className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                />
                            )}
                            <span className="relative z-10">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-2xs">
                <div className="p-4 border-b border-[var(--ds-border-subtle)] flex justify-between items-center">
                    <h2 className="font-semibold text-[var(--ds-fg)] text-sm">Riwayat Peminjaman ({pagination.total})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className={`${records.length ? "bmn-wide-table" : ""} w-full text-left`}>
                        <thead className={records.length ? "" : "hidden sm:table-header-group"}>
                            <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider w-[200px]">Aset</th>
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Kode / NUP</th>
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Lokasi & Pengguna</th>
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Peminjam</th>
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Tgl Pinjam</th>
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Jatuh Tempo</th>
                                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-center">Status</th>
                                {canManage && (
                                    <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-center w-32">Aksi</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={canManage ? 8 : 7} className="px-4 py-4">
                                            <div className="h-10 bg-[var(--ds-surface-muted)] rounded-xl" />
                                        </td>
                                    </tr>
                                ))
                            ) : isError ? (<tr><td colSpan={canManage ? 8 : 7} className="p-8 text-center"><p role="alert" className="text-[var(--ds-status-danger-fg)]">Riwayat peminjaman gagal dimuat.</p><Button variant="outline" className="mt-3" onClick={() => refetch()}>Coba lagi</Button></td></tr>) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? 8 : 7} className="text-center py-20">
                                        <Package className="w-12 h-12 mx-auto mb-3 text-[var(--ds-fg-muted)]" />
                                        <p className="text-[var(--ds-fg)] font-medium">Belum ada data peminjaman</p>
                                        <p className="text-sm text-[var(--ds-fg-muted)] mt-1">Sesuai dengan filter pencarian</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="hover:bg-[var(--ds-surface-muted)] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-[var(--ds-fg)] line-clamp-2 text-sm">{r.asset?.nama_barang || 'Aset Terhapus'}</div>
                                            {(r.asset?.merk || r.asset?.merk_tipe) && <div className="text-xs text-[var(--ds-fg-muted)]">{r.asset.merk_tipe || r.asset.merk}</div>}
                                            {r.asset?.no_polisi && r.asset.no_polisi !== '-' && <div className="text-xs text-[var(--ds-status-info-fg)] font-medium mt-0.5">No. Polisi: {r.asset.no_polisi}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-mono font-bold text-[var(--ds-accent-fg)]">{r.asset?.kode_barang || '-'}</div>
                                            <div className="text-xs text-[var(--ds-fg-muted)] font-mono tracking-tighter mt-0.5">NUP: {r.asset?.nup || '-'}</div>
                                            {r.asset?.nup_lama && <div className="text-xs text-[var(--ds-fg-muted)] font-mono tracking-tighter">NUP Lama: {r.asset.nup_lama}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-[var(--ds-fg-muted)]">{r.asset?.lokasi_ruang || '-'}</div>
                                            {r.asset?.pengguna && <div className="text-xs text-[var(--ds-status-warning-fg)] mt-0.5">Pengguna: {r.asset.pengguna}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-[var(--ds-fg)] text-sm">{r.borrower?.name || '-'}</div>
                                            {r.borrower?.nip && <div className="text-xs text-[var(--ds-fg-muted)] mt-0.5">NIP. {r.borrower.nip}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--ds-fg-muted)] text-sm whitespace-nowrap">
                                            {formatDate(r.loan_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[var(--ds-fg-muted)] text-sm whitespace-nowrap font-medium">{formatDate(r.due_date)}</div>
                                            {r.return_date && (
                                                <div className="mt-1 flex flex-col gap-1">
                                                    <div className="text-xs text-[var(--ds-accent-fg)] font-bold bg-[var(--ds-accent-soft)] px-1.5 py-0.5 rounded-md border border-[var(--ds-accent-soft-border)] w-fit">
                                                        Kembali: {formatDate(r.return_date)}
                                                    </div>
                                                    {r.return_condition && (
                                                        <div className="text-xs text-[var(--ds-fg-muted)] italic flex items-center gap-1.5">
                                                            <div className={cn("w-1.5 h-1.5 rounded-full",
                                                                r.return_condition === 'Baik' ? 'bg-[var(--ds-status-success-fg)]' :
                                                                r.return_condition === 'Rusak Ringan' ? 'bg-[var(--ds-status-warning-fg)]' : r.return_condition === 'Rusak Berat' ? 'bg-[var(--ds-status-danger-fg)]' : 'bg-[var(--ds-status-neutral-fg)]'
                                                            )} />
                                                            Kondisi: {r.return_condition}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                {getStatusBadge(r.status)}
                                                {r.late_days && r.late_days > 0 && (
                                                    <span className="text-xs font-bold text-[var(--ds-status-danger-fg)] bg-[var(--ds-status-danger-bg)] px-1.5 py-0.5 rounded-md border border-[var(--ds-status-danger-border)] flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {r.late_days} hari
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {canManage && (
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1.5 justify-center items-center">
                                                    {r.status !== 'dikembalikan' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="min-h-9 min-w-9 h-9 w-9 text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)]  rounded-lg cursor-pointer"
                                                            title="Kembalikan Aset"
                                                            aria-label="Kembalikan Aset"
                                                            onClick={() => openReturnModal(r)}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="min-h-9 min-w-9 h-9 w-9 text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)]  rounded-lg cursor-pointer"
                                                        onClick={() => openEditModal(r)}
                                                        disabled={r.status === 'dikembalikan'}
                                                        title="Edit Peminjaman"
                                                        aria-label="Edit Peminjaman"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="bmn-icon-danger min-h-9 min-w-9 h-9 w-9 text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)]  rounded-lg cursor-pointer"
                                                        title="Hapus Catatan"
                                                        aria-label="Hapus Catatan"
                                                        onClick={() => { setDeletingRecord(r); setIsDeleteModalOpen(true); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[var(--ds-border-subtle)] gap-3">
                        <p className="text-xs text-[var(--ds-fg-muted)]">Total {pagination.total} transaksi peminjaman (Hal {page} / {pagination.last_page})</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || isFetching} className="text-xs rounded-lg">Sebelumnya</Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.last_page || isFetching} className="text-xs rounded-lg">Selanjutnya</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Return Modal */}
            <ReturnLoanModal
                open={isReturnModalOpen}
                onOpenChange={setIsReturnModalOpen}
                assetName={returningRecord?.asset?.nama_barang || undefined}
                borrowerName={returningRecord?.borrower?.name || undefined}
                returnCondition={returnCondition}
                setReturnCondition={setReturnCondition}
                handleReturn={handleReturn}
                saving={saving}
            />

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent onOpenAutoFocus={() => { dialogOpener.current = document.activeElement as HTMLElement | null; }} onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-[var(--ds-status-info-fg)]" /> Edit Peminjaman</DialogTitle>
                        <DialogDescription>Perbarui detail peminjaman aset <strong>{editingRecord?.asset?.nama_barang}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tanggal Pinjam</Label>
                                <Input aria-label="Tanggal Pinjam" type="date" value={editForm.loan_date} onChange={(e) => setEditForm({ ...editForm, loan_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Jatuh Tempo</Label>
                                <Input aria-label="Jatuh Tempo" type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tujuan Peminjaman</Label>
                            <Textarea aria-label="Tujuan Peminjaman" value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} placeholder="Tujuan peminjaman..." rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea aria-label="Catatan" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Catatan tambahan..." rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                        <Button onClick={handleEdit} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent onOpenAutoFocus={() => { dialogOpener.current = document.activeElement as HTMLElement | null; }} onCloseAutoFocus={(event) => { event.preventDefault(); dialogOpener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[var(--ds-status-danger-fg)]"><Trash2 className="w-5 h-5" /> Hapus Peminjaman?</DialogTitle>
                        <DialogDescription>Hapus data peminjaman aset <strong>{deletingRecord?.asset?.nama_barang}</strong>? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
