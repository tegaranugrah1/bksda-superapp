# Issue #006 — Frontend — Design System & Theme

> **Type**: `feature`
> **Labels**: `frontend`, `design`, `setup`
> **Priority**: 🔴 Critical (komponen UI lain bergantung pada design system ini)
> **Complexity**: 🟡 Medium (integrasi fonts, CSS variables Tailwind 4, dan next-themes)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #005 (Frontend scaffold) harus sudah merged

---

## Branch

```
issue/006-frontend-design-system
```

## Deskripsi

Mengonfigurasi fondasi *Design System* aplikasi BKSDA SuperApp agar terlihat premium, dinamis, dan mendukung Dark Mode. Semua warna, font, dan animasi harus terpusat di `globals.css` menggunakan fitur baru Tailwind CSS 4 (`@theme`).

**Apa yang dilakukan:**
1. Setup Typography modern: **Geist Sans** (default UI) dan **Public Sans** (heading/content).
2. Setup `globals.css` dengan token warna HSL (shadcn/ui style) untuk Light & Dark mode.
3. Install dan konfigurasikan `next-themes` untuk toggle Dark Mode.
4. Implementasi `ThemeProvider` di `src/app/layout.tsx`.
5. Menambahkan utilitas animasi modern (Tailwind v4 style).

**Apa yang TIDAK dilakukan:**
- ❌ Tidak membangun UI komponen (tombol, card, form). Itu issue terpisah.
- ❌ Tidak mendesain halaman. Hanya setup fondasinya (Global CSS & Layout Provider).

---

## Apa yang Sudah Ada (dari Issue Sebelumnya)

```
e:\bksda-superapp\frontend\
├── src/
│   ├── app/
│   │   ├── globals.css     ← Masih bawaan Next.js default (akan diubah)
│   │   └── layout.tsx      ← Masih bawaan Next.js default (akan diubah)
│   └── components/         ← Sudah disiapkan oleh Issue 005
├── package.json            ← Tailwind 4 & Next.js sudah terinstall
```

---

## Acceptance Criteria

- [ ] File `globals.css` menggunakan format Tailwind 4 (`@import "tailwindcss";`) dengan custom theme variables.
- [ ] Font Geist dan Public Sans termuat dan teraplikasikan di `layout.tsx`.
- [ ] Package `next-themes` terinstall dan file `src/components/theme-provider.tsx` terbuat.
- [ ] `RootLayout` di `layout.tsx` telah dibungkus oleh `<ThemeProvider>`.
- [ ] Dark mode bisa di-toggle tanpa ada "hydration mismatch" warning.
- [ ] Tampilan halaman web menggunakan warna background/foreground yang sesuai design system.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Jangan skip. Copy-paste kode secara teliti.

### Langkah 1: Install `next-themes`

**Kenapa?** Next.js merender HTML di server (SSR), sementara "preferensi dark mode" ada di browser pengguna. Tanpa `next-themes`, layar bisa berkedip putih sebelum berubah gelap (FOUC). Package ini mengatasinya dengan aman.

```bash
cd e:\bksda-superapp\frontend

npm install next-themes
```

**Apa yang terjadi:**
- Package `next-themes` ditambahkan ke `package.json`.

---

### Langkah 2: Buat Theme Provider

**Kenapa?** Server Components Next.js tidak bisa memakai React Context (`useState`/`useEffect`). Provider untuk tema harus menjadi "Client Component" (menggunakan `"use client"`). Kita buat file terpisah untuk membungkus children.

**Path:** `e:\bksda-superapp\frontend\src\components\theme-provider.tsx`

**Buat file dengan isi:**

```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * ThemeProvider membungkus aplikasi agar bisa switch Light/Dark mode.
 * Wajib menggunakan "use client" karena mengakses browser API.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

---

### Langkah 3: Konfigurasi `globals.css` & Token HSL

**Kenapa?** Agar UI terasa premium, kita tidak mem-hardcode warna (seperti `bg-blue-500`). Kita membuat variabel warna (contoh: `--primary`) yang nilainya berubah otomatis saat pindah Dark Mode. Fitur Tailwind 4 menggunakan `@theme` untuk ini.

**Path:** `e:\bksda-superapp\frontend\src\app\globals.css`

**Ganti seluruh isi file menjadi:**

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme {
  /* Mapping Font ke Tailwind Classes */
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
  --font-public: var(--font-public-sans), ui-sans-serif, system-ui, sans-serif;

  /* Mapping CSS Variables ke Tailwind Color Utility */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  /* Setup Default Border Radius (shadcn style) */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  
  /* Animasi Dinamis Premium */
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;

  @keyframes accordion-down {
    from { height: 0; }
    to { height: var(--radix-accordion-content-height); }
  }
  @keyframes accordion-up {
    from { height: var(--radix-accordion-content-height); }
    to { height: 0; }
  }
}

/* 
 * Light Mode & Base Variables 
 * Format warna HSL (Hue, Saturation, Lightness)
 */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    /* Primary: Emerald/Green Forestry Theme */
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 142.1 76.2% 36.3%;
    --radius: 0.5rem;
  }

  /* Dark Mode Variables */
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    
    /* Primary: Emerald/Green Dark Theme */
    --primary: 142.1 70.6% 45.3%;
    --primary-foreground: 144.9 80.4% 10%;
    
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 142.1 70.6% 45.3%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased selection:bg-primary/20;
  }
}
```

**Penjelasan Warna Utama:**
Warna `--primary` diset ke tema **Emerald/Green Forestry** (HSL: `142.1 76.2% 36.3%`) agar selaras dengan identitas BKSDA Kaltim (Lingkungan/Kehutanan).

---

### Langkah 4: Setup Fonts di `layout.tsx`

**Kenapa?** Kita menggunakan **Geist** sebagai font interface standar, dan **Public Sans** (opsional) untuk teks panjang/heading agar UI terlihat rapi. Kita inject font CSS variables ini ke tag `<body>` sekaligus memasang `<ThemeProvider>`.

**Path:** `e:\bksda-superapp\frontend\src\app\layout.tsx`

**Ganti seluruh isi file menjadi:**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Public_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Setup Geist Sans
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Setup Geist Mono
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Setup Public Sans untuk kebutuhan Heading atau Text tebal
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BKSDA SuperApp",
  description: "Sistem Terpadu BKSDA Kalimantan Timur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning wajib ditambahkan saat pakai next-themes
    <html lang="id" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${publicSans.variable} 
          font-sans antialiased min-h-screen
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Apa yang terjadi:**
- `suppressHydrationWarning`: Mencegah error di console karena saat render di server, tema (dark/light) belum diketahui secara pasti sebelum script di browser berjalan.
- Semua konten aplikasi (`children`) kini dibungkus sistem yang bisa membaca tema (`bg-background` akan berubah otomatis jika masuk dark mode).

---

### Langkah 5: Verifikasi Setup

1. **Jalankan Server Development:**
   ```bash
   cd e:\bksda-superapp\frontend
   npm run dev
   ```
2. **Buka Browser:** Kunjungi `http://localhost:3000`
3. **Cek Tampilan:** Background halaman tidak lagi putih polos terang menyilaukan mata jika sistem komputermu sedang menggunakan mode Dark, atau warnanya rapi mengikuti default sistem. Font yang muncul haruslah "Geist" (bisa dicek lewat inspect element / font finder browser).

---

## Troubleshooting

### Q: Muncul Error "Hydration failed because the initial UI does not match what was rendered on the server."

**Artinya:** Render tema server dan client tidak sinkron.
**Solusi:** Pastikan tag `<html>` di `layout.tsx` memiliki prop `suppressHydrationWarning`. Ini HANYA boleh ada di `<html>` dan memang diizinkan oleh Next.js untuk mencegah error tema.

### Q: Font Public Sans / Geist gagal diunduh atau Timeout

**Artinya:** Google Fonts diblokir oleh jaringan atau koneksi sedang tidak stabil.
**Solusi:** Restart `npm run dev`. Next.js otomatis akan mencoba mendownload font lokal di background dan membuat *cache*. Pastikan terkoneksi internet lancar di start pertama.

### Q: `bg-primary` atau `text-primary` tidak menghasilkan warna hijau

**Artinya:** Tailwind CSS v4 tidak bisa membaca `@theme` di `globals.css`.
**Solusi:** Pastikan format di `globals.css` sama persis, khususnya bagian `hsl(var(--primary))` dan definisi `--primary` di dalam blok `@layer base`. Coba restart development server.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend design system and theme provider" \
  --body "Setup globals.css, theme tokens (Tailwind v4), next-themes, dan Geist fonts. Detail di docs/issues/006-frontend-design-system.md" \
  --label "setup,frontend,design"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/006-frontend-design-system
```

### Step 3: Kerjakan

Ikuti Langkah 1-5 di atas secara teliti.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend design system and theme provider (#6)"
git push -u origin issue/006-frontend-design-system
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend design system and theme provider (#6)" \
  --body "## Summary
Mengonfigurasi Design System dasar untuk Frontend agar mendukung UI modern dan Dark Mode.

## Changes
- Diinstall \`next-themes\` untuk toggle dark mode
- Dibuat komponen \`ThemeProvider\`
- \`layout.tsx\` dikonfigurasi dengan font (Geist & Public Sans)
- \`globals.css\` direfactor ke Tailwind 4 format dengan CSS variables HSL (Tema BKSDA Forestry/Emerald)
- Integrasi \`suppressHydrationWarning\` pada root html

## Verification
- [x] Background aplikasi mengikuti system default (light/dark mode)
- [x] Font web menggunakan Geist/Public Sans
- [x] Tidak ada Warning Hydration Error di console browser

## Rules Compliance
- [x] Web App Design Aesthetics: Premium Colors & Design System Tokens

Closes #6" \
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
Issue #005 sudah selesai (Next.js 16 scaffolded).

## Task

Kerjakan Issue #006 (Frontend — Design System & Theme Provider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/006-frontend-design-system.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch baru.
2. Install dependensi `next-themes` di folder `frontend/`.
3. Buat file `src/components/theme-provider.tsx`.
4. Replace isi `src/app/globals.css` dengan token Tailwind 4 HSL Theme Emerald (persis seperti di dokumen).
5. Replace isi `src/app/layout.tsx` untuk setup Geist, Public Sans, dan ThemeProvider (jangan lupa `suppressHydrationWarning`).
6. Verifikasi via browser.
7. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.

### Peringatan Khusus
- Jangan hapus direktif `@import "tailwindcss";` dari globals.css.
- Komponen `theme-provider.tsx` WAJIB memakai `"use client"`.
````
