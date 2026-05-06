# Issue #017 — Frontend — Login Page (Glassmorphism)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `auth`
> **Priority**: 🔴 Critical (Halaman pertama yang dilihat pengguna)
> **Complexity**: 🟡 Medium (Integrasi UI Premium dan API Client)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #016 (API Client) harus sudah selesai

---

## Branch

```
issue/017-frontend-login-page
```

## Deskripsi

Membuat antarmuka halaman Login yang **Premium dan Dinamis**. Halaman ini tidak boleh terlihat kaku seperti aplikasi lama. Sesuai *Core Architecture*, kita akan menggunakan tema alam (Emerald/Forestry) berpadu dengan efek *Glassmorphism* (kaca transparan yang buram).

Halaman ini bertugas menerima input NIP (`username`) dan `password`, melakukan validasi di *client-side* (Rule 7.4), mengirimkannya ke *Backend* via `lib/api.ts`, lalu menyimpan `token` yang dikembalikan ke dalam `localStorage`.

**Apa yang dilakukan:**
1. Membuat Route Group `(auth)` di Next.js App Router agar halaman *login* tidak memiliki *layout* sidebar/navbar administrator.
2. Mendesain UI form dengan efek *Glassmorphism* dan animasi transisi yang mulus.
3. Mengimplementasikan fungsi `onSubmit` yang memanggil rute `/login` di Backend.
4. Menangani *loading state* (tombol berputar saat memuat) dan *error handling* (menampilkan pesan salah).

---

## Acceptance Criteria

- [ ] File dibuat di `src/app/(auth)/login/page.tsx`.
- [ ] UI memiliki estetika premium: background gradasi/gambar alam, kotak login transparan (*backdrop-blur*).
- [ ] Terdapat validasi *frontend*: NIP dan Password tidak boleh kosong sebelum ditekan *submit*.
- [ ] Jika API sukses, `bksda_token` dan data user tersimpan di `localStorage`, lalu user di-redirect ke `/dashboard` atau halaman utama.
- [ ] Jika API gagal (422/401), muncul peringatan *error* merah di UI (bukan alert bawaan browser).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Kita memisahkan *UI Presentation* dan *Business Logic* menggunakan React `useState`. Desain di bawah ini menggunakan utilitas Tailwind 4 untuk menciptakan efek kaca.

### Langkah 1: Buat Route Group & File Page

**Kenapa?** Di Next.js App Router, folder yang diapit kurung seperti `(auth)` tidak akan muncul di URL (URL-nya tetap `/login`, bukan `/auth/login`). Ini berguna untuk membedakan *layout* halaman publik dan halaman admin.

```bash
cd e:\bksda-superapp\frontend

# Buat folder route group dan login
mkdir -p src/app/\(auth\)/login
```

---

### Langkah 2: Tulis Kode Halaman Login (UI + Logic)

**Path:** `e:\bksda-superapp\frontend\src\app\(auth)\login\page.tsx`

**Buat file tersebut dan masukkan kode berikut:**

```tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  // State Management
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validasi Frontend (Rule 7.4)
    if (!username || !password) {
      setErrorMsg("NIP dan Password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      // Panggil backend via sentralisasi API (Rule 7.2)
      const response = await api.post("/login", { username, password });

      const { token, data } = response.data;

      // Simpan token ke local storage
      localStorage.setItem("bksda_token", token);
      localStorage.setItem("bksda_user", JSON.stringify(data));

      // Redirect ke dashboard (nanti akan kita buat)
      router.push("/");
    } catch (error: any) {
      // Tangkap pesan error dari backend
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.username?.[0] ||
        "Terjadi kesalahan pada server.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-900 overflow-hidden">
      {/* 
        Background Estetika Premium (Forestry / Emerald theme) 
        Menggunakan gradients untuk visual yang dinamis tanpa butuh image eksternal
      */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-zinc-900 to-black z-0"></div>
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl z-0 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl z-0 animate-pulse delay-1000"></div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">BKSDA SuperApp</h1>
          <p className="text-emerald-400/80 text-sm font-medium">Sistem Informasi Terpadu</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center animate-in fade-in slide-in-from-top-2">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              NIP / Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              placeholder="Masukkan NIP Anda"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span className="flex items-center gap-2">
                Masuk Sistem
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-xs">
            © {new Date().getFullYear()} BKSDA Kalimantan Timur.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Q: Tombol sudah diklik, *loading* berputar sebentar lalu muncul error `Network Error` atau `Server tidak merespons`.

**Artinya:** Frontend tidak bisa mencapai Backend Laravel.
**Solusi:** Pastikan terminal yang menjalankan `php artisan serve` sedang hidup. Cek juga apakah `.env.local` mu benar (`NEXT_PUBLIC_API_URL=http://localhost:8000/api`).

### Q: Halaman error dengan tulisan `localStorage is not defined` pada Next.js versi tertentu.

**Artinya:** Kode dijalankan di *Server-Side* tempat `localStorage` tidak eksis.
**Solusi:** Baris paling atas dari file ini WAJIB bertuliskan `"use client";`. Tulisan ini memberitahu Next.js bahwa komponen ini murni berjalan di *browser* (Client-Side).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: premium login page with glassmorphism" \
  --body "Pembuatan UI halaman login (NIP & Password) berdesain premium. Detail di docs/issues/017-frontend-login-page.md" \
  --label "frontend,ui,auth"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/017-frontend-login-page
```

### Step 3: Kerjakan

Salin kode di atas secara presisi. Jalankan `npm run dev` dan buka `http://localhost:3000/login` untuk memastikan desainnya muncul dengan indah.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: premium login page with glassmorphism (#17)"
git push -u origin issue/017-frontend-login-page
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: premium login page with glassmorphism (#17)" \
  --body "## Summary
Membuat antarmuka halaman login utama aplikasi.

## Changes
- Setup route group \`(auth)/login/page.tsx\`.
- Desain UI menggunakan tema kehutanan (emerald) dipadukan *Glassmorphism*.
- State management untuk input, loading, dan error.
- Integrasi ke \`api.post('/login')\`.

## Verification
- [x] Background memiliki orbs animasi berputar (pulse).
- [x] Pesan error NIP tidak boleh kosong berfungsi.
- [x] Pesan error 422/401 dari backend bisa ditangkap dan ditampilkan.

## Rules Compliance
- [x] Web App Aesthetics: Desain Premium, Animasi interaktif, warna elegan (bukan merah/biru dasar).
- [x] Rule 7.2: Memanggil \`api\` dari lib, bukan \`fetch\` manual.
- [x] Rule 7.4: Validasi eksis di Frontend.

Closes #17" \
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
API Client (Axios) di Frontend sudah siap. Kita butuh Halaman Login sebagai gerbang masuk.

## Task

Kerjakan Issue #017 (Frontend — Login Page).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/017-frontend-login-page.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `frontend/src/app/(auth)/login/`.
3. Buat file `page.tsx` di dalamnya dan *copy-paste* kode UI Glassmorphism persis sesuai dokumen (Jangan lupakan `"use client";`).
4. Uji coba UI di browser (animasi *pulse* dan tombol harus bekerja).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
