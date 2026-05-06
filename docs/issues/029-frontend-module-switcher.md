# Issue #029 — Frontend — ModuleSwitcher Component

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `security`
> **Priority**: 🔴 Critical (Alat bantu navigasi utama untuk monorepo)
> **Complexity**: 🟡 Medium (Validasi Array & Dropdown State)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #019 (useAuth)

---

## Branch

```
issue/029-frontend-module-switcher
```

## Deskripsi

Karena BKSDA SuperApp berarsitektur *Monorepo* (gabungan banyak modul seperti Kepegawaian, BMN, dll), kita tidak mungkin menampilkan semua rute ke dalam satu Sidebar—tampilannya akan terlalu sesak. Sebagai gantinya, kita membuat komponen `ModuleSwitcher` (Pengganti Modul).

Komponen ini akan berbentuk *Dropdown Button* yang berdesain premium. Sesuai **Rule 2.1 & 2.3**, tombol *dropdown* ini **HANYA** akan memunculkan daftar Modul yang *ID*-nya terdaftar di dalam array `access_modules` milik pengguna yang sedang login. (Tentu saja, jika dia adalah `super_admin`, semua modul akan terbuka gaib tanpa batasan).

**Apa yang dilakukan:**
1. Mendefinisikan konfigurasi konstanta (*Constant Configuration*) berisi daftar modul beserta ikon dan warnanya.
2. Membangun logika filter *(Filter Logic)* yang membaca data `user` dari *Hook* `useAuth()`.
3. Membangun UI *Dropdown* dengan animasi mulus dan penanganan tutup-otomatis (*Click Outside*).

---

## Acceptance Criteria

- [ ] File `src/components/module-switcher.tsx` dibuat.
- [ ] Tersedia fitur tutup laci otomatis jika pengguna mengklik area di luar kotak (*handleClickOutside*).
- [ ] Daftar modul yang keluar sudah tersaring (ter-*filter*) berdasarkan parameter `user.access_modules`.
- [ ] Jika `user.role === 'super_admin'`, sistem mem-*bypass* saringan dan menampilkan semuanya.
- [ ] Tampilan UI menyesuaikan status (*Active State*) berdasarkan URL saat ini menggunakan `usePathname()`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Kita menggunakan ikon dari `lucide-react` dan teknik pewarnaan ekor (*Tailwind Color Palette*) seperti `text-blue-500` yang dibalut `bg-blue-500/10` untuk mendapatkan nuansa *Premium Enterprise* layaknya Dashboard Linear atau Vercel.

### Langkah 1: Buat Komponen Dropdown Cerdas

**Kenapa?** Komponen ini menggabungkan Keamanan (IAM) dan Estetika. Logika filter mencegah user memanipulasi tampilan menu yang bukan haknya.

**Path:** `e:\bksda-superapp\frontend\src\components\module-switcher.tsx`

**Buat file baru tersebut, dan salin kode ini dengan presisi:**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Box, Users, Archive, FileText, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// 1. Kamus Konfigurasi Seluruh Modul BKSDA
const MODULES_CONFIG = [
  { id: "kepegawaian", name: "Kepegawaian", icon: Users, path: "/kepegawaian", color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
  { id: "bmn", name: "Aset BMN", icon: Box, path: "/bmn", color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10" },
  { id: "inventory", name: "Gudang", icon: Archive, path: "/inventory", color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "dereporting", name: "Laporan", icon: FileText, path: "/dereporting", color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
];

export function ModuleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user } = useAuth(); // Ambil identitas user (Rule 2.1 & 2.3)

  // 2. Fungsi Menutup Dropdown jika User klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Logika Keamanan (Filter Modul Berdasarkan Hak Akses)
  const availableModules = MODULES_CONFIG.filter((m) => {
    if (user?.role === "super_admin") return true; // Bos besar bisa lihat semua
    return user?.access_modules?.includes(m.id);   // Staf hanya bisa lihat yang dijatahkan
  });

  // 4. Deteksi Modul Aktif Saat Ini Berdasarkan URL
  const activeModule = MODULES_CONFIG.find((m) => pathname.startsWith(m.path)) || availableModules[0];
  const ActiveIcon = activeModule?.icon || ShieldAlert;

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* TOMBOL PEMICU (TRIGGER BUTTON) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200"
      >
        <div className={`p-1.5 rounded-lg ${activeModule?.bg || "bg-zinc-100 dark:bg-zinc-800"}`}>
          <ActiveIcon className={`w-4 h-4 ${activeModule?.color || "text-zinc-600 dark:text-zinc-400"}`} />
        </div>
        <span className="font-semibold text-sm hidden sm:block text-zinc-800 dark:text-zinc-200">
          {activeModule?.name || "Modul Terkunci"}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* ISI LACI (DROPDOWN MENU) - Glassmorphism */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Beralih Aplikasi
            </div>
            
            {/* Jika Modul Kosong (Tidak Diberi Akses Sama Sekali) */}
            {availableModules.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-zinc-500 flex flex-col items-center gap-2">
                 <ShieldAlert className="w-6 h-6 text-red-400/50" />
                 <span>Akses Ditolak</span>
              </div>
            ) : (
              /* Render Modul yang Lolos Filter */
              availableModules.map((mod) => {
                const Icon = mod.icon;
                const isSelected = activeModule?.id === mod.id;
                
                return (
                  <Link
                    key={mod.id}
                    href={mod.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isSelected 
                        ? "bg-zinc-100 dark:bg-zinc-800/80" 
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    {/* Ikon dengan animasi membesar saat disentuh Mouse */}
                    <div className={`p-1.5 rounded-lg ${mod.bg} transition-transform group-hover:scale-110`}>
                      <Icon className={`w-4 h-4 ${mod.color}`} />
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {mod.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Langkah 2: Pemasangan (Opsi Integrasi)

Kini kamu memiliki alat *"Switcher"* layaknya Vercel atau Google Workspace. Kamu bisa menyisipkannya ke `Topbar.tsx` (yang kita buat di Issue 028) agar user bisa mengganti modul kapan saja.

*(Contoh: Buka file `src/components/layout/topbar.tsx` dan letakkan `<ModuleSwitcher />` di sebelah Breadcrumbs atau Saklar Tema)*. Tidak diwajibkan dalam issue ini, tapi sangat disarankan.

---

## Troubleshooting

### Q: Tombol sudah ditekan tapi kotak menu (dropdown) tidak kunjung keluar.

**Artinya:** State `isOpen` gagal ter-render atau diblokir.
**Solusi:** Karena ini menggunakan Hook React (`useState` dan `useRef`), komponen wajib berstatus Client Component. Pastikan kalimat `"use client";` terpampang jelas tanpa salah eja di baris nomor satu file ini.

### Q: Saya mendaftar pakai NIP biasa (bukan super_admin). Kok *Switcher* saya isinya `Akses Ditolak` dan tidak ada modul apapun?

**Artinya:** Kode *filter* berjalan sangat baik!
**Solusi:** Ini berarti di database, array `access_modules` pada kolom `users` milikmu bernilai kosong `[]` atau null. Minta Super Admin (via API Postman) menembak endpoint `PUT /api/kepegawaian/employees/{id}/access` untuk mengisikan namamu dengan `["kepegawaian", "inventory"]` (Memenuhi Rule 2.4).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend module switcher navigation" \
  --body "Komponen dropdown interaktif untuk berpindah modul aplikasi BKSDA dengan validasi IAM access_modules. Detail di docs/issues/029-frontend-module-switcher.md" \
  --label "frontend,ui,security"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/029-frontend-module-switcher
```

### Step 3: Kerjakan

Salin file kode komponen. Sangat disarankan untuk langsung memasukkan *(import)* `ModuleSwitcher` ini ke dalam komponen `Topbar.tsx` (di Issue 028) di sebelah pojok kiri/tengah.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend module switcher navigation (#29)"
git push -u origin issue/029-frontend-module-switcher
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend module switcher navigation (#29)" \
  --body "## Summary
Membangun elemen navigasi *SuperApp* berbasis kamus konfigurasi (Config-Driven Menu) untuk melompat antar Micro-Frontend (Modul).

## Changes
- Pembuatan \`ModuleSwitcher.tsx\`.
- Mekanisme validasi \`Array.filter\` berdasar payload JWT (auth-store).
- UI/UX Dropdown *Glassmorphism* dengan event Listener \`mousedown\` luar kotak.
- Penganimasian warna gradien per *module icon*.

## Verification
- [x] State \`isOpen\` bisa mati/hidup stabil.
- [x] Lolos TS Compiler.

## Rules Compliance
- [x] Rule 2.1: *Render* menu disembunyikan secara visual jika *access* tidak tersedia.
- [x] Rule 2.3: Bypass \`super_admin\` diaktifkan.
- [x] Desain estetika tingkat *Premium/Enterprise*.

Closes #29" \
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
Aplikasi ini ibarat Rumah Susun. Kita butuh tombol "Lift" untuk berpindah lantai (modul) sesuai izin kartu akses (ID Card).

## Task

Kerjakan Issue #029 (Frontend — ModuleSwitcher Component).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/029-frontend-module-switcher.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file `frontend/src/components/module-switcher.tsx`.
3. Salin kode dropdown interaktif yang mengamankan rute berdasarkan `access_modules`.
4. Buka `src/components/layout/topbar.tsx` dan tambahkan pemanggilan `<ModuleSwitcher />` ke dalam ruang kosong di bagian kiri Topbar.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
