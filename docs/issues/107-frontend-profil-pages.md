# Issue #107 — Frontend — Profil Pages (Jendela Organisasi BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🟡 Medium (Halaman Wajib Setiap Website Pemerintah)
> **Complexity**: 🟢 Simple (Daftar Sederhana + Detail Konten HTML)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #101

---

## Branch

```
issue/107-frontend-profil-pages
```

## Deskripsi

Halaman Profil menampilkan informasi kelembagaan BKSDA — **Visi Misi**, **Tugas dan Fungsi**, **Struktur Organisasi**, **Sejarah**, dan sebagainya. Setiap website pemerintah **wajib** memiliki halaman ini sesuai regulasi keterbukaan informasi publik.

**Perbedaan dari Halaman Berita:**
- Profil bersifat **statis** — jarang berubah, tidak perlu tanggal publikasi.
- Profil tidak memiliki **kategori** atau **pencarian** — jumlah item sedikit (5-10 halaman).
- Profil ditampilkan sebagai **daftar sidebar** di kiri + konten detail di kanan — bukan grid kartu.

**Strategi Layout: Sidebar + Konten**

Karena jumlah item sedikit dan pengunjung biasanya membaca beberapa halaman profil berurutan, kita menggunakan layout **sidebar navigasi** yang menampilkan semua judul profil di sisi kiri. Pengunjung bisa mengklik judul di sidebar tanpa kembali ke halaman daftar.

```
┌──────────────────────────────────────────────┐
│ Sidebar (Daftar)    │  Konten Detail         │
│                     │                        │
│ • Visi Misi    ←── │  [Visi Misi BKSDA]     │
│   Tugas Fungsi      │  Lorem ipsum dolor...  │
│   Struktur          │  ┌─────────────────┐   │
│   Sejarah           │  │ Gambar Thumbnail│   │
│   Wilayah Kerja     │  └─────────────────┘   │
└──────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/profil/`.
- [ ] Tersedia `page.tsx` sebagai redirect/landing ke profil pertama.
- [ ] Tersedia `[slug]/page.tsx` dengan layout sidebar + konten detail.
- [ ] Sidebar menampilkan seluruh judul profil dengan highlight item aktif.
- [ ] Konten HTML ditampilkan via `dangerouslySetInnerHTML`.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Layout Sidebar + Detail
**Path:** `frontend/src/app/(website)/profil/[slug]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Building2, Loader2, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const router = useRouter();

    const [profilList, setProfilList] = useState<any[]>([]);
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Tarik: Daftar semua profil (sidebar) + Detail profil aktif (konten)
    useEffect(() => {
        if (!slug) return;
        setLoading(true);

        Promise.all([
            axios.get(`${API}/cms/public/profil`).then(r => r.data?.data || []),
            axios.get(`${API}/cms/public/profil/${slug}`).then(r => r.data?.data),
        ]).then(([list, det]) => {
            setProfilList(list);
            setDetail(det);
        }).catch(() => {})
          .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!detail) {
        return <div className="text-center py-32 text-gray-400">Halaman profil tidak ditemukan.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Header Mobile */}
            <div className="lg:hidden mb-6">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Building2 className="w-7 h-7 text-green-600" /> Profil
                </h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* ═══ SIDEBAR NAVIGASI ═══ */}
                <aside className="w-full lg:w-72 shrink-0">
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden sticky top-24">
                        {/* Header Sidebar */}
                        <div className="bg-green-700 px-5 py-4">
                            <h2 className="text-white font-black flex items-center gap-2">
                                <Building2 className="w-5 h-5" /> Profil Organisasi
                            </h2>
                        </div>

                        {/* Daftar Link */}
                        <nav className="p-2">
                            {profilList.map(item => {
                                const isActive = item.slug === slug;
                                return (
                                    <Link key={item.id} href={`/profil/${item.slug}`}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                            isActive
                                                ? "bg-green-100 text-green-800 font-bold"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                        }`}>
                                        <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? "text-green-600" : "text-gray-300"}`} />
                                        <span className="line-clamp-1">{item.judul}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* ═══ KONTEN DETAIL ═══ */}
                <article className="flex-1 min-w-0">
                    {/* Thumbnail */}
                    {detail.thumbnail_path && (
                        <div className="h-52 md:h-72 rounded-2xl overflow-hidden shadow-lg mb-6">
                            <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${detail.thumbnail_path}`}
                                alt={detail.judul} className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Judul */}
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900">{detail.judul}</h1>

                    {/* Garis Dekoratif */}
                    <div className="w-16 h-1 bg-green-600 rounded-full mt-3 mb-6" />

                    {/* Konten HTML */}
                    <div className="prose prose-green prose-lg max-w-none text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: detail.konten }} />
                </article>
            </div>
        </div>
    );
}
```

### 2. Cetak Biru Halaman Landing Profil (Redirect Otomatis)
**Path:** `frontend/src/app/(website)/profil/page.tsx`

Halaman ini berfungsi sebagai *landing redirect* — ketika pengunjung mengakses `/profil`, ia otomatis diarahkan ke profil pertama yang tersedia.

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilLandingPage() {
    const router = useRouter();

    useEffect(() => {
        axios.get(`${API}/cms/public/profil`)
            .then(r => {
                const list = r.data?.data || [];
                if (list.length > 0) {
                    // Redirect ke profil pertama
                    router.replace(`/profil/${list[0].slug}`);
                }
            })
            .catch(() => {});
    }, [router]);

    return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
    );
}
```

---

## Troubleshooting

### Q: Sidebar tidak *sticky* — ikut tergulir saat halaman di-scroll!

**Solusi:** Pastikan sidebar memiliki `sticky top-24` DAN parent container menggunakan `flex` (bukan `grid`). Properti `sticky` hanya bekerja jika elemen induknya cukup tinggi dan menggunakan Flexbox atau layout normal.

### Q: Halaman `/profil` menampilkan loading spinner selamanya!

**Solusi:** Fungsi `router.replace()` memerlukan data profil dari API. Jika API belum punya data profil, redirect tidak terjadi dan spinner terus berputar. Tambahkan fallback:
```tsx
if (list.length === 0) {
    // Tidak ada profil — tampilkan pesan kosong
}
```

### Q: Konten HTML dari Rich Text Editor terlihat polos (tanpa styling)!

**Solusi:** Perhatikan kelas `prose prose-green prose-lg` pada container konten. Kelas `prose` berasal dari plugin **Tailwind CSS Typography** (`@tailwindcss/typography`). Plugin ini harus diinstal:
```bash
npm install @tailwindcss/typography
```
Dan didaftarkan di `tailwind.config.ts`:
```ts
plugins: [require("@tailwindcss/typography")]
```

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): deploy sidebar-navigated organizational profile pages with auto-redirect landing" --body "Closes #107" --label "frontend,ui,public-website"
git checkout -b issue/107-frontend-profil-pages
# Kerjakan...
git commit -m "feat(website): deploy sidebar-navigated organizational profile pages (#107)"
git push -u origin issue/107-frontend-profil-pages
gh pr create --title "feat(website): deploy organizational profile pages (#107)" --body "## Changes
- Layout Sidebar+Konten: Navigasi profil di kiri (sticky) + detail HTML di kanan.
- Landing redirect: \`/profil\` otomatis mengarahkan ke profil pertama.
- Sidebar hijau bertema institusi dengan highlight item aktif.
- Garis dekoratif hijau di bawah judul sebagai sentuhan visual.
Closes #107" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Halaman Profil menggunakan layout sidebar+konten (bukan grid kartu). Sidebar menampilkan daftar semua judul profil, konten detail di kanan. Halaman `/profil` otomatis redirect ke profil pertama.

## Task

Kerjakan Issue #107 (Frontend — Profil Pages).
Ikuti instruksi di: `docs/issues/107-frontend-profil-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(website)/profil/` dan `[slug]/`.
3. Pahat `page.tsx` — Landing redirect ke profil pertama.
4. Pahat `[slug]/page.tsx` — Sidebar navigasi + konten detail.
5. PENTING: Sidebar harus `sticky top-24` agar tetap terlihat saat scroll.
6. PENTING: Pastikan `@tailwindcss/typography` terinstal untuk kelas `prose`.
7. Lakukan Git push dan `gh pr create`.
````
