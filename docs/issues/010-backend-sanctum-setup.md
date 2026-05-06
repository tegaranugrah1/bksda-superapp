# Issue #010 — Backend — Laravel Sanctum Setup

> **Type**: `feature`
> **Labels**: `backend`, `auth`, `security`
> **Priority**: 🔴 Critical (dibutuhkan oleh semua endpoint yang private)
> **Complexity**: 🟢 Simple (install package, migrate, update 1 baris kode)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #009 (Users Migration & Model) harus sudah selesai

---

## Branch

```
issue/010-backend-sanctum-setup
```

## Deskripsi

Sesuai **Rule 1.1** dan **Rule 1.6**, semua endpoint API (kecuali yang publik) wajib dilindungi oleh otentikasi menggunakan token **Laravel Sanctum**. Issue ini berfokus murni pada proses instalasi dan konfigurasi dasar Sanctum di Laravel 12.

**Apa yang dilakukan:**
1. Menjalankan perintah bawaan Laravel untuk menginstal sistem API dan Sanctum.
2. Melakukan migrasi database untuk membuat tabel `personal_access_tokens`.
3. Menambahkan *trait* `HasApiTokens` ke dalam model `User`.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak membuat fitur login/logout (itu akan dilakukan di Issue #011).
- ❌ Tidak membuat middleware role (itu di Issue #013).

---

## Acceptance Criteria

- [ ] Command `php artisan install:api` berhasil dijalankan.
- [ ] Tabel `personal_access_tokens` sudah ada di database PostgreSQL.
- [ ] Model `User` (`app/Models/User.php`) sudah meng-import dan menggunakan trait `HasApiTokens`.
- [ ] Tidak ada error saat menjalankan `php artisan optimize` atau `php artisan serve`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti perintah ini di terminal. Pastikan Docker database sedang menyala (`docker compose up -d`).

### Langkah 1: Instalasi Sistem API & Sanctum

**Kenapa?** Pada Laravel 11 dan 12, fitur API dan Sanctum tidak di-install secara *default* saat project baru dibuat. Kita harus menyuruh Laravel untuk mengaktifkannya. Perintah ini akan mem-publish file migration untuk token dan melakukan konfigurasi dasar secara otomatis.

```bash
cd e:\bksda-superapp\backend

# Jalankan installer API bawaan Laravel
php artisan install:api
```

**Apa yang terjadi:**
- Laravel akan mengunduh package `laravel/sanctum` (jika belum ada).
- Laravel akan membuat file migration baru di folder `database/migrations/` (berakhiran `_create_personal_access_tokens_table.php`).
- Jika terminal bertanya *"Would you like to run the migrations now?"*, kamu bisa ketik **yes** atau **y**.

---

### Langkah 2: Jalankan Migrasi Token

**Kenapa?** Sanctum butuh tabel khusus di database bernama `personal_access_tokens` untuk menyimpan riwayat token siapa saja yang sedang aktif login, kapan dibuat, dan kapan kedaluwarsa.

*(Jika di Langkah 1 kamu sudah memilih "yes" saat ditanya run migrations, lewati langkah ini. Jika belum/terlewat, jalankan perintah di bawah).*

```bash
php artisan migrate
```

**Verifikasi:**
```bash
php artisan db:table personal_access_tokens
```
*(Pastikan outputnya menampilkan struktur tabel dengan kolom seperti `tokenable_type`, `name`, `token`, `abilities`, dll).*

---

### Langkah 3: Tambahkan `HasApiTokens` ke Model User

**Kenapa?** Eloquent Model `User` secara *default* belum mengerti cara membuat atau menghapus token Sanctum. Kita harus "mewariskan" kemampuan tersebut dengan menambahkan sebuah Trait bernama `HasApiTokens`.

**Path:** `e:\bksda-superapp\backend\app\Models\User.php`

**Buka file tersebut, cari dan ubah bagian awal class:**

```php
<?php

namespace App\Models;

// Tambahkan import HasApiTokens di bagian atas
use Laravel\Sanctum\HasApiTokens;

// ... import lainnya biarkan saja ...
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    // Tambahkan HasApiTokens ke dalam blok use di dalam class
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    // ... sisanya (fillable, hidden, casts) biarkan SAMA PERSIS seperti Issue #009 ...
```

**Apa yang terjadi:**
- Sekarang model User memiliki fungsi-fungsi ajaib dari Sanctum, contohnya: `$user->createToken('nama-perangkat')->plainTextToken`. (Fungsi ini akan dipakai di Issue #011 saat kita membuat fungsi Login).

---

## Troubleshooting

### Q: `php artisan install:api` error `Command "install:api" is not defined`

**Artinya:** Versi Laravel kamu mungkin bermasalah, atau perintah ini tidak tersedia.
**Solusi:** Pastikan kamu menggunakan Laravel 11/12 (`php artisan --version`). Jika karena suatu alasan tidak bisa, gunakan cara lama:
`composer require laravel/sanctum`
lalu
`php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`

### Q: `php artisan migrate` gagal dengan error `Base table or view already exists`

**Artinya:** Tabel `personal_access_tokens` sudah dibuat oleh proses sebelumnya.
**Solusi:** Kamu tidak perlu khawatir. Ini tandanya migrasi sudah berhasil. Abaikan saja error tersebut dan lanjut ke langkah 3.

### Q: Muncul garis merah di editor pada tulisan `use HasApiTokens`

**Artinya:** IDE (seperti VS Code) belum mendeteksi class tersebut.
**Solusi:** Pastikan ejaannya benar (H, A, T besar). Jalankan `composer dump-autoload` atau tutup dan buka kembali IDE-mu.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "build: setup laravel sanctum for api auth" \
  --body "Instalasi dan konfigurasi dasar Laravel Sanctum untuk persiapan fitur login API. Detail di docs/issues/010-backend-sanctum-setup.md" \
  --label "backend,auth,security"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/010-backend-sanctum-setup
```

### Step 3: Kerjakan

Jalankan instruksi `install:api`, jalankan migrasi, dan tambahkan trait `HasApiTokens` di model `User`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/database/migrations/
git add backend/app/Models/User.php

# File composer mungkin berubah karena penambahan package Sanctum
git add backend/composer.json backend/composer.lock 

git commit -m "build: setup laravel sanctum for api auth (#10)"
git push -u origin issue/010-backend-sanctum-setup
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "build: setup laravel sanctum for api auth (#10)" \
  --body "## Summary
Menyiapkan pondasi autentikasi API menggunakan Laravel Sanctum.

## Changes
- Menjalankan \`php artisan install:api\`.
- Membuat tabel \`personal_access_tokens\`.
- Menambahkan trait \`HasApiTokens\` pada model \`User\`.

## Verification
- [x] Instalasi paket berhasil.
- [x] Tabel token terbentuk di database.
- [x] Kode Model \`User\` lolos linter/tanpa error.

## Rules Compliance
- [x] Rule 1.6: Token Sanctum disiapkan untuk melindungi semua modul aplikasi.

Closes #10" \
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
Issue #009 (Model User) sudah selesai. Kita akan mengamankan aplikasi menggunakan Sanctum.

## Task

Kerjakan Issue #010 (Backend — Laravel Sanctum Setup).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/010-backend-sanctum-setup.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Masuk ke folder `backend/` dan jalankan `php artisan install:api`. Jawab 'yes' jika ditanya mengenai migrate.
3. Update file `app/Models/User.php`. Tambahkan namespace `use Laravel\Sanctum\HasApiTokens;` di bagian atas, lalu tambahkan `HasApiTokens` di dalam blok `use` pada class User. JANGAN HAPUS KODE YANG ADA DARI ISSUE #009.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
