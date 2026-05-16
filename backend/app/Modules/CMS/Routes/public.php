<?php

use App\Modules\CMS\Controllers\Public\PublicController;
use Illuminate\Support\Facades\Route;

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
Route::get('/home', [PublicController::class, 'home']);
Route::get('/page/{slug}', [PublicController::class, 'pageShow']);
Route::get('/website', [PublicController::class, 'website']);
Route::get('/kepala', [PublicController::class, 'kepala']);
Route::get('/menus', [PublicController::class, 'menus']);
Route::get('/categories', [PublicController::class, 'categoryIndex']);
Route::get('/links', [PublicController::class, 'linkIndex']);

// ── BERITA / INFORMASI ──
// PERINGATAN: Rute statis HARUS di atas rute dinamis {slug}!
Route::get('/informasi/terbaru', [PublicController::class, 'informasiTerbaru']);
Route::get('/informasi', [PublicController::class, 'informasiIndex']);
Route::get('/informasi/{slug}', [PublicController::class, 'informasiShow']);

// ── PROFIL ORGANISASI ──
Route::get('/profil', [PublicController::class, 'profilIndex']);
Route::get('/profil/{slug}', [PublicController::class, 'profilShow']);

// ── KAWASAN KONSERVASI ──
Route::get('/kawasan', [PublicController::class, 'kawasanIndex']);
Route::get('/kawasan/{slug}', [PublicController::class, 'kawasanShow']);

// ── TSL (Tumbuhan & Satwa Liar) ──
Route::get('/tsl', [PublicController::class, 'tslIndex']);
Route::get('/tsl/{slug}', [PublicController::class, 'tslShow']);

// ── GALERI ──
Route::get('/photos', [PublicController::class, 'photoIndex']);
Route::get('/videos', [PublicController::class, 'videoIndex']);

// ── PUBLIKASI ──
Route::get('/buku', [PublicController::class, 'bukuIndex']);
Route::get('/leaflet', [PublicController::class, 'leafletIndex']);
Route::get('/poster', [PublicController::class, 'posterIndex']);
Route::get('/regulasi', [PublicController::class, 'regulasiIndex']);
