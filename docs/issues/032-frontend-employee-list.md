# Issue #032 — Frontend — Employee List View

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-kepegawaian`
> **Priority**: 🔴 Critical (Halaman inti Modul Kepegawaian)
> **Complexity**: 🔴 High (Integrasi TanStack Query, Debounce Search, & Pagination)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #025 (Backend Controller List API), #020 (TanStack Provider)

---

## Branch

```
issue/032-frontend-employee-list
```

## Deskripsi

Kini kita mulai memasuki lorong pengerjaan *Fitur Bisnis*. Di dalam modul Kepegawaian, fitur pertama yang wajib ada adalah Daftar Tabel Pegawai. Halaman ini adalah tempat di mana admin akan melihat ratusan (bahkan ribuan) data pegawai instansi.

Karena datanya bisa sangat masif, **Rule 7.6** (Aturan Mutlak BKSDA) melarang keras *Frontend* memanggil seluruh data sekaligus ke dalam layar. Kita **WAJIB** menggunakan sistem penarikan data bertahap (*Pagination*). Dan untuk mewujudkan sistem yang sekelas aplikasi *Enterprise*, kita akan mengawinkannya dengan `TanStack React Query` (Issue 020) agar data tersimpan cerdas (*Cached*) dan tidak membuang-buang kuota internet instansi.

**Apa yang dilakukan:**
1. Membuat rute layar `src/app/(dashboard)/kepegawaian/page.tsx`.
2. Menerapkan *Debounced Search* (Rule 7.5) agar kotak pencarian tidak membuat server *nge-hang* saat kita mengetik cepat.
3. Membangun Tabel UI bergaya Premium dengan status *Loading Skeleton* dan Tombol Aksi yang bersembunyi rapi (muncul saat di-*hover*).
4. Menyediakan antarmuka tombol *Pagination* (Prev/Next) yang terkoneksi dengan status *Meta* (Rule 5.1).

---

## Acceptance Criteria

- [ ] File rute `page.tsx` dibuat di dalam folder `kepegawaian`.
- [ ] Integrasi `api.get()` menggunakan hook `useQuery` dengan *queryKeys* `page` dan `debouncedSearch`.
- [ ] Terdapat mekanisme *timeout* (Debounce) 500ms pada *state* pencarian.
- [ ] Tombol Pagination otomatis *disabled* (mati) jika berada di halaman pertama atau halaman terakhir.
- [ ] Menampilkan *Loading Skeleton* yang rapi saat status API sedang `isLoading`.
- [ ] Baris tabel (`<tr>`) memiliki animasi kemunculan Tombol Aksi (*Edit/Delete/Access*) di sudut kanan saat di-*hover*.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Kita menggunakan "Inline Debounce" dengan fungsi `useEffect` bawaan React untuk menghambat eksekusi API. Dengan cara ini, server tidak akan dibombardir ratusan *Request* setiap kali jari tangan kita memencet satu buah huruf di *keyboard*. 

### Langkah 1: Buat Halaman Tabel Inti

**Kenapa?** Mengintegrasikan React Query dengan parameter dinamis memberikan pengalaman UI layaknya Aplikasi Desktop yang super cepat tanpa *Loading Page* putih yang mengganggu.

```bash
mkdir -p frontend/src/app/\(dashboard\)/kepegawaian
```

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\kepegawaian\page.tsx`

**Buat file tersebut, dan salin kode ajaib di bawah ini dengan presisi:**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, UserCog, Edit, Trash2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

// 1. Tipe Data (TypeScript Interfaces) - Sesuai dengan respons Issue #025
interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  jabatan: string | null;
  satuan_kerja: string | null;
  is_active: boolean;
}

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
}

interface ApiResponse {
  data: Employee[];
  meta: Meta;
}

export default function EmployeeListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 2. Rule 7.5: Debounce Logic (Tahan nafas 500ms sebelum nembak API)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Otomatis reset ke halaman 1 setiap kali mencari nama baru
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 3. Rule 7.2 & 7.6: Pemanggilan Data Pagination
  const fetchEmployees = async (currentPage: number, search: string) => {
    const { data } = await api.get<ApiResponse>(`/kepegawaian/employees`, {
      params: { page: currentPage, search }
    });
    return data;
  };

  // 4. TanStack Query (Manajemen State Server Premium)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page, debouncedSearch], // React Query akan memantau 2 variabel ini
    queryFn: () => fetchEmployees(page, debouncedSearch),
    staleTime: 60 * 1000, // Data ini valid/di-cache di RAM selama 60 detik
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Data Pegawai</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Kelola informasi master data SDM instansi BKSDA.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari NIP / Nama..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm shadow-sm"
            />
          </div>
          
          {/* TOMBOL TAMBAH (Arah ke form Create) */}
          <Link 
            href="/kepegawaian/create"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 w-full sm:w-auto justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </Link>
        </div>
      </div>

      {/* CONTAINER TABEL DATA (Premium Card) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Profil Pegawai</th>
                <th className="px-6 py-4 whitespace-nowrap">NIP</th>
                <th className="px-6 py-4 whitespace-nowrap">Jabatan</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              
              {/* STATE 1: SEDANG LOADING (Skeleton) */}
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-white dark:bg-zinc-900">
                    <td className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-32 mb-2"></div><div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-20 ml-auto"></div></td>
                  </tr>
                ))
              )}

              {/* STATE 2: TERJADI ERROR JARINGAN/SERVER */}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-red-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Gagal memuat data dari server.</p>
                    <p className="text-xs mt-1 text-red-400/80">Periksa koneksi internet atau ketersediaan Backend API.</p>
                  </td>
                </tr>
              )}

              {/* STATE 3: PENCARIAN KOSONG / DATA BELUM ADA */}
              {!isLoading && !isError && data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-zinc-500">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">Tidak ada data pegawai yang ditemukan.</p>
                  </td>
                </tr>
              )}

              {/* STATE 4: MENAMPILKAN BARIS DATA */}
              {!isLoading && !isError && data?.data.map((emp) => (
                <tr key={emp.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{emp.nama_lengkap}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{emp.satuan_kerja || "Satuan Kerja Belum Diatur"}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">{emp.nip}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 text-sm">{emp.jabatan || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      emp.is_active 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                    }`}>
                      {emp.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Deretan Tombol (Tersembunyi, Muncul saat Baris di-Hover) */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <button className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-colors" title="Manajemen Hak Akses (IAM)">
                         <UserCog className="w-[18px] h-[18px]" />
                       </button>
                       <button className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-xl transition-colors" title="Edit Biodata">
                         <Edit className="w-[18px] h-[18px]" />
                       </button>
                       <button className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-colors" title="Hapus Permanen">
                         <Trash2 className="w-[18px] h-[18px]" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER: PAGINATION CONTROLS (Rule 7.6) */}
        {!isLoading && !isError && data?.meta && data.meta.total > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Menampilkan <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.data.length}</span> dari total <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.meta.total}</span> data
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Kembali
              </button>
              <div className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Hal {data.meta.current_page} / {data.meta.last_page}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(data.meta.last_page, p + 1))}
                disabled={page === data.meta.last_page}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Q: Tombol Edit/Hapus ditaruh di pojok kanan kok nggak kelihatan?

**Artinya:** Tombol aksi memang didesain secara gaib (tersembunyi).
**Solusi:** Coba gerakkan atau sorot *(Hover)* *mouse* kamu melintasi baris nama pegawai. Tombol akan secara otomatis muncul dengan efek transisi (*Opacity dari 0 ke 100*). Ini adalah *UX Pattern* tingkat premium agar tabel terlihat rapi dan tidak sumpek ketika kursor sedang diam. Jika kamu membukanya di perangkat Mobile/Touchscreen, kamu mungkin perlu menekan area kosong di tabel untuk "membagkitkan" status *hover*-nya.

### Q: Tombol "Tambah Data", "Edit", "Hapus" tidak bisa diklik / tidak ada efeknya.

**Artinya:** Iya, tombol tersebut belum ditugaskan untuk melakukan apapun.
**Solusi:** Di spesifikasi ini, kita fokus merender Tabel (*List View*). Pembuatan Form Input/Edit akan dibahas tuntas di Issue yang selanjutnya.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): data grid list view with react query pagination" \
  --body "Pembuatan modul tabel interaktif yang dilindungi Debounce Timeout dan state management caching via TanStack. Detail di docs/issues/032-frontend-employee-list.md" \
  --label "frontend,ui,module-kepegawaian"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/032-frontend-employee-list
```

### Step 3: Kerjakan

Salin kode secara presisi ke dalam folder `kepegawaian/page.tsx` yang baru kamu buat. Simpan file dan lihat perubahannya melalui *Browser* (`npm run dev`). Coba ketikkan sesuatu di kotak pencarian untuk melihat efek *Loading Skeleton*-nya.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(kepegawaian): data grid list view with react query pagination (#32)"
git push -u origin issue/032-frontend-employee-list
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): data grid list view with react query pagination (#32)" \
  --body "## Summary
Menghidupkan jantung Modul Kepegawaian dengan layar manajemen data *(Data Grid)* yang dirancang untuk skala data besar secara efisien.

## Changes
- Pembuatan \`kepegawaian/page.tsx\` terintegrasi \`useQuery\`.
- Implementasi status reaktif \`(isLoading, isError, emptyData)\`.
- Pembangunan UI Tabel bergaya korporat (*Ghost Hover Action Buttons*).
- Panel kaki *(Footer Control)* terhubung dengan \`Meta\` respons API.

## Verification
- [x] Lolos TS Compiler.
- [x] Mengetik di bar pencarian tidak memicu *Request Header* beruntun (Tahan 500ms sukses).
- [x] Status halaman *(Page State)* reset ke 1 setiap kali query pencarian berubah.

## Rules Compliance
- [x] Rule 7.6: Data tidak dirender massal, diproteksi Pagination.
- [x] Rule 7.2: \`api.get\` dipanggil via Axios instance.
- [x] Rule 7.5: Re-render tak terkendali dicegah menggunakan *Debounced State Timeout*.
- [x] Rule 5.1/5.3: Struktur \`Meta\` terbaca mulus untuk mengkalkulasi Total halaman.

Closes #32" \
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
Modul pertama kita sudah siap ditempati antarmuka fungsional. Kita membutuhkan tabel canggih tanpa *hard reload* untuk mendata ratusan pegawai BKSDA.

## Task

Kerjakan Issue #032 (Frontend — Employee List View).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/032-frontend-employee-list.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `frontend/src/app/(dashboard)/kepegawaian`.
3. Di dalamnya, buat file `page.tsx` lalu salin kode yang mengandung `useQuery` TanStack dan konfigurasi *Debounce* pada kotak pencariannya.
4. Lakukan pengecekan linter dan pastikan impor ikon Lucide tidak ada yang luput.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
