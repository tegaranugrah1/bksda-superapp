<?php

use App\Modules\Surat\Controllers\SuratKeluarController;
use App\Modules\Surat\Controllers\SuratMasukController;
use App\Modules\Surat\Controllers\SuratTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'module.access:surat'])->group(function () {
    // Next Agenda helper (read access)
    Route::get('surat-masuk/next-agenda', [SuratMasukController::class, 'nextAgenda'])
        ->middleware('permission:surat.view');

    // Master lokasi / ruangan penerus untuk disposisi surat
    Route::get('surat-masuk/locations', [SuratMasukController::class, 'locations'])
        ->middleware('permission:surat.view');

    // Export (requires export permission)
    Route::get('surat-masuk/export/excel', [SuratMasukController::class, 'exportExcel'])
        ->middleware('permission:surat.export|surat.manage');

    // CRUD Surat Masuk with granular permissions
    Route::get('surat-masuk', [SuratMasukController::class, 'index'])->middleware('permission:surat.view');
    Route::post('surat-masuk', [SuratMasukController::class, 'store'])->middleware('permission:surat.create');
    Route::get('surat-masuk/{surat_masuk}', [SuratMasukController::class, 'show'])->middleware('permission:surat.view');
    Route::match(['put', 'patch'], 'surat-masuk/{surat_masuk}', [SuratMasukController::class, 'update'])->middleware('permission:surat.update');
    Route::delete('surat-masuk/{surat_masuk}', [SuratMasukController::class, 'destroy'])->middleware('permission:surat.delete');

    // CRUD Surat Keluar with granular permissions
    Route::get('surat-keluar', [SuratKeluarController::class, 'index'])->middleware('permission:surat.view');
    Route::post('surat-keluar', [SuratKeluarController::class, 'store'])->middleware('permission:surat.create');
    Route::get('surat-keluar/{surat_keluar}', [SuratKeluarController::class, 'show'])->middleware('permission:surat.view');
    Route::match(['put', 'patch'], 'surat-keluar/{surat_keluar}', [SuratKeluarController::class, 'update'])->middleware('permission:surat.update');
    Route::delete('surat-keluar/{surat_keluar}', [SuratKeluarController::class, 'destroy'])->middleware('permission:surat.delete');

    // Manajemen Template Surat Dinas Resmi
    Route::get('templates', [SuratTemplateController::class, 'index'])->middleware('permission:surat.view');
    Route::get('templates/{template}', [SuratTemplateController::class, 'show'])->middleware('permission:surat.view');
    Route::post('templates', [SuratTemplateController::class, 'store'])->middleware('permission:surat.manage');
    Route::match(['put', 'patch'], 'templates/{template}', [SuratTemplateController::class, 'update'])->middleware('permission:surat.manage');
    Route::delete('templates/{template}', [SuratTemplateController::class, 'destroy'])->middleware('permission:surat.manage');
    Route::post('templates/reset-defaults', [SuratTemplateController::class, 'resetDefaults'])->middleware('permission:surat.manage');
});
