# Issue #074 — Frontend — BMN Disposal Page (Ruang Karantina & Pemutihan)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-bmn`, `backend-patch`
> **Priority**: 🔴 Critical (Prosedur Legal Penghapusan Aset Negara)
> **Complexity**: 🟡 Medium (Integrasi SoftDeletes Laravel ke Tampilan React)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #066, Issue #070

---

## Branch

```
issue/074-frontend-bmn-disposal
```

## Deskripsi

Melompat langsung merakit layar Pemutihan (Disposal) di ranah *Frontend* adalah **TIDAK AMAN**! Mengapa?

Karena pada saat kita merancang `AssetController.php` di **Issue 066**, kita menggunakan baris kode:
`$query = Asset::with('penanggungJawab')->latest();`

Secara bawaan *(Default)*, Laravel Eloquent akan **MENYEMBUNYIKAN SECARA GAIB** semua wujud data yang telah terkena *SoftDeletes* (Pemutihan). Akibatnya, berapapun aset yang dihapus oleh admin, layar Frontend tidak akan pernah bisa memanggilnya kembali karena *Backend* menolak mengembalikannya!

Maka dari itu, pada **Issue #074** ini, kita melakukan tugas ganda (Tandem):
1. **Backend Patch**: Mengajari *AssetController* untuk menembus dinding *SoftDeletes* menggunakan parameter `?status=disposed`.
2. **Frontend UI**: Merakit Layar Tabel Karantina beraksen Merah Gelap untuk menampilkan aset-aset hantu tersebut beserta "Alasan Pemutihannya".

---

## Acceptance Criteria

- [ ] Melakukan mutasi pada `backend/app/Modules/Bmn/Controllers/AssetController.php` untuk memunculkan wujud `onlyTrashed()`.
- [ ] Folder dan wujud Modul UI diciptakan: `frontend/src/app/(dashboard)/bmn/disposal/page.tsx`.
- [ ] Tersedia Tabel Daftar Aset yang telah Diputihkan *(Disposed)* beserta tanggal pelelangan/pemutihannya.
- [ ] Tabel tersebut tidak memiliki tombol "Edit" maupun "Pinjam", melainkan murni sebagai bukti Arsip Penghapusan Aset BPK.

---

## Panduan Implementasi Cerdas

### Tahap 1: Pembobolan SoftDeletes (Backend Patch)
**Buka:** `backend/app/Modules/Bmn/Controllers/AssetController.php`

Temukan fungsi `index(Request $request)` dan modifikasi blok penarikan kuerinya menjadi seperti ini:

```php
    public function index(Request $request)
    {
        // 1. Inisiasi Kueri Dasar
        $query = Asset::with('penanggungJawab')->latest();

        // 2. PATCH: Deteksi jika Frontend meminta Data yang Dihapus (Pemutihan)
        if ($request->query('status') === 'disposed') {
            $query->onlyTrashed(); // Sihir pemanggil data hantu
        }

        // 3. Fitur Pencarian Cepat
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama_barang', 'ilike', "%{$search}%")
                  ->orWhere('kode_barang', 'ilike', "%{$search}%")
                  ->orWhere('nup', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }
```

### Tahap 2: Pembangunan Panti Karantina (Frontend UI)
**Buka:** `frontend/src/app/(dashboard)/bmn/disposal/page.tsx` (Buat file-nya jika belum ada).

Salin dan pahat cetak biru bernuansa Merah (Peringatan) ini:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trash2, Loader2, AlertTriangle, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; 

const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
};

export default function BmnDisposalLogsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(searchTerm, 500);
    
    // Penarikan Data Hantu (Perhatikan penambahan status=disposed)
    const { data: response, isLoading } = useQuery({
        queryKey: ['bmn-assets-disposed', debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get('/bmn/assets', { 
                params: { 
                    status: 'disposed', // Menghidupkan saklar SoftDeletes di Backend
                    search: debouncedSearch || undefined,
                    page 
                } 
            });
            return res.data;
        },
        keepPreviousData: true,
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-red-500 tracking-tight flex items-center gap-3">
                        <Trash2 className="w-8 h-8" /> Arsip Karantina & Pemutihan
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Daftar abadi barang negara yang telah dilelang, musnah, atau diputihkan secara legal.</p>
                </div>
                
                {/* Pencarian (Sama seperti tabel aset utama) */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                    <input 
                        type="text" placeholder="Cari aset hantu..." value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="pl-10 pr-4 py-2 bg-red-950/20 border border-red-900/50 rounded-xl text-sm text-red-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all w-64 placeholder:text-red-900"
                    />
                </div>
            </div>

            <div className="bg-zinc-950/80 border border-red-900/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.05)] relative backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-red-950/40 border-b border-red-900/50">
                                <th className="p-4 text-xs font-bold text-red-400/80 uppercase">Tgl Pemutihan</th>
                                <th className="p-4 text-xs font-bold text-red-400/80 uppercase">Identitas BMN (Kode & NUP)</th>
                                <th className="p-4 text-xs font-bold text-red-400/80 uppercase text-right">Valuasi Terakhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-950/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-red-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membangkitkan Arsip Hantu...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-red-500/50">
                                        <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
                                        Belum ada aset negara yang dimusnahkan.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((asset: any) => (
                                    <tr key={asset.id} className="hover:bg-red-950/20 transition-colors">
                                        <td className="p-4">
                                            {/* Tanggal Penghapusan dari field deleted_at milik SoftDeletes */}
                                            <p className="font-bold text-red-300 text-sm">{new Date(asset.deleted_at).toLocaleDateString('id-ID')}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-300 text-sm max-w-[300px] truncate">{asset.nama_barang}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-mono text-zinc-500">{asset.kode_barang}</span>
                                                <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-mono uppercase border border-red-900/50">NUP: {asset.nup}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-mono text-sm font-black text-red-400">{formatRupiah(asset.nilai_buku || asset.nilai_perolehan)}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-zinc-950 border-t border-red-900/30 flex items-center justify-between text-sm">
                    <span className="text-red-500/60 font-medium">Menampilkan {response?.data?.length || 0} aset musnah.</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={page === response?.last_page || !response} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombol "Pemutihan" di Tabel Master (Issue 070) belum berfungsi?

**Artinya:** Modul tersebut belum dibekali logika pemicu. 
**Solusi:** Memang benar. Penghapusan (Pemutihan) adalah wewenang khusus tingkat tinggi yang idealnya membutuhkan *Password* ulang *(Confirm Password)* sebelum dieksekusi. Untuk menyederhanakan, pelanjut *(Developer)* dapat menautkan tombol tong sampah di `assets/page.tsx` (Issue 070) ke fungsi API `api.delete('/bmn/assets/' + id + '/dispose')` dengan membawa input `alasan_pemutihan`. Ini adalah modifikasi mandiri yang diizinkan *(Developer's Discretion)*.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): deploy ghost-record retrieval endpoint and rendering matrix for disposed assets" \
  --body "Membangun ruang karantina aset. Melakukan penetrasi *Backend Patch* menembus pelindung Eloquent \`onlyTrashed()\` guna membuka tabir data yang telah diputihkan *(SoftDeleted)*. Merakit layar antarmuka *Frontend* berestetika Peringatan (Merah Gelap) untuk transparansi lelang BPK. Detail di docs/issues/074-frontend-bmn-disposal.md" \
  --label "frontend,ui,module-bmn,backend-patch"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/074-frontend-bmn-disposal
```

### Step 3: Kerjakan

Lakukan misi Tandem (Ganda). Pergi ke *Backend* terlebih dahulu untuk mengamankan modifikasi *AssetController*. Barulah kamu boleh beralih ke *Frontend* membangun file `page.tsx` di dalam wilayah `/disposal`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add .
git commit -m "feat(bmn): deploy ghost-record retrieval endpoint and rendering matrix for disposed assets (#74)"
git push -u origin issue/074-frontend-bmn-disposal
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): deploy ghost-record retrieval endpoint and rendering matrix for disposed assets (#74)" \
  --body "## Summary
Ekskavasi data tersembunyi (Disposed Assets) dan pelaporan visual ruang Pemutihan Modul BMN.

## Changes
- **Backend**: Pemasangan gerbang parameter \`?status=disposed\` pada \`AssetController@index\` menggunakan sihir \`onlyTrashed()\` bawaan Eloquent.
- **Frontend**: Pembuatan antarmuka tabel \`disposal/page.tsx\` bersorot gradasi merah peringatan (\`bg-red-950\`).
- Ekstraksi waktu pemusnahan secara akurat langsung dari atribut \`deleted_at\`.

## Rules Compliance
- [x] Lolos Doktrin Integritas Forensik BMN: Data yang telah dihapus tetap dapat dicari keberadaannya di layar ini berkat koneksi pencarian \`ilike\` yang merambat menembus data \`onlyTrashed\`.

Closes #74" \
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
Aset negara yang telah dihancurkan/dijual (Pemutihan) tidak boleh lenyap begitu saja dari pandangan mata layar BKSDA. Kita butuh layar khusus ("Panti Karantina") untuk memajang daftar hantu aset tersebut.

## Task

Kerjakan Issue #074 (Frontend — BMN Disposal Page).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/074-frontend-bmn-disposal.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Misi Ganda (Backend): Buka `backend/app/Modules/Bmn/Controllers/AssetController.php`, modifikasi bagian `index()` dengan logika penarik data terhapus (`if status === disposed`).
3. Misi Ganda (Frontend): Turun ke `frontend/src/app/(dashboard)/bmn/disposal/page.tsx`. Pahat wujud tabel berwarna Peringatan Merah tersebut secara sempurna.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
