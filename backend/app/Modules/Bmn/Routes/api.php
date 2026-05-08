<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| BMN (Barang Milik Negara) Routes
|--------------------------------------------------------------------------
| Prefix: /api/bmn
| Perlindungan: auth:sanctum, module.access:bmn
|--------------------------------------------------------------------------
*/

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'module' => 'BMN',
        'message' => '🏛️ Sirkuit Keuangan Barang Milik Negara Aktif!',
        'timestamp' => now()
    ]);
});
