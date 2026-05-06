# Issue #072 — Frontend — BMN Action Modals (Peminjaman & Servis)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `modals`, `module-bmn`
> **Priority**: 🔴 Critical (Alur Nyawa Operasional Harian Aset Negara)
> **Complexity**: 🟡 Medium (Jendela Sembul dengan Form Mutasi Data Lintas Modul)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #066, Issue #067, Issue #070

---

## Branch

```
issue/072-frontend-bmn-action-modals
```

## Deskripsi

Layar utama *Katalog Master* (Issue 070) telah berdiri tegak. Namun, aset negara tidak hanya diam membeku di gudang. Kamera akan dipinjam oleh tim liputan, dan mobil patroli harus masuk bengkel rutin.

Pada **Issue #072** ini, kita akan membuat 2 buah Jendela Sembul Mutasi *(Action Modals)* yang bisa dipanggil dari layar mana saja (misal saat menekan tombol "Pinjamkan" di tabel aset).

1. **BorrowAssetModal (Peminjaman)**: Sebuah form melayang yang meminta Admin memilih *Siapa Pegawai yang meminjam?* (Penyeberangan data lintas modul ke `kpg_employees`) dan kapan tanggalnya.
2. **MaintenanceModal (Servis Bengkel)**: Form melayang yang mencatat besaran biaya (Rupiah) perbaikan. Serta sebuah sihir khusus: Memungkinkan admin **langsung** mengubah Status Kondisi Fisik di tabel Induk dari "Rusak" kembali menjadi "Baik" setelah diservis, hanya dalam satu klik bersamaan!

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `frontend/src/app/(dashboard)/bmn/components/modals`.
- [ ] Tersedia komponen `BorrowAssetModal.tsx` yang sanggup mengeksekusi fungsi *API POST* Peminjaman.
- [ ] Komponen peminjaman menarik daftar Pegawai (*Employee*) yang berhak meminjam (Dapat disimulasikan sementara jika API kepegawaian tidak dapat diraih).
- [ ] Tersedia komponen `MaintenanceModal.tsx` dengan kotak input nominal biaya berformat Rupiah dan dropdown revisi "Kondisi Pemulihan Fisik".
- [ ] Menggunakan efek transisi *Backdrop Blur* (Glassmorphism) yang estetis pada area belakang *Modal*.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Komponen BMN:
```bash
mkdir -p frontend/src/app/(dashboard)/bmn/components/modals
```

Pahat kedua instrumen melayang tingkat dewa ini:

### 1. Jendela Mutasi Peminjaman (BorrowAssetModal.tsx)
**Path:** `frontend/src/app/(dashboard)/bmn/components/modals/BorrowAssetModal.tsx`

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Handshake, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string | null;
    assetName: string;
}

export default function BorrowAssetModal({ isOpen, onClose, assetId, assetName }: BorrowModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [employeeId, setEmployeeId] = useState("");
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [keterangan, setKeterangan] = useState("");
    
    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId) return toast.error("Identitas peminjam belum dipilih!");
        
        setIsLoading(true);
        try {
            await api.post(`/bmn/assets/${assetId}/loans`, {
                employee_id: employeeId,
                tanggal_pinjam: tanggal,
                keterangan
            });
            toast.success("Kontrak peminjaman aset berhasil disahkan.");
            
            // Menyegarkan Layar Tabel Belakang secara Gaib
            queryClient.invalidateQueries({ queryKey: ['bmn-assets'] });
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Benturan sistem saat mengeksekusi rute pinjaman.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header Estetik */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-gradient-to-r from-emerald-900/20 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <Handshake className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Delegasi Peminjaman</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm mb-2">
                        <span className="text-zinc-500">Target Aset: </span>
                        <strong className="text-emerald-400 font-mono block truncate">{assetName}</strong>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">NIP Pegawai Peminjam <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            {/* Dalam Skenario Asli, ini adalah React Select/Combobox yang menarik data kpg_employees */}
                            <input type="text" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Ketik UUID Pegawai Sah..." className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Tanggal Pinjam <span className="text-red-500">*</span></label>
                        <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Peruntukkan / Misi</label>
                        <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm resize-none" placeholder="Misal: Liputan evakuasi buaya di sungai..." />
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Handshake className="w-5 h-5" />}
                        Sahkan Pemindahan Hak Guna
                    </button>
                </form>
            </div>
        </div>
    );
}
```

### 2. Jendela Bengkel (MaintenanceModal.tsx)
**Path:** `frontend/src/app/(dashboard)/bmn/components/modals/MaintenanceModal.tsx`

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Wrench, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string | null;
    assetName: string;
}

export default function MaintenanceModal({ isOpen, onClose, assetId, assetName }: MaintenanceModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [biaya, setBiaya] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [kondisiBaru, setKondisiBaru] = useState(""); // Opsional

    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post(`/bmn/assets/${assetId}/maintenances`, {
                tanggal_service: tanggal,
                biaya: parseFloat(biaya),
                deskripsi,
                kondisi_baru: kondisiBaru || undefined
            });
            toast.success("Nota bengkel/perbaikan sukses terarsip.");
            
            // Segarkan Layar Utama
            queryClient.invalidateQueries({ queryKey: ['bmn-assets'] });
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Benturan sistem bengkel pusat.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-gradient-to-r from-blue-900/20 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Catatan Perbaikan Aset</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm mb-2">
                        <span className="text-zinc-500">Benda yang Diservis: </span>
                        <strong className="text-blue-400 font-mono block truncate">{assetName}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase">Tgl Nota <span className="text-red-500">*</span></label>
                            <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase">Total Biaya Rp. <span className="text-red-500">*</span></label>
                            <input type="number" required value={biaya} onChange={(e) => setBiaya(e.target.value)} placeholder="0.00" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Deskripsi Kerusakan <span className="text-red-500">*</span></label>
                        <textarea required value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" placeholder="Misal: Ganti kampas rem dan oli..." />
                    </div>

                    <div className="space-y-1.5 p-3 border border-dashed border-zinc-700 bg-zinc-900/30 rounded-xl">
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Pemulihan Fisik (Opsional)</label>
                        <p className="text-[10px] text-zinc-500 mb-2">Pilih jika servis ini memulihkan kondisi fisik barang ke wujud yang lebih baik.</p>
                        <select value={kondisiBaru} onChange={(e) => setKondisiBaru(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white focus:ring-1 focus:ring-blue-500 outline-none text-xs">
                            <option value="">-- Jangan Rubah Status Fisik Induk --</option>
                            <option value="Baik">Pulih Total Menjadi: Baik</option>
                            <option value="Rusak Ringan">Pulih Sebagian Menjadi: Rusak Ringan</option>
                        </select>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                        Cairkan Tagihan & Rekam Nota
                    </button>
                </form>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombol Submit ditekan tapi *React* berteriak soal *"queryClient is not defined"*!

**Artinya:** Modul ini mencoba meretas layar belakang *(Background Refetching)* menggunakan React Query, tetapi kamu tidak membungkus filenya dengan tepat.
**Solusi:** Komponen modal ini memanggil `useQueryClient()`. Pastikan halaman indukmuk *(Misal DataGrid di Issue 070)* telah terbungkus rapi dengan Provider dari `@tanstack/react-query` sejak Fase 2. Jika di SuperApp ini Provider diletakkan di dalam Root `layout.tsx`, maka peringatan ini tidak akan pernah muncul dan layar tabelmu akan otomatis menyegarkan diri *(Auto-Refresh)* tepat setelah jendela Modal ini ditutup. Ajaib!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): architect omnipotent floating action dialogs for cross-modular asset mutations" \
  --body "Membangkitkan panel tindakan melayang *(Floating Modals)* guna mencatat kontrak peminjaman lintas-pegawai serta memori perbaikan fisik berbiaya, mengintegrasikan perintah \`invalidateQueries\` untuk sinkronisasi antarmuka instan. Detail di docs/issues/072-frontend-bmn-action-modals.md" \
  --label "frontend,ui,modals,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/072-frontend-bmn-action-modals
```

### Step 3: Kerjakan

Pahat kedua wujud melayang gaib tersebut pada alamat terasing `src/app/(dashboard)/bmn/components/modals/`. Jangan disatukan dengan tabel agar layar tidak terkotori oleh ribuan baris kode HTML mati.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): architect omnipotent floating action dialogs for cross-modular asset mutations (#72)"
git push -u origin issue/072-frontend-bmn-action-modals
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): architect omnipotent floating action dialogs for cross-modular asset mutations (#72)" \
  --body "## Summary
Produksi piranti pencatatan mobilitas aset (Peminjaman & Servis) berwujud jendela sembul (Modals), meminimalisir transisi pergerakan halaman ganda *(Zero-Page-Load-UX)*.

## Changes
- Pembuatan \`BorrowAssetModal\` yang mengandalkan lemparan Identitas Aset (\`assetId\`) untuk mengeksekusi kontrak API.
- Pembuatan \`MaintenanceModal\` yang memuat kecerdasan *Tandem-Update*: Sang administrator diizinkan menimpa *(Override)* status Induk Kondisi Barang langsung melalui bilah *Dropdown* 'Pemulihan Fisik' terintegrasi.
- Orkestrasi UX tingkat tinggi: Penutupan modal otomatis akan memicu dentuman gelombang \`invalidateQueries(['bmn-assets'])\` yang memaksa tabel raksasa di bawahnya memuat ulang dirinya sendiri tanpa harus menekan tombol \`F5\` pada peramban.

## Rules Compliance
- [x] Lolos Doktrin Eksekusi Halus *(Graceful UI/UX)*: Menerapkan batas pandang \`backdrop-blur-sm\`, serta mengkarantina layar dengan penahan klik ganda (IsLoading Boolean).

Closes #72" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Operator BKSDA seringkali terlalu lelah jika harus pindah halaman baru hanya untuk mencatat pinjaman laptop atau servis motor. Mereka butuh pop-up melayang di layar tempat mereka berpijak.

## Task

Kerjakan Issue #072 (Frontend — BMN Action Modals).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/072-frontend-bmn-action-modals.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Ciptakan isolasi folder Komponen di `frontend/src/app/(dashboard)/bmn/components/modals`.
3. Pahat wujud `BorrowAssetModal.tsx` dan lekatkan kodenya.
4. Pahat wujud `MaintenanceModal.tsx` dan lekatkan kodenya.
5. Pastikan impor warna ikon (seperti Emerald untuk pinjam dan Biru untuk servis) tidak tertukar.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
