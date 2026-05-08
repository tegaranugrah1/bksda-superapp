<?php

namespace App\Modules\CMS\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class CMSServiceProvider extends ServiceProvider
{
    /**
     * Dijalankan pada saat mesin Laravel mulai melakukan pemanasan (Booting).
     */
    public function boot(): void
    {
        // 1. Mendaftarkan lokasi pabrik Database (Migrations) Modul CMS
        $this->loadMigrationsFrom(__DIR__ . '/../Migrations');

        // 2. JALUR PUBLIK: Website Pengunjung (Tanpa Auth)
        //    Prefiks: /api/cms/public/
        Route::prefix('api/cms/public')
            ->middleware('api')
            ->group(__DIR__ . '/../Routes/public.php');

        // 3. JALUR ADMIN: Panel Pengelola Konten (Terkunci)
        //    Prefiks: /api/cms/admin/
        Route::prefix('api/cms/admin')
            ->middleware(['api', 'auth:sanctum', 'module.access:cms'])
            ->group(__DIR__ . '/../Routes/admin.php');
    }

    /**
     * Dijalankan untuk menyuntikkan dependensi ekstra (Registering).
     */
    public function register(): void
    {
        // Kosongkan untuk saat ini.
    }
}
