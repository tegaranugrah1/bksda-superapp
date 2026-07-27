<?php

use App\Modules\Surat\Controllers\SuratKeluarController;
use App\Modules\Surat\Controllers\SuratMasukController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::apiResource('surat-masuk', SuratMasukController::class);
    Route::apiResource('surat-keluar', SuratKeluarController::class);
});
