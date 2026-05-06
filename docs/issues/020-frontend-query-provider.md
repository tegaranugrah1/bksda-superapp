# Issue #020 — Frontend — QueryProvider (React Query)

> **Type**: `feature`
> **Labels**: `frontend`, `architecture`, `api`
> **Priority**: 🔴 Critical (fondasi untuk mengambil data / *fetching* dari backend)
> **Complexity**: 🟢 Simple (Setup Provider Library)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #016 (API Client Axios)

---

## Branch

```
issue/020-frontend-query-provider
```

## Deskripsi

Cara jadul mengambil data di React adalah menggunakan `useEffect` ditambah `useState(loading)`, yang mana kodenya bisa sangat panjang dan tidak memiliki fitur memori (*caching*). Oleh karena itu, kita akan memasang standar industri terbaru: **TanStack React Query** (`@tanstack/react-query`).

*Library* ini bertugas membungkus `axios` yang sudah kita buat di Issue #016. Jika user membuka halaman Pegawai, lalu pindah ke halaman lain, lalu kembali lagi ke halaman Pegawai, React Query tidak akan me-*loading* dari awal melainkan menggunakan data *cache* secara cerdas. 

**Apa yang dilakukan:**
1. Menginstal package `@tanstack/react-query` dan alat *debugging*-nya.
2. Membuat komponen khusus `QueryProvider` sebagai *Wrapper/Context* global.
3. Menerapkan **Best Practice Next.js**: menggunakan `useState` untuk inisialisasi `QueryClient` agar server tidak membocorkan data *cache* antar pengguna (SSR Safety).
4. Membungkus seluruh aplikasi di `layout.tsx` dengan provider ini.

---

## Acceptance Criteria

- [ ] Package terinstal.
- [ ] Folder `src/providers` (jika belum ada) berhasil dibuat.
- [ ] File `src/providers/query-provider.tsx` dibuat dengan konfigurasi *defaultOptions* `staleTime` dan `refetchOnWindowFocus`.
- [ ] File `src/app/layout.tsx` diubah dengan menyelipkan `<QueryProvider>` di bawah atau di dalam `<ThemeProvider>`.
- [ ] Widget *React Query Devtools* berbentuk bunga merah/kuning terlihat melayang di pojok kiri bawah browser (hanya muncul di mode development).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti secara teliti. Konfigurasi `defaultOptions` yang disediakan di bawah telah disesuaikan agar aplikasi tidak memboroskan kuota internet (*bandwith*) akibat nge-fetch berulang-ulang tanpa alasan yang jelas.

### Langkah 1: Install Package

**Kenapa?** TanStack Query adalah package pihak ketiga, kita butuh instalasi utama beserta *Devtools* (alat bantu untuk programmer agar bisa melihat isi *cache* data secara langsung di browser).

```bash
cd e:\bksda-superapp\frontend

npm install @tanstack/react-query
npm install @tanstack/react-query-devtools
```

---

### Langkah 2: Buat File `query-provider.tsx`

**Kenapa?** React Query membutuhkan *Client Component* untuk menyimpan *instance* dari *cache* memori. Kita menggunakan `useState` khusus agar tidak terjadi re-render (bocor) memori pada lingkungan Next.js App Router.

```bash
mkdir -p src/providers
```

**Path:** `e:\bksda-superapp\frontend\src\providers\query-provider.tsx`

**Buat file baru dan isikan kode berikut:**

```tsx
"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Best Practice Next.js 13+: Gunakan useState agar QueryClient 
  // hanya diinisialisasi SATU KALI per siklus hidup aplikasi.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap fresh selama 60 detik. Dalam 60 detik ini, 
            // query yang sama tidak akan menembak server backend lagi.
            staleTime: 60 * 1000, 
            
            // Jika backend error (500), coba ulang 1 kali sebelum menyerah
            retry: 1, 
            
            // Mencegah auto-fetch ketika user Alt+Tab atau ganti tab browser
            refetchOnWindowFocus: false, 
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Tombol debugging ini HANYA akan muncul saat kita 'npm run dev' */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
```

---

### Langkah 3: Bungkus Aplikasi Utama

**Kenapa?** Agar seluruh halaman dan komponen (dari Ujung Sabang sampai Merauke di aplikasi kita) bisa memakai perintah sakti `useQuery`.

**Path:** `e:\bksda-superapp\frontend\src\app\layout.tsx`

**Buka file `layout.tsx` (dari pekerjaan Issue 006), lalu edit bagian Provider-nya:**

1. Tambahkan impor ini di bagian paling atas:
   ```typescript
   import { QueryProvider } from "@/providers/query-provider";
   ```

2. Cari blok yang me-*return* tag `<body>`, dan ubah susunannya agar membungkus `{children}` menjadi seperti ini:

   ```tsx
      <body className={`... (class bawaanmu tidak usah diubah)`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
   ```

*(Intinya: `{children}` dibungkus oleh `QueryProvider`, lalu `QueryProvider` dibungkus oleh `ThemeProvider`)*.

---

## Troubleshooting

### Q: IDE saya protes error `ReactQueryDevtools is not exported`

**Artinya:** Proses import atau instalasi *package* belum sempurna.
**Solusi:** Pastikan kamu mengetikkan *dash* (`-`) dengan benar di package `@tanstack/react-query-devtools`. Coba tutup editor (VS Code) dan buka kembali, atau jalankan perintah `npm install` lagi.

### Q: Halaman error dengan tulisan `No QueryClient set`

**Artinya:** Kamu mencoba menggunakan *fetching* data sebelum memasang `<QueryProvider>`.
**Solusi:** Pastikan pemanggilan komponen di `layout.tsx` sudah benar posisinya, dan pastikan tag penutup `</QueryProvider>` membungkus komponen `{children}` dengan sempurna.

### Q: Bunga merah kecil (Devtools) mengganggu tampilan web saya.

**Artinya:** Jangan khawatir, Devtools itu pintar.
**Solusi:** Widget logo bunga di pojok kiri bawah itu otomatis **HILANG** dan tidak disertakan ke dalam *bundle* saat aplikasi dikompilasi ke *Production* (`npm run build`).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "build: frontend react query provider setup" \
  --body "Instalasi dan konfigurasi @tanstack/react-query untuk optimasi data fetching dan caching. Detail di docs/issues/020-frontend-query-provider.md" \
  --label "frontend,architecture,api"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/020-frontend-query-provider
```

### Step 3: Kerjakan

Lakukan langkah instalasi NPM, buat file `query-provider.tsx` dengan presisi, lalu edit `layout.tsx`. Buka peramban di `localhost:3000` dan verifikasi munculnya logo TanStack di pojok kiri bawah layar.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "build: frontend react query provider setup (#20)"
git push -u origin issue/020-frontend-query-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "build: frontend react query provider setup (#20)" \
  --body "## Summary
Membangun fondasi manajemen *Server State* untuk menghindari fetch redudansi dan meningkatkan kecepatan (UX).

## Changes
- Instalasi \`@tanstack/react-query\` dan \`devtools\`.
- \`QueryProvider\` diimplementasikan dengan fitur keamanan SSR (useState lazy init).
- Tuning performa (\`staleTime: 60s\`, \`refetchOnWindowFocus: false\`).
- Integrasi ke file \`layout.tsx\`.

## Verification
- [x] Linter lolos.
- [x] Logo DevTools muncul tanpa pesan error SSR pada console.

## Rules Compliance
- [x] Sesuai arsitektur *Clean Code* penghematan resource server (membatasi API calls berulang secara otomatis).

Closes #20" \
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
Semua konfigurasi Auth/API sudah selesai. Kini kita merapikan cara kita mengambil (fetch) data.

## Task

Kerjakan Issue #020 (Frontend — QueryProvider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/020-frontend-query-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi ke `frontend/` dan instal dua *package* Tanstack via npm.
3. Buat folder `frontend/src/providers` (jika belum ada) dan isi dengan file `query-provider.tsx` persis sesuai instruksi.
4. Update file `frontend/src/app/layout.tsx` untuk melakukan import dan menyelipkan komponen `<QueryProvider>` yang membungkus `{children}`.
5. Jalankan `npm run dev` dan pastikan tidak ada sintaks merah.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
