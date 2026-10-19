<?php

use App\Modules\SuratTugas\Controllers\AssignmentLetterController;
use Illuminate\Support\Facades\Route;

Route::get('/verify/{id}', [AssignmentLetterController::class, 'verify'])
    ->middleware('throttle:60,1')
    ->name('surat-tugas.verify');

// Portal & Mobile: pegawai bisa membuat surat tugas dan melihat surat tugas milik sendiri
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/submit', [AssignmentLetterController::class, 'store'])
        ->middleware('throttle:15,1');
    Route::get('/my', [AssignmentLetterController::class, 'myLetters'])
        ->middleware('throttle:120,1');
    Route::get('/my/{id}', [AssignmentLetterController::class, 'myShow'])
        ->middleware('throttle:120,1');
    Route::get('/my/{id}/download', [AssignmentLetterController::class, 'myDownload'])
        ->middleware('throttle:30,1');
});

Route::middleware(['auth:sanctum', 'module.access:surat_tugas,kepegawaian'])->group(function () {

    Route::post('/', [AssignmentLetterController::class, 'store']);
    Route::put('/{id}/status', [AssignmentLetterController::class, 'updateStatus']);
    Route::delete('/{id}', [AssignmentLetterController::class, 'destroy']);
    Route::post('/{id}/restore', [AssignmentLetterController::class, 'restore']);

    Route::get('/', [AssignmentLetterController::class, 'index']);
    Route::get('/status-counts', [AssignmentLetterController::class, 'statusCounts']);
    Route::post('/bulk-trash', [AssignmentLetterController::class, 'bulkTrash']);
    Route::post('/bulk-restore', [AssignmentLetterController::class, 'bulkRestore']);
    Route::get('/utils/next-number', [AssignmentLetterController::class, 'getNextNumber']);
    Route::get('/{id}', [AssignmentLetterController::class, 'show']);
    Route::put('/{id}', [AssignmentLetterController::class, 'update']);
    Route::put('/{id}/approve', [AssignmentLetterController::class, 'approve']);
    Route::delete('/{id}/force', [AssignmentLetterController::class, 'forceDestroy'])->middleware('role:super_admin,admin');
    Route::get('/{id}/download', [AssignmentLetterController::class, 'downloadPdf']);
});
