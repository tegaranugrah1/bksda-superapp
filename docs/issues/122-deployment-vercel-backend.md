# Issue #122 — Deployment — Vercel Backend Config (Menjalankan Laravel di Cloud Tanpa Server)

> **Type**: `devops` / `deployment`
> **Labels**: `backend`, `devops`, `deployment`
> **Priority**: 🔴 Critical (Backend = Otak Aplikasi — Tanpa Ini, Semua API Mati)
> **Complexity**: 🔴 High (Vercel Serverless ≠ Server Tradisional — Banyak Jebakan!)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro (Butuh pemahaman infrastruktur)
> **Dependencies**: Issue #116 (CORS), Issue #117 (Logging), Issue #118 (Storage)

---

## Branch

```
issue/122-deployment-vercel-backend
```

## Deskripsi

Menjalankan Laravel di Vercel itu seperti **memasukkan ikan air tawar ke air laut** — bisa hidup, tapi butuh adaptasi khusus. Laravel didesain untuk server tradisional (ada disk, ada memori tetap, proses hidup lama). Vercel adalah **serverless** — tidak ada disk tetap, memori terbatas, dan setiap request membuat proses baru.

**3 File Kunci yang Harus Ada:**

| # | File | Fungsi | Analogi |
|---|------|--------|---------|
| 1 | `vercel.json` | Instruksi deploy untuk Vercel | Resep masak |
| 2 | `api/index.php` | Pintu masuk tunggal semua request | Resepsionis |
| 3 | `vercel_bootstrap.php` | Adaptasi Laravel untuk serverless | Adaptor listrik |

### Diagram: Perbedaan Server Tradisional vs Vercel Serverless

```
═══ SERVER TRADISIONAL (VPS/Docker) ═══

┌──────────────────────────────────────────────┐
│  Server (selalu hidup)                       │
│                                              │
│  Disk: storage/logs/, storage/framework/     │ ← File tetap ada
│  RAM: 1-4 GB (tetap tersedia)                │ ← Proses hidup terus
│  PHP-FPM: selalu berjalan                    │ ← Siap melayani kapan saja
│                                              │
│  Request 1 ──→ PHP-FPM ──→ Response          │
│  Request 2 ──→ PHP-FPM ──→ Response          │
│  (proses yang sama melayani banyak request)   │
└──────────────────────────────────────────────┘

═══ VERCEL SERVERLESS ═══

Request 1 ──→ ┌──────────────────┐ ──→ Response 1
              │  Lambda Function │
              │  (hidup 0-25 dtk)│
              │  Disk: /tmp saja │ ← HILANG setelah selesai!
              │  RAM: 1024 MB    │
              └──────────────────┘ ← Mati setelah idle

Request 2 ──→ ┌──────────────────┐ ──→ Response 2
              │  Lambda BARU     │ ← Proses baru!
              │  (tidak kenal    │   Tidak ada cache,
              │   request 1)     │   tidak ada session file,
              └──────────────────┘   tidak ada log file!
```

**Konsekuensi untuk Laravel:**

| Fitur Laravel | Server Tradisional | Vercel Serverless |
|---------------|-------------------|-------------------|
| `storage/logs/` | ✅ Tersimpan permanen | ❌ Hilang setiap request! |
| `storage/framework/views/` | ✅ Cache view | ❌ Harus buat ulang di `/tmp` |
| Session driver `file` | ✅ Bekerja | ❌ Session hilang! |
| File upload ke disk | ✅ Tersimpan | ❌ Hilang! → Pakai Supabase |
| Log channel `daily` | ✅ Tersimpan | ❌ Hilang! → Pakai `stderr` |

---

## Acceptance Criteria

- [ ] `vercel.json` tersedia dengan routing, env, dan function config.
- [ ] `api/index.php` tersedia sebagai entrypoint serverless.
- [ ] `vercel_bootstrap.php` tersedia untuk adaptasi `/tmp`.
- [ ] `nixpacks.toml` tersedia untuk ekstensi PHP tambahan.
- [ ] Build berhasil dan API bisa diakses via URL Vercel.

---

## Panduan Implementasi

### File 1: `vercel.json` — Resep Deploy

```json
{
    "version": 2,
    "public": true,
    "name": "bksda-backend",

    "outputDirectory": "public",

    "rewrites": [
        {
            "source": "/(css|js|images|fonts|favicons)/(.*)",
            "destination": "/public/$1/$2"
        },
        {
            "source": "/api/(.*)",
            "destination": "/api/index.php"
        },
        {
            "source": "/(.*)",
            "destination": "/api/index.php"
        }
    ],

    "env": {
        "SESSION_DRIVER": "array",
        "LOG_CHANNEL": "stderr",
        "DB_CONNECTION": "pgsql"
    },

    "functions": {
        "api/index.php": {
            "runtime": "vercel-php@0.7.1",
            "memory": 1024,
            "maxDuration": 25
        }
    }
}
```

### Penjelasan Setiap Blok:

```
vercel.json
├── version: 2              → Versi API Vercel (selalu 2)
├── name: "bksda-backend"   → Nama project di Vercel
├── outputDirectory: "public" → Folder aset statis (CSS/JS/gambar)
│
├── rewrites:               → Peta routing (SANGAT PENTING!)
│   ├── /css/*, /js/*, ...  → Langsung sajikan file statis
│   ├── /api/*              → Teruskan ke api/index.php (Laravel)
│   └── /*                  → Semua sisanya juga ke Laravel
│
├── env:                    → Override env khusus Vercel
│   ├── SESSION_DRIVER=array  → Session di memori (bukan file!)
│   ├── LOG_CHANNEL=stderr    → Log ke stderr (bukan file!)
│   └── DB_CONNECTION=pgsql   → Paksa PostgreSQL
│
└── functions:              → Konfigurasi serverless function
    └── api/index.php
        ├── runtime: vercel-php@0.7.1  → PHP runtime di Vercel
        ├── memory: 1024               → RAM 1 GB
        └── maxDuration: 25            → Timeout 25 detik
```

---

### File 2: `api/index.php` — Resepsionis (Entrypoint)

```php
<?php

/**
 * Vercel Serverless Entry Point untuk Laravel.
 *
 * MENGAPA file ini ada?
 * Di server tradisional, Nginx/Apache mengarahkan request ke public/index.php.
 * Di Vercel, tidak ada Nginx. Vercel butuh file di folder /api/ sebagai entrypoint.
 * File ini menjadi "jembatan" dari Vercel ke Laravel.
 *
 * ALUR REQUEST:
 * 1. User: GET /api/cms/informasi
 * 2. Vercel: "Oh, /api/* → api/index.php" (dari vercel.json rewrites)
 * 3. File ini: Setup /tmp, fix path, lalu forward ke Laravel
 * 4. Laravel: Proses route, return JSON
 */

// ═══ STEP 1: Redirect semua cache/storage ke /tmp ═══
// Karena Vercel TIDAK punya disk permanen, semua harus ke /tmp
$paths = [
    'APP_STORAGE'         => '/tmp',
    'VIEW_COMPILED_PATH'  => '/tmp/framework/views',
    'APP_CONFIG_CACHE'    => '/tmp/config.php',
    'APP_EVENTS_CACHE'    => '/tmp/events.php',
    'APP_PACKAGES_CACHE'  => '/tmp/packages.php',
    'APP_SERVICES_CACHE'  => '/tmp/services.php',
    'APP_ROUTES_CACHE'    => '/tmp/routes.php',
];

// Fix Laravel routing — tanpa ini, Laravel menganggap "/api" adalah base path
// dan semua route /api/xxx menjadi /xxx (salah!)
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/../public/index.php';

foreach ($paths as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}

// ═══ STEP 2: Buat folder /tmp yang dibutuhkan Laravel ═══
$dirs = [
    '/tmp/framework/views',
    '/tmp/framework/cache/data',
    '/tmp/framework/sessions',
    '/tmp/framework/testing',
];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// ═══ STEP 3: Cek vendor/ ada? ═══
// Jika composer install gagal saat build, vendor/ tidak ada
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    header('HTTP/1.1 500 Internal Server Error');
    echo "Fatal: Vendor autoloader not found. Check Vercel Build Logs.";
    exit(1);
}

// ═══ STEP 4: Load bootstrap tambahan ═══
require __DIR__ . '/../vercel_bootstrap.php';

// ═══ STEP 5: Forward ke Laravel ═══
require __DIR__ . '/../public/index.php';
```

### Diagram: Alur Request di Vercel

```
User request: GET /api/cms/informasi
     │
     ↓
┌─────────────────────────────────────────────────────┐
│  Vercel Edge Network                                │
│  1. Cek vercel.json rewrites                        │
│  2. /api/* → api/index.php ✓                        │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│  api/index.php (Serverless Function)                │
│                                                     │
│  Step 1: Redirect storage → /tmp                    │
│  Step 2: Buat folder /tmp/framework/*               │
│  Step 3: Cek vendor/autoload.php                    │
│  Step 4: Load vercel_bootstrap.php                  │
│  Step 5: require public/index.php (Laravel boot!)   │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Laravel                                    │    │
│  │  → Route matching                           │    │
│  │  → Middleware (auth, CORS, audit)           │    │
│  │  → Controller → Model → Database           │    │
│  │  → Return JSON response                    │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────┘
                   ↓
     Response: { "data": [...] }
```

---

### File 3: `vercel_bootstrap.php` — Adaptor Serverless

```php
<?php

/**
 * Bootstrap tambahan khusus environment Vercel.
 * File ini dipanggil oleh api/index.php SEBELUM Laravel boot.
 */

if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
    // Force storage path ke /tmp (satu-satunya folder writable di Vercel)
    $_ENV['APP_STORAGE'] = '/tmp';
    putenv('APP_STORAGE=/tmp');

    // Pastikan folder framework ada
    $dirs = [
        '/tmp/framework/views',
        '/tmp/framework/cache/data',
        '/tmp/framework/sessions',
        '/tmp/framework/testing',
    ];

    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }

    // Set temporary directory untuk upload
    if (!ini_get('upload_tmp_dir')) {
        ini_set('upload_tmp_dir', '/tmp');
    }
}
```

---

### File 4: `nixpacks.toml` — Ekstensi PHP Tambahan

```toml
[variables]
    NIXPACKS_PHP_ROOT_DIR = "/public"

[phases.setup]
    aptPkgs = ["...", "php8.2-gd", "libpng-dev", "libzip-dev"]
```

**Mengapa file ini ada?**
Vercel menggunakan **Nixpacks** untuk build PHP. Secara default, beberapa ekstensi PHP tidak terinstal. Jika kode kita membutuhkan GD (manipulasi gambar) atau Zip, kita harus menambahkannya di sini.

---

### File 5: `.env` — Variabel Khusus Vercel (Set di Dashboard)

| Variable | Value | Penjelasan |
|----------|-------|------------|
| `APP_KEY` | `base64:xxx...` | Kunci enkripsi Laravel (generate via `php artisan key:generate`) |
| `APP_ENV` | `production` | Mode production |
| `APP_DEBUG` | `false` | **WAJIB false!** |
| `APP_URL` | `https://backend-bksda.vercel.app` | URL backend |
| `FRONTEND_URL` | `https://bksda-superapp.vercel.app` | URL frontend (untuk CORS) |
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Host Supabase |
| `DB_PORT` | `6543` | Port pooler Supabase |
| `DB_DATABASE` | `postgres` | Database name |
| `DB_USERNAME` | `postgres.xxx` | Username Supabase |
| `DB_PASSWORD` | `xxx` | Password Supabase |
| `SESSION_DRIVER` | `array` | Session di memori (bukan file!) |
| `LOG_CHANNEL` | `stderr` | Log ke stderr (Vercel Logs) |
| `SANCTUM_TOKEN_EXPIRATION` | `10080` | 7 hari |

> ⚠️ **JANGAN set env vars di `vercel.json` untuk secrets!** `vercel.json` ter-commit ke Git. Gunakan Vercel Dashboard untuk secrets (APP_KEY, DB_PASSWORD, dll).

---

## Troubleshooting

### Q: Deploy berhasil tapi API return 500!

**Checklist (urutan paling sering):**
1. ✅ `APP_KEY` sudah diset di Vercel env vars? (paling sering lupa!)
2. ✅ Database credentials benar? (DB_HOST, DB_PORT, DB_PASSWORD)
3. ✅ `vendor/` ter-build? Cek Vercel Build Logs → cari "composer install"
4. ✅ PHP extensions tersedia? (GD, pgsql, zip)

### Q: Error "Route [login] not defined"!

**Penyebab:** Laravel mencoba redirect ke route `login` (web) saat token invalid. Di API, kita butuh JSON response 401.
**Solusi:** Pastikan exception handler di `bootstrap/app.php` menangkap `AuthenticationException` dan return JSON (Issue #117).

### Q: "Storage directory not writable"!

**Penyebab:** Vercel hanya punya `/tmp` sebagai writable directory.
**Solusi:** Pastikan `api/index.php` redirect semua storage path ke `/tmp` (sudah terhandle di kode di atas).

### Q: File upload gagal "file too large"!

**Penyebab:** Vercel memiliki batas body request.
- Hobby plan: **4.5 MB** body limit
- Pro plan: **4.5 MB** (bisa dinaikkan)
**Solusi:** Upload file besar langsung ke Supabase dari frontend (bypass backend).

### Q: Cold start lambat (3-5 detik pertama)!

**Penjelasan:** Saat function idle, Vercel "mematikannya". Request pertama harus boot PHP + Laravel dari nol (cold start). Request berikutnya cepat (warm). Ini **normal** di serverless.
**Mitigasi:** Gunakan cron job atau monitoring yang ping API setiap 5 menit untuk menjaga function tetap "warm".

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "deploy(vercel): configure Vercel backend with serverless PHP, /tmp storage, and PostgreSQL" --body "Closes #122" --label "backend,devops,deployment"
git checkout -b issue/122-deployment-vercel-backend
# Buat vercel.json, api/index.php, vercel_bootstrap.php, nixpacks.toml
git commit -m "deploy(vercel): add serverless PHP entrypoint and /tmp storage adapter (#122)"
git push -u origin issue/122-deployment-vercel-backend
gh pr create --title "deploy(vercel): Vercel backend serverless config (#122)" --body "## Changes
- vercel.json: Routing, env override (session=array, log=stderr), PHP runtime config.
- api/index.php: Entrypoint serverless — redirect storage ke /tmp, fix SCRIPT_NAME.
- vercel_bootstrap.php: Buat folder /tmp/framework/* untuk Laravel.
- nixpacks.toml: Tambah php8.2-gd dan libzip-dev.
Closes #122" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo: frontend/ + backend/)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\backend\ (vercel.json, api/index.php, vercel_bootstrap.php sudah production-proven)
Backend Laravel di-deploy ke Vercel Serverless. BUKAN server tradisional!

## Task

Kerjakan Issue #122 (Deployment — Vercel Backend Config).
Ikuti instruksi di: `docs/issues/122-deployment-vercel-backend.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Copy vercel.json, api/index.php, vercel_bootstrap.php, nixpacks.toml dari superapp-inventory.
3. KRUSIAL: Ganti nama project di vercel.json dari "superapp-backend" → "bksda-backend".
4. KRUSIAL: Set env vars di Vercel Dashboard (BUKAN di vercel.json!) untuk:
   APP_KEY, DB_HOST, DB_PASSWORD, SUPABASE_SERVICE_ROLE_KEY
5. KRUSIAL: SESSION_DRIVER harus "array" (bukan "file" atau "database").
6. KRUSIAL: LOG_CHANNEL harus "stderr" (bukan "daily" atau "single").
7. Verifikasi deploy → cek /api/health atau /api/me endpoint.
8. Lakukan Git push dan `gh pr create`.
````
