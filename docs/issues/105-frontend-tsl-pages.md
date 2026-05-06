# Issue #105 — Frontend — TSL Pages (Ensiklopedia Spesies Dilindungi)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🟡 Medium (Fitur Edukasi Khas BKSDA — Tidak Dimiliki Website Instansi Lain)
> **Complexity**: 🟢 Simple (Replikasi Pola Informasi Pages + Tab Satwa/Tumbuhan)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #103

---

## Branch

```
issue/105-frontend-tsl-pages
```

## Deskripsi

TSL (Tumbuhan dan Satwa Liar) adalah halaman **paling edukatif** di website BKSDA. Di sinilah pelajar, peneliti, dan pecinta alam menemukan informasi tentang spesies dilindungi seperti Elang Jawa, Orangutan, Rafflesia, dan Kantong Semar.

**Perbedaan Utama dari Halaman Berita (Issue 103):**
- **Tab Filter**: Bukan filter Kategori, melainkan filter `tipe`: **Satwa** vs **Tumbuhan**.
- **Badge IUCN**: Setiap spesies memiliki status konservasi IUCN yang ditampilkan sebagai badge berwarna:
  - **CR** (Critically Endangered) = 🔴 Merah
  - **EN** (Endangered) = 🟠 Oranye
  - **VU** (Vulnerable) = 🟡 Kuning
  - **NT** (Near Threatened) = 🔵 Biru
  - **LC** (Least Concern) = 🟢 Hijau
- **Nama Latin Italic**: Nama ilmiah ditampilkan dengan huruf miring sesuai konvensi ilmiah internasional.

**Struktur Halaman:**
1. **`/tsl`** — Grid spesies dengan tab Satwa/Tumbuhan + pencarian
2. **`/tsl/[slug]`** — Profil spesies lengkap (deskripsi + foto + status IUCN)

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/tsl/`.
- [ ] Tersedia `page.tsx` (Daftar Spesies) dengan tab Satwa/Tumbuhan + pagination.
- [ ] Tersedia `[slug]/page.tsx` (Detail Spesies) dengan badge IUCN berwarna.
- [ ] Nama Latin selalu ditampilkan dalam huruf *italic*.
- [ ] Badge IUCN menggunakan warna yang sesuai standar internasional.

---

## Panduan Implementasi Cerdas

### 0. Fungsi Utilitas Badge IUCN (Dipakai di Kedua Halaman)

Buat helper kecil yang bisa di-copy ke dalam file `page.tsx`:

```tsx
/** Mengembalikan warna CSS untuk badge IUCN */
function getIucnStyle(status: string | null): { bg: string; text: string; label: string } {
    switch (status) {
        case "CR": return { bg: "bg-red-100", text: "text-red-700", label: "Kritis (CR)" };
        case "EN": return { bg: "bg-orange-100", text: "text-orange-700", label: "Terancam (EN)" };
        case "VU": return { bg: "bg-yellow-100", text: "text-yellow-700", label: "Rentan (VU)" };
        case "NT": return { bg: "bg-blue-100", text: "text-blue-700", label: "Hampir Terancam (NT)" };
        case "LC": return { bg: "bg-green-100", text: "text-green-700", label: "Risiko Rendah (LC)" };
        default:   return { bg: "bg-gray-100", text: "text-gray-500", label: "Belum Dinilai" };
    }
}
```

### 1. Cetak Biru Daftar Spesies
**Path:** `frontend/src/app/(website)/tsl/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { TreePine, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

function getIucnStyle(status: string | null) {
    switch (status) {
        case "CR": return { bg: "bg-red-100", text: "text-red-700" };
        case "EN": return { bg: "bg-orange-100", text: "text-orange-700" };
        case "VU": return { bg: "bg-yellow-100", text: "text-yellow-700" };
        case "NT": return { bg: "bg-blue-100", text: "text-blue-700" };
        case "LC": return { bg: "bg-green-100", text: "text-green-700" };
        default:   return { bg: "bg-gray-100", text: "text-gray-500" };
    }
}

export default function TslListPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [tipe, setTipe] = useState<"" | "satwa" | "tumbuhan">("");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    // Debounce pencarian
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Tarik data spesies
    useEffect(() => {
        setLoading(true);
        const params: any = { page };
        if (tipe) params.tipe = tipe;
        if (search) params.search = search;

        axios.get(`${API}/cms/public/tsl`, { params })
            .then(r => {
                const resData = r.data?.data;
                // Handle: paginate mengembalikan { data: [...], last_page: N }
                if (Array.isArray(resData)) {
                    setData(resData);
                } else {
                    setData(resData?.data || []);
                    setLastPage(resData?.last_page || 1);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, tipe, search]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
                    <TreePine className="w-9 h-9 text-green-600" /> Tumbuhan & Satwa Liar
                </h1>
                <p className="text-gray-500 mt-2">Ensiklopedia spesies dilindungi di kawasan konservasi BKSDA.</p>
            </div>

            {/* Filter: Tab Tipe + Pencarian */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex gap-2">
                    {[
                        { value: "", label: "Semua" },
                        { value: "satwa", label: "🐾 Satwa" },
                        { value: "tumbuhan", label: "🌿 Tumbuhan" },
                    ].map(tab => (
                        <button key={tab.value} onClick={() => { setTipe(tab.value as any); setPage(1); }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                tipe === tab.value ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
                            }`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        placeholder="Cari nama spesies..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all" />
                </div>
            </div>

            {/* Grid Spesies */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
            ) : data.length === 0 ? (
                <div className="text-center py-20 text-gray-400"><TreePine className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>Tidak ada spesies ditemukan.</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {data.map(item => {
                        const iucn = getIucnStyle(item.status_iucn);
                        return (
                            <Link key={item.id} href={`/tsl/${item.slug}`}
                                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="h-40 bg-green-50 overflow-hidden">
                                    {item.thumbnail_path ? (
                                        <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt={item.nama_lokal}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><TreePine className="w-10 h-10 text-green-200" /></div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <p className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-green-700 transition-colors">{item.nama_lokal}</p>
                                    <p className="text-xs text-gray-400 italic line-clamp-1 mt-0.5">{item.nama_latin || ""}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {item.status_iucn && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${iucn.bg} ${iucn.text}`}>{item.status_iucn}</span>
                                        )}
                                        <span className="text-[10px] text-gray-400">{item.tipe === "satwa" ? "🐾 Satwa" : "🌿 Tumbuhan"}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                        <ChevronLeft className="w-4 h-4" /> Sebelumnya
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-500">Hal. {page} / {lastPage}</span>
                    <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                        Selanjutnya <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
```

### 2. Cetak Biru Detail Spesies
**Path:** `frontend/src/app/(website)/tsl/[slug]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { TreePine, ArrowLeft, Loader2, Shield } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

function getIucnFull(status: string | null) {
    switch (status) {
        case "CR": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", label: "Critically Endangered (Kritis)" };
        case "EN": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "Endangered (Terancam Punah)" };
        case "VU": return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", label: "Vulnerable (Rentan)" };
        case "NT": return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", label: "Near Threatened (Hampir Terancam)" };
        case "LC": return { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", label: "Least Concern (Risiko Rendah)" };
        default:   return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", label: "Belum Dinilai IUCN" };
    }
}

export default function TslDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        axios.get(`${API}/cms/public/tsl/${slug}`)
            .then(r => setData(r.data?.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
    if (!data) return <div className="text-center py-32 text-gray-400">Spesies tidak ditemukan.</div>;

    const iucn = getIucnFull(data.status_iucn);

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <Link href="/tsl" className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Spesies
            </Link>

            {/* Foto Spesies */}
            {data.thumbnail_path && (
                <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg">
                    <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${data.thumbnail_path}`} alt={data.nama_lokal}
                        className="w-full h-full object-cover" />
                </div>
            )}

            {/* Nama + Tipe */}
            <div>
                <span className="text-xs font-bold text-green-600 uppercase">{data.tipe === "satwa" ? "🐾 Satwa" : "🌿 Tumbuhan"}</span>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-1">{data.nama_lokal}</h1>
                {data.nama_latin && <p className="text-lg text-gray-500 italic mt-1">{data.nama_latin}</p>}
            </div>

            {/* Kartu Status IUCN */}
            {data.status_iucn && (
                <div className={`flex items-center gap-4 p-5 rounded-2xl border ${iucn.bg} ${iucn.border}`}>
                    <Shield className={`w-10 h-10 ${iucn.text} shrink-0`} />
                    <div>
                        <p className={`font-black text-sm ${iucn.text}`}>Status Konservasi IUCN</p>
                        <p className={`text-lg font-black ${iucn.text} mt-0.5`}>{iucn.label}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Berdasarkan IUCN Red List of Threatened Species™
                        </p>
                    </div>
                </div>
            )}

            {/* Deskripsi */}
            <div className="prose prose-green prose-lg max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: data.deskripsi }} />
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tab "Satwa" dan "Tumbuhan" menampilkan data yang sama!

**Solusi:** Pastikan Backend `PublicController@tslIndex` (Issue 094) memfilter berdasarkan parameter `tipe`. Jika filter belum ada, tambahkan:
```php
if ($request->filled('tipe')) {
    $query->where('tipe', $request->tipe);
}
```

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): deploy species encyclopedia with IUCN conservation status badges" --body "Closes #105" --label "frontend,ui,public-website"
git checkout -b issue/105-frontend-tsl-pages
# Kerjakan...
git commit -m "feat(website): deploy species encyclopedia with IUCN conservation status badges (#105)"
git push -u origin issue/105-frontend-tsl-pages
gh pr create --title "feat(website): deploy TSL species encyclopedia (#105)" --body "## Changes
- Daftar Spesies: Grid 4-kolom + tab Satwa/Tumbuhan + badge IUCN berwarna + pencarian debounced.
- Detail Spesies: Kartu Status IUCN bergaya alert + nama Latin italic + deskripsi HTML.
Closes #105" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Halaman TSL menampilkan ensiklopedia spesies dilindungi. Filter berdasarkan tipe (satwa/tumbuhan), bukan kategori. Setiap spesies memiliki badge IUCN berwarna (CR=merah, EN=oranye, VU=kuning, NT=biru, LC=hijau).

## Task

Kerjakan Issue #105 (Frontend — TSL Pages).
Ikuti instruksi di: `docs/issues/105-frontend-tsl-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(website)/tsl/` dan `[slug]/`.
3. Pahat `page.tsx` — Grid spesies + tab Satwa/Tumbuhan + badge IUCN.
4. Pahat `[slug]/page.tsx` — Detail spesies + kartu IUCN besar + nama Latin italic.
5. PENTING: Nama Latin HARUS dalam huruf italic (`<p className="italic">`).
6. Lakukan Git push dan `gh pr create`.
````
