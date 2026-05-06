# Issue #062 — Backend — BmnServiceProvider (Akta Kelahiran Modul)

> **Type**: `chore` / `architecture`
> **Labels**: `backend`, `architecture`, `module-bmn`
> **Priority**: 🔴 Critical (Pintu Masuk Mutlak Menuju Jantung Laravel)
> **Complexity**: 🟢 Simple (Pendaftaran Kelas Penyedia Layanan)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #060, Issue #061

---

## Branch

```
issue/062-backend-bmn-provider
```

## Deskripsi

Sehebat apapun kita membangun Skema Tabel (Issue 060) dan Model Database (Issue 061) pada Modul BMN (Barang Milik Negara), Sistem Utama Laravel sama sekali tidak akan mengakuinya jika tidak didaftarkan secara resmi!

Dalam arsitektur Monorepo/Modular yang kita buat, setiap Modul bertindak layaknya "Aplikasi Kecil" (Mini-App) mandiri yang memiliki surat izinnya sendiri. Surat Izin ini disebut dengan **ServiceProvider**.

Pada **Issue #062** ini, kita akan membangun Pintu Induk: `BmnServiceProvider.php`.

Provider ini memiliki dua tugas super penting:
1. Memberitahu Laravel untuk membaca folder Migrasi khusus milik BMN (Bukan di folder `database/migrations` biasa).
2. Membentuk grup perlindungan Route (URL) raksasa yang mewajibkan seluruh pengaksesnya memiliki tiket `auth:sanctum` (Wajib Login) sekaligus tiket Spesial BMN `module.access:bmn`.

---

## Acceptance Criteria

- [ ] File Penyedia Layanan `backend/app/Modules/Bmn/BmnServiceProvider.php` diciptakan dengan sempurna.
- [ ] Tersedia penangkis *Crash* berupa file sementara `backend/app/Modules/Bmn/Routes/api.php` agar sistem tidak meledak saat mencari rute.
- [ ] Provider BMN telah disuntikkan secara sah ke dalam pendaftaran sentral Laravel 12 pada file `backend/bootstrap/providers.php`.
- [ ] Pengujian (*Ping*) Rute API BMN merespon dengan status hidup *(Alive)*.

---

## Panduan Implementasi Cerdas

Lakukan perakitan 3 langkah krusial di bawah ini secara berurutan.

### 1. Bangun Sang Penyedia (ServiceProvider)
**Path:** `backend/app/Modules/Bmn/BmnServiceProvider.php`

*(Catatan: Buat folder induknya jika kamu belum berada di sana)*

```php
<?php

namespace App\Modules\Bmn;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class BmnServiceProvider extends ServiceProvider
{
    /**
     * Mendaftarkan layanan (bind) ke dalam container Laravel.
     */
    public function register(): void
    {
        // Ruang untuk mendaftarkan BMN Service kelak
    }

    /**
     * Melakukan eksekusi setelah seluruh sistem Laravel selesai memuat (booting).
     */
    public function boot(): void
    {
        // 1. Mendaftarkan alamat Migrasi Khusus Modul BMN
        $this->loadMigrationsFrom(__DIR__ . '/Migrations');

        // 2. Mendaftarkan seluruh jaringan Rute BMN dengan Pelindung Hak Akses Lapis Ganda
        Route::middleware(['api', 'auth:sanctum', 'module.access:bmn'])
             ->prefix('api/bmn')
             ->group(__DIR__ . '/Routes/api.php');
    }
}
```

### 2. Buat Pancingan Rute (Dummy Route)
**Path:** `backend/app/Modules/Bmn/Routes/api.php`

*(Buat folder `Routes` terlebih dahulu. Ini berguna agar baris instruksi `group(__DIR__ . '/Routes/api.php')` pada Provider di atas tidak mengakibatkan Laravel *Crash* karena kebingungan mencari file).*

```php
<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| BMN (Barang Milik Negara) Routes
|--------------------------------------------------------------------------
| Prefix: /api/bmn
| Perlindungan: auth:sanctum, module.access:bmn
|--------------------------------------------------------------------------
*/

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'module' => 'BMN',
        'message' => '🏛️ Sirkuit Keuangan Barang Milik Negara Aktif!',
        'timestamp' => now()
    ]);
});
```

### 3. Pendaftaran Akta Kelahiran ke Pusat Pemerintahan (Laravel 12)
**Path:** `backend/bootstrap/providers.php`

Buka lumbung penyimpanan Provider utama Laravel 12. Tambahkan kelas BMN tepat di bawah kelas Logistik (Inventory) yang pernah kamu buat sebelumnya.

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    // ... provider bawaan lainnya
    
    // Custom Modules
    App\Modules\Kepegawaian\KepegawaianServiceProvider::class,
    App\Modules\SuratTugas\SuratTugasServiceProvider::class,
    App\Modules\Inventory\InventoryServiceProvider::class,
    
    // [TAMBAHKAN BARIS INI!]
    App\Modules\Bmn\BmnServiceProvider::class,
];
```

---

## Troubleshooting

### Q: Saya mendapat peringatan *Class 'App\Modules\Bmn\BmnServiceProvider' not found* setelah menambahkan baris di `providers.php`!

**Artinya:** Otak pengindeks otomatis Laravel (Autoloader) belum menyadari kehadiran file PHP baru yang kamu cetak secara manual.
**Solusi:** Jalankan titah penyegaran memori indeks di terminal (*Backend*):
```bash
composer dump-autoload
```

### Q: Saya mengetes Ping dari *Frontend* tetapi selalu 403 Forbidden!

**Artinya:** Pintu berlapis ganda kamu bekerja tanpa ampun.
**Solusi:** Middleware `module.access:bmn` secara spesifik menggeledah kolom *Database* `access_modules` milik Akun Login kamu. Pastikan akun pengetesan kamu (atau akun Admin) memiliki wewenang Modul BMN dengan memastikan kolom `access_modules` di dalam tabel `users` berisi kata `"bmn"` di dalam JSON Array-nya (misal: `["kepegawaian", "inventory", "bmn"]`).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(bmn): encapsulate module footprint via isolated service provider bootloader" \
  --body "Mencetak akta kelahiran *(Bootloader)* resmi Modul BMN di mata ekosistem Laravel 12. Menyuntikkan penjaga rute lapis baja \`auth:sanctum\` dipadukan dengan gembok matriks \`module.access:bmn\`. Detail di docs/issues/062-backend-bmn-provider.md" \
  --label "backend,architecture,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/062-backend-bmn-provider
```

### Step 3: Kerjakan

Rakarlah secara berhati-hati 3 langkah utama (Pembuatan Kelas, Pembuatan Rute Pancingan, dan Pendaftaran Terpusat) sesuai instruksi di atas. Jangan lupakan pemanggilan pembersih rute `php artisan route:clear` setelah mendaftarkan Provider.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "chore(bmn): encapsulate module footprint via isolated service provider bootloader (#62)"
git push -u origin issue/062-backend-bmn-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(bmn): encapsulate module footprint via isolated service provider bootloader (#62)" \
  --body "## Summary
Penarikan sakelar penyalaan awal *(Ignition)* Modul Barang Milik Negara agar diakui otorisasi ekstistensinya oleh Monolith Laravel.

## Changes
- Penciptaan \`BmnServiceProvider\` memuat deklarasi jalur migrasi terasing \`loadMigrationsFrom()\` dan pembungkusan massal Rute URL \`api/bmn\`.
- Penyematan fungsi sapaan kesehatan dasar (Health Ping) pada berkas rute \`api.php\`.
- Pendaftaran resmi hierarki Modul di \`bootstrap/providers.php\`.

## Rules Compliance
- [x] Sesuai arsitektur Fase 1, pendaftaran menggunakan konvensi Laravel 12 tanpa menyentuh \`config/app.php\` yang kini berstatus usang (*Deprecated*).

Closes #62" \
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
Modul BMN telah diciptakan wujud Fisiknya (Migration & Model). Agar wujud Fisik tersebut dikenali dan bisa melahirkan URL API, kita wajib menancapkan Tiang Listriknya (Service Provider).

## Task

Kerjakan Issue #062 (Backend — BmnServiceProvider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/062-backend-bmn-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Ciptakan 2 berkas utama: `backend/app/Modules/Bmn/BmnServiceProvider.php` dan pancingan sirkuit Rute `backend/app/Modules/Bmn/Routes/api.php`.
3. Ikat Modul yang baru kamu buat ini ke jantung Laravel dengan memanggil Kelas BMN di dasar `backend/bootstrap/providers.php`.
4. Semprot terminal *Backend* dengan air suci `composer dump-autoload`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
