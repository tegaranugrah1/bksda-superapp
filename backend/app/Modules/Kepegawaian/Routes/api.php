<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Kepegawaian\Controllers\EmployeeController;
use App\Modules\Kepegawaian\Controllers\EmployeeAccessController;

// Semua route di bawah ini otomatis memiliki prefix /api/kepegawaian/
Route::middleware(['auth:sanctum', 'module.access:kepegawaian'])->group(function () {

    // --- MANAJEMEN DATA PEGAWAI (CRUD) ---
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);

    // Operasi tulis/hapus hanya untuk Admin/SuperAdmin
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    });

    // --- MANAJEMEN HAK AKSES (IAM) ---
    // Hanya Super Admin yang boleh mengelola akses pintu ke modul lain
    Route::middleware('role:super_admin')->group(function () {
        Route::get('/employees/{employee}/access', [EmployeeAccessController::class, 'show']);
        Route::put('/employees/{employee}/access', [EmployeeAccessController::class, 'update']);
    });
});
