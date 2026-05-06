# Issue #052 — Backend — Inventory Routes (Jaringan Titik Akhir API)

> **Type**: `feature`
> **Labels**: `backend`, `routes`, `module-inventory`
> **Priority**: 🔴 Critical (Tahap finalisasi *Backend* Modul Logistik)
> **Complexity**: 🟢 Simple (Penyusunan Rute dengan Hierarki Lapis Ganda)
> **Recommended AI Model**: Gemini 2.5 Flash / Ollama / GPT-4o-mini
> **Dependencies**: Issue #048, Issue #051

---

## Branch

```
issue/052-backend-inventory-routes
```

## Deskripsi

Seluruh persenjataan utama (Database, FormRequest, Service, dan Controller) telah dirakit sempurna pada Issue-Issue sebelumnya. Langkah terakhir untuk menghidupkan *Backend* Modul Logistik ini adalah membentangkan "Jaringan Kabel Utama" (Routing API).

Di Issue 048, kita sempat membuat file sementara (`Routes/api.php`) yang hanya berisi fungsi `ping`. Pada **Issue #052** ini, kita akan menghapus isi file sementara tersebut dan menggantinya dengan rute-rute asli BKSDA.

Ada satu hal maha penting yang harus kita perhatikan: **Project Rule 2.5**. Aturan tersebut berbunyi: *"Operasi CRUD pada master data hanya boleh dilakukan oleh `admin` atau `super_admin`"*.
Beruntungnya, kita tidak perlu menambahkan ratusan baris kode. Melalui keajaiban fungsionalitas Laravel, kita cukup membungkus rute yang berbahaya (seperti tambah data, kurangi stok) menggunakan pelindung rute kelompok bawaan kita: `middleware(['role:admin,super_admin'])`.

---

## Acceptance Criteria

- [ ] Memodifikasi file `backend/app/Modules/Inventory/Routes/api.php`.
- [ ] Tersedia rute Publik (Baca/Read) untuk memuat halaman Dashboard dan daftar tabel (`GET`).
- [ ] Tersedia rute Pengelola (Write) yang mutlak dilindungi oleh hak akses tingkat admin (`POST` / `PUT` / `DELETE`).
- [ ] File ini harus bebas dari logika pemrograman rumit (*Zero Logic Principle*). Hanya boleh berfungsi sebagai jembatan yang menghubungkan URL ke arah Kelas Controller.

---

## Panduan Implementasi Cerdas

Buka file yang sempat kita buat di Fase Awal Logistik (Issue 048). Timpa isi keseluruhan filenya dengan mahakarya struktur *Routing* di bawah ini:

**Path:** `backend/app/Modules/Inventory/Routes/api.php`

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Inventory\Controllers\DashboardController;
use App\Modules\Inventory\Controllers\OfficeController;
use App\Modules\Inventory\Controllers\ItemController;
use App\Modules\Inventory\Controllers\StockController;

/*
|--------------------------------------------------------------------------
| Inventory Module Routes (BKSDA Logistik)
|--------------------------------------------------------------------------
| Semua URL di bawah ini sudah dibungkus otomatis dengan:
| Prefix: /api/inventory
| Middleware Dasar: auth:sanctum, module.access:inventory
|--------------------------------------------------------------------------
*/

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => '🛡️ BKSDA Inventory API is actively routing traffic!',
        'timestamp' => now()
    ]);
});

// ==========================================
// RUTE BACA (READ) 
// Siapapun Pegawai Biasa asalkan punya akses Modul Logistik, boleh melihat ini.
// ==========================================
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
Route::get('/offices', [OfficeController::class, 'index']);
Route::get('/items', [ItemController::class, 'index']);


// ==========================================
// RUTE KENDALI (WRITE) 
// Mematuhi Project Rule 2.5: Wajib menggunakan Perisai Role (Admin & Super Admin)
// ==========================================
Route::middleware(['role:admin,super_admin'])->group(function () {
    
    // Master Data
    Route::post('/offices', [OfficeController::class, 'store']);
    Route::post('/items', [ItemController::class, 'store']);
    
    // Mesin Mutasi Stok Fisik (Jantung BKSDA)
    Route::post('/stock/in', [StockController::class, 'stockIn']);
    Route::post('/stock/out', [StockController::class, 'stockOut']);
    
});
```

---

## Troubleshooting

### Q: Tombol Pengeluaran Barang (Stock Out) mengeluarkan Error: "Route [login] not defined".

**Artinya:** Kamu gagal di tahap pengiriman Token.
**Solusi:** Ini adalah ciri khas masalah di mana Sistem Laravel kebingungan karena seseorang mencoba menembus pintu rute API, namun dia lupa melampirkan *Header* `Authorization: Bearer <token_kamu>`. Pastikan Postman/Frontend mu menyertakan Token, dan atur Header `Accept: application/json` agar Laravel membalas menggunakan bahasa API (JSON), bukan memaksamu pindah ke halaman web Login HTML.

### Q: Saya tidak menggunakan *Role* Admin, kenapa saya ditolak?

**Artinya:** *Perisai Middleware Berfungsi*.
**Solusi:** Baris perintah `Route::middleware(['role:admin,super_admin'])->group(...)` adalah bentuk pengamanan level-3 (Tertinggi). Jika kamu iseng *Login* menggunakan akun pegawai biasa dan mencoba menambah stok, sistem secara ketat akan melempar status `403 Forbidden` (Dilarang). Coba tes menggunakan akun yang memiliki `role` admin di *Database* `users`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): routing integration and role-based architectural fencing" \
  --body "Membentangkan jaringan kabel API ke arah keempat Pangkalan Pengendali (*Controllers*). Mengadopsi Project Rule 2.5 dengan memisahkan Rute Pembacaan (Operator) dengan Rute Mutasi (Admin Group). Detail di docs/issues/052-backend-inventory-routes.md" \
  --label "backend,routes,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/052-backend-inventory-routes
```

### Step 3: Kerjakan

Timpa isi file `backend/app/Modules/Inventory/Routes/api.php` dengan struktur blok Rute (Read/Write) yang rapi di atas. Cek ketersambungan rute menggunakan perintah `php artisan route:list --path=inventory` untuk memastikan Laravel melihat semua Endpoint ini.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(inventory): routing integration and role-based architectural fencing (#52)"
git push -u origin issue/052-backend-inventory-routes
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): routing integration and role-based architectural fencing (#52)" \
  --body "## Summary
Penyelesaian fase arsitektur internal Modul Logistik Backend. Mengubah sketsa abstrak sistem inventaris menjadi jaringan *Endpoint* fisik yang siap di konsumsi oleh Frontend.

## Changes
- Pemetaan jaringan Controller murni (\`index\`, \`store\`, \`stats\`, \`stockIn/Out\`).
- Pemisahan wilayah publik operasional (READ) dengan wilayah eksekusi sakral (WRITE).

## Rules Compliance
- [x] Lolos integrasi mutlak Project Rule 2.5: Mengurung aktivitas CRUD Data Master dan Pemrosesan Keuangan/Stok khusus di balik \`role:admin,super_admin\`.

Closes #52" \
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
Infrastruktur Logistik kita (*Backend*) telah mencapai tahap paripurna. Kita hanya perlu mengukir alamat API (Jalur Routing) di file penghubung `api.php`.

## Task

Kerjakan Issue #052 (Backend — Inventory Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/052-backend-inventory-routes.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buka file pemancing (`api.php`) yang kalian buat di `backend/app/Modules/Inventory/Routes/api.php` pada Issue 048.
3. Hapus isinya, lalu ganti total dengan tata letak Rute Pembagian Izin Lapis Dua (Pembacaan vs Tulisan) dari instruksi *Markdown* di atas.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
