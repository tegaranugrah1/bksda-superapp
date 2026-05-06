# Issue #031 — Frontend — Portal Page (Module Hub)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `page`
> **Priority**: 🔴 Critical (Halaman pertama yang dilihat setelah Login)
> **Complexity**: 🟡 Medium (UI Grid interaktif + Filter Akses)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #028 (Admin Layout)

---

## Branch

```
issue/031-frontend-portal-page
```

## Deskripsi

Setelah *Layout* Utama berdiri, saat ini URL beranda (`/`) kita masih kosong atau mungkin berisi halaman bawaan Next.js yang standar. Di sistem BKSDA yang memuat banyak modul (Monorepo), halaman Beranda tidak boleh langsung menampilkan tabel data pegawai. Beranda harus bertindak sebagai **"Stasiun Transit" (Portal Hub)** layaknya halaman beranda *Google Workspace* atau *Microsoft 365*.

Kita akan mendesain sebuah sistem **Kartu (Grid Cards)** yang memamerkan seluruh aplikasi modul yang dimiliki instansi. Namun ingat, kita terikat oleh **Rule 2.1**. Setiap kartu modul akan dievaluasi (di-*filter*) secara ajaib. Kartu yang bukan merupakan Hak Akses dari pegawai yang sedang *login* akan dihilangkan dari pandangan.

Jika ternyata Pegawai tersebut sama sekali belum diberikan Hak Akses apapun oleh Admin, portal akan menampilkan status *Peringatan Kosong* (Empty State) yang indah dan informatif.

---

## Acceptance Criteria

- [ ] File bawaan `src/app/page.tsx` dihapus dan dipindahkan menjadi `src/app/(dashboard)/page.tsx` (Agar terlindungi oleh `<RouteGuard>` dan *Layout* admin).
- [ ] Tersedia Grid Kartu (Cards) yang menggunakan gaya Premium *Glassmorphism*.
- [ ] Kartu menampilkan efek mikro-animasi: Ikon membesar (`scale-110`), miring sedikit (`rotate-3`), dan muncul tanda panah (`ArrowRight`) saat disorot kursor (Hover).
- [ ] Konfigurasi array Modul terbaca dan tersaring berdasarkan identitas bawaan di dalam *Hook* `useAuth`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Di dalam arsitektur Next.js, folder yang menggunakan tanda kurung seperti `(dashboard)` disebut **Route Group**. Folder ini tidak mengubah URL (URL akan tetap `/`), melainkan digunakan untuk mengelompokkan file agar mengikuti *Layout* dari folder tersebut.

### Langkah 1: Rapikan Folder Root

**Kenapa?** Jika ada dua file `page.tsx` (satu di `app/page.tsx` dan satu di `app/(dashboard)/page.tsx`), server Next.js akan bingung (Error 500 Route Conflict).

1. Buka folder `e:\bksda-superapp\frontend\src\app\`.
2. Jika ada file bernama `page.tsx`, **HAPUS** file tersebut. (Tenang saja, itu hanya file perkenalan Next.js).

---

### Langkah 2: Rancang Halaman Portal Beranda

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\page.tsx`

**Buat file baru tersebut, dan salin kode ajaib di bawah ini:**

```tsx
"use client";

import Link from "next/link";
import { Users, Box, Archive, FileText, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// KAMUS MODUL (Konfigurasi Data Kartu)
const MODULES = [
  { 
    id: "kepegawaian", 
    name: "Kepegawaian & SDM", 
    desc: "Kelola data master pegawai, struktural instansi, dan manajemen akses.", 
    icon: Users, 
    path: "/kepegawaian", 
    color: "text-blue-500 dark:text-blue-400", 
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    gradient: "from-blue-500/20 to-transparent"
  },
  { 
    id: "bmn", 
    name: "Aset BMN", 
    desc: "Sistem inventarisasi barang milik negara, mutasi, dan pencatatan kondisi.", 
    icon: Box, 
    path: "/bmn", 
    color: "text-amber-500 dark:text-amber-400", 
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    gradient: "from-amber-500/20 to-transparent"
  },
  { 
    id: "inventory", 
    name: "Gudang Logistik", 
    desc: "Pemantauan stok barang habis pakai, permintaan ATK, dan riwayat transaksi.", 
    icon: Archive, 
    path: "/inventory", 
    color: "text-emerald-500 dark:text-emerald-400", 
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    gradient: "from-emerald-500/20 to-transparent"
  },
  { 
    id: "dereporting", 
    name: "E-Reporting", 
    desc: "Fasilitas pelaporan lalu lintas satwa dan pos penjagaan eksternal secara digital.", 
    icon: FileText, 
    path: "/dereporting", 
    color: "text-purple-500 dark:text-purple-400", 
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    gradient: "from-purple-500/20 to-transparent"
  },
];

export default function PortalPage() {
  const { user } = useAuth(); // Panggil intelijen keamanan kita

  // PENYARINGAN KETAT (Rule 2.1 & 2.3)
  const availableModules = MODULES.filter((m) => {
    if (user?.role === "super_admin") return true; // Bypass Super Admin
    return user?.access_modules?.includes(m.id);   // Pengecekan Izin Biasa
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      
      {/* BAGIAN KEPALA (Header Greeting) */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Portal Aplikasi Terpadu
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          Selamat datang kembali, <span className="font-bold text-emerald-600 dark:text-emerald-400">{user?.name}</span>. Silakan pilih ruang kerja (modul) Anda hari ini.
        </p>
      </div>

      {/* JIKA IZIN KOSONG (Empty State Warning) */}
      {availableModules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 flex flex-col items-center justify-center text-center bg-zinc-50/50 dark:bg-zinc-900/50 animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Pintu Terkunci</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
            Akun Anda saat ini tidak memiliki izin untuk membuka modul manapun. Harap menghubungi Administrator Pusat untuk penetapan akses.
          </p>
        </div>
      ) : (

        /* GRID DAFTAR MODUL (Kartu Interaktif Premium) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableModules.map((mod, idx) => {
            const Icon = mod.icon;
            
            return (
              <Link 
                key={mod.id} 
                href={mod.path}
                // Animasi bertahap (Staggered fade-in) dihitung dari Index
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-7 hover:shadow-2xl hover:shadow-emerald-900/5 dark:hover:shadow-black/50 hover:-translate-y-1.5 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-6"
                style={{ animationDelay: `${idx * 150}ms`, animationFillMode: "both" }}
              >
                {/* Efek Sinar Mentari / Gradasi Tembus Pandang di Latar Belakang */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                
                <div className="relative z-10 flex flex-col h-full">
                  
                  {/* BARIS IKON & PANAH */}
                  <div className="flex items-center justify-between mb-5">
                    {/* Kotak Ikon Utama */}
                    <div className={`w-14 h-14 rounded-2xl ${mod.bg} border border-white/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm`}>
                      <Icon className={`w-7 h-7 ${mod.color}`} />
                    </div>
                    {/* Lingkaran Panah Kanan (Hanya muncul saat di-hover) */}
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 -translate-x-6 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
                      <ArrowRight className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                    </div>
                  </div>
                  
                  {/* TEKS JUDUL & DESKRIPSI */}
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                    {mod.name}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                    {mod.desc}
                  </p>
                  
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Troubleshooting

### Q: Muncul Error "Multiple root layouts found" atau "Conflicting Pages".

**Artinya:** Kamu lupa menghapus file `page.tsx` lama.
**Solusi:** Kembalilah ke Langkah 1. Cari `frontend/src/app/page.tsx` dan hapus *(Delete)* file tersebut. Pastikan yang tersisa hanya `frontend/src/app/(dashboard)/page.tsx`.

### Q: Apa fungsi kode `animationDelay: ${idx * 150}ms`?

**Artinya:** Ini adalah trik rahasia antarmuka Premium.
**Solusi:** Jika ada 4 modul, memunculkannya secara bersamaan akan terlihat kaku. Kode tersebut memastikan Modul ke-2 terlambat muncul 150 milidetik, Modul ke-3 terlambat 300 ms, dst. Efeknya, kartu-kartu akan melompat masuk satu-persatu berurutan layaknya efek anak tangga (Staggered Animation).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend portal hub page" \
  --body "Desain ulang rute root (/) menjadi Dashboard Portal dengan efek Grid Glassmorphism berbasis otorisasi modul IAM. Detail di docs/issues/031-frontend-portal-page.md" \
  --label "frontend,ui,page"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/031-frontend-portal-page
```

### Step 3: Kerjakan

Lakukan pembersihan file lama dan letakkan kode halaman Portal yang baru di dalam kelompok proteksi `(dashboard)`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend portal hub page (#31)"
git push -u origin issue/031-frontend-portal-page
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend portal hub page (#31)" \
  --body "## Summary
Menyajikan halaman pendaratan (Landing Page internal) bagi pegawai pasca-Login untuk menuju departemen tugasnya masing-masing.

## Changes
- Pemindahan \`app/page.tsx\` menjadi \`app/(dashboard)/page.tsx\` agar diwarisi oleh \`RouteGuard\`.
- Desain grid interaktif *Staggered Animation*.
- Status penolakan *Empty State* ketika user memiliki akses \`null\`.

## Verification
- [x] Lolos TS Compiler.
- [x] Efek *Hover Gradient* berjalan mulus di mode terang dan mode gelap.
- [x] Rute index \`/\` terproteksi dengan aman tanpa membocorkan tautan Modul yang tidak diotorisasi.

## Rules Compliance
- [x] Mendukung Rule 2.1 dengan melakukan *filtering* pada konfigurasi kartu.
- [x] *Web App Design Aesthetics* diterapkan maksimal (*Scale*, *Rotate*, *Translate* mikromotion).

Closes #31" \
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
Beranda aplikasi kita saat ini kosong atau masih memunculkan bawaan Next.js. Kita akan mengubahnya menjadi Pusat Stasiun (Portal) menuju modul-modul BKSDA.

## Task

Kerjakan Issue #031 (Frontend — Portal Page).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/031-frontend-portal-page.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Hapus file `frontend/src/app/page.tsx` (yang lama).
3. Buat file baru di dalam `frontend/src/app/(dashboard)/page.tsx`.
4. Salin kode Portal Beranda yang berisi konfigurasi Grid Cards dan perlindungan IAM *Filter*.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
