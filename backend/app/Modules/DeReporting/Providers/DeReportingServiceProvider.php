<?php

namespace App\Modules\DeReporting\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class DeReportingServiceProvider extends ServiceProvider
{
    /**
     * Dijalankan pada saat mesin Laravel mulai melakukan pemanasan (Booting).
     */
    public function boot(): void
    {
        // 1. Mendaftarkan lokasi pabrik Database (Migrations) Modul DeReporting
        $this->loadMigrationsFrom(__DIR__.'/../Migrations');

        // 2. Mendaftarkan Pintu Gerbang (Routes) khusus Modul ini
        Route::prefix('api/dereporting')
            ->middleware('api')
            ->group(__DIR__.'/../Routes/api.php');
    }

    /**
     * Dijalankan untuk menyuntikkan dependensi ekstra (Registering).
     */
    public function register(): void
    {
        // Kosongkan untuk saat ini.
    }
}
