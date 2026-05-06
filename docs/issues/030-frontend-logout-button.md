# Issue #030 — Frontend — LogoutButton Component

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `security`
> **Priority**: 🔴 Critical (Fasilitas esensial untuk mengakhiri sesi)
> **Complexity**: 🟢 Simple (Modal konfirmasi berbasis React State)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #019 (useAuth)

---

## Branch

```
issue/030-frontend-logout-button
```

## Deskripsi

Setelah kita bisa masuk (Login) dan berpindah rute, kita belum menyediakan pintu keluar (*Logout*) bagi pengguna. Jika tidak ada mekanisme logout yang benar, *token* autentikasi (*Sanctum JWT/Bearer*) akan tertinggal di peramban pengguna selamanya, yang mana merupakan celah keamanan yang sangat fatal.

Untuk memenuhi standar *Enterprise*, tombol *Logout* tidak boleh langsung mengeluarkan pengguna saat ditekan (karena bisa jadi kepencet tidak sengaja). Tombol ini harus memunculkan jendela **Konfirmasi (Modal)**. 

Lebih lanjut, fungsi logout tidak sekadar menghapus *localStorage*. Fungsi ini **WAJIB** mengirimkan permintaan API (`POST /logout`) ke server Backend agar token tersebut secara sah dihapuskan (dicabut/revoke) dari *Database* Laravel.

**Apa yang dilakukan:**
1. Membuat komponen `LogoutButton.tsx`.
2. Merancang antarmuka UI Modal berdesain *Glassmorphism* (blur).
3. Mengimplementasikan integrasi ke `api.post('/logout')` dan sinkronisasi ke `authStore.logout()`.

---

## Acceptance Criteria

- [ ] File `src/components/logout-button.tsx` dibuat.
- [ ] Tombol awal memunculkan UI *Pop-up Modal* (Overlay gelap).
- [ ] Tersedia tombol "Batal" yang menutup modal.
- [ ] Saat menekan "Ya, Keluar", terdapat *loading spinner* pada tombol.
- [ ] Sistem memanggil *Backend* untuk validasi logout.
- [ ] *Token* memori di-reset (via *Hook* AuthSync) lalu user ter-redirect secara sempurna ke `/login`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Gunakan pendekatan kode di bawah ini. Kami merancang desain modal langsung di dalam file (menggunakan `useState` *inline*) agar kamu tidak perlu menginstal *library* modal/dialog ekstra yang berat.

### Langkah 1: Buat Komponen Tombol + Modal 

**Kenapa?** Menggabungkan logika API dan Pop-up konfirmasi dalam satu komponen mempermudah *programmer* masa depan untuk sekadar menyisipkan tag `<LogoutButton />` di sembarang tempat (Navbar/Sidebar) tanpa perlu menulis ulang logika Modal.

**Path:** `e:\bksda-superapp\frontend\src\components\logout-button.tsx`

**Buat file baru tersebut, dan salin kode ini dengan presisi:**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertTriangle, X } from "lucide-react";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth-store";

export function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      // 1. Lapor ke Satpam Backend agar tiket (Token) dihancurkan di Database
      await api.post("/logout");
    } catch (error) {
      console.error("Gagal terhubung ke server saat logout", error);
      // Catatan: Jika server mati/timeout, kita tetap izinkan proses lanjut
      // agar user tidak terjebak di dalam aplikasi tanpa bisa keluar.
    } finally {
      // 2. Sapu bersih seluruh data rahasia dari brankas lokal browser (Rule 7.1)
      authStore.logout();
      
      setIsLoading(false);
      setShowConfirm(false);
      
      // 3. Tendang kembali ke halaman Login (Gunakan replace agar history mundur terhapus)
      router.replace("/login");
    }
  };

  return (
    <>
      {/* 1. TOMBOL PEMICU AWAL */}
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center justify-center md:justify-start gap-3 px-4 py-3 w-full rounded-2xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-200 group"
      >
        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span className="hidden md:inline">Keluar Sistem</span>
      </button>

      {/* 2. JENDELA KONFIRMASI (MODAL OVERLAY) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Kotak Putih Modal */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
            
            {/* Tombol Tutup (X) */}
            <button 
              onClick={() => !isLoading && setShowConfirm(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ikon Peringatan Elegan */}
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Konfirmasi Keluar</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Apakah Anda yakin ingin keluar dari SuperApp? Sesi Anda akan diakhiri.
            </p>

            {/* Area Tombol Konfirmasi */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
              
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? (
                  // Efek Loading Muter (Spin)
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Ya, Keluar"
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
```

---

### Langkah 2: Pemasangan (Opsi Integrasi)

Kini kamu memiliki Tombol Sakti untuk *Logout*. Sama seperti *ModuleSwitcher*, posisikan tombol ini di tempat yang wajar. 

*(Contoh: Buka file `src/components/layout/sidebar.tsx` yang kamu kerjakan di Issue 028, lalu letakkan tag `<LogoutButton />` di bagian paling bawah laci Sidebar tepat sebelum tag `</aside>`)*.

---

## Troubleshooting

### Q: Tombol ditekan, lalu layar berubah jadi Loading Merah terus-menerus tanpa akhir (Hang).

**Artinya:** Kode *Backend* kamu mengalami *Timeout* dan *Catch Block* tidak menangani fungsi dengan benar.
**Solusi:** Kodingan di spesifikasi ini telah memosisikan fungsi `authStore.logout()` dan `router.replace()` di dalam blok `finally { ... }`. Blok `finally` **menjamin** bahwa kode akan tetap dieksekusi apapun yang terjadi (baik Backend mengembalikan status *Sukses* 200 maupun *Error* 500). Jadi, seharusnya aplikasi tidak akan nyangkut (*hang*). Pastikan kamu menyalin posisi `finally` secara tepat.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend logout confirmation component" \
  --body "Pembuatan UI modal konfirmasi keluar dengan sinkronisasi pencabutan token ke API Backend. Detail di docs/issues/030-frontend-logout-button.md" \
  --label "frontend,ui,security"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/030-frontend-logout-button
```

### Step 3: Kerjakan

Salin file kode komponen ke lokasi `src/components/logout-button.tsx`. Jangan ragu untuk langsung memasukkan komponen ini ke dalam menu `Sidebar.tsx` agar lengkap.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend logout confirmation component (#30)"
git push -u origin issue/030-frontend-logout-button
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend logout confirmation component (#30)" \
  --body "## Summary
Menyediakan mekanisme pengakhiran sesi (Session Termination) yang diakui secara legal oleh sisi server.

## Changes
- Pembuatan komponen mandiri \`LogoutButton.tsx\`.
- Implementasi interaksi UI Modal berbasis *React State* (Tanpa mengotori URL route).
- Koneksi ke \`api.post('/logout')\`.
- Mekanisme *Fail-safe* via blok \`finally\` agar UX tidak nyangkut (*stuck*).

## Verification
- [x] Lolos TS Compiler.
- [x] Tombol dan modal tampil dengan mulus (animasi zoom-in).

## Rules Compliance
- [x] Mendukung \`Web App Design Aesthetics\` (Tombol interaktif, modal *Glassmorphism*).
- [x] Pencegahan manipulasi Token yang tidak mati.

Closes #30" \
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
Kita perlu komponen tombol untuk mengakhiri sesi autentikasi dan merobek tiket Token di Backend.

## Task

Kerjakan Issue #030 (Frontend — LogoutButton Component).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/030-frontend-logout-button.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file `frontend/src/components/logout-button.tsx`.
3. Salin kode UI Modal *Logout* dengan lengkap. Perhatikan penempatan `api.post` dan blok penutup `finally`.
4. Edit file `src/components/layout/sidebar.tsx` yang lama, tambahkan `<LogoutButton />` di baris terbawah (di luar area loop menu).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
