<?php

use Illuminate\Support\Facades\Route;

// Endpoint Admin CMS BKSDA
// Prefiks otomatis: /api/cms/admin/
// Middleware: auth:sanctum + module.access:cms

Route::get('/ping', function () {
    return response()->json(['message' => 'Panel Admin CMS BKSDA menyala!']);
});
