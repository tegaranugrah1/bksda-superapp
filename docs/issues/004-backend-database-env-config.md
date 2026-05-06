# Issue #004 — Backend — Database & Environment Config

> **Type**: `chore`
> **Labels**: `setup`, `backend`, `database`
> **Priority**: 🔴 Critical (backend tidak bisa jalan tanpa database)
> **Complexity**: 🟢 Simple (edit config file, jalankan command)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama — cukup model murah
> **Dependencies**: Issue #002 (docker-compose) dan #003 (Laravel scaffold) harus sudah merged

---

## Branch

```
issue/004-backend-database-env-config
```

## Deskripsi

Konfigurasi backend Laravel agar bisa connect ke PostgreSQL Docker.

**Apa yang dilakukan:**
1. Edit `config/database.php` — bersihkan driver yang tidak dipakai
2. Edit `config/app.php` — set timezone & locale Indonesia
3. Copy `.env.example` → `.env` dan generate key
4. Start Docker PostgreSQL
5. Jalankan migrasi default Laravel
6. Verifikasi koneksi berhasil

**Apa yang TIDAK dilakukan:**
- ❌ Tidak buat tabel modul (itu di issue masing-masing)
- ❌ Tidak install Sanctum (itu Issue #010)
- ❌ Tidak setup seeder (itu issue terpisah)

---

## Apa yang Sudah Ada (dari Issue Sebelumnya)

```
e:\bksda-superapp\
├── docker-compose.yml         ← PostgreSQL 15 (dari Issue #002)
└── backend/
    ├── .env.example            ← sudah dikonfigurasi PostgreSQL (dari Issue #003)
    ├── config/
    │   ├── app.php             ← masih default Laravel
    │   ├── database.php        ← masih default Laravel (ada SQLite, MySQL, dll.)
    │   └── cors.php            ← sudah dikonfigurasi (dari Issue #003)
    ├── bootstrap/app.php       ← sudah clean (dari Issue #003)
    └── routes/api.php          ← sudah ada /api/health (dari Issue #003)
```

---

## Acceptance Criteria

- [ ] Docker PostgreSQL berjalan (`docker compose up -d`)
- [ ] File `.env` ada (copy dari `.env.example`) dengan `APP_KEY` ter-generate
- [ ] `config/database.php` hanya ada PostgreSQL (driver lain dihapus)
- [ ] `config/app.php` timezone = `Asia/Makassar`, locale = `id`
- [ ] `php artisan migrate` berhasil tanpa error
- [ ] `php artisan db:show` menampilkan info database `bksda_superapp`
- [ ] Health check endpoint bisa diakses

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Jangan skip.

### Langkah 1: Start Docker PostgreSQL

**Kenapa?** Laravel butuh database untuk migrate. Database kita jalan di Docker.

```bash
cd e:\bksda-superapp

# Start container PostgreSQL
docker compose up -d
```

**Apa yang terjadi:**
- Docker akan download image `postgres:15-alpine` (kalau belum ada)
- Container bernama `bksda-db` akan jalan di background
- Database `bksda_superapp` otomatis dibuat
- Bisa diakses di `localhost:5432`

**Cara cek sudah jalan:**
```bash
docker ps --filter name=bksda-db
```

**Output yang diharapkan:**
```
CONTAINER ID   IMAGE                COMMAND                  STATUS
xxxxxxxxxxxx   postgres:15-alpine   "docker-entrypoint.s…"   Up X seconds
```

**Kalau error:**
- `port is already allocated` → ada PostgreSQL lain di port 5432. Stop dulu: `docker stop <container_id>`
- `Cannot connect to Docker daemon` → Docker Desktop belum jalan. Buka Docker Desktop dulu

---

### Langkah 2: Setup File `.env`

**Kenapa?** Laravel butuh file `.env` untuk konfigurasi. File ini TIDAK di-commit ke Git (ada di `.gitignore`).

```bash
cd e:\bksda-superapp\backend

# Copy .env.example ke .env
copy .env.example .env

# Generate application key
php artisan key:generate
```

**Apa yang terjadi:**
- File `.env` dibuat dengan isi sama seperti `.env.example`
- `php artisan key:generate` mengisi `APP_KEY=base64:xxxxx...` di file `.env`
- Key ini dipakai untuk enkripsi (session, cookie, dll.)

**Cara cek berhasil:**
```bash
php artisan env
# Expected: The application environment is local
```

---

### Langkah 3: Edit `config/database.php`

**Kenapa?** File default Laravel punya banyak driver (SQLite, MySQL, MariaDB, SQL Server) yang tidak kita pakai. Kita hanya pakai **PostgreSQL**. Membersihkan driver lain = clean code.

**Path**: `e:\bksda-superapp\backend\config\database.php`

**Ganti SELURUH isi** dengan:

```php
<?php

/**
 * Database Configuration
 *
 * Project ini HANYA menggunakan PostgreSQL.
 * - Local dev: Docker container (docker compose up -d)
 * - Production: Supabase (PostgreSQL managed)
 *
 * @see https://laravel.com/docs/12.x/database
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Default Database Connection
    |--------------------------------------------------------------------------
    |
    | PostgreSQL adalah satu-satunya database yang dipakai di project ini.
    | Nilai default 'pgsql' sudah benar untuk local dev dan production.
    |
    */

    'default' => env('DB_CONNECTION', 'pgsql'),

    /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    |
    | Hanya PostgreSQL yang tersedia. Driver lain (SQLite, MySQL, SQL Server)
    | sengaja dihapus karena tidak dipakai. Ini sesuai prinsip clean code:
    | jangan simpan kode yang tidak digunakan.
    |
    */

    'connections' => [

        'pgsql' => [
            'driver'         => 'pgsql',
            'url'            => env('DB_URL'),
            'host'           => env('DB_HOST', '127.0.0.1'),
            'port'           => env('DB_PORT', '5432'),
            'database'       => env('DB_DATABASE', 'bksda_superapp'),
            'username'       => env('DB_USERNAME', 'postgres'),
            'password'       => env('DB_PASSWORD', 'postgres'),
            'charset'        => env('DB_CHARSET', 'utf8'),
            'prefix'         => '',
            'prefix_indexes' => true,
            'search_path'    => 'public',
            'sslmode'        => env('DB_SSLMODE', 'prefer'),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    |
    | Tabel ini mencatat migration mana yang sudah dijalankan.
    | Jangan ubah nama tabel ini kecuali ada alasan khusus.
    |
    */

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

];
```

### Penjelasan Perubahan

| Perubahan | Alasan |
|-----------|--------|
| Hapus SQLite, MySQL, MariaDB, SQL Server | Clean code — kita hanya pakai PostgreSQL |
| Hapus Redis section | Kita tidak pakai Redis (lokal pakai file cache) |
| Default `pgsql` bukan `sqlite` | Project ini PostgreSQL-only |
| Default database `bksda_superapp` | Nama database kita |
| Default username `postgres` | Sesuai docker-compose.yml |
| Default password `postgres` | Sesuai docker-compose.yml (HANYA untuk local dev) |
| Hapus `prepared` dan `options` PDO | Tidak perlu untuk lokal, production Supabase handle sendiri |
| Tambah komentar bahasa Indonesia | Agar junior/AI mudah paham |

---

### Langkah 4: Edit `config/app.php`

**Kenapa?** Default Laravel pakai timezone UTC dan locale English. Project ini untuk BKSDA Kaltim (Indonesia), jadi harus disesuaikan.

**Path**: `e:\bksda-superapp\backend\config\app.php`

**Yang perlu diubah** (jangan ganti seluruh file, hanya ubah bagian ini):

#### Ubah timezone

**Cari:**
```php
'timezone' => 'UTC',
```

**Ganti dengan:**
```php
'timezone' => env('APP_TIMEZONE', 'Asia/Makassar'),
```

**Kenapa `Asia/Makassar`?** BKSDA Kaltim berada di WITA (Waktu Indonesia Tengah). `Asia/Makassar` adalah timezone ID untuk WITA.

#### Ubah locale

**Cari:**
```php
'locale' => env('APP_LOCALE', 'en'),

'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),

'faker_locale' => env('APP_FAKER_LOCALE', 'en_US'),
```

**Ganti dengan:**
```php
'locale' => env('APP_LOCALE', 'id'),

'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),

'faker_locale' => env('APP_FAKER_LOCALE', 'id_ID'),
```

**Kenapa?**
- `locale: id` → pesan error, format tanggal, dll. dalam Bahasa Indonesia
- `fallback_locale: en` → kalau translation Indonesia tidak ada, fallback ke English
- `faker_locale: id_ID` → data dummy (seeder) pakai nama/alamat Indonesia

---

### Langkah 5: Hapus Migration Default yang Tidak Dipakai

**Kenapa?** Laravel scaffold membuat beberapa migration default. Kita perlu memutuskan mana yang dipakai.

```
database/migrations/
├── 0001_01_01_000000_create_users_table.php       ← SIMPAN (tapi akan di-override Issue #009)
├── 0001_01_01_000001_create_cache_table.php        ← HAPUS (kita pakai file cache)
├── 0001_01_01_000002_create_jobs_table.php          ← HAPUS (kita pakai sync queue)
```

```bash
cd e:\bksda-superapp\backend

# Hapus migration yang tidak dipakai
Remove-Item -Force database\migrations\*cache*.php
Remove-Item -Force database\migrations\*jobs*.php
```

**Kenapa hapus cache & jobs migration?**
- `.env` sudah set `CACHE_STORE=file` (pakai file, bukan database)
- `.env` sudah set `QUEUE_CONNECTION=sync` (langsung jalankan, tidak pakai queue table)
- Kalau nanti butuh (misal di production), bisa buat migration baru

**Kenapa SIMPAN users migration?**
- Kita butuh tabel users, tapi akan di-modifikasi di Issue #009 (tambah field `role`, `access_modules`, dll.)
- Untuk sekarang, pakai default dulu supaya `php artisan migrate` bisa jalan

---

### Langkah 6: Jalankan Migrasi

**Kenapa?** Untuk memastikan Laravel bisa connect ke database dan membuat tabel.

```bash
cd e:\bksda-superapp\backend

php artisan migrate
```

**Output yang diharapkan:**
```
  INFO  Preparing database.

  Creating migration table ................................ 26ms DONE

  INFO  Running migrations.

  0001_01_01_000000_create_users_table ................... 35ms DONE
```

**Kalau error:**

| Error | Solusi |
|-------|--------|
| `could not find driver` | Install PHP extension: `php-pgsql`. Di XAMPP: buka `php.ini`, uncomment `extension=pdo_pgsql` dan `extension=pgsql` |
| `Connection refused` | Docker PostgreSQL belum jalan. Jalankan `docker compose up -d` dulu |
| `FATAL: database "bksda_superapp" does not exist` | Docker compose belum pernah di-start, atau volume dihapus. Jalankan `docker compose down -v` lalu `docker compose up -d` |
| `password authentication failed` | Cek `.env` — `DB_PASSWORD` harus `postgres` (sesuai docker-compose.yml) |

---

### Langkah 7: Verifikasi Database Connection

```bash
cd e:\bksda-superapp\backend

# Cek info database
php artisan db:show
```

**Output yang diharapkan (kurang lebih):**
```
  PostgreSQL ............................................. 15.x
  Database ........................................... bksda_superapp
  Host ................................................ 127.0.0.1
  Port ................................................ 5432
  Username ............................................ postgres
  Tables ............................................... 3
  Total Size .......................................... xxx KB
```

```bash
# Cek tabel yang sudah dibuat
php artisan db:table users
```

**Output yang diharapkan:**
```
  users
  Columns ............................................. 9
  Size ................................................ xxx KB

  Column           Type            Nullable
  id               bigint          no
  name             varchar(255)    no
  email            varchar(255)    no
  ...
```

---

## Verifikasi Lengkap

Jalankan semua test ini sebelum commit:

```bash
cd e:\bksda-superapp\backend

# Test 1: Database connection
php artisan db:show
# ✅ Harus menampilkan info database bksda_superapp

# Test 2: Migration status
php artisan migrate:status
# ✅ Semua migration harus "Ran"

# Test 3: Health endpoint (start server dulu)
php artisan serve &
curl http://localhost:8000/api/health
# ✅ Harus return {"status":"ok","timestamp":"..."}
# Ctrl+C untuk stop

# Test 4: Pint (formatting check)
./vendor/bin/pint --test
# ✅ Tidak boleh ada error

# Test 5: Config cache
php artisan config:cache
php artisan config:clear
# ✅ Tidak boleh ada error
```

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: configure database & environment" \
  --body "Konfigurasi PostgreSQL connection, timezone/locale Indonesia, cleanup migration. Detail di docs/issues/004-backend-database-env-config.md" \
  --label "setup,backend,database"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/004-backend-database-env-config
```

### Step 3: Kerjakan

Ikuti Langkah 1-7 di atas secara berurutan.

### Step 4: Commit & Push

```bash
# Stage file yang diubah
git add backend/config/database.php
git add backend/config/app.php

# Stage file yang dihapus
git add backend/database/migrations/

# JANGAN commit file .env (sudah di .gitignore)

git commit -m "chore: configure database & environment (#4)"
git push -u origin issue/004-backend-database-env-config
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: configure database & environment (#4)" \
  --body "## Summary
Konfigurasi backend Laravel agar connect ke PostgreSQL Docker local.

## Changes
- \`config/database.php\` — cleanup, hanya PostgreSQL (hapus SQLite/MySQL/Redis)
- \`config/app.php\` — timezone \`Asia/Makassar\` (WITA), locale \`id\`, faker \`id_ID\`
- Hapus migration \`cache\` dan \`jobs\` (kita pakai file cache & sync queue)

## Verification
- [x] Docker PostgreSQL berjalan
- [x] \`.env\` sudah di-setup dengan \`APP_KEY\`
- [x] \`php artisan migrate\` berhasil
- [x] \`php artisan db:show\` menampilkan \`bksda_superapp\`
- [x] Health endpoint bisa diakses
- [x] \`./vendor/bin/pint --test\` no errors

## Rules Compliance
- [x] Rule 3.7: Database prefix convention ready
- [x] Rule 10.2: Docker hanya untuk database
- [x] Rule 9.9: Pint check passed
- [x] Clean code: driver tidak dipakai dihapus

## Note
File \`.env\` TIDAK di-commit (sesuai \`.gitignore\`). Developer baru harus:
\`\`\`bash
cp .env.example .env
php artisan key:generate
\`\`\`

Closes #4" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## Troubleshooting

### Q: Saya pakai XAMPP, PostgreSQL extension tidak ada

**Jawab:**
1. Buka file `php.ini` di folder XAMPP (`C:\xampp\php\php.ini`)
2. Cari baris `;extension=pdo_pgsql`
3. Hapus tanda `;` di depannya (uncomment)
4. Cari baris `;extension=pgsql`
5. Hapus tanda `;` di depannya juga
6. Restart Apache di XAMPP
7. Verifikasi: `php -m | findstr pgsql` harus menampilkan `pdo_pgsql` dan `pgsql`

### Q: Docker Desktop tidak jalan di Windows

**Jawab:**
1. Pastikan WSL 2 sudah terinstall: `wsl --install`
2. Buka Docker Desktop → Settings → General → centang "Use WSL 2"
3. Restart komputer
4. Buka Docker Desktop, tunggu sampai status "Running"

### Q: Port 5432 sudah dipakai

**Jawab:**
```bash
# Cek siapa yang pakai port 5432
netstat -ano | findstr 5432

# Kalau ada PostgreSQL lokal lain, stop dulu:
# Atau ubah port di docker-compose.yml menjadi 5433:5432
# Dan update .env: DB_PORT=5433
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Issue #001-#003 sudah selesai — Laravel 12 sudah ter-scaffold di `backend/`.
Docker PostgreSQL sudah dikonfigurasi di `docker-compose.yml`.
File `.env.example` sudah ada dengan config PostgreSQL.

## Task

Konfigurasi database agar backend Laravel bisa connect ke PostgreSQL Docker.
Ikuti langkah PERSIS di `docs/issues/004-backend-database-env-config.md`.

### Urutan Kerja
1. Start Docker: `docker compose up -d` (dari root project)
2. Copy `.env`: `copy .env.example .env` lalu `php artisan key:generate`
3. Edit `config/database.php` — hapus semua driver kecuali PostgreSQL
4. Edit `config/app.php` — ubah timezone ke `Asia/Makassar`, locale ke `id`
5. Hapus migration yang tidak dipakai (cache, jobs)
6. Jalankan `php artisan migrate`
7. Verifikasi dengan `php artisan db:show`

### Verifikasi (WAJIB jalankan)
```bash
cd e:\bksda-superapp\backend
php artisan db:show                    # cek connection
php artisan migrate:status             # cek migration
php artisan serve                      # test serve
curl http://localhost:8000/api/health   # test endpoint
./vendor/bin/pint --test               # test formatting
```

### Git Workflow
```bash
cd e:\bksda-superapp
gh issue create --title "chore: configure database & environment" --body "Detail di docs/issues/004-backend-database-env-config.md" --label "setup,backend,database"
git checkout main && git pull origin main
git checkout -b issue/004-backend-database-env-config
# ... kerjakan langkah 1-7 ...
git add backend/config/database.php backend/config/app.php backend/database/migrations/
git commit -m "chore: configure database & environment (#4)"
git push -u origin issue/004-backend-database-env-config
gh pr create --title "chore: configure database & environment (#4)" --body "Closes #4" --base main
gh pr merge --squash --delete-branch
git checkout main && git pull origin main
```

### Rules
- Baca RULES.md sebelum mulai
- JANGAN commit file `.env` — hanya `.env.example` yang di-commit
- Database driver hanya PostgreSQL — hapus SQLite, MySQL, dll
- File config harus ada komentar penjelasan
- Pastikan Docker jalan sebelum migrate

### Troubleshooting
- `could not find driver` → uncomment `pdo_pgsql` di php.ini
- `Connection refused` → Docker belum jalan, `docker compose up -d`
- `database does not exist` → `docker compose down -v` lalu `docker compose up -d`
````
