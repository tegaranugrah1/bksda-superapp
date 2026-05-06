# Issue #024 — Backend — KepegawaianServiceProvider

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `kepegawaian`
> **Priority**: 🔴 Critical (Menghubungkan sistem utama dengan modul mandiri)
> **Complexity**: 🟡 Medium (Konfigurasi Service Provider Laravel)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #023

---

## Branch

```
issue/024-backend-kepegawaian-service-provider
```

## Deskripsi

Sesuai dengan **Rule 8.3**, rute (URL Endpoint) untuk modul ini tidak boleh digabung ke dalam file `routes/api.php` bawaan Laravel. Jika dipaksakan digabung, seiring bertambahnya fitur, file tersebut akan sangat panjang dan rawan "conflict" saat *merge* kodingan antar programmer.

Kita wajib mendaftarkan rute lewat sebuah **Service Provider** mandiri bernama `KepegawaianServiceProvider`. Class ini bertugas sebagai "Duta Besar" yang memberitahu Laravel bahwa ada modul baru di aplikasi ini. Sang Duta Besar akan mendaftarkan file rute khusus yang secara otomatis memiliki imbuhan URL (*prefix*) `/api/kepegawaian/`.

**Apa yang dilakukan:**
1. Membuat file `api.php` kosong di folder `Routes/` khusus untuk modul ini.
2. Membuat class `KepegawaianServiceProvider.php`.
3. Mengonfigurasi fungsi `boot()` untuk menyuntikkan *prefix* secara otomatis.
4. Mendaftarkan *Service Provider* tersebut ke file `bootstrap/providers.php` agar Laravel membacanya saat *server startup*.

---

## Acceptance Criteria

- [ ] Folder `app/Modules/Kepegawaian/Routes` dan `Providers` terbentuk.
- [ ] Terdapat file kosong `Routes/api.php`.
- [ ] File `KepegawaianServiceProvider.php` mengimplementasikan fungsi registrasi rute dengan prefix `api/kepegawaian`.
- [ ] *Provider* ini telah di-*inject* ke dalam baris `bootstrap/providers.php`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Langkah-langkah ini membutuhkan ketelitian lokasi folder. Ikuti path dengan sangat hati-hati.

### Langkah 1: Siapkan Struktur Folder & File Rute Modul

**Kenapa?** Kita membangun isolasi. Rute pegawai hanya hidup di folder modul pegawai.

```bash
cd e:\bksda-superapp\backend

mkdir -p app/Modules/Kepegawaian/Routes
mkdir -p app/Modules/Kepegawaian/Providers
```

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Routes\api.php`

**Buat file rute tersebut, dan isi dengan kode (jangan diisi endpoint dulu):**

```php
<?php

use Illuminate\Support\Facades\Route;

// Di sinilah endpoint-endpoint modul kepegawaian akan hidup (Dikerjakan di Issue #027)
// Ingat: Semua route di dalam file ini OTOMATIS memiliki prefix /api/kepegawaian/

// Contoh (Hanya testing, boleh dihapus nanti):
// Route::get('/ping', function() { return 'pong kepegawaian'; });
```

---

### Langkah 2: Buat Service Provider (Duta Besar)

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Providers\KepegawaianServiceProvider.php`

**Buat file baru tersebut, dan masukkan kode di bawah ini:**

```php
<?php

namespace App\Modules\Kepegawaian\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class KepegawaianServiceProvider extends ServiceProvider
{
    /**
     * Dijalankan untuk meregistrasi bindings di memori (IOC container).
     */
    public function register(): void
    {
        // 
    }

    /**
     * Dijalankan terakhir, untuk menghubungkan modul (seperti route, views, migration).
     */
    public function boot(): void
    {
        $this->registerRoutes();
    }

    /**
     * Daftarkan routing API khusus modul ini (Sesuai Rule 8.3).
     * Semua endpoint di modul ini tak perlu ditulis prefix-nya lagi, sudah diurus otomatis.
     */
    protected function registerRoutes(): void
    {
        $routePath = base_path('app/Modules/Kepegawaian/Routes/api.php');

        if (file_exists($routePath)) {
            Route::prefix('api/kepegawaian')
                ->middleware('api') // Membawa serta perlindungan dasar API seperti JSON & log
                ->group($routePath);
        }
    }
}
```

---

### Langkah 3: Daftarkan ke Kernel Laravel Modern

**Kenapa?** Laravel tidak tahu keberadaan file `KepegawaianServiceProvider` di atas sampai kita memberitahunya. Di Laravel 11/12, hal ini tidak lagi dikerjakan di `config/app.php`, melainkan di dalam *bootstrap*.

**Path:** `e:\bksda-superapp\backend\bootstrap\providers.php`

**Buka file tersebut dan tambahkan kelas provider kita di array-nya (jangan lupa koma di belakang):**

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    // [TAMBAHKAN BARIS DI BAWAH INI]
    App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider::class,
];
```

**Jalankan perintah ini di terminal Backend untuk memindai ulang struktur:**
```bash
composer dump-autoload
php artisan route:clear
```

---

## Troubleshooting

### Q: Muncul `Target class [App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider] does not exist.`

**Artinya:** Laravel gagal menemukan file PHP tersebut saat membaca `bootstrap/providers.php`.
**Solusi:** 
1. Cek baris penulisan *namespace* di file `KepegawaianServiceProvider.php`. Apakah sudah sama persis?
2. Apakah huruf "P"-nya besar di folder `Providers`? Windows kadang mengabaikan huruf besar/kecil, tapi autoloader PHP sangat sensitif.
3. Jalankan `composer dump-autoload`.

### Q: Kalau saya buat API `Route::get('/karyawan')` di file `Routes/api.php`, apakah URL aslinya jadi `/api/karyawan`?

**Artinya:** Kamu belum sepenuhnya memahami *Prefix* otomatis ini.
**Solusi:** Salah. URL aslinya di peramban (browser) akan menjadi `http://localhost:8000/api/kepegawaian/karyawan`. Sistem *ServiceProvider* kita sudah mem-*prefix* (memberi awalan) secara gaib agar file kodenya tetap pendek dan bersih.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): module service provider registration" \
  --body "Pembuatan class Service Provider dan file routes/api.php untuk modul Kepegawaian (Prefix Isolation). Detail di docs/issues/024-backend-kepegawaian-service-provider.md" \
  --label "backend,architecture,kepegawaian"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/024-backend-kepegawaian-service-provider
```

### Step 3: Kerjakan

Buat dua folder baru (`Providers` dan `Routes`). Buat masing-masing isinya, lalu edit file *bootstrapper* Laravel di `bootstrap/providers.php`. Akhiri dengan perintah `composer dump-autoload`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(kepegawaian): module service provider registration (#24)"
git push -u origin issue/024-backend-kepegawaian-service-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): module service provider registration (#24)" \
  --body "## Summary
Membangun *"Duta Besar"* (Service Provider) agar modul Kepegawaian terisolasi rutenya dari sistem utama (Micro-Monolith).

## Changes
- File kosong \`Routes/api.php\` sebagai kanvas endpoint.
- Class \`KepegawaianServiceProvider\` dengan integrasi \`Route::prefix\`.
- Injeksi \`class\` ke file sistem \`bootstrap/providers.php\`.

## Verification
- [x] Lolos Composer Autoload.
- [x] Tidak ada *Fatality Error* saat Laravel di *booting*.

## Rules Compliance
- [x] Rule 8.2: Modul kini memiliki Service Provider sendiri.
- [x] Rule 8.3: Prefix \`api/kepegawaian\` diregistrasikan tanpa mencemari root api.php.

Closes #24" \
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
Struktur OOP model sudah ada, kini kita butuh pendaftaran ke inti mesin Laravel agar modul kita diakui keberadaannya.

## Task

Kerjakan Issue #024 (Backend — KepegawaianServiceProvider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/024-backend-kepegawaian-service-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `backend/app/Modules/Kepegawaian/Routes` & `Providers`.
3. Buat file `api.php` kosong di `Routes`.
4. Buat file `KepegawaianServiceProvider.php` di `Providers` dan salin fungsi registrasi `Route::prefix()`.
5. Sisipkan lokasi *class* tersebut ke dalam *array* pada file `backend/bootstrap/providers.php`.
6. Lakukan `composer dump-autoload` untuk mencegah *crash*.
7. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
