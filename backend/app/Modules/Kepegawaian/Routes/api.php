<?php

use App\Modules\Kepegawaian\Controllers\EmployeeAccessController;
use App\Modules\Kepegawaian\Controllers\EmployeeController;
use App\Modules\Kepegawaian\Controllers\EmployeeIncomingLetterController;
use Illuminate\Support\Facades\Route;

// Semua route di bawah ini otomatis memiliki prefix /api/kepegawaian/

// Public routes for Surat Tugas form (personnel select, templates, task types)
Route::get('/employees/select', [EmployeeController::class, 'select'])
    ->middleware('throttle:120,1');
Route::get('/st-expense-templates/public', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'index'])
    ->middleware('throttle:120,1');
Route::get('/st-task-types/public', [\App\Modules\Kepegawaian\Controllers\StTaskTypeController::class, 'publicList'])
    ->middleware('throttle:120,1');

// Protected routes for master cuti (requires login)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/leave-types', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'index'])
        ->middleware('throttle:240,1,leave_types');
    Route::get('/leave-types/{id}', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'show'])
        ->whereNumber('id')
        ->middleware('throttle:240,1,leave_types_show');
});

Route::middleware(['auth:sanctum', 'module.access:kepegawaian'])->group(function () {

    // Arsip riwayat surat masuk Kepegawaian (Khusus Admin & Super Admin)
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('/surat-masuk', [EmployeeIncomingLetterController::class, 'index']);
        Route::get('/surat-masuk/export/excel', [EmployeeIncomingLetterController::class, 'export']);
        Route::get('/surat-masuk/{letter}', [EmployeeIncomingLetterController::class, 'show'])->whereNumber('letter');
        Route::get('/surat-masuk/{letter}/attachments/{attachment}/preview', [EmployeeIncomingLetterController::class, 'preview'])->whereNumber(['letter', 'attachment']);
        Route::get('/surat-masuk/{letter}/attachments/{attachment}/download/{filename?}', [EmployeeIncomingLetterController::class, 'download'])
            ->whereNumber(['letter', 'attachment'])
            ->where('filename', '.*');
        Route::post('/surat-masuk', [EmployeeIncomingLetterController::class, 'store']);
        Route::post('/surat-masuk/{letter}', [EmployeeIncomingLetterController::class, 'update'])->whereNumber('letter');
        Route::delete('/surat-masuk/{letter}/attachments/{attachment}', [EmployeeIncomingLetterController::class, 'destroyAttachment'])->whereNumber(['letter', 'attachment']);
        Route::delete('/surat-masuk/{letter}', [EmployeeIncomingLetterController::class, 'destroy'])->whereNumber('letter');
    });

    // --- MANAJEMEN DATA PEGAWAI (DIREKTORI & PROFIL) ---
    Route::get('/dashboard-stats', [EmployeeController::class, 'dashboardStats']);
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show'])->whereNumber('employee');
    Route::get('/employees/{employee}/assignment-letters', [EmployeeController::class, 'assignmentLetters'])->whereNumber('employee');
    Route::get('/employees/{employee}/meal-allowances', [EmployeeController::class, 'mealAllowances'])->whereNumber('employee');
    Route::get('/settings/registered-banks', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'getRegisteredBanks']);

    // --- BACA TEMPLATE SURAT TUGAS, BIAYA, & JENIS TUGAS ---
    Route::get('/st-templates', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'index']);
    Route::get('/st-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'show'])->whereNumber('id');
    Route::get('/st-expense-templates', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'index']);
    Route::get('/st-expense-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'show'])->whereNumber('id');
    Route::get('/st-task-types', [\App\Modules\Kepegawaian\Controllers\StTaskTypeController::class, 'index']);

    // --- MANAJEMEN CUTI PEGAWAI (READ BALANCE - SCOPED DI CONTROLLER UNTUK USER) ---
    Route::get('/employees/{employee}/leaves', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'show'])->whereNumber('employee');

    // Operasi operasional SDM untuk Admin & SuperAdmin (tanpa Setting Master & tanpa Force Delete)
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('/employees/{employee}/histories', [EmployeeController::class, 'histories'])->whereNumber('employee');
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->whereNumber('employee');
        Route::post('/employees/{employee}/photo', [EmployeeController::class, 'updatePhoto'])->whereNumber('employee');
        Route::post('/employees/{employee}/reset-password', [EmployeeController::class, 'resetPassword'])->whereNumber('employee');
        Route::post('/employees/{employee}/lifecycle', [EmployeeController::class, 'updateLifecycle'])->whereNumber('employee');
        Route::get('/employees/{employee}/bmn-clearance', [EmployeeController::class, 'bmnClearance'])->whereNumber('employee');
        Route::delete('/employees/{employee}/2fa', [EmployeeController::class, 'reset2Fa'])->whereNumber('employee');
        Route::post('/employees/{id}/restore', [EmployeeController::class, 'restore'])->whereNumber('id');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->whereNumber('employee');

        // --- MANAJEMEN CUTI PEGAWAI WRITE (PERBKN 24/2017 & 7/2021) ---
        Route::post('/employees/{employee}/leaves', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'store'])->whereNumber('employee');
        Route::post('/employees/{employee}/leave-records', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'storeRecord'])->whereNumber('employee');
        Route::match(['put', 'post'], '/employees/{employee}/leave-records/{requestId}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'updateRecord'])->whereNumber(['employee', 'requestId']);
        Route::delete('/employees/{employee}/leave-records/{requestId}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveController::class, 'destroyRecord'])->whereNumber(['employee', 'requestId']);

        // --- INBOX SURAT CUTI (ADMIN KEPEGAWAIAN) ---
        Route::get('/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminIndex']);
        Route::get('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminShow'])->whereNumber('id');
        Route::put('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUpdate'])->whereNumber('id');
        Route::delete('/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminDestroy'])->whereNumber('id');
        Route::put('/leave-requests/{id}/status', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUpdateStatus'])->whereNumber('id');
        Route::post('/leave-requests/{id}/approve', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminApprove'])->whereNumber('id');
        Route::post('/leave-requests/{id}/upload-scan', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminUploadScan'])->whereNumber('id');
        Route::delete('/leave-requests/{id}/scan', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminDeleteScan'])->whereNumber('id');
        Route::get('/leave-requests/{id}/scan', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminViewScan'])->whereNumber('id');
        Route::get('/leave-requests/{id}/scan-formulir', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminViewScanFormulir'])->whereNumber('id');
        Route::get('/leave-requests/{id}/scan-surat-izin', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'adminViewScanSuratIzin'])->whereNumber('id');
        Route::get('/leave-requests/{id}/preview-surat-izin', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'previewSuratIzin'])->whereNumber('id');
        Route::post('/leave-requests/{id}/generate-surat-izin', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'generateSuratIzin'])->whereNumber('id');

        // --- HITUNG UANG MAKAN & REKONSILIASI PRESENSI SIKADIR ---
        Route::get('/uang-makan/calendar', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'getCalendar']);
        Route::post('/uang-makan/reconcile', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'reconcile'])
            ->middleware('throttle:60,1');
        Route::post('/uang-makan/batches', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'storeBatch']);
        Route::get('/uang-makan/batches', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'indexBatches']);
        Route::get('/uang-makan/batches/{id}', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'showBatch'])->whereNumber('id');
        Route::delete('/uang-makan/batches/{id}', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'destroyBatch'])->whereNumber('id');
        Route::post('/uang-makan/export-excel', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'exportExcel'])
            ->middleware('throttle:60,1');
    });

    // --- KONFIGURASI SETTING KEPEGAWAIAN, HAPUS PERMANEN, & MANAJEMEN HAK AKSES (IAM) ---
    // Khusus Super Admin (Admin biasa tidak dapat membuka /kepegawaian/settings, IAM, maupun Force Delete)
    Route::middleware('role:super_admin')->group(function () {
        Route::delete('/employees/{id}/force', [EmployeeController::class, 'forceDestroy'])->whereNumber('id');

        Route::post('/st-templates', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'store']);
        Route::put('/st-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'update'])->whereNumber('id');
        Route::post('/st-templates/{id}/set-default', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'setDefault'])->whereNumber('id');
        Route::patch('/st-templates/{id}/toggle-active', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'toggleActive'])->whereNumber('id');
        Route::post('/st-templates/{id}/duplicate', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'duplicate'])->whereNumber('id');
        Route::delete('/st-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'destroy'])->whereNumber('id');
        Route::post('/st-templates/upload-kop', [\App\Modules\Kepegawaian\Controllers\StTemplateController::class, 'uploadKop']);

        Route::post('/st-expense-templates', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'store']);
        Route::put('/st-expense-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'update'])->whereNumber('id');
        Route::post('/st-expense-templates/{id}/set-default', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'setDefault'])->whereNumber('id');
        Route::patch('/st-expense-templates/{id}/toggle-active', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'toggleActive'])->whereNumber('id');
        Route::post('/st-expense-templates/{id}/duplicate', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'duplicate'])->whereNumber('id');
        Route::delete('/st-expense-templates/{id}', [\App\Modules\Kepegawaian\Controllers\StExpenseTemplateController::class, 'destroy'])->whereNumber('id');

        Route::post('/leave-types', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'store']);
        Route::put('/leave-types/{id}', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'update'])->whereNumber('id');
        Route::patch('/leave-types/{id}/toggle-active', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'toggleActive'])->whereNumber('id');
        Route::delete('/leave-types/{id}', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'destroy'])->whereNumber('id');

        Route::post('/st-task-types', [\App\Modules\Kepegawaian\Controllers\StTaskTypeController::class, 'store']);
        Route::put('/st-task-types/{id}', [\App\Modules\Kepegawaian\Controllers\StTaskTypeController::class, 'update'])->whereNumber('id');
        Route::delete('/st-task-types/{id}', [\App\Modules\Kepegawaian\Controllers\StTaskTypeController::class, 'destroy'])->whereNumber('id');

        Route::get('/settings/holidays', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'getHolidaySettings']);
        Route::post('/settings/holidays', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'storeHolidaySetting']);
        Route::delete('/settings/holidays/{id}', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'destroyHolidaySetting']);
        Route::get('/settings/employee-banks', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'getEmployeeBanks']);
        Route::put('/settings/employee-banks/batch', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'batchUpdateEmployeeBanks']);
        Route::post('/settings/registered-banks', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'storeRegisteredBank']);
        Route::delete('/settings/registered-banks/{bank}', [\App\Modules\Kepegawaian\Controllers\MealAllowanceController::class, 'destroyRegisteredBank']);

        Route::get('/employees/{employee}/access', [EmployeeAccessController::class, 'show'])->whereNumber('employee');
        Route::put('/employees/{employee}/access', [EmployeeAccessController::class, 'update'])->whereNumber('employee');
    });
});
