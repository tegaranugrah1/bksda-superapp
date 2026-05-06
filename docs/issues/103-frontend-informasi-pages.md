# Issue #103 — Frontend — Informasi / Berita Pages (Portal Berita Publik BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🔴 Critical (Halaman Paling Sering Dikunjungi Masyarakat)
> **Complexity**: 🟡 Medium (Daftar + Detail + Filter Kategori + SEO Slug)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash
> **Dependencies**: Issue #101

---

## Branch

```
issue/103-frontend-informasi-pages
```

## Deskripsi

Halaman Berita / Informasi adalah **halaman terpopuler** di website pemerintah manapun. Di sinilah masyarakat membaca Siaran Pers, Pengumuman, dan kegiatan BKSDA. Menurut data website pemerintah pada umumnya, halaman berita menyumbang 60-70% dari total kunjungan.

**Struktur Halaman:**
1. **`/informasi`** — Daftar berita dengan filter Kategori + Pencarian + Pagination
2. **`/informasi/[slug]`** — Detail berita lengkap (konten HTML + sidebar berita terkait)

**Fitur Kunci:**
- **Filter Tab Kategori**: Pengunjung bisa menyaring berita berdasarkan "Siaran Pers", "Pengumuman", "Kegiatan", dll.
- **Slug URL yang Ramah SEO**: URL berita berbentuk `/informasi/bksda-lepasliarkan-5-elang-jawa`, bukan `/informasi/abc123-uuid`.
- **Sidebar Berita Terkait**: Di halaman detail, sidebar kanan menampilkan 5 berita lainnya agar pengunjung terus membaca.

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/informasi/`.
- [ ] Tersedia `page.tsx` (Daftar Berita) dengan filter Kategori + Pencarian + Pagination.
- [ ] Tersedia `[slug]/page.tsx` (Detail Berita) dengan konten HTML + sidebar berita terbaru.
- [ ] Tanggal ditampilkan dalam format Indonesia: "6 Mei 2026".
- [ ] Menggunakan `axios` biasa (publik, BUKAN `api` dari lib).

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Daftar Berita
**Path:** `frontend/src/app/(website)/informasi/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Newspaper, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InformasiListPage() {
    const [berita, setBerita] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("");

    // Tarik daftar Kategori (sekali saat halaman dimuat)
    useEffect(() => {
        axios.get(`${API}/cms/public/categories?tipe=informasi`)
            .then(r => setCategories(r.data?.data || []))
            .catch(() => {});
    }, []);

    // Tarik daftar Berita (setiap kali filter/page berubah)
    useEffect(() => {
        setLoading(true);
        const params: any = { page };
        if (search) params.search = search;
        if (activeCategory) params.category_slug = activeCategory;

        axios.get(`${API}/cms/public/informasi`, { params })
            .then(r => {
                setBerita(r.data?.data || []);
                setLastPage(r.data?.last_page || 1);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, search, activeCategory]);

    // Debounce pencarian (tunggu 500ms setelah berhenti mengetik)
    const [searchInput, setSearchInput] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
                    <Newspaper className="w-9 h-9 text-green-600" /> Informasi & Berita
                </h1>
                <p className="text-gray-500 mt-2">Siaran pers, pengumuman, dan kegiatan terbaru BKSDA.</p>
            </div>

            {/* Bar Filter: Kategori + Pencarian */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                {/* Tab Kategori */}
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setActiveCategory(""); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            !activeCategory ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
                        }`}>
                        Semua
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => { setActiveCategory(cat.slug); setPage(1); }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeCategory === cat.slug ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
                            }`}>
                            {cat.nama}
                        </button>
                    ))}
                </div>
                {/* Pencarian */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        placeholder="Cari judul berita..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all" />
                </div>
            </div>

            {/* Grid Berita */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
            ) : berita.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p>Tidak ada berita yang ditemukan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {berita.map(item => (
                        <Link key={item.id} href={`/informasi/${item.slug}`}
                            className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                            {/* Thumbnail */}
                            <div className="h-48 bg-gray-100 overflow-hidden">
                                {item.thumbnail_path ? (
                                    <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt={item.judul}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-green-50">
                                        <Newspaper className="w-12 h-12 text-green-200" />
                                    </div>
                                )}
                            </div>
                            {/* Meta */}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    {item.category && (
                                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase">
                                            {item.category.nama}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">{item.published_at ? formatDate(item.published_at) : ""}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                                    {item.judul}
                                </h3>
                                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                                    👁️ {item.views_count || 0} kali dibaca
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        <ChevronLeft className="w-4 h-4" /> Sebelumnya
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-500">Hal. {page} / {lastPage}</span>
                    <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        Selanjutnya <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
```

### 2. Cetak Biru Halaman Detail Berita
**Path:** `frontend/src/app/(website)/informasi/[slug]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Newspaper, ArrowLeft, Calendar, Eye, User, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InformasiDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const [berita, setBerita] = useState<any>(null);
    const [terbaru, setTerbaru] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        // Tarik detail + berita terbaru secara paralel
        Promise.all([
            axios.get(`${API}/cms/public/informasi/${slug}`).then(r => r.data?.data),
            axios.get(`${API}/cms/public/informasi/terbaru`).then(r => r.data?.data || []),
        ]).then(([detail, recent]) => {
            setBerita(detail);
            // Jangan tampilkan berita ini sendiri di sidebar
            setTerbaru(recent.filter((r: any) => r.slug !== slug));
        }).catch(() => {}).finally(() => setLoading(false));
    }, [slug]);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
    if (!berita) return <div className="text-center py-32 text-gray-400">Berita tidak ditemukan.</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Navigasi Kembali */}
            <Link href="/informasi" className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600 mb-6">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Berita
            </Link>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Kolom Utama (Konten Berita) */}
                <article className="flex-1 min-w-0">
                    {/* Thumbnail */}
                    {berita.thumbnail_path && (
                        <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg mb-6">
                            <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${berita.thumbnail_path}`} alt={berita.judul}
                                className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Kategori Badge */}
                    {berita.category && (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase">
                            {berita.category.nama}
                        </span>
                    )}

                    {/* Judul */}
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 mt-3 leading-tight">{berita.judul}</h1>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                        {berita.published_at && (
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(berita.published_at)}</span>
                        )}
                        {berita.author && (
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {berita.author.name}</span>
                        )}
                        <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {berita.views_count || 0} kali dibaca</span>
                        {berita.sumber && (
                            <span className="text-gray-400">Sumber: {berita.sumber}</span>
                        )}
                    </div>

                    {/* Garis Pemisah */}
                    <hr className="my-6 border-gray-200" />

                    {/* Konten HTML */}
                    <div className="prose prose-green prose-lg max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: berita.konten }} />
                </article>

                {/* Sidebar: Berita Terbaru */}
                <aside className="w-full lg:w-80 shrink-0">
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 sticky top-24">
                        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                            <Newspaper className="w-5 h-5 text-green-600" /> Berita Lainnya
                        </h3>
                        <div className="space-y-4">
                            {terbaru.map(item => (
                                <Link key={item.id} href={`/informasi/${item.slug}`}
                                    className="flex items-start gap-3 group">
                                    <div className="w-16 h-16 rounded-lg bg-green-100 overflow-hidden shrink-0">
                                        {item.thumbnail_path ? (
                                            <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt=""
                                                className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Newspaper className="w-5 h-5 text-green-300" /></div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                                            {item.judul}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{item.published_at ? formatDate(item.published_at) : ""}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Filter Kategori tidak bekerja — semua berita tetap muncul!

**Solusi:** Pastikan parameter yang dikirim ke API bernama `category_slug` (bukan `category_id`). Backend `PublicController@informasiIndex` (Issue 094) mencari berdasarkan slug kategori menggunakan `whereHas`.

### Q: Sidebar Berita Terbaru menampilkan berita yang sedang dibaca!

**Solusi:** Perhatikan filter: `recent.filter((r: any) => r.slug !== slug)`. Baris ini menyaring berita yang sedang ditampilkan agar tidak muncul di sidebar. Jika kamu lupa filter ini, berita yang sama akan tampil ganda.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): deploy public news portal with category filtering and related articles sidebar" --body "Closes #103" --label "frontend,ui,public-website"
git checkout -b issue/103-frontend-informasi-pages
# Kerjakan...
git commit -m "feat(website): deploy public news portal with category filtering and related articles sidebar (#103)"
git push -u origin issue/103-frontend-informasi-pages
gh pr create --title "feat(website): deploy public news portal with filtering and sidebar (#103)" --body "## Changes
- Daftar Berita: Grid 3-kolom + filter tab Kategori + pencarian debounced + pagination.
- Detail Berita: Konten HTML + thumbnail hero + metadata (tanggal, penulis, views) + sidebar berita terbaru.
- Self-exclusion filter: Berita yang sedang dibaca otomatis dikeluarkan dari sidebar.
Closes #103" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Halaman Berita Publik adalah halaman terpopuler website BKSDA. Butuh filter Kategori (tab), pencarian debounced, pagination, dan sidebar berita terkait di halaman detail. Gunakan `axios` biasa (BUKAN `api` dari lib).

## Task

Kerjakan Issue #103 (Frontend — Informasi Pages).
Ikuti instruksi di: `docs/issues/103-frontend-informasi-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(website)/informasi/` dan `[slug]/`.
3. Pahat `page.tsx` — Daftar berita dengan filter kategori + pencarian + pagination.
4. Pahat `[slug]/page.tsx` — Detail berita dengan konten HTML + sidebar berita terbaru.
5. PENTING: Gunakan `axios` biasa untuk semua API call (halaman publik).
6. Lakukan Git push dan `gh pr create`.
````
