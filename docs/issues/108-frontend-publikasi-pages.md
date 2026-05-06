# Issue #108 — Frontend — Publikasi Pages (Perpustakaan Digital BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🟡 Medium (Penutup Fase 8 — Halaman Terakhir Website Publik)
> **Complexity**: 🟢 Simple (4 Tab + Grid Kartu + Tombol Download)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #101

---

## Branch

```
issue/108-frontend-publikasi-pages
```

## Deskripsi

Halaman Publikasi adalah **perpustakaan digital** BKSDA — tempat masyarakat mengunduh buku, leaflet, poster, dan dokumen regulasi. Empat jenis konten ini digabungkan dalam **satu halaman** menggunakan Tab, karena semuanya memiliki pola tampilan serupa: sampul/thumbnail + judul + tombol download.

**4 Tab Konten:**
1. **📚 Buku** — Buku terbitan BKSDA (sampul + penulis + penerbit + download PDF)
2. **📄 Leaflet** — Brosur informasi (thumbnail + download)
3. **🖼️ Poster** — Poster kampanye konservasi (thumbnail + download)
4. **⚖️ Regulasi** — Peraturan perundangan (nomor + tahun + download PDF)

**Pola Desain Kunci: Kartu Universal dengan Varian**

Keempat tab menampilkan konten dalam bentuk **kartu** yang 90% identik. Perbedaannya hanya di metadata:
- Buku punya **penulis** dan **penerbit**
- Regulasi punya **nomor** dan **tahun**
- Leaflet dan Poster hanya punya **judul** dan **deskripsi**

Kita buat 1 komponen `PublikasiCard` yang menerima props berbeda untuk setiap tipe.

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/publikasi/`.
- [ ] Tersedia `page.tsx` dengan 4 Tab (Buku, Leaflet, Poster, Regulasi).
- [ ] Setiap tab menampilkan grid kartu dengan thumbnail dan tombol download.
- [ ] Tombol download membuka file di tab baru (`target="_blank"`).
- [ ] Tab Regulasi menampilkan nomor dan tahun peraturan.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Halaman Publikasi
**Path:** `frontend/src/app/(website)/publikasi/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { BookOpen, FileImage, Image, Scale, Download, Loader2, ExternalLink } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

// Konfigurasi 4 Tab
const TABS = [
    { key: "buku",    label: "Buku",     icon: BookOpen,  endpoint: "/cms/public/buku" },
    { key: "leaflet", label: "Leaflet",  icon: FileImage, endpoint: "/cms/public/leaflet" },
    { key: "poster",  label: "Poster",   icon: Image,     endpoint: "/cms/public/poster" },
    { key: "regulasi",label: "Regulasi", icon: Scale,     endpoint: "/cms/public/regulasi" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function PublikasiPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("buku");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Tarik data setiap kali tab berubah
    useEffect(() => {
        setLoading(true);
        const tab = TABS.find(t => t.key === activeTab)!;
        axios.get(`${API}${tab.endpoint}`)
            .then(r => setData(r.data?.data || []))
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [activeTab]);

    // Helper: URL file download
    const fileUrl = (path: string | null) => path ? `${STORAGE}/${path}` : null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
                    <BookOpen className="w-9 h-9 text-green-600" /> Publikasi
                </h1>
                <p className="text-gray-500 mt-2">Unduh buku, brosur, poster, dan dokumen regulasi terbitan BKSDA.</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.key
                                    ? "bg-white text-green-700 shadow-md"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}>
                            <Icon className="w-4 h-4" /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Konten Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
            ) : data.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p>Belum ada publikasi {activeTab}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {data.map(item => (
                        <PublikasiCard key={item.id} item={item} type={activeTab} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════
// KOMPONEN KARTU UNIVERSAL (Dipakai Keempat Tab)
// ══════════════════════════════════════════════════

interface CardProps {
    item: any;
    type: TabKey;
}

function PublikasiCard({ item, type }: CardProps) {
    const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

    // Tentukan path thumbnail & file download berdasarkan tipe
    const thumbnailPath = item.thumbnail_path || item.cover_path || item.file_path;
    const downloadPath  = item.file_path;
    const downloadUrl   = downloadPath ? `${STORAGE}/${downloadPath}` : null;

    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
            {/* Thumbnail / Sampul */}
            <div className="h-52 bg-gray-50 overflow-hidden">
                {thumbnailPath ? (
                    <img src={`${STORAGE}/${thumbnailPath}`} alt={item.judul}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-200" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{item.judul}</h3>

                {/* Metadata Spesifik per Tipe */}
                {type === "buku" && (
                    <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                        {item.penulis && <p>✍️ {item.penulis}</p>}
                        {item.penerbit && <p>🏢 {item.penerbit}</p>}
                        {item.tahun_terbit && <p>📅 {item.tahun_terbit}</p>}
                    </div>
                )}

                {type === "regulasi" && (
                    <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                        {item.nomor && <p>📜 No. {item.nomor}</p>}
                        {item.tahun && <p>📅 Tahun {item.tahun}</p>}
                    </div>
                )}

                {(type === "leaflet" || type === "poster") && item.deskripsi && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{item.deskripsi}</p>
                )}

                {/* Spacer agar tombol selalu di bawah */}
                <div className="flex-1" />

                {/* Tombol Download */}
                {downloadUrl ? (
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all">
                        <Download className="w-4 h-4" /> Unduh
                    </a>
                ) : (
                    <div className="mt-4 flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-4 py-2.5 rounded-xl text-sm cursor-not-allowed">
                        <ExternalLink className="w-4 h-4" /> Tidak Tersedia
                    </div>
                )}
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombol "Unduh" tidak membuka file — malah menampilkan halaman 404!

**Solusi:** Pastikan `NEXT_PUBLIC_STORAGE_URL` mengarah ke URL yang benar. Format biasanya:
```
https://your-project.supabase.co/storage/v1/object/public/uploads
```
Juga pastikan file sudah terupload via CMS Admin (Issue 098-100) dan `file_path` tersimpan di database.

### Q: Kartu tidak rata bawahnya — tombol Download ada yang di atas ada yang di bawah!

**Solusi:** Perhatikan arsitektur Flexbox pada kartu:
```tsx
<div className="... flex flex-col">   {/* Card = flex column */}
    <div>...</div>                     {/* Thumbnail (fixed) */}
    <div className="flex-1 flex flex-col"> {/* Info (grows) */}
        <h3>...</h3>                   {/* Judul */}
        <div className="flex-1" />     {/* SPACER — ini kuncinya! */}
        <a>Unduh</a>                   {/* Tombol (always bottom) */}
    </div>
</div>
```
Elemen `<div className="flex-1" />` adalah **spacer tak terlihat** yang mendorong tombol ke bawah. Tanpa ini, kartu dengan judul pendek akan memiliki tombol lebih tinggi dari kartu dengan judul panjang.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): deploy digital library with tabbed publication browser and universal download cards" --body "Closes #108" --label "frontend,ui,public-website"
git checkout -b issue/108-frontend-publikasi-pages
# Kerjakan...
git commit -m "feat(website): deploy digital library with tabbed publication browser and universal download cards (#108)"
git push -u origin issue/108-frontend-publikasi-pages
gh pr create --title "feat(website): deploy digital publication library (#108)" --body "## Changes
- 4-tab publication browser: Buku, Leaflet, Poster, Regulasi.
- \`PublikasiCard\`: Komponen kartu universal dengan metadata varian per tipe.
- Tombol download membuka file di tab baru (\`target=_blank\`).
- Flexbox spacer trick menjaga tombol selalu rata bawah.
Closes #108" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Halaman Publikasi menggabungkan 4 jenis konten (Buku, Leaflet, Poster, Regulasi) dalam satu halaman menggunakan Tab. Setiap tab menggunakan komponen `PublikasiCard` yang sama dengan metadata varian.

## Task

Kerjakan Issue #108 (Frontend — Publikasi Pages).
Ikuti instruksi di: `docs/issues/108-frontend-publikasi-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(website)/publikasi/`.
3. Pahat `page.tsx` — 4 Tab + PublikasiCard universal + tombol download.
4. PENTING: Gunakan `flex-1` spacer agar tombol download selalu rata bawah di semua kartu.
5. PENTING: Gunakan `axios` biasa (BUKAN `api` dari lib) — ini halaman publik.
6. Lakukan Git push dan `gh pr create`.
````
