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
import { BmnTabContent } from "@/app/bmn/_components/BmnTabContent";
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
        <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui h-full bg-[var(--ds-surface-muted)] flex flex-col overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)]">
            {/* Header */}
            <div className="bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] flex-none z-30">
                <div className="w-full px-3 sm:px-6 md:px-10 h-16 flex items-center gap-3">
                    <Button aria-label="Kembali ke Peminjaman" variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"><ArrowLeft className="w-5 h-5" /></Button>
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-[var(--ds-fg)]">Form Permohonan Peminjaman Aset</h1>
                        <p className="text-xs sm:text-xs text-[var(--ds-fg-muted)] hidden sm:block">Lengkapi detail di bawah ini untuk mengajukan peminjaman Barang Milik Negara.</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-10">
                <div className="w-full space-y-4 pb-4">
                    {/* Stepper */}
                    <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto mb-8">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[var(--ds-border-subtle)] -z-10" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-[var(--ds-accent-solid)] origin-left transition-transform duration-150" style={{ scale: `${(step - 1) / 2} 1` }} />
                        {[{ id: 1, label: "Daftar Barang" }, { id: 2, label: "Detail" }, { id: 3, label: "Konfirmasi" }].map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-[var(--ds-surface-muted)] px-2">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-150", step >= s.id ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]" : "bg-[var(--ds-surface)] border-[var(--ds-border-control)] text-[var(--ds-fg-muted)]")}>
                                    {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                                </div>
                                <span className={cn("text-xs font-bold uppercase tracking-wider", step >= s.id ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg-muted)]")}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        {/* Main Content */}
                        <div className="lg:col-span-3 space-y-4">
                            <BmnTabContent value={step}>
                            {/* Step 1: Asset Selection */}
                            {step === 1 && (
                                <div className="space-y-6 ">
                                    {/* Catalog Trigger Banner */}
                                    <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-[var(--ds-fg)] font-bold text-base">
                                                <Boxes className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                                                Pilih Aset dari Katalog BMN
                                            </div>
                                            <p className="text-xs text-[var(--ds-fg-muted)] max-w-lg leading-relaxed">
                                                Buka katalog visual berfoto lengkap (kendaraan operasional dinas, laptop, PC, GPS, perlengkapan lapangan) dengan filter kategori cepat.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => setOpenCatalogModal(true)}
                                            className="h-10 px-4 rounded-xl bmn-primary text-xs font-semibold flex items-center gap-2 shadow-sm shrink-0"
                                        >
                                            <Search className="w-4 h-4" />
                                            <span>Buka Katalog Aset</span>
                                        </Button>
                                    </div>

                                    {/* Selected Assets Deck */}
                                    <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] shadow-sm overflow-hidden">
                                        <div className="p-4 bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border-subtle)] flex justify-between items-center">
                                            <h3 className="font-bold text-[var(--ds-fg)] flex items-center gap-2">
                                                <ShoppingBag className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                                                Daftar Barang Terpilih ({selectedAssets.length})
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {selectedAssets.length > 0 && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8 rounded-lg text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] "
                                                            onClick={() => setOpenCatalogModal(true)}
                                                        >
                                                            + Tambah Barang
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs h-8 text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] "
                                                            onClick={() => setSelectedAssets([])}
                                                        >
                                                            Reset Semua
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {selectedAssets.length === 0 ? (
                                            <div className="p-12 text-center text-[var(--ds-fg-muted)]">
                                                <div className="w-16 h-16 rounded-2xl bg-[var(--ds-surface-muted)] flex items-center justify-center mx-auto mb-3 text-[var(--ds-fg-muted)]">
                                                    <Package className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm font-semibold text-[var(--ds-fg-muted)]">Belum ada barang dipilih</p>
                                                <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-sm mx-auto">
                                                    Klik tombol di bawah ini untuk membuka katalog visual aset BMN dan memilih barang yang akan dipinjam.
                                                </p>
                                                <Button
                                                    type="button"
                                                    onClick={() => setOpenCatalogModal(true)}
                                                    className="mt-4 h-9 px-4 rounded-xl bmn-primary text-xs font-semibold shadow-sm"
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
                                                            className="p-3 bg-[var(--ds-surface-muted)]  rounded-xl border border-[var(--ds-border-subtle)] flex items-start gap-3 hover:border-[var(--ds-accent-fg)]  transition-colors duration-150 group relative"
                                                        >
                                                            {/* Asset Thumbnail */}
                                                            <div className="w-16 h-16 rounded-lg bg-[var(--ds-surface-muted)]  text-[var(--ds-fg-muted)] flex items-center justify-center shrink-0 overflow-hidden relative border border-[var(--ds-border-subtle)]">
                                                                {photo?.url ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={photo.url}
                                                                        alt={asset.nama_barang}
                                                                        className="w-full h-full object-cover"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                ) : (
                                                                    <Package className="w-6 h-6 text-[var(--ds-fg-muted)]" />
                                                                )}
                                                                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] flex items-center justify-center text-xs font-bold shadow-sm">
                                                                    {idx + 1}
                                                                </span>
                                                            </div>

                                                            {/* Asset Info */}
                                                            <div className="flex-1 min-w-0 pr-9">
                                                                <p className="font-bold text-xs sm:text-sm text-[var(--ds-fg)] truncate">
                                                                    {asset.nama_barang}
                                                                </p>
                                                                {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                                                                    <p className="text-xs text-[var(--ds-fg-muted)] truncate">
                                                                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                    <span className="text-xs font-mono font-bold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-1.5 py-0.2 rounded border border-[var(--ds-accent-soft-border)]">
                                                                        NUP {asset.nup}
                                                                    </span>
                                                                    {asset.no_polisi && asset.no_polisi !== '-' && (
                                                                        <span className="text-xs font-mono font-bold text-[var(--ds-status-info-fg)] bg-[var(--ds-status-info-bg)] px-1.5 py-0.2 rounded border border-[var(--ds-status-info-border)]">
                                                                            No. Polisi: {asset.no_polisi}
                                                                        </span>
                                                                    )}
                                                                    {asset.kondisi && (
                                                                        <span className="text-xs font-semibold text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-1.5 py-0.2 rounded">
                                                                            {asset.kondisi}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {getAssetUser(asset) && (
                                                                    <div className="flex items-center gap-1 text-xs text-[var(--ds-fg-muted)] mt-1.5 truncate">
                                                                        <User className="w-3 h-3 text-[var(--ds-accent-fg)] shrink-0" />
                                                                        <span className="truncate">Pengguna: <strong className="font-semibold text-[var(--ds-fg)]">{getAssetUser(asset)}</strong></span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Delete Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id))}
                                                                aria-label={`Hapus ${asset.nama_barang} dari daftar pinjam`}
                                                                className="bmn-icon-danger absolute top-2.5 right-2.5 p-2 rounded-md text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] transition-colors"
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
                                <div className="space-y-6 ">
                                    <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]"><CalendarIcon className="w-5 h-5" /></div>
                                            <h3 className="text-base sm:text-lg font-bold text-[var(--ds-fg)]">Durasi Peminjaman</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-[var(--ds-fg-muted)]">Tanggal Mulai</label>
                                                <Input aria-label="Tanggal Mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[var(--ds-surface-muted)] h-9" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-[var(--ds-fg-muted)]">Tanggal Selesai</label>
                                                <Input aria-label="Tanggal Selesai" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[var(--ds-surface-muted)] h-9" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]"><FileText className="w-5 h-5" /></div>
                                            <h3 className="text-base sm:text-lg font-bold text-[var(--ds-fg)]">Tujuan Penggunaan</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-[var(--ds-fg-muted)]">Keperluan Peminjaman</label>
                                            <Textarea aria-label="Keperluan Peminjaman" placeholder="Jelaskan keperluan peminjaman aset ini..." rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="bg-[var(--ds-surface-muted)] resize-none" />
                                            <div className="flex justify-between text-xs text-[var(--ds-fg-muted)]"><span>Min. 10 karakter</span><span>{purpose.length}/500</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirm */}
                            {step === 3 && (
                                <div className="space-y-6 ">
                                    <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-6 shadow-sm">
                                        <h2 className="text-xl font-bold text-[var(--ds-fg)] mb-6 text-center">Konfirmasi Permohonan</h2>
                                        <div className="bg-[var(--ds-surface-muted)] p-4 rounded-xl space-y-3">
                                            <h3 className="font-bold text-[var(--ds-fg)] border-b border-[var(--ds-border-subtle)] pb-2">Detail Peminjaman</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                                                <div className="col-span-1 md:col-span-2">
                                                    <p className="text-[var(--ds-fg-muted)] mb-1">Peminjam</p>
                                                    {selectedEmployee && (
                                                        <div className="flex items-center gap-3 bg-[var(--ds-surface)] p-3 rounded-lg border border-[var(--ds-border-subtle)]">
                                                            <div className="w-10 h-10 rounded-full bg-[var(--ds-accent-soft)] flex items-center justify-center text-sm font-bold text-[var(--ds-accent-fg)] shrink-0">{selectedEmployee.name.charAt(0)}</div>
                                                            <div><p className="font-bold text-[var(--ds-fg)]">{selectedEmployee.name}</p><p className="text-xs text-[var(--ds-accent-fg)] font-medium">NIP. {selectedEmployee.nip || '-'}</p></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div><p className="text-[var(--ds-fg-muted)] mb-1">Tanggal Mulai</p><p className="font-medium">{fmtDate(startDate)}</p></div>
                                                <div><p className="text-[var(--ds-fg-muted)] mb-1">Tanggal Selesai</p><p className="font-medium">{fmtDate(endDate)}</p></div>
                                                <div className="col-span-1 md:col-span-2"><p className="text-[var(--ds-fg-muted)] mb-1">Keperluan</p><p className="font-medium whitespace-pre-wrap">{purpose}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </BmnTabContent>
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-2 sticky top-6 space-y-3">
                            {step === 2 && (
                                <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] p-4 shadow-sm">
                                    <h3 className="font-bold text-[var(--ds-fg)] mb-3 text-sm">Data Peminjam</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--ds-fg-muted)]">Nama Peminjam <span className="text-[var(--ds-status-danger-fg)]">*</span></label>
                                        <EmployeeSelect aria-label="Nama Peminjam" contentModule="bmn" contentClassName="bmn-assets-ui bmn-standard-ui bmn-popover max-w-[calc(100vw-2rem)]" value={employeeId} onChange={(val, emp) => { setEmployeeId(val); setSelectedEmployee(emp || null); }} placeholder="Cari nama pegawai..." />
                                        {selectedEmployee ? (
                                            <div className="mt-2 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-lg p-3 flex items-start gap-3">
                                                <div className="w-10 h-10 bg-[var(--ds-surface)] rounded-full flex items-center justify-center text-[var(--ds-accent-fg)] font-bold text-base shadow-sm border border-[var(--ds-accent-soft-border)] shrink-0">{selectedEmployee.name.charAt(0)}</div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-[var(--ds-fg)] leading-tight">{selectedEmployee.name}</p>
                                                    <p className="text-xs text-[var(--ds-accent-fg)] font-medium mt-0.5">NIP. {selectedEmployee.nip || '-'}</p>
                                                    {selectedEmployee.position && <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">{selectedEmployee.position}</p>}
                                                </div>
                                            </div>
                                        ) : <p className="text-xs text-[var(--ds-fg-muted)]">Pilih pegawai yang akan bertanggung jawab.</p>}
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] p-4 shadow-sm">
                                    <h3 className="font-bold text-[var(--ds-fg)] mb-3 text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[var(--ds-accent-fg)]" />Daftar Barang ({selectedAssets.length})</h3>
                                    <div className="border border-[var(--ds-border-subtle)] rounded-lg overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] font-medium border-b"><tr><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right">NUP</th></tr></thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {selectedAssets.map((asset) => (
                                                    <tr key={asset.id} className="bg-[var(--ds-surface)]">
                                                        <td className="px-3 py-2">
                                                            <p className="font-medium text-[var(--ds-fg)]">{asset.nama_barang}</p>
                                                            {(asset.merk || asset.merk_tipe) && <p className="text-xs text-[var(--ds-fg-muted)]">{asset.merk_tipe || asset.merk}</p>}
                                                            <p className="text-[var(--ds-fg-muted)] text-xs">{asset.kode_barang}</p>
                                                            {asset.nup_lama && <p className="text-xs text-[var(--ds-fg-muted)]">NUP Lama: {asset.nup_lama}</p>}
                                                            {asset.no_polisi && asset.no_polisi !== '-' && <p className="text-xs text-[var(--ds-status-info-fg)]">No. Polisi: {asset.no_polisi}</p>}
                                                            {asset.lokasi_ruang && <p className="text-xs text-[var(--ds-fg-muted)]">Lokasi: {asset.lokasi_ruang}</p>}
                                                            {asset.pengguna && <p className="text-xs text-[var(--ds-status-warning-fg)]">Pengguna: {asset.pengguna}</p>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right align-top">{asset.nup}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] p-4 shadow-sm">
                                <h3 className="font-bold text-[var(--ds-fg)] mb-3 text-sm">Ringkasan</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-[var(--ds-border-subtle)]"><span className="text-[var(--ds-fg-muted)]">Total Barang</span><span className="font-bold text-[var(--ds-fg)]">{selectedAssets.length} unit</span></div>
                                    <div className="flex justify-between py-2 border-b border-[var(--ds-border-subtle)]"><span className="text-[var(--ds-fg-muted)]">Durasi</span><span className="font-bold text-[var(--ds-fg)]">{calcDuration()}</span></div>
                                </div>
                                {step < 3 && (
                                    <div className="bg-[var(--ds-status-info-bg)] p-3 rounded-lg flex gap-2 mt-4">
                                        <Info className="w-4 h-4 text-[var(--ds-status-info-fg)] shrink-0 mt-0.5" />
                                        <p className="text-xs text-[var(--ds-status-info-fg)] leading-relaxed">Pastikan data sudah benar sebelum melanjutkan ke konfirmasi.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <div className="bg-[var(--ds-surface)] border-t border-[var(--ds-border-subtle)] shrink-0 z-20 h-16 w-full">
                <div className="w-full px-3 sm:px-6 md:px-10 h-full flex justify-between items-center">
                    <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="h-10 px-6 text-sm text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)]  rounded-xl">
                        {step > 1 ? 'Kembali' : 'Batal'}
                    </Button>
                    <Button onClick={step === 3 ? handleSubmit : handleNext} disabled={submitting} className="bmn-primary h-10 px-8 text-sm rounded-xl ">
                        {step === 3 ? (submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : 'Konfirmasi Peminjaman') : <>Lanjut<ArrowRight className="ml-2 w-4 h-4" /></>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
