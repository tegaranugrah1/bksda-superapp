<?php

namespace App\Modules\Surat;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SuratServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerRoutes();
    }

    protected function registerRoutes(): void
    {
        Route::middleware('api')
            ->prefix('api/surat')
            ->group(__DIR__ . '/Routes/api.php');

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/Routes/api.php');
    }
}
