<?php

namespace App\Modules\SuratTugas;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class SuratTugasServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/Migrations');

        Route::middleware('api')
            ->prefix('api/surat-tugas')
            ->group(__DIR__ . '/Routes/api.php');
    }
}
