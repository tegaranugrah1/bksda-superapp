<?php

use App\Modules\Keuangan\Controllers\SpjController;
use App\Modules\Keuangan\Controllers\VisumSpdController;
use Illuminate\Support\Facades\Route;

// Protected SPJ Management API
Route::middleware(['auth:sanctum', 'module.access:keuangan'])->prefix('keuangan/spj')->group(function () {
    Route::get('/', [SpjController::class, 'index']);
    Route::post('/', [SpjController::class, 'store']);
    Route::post('/export-excel', [SpjController::class, 'exportExcel']);
    Route::get('/{id}/export-excel', [SpjController::class, 'exportExcelById']);
    Route::get('/{id}', [SpjController::class, 'show']);
    Route::put('/{id}', [SpjController::class, 'update']);
    Route::delete('/{id}', [SpjController::class, 'destroy']);
    Route::patch('/{id}/status', [SpjController::class, 'updateStatus']);
});

// Protected Visum SPD Settings & Templates API (Requires Login & Keuangan Access)
Route::middleware(['auth:sanctum', 'module.access:keuangan'])->prefix('keuangan/visum')->group(function () {
    Route::get('/settings', [VisumSpdController::class, 'getSettings'])->middleware('throttle:120,1');
    Route::get('/templates', [VisumSpdController::class, 'getTemplates'])->middleware('throttle:120,1');

    Route::middleware(['role:admin,super_admin', 'throttle:30,1'])->group(function () {
        Route::match(['post', 'put'], '/settings', [VisumSpdController::class, 'updateSettings']);

        Route::post('/templates', [VisumSpdController::class, 'storeTemplate']);
        Route::put('/templates/{id}', [VisumSpdController::class, 'updateTemplate'])->whereNumber('id');
        Route::post('/templates/{id}/duplicate', [VisumSpdController::class, 'duplicateTemplate'])->whereNumber('id');
        Route::delete('/templates/{id}', [VisumSpdController::class, 'deleteTemplate'])->whereNumber('id');
        Route::post('/templates/{id}/set-default', [VisumSpdController::class, 'setDefaultTemplate'])->whereNumber('id');
    });
});
