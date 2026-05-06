# Issue #121 — Deployment — Vercel Frontend Config (Meluncurkan Website ke Internet)

> **Type**: `devops` / `deployment`
> **Labels**: `frontend`, `devops`, `deployment`
> **Priority**: 🔴 Critical (Tanpa Ini, Website Hanya Jalan di Laptop Kita)
> **Complexity**: 🟢 Simple (Konfigurasi Dashboard + 1 File — Tapi Salah Setting = Website Mati)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #119 (Next.js Config)

---

## Branch

```
issue/121-deployment-vercel-frontend
```

## Deskripsi

Selama ini website berjalan di `localhost:3000` — hanya kita yang bisa melihatnya. Issue ini mendokumentasikan cara **meluncurkan website ke internet** menggunakan **Vercel** — platform deployment yang dioptimasi untuk Next.js.

**Analogi:** Jika membuat website ibarat memasak di dapur, deployment ibarat **membuka restoran** — makanan (kode) yang sama, tapi sekarang bisa dinikmati publik.

### Diagram: Dari Laptop ke Internet

```
SEBELUM DEPLOYMENT:
┌─────────────┐         ┌─────────────┐
│  Laptop     │ ──────→ │ localhost    │  ← Hanya kita yang bisa akses
│  Developer  │         │ :3000       │
└─────────────┘         └─────────────┘

SETELAH DEPLOYMENT:
┌─────────────┐  git push  ┌──────────────┐  auto-build  ┌─────────────────────┐
│  Laptop     │ ──────────→│   GitHub     │ ───────────→│   Vercel CDN        │
│  Developer  │            │   Repository │              │                     │
└─────────────┘            └──────────────┘              │  bksda-superapp     │
                                                         │  .vercel.app        │
                                                         │                     │
                           ┌──────────────┐              │  ← Seluruh dunia    │
                           │  Pengunjung  │ ────────────→│     bisa akses!     │
                           └──────────────┘              └─────────────────────┘
```

---

## Acceptance Criteria

- [ ] Project Vercel sudah dibuat dan terhubung ke GitHub repository.
- [ ] Environment variables sudah dikonfigurasi di Vercel dashboard.
- [ ] Root directory diset ke `frontend/` (monorepo).
- [ ] Build berhasil dan website bisa diakses via URL Vercel.
- [ ] Preview deployment aktif untuk setiap pull request.

---

## Panduan Implementasi

### Langkah 1: Buat Project di Vercel Dashboard

```
1. Buka https://vercel.com/dashboard
2. Klik "Add New Project"
3. Pilih repository "bksda-superapp" dari GitHub
4. KRUSIAL: Set Root Directory ke "frontend"
   (karena ini monorepo — kode Next.js ada di folder frontend/)
5. Framework Preset: otomatis terdeteksi "Next.js"
6. Klik "Deploy"
```

### Diagram: Kenapa Root Directory Penting?

```
Repository bksda-superapp/
├── backend/               ← PHP Laravel (BUKAN ini)
├── frontend/              ← Next.js (INI yang di-deploy!)
│   ├── package.json
│   ├── next.config.ts
│   └── src/
├── docs/
└── README.md

Tanpa Root Directory = "frontend":
Vercel: "Saya tidak menemukan package.json!" → BUILD GAGAL ❌

Dengan Root Directory = "frontend":
Vercel: "Saya menemukan Next.js project!" → BUILD BERHASIL ✅
```

---

### Langkah 2: Konfigurasi Environment Variables

Di **Vercel Dashboard → Project Settings → Environment Variables**, tambahkan:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://backend-bksda.vercel.app` | Production |
| `NEXT_PUBLIC_API_URL` | `https://backend-bksda-dev.vercel.app` | Preview |
| `NEXT_PUBLIC_STORAGE_URL` | `https://xxx.supabase.co/storage/v1/object/public/cms` | All |

### Diagram: Bagaimana Environment Variables Bekerja

```
Di kode kita:
  const API = process.env.NEXT_PUBLIC_API_URL;
  // "Saya butuh URL backend, tapi tidak tahu environment mana"

Di Vercel Dashboard:
  ┌─────────────────────────────────────────────────────┐
  │ Environment Variables                               │
  ├────────────────────┬────────────────┬───────────────┤
  │ Variable           │ Value          │ Environment   │
  ├────────────────────┼────────────────┼───────────────┤
  │ NEXT_PUBLIC_API_URL│ https://prod.. │ Production ✅ │
  │ NEXT_PUBLIC_API_URL│ https://dev..  │ Preview    ✅ │
  │ NEXT_PUBLIC_API_URL│ localhost:8000 │ Development✅ │
  └────────────────────┴────────────────┴───────────────┘

Saat build di Production → NEXT_PUBLIC_API_URL = "https://prod..."
Saat build di Preview   → NEXT_PUBLIC_API_URL = "https://dev..."
Saat build di local     → dari file .env.local
```

> ⚠️ **ATURAN PENTING:** Variabel yang dimulai dengan `NEXT_PUBLIC_` akan **terekspos ke browser**. Jangan pernah taruh secret/password di variabel `NEXT_PUBLIC_`!

---

### Langkah 3: File `.env.example` — Dokumentasi untuk Developer

```env
# ═══════════════════════════════════════════════════════════
# BKSDA SuperApp — Frontend Environment Variables
# ═══════════════════════════════════════════════════════════
#
# CARA PAKAI:
# 1. Copy file ini → rename jadi ".env.local"
# 2. Isi value sesuai environment Anda
# 3. JANGAN commit .env.local ke Git!
#
# DI VERCEL:
# Set variabel ini di Dashboard → Project Settings → Environment Variables
# ═══════════════════════════════════════════════════════════

# Backend API URL (wajib — semua API call bergantung ini)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase Storage public URL (untuk menampilkan gambar/file)
NEXT_PUBLIC_STORAGE_URL=https://xxx.supabase.co/storage/v1/object/public/cms
```

---

### Langkah 4: Build Settings di Vercel

| Setting | Value | Penjelasan |
|---------|-------|------------|
| Framework Preset | `Next.js` | Otomatis terdeteksi |
| Root Directory | `frontend` | Monorepo — Next.js ada di subfolder |
| Build Command | `next build --webpack` | Sesuai script di package.json |
| Output Directory | `.next` | Default Next.js |
| Install Command | `npm install` | Default |
| Node.js Version | `20.x` | LTS terbaru |

---

### Langkah 5: Konfigurasi Domain (Opsional)

```
Vercel Dashboard → Project → Settings → Domains

1. Domain gratis: bksda-superapp.vercel.app (otomatis)
2. Custom domain: bksda.go.id (perlu DNS setup)
   - Tambahkan CNAME record di DNS:
     Type: CNAME
     Name: @
     Value: cname.vercel-dns.com
   - Vercel otomatis sediakan SSL (HTTPS)
```

---

## Alur CI/CD Otomatis Vercel

```
Developer push ke GitHub
        │
        ├── Push ke branch "main"
        │   └── Vercel: Build → Deploy ke PRODUCTION
        │       URL: bksda-superapp.vercel.app
        │
        └── Push ke branch lain (PR)
            └── Vercel: Build → Deploy ke PREVIEW
                URL: bksda-superapp-git-feature-xxx.vercel.app
                (URL unik per branch — otomatis dihapus setelah PR merge)
```

**Ini adalah salah satu fitur terkuat Vercel:** Setiap pull request otomatis mendapat **preview URL**. Reviewer bisa melihat perubahan di browser nyata, bukan hanya baca kode!

---

## File yang Perlu Ada di `.gitignore`

```gitignore
# Vercel
.vercel

# Environment (jangan commit secrets!)
.env.local
.env.production.local

# Next.js
.next
out
```

---

## Troubleshooting

### Q: Build gagal "Module not found"!

**Checklist:**
1. ✅ Root Directory diset ke `frontend`?
2. ✅ `package.json` memiliki semua dependencies?
3. ✅ Import path menggunakan `@/` alias (bukan relative `../../`)?
4. ✅ TypeScript strict mode tidak menolak implicit any?

### Q: Website deploy berhasil tapi API call gagal (CORS error)!

**Checklist:**
1. ✅ `NEXT_PUBLIC_API_URL` sudah diset di Vercel env vars?
2. ✅ Backend `cors.php` sudah mengizinkan domain `bksda-superapp.vercel.app`? (Issue #116)
3. ✅ Backend `sanctum.php` sudah menambahkan domain di `stateful`?

### Q: Gambar tidak tampil di production!

**Checklist:**
1. ✅ `NEXT_PUBLIC_STORAGE_URL` sudah diset di Vercel env vars?
2. ✅ `next.config.ts` punya `remotePatterns` untuk Supabase? (Issue #119)
3. ✅ Supabase bucket visibility = Public?

### Q: Preview deployment tidak muncul di pull request!

**Checklist:**
1. ✅ GitHub integration aktif? (Vercel Dashboard → Settings → Git)
2. ✅ Repository scope benar? (bukan fork)
3. ✅ Vercel bot punya akses ke repository?

### Q: Build terlalu lambat (>5 menit)!

**Solusi:**
- Aktifkan build cache: Vercel Dashboard → Settings → General → "Cache" → Enable
- Pastikan `.next/cache` tidak di-gitignore (Vercel butuh cache ini)
- Pertimbangkan Turbopack: ganti build command ke `next build`

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "deploy(vercel): configure Vercel frontend deployment with env vars and monorepo root directory" --body "Closes #121" --label "frontend,devops,deployment"
git checkout -b issue/121-deployment-vercel-frontend
# Buat .env.example, pastikan .gitignore benar
git commit -m "deploy(vercel): document Vercel frontend deployment setup (#121)"
git push -u origin issue/121-deployment-vercel-frontend
gh pr create --title "deploy(vercel): Vercel frontend config (#121)" --body "## Changes
- .env.example: Dokumentasi NEXT_PUBLIC_API_URL dan NEXT_PUBLIC_STORAGE_URL.
- .gitignore: Pastikan .vercel dan .env.local tidak ter-commit.
- Panduan lengkap: buat project, set root directory, env vars, domain.
- Troubleshooting: CORS error, gambar tidak tampil, preview deployment.
Closes #121" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo: frontend/ + backend/)
Workspace: e:\bksda-superapp\
Frontend di-deploy ke Vercel. Backend di-deploy terpisah (Issue #122).
Ini adalah monorepo — Root Directory HARUS diset ke "frontend" di Vercel.

## Task

Kerjakan Issue #121 (Deployment — Vercel Frontend Config).
Ikuti instruksi di: `docs/issues/121-deployment-vercel-frontend.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `frontend/.env.example` dengan NEXT_PUBLIC_API_URL dan NEXT_PUBLIC_STORAGE_URL.
3. Pastikan `frontend/.gitignore` mengandung `.vercel`, `.env.local`, `.next`.
4. Pastikan `frontend/package.json` script build = `next build --webpack`.
5. KRUSIAL: Jangan lupa set Root Directory = "frontend" saat setup Vercel!
6. KRUSIAL: Variabel NEXT_PUBLIC_* terekspos ke browser — jangan taruh secret!
7. Lakukan Git push dan `gh pr create`.
````
