# Issue #037 — Backend — Surat Tugas Service Provider

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-surattugas`
> **Priority**: 🔴 Critical (Menghidupkan jantung Modul di dalam mesin Laravel)
> **Complexity**: 🟢 Low (Boilerplate arsitektural)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #035, #036

---

## Branch

```
issue/037-backend-surat-tugas-service-provider
```

## Deskripsi

Sistem modular kita (Monorepo) membuat setiap *folder* bekerja layaknya aplikasi mandiri. Jika dianalogikan dengan komputer, file Migrasi dan Model yang kamu buat di issue sebelumnya adalah sebuah "*Hard Disk*". Agar *Hard Disk* ini bisa dibaca oleh *Motherboard* Laravel, kita harus mencolokkan sebuah kabel data. Kabel data penghubung inilah yang disebut dengan **Service Provider**.

Pada Issue ini kita akan mematuhi **Architecture Rule 8.2 & 8.3**, yaitu:
1. Membuat `SuratTugasServiceProvider.php` yang bertugas mendaftarkan letak *folder* `Migrations` agar terbaca saat perintah `php artisan migrate` dijalankan.
2. Membuat sub-sistem rute API mandiri (`Routes/api.php`) dan memberikan awalan mutlak *(prefix)* `/api/surat-tugas/` padanya, sehingga tidak akan bentrok dengan API Kepegawaian yang sudah ada.
3. Mendaftarkan steker kabel ini secara permanen ke dalam file inti Laravel 12 di `bootstrap/providers.php`.

---

## Acceptance Criteria

- [ ] File penggerak utama `SuratTugasServiceProvider.php` sukses dibuat pada direktori root Modul.
- [ ] Tersedia sebuah file `api.php` sementara sebagai pancingan (Dummy Endpoint `/ping`) di dalam folder `Routes/`.
- [ ] Terkoneksi dengan sentral komando di `bootstrap/providers.php`.
- [ ] Endpoint `http://localhost:8000/api/surat-tugas/ping` membuahkan hasil *JSON* tanda modul telah hidup.

---

## Langkah Demi Langkah

### Langkah 1: Buat Direktori Rute

Pertama, kita harus membuat wadah *(Route)* di mana kelak ratusan Endpoint (Alamat URL) dari persuratan ini bersarang.

1. Buka *Command Prompt / Terminal* Windows.
2. Arahkan ke root Backend: `cd e:\bksda-superapp\backend`
3. Buat foldernya:
```bash
mkdir -p app/Modules/SuratTugas/Routes
```

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Routes\api.php`

**Buka berkas tersebut dan ciptakan Pintu Gerbang Sementara:**

```php
<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Surat Tugas API Routes
|--------------------------------------------------------------------------
| Prefix: /api/surat-tugas
| Semua endpoint di bawah ini otomatis berada di bawah prefix tersebut.
*/

// Endpoint uji coba denyut nadi Modul
Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => '📡 Signal received! Modul Surat Tugas telah mengudara dan siap beroperasi.'
    ]);
});
```

---

### Langkah 2: Rakit The Service Provider (Sang Kabel Penghubung)

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\SuratTugasServiceProvider.php`

**Isikan kodingan arsitektural berikut ini (Perhatikan baik-baik susunan *namespace*-nya):**

```php
<?php

namespace App\Modules\SuratTugas;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class SuratTugasServiceProvider extends ServiceProvider
{
    /**
     * Daftarkan layanan rakitan di sini (Register Bindings)
     */
    public function register(): void
    {
        // Tempat meregistrasi Interface ke Implementation class jika menggunakan Repository Pattern kelak
    }

    /**
     * Menghidupkan nyawa Modul pada saat Booting mesin Laravel (Bootstrap)
     */
    public function boot(): void
    {
        // 1. DAFTARKAN MIGRASI: Membuka kunci gembok folder Migrations (Issue 035)
        $this->loadMigrationsFrom(__DIR__ . '/Migrations');

        // 2. DAFTARKAN RUTE (Rule 8.3): Mencolokkan API.php dengan prefix paksa
        Route::middleware('api')
            ->prefix('api/surat-tugas')
            ->group(__DIR__ . '/Routes/api.php');
    }
}
```

---

### Langkah 3: Colokkan ke Motherboard Laravel

Sekalipun Sang Provider telah jadi, Laravel 12 tidak akan mengeksekusinya secara gaib jika kita tidak melapor kepadanya. 

**Path:** `e:\bksda-superapp\backend\bootstrap\providers.php`

**Buka file ini, dan sisipkan nama Provider kita persis di bawah Provider Kepegawaian (yang kita buat dulu di Fase 2):**

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Modules\Kepegawaian\KepegawaianServiceProvider::class,
    
    // 👇 Tambahkan Modul Baru Kita Di Sini 👇
    App\Modules\SuratTugas\SuratTugasServiceProvider::class,
];
```

---

## Troubleshooting

### Q: Muncul Error *Class 'App\Modules\SuratTugas\SuratTugasServiceProvider' not found* ketika menjalankan aplikasi.

**Artinya:** Terdapat kelalaian fatal pada penulisan susunan abjad (typo) atau *Namespace* terputus.
**Solusi:** Periksa kembali file `SuratTugasServiceProvider.php`, pastikan persis memiliki nama ruang `namespace App\Modules\SuratTugas;`. Setelah yakin tidak salah eja, pancing PSR-4 dengan memanggil komando gaib `composer dump-autoload` melalui terminal backend.

### Q: Saya buka browser `http://localhost:8000/api/surat-tugas/ping` namun hasilnya 404 Not Found.

**Artinya:** Rute (Route) gagal disuntikkan oleh Provider.
**Solusi:** Pastikan huruf besar kecil pada struktur *folder* (`Routes` bukan `routes`) sesuai persis dengan pemanggilan `__DIR__ . '/Routes/api.php'`. Sistem Operasi berbasis UNIX (*Deployment VPS* nanti) akan *error* dan *sensitive* terhadap hal seperti ini.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): module service provider architecture" \
  --body "Merajut file struktur API Routing independen dan mendaftarkan Service Provider Surat Tugas ke dalam pipeline boot Laravel. Detail di docs/issues/037-backend-surat-tugas-service-provider.md" \
  --label "backend,architecture,module-surattugas"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/037-backend-surat-tugas-service-provider
```

### Step 3: Kerjakan

Salin file *Provider*, siapkan *Routing endpoint*, dan pastikan kamu mendaftarkannya pada *Bootstrap Providers* Laravel. Test hasilnya melalui terminal atau Browser sebelum disimpan.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(surat-tugas): module service provider architecture (#37)"
git push -u origin issue/037-backend-surat-tugas-service-provider
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): module service provider architecture (#37)" \
  --body "## Summary
Menghidupkan isolasi birokratis pada entitas Surat Tugas secara modular. Semua request terkait dokumen keberangkatan akan bermuara dan dikurung pada modul mandiri.

## Changes
- Inisialisasi rute independen \`/api/surat-tugas/ping\`.
- Perakitan \`SuratTugasServiceProvider.php\` untuk melacak direktori Migrations (Issue 035).
- Injeksi \`providers.php\` pada struktur pilar Laravel 12.

## Rules Compliance
- [x] Rule 8.2: Memastikan eksistensi *ServiceProvider* dan folder *Routes*.
- [x] Rule 8.3: Melaksanakan pemaksaan (*Enforcement*) pemakaian prefix nama modul secara seragam pada tingkat Provider.

Closes #37" \
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
Struktur database (Model + Migration) Modul Surat Tugas sudah berdiri, sekarang kita butuh Service Provider agar Laravel mengenali dan menghidupkan ekosistem folder Modul ini.

## Task

Kerjakan Issue #037 (Backend — Surat Tugas Service Provider).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/037-backend-surat-tugas-service-provider.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `backend/app/Modules/SuratTugas/Routes/api.php` dan berikan endpoint uji `/ping`.
3. Ciptakan `SuratTugasServiceProvider.php` di akar modul dan daftarkan Migration beserta *Prefix API* Routingnya secara utuh.
4. Jangan lupakan mendaftarkan *Provider* tersebut di `backend/bootstrap/providers.php`.
5. Opsional: Jalankan perintah artisan dump-autoload jika perlu.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
