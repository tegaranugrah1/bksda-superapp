# BKSDA SuperApp

> Sistem informasi terintegrasi untuk **Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur**.  
> Mengelola website publik, kepegawaian, surat tugas, aset negara (BMN), inventaris barang, pelaporan konservasi (DeReporting), keuangan SPD/Visum, asisten WhatsApp cerdas 24/7 (Hermes Agent), dan integrasi cloud drive dalam satu platform terpadu.

---

## Tech Stack

| Layer | Technology | Version | Keterangan |
|---|---|---|---|
| **Backend** | Laravel (PHP) | 11.x (PHP 8.3+) | Arsitektur Modular (`app/Modules/`) & Laravel Sanctum |
| **Frontend** | Next.js + React + TypeScript | 16.x + 19.x | App Router, Server/Client Components, Tailwind CSS 4 |
| **UI & Motion** | shadcn/ui + Framer Motion | Animate UI | Motion primitives, sliding pill indicators, tactile cards |
| **Database** | PostgreSQL | 15.x | Self-hosted via Docker Compose / Dokploy (Port 5435 lokal) |
| **Storage** | RustFS (S3-compatible) & Local Storage | - | Media publik & arsip berkas terproteksi (Port 9002/9003) |
| **Realtime WS** | Laravel Reverb & Echo | - | WebSocket notifikasi langsung & live inbox sync |
| **Testing** | PHPUnit + Playwright | 12.x + 1.50+ | Unit, feature, security pentest, dan E2E browser tests |
| **Deployment** | Docker Compose via Dokploy | - | Self-hosted VPS / Proxmox VE VM |

---

## Modul Aplikasi

| Modul | Prefix API | Prefix Tabel | Deskripsi |
|---|---|---|---|
| **Kepegawaian** | `/api/kepegawaian/` | `kpg_*` | Manajemen SDM, biodata, cuti, roster pegawai, IAM, dan 2FA |
| **Surat Masuk** | `/api/kepegawaian/surat-masuk` | `kpg_incoming_letters` | Pencatatan agenda surat masuk, multi-lampiran berkas, & status balasan |
| **Surat Tugas** | `/api/surat-tugas/` | `st_*` | Builder surat tugas, penandatanganan, approval, & verifikasi QR |
| **BMN** | `/api/bmn/` | `bmn_*` | Pengelolaan Barang Milik Negara, paket lelang, dan berita acara |
| **Inventory** | `/api/inventory/` | `inv_*` | Manajemen barang habis pakai & permohonan stok |
| **Keuangan** | `/api/keuangan/` | `keu_*` | Lembar visum SPD (DIPA & FOLU Net Sink 2030), SPJ, dan kuitansi |
| **DeReporting** | `/api/dereporting/` | `dr_*` | Pelaporan patroli, monitoring keanekaragaman hayati, dan Smart Patrol |
| **Drive** | `/api/drive/` | `drv_*` | Penyimpanan berkas hierarkis berbasis resor & proteksi RBAC |
| **CMS** | `/api/cms/` | `cms_*` | Pengelolaan konten website publik (berita, artikel, kawasan konservasi) |
| **Hermes Agent** | `/api/agent/v1/` | - | Asisten WhatsApp 24/7 (Evolution API v2) & Coding Sandbox |

---

## Panduan Instalasi & Menjalankan Aplikasi (Local Development)

Ikuti langkah-langkah di bawah ini untuk meng-clone dan menjalankan proyek di komputer lokal Anda:

### 1. Prasyarat Sistem (Prerequisites)

Sebelum memulai, pastikan perangkat Anda telah terpasang perangkat lunak berikut:

- **Git** (versi terbaru)
- **PHP >= 8.3** (atau minimal 8.2) dengan **Composer 2.x**
- **Node.js >= 20.x LTS** dengan **npm >= 10.x** (atau pnpm / yarn)
- **Docker Desktop** (Windows / macOS) atau **Docker Engine + Docker Compose v2** (Linux)

#### Ekstensi PHP yang Wajib Aktif:
Pastikan ekstensi PHP berikut telah diaktifkan di file `php.ini` Anda:  
`pdo_pgsql`, `pgsql`, `mbstring`, `curl`, `xml`, `zip`, `bcmath`, `gd`, `fileinfo`, `intl`.

> **Pengguna Ubuntu / Debian Linux**:
> ```bash
> sudo apt update
> sudo apt install -y php8.3-cli php8.3-pgsql php8.3-mbstring php8.3-curl php8.3-xml php8.3-zip php8.3-bcmath php8.3-gd php8.3-intl
> ```
>
> **Pengguna Windows (XAMPP / Standalone PHP)**:
> Buka file `php.ini`, lalu hapus tanda titik koma (`;`) di depan ekstensi:
> ```ini
> extension=pdo_pgsql
> extension=pgsql
> extension=mbstring
> extension=curl
> extension=fileinfo
> extension=gd
> extension=zip
> extension=bcmath
> ```

---

### 2. Langkah-demi-Langkah Instalasi

#### Langkah A: Clone Repository
```bash
git clone https://github.com/tegaranugrah1/bksda-superapp.git
cd bksda-superapp
```

#### Langkah B: Jalankan Service Database & Storage Lokal (Docker)
Proyek ini menyediakan `docker-compose.yml` untuk PostgreSQL 15, pgAdmin 4, dan RustFS Object Storage:
```bash
docker compose up -d
```
*Layanan yang otomatis aktif di latar belakang:*
- **PostgreSQL 15**: Port host **`5435`** (diarahkan ke port internal `5432`)
- **pgAdmin 4**: Port host **`5050`** (http://localhost:5050)
- **RustFS S3 Console**: Port host **`9003`** (http://localhost:9003) | API Port: `9002`

> [!NOTE]
> **Mengapa Port 5435?**  
> Kami sengaja memetakan PostgreSQL Docker ke port host **`5435`** agar tidak terjadi konflik (*port clash*) jika laptop/PC pengembang sudah memiliki PostgreSQL lokal yang berjalan di port default `5432`.

#### Langkah C: Setup Backend (Laravel API)
1. Pindah ke direktori backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi PHP via Composer:
   ```bash
   composer install
   ```
3. Salin file environment:
   ```bash
   cp .env.example .env
   ```
4. Generate application key Laravel:
   ```bash
   php artisan key:generate
   ```
5. Buat symbolic link untuk storage publik:
   ```bash
   php artisan storage:link
   ```
6. Pastikan konfigurasi database di file `backend/.env` telah mengarah ke port `5435`:
   ```env
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5435
   DB_DATABASE=bksda_superapp
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   FRONTEND_URL=http://localhost:3000
   ```
7. Jalankan migrasi skema tabel dan seeder data awal:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

#### Langkah D: Setup Frontend (Next.js 16)
1. Pindah ke direktori frontend:
   ```bash
   cd ../frontend
   ```
2. Pasang dependensi JavaScript/Node:
   ```bash
   npm install
   ```
3. Salin file environment frontend:
   ```bash
   cp .env.example .env.local
   ```
   *Isi konfigurasi default `frontend/.env.local`:*
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_STORAGE_URL=http://localhost:9002/bksda
   ```

---

### 3. Menjalankan Aplikasi Development

Jalankan server backend dan frontend di dua jendela terminal terpisah:

- **Terminal 1 — Backend API (Laravel)**:
  ```bash
  cd backend
  php artisan serve --port=8000
  ```
  *Akses API: **http://localhost:8000*** (Endpoint: `http://localhost:8000/api`)

- **Terminal 2 — Frontend (Next.js)**:
  ```bash
  cd frontend
  npm run dev
  ```
  *Akses Aplikasi Web: **http://localhost:3000***

- **Terminal 3 — Opsional: WebSocket Realtime (Laravel Reverb)**:
  ```bash
  cd backend
  php artisan reverb:start
  ```

---

### 4. Akun Pengguna Default (Hasil Seeder)

Setelah menjalankan `php artisan db:seed`, Anda dapat langsung masuk (*login*) menggunakan kredensial bawaan berikut:

| Tipe Akun | Login Identifier (NIP / Username) | Password | Hak Akses & Peruntukan |
|---|---|---|---|
| **Super Admin (NIP)** | `198001012005011001` | `Bksda2026!@#` | Akses penuh seluruh modul sistem |
| **Super Admin (User)** | `superadmin` | `Lolipop@147258379` | Akses penuh super admin alternatif |
| **Admin Persuratan** | `magang` | `konservasi#ksdae` | Akses Modul Persuratan & Agenda Surat Masuk |
| **pgAdmin 4 (GUI DB)** | `admin@bksda.com` | `admin` | Dashboard GUI PostgreSQL (http://localhost:5050) |
| **RustFS S3 Console** | `bksda_admin` | `bksda_secret_2025` | Manajemen storage & bucket (http://localhost:9003) |

---

### 5. Verifikasi & Automated Test Suite

Proyek ini telah dilengkapi automated check suite untuk memvalidasi fungsionalitas, keamanan, dan motion invariants:

```bash
# 1. Verifikasi Motion Primitives (Animate UI)
cd frontend
node tests/animate-ui-motion-check.cjs
# Output yang diharapkan: 36/36 Motion Invariants PASS (100% Hijau)

# 2. Typecheck TypeScript Frontend
npx tsc --noEmit

# 3. Pengujian Keamanan Backend (PHPUnit)
cd ../backend
php artisan test --filter=SuratTugasSecurityPentestTest
php artisan test --filter=AgentModuleTest

# 4. Pengujian Keamanan Cache Frontend
cd ../frontend
npm run test:security-cache
```

---

### 6. Troubleshooting & Solusi Kendala Umum (FAQ)

1. **Error: `could not find driver` atau `Class "PDO" not found`**  
   *Penyebab:* Ekstensi PHP `pdo_pgsql` belum diaktifkan di instalasi PHP Anda.  
   *Solusi:* Aktifkan `extension=pdo_pgsql` dan `extension=pgsql` di file `php.ini`, lalu simpan dan restart terminal.

2. **Error: `Connection refused` pada Database saat `php artisan migrate`**  
   *Penyebab:* Container Docker database belum berjalan atau port salah.  
   *Solusi:* Pastikan Docker container aktif (`docker compose ps`) dan periksa nilai `DB_PORT=5435` di file `backend/.env`.

3. **Foto profil atau berkas lampiran tidak muncul / 404 Not Found**  
   *Solusi:* Pastikan Anda telah menjalankan perintah `php artisan storage:link` di dalam direktori `backend/`.

4. **CORS Error pada Browser saat memanggil endpoint API**  
   *Solusi:* Pastikan `FRONTEND_URL=http://localhost:3000` telah terpasang dengan benar di file `backend/.env`.

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

## Infrastruktur Server & Deployment Produksi

Aplikasi beroperasi di atas infrastruktur server mandiri berbasis **Proxmox VE** dengan orkestrasi **Dokploy**:

### 1. Spesifikasi Host Fisik (Proxmox VE)
- **Host Node**: Proxmox VE 7.4 (`192.168.100.11`)
- **CPU**: 8 Core Processor
- **RAM**: 64 GB RAM (Terpakai: ~19 GB, **Sisa Bebas: ~45 GB**)
- **Penyimpanan Fisik**:
  - `/dev/sda` (2 TB HDD, `local-lvm`): ~1.65 TB ruang bebas (penyimpanan VM).
  - `/dev/sdb` (2 TB HDD): Datastore utama Proxmox Backup Server (PBS).
  - `/dev/sdc` (2 TB USB SSD Kingston): Salinan datastore backup PBS lokal.

### 2. Pemetaan Virtual Machine (VM)
| VM ID | IP Address | Peruntukan / Workload | Alokasi Resource | Status |
|-------|------------|-----------------------|------------------|--------|
| **VM 106** | `192.168.100.203` | **Dokploy Production** (Next.js FE, Laravel BE, PostgreSQL 15, RustFS S3, Reverb WS) | 16 GB RAM, 500 GB Disk | 🟢 Aktif (Produksi) |
| **VM 100** | `192.168.100.151` | **Staging & Storage Sync** (Migrasi Aset BMN & Uji Coba) | 8 GB RAM, 100 GB Disk | 🟡 Staging / Ops |
| **VM 108** | `192.168.100.205` | **Hermes Agent & Sandbox** (WhatsApp Gateway Evolution API v2, Assistant AI, Coding Sandbox) | 16 GB RAM, 100 GB Disk | 🟢 Aktif |
| **PBS VM** | Internal Proxmox | **Proxmox Backup Server** (Backup otomatis terenkripsi harian) | 4 GB RAM, 32 GB OS Disk | 🟢 Aktif |

### 3. Akses Domain & Reverse Proxy
- **Domain Utama (Frontend)**: `https://bksdakaltim.web.id` (mirror: `https://bksdakaltim.net`)
- **Backend API**: `https://api.bksdakaltim.web.id`
- **Reverse Proxy**: Traefik / Nginx dengan SSL otomatis Let's Encrypt (Cloudflare DNS & Tunnel)

---

## License

Hak Cipta © 2026 Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur. All rights reserved.
