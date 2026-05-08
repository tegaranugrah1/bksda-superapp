<?php

use Illuminate\Support\Facades\Route;

// Import seluruh 17 Controller Admin
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
