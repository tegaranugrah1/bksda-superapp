# Issue #116 — Backend — CORS & Sanctum Config (Gerbang Keamanan API)

> **Type**: `config` / `security`
> **Labels**: `backend`, `security`, `devops`
> **Priority**: 🔴 Critical (Tanpa Ini, Frontend Tidak Bisa Bicara dengan Backend)
> **Complexity**: 🟢 Simple (2 File Konfigurasi — Tapi Salah Satu Baris = Seluruh App Mati)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Tidak ada — ini adalah fondasi pertama backend

---

## Branch

```
issue/116-backend-cors-sanctum-config
```

## Deskripsi

Bayangkan backend sebagai **kantor pemerintah**. CORS adalah **satpam gerbang** — ia memutuskan siapa yang boleh masuk. Sanctum adalah **kartu identitas (token)** — ia membuktikan siapa kita setelah masuk.

**2 File Konfigurasi:**

| # | File | Fungsi | Analogi |
|---|------|--------|---------|
| 1 | `config/cors.php` | Siapa yang boleh mengakses API | Satpam gerbang |
| 2 | `config/sanctum.php` | Bagaimana user membuktikan identitasnya | Kartu ID pegawai |

**Masalah yang PASTI Muncul Tanpa Konfigurasi Ini:**

```
❌ Access to XMLHttpRequest at 'http://api.example.com/api/...'
   from origin 'http://localhost:3000' has been blocked by CORS policy:
   No 'Access-Control-Allow-Origin' header is present.
```

Error ini artinya: **Satpam gerbang menolak frontend kita masuk.**

---

## Acceptance Criteria

- [ ] `config/cors.php` mengizinkan domain frontend (local + production).
- [ ] `config/sanctum.php` mendukung stateful domain + token expiration.
- [ ] File `.env` berisi variabel CORS dan Sanctum yang diperlukan.
- [ ] Endpoint `GET /sanctum/csrf-cookie` bisa diakses dari frontend.

---

## Panduan Implementasi

### File 1: `config/cors.php` — Satpam Gerbang API

```php
<?php

return [

    // ═══════════════════════════════════════════
    // PATH: Rute mana yang dilindungi CORS?
    // ═══════════════════════════════════════════

    // Hanya request ke /api/* dan /sanctum/csrf-cookie yang perlu CORS header.
    // Request internal (artisan, queue) tidak terpengaruh.
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // ═══════════════════════════════════════════
    // METHOD: HTTP method apa yang diizinkan?
    // ═══════════════════════════════════════════

    // '*' = semua method (GET, POST, PUT, DELETE, PATCH, OPTIONS)
    'allowed_methods' => ['*'],

    // ═══════════════════════════════════════════
    // ORIGIN: Domain mana yang boleh mengakses?
    // ═══════════════════════════════════════════

    // INI YANG PALING PENTING!
    // Jika domain frontend tidak ada di sini → CORS error.
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3000'),   // Development
        'http://127.0.0.1:3000',                        // Alternatif dev
        'https://bksda-superapp.vercel.app',            // Production
    ],

    // Pattern untuk preview deployment (Vercel membuat URL unik per branch)
    // Contoh: https://bksda-superapp-git-feature-xxx.vercel.app
    'allowed_origins_patterns' => [
        '#^https://bksda-superapp.*\.vercel\.app$#',
    ],

    // ═══════════════════════════════════════════
    // HEADERS
    // ═══════════════════════════════════════════

    // '*' = izinkan semua header (Authorization, Content-Type, dll)
    'allowed_headers' => ['*'],

    // Header yang boleh DIBACA oleh frontend dari response
    // Content-Disposition dibutuhkan untuk download file (nama file)
    'exposed_headers' => ['Content-Disposition'],

    // ═══════════════════════════════════════════
    // CREDENTIALS
    // ═══════════════════════════════════════════

    // WAJIB true jika pakai cookie (CSRF, session)
    // Tanpa ini, browser MENOLAK mengirim cookie ke API
    'supports_credentials' => true,

    // Cache preflight request (OPTIONS) selama 0 detik
    // Di production, naikkan ke 3600 (1 jam) untuk performa
    'max_age' => 0,
];
```

### Diagram: Bagaimana CORS Bekerja

```
Browser (localhost:3000)          Backend (localhost:8000)
         │                                  │
         │  1. OPTIONS /api/cms/informasi   │  ← Preflight request
         │  Origin: localhost:3000           │     (browser otomatis kirim)
         │─────────────────────────────────→│
         │                                  │
         │  2. Cek: apakah localhost:3000    │
         │     ada di allowed_origins?       │
         │     ✅ ADA!                       │
         │                                  │
         │  3. Response:                     │
         │  Access-Control-Allow-Origin:     │
         │  http://localhost:3000            │
         │←─────────────────────────────────│
         │                                  │
         │  4. GET /api/cms/informasi       │  ← Request sungguhan
         │  Authorization: Bearer xxx       │
         │─────────────────────────────────→│
         │                                  │
         │  5. 200 OK + JSON data           │
         │←─────────────────────────────────│
```

---

### File 2: `config/sanctum.php` — Kartu Identitas Token

```php
<?php

use Laravel\Sanctum\Sanctum;

return [

    // ═══════════════════════════════════════════
    // STATEFUL DOMAINS
    // ═══════════════════════════════════════════

    // Domain yang BOLEH menggunakan cookie session
    // (bukan Bearer token, tapi cookie — untuk SPA)
    //
    // PENTING: Domain di sini HARUS juga ada di allowed_origins (CORS)!
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1,bksda-superapp.vercel.app',
        Sanctum::currentApplicationUrlWithPort()
    ))),

    // ═══════════════════════════════════════════
    // GUARD
    // ═══════════════════════════════════════════

    // Guard autentikasi yang digunakan Sanctum
    'guard' => ['web'],

    // ═══════════════════════════════════════════
    // TOKEN EXPIRATION
    // ═══════════════════════════════════════════

    // Berapa menit token valid sebelum kadaluarsa?
    // 10080 menit = 7 hari
    //
    // PERTIMBANGAN:
    // - Terlalu pendek (60 menit) = user harus login terus → menyebalkan
    // - Terlalu panjang (30 hari) = jika token dicuri, penyerang punya akses lama
    // - 7 hari = kompromi yang wajar untuk aplikasi internal
    'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 10080),

    // ═══════════════════════════════════════════
    // TOKEN PREFIX
    // ═══════════════════════════════════════════

    // Prefix agar GitHub secret scanning mendeteksi token yang bocor ke repo
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    // ═══════════════════════════════════════════
    // MIDDLEWARE
    // ═══════════════════════════════════════════

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
```

### Diagram: Alur Autentikasi Sanctum

```
┌─────────────────────────────────────────────────────────────┐
│                    ALUR LOGIN → API CALL                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User submit login form (email + password)               │
│     POST /api/login                                         │
│                                                             │
│  2. Backend validasi → Buat token Sanctum                   │
│     return { token: "4|abc123xyz..." }                      │
│                                                             │
│  3. Frontend simpan token di localStorage                   │
│     localStorage.setItem("token", "4|abc123xyz...")          │
│                                                             │
│  4. Setiap API call berikutnya:                             │
│     lib/api.ts interceptor OTOMATIS menempel header:        │
│     Authorization: Bearer 4|abc123xyz...                    │
│                                                             │
│  5. Backend Sanctum menerima token → cari di tabel          │
│     personal_access_tokens → cocok? → izinkan akses         │
│                                                             │
│  6. Jika token expired (7 hari) atau tidak valid:           │
│     Backend return 401 → Frontend redirect ke /login        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### File 3: `.env` — Variabel Environment

```env
# ═══ Frontend URL (untuk CORS) ═══
FRONTEND_URL=http://localhost:3000

# ═══ Sanctum ═══
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,bksda-superapp.vercel.app
SANCTUM_TOKEN_EXPIRATION=10080

# ═══ Session ═══
SESSION_DRIVER=cookie
SESSION_DOMAIN=localhost
SESSION_SECURE_COOKIE=false
# ↑ Set ke "true" di production (HTTPS)!
```

### Tabel Environment: Dev vs Production

| Variabel | Development | Production |
|----------|-------------|------------|
| `FRONTEND_URL` | `http://localhost:3000` | `https://bksda-superapp.vercel.app` |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost,localhost:3000` | `bksda-superapp.vercel.app` |
| `SESSION_DOMAIN` | `localhost` | `.bksda-superapp.vercel.app` |
| `SESSION_SECURE_COOKIE` | `false` | `true` |
| `APP_DEBUG` | `true` | **`false`** ⚠️ |

> ⚠️ **KRUSIAL:** `APP_DEBUG=true` di production akan **mengekspos stack trace** (informasi internal server) kepada publik. Ini adalah **celah keamanan serius**.

---

## Troubleshooting

### Q: CORS error "No 'Access-Control-Allow-Origin' header"!

**Checklist:**
1. ✅ Domain frontend ada di `allowed_origins`? (termasuk port!)
2. ✅ `supports_credentials` = `true`?
3. ✅ `paths` mengandung `'api/*'`?
4. ✅ Sudah `php artisan config:clear` setelah mengubah config?
5. ✅ Nginx/Apache tidak menimpa CORS header?

### Q: Token Sanctum 401 padahal baru login!

**Checklist:**
1. ✅ Token tersimpan di localStorage? Cek di browser: `DevTools > Application > Local Storage`
2. ✅ `lib/api.ts` interceptor berjalan? Cek di: `DevTools > Network > Request Headers > Authorization`
3. ✅ Token belum expired? Default 7 hari.
4. ✅ Domain ada di `stateful`?

### Q: CSRF token mismatch (419)!

**Solusi:** Ini terjadi jika memakai mode stateful (cookie). Untuk API berbasis Bearer Token (yang kita pakai), CSRF tidak diperlukan. Pastikan request menggunakan header `Authorization: Bearer xxx` bukan cookie session.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "config(security): configure CORS allowed origins and Sanctum token authentication" --body "Closes #116" --label "backend,security,devops"
git checkout -b issue/116-backend-cors-sanctum-config
# Edit config/cors.php dan config/sanctum.php
# Update .env dan .env.example
git commit -m "config(security): configure CORS and Sanctum for SPA authentication (#116)"
git push -u origin issue/116-backend-cors-sanctum-config
gh pr create --title "config(security): CORS & Sanctum config (#116)" --body "## Changes
- cors.php: Izinkan localhost:3000 + bksda-superapp.vercel.app + pattern preview branch.
- sanctum.php: Stateful domains, token expiration 7 hari.
- .env.example: Dokumentasi variabel CORS, Sanctum, dan Session.
- Diagram alur CORS preflight dan Sanctum token flow.
Closes #116" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\backend\config\ (cors.php + sanctum.php yang sudah jalan)
Konfigurasi CORS dan Sanctum adalah langkah PERTAMA sebelum frontend bisa berkomunikasi dengan backend.

## Task

Kerjakan Issue #116 (Backend — CORS & Sanctum Config).
Ikuti instruksi di: `docs/issues/116-backend-cors-sanctum-config.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Edit `config/cors.php`: ganti domain `superapp-inventory` → `bksda-superapp`.
3. Edit `config/sanctum.php`: ganti domain stateful → `bksda-superapp.vercel.app`.
4. Update `.env` dan `.env.example` dengan variabel yang benar.
5. Jalankan `php artisan config:clear` untuk menghapus cache konfigurasi.
6. KRUSIAL: Pastikan `APP_DEBUG=false` di .env production!
7. Lakukan Git push dan `gh pr create`.
````
