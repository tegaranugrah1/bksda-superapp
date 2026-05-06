<?php

/**
 * Database Configuration
 *
 * Project ini HANYA menggunakan PostgreSQL.
 * - Local dev: Docker container (docker compose up -d)
 * - Production: Supabase (PostgreSQL managed)
 *
 * @see https://laravel.com/docs/12.x/database
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Default Database Connection
    |--------------------------------------------------------------------------
    |
    | PostgreSQL adalah satu-satunya database yang dipakai di project ini.
    | Nilai default 'pgsql' sudah benar untuk local dev dan production.
    |
    */

    'default' => env('DB_CONNECTION', 'pgsql'),

    /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    |
    | Hanya PostgreSQL yang tersedia. Driver lain (SQLite, MySQL, SQL Server)
    | sengaja dihapus karena tidak dipakai. Ini sesuai prinsip clean code:
    | jangan simpan kode yang tidak digunakan.
    |
    */

    'connections' => [

        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'bksda_superapp'),
            'username' => env('DB_USERNAME', 'postgres'),
            'password' => env('DB_PASSWORD', 'postgres'),
            'charset' => env('DB_CHARSET', 'utf8'),
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => env('DB_SSLMODE', 'prefer'),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    |
    | Tabel ini mencatat migration mana yang sudah dijalankan.
    | Jangan ubah nama tabel ini kecuali ada alasan khusus.
    |
    */

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

];
