<?php

use App\Modules\Surat\Controllers\SuratKeluarController;
use App\Modules\Surat\Controllers\SuratMasukController;
use App\Modules\Surat\Controllers\SuratTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'module.access:surat'])->group(function () {
    Route::get('surat-masuk/export/excel', [SuratMasukController::class, 'exportExcel']);
    Route::apiResource('surat-masuk', SuratMasukController::class);
    Route::apiResource('surat-keluar', SuratKeluarController::class);

    // Manajemen Template Surat Dinas Resmi
    Route::post('templates/reset-defaults', [SuratTemplateController::class, 'resetDefaults']);
    Route::apiResource('templates', SuratTemplateController::class);
});
