# Issue #097 — Frontend — CMS Admin Layout & Dashboard (Markas Besar Pengelola Website)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-cms`
> **Priority**: 🔴 Critical (Layar Pertama Setelah Admin Masuk ke Modul CMS)
> **Complexity**: 🟡 Medium (Sidebar Terbesar: 14 Tautan Navigasi + Dashboard Statistik)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #096, Issue #087 (Pola Layout DeReporting)

---

## Branch

```
issue/097-frontend-cms-layout-dashboard
```

## Deskripsi

Selamat datang di **Markas Besar CMS** — ruang komando paling luas dan paling sibuk di seluruh SuperApp BKSDA! 🏛️

Modul CMS mengelola 16 entitas konten — jauh lebih banyak dibanding BMN (6 entitas) atau DeReporting (7 entitas). Oleh karena itu, Sidebar navigasinya akan menjadi yang **terpanjang** dan membutuhkan pengelompokan visual agar Admin tidak tenggelam dalam lautan tautan.

**Strategi UX Sidebar:**
Kita akan memecah 14 tautan navigasi ke dalam **4 Kelompok Bertema** yang dipisahkan oleh garis dan label pemisah (*Section Dividers*):
1. **Umum**: Dashboard, Berita, Kategori
2. **Institusi**: Profil, Kawasan, TSL, Kepala
3. **Media**: Foto, Video, Link Terkait
4. **Publikasi**: Buku, Leaflet, Poster, Regulasi

**Identitas Warna: Teal/Cyan (`teal-500`)**
Setiap modul BKSDA memiliki warna khas:
- Kepegawaian = Slate
- BMN = Emerald
- DeReporting = Violet
- **CMS = Teal** 🟢

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(dashboard)/cms/`.
- [ ] Tersedia `layout.tsx` dengan Sidebar 14 tautan yang dikelompokkan dalam 4 seksi bertema.
- [ ] Tersedia `page.tsx` (Dashboard) dengan kartu statistik (Total Berita, Foto, Video, Pesan Belum Dibaca, dll).
- [ ] Sidebar memiliki *Section Dividers* (label pemisah) untuk membedakan kelompok navigasi.
- [ ] Warna aksen konsisten: `teal-500` / `teal-400`.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Sidebar Raksasa (Layout)
**Path:** `frontend/src/app/(dashboard)/cms/layout.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Newspaper, Tag, Building2, MapPin, TreePine,
    UserCircle, Camera, Video, LinkIcon, BookOpen, FileImage,
    Image, Scale, Settings, Inbox
} from "lucide-react";

// Definisi Navigasi dengan Kelompok Bertema
const SIDEBAR_SECTIONS = [
    {
        label: "Umum",
        items: [
            { href: "/cms",           label: "Dashboard",  icon: LayoutDashboard },
            { href: "/cms/informasi", label: "Berita",     icon: Newspaper },
            { href: "/cms/categories",label: "Kategori",   icon: Tag },
            { href: "/cms/pesan",     label: "Pesan Masuk",icon: Inbox },
        ],
    },
    {
        label: "Institusi",
        items: [
            { href: "/cms/profil",  label: "Profil",       icon: Building2 },
            { href: "/cms/kawasan", label: "Kawasan",       icon: MapPin },
            { href: "/cms/tsl",     label: "TSL",           icon: TreePine },
            { href: "/cms/kepala",  label: "Kepala Kantor", icon: UserCircle },
        ],
    },
    {
        label: "Media",
        items: [
            { href: "/cms/photos", label: "Galeri Foto", icon: Camera },
            { href: "/cms/videos", label: "Galeri Video", icon: Video },
            { href: "/cms/links",  label: "Link Terkait", icon: LinkIcon },
        ],
    },
    {
        label: "Publikasi",
        items: [
            { href: "/cms/buku",     label: "Buku",     icon: BookOpen },
            { href: "/cms/leaflet",  label: "Leaflet",  icon: FileImage },
            { href: "/cms/poster",   label: "Poster",   icon: Image },
            { href: "/cms/regulasi", label: "Regulasi",  icon: Scale },
        ],
    },
];

export default function CMSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-zinc-950">
            {/* Sidebar Navigasi Raksasa */}
            <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 gap-0.5 overflow-y-auto">
                {/* Header Modul */}
                <div className="flex items-center gap-3 px-3 py-4 mb-2">
                    <Settings className="w-7 h-7 text-teal-500" />
                    <h2 className="text-lg font-black text-white tracking-tight">CMS Panel</h2>
                </div>

                {/* Render Kelompok Navigasi */}
                {SIDEBAR_SECTIONS.map((section, sIdx) => (
                    <div key={section.label} className={sIdx > 0 ? "mt-4" : ""}>
                        {/* Label Pemisah Seksi */}
                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                            {section.label}
                        </p>
                        {section.items.map((item) => {
                            const isActive = pathname === item.href
                                || (item.href !== "/cms" && pathname.startsWith(item.href));
                            return (
                                <Link key={item.href} href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                        isActive
                                            ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                            : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                    }`}>
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </aside>

            {/* Konten Utama */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
```

### 2. Cetak Biru Dashboard Statistik Konten
**Path:** `frontend/src/app/(dashboard)/cms/page.tsx`

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Newspaper, Camera, Video, Inbox, BookOpen, MapPin,
    TreePine, Scale, Loader2, Settings
} from "lucide-react";

export default function CMSDashboardPage() {
    // Penarikan Statistik Paralel (Promise.all untuk kecepatan)
    const { data: stats, isLoading } = useQuery({
        queryKey: ["cms-dashboard-stats"],
        queryFn: async () => {
            const endpoints = [
                { key: "informasi", url: "/cms/admin/informasi" },
                { key: "photos",    url: "/cms/admin/photos" },
                { key: "videos",    url: "/cms/admin/videos" },
                { key: "pesan",     url: "/cms/admin/pesan?is_read=false" },
                { key: "buku",      url: "/cms/admin/buku" },
                { key: "kawasan",   url: "/cms/admin/kawasan" },
                { key: "tsl",       url: "/cms/admin/tsl" },
                { key: "regulasi",  url: "/cms/admin/regulasi" },
            ];

            const results = await Promise.all(
                endpoints.map(ep =>
                    api.get(ep.url, { params: { per_page: 1 } }) // Hanya ambil meta, bukan data
                       .then(res => ({ key: ep.key, total: res.data?.total || res.data?.data?.length || 0 }))
                       .catch(() => ({ key: ep.key, total: 0 }))
                )
            );

            // Konversi array ke object { informasi: 42, photos: 15, ... }
            return Object.fromEntries(results.map(r => [r.key, r.total]));
        },
    });

    const STAT_CARDS = [
        { label: "Total Berita",        value: stats?.informasi ?? 0, icon: Newspaper, color: "teal" },
        { label: "Galeri Foto",         value: stats?.photos ?? 0,    icon: Camera,    color: "cyan" },
        { label: "Galeri Video",        value: stats?.videos ?? 0,    icon: Video,     color: "blue" },
        { label: "Pesan Belum Dibaca",  value: stats?.pesan ?? 0,     icon: Inbox,     color: "rose" },
        { label: "Buku Publikasi",      value: stats?.buku ?? 0,      icon: BookOpen,  color: "violet" },
        { label: "Kawasan Konservasi",  value: stats?.kawasan ?? 0,   icon: MapPin,    color: "emerald" },
        { label: "Spesies TSL",         value: stats?.tsl ?? 0,       icon: TreePine,  color: "lime" },
        { label: "Dokumen Regulasi",    value: stats?.regulasi ?? 0,  icon: Scale,     color: "amber" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-teal-500" /> CMS Dashboard
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">
                    Ikhtisar seluruh konten website publik BKSDA yang Anda kelola.
                </p>
            </div>

            {/* Grid Kartu Statistik */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {STAT_CARDS.map((card) => (
                        <div key={card.label}
                            className={`bg-${card.color}-500/5 border border-${card.color}-500/15 rounded-2xl p-5 flex items-start gap-4 transition-all hover:scale-[1.02] hover:border-${card.color}-500/30`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${card.color}-500/10`}>
                                <card.icon className={`w-6 h-6 text-${card.color}-400`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white">{card.value}</p>
                                <p className="text-xs text-zinc-400 font-medium mt-0.5">{card.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Panduan Cepat */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Panduan Cepat</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                        <p className="font-bold text-teal-400 mb-1">📰 Menulis Berita</p>
                        <p className="text-zinc-500">Buka menu <strong>Berita</strong>, klik tombol <strong>Tambah</strong>, isi konten lalu klik <strong>Terbitkan</strong>.</p>
                    </div>
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                        <p className="font-bold text-teal-400 mb-1">📸 Mengunggah Foto</p>
                        <p className="text-zinc-500">Buka menu <strong>Galeri Foto</strong>, seret file ke area unggah, lalu beri judul dan album.</p>
                    </div>
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                        <p className="font-bold text-teal-400 mb-1">⚙️ Pengaturan Website</p>
                        <p className="text-zinc-500">Klik ikon <strong>⚙️ di Sidebar</strong> untuk mengubah logo, alamat, dan tautan sosial media.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Sidebar terlalu panjang, sebagian tautan terpotong di layar kecil!

**Artinya:** Konten Sidebar melebihi tinggi layar.
**Solusi:** Perhatikan kelas `overflow-y-auto` di elemen `<aside>`. Kelas ini memastikan Sidebar bisa di-*scroll* secara independen tanpa menggulir seluruh halaman. Jika kamu tidak menambahkan kelas ini, tautan paling bawah (Regulasi, Poster) akan tenggelam tak terlihat!

### Q: Kartu statistik menunjukkan angka 0 semua padahal data sudah ada!

**Artinya:** Format respons API tidak sesuai ekspektasi.
**Solusi:** Dashboard mengambil angka dari `res.data?.total` (format Laravel Paginate). Pastikan Backend mengembalikan `paginate()` (bukan `get()`), karena hanya `paginate()` yang menyertakan properti `total` di dalam respons JSON.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): construct sectioned sidebar layout and 8-metric content analytics dashboard" \
  --body "Membangun Markas Besar Panel Admin CMS. Mendirikan Sidebar terbesar (14 tautan, 4 seksi bertema) dan Dashboard 8 metrik konten. Detail di docs/issues/097-frontend-cms-layout-dashboard.md" \
  --label "frontend,ui,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/097-frontend-cms-layout-dashboard
```

### Step 3: Kerjakan

Pahat `layout.tsx` (Sidebar) dan `page.tsx` (Dashboard) secara berurutan. Perhatikan struktur data `SIDEBAR_SECTIONS` yang menggunakan array berlapis untuk menghasilkan kelompok navigasi visual.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(cms): construct sectioned sidebar layout and 8-metric content analytics dashboard (#97)"
git push -u origin issue/097-frontend-cms-layout-dashboard
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): construct sectioned sidebar layout and 8-metric content analytics dashboard (#97)" \
  --body "## Summary
Pembangunan Markas Besar Panel Admin CMS dengan Sidebar Terseksi dan Dashboard Analitis.

## Changes
- Penciptaan \`layout.tsx\` dengan Sidebar 14 tautan yang dikelompokkan dalam 4 seksi bertema (Umum, Institusi, Media, Publikasi) menggunakan pola \`SIDEBAR_SECTIONS\` array berlapis.
- Pembuatan Dashboard 8 metrik yang memanggil 8 endpoint paralel (\`Promise.all\`) untuk menghitung volume konten real-time.
- Penambahan panel Panduan Cepat *(Quick Start Guide)* di bawah statistik untuk membantu Admin baru.

## Rules Compliance
- [x] Lolos Doktrin Identitas Modul: Warna aksen Teal (\`teal-500\`) diterapkan konsisten di seluruh elemen CMS.

Closes #97" \
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
Modul CMS memiliki 14 tautan navigasi — paling banyak di seluruh SuperApp. Sidebar harus dikelompokkan dalam seksi bertema agar Admin tidak bingung. Warna aksen CMS: **Teal** (`teal-500`).

## Task

Kerjakan Issue #097 (Frontend — CMS Admin Layout & Dashboard).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/097-frontend-cms-layout-dashboard.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(dashboard)/cms/`.
3. Pahat `layout.tsx` — Perhatikan struktur `SIDEBAR_SECTIONS` (array-in-array) dan kelas `overflow-y-auto` pada aside.
4. Pahat `page.tsx` — Perhatikan `Promise.all` yang memanggil 8 endpoint sekaligus.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
