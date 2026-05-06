# Issue #018 — Frontend — RouteGuard Component

> **Type**: `feature`
> **Labels**: `frontend`, `security`, `auth`
> **Priority**: 🔴 Critical (Menutup celah akses URL tanpa login)
> **Complexity**: 🟡 Medium (Pembuatan Higher-Order Component/Wrapper)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #017 (Login Page)

---

## Branch

```
issue/018-frontend-route-guard
```

## Deskripsi

Meskipun halaman *Login* (Issue #017) sudah bisa mengarahkan user setelah berhasil masuk, sistem kita saat ini belum mencegah orang asing mengetik URL langsung di *browser* (misal: mengetik `http://localhost:3000/dashboard`). 

Sesuai **Rule 7.3**, semua halaman non-publik harus mengecek status autentikasi. Di issue ini kita membuat komponen `RouteGuard` yang akan membungkus halaman-halaman tersebut. Komponen ini akan membaca token dari `localStorage` dan otomatis menendang (redirect) pengguna ke `/login` jika tidak sah.

**Apa yang dilakukan:**
1. Membuat komponen `RouteGuard.tsx`.
2. Menerapkan *Client-Side Check* menggunakan `useEffect` untuk melihat ketersediaan `bksda_token`.
3. Menambahkan fitur pengecekan ganda (*Module-Based Access Control* di sisi UI) agar menu/halaman yang tidak sesuai hak akses user (berdasarkan `bksda_user`) juga ditolak.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak mengatur struktur Layout aplikasi utama (itu tugas fase selanjutnya). Kita murni membuat senjatanya (komponennya) saja.

---

## Acceptance Criteria

- [ ] File `src/components/route-guard.tsx` berhasil dibuat.
- [ ] Terdapat pengecekan mutlak eksistensi token dari `localStorage`.
- [ ] Terdapat pengecekan khusus *module* jika prop `requiredModule` diberikan (Bypass untuk `super_admin`).
- [ ] Saat proses verifikasi berlangsung (sekian milidetik), sistem menampilkan animasi *Loading* minimalis.
- [ ] Komponen ditulis menggunakan pendekatan "Clean Code" (tidak rumit dan *Reusable*).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Pendekatan yang kita gunakan adalah *Wrapper Component*. Saat digunakan nanti, komponen ini akan "memeluk" halaman aslinya. Jika lolos sensor, halaman di dalamnya (`children`) akan ditampilkan. Jika gagal, redirect terjadi sebelum halaman asli sempat berkedip (muncul).

### Langkah 1: Buat Komponen Penjaga Rute (RouteGuard)

**Kenapa?** Karena token kita simpan di `localStorage` (di browser pengguna, bukan di Cookie server), maka pengecekan keamanan harus dilakukan dengan menggunakan `"use client"` agar bisa dieksekusi oleh mesin peramban (Chrome/Firefox/Safari).

**Path:** `e:\bksda-superapp\frontend\src\components\route-guard.tsx`

**Buat file baru tersebut, dan isi dengan kode berikut:**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface RouteGuardProps {
  children: React.ReactNode;
  /** 
   * Jika diisi (misal: 'inventory'), guard akan mengecek 
   * apakah user memiliki izin ke modul tersebut.
   */
  requiredModule?: string; 
}

export function RouteGuard({ children, requiredModule }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Ambil Identitas dari Brankas Lokal
    const token = localStorage.getItem("bksda_token");
    const userStr = localStorage.getItem("bksda_user");

    // 2. Jika tidak ada tiket masuk sama sekali, usir ke gerbang depan
    if (!token || !userStr) {
      setIsAuthorized(false);
      router.replace("/login");
      return;
    }

    // 3. Pengecekan Ekstra (Module Based Access Control di Frontend)
    if (requiredModule) {
      try {
        const user = JSON.parse(userStr);
        const role = user?.role;
        const modules = user?.access_modules || [];

        // super_admin adalah bos besar, selalu izinkan
        if (role !== "super_admin") {
          // Jika bukan super_admin dan tidak punya modul terkait, tendang ke /403
          if (!modules.includes(requiredModule)) {
            router.replace("/403"); // Mengarah ke halaman "Akses Ditolak"
            return;
          }
        }
      } catch (error) {
        // Jika data JSON corrupt, anggap sebagai bahaya dan usir
        localStorage.clear();
        router.replace("/login");
        return;
      }
    }

    // 4. Jika semua tes lolos, persilakan tampilkan isi halaman
    setIsAuthorized(true);

    // Dependency array: jika URL berubah, periksa lagi keamanan
  }, [pathname, requiredModule, router]);

  // Selama pengecekan (Authorized belum true), tampilkan layar tunggu (Loading state)
  // Ini menghindari isi halaman "bocor" sekian milidetik sebelum redirect
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"></div>
          <p className="text-emerald-500/50 text-sm font-medium animate-pulse">Memverifikasi Akses...</p>
        </div>
      </div>
    );
  }

  // Lolos sensor: tampilkan halamannya
  return <>{children}</>;
}
```

---

### Langkah 2: Cara Penggunaan (Panduan, Tidak Perlu di-coding sekarang)

Sebagai gambaran untuk developer, beginilah cara `RouteGuard` ini dipakai nanti di Layout Dasbor atau Halaman khusus:

```tsx
// Contoh: app/(admin)/layout.tsx
import { RouteGuard } from "@/components/route-guard";

export default function AdminLayout({ children }) {
  return (
    <RouteGuard>
      <div className="admin-sidebar">...</div>
      <div className="admin-content">{children}</div>
    </RouteGuard>
  );
}

// Contoh: app/(admin)/inventory/page.tsx
import { RouteGuard } from "@/components/route-guard";

export default function InventoryPage() {
  return (
    <RouteGuard requiredModule="inventory">
      <h1>Selamat Datang di Gudang</h1>
    </RouteGuard>
  );
}
```

---

## Troubleshooting

### Q: Kenapa pas halaman dimuat selalu terlihat *loading spinner* hijau sejenak sebelum halamannya muncul?

**Artinya:** Itu adalah perilaku wajar (By Design).
**Solusi:** Karena *Client-Side Routing*, Next.js harus menunggu browser mengeksekusi JavaScript untuk mengecek isi `localStorage`. Selama sepersekian detik itu, agar tampilan halaman asli tidak terlihat (bocor), spinner *loading* ditampilkan sebagai penutup layar.

### Q: Ada *warning* di terminal Next.js mengenai *mismatch hydration*.

**Artinya:** Mungkin layout kamu kurang rapi atau lupa menaruh prop `suppressHydrationWarning`.
**Solusi:** Seharusnya aman karena `RouteGuard` secara fisik terisolasi dari *Server-Side Render* awal (karena membalikkan *Loading State* lebih dulu jika status belum authorized). Namun pastikan file ini selalu dilabeli `"use client"`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend route guard component" \
  --body "Pembuatan komponen HOC pembungkus untuk memproteksi halaman dari user yang tidak memiliki otentikasi/token. Detail di docs/issues/018-frontend-route-guard.md" \
  --label "frontend,security,auth"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/018-frontend-route-guard
```

### Step 3: Kerjakan

Salin kode `RouteGuard.tsx` secara teliti ke lokasi yang tepat. 

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/src/components/
git commit -m "feat: frontend route guard component (#18)"
git push -u origin issue/018-frontend-route-guard
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend route guard component (#18)" \
  --body "## Summary
Menutup celah keamanan Frontend di mana user bisa menebak URL langsung tanpa melewati login.

## Changes
- Komponen \`RouteGuard.tsx\` dibuat.
- Pemeriksaan keberadaan token di \`localStorage\`.
- Mekanisme parsing JSON \`bksda_user\` untuk mengecek \`access_modules\`.
- Visual indikator loading transisi hijau saat verifikasi token.

## Verification
- [x] Kode bisa ter-compile tanpa error.
- [x] Menerapkan Exception Catching (try-catch) pada \`JSON.parse\`.

## Rules Compliance
- [x] Rule 2.1: Implementasi ganda di frontend (bukan hanya di backend).
- [x] Rule 7.3: Redirect aman menggunakan \`useRouter().replace()\` (tidak menumpuk history).

Closes #18" \
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
Halaman login siap digunakan. Sekarang kita perlu "Satpam" yang menjaga halaman-halaman dalam aplikasi.

## Task

Kerjakan Issue #018 (Frontend — RouteGuard Component).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/018-frontend-route-guard.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file `frontend/src/components/route-guard.tsx`.
3. *Copy-paste* kode komponen dari markdown spesifikasi. Pastikan *early return loading spinner* tidak terlupakan.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
