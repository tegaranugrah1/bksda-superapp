# Issue #120 — Frontend — Error & Not-Found Pages (Jaring Pengaman User)

> **Type**: `feature` / `ux`
> **Labels**: `frontend`, `ux`, `error-handling`
> **Priority**: 🟡 High (User PASTI Akan Menemui Error — Berikan Pengalaman yang Baik)
> **Complexity**: 🟢 Simple (3 File, Masing-Masing < 50 Baris)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #003 (Frontend Init)

---

## Branch

```
issue/120-frontend-error-pages
```

## Deskripsi

Setiap aplikasi **pasti** mengalami error. URL salah, server mati, atau bug kode. Tanpa halaman error yang baik, user hanya melihat **layar putih kosong** — tidak tahu apa yang terjadi dan tidak tahu harus apa.

Issue ini membuat **3 jaring pengaman** yang menangkap error di 3 level berbeda:

```
Level 1: not-found.tsx  → User ketik URL yang tidak ada     → "404 Tidak Ditemukan"
Level 2: error.tsx      → Error di SATU halaman              → "Coba Lagi"
Level 3: global-error   → Error FATAL (layout/root rusak)    → "Muat Ulang Aplikasi"
```

### Diagram: Kapan Masing-Masing Halaman Muncul?

```
User mengakses website
        │
        ├── URL tidak ada?
        │   └── ✅ not-found.tsx (404)
        │       "Halaman Tidak Ditemukan"
        │       [Kembali ke Beranda]
        │
        ├── Halaman ada, tapi ERROR di komponen?
        │   └── ✅ error.tsx (500)
        │       "Terjadi Kesalahan!"
        │       [Coba Lagi (Muat Ulang)]
        │       → Layout tetap utuh (header/footer masih terlihat)
        │
        └── ERROR di ROOT LAYOUT sendiri?
            └── ✅ global-error.tsx (Fatal)
                "Fatal Error"
                [Muat Ulang Aplikasi]
                → Satu-satunya file yang punya <html><body> sendiri
                  (karena layout utama sudah rusak!)
```

---

## Acceptance Criteria

- [ ] `app/not-found.tsx` menampilkan halaman 404 yang informatif.
- [ ] `app/error.tsx` menangkap error komponen dan menyediakan tombol "Coba Lagi".
- [ ] `app/global-error.tsx` menangkap error fatal dengan `<html>` dan `<body>` sendiri.
- [ ] Ketiga halaman memiliki desain yang konsisten dan profesional.
- [ ] Tidak ada layar putih kosong saat error terjadi.

---

## Panduan Implementasi

### File 1: `app/not-found.tsx` — Halaman 404

**Kapan muncul?** Saat user mengakses URL yang tidak ada, misalnya `/halaman-random-123`.

```tsx
"use client";

import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">

                {/* ═══ Dekorasi latar belakang (lingkaran blur) ═══ */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

                {/* ═══ Ikon peringatan ═══ */}
                <div className="relative z-10 flex justify-center mb-6">
                    <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center ring-8 ring-amber-50">
                        <AlertTriangle className="w-12 h-12" />
                    </div>
                </div>

                {/* ═══ Pesan error ═══ */}
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
                    <h2 className="text-xl font-bold text-gray-700 mb-4 uppercase tracking-widest">
                        Halaman Tidak Ditemukan
                    </h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Maaf, halaman yang Anda cari mungkin telah dipindahkan,
                        dihapus, atau memang tidak pernah ada.
                    </p>

                    {/* ═══ Tombol kembali ═══ */}
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2
                            bg-emerald-600 hover:bg-emerald-700 text-white
                            px-8 py-3 rounded-xl font-bold transition-all
                            shadow-lg shadow-emerald-200/50 hover:-translate-y-1 w-full"
                    >
                        <Home className="w-5 h-5" />
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
}
```

**Desain yang dipilih:**
- Warna **kuning/amber** → menandakan "perhatian", bukan "bahaya"
- Dekorasi blur → memberikan kesan modern, bukan error murahan
- Tombol **hijau** → mengarahkan user ke aksi positif (kembali)
- `hover:-translate-y-1` → micro-animation saat hover tombol

---

### File 2: `app/error.tsx` — Error Boundary Per Halaman

**Kapan muncul?** Saat ada bug JavaScript di SATU halaman (komponen crash). Layout (header, sidebar) tetap tampil.

```tsx
"use client"; // WAJIB "use client" — error boundary hanya bekerja di client

import { useEffect } from "react";
import { AlertOctagon, RefreshCcw } from "lucide-react";

/**
 * PROPS dari Next.js (otomatis):
 * - error: Object error yang terjadi (berisi message dan digest)
 * - reset: Fungsi untuk mencoba render ulang halaman
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {

    // Log error ke console (atau ke error reporting service seperti Sentry)
    useEffect(() => {
        console.error("Application Error:", error);
        // TODO: Kirim ke Sentry/LogRocket di production
        // Sentry.captureException(error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">

                {/* ═══ Ikon error (diputar 12° untuk kesan "rusak") ═══ */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-2xl
                        flex items-center justify-center ring-8 ring-rose-50 rotate-12">
                        <AlertOctagon className="w-10 h-10" />
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">
                        Terjadi Kesalahan!
                    </h2>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                        Sistem mendapati masalah teknis saat memproses permintaan Anda.
                        Silakan coba muat ulang halaman.
                    </p>

                    {/* ═══ Tombol reset ═══ */}
                    {/* reset() = Next.js mencoba render ulang komponen yang error */}
                    {/* Jika error sudah hilang (misal: API sudah pulih), halaman tampil normal */}
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2
                            bg-rose-600 hover:bg-rose-700 text-white
                            px-8 py-3 rounded-xl font-bold transition-all
                            shadow-lg shadow-rose-200/50 hover:-translate-y-1 w-full"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Coba Lagi (Muat Ulang)
                    </button>
                </div>
            </div>
        </div>
    );
}
```

**Perbedaan penting: `min-h-[70vh]` vs `min-h-screen`**
- `error.tsx` pakai `min-h-[70vh]` karena **layout (header/footer) MASIH ADA** — cukup isi area konten
- `not-found.tsx` pakai `min-h-screen` karena **tidak ada layout** di sekitarnya

---

### File 3: `app/global-error.tsx` — Error Fatal (Layout Rusak)

**Kapan muncul?** Saat error terjadi di `layout.tsx` root — layout sendiri yang crash. Karena layout rusak, file ini **harus punya `<html>` dan `<body>` sendiri**.

```tsx
"use client";

import { AlertOctagon, RefreshCcw } from "lucide-react";

/**
 * PENTING: File ini HARUS punya <html> dan <body>!
 *
 * MENGAPA?
 * - Saat error terjadi di layout.tsx, layout TIDAK bisa merender.
 * - Tanpa layout → tidak ada <html><body> → halaman kosong.
 * - global-error.tsx menyediakan <html><body> sendiri sebagai fallback.
 *
 * INI SATU-SATUNYA FILE DI APP ROUTER YANG PUNYA <html> SELAIN layout.tsx!
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="id">
            <body>
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
                    <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">

                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-2xl
                                flex items-center justify-center ring-8 ring-rose-50">
                                <AlertOctagon className="w-10 h-10" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">
                                Fatal Error
                            </h2>
                            <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                                Terjadi kesalahan sistem yang kritis.
                                Tim teknis kami telah mencatat masalah ini.
                            </p>

                            {/* Tombol gelap (abu-abu) → kesan "serius/kritis" */}
                            <button
                                onClick={() => reset()}
                                className="inline-flex items-center justify-center gap-2
                                    bg-gray-900 hover:bg-black text-white
                                    px-8 py-3 rounded-xl font-bold transition-all
                                    shadow-lg hover:-translate-y-1 w-full"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                Muat Ulang Aplikasi
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
```

---

## Perbandingan 3 Halaman Error

| Aspek | `not-found.tsx` | `error.tsx` | `global-error.tsx` |
|-------|----------------|------------|-------------------|
| **Kapan muncul** | URL tidak ada | Komponen crash | Layout root crash |
| **HTTP Status** | 404 | 500 | 500 |
| **Layout sekitar** | Tidak ada | ✅ Ada (header/footer) | ❌ Tidak ada |
| **Punya `<html>`?** | ❌ Tidak | ❌ Tidak | ✅ **Ya (wajib!)** |
| **Tinggi** | `min-h-screen` | `min-h-[70vh]` | `min-h-screen` |
| **Warna ikon** | 🟡 Amber (peringatan) | 🔴 Rose (error) | 🔴 Rose (fatal) |
| **Warna tombol** | 🟢 Emerald (positif) | 🔴 Rose (coba lagi) | ⚫ Hitam (serius) |
| **Teks tombol** | "Kembali ke Beranda" | "Coba Lagi" | "Muat Ulang Aplikasi" |
| **Aksi tombol** | `<Link href="/">` | `reset()` | `reset()` |

### Desain yang Konsisten tapi Berbeda Pesan:

```
┌─ 404 ──────────────┐  ┌─ Error ───────────────┐  ┌─ Fatal ──────────────┐
│      🔺 (amber)     │  │     🛑 (rose, miring) │  │     🛑 (rose)        │
│                     │  │                       │  │                      │
│       404           │  │  Terjadi Kesalahan!   │  │   Fatal Error        │
│ Halaman Tidak       │  │                       │  │                      │
│   Ditemukan         │  │  Sistem mendapati     │  │  Terjadi kesalahan   │
│                     │  │  masalah teknis...    │  │  sistem yang kritis  │
│ ┌─────────────────┐ │  │ ┌───────────────────┐ │  │ ┌──────────────────┐ │
│ │ 🟢 Ke Beranda   │ │  │ │ 🔴 Coba Lagi     │ │  │ │ ⚫ Muat Ulang    │ │
│ └─────────────────┘ │  │ └───────────────────┘ │  │ └──────────────────┘ │
└─────────────────────┘  └───────────────────────┘  └──────────────────────┘
  Nada: "Santai"           Nada: "Ada masalah"       Nada: "Kritis"
```

---

## Troubleshooting

### Q: Error page tidak muncul — malah layar putih!

**Checklist:**
1. ✅ File `error.tsx` ada di level `app/` (root)?
2. ✅ File memiliki `"use client"` di baris pertama?
3. ✅ File meng-export `default function`?
4. ✅ Sudah restart dev server?

### Q: `error.tsx` menangkap error, tapi `global-error.tsx` tidak pernah muncul!

**Penjelasan:** `global-error.tsx` hanya muncul jika `layout.tsx` ROOT crash. Ini **sangat jarang** terjadi. Dalam development, error di layout biasanya ditangkap oleh Next.js error overlay (pop-up merah).

### Q: Saya mau menambahkan error page per modul (misalnya `cms/error.tsx`)!

**Boleh!** Next.js App Router mendukung error boundary bertingkat:
```
app/
├── error.tsx          ← Jaring pengaman UTAMA
├── cms/
│   ├── error.tsx      ← Jaring pengaman CMS (lebih spesifik)
│   └── page.tsx
```
Error di CMS ditangkap oleh `cms/error.tsx` dulu. Jika tidak ada, naik ke `app/error.tsx`.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(ux): create error boundary pages — not-found, error, and global-error" --body "Closes #120" --label "frontend,ux,error-handling"
git checkout -b issue/120-frontend-error-pages
# Buat 3 file: not-found.tsx, error.tsx, global-error.tsx
git commit -m "feat(ux): add 404, error boundary, and global error pages (#120)"
git push -u origin issue/120-frontend-error-pages
gh pr create --title "feat(ux): error & not-found pages (#120)" --body "## Changes
- not-found.tsx: Halaman 404 dengan desain amber + tombol kembali ke beranda.
- error.tsx: Error boundary per halaman (layout tetap utuh) + tombol reset.
- global-error.tsx: Error fatal dengan <html><body> sendiri.
- 3 level warna: amber (404), rose (error), hitam (fatal).
Closes #120" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\frontend\src\app\ (not-found.tsx, error.tsx, global-error.tsx)
3 file error handling Next.js App Router — jaring pengaman agar user tidak melihat layar putih.

## Task

Kerjakan Issue #120 (Frontend — Error & Not-Found Pages).
Ikuti instruksi di: `docs/issues/120-frontend-error-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `frontend/src/app/not-found.tsx` (halaman 404).
3. Buat `frontend/src/app/error.tsx` (error boundary halaman).
4. Buat `frontend/src/app/global-error.tsx` (error fatal).
5. KRUSIAL: Semua file WAJIB "use client" di baris pertama!
6. KRUSIAL: HANYA global-error.tsx yang boleh punya <html><body>!
7. Test: akses URL random → harus lihat halaman 404 (bukan layar putih).
8. Lakukan Git push dan `gh pr create`.
````
