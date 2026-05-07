<?php

use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => '📡 Signal received! Modul Surat Tugas telah mengudara dan siap beroperasi.'
    ]);
});
