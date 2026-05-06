# Issue #058 — Frontend — Transactions History (Buku Besar Riwayat Mutasi)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-inventory`, `reporting`
> **Priority**: 🔴 Critical (Alat Audit Bukti Pertanggungjawaban BPK)
> **Complexity**: 🟡 Medium (Tabel Data dengan Filter dan Patching Backend Rute Baru)
> **Recommended AI Model**: Gemini 2.5 Flash / Claude Sonnet / GPT-4o-mini
> **Dependencies**: Issue #052, Issue #056, Issue #057

---

## Branch

```
issue/058-frontend-inventory-transactions
```

## Deskripsi

*(Peringatan: Baca bagian **Patching Backend** di bawah dengan teliti sebelum menyalin kodingan Frontend).*

Logistik tanpa Buku Kas adalah korupsi yang tertunda. Segala macam aksi pemasukan barang (Issue 56) dan pengeluaran barang kepada pegawai (Issue 57) seluruh jejaknya (Audit Trail) terekam abadi di tabel `inv_stock_transactions` lengkap beserta cap tanggal (Timestamp) dan ID pelakunya.

Pada **Issue #058**, kita akan menyajikan data sakral tersebut ke layar pengguna (BKSDA) dalam wujud **Buku Besar Riwayat Mutasi**. Halaman ini beralamat di `/inventory/transactions` dan menyediakan lencana (Badge) indikator warna hijau terang untuk aliran masuk (*Inbound*) dan merah tajam untuk aliran keluar (*Outbound*).

### 🔧 PATCHING BACKEND (Wajib)
Pada saat arsitektur Fase Backend (Issue 51 & 52), fungsi `history()` terlupakan. Kamu wajb menyusupkan perbaikan ini terlebih dahulu:

1. **Buka `StockController.php`**, tambahkan fungsi ini di bawah:
```php
public function history(\Illuminate\Http\Request $request)
{
    $query = \App\Modules\Inventory\Models\StockTransaction::with([
        'item:id,nama_barang,satuan', 
        'office:id,nama_kantor', 
        'employee:id,nama_lengkap',
        'user:id,name'
    ])->latest();

    if ($request->filled('type')) {
        $query->where('type', $request->type);
    }

    return response()->json($query->paginate(20));
}
```

2. **Buka `Routes/api.php`**, tambahkan rute ini di dalam grup Rute Pembacaan *(READ)* yang bisa diakses operator biasa:
```php
Route::get('/transactions', [StockController::class, 'history']);
```

---

## Acceptance Criteria

- [ ] Melakukan operasi penyisipan *(Patching)* fungsi `history` pada Backend Controller & Route.
- [ ] File `src/app/(dashboard)/inventory/transactions/page.tsx` dibangun.
- [ ] Tersedia Data Grid dengan kolom: Tanggal, Tipe Aksi (Badge), Nama Barang, Kuantitas, Saldo Sisa *(Remaining)*, dan Aktor (Admin/Pegawai).
- [ ] Tabel merespon parameter *Filter* tipe (`in`, `out`, `all`) melalui mekanisme re-fetch React Query.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\transactions\page.tsx`

Halaman ini memanfaatkan fungsionalitas asinkron tingkat tinggi, namun tidak perlu tombol Simpan.

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { History, Loader2, ArrowDownToLine, ArrowUpFromLine, Filter } from "lucide-react";
import dayjs from "dayjs";
// Opsional: install plugin dayjs locale id jika ingin bahasa indonesia
// import "dayjs/locale/id";
// dayjs.locale("id");

export default function TransactionsHistoryPage() {
    const [filterType, setFilterType] = useState<string>("");

    // Tarik Data Tabel berdasarkan Filter
    const { data: response, isLoading, isFetching } = useQuery({
        queryKey: ['inventory-transactions', filterType], // React Query akan otomatis memanggil ulang fungsi jika filterType berubah
        queryFn: async () => {
            const res = await api.get('/inventory/transactions', {
                params: { type: filterType || undefined } // undefined agar tidak terkirim jika kosong
            });
            return res.data;
        }
    });

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <History className="w-8 h-8 text-emerald-500" /> Buku Riwayat Mutasi
                    </h1>
                    <p className="text-zinc-400 mt-2">Pencatatan utuh (*Audit Trail*) keluar-masuknya aset persediaan negara.</p>
                </div>
                
                {/* Tombol Filter Dinamis */}
                <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800">
                    <Filter className="w-4 h-4 text-zinc-500 ml-2" />
                    <button 
                        onClick={() => setFilterType("")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === "" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                        Semua
                    </button>
                    <button 
                        onClick={() => setFilterType("in")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === "in" ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-blue-300"}`}
                    >
                        Stok Masuk
                    </button>
                    <button 
                        onClick={() => setFilterType("out")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === "out" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-orange-300"}`}
                    >
                        Distribusi Keluar
                    </button>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
                
                {/* Indikator Memuat Data Halus di pojok atas */}
                {isFetching && !isLoading && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20 overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-pulse w-1/3 rounded-r-full"></div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-950/50 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Tgl / Waktu</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Aksi</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Barang & Lokasi</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Mutasi (Sisa)</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Keterlibatan / Aktor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-emerald-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        <span className="text-sm font-medium text-zinc-500">Membuka lembaran buku kas...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-zinc-500">
                                        Belum ada satupun riwayat logistik yang tercatat di arsip BKSDA.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-emerald-500/5 transition-colors">
                                        <td className="p-4">
                                            <p className="font-mono text-sm text-zinc-300">{dayjs(tx.created_at).format('DD MMM YYYY')}</p>
                                            <p className="text-xs text-zinc-500">{dayjs(tx.created_at).format('HH:mm:ss')} WIB</p>
                                        </td>
                                        <td className="p-4">
                                            {tx.type === 'in' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold">
                                                    <ArrowDownToLine className="w-3 h-3" /> MASUK
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-xs font-bold">
                                                    <ArrowUpFromLine className="w-3 h-3" /> KELUAR
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200">{tx.item?.nama_barang || 'Barang Dihapus'}</p>
                                            <p className="text-xs text-zinc-500">di {tx.office?.nama_kantor || 'Kantor Dihapus'}</p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className={`font-black text-lg ${tx.type === 'in' ? 'text-blue-500' : 'text-orange-500'}`}>
                                                {tx.type === 'in' ? '+' : '-'}{tx.quantity} <span className="text-xs font-normal opacity-70">{tx.item?.satuan}</span>
                                            </p>
                                            <p className="text-[10px] font-mono text-zinc-500">Sisa: {tx.remaining_stock}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-semibold text-zinc-300">
                                                Admin: <span className="font-normal text-zinc-400">{tx.user?.name || 'Sistem'}</span>
                                            </p>
                                            {tx.type === 'out' && (
                                                <p className="text-xs font-semibold text-zinc-300 mt-1">
                                                    Penikmat: <span className="font-normal text-zinc-400">{tx.employee?.nama_lengkap || '-'}</span>
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Area Navigasi Halaman */}
                <div className="p-4 bg-zinc-950/30 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-medium">
                    Halaman {response?.current_page || 1} dari {response?.last_page || 1} Total Arsip
                </div>
            </div>

        </div>
    );
}
```

---

## Troubleshooting

### Q: `dayjs` mengalami *Error: Cannot find module 'dayjs'*

**Artinya:** Modul *dayjs* belum ter-install di Next.js Anda (biasanya `date-fns` atau `moment` yang sudah ada, tapi `dayjs` lebih ringan).
**Solusi:** Ketikkan perintah ini di Terminal Frontend:
```bash
npm install dayjs
```

### Q: Kolom "Admin" dan "Penikmat" memperlihatkan tulisan "*Barang Dihapus*" atau kosong. Kenapa?

**Artinya:** Implementasi relasi di Model kamu (Issue 47) benar-benar mengizinkan data kosong (Soft Delete / Nullable).
**Solusi:** Tanda tanya di kode `tx.item?.nama_barang` (opsional chaining) adalah pencegah Aplikasi *Crash*. Di masa depan, jika admin BKSDA menghapus seorang pegawai dari Database Kepegawaian, maka riwayat mutasinya di logistik tidak akan error (hanya akan memunculkan tanda setrip "-" atau tulisan 'Dihapus'). Inilah kehebatan rancangan *Robust MVP*.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): transactions audit trail data grid with backend route patching" \
  --body "Merancang Buku Besar Riwayat Transaksi (Audit Trail) khusus untuk pelacakan barang. Menambal celah kekurangan Endpoint API dari Fase Arsitektur Backend. Detail di docs/issues/058-frontend-inventory-transactions.md" \
  --label "frontend,ui,module-inventory,reporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/058-frontend-inventory-transactions
```

### Step 3: Kerjakan

Salin baris kodingan tabel *Data Grid* ini ke alamat target `/inventory/transactions/page.tsx`. Jangan lupa mengeksekusi instalasi paket `dayjs` melalui perintah NPM sebelum menjalankan peramban percobaanmu (`npm run dev`). Ingat: **Lakukan penambalan (*Patching*) kodingan *Backend* di awal terlebih dahulu agar React tidak kebingungan!**

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/ frontend/
git commit -m "feat(inventory): transactions audit trail data grid with backend route patching (#58)"
git push -u origin issue/058-frontend-inventory-transactions
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): transactions audit trail data grid with backend route patching (#58)" \
  --body "## Summary
Penyempurnaan Fase Pelaporan dan Audit Modul Logistik melalui penggelaran Halaman Jejak (*Transactions History*).

## Changes
- [PATCHING] Penyisipan Endpoint Controller Baru (\`/inventory/transactions\`) di dalam sirkuit \`api.php\`.
- Penerapan fungsi filter *Real-Time Cache* bawaan \`useQuery\` dengan memanfaatkan pergantian \`queryKey\` (['inventory-transactions', filterType]).
- Pewarnaan Lencana Aksi ganda (*Dual Badge Styling*) untuk diferensiasi visual cepat antara Logistik Keluar (Orange) dan Masuk (Biru).

## Rules Compliance
- [x] Mendukung Aturan Keamanan Integritas Data BPK dengan menampilkan kolom Saldo Terakhir (\`remaining_stock\`) pada wujud *Data Grid* murni.

Closes #58" \
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
Seluruh rantai siklus hidup Modul Logistik telah berputar. Halaman terakhir yang dibutuhkan BKSDA adalah Lembar Audit (*Transactions Report*) yang memperlihatkan gerak-gerik transaksi Gudang mereka.

## Task

Kerjakan Issue #058 (Frontend — Transactions history).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/058-frontend-inventory-transactions.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Tambal (Patch) kekurangan API di sisi Backend (`StockController.php` dan `api.php`) persis sesuai aba-aba Markdown di blok **PATCHING BACKEND**.
3. Jika belum ter-install, eksekusi `npm install dayjs` di folder frontend.
4. Buat file visual di `frontend/src/app/(dashboard)/inventory/transactions/page.tsx` lalu tempel kerangka UI Tabel canggih tersebut.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
