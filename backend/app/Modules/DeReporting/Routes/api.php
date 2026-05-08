<?php

use Illuminate\Support\Facades\Route;
use App\Modules\DeReporting\Controllers\OperatorController;

// Endpoint Modul Laporan Eksternal & Internal BKSDA
// Semua rute di bawah ini akan otomatis memiliki prefiks: /api/dereporting/

Route::get('/ping', function () {
    return response()->json(['message' => 'Modul DeReporting BKSDA menyala!']);
});

// Operator Delegation Routes (RBAC via IAM)
Route::middleware(['auth:sanctum', 'module.access:dereporting'])->group(function () {
    Route::get('/operators', [OperatorController::class, 'index']);
    Route::post('/operators', [OperatorController::class, 'store']);
    Route::put('/operators/{id}', [OperatorController::class, 'update']);
    Route::delete('/operators/{id}', [OperatorController::class, 'destroy']);
});
