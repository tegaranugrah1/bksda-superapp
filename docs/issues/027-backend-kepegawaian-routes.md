# Issue #027 — Backend — Kepegawaian Routes

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `security`
> **Priority**: 🔴 Critical (Menghubungkan API dengan dunia luar beserta satpam pelindungnya)
> **Complexity**: 🟢 Simple (Hanya konfigurasi file routing)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #025 dan #026 (Semua Controller harus sudah siap)

---

## Branch

```
issue/027-backend-kepegawaian-routes
```

## Deskripsi

Ibarat sebuah gedung, *Controller* adalah brankas data, dan *Routes* adalah lorong serta pintu masuknya. Pada **Issue #024**, kita sudah membuat file `api.php` kosong sebagai lorong utama modul Kepegawaian. Kini saatnya kita menempelkan pintu-pintu masuk ke lorong tersebut, lengkap dengan satpam penunggunya (Middleware).

Pada issue penutup sesi *Backend* Kepegawaian ini, seluruh keamanan (*Project Rules*) tingkat dewa diaktifkan sekaligus:
- **Rule 1.1**: Semua pintu dikunci menggunakan gerbang utama `auth:sanctum`.
- **Rule 2.2**: Memakai satpam tambahan `module.access:kepegawaian` (Hanya user yang diberi modul ini yang boleh masuk ke lorong).
- **Rule 2.5**: Menyekat akses Tulis (*Create/Update/Delete*) hanya untuk pemegang peran `admin` atau `super_admin`.
- Operasi sensitif pembagian Hak Akses (*Employee Access Control*) disekat khusus HANYA untuk `super_admin`.

**Apa yang dilakukan:**
1. Mendaftarkan *Endpoint* untuk `EmployeeController` (List, Detail, Tambah, Edit, Hapus).
2. Mendaftarkan *Endpoint* untuk `EmployeeAccessController` (Cek status akses, Update/Buat akses).
3. Membungkus rute-rute tersebut dalam *Group Middleware* berlapis secara rapi (Clean Code).

---

## Acceptance Criteria

- [ ] File `app/Modules/Kepegawaian/Routes/api.php` dimodifikasi.
- [ ] Terdapat pembungkus utama `auth:sanctum` dan `module.access:kepegawaian`.
- [ ] Endpoint `POST/PUT/DELETE` data pegawai dikelompokkan dalam middleware `role:super_admin,admin`.
- [ ] Endpoint kelola akses pegawai dikelompokkan dalam middleware khusus `role:super_admin`.
- [ ] Routing **TIDAK** memuat kode fungsi logic apapun (misal: `function() { ... }`), melainkan langsung mengarahkan (*routing*) ke Controller (Rule 8.4).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Perhatikan pola *Route::group*. Pola ini memastikan kita tidak perlu menulis nama middleware berkali-kali di setiap baris. Kita mengelompokkan ruangan berdasar level keamanannya. *(Sebagai info: Middleware `audit.log` tidak perlu ditulis di sini karena di Issue 015 sudah kita set otomatis menyala di semua Endpoint API).*

### Langkah 1: Mendaftarkan Pintu API (Routing)

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Routes\api.php`

**Buka file yang sebelumnya masih kosong tersebut, dan timpa isinya dengan kode berikut:**

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Kepegawaian\Controllers\EmployeeController;
use App\Modules\Kepegawaian\Controllers\EmployeeAccessController;

/*
|--------------------------------------------------------------------------
| API Routes: Modul Kepegawaian
|--------------------------------------------------------------------------
| Prefix Otomatis: /api/kepegawaian/
| Audit Log      : Otomatis terekam (Via Global API Append di Issue 015)
*/

// RULE 1.1 & 2.2: Wajib memiliki Token Login (Sanctum) & Punya Hak Modul 'kepegawaian'
Route::middleware(['auth:sanctum', 'module.access:kepegawaian'])->group(function () {

    // ==========================================
    // 1. DATA PEGAWAI (HR Data)
    // ==========================================
    
    // Semua User yang lolos gerbang utama boleh sekadar melihat/mencari data
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{id}', [EmployeeController::class, 'show']);

    // RULE 2.5: Hanya Admin & Super Admin yang boleh menambah/mengubah/menghapus
    Route::middleware(['role:super_admin,admin'])->group(function () {
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
    });


    // ==========================================
    // 2. KENDALI HAK AKSES (IAM)
    // ==========================================
    
    // Operasi paling berbahaya di aplikasi (Menciptakan/Menghapus Akses Login).
    // HANYA Bos Tertinggi (Super Admin) yang diizinkan masuk ke rute ini.
    Route::middleware(['role:super_admin'])->group(function () {
        Route::get('/employees/{id}/access', [EmployeeAccessController::class, 'show']);
        Route::put('/employees/{id}/access', [EmployeeAccessController::class, 'update']);
    });

});
```

---

## Troubleshooting

### Q: Kok tidak menggunakan `Route::apiResource('employees', EmployeeController::class)` biar cepat?

**Artinya:** Kamu mengetahui fitur bawaan Laravel yang bisa membuat 5 rute sekaligus dalam 1 baris.
**Solusi:** Praktik `apiResource` dilarang digunakan di sini. Kenapa? Karena kita punya perbedaan level keamanan (Pemisahan akses GET untuk Publik, dan POST/PUT/DELETE untuk Admin). Memisahkan barisnya satu per satu seperti di atas merupakan standar *"Explicit Routing"* yang lebih dianjurkan di arsitektur *Enterprise* karena sangat mudah dibaca oleh tim audit keamanan *(Security Audit)*.

### Q: Kalau saya tembak Endpoint `PUT /api/kepegawaian/employees/5` tapi belum login, errornya apa?

**Artinya:** Kamu penasaran tentang eksekusi *Middleware*.
**Solusi:** Kamu akan dihadang di gerbang terluar oleh Laravel Sanctum dan dikembalikan pesan JSON `{"message": "Unauthenticated."}` dengan status kode HTTP `401`. Kode tidak akan pernah sampai masuk ke dalam pemeriksaan hak akses apalagi menyentuh Controller. Sistem ini berlapis seperti bawang.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): module endpoints routing" \
  --body "Registrasi endpoint untuk EmployeeController dan AccessController dengan sistem sekuritas berlapis. Detail di docs/issues/027-backend-kepegawaian-routes.md" \
  --label "backend,architecture,security"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/027-backend-kepegawaian-routes
```

### Step 3: Kerjakan

Lakukan modifikasi file `Routes/api.php` di dalam modul Kepegawaian sesuai petunjuk.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/Kepegawaian/Routes/
git commit -m "feat(kepegawaian): module endpoints routing (#27)"
git push -u origin issue/027-backend-kepegawaian-routes
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): module endpoints routing (#27)" \
  --body "## Summary
Menyelesaikan siklus Backend untuk Modul Kepegawaian dengan mengunci semua Endpoint menggunakan filter Middleware rakitan kita sendiri.

## Changes
- Menghubungkan \`EmployeeController\` dan \`EmployeeAccessController\` ke URL \`/api/kepegawaian/*\`.
- Penerapan proteksi sekuritas hierarkis (Sanctum -> Module -> Role).
- Pola *Explicit Routing* (*Clean Code*).

## Verification
- [x] Lolos TS/PHP syntax linter.
- [x] \`php artisan route:list\` memunculkan daftar endpoint lengkap beserta nama middleware-nya.

## Rules Compliance
- [x] Rule 1.1: Semua endpoint berlindung di dalam grup \`auth:sanctum\`.
- [x] Rule 2.2: Akses modul diuji menggunakan \`module.access:kepegawaian\`.
- [x] Rule 2.3 & 2.5: CRUD dikunci untuk \`admin\` ke atas. Access khusus \`super_admin\`.
- [x] Rule 8.4: Tidak ada logic (anonymous function) pada deklarasi rute.

Closes #27" \
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
Controller Pegawai (Issue 25 & 26) butuh disambungkan ke sistem URL. Kita akan memasang penjagaan Middleware secara berlapis di sini.

## Task

Kerjakan Issue #027 (Backend — Kepegawaian Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/027-backend-kepegawaian-routes.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi dan buka file `backend/app/Modules/Kepegawaian/Routes/api.php`.
3. Timpa (replace) seluruh isi file tersebut dengan kodingan routing yang sudah dikelompokkan dengan `auth:sanctum`, `module.access`, dan perlindungan `role`. Perhatikan letak kurung kurawal.
4. (Opsional) Jalankan `php artisan route:list | grep kepegawaian` untuk memeriksa apakah rute berhasil terbaca oleh mesin.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
