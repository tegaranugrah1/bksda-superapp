# Issue #053 — Frontend — Inventory Layout & Sidebar

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `layout`, `module-inventory`
> **Priority**: 🔴 Critical (Fondasi Navigasi Pengguna Modul Logistik)
> **Complexity**: 🟢 Simple (Struktur Antarmuka Menu dan Routing Dasar)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #028 (Jika ada kerangka dasar Sidebar), Issue #052

---

## Branch

```
issue/053-frontend-inventory-layout
```

## Deskripsi

Selamat datang di Pembangunan Antarmuka (UI) Modul Logistik! 🎨

Sistem **Next.js 16 App Router** sangat bergantung pada file yang bernama `layout.tsx`. File ini berfungsi sebagai "cangkang" tidak berubah yang menampung *Sidebar Navigasi*, sementara isi halaman tengahnya akan terus berubah-ubah sesuai dengan URL yang dituju.

Pada **Issue #053** ini, kita akan mendedikasikan sebuah cangkang (Layout) khusus untuk Modul Logistik yang beralamat utama di `/inventory`. 

Cangkang ini memiliki tugas mulia:
1. Menampilkan panel navigasi samping (*Sidebar*).
2. Menyediakan 6 menu krusial untuk operasional gudang BKSDA.
3. Menerapkan gaya visual elegan *(Glassmorphism / Dark Mode)* yang selaras dengan seluruh ekosistem aplikasi BKSDA.

Daftar Menu Navigasi yang Wajib Ada:
- **Dashboard** (`/inventory`)
- **Katalog Barang** (`/inventory/items`)
- **Jaringan Kantor** (`/inventory/offices`)
- **Stok Masuk** (`/inventory/stock-in`)
- **Distribusi Keluar** (`/inventory/stock-out`)
- **Buku Riwayat Mutasi** (`/inventory/transactions`)

---

## Acceptance Criteria

- [ ] Folder Modul Frontend diciptakan: `frontend/src/app/(dashboard)/inventory/`.
- [ ] Tersedia file komponen `_components/InventorySidebar.tsx` yang memuat ke-6 daftar menu beserta ikon *Lucide React*.
- [ ] Tersedia file inti `layout.tsx` yang membungkus `InventorySidebar` dan mencetak properti `{children}` di bagian tengahnya.
- [ ] Panel navigasi otomatis menandai (*Highlight*) warna hijau zamrud (Emerald) pada menu yang sedang aktif dikunjungi pengguna (*Active Route State*).

---

## Panduan Implementasi Cerdas

### Langkah 1: Merakit Komponen Sidebar Navigasi

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\_components\InventorySidebar.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    PackageSearch, 
    Building2, 
    ArrowDownToLine, 
    ArrowUpFromLine, 
    History 
} from "lucide-react";

const menuItems = [
    { title: "Dashboard", href: "/inventory", icon: LayoutDashboard },
    { title: "Katalog Barang", href: "/inventory/items", icon: PackageSearch },
    { title: "Jaringan Kantor", href: "/inventory/offices", icon: Building2 },
    { title: "Stok Masuk", href: "/inventory/stock-in", icon: ArrowDownToLine },
    { title: "Distribusi Keluar", href: "/inventory/stock-out", icon: ArrowUpFromLine },
    { title: "Riwayat Mutasi", href: "/inventory/transactions", icon: History },
];

export function InventorySidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl hidden md:flex flex-col">
            {/* Header / Kop Sidebar */}
            <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3">
                    <PackageSearch className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="font-bold text-zinc-100 tracking-wide">BKSDA Logistik</h2>
            </div>

            {/* Area Daftar Navigasi */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm ${
                                isActive
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                            }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? "text-emerald-500" : "text-zinc-500"}`} />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Area Pijakan Bawah (Footer Sidebar) */}
            <div className="p-4 border-t border-zinc-800">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-500 text-center">
                    Sistem Manajemen Inventaris<br/>
                    <span className="font-semibold text-zinc-400">Versi 2.0</span>
                </div>
            </div>
        </aside>
    );
}
```

### Langkah 2: Pemasangan Cangkang Rute Layout

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\layout.tsx`

*(Catatan: Pastikan kamu membuatnya tepat di folder `inventory`, jangan sampai menumpuk di folder root `app/layout.tsx`)*.

```tsx
import { ReactNode } from "react";
import { InventorySidebar } from "./_components/InventorySidebar";

export const metadata = {
    title: "Logistik - BKSDA SuperApp",
    description: "Sistem Pengendalian Inventaris dan Stok Barang Milik Negara",
};

export default function InventoryLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            
            {/* Memanggil Komponen Sidebar di sisi Kiri */}
            <InventorySidebar />
            
            {/* Merender isi spesifik setiap Halaman di sisi Kanan */}
            <main className="flex-1 overflow-y-auto relative">
                {children}
            </main>
            
        </div>
    );
}
```

---

## Troubleshooting

### Q: Kenapa *Sidebar*-nya menghilang saat saya buka lewat HP?

**Artinya:** Sketsa desain responsif *(Mobile-first)* bekerja dengan sempurna.
**Solusi:** Di kelas pembungkus `<aside>` pada Sidebar, terdapat perintah sakti Tailwind: `hidden md:flex`. Artinya, menu ini sengaja dihilangkan pada layar telepon demi menghemat ruang (*Responsive Design*). Untuk penanganan UI *Mobile* tingkat lanjut, kamu (atau AI penggantimu kelak) bisa menambahkan *Hamburger Menu* di pojok atas, tapi hal tersebut di luar fokus Issue dasar ini.

### Q: Tombol "Stok Masuk" tidak menyala (Active State) walau sudah saya klik.

**Artinya:** Pendeteksian URL *usePathname* keliru.
**Solusi:** Pastikan parameter rute `href` di `menuItems` diketik Sama Persis secara absolut dengan nama *folder* targetmu (Tanpa garis miring di akhir string, contoh yang salah: `/inventory/stock-in/`).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): frontend layout shell and intelligent active-state sidebar navigation" \
  --body "Perakitan antarmuka pondasi (*Client Layout*) khusus Modul Logistik. Menyiapkan jembatan internal perpindahan 6 pilar halaman utama dengan balutan arsitektur UI Glassmorphism. Detail di docs/issues/053-frontend-inventory-layout.md" \
  --label "frontend,ui,layout,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/053-frontend-inventory-layout
```

### Step 3: Kerjakan

Salin kedua file (Komponen `InventorySidebar` dan `layout.tsx`) secara teliti. Ingat, *Client Component* (Sidebar) tidak bisa disatukan ke dalam satu file yang sama dengan `layout.tsx` (yang secara *default* berstatus Server Component di ranah Next.js 14/15/16). 

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(inventory): frontend layout shell and intelligent active-state sidebar navigation (#53)"
git push -u origin issue/053-frontend-inventory-layout
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): frontend layout shell and intelligent active-state sidebar navigation (#53)" \
  --body "## Summary
Penarikan kerangka dasar perwajahan aplikasi sisi Pengguna. Menyiapkan lumbung halaman bersarang *(Nested Layouting)* khusus trah Logistik.

## Changes
- Pembuatan Komponen Mandiri \`InventorySidebar.tsx\` dengan kaitan interaktif *(React Hook)* \`usePathname\` pelacak URL instan.
- Penerapan cangkang induk \`layout.tsx\` yang mengurung seluruh rute *child* dari \`/inventory/*\`.
- Injeksi aset grafis Ikon \`lucide-react\` dengan warna gradasi *Emerald-Zinc* bertaraf Premium.

## Rules Compliance
- [x] Lolos integrasi estetika BKSDA Design Aesthetics (Tanpa rona warna primitif/polos).

Closes #53" \
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
Modul Logistik BKSDA sisi *Backend* telah usai. Mari bangun sisi visual (*Frontend*) nya. Kita akan mulai dari cangkang navigasinya (`layout.tsx`). 

## Task

Kerjakan Issue #053 (Frontend — Inventory Layout).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/053-frontend-inventory-layout.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat struktur folder penopangnya di Next.js: `frontend/src/app/(dashboard)/inventory/_components/`.
3. Buat dan *copy-paste* blok logika file Sidebar (`InventorySidebar.tsx`) sesuai referensi di atas.
4. Buat file `layout.tsx` (sejajar di folder `inventory/`) lalu rangkai ia sebagai induk pengurung `children`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
