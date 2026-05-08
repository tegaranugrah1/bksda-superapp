<?php

namespace App\Modules\Inventory;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class InventoryServiceProvider extends ServiceProvider
{
    /**
     * Daftarkan layanan-layanan (Services) apa saja
     * yang diikat ke modul Inventory ini.
     */
    public function boot(): void
    {
        // 1. Deklarasikan Lokasi Folder Cetak Biru (Migrations)
        $this->loadMigrationsFrom(__DIR__ . '/Migrations');

        // 2. Deklarasikan Lokasi Jalur Akses (Routes)
        $this->registerRoutes();
    }

    /**
     * Membangun Prefix Tembok Besar untuk endpoint Inventory.
     * Semua rute otomatis berawalan /api/inventory dan dicegah
     * dari user yang tidak memiliki izin module 'inventory'.
     */
    protected function registerRoutes(): void
    {
        Route::prefix('api/inventory')
            ->middleware(['api', 'auth:sanctum', 'module.access:inventory'])
            ->group(__DIR__ . '/Routes/api.php');
    }
}
