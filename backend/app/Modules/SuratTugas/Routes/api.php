<?php

use App\Modules\SuratTugas\Controllers\AssignmentLetterController;
use Illuminate\Support\Facades\Route;

Route::get('/verify/{id}', [AssignmentLetterController::class, 'verify'])
    ->name('surat-tugas.verify');

Route::post('/submit', [AssignmentLetterController::class, 'store'])
    ->middleware('throttle:10,1'); // Public submit - rate limit 10 per menit

Route::middleware(['auth:sanctum', 'module.access:surat_tugas'])->group(function () {

    Route::post('/', [AssignmentLetterController::class, 'store']);
    Route::put('/{id}/status', [AssignmentLetterController::class, 'updateStatus']);
    Route::delete('/{id}', [AssignmentLetterController::class, 'destroy']);
    Route::post('/{id}/restore', [AssignmentLetterController::class, 'restore']);

    Route::get('/', [AssignmentLetterController::class, 'index']);
    Route::get('/utils/next-number', [AssignmentLetterController::class, 'getNextNumber']);
    Route::get('/{id}', [AssignmentLetterController::class, 'show']);
    Route::put('/{id}', [AssignmentLetterController::class, 'update']);
    Route::put('/{id}/approve', [AssignmentLetterController::class, 'approve']);
    Route::post('/direct', [AssignmentLetterController::class, 'directStore']);
    Route::delete('/{id}/force', [AssignmentLetterController::class, 'forceDestroy']);
    Route::get('/{id}/download', [AssignmentLetterController::class, 'downloadPdf']);
});
