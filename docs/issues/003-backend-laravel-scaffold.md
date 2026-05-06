# Issue #003 — Backend — Laravel 12 Scaffold

> **Type**: `chore`
> **Labels**: `setup`, `backend`
> **Priority**: 🔴 Critical (semua backend issue bergantung pada ini)
> **Complexity**: 🟡 Medium (scaffold + config + cleanup)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro — perlu keputusan arsitektur
> **Dependencies**: Issue #001 dan #002 harus sudah merged

---

## Branch

```
issue/003-backend-laravel-scaffold
```

## Deskripsi

Scaffold project Laravel 12 di folder `backend/` menggunakan Composer.
Setelah scaffold, lakukan:
1. Cleanup file yang tidak dipakai (Blade views, Vite, dll.)
2. Configure sebagai **API-only** (tanpa frontend rendering)
3. Setup `.env.example` untuk PostgreSQL Docker local
4. Buat struktur folder modular (`app/Modules/`)
5. Konfigurasi `composer.json` untuk autoload Modules
6. Install **Laravel Pint** (dev dependency, Rule 9.9)
7. Cleanup dan perbaiki `bootstrap/app.php`

> ⚠️ Issue ini **TIDAK** install Sanctum atau Spatie Permission. Itu di issue terpisah.

---

## Apa yang Sudah Ada (dari Issue #001 & #002)

```
e:\bksda-superapp\
├── .editorconfig
├── .gitignore
├── README.md
├── RULES.md
├── docker-compose.yml
├── backend/
│   ├── .gitignore
│   └── .gitkeep          ← akan dihapus setelah scaffold
├── frontend/
│   ├── .gitignore
│   └── .gitkeep
├── docker/
│   └── .gitkeep
└── docs/
    ├── issues/
    └── HANDOFF.md
```

---

## Acceptance Criteria

- [ ] Laravel 12 ter-install di `backend/`
- [ ] `php artisan serve` berhasil jalan (port 8000)
- [ ] `.env.example` sudah dikonfigurasi untuk PostgreSQL Docker
- [ ] File Blade views, Vite config, dan frontend assets sudah dihapus
- [ ] Folder `app/Modules/` sudah dibuat dengan 6 subfolder modul
- [ ] `composer.json` autoload sudah include `App\\Modules\\` namespace
- [ ] Laravel Pint terinstall dan `./vendor/bin/pint` berjalan
- [ ] `backend/.gitkeep` sudah dihapus
- [ ] Tidak ada error saat `php artisan optimize`

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Jangan skip.

### Langkah 1: Scaffold Laravel 12

**Kenapa?** Kita butuh framework Laravel sebagai backend API. `composer create-project` otomatis download Laravel 12 dan semua dependency-nya.

**Apa itu "API-only"?** Backend ini TIDAK merender HTML/halaman web. Dia hanya menerima request (dari frontend Next.js) dan mengirim response JSON. Seperti "pelayan restoran" yang hanya antar makanan, tidak masak.

```bash
cd e:\bksda-superapp

# Backup .gitignore kita (karena scaffold akan overwrite)
copy backend\.gitignore backend\.gitignore.bak

# Hapus .gitkeep (akan diganti isi Laravel)
del backend\.gitkeep

# Scaffold Laravel di folder backend
composer create-project laravel/laravel backend --prefer-dist --no-interaction

# Restore .gitignore kita (yang dari Issue #001)
copy /Y backend\.gitignore.bak backend\.gitignore
del backend\.gitignore.bak
```

**Apa yang terjadi:**
- Composer download Laravel 12 + semua package PHP (~60MB)
- Folder `backend/` terisi: `app/`, `config/`, `routes/`, `database/`, dll.
- File `.env.example` default Laravel dibuat (akan kita ganti nanti)

**Kalau error:**
- `composer: command not found` → Install Composer: https://getcomposer.org/download/
- `PHP >= 8.2 required` → Update PHP ke 8.3+
- `directory is not empty` → Hapus isi `backend/` dulu (kecuali `.gitignore`)

### Langkah 2: Verifikasi Scaffold Berhasil

```bash
cd backend
php artisan --version
# Expected: Laravel Framework 12.x.x
```

**Kalau error `php: command not found`:** PHP belum di-install atau belum ada di PATH.

---

## File yang Harus Diubah

### File 1: `backend/.env.example`

**Hapus** semua isi default, ganti dengan ini:

```env
# =============================================================================
# BKSDA SuperApp — Backend Environment (Local Development)
# =============================================================================
# Copy file ini ke .env: cp .env.example .env
# Lalu generate key: php artisan key:generate
# =============================================================================

APP_NAME="BKSDA SuperApp"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

APP_LOCALE=id
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=id_ID

APP_MAINTENANCE_DRIVER=file
APP_TIMEZONE=Asia/Makassar

# =============================================================================
# Database — PostgreSQL via Docker (docker compose up -d)
# =============================================================================
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=bksda_superapp
DB_USERNAME=postgres
DB_PASSWORD=postgres

# =============================================================================
# Auth
# =============================================================================
BCRYPT_ROUNDS=12

# =============================================================================
# Logging
# =============================================================================
LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# =============================================================================
# Session & Cache (lokal pakai file, production pakai database)
# =============================================================================
SESSION_DRIVER=file
SESSION_LIFETIME=120

CACHE_STORE=file
QUEUE_CONNECTION=sync

FILESYSTEM_DISK=local

# =============================================================================
# Mail (lokal pakai log, production pakai SMTP)
# =============================================================================
MAIL_MAILER=log
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="noreply@bksda-kaltim.go.id"
MAIL_FROM_NAME="${APP_NAME}"

# =============================================================================
# Supabase Storage — S3-compatible (production only)
# =============================================================================
# Set FILESYSTEM_DISK=s3 di production
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=ap-southeast-1
# AWS_BUCKET=
# AWS_ENDPOINT=
# AWS_URL=
# AWS_USE_PATH_STYLE_ENDPOINT=true
```

### Penjelasan Perubahan dari Project Lama

| Setting | Lama | Baru | Alasan |
|---------|------|------|--------|
| `APP_LOCALE` | `en` | `id` | Project Indonesia |
| `APP_FAKER_LOCALE` | `en_US` | `id_ID` | Seed data pakai bahasa Indonesia |
| `APP_TIMEZONE` | _(default UTC)_ | `Asia/Makassar` | WITA (Kaltim) |
| `DB_DATABASE` | `superapp_inventory` | `bksda_superapp` | Nama baru |
| `SESSION_DRIVER` | `database` | `file` | Lokal pakai file, lebih simple |
| `CACHE_STORE` | `database` | `file` | Lokal pakai file |
| `QUEUE_CONNECTION` | `database` | `sync` | Lokal tidak butuh queue |
| Redis config | Ada | **Dihapus** | Tidak pakai Redis di lokal |
| Memcached | Ada | **Dihapus** | Tidak dipakai |

---

### File 2: `backend/bootstrap/app.php`

**Ganti seluruh isi** dengan versi clean (tanpa Vercel workaround):

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Middleware aliases akan ditambahkan di Issue #015
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API error handler: return JSON untuk semua API requests
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                // Biarkan ValidationException lewat (422 dengan field errors)
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return null;
                }

                // Biarkan AuthenticationException return 401
                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'error' => 'Unauthenticated',
                        'message' => 'Silakan login terlebih dahulu.',
                    ], 401);
                }

                // Production: sembunyikan detail error 500
                if (!config('app.debug')) {
                    $status = method_exists($e, 'getStatusCode')
                        ? $e->getStatusCode()
                        : 500;

                    if ($status >= 500) {
                        return response()->json([
                            'error' => 'Server Error',
                            'message' => 'Terjadi kesalahan pada server.',
                        ], 500);
                    }
                }
            }
        });
    })->create();
```

### Penjelasan Perubahan dari Project Lama

| Perubahan | Alasan |
|-----------|--------|
| Hapus semua `$_ENV['VERCEL']` block | Clean code — Vercel config ditangani di issue deployment nanti |
| `api:` bukan `web:` | API-only, tidak butuh web routes |
| Hapus `useStoragePath()` hack | Tidak perlu untuk lokal |
| Exception handler yang bersih | Rule 5.7 — custom exception handler |
| AuthenticationException eksplisit | Return JSON 401 yang jelas |

---

### File 3: `backend/routes/api.php`

**Ganti seluruh isi** dengan:

```php
<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Route yang didefinisikan di sini otomatis mendapat prefix /api.
| Route per modul di-register via ServiceProvider masing-masing.
|
| Auth routes (login, logout, me) → ditambahkan di Issue #011
| Module routes → di-register oleh {ModuleName}ServiceProvider
|
*/

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
    ]);
});
```

---

### File 4: `backend/composer.json` — Tambahkan Autoload Module

Setelah scaffold, **edit** `composer.json` bagian `autoload`:

```json
{
    "autoload": {
        "psr-4": {
            "App\\": "app/",
            "App\\Modules\\": "app/Modules/",
            "Database\\Factories\\": "database/factories/",
            "Database\\Seeders\\": "database/seeders/"
        }
    }
}
```

Lalu jalankan:

```bash
composer dump-autoload
```

---

### File 5: `backend/config/cors.php`

**Kenapa?** CORS (Cross-Origin Resource Sharing) adalah mekanisme keamanan browser. Frontend kita jalan di `localhost:3000`, tapi backend di `localhost:8000` — ini dianggap "beda origin" oleh browser. Tanpa config CORS, browser akan **blokir** semua API call dari frontend ke backend.

**Buat file baru** (Laravel 12 mungkin sudah ada, jika sudah ada maka edit):

```php
<?php

/**
 * CORS Configuration
 *
 * Mengizinkan frontend (Next.js) mengakses API backend.
 * Tanpa config ini, browser akan blokir request dari localhost:3000 ke localhost:8000.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */

return [
    // Hanya izinkan CORS untuk route /api/*
    'paths' => ['api/*'],

    // Izinkan semua HTTP method (GET, POST, PUT, DELETE, dll.)
    'allowed_methods' => ['*'],

    // Hanya izinkan request dari frontend URL
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3000'),
    ],

    'allowed_origins_patterns' => [],

    // Izinkan semua header (termasuk Authorization untuk token Sanctum)
    'allowed_headers' => ['*'],

    'exposed_headers' => [],
    'max_age' => 0,

    // Izinkan cookie/credentials (dibutuhkan untuk Sanctum token)
    'supports_credentials' => true,
];
```

---

## Folder yang Harus Dibuat

### Struktur Modular (Rule 8.1, 8.2)

```bash
cd e:\bksda-superapp\backend

# Buat folder modul
mkdir -p app/Modules/Kepegawaian/Controllers
mkdir -p app/Modules/Kepegawaian/Models
mkdir -p app/Modules/Kepegawaian/Routes
mkdir -p app/Modules/Kepegawaian/Migrations
mkdir -p app/Modules/Kepegawaian/Requests
mkdir -p app/Modules/Kepegawaian/Resources

mkdir -p app/Modules/SuratTugas/Controllers
mkdir -p app/Modules/SuratTugas/Models
mkdir -p app/Modules/SuratTugas/Routes
mkdir -p app/Modules/SuratTugas/Migrations
mkdir -p app/Modules/SuratTugas/Requests
mkdir -p app/Modules/SuratTugas/Resources

mkdir -p app/Modules/BMN/Controllers
mkdir -p app/Modules/BMN/Models
mkdir -p app/Modules/BMN/Routes
mkdir -p app/Modules/BMN/Migrations
mkdir -p app/Modules/BMN/Requests
mkdir -p app/Modules/BMN/Resources

mkdir -p app/Modules/Inventory/Controllers
mkdir -p app/Modules/Inventory/Models
mkdir -p app/Modules/Inventory/Routes
mkdir -p app/Modules/Inventory/Migrations
mkdir -p app/Modules/Inventory/Requests
mkdir -p app/Modules/Inventory/Resources

mkdir -p app/Modules/DeReporting/Controllers
mkdir -p app/Modules/DeReporting/Models
mkdir -p app/Modules/DeReporting/Routes
mkdir -p app/Modules/DeReporting/Migrations
mkdir -p app/Modules/DeReporting/Requests
mkdir -p app/Modules/DeReporting/Resources

mkdir -p app/Modules/CMS/Controllers
mkdir -p app/Modules/CMS/Models
mkdir -p app/Modules/CMS/Routes
mkdir -p app/Modules/CMS/Migrations
mkdir -p app/Modules/CMS/Requests
mkdir -p app/Modules/CMS/Resources
```

> ⚠️ Di Windows PowerShell, `mkdir -p` mungkin error. Gunakan:
> ```powershell
> New-Item -ItemType Directory -Path "app\Modules\Kepegawaian\Controllers" -Force
> ```

### Gitkeep untuk Folder Kosong

Setiap folder kosong perlu `.gitkeep` agar Git track:

```bash
# Buat .gitkeep di setiap folder modul (PowerShell)
$modules = @("Kepegawaian", "SuratTugas", "BMN", "Inventory", "DeReporting", "CMS")
$subfolders = @("Controllers", "Models", "Routes", "Migrations", "Requests", "Resources")

foreach ($module in $modules) {
    foreach ($subfolder in $subfolders) {
        $path = "app\Modules\$module\$subfolder\.gitkeep"
        New-Item -ItemType File -Path $path -Force | Out-Null
    }
}
```

---

## Cleanup: File yang Harus Dihapus

**Kenapa cleanup?** Laravel scaffold membuat banyak file untuk full-stack app (HTML, CSS, JavaScript). Karena kita hanya pakai backend sebagai **API-only** (hanya kirim JSON, tidak render halaman), file-file frontend harus dihapus. Clean code = jangan simpan kode yang tidak digunakan.

```bash
cd e:\bksda-superapp\backend

# Hapus Blade views
# Kenapa: API-only tidak render HTML. Frontend kita pakai Next.js (terpisah)
Remove-Item -Recurse -Force resources\views

# Hapus Vite config
# Kenapa: Vite untuk compile CSS/JS frontend. Kita tidak pakai frontend di backend
Remove-Item -Force vite.config.js -ErrorAction SilentlyContinue

# Hapus package.json di backend
# Kenapa: package.json untuk npm/Node.js. Backend kita PHP-only
Remove-Item -Force package.json -ErrorAction SilentlyContinue

# Hapus web routes
# Kenapa: web.php untuk route halaman HTML. Kita hanya pakai api.php
Remove-Item -Force routes\web.php -ErrorAction SilentlyContinue

# Hapus .gitkeep dari issue #002
# Kenapa: Folder backend sudah terisi Laravel, tidak perlu placeholder lagi
Remove-Item -Force .gitkeep -ErrorAction SilentlyContinue

# JANGAN hapus migration users — kita butuh untuk sementara
# Migration users akan di-modifikasi di Issue #009
```

---

## Verifikasi

### Test 1: Artisan Berjalan

```bash
cd e:\bksda-superapp\backend
php artisan --version
# Expected: Laravel Framework 12.x.x
```

### Test 2: Serve Berhasil

```bash
php artisan serve
# Expected: Starting Laravel development server: http://127.0.0.1:8000
# Ctrl+C untuk stop
```

### Test 3: Health Endpoint

```bash
# Di terminal lain saat serve jalan:
curl http://localhost:8000/api/health
# Expected: {"status":"ok","timestamp":"2026-05-04T..."}
```

### Test 4: Pint Berjalan

```bash
./vendor/bin/pint --test
# Expected: no errors (atau list files yang perlu format)
```

### Test 5: Optimize Berhasil

```bash
php artisan optimize
# Expected: tidak ada error
php artisan optimize:clear
```

### Test 6: Module Folders Ada

```powershell
Get-ChildItem -Path app\Modules -Recurse -Directory | Select-Object FullName
# Expected: 36 folder (6 module × 6 subfolder)
```

---

## Troubleshooting

### Q: `composer create-project` error "PHP >= 8.2 required"

**Artinya:** Versi PHP kamu terlalu lama.

**Solusi:** Update PHP ke 8.3+. Di XAMPP: download XAMPP versi terbaru yang include PHP 8.3.

### Q: `php artisan serve` error "Could not open input file: artisan"

**Artinya:** Kamu tidak sedang di folder `backend/`.

**Solusi:**
```bash
cd e:\bksda-superapp\backend
php artisan serve
```

### Q: `curl http://localhost:8000/api/health` error "Connection refused"

**Artinya:** Server belum jalan.

**Solusi:** Jalankan `php artisan serve` di terminal lain dulu, baru curl.

### Q: `./vendor/bin/pint` error "file not found"

**Artinya:** Pint belum terinstall.

**Solusi:** Laravel 12 scaffold sudah include Pint. Jalankan `composer install` dulu.

### Q: `composer dump-autoload` error setelah edit composer.json

**Artinya:** JSON syntax error di `composer.json`.

**Solusi:** Cek koma dan kurung tutup di `composer.json`. Gunakan JSON validator online.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: scaffold Laravel 12 backend" \
  --body "Scaffold Laravel 12 di folder backend/, configure API-only, setup module structure, cleanup unused files. Detail di docs/issues/003-backend-laravel-scaffold.md" \
  --label "setup,backend"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/003-backend-laravel-scaffold
```

### Step 3: Kerjakan

1. Scaffold Laravel
2. Edit `.env.example`
3. Edit `bootstrap/app.php`
4. Edit `routes/api.php`
5. Edit `composer.json` autoload
6. Buat folder `app/Modules/` dengan gitkeep
7. Buat/edit `config/cors.php`
8. Cleanup file tidak dipakai
9. Jalankan semua verifikasi

### Step 4: Commit & Push

```bash
git add .
git commit -m "chore: scaffold Laravel 12 backend (#3)"
git push -u origin issue/003-backend-laravel-scaffold
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: scaffold Laravel 12 backend (#3)" \
  --body "## Summary
Scaffold Laravel 12 sebagai API-only backend dengan struktur modular.

## Changes
- Laravel 12 scaffold via \`composer create-project\`
- \`.env.example\` dikonfigurasi untuk PostgreSQL Docker local
- \`bootstrap/app.php\` — clean, API-only, custom exception handler
- \`routes/api.php\` — health endpoint
- \`config/cors.php\` — CORS untuk frontend localhost:3000
- \`app/Modules/\` — 6 module folder (Kepegawaian, SuratTugas, BMN, Inventory, DeReporting, CMS)
- Cleanup: Blade views, Vite, package.json, web routes dihapus

## Verification
- [x] \`php artisan serve\` berhasil
- [x] \`/api/health\` return 200 OK
- [x] \`./vendor/bin/pint --test\` no errors
- [x] \`php artisan optimize\` no errors
- [x] 36 module subfolder terbuat

## Rules Compliance
- [x] Rule 8.1-8.2: Struktur modular dengan Controllers, Models, Routes, Migrations, Requests, Resources
- [x] Rule 5.7: Custom exception handler
- [x] Rule 9.9: Laravel Pint installed
- [x] Rule 10.1: Lokal dev pakai \`artisan serve\`

Closes #3" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Issue #001 dan #002 sudah selesai — RULES.md, .gitignore, docker-compose.yml sudah ada.
Folder `backend/` sudah ada dengan `.gitignore` dan `.gitkeep`.

## Task

Scaffold Laravel 12 di folder `backend/`. Ikuti langkah PERSIS di
`docs/issues/003-backend-laravel-scaffold.md`.

### Urutan Kerja
1. Backup `backend/.gitignore` → scaffold Laravel → restore `.gitignore`
2. Edit `.env.example` — PostgreSQL Docker config (db: bksda_superapp, port: 5432)
3. Edit `bootstrap/app.php` — API-only, clean exception handler, TANPA Vercel hack
4. Edit `routes/api.php` — hanya health endpoint
5. Edit `composer.json` — tambah `App\\Modules\\` autoload, lalu `composer dump-autoload`
6. Buat/edit `config/cors.php` — CORS untuk localhost:3000
7. Buat folder `app/Modules/{Kepegawaian,SuratTugas,BMN,Inventory,DeReporting,CMS}/{Controllers,Models,Routes,Migrations,Requests,Resources}` dengan `.gitkeep`
8. Cleanup: hapus `resources/views`, `vite.config.js`, `package.json`, `routes/web.php`, `.gitkeep`

### Verifikasi (WAJIB jalankan)
```bash
cd e:\bksda-superapp\backend
php artisan --version
php artisan serve          # test serve, lalu Ctrl+C
curl http://localhost:8000/api/health
./vendor/bin/pint --test
php artisan optimize
php artisan optimize:clear
```

### Git Workflow
```bash
cd e:\bksda-superapp
gh issue create --title "chore: scaffold Laravel 12 backend" --body "Detail di docs/issues/003-backend-laravel-scaffold.md" --label "setup,backend"
git checkout main && git pull origin main
git checkout -b issue/003-backend-laravel-scaffold
# ... kerjakan ...
git add . && git commit -m "chore: scaffold Laravel 12 backend (#3)"
git push -u origin issue/003-backend-laravel-scaffold
gh pr create --title "chore: scaffold Laravel 12 backend (#3)" --body "Closes #3" --base main
gh pr merge --squash --delete-branch
git checkout main && git pull origin main
```

### Rules
- Baca RULES.md sebelum mulai
- JANGAN install Sanctum atau Spatie — itu issue terpisah
- JANGAN buat Vercel config — itu issue terpisah
- Bootstrap/app.php harus BERSIH, tanpa workaround Vercel
- Semua file isi sesuai yang tertulis di issue MD
````
