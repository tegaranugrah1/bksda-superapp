<?php

use Illuminate\Support\Facades\Route;
use App\Modules\SuratTugas\Controllers\AssignmentLetterController;

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => '📡 Signal received! Modul Surat Tugas telah mengudara dan siap beroperasi.'
    ]);
});

Route::middleware(['auth:sanctum', 'module.access:surat-tugas'])->group(function () {
    Route::get('/surat', [AssignmentLetterController::class, 'index']);
    Route::post('/surat', [AssignmentLetterController::class, 'store']);
    Route::get('/surat/{id}', [AssignmentLetterController::class, 'show']);
    Route::put('/surat/{id}', [AssignmentLetterController::class, 'update']);
    Route::delete('/surat/{id}', [AssignmentLetterController::class, 'destroy']);
    Route::post('/surat/{id}/restore', [AssignmentLetterController::class, 'restore']);
    Route::delete('/surat/{id}/force', [AssignmentLetterController::class, 'forceDestroy']);
    Route::put('/surat/{id}/status', [AssignmentLetterController::class, 'updateStatus']);
    Route::get('/surat/{id}/download', [AssignmentLetterController::class, 'downloadPdf']);
});
