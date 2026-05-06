# Issue #102 — Frontend — Landing Page / Homepage (Wajah Pertama BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🔴 Critical (Halaman Pertama yang Dilihat Jutaan Pengunjung)
> **Complexity**: 🟡 Medium (5 Seksi Visual + 3 Panggilan API Paralel)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #101

---

## Branch

```
issue/102-frontend-landing-page
```

## Deskripsi

Landing Page adalah **pintu gerbang utama** website BKSDA — halaman pertama yang dilihat oleh pengunjung saat mengetik alamat website. Kesan pertama menentukan segalanya!

**Lokasi File:** `frontend/src/app/page.tsx` (Root `/`)

> ⚠️ **Perhatian Arsitektur**: File ini berada di **root** `src/app/`, BUKAN di dalam `(website)/`. Ini disengaja agar Landing Page bisa memiliki layout khusus yang berbeda dari halaman konten biasa. Namun kita tetap mengimpor `PublicNavbar` dan `PublicFooter` secara manual.

**Struktur Visual Landing Page (5 Seksi):**
1. **Hero Banner** — Gambar besar + judul + tagline + tombol CTA
2. **Berita Terbaru** — 4 kartu berita dari API `/informasi/terbaru`
3. **Kawasan Unggulan** — 3 kartu kawasan konservasi dari API `/kawasan`
4. **Spesies Dilindungi** — Carousel TSL dari API `/tsl`
5. **Sambutan Kepala** — Foto + kutipan dari API `/kepala`

---

## Acceptance Criteria

- [ ] File dimutakhirkan: `frontend/src/app/page.tsx`.
- [ ] Tersedia 5 seksi visual yang terlihat profesional dan modern.
- [ ] Data ditarik dari 4 API publik secara paralel (`Promise.all`).
- [ ] Setiap kartu konten memiliki link ke halaman detail.
- [ ] Responsif sempurna di mobile dan desktop.
- [ ] Menggunakan `axios` biasa (BUKAN `api` dari lib) karena ini halaman publik.

---

## Panduan Implementasi Cerdas

**Path:** `frontend/src/app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, MapPin, TreePine, Newspaper, ChevronRight } from "lucide-react";
import PublicNavbar from "./(website)/_components/PublicNavbar";
import PublicFooter from "./(website)/_components/PublicFooter";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LandingPage() {
    const [berita, setBerita] = useState<any[]>([]);
    const [kawasan, setKawasan] = useState<any[]>([]);
    const [tsl, setTsl] = useState<any[]>([]);
    const [kepala, setKepala] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get(`${API}/cms/public/informasi/terbaru`).then(r => r.data?.data || []).catch(() => []),
            axios.get(`${API}/cms/public/kawasan`).then(r => (r.data?.data || []).slice(0, 3)).catch(() => []),
            axios.get(`${API}/cms/public/tsl?per_page=6`).then(r => r.data?.data?.data || r.data?.data || []).catch(() => []),
            axios.get(`${API}/cms/public/kepala`).then(r => r.data?.data).catch(() => null),
        ]).then(([b, k, t, kp]) => {
            setBerita(b);
            setKawasan(k);
            setTsl(t);
            setKepala(kp);
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />

            {/* ═══════════════════════════════════════ */}
            {/* SEKSI 1: HERO BANNER                   */}
            {/* ═══════════════════════════════════════ */}
            <section className="relative h-[520px] md:h-[600px] bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 overflow-hidden">
                {/* Overlay Pola */}
                <div className="absolute inset-0 bg-[url('/assets/header-new.png')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 via-transparent to-transparent" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
                    <p className="text-green-300 text-sm font-bold uppercase tracking-widest mb-3">
                        Kementerian Lingkungan Hidup dan Kehutanan RI
                    </p>
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-3xl">
                        Balai Konservasi<br />Sumber Daya Alam
                    </h1>
                    <p className="text-green-200 mt-4 text-lg max-w-xl leading-relaxed">
                        Menjaga keanekaragaman hayati Indonesia melalui konservasi kawasan hutan, perlindungan satwa liar, dan pemberdayaan masyarakat.
                    </p>
                    <div className="flex gap-3 mt-8">
                        <Link href="/informasi"
                            className="flex items-center gap-2 bg-white text-green-800 px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-50 transition-all shadow-lg">
                            <Newspaper className="w-4 h-4" /> Berita Terbaru
                        </Link>
                        <Link href="/kawasan"
                            className="flex items-center gap-2 bg-green-700/50 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-all border border-green-600/50">
                            <MapPin className="w-4 h-4" /> Jelajahi Kawasan
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ */}
            {/* SEKSI 2: BERITA TERBARU                */}
            {/* ═══════════════════════════════════════ */}
            <section className="max-w-7xl mx-auto px-4 py-16">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">Berita Terbaru</h2>
                        <p className="text-gray-500 text-sm mt-1">Informasi dan siaran pers terkini dari BKSDA.</p>
                    </div>
                    <Link href="/informasi" className="flex items-center gap-1 text-green-700 font-bold text-sm hover:text-green-600">
                        Lihat Semua <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {berita.length === 0 && !loading ? (
                    <p className="text-gray-400 text-center py-12">Belum ada berita.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {berita.slice(0, 4).map(item => (
                            <Link key={item.id} href={`/informasi/${item.slug}`}
                                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="h-44 bg-gray-100 overflow-hidden">
                                    {item.thumbnail_path ? (
                                        <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt={item.judul}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-green-50">
                                            <Newspaper className="w-10 h-10 text-green-200" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <p className="text-xs text-green-600 font-bold mb-1">
                                        {item.published_at ? new Date(item.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                                    </p>
                                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-green-700 transition-colors">
                                        {item.judul}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* ═══════════════════════════════════════ */}
            {/* SEKSI 3: KAWASAN UNGGULAN              */}
            {/* ═══════════════════════════════════════ */}
            <section className="bg-green-50/50 py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Kawasan Konservasi</h2>
                            <p className="text-gray-500 text-sm mt-1">Kawasan hutan lindung yang kami jaga dan kelola.</p>
                        </div>
                        <Link href="/kawasan" className="flex items-center gap-1 text-green-700 font-bold text-sm hover:text-green-600">
                            Semua Kawasan <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {kawasan.map(item => (
                            <Link key={item.id} href={`/kawasan/${item.slug}`}
                                className="group relative h-64 rounded-2xl overflow-hidden shadow-lg">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                                {item.thumbnail_path ? (
                                    <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt={item.nama}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full bg-green-800" />
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                                    <p className="text-green-300 text-xs font-bold uppercase">{item.tipe_kawasan || "Kawasan Konservasi"}</p>
                                    <h3 className="text-white font-black text-lg mt-1">{item.nama}</h3>
                                    {item.luas_ha && <p className="text-green-200 text-xs mt-1">📐 {Number(item.luas_ha).toLocaleString()} Hektar</p>}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ */}
            {/* SEKSI 4: SPESIES DILINDUNGI (TSL)      */}
            {/* ═══════════════════════════════════════ */}
            <section className="max-w-7xl mx-auto px-4 py-16">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">Spesies Dilindungi</h2>
                        <p className="text-gray-500 text-sm mt-1">Tumbuhan dan satwa liar yang kami lindungi.</p>
                    </div>
                    <Link href="/tsl" className="flex items-center gap-1 text-green-700 font-bold text-sm hover:text-green-600">
                        Lihat Semua <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {tsl.slice(0, 6).map(item => (
                        <Link key={item.id} href={`/tsl/${item.slug}`}
                            className="group bg-white border border-gray-100 rounded-2xl overflow-hidden text-center hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="h-32 bg-green-50 overflow-hidden">
                                {item.thumbnail_path ? (
                                    <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt={item.nama_lokal}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><TreePine className="w-8 h-8 text-green-200" /></div>
                                )}
                            </div>
                            <div className="p-3">
                                <p className="font-bold text-gray-900 text-xs line-clamp-1">{item.nama_lokal}</p>
                                <p className="text-[10px] text-gray-400 italic line-clamp-1">{item.nama_latin || ""}</p>
                                {item.status_iucn && (
                                    <span className={`inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded ${
                                        item.status_iucn === "CR" ? "bg-red-100 text-red-600"
                                        : item.status_iucn === "EN" ? "bg-orange-100 text-orange-600"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}>{item.status_iucn}</span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════ */}
            {/* SEKSI 5: SAMBUTAN KEPALA               */}
            {/* ═══════════════════════════════════════ */}
            {kepala && (
                <section className="bg-green-900 text-white py-16">
                    <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10">
                        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-green-600 shrink-0 bg-green-800">
                            {kepala.foto_path ? (
                                <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${kepala.foto_path}`} alt={kepala.nama} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-green-500 text-4xl font-black">
                                    {kepala.nama?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-green-300 text-xs font-bold uppercase tracking-widest mb-2">Sambutan Kepala</p>
                            <p className="text-lg leading-relaxed text-green-100 italic line-clamp-4">
                                "{kepala.sambutan || "Selamat datang di website resmi BKSDA."}"
                            </p>
                            <div className="mt-4">
                                <p className="font-black text-white">{kepala.nama}</p>
                                <p className="text-green-300 text-sm">{kepala.jabatan || "Kepala BKSDA"}</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <PublicFooter />
        </div>
    );
}
```

---

## Troubleshooting

### Q: Landing Page sangat lambat karena 4 API dipanggil berurutan!

**Solusi:** Perhatikan kode menggunakan `Promise.all([...])` — keempat API dipanggil secara **paralel** (bersamaan), bukan berurutan. Jika masing-masing butuh 200ms, total hanya ~200ms (bukan 800ms). Ini adalah optimasi performa paling mendasar!

### Q: Gambar thumbnail tidak muncul!

**Solusi:** Pastikan environment variable `NEXT_PUBLIC_STORAGE_URL` sudah diatur di `.env.local`. Nilainya harus menunjuk ke server penyimpanan file (misal: `https://your-supabase-url.supabase.co/storage/v1/object/public`).

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): construct 5-section landing page with parallel API data fetching" --body "Closes #102" --label "frontend,ui,public-website"
git checkout -b issue/102-frontend-landing-page
# Kerjakan...
git commit -m "feat(website): construct 5-section landing page with parallel API data fetching (#102)"
git push -u origin issue/102-frontend-landing-page
gh pr create --title "feat(website): construct 5-section landing page (#102)" --body "## Changes
- Hero Banner dengan gradient hijau + CTA buttons.
- 4 kartu Berita Terbaru dari API.
- 3 kartu Kawasan Konservasi dengan overlay gradient.
- Grid 6 Spesies TSL dengan badge IUCN berwarna.
- Sambutan Kepala dengan foto circular.
Closes #102" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Landing Page adalah halaman pertama website BKSDA. Harus terlihat profesional dan memuat data dari 4 API publik secara paralel. File berada di root `src/app/page.tsx`, BUKAN di `(website)/`.

## Task

Kerjakan Issue #102 (Frontend — Landing Page).
Ikuti instruksi di: `docs/issues/102-frontend-landing-page.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buka/buat `frontend/src/app/page.tsx`.
3. Pahat 5 seksi visual sesuai cetak biru.
4. PENTING: Gunakan `axios` biasa (publik), BUKAN `api` dari lib!
5. PENTING: Import `PublicNavbar` dan `PublicFooter` secara manual karena file ini di LUAR `(website)/`.
6. Lakukan Git push dan `gh pr create`.
````
