<?php

use Illuminate\Support\Facades\Route;

// Endpoint Modul Laporan Eksternal & Internal BKSDA
// Semua rute di bawah ini akan otomatis memiliki prefiks: /api/dereporting/

Route::get('/ping', function () {
    return response()->json(['message' => 'Modul DeReporting BKSDA menyala!']);
});
