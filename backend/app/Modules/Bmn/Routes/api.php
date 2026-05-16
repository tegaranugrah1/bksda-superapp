<?php

use App\Modules\Bmn\Controllers\AssetController;
use App\Modules\Bmn\Controllers\AssetPhotoController;
use App\Modules\Bmn\Controllers\DashboardController;
use App\Modules\Bmn\Controllers\ExportController;
use App\Modules\Bmn\Controllers\ImportReviewController;
use App\Modules\Bmn\Controllers\LoanController;
use App\Modules\Bmn\Controllers\MaintenanceController;
use Illuminate\Support\Facades\Route;

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
        'message' => '🏛️ Sirkuit Keuangan Barang Milik Negara Aktif & Terlindungi!',
    ]);
});

// 4. EXPORT EXCEL (harus sebelum apiResource agar tidak conflict)
Route::get('assets/export', [ExportController::class, 'assets']);
Route::get('loans/export', [ExportController::class, 'loans']);
Route::get('maintenances/export', [ExportController::class, 'maintenances']);

// 1. JALUR MASTER ASET
Route::apiResource('assets', AssetController::class)->except(['destroy']);
Route::post('assets/import', [AssetController::class, 'import']);
Route::delete('assets/{asset}/dispose', [AssetController::class, 'dispose']);
Route::post('assets/bulk-dispose', [AssetController::class, 'bulkDispose']);
Route::post('assets/bulk-restore', [AssetController::class, 'bulkRestore']);
Route::post('assets/bulk-force-delete', [AssetController::class, 'bulkForceDelete']);
Route::post('assets/bulk-update-kondisi', [AssetController::class, 'bulkUpdateKondisi']);
Route::post('assets/{asset}/verify', [AssetController::class, 'verify']);

// 6. IMPORT REVIEW/DIFF/APPROVE
Route::prefix('import-review')->group(function () {
    Route::get('/', [ImportReviewController::class, 'index']);
    Route::post('/upload', [ImportReviewController::class, 'upload']);
    Route::get('/{batchId}', [ImportReviewController::class, 'show']);
    Route::post('/{batchId}/approve', [ImportReviewController::class, 'approve']);
    Route::post('/{batchId}/reject', [ImportReviewController::class, 'reject']);
    Route::post('/toggle-selection', [ImportReviewController::class, 'toggleSelection']);
});

// 5. FOTO ASET
Route::post('assets/{asset}/photo', [AssetPhotoController::class, 'upload']);
Route::put('assets/{asset}/geotag', [AssetPhotoController::class, 'updateGeotag']);
Route::delete('assets/{asset}/photo/{type}', [AssetPhotoController::class, 'delete']);
Route::get('assets/{asset}/photo/{type}/download', [AssetPhotoController::class, 'download']);
Route::get('assets/{asset}/photos/download-all', [AssetPhotoController::class, 'downloadAll']);

// 2. LALU LINTAS PEMINJAMAN (LOAN)
Route::get('loans', [LoanController::class, 'index']);
Route::post('assets/{asset}/loans', [LoanController::class, 'borrow']);
Route::post('loans/{loan}/return', [LoanController::class, 'return']);

// 3. REKAM MEDIS PEMELIHARAAN (MAINTENANCE)
Route::get('maintenances', [MaintenanceController::class, 'index']);
Route::post('assets/{asset}/maintenances', [MaintenanceController::class, 'record']);
