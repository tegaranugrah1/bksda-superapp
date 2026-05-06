# Issue #067 — Backend — BMN Routes (Peta Jaringan Sirkuit API)

> **Type**: `feature`
> **Labels**: `backend`, `routes`, `module-bmn`
> **Priority**: 🔴 Critical (Penghubung Arus Data dari Aplikasi Klien ke Resepsionis)
> **Complexity**: 🟢 Simple (Deklarasi Jalur Tautan Restful API)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #062, Issue #066

---

## Branch

```
issue/067-backend-bmn-routes
```

## Deskripsi

*(Catatan: Spesifikasi Issue #066 mengenai Controllers telah diselesaikan lebih dulu sebagai syarat wajib pendirian Rute URL ini).*

Semua Resepsionis (*Controllers*), Kawat Berduri (*FormRequests*), dan Otak Eksekusi (*Services*) telah siap di posisinya masing-masing. Namun, pintu masuk (URL) dari arah Internet (*Frontend / Postman*) menuju markas mereka masih belum ada!

Pada **Issue #067** ini, kita akan menggambar peta "Jalan Tol" resmi yang menghubungkan URL dengan *Controller* yang tepat. Kita akan menumpuk (menimpa) fail sirkuit pancingan *(Dummy)* `/ping` yang kita buat di Issue 062 sebelumnya.

Sebagai pengingat, kamu tidak perlu repot-repot menyematkan pelindung *Middleware* seperti `auth:sanctum` atau `module.access:bmn` di file rute ini, karena Pintu Gerbang Induknya (ServiceProvider dari Issue 062) telah mengalungi blok rute ini dengan perlindungan baja secara otomatis.

---

## Acceptance Criteria

- [ ] File `backend/app/Modules/Bmn/Routes/api.php` berhasil dimutakhirkan.
- [ ] Tersedia jaringan rute Restful API standar untuk `AssetController` (Didaftarkan menggunakan `apiResource` untuk mempersingkat kode).
- [ ] Rute kustom untuk mekanisme Pemutihan `DELETE /assets/{asset}`.
- [ ] Tersedia jalur peminjaman: `POST /assets/{asset}/loans` dan `POST /loans/{loan}/return`.
- [ ] Tersedia jalur servis pemeliharaan: `POST /assets/{asset}/maintenances`.
- [ ] Lolos pengujian `php artisan route:list | findstr bmn`.

---

## Panduan Implementasi Cerdas

**Path:** `backend/app/Modules/Bmn/Routes/api.php`

Timpa *(Overwrite)* seluruh isi file rute pancingan sebelumnya dengan kode Jalan Tol yang elegan ini:

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Bmn\Controllers\AssetController;
use App\Modules\Bmn\Controllers\LoanController;
use App\Modules\Bmn\Controllers\MaintenanceController;

/*
|--------------------------------------------------------------------------
| BMN (Barang Milik Negara) Routes
|--------------------------------------------------------------------------
| Base URL Prefix: /api/bmn
| Perlindungan   : auth:sanctum, module.access:bmn (Injeksi ServiceProvider)
|--------------------------------------------------------------------------
*/

// Tes Jaringan Sistem Modul (Peninggalan Issue 062)
Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'module' => 'BMN',
        'message' => '🏛️ Sirkuit Keuangan Barang Milik Negara Aktif & Terlindungi!'
    ]);
});

/*
|--------------------------------------------------------------------------
| 1. JALUR MASTER ASET
|--------------------------------------------------------------------------
*/
// Menggunakan apiResource untuk mencetak rute index, show, store, update secara otomatis.
Route::apiResource('assets', AssetController::class)->except(['destroy']);

// Rute Pemutihan/Disposal (Kita pisahkan dari destroy murni, karena kita menggunakan SoftDeletes)
Route::delete('assets/{asset}/dispose', [AssetController::class, 'dispose']);


/*
|--------------------------------------------------------------------------
| 2. LALU LINTAS PEMINJAMAN (LOAN)
|--------------------------------------------------------------------------
*/
// Daftar seluruh buku riwayat pinjaman
Route::get('loans', [LoanController::class, 'index']);

// Eksekusi Peminjaman sebuah aset spesifik
Route::post('assets/{asset}/loans', [LoanController::class, 'borrow']);

// Eksekusi Pengembalian sebuah buku pinjaman
Route::post('loans/{loan}/return', [LoanController::class, 'return']);


/*
|--------------------------------------------------------------------------
| 3. REKAM MEDIS PEMELIHARAAN (MAINTENANCE)
|--------------------------------------------------------------------------
*/
// Daftar seluruh nota riwayat perbaikan/servis
Route::get('maintenances', [MaintenanceController::class, 'index']);

// Eksekusi Pencatatan Nota Servis pada sebuah aset spesifik
Route::post('assets/{asset}/maintenances', [MaintenanceController::class, 'record']);
```

---

## Troubleshooting

### Q: Kenapa rute Peminjaman (*Borrow*) menggunakan `assets/{asset}/loans` sedangkan Pengembalian (*Return*) menggunakan `loans/{loan}/return`?

**Artinya:** Desain Restful API Berorientasi Sumber Daya *(Resource-Oriented Design)*.
**Solusi:** Ketika kita *meminjam*, wujud abstrak dari "Peminjaman" itu belum ada, sehingga objek utamanya adalah **Asetnya**. Tapi ketika kita *mengembalikan*, wujud "Buku Peminjamannya" (Loan Record) sudah nyata ada di Database. Maka yang kita eksekusi/tutup adalah **Buku Peminjamannya (Loan ID)**, bukan sekadar Asetnya (karena 1 aset bisa dipinjam 10 kali secara historis, kita harus tahu yang mana yang mau dikembalikan). Ini adalah arsitektur API tingkat ahli (*Senior Level*).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): establish RESTful API circuit matrices connecting client layers to operational controllers" \
  --body "Menghamparkan peta sirkuit *(Routing)* berbasis Restful API. Mengeliminasi URL serampangan menggunakan perpaduan elegan \`apiResource()\` dan penamaan hierarkis Sumber Daya. Detail di docs/issues/067-backend-bmn-routes.md" \
  --label "backend,routes,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/067-backend-bmn-routes
```

### Step 3: Kerjakan

Ganti isi dari file `backend/app/Modules/Bmn/Routes/api.php` dengan blok kode elegan di atas. Jangan lupa hapus paksa sisa cache konfigurasi mesin Laravel jika rute barumu tidak langsung dikenali (Lihat Step 4).

### Step 4: Pengetesan Lokal

```bash
cd backend
php artisan route:clear
php artisan route:list | findstr bmn
```
Jika terminalmu mengeluarkan daftar panjang rute-rute BMN yang rapi, berarti jalan tolmu telah terbuka sempurna!

### Step 5: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): establish RESTful API circuit matrices connecting client layers to operational controllers (#67)"
git push -u origin issue/067-backend-bmn-routes
```

### Step 6: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): establish RESTful API circuit matrices connecting client layers to operational controllers (#67)" \
  --body "## Summary
Penyelesaian Fase Fondasi Backend BMN. Seluruh logika transaksi dan pengamanan Modul BMN telah diekspos secara aman ke publik *(Local Network)* melalui jaringan URL.

## Changes
- Deklarasi instan 4 Rute Dasar menggunakan \`Route::apiResource()\` yang dimodifikasi khusus untuk mengabaikan fungsi bongkar mutlak \`destroy()\`.
- Penciptaan rute kustom \`DELETE /dispose\` khusus menangani fungsi Pemutihan (SoftDeletes).
- Penerapan Hierarki REST URL (\`/assets/{asset}/loans\`) untuk menciptakan pemetaan tindakan API logis *(Logical Action Mapping)*.

## Rules Compliance
- [x] Lolos Doktrin Rute Telanjang (*Naked Route*): File API bersih dari logika *Closure*, memastikan kecepatan penangkapan (*Route Caching*) oleh Laravel berlangsung maksimal.

Closes #67" \
  --base main
```

### Step 7: Merge & Sync

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
Seluruh "Rumah, Tentara Penjaga, dan Resepsionis" BMN telah dibangun kokoh (dari Issue 060-066). Tapi tanpa ada Jalan Raya (URL), Frontend React kita tidak bisa menghubungi mereka.

## Task

Kerjakan Issue #067 (Backend — BMN Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/067-backend-bmn-routes.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Timpa file sirkuit pancingan di `backend/app/Modules/Bmn/Routes/api.php` dengan deretan blok Rute yang baru saja dirancang.
3. Pastikan ketiga pemanggilan `use App\Modules\Bmn\Controllers\...` tertulis tepat di ujung atas file.
4. Lakukan pengetesan dengan membasuh *Route Cache* melalui `php artisan route:clear`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
