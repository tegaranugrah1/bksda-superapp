# Issue #119 — Frontend — Next.js Config (Pusat Kendali Aplikasi Frontend)

> **Type**: `config` / `security`
> **Labels**: `frontend`, `devops`, `security`
> **Priority**: 🔴 Critical (Tanpa Config Ini, Gambar Tidak Tampil & Website Rentan Serangan)
> **Complexity**: 🟢 Simple (1 File — Tapi Setiap Baris Punya Alasan Keamanan/Performa)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Tidak ada — ini pondasi pertama frontend

---

## Branch

```
issue/119-frontend-nextjs-config
```

## Deskripsi

`next.config.ts` adalah **pusat kendali** aplikasi Next.js. Satu file ini mengatur:
- **Rewrites**: Meneruskan request ke backend tanpa CORS (proxy)
- **Headers**: Melindungi website dari serangan (XSS, clickjacking)
- **Images**: Domain mana yang boleh menampilkan gambar
- **Compiler**: Optimasi production (hapus console.log)

**Analogi:** Jika aplikasi adalah gedung, `next.config.ts` adalah **ruang kontrol keamanan** — ia mengatur siapa boleh masuk, ke mana request diteruskan, dan header keamanan apa yang dikirim ke setiap pengunjung.

---

## Acceptance Criteria

- [ ] `next.config.ts` tersedia dengan rewrites, headers, dan image config.
- [ ] Security headers terpasang di semua halaman.
- [ ] Gambar dari Supabase bisa ditampilkan via `<Image>`.
- [ ] Console.log otomatis dihapus di production build.
- [ ] Hot reload bekerja tanpa lag di development.

---

## Panduan Implementasi

### File: `frontend/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    // ═══════════════════════════════════════════════════════
    // 1. COMPILER: Optimasi Production
    // ═══════════════════════════════════════════════════════

    /**
     * Hapus semua console.log di production build.
     *
     * MENGAPA?
     * - console.log memperlambat browser (setiap log = operasi I/O)
     * - Data sensitif bisa bocor (console.log(user) → terlihat di DevTools)
     * - Di development tetap aktif untuk debugging
     */
    compiler: {
        removeConsole: process.env.NODE_ENV === "production",
    },

    // ═══════════════════════════════════════════════════════
    // 2. WEBPACK: Konfigurasi Development
    // ═══════════════════════════════════════════════════════

    /**
     * Polling untuk hot reload di Docker/WSL/Windows.
     *
     * MENGAPA polling?
     * - Default: filesystem watcher (inotify)
     * - Di Docker/WSL: inotify TIDAK BEKERJA lintas filesystem
     * - Polling = cek file setiap 1 detik → pasti deteksi perubahan
     * - 'ignored': jangan pantau folder besar (hemat CPU)
     */
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 1000,             // Cek setiap 1000ms
                aggregateTimeout: 300,  // Tunggu 300ms sebelum rebuild
                ignored: ['**/node_modules', '**/.git', '**/.next', '**/backend/**'],
            };
        }
        return config;
    },

    // Turbopack: compiler baru Next.js (lebih cepat dari webpack)
    turbopack: {},

    // ═══════════════════════════════════════════════════════
    // 3. REWRITES: Proxy Request ke Backend
    // ═══════════════════════════════════════════════════════

    /**
     * Meneruskan request /storage/* ke backend.
     *
     * SKENARIO:
     * Frontend (localhost:3000) perlu menampilkan gambar dari backend (localhost:8000).
     * Tanpa rewrite: <img src="http://localhost:8000/storage/foto.jpg"> → CORS error!
     * Dengan rewrite: <img src="/storage/foto.jpg"> → Next.js proxy → backend → gambar tampil!
     *
     * DIAGRAM:
     * Browser: GET /storage/foto.jpg
     *    ↓
     * Next.js server: "Oh, /storage/* → forward ke backend!"
     *    ↓
     * Backend: 200 OK + file gambar
     *    ↓
     * Browser: Gambar tampil! (tidak tahu ada proxy)
     */
    async rewrites() {
        return [
            {
                source: "/storage/:path*",
                destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend.vercel.app'}/storage/:path*`,
            },
        ];
    },

    // ═══════════════════════════════════════════════════════
    // 4. HEADERS: Security Headers (Tameng Website)
    // ═══════════════════════════════════════════════════════

    /**
     * Header keamanan yang dikirim ke SETIAP response.
     * Ini adalah "tameng" yang melindungi website dari berbagai serangan.
     */
    async headers() {
        return [
            {
                source: "/(.*)",   // Berlaku untuk SEMUA halaman
                headers: [
                    // ─── Clickjacking Protection ───
                    // Cegah website kita di-embed dalam <iframe> oleh situs lain.
                    // Serangan: Penyerang membuat iframe tersembunyi → user
                    // mengklik tombol di situs penyerang → sebenarnya mengklik
                    // tombol "Hapus Data" di aplikasi kita!
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },

                    // ─── MIME Sniffing Protection ───
                    // Cegah browser "menebak" tipe file.
                    // Serangan: Upload file.txt yang isinya JavaScript →
                    // browser menebak itu script → menjalankannya!
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },

                    // ─── XSS Protection ───
                    // Aktifkan filter XSS bawaan browser.
                    // Jika browser mendeteksi script injection → blokir halaman.
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },

                    // ─── Referrer Policy ───
                    // Kontrol informasi URL yang dikirim saat user klik link
                    // ke situs lain. "strict-origin-when-cross-origin":
                    // → Ke situs sendiri: kirim URL lengkap
                    // → Ke situs lain: kirim domain saja (tanpa path)
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },

                    // ─── Permissions Policy ───
                    // Nonaktifkan akses ke hardware browser yang tidak kita pakai.
                    // Website BKSDA tidak butuh kamera, mikrofon, atau GPS.
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
        ];
    },

    // ═══════════════════════════════════════════════════════
    // 5. IMAGES: Domain Gambar yang Diizinkan
    // ═══════════════════════════════════════════════════════

    /**
     * Next.js <Image> hanya boleh memuat gambar dari domain yang TERDAFTAR.
     * Ini mencegah website kita dijadikan proxy untuk memuat gambar dari
     * situs berbahaya.
     *
     * TANPA whitelist:
     * <Image src="https://evil-site.com/malware.jpg"> → BISA dimuat!
     *
     * DENGAN whitelist:
     * <Image src="https://evil-site.com/malware.jpg"> → Error: domain not configured!
     */
    images: {
        // unoptimized: true → Nonaktifkan optimasi gambar Next.js
        // MENGAPA? Vercel mengenakan biaya per gambar yang dioptimasi.
        // Untuk menghemat cost, kita menyajikan gambar apa adanya.
        unoptimized: true,

        remotePatterns: [
            // Development: localhost backend
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/assets/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/storage/**',
            },

            // Production: Website BKSDA lama (untuk referensi gambar)
            {
                protocol: 'https',
                hostname: 'bksdakaltim.ksdae.kehutanan.go.id',
                pathname: '/**',
            },

            // Supabase Storage: Bucket spesifik project
            {
                protocol: 'https',
                hostname: 'iflvjdalryfosgbxvcon.supabase.co',
                pathname: '/**',
            },

            // Supabase Storage: Wildcard untuk semua project Supabase
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/**',
            },
        ],
    },
};

export default nextConfig;
```

---

## Penjelasan Visual: 5 Blok Konfigurasi

```
┌─────────────────────────────────────────────────────────────┐
│                      next.config.ts                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐   Hapus console.log di production      │
│  │ 1. Compiler     │   → Hemat performa + cegah data bocor  │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐   Polling 1s untuk hot reload          │
│  │ 2. Webpack      │   → Perbaiki Docker/WSL yang lambat    │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐   /storage/* → backend URL             │
│  │ 3. Rewrites     │   → Proxy tanpa CORS error             │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐   X-Frame-Options, nosniff, XSS        │
│  │ 4. Headers      │   → Tameng dari 5 jenis serangan       │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐   Whitelist domain gambar               │
│  │ 5. Images       │   → Cegah proxy gambar berbahaya        │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tabel: 5 Security Headers Dijelaskan

| Header | Serangan yang Dicegah | Penjelasan Simpel |
|--------|----------------------|-------------------|
| `X-Frame-Options: SAMEORIGIN` | **Clickjacking** | Situs lain tidak bisa membungkus website kita dalam iframe tersembunyi |
| `X-Content-Type-Options: nosniff` | **MIME Sniffing** | Browser tidak boleh "menebak" tipe file (cegah eksekusi script) |
| `X-XSS-Protection: 1; mode=block` | **Cross-Site Scripting** | Jika browser deteksi script injection → blokir halaman |
| `Referrer-Policy` | **Info Leakage** | Saat user klik link ke situs lain, jangan kirim URL lengkap kita |
| `Permissions-Policy` | **Hardware Hijacking** | Website tidak punya akses ke kamera, mikrofon, GPS |

---

## Troubleshooting

### Q: `<Image>` error "hostname is not configured under images in next.config"!

**Solusi:** Tambahkan hostname ke `remotePatterns`:
```typescript
{
    protocol: 'https',
    hostname: 'domain-baru.com',
    pathname: '/**',
}
```
Lalu restart dev server (`Ctrl+C` → `npm run dev`). Config Next.js **tidak hot-reload** — harus restart!

### Q: Hot reload sangat lambat di Docker/WSL!

**Solusi:** Pastikan konfigurasi webpack polling aktif:
```typescript
webpack: (config, { dev }) => {
    if (dev) {
        config.watchOptions = {
            poll: 1000,
            ignored: ['**/node_modules', '**/.next'],
        };
    }
    return config;
},
```

### Q: Gambar tampil di dev tapi tidak di production!

**Checklist:**
1. ✅ URL gambar menggunakan HTTPS (bukan HTTP) di production?
2. ✅ Domain ada di `remotePatterns`?
3. ✅ Rewrite destination URL mengarah ke backend production (bukan localhost)?

### Q: `images.unoptimized = true` — bukankah ini membuat gambar lebih berat?

**Penjelasan:** Ya, tapi Vercel mengenakan **biaya per gambar yang dioptimasi**. Untuk project dengan banyak gambar (galeri, poster), biaya ini bisa membengkak. Dengan `unoptimized: true`, gambar disajikan apa adanya — kita mengoptimasi di sisi upload saja (kompres sebelum upload ke Supabase).

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "config(nextjs): configure rewrites, security headers, and image remote patterns" --body "Closes #119" --label "frontend,devops,security"
git checkout -b issue/119-frontend-nextjs-config
# Buat/edit frontend/next.config.ts
git commit -m "config(nextjs): add rewrites proxy, 5 security headers, and image whitelist (#119)"
git push -u origin issue/119-frontend-nextjs-config
gh pr create --title "config(nextjs): Next.js configuration (#119)" --body "## Changes
- Compiler: removeConsole di production.
- Webpack: polling hot reload untuk Docker/WSL.
- Rewrites: /storage/* proxy ke backend (anti CORS).
- Headers: 5 security header (XSS, clickjacking, MIME sniffing, referrer, permissions).
- Images: Whitelist localhost, bksdakaltim, Supabase.
Closes #119" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\frontend\next.config.ts (sudah production-ready)
File ini adalah pusat kendali keamanan dan performa frontend Next.js.

## Task

Kerjakan Issue #119 (Frontend — Next.js Config).
Ikuti instruksi di: `docs/issues/119-frontend-nextjs-config.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `frontend/next.config.ts` (copy dari superapp-inventory).
3. KRUSIAL: Ganti URL rewrite destination dari `superapp-backend-dun.vercel.app` → URL backend bksda.
4. KRUSIAL: Ganti hostname Supabase jika project ID berbeda.
5. Verifikasi `npm run build` berhasil (config valid).
6. KRUSIAL: Config Next.js TIDAK hot-reload — harus restart dev server setelah edit!
7. Lakukan Git push dan `gh pr create`.
````
