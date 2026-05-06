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
