"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Package, ShoppingBag, Check, Search, X, CalendarIcon, FileText, Info, Boxes, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmployeeSelect, type Employee } from "@/components/ui/employee-select";
import {
  AssetCatalogModal,
  LoanAsset,
  getPrimaryPhoto,
  formatMerkTipe,
  getAssetUser,
} from "./_components/AssetCatalogModal";

export default function LoanCreatePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [openCatalogModal, setOpenCatalogModal] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<LoanAsset[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [purpose, setPurpose] = useState("");
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const handleNext = () => {
        if (step === 1) {
            if (selectedAssets.length === 0) { toast.error("Pilih minimal satu aset"); return; }
            setStep(2);
        } else if (step === 2) {
            if (!employeeId) { toast.error("Pilih pegawai peminjam"); return; }
            if (!startDate || !endDate) { toast.error("Pilih durasi peminjaman"); return; }
            if (new Date(endDate) < new Date(startDate)) { toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai"); return; }
            if (!purpose || purpose.length < 10) { toast.error("Isi tujuan peminjaman (min. 10 karakter)"); return; }
            setStep(3);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await api.post('/bmn/loans', {
                asset_ids: selectedAssets.map(a => a.id),
                borrower_employee_id: employeeId,
                loan_date: startDate,
                due_date: endDate,
                purpose,
            });
            toast.success("Permohonan berhasil dikirim");
            router.push('/bmn/loans');
        } catch (error: any) {
            console.error("Failed to submit loan:", error);
            toast.error(error?.response?.data?.message || error?.response?.data?.error || "Gagal mengirim permohonan");
        } finally { setSubmitting(false); }
    };

    const calcDuration = () => {
        if (!startDate || !endDate) return "-";
        const diff = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return `${diff} Hari`;
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

    return (
        <div className="h-full bg-zinc-50 dark:bg-zinc-900/50 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-none z-30">
                <div className="w-full px-6 md:px-10 h-16 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><ArrowLeft className="w-5 h-5" /></Button>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Form Permohonan Peminjaman Aset</h1>
                        <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">Lengkapi detail di bawah ini untuk mengajukan peminjaman Barang Milik Negara.</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="w-full space-y-4 pb-4">
                    {/* Stepper */}
                    <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto mb-8">
                        <div className="absolute left-0 top-1/2 -tranzinc-y-1/2 w-full h-0.5 bg-zinc-200 -z-10" />
                        <div className="absolute left-0 top-1/2 -tranzinc-y-1/2 h-0.5 bg-emerald-600 -z-10 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />
                        {[{ id: 1, label: "Daftar Barang" }, { id: 2, label: "Detail" }, { id: 3, label: "Konfirmasi" }].map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 px-2">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all", step >= s.id ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-white dark:bg-zinc-900 border-zinc-300 text-zinc-400")}>
                                    {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                                </div>
                                <span className={cn("text-xs font-bold uppercase tracking-wider", step >= s.id ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-400")}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        {/* Main Content */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Step 1: Asset Selection */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Catalog Trigger Banner */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
                                                <Boxes className="w-5 h-5 text-emerald-600" />
                                                Pilih Aset dari Katalog BMN
                                            </div>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
                                                Buka katalog visual berfoto lengkap (kendaraan operasional dinas, laptop, PC, GPS, perlengkapan lapangan) dengan filter kategori cepat.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => setOpenCatalogModal(true)}
                                            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shrink-0"
                                        >
                                            <Search className="w-4 h-4" />
                                            <span>Buka Katalog Aset</span>
                                        </Button>
                                    </div>

                                    {/* Selected Assets Deck */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                                                Daftar Barang Terpilih ({selectedAssets.length})
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {selectedAssets.length > 0 && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8 rounded-lg text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                                            onClick={() => setOpenCatalogModal(true)}
                                                        >
                                                            + Tambah Barang
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs h-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                            onClick={() => setSelectedAssets([])}
                                                        >
                                                            Reset Semua
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {selectedAssets.length === 0 ? (
                                            <div className="p-12 text-center text-zinc-400">
                                                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-zinc-300 dark:text-zinc-600">
                                                    <Package className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Belum ada barang dipilih</p>
                                                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                                                    Klik tombol di bawah ini untuk membuka katalog visual aset BMN dan memilih barang yang akan dipinjam.
                                                </p>
                                                <Button
                                                    type="button"
                                                    onClick={() => setOpenCatalogModal(true)}
                                                    className="mt-4 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                                                >
                                                    <Search className="w-3.5 h-3.5 mr-1.5" />
                                                    Buka Katalog Aset
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                {selectedAssets.map((asset, idx) => {
                                                    const photo = getPrimaryPhoto(asset);
                                                    return (
                                                        <div
                                                            key={asset.id}
                                                            className="p-3 bg-zinc-50/70 dark:bg-zinc-850/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-3 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all group relative"
                                                        >
                                                            {/* Asset Thumbnail */}
                                                            <div className="w-16 h-16 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 overflow-hidden relative border border-zinc-200/80 dark:border-zinc-700/80">
                                                                {photo?.url ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={photo.url}
                                                                        alt={asset.nama_barang}
                                                                        className="w-full h-full object-cover"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                ) : (
                                                                    <Package className="w-6 h-6 text-zinc-400" />
                                                                )}
                                                                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">
                                                                    {idx + 1}
                                                                </span>
                                                            </div>

                                                            {/* Asset Info */}
                                                            <div className="flex-1 min-w-0 pr-6">
                                                                <p className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                                                    {asset.nama_barang}
                                                                </p>
                                                                {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                                                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                                                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                    <span className="text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-100/60 dark:border-emerald-500/20">
                                                                        NUP {asset.nup}
                                                                    </span>
                                                                    {asset.no_polisi && asset.no_polisi !== '-' && (
                                                                        <span className="text-[9.5px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-900/40">
                                                                            🚗 {asset.no_polisi}
                                                                        </span>
                                                                    )}
                                                                    {asset.kondisi && (
                                                                        <span className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                                                                            {asset.kondisi}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {getAssetUser(asset) && (
                                                                    <div className="flex items-center gap-1 text-[10.5px] text-zinc-600 dark:text-zinc-400 mt-1.5 truncate">
                                                                        <User className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                        <span className="truncate">Pengguna: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{getAssetUser(asset)}</strong></span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Delete Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id))}
                                                                className="absolute top-2.5 right-2.5 p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                                title="Hapus dari daftar pinjam"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Asset Catalog Modal */}
                                    <AssetCatalogModal
                                        open={openCatalogModal}
                                        onOpenChange={setOpenCatalogModal}
                                        selectedAssets={selectedAssets}
                                        onAddAssets={(assets) => setSelectedAssets(assets)}
                                    />
                                </div>
                            )}

                            {/* Step 2: Loan Details */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600"><CalendarIcon className="w-5 h-5" /></div>
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Durasi Peminjaman</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tanggal Mulai</label>
                                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900/50 h-9" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tanggal Selesai</label>
                                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900/50 h-9" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600"><FileText className="w-5 h-5" /></div>
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Tujuan Penggunaan</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Keperluan Peminjaman</label>
                                            <Textarea placeholder="Jelaskan keperluan peminjaman aset ini..." rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900/50 resize-none" />
                                            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400"><span>Min. 10 karakter</span><span>{purpose.length}/500</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirm */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 text-center">Konfirmasi Permohonan</h2>
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl space-y-3">
                                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">Detail Peminjaman</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                                                <div className="col-span-1 md:col-span-2">
                                                    <p className="text-zinc-500 dark:text-zinc-400 mb-1">Peminjam</p>
                                                    {selectedEmployee && (
                                                        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600 shrink-0">{selectedEmployee.name.charAt(0)}</div>
                                                            <div><p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedEmployee.name}</p><p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">NIP. {selectedEmployee.nip || '-'}</p></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div><p className="text-zinc-500 dark:text-zinc-400 mb-1">Tanggal Mulai</p><p className="font-medium">{fmtDate(startDate)}</p></div>
                                                <div><p className="text-zinc-500 dark:text-zinc-400 mb-1">Tanggal Selesai</p><p className="font-medium">{fmtDate(endDate)}</p></div>
                                                <div className="col-span-1 md:col-span-2"><p className="text-zinc-500 dark:text-zinc-400 mb-1">Keperluan</p><p className="font-medium whitespace-pre-wrap">{purpose}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-2 sticky top-6 space-y-3">
                            {step === 2 && (
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 text-sm">Data Peminjam</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nama Peminjam <span className="text-red-500">*</span></label>
                                        <EmployeeSelect value={employeeId} onChange={(val, emp) => { setEmployeeId(val); setSelectedEmployee(emp || null); }} placeholder="Cari nama pegawai..." />
                                        {selectedEmployee ? (
                                            <div className="mt-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3 flex items-start gap-3">
                                                <div className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-emerald-600 font-bold text-base shadow-sm border border-emerald-100 shrink-0">{selectedEmployee.name.charAt(0)}</div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{selectedEmployee.name}</p>
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">NIP. {selectedEmployee.nip || '-'}</p>
                                                    {selectedEmployee.position && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{selectedEmployee.position}</p>}
                                                </div>
                                            </div>
                                        ) : <p className="text-xs text-zinc-500 dark:text-zinc-400">Pilih pegawai yang akan bertanggung jawab.</p>}
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-emerald-600" />Daftar Barang ({selectedAssets.length})</h3>
                                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium border-b"><tr><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right">NUP</th></tr></thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {selectedAssets.map((asset) => (
                                                    <tr key={asset.id} className="bg-white dark:bg-zinc-900">
                                                        <td className="px-3 py-2">
                                                            <p className="font-medium text-zinc-900 dark:text-zinc-100">{asset.nama_barang}</p>
                                                            {(asset.merk || asset.merk_tipe) && <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{asset.merk_tipe || asset.merk}</p>}
                                                            <p className="text-zinc-400 text-[10px]">{asset.kode_barang}</p>
                                                            {asset.nup_lama && <p className="text-[10px] text-zinc-400">NUP Lama: {asset.nup_lama}</p>}
                                                            {asset.no_polisi && asset.no_polisi !== '-' && <p className="text-[10px] text-blue-600">🚗 {asset.no_polisi}</p>}
                                                            {asset.lokasi_ruang && <p className="text-[10px] text-zinc-500 dark:text-zinc-400">📍 {asset.lokasi_ruang}</p>}
                                                            {asset.pengguna && <p className="text-[10px] text-amber-600">👤 {asset.pengguna}</p>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right align-top">{asset.nup}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 text-sm">Ringkasan</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50"><span className="text-zinc-500 dark:text-zinc-400">Total Barang</span><span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedAssets.length} unit</span></div>
                                    <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50"><span className="text-zinc-500 dark:text-zinc-400">Durasi</span><span className="font-bold text-zinc-900 dark:text-zinc-100">{calcDuration()}</span></div>
                                </div>
                                {step < 3 && (
                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg flex gap-2 mt-4">
                                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">Pastikan data sudah benar sebelum melanjutkan ke konfirmasi.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 z-20 h-16 w-full">
                <div className="w-full px-6 md:px-10 h-full flex justify-between items-center">
                    <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="h-10 px-6 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-900/50 rounded-xl">
                        {step > 1 ? 'Kembali' : 'Batal'}
                    </Button>
                    <Button onClick={step === 3 ? handleSubmit : handleNext} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-8 text-sm rounded-xl shadow-emerald-200 shadow-lg">
                        {step === 3 ? (submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : 'Konfirmasi Peminjaman') : <>Lanjut<ArrowRight className="ml-2 w-4 h-4" /></>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
