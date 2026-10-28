<?php

use Illuminate\Support\Facades\Route;

// Fallback login route (prevents "Route [login] not defined" error)
Route::get('/login', fn () => response()->json(['message' => 'Unauthenticated'], 401))->name('login');

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Route yang didefinisikan di sini otomatis mendapat prefix /api.
| Route per modul di-register via ServiceProvider masing-masing.
|
| Auth routes (login, logout, me) → ditambahkan di Issue #011
| Module routes → di-register oleh {ModuleName}ServiceProvider
|
*/

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
    ]);
});

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MobileDashboardController;
use App\Http\Controllers\Api\PortalNotificationController;

// Public Auth Route
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Protected Auth Routes (wajib bawa Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me'])->middleware('throttle:120,1');
    Route::get('/me', [AuthController::class, 'me'])->middleware('throttle:120,1');
    Route::get('/me/dashboard', [AuthController::class, 'dashboard'])->middleware('throttle:120,1');
    Route::get('/mobile/dashboard', [MobileDashboardController::class, 'index'])->middleware('throttle:120,1');
    Route::post('/me/update-photo', [AuthController::class, 'updatePhoto'])->middleware('throttle:15,1,me_photo');
    Route::post('/me/update-profile', [AuthController::class, 'updateProfile'])->middleware('throttle:15,1,me_profile');
    Route::post('/me/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:6,1,me_password');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('throttle:30,1');

    // Leave requests, types & balance for logged-in employee (Portal)
    Route::get('/me/leave-types', [\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class, 'index'])->middleware('throttle:240,1,me_leave_types');
    Route::get('/me/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myIndex'])->middleware('throttle:240,1,me_leaves_list');
    Route::get('/me/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myShow'])->whereNumber('id')->middleware('throttle:120,1,me_leaves_show');
    Route::get('/me/leave-requests/{id}/scan', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myViewScan'])->whereNumber('id')->middleware('throttle:120,1,me_leaves_scan');
    Route::get('/me/leave-requests/{id}/scan-formulir', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myViewScanFormulir'])->whereNumber('id')->middleware('throttle:120,1,me_leaves_scan_form');
    Route::get('/me/leave-requests/{id}/scan-surat-izin', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myViewScanSuratIzin'])->whereNumber('id')->middleware('throttle:120,1,me_leaves_scan_izin');
    Route::post('/me/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myStore'])->middleware('throttle:60,1,me_leaves_store');
    Route::delete('/me/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myDestroy'])->whereNumber('id')->middleware('throttle:60,1,me_leaves_delete');
    Route::get('/me/leave-balance', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myBalance'])->middleware('throttle:240,1,me_leaves_bal');
    Route::get('/me/assets', [AuthController::class, 'myAssets'])->middleware('throttle:120,1');

    // Portal Notifications
    Route::get('/portal/notifications', [PortalNotificationController::class, 'index'])->middleware('throttle:120,1');
    Route::post('/portal/notifications/{id}/read', [PortalNotificationController::class, 'markAsRead'])->whereNumber('id')->middleware('throttle:120,1');
    Route::post('/portal/notifications/mark-all-read', [PortalNotificationController::class, 'markAllAsRead'])->middleware('throttle:60,1');
});
