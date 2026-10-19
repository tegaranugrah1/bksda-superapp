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

// Public Auth Route
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Protected Auth Routes (wajib bawa Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/me/dashboard', [AuthController::class, 'dashboard'])->middleware('throttle:120,1');
    Route::get('/mobile/dashboard', [MobileDashboardController::class, 'index'])->middleware('throttle:120,1');
    Route::post('/me/update-photo', [AuthController::class, 'updatePhoto'])->middleware('throttle:15,1');
    Route::post('/me/update-profile', [AuthController::class, 'updateProfile'])->middleware('throttle:15,1');
    Route::post('/me/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:6,1');
    Route::post('/logout', [AuthController::class, 'logout']);

    // Leave requests & balance for logged-in employee (Portal)
    Route::get('/me/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myIndex'])->middleware('throttle:120,1');
    Route::get('/me/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myShow'])->middleware('throttle:120,1');
    Route::post('/me/leave-requests', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myStore'])->middleware('throttle:10,1');
    Route::delete('/me/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myDestroy'])->middleware('throttle:30,1');
    Route::get('/me/leave-balance', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myBalance'])->middleware('throttle:120,1');
    Route::get('/me/assets', [AuthController::class, 'myAssets'])->middleware('throttle:120,1');
});
