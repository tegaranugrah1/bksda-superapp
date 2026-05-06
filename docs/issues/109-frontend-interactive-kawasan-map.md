# Issue #109 — Frontend — InteractiveKawasanMap (Peta Interaktif Tingkat Lanjut)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`, `enhancement`
> **Priority**: 🟢 Low (Peningkatan UX — Bukan Blocker)
> **Complexity**: 🟡 Medium (Marker Clustering + Popup Kaya + Layer Control + Fullscreen)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #104

---

## Branch

```
issue/109-frontend-interactive-kawasan-map
```

## Deskripsi

Pada Issue #104, kita membangun `KawasanMap` versi sederhana — hanya marker titik dan popup teks. Sekarang kita **meningkatkan** komponen tersebut menjadi peta interaktif tingkat lanjut yang layak dibanggakan.

**Fitur Baru yang Ditambahkan:**

| # | Fitur | Penjelasan |
|---|-------|------------|
| 1 | **Marker Clustering** | Jika ada 20+ kawasan, marker yang berdekatan dikelompokkan menjadi 1 lingkaran bernomor. Saat di-zoom, cluster terpecah menjadi marker individual. |
| 2 | **Popup Kartu Kaya** | Popup bukan lagi teks polos — melainkan kartu mini berisi foto thumbnail, nama, tipe kawasan, luas, dan tombol "Lihat Detail". |
| 3 | **Layer Control** | Tombol untuk mengganti peta dasar: OpenStreetMap (default), Satellite (foto udara), atau Terrain (topografi). |
| 4 | **Fullscreen Toggle** | Tombol untuk memperluas peta ke layar penuh — sangat berguna di mobile. |
| 5 | **Legenda Warna** | Marker berbeda warna berdasarkan `tipe_kawasan`: Cagar Alam = Hijau, Suaka Margasatwa = Biru, Taman Wisata = Oranye. |

**Pustaka Tambahan:**
- `leaflet.markercluster` — untuk pengelompokan marker
- `leaflet-fullscreen` — untuk tombol fullscreen (opsional, bisa pakai custom)

---

## Acceptance Criteria

- [ ] Komponen ditingkatkan: `frontend/src/app/(website)/kawasan/_components/KawasanMap.tsx`.
- [ ] Marker yang berdekatan dikelompokkan secara otomatis (clustering).
- [ ] Popup menampilkan kartu mini (thumbnail + nama + tipe + tombol detail).
- [ ] Tersedia minimal 2 pilihan peta dasar (Street + Satellite).
- [ ] Tersedia tombol fullscreen.
- [ ] Marker berwarna berbeda berdasarkan tipe kawasan.

---

## Panduan Implementasi Cerdas

### 0. Instalasi Pustaka Tambahan

```bash
cd frontend
npm install leaflet.markercluster
npm install -D @types/leaflet.markercluster
```

### 1. Cetak Biru Peta Interaktif Tingkat Lanjut
**Path:** `frontend/src/app/(website)/kawasan/_components/KawasanMap.tsx`

Ganti seluruh isi file lama dengan versi yang ditingkatkan:

```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// ══════════════════════════════════════════════════
// KONFIGURASI WARNA MARKER PER TIPE KAWASAN
// ══════════════════════════════════════════════════

const MARKER_COLORS: Record<string, string> = {
    "Cagar Alam":        "#16a34a", // Hijau
    "Suaka Margasatwa":  "#2563eb", // Biru
    "Taman Wisata Alam": "#ea580c", // Oranye
    "Taman Buru":        "#9333ea", // Ungu
    default:             "#059669", // Hijau Gelap
};

/** Membuat ikon lingkaran berwarna kustom (tanpa CDN dependency) */
function createColoredIcon(color: string): L.DivIcon {
    return L.divIcon({
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
        html: `<div style="
            width: 28px; height: 28px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "></div>`,
    });
}

// ══════════════════════════════════════════════════
// KONFIGURASI PETA DASAR (TILE LAYERS)
// ══════════════════════════════════════════════════

const TILE_LAYERS = {
    street: {
        name: "Peta Jalan",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attr: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
    },
    satellite: {
        name: "Satelit",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr: '&copy; <a href="https://www.esri.com">Esri</a>',
    },
    terrain: {
        name: "Topografi",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attr: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    },
};

// ══════════════════════════════════════════════════
// PROPS INTERFACE
// ══════════════════════════════════════════════════

interface MarkerData {
    lat: number;
    lng: number;
    nama: string;
    slug: string;
    tipe_kawasan?: string;
    luas_ha?: number;
    thumbnail_path?: string;
}

interface InteractiveMapProps {
    /** Satu titik untuk halaman detail */
    center?: { lat: number; lng: number; nama: string };
    /** Banyak titik untuk halaman daftar */
    markers?: MarkerData[];
    /** Tinggi peta */
    height?: string;
}

// ══════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

export default function KawasanMap({ center, markers = [], height = "500px" }: InteractiveMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Hitung pusat peta
        const mapCenter: [number, number] = center
            ? [center.lat, center.lng]
            : markers.length > 0
                ? [
                    markers.reduce((s, m) => s + m.lat, 0) / markers.length,
                    markers.reduce((s, m) => s + m.lng, 0) / markers.length,
                  ]
                : [-2.5, 118.0];

        const zoom = center ? 12 : 6;

        // Inisialisasi Peta
        const map = L.map(mapRef.current, {
            center: mapCenter,
            zoom,
            scrollWheelZoom: false,
            zoomControl: true,
        });

        mapInstanceRef.current = map;

        // ── Layer Peta Dasar + Kontrol Switcher ──
        const streetLayer = L.tileLayer(TILE_LAYERS.street.url, { attribution: TILE_LAYERS.street.attr });
        const satelliteLayer = L.tileLayer(TILE_LAYERS.satellite.url, { attribution: TILE_LAYERS.satellite.attr });
        const terrainLayer = L.tileLayer(TILE_LAYERS.terrain.url, { attribution: TILE_LAYERS.terrain.attr });

        streetLayer.addTo(map); // Default

        L.control.layers({
            [TILE_LAYERS.street.name]: streetLayer,
            [TILE_LAYERS.satellite.name]: satelliteLayer,
            [TILE_LAYERS.terrain.name]: terrainLayer,
        }).addTo(map);

        // ── Mode Detail: 1 Marker ──
        if (center) {
            const icon = createColoredIcon(MARKER_COLORS.default);
            L.marker([center.lat, center.lng], { icon })
                .addTo(map)
                .bindPopup(`<strong>${center.nama}</strong>`)
                .openPopup();
        }

        // ── Mode Daftar: Cluster Banyak Marker ──
        if (markers.length > 0) {
            const clusterGroup = (L as any).markerClusterGroup({
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
            });

            markers.forEach(m => {
                const color = MARKER_COLORS[m.tipe_kawasan || ""] || MARKER_COLORS.default;
                const icon = createColoredIcon(color);

                const popupHtml = `
                    <div style="width: 220px; font-family: system-ui, sans-serif;">
                        ${m.thumbnail_path
                            ? `<img src="${STORAGE}/${m.thumbnail_path}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />`
                            : ""}
                        <p style="font-size:10px; color:#16a34a; font-weight:800; text-transform:uppercase; margin:0;">
                            ${m.tipe_kawasan || "Kawasan Konservasi"}
                        </p>
                        <p style="font-size:14px; font-weight:900; color:#111; margin:4px 0;">
                            ${m.nama}
                        </p>
                        ${m.luas_ha ? `<p style="font-size:11px; color:#888; margin:0;">📐 ${Number(m.luas_ha).toLocaleString()} Hektar</p>` : ""}
                        <a href="/kawasan/${m.slug}"
                           style="display:block; text-align:center; background:#16a34a; color:white; padding:6px; border-radius:8px; font-size:12px; font-weight:700; margin-top:8px; text-decoration:none;">
                            Lihat Detail →
                        </a>
                    </div>
                `;

                const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(popupHtml);
                clusterGroup.addLayer(marker);
            });

            map.addLayer(clusterGroup);
        }

        // ── Tombol Fullscreen Kustom ──
        const FullscreenControl = L.Control.extend({
            options: { position: "topleft" as L.ControlPosition },
            onAdd: () => {
                const btn = L.DomUtil.create("button", "");
                btn.innerHTML = "⛶";
                btn.title = "Layar Penuh";
                btn.style.cssText = "width:34px; height:34px; background:white; border:2px solid rgba(0,0,0,0.2); border-radius:4px; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;";
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const el = mapRef.current;
                    if (!el) return;
                    if (!document.fullscreenElement) {
                        el.requestFullscreen();
                    } else {
                        document.exitFullscreen();
                    }
                };
                return btn;
            },
        });
        new FullscreenControl().addTo(map);

        // Cleanup
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [center, markers]);

    return (
        <div>
            <div ref={mapRef} style={{ height }} className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg" />

            {/* Legenda Warna */}
            {markers.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                    {Object.entries(MARKER_COLORS).filter(([k]) => k !== "default").map(([tipe, color]) => (
                        <div key={tipe} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span style={{ background: color }} className="w-3 h-3 rounded-full border border-white shadow-sm" />
                            {tipe}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

### 2. Update Import di Halaman Kawasan

File `kawasan/page.tsx` dan `kawasan/[slug]/page.tsx` dari Issue #104 **tidak perlu diubah** — mereka tetap melakukan `dynamic(() => import("./_components/KawasanMap"), { ssr: false })`. Komponen yang diimpor otomatis menggunakan versi baru yang ditingkatkan.

---

## Troubleshooting

### Q: Error `Cannot read property 'markerClusterGroup' of undefined`!

**Solusi:** Import `leaflet.markercluster` harus dilakukan SETELAH import `leaflet`:
```tsx
import L from "leaflet";              // 1. Leaflet dulu
import "leaflet.markercluster";       // 2. Plugin clustering kedua
```
Urutannya WAJIB ini. Plugin `markercluster` menambahkan metode baru ke objek `L`, jadi `L` harus ada duluan.

### Q: Cluster muncul tapi warnanya jelek (hitam/transparan)!

**Solusi:** Pastikan CSS clustering diimpor:
```tsx
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
```
Tanpa CSS ini, cluster circle tidak memiliki styling dan terlihat pecah.

### Q: Tombol Fullscreen tidak bekerja di Safari iOS!

**Solusi:** Safari iOS tidak mendukung Fullscreen API secara penuh. Tombol akan tetap muncul tetapi tidak berfungsi di Safari mobile. Ini adalah limitasi browser, bukan bug kode. Sebagai workaround, peta sudah diatur responsif sehingga tetap nyaman di layar kecil.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): upgrade KawasanMap with marker clustering, rich popups, tile layer switching, and fullscreen" --body "Closes #109" --label "frontend,ui,public-website,enhancement"
git checkout -b issue/109-frontend-interactive-kawasan-map
npm install leaflet.markercluster && npm install -D @types/leaflet.markercluster
# Kerjakan...
git commit -m "feat(website): upgrade KawasanMap with marker clustering, rich popups, and layer switching (#109)"
git push -u origin issue/109-frontend-interactive-kawasan-map
gh pr create --title "feat(website): upgrade interactive KawasanMap (#109)" --body "## Changes
- Marker Clustering: Marker berdekatan otomatis dikelompokkan.
- Rich Popup: Kartu mini dengan thumbnail, tipe, luas, dan tombol detail.
- Layer Switcher: 3 pilihan peta (Jalan, Satelit, Topografi).
- Fullscreen: Tombol layar penuh menggunakan native Fullscreen API.
- Color Legend: Marker berwarna berbeda per tipe kawasan.
Closes #109" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Upgrade komponen KawasanMap dari Issue #104 menjadi peta interaktif tingkat lanjut. Tambahkan: marker clustering, popup kartu kaya, layer switcher, fullscreen, dan legenda warna.

## Task

Kerjakan Issue #109 (Frontend — InteractiveKawasanMap).
Ikuti instruksi di: `docs/issues/109-frontend-interactive-kawasan-map.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Instal: `npm install leaflet.markercluster` dan `npm install -D @types/leaflet.markercluster`.
3. GANTI SELURUH isi `KawasanMap.tsx` dengan versi baru yang ditingkatkan.
4. KRUSIAL: Import urutan `leaflet` DULU, baru `leaflet.markercluster`!
5. KRUSIAL: Jangan lupa import CSS clustering!
6. Lakukan Git push dan `gh pr create`.
````
