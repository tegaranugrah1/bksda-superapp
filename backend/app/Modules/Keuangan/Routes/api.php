<?php

use App\Modules\Keuangan\Controllers\VisumSpdController;
use Illuminate\Support\Facades\Route;

// Public or Protected Visum SPD Settings & Templates API
Route::prefix('keuangan/visum')->group(function () {
    Route::get('/settings', [VisumSpdController::class, 'getSettings']);
    Route::put('/settings', [VisumSpdController::class, 'updateSettings']);

    Route::get('/templates', [VisumSpdController::class, 'getTemplates']);
    Route::post('/templates', [VisumSpdController::class, 'storeTemplate']);
    Route::put('/templates/{id}', [VisumSpdController::class, 'updateTemplate']);
    Route::post('/templates/{id}/duplicate', [VisumSpdController::class, 'duplicateTemplate']);
    Route::delete('/templates/{id}', [VisumSpdController::class, 'deleteTemplate']);
    Route::post('/templates/{id}/set-default', [VisumSpdController::class, 'setDefaultTemplate']);
});
