# Issue #084 — Backend — DeReporting Routes (Arsitektur Lalu Lintas Laporan)

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-dereporting`
> **Priority**: 🔴 Critical (Menentukan Pintu Kematian: Publik vs Privat)
> **Complexity**: 🟡 Medium (Orkestrasi RBAC dan Penguncian Berlapis)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #080, #081, #082, #083

---

## Branch

```
issue/084-backend-dereporting-routes
```

## Deskripsi

Seluruh Pengendali Data (*Controllers*) untuk Modul DeReporting telah disiagakan di pangkalan! Namun, hingga titik ini, mereka sepenuhnya lumpuh karena belum memiliki Gerbang Lalu Lintas *(Routing)*.

Pada **Issue #084** ini, kita akan membongkar *file* umpan `api.php` yang kita buat di Issue 079, dan menanamkan kabel sirkuit sesungguhnya.

**Tantangan Arsitektur (Project Rules 2.1 & 2.5)**:
Modul DeReporting memiliki hierarki akses yang sangat ketat:
1. **ZONA PUBLIK (Tanpa Token)**: Digunakan masyarakat dunia untuk mengirim Formulir Eksternal, dan membaca (GET) Master Data Bidang untuk kebutuhan *Dropdown* HTML.
2. **ZONA PEGAWAI (Auth + Module Access)**: Digunakan oleh sembarang Pegawai BKSDA untuk mengunggah Laporan Internal dan mengunduh berkas rekannya.
3. **ZONA ADMIN (Role: admin, super_admin)**: Mengunci total wewenang penghapusan Master Data, penugasan Operator Laporan, dan merubah Status Laporan Eksternal Masyarakat.

Semua kompleksitas ini harus dipahat secara sangat elegan tanpa ada satu titik celah pun bagi peretas!

---

## Acceptance Criteria

- [ ] File target Modul: `backend/app/Modules/DeReporting/Routes/api.php` dimutakhirkan.
- [ ] Tersedia `ZONA PUBLIK` yang mengekspos `GET /master/{type}` dan `POST /ekternals/public`.
- [ ] Tersedia `ZONA TERKUNCI` berbungkus *Middleware* `auth:sanctum` & `module.access:dereporting`.
- [ ] Di dalam Zona Terkunci, terdapat kubah khusus (ZONA ADMIN) berbungkus *Middleware* `role:admin,super_admin` untuk melumpuhkan upaya perusakan data oleh pegawai pangkat rendah.
- [ ] Menerapkan *Route Model Binding* gaya `apiResource` untuk meringkas penulisan Laporan Internal dan Operator.

---

## Panduan Implementasi Cerdas

**Path:** `backend/app/Modules/DeReporting/Routes/api.php`

Ganti kode `Route::get('/ping')` di dalam *file* tersebut dengan Orkestrasi Pertahanan Lapis Tiga ini:

```php
<?php

use Illuminate\Support\Facades\Route;

// Import 4 Pengendali Raksasa kita
use App\Modules\DeReporting\Controllers\MasterDataController;
use App\Modules\DeReporting\Controllers\InternalController;
use App\Modules\DeReporting\Controllers\EkternalController;
use App\Modules\DeReporting\Controllers\OperatorController;

/*
|--------------------------------------------------------------------------
| ZONA PUBLIK (INTERNET TERBUKA)
|--------------------------------------------------------------------------
| Tanpa Token. Digunakan khusus oleh layar eksternal masyarakat.
*/

// 1. Ekstraktor Dropdown (Peringatan: Controller memiliki perisai exception di dalamnya)
Route::get('/master/{type}', [MasterDataController::class, 'index']);

// 2. Lubang Penerima Formulir Masyarakat (Rate Limiting telah diurus di Controller)
Route::post('/ekternals/public', [EkternalController::class, 'storePublic']);


/*
|--------------------------------------------------------------------------
| ZONA PEGAWAI BKSDA (TERKUNCI)
|--------------------------------------------------------------------------
| Wajib menyertakan Bearer Token Sanctum & Hak Akses Modul 'dereporting'.
*/
Route::middleware(['auth:sanctum', 'module.access:dereporting'])->group(function () {

    // 1. LALU LINTAS LAPORAN INTERNAL (Seluruh Pegawai)
    // Otomatis menciptakan rute index, store, show, update, destroy
    Route::apiResource('internals', InternalController::class);
    // Pintu gaib pengunduh PDF dari Brankas Privat
    Route::get('/internals/{id}/download', [InternalController::class, 'downloadFile']);


    /*
    |--------------------------------------------------------------------------
    | ZONA ADMIN & SUPER ADMIN (OTORITAS TINGGI)
    |--------------------------------------------------------------------------
    | Mengunci wewenang perubahan struktur Master Data dan Modifikasi Operator.
    */
    Route::middleware('role:admin,super_admin')->group(function () {

        // A. PENGENDALI MASTER DATA DINAMIS (POST, PUT, DELETE)
        Route::post('/master/{type}', [MasterDataController::class, 'store']);
        Route::put('/master/{type}/{id}', [MasterDataController::class, 'update']);
        Route::delete('/master/{type}/{id}', [MasterDataController::class, 'destroy']);

        // B. PENUGASAN OPERATOR WILAYAH
        Route::apiResource('operators', OperatorController::class)->except(['show']);

        // C. PENINJAUAN LAPORAN MASYARAKAT (EKSTERNAL)
        Route::get('/ekternals', [EkternalController::class, 'index']);
        Route::put('/ekternals/{id}/status', [EkternalController::class, 'updateStatus']);
        Route::get('/ekternals/{id}/download', [EkternalController::class, 'downloadFile']);
        Route::delete('/ekternals/{id}', [EkternalController::class, 'destroy']); // Ekstra fungsi buang laporan sampah
    });

});
```

---

## Troubleshooting

### Q: Tiba-tiba Frontend saya mendapatkan Error `Class 'module.access' does not exist` saat mengakses Laporan Internal!

**Artinya:** Modul IAM pusatmu di Fase 1 (Issue 012) belum sempat mendaftarkan nama Alias pada *Bootstrap*.
**Solusi:** Buka `backend/bootstrap/app.php`. Pastikan di bagian `->withMiddleware(function (Middleware $middleware) {` kamu telah menambahkan pendaftaran identitas secara eksplisit: 
```php
$middleware->alias([
    'module.access' => \App\Http\Middleware\CheckModuleAccess::class,
    'role' => \App\Http\Middleware\CheckRole::class,
]);
```
Ini bukan kesalahan dari file *Routes* BMN ini, melainkan kegagalan Pemanasan Sistem (*Booting Phase*).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): configure strict RBAC routing topologies for internal and external telemetries" \
  --body "Merangkai sirkuit lalu lintas *Routes* tingkat akhir. Menerapkan taktik pembelahan topologi: Terbuka *(Public)* vs Berpengaman *(Auth/RBAC)*. Memerintahkan perlindungan ekstrem \`role:admin\` untuk titik modifikasi struktural Master Data sesuai doktrin Birokrasi. Detail di docs/issues/084-backend-dereporting-routes.md" \
  --label "backend,architecture,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/084-backend-dereporting-routes
```

### Step 3: Kerjakan

Ganti isi `api.php` milik DeReporting sepenuhnya dengan Cetak Biru Orkestrasi di atas. Pastikan kamu mensejajarkan *Import Controller* di baris teratas agar peladen tidak buta. Perhatikan dengan saksama taktik `group()` yang saling membungkus *(Nested Grouping)*; jangan sampai ada tanda kurung kurawal `}` yang hilang.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): configure strict RBAC routing topologies for internal and external telemetries (#84)"
git push -u origin issue/084-backend-dereporting-routes
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): configure strict RBAC routing topologies for internal and external telemetries (#84)" \
  --body "## Summary
Pembangkitan Sirkuit Kesadaran Arsitektur *(Architecture Routing Phase)* untuk Modul DeReporting. Penggantian Rute Umpan menjadi Papan Kendali Lalu Lintas sungguhan.

## Changes
- Inisiasi pemisahan taktis antara \`GET /master\` (Publik/Dropdown) vs \`POST /master\` (Admin).
- Pemasangan tameng lapis pertama: \`auth:sanctum\` & \`module.access:dereporting\` untuk mengusir penyusup anonim dari zona Operasional BKSDA.
- Pemasangan tameng lapis kedua *(Deep Vault)*: \`role:admin,super_admin\` khusus untuk gerbang Master Data, Manajemen Laporan Eksternal, dan Penugasan Operator.

## Rules Compliance
- [x] Lolos Doktrin Privilese Tunggal (Project Rule 2.5): Operasi manipulasi (CRUD) di ranah Master Data telah dikunci mutlak menggunakan sistem *Routing Role Middleware*, membuatnya mustahil dibobol oleh pegawai rendahan.

Closes #84" \
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
Modul DeReporting telah memiliki *Controllers*. Agar Front-End bereaksi, kita perlu menulis papan penunjuk jalan *(Routes)*. Modul ini terkenal berbahaya karena memadukan Rute Internet Publik (Tanpa Login) dan Rute Super Admin.

## Task

Kerjakan Issue #084 (Backend — DeReporting Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/084-backend-dereporting-routes.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah perbatasan: `backend/app/Modules/DeReporting/Routes/api.php`.
3. Sapu bersih isi berkas tersebut (buang rute bohongan `ping` yang lama), lalu GANTIKAN sepenuhnya dengan struktur Lapis Tiga *(Public, Pegawai, Admin)* dari cetak biru di atas.
4. Jangan lengah pada bagian kurung tutup `});` karena ia membungkus fungsi pengunci *Middleware* yang rumit.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
