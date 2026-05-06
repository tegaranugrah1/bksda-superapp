# Issue #019 — Frontend — AuthSync Provider (`useAuth`)

> **Type**: `feature`
> **Labels**: `frontend`, `architecture`, `react`
> **Priority**: 🔴 Critical (dibutuhkan untuk render profil user di Header/Sidebar)
> **Complexity**: 🟡 Medium (penerapan fitur React 18 `useSyncExternalStore`)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #017 (Login Page)

---

## Branch

```
issue/019-frontend-auth-sync
```

## Deskripsi

Saat ini, setelah user berhasil login (Issue #017), kita menyimpan data di `localStorage`. Masalahnya, React tidak secara otomatis tahu (*reactive*) jika `localStorage` berubah. Jika nanti kita punya komponen *Navbar* yang menampilkan nama user, *Navbar* tersebut tidak akan ter-*update* secara instan saat login/logout.

Untuk menghindarinya, kita bisa saja menginstall *library* besar seperti Redux. Tapi demi **Clean Code**, kita akan menggunakan fitur bawaan React 18 yaitu `useSyncExternalStore`. Kita akan membuat *Store* lokal mungil yang sangat cepat dan ringan.

**Apa yang dilakukan:**
1. Membuat `auth-store.ts` sebagai penyimpanan eksternal (menggunakan pola *Observer*).
2. Membuat Custom Hook `useAuth.ts` yang mengkonsumsi *Store* tersebut.
3. Me-refactor sedikit halaman `LoginPage` dan `lib/api.ts` agar menggunakan fungsi dari `auth-store.ts` ini, bukan `localStorage.setItem` manual.

---

## Acceptance Criteria

- [ ] File `src/lib/auth-store.ts` dibuat dengan fungsi `subscribe`, `getSnapshot`, `login`, dan `logout`.
- [ ] File `src/hooks/useAuth.ts` dibuat menggunakan `useSyncExternalStore`.
- [ ] Di dalam `api.ts`, saat terjadi error `401`, fungsi yang dipanggil adalah `authStore.logout()`.
- [ ] Di dalam `login/page.tsx`, penyimpanan data diganti memanggil `authStore.login(token, data)`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Pola di bawah ini (Observer Pattern) adalah rahasia di balik library modern seperti Zustand. Kita membuatnya secara *native* agar tidak bergantung pada terlalu banyak *package* luar.

### Langkah 1: Buat Auth Store (Pusat Data)

**Kenapa?** Kita membuat jembatan (penghubung) antara `localStorage` dan dunia React. Saat `login()` atau `logout()` dipanggil, jembatan ini akan meneriakkan pengumuman (`listeners.forEach`) ke seluruh komponen yang sedang *subscribe*.

**Path:** `e:\bksda-superapp\frontend\src\lib\auth-store.ts`

**Buat file baru dan isikan:**

```typescript
let listeners: Array<() => void> = [];

export const authStore = {
  // Mendaftarkan komponen yang mau mendengarkan perubahan
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  // Mengambil data saat ini (Snapshot)
  getSnapshot() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("bksda_user"); // Kita pantau data user-nya
  },

  // Fungsi Login Sentral
  login(token: string, userData: any) {
    localStorage.setItem("bksda_token", token);
    localStorage.setItem("bksda_user", JSON.stringify(userData));
    // Beritahu semua komponen bahwa data berubah!
    listeners.forEach((l) => l());
  },

  // Fungsi Logout Sentral
  logout() {
    localStorage.removeItem("bksda_token");
    localStorage.removeItem("bksda_user");
    // Beritahu semua komponen bahwa data terhapus!
    listeners.forEach((l) => l());
  }
};
```

---

### Langkah 2: Buat Custom Hook `useAuth`

**Kenapa?** Agar programmer lain di tim cukup mengetik `const { user, logout } = useAuth();` di dalam komponen mana pun (Navbar, Sidebar, dll) tanpa perlu repot memikirkan *parsing* JSON atau `localStorage` lagi.

**Path:** `e:\bksda-superapp\frontend\src\hooks\useAuth.ts`

**Buat file baru dan isikan:**

```typescript
"use client";

import { useSyncExternalStore } from "react";
import { authStore } from "@/lib/auth-store";

export function useAuth() {
  // Hook sakti React 18: otomatis re-render komponen jika snapshot berubah
  const userStr = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => null // Server-side fallback
  );

  // Parse JSON dengan aman
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error("Gagal membaca profil pengguna.");
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    login: authStore.login,
    logout: authStore.logout,
  };
}
```

---

### Langkah 3: Update `api.ts` dan `login/page.tsx`

**Kenapa?** Karena kita sudah punya "Pusat Data", kita tidak boleh lagi mengubah `localStorage` secara diam-diam. Kita harus melapor ke `authStore`.

**1. Edit file `src/lib/api.ts`**
Cari bagian *Response Interceptor* yang menangani `status === 401`.
Ganti logika penghapusan token secara manual menjadi:

```typescript
// Import di bagian paling atas
import { authStore } from './auth-store';

// .... (di dalam axios interceptor 401)
    if (status === 401) {
      if (typeof window !== 'undefined') {
        // GANTI BAGIAN INI:
        authStore.logout(); // <-- Panggil fungsi logout dari store
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
```

**2. Edit file `src/app/(auth)/login/page.tsx`**
Cari bagian di mana token disimpan setelah `api.post` sukses.
Ganti baris `localStorage.setItem...` menjadi:

```typescript
// Import di bagian paling atas
import { authStore } from "@/lib/auth-store";

// .... (di dalam try/catch handleLogin)
      const response = await api.post("/login", { username, password });
      const { token, data } = response.data;

      // GANTI BAGIAN INI:
      authStore.login(token, data); // <-- Panggil fungsi login dari store

      router.push("/");
// ....
```

---

## Troubleshooting

### Q: Kenapa `useAuth` menampilkan error di Next.js saat di-import?

**Artinya:** Kamu mungkin menggunakan `useAuth` di *Server Component* (komponen bawaan Next.js App Router).
**Solusi:** `useAuth` hanya boleh dipakai di komponen yang memiliki tulisan `"use client";` di baris paling atas filenya. Server tidak punya sistem *Login/LocalStorage* seperti browser.

### Q: Komponen saya tetap tidak berubah padahal fungsi `authStore.login()` sudah dipanggil.

**Artinya:** React tidak mendeteksi ada perubahan data yang "baru".
**Solusi:** Pastikan `localStorage.setItem` dilakukan **sebelum** pemanggilan `listeners.forEach((l) => l())` di dalam file `auth-store.ts`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend reactive auth sync store" \
  --body "Implementasi useSyncExternalStore untuk state autentikasi tanpa Redux. Detail di docs/issues/019-frontend-auth-sync.md" \
  --label "frontend,architecture,react"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/019-frontend-auth-sync
```

### Step 3: Kerjakan

Ikuti langkah-langkah pembuatan `auth-store.ts` dan `useAuth.ts`. Kemudian *update* file `api.ts` dan `login/page.tsx` agar menggunakan metode tersentralisasi tersebut.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/src/
git commit -m "feat: frontend reactive auth sync store (#19)"
git push -u origin issue/019-frontend-auth-sync
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend reactive auth sync store (#19)" \
  --body "## Summary
Mensentralisasi state management untuk Autentikasi dengan sangat ringan.

## Changes
- Membuat \`auth-store.ts\` (Observer pattern).
- Membuat \`useAuth()\` hook berbasis \`useSyncExternalStore\`.
- Refactoring \`api.ts\` (401 interceptor) dan \`LoginPage\` agar menggunakan AuthStore.

## Verification
- [x] Linter React lolos.
- [x] Halaman Login masih berfungsi normal.

## Rules Compliance
- [x] Mendukung \`Clean Code\` dengan menghindari redundansi localStorage.setItem.
- [x] Arsitektur yang ringan tanpa \`Redux\` atau \`Context\` yang berat (menghindari Re-render Hell).

Closes #19" \
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
Data profil user perlu reaktif. Jika dia login, Navbar otomatis merender namanya.

## Task

Kerjakan Issue #019 (Frontend — AuthSync Provider `useAuth`).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/019-frontend-auth-sync.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `frontend/src/lib` dan `frontend/src/hooks` (jika belum lengkap).
3. Buat file `auth-store.ts` di folder `lib` dan paste kode Observer (Listener).
4. Buat file `useAuth.ts` di folder `hooks` dan paste kode `useSyncExternalStore`.
5. Modifikasi *sedikit* file `lib/api.ts` dan `login/page.tsx` sesuai instruksi agar mereka memanggil fungsi `authStore.login` dan `authStore.logout` bukan `localStorage.setItem`.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
