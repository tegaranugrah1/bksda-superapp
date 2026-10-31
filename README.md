# BKSDA SuperApp

> Sistem informasi terintegrasi untuk **Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur**.  
> Mengelola website publik, kepegawaian, surat tugas, aset negara (BMN), inventaris barang, pelaporan konservasi (DeReporting), keuangan SPD/Visum, dan integrasi cloud drive dalam satu platform terpadu.

---

## Tech Stack

| Layer | Technology | Version | Keterangan |
|-------|------------|---------|------------|
| **Backend** | Laravel (PHP) | 11.x (PHP 8.2+) | Arsitektur Modular (`app/Modules/`) |
| **Frontend** | Next.js + React + TypeScript | 16.x + 19.x | App Router & Server/Client Components |
| **UI** | Tailwind CSS + shadcn/ui | 4.x | Komponen UI terstandarisasi |
| **Database** | PostgreSQL | 15.x | Self-hosted via Docker / Dokploy |
| **Storage** | RustFS (S3-compatible) & Local Storage | - | Media publik & arsip berkas terproteksi |
| **Auth** | Laravel Sanctum | - | Bearer Token dengan role-based IAM |
| **Testing** | PHPUnit + Playwright | 11.x + 1.64.x | Security audit, concurrency & E2E browser |
| **Deployment** | Docker Compose via Dokploy | - | Self-hosted VPS (Ubuntu / Proxmox VM) |

---

## Modul Aplikasi

| Modul | Prefix API | Prefix Tabel | Deskripsi |
|-------|------------|--------------|-----------|
| **Kepegawaian** | `/api/kepegawaian/` | `kpg_*` | Manajemen SDM, roster pegawai, cuti, IAM, dan 2FA |
| **Surat Tugas** | `/api/surat-tugas/` | `st_*` | Builder surat tugas, penandatanganan, approval, & verifikasi QR |
| **BMN** | `/api/bmn/` | `bmn_*` | Pengelolaan Barang Milik Negara, paket lelang, dan berita acara |
| **Inventory** | `/api/inventory/` | `inv_*` | Manajemen barang habis pakai & permohonan stok |
| **Keuangan** | `/api/keuangan/` | `keu_*` | Lembar visum SPD (DIPA & FOLU Net Sink 2030), SPJ, dan kuitansi |
| **DeReporting** | `/api/dereporting/` | `dr_*` | Pelaporan patroli, monitoring keanekaragaman hayati, dan Smart Patrol |
| **Drive** | `/api/drive/` | `drv_*` | Penyimpanan berkas hierarkis berbasis resor & proteksi RBAC |
| **CMS** | `/api/cms/` | `cms_*` | Pengelolaan konten website publik (berita, artikel, kawasan konservasi) |

---

## Quick Start (Local Development)

### Prerequisites

- PHP 8.2+ & Composer
- Node.js 20+ & npm
- PostgreSQL 15+ (lokal via Docker)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/tegaranugrah1/bksda-superapp.git
cd bksda-superapp

# Frontend Dependencies
cd frontend
npm install
cp .env.example .env.local

# Backend Dependencies
cd ../backend
composer install
cp .env.example .env
php artisan key:generate
```

### 2. Database Setup

```bash
# Jalankan PostgreSQL lokal melalui Docker
docker compose up -d db

# Jalankan migrasi dan seeder awal
cd backend
php artisan migrate
php artisan db:seed
```

### 3. Menjalankan Aplikasi

```bash
# Terminal 1: Backend API (port 8000)
cd backend
php artisan serve

# Terminal 2: Frontend (port 3000)
cd frontend
npm run dev
```

Akses aplikasi:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api

Kredensial Super Admin awal (seeder default):
- **NIP**: `198001012005011001`
- **Password**: `Bksda2026!@#`

---

## Pengujian & Security Audit

Proyek ini dilengkapi dengan suite pengujian otomatis yang mencakup unit, integrasi, konkurensi database, dan pengujian sink browser:

```bash
# 1. Menjalankan pengujian keamanan backend (PHPUnit)
cd backend
php artisan test --filter=SuratTugasSecurityPentestTest
php artisan test --filter=SuratTugasPostgresConcurrencyTest

# 2. Menjalankan pengujian keamanan cache frontend
cd frontend
npm run test:security-cache

# 3. Menjalankan pengujian keamanan E2E Playwright (ST-12 XSS, Print Sink, ST-02 Privacy Mask)
cd frontend
npm run test:security-playwright
```

---

## Struktur Proyek

```
bksda-superapp/
├── frontend/                        # Aplikasi Next.js (App Router)
│   ├── src/
│   │   ├── app/                     # Halaman & rute antarmuka
│   │   │   ├── (website)/           # Halaman publik (berita, profil, kawasan)
│   │   │   ├── kepegawaian/         # Manajemen pegawai & surat tugas
│   │   │   ├── bmn/                 # Pengelolaan aset & paket lelang BMN
│   │   │   ├── inventory/           # Inventaris & logistik barang
│   │   │   ├── keuangan/            # Modul SPJ & visum SPD
│   │   │   ├── portal/              # Portal layanan mandiri pegawai
│   │   │   └── login/               # Halaman autentikasi
│   │   ├── components/              # Komponen React & shadcn/ui
│   │   └── lib/                     # Utilitas, formatters, & Axios client
│   └── tests/                       # Pengujian frontend (cache & Playwright security)
│
├── backend/                         # Aplikasi API Laravel
│   ├── app/
│   │   ├── Models/                  # Model inti (User, Drive, dsb.)
│   │   ├── Modules/                 # Arsitektur modular per domain bisnis
│   │   │   ├── Kepegawaian/         # SDM, Cuti, & IAM
│   │   │   ├── SuratTugas/          # Alur & approval surat tugas
│   │   │   ├── BMN/                 # Aset negara & inventaris
│   │   │   ├── Inventory/           # Stok barang pakai habis
│   │   │   ├── Keuangan/            # Visum SPD DIPA/FOLU & kuitansi
│   │   │   ├── DeReporting/         # Pelaporan patroli & keanekaragaman
│   │   │   └── CMS/                 # Berita & artikel publik
│   │   └── Services/                # Service layer (Storage, QR, Audit)
│   ├── database/migrations/         # Migrasi skema database
│   └── tests/                       # PHPUnit feature, unit, concurrency & security tests
│
├── docs/                            # Dokumentasi teknis & keamanan
│   ├── security/                    # Laporan security audit & pentest Surat Tugas
│   └── progress.md                  # Log kemajuan teknis terpadu
├── docker-compose.dokploy.yml        # Konfigurasi deployment produksi Dokploy
├── docker-compose.prod.yml           # Konfigurasi standalone Docker Compose
└── docker-compose.yml               # Konfigurasi database development lokal
```

---

## Deployment Produksi

Aplikasi di-deploy menggunakan **Dokploy** pada VPS / infrastruktur cloud mandiri:

- **Domain Utama (Frontend)**: `https://bksdakaltim.web.id` (mirror: `https://bksdakaltim.net`)
- **Backend API**: `https://api.bksdakaltim.web.id`
- **Orchestration**: Docker Compose (`docker-compose.dokploy.yml`)
- **Database**: PostgreSQL 15 Container (`bksda-db`) dengan persistent volume
- **Object Storage**: RustFS S3-compatible container (`rustfs-data`) untuk aset media
- **Reverse Proxy**: Traefik / Nginx dengan SSL otomatis (Let's Encrypt)

---

## License

Hak Cipta © 2026 Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur. All rights reserved.
