# Issue #104 — Frontend — Kawasan Konservasi Pages (Peta Interaktif + Detail Kawasan)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🟡 Medium (Fitur Unggulan Website: Peta Kawasan Interaktif)
> **Complexity**: 🔴 High (Integrasi Leaflet Map + Dynamic SSR-Safe Import)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro
> **Dependencies**: Issue #101, Issue #103

---

## Branch

```
issue/104-frontend-kawasan-pages
```

## Deskripsi

Halaman Kawasan Konservasi adalah **fitur paling unik** di website BKSDA — menampilkan peta interaktif yang menandai lokasi seluruh kawasan hutan lindung, cagar alam, dan suaka margasatwa menggunakan pustaka **Leaflet** (peta open-source).

**Tantangan Arsitektur:**
Leaflet mengakses objek `window` dan `document` yang hanya tersedia di *Browser*. Next.js me-*render* halaman di server terlebih dahulu (*SSR*), di mana `window` tidak ada. Jika kita mengimpor Leaflet secara normal, halaman akan **crash** dengan error `ReferenceError: window is not defined`.

**Solusi:** Gunakan `next/dynamic` dengan `ssr: false` — persis seperti yang kita lakukan dengan `react-quill` di Issue 098!

**Struktur Halaman:**
1. **`/kawasan`** — Daftar kawasan (Grid Kartu + Peta Mini)
2. **`/kawasan/[slug]`** — Detail kawasan (Deskripsi Lengkap + Peta Besar)

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/kawasan/`.
- [ ] Tersedia `page.tsx` (Daftar Kawasan) dengan Grid Kartu + ringkasan jumlah.
- [ ] Tersedia `[slug]/page.tsx` (Detail Kawasan) dengan konten lengkap + peta Leaflet.
- [ ] Tersedia komponen: `_components/KawasanMap.tsx` yang menampilkan peta interaktif.
- [ ] Peta Leaflet di-import secara dinamis dengan `ssr: false`.
- [ ] Lolos instalasi pustaka: `npm install leaflet react-leaflet` + `@types/leaflet`.

---

## Panduan Implementasi Cerdas

### 0. Instalasi Pustaka Peta

```bash
cd frontend
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### 1. Cetak Biru Komponen Peta (SSR-Safe)
**Path:** `frontend/src/app/(website)/kawasan/_components/KawasanMap.tsx`

```tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix ikon Leaflet yang pecah di Webpack/Next.js
const customIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

interface KawasanMapProps {
    /** Satu titik untuk halaman detail */
    center?: { lat: number; lng: number; nama: string };
    /** Banyak titik untuk halaman daftar */
    markers?: { lat: number; lng: number; nama: string; slug: string }[];
    /** Tinggi peta dalam pixel */
    height?: string;
}

export default function KawasanMap({ center, markers = [], height = "400px" }: KawasanMapProps) {
    // Tentukan pusat peta: dari props center, atau rata-rata semua marker, atau Indonesia
    const mapCenter: [number, number] = center
        ? [center.lat, center.lng]
        : markers.length > 0
            ? [
                markers.reduce((s, m) => s + m.lat, 0) / markers.length,
                markers.reduce((s, m) => s + m.lng, 0) / markers.length,
              ]
            : [-2.5, 118.0]; // Pusat Indonesia

    const zoom = center ? 12 : 6;

    return (
        <div style={{ height }} className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
            <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Mode Detail: 1 Marker */}
                {center && (
                    <Marker position={[center.lat, center.lng]} icon={customIcon}>
                        <Popup><strong>{center.nama}</strong></Popup>
                    </Marker>
                )}
                {/* Mode Daftar: Banyak Marker */}
                {markers.map(m => (
                    <Marker key={m.slug} position={[m.lat, m.lng]} icon={customIcon}>
                        <Popup>
                            <a href={`/kawasan/${m.slug}`} className="font-bold text-green-700 hover:underline">
                                {m.nama}
                            </a>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
```

### 2. Cetak Biru Halaman Daftar Kawasan
**Path:** `frontend/src/app/(website)/kawasan/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import axios from "axios";
import { MapPin, TreePine, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

// KRUSIAL: Import Peta secara dinamis (ssr: false) agar tidak crash!
const KawasanMap = dynamic(() => import("./_components/KawasanMap"), { ssr: false });

export default function KawasanListPage() {
    const [kawasan, setKawasan] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API}/cms/public/kawasan`)
            .then(r => setKawasan(r.data?.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Siapkan data marker untuk peta (hanya kawasan yang punya koordinat)
    const markers = kawasan
        .filter(k => k.latitude && k.longitude)
        .map(k => ({ lat: Number(k.latitude), lng: Number(k.longitude), nama: k.nama, slug: k.slug }));

    if (loading) {
        return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
                    <MapPin className="w-9 h-9 text-green-600" /> Kawasan Konservasi
                </h1>
                <p className="text-gray-500 mt-2 max-w-2xl">
                    Kami mengelola {kawasan.length} kawasan konservasi meliputi cagar alam, suaka margasatwa, dan taman wisata alam.
                </p>
            </div>

            {/* Peta Interaktif — Semua Kawasan Ditandai */}
            {markers.length > 0 && <KawasanMap markers={markers} height="400px" />}

            {/* Grid Kartu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {kawasan.map(item => (
                    <Link key={item.id} href={`/kawasan/${item.slug}`}
                        className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="h-48 bg-green-50 overflow-hidden">
                            {item.thumbnail_path ? (
                                <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`} alt={item.nama}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><TreePine className="w-12 h-12 text-green-200" /></div>
                            )}
                        </div>
                        <div className="p-5">
                            <p className="text-xs font-bold text-green-600 uppercase">{item.tipe_kawasan || "Kawasan Konservasi"}</p>
                            <h3 className="font-black text-gray-900 text-lg mt-1 group-hover:text-green-700 transition-colors">{item.nama}</h3>
                            {item.luas_ha && (
                                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                                    📐 {Number(item.luas_ha).toLocaleString()} Hektar
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
```

### 3. Cetak Biru Halaman Detail Kawasan
**Path:** `frontend/src/app/(website)/kawasan/[slug]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import axios from "axios";
import { MapPin, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;
const KawasanMap = dynamic(() => import("../_components/KawasanMap"), { ssr: false });

export default function KawasanDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        axios.get(`${API}/cms/public/kawasan/${slug}`)
            .then(r => setData(r.data?.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
    if (!data) return <div className="text-center py-32 text-gray-400">Kawasan tidak ditemukan.</div>;

    const hasCoordinates = data.latitude && data.longitude;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            {/* Navigasi Kembali */}
            <Link href="/kawasan" className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Kawasan
            </Link>

            {/* Thumbnail */}
            {data.thumbnail_path && (
                <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg">
                    <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${data.thumbnail_path}`} alt={data.nama}
                        className="w-full h-full object-cover" />
                </div>
            )}

            {/* Judul + Metadata */}
            <div>
                <p className="text-sm font-bold text-green-600 uppercase">{data.tipe_kawasan || "Kawasan Konservasi"}</p>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-1">{data.nama}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                    {data.luas_ha && <span className="flex items-center gap-1">📐 {Number(data.luas_ha).toLocaleString()} Hektar</span>}
                    {hasCoordinates && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {data.latitude}, {data.longitude}</span>}
                </div>
            </div>

            {/* Konten Deskripsi */}
            <div className="prose prose-green max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.deskripsi }} />

            {/* Peta Lokasi */}
            {hasCoordinates && (
                <div>
                    <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-green-600" /> Lokasi di Peta
                    </h3>
                    <KawasanMap center={{ lat: Number(data.latitude), lng: Number(data.longitude), nama: data.nama }} height="450px" />
                </div>
            )}
        </div>
    );
}
```

---

## Troubleshooting

### Q: Error `ReferenceError: window is not defined` saat membuka halaman Kawasan!

**Artinya:** Leaflet mencoba dijalankan di server (*SSR*).
**Solusi:** Pastikan kamu mengimpor `KawasanMap` menggunakan:
```tsx
const KawasanMap = dynamic(() => import("./_components/KawasanMap"), { ssr: false });
```
Kata kunci `ssr: false` WAJIB ada. Tanpa ini, Next.js akan mencoba me-*render* Leaflet di server dan crash karena `window` tidak tersedia.

### Q: Ikon marker Leaflet tidak muncul (hanya kotak abu-abu)!

**Artinya:** Webpack Next.js merusak path default ikon Leaflet.
**Solusi:** Perhatikan kode `KawasanMap.tsx` sudah menggunakan `L.Icon` kustom yang mengarah langsung ke CDN `unpkg.com`. Ini membypass masalah Webpack. Jangan gunakan path relatif untuk ikon Leaflet di Next.js!

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): deploy interactive conservation area map with Leaflet and dynamic SSR-safe import" --body "Closes #104" --label "frontend,ui,public-website"
git checkout -b issue/104-frontend-kawasan-pages
# Instal: npm install leaflet react-leaflet && npm install -D @types/leaflet
# Kerjakan...
git commit -m "feat(website): deploy interactive conservation area map with Leaflet and dynamic SSR-safe import (#104)"
git push -u origin issue/104-frontend-kawasan-pages
gh pr create --title "feat(website): deploy interactive Kawasan map with Leaflet (#104)" --body "## Changes
- Komponen \`KawasanMap\` dengan dual-mode: single marker (detail) + multi-marker (daftar).
- Halaman Daftar: Grid Kartu + Peta Overview seluruh kawasan.
- Halaman Detail: Thumbnail + Deskripsi + Peta Zoom Lokasi.
- Fix ikon Leaflet via CDN unpkg untuk menghindari Webpack corruption.
Closes #104" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Halaman Kawasan menampilkan peta interaktif menggunakan Leaflet. Leaflet HARUS di-import dengan `dynamic({ ssr: false })` karena crash di SSR. Ikon marker harus menggunakan CDN unpkg, bukan path lokal.

## Task

Kerjakan Issue #104 (Frontend — Kawasan Pages).
Ikuti instruksi di: `docs/issues/104-frontend-kawasan-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Instal: `npm install leaflet react-leaflet` dan `npm install -D @types/leaflet`.
3. Buat `_components/KawasanMap.tsx` — komponen peta dengan dual-mode (single/multi marker).
4. Buat `kawasan/page.tsx` — Grid Kartu + Peta Overview.
5. Buat `kawasan/[slug]/page.tsx` — Detail + Peta Zoom.
6. KRUSIAL: Selalu gunakan `dynamic(() => import(...), { ssr: false })` untuk KawasanMap!
7. Lakukan Git push dan `gh pr create`.
````
