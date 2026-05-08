<?php

use Illuminate\Support\Facades\Route;

// Import 4 Pengendali Raksasa kita
use App\Modules\DeReporting\Controllers\MasterDataController;
use App\Modules\DeReporting\Controllers\InternalController;
use App\Modules\DeReporting\Controllers\EksternalController;
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
Route::post('/eksternals/public', [EksternalController::class, 'storePublic']);

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
        Route::get('/eksternals', [EksternalController::class, 'index']);
        Route::put('/eksternals/{id}/status', [EksternalController::class, 'updateStatus']);
        Route::get('/eksternals/{id}/download', [EksternalController::class, 'downloadFile']);
        Route::delete('/eksternals/{id}', [EksternalController::class, 'destroy']); // Ekstra fungsi buang laporan sampah
    });

});
