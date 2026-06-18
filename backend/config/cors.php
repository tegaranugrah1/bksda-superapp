<?php

/**
 * CORS Configuration
 *
 * Mengizinkan frontend (Next.js) mengakses API backend.
 * Tanpa config ini, browser akan blokir request dari localhost:3000 ke localhost:8000.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */

return [
    // Hanya izinkan CORS untuk route /api/* dan sanctum/csrf-cookie
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Izinkan semua HTTP method (GET, POST, PUT, DELETE, dll.)
    'allowed_methods' => ['*'],

    // Hanya izinkan request dari frontend URL
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:3000') . ',https://bksdakaltim.net,https://www.bksdakaltim.net')),

    'allowed_origins_patterns' => [],

    // Izinkan semua header (termasuk Authorization untuk token Sanctum)
    'allowed_headers' => ['*'],

    'exposed_headers' => [],
    'max_age' => 0,

    // Izinkan cookie/credentials (dibutuhkan untuk Sanctum token)
    'supports_credentials' => true,
];
