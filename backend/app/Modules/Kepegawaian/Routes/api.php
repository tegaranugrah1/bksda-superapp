<?php

use App\Modules\Kepegawaian\Controllers\EmployeeAccessController;
use App\Modules\Kepegawaian\Controllers\EmployeeController;
use Illuminate\Support\Facades\Route;

// Semua route di bawah ini otomatis memiliki prefix /api/kepegawaian/

// Public routes (untuk form surat tugas)
Route::get('/employees/select', [EmployeeController::class, 'select'])
    ->middleware('throttle:30,1');

Route::middleware(['auth:sanctum', 'module.access:kepegawaian'])->group(function () {

    // --- MANAJEMEN DATA PEGAWAI (CRUD) ---
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::get('/employees/{employee}/assignment-letters', [EmployeeController::class, 'assignmentLetters']);

    // Operasi tulis/hapus hanya untuk Admin/SuperAdmin
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::post('/employees/{employee}/photo', [EmployeeController::class, 'updatePhoto']);
        Route::post('/employees/{employee}/reset-password', [EmployeeController::class, 'resetPassword']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);

        // --- MANAJEMEN CUTI PEGAWAI (PERBKN 24/2017 & 7/2021) ---
        Route::get('/employees/{employee}/leaves', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'show']);
        Route::post('/employees/{employee}/leaves', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'store']);

        // --- INBOX SURAT CUTI (ADMIN KEPEGAWAIAN) ---
        Route::get('/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminIndex']);
        Route::get('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminShow']);
        Route::put('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUpdate']);
        Route::delete('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminDestroy']);
        Route::put('/leave-requests/{id}/status', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUpdateStatus']);
    });

    // --- MANAJEMEN HAK AKSES (IAM) ---
    // Hanya Super Admin yang boleh mengelola akses pintu ke modul lain
    Route::middleware('role:super_admin')->group(function () {
        Route::get('/employees/{employee}/access', [EmployeeAccessController::class, 'show']);
        Route::put('/employees/{employee}/access', [EmployeeAccessController::class, 'update']);
    });
});
