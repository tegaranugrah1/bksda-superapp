# Issue #096 — Backend — CMS Routes (Peta Jalan 70+ Gerbang API)

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-cms`
> **Priority**: 🔴 Critical (Tanpa Ini, 15 Controller yang Kita Bangun Tidak Bisa Diakses)
> **Complexity**: 🟡 Medium (Banyak Endpoint, Tapi Polanya Berulang)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash
> **Dependencies**: Issue #094, Issue #095

---

## Branch

```
issue/096-backend-cms-routes
```

## Deskripsi

Kita telah membangun 15+ Controller yang siap bertempur, namun tidak satupun yang bisa dipanggil oleh *Frontend*. Mengapa? Karena gerbang lalu lintasnya (*Routes*) masih berisi rute `/ping` bohongan dari Issue 093.

Pada **Issue #096** ini, kita akan mengganti isi kedua file rute (`public.php` dan `admin.php`) dengan peta jalan sesungguhnya — total **70+ endpoint** yang dikelompokkan rapi.

**Prinsip Arsitektur Kunci:**
1. **`public.php`** → Hanya `Route::get(...)`. Tidak boleh ada POST/PUT/DELETE.
2. **`admin.php`** → CRUD lengkap. Sudah terlindungi `auth:sanctum` + `module.access:cms` dari ServiceProvider (Issue 093), jadi kita TIDAK perlu menulis middleware lagi di file ini.
3. **Urutan Rute Statis vs Dinamis**: Rute statis (`/informasi/terbaru`) HARUS ditulis SEBELUM rute dinamis (`/informasi/{slug}`), agar Laravel tidak salah tangkap.

---

## Acceptance Criteria

- [ ] File `Routes/public.php` dimutakhirkan dengan 20+ endpoint GET.
- [ ] File `Routes/admin.php` dimutakhirkan dengan 50+ endpoint CRUD.
- [ ] Rute statis selalu didaftarkan sebelum rute dinamis.
- [ ] Menggunakan `apiResource` untuk Controller yang memiliki CRUD penuh.
- [ ] Lolos validasi: `php artisan route:list --path=cms`.

---

## Panduan Implementasi Cerdas

### 1. Peta Jalan Website Publik (Read-Only)
**Path:** `backend/app/Modules/CMS/Routes/public.php`

Ganti seluruh isi file dengan orkestrasi ini:

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Modules\CMS\Controllers\Public\PublicController;

/*
|--------------------------------------------------------------------------
| CMS PUBLIC ROUTES — Website Pengunjung (Tanpa Login)
|--------------------------------------------------------------------------
| Prefiks otomatis: /api/cms/public/
| Middleware: api (sudah diatur di ServiceProvider)
|
| ATURAN EMAS: Hanya GET. Tidak ada POST/PUT/DELETE di zona ini.
*/

// ── KONFIGURASI & NAVIGASI ──
Route::get('/website',   [PublicController::class, 'website']);
Route::get('/kepala',    [PublicController::class, 'kepala']);
Route::get('/menus',     [PublicController::class, 'menus']);
Route::get('/categories',[PublicController::class, 'categoryIndex']);
Route::get('/links',     [PublicController::class, 'linkIndex']);

// ── BERITA / INFORMASI ──
// PERINGATAN: Rute statis HARUS di atas rute dinamis {slug}!
Route::get('/informasi/terbaru', [PublicController::class, 'informasiTerbaru']);
Route::get('/informasi',        [PublicController::class, 'informasiIndex']);
Route::get('/informasi/{slug}', [PublicController::class, 'informasiShow']);

// ── PROFIL ORGANISASI ──
Route::get('/profil',        [PublicController::class, 'profilIndex']);
Route::get('/profil/{slug}', [PublicController::class, 'profilShow']);

// ── KAWASAN KONSERVASI ──
Route::get('/kawasan',        [PublicController::class, 'kawasanIndex']);
Route::get('/kawasan/{slug}', [PublicController::class, 'kawasanShow']);

// ── TSL (Tumbuhan & Satwa Liar) ──
Route::get('/tsl',        [PublicController::class, 'tslIndex']);
Route::get('/tsl/{slug}', [PublicController::class, 'tslShow']);

// ── GALERI ──
Route::get('/photos', [PublicController::class, 'photoIndex']);
Route::get('/videos', [PublicController::class, 'videoIndex']);

// ── PUBLIKASI ──
Route::get('/buku',     [PublicController::class, 'bukuIndex']);
Route::get('/leaflet',  [PublicController::class, 'leafletIndex']);
Route::get('/poster',   [PublicController::class, 'posterIndex']);
Route::get('/regulasi', [PublicController::class, 'regulasiIndex']);
```

### 2. Peta Jalan Panel Admin (CRUD Terkunci)
**Path:** `backend/app/Modules/CMS/Routes/admin.php`

Ganti seluruh isi file dengan sirkuit kendali ini:

```php
<?php

use Illuminate\Support\Facades\Route;

// Import seluruh 15 Controller Admin
use App\Modules\CMS\Controllers\Admin\InformasiController;
use App\Modules\CMS\Controllers\Admin\CategoryController;
use App\Modules\CMS\Controllers\Admin\ProfilController;
use App\Modules\CMS\Controllers\Admin\KawasanController;
use App\Modules\CMS\Controllers\Admin\TslController;
use App\Modules\CMS\Controllers\Admin\PhotoController;
use App\Modules\CMS\Controllers\Admin\VideoController;
use App\Modules\CMS\Controllers\Admin\LinkController;
use App\Modules\CMS\Controllers\Admin\BukuController;
use App\Modules\CMS\Controllers\Admin\LeafletController;
use App\Modules\CMS\Controllers\Admin\PosterController;
use App\Modules\CMS\Controllers\Admin\RegulasiController;
use App\Modules\CMS\Controllers\Admin\JenisController;
use App\Modules\CMS\Controllers\Admin\WebsiteController;
use App\Modules\CMS\Controllers\Admin\KepalaController;
use App\Modules\CMS\Controllers\Admin\MenuController;
use App\Modules\CMS\Controllers\Admin\PesanController;

/*
|--------------------------------------------------------------------------
| CMS ADMIN ROUTES — Panel Pengelola Konten (Terkunci)
|--------------------------------------------------------------------------
| Prefiks otomatis: /api/cms/admin/
| Middleware: api + auth:sanctum + module.access:cms (dari ServiceProvider)
|
| Semua rute di bawah ini sudah terproteksi Token. Kita TIDAK perlu
| menulis middleware lagi di sini. Aman!
*/

// ══════════════════════════════════════════════════
// KELOMPOK 1: KONTEN UTAMA (apiResource = CRUD Otomatis)
// ══════════════════════════════════════════════════

// Berita / Informasi — Dengan endpoint Toggle Publish tambahan
Route::apiResource('informasi', InformasiController::class);
Route::patch('/informasi/{id}/toggle-publish', [InformasiController::class, 'togglePublish']);

// Profil, Kawasan, TSL — CRUD Standard
Route::apiResource('profil', ProfilController::class);
Route::apiResource('kawasan', KawasanController::class);
Route::apiResource('tsl', TslController::class);

// ══════════════════════════════════════════════════
// KELOMPOK 2: MEDIA & KOMUNIKASI
// ══════════════════════════════════════════════════

Route::apiResource('photos', PhotoController::class);
Route::apiResource('videos', VideoController::class);
Route::apiResource('links', LinkController::class);

// Pesan Masuk — Tidak perlu store (pesan dari publik akan punya endpoint sendiri)
Route::get('/pesan', [PesanController::class, 'index']);
Route::patch('/pesan/{id}/read', [PesanController::class, 'markAsRead']);
Route::delete('/pesan/{id}', [PesanController::class, 'destroy']);

// ══════════════════════════════════════════════════
// KELOMPOK 3: PUBLIKASI & REGULASI
// ══════════════════════════════════════════════════

Route::apiResource('buku', BukuController::class);
Route::apiResource('leaflet', LeafletController::class);
Route::apiResource('poster', PosterController::class);
Route::apiResource('regulasi', RegulasiController::class);

// Jenis Publikasi (Kategori khusus untuk Buku/Regulasi)
Route::apiResource('jenis', JenisController::class)->except(['show']);

// ══════════════════════════════════════════════════
// KELOMPOK 4: KONFIGURASI WEBSITE (Singleton + Navigasi)
// ══════════════════════════════════════════════════

// Website Setting (Singleton: hanya GET dan PUT, tidak ada index/store/destroy)
Route::get('/website', [WebsiteController::class, 'show']);
Route::put('/website', [WebsiteController::class, 'update']);

// Kepala Kantor & Menu Navigasi
Route::apiResource('kepala', KepalaController::class);
Route::apiResource('menus', MenuController::class);

// Kategori Konten
Route::apiResource('categories', CategoryController::class)->except(['show']);
```

---

## Troubleshooting

### Q: `php artisan route:list --path=cms` menampilkan list kosong!

**Artinya:** *ServiceProvider* belum terdaftar atau cache rute tersangkut.
**Solusi:** Jalankan berturut-turut:
```bash
php artisan optimize:clear
php artisan route:list --path=cms
```
Jika masih kosong, pastikan `CMSServiceProvider::class` sudah ada di `bootstrap/providers.php` (Issue 093).

### Q: Mengapa `admin.php` tidak perlu menulis `->middleware('auth:sanctum')`?

**Artinya:** Kamu bertanya tentang prinsip *Middleware Inheritance*.
**Solusi:** Pada Issue 093, kita telah memasang middleware di **tingkat ServiceProvider**:
```php
Route::prefix('api/cms/admin')
    ->middleware(['api', 'auth:sanctum', 'module.access:cms'])
    ->group(__DIR__ . '/../Routes/admin.php');
```
Semua rute yang ditulis di dalam `admin.php` otomatis **mewarisi** middleware tersebut. Menulis ulang middleware di dalam `admin.php` justru akan membuat *Double Checking* yang membuang waktu CPU.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): wire 70+ API endpoints across dual public/admin routing topologies" \
  --body "Merangkai seluruh gerbang lalu lintas Modul CMS. Memuat 20+ endpoint publik (GET-only) dan 50+ endpoint Admin (CRUD via apiResource). Detail di docs/issues/096-backend-cms-routes.md" \
  --label "backend,architecture,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/096-backend-cms-routes
```

### Step 3: Kerjakan

Ganti isi `public.php` dan `admin.php` secara menyeluruh. Jangan lupa aturan urutan: statis sebelum dinamis!

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(cms): wire 70+ API endpoints across dual public/admin routing topologies (#96)"
git push -u origin issue/096-backend-cms-routes
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): wire 70+ API endpoints across dual public/admin routing topologies (#96)" \
  --body "## Summary
Pemasangan kabel sirkuit final Backend CMS — menghubungkan 15 Controller ke 70+ gerbang API.

## Changes
- **public.php**: 20+ rute GET untuk melayani website pengunjung. Menggunakan pola *Slug Resolution* (\`/{slug}\`) untuk URL yang ramah mesin pencari.
- **admin.php**: 50+ rute CRUD menggunakan \`apiResource\` yang otomatis membuat 5 endpoint (index, store, show, update, destroy) per Controller.
- Penambahan endpoint khusus: \`PATCH /informasi/{id}/toggle-publish\` dan \`PATCH /pesan/{id}/read\`.
- Pengelompokan rute dalam 4 kluster tematik agar mudah dinavigasi.

## Rules Compliance
- [x] Lolos Doktrin Penyekatan (Rule 8.3): Seluruh rute tersegel di prefiks \`/api/cms/\`.
- [x] Lolos Doktrin Middleware Inheritance: Admin routes tidak menduplikasi middleware yang sudah dipasang di ServiceProvider.

Closes #96" \
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
Kita memiliki 2 file rute CMS yang masih berisi `/ping` bohongan. Saatnya menggantinya dengan 70+ endpoint sungguhan yang menghubungkan 15 Controller.

## Task

Kerjakan Issue #096 (Backend — CMS Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/096-backend-cms-routes.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buka `backend/app/Modules/CMS/Routes/public.php` — GANTI SELURUH isinya.
3. Buka `backend/app/Modules/CMS/Routes/admin.php` — GANTI SELURUH isinya.
4. PERINGATAN: Di `public.php`, pastikan `/informasi/terbaru` ditulis SEBELUM `/informasi/{slug}`!
5. Jalankan `php artisan optimize:clear` lalu verifikasi: `php artisan route:list --path=cms`.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
