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

    // Izinkan origin publik dan sub-domain produksi
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    // Izinkan semua header (termasuk Authorization untuk token Sanctum)
    'allowed_headers' => ['*'],

    'exposed_headers' => [],
    'max_age' => 0,

    // Izinkan credentials/cookies
    'supports_credentials' => true,
];
