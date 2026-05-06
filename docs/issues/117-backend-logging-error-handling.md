# Issue #117 — Backend — Logging & Error Handling (Kotak Hitam Pesawat)

> **Type**: `config` / `security`
> **Labels**: `backend`, `security`, `devops`, `observability`
> **Priority**: 🔴 Critical (Tanpa Log, Bug = Misteri Tanpa Petunjuk)
> **Complexity**: 🟢 Simple (1 Config File + 1 Middleware + 1 Exception Handler)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Tidak ada

---

## Branch

```
issue/117-backend-logging-error-handling
```

## Deskripsi

Bayangkan backend sebagai **pesawat terbang**. Log adalah **kotak hitam (black box)** — ia merekam semua yang terjadi. Jika pesawat jatuh (error), kotak hitam membantu kita menemukan penyebabnya. Tanpa log, setiap bug adalah **misteri tanpa petunjuk**.

**3 Komponen yang Dibahas:**

| # | Komponen | File | Fungsi |
|---|----------|------|--------|
| 1 | Logging Config | `config/logging.php` | Mendefinisikan DIMANA dan BERAPA LAMA log disimpan |
| 2 | Audit Middleware | `app/Http/Middleware/AuditLog.php` | Merekam SIAPA melakukan APA di API |
| 3 | Exception Handler | `bootstrap/app.php` | Menyembunyikan stack trace dari publik |

**2 Jenis Log yang Kita Punya:**

| Jenis | File | Isi | Retensi |
|-------|------|-----|---------|
| **Application Log** | `storage/logs/laravel.log` | Error, warning, debug dari kode | 14 hari |
| **Audit Log** | `storage/logs/audit.log` | Siapa login, siapa hapus data, siapa edit apa | **90 hari** |

---

## Acceptance Criteria

- [ ] `config/logging.php` memiliki channel `audit` terpisah.
- [ ] `AuditLog` middleware merekam semua operasi write (POST/PUT/PATCH/DELETE).
- [ ] Exception handler menyembunyikan stack trace di production.
- [ ] Middleware terpasang di stack API (`bootstrap/app.php`).

---

## Panduan Implementasi

### Komponen 1: `config/logging.php` — Konfigurasi Saluran Log

Yang perlu **ditambahkan** ke konfigurasi default Laravel:

```php
'channels' => [
    // ... channel bawaan Laravel tetap ada ...

    // ═══════════════════════════════════════════
    // CHANNEL BARU: Audit Log
    // ═══════════════════════════════════════════

    'audit' => [
        'driver' => 'daily',                              // 1 file per hari
        'path' => storage_path('logs/audit.log'),          // File terpisah dari laravel.log
        'level' => 'info',                                 // Hanya info ke atas (bukan debug)
        'days' => 90,                                      // Simpan 90 hari (3 bulan)
        'replace_placeholders' => true,
    ],
],
```

**Mengapa channel terpisah?**

```
storage/logs/
├── laravel-2024-03-15.log    ← Error, debug, query — BISING, banyak noise
├── laravel-2024-03-16.log
├── audit-2024-03-15.log      ← Hanya aksi user — BERSIH, mudah di-audit
├── audit-2024-03-16.log
```

Jika semua log dicampur dalam 1 file, mencari "siapa yang menghapus data X" akan seperti mencari jarum dalam tumpukan jerami. Dengan file terpisah, tinggal buka `audit.log` dan `grep DELETE`.

### Perbedaan Driver `single` vs `daily`

| Driver | Perilaku | Cocok Untuk |
|--------|----------|-------------|
| `single` | 1 file saja, terus bertambah selamanya | Development |
| `daily` | 1 file per hari, otomatis dihapus setelah X hari | **Production ✅** |

> **SELALU pakai `daily` di production!** Driver `single` akan membuat file log membengkak tak terbatas hingga disk penuh.

---

### Komponen 2: `app/Http/Middleware/AuditLog.php` — Perekam Aksi User

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuditLog
{
    /**
     * Merekam semua operasi WRITE (POST, PUT, PATCH, DELETE) ke audit log.
     *
     * MENGAPA hanya write?
     * - GET (baca) terlalu sering → log akan membanjir
     * - POST/PUT/PATCH/DELETE (tulis) = aksi yang mengubah data → PENTING direkam
     *
     * MENGAPA hanya yang berhasil (2xx)?
     * - Request gagal (4xx, 5xx) sudah direkam di laravel.log
     * - Audit log hanya peduli pada aksi yang BENAR-BENAR mengubah database
     */
    public function handle(Request $request, Closure $next)
    {
        // Jalankan request dulu, baru log hasilnya
        $response = $next($request);

        // Hanya log operasi tulis
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $user = $request->user();
            $statusCode = $response->getStatusCode();

            // Hanya log yang berhasil (2xx)
            if ($statusCode >= 200 && $statusCode < 300) {
                Log::channel('audit')->info('AUDIT', [
                    'user_id'    => $user?->id,           // Siapa?
                    'username'   => $user?->username,      // Nama user
                    'method'     => $request->method(),    // POST/PUT/DELETE?
                    'url'        => $request->fullUrl(),   // Endpoint apa?
                    'ip'         => $request->ip(),        // Dari mana?
                    'user_agent' => mb_substr(             // Pakai browser apa?
                        $request->userAgent() ?? '', 0, 100
                    ),
                    'status'     => $statusCode,           // 200/201/204?
                    'timestamp'  => now()->toIso8601String(),
                ]);
            }
        }

        return $response;
    }
}
```

### Contoh Output Audit Log

```log
[2024-03-15 10:23:45] local.INFO: AUDIT {
    "user_id": 1,
    "username": "admin",
    "method": "DELETE",
    "url": "http://api.bksda.go.id/api/cms/admin/informasi/42",
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "status": 200,
    "timestamp": "2024-03-15T10:23:45+07:00"
}
```

Dari log ini kita bisa menjawab: **"Siapa yang menghapus berita #42?"** → Admin (user_id=1), dari IP 192.168.1.100, pada 15 Maret 2024 pukul 10:23.

---

### Komponen 3: Exception Handler — Penjaga Rahasia Server

Ditambahkan di `bootstrap/app.php`:

```php
->withExceptions(function (Exceptions $exceptions): void {

    // ═══ Handler 1: Autentikasi ═══
    // Jika user belum login dan akses API → kembalikan JSON 401
    // (bukan redirect ke halaman login HTML)
    $exceptions->render(function (
        \Illuminate\Auth\AuthenticationException $e,
        \Illuminate\Http\Request $request
    ) {
        if ($request->is('api/*') || $request->wantsJson()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
    });

    // ═══ Handler 2: Error Generik (Production) ═══
    // SEMBUNYIKAN stack trace dari publik — hanya tampilkan pesan generik
    $exceptions->render(function (
        \Throwable $e,
        \Illuminate\Http\Request $request
    ) {
        if (($request->is('api/*') || $request->wantsJson()) && !config('app.debug')) {

            // Biarkan error validasi lewat (frontend butuh pesan field-by-field)
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return null; // null = Laravel handle seperti biasa
            }

            $status = method_exists($e, 'getStatusCode')
                ? $e->getStatusCode()
                : 500;

            // Biarkan error 4xx lewat (pesan berguna untuk user)
            if ($status < 500) {
                return null;
            }

            // Error 5xx → sembunyikan detail
            return response()->json([
                'error' => 'Terjadi kesalahan pada server',
                'message' => 'Silakan coba lagi nanti',
            ], 500);
        }
    });
})
```

### Diagram: Apa yang User Lihat vs Apa yang Log Catat

```
              Development (APP_DEBUG=true)     Production (APP_DEBUG=false)
              ┌──────────────────────────┐     ┌─────────────────────────┐
User melihat: │ Illuminate\Database\     │     │ {                       │
              │ QueryException:          │     │   "error": "Terjadi     │
              │ SQLSTATE[42S02]:         │     │   kesalahan pada        │
              │ Table 'x' doesn't exist  │     │   server"               │
              │                          │     │ }                       │
              │ Stack trace:             │     │                         │
              │ #0 vendor/laravel/...    │     │ (Tidak ada stack trace) │
              │ #1 app/Controllers/...   │     │                         │
              └──────────────────────────┘     └─────────────────────────┘
                 ↑ BERBAHAYA! Ekspos          ↑ AMAN! User tidak
                   nama tabel, path,            tahu detail internal
                   dan struktur kode

Log mencatat: storage/logs/laravel.log → Detail lengkap (stack trace + query) TETAP tersimpan
```

---

### Komponen 4: Registrasi Middleware di `bootstrap/app.php`

```php
->withMiddleware(function (Middleware $middleware) {
    // ... middleware lain ...

    // Tempel AuditLog di AKHIR stack API
    // (append = dijalankan SETELAH request diproses, jadi kita tahu status response)
    $middleware->api(append: [
        \App\Http\Middleware\AuditLog::class,
    ]);
})
```

**Mengapa `append` (bukan `prepend`)?**

```
Request masuk → [Auth] → [CORS] → [Controller] → [Response] → [AuditLog] → Response keluar
                                                                    ↑
                                                          Di sini kita sudah tahu:
                                                          - User siapa (dari Auth)
                                                          - Status berhasil/gagal
                                                          - URL yang diakses
```

Jika kita pakai `prepend`, AuditLog berjalan SEBELUM Auth — kita tidak tahu siapa user-nya!

---

## Variabel Environment

```env
# ═══ Logging ═══
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=debug
LOG_DAILY_DAYS=14

# ═══ Debug (WAJIB false di production!) ═══
APP_DEBUG=false
```

---

## Troubleshooting

### Q: File audit.log tidak muncul!

**Checklist:**
1. ✅ Channel `audit` ada di `config/logging.php`?
2. ✅ Folder `storage/logs/` bisa ditulis? (`chmod 775 storage/logs`)
3. ✅ Middleware `AuditLog` terdaftar di `bootstrap/app.php`?
4. ✅ Sudah `php artisan config:clear`?
5. ✅ Sudah melakukan request POST/PUT/DELETE (bukan GET)?

### Q: Log file membengkak sampai disk penuh!

**Solusi:** Ganti driver `single` → `daily` dan set retensi:
```php
'daily' => [
    'driver' => 'daily',
    'days' => 14,  // Hapus otomatis setelah 14 hari
],
```

### Q: Stack trace masih muncul di production!

**Solusi:** Pastikan `.env` production memiliki:
```env
APP_DEBUG=false
APP_ENV=production
```
Lalu jalankan `php artisan config:clear`.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "config(logging): add audit log channel, AuditLog middleware, and production error handler" --body "Closes #117" --label "backend,security,devops,observability"
git checkout -b issue/117-backend-logging-error-handling
# Edit config/logging.php → tambah channel audit
# Buat app/Http/Middleware/AuditLog.php
# Edit bootstrap/app.php → daftarkan middleware + exception handler
git commit -m "config(logging): add audit log channel and production error handler (#117)"
git push -u origin issue/117-backend-logging-error-handling
gh pr create --title "config(logging): audit logging & error handling (#117)" --body "## Changes
- config/logging.php: Channel audit terpisah (daily, 90 hari retensi).
- AuditLog middleware: Rekam semua write operation (user, IP, URL, status).
- Exception handler: Sembunyikan stack trace di production (APP_DEBUG=false).
- Middleware di-append ke stack API agar user info tersedia.
Closes #117" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\backend\ (logging.php, AuditLog.php, bootstrap/app.php)
Backend butuh 2 jenis log: application log (error/debug) dan audit log (siapa melakukan apa).

## Task

Kerjakan Issue #117 (Backend — Logging & Error Handling).
Ikuti instruksi di: `docs/issues/117-backend-logging-error-handling.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Edit `config/logging.php`: tambah channel `audit` (daily, 90 hari).
3. Buat `app/Http/Middleware/AuditLog.php`: rekam POST/PUT/PATCH/DELETE.
4. Edit `bootstrap/app.php`:
   - Append `AuditLog` ke middleware API.
   - Tambah exception handler untuk sembunyikan stack trace.
5. KRUSIAL: Pastikan `APP_DEBUG=false` di .env production.
6. KRUSIAL: Middleware harus `append` (bukan prepend) agar user info tersedia.
7. Lakukan Git push dan `gh pr create`.
````
