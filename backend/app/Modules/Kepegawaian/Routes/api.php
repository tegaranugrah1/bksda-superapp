<?php

use App\Modules\Kepegawaian\Controllers\EmployeeAccessController;
use App\Modules\Kepegawaian\Controllers\EmployeeController;
use App\Modules\Kepegawaian\Controllers\EmployeeIncomingLetterController;
use Illuminate\Support\Facades\Route;

// Semua route di bawah ini otomatis memiliki prefix /api/kepegawaian/

// Protected routes for internal employee selection & templates (requires login)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/employees/select', [EmployeeController::class, 'select'])
        ->middleware('throttle:120,1');
    Route::get('/st-expense-templates/public', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'index'])
        ->middleware('throttle:120,1');
});

Route::middleware(['auth:sanctum', 'module.access:kepegawaian'])->group(function () {

    // Arsip riwayat surat masuk Kepegawaian.
    Route::get('/surat-masuk', [EmployeeIncomingLetterController::class, 'index']);
    Route::get('/surat-masuk/export/excel', [EmployeeIncomingLetterController::class, 'export']);
    Route::get('/surat-masuk/{letter}', [EmployeeIncomingLetterController::class, 'show']);
    Route::get('/surat-masuk/{letter}/attachments/{attachment}/preview', [EmployeeIncomingLetterController::class, 'preview']);
    Route::get('/surat-masuk/{letter}/attachments/{attachment}/download/{filename?}', [EmployeeIncomingLetterController::class, 'download'])
        ->where('filename', '.*');

    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/surat-masuk', [EmployeeIncomingLetterController::class, 'store']);
        Route::post('/surat-masuk/{letter}', [EmployeeIncomingLetterController::class, 'update']);
        Route::delete('/surat-masuk/{letter}/attachments/{attachment}', [EmployeeIncomingLetterController::class, 'destroyAttachment']);
        Route::delete('/surat-masuk/{letter}', [EmployeeIncomingLetterController::class, 'destroy']);
    });

    // --- MANAJEMEN DATA PEGAWAI (CRUD) ---
    Route::get('/dashboard-stats', [EmployeeController::class, 'dashboardStats']);
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::get('/employees/{employee}/assignment-letters', [EmployeeController::class, 'assignmentLetters']);

    // --- TEMPLATE SURAT TUGAS ---
    Route::get('/st-templates', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'index']);
    Route::get('/st-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'show']);
    Route::middleware('role:super_admin')->group(function () {
        Route::post('/st-templates', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'store']);
        Route::put('/st-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'update']);
        Route::post('/st-templates/{id}/set-default', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'setDefault']);
        Route::patch('/st-templates/{id}/toggle-active', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'toggleActive']);
        Route::post('/st-templates/{id}/duplicate', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'duplicate']);
        Route::delete('/st-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'destroy']);
        Route::post('/st-templates/upload-kop', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'uploadKop']);
    });

    // --- TEMPLATE BIAYA / SUMBER DANA ---
    Route::get('/st-expense-templates', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'index']);
    Route::get('/st-expense-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'show']);
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/st-expense-templates', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'store']);
        Route::put('/st-expense-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'update']);
        Route::post('/st-expense-templates/{id}/set-default', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'setDefault']);
        Route::patch('/st-expense-templates/{id}/toggle-active', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'toggleActive']);
        Route::post('/st-expense-templates/{id}/duplicate', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'duplicate']);
        Route::delete('/st-expense-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'destroy']);
    });

    // --- MASTER JENIS SURAT CUTI ---
    Route::get('/leave-types', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'index']);
    Route::get('/leave-types/{id}', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'show']);
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/leave-types', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'store']);
        Route::put('/leave-types/{id}', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'update']);
        Route::patch('/leave-types/{id}/toggle-active', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'toggleActive']);
        Route::delete('/leave-types/{id}', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'destroy']);
    });

    // --- MANAJEMEN CUTI PEGAWAI (READ BALANCE) ---
    Route::get('/employees/{employee}/leaves', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'show']);

    // Operasi tulis/hapus hanya untuk Admin/SuperAdmin
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::post('/employees/{employee}/photo', [EmployeeController::class, 'updatePhoto']);
        Route::post('/employees/{employee}/reset-password', [EmployeeController::class, 'resetPassword']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);

        // --- MANAJEMEN CUTI PEGAWAI WRITE (PERBKN 24/2017 & 7/2021) ---
        Route::post('/employees/{employee}/leaves', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'store']);
        Route::post('/employees/{employee}/leave-records', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'storeRecord']);
        Route::match(['put', 'post'], '/employees/{employee}/leave-records/{requestId}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'updateRecord']);
        Route::delete('/employees/{employee}/leave-records/{requestId}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'destroyRecord']);

        // --- INBOX SURAT CUTI (ADMIN KEPEGAWAIAN) ---
        Route::get('/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminIndex']);
        Route::get('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminShow']);
        Route::put('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUpdate']);
        Route::delete('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminDestroy']);
        Route::put('/leave-requests/{id}/status', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUpdateStatus']);
        Route::post('/leave-requests/{id}/approve', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminApprove']);
        Route::post('/leave-requests/{id}/upload-scan', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUploadScan']);
        Route::get('/leave-requests/{id}/scan', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminViewScan']);
    });

    // --- MANAJEMEN HAK AKSES (IAM) ---
    // Hanya Super Admin yang boleh mengelola akses pintu ke modul lain
    Route::middleware('role:super_admin')->group(function () {
        Route::get('/employees/{employee}/access', [EmployeeAccessController::class, 'show']);
        Route::put('/employees/{employee}/access', [EmployeeAccessController::class, 'update']);
    });
});
