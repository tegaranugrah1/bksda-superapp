# Issue #093 — Backend — CMS Service Provider (Mesin Penghubung Website Publik)

> **Type**: `chore` / `feature`
> **Labels**: `backend`, `architecture`, `module-cms`
> **Priority**: 🔴 Critical (Tanpa Ini, 19 Model dan 16 Tabel Tidak Berguna)
> **Complexity**: 🟢 Simple (Replikasi Pola DeReporting Issue 079)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #092

---

## Branch

```
issue/093-backend-cms-service-provider
```

## Deskripsi

Pola ini sudah sangat kita kuasai! Pada Issue 079, kita mendirikan `DeReportingServiceProvider`. Pada **Issue #093** ini, kita akan mereplikasi persis pola tersebut untuk Modul CMS.

**Perbedaan Kunci dengan DeReporting:**
Modul CMS memiliki **2 jalur rute** yang terpisah secara fundamental:
1. **Rute Publik (`cms/public/`)**: Tanpa Login. Digunakan oleh website untuk menampilkan berita, galeri, profil ke pengunjung umum.
2. **Rute Admin (`cms/admin/`)**: Terkunci Auth. Digunakan oleh pegawai BKSDA untuk mengelola (CRUD) seluruh konten.

Oleh karena itu, *ServiceProvider* CMS harus mendaftarkan **2 file rute** sekaligus, bukan 1 seperti DeReporting.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/CMS/Providers/` dan `backend/app/Modules/CMS/Routes/`.
- [ ] Tersedia `CMSServiceProvider.php` yang mendaftarkan 2 jalur rute dan 1 jalur migrasi.
- [ ] Tersedia fail pancingan `Routes/public.php` (Rute website pengunjung).
- [ ] Tersedia fail pancingan `Routes/admin.php` (Rute admin pengelola konten).
- [ ] Kelas Provider didaftarkan di `bootstrap/providers.php`.

---

## Panduan Implementasi Cerdas

Masuk ke teritori CMS:
```bash
mkdir -p backend/app/Modules/CMS/Providers
mkdir -p backend/app/Modules/CMS/Routes
```

### 1. Pancingan Rute Publik (Website Pengunjung)
**Path:** `backend/app/Modules/CMS/Routes/public.php`

```php
<?php

use Illuminate\Support\Facades\Route;

// Endpoint Website Publik BKSDA
// Prefiks otomatis: /api/cms/public/

Route::get('/ping', function () {
    return response()->json(['message' => 'Website Publik BKSDA menyala!']);
});
```

### 2. Pancingan Rute Admin (Pengelola Konten)
**Path:** `backend/app/Modules/CMS/Routes/admin.php`

```php
<?php

use Illuminate\Support\Facades\Route;

// Endpoint Admin CMS BKSDA
// Prefiks otomatis: /api/cms/admin/
// Middleware: auth:sanctum + module.access:cms

Route::get('/ping', function () {
    return response()->json(['message' => 'Panel Admin CMS BKSDA menyala!']);
});
```

### 3. Surat Pengantar Utama (The Service Provider)
**Path:** `backend/app/Modules/CMS/Providers/CMSServiceProvider.php`

```php
<?php

namespace App\Modules\CMS\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class CMSServiceProvider extends ServiceProvider
{
    /**
     * Dijalankan pada saat mesin Laravel mulai melakukan pemanasan (Booting).
     */
    public function boot(): void
    {
        // 1. Mendaftarkan lokasi pabrik Database (Migrations) Modul CMS
        $this->loadMigrationsFrom(__DIR__ . '/../Migrations');

        // 2. JALUR PUBLIK: Website Pengunjung (Tanpa Auth)
        //    Prefiks: /api/cms/public/
        Route::prefix('api/cms/public')
            ->middleware('api')
            ->group(__DIR__ . '/../Routes/public.php');

        // 3. JALUR ADMIN: Panel Pengelola Konten (Terkunci)
        //    Prefiks: /api/cms/admin/
        Route::prefix('api/cms/admin')
            ->middleware(['api', 'auth:sanctum', 'module.access:cms'])
            ->group(__DIR__ . '/../Routes/admin.php');
    }

    /**
     * Dijalankan untuk menyuntikkan dependensi ekstra (Registering).
     */
    public function register(): void
    {
        // Kosongkan untuk saat ini.
    }
}
```

### 4. Daftarkan ke Jantung Aplikasi
**Buka:** `backend/bootstrap/providers.php`

Tambahkan baris baru di deretan paling bawah:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Modules\Auth\Providers\AuthServiceProvider::class,
    App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider::class,
    App\Modules\SuratTugas\Providers\SuratTugasServiceProvider::class,
    App\Modules\Inventory\Providers\InventoryServiceProvider::class,
    App\Modules\Bmn\Providers\BmnServiceProvider::class,
    App\Modules\DeReporting\Providers\DeReportingServiceProvider::class,

    // [NEW] Aktifkan Modul CMS
    App\Modules\CMS\Providers\CMSServiceProvider::class,
];
```

---

## Troubleshooting

### Q: Rute `/api/cms/admin/ping` mengembalikan Error 401 Unauthorized!

**Artinya:** Sistem bekerja dengan SEMPURNA! 🎉
**Solusi:** Itu bukan error. Jalur Admin CMS telah kita bekali `auth:sanctum`. Kamu harus menyertakan *Bearer Token* di Header Postman untuk bisa menembus dinding pertahanannya. Rute `/api/cms/public/ping` yang TIDAK memiliki penjaga itulah yang bisa diakses bebas.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(cms): register dual-path service provider for public website and admin panel routing" \
  --body "Menyambungkan Modul CMS ke jantung Laravel. Mendaftarkan 2 jalur rute terpisah: Publik (\`cms/public/\`) dan Admin (\`cms/admin/\`) dengan middleware berlapis. Detail di docs/issues/093-backend-cms-service-provider.md" \
  --label "backend,architecture,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/093-backend-cms-service-provider
```

### Step 3: Kerjakan

Ciptakan 3 file baru (2 pancingan rute + 1 ServiceProvider). Lalu injeksikan ke `bootstrap/providers.php`. Terakhir, jalankan `php artisan optimize:clear` untuk membersihkan cache.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "chore(cms): register dual-path service provider for public website and admin panel routing (#93)"
git push -u origin issue/093-backend-cms-service-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(cms): register dual-path service provider for public website and admin panel routing (#93)" \
  --body "## Summary
Pembangkitan Jembatan Penghubung CMS ke Mesin Pusat Laravel 12.

## Changes
- Penciptaan \`CMSServiceProvider\` yang mendaftarkan 2 jalur rute: Publik (Tanpa Auth) dan Admin (Terkunci \`auth:sanctum\` + \`module.access:cms\`).
- Pembuatan file pancingan \`public.php\` dan \`admin.php\` di folder \`Routes/\`.
- Injeksi permanen ke \`bootstrap/providers.php\`.

## Rules Compliance
- [x] Lolos Doktrin Penyekatan Modular (Rule 8.3): CMS terisolasi di prefiks \`/api/cms/\` dengan pembelahan Internal Publik vs Admin.
- [x] Lolos Doktrin Keamanan (Rule 1.1): Jalur Admin dikunci \`auth:sanctum\` langsung di tingkat *ServiceProvider*, bukan di dalam *Controller*.

Closes #93" \
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
Modul CMS berbeda dari modul lain karena memiliki 2 jalur rute: Publik (website pengunjung) dan Admin (pengelola konten). ServiceProvider harus mendaftarkan keduanya.

## Task

Kerjakan Issue #093 (Backend — CMS Service Provider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/093-backend-cms-service-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `backend/app/Modules/CMS/Providers/` dan `backend/app/Modules/CMS/Routes/`.
3. Pahat 2 file pancingan rute: `public.php` dan `admin.php`.
4. Pahat `CMSServiceProvider.php` yang mendaftarkan KEDUA jalur rute tersebut.
5. KRUSIAL: Injeksikan `CMSServiceProvider::class` ke `bootstrap/providers.php`!
6. Jalankan `php artisan optimize:clear` lalu uji `php artisan route:list --path=cms`.
7. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
