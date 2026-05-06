# Issue #054 — Frontend — Inventory Dashboard (Pusat Analitik Logistik)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `dashboard`, `module-inventory`
> **Priority**: 🔴 Critical (Halaman Sambutan & Peringatan Dini Sistem Gudang)
> **Complexity**: 🟡 Medium (Integrasi React Query dengan UI Kartu Indikator & Peringatan Krisis Stok)
> **Recommended AI Model**: Gemini 2.5 Flash / Claude Sonnet / GPT-4o-mini
> **Dependencies**: Issue #051, Issue #053

---

## Branch

```
issue/054-frontend-inventory-dashboard
```

## Deskripsi

Setelah kita memasang cangkang navigasi (*Sidebar*) di Issue #053, kita membutuhkan sebuah halaman selamat datang yang langsung memanjakan mata dan memberikan informasi super penting seketika saat Kepala Logistik BKSDA membuka aplikasi.

Halaman ini akan memanggil rute `/api/inventory/dashboard/stats` yang sudah kita rancang peladennya (*Backend*) pada Issue #051. Halaman ini bukan sekadar pajangan; tugas utamanya adalah menjadi **Radar Peringatan Dini**.

Ada 2 bagian utama yang harus kita bangun:
1. **Papan Kartu Indikator (Stats Cards)**: Berisi kotak elegan yang merangkum *Total Master Barang* dan *Total Mutasi Bulan Ini*.
2. **Radar Krisis Stok (Low Stock Alerts)**: Ini yang paling krusial! Menampilkan daftar barang berwarna merah terang yang saldo fisiknya sudah jebol melampaui batas minimum (`min_stock`), menandakan BKSDA harus segera berbelanja/melakukan pengadaan barang tersebut.

---

## Acceptance Criteria

- [ ] File layar utama `src/app/(dashboard)/inventory/page.tsx` dibuat.
- [ ] Menerapkan fungsionalitas tarikan data asinkronus (Data Fetching) menggunakan `@tanstack/react-query`.
- [ ] Menampilkan 2 (Dua) Kotak Statistik (*Stat Cards*) dengan desain transparan (*Glassmorphism*).
- [ ] Menampilkan Daftar Peringatan Krisis Stok. Jika array peringatan kosong, berikan pesan peneduh: "Semua stok aman dan terkendali".
- [ ] Tersemat indikator pemuatan halus (*Skeleton Loading/Spinner*) ketika aplikasi sedang menunggu jawaban dari *Backend*.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\page.tsx`

Halaman tingkat tinggi ini akan menggabungkan kemewahan desain *Tailwind* dengan ketangguhan *React Query*. Salin kodingan lengkap di bawah ini:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Package, Activity, AlertTriangle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function InventoryDashboard() {
    // Menarik Data dari Dashboard Controller Backend (Issue 051)
    const { data: stats, isLoading, isError } = useQuery({
        queryKey: ['inventory-stats'],
        queryFn: async () => {
            const res = await api.get('/inventory/dashboard/stats');
            return res.data.data;
        }
    });

    // Indikator Pemuatan
    if (isLoading) {
        return (
            <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center text-emerald-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="text-zinc-400 font-medium">Menyinkronkan Data Logistik BKSDA...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400">
                    Gagal menarik data dari server. Pastikan Anda telah melakukan Login ulang.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            
            {/* Kop Judul */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Pusat Logistik</h1>
                <p className="text-zinc-400 mt-2">Ringkasan pergerakan aset persediaan dan peringatan keamanan stok.</p>
            </div>

            {/* Papan Indikator (Stat Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Total Master Katalog</p>
                            <h3 className="text-4xl font-bold text-white">{stats?.total_items || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Package className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <Link href="/inventory/items" className="mt-6 flex items-center gap-2 text-sm text-blue-400 font-semibold hover:text-blue-300 transition-colors w-max relative z-10">
                        Kelola Katalog <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Mutasi Aktif Bulan Ini</p>
                            <h3 className="text-4xl font-bold text-white">{stats?.mutasi_bulan_ini || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Activity className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <Link href="/inventory/transactions" className="mt-6 flex items-center gap-2 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors w-max relative z-10">
                        Lihat Jejak Rekam <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

            </div>

            {/* Panel Peringatan Krisis Stok */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Krisis Stok</h2>
                </div>
                
                <div className="p-6">
                    {(!stats?.krisis_stok || stats.krisis_stok.length === 0) ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                            <h3 className="text-emerald-400 font-bold text-lg">Semua Stok Aman</h3>
                            <p className="text-emerald-500/80 text-sm mt-1">Belum ada barang di jaringan kantor yang jatuh melewati batas kuantitas peringatan minimum.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-800/50">
                            {stats.krisis_stok.map((item: any) => (
                                <li key={item.id} className="py-4 flex justify-between items-center group">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-lg group-hover:text-red-400 transition-colors">{item.nama_barang}</span>
                                        <span className="text-zinc-500 text-sm font-mono mt-1">Kode: {item.kode_barang}</span>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <span className="text-red-500 font-black text-2xl">
                                            {item.total_fisik || 0} <span className="text-sm font-normal text-red-400/70">{item.satuan}</span>
                                        </span>
                                        <span className="text-zinc-500 text-xs mt-1">Batas Minimum: {item.min_stock}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

        </div>
    );
}
```

---

## Troubleshooting

### Q: Array Krisis Stok saya kosong, padahal saya yakin ada barang yang stoknya kurang!

**Artinya:** Anda mungkin belum mendistribusikan / menginisiasi barang tersebut di tabel relasi Kantor.
**Solusi:** Tabel Krisis Stok (dari Backend) akan menarik *Sum* / Jumlah Total (Total Fisik) dari gabungan tabel Kartu Saldo `inv_inventory_stocks` (karena barang tersebar di beberapa kantor). Jika sebuah master barang baru diciptakan dan belum pernah ada transaksi inisiasi (stok belum tercatat di satupun kantor), sistem BKSDA menganggapnya 0 dan akan langsung memunculkannya sebagai krisis darurat. Ini adalah fitur, bukan kesalahan.

### Q: Font-nya terlihat kebesaran dan merusak tata letak di HP.

**Artinya:** Resolusi terlalu sempit.
**Solusi:** Kodingan UI di atas sudah dilengkapi utilitas responsif `grid-cols-1 md:grid-cols-2`. Pada layar HP, Kartu Statistik secara patuh akan bersusun vertikal satu per satu untuk menghindari tabrakan teks.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): frontend analytical dashboard and low stock early warning system" \
  --body "Merancang pilar visual utama berbekal indikator Data Analysis (Glassmorphism Cards) beserta Radar Deteksi Defisit secara real-time dari Backend. Detail di docs/issues/054-frontend-inventory-dashboard.md" \
  --label "frontend,ui,dashboard,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/054-frontend-inventory-dashboard
```

### Step 3: Kerjakan

Ciptakan file `page.tsx` pada direktori pangkal rute `/inventory` dengan menyalin balok kodingan Reaksi Asinkron (*Async React Hooks*) di atas secara teliti. Jika kamu menyalakan terminal (NPM Run Dev), segera lihat hasilnya di *Browser*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(inventory): frontend analytical dashboard and low stock early warning system (#54)"
git push -u origin issue/054-frontend-inventory-dashboard
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): frontend analytical dashboard and low stock early warning system (#54)" \
  --body "## Summary
Penyematan layar selamat datang (*Landing Analytics*) bagi otoritas pemegang logistik BKSDA. Sistem mengubah kumpulan baris *Database* menjadi informasi strategis pengambil keputusan.

## Changes
- Penciptaan \`InventoryDashboard\` menggunakan panitia pemicu \`useQuery\` dari pustaka \`@tanstack/react-query\`.
- Penerapan tata letak estetika *Tailwind v4 Glassmorphism* pada 2 Kartu Indikator.
- Rancang bangun Panel *Alerting System* (Peringatan Dini) apabila saldonya melorot di bawah batas merah \`min_stock\`.

## Verification
- [x] Lolos pencegahan *UI Blocking* berkat elemen *Loading Skeleton* yang mulus.
- [x] Detektor kekosongan Array sukses memunculkan pesan centang hijau ('Stok Aman Terkendali').

Closes #54" \
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
Modul Logistik (*Frontend*) telah memiliki panel laci Sidebar pelindung. Saatnya menyematkan Layar Pusat Komando (*Dashboard*) di tengahnya yang berisi angka ringkasan performa gudang negara.

## Task

Kerjakan Issue #054 (Frontend — Inventory Dashboard).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/054-frontend-inventory-dashboard.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file titik awal `frontend/src/app/(dashboard)/inventory/page.tsx`.
3. Tuangkan barisan koding React dengan balutan perisai *Glassmorphism Tailwind* ke dalamnya.
4. Jangan lupa memeriksa kepatuhan muatan `useQuery` yang terhubung langung ke titik akhir `/inventory/dashboard/stats`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
