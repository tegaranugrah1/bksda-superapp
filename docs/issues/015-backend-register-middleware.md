# Issue #015 — Backend — Register Middleware

> **Type**: `feature`
> **Labels**: `backend`, `configuration`, `auth`
> **Priority**: 🔴 Critical (mengaktifkan semua pengamanan yang sudah dibuat)
> **Complexity**: 🟢 Simple (hanya mengubah 1 file konfigurasi)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #012, #013, dan #014 harus sudah selesai.

---

## Branch

```
issue/015-backend-register-middleware
```

## Deskripsi

Pada issue sebelumnya, kita telah merancang 3 (tiga) lapis pengamanan: `CheckModuleAccess`, `CheckRole`, dan `AuditLogMiddleware`. Namun, file-file tersebut saat ini hanya teronggok di folder dan belum "dikenali" oleh sistem *routing* Laravel. 

Mulai Laravel 11 dan 12, pendaftaran *middleware* tidak lagi dilakukan di `app/Http/Kernel.php` (file tersebut sudah dihapus), melainkan terpusat secara rapi di file `bootstrap/app.php`.

**Apa yang dilakukan:**
1. Mendaftarkan **Alias** untuk `module.access` dan `role` agar bisa dipanggil secara fleksibel di dalam *Routes*.
2. Memasukkan (append) `AuditLogMiddleware` ke dalam **grup API** agar otomatis berjalan di latar belakang setiap kali ada *request* ke endpoint API (tanpa perlu dipanggil satu per satu).

---

## Acceptance Criteria

- [ ] File `bootstrap/app.php` berhasil di-update.
- [ ] Terdapat alias `module.access` yang mengarah ke `CheckModuleAccess`.
- [ ] Terdapat alias `role` yang mengarah ke `CheckRole`.
- [ ] Class `AuditLogMiddleware` berhasil dimasukkan (di-append) ke *middleware group* `api`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Lakukan langkah ini dengan sangat hati-hati. Jika terjadi salah ketik (*typo*) pada bagian namespace, maka seluruh aplikasi API tidak akan bisa berjalan (Fatal Error).

### Langkah 1: Modifikasi `bootstrap/app.php`

**Kenapa?** File ini adalah pusat komando bagi Laravel modern. Perintah `withMiddleware` digunakan untuk mengatur konfigurasi jalur (*pipeline*) request sebelum mencapai *Controller*.

**Path:** `e:\bksda-superapp\backend\bootstrap\app.php`

**Buka file tersebut dan ganti blok `withMiddleware` menjadi seperti ini:**

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        
        // 1. Mendaftarkan Alias (Agar bisa dipanggil di route misal: middleware('role:admin'))
        $middleware->alias([
            'module.access' => \App\Http\Middleware\CheckModuleAccess::class,
            'role'          => \App\Http\Middleware\CheckRole::class,
        ]);

        // 2. Mendaftarkan Global API Middleware (Berjalan otomatis di seluruh rute /api/*)
        // Kita masukkan AuditLog ke grup 'api' agar kita tidak pernah lupa me-log aktivitas
        $middleware->api(append: [
            \App\Http\Middleware\AuditLogMiddleware::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
```

**Apa yang terjadi:**
- `alias`: Mengizinkan *developer* menulis kode *routing* yang sangat pendek, alih-alih harus menulis seluruh *path class*-nya.
- `api(append: [...])`: Menjamin bahwa middleware `AuditLog` akan menempel secara otomatis di setiap respons API. Ini adalah *best practice* agar programmer tidak lupa memasang log di endpoint baru.

---

### Langkah 2: Verifikasi Server

**Kenapa?** Untuk memastikan kita tidak membuat kesalahan ketik.

```bash
cd e:\bksda-superapp\backend

# Cek apakah server bisa merender rute tanpa error class not found
php artisan route:list
```

**Hasil yang diharapkan:**
Daftar rute muncul secara normal tanpa ada *Error Stack Trace* berwarna merah di terminal.

---

## Troubleshooting

### Q: Muncul `Class "App\Http\Middleware\CheckRole" not found` saat `route:list`

**Artinya:** File *CheckRole.php* mungkin belum kamu buat (Issue #013 terlewat) atau salah penamaan (*typo*).
**Solusi:** Pastikan ketiga file middleware benar-benar ada di dalam folder `app/Http/Middleware/` dengan ejaan yang sama persis (huruf besar/kecil berpengaruh).

### Q: Apakah middleware bawaan Sanctum (`auth:sanctum`) perlu kita daftarkan juga?

**Artinya:** Kamu bingung mencari di mana letak `auth:sanctum`.
**Solusi:** Tidak perlu. Pada saat kamu menjalankan `php artisan install:api` (Issue #010), Laravel secara otomatis (*under the hood*) mendaftarkan alias `auth:sanctum` ke dalam sistemnya. Kita hanya perlu mendaftarkan middleware kustom/buatan kita sendiri.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "config: register rbac and audit middleware" \
  --body "Mendaftarkan CheckModuleAccess, CheckRole, dan AuditLog ke dalam bootstrap/app.php. Detail di docs/issues/015-backend-register-middleware.md" \
  --label "backend,configuration,auth"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/015-backend-register-middleware
```

### Step 3: Kerjakan

Lakukan *copy-paste* pada blok `withMiddleware` sesuai instruksi dan jalankan `php artisan route:list` untuk validasi kebenaran kode.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/bootstrap/app.php
git commit -m "config: register rbac and audit middleware (#15)"
git push -u origin issue/015-backend-register-middleware
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "config: register rbac and audit middleware (#15)" \
  --body "## Summary
Menghubungkan ketiga middleware pengamanan yang telah dibuat dengan sistem routing Laravel 12.

## Changes
- Update \`bootstrap/app.php\`.
- Penambahan alias untuk \`module.access\` dan \`role\`.
- Append otomatis \`AuditLogMiddleware\` ke grup \`api\`.

## Verification
- [x] Linter/Syntax check PHP lolos.
- [x] \`php artisan route:list\` berjalan normal tanpa *class not found*.

## Rules Compliance
- [x] Mendukung pemenuhan Rule 2.1, 2.3, dan 3.5 pada lapisan *Routing*.

Closes #15" \
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
Semua *custom middleware* (Issue #12, #13, #14) telah dibuat. Saatnya di-register agar berfungsi.

## Task

Kerjakan Issue #015 (Backend — Register Middleware).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/015-backend-register-middleware.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buka `backend/bootstrap/app.php`.
3. Sisipkan alias untuk `module.access` dan `role` ke dalam `$middleware->alias()`.
4. Sisipkan `AuditLogMiddleware` menggunakan metode `$middleware->api(append: [...])`.
5. Pastikan tidak ada karakter atau koma yang tertinggal/salah ketik. Jalankan tes sederhana `php artisan route:list` untuk verifikasi PHP parser.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
