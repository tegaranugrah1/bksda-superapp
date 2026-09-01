<?php

use App\Modules\Keuangan\Controllers\SpjController;
use App\Modules\Keuangan\Controllers\VisumSpdController;
use Illuminate\Support\Facades\Route;

// Protected SPJ Management API
Route::middleware('auth:sanctum')->prefix('keuangan/spj')->group(function () {
    Route::get('/', [SpjController::class, 'index']);
    Route::post('/', [SpjController::class, 'store']);
    Route::get('/{id}', [SpjController::class, 'show']);
    Route::put('/{id}', [SpjController::class, 'update']);
    Route::delete('/{id}', [SpjController::class, 'destroy']);
    Route::patch('/{id}/status', [SpjController::class, 'updateStatus']);
});

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
