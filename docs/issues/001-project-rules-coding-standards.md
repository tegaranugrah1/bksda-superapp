# Issue #001 — Project Rules & Coding Standards

> **Type**: `chore`
> **Labels**: `setup`, `foundation`, `documentation`
> **Priority**: 🔴 Critical (semua issue lain bergantung pada ini)
> **Complexity**: 🟢 Simple (copy-paste, tidak ada logic)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama — cukup model murah
> **Dependencies**: Tidak ada (ini issue pertama)

---

## Branch

```
issue/001-project-rules-coding-standards
```

## Deskripsi

Setup file-file fondasi project `bksda-superapp` monorepo. Issue ini hanya membuat file konfigurasi dan dokumentasi — **tidak ada kode aplikasi**.

Setelah issue ini selesai, developer (manusia atau AI) punya panduan lengkap tentang:
- Aturan coding
- Struktur folder
- Naming convention
- Deployment strategy
- Git workflow

---

## Files yang Harus Dibuat

```
e:\bksda-superapp\
├── .editorconfig          ← NEW
├── .gitignore             ← NEW
├── README.md              ← NEW
├── RULES.md               ← NEW
├── docs/
│   ├── issues/            ← sudah ada
│   └── HANDOFF.md         ← NEW (template kosong)
├── backend/
│   └── .gitignore         ← NEW
└── frontend/
    └── .gitignore         ← NEW
```

Total: **6 file baru**

---

## Acceptance Criteria

- [ ] File `.editorconfig` ada di root project
- [ ] File `.gitignore` ada di root, `backend/`, dan `frontend/`
- [ ] File `README.md` ada di root dengan info project lengkap
- [ ] File `RULES.md` ada di root dengan 11 section aturan
- [ ] File `docs/HANDOFF.md` ada (template kosong)
- [ ] Semua file bisa dibaca & tidak ada syntax error
- [ ] Git commit message: `chore: setup project rules & coding standards (#001)`

---

## File 1: `.editorconfig`

**Path**: `e:\bksda-superapp\.editorconfig`

```editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 4
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2

[*.{js,jsx,ts,tsx,json,css}]
indent_size = 2

[compose.yaml]
indent_size = 4

[Makefile]
indent_style = tab
```

---

## File 2: `.gitignore` (Root)

**Path**: `e:\bksda-superapp\.gitignore`

```gitignore
# ========================
# OS / IDE
# ========================
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.swo
.fleet/
.zed/

# ========================
# Node
# ========================
node_modules/

# ========================
# Logs
# ========================
*.log

# ========================
# Data Files (tidak perlu di repo)
# ========================
*.xlsx
*.xls
*.csv
*.sql

# ========================
# Temporary / Utility Scripts (root level)
# ========================
check_*.js
parse_*.js
scrape_*.py
extract_*.py
inspect_*.py

# ========================
# Images & Documents at Root (tidak perlu di repo)
# ========================
/*.png
/*.jpg
/*.jpeg
/*.pdf
/*.webp

# ========================
# Sensitive / Environment
# ========================
.env
.env.*
!.env.example

# ========================
# AI Agent Folders
# ========================
.agent/
.kilocode/
.gemini/

# ========================
# Data Dumps
# ========================
*_dump.json
raw_*.txt
```

---

## File 3: `backend/.gitignore`

**Path**: `e:\bksda-superapp\backend\.gitignore`

```gitignore
# Laravel
/vendor
/node_modules
/public/build
/public/hot
/public/storage
/storage/*.key
/storage/pail
Homestead.json
Homestead.yaml

# Environment
.env
.env.backup
.env.production

# IDE
.phpactor.json
.phpunit.result.cache
/.phpunit.cache
/.fleet
/.idea
/.nova
/.vscode
/.zed
/auth.json

# OS
.DS_Store
Thumbs.db

# Database (SQLite local dev)
/database/*.sqlite
/database/*.sqlite-journal
/database/*.sqlite-wal

# Logs
*.log

# Vercel
.vercel
```

---

## File 4: `frontend/.gitignore`

**Path**: `e:\bksda-superapp\frontend\.gitignore`

```gitignore
# Dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# OS
.DS_Store
Thumbs.db

# Keys
*.pem

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Environment (local)
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Misc logs
frontend_logs.txt
target_html.txt
```

---

## File 5: `README.md`

**Path**: `e:\bksda-superapp\README.md`

```markdown
# BKSDA SuperApp

> Sistem Informasi Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Laravel 12, PHP 8.3, Sanctum, Spatie Permission |
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS 4, shadcn/ui |
| **Database** | PostgreSQL 15 |
| **Storage** | Supabase Storage (S3-compatible) |
| **Deployment** | Vercel (FE + BE) + Supabase (DB) |

## Modules

| Module | Prefix API | Deskripsi |
|--------|-----------|-----------|
| **Core** | `/api/` | Auth, Dashboard, User Profile |
| **Kepegawaian** | `/api/kepegawaian/` | Manajemen Pegawai |
| **Surat Tugas** | `/api/surat-tugas/` | Surat Tugas & Disposisi |
| **BMN** | `/api/bmn/` | Barang Milik Negara (aset pemerintah) |
| **Inventory** | `/api/inventory/` | Persediaan & stok barang |
| **DeReporting** | `/api/dereporting/` | Laporan data internal & eksternal |
| **CMS** | `/api/cms/` | Content Management System website |

## Quick Start (Local Development)

### Prerequisites

- PHP 8.3+
- Composer
- Node.js 20+
- Docker (untuk PostgreSQL)

### 1. Clone & Setup

```bash
git clone https://github.com/{owner}/bksda-superapp.git
cd bksda-superapp
```

### 2. Start Database

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 5. Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

## Project Structure

```
bksda-superapp/
├── backend/                    # Laravel 12 API
│   ├── app/
│   │   ├── Http/Middleware/    # Auth, Role, Module, Audit
│   │   ├── Models/             # User model
│   │   └── Modules/            # Modular architecture
│   │       ├── Kepegawaian/    # Manajemen Pegawai
│   │       ├── SuratTugas/     # Surat Tugas
│   │       ├── BMN/            # Barang Milik Negara
│   │       ├── Inventory/      # Persediaan
│   │       ├── DeReporting/    # Laporan Data
│   │       └── CMS/            # Website Management
│   ├── config/
│   ├── database/migrations/
│   └── routes/
├── frontend/                   # Next.js 16
│   ├── src/
│   │   ├── app/                # Pages (App Router)
│   │   ├── components/         # Reusable components
│   │   ├── lib/                # API client, utils
│   │   └── types/              # TypeScript interfaces
│   └── public/assets/          # Static assets
├── docker/                     # Docker configs
├── docs/                       # Documentation & issues
│   ├── issues/                 # Issue tracking MDs
│   └── HANDOFF.md              # AI model handoff tracker
├── .editorconfig
├── .gitignore
├── RULES.md                    # Coding standards
└── README.md                   # This file
```

## Deployment

### Phase 1 (Current)
- **Database**: Supabase (PostgreSQL managed)
- **Frontend**: Vercel
- **Backend**: Vercel (via `vercel.json` + `nixpacks.toml`)

### Phase 2 (Future)
- **VPS**: Self-hosted dengan Docker Compose

## Documentation

- [RULES.md](./RULES.md) — Coding standards & project rules
- [docs/issues/](./docs/issues/) — Issue tracker
- [docs/HANDOFF.md](./docs/HANDOFF.md) — AI model handoff protocol
```

---

## File 6: `RULES.md`

**Path**: `e:\bksda-superapp\RULES.md`

> ⚠️ Ini adalah file terpenting. Semua AI model dan developer WAJIB baca file ini.

```markdown
# BKSDA SuperApp — Project Rules

> Semua development **wajib** mengikuti aturan ini tanpa pengecualian.
> File ini adalah single source of truth untuk coding standards.

---

## 1. Security Rules

| # | Rule |
|---|------|
| 1.1 | Semua endpoint **wajib** `auth:sanctum`, kecuali yang **eksplisit public** |
| 1.2 | Endpoint public hanya boleh: login, public form submit, tracking status, master data read-only |
| 1.3 | Jangan pernah gunakan `$guarded = []` — harus pakai `$fillable` |
| 1.4 | Selalu sanitasi input user di controller sebelum `create()`/`update()` |
| 1.5 | Password harus di-hash via `casts` (`'password' => 'hashed'`) |
| 1.6 | Token Sanctum wajib diterapkan di semua modul |
| 1.7 | Jangan expose stack trace / error detail di production (`APP_DEBUG=false`) |

---

## 2. Access Control Rules

| # | Rule |
|---|------|
| 2.1 | User hanya boleh akses modul yang ada di `access_modules` |
| 2.2 | Validasi `access_modules` harus dilakukan di **middleware level**, bukan di frontend saja |
| 2.3 | Role `super_admin` boleh akses semua modul |
| 2.4 | Setiap user harus punya minimal 1 default module |
| 2.5 | Operasi CRUD pada master data hanya boleh dilakukan oleh `admin` atau `super_admin` |

---

## 3. Database Rules

| # | Rule |
|---|------|
| 3.1 | Semua list endpoint **wajib pagination** — jangan `Model::all()` |
| 3.2 | Gunakan eager loading untuk mencegah N+1 query |
| 3.3 | Foreign key harus di-index di migration |
| 3.4 | Hindari `SELECT *` — gunakan `->select()` di query berat |
| 3.5 | Semua write operation harus di-log: `user_id`, `timestamp`, `action` |
| 3.6 | Model yang punya relasi **wajib soft delete** |
| 3.7 | Nama tabel module harus ber-prefix: `kpg_`, `st_`, `bmn_`, `inv_`, `dr_`, `cms_` |
| 3.8 | Multi-step write operation **wajib** pakai `DB::transaction()` untuk data consistency |
| 3.9 | Setiap migration harus bisa di-rollback (`down()` method wajib ada) |

---

## 4. File Upload Rules

| # | Rule |
|---|------|
| 4.1 | Validasi file type secara strict (MIME + extension) |
| 4.2 | Batasi ukuran file (max 10 MB default, configurable) |
| 4.3 | Generate nama file unik (UUID/hash), jangan pakai nama asli |
| 4.4 | Simpan upload di **private storage** (`storage/app/private/`) |
| 4.5 | Akses file lewat signed URL atau endpoint dengan auth check |
| 4.6 | Log IP uploader untuk file dari public form |

---

## 5. API Response Rules

| # | Rule |
|---|------|
| 5.1 | Format response konsisten: `{ data, message?, meta? }` |
| 5.2 | Error response: `{ error, message, code? }` |
| 5.3 | List endpoint wajib return `meta` pagination: `{ current_page, last_page, per_page, total }` |
| 5.4 | HTTP status code harus sesuai: `200` OK, `201` Created, `422` Validation, `403` Forbidden, `404` Not Found |
| 5.5 | Jangan return data sensitif (password, token, internal ID yang tidak perlu) |
| 5.6 | Response wajib lewat **API Resource** (`JsonResource` / `ResourceCollection`), jangan return model langsung |
| 5.7 | Custom **Exception Handler** untuk error format yang konsisten di seluruh API |

---

## 6. Module-Specific Rules

### 6.1 Kepegawaian Module
- Employee data bersifat **global** (dipakai oleh semua modul)
- Tidak boleh hard-delete employee yang masih punya record aktif
- Employee harus support status `is_active`
- User–Employee linked via `username` ↔ `nip`
- Tabel prefix: `kpg_`
- API prefix: `/api/kepegawaian/`

### 6.2 Surat Tugas Module
- Surat tugas bisa dibuat oleh admin atau submit publik
- Setiap ST harus referensi `employee_id` (siapa yang ditugaskan)
- Support soft delete & restore
- Tabel prefix: `st_`
- API prefix: `/api/surat-tugas/`

### 6.3 BMN Module (Barang Milik Negara)
- Setiap asset harus punya `kode_barang` yang **unik**
- Perubahan status asset harus buat **history record** (`AssetUpdate`)
- Peminjaman (`AssetLoan`) wajib referensi `employee_id`
- Pengembalian harus update status dan close loan record
- Penghapusan asset hanya **soft delete**
- Photo upload harus validasi file type (`jpg`, `png`, `webp`) dan max size

### 6.4 Inventory Module
- Setiap perpindahan stok **wajib** buat `StockTransaction` record
- Stok **tidak boleh** di bawah 0 (validasi sebelum `stockOut`)
- Peminjaman harus referensi `employee_id` (siapa yang pinjam)
- Import data harus validasi format kolom sebelum insert

### 6.5 DeReporting Module
- Public upload endpoint (laporan eksternal) harus:
  - Rate limiting (max 10 request/menit per IP)
  - Validasi file type strict
  - Log IP address pengirim
- Internal report wajib attach `user_id` sebagai uploader
- Master data (Tahun, Bidang, Jenis, dll.) read endpoint boleh public, tapi write **harus auth**
- File laporan disimpan di private storage, akses via signed URL

### 6.6 CMS Module
- Content harus punya `slug` untuk SEO-friendly URL
- Image upload ke Supabase Storage bucket `cms`
- Admin endpoint wajib `auth:sanctum` + `role:admin,super_admin`
- Public endpoint untuk read-only (tanpa auth)

---

## 7. Frontend Rules

| # | Rule |
|---|------|
| 7.1 | **Tidak boleh** ada business logic di frontend — hanya presentasi & validasi form |
| 7.2 | Semua API call harus lewat `lib/api.ts` (axios instance dengan token interceptor) |
| 7.3 | Semua halaman admin harus cek auth state — redirect ke login jika tidak ada token |
| 7.4 | Form validation harus ada di **kedua sisi** (frontend + backend) |
| 7.5 | Gunakan `useMemo` / `useCallback` untuk menghindari re-render yang tidak perlu |
| 7.6 | Semua list view harus pagination — jangan render semua data sekaligus |
| 7.7 | **Dilarang** pakai type `any` — semua harus typed eksplisit |
| 7.8 | Default **Server Component** — hanya tambah `"use client"` jika butuh interactivity (state, event, hooks) |
| 7.9 | Setiap route folder **wajib** ada `loading.tsx` untuk skeleton/loading state |
| 7.10 | Semua gambar wajib pakai `<Image>` dari `next/image`, bukan `<img>` |
| 7.11 | Logik reusable harus di-extract ke custom hook `hooks/useXxx.ts` |
| 7.12 | Semua halaman CMS public di dalam route group `(website)/`, hanya landing di root |

---

## 8. Architecture Rules

| # | Rule |
|---|------|
| 8.1 | Semua fitur baru **wajib** ikuti struktur modular (`app/Modules/{ModuleName}/`) |
| 8.2 | Setiap modul harus punya: `Controllers/`, `Models/`, `Routes/`, `Migrations/`, `Requests/`, `Resources/`, `ServiceProvider` |
| 8.3 | Route module di-register via `ServiceProvider` dengan prefix `api/{module-name}` |
| 8.4 | Jangan letakkan logic di route file — gunakan Controller |
| 8.5 | Service class untuk business logic kompleks (contoh: `InventoryService`) |
| 8.6 | Seeding data test di `Database/Seeders/` dalam modul masing-masing |
| 8.7 | Auth (login/logout/me) **bukan modul** — ditangani langsung di `app/Http/Controllers/` |
| 8.8 | Controller harus **thin** — hanya: validate (FormRequest) → call service → return resource |
| 8.9 | Setiap endpoint POST/PUT/PATCH **wajib** pakai `FormRequest` class untuk validasi |
| 8.10 | Semua response **wajib** lewat `API Resource` class (`JsonResource`) |
| 8.11 | Status values **wajib** pakai **PHP Enum** (PHP 8.3), bukan magic string |
| 8.12 | Semua method harus punya **return type hint** (`: JsonResponse`, `: void`, `: Collection`) |
| 8.13 | Semua method dan class harus punya **PHPDoc** untuk method kompleks |

---

## 9. Development Workflow Rules

| # | Rule |
|---|------|
| 9.1 | Prioritaskan **keamanan** di atas kecepatan |
| 9.2 | Minimalisir database load |
| 9.3 | Hindari cloud cost yang tidak perlu |
| 9.4 | Setiap PR harus review security checklist |
| 9.5 | Naming convention: `snake_case` untuk DB column, `camelCase` untuk JS/TS variable |
| 9.6 | Git workflow: issue → branch → work → commit → PR → merge → delete branch |
| 9.7 | Commit message format: `{type}: {message} (#{issue_number})` |
| 9.8 | Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test` |
| 9.9 | **Backend formatting**: wajib pakai **Laravel Pint** (`./vendor/bin/pint`) sebelum commit |
| 9.10 | **Frontend formatting**: wajib pakai **ESLint** + **Prettier** — auto format on save |
| 9.11 | **Dilarang hardcode string** untuk status/label/option — pakai Enum (BE) atau `constants.ts` (FE) |
| 9.12 | Setiap PR harus memastikan **no lint errors** dan **no TypeScript errors** |

---

## 10. Infrastructure Rules

| # | Rule |
|---|------|
| 10.1 | **Development lokal**: `php artisan serve` (BE) + `npm run dev` (FE) — BUKAN Docker |
| 10.2 | **Docker hanya untuk database**: PostgreSQL 15 via `docker compose up -d` |
| 10.3 | **Deployment Phase 1**: Supabase (DB) + Vercel (FE deploy) + Vercel (BE deploy) |
| 10.4 | **Deployment Phase 2** (kedepannya): VPS sendiri dengan Docker Compose full |
| 10.5 | Frontend dan Backend di-deploy sebagai **2 project Vercel terpisah** |
| 10.6 | Environment variables **tidak boleh hardcode** — selalu dari `.env` |
| 10.7 | File storage production menggunakan **Supabase Storage** (S3-compatible) |

---

## 11. AI Model Usage Rules

| # | Rule |
|---|------|
| 11.1 | Setiap issue MD harus punya section `🤖 AI Prompt` untuk model switching |
| 11.2 | Sebelum pindah AI model: **commit & push** dulu |
| 11.3 | Jangan pindah model di tengah issue — selesaikan atau commit WIP |
| 11.4 | Wajib update `docs/HANDOFF.md` saat mulai & selesai mengerjakan issue |
| 11.5 | Model murah (Flash/Kimi/Ollama) untuk task simple, model mahal (Opus) untuk task complex |
| 11.6 | Jika token habis: commit WIP → update HANDOFF.md → gunakan Recovery Prompt |
```

---

## File 7: `docs/HANDOFF.md`

**Path**: `e:\bksda-superapp\docs\HANDOFF.md`

```markdown
# 🔄 HANDOFF — Progress Tracker

> File ini di-update oleh AI setiap kali mulai & selesai mengerjakan issue.
> Gunakan file ini untuk melanjutkan pekerjaan jika model AI berganti di tengah jalan.

## Status Saat Ini

| Field | Value |
|-------|-------|
| **Issue Aktif** | #001 — Project Rules & Coding Standards |
| **Branch** | `issue/001-project-rules-coding-standards` |
| **Model Terakhir** | — |
| **Timestamp** | — |
| **Status** | ⬜ NOT STARTED |

## Progress Checklist

- [ ] `.editorconfig`
- [ ] `.gitignore` (root)
- [ ] `backend/.gitignore`
- [ ] `frontend/.gitignore`
- [ ] `README.md`
- [ ] `RULES.md`
- [ ] `docs/HANDOFF.md`

## File yang Sudah Dibuat/Diubah

```
(belum ada)
```

## Catatan untuk Model Selanjutnya

Ini adalah issue pertama. Tidak ada dependency.

## Error / Blocker

Tidak ada.
```

---

## Git Workflow (Professional)

Ikuti urutan ini **persis**. Jangan skip langkah.

### Prerequisite: Install GitHub CLI

```bash
# Cek apakah gh sudah terinstall
gh --version

# Kalau belum, install:
# Windows: winget install --id GitHub.cli
# Mac: brew install gh
# Linux: sudo apt install gh

# Login (sekali saja)
gh auth login
```

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: setup project rules & coding standards" \
  --body "Setup file-file fondasi project: .editorconfig, .gitignore, README.md, RULES.md, docs/HANDOFF.md. Detail lengkap di docs/issues/001-project-rules-coding-standards.md" \
  --label "setup,foundation,documentation"
```

> ⚠️ Catat nomor issue yang muncul (misal `#1`). Gunakan nomor ini di commit message.

### Step 2: Buat Branch dari Issue

```bash
# Buat branch baru dari main
git checkout main
git pull origin main
git checkout -b issue/001-project-rules-coding-standards
```

### Step 3: Kerjakan (Buat Semua File)

Buat 7 file sesuai spesifikasi di atas.

### Step 4: Commit & Push

```bash
# Stage semua file baru
git add .editorconfig .gitignore README.md RULES.md
git add backend/.gitignore frontend/.gitignore
git add docs/HANDOFF.md

# Commit (gunakan nomor issue GitHub yang sebenarnya)
git commit -m "chore: setup project rules & coding standards (#1)"

# Push branch ke remote
git push -u origin issue/001-project-rules-coding-standards
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: setup project rules & coding standards (#1)" \
  --body "## Summary
Setup file-file fondasi project bksda-superapp monorepo.

## Files Created
- \`.editorconfig\` — Editor formatting rules
- \`.gitignore\` (root, backend, frontend) — Git ignore rules
- \`README.md\` — Project documentation & quick start
- \`RULES.md\` — 11 section coding standards
- \`docs/HANDOFF.md\` — AI model handoff tracker

## Checklist
- [x] .editorconfig
- [x] .gitignore (root + backend + frontend)
- [x] README.md
- [x] RULES.md (11 sections)
- [x] docs/HANDOFF.md

Closes #1" \
  --base main
```

### Step 6: Merge PR

```bash
# Merge PR (squash merge untuk commit history bersih)
gh pr merge --squash --delete-branch
```

### Step 7: Sync Local

```bash
git checkout main
git pull origin main
```

### Ringkasan Flow

```
┌─────────────────────────────────────────────────────┐
│  1. gh issue create                → Buat issue #1  │
│  2. git checkout -b issue/001-...  → Buat branch    │
│  3. (buat semua file)              → Kerjakan       │
│  4. git commit + git push          → Commit & push  │
│  5. gh pr create                   → Buat PR        │
│  6. gh pr merge --squash           → Merge + hapus  │
│  7. git checkout main + pull       → Sync local     │
└─────────────────────────────────────────────────────┘
```

---

## 🤖 AI Prompt

Gunakan prompt di bawah ini jika kamu pindah ke model AI lain (Gemini Flash, Kimi, Ollama, dll).
Copy-paste seluruh blok ini sebagai prompt pertama.

---

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Ini adalah ISSUE PERTAMA — belum ada file apapun selain folder kosong dan docs/issues/.

## Task

Buat 7 file berikut di project `e:\bksda-superapp\`. Isi setiap file sudah 
ditulis lengkap di file `docs/issues/001-project-rules-coding-standards.md`.

Buka file issue tersebut, lalu buat setiap file PERSIS seperti yang tertulis.

### Files to Create
1. `.editorconfig` — di root
2. `.gitignore` — di root  
3. `backend/.gitignore`
4. `frontend/.gitignore`
5. `README.md` — di root
6. `RULES.md` — di root
7. `docs/HANDOFF.md`

### Git Workflow (WAJIB ikuti urutan ini)

```bash
# 1. Buat issue di GitHub
cd e:\bksda-superapp
gh issue create --title "chore: setup project rules & coding standards" --body "Detail di docs/issues/001-project-rules-coding-standards.md" --label "setup,foundation,documentation"

# 2. Buat branch (CATAT nomor issue dari step 1, misal #1)
git checkout main
git pull origin main
git checkout -b issue/001-project-rules-coding-standards

# 3. Buat semua 7 file (sesuai isi di issue MD)

# 4. Commit & push
git add .
git commit -m "chore: setup project rules & coding standards (#1)"
git push -u origin issue/001-project-rules-coding-standards

# 5. Buat Pull Request
gh pr create --title "chore: setup project rules & coding standards (#1)" --body "Closes #1" --base main

# 6. Merge PR
gh pr merge --squash --delete-branch

# 7. Sync local
git checkout main
git pull origin main
```

### Rules
- Copy PERSIS seperti yang ada di issue MD, jangan modifikasi
- Pastikan encoding UTF-8 dan line ending LF
- Setelah selesai, update docs/HANDOFF.md status menjadi ✅ DONE
- WAJIB buat GitHub issue SEBELUM mulai kerja
- WAJIB buat PR, jangan langsung merge ke main

### HANDOFF
Sebelum selesai/berhenti, WAJIB update `docs/HANDOFF.md` dengan progress terkini.
````

