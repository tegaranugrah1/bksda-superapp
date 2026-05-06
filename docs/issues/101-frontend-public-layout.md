# Issue #101 — Frontend — PublicLayout (Kerangka Website Publik BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🔴 Critical (Cangkang Pembungkus Seluruh Halaman Publik)
> **Complexity**: 🟡 Medium (Navbar Responsif + Footer Multi-Kolom + API Menu Dinamis)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #094 (PublicController API)

---

## Branch

```
issue/101-frontend-public-layout
```

## Deskripsi

Selamat datang di **Fase 8: Website Publik BKSDA**! 🌐

Selama Fase 1-7, kita membangun *"Dapur Belakang"* (Panel Admin). Kini saatnya membangun *"Ruang Tamu"* — website yang dilihat oleh **jutaan masyarakat Indonesia**. Halaman ini menampilkan berita, galeri, profil organisasi, kawasan konservasi, dan regulasi.

**Arsitektur Routing Next.js:**
```
src/app/
├── page.tsx                   ← Landing page (route: /)
├── (website)/                 ← Route Group (TIDAK masuk URL!)
│   ├── layout.tsx             ← PublicLayout: Navbar + Footer ← INI YANG KITA BANGUN
│   ├── informasi/page.tsx     ← route: /informasi
│   ├── kawasan/page.tsx       ← route: /kawasan
│   ├── galeri/page.tsx        ← route: /galeri
│   ├── profil/page.tsx        ← route: /profil
│   └── tsl/page.tsx           ← route: /tsl
```

Perhatikan folder `(website)` menggunakan tanda kurung! Ini adalah fitur **Route Group** dari Next.js — folder ini **tidak ikut masuk** ke URL. Jadi pengunjung tetap mengakses `/informasi`, bukan `/website/informasi`.

**`layout.tsx` di dalam `(website)/`** akan membungkus SEMUA halaman publik dengan:
1. **Navbar** — Logo, menu navigasi (dari API), tombol pencarian
2. **Footer** — Kontak, sosial media, tautan terkait (dari API)

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/`.
- [ ] Tersedia `layout.tsx` yang membungkus halaman publik dengan Navbar dan Footer.
- [ ] Navbar menarik data menu dari API: `GET /api/cms/public/menus?posisi=header`.
- [ ] Footer menarik data dari API: `GET /api/cms/public/website` + `GET /api/cms/public/links`.
- [ ] Navbar responsif (hamburger menu di mobile).
- [ ] Logo dan nama instansi ditampilkan di Navbar.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Navbar Publik
**Path:** `frontend/src/app/(website)/_components/PublicNavbar.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface MenuItem {
    id: string;
    label: string;
    url: string;
    children?: MenuItem[];
}

export default function PublicNavbar() {
    const pathname = usePathname();
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Tarik menu dari API publik (TANPA token auth!)
    useEffect(() => {
        axios.get(`${API_BASE}/cms/public/menus?posisi=header`)
            .then(res => setMenus(res.data?.data || []))
            .catch(() => {
                // Fallback jika API belum siap
                setMenus([
                    { id: "1", label: "Beranda", url: "/" },
                    { id: "2", label: "Informasi", url: "/informasi" },
                    { id: "3", label: "Kawasan", url: "/kawasan" },
                    { id: "4", label: "Galeri", url: "/galeri" },
                    { id: "5", label: "Profil", url: "/profil" },
                    { id: "6", label: "TSL", url: "/tsl" },
                    { id: "7", label: "Publikasi", url: "/publikasi" },
                ]);
            });
    }, []);

    const isActive = (url: string) => pathname === url || (url !== "/" && pathname.startsWith(url));

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
            {/* Bar Atas (Info Strip) */}
            <div className="bg-green-800 text-white text-xs py-1.5">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <span>Balai Konservasi Sumber Daya Alam</span>
                    <span className="hidden sm:block">📞 (021) 123-4567</span>
                </div>
            </div>

            {/* Navbar Utama */}
            <nav className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo + Nama */}
                    <Link href="/" className="flex items-center gap-3 shrink-0">
                        <img src="/assets/logo_bksda.png" alt="Logo BKSDA" className="h-10 w-10 object-contain" />
                        <div className="hidden sm:block">
                            <p className="text-sm font-black text-green-800 leading-tight">BKSDA</p>
                            <p className="text-[10px] text-gray-500 leading-tight">Kementerian LHK RI</p>
                        </div>
                    </Link>

                    {/* Menu Desktop */}
                    <div className="hidden lg:flex items-center gap-1">
                        {menus.map(item => (
                            <div key={item.id} className="relative group">
                                <Link href={item.url}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                        isActive(item.url)
                                            ? "text-green-700 bg-green-50"
                                            : "text-gray-600 hover:text-green-700 hover:bg-green-50/50"
                                    }`}>
                                    {item.label}
                                    {item.children && item.children.length > 0 && <ChevronDown className="w-3 h-3" />}
                                </Link>
                                {/* Dropdown Sub-Menu */}
                                {item.children && item.children.length > 0 && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                        {item.children.map(child => (
                                            <Link key={child.id} href={child.url}
                                                className="block px-4 py-2 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors">
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Tombol Hamburger Mobile */}
                    <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                        {mobileOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
                    </button>
                </div>

                {/* Menu Mobile (Slide Down) */}
                {mobileOpen && (
                    <div className="lg:hidden border-t border-gray-100 py-3 animate-in slide-in-from-top duration-200">
                        {menus.map(item => (
                            <Link key={item.id} href={item.url} onClick={() => setMobileOpen(false)}
                                className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                                    isActive(item.url) ? "text-green-700 bg-green-50" : "text-gray-600 hover:bg-gray-50"
                                }`}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}
            </nav>
        </header>
    );
}
```

### 2. Cetak Biru Footer Publik
**Path:** `frontend/src/app/(website)/_components/PublicFooter.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function PublicFooter() {
    const [website, setWebsite] = useState<any>(null);
    const [links, setLinks] = useState<any[]>([]);

    useEffect(() => {
        axios.get(`${API_BASE}/cms/public/website`).then(r => setWebsite(r.data?.data)).catch(() => {});
        axios.get(`${API_BASE}/cms/public/links`).then(r => setLinks(r.data?.data || [])).catch(() => {});
    }, []);

    return (
        <footer className="bg-green-900 text-white">
            {/* Kolom Utama */}
            <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Kolom 1: Tentang */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <img src="/assets/logo_bksda.png" alt="Logo" className="h-10 w-10 object-contain brightness-200" />
                        <p className="font-black text-lg">{website?.nama_instansi || "BKSDA"}</p>
                    </div>
                    <p className="text-green-200 text-sm leading-relaxed">{website?.tentang || "Balai Konservasi Sumber Daya Alam — Kementerian Lingkungan Hidup dan Kehutanan Republik Indonesia."}</p>
                </div>

                {/* Kolom 2: Kontak */}
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-green-300">Kontak</h4>
                    <ul className="space-y-2 text-sm text-green-200">
                        {website?.alamat && <li>📍 {website.alamat}</li>}
                        {website?.telepon && <li>📞 {website.telepon}</li>}
                        {website?.email && <li>✉️ {website.email}</li>}
                        {website?.fax && <li>📠 Fax: {website.fax}</li>}
                    </ul>
                    {/* Sosial Media */}
                    <div className="flex gap-3 mt-4">
                        {website?.facebook && <a href={website.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-green-800 flex items-center justify-center hover:bg-green-700 transition-colors text-sm">FB</a>}
                        {website?.instagram && <a href={website.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-green-800 flex items-center justify-center hover:bg-green-700 transition-colors text-sm">IG</a>}
                        {website?.youtube && <a href={website.youtube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-green-800 flex items-center justify-center hover:bg-green-700 transition-colors text-sm">YT</a>}
                    </div>
                </div>

                {/* Kolom 3: Link Terkait */}
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-green-300">Link Terkait</h4>
                    <ul className="space-y-2">
                        {links.map(link => (
                            <li key={link.id}>
                                <a href={link.url} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-green-200 hover:text-white transition-colors flex items-center gap-2">
                                    {link.logo_path && <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${link.logo_path}`} alt="" className="w-4 h-4 object-contain" />}
                                    {link.judul}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-green-800 py-4">
                <p className="text-center text-xs text-green-400">
                    © {new Date().getFullYear()} {website?.nama_instansi || "BKSDA"} — Kementerian LHK RI. Hak Cipta Dilindungi.
                </p>
            </div>
        </footer>
    );
}
```

### 3. Cetak Biru Layout Pembungkus
**Path:** `frontend/src/app/(website)/layout.tsx`

```tsx
import PublicNavbar from "./_components/PublicNavbar";
import PublicFooter from "./_components/PublicFooter";

export const metadata = {
    title: "BKSDA — Balai Konservasi Sumber Daya Alam",
    description: "Website resmi Balai Konservasi Sumber Daya Alam — Kementerian Lingkungan Hidup dan Kehutanan Republik Indonesia.",
};

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <PublicNavbar />
            <main className="flex-1">{children}</main>
            <PublicFooter />
        </div>
    );
}
```

---

## Troubleshooting

### Q: Navbar memanggil API dengan token Auth padahal ini halaman publik!

**Solusi:** Perhatikan bahwa Navbar menggunakan `axios` biasa (bukan `api` dari `@/lib/api`). Ini sengaja! Pustaka `api` memiliki interceptor yang menyuntikkan Bearer Token. Halaman publik TIDAK boleh mengirim token karena pengunjung tidak punya akun. Selalu gunakan `axios` biasa untuk API publik.

### Q: Menu Navbar kosong saat pertama kali deploy!

**Solusi:** Admin belum mengisi data menu via CMS Admin Panel. Perhatikan kode Navbar memiliki **fallback statis** di blok `.catch()` yang menampilkan menu default. Setelah Admin mengisi menu, data API akan menggantikan fallback tersebut.

---

## Git Workflow (Professional)

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): construct responsive public layout with API-driven navbar and multi-column footer" --body "Closes #101" --label "frontend,ui,public-website"
git checkout -b issue/101-frontend-public-layout
# Kerjakan...
git commit -m "feat(website): construct responsive public layout with API-driven navbar and multi-column footer (#101)"
git push -u origin issue/101-frontend-public-layout
gh pr create --title "feat(website): construct responsive public layout with API-driven navbar and footer (#101)" --body "## Changes
- PublicNavbar: Menu dinamis dari API + dropdown sub-menu + hamburger mobile + info strip hijau.
- PublicFooter: 3 kolom (Tentang, Kontak+Sosmed, Link Terkait) dari API + copyright dinamis.
- Layout: Pembungkus Navbar+Footer dengan SEO metadata.
Closes #101" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Fase 8: Website Publik BKSDA. Halaman publik harus dibungkus Navbar dan Footer. Data menu/kontak diambil dari API publik TANPA token auth. Gunakan `axios` biasa, BUKAN `api` dari `@/lib/api`.

## Task

Kerjakan Issue #101 (Frontend — PublicLayout).
Ikuti instruksi di: `docs/issues/101-frontend-public-layout.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(website)/` dan `_components/`.
3. Pahat `PublicNavbar.tsx` — Menu dari API + fallback statis + hamburger mobile.
4. Pahat `PublicFooter.tsx` — 3 kolom dari API + copyright.
5. Pahat `layout.tsx` — Pembungkus dengan SEO metadata.
6. PENTING: Gunakan `axios` biasa untuk API publik, BUKAN `api` dari lib!
7. Lakukan Git push dan `gh pr create`.
````
