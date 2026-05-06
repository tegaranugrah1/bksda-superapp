# Issue #125 — Documentation — API Docs & README (Peta Harta Karun Project)

> **Type**: `docs` / `chore`
> **Labels**: `documentation`, `devops`
> **Priority**: 🟡 High (Tanpa Docs, Developer Baru Butuh Berminggu-Minggu untuk Paham)
> **Complexity**: 🟢 Simple (Menulis, Bukan Coding — Tapi Membutuhkan Pengetahuan Seluruh Arsitektur)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Semua issue Phase 10 selesai (ini penutup!)

---

## Branch

```
issue/125-documentation-api-docs-readme
```

## Deskripsi

Dokumentasi adalah **peta harta karun** — tanpanya, developer baru akan tersesat di hutan kode. Issue ini membuat 3 dokumen utama:

1. **`README.md` (root)** — Gambaran umum project + panduan setup cepat
2. **`backend/README.md`** — Daftar API endpoint + arsitektur backend
3. **`frontend/README.md`** — Struktur folder + cara development

### Mengapa Dokumentasi Penting?

```
TANPA DOCS:
Developer baru: "Ini project apa? Gimana cara jalanin? API-nya di mana?"
→ Tanya senior → Senior sibuk → Menunggu 3 hari → Akhirnya baca kode 1 per 1
→ Butuh 2 minggu untuk produktif

DENGAN DOCS:
Developer baru: Baca README → Clone → npm install → Jalan dalam 30 menit
→ Produktif di hari pertama!
```

---

## Acceptance Criteria

- [ ] `README.md` (root) berisi deskripsi project, tech stack, dan setup guide.
- [ ] `backend/README.md` berisi daftar modul, API endpoint, dan env vars.
- [ ] `frontend/README.md` berisi struktur folder, scripts, dan env vars.
- [ ] Semua environment variable terdokumentasi.
- [ ] Panduan setup bisa diikuti oleh developer baru dari nol.

---

## Panduan Implementasi

### File 1: `README.md` (Root — Halaman Depan Project)

```markdown
# 🌿 BKSDA SuperApp

> Sistem informasi terintegrasi untuk **Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur**.
> Mengelola website publik, aset negara, inventaris, surat tugas, dan pelaporan dalam satu platform.

---

## 📦 Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Frontend | Next.js + React + TypeScript | 16.x + 19.x |
| UI | Tailwind CSS + shadcn/ui | 4.x |
| Backend | Laravel (PHP) | 11.x |
| Database | PostgreSQL (Supabase) | 15.x |
| Storage | Supabase Storage (S3-compatible) | — |
| Auth | Laravel Sanctum (Bearer Token) | — |
| Deployment | Vercel (Frontend + Backend) | — |

---

## 🏗️ Arsitektur

\```
bksda-superapp/
├── frontend/          ← Next.js (Vercel)
│   ├── src/app/       ← Pages (App Router)
│   ├── src/components/← Reusable UI components
│   └── src/lib/       ← Utilities (api.ts, utils.ts)
│
├── backend/           ← Laravel (Vercel Serverless)
│   ├── app/Modules/   ← Modular architecture
│   │   ├── CMS/       ← Website publik
│   │   ├── BMN/       ← Barang Milik Negara
│   │   ├── Inventory/ ← Inventaris barang
│   │   ├── Core/      ← Employee, shared services
│   │   └── DeReporting/← Laporan & monitoring
│   └── config/        ← CORS, Sanctum, Storage, Logging
│
└── docs/              ← Issue specs & guidelines
    └── issues/        ← 125 issue specifications
\```

---

## 🚀 Quick Start (5 Menit)

### Prerequisites

- Node.js 20+ & npm
- PHP 8.2+ & Composer
- PostgreSQL (atau Supabase account)

### 1. Clone & Install

\```bash
git clone https://github.com/your-org/bksda-superapp.git
cd bksda-superapp

# Frontend
cd frontend
npm install
cp .env.example .env.local

# Backend
cd ../backend
composer install
cp .env.example .env
php artisan key:generate
\```

### 2. Konfigurasi Database

\```bash
# Edit backend/.env → isi DB_HOST, DB_USERNAME, DB_PASSWORD
# Lihat docs/issues/123-deployment-supabase-db-setup.md

php artisan migrate
php artisan db:seed
\```

### 3. Jalankan

\```bash
# Terminal 1: Backend
cd backend
php artisan serve

# Terminal 2: Frontend
cd frontend
npm run dev
\```

Buka http://localhost:3000 🎉

---

## 📚 Dokumentasi Lengkap

| Dokumen | Lokasi |
|---------|--------|
| API Endpoints | `backend/README.md` |
| Frontend Guide | `frontend/README.md` |
| Issue Specs (125) | `docs/issues/*.md` |
| CORS & Auth | `docs/issues/116-*.md` |
| Deployment Guide | `docs/issues/121-*.md` (FE) + `docs/issues/122-*.md` (BE) |
| Database Setup | `docs/issues/123-*.md` |
```

---

### File 2: `backend/README.md` — Dokumentasi API

```markdown
# 🔧 BKSDA SuperApp — Backend

> Laravel 11 API backend dengan arsitektur modular.

---

## 🏗️ Arsitektur Modular

\```
app/Modules/
├── CMS/           ← Website publik BKSDA
│   ├── Controllers/
│   │   ├── Admin/       ← CRUD admin (auth required)
│   │   └── PublicController.php  ← Read-only (no auth)
│   ├── Models/
│   └── routes.php
│
├── BMN/           ← Barang Milik Negara
│   ├── Controllers/
│   ├── Models/    ← Asset, AssetLoan, AssetUpdate
│   └── routes.php
│
├── Inventory/     ← Inventaris barang habis pakai
│   ├── Controllers/
│   ├── Models/    ← Item, Category, Warehouse, StockTransaction
│   ├── Services/  ← InventoryService (business logic)
│   └── routes.php
│
├── Core/          ← Data shared (Employee)
│   ├── Controllers/
│   ├── Models/    ← Employee
│   └── routes.php
│
└── DeReporting/   ← Pelaporan & monitoring
    ├── Controllers/
    ├── Models/    ← Tahun, Anggaran, Koordinator, JenisData, dll
    ├── Database/Seeders/
    └── routes.php
\```

---

## 📡 API Endpoints

### Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/login` | ❌ | Login → return Bearer token |
| POST | `/api/logout` | ✅ | Logout → revoke token |
| GET | `/api/me` | ✅ | Get current user info |

### CMS — Public (Tanpa Auth)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/cms/public/home` | Data homepage (berita terbaru, dll) |
| GET | `/api/cms/public/navbar` | Menu navigasi |
| GET | `/api/cms/public/informasi` | Daftar berita |
| GET | `/api/cms/public/informasi/{slug}` | Detail berita |
| GET | `/api/cms/public/kawasan` | Daftar kawasan konservasi |
| GET | `/api/cms/public/kawasan/{slug}` | Detail kawasan |
| GET | `/api/cms/public/tsl` | Daftar TSL (satwa/tumbuhan) |
| GET | `/api/cms/public/tsl/{slug}` | Detail TSL |
| GET | `/api/cms/public/buku` | Daftar buku digital |
| GET | `/api/cms/public/leaflet` | Daftar leaflet |
| GET | `/api/cms/public/poster` | Daftar poster |
| GET | `/api/cms/public/regulasi` | Daftar regulasi |
| GET | `/api/cms/public/photo` | Galeri foto |
| GET | `/api/cms/public/video` | Galeri video |

### CMS — Admin (Auth + Role: admin/super_admin)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/cms/admin/{resource}` | List (paginated) |
| POST | `/api/cms/admin/{resource}` | Create |
| GET | `/api/cms/admin/{resource}/{id}` | Show detail |
| PUT | `/api/cms/admin/{resource}/{id}` | Update |
| DELETE | `/api/cms/admin/{resource}/{id}` | Delete |

**Resources:** `category`, `informasi`, `profil`, `tsl`, `kawasan`, `website`, `kepala`, `photo`, `video`, `pesan`, `link`, `jenis`, `buku`, `leaflet`, `poster`, `regulasi`, `menu`

### BMN — Aset (Auth Required)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/bmn/assets` | Daftar aset (paginated + filter) |
| POST | `/api/bmn/assets` | Tambah aset baru |
| GET | `/api/bmn/assets/{id}` | Detail aset |
| PUT | `/api/bmn/assets/{id}` | Update aset |
| DELETE | `/api/bmn/assets/{id}` | Soft delete aset |
| GET | `/api/bmn/assets/export` | Export Excel |
| POST | `/api/bmn/loans` | Peminjaman aset |
| PUT | `/api/bmn/loans/{id}/return` | Pengembalian aset |

### Inventory (Auth Required)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/inventory/items` | Daftar barang |
| POST | `/api/inventory/stock-in` | Stok masuk |
| POST | `/api/inventory/stock-out` | Stok keluar |
| GET | `/api/inventory/transactions` | Riwayat transaksi |
| GET | `/api/inventory/reports` | Laporan stok |

---

## 🔒 Autentikasi

Semua endpoint admin menggunakan **Bearer Token** (Laravel Sanctum):

\```
Authorization: Bearer 4|abc123xyz...
\```

Dapatkan token via `POST /api/login`:
\```json
// Request
{ "username": "admin", "password": "xxx" }

// Response
{ "token": "4|abc123xyz...", "user": { ... } }
\```

---

## ⚙️ Environment Variables

| Variable | Contoh | Deskripsi |
|----------|--------|-----------|
| `APP_KEY` | `base64:xxx` | Kunci enkripsi (generate via artisan) |
| `APP_DEBUG` | `false` | **WAJIB false di production!** |
| `APP_URL` | `https://api.bksda.app` | URL backend |
| `FRONTEND_URL` | `https://bksda.app` | URL frontend (untuk CORS) |
| `DB_CONNECTION` | `pgsql` | Driver database |
| `DB_HOST` | `pooler.supabase.com` | Host Supabase |
| `DB_PORT` | `6543` | Port pooler |
| `DB_USERNAME` | `postgres.xxx` | Username Supabase |
| `DB_PASSWORD` | `xxx` | Password database |
| `SANCTUM_TOKEN_EXPIRATION` | `10080` | Token 7 hari |
| `LOG_CHANNEL` | `stderr` | Log channel (stderr di Vercel) |
| `SESSION_DRIVER` | `array` | Session driver (array di Vercel) |
```

---

### File 3: `frontend/README.md` — Dokumentasi Frontend

```markdown
# 🖥️ BKSDA SuperApp — Frontend

> Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui

---

## 🚀 Quick Start

\```bash
npm install
cp .env.example .env.local
npm run dev
\```

Buka http://localhost:3000

---

## 📁 Struktur Folder

\```
src/
├── app/                    ← Pages (Next.js App Router)
│   ├── page.tsx            ← Homepage publik
│   ├── layout.tsx          ← Root layout
│   ├── login/              ← Halaman login
│   ├── informasi/          ← Berita publik
│   ├── kawasan/            ← Kawasan konservasi
│   ├── publikasi/          ← Buku, leaflet, poster
│   ├── cms/                ← Admin panel CMS
│   │   └── admin/          ← CRUD pages
│   ├── bmn/                ← Admin BMN
│   └── inventory/          ← Admin Inventaris
│
├── components/
│   ├── ui/                 ← shadcn/ui components (23 files)
│   ├── layout/             ← AdminLayout, PublicLayout, Sidebar
│   └── admin/              ← Admin-specific components
│
└── lib/
    ├── api.ts              ← Axios instance + Bearer token interceptor
    ├── utils.ts            ← cn(), sanitizeHtml(), normalizeImageUrl()
    ├── constants.ts        ← Menu items, environment URLs
    ├── bmn-utils.ts        ← Format mata uang, kondisi aset
    └── letter-utils.ts     ← Format tanggal surat, terbilang
\```

---

## 📜 NPM Scripts

| Script | Perintah | Fungsi |
|--------|----------|--------|
| `dev` | `next dev --webpack` | Development server (port 3000) |
| `build` | `next build --webpack` | Production build |
| `start` | `next start` | Jalankan production build |
| `lint` | `eslint` | Cek kualitas kode |

---

## ⚙️ Environment Variables

| Variable | Contoh | Deskripsi |
|----------|--------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL backend API |
| `NEXT_PUBLIC_STORAGE_URL` | `https://xxx.supabase.co/storage/v1/object/public/cms` | URL Supabase Storage |

> ⚠️ `NEXT_PUBLIC_*` terekspos ke browser. Jangan taruh secret!

---

## 🔑 API Pattern

\```typescript
// Admin API (dengan token) — gunakan ini
import api from "@/lib/api";
const { data } = await api.get("/api/cms/admin/informasi");

// Public API (tanpa token) — untuk halaman publik
import axios from "axios";
const { data } = await axios.get(`${API_URL}/api/cms/public/informasi`);
\```

**JANGAN** gunakan `api` (instance dengan token) untuk endpoint publik!
Token akan bocor ke response yang bisa di-cache CDN.
```

---

## Troubleshooting

### Q: Developer baru bilang "README terlalu panjang"!

**Solusi:** README root cukup Quick Start. Detail lengkap di `backend/README.md` dan `frontend/README.md`. Yang urgent: "Clone → Install → Run" dalam 5 langkah.

### Q: API endpoint berubah tapi docs belum update!

**Best Practice:** Tambahkan task "Update README" di setiap PR yang mengubah route.

### Q: Bagaimana menjaga docs tetap sinkron dengan kode?

**Solusi praktis:**
1. `php artisan route:list --json` → export daftar route terkini
2. Bandingkan dengan README secara berkala
3. Atau tambahkan check di CI: "apakah ada route baru yang belum di-doc?"

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "docs: create project README, backend API docs, and frontend guide" --body "Closes #125" --label "documentation,devops"
git checkout -b issue/125-documentation-api-docs-readme
# Buat README.md (root), backend/README.md, frontend/README.md
git commit -m "docs: add project README, API endpoint docs, and frontend setup guide (#125)"
git push -u origin issue/125-documentation-api-docs-readme
gh pr create --title "docs: project documentation (#125)" --body "## Changes
- README.md (root): Tech stack, arsitektur, Quick Start 5 menit.
- backend/README.md: Daftar API endpoint, auth flow, env vars.
- frontend/README.md: Struktur folder, scripts, API pattern.
- Semua env vars terdokumentasi di masing-masing README.
Closes #125" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\ (route files, folder structure)
Ini adalah issue TERAKHIR di Phase 10.

## Task

Kerjakan Issue #125 (Documentation — API Docs & README).
Ikuti instruksi di: `docs/issues/125-documentation-api-docs-readme.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `README.md` (root): deskripsi, tech stack, arsitektur diagram, Quick Start.
3. Buat `backend/README.md`: daftar API endpoint lengkap, auth flow, env vars.
4. Buat `frontend/README.md`: struktur folder, npm scripts, API pattern.
5. KRUSIAL: Jangan copy README Laravel default — tulis spesifik untuk project!
6. KRUSIAL: Dokumentasikan SEMUA env vars di masing-masing README.
7. Verifikasi: developer baru bisa ikuti Quick Start dari nol.
8. Lakukan Git push dan `gh pr create`.
````
