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
    // Izinkan CORS untuk semua route API, auth, dan sanctum
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', '*'],

    // Izinkan semua HTTP method (GET, POST, PUT, DELETE, dll.)
    'allowed_methods' => ['*'],

    // Izinkan origin terverifikasi (Frontend Next.js, Mobile Expo, dsb)
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://localhost:19006,http://localhost:8000,https://bksdakaltim.net,https://www.bksdakaltim.net,https://api.bksdakaltim.net')))),

    'allowed_origins_patterns' => ['*bksdakaltim.net*'],

    // Izinkan semua header (termasuk Authorization untuk token Sanctum)
    'allowed_headers' => ['*'],

    'exposed_headers' => [],
    'max_age' => 0,

    // Izinkan credentials/cookies
    'supports_credentials' => true,
];
