# BKSDA SuperApp

> Sistem informasi terintegrasi untuk **Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur**.
> Mengelola website publik, aset negara (BMN), inventaris barang, surat tugas, dan pelaporan dalam satu platform.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend** | Laravel (PHP) | 11.x |
| **Frontend** | Next.js + React + TypeScript | 16.x + 19.x |
| **UI** | Tailwind CSS + shadcn/ui | 4.x |
| **Database** | PostgreSQL (Supabase) | 15.x |
| **Storage** | Supabase Storage (S3-compatible) | - |
| **Auth** | Laravel Sanctum (Bearer Token) | - |
| **Deployment** | Vercel (Frontend + Backend) | - |

---

## Modules

| Module | Prefix API | Description |
|--------|------------|-------------|
| **Kepegawaian** | `/api/kepegawaian/` | Employee management |
| **Surat Tugas** | `/api/surat-tugas/` | Assignment letters |
| **BMN** | `/api/bmn/` | Barang Milik Negara (government assets) |
| **Inventory** | `/api/inventory/` | Inventory & stock management |
| **DeReporting** | `/api/dereporting/` | Internal & external reporting |
| **CMS** | `/api/cms/` | Website content management |

---

## Quick Start (5 Minutes)

### Prerequisites

- PHP 8.2+ & Composer
- Node.js 20+ & npm
- PostgreSQL (local via Docker, or Supabase)

### 1. Clone & Install

```bash
git clone https://github.com/tegaranugrah1/bksda-superapp.git
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
```

### 2. Database Setup

```bash
# Start PostgreSQL (if local)
docker compose up -d

# Run migrations & seed
php artisan migrate
php artisan db:seed
```

### 3. Run

```bash
# Terminal 1: Backend
cd backend
php artisan serve

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

### 4. Login

Default super admin credentials:
- **NIP**: `198001012005011001`
- **Password**: `Bksda2026!@#`

---

## Project Structure

```
bksda-superapp/
├── frontend/                    # Next.js (Vercel)
│   ├── src/
│   │   ├── app/               # Pages (App Router)
│   │   │   ├── (website)/     # Public pages (homepage, news, kawasan, etc.)
│   │   │   ├── (dashboard)/   # Admin dashboard pages
│   │   │   └── login/         # Login page
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── custom/        # Custom components
│   │   └── lib/
│   │       ├── api.ts          # Axios instance with Bearer token
│   │       └── utils.ts        # Utilities (cn, formatDate, etc.)
│   └── public/
│
├── backend/                     # Laravel (Vercel Serverless)
│   ├── app/
│   │   ├── Models/            # User model
│   │   └── Modules/           # Modular architecture
│   │       ├── Kepegawaian/   # Employee management
│   │       ├── SuratTugas/    # Assignment letters
│   │       ├── BMN/           # Government assets
│   │       ├── Inventory/     # Stock management
│   │       ├── DeReporting/   # Reporting
│   │       └── CMS/           # Content management
│   ├── config/                # Laravel configs
│   ├── database/
│   │   ├── migrations/        # Database migrations
│   │   └── seeders/          # Database seeders
│   └── routes/                # API routes
│
├── docs/                       # Documentation
│   ├── issues/                # Issue specifications (125 files)
│   └── HANDOFF.md            # AI handoff protocol
├── docker/                    # Docker Compose for PostgreSQL
└── docker-compose.yml
```

---

## Documentation

| Document | Location |
|----------|----------|
| API Endpoints | `backend/README.md` |
| Frontend Guide | `frontend/README.md` |
| Coding Standards | `RULES.md` |
| Issue Specifications | `docs/issues/*.md` |
| AI Handoff | `docs/HANDOFF.md` |

---

## Deployment

### Phase 1 (Current)
- **Database**: Supabase (PostgreSQL managed)
- **Frontend**: Vercel
- **Backend**: Vercel (via `vercel.json`)

### Phase 2 (Future)
- **VPS**: Self-hosted with Docker Compose

---

## Contributing

1. Create a branch: `git checkout -b issue/XXX-description`
2. Follow RULES.md coding standards
3. Run IDE checks before commit:
   ```bash
   cd frontend && npm run lint -- --max-warnings=0
   cd frontend && npx tsc --noEmit
   ```
4. Create PR and assign reviewers

---

## License

MIT
