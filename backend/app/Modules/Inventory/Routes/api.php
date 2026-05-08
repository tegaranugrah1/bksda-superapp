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
        'status'    => 'success',
        'message'   => '🛡️ BKSDA Inventory API is actively routing traffic!',
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
Route::get('/transactions', [StockController::class, 'history']);

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
