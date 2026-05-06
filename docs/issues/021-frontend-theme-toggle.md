# Issue #021 — Frontend — ThemeToggle Component (Dark Mode)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `design`
> **Priority**: 🟡 Medium (Pelengkap UI/UX)
> **Complexity**: 🟢 Simple (Pembuatan satu tombol interaktif)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #006 (Design System & ThemeProvider)

---

## Branch

```
issue/021-frontend-theme-toggle
```

## Deskripsi

Pada **Issue #006**, kita telah menginstal `next-themes` dan membungkus aplikasi dengan `<ThemeProvider>`. Artinya, mesin *Dark Mode* sebenarnya sudah menyala dan akan mengikuti konfigurasi OS komputermu secara otomatis. 

Namun, kita belum memberikan "saklar" (tombol) kepada pengguna (User) agar mereka bisa mengubah *Light/Dark Mode* secara manual sesuai selera. Pada issue ini, kita membuat komponen tombol tersebut dengan animasi *Clean Code* yang elegan.

**Apa yang dilakukan:**
1. Menginstal pustaka ikon standar industri `lucide-react`.
2. Membuat komponen `ThemeToggle.tsx` yang bersifat *Client Component*.
3. Menerapkan animasi perputaran (*rotate*) dan perbesaran (*scale*) antara ikon Matahari dan Bulan menggunakan Tailwind v4.

---

## Acceptance Criteria

- [ ] File `src/components/theme-toggle.tsx` dibuat.
- [ ] Tombol bisa di-klik untuk mengubah status `theme` (dari *light* ke *dark*, dan sebaliknya).
- [ ] Animasi transisi ikon berjalan halus (tidak muncul secara kasar/menghentak).
- [ ] Terbebas dari error *Hydration Mismatch* saat rute di-load.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Komponen tombol ini memanfaatkan keunggulan Tailwind untuk mengontrol dua ikon (Sun dan Moon) di titik kordinat yang sama (`absolute`), lalu menyembunyikan salah satunya berdasarkan kelas `.dark` di parent HTML.

### Langkah 1: Instalasi Library Ikon

**Kenapa?** Kita menggunakan `lucide-react`, set ikon paling ringan dan modern (juga digunakan secara default oleh pustaka *shadcn/ui*).

```bash
cd e:\bksda-superapp\frontend

npm install lucide-react
```

---

### Langkah 2: Buat Komponen Tombol (Clean Code)

**Kenapa?** Untuk membaca *state* `theme` dari `next-themes`, kita butuh *Client Component*.

**Path:** `e:\bksda-superapp\frontend\src\components\theme-toggle.tsx`

**Buat file baru tersebut, isikan kode ini:**

```tsx
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // State mounted mencegah error hydration antara server (SSG/SSR) dan browser
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Jika komponen belum di-mount di browser, jangan render icon apa-apa (blank button)
  // Ini adalah trik Best Practice untuk next-themes.
  if (!mounted) {
    return (
      <button className="relative inline-flex items-center justify-center p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 opacity-50 cursor-wait">
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative inline-flex items-center justify-center p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-emerald-500/50 transition-all duration-300 shadow-sm"
      aria-label="Toggle theme"
      title="Ubah Mode Gelap/Terang"
    >
      {/* 
        Matahari: Skala 100% di light mode, Mengecil jadi 0 dan berputar -90 derajat di dark mode 
      */}
      <Sun className="h-5 w-5 transition-all duration-500 ease-in-out scale-100 rotate-0 dark:scale-0 dark:-rotate-90 text-amber-500 dark:text-zinc-400" />
      
      {/* 
        Bulan: Bersembunyi (skala 0) dan terputar 90 derajat di light mode, muncul perlahan di dark mode 
      */}
      <Moon className="absolute h-5 w-5 transition-all duration-500 ease-in-out scale-0 rotate-90 dark:scale-100 dark:rotate-0 text-zinc-400 dark:text-emerald-400" />
    </button>
  );
}
```

---

### Langkah 3: Cara Menggunakannya

Kamu tidak perlu meletakkan komponen ini ke mana-mana sekarang. Tapi sebagai contoh, jika besok kamu membuat file `Navbar.tsx` di Issue berikutnya, kamu cukup menggunakannya seperti ini:

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4">
       <div>Logo BKSDA</div>
       
       <div className="flex gap-4">
          <UserProfile />
          {/* Taruh saklarnya di sini */}
          <ThemeToggle />
       </div>
    </nav>
  );
}
```

---

## Troubleshooting

### Q: Icon Matahari dan Bulan terlihat menumpuk / berdempetan

**Artinya:** Kelas Tailwind `absolute` tidak bekerja dengan semestinya atau diblokir CSS lain.
**Solusi:** Pastikan tidak menghapus atribut `absolute` pada elemen `<Moon />` dan `relative` pada `<button>`. Trik `absolute` membuat bulan dan matahari berada tepat di satu koordinat yang sama.

### Q: Kenapa repot-repot menggunakan `useEffect` dan `mounted` state?

**Artinya:** Kamu mungkin merasa kodenya berlebihan.
**Solusi:** Coba hapus blok pengecekan `mounted`. Jika OS komputermu sedang `Dark`, saat Next.js me-render HTML awal di server, ia akan mengirim icon Matahari (Light). Tapi sedetik kemudian browser menyadari ia sedang di mode Dark dan menggantinya ke Bulan. Perbedaan render server dan browser ini akan memunculkan *Error: Text content did not match* (Hydration Error). Penggunaan `mounted` adalah trik legal yang disarankan resmi oleh dokumentasi `next-themes`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend dark mode theme toggle" \
  --body "Pembuatan komponen UI interaktif untuk berganti mode gelap dan terang. Detail di docs/issues/021-frontend-theme-toggle.md" \
  --label "frontend,ui,design"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/021-frontend-theme-toggle
```

### Step 3: Kerjakan

Instal `lucide-react`, lalu salin kode ke `src/components/theme-toggle.tsx`. Tidak usah ditaruh ke mana-mana dulu, komponen ini adalah *"Lego Block"* yang akan dipakai nanti.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend dark mode theme toggle (#21)"
git push -u origin issue/021-frontend-theme-toggle
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend dark mode theme toggle (#21)" \
  --body "## Summary
Menambahkan 'Saklar' interaktif untuk sistem Dark Mode yang dikonfigurasi di Issue 6.

## Changes
- Import ikon Sun dan Moon dari \`lucide-react\`.
- Implementasi SSR Safe Render (Hydration Trick) melalui \`mounted\` state.
- Menambahkan animasi rotasi dan opacity halus saat melakukan perpindahan tema.

## Verification
- [x] Lolos TS Compiler.
- [x] Tidak menyebabkan Hydration Error pada root layout.

## Rules Compliance
- [x] Mendukung aspek \`Web App Design Aesthetics\` (Animasi halus, desain premium).

Closes #21" \
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
Semua mesin sistem utama Frontend telah siap. Kita lengkapi perabotan UI (Saklar Tema) sebelum membuat Halaman Admin.

## Task

Kerjakan Issue #021 (Frontend — ThemeToggle Component).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/021-frontend-theme-toggle.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi ke `frontend/` dan jalankan `npm install lucide-react`.
3. Buat file `frontend/src/components/theme-toggle.tsx`.
4. *Copy-paste* kode saklar UI persis dari dokumentasi. Pastikan trik Hydration SSR (`mounted` state) terangkut.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
