# Issue #048 — Backend — InventoryServiceProvider (Registrasi Ekosistem Logistik)

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-inventory`
> **Priority**: 🔴 Critical (Menghubungkan Jantung Laravel dengan Modul Logistik)
> **Complexity**: 🟢 Simple (Pendaftaran Rute & Folder Migrasi)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #047

---

## Branch

```
issue/048-backend-inventory-provider
```

## Deskripsi

Dalam arsitektur *Monolithic-Modular* yang kita gunakan, kerangka *Framework* Laravel tidak akan pernah mendeteksi keberadaan file-file `Migrations`, `Models`, maupun `Controllers` Modul Logistik / Inventory jika kita tidak memperkenalkannya.

Fungsi utama dari **Issue #048** adalah menciptakan **Buku Akta Kelahiran** untuk Modul Inventory, yang dinamakan `InventoryServiceProvider.php`.

Tugas utama Provider ini ada dua:
1. Memberitahu perintah `php artisan migrate` agar bersedia mengecek folder `backend/app/Modules/Inventory/Migrations` (yang dibuat di Issue 046).
2. Membangun pagar rute otomatis (Route Prefix) dengan alamat pangkal `/api/inventory/` yang dilindungi secara absolut oleh penjaga lapis ganda: `auth:sanctum` (Wajib Login) dan `module.access:inventory` (Wajib Punya Hak Akses Kunci Gudang).

---

## Acceptance Criteria

- [ ] File `InventoryServiceProvider.php` diciptakan sesuai dengan struktur hirarki Modul.
- [ ] Mendaftarkan lintasan rute API dengan sistem prefix `api/inventory` dan dibungkus kuat oleh *Middleware* `module.access:inventory`.
- [ ] File perintis `Routes/api.php` kosong (*Ping Route*) diciptakan agar sistem rute tidak bentrok (*Crash*).
- [ ] Akta `InventoryServiceProvider` ini disuntikkan pendaftarannya secara resmi ke dalam `backend/bootstrap/providers.php`.

---

## Panduan Implementasi Cerdas

### Langkah 1: Membangun Struktur Dasar & Provider

Jalankan perintah pembuatan *Folder* jika kamu belum memilikinya.
```bash
mkdir -p backend/app/Modules/Inventory/Routes
```

**Path:** `backend/app/Modules/Inventory/InventoryServiceProvider.php`

```php
<?php

namespace App\Modules\Inventory;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class InventoryServiceProvider extends ServiceProvider
{
    /**
     * Daftarkan layanan-layanan (Services) apa saja
     * yang diikat ke modul Inventory ini.
     */
    public function boot(): void
    {
        // 1. Deklarasikan Lokasi Folder Cetak Biru (Migrations)
        $this->loadMigrationsFrom(__DIR__ . '/Migrations');

        // 2. Deklarasikan Lokasi Jalur Akses (Routes)
        $this->registerRoutes();
    }

    /**
     * Membangun Prefix Tembok Besar untuk endpoint Inventory.
     * Semua rute otomatis berawalan /api/inventory dan dicegah
     * dari user yang tidak memiliki izin module 'inventory'.
     */
    protected function registerRoutes(): void
    {
        Route::prefix('api/inventory')
            ->middleware(['api', 'auth:sanctum', 'module.access:inventory'])
            ->group(__DIR__ . '/Routes/api.php');
    }
}
```

### Langkah 2: Pemasangan Route Kosong Pancingan

Jika fungsi di atas dipanggil tapi file rutenya tidak ada, Laravel akan mengalami *Crash* (Fatal Error). Oleh karena itu, kita harus memancingnya dengan meletakkan 1 rute bohongan yang berfungsi ganda sebagai *Health Check*.

**Path:** `backend/app/Modules/Inventory/Routes/api.php`

```php
<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Inventory Module Routes
|--------------------------------------------------------------------------
| Prefix: /api/inventory
| Middleware: auth:sanctum, module.access:inventory
|--------------------------------------------------------------------------
*/

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => '🛡️ BKSDA Inventory System is actively running!',
        'timestamp' => now()
    ]);
});
```

### Langkah 3: Menyerahkan Akta ke Jantung Pusat

Tugas terakhir adalah mendaftarkan *Provider* ini secara kenegaraan agar Laravel mengakuinya sejak detik pertama peladen (*Server*) menyala.

Buka file konfigurasi inti penyedia layanan.
**Path:** `backend/bootstrap/providers.php`

Tambahkan di baris paling bawah array yang tersedia:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    
    // ... [Provider modul-modul lain yang sudah ada sebelumnya] ...

    // Mendaftarkan Napas Modul Logistik/Inventory (Fase 4)
    App\Modules\Inventory\InventoryServiceProvider::class,
];
```

---

## Troubleshooting

### Q: Kenapa Rute `/api/inventory/ping` menghasilkan kode 401 Unauthorized?

**Artinya:** Kerja bagus! Sistem berjalan dengan sangat aman.
**Solusi:** Ingat, *Provider* di atas menyuntikkan *Middleware* `auth:sanctum` dan `module.access:inventory`. Maka, rute *Ping* tidak bisa diuji coba begitu saja dari *Browser*. Kamu harus melakukan *Login* terlebih dahulu (mengambil Token Sanctum Phase 1) melalui *Postman* atau aplikasi *Frontend* BKSDA, barulah kamu akan melihat balasan *Ping* aktif.

### Q: Saya tidak menemukan file `bootstrap/providers.php`!

**Artinya:** Kamu kebingungan di versi Laravel lama.
**Solusi:** Di Laravel versi 11/12 yang modern, daftar pendaftaran Service Provider tidak lagi menumpuk secara berantakan di dalam `config/app.php` seperti laravel jaman dahulu, melainkan dipindahkan secara rapi ke file tunggal `bootstrap/providers.php`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(inventory): register service provider and root api endpoint" \
  --body "Aktivasi hak paten Modul Logistik agar diakui oleh kernel Laravel. Integrasi jalur API dan lapis Middleware keamanan (Sanctum + Module Access). Detail di docs/issues/048-backend-inventory-provider.md" \
  --label "backend,architecture,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/048-backend-inventory-provider
```

### Step 3: Kerjakan

Salin dan ciptakan file Service Provider serta fail jalurnya (`api.php`) di posisi hierarki spesifik. Kemudian tautkan namanya ke dalam lumbung `providers.php`. Setelah itu jalankan perintah uji coba:
`php artisan route:list --path=inventory` (Harusnya muncul rute *ping*).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "chore(inventory): register service provider and root api endpoint (#48)"
git push -u origin issue/048-backend-inventory-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(inventory): register service provider and root api endpoint (#48)" \
  --body "## Summary
Suntikan injeksi *Framework* ke Modul Inventory, menjahit ruang khusus agar Migrasi, *Controllers*, dan *Routes* modul ini tereksekusi mulus tanpa bercampur modul lain.

## Changes
- Pembuatan Akta Pusat \`InventoryServiceProvider\`.
- Penerapan tembok lapis dua (*Double Middleware Protocol*): Autentikasi dan Cek Modul \`inventory\`.
- Registrasi \`providers.php\` (Laravel 11/12 Convention).

## Verification
- [x] Lolos pemeriksaan ketiadaan tabrakan Rute (Ping tersaji).
- [x] \`php artisan migrate\` bisa mendeteksi 5 tabel buatan Issue #046.

Closes #48" \
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
Struktur database (Migrations) dan nyawa ORM (Models) Modul Logistik/Inventory sudah siap. Kini saatnya mendaftarkannya ke mesin utama Framework Laravel melalui Provider khusus Modul.

## Task

Kerjakan Issue #048 (Backend — InventoryServiceProvider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/048-backend-inventory-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file arsitektur `backend/app/Modules/Inventory/InventoryServiceProvider.php` (copy-paste dari MD).
3. Buat file pondasi rute `backend/app/Modules/Inventory/Routes/api.php` dan berikan rute cek fisik `/ping`.
4. Daftarkan entri kelas *ServiceProvider* tersebut ke dalam `backend/bootstrap/providers.php` pada barisan terbawah array.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
