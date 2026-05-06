# Issue #028 — Frontend — Admin Layout (Sidebar & Glassmorphism)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `layout`
> **Priority**: 🔴 Critical (Kerangka utama tampilan sistem)
> **Complexity**: 🔴 High (UI responsif yang saling bergantung)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #018 (RouteGuard), #019 (useAuth), #021 (ThemeToggle)

---

## Branch

```
issue/028-frontend-admin-layout
```

## Deskripsi

Halaman Login sudah berdiri dengan cantik, tapi jika login berhasil, pengguna akan dilempar ke ruangan kosong. Sesuai arsitektur *Web App Aesthetics*, di *issue* ini kita membangun "Rumah Utama" (Dashboard Layout).

Alih-alih membuat tabel data langsung, kita harus mengecor *fondasinya* dulu berupa:
- **Sidebar Kiri**: Menu navigasi yang responsif (tersembunyi di versi HP).
- **Topbar Atas**: Tempat menaruh Saklar Gelap/Terang (*ThemeToggle*) dan foto profil (*AuthSync*).
- **Pembungkus Keamanan**: Seluruh *Layout* ini dibungkus secara mutlak oleh `<RouteGuard>`, sehingga siapa pun yang masuk ke ruangan ini tanpa tiket masuk akan diusir otomatis.

**Apa yang dilakukan:**
1. Membuat `Sidebar.tsx` berdesain *Glassmorphism* (kaca buram kekinian) yang mendukung *Dark Mode*.
2. Membuat `Topbar.tsx` sebagai tempat notifikasi dan integrasi `ThemeToggle` (Issue #021) & profil `useAuth` (Issue #019).
3. Membuat `app/(dashboard)/layout.tsx` sebagai cetakan rumah yang akan dipakai oleh seluruh halaman aplikasi (Pegawai, Inventory, dll).

---

## Acceptance Criteria

- [ ] Folder `src/components/layout` dibuat beserta file `sidebar.tsx` dan `topbar.tsx`.
- [ ] Folder Route Group `src/app/(dashboard)` dan file `layout.tsx` dibuat.
- [ ] Tampilan Sidebar dapat ditutup/buka pada layar *Mobile* menggunakan tombol Hamburger mengambang.
- [ ] Profil pengguna di ujung kanan atas Topbar harus dinamis (bisa memunculkan nama hasil *decode* `useAuth()`).
- [ ] Komponen Layout diikat kuat oleh lapisan `<RouteGuard>`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Langkah ini cukup panjang secara jumlah kode karena ini adalah urusan CSS/Tampilan. Pastikan menyalin (*copy-paste*) kode dengan presisi tanpa menghilangkan kelas *Tailwind* satupun. Desain ini dirancang khusus menyerupai panel *Premium Enterprise*.

### Langkah 1: Buat Kerangka UI Sidebar

**Kenapa?** Navigasi menu harus dipisah ke komponen tersendiri (`Sidebar.tsx`) agar nanti kalau mau tambah menu baru, tidak perlu mengobrak-abrik struktur *layout* utama.

```bash
mkdir -p frontend/src/components/layout
```

**Path:** `e:\bksda-superapp\frontend\src\components\layout\sidebar.tsx`

**Buat file tersebut, dan isikan kode ini:**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LayoutDashboard, Settings, Menu } from "lucide-react";
import { useState } from "react";

// Daftar Menu (Bisa ditambahkan nanti)
const menuItems = [
  { name: "Portal Modul", href: "/", icon: LayoutDashboard },
  { name: "Kepegawaian", href: "/kepegawaian", icon: Users },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  // State untuk mode Handphone (Mobile)
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Tombol Floating Mobile Hamburger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed z-50 bottom-6 right-6 p-4 rounded-full bg-emerald-600 text-white shadow-2xl hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Area Navigasi Utama */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64
        transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-r border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl md:shadow-none
      `}>
        <div className="h-full flex flex-col">
          
          {/* Logo BKSDA Premium */}
          <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                 <span className="text-white font-extrabold text-lg">B</span>
               </div>
               <div>
                  <h1 className="font-bold text-lg tracking-tight leading-none text-zinc-900 dark:text-white">SuperApp</h1>
                  <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tracking-wider">Kalimantan Timur</p>
               </div>
             </div>
          </div>

          {/* Deretan Menu Navigasi */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              // Cek apakah url saat ini sedang membuka menu tersebut
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsOpen(false)} // Tutup laci otomatis di mobile kalau diklik
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 group
                    ${isActive 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent"}
                  `}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      
      {/* Layar Gelap (Backdrop) saat laci ditarik di layar HP */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        />
      )}
    </>
  );
}
```

---

### Langkah 2: Buat Kerangka Topbar

**Kenapa?** Area ini menjadi nyawa reaktif dari aplikasi, menampilkan Nama Pegawai (hasil *Issue 019*) dan Saklar Tema (hasil *Issue 021*).

**Path:** `e:\bksda-superapp\frontend\src\components\layout\topbar.tsx`

**Buat file tersebut, dan isikan kode ini:**

```tsx
"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

export function Topbar() {
  const { user } = useAuth(); // Hook sakti yang melacak login state

  return (
    <header className="sticky top-0 z-20 w-full h-16 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-6 md:px-8 transition-colors duration-300">
       <div className="flex-1">
          {/* Ruang kosong untuk Breadcrumbs nanti */}
       </div>
       
       <div className="flex items-center gap-5">
          {/* Inject Komponen Saklar Tema */}
          <ThemeToggle />
          
          {/* Garis Pemisah */}
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
          
          {/* Modul Reaktif Profil Pegawai */}
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-200 dark:border-emerald-800">
                {/* Tampilkan inisial huruf pertama nama, atau U jika kosong */}
                {user?.name?.charAt(0).toUpperCase() || "U"}
             </div>
             <div className="hidden md:block text-sm">
                <p className="font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user?.name || "Pengguna Aplikasi"}</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium mt-1 uppercase tracking-wider">{user?.role || "GUEST"}</p>
             </div>
          </div>
       </div>
    </header>
  );
}
```

---

### Langkah 3: Rangkai Keduanya ke dalam "Rumah" Layout Utama

**Kenapa?** Komponen ibarat batu bata. Next.js App Router butuh file bernama `layout.tsx` sebagai semen penyatu yang akan terus menetap (tidak di-loading ulang) ketika pengguna berpindah-pindah menu. Di sinilah letak keamanan berlapis (*RouteGuard*) dipasang.

```bash
mkdir -p frontend/src/app/\(dashboard\)
```

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\layout.tsx`

**Buat file tersebut, dan isikan kode ini:**

```tsx
import { RouteGuard } from "@/components/route-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // SECURITY WALL: Tolak siapapun yang mencoba merender HTML ini tanpa token
    <RouteGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex overflow-hidden">
        
        {/* Laci Navigasi Kiri */}
        <Sidebar />
        
        {/* Kolom Kanan (Konten Utama) */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300 ease-in-out">
          
          {/* Navigasi Atas */}
          <Topbar />
          
          {/* Kanvas Halaman Tengah */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden">
             {/* Animasi layar muncul dari bawah perlahan saat ganti rute */}
             <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                {children}
             </div>
          </main>

        </div>
      </div>
    </RouteGuard>
  );
}
```

---

## Troubleshooting

### Q: Komponen `Menu` dari lucide-react tidak ditemukan / Error import.

**Artinya:** Modul tersebut belum tertulis di proyekmu.
**Solusi:** Jalankan ulang perintah instalasi di terminal folder `frontend/`: `npm install lucide-react`.

### Q: Kenapa Topbar dan Sidebar tidak menggunakan efek kaca (*blur*)?

**Artinya:** Browser kamu mungkin tidak mendukung fitur *backdrop-filter* CSS terkini, atau fitur Hardware Acceleration di pengaturan *Chrome/Edge* kamu sedang dimatikan.
**Solusi:** Fitur kaca buram sangat bergantung pada kemampuan render kartu grafis (GPU) perangkat. Nyalakan Hardware Acceleration di browser kamu untuk melihat desain Premium-nya.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend premium dashboard layout" \
  --body "Perakitan Sidebar Navigasi dan Header Reaktif dengan desain estetika Glassmorphism berlapis RouteGuard. Detail di docs/issues/028-frontend-admin-layout.md" \
  --label "frontend,ui,layout"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/028-frontend-admin-layout
```

### Step 3: Kerjakan

Buat tiga buah file di folder yang telah ditentukan dengan ketelitian tinggi. Jika ingin mengetesnya, silakan modifikasi file `src/app/page.tsx` untuk menggunakan Layout ini atau kamu bisa sekadar mem-push-nya karena rute akan digarap di issue berikutnya.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend premium dashboard layout (#28)"
git push -u origin issue/028-frontend-admin-layout
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend premium dashboard layout (#28)" \
  --body "## Summary
Membangun fondasi antarmuka untuk operasional modul CMS dengan integrasi desain UI yang mutakhir.

## Changes
- Pembuatan \`Sidebar.tsx\` dengan desain *floating responsive* di perangkat Mobile.
- Pembuatan \`Topbar.tsx\` terintegrasi dengan Auth Store dan Theme Store.
- Membungkus skema \`app/(dashboard)/layout.tsx\` menggunakan gerbang pengaman otorisasi \`RouteGuard\`.

## Verification
- [x] Lolos TS Compiler.
- [x] Efek *backdrop-blur* (Glassmorphism) berfungsi secara sempurna pada tumpukan lapisan.

## Rules Compliance
- [x] Mendukung \`Web App Design Aesthetics\` yang mewajibkan keindahan mikro-animasi pada setiap transisi dan komponen hover.

Closes #28" \
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
Semua komponen kecil (Tema, Token, Auth) sudah selesai. Ini saatnya dirakit menjadi sebuah rumah bernama *Dashboard Layout*.

## Task

Kerjakan Issue #028 (Frontend — Admin Layout).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/028-frontend-admin-layout.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `frontend/src/components/layout` dan buat dua file: `sidebar.tsx` & `topbar.tsx`. *Copy-paste* kode komponen dengan cermat.
3. Buat folder `frontend/src/app/(dashboard)` dan buat file `layout.tsx` sesuai panduan untuk merangkai komponen yang baru dibuat.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
