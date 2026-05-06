# Issue #075 — Frontend — BMN Reports & Export (Pusat Cetak Dokumen BPK)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-bmn`, `reports`
> **Priority**: 🔴 Critical (Halaman Wajib Bebas Temuan Audit BPK)
> **Complexity**: 🟡 Medium (Implementasi Autentikasi Unduh File Blob via Axios)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #068

---

## Branch

```
issue/075-frontend-bmn-reports
```

## Deskripsi

Selamat datang di Pintu Penutup Fase 5 Modul BMN! 🎉

Segala kecanggihan visual yang telah kita bangun tidak akan ada artinya di hadapan Auditor BPK. Auditor Eksternal (BPK) tidak pernah meminta diperlihatkan layar aplikasi. Mereka selalu berkata: *"Tolong ekspor datanya ke dalam wujud Excel (XLSX) dan kirimkan ke flashdisk saya sekarang juga."*

Pada **Issue #075** ini, kita akan membangun "Pabrik Cetak" (`bmn/reports/page.tsx`). Halaman ini akan menjadi pusat komando khusus di mana Pimpinan BKSDA dapat menekan tombol untuk mengunduh seluruh buku induk ke dalam komputer lokal.

**PERINGATAN KRUSIAL (Pelajaran Masa Lalu)**:
Kita **TIDAK BOLEH** menggunakan fungsi unduh primitif seperti `window.location.href = "URL"`. Mengapa? Karena API kita dilindungi oleh tembok tebal `auth:sanctum`. Menggunakan `window.location.href` tidak akan membawa *Token Rahasia (Bearer)* milik pengguna, sehingga *Backend* akan meledak dan mengusir kita dengan status `401 Unauthorized`. Kita wajib meneteskan sihir unduhan tipe *Blob* melalui saluran rahasia *Axios Interceptor*!

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `frontend/src/app/(dashboard)/bmn/reports/page.tsx`.
- [ ] Terdapat antarmuka panel kendali *(Control Panel)* untuk 3 jenis laporan: Buku Induk Aset, Buku Riwayat Peminjaman, dan Buku Tagihan Servis.
- [ ] **MUTLAK**: Fungsi unduh tidak menggunakan pengalihan *(Redirect)* standar, melainkan menggunakan unduhan terselubung *Axios Blob* yang menjamin Token Autentikasi ikut dikirimkan.
- [ ] Tersedia efek umpan balik berupa Notifikasi *(Toast)* ketika dokumen berhasil diturunkan dari peladen *(Server)*.

---

## Panduan Implementasi Cerdas

**Path:** `frontend/src/app/(dashboard)/bmn/reports/page.tsx`

Pahat stasiun percetakan laporan tingkat eksekutif ini ke dalam komputermu:

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { FileBox, Download, FileSpreadsheet, Loader2, FileText, Wrench, Handshake } from "lucide-react";
import { toast } from "sonner";

export default function BmnReportsPage() {
    const [loadingAsset, setLoadingAsset] = useState(false);
    const [loadingLoan, setLoadingLoan] = useState(false);
    const [loadingMaintenance, setLoadingMaintenance] = useState(false);

    // ----------------------------------------------------------------------
    // SIHIR TINGKAT TINGGI: Unduhan Berbasis Token (Authenticated Blob Download)
    // ----------------------------------------------------------------------
    const executeDownload = async (endpoint: string, filename: string, setLoading: (s: boolean) => void) => {
        setLoading(true);
        try {
            // Kita meminta Wujud Kasar (Blob) dari API, bukan teks JSON!
            // Token akan disuntikkan secara gaib oleh lib/api.ts (Axios)
            const response = await api.get(endpoint, { responseType: 'blob' });
            
            // Mengubah wujud Blob menjadi alamat unduhan lokal sementara
            const url = window.URL.createObjectURL(new Blob([response.data]));
            
            // Menciptakan kail pancing siluman <a>
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename); // Paksa penamaan file
            document.body.appendChild(link);
            
            // Tekan tombolnya secara gaib, lalu bakar buktinya
            link.click();
            link.parentNode?.removeChild(link);
            
            toast.success(`Dokumen BPK: ${filename} berhasil dicetak ke komputer Anda.`);
        } catch (error) {
            toast.error("Gagal menarik gulungan laporan. Pastikan Backend mendukung eksportasi Excel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Area */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <FileBox className="w-8 h-8 text-emerald-500" /> Pusat Publikasi Laporan
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">Pusat pencetakan dokumen legal untuk keperluan audit Eksternal BPK dan Inspektorat Wilayah.</p>
            </div>

            {/* Panel Papan Utama Laporan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Laporan Buku Induk Aset */}
                <div className="bg-zinc-950/80 border border-emerald-500/20 p-6 rounded-3xl shadow-xl hover:border-emerald-500/50 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Buku Induk Aset Nasional</h3>
                        <p className="text-zinc-400 text-sm mb-6">Mencetak rekapitulasi 100 atribut dari seluruh wujud fisik Aset BKSDA beserta harga valuasinya.</p>
                    </div>
                    <button 
                        disabled={loadingAsset}
                        onClick={() => executeDownload('/bmn/assets/export', 'Katalog_Aset_BKSDA.xlsx', setLoadingAsset)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {loadingAsset ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Tarik Buku Format Excel
                    </button>
                </div>

                {/* 2. Laporan Lalu Lintas Peminjaman */}
                <div className="bg-zinc-950/80 border border-amber-500/20 p-6 rounded-3xl shadow-xl hover:border-amber-500/50 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Handshake className="w-6 h-6 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Riwayat Pinjam Pakai</h3>
                        <p className="text-zinc-400 text-sm mb-6">Mencetak catatan historis serah-terima alat kepada pegawai untuk melacak posisi barang.</p>
                    </div>
                    <button 
                        disabled={loadingLoan}
                        onClick={() => executeDownload('/bmn/loans/export', 'Lalu_Lintas_Peminjaman_BMN.xlsx', setLoadingLoan)}
                        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {loadingLoan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Tarik Buku Format Excel
                    </button>
                </div>

                {/* 3. Laporan Tagihan Bengkel */}
                <div className="bg-zinc-950/80 border border-blue-500/20 p-6 rounded-3xl shadow-xl hover:border-blue-500/50 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Wrench className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Arsip Biaya Pemeliharaan</h3>
                        <p className="text-zinc-400 text-sm mb-6">Mencetak rekap nota pengeluaran dana negara *(Rupiah)* yang telah dihabiskan untuk servis barang.</p>
                    </div>
                    <button 
                        disabled={loadingMaintenance}
                        onClick={() => executeDownload('/bmn/maintenances/export', 'Laporan_Biaya_Servis_BMN.xlsx', setLoadingMaintenance)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {loadingMaintenance ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Tarik Buku Format Excel
                    </button>
                </div>

            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombol sudah sukses ditekan dan Notifikasi hijau muncul, tapi file yang diunduh berwujud gumpalan teks aneh (Atau korup saat dibuka Excel)?

**Artinya:** Modul Backend BMN belum diajari cara merakit kepingan data menjadi file berekstensi `.xlsx`. 
**Solusi:** Memang benar. Di dokumen ini, kita **hanya** memasang kabel di sisi layar *(Frontend)*. Tombol ini menembak rute `/api/bmn/assets/export` yang sejatinya belum kita buat di Backend. Modifikasi Backend untuk ekspor (*Misal menggunakan pustaka Maatwebsite\Excel*) adalah tugas penyesuaian pihak pengembang tingkat lanjut dan di luar cakupan Fondasi Fase 5 ini. Antarmuka sudah berdiri secara abadi, Backend tinggal menyusul!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): integrate secure blob-based authenticated export protocols for BPK reporting" \
  --body "Pemasangan pabrik dokumen pencetakan Excel (XLSX). Mengadopsi perisai injeksi JWT Token *(Authenticated Axios Blob)* untuk mengatasi lubang pertahanan fungsi usang \`window.location.href\`. Detail di docs/issues/075-frontend-bmn-reports.md" \
  --label "frontend,ui,module-bmn,reports"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/075-frontend-bmn-reports
```

### Step 3: Kerjakan

Tuangkan cetak biru Panel Laporan Audit Eksekutif di atas ke dalam sumur `src/app/(dashboard)/bmn/reports/page.tsx`. Pahami dengan seksama bagaimana arsitektur *Blob Download* bekerja agar kelak kamu tidak tersiksa oleh *Bug Unauthorized 401* di modul lain.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): integrate secure blob-based authenticated export protocols for BPK reporting (#75)"
git push -u origin issue/075-frontend-bmn-reports
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): integrate secure blob-based authenticated export protocols for BPK reporting (#75)" \
  --body "## Summary
Pusat pengeluaran *(Export)* Laporan Resmi BMN sebagai fasilitas vital penunjang audit BPK semesteran.

## Changes
- Pembuatan antarmuka Papan Kendali (Control Panel) dengan orkestrasi 3 warna hierarkis: Emerald (Aset), Amber (Peminjaman), dan Blue (Servis).
- Implementasi fungsi murni tingkat tinggi \`executeDownload()\` yang mendelegasikan perpindahan berkas rahasia *(Blob Download)* menembus rute *(Axios Interceptor)* tanpa kehilangan kunci pengaman Sanctum.
- Penindasan taktik pengalihan purba \`window.location.href\` yang rentan serangan.

## Rules Compliance
- [x] Lolos Doktrin Keamanan API Nasional (Security Rule 1.6): Seluruh aliran keluar data ekspor dijamin membopong Token Identifikasi Pegawai *(Bearer Token)*, menutup mutlak celah penyedotan data anonim.

Closes #75" \
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
Modul BMN Fase 5 ditutup di sini. Kita perlu ruang percetakan agar admin bisa menarik laporan Excel tebal. Ingat, fungsi download harus membawa Auth Token, tidak boleh main klik link biasa.

## Task

Kerjakan Issue #075 (Frontend — BMN Reports & Export).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/075-frontend-bmn-reports.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file baru bersarang di `frontend/src/app/(dashboard)/bmn/reports/page.tsx`.
3. Tancapkan paku kode Panel Laporan Eksekutif *(Executive Reports)* secara utuh.
4. Perhatikan dengan teliti metode gaib pembuatan tautan unduhan `document.createElement('a')` di baris atas. Jangan ada yang dihilangkan.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
