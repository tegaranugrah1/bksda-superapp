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
