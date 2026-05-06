# Issue #014 — Backend — AuditLog Middleware

> **Type**: `feature`
> **Labels**: `backend`, `security`, `logging`
> **Priority**: 🔴 Critical (kewajiban sistem birokrasi/pemerintahan)
> **Complexity**: 🟡 Medium (pembuatan model, migration, dan middleware)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #009 (Model User)

---

## Branch

```
issue/014-backend-auditlog-middleware
```

## Deskripsi

Dalam aplikasi pemerintahan seperti BKSDA Kaltim, setiap perubahan data (Tambah, Ubah, Hapus) mutlak harus meninggalkan "jejak digital" (Audit Trail). Sesuai **Rule 3.5**, kita wajib mencatat siapa yang melakukan aksi, kapan, dari IP mana, dan ke mana tujuannya.

**Apa yang dilakukan:**
1. Membuat Migration dan Model `AuditLog` untuk menyimpan data log di database.
2. Membuat Middleware `AuditLogMiddleware`.
3. Mengimplementasikan **Best Practice Keamanan**: 
   - Hanya metode "Write" (`POST`, `PUT`, `PATCH`, `DELETE`) yang dicatat. Metode "Read" (`GET`) diabaikan agar database tidak lekas penuh.
   - Menyensor atribut rahasia (seperti `password`) dari *payload* yang disimpan.
   - Mencatat *Response Status Code* agar tahu apakah aksinya berhasil (200/201) atau gagal (400/500).

**Apa yang TIDAK dilakukan:**
- ❌ Tidak me-register middleware ini ke bootstrap (tunggu Issue #015).

---

## Acceptance Criteria

- [ ] File Migration `create_audit_logs_table` dibuat dengan kolom `user_id`, `method`, `url`, `ip_address`, `status_code`, dan `payload` (JSON).
- [ ] `php artisan migrate` berjalan sukses.
- [ ] Model `AuditLog` dibuat dan men-disable `updated_at` (Log sifatnya abadi, tidak pernah di-update).
- [ ] Middleware `AuditLogMiddleware` mencatat log ke database **setelah** request berhasil diproses (*Post-Middleware* pattern).
- [ ] Middleware membersihkan (sensor) key `password` dari input *payload*.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Kita menggunakan pola *Post-Middleware*. Artinya, *request* dibiarkan lewat dulu masuk ke sistem, lalu saat sistem mau membalas (*response*), kita catat status balasannya (sukses/gagal) dan simpan ke database.

### Langkah 1: Buat Model & Migration

**Kenapa?** Kita butuh tabel khusus untuk menyimpan jejak rekam ini secara permanen.

```bash
cd e:\bksda-superapp\backend

# Membuat model beserta file migration-nya (-m)
php artisan make:model AuditLog -m
```

---

### Langkah 2: Update Migration

**Path:** `e:\bksda-superapp\backend\database\migrations\xxxx_xx_xx_xxxxxx_create_audit_logs_table.php`

**Buka file migration yang baru saja dibuat, dan ubah function `up()`:**

```php
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // user_id nullable karena bisa jadi aktivitas dilakukan oleh Guest (belum login)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('method'); // POST, PUT, DELETE
            $table->text('url'); // Path yang diakses
            $table->string('ip_address')->nullable();
            $table->integer('status_code'); // Contoh: 200 (OK), 403 (Forbidden)
            
            // Simpan body request (apa saja yang dikirim oleh user)
            $table->json('payload')->nullable(); 
            
            // Kita hanya butuh created_at (kapan dicatat). Tidak butuh updated_at.
            $table->timestamp('created_at')->useCurrent();
        });
    }
```

**Jalankan migrasi:**
```bash
php artisan migrate
```

---

### Langkah 3: Setup Model `AuditLog` (Clean Code)

**Kenapa?** Log tidak pernah di-edit. Oleh karena itu, kita mematikan fitur `updated_at` milik Laravel untuk menghemat ruang memori.

**Path:** `e:\bksda-superapp\backend\app\Models\AuditLog.php`

**Ganti isinya menjadi:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    // Mematikan kolom updated_at karena log tidak pernah diedit
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'method',
        'url',
        'ip_address',
        'status_code',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    /**
     * Relasi ke pembuat log (User)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

---

### Langkah 4: Buat & Setup Middleware

**Kenapa?** Inilah agen rahasia yang akan mencegat request dan mencatatnya ke database.

```bash
php artisan make:middleware AuditLogMiddleware
```

**Path:** `e:\bksda-superapp\backend\app\Http\Middleware\AuditLogMiddleware.php`

**Ganti isinya menjadi:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\AuditLog;

class AuditLogMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Biarkan proses Laravel (Controller, dll) berjalan sampai selesai
        //    Ini disebut pola "Post-Middleware"
        $response = $next($request);

        // 2. Filter: Hanya catat log untuk metode yang memanipulasi data
        $writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (!in_array($request->method(), $writeMethods)) {
            return $response; // Jika cuma GET data, jangan dicatat (menuhi DB)
        }

        // 3. Sensor Data Sensitif (Best Practice Security)
        // Kita tidak mau password user terekam secara plain-text di tabel logs
        $payload = $request->except([
            'password', 
            'password_confirmation', 
            'current_password', 
            'new_password', 
            'token'
        ]);

        // 4. Catat aktivitas ke database secara asinkron (bila memungkinkan)
        // atau langsung insert menggunakan Eloquent
        AuditLog::create([
            'user_id'     => $request->user()?->id,
            'method'      => $request->method(),
            'url'         => $request->fullUrl(),
            'ip_address'  => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'payload'     => empty($payload) ? null : $payload,
        ]);

        // 5. Kembalikan response ke pengguna
        return $response;
    }
}
```

---

## Troubleshooting

### Q: Migrasi gagal karena `users` belum ada (Foreign Key Constraint)

**Artinya:** Urutan migrasi kamu kacau atau kamu melompati Issue #009.
**Solusi:** Pastikan Issue #009 sudah beres. Jalankan `php artisan migrate:fresh` agar Laravel membaca dari urutan file tanggal yang ada.

### Q: Kenapa `GET` tidak dicatat? Bukankah kita perlu tahu siapa yang membaca data?

**Artinya:** Ini adalah isu manajemen kapasitas (Storage).
**Solusi:** Membaca (Read/GET) data biasanya terjadi ribuan kali sehari (misal: refresh halaman, dropdown list, dll). Jika semuanya dicatat, database akan membengkak drastis. Berdasarkan *best practice* efisiensi, pencatatan hanya dilakukan pada operasi yang **merubah state (Write)** (menambah, mengubah, menghapus).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: audit log middleware and schema" \
  --body "Pembuatan pencatatan riwayat aktivitas pengguna (Audit Trail). Detail di docs/issues/014-backend-auditlog-middleware.md" \
  --label "backend,security,logging"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/014-backend-auditlog-middleware
```

### Step 3: Kerjakan

Ikuti panduan artisan. Kerjakan file migration terlebih dulu, lalu migrate, set model, dan buat middleware beserta logikanya.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat: audit log middleware and schema (#14)"
git push -u origin issue/014-backend-auditlog-middleware
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: audit log middleware and schema (#14)" \
  --body "## Summary
Menambahkan fitur Audit Trail untuk merekam jejak operasi Write di sistem.

## Changes
- Tabel \`audit_logs\` dan \`AuditLog\` model dibuat (tanpa updated_at).
- Class \`AuditLogMiddleware\` diimplementasikan.
- Logika Post-Middleware untuk mengambil status code balasan.
- Algoritma penyensoran atribut password dari JSON payload.

## Verification
- [x] Linter/Syntax check lolos.
- [x] Metode GET tidak terecord untuk menghemat DB.

## Rules Compliance
- [x] Rule 3.5: Implementasi penuh logging untuk semua operasi tulis.

Closes #14" \
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
Pilar keamanan (RBAC/MBAC) sudah dibuat. Saatnya memenuhi *Rule 3.5* (Audit Trail).

## Task

Kerjakan Issue #014 (Backend — AuditLog Middleware).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/014-backend-auditlog-middleware.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat migration dan model `AuditLog` menggunakan artisan. Update schema dengan `user_id` (foreign), metode, url, status, dsb (Hanya pakai `created_at`).
3. Jalankan `php artisan migrate`.
4. Sesuaikan model (disable `UPDATED_AT` constant, set `$fillable`, set array `casts`).
5. Buat dan *copy-paste* logika `AuditLogMiddleware.php` yang menerapkan konsep *Post-Middleware* (mencatat setelah respons Laravel tereksekusi) serta menyensor key `password`.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
