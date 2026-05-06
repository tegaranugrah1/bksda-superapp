# Issue #005 — Frontend — Next.js 16 Scaffold

> **Type**: `chore`
> **Labels**: `setup`, `frontend`
> **Priority**: 🔴 Critical (semua frontend issue bergantung pada ini)
> **Complexity**: 🟡 Medium (scaffold + config tailwind 4 + folder structure)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro — perlu ketelitian konfigurasi Next.js
> **Dependencies**: Issue #001 dan #002 harus sudah merged

---

## Branch

```
issue/005-frontend-nextjs-scaffold
```

## Deskripsi

Scaffold project Next.js 16 di folder `frontend/`. Frontend ini akan berfungsi sebagai website public (CMS) sekaligus dashboard internal (SuperApp).

**Apa yang dilakukan:**
1. Scaffold Next.js 16 (App Router, TypeScript, strict mode)
2. Setup **Tailwind CSS 4** (bukan v3)
3. Setup **shadcn/ui** default configuration
4. Setup folder structure sesuai clean architecture (`src/hooks`, `src/types`, dll)
5. Implementasi rules: `loading.tsx` wajib (Rule 7.9), route group `(website)` (Rule 7.12)
6. Setup `next.config.ts` untuk Supabase & localhost images (Rule 7.10)
7. Buat file `.env.local.example`

**Apa yang TIDAK dilakukan:**
- ❌ Tidak membuat halaman login (itu Issue terpisah)
- ❌ Tidak setup Redux/Zustand (kita akan pakai React Query & Context API nanti)
- ❌ Tidak fetch API backend (hanya scaffold)

---

## Apa yang Sudah Ada (dari Issue Sebelumnya)

```
e:\bksda-superapp\
├── backend/            ← Laravel 12 (sudah ready)
└── frontend/
    ├── .gitignore      ← harus dipertahankan
    └── .gitkeep        ← akan dihapus setelah scaffold
```

---

## Acceptance Criteria

- [ ] Next.js 16 terinstall di `frontend/`
- [ ] TypeScript strict mode aktif
- [ ] Tailwind CSS versi 4 aktif (bisa dicek di `package.json`)
- [ ] Folder `src/components`, `src/hooks`, `src/lib`, `src/types` tersedia
- [ ] Folder `src/app/(website)` ada (untuk halaman public)
- [ ] File `src/app/loading.tsx` tersedia (sesuai Rule 7.9)
- [ ] `next.config.ts` sudah dikonfigurasi untuk `remotePatterns` Supabase & localhost
- [ ] File `.env.local.example` dibuat dengan `NEXT_PUBLIC_API_URL`
- [ ] `npm run dev` berjalan tanpa error di `localhost:3000`
- [ ] `npm run build` berjalan sukses tanpa TypeScript/ESLint error

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Perhatikan peringatan dan catatan di tiap langkah.

### Langkah 1: Scaffold Next.js 16

**Kenapa?** Next.js 16 dengan App Router adalah framework utama kita. Kita pakai flag `--use-npm` agar konsisten, `--src-dir` agar rapi, dan alias `@/*` untuk import yang lebih bersih.

```bash
cd e:\bksda-superapp

# Backup .gitignore frontend agar tidak ter-overwrite/bentrok
copy frontend\.gitignore .gitignore-frontend-bak
del frontend\.gitignore
del frontend\.gitkeep

# Scaffold Next.js 16 (pilih TypeScript, ESLint, Tailwind, App Router, src/ dir, App router, alias @/*)
npx create-next-app@16.1.6 frontend --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm

# Restore .gitignore khusus project kita
copy /Y .gitignore-frontend-bak frontend\.gitignore
del .gitignore-frontend-bak
```

**Apa yang terjadi:**
- `npx` mendownload versi spesifik `create-next-app` dan menjalankan generator
- Folder `frontend/` terisi dengan instalasi Next.js + React 19
- `package.json`, `tsconfig.json`, dan file konfigurasi standar otomatis dibuat

**Kalau error:**
- `npm ERR! code ENOTEMPTY`: Pastikan folder `frontend` kosong (hapus `.gitignore` dan `.gitkeep` sementara sebelum scaffold, seperti di script atas).
- `npx: command not found`: Pastikan Node.js terinstall. Download dari nodejs.org.

---

### Langkah 2: Setup Tailwind CSS 4

**Kenapa?** Tailwind CSS 4 menggunakan engine baru yang lebih cepat dan tidak lagi bergantung pada `tailwind.config.ts` yang ribet.

```bash
cd e:\bksda-superapp\frontend

# Install Tailwind v4 dan PostCSS plugin-nya
npm install tailwindcss@^4 @tailwindcss/postcss@^4
```

**Edit `postcss.config.mjs`:** (Atau buat file ini jika tidak ada)

```javascript
/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Edit `src/app/globals.css`:**
Ganti SELURUH isinya menjadi:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* Base custom layer untuk shadcn nanti */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Apa yang terjadi:**
- `tailwind.config.ts` bisa dihapus nanti saat setup selesai, karena Tailwind 4 berbasis `@import "tailwindcss"`.
- Setup dasar untuk design system disiapkan.

---

### Langkah 3: Inisialisasi shadcn/ui

**Kenapa?** Project lama menggunakan komponen shadcn/ui (radix-ui + tailwind) untuk UI yang rapi dan konsisten tanpa lock-in component library.

```bash
cd e:\bksda-superapp\frontend

# Jalankan init shadcn
npx shadcn@latest init -y
```

**Apa yang terjadi:**
- shadcn akan menambahkan file `components.json` dan folder `src/components/ui`.
- Ia juga menginstal dependencies pendukung seperti `clsx`, `tailwind-merge`, `lucide-react`.

---

### Langkah 4: Setup Folder Structure & `loading.tsx`

**Kenapa?** Sesuai Rule 7.12 (CMS pages di route group) dan Rule 7.9 (Setiap route wajib punya `loading.tsx`).

```powershell
cd e:\bksda-superapp\frontend

# Buat folder utility
New-Item -ItemType Directory -Path "src\hooks" -Force
New-Item -ItemType Directory -Path "src\types" -Force

# Buat route group (website) untuk public CMS pages
New-Item -ItemType Directory -Path "src\app\(website)" -Force
```

**Buat file `src/app/loading.tsx`:**

```tsx
/**
 * Global Loading State (Rule 7.9)
 * Ditampilkan Next.js secara otomatis selama proses rendering/fetching page.
 */
import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Memuat aplikasi...
        </p>
      </div>
    </div>
  );
}
```

---

### Langkah 5: Setup `next.config.ts`

**Kenapa?** Sesuai Rule 7.10, kita menggunakan `<Image>` dari `next/image`. Next.js perlu tahu domain mana saja yang diizinkan untuk memuat gambar demi keamanan (Supabase & backend lokal).

**Path:** `e:\bksda-superapp\frontend\next.config.ts`

**Ganti isi seluruhnya:**

```typescript
import type { NextConfig } from "next";

/**
 * Konfigurasi Next.js
 * 
 * - removeConsole: otomatis hapus console.log di production
 * - images.remotePatterns: whitelist domain untuk <Image> (Rule 7.10)
 */
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    unoptimized: true, // Sering dibutuhkan jika export statis atau kendala memory Vercel
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'bksdakaltim.ksdae.kehutanan.go.id',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

### Langkah 6: Setup `.env.local.example`

**Kenapa?** Developer butuh template environment variables. File `.env.local` di-ignore oleh git, jadi kita simpan template di `.example`.

**Path:** `e:\bksda-superapp\frontend\.env.local.example`

```env
# =============================================================================
# BKSDA SuperApp — Frontend Environment
# =============================================================================
# Copy file ini ke .env.local: cp .env.local.example .env.local
# =============================================================================

# URL API Backend Laravel (Local)
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Base URL Aplikasi Frontend (Local)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opsional: Jika menggunakan NextAuth/Auth.js nantinya
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=generate_rahasia_disini
```

Setelah file dibuat, jalankan:
```bash
copy .env.local.example .env.local
```

---

### Langkah 7: Cleanup & Verifikasi

**Hapus file lama (jika Tailwind v3 config masih ada akibat generator lama):**
```bash
cd e:\bksda-superapp\frontend
Remove-Item -Force tailwind.config.ts -ErrorAction SilentlyContinue
```

**Verifikasi 1: Linter & Types**
```bash
npm run lint
# ✅ Expected: No ESLint warnings/errors (sesuai Rule 9.10)
```

**Verifikasi 2: Local Server**
```bash
npm run dev
```
Buka browser ke `http://localhost:3000`. Pastikan halaman Next.js default muncul tanpa error. Tekan `Ctrl+C` untuk mematikan.

**Verifikasi 3: Build Test**
```bash
npm run build
# ✅ Expected: Build sukses, tidak ada Type errors
```

---

## Troubleshooting

### Q: `npm run dev` muncul error `Port 3000 is already in use`

**Artinya:** Ada program lain atau server React lama yang masih berjalan di port 3000.

**Solusi:** 
Cari proses Node.js yang berjalan dan hentikan (kill), atau jalankan server di port lain:
`npm run dev -- -p 3001`

### Q: `Error: The Next.js image optimization is failing` (saat pakai `next/image`)

**Artinya:** Domain gambar yang coba dimuat belum terdaftar di `next.config.ts`.

**Solusi:** 
Tambahkan hostname domain tersebut ke dalam array `images.remotePatterns` di file `next.config.ts`. (Sesuai Rule 7.10)

### Q: Error dari shadcn/ui "Cannot find module 'tailwindcss'"

**Artinya:** Konflik versi karena kita mengupgrade ke Tailwind v4.

**Solusi:**
Pastikan `globals.css` menggunakan syntax `@import "tailwindcss";` dan tidak ada dependensi tertinggal ke file `tailwind.config.ts` jika kamu menggunakan instalasi Tailwind 4 murni. Jika build masih gagal, kamu mungkin perlu mengizinkan plugin tambahan di postcss.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: scaffold Next.js 16 frontend" \
  --body "Setup Next.js 16, Tailwind CSS 4, shadcn/ui, strict TypeScript, rules integration. Detail di docs/issues/005-frontend-nextjs-scaffold.md" \
  --label "setup,frontend"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/005-frontend-nextjs-scaffold
```

### Step 3: Kerjakan

Ikuti Langkah 1-7 di atas.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "chore: scaffold Next.js 16 frontend (#5)"
git push -u origin issue/005-frontend-nextjs-scaffold
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: scaffold Next.js 16 frontend (#5)" \
  --body "## Summary
Scaffold frontend Next.js 16 dengan standar strict architecture.

## Changes
- Next.js 16 App Router scaffolded
- Tailwind CSS 4 + PostCSS setup
- shadcn/ui initialized
- Route group \`(website)\` dibuat untuk public CMS pages
- \`loading.tsx\` global state ditambahkan
- \`next.config.ts\` diatur untuk image domains

## Verification
- [x] \`npm run lint\` passed
- [x] \`npm run build\` passed
- [x] \`npm run dev\` bisa dibuka tanpa error

## Rules Compliance
- [x] Rule 7.9: Setiap route wajib loading.tsx
- [x] Rule 7.10: Remote patterns <Image> siap
- [x] Rule 7.12: Route (website) disiapkan
- [x] Rule 9.10: ESLint wajib

Closes #5" \
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
Issue backend (#001 - #004) sudah spesifikasinya.
Sekarang masuk ke setup Frontend.

## Task

Kerjakan Issue #005 (Frontend — Next.js 16 Scaffold).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/005-frontend-nextjs-scaffold.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan buat branch git.
2. Scaffold dengan `npx create-next-app@16.1.6` (ingat trick `.gitignore` backup agar tidak bentrok).
3. Update Tailwind ke v4 dan sesuaikan `postcss.config.mjs` & `globals.css`.
4. Inisialisasi shadcn/ui (`npx shadcn@latest init -y`).
5. Buat struktur folder (`src/hooks`, `src/types`, `src/app/(website)`).
6. Buat file `src/app/loading.tsx`.
7. Ganti konfigurasi `next.config.ts`.
8. Buat file `.env.local.example` dan copy ke `.env.local`.
9. Verifikasi `npm run lint` dan `npm run build`.
10. Lakukan Git push dan `gh pr create` sesuai instruksi di markdown.

### Rules yang berlaku:
- Harus TypeScript strict mode (tidak ada `any` sesuai Rule 7.7).
- Patuhi konvensi penamaan (Rule 9.5).
- Frontend WAJIB berjalan lokal, tidak dimasukkan ke Docker Compose.
````
