<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Bmn\Controllers\AssetController;
use App\Modules\Bmn\Controllers\LoanController;
use App\Modules\Bmn\Controllers\MaintenanceController;
use App\Modules\Bmn\Controllers\DashboardController;
use App\Modules\Bmn\Controllers\ExportController;

/*
|--------------------------------------------------------------------------
| BMN (Barang Milik Negara) Routes
|--------------------------------------------------------------------------
| Base URL Prefix: /api/bmn
| Perlindungan: auth:sanctum, module.access:bmn
|--------------------------------------------------------------------------
*/

Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'module' => 'BMN',
        'message' => '🏛️ Sirkuit Keuangan Barang Milik Negara Aktif & Terlindungi!'
    ]);
});

// 1. JALUR MASTER ASET
Route::apiResource('assets', AssetController::class)->except(['destroy']);
Route::delete('assets/{asset}/dispose', [AssetController::class, 'dispose']);

// 2. LALU LINTAS PEMINJAMAN (LOAN)
Route::get('loans', [LoanController::class, 'index']);
Route::post('assets/{asset}/loans', [LoanController::class, 'borrow']);
Route::post('loans/{loan}/return', [LoanController::class, 'return']);

// 3. REKAM MEDIS PEMELIHARAAN (MAINTENANCE)
Route::get('maintenances', [MaintenanceController::class, 'index']);
Route::post('assets/{asset}/maintenances', [MaintenanceController::class, 'record']);

// 4. EXPORT EXCEL
Route::get('assets/export', [ExportController::class, 'assets']);
Route::get('loans/export', [ExportController::class, 'loans']);
Route::get('maintenances/export', [ExportController::class, 'maintenances']);
