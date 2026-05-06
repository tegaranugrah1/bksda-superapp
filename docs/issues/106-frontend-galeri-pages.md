# Issue #106 — Frontend — Galeri Pages (Pameran Foto & Video BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public-website`
> **Priority**: 🟡 Medium (Konten Visual Paling Menarik bagi Pengunjung)
> **Complexity**: 🟡 Medium (Tab Foto/Video + Lightbox Preview + YouTube Embed)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash
> **Dependencies**: Issue #101

---

## Branch

```
issue/106-frontend-galeri-pages
```

## Deskripsi

Halaman Galeri adalah **etalase visual** BKSDA — menampilkan foto kegiatan lapangan, pemandangan kawasan, dan video dokumenter satwa liar. Halaman ini memiliki 2 mode tampilan yang dikendalikan oleh **Tab**:

1. **Tab Foto** — Grid Masonry-style yang menampilkan foto-foto kegiatan
2. **Tab Video** — Grid thumbnail YouTube yang bisa ditonton langsung (*embed*)

**Fitur Spesial:**
- **Lightbox**: Saat pengunjung mengklik foto, gambar ditampilkan besar dalam overlay gelap (*modal*). Pengunjung bisa menutup dengan klik area luar atau tombol X.
- **YouTube Embed**: Video tidak diunggah ke server — hanya menyimpan URL YouTube. Kita mengekstrak `videoId` dari URL dan menampilkan thumbnail YouTube. Saat diklik, embed player muncul.

**Satu Halaman, Dua Konten:**
Tidak seperti modul lain yang punya halaman terpisah per entitas, Galeri menggabungkan Foto dan Video dalam **satu halaman** menggunakan Tab — karena pengunjung biasanya ingin melihat keduanya sekaligus.

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(website)/galeri/`.
- [ ] Tersedia `page.tsx` dengan Tab Foto / Video.
- [ ] Tab Foto menampilkan grid gambar + Lightbox saat diklik.
- [ ] Tab Video menampilkan grid thumbnail YouTube + embed player.
- [ ] Fungsi `extractYoutubeId()` mengekstrak ID video dari berbagai format URL YouTube.

---

## Panduan Implementasi Cerdas

### 0. Fungsi Utilitas YouTube

URL YouTube bisa berbentuk macam-macam. Kita butuh fungsi yang bisa menangani semuanya:

```tsx
/**
 * Mengekstrak Video ID dari berbagai format URL YouTube:
 * - https://www.youtube.com/watch?v=abc123
 * - https://youtu.be/abc123
 * - https://www.youtube.com/embed/abc123
 *
 * @returns videoId (string) atau null jika bukan URL YouTube valid
 */
function extractYoutubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}
```

### 1. Cetak Biru Halaman Galeri
**Path:** `frontend/src/app/(website)/galeri/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Camera, Video, Loader2, X, Play } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

function extractYoutubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return null;
}

export default function GaleriPage() {
    const [tab, setTab] = useState<"foto" | "video">("foto");
    const [photos, setPhotos] = useState<any[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Lightbox untuk Foto
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxCaption, setLightboxCaption] = useState("");

    // Embed untuk Video
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        if (tab === "foto") {
            axios.get(`${API}/cms/public/photos`)
                .then(r => setPhotos(r.data?.data || []))
                .catch(() => {})
                .finally(() => setLoading(false));
        } else {
            axios.get(`${API}/cms/public/videos`)
                .then(r => setVideos(r.data?.data || []))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [tab]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
                    <Camera className="w-9 h-9 text-green-600" /> Galeri
                </h1>
                <p className="text-gray-500 mt-2">Dokumentasi visual kegiatan dan kawasan konservasi BKSDA.</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                <button onClick={() => setTab("foto")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        tab === "foto" ? "bg-white text-green-700 shadow-md" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    <Camera className="w-4 h-4" /> Foto
                </button>
                <button onClick={() => setTab("video")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        tab === "video" ? "bg-white text-green-700 shadow-md" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    <Video className="w-4 h-4" /> Video
                </button>
            </div>

            {/* Konten */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
            ) : tab === "foto" ? (
                /* ═══ GRID FOTO ═══ */
                photos.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">Belum ada foto.</div>
                ) : (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                        {photos.map(photo => (
                            <div key={photo.id}
                                onClick={() => {
                                    setLightboxSrc(`${process.env.NEXT_PUBLIC_STORAGE_URL}/${photo.file_path}`);
                                    setLightboxCaption(photo.judul || "");
                                }}
                                className="break-inside-avoid cursor-pointer group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                                <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${photo.file_path}`}
                                    alt={photo.judul || "Foto BKSDA"}
                                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
                                {photo.judul && (
                                    <div className="bg-white px-3 py-2">
                                        <p className="text-xs font-bold text-gray-700 line-clamp-1">{photo.judul}</p>
                                        {photo.album && <p className="text-[10px] text-gray-400">{photo.album}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* ═══ GRID VIDEO ═══ */
                videos.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">Belum ada video.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map(video => {
                            const ytId = extractYoutubeId(video.youtube_url);
                            const isActive = activeVideoId === ytId;
                            return (
                                <div key={video.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                                    <div className="relative aspect-video bg-gray-900">
                                        {isActive && ytId ? (
                                            /* Player YouTube Aktif */
                                            <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                                className="w-full h-full" allowFullScreen
                                                allow="autoplay; encrypted-media" />
                                        ) : (
                                            /* Thumbnail + Tombol Play */
                                            <div className="relative w-full h-full cursor-pointer group"
                                                onClick={() => ytId && setActiveVideoId(ytId)}>
                                                <img src={ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ""}
                                                    alt={video.judul} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                                                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                        <Play className="w-6 h-6 text-green-700 ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{video.judul}</h3>
                                        {video.deskripsi && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{video.deskripsi}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ═══ LIGHTBOX MODAL (Foto) ═══ */}
            {lightboxSrc && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setLightboxSrc(null)}>
                    <button onClick={() => setLightboxSrc(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <div onClick={(e) => e.stopPropagation()} className="max-w-5xl max-h-[85vh]">
                        <img src={lightboxSrc} alt={lightboxCaption} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                        {lightboxCaption && <p className="text-center text-white text-sm mt-3 font-medium">{lightboxCaption}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
```

---

## Troubleshooting

### Q: Foto tidak muncul dalam layout Masonry (semua sejajar)!

**Solusi:** Layout Masonry CSS menggunakan `columns-4` bukan `grid-cols-4`. Perbedaannya:
- `grid-cols-4` → Semua baris sama tinggi (membosankan untuk galeri).
- `columns-4` → Foto mengisi kolom secara alami sesuai tinggi aslinya (Pinterest-style).

Pastikan juga ada `break-inside-avoid` di setiap item dan `space-y-4` di container.

### Q: Video YouTube menampilkan thumbnail hitam!

**Solusi:** Thumbnail YouTube diambil dari `https://img.youtube.com/vi/{ID}/hqdefault.jpg`. Jika ID salah, gambar akan hitam. Pastikan `extractYoutubeId()` mengembalikan ID yang benar. Test manual: buka `https://img.youtube.com/vi/YOUR_ID/hqdefault.jpg` di browser.

### Q: Lightbox tidak bisa ditutup saat klik gambar!

**Solusi:** Perhatikan `e.stopPropagation()` pada container gambar. Tanpa ini, klik pada gambar akan *bubble up* ke overlay hitam yang memiliki `onClick={() => setLightboxSrc(null)}`, sehingga Lightbox langsung tertutup saat diklik.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "feat(website): deploy masonry photo gallery with lightbox and YouTube video embed grid" --body "Closes #106" --label "frontend,ui,public-website"
git checkout -b issue/106-frontend-galeri-pages
# Kerjakan...
git commit -m "feat(website): deploy masonry photo gallery with lightbox and YouTube video embed grid (#106)"
git push -u origin issue/106-frontend-galeri-pages
gh pr create --title "feat(website): deploy photo and video gallery (#106)" --body "## Changes
- Tab switcher Foto/Video dalam satu halaman.
- Grid Foto: CSS Masonry \`columns-4\` + Lightbox overlay saat klik.
- Grid Video: Thumbnail YouTube + embed player saat klik tombol Play.
- Fungsi \`extractYoutubeId()\` menangani 3 format URL YouTube.
Closes #106" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Halaman Galeri menggabungkan Foto dan Video dalam satu halaman menggunakan Tab. Foto menggunakan layout Masonry (CSS `columns`) + Lightbox modal. Video menggunakan thumbnail YouTube + embed iframe saat diklik.

## Task

Kerjakan Issue #106 (Frontend — Galeri Pages).
Ikuti instruksi di: `docs/issues/106-frontend-galeri-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(website)/galeri/`.
3. Pahat `page.tsx` — Tab Foto/Video + Masonry Grid + Lightbox + YouTube Embed.
4. KRUSIAL: Gunakan CSS `columns-4` untuk galeri foto (BUKAN `grid-cols-4`).
5. KRUSIAL: Tambahkan `e.stopPropagation()` pada gambar di Lightbox.
6. Lakukan Git push dan `gh pr create`.
````
