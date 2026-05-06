# Issue #009 — Backend — Users Migration & Model

> **Type**: `feature`
> **Labels**: `backend`, `database`, `auth`
> **Priority**: 🔴 Critical (fondasi sistem otentikasi)
> **Complexity**: 🟡 Medium (manipulasi migration bawaan Laravel dan Eloquent Model)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #004 (Database & Env Config) harus sudah selesai

---

## Branch

```
issue/009-backend-users-migration
```

## Deskripsi

Mengubah tabel `users` bawaan Laravel agar sesuai dengan aturan arsitektur BKSDA SuperApp (Phase 1: IAM). Sistem tidak hanya login pakai email, tapi juga membutuhkan identitas peran (Role-Based Access Control) dan hak akses modul (Module-Based Access Control).

**Apa yang dilakukan:**
1. Modifikasi file migration bawaan Laravel (`0001_01_01_000000_create_users_table.php`) dengan menambahkan kolom spesifik seperti `username`, `role`, dan `access_modules`.
2. Update Model `User.php` dengan penerapan strict security (Rule 1.3: dilarang pakai `$guarded`, wajib `$fillable`) serta implementasi *SoftDeletes*.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak membuat controller login/register di issue ini (itu Issue #011).
- ❌ Tidak mengatur Sanctum tokens di issue ini (itu Issue #010).

---

## Acceptance Criteria

- [ ] Migration `create_users_table` sudah diubah dan menambahkan kolom `username` (unique), `role` (enum/string), `access_modules` (json), `is_active` (boolean), dan `deleted_at` (soft deletes).
- [ ] `php artisan migrate:fresh` berjalan tanpa error.
- [ ] Model `app/Models/User.php` menggunakan trait `SoftDeletes`.
- [ ] Model `User` mendefinisikan `$fillable` secara eksplisit (tidak ada `$guarded`).
- [ ] Model `User` melakukan casting pada `access_modules` sebagai `array` dan `password` sebagai `hashed` (Rule 1.5).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Jangan asal timpa file jika nama filenya sedikit berbeda.

### Langkah 1: Modifikasi Migration `users`

**Kenapa?** Laravel sudah punya tabel users default. Ketimbang membuat migration baru berisi `ALTER TABLE`, praktiknya lebih bersih jika kita memodifikasi file bawaannya sebelum project memiliki data *production*.

**Path:** `e:\bksda-superapp\backend\database\migrations\0001_01_01_000000_create_users_table.php`

**Buka file tersebut dan ubah pada bagian `Schema::create('users', ...)`:**

```php
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Menambahkan username (biasanya diisi NIP untuk BKSDA) - Rule 6.1
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            
            // Kolom otorisasi (RBAC & MBAC) - Rule 2.1 & 2.3
            $table->string('role')->default('user')->comment('super_admin, admin, user');
            $table->json('access_modules')->nullable()->comment('Daftar modul yang bisa diakses');
            
            // Kolom status
            $table->boolean('is_active')->default(true);
            
            $table->rememberToken();
            $table->timestamps();
            
            // Menambahkan soft deletes (Rule 3.6)
            $table->softDeletes();
        });
```

*(Catatan: Jangan ubah schema tabel `password_reset_tokens` dan `sessions` yang ada di bawah file tersebut, biarkan saja bawaan Laravel).*

**Apa yang terjadi:**
- Kolom baru akan ditambahkan. Data `access_modules` dibuat dengan tipe data JSON agar fleksibel menyimpan *array* modul (misal: `["kepegawaian", "inventory"]`).

---

### Langkah 2: Jalankan Migrate Fresh

**Kenapa?** Karena kita mengedit file migration yang mungkin sudah pernah dijalankan pada Issue #004, kita harus mengulang ulang (*fresh*) database.

```bash
cd e:\bksda-superapp\backend

# Hapus semua tabel dan jalankan ulang migration dari awal
php artisan migrate:fresh
```

**Verifikasi Command Line:**
```bash
php artisan db:table users
```
Pastikan pada outputnya, kolom `username`, `role`, dan `access_modules` sudah muncul.

---

### Langkah 3: Update Model `User.php`

**Kenapa?** Eloquent Model adalah "jembatan" antara kode PHP dan tabel database. Agar aman dari celah *Mass Assignment*, kita harus membatasi field apa saja yang boleh diisi user lewat `$fillable`. Selain itu, kita perlu memberitahu Laravel bahwa field `access_modules` adalah sebuah Array (walaupun di DB berbentuk JSON), sehingga Laravel yang melakukan otomatis *encode/decode*.

**Path:** `e:\bksda-superapp\backend\app\Models\User.php`

**Ganti isinya menjadi:**

```php
<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     * Sesuai Rule 1.3: Dilarang menggunakan $guarded = []
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'access_modules',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * Sesuai Rule 5.5: Jangan return data sensitif ke response API.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     * Rule 1.5: Password wajib di-hash otomatis
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'access_modules' => 'array', // Mengubah JSON DB menjadi Array PHP
            'is_active' => 'boolean',
        ];
    }
}
```

---

## Troubleshooting

### Q: `php artisan migrate:fresh` error `Connection refused`

**Artinya:** Docker PostgreSQL di komputermu belum menyala.
**Solusi:** Buka terminal di root project, jalankan `docker compose up -d`.

### Q: `SQLSTATE[42P07]: relation "users" already exists` pada saat migrate biasa

**Artinya:** Kamu menjalankan perintah `php artisan migrate`, padahal tabel users versi lama sudah ada.
**Solusi:** Gunakan perintah `php artisan migrate:fresh` agar Laravel menghapus tabel lama terlebih dahulu (Hanya boleh dilakukan di lokal/tahap awal development).

### Q: Linter / IDE memberikan error pada `protected function casts(): array`

**Artinya:** Mungkin IDE-mu belum mengenali syntax casting baru dari Laravel 11/12.
**Solusi:** Kode ini aman dan valid di Laravel 12. Abaikan peringatan tersebut, atau pastikan project terbuka dengan konfigurasi PHP 8.3+.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: users migration and model setup" \
  --body "Setup schema database users dan eloquent model strict (RBAC/MBAC). Detail di docs/issues/009-backend-users-migration.md" \
  --label "backend,database,auth"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/009-backend-users-migration
```

### Step 3: Kerjakan

Lakukan modifikasi migration file bawaan Laravel dan update model `User.php`. Pastikan `php artisan migrate:fresh` berhasil dijalankan.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/database/migrations/
git add backend/app/Models/User.php
git commit -m "feat: users migration and model setup (#9)"
git push -u origin issue/009-backend-users-migration
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: users migration and model setup (#9)" \
  --body "## Summary
Menyempurnakan fondasi User Identity dengan penambahan role & module access sesuai standar aplikasi internal.

## Changes
- Modifikasi \`create_users_table\` (tambah username, role, access_modules, is_active).
- Implementasi SoftDeletes pada model \`User\`.
- Penerapan strict \`$fillable\` property.
- Array & hashed property casting setup.

## Verification
- [x] \`php artisan migrate:fresh\` berjalan sukses
- [x] Struktur database sesuai kebutuhan RBAC

## Rules Compliance
- [x] Rule 1.3: Tidak menggunakan \`$guarded\`
- [x] Rule 1.5: Password di-cast sebagai hashed
- [x] Rule 2.1 & 2.3: Persiapan field otorisasi
- [x] Rule 3.6: Soft deletes diterapkan

Closes #9" \
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
Issue Phase 0 sudah dikerjakan. Kita masuk ke Phase 1: Auth & IAM.

## Task

Kerjakan Issue #009 (Backend — Users Migration & Model).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/009-backend-users-migration.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Modifikasi file migration default `database/migrations/0001_01_01_000000_create_users_table.php` dan tambahkan field baru seperti di dokumen spesifikasi.
3. Jalankan `php artisan migrate:fresh`.
4. Update file `app/Models/User.php` dengan `$fillable`, *SoftDeletes*, dan type `casts()` array/hashed.
5. Verifikasi *database table* sudah terbentuk dengan benar.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
