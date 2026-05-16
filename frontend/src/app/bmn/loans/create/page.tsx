"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, ArrowLeft, Package, ShoppingBag, Check, ChevronsUpDown, Search, Loader2, X, CalendarIcon, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { Badge } from "@/components/ui/badge";
import { EmployeeSelect, type Employee } from "@/components/ui/employee-select";

interface Asset {
    id: string;
    nama_barang: string;
    kode_barang: string;
    nup: string;
    merk: string;
    kondisi: string;
    status_bmn: string;
}

export default function LoanCreatePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch] = useDebounce(searchQuery, 300);
    const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
    const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [purpose, setPurpose] = useState("");
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        const fetchAssets = async () => {
            setLoadingAssets(true);
            try {
                const params: Record<string, string | number> = { page: 1, per_page: 20 };
                if (debouncedSearch) params.search = debouncedSearch;
                const res = await api.get('/bmn/assets', { params });
                setAvailableAssets(res.data.data || []);
            } catch (error) { console.error("Failed to fetch assets", error); }
            finally { setLoadingAssets(false); }
        };
        fetchAssets();
    }, [debouncedSearch]);

    const handleSelectAsset = (asset: Asset) => {
        if (selectedAssets.find(a => a.id === asset.id)) { toast.error("Aset sudah dipilih"); return; }
        setSelectedAssets([...selectedAssets, asset]);
        setOpenCombobox(false);
        setSearchQuery("");
        toast.success("Aset ditambahkan");
    };

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
        } catch (error) {
            console.error("Failed to submit loan:", error);
            toast.error("Gagal mengirim permohonan");
        } finally { setSubmitting(false); }
    };

    const calcDuration = () => {
        if (!startDate || !endDate) return "-";
        const diff = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return `${diff} Hari`;
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

    return (
        <div className="h-full bg-slate-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 flex-none z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-emerald-50 text-emerald-600"><ArrowLeft className="w-5 h-5" /></Button>
                    <h1 className="text-lg font-bold text-slate-900">Permohonan Peminjaman BMN</h1>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-5xl mx-auto space-y-4 pb-4">
                    {/* Stepper */}
                    <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto mb-8">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-600 -z-10 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />
                        {[{ id: 1, label: "Daftar Barang" }, { id: 2, label: "Detail" }, { id: 3, label: "Konfirmasi" }].map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all", step >= s.id ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-white border-slate-300 text-slate-400")}>
                                    {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                                </div>
                                <span className={cn("text-xs font-bold uppercase tracking-wider", step >= s.id ? "text-emerald-700" : "text-slate-400")}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        {/* Main Content */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Step 1: Asset Selection */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-900 mb-1">Pilih Aset BMN</h2>
                                        <p className="text-sm text-slate-500 mb-6">Cari dan tambahkan barang yang akan dipinjam.</p>
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between h-12 text-left font-normal bg-slate-50 border-slate-300 hover:bg-white hover:border-emerald-500">
                                                    <span className="text-slate-500"><Search className="inline w-4 h-4 mr-2" />Cari nama barang, kode, atau NUP...</span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[min(600px,90vw)] p-0" align="start">
                                                <div className="flex flex-col max-h-[400px]">
                                                    <div className="flex items-center border-b px-3 py-2">
                                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                        <Input className="flex h-10 w-full bg-transparent text-sm outline-none border-0 focus-visible:ring-0 px-0 shadow-none" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                                                    </div>
                                                    <div className="overflow-y-auto flex-1 p-1">
                                                        {loadingAssets && <div className="py-6 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-emerald-600" />Memuat...</div>}
                                                        {!loadingAssets && availableAssets.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Tidak ada aset ditemukan.</div>}
                                                        {!loadingAssets && availableAssets.map((asset) => {
                                                            const isSelected = selectedAssets.some(a => a.id === asset.id);
                                                            const isUnavailable = asset.status_bmn !== 'Aktif';
                                                            return (
                                                                <div key={asset.id} className={cn("flex items-center justify-between gap-1 p-3 rounded-lg transition-colors border border-transparent", isSelected ? "opacity-50 cursor-not-allowed bg-slate-50" : isUnavailable ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 group")}
                                                                    onClick={() => { if (isSelected) return; if (isUnavailable) { toast.error(`Tidak tersedia: ${asset.status_bmn}`); return; } handleSelectAsset(asset); }}>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={cn("font-bold truncate", isSelected ? "text-slate-400" : "text-slate-900 group-hover:text-emerald-700")}>{asset.nama_barang}</div>
                                                                            {isUnavailable && <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-black uppercase bg-red-50 text-red-600 border-red-100 shrink-0">{asset.status_bmn}</Badge>}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{asset.kode_barang}</span>
                                                                            <span>•</span><span className="font-medium text-emerald-600">NUP {asset.nup}</span>
                                                                        </div>
                                                                    </div>
                                                                    {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {/* Selected Assets */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-emerald-600" />Daftar Barang ({selectedAssets.length})</h3>
                                            {selectedAssets.length > 0 && <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:bg-red-50" onClick={() => setSelectedAssets([])}>Reset</Button>}
                                        </div>
                                        {selectedAssets.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Belum ada barang dipilih.</p></div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {selectedAssets.map((asset, idx) => (
                                                    <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                                            <div>
                                                                <p className="font-bold text-slate-900">{asset.nama_barang}</p>
                                                                <p className="text-xs text-slate-500">NUP: {asset.nup} | Kode: {asset.kode_barang}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id))}><X className="w-4 h-4" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Loan Details */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600"><CalendarIcon className="w-5 h-5" /></div>
                                            <h3 className="text-lg font-bold text-slate-900">Durasi Peminjaman</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-700">Tanggal Mulai</label>
                                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 h-9" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-700">Tanggal Selesai</label>
                                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 h-9" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600"><FileText className="w-5 h-5" /></div>
                                            <h3 className="text-lg font-bold text-slate-900">Tujuan Penggunaan</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Keperluan Peminjaman</label>
                                            <Textarea placeholder="Jelaskan keperluan peminjaman aset ini..." rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="bg-slate-50 resize-none" />
                                            <div className="flex justify-between text-xs text-slate-500"><span>Min. 10 karakter</span><span>{purpose.length}/500</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirm */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Konfirmasi Permohonan</h2>
                                        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">Detail Peminjaman</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                                                <div className="col-span-1 md:col-span-2">
                                                    <p className="text-slate-500 mb-1">Peminjam</p>
                                                    {selectedEmployee && (
                                                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600 shrink-0">{selectedEmployee.name.charAt(0)}</div>
                                                            <div><p className="font-bold text-slate-900">{selectedEmployee.name}</p><p className="text-xs text-emerald-700 font-medium">NIP. {selectedEmployee.nip || '-'}</p></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div><p className="text-slate-500 mb-1">Tanggal Mulai</p><p className="font-medium">{fmtDate(startDate)}</p></div>
                                                <div><p className="text-slate-500 mb-1">Tanggal Selesai</p><p className="font-medium">{fmtDate(endDate)}</p></div>
                                                <div className="col-span-1 md:col-span-2"><p className="text-slate-500 mb-1">Keperluan</p><p className="font-medium whitespace-pre-wrap">{purpose}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-2 sticky top-6 space-y-3">
                            {step === 2 && (
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-3 text-sm">Data Peminjam</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Nama Peminjam <span className="text-red-500">*</span></label>
                                        <EmployeeSelect value={employeeId} onChange={(val, emp) => { setEmployeeId(val); setSelectedEmployee(emp || null); }} placeholder="Cari nama pegawai..." />
                                        {selectedEmployee ? (
                                            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 font-bold text-base shadow-sm border border-emerald-100 shrink-0">{selectedEmployee.name.charAt(0)}</div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-900 leading-tight">{selectedEmployee.name}</p>
                                                    <p className="text-xs text-emerald-700 font-medium mt-0.5">NIP. {selectedEmployee.nip || '-'}</p>
                                                    {selectedEmployee.position && <p className="text-xs text-slate-600 mt-0.5">{selectedEmployee.position}</p>}
                                                </div>
                                            </div>
                                        ) : <p className="text-xs text-slate-500">Pilih pegawai yang akan bertanggung jawab.</p>}
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-emerald-600" />Daftar Barang ({selectedAssets.length})</h3>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b"><tr><th className="px-3 py-2">Nama Barang</th><th className="px-3 py-2 text-right">NUP</th></tr></thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedAssets.map((asset) => (
                                                    <tr key={asset.id} className="bg-white"><td className="px-3 py-2"><p className="font-medium text-slate-900">{asset.nama_barang}</p><p className="text-slate-400 text-[10px]">{asset.kode_barang}</p></td><td className="px-3 py-2 text-right">{asset.nup}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <h3 className="font-bold text-slate-900 mb-3 text-sm">Ringkasan</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Total Barang</span><span className="font-bold text-slate-900">{selectedAssets.length} unit</span></div>
                                    <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Durasi</span><span className="font-bold text-slate-900">{calcDuration()}</span></div>
                                </div>
                                {step < 3 && (
                                    <div className="bg-blue-50 p-3 rounded-lg flex gap-2 mt-4">
                                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 leading-relaxed">Pastikan data sudah benar sebelum melanjutkan ke konfirmasi.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <div className="bg-white border-t border-slate-200 shrink-0 z-20 h-16 w-full">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex justify-between items-center">
                    <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="h-9 px-4 text-sm text-slate-500 hover:text-slate-900">
                        {step > 1 ? 'Kembali' : 'Batal'}
                    </Button>
                    <Button onClick={step === 3 ? handleSubmit : handleNext} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-6 text-sm rounded-full shadow-emerald-200 shadow-lg">
                        {step === 3 ? (submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : 'Kirim Permohonan') : <>Lanjut<ArrowRight className="ml-2 w-4 h-4" /></>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
