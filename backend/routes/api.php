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
    Route::get('/me/dashboard', [AuthController::class, 'dashboard']);
    Route::get('/mobile/dashboard', [MobileDashboardController::class, 'index']);
    Route::post('/me/update-photo', [AuthController::class, 'updatePhoto']);
    Route::post('/me/update-profile', [AuthController::class, 'updateProfile']);
    Route::post('/me/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});
