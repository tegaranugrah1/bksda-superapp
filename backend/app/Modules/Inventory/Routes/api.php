<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Inventory Module Routes
|--------------------------------------------------------------------------
| Prefix: /api/inventory
| Middleware: auth:sanctum, module.access:inventory
|--------------------------------------------------------------------------
*/

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => '🛡️ BKSDA Inventory System is actively running!',
        'timestamp' => now()
    ]);
});
