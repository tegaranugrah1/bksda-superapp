<?php

use Illuminate\Support\Facades\Route;

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

// Public Auth Route
Route::post('/login', [AuthController::class, 'login']);

// Protected Auth Routes (wajib bawa Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});
