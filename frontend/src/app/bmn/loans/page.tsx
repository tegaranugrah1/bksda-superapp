"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Pencil, Trash2, Loader2, RotateCcw, Package, Handshake, AlertTriangle, CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Loan {
    id: string;
    asset_id: string;
    asset?: { id: string; kode_barang: string | null; nama_barang: string | null };
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
        case 'dipinjam': return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-[10px] font-bold">Dipinjam</Badge>;
        case 'dikembalikan': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold">Dikembalikan</Badge>;
        case 'terlambat': return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-[10px] font-bold">Terlambat</Badge>;
        default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function LoansPage() {
    const router = useRouter();
    const [records, setRecords] = useState<Loan[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");

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

    const fetchRecords = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, per_page: 10 };
            if (filterStatus !== "all") params.status = filterStatus;

            const res = await api.get('/bmn/loans', { params });
            setRecords(res.data.data || []);
            setPagination({
                current_page: res.data.meta?.current_page || res.data.current_page || 1,
                last_page: res.data.meta?.last_page || res.data.last_page || 1,
                total: res.data.meta?.total || res.data.total || 0,
            });
        } catch (error) {
            console.error("Failed to fetch loans:", error);
            toast.error("Gagal memuat data peminjaman");
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

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
            fetchRecords(pagination.current_page);
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
            fetchRecords(pagination.current_page);
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
            setDeletingRecord(null);
            fetchRecords(pagination.current_page);
        } catch {
            toast.error("Gagal menghapus");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">BMN</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Sirkulasi & Pinjaman</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Handshake className="w-6 h-6 text-amber-500" /> Daftar Peminjaman Aset
                    </h1>
                </div>
                <Button
                    onClick={() => router.push('/bmn/loans/create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 transition-all group"
                >
                    <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                    Pinjam Aset
                </Button>
            </div>

            {/* Filter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex gap-4 items-end">
                    <div className="w-full sm:w-64 space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Peminjaman</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                {STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Riwayat Peminjaman ({pagination.total})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[250px]">Aset</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peminjam</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tgl Pinjam</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jatuh Tempo</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                                        <p className="text-slate-500 text-sm">Memuat data peminjaman...</p>
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20">
                                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                        <p className="text-slate-900 font-medium">Belum ada data peminjaman</p>
                                        <p className="text-sm text-slate-500 mt-1">Sesuai dengan filter pencarian</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900 line-clamp-2 text-sm">{r.asset?.nama_barang || 'Aset Terhapus'}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter mt-0.5">{r.asset?.kode_barang}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800 text-sm">{r.borrower?.name || '-'}</div>
                                            {r.borrower?.nip && <div className="text-[10px] text-slate-500 mt-0.5">NIP. {r.borrower.nip}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-sm whitespace-nowrap">
                                            {formatDate(r.loan_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-600 text-sm whitespace-nowrap font-medium">{formatDate(r.due_date)}</div>
                                            {r.return_date && (
                                                <div className="mt-1 flex flex-col gap-1">
                                                    <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 w-fit">
                                                        Kembali: {formatDate(r.return_date)}
                                                    </div>
                                                    {r.return_condition && (
                                                        <div className="text-[9px] text-slate-500 italic flex items-center gap-1.5">
                                                            <div className={cn("w-1.5 h-1.5 rounded-full",
                                                                r.return_condition === 'Baik' ? 'bg-emerald-500' :
                                                                r.return_condition === 'Rusak Ringan' ? 'bg-amber-500' : 'bg-red-500'
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
                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {r.late_days} hari
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 justify-center">
                                                {r.status !== 'dikembalikan' && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Kembalikan"
                                                        onClick={() => openReturnModal(r)}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditModal(r)} disabled={r.status === 'dikembalikan'} title="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Hapus" onClick={() => { setDeletingRecord(r); setIsDeleteModalOpen(true); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500">Halaman {pagination.current_page} dari {pagination.last_page}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => fetchRecords(pagination.current_page - 1)} disabled={pagination.current_page === 1}>Sebelumnya</Button>
                            <Button variant="outline" size="sm" onClick={() => fetchRecords(pagination.current_page + 1)} disabled={pagination.current_page === pagination.last_page}>Selanjutnya</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Return Modal */}
            <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-emerald-600" /> Kembalikan Aset?</DialogTitle>
                        <DialogDescription>
                            Konfirmasi pengembalian aset <strong>{returningRecord?.asset?.nama_barang}</strong> dari <strong>{returningRecord?.borrower?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Kondisi Setelah Kembali *</Label>
                            <Select value={returnCondition} onValueChange={setReturnCondition}>
                                <SelectTrigger><SelectValue placeholder="Pilih kondisi..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Baik">✅ Baik</SelectItem>
                                    <SelectItem value="Rusak Ringan">⚠️ Rusak Ringan</SelectItem>
                                    <SelectItem value="Rusak Berat">❌ Rusak Berat</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>Batal</Button>
                        <Button onClick={handleReturn} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kembalikan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-blue-600" /> Edit Peminjaman</DialogTitle>
                        <DialogDescription>Perbarui detail peminjaman aset <strong>{editingRecord?.asset?.nama_barang}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tanggal Pinjam</Label>
                                <Input type="date" value={editForm.loan_date} onChange={(e) => setEditForm({ ...editForm, loan_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Jatuh Tempo</Label>
                                <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tujuan Peminjaman</Label>
                            <Textarea value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} placeholder="Tujuan peminjaman..." rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Catatan tambahan..." rows={2} />
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" /> Hapus Peminjaman?</DialogTitle>
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
