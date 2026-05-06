# Issue #079 — Backend — DeReporting Service Provider (Pembangkit Mesin Modul)

> **Type**: `chore` / `feature`
> **Labels**: `backend`, `architecture`, `module-dereporting`
> **Priority**: 🔴 Critical (Sistem Saraf Penghubung Modul ke Jantung Aplikasi)
> **Complexity**: 🟢 Simple (Hanya 2 File, namun fatal jika terlewat)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #078

---

## Branch

```
issue/079-backend-dereporting-service-provider
```

## Deskripsi

Selamat datang di tahap penyambungan kabel utama! 🔌

Saat ini kita telah memiliki rancangan Database (*Migrations*) dan Jaringan Otak (*Models*) di dalam folder rahasia: `backend/app/Modules/DeReporting`. Sayangnya, sistem inti Laravel benar-benar **buta** dan tidak mengetahui keberadaan folder ini. Jika kamu menjalankan rute atau memanggil tabelnya saat ini, Laravel akan menghasilkan *Error 404/500*.

Pada **Issue #079** ini, kita akan membuat "Surat Pengantar Resmi" atau **Service Provider**. Tugas *Service Provider* ini ada dua:
1. **Memuat Rute (*Route Loading*)**: Mendaftarkan bahwa semua Endpoint *(API)* yang keluar dari modul ini akan memiliki prefiks awalan sakral: `/api/dereporting/`.
2. **Memuat Migrasi (*Migration Hook*)**: Memberitahu sistem `artisan` di mana letak persis folder *Database* Modul DeReporting, sehingga saat kamu menjalankan `php artisan migrate`, ia akan tereksekusi tanpa rute paksaan.

Setelah surat tersebut dibuat, kita akan menyerahkannya ke dalam fail pusat `bootstrap/providers.php` agar mesin raksasa Laravel mengenalinya seumur hidup.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/DeReporting/Providers/` dan `backend/app/Modules/DeReporting/Routes/`.
- [ ] Terdapat berkas `DeReportingServiceProvider.php` yang secara resmi mendaftarkan prefiks `api/dereporting`.
- [ ] Terdapat fail pancingan `Routes/api.php` (meski masih kosong) agar sistem rute tidak *crash*.
- [ ] Kelas Provider tersebut resmi didaftarkan di dalam `bootstrap/providers.php`.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Pembangkitan:
```bash
mkdir -p backend/app/Modules/DeReporting/Providers
mkdir -p backend/app/Modules/DeReporting/Routes
```

### 1. Buat Pancingan Rute Kosong
**Path:** `backend/app/Modules/DeReporting/Routes/api.php`

Agar peladen *(server)* tidak meledak saat mencari *file*, buatlah *file* rute kosong dengan pesan pembuka:
```php
<?php

use Illuminate\Support\Facades\Route;

// Endpoint Modul Laporan Eksternal & Internal BKSDA
// Semua rute di bawah ini akan otomatis memiliki prefiks: /api/dereporting/

Route::get('/ping', function () {
    return response()->json(['message' => 'Modul DeReporting BKSDA menyala!']);
});
```

### 2. Pahat Surat Pengantar Utama (The Service Provider)
**Path:** `backend/app/Modules/DeReporting/Providers/DeReportingServiceProvider.php`

Pahat secara sempurna instruksi perakitan di bawah ini:

```php
<?php

namespace App\Modules\DeReporting\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class DeReportingServiceProvider extends ServiceProvider
{
    /**
     * Dijalankan pada saat mesin Laravel mulai melakukan pemanasan (Booting).
     */
    public function boot(): void
    {
        // 1. Mendaftarkan lokasi pabrik Database (Migrations) Modul DeReporting
        $this->loadMigrationsFrom(__DIR__ . '/../Migrations');

        // 2. Mendaftarkan Pintu Gerbang (Routes) khusus Modul ini
        Route::prefix('api/dereporting')
            ->middleware('api')
            ->group(__DIR__ . '/../Routes/api.php');
    }

    /**
     * Dijalankan untuk menyuntikkan dependensi ekstra (Registering).
     */
    public function register(): void
    {
        // Kosongkan untuk saat ini. Kita tidak menggunakan pola Repository/Bind yang rumit.
    }
}
```

### 3. Daftarkan Surat Tersebut ke Jantung Aplikasi (Laravel 11/12)
**Buka:** `backend/bootstrap/providers.php`

Gulir ke paling bawah, dan tambahkan namamu *(DeReportingServiceProvider)* ke dalam deretan modul-modul BKSDA yang telah eksis:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Modules\Auth\Providers\AuthServiceProvider::class,
    App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider::class,
    App\Modules\SuratTugas\Providers\SuratTugasServiceProvider::class,
    App\Modules\Inventory\Providers\InventoryServiceProvider::class,
    App\Modules\Bmn\Providers\BmnServiceProvider::class,
    
    // [NEW] Aktifkan Modul DeReporting
    App\Modules\DeReporting\Providers\DeReportingServiceProvider::class,
];
```

---

## Troubleshooting

### Q: Mengapa rute `/api/dereporting/ping` mengembalikan Error 404?

**Artinya:** Cache rute di mesin mu tersangkut!
**Solusi:** Jalankan terminal pembersih: `php artisan optimize:clear` atau `php artisan route:clear`. Setelah itu, cobalah akses kembali menggunakan Postman atau penjelajah web, sistem akan merespon dengan riang!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(dereporting): register module service provider and route prefix boundaries" \
  --body "Mendaftarkan Modul DeReporting ke dalam jantung arsitektur monorepo Laravel. Melakukan pengaitan (binding) terhadap *Routes* (\`api/dereporting/*\`) dan melegalkan titik muat *(loading path)* *Migrations*. Detail di docs/issues/079-backend-dereporting-service-provider.md" \
  --label "backend,architecture,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/079-backend-dereporting-service-provider
```

### Step 3: Kerjakan

Terapkan penciptaan 3 langkah di atas. Kuncinya ada di Step 3 (`bootstrap/providers.php`). Sehebat apapun modulmu, ia hanya akan menjadi file mati jika namamu tidak tertulis di dokumen Jantung Aplikasi.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "chore(dereporting): register module service provider and route prefix boundaries (#79)"
git push -u origin issue/079-backend-dereporting-service-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(dereporting): register module service provider and route prefix boundaries (#79)" \
  --body "## Summary
Pembangkitan sistem operasi untuk Modul DeReporting. Menghubungkan urat nadi modul terisolasi ke dalam kerangka pusat Laravel 12.

## Changes
- Pembuatan dan perekaman rute bohongan *(Dummy API)* \`/api/dereporting/ping\` sebagai umpan validasi arsitektur.
- Pembuatan \`DeReportingServiceProvider\` untuk mengambil kendali deklarasi lintasan *Migrations* dan orkestrasi pergerakan *Routes*.
- Injeksi permanen kelas modul ke dalam dokumen utama \`bootstrap/providers.php\`.

## Rules Compliance
- [x] Lolos Doktrin Penyekatan Modular (Project Architecture Rule 8.3): Eksekusi pemisahan titik api sempurna. Seluruh jaringan data DeReporting kini dibatasi tembok prefiks API \`dereporting/\`, mencegah bentrok rute berdarah dengan modul CMS atau BMN.

Closes #79" \
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
Jaringan Tabel (*Migrations*) dan Jaringan Otak (*Models*) DeReporting telah disiapkan di Issue sebelumnya. Tapi sistem pusat belum mengenalinya. Kita wajib memutar kunci kontak Modul ini agar mesin Laravel membacanya.

## Task

Kerjakan Issue #079 (Backend — DeReporting Service Provider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/079-backend-dereporting-service-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah baru: `backend/app/Modules/DeReporting/Providers` (Buat direktorinya).
3. Pahat file bohongan `backend/app/Modules/DeReporting/Routes/api.php` agar tidak error.
4. Tulis mantra `DeReportingServiceProvider.php` secara seksama tanpa salah titik koma.
5. Yang paling KRUSIAL: Segera injeksikan rujukan Provider mu ke dalam file pamungkas `backend/bootstrap/providers.php`!
6. Jalankan terminal: `php artisan optimize:clear` untuk melancarkan saluran urat nadi sistem.
7. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
