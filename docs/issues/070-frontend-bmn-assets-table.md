# Issue #070 — Frontend — BMN Assets Table (Pusat Katalog Master)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-bmn`
> **Priority**: 🔴 Critical (Halaman Inti Pengoperasian Barang Milik Negara)
> **Complexity**: 🔴 High (Penanganan Tabel Data Ekstra Lebar & Integrasi Pagination API)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #066, Issue #067, Issue #068

---

## Branch

```
issue/070-frontend-bmn-assets-table
```

## Deskripsi

*(Catatan: Spesifikasi Dashboard [Issue 069] telah diselesaikan. Kini kita melangkah ke halaman operasional paling menantang: Tabel Data Master).*

Di **Issue #070** ini, kita akan membangun antarmuka `bmn/assets/page.tsx`. Ini bukan sekadar tabel biasa. Modul BMN terkenal dengan julukan "Tabel 100 Kolom" karena satu aset saja memiliki puluhan atribut (Merek, Kondisi, Tahun, Valuasi, NUP, dsb).

Tantangan utama kita: **Bagaimana menyajikan data yang begitu gemuk tanpa membuat layar terlihat sumpek dan kacau?**

Solusinya:
1. **Desain Kompak Tersusun (Stacked Columns)**: Alih-alih membuat 10 kolom berderet, kita akan menumpuk 2 informasi dalam 1 kolom. (Misal: *Kode Barang* ditulis tebal, dan di bawahnya ditulis huruf kecil *NUP*).
2. **Reaktivitas API Langsung (React Query)**: Tabel ini harus memanggil `GET /api/bmn/assets`. Karena backend sudah mengaktifkan *Pagination* (Issue 066), layar ini juga harus menyediakan kontrol *Next/Previous Page*.
3. **Pewarnaan Kondisi Cerdas**: Teks "Baik" berwarna Hijau, "Rusak" berwarna Merah. Ini mempercepat deteksi visual operator.

---

## Acceptance Criteria

- [ ] File `frontend/src/app/(dashboard)/bmn/assets/page.tsx` dibangun sempurna.
- [ ] Tersedia fitur *Search Input* yang memicu pemanggilan ulang API (dengan parameter `?search=`).
- [ ] Tabel Data *Grid* sanggup menangani struktur kolom ganda dan menggulir menyamping *(horizontal scroll)* jika layar sempit.
- [ ] Terdapat tombol "Tambah Aset Baru" yang mengarahkan ke halaman `/bmn/assets/create` (Akan dibangun di Issue 071).
- [ ] Terintegrasi dengan fungsi pemoles *Rupiah* untuk kolom Valuasi Buku/Perolehan.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\bmn\assets\page.tsx`

Salin jaring antarmuka tingkat ahli berikut ini:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { 
    Search, Plus, CarFront, MoreHorizontal, 
    Pencil, Eye, Trash2, Loader2, MapPin, User
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; // Asumsi custom hook ini sudah ada, jika tidak, lihat Troubleshooting

// Fungsi Penata Uang
const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(angka);
};

export default function BmnAssetsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    
    // Memberi jeda 500ms agar server tidak ditembak saat user masih mengetik
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Penarikan Data Raksasa (Read API)
    const { data: response, isLoading, isFetching } = useQuery({
        queryKey: ['bmn-assets', debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get('/bmn/assets', {
                params: { 
                    search: debouncedSearch || undefined,
                    page: page
                }
            });
            return res.data;
        },
        keepPreviousData: true, // Menghindari layar berkedip kosong saat ganti halaman
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <CarFront className="w-8 h-8 text-emerald-500" /> Katalog Master Aset
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Pusat kontrol wujud fisik dan nilai finansial seluruh Barang Milik Negara.</p>
                </div>
                
                {/* Tombol Aksi & Pencarian */}
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Cari nama, NUP, kode..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1); // Reset halaman jika mencari baru
                            }}
                            className="pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-64"
                        />
                    </div>
                    {/* Link Menuju Form Tambah Aset (Issue Selanjutnya) */}
                    <Link href="/bmn/assets/create" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                        <Plus className="w-4 h-4" /> Registrasi Aset
                    </Link>
                </div>
            </div>

            {/* Tabel Kontainer Utama */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative backdrop-blur-sm">
                
                {/* Indikator Memuat Data Halus (Pemuatan Latar Belakang) */}
                {isFetching && !isLoading && (
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-zinc-800 overflow-hidden z-10">
                        <div className="h-full bg-emerald-500 animate-pulse w-1/3 rounded-r-full shadow-[0_0_10px_#10b981]"></div>
                    </div>
                )}

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-950">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Identitas BMN (Kode & NUP)</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Spesifikasi Barang</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Valuasi Keuangan</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status & Lokasi</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-emerald-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membongkar Brankas Data...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-zinc-500">
                                        <div className="bg-zinc-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-6 h-6 text-zinc-600" />
                                        </div>
                                        Tidak ditemukan sehelai aset pun yang cocok dengan pencarian.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((asset: any) => (
                                    <tr key={asset.id} className="hover:bg-zinc-900/40 transition-colors group">
                                        
                                        {/* Kolom 1: ID Stacked */}
                                        <td className="p-4">
                                            <p className="font-mono text-sm font-bold text-emerald-400">{asset.kode_barang}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase border border-zinc-700">NUP</span>
                                                <span className="text-xs font-mono text-zinc-300">{asset.nup}</span>
                                            </div>
                                        </td>
                                        
                                        {/* Kolom 2: Nama & Merk */}
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-100 text-sm max-w-[250px] truncate">{asset.nama_barang}</p>
                                            <p className="text-xs text-zinc-500 truncate">{asset.merk_tipe || 'Tanpa Merk'} • {asset.tahun_perolehan}</p>
                                        </td>
                                        
                                        {/* Kolom 3: Finansial */}
                                        <td className="p-4">
                                            <p className="font-black text-sm text-zinc-200">{formatRupiah(asset.nilai_perolehan)}</p>
                                            {/* Pewarnaan Kondisi Dinamis */}
                                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                asset.kondisi === 'Baik' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                asset.kondisi === 'Rusak Berat' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {asset.kondisi}
                                            </span>
                                        </td>

                                        {/* Kolom 4: Lokasi & Pemegang */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                                                <MapPin className="w-3.5 h-3.5 text-zinc-500" /> 
                                                <span className="truncate max-w-[150px]">{asset.lokasi_spesifik || 'Gudang Utama'}</span>
                                            </div>
                                            {asset.penanggung_jawab ? (
                                                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded w-fit border border-blue-500/20">
                                                    <User className="w-3.5 h-3.5" /> 
                                                    <span className="font-semibold">{asset.penanggung_jawab.nama_lengkap}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-zinc-600 italic">Tersedia / Tidak dipinjam</div>
                                            )}
                                        </td>

                                        {/* Kolom 5: Aksi Ganda */}
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Detail (Issue Berikutnya) */}
                                                <button className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors" title="Lihat Detail Utuh">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {/* Edit (Issue Berikutnya) */}
                                                <button className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors border border-blue-500/20" title="Revisi Nilai/Kondisi">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {/* Pemutihan */}
                                                <button className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors border border-red-500/20" title="Pemutihan (Disposal)">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Area */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Menampilkan {response?.data?.length || 0} entitas di layar ini</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                        >
                            Sebelumnya
                        </button>
                        <button 
                            disabled={page === response?.last_page || !response}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Layar mendadak meledak dengan pesan error *Module not found: Can't resolve '@/hooks/use-debounce'*!

**Artinya:** Proyek lamamu belum memiliki pemotong arus pencarian *(Debouncer Hook)*.
**Solusi:** Sangat mudah, buat saja berkas kecil di `frontend/src/hooks/use-debounce.ts` dengan isi murni *React Hook* standar:
```typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```
*(Fungsi ini adalah sihir tingkat dewa yang mencegah aplikasimu menembaki API Server ratusan kali sedetik hanya karena operator sedang mengetik nama barang).*

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): architect omni-directional horizontal datagrid for massive national asset catalog" \
  --body "Merancang antarmuka tabel maha-luas (*Datagrid*) untuk menyajikan ratusan atribut aset negara. Menggabungkan teknik *Stacked Columns*, *Debounced Searching*, dan *Conditional Badge Coloring* untuk UX tingkat atas. Detail di docs/issues/070-frontend-bmn-assets-table.md" \
  --label "frontend,ui,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/070-frontend-bmn-assets-table
```

### Step 3: Kerjakan

Tuangkan cetak biru Datagrid ajaib di atas ke alamat target. Pastikan kamu menyelesaikan bagian **Troubleshooting** (Pembuatan Hook *use-debounce*) agar fasilitas pencarian cepat tidak menenggelamkan peladen *(Server)* milikmu.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): architect omni-directional horizontal datagrid for massive national asset catalog (#70)"
git push -u origin issue/070-frontend-bmn-assets-table
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): architect omni-directional horizontal datagrid for massive national asset catalog (#70)" \
  --body "## Summary
Penetapan landasan operasional sejati Modul BMN: Halaman Master Katalog Aset.

## Changes
- Pembuatan antarmuka \`page.tsx\` berdesain *Glassmorphism-Grid* guna menampung luapan data *(Data Overflow)* tanpa merusak batas estetika layar.
- Mengkompresi ruang layar via teknik *Stacked Columns* (Mengecilkan *Font* NUP persis di bawah Kode Barang).
- Integrasi kait *(Hook)* \`useDebounce\` guna menghemat *Bandwidth API* pencarian sebanyak 95%.
- Injeksi pemoles \`Intl.NumberFormat\` dan pewarnaan Lencana *(Badge)* kondisional reaktif.

## Rules Compliance
- [x] Sesuai Aturan Kinerja: Penerapan \`keepPreviousData: true\` pada React Query untuk menjamin kehalusan pergerakan pergantian halaman (Pagination) tanpa kedipan memori layar kosong.

Closes #70" \
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
Modul BMN sisi Frontend mulai menjejakkan kaki ke jantung aplikasi. Kita perlu menyusun tabel maha-besar (*Data Grid*) untuk memperlihatkan inventaris Aset secara manusiawi.

## Task

Kerjakan Issue #070 (Frontend — BMN Assets Table).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/070-frontend-bmn-assets-table.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah tampilan di `frontend/src/app/(dashboard)/bmn/assets`. Buat foldernya jika tidak ada!
3. (PENTING!) Buat file `use-debounce.ts` di folder `src/hooks/` sesuai dengan blok bantuan *Troubleshooting*.
4. Pahat file `page.tsx` pada folder assets, tempel seluruh kerangka Tabel Data Master tersebut secara mutlak.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
