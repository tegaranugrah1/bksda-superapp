<?php

use App\Modules\Surat\Controllers\SuratKeluarController;
use App\Modules\Surat\Controllers\SuratMasukController;
use App\Modules\Surat\Controllers\SuratTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'module.access:surat'])->group(function () {
    // Surat Masuk & Disposisi khusus Admin & Super Admin
    Route::middleware('role:admin,super_admin')->group(function () {
        Route::get('surat-masuk/next-agenda', [SuratMasukController::class, 'nextAgenda'])
            ->middleware('permission:surat.view');
        Route::get('surat-masuk/locations', [SuratMasukController::class, 'locations'])
            ->middleware('permission:surat.view');
        Route::get('surat-masuk/export/excel', [SuratMasukController::class, 'exportExcel'])
            ->middleware('permission:surat.export|surat.manage');

        Route::get('surat-masuk', [SuratMasukController::class, 'index'])->middleware('permission:surat.view');
        Route::post('surat-masuk', [SuratMasukController::class, 'store'])->middleware('permission:surat.create');
        Route::get('surat-masuk/{surat_masuk}', [SuratMasukController::class, 'show'])->whereNumber('surat_masuk')->middleware('permission:surat.view');
        Route::get('surat-masuk/{surat_masuk}/file', [SuratMasukController::class, 'downloadFile'])->whereNumber('surat_masuk')->middleware('permission:surat.view');
        Route::match(['put', 'patch'], 'surat-masuk/{surat_masuk}', [SuratMasukController::class, 'update'])->whereNumber('surat_masuk')->middleware('permission:surat.update');
        Route::delete('surat-masuk/{surat_masuk}', [SuratMasukController::class, 'destroy'])->whereNumber('surat_masuk')->middleware('permission:surat.delete');
    });

    // CRUD Surat Keluar (User scoped ke created_by miliknya sendiri di SuratKeluarController, Admin/Super Admin melihat semua)
    Route::get('surat-keluar', [SuratKeluarController::class, 'index'])->middleware('permission:surat.view');
    Route::post('surat-keluar', [SuratKeluarController::class, 'store'])->middleware('permission:surat.create');
    Route::get('surat-keluar/{surat_keluar}', [SuratKeluarController::class, 'show'])->whereNumber('surat_keluar')->middleware('permission:surat.view');
    Route::get('surat-keluar/{surat_keluar}/file', [SuratKeluarController::class, 'downloadFile'])->whereNumber('surat_keluar')->middleware('permission:surat.view');
    Route::match(['put', 'patch'], 'surat-keluar/{surat_keluar}', [SuratKeluarController::class, 'update'])->whereNumber('surat_keluar')->middleware('permission:surat.update');
    Route::delete('surat-keluar/{surat_keluar}', [SuratKeluarController::class, 'destroy'])->whereNumber('surat_keluar')->middleware('permission:surat.delete');

    // Manajemen Template Surat Dinas Resmi (Baca untuk semua pengguna modul surat, mutasi khusus Super Admin)
    Route::get('templates', [SuratTemplateController::class, 'index'])->middleware('permission:surat.view');
    Route::get('templates/{template}', [SuratTemplateController::class, 'show'])->middleware('permission:surat.view');
    Route::middleware(['role:super_admin', 'permission:surat.manage'])->group(function () {
        Route::post('templates', [SuratTemplateController::class, 'store']);
        Route::match(['put', 'patch'], 'templates/{template}', [SuratTemplateController::class, 'update'])->whereNumber('template');
        Route::delete('templates/{template}', [SuratTemplateController::class, 'destroy'])->whereNumber('template');
        Route::post('templates/reset-defaults', [SuratTemplateController::class, 'resetDefaults']);
    });
});
