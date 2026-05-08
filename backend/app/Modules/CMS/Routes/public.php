<?php

use Illuminate\Support\Facades\Route;

// Endpoint Website Publik BKSDA
// Prefiks otomatis: /api/cms/public/

Route::get('/ping', function () {
    return response()->json(['message' => 'Website Publik BKSDA menyala!']);
});
